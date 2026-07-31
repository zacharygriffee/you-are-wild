#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = resolve(TOOL_DIR, '..');
const TOKEN = /^[a-zA-Z0-9_.:-]+$/;
const MODULE_ID = /^[a-zA-Z0-9_-]+$/;
const NUMERIC_VERSION = /^\d+(?:\.\d+){0,2}$/;
const CURRENT_PACKAGE_TYPE = 'yaw-module';
const CURRENT_PACKAGE_VERSION = 1;
const TRUST_BOUNDARY = 'trusted-local';
const REMOTE_PACKAGE_MAX_BYTES = 2 * 1024 * 1024;
const SETTING_TYPES = new Set([
  'boolean',
  'select',
  'number',
  'string',
  'provider_connection',
  'action'
]);
const UNPERMISSIONED_MODS_PATHS = new Set([
  'id',
  'registerHook',
  'registerSettingAction',
  'log',
  'getSetting',
  'setSetting'
]);
const CREDENTIAL_NAMES = [
  'apikey',
  'accesskey',
  'accesstoken',
  'refreshtoken',
  'authtoken',
  'authorization',
  'bearertoken',
  'token',
  'password',
  'passwd',
  'secret',
  'clientsecret',
  'privatekey',
  'credential'
];
const CREDENTIAL_VALUE = /^(?:bearer|basic)\s+\S+|^sk-(?:or-v1-)?[a-z0-9_-]{8,}$|^-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const CREDENTIAL_IN_CODE = /(?:bearer|basic)\s+\S+|sk-(?:or-v1-)?[a-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const FORBIDDEN_GLOBALS = [
  'App',
  'MODULE_SYSTEM',
  'CONTENT',
  'YAW_HOST',
  'window',
  'document',
  'indexedDB',
  'localStorage',
  'sessionStorage',
  'globalThis',
  'process',
  'require',
  'eval',
  'Function'
];

function issue(code, path, message) {
  return { code, path, message };
}

function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function credentialLikeName(value) {
  const compact = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return CREDENTIAL_NAMES.some(token => compact === token || compact.endsWith(token));
}

function credentialLikeValue(value) {
  return typeof value === 'string' && CREDENTIAL_VALUE.test(value.trim());
}

function compareVersions(left, right) {
  const parts = value => String(value || '')
    .replace(/^v/i, '')
    .split('.')
    .map(part => Number(part || 0))
    .concat([0, 0, 0])
    .slice(0, 3);
  const a = parts(left);
  const b = parts(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

function maskNonCode(source) {
  const input = String(source || '');
  let output = '';
  let state = 'code';
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (state === 'code') {
      if (char === '/' && next === '/') {
        output += '  ';
        index += 1;
        state = 'line-comment';
      } else if (char === '/' && next === '*') {
        output += '  ';
        index += 1;
        state = 'block-comment';
      } else if (char === "'") {
        output += ' ';
        state = 'single';
        escaped = false;
      } else if (char === '"') {
        output += ' ';
        state = 'double';
        escaped = false;
      } else if (char === '`') {
        output += ' ';
        state = 'template';
        escaped = false;
      } else {
        output += char;
      }
      continue;
    }
    if (state === 'line-comment') {
      output += char === '\n' ? '\n' : ' ';
      if (char === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += char === '\n' ? '\n' : ' ';
      }
      continue;
    }
    output += char === '\n' ? '\n' : ' ';
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (
      (state === 'single' && char === "'")
      || (state === 'double' && char === '"')
      || (state === 'template' && char === '`')
    ) {
      state = 'code';
    }
  }
  return output;
}

function validateSerializable(value, path, errors, seen = new Set()) {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    errors.push(issue('non_serializable', path, 'Value is not serializable.'));
    return;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    errors.push(issue('non_serializable', path, 'Number must be finite.'));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) {
    errors.push(issue('non_serializable', path, 'Circular data is not allowed.'));
    return;
  }
  seen.add(value);
  if (!Array.isArray(value) && !plainObject(value)) {
    errors.push(issue('non_serializable', path, 'Only arrays and plain objects are serializable.'));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    validateSerializable(child, `${path}.${key}`, errors, seen);
  }
  seen.delete(value);
}

function inspectCredentials(value, path, errors, seen = new Set()) {
  if (credentialLikeValue(value)) {
    errors.push(issue('credential_value_forbidden', path, 'Package data must not contain credential material.'));
    return;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (credentialLikeName(key)) {
      errors.push(issue('credential_field_forbidden', `${path}.${key}`, 'Package data must not declare credential fields.'));
    }
    inspectCredentials(child, `${path}.${key}`, errors, seen);
  }
}

function validateTokenList(value, path, errors, { known = null, lowercase = false } = {}) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(issue('invalid_list', path, 'Value must be an array of strings.'));
    return [];
  }
  const normalized = [];
  for (let index = 0; index < value.length; index += 1) {
    if (typeof value[index] !== 'string') {
      errors.push(issue('invalid_token', `${path}[${index}]`, 'Entry must be a string.'));
      continue;
    }
    const token = lowercase ? value[index].trim().toLowerCase() : value[index].trim();
    if (!token || !TOKEN.test(token)) {
      errors.push(issue('invalid_token', `${path}[${index}]`, 'Entry contains unsupported characters.'));
      continue;
    }
    if (known && !known.has(token)) {
      errors.push(issue('unknown_token', `${path}[${index}]`, `Unsupported value: ${token}.`));
      continue;
    }
    if (!normalized.includes(token)) normalized.push(token);
  }
  return normalized;
}

function validateSettings(settings, errors) {
  if (settings === undefined) return [];
  if (!Array.isArray(settings)) {
    errors.push(issue('invalid_settings', 'module.manifest.settings', 'Settings must be an array.'));
    return [];
  }
  const seen = new Set();
  const normalized = [];
  for (let index = 0; index < settings.length; index += 1) {
    const path = `module.manifest.settings[${index}]`;
    const entry = settings[index];
    if (!plainObject(entry)) {
      errors.push(issue('invalid_setting', path, 'Setting must be an object.'));
      continue;
    }
    const key = String(entry.key || '').trim();
    const type = String(entry.type || '').trim();
    if (!key || !TOKEN.test(key)) errors.push(issue('invalid_setting_key', `${path}.key`, 'Setting key is invalid.'));
    if (seen.has(key)) errors.push(issue('duplicate_setting', `${path}.key`, `Duplicate setting key: ${key}.`));
    seen.add(key);
    if (credentialLikeName(key)) errors.push(issue('credential_setting_forbidden', `${path}.key`, 'Settings cannot declare credential fields.'));
    if (!SETTING_TYPES.has(type)) errors.push(issue('invalid_setting_type', `${path}.type`, `Unsupported setting type: ${type || 'missing'}.`));
    if (type === 'select') {
      if (!Array.isArray(entry.options) || entry.options.length < 1 || entry.options.length > 30) {
        errors.push(issue('invalid_select_options', `${path}.options`, 'Select settings require 1 through 30 options.'));
      }
    }
    if (type === 'number') {
      const minimum = Number(entry.min ?? 0);
      const maximum = Number(entry.max ?? (minimum + 100));
      if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum < minimum) {
        errors.push(issue('invalid_number_range', path, 'Number setting range is invalid.'));
      }
    }
    if (type === 'string') {
      const hardLimit = entry.multiline === true ? 2000 : 500;
      const maxLength = Number(entry.maxLength ?? (entry.multiline === true ? 1200 : 120));
      if (!Number.isFinite(maxLength) || maxLength < 1 || maxLength > hardLimit) {
        errors.push(issue('invalid_string_limit', `${path}.maxLength`, `String limit must be between 1 and ${hardLimit}.`));
      }
      if (credentialLikeValue(entry.default)) {
        errors.push(issue('credential_setting_forbidden', `${path}.default`, 'Settings cannot store credential material.'));
      }
    }
    normalized.push({ key, type });
  }
  return normalized;
}

function inferPermissionUse(code, contractIndex) {
  const masked = maskNonCode(code);
  const apiToPermission = new Map();
  for (const permission of contractIndex.permissions) {
    for (const api of permission.api || []) {
      apiToPermission.set(api.replace(/^MODS\./, ''), permission.id);
    }
  }
  const usedPaths = new Set();
  const unknownPaths = new Set();
  const pattern = /\bMODS\s*\.\s*([A-Za-z_$][\w$]*)(?:\s*\.\s*([A-Za-z_$][\w$]*))?/g;
  for (const match of masked.matchAll(pattern)) {
    const first = match[1];
    const second = match[2];
    const path = second ? `${first}.${second}` : first;
    if (apiToPermission.has(path) || UNPERMISSIONED_MODS_PATHS.has(path)) {
      usedPaths.add(path);
    } else if (!second && ['ai', 'media', 'resources'].includes(first)) {
      continue;
    } else {
      unknownPaths.add(path);
    }
  }
  const usedPermissions = new Set(
    [...usedPaths]
      .map(path => apiToPermission.get(path))
      .filter(Boolean)
  );
  return {
    masked,
    usedPaths: [...usedPaths].sort(),
    usedPermissions: [...usedPermissions].sort(),
    unknownPaths: [...unknownPaths].sort()
  };
}

export async function loadKitMetadata(kitRoot = KIT_ROOT) {
  const [contractIndex, runtimeInventory] = await Promise.all([
    readFile(resolve(kitRoot, 'contract-index.json'), 'utf8').then(JSON.parse),
    readFile(resolve(kitRoot, 'runtime-inventory.json'), 'utf8').then(JSON.parse)
  ]);
  return { contractIndex, runtimeInventory };
}

export function validateModulePackage(packageData, metadata, options = {}) {
  const errors = [];
  const warnings = [];
  const { contractIndex, runtimeInventory } = metadata;
  const sourceBytes = Number(options.sourceBytes) || Buffer.byteLength(JSON.stringify(packageData || {}), 'utf8');
  if (sourceBytes > REMOTE_PACKAGE_MAX_BYTES) {
    errors.push(issue('package_too_large', '$', `Package exceeds ${REMOTE_PACKAGE_MAX_BYTES} bytes.`));
  }
  if (!plainObject(packageData)) {
    errors.push(issue('invalid_package', '$', 'Package must be a JSON object.'));
    return { valid: false, errors, warnings };
  }
  validateSerializable(packageData, '$', errors);
  inspectCredentials(packageData, '$', errors);

  let moduleData;
  let canonical = true;
  if (Object.hasOwn(packageData, 'manifest')) {
    canonical = false;
    moduleData = packageData;
    warnings.push(issue('legacy_package_shape', '$', 'Legacy bare module shape is accepted only for compatibility; publish the canonical yaw-module envelope.'));
  } else {
    if (packageData.packageType !== CURRENT_PACKAGE_TYPE) {
      errors.push(issue('invalid_package_type', '$.packageType', `Expected ${CURRENT_PACKAGE_TYPE}.`));
    }
    if (packageData.packageVersion !== CURRENT_PACKAGE_VERSION) {
      errors.push(issue('invalid_package_version', '$.packageVersion', `Expected package version ${CURRENT_PACKAGE_VERSION}.`));
    }
    if (packageData.trustBoundary !== undefined && packageData.trustBoundary !== TRUST_BOUNDARY) {
      errors.push(issue('invalid_trust_boundary', '$.trustBoundary', `Expected ${TRUST_BOUNDARY}.`));
    }
    if (packageData.gameVersion !== undefined && !NUMERIC_VERSION.test(String(packageData.gameVersion).replace(/^v/i, ''))) {
      errors.push(issue('invalid_game_version', '$.gameVersion', 'Game version must be numeric, such as 0.17.0.'));
    }
    if (!plainObject(packageData.module)) {
      errors.push(issue('missing_module', '$.module', 'Canonical package requires a module object.'));
      moduleData = {};
    } else {
      moduleData = packageData.module;
    }
  }

  const manifest = moduleData?.manifest;
  if (!plainObject(manifest)) {
    errors.push(issue('missing_manifest', 'module.manifest', 'Module manifest is required.'));
  }
  const id = String(manifest?.id || '').trim();
  if (!id || !MODULE_ID.test(id)) errors.push(issue('invalid_module_id', 'module.manifest.id', 'Module ID must use letters, numbers, underscores, or hyphens.'));
  if (!String(manifest?.name || '').trim()) errors.push(issue('missing_module_name', 'module.manifest.name', 'Module name is required.'));
  if (!String(manifest?.version || '').trim()) errors.push(issue('missing_module_version', 'module.manifest.version', 'Module version is required.'));
  if (canonical && String(packageData.packageId || '').trim() !== id) {
    errors.push(issue('package_id_mismatch', '$.packageId', 'Package ID must match manifest ID.'));
  }

  const rating = String(manifest?.contentRating || 'safe').trim().toLowerCase();
  const knownRatings = new Set(runtimeInventory.contentRatings || []);
  if (!knownRatings.has(rating)) errors.push(issue('invalid_content_rating', 'module.manifest.contentRating', `Unsupported content rating: ${rating}.`));
  if (rating === 'adult') warnings.push(issue('legacy_adult_rating', 'module.manifest.contentRating', 'Use mature plus explicit.sexual for newly authored modules.'));
  if (String(manifest?.trustBoundary || TRUST_BOUNDARY).trim() !== TRUST_BOUNDARY) {
    errors.push(issue('invalid_trust_boundary', 'module.manifest.trustBoundary', `Expected ${TRUST_BOUNDARY}.`));
  }

  const declaredPermissions = validateTokenList(
    manifest?.permissions,
    'module.manifest.permissions',
    errors,
    { known: new Set(contractIndex.permissions.map(permission => permission.id)) }
  );
  const dependencies = validateTokenList(manifest?.dependencies, 'module.manifest.dependencies', errors);
  if (dependencies.includes(id)) errors.push(issue('self_dependency', 'module.manifest.dependencies', 'Module cannot depend on itself.'));

  const minGameVersion = String(manifest?.minGameVersion || manifest?.gameVersion || '').trim().replace(/^v/i, '');
  if (minGameVersion && !NUMERIC_VERSION.test(minGameVersion)) {
    errors.push(issue('invalid_min_game_version', 'module.manifest.minGameVersion', 'Minimum game version must be numeric, such as 0.17.0.'));
  } else if (minGameVersion && compareVersions(minGameVersion, contractIndex.gameVersion) > 0) {
    warnings.push(issue('future_game_version', 'module.manifest.minGameVersion', `Module requires a newer game than this ${contractIndex.gameVersion} kit snapshot.`));
  }

  const requirements = plainObject(manifest?.runtimeRequirements) ? manifest.runtimeRequirements : {};
  if (manifest?.runtimeRequirements !== undefined && !plainObject(manifest.runtimeRequirements)) {
    errors.push(issue('invalid_runtime_requirements', 'module.manifest.runtimeRequirements', 'Runtime requirements must be an object.'));
  }
  const origins = validateTokenList(
    requirements.origins ?? runtimeInventory.origins,
    'module.manifest.runtimeRequirements.origins',
    errors,
    { known: new Set(runtimeInventory.origins || []), lowercase: true }
  );
  if (!origins.length) errors.push(issue('empty_origins', 'module.manifest.runtimeRequirements.origins', 'At least one runtime origin is required.'));
  const hosts = validateTokenList(requirements.hosts, 'module.manifest.runtimeRequirements.hosts', errors, { lowercase: true });
  const capabilities = validateTokenList(requirements.capabilities, 'module.manifest.runtimeRequirements.capabilities', errors, { lowercase: true });
  for (const host of hosts) {
    if (!(runtimeInventory.hosts || []).includes(host)) warnings.push(issue('unknown_current_host', 'module.manifest.runtimeRequirements.hosts', `Host ${host} is not present in this runtime inventory and will block activation here.`));
  }
  for (const capability of capabilities) {
    if (!(runtimeInventory.hostCapabilities || []).includes(capability)) warnings.push(issue('unknown_current_capability', 'module.manifest.runtimeRequirements.capabilities', `Capability ${capability} is not present in this runtime inventory and will block activation here.`));
  }
  if (requirements.network === true && origins.includes('file')) {
    warnings.push(issue('network_file_mismatch', 'module.manifest.runtimeRequirements', 'network:true blocks file-origin activation even though file is listed.'));
  }
  if (requirements.secureContext === true && origins.some(origin => ['file', 'http'].includes(origin))) {
    warnings.push(issue('secure_origin_mismatch', 'module.manifest.runtimeRequirements', 'secureContext:true blocks file and ordinary HTTP origins that are listed.'));
  }

  const settings = validateSettings(manifest?.settings, errors);
  const code = moduleData?.code === undefined ? '' : moduleData.code;
  if (typeof code !== 'string') {
    errors.push(issue('invalid_module_code', 'module.code', 'Module code must be a string.'));
  } else {
    try {
      new Function('runtimeContext', `with(runtimeContext) {\n${code}\n}`);
    } catch (error) {
      errors.push(issue('module_syntax_error', 'module.code', `Module code failed syntax validation: ${String(error?.message || error).slice(0, 240)}`));
    }
    if (CREDENTIAL_IN_CODE.test(code)) {
      errors.push(issue('credential_value_forbidden', 'module.code', 'Module code must not embed credential material.'));
    }
  }
  if (moduleData?.assets !== undefined && !plainObject(moduleData.assets)) {
    errors.push(issue('invalid_assets', 'module.assets', 'Module assets must be a serializable object.'));
  }

  const inferred = inferPermissionUse(typeof code === 'string' ? code : '', contractIndex);
  const missingPermissions = inferred.usedPermissions.filter(permission => !declaredPermissions.includes(permission));
  const unusedPermissions = declaredPermissions.filter(permission => !inferred.usedPermissions.includes(permission));
  for (const permission of missingPermissions) {
    errors.push(issue('missing_permission', 'module.manifest.permissions', `Code uses ${permission} capability without declaring it.`));
  }
  for (const permission of unusedPermissions) {
    warnings.push(issue('unused_permission', 'module.manifest.permissions', `Declared permission ${permission} was not detected in module code.`));
  }
  for (const path of inferred.unknownPaths) {
    errors.push(issue('unknown_mods_api', 'module.code', `Unsupported or undocumented MODS API reference: MODS.${path}.`));
  }
  if (/\bMODS\s*\[|\{[^}]*\}\s*=\s*MODS\b/.test(inferred.masked)) {
    errors.push(issue('indirect_mods_access', 'module.code', 'Computed or destructured MODS access cannot be verified; use documented direct MODS methods.'));
  }
  for (const global of FORBIDDEN_GLOBALS) {
    const expression = new RegExp(`\\b${global.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (expression.test(inferred.masked)) {
      errors.push(issue('runtime_reach_through', 'module.code', `Module code references unsupported runtime global ${global}.`));
    }
  }
  if (/\b(?:fetch|XMLHttpRequest|WebSocket)\b/.test(inferred.masked)) {
    const infrastructure = declaredPermissions.includes('ai:provide') || declaredPermissions.includes('media:provide');
    if (!infrastructure || requirements.network !== true) {
      errors.push(issue('undeclared_network_transport', 'module.code', 'Direct network transport requires a trusted provider contract and network:true.'));
    } else {
      warnings.push(issue('trusted_network_provider', 'module.code', 'Direct transport is trusted-local infrastructure; verify redirects, bounds, credentials, and unload behavior manually.'));
    }
  }

  const lifecycle = {
    hotToggleSafe: requirements.hotToggleSafe === true || manifest?.hotToggleSafe === true,
    restartRequired: !(requirements.hotToggleSafe === true || manifest?.hotToggleSafe === true),
    dependencies,
    settings: settings.map(setting => setting.key),
    hostRestricted: hosts.length > 0 || capabilities.length > 0,
    networkRequired: requirements.network === true,
    ownedPermissionSurfaces: declaredPermissions.filter(permission => permission !== 'ui.read' && permission !== 'ai:request' && permission !== 'media:read')
  };
  if (lifecycle.hotToggleSafe && declaredPermissions.includes('world:add_biome')) {
    warnings.push(issue('biome_hot_toggle_claim', 'module.manifest.runtimeRequirements.hotToggleSafe', 'Biome definitions are not a save-stable placement contract; justify hot-toggle safety with runtime evidence.'));
  }

  return {
    valid: errors.length === 0,
    package: {
      canonical,
      id,
      name: String(manifest?.name || ''),
      version: String(manifest?.version || ''),
      minGameVersion,
      contentRating: rating
    },
    permissions: {
      declared: declaredPermissions,
      detected: inferred.usedPermissions,
      missing: missingPermissions,
      unused: unusedPermissions,
      apiPaths: inferred.usedPaths
    },
    lifecycle,
    errors,
    warnings
  };
}

export async function validateModuleFile(file, options = {}) {
  const absolute = resolve(file);
  const source = await readFile(absolute, 'utf8');
  let packageData;
  try {
    packageData = JSON.parse(source);
  } catch (error) {
    return {
      valid: false,
      errors: [issue('invalid_json', '$', `Invalid JSON: ${String(error?.message || error).slice(0, 240)}`)],
      warnings: []
    };
  }
  const metadata = options.metadata || await loadKitMetadata(options.kitRoot);
  return validateModulePackage(packageData, metadata, {
    ...options,
    sourceBytes: Buffer.byteLength(source, 'utf8')
  });
}

function formatReport(file, report) {
  const lines = [`${report.valid ? 'PASS' : 'FAIL'} ${file}`];
  if (report.package?.id) {
    lines.push(`  package: ${report.package.id}@${report.package.version || 'unknown'}`);
  }
  for (const error of report.errors || []) {
    lines.push(`  ERROR ${error.code} ${error.path}: ${error.message}`);
  }
  for (const warning of report.warnings || []) {
    lines.push(`  WARN  ${warning.code} ${warning.path}: ${warning.message}`);
  }
  if (report.valid) {
    lines.push(`  permissions: ${(report.permissions?.detected || []).join(', ') || 'none'}`);
    lines.push(`  lifecycle: ${report.lifecycle?.restartRequired ? 'restart-required' : 'hot-toggle-safe'}`);
  }
  return lines.join('\n');
}

async function main(argv) {
  const json = argv.includes('--json');
  const strict = argv.includes('--strict');
  const files = argv.filter(argument => !argument.startsWith('--'));
  if (!files.length) {
    console.error('Usage: node tools/validate-module.mjs [--json] [--strict] <module.yawmod.json> [...]');
    process.exitCode = 2;
    return;
  }
  const metadata = await loadKitMetadata();
  const results = [];
  for (const file of files) {
    try {
      results.push({ file, report: await validateModuleFile(file, { metadata }) });
    } catch (error) {
      results.push({
        file,
        report: {
          valid: false,
          errors: [issue('read_failed', '$', String(error?.message || error).slice(0, 240))],
          warnings: []
        }
      });
    }
  }
  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(results.map(result => formatReport(result.file, result.report)).join('\n'));
  }
  if (results.some(result => !result.report.valid || (strict && result.report.warnings?.length))) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
