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

function loadBinaryForTest() {
  return new Function('window', `${serContent}\nreturn window.Binary;`)({});
}

function makeSerializableUnit(name, overrides = {}) {
  return {
    name,
    species: 'human',
    icon: 'X',
    gender: 'female',
    disposition: 'party',
    level: 1,
    CPun: 100,
    MPun: 100,
    CPle: 0,
    MPle: 100,
    str: 10,
    con: 10,
    spd: 10,
    int: 10,
    wis: 10,
    cha: 10,
    tags: ['Human'],
    bodyParts: [],
    stomach: [],
    womb: [],
    balls: [],
    cum: 0,
    ...overrides
  };
}

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

test('Binary save/load preserves full world tile state', () => {
  const Binary = loadBinaryForTest();
  const corpse = makeSerializableUnit('Fallen', { disposition: 'corpse', CPun: 0, MPun: 100 });
  const friendly = makeSerializableUnit('Friendly', { disposition: 'friendly' });
  const save = Binary.saveGame({
    player: makeSerializableUnit('You'),
    party: [makeSerializableUnit('You')],
    location: { x: 1, y: 2 },
    currentBiome: 'forest',
    timeHour: 21,
    inventory: [{ id: 'i1', name: 'Apple' }],
    log: [{ text: 'saved' }],
    exploredTiles: new Set(['1,2']),
    worldMap: new Map([['1,2', {
      x: 1,
      y: 2,
      biome: 'forest',
      explored: true,
      hasLandmark: true,
      landmarkName: 'Old Tree',
      structure: 'cabin',
      structureSpawned: true,
      items: [{ id: 'tile-item', name: 'Bone' }],
      creatures: [corpse, friendly]
    }]])
  });
  const loaded = Binary.loadGame(save);
  const tile = loaded.worldMap['1,2'];
  assertEqual(tile.structureSpawned, true, 'World save should preserve structureSpawned');
  assertEqual(tile.landmarkName, 'Old Tree', 'World save should preserve landmark name');
  assertEqual(tile.items[0].name, 'Bone', 'World save should preserve tile items');
  assertEqual(tile.creatures.length, 2, 'World save should preserve tile creatures');
  assertEqual(tile.creatures[0].disposition, 'corpse', 'World save should preserve corpse disposition');
  assertEqual(tile.creatures[1].disposition, 'friendly', 'World save should preserve friendly disposition');
  assertEqual(loaded.timeHour, 21, 'World save should preserve current hour');
});

test('Binary load tolerates old saves without world data', () => {
  const Binary = loadBinaryForTest();
  const oldCodec = {
    preencode(s, obj) {
      Binary.vuint.preencode(s, obj.version); Binary.string.preencode(s, obj.playerName);
      Binary.string.preencode(s, obj.playerSpecies); Binary.int32.preencode(s, obj.locationX);
      Binary.int32.preencode(s, obj.locationY); Binary.vuint.preencode(s, obj.playerHp);
      Binary.vuint.preencode(s, obj.playerMaxHp); Binary.codecs.stats.preencode(s, obj.playerStats);
      Binary.vuint.preencode(s, obj.playerLevel); Binary.array(Binary.codecs.unit).preencode(s, obj.party || []);
      Binary.array(Binary.string).preencode(s, obj.log || []); Binary.string.preencode(s, obj.currentBiome || 'forest');
    },
    encode(s, obj) {
      Binary.vuint.encode(s, obj.version); Binary.string.encode(s, obj.playerName);
      Binary.string.encode(s, obj.playerSpecies); Binary.int32.encode(s, obj.locationX);
      Binary.int32.encode(s, obj.locationY); Binary.vuint.encode(s, obj.playerHp);
      Binary.vuint.encode(s, obj.playerMaxHp); Binary.codecs.stats.encode(s, obj.playerStats);
      Binary.vuint.encode(s, obj.playerLevel); Binary.array(Binary.codecs.unit).encode(s, obj.party || []);
      Binary.array(Binary.string).encode(s, obj.log || []); Binary.string.encode(s, obj.currentBiome || 'forest');
    }
  };
  const buffer = Binary.encode(oldCodec, {
    version: 2,
    playerName: 'You',
    playerSpecies: 'human',
    locationX: 0,
    locationY: 0,
    playerHp: 100,
    playerMaxHp: 100,
    playerStats: { str: 10, con: 10, spd: 10, int: 10, wis: 10, cha: 10 },
    playerLevel: 1,
    party: [makeSerializableUnit('You')],
    log: ['old'],
    currentBiome: 'forest'
  });
  const loaded = Binary.loadGame(buffer);
  assertEqual(Object.keys(loaded.worldMap).length, 0, 'Old save without worldMap should load empty worldMap');
  assertEqual(loaded.exploredTiles.length, 0, 'Old save without exploredTiles should load empty exploredTiles');
  assertEqual(loaded.inventory.length, 0, 'Old save without inventory should load empty inventory');
  assertEqual(loaded.timeHour, 8, 'Old save without time should default to morning');
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

test('Corpse content templates exist', () => {
  assertContains(contentContent, 'corpseLoot', 'Corpse loot content template missing');
  assertContains(contentContent, 'corpseScavenge', 'Corpse scavenge content template missing');
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

test('Action icon labels and legend styles exist', () => {
  assertContains(appContent, 'UI_LABELS:', 'UI label registry missing');
  assertContains(appContent, '_iconActionButton', 'Icon action button helper missing');
  assertContains(appContent, '_actionLegend', 'Action legend helper missing');
  assertContains(template, '.action-legend', 'Action legend styles missing');
  assertContains(template, '.action-caption', 'Action caption styles missing');
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
    { biomeIntro: () => '', encounter: () => '', actionResult: (action, ctx = {}) => `${action}:${ctx.target || ''}:${ctx.item || ''}` },
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

test('Killed party allies drop as tile corpses instead of staying in party', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { CPun: 100, MPun: 100 });
  const ally = makeUnit('Ally', { CPun: 5, MPun: 100 });
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY, Figh: 50 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [] }]]);
  App.combatState.active = true;
  App.nextTurn = function() { this._nextTurnCalled = true; };
  App.enemyTurn(enemy);
  assert(!App.party.includes(ally), 'Killed ally should be removed from party');
  assert(App.creatures.includes(ally), 'Killed ally corpse should be placed in creature area');
  assertEqual(ally.disposition, App.DISPOSITION.CORPSE, 'Killed ally should become corpse disposition');
  assertEqual(ally.decayTurns, 12, 'Dropped corpse should receive decay timer');
  assert(App.worldMap.get('0,0').creatures.includes(ally), 'Dropped corpse should persist on current tile');
});

test('Corpse decay removes expired remains from tile creatures', () => {
  const { App } = loadAppForCombat(() => 0);
  const corpse = makeUnit('Decaying', { disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100, decayTurns: 1 });
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [corpse];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [corpse] }]]);
  App._processCorpseDecay();
  assert(!App.creatures.includes(corpse), 'Expired corpse should be removed from active creatures');
  assert(!App.worldMap.get('0,0').creatures.includes(corpse), 'Expired corpse should be removed from tile creatures');
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

test('Bleed and burn apply damage, stack, and burn can spread in row', () => {
  const { App } = loadAppForCombat(() => 0);
  const burned = makeUnit('Burned', {
    CPun: 30,
    combatRow: 'front',
    status: {
      bleed: { dmg: 2, turns: 1, stacks: 2 },
      burn: { dmg: 3, turns: 1 }
    }
  });
  const neighbor = makeUnit('Neighbor', { combatRow: 'front' });
  App.party = [burned, neighbor];
  App.creatures = [];
  App._processStatusEffects();
  assertEqual(burned.CPun, 23, 'Bleed stacks and burn should both damage');
  assertEqual(Boolean(burned.status.bleed), false, 'Bleed should expire');
  assertEqual(Boolean(burned.status.burn), false, 'Burn should expire');
  assert(neighbor.status.burn, 'Burn should spread to same-row combatant when roll succeeds');
});

test('Freeze skips once then applies temporary speed penalty', () => {
  const { App } = loadAppForCombat(() => 0);
  const unit = makeUnit('Frozen', { spd: 10, status: { freeze: { skip: true, slowTurns: 2 } } });
  App.player = unit;
  App.party = [unit];
  App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'plains', explored: true, creatures: [] }]]);
  App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit, initiative: 10 }], syncActions: [] };
  App.nextTurn = function() { this._freezeSkipped = true; };
  App.processTurn();
  assertEqual(App._freezeSkipped, true, 'Freeze should skip the current turn');
  assertEqual(App._effectiveSpeed(unit), 8, 'Freeze should apply -2 speed after skip');
});

test('Stun skips one turn and then clears', () => {
  const { App } = loadAppForCombat(() => 0);
  const unit = makeUnit('Stunned', { status: { stun: { turns: 1 } } });
  App.player = unit;
  App.party = [unit];
  App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
  App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit, initiative: 10 }], syncActions: [] };
  App.nextTurn = function() { this._stunSkipped = true; };
  App.processTurn();
  assertEqual(App._stunSkipped, true, 'Stun should skip turn');
  assertEqual(Boolean(unit.status.stun), false, 'Stun should clear after skip');
});

test('Sleep skips turns but wakes on damage', () => {
  const { App } = loadAppForCombat(() => 0);
  const sleeper = makeUnit('Sleeper', { status: { sleep: { turns: 3 } } });
  const attacker = makeUnit('Attacker', { Figh: 30 });
  App.player = attacker;
  App.party = [attacker, sleeper];
  App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
  App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: sleeper, initiative: 10 }], syncActions: [] };
  App.nextTurn = function() { this._sleepSkipped = true; };
  App.processTurn();
  assertEqual(App._sleepSkipped, true, 'Sleep should skip turn');
  App.executeActionAgainstTarget('fight', attacker, sleeper);
  assertEqual(Boolean(sleeper.status.sleep), false, 'Damage should wake sleeping unit');
});

test('Charm reverses enemy target selection', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const charmed = makeUnit('Charmed Enemy', { disposition: App.DISPOSITION.ENEMY, Figh: 30, status: { charm: { turns: 2, by: 'You' } } });
  const allyEnemy = makeUnit('Enemy Ally', { disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [charmed, allyEnemy];
  App.combatState.active = true;
  App.nextTurn = function() {};
  App.enemyTurn(charmed);
  assert(allyEnemy.CPun < 100, 'Charmed enemy should attack another enemy');
  assertEqual(player.CPun, 100, 'Charmed enemy should not attack the player');
});

test('Fear can skip or force low-health combatants to flee', () => {
  const { App } = loadAppForCombat(() => 0);
  const scared = makeUnit('Scared', { CPun: 20, MPun: 100, status: { fear: { turns: 2, by: 'Enemy' } } });
  App.player = scared;
  App.party = [scared];
  App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
  App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: scared, initiative: 10 }], syncActions: [] };
  App.nextTurn = function() { this._fearSkipped = true; };
  App.processTurn();
  assertEqual(scared.fledCombat, true, 'Low-health feared unit should flee combat');
  assertEqual(App._fearSkipped, true, 'Fear flee should consume turn');
});

test('Loaded-style units are normalized for combat assumptions', () => {
  const { App } = loadAppForCombat();
  const unit = App._normalizeUnit({ name: 'Bat', species: 'bat', CPun: 10, MPun: 20 });
  assert(unit.status, 'Normalized unit should have status object');
  assert(Array.isArray(unit.stomach), 'Normalized unit should have stomach array');
  assert(Array.isArray(unit.inventory), 'Normalized unit should have moddable inventory array');
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

test('Container capacity blocks stomach overfill', () => {
  const { App } = loadAppForCombat(() => 0);
  const predator = makeUnit('Predator', {
    size: 4,
    appetite: 1,
    Feas: 50,
    stomach: [makeUnit('Stored', { size: 4, alive: true, inStomach: true })]
  });
  const prey = makeUnit('Prey', { size: 2, CPun: 1, MPun: 100, Flee: 1 });
  const result = App._doSubAction('feast', 'swallow', predator, prey, 'Predator', 's');
  assertContains(result, 'stomach is too full', 'Over-capacity swallow should report full stomach');
  assertEqual(predator.stomach.length, 1, 'Blocked swallow should not add prey');
  assertEqual(prey.CPun, 1, 'Blocked swallow should not remove prey');
});

test('Container capacity allows prey that fits', () => {
  const { App } = loadAppForCombat(() => 0);
  const predator = makeUnit('Predator', { size: 4, appetite: 2, Feas: 50, stomach: [] });
  const prey = makeUnit('Prey', { size: 2, CPun: 1, MPun: 100, Flee: 1 });
  const result = App._doSubAction('feast', 'swallow', predator, prey, 'Predator', 's');
  assertContains(result, 'stomach', 'Allowed swallow should produce stomach result text');
  assertEqual(predator.stomach.length, 1, 'Allowed swallow should add prey');
  assertEqual(prey.CPun, 0, 'Allowed swallow should remove prey from play');
});

test('Cock vore and unbirth use reduced orifice capacities', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { size: 4, appetite: 2, Feas: 50, parts: 'cock', balls: [] });
  const tooLarge = makeUnit('Large Prey', { size: 4, CPun: 1, MPun: 100, Flee: 1 });
  const small = makeUnit('Small Prey', { size: 3, CPun: 1, MPun: 100, Flee: 1 });
  const blocked = App._doSubAction('feast', 'cockVore', actor, tooLarge, 'Actor', 's');
  assertContains(blocked, 'balls is too full', 'Balls capacity should be half base capacity');
  const allowed = App._doSubAction('feast', 'cockVore', actor, small, 'Actor', 's');
  assertContains(allowed, 'balls', 'Small prey should fit reduced balls capacity');
  assertEqual(actor.balls.length, 1, 'Allowed cock vore should add prey to balls');
});

test('Expanded unit card shows containment capacity usage', () => {
  const { App } = loadAppForCombat();
  const unit = makeUnit('Predator', {
    expanded: true,
    size: 4,
    appetite: 2,
    stomach: [makeUnit('Stored', { size: 2, alive: true, inStomach: true })]
  });
  App.player = unit;
  App.party = [unit];
  const html = App.renderUnitCard(unit, 0, 'party');
  assertContains(html, 'Stomach: 2/6', 'Unit card should show stomach used/capacity');
  assertContains(html, 'Womb: 0/3', 'Unit card should show womb capacity');
  assertContains(html, 'Balls: 0/3', 'Unit card should show balls capacity');
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
  assertContains(html, "lootCorpse('fallen-1')", 'Corpse card should expose loot action');
  assertContains(html, "scavengeCorpse('fallen-1')", 'Corpse card should expose scavenge action');
  assertNotContains(html, 'outsideActionForCreature', 'Corpse card should not expose living interaction actions');
  assertNotContains(html, 'executeActionOnTarget', 'Corpse card should not expose target selection actions');
});

test('Looting a corpse can grant an item without starting combat', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { hunger: 50 });
  const corpse = makeUnit('Fallen', { id: 'loot-corpse', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  App.player = player;
  App.party = [player];
  App.creatures = [corpse];
  App.inventory = [];
  App.combatState.active = false;
  App.lootCorpse('loot-corpse');
  assertEqual(corpse.looted, true, 'Looted corpse should be marked');
  assertEqual(App.inventory.length, 1, 'Successful corpse loot should add one item');
  assertEqual(App.combatState.active, false, 'Corpse loot should not start combat');
  assertContains(App.log[App.log.length - 1].text, App.inventory[0].name, 'Loot log should mention found item');
});

test('Scavenging a corpse uses corpse-specific result and does not remove it', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { hunger: 50, CPun: 80, MPun: 100 });
  const corpse = makeUnit('Fallen', { id: 'scavenge-corpse', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  App.player = player;
  App.party = [player];
  App.creatures = [corpse];
  App.scavengeCorpse('scavenge-corpse');
  assertEqual(corpse.scavenged, true, 'Scavenged corpse should be marked');
  assert(App.creatures.includes(corpse), 'Scavenging should keep corpse on tile');
  assertEqual(player.hunger, 30, 'Scavenging should reduce hunger');
  assertEqual(player.CPun, 85, 'Scavenging should restore a small amount of punishment');
  assertContains(App.log[App.log.length - 1].text, 'Fallen', 'Scavenge log should use corpse content');
});

test('Threatened timid non-hostile can flee without XP', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { xp: 0, xpToNext: 1000 });
  const timid = makeUnit('Bunny', { id: 'timid-flee', species: 'bunny', disposition: App.DISPOSITION.NEUTRAL, Flee: 20 });
  App.player = player;
  App.party = [player];
  App.creatures = [timid];
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [timid] }]]);
  App.location = { x: 0, y: 0 };
  App.outsideActionOnTarget('fight', timid);
  assert(!App.creatures.includes(timid), 'Successful timid flee should remove creature from tile');
  assertEqual(player.xp, 0, 'Fleeing timid creature should grant no XP');
  assertContains(App.log[App.log.length - 1].text, 'flees', 'Flee result should be logged');
});

test('Failed timid flee turns non-hostile creature hostile and starts combat', () => {
  const { App } = loadAppForCombat(() => 0.9);
  const player = makeUnit('You');
  const timid = makeUnit('Cornered Bunny', { id: 'timid-fail', species: 'bunny', disposition: App.DISPOSITION.FRIENDLY, Flee: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [timid];
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [timid] }]]);
  App.location = { x: 0, y: 0 };
  App.outsideActionOnTarget('fight', timid);
  assertEqual(timid.disposition, App.DISPOSITION.ENEMY, 'Failed timid flee should turn creature hostile');
  assertEqual(App.combatState.active, true, 'Failed timid flee should start combat');
});

test('Attacking a timid group can make same-species creatures flee together', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { xp: 0, xpToNext: 1000 });
  const target = makeUnit('Mouse A', { id: 'mouse-a', species: 'bunny', disposition: App.DISPOSITION.NEUTRAL, Flee: 20 });
  const bystander = makeUnit('Mouse B', { id: 'mouse-b', species: 'bunny', disposition: App.DISPOSITION.FRIENDLY, Flee: 20 });
  App.player = player;
  App.party = [player];
  App.creatures = [target, bystander];
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [target, bystander] }]]);
  App.location = { x: 0, y: 0 };
  App.outsideActionOnTarget('fight', target);
  assertEqual(App.creatures.length, 0, 'Same-species timid bystander should flee with threatened target');
  assertEqual(player.xp, 0, 'Fleeing group should grant no XP');
  assertEqual(App.combatState.active, false, 'All-flee reaction should not start combat');
});

test('Attacking a non-timid creature can turn same-species group hostile', () => {
  const { App } = loadAppForCombat(() => 1);
  const player = makeUnit('You');
  const target = makeUnit('Wolf A', { id: 'wolf-a', species: 'wolf', disposition: App.DISPOSITION.FRIENDLY });
  const bystander = makeUnit('Wolf B', { id: 'wolf-b', species: 'wolf', disposition: App.DISPOSITION.NEUTRAL });
  const unrelated = makeUnit('Human Bystander', { id: 'human-b', species: 'human', disposition: App.DISPOSITION.FRIENDLY });
  App.player = player;
  App.party = [player];
  App.creatures = [target, bystander, unrelated];
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [target, bystander, unrelated] }]]);
  App.location = { x: 0, y: 0 };
  App.processTurn = function() {};
  App.outsideActionOnTarget('fight', target);
  assertEqual(target.disposition, App.DISPOSITION.ENEMY, 'Threatened non-timid target should turn hostile');
  assertEqual(bystander.disposition, App.DISPOSITION.ENEMY, 'Same-species bystander should turn hostile');
  assertEqual(unrelated.disposition, App.DISPOSITION.FRIENDLY, 'Unrelated friendly should stay friendly');
  assertEqual(App.combatState.active, true, 'Group hostility should start combat');
  assert(App.combatState.turnQueue.some(entry => entry.unit === target), 'Target should enter combat queue');
  assert(App.combatState.turnQueue.some(entry => entry.unit === bystander), 'Bystander should enter combat queue');
});

test('Timid ally flees instead of attacking when badly outnumbered', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const ally = makeUnit('Timid Ally', { species: 'bunny', Flee: 20 });
  const enemies = [
    makeUnit('Enemy 1', { disposition: App.DISPOSITION.ENEMY }),
    makeUnit('Enemy 2', { disposition: App.DISPOSITION.ENEMY }),
    makeUnit('Enemy 3', { disposition: App.DISPOSITION.ENEMY })
  ];
  App.player = player;
  App.party = [player, ally];
  App.creatures = enemies;
  App.combatState = {
    active: true,
    round: 1,
    currentTurn: 0,
    processing: false,
    xpEarned: 0,
    turnQueue: [{ unit: ally, initiative: 20 }, ...enemies.map(unit => ({ unit, initiative: 10 }))],
    syncActions: []
  };
  App.allyTurn(ally);
  assertEqual(ally.fledCombat, true, 'Timid ally should mark itself fled from combat');
  assert(!App.combatState.turnQueue.some(entry => entry.unit === ally), 'Fled ally should be removed from combat queue');
  assertEqual(enemies[0].CPun, 100, 'Fled ally should not attack');
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

test('Exploration context keeps creature interaction in panels', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You');
  const friendly = makeUnit('Friendly', { id: 'friendly-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 90, willing: true });
  const neutral = makeUnit('Neutral', { id: 'neutral-1', disposition: App.DISPOSITION.NEUTRAL });
  App.player = player;
  App.party = [player];
  App.creatures = [friendly, neutral];
  App.combatState.active = false;
  App.renderExplorationActions();
  App.renderCreatures();
  const actionsHtml = elements.get('scene-actions').innerHTML;
  assertNotContains(actionsHtml, 'showInteractMenu', 'Main context should not duplicate panel creature interactions');
  assertNotContains(actionsHtml, 'App.search()', 'Search should be hidden until it has stronger mechanics');
  assertContains(actionsHtml, 'title="Items"', 'Inventory should remain in the main context');
  assertContains(actionsHtml, 'aria-label="Items"', 'Inventory icon should expose an aria label');
  assertNotContains(actionsHtml, 'action-legend', 'Single-button context should not show a redundant legend');
  assertContains(elements.get('enemies-content').innerHTML, "outsideActionForCreature('fight','friendly-1')", 'Friendly card should offer fight');
  assertContains(elements.get('enemies-content').innerHTML, "outsideActionForCreature('fuck','neutral-1')", 'Neutral card should offer baseline interaction');
  assertContains(elements.get('enemies-content').innerHTML, "recruitCreatureById('friendly-1')", 'Friendly card should offer recruitment');
});

test('Selected party actor resolves exploration attacks against creatures', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', Figh: 1 });
  const ally = makeUnit('Ally', { id: 'ally-1', Figh: 40 });
  const enemy = makeUnit('Enemy', { id: 'enemy-explore', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.selectExplorationActor(1);
  App.outsideActionForCreature('fight', 'enemy-explore');
  assert(enemy.CPun < 70, 'Selected ally stats should drive exploration attack damage');
  assertContains(App.log[App.log.length - 1].text, 'Ally hit', 'Exploration log should name selected actor');
});

test('Selected party actor can interact with party targets outside combat', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const healer = makeUnit('Healer', { id: 'healer-1', Feed: 20 });
  const wounded = makeUnit('Wounded', { id: 'wounded-1', CPun: 20, MPun: 100, hunger: 60 });
  App.player = player;
  App.party = [player, healer, wounded];
  App.selectExplorationActor(1);
  App.outsideActionForParty('feed', 2);
  assertEqual(wounded.CPun, 60, 'Selected party actor should feed the selected party target');
  assertContains(App.log[App.log.length - 1].text, 'Healer feeds Wounded', 'Party interaction log should use selected actor and target');
});

test('Recruitment is gated by pleasure and willingness score', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { cha: 10, Flir: 10, Fuck: 10 });
  const reluctant = makeUnit('Reluctant', { id: 'reluctant-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 10, MPle: 100 });
  const willing = makeUnit('Willing', { id: 'willing-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 90, MPle: 100, willing: true });
  App.player = player;
  App.party = [player];
  App.creatures = [reluctant, willing];
  App.renderCreatures();
  const html = elements.get('enemies-content').innerHTML;
  assertNotContains(html, "recruitCreatureById('reluctant-1')", 'Low-pleasure friendly should not show recruitment');
  assertContains(html, "recruitCreatureById('willing-1')", 'High-pleasure willing friendly should show recruitment');
  App.recruitCreatureById('reluctant-1');
  assert(!App.party.includes(reluctant), 'Low-score friendly should not join');
  App.recruitCreatureById('willing-1');
  assert(App.party.includes(willing), 'High-score willing friendly should join');
});

test('Rest only appears and heals at safe structures', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You', { CPun: 50, MPun: 100 });
  App.player = player;
  App.party = [player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], structure: null }]]);
  App.renderExplorationActions();
  assertNotContains(elements.get('scene-actions').innerHTML, 'App.rest()', 'Rest should be hidden outside safe rest structures');
  App.rest();
  assertEqual(player.CPun, 50, 'Rest should not heal outside safe rest structures');
  App.worldMap.get('0,0').structure = 'cabin';
  App.renderExplorationActions();
  assertContains(elements.get('scene-actions').innerHTML, 'App.rest()', 'Rest should appear at safe rest structures');
  App.rest();
  assertEqual(player.CPun, 80, 'Rest should heal at safe rest structures');
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

test('Restored world state populates current tile creatures', () => {
  const { App } = loadAppForCombat(() => 1);
  const player = makeUnit('You');
  const corpse = makeUnit('Saved Corpse', { disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  const friendly = makeUnit('Saved Friend', { disposition: App.DISPOSITION.FRIENDLY });
  App.player = player;
  App.party = [player];
  App.location = { x: 2, y: 3 };
  App._restoreWorldState({
    exploredTiles: ['2,3'],
    worldMap: {
      '2,3': {
        x: 2,
        y: 3,
        biome: 'forest',
        explored: true,
        description: 'Saved tile',
        hasLandmark: true,
        landmarkName: 'Saved Tree',
        structureSpawned: true,
        creatures: [corpse, friendly],
        items: [{ id: 'saved-item', name: 'Apple' }]
      }
    }
  });
  assertEqual(App.currentBiome, 'forest', 'Restored current biome should come from loaded tile');
  assertEqual(App.creatures.length, 2, 'Current tile creatures should be restored into active creatures');
  assertEqual(App.creatures[0].disposition, App.DISPOSITION.CORPSE, 'Restored active creatures should include corpses');
  assertEqual(App.creatures[1].disposition, App.DISPOSITION.FRIENDLY, 'Restored active creatures should include friendlies');
  assertEqual(App.worldMap.get('2,3').structureSpawned, true, 'Restored tile should keep structureSpawned');
});

test('Minimap resolves adjacent tile biomes without exploring them', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.exploredTiles = new Set(['0,0']);
  App.getTile(0, 0).explored = true;
  App.renderMap();
  const adjacentTile = App.worldMap.get('1,0');
  assert(adjacentTile, 'Adjacent minimap tile should be resolved into worldMap');
  assertEqual(App.exploredTiles.has('1,0'), false, 'Resolved adjacent tile should not be marked explored');
  const adjacentBiome = App.biomes[adjacentTile.biome];
  assertContains(elements.get('mini-map').innerHTML, adjacentBiome.icon, 'Adjacent tile biome icon should render on minimap');
  assertContains(elements.get('mini-map').innerHTML, adjacentBiome.name, 'Adjacent tile biome name should be available as label');
});

test('Movement and search advance the in-game hour', () => {
  const { App, elements } = loadAppForCombat(() => 1);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.timeHour = 8;
  App.worldMap = new Map();
  App.exploredTiles = new Set(['0,0', '1,0']);
  App.getTile(0, 0).explored = true;
  App.getTile(1, 0).explored = true;
  App.move(1, 0);
  assertEqual(App.timeHour, 9, 'Move should advance time by one hour');
  assertEqual(elements.get('time-display').textContent, '☀️ 09:00', 'Header time should update after movement');
  App.search();
  assertEqual(App.timeHour, 10, 'Search should advance time by one hour');
});

test('Night encounter table favors nocturnal species and suppresses diurnal species', () => {
  const { App } = loadAppForCombat(() => 0);
  App.timeHour = 21;
  const table = App._timeAdjustedEncounterTable([
    { id: 'bat', weight: 10 },
    { id: 'bunny', weight: 10 },
    { id: 'wolf', weight: 10 }
  ]);
  assertEqual(table.find(entry => entry.id === 'bat').weight, 15, 'Nocturnal weight should increase at night');
  assertEqual(table.find(entry => entry.id === 'bunny').weight, 2, 'Diurnal weight should drop at night');
  assertEqual(table.find(entry => entry.id === 'wolf').weight, 10, 'Neutral species weight should stay stable');
});

test('Night map visibility shrinks unless the party has darkvision', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.timeHour = 21;
  App.worldMap = new Map();
  App.exploredTiles = new Set(['0,0', '2,0']);
  App.getTile(0, 0).explored = true;
  const farTile = App.getTile(2, 0);
  farTile.biome = 'cave';
  farTile.explored = true;
  App.renderMap();
  assertNotContains(elements.get('mini-map').innerHTML, App.biomes.cave.icon, 'Far explored tile should be hidden by night visibility');
  App.player.darkvision = true;
  App.renderMap();
  assertContains(elements.get('mini-map').innerHTML, App.biomes.cave.icon, 'Darkvision should restore full minimap visibility');
});

test('Diurnal creatures spawned at night start asleep', () => {
  const { App } = loadAppForCombat(() => 0);
  App.timeHour = 21;
  const bunny = { species: 'bunny', status: {} };
  App._applyTimeOfDayToCreature(bunny);
  assert(bunny.status.sleep, 'Diurnal creature should receive sleep status at night');
  assertEqual(bunny.asleep, true, 'Diurnal creature should be marked asleep at night');
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

test('Combat unit cards show turn order and current focus badges', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'order-player' });
  const ally = makeUnit('Ally', { id: 'order-ally' });
  const enemy = makeUnit('Enemy', { id: 'order-enemy', disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.combatState = {
    active: true,
    round: 1,
    currentTurn: 1,
    processing: false,
    xpEarned: 0,
    turnQueue: [{ unit: player, initiative: 30 }, { unit: enemy, initiative: 20 }, { unit: ally, initiative: 10 }],
    syncActions: []
  };
  const enemyCard = App.renderUnitCard(enemy, 0, 'creature');
  const allyCard = App.renderUnitCard(ally, 1, 'party');
  assertContains(enemyCard, 'Now #2', 'Current target card should show focused turn order');
  assertContains(allyCard, '#3', 'Waiting party card should show turn order number');
});

test('Queued group actions show the slowest participant order and preserve intervening turns', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'sync-player' });
  const ally = makeUnit('Ally', { id: 'sync-ally' });
  const enemy = makeUnit('Enemy', { id: 'sync-enemy', disposition: App.DISPOSITION.ENEMY });
  const bystander = makeUnit('Bystander', { id: 'sync-bystander', disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy, bystander];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'plains', explored: true, creatures: [enemy, bystander] }]]);
  App.combatState = {
    active: true,
    round: 1,
    currentTurn: 0,
    processing: false,
    xpEarned: 0,
    turnQueue: [
      { unit: player, initiative: 30 },
      { unit: bystander, initiative: 20 },
      { unit: ally, initiative: 10 },
      { unit: enemy, initiative: 5 }
    ],
    syncActions: []
  };
  App._syncParticipants = [player, ally];
  App.nextTurn = function() {};
  App.queueSyncAction('sync_fight', 0);
  const sync = App.combatState.syncActions[0];
  assertEqual(sync.resolveAtIndex, 2, 'Group action should resolve on slowest participant index');
  assertEqual(App.combatState.turnQueue[1].actedThisRound || false, false, 'Intervening turn before slowest participant should remain available');
  assertContains(App.renderUnitCard(player, 0, 'party'), 'Group Fight #3', 'Participant card should show group action order');
  assertContains(App.renderUnitCard(enemy, 0, 'creature'), 'Target Fight #3', 'Target card should show group target order');
});

test('Combat auto-position assigns flying and ranged units to back row', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-row', species: 'human' });
  const harpy = makeUnit('Harpy', { id: 'harpy-row', species: 'harpy', disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player];
  App.creatures = [harpy];
  App.processTurn = function() {};
  App.startCombat([harpy]);
  assertEqual(player.combatRow, 'front', 'Melee player should default to front row');
  assertEqual(harpy.combatRow, 'back', 'Flying/ranged enemy should default to back row');
});

test('Melee combat targeting cannot select unreachable back-row enemies', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-melee', Figh: 30 });
  const enemy = makeUnit('Backline', { id: 'backline-1', disposition: App.DISPOSITION.ENEMY, CPun: 100, combatRow: 'back' });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.activeActor = player;
  player.combatRow = 'front';
  App.nextTurn = function() {};
  App.selectTarget('fight');
  assertContains(elements.get('enemies-content').innerHTML, 'disabled', 'Unreachable back-row enemy should render disabled');
  App.executeActionOnTarget('fight', 'backline-1');
  assertEqual(enemy.CPun, 100, 'Unreachable target should not take damage');
  assertContains(App.log[App.log.length - 1].text, 'cannot reach', 'Blocked reach should be logged');
});

test('Combat move action swaps row and costs the active turn', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-move', combatRow: 'front' });
  App.player = player;
  App.party = [player];
  App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
  App.combatState.active = true;
  App.activeActor = player;
  App.nextTurn = function() { this._movedTurn = true; };
  App.moveCombatRow();
  assertEqual(player.combatRow, 'back', 'Move action should swap front to back');
  assertEqual(App._movedTurn, true, 'Move action should consume the turn');
});

test('Flying attackers get flanking damage against back-row targets', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const flyer = makeUnit('Flyer', { id: 'flyer-1', Figh: 30, flying: true, combatRow: 'back' });
  const target = makeUnit('Backline', { id: 'backline-flank', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 10, combatRow: 'back' });
  App.player = player;
  App.party = [player, flyer];
  App.creatures = [target];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'plains', explored: true, creatures: [target] }]]);
  App.combatState.active = true;
  App.nextTurn = function() {};
  App.executeActionAgainstTarget('fight', flyer, target);
  assertEqual(target.CPun, 73, 'Flying flanking bonus should increase damage against back-row targets');
});

test('Water terrain modifies combat speed for swimmers and non-swimmers', () => {
  const { App } = loadAppForCombat(() => 0);
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'water', explored: true, creatures: [] }]]);
  const swimmer = makeUnit('Swimmer', { spd: 10, swimming: true });
  const walker = makeUnit('Walker', { spd: 10 });
  assertEqual(App._effectiveSpeed(swimmer), 12, 'Swimmers should get water speed bonus');
  assertEqual(App._effectiveSpeed(walker), 8, 'Non-swimmers should get water speed penalty');
});

test('Dense forest terrain grants cover and slows movement', () => {
  const { App } = loadAppForCombat(() => 0);
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [] }]]);
  const unit = makeUnit('Forest Unit', { spd: 10, con: 10 });
  assertEqual(App._effectiveSpeed(unit), 8, 'Dense forest should reduce speed');
  assertEqual(App._effectiveCon(unit), 12, 'Dense forest should grant cover CON');
});

test('Cave terrain can cause non-darkvision physical attacks to miss', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { Figh: 50 });
  const enemy = makeUnit('Cave Enemy', { disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'cave', explored: true, creatures: [enemy] }]]);
  App.combatState.active = true;
  App.nextTurn = function() {};
  App.executeActionAgainstTarget('fight', player, enemy);
  assertEqual(enemy.CPun, 100, 'Cave darkness miss should prevent damage');
  assertContains(App.log[App.log.length - 1].text, 'miss', 'Cave miss should be logged as the action result');
});

test('Swamp terrain can stick grounded combatants for their turn', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  App.player = player;
  App.party = [player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'swamp', explored: true, creatures: [] }]]);
  App._applyTerrainRoundEffects([player]);
  assert(player.status.stuck, 'Swamp should apply stuck status when hazard rolls');
  App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: player, initiative: 10 }], syncActions: [] };
  App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
  App.nextTurn = function() { this._stuckSkipped = true; };
  App.processTurn();
  assertEqual(App._stuckSkipped, true, 'Stuck unit should lose its turn');
});

test('Flying creatures are immune to ground melee target selection', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'ground-melee', Figh: 30 });
  const flyer = makeUnit('Flyer', { id: 'flying-target', disposition: App.DISPOSITION.ENEMY, CPun: 100, flying: true, combatRow: 'front' });
  App.player = player;
  App.party = [player];
  App.creatures = [flyer];
  App.combatState.active = true;
  App.activeActor = player;
  App.nextTurn = function() {};
  App.selectTarget('fight');
  assertContains(elements.get('enemies-content').innerHTML, 'disabled', 'Ground melee should not target flying creatures');
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
