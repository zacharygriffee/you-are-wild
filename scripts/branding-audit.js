#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = ['package.json', 'README.md', 'ACKNOWLEDGMENTS.md', 'docs', 'app', 'dist/you-are-wild.html'];
const patterns = [
  /FightFuckFeed/g,
  /Fight Fuck Feed/g,
  /fightfuckfeed/g,
  /FightFuckFeed\.tactical/g,
  /Tactical Edition/g,
  /FFFme/g,
  /FFFME/g,
  /FFF_/g,
  /fff-/g,
  /tactical-has-played/g,
  /tactical-tutorial/g
];

const allowed = [
  { file: 'ACKNOWLEDGMENTS.md', text: 'FightFuckFeed.me' },
  { file: 'docs/next-objectives.md', text: 'legacy `fff-log-view` is still read for migration' },
  { file: 'docs/next-objectives.md', text: 'Replace internal `FFF`/`FFFme` identifiers' },
  { file: 'docs/next-objectives.md', text: 'while `FFF_*` IndexedDB names are legacy cleanup targets only' },
  { file: 'docs/architecture.md', text: '`FFF_Saves` and `FFFme_Modules` are legacy cleanup targets only' },
  { file: 'app/test/test.js', text: "storage.set('fff-log-view'" },
  { file: 'app/test/test.js', text: "Save loads should not open the legacy FFF_Saves namespace" },
  { file: 'app/test/test.js', text: "Save deletes should not open the legacy FFF_Saves namespace" },
  { file: 'app/test/test.js', text: "LEGACY_DB_NAME: 'FFFme_Modules'" },
  { file: 'app/test/test.js', text: "{ name: 'FFFme_Modules' }" },
  { file: 'app/test/test.js', text: "{ name: 'FFF_Saves' }" },
  { file: 'app/test/test.js', text: 'YAW_Modules,YAW_Saves,YAW_Worlds,FFFme_Modules,FFF_Saves' },
  { file: 'app/test/combat-interactions-check.js', text: "createIndexedDb(page, 'FFFme_Modules'" },
  { file: 'app/test/combat-interactions-check.js', text: "createIndexedDb(page, 'FFF_Saves'" },
  { file: 'app/test/combat-interactions-check.js', text: "createIndexedDb(page, 'FFF_Unrelated'" },
  { file: 'app/test/combat-interactions-check.js', text: "['YAW_Modules', 'YAW_Saves', 'YAW_Worlds', 'FFFme_Modules', 'FFF_Saves', 'FFF_Unrelated']" },
  { file: 'app/test/combat-interactions-check.js', text: "['YAW_Modules', 'YAW_Saves', 'YAW_Worlds', 'FFFme_Modules', 'FFF_Saves']" },
  { file: 'app/test/combat-interactions-check.js', text: 'legacy-looking databases' },
  { file: 'app/test/combat-interactions-check.js', text: "Generated app boot should not recreate the legacy module database" },
  { file: 'app/test/combat-interactions-check.js', text: "Generated app boot should not recreate the legacy save database" },
  { file: 'app/test/combat-interactions-check.js', text: "for (const legacyName of ['FFFme_Modules', 'FFF_Saves'])" },
  { file: 'app/src/core/content-system.js', text: "LEGACY_STORAGE_KEY: 'fff-content-prefs'" },
  { file: 'app/src/core/module-system.js', text: "LEGACY_DB_NAME: 'FFFme_Modules'" },
  { file: 'app/src/core/app.js', text: "hasPlayed: 'tactical-has-played'" },
  { file: 'app/src/core/app.js', text: "tutorialComplete: 'tactical-tutorial-complete'" },
  { file: 'app/src/core/app.js', text: "settings: 'fff-settings'" },
  { file: 'app/src/core/app.js', text: "contentPrefs: 'fff-content-prefs'" },
  { file: 'app/src/core/app.js', text: "logView: 'fff-log-view'" },
  { file: 'app/src/core/app.js', text: "lastSlot: 'fff-last-slot'" },
  { file: 'app/src/core/app.js', text: "lastSaveTime: 'fff-last-save-time'" },
  { file: 'app/src/core/app.js', text: "saveTimePrefix: 'fff-save-time-'" },
  { file: 'app/src/core/app.js', text: "LEGACY_SAVE_DB_NAME: 'FFF_Saves'" },
  { file: 'app/src/core/app.js', text: "return (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM?.LEGACY_DB_NAME) || 'FFFme_Modules'" },
  { file: 'app/src/core/app.js', text: "indexedDB.deleteDatabase('FFFme_Modules')" },
  { file: 'dist/you-are-wild.html', text: "hasPlayed: 'tactical-has-played'" },
  { file: 'dist/you-are-wild.html', text: "tutorialComplete: 'tactical-tutorial-complete'" },
  { file: 'dist/you-are-wild.html', text: "settings: 'fff-settings'" },
  { file: 'dist/you-are-wild.html', text: "contentPrefs: 'fff-content-prefs'" },
  { file: 'dist/you-are-wild.html', text: "logView: 'fff-log-view'" },
  { file: 'dist/you-are-wild.html', text: "lastSlot: 'fff-last-slot'" },
  { file: 'dist/you-are-wild.html', text: "lastSaveTime: 'fff-last-save-time'" },
  { file: 'dist/you-are-wild.html', text: "saveTimePrefix: 'fff-save-time-'" },
  { file: 'dist/you-are-wild.html', text: "LEGACY_SAVE_DB_NAME: 'FFF_Saves'" },
  { file: 'dist/you-are-wild.html', text: "return (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM?.LEGACY_DB_NAME) || 'FFFme_Modules'" },
  { file: 'dist/you-are-wild.html', text: "indexedDB.deleteDatabase('FFFme_Modules')" },
  { file: 'dist/you-are-wild.html', text: "LEGACY_DB_NAME: 'FFFme_Modules'" },
  { file: 'dist/you-are-wild.html', text: "LEGACY_STORAGE_KEY: 'fff-content-prefs'" }
];

function stripOpaqueDataPayloads(content) {
  return content.replace(/data:[^,\s"'`]+;base64,[A-Za-z0-9+/=]+/gi, 'data:application/octet-stream;base64,[omitted]');
}

function walk(entry, files = []) {
  const full = path.join(root, entry);
  if (!fs.existsSync(full)) return files;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    if (entry.includes('node_modules')) return files;
    for (const child of fs.readdirSync(full)) {
      walk(path.join(entry, child), files);
    }
  } else {
    files.push(entry);
  }
  return files;
}

function isAllowed(file, line) {
  return allowed.some(rule => file === rule.file && line.includes(rule.text));
}

const failures = [];
for (const removedPath of ['legacy', 'archive']) {
  if (fs.existsSync(path.join(root, removedPath))) {
    failures.push(`${removedPath}: predecessor snapshots must not be tracked in the maintained tree`);
  }
}
for (const target of targets) {
  for (const file of walk(target)) {
    const full = path.join(root, file);
    const content = stripOpaqueDataPayloads(fs.readFileSync(full, 'utf8'));
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (patterns.some(pattern => pattern.test(line))) {
        patterns.forEach(pattern => { pattern.lastIndex = 0; });
        if (!isAllowed(file, line)) failures.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

if (failures.length) {
  console.error('Branding audit failed. Unexpected legacy branding found:\n');
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Branding audit passed: only the acknowledgment and approved data-migration references remain.');
