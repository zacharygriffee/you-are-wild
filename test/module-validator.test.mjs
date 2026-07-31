import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  loadKitMetadata,
  validateModulePackage
} from '../docs/mod-author-kit/tools/validate-module.mjs';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..');
const KIT_ROOT = resolve(REPO_ROOT, 'docs/mod-author-kit');
const metadata = await loadKitMetadata(KIT_ROOT);

function fixture({
  id = 'validator-fixture',
  permissions = [],
  code = '',
  runtimeRequirements = {
    origins: ['file', 'https', 'localhost', 'http'],
    network: false,
    secureContext: false,
    hotToggleSafe: true,
    hosts: [],
    capabilities: []
  },
  settings = [],
  assets = {}
} = {}) {
  return {
    packageType: 'yaw-module',
    packageVersion: 1,
    packageId: id,
    trustBoundary: 'trusted-local',
    gameVersion: '0.17.0',
    module: {
      manifest: {
        id,
        name: 'Validator Fixture',
        version: '1.0.0',
        minGameVersion: '0.17.0',
        contentRating: 'safe',
        permissions,
        dependencies: [],
        runtimeRequirements,
        settings
      },
      code,
      assets
    }
  };
}

function codes(report, type = 'errors') {
  return report[type].map(entry => entry.code);
}

test('canonical kit template passes standalone validation', async () => {
  const template = JSON.parse(await readFile(resolve(KIT_ROOT, 'templates/simple-module.yawmod.json'), 'utf8'));
  const report = validateModulePackage(template, metadata);
  assert.equal(report.valid, true);
  assert.deepEqual(report.errors, []);
  assert.equal(report.package.canonical, true);
});

test('detects missing and unused permissions from direct MODS API use', () => {
  const missing = validateModulePackage(fixture({
    code: 'MODS.addItem({ id: "test-item", name: "Test Item" });'
  }), metadata);
  assert.equal(missing.valid, false);
  assert.ok(codes(missing).includes('missing_permission'));

  const unused = validateModulePackage(fixture({
    permissions: ['content:add_item']
  }), metadata);
  assert.equal(unused.valid, true);
  assert.ok(codes(unused, 'warnings').includes('unused_permission'));
});

test('rejects credential-shaped settings, package data, and executable code', () => {
  const fakeSecret = ['sk', 'example12345678'].join('-');
  const report = validateModulePackage(fixture({
    settings: [{ key: 'providerApiKey', type: 'string', default: fakeSecret }],
    assets: { authorization: `Bearer ${fakeSecret}` },
    code: `const embedded = ${JSON.stringify(fakeSecret)}; MODS.log(embedded);`
  }), metadata);
  assert.equal(report.valid, false);
  assert.ok(codes(report).includes('credential_setting_forbidden'));
  assert.ok(codes(report).includes('credential_field_forbidden'));
  assert.ok(codes(report).includes('credential_value_forbidden'));
  assert.ok(report.errors.some(entry => entry.code === 'credential_value_forbidden' && entry.path === 'module.code'));
});

test('rejects runtime reach-through and undocumented MODS methods', () => {
  const report = validateModulePackage(fixture({
    code: 'window.yawHost.rawIpc(); MODS.getCredential();'
  }), metadata);
  assert.equal(report.valid, false);
  assert.ok(codes(report).includes('runtime_reach_through'));
  assert.ok(codes(report).includes('unknown_mods_api'));
});

test('host requirements are compatibility declarations and grant no module permission', () => {
  const report = validateModulePackage(fixture({
    runtimeRequirements: {
      origins: ['https'],
      network: false,
      secureContext: true,
      hotToggleSafe: false,
      hosts: ['pear-electron'],
      capabilities: ['providers.secure_transport']
    },
    code: 'MODS.ai.generate("connection", { prompt: "hello" });'
  }), metadata);
  assert.equal(report.valid, false);
  assert.equal(report.lifecycle.hostRestricted, true);
  assert.ok(codes(report).includes('missing_permission'));
});

test('reports identity, dependency, syntax, network, and lifecycle defects', () => {
  const packageData = fixture({
    id: 'fixture',
    permissions: ['world:add_biome'],
    code: 'fetch("https://example.invalid"); if (',
    runtimeRequirements: {
      origins: ['file'],
      network: true,
      secureContext: false,
      hotToggleSafe: true,
      hosts: [],
      capabilities: []
    }
  });
  packageData.packageId = 'different';
  packageData.module.manifest.dependencies = ['fixture'];
  const report = validateModulePackage(packageData, metadata);
  assert.equal(report.valid, false);
  assert.ok(codes(report).includes('package_id_mismatch'));
  assert.ok(codes(report).includes('self_dependency'));
  assert.ok(codes(report).includes('module_syntax_error'));
  assert.ok(codes(report).includes('undeclared_network_transport'));
  assert.ok(codes(report, 'warnings').includes('network_file_mismatch'));
  assert.ok(codes(report, 'warnings').includes('biome_hot_toggle_claim'));
});

test('CLI emits valid JSON without echoing credential material', async () => {
  const fakeSecret = ['sk', 'example12345678'].join('-');
  const invalid = fixture({
    assets: { providerCredential: fakeSecret }
  });
  const directory = await mkdtemp(resolve(tmpdir(), 'yaw-module-validator-'));
  const packagePath = resolve(directory, 'credential-fixture.yawmod.json');
  await writeFile(packagePath, JSON.stringify(invalid), 'utf8');
  try {
    const result = spawnSync(process.execPath, [
      resolve(KIT_ROOT, 'tools/validate-module.mjs'),
      '--json',
      packagePath
    ], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    assert.equal(result.status, 1, result.stderr);
    const reports = JSON.parse(result.stdout);
    assert.equal(reports[0].report.valid, false);
    assert.equal(result.stdout.includes(fakeSecret), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
