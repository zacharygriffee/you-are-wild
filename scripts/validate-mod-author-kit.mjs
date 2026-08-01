#!/usr/bin/env node

import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const KIT_ROOT = resolve(REPO_ROOT, 'docs/mod-author-kit');

function fail(message) {
  throw new Error(message);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function sameMembers(left, right) {
  return JSON.stringify(uniqueSorted(left)) === JSON.stringify(uniqueSorted(right));
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files.sort();
}

function extractArray(source, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*(?::|=)\\s*(?:Object\\.freeze\\()?\\s*(\\[[\\s\\S]*?\\])\\s*\\)?\\s*[,;]`));
  if (!match) fail(`Unable to extract ${property} from runtime source.`);
  return Function(`"use strict"; return (${match[1]});`)();
}

function extractObjectKeys(source, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`));
  if (!match) fail(`Unable to extract ${property} from runtime source.`);
  return uniqueSorted([...match[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map(item => item[1]));
}

async function checkMarkdownLinks(file, kitFiles) {
  const source = await readFile(file, 'utf8');
  const failures = [];
  const expression = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of source.matchAll(expression)) {
    const target = match[1].split('#')[0].trim();
    if (!target || target.startsWith('http:') || target.startsWith('https:') || target.startsWith('mailto:')) continue;
    const absolute = resolve(dirname(file), decodeURIComponent(target));
    if (!kitFiles.has(absolute)) failures.push(`${file}: missing link target ${target}`);
  }
  return failures;
}

const files = await walk(KIT_ROOT);
const fileSet = new Set(files);
const jsonFiles = files.filter(file => extname(file) === '.json');
const markdownFiles = files.filter(file => extname(file) === '.md');

for (const file of jsonFiles) {
  JSON.parse(await readFile(file, 'utf8'));
}

const linkFailures = (await Promise.all(markdownFiles.map(file => checkMarkdownLinks(file, fileSet)))).flat();
if (linkFailures.length) fail(linkFailures.join('\n'));

const [
  contractIndex,
  runtimeInventory,
  release,
  moduleSource,
  hostSource,
  trailPackage,
  trailSource
] = await Promise.all([
  readFile(resolve(KIT_ROOT, 'contract-index.json'), 'utf8').then(JSON.parse),
  readFile(resolve(KIT_ROOT, 'runtime-inventory.json'), 'utf8').then(JSON.parse),
  readFile(resolve(REPO_ROOT, 'app/release.json'), 'utf8').then(JSON.parse),
  readFile(resolve(REPO_ROOT, 'app/src/core/module-system.js'), 'utf8'),
  readFile(resolve(REPO_ROOT, 'app/src/core/host-capabilities.js'), 'utf8'),
  readFile(resolve(KIT_ROOT, 'examples/trail-guide.yawmod.json'), 'utf8').then(JSON.parse),
  readFile(resolve(KIT_ROOT, 'examples/trail-guide.module.js'), 'utf8')
]);

if (contractIndex.gameVersion !== release.version || runtimeInventory.snapshot.gameVersion !== release.version) {
  fail(`Kit game version drift: release=${release.version}.`);
}
if (contractIndex.moduleApi !== release.moduleApi || runtimeInventory.snapshot.moduleApi !== release.moduleApi) {
  fail(`Kit module API drift: release=${release.moduleApi}.`);
}

const runtimePermissions = extractArray(moduleSource, 'KNOWN_PERMISSIONS');
const indexedPermissions = contractIndex.permissions.map(entry => entry.id);
if (!sameMembers(runtimePermissions, indexedPermissions)) fail('Permission inventory drifted from module runtime.');

const comparisons = [
  ['runtime origins', extractArray(moduleSource, 'RUNTIME_ORIGINS'), runtimeInventory.origins],
  ['UI contribution slots', extractArray(moduleSource, 'UI_CONTRIBUTION_SLOTS'), runtimeInventory.uiSlots],
  ['host capabilities', extractArray(hostSource, 'CAPABILITIES'), runtimeInventory.hostCapabilities],
  ['hooks', extractObjectKeys(moduleSource, 'hooks'), runtimeInventory.hooks]
];
for (const [label, runtimeValues, inventoryValues] of comparisons) {
  if (!sameMembers(runtimeValues, inventoryValues)) fail(`${label} inventory drifted from runtime source.`);
}

for (const entry of [...contractIndex.permissions, ...contractIndex.packageContracts]) {
  const file = resolve(KIT_ROOT, entry.file);
  if (!fileSet.has(file)) fail(`Contract index references missing file: ${entry.file}.`);
}

if (trailPackage.module.code !== trailSource) fail('Trail Guide readable source differs from embedded package code.');
new Function('runtimeContext', `with(runtimeContext) {\n${trailSource}\n}`);
if (/\b(?:window|document|MODULE_SYSTEM|App|YAW_HOST|globalThis|process|require)\b/.test(trailSource)) {
  fail('Trail Guide reaches through the documented MODS boundary.');
}

for (const file of files) {
  const info = await stat(file);
  if (!info.isFile()) fail(`Unexpected non-file entry: ${file}.`);
}

console.log(
  `PASS mod author kit: ${files.length} files, ${jsonFiles.length} JSON, `
  + `${markdownFiles.length} Markdown, ${indexedPermissions.length} permissions, `
  + `release ${release.version}, module API ${release.moduleApi}.`
);
