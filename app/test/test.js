#!/usr/bin/env node
/**
 * Test runner for You Are Wild modules
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
const settingsNavContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'settings-nav.js'), 'utf8');
const marketNavContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'market-nav.js'), 'utf8');
const marketScreenContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'market-screen.js'), 'utf8');
const modUiContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'mod-ui.js'), 'utf8');

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
  assertContains(appContent, "role: 'region'", 'Region biome role metadata missing');
  assertContains(appContent, "role: 'feature'", 'Feature biome role metadata missing');
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
  assertContains(appContent, 'showNewGameManager()', 'New game slot manager method missing');
  assertContains(appContent, 'beginNewGameInSlot(', 'New game slot selection method missing');
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

test('Binary save uses live top-level stats when nested stats are stale', () => {
  const Binary = loadBinaryForTest();
  const player = makeSerializableUnit('You', {
    str: 14,
    con: 15,
    spd: 16,
    int: 17,
    wis: 18,
    cha: 19,
    stats: { str: 1, con: 1, spd: 1, int: 1, wis: 1, cha: 1 }
  });
  const ally = makeSerializableUnit('Ally', {
    str: 24,
    con: 25,
    spd: 26,
    int: 27,
    wis: 28,
    cha: 29,
    stats: { str: 2, con: 2, spd: 2, int: 2, wis: 2, cha: 2 }
  });
  const loaded = Binary.loadGame(Binary.saveGame({
    player,
    party: [player, ally],
    location: { x: 0, y: 0 },
    currentBiome: 'forest'
  }));
  assertEqual(loaded.playerStats.str, 14, 'Root player stats should preserve live top-level STR');
  assertEqual(loaded.playerStats.cha, 19, 'Root player stats should preserve live top-level CHA');
  assertEqual(loaded.party[0].stats.con, 15, 'Serialized player unit should preserve live top-level CON');
  assertEqual(loaded.party[1].stats.spd, 26, 'Serialized ally unit should preserve live top-level SPD');
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

test('Binary save can omit full worldMap for world-store-backed slots', () => {
  const Binary = loadBinaryForTest();
  const save = Binary.saveGame({
    player: makeSerializableUnit('You'),
    party: [makeSerializableUnit('You')],
    location: { x: 1, y: 2 },
    currentBiome: 'forest',
    exploredTiles: new Set(['1,2']),
    worldMeta: { worldId: 'world-compact', seed: 'compact-seed', generatorVersion: 1, mapModsHash: 'core' },
    worldMap: new Map([['1,2', {
      x: 1,
      y: 2,
      biome: 'forest',
      explored: true,
      hasLandmark: true,
      landmarkName: 'Old Tree',
      creatures: [makeSerializableUnit('Friendly', { disposition: 'friendly' })]
    }]])
  }, { omitWorldMap: true });
  const loaded = Binary.loadGame(save);
  assertEqual(Object.keys(loaded.worldMap).length, 0, 'Compact slot save should omit durable tile payloads');
  assertEqual(loaded.exploredTiles[0], '1,2', 'Compact slot save should keep explored keys for fast UI restoration');
  assertEqual(loaded.worldMeta.worldId, 'world-compact', 'Compact slot save should keep world id reference');
  assertEqual(loaded.worldMeta.seed, 'compact-seed', 'Compact slot save should keep deterministic seed');
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

test('Localization registry exposes English and Spanish labels', () => {
  assertContains(contentContent, 'locales:', 'Locale registry missing');
  assertContains(contentContent, 'en: {', 'English locale missing');
  assertContains(contentContent, 'es: {', 'Spanish locale missing');
  assertContains(contentContent, 't(key, vars = {})', 'Translation helper missing');
  assertContains(contentContent, 'setLanguage(language)', 'Language setter missing');
  assertContains(contentContent, "'action.fight': 'Fight'", 'English action label missing');
  assertContains(contentContent, "'action.fight': 'Luchar'", 'Spanish action label missing');
  assertContains(contentContent, "'action.inspect': 'Inspect'", 'English inspect label missing');
  assertContains(contentContent, "'action.inspect': 'Inspeccionar'", 'Spanish inspect label missing');
  assertContains(contentContent, "'ui.creatureActions': 'Creature actions'", 'English creature action label missing');
  assertContains(contentContent, "'ui.creatureActions': 'Acciones de criatura'", 'Spanish creature action label missing');
  assertContains(contentContent, "'ui.partyActions': 'Party actions'", 'English party action label missing');
  assertContains(contentContent, "'ui.partyActions': 'Acciones del grupo'", 'Spanish party action label missing');
  assertContains(contentContent, "'mod.noneInstalled': 'No modules installed. Install one above or create an example.'", 'English mod manager empty-state label missing');
  assertContains(contentContent, "'mod.noneInstalled': 'No hay modulos instalados. Instala uno arriba o crea un ejemplo.'", 'Spanish mod manager empty-state label missing');
  assertContains(contentContent, "'mod.confirmDelete': 'Delete this module? This cannot be undone.'", 'English mod manager delete warning missing');
  assertContains(contentContent, "'mod.confirmDelete': 'Borrar este modulo? Esta accion no se puede deshacer.'", 'Spanish mod manager delete warning missing');
  assertContains(contentContent, "'market.title': 'Module Marketplace'", 'English marketplace title missing');
  assertContains(contentContent, "'market.title': 'Mercado de modulos'", 'Spanish marketplace title missing');
  assertContains(contentContent, "'market.installModule': 'Install {name}'", 'English marketplace install action missing');
  assertContains(contentContent, "'market.installModule': 'Instalar {name}'", 'Spanish marketplace install action missing');
  assertContains(contentContent, "'create.namePlaceholder': 'Enter your name...'", 'English create name placeholder missing');
  assertContains(contentContent, "'create.namePlaceholder': 'Ingresa tu nombre...'", 'Spanish create name placeholder missing');
  assertContains(contentContent, "'ui.expandCards': 'Expand'", 'English expand-card label missing');
  assertContains(contentContent, "'ui.expandCards': 'Expandir'", 'Spanish expand-card label missing');
  assertContains(contentContent, "'mod.loading': 'Loading modules...'", 'English module loading fallback missing');
  assertContains(contentContent, "'mod.loading': 'Cargando modulos...'", 'Spanish module loading fallback missing');
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

test('Scene description supports rich bounded content', () => {
  assertContains(template, '<div class="scene-description" id="scene-description">', 'Scene description should be a div so rich panels do not get invalidly nested inside a paragraph');
  assertContains(template, '.party-stats-view', 'Party stats view should have bounded scroll styles');
  assertContains(template, '.party-stats-footer', 'Party stats view should have a sticky footer action area');
  assertContains(template, '.mobile-scene-sheet.rich-content', 'Mobile scene sheet should have an expanded rich-content mode');
  assertContains(template, '.mobile-scene-description .party-stats-view', 'Mobile rich stats should fit inside the visible scene sheet');
  assertContains(template, 'overscroll-behavior: contain', 'Bounded stats and modal surfaces should contain scroll gestures');
  assertNotContains(template, '<p class="scene-description" id="scene-description">', 'Scene description should not be a paragraph when injected content contains divs');
});

test('Settings clear saves button is wired to an implemented handler', () => {
  assertContains(template, 'App.deleteAllSaves()', 'settings clear saves button should call deleteAllSaves');
  assertContains(appContent, 'async deleteAllSaves()', 'deleteAllSaves handler missing');
  assertContains(appContent, 'location.reload()', 'deleteAllSaves should refresh UI after clearing saves');
  assertContains(appContent, "this._label('save.confirmDeleteAll'", 'deleteAllSaves warning should come from localized copy');
  assertContains(appContent, "this._label('save.success.deletedAll'", 'deleteAllSaves success alert should come from localized copy');
  assertContains(appContent, "this._label('save.error.deleteAllFailed'", 'deleteAllSaves failure alert should come from localized copy');
  assertContains(appContent, "this._label('settings.confirmClearAllData'", 'clearAllData warning should come from localized copy');
  assertContains(appContent, "this._label('settings.clearAllDataDone'", 'clearAllData success alert should come from localized copy');
});

test('Mod manager UI uses localized safe rendering for module metadata', () => {
  assertContains(modUiContent, "label(key, fallback, vars = {})", 'ModUI localization helper missing');
  assertContains(modUiContent, "escapeHtml(value)", 'ModUI HTML escaping helper missing');
  assertContains(modUiContent, "this.label('mod.installedLog'", 'Mod install log should localize');
  assertContains(modUiContent, "this.label('mod.confirmDelete'", 'Mod delete confirmation should localize');
  assertContains(modUiContent, "this.label('mod.noneInstalled'", 'Mod empty state should localize');
  assertContains(modUiContent, "this.label('mod.noDescription'", 'Mod missing-description fallback should localize');
  assertContains(modUiContent, "this.escapeHtml(manifest.name", 'Mod names should be escaped before rendering');
  assertContains(modUiContent, "this.escapeHtml(manifest.description", 'Mod descriptions should be escaped before rendering');
  assertContains(modUiContent, 'aria-label="${enableTitle}"', 'Mod enable button should expose accessible localized title');
  assertContains(modUiContent, 'aria-label="${deleteTitle}"', 'Mod delete button should expose accessible localized title');
  assertNotContains(modUiContent, '${mod.manifest.name}', 'Mod names should not be inserted directly into HTML');
  assertNotContains(modUiContent, "${mod.manifest.description || 'No description'}", 'Mod descriptions should not be inserted directly into HTML');
});

test('Marketplace UI uses localized safe rendering for catalog metadata', () => {
  assertContains(template, 'data-i18n="market.title"', 'Marketplace fallback title should opt into static localization');
  assertContains(template, 'data-i18n="market.subtitle"', 'Marketplace fallback subtitle should opt into static localization');
  assertContains(template, 'data-i18n="market.browse"', 'Marketplace fallback browse button should localize');
  assertContains(marketScreenContent, "label(key, fallback, vars = {})", 'Marketplace localization helper missing');
  assertContains(marketScreenContent, "escapeHtml(value)", 'Marketplace HTML escaping helper missing');
  assertContains(marketScreenContent, "this.label('market.title'", 'Marketplace title should localize');
  assertContains(marketScreenContent, "this.label('market.search'", 'Marketplace search placeholder should localize');
  assertContains(marketScreenContent, "this.label('market.installModule'", 'Marketplace install button title should localize');
  assertContains(marketScreenContent, "this.label('market.downloading'", 'Marketplace download log should localize');
  assertContains(marketScreenContent, "this.label('market.createWizardPlaceholder'", 'Marketplace create placeholder should localize');
  assertContains(marketScreenContent, 'const featured = MODULE_MARKETPLACE.featuredModules[0] || {}', 'Marketplace staff pick should read root featured module data');
  assertContains(marketScreenContent, 'MODULE_MARKETPLACE.featuredModules.find', 'Marketplace install should read root featured module data');
  assertContains(marketScreenContent, "this.escapeHtml(mod.name)", 'Marketplace module names should be escaped before rendering');
  assertContains(marketScreenContent, "this.escapeHtml(mod.description)", 'Marketplace descriptions should be escaped before rendering');
  assertContains(marketScreenContent, 'aria-label="${installTitle}"', 'Marketplace install buttons should expose accessible localized titles');
  assertNotContains(marketScreenContent, '${mod.name}</h3>', 'Marketplace module names should not be inserted directly into HTML');
  assertNotContains(marketScreenContent, '${mod.description}', 'Marketplace descriptions should not be inserted directly into HTML');
});

test('New game flow is slot-aware and warns before destructive slot changes', () => {
  assertContains(template, 'App.showNewGameManager()', 'Main menu New Game should open slot selection');
  assertContains(appContent, "showSaveManager('new')", 'New game manager should render save slots in new-run mode');
  assertContains(appContent, "saveButton('nav-btn primary'", 'Save manager should generate accessible action buttons');
  assertContains(appContent, "this._label('save.toolbarNew'", 'Load manager should expose a localized always-visible New Game entry point');
  assertContains(contentContent, "'save.newRun': 'New Run'", 'Load/save slot manager should expose localized new-run slot takeover');
  assertContains(contentContent, "'save.description': 'Auto-save is always on. Empty slots start a new game; occupied slots can load, start a new run, save over, or delete only that slot.'", 'Slot manager copy should describe slot-specific actions');
  assertContains(template, '.save-slot-card', 'Save slot cards should have responsive layout styles');
  assertContains(template, '.save-slot-card.empty', 'Empty save slots should have distinct styling');
  assertContains(template, '.save-manager-toolbar', 'Save manager should style its top-level New Game action');
  assertContains(template, 'id="save-manager" class="screen screen-overlay" role="dialog" aria-modal="true"', 'Save manager should behave as a modal dialog');
  assertContains(template, '#save-manager.screen', 'Save manager overlay styles should be explicit');
  assertContains(template, 'height: 100dvh', 'Save manager should use dynamic viewport height on mobile');
  assertContains(template, 'overflow: hidden', 'Save manager overlay should keep scrolling inside the dialog surface');
  assertContains(template, 'overscroll-behavior: contain', 'Save manager shell should contain mobile scroll gestures');
  assertContains(template, '-webkit-overflow-scrolling: touch', 'Save manager shell should use momentum scrolling on iOS');
  assertContains(template, 'calc(32px + env(safe-area-inset-bottom))', 'Save manager shell should reserve safe-area bottom padding');
  assertContains(template, 'grid-template-columns: repeat(2, minmax(0, 1fr))', 'Save slot actions should collapse to mobile grid');
  assertContains(appContent, 'class="save-manager-shell"', 'Save manager should render responsive shell');
  assertContains(appContent, 'class="save-slot-actions"', 'Save slot actions should use responsive action group');
  assertContains(appContent, "this._label('save.openSlot'", 'Empty slots should be labeled as open new-game slots');
  assertContains(contentContent, "'save.useEmpty': 'Use Empty Slot'", 'New-game mode should label empty slot selection clearly');
  assertContains(contentContent, "'save.overwriteSlot': 'Overwrite Slot'", 'New-game mode should label occupied slot takeover clearly');
  assertContains(appContent, 'aria-label="${this._escapeHtml(title)}"', 'Generated save slot buttons should expose accessible names');
  assertContains(appContent, "this._label('save.confirm.newGameOverwrite'", 'New game overwrite warning should come from localized copy');
  assertContains(appContent, "this._label('save.confirm.manualOverwrite'", 'Manual save overwrite warning should come from localized copy');
  assertContains(appContent, "this._label('save.confirm.deleteSlot'", 'Delete slot warning should come from localized copy');
  assertContains(appContent, 'then(ok => { if (ok) App.showScreen', 'Load action should enter game only after a successful slot load');
  assertNotContains(appContent, "then(() => { App.showScreen", 'Load action should not enter game after a failed slot load');
  assertContains(contentContent, "'save.confirm.newGameOverwrite': 'Start a new game in {slot}? This will overwrite that save slot. This cannot be undone.'", 'New game overwrite warning should name the selected slot and be irreversible');
  assertContains(contentContent, "'save.confirm.manualOverwrite': 'Overwrite {slot} with the current game? This cannot be undone.'", 'Manual save should warn before overwriting another occupied slot');
  assertContains(contentContent, "'save.confirm.deleteSlot': 'Delete save slot {slot}? This permanently removes only this slot and cannot be undone.'", 'Delete slot should warn that it is scoped and irreversible');
});

test('Accessibility settings controls are available', () => {
  assertContains(template, 'body.high-contrast', 'High contrast CSS class missing');
  assertContains(template, 'body.reduced-motion *', 'Reduced motion CSS class missing');
  assertContains(template, 'id="setting-high-contrast"', 'High contrast setting missing');
  assertContains(template, 'id="setting-reduced-motion"', 'Reduced motion setting missing');
  assertContains(template, 'id="setting-font-size"', 'Font size setting missing');
  assertContains(template, 'aria-live="polite"', 'Log region should announce updates politely');
});

test('Persistent navigation controls expose accessible labels', () => {
  assertContains(template, 'aria-label="Continue last game"', 'Continue menu action should expose accessible label');
  assertContains(template, 'aria-label="Start a new game"', 'New game menu action should expose accessible label');
  assertContains(template, 'aria-label="Open settings"', 'Settings menu action should expose accessible label');
  assertContains(template, 'aria-label="Toggle map panel"', 'Map nav button should expose accessible label');
  assertContains(template, 'aria-label="Toggle party panel"', 'Party nav button should expose accessible label');
  assertContains(template, 'aria-label="Toggle creatures panel"', 'Creature nav button should expose accessible label');
  assertContains(settingsNavContent, "setAttribute('data-i18n-aria-label', 'ui.menu.settingsTitle')", 'Injected settings nav button should localize accessible label');
  assertContains(settingsNavContent, "setAttribute('data-i18n-title', 'ui.menu.settingsTitle')", 'Injected settings nav button should localize title');
  assertContains(marketNavContent, "setAttribute('data-i18n-aria-label', 'ui.menu.marketTitle')", 'Injected market nav button should localize accessible label');
  assertContains(marketNavContent, "setAttribute('data-i18n-title', 'ui.menu.marketTitle')", 'Injected market nav button should localize title');
  assertContains(modUiContent, "setAttribute('data-i18n-aria-label', 'ui.menu.modsTitle')", 'Injected mods nav button should localize accessible label');
  assertContains(modUiContent, "setAttribute('data-i18n-title', 'ui.menu.modsTitle')", 'Injected mods nav button should localize title');
  assertContains(template, 'aria-label="Expand or collapse party cards"', 'Party panel expand control should expose accessible label');
  assertContains(template, 'aria-label="Expand or collapse creature cards"', 'Creature panel expand control should expose accessible label');
  assertContains(template, 'aria-label="Export visible log entries"', 'Log export control should expose accessible label');
  assertContains(template, 'aria-label="Show combat log entries"', 'Combat log filter should expose accessible label');
});

test('Settings expose language selector', () => {
  assertContains(template, 'id="setting-language"', 'Language selector missing');
  assertContains(template, 'App.updateLanguage(this.value)', 'Language selector should update App language');
  assertContains(template, '<option value="en">English</option>', 'English language option missing');
  assertContains(template, '<option value="es">Espanol</option>', 'Spanish language option missing');
});

test('Persistent shell controls opt into localization', () => {
  assertContains(appContent, 'applyStaticLocalization(root = document)', 'Static shell localization helper missing');
  assertContains(appContent, 'data-i18n-placeholder', 'Static localization should support placeholders');
  assertContains(template, 'data-i18n="ui.menu.newGame"', 'Main menu new-game text should opt into localization');
  assertContains(template, 'data-i18n-title="ui.menu.newGameTitle"', 'Main menu new-game title should opt into localization');
  assertContains(template, 'data-i18n-aria-label="ui.nav.mapTitle"', 'Map nav accessible label should opt into localization');
  assertContains(template, 'data-i18n-placeholder="ui.log.search"', 'Log search placeholder should opt into localization');
  assertContains(template, 'data-i18n-placeholder="create.namePlaceholder"', 'Create-name placeholder should opt into localization');
  assertContains(template, 'data-i18n="ui.expandCards"', 'Panel expand buttons should opt into localization');
  assertContains(template, 'data-i18n-title="ui.expandPartyCardsTitle"', 'Party expand button title should opt into localization');
  assertContains(template, 'data-i18n-title="ui.expandCreatureCardsTitle"', 'Creature expand button title should opt into localization');
  assertContains(template, 'data-i18n-title="ui.swipeRightMap"', 'Swipe map hint title should opt into localization');
  assertContains(template, 'data-i18n-title="ui.swipeLeftParty"', 'Swipe party hint title should opt into localization');
  assertContains(template, 'data-i18n="mod.loading"', 'Module loading fallback should opt into localization');
  assertContains(settingsNavContent, 'App.applyStaticLocalization?.(nav)', 'Injected settings nav should refresh static localization after insertion');
  assertContains(marketNavContent, 'App.applyStaticLocalization?.(nav)', 'Injected market nav should refresh static localization after insertion');
  assertContains(modUiContent, 'App.applyStaticLocalization?.(nav)', 'Injected mods nav should refresh static localization after insertion');
  assertContains(contentContent, "'ui.menu.newGame': 'New Game'", 'English shell new-game label missing');
  assertContains(contentContent, "'ui.menu.newGame': 'Nueva partida'", 'Spanish shell new-game label missing');
  assertContains(contentContent, "'settings.interfaceLanguage': 'Idioma de interfaz'", 'Spanish settings shell label missing');
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
  assertContains(template, '.mobile-context-menu', 'mobile context menu styles should exist');
  assertContains(template, 'max-height: calc(100dvh - var(--mobile-actions-height)', 'mobile context menus should be viewport bounded above the action toolbar');
  assertContains(template, '-webkit-overflow-scrolling: touch', 'mobile context menus should support momentum scrolling');
  assertNotContains(template, 'left: -85vw', 'mobile panels should not sit at negative viewport offsets');
  assertNotContains(template, 'right: -85vw', 'mobile panels should not sit at negative viewport offsets');
});

test('Mobile panels and actions expose map party and enemies', () => {
  assertContains(template, 'transform: translateX(-110%)', 'mobile map panel should use transform overlay');
  assertContains(template, 'transform: translateX(110%)', 'mobile side panels should use transform overlay');
  assertContains(appContent, "stats: 'App.showCharacterStats()'", 'mobile actions should expose character stats');
  assertContains(appContent, "['stats', 'map', 'party', 'enemies']", 'mobile panel actions should include stats before map and party panels');
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

test('Large map discovery surface exists', () => {
  assertContains(template, 'id="large-map"', 'Large map container missing');
  assertContains(template, 'id="large-map-pois"', 'Large map point-of-interest container missing');
  assertContains(template, 'id="large-map-view"', 'Large map view label missing');
  assertContains(template, 'App.setLargeMapZoom(-1)', 'Large map zoom-in control missing');
  assertContains(template, 'App.panLargeMap(0,-1)', 'Large map pan control missing');
  assertContains(template, 'App.recenterLargeMap()', 'Large map recenter control missing');
  assertContains(template, '.large-map-tile', 'Large map tile styles missing');
  assertContains(appContent, 'renderLargeMap()', 'Large map renderer missing');
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
  const attributes = new Map();
  const style = {
    setProperty(name, value) {
      this[name] = value;
    }
  };
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    style,
    disabled: false,
    click() { this.clicked = true; },
    focus() { this.focused = true; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; },
    hasAttribute(name) { return attributes.has(name); },
    querySelectorAll() { return []; },
    remove() { this.removed = true; },
    insertAdjacentHTML(_position, html) { this.innerHTML = (this.innerHTML || '') + html; },
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
  const body = makeElement();
  const listeners = new Map();
  const document = {
    body,
    activeElement: body,
    addEventListener(type, handler) { listeners.set(type, handler); },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
    },
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
  const confirmations = [];
  const prompts = [];
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
    {
      preferences: { maxTier: 3, voreEnabled: true, explicitDescriptions: true, language: 'en' },
      locales: {
        en: {
          'action.fight': 'Fight', 'action.flirt': 'Flirt', 'action.fuck': 'Fuck', 'action.feast': 'Feast', 'action.feed': 'Feed', 'action.flee': 'Flee', 'action.moveRow': 'Move Row', 'action.sync': 'Sync', 'action.skip': 'Skip', 'action.interact': 'Interact', 'action.stats': 'Stats', 'action.inspect': 'Inspect', 'action.recruit': 'Recruit', 'action.acceptQuest': 'Accept Quest', 'action.viewQuest': 'View Quest', 'action.trade': 'Trade', 'action.acceptQuestFrom': 'Accept quest from {name}', 'action.viewQuestFrom': 'View quest from {name}', 'action.tradeWith': 'Trade with {name}', 'action.loot': 'Loot', 'action.scavenge': 'Scavenge',
          'inventory.use': 'Use', 'inventory.equip': 'Equip', 'inventory.drop': 'Drop', 'inventory.unequip': 'Unequip', 'inventory.back': 'Back', 'inventory.useItem': 'Use {name}', 'inventory.equipItem': 'Equip {name}', 'inventory.dropItem': 'Drop {name}', 'inventory.unequipSlot': 'Unequip {slot}', 'inventory.full': 'Inventory is full.', 'inventory.empty': 'Empty.', 'inventory.noItemsMatch': 'No items match the current filter.', 'inventory.titleWithCount': 'Inventory ({count}/{max})', 'inventory.equippedSection': 'Equipped', 'inventory.equipped': 'Equipped {name}.', 'inventory.unequipped': 'Unequipped {name}.', 'inventory.noEquipment': 'No equipment', 'inventory.noBonus': 'No bonus', 'inventory.effect': 'Effect',
          'item.category': 'Category', 'item.category.all': 'All', 'item.category.consumable': 'Consumable', 'item.category.equipment': 'Equipment', 'item.category.valuable': 'Valuable', 'item.category.material': 'Material', 'item.category.misc': 'Misc', 'item.sort': 'Sort', 'item.sort.name': 'Name', 'item.sort.type': 'Type', 'item.sort.valueDesc': 'Value ↓', 'item.sort.valueAsc': 'Value ↑',
          'trade.title': '{name} Trade', 'trade.gold': 'Gold: {gold}', 'trade.buy': 'Buy', 'trade.sell': 'Sell', 'trade.buyItem': 'Buy {name}', 'trade.sellItem': 'Sell {name}', 'trade.needGold': 'You need {price} gold to buy {name}.', 'trade.confirmBuy': 'Buy {name} for {price} gold?', 'trade.purchaseCancelled': 'Purchase cancelled: {name}.', 'trade.bought': 'Bought {name} for {price} gold.', 'trade.sold': 'Sold {name} for {price} gold.', 'trade.noStockMatches': 'No stock matches the current filter.', 'trade.noItemsToSell': 'No items to sell.', 'trade.noInventoryMatches': 'No inventory items match the current filter.',
          'quest.title': 'Quests', 'quest.status': 'Status', 'quest.sort': 'Sort', 'quest.filter.all': 'All', 'quest.filter.active': 'Active', 'quest.filter.turnIn': 'Turn In', 'quest.filter.completed': 'Completed', 'quest.sort.status': 'Status', 'quest.sort.title': 'Title', 'quest.showOnMap': 'Show On Map', 'quest.showTurnIn': 'Show Turn-In', 'quest.turnIn': 'Turn In', 'quest.showOnMapFor': 'Show {name} on map', 'quest.showTurnInFor': 'Show turn-in for {name}', 'quest.turnInQuest': 'Turn in {name}', 'quest.noneActive': 'No active quests.', 'quest.noneMatchFilter': 'No quests match the current filter.', 'quest.alreadyInLog': '{title} is already in your quest log.', 'quest.accepted': 'Quest accepted: {title}.', 'quest.completed': 'Quest completed: {title}.', 'quest.completedTurnIn': 'Quest completed: {title}. Return to {giver} for your reward.', 'quest.defaultGiver': 'the quest giver', 'quest.notReadyTurnIn': 'That quest is not ready to turn in.', 'quest.alreadyTurnedIn': '{title} has already been turned in.', 'quest.turnedIn': 'Quest turned in: {title}.', 'quest.noObjectiveMarker': 'No map marker is available for that quest objective.', 'quest.mapFocusedObjective': 'Map focused on {title}: {label}.', 'quest.noTurnInLocation': 'No turn-in location is available for that quest.', 'quest.mapFocusedTurnIn': 'Map focused on {title} turn-in: {label}.',
          'perk.choose': 'Choose Perk', 'perk.chooseCount': 'Choose Perk ({count})', 'perk.pending': 'Pending choices: {count}', 'perk.trees': 'Perk trees', 'perk.filter.all': 'All', 'perk.chooseNamed': 'Choose {name}', 'perk.back': 'Back', 'perk.respec': 'Respec Perks', 'perk.debugGrant': 'Debug +1 Perk Choice', 'perk.closeStats': 'Close', 'perk.levelUp': 'Level up! You are now level {level}. All stats increased!', 'perk.chooseNew': 'Choose a new perk from the perk tree.', 'perk.notAvailable': 'That perk is not available yet.', 'perk.chosen': 'Perk chosen: {name}. {description}', 'perk.noneToRespec': 'No perks selected to respec.', 'perk.confirmRespec': 'Reset selected perks and refund their choices?', 'perk.respecDoneOne': 'Perks reset. Refunded {count} choice.', 'perk.respecDoneMany': 'Perks reset. Refunded {count} choices.',
          'ui.close': 'Close', 'ui.cancel': 'Cancel', 'ui.actionLegend': 'Action legend', 'ui.menu.newGame': 'New Game', 'ui.menu.newGameTitle': 'Start a new game', 'ui.log.search': 'Search log', 'settings.title': 'Settings', 'settings.interfaceLanguage': 'Interface Language', 'ui.creatureActions': 'Creature actions', 'ui.partyActions': 'Party actions', 'ui.exploration': 'Exploration', 'ui.chooseAction': 'Choose your next action.', 'ui.area': 'Area', 'ui.enemies': 'Enemies', 'ui.creatures': 'Creatures', 'ui.noCreaturesPresent': 'No creatures present', 'ui.noCreaturesHere': 'No creatures here', 'target.chooseFromPanel': 'Select a target from the creature panel.', 'target.cancelAction': 'Cancel {action}', 'log.movedTo': 'Moved to {x}, {y} ({biome})', 'log.inCombatCannotMove': 'You are in combat! Use Flee to escape.', 'log.discoveredLandmark': 'Discovered {name}!', 'log.restUnavailable': 'There is no safe place to rest here.', 'log.rested': 'Rested and recovered.', 'log.noEntriesMatchFilter': 'No log entries match the current filter.', 'recruit.partyFull': 'Party is full! Cannot recruit {name}', 'recruit.notReady': '{name} is not ready to join the party.', 'recruit.joined': '{name} joins your party!', 'recruit.confirmSubmissive': '{name} is submissive. Recruit them to your party?', 'feed.optionsTitle': 'Feed Options', 'feed.noOptions': 'No feed options available right now.', 'feed.noWoundedAllies': 'No wounded allies to feed.', 'feed.noWillingLivestock': 'No willing livestock to sacrifice.', 'feed.noForceFeedEnemies': 'No enemies to force-feed.', 'feed.noValidTarget': 'No valid target for this feed action.',
          'disposition.hostile': 'Hostile', 'disposition.friendly': 'Friendly', 'disposition.neutral': 'Neutral', 'disposition.quest': 'Quest', 'disposition.merchant': 'Merchant', 'disposition.remains': 'Remains', 'combat.row': 'Row', 'combat.row.front': 'Front', 'combat.row.back': 'Back', 'combat.group': 'Group', 'combat.turnOrder': 'Turn order', 'combat.status.current': '{name} is the current combat actor at turn {order}.', 'combat.status.queued': '{name} is queued at turn {order}.', 'combat.status.queuedActed': '{name} is queued at turn {order} and has already acted this round.', 'combat.status.syncParticipant': '{name} is participant in queued group {action} resolving at turn {order}.', 'combat.status.syncTarget': '{name} is target of queued group {action} resolving at turn {order}.', 'combat.status.canTarget': '{name} can be selected as the {action} target.', 'combat.status.cannotTarget': '{name} cannot be selected as the {action} target.', 'combat.status.choosingTarget': '{name} is choosing a {action} target.', 'combat.moveRowLog': '{name} moves to the {row} row.', 'combat.cannotReachTarget': '{actor} cannot reach {target} from here.', 'combat.flee.noEnemies': 'No enemies to flee from!', 'combat.flee.success': 'You flee successfully!', 'combat.flee.failed': 'Flee failed! {name} intercepts you!', 'combat.godModeSaved': 'God Mode saved you from death!', 'combat.playerFallen': 'You have fallen! Game Over!', 'combat.hardcoreSaveDeleted': 'HARDCORE MODE: Your save has been deleted.', 'combat.playerKnockedOut': 'You have been knocked out! Your party must finish the fight...', 'combat.partyWipedOut': 'Your party has been wiped out!', 'combat.alliesContinue': 'Your allies continue the fight...', 'combat.playerComesTo': '{name} comes to after the fight.', 'combat.victory': 'Victory! Enemies defeated or subdued.', 'combat.escapedEncounter': 'You escaped the encounter.', 'combat.defeat': 'Defeat...', 'combat.confirmReturnToMenu': 'Defeat! Return to menu?', 'combat.notInCombat': 'Not in combat!', 'combat.waitForTurn': 'Wait for your turn!', 'combat.notYourTurn': 'Not your turn!', 'combat.sync.chooseAction': 'Choose Sync Action', 'combat.sync.noAllies': 'No allies available for sync.', 'combat.sync.action.fuck': 'Group Seduce', 'combat.sync.action.flirt': 'Group Flirt', 'combat.sync.action.fight': 'Group Fight', 'combat.sync.action.feed': 'Group Feed', 'combat.sync.selectParticipants': 'Select participants for sync', 'combat.sync.selectParticipantFor': 'Select {name} for sync', 'combat.sync.confirmParticipants': 'Confirm Participants', 'combat.sync.needParticipants': 'Need at least 2 participants for a sync action.', 'combat.sync.selectTarget': 'Select sync target', 'combat.sync.selectTargetFor': 'Select {name} as sync target', 'combat.sync.failedNoQueue': 'Sync failed! Participants are no longer in the turn queue.', 'combat.sync.failedIncapacitated': 'Sync failed! {names} cannot participate.', 'capacity.stomach': 'Stomach', 'capacity.womb': 'Womb', 'capacity.balls': 'Balls',
          'party.stats': 'Stats', 'party.you': 'You', 'party.ally': 'Ally', 'party.leader': 'Leader', 'party.levelSpecies': 'Level {level} {species}', 'party.punishment': 'Punishment', 'party.pleasure': 'Pleasure', 'party.combat': 'Combat', 'party.attributes': 'Attributes', 'party.capacity': 'Capacity', 'party.equipment': 'Equipment', 'party.perks': 'Perks', 'party.none': 'None', 'character.xp': 'XP: {xp}/{xpToNext}', 'character.combatStats': 'Combat Stats', 'character.body': 'Body', 'character.size': 'Size', 'character.appetite': 'Appetite', 'character.parts': 'Parts', 'character.chest': 'Chest', 'character.bodyParts': 'Body', 'character.perkTools': 'Perk Tools', 'character.perkToolsHelp': 'Balance/debug controls.', 'party.makeLeader': 'Make Leader', 'party.role': 'Role', 'party.aiOrder': 'AI Order', 'party.role.companion': 'Companion', 'party.role.scout': 'Scout', 'party.role.guard': 'Guard', 'party.role.support': 'Support', 'party.role.gatherer': 'Gatherer', 'party.roleDescription.companion': 'No special exploration role.', 'party.roleDescription.scout': 'Improves night visibility and route awareness.', 'party.roleDescription.guard': 'Reduces ambush advantage and helps protect camp.', 'party.roleDescription.support': 'Improves recovery when resting somewhere safe.', 'party.roleDescription.gatherer': 'Improves search and foraging results.', 'party.aiOrder.aggressive': 'Aggressive', 'party.aiOrder.defensive': 'Defensive', 'party.aiOrder.healer': 'Healer', 'party.aiOrder.scavenger': 'Scavenger', 'party.aiOrder.passive': 'Passive', 'party.aiOrderDescription.aggressive': 'Prioritizes attacking reachable threats.', 'party.aiOrderDescription.defensive': 'Favors safer positioning and protecting allies.', 'party.aiOrderDescription.healer': 'Feeds the most wounded ally first.', 'party.aiOrderDescription.scavenger': 'Looks for corpse-feast opportunities after victory.', 'party.aiOrderDescription.passive': 'Avoids acting unless wounded or pressured.', 'party.dismiss': 'Dismiss', 'party.statsFor': 'Show stats for {name}', 'party.makeLeaderFor': 'Make {name} party leader', 'party.dragToReorder': 'Drag {name} to reorder', 'party.moveUp': 'Move {name} up', 'party.moveDown': 'Move {name} down', 'party.dismissFor': 'Dismiss {name}', 'party.confirmDismiss': 'Dismiss {name} from the party?', 'party.dismissed': '{name} leaves the party.', 'party.dismissedNearby': '{name} leaves the party and remains nearby.', 'party.roleSet': '{name} is assigned as {role}.', 'party.aiOrderSet': '{name} will act {order}.', 'party.leaderSet': '{name} is now party leader.', 'party.positionChanged': '{name} changes party position.', 'party.roleFor': 'Party role for {name}', 'party.aiOrderFor': 'AI order for {name}',
          'save.title': 'Save Slots', 'save.newTitle': 'Choose New Game Slot', 'save.description': 'Auto-save is always on. Empty slots start a new game; occupied slots can load, start a new run, save over, or delete only that slot.', 'save.newDescription': 'Pick an empty slot for the new run, or deliberately overwrite an occupied slot.',
          'save.toolbarNew': 'New Game', 'save.toolbarHint': 'Choose a slot next; occupied slots warn before overwrite.', 'save.slotLabel': 'Slot {number}', 'save.savedGame': 'Saved game', 'save.openSlot': 'Open slot', 'save.empty': 'Empty', 'save.useEmpty': 'Use Empty Slot', 'save.overwriteSlot': 'Overwrite Slot',
          'save.newRun': 'New Run', 'save.load': 'Load', 'save.save': 'Save', 'save.delete': 'Delete', 'save.close': 'Close', 'save.action.newGame': 'Choose a slot for a new game', 'save.action.useEmpty': 'Start new game in {slot}', 'save.action.overwrite': 'Overwrite {slot} with a new game', 'save.action.newRun': 'Start a new run in {slot}', 'save.action.load': 'Load {slot}', 'save.action.save': 'Save current game to {slot}', 'save.action.delete': 'Delete {slot}',
          'settings.confirmClearAllData': 'WARNING: This will delete ALL saves, modules, and game data. This cannot be undone. Are you sure?', 'settings.clearAllDataDone': 'All data cleared. Refresh the page to start fresh.',
          'save.confirm.newGameOverwrite': 'Start a new game in {slot}? This will overwrite that save slot. This cannot be undone.', 'save.confirm.manualOverwrite': 'Overwrite {slot} with the current game? This cannot be undone.', 'save.confirm.deleteSlot': 'Delete save slot {slot}? This permanently removes only this slot and cannot be undone.', 'save.confirmDeleteAll': 'Delete ALL save data? This cannot be undone!', 'save.error.noGame': 'No game to save!', 'save.error.noSave': 'No save in {slot}', 'save.success.saved': 'Game saved to {slot}!', 'save.success.deletedAll': 'All saves deleted.', 'save.error.saveFailed': 'Save failed: {message}', 'save.error.loadFailed': 'Load failed: {message}', 'save.error.deleteFailed': 'Delete failed: {message}', 'save.error.deleteAllFailed': 'Delete saves failed: {message}', 'save.recovery.prompt': 'Save data is incompatible or corrupted. Options:\n\n1 = Delete save\n2 = Download backup (as base64)\n3 = Cancel\n\nEnter 1, 2, or 3:', 'save.recovery.deleted': 'Save deleted.', 'save.recovery.backupDownloaded': 'Backup downloaded. Save remains intact.',
          'target.actors': 'Actors', 'target.targets': 'Targets', 'target.act': 'Act', 'target.mark': 'Target', 'target.selectActorFor': 'Select {name} to act', 'target.markFor': 'Mark {name} as target', 'target.selectAs': 'Select {name} as {action} target', 'target.cannotSelectAs': 'Cannot select {name} as {action} target', 'target.selectedSummary': 'Selected exploration targets', 'target.chooseOneActor': 'Choose one actor for multi-target {action} actions, or one target for group {action} actions.', 'target.cannotHandleMultiple': '{name} cannot handle {count} targets with {action} yet.', 'target.multiActionDone': '{name} finishes a multi-target {action} action on {targets}.', 'target.multiActionNone': '{name} finds no valid targets for multi-target {action}.', 'target.skippedFullTargets': 'Skipped full targets: {targets}.', 'target.clear': 'Clear', 'target.count': '{count} target', 'target.count_plural': '{count} targets', 'target.clearSelected': 'Clear selected targets', 'group.feed.selfBlocked': '{name} cannot feed into themself yet.', 'group.feed.playerBlocked': '{name} cannot be handed off as prey right now.', 'group.feed.partyToConsumer': '{prey} is fed to {consumer} and settles in their stomach.', 'group.feed.helpers': '{helpers} help feed {prey} to {target}.', 'group.feed.tend': '{actors} tend {target}, restoring {amount} punishment.', 'group.feed.tendTogether': '{actors} tend {target} together, restoring {amount} punishment.', 'group.feed.creature': '{actors} feed {target}, restoring {amount} punishment.', 'group.fight.roughCollapse': '{name} collapses from the rough play.', 'group.fight.pinned': 'They are pinned but not seriously hurt.', 'group.fight.sparTogether': '{actors} spar together, each taking {amount} punishment.', 'group.fight.playFight': '{actors} play-fight {target} for {amount} punishment.', 'group.fight.collapses': '{target} collapses.', 'group.feast.noHelpers': '{target} cannot be split without helpers.', 'group.feast.split': '{actors} split {target} into chewable portions.', 'group.feast.selfBlocked': '{target} cannot feast on themself. Select other party members as actors to consume this target, or select {target} alone to feast on another target.', 'group.feast.tooStrong': '{target} is too large or strong for {actors} to consume.', 'group.feast.swallow': '{helpers} help {primary} swallow {target}.', 'group.social.share': '{actors} share {action} with {target}. Pleasure spreads through the group; {target} rises to {current}/{max}.', 'group.social.focus': '{actors} focus on {target}. Pleasure rises to {current}/{max}.', 'group.social.resists': "{target} resists the group's attention."
        },
        es: {
          'action.fight': 'Luchar', 'action.flirt': 'Coquetear', 'action.fuck': 'Seducir', 'action.feast': 'Devorar', 'action.feed': 'Alimentar', 'action.flee': 'Huir', 'action.moveRow': 'Mover fila', 'action.sync': 'Sincronizar', 'action.skip': 'Saltar', 'action.interact': 'Interactuar', 'action.stats': 'Estadisticas', 'action.inspect': 'Inspeccionar', 'action.recruit': 'Reclutar', 'action.acceptQuest': 'Aceptar mision', 'action.viewQuest': 'Ver mision', 'action.trade': 'Comerciar', 'action.acceptQuestFrom': 'Aceptar mision de {name}', 'action.viewQuestFrom': 'Ver mision de {name}', 'action.tradeWith': 'Comerciar con {name}', 'action.loot': 'Saquear', 'action.scavenge': 'Rebuscar',
          'inventory.use': 'Usar', 'inventory.equip': 'Equipar', 'inventory.drop': 'Soltar', 'inventory.unequip': 'Desequipar', 'inventory.back': 'Volver', 'inventory.useItem': 'Usar {name}', 'inventory.equipItem': 'Equipar {name}', 'inventory.dropItem': 'Soltar {name}', 'inventory.unequipSlot': 'Desequipar {slot}', 'inventory.full': 'El inventario esta lleno.', 'inventory.empty': 'Vacio.', 'inventory.noItemsMatch': 'No hay articulos que coincidan con el filtro actual.', 'inventory.titleWithCount': 'Inventario ({count}/{max})', 'inventory.equippedSection': 'Equipado', 'inventory.equipped': 'Equipaste {name}.', 'inventory.unequipped': 'Desequipaste {name}.', 'inventory.noEquipment': 'Sin equipo', 'inventory.noBonus': 'Sin bonificacion', 'inventory.effect': 'Efecto',
          'item.category': 'Categoria', 'item.category.all': 'Todos', 'item.category.consumable': 'Consumible', 'item.category.equipment': 'Equipo', 'item.category.valuable': 'Valioso', 'item.category.material': 'Material', 'item.category.misc': 'Varios', 'item.sort': 'Ordenar', 'item.sort.name': 'Nombre', 'item.sort.type': 'Tipo', 'item.sort.valueDesc': 'Valor ↓', 'item.sort.valueAsc': 'Valor ↑',
          'trade.title': 'Comercio con {name}', 'trade.gold': 'Oro: {gold}', 'trade.buy': 'Comprar', 'trade.sell': 'Vender', 'trade.buyItem': 'Comprar {name}', 'trade.sellItem': 'Vender {name}', 'trade.needGold': 'Necesitas {price} de oro para comprar {name}.', 'trade.confirmBuy': 'Comprar {name} por {price} de oro?', 'trade.purchaseCancelled': 'Compra cancelada: {name}.', 'trade.bought': 'Compraste {name} por {price} de oro.', 'trade.sold': 'Vendiste {name} por {price} de oro.', 'trade.noStockMatches': 'No hay existencias que coincidan con el filtro actual.', 'trade.noItemsToSell': 'No hay articulos para vender.', 'trade.noInventoryMatches': 'No hay articulos de inventario que coincidan con el filtro actual.',
          'quest.title': 'Misiones', 'quest.status': 'Estado', 'quest.sort': 'Ordenar', 'quest.filter.all': 'Todas', 'quest.filter.active': 'Activas', 'quest.filter.turnIn': 'Entregar', 'quest.filter.completed': 'Completadas', 'quest.sort.status': 'Estado', 'quest.sort.title': 'Titulo', 'quest.showOnMap': 'Mostrar en mapa', 'quest.showTurnIn': 'Mostrar entrega', 'quest.turnIn': 'Entregar', 'quest.showOnMapFor': 'Mostrar {name} en mapa', 'quest.showTurnInFor': 'Mostrar entrega de {name}', 'quest.turnInQuest': 'Entregar {name}', 'quest.noneActive': 'No hay misiones activas.', 'quest.noneMatchFilter': 'No hay misiones que coincidan con el filtro actual.', 'quest.alreadyInLog': '{title} ya esta en tu registro de misiones.', 'quest.accepted': 'Mision aceptada: {title}.', 'quest.completed': 'Mision completada: {title}.', 'quest.completedTurnIn': 'Mision completada: {title}. Vuelve con {giver} para recibir tu recompensa.', 'quest.defaultGiver': 'quien dio la mision', 'quest.notReadyTurnIn': 'Esa mision aun no esta lista para entregar.', 'quest.alreadyTurnedIn': '{title} ya fue entregada.', 'quest.turnedIn': 'Mision entregada: {title}.', 'quest.noObjectiveMarker': 'No hay marcador de mapa disponible para ese objetivo de mision.', 'quest.mapFocusedObjective': 'Mapa enfocado en {title}: {label}.', 'quest.noTurnInLocation': 'No hay ubicacion de entrega disponible para esa mision.', 'quest.mapFocusedTurnIn': 'Mapa enfocado en entrega de {title}: {label}.',
          'perk.choose': 'Elegir mejora', 'perk.chooseCount': 'Elegir mejora ({count})', 'perk.pending': 'Opciones pendientes: {count}', 'perk.trees': 'Arboles de mejoras', 'perk.filter.all': 'Todas', 'perk.chooseNamed': 'Elegir {name}', 'perk.back': 'Volver', 'perk.respec': 'Reiniciar mejoras', 'perk.debugGrant': 'Debug +1 opcion de mejora', 'perk.closeStats': 'Cerrar', 'perk.levelUp': 'Subiste de nivel! Ahora eres nivel {level}. Todas las estadisticas aumentaron!', 'perk.chooseNew': 'Elige una nueva mejora del arbol de mejoras.', 'perk.notAvailable': 'Esa mejora aun no esta disponible.', 'perk.chosen': 'Mejora elegida: {name}. {description}', 'perk.noneToRespec': 'No hay mejoras seleccionadas para reiniciar.', 'perk.confirmRespec': 'Reiniciar mejoras seleccionadas y reembolsar sus opciones?', 'perk.respecDoneOne': 'Mejoras reiniciadas. Se reembolso {count} opcion.', 'perk.respecDoneMany': 'Mejoras reiniciadas. Se reembolsaron {count} opciones.',
          'ui.close': 'Cerrar', 'ui.cancel': 'Cancelar', 'ui.actionLegend': 'Leyenda de acciones', 'ui.menu.newGame': 'Nueva partida', 'ui.menu.newGameTitle': 'Iniciar una partida nueva', 'ui.log.search': 'Buscar registro', 'settings.title': 'Ajustes', 'settings.interfaceLanguage': 'Idioma de interfaz', 'ui.creatureActions': 'Acciones de criatura', 'ui.partyActions': 'Acciones del grupo', 'ui.exploration': 'Exploracion', 'ui.chooseAction': 'Elige tu proxima accion.', 'ui.area': 'Area', 'ui.enemies': 'Enemigos', 'ui.creatures': 'Criaturas', 'ui.noCreaturesPresent': 'No hay criaturas presentes', 'ui.noCreaturesHere': 'No hay criaturas aqui', 'target.chooseFromPanel': 'Selecciona un objetivo desde el panel de criaturas.', 'target.cancelAction': 'Cancelar {action}', 'log.movedTo': 'Movimiento a {x}, {y} ({biome})', 'log.inCombatCannotMove': 'Estas en combate! Usa Huir para escapar.', 'log.discoveredLandmark': 'Descubriste {name}!', 'log.restUnavailable': 'No hay un lugar seguro para descansar aqui.', 'log.rested': 'Descansaste y te recuperaste.', 'log.noEntriesMatchFilter': 'No hay entradas de registro que coincidan con el filtro actual.', 'recruit.partyFull': 'El grupo esta lleno! No se puede reclutar a {name}', 'recruit.notReady': '{name} aun no esta listo para unirse al grupo.', 'recruit.joined': '{name} se une a tu grupo!', 'recruit.confirmSubmissive': '{name} esta sumiso. Reclutarlo para tu grupo?', 'feed.optionsTitle': 'Opciones de alimentacion', 'feed.noOptions': 'No hay opciones de alimentacion disponibles ahora.', 'feed.noWoundedAllies': 'No hay aliados heridos para alimentar.', 'feed.noWillingLivestock': 'No hay ganado dispuesto para sacrificar.', 'feed.noForceFeedEnemies': 'No hay enemigos para forzar alimentacion.', 'feed.noValidTarget': 'No hay objetivo valido para esta accion de alimentar.',
          'disposition.hostile': 'Hostil', 'disposition.friendly': 'Amistoso', 'disposition.neutral': 'Neutral', 'disposition.quest': 'Mision', 'disposition.merchant': 'Mercader', 'disposition.remains': 'Restos', 'combat.row': 'Fila', 'combat.row.front': 'Frente', 'combat.row.back': 'Retaguardia', 'combat.group': 'Grupo', 'combat.turnOrder': 'Orden de turno', 'combat.status.current': '{name} es el actor de combate actual en el turno {order}.', 'combat.status.queued': '{name} esta en cola para el turno {order}.', 'combat.status.queuedActed': '{name} esta en cola para el turno {order} y ya actuo esta ronda.', 'combat.status.syncParticipant': '{name} participa en el grupo {action} en cola que se resolvera en el turno {order}.', 'combat.status.syncTarget': '{name} es objetivo del grupo {action} en cola que se resolvera en el turno {order}.', 'combat.status.canTarget': '{name} puede seleccionarse como objetivo de {action}.', 'combat.status.cannotTarget': '{name} no puede seleccionarse como objetivo de {action}.', 'combat.status.choosingTarget': '{name} esta eligiendo un objetivo de {action}.', 'combat.moveRowLog': '{name} se mueve a la fila {row}.', 'combat.cannotReachTarget': '{actor} no puede alcanzar a {target} desde aqui.', 'combat.flee.noEnemies': 'No hay enemigos de los que huir!', 'combat.flee.success': 'Huyes con exito!', 'combat.flee.failed': 'Huida fallida! {name} te intercepta!', 'combat.godModeSaved': 'El modo dios te salvo de la derrota!', 'combat.playerFallen': 'Has caido! Fin de la partida!', 'combat.hardcoreSaveDeleted': 'MODO EXTREMO: Tu partida guardada fue borrada.', 'combat.playerKnockedOut': 'Has quedado fuera de combate! Tu grupo debe terminar la pelea...', 'combat.partyWipedOut': 'Tu grupo fue derrotado por completo!', 'combat.alliesContinue': 'Tus aliados continuan la pelea...', 'combat.playerComesTo': '{name} despierta despues de la pelea.', 'combat.victory': 'Victoria! Los enemigos fueron derrotados o sometidos.', 'combat.escapedEncounter': 'Escapaste del encuentro.', 'combat.defeat': 'Derrota...', 'combat.confirmReturnToMenu': 'Derrota! Volver al menu?', 'combat.notInCombat': 'No estas en combate!', 'combat.waitForTurn': 'Espera tu turno!', 'combat.notYourTurn': 'No es tu turno!', 'combat.sync.chooseAction': 'Elegir accion sincronizada', 'combat.sync.noAllies': 'No hay aliados disponibles para sincronizar.', 'combat.sync.action.fuck': 'Seduccion grupal', 'combat.sync.action.flirt': 'Coqueteo grupal', 'combat.sync.action.fight': 'Ataque grupal', 'combat.sync.action.feed': 'Alimentacion grupal', 'combat.sync.selectParticipants': 'Seleccionar participantes para sincronizar', 'combat.sync.selectParticipantFor': 'Seleccionar {name} para sincronizar', 'combat.sync.confirmParticipants': 'Confirmar participantes', 'combat.sync.needParticipants': 'Necesitas al menos 2 participantes para una accion sincronizada.', 'combat.sync.selectTarget': 'Seleccionar objetivo sincronizado', 'combat.sync.selectTargetFor': 'Seleccionar {name} como objetivo sincronizado', 'combat.sync.failedNoQueue': 'Sincronizacion fallida! Los participantes ya no estan en la cola de turnos.', 'combat.sync.failedIncapacitated': 'Sincronizacion fallida! {names} no puede participar.', 'capacity.stomach': 'Estomago', 'capacity.womb': 'Vientre', 'capacity.balls': 'Bolas',
          'party.stats': 'Estadisticas', 'party.you': 'Tu', 'party.ally': 'Aliado', 'party.leader': 'Lider', 'party.levelSpecies': 'Nivel {level} {species}', 'party.punishment': 'Castigo', 'party.pleasure': 'Placer', 'party.combat': 'Combate', 'party.attributes': 'Atributos', 'party.capacity': 'Capacidad', 'party.equipment': 'Equipo', 'party.perks': 'Mejoras', 'party.none': 'Ninguno', 'character.xp': 'XP: {xp}/{xpToNext}', 'character.combatStats': 'Estadisticas de combate', 'character.body': 'Cuerpo', 'character.size': 'Tamano', 'character.appetite': 'Apetito', 'character.parts': 'Partes', 'character.chest': 'Pecho', 'character.bodyParts': 'Cuerpo', 'character.perkTools': 'Herramientas de mejoras', 'character.perkToolsHelp': 'Controles de balance/debug.', 'party.makeLeader': 'Hacer lider', 'party.role': 'Rol', 'party.aiOrder': 'Orden IA', 'party.role.companion': 'Companero', 'party.role.scout': 'Explorador', 'party.role.guard': 'Guardia', 'party.role.support': 'Apoyo', 'party.role.gatherer': 'Recolector', 'party.roleDescription.companion': 'Sin rol especial de exploracion.', 'party.roleDescription.scout': 'Mejora la visibilidad nocturna y la lectura de rutas.', 'party.roleDescription.guard': 'Reduce la ventaja de emboscadas y ayuda a proteger el campamento.', 'party.roleDescription.support': 'Mejora la recuperacion al descansar en un lugar seguro.', 'party.roleDescription.gatherer': 'Mejora resultados de busqueda y recoleccion.', 'party.aiOrder.aggressive': 'Agresivo', 'party.aiOrder.defensive': 'Defensivo', 'party.aiOrder.healer': 'Sanador', 'party.aiOrder.scavenger': 'Carronero', 'party.aiOrder.passive': 'Pasivo', 'party.aiOrderDescription.aggressive': 'Prioriza atacar amenazas alcanzables.', 'party.aiOrderDescription.defensive': 'Prefiere posicionarse con cuidado y proteger aliados.', 'party.aiOrderDescription.healer': 'Alimenta primero al aliado mas herido.', 'party.aiOrderDescription.scavenger': 'Busca oportunidades con restos despues de la victoria.', 'party.aiOrderDescription.passive': 'Evita actuar salvo si esta herido o bajo presion.', 'party.dismiss': 'Despedir', 'party.statsFor': 'Mostrar estadisticas de {name}', 'party.makeLeaderFor': 'Hacer lider a {name}', 'party.dragToReorder': 'Arrastrar {name} para reordenar', 'party.moveUp': 'Mover {name} arriba', 'party.moveDown': 'Mover {name} abajo', 'party.dismissFor': 'Despedir a {name}', 'party.confirmDismiss': 'Despedir a {name} del grupo?', 'party.dismissed': '{name} deja el grupo.', 'party.dismissedNearby': '{name} deja el grupo y permanece cerca.', 'party.roleSet': '{name} queda asignado como {role}.', 'party.aiOrderSet': '{name} actuara en modo {order}.', 'party.leaderSet': '{name} ahora lidera el grupo.', 'party.positionChanged': '{name} cambia de posicion en el grupo.', 'party.roleFor': 'Rol de grupo para {name}', 'party.aiOrderFor': 'Orden IA para {name}',
          'save.title': 'Partidas', 'save.newTitle': 'Elegir slot de partida nueva', 'save.description': 'El autoguardado siempre esta activo. Los slots vacios empiezan una partida nueva; los ocupados pueden cargar, iniciar una nueva partida, guardar encima o borrar solo ese slot.', 'save.newDescription': 'Elige un slot vacio para la nueva partida, o sobrescribe deliberadamente un slot ocupado.',
          'save.toolbarNew': 'Nueva partida', 'save.toolbarHint': 'Elige un slot despues; los slots ocupados avisan antes de sobrescribir.', 'save.slotLabel': 'Slot {number}', 'save.savedGame': 'Partida guardada', 'save.openSlot': 'Slot abierto', 'save.empty': 'Vacio', 'save.useEmpty': 'Usar slot vacio', 'save.overwriteSlot': 'Sobrescribir slot',
          'save.newRun': 'Nueva partida', 'save.load': 'Cargar', 'save.save': 'Guardar', 'save.delete': 'Borrar', 'save.close': 'Cerrar', 'save.action.newGame': 'Elegir un slot para una partida nueva', 'save.action.useEmpty': 'Iniciar partida nueva en {slot}', 'save.action.overwrite': 'Sobrescribir {slot} con una partida nueva', 'save.action.newRun': 'Iniciar una nueva partida en {slot}', 'save.action.load': 'Cargar {slot}', 'save.action.save': 'Guardar partida actual en {slot}', 'save.action.delete': 'Borrar {slot}',
          'settings.confirmClearAllData': 'ADVERTENCIA: Esto borrara todas las partidas, modulos y datos del juego. Esta accion no se puede deshacer. Continuar?', 'settings.clearAllDataDone': 'Todos los datos fueron borrados. Actualiza la pagina para empezar de nuevo.',
          'save.confirm.newGameOverwrite': 'Iniciar partida nueva en {slot}? Esto sobrescribira ese slot. Esta accion no se puede deshacer.', 'save.confirm.manualOverwrite': 'Sobrescribir {slot} con la partida actual? Esta accion no se puede deshacer.', 'save.confirm.deleteSlot': 'Borrar el slot {slot}? Esto elimina permanentemente solo este slot y no se puede deshacer.', 'save.confirmDeleteAll': 'Borrar TODOS los datos de partidas? Esta accion no se puede deshacer!', 'save.error.noGame': 'No hay partida para guardar!', 'save.error.noSave': 'No hay partida en {slot}', 'save.success.saved': 'Partida guardada en {slot}!', 'save.success.deletedAll': 'Todas las partidas fueron borradas.', 'save.error.saveFailed': 'Error al guardar: {message}', 'save.error.loadFailed': 'Error al cargar: {message}', 'save.error.deleteFailed': 'Error al borrar: {message}', 'save.error.deleteAllFailed': 'Error al borrar partidas: {message}', 'save.recovery.prompt': 'Los datos de la partida son incompatibles o estan corruptos. Opciones:\n\n1 = Borrar partida\n2 = Descargar respaldo (base64)\n3 = Cancelar\n\nIngresa 1, 2 o 3:', 'save.recovery.deleted': 'Partida borrada.', 'save.recovery.backupDownloaded': 'Respaldo descargado. La partida queda intacta.',
          'target.actors': 'Actores', 'target.targets': 'Objetivos', 'target.act': 'Actuar', 'target.mark': 'Objetivo', 'target.selectActorFor': 'Seleccionar {name} para actuar', 'target.markFor': 'Marcar {name} como objetivo', 'target.selectAs': 'Seleccionar {name} como objetivo de {action}', 'target.cannotSelectAs': 'No se puede seleccionar {name} como objetivo de {action}', 'target.selectedSummary': 'Objetivos de exploracion seleccionados', 'target.chooseOneActor': 'Elige un actor para acciones multiobjetivo de {action}, o un objetivo para acciones grupales de {action}.', 'target.cannotHandleMultiple': '{name} no puede manejar {count} objetivos con {action} todavia.', 'target.multiActionDone': '{name} termina una accion multiobjetivo de {action} sobre {targets}.', 'target.multiActionNone': '{name} no encuentra objetivos validos para multiobjetivo de {action}.', 'target.skippedFullTargets': 'Objetivos llenos omitidos: {targets}.', 'target.clear': 'Limpiar', 'target.count': '{count} objetivo', 'target.count_plural': '{count} objetivos', 'target.clearSelected': 'Limpiar objetivos', 'group.feed.selfBlocked': '{name} no puede alimentarse a si mismo todavia.', 'group.feed.playerBlocked': '{name} no puede ser entregado como presa ahora.', 'group.feed.partyToConsumer': '{prey} es alimentado a {consumer} y queda en su estomago.', 'group.feed.helpers': '{helpers} ayudan a alimentar {prey} a {target}.', 'group.feed.tend': '{actors} atienden a {target}, restaurando {amount} de castigo.', 'group.feed.tendTogether': '{actors} atienden juntos a {target}, restaurando {amount} de castigo.', 'group.feed.creature': '{actors} alimentan a {target}, restaurando {amount} de castigo.', 'group.fight.roughCollapse': '{name} cae por el juego brusco.', 'group.fight.pinned': 'Quedan inmovilizados sin heridas serias.', 'group.fight.sparTogether': '{actors} practican combate juntos, cada uno recibe {amount} de castigo.', 'group.fight.playFight': '{actors} juegan a pelear con {target} por {amount} de castigo.', 'group.fight.collapses': '{target} cae.', 'group.feast.noHelpers': '{target} no puede dividirse sin ayudantes.', 'group.feast.split': '{actors} dividen a {target} en porciones masticables.', 'group.feast.selfBlocked': '{target} no puede devorarse a si mismo. Selecciona otros miembros del grupo como actores para consumir este objetivo, o selecciona solo a {target} para devorar otro objetivo.', 'group.feast.tooStrong': '{target} es demasiado grande o fuerte para que {actors} lo consuman.', 'group.feast.swallow': '{helpers} ayudan a {primary} a tragar a {target}.', 'group.social.share': '{actors} comparten {action} con {target}. El placer se extiende por el grupo; {target} sube a {current}/{max}.', 'group.social.focus': '{actors} se enfocan en {target}. El placer sube a {current}/{max}.', 'group.social.resists': '{target} resiste la atencion del grupo.'
        }
      },
      setPreference(key, value) { this.preferences[key] = value; },
      setMaxTier(value) { this.preferences.maxTier = value; },
      setLanguage(value) { this.preferences.language = this.locales[value] ? value : 'en'; },
      t(key, vars = {}) {
        const table = this.locales[this.preferences.language] || this.locales.en;
        let text = table[key] || this.locales.en[key] || key;
        return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
      },
      biomeIntro: () => '',
      encounter: () => '',
      actionResult: (action, ctx = {}) => `${action}:${ctx.target || ''}:${ctx.item || ''}`
    },
    options.binary || { saveGame: () => new Uint8Array(), loadGame: () => ({}) },
    moduleSystem,
    { open() {}, deleteDatabase() { return {}; } },
    message => { confirmations.push(message); return Boolean(options.confirm); },
    message => { prompts.push(message); return options.prompt ?? null; },
    message => alerts.push(message),
    fn => fn(),
    math
  );
  App.renderLog = App.renderLog.bind(App);
  App.renderParty = App.renderParty.bind(App);
  App.renderCreatures = App.renderCreatures.bind(App);
  App.showExplorationActions = function() {};
  App.autoSave = async function() {};
  return { App, elements, hooks, storage, alerts, confirmations, prompts, body, document, listeners };
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

test('Static shell localization updates text and accessibility attributes', () => {
  const textEl = makeElement();
  textEl.textContent = 'New Game';
  textEl.setAttribute('data-i18n', 'ui.menu.newGame');
  const titleEl = makeElement();
  titleEl.setAttribute('title', 'Start a new game');
  titleEl.setAttribute('data-i18n-title', 'ui.menu.newGameTitle');
  const ariaEl = makeElement();
  ariaEl.setAttribute('aria-label', 'Interface language');
  ariaEl.setAttribute('data-i18n-aria-label', 'settings.interfaceLanguage');
  const placeholderEl = makeElement();
  placeholderEl.setAttribute('placeholder', 'Search log');
  placeholderEl.setAttribute('data-i18n-placeholder', 'ui.log.search');
  const localized = {
    '[data-i18n]': [textEl],
    '[data-i18n-title]': [titleEl],
    '[data-i18n-aria-label]': [ariaEl],
    '[data-i18n-placeholder]': [placeholderEl]
  };
  const { App } = loadAppForCombat(() => 0.5, {
    querySelectorAll: selector => localized[selector] || []
  });
  App.updateLanguage('es');
  assertEqual(textEl.textContent, 'Nueva partida', 'Static text should localize on language change');
  assertEqual(titleEl.getAttribute('title'), 'Iniciar una partida nueva', 'Static title should localize on language change');
  assertEqual(ariaEl.getAttribute('aria-label'), 'Idioma de interfaz', 'Static aria-label should localize on language change');
  assertEqual(placeholderEl.getAttribute('placeholder'), 'Buscar registro', 'Static placeholder should localize on language change');
  assertContains(App._actionLegend(['fight', 'feed']), 'aria-label="Leyenda de acciones"', 'Action legend label should localize');
});

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
  App.updateLanguage('es');
  App.attemptFlee();
  assertEqual(App.combatState.active, false, 'Flee should end combat');
  assertEqual(player.xp, 0, 'Flee should not grant victory XP');
  assertContains(App.log[0].text, 'Huyes con exito!', 'Successful flee log should localize');
});

test('Flee failure and no-enemy feedback localize', () => {
  const empty = loadAppForCombat(() => 0);
  empty.App.player = makeUnit('You', { Flee: 10 });
  empty.App.party = [empty.App.player];
  empty.App.creatures = [];
  empty.App.updateLanguage('es');
  empty.App.attemptFlee();
  assertContains(empty.App.log[empty.App.log.length - 1].text, 'No hay enemigos de los que huir!', 'No-enemy flee log should localize');

  const failed = loadAppForCombat(() => 1);
  const player = makeUnit('You', { Flee: 1 });
  const enemy = makeUnit('Fast Enemy', { disposition: failed.App.DISPOSITION.ENEMY, spd: 50 });
  failed.App.player = player;
  failed.App.party = [player];
  failed.App.creatures = [enemy];
  failed.App.combatState.active = true;
  failed.App.nextTurn = function() { this._fleeFailedTurnEnded = true; };
  failed.App.updateLanguage('es');
  failed.App.attemptFlee();
  assertEqual(failed.App._fleeFailedTurnEnded, true, 'Failed flee should still advance the turn');
  assertContains(failed.App.log[failed.App.log.length - 1].text, 'Huida fallida! Fast Enemy te intercepta!', 'Failed flee log should localize');
});

test('Feed unavailable feedback localizes and does not throw without a selected target', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', lactating: false });
  App.player = player;
  App.party = [player];
  App.creatures = [];
  App.activeActor = player;
  App.nextTurn = function() { this._feedUnavailableTurnEnded = true; };
  App.updateLanguage('es');
  App.executeFeedAction();
  assertEqual(App._feedUnavailableTurnEnded, true, 'Unavailable feed action should still advance the turn');
  assertContains(App.log[App.log.length - 1].text, 'No hay opciones de alimentacion disponibles ahora.', 'Unavailable feed log should localize');

  App._executeFeedSubAction('heal', player);
  assertContains(App.log[App.log.length - 1].text, 'No hay aliados heridos para alimentar.', 'No-wounded feed log should localize');
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

test('Sync failure and submissive recruit prompts localize', () => {
  const syncCase = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const ally = makeUnit('Ally');
  const enemy = makeUnit('Enemy', { disposition: syncCase.App.DISPOSITION.ENEMY });
  syncCase.App.player = player;
  syncCase.App.party = [player, ally];
  syncCase.App.creatures = [enemy];
  syncCase.App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [], syncActions: [] };
  syncCase.App._syncParticipants = [player, ally];
  syncCase.App.nextTurn = function() { this._syncFailedAdvanced = true; };
  syncCase.App.updateLanguage('es');
  syncCase.App.queueSyncAction('sync_fight', 0);
  assertEqual(syncCase.App._syncFailedAdvanced, true, 'Missing participant queue should still advance turn');
  assertContains(syncCase.App.log[syncCase.App.log.length - 1].text, 'Sincronizacion fallida! Los participantes ya no estan en la cola de turnos.', 'Missing queue sync failure should localize');

  const downed = loadAppForCombat(() => 0);
  const downedPlayer = makeUnit('You');
  const downedAlly = makeUnit('Downed Ally', { CPun: 0 });
  const downedEnemy = makeUnit('Enemy', { disposition: downed.App.DISPOSITION.ENEMY });
  downed.App.player = downedPlayer;
  downed.App.party = [downedPlayer, downedAlly];
  downed.App.creatures = [downedEnemy];
  downed.App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [], syncActions: [] };
  downed.App.nextTurn = function() { this._incapacitatedFailedAdvanced = true; };
  downed.App.updateLanguage('es');
  downed.App._resolveSyncAction({ type: 'sync_fight', participants: [downedPlayer, downedAlly], target: downedEnemy, resolved: false, round: 1 });
  assertEqual(downed.App._incapacitatedFailedAdvanced, true, 'Incapacitated sync failure should still advance turn');
  assertContains(downed.App.log[downed.App.log.length - 1].text, 'Sincronizacion fallida! Downed Ally no puede participar.', 'Incapacitated sync failure should localize');

  const recruitCase = loadAppForCombat(() => 0, { confirm: false });
  const seducer = makeUnit('You', { Fuck: 80, Flir: 80 });
  const target = makeUnit('Mouse', { disposition: recruitCase.App.DISPOSITION.ENEMY, CPle: 79, MPle: 100, wis: 1 });
  recruitCase.App.player = seducer;
  recruitCase.App.party = [seducer];
  recruitCase.App.creatures = [target];
  recruitCase.App.combatState.active = true;
  recruitCase.App.nextTurn = function() {};
  recruitCase.App.updateLanguage('es');
  recruitCase.App.executeActionAgainstTarget('fuck', seducer, target);
  assertContains(recruitCase.confirmations[0], 'Mouse esta sumiso. Reclutarlo para tu grupo?', 'Submissive recruitment confirmation should localize');
});

test('Sync action menus localize visible and accessible labels', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'sync-player' });
  const ally = makeUnit('Ally', { id: 'sync-ally' });
  const enemy = makeUnit('Enemy', { id: 'sync-enemy', disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.updateLanguage('es');
  App.showSyncMenu();
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Elegir accion sincronizada', 'Sync action heading should localize');
  assertContains(html, 'aria-label="Ataque grupal"', 'Sync fight action should expose localized accessible label');
  assertContains(html, '>Cancelar<', 'Sync menu cancel action should localize');

  App.selectSyncParticipants('sync_fight');
  html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Seleccionar participantes para sincronizar', 'Sync participant heading should localize');
  assertContains(html, 'aria-label="Seleccionar Ally para sincronizar"', 'Sync participant card should expose localized accessible label');
  assertContains(html, '>Confirmar participantes<', 'Sync participant confirmation should localize');
  assertContains(html, '>Volver<', 'Sync participant back action should localize');

  App._syncSelected = [0, 1];
  App.confirmSyncParticipants('sync_fight');
  html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Seleccionar objetivo sincronizado', 'Sync target heading should localize');
  assertContains(html, 'aria-label="Seleccionar Enemy como objetivo sincronizado"', 'Sync target card should expose localized accessible label');
  assertContains(html, 'Castigo: 100/100', 'Sync target stat label should localize');
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
  App.updateLanguage('es');
  App.enemyTurn(enemy);
  assertEqual(player.CPun, 0, 'Softcore KO should set player HP to 0 during combat');
  assert(player.knockedOut, 'Softcore KO should mark player knockedOut');
  assert(App.combatState.active, 'Combat should continue when allies remain');
  assert(App._nextTurnCalled, 'Combat should advance after KO');
  assertContains(App.log.map(entry => entry.text).join('\n'), 'Has quedado fuera de combate! Tu grupo debe terminar la pelea...', 'Player KO feedback should localize');
  assertContains(App.log.map(entry => entry.text).join('\n'), 'Tus aliados continuan la pelea...', 'Ally continue feedback should localize');
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
  App.updateLanguage('es');
  App.executeAction('fight', 0);
  assertEqual(player.xp, App.XP_REWARDS.defeatEnemy, 'Defeat outcome should grant defeatEnemy reward');
  assertContains(App.log.map(entry => entry.text).join('\n'), 'Victoria! Los enemigos fueron derrotados o sometidos.', 'Victory feedback should localize');
});

test('Combat action guardrails and flee outcome feedback localize', () => {
  const { App } = loadAppForCombat(() => 0);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.updateLanguage('es');
  App.combatAction('fight');
  assertContains(App.log[App.log.length - 1].text, 'No estas en combate!', 'Not-in-combat guard should localize');

  App.combatState.active = true;
  App.combatState.processing = true;
  App.combatAction('fight');
  assertContains(App.log[App.log.length - 1].text, 'Espera tu turno!', 'Processing guard should localize');

  App.combatState.processing = false;
  App.combatState.turnQueue = [{ unit: makeUnit('Ally') }];
  App.combatState.currentTurn = 0;
  App.combatAction('fight');
  assertContains(App.log[App.log.length - 1].text, 'No es tu turno!', 'Wrong-turn guard should localize');

  App.endCombat('flee');
  assertContains(App.log[App.log.length - 1].text, 'Escapaste del encuentro.', 'Flee outcome feedback should localize');
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

test('Corpse card loot actions expose localized accessible labels', () => {
  const { App, elements } = loadAppForCombat();
  const corpse = makeUnit('Fallen', { id: 'fallen-1', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [corpse];
  App.updateLanguage('es');
  App.renderCreatures();
  const html = elements.get('enemies-content').innerHTML;
  assertContains(html, 'aria-label="Saquear Fallen"', 'Corpse loot action should expose localized accessible label');
  assertContains(html, 'aria-label="Rebuscar Fallen"', 'Corpse scavenge action should expose localized accessible label');
  assertContains(html, '>Saquear<', 'Corpse loot visible label should localize');
  assertContains(html, '>Rebuscar<', 'Corpse scavenge visible label should localize');
});

test('Looting a corpse can grant an item without starting combat', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { hunger: 50, gold: 0 });
  const corpse = makeUnit('Fallen', { id: 'loot-corpse', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  App.player = player;
  App.party = [player];
  App.creatures = [corpse];
  App.inventory = [];
  App.combatState.active = false;
  App.lootCorpse('loot-corpse');
  assertEqual(corpse.looted, true, 'Looted corpse should be marked');
  assertEqual(App.inventory.length, 1, 'Successful corpse loot should add one item');
  assertEqual(App.player.gold, 2, 'Corpse loot should grant generated gold');
  assertEqual(App.combatState.active, false, 'Corpse loot should not start combat');
  assertContains(App.log[App.log.length - 1].text, App.inventory[0].name, 'Loot log should mention found item');
  assertContains(App.log[App.log.length - 1].text, '2 gold', 'Loot log should mention found gold');
  App.lootCorpse('loot-corpse');
  assertEqual(App.player.gold, 2, 'Already-looted corpse should not grant gold twice');
});

test('Authored corpse loot can grant explicit gold without an item', () => {
  const { App } = loadAppForCombat(() => 0.9);
  const player = makeUnit('You', { gold: 1 });
  const corpse = makeUnit('Rich Corpse', { id: 'rich-corpse', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100, goldLoot: 12 });
  App.player = player;
  App.party = [player];
  App.creatures = [corpse];
  App.inventory = [];
  App.combatState.active = false;
  App.lootCorpse('rich-corpse');
  assertEqual(App.inventory.length, 0, 'High random roll should skip item loot');
  assertEqual(App.player.gold, 13, 'Authored corpse gold should be granted');
  assertContains(App.log[App.log.length - 1].text, '12 gold', 'Loot log should mention authored gold');
});

test('Authored loot tables can place equipment on corpses and structures', () => {
  const { App } = loadAppForCombat(() => 0);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.inventory = [];
  const corpse = makeUnit('Guard Corpse', { id: 'guard-corpse', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100, lootTable: 'armory' });
  App.creatures = [corpse];
  App.lootCorpse('guard-corpse');
  assertEqual(App.inventory[0].name, 'Hide Armor', 'Corpse loot table should grant authored equipment');

  App.inventory = [];
  App.location = { x: 0, y: 0 };
  const tile = { x: 0, y: 0, biome: 'forest', explored: true, description: 'A guarded camp.', structure: 'camp', structureLooted: false };
  App.worldMap = new Map([['0,0', tile]]);
  App.search();
  assertEqual(App.inventory[0].name, 'Hide Armor', 'Structure loot table should grant authored equipment through search');
  assertEqual(tile.structureLooted, true, 'Structure loot should be marked consumed after search');
});

test('Gatherer party role improves search find chance', () => {
  const { App } = loadAppForCombat(() => 0.35);
  const player = makeUnit('You');
  const gatherer = makeUnit('Forager', { id: 'gatherer-1', partyRole: 'gatherer' });
  App.player = player;
  App.party = [player, gatherer];
  App.inventory = [];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, description: 'quiet', creatures: [], structure: null }]]);
  App.search();
  assertEqual(App.inventory.length, 1, 'Gatherer role should raise search chance enough to find an item');
  assertContains(App.log[App.log.length - 1].text, 'You found a ', 'Search log should report the gatherer-assisted find');
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

test('Group attacking a timid social group resolves one shared flee reaction', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', xp: 0, xpToNext: 1000 });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  const target = makeUnit('Mouse A', { id: 'mouse-a', species: 'bunny', disposition: App.DISPOSITION.NEUTRAL, Flee: 20 });
  const bystander = makeUnit('Mouse B', { id: 'mouse-b', species: 'bunny', disposition: App.DISPOSITION.FRIENDLY, Flee: 20 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [target, bystander];
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [target, bystander] }]]);
  App.location = { x: 0, y: 0 };
  App.explorationActorIds = ['player-1', 'ally-1'];
  App.outsideActionForCreature('fight', 'mouse-a');
  const text = App.log[App.log.length - 1].text;
  assertEqual(App.creatures.length, 0, 'Shared group threat should still make the timid social group flee');
  assertEqual((text.match(/Mouse A panics/g) || []).length, 1, 'Target should only react once to a group attack');
  assertEqual((text.match(/Mouse B panics/g) || []).length, 1, 'Social bystander should only react once to a group attack');
  assertEqual(App.combatState.active, false, 'All-flee group reaction should not start combat');
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

test('Fallback interact menu localizes labels and keeps target indexes stable', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally <One>', { id: 'ally-1' });
  const friendly = makeUnit('Friendly <Two>', { id: 'friendly-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 90, willing: true });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [friendly];
  App.updateLanguage('es');

  App.showInteractMenu();
  const menuHtml = elements.get('scene-description').innerHTML;
  assertContains(menuHtml, 'Acciones de criatura', 'Fallback interact menu title should localize');
  assertContains(menuHtml, "showCreatureInteract('party', 0)", 'Ally card should use an ally-local index');
  assertContains(menuHtml, "showCreatureInteract('creature', 0)", 'Creature card should use a creature-local index after allies');
  assertContains(menuHtml, 'Ally &lt;One&gt;', 'Fallback menu should escape ally names');
  assertContains(menuHtml, 'Friendly &lt;Two&gt;', 'Fallback menu should escape creature names');
  assertContains(menuHtml, 'aria-label="Interactuar Friendly &lt;Two&gt;"', 'Creature card should expose a localized accessible label');
  assertContains(menuHtml, 'aria-label="Cancelar"', 'Fallback cancel button should expose a localized accessible label');

  App.showCreatureInteract('creature', 0);
  const actionHtml = elements.get('scene-description').innerHTML;
  assertContains(actionHtml, 'Friendly &lt;Two&gt;', 'Creature interaction heading should escape target names');
  assertContains(actionHtml, 'aria-label="Luchar Friendly &lt;Two&gt;"', 'Creature fight action should localize its accessible label');
  assertContains(actionHtml, '>🔥 Seducir<', 'Creature pleasure action should localize its visible label');
  assertContains(actionHtml, 'aria-label="Reclutar Friendly &lt;Two&gt;"', 'Recruit action should localize its accessible label');
  assertContains(actionHtml, 'aria-label="Volver"', 'Back button should expose a localized accessible label');
});

test('Combat context keeps non-enemy creature interaction in panels', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You');
  const ally = makeUnit('Ally', { id: 'ally-1' });
  const enemy = makeUnit('Enemy', { id: 'enemy-1', disposition: App.DISPOSITION.ENEMY });
  const neutral = makeUnit('Neutral', { id: 'neutral-1', disposition: App.DISPOSITION.NEUTRAL });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy, neutral];
  App.combatState.active = true;
  App.showActorActions(player);
  App.renderCreatures();
  const actionsHtml = elements.get('scene-actions').innerHTML;
  assertNotContains(actionsHtml, 'showInteractMenu', 'Combat action bar should not duplicate panel creature interactions');
  assertContains(actionsHtml, "selectTarget('fight')", 'Combat action bar should still expose enemy action targeting');
  assertContains(actionsHtml, 'App.executeFeedAction()', 'Combat action bar should still expose party feed action');
  assertContains(elements.get('enemies-content').innerHTML, "outsideActionForCreature('fight','neutral-1')", 'Neutral creature card should keep baseline interaction actions');
  App.selectTarget('fight');
  assertContains(elements.get('enemies-content').innerHTML, "executeActionOnTarget('fight','enemy-1')", 'Enemy card should keep combat target selection');
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

test('Exploration actor selection supports multiple party members', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const allyA = makeUnit('Ally A', { id: 'ally-a' });
  const allyB = makeUnit('Ally B', { id: 'ally-b' });
  App.player = player;
  App.party = [player, allyA, allyB];
  App.selectExplorationActor(1);
  App.selectExplorationActor(2);
  assertEqual(App._getExplorationActors().length, 2, 'Two selected allies should both be active exploration actors');
  App.renderParty();
  const html = elements.get('party-content').innerHTML;
  assertContains(html, 'Ally A', 'First selected ally should still render');
  assertContains(html, 'Ally B', 'Second selected ally should still render');
});

test('Selecting an ally first replaces the default player actor', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  App.player = player;
  App.party = [player, ally];
  App.explorationActorIds = ['player-1'];
  App.explorationActorId = 'player-1';
  App.selectExplorationActor(1);
  assertEqual(App._getExplorationActors().length, 1, 'First ally selection should not silently keep the player selected');
  assertEqual(App._getExplorationActors()[0], ally, 'Ally should become the active actor after replacing default player');
});

test('Multiple selected party actors can play-fight one party target nonlethally', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', CPun: 5, MPun: 100, con: 1 });
  const allyA = makeUnit('Ally A', { id: 'ally-a', Figh: 40 });
  const allyB = makeUnit('Ally B', { id: 'ally-b', Figh: 40 });
  App.player = player;
  App.party = [player, allyA, allyB];
  App.selectExplorationActor(1);
  App.selectExplorationActor(2);
  App.outsideActionForParty('fight', 0);
  assertEqual(player.CPun, 1, 'Party play-fight should not drop party target below 1 HP');
  assertContains(App.log[App.log.length - 1].text, 'play-fight You', 'Group play-fight should be logged distinctly');
});

test('Party play-fight severity can be overridden for harsher outcomes', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', CPun: 5, MPun: 100, con: 1 });
  const allyA = makeUnit('Ally A', { id: 'ally-a', Figh: 40 });
  const allyB = makeUnit('Ally B', { id: 'ally-b', Figh: 40 });
  App.player = player;
  App.party = [player, allyA, allyB];
  App.settings.partyPlayFightMode = 'lethal';
  App.selectExplorationActor(1);
  App.selectExplorationActor(2);
  App.outsideActionForParty('fight', 0);
  assertEqual(player.disposition, App.DISPOSITION.CORPSE, 'Lethal play-fight mode should allow harsher moddable outcome');
});

test('Selected party members can be fed into another party member as consumer', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', size: 6, appetite: 8, hunger: 80 });
  const preyA = makeUnit('Prey A', { id: 'prey-a', size: 2 });
  const preyB = makeUnit('Prey B', { id: 'prey-b', size: 2 });
  App.player = player;
  App.party = [player, preyA, preyB];
  App.selectExplorationActor(1);
  App.selectExplorationActor(2);
  App.outsideActionForParty('feed', 0);
  assertEqual(player.stomach.length, 2, 'Party consumer should receive both selected prey');
  assertEqual(App.party.includes(preyA), false, 'Contained party member should leave active party list');
  assertEqual(App.party.includes(preyB), false, 'Second contained party member should leave active party list');
});

test('Player can assist group feeding without becoming prey', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', size: 4, appetite: 4 });
  const consumer = makeUnit('Consumer', { id: 'consumer-1', CPun: 100, MPun: 100, size: 6, appetite: 8, hunger: 80 });
  const prey = makeUnit('Prey', { id: 'prey-1', size: 2 });
  App.player = player;
  App.party = [player, consumer, prey];
  App.explorationActorIds = ['player-1', 'prey-1'];
  App.outsideActionForParty('feed', 1);
  assertEqual(consumer.stomach.length, 1, 'Consumer should receive the eligible selected prey');
  assertEqual(consumer.stomach[0].name, 'Prey', 'Selected prey should be the contained party member');
  assertEqual(App.party.includes(player), true, 'Player should remain in the party after assisting');
  assertEqual(App.party.includes(prey), false, 'Eligible prey should leave active party list after feeding');
  assertContains(App.log[App.log.length - 1].text, 'You help feed Prey to Consumer', 'Player helper should be described as assisting the feed');
  assertNotContains(App.log[App.log.length - 1].text, 'cannot be handed off as prey', 'Player should not be routed through prey rejection when helping a group feed');
});

test('Self-included group feed tends target instead of consuming helpers', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPun: 20, MPun: 100, Feed: 10, size: 6, appetite: 6 });
  const helper = makeUnit('Helper', { id: 'helper-1', Feed: 20, size: 2 });
  App.player = player;
  App.party = [player, target, helper];
  App.explorationActorIds = ['target-1', 'helper-1'];
  App.outsideActionForParty('feed', 1);
  assertEqual(target.CPun, 80, 'Self-included group feed should combine target and helper feed stats');
  assertEqual(target.stomach.length, 0, 'Self-included group feed should not consume helper');
  assertEqual(App.party.includes(helper), true, 'Helper should remain in party after tending target');
  assertContains(App.log[App.log.length - 1].text, 'tend Target together', 'Self-included feed should log tending semantics');
});

test('Self-included group feed supports multiple helpers tending one target', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPun: 10, MPun: 200, Feed: 10, size: 6, appetite: 6 });
  const helperA = makeUnit('Helper A', { id: 'helper-a', Feed: 20, size: 2 });
  const helperB = makeUnit('Helper B', { id: 'helper-b', Feed: 30, size: 2 });
  App.player = player;
  App.party = [player, target, helperA, helperB];
  App.explorationActorIds = ['target-1', 'helper-a', 'helper-b'];
  App.outsideActionForParty('feed', 1);
  assertEqual(target.CPun, 130, 'Self-included group feed should combine target and both helper feed stats');
  assertEqual(target.stomach.length, 0, 'Self-included group feed should not consume helpers');
  assertEqual(App.party.includes(helperA), true, 'First helper should remain in party after group tending');
  assertEqual(App.party.includes(helperB), true, 'Second helper should remain in party after group tending');
  assertContains(App.log[App.log.length - 1].text, 'Target, Helper A, Helper B tend Target together', 'Three-participant feed should log shared tending semantics');
});

test('Self-included group social action shares pleasure across participants', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPle: 0, MPle: 100, Fuck: 20, Flir: 20, cha: 20, wis: 1 });
  const helper = makeUnit('Helper', { id: 'helper-1', CPle: 0, MPle: 100, Fuck: 20, Flir: 20, cha: 20 });
  App.player = player;
  App.party = [player, target, helper];
  App.explorationActorIds = ['target-1', 'helper-1'];
  App.outsideActionForParty('fuck', 1);
  assert(target.CPle > 0, 'Self-included social target should gain pleasure');
  assert(helper.CPle > 0, 'Self-included social helper should also gain shared pleasure');
  assertContains(App.log[App.log.length - 1].text, 'share fuck with Target', 'Self-included social action should log shared semantics');
});

test('Self-included group social action shares pleasure with multiple helpers', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPle: 0, MPle: 100, Fuck: 20, Flir: 20, cha: 20, wis: 1 });
  const helperA = makeUnit('Helper A', { id: 'helper-a', CPle: 0, MPle: 100, Fuck: 20, Flir: 20, cha: 20 });
  const helperB = makeUnit('Helper B', { id: 'helper-b', CPle: 0, MPle: 100, Fuck: 20, Flir: 20, cha: 20 });
  App.player = player;
  App.party = [player, target, helperA, helperB];
  App.explorationActorIds = ['target-1', 'helper-a', 'helper-b'];
  App.outsideActionForParty('fuck', 1);
  assert(target.CPle > 0, 'Self-included social target should gain pleasure');
  assert(helperA.CPle > 0, 'First helper should gain shared pleasure');
  assert(helperB.CPle > 0, 'Second helper should gain shared pleasure');
  assertContains(App.log[App.log.length - 1].text, 'Target, Helper A, Helper B share fuck with Target', 'Three-participant social action should log shared semantics');
});

test('Self-included group flirt shares pleasure with multiple helpers', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPle: 0, MPle: 100, Flir: 30, cha: 20, wis: 1 });
  const helperA = makeUnit('Helper A', { id: 'helper-a', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  const helperB = makeUnit('Helper B', { id: 'helper-b', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  App.player = player;
  App.party = [player, target, helperA, helperB];
  App.explorationActorIds = ['target-1', 'helper-a', 'helper-b'];
  App.outsideActionForParty('flirt', 1);
  assert(target.CPle > 0, 'Self-included flirt target should gain pleasure');
  assert(helperA.CPle > 0, 'First flirt helper should gain shared pleasure');
  assert(helperB.CPle > 0, 'Second flirt helper should gain shared pleasure');
  assertContains(App.log[App.log.length - 1].text, 'Target, Helper A, Helper B share flirt with Target', 'Three-participant flirt should log shared semantics');
});

test('Self-included group fight spars across participants instead of self-attacking target', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  const helper = makeUnit('Helper', { id: 'helper-1', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  App.player = player;
  App.party = [player, target, helper];
  App.explorationActorIds = ['target-1', 'helper-1'];
  App.outsideActionForParty('fight', 1);
  assert(target.CPun < 100, 'Self-included sparring should affect the target');
  assert(helper.CPun < 100, 'Self-included sparring should affect the helper too');
  assertEqual(App.party.includes(target), true, 'Default self-included sparring should keep target in party');
  assertEqual(App.party.includes(helper), true, 'Default self-included sparring should keep helper in party');
  assertContains(App.log[App.log.length - 1].text, 'spar together', 'Self-included fight should log sparring semantics');
});

test('Self-included group fight spars across multiple helpers', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  const helperA = makeUnit('Helper A', { id: 'helper-a', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  const helperB = makeUnit('Helper B', { id: 'helper-b', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  App.player = player;
  App.party = [player, target, helperA, helperB];
  App.explorationActorIds = ['target-1', 'helper-a', 'helper-b'];
  App.outsideActionForParty('fight', 1);
  assert(target.CPun < 100, 'Three-participant sparring should affect the target');
  assert(helperA.CPun < 100, 'Three-participant sparring should affect the first helper');
  assert(helperB.CPun < 100, 'Three-participant sparring should affect the second helper');
  assertEqual(App.party.includes(target), true, 'Default three-participant sparring should keep target in party');
  assertEqual(App.party.includes(helperA), true, 'Default three-participant sparring should keep first helper in party');
  assertEqual(App.party.includes(helperB), true, 'Default three-participant sparring should keep second helper in party');
  assertContains(App.log[App.log.length - 1].text, 'Target, Helper A, Helper B spar together', 'Three-participant fight should log sparring semantics');
});

test('Self-included group feast rejects instead of routing self-consumption', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', size: 4, appetite: 4, Feas: 30, Flee: 1 });
  const helper = makeUnit('Helper', { id: 'helper-1', size: 6, appetite: 6, Feas: 30 });
  App.player = player;
  App.party = [player, target, helper];
  App.explorationActorIds = ['target-1', 'helper-1'];
  App.outsideActionForParty('feast', 1);
  assertEqual(App.party.includes(target), true, 'Rejected self-included feast should leave target in party');
  assertEqual(App.party.includes(helper), true, 'Rejected self-included feast should leave helper in party');
  assertEqual(target.stomach.length, 0, 'Rejected self-included feast should not put target in their own stomach');
  assertEqual(helper.stomach.length, 0, 'Rejected self-included feast should not silently route target into helper');
  assertContains(App.log[App.log.length - 1].text, 'cannot feast on themself', 'Self-included feast should explain the rule');
});

test('Single selected party member can be fed to another full-health party member', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const consumer = makeUnit('Consumer', { id: 'consumer-1', CPun: 100, MPun: 100, size: 6, appetite: 6 });
  const prey = makeUnit('Prey', { id: 'prey-1', size: 2 });
  App.player = player;
  App.party = [player, consumer, prey];
  App.selectExplorationActor(2);
  App.outsideActionForParty('feed', 1);
  assertEqual(consumer.stomach.length, 1, 'Feed action should support feeding selected party member to party consumer');
  assertEqual(App.party.includes(prey), false, 'Fed party member should be contained rather than remain in party');
});

test('Chewing-enabled group feast splits target among selected actors', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const eaterA = makeUnit('Eater A', { id: 'eater-a', size: 4, appetite: 4, Feas: 20 });
  const eaterB = makeUnit('Eater B', { id: 'eater-b', size: 4, appetite: 4, Feas: 20 });
  const prey = makeUnit('Prey', { id: 'prey-1', size: 4, Flee: 1 });
  App.player = player;
  App.party = [player, eaterA, eaterB, prey];
  App.settings.chewing = true;
  App.selectExplorationActor(1);
  App.selectExplorationActor(2);
  App.outsideActionForParty('feast', 3);
  assertEqual(eaterA.stomach.length, 1, 'First group eater should receive a prey portion');
  assertEqual(eaterB.stomach.length, 1, 'Second group eater should receive a prey portion');
  assertEqual(App.party.includes(prey), false, 'Split party target should leave active party list');
  assertContains(App.log[App.log.length - 1].text, 'split Prey', 'Group chew feast should log splitting behavior');
});

test('Group feast chooses a selected primary consumer that can fit the target', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const smallHelper = makeUnit('Small Helper', { id: 'small-helper', size: 1, appetite: 1, Feas: 50 });
  const primary = makeUnit('Primary', { id: 'primary-1', size: 6, appetite: 6, Feas: 20 });
  const prey = makeUnit('Prey', { id: 'prey-1', size: 5, Flee: 1 });
  App.player = player;
  App.party = [player, smallHelper, primary, prey];
  App.settings.chewing = false;
  App.explorationActorIds = ['small-helper', 'primary-1'];
  App.outsideActionForParty('feast', 3);
  assertEqual(smallHelper.stomach.length, 0, 'Too-small first selected actor should not be forced as primary');
  assertEqual(primary.stomach.length, 1, 'Later selected actor that can fit the target should become primary');
  assertEqual(primary.stomach[0].name, 'Prey', 'Primary consumer should receive the target');
  assertEqual(App.party.includes(prey), false, 'Consumed party target should leave active party list');
  assertContains(App.log[App.log.length - 1].text, 'Small Helper help Primary swallow Prey', 'Group feast summary should name helper and selected primary');
});

test('Group exploration outcome summaries localize', () => {
  const feed = loadAppForCombat(() => 0);
  const feedPlayer = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPun: 10, MPun: 200, Feed: 10, size: 6, appetite: 6 });
  const helperA = makeUnit('Helper A', { id: 'helper-a', Feed: 20, size: 2 });
  const helperB = makeUnit('Helper B', { id: 'helper-b', Feed: 30, size: 2 });
  feed.App.player = feedPlayer;
  feed.App.party = [feedPlayer, target, helperA, helperB];
  feed.App.explorationActorIds = ['target-1', 'helper-a', 'helper-b'];
  feed.App.updateLanguage('es');
  feed.App.outsideActionForParty('feed', 1);
  assertContains(feed.App.log[feed.App.log.length - 1].text, 'atienden juntos a Target', 'Self-included group feed summary should localize');

  const social = loadAppForCombat(() => 0);
  const socialPlayer = makeUnit('You', { id: 'player-1' });
  const socialTarget = makeUnit('Target', { id: 'target-1', CPle: 0, MPle: 100, Fuck: 20, cha: 20, wis: 1 });
  const socialHelper = makeUnit('Helper', { id: 'helper-1', CPle: 0, MPle: 100, Fuck: 20, cha: 20 });
  social.App.player = socialPlayer;
  social.App.party = [socialPlayer, socialTarget, socialHelper];
  social.App.explorationActorIds = ['target-1', 'helper-1'];
  social.App.updateLanguage('es');
  social.App.outsideActionForParty('fuck', 1);
  assertContains(social.App.log[social.App.log.length - 1].text, 'comparten seducir con Target', 'Self-included group social summary should localize');

  const fight = loadAppForCombat(() => 0);
  const fightPlayer = makeUnit('You', { id: 'player-1' });
  const fighterA = makeUnit('Fighter A', { id: 'fighter-a', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  const fighterB = makeUnit('Fighter B', { id: 'fighter-b', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  fight.App.player = fightPlayer;
  fight.App.party = [fightPlayer, fighterA, fighterB];
  fight.App.explorationActorIds = ['fighter-a', 'fighter-b'];
  fight.App.updateLanguage('es');
  fight.App.outsideActionForParty('fight', 1);
  assertContains(fight.App.log[fight.App.log.length - 1].text, 'practican combate juntos', 'Self-included group fight summary should localize');

  const feast = loadAppForCombat(() => 0);
  const feastPlayer = makeUnit('You', { id: 'player-1' });
  const eaterA2 = makeUnit('Eater A', { id: 'eater-a', size: 4, appetite: 4, Feas: 20 });
  const eaterB2 = makeUnit('Eater B', { id: 'eater-b', size: 4, appetite: 4, Feas: 20 });
  const prey = makeUnit('Prey', { id: 'prey-1', size: 4, Flee: 1 });
  feast.App.player = feastPlayer;
  feast.App.party = [feastPlayer, eaterA2, eaterB2, prey];
  feast.App.settings.chewing = true;
  feast.App.explorationActorIds = ['eater-a', 'eater-b'];
  feast.App.updateLanguage('es');
  feast.App.outsideActionForParty('feast', 3);
  assertContains(feast.App.log[feast.App.log.length - 1].text, 'dividen a Prey en porciones masticables', 'Group chew feast summary should localize');

  const transfer = loadAppForCombat(() => 0);
  const transferPlayer = makeUnit('You', { id: 'player-1' });
  const consumer = makeUnit('Consumer', { id: 'consumer-1', CPun: 100, MPun: 100, size: 6, appetite: 6 });
  const transferPrey = makeUnit('Prey', { id: 'prey-1', size: 2 });
  transfer.App.player = transferPlayer;
  transfer.App.party = [transferPlayer, consumer, transferPrey];
  transfer.App.explorationActorIds = ['prey-1'];
  transfer.App.updateLanguage('es');
  transfer.App.outsideActionForParty('feed', 1);
  assertContains(transfer.App.log[transfer.App.log.length - 1].text, 'Prey es alimentado a Consumer', 'Party feed transfer summary should localize');
});

test('One actor needs enough stats to handle multiple exploration targets', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 5, cha: 5 });
  const targetA = makeUnit('Target A', { id: 'target-a', CPle: 0, MPle: 100 });
  const targetB = makeUnit('Target B', { id: 'target-b', CPle: 0, MPle: 100 });
  App.player = actor;
  App.party = [actor, targetA, targetB];
  App.updateLanguage('es');
  App.outsideActionForPartyTargets('flirt', [1, 2]);
  assertEqual(targetA.CPle, 0, 'Low-stat actor should not affect first multi-target target');
  assertEqual(targetB.CPle, 0, 'Low-stat actor should not affect second multi-target target');
  assertContains(App.log[App.log.length - 1].text, 'Actor no puede manejar 2 objetivos con coquetear todavia.', 'Failed multi-target action should localize the stat gate');
});

test('Capable actor can resolve one action across multiple exploration targets', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 30, cha: 20 });
  const targetA = makeUnit('Target A', { id: 'target-a', disposition: App.DISPOSITION.FRIENDLY, CPle: 0, MPle: 100, wis: 1 });
  const targetB = makeUnit('Target B', { id: 'target-b', disposition: App.DISPOSITION.FRIENDLY, CPle: 0, MPle: 100, wis: 1 });
  App.player = actor;
  App.party = [actor];
  App.creatures = [targetA, targetB];
  App.updateLanguage('es');
  App.outsideActionForCreatureTargets('flirt', ['target-a', 'target-b']);
  assert(targetA.CPle > 0, 'Capable actor should affect first target');
  assert(targetB.CPle > 0, 'Capable actor should affect second target');
  assertContains(App.log[App.log.length - 1].text, 'Actor termina una accion multiobjetivo de coquetear sobre Target A, Target B.', 'Successful multi-target action summary should localize');
});

test('Exploration cards expose multi-target selection and context actions', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 30, cha: 20 });
  const allyTarget = makeUnit('Ally Target', { id: 'ally-target' });
  const creatureTarget = makeUnit('Creature Target', { id: 'creature-target', disposition: App.DISPOSITION.FRIENDLY });
  App.player = actor;
  App.party = [actor, allyTarget];
  App.creatures = [creatureTarget];
  App.updateLanguage('es');
  App.renderParty();
  App.renderCreatures();
  assertContains(elements.get('party-content').innerHTML, "toggleExplorationTarget('party','ally-target')", 'Party card should expose target selection');
  assertContains(elements.get('enemies-content').innerHTML, "toggleExplorationTarget('creature','creature-target')", 'Creature card should expose target selection');
  App.toggleExplorationTarget('party', 'ally-target');
  App.toggleExplorationTarget('creature', 'creature-target');
  const actionsHtml = elements.get('scene-actions').innerHTML;
  assertContains(actionsHtml, 'selected-target-summary', 'Context actions should include a selected-target summary');
  assertContains(actionsHtml, 'aria-label="Objetivos de exploracion seleccionados"', 'Target summary region label should localize');
  assertContains(actionsHtml, 'Actores: Actor', 'Context actions should show localized selected actor names');
  assertContains(actionsHtml, 'Objetivos: Ally Target, Creature Target', 'Context actions should show localized selected target names');
  assertContains(actionsHtml, 'aria-label="Coquetear 2 objetivos"', 'Selected-target action labels should use localized target counts');
  assertContains(actionsHtml, 'aria-label="Limpiar objetivos"', 'Selected-target clear action should localize its accessible label');
  assertContains(actionsHtml, '>Limpiar<', 'Selected-target clear action should localize its visible label');
  assertNotContains(actionsHtml, 'target.count', 'Selected-target actions should not render raw target count locale keys');
  assertNotContains(actionsHtml, 'target.clear', 'Selected-target actions should not render raw clear locale keys');
  assertContains(actionsHtml, "resolveExplorationTargetAction('flirt')", 'Context actions should resolve selected targets');
});

test('Desktop creature card action labels localize', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 30, Fuck: 30, cha: 20 });
  const friendly = makeUnit('Friendly', { id: 'friendly-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 95, MPle: 100, willing: true, quest: { id: 'quest-1', title: 'Help' } });
  const merchant = makeUnit('Merchant', { id: 'merchant-1', disposition: App.DISPOSITION.MERCHANT });
  App.player = actor;
  App.party = [actor];
  App.creatures = [friendly, merchant];
  App.updateLanguage('es');
  App.renderCreatures();
  const html = elements.get('enemies-content').innerHTML;
  assertContains(html, 'aria-label="Marcar Friendly como objetivo"', 'Creature target button should localize accessible label');
  assertContains(html, '>Objetivo<', 'Creature target visible label should localize');
  assertContains(html, 'aria-label="Luchar Friendly"', 'Creature fight icon should localize accessible label');
  assertContains(html, 'aria-label="Seducir Friendly"', 'Creature pleasure icon should localize accessible label');
  assertContains(html, 'aria-label="Reclutar Friendly"', 'Creature recruit icon should localize accessible label');
  assertContains(html, 'aria-label="Aceptar mision de Friendly"', 'Quest action should localize accessible label');
  assertContains(html, '>📜 Aceptar mision<', 'Quest visible label should localize');
  assertContains(html, 'aria-label="Comerciar con Merchant"', 'Merchant trade action should localize accessible label');
  assertContains(html, '>🪙 Comerciar<', 'Merchant trade visible label should localize');
});

test('Exploration target summary escapes actor and target names', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor <One>', { id: 'actor-1' });
  const target = makeUnit('Target & Two', { id: 'target-1' });
  App.player = actor;
  App.party = [actor, target];
  App.toggleExplorationTarget('party', 'target-1');
  const actionsHtml = elements.get('scene-actions').innerHTML;
  assertContains(actionsHtml, 'Actor &lt;One&gt;', 'Actor names in target summary should be escaped');
  assertContains(actionsHtml, 'Target &amp; Two', 'Target names in target summary should be escaped');
});

test('Marked exploration targets resolve through multi-target action and clear selection', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 30, cha: 20 });
  const targetA = makeUnit('Target A', { id: 'target-a', CPle: 0, MPle: 100, wis: 1 });
  const targetB = makeUnit('Target B', { id: 'target-b', disposition: App.DISPOSITION.FRIENDLY, CPle: 0, MPle: 100, wis: 1 });
  App.player = actor;
  App.party = [actor, targetA];
  App.creatures = [targetB];
  App.toggleExplorationTarget('party', 'target-a');
  App.toggleExplorationTarget('creature', 'target-b');
  App.resolveExplorationTargetAction('flirt');
  assert(targetA.CPle > 0, 'Marked party target should receive multi-target action');
  assert(targetB.CPle > 0, 'Marked creature target should receive multi-target action');
  assertEqual(App.explorationTargetIds.length, 0, 'Target selection should clear after resolving action');
});

test('Multi-target feed does not consume the acting party member', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Feeder', { id: 'feeder-1', Feed: 20 });
  const fullTarget = makeUnit('Full Target', { id: 'full-target', CPun: 100, MPun: 100, size: 6, appetite: 6 });
  const woundedTarget = makeUnit('Wounded Target', { id: 'wounded-target', CPun: 20, MPun: 100 });
  App.player = actor;
  App.party = [actor, fullTarget, woundedTarget];
  App.updateLanguage('es');
  App.outsideActionForPartyTargets('feed', [1, 2]);
  assertEqual(App.party.includes(actor), true, 'Multi-target feed should not hand the actor off as prey');
  assertEqual(fullTarget.stomach.length, 0, 'Full party target should not consume the actor during multi-target feed');
  assertEqual(woundedTarget.CPun, 60, 'Wounded target should still be fed/healed');
  assertContains(App.log[App.log.length - 1].text, 'Wounded Target', 'Multi-target feed summary should name affected targets');
  assertContains(App.log[App.log.length - 1].text, 'Objetivos llenos omitidos: Full Target', 'Multi-target feed summary should localize skipped full party targets');
});

test('Multi-target feed reports when all party targets are already full', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Feeder', { id: 'feeder-1', Feed: 20 });
  const fullA = makeUnit('Full A', { id: 'full-a', CPun: 100, MPun: 100, size: 6, appetite: 6 });
  const fullB = makeUnit('Full B', { id: 'full-b', CPun: 80, MPun: 80, size: 6, appetite: 6 });
  App.player = actor;
  App.party = [actor, fullA, fullB];
  App.updateLanguage('es');
  App.outsideActionForPartyTargets('feed', [1, 2]);
  assertEqual(App.party.includes(actor), true, 'All-full multi-target feed should not consume the actor');
  assertEqual(fullA.stomach.length, 0, 'First full target should not consume the actor');
  assertEqual(fullB.stomach.length, 0, 'Second full target should not consume the actor');
  assertContains(App.log[App.log.length - 1].text, 'Feeder no encuentra objetivos validos para multiobjetivo de alimentar.', 'All-full feed should localize that no target was affected');
  assertContains(App.log[App.log.length - 1].text, 'Objetivos llenos omitidos: Full A, Full B', 'All skipped full targets should be named with localized label');
});

test('Multiple actors against multiple marked targets are rejected clearly', () => {
  const { App } = loadAppForCombat(() => 0);
  const actorA = makeUnit('Actor A', { id: 'actor-a', Flir: 30, cha: 20 });
  const actorB = makeUnit('Actor B', { id: 'actor-b', Flir: 30, cha: 20 });
  const targetA = makeUnit('Target A', { id: 'target-a', CPle: 0, MPle: 100, wis: 1 });
  const targetB = makeUnit('Target B', { id: 'target-b', CPle: 0, MPle: 100, wis: 1 });
  App.player = actorA;
  App.party = [actorA, actorB, targetA, targetB];
  App.explorationActorIds = ['actor-a', 'actor-b'];
  App.updateLanguage('es');
  App.toggleExplorationTarget('party', 'target-a');
  App.toggleExplorationTarget('party', 'target-b');
  App.resolveExplorationTargetAction('flirt');
  assertEqual(targetA.CPle, 0, 'Ambiguous many-to-many action should not affect first target');
  assertEqual(targetB.CPle, 0, 'Ambiguous many-to-many action should not affect second target');
  assertEqual(App.explorationActorIds.join(','), 'actor-a,actor-b', 'Rejected many-to-many action should preserve selected actors for correction');
  assertEqual(App.explorationTargetIds.join(','), 'party:target-a,party:target-b', 'Rejected many-to-many action should preserve selected targets for correction');
  assertContains(App.log[App.log.length - 1].text, 'Elige un actor para acciones multiobjetivo de coquetear, o un objetivo para acciones grupales de coquetear.', 'Many-to-many rejection should localize both correction paths');
});

test('Marked self-included group target resolves through shared group semantics', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPle: 0, MPle: 100, Flir: 30, cha: 20, wis: 1 });
  const helperA = makeUnit('Helper A', { id: 'helper-a', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  const helperB = makeUnit('Helper B', { id: 'helper-b', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  App.player = player;
  App.party = [player, target, helperA, helperB];
  App.explorationActorIds = ['target-1', 'helper-a', 'helper-b'];
  App.toggleExplorationTarget('party', 'target-1');
  App.resolveExplorationTargetAction('flirt');
  assert(target.CPle > 0, 'Marked self-included target should receive shared group action');
  assert(helperA.CPle > 0, 'Marked self-included first helper should share the action result');
  assert(helperB.CPle > 0, 'Marked self-included second helper should share the action result');
  assertEqual(App.explorationTargetIds.length, 0, 'Resolved marked self-included group action should clear targets');
  assertContains(App.log[App.log.length - 1].text, 'share flirt with Target', 'Marked self-included action should route to group semantics');
});

test('Marked self-included group feed tends instead of consuming helpers', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', CPun: 10, MPun: 200, Feed: 10, size: 6, appetite: 6 });
  const helperA = makeUnit('Helper A', { id: 'helper-a', Feed: 20, size: 2 });
  const helperB = makeUnit('Helper B', { id: 'helper-b', Feed: 30, size: 2 });
  App.player = player;
  App.party = [player, target, helperA, helperB];
  App.explorationActorIds = ['target-1', 'helper-a', 'helper-b'];
  App.toggleExplorationTarget('party', 'target-1');
  App.resolveExplorationTargetAction('feed');
  assertEqual(target.CPun, 130, 'Marked self-included feed should combine target and helper feed stats');
  assertEqual(target.stomach.length, 0, 'Marked self-included feed should not route helpers into target stomach');
  assertEqual(App.party.includes(helperA), true, 'First helper should remain after marked self-included feed');
  assertEqual(App.party.includes(helperB), true, 'Second helper should remain after marked self-included feed');
  assertEqual(App.explorationTargetIds.length, 0, 'Resolved marked self-included feed should clear targets');
  assertContains(App.log[App.log.length - 1].text, 'tend Target together', 'Marked self-included feed should log tending semantics');
});

test('Exploration selection cleanup removes stale party and creature targets', () => {
  const { App } = loadAppForCombat(() => 0, { confirm: true });
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  const creature = makeUnit('Creature', { id: 'creature-1', disposition: App.DISPOSITION.FRIENDLY });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [creature];
  App.explorationActorIds = ['ally-1'];
  App.toggleExplorationTarget('party', 'ally-1');
  App.toggleExplorationTarget('creature', 'creature-1');
  App.dismissPartyMember(1);
  assertEqual(App.explorationActorIds.includes('ally-1'), false, 'Dismiss should clear selected actor id');
  assertEqual(App.explorationTargetIds.includes('party:ally-1'), false, 'Dismiss should clear selected party target id');
  App._makeCorpse(creature, 'fight');
  assertEqual(App.explorationTargetIds.includes('creature:creature-1'), false, 'Corpse conversion should clear selected creature target id');
});

test('Exploration selection normalization resets stale save-load state', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  App.player = player;
  App.party = [player];
  App.creatures = [];
  App.explorationActorIds = ['missing-actor'];
  App.explorationTargetIds = ['party:missing-party', 'creature:missing-creature'];
  App._normalizeExplorationSelections({ resetTargets: true });
  assertEqual(App.explorationActorIds[0], 'player-1', 'Selection normalization should fall back to player actor');
  assertEqual(App.explorationTargetIds.length, 0, 'Selection normalization should clear target ids on load/reset');
});

test('Exploration selection save metadata persists party selections only', () => {
  const Binary = loadBinaryForTest();
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  const save = Binary.saveGame({
    player,
    party: [player, ally],
    location: { x: 0, y: 0 },
    explorationActorIds: ['ally-1'],
    explorationTargetIds: ['party:ally-1', 'creature:tile-creature'],
    worldMap: new Map(),
    exploredTiles: new Set(),
    log: []
  });
  const loaded = Binary.loadGame(save);
  assertEqual(loaded.questState.explorationActorIds[0], 'ally-1', 'Selected party actor should persist in save metadata');
  assertEqual(loaded.questState.explorationPartyTargetIds[0], 'party:ally-1', 'Selected party target should persist in save metadata');
  assertEqual(loaded.questState.explorationPartyTargetIds.includes('creature:tile-creature'), false, 'Tile-bound creature target should not persist in save metadata');
});

test('Moving tiles clears tile-bound creature targets but keeps party selections', () => {
  const { App } = loadAppForCombat(() => 1);
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  const creature = makeUnit('Creature', { id: 'creature-1', disposition: App.DISPOSITION.FRIENDLY });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [creature];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([
    ['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [creature], items: [], description: 'Start' }],
    ['1,0', { x: 1, y: 0, biome: 'forest', explored: true, creatures: [], items: [], description: 'Next' }]
  ]);
  App.exploredTiles = new Set(['0,0', '1,0']);
  App.explorationActorIds = ['ally-1'];
  App.explorationTargetIds = ['party:ally-1', 'creature:creature-1'];
  App.move(1, 0);
  assertEqual(App.explorationActorIds.includes('ally-1'), true, 'Selected party actor should survive tile movement');
  assertEqual(App.explorationTargetIds.includes('party:ally-1'), true, 'Selected party target should survive tile movement');
  assertEqual(App.explorationTargetIds.includes('creature:creature-1'), false, 'Selected creature target should clear when leaving its tile');
});

test('Recruitment is gated by pleasure and willingness score', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { cha: 10, Flir: 10, Fuck: 10 });
  const reluctant = makeUnit('Reluctant', { id: 'reluctant-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 10, MPle: 100 });
  const willing = makeUnit('Willing', { id: 'willing-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 90, MPle: 100, willing: true });
  App.player = player;
  App.party = [player];
  App.creatures = [reluctant, willing];
  App.updateLanguage('es');
  App.renderCreatures();
  const html = elements.get('enemies-content').innerHTML;
  assertNotContains(html, "recruitCreatureById('reluctant-1')", 'Low-pleasure friendly should not show recruitment');
  assertContains(html, "recruitCreatureById('willing-1')", 'High-pleasure willing friendly should show recruitment');
  App.recruitCreatureById('reluctant-1');
  assert(!App.party.includes(reluctant), 'Low-score friendly should not join');
  assertContains(App.log[App.log.length - 1].text, 'Reluctant aun no esta listo para unirse al grupo.', 'Failed recruitment log should localize');
  App.recruitCreatureById('willing-1');
  assert(App.party.includes(willing), 'High-score willing friendly should join');
  assertContains(App.log[App.log.length - 1].text, 'Willing se une a tu grupo!', 'Successful recruitment log should localize');
});

test('Rest only appears and heals at safe structures', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You', { CPun: 50, MPun: 100 });
  App.player = player;
  App.party = [player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], structure: null }]]);
  App.updateLanguage('es');
  App.renderExplorationActions();
  assertNotContains(elements.get('scene-actions').innerHTML, 'App.rest()', 'Rest should be hidden outside safe rest structures');
  App.rest();
  assertEqual(player.CPun, 50, 'Rest should not heal outside safe rest structures');
  assertContains(App.log[App.log.length - 1].text, 'No hay un lugar seguro para descansar aqui.', 'Unsafe rest log should localize');
  App.worldMap.get('0,0').structure = 'cabin';
  App.renderExplorationActions();
  assertContains(elements.get('scene-actions').innerHTML, 'App.rest()', 'Rest should appear at safe rest structures');
  App.rest();
  assertEqual(player.CPun, 80, 'Rest should heal at safe rest structures');
  assertContains(App.log[App.log.length - 1].text, 'Descansaste y te recuperaste.', 'Safe rest log should localize');
});

test('Support party role improves safe rest recovery', () => {
  const { App } = loadAppForCombat();
  const player = makeUnit('You', { CPun: 40, MPun: 100 });
  const support = makeUnit('Helper', { id: 'support-1', partyRole: 'support', CPun: 20, MPun: 100 });
  App.player = player;
  App.party = [player, support];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], structure: 'cabin' }]]);
  App.rest();
  assertEqual(player.CPun, 80, 'Support role should increase player rest healing');
  assertEqual(support.CPun, 60, 'Support role should also benefit resting allies');
});

test('Structures expose enter action and create persistent interiors', () => {
  const { App, elements } = loadAppForCombat(() => 1);
  const player = makeUnit('You');
  App.player = player;
  App.party = [player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], structure: 'cabin', structureSpawned: true }]]);
  App.renderExplorationActions();
  assertContains(elements.get('scene-actions').innerHTML, 'App.enterStructure()', 'Structure tile should expose enter action');
  App.enterStructure();
  assertEqual(App.inInterior, true, 'Entering structure should switch to interior mode');
  assertEqual(Object.keys(App.activeInterior.tiles).length, 25, 'Structure interior should be a persistent 5x5 map');
  assert(App.worldMap.get('0,0').interior, 'Interior should be stored on overworld tile for persistence');
  assertContains(elements.get('scene-actions').innerHTML, 'App.exitStructure()', 'Interior should expose exit action');
});

test('Interior movement persists room creatures and exits to overworld', () => {
  const { App } = loadAppForCombat(() => 1);
  const player = makeUnit('You');
  const roomCreature = makeUnit('Room Creature', { disposition: App.DISPOSITION.FRIENDLY });
  App.player = player;
  App.party = [player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], structure: 'cabin', structureSpawned: true }]]);
  App.enterStructure();
  App.creatures = [roomCreature];
  App.move(1, 0);
  assertEqual(App.activeInterior.tiles['0,0'].creatures.includes(roomCreature), true, 'Leaving an interior room should persist its creatures');
  assertEqual(App.interiorLocation.x, 1, 'Interior move should update interior x coordinate');
  App.exitStructure();
  assertEqual(App.inInterior, false, 'Exit should return to overworld mode');
  assertEqual(App.location.x, 0, 'Exit should restore overworld x coordinate');
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

test('Super-patch generation uses seeded region biomes only', () => {
  const { App } = loadAppForCombat();
  App.worldMeta = { worldId: 'world-a', seed: 'shared-seed', generatorVersion: 1, mapModsHash: 'core' };
  App.superPatchMap = new Map();
  const regionKeys = App._regionBiomeKeys();
  assert(regionKeys.includes('forest'), 'Region biome list should include normal terrain');
  assert(!regionKeys.includes('bridge'), 'Bridge should not be a region biome');
  assert(!regionKeys.includes('road'), 'Road should not be a region biome');
  assert(!regionKeys.includes('indoors'), 'Indoors should not be a region biome');
  assert(!regionKeys.includes('entrance'), 'Entrance should not be a region biome');
  for (let spx = -4; spx <= 4; spx++) {
    for (let spy = -4; spy <= 4; spy++) {
      const biome = App._getSuperPatchBiome(spx, spy);
      assert(regionKeys.includes(biome), `Super-patch generated non-region biome ${biome}`);
    }
  }
  const first = App._getSuperPatchBiome(4, -3);
  App.superPatchMap = new Map();
  const second = App._getSuperPatchBiome(4, -3);
  assertEqual(first, second, 'Same seed should produce same super-patch biome');
  App.worldMeta.seed = 'different-seed';
  App.superPatchMap = new Map();
  const otherSeed = App._getSuperPatchBiome(4, -3);
  assert(App._regionBiomeKeys().includes(otherSeed), 'Different seed should still produce a valid region biome');
});

test('Sparse map helpers separate generated base tiles from durable deltas', () => {
  const { App } = loadAppForCombat(() => 1);
  App.worldMeta = { worldId: 'world-delta', seed: 'shared-seed', generatorVersion: 1, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.superPatchMap = new Map();
  const base = App.getBaseTile(12, -4);
  assertEqual(App.worldMap.has('12,-4'), false, 'Base tile generation should not materialize compatibility worldMap entries');
  assertEqual(base.explored, false, 'Base tiles should be unexplored');
  const tile = App.getTile(12, -4);
  tile.explored = true;
  tile.description = 'A changed clearing.';
  tile.creatures = [makeUnit('Mouse', { id: 'mouse-1', disposition: App.DISPOSITION.FRIENDLY })];
  App.persistTileDelta(12, -4, tile);
  const delta = App.getTileDelta(12, -4);
  assert(delta, 'Changed effective tile should create a durable delta');
  assertEqual(delta.explored, true, 'Delta should preserve explored state');
  assertEqual(delta.description, 'A changed clearing.', 'Delta should preserve changed description');
  assertEqual(delta.creatures.length, 1, 'Delta should preserve tile entities');
  const effective = App.applyTileDelta(base, delta);
  assertEqual(effective.biome, base.biome, 'Effective tile should inherit generated biome when biome is unchanged');
  assertEqual(effective.creatures[0].name, 'Mouse', 'Effective tile should restore delta entities');
});

test('Loaded world state rebuilds tile deltas over deterministic base tiles', () => {
  const { App } = loadAppForCombat(() => 1);
  App.worldMeta = { worldId: 'world-load-delta', seed: 'load-seed', generatorVersion: 1, mapModsHash: 'core' };
  App.location = { x: 4, y: 5 };
  App.player = makeUnit('You');
  App._restoreWorldState({
    worldMeta: App.worldMeta,
    exploredTiles: ['4,5'],
    worldMap: {
      '4,5': {
        x: 4,
        y: 5,
        biome: 'forest',
        explored: true,
        description: 'Saved clearing.',
        hasLandmark: true,
        landmarkName: 'Old Tree',
        structure: 'camp',
        structureSpawned: true,
        creatures: [makeUnit('Fox', { id: 'fox-1', disposition: App.DISPOSITION.NEUTRAL })]
      }
    }
  });
  const delta = App.getTileDelta(4, 5);
  assert(delta, 'Restore should rebuild sparse tile delta data from legacy full tiles');
  assertEqual(delta.description, 'Saved clearing.', 'Rebuilt delta should preserve saved description');
  assertEqual(delta.structure, 'camp', 'Rebuilt delta should preserve saved structure');
  assertEqual(App.getTile(4, 5).baseBiome, App.getBaseTile(4, 5).biome, 'Restored tile should retain generated base biome metadata');
});

test('Sparse map IndexedDB store contract is present', () => {
  assertContains(appContent, "WORLD_DB_NAME: 'YAW_Worlds'", 'World map DB name should be declared');
  assertContains(appContent, "createObjectStore('worlds'", 'World metadata store should be created');
  assertContains(appContent, "createObjectStore('tileDeltas'", 'Tile delta store should be created');
  assertContains(appContent, "createObjectStore('chunkDeltas'", 'Chunk delta store should be reserved');
  assertContains(appContent, "createObjectStore('entityIndex'", 'Entity index store should be reserved');
  assertContains(appContent, 'persistWorldStateToMapStore()', 'World map persistence helper should exist');
  assertContains(appContent, 'loadWorldStateFromMapStore()', 'World map load helper should exist');
  assertContains(appContent, 'omitWorldMap: worldStoreSaved', 'Slot saves should omit full worldMap only after world-store persistence succeeds');
});

test('Sparse map tile delta records round-trip through store shape', () => {
  const { App } = loadAppForCombat(() => 1);
  App.worldMeta = { worldId: 'world-store', seed: 'store-seed', generatorVersion: 1, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set();
  const tile = App.getTile(-2, 7);
  tile.explored = true;
  tile.description = 'Stored delta tile.';
  tile.items = [{ id: 'item-1', name: 'Coin' }];
  const delta = App.persistTileDelta(-2, 7, tile);
  const record = App._tileDeltaRecordFromEntry('-2,7', delta);
  assertEqual(record.key, 'world-store:-2:7', 'Tile delta store key should include world and coordinates');
  assertEqual(record.worldId, 'world-store', 'Tile delta record should carry world id');
  assertEqual(record.x, -2, 'Tile delta record should preserve x coordinate');
  assertEqual(record.y, 7, 'Tile delta record should preserve y coordinate');
  assertEqual(record.delta.description, 'Stored delta tile.', 'Tile delta record should preserve changed state');
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set();
  App._applyTileDeltaRecords([record]);
  const restored = App.getTile(-2, 7);
  assertEqual(restored.description, 'Stored delta tile.', 'Stored delta record should restore effective tile description');
  assertEqual(restored.items[0].name, 'Coin', 'Stored delta record should restore tile items');
  assertEqual(App.exploredTiles.has('-2,7'), true, 'Stored explored delta should repopulate explored set');
});

test('Large map renders discovered tiles without materializing unknown tiles', () => {
  const { App, elements } = loadAppForCombat(() => 1);
  App.worldMeta = { worldId: 'world-large-map', seed: 'large-map-seed', generatorVersion: 1, mapModsHash: 'core' };
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set(['0,0', '2,0']);
  const current = App.getTile(0, 0);
  current.explored = true;
  App.persistTileDelta(0, 0, current);
  const known = App.applyTileDelta(App.getBaseTile(2, 0), {
    explored: true,
    description: 'Known grove.',
    hasLandmark: true,
    landmarkName: 'Old Tree',
    structure: 'camp'
  });
  App.persistTileDelta(2, 0, known);
  App.worldMap.delete('2,0');
  App.renderLargeMap();
  assertContains(elements.get('large-map').innerHTML, 'Old Tree', 'Known point of interest should be labeled');
  assertContains(elements.get('large-map-pois').innerHTML, 'Old Tree', 'Point of interest list should include known landmark');
  assertEqual(App.worldMap.has('6,6'), false, 'Unknown large-map tiles should not materialize into worldMap');
});

test('Large map controls zoom pan and recenter the discovered region', () => {
  const { App, elements } = loadAppForCombat(() => 1);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set(['0,0']);
  App.getTile(0, 0).explored = true;
  App.largeMapRadius = 8;
  App.largeMapOffset = { x: 0, y: 0 };
  App.setLargeMapZoom(-1);
  assertEqual(App.largeMapRadius, 7, 'Zooming in should reduce the rendered region radius');
  assertContains(elements.get('large-map-view').textContent, '15x15', 'View label should reflect zoomed region size');
  App.panLargeMap(1, 0);
  assertEqual(App.largeMapOffset.x, 3, 'Panning should move by half the current radius');
  assertContains(elements.get('large-map-view').textContent, '3, 0', 'View label should reflect panned center');
  assertEqual(App.worldMap.has('8,0'), false, 'Panning should not materialize unknown generated tiles');
  App.recenterLargeMap();
  assertEqual(App.largeMapOffset.x, 0, 'Recenter should clear x offset');
  assertEqual(App.largeMapOffset.y, 0, 'Recenter should clear y offset');
  assertContains(elements.get('large-map-view').textContent, '0, 0', 'View label should return to player center');
});

test('Large map renders next quest checkpoint markers', () => {
  const { App, elements } = loadAppForCombat(() => 1);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set(['0,0']);
  App.quests = [App._normalizeQuest({
    id: 'route_marker',
    title: 'Route Marker',
    status: 'active',
    objectives: [{
      type: 'escort',
      label: 'Guide traveler',
      checkpoints: [{ label: 'Safe Camp', x: 2, y: 0 }]
    }],
    reward: {}
  })];
  App.renderLargeMap();
  assertContains(elements.get('large-map').innerHTML, 'Route Marker: Safe Camp', 'Large map should label next quest checkpoint');
  assertContains(elements.get('large-map').innerHTML, 'large-map-tile quest', 'Large map should style quest checkpoint tile');
  assertContains(elements.get('large-map-pois').innerHTML, 'Route Marker: Safe Camp', 'POI list should include quest checkpoint');
  assertEqual(App.worldMap.has('2,0'), false, 'Quest marker should not materialize unknown generated tile');
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

test('Movement log localizes coordinates and biome', () => {
  const { App } = loadAppForCombat(() => 1);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.exploredTiles = new Set(['0,0', '1,0']);
  App.getTile(0, 0).explored = true;
  App.getTile(1, 0).explored = true;
  App.updateLanguage('es');
  App.move(1, 0);
  const moveEntry = App.log.find(entry => entry.type === 'move');
  const movedTile = App.getTile(1, 0);
  const movedBiome = App.biomes[movedTile.biome].name;
  assertContains(moveEntry.text, 'Movimiento a 1, 0', 'Movement log should localize coordinates');
  assertContains(moveEntry.text, `(${movedBiome})`, 'Movement log should include resolved biome name');
});

test('Movement feedback localizes combat block and landmark discovery', () => {
  const blocked = loadAppForCombat(() => 1);
  blocked.App.player = makeUnit('You');
  blocked.App.party = [blocked.App.player];
  blocked.App.location = { x: 0, y: 0 };
  blocked.App.mode = blocked.App.GAME_MODE.COMBAT;
  blocked.App.updateLanguage('es');
  blocked.App.move(1, 0);
  assertEqual(blocked.App.location.x, 0, 'Combat movement block should keep current x coordinate');
  assertContains(blocked.App.log[blocked.App.log.length - 1].text, 'Estas en combate! Usa Huir para escapar.', 'Combat movement block should localize');

  const discovered = loadAppForCombat(() => 1);
  discovered.App.player = makeUnit('You');
  discovered.App.party = [discovered.App.player];
  discovered.App.location = { x: 0, y: 0 };
  discovered.App.worldMap = new Map([
    ['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], items: [], hasLandmark: false }],
    ['1,0', { x: 1, y: 0, biome: 'forest', explored: true, creatures: [], items: [], description: 'A known grove.', hasLandmark: true, landmarkName: 'Ancient Tree' }]
  ]);
  discovered.App.exploredTiles = new Set(['0,0', '1,0']);
  discovered.App.updateLanguage('es');
  discovered.App.move(1, 0);
  const discoveryEntry = discovered.App.log.find(entry => entry.type === 'discovery');
  assertContains(discoveryEntry.text, 'Descubriste Ancient Tree!', 'Landmark discovery should localize');
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

test('Scout party role improves night map visibility', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const scout = makeUnit('Scout', { id: 'scout-1', partyRole: 'scout' });
  App.player = makeUnit('You');
  App.party = [App.player, scout];
  App.location = { x: 0, y: 0 };
  App.timeHour = 21;
  App.worldMap = new Map();
  App.exploredTiles = new Set(['0,0', '2,0']);
  App.getTile(0, 0).explored = true;
  const farTile = App.getTile(2, 0);
  farTile.biome = 'cave';
  farTile.explored = true;
  App.renderMap();
  assertContains(elements.get('mini-map').innerHTML, App.biomes.cave.icon, 'Scout role should recover one tile of night visibility');
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
  assertContains(elements.get('enemies-content').innerHTML, 'aria-label="Select Enemy as Fight target"', 'Target button should describe selected combat action');
  assertContains(elements.get('enemies-content').innerHTML, 'Enemy can be selected as the fight target.', 'Enemy card should expose targetability to screen readers');
  App.executeActionOnTarget('fight', 'enemy-1');
  assert(enemy.CPun < 100, 'Panel target action should damage selected enemy');
});

test('Combat creature target button localizes visible and accessible labels', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { Figh: 30 });
  const enemy = makeUnit('Enemy', { id: 'enemy-1', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.nextTurn = function() {};
  App.updateLanguage('es');
  App.selectTarget('fight');
  assertContains(elements.get('scene-description').innerHTML, 'Selecciona un objetivo desde el panel de criaturas.', 'Target selection prompt should localize');
  assertContains(elements.get('scene-description').innerHTML, 'aria-label="Cancelar Luchar"', 'Target cancellation should expose localized accessible label');
  const html = elements.get('enemies-content').innerHTML;
  assertContains(html, 'aria-label="Seleccionar Enemy como objetivo de Luchar"', 'Combat target button should localize selected-action accessible label');
  assertContains(html, '>Objetivo<', 'Combat target button visible label should localize');
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
  App.updateLanguage('es');
  const enemyCard = App.renderUnitCard(enemy, 0, 'creature');
  const allyCard = App.renderUnitCard(ally, 1, 'party');
  assertContains(enemyCard, 'Now #2', 'Current target card should show focused turn order');
  assertContains(enemyCard, 'title="Orden de turno"', 'Turn order badge should localize its accessible title');
  assertContains(enemyCard, 'role="status"', 'Current combat unit should expose a screen-reader status');
  assertContains(enemyCard, 'Enemy es el actor de combate actual en el turno 2.', 'Current combat unit should announce localized focus state');
  assertContains(allyCard, '#3', 'Waiting party card should show turn order number');
  assertContains(allyCard, 'Ally esta en cola para el turno 3', 'Waiting party card should announce localized queued turn order');
  assertContains(App.renderMobileUnitChip(enemy, 0, 'creature'), 'Enemy es el actor de combate actual en el turno 2.', 'Mobile chip should announce localized current combat focus');
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
  App.updateLanguage('es');
  assertContains(App.renderUnitCard(player, 0, 'party'), 'Group Luchar #3', 'Participant card should show group action order');
  const playerCard = App.renderUnitCard(player, 0, 'party');
  const enemyCard = App.renderUnitCard(enemy, 0, 'creature');
  assertContains(playerCard, 'You participa en el grupo Luchar en cola que se resolvera en el turno 3.', 'Participant card should announce localized queued group action');
  assertContains(enemyCard, 'Target Luchar #3', 'Target card should show group target order');
  assertContains(enemyCard, 'Enemy es objetivo del grupo Luchar en cola que se resolvera en el turno 3.', 'Target card should announce localized queued group action');
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
  App.updateLanguage('es');
  App.executeActionOnTarget('fight', 'backline-1');
  assertEqual(enemy.CPun, 100, 'Unreachable target should not take damage');
  assertContains(App.log[App.log.length - 1].text, 'You no puede alcanzar a Backline desde aqui.', 'Blocked reach log should localize');
});

test('Combat move action swaps row and costs the active turn', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-move', combatRow: 'front' });
  App.player = player;
  App.party = [player];
  App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
  App.combatState.active = true;
  App.activeActor = player;
  App.updateLanguage('es');
  App.showActorActions(player);
  assertContains(elements.get('scene-actions').innerHTML, 'aria-label="Mover fila"', 'Move row button should expose localized accessible label');
  assertContains(elements.get('scene-actions').innerHTML, '>↕️ Mover fila<', 'Move row button visible label should localize');
  App.nextTurn = function() { this._movedTurn = true; };
  App.moveCombatRow();
  assertEqual(player.combatRow, 'back', 'Move action should swap front to back');
  assertEqual(App._movedTurn, true, 'Move action should consume the turn');
  assertContains(App.log[App.log.length - 1].text, 'You se mueve a la fila Retaguardia.', 'Move row log should localize');
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
  App.updateLanguage('es');
  App.processTurn();
  const actionsHtml = elements.get('scene-actions').innerHTML;
  assertContains(actionsHtml, "selectTarget('fight')", 'Ally turn should expose manual actions');
  assertContains(actionsHtml, 'aria-label="Luchar"', 'Ally combat fight action should localize accessible label');
  assertContains(actionsHtml, '>Luchar<', 'Ally combat fight action should localize visible label');
  assertContains(actionsHtml, 'aria-label="Sincronizar"', 'Sync action should localize accessible label');
  assertContains(actionsHtml, 'aria-label="Saltar"', 'Non-player skip action should localize accessible label');
  App.selectTarget('fight');
  assertContains(elements.get('enemies-content').innerHTML, "executeActionOnTarget('fight','enemy-ally')", 'Ally target should be selected from panel');
  App.executeActionOnTarget('fight', 'enemy-ally');
  assert(enemy.CPun < 100, 'Ally panel target action should damage selected enemy');
});

test('Player combat action bar localizes visible and accessible labels', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-actions' });
  const ally = makeUnit('Ally', { id: 'ally-actions' });
  const enemy = makeUnit('Enemy', { id: 'enemy-actions', disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.updateLanguage('es');
  App.showActorActions(player);
  const html = elements.get('scene-actions').innerHTML;
  assertContains(html, 'aria-label="Luchar"', 'Fight action should localize accessible label');
  assertContains(html, '>Coquetear<', 'Flirt action should localize visible label');
  assertContains(html, 'aria-label="Devorar"', 'Feast action should localize accessible label');
  assertContains(html, '>Seducir<', 'Adult action label should localize visible label');
  assertContains(html, 'aria-label="Alimentar"', 'Feed action should localize accessible label');
  assertNotContains(html, 'showInteractMenu', 'Combat action bar should keep creature interactions in party/creature panels');
  assertNotContains(html, 'aria-label="Interactuar"', 'Combat action bar should not duplicate panel creature interactions');
  assertContains(html, 'aria-label="Huir"', 'Flee action should localize accessible label');
});

test('Party panel exposes per-ally AI order controls', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const ally = makeUnit('Ally', { aiOrder: 'defensive' });
  App.player = player;
  App.party = [player, ally];
  App.renderParty();
  const html = elements.get('party-content').innerHTML;
  assertContains(html, 'setPartyAIOrder(1,this.value)', 'Ally card should expose AI order selector');
  assertContains(html, 'value="defensive" selected', 'Selected AI order should be reflected in the selector');
});

test('Party panel exposes management controls and leader badge', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  App.player = player;
  App.party = [player, ally];
  App.partyLeaderId = 'player-1';
  App.renderParty();
  const html = elements.get('party-content').innerHTML;
  assertContains(html, '[Leader]', 'Party leader badge should render');
  assertContains(html, 'showPartyMemberStats(1)', 'Party card should expose detailed stats');
  assertContains(html, 'setPartyLeader(1)', 'Party card should expose set leader action');
  assertContains(html, 'dismissPartyMember(1)', 'Ally card should expose dismiss action');
  assertContains(html, 'draggable="true"', 'Ally card should expose drag reorder affordance');
  assertContains(html, 'startPartyDrag(1)', 'Ally card should start drag reorder');
  assertContains(html, 'dropPartyMember(1)', 'Ally card should accept drag reorder drops');
  assertContains(html, 'setPartyRole(1,this.value)', 'Ally card should expose party role selector');
  assertContains(html, 'Party role for Ally', 'Party role selector should be labeled');
});

test('Desktop party card management labels localize', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const allyA = makeUnit('Ally A', { id: 'ally-a' });
  const allyB = makeUnit('Ally B', { id: 'ally-b', aiOrder: 'defensive' });
  App.player = player;
  App.party = [player, allyA, allyB];
  App.partyLeaderId = 'player-1';
  App.updateLanguage('es');
  App.renderParty();
  const html = elements.get('party-content').innerHTML;
  assertContains(html, 'aria-label="Seleccionar Ally B para actuar"', 'Actor selection control should expose localized accessible label');
  assertContains(html, '>Actuar<', 'Actor selection visible label should localize');
  assertContains(html, 'aria-label="Marcar Ally B como objetivo"', 'Target mark control should expose localized accessible label');
  assertContains(html, '>Objetivo<', 'Target mark visible label should localize');
  assertContains(html, 'aria-label="Luchar Ally B"', 'Fight icon should expose localized accessible label');
  assertContains(html, 'aria-label="Seducir Ally B"', 'Pleasure icon should expose localized accessible label');
  assertContains(html, 'aria-label="Inspeccionar Ally B"', 'Inspect icon should expose localized accessible label');
  assertContains(html, 'aria-label="Mostrar estadisticas de Ally B"', 'Stats control should expose localized accessible label');
  assertContains(html, '>Estadisticas<', 'Stats visible label should localize');
  assertContains(html, 'aria-label="Hacer lider a Ally B"', 'Leader control should expose localized accessible label');
  assertContains(html, '>Hacer lider<', 'Leader visible label should localize');
  assertContains(html, 'aria-label="Arrastrar Ally B para reordenar"', 'Drag reorder handle should expose localized accessible label');
  assertContains(html, 'aria-label="Mover Ally B arriba"', 'Move-up control should expose localized accessible label');
  assertContains(html, 'aria-label="Rol de grupo para Ally B"', 'Party role selector should expose localized accessible label');
  assertContains(html, 'title="Rol: Sin rol especial de exploracion."', 'Party role selector title should include localized role description');
  assertContains(html, '<option value="companion" selected>Companero</option>', 'Selected role option text should localize');
  assertContains(html, '<option value="guard" >Guardia</option>', 'Role option text should localize');
  assertContains(html, 'aria-label="Orden IA para Ally B"', 'AI order selector should expose localized accessible label');
  assertContains(html, 'title="Orden IA: Prefiere posicionarse con cuidado y proteger aliados."', 'AI order selector title should include localized AI order description');
  assertContains(html, '<option value="defensive" selected>Defensivo</option>', 'Selected AI order option text should localize');
  assertContains(html, '<option value="passive" >Pasivo</option>', 'AI order option text should localize');
  assertContains(html, 'aria-label="Despedir a Ally B"', 'Dismiss control should expose localized accessible label');
  assertContains(html, '>Despedir<', 'Dismiss visible label should localize');
});

test('Desktop creature card status and detail labels localize', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const enemy = makeUnit('Murcielago', {
    id: 'bat-1',
    disposition: App.DISPOSITION.ENEMY,
    combatRow: 'back',
    expanded: true,
    stomach: [makeUnit('Stored', { size: 2, alive: true, inStomach: true })]
  });
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [enemy];
  App.combatState.active = true;
  App.updateLanguage('es');
  App.renderCreatures();
  const panelHtml = elements.get('enemies-content').innerHTML;
  assertEqual(elements.get('enemies-title').textContent, 'Enemigos', 'Enemy panel title should localize');
  assertContains(panelHtml, '[Hostil]', 'Creature disposition badge should localize');
  assertContains(panelHtml, 'Fila:Retaguardia', 'Combat row label should localize');
  assertContains(panelHtml, 'Tamano:', 'Expanded size label should localize');
  assertContains(panelHtml, 'Apetito:', 'Expanded appetite label should localize');
  assertContains(panelHtml, 'Estomago: 2/8', 'Capacity summary should localize container labels');
  assertContains(panelHtml, 'Equipo:', 'Expanded equipment label should localize');

  App.creatures = [];
  App.combatState.active = false;
  App.renderCreatures();
  assertContains(elements.get('enemies-content').innerHTML, 'No hay criaturas presentes', 'Empty creature panel should localize');
  assertContains(elements.get('mobile-creature-strip').innerHTML, 'No hay criaturas aqui', 'Empty mobile creature strip should localize');
});

test('Party management can reorder set leader and dismiss allies', () => {
  const { App } = loadAppForCombat(() => 0, { confirm: true });
  const player = makeUnit('You', { id: 'player-1' });
  const allyA = makeUnit('Ally A', { id: 'ally-a' });
  const allyB = makeUnit('Ally B', { id: 'ally-b' });
  App.player = player;
  App.party = [player, allyA, allyB];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [] }]]);
  App.creatures = [];
  App.partyLeaderId = 'player-1';
  App.explorationActorIds = ['ally-b'];
  App.movePartyMember(2, -1);
  assertEqual(App.party[1], allyB, 'Move up should reorder ally without moving before player');
  App.setPartyRole(1, 'guard');
  assertEqual(App.party[1].partyRole, 'guard', 'Set role should update ally role');
  App.setPartyLeader(1);
  assertEqual(App._getPartyLeader(), allyB, 'Set leader should update leader lookup');
  App.dismissPartyMember(1);
  assertEqual(App.party.includes(allyB), false, 'Dismiss should remove ally from party');
  assertEqual(App.partyLeaderId, 'player-1', 'Dismissing leader should fall back to player');
  assertEqual(App.explorationActorIds.includes('ally-b'), false, 'Dismiss should clear selected actor id');
  assertEqual(App.creatures[0].id, 'ally-b', 'Dismissed ally should remain in the current tile creature list');
  assertEqual(App.creatures[0].disposition, App.DISPOSITION.NEUTRAL, 'Dismissed ally should become neutral instead of staying party-owned');
  assertEqual(App.creatures[0].formerPartyMember, true, 'Dismissed ally should be marked as a former party member');
  assertEqual(App.creatures[0].formerPartyRole, 'guard', 'Dismissed ally should remember their former party role');
  assertEqual(App.worldMap.get('0,0').creatures[0].id, 'ally-b', 'Dismissed ally should persist on the current tile');
  assertContains(App.log[App.log.length - 1].text, 'remains nearby', 'Dismiss log should explain where the ally went');
});

test('Party dismissal confirmation and log localize', () => {
  const cancelled = loadAppForCombat(() => 0, { confirm: false });
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  cancelled.App.player = player;
  cancelled.App.party = [player, ally];
  cancelled.App.updateLanguage('es');
  cancelled.App.dismissPartyMember(1);
  assertEqual(cancelled.confirmations[0], 'Despedir a Ally del grupo?', 'Dismiss confirmation should localize');
  assertEqual(cancelled.App.party.includes(ally), true, 'Cancelled localized dismissal should keep ally in party');

  const approved = loadAppForCombat(() => 0, { confirm: true });
  const approvedPlayer = makeUnit('You', { id: 'player-1' });
  const approvedAlly = makeUnit('Ally', { id: 'ally-1' });
  approved.App.player = approvedPlayer;
  approved.App.party = [approvedPlayer, approvedAlly];
  approved.App.location = { x: 0, y: 0 };
  approved.App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [] }]]);
  approved.App.creatures = [];
  approved.App.updateLanguage('es');
  approved.App.dismissPartyMember(1);
  assertEqual(approved.confirmations[0], 'Despedir a Ally del grupo?', 'Approved dismissal confirmation should localize');
  assertContains(approved.App.log[approved.App.log.length - 1].text, 'deja el grupo y permanece cerca', 'Dismiss nearby log should localize');
});

test('Party role and AI order change logs localize', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  App.player = player;
  App.party = [player, ally];
  App.updateLanguage('es');

  App.setPartyRole(1, 'guard');
  assertEqual(App.log[App.log.length - 1].text, 'Ally queda asignado como guardia.', 'Party role change log should localize');

  App.setPartyAIOrder(1, 'defensive');
  assertEqual(App.log[App.log.length - 1].text, 'Ally actuara en modo defensivo.', 'Party AI order change log should localize');
});

test('Party leader and reorder logs localize', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const allyA = makeUnit('Ally A', { id: 'ally-a' });
  const allyB = makeUnit('Ally B', { id: 'ally-b' });
  App.player = player;
  App.party = [player, allyA, allyB];
  App.updateLanguage('es');

  App.setPartyLeader(2);
  assertEqual(App.log[App.log.length - 1].text, 'Ally B ahora lidera el grupo.', 'Party leader change log should localize');

  App.movePartyMember(2, -1);
  assertEqual(App.log[App.log.length - 1].text, 'Ally B cambia de posicion en el grupo.', 'Party reorder log should localize');
});

test('Party drag reorder keeps player anchored', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const allyA = makeUnit('Ally A', { id: 'ally-a' });
  const allyB = makeUnit('Ally B', { id: 'ally-b' });
  App.player = player;
  App.party = [player, allyA, allyB];
  assertEqual(App.startPartyDrag(2), true, 'Drag should start for ally cards');
  assertEqual(App.dropPartyMember(1), true, 'Drop should reorder allies');
  assertEqual(App.party[1], allyB, 'Dragged ally should move to the target slot');
  assertEqual(App.startPartyDrag(1), true, 'Drag should still start after reorder');
  assertEqual(App.dropPartyMember(0), false, 'Drop should not move an ally before the player');
  assertEqual(App.party[0], player, 'Player should stay anchored at the first slot');
});

test('Party role and AI order state persist through binary saves', () => {
  const Binary = loadBinaryForTest();
  const { App } = loadAppForCombat();
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1', partyRole: 'scout', aiOrder: 'defensive' });
  App.player = player;
  App.party = [player, ally];
  const loaded = Binary.loadGame(Binary.saveGame(App));
  assertEqual(loaded.questState.partyRoles['ally-1'], 'scout', 'Party role should persist by id');
  assertEqual(loaded.questState.partyRoles.Ally, 'scout', 'Party role should persist by name fallback');
  assertEqual(loaded.questState.partyAIOrders['ally-1'], 'defensive', 'AI order should persist by id');
});

test('Enemy target priority prefers party leader when no prey override applies', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', CPun: 20, MPun: 100 });
  const leader = makeUnit('Leader Ally', { id: 'leader-1', CPun: 100, MPun: 100 });
  const enemy = makeUnit('Enemy', { species: 'human' });
  App.player = player;
  App.party = [player, leader];
  App.partyLeaderId = 'leader-1';
  const target = App._selectEnemyTarget(enemy, App.party);
  assertEqual(target, leader, 'Enemy target selection should prefer party leader after prey/tasty checks');
});

test('Party leader state persists through binary saves', () => {
  const Binary = loadBinaryForTest();
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Leader Ally', { id: 'leader-1' });
  App.party = [App.player, ally];
  App.partyLeaderId = 'leader-1';
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.exploredTiles = new Set();
  App.inventory = [];
  const loaded = Binary.loadGame(Binary.saveGame(App));
  assertEqual(loaded.questState.partyLeaderId, 'leader-1', 'Party leader id should persist in save metadata');
});

test('Healer AI order feeds the most wounded ally during combat', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { CPun: 100, MPun: 100 });
  const healer = makeUnit('Healer', { Feed: 20, aiOrder: 'healer' });
  const wounded = makeUnit('Wounded', { CPun: 20, MPun: 100 });
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player, healer, wounded];
  App.creatures = [enemy];
  App.combatState = { active: true, xpEarned: 0, turnQueue: [], currentTurn: 0, syncActions: [] };
  App.nextTurn = function() { this._healerAdvanced = true; };
  App.allyTurn(healer);
  assertEqual(wounded.CPun, 60, 'Healer order should use feed.heal on the most wounded ally');
  assertEqual(App._healerAdvanced, true, 'Healer action should consume the ally turn');
});

test('Passive AI order holds position unless wounded', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const ally = makeUnit('Passive Ally', { aiOrder: 'passive', CPun: 100, MPun: 100 });
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY, CPun: 100 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.nextTurn = function() { this._passiveAdvanced = true; };
  App.allyTurn(ally);
  assertEqual(enemy.CPun, 100, 'Unwounded passive ally should not attack');
  assertEqual(App._passiveAdvanced, true, 'Passive ally should still advance turn flow');
});

test('Scavenger AI order feasts on corpses after victory', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { xp: 0, xpToNext: 100 });
  const scavenger = makeUnit('Scavenger', { aiOrder: 'scavenger', size: 6, appetite: 6, hunger: 60 });
  const corpse = makeUnit('Corpse', { disposition: App.DISPOSITION.CORPSE, CPun: 0, size: 2 });
  App.player = player;
  App.party = [player, scavenger];
  App.creatures = [corpse];
  App.worldMap = new Map([['0,0', { creatures: [corpse] }]]);
  App.location = { x: 0, y: 0 };
  App.combatState = { xpEarned: 0, syncActions: [], turnQueue: [], currentTurn: 0 };
  App.endCombat(true);
  assertEqual(App.creatures.includes(corpse), false, 'Scavenger should remove a fitting corpse from the tile');
  assertEqual(scavenger.stomach.length, 1, 'Scavenger should store scavenged remains in stomach capacity');
});

test('Predator enemy AI prioritizes livestock and prey targets', () => {
  const { App } = loadAppForCombat(() => 0.9);
  const enemy = makeUnit('Wolf', { species: 'wolf', disposition: App.DISPOSITION.ENEMY });
  const player = makeUnit('You', { species: 'human', CPun: 20, MPun: 100 });
  const livestock = makeUnit('Bunny Ally', { species: 'bunny', livestock: true, CPun: 100, MPun: 100 });
  const target = App._selectEnemyTarget(enemy, [player, livestock]);
  assertEqual(target, livestock, 'Predator should prefer livestock/prey over weakest non-prey target');
});

test('Outnumbered low-health enemies can flee', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You');
  const ally = makeUnit('Ally');
  const enemy = makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY, CPun: 40, MPun: 100 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.nextTurn = function() { this._enemyFledAdvanced = true; };
  App.enemyTurn(enemy);
  assertEqual(enemy.disposition, App.DISPOSITION.NEUTRAL, 'Outnumbered wounded enemy should flee on morale roll');
  assertEqual(enemy.CPun, 0, 'Fleeing enemy should be removed from combat by HP gate');
});

test('Pack enemies can call reinforcements when wounded', () => {
  const { App } = loadAppForCombat(() => 0);
  const wolf = makeUnit('Wolf', { species: 'wolf', disposition: App.DISPOSITION.ENEMY, CPun: 40, MPun: 100 });
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [wolf];
  App.combatState = { active: true, currentTurn: 0, turnQueue: [{ unit: wolf, initiative: 10 }], syncActions: [] };
  const called = App._enemyCallReinforcement(wolf);
  assertEqual(called, true, 'Wounded pack enemy should call reinforcement on successful roll');
  assert(App.creatures.some(c => c !== wolf && c.species === 'wolf'), 'Reinforcement should be added to creatures');
  assertEqual(App.combatState.turnQueue.length, 2, 'Reinforcement should be inserted into turn queue');
});

test('Ambush creatures on first-entry encounters get first strike initiative', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { spd: 30 });
  const spider = makeUnit('Spider', { species: 'spider', disposition: App.DISPOSITION.ENEMY, spd: 1, ambushReady: true });
  App.player = player;
  App.party = [player];
  App.creatures = [spider];
  App.processTurn = function() {};
  App.startCombat([spider]);
  assertEqual(App.combatState.turnQueue[0].unit, spider, 'Ambush-ready enemy should act before faster player');
  assertContains(App.log.map(e => e.text).join('\n'), 'ambush from hiding', 'Ambush should be logged');
});

test('Guard party role reduces ambush first-strike advantage', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { spd: 80 });
  const guard = makeUnit('Guard', { id: 'guard-1', partyRole: 'guard', spd: 10 });
  const spider = makeUnit('Spider', { species: 'spider', disposition: App.DISPOSITION.ENEMY, spd: 1, ambushReady: true });
  App.player = player;
  App.party = [player, guard];
  App.creatures = [spider];
  App.processTurn = function() {};
  App.startCombat([spider]);
  assertEqual(App.combatState.turnQueue[0].unit, player, 'Guard role should reduce ambush initiative enough for a very fast leader to react first');
  assertContains(App.log.map(e => e.text).join('\n'), 'ambush from hiding', 'Guard mitigation should not hide the ambush event');
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

test('Quest system exposes quest giver actions and quest log', () => {
  assertContains(appContent, 'acceptQuestFromUnit', 'Quest accept API missing');
  assertContains(appContent, 'showQuestLog', 'Quest log UI missing');
  const { App, elements } = loadAppForCombat();
  const giver = makeUnit('Guide', {
    id: 'guide-1',
    disposition: App.DISPOSITION.QUEST_GIVER,
    quest: {
      id: 'guide_task',
      title: 'Guide Task',
      objectives: [{ type: 'defeat', species: 'wolf', required: 1 }],
      reward: { xp: 10, gold: 5, items: ['Old Coin'] }
    }
  });
  App.player = makeUnit('You', { xp: 0, xpToNext: 100, gold: 0 });
  App.party = [App.player];
  App.creatures = [giver];
  App.renderCreatures();
  assertContains(elements.get('enemies-content').innerHTML, 'Accept Quest', 'Quest giver card should expose accept action');
  App.acceptQuestFromUnit('guide-1');
  assertEqual(App.quests.length, 1, 'Accepted quest should enter quest log');
  assertContains(elements.get('scene-description').innerHTML, 'Guide Task', 'Quest log should render accepted quest');
});

test('Quest progress completes defeat objectives and grants rewards', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', { xp: 0, xpToNext: 100, gold: 0 });
  App.party = [App.player];
  App.inventory = [];
  App.quests = [{
    id: 'wolf_hunt',
    title: 'Wolf Hunt',
    status: 'active',
    objectives: [{ type: 'defeat', species: 'wolf', label: 'Defeat wolf', required: 1, progress: 0, complete: false }],
    reward: { xp: 10, gold: 7, items: ['Old Coin'] }
  }];
  const wolf = makeUnit('Wolf', { id: 'wolf-1', species: 'wolf', disposition: App.DISPOSITION.ENEMY });
  App._makeCorpse(wolf, 'fight');
  assertEqual(App.quests[0].status, 'completed', 'Defeat objective should complete quest');
  assertEqual(App.player.gold, 7, 'Quest reward should grant gold');
  assertEqual(App.player.xp, 10, 'Quest reward should grant XP');
  assertEqual(App.inventory[0].name, 'Old Coin', 'Quest reward should grant item');
});

test('Quest turn-in can defer rewards until claimed from quest log', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', { xp: 0, xpToNext: 100, gold: 0 });
  App.party = [App.player];
  App.inventory = [];
  App.quests = [{
    id: 'deferred_wolf_hunt',
    title: 'Deferred Wolf Hunt',
    status: 'active',
    turnInRequired: true,
    giverName: 'Guide',
    giverLocation: { x: 3, y: -1, label: 'Guide Camp' },
    objectives: [{ type: 'defeat', species: 'wolf', label: 'Defeat wolf', required: 1, progress: 0, complete: false }],
    reward: { xp: 10, gold: 7, items: ['Old Coin'] }
  }];
  const wolf = makeUnit('Wolf', { id: 'wolf-1', species: 'wolf', disposition: App.DISPOSITION.ENEMY });
  App._makeCorpse(wolf, 'fight');
  assertEqual(App.quests[0].status, 'completed', 'Deferred quest should complete objectives');
  assertEqual(App.quests[0].rewardClaimed, false, 'Deferred quest should not mark reward claimed before turn-in');
  assertEqual(App.player.gold, 0, 'Deferred quest should not grant gold immediately');
  assertEqual(App.player.xp, 0, 'Deferred quest should not grant XP immediately');
  App.showQuestLog();
  assertContains(elements.get('scene-description').innerHTML, 'Turn In', 'Quest log should expose turn-in action for deferred rewards');
  assertContains(elements.get('scene-description').innerHTML, 'Turn in with Guide Camp (3, -1)', 'Quest log should show turn-in route when giver location is known');
  assertContains(elements.get('scene-description').innerHTML, 'Show Turn-In', 'Quest log should expose map focus for turn-in location');
  const focused = App.focusQuestTurnInOnMap('deferred_wolf_hunt');
  assertEqual(focused, true, 'Turn-in map focus should succeed when giver location is known');
  assertEqual(App.largeMapOffset.x, 3, 'Turn-in map focus should pan to giver x offset');
  assertEqual(App.largeMapOffset.y, -1, 'Turn-in map focus should pan to giver y offset');
  App.turnInQuest('deferred_wolf_hunt');
  assertEqual(App.player.gold, 7, 'Turn-in should grant deferred gold');
  assertEqual(App.player.xp, 10, 'Turn-in should grant deferred XP');
  assertEqual(App.inventory[0].name, 'Old Coin', 'Turn-in should grant deferred item');
  assertEqual(App.quests[0].rewardClaimed, true, 'Turn-in should mark reward claimed');
  assertContains(App.log.map(entry => entry.text).join('\n'), 'Quest turned in: Deferred Wolf Hunt.', 'Turn-in success feedback should be logged');
  App.updateLanguage('es');
  App.turnInQuest('deferred_wolf_hunt');
  assertEqual(App.player.gold, 7, 'Duplicate turn-in should not grant gold twice');
  assertContains(App.log[App.log.length - 1].text, 'Deferred Wolf Hunt ya fue entregada.', 'Duplicate turn-in feedback should localize');
  App.quests.push({ id: 'not_ready_quest', title: 'Not Ready', status: 'active', objectives: [], rewards: {} });
  App.turnInQuest('not_ready_quest');
  assertContains(App.log[App.log.length - 1].text, 'Esa mision aun no esta lista para entregar.', 'Not-ready turn-in feedback should localize');
});

test('Quest find objectives advance from search discoveries', () => {
  const { App } = loadAppForCombat(() => 0);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { biome: 'forest', explored: true, description: 'quiet' }]]);
  App.inventory = [];
  App.quests = [{
    id: 'herb_fetch',
    title: 'Herb Fetch',
    status: 'active',
    objectives: [{ type: 'find', item: 'Healing Herb', label: 'Find herb', required: 1, progress: 0, complete: false }],
    reward: { gold: 3 }
  }];
  App.search();
  assertEqual(App.quests[0].status, 'completed', 'Finding quest item should complete quest');
  assertEqual(App.player.gold, 3, 'Find quest should grant reward');
});

test('Escort quest checkpoints advance in route order', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', { gold: 0 });
  App.party = [App.player];
  App.quests = [{
    id: 'escort_route',
    title: 'Escort Route',
    status: 'active',
    objectives: [{
      type: 'escort',
      label: 'Guide the traveler',
      progress: 0,
      required: 2,
      checkpoints: [
        { label: 'Old Road', x: 1, y: 0 },
        { label: 'Safe Camp', x: 2, y: 0 }
      ]
    }],
    reward: { gold: 4 }
  }];
  App.quests[0] = App._normalizeQuest(App.quests[0]);
  App._updateQuestProgress('escort', { x: 2, y: 0 });
  assertEqual(App.quests[0].objectives[0].progress, 0, 'Escort should not skip ahead to later checkpoints');
  App._updateQuestProgress('escort', { x: 1, y: 0 });
  assertEqual(App.quests[0].objectives[0].progress, 1, 'Escort should advance at the first checkpoint');
  assertEqual(App.quests[0].status, 'active', 'Escort should remain active until all checkpoints are done');
  App._updateQuestProgress('escort', { x: 2, y: 0 });
  assertEqual(App.quests[0].status, 'completed', 'Escort should complete after final checkpoint');
  assertEqual(App.player.gold, 4, 'Escort completion should grant reward');
});

test('Quest log supports status filtering and title sorting', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.quests = [
    { id: 'b', title: 'B Task', status: 'completed', objectives: [], reward: {} },
    { id: 'a', title: 'A Task', status: 'active', objectives: [], reward: {} },
    { id: 'c', title: 'C Task', status: 'active', objectives: [], reward: {} }
  ];
  App.setQuestFilter('active');
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'A Task', 'Active filter should show active quests');
  assertNotContains(html, 'B Task', 'Active filter should hide completed quests');
  App.setQuestFilter('completed');
  html = elements.get('scene-description').innerHTML;
  assertContains(html, 'B Task', 'Completed filter should show completed quests');
  assertNotContains(html, 'A Task', 'Completed filter should hide active quests');
  App.setQuestFilter('all');
  App.setQuestSort('title');
  html = elements.get('scene-description').innerHTML;
  assert(html.indexOf('A Task') < html.indexOf('B Task'), 'Title sort should order quests alphabetically');
  assertContains(html, 'Status', 'Quest log should expose status filter control');
  assertContains(html, 'Sort', 'Quest log should expose sort control');
});

test('Quest log controls localize with accessible names', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.quests = [
    App._normalizeQuest({
      id: 'route_quest',
      title: 'Route Quest',
      status: 'active',
      objectives: [{ type: 'travel', label: 'Reach camp', location: { x: 2, y: 0, label: 'Camp' }, required: 1, progress: 0 }],
      reward: {}
    }),
    App._normalizeQuest({
      id: 'turn_quest',
      title: 'Turn Quest',
      status: 'completed',
      turnInRequired: true,
      rewardClaimed: false,
      giverLocation: { x: 1, y: 0, label: 'Guide' },
      objectives: [],
      reward: {}
    })
  ];
  App.updateLanguage('es');
  App.showQuestLog();
  const html = elements.get('scene-description').innerHTML;
  assertContains(html, '<h3>Misiones</h3>', 'Quest log title should localize');
  assertContains(html, 'aria-label="Estado"', 'Quest filter select should expose localized accessible label');
  assertContains(html, '>Activas<', 'Quest active filter option should localize');
  assertContains(html, 'aria-label="Ordenar"', 'Quest sort select should expose localized accessible label');
  assertContains(html, '>Titulo<', 'Quest title sort option should localize');
  assertContains(html, 'aria-label="Mostrar Route Quest en mapa"', 'Quest map action should expose localized accessible label');
  assertContains(html, '>Mostrar en mapa<', 'Quest map visible label should localize');
  assertContains(html, 'aria-label="Mostrar entrega de Turn Quest"', 'Quest turn-in map action should expose localized accessible label');
  assertContains(html, '>Mostrar entrega<', 'Quest turn-in map visible label should localize');
  assertContains(html, 'aria-label="Entregar Turn Quest"', 'Quest turn-in action should expose localized accessible label');
  assertContains(html, '>Entregar<', 'Quest turn-in visible label should localize');
  assertContains(html, 'aria-label="Volver"', 'Quest back action should expose localized accessible label');
});

test('Quest log empty states localize', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.updateLanguage('es');
  App.quests = [];
  App.showQuestLog();
  assertContains(elements.get('scene-description').innerHTML, 'No hay misiones activas.', 'Empty quest log message should localize');

  App.quests = [{ id: 'done', title: 'Done Quest', status: 'completed', objectives: [], reward: {} }];
  App.setQuestFilter('active');
  assertContains(elements.get('scene-description').innerHTML, 'No hay misiones que coincidan con el filtro actual.', 'Filtered-empty quest log message should localize');
});

test('Quest accept and completion feedback localizes', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.updateLanguage('es');
  const quest = {
    id: 'find_coin',
    title: 'Find Coin',
    objectives: [{ type: 'find', item: 'Old Coin', required: 1, progress: 0 }],
    reward: { gold: 1 }
  };
  App.acceptQuest(quest);
  assertEqual(App.log[App.log.length - 1].text, 'Mision aceptada: Find Coin.', 'Quest acceptance feedback should localize');
  App.acceptQuest(quest);
  assertEqual(App.log[App.log.length - 1].text, 'Find Coin ya esta en tu registro de misiones.', 'Duplicate quest feedback should localize');
  App._updateQuestProgress('find', { item: 'Old Coin' });
  assertEqual(App.log[App.log.length - 1].text, 'Mision completada: Find Coin.', 'Quest completion feedback should localize');

  const turnIn = {
    id: 'guide_coin',
    title: 'Guide Coin',
    turnInRequired: true,
    giverName: 'Guide',
    objectives: [{ type: 'find', item: 'Old Coin', required: 1, progress: 0 }],
    reward: { gold: 1 }
  };
  App.acceptQuest(turnIn);
  App._updateQuestProgress('find', { item: 'Old Coin' });
  assertEqual(App.log[App.log.length - 1].text, 'Mision completada: Guide Coin. Vuelve con Guide para recibir tu recompensa.', 'Turn-in completion feedback should localize');
});

test('Quest log previews routes and can focus the large map on a checkpoint', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set(['0,0']);
  App.largeMapOffset = { x: 0, y: 0 };
  App.largeMapRadius = 4;
  App.quests = [App._normalizeQuest({
    id: 'escort_route',
    title: 'Escort Route',
    status: 'active',
    objectives: [{
      type: 'escort',
      label: 'Guide traveler',
      checkpoints: [
        { label: 'Old Road', x: 4, y: 0 },
        { label: 'Safe Camp', x: 6, y: 0 }
      ]
    }],
    reward: {}
  })];
  App.showQuestLog();
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'quest-route-preview', 'Quest log should render route preview container');
  assertContains(html, 'quest-route-step current', 'Quest log should mark the next checkpoint as current');
  assertContains(html, 'quest-route-step pending', 'Quest log should mark later checkpoints as pending');
  assertContains(html, 'Current checkpoint 1: Old Road at 4, 0, 4 steps 4 east', 'Route preview should describe the current checkpoint guidance for assistive tech');
  assertContains(html, '4 steps 4 east', 'Route preview should show distance and direction to the current checkpoint');
  assertContains(html, 'Old Road</span><span style="color:var(--accent-primary);font-size:10px;">4 steps 4 east', 'Quest log should preview current route guidance');
  assertContains(html, '<span style="margin-left:auto;color:var(--text-muted);">(4, 0)', 'Quest log should preview the current route coordinates');
  assertContains(html, 'Safe Camp</span><span style="margin-left:auto;color:var(--text-muted);">(6, 0)', 'Quest log should preview later route checkpoints');
  assertContains(html, 'Show On Map', 'Quest log should expose a map focus action');
  const focused = App.focusQuestOnMap('escort_route', App.quests[0].objectives[0].id);
  assertEqual(focused, true, 'Focus action should succeed for route checkpoint');
  assertEqual(App.largeMapOffset.x, 4, 'Large map should pan to checkpoint x offset');
  assertEqual(App.largeMapOffset.y, 0, 'Large map should pan to checkpoint y offset');
  assertContains(App.log[App.log.length - 1].text, 'Map focused on Escort Route: Old Road.', 'Quest objective focus feedback should be logged');
  assertContains(elements.get('large-map').innerHTML, 'Escort Route: Old Road', 'Focused large map should show quest marker label');
  assertContains(elements.get('large-map-view').textContent, '4, 0', 'View label should reflect focused checkpoint center');
  assertEqual(App.worldMap.has('4,0'), false, 'Focusing a quest marker should not materialize unknown tiles');
  App.quests[0].objectives[0].checkpoints[0].complete = true;
  App.quests[0].objectives[0].progress = 1;
  App.showQuestLog();
  html = elements.get('scene-description').innerHTML;
  assertContains(html, 'quest-route-step complete', 'Quest log should mark finished checkpoints as complete');
  assertContains(html, 'Current checkpoint 2: Safe Camp at 6, 0, 6 steps 6 east', 'Quest log should advance current route guidance');
  App.updateLanguage('es');
  App.focusQuestOnMap('escort_route', App.quests[0].objectives[0].id);
  assertContains(App.log[App.log.length - 1].text, 'Mapa enfocado en Escort Route: Safe Camp.', 'Quest objective focus feedback should localize');
  App.quests.push({ id: 'no_marker', title: 'No Marker', status: 'active', objectives: [{ id: 'missing', type: 'find', label: 'Missing', progress: 0, required: 1 }], rewards: {} });
  App.focusQuestOnMap('no_marker', 'missing');
  assertContains(App.log[App.log.length - 1].text, 'No hay marcador de mapa disponible para ese objetivo de mision.', 'Missing objective marker feedback should localize');
  App.focusQuestTurnInOnMap('no_marker');
  assertContains(App.log[App.log.length - 1].text, 'No hay ubicacion de entrega disponible para esa mision.', 'Missing turn-in location feedback should localize');
});

test('Quest route guidance can include known terrain without materializing unknown tiles', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([
    ['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [] }],
    ['1,0', { x: 1, y: 0, biome: 'road', explored: true, creatures: [] }],
    ['2,0', { x: 2, y: 0, biome: 'road', explored: true, creatures: [] }],
    ['3,0', { x: 3, y: 0, biome: 'bridge', explored: true, creatures: [] }],
    ['3,1', { x: 3, y: 1, biome: 'swamp', explored: true, creatures: [] }]
  ]);
  App.tileDeltas = new Map();
  App.exploredTiles = new Set(['0,0', '1,0', '2,0', '3,0', '3,1']);
  const beforeSize = App.worldMap.size;
  const guidance = App._questCheckpointGuidance({ label: 'Marsh Crossing', x: 3, y: 1 });
  assertContains(guidance, '4 steps 1 south, 3 east', 'Terrain-aware guidance should keep base distance and direction');
  assertContains(guidance, 'known route crosses 2 road, 1 bridge', 'Route guidance should summarize known route terrain');
  assertContains(guidance, '1 rough terrain', 'Route guidance should flag known rough terrain');
  assertEqual(App.worldMap.size, beforeSize, 'Route guidance should not materialize unknown tiles');
  App.quests = [App._normalizeQuest({
    id: 'terrain_route',
    title: 'Terrain Route',
    status: 'active',
    objectives: [{
      type: 'travel',
      label: 'Cross the marsh',
      checkpoints: [{ label: 'Marsh Crossing', x: 3, y: 1 }]
    }],
    reward: {}
  })];
  App.showQuestLog();
  assertContains(elements.get('scene-description').innerHTML, 'known route crosses 2 road, 1 bridge; 1 rough terrain', 'Quest log should expose known terrain route guidance');
});

test('Quest state persists through binary saves', () => {
  const Binary = loadBinaryForTest();
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', { gold: 12 });
  App.party = [App.player];
  App.location = { x: 2, y: -1 };
  App.worldMap = new Map();
  App.exploredTiles = new Set();
  App.worldMeta = { worldId: 'world-save-test', seed: 'stable-seed', generatorVersion: 1, mapModsHash: 'core' };
  App.inventory = [];
  App.quests = [{ id: 'saved_quest', title: 'Saved Quest', status: 'active', objectives: [], reward: {} }];
  const loaded = Binary.loadGame(Binary.saveGame(App));
  assertEqual(loaded.version, 10, 'Save version should include quest, merchant timing, equipment, perk, and party leader state');
  assertEqual(loaded.questState.playerGold, 12, 'Player gold should persist');
  assertEqual(loaded.questState.dayCount, 0, 'Day count should persist');
  assertEqual(loaded.questState.quests[0].id, 'saved_quest', 'Quest log should persist');
  assertEqual(loaded.worldMeta.seed, 'stable-seed', 'World seed metadata should persist');
  assertEqual(loaded.worldMeta.worldId, 'world-save-test', 'World id metadata should persist');
});

test('Merchant cards expose trade actions', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', { gold: 20 });
  App.party = [App.player];
  App.creatures = [makeUnit('Trader', {
    id: 'trader-1',
    disposition: App.DISPOSITION.MERCHANT,
    stock: [{ name: 'Healing Herb', price: 10, qty: 1 }]
  })];
  App.renderCreatures();
  assertContains(elements.get('enemies-content').innerHTML, 'Trade', 'Merchant card should expose trade action');
});

test('Merchant buy and sell update gold inventory and stock', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', { gold: 40 });
  App.party = [App.player];
  App.inventory = [{ id: 'gem-1', name: 'Shiny Gem' }];
  const merchant = makeUnit('Trader', {
    id: 'trader-1',
    disposition: App.DISPOSITION.MERCHANT,
    stock: [{ name: 'Healing Herb', price: 10, qty: 1 }]
  });
  App.creatures = [merchant];
  App.buyFromMerchant('trader-1', 0);
  assertEqual(App.player.gold, 30, 'Buying should spend gold');
  assert(App.inventory.some(item => item.name === 'Healing Herb'), 'Buying should add item to inventory');
  assertEqual(merchant.stock[0].qty, 0, 'Buying should reduce stock quantity');
  assertEqual(App.log[App.log.length - 1].text, 'Bought Healing Herb for 10 gold.', 'Buying should log localized purchase feedback');
  App.sellToMerchant('trader-1', 'gem-1');
  assertEqual(App.player.gold, 55, 'Selling should grant half item value');
  assert(!App.inventory.some(item => item.id === 'gem-1'), 'Selling should remove item from inventory');
  assert(merchant.stock.some(item => item.name === 'Shiny Gem'), 'Sold item should enter merchant stock');
  assertEqual(App.log[App.log.length - 1].text, 'Sold Shiny Gem for 25 gold.', 'Selling should log localized sale feedback');
});

test('Merchant trade supports item categories and sorted stock without index drift', () => {
  const { App, elements } = loadAppForCombat(() => 0.5, { confirm: true });
  App.player = makeUnit('You', { gold: 100 });
  App.party = [App.player];
  App.inventory = [{ id: 'gem-1', name: 'Shiny Gem' }];
  const merchant = makeUnit('Trader', {
    id: 'trader-1',
    disposition: App.DISPOSITION.MERCHANT,
    stock: [
      { name: 'Old Coin', price: 10, qty: 1 },
      { name: 'Healing Herb', price: 30, qty: 1 },
      { name: 'Hide Armor', price: 60, qty: 1 }
    ]
  });
  App.creatures = [merchant];
  App.setTradeFilter('equipment', 'trader-1');
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Hide Armor', 'Equipment filter should show equipment stock');
  assertNotContains(html, 'Healing Herb', 'Equipment filter should hide consumable stock');
  App.setTradeFilter('all', 'trader-1');
  App.setTradeSort('value-desc', 'trader-1');
  html = elements.get('scene-description').innerHTML;
  assert(html.indexOf('Hide Armor') < html.indexOf('Healing Herb'), 'Value descending sort should show expensive stock first');
  App.buyFromMerchant('trader-1', 2);
  assert(App.inventory.some(item => item.name === 'Hide Armor'), 'Buying after sorted render should still use original stock index');
});

test('Merchant trade action labels localize with accessible names', () => {
  const { App, elements } = loadAppForCombat(() => 0.5);
  App.player = makeUnit('You', { gold: 100 });
  App.party = [App.player];
  App.inventory = [{ id: 'gem-1', name: 'Old Coin' }];
  const merchant = makeUnit('Trader', {
    id: 'trader-1',
    disposition: App.DISPOSITION.MERCHANT,
    stock: [{ name: 'Healing Herb', price: 10, qty: 1 }]
  });
  App.creatures = [merchant];
  App.updateLanguage('es');
  App.showTrade('trader-1');
  const html = elements.get('scene-description').innerHTML;
  assertContains(html, 'aria-label="Comprar Healing Herb"', 'Buy control should expose localized accessible label');
  assertContains(html, '>Comprar<', 'Buy visible label should localize');
  assertContains(html, 'aria-label="Vender Old Coin"', 'Sell control should expose localized accessible label');
  assertContains(html, '>Vender<', 'Sell visible label should localize');
  assertContains(html, 'aria-label="Volver"', 'Trade back control should expose localized accessible label');
  assertContains(html, 'Comercio con Trader', 'Trade heading should localize');
  assertContains(html, 'Oro: 100', 'Trade gold label should localize');
  assertContains(html, 'Categoria', 'Trade category control should localize');
  assertContains(html, '<option value="equipment" >Equipo</option>', 'Trade category option should localize');
  assertContains(html, 'Ordenar', 'Trade sort control should localize');
  assertContains(html, '<option value="value-desc" >Valor ↓</option>', 'Trade sort option should localize');
});

test('Merchant trade empty states localize', () => {
  const { App, elements } = loadAppForCombat(() => 0.5);
  App.player = makeUnit('You', { gold: 0 });
  App.party = [App.player];
  App.inventory = [];
  const merchant = makeUnit('Trader', {
    id: 'trader-1',
    disposition: App.DISPOSITION.MERCHANT,
    stock: [{ name: 'Healing Herb', price: 10, qty: 1 }]
  });
  App.creatures = [merchant];
  App.updateLanguage('es');
  App.setTradeFilter('equipment', 'trader-1');
  App.showTrade('trader-1');
  const html = elements.get('scene-description').innerHTML;
  assertContains(html, 'No hay existencias que coincidan con el filtro actual.', 'Empty merchant stock message should localize');
  assertContains(html, 'No hay articulos para vender.', 'Empty sell inventory message should localize');
});

test('Expensive merchant purchases require confirmation', () => {
  const cancelled = loadAppForCombat(() => 0.5, { confirm: false });
  cancelled.App.player = makeUnit('You', { gold: 100 });
  cancelled.App.party = [cancelled.App.player];
  const merchant = makeUnit('Trader', {
    id: 'trader-1',
    disposition: cancelled.App.DISPOSITION.MERCHANT,
    stock: [{ name: 'Hide Armor', price: 60, qty: 1 }]
  });
  cancelled.App.creatures = [merchant];
  cancelled.App.updateLanguage('es');
  cancelled.App.buyFromMerchant('trader-1', 0);
  assertEqual(cancelled.confirmations[0], 'Comprar Hide Armor por 60 de oro?', 'Expensive purchase confirmation should localize');
  assertEqual(cancelled.App.player.gold, 100, 'Cancelled expensive purchase should not spend gold');
  assertEqual(merchant.stock[0].qty, 1, 'Cancelled expensive purchase should not reduce stock');
  assert(!cancelled.App.inventory.some(item => item.name === 'Hide Armor'), 'Cancelled expensive purchase should not add item');
  assertEqual(cancelled.App.log[cancelled.App.log.length - 1].text, 'Compra cancelada: Hide Armor.', 'Cancelled purchase feedback should localize');

  const approved = loadAppForCombat(() => 0.5, { confirm: true });
  approved.App.player = makeUnit('You', { gold: 100 });
  approved.App.party = [approved.App.player];
  const approvedMerchant = makeUnit('Trader', {
    id: 'trader-1',
    disposition: approved.App.DISPOSITION.MERCHANT,
    stock: [{ name: 'Hide Armor', price: 60, qty: 1 }]
  });
  approved.App.creatures = [approvedMerchant];
  approved.App.buyFromMerchant('trader-1', 0);
  assertEqual(approved.App.player.gold, 40, 'Confirmed expensive purchase should spend gold');
  assertEqual(approvedMerchant.stock[0].qty, 0, 'Confirmed expensive purchase should reduce stock');
  assert(approved.App.inventory.some(item => item.name === 'Hide Armor'), 'Confirmed expensive purchase should add item');
});

test('Merchant stock refreshes every three in-game days', () => {
  const { App } = loadAppForCombat(() => 0);
  const merchant = makeUnit('Trader', {
    disposition: App.DISPOSITION.MERCHANT,
    stock: [{ name: 'Healing Herb', price: 10, qty: 0 }],
    stockLastRefreshDay: 0
  });
  App.dayCount = 2;
  App._refreshMerchantStock(merchant);
  assertEqual(merchant.stock[0].qty, 0, 'Stock should not refresh before three days');
  App._advanceTime(24);
  App._refreshMerchantStock(merchant);
  assert(merchant.stock.some(item => item.qty > 0), 'Stock should refresh after three days');
  assertEqual(merchant.stockLastRefreshDay, 3, 'Refresh day should update');
});

test('Authored merchant stock tables create normalized stock and refresh by table', () => {
  const { App } = loadAppForCombat(() => 0);
  const stock = App._merchantStockFromTable('outfitter');
  assert(stock.some(item => item.name === 'Hide Armor'), 'Outfitter table should include authored equipment');
  assert(stock.every(item => item.id && item.price > 0 && item.qty > 0), 'Authored stock should normalize ids prices and quantities');
  const merchant = makeUnit('Outfitter', {
    disposition: App.DISPOSITION.MERCHANT,
    stockTable: 'outfitter',
    stock: [{ name: 'Healing Herb', price: 10, qty: 0 }],
    stockLastRefreshDay: 0
  });
  App.dayCount = 3;
  App._refreshMerchantStock(merchant);
  assert(merchant.stock.some(item => item.name === 'Clawed Gloves'), 'Refresh should rebuild from the merchant stock table');
  assert(!merchant.stock.some(item => item.name === 'Monster Fang'), 'Refresh should not fall back to generic stock when a table is set');
});

test('Structure encounters can place authored merchants with trade actions', () => {
  const rolls = [0, 0, 0.99];
  const { App, elements } = loadAppForCombat(() => rolls.length ? rolls.shift() : 0.99);
  App.player = makeUnit('You', { level: 2, gold: 100 });
  App.party = [App.player];
  App.currentBiome = 'road';
  App.creatures = [];
  const tile = { x: 1, y: 0, biome: 'road', structure: 'camp', creatures: [], structureSpawned: false };
  App.spawnStructureEncounter(tile, true);
  const merchant = App.creatures.find(c => c.disposition === App.DISPOSITION.MERCHANT);
  assert(merchant, 'Camp structure should be able to place a merchant');
  assertEqual(merchant.stockTable, 'traveler', 'Camp merchant should use the authored traveler table');
  assert(merchant.stock.some(item => item.name === 'Lucky Charm'), 'Placed merchant should carry authored traveler stock');
  App.renderCreatures();
  assertContains(elements.get('enemies-content').innerHTML, 'Trade', 'Placed merchant should expose trade action');
  assertEqual(tile.structureSpawned, true, 'Structure spawn should be marked complete after merchant placement');
});

test('Structure encounters can place authored quest givers', () => {
  const rolls = [0.99, 0, 0, 0, 0.99];
  const { App, elements } = loadAppForCombat(() => rolls.length ? rolls.shift() : 0.99);
  App.player = makeUnit('You', { level: 2, gold: 0, xp: 0, xpToNext: 100 });
  App.party = [App.player];
  App.currentBiome = 'road';
  App.creatures = [];
  App.quests = [];
  const tile = { x: 2, y: 0, biome: 'road', structure: 'shrine', creatures: [], structureSpawned: false };
  App.spawnStructureEncounter(tile, true);
  const giver = App.creatures.find(c => c.disposition === App.DISPOSITION.QUEST_GIVER);
  assert(giver, 'Shrine structure should be able to place a quest giver');
  assertEqual(giver.quest.templateId, 'shrine_relic', 'Placed quest giver should use authored quest template');
  assertEqual(giver.quest.id, 'shrine_relic_2_0', 'Authored quest id should be stable for the structure tile');
  App.renderCreatures();
  assertContains(elements.get('enemies-content').innerHTML, 'Accept Quest', 'Placed quest giver should expose quest action');
  App.acceptQuestFromUnit(giver.id);
  assertEqual(App.quests.length, 1, 'Accepted authored structure quest should enter quest log');
  assertEqual(App.quests[0].title, 'Shrine Offering', 'Accepted structure quest should preserve authored title');
  assertEqual(App.quests[0].turnInRequired, true, 'Accepted structure quest should preserve authored turn-in behavior');
  assertEqual(App.quests[0].giverLocation.x, 2, 'Accepted structure quest should store giver x for turn-in routing');
  assertEqual(App.quests[0].giverLocation.y, 0, 'Accepted structure quest should store giver y for turn-in routing');
  assertEqual(tile.structureSpawned, true, 'Structure spawn should be marked complete after quest placement');
});

test('Equipment registry defines slots and item bonuses', () => {
  assertContains(appContent, 'EQUIPMENT_SLOTS', 'Equipment slots registry missing');
  assertContains(appContent, "slot: 'body'", 'Body equipment slot missing from item registry');
  assertContains(appContent, 'equipBonus', 'Equipment bonus field missing from item registry');
});

test('Equipping and unequipping items updates player stats and slots', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', { con: 10 });
  App.party = [App.player];
  App.inventory = [{ id: 'armor-1', name: 'Hide Armor' }];
  App.equipItem('armor-1');
  assertEqual(App.player.equipment.body.name, 'Hide Armor', 'Equipped item should occupy its slot');
  assertEqual(App.player.con, 13, 'Equipment bonus should apply to stats');
  assertEqual(App.player.equipmentBaseStats.con, 10, 'Equipment should capture unmodified baseline stats');
  assertEqual(App.inventory.length, 0, 'Equipped item should leave inventory');
  App.unequipItem('body');
  assertEqual(App.player.equipment.body, null, 'Unequipped slot should be empty');
  assertEqual(App.player.con, 10, 'Equipment bonus should be removed');
  assertEqual(App.inventory[0].name, 'Hide Armor', 'Unequipped item should return to inventory');
});

test('Equipment recalculation infers legacy baselines without stat drift', () => {
  const { App } = loadAppForCombat();
  const player = makeUnit('You', {
    con: 13,
    equipment: {
      head: null,
      body: { id: 'armor-1', name: 'Hide Armor' },
      hands: null,
      feet: null,
      accessory1: null,
      accessory2: null
    }
  });
  App.player = player;
  App.party = [player];
  App._recalculateEquipment(player, { inferBase: true });
  assertEqual(player.equipmentBaseStats.con, 10, 'Legacy equipped stats should infer pre-equipment baseline');
  assertEqual(player.con, 13, 'Recalculation should keep equipped stat total stable');
  App.inventory = [];
  App.unequipItem('body');
  assertEqual(player.con, 10, 'Unequipping inferred legacy equipment should return to baseline');
});

test('Accessory equipment can apply non-numeric special effects', () => {
  const lucky = loadAppForCombat(() => 0.35);
  lucky.App.player = makeUnit('You', { Flee: 10, wis: 10 });
  lucky.App.party = [lucky.App.player];
  lucky.App.inventory = [{ id: 'charm-1', name: 'Lucky Charm' }];
  lucky.App.location = { x: 0, y: 0 };
  lucky.App.worldMap = new Map([['0,0', { biome: 'forest', explored: true, description: 'quiet' }]]);
  lucky.App.equipItem('charm-1');
  assertEqual(lucky.App.player.equipmentEffects.luckyFind, 1, 'Lucky Charm should apply its special effect');
  lucky.App.search();
  assertEqual(lucky.App.inventory.length, 1, 'Lucky find effect should turn borderline search rolls into item finds');
  lucky.App.unequipItem('accessory1');
  assertEqual(Boolean(lucky.App.player.equipmentEffects.luckyFind), false, 'Unequipping should remove special effect');

  const focus = loadAppForCombat();
  focus.App.player = makeUnit('You', { status: { charm: { turns: 2, by: 'Enemy' } }, equipment: { accessory2: { id: 'ring-1', name: 'Focus Ring' } } });
  focus.App._rebuildEquipmentEffects(focus.App.player);
  assertEqual(focus.App._charmedTargetsFor(focus.App.player), null, 'Focus Ring should suppress charm target confusion');
  assertEqual(Boolean(focus.App.player.status.charm), false, 'Focus Ring should clear charm status when it resists');
});

test('Inventory and character stats render equipped items', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', {
    equipment: {
      head: { id: 'cap-1', name: 'Leather Cap' },
      body: null,
      hands: null,
      feet: null,
      accessory1: null,
      accessory2: null
    }
  });
  App.party = [App.player];
  App.inventory = [{ id: 'ring-1', name: 'Focus Ring' }];
  App.showInventory();
  assertContains(elements.get('scene-description').innerHTML, 'Equipped', 'Inventory should show equipped section');
  assertContains(elements.get('scene-description').innerHTML, 'Focus Ring', 'Inventory should show equippable item');
  assertContains(elements.get('scene-description').innerHTML, 'Equip', 'Inventory should expose equip action');
  App.showCharacterStats();
  assertContains(elements.get('scene-description').innerHTML, 'Leather Cap', 'Character stats should list equipped item');
});

test('Inventory equipment summary labels localize', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', {
    equipment: {
      head: null,
      body: null,
      hands: null,
      feet: null,
      accessory1: null,
      accessory2: null
    }
  });
  App.party = [App.player];
  App.inventory = [{ id: 'coin-1', name: 'Old Coin' }];
  App.updateLanguage('es');
  App.showInventory();
  const html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Inventario (1/20)', 'Inventory title should localize with count');
  assertContains(html, 'Equipado', 'Equipped section heading should localize');
  assertContains(App._equipmentCompactSummary(App.player), 'Sin equipo', 'Compact empty equipment summary should localize');
  assertEqual(App._equipmentBonusText({ id: 'coin-1', name: 'Old Coin' }), 'Sin bonificacion', 'No-bonus equipment text should localize');
});

test('Inventory full feedback localizes for equipment management', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', {
    equipment: {
      head: { id: 'cap-1', name: 'Leather Cap' },
      body: null,
      hands: null,
      feet: null,
      accessory1: null,
      accessory2: null
    }
  });
  App.party = [App.player];
  App.inventory = Array.from({ length: App.MAX_INVENTORY }, (_, index) => ({ id: `filler-${index}`, name: 'Herb' }));
  App.updateLanguage('es');
  App.unequipItem('head');
  assertContains(App.log[App.log.length - 1].text, 'El inventario esta lleno.', 'Full inventory equipment feedback should localize');
  assertEqual(App.player.equipment.head.name, 'Leather Cap', 'Full inventory should block unequip');
});

test('Player card and character stats use the same live display stats', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', {
    CPun: 90,
    MPun: 120,
    CPle: 55,
    MPle: 130,
    level: 3,
    str: 14,
    con: 15,
    spd: 16,
    int: 17,
    wis: 18,
    cha: 19,
    Figh: 21,
    Feas: 22,
    Flir: 23,
    Fuck: 24,
    Flee: 25,
    Feed: 26,
    expanded: true,
    stats: { str: 1, con: 1, spd: 1, int: 1, wis: 1, cha: 1 }
  });
  App.party = [App.player];
  const cardHtml = App.renderUnitCard(App.player, 0, 'party');
  App.showCharacterStats();
  const statsHtml = elements.get('scene-description').innerHTML;
  assertContains(cardHtml, 'Pun:90/120 Ple:55/130 Lv:3', 'Player card should render live top-level vitals');
  assertContains(cardHtml, 'Figh:</span> 21', 'Expanded card stats should use live top-level combat stats');
  assertContains(statsHtml, '90/120', 'Character stats should match player card punishment');
  assertContains(statsHtml, '55/130', 'Character stats should match player card pleasure');
  assertContains(statsHtml, 'Figh: 21', 'Character stats should use live top-level combat stats');
  assertContains(statsHtml, 'STR: 14', 'Character stats should ignore stale nested stats when live attributes exist');
});

test('Player stats view converges on party player when references drift', () => {
  const { App, elements } = loadAppForCombat();
  const stalePlayer = makeUnit('You', { id: 'player-1', CPun: 5, MPun: 100, Figh: 5, str: 5 });
  const livePartyPlayer = makeUnit('You', { id: 'player-1', CPun: 80, MPun: 120, Figh: 30, str: 16, expanded: true });
  App.player = stalePlayer;
  App.party = [livePartyPlayer];
  App.renderParty();
  App.showCharacterStats();
  const cardHtml = elements.get('party-content').innerHTML;
  const statsHtml = elements.get('scene-description').innerHTML;
  assertEqual(App.player, livePartyPlayer, 'Player reference should converge on the canonical party member');
  assertContains(cardHtml, 'Pun:80/120', 'Party card should render the live party player stats');
  assertContains(statsHtml, '80/120', 'Character stats should render the same live punishment value');
  assertContains(statsHtml, 'Figh: 30', 'Character stats should render the same live combat value');
  assertContains(statsHtml, 'STR: 16', 'Character stats should render the same live attribute value');
  assertNotContains(statsHtml, '5/100', 'Character stats should not render stale duplicate player vitals');
});

test('Inventory action labels localize with accessible names', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', {
    equipment: {
      head: { id: 'cap-1', name: 'Leather Cap' },
      body: null,
      hands: null,
      feet: null,
      accessory1: null,
      accessory2: null
    }
  });
  App.party = [App.player];
  App.inventory = [
    { id: 'herb-1', name: 'Healing Herb' },
    { id: 'ring-1', name: 'Focus Ring' }
  ];
  App.updateLanguage('es');
  App.showInventory();
  const html = elements.get('scene-description').innerHTML;
  assertContains(html, 'aria-label="Desequipar Head"', 'Unequip control should expose localized accessible label');
  assertContains(html, '>Desequipar Head<', 'Unequip visible label should localize');
  assertContains(html, 'aria-label="Usar Healing Herb"', 'Use control should expose localized accessible label');
  assertContains(html, '>Usar<', 'Use visible label should localize');
  assertContains(html, 'aria-label="Equipar Focus Ring"', 'Equip control should expose localized accessible label');
  assertContains(html, '>Equipar<', 'Equip visible label should localize');
  assertContains(html, 'Efecto: focusGuard', 'Equipment effect label should localize');
  assertContains(html, 'aria-label="Soltar Focus Ring"', 'Drop control should expose localized accessible label');
  assertContains(html, '>Soltar<', 'Drop visible label should localize');
  assertContains(html, 'aria-label="Volver"', 'Back control should expose localized accessible label');
});

test('Inventory equip and unequip feedback localizes', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.inventory = [{ id: 'ring-1', name: 'Focus Ring' }];
  App.updateLanguage('es');
  App.equipItem('ring-1');
  assertEqual(App.log[App.log.length - 1].text, 'Equipaste Focus Ring.', 'Equip feedback should localize');
  App.unequipItem('accessory2');
  assertEqual(App.log[App.log.length - 1].text, 'Desequipaste Focus Ring.', 'Unequip feedback should localize');
});

test('Inventory supports item categories and sorting', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.inventory = [
    { id: 'herb-1', name: 'Healing Herb' },
    { id: 'armor-1', name: 'Hide Armor' },
    { id: 'coin-1', name: 'Old Coin' }
  ];
  App.setInventoryFilter('equipment');
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Hide Armor', 'Equipment filter should show equipment');
  assertNotContains(html, 'Healing Herb', 'Equipment filter should hide consumables');
  App.setInventoryFilter('all');
  App.setInventorySort('value-asc');
  html = elements.get('scene-description').innerHTML;
  assert(html.indexOf('Old Coin') < html.indexOf('Healing Herb'), 'Value ascending sort should show cheaper items first');
  App.updateLanguage('es');
  App.showInventory();
  html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Categoria', 'Inventory should expose localized category control');
  assertContains(html, '<option value="all" selected>Todos</option>', 'Inventory all-category option should localize');
  assertContains(html, 'Ordenar', 'Inventory should expose localized sort control');
  assertContains(html, '<option value="value-asc" selected>Valor ↑</option>', 'Inventory value sort option should localize');
});

test('Inventory empty states localize', () => {
  const { App, elements } = loadAppForCombat(() => 0.5);
  App.player = makeUnit('You');
  App.party = [App.player];
  App.updateLanguage('es');
  App.inventory = [];
  App.showInventory();
  assertContains(elements.get('scene-description').innerHTML, 'Vacio.', 'Empty inventory message should localize');

  App.inventory = [{ id: 'herb-1', name: 'Healing Herb' }];
  App.setInventoryFilter('equipment');
  assertContains(elements.get('scene-description').innerHTML, 'No hay articulos que coincidan con el filtro actual.', 'Filtered-empty inventory message should localize');
});

test('Non-player equipment renders as read-only card metadata', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You');
  const ally = makeUnit('Ally', {
    id: 'ally-equipped',
    equipment: { body: { id: 'armor-ally', name: 'Hide Armor' } },
    equipmentBaseStats: null
  });
  const merchant = makeUnit('Outfitter', {
    id: 'npc-equipped',
    disposition: App.DISPOSITION.MERCHANT,
    expanded: true,
    equipment: { head: { id: 'cap-npc', name: 'Leather Cap' } },
    equipmentBaseStats: null
  });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [merchant];
  App._normalizeUnit(ally, { disposition: App.DISPOSITION.PARTY });
  App._normalizeUnit(merchant, { disposition: App.DISPOSITION.MERCHANT });
  App.renderCreatures();
  assertContains(elements.get('enemies-content').innerHTML, 'Equipment:', 'Expanded creature card should expose equipment metadata');
  assertContains(elements.get('enemies-content').innerHTML, 'Head: Leather Cap', 'Creature equipment should render read-only equipped item names');
  App.showPartyMemberStats(1);
  const statsHtml = elements.get('scene-description').innerHTML;
  assertContains(statsHtml, 'class="party-stats-view"', 'Ally stats should render in a bounded stats view');
  assertContains(statsHtml, 'class="party-stats-footer"', 'Ally stats should keep the close action in a sticky footer');
  assertContains(statsHtml, 'aria-label="Close"', 'Ally stats should expose an immediate localized close action');
  assertContains(statsHtml, 'App.closeSceneDetails()', 'Ally stats close action should return to the current scene details');
  assertContains(statsHtml, '<strong>Equipment</strong>', 'Ally stats should expose equipment section');
  assertContains(statsHtml, 'Body: Hide Armor', 'Ally equipment should render read-only in stats');
  assertContains(elements.get('mobile-scene-description').innerHTML, 'class="party-stats-view"', 'Ally stats should also render in the mobile scene sheet');
  assertNotContains(statsHtml, 'equipItem(', 'Non-player equipment stats should not expose player equip controls');
  assertNotContains(statsHtml, 'unequipItem(', 'Non-player equipment stats should not expose player unequip controls');
});

test('Rich scene details suppress stale context actions while open', () => {
  const { App, document } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  const actions = document.getElementById('scene-actions');
  actions.innerHTML = '<button>Old action</button>';
  actions.style.display = 'flex';
  App.showCharacterStats();
  assertEqual(actions.style.display, 'none', 'Rich stats should hide the main context action bar');
  assertEqual(actions.dataset.richHidden, 'true', 'Hidden rich action state should be tracked');
});

test('Closing stats during combat restores the active party turn', () => {
  const { App, elements } = loadAppForCombat();
  const player = makeUnit('You', { id: 'player-1' });
  const enemy = makeUnit('Enemy', { id: 'enemy-1', disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState = {
    active: true,
    round: 2,
    currentTurn: 0,
    processing: false,
    xpEarned: 0,
    turnQueue: [{ unit: player, initiative: 20 }, { unit: enemy, initiative: 10 }],
    syncActions: []
  };
  App.showCharacterStats();
  assertEqual(elements.get('scene-actions').style.display, 'none', 'Combat stats should hide stale combat actions while open');
  App.closeSceneDetails();
  assertEqual(App.combatState.active, true, 'Closing combat stats should not leave combat mode');
  assertContains(elements.get('scene-title').textContent, "Round 2 - You's turn", 'Closing combat stats should restore the combat turn title');
  assertContains(elements.get('scene-actions').innerHTML, "selectTarget('fight')", 'Closing combat stats should restore player combat actions');
  assertEqual(elements.get('scene-actions').style.display, '', 'Closing combat stats should restore action bar display');
});

test('Closing stats during an enemy turn does not reveal stale player actions', () => {
  const { App, elements, document } = loadAppForCombat();
  const player = makeUnit('You', { id: 'player-1' });
  const enemy = makeUnit('Enemy', { id: 'enemy-1', disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState = {
    active: true,
    round: 2,
    currentTurn: 1,
    processing: false,
    xpEarned: 0,
    turnQueue: [{ unit: player, initiative: 20 }, { unit: enemy, initiative: 10 }],
    syncActions: []
  };
  document.getElementById('scene-actions').innerHTML = '<button>Stale player action</button>';
  App.showCharacterStats();
  App.closeSceneDetails();
  assertEqual(App.combatState.active, true, 'Closing enemy-turn stats should keep combat mode active');
  assertContains(elements.get('scene-title').textContent, "Round 2 - Enemy's turn", 'Closing enemy-turn stats should restore enemy turn title');
  assertEqual(elements.get('scene-actions').innerHTML, '', 'Closing enemy-turn stats should clear stale player actions');
  assertEqual(elements.get('scene-actions').style.display, '', 'Closing enemy-turn stats should restore action bar display state');
});

test('Party member stats labels localize and escape names', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally <One>', { id: 'ally-1', species: 'wolf' });
  App.player = player;
  App.party = [player, ally];
  App.updateLanguage('es');
  App.showPartyMemberStats(1);
  const html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Ally &lt;One&gt;', 'Party stats should escape unit names');
  assertContains(html, '<strong>Equipo</strong>', 'Party stats equipment label should localize');
  assertContains(html, 'aria-label="Cerrar"', 'Party stats close action should localize');
});

test('Equipment state persists through binary saves', () => {
  const Binary = loadBinaryForTest();
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', {
    gold: 1,
    equipment: {
      head: { id: 'cap-1', name: 'Leather Cap' },
      body: null,
      hands: null,
      feet: null,
      accessory1: null,
      accessory2: null
    }
  });
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.exploredTiles = new Set();
  App.inventory = [];
  App.player.equipmentBaseStats = { con: 10, str: 10, spd: 10, int: 10, wis: 10, cha: 10, Figh: 10, Feas: 10, Flir: 10, Fuck: 10, Flee: 10, Feed: 10 };
  const loaded = Binary.loadGame(Binary.saveGame(App));
  assertEqual(loaded.questState.playerEquipment.head.name, 'Leather Cap', 'Equipped item should persist in save metadata');
  assertEqual(loaded.questState.playerEquipmentBaseStats.con, 10, 'Equipment baseline stats should persist in save metadata');
});

test('Perk tree queues player choices on level up instead of random perks', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', { level: 1, xp: 90, xpToNext: 100, perks: [], pendingPerkChoices: 0 });
  App.party = [App.player];
  App.updateLanguage('es');
  App.gainXP(20);
  assertEqual(App.player.level, 2, 'XP should level the player');
  assertEqual(App.player.pendingPerkChoices, 1, 'Level up should queue a perk choice');
  assertEqual(App.player.perks.length, 0, 'Level up should not randomly assign a perk');
  assertContains(elements.get('scene-description').innerHTML, 'Elegir mejora', 'Level up should show localized perk selection UI');
  assertContains(App.log.map(entry => entry.text).join('\n'), 'Subiste de nivel! Ahora eres nivel 2.', 'Level-up feedback should localize');
  assertContains(App.log.map(entry => entry.text).join('\n'), 'Elige una nueva mejora del arbol de mejoras.', 'Queued perk feedback should localize');
});

test('Perk choices apply bonuses and enforce tree prerequisites', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', { Figh: 10, Feas: 10, str: 10, perks: [], pendingPerkChoices: 1 });
  App.party = [App.player];
  App.updateLanguage('es');
  assertEqual(App._canChoosePerk(App.PERK_TREES.predator.perks[1], 'predator'), false, 'Voracious should require one predator perk');
  App.choosePerk('voracious');
  assertContains(App.log[App.log.length - 1].text, 'Esa mejora aun no esta disponible.', 'Unavailable perk feedback should localize');
  App.choosePerk('predator_instinct');
  assertEqual(App.player.Figh, 12, 'Chosen perk should apply its stat bonus');
  assertEqual(App.player.perks[0].perkEffect, 'predatorScent', 'Chosen perk should preserve its special effect');
  assertEqual(App.player.pendingPerkChoices, 0, 'Choosing a perk should consume one pending choice');
  assertContains(App.log[App.log.length - 1].text, 'Mejora elegida: Predator Instinct.', 'Chosen perk feedback should localize');
  App.player.pendingPerkChoices = 1;
  assertEqual(App._canChoosePerk(App.PERK_TREES.predator.perks[1], 'predator'), true, 'Prerequisite should pass after one predator perk');
  App.choosePerk('voracious');
  assertEqual(App.player.Feas, 13, 'Second-tier perk should apply bonus');
});

test('Non-numeric perk effects can modify exploration and combat status behavior', () => {
  const searchCase = loadAppForCombat(() => 0.35);
  searchCase.App.player = makeUnit('You', { perks: [{ id: 'predator_instinct', perkEffect: 'predatorScent' }] });
  searchCase.App.party = [searchCase.App.player];
  searchCase.App.inventory = [];
  searchCase.App.location = { x: 0, y: 0 };
  searchCase.App.worldMap = new Map([['0,0', { biome: 'forest', explored: true, description: 'quiet' }]]);
  searchCase.App.search();
  assertEqual(searchCase.App.inventory.length, 1, 'Predator scent should improve search find chance');

  const fearCase = loadAppForCombat(() => 0);
  const unit = makeUnit('Stalwart', { status: { fear: { turns: 2, by: 'Enemy' } }, perks: [{ id: 'iron_will', perkEffect: 'fearResist' }] });
  const skipped = fearCase.App._skipTurnFromStatus(unit);
  assertEqual(skipped, null, 'Fear resist perk should prevent fear turn loss');
  assertEqual(Boolean(unit.status.fear), false, 'Fear resist perk should clear fear status');
});

test('Species-specific perk variants are available only to matching species', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', { species: 'wolf', Figh: 10, Feas: 10, perks: [], pendingPerkChoices: 1 });
  App.party = [App.player];
  const wolfChoices = App._availablePerkChoices();
  assert(wolfChoices.some(perk => perk.id === 'wolf_pack_instinct'), 'Wolf player should see wolf-specific perk');
  assert(!wolfChoices.some(perk => perk.id === 'bunny_quickstep'), 'Wolf player should not see bunny-specific perk');
  App.showPerkSelection();
  assertContains(elements.get('scene-description').innerHTML, 'Wolf', 'Perk UI should render species-specific tree');
  App.choosePerk('wolf_pack_instinct');
  assertEqual(App.player.Figh, 12, 'Species perk should apply its stat bonus');
  assertEqual(App.player.perks[0].species, 'wolf', 'Chosen species perk should preserve its species metadata');
  App.player.pendingPerkChoices = 1;
  assertEqual(App._canChoosePerk(App.SPECIES_PERK_TREES.wolf.perks[1], 'species:wolf'), true, 'Species perk prerequisite should unlock from prior species perk');
});

test('Character stats expose pending perk selection', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You <Hero>', { perks: [], pendingPerkChoices: 2 });
  App.party = [App.player];
  App.showCharacterStats();
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'class="party-stats-view character-stats-view"', 'Character stats should render in the bounded stats view');
  assertContains(html, 'class="party-stats-footer"', 'Character stats should keep close/perk actions in a sticky footer');
  assertContains(html, 'You &lt;Hero&gt;', 'Character stats should escape player names');
  assertContains(html, 'App.closeSceneDetails()', 'Character stats close action should return to the current scene details');
  assertContains(html, 'Choose Perk (2)', 'Character stats should show pending perk button');
  assertContains(elements.get('mobile-scene-description').innerHTML, 'class="party-stats-view character-stats-view"', 'Character stats should also render in the mobile scene sheet');
  App.showPerkSelection();
  assertContains(elements.get('scene-description').innerHTML, 'Predator', 'Perk selection should render predator tree');
  assertContains(elements.get('scene-description').innerHTML, 'Seducer', 'Perk selection should render seducer tree');
  assertContains(elements.get('scene-description').innerHTML, 'Survivor', 'Perk selection should render survivor tree');
});

test('Perk and stat progression controls localize with accessible names', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', {
    species: 'wolf',
    perks: [{ id: 'predator_instinct', tree: 'predator', name: 'Predator Instinct', stat: 'Figh', val: 2 }],
    pendingPerkChoices: 1
  });
  App.party = [App.player];
  App.updateLanguage('es');
  App.showCharacterStats();
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'aria-label="Elegir mejora (1)"', 'Pending perk button should expose localized accessible label');
  assertContains(html, '>Elegir mejora (1)<', 'Pending perk visible label should localize');
  assertContains(html, 'aria-label="Reiniciar mejoras"', 'Respec button should expose localized accessible label');
  assertContains(html, '>Reiniciar mejoras<', 'Respec visible label should localize');
  assertContains(html, 'aria-label="Debug +1 opcion de mejora"', 'Debug perk button should expose localized accessible label');
  assertContains(html, 'aria-label="Cerrar"', 'Character stats close button should expose localized accessible label');
  assertContains(html, '<strong>Estadisticas de combate</strong>', 'Character combat stats label should localize');
  assertContains(html, '<strong>Cuerpo</strong>', 'Character body section label should localize');
  assertContains(html, '<strong>Herramientas de mejoras</strong>', 'Character perk tools label should localize');

  App.showPerkSelection();
  html = elements.get('scene-description').innerHTML;
  assertContains(html, '<h3>Elegir mejora</h3>', 'Perk picker title should localize');
  assertContains(html, 'Opciones pendientes: 1', 'Perk pending choice copy should localize');
  assertContains(html, 'aria-label="Arboles de mejoras"', 'Perk tree tablist should expose localized accessible label');
  assertContains(html, 'aria-label="Todas"', 'Perk all filter should localize');
  assertContains(html, 'aria-label="Elegir Pack Instinct"', 'Perk choice should expose localized accessible label');
  assertContains(html, 'aria-label="Volver"', 'Perk picker back button should expose localized accessible label');
});

test('Perk selection filters trees without hiding available species perks', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You', { species: 'wolf', perks: [], pendingPerkChoices: 1 });
  App.party = [App.player];
  App.showPerkSelection();
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'data-perk-filter="predator"', 'Perk modal should expose archetype tree filters');
  assertContains(html, 'data-perk-filter="species:wolf"', 'Perk modal should expose matching species tree filter');
  assertContains(html, 'Predator Instinct', 'All filter should show predator perks');
  assertContains(html, 'Pack Instinct', 'All filter should show species perks');

  App.setPerkTreeFilter('species:wolf');
  html = elements.get('scene-description').innerHTML;
  assertEqual(App.perkTreeFilter, 'species:wolf', 'Species filter should become active');
  assertContains(html, 'Pack Instinct', 'Species filter should keep species perks visible');
  assertNotContains(html, 'Predator Instinct', 'Species filter should hide other trees');

  App.setPerkTreeFilter('not-real');
  assertEqual(App.perkTreeFilter, 'all', 'Invalid perk filter should fall back to all');
  assertContains(elements.get('scene-description').innerHTML, 'Predator Instinct', 'Fallback should render all trees again');
});

test('Perk respec and debug tools refund choices and rollback bonuses', () => {
  const cancelled = loadAppForCombat(() => 0.5, { confirm: false });
  cancelled.App.player = makeUnit('You', { Figh: 10, Feas: 10, perks: [], pendingPerkChoices: 1 });
  cancelled.App.party = [cancelled.App.player];
  cancelled.App.choosePerk('predator_instinct');
  cancelled.App.respecPerks();
  assertEqual(cancelled.App.player.perks.length, 1, 'Cancelled respec should keep selected perks');
  assertEqual(cancelled.App.player.Figh, 12, 'Cancelled respec should keep perk stat bonuses');

  const { App, elements } = loadAppForCombat(() => 0.5, { confirm: true });
  App.player = makeUnit('You', { Figh: 10, Feas: 10, perks: [], pendingPerkChoices: 1 });
  App.party = [App.player];
  App.updateLanguage('es');
  App.respecPerks();
  assertContains(App.log[App.log.length - 1].text, 'No hay mejoras seleccionadas para reiniciar.', 'Empty respec feedback should localize');
  App.choosePerk('predator_instinct');
  App.player.pendingPerkChoices = 1;
  App.choosePerk('voracious');
  assertEqual(App.player.Figh, 12, 'First perk should apply before respec');
  assertEqual(App.player.Feas, 13, 'Second perk should apply before respec');
  App.showCharacterStats();
  let html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Reiniciar mejoras', 'Character stats should expose localized perk respec tool');
  assertContains(html, 'Debug +1 opcion de mejora', 'Character stats should expose localized debug perk choice tool');

  App.respecPerks();
  assertEqual(App.player.perks.length, 0, 'Respec should clear selected perks');
  assertEqual(App.player.pendingPerkChoices, 2, 'Respec should refund selected perk choices');
  assertEqual(App.player.Figh, 10, 'Respec should remove Figh bonus');
  assertEqual(App.player.Feas, 10, 'Respec should remove Feas bonus');
  assertContains(App.log[App.log.length - 1].text, 'Mejoras reiniciadas. Se reembolsaron 2 opciones.', 'Respec completion feedback should localize');

  App.debugGrantPerkChoice(2);
  assertEqual(App.player.pendingPerkChoices, 4, 'Debug grant should add perk choices for balancing');
  html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Elegir mejora (4)', 'Debug grant should refresh character stats with localized pending count');
});

test('Perk state persists through binary saves', () => {
  const Binary = loadBinaryForTest();
  const { App } = loadAppForCombat();
  App.player = makeUnit('You', {
    perks: [{ id: 'predator_instinct', tree: 'predator', name: 'Predator Instinct', stat: 'Figh', val: 2 }],
    pendingPerkChoices: 1
  });
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.exploredTiles = new Set();
  App.inventory = [];
  const loaded = Binary.loadGame(Binary.saveGame(App));
  assertEqual(loaded.questState.playerPerks[0].id, 'predator_instinct', 'Selected perks should persist');
  assertEqual(loaded.questState.pendingPerkChoices, 1, 'Pending perk choices should persist');
});

test('Combat log template exposes filters search and export controls', () => {
  assertContains(template, 'data-log-filter="all"', 'Log should expose All filter');
  assertContains(template, 'data-log-filter="combat"', 'Log should expose Combat filter');
  assertContains(template, 'id="log-search"', 'Log should expose search input');
  assertContains(template, 'App.exportLog()', 'Log should expose export action');
  assertContains(appContent, 'yaw-log-view', 'Log view preferences should persist separately');
  assertContains(appContent, 'loadLogViewPreferences()', 'Log view preferences should load during init');
  assertContains(appContent, 'LOG_CATEGORIES:', 'Log category registry should exist');
  assertContains(template, '.log-category', 'Log category badge style should exist');
});

test('Combat log filters by type and search text', () => {
  const { App, elements } = loadAppForCombat();
  App.log = [
    { text: 'Wolf attacks', type: 'combat' },
    { text: 'Found coin', type: 'loot' },
    { text: 'Rested well', type: 'heal' },
    { text: 'Discovered shrine', type: 'discovery' }
  ];
  App.setLogFilter('combat');
  assertContains(elements.get('log-content').innerHTML, 'Wolf attacks', 'Combat filter should show combat entry');
  assertNotContains(elements.get('log-content').innerHTML, 'Found coin', 'Combat filter should hide loot entry');
  App.setLogFilter('all');
  App.setLogSearch('coin');
  assertContains(elements.get('log-content').innerHTML, 'Found coin', 'Search should show matching entry');
  assertNotContains(elements.get('log-content').innerHTML, 'Wolf attacks', 'Search should hide non-matching entry');
  App.updateLanguage('es');
  App.setLogSearch('missing');
  assertContains(elements.get('log-content').innerHTML, 'No hay entradas de registro que coincidan con el filtro actual.', 'Filtered-empty log message should localize');
});

test('Combat log filter and search preferences persist', () => {
  const { App, storage } = loadAppForCombat();
  App.setLogFilter('loot');
  App.setLogSearch('coin');
  const saved = JSON.parse(storage.get('yaw-log-view'));
  assertEqual(saved.filter, 'loot', 'Log filter should persist');
  assertEqual(saved.search, 'coin', 'Log search should persist');
  App.logFilter = 'all';
  App.logSearch = '';
  App.loadLogViewPreferences();
  assertEqual(App.logFilter, 'loot', 'Stored log filter should reload');
  assertEqual(App.logSearch, 'coin', 'Stored log search should reload');
  storage.delete('yaw-log-view');
  storage.set('fff-log-view', JSON.stringify({ filter: 'invalid', search: 7 }));
  App.loadLogViewPreferences();
  assertEqual(App.logFilter, 'all', 'Invalid stored filter should fall back to all');
  assertEqual(App.logSearch, '', 'Invalid stored search should fall back to empty');
});

test('Combat log renders relative timestamps and status role', () => {
  const { App, elements } = loadAppForCombat();
  App.log = [
    { text: 'Older entry', type: 'discovery' },
    { text: 'Latest entry', type: 'combat' }
  ];
  App.renderLog();
  const html = elements.get('log-content').innerHTML;
  assertContains(html, 'just now', 'Newest log entry should show relative timestamp');
  assertContains(html, '1 turn ago', 'Older log entry should show relative timestamp');
  assertContains(html, 'role="status"', 'Log entries should expose status role');
  assertContains(html, 'class="log-category"', 'Log entries should show category badges');
  assertContains(html, 'aria-label="Combat"', 'Combat category badge should expose an accessible label');
  assertContains(html, '⚔️</span> Combat', 'Combat category badge should show icon and label');
});

test('Combat log entries capture round turn and actor metadata at creation', () => {
  const { App, elements } = loadAppForCombat(() => 0.5);
  const player = makeUnit('You', { id: 'player-1', CPun: 100, MPun: 100 });
  const wolf = makeUnit('Wolf', { id: 'wolf-1', species: 'wolf', disposition: App.DISPOSITION.ENEMY, CPun: 100, MPun: 100 });
  App.player = player;
  App.party = [player];
  App.creatures = [wolf];
  App.combatState = {
    active: true,
    round: 3,
    currentTurn: 0,
    processing: false,
    xpEarned: 0,
    turnQueue: [{ unit: player, initiative: 20 }, { unit: wolf, initiative: 10 }],
    syncActions: []
  };
  App._pushLog('Manual combat entry', 'combat', { actor: player, action: 'fight', targetId: 'wolf-1', targetName: 'Wolf', phase: 'action' });
  const entry = App.log[0];
  assertEqual(entry.round, 3, 'Combat log helper should stamp current round');
  assertEqual(entry.turnIndex, 1, 'Combat log helper should stamp current turn index');
  assertEqual(entry.actorName, 'You', 'Combat log helper should stamp actor name');
  assertEqual(entry.targetName, 'Wolf', 'Combat log helper should preserve target name');
  assertEqual(entry.action, 'fight', 'Combat log helper should preserve action metadata');
  App.renderLog();
  assertContains(elements.get('log-content').innerHTML, 'R3 T1', 'Rendered combat log should use explicit round and turn metadata');
  assertContains(App.exportLog(), '[combat | R3 T1', 'Exported combat log should use explicit round and turn metadata');
});

test('Accessibility settings apply, sync, and persist', () => {
  const { App, elements, storage, body } = loadAppForCombat();
  App.updateAccessibilitySetting('highContrast', true);
  App.updateAccessibilitySetting('reducedMotion', true);
  App.updateAccessibilitySetting('fontSize', 22);
  assert(body.classList.contains('high-contrast'), 'High contrast should toggle body class');
  assert(body.classList.contains('reduced-motion'), 'Reduced motion should toggle body class');
  assertEqual(body.style['--base-font-size'], '20px', 'Font size should clamp at 20px');
  assertEqual(elements.get('setting-high-contrast').checked, true, 'High contrast control should sync');
  assertEqual(elements.get('setting-reduced-motion').checked, true, 'Reduced motion control should sync');
  assertEqual(elements.get('setting-font-size').value, '20', 'Font size control should sync');
  assertEqual(elements.get('setting-font-size-value').textContent, '20px', 'Font size label should sync');
  const saved = JSON.parse(storage.get('yaw-settings'));
  assertEqual(saved.highContrast, true, 'High contrast setting should persist');
  assertEqual(saved.reducedMotion, true, 'Reduced motion setting should persist');
  assertEqual(saved.fontSize, 20, 'Font size setting should persist');
});

test('Overlays trap focus and restore the opener on close', () => {
  const { App, elements, document, listeners } = loadAppForCombat();
  const opener = makeElement();
  document.activeElement = opener;
  App.showScreen('settings');
  assert(App._focusTrap, 'Settings overlay should activate a focus trap');
  assert(listeners.has('keydown'), 'Focus trap should register keydown handling');
  let prevented = false;
  listeners.get('keydown')({ key: 'Escape', preventDefault() { prevented = true; } });
  assertEqual(prevented, true, 'Escape should be consumed by the overlay focus trap');
  assertEqual(elements.get('screen-settings').style.display, 'none', 'Escape should close the overlay');
  assertEqual(opener.focused, true, 'Closing overlay should restore focus to opener');
});

test('Newer interaction settings persist through saveSettings', () => {
  const { App, storage } = loadAppForCombat();
  App.settings.cockVoreEnabled = true;
  App.settings.unbirthEnabled = true;
  App.settings.forcedFeeding = true;
  App.settings.partyPlayFightMode = 'lethal';
  App.saveSettings();
  const saved = JSON.parse(storage.get('yaw-settings'));
  assertEqual(saved.cockVoreEnabled, true, 'Cock vore setting should persist');
  assertEqual(saved.unbirthEnabled, true, 'Unbirth setting should persist');
  assertEqual(saved.forcedFeeding, true, 'Forced feeding setting should persist');
  assertEqual(saved.partyPlayFightMode, 'lethal', 'Party play-fight mode should persist');
});

test('Language setting persists and updates localized labels', () => {
  const { App, elements, storage } = loadAppForCombat();
  App.updateLanguage('es');
  assertEqual(elements.get('setting-language').value, 'es', 'Language control should sync selected value');
  const prefs = JSON.parse(storage.get('yaw-content-prefs'));
  assertEqual(prefs.language, 'es', 'Language preference should persist');
  assertEqual(App._uiLabel('fight'), 'Luchar', 'Action labels should use active locale');
});

test('Save manager renders localized accessible slot actions', () => {
  const { App, elements, storage } = loadAppForCombat();
  storage.set('yaw-save-time-slot1', '1710000000000');
  App.updateLanguage('es');
  App.renderSaveManager('load');
  const html = elements.get('save-manager').innerHTML;
  assertEqual(elements.get('save-manager').getAttribute('aria-label'), 'Partidas', 'Save manager dialog label should localize in load mode');
  assertContains(html, 'Partidas', 'Save manager title should localize');
  assertContains(html, 'Nueva partida', 'New game entry should localize');
  assertContains(html, 'Partida guardada', 'Occupied slot badge should localize');
  assertContains(html, 'Slot abierto', 'Empty slot badge should localize');
  assertContains(html, 'aria-label="Iniciar una nueva partida en Slot 1"', 'New run action should expose localized accessible label');
  assertContains(html, 'aria-label="Cargar Slot 1"', 'Load action should expose localized accessible label');
  assertContains(html, 'aria-label="Borrar Slot 1"', 'Delete action should expose localized accessible label');
  assertContains(html, 'aria-label="Iniciar partida nueva en Slot 2"', 'Empty slot new-game action should expose localized accessible label');
  App.renderSaveManager('new');
  assertEqual(elements.get('save-manager').getAttribute('aria-label'), 'Elegir slot de partida nueva', 'Save manager dialog label should describe new-game mode');
});

test('New-game slot takeover warns before overwriting occupied slots', () => {
  const cancelled = loadAppForCombat(() => 0.5, { confirm: false });
  cancelled.storage.set('yaw-save-time-slot2', '1710000000000');
  cancelled.App.activeSlot = 'slot1';
  cancelled.App.beginNewGameInSlot('slot2');
  assertEqual(cancelled.App.activeSlot, 'slot1', 'Cancelled occupied-slot takeover should keep the current active slot');
  assertEqual(cancelled.storage.get('yaw-last-slot'), undefined, 'Cancelled occupied-slot takeover should not update lastSlot');
  assertNotContains(cancelled.document.getElementById('screen-create').style.display || '', 'flex', 'Cancelled occupied-slot takeover should not open character creation');

  const approved = loadAppForCombat(() => 0.5, { confirm: true });
  approved.storage.set('yaw-save-time-slot2', '1710000000000');
  approved.App.activeSlot = 'slot1';
  approved.App.beginNewGameInSlot('slot2');
  assertEqual(approved.App.activeSlot, 'slot2', 'Approved occupied-slot takeover should select that slot for the new run');
  assertEqual(approved.storage.get('yaw-last-slot'), 'slot2', 'Approved occupied-slot takeover should persist the chosen slot');
  assertEqual(approved.document.getElementById('screen-create').style.display, 'flex', 'Approved occupied-slot takeover should open character creation');
});

test('Save slot destructive confirmations localize', async () => {
  const newRun = loadAppForCombat(() => 0.5, { confirm: false });
  newRun.storage.set('yaw-save-time-slot2', '1710000000000');
  newRun.App.updateLanguage('es');
  newRun.App.beginNewGameInSlot('slot2');
  assertEqual(newRun.confirmations[0], 'Iniciar partida nueva en Slot 2? Esto sobrescribira ese slot. Esta accion no se puede deshacer.', 'New-run overwrite warning should use active locale and display slot label');

  const manualSave = loadAppForCombat(() => 0.5, { confirm: false });
  manualSave.storage.set('yaw-save-time-slot3', '1710000000000');
  manualSave.App.updateLanguage('es');
  manualSave.App.player = makeUnit('You');
  manualSave.App.party = [manualSave.App.player];
  manualSave.App.activeSlot = 'slot1';
  manualSave.App.persistWorldStateToMapStore = async () => {};
  manualSave.App._dbPut = async () => {};
  await manualSave.App.saveToSlot('slot3');
  assertEqual(manualSave.confirmations[0], 'Sobrescribir Slot 3 con la partida actual? Esta accion no se puede deshacer.', 'Manual overwrite warning should use active locale and display slot label');

  const deleteSlot = loadAppForCombat(() => 0.5, { confirm: false });
  deleteSlot.App.updateLanguage('es');
  await deleteSlot.App.deleteSlot('slot4');
  assertEqual(deleteSlot.confirmations[0], 'Borrar el slot Slot 4? Esto elimina permanentemente solo este slot y no se puede deshacer.', 'Delete warning should use active locale and display slot label');
});

test('Save slot status alerts use display slot labels', async () => {
  const noSave = loadAppForCombat(() => 0.5);
  noSave.App.updateLanguage('es');
  noSave.App._dbGet = async () => null;
  const loaded = await noSave.App.loadFromSlot('slot5');
  assertEqual(loaded, false, 'Missing save should not load');
  assertEqual(noSave.alerts[0], 'No hay partida en Slot 5', 'Missing-save alert should use localized display slot label');

  const saved = loadAppForCombat(() => 0.5, { confirm: true });
  saved.App.updateLanguage('es');
  saved.App.player = makeUnit('You');
  saved.App.party = [saved.App.player];
  saved.App.persistWorldStateToMapStore = async () => {};
  saved.App._dbPut = async () => {};
  await saved.App.saveToSlot('slot2');
  assertEqual(saved.alerts[0], 'Partida guardada en Slot 2!', 'Save success alert should use localized display slot label');
});

test('Settings destructive confirmations localize', () => {
  const clearAll = loadAppForCombat(() => 0.5, { confirm: false });
  clearAll.App.updateLanguage('es');
  clearAll.App.clearAllData();
  assertEqual(clearAll.confirmations[0], 'ADVERTENCIA: Esto borrara todas las partidas, modulos y datos del juego. Esta accion no se puede deshacer. Continuar?', 'Clear-all data warning should use active locale');

  const deleteAll = loadAppForCombat(() => 0.5, { confirm: false });
  deleteAll.App.updateLanguage('es');
  deleteAll.App.deleteAllSaves();
  assertEqual(deleteAll.confirmations[0], 'Borrar TODOS los datos de partidas? Esta accion no se puede deshacer!', 'Delete-all saves warning should use active locale');
});

test('Incompatible save recovery prompt localizes and scopes actions', async () => {
  const corruptedSave = new Uint8Array([1, 2, 3, 4]);
  const deleted = [];
  const deleteRecovery = loadAppForCombat(() => 0.5, {
    prompt: '1',
    binary: { saveGame: () => new Uint8Array(), loadGame: () => { throw new Error('bad save'); } }
  });
  deleteRecovery.App.updateLanguage('es');
  deleteRecovery.App._dbGet = async () => corruptedSave;
  deleteRecovery.App._dbDelete = async (_store, key) => { deleted.push(key); };
  deleteRecovery.storage.set('yaw-save-time-slot3', '1710000000000');
  const deleteResult = await deleteRecovery.App.loadFromSlot('slot3');
  assertEqual(deleteResult, false, 'Corrupted save recovery should not continue loading');
  assertEqual(deleteRecovery.prompts[0], 'Los datos de la partida son incompatibles o estan corruptos. Opciones:\n\n1 = Borrar partida\n2 = Descargar respaldo (base64)\n3 = Cancelar\n\nIngresa 1, 2 o 3:', 'Recovery prompt should use active locale');
  assertEqual(deleted.join(','), 'slot3', 'Delete recovery should remove only the selected corrupted slot');
  assertEqual(deleteRecovery.storage.has('yaw-save-time-slot3'), false, 'Delete recovery should remove selected slot timestamp');
  assertEqual(deleteRecovery.alerts[0], 'Partida borrada.', 'Delete recovery alert should localize');

  const backupRecovery = loadAppForCombat(() => 0.5, {
    prompt: '2',
    binary: { saveGame: () => new Uint8Array(), loadGame: () => { throw new Error('bad save'); } }
  });
  const backupDeletes = [];
  backupRecovery.App.updateLanguage('es');
  backupRecovery.App._dbGet = async () => corruptedSave;
  backupRecovery.App._dbDelete = async (_store, key) => { backupDeletes.push(key); };
  backupRecovery.storage.set('yaw-save-time-slot4', '1710000000000');
  const backupResult = await backupRecovery.App.loadFromSlot('slot4');
  assertEqual(backupResult, false, 'Backup recovery should not continue loading');
  assertEqual(backupDeletes.length, 0, 'Backup recovery should preserve the corrupted save slot');
  assertEqual(backupRecovery.storage.get('yaw-save-time-slot4'), '1710000000000', 'Backup recovery should keep selected slot timestamp');
  assertEqual(backupRecovery.alerts[0], 'Respaldo descargado. La partida queda intacta.', 'Backup recovery alert should localize');
});

test('Delete save slot is scoped to one selected slot', async () => {
  const { App, elements, storage } = loadAppForCombat(() => 0.5, { confirm: true });
  const deleted = [];
  App._dbDelete = async (_store, key) => { deleted.push(key); };
  storage.set('yaw-save-time-slot2', '1710000000000');
  storage.set('yaw-save-time-slot3', '1720000000000');
  App.activeSlot = 'slot2';
  await App.deleteSlot('slot2');
  assertEqual(deleted.join(','), 'slot2', 'Delete slot should remove only the selected slot from IndexedDB');
  assertEqual(storage.has('yaw-save-time-slot2'), false, 'Delete slot should remove only the selected slot timestamp');
  assertEqual(storage.get('yaw-save-time-slot3'), '1720000000000', 'Delete slot should leave other slot timestamps intact');
  assertEqual(App.activeSlot, 'slot1', 'Deleting the active slot should return activeSlot to the default slot');
  assertContains(elements.get('save-manager').innerHTML, 'Slot 2', 'Delete slot should refresh the slot manager UI');
  assertContains(elements.get('save-manager').innerHTML, 'Open slot', 'Deleted slot should render as open after refresh');
});

test('Deleting from new-game slot mode keeps the new-run flow active', async () => {
  const { App, elements, storage } = loadAppForCombat(() => 0.5, { confirm: true });
  const deleted = [];
  App._dbDelete = async (_store, key) => { deleted.push(key); };
  storage.set('yaw-save-time-slot2', '1710000000000');
  App.showNewGameManager();
  await App.deleteSlot('slot2');
  const html = elements.get('save-manager').innerHTML;
  assertEqual(App.saveManagerMode, 'new', 'Delete refresh should preserve new-game slot mode');
  assertEqual(deleted.join(','), 'slot2', 'New-mode delete should still delete only the chosen slot');
  assertContains(html, 'Choose New Game Slot', 'Delete refresh should keep the new-game manager title');
  assertContains(html, 'Use Empty Slot', 'Deleted slot should become an empty new-run target');
  assertNotContains(html, 'Save current game to Slot 2', 'New-game slot mode should not switch back to in-game save actions after delete');
});

test('Combat log export returns filtered text', () => {
  const { App } = loadAppForCombat();
  App.log = [
    { text: 'Wolf attacks', type: 'combat' },
    { text: 'Found coin', type: 'loot' }
  ];
  App.setLogFilter('loot');
  const text = App.exportLog();
  assertContains(text, 'Found coin', 'Export should include filtered entry');
  assertNotContains(text, 'Wolf attacks', 'Export should respect current filter');
});

test('Mobile creature chips expose long-press context handlers', () => {
  const { App } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  const creature = makeUnit('Friendly', { id: 'friendly-1', disposition: App.DISPOSITION.FRIENDLY });
  const html = App.renderMobileUnitChip(creature, 0, 'creature');
  assertContains(html, "startMobileCreaturePress(event,'friendly-1')", 'Mobile creature chip should start long-press detection');
  assertContains(html, 'cancelMobileCreaturePress()', 'Mobile creature chip should cancel long-press on movement/end');
});

test('Mobile party chips expose long-press management handlers', () => {
  const { App } = loadAppForCombat();
  const player = makeUnit('You');
  const ally = makeUnit('Ally', { id: 'ally-1', partyRole: 'guard' });
  App.player = player;
  App.party = [player, ally];
  const html = App.renderMobileUnitChip(ally, 1, 'party');
  assertContains(html, 'startMobilePartyPress(event,1)', 'Mobile party chip should start long-press management');
  assertContains(html, 'cancelMobilePartyPress()', 'Mobile party chip should cancel long-press on movement/end');
  assertContains(html, 'Ally - Guard', 'Mobile party chip should summarize assigned role');
});

test('Mobile unit chip actions expose localized accessible labels', () => {
  const { App } = loadAppForCombat();
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1' });
  const friendly = makeUnit('Friendly', { id: 'friendly-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 95, willing: true, quest: { id: 'quest-1', title: 'Help' } });
  const merchant = makeUnit('Merchant', { id: 'merchant-1', disposition: App.DISPOSITION.MERCHANT });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [friendly, merchant];
  App.updateLanguage('es');
  const partyHtml = App.renderMobileUnitChip(ally, 1, 'party');
  assertContains(partyHtml, 'Aliado', 'Mobile party status should localize');
  assertContains(partyHtml, 'aria-label="Seleccionar Ally para actuar"', 'Mobile party actor button should localize accessible label');
  assertContains(partyHtml, 'aria-label="Marcar Ally como objetivo"', 'Mobile party target button should localize accessible label');
  assertContains(partyHtml, '>Actuar<', 'Mobile party actor button text should localize');
  assertContains(partyHtml, '>Objetivo<', 'Mobile party target button text should localize');
  const creatureHtml = App.renderMobileUnitChip(friendly, 0, 'creature');
  assertContains(creatureHtml, 'Amistoso | 100/100', 'Mobile creature disposition should localize');
  assertContains(creatureHtml, 'aria-label="Marcar Friendly como objetivo"', 'Mobile creature target button should localize accessible label');
  assertContains(creatureHtml, 'aria-label="Luchar Friendly"', 'Mobile fight icon should expose localized accessible label');
  assertContains(creatureHtml, 'aria-label="Seducir Friendly"', 'Mobile pleasure icon should expose localized accessible label');
  assertContains(creatureHtml, 'aria-label="Reclutar Friendly"', 'Mobile recruit icon should expose localized accessible label');
  assertContains(creatureHtml, 'aria-label="Aceptar mision Friendly"', 'Mobile quest icon should expose localized accessible label');
  const merchantHtml = App.renderMobileUnitChip(merchant, 1, 'creature');
  assertContains(merchantHtml, 'Mercader | 100/100', 'Mobile merchant disposition should localize');
  assertContains(merchantHtml, 'aria-label="Comerciar Merchant"', 'Mobile trade icon should expose localized accessible label');
});

test('Mobile party long-press menu exposes management actions', () => {
  const { App, body, document } = loadAppForCombat(() => 0, { confirm: true });
  const opener = makeElement();
  document.activeElement = opener;
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-1', partyRole: 'support', aiOrder: 'defensive' });
  App.player = player;
  App.party = [player, ally];
  App.partyLeaderId = 'player-1';
  App.showMobilePartyContext(1);
  assertContains(body.innerHTML, 'role="dialog"', 'Party long-press menu should expose dialog semantics');
  assertContains(body.innerHTML, 'aria-modal="true"', 'Party long-press menu should behave as a modal action menu');
  assertContains(body.innerHTML, 'Party actions', 'Party menu should use accessible party action label');
  assertContains(body.innerHTML, 'Stats', 'Party menu should expose stats');
  assertContains(body.innerHTML, 'Make Leader', 'Party menu should expose leader action for allies');
  assertContains(body.innerHTML, 'Party role for Ally', 'Party menu should expose role selector');
  assertContains(body.innerHTML, 'AI order for Ally', 'Party menu should expose AI selector');
  assertContains(body.innerHTML, 'Dismiss', 'Party menu should expose dismiss action for allies');
  App.mobilePartyContextAction('lead', 1);
  assertEqual(App._getPartyLeader(), ally, 'Party menu leader action should update leader');
  App.showMobilePartyContext(1);
  App.mobilePartyContextAction('stats', 1);
  assertContains(document.getElementById('scene-description').innerHTML, 'Ally', 'Party menu stats action should open ally stats');
  App.showMobilePartyContext(1);
  App.mobilePartyContextAction('close', 1);
  assertEqual(opener.focused, true, 'Closing party long-press menu should restore focus to opener');
});

test('Mobile party long-press menu uses localized management labels', () => {
  const { App, body } = loadAppForCombat(() => 0, { confirm: true });
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-es', partyRole: 'guard', aiOrder: 'defensive' });
  App.player = player;
  App.party = [player, ally];
  App.partyLeaderId = 'player-1';
  App.updateLanguage('es');
  App.showMobilePartyContext(1);
  assertContains(body.innerHTML, 'aria-label="Acciones del grupo"', 'Party menu label should localize');
  assertContains(body.innerHTML, 'Estadisticas', 'Stats menu item should localize');
  assertContains(body.innerHTML, 'Hacer lider', 'Leader menu item should localize');
  assertContains(body.innerHTML, '>Rol<', 'Role field label should localize');
  assertContains(body.innerHTML, 'aria-label="Rol de grupo para Ally"', 'Role select accessible label should localize');
  assertContains(body.innerHTML, '<option value="guard" selected>Guardia</option>', 'Mobile role option text should localize');
  assertContains(body.innerHTML, '<option value="support" >Apoyo</option>', 'Mobile role option list should localize');
  assertContains(body.innerHTML, 'Reduce la ventaja de emboscadas y ayuda a proteger el campamento.', 'Mobile role helper text should localize');
  assertContains(body.innerHTML, 'Orden IA', 'AI order field label should localize');
  assertContains(body.innerHTML, 'aria-label="Orden IA para Ally"', 'AI order select accessible label should localize');
  assertContains(body.innerHTML, '<option value="defensive" selected>Defensivo</option>', 'Mobile AI order option text should localize');
  assertContains(body.innerHTML, '<option value="passive" >Pasivo</option>', 'Mobile AI order option list should localize');
  assertContains(body.innerHTML, 'Prefiere posicionarse con cuidado y proteger aliados.', 'Mobile AI order helper text should localize');
  assertContains(body.innerHTML, 'Despedir', 'Dismiss menu item should localize');
  assertContains(body.innerHTML, 'Cerrar', 'Close menu item should localize');
});

test('Mobile party long-press role selectors refresh after changes', () => {
  const { App, body } = loadAppForCombat(() => 0, { confirm: true });
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Ally', { id: 'ally-mobile', partyRole: 'companion', aiOrder: 'aggressive' });
  App.player = player;
  App.party = [player, ally];
  App.updateLanguage('es');
  App.showMobilePartyContext(1);

  App.mobilePartyContextSetRole(1, 'support');
  assertEqual(ally.partyRole, 'support', 'Mobile role selector should update party role');
  assertContains(body.innerHTML, 'id="mobile-context-menu"', 'Mobile role selector should keep the management menu open');
  assertContains(body.innerHTML, '<option value="support" selected>Apoyo</option>', 'Mobile role selector should refresh selected role label');
  assertContains(body.innerHTML, 'Mejora la recuperacion al descansar en un lugar seguro.', 'Mobile role selector should refresh selected role helper text');

  App.mobilePartyContextSetAIOrder(1, 'healer');
  assertEqual(ally.aiOrder, 'healer', 'Mobile AI selector should update party AI order');
  assertContains(body.innerHTML, 'id="mobile-context-menu"', 'Mobile AI selector should keep the management menu open');
  assertContains(body.innerHTML, '<option value="healer" selected>Sanador</option>', 'Mobile AI selector should refresh selected AI order label');
  assertContains(body.innerHTML, 'Alimenta primero al aliado mas herido.', 'Mobile AI selector should refresh selected AI helper text');
});

test('Mobile creature long-press menu exposes core actions', () => {
  const { App, body, document } = loadAppForCombat();
  const opener = makeElement();
  document.activeElement = opener;
  App.player = makeUnit('You', { Flir: 40, Fuck: 40, cha: 40 });
  App.party = [App.player];
  App.creatures = [makeUnit('Willing', { id: 'willing-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 90, MPle: 100, willing: true })];
  App.showMobileCreatureContext('willing-1');
  assertContains(body.innerHTML, 'role="dialog"', 'Long-press menu should expose dialog semantics');
  assertContains(body.innerHTML, 'aria-modal="true"', 'Long-press menu should behave as a modal action menu');
  assertContains(body.innerHTML, 'role="menu"', 'Long-press menu should expose menu semantics for actions');
  assertContains(body.innerHTML, 'Fight', 'Long-press menu should expose Fight');
  assertContains(body.innerHTML, 'Flirt', 'Long-press menu should expose Flirt');
  assertContains(body.innerHTML, 'Feed', 'Long-press menu should expose Feed');
  assertContains(body.innerHTML, 'Inspect', 'Long-press menu should expose Inspect');
  assertContains(body.innerHTML, 'Recruit', 'Long-press menu should expose Recruit when available');
  App.closeMobileContextMenu();
  assertEqual(opener.focused, true, 'Closing long-press menu should restore focus to opener');
});

test('Mobile creature long-press menu uses localized action labels', () => {
  const { App, body } = loadAppForCombat();
  App.player = makeUnit('You', { Flir: 40, Fuck: 40, cha: 40 });
  App.party = [App.player];
  App.creatures = [makeUnit('Willing', { id: 'willing-es', disposition: App.DISPOSITION.FRIENDLY, CPle: 90, MPle: 100, willing: true })];
  App.updateLanguage('es');
  App.showMobileCreatureContext('willing-es');
  assertContains(body.innerHTML, 'aria-label="Acciones de criatura"', 'Creature menu label should localize');
  assertContains(body.innerHTML, 'Luchar', 'Fight menu item should localize');
  assertContains(body.innerHTML, 'Coquetear', 'Flirt menu item should localize');
  assertContains(body.innerHTML, 'Alimentar', 'Feed menu item should localize');
  assertContains(body.innerHTML, 'Inspeccionar', 'Inspect menu item should localize');
  assertContains(body.innerHTML, 'Reclutar', 'Recruit menu item should localize');
  assertContains(body.innerHTML, 'Cerrar', 'Close menu item should localize');
});

test('Mobile map pinch changes zoom and applies transform', () => {
  const { App, elements } = loadAppForCombat();
  elements.set('mobile-mini-map', makeElement());
  App.handleMapTouchStart({ touches: [{ screenX: 0, screenY: 0 }, { screenX: 100, screenY: 0 }] });
  App.handleMapTouchMove({ touches: [{ screenX: 0, screenY: 0 }, { screenX: 150, screenY: 0 }], preventDefault() {} });
  assertEqual(App.mobileMapZoom, 1.5, 'Pinch-out should increase mobile map zoom');
  assertEqual(elements.get('mobile-mini-map').style.transform, 'scale(1.5)', 'Pinch zoom should apply map transform');
  App.handleMapTouchEnd();
  assertEqual(App._pinchStartDistance, 0, 'Pinch end should clear gesture distance');
});

test('Mobile gesture helpers include haptic feedback hooks', () => {
  assertContains(appContent, 'navigator.vibrate', 'Mobile gestures should use haptic feedback when available');
  assertContains(appContent, 'this._haptic([12, 20, 12])', 'Long-press should trigger haptic feedback');
  assertContains(appContent, 'this._haptic(6)', 'Swipe gestures should trigger haptic feedback');
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
