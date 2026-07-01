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
  assertContains(appContent, 'CORPSE', 'CORPSE disposition missing');
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

test('Settings clear saves button is wired to an implemented handler', () => {
  assertContains(template, 'App.deleteAllSaves()', 'settings clear saves button should call deleteAllSaves');
  assertContains(appContent, 'async deleteAllSaves()', 'deleteAllSaves handler missing');
  assertContains(appContent, 'location.reload()', 'deleteAllSaves should refresh UI after clearing saves');
});

test('Create screen is constrained for mobile scrolling', () => {
  assertContains(template, 'height: 100dvh', 'create screen should use dynamic viewport height');
  assertContains(template, 'max-height: calc(100dvh - 24px)', 'mobile create container should fit viewport');
  assertContains(template, 'class="action-btn primary create-submit"', 'begin button should use sticky submit styling');
  assertNotContains(template, 'class="create-container" style=', 'create container should not rely on inline scroll sizing');
});

test('Species accordion is the default expanded section', () => {
  assertContains(template, 'id="body-species" style="display:block;"', 'species body should be open by default');
  assertContains(template, 'id="arrow-species">▼</span>', 'species arrow should be open by default');
  assertContains(template, 'id="body-gender" style="display:none;"', 'gender should start collapsed');
});

test('Mobile game shell prevents horizontal overflow', () => {
  assertContains(template, 'height: 100dvh', 'mobile shell should use dynamic viewport height');
  assertContains(template, 'max-width: 100vw', 'mobile shell should be constrained to viewport width');
  assertContains(template, 'overflow: hidden', 'mobile shell should hide horizontal overflow');
  assertContains(template, '--mobile-actions-height: 112px', 'mobile toolbar height should be explicit');
  assertContains(template, 'height: calc(100dvh - var(--mobile-actions-height) - env(safe-area-inset-bottom))', 'mobile app should reserve space above bottom toolbar');
  assertNotContains(template, 'left: -85vw', 'mobile panels should not sit at negative viewport offsets');
  assertNotContains(template, 'right: -85vw', 'mobile panels should not sit at negative viewport offsets');
});

test('Mobile panels and actions expose map party and enemies', () => {
  assertContains(template, 'transform: translateX(-110%)', 'mobile map panel should use transform overlay');
  assertContains(template, 'transform: translateX(110%)', 'mobile side panels should use transform overlay');
  assertContains(template, "togglePanel('enemies')", 'mobile actions should expose enemies panel');
  assertContains(appContent, 'closeAllPanels()', 'panel backdrop close handler should exist');
  assertContains(appContent, 'syncPanelBackdrop()', 'panel backdrop sync handler should exist');
});

test('Mobile gameplay surface keeps map units and scene together', () => {
  assertContains(template, 'id="mobile-play-surface"', 'mobile play surface missing');
  assertContains(template, 'id="mobile-mini-map"', 'mobile map surface missing');
  assertContains(template, 'id="mobile-party-strip"', 'mobile party strip missing');
  assertContains(template, 'id="mobile-creature-strip"', 'mobile creature strip missing');
  assertContains(template, 'id="mobile-scene-description"', 'mobile scene sheet missing');
  assertContains(appContent, 'renderMobilePartyStrip()', 'mobile party renderer missing');
  assertContains(appContent, 'renderMobileCreatureStrip()', 'mobile creature renderer missing');
  assertContains(appContent, "document.getElementById('mobile-mini-map')", 'renderMap should target mobile map');
});

// === COMBAT BEHAVIOR TESTS ===
section('Combat Behavior Tests', 'core');

function makeElement() {
  const classes = new Set();
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    style: {},
    dataset: {},
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !classes.has(name) : Boolean(force);
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
      }
    }
  };
}

function loadAppForCombat(random = () => 0.5, options = {}) {
  const elements = new Map();
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
    querySelectorAll(selector) {
      return options.querySelectorAll ? options.querySelectorAll(selector, elements) : [];
    },
    createElement() { return makeElement(); }
  };
  const storage = new Map();
  const localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  const alerts = [];
  const hooks = [];
  const moduleSystem = {
    executeHook(event, payload) {
      hooks.push({ event, payload });
      return Promise.resolve();
    }
  };
  const math = Object.create(Math);
  math.random = random;
  const appFactory = new Function(
    'window', 'document', 'localStorage', 'CONTENT', 'Binary', 'MODULE_SYSTEM',
    'indexedDB', 'confirm', 'prompt', 'alert', 'setTimeout', 'Math',
    `${appContent}\nreturn window.App;`
  );
  const App = appFactory(
    {},
    document,
    localStorage,
    { biomeIntro: () => '', encounter: () => '' },
    { saveGame: () => new Uint8Array(), loadGame: () => ({}) },
    moduleSystem,
    { open() {}, deleteDatabase() { return {}; } },
    () => Boolean(options.confirm),
    () => null,
    message => alerts.push(message),
    fn => fn(),
    math
  );
  App.renderLog = App.renderLog.bind(App);
  App.renderParty = App.renderParty.bind(App);
  App.renderCreatures = App.renderCreatures.bind(App);
  App.showExplorationActions = function() {};
  App.autoSave = async function() {};
  return { App, elements, hooks, storage, alerts };
}

function makeUnit(name, overrides = {}) {
  return {
    name,
    species: 'human',
    icon: 'X',
    level: 1,
    CPun: 100,
    MPun: 100,
    CPle: 0,
    MPle: 100,
    Figh: 10,
    Feas: 10,
    Flir: 10,
    Fuck: 10,
    Flee: 10,
    Feed: 10,
    str: 10,
    con: 10,
    spd: 10,
    int: 10,
    wis: 10,
    cha: 10,
    size: 4,
    appetite: 4,
    bodyParts: [],
    tags: ['Human'],
    stomach: [],
    womb: [],
    balls: [],
    status: {},
    disposition: 'party',
    ...overrides
  };
}

test('Instant Win is gated behind Overpowered cheat', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You');
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.cheats.overpowered = false;
  App.showPlayerActions();
  assertNotContains(elements.get('scene-actions').innerHTML, 'Instant Win');
  App.combatState.active = true;
  App.instantWin();
  assertEqual(enemy.CPun, 100, 'Instant Win should not affect enemies while gated');
  App.cheats.overpowered = true;
  App.showPlayerActions();
  assertContains(elements.get('scene-actions').innerHTML, 'Instant Win');
});

test('Flee ends combat without granting victory XP', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { Flee: 50, xp: 0, xpToNext: 100 });
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY, spd: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.attemptFlee();
  assertEqual(App.combatState.active, false, 'Flee should end combat');
  assertEqual(player.xp, 0, 'Flee should not grant victory XP');
});

test('Action constants include all 6 primary actionables', () => {
  assertContains(appContent, "FLIRT: 'flirt'", 'FLIRT action constant missing');
  assertContains(appContent, "FEED: 'feed'", 'FEED action constant missing');
  assertContains(appContent, "FIGHT: 'fight'", 'FIGHT action constant missing');
  assertContains(appContent, "FUCK: 'fuck'", 'FUCK action constant missing');
  assertContains(appContent, "FEAST: 'feast'", 'FEAST action constant missing');
  assertContains(appContent, "FLEE: 'flee'", 'FLEE action constant missing');
});

test('Sub-action registry exists with feast and feed sub-actions', () => {
  assertContains(appContent, 'SUB_ACTIONS:', 'SUB_ACTIONS registry missing');
  assertContains(appContent, "feast: {", 'Feast sub-actions missing');
  assertContains(appContent, "feed: {", 'Feed sub-actions missing');
  assertContains(appContent, "swallow:", 'Swallow sub-action missing');
  assertContains(appContent, "heal:", 'Heal sub-action missing');
  assertContains(appContent, "breastfeed:", 'Breastfeed sub-action missing');
  assertContains(appContent, "sacrifice:", 'Sacrifice sub-action missing');
  assertContains(appContent, "forceFeed:", 'ForceFeed sub-action missing');
  assertContains(appContent, "cockVore:", 'CockVore sub-action missing');
  assertContains(appContent, "unbirth:", 'Unbirth sub-action missing');
});

test('Sub-action helpers exist', () => {
  assertContains(appContent, '_getDefaultSubAction', '_getDefaultSubAction missing');
  assertContains(appContent, '_getAvailableSubActions', '_getAvailableSubActions missing');
  assertContains(appContent, '_getActionLabel', '_getActionLabel missing');
  assertContains(appContent, '_getPrimaryLabel', '_getPrimaryLabel missing');
  assertContains(appContent, '_doSubAction', '_doSubAction missing');
  assertContains(appContent, 'registerSubAction', 'registerSubAction mod API missing');
  assertContains(appContent, '_emitSubAction', '_emitSubAction hook missing');
});

test('Feast lifecycle state machine exists', () => {
  assertContains(appContent, '_createStomachPrey', '_createStomachPrey missing');
  assertContains(appContent, '_processStomachState', '_processStomachState missing');
  assertContains(appContent, "digestionState:", 'digestionState field missing');
  assertContains(appContent, "digestionProgress:", 'digestionProgress field missing');
  assertContains(appContent, "statDrain:", 'statDrain field missing');
  assertContains(appContent, "inStomach:", 'inStomach field missing');
  assertContains(appContent, "inWomb:", 'inWomb field missing');
  assertContains(appContent, "inCock:", 'inCock field missing');
  assertContains(appContent, "willingSacrifice:", 'willingSacrifice field missing');
  assertContains(appContent, "forcedFed:", 'forcedFed field missing');
});

test('New creature properties exist', () => {
  assertContains(appContent, 'unit.lactating', 'lactating property missing');
  assertContains(appContent, 'unit.slurpable', 'slurpable property missing');
  assertContains(appContent, 'unit.breakable', 'breakable property missing');
  assertContains(appContent, 'unit.willingPrey', 'willingPrey property missing');
  assertContains(appContent, 'unit.pregnant', 'pregnant property missing');
  assertContains(appContent, 'unit.lactationCooldown', 'lactationCooldown property missing');
});

test('New settings exist for sub-action gates', () => {
  assertContains(appContent, 'cockVoreEnabled', 'cockVoreEnabled setting missing');
  assertContains(appContent, 'unbirthEnabled', 'unbirthEnabled setting missing');
  assertContains(appContent, 'forcedFeeding', 'forcedFeeding setting missing');
});

test('Temperament system exists for encounter disposition', () => {
  assertContains(appContent, 'SPECIES_TEMPERAMENT:', 'SPECIES_TEMPERAMENT missing');
  assertContains(appContent, '_getSpeciesTemperament', '_getSpeciesTemperament missing');
  assertContains(appContent, '_isPredatorOf', '_isPredatorOf missing');
  assertContains(appContent, '_calculateEncounterDisposition', '_calculateEncounterDisposition missing');
  assertContains(appContent, "timid: true", 'timid temperament missing');
  assertContains(appContent, "aggressive: true", 'aggressive temperament missing');
  assertContains(appContent, "herd: true", 'herd temperament missing');
  assertContains(appContent, "prey: true", 'prey temperament missing');
  assertContains(appContent, "apex: true", 'apex temperament missing');
  assertContains(appContent, "PREDATOR_PREY_RELATION:", 'PREDATOR_PREY_RELATION missing');
});

test('Unified encounter system uses temperament for disposition', () => {
  assertContains(appContent, 'spawnWildEncounter', 'spawnWildEncounter missing');
  assertNotContains(appContent, 'spawnFriendlyEncounter', 'spawnFriendlyEncounter should be replaced');
  assertNotContains(appContent, 'spawnEncounter(tile,', 'Old spawnEncounter should be replaced');
  assertContains(appContent, 'creature.disposition = this._calculateEncounterDisposition', 'Disposition calculation missing');
});

test('Sync action resolves only at stored round and queue index', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const ally = makeUnit('Ally');
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.combatState = {
    active: true,
    round: 1,
    currentTurn: 0,
    processing: false,
    xpEarned: 0,
    turnQueue: [{ unit: player, initiative: 20 }, { unit: ally, initiative: 10 }],
    syncActions: [{ type: 'sync_fight', participants: [player, ally], target: enemy, resolveAtIndex: 1, resolved: false, round: 1 }]
  };
  App.processTurn();
  assertEqual(App.combatState.syncActions[0].resolved, false, 'Sync resolved before slowest participant index');
  App.combatState.currentTurn = 1;
  App.processTurn();
  assertEqual(App.combatState.syncActions[0].resolved, true, 'Sync did not resolve at slowest participant index');
});

test('Softcore player KO removes player from acting while allies continue', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { CPun: 5, MPun: 100 });
  const ally = makeUnit('Ally', { CPun: 100 });
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY, Figh: 50 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.nextTurn = function() { this._nextTurnCalled = true; };
  App.enemyTurn(enemy);
  assertEqual(player.CPun, 0, 'Softcore KO should set player HP to 0 during combat');
  assert(player.knockedOut, 'Softcore KO should mark player knockedOut');
  assert(App.combatState.active, 'Combat should continue when allies remain');
  assert(App._nextTurnCalled, 'Combat should advance after KO');
});

test('Stat absorption accumulates fractional digestion progress', () => {
  const { App } = loadAppForCombat();
  const predator = makeUnit('Predator', {
    str: 10,
    con: 10,
    Figh: 10,
    stomach: [makeUnit('Prey', { CPun: 50, alive: true })]
  });
  App.party = [predator];
  App.creatures = [];
  App.settings.statAbsorption = true;
  App.settings.slowDigestion = false;
  App._processDigestion();
  App._processDigestion();
  assertEqual(predator.str, 11, 'Absorption should grant stats after accumulated digestion');
  assertEqual(predator.Figh, 11, 'Absorption should grant combat stat after accumulated digestion');
});

test('Status effects apply damage and expire during processing', () => {
  const { App } = loadAppForCombat();
  const unit = makeUnit('Target', {
    CPun: 20,
    status: {
      poisoned: { dmg: 3, turns: 1 },
      restrained: { by: 'Snake', turns: 1 },
      enveloped: { by: 'Slime', turns: 1 }
    }
  });
  App.party = [unit];
  App.creatures = [];
  App._processStatusEffects();
  assertEqual(unit.CPun, 13, 'Poison and enveloped damage should both apply');
  assertEqual(Boolean(unit.status.poisoned), false, 'Poison should expire');
  assertEqual(Boolean(unit.status.restrained), false, 'Restrained should expire');
  assertEqual(Boolean(unit.status.enveloped), false, 'Enveloped should expire');
});

test('Loaded-style units are normalized for combat assumptions', () => {
  const { App } = loadAppForCombat();
  const unit = App._normalizeUnit({ name: 'Bat', species: 'bat', CPun: 10, MPun: 20 });
  assert(unit.status, 'Normalized unit should have status object');
  assert(Array.isArray(unit.stomach), 'Normalized unit should have stomach array');
  assert(unit.bloodsuck, 'Normalized unit should receive species abilities');
  assertEqual(unit.Figh > 0, true, 'Normalized unit should have combat stats');
});

test('Body parts apply combat abilities to normalized units', () => {
  const { App } = loadAppForCombat();
  const unit = App._normalizeUnit({ name: 'Custom', species: 'human', bodyParts: ['wings', 'stinger', 'tail'] });
  assert(unit.flying, 'Wings should apply flying');
  assert(unit.venom, 'Stinger should apply venom');
  assert(unit.constrictor, 'Tail should apply constrictor');
});

test('Victory XP uses tracked combat outcome rewards', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { Figh: 50, xp: 0, xpToNext: 1000 });
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY, CPun: 1, MPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.nextTurn = function() { this.endCombat(true); };
  App.executeAction('fight', 0);
  assertEqual(player.xp, App.XP_REWARDS.defeatEnemy, 'Defeat outcome should grant defeatEnemy reward');
});

test('Fight defeat converts enemies into corpses', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { Figh: 50, xp: 0, xpToNext: 1000 });
  const enemy = makeUnit('Enemy', { id: 'enemy-corpse', disposition: App.DISPOSITION.ENEMY, CPun: 1, MPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.nextTurn = function() {};
  App.executeAction('fight', 0);
  assertEqual(enemy.disposition, App.DISPOSITION.CORPSE, 'Fight defeat should convert enemy to corpse disposition');
  assertEqual(enemy.CPun, 0, 'Corpse punishment should be zeroed');
  assertEqual(App._livingEnemies(App.creatures).length, 0, 'Corpses should not count as living enemies');
});

test('Creature panel renders corpses as remains without target actions', () => {
  const { App, elements } = loadAppForCombat();
  const corpse = makeUnit('Fallen', { id: 'fallen-1', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [corpse];
  App.renderCreatures();
  const html = elements.get('enemies-content').innerHTML;
  assertContains(elements.get('enemies-title').textContent, 'Remains', 'Corpse-only panel should be titled Remains');
  assertContains(html, '[Remains]', 'Corpse card should label remains');
  assertNotContains(html, 'outsideActionForCreature', 'Corpse card should not expose living interaction actions');
  assertNotContains(html, 'executeActionOnTarget', 'Corpse card should not expose target selection actions');
});

test('Combat actions emit module hook payloads', () => {
  const { App, hooks } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { Figh: 30 });
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.nextTurn = function() {};
  App.executeAction('fight', 0);
  assertEqual(hooks.length, 1, 'Combat action should emit one module hook');
  assertEqual(hooks[0].event, 'onCombatAction');
  assertEqual(hooks[0].payload.action, 'fight');
});

test('Exploration actions expose interaction when non-hostile creatures are present', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You');
  const friendly = makeUnit('Friendly', { id: 'friendly-1', disposition: App.DISPOSITION.FRIENDLY });
  const neutral = makeUnit('Neutral', { id: 'neutral-1', disposition: App.DISPOSITION.NEUTRAL });
  App.player = player;
  App.party = [player];
  App.creatures = [friendly, neutral];
  App.combatState.active = false;
  App.renderExplorationActions();
  App.renderCreatures();
  assertContains(elements.get('scene-actions').innerHTML, 'showInteractMenu', 'Exploration actions should include Interact');
  assertContains(elements.get('enemies-content').innerHTML, "outsideActionForCreature('fight','friendly-1')", 'Friendly card should offer fight');
  assertContains(elements.get('enemies-content').innerHTML, "outsideActionForCreature('fuck','neutral-1')", 'Neutral card should offer baseline interaction');
  assertContains(elements.get('enemies-content').innerHTML, "recruitCreatureById('friendly-1')", 'Friendly card should offer recruitment');
});

test('Revisiting a tile restores friendly neutral and corpse creatures without combat', () => {
  const { App } = loadAppForCombat(() => 1);
  const player = makeUnit('You');
  const friendly = makeUnit('Friendly', { id: 'friendly-restore', disposition: App.DISPOSITION.FRIENDLY });
  const neutral = makeUnit('Neutral', { id: 'neutral-restore', disposition: App.DISPOSITION.NEUTRAL });
  const corpse = makeUnit('Fallen', { id: 'corpse-restore', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  App.player = player;
  App.party = [player];
  App.location = { x: 0, y: 0 };
  App.currentBiome = 'forest';
  App.mode = App.GAME_MODE.NORMAL;
  App.worldMap = new Map([
    ['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], items: [] }],
    ['1,0', { x: 1, y: 0, biome: 'forest', explored: true, description: 'A saved clearing.', hasLandmark: false, creatures: [friendly, neutral, corpse] }]
  ]);
  App.exploredTiles = new Set(['0,0', '1,0']);
  App.move(1, 0);
  assertEqual(App.creatures.length, 3, 'Revisit should restore all saved non-party tile creatures');
  assert(App.creatures.includes(friendly), 'Friendly creature should persist on tile');
  assert(App.creatures.includes(neutral), 'Neutral creature should persist on tile');
  assert(App.creatures.includes(corpse), 'Corpse should persist on tile');
  assertEqual(App.combatState.active, false, 'Non-hostile and corpse-only revisit should not start combat');
});

test('Revisiting a tile starts combat only for living enemies', () => {
  const { App } = loadAppForCombat(() => 1);
  const player = makeUnit('You');
  const corpse = makeUnit('Fallen Enemy', { id: 'fallen-enemy', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  const enemy = makeUnit('Living Enemy', { id: 'living-enemy', disposition: App.DISPOSITION.ENEMY, CPun: 100 });
  App.player = player;
  App.party = [player];
  App.location = { x: 0, y: 0 };
  App.currentBiome = 'forest';
  App.mode = App.GAME_MODE.NORMAL;
  App.worldMap = new Map([
    ['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], items: [] }],
    ['1,0', { x: 1, y: 0, biome: 'forest', explored: true, description: 'A hostile clearing.', hasLandmark: false, creatures: [corpse, enemy] }]
  ]);
  App.exploredTiles = new Set(['0,0', '1,0']);
  App.move(1, 0);
  assertEqual(App.combatState.active, true, 'Living enemy revisit should start combat');
  assert(App.combatState.turnQueue.some(entry => entry.unit === enemy), 'Living enemy should be included in turn queue');
  assert(!App.combatState.turnQueue.some(entry => entry.unit === corpse), 'Corpse should not be included in turn queue');
});

test('Combat target selection is rendered on creature panel cards', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { Figh: 30 });
  const enemy = makeUnit('Enemy', { id: 'enemy-1', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.nextTurn = function() {};
  App.selectTarget('fight');
  assertContains(elements.get('scene-description').innerHTML, 'creature panel', 'Target picker should not replace center with target cards');
  assertContains(elements.get('enemies-content').innerHTML, "executeActionOnTarget('fight','enemy-1')", 'Enemy card should execute selected action');
  App.executeActionOnTarget('fight', 'enemy-1');
  assert(enemy.CPun < 100, 'Panel target action should damage selected enemy');
});

test('Obedient ally turns use the same panel target selection', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const ally = makeUnit('Ally', { id: 'ally-1', Figh: 30, obedient: true });
  const enemy = makeUnit('Enemy', { id: 'enemy-ally', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.combatState = {
    active: true,
    round: 1,
    currentTurn: 0,
    processing: false,
    xpEarned: 0,
    turnQueue: [{ unit: ally, initiative: 20 }, { unit: enemy, initiative: 10 }],
    syncActions: []
  };
  App.nextTurn = function() {};
  App.processTurn();
  assertContains(elements.get('scene-actions').innerHTML, "selectTarget('fight')", 'Ally turn should expose manual actions');
  App.selectTarget('fight');
  assertContains(elements.get('enemies-content').innerHTML, "executeActionOnTarget('fight','enemy-ally')", 'Ally target should be selected from panel');
  App.executeActionOnTarget('fight', 'enemy-ally');
  assert(enemy.CPun < 100, 'Ally panel target action should damage selected enemy');
});

test('Create accordion keeps only the selected section open', () => {
  const sections = ['species', 'gender', 'anatomy'].map(id => ({ dataset: { accordion: id } }));
  const { App, elements } = loadAppForCombat(() => 0.5, {
    querySelectorAll(selector) {
      return selector === '.accordion-section' ? sections : [];
    }
  });
  for (const id of ['species', 'gender', 'anatomy']) {
    elements.get('body-' + id) || elements.set('body-' + id, makeElement());
    elements.get('arrow-' + id) || elements.set('arrow-' + id, makeElement());
  }
  App.toggleAccordion('gender');
  assertEqual(elements.get('body-species').style.display, 'none', 'species should collapse when gender opens');
  assertEqual(elements.get('body-gender').style.display, 'block', 'selected accordion should open');
  assertEqual(elements.get('body-anatomy').style.display, 'none', 'unselected accordion should stay collapsed');
  assertEqual(elements.get('arrow-gender').textContent, '▼', 'selected arrow should point open');
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
