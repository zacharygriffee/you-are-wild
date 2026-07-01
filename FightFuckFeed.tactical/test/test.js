#!/usr/bin/env node
/**
 * Test runner for FightFuckFeed.tactical modules
 * Validates syntax, checks for common issues, runs unit tests
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const TEMPLATE = path.join(__dirname, '..', 'template.html');
const args = process.argv.slice(2);
const filterArg = args.find(arg => arg.startsWith('--filter='));
const activeFilter = filterArg ? filterArg.split('=')[1] : 'all';
let currentSection = 'all';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  if (activeFilter !== 'all' && currentSection !== activeFilter) return;

  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failedTests++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertContains(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(message || `Expected to contain: ${needle}`);
  }
}

function assertNotContains(haystack, needle, message) {
  if (haystack.includes(needle)) {
    throw new Error(message || `Expected NOT to contain: ${needle}`);
  }
}

function section(name, filterName) {
  currentSection = filterName;
  if (activeFilter === 'all' || activeFilter === filterName) {
    console.log(`\n=== ${name} ===`);
  }
}

if (!['all', 'core', 'ui'].includes(activeFilter)) {
  console.error(`Unknown filter "${activeFilter}". Expected one of: all, core, ui.`);
  process.exit(1);
}

// === SYNTAX TESTS ===
section('Syntax Validation', 'core');

const jsFiles = [];
function collectJs(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectJs(fullPath);
    } else if (entry.endsWith('.js')) {
      jsFiles.push(fullPath);
    }
  }
}

collectJs(SRC_DIR);

for (const file of jsFiles) {
  const relPath = path.relative(path.join(__dirname, '..'), file);
  const content = fs.readFileSync(file, 'utf8');
  
  test(`Syntax: ${relPath}`, () => {
    new Function(content);
  });
}

// === STRUCTURE TESTS ===
section('Structure Tests', 'core');

const appPath = path.join(SRC_DIR, 'core', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

test('App object is defined', () => {
  assertContains(appContent, 'const App = {', 'App object declaration missing');
});

test('Game mode constants exist', () => {
  assertContains(appContent, 'GAME_MODE:', 'GAME_MODE constant missing');
  assertContains(appContent, 'NORMAL', 'NORMAL mode missing');
  assertContains(appContent, 'COMBAT', 'COMBAT mode missing');
});

test('Disposition constants exist', () => {
  assertContains(appContent, 'DISPOSITION:', 'DISPOSITION constant missing');
  assertContains(appContent, 'ENEMY', 'ENEMY disposition missing');
  assertContains(appContent, 'NEUTRAL', 'NEUTRAL disposition missing');
  assertContains(appContent, 'FRIENDLY', 'FRIENDLY disposition missing');
  assertContains(appContent, 'PARTY', 'PARTY disposition missing');
});

test('Biomes are defined', () => {
  assertContains(appContent, 'biomes:', 'Biomes object missing');
  assertContains(appContent, 'forest:', 'Forest biome missing');
  assertContains(appContent, 'dungeon:', 'Dungeon biome missing');
  assertContains(appContent, 'manor:', 'Manor biome missing');
  assertContains(appContent, 'beach:', 'Beach biome missing');
  assertContains(appContent, 'entrance:', 'Entrance biome missing');
});

test('Species abilities are defined', () => {
  assertContains(appContent, 'SPECIES_ABILITIES:', 'SPECIES_ABILITIES missing');
  assertContains(appContent, 'flying:', 'flying ability missing');
  assertContains(appContent, 'constrictor:', 'constrictor ability missing');
  assertContains(appContent, 'bloodsuck:', 'bloodsuck ability missing');
});

test('Vore mechanics present', () => {
  assertContains(appContent, 'stomach:', 'stomach tracking missing');
  assertContains(appContent, 'womb:', 'womb tracking missing');
  assertContains(appContent, '_processDigestion', 'digestion processing missing');
  assertContains(appContent, 'endoMode', 'endoMode setting missing');
});

test('Status effects present', () => {
  assertContains(appContent, 'poisoned', 'poisoned status missing');
  assertContains(appContent, 'restrained', 'restrained status missing');
  assertContains(appContent, 'enveloped', 'enveloped status missing');
  assertContains(appContent, '_processStatusEffects', 'status effect processing missing');
});

test('Mobile UI handlers present', () => {
  assertContains(appContent, 'togglePanel(', 'togglePanel method missing');
  assertContains(appContent, 'handleTouchStart(', 'handleTouchStart method missing');
  assertContains(appContent, 'handleTouchEnd(', 'handleTouchEnd method missing');
});

test('Save/load system present', () => {
  assertContains(appContent, 'autoSave()', 'autoSave method missing');
  assertContains(appContent, 'saveToSlot(', 'saveToSlot method missing');
  assertContains(appContent, 'loadFromSlot(', 'loadFromSlot method missing');
  assertContains(appContent, 'loadLastPlayed()', 'loadLastPlayed method missing');
});

test('Cheat system present', () => {
  assertContains(appContent, 'cheats:', 'cheats object missing');
  assertContains(appContent, 'godMode', 'godMode cheat missing');
  assertContains(appContent, 'toggleCheat(', 'toggleCheat method missing');
});

test('Combat queue system present', () => {
  assertContains(appContent, 'combatState:', 'combatState object missing');
  assertContains(appContent, 'turnQueue:', 'turnQueue array missing');
  assertContains(appContent, 'syncActions:', 'syncActions array missing');
  assertContains(appContent, 'processTurn(', 'processTurn method missing');
  assertContains(appContent, '_calcInitiative(', 'initiative calculation missing');
});

test('No syntax errors in key patterns', () => {
  assertNotContains(appContent, 'Hunter\\\'\'s', 'Double-escaped apostrophe in Hunter\'s');
  assertNotContains(appContent, 'Witch\\\'\'s', 'Double-escaped apostrophe in Witch\'s');
});

// === SERIALIZATION TESTS ===
section('Serialization Tests', 'core');

const serPath = path.join(SRC_DIR, 'core', 'serialization.js');
const serContent = fs.readFileSync(serPath, 'utf8');

test('Binary codec has save/load', () => {
  assertContains(serContent, 'Binary.saveGame', 'saveGame missing');
  assertContains(serContent, 'Binary.loadGame', 'loadGame missing');
  assertContains(serContent, 'codecs.save', 'save codec missing');
});

test('Binary codec has unit codec', () => {
  assertContains(serContent, 'codecs.unit', 'unit codec missing');
  assertContains(serContent, 'stomach:', 'unit stomach field missing');
  assertContains(serContent, 'womb:', 'unit womb field missing');
  assertContains(serContent, 'balls:', 'unit balls field missing');
});

// === CONTENT SYSTEM TESTS ===
section('Content System Tests', 'core');

const contentPath = path.join(SRC_DIR, 'core', 'content-system.js');
const contentContent = fs.readFileSync(contentPath, 'utf8');

test('Content tiers defined', () => {
  assertContains(contentContent, 'SAFE:', 'SAFE tier missing');
  assertContains(contentContent, 'MATURE:', 'MATURE tier missing');
  assertContains(contentContent, 'ADULT:', 'ADULT tier missing');
});

test('Content templates exist', () => {
  assertContains(contentContent, 'templates:', 'templates object missing');
  assertContains(contentContent, 'biome:', 'biome templates missing');
  assertContains(contentContent, 'encounter:', 'encounter templates missing');
  assertContains(contentContent, 'combat:', 'combat templates missing');
  assertContains(contentContent, 'action:', 'action templates missing');
});

// === TEMPLATE TESTS ===
section('Template Tests', 'ui');

const template = fs.readFileSync(TEMPLATE, 'utf8');

test('Template has CSS variables', () => {
  assertContains(template, '--bg-primary', 'CSS bg-primary variable missing');
  assertContains(template, '--accent-primary', 'CSS accent-primary variable missing');
});

test('Template has all screen divs', () => {
  assertContains(template, 'id="screen-menu"', 'menu screen missing');
  assertContains(template, 'id="screen-create"', 'create screen missing');
  assertContains(template, 'id="screen-game"', 'game screen missing');
  assertContains(template, 'id="screen-settings"', 'settings screen missing');
  assertContains(template, 'id="screen-mods"', 'mods screen missing');
  assertContains(template, 'id="screen-market"', 'market screen missing');
  assertContains(template, 'id="tutorial-overlay"', 'tutorial overlay missing');
  assertContains(template, 'id="save-manager"', 'save manager missing');
});

test('Template has all panels', () => {
  assertContains(template, 'id="panel-map"', 'map panel missing');
  assertContains(template, 'id="panel-main"', 'main panel missing');
  assertContains(template, 'id="panel-party"', 'party panel missing');
  assertContains(template, 'id="panel-enemies"', 'enemies panel missing');
  assertContains(template, 'id="log-content"', 'log content missing');
});

// === SUMMARY ===
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passedTests}/${totalTests} passed`);
if (failedTests > 0) {
  console.log(`         ${failedTests} failed`);
  process.exit(1);
} else {
  console.log('All tests passed! ✓');
  process.exit(0);
}
