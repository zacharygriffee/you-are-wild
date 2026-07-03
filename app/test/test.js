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
const worldGenerationPath = path.join(SRC_DIR, 'core', 'world-generation.js');
const worldGenerationContent = fs.readFileSync(worldGenerationPath, 'utf8');
const assetManifestPath = path.join(SRC_DIR, 'core', 'asset-manifest.js');
const assetManifestContent = fs.readFileSync(assetManifestPath, 'utf8');
const settingsNavContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'settings-nav.js'), 'utf8');
const globalNavContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'global-nav.js'), 'utf8');
const marketNavContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'market-nav.js'), 'utf8');
const marketScreenContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'market-screen.js'), 'utf8');
const modUiContent = fs.readFileSync(path.join(SRC_DIR, 'ui', 'mod-ui.js'), 'utf8');
const buildContent = fs.readFileSync(path.join(__dirname, '..', 'build.js'), 'utf8');

function loadWorldGenForTest() {
  return new Function(`${worldGenerationContent}\nreturn WorldGen;`)();
}

function loadAssetManifestForTest() {
  const g = {};
  return new Function('globalThis', 'window', `${assetManifestContent}\nreturn globalThis.AssetManifest;`)(g, g);
}

test('App object is defined', () => {
  assertContains(appContent, 'const App = {', 'App object declaration missing');
});

test('Asset manifest module is registered before app code', () => {
  assertContains(buildContent, "'src/core/asset-manifest.js'", 'Asset manifest should be included in SCRIPT_ORDER');
  assert(buildContent.indexOf("'src/core/asset-manifest.js'") < buildContent.indexOf("'src/core/app.js'"), 'Asset manifest should load before app.js');
  assertContains(appContent, 'globalThis.AssetManifest', 'App should read asset manifest through global registry');
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

test('Progression balance constants are named', () => {
  assertContains(appContent, 'BALANCE:', 'Balance constants missing');
  assertContains(appContent, 'xpCurveMultiplier', 'XP curve multiplier should be named');
  assertContains(appContent, 'levelPunishmentGain', 'Level punishment gain should be named');
  assertContains(appContent, 'levelPleasureGain', 'Level pleasure gain should be named');
  assertContains(appContent, 'levelStatGain', 'Level stat gain should be named');
  assertContains(appContent, 'recruitXP', 'Recruit XP should be named');
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

test('Asset manifest supports tileset provenance and fallback metadata', () => {
  const manifest = loadAssetManifestForTest();
  assertEqual(manifest.manifest.activeTileset, 'core-emoji-fallback', 'Default tileset should keep emoji fallback active');
  assertEqual(manifest.tileKeys.biomes.forest, 'terrain-forest', 'Manifest should expose stable terrain tile keys');
  const fallbackForest = manifest.getTileAsset('terrain-forest');
  assertEqual(fallbackForest.fallbackMode, 'emoji', 'Fallback tileset should preserve emoji rendering mode');
  assertEqual(fallbackForest.src, null, 'Fallback tileset should not require image assets');
  const painted = manifest.manifest.tilesets['painted-chatgpt-image-tileset-placeholder'];
  assertEqual(painted.provenance.kind, 'ai_generated', 'Painted tileset placeholder should record AI-generated provenance');
  assertEqual(painted.provenance.tool, 'ChatGPT Image', 'Painted tileset placeholder should record generation tool');
  assertEqual(painted.provenance.generatedBy, 'project-owner', 'Painted tileset placeholder should record project-owner source');
  assertEqual(painted.relativeBasePath, 'assets/tilesets/painted-chatgpt-image/', 'Painted tileset placeholder should use relative asset paths');
  assert(painted.allowedUse.includes('future-mod-pack'), 'Tileset metadata should allow future mod-pack use');
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
  assertContains(contentContent, "'quest.previewTitle': 'Quest Preview'", 'English quest preview title missing');
  assertContains(contentContent, "'quest.previewTitle': 'Vista previa de mision'", 'Spanish quest preview title missing');
  assertContains(contentContent, "'quest.reward.gold': '{count} gold'", 'English quest reward gold label missing');
  assertContains(contentContent, "'quest.reward.gold': '{count} oro'", 'Spanish quest reward gold label missing');
  assertContains(contentContent, "'mod.title': 'Mod Manager'", 'English mod manager title missing');
  assertContains(contentContent, "'mod.title': 'Gestor de modulos'", 'Spanish mod manager title missing');
  assertContains(contentContent, "'mod.importTitle': 'Import mod file'", 'English mod import title missing');
  assertContains(contentContent, "'mod.importTitle': 'Importar archivo de modulo'", 'Spanish mod import title missing');
  assertContains(contentContent, "'mod.noneInstalled': 'No modules installed. Install one above or create an example.'", 'English mod manager empty-state label missing');
  assertContains(contentContent, "'mod.noneInstalled': 'No hay modulos instalados. Instala uno arriba o crea un ejemplo.'", 'Spanish mod manager empty-state label missing');
  assertContains(contentContent, "'mod.confirmDelete': 'Delete this module? This cannot be undone.'", 'English mod manager delete warning missing');
  assertContains(contentContent, "'mod.confirmDelete': 'Borrar este modulo? Esta accion no se puede deshacer.'", 'Spanish mod manager delete warning missing');
  assertContains(contentContent, "'combat.instantWin': 'Instant Win'", 'English instant-win label missing');
  assertContains(contentContent, "'combat.instantWin': 'Victoria instantanea'", 'Spanish instant-win label missing');
  assertContains(contentContent, "'cheat.overpoweredMaxed': 'Overpowered! All stats maxed.'", 'English overpowered cheat log missing');
  assertContains(contentContent, "'cheat.overpoweredMaxed': 'Sobrepotenciado! Todas las estadisticas al maximo.'", 'Spanish overpowered cheat log missing');
  assertContains(contentContent, "'combat.allyHolds': '{name} holds position.'", 'English ally hold log missing');
  assertContains(contentContent, "'combat.allyHolds': '{name} mantiene la posicion.'", 'Spanish ally hold log missing');
  assertContains(contentContent, "'combat.enemyReinforces': '{enemy} calls for help! {reinforcement} joins the fight.'", 'English reinforcement log missing');
  assertContains(contentContent, "'combat.enemyReinforces': '{enemy} pide ayuda! {reinforcement} se une al combate.'", 'Spanish reinforcement log missing');
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
  assertContains(template, 'id="tile-event-feed"', 'Desktop scene should expose a tile-scoped event feed slot');
  assertContains(template, 'id="mobile-tile-event-feed"', 'Mobile scene should expose a tile-scoped event feed slot');
  assertContains(template, '.tile-event-feed', 'Tile event feed styles should be bounded and reusable');
  assertContains(template, '.scene-actions > .action-btn', 'Desktop scene action buttons should have scoped sizing rules');
  assertContains(template, 'flex-wrap: wrap;', 'Desktop scene action rows should wrap instead of forcing horizontal scroll');
  assertContains(template, 'overflow-x: hidden;', 'Desktop scene action rows should not create horizontal page overflow');
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
  assertContains(template, 'data-i18n="mod.title"', 'Mod manager fallback title should opt into static localization');
  assertContains(template, 'data-i18n="mod.subtitle"', 'Mod manager fallback subtitle should opt into static localization');
  assertContains(template, '<h1 style="color: var(--accent-primary); margin: 0;">📦 <span data-i18n="mod.title">Mod Manager</span></h1>', 'Mod manager header should leave room for a persistent close button');
  assertContains(template, 'title="Close mods" aria-label="Close mods" data-i18n="ui.close" data-i18n-title="mod.closeTitle"', 'Mod manager should expose a persistent localized close button');
  assertContains(template, 'data-i18n="mod.import"', 'Mod import label should opt into static localization');
  assertContains(template, 'data-i18n-title="mod.importTitle"', 'Mod import title should opt into static localization');
  assertContains(template, 'data-i18n="mod.createExample"', 'Mod create-example label should opt into static localization');
  assertContains(template, 'data-i18n-title="mod.createExampleTitle"', 'Mod create-example title should opt into static localization');
  assertContains(template, 'data-i18n-title="mod.closeTitle"', 'Mod close title should opt into static localization');
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
  assertContains(template, '<h1 style="color: var(--accent-primary); margin: 0;">🏪 <span data-i18n="market.title">Module Marketplace</span></h1>', 'Marketplace header should leave room for a persistent close button');
  assertContains(template, 'title="Close marketplace" aria-label="Close marketplace" data-i18n="ui.close" data-i18n-title="market.closeTitle"', 'Marketplace should expose a persistent localized close button');
  assertContains(template, 'data-i18n="market.browse"', 'Marketplace fallback browse button should localize');
  assertContains(marketScreenContent, "label(key, fallback, vars = {})", 'Marketplace localization helper missing');
  assertContains(marketScreenContent, "escapeHtml(value)", 'Marketplace HTML escaping helper missing');
  assertContains(marketScreenContent, "this.label('market.title'", 'Marketplace title should localize');
  assertContains(marketScreenContent, "this.label('market.search'", 'Marketplace search placeholder should localize');
  assertContains(marketScreenContent, "this.label('market.installModule'", 'Marketplace install button title should localize');
  assertContains(marketScreenContent, "this.label('market.closeTitle'", 'Marketplace dynamic close title should localize');
  assertContains(marketScreenContent, 'onclick="returnToGame()"', 'Marketplace dynamic view should keep a close button after rerender');
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

test('Overlay close controls clear active overlay state', () => {
  assertContains(globalNavContent, "['screen-settings', 'screen-mods', 'screen-market', 'save-manager'].forEach", 'returnToGame should close all overlay surfaces together');
  assertContains(globalNavContent, "el.classList?.remove('active')", 'returnToGame should clear active class from closed overlays');
});

test('New game flow is slot-aware and warns before destructive slot changes', () => {
  assertContains(template, 'App.showNewGameManager()', 'Main menu New Game should open slot selection');
  assertContains(template, "App.showSaveManager('save')", 'Game Save nav should open save-specific slot mode');
  assertContains(template, "App.showSaveManager('load')", 'Game Load nav should open load-specific slot mode');
  assertContains(appContent, "showSaveManager('new')", 'New game manager should render save slots in new-run mode');
  assertContains(appContent, "saveButton('nav-btn primary'", 'Save manager should generate accessible action buttons');
  assertContains(appContent, "this._label('save.toolbarNew'", 'Load manager should expose a localized always-visible New Game entry point');
  assertContains(contentContent, "'save.newRun': 'New Run'", 'Load/save slot manager should expose localized new-run slot takeover');
  assertContains(contentContent, "'save.loadTitle': 'Load Game'", 'Load mode should have localized title copy');
  assertContains(contentContent, "'save.saveTitle': 'Save Game'", 'Save mode should have localized title copy');
  assertContains(contentContent, "'save.loadDescription': 'Choose a save to load, start a new run in a slot, or delete one slot.'", 'Load mode should have focused localized description');
  assertContains(contentContent, "'save.saveDescription': 'Choose where to save the current game. Occupied slots warn before overwrite.'", 'Save mode should have focused localized description');
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
  assertContains(contentContent, "'save.slotActions.occupiedLoad': 'Actions: Load, New Run, Delete'", 'Slot cards should summarize load-mode actions');
  assertContains(template, '.save-slot-summary', 'Save slot cards should have compact action-summary styling');
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

test('Save manager separates save and load mode actions', () => {
  const { App, elements, storage } = loadAppForCombat();
  storage.set('yaw-save-time-slot2', '1710000000000');

  App.showSaveManager('load');
  const loadHtml = elements.get('save-manager').innerHTML;
  assertEqual(App.saveManagerMode, 'load', 'Load nav should set load-specific manager mode');
  assertContains(loadHtml, 'Load Game', 'Load mode should render load-specific title');
  assertContains(loadHtml, 'Choose a save to load', 'Load mode should render load-specific guidance');
  assertContains(loadHtml, 'New Game', 'Load mode should keep new-game entry points');
  assertContains(loadHtml, 'New Run', 'Load mode should allow occupied slot takeover');
  assertContains(loadHtml, 'Load', 'Load mode should expose load actions for occupied slots');
  assertNotContains(loadHtml, 'Save current game to Slot 2', 'Load mode should not crowd cards with save actions');

  App.showSaveManager('save');
  const saveHtml = elements.get('save-manager').innerHTML;
  assertEqual(App.saveManagerMode, 'save', 'Save nav should set save-specific manager mode');
  assertContains(saveHtml, 'Save Game', 'Save mode should render save-specific title');
  assertContains(saveHtml, 'Choose where to save the current game', 'Save mode should render save-specific guidance');
  assertContains(saveHtml, 'Save current game to Slot 1', 'Save mode should expose save action for empty/current slots');
  assertContains(saveHtml, 'Save current game to Slot 2', 'Save mode should expose save action for occupied slots');
  assertContains(saveHtml, 'Occupied slot: saving here may require overwrite confirmation.', 'Save mode should use save-specific occupied hints');
  assertNotContains(saveHtml, 'Start a new run in Slot 2', 'Save mode should not crowd cards with new-run actions');
  assertNotContains(saveHtml, 'Load Slot 2', 'Save mode should not crowd cards with load actions');
});

test('Accessibility settings controls are available', () => {
  assertContains(template, 'body.high-contrast', 'High contrast CSS class missing');
  assertContains(template, 'body.reduced-motion *', 'Reduced motion CSS class missing');
  assertContains(template, ':focus-visible', 'Visible keyboard focus styling should exist');
  assertContains(template, '[role="button"]', 'Custom button-role controls should share focus styling');
  assertContains(template, 'body.high-contrast :where(button, [role="button"]', 'High contrast mode should strengthen visible focus styling');
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
  assertContains(appContent, "showMarketScreen() { this.showScreen('market'); }", 'Market helper should open the overlay screen, not only render hidden content');
  assertContains(settingsNavContent, "setAttribute('data-i18n-aria-label', 'ui.menu.settingsTitle')", 'Injected settings nav button should localize accessible label');
  assertContains(settingsNavContent, "setAttribute('data-i18n-title', 'ui.menu.settingsTitle')", 'Injected settings nav button should localize title');
  assertContains(marketNavContent, "setAttribute('data-i18n-aria-label', 'ui.menu.marketTitle')", 'Injected market nav button should localize accessible label');
  assertContains(marketNavContent, "setAttribute('data-i18n-title', 'ui.menu.marketTitle')", 'Injected market nav button should localize title');
  assertContains(marketNavContent, "marketBtn.onclick = () => App.showScreen('market')", 'Injected market nav should use the shared overlay route');
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

test('Settings default safe and reveal controls by content maturity', () => {
  assertContains(contentContent, 'maxTier: 0', 'content preferences should default to safe');
  assertContains(contentContent, 'voreEnabled: false', 'safe defaults should not enable mature mechanics');
  assertContains(contentContent, 'explicitDescriptions: false', 'safe defaults should not enable adult descriptions');
  assertContains(template, 'data-setting-tier="mature"', 'mature-only settings should be tagged');
  assertContains(template, 'data-setting-tier="adult"', 'adult-only settings should be tagged');
  assertContains(template, "App.setContentTier('safe')", 'safe content button should use App content-tier helper');
  assertContains(template, "App.setContentTier('mature')", 'mature content button should use App content-tier helper');
  assertContains(template, "App.setContentTier('adult')", 'adult content button should use App content-tier helper');
  assertContains(appContent, 'syncSettingVisibility()', 'settings tier visibility helper missing');
  assertContains(appContent, 'enforceContentTierSettings()', 'settings should enforce hidden-tier toggles when content level changes');
  assertContains(appContent, "CONTENT.setPreference('explicitDescriptions', false)", 'lowering tier should disable explicit descriptions');
  assertContains(appContent, "CONTENT.setPreference('voreEnabled', false)", 'lowering to safe should disable mature mechanics');
  assertContains(contentContent, "'ui.menu.contentDefault': 'Safe content is enabled by default'", 'menu should describe safe default');
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
  assertContains(template, 'data-i18n="ui.largeMap.discoveredRegion"', 'Large-map heading should opt into localization');
  assertContains(template, 'data-i18n-aria-label="ui.largeMap.controls"', 'Large-map controls group should opt into localization');
  assertContains(template, 'data-i18n-title="ui.largeMap.zoomIn"', 'Large-map zoom-in title should opt into localization');
  assertContains(template, 'data-i18n-aria-label="ui.largeMap.recenter"', 'Large-map recenter accessible label should opt into localization');
  assertContains(template, 'data-i18n-title="ui.swipeRightMap"', 'Swipe map hint title should opt into localization');
  assertContains(template, 'data-i18n-title="ui.swipeLeftParty"', 'Swipe party hint title should opt into localization');
  assertContains(template, 'data-i18n="ui.welcomeLog"', 'Welcome log fallback should opt into localization');
  assertContains(template, 'data-i18n="ui.scene.wildernessTitle"', 'Initial scene title should opt into localization');
  assertContains(template, 'data-i18n="ui.scene.wildernessIntro"', 'Initial scene description should opt into localization');
  assertContains(template, 'data-i18n="ui.scene.wildernessAmbient"', 'Initial scene ambient copy should opt into localization');
  assertContains(template, 'data-i18n="ui.log.createdCharacter"', 'Initial character-created log should opt into localization');
  assertContains(template, 'data-i18n-title="action.search"', 'Static search action title should opt into localization');
  assertContains(template, 'data-i18n-aria-label="action.rest"', 'Static rest action accessible label should opt into localization');
  assertContains(template, 'data-i18n="action.fight"', 'Static combat action fallback should opt into localization');
  assertContains(template, 'data-i18n="action.inventory"', 'Static inventory action fallback should opt into localization');
  assertContains(template, 'data-i18n="ui.tutorial.skip"', 'Tutorial skip button should opt into localization');
  assertContains(template, 'data-i18n="ui.tutorial.next"', 'Tutorial next button should opt into localization');
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

test('Create screen requires explicit gender and anatomy choices', () => {
  assertContains(appContent, 'selectedGender: null', 'gender should not be selected by default');
  assertContains(appContent, 'selectedParts: []', 'anatomy should not be selected by default');
  assertContains(template, '<div class="option-card" data-value="female"', 'female option should not be auto-selected in the template');
  assertContains(template, '<div class="option-card" data-part="clit"', 'primary anatomy option should not be auto-selected in the template');
  assertContains(template, '<div class="option-card" data-part="tits"', 'chest anatomy option should not be auto-selected in the template');
  assertContains(template, 'id="create-validation" class="create-validation" role="alert" aria-live="polite"', 'create validation message should be visible to assistive tech');
  assertContains(template, 'data-i18n="create.random"', 'random character button should be explicit and localizable');
  assertContains(appContent, 'validateCharacterCreation()', 'create flow should validate required character choices');
  assertContains(appContent, 'if (!this.validateCharacterCreation()) return;', 'begin adventure should stop when required choices are missing');
  assertContains(appContent, 'randomizeCharacter()', 'zero-config character creation should be explicit');
  assertContains(contentContent, "'create.validation.required': 'Before beginning, please {items}.'", 'English create validation message missing');
  assertContains(contentContent, "'create.random': 'Random Character'", 'English random character label missing');
  assertContains(contentContent, "'create.random': 'Personaje aleatorio'", 'Spanish random character label missing');
});

test('Create screen links content level to highlighted settings control', () => {
  assertContains(template, 'id="create-content-level-label"', 'create screen should show the active content level');
  assertContains(template, 'App.openContentSettingsFromCreate()', 'create screen content control should open settings');
  assertContains(appContent, "settingsReturnScreen = 'create'", 'settings opened from create should return to create');
  assertContains(appContent, "target.classList.add('settings-focus')", 'content settings target should be highlighted');
  assertContains(template, 'id="settings-content-level"', 'settings content level section should be directly targetable');
  assertContains(template, '.settings-focus', 'settings highlight style should exist');
});

test('Create screen encounter preferences use dynamic identity percentages', () => {
  assertContains(template, 'id="encounter-weight-female"', 'female encounter percentage control missing');
  assertContains(template, 'id="encounter-weight-male"', 'male encounter percentage control missing');
  assertContains(template, 'id="encounter-weight-nonbinary"', 'non-binary encounter percentage control missing');
  assertContains(template, "App.selectEncounterPreference('nonbinary')", 'non-binary preference preset missing');
  assertContains(template, 'data-value="any" onclick="App.selectEncounterPreference(\'any\')"', 'Any preset should route through the preference helper');
  assertContains(template, '<div class="option-card selected" data-value="any"', 'Any should be the default preferred-encounter preset');
  assertContains(appContent, 'selectedEncounterWeights: { female: 34, male: 33, nonbinary: 33 }', 'default encounter weights should be explicit');
  assertContains(appContent, "_encounterPresetWeights(value)", 'encounter preset helper missing');
  assertContains(appContent, "_pickEncounterIdentity(rollValue", 'encounter identity picker missing');
  assertContains(appContent, "updateEncounterWeight(key, value)", 'encounter percentage update helper missing');
  assertContains(appContent, "this.encounterWeights = this._normalizeEncounterWeights(this.selectedEncounterWeights)", 'created character should persist selected encounter weights');
  assertContains(serContent, 'encounterWeights: appState.encounterWeights || appState.selectedEncounterWeights || null', 'encounter weights should persist in save metadata');
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
  assertContains(template, '.intent-menu-radial .mobile-context-menu-actions', 'radial intent menus should have dedicated mobile layout hooks');
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

test('Desktop panel navigation focuses existing panels instead of no-oping', () => {
  assertContains(appContent, 'focusDesktopPanel(p)', 'desktop panel navigation should call a focus helper');
  assertContains(appContent, 'scrollIntoView({', 'desktop panel navigation should scroll the panel into view');
  assertContains(appContent, "classList.remove('nav-focus')", 'desktop panel navigation should clear stale focus highlights');
  assertContains(template, '.panel.nav-focus', 'desktop panel navigation should expose a visual focus state');
});

test('Tile event feed is ephemeral scene presentation', () => {
  assertContains(appContent, 'tileEvents: []', 'App state should track current tile events separately from durable logs');
  assertContains(appContent, '_clearTileEvents()', 'Tile event feed should expose a clear helper');
  assertContains(appContent, '_addTileEvent(text', 'Tile event feed should expose an append helper');
  assertContains(appContent, 'renderTileEvents()', 'Tile event feed should render into scene slots');
  assertContains(appContent, "['tile-event-feed', 'mobile-tile-event-feed']", 'Tile events should mirror to desktop and mobile scene slots');
});

test('Mobile gameplay surface keeps map units and scene together', () => {
  assertContains(template, 'id="mobile-play-surface"', 'mobile play surface missing');
  assertContains(template, 'id="mobile-mini-map"', 'mobile map surface missing');
  assertContains(template, 'id="mobile-party-card"', 'mobile party strip card should be addressable for combat ordering');
  assertContains(template, 'id="mobile-party-strip"', 'mobile party strip missing');
  assertContains(template, 'id="mobile-creature-strip"', 'mobile creature strip missing');
  assertContains(template, 'id="mobile-combat-toolbelt"', 'mobile combat toolbelt status slot missing');
  assertContains(template, '.mobile-play-surface.combat-active #mobile-creature-card', 'combat mode should be able to place enemies above party controls');
  assertContains(template, '.mobile-play-surface.combat-active #mobile-party-card', 'combat mode should be able to keep party controls near the thumb zone');
  assertContains(template, 'id="mobile-scene-description"', 'mobile scene sheet missing');
  assertContains(appContent, 'renderMobilePartyStrip()', 'mobile party renderer missing');
  assertContains(appContent, 'renderMobileCreatureStrip()', 'mobile creature renderer missing');
  assertContains(appContent, 'renderMobileCombatToolbelt()', 'mobile combat toolbelt renderer missing');
  assertContains(appContent, "document.getElementById('mobile-mini-map')", 'renderMap should target mobile map');
});

test('Desktop play surface uses a 3x3 center-tile layout', () => {
  assertContains(template, 'id="desktop-play-surface"', 'desktop play surface missing');
  assertContains(template, 'id="desktop-play-cell-center"', 'desktop play surface should have a center tile');
  assertContains(template, 'id="desktop-play-cell-n"', 'desktop play surface should expose north movement');
  assertContains(template, 'id="desktop-play-cell-s"', 'desktop play surface should expose south movement');
  assertContains(template, '.desktop-play-surface', 'desktop play surface styles missing');
  assertContains(appContent, 'renderDesktopPlaySurface()', 'desktop play surface renderer missing');
  assertContains(appContent, "_desktopPlayCellHtml", 'desktop play surface cell helper missing');
  assertContains(appContent, "_updateDesktopCenterTile", 'desktop play surface should preserve center content while annotating the current tile');
  assertContains(appContent, "_directionLabel", 'desktop play surface should label directional movement cells');
  assertContains(template, '.desktop-play-cell:focus-visible', 'desktop movement cells should expose keyboard focus styling');
  assertContains(template, '.scene-actions .target-action-row', 'desktop target actions should be bounded inside the scene action area');
  assertContains(template, 'width: min(100%, 560px);', 'desktop target action row should have a compact maximum width');
  assertContains(template, 'grid-template-columns: repeat(auto-fit, minmax(58px, 82px));', 'desktop target actions should use compact grid tracks');
  assertContains(template, 'text-overflow: ellipsis;', 'desktop target action captions should clip instead of pushing horizontal scroll');
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

test('Default species canon is sapient and person-like', () => {
  assertContains(appContent, 'DEFAULT_SPECIES_CANON:', 'Default species canon missing');
  assertContains(appContent, 'SPECIES_CANON:', 'Species canon registry missing');
  assertContains(appContent, "_applySpeciesCanon(unit)", 'Species canon should normalize units');
  assertContains(appContent, 'interactionEligibility:', 'Species canon should include interaction eligibility metadata');
  assertContains(appContent, '_hasBaselineInteractionEligibility', 'Baseline interaction should be gated by species canon');
  assertContains(appContent, "baselineInteraction === 'sapient'", 'Baseline interaction eligibility should require sapient canon metadata');
  assertContains(appContent, "name: 'Wolfkin'", 'Wolf default display should read as folk/kin');
  assertContains(appContent, "name: 'Bunnyfolk'", 'Bunny default display should read as folk/kin');
  assertContains(appContent, "name: 'Mousefolk'", 'Mouse default display should read as folk/kin');
  assertNotContains(appContent, "bodyPlan: 'animal'", 'Default species should not be classified as ordinary animals');
  assertNotContains(appContent, "sapience: 'animal'", 'Default species should not use animal sapience');
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
    removeAttribute(name) { attributes.delete(name); },
    contains(target) { return target === this || target?.parentNode === this; },
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
    `${worldGenerationContent}\n${assetManifestContent}\n${appContent}\nreturn window.App;`
  );
  const App = appFactory(
    {},
    document,
    localStorage,
    {
      preferences: { maxTier: 3, voreEnabled: true, explicitDescriptions: true, language: 'en' },
      locales: {
        en: {
          'action.fight': 'Fight', 'action.flirt': 'Flirt', 'action.fuck': 'Fuck', 'action.feast': 'Feast', 'action.feed': 'Feed', 'action.flee': 'Flee', 'action.moveRow': 'Move Row', 'action.sync': 'Sync', 'action.skip': 'Skip', 'action.search': 'Search', 'action.rest': 'Rest', 'action.inventory': 'Items', 'action.interact': 'Interact', 'action.stats': 'Stats', 'action.inspect': 'Inspect', 'action.recruit': 'Recruit', 'action.acceptQuest': 'Accept Quest', 'action.viewQuest': 'View Quest', 'action.trade': 'Trade', 'action.acceptQuestFrom': 'Accept quest from {name}', 'action.viewQuestFrom': 'View quest from {name}', 'action.tradeWith': 'Trade with {name}', 'action.loot': 'Loot', 'action.scavenge': 'Scavenge',
          'inventory.use': 'Use', 'inventory.equip': 'Equip', 'inventory.drop': 'Drop', 'inventory.unequip': 'Unequip', 'inventory.back': 'Back', 'inventory.useItem': 'Use {name}', 'inventory.equipItem': 'Equip {name}', 'inventory.dropItem': 'Drop {name}', 'inventory.unequipSlot': 'Unequip {slot}', 'inventory.full': 'Inventory is full.', 'inventory.empty': 'Empty.', 'inventory.noItemsMatch': 'No items match the current filter.', 'inventory.titleWithCount': 'Inventory ({count}/{max})', 'inventory.equippedSection': 'Equipped', 'inventory.equipped': 'Equipped {name}.', 'inventory.unequipped': 'Unequipped {name}.', 'inventory.noEquipment': 'No equipment', 'inventory.noBonus': 'No bonus', 'inventory.effect': 'Effect',
          'item.category': 'Category', 'item.category.all': 'All', 'item.category.consumable': 'Consumable', 'item.category.equipment': 'Equipment', 'item.category.valuable': 'Valuable', 'item.category.material': 'Material', 'item.category.misc': 'Misc', 'item.sort': 'Sort', 'item.sort.name': 'Name', 'item.sort.type': 'Type', 'item.sort.valueDesc': 'Value ↓', 'item.sort.valueAsc': 'Value ↑',
          'trade.title': '{name} Trade', 'trade.gold': 'Gold: {gold}', 'trade.buy': 'Buy', 'trade.sell': 'Sell', 'trade.buyItem': 'Buy {name}', 'trade.sellItem': 'Sell {name}', 'trade.needGold': 'You need {price} gold to buy {name}.', 'trade.confirmBuy': 'Buy {name} for {price} gold?', 'trade.purchaseCancelled': 'Purchase cancelled: {name}.', 'trade.bought': 'Bought {name} for {price} gold.', 'trade.sold': 'Sold {name} for {price} gold.', 'trade.noStockMatches': 'No stock matches the current filter.', 'trade.noItemsToSell': 'No items to sell.', 'trade.noInventoryMatches': 'No inventory items match the current filter.',
          'quest.title': 'Quests', 'quest.status': 'Status', 'quest.sort': 'Sort', 'quest.filter.all': 'All', 'quest.filter.active': 'Active', 'quest.filter.turnIn': 'Turn In', 'quest.filter.completed': 'Completed', 'quest.sort.status': 'Status', 'quest.sort.title': 'Title', 'quest.showOnMap': 'Show On Map', 'quest.showTurnIn': 'Show Turn-In', 'quest.turnIn': 'Turn In', 'quest.showOnMapFor': 'Show {name} on map', 'quest.showTurnInFor': 'Show turn-in for {name}', 'quest.turnInQuest': 'Turn in {name}', 'quest.status.active': 'Active', 'quest.status.completed': 'Completed', 'quest.status.turnIn': 'Turn In', 'quest.noneActive': 'No active quests.', 'quest.noneMatchFilter': 'No quests match the current filter.', 'quest.alreadyInLog': '{title} is already in your quest log.', 'quest.accepted': 'Quest accepted: {title}.', 'quest.completed': 'Quest completed: {title}.', 'quest.completedTurnIn': 'Quest completed: {title}. Return to {giver} for your reward.', 'quest.defaultGiver': 'the quest giver', 'quest.notReadyTurnIn': 'That quest is not ready to turn in.', 'quest.alreadyTurnedIn': '{title} has already been turned in.', 'quest.turnedIn': 'Quest turned in: {title}.', 'quest.noObjectiveMarker': 'No map marker is available for that quest objective.', 'quest.mapFocusedObjective': 'Map focused on {title}: {label}.', 'quest.noTurnInLocation': 'No turn-in location is available for that quest.', 'quest.mapFocusedTurnIn': 'Map focused on {title} turn-in: {label}.', 'quest.checkpoint': 'Checkpoint', 'quest.checkpoint.complete': 'Complete', 'quest.checkpoint.current': 'Current', 'quest.checkpoint.pending': 'Pending', 'quest.checkpointAria': '{state} checkpoint {index}: {label} at {x}, {y}{guidance}', 'quest.youAreHere': 'You are here', 'quest.direction.north': '{count} north', 'quest.direction.south': '{count} south', 'quest.direction.east': '{count} east', 'quest.direction.west': '{count} west', 'quest.step.singular': 'step', 'quest.step.plural': 'steps', 'quest.guidance': '{distance} {stepLabel} {directions}', 'quest.terrainKnownRoute': 'known route crosses {parts}', 'quest.terrainRoad': '{count} road', 'quest.terrainBridge': '{count} bridge', 'quest.terrainRough': '{count} rough terrain', 'quest.markerPreview': 'Marker: {label} ({x}, {y})', 'quest.turnInPreview': 'Turn in with {label} ({x}, {y})',
          'perk.choose': 'Choose Perk', 'perk.chooseCount': 'Choose Perk ({count})', 'perk.pending': 'Pending choices: {count}', 'perk.trees': 'Perk trees', 'perk.filter.all': 'All', 'perk.chooseNamed': 'Choose {name}', 'perk.back': 'Back', 'perk.respec': 'Respec Perks', 'perk.debugGrant': 'Debug +1 Perk Choice', 'perk.closeStats': 'Close', 'perk.levelUp': 'Level up! You are now level {level}. All stats increased!', 'perk.chooseNew': 'Choose a new perk from the perk tree.', 'perk.notAvailable': 'That perk is not available yet.', 'perk.chosen': 'Perk chosen: {name}. {description}', 'perk.noneToRespec': 'No perks selected to respec.', 'perk.confirmRespec': 'Reset selected perks and refund their choices?', 'perk.respecDoneOne': 'Perks reset. Refunded {count} choice.', 'perk.respecDoneMany': 'Perks reset. Refunded {count} choices.',
          'ui.close': 'Close', 'ui.cancel': 'Cancel', 'ui.actionLegend': 'Action legend', 'ui.menu.newGame': 'New Game', 'ui.menu.newGameTitle': 'Start a new game', 'ui.menu.tutorialTitle': 'Open tutorial', 'ui.tutorial.skip': 'Skip Tutorial', 'ui.tutorial.next': 'Next ->', 'ui.tutorial.welcome.title': 'Welcome', 'ui.tutorial.welcome.content': 'You are wild in a strange living world. Explore, learn your limits, and grow stronger. Choose your risks carefully.', 'ui.tutorial.combat.title': 'Combat', 'ui.tutorial.combat.content': 'In combat, you take turns with enemies and allies. Use Fight, Flirt, Fuck, Feast, Feed, or Flee. Sync actions let multiple allies act together.', 'ui.tutorial.feast.title': 'Feast', 'ui.tutorial.feast.content': 'Feast on weakened targets to contain them. Capacity matters, and some settings change whether outcomes are safe or harsher.', 'ui.tutorial.party.title': 'Party', 'ui.tutorial.party.content': 'Recruit willing creatures, assign roles, choose AI orders, and manage who acts in exploration or combat.', 'ui.tutorial.ready.title': 'Ready', 'ui.tutorial.ready.content': 'Start exploring when you are ready. Use the map, party, and creature panels to keep the flow manageable.', 'ui.log.search': 'Search log', 'settings.title': 'Settings', 'settings.interfaceLanguage': 'Interface Language', 'ui.creatureActions': 'Creature actions', 'ui.partyActions': 'Party actions', 'ui.tacticalStatus': 'Tactical status', 'ui.unitTraits': 'Unit traits', 'ui.exploration': 'Exploration', 'ui.chooseAction': 'Choose your next action.', 'ui.actorActing': '{name} is acting...', 'mobile.combat.actor': '{name} to act', 'mobile.combat.chooseAction': 'Choose an action, then tap a target.', 'mobile.combat.enemyTurn': '{name} is acting.', 'mobile.combat.pickTarget': 'Pick a target in the enemy strip for {action}.', 'mobile.combat.status': 'Round {round} · Turn {turn}/{total}', 'mobile.combat.targeting': 'Targeting: {action}', 'ui.welcomeLog': 'Welcome to You Are Wild', 'ui.scene.wildernessTitle': 'The Wilderness', 'ui.scene.wildernessIntro': 'You find yourself in an untamed land where predators roam and only the strong survive.', 'ui.scene.wildernessAmbient': 'The air is thick with the scent of pine and the distant calls of creatures unknown.', 'ui.log.createdCharacter': 'Created your character. The journey begins...', 'ui.area': 'Area', 'ui.enemies': 'Enemies', 'ui.creatures': 'Creatures', 'ui.noCreaturesPresent': 'No creatures present', 'ui.noCreaturesHere': 'No creatures here', 'target.chooseFromPanel': 'Select a target from the creature panel.', 'target.cancelAction': 'Cancel {action}', 'log.movedTo': 'Moved to {x}, {y} ({biome})', 'log.inCombatCannotMove': 'You are in combat! Use Flee to escape.', 'log.discoveredLandmark': 'Discovered {name}!', 'log.restUnavailable': 'There is no safe place to rest here.', 'log.rested': 'Rested and recovered.', 'log.noEntriesMatchFilter': 'No log entries match the current filter.', 'recruit.partyFull': 'Party is full! Cannot recruit {name}', 'recruit.notReady': '{name} is not ready to join the party.', 'recruit.joined': '{name} joins your party!', 'recruit.confirmSubmissive': '{name} is submissive. Recruit them to your party?', 'feed.optionsTitle': 'Feed Options', 'feed.noOptions': 'No feed options available right now.', 'feed.noWoundedAllies': 'No wounded allies to feed.', 'feed.noWillingLivestock': 'No willing livestock to sacrifice.', 'feed.noForceFeedEnemies': 'No enemies to force-feed.', 'feed.noValidTarget': 'No valid target for this feed action.',
          'disposition.hostile': 'Hostile', 'disposition.friendly': 'Friendly', 'disposition.neutral': 'Neutral', 'disposition.quest': 'Quest', 'disposition.merchant': 'Merchant', 'disposition.remains': 'Remains', 'unit.trait.asleep': 'Asleep', 'unit.trait.poisoned': 'Poison', 'unit.trait.burning': 'Burning', 'unit.trait.bleeding': 'Bleeding', 'unit.trait.stunned': 'Stunned', 'unit.trait.frozen': 'Frozen', 'unit.trait.fear': 'Fear', 'unit.trait.restrained': 'Restrained', 'unit.trait.wounded': 'Wounded', 'unit.trait.hungry': 'Hungry', 'unit.trait.flying': 'Flying', 'unit.trait.darkvision': 'Darkvision', 'combat.row': 'Row', 'combat.row.front': 'Front', 'combat.row.back': 'Back', 'combat.group': 'Group', 'combat.turnOrder': 'Turn order', 'combat.status.current': '{name} is the current combat actor at turn {order}.', 'combat.status.queued': '{name} is queued at turn {order}.', 'combat.status.queuedActed': '{name} is queued at turn {order} and has already acted this round.', 'combat.status.syncParticipant': '{name} is participant in queued group {action} resolving at turn {order}.', 'combat.status.syncTarget': '{name} is target of queued group {action} resolving at turn {order}.', 'combat.status.canTarget': '{name} can be selected as the {action} target.', 'combat.status.cannotTarget': '{name} cannot be selected as the {action} target.', 'combat.status.choosingTarget': '{name} is choosing a {action} target.', 'combat.moveRowLog': '{name} moves to the {row} row.', 'combat.cannotReachTarget': '{actor} cannot reach {target} from here.', 'combat.flee.noEnemies': 'No enemies to flee from!', 'combat.flee.success': 'You flee successfully!', 'combat.flee.failed': 'Flee failed! {name} intercepts you!', 'combat.godModeSaved': 'God Mode saved you from death!', 'combat.playerFallen': 'You have fallen! Game Over!', 'combat.hardcoreSaveDeleted': 'HARDCORE MODE: Your save has been deleted.', 'combat.playerKnockedOut': 'You have been knocked out! Your party must finish the fight...', 'combat.partyWipedOut': 'Your party has been wiped out!', 'combat.alliesContinue': 'Your allies continue the fight...', 'combat.playerComesTo': '{name} comes to after the fight.', 'combat.victory': 'Victory! Enemies defeated or subdued.', 'combat.escapedEncounter': 'You escaped the encounter.', 'combat.defeat': 'Defeat...', 'combat.confirmReturnToMenu': 'Defeat! Return to menu?', 'combat.notInCombat': 'Not in combat!', 'combat.instantWin': 'Instant Win', 'combat.instantWinTitle': 'Instantly defeat all enemies', 'combat.instantWinNotInCombat': 'Not in combat! Instant Win only works during combat.', 'combat.instantWinRequiresOverpowered': 'Instant Win requires Overpowered mode.', 'combat.instantWinSuccess': 'Instant Win! All enemies are defeated.', 'combat.allyScavenges': "{ally} scavenges {target}'s remains after the fight.", 'combat.allyHolds': '{name} holds position.', 'combat.allyCannotReach': '{name} cannot reach any target.', 'combat.enemyReinforces': '{enemy} calls for help! {reinforcement} joins the fight.', 'combat.enemyRage': '{name} enters a rage!', 'combat.enemyFlees': '{name} flees in terror!', 'combat.status.poisoned': '{name} is poisoned!', 'combat.status.constricted': '{actor} constricts {target}! They are restrained.', 'combat.status.enveloped': '{actor} envelops {target}!', 'combat.status.stunned': '{name} is stunned and loses their turn!', 'combat.status.frozen': '{name} is frozen in place and loses their turn!', 'combat.status.asleep': '{name} is asleep and cannot act!', 'combat.status.fearFlee': '{name} panics and flees from fear!', 'combat.status.fearFrozen': '{name} freezes in fear and loses their turn!', 'combat.status.recovering': '{name} is recovering and skips their turn.', 'combat.status.restrainedSkip': '{name} is restrained and cannot act!', 'combat.status.stuck': '{name} is stuck in the terrain and loses their turn!', 'combat.allyFlees': '{name} loses their nerve and flees from the fight!', 'combat.allyFleeFailed': '{name} tries to flee but cannot get away!', 'combat.allyTooAroused': '{name} is too aroused to obey!', 'combat.enemyCannotReach': '{enemy} cannot reach {target}.', 'cheat.toggled': 'Cheat {name}: {state}', 'cheat.state.on': 'ON', 'cheat.state.off': 'OFF', 'cheat.overpoweredMaxed': 'Overpowered! All stats maxed.', 'combat.waitForTurn': 'Wait for your turn!', 'combat.notYourTurn': 'Not your turn!', 'combat.sync.chooseAction': 'Choose Sync Action', 'combat.sync.noAllies': 'No allies available for sync.', 'combat.sync.action.fuck': 'Group Seduce', 'combat.sync.action.flirt': 'Group Flirt', 'combat.sync.action.fight': 'Group Fight', 'combat.sync.action.feed': 'Group Feed', 'combat.sync.selectParticipants': 'Select participants for sync', 'combat.sync.selectParticipantFor': 'Select {name} for sync', 'combat.sync.confirmParticipants': 'Confirm Participants', 'combat.sync.needParticipants': 'Need at least 2 participants for a sync action.', 'combat.sync.selectTarget': 'Select sync target', 'combat.sync.selectTargetFor': 'Select {name} as sync target', 'combat.sync.failedNoQueue': 'Sync failed! Participants are no longer in the turn queue.', 'combat.sync.failedIncapacitated': 'Sync failed! {names} cannot participate.', 'capacity.stomach': 'Stomach', 'capacity.womb': 'Womb', 'capacity.balls': 'Balls', 'capacity.owner.your': 'Your', 'capacity.owner.named': "{name}'s", 'capacity.tooFull': '{owner} {container} is too full for {target}!', 'structure.noStructure': 'There is no structure to enter here.', 'structure.entered': 'Entered {name}.', 'structure.exited': 'Exited {name}.', 'structure.movedInside': 'Moved inside {name} to {x}, {y}.', 'structure.fallbackName': 'the structure', 'structure.wallBlocked': 'A wall blocks the way.',
          'party.stats': 'Stats', 'party.you': 'You', 'party.ally': 'Ally', 'party.leader': 'Leader', 'party.levelSpecies': 'Level {level} {species}', 'party.punishment': 'Punishment', 'party.pleasure': 'Pleasure', 'party.hunger': 'Hunger', 'party.combat': 'Combat', 'party.attributes': 'Attributes', 'party.capacity': 'Capacity', 'party.equipment': 'Equipment', 'party.perks': 'Perks', 'party.none': 'None', 'character.xp': 'XP: {xp}/{xpToNext}', 'character.combatStats': 'Combat Stats', 'character.body': 'Body', 'character.size': 'Size', 'character.appetite': 'Appetite', 'character.parts': 'Parts', 'character.chest': 'Chest', 'character.bodyParts': 'Body', 'character.perkTools': 'Perk Tools', 'character.perkToolsHelp': 'Balance/debug controls.', 'party.makeLeader': 'Make Leader', 'party.role': 'Role', 'party.aiOrder': 'AI Order', 'party.role.companion': 'Companion', 'party.role.scout': 'Scout', 'party.role.guard': 'Guard', 'party.role.support': 'Support', 'party.role.gatherer': 'Gatherer', 'party.roleDescription.companion': 'No special exploration role.', 'party.roleDescription.scout': 'Improves night visibility and route awareness.', 'party.roleDescription.guard': 'Reduces ambush advantage and helps protect camp.', 'party.roleDescription.support': 'Improves recovery when resting somewhere safe.', 'party.roleDescription.gatherer': 'Improves search and foraging results.', 'party.aiOrder.aggressive': 'Aggressive', 'party.aiOrder.defensive': 'Defensive', 'party.aiOrder.healer': 'Healer', 'party.aiOrder.scavenger': 'Scavenger', 'party.aiOrder.passive': 'Passive', 'party.aiOrderDescription.aggressive': 'Prioritizes attacking reachable threats.', 'party.aiOrderDescription.defensive': 'Favors safer positioning and protecting allies.', 'party.aiOrderDescription.healer': 'Feeds the most wounded ally first.', 'party.aiOrderDescription.scavenger': 'Looks for corpse-feast opportunities after victory.', 'party.aiOrderDescription.passive': 'Avoids acting unless wounded or pressured.', 'party.dismiss': 'Dismiss', 'party.statsFor': 'Show stats for {name}', 'party.makeLeaderFor': 'Make {name} party leader', 'party.dragToReorder': 'Drag {name} to reorder', 'party.moveUp': 'Move {name} up', 'party.moveDown': 'Move {name} down', 'party.dismissFor': 'Dismiss {name}', 'party.confirmDismiss': 'Dismiss {name} from the party?', 'party.dismissed': '{name} leaves the party.', 'party.dismissedNearby': '{name} leaves the party and remains nearby.', 'party.roleSet': '{name} is assigned as {role}.', 'party.aiOrderSet': '{name} will act {order}.', 'party.leaderSet': '{name} is now party leader.', 'party.positionChanged': '{name} changes party position.', 'party.roleFor': 'Party role for {name}', 'party.aiOrderFor': 'AI order for {name}',
          'save.title': 'Save Slots', 'save.loadTitle': 'Load Game', 'save.saveTitle': 'Save Game', 'save.newTitle': 'Choose New Game Slot', 'save.description': 'Auto-save is always on. Empty slots start a new game; occupied slots can load, start a new run, save over, or delete only that slot.', 'save.loadDescription': 'Choose a save to load, start a new run in a slot, or delete one slot.', 'save.saveDescription': 'Choose where to save the current game. Occupied slots warn before overwrite.', 'save.newDescription': 'Pick an empty slot for the new run, or deliberately overwrite an occupied slot.',
          'save.toolbarNew': 'New Game', 'save.toolbarHint': 'Choose a slot next; occupied slots warn before overwrite.', 'save.slotLabel': 'Slot {number}', 'save.savedGame': 'Saved game', 'save.openSlot': 'Open slot', 'save.empty': 'Empty', 'save.slotHint.emptyLoad': 'Empty slot: start a new game here.', 'save.slotHint.occupiedLoad': 'Saved slot: load, start a new run, or delete this slot only.', 'save.slotHint.emptySave': 'Empty slot: save the current game here.', 'save.slotHint.occupiedSave': 'Occupied slot: saving here may require overwrite confirmation.', 'save.slotHint.emptyNew': 'Empty slot: ready for a new run.', 'save.slotHint.occupiedNew': 'Occupied slot: overwriting requires confirmation.', 'save.slotActions.label': 'Available slot actions', 'save.slotActions.emptyLoad': 'Actions: New Game', 'save.slotActions.occupiedLoad': 'Actions: Load, New Run, Delete', 'save.slotActions.emptySave': 'Actions: Save', 'save.slotActions.occupiedSave': 'Actions: Save, Delete', 'save.slotActions.emptyNew': 'Actions: Use Empty Slot', 'save.slotActions.occupiedNew': 'Actions: Overwrite, Delete', 'save.useEmpty': 'Use Empty Slot', 'save.overwriteSlot': 'Overwrite Slot',
          'save.newRun': 'New Run', 'save.load': 'Load', 'save.save': 'Save', 'save.delete': 'Delete', 'save.close': 'Close', 'save.action.newGame': 'Choose a slot for a new game', 'save.action.useEmpty': 'Start new game in {slot}', 'save.action.overwrite': 'Overwrite {slot} with a new game', 'save.action.newRun': 'Start a new run in {slot}', 'save.action.load': 'Load {slot}', 'save.action.save': 'Save current game to {slot}', 'save.action.delete': 'Delete {slot}',
          'settings.confirmClearAllData': 'WARNING: This will delete ALL saves, modules, and game data. This cannot be undone. Are you sure?', 'settings.clearAllDataDone': 'All data cleared. Refresh the page to start fresh.',
          'save.confirm.newGameOverwrite': 'Start a new game in {slot}? This will overwrite that save slot. This cannot be undone.', 'save.confirm.manualOverwrite': 'Overwrite {slot} with the current game? This cannot be undone.', 'save.confirm.deleteSlot': 'Delete save slot {slot}? This permanently removes only this slot and cannot be undone.', 'save.confirmDeleteAll': 'Delete ALL save data? This cannot be undone!', 'save.error.noGame': 'No game to save!', 'save.error.noSave': 'No save in {slot}', 'save.success.saved': 'Game saved to {slot}!', 'save.success.deletedAll': 'All saves deleted.', 'save.recoveredOnLoad': 'You were revived from the brink of defeat. Welcome back, {name}.', 'save.error.saveFailed': 'Save failed: {message}', 'save.error.loadFailed': 'Load failed: {message}', 'save.error.deleteFailed': 'Delete failed: {message}', 'save.error.deleteAllFailed': 'Delete saves failed: {message}', 'save.recovery.prompt': 'Save data is incompatible or corrupted. Options:\n\n1 = Delete save\n2 = Download backup (as base64)\n3 = Cancel\n\nEnter 1, 2, or 3:', 'save.recovery.deleted': 'Save deleted.', 'save.recovery.backupDownloaded': 'Backup downloaded. Save remains intact.',
          'target.actors': 'Actors', 'target.targets': 'Targets', 'target.act': 'Act', 'target.mark': 'Target', 'target.selectActorFor': 'Select {name} to act', 'target.markFor': 'Mark {name} as target', 'target.selectAs': 'Select {name} as {action} target', 'target.cannotSelectAs': 'Cannot select {name} as {action} target', 'target.selectedSummary': 'Selected exploration targets', 'target.chooseOneActor': 'Choose one actor for multi-target {action} actions, or one target for group {action} actions. Current selection has {actorCount} actors and {targetCount} targets.', 'target.cannotHandleMultiple': '{name} cannot handle {count} targets with {action} yet.', 'target.multiActionDone': '{name} finishes a multi-target {action} action on {targets}.', 'target.multiActionNone': '{name} finds no valid targets for multi-target {action}.', 'target.pairedActionDone': 'Paired {action} actions resolved: {pairs}.', 'target.skippedFullTargets': 'Skipped full targets: {targets}.', 'target.clear': 'Clear', 'target.count': '{count} target', 'target.count_plural': '{count} targets', 'target.clearSelected': 'Clear selected targets', 'explore.fight.hit': '{actor} hits {target} for {amount} punishment.', 'explore.fight.subdued': '{target} is subdued.', 'explore.fuck.success': '{actor} pleasures {target}. Their arousal rises to {current}/{max}.', 'explore.fuck.devoted': '{target} orgasms and is completely devoted.', 'explore.fuck.recover': '{target} needs a moment to recover...', 'explore.fuck.resists': '{target} is not in the mood.', 'explore.feast.swallow': '{actor} swallows {target} whole. They settle in {owner} stomach.', 'explore.feast.tooStrong': '{target} is too large or strong to eat.', 'explore.flirt.success': '{actor} flirts with {target}. Their guard lowers. Pleasure rises to {current}/{max}.', 'explore.flirt.charmed': '{target} is utterly charmed and becomes friendly!', 'explore.flirt.rebuff': '{target} rebuffs the flirtation!', 'explore.feed.success': '{actor} feeds {target}, restoring {amount} punishment and sating their hunger.', 'explore.recruit.possible': '{target} may be willing to join the party.', 'group.feed.selfBlocked': '{name} cannot feed into themself yet.', 'group.feed.playerBlocked': '{name} cannot be handed off as prey right now.', 'group.feed.partyToConsumer': '{prey} is fed to {consumer} and settles in their stomach.', 'group.feed.helpers': '{helpers} help feed {prey} to {target}.', 'group.feed.tend': '{actors} tend {target}, restoring {amount} punishment.', 'group.feed.tendTogether': '{actors} tend {target} together, restoring {amount} punishment.', 'group.feed.creature': '{actors} feed {target}, restoring {amount} punishment.', 'group.fight.roughCollapse': '{name} collapses from the rough play.', 'group.fight.pinned': 'They are pinned but not seriously hurt.', 'group.fight.sparTogether': '{actors} spar together, each taking {amount} punishment.', 'group.mutual.feed': '{actors} tend each other, restoring {amount} punishment where needed.', 'group.mutual.feastBlocked': '{actors} cannot feast on themselves as a mutual group. Choose a primary target instead.', 'group.mutual.fight': '{actors} spar as a mutual group, each taking {amount} punishment.', 'group.mutual.social': '{actors} share {action} as a mutual group. Pleasure rises for everyone involved.', 'group.fight.playFight': '{actors} play-fight {target} for {amount} punishment.', 'group.fight.collapses': '{target} collapses.', 'group.feast.noHelpers': '{target} cannot be split without helpers.', 'group.feast.split': '{actors} split {target} into chewable portions.', 'group.feast.selfBlocked': '{target} cannot feast on themself. Select other party members as actors to consume this target, or select {target} alone to feast on another target.', 'group.feast.tooStrong': '{target} is too large or strong for {actors} to consume.', 'group.feast.swallow': '{helpers} help {primary} swallow {target}.', 'group.social.share': '{actors} share {action} with {target}. Pleasure spreads through the group; {target} rises to {current}/{max}.', 'group.social.focus': '{actors} focus on {target}. Pleasure rises to {current}/{max}.', 'group.social.resists': "{target} resists the group's attention."
        },
        es: {
          'action.fight': 'Luchar', 'action.flirt': 'Coquetear', 'action.fuck': 'Seducir', 'action.feast': 'Devorar', 'action.feed': 'Alimentar', 'action.flee': 'Huir', 'action.moveRow': 'Mover fila', 'action.sync': 'Sincronizar', 'action.skip': 'Saltar', 'action.search': 'Buscar', 'action.rest': 'Descansar', 'action.inventory': 'Objetos', 'action.interact': 'Interactuar', 'action.stats': 'Estadisticas', 'action.inspect': 'Inspeccionar', 'action.recruit': 'Reclutar', 'action.acceptQuest': 'Aceptar mision', 'action.viewQuest': 'Ver mision', 'action.trade': 'Comerciar', 'action.acceptQuestFrom': 'Aceptar mision de {name}', 'action.viewQuestFrom': 'Ver mision de {name}', 'action.tradeWith': 'Comerciar con {name}', 'action.loot': 'Saquear', 'action.scavenge': 'Rebuscar',
          'inventory.use': 'Usar', 'inventory.equip': 'Equipar', 'inventory.drop': 'Soltar', 'inventory.unequip': 'Desequipar', 'inventory.back': 'Volver', 'inventory.useItem': 'Usar {name}', 'inventory.equipItem': 'Equipar {name}', 'inventory.dropItem': 'Soltar {name}', 'inventory.unequipSlot': 'Desequipar {slot}', 'inventory.full': 'El inventario esta lleno.', 'inventory.empty': 'Vacio.', 'inventory.noItemsMatch': 'No hay articulos que coincidan con el filtro actual.', 'inventory.titleWithCount': 'Inventario ({count}/{max})', 'inventory.equippedSection': 'Equipado', 'inventory.equipped': 'Equipaste {name}.', 'inventory.unequipped': 'Desequipaste {name}.', 'inventory.noEquipment': 'Sin equipo', 'inventory.noBonus': 'Sin bonificacion', 'inventory.effect': 'Efecto',
          'item.category': 'Categoria', 'item.category.all': 'Todos', 'item.category.consumable': 'Consumible', 'item.category.equipment': 'Equipo', 'item.category.valuable': 'Valioso', 'item.category.material': 'Material', 'item.category.misc': 'Varios', 'item.sort': 'Ordenar', 'item.sort.name': 'Nombre', 'item.sort.type': 'Tipo', 'item.sort.valueDesc': 'Valor ↓', 'item.sort.valueAsc': 'Valor ↑',
          'trade.title': 'Comercio con {name}', 'trade.gold': 'Oro: {gold}', 'trade.buy': 'Comprar', 'trade.sell': 'Vender', 'trade.buyItem': 'Comprar {name}', 'trade.sellItem': 'Vender {name}', 'trade.needGold': 'Necesitas {price} de oro para comprar {name}.', 'trade.confirmBuy': 'Comprar {name} por {price} de oro?', 'trade.purchaseCancelled': 'Compra cancelada: {name}.', 'trade.bought': 'Compraste {name} por {price} de oro.', 'trade.sold': 'Vendiste {name} por {price} de oro.', 'trade.noStockMatches': 'No hay existencias que coincidan con el filtro actual.', 'trade.noItemsToSell': 'No hay articulos para vender.', 'trade.noInventoryMatches': 'No hay articulos de inventario que coincidan con el filtro actual.',
          'quest.title': 'Misiones', 'quest.status': 'Estado', 'quest.sort': 'Ordenar', 'quest.filter.all': 'Todas', 'quest.filter.active': 'Activas', 'quest.filter.turnIn': 'Entregar', 'quest.filter.completed': 'Completadas', 'quest.sort.status': 'Estado', 'quest.sort.title': 'Titulo', 'quest.showOnMap': 'Mostrar en mapa', 'quest.showTurnIn': 'Mostrar entrega', 'quest.turnIn': 'Entregar', 'quest.showOnMapFor': 'Mostrar {name} en mapa', 'quest.showTurnInFor': 'Mostrar entrega de {name}', 'quest.turnInQuest': 'Entregar {name}', 'quest.status.active': 'Activa', 'quest.status.completed': 'Completada', 'quest.status.turnIn': 'Entregar', 'quest.noneActive': 'No hay misiones activas.', 'quest.noneMatchFilter': 'No hay misiones que coincidan con el filtro actual.', 'quest.alreadyInLog': '{title} ya esta en tu registro de misiones.', 'quest.accepted': 'Mision aceptada: {title}.', 'quest.completed': 'Mision completada: {title}.', 'quest.completedTurnIn': 'Mision completada: {title}. Vuelve con {giver} para recibir tu recompensa.', 'quest.defaultGiver': 'quien dio la mision', 'quest.notReadyTurnIn': 'Esa mision aun no esta lista para entregar.', 'quest.alreadyTurnedIn': '{title} ya fue entregada.', 'quest.turnedIn': 'Mision entregada: {title}.', 'quest.noObjectiveMarker': 'No hay marcador de mapa disponible para ese objetivo de mision.', 'quest.mapFocusedObjective': 'Mapa enfocado en {title}: {label}.', 'quest.noTurnInLocation': 'No hay ubicacion de entrega disponible para esa mision.', 'quest.mapFocusedTurnIn': 'Mapa enfocado en entrega de {title}: {label}.', 'quest.checkpoint': 'Punto de ruta', 'quest.checkpoint.complete': 'Completado', 'quest.checkpoint.current': 'Actual', 'quest.checkpoint.pending': 'Pendiente', 'quest.checkpointAria': '{state} punto de ruta {index}: {label} en {x}, {y}{guidance}', 'quest.youAreHere': 'Estas aqui', 'quest.direction.north': '{count} norte', 'quest.direction.south': '{count} sur', 'quest.direction.east': '{count} este', 'quest.direction.west': '{count} oeste', 'quest.step.singular': 'paso', 'quest.step.plural': 'pasos', 'quest.guidance': '{distance} {stepLabel} {directions}', 'quest.terrainKnownRoute': 'la ruta conocida cruza {parts}', 'quest.terrainRoad': '{count} camino', 'quest.terrainBridge': '{count} puente', 'quest.terrainRough': '{count} terreno dificil', 'quest.markerPreview': 'Marcador: {label} ({x}, {y})', 'quest.turnInPreview': 'Entregar con {label} ({x}, {y})',
          'perk.choose': 'Elegir mejora', 'perk.chooseCount': 'Elegir mejora ({count})', 'perk.pending': 'Opciones pendientes: {count}', 'perk.trees': 'Arboles de mejoras', 'perk.filter.all': 'Todas', 'perk.chooseNamed': 'Elegir {name}', 'perk.back': 'Volver', 'perk.respec': 'Reiniciar mejoras', 'perk.debugGrant': 'Debug +1 opcion de mejora', 'perk.closeStats': 'Cerrar', 'perk.levelUp': 'Subiste de nivel! Ahora eres nivel {level}. Todas las estadisticas aumentaron!', 'perk.chooseNew': 'Elige una nueva mejora del arbol de mejoras.', 'perk.notAvailable': 'Esa mejora aun no esta disponible.', 'perk.chosen': 'Mejora elegida: {name}. {description}', 'perk.noneToRespec': 'No hay mejoras seleccionadas para reiniciar.', 'perk.confirmRespec': 'Reiniciar mejoras seleccionadas y reembolsar sus opciones?', 'perk.respecDoneOne': 'Mejoras reiniciadas. Se reembolso {count} opcion.', 'perk.respecDoneMany': 'Mejoras reiniciadas. Se reembolsaron {count} opciones.',
          'ui.close': 'Cerrar', 'ui.cancel': 'Cancelar', 'ui.actionLegend': 'Leyenda de acciones', 'ui.menu.newGame': 'Nueva partida', 'ui.menu.newGameTitle': 'Iniciar una partida nueva', 'ui.menu.tutorialTitle': 'Abrir tutorial', 'ui.tutorial.skip': 'Saltar tutorial', 'ui.tutorial.next': 'Siguiente ->', 'ui.tutorial.welcome.title': 'Bienvenida', 'ui.tutorial.welcome.content': 'Eres salvaje en un mundo vivo y extrano. Explora, aprende tus limites y hazte mas fuerte. Elige tus riesgos con cuidado.', 'ui.tutorial.combat.title': 'Combate', 'ui.tutorial.combat.content': 'En combate, tomas turnos con enemigos y aliados. Usa Luchar, Coquetear, Seducir, Devorar, Alimentar o Huir. Las acciones sincronizadas permiten que varios aliados actuen juntos.', 'ui.tutorial.feast.title': 'Devorar', 'ui.tutorial.feast.content': 'Devora objetivos debilitados para contenerlos. La capacidad importa, y algunos ajustes cambian si los resultados son seguros o mas duros.', 'ui.tutorial.party.title': 'Grupo', 'ui.tutorial.party.content': 'Recluta criaturas dispuestas, asigna roles, elige ordenes de IA y gestiona quien actua durante exploracion o combate.', 'ui.tutorial.ready.title': 'Listo', 'ui.tutorial.ready.content': 'Empieza a explorar cuando estes listo. Usa los paneles de mapa, grupo y criaturas para mantener el flujo manejable.', 'ui.log.search': 'Buscar registro', 'settings.title': 'Ajustes', 'settings.interfaceLanguage': 'Idioma de interfaz', 'ui.creatureActions': 'Acciones de criatura', 'ui.partyActions': 'Acciones del grupo', 'ui.tacticalStatus': 'Estado tactico', 'ui.unitTraits': 'Rasgos de unidad', 'ui.exploration': 'Exploracion', 'ui.chooseAction': 'Elige tu proxima accion.', 'ui.actorActing': '{name} esta actuando...', 'mobile.combat.actor': '{name} actua', 'mobile.combat.chooseAction': 'Elige una accion y luego toca un objetivo.', 'mobile.combat.enemyTurn': '{name} esta actuando.', 'mobile.combat.pickTarget': 'Elige un objetivo en la fila enemiga para {action}.', 'mobile.combat.status': 'Ronda {round} · Turno {turn}/{total}', 'mobile.combat.targeting': 'Objetivo: {action}', 'ui.welcomeLog': 'Bienvenido a You Are Wild', 'ui.scene.wildernessTitle': 'La Naturaleza', 'ui.scene.wildernessIntro': 'Te encuentras en una tierra indomita donde acechan depredadores y solo sobreviven los fuertes.', 'ui.scene.wildernessAmbient': 'El aire esta cargado de aroma a pino y llamadas lejanas de criaturas desconocidas.', 'ui.log.createdCharacter': 'Creaste tu personaje. El viaje comienza...', 'ui.area': 'Area', 'ui.enemies': 'Enemigos', 'ui.creatures': 'Criaturas', 'ui.noCreaturesPresent': 'No hay criaturas presentes', 'ui.noCreaturesHere': 'No hay criaturas aqui', 'target.chooseFromPanel': 'Selecciona un objetivo desde el panel de criaturas.', 'target.cancelAction': 'Cancelar {action}', 'log.movedTo': 'Movimiento a {x}, {y} ({biome})', 'log.inCombatCannotMove': 'Estas en combate! Usa Huir para escapar.', 'log.discoveredLandmark': 'Descubriste {name}!', 'log.restUnavailable': 'No hay un lugar seguro para descansar aqui.', 'log.rested': 'Descansaste y te recuperaste.', 'log.noEntriesMatchFilter': 'No hay entradas de registro que coincidan con el filtro actual.', 'recruit.partyFull': 'El grupo esta lleno! No se puede reclutar a {name}', 'recruit.notReady': '{name} aun no esta listo para unirse al grupo.', 'recruit.joined': '{name} se une a tu grupo!', 'recruit.confirmSubmissive': '{name} esta sumiso. Reclutarlo para tu grupo?', 'feed.optionsTitle': 'Opciones de alimentacion', 'feed.noOptions': 'No hay opciones de alimentacion disponibles ahora.', 'feed.noWoundedAllies': 'No hay aliados heridos para alimentar.', 'feed.noWillingLivestock': 'No hay ganado dispuesto para sacrificar.', 'feed.noForceFeedEnemies': 'No hay enemigos para forzar alimentacion.', 'feed.noValidTarget': 'No hay objetivo valido para esta accion de alimentar.',
          'disposition.hostile': 'Hostil', 'disposition.friendly': 'Amistoso', 'disposition.neutral': 'Neutral', 'disposition.quest': 'Mision', 'disposition.merchant': 'Mercader', 'disposition.remains': 'Restos', 'unit.trait.asleep': 'Dormido', 'unit.trait.poisoned': 'Veneno', 'unit.trait.burning': 'Ardiendo', 'unit.trait.bleeding': 'Sangrando', 'unit.trait.stunned': 'Aturdido', 'unit.trait.frozen': 'Congelado', 'unit.trait.fear': 'Miedo', 'unit.trait.restrained': 'Inmovilizado', 'unit.trait.wounded': 'Herido', 'unit.trait.hungry': 'Hambriento', 'unit.trait.flying': 'Volador', 'unit.trait.darkvision': 'Vision nocturna', 'combat.row': 'Fila', 'combat.row.front': 'Frente', 'combat.row.back': 'Retaguardia', 'combat.group': 'Grupo', 'combat.turnOrder': 'Orden de turno', 'combat.status.current': '{name} es el actor de combate actual en el turno {order}.', 'combat.status.queued': '{name} esta en cola para el turno {order}.', 'combat.status.queuedActed': '{name} esta en cola para el turno {order} y ya actuo esta ronda.', 'combat.status.syncParticipant': '{name} participa en el grupo {action} en cola que se resolvera en el turno {order}.', 'combat.status.syncTarget': '{name} es objetivo del grupo {action} en cola que se resolvera en el turno {order}.', 'combat.status.canTarget': '{name} puede seleccionarse como objetivo de {action}.', 'combat.status.cannotTarget': '{name} no puede seleccionarse como objetivo de {action}.', 'combat.status.choosingTarget': '{name} esta eligiendo un objetivo de {action}.', 'combat.moveRowLog': '{name} se mueve a la fila {row}.', 'combat.cannotReachTarget': '{actor} no puede alcanzar a {target} desde aqui.', 'combat.flee.noEnemies': 'No hay enemigos de los que huir!', 'combat.flee.success': 'Huyes con exito!', 'combat.flee.failed': 'Huida fallida! {name} te intercepta!', 'combat.godModeSaved': 'El modo dios te salvo de la derrota!', 'combat.playerFallen': 'Has caido! Fin de la partida!', 'combat.hardcoreSaveDeleted': 'MODO EXTREMO: Tu partida guardada fue borrada.', 'combat.playerKnockedOut': 'Has quedado fuera de combate! Tu grupo debe terminar la pelea...', 'combat.partyWipedOut': 'Tu grupo fue derrotado por completo!', 'combat.alliesContinue': 'Tus aliados continuan la pelea...', 'combat.playerComesTo': '{name} despierta despues de la pelea.', 'combat.victory': 'Victoria! Los enemigos fueron derrotados o sometidos.', 'combat.escapedEncounter': 'Escapaste del encuentro.', 'combat.defeat': 'Derrota...', 'combat.confirmReturnToMenu': 'Derrota! Volver al menu?', 'combat.notInCombat': 'No estas en combate!', 'combat.instantWin': 'Victoria instantanea', 'combat.instantWinTitle': 'Derrotar al instante a todos los enemigos', 'combat.instantWinNotInCombat': 'No estas en combate! Victoria instantanea solo funciona durante combate.', 'combat.instantWinRequiresOverpowered': 'Victoria instantanea requiere modo Sobrepotenciado.', 'combat.instantWinSuccess': 'Victoria instantanea! Todos los enemigos fueron derrotados.', 'combat.allyScavenges': '{ally} rebusca los restos de {target} despues del combate.', 'combat.allyHolds': '{name} mantiene la posicion.', 'combat.allyCannotReach': '{name} no puede alcanzar ningun objetivo.', 'combat.enemyReinforces': '{enemy} pide ayuda! {reinforcement} se une al combate.', 'combat.enemyRage': '{name} entra en furia!', 'combat.enemyFlees': '{name} huye aterrorizado!', 'combat.status.poisoned': '{name} queda envenenado!', 'combat.status.constricted': '{actor} constrine a {target}! Queda inmovilizado.', 'combat.status.enveloped': '{actor} envuelve a {target}!', 'combat.status.stunned': '{name} queda aturdido y pierde su turno!', 'combat.status.frozen': '{name} queda congelado y pierde su turno!', 'combat.status.asleep': '{name} esta dormido y no puede actuar!', 'combat.status.fearFlee': '{name} entra en panico y huye por miedo!', 'combat.status.fearFrozen': '{name} se paraliza de miedo y pierde su turno!', 'combat.status.recovering': '{name} se esta recuperando y pierde su turno.', 'combat.status.restrainedSkip': '{name} esta inmovilizado y no puede actuar!', 'combat.status.stuck': '{name} queda atrapado en el terreno y pierde su turno!', 'combat.allyFlees': '{name} pierde el valor y huye del combate!', 'combat.allyFleeFailed': '{name} intenta huir pero no logra escapar!', 'combat.allyTooAroused': '{name} esta demasiado excitado para obedecer!', 'combat.enemyCannotReach': '{enemy} no puede alcanzar a {target}.', 'cheat.toggled': 'Truco {name}: {state}', 'cheat.state.on': 'ACTIVADO', 'cheat.state.off': 'DESACTIVADO', 'cheat.overpoweredMaxed': 'Sobrepotenciado! Todas las estadisticas al maximo.', 'combat.waitForTurn': 'Espera tu turno!', 'combat.notYourTurn': 'No es tu turno!', 'combat.sync.chooseAction': 'Elegir accion sincronizada', 'combat.sync.noAllies': 'No hay aliados disponibles para sincronizar.', 'combat.sync.action.fuck': 'Seduccion grupal', 'combat.sync.action.flirt': 'Coqueteo grupal', 'combat.sync.action.fight': 'Ataque grupal', 'combat.sync.action.feed': 'Alimentacion grupal', 'combat.sync.selectParticipants': 'Seleccionar participantes para sincronizar', 'combat.sync.selectParticipantFor': 'Seleccionar {name} para sincronizar', 'combat.sync.confirmParticipants': 'Confirmar participantes', 'combat.sync.needParticipants': 'Necesitas al menos 2 participantes para una accion sincronizada.', 'combat.sync.selectTarget': 'Seleccionar objetivo sincronizado', 'combat.sync.selectTargetFor': 'Seleccionar {name} como objetivo sincronizado', 'combat.sync.failedNoQueue': 'Sincronizacion fallida! Los participantes ya no estan en la cola de turnos.', 'combat.sync.failedIncapacitated': 'Sincronizacion fallida! {names} no puede participar.', 'capacity.stomach': 'Estomago', 'capacity.womb': 'Vientre', 'capacity.balls': 'Bolas', 'capacity.owner.your': 'Tu', 'capacity.owner.named': 'De {name}', 'capacity.tooFull': '{owner} {container} esta demasiado lleno para {target}!', 'structure.noStructure': 'No hay una estructura para entrar aqui.', 'structure.entered': 'Entraste en {name}.', 'structure.exited': 'Saliste de {name}.', 'structure.movedInside': 'Movimiento dentro de {name} a {x}, {y}.', 'structure.fallbackName': 'la estructura', 'structure.wallBlocked': 'Una pared bloquea el camino.',
          'party.stats': 'Estadisticas', 'party.you': 'Tu', 'party.ally': 'Aliado', 'party.leader': 'Lider', 'party.levelSpecies': 'Nivel {level} {species}', 'party.punishment': 'Castigo', 'party.pleasure': 'Placer', 'party.hunger': 'Hambre', 'party.combat': 'Combate', 'party.attributes': 'Atributos', 'party.capacity': 'Capacidad', 'party.equipment': 'Equipo', 'party.perks': 'Mejoras', 'party.none': 'Ninguno', 'character.xp': 'XP: {xp}/{xpToNext}', 'character.combatStats': 'Estadisticas de combate', 'character.body': 'Cuerpo', 'character.size': 'Tamano', 'character.appetite': 'Apetito', 'character.parts': 'Partes', 'character.chest': 'Pecho', 'character.bodyParts': 'Cuerpo', 'character.perkTools': 'Herramientas de mejoras', 'character.perkToolsHelp': 'Controles de balance/debug.', 'party.makeLeader': 'Hacer lider', 'party.role': 'Rol', 'party.aiOrder': 'Orden IA', 'party.role.companion': 'Companero', 'party.role.scout': 'Explorador', 'party.role.guard': 'Guardia', 'party.role.support': 'Apoyo', 'party.role.gatherer': 'Recolector', 'party.roleDescription.companion': 'Sin rol especial de exploracion.', 'party.roleDescription.scout': 'Mejora la visibilidad nocturna y la lectura de rutas.', 'party.roleDescription.guard': 'Reduce la ventaja de emboscadas y ayuda a proteger el campamento.', 'party.roleDescription.support': 'Mejora la recuperacion al descansar en un lugar seguro.', 'party.roleDescription.gatherer': 'Mejora resultados de busqueda y recoleccion.', 'party.aiOrder.aggressive': 'Agresivo', 'party.aiOrder.defensive': 'Defensivo', 'party.aiOrder.healer': 'Sanador', 'party.aiOrder.scavenger': 'Carronero', 'party.aiOrder.passive': 'Pasivo', 'party.aiOrderDescription.aggressive': 'Prioriza atacar amenazas alcanzables.', 'party.aiOrderDescription.defensive': 'Prefiere posicionarse con cuidado y proteger aliados.', 'party.aiOrderDescription.healer': 'Alimenta primero al aliado mas herido.', 'party.aiOrderDescription.scavenger': 'Busca oportunidades con restos despues de la victoria.', 'party.aiOrderDescription.passive': 'Evita actuar salvo si esta herido o bajo presion.', 'party.dismiss': 'Despedir', 'party.statsFor': 'Mostrar estadisticas de {name}', 'party.makeLeaderFor': 'Hacer lider a {name}', 'party.dragToReorder': 'Arrastrar {name} para reordenar', 'party.moveUp': 'Mover {name} arriba', 'party.moveDown': 'Mover {name} abajo', 'party.dismissFor': 'Despedir a {name}', 'party.confirmDismiss': 'Despedir a {name} del grupo?', 'party.dismissed': '{name} deja el grupo.', 'party.dismissedNearby': '{name} deja el grupo y permanece cerca.', 'party.roleSet': '{name} queda asignado como {role}.', 'party.aiOrderSet': '{name} actuara en modo {order}.', 'party.leaderSet': '{name} ahora lidera el grupo.', 'party.positionChanged': '{name} cambia de posicion en el grupo.', 'party.roleFor': 'Rol de grupo para {name}', 'party.aiOrderFor': 'Orden IA para {name}',
          'save.title': 'Partidas', 'save.loadTitle': 'Cargar partida', 'save.saveTitle': 'Guardar partida', 'save.newTitle': 'Elegir slot de partida nueva', 'save.description': 'El autoguardado siempre esta activo. Los slots vacios empiezan una partida nueva; los ocupados pueden cargar, iniciar una nueva partida, guardar encima o borrar solo ese slot.', 'save.loadDescription': 'Elige una partida para cargar, inicia una nueva partida en un slot, o borra un solo slot.', 'save.saveDescription': 'Elige donde guardar la partida actual. Los slots ocupados avisan antes de sobrescribir.', 'save.newDescription': 'Elige un slot vacio para la nueva partida, o sobrescribe deliberadamente un slot ocupado.',
          'save.toolbarNew': 'Nueva partida', 'save.toolbarHint': 'Elige un slot despues; los slots ocupados avisan antes de sobrescribir.', 'save.slotLabel': 'Slot {number}', 'save.savedGame': 'Partida guardada', 'save.openSlot': 'Slot abierto', 'save.empty': 'Vacio', 'save.slotHint.emptyLoad': 'Slot vacio: inicia una partida nueva aqui.', 'save.slotHint.occupiedLoad': 'Slot guardado: carga, inicia una nueva partida o borra solo este slot.', 'save.slotHint.emptySave': 'Slot vacio: guarda la partida actual aqui.', 'save.slotHint.occupiedSave': 'Slot ocupado: guardar aqui puede requerir confirmacion para sobrescribir.', 'save.slotHint.emptyNew': 'Slot vacio: listo para una nueva partida.', 'save.slotHint.occupiedNew': 'Slot ocupado: sobrescribir requiere confirmacion.', 'save.slotActions.label': 'Acciones disponibles del slot', 'save.slotActions.emptyLoad': 'Acciones: Nueva partida', 'save.slotActions.occupiedLoad': 'Acciones: Cargar, Nueva partida, Borrar', 'save.slotActions.emptySave': 'Acciones: Guardar', 'save.slotActions.occupiedSave': 'Acciones: Guardar, Borrar', 'save.slotActions.emptyNew': 'Acciones: Usar slot vacio', 'save.slotActions.occupiedNew': 'Acciones: Sobrescribir, Borrar', 'save.useEmpty': 'Usar slot vacio', 'save.overwriteSlot': 'Sobrescribir slot',
          'save.newRun': 'Nueva partida', 'save.load': 'Cargar', 'save.save': 'Guardar', 'save.delete': 'Borrar', 'save.close': 'Cerrar', 'save.action.newGame': 'Elegir un slot para una partida nueva', 'save.action.useEmpty': 'Iniciar partida nueva en {slot}', 'save.action.overwrite': 'Sobrescribir {slot} con una partida nueva', 'save.action.newRun': 'Iniciar una nueva partida en {slot}', 'save.action.load': 'Cargar {slot}', 'save.action.save': 'Guardar partida actual en {slot}', 'save.action.delete': 'Borrar {slot}',
          'settings.confirmClearAllData': 'ADVERTENCIA: Esto borrara todas las partidas, modulos y datos del juego. Esta accion no se puede deshacer. Continuar?', 'settings.clearAllDataDone': 'Todos los datos fueron borrados. Actualiza la pagina para empezar de nuevo.',
          'save.confirm.newGameOverwrite': 'Iniciar partida nueva en {slot}? Esto sobrescribira ese slot. Esta accion no se puede deshacer.', 'save.confirm.manualOverwrite': 'Sobrescribir {slot} con la partida actual? Esta accion no se puede deshacer.', 'save.confirm.deleteSlot': 'Borrar el slot {slot}? Esto elimina permanentemente solo este slot y no se puede deshacer.', 'save.confirmDeleteAll': 'Borrar TODOS los datos de partidas? Esta accion no se puede deshacer!', 'save.error.noGame': 'No hay partida para guardar!', 'save.error.noSave': 'No hay partida en {slot}', 'save.success.saved': 'Partida guardada en {slot}!', 'save.success.deletedAll': 'Todas las partidas fueron borradas.', 'save.recoveredOnLoad': 'Te recuperaste al borde de la derrota. Bienvenido de vuelta, {name}.', 'save.error.saveFailed': 'Error al guardar: {message}', 'save.error.loadFailed': 'Error al cargar: {message}', 'save.error.deleteFailed': 'Error al borrar: {message}', 'save.error.deleteAllFailed': 'Error al borrar partidas: {message}', 'save.recovery.prompt': 'Los datos de la partida son incompatibles o estan corruptos. Opciones:\n\n1 = Borrar partida\n2 = Descargar respaldo (base64)\n3 = Cancelar\n\nIngresa 1, 2 o 3:', 'save.recovery.deleted': 'Partida borrada.', 'save.recovery.backupDownloaded': 'Respaldo descargado. La partida queda intacta.',
          'target.actors': 'Actores', 'target.targets': 'Objetivos', 'target.act': 'Actuar', 'target.mark': 'Objetivo', 'target.selectActorFor': 'Seleccionar {name} para actuar', 'target.markFor': 'Marcar {name} como objetivo', 'target.selectAs': 'Seleccionar {name} como objetivo de {action}', 'target.cannotSelectAs': 'No se puede seleccionar {name} como objetivo de {action}', 'target.selectedSummary': 'Objetivos de exploracion seleccionados', 'target.chooseOneActor': 'Elige un actor para acciones multiobjetivo de {action}, o un objetivo para acciones grupales de {action}. La seleccion actual tiene {actorCount} actores y {targetCount} objetivos.', 'target.cannotHandleMultiple': '{name} no puede manejar {count} objetivos con {action} todavia.', 'target.multiActionDone': '{name} termina una accion multiobjetivo de {action} sobre {targets}.', 'target.multiActionNone': '{name} no encuentra objetivos validos para multiobjetivo de {action}.', 'target.pairedActionDone': 'Acciones emparejadas de {action} resueltas: {pairs}.', 'target.skippedFullTargets': 'Objetivos llenos omitidos: {targets}.', 'target.clear': 'Limpiar', 'target.count': '{count} objetivo', 'target.count_plural': '{count} objetivos', 'target.clearSelected': 'Limpiar objetivos', 'explore.fight.hit': '{actor} golpea a {target} por {amount} de castigo.', 'explore.fight.subdued': '{target} queda sometido.', 'explore.fuck.success': '{actor} complace a {target}. Su placer sube a {current}/{max}.', 'explore.fuck.devoted': '{target} llega al climax y queda completamente entregado.', 'explore.fuck.recover': '{target} necesita un momento para recuperarse...', 'explore.fuck.resists': '{target} no esta de humor.', 'explore.feast.swallow': '{actor} traga a {target} entero. Queda en el estomago de {owner}.', 'explore.feast.tooStrong': '{target} es demasiado grande o fuerte para comer.', 'explore.flirt.success': '{actor} coquetea con {target}. Baja la guardia. El placer sube a {current}/{max}.', 'explore.flirt.charmed': '{target} queda totalmente encantado y se vuelve amistoso!', 'explore.flirt.rebuff': '{target} rechaza el coqueteo!', 'explore.feed.success': '{actor} alimenta a {target}, restaurando {amount} de castigo y saciando su hambre.', 'explore.recruit.possible': '{target} podria estar dispuesto a unirse al grupo.', 'group.feed.selfBlocked': '{name} no puede alimentarse a si mismo todavia.', 'group.feed.playerBlocked': '{name} no puede ser entregado como presa ahora.', 'group.feed.partyToConsumer': '{prey} es alimentado a {consumer} y queda en su estomago.', 'group.feed.helpers': '{helpers} ayudan a alimentar {prey} a {target}.', 'group.feed.tend': '{actors} atienden a {target}, restaurando {amount} de castigo.', 'group.feed.tendTogether': '{actors} atienden juntos a {target}, restaurando {amount} de castigo.', 'group.feed.creature': '{actors} alimentan a {target}, restaurando {amount} de castigo.', 'group.fight.roughCollapse': '{name} cae por el juego brusco.', 'group.fight.pinned': 'Quedan inmovilizados sin heridas serias.', 'group.fight.sparTogether': '{actors} practican combate juntos, cada uno recibe {amount} de castigo.', 'group.mutual.feed': '{actors} se atienden entre si, restaurando {amount} de castigo donde hace falta.', 'group.mutual.feastBlocked': '{actors} no pueden devorarse a si mismos como grupo mutuo. Elige un objetivo principal.', 'group.mutual.fight': '{actors} practican combate como grupo mutuo, cada uno recibe {amount} de castigo.', 'group.mutual.social': '{actors} comparten {action} como grupo mutuo. El placer sube para todos los involucrados.', 'group.fight.playFight': '{actors} juegan a pelear con {target} por {amount} de castigo.', 'group.fight.collapses': '{target} cae.', 'group.feast.noHelpers': '{target} no puede dividirse sin ayudantes.', 'group.feast.split': '{actors} dividen a {target} en porciones masticables.', 'group.feast.selfBlocked': '{target} no puede devorarse a si mismo. Selecciona otros miembros del grupo como actores para consumir este objetivo, o selecciona solo a {target} para devorar otro objetivo.', 'group.feast.tooStrong': '{target} es demasiado grande o fuerte para que {actors} lo consuman.', 'group.feast.swallow': '{helpers} ayudan a {primary} a tragar a {target}.', 'group.social.share': '{actors} comparten {action} con {target}. El placer se extiende por el grupo; {target} sube a {current}/{max}.', 'group.social.focus': '{actors} se enfocan en {target}. El placer sube a {current}/{max}.', 'group.social.resists': '{target} resiste la atencion del grupo.'
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
  const sceneEl = makeElement();
  sceneEl.textContent = 'The Wilderness';
  sceneEl.setAttribute('data-i18n', 'ui.scene.wildernessTitle');
  const titleEl = makeElement();
  titleEl.setAttribute('title', 'Start a new game');
  titleEl.setAttribute('data-i18n-title', 'ui.menu.newGameTitle');
  const actionTitleEl = makeElement();
  actionTitleEl.setAttribute('title', 'Search');
  actionTitleEl.setAttribute('data-i18n-title', 'action.search');
  const ariaEl = makeElement();
  ariaEl.setAttribute('aria-label', 'Interface language');
  ariaEl.setAttribute('data-i18n-aria-label', 'settings.interfaceLanguage');
  const placeholderEl = makeElement();
  placeholderEl.setAttribute('placeholder', 'Search log');
  placeholderEl.setAttribute('data-i18n-placeholder', 'ui.log.search');
  const localized = {
    '[data-i18n]': [textEl, sceneEl],
    '[data-i18n-title]': [titleEl, actionTitleEl],
    '[data-i18n-aria-label]': [ariaEl],
    '[data-i18n-placeholder]': [placeholderEl]
  };
  const { App } = loadAppForCombat(() => 0.5, {
    querySelectorAll: selector => localized[selector] || []
  });
  App.updateLanguage('es');
  assertEqual(textEl.textContent, 'Nueva partida', 'Static text should localize on language change');
  assertEqual(sceneEl.textContent, 'La Naturaleza', 'Static scene fallback should localize on language change');
  assertEqual(titleEl.getAttribute('title'), 'Iniciar una partida nueva', 'Static title should localize on language change');
  assertEqual(actionTitleEl.getAttribute('title'), 'Buscar', 'Static action title should localize on language change');
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
  App.updateLanguage('es');
  App.cheats.overpowered = false;
  App.showPlayerActions();
  assertNotContains(elements.get('scene-actions').innerHTML, 'Victoria instantanea');
  App.instantWin();
  assertContains(App.log[App.log.length - 1].text, 'No estas en combate! Victoria instantanea solo funciona durante combate.', 'Instant Win non-combat guard should localize');
  App.combatState.active = true;
  App.instantWin();
  assertEqual(enemy.CPun, 100, 'Instant Win should not affect enemies while gated');
  assertContains(App.log[App.log.length - 1].text, 'Victoria instantanea requiere modo Sobrepotenciado.', 'Instant Win overpowered guard should localize');
  App.cheats.overpowered = true;
  App.showPlayerActions();
  assertContains(elements.get('scene-actions').innerHTML, 'Victoria instantanea');
  assertContains(elements.get('scene-actions').innerHTML, 'aria-label="Derrotar al instante a todos los enemigos"', 'Instant Win button should expose localized accessible title');
  App.instantWin();
  assertContains(App.log.map(entry => entry.text).join('\n'), 'Victoria instantanea! Todos los enemigos fueron derrotados.', 'Instant Win success log should localize');
});

test('Cheat toggle feedback localizes', () => {
  const { App } = loadAppForCombat();
  const player = makeUnit('You');
  App.player = player;
  App.party = [player];
  App.updateLanguage('es');
  App.toggleCheat('overpowered');
  const logs = App.log.map(entry => entry.text).join('\n');
  assertContains(logs, 'Truco overpowered: ACTIVADO', 'Cheat toggle state should localize');
  assertContains(logs, 'Sobrepotenciado! Todas las estadisticas al maximo.', 'Overpowered max-stat feedback should localize');
});

test('Flee ends combat without granting victory XP', () => {
  const { App } = loadAppForCombat(() => 0);
  App.worldMeta = { seed: 'flee-success', generatorVersion: 2 };
  const player = makeUnit('You', { id: 'player-1', Flee: 50, xp: 0, xpToNext: 100 });
  const enemy = makeUnit('Enemy', { id: 'enemy-1', disposition: App.DISPOSITION.ENEMY, spd: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.location = { x: 0, y: 0 };
  App.dayCount = 0;
  App.timeHour = 0;
  App.combatState = { active: true, round: 1, currentTurn: 0, turnQueue: [], syncActions: [] };
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
  failed.App.worldMeta = { seed: 'flee-fail', generatorVersion: 2 };
  const player = makeUnit('You', { id: 'player-1', Flee: 1 });
  const enemy = makeUnit('Fast Enemy', { id: 'enemy-1', disposition: failed.App.DISPOSITION.ENEMY, spd: 50 });
  failed.App.player = player;
  failed.App.party = [player];
  failed.App.creatures = [enemy];
  failed.App.location = { x: 0, y: 0 };
  failed.App.dayCount = 0;
  failed.App.timeHour = 0;
  failed.App.combatState = { active: true, round: 1, currentTurn: 0, turnQueue: [], syncActions: [] };
  failed.App.nextTurn = function() { this._fleeFailedTurnEnded = true; };
  failed.App.updateLanguage('es');
  failed.App.attemptFlee();
  assertEqual(failed.App._fleeFailedTurnEnded, true, 'Failed flee should still advance the turn');
  assertContains(failed.App.log[failed.App.log.length - 1].text, 'Huida fallida! Fast Enemy te intercepta!', 'Failed flee log should localize');
});

test('Player flee result is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'player-flee', generatorVersion: 2 };
    const player = makeUnit('You', { id: 'player-1', Flee: 20, xp: 0, xpToNext: 100 });
    const enemy = makeUnit('Enemy', { id: 'enemy-1', disposition: App.DISPOSITION.ENEMY, spd: 20 });
    App.player = player;
    App.party = [player];
    App.creatures = [enemy];
    App.location = { x: 0, y: 0 };
    App.dayCount = 0;
    App.timeHour = 0;
    App.combatState = { active: true, round: 1, currentTurn: 0, turnQueue: [], syncActions: [] };
    App.nextTurn = function() { this._fleeAdvanced = true; };
    App.attemptFlee();
    return { active: App.combatState.active, enemies: App.creatures.length, advanced: !!App._fleeAdvanced, log: App.log[0]?.type || '' };
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Player flee result should not depend on ambient Math.random');
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
  assertContains(appContent, '_digestionContainerConfigs', '_digestionContainerConfigs missing');
  assertContains(appContent, '_processDigestionContainer', '_processDigestionContainer missing');
  assertContains(appContent, '_emptyStatDrain', '_emptyStatDrain missing');
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

test('Digestion container configs preserve per-container drain behavior', () => {
  const { App } = loadAppForCombat();
  const predator = makeUnit('Predator', {
    stomach: [makeUnit('Stomach Prey', { CPun: 100, MPun: 100, alive: true, inStomach: true, statDrain: null })],
    womb: [makeUnit('Womb Prey', { CPun: 100, MPun: 100, alive: true, inWomb: true, statDrain: null })],
    balls: [makeUnit('Balls Prey', { CPun: 100, MPun: 100, alive: true, inCock: true, statDrain: null })]
  });
  App.party = [predator];
  App.creatures = [];
  App.settings.statAbsorption = false;
  App.settings.slowDigestion = false;

  App._processDigestion();

  const stomachPrey = predator.stomach[0];
  const wombPrey = predator.womb[0];
  const ballsPrey = predator.balls[0];
  assertEqual(stomachPrey.digestionState, 'digesting', 'Stomach prey should advance from contained to digesting');
  assertEqual(stomachPrey.digestionProgress, 5, 'Stomach prey should use the preserved fast stomach rate');
  assertEqual(stomachPrey.statDrain.str, 1, 'Stomach drain should affect strength');
  assertEqual(stomachPrey.statDrain.con, 1, 'Stomach drain should affect constitution');
  assertEqual(stomachPrey.statDrain.Figh, 1, 'Stomach drain should affect fight');
  assertEqual(wombPrey.digestionProgress, 3, 'Womb prey should use the preserved fast womb rate');
  assertEqual(wombPrey.statDrain.cha, 1, 'Womb drain should track charisma without NaN');
  assertEqual(wombPrey.statDrain.Flir, 1, 'Womb drain should affect flirt');
  assertEqual(wombPrey.statDrain.Fuck, 1, 'Womb drain should affect fuck');
  assertEqual(Number.isNaN(wombPrey.statDrain.cha), false, 'Womb charisma drain should remain numeric');
  assertEqual(ballsPrey.digestionProgress, 3, 'Balls prey should use the preserved fast balls rate');
  assertEqual(ballsPrey.statDrain.Feas, 1, 'Balls drain should affect feast');
  assertEqual(ballsPrey.statDrain.Fuck, 1, 'Balls drain should affect fuck');
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
  const { App } = loadAppForCombat(() => 0.99);
  App.worldMeta = { seed: 'burn-spread-1', generatorVersion: 2 };
  App.location = { x: 0, y: 0 };
  App.combatState = { active: true, round: 1, currentTurn: 0 };
  const burned = makeUnit('Burned', {
    id: 'burned-unit',
    CPun: 30,
    combatRow: 'front',
    status: {
      bleed: { dmg: 2, turns: 1, stacks: 2 },
      burn: { dmg: 3, turns: 1 }
    }
  });
  const neighbor = makeUnit('Neighbor', { id: 'neighbor-unit', combatRow: 'front' });
  App.party = [burned, neighbor];
  App.creatures = [];
  App._processStatusEffects();
  assertEqual(burned.CPun, 23, 'Bleed stacks and burn should both damage');
  assertEqual(Boolean(burned.status.bleed), false, 'Bleed should expire');
  assertEqual(Boolean(burned.status.burn), false, 'Burn should expire');
  assert(neighbor.status.burn, 'Burn should spread to same-row combatant when roll succeeds');
});

test('Burn spread outcome is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'burn-spread-1', generatorVersion: 2 };
    App.location = { x: 0, y: 0 };
    App.combatState = { active: true, round: 1, currentTurn: 0 };
    const burned = makeUnit('Burned', {
      id: 'burned-unit',
      CPun: 30,
      combatRow: 'front',
      status: { burn: { dmg: 3, turns: 1 } }
    });
    const neighbor = makeUnit('Neighbor', { id: 'neighbor-unit', combatRow: 'front' });
    App.party = [burned, neighbor];
    App.creatures = [];
    App._processStatusEffects();
    return {
      burnedPun: burned.CPun,
      neighborBurned: Boolean(neighbor.status.burn),
      log: App.log.map(entry => entry.text)
    };
  };

  assertEqual(JSON.stringify(buildCase(() => 0)), JSON.stringify(buildCase(() => 0.99)), 'Burn spread should not depend on ambient Math.random');
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

test('Fear freeze skip is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'fear-freeze-0', generatorVersion: 2 };
    const scared = makeUnit('Scared', { id: 'scared-unit', CPun: 80, MPun: 100, status: { fear: { turns: 2, by: 'Enemy' } } });
    App.player = scared;
    App.party = [scared];
    App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
    App.location = { x: 0, y: 0 };
    App.dayCount = 0;
    App.timeHour = 0;
    App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: scared, initiative: 10 }], syncActions: [] };
    return App._skipTurnFromStatus(scared);
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(lowRandom, highRandom, 'Fear freeze skip should not depend on ambient Math.random');
  assertContains(lowRandom, 'freezes in fear', 'Seed should exercise the fear freeze branch');
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
  App.updateLanguage('es');
  const predator = makeUnit('Predator', {
    size: 4,
    appetite: 1,
    Feas: 50,
    stomach: [makeUnit('Stored', { size: 4, alive: true, inStomach: true })]
  });
  const prey = makeUnit('Prey', { size: 2, CPun: 1, MPun: 100, Flee: 1 });
  const result = App._doSubAction('feast', 'swallow', predator, prey, 'Predator', 's');
  assertContains(result, 'De Predator Estomago esta demasiado lleno para Prey!', 'Over-capacity swallow should localize full stomach feedback');
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
  App.updateLanguage('es');
  const actor = makeUnit('Actor', { size: 4, appetite: 2, Feas: 50, parts: 'cock', balls: [] });
  const tooLarge = makeUnit('Large Prey', { size: 4, CPun: 1, MPun: 100, Flee: 1 });
  const small = makeUnit('Small Prey', { size: 3, CPun: 1, MPun: 100, Flee: 1 });
  const blocked = App._doSubAction('feast', 'cockVore', actor, tooLarge, 'Actor', 's');
  assertContains(blocked, 'De Actor Bolas esta demasiado lleno para Large Prey!', 'Balls capacity feedback should localize');
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

test('Core gameplay loop can move fight loot save and reload state', () => {
  const Binary = loadBinaryForTest();
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-e2e', Figh: 80, spd: 100, xp: 0, xpToNext: 1000, gold: 0 });
  const enemy = makeUnit('Hostile Guide', {
    id: 'hostile-guide-e2e',
    disposition: App.DISPOSITION.ENEMY,
    CPun: 1,
    MPun: 20,
    con: 1,
    spd: 1,
    goldLoot: 3
  });
  App.worldMeta = { worldId: 'e2e-world', seed: 'e2e-seed', generatorVersion: 2, mapModsHash: 'core' };
  App.player = player;
  App.party = [player];
  App.creatures = [];
  App.inventory = [];
  App.log = [];
  App.location = { x: 0, y: 0 };
  App.currentBiome = 'grove';
  App.timeHour = 8;
  App.dayCount = 0;
  App.quests = [];
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set(['0,0', '1,0']);
  App.worldMap.set('0,0', { ...App.getBaseTile(0, 0), explored: true, biome: 'grove', description: 'Origin', creatures: [], items: [] });
  App.worldMap.set('1,0', { ...App.getBaseTile(1, 0), explored: true, biome: 'grove', description: 'Encounter tile', creatures: [enemy], items: [] });

  App.move(1, 0);
  assertEqual(App.combatState.active, true, 'Moving into an explored hostile tile should start combat');
  assertEqual(App.location.x, 1, 'Movement should update x coordinate');
  assertEqual(App.location.y, 0, 'Movement should update y coordinate');
  assertEqual(App.creatures[0].id, 'hostile-guide-e2e', 'Encounter creature should be restored from the destination tile');

  App.executeAction('fight', 0);
  assertEqual(App.combatState.active, false, 'One-hit victory should end combat');
  assertEqual(App.creatures[0].disposition, App.DISPOSITION.CORPSE, 'Defeated creature should become a corpse');
  assertEqual(App.lootCorpse('hostile-guide-e2e'), true, 'Corpse should be lootable after combat');
  assertEqual(App.player.gold, 3, 'Authored corpse gold should be awarded during loot');

  const saved = Binary.saveGame(App);
  const loaded = Binary.loadGame(saved);
  assertEqual(loaded.locationX, 1, 'Saved state should preserve current x coordinate');
  assertEqual(loaded.locationY, 0, 'Saved state should preserve current y coordinate');
  assertEqual(loaded.questState.playerGold, 3, 'Saved state should preserve looted gold');
  assertEqual(loaded.worldMap['1,0'].creatures[0].disposition, App.DISPOSITION.CORPSE, 'Saved world tile should preserve corpse disposition');
  assertEqual(loaded.worldMap['1,0'].creatures[0].looted, true, 'Saved world tile should preserve corpse loot state');
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
  assertContains(html, "showIntentMenu('creature','fallen-1','desktop')", 'Corpse card should expose contextual action menu');
  assertContains(html, "showRadialIntentMenu('creature','fallen-1','secondary-click')", 'Corpse card should support secondary-click contextual menu');
  assertNotContains(html, 'outsideActionForCreature', 'Corpse card should not expose living interaction actions');
  assertNotContains(html, 'executeActionOnTarget', 'Corpse card should not expose target selection actions');
});

test('Mobile creature strip keeps corpse interactions reachable', () => {
  const { App, elements, body } = loadAppForCombat();
  const corpse = makeUnit('Fallen', { id: 'fallen-mobile', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [corpse];
  App.renderMobileCreatureStrip();
  const card = elements.get('mobile-creature-card');
  const html = elements.get('mobile-creature-strip').innerHTML;
  assertEqual(card.style.display, 'block', 'Corpse-only mobile creature panel should remain visible');
  assertContains(html, "lootCorpse('fallen-mobile')", 'Mobile corpse chip should expose loot');
  assertContains(html, "scavengeCorpse('fallen-mobile')", 'Mobile corpse chip should expose scavenge');
  assertContains(html, "showIntentMenu('creature','fallen-mobile')", 'Mobile corpse chip should expose shared intent menu');
  assertContains(html, "showRadialIntentMenu('creature','fallen-mobile','secondary-click')", 'Mobile corpse chip should expose secondary-click radial menu');
  App.showMobileCreatureContext('fallen-mobile');
  assertContains(body.innerHTML, 'intent-menu-radial', 'Mobile corpse long-press should open the radial intent presentation');
  assertContains(body.innerHTML, "App.selectIntent('creature','fallen-mobile','loot','longpress')", 'Mobile corpse long-press should dispatch loot through shared intent selection');
  assertContains(body.innerHTML, "App.selectIntent('creature','fallen-mobile','scavenge','longpress')", 'Mobile corpse long-press should dispatch scavenge through shared intent selection');
  assertNotContains(body.innerHTML, "openIntentSubActionSheet('creature','fallen-mobile','fight'", 'Mobile corpse long-press should not expose living primary action spam');
  App.closeMobileContextMenu();
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
  const looted = App.lootCorpse('loot-corpse');
  assertEqual(looted, true, 'Loot corpse should report successful action');
  assertEqual(corpse.looted, true, 'Looted corpse should be marked');
  assertEqual(App.inventory.length, 1, 'Successful corpse loot should add one item');
  assertEqual(App.player.gold, 2, 'Corpse loot should grant generated gold');
  assertEqual(App.combatState.active, false, 'Corpse loot should not start combat');
  assertContains(App.log[App.log.length - 1].text, App.inventory[0].name, 'Loot log should mention found item');
  assertContains(App.log[App.log.length - 1].text, '2 gold', 'Loot log should mention found gold');
  const relooted = App.lootCorpse('loot-corpse');
  assertEqual(relooted, true, 'Already-looted corpse should still report handled action');
  assertEqual(App.player.gold, 2, 'Already-looted corpse should not grant gold twice');
  assertEqual(App.lootCorpse('missing-corpse'), false, 'Missing corpse loot should report failure');
});

test('Authored corpse loot can grant explicit gold without an item', () => {
  const { App } = loadAppForCombat(() => 0.9);
  const player = makeUnit('You', { gold: 1 });
  const corpse = makeUnit('Rich Corpse', { id: 'rich-corpse', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100, goldLoot: 12 });
  App.player = player;
  App.party = [player];
  App.creatures = [corpse];
  App.inventory = Array.from({ length: App.MAX_INVENTORY }, (_, index) => ({ id: `full-${index}`, name: 'Old Coin' }));
  App.combatState.active = false;
  App.lootCorpse('rich-corpse');
  assertEqual(App.inventory.length, App.MAX_INVENTORY, 'Full inventory should prevent item loot while still allowing gold');
  assertEqual(App.player.gold, 13, 'Authored corpse gold should be granted');
  assertContains(App.log[App.log.length - 1].text, '12 gold', 'Loot log should mention authored gold');
});

test('Corpse loot rewards are deterministic by world seed and corpse identity', () => {
  const lowRandom = loadAppForCombat(() => 0);
  const highRandom = loadAppForCombat(() => 0.99);
  lowRandom.App.worldMeta = { seed: 'corpse-loot-seed', generatorVersion: 2 };
  highRandom.App.worldMeta = { seed: 'corpse-loot-seed', generatorVersion: 2 };
  for (const ctx of [lowRandom, highRandom]) {
    ctx.App.player = makeUnit('You', { gold: 0 });
    ctx.App.party = [ctx.App.player];
    ctx.App.inventory = [];
    ctx.App.creatures = [makeUnit('Fallen', { id: 'shared-corpse', disposition: ctx.App.DISPOSITION.CORPSE, CPun: 0, MPun: 100, level: 3 })];
    ctx.App.lootCorpse('shared-corpse');
  }
  assertEqual(lowRandom.App.player.gold, highRandom.App.player.gold, 'Corpse gold should not depend on ambient Math.random');
  assertEqual(lowRandom.App.inventory[0]?.name || '', highRandom.App.inventory[0]?.name || '', 'Corpse item should not depend on ambient Math.random');
  assertNotContains(lowRandom.App.lootCorpse.toString(), 'Math.random', 'Corpse loot should not use raw Math.random');
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
  const scavenged = App.scavengeCorpse('scavenge-corpse');
  assertEqual(scavenged, true, 'Scavenge corpse should report successful action');
  assertEqual(corpse.scavenged, true, 'Scavenged corpse should be marked');
  assert(App.creatures.includes(corpse), 'Scavenging should keep corpse on tile');
  assertEqual(player.hunger, 30, 'Scavenging should reduce hunger');
  assertEqual(player.CPun, 85, 'Scavenging should restore a small amount of punishment');
  assertContains(App.log[App.log.length - 1].text, 'Fallen', 'Scavenge log should use corpse content');
  assertEqual(App.scavengeCorpse('missing-corpse'), false, 'Missing corpse scavenge should report failure');
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

test('Non-hostile threat reactions are deterministic by world seed and tile state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'reaction-seed', generatorVersion: 2 };
    App.player = makeUnit('You', { id: 'player-1', xp: 0, xpToNext: 1000 });
    const timid = makeUnit('Startled Mouse', { id: 'startled-mouse', species: 'bunny', disposition: App.DISPOSITION.NEUTRAL, Flee: 8 });
    App.party = [App.player];
    App.creatures = [timid];
    App.location = { x: 2, y: -1 };
    App.dayCount = 1;
    App.timeHour = 9;
    App.worldMap = new Map([['2,-1', { x: 2, y: -1, biome: 'forest', explored: true, creatures: [timid] }]]);
    App.outsideActionOnTarget('fight', timid);
    return {
      active: App.combatState.active,
      disposition: timid.disposition,
      present: App.creatures.includes(timid)
    };
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Threat reaction outcome should not depend on ambient Math.random');
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
  const ally = makeUnit('Timid Ally', { id: 'timid-ally', species: 'bunny', Flee: 20 });
  const enemies = [
    makeUnit('Enemy 1', { disposition: App.DISPOSITION.ENEMY }),
    makeUnit('Enemy 2', { disposition: App.DISPOSITION.ENEMY }),
    makeUnit('Enemy 3', { disposition: App.DISPOSITION.ENEMY })
  ];
  App.player = player;
  App.party = [player, ally];
  App.creatures = enemies;
  App.worldMeta = { seed: 'timid-ally', generatorVersion: 2 };
  App.location = { x: 0, y: 0 };
  App.dayCount = 0;
  App.timeHour = 0;
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

test('Timid ally combat flee is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    const player = makeUnit('You');
    const ally = makeUnit('Timid Ally', { id: 'timid-ally', species: 'bunny', Flee: 5 });
    const enemies = [
      makeUnit('Enemy 1', { disposition: App.DISPOSITION.ENEMY }),
      makeUnit('Enemy 2', { disposition: App.DISPOSITION.ENEMY }),
      makeUnit('Enemy 3', { disposition: App.DISPOSITION.ENEMY })
    ];
    App.player = player;
    App.party = [player, ally];
    App.creatures = enemies;
    App.worldMeta = { seed: 'timid-ally', generatorVersion: 2 };
    App.location = { x: 0, y: 0 };
    App.dayCount = 0;
    App.timeHour = 0;
    App.combatState = {
      active: true,
      round: 1,
      currentTurn: 0,
      processing: false,
      xpEarned: 0,
      turnQueue: [{ unit: ally, initiative: 20 }, ...enemies.map(unit => ({ unit, initiative: 10 }))],
      syncActions: []
    };
    App.nextTurn = function() { this._allyFleeAdvanced = true; };
    const handled = App._attemptTimidAllyFlee(ally);
    return {
      handled,
      fled: !!ally.fledCombat,
      queueHasAlly: App.combatState.turnQueue.some(entry => entry.unit === ally),
      advanced: !!App._allyFleeAdvanced
    };
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Timid ally flee outcome should not depend on ambient Math.random');
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
  const { App, elements, body } = loadAppForCombat();
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
  assertContains(elements.get('enemies-content').innerHTML, "showIntentMenu('creature','friendly-1','desktop')", 'Friendly card should expose creature action menu');
  assertNotContains(elements.get('enemies-content').innerHTML, "outsideActionForCreature('fight','friendly-1')", 'Friendly card should not spam primary actions by default');
  App.showIntentMenu('creature', 'friendly-1');
  assertContains(body.innerHTML, 'aria-label="Fight Friendly"', 'Creature action menu should expose fight');
  assertContains(body.innerHTML, 'aria-label="Flirt Friendly"', 'Creature action menu should expose baseline interaction');
  assertContains(body.innerHTML, "App.openIntentSubActionSheet('creature','friendly-1','fight','sheet')", 'Creature action menu should open sub-action sheet for registered primary actions');
  App.closeMobileContextMenu();
  assertContains(elements.get('enemies-content').innerHTML, "recruitCreatureById('friendly-1')", 'Friendly card should offer recruitment');
});

test('Species canon gates baseline social and recruit eligibility', () => {
  const { App, body } = loadAppForCombat();
  const player = makeUnit('You');
  const folk = App._normalizeUnit(makeUnit('Wolfkin', { id: 'folk-1', species: 'wolf', disposition: App.DISPOSITION.FRIENDLY, CPle: 95, willing: true }));
  const animal = App._normalizeUnit(makeUnit('Wolf', {
    id: 'animal-1',
    species: 'wolf',
    disposition: App.DISPOSITION.FRIENDLY,
    CPle: 95,
    willing: true,
    sapience: 'animal',
    bodyPlan: 'animal',
    baselineInteraction: 'animal',
    interactionEligibility: { sensitiveSocial: false, recruit: false }
  }));
  App.player = player;
  App.party = [player];
  App.creatures = [folk, animal];
  assertEqual(App._hasBaselineInteractionEligibility(folk, 'sensitiveSocial'), true, 'Default species canon should preserve sapient social eligibility');
  assertEqual(App._hasBaselineInteractionEligibility(animal, 'sensitiveSocial'), false, 'Animal metadata should block baseline social eligibility');
  assertEqual(App._canRecruit(player, folk), true, 'Sapient folk canon should allow high-score recruitment');
  assertEqual(App._canRecruit(player, animal), false, 'Animal metadata should block recruitment even with high score');
  App.showIntentMenu('creature', 'animal-1');
  assertContains(body.innerHTML, 'aria-label="Fight Wolf"', 'Animal metadata should not block general creature actions');
  assertNotContains(body.innerHTML, 'aria-label="Flirt Wolf"', 'Animal metadata should hide baseline social actions');
  assertNotContains(body.innerHTML, 'aria-label="Recruit Wolf"', 'Animal metadata should hide recruitment');
});

test('Desktop action bars do not duplicate large buttons with tiny legends', () => {
  const { App, elements } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'grove', explored: true, structure: 'camp', creatures: [] }]]);
  App.combatState.active = false;
  App.renderExplorationActions();
  const exploreHtml = elements.get('scene-actions').innerHTML;
  assertContains(exploreHtml, 'aria-label="Rest"', 'Desktop exploration should keep real Rest button');
  assertContains(exploreHtml, 'aria-label="Enter"', 'Desktop exploration should keep real Enter button');
  assertContains(exploreHtml, 'aria-label="Items"', 'Desktop exploration should keep real Items button');
  assertNotContains(exploreHtml, 'action-legend', 'Desktop exploration should not render a duplicate tiny icon legend beside real buttons');

  App.updateScene('Combat', 'Choose an action.', true);
  const combatHtml = elements.get('scene-actions').innerHTML;
  assertContains(combatHtml, 'aria-label="Fight"', 'Desktop combat should keep real Fight button');
  assertContains(combatHtml, 'aria-label="Flee"', 'Desktop combat should keep real Flee button');
  assertNotContains(combatHtml, 'action-legend', 'Desktop combat should not render a duplicate tiny icon legend beside real buttons');
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
  assertContains(elements.get('enemies-content').innerHTML, "showIntentMenu('creature','neutral-1','desktop')", 'Neutral creature card should keep baseline interaction actions in an action menu');
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

test('Intent menu dispatch keeps existing outside-combat action flow', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', Figh: 1 });
  const ally = makeUnit('Ally', { id: 'ally-1', Figh: 40 });
  const enemy = makeUnit('Enemy', { id: 'enemy-intent', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.selectExplorationActor(1);
  const resolved = App.selectIntent('creature', 'enemy-intent', 'fight');
  assertEqual(resolved, true, 'Intent dispatch should report successful primary action resolution');
  assertEqual(App.lastIntentCommand.action, 'fight', 'Intent command should record selected action');
  assertEqual(App.lastIntentCommand.targetId, 'enemy-intent', 'Intent command should record selected target');
  assertEqual(App.lastIntentCommand.targetType, 'creature', 'Intent command should record target type');
  assertEqual(App.lastIntentCommand.source, 'sheet', 'Intent command should record action sheet source by default');
  assertEqual(App.lastIntentCommand.actorIds.join(','), 'ally-1', 'Intent command should preserve selected actor ids');
  assert(enemy.CPun < 70, 'Intent dispatch should reuse existing outside-combat creature action flow');
  assertContains(App.log[App.log.length - 1].text, 'Ally hit', 'Intent dispatch should preserve existing action log semantics');
});

test('Intent dispatch reports canceled and missing-target outcomes', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 30, cha: 20 });
  const ally = makeUnit('Ally', { id: 'ally-1', CPle: 0, MPle: 100, wis: 1 });
  App.player = actor;
  App.party = [actor, ally];
  assertEqual(App.selectIntent('party', 1, 'flirt'), true, 'Party intent should report successful resolution');
  assert(ally.CPle > 0, 'Successful party intent should affect target');
  assertEqual(App.selectIntent('party', 99, 'flirt'), false, 'Party intent should report missing target failure');
  assertEqual(App.selectIntent('creature', 'missing-creature', 'flirt'), false, 'Creature intent should report missing target failure');
  assertEqual(App.selectIntent('party', 1, 'close'), false, 'Close intent should report canceled resolution');
  assertEqual(App.selectIntent('creature', 'missing-creature', 'close'), false, 'Creature close intent should report canceled resolution');
});

test('Contextual intent dispatch reports recruit quest and trade outcomes', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', cha: 20, Flir: 30, Fuck: 30 });
  const recruit = makeUnit('Recruit', { id: 'recruit-1', disposition: App.DISPOSITION.FRIENDLY, CPle: 95, MPle: 100, willing: true });
  const questGiver = makeUnit('Guide', {
    id: 'guide-1',
    disposition: App.DISPOSITION.FRIENDLY,
    quest: { id: 'guide_task', title: 'Guide Task', objectives: [{ type: 'travel', location: { x: 1, y: 0 }, required: 1 }] }
  });
  const merchant = makeUnit('Trader', { id: 'trader-1', disposition: App.DISPOSITION.MERCHANT, stock: [] });
  App.player = actor;
  App.party = [actor];
  App.creatures = [recruit, questGiver, merchant];
  assertEqual(App.selectIntent('creature', 'recruit-1', 'recruit'), true, 'Recruit intent should report successful recruitment');
  assert(App.party.includes(recruit), 'Recruit intent should add the creature to party');
  assertEqual(App.selectIntent('creature', 'recruit-1', 'recruit'), false, 'Recruit intent should report missing/non-recruitable target after recruitment');
  assertEqual(App.selectIntent('creature', 'guide-1', 'quest'), true, 'Quest intent should report successful quest preview');
  assertEqual(App.quests.length, 0, 'Quest intent should preview before accepting');
  assertContains(elements.get('scene-description').innerHTML, 'Quest Preview: Guide Task', 'Quest intent should render a quest preview');
  assertContains(elements.get('scene-description').innerHTML, "acceptQuestFromUnit('guide-1')", 'Quest preview should expose an explicit accept action');
  App.acceptQuestFromUnit('guide-1');
  assertEqual(App.quests.length, 1, 'Explicit preview accept should add the quest to the log');
  assertEqual(App.selectIntent('creature', 'missing-guide', 'quest'), false, 'Quest intent should report missing giver failure');
  assertEqual(App.selectIntent('creature', 'trader-1', 'trade'), true, 'Trade intent should report successful trade screen rendering');
  assertContains(elements.get('scene-description').innerHTML, 'Trader Trade', 'Trade intent should render the trade screen');
  assertEqual(App.selectIntent('creature', 'missing-trader', 'trade'), false, 'Trade intent should report missing merchant failure');
});

test('Contextual intent dispatch reports corpse loot and scavenge outcomes', () => {
  const { App, body } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', hunger: 50, CPun: 80, MPun: 100, gold: 0 });
  const lootCorpse = makeUnit('Looted Remains', { id: 'corpse-loot-intent', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  const scavengeCorpse = makeUnit('Scavenge Remains', { id: 'corpse-scavenge-intent', disposition: App.DISPOSITION.CORPSE, CPun: 0, MPun: 100 });
  App.player = player;
  App.party = [player];
  App.creatures = [lootCorpse, scavengeCorpse];
  App.inventory = [];
  App.showIntentMenu('creature', 'corpse-loot-intent');
  assertContains(body.innerHTML, "App.selectIntent('creature','corpse-loot-intent','loot','sheet')", 'Corpse intent menu should dispatch loot through shared intent selection');
  assertContains(body.innerHTML, "App.selectIntent('creature','corpse-loot-intent','scavenge','sheet')", 'Corpse intent menu should dispatch scavenge through shared intent selection');
  assertNotContains(body.innerHTML, "openIntentSubActionSheet('creature','corpse-loot-intent','fight'", 'Corpse intent menu should not expose living primary action spam');
  App.closeMobileContextMenu();
  assertEqual(App.selectIntent('creature', 'corpse-loot-intent', 'loot', 'sheet'), true, 'Loot intent should report handled corpse action');
  assertEqual(App.lastIntentCommand.action, 'loot', 'Loot intent should record selected contextual action');
  assertEqual(App.lastIntentCommand.targetId, 'corpse-loot-intent', 'Loot intent should record corpse target id');
  assertEqual(lootCorpse.looted, true, 'Loot intent should mark corpse as looted');
  assertEqual(App.selectIntent('creature', 'corpse-scavenge-intent', 'scavenge', 'sheet'), true, 'Scavenge intent should report handled corpse action');
  assertEqual(App.lastIntentCommand.action, 'scavenge', 'Scavenge intent should record selected contextual action');
  assertEqual(scavengeCorpse.scavenged, true, 'Scavenge intent should mark corpse as scavenged');
  assertEqual(App.selectIntent('creature', 'missing-corpse-intent', 'loot', 'sheet'), false, 'Missing corpse loot intent should report failure');
  assertEqual(App.selectIntent('creature', 'missing-corpse-intent', 'scavenge', 'sheet'), false, 'Missing corpse scavenge intent should report failure');
});

test('Intent sub-action sheet records selected sub-action while preserving dispatch', () => {
  const { App, body } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', Flir: 30, cha: 20 });
  const friendly = makeUnit('Friendly', { id: 'friendly-sub', disposition: App.DISPOSITION.FRIENDLY, CPle: 0, MPle: 100, wis: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [friendly];
  App.openIntentSubActionSheet('creature', 'friendly-sub', 'flirt', 'sheet');
  assertContains(body.innerHTML, "App.selectIntent('creature','friendly-sub','flirt','sheet','tease')", 'Sub-action sheet should expose the default sub-action dispatch');
  assertContains(body.innerHTML, "App.selectIntent('creature','friendly-sub','flirt','sheet','dance')", 'Sub-action sheet should expose alternate registered sub-actions');
  App.selectIntent('creature', 'friendly-sub', 'flirt', 'sheet', 'dance');
  assertEqual(App.lastIntentCommand.subAction, 'dance', 'Selected sub-action should be recorded on the normalized intent command');
  assertEqual(App.defaultSubActions.flirt, 'dance', 'Selected sub-action should become the new default for that primary action');
  assert(friendly.CPle > 0, 'Sub-action selection should preserve existing outside-combat action execution');
});

test('Intent feast sub-action affects outside-combat resolution and cleanup', () => {
  const { App } = loadAppForCombat(() => 0);
  const predator = makeUnit('Predator', { id: 'predator-1', Feas: 80, Flee: 40, size: 8, appetite: 8 });
  const prey = makeUnit('Prey', { id: 'prey-sub', disposition: App.DISPOSITION.FRIENDLY, CPun: 10, MPun: 100, Flee: 1, size: 2 });
  App.player = predator;
  App.party = [predator];
  App.creatures = [prey];
  App.settings.chewing = true;
  App.selectIntent('creature', 'prey-sub', 'feast', 'sheet', 'chew');
  assertEqual(App.lastIntentCommand.subAction, 'chew', 'Feast intent should record selected feast sub-action');
  assertEqual(App.defaultSubActions.feast, 'chew', 'Selected feast sub-action should become default');
  assertEqual(prey.alive, false, 'Selected chew sub-action should use the sub-action engine');
  assertEqual(App.creatures.includes(prey), false, 'Consumed area creature should be removed after outside-combat sub-action resolution');
  assertContains(App.log[App.log.length - 1].text, 'chewing', 'Sub-action result should be logged');
});

test('Intent forceFeed sub-action resolves through outside-combat sub-action engine', () => {
  const { App, body } = loadAppForCombat(() => 0);
  const predator = makeUnit('Predator', { id: 'predator-1', size: 8, appetite: 8, Feed: 30 });
  const holder = makeUnit('Holder', { id: 'holder-1', size: 4, Feed: 10 });
  const prey = makeUnit('Prey', { id: 'prey-force', disposition: App.DISPOSITION.ENEMY, CPun: 100, MPun: 100, size: 2 });
  App.player = predator;
  App.party = [predator, holder];
  App.creatures = [prey];
  App.settings.forcedFeeding = true;
  App.openIntentSubActionSheet('creature', 'prey-force', 'feed', 'sheet');
  assertContains(body.innerHTML, "App.selectIntent('creature','prey-force','feed','sheet','forceFeed')", 'Feed sheet should expose forceFeed when a holder is available');
  App.selectIntent('creature', 'prey-force', 'feed', 'sheet', 'forceFeed');
  assertEqual(App.lastIntentCommand.subAction, 'forceFeed', 'Selected forceFeed sub-action should be recorded');
  assertEqual(predator.stomach.length, 1, 'Selected forceFeed should use the sub-action engine instead of default healing');
  assertEqual(predator.stomach[0].name, 'Prey', 'Predator should receive the target from forceFeed');
  assertEqual(App.creatures.includes(prey), false, 'Resolved forceFeed should remove the area target');
  assertEqual(prey.forcedFed, true, 'Resolved forceFeed should mark the original target state');
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

test('Single actor feast rejects direct self-targeting', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Target', { id: 'target-1', size: 6, appetite: 6, Feas: 50, Flee: 1 });
  App.player = player;
  App.party = [player, target];
  App.explorationActorIds = ['target-1'];
  App.outsideActionForParty('feast', 1);
  assertEqual(App.party.includes(target), true, 'Direct self-feast should leave the actor in party');
  assertEqual(target.stomach.length, 0, 'Direct self-feast should not place actor into their own stomach');
  assertContains(App.log[App.log.length - 1].text, 'cannot feast on themself', 'Direct self-feast should explain the rule');
});

test('Multi-target feast skips the actor self-target but resolves valid prey', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', size: 8, appetite: 8, Feas: 50 });
  const prey = makeUnit('Prey', { id: 'prey-1', disposition: App.DISPOSITION.FRIENDLY, size: 2, Flee: 1 });
  App.player = actor;
  App.party = [actor];
  App.creatures = [prey];
  App.toggleExplorationTarget('party', 'actor-1');
  App.toggleExplorationTarget('creature', 'prey-1');
  App.resolveExplorationTargetAction('feast');
  assertEqual(App.party.includes(actor), true, 'Self-target skipped during multi-target feast should leave actor in party');
  assertEqual(actor.stomach.length, 1, 'Valid prey should still be consumed during mixed multi-target feast');
  assertEqual(actor.stomach[0].name, 'Prey', 'Multi-target feast should consume the valid non-self target');
  assertEqual(App.creatures.includes(prey), false, 'Consumed area prey should leave active creatures');
  assertContains(App.log[App.log.length - 1].text, 'Prey', 'Multi-target feast summary should name only the valid affected target');
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

test('Group feed respects explicit heal sub-action instead of consuming selected party members', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const consumer = makeUnit('Consumer', { id: 'consumer-1', CPun: 40, MPun: 100, size: 6, appetite: 6 });
  const helper = makeUnit('Helper', { id: 'helper-1', Feed: 20 });
  const prey = makeUnit('Prey', { id: 'prey-1', size: 2, Feed: 20 });
  App.player = player;
  App.party = [player, consumer, helper, prey];
  App.explorationActorIds = ['helper-1', 'prey-1'];
  App.outsideActionForParty('feed', 1, null, { subAction: 'heal' });
  assertEqual(consumer.CPun, 100, 'Explicit heal should restore the party target with combined group Feed');
  assertEqual(consumer.stomach.length, 0, 'Explicit heal should not route selected party members into the target stomach');
  assertEqual(App.party.includes(prey), true, 'Explicit heal should keep selected party members in the active party');
  assertContains(App.log[App.log.length - 1].text, 'restoring 80 punishment', 'Explicit heal should log tending instead of containment');
});

test('Group feed forceFeed chooses eligible predator when helper is selected first', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const holder = makeUnit('Holder', { id: 'holder-1', size: 1, appetite: 1, Feed: 10 });
  const predator = makeUnit('Predator', { id: 'predator-1', size: 8, appetite: 8, Feed: 30 });
  const prey = makeUnit('Prey', { id: 'prey-force-group', disposition: App.DISPOSITION.ENEMY, CPun: 100, MPun: 100, size: 4 });
  App.player = player;
  App.party = [player, holder, predator];
  App.creatures = [prey];
  App.settings.forcedFeeding = true;
  App.explorationActorIds = ['holder-1', 'predator-1'];
  App.outsideActionForCreature('feed', 'prey-force-group', { subAction: 'forceFeed' });
  assertEqual(holder.stomach.length, 0, 'Too-small first selected helper should not become forceFeed predator');
  assertEqual(predator.stomach.length, 1, 'Eligible selected predator should receive the forced-fed target');
  assertEqual(predator.stomach[0].name, 'Prey', 'Eligible selected predator should contain the target');
  assertEqual(App.creatures.includes(prey), false, 'Resolved group forceFeed should remove the area target');
  assertEqual(prey.forcedFed, true, 'Resolved group forceFeed should mark original target state');
});

test('Single feast removes consumed area creature from active tile', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', size: 6, appetite: 6, Feas: 40 });
  const prey = makeUnit('Prey', { id: 'prey-1', disposition: App.DISPOSITION.FRIENDLY, size: 2, Flee: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [prey];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [prey] }]]);
  App.toggleExplorationTarget('creature', 'prey-1');
  App.outsideActionForCreature('feast', 'prey-1');
  assertEqual(player.stomach.length, 1, 'Single feast should place area creature in actor stomach');
  assertEqual(App.creatures.includes(prey), false, 'Consumed area creature should leave active creatures');
  assertEqual(App.worldMap.get('0,0').creatures.includes(prey), false, 'Consumed area creature should leave persisted tile creatures');
  assertEqual(App.explorationTargetIds.includes('creature:prey-1'), false, 'Consumed area creature should clear selected target state');
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

test('Group feast respects explicit swallow sub-action when chewing is enabled', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const helper = makeUnit('Helper', { id: 'helper-1', size: 1, appetite: 0, Feas: 50 });
  const primary = makeUnit('Primary', { id: 'primary-1', size: 6, appetite: 6, Feas: 30 });
  const prey = makeUnit('Prey', { id: 'prey-1', size: 4, Flee: 1 });
  App.player = player;
  App.party = [player, helper, primary, prey];
  App.settings.chewing = true;
  App.selectExplorationActor(1);
  App.selectExplorationActor(2);
  App.outsideActionForParty('feast', 3, null, { subAction: 'swallow' });
  assertEqual(primary.stomach.length, 1, 'Explicit swallow should choose a primary consumer instead of splitting portions');
  assertEqual(helper.stomach.length, 0, 'Explicit swallow should keep helper out of stomach portion handling');
  assertEqual(App.party.includes(prey), false, 'Swallowed party target should leave active party list');
  assertContains(App.log[App.log.length - 1].text, 'help Primary swallow Prey', 'Explicit swallow should log helper-assisted primary consumption');
});

test('Marked target sub-action sheet can resolve explicit group swallow intent', () => {
  const { App, body } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const helper = makeUnit('Helper', { id: 'helper-1', size: 1, appetite: 0, Feas: 50 });
  const primary = makeUnit('Primary', { id: 'primary-1', size: 6, appetite: 6, Feas: 30 });
  const prey = makeUnit('Prey', { id: 'prey-1', size: 4, Flee: 1 });
  App.player = player;
  App.party = [player, helper, primary, prey];
  App.settings.chewing = true;
  App.explorationActorIds = ['helper-1', 'primary-1'];
  App.toggleExplorationTarget('party', 'prey-1');
  App.openExplorationTargetSubActionSheet('feast', 'target-bar');
  assertContains(body.innerHTML, "App.resolveExplorationTargetAction('feast','swallow','target-bar')", 'Marked target sub-action sheet should dispatch default feast sub-action');
  App.resolveExplorationTargetAction('feast', 'swallow', 'target-bar');
  assertEqual(App.lastIntentCommand.source, 'target-bar', 'Marked target command should record its source');
  assertEqual(App.lastIntentCommand.subAction, 'swallow', 'Marked target command should record selected sub-action');
  assertEqual(primary.stomach.length, 1, 'Marked explicit swallow should choose a primary consumer instead of splitting portions');
  assertEqual(helper.stomach.length, 0, 'Marked explicit swallow should keep helper out of stomach portion handling');
  assertEqual(App.party.includes(prey), false, 'Marked swallowed party target should leave active party list');
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

test('Group feast removes consumed area creature from active tile', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const helper = makeUnit('Helper', { id: 'helper-1', size: 1, appetite: 1, Feas: 30 });
  const primary = makeUnit('Primary', { id: 'primary-1', size: 6, appetite: 6, Feas: 30 });
  const prey = makeUnit('Prey', { id: 'prey-1', disposition: App.DISPOSITION.FRIENDLY, size: 4, Flee: 1 });
  App.player = player;
  App.party = [player, helper, primary];
  App.creatures = [prey];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [prey] }]]);
  App.settings.chewing = false;
  App.explorationActorIds = ['helper-1', 'primary-1'];
  App.toggleExplorationTarget('creature', 'prey-1');
  App.outsideActionForCreature('feast', 'prey-1');
  assertEqual(primary.stomach.length, 1, 'Group feast should place area creature in selected primary stomach');
  assertEqual(App.creatures.includes(prey), false, 'Consumed area creature should leave active creatures after group feast');
  assertEqual(App.worldMap.get('0,0').creatures.includes(prey), false, 'Consumed area creature should leave persisted tile after group feast');
  assertEqual(App.explorationTargetIds.includes('creature:prey-1'), false, 'Consumed group target should clear selected target state');
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

test('Single exploration action result logs localize', () => {
  const fight = loadAppForCombat(() => 0);
  const fighter = makeUnit('Fighter', { id: 'fighter-1', Figh: 40 });
  const sparTarget = makeUnit('Target', { id: 'target-1', CPun: 2, MPun: 100, con: 1 });
  fight.App.player = fighter;
  fight.App.party = [fighter, sparTarget];
  fight.App.updateLanguage('es');
  fight.App.outsideActionForParty('fight', 1);
  assertContains(fight.App.log[fight.App.log.length - 1].text, 'Tu golpea a Target', 'Single fight result should localize');
  assertContains(fight.App.log[fight.App.log.length - 1].text, 'Target queda sometido', 'Single fight subdued suffix should localize');

  const flirt = loadAppForCombat(() => 0);
  const charmer = makeUnit('Charmer', { id: 'charmer-1', Flir: 40, cha: 20 });
  const flirtTarget = makeUnit('Friendly', { id: 'friendly-1', disposition: flirt.App.DISPOSITION.FRIENDLY, CPle: 0, MPle: 100, wis: 1, charmed: 2 });
  flirt.App.player = charmer;
  flirt.App.party = [charmer];
  flirt.App.creatures = [flirtTarget];
  flirt.App.updateLanguage('es');
  flirt.App.outsideActionForCreature('flirt', 'friendly-1');
  assertContains(flirt.App.log[flirt.App.log.length - 1].text, 'Tu coquetea con Friendly', 'Single flirt result should localize');
  assertContains(flirt.App.log[flirt.App.log.length - 1].text, 'Friendly queda totalmente encantado', 'Single flirt charmed suffix should localize');

  const seduce = loadAppForCombat(() => 0);
  const seducer = makeUnit('Seducer', { id: 'seducer-1', Fuck: 50, Flir: 50, cha: 20 });
  const seduceTarget = makeUnit('Target', { id: 'target-1', disposition: seduce.App.DISPOSITION.FRIENDLY, CPle: 70, MPle: 100, wis: 1 });
  seduce.App.player = seducer;
  seduce.App.party = [seducer];
  seduce.App.creatures = [seduceTarget];
  seduce.App.settings.refractoryPeriod = true;
  seduce.App.updateLanguage('es');
  seduce.App.outsideActionForCreature('fuck', 'target-1');
  assertContains(seduce.App.log[seduce.App.log.length - 1].text, 'Tu complace a Target', 'Single seduce result should localize');
  assertContains(seduce.App.log[seduce.App.log.length - 1].text, 'Target llega al climax', 'Single seduce devoted suffix should localize');
  assertContains(seduce.App.log[seduce.App.log.length - 1].text, 'Target necesita un momento para recuperarse', 'Single seduce recovery suffix should localize');

  const feast = loadAppForCombat(() => 0);
  const eater = makeUnit('Eater', { id: 'eater-1', size: 6, appetite: 6, Feas: 50 });
  const prey = makeUnit('Prey', { id: 'prey-1', disposition: feast.App.DISPOSITION.FRIENDLY, size: 2, Flee: 1 });
  feast.App.player = eater;
  feast.App.party = [eater];
  feast.App.creatures = [prey];
  feast.App.updateLanguage('es');
  feast.App.outsideActionForCreature('feast', 'prey-1');
  assertContains(feast.App.log[feast.App.log.length - 1].text, 'Tu traga a Prey entero', 'Single feast result should localize');
  assertContains(feast.App.log[feast.App.log.length - 1].text, 'estomago de Tu', 'Single feast owner label should localize');

  const feeding = loadAppForCombat(() => 0);
  const feeder = makeUnit('Feeder', { id: 'feeder-1', Feed: 20 });
  const wounded = makeUnit('Wounded', { id: 'wounded-1', CPun: 10, MPun: 100, hunger: 50 });
  feeding.App.player = feeder;
  feeding.App.party = [feeder, wounded];
  feeding.App.updateLanguage('es');
  feeding.App.outsideActionForParty('feed', 1);
  assertContains(feeding.App.log[feeding.App.log.length - 1].text, 'Tu alimenta a Wounded', 'Single feed result should localize');
  assertContains(feeding.App.log[feeding.App.log.length - 1].text, 'restaurando 40 de castigo', 'Single feed amount should interpolate in localized result');
});

test('One actor needs enough stats to handle multiple exploration targets', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 5, cha: 5 });
  const targetA = makeUnit('Target A', { id: 'target-a', CPle: 0, MPle: 100 });
  const targetB = makeUnit('Target B', { id: 'target-b', CPle: 0, MPle: 100 });
  App.player = actor;
  App.party = [actor, targetA, targetB];
  App.updateLanguage('es');
  const resolved = App.outsideActionForPartyTargets('flirt', [1, 2]);
  assertEqual(resolved, false, 'Direct multi-target helper should report stat-gated failure');
  assertEqual(targetA.CPle, 0, 'Low-stat actor should not affect first multi-target target');
  assertEqual(targetB.CPle, 0, 'Low-stat actor should not affect second multi-target target');
  assertContains(App.log[App.log.length - 1].text, 'Actor no puede manejar 2 objetivos con coquetear todavia.', 'Failed multi-target action should localize the stat gate');
});

test('Marked multi-target stat gate preserves selections for correction', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 5, cha: 5 });
  const targetA = makeUnit('Target A', { id: 'target-a', CPle: 0, MPle: 100 });
  const targetB = makeUnit('Target B', { id: 'target-b', CPle: 0, MPle: 100 });
  App.player = actor;
  App.party = [actor, targetA, targetB];
  App.explorationActorIds = ['actor-1'];
  App.updateLanguage('es');
  App.toggleExplorationTarget('party', 'target-a');
  App.toggleExplorationTarget('party', 'target-b');
  const resolved = App.resolveExplorationTargetAction('flirt');
  assertEqual(resolved, false, 'Marked multi-target action should report stat-gated failure');
  assertEqual(targetA.CPle, 0, 'Blocked marked multi-target action should not affect first target');
  assertEqual(targetB.CPle, 0, 'Blocked marked multi-target action should not affect second target');
  assertEqual(App.explorationActorIds.join(','), 'actor-1', 'Blocked marked multi-target action should preserve selected actor');
  assertEqual(App.explorationTargetIds.join(','), 'party:target-a,party:target-b', 'Blocked marked multi-target action should preserve selected targets');
  assertContains(App.log[App.log.length - 1].text, 'Actor no puede manejar 2 objetivos con coquetear todavia.', 'Blocked marked multi-target action should localize the stat gate');
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
  const resolved = App.outsideActionForCreatureTargets('flirt', ['target-a', 'target-b']);
  assertEqual(resolved, true, 'Direct multi-target helper should report successful resolution');
  assert(targetA.CPle > 0, 'Capable actor should affect first target');
  assert(targetB.CPle > 0, 'Capable actor should affect second target');
  assertContains(App.log[App.log.length - 1].text, 'Actor termina una accion multiobjetivo de coquetear sobre Target A, Target B.', 'Successful multi-target action summary should localize');
});

test('Single-target exploration wrappers return resolver outcomes', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 30, cha: 20 });
  const partyTarget = makeUnit('Party Target', { id: 'party-target', CPle: 0, MPle: 100, wis: 1 });
  const creatureTarget = makeUnit('Creature Target', { id: 'creature-target', disposition: App.DISPOSITION.FRIENDLY, CPle: 0, MPle: 100, wis: 1 });
  App.player = actor;
  App.party = [actor, partyTarget];
  App.creatures = [creatureTarget];
  assertEqual(App.outsideActionForParty('flirt', 1), true, 'Party wrapper should report successful single-target resolution');
  assert(partyTarget.CPle > 0, 'Successful party wrapper action should affect target');
  assertEqual(App.outsideActionForCreature('flirt', 'creature-target'), true, 'Creature wrapper should report successful single-target resolution');
  assert(creatureTarget.CPle > 0, 'Successful creature wrapper action should affect target');
  assertEqual(App.outsideActionForParty('flirt', 99), false, 'Party wrapper should report missing target failure');
  assertEqual(App.outsideActionForCreature('flirt', 'missing-creature'), false, 'Creature wrapper should report missing target failure');
  assertEqual(App.outsideActionForCreatureAs('missing-actor', 'flirt', 'missing-creature'), false, 'Actor-specific creature wrapper should report missing target failure');
  const creaturePleAfterValidActor = creatureTarget.CPle;
  assertEqual(App.outsideActionForCreatureAs('missing-actor', 'flirt', 'creature-target'), false, 'Actor-specific creature wrapper should report stale actor failure');
  assertEqual(creatureTarget.CPle, creaturePleAfterValidActor, 'Stale actor wrapper should not mutate the target through player fallback');
});

test('Explicit actor multi-target wrappers reject stale actor ids', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', Flir: 30, cha: 20 });
  const partyTarget = makeUnit('Party Target', { id: 'party-target', CPle: 0, MPle: 100, wis: 1 });
  const creatureTarget = makeUnit('Creature Target', { id: 'creature-target', disposition: App.DISPOSITION.FRIENDLY, CPle: 0, MPle: 100, wis: 1 });
  App.player = actor;
  App.party = [actor, partyTarget];
  App.creatures = [creatureTarget];
  assertEqual(App.outsideActionForPartyTargets('flirt', [1], 'missing-actor'), false, 'Party multi-target wrapper should reject stale explicit actor ids');
  assertEqual(App.outsideActionForCreatureTargets('flirt', ['creature-target'], 'missing-actor'), false, 'Creature multi-target wrapper should reject stale explicit actor ids');
  assertEqual(partyTarget.CPle, 0, 'Stale explicit actor should not affect party target');
  assertEqual(creatureTarget.CPle, 0, 'Stale explicit actor should not affect creature target');
  assertEqual(App.outsideActionForPartyTargets('flirt', [1], 'actor-1'), true, 'Party multi-target wrapper should still accept a valid explicit actor');
  assertEqual(App.outsideActionForCreatureTargets('flirt', ['creature-target'], 'actor-1'), true, 'Creature multi-target wrapper should still accept a valid explicit actor');
  assert(partyTarget.CPle > 0, 'Valid explicit actor should affect party target');
  assert(creatureTarget.CPle > 0, 'Valid explicit actor should affect creature target');
});

test('Single-actor group wrapper preserves rejected action outcomes', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', size: 6, appetite: 6, Feas: 30 });
  App.player = actor;
  App.party = [actor];
  assertEqual(App.outsideActionForParty('feast', 0), false, 'Self-feast through party wrapper should report rejected resolution');
  assertEqual(actor.stomach.length, 0, 'Rejected self-feast should not contain the acting party member');
  assertContains(App.log[App.log.length - 1].text, 'cannot feast on themself', 'Rejected self-feast should keep correction guidance');
  assertEqual(App.selectIntent('party', 0, 'feast'), false, 'Intent dispatch should preserve rejected single-actor group result');
  assertEqual(App.lastIntentCommand.action, 'feast', 'Rejected intent should still record the selected action');
  assertEqual(actor.stomach.length, 0, 'Rejected intent self-feast should not mutate containment');
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
  App.renderParty();
  App.renderCreatures();
  const partyHtml = elements.get('party-content').innerHTML;
  const creatureHtml = elements.get('enemies-content').innerHTML;
  const actorCard = App.renderUnitCard(actor, 0, 'party');
  const allyTargetCard = App.renderUnitCard(allyTarget, 1, 'party');
  const creatureTargetCard = App.renderUnitCard(creatureTarget, 0, 'creature');
  assertContains(actorCard, 'class="unit-card selected selected-actor"', 'Selected actor card should expose selected actor class');
  assertContains(allyTargetCard, 'selected selected-target', 'Selected party target card should expose selected target class');
  assertContains(creatureTargetCard, 'class="unit-card selected selected-target"', 'Selected creature target card should expose selected target class');
  assertContains(partyHtml, 'class="unit-trait-chip selection" data-selection-role="actor" title="Actuar">Actuar</span>', 'Selected party actor should render a localized card chip');
  assertContains(partyHtml, 'class="unit-trait-chip selection" data-selection-role="target" title="Objetivo">Objetivo</span>', 'Selected party target should render a localized card chip');
  assertContains(creatureHtml, 'class="unit-trait-chip selection" data-selection-role="target" title="Objetivo">Objetivo</span>', 'Selected creature target should render a localized card chip');
  const mobileActorChip = App.renderMobileUnitChip(actor, 0, 'party');
  const mobileCreatureChip = App.renderMobileUnitChip(creatureTarget, 0, 'creature');
  assertContains(mobileActorChip, 'class="mobile-unit-chip selected selected-actor"', 'Mobile selected actor chip should expose selected actor class');
  assertContains(mobileCreatureChip, 'class="mobile-unit-chip selected selected-target"', 'Mobile selected target chip should expose selected target class');
  assertContains(mobileActorChip, 'unit-selection-chips', 'Mobile actor chip should render selected-state chips');
  assertContains(mobileCreatureChip, 'unit-selection-chips', 'Mobile creature chip should render selected-state chips');
  const actionsHtml = elements.get('scene-actions').innerHTML;
  assertContains(actionsHtml, 'selected-target-summary', 'Context actions should include a selected-target summary');
  assertContains(actionsHtml, 'aria-label="Objetivos de exploracion seleccionados"', 'Target summary region label should localize');
  assertContains(actionsHtml, 'Actores: Actor', 'Context actions should show localized selected actor names');
  assertContains(actionsHtml, 'Objetivos: Ally Target, Creature Target', 'Context actions should show localized selected target names');
  assertContains(actionsHtml, 'aria-label="Coquetear 2 objetivos"', 'Selected-target action labels should use localized target counts');
  assertContains(actionsHtml, 'class="target-action-row"', 'Desktop selected-target action buttons should be wrapped in a bounded row');
  assertContains(actionsHtml, 'aria-label="Coquetear 2 objetivos" aria-haspopup="dialog" aria-controls="desktop-intent-menu"', 'Desktop selected-target sub-action buttons should advertise and target their dialog popup');
  assertContains(actionsHtml, 'aria-label="Limpiar objetivos"', 'Selected-target clear action should localize its accessible label');
  assertContains(actionsHtml, '>Limpiar<', 'Selected-target clear action should localize its visible label');
  assertContains(template, '.scene-actions .target-action-row', 'Selected-target action buttons should use bounded desktop scene-action sizing');
  assertContains(template, '.scene-actions > .selected-target-summary', 'Selected-target summary should be constrained as a scene action grid item');
  assertContains(template, 'overflow-wrap: anywhere;', 'Long selected actor and target names should wrap instead of forcing horizontal scroll');
  assertContains(template, '.scene-actions .action-caption', 'Scene action captions should be constrained independently');
  assertContains(template, '.scene-actions .target-action-row .action-icon', 'Selected-target action icons should be block-level compact controls');
  assertContains(template, 'max-width: calc(100vw - 36px);', 'Desktop intent popup should clamp to viewport width');
  assertNotContains(actionsHtml, 'aria-label="Limpiar objetivos" aria-haspopup="dialog"', 'Selected-target clear action should remain a direct button');
  assertNotContains(actionsHtml, 'target.count', 'Selected-target actions should not render raw target count locale keys');
  assertNotContains(actionsHtml, 'target.clear', 'Selected-target actions should not render raw clear locale keys');
  assertContains(actionsHtml, "openExplorationTargetSubActionSheet('flirt','desktop-target')", 'Desktop context actions should route registered actions through the desktop selected-target sub-action picker');
  const mobileActionsHtml = App._renderContextActions(true);
  assertContains(mobileActionsHtml, 'aria-label="Coquetear 2 objetivos" aria-haspopup="dialog" aria-controls="mobile-context-menu"', 'Mobile selected-target sub-action buttons should still advertise and target the mobile dialog popup');
  assertContains(mobileActionsHtml, "openExplorationTargetSubActionSheet('flirt','target-bar')", 'Mobile context actions should route registered actions through the mobile selected-target sub-action picker');
});

test('Desktop creature card action labels localize', () => {
  const { App, elements, body } = loadAppForCombat(() => 0);
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
  assertContains(html, 'aria-label="Inspeccionar Friendly"', 'Creature inspect icon should localize accessible label');
  assertContains(html, "showIntentMenu('creature','friendly-1','desktop')", 'Creature card should expose compact action menu');
  assertContains(html, "oncontextmenu=\"event.preventDefault();event.stopPropagation();App.showRadialIntentMenu('creature','friendly-1','secondary-click')", 'Creature card should support desktop secondary-click radial intent menu');
  assertNotContains(html, "outsideActionForCreature('fight','friendly-1')", 'Creature card should not show primary action spam by default');
  assertContains(html, 'aria-label="Reclutar Friendly"', 'Creature recruit icon should localize accessible label');
  assertContains(html, 'aria-label="Aceptar mision de Friendly"', 'Quest action should localize accessible label');
  assertContains(html, '>📜 Aceptar mision<', 'Quest visible label should localize');
  assertContains(html, 'aria-label="Comerciar con Merchant"', 'Merchant trade action should localize accessible label');
  assertContains(html, '>🪙 Comerciar<', 'Merchant trade visible label should localize');
  App.showIntentMenu('creature', 'friendly-1');
  assertContains(body.innerHTML, 'aria-label="Luchar Friendly"', 'Creature action menu should localize fight accessible label');
  assertContains(body.innerHTML, 'aria-label="Seducir Friendly"', 'Creature action menu should localize pleasure accessible label');
  App.closeMobileContextMenu();
  App.showRadialIntentMenu('creature', 'friendly-1', 'secondary-click');
  assertContains(body.innerHTML, 'intent-menu-radial', 'Secondary-click intent menu should use radial presentation scaffold');
  assertContains(body.innerHTML, "App.openIntentSubActionSheet('creature','friendly-1','fight','secondary-click')", 'Secondary-click radial intent menu should preserve command source into sub-action picker');
  App.openIntentSubActionSheet('creature', 'friendly-1', 'flirt', 'secondary-click');
  assertContains(body.innerHTML, "App.selectIntent('creature','friendly-1','flirt','secondary-click','tease')", 'Sub-action sheet should dispatch the default sub-action with preserved source');
  App.closeMobileContextMenu();
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
  const resolved = App.resolveExplorationTargetAction('flirt');
  assertEqual(resolved, true, 'Marked multi-target action should report successful resolution');
  assert(targetA.CPle > 0, 'Marked party target should receive multi-target action');
  assert(targetB.CPle > 0, 'Marked creature target should receive multi-target action');
  assertEqual(App.explorationTargetIds.length, 0, 'Target selection should clear after resolving action');
});

test('Direct multi-target actions normalize stale target selections', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', size: 8, appetite: 8, Feas: 50 });
  const preyA = makeUnit('Prey A', { id: 'prey-a', disposition: App.DISPOSITION.FRIENDLY, size: 2, Flee: 1 });
  const preyB = makeUnit('Prey B', { id: 'prey-b', disposition: App.DISPOSITION.FRIENDLY, size: 2, Flee: 1 });
  App.player = actor;
  App.party = [actor];
  App.creatures = [preyA, preyB];
  App.toggleExplorationTarget('creature', 'prey-a');
  App.toggleExplorationTarget('creature', 'prey-b');
  App.outsideActionForCreatureTargets('feast', ['prey-a', 'prey-b']);
  assertEqual(actor.stomach.length, 2, 'Direct multi-target feast should consume both area creatures');
  assertEqual(App.creatures.length, 0, 'Consumed area creatures should leave the active creature list');
  assertEqual(App.explorationTargetIds.length, 0, 'Direct multi-target action should clear stale selected creature ids');
  assertNotContains(elements.get('scene-actions').innerHTML, 'selected-target-summary', 'Context action UI should not show stale target summary after direct multi-target action');
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

test('Direct multi-target party feed preserves explicit sub-action options', () => {
  const { App } = loadAppForCombat(() => 0);
  const predator = makeUnit('Predator', { id: 'predator-1', size: 6, appetite: 6, Feed: 30 });
  const preyA = makeUnit('Prey A', { id: 'prey-a', CPun: 100, MPun: 100, size: 2, willingPrey: true });
  const preyB = makeUnit('Prey B', { id: 'prey-b', CPun: 100, MPun: 100, size: 2, willingPrey: true });
  App.player = predator;
  App.party = [predator, preyA, preyB];
  App.outsideActionForPartyTargets('feed', [1, 2], null, { subAction: 'sacrifice' });
  assertEqual(predator.stomach.length, 2, 'Direct multi-target party feed should preserve explicit sacrifice sub-action');
  assertEqual(predator.stomach[0].name, 'Prey A', 'First direct multi-target sacrifice should use the selected prey');
  assertEqual(predator.stomach[1].name, 'Prey B', 'Second direct multi-target sacrifice should use the selected prey');
  assertEqual(App.party.includes(preyA), false, 'First sacrificed target should leave the active party');
  assertEqual(App.party.includes(preyB), false, 'Second sacrificed target should leave the active party');
  assertContains(App.log[App.log.length - 1].text, 'Prey A, Prey B', 'Direct explicit sub-action summary should name affected targets');
});

test('Direct multi-target creature feast preserves explicit sub-action options', () => {
  const { App } = loadAppForCombat(() => 0);
  const actor = makeUnit('Actor', { id: 'actor-1', size: 8, appetite: 8, Feas: 50 });
  const preyA = makeUnit('Prey A', { id: 'prey-a', disposition: App.DISPOSITION.FRIENDLY, CPun: 10, MPun: 100, size: 2, Flee: 1 });
  const preyB = makeUnit('Prey B', { id: 'prey-b', disposition: App.DISPOSITION.FRIENDLY, CPun: 10, MPun: 100, size: 2, Flee: 1 });
  App.player = actor;
  App.party = [actor];
  App.creatures = [preyA, preyB];
  App.settings.chewing = true;
  App.outsideActionForCreatureTargets('feast', ['prey-a', 'prey-b'], null, { subAction: 'chew' });
  assertEqual(actor.stomach.length, 0, 'Explicit direct chew should not fall back to swallow containment');
  assertEqual(preyA.alive, false, 'First direct multi-target chew should apply the chew sub-action');
  assertEqual(preyB.alive, false, 'Second direct multi-target chew should apply the chew sub-action');
  assertEqual(App.creatures.length, 0, 'Chewed area creatures should leave the active creature list');
  assertContains(App.log[App.log.length - 1].text, 'Prey A, Prey B', 'Direct explicit feast sub-action summary should name affected targets');
});

test('Equal actors and marked targets resolve as ordered paired actions', () => {
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
  assert(targetA.CPle > 0, 'First paired target should be affected by first actor');
  assert(targetB.CPle > 0, 'Second paired target should be affected by second actor');
  assertEqual(App.explorationTargetIds.length, 0, 'Resolved paired action should clear selected targets');
  assertContains(App.log[App.log.length - 1].text, 'Acciones emparejadas de coquetear resueltas: Actor A -> Target A, Actor B -> Target B.', 'Paired action summary should localize ordered pairs');
});

test('Unequal actors against marked targets are rejected clearly', () => {
  const { App } = loadAppForCombat(() => 0);
  const actorA = makeUnit('Actor A', { id: 'actor-a', Flir: 30, cha: 20 });
  const actorB = makeUnit('Actor B', { id: 'actor-b', Flir: 30, cha: 20 });
  const targetA = makeUnit('Target A', { id: 'target-a', CPle: 0, MPle: 100, wis: 1 });
  const targetB = makeUnit('Target B', { id: 'target-b', CPle: 0, MPle: 100, wis: 1 });
  const targetC = makeUnit('Target C', { id: 'target-c', CPle: 0, MPle: 100, wis: 1 });
  App.player = actorA;
  App.party = [actorA, actorB, targetA, targetB, targetC];
  App.explorationActorIds = ['actor-a', 'actor-b'];
  App.updateLanguage('es');
  App.toggleExplorationTarget('party', 'target-a');
  App.toggleExplorationTarget('party', 'target-b');
  App.toggleExplorationTarget('party', 'target-c');
  const resolved = App.resolveExplorationTargetAction('flirt');
  assertEqual(resolved, false, 'Ambiguous unequal many-to-many action should report failure');
  assertEqual(targetA.CPle, 0, 'Ambiguous unequal many-to-many action should not affect first target');
  assertEqual(targetB.CPle, 0, 'Ambiguous unequal many-to-many action should not affect second target');
  assertEqual(targetC.CPle, 0, 'Ambiguous unequal many-to-many action should not affect third target');
  assertEqual(App.explorationActorIds.join(','), 'actor-a,actor-b', 'Rejected unequal many-to-many action should preserve selected actors for correction');
  assertEqual(App.explorationTargetIds.join(','), 'party:target-a,party:target-b,party:target-c', 'Rejected unequal many-to-many action should preserve selected targets for correction');
  assertContains(App.log[App.log.length - 1].text, 'Elige un actor para acciones multiobjetivo de coquetear, o un objetivo para acciones grupales de coquetear. La seleccion actual tiene 2 actores y 3 objetivos.', 'Unequal many-to-many rejection should localize correction paths with selected counts');
});

test('Marked target subset of actors resolves as self-included mutual group', () => {
  const { App } = loadAppForCombat(() => 0);
  const actorA = makeUnit('Actor A', { id: 'actor-a', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  const actorB = makeUnit('Actor B', { id: 'actor-b', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  const actorC = makeUnit('Actor C', { id: 'actor-c', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  App.player = actorA;
  App.party = [actorA, actorB, actorC];
  App.explorationActorIds = ['actor-a', 'actor-b', 'actor-c'];
  App.toggleExplorationTarget('party', 'actor-a');
  App.toggleExplorationTarget('party', 'actor-b');
  App.resolveExplorationTargetAction('flirt');
  assert(actorA.CPle > 0, 'Subset self-included mutual action should affect first marked participant');
  assert(actorB.CPle > 0, 'Subset self-included mutual action should affect second marked participant');
  assert(actorC.CPle > 0, 'Subset self-included mutual action should include unmarked selected helper as participant');
  assertEqual(App.explorationTargetIds.length, 0, 'Resolved subset self-included action should clear selected targets');
  assertContains(App.log[App.log.length - 1].text, 'share flirt as a mutual group', 'Subset self-included action should route to mutual group semantics');
});

test('Marked target subset of actors blocks mutual feast safely', () => {
  const { App } = loadAppForCombat(() => 0);
  const eaterA = makeUnit('Eater A', { id: 'eater-a', size: 8, appetite: 8, Feas: 60 });
  const eaterB = makeUnit('Eater B', { id: 'eater-b', size: 8, appetite: 8, Feas: 60 });
  const eaterC = makeUnit('Eater C', { id: 'eater-c', size: 8, appetite: 8, Feas: 60 });
  App.player = eaterA;
  App.party = [eaterA, eaterB, eaterC];
  App.explorationActorIds = ['eater-a', 'eater-b', 'eater-c'];
  App.toggleExplorationTarget('party', 'eater-a');
  App.toggleExplorationTarget('party', 'eater-b');
  App.resolveExplorationTargetAction('feast');
  assertEqual(eaterA.stomach.length, 0, 'Subset mutual feast should not contain first participant');
  assertEqual(eaterB.stomach.length, 0, 'Subset mutual feast should not contain second participant');
  assertEqual(eaterC.stomach.length, 0, 'Subset mutual feast should not route marked targets into helper');
  assertEqual(App.party.length, 3, 'Subset mutual feast should leave all participants in party');
  assertContains(App.log[App.log.length - 1].text, 'cannot feast on themselves as a mutual group', 'Subset mutual feast should use safe rejection semantics');
});

test('Marked actor subset of targets resolves as wider mutual group', () => {
  const { App } = loadAppForCombat(() => 0);
  const actorA = makeUnit('Actor A', { id: 'actor-a', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  const actorB = makeUnit('Actor B', { id: 'actor-b', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  const targetC = makeUnit('Target C', { id: 'target-c', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  App.player = actorA;
  App.party = [actorA, actorB, targetC];
  App.explorationActorIds = ['actor-a', 'actor-b'];
  App.toggleExplorationTarget('party', 'actor-a');
  App.toggleExplorationTarget('party', 'actor-b');
  App.toggleExplorationTarget('party', 'target-c');
  App.resolveExplorationTargetAction('flirt');
  assert(actorA.CPle > 0, 'Actor-subset mutual action should affect first selected actor');
  assert(actorB.CPle > 0, 'Actor-subset mutual action should affect second selected actor');
  assert(targetC.CPle > 0, 'Actor-subset mutual action should include the extra marked target');
  assertEqual(App.explorationTargetIds.length, 0, 'Resolved actor-subset mutual action should clear targets');
  assertContains(App.log[App.log.length - 1].text, 'share flirt as a mutual group', 'Actor-subset target action should use mutual group semantics');
});

test('Marked actor subset of targets blocks mutual feast safely', () => {
  const { App } = loadAppForCombat(() => 0);
  const eaterA = makeUnit('Eater A', { id: 'eater-a', size: 8, appetite: 8, Feas: 60 });
  const eaterB = makeUnit('Eater B', { id: 'eater-b', size: 8, appetite: 8, Feas: 60 });
  const eaterC = makeUnit('Eater C', { id: 'eater-c', size: 8, appetite: 8, Feas: 60 });
  App.player = eaterA;
  App.party = [eaterA, eaterB, eaterC];
  App.explorationActorIds = ['eater-a', 'eater-b'];
  App.toggleExplorationTarget('party', 'eater-a');
  App.toggleExplorationTarget('party', 'eater-b');
  App.toggleExplorationTarget('party', 'eater-c');
  App.resolveExplorationTargetAction('feast');
  assertEqual(eaterA.stomach.length, 0, 'Actor-subset mutual feast should not contain first participant');
  assertEqual(eaterB.stomach.length, 0, 'Actor-subset mutual feast should not contain second participant');
  assertEqual(eaterC.stomach.length, 0, 'Actor-subset mutual feast should not contain extra marked participant');
  assertEqual(App.party.length, 3, 'Actor-subset mutual feast should leave all participants in party');
  assertContains(App.log[App.log.length - 1].text, 'cannot feast on themselves as a mutual group', 'Actor-subset mutual feast should use safe rejection semantics');
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

test('Marked explicit feed sacrifice does not skip full-health willing party targets', () => {
  const { App, body } = loadAppForCombat(() => 0);
  const predator = makeUnit('Predator', { id: 'predator-1', size: 6, appetite: 6, Feed: 30 });
  const prey = makeUnit('Prey', { id: 'prey-1', CPun: 100, MPun: 100, size: 2, willingPrey: true });
  App.player = predator;
  App.party = [predator, prey];
  App.explorationActorIds = ['predator-1'];
  App.toggleExplorationTarget('party', 'prey-1');
  App.openExplorationTargetSubActionSheet('feed', 'target-bar');
  assertContains(body.innerHTML, "App.resolveExplorationTargetAction('feed','sacrifice','target-bar')", 'Marked feed sheet should expose sacrifice for willing prey target');
  assertNotContains(body.innerHTML, 'disabled onclick="App.resolveExplorationTargetAction(\'feed\',\'sacrifice\',\'target-bar\')"', 'Available sacrifice should not render disabled');
  App.resolveExplorationTargetAction('feed', 'sacrifice', 'target-bar');
  assertEqual(predator.stomach.length, 1, 'Explicit sacrifice should resolve against a full-health willing party target');
  assertEqual(predator.stomach[0].name, 'Prey', 'Predator should receive the willing prey');
  assertEqual(App.party.includes(prey), false, 'Sacrificed party target should leave active party');
  assertEqual(App.lastIntentCommand.subAction, 'sacrifice', 'Marked feed command should record sacrifice sub-action');
});

test('Marked mutual feed rejects non-heal sub-actions without tending', () => {
  const { App } = loadAppForCombat(() => 0);
  const actorA = makeUnit('Actor A', { id: 'actor-a', CPun: 40, MPun: 100, Feed: 30, willingPrey: true });
  const actorB = makeUnit('Actor B', { id: 'actor-b', CPun: 50, MPun: 100, Feed: 30, willingPrey: true });
  App.player = actorA;
  App.party = [actorA, actorB];
  App.explorationActorIds = ['actor-a', 'actor-b'];
  App.toggleExplorationTarget('party', 'actor-a');
  App.toggleExplorationTarget('party', 'actor-b');
  App.resolveExplorationTargetAction('feed', 'sacrifice', 'target-bar');
  assertEqual(actorA.CPun, 40, 'Invalid mutual sacrifice should not heal the first participant');
  assertEqual(actorB.CPun, 50, 'Invalid mutual sacrifice should not heal the second participant');
  assertEqual(actorA.stomach.length, 0, 'Invalid mutual sacrifice should not contain the first participant');
  assertEqual(actorB.stomach.length, 0, 'Invalid mutual sacrifice should not contain the second participant');
  assertEqual(App.explorationActorIds.join(','), 'actor-a,actor-b', 'Invalid mutual sacrifice should preserve selected actors for correction');
  assertEqual(App.explorationTargetIds.join(','), 'party:actor-a,party:actor-b', 'Invalid mutual sacrifice should preserve selected targets for correction');
  assertContains(App.log[App.log.length - 1].text, 'No valid target for this feed action.', 'Invalid mutual sacrifice should report no valid feed target');
});

test('Identical actor and target sets resolve as mutual group actions', () => {
  const fight = loadAppForCombat(() => 0);
  const fighterA = makeUnit('Fighter A', { id: 'fighter-a', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  const fighterB = makeUnit('Fighter B', { id: 'fighter-b', CPun: 100, MPun: 100, Figh: 40, con: 1 });
  fight.App.player = fighterA;
  fight.App.party = [fighterA, fighterB];
  fight.App.explorationActorIds = ['fighter-a', 'fighter-b'];
  fight.App.toggleExplorationTarget('party', 'fighter-a');
  fight.App.toggleExplorationTarget('party', 'fighter-b');
  fight.App.resolveExplorationTargetAction('fight');
  assert(fighterA.CPun < 100, 'Mutual fight should affect the first participant');
  assert(fighterB.CPun < 100, 'Mutual fight should affect the second participant');
  assertContains(fight.App.log[fight.App.log.length - 1].text, 'mutual group', 'Identical actor/target fight should not route as ordered self-pairs');

  const social = loadAppForCombat(() => 0);
  const socialA = makeUnit('Social A', { id: 'social-a', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  const socialB = makeUnit('Social B', { id: 'social-b', CPle: 0, MPle: 100, Flir: 30, cha: 20 });
  social.App.player = socialA;
  social.App.party = [socialA, socialB];
  social.App.explorationActorIds = ['social-a', 'social-b'];
  social.App.toggleExplorationTarget('party', 'social-a');
  social.App.toggleExplorationTarget('party', 'social-b');
  social.App.resolveExplorationTargetAction('flirt');
  assert(socialA.CPle > 0, 'Mutual social action should affect the first participant');
  assert(socialB.CPle > 0, 'Mutual social action should affect the second participant');
  assertContains(social.App.log[social.App.log.length - 1].text, 'share flirt as a mutual group', 'Identical actor/target social action should use mutual summary');
});

test('Identical actor and target sets tend together and block mutual feast', () => {
  const feed = loadAppForCombat(() => 0);
  const healerA = makeUnit('Healer A', { id: 'healer-a', CPun: 40, MPun: 100, Feed: 30, hunger: 40 });
  const healerB = makeUnit('Healer B', { id: 'healer-b', CPun: 50, MPun: 100, Feed: 30, hunger: 40 });
  feed.App.player = healerA;
  feed.App.party = [healerA, healerB];
  feed.App.explorationActorIds = ['healer-a', 'healer-b'];
  feed.App.updateLanguage('es');
  feed.App.toggleExplorationTarget('party', 'healer-a');
  feed.App.toggleExplorationTarget('party', 'healer-b');
  feed.App.resolveExplorationTargetAction('feed');
  assert(healerA.CPun > 40, 'Mutual feed should heal the first participant');
  assert(healerB.CPun > 50, 'Mutual feed should heal the second participant');
  assert(healerA.hunger < 40, 'Mutual feed should reduce first participant hunger pressure');
  assert(healerB.hunger < 40, 'Mutual feed should reduce second participant hunger pressure');
  assertContains(feed.App.log[feed.App.log.length - 1].text, 'se atienden entre si', 'Mutual feed summary should localize');

  const feast = loadAppForCombat(() => 0);
  const eaterA = makeUnit('Eater A', { id: 'eater-a', size: 8, appetite: 8, Feas: 60 });
  const eaterB = makeUnit('Eater B', { id: 'eater-b', size: 8, appetite: 8, Feas: 60 });
  feast.App.player = eaterA;
  feast.App.party = [eaterA, eaterB];
  feast.App.explorationActorIds = ['eater-a', 'eater-b'];
  feast.App.updateLanguage('es');
  feast.App.toggleExplorationTarget('party', 'eater-a');
  feast.App.toggleExplorationTarget('party', 'eater-b');
  feast.App.resolveExplorationTargetAction('feast');
  assertEqual(eaterA.stomach.length, 0, 'Mutual feast should not put first participant in any stomach');
  assertEqual(eaterB.stomach.length, 0, 'Mutual feast should not put second participant in any stomach');
  assertEqual(feast.App.party.includes(eaterA), true, 'Mutual feast should keep first participant in party');
  assertEqual(feast.App.party.includes(eaterB), true, 'Mutual feast should keep second participant in party');
  assertContains(feast.App.log[feast.App.log.length - 1].text, 'no pueden devorarse a si mismos como grupo mutuo', 'Mutual feast should localize a clear rejection');
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

test('Moving tiles clears current tile event feed but keeps durable log', () => {
  const { App, elements } = loadAppForCombat(() => 1);
  const player = makeUnit('You', { id: 'player-1' });
  App.player = player;
  App.party = [player];
  App.creatures = [];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([
    ['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], items: [], description: 'Start' }],
    ['1,0', { x: 1, y: 0, biome: 'forest', explored: true, creatures: [], items: [], description: 'Next' }]
  ]);
  App.exploredTiles = new Set(['0,0', '1,0']);
  App.log = [{ text: 'Old durable entry', type: 'discovery' }];
  App.tileEvents = [{ text: 'Old tile-only event', type: 'discovery', time: '08:00 Day' }];
  App.renderTileEvents();
  assertContains(elements.get('tile-event-feed').innerHTML, 'Old tile-only event', 'Precondition: tile feed should render current tile events');

  App.move(1, 0);

  assertEqual(App.log.some(entry => entry.text === 'Old durable entry'), true, 'Durable log should survive tile movement');
  assertEqual(App.tileEvents.some(entry => entry.text === 'Old tile-only event'), false, 'Tile feed should clear events from the prior tile');
  assertContains(elements.get('tile-event-feed').innerHTML, 'Moved to 1, 0', 'New tile feed should show arrival context');
  assertContains(elements.get('mobile-tile-event-feed').innerHTML, 'Moved to 1, 0', 'Mobile scene should mirror tile events');
});

test('Recruitment is gated by pleasure and willingness score', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { cha: 10, Flir: 10, Fuck: 10, xp: 0, xpToNext: 1000 });
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
  assertEqual(player.xp, App.BALANCE.recruitXP, 'Successful recruitment should use configured recruit XP reward');
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
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], structureSpawned: true }]]);
  App.updateLanguage('es');
  App.enterStructure();
  assertEqual(App.log[App.log.length - 1].text, 'No hay una estructura para entrar aqui.', 'Missing-structure feedback should localize');
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'forest', explored: true, creatures: [], structure: 'cabin', structureSpawned: true }]]);
  App.renderExplorationActions();
  assertContains(elements.get('scene-actions').innerHTML, 'App.enterStructure()', 'Structure tile should expose enter action');
  App.enterStructure();
  assertEqual(App.inInterior, true, 'Entering structure should switch to interior mode');
  assertEqual(App.log[App.log.length - 1].text, 'Entraste en Cabin.', 'Enter structure feedback should localize');
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
  App.updateLanguage('es');
  App.enterStructure();
  App.creatures = [roomCreature];
  App.move(1, 0);
  assertEqual(App.activeInterior.tiles['0,0'].creatures.includes(roomCreature), true, 'Leaving an interior room should persist its creatures');
  assertEqual(App.interiorLocation.x, 1, 'Interior move should update interior x coordinate');
  assertEqual(App.log[App.log.length - 1].text, 'Movimiento dentro de Cabin a 1, 0.', 'Interior movement feedback should localize');
  App.interiorLocation = { x: 2, y: 0 };
  App.move(1, 0);
  assertEqual(App.log[App.log.length - 1].text, 'Una pared bloquea el camino.', 'Interior wall feedback should localize');
  App.exitStructure();
  assertEqual(App.inInterior, false, 'Exit should return to overworld mode');
  assertEqual(App.log[App.log.length - 1].text, 'Saliste de Cabin.', 'Exit structure feedback should localize');
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

test('Map tile visuals expose tileset keys while preserving base biome identity', () => {
  const { App, elements } = loadAppForCombat();
  const forestRoad = {
    x: 0,
    y: 0,
    biome: 'forest',
    baseBiome: 'forest',
    derivedBiome: 'forest',
    displayBiome: 'road',
    explored: true,
    creatures: [],
    overlays: { road: { id: 'road-test', direction: 'north-south' } }
  };
  const waterBridge = {
    x: 1,
    y: 0,
    biome: 'water',
    baseBiome: 'water',
    derivedBiome: 'water',
    displayBiome: 'bridge',
    water: true,
    explored: true,
    creatures: [],
    overlays: {
      road: { id: 'road-test', direction: 'east-west' },
      bridge: { id: 'bridge-test', direction: 'east-west', roadId: 'road-test' }
    }
  };
  const campTile = {
    x: 0,
    y: 1,
    biome: 'grove',
    baseBiome: 'grove',
    derivedBiome: 'grove',
    displayBiome: 'grove',
    explored: true,
    creatures: [],
    structure: 'camp',
    overlays: {}
  };

  const roadVisual = App._mapTileVisual(forestRoad);
  const bridgeVisual = App._mapTileVisual(waterBridge);
  const campVisual = App._mapTileVisual(campTile);
  assertEqual(roadVisual.tilesetKey, 'route-road-vertical', 'Road visual should expose a direction-specific tileset key');
  assertEqual(roadVisual.baseTilesetKey, 'terrain-forest', 'Road visual should preserve forest base terrain key');
  assertEqual(roadVisual.routeShape, 'north-south', 'Road visual should use stored direction when no neighbor resolver is available');
  assertEqual(roadVisual.asset.key, 'route-road-vertical', 'Road visual should resolve manifest asset metadata');
  assertEqual(roadVisual.asset.fallbackMode, 'emoji', 'Road visual should preserve fallback mode without imported art');
  assertEqual(roadVisual.hasPaintedAsset, false, 'Road visual should not claim painted assets before import');
  assertEqual(forestRoad.biome, 'forest', 'Visual mapping should not replace the base biome with road');
  assertEqual(bridgeVisual.tilesetKey, 'route-bridge-horizontal', 'Bridge visual should expose a direction-specific tileset key');
  assertEqual(bridgeVisual.baseTilesetKey, 'terrain-water', 'Bridge visual should preserve water base terrain key');
  assertEqual(campVisual.tilesetKey, 'structure-camp', 'Known structures should expose structure tileset keys');
  assertEqual(App._mapTileVisual(null).tilesetKey, 'unknown', 'Unknown tiles should expose a stable unknown key');

  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([
    ['0,0', forestRoad],
    ['1,0', waterBridge],
    ['0,1', campTile]
  ]);
  App.exploredTiles = new Set(['0,0', '1,0', '0,1']);
  App.renderMap();
  App.renderLargeMap();
  assertContains(elements.get('mini-map').innerHTML, 'data-tileset-key="route-road-end"', 'Minimap should infer route shape from known neighbors');
  assertContains(elements.get('mini-map').innerHTML, 'data-base-tileset-key="terrain-forest"', 'Minimap should render base terrain tileset keys');
  assertContains(elements.get('mini-map').innerHTML, 'data-asset-id="core-emoji-fallback:route-road-end"', 'Minimap should expose asset manifest ids');
  assertContains(elements.get('mini-map').innerHTML, 'data-asset-fallback="emoji"', 'Minimap should expose fallback rendering mode');
  assertContains(elements.get('large-map').innerHTML, 'data-tileset-key="route-bridge-horizontal"', 'Large map should render bridge tileset keys');
  assertContains(elements.get('large-map').innerHTML, 'data-tileset-key="structure-camp"', 'Large map should render structure tileset keys');
  assertContains(elements.get('large-map').innerHTML, 'data-asset-id="core-emoji-fallback:structure-camp"', 'Large map should expose structure asset ids');
});

test('Map route visuals infer corners and intersections from known neighbors', () => {
  const { App, elements } = loadAppForCombat();
  const road = (x, y, direction = 'east-west') => ({
    x,
    y,
    biome: 'plains',
    baseBiome: 'plains',
    derivedBiome: 'plains',
    displayBiome: 'road',
    explored: true,
    creatures: [],
    overlays: { road: { id: `road-${x}-${y}`, direction } }
  });
  const cornerCenter = road(0, 0, 'east-west');
  const cornerTiles = new Map([
    ['0,0', cornerCenter],
    ['0,-1', road(0, -1, 'north-south')],
    ['1,0', road(1, 0, 'east-west')]
  ]);
  const cornerResolver = (x, y) => cornerTiles.get(`${x},${y}`) || null;
  const cornerVisual = App._mapTileVisual(cornerCenter, { neighborResolver: cornerResolver });
  assertEqual(cornerVisual.routeShape, 'corner-ne', 'Known north/east road neighbors should infer a corner shape');
  assertEqual(cornerVisual.tilesetKey, 'route-road-corner-ne', 'Corner route shape should map to a directional tileset key');

  const intersectionCenter = road(5, 5, 'east-west');
  const intersectionTiles = new Map([
    ['5,5', intersectionCenter],
    ['5,4', road(5, 4, 'north-south')],
    ['6,5', road(6, 5, 'east-west')],
    ['5,6', road(5, 6, 'north-south')],
    ['4,5', road(4, 5, 'east-west')]
  ]);
  const intersectionResolver = (x, y) => intersectionTiles.get(`${x},${y}`) || null;
  const intersectionVisual = App._mapTileVisual(intersectionCenter, { neighborResolver: intersectionResolver });
  assertEqual(intersectionVisual.routeShape, 'intersection', 'Four known road neighbors should infer an intersection');
  assertEqual(intersectionVisual.tilesetKey, 'route-road-intersection', 'Intersection route shape should map to the intersection tileset key');

  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = cornerTiles;
  App.exploredTiles = new Set(['0,0', '0,-1', '1,0']);
  App.renderLargeMap();
  assertContains(elements.get('large-map').innerHTML, 'data-route-shape="corner-ne"', 'Rendered large map should expose inferred corner route shape from known tiles');
  assertContains(elements.get('large-map').innerHTML, 'data-tileset-key="route-road-corner-ne"', 'Rendered large map should expose inferred corner tileset key from known tiles');
});

test('Interior map visuals expose tileset metadata for rooms exits and features', () => {
  const { App, elements } = loadAppForCombat();
  const indoor = { x: 1, y: 0, biome: 'indoors', explored: true, structure: 'camp', exit: false };
  const cave = { x: 0, y: 1, biome: 'cave', explored: true, structure: null, exit: false };
  const exit = { x: 0, y: 0, biome: 'indoors', explored: true, structure: null, exit: true };
  const wallVisual = App._interiorTileVisual(null);
  const indoorVisual = App._interiorTileVisual(indoor);
  const caveVisual = App._interiorTileVisual(cave);
  const exitVisual = App._interiorTileVisual(exit);
  assertEqual(wallVisual.tilesetKey, 'interior-wall', 'Missing interior rooms should expose a wall tileset key');
  assertEqual(wallVisual.asset.key, 'interior-wall', 'Interior wall visual should resolve manifest asset metadata');
  assertEqual(indoorVisual.tilesetKey, 'structure-camp', 'Interior feature rooms should reuse known structure tileset keys');
  assertEqual(indoorVisual.baseTilesetKey, 'terrain-indoors', 'Interior feature rooms should preserve indoor base terrain key');
  assertEqual(caveVisual.tilesetKey, 'interior-cave-room', 'Cave interiors should expose a cave-room tileset key');
  assertEqual(caveVisual.baseTilesetKey, 'terrain-cave', 'Cave interiors should preserve cave base terrain key');
  assertEqual(exitVisual.tilesetKey, 'interior-exit', 'Interior exits should expose an exit tileset key');
  assertEqual(exitVisual.kind, 'interior-exit', 'Interior exits should expose a specific map kind');

  App.inInterior = true;
  App.activeInterior = {
    structureName: 'Cabin',
    tiles: {
      '0,0': exit,
      '1,0': indoor,
      '0,1': cave
    }
  };
  App.interiorLocation = { x: 0, y: 0 };
  App.renderMap();
  const html = elements.get('mini-map').innerHTML;
  assertContains(html, 'data-tileset-key="interior-exit"', 'Rendered interior minimap should expose exit tileset key');
  assertContains(html, 'data-asset-id="core-emoji-fallback:interior-exit"', 'Rendered interior minimap should expose exit asset id');
  assertContains(html, 'data-tileset-key="structure-camp"', 'Rendered interior minimap should expose feature tileset key');
  assertContains(html, 'data-tileset-key="interior-cave-room"', 'Rendered interior minimap should expose cave room tileset key');
  assertContains(html, 'data-tileset-key="interior-wall"', 'Rendered interior minimap should expose wall tileset key for missing rooms');
  assertContains(html, 'data-map-kind="interior-exit"', 'Rendered interior minimap should expose interior map kind');
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

test('Noise biome generation is stable by seed and coordinate', () => {
  const { App } = loadAppForCombat();
  App.worldMeta = { worldId: 'world-noise-a', seed: 'organic-seed', generatorVersion: 2, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  const first = App.getBaseTile(37, -22);
  const second = App.getBaseTile(37, -22);
  assertEqual(JSON.stringify(first), JSON.stringify(second), 'Same seed and coordinate should produce identical base tile data');
  assert(App._regionBiomeKeys().includes(first.biome), 'Generated biome should be a region biome');
  assertEqual(typeof first.elevation, 'number', 'Base tile should include deterministic elevation');
  assertEqual(typeof first.moisture, 'number', 'Base tile should include deterministic moisture');
  assertEqual(typeof first.heat, 'number', 'Base tile should include deterministic heat');
  assertEqual(typeof first.dangerPressure, 'number', 'Base tile should include deterministic danger pressure');
  assert(first.regionCell?.id, 'Base tile should include cellular macro-region metadata');
  assert(Array.isArray(first.terrainTags), 'Base tile should include terrain tags');
});

test('WorldGen deterministic helpers are stable by seed namespace and version', () => {
  const WorldGen = loadWorldGenForTest();
  const a = WorldGen.hash01('seed-a', 2, 'terrain', 12, -4);
  const b = WorldGen.hash01('seed-a', 2, 'terrain', 12, -4);
  const otherNamespace = WorldGen.hash01('seed-a', 2, 'poi', 12, -4);
  const otherVersion = WorldGen.hash01('seed-a', 3, 'terrain', 12, -4);
  assertEqual(a, b, 'Same seed version namespace and coords should produce same hash');
  assert(a !== otherNamespace, 'Different namespaces should produce different deterministic streams');
  assert(a !== otherVersion, 'Different generator versions should be able to change deterministic streams');
  const table = [{ id: 'forest', weight: 2 }, { id: 'grove', weight: 5 }, { id: 'swamp', weight: 1 }];
  const pickA = WorldGen.pickWeighted('seed-a', 2, 'macro-biome', 7, -3, table);
  const pickB = WorldGen.pickWeighted('seed-a', 2, 'macro-biome', 7, -3, table);
  assertEqual(pickA, pickB, 'Weighted pick should be stable for the same deterministic inputs');
});

test('Different seeds can produce different biome layouts', () => {
  const { App } = loadAppForCombat();
  const coords = [[-45, -12], [-18, 33], [0, 0], [12, 9], [28, -31], [44, 17]];
  App.worldMeta = { worldId: 'world-seed-a', seed: 'layout-a', generatorVersion: 2, mapModsHash: 'core' };
  const layoutA = coords.map(([x, y]) => {
    const tile = App.getBaseTile(x, y);
    return `${tile.biome}:${tile.macroBiome}:${tile.elevation}:${tile.moisture}:${tile.heat}`;
  });
  App.worldMeta = { worldId: 'world-seed-b', seed: 'layout-b', generatorVersion: 2, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  const layoutB = coords.map(([x, y]) => {
    const tile = App.getBaseTile(x, y);
    return `${tile.biome}:${tile.macroBiome}:${tile.elevation}:${tile.moisture}:${tile.heat}`;
  });
  assert(layoutA.join('|') !== layoutB.join('|'), 'Different seeds should be able to produce different terrain field/layout output');
});

test('Beach biome is derived only near deterministic water', () => {
  const { App } = loadAppForCombat();
  App.worldMeta = { worldId: 'world-beach', seed: 'coastal-seed', generatorVersion: 2, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  let beach = null;
  let inland = null;
  const hasNearbyWater = (x, y) => {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (Math.abs(dx) + Math.abs(dy) > 2 || (dx === 0 && dy === 0)) continue;
        if (App.getBaseTile(x + dx, y + dy).water) return true;
      }
    }
    return false;
  };
  for (let x = -90; x <= 90 && (!beach || !inland); x++) {
    for (let y = -90; y <= 90 && (!beach || !inland); y++) {
      const tile = App.getBaseTile(x, y);
      const nearWater = hasNearbyWater(x, y);
      if (!beach && tile.biome === 'beach') beach = { tile, nearWater };
      if (!inland && !tile.water && !nearWater) inland = tile;
    }
  }
  assert(beach, 'Test seed should produce at least one deterministic beach in the sampled area');
  assertEqual(beach.tile.water, false, 'Beach should be land, not water');
  assert(beach.nearWater, 'Beach should be adjacent or near deterministic water');
  assert(inland, 'Test seed should produce a far-inland land tile in the sampled area');
  assert(inland.biome !== 'beach', 'Far-inland land should not classify as beach');
});

test('Road and bridge overlays are deterministic constrained features', () => {
  const { App } = loadAppForCombat();
  App.worldMeta = { worldId: 'world-routes', seed: 'route-seed', generatorVersion: 2, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  let roadTile = null;
  let bridgeTile = null;
  let waterWithoutRoad = null;
  for (let x = -140; x <= 140 && (!roadTile || !bridgeTile || !waterWithoutRoad); x++) {
    for (let y = -140; y <= 140 && (!roadTile || !bridgeTile || !waterWithoutRoad); y++) {
      const tile = App.getBaseTile(x, y);
      if (!roadTile && tile.overlays?.road) roadTile = tile;
      if (!bridgeTile && tile.overlays?.bridge) bridgeTile = tile;
      if (!waterWithoutRoad && tile.water && !tile.overlays?.road) waterWithoutRoad = tile;
    }
  }
  assert(roadTile, 'Test seed should produce at least one deterministic road overlay');
  assertEqual(roadTile.biome === 'road', false, 'Road should be an overlay, not a base biome replacement');
  assert(bridgeTile, 'Test seed should produce at least one deterministic bridge overlay in the sampled area');
  assert(bridgeTile.overlays.road, 'Bridge requires a road overlay');
  assertEqual(bridgeTile.water, true, 'Bridge requires a water crossing tile');
  assert(['east-west', 'north-south'].includes(bridgeTile.overlays.bridge.direction), 'Bridge direction should be coherent');
  assertEqual(bridgeTile.overlays.bridge.roadId, bridgeTile.overlays.road.id, 'Bridge should reference its road overlay');
  assertEqual(bridgeTile.biome === 'bridge', false, 'Bridge should be an overlay, not a base biome replacement');
  assert(waterWithoutRoad, 'Test seed should produce a water tile without road overlay');
  assertEqual(Boolean(waterWithoutRoad.overlays?.bridge), false, 'Bridge should not appear without a road overlay');
});

test('Terrain traversal metadata defines conservative passability and route costs', () => {
  const WorldGen = loadWorldGenForTest();
  const plain = WorldGen.getTraversal({ biome: 'plains', water: false, overlays: {} });
  const forest = WorldGen.getTraversal({ biome: 'forest', water: false, overlays: {} });
  const forestRoad = WorldGen.getTraversal({ biome: 'forest', baseBiome: 'forest', water: false, overlays: { road: { id: 'road-test' } } });
  const water = WorldGen.getTraversal({ biome: 'water', water: true, overlays: {} });
  const bridge = WorldGen.getTraversal({ biome: 'water', water: true, overlays: { road: { id: 'road-test' }, bridge: { id: 'bridge-test' } } });
  const beach = WorldGen.getTraversal({ biome: 'beach', water: false, overlays: {} });
  const cliff = WorldGen.getTraversal({ biome: 'cliff', water: false, overlays: {} });
  assertEqual(plain.passable, true, 'Plain terrain should be passable');
  assertEqual(water.passable, false, 'Deep water should be blocked without capability or bridge');
  assertEqual(water.requiredCapability, 'swim', 'Blocked water should declare a swim capability contract');
  assertEqual(bridge.passable, true, 'Bridge should make water crossing passable');
  assertEqual(bridge.traversalCost, 1, 'Bridge should provide road-like traversal cost');
  assertEqual(beach.passable, true, 'Beach/coast should be passable');
  assert(cliff.traversalCost > plain.traversalCost, 'Cliff should cost more to traverse than plain terrain');
  assert(forestRoad.traversalCost < forest.traversalCost, 'Road overlay should lower traversal cost without replacing the forest biome');
});

test('Versioned start area validation guarantees early route and rest access', () => {
  const WorldGen = loadWorldGenForTest();
  const { App } = loadAppForCombat();
  App.worldMeta = { worldId: 'world-start-safe', seed: 'default', generatorVersion: 2, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set();
  const result = WorldGen.validateStartArea(App.worldMeta, App._regionBiomeKeys());
  assertEqual(result.ok, true, 'Default versioned start area should satisfy safety invariants');
  assertEqual(result.checks.safeBiomeRadius, true, 'Start area should have enough low-danger passable terrain');
  assertEqual(result.checks.noHardLockout, true, 'Start should not be surrounded by blocked terrain');
  assertEqual(result.checks.routeAccess, true, 'Start should have nearby route access');
  assertEqual(result.checks.restCandidate, true, 'Start should have a nearby rest-site candidate');
  const restBase = App.getBaseTile(4, 0);
  assert(restBase.overlays?.road, 'Start rest candidate should sit on a deterministic route seam');
  assertEqual(restBase.overlays?.poi?.category, 'restSite', 'Start rest candidate should be a deterministic rest-site POI');
  const discovered = App.exploreTile(4, 0);
  assertEqual(discovered.structure, 'camp', 'Rest-site POI should resolve to a rest-capable structure on discovery');
});

test('Map summary and encounter pressure expose safe UI metadata', () => {
  const WorldGen = loadWorldGenForTest();
  const wildTile = {
    x: 8,
    y: -2,
    biome: 'forest',
    baseBiome: 'forest',
    derivedBiome: 'forest',
    displayBiome: 'forest',
    dangerPressure: 0.5,
    overlays: {},
    terrainTags: ['dense-growth'],
    explored: false
  };
  const roadTile = { ...wildTile, overlays: { road: { id: 'road-test' } }, terrainTags: ['dense-growth', 'road'] };
  const dangerTile = { ...wildTile, overlays: { poi: { category: 'dangerSite' } } };
  const wildPressure = WorldGen.getEncounterPressure(wildTile, { biomeDanger: 3 });
  const roadPressure = WorldGen.getEncounterPressure(roadTile, { biomeDanger: 3 });
  const dangerPressure = WorldGen.getEncounterPressure(dangerTile, { biomeDanger: 3 });
  assert(roadPressure.finalChance < wildPressure.finalChance, 'Road overlay should lower wilderness encounter pressure');
  assert(dangerPressure.finalChance > wildPressure.finalChance, 'Danger POI should raise encounter pressure');
  const summary = WorldGen.getTileMapSummary({
    ...roadTile,
    structure: 'camp',
    explored: true,
    creatures: [
      { name: 'Merchant', disposition: 'merchant', stock: [{ id: 'ration' }] },
      { name: 'Guide', disposition: 'friendly' }
    ]
  }, { biomeDanger: 3, questRelevant: true });
  assertEqual(summary.biome, 'forest', 'Summary should keep the display/base biome visible');
  assertEqual(summary.coords.x, 8, 'Summary should expose coordinates');
  assertEqual(summary.traversal.passable, true, 'Summary should expose traversal contract');
  assertEqual(summary.restAvailable, true, 'Summary should expose safe rest availability');
  assert(summary.markers.includes('Road'), 'Summary should expose route markers');
  assert(summary.markers.includes('Merchant'), 'Summary should expose merchant markers from tile creatures');
  assert(summary.markers.includes('Quest'), 'Summary should expose quest relevance markers');
  assertEqual(summary.questRelevant, true, 'Summary should preserve quest relevance flag');
});

test('POI budgets create stable spaced region candidates and route anchors', () => {
  const WorldGen = loadWorldGenForTest();
  const seed = 'poi-budget-seed';
  const version = 2;
  const budgetA = WorldGen.getPoiBudgetForRegion(seed, version, 3, -2);
  const budgetB = WorldGen.getPoiBudgetForRegion(seed, version, 3, -2);
  assertEqual(JSON.stringify(budgetA), JSON.stringify(budgetB), 'POI budget should be stable for a seed/version/region');
  assertEqual(budgetA.regionId, '3,-2', 'POI budget should expose stable region identity');
  assert(budgetA.categories.restSite.count >= 1, 'Region budget should include at least one rest-site opportunity');
  assert(budgetA.categories.resourceSite.count >= 1, 'Region budget should include at least one resource opportunity');
  assert(budgetA.categories.landmark.count >= 1, 'Region budget should include at least one landmark opportunity');

  const candidatesA = WorldGen.getPoiCandidatesForRegion(seed, version, 3, -2);
  const candidatesB = WorldGen.getPoiCandidatesForRegion(seed, version, 3, -2);
  assertEqual(JSON.stringify(candidatesA), JSON.stringify(candidatesB), 'POI candidates should be stable for a seed/version/region');
  assert(candidatesA.length > 0, 'Region should expose deterministic POI candidates');
  for (let i = 0; i < candidatesA.length; i++) {
    for (let j = i + 1; j < candidatesA.length; j++) {
      if (candidatesA[i].category !== candidatesA[j].category) continue;
      const dx = candidatesA[i].anchor.x - candidatesA[j].anchor.x;
      const dy = candidatesA[i].anchor.y - candidatesA[j].anchor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      assert(dist >= candidatesA[i].minDistance, `POI candidates in ${candidatesA[i].category} should respect minimum spacing`);
    }
  }
  const routeAnchors = WorldGen.getRouteAnchorsForRegion(seed, version, 3, -2);
  assert(routeAnchors.length > 0, 'Region should expose route anchors');
  assert(routeAnchors.every(anchor => anchor.routeAnchor), 'Route anchor seam should only return route-capable anchors');
  const first = candidatesA[0];
  const tilePoi = WorldGen.getPoiForTile(seed, version, first.anchor.x, first.anchor.y);
  assert(tilePoi, 'Tile lookup should resolve deterministic POI candidate anchors');
  assertEqual(tilePoi.id, first.id, 'Tile POI lookup should return the matching candidate id');
});

test('Landmarks and structures are deterministic by seed and coordinate', () => {
  const first = loadAppForCombat(() => 1);
  const App = first.App;
  App.worldMeta = { worldId: 'world-features-a', seed: 'feature-seed', generatorVersion: 2, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set();
  let landmarkA = null;
  let structureA = null;
  for (let x = -80; x <= 80 && (!landmarkA || !structureA); x++) {
    for (let y = -80; y <= 80 && (!landmarkA || !structureA); y++) {
      const tile = App.exploreTile(x, y);
      if (!landmarkA && tile.hasLandmark) landmarkA = { coord: [x, y], name: tile.landmarkName };
      if (!structureA && tile.structure) structureA = { coord: [x, y], structure: tile.structure };
    }
  }
  assert(landmarkA, 'Test seed should produce at least one deterministic landmark coordinate even when Math.random is 1');
  assert(structureA, 'Test seed should produce at least one deterministic structure coordinate even when Math.random is 1');
  const second = loadAppForCombat(() => 0);
  second.App.worldMeta = { ...App.worldMeta };
  second.App.worldMap = new Map();
  second.App.tileDeltas = new Map();
  const landmarkB = second.App.exploreTile(landmarkA.coord[0], landmarkA.coord[1]);
  const structureB = second.App.exploreTile(structureA.coord[0], structureA.coord[1]);
  assertEqual(landmarkB.landmarkName, landmarkA.name, 'Same seed and coordinate should reproduce landmark name');
  assertEqual(structureB.structure, structureA.structure, 'Same seed and coordinate should reproduce structure kind');
});

test('Wild encounter generation is deterministic by seed and coordinate outside first entry', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { worldId: 'world-wild-a', seed: 'wild-seed', generatorVersion: 2, mapModsHash: 'core' };
    App.worldMap = new Map();
    App.tileDeltas = new Map();
    App.location = { x: 11, y: -7 };
    App.currentBiome = 'forest';
    App.player = makeUnit('Tester', { id: 'tester', species: 'human', level: 4, mc: true, hero: true });
    App.party = [App.player];
    App.player.level = 4;
    const tile = { x: 11, y: -7, biome: 'forest', creatures: [] };
    App.creatures = [];
    App.spawnWildEncounter(tile, false, false);
    return (tile.creatures || []).map(creature => ({
      id: creature.id,
      name: creature.name,
      species: creature.species,
      level: creature.level,
      MPun: creature.MPun,
      CPun: creature.CPun,
      Figh: creature.Figh,
      Feas: creature.Feas,
      Flir: creature.Flir,
      Feed: creature.Feed,
      hunger: creature.hunger,
      disposition: creature.disposition,
      willing: creature.willing
    }));
  };

  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assert(lowRandom.length > 0, 'Wild encounter test should generate at least one creature');
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Wild encounter generation should not depend on ambient Math.random');
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
  assertEqual(effective.elevation, base.elevation, 'Effective tile should retain generated field metadata');
  assertEqual(effective.creatures[0].name, 'Mouse', 'Effective tile should restore delta entities');
});

test('Deterministic world generation paths do not use Math.random', () => {
  const { App } = loadAppForCombat();
  assertNotContains(worldGenerationContent, 'Math.random', 'WorldGen module should not use Math.random');
  assertNotContains(App.getBaseTile.toString(), 'Math.random', 'Base tile generation should not use Math.random');
  assertNotContains(App._getSuperPatchBiome.toString(), 'Math.random', 'Macro-region compatibility helper should not use Math.random');
  assertNotContains(App.exploreTile.toString(), 'Math.random', 'Landmark and structure first-discovery generation should not use Math.random');
  assertNotContains(App.spawnStructureEncounter.toString(), 'Math.random', 'Structure encounter generation should not use Math.random');
  assertNotContains(App._maybeSpawnStructureMerchant.toString(), 'Math.random', 'Structure merchant placement should not use Math.random');
  assertNotContains(App._maybeSpawnStructureQuestGiver.toString(), 'Math.random', 'Structure quest-giver placement should not use Math.random');
  assertNotContains(App._questTemplateForStructure.toString(), 'Math.random', 'Structure quest template selection should not use Math.random');
  assertNotContains(App.spawnWildEncounter.toString(), 'Math.random', 'Persistent wild encounter generation should not use Math.random');
  assertNotContains(App.spawnWildEncounter.toString(), 'Date.now', 'Persistent wild encounter ids should not use Date.now');
  assertNotContains(App.lootCorpse.toString(), 'Math.random', 'Persistent corpse loot generation should not use Math.random');
  assertNotContains(App.search.toString(), 'Math.random', 'Persistent search finds should not use Math.random');
  assertNotContains(App._lootItemNameFromTable.toString(), 'Math.random', 'Authored loot table selection should not use Math.random');
  assertNotContains(App._attemptTimidCreatureFlee.toString(), 'Math.random', 'Exploration timid threat reactions should not use Math.random');
  assertNotContains(App._reactCreatureToThreat.toString(), 'Math.random', 'Exploration threat reactions should not use Math.random');
  assertNotContains(App._attemptTimidAllyFlee.toString(), 'Math.random', 'Persistent combat timid ally flee should not use Math.random');
  assertNotContains(App._selectEnemyTarget.toString(), 'Math.random', 'Persistent combat target tie-breaks should not use Math.random');
  assertNotContains(App.enemyTurn.toString(), 'enemy.menacing && target.CPun / target.MPun < 0.4 && Math.random', 'Menacing fear status should not use raw Math.random');
  assertNotContains(App.attemptFlee.toString(), 'Math.random', 'Persistent combat flee outcome should not use Math.random');
  assertNotContains(App._skipTurnFromStatus.toString(), 'Math.random', 'Persistent combat status skip outcomes should not use Math.random');
  assertNotContains(App._processStatusEffects.toString(), 'spreadTarget && Math.random', 'Persistent combat status spread should not use raw Math.random');
  assertNotContains(App._terrainCausesMiss.toString(), 'Math.random', 'Persistent combat terrain miss should not use Math.random');
  assertNotContains(App._applyTerrainRoundEffects.toString(), 'Math.random', 'Persistent combat terrain round effects should not use Math.random');
  assertNotContains(App._calcInitiative.toString(), 'Math.random', 'Persistent combat initiative should not use Math.random');
  assertNotContains(App.allyTurn.toString(), 'ally.obedient && Math.random', 'Dumb AI obedience checks should not use raw Math.random');
  assertNotContains(App.allyTurn.toString(), 'enemies[Math.floor(Math.random()', 'Dumb AI target picks should not use raw Math.random');
  assertNotContains(App.allyTurn.toString(), 'ally.Fuck + ally.Flir + Math.random', 'Dumb AI charm rolls should not use raw Math.random');
  assertNotContains(App.allyTurn.toString(), 'if (Math.random() < targetDodge)', 'Ally dodge checks should not use raw Math.random');
  assertNotContains(App.enemyTurn.toString(), 'if (Math.random() < targetDodge)', 'Enemy dodge checks should not use raw Math.random');
  assertNotContains(App.executeActionAgainstTarget.toString(), 'Math.random', 'Persistent direct combat damage should not use Math.random');
  assertNotContains(App._resolveSyncAction.toString(), 'Math.random', 'Persistent synchronized combat damage should not use Math.random');
  assertNotContains(App.allyTurn.toString(), 'Math.random() * 6', 'Persistent ally combat damage should not use raw Math.random');
  assertNotContains(App.enemyTurn.toString(), 'Math.random() * 6', 'Persistent enemy combat damage should not use raw Math.random');
  assertNotContains(App.outsideActionOnTarget.toString(), 'Math.random', 'Persistent single exploration fight damage should not use Math.random');
  assertNotContains(App.outsideGroupActionOnTarget.toString(), 'Math.random', 'Persistent group exploration fight damage should not use Math.random');
  assertNotContains(App.outsideMutualGroupAction.toString(), 'Math.random', 'Persistent mutual exploration fight damage should not use Math.random');
  assertNotContains(App._enemyShouldFlee.toString(), 'Math.random', 'Persistent combat morale flee should not use Math.random');
  assertNotContains(App._enemyCallReinforcement.toString(), 'Math.random', 'Persistent combat reinforcement creation should not use Math.random');
  assertNotContains(App._enemyCallReinforcement.toString(), 'Date.now', 'Persistent combat reinforcement ids should not use Date.now');
  assertNotContains(App.buyFromMerchant.toString(), 'Date.now', 'Persistent merchant purchase item ids should not use Date.now');
  assertNotContains(App.sellToMerchant.toString(), 'Date.now', 'Persistent merchant sold-stock ids should not use Date.now');
  assertNotContains(App._normalizeQuest.toString(), 'Date.now', 'Persistent fallback quest ids should not use Date.now');
  assertNotContains(App._grantQuestReward.toString(), 'Date.now', 'Persistent quest reward item ids should not use Date.now');
});

test('Map tile inspector renders safe biome and terrain details', () => {
  const { App, elements } = loadAppForCombat();
  App.worldMeta = { worldId: 'world-info', seed: 'info-seed', generatorVersion: 2, mapModsHash: 'core' };
  App.worldMap = new Map();
  App.tileDeltas = new Map();
  App.exploredTiles = new Set();
  App.location = { x: 3, y: -2 };
  App.party = [makeUnit('You')];
  App.exploreTile(3, -2);
  App.renderMap();
  const html = elements.get('tile-info').innerHTML;
  assertContains(html, 'Current Tile', 'Tile inspector should render a safe current tile heading');
  assertContains(html, 'Biome', 'Tile inspector should include biome label');
  assertContains(html, '3, -2', 'Tile inspector should include coordinates');
  assertContains(html, 'Danger', 'Tile inspector should include danger pressure');
  assertContains(elements.get('mobile-tile-info').innerHTML, 'Current Tile', 'Mobile tile inspector should render the same safe summary');
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
  farTile.displayBiome = 'cave';
  farTile.overlays = { road: null, bridge: null, poi: null, structure: null };
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
  farTile.displayBiome = 'cave';
  farTile.overlays = { road: null, bridge: null, poi: null, structure: null };
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

test('Mobile combat toolbelt promotes enemy and party strips during targeting', () => {
  const { App, elements } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const enemy = makeUnit('Enemy', { id: 'enemy-mobile', disposition: App.DISPOSITION.ENEMY });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState = {
    active: true,
    round: 2,
    turnQueue: [{ unit: player, initiative: 10 }],
    currentTurn: 0,
    syncActions: [],
    processing: false
  };

  App.renderMobileCombatToolbelt();
  assertEqual(elements.get('mobile-play-surface').classList.contains('combat-active'), true, 'Mobile play surface should enter combat layout mode');
  assertContains(elements.get('mobile-combat-toolbelt').innerHTML, 'You to act', 'Mobile combat toolbelt should show current party actor');
  assertContains(elements.get('mobile-combat-toolbelt').innerHTML, 'Round 2', 'Mobile combat toolbelt should show round state');

  App.selectTarget('fight');
  assertContains(elements.get('mobile-combat-toolbelt').innerHTML, 'Targeting: Fight', 'Mobile combat toolbelt should show selected action');
  assertContains(elements.get('mobile-combat-toolbelt').innerHTML, 'Pick a target in the enemy strip', 'Mobile combat toolbelt should prompt target selection from strips');
  assertContains(elements.get('mobile-creature-strip').innerHTML, "executeActionOnTarget('fight','enemy-mobile')", 'Mobile enemy strip should expose combat target execution');

  App.combatState.active = false;
  App.renderMobileCombatToolbelt();
  assertEqual(elements.get('mobile-play-surface').classList.contains('combat-active'), false, 'Mobile play surface should leave combat layout mode after combat');
  assertEqual(elements.get('mobile-combat-toolbelt').innerHTML, '', 'Mobile combat toolbelt should clear after combat');
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

test('Combat initiative jitter is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'initiative-seed', generatorVersion: 2 };
    App.location = { x: -2, y: 5 };
    App.dayCount = 2;
    App.timeHour = 11;
    App.combatState = { active: true, round: 3, currentTurn: 0, turnQueue: [], syncActions: [] };
    const player = makeUnit('You', { id: 'initiative-player', spd: 12 });
    const enemy = makeUnit('Enemy', { id: 'initiative-enemy', disposition: App.DISPOSITION.ENEMY, spd: 12 });
    return [App._calcInitiative(player), App._calcInitiative(enemy)];
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Combat initiative should not depend on ambient Math.random');
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
  const ranged = makeUnit('Flyer', { id: 'flyer-1', Figh: 30, ranged: true, combatRow: 'back' });
  const target = makeUnit('Backline', { id: 'backline-flank', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 10, combatRow: 'back' });
  const controlTarget = makeUnit('Backline', { id: 'backline-flank', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 10, combatRow: 'back' });
  App.player = player;
  App.party = [player, flyer];
  App.creatures = [target];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'plains', explored: true, creatures: [target] }]]);
  App.combatState.active = true;
  App.nextTurn = function() {};
  App.executeActionAgainstTarget('fight', flyer, target);
  App.executeActionAgainstTarget('fight', ranged, controlTarget);
  assert(target.CPun < controlTarget.CPun, 'Flying flanking bonus should increase deterministic damage against back-row targets');
});

test('Combat fight damage is deterministic by seed and combat state', () => {
  function runDamage(seed) {
    const { App } = loadAppForCombat(() => 0.99);
    const player = makeUnit('You', { id: 'player-damage', Figh: 30 });
    const target = makeUnit('Target', { id: 'target-damage', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 10 });
    App.worldMeta = { worldId: `world-${seed}`, seed, generatorVersion: 2, mapModsHash: 'core' };
    App.player = player;
    App.party = [player];
    App.creatures = [target];
    App.location = { x: 4, y: -2 };
    App.combatState.active = true;
    App.combatState.round = 3;
    App.combatState.currentTurn = 1;
    App.dayCount = 2;
    App.timeHour = 21;
    App.nextTurn = function() {};
    App.executeActionAgainstTarget('fight', player, target);
    return target.CPun;
  }

  assertEqual(runDamage('damage-seed'), runDamage('damage-seed'), 'Same seed and combat state should produce the same fight damage');
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
  const { App } = loadAppForCombat(() => 0.99);
  App.worldMeta = { seed: 'cave-miss-1', generatorVersion: 2 };
  const player = makeUnit('You', { id: 'cave-attacker', Figh: 50 });
  const enemy = makeUnit('Cave Enemy', { id: 'cave-target', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'cave', explored: true, creatures: [enemy] }]]);
  App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: player, initiative: 10 }, { unit: enemy, initiative: 5 }], syncActions: [] };
  App.nextTurn = function() {};
  App.executeActionAgainstTarget('fight', player, enemy);
  assertEqual(enemy.CPun, 100, 'Cave darkness miss should prevent damage');
  assertContains(App.log[App.log.length - 1].text, 'miss', 'Cave miss should be logged as the action result');
});

test('Cave terrain miss outcome is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'cave-miss-1', generatorVersion: 2 };
    const player = makeUnit('You', { id: 'cave-attacker', Figh: 50 });
    const enemy = makeUnit('Cave Enemy', { id: 'cave-target', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
    App.player = player;
    App.party = [player];
    App.creatures = [enemy];
    App.location = { x: 0, y: 0 };
    App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'cave', explored: true, creatures: [enemy] }]]);
    App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: player, initiative: 10 }, { unit: enemy, initiative: 5 }], syncActions: [] };
    App.nextTurn = function() {};
    App.executeActionAgainstTarget('fight', player, enemy);
    return { enemyPun: enemy.CPun, lastLog: App.log[App.log.length - 1]?.text || '' };
  };

  assertEqual(JSON.stringify(buildCase(() => 0)), JSON.stringify(buildCase(() => 0.99)), 'Cave terrain miss should not depend on ambient Math.random');
});

test('Swamp terrain can stick grounded combatants for their turn', () => {
  const { App } = loadAppForCombat(() => 0.99);
  App.worldMeta = { seed: 'swamp-stuck-0', generatorVersion: 2 };
  const player = makeUnit('You', { id: 'swamp-unit' });
  App.player = player;
  App.party = [player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'swamp', explored: true, creatures: [] }]]);
  App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: player, initiative: 10 }], syncActions: [] };
  App._applyTerrainRoundEffects([player]);
  assert(player.status.stuck, 'Swamp should apply stuck status when hazard rolls');
  App.creatures = [makeUnit('Enemy', { disposition: App.DISPOSITION.ENEMY })];
  App.nextTurn = function() { this._stuckSkipped = true; };
  App.processTurn();
  assertEqual(App._stuckSkipped, true, 'Stuck unit should lose its turn');
});

test('Swamp terrain stuck outcome is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'swamp-stuck-0', generatorVersion: 2 };
    const player = makeUnit('You', { id: 'swamp-unit' });
    App.player = player;
    App.party = [player];
    App.location = { x: 0, y: 0 };
    App.worldMap = new Map([['0,0', { x: 0, y: 0, biome: 'swamp', explored: true, creatures: [] }]]);
    App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: player, initiative: 10 }], syncActions: [] };
    App._applyTerrainRoundEffects([player]);
    return Boolean(player.status.stuck);
  };

  assertEqual(buildCase(() => 0), buildCase(() => 0.99), 'Swamp terrain stuck should not depend on ambient Math.random');
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
  const ally = makeUnit('Ally', { aiOrder: 'defensive', expanded: true });
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
  let html = elements.get('party-content').innerHTML;
  assertContains(html, '[Leader]', 'Party leader badge should render');
  assertContains(html, 'showPartyMemberStats(1)', 'Party card should expose detailed stats');
  assertNotContains(html, 'setPartyLeader(1)', 'Default party card should keep leader management out of the compact action row');
  assertNotContains(html, 'dismissPartyMember(1)', 'Default party card should keep dismiss management out of the compact action row');
  assertContains(html, 'draggable="true"', 'Ally card should expose drag reorder affordance');
  assertContains(html, 'startPartyDrag(1)', 'Ally card should start drag reorder');
  assertContains(html, 'dropPartyMember(1)', 'Ally card should accept drag reorder drops');
  assertNotContains(html, 'setPartyRole(1,this.value)', 'Default party card should keep role management out of the compact action row');
  ally.expanded = true;
  App.renderParty();
  html = elements.get('party-content').innerHTML;
  assertContains(html, 'setPartyLeader(1)', 'Expanded party card should expose set leader action');
  assertContains(html, 'dismissPartyMember(1)', 'Expanded ally card should expose dismiss action');
  assertContains(html, 'setPartyRole(1,this.value)', 'Ally card should expose party role selector');
  assertContains(html, 'Party role for Ally', 'Party role selector should be labeled');
});

test('Desktop party card management labels localize', () => {
  const { App, elements, body } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1' });
  const allyA = makeUnit('Ally A', { id: 'ally-a' });
  const allyB = makeUnit('Ally B', { id: 'ally-b', aiOrder: 'defensive' });
  App.player = player;
  App.party = [player, allyA, allyB];
  App.partyLeaderId = 'player-1';
  App.updateLanguage('es');
  App.renderParty();
  let html = elements.get('party-content').innerHTML;
  assertContains(html, 'aria-label="Seleccionar Ally B para actuar"', 'Actor selection control should expose localized accessible label');
  assertContains(html, '>Actuar<', 'Actor selection visible label should localize');
  assertContains(html, 'aria-label="Marcar Ally B como objetivo"', 'Target mark control should expose localized accessible label');
  assertContains(html, '>Objetivo<', 'Target mark visible label should localize');
  assertContains(html, 'aria-label="Acciones del grupo: Ally B"', 'Party action menu should expose localized accessible label');
  assertContains(html, "oncontextmenu=\"event.preventDefault();event.stopPropagation();App.showRadialIntentMenu('party',2,'secondary-click')", 'Party card should support desktop secondary-click radial intent menu');
  assertNotContains(html, 'aria-label="Luchar Ally B"', 'Party card should not show primary action spam by default');
  assertContains(html, 'aria-label="Mostrar estadisticas de Ally B"', 'Stats control should expose localized accessible label');
  assertContains(html, '>Estadisticas<', 'Stats visible label should localize');
  assertNotContains(html, 'aria-label="Hacer lider a Ally B"', 'Compact party card should not expose leader management by default');
  assertNotContains(html, 'aria-label="Rol de grupo para Ally B"', 'Compact party card should not expose role selector by default');
  allyB.expanded = true;
  App.renderParty();
  html = elements.get('party-content').innerHTML;
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
  App.selectExplorationActor(1);
  App.showIntentMenu('party', 2);
  assertContains(body.innerHTML, 'aria-label="Luchar Ally B"', 'Party action menu should localize fight accessible label');
  assertContains(body.innerHTML, 'aria-label="Seducir Ally B"', 'Party action menu should localize pleasure accessible label');
  assertContains(body.innerHTML, 'aria-label="Inspeccionar Ally B"', 'Party action menu should localize inspect accessible label');
  assertContains(body.innerHTML, "App.openIntentSubActionSheet('party',2,'fight','sheet')", 'Party action menu should open sub-action sheet for registered primary actions');
  App.closeMobileContextMenu();
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
  assertNotContains(panelHtml, 'Tamano:', 'Expanded creature card should keep exact body stats in Stats/detail instead of the card body');
  assertNotContains(panelHtml, 'Apetito:', 'Expanded creature card should keep exact body stats in Stats/detail instead of the card body');
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

test('Enemy tasty target tie-break is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'tasty-target', generatorVersion: 2 };
    App.location = { x: 1, y: -2 };
    App.dayCount = 1;
    App.timeHour = 13;
    App.combatState = { active: true, round: 2, currentTurn: 1, turnQueue: [], syncActions: [] };
    const enemy = makeUnit('Enemy', { id: 'hungry-enemy', species: 'human', disposition: App.DISPOSITION.ENEMY });
    const player = makeUnit('You', { id: 'player-1', tasty: true, CPun: 100, MPun: 100 });
    const ally = makeUnit('Tasty Ally', { id: 'ally-1', tasty: true, CPun: 100, MPun: 100 });
    App.player = player;
    App.party = [player, ally];
    return App._unitSelectionId(App._selectEnemyTarget(enemy, App.party));
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(lowRandom, highRandom, 'Tasty target tie-break should not depend on ambient Math.random');
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
  App.updateLanguage('es');
  App.nextTurn = function() { this._passiveAdvanced = true; };
  App.allyTurn(ally);
  assertEqual(enemy.CPun, 100, 'Unwounded passive ally should not attack');
  assertEqual(App._passiveAdvanced, true, 'Passive ally should still advance turn flow');
  assertContains(App.log[App.log.length - 1].text, 'Passive Ally mantiene la posicion.', 'Passive ally hold log should localize');
});

test('Dumb ally arousal action is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'dumb-ally', generatorVersion: 2 };
    const player = makeUnit('You');
    const ally = makeUnit('Dumb Ally', {
      id: 'dumb-ally',
      dumbAI: true,
      obedient: true,
      CPle: 80,
      MPle: 100,
      Fuck: 60,
      Flir: 60
    });
    const enemies = [
      makeUnit('Enemy A', { id: 'enemy-a', disposition: App.DISPOSITION.ENEMY, CPle: 0, MPle: 100, wis: 1 }),
      makeUnit('Enemy B', { id: 'enemy-b', disposition: App.DISPOSITION.ENEMY, CPle: 0, MPle: 100, wis: 1 })
    ];
    App.player = player;
    App.party = [player, ally];
    App.creatures = enemies;
    App.location = { x: 4, y: -3 };
    App.dayCount = 1;
    App.timeHour = 17;
    App.combatState = { active: true, round: 2, currentTurn: 1, processing: false, xpEarned: 0, turnQueue: [{ unit: ally, initiative: 20 }], syncActions: [] };
    App.nextTurn = function() { this._dumbAllyAdvanced = true; };
    App.allyTurn(ally);
    return {
      enemyA: enemies[0].CPle,
      enemyB: enemies[1].CPle,
      advanced: !!App._dumbAllyAdvanced,
      log: App.log.map(entry => entry.text).join('|')
    };
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Dumb ally arousal branch should not depend on ambient Math.random');
  assert(lowRandom.enemyA > 0 || lowRandom.enemyB > 0, 'Dumb ally should apply pleasure to one enemy');
});

test('Ally target dodge is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'dodge-hit-0', generatorVersion: 2 };
    const player = makeUnit('You', { id: 'dodge-player' });
    const ally = makeUnit('Ally', { id: 'ally-dodge', Figh: 50, combatRow: 'front' });
    const target = makeUnit('Swimmer', { id: 'swim-target', disposition: App.DISPOSITION.ENEMY, CPun: 100, MPun: 100, swimming: true, combatRow: 'front' });
    App.player = player;
    App.party = [player, ally];
    App.creatures = [target];
    App.location = { x: 0, y: 0 };
    App.dayCount = 0;
    App.timeHour = 0;
    App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: ally, initiative: 10 }], syncActions: [] };
    App.nextTurn = function() { this._allyDodgeAdvanced = true; };
    App.allyTurn(ally);
    return { targetPun: target.CPun, advanced: !!App._allyDodgeAdvanced, log: App.log.map(entry => entry.text).join('|') };
  };

  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Ally dodge outcome should not depend on ambient Math.random');
  assertContains(lowRandom.log, 'dodges Ally', 'Seeded ally dodge fixture should exercise the dodge branch');
});

test('Scavenger AI order feasts on corpses after victory', () => {
  const { App } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { xp: 0, xpToNext: 100 });
  const scavenger = makeUnit('Scavenger', { aiOrder: 'scavenger', size: 6, appetite: 6, hunger: 60 });
  const corpse = makeUnit('Corpse', { disposition: App.DISPOSITION.CORPSE, CPun: 0, size: 2 });
  App.player = player;
  App.party = [player, scavenger];
  App.creatures = [corpse];
  App.updateLanguage('es');
  App.worldMap = new Map([['0,0', { creatures: [corpse] }]]);
  App.location = { x: 0, y: 0 };
  App.combatState = { xpEarned: 0, syncActions: [], turnQueue: [], currentTurn: 0 };
  App.endCombat(true);
  assertEqual(App.creatures.includes(corpse), false, 'Scavenger should remove a fitting corpse from the tile');
  assertEqual(scavenger.stomach.length, 1, 'Scavenger should store scavenged remains in stomach capacity');
  assertContains(App.log.map(entry => entry.text).join('\n'), 'Scavenger rebusca los restos de Corpse despues del combate.', 'Scavenger combat log should localize');
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
  App.worldMeta = { seed: 'enemy-flee', generatorVersion: 2 };
  const player = makeUnit('You');
  const ally = makeUnit('Ally');
  const enemy = makeUnit('Enemy', { id: 'flee-enemy', disposition: App.DISPOSITION.ENEMY, CPun: 40, MPun: 100 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [enemy];
  App.location = { x: 0, y: 0 };
  App.dayCount = 0;
  App.timeHour = 0;
  App.combatState = { active: true, round: 1, currentTurn: 0, turnQueue: [{ unit: enemy, initiative: 10 }], syncActions: [] };
  App.updateLanguage('es');
  App.nextTurn = function() { this._enemyFledAdvanced = true; };
  App.enemyTurn(enemy);
  assertEqual(enemy.disposition, App.DISPOSITION.NEUTRAL, 'Outnumbered wounded enemy should flee on morale roll');
  assertEqual(enemy.CPun, 0, 'Fleeing enemy should be removed from combat by HP gate');
  assertContains(App.log[App.log.length - 1].text, 'Enemy huye aterrorizado!', 'Enemy morale flee log should localize');
});

test('Enemy morale flee is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'enemy-flee', generatorVersion: 2 };
    const player = makeUnit('You');
    const ally = makeUnit('Ally');
    const enemy = makeUnit('Enemy', { id: 'flee-enemy', disposition: App.DISPOSITION.ENEMY, CPun: 40, MPun: 100 });
    App.player = player;
    App.party = [player, ally];
    App.creatures = [enemy];
    App.location = { x: 0, y: 0 };
    App.dayCount = 0;
    App.timeHour = 0;
    App.combatState = { active: true, round: 1, currentTurn: 0, turnQueue: [{ unit: enemy, initiative: 10 }], syncActions: [] };
    return App._enemyShouldFlee(enemy, [player, ally]);
  };
  assertEqual(buildCase(() => 0), buildCase(() => 0.99), 'Enemy morale flee should not depend on ambient Math.random');
});

test('Enemy target dodge is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'enemy-dodge-4', generatorVersion: 2 };
    const player = makeUnit('You', { id: 'swim-player', CPun: 100, MPun: 100, swimming: true, combatRow: 'front' });
    const enemy = makeUnit('Enemy', { id: 'enemy-dodge', disposition: App.DISPOSITION.ENEMY, Figh: 50, combatRow: 'front' });
    App.player = player;
    App.party = [player];
    App.creatures = [enemy];
    App.location = { x: 0, y: 0 };
    App.dayCount = 0;
    App.timeHour = 0;
    App.combatState = { active: true, round: 1, currentTurn: 0, processing: false, xpEarned: 0, turnQueue: [{ unit: enemy, initiative: 10 }], syncActions: [] };
    App._enemyShouldFlee = function() { return false; };
    App._enemyCallReinforcement = function() { return false; };
    App.nextTurn = function() { this._enemyDodgeAdvanced = true; };
    App.enemyTurn(enemy);
    return { playerPun: player.CPun, advanced: !!App._enemyDodgeAdvanced, log: App.log.map(entry => entry.text).join('|') };
  };

  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Enemy dodge outcome should not depend on ambient Math.random');
  assertContains(lowRandom.log, 'dodges Enemy', 'Seeded enemy dodge fixture should exercise the dodge branch');
});

test('Menacing enemy fear is deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'enemy-fear', generatorVersion: 2 };
    const player = makeUnit('You', { id: 'player-1', CPun: 30, MPun: 100 });
    const enemy = makeUnit('Enemy', { id: 'scary-enemy', disposition: App.DISPOSITION.ENEMY, menacing: true, Figh: 1 });
    App.player = player;
    App.party = [player];
    App.creatures = [enemy];
    App.location = { x: 0, y: 0 };
    App.dayCount = 0;
    App.timeHour = 0;
    App.combatState = { active: true, round: 1, currentTurn: 0, turnQueue: [{ unit: enemy, initiative: 10 }], syncActions: [] };
    App._enemyShouldFlee = function() { return false; };
    App._enemyCallReinforcement = function() { return false; };
    App.nextTurn = function() { this._enemyTurnAdvanced = true; };
    App.enemyTurn(enemy);
    return { frightened: !!player.status.frightened, advanced: !!App._enemyTurnAdvanced };
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Menacing fear status should not depend on ambient Math.random');
});

test('Pack enemies can call reinforcements when wounded', () => {
  const { App } = loadAppForCombat(() => 0);
  App.worldMeta = { seed: 'call-seed', generatorVersion: 2 };
  const wolf = makeUnit('Wolf', { id: 'pack-wolf', species: 'wolf', disposition: App.DISPOSITION.ENEMY, CPun: 40, MPun: 100 });
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [wolf];
  App.location = { x: 0, y: 0 };
  App.dayCount = 0;
  App.timeHour = 0;
  App.combatState = { active: true, round: 1, currentTurn: 0, turnQueue: [{ unit: wolf, initiative: 10 }], syncActions: [] };
  App.updateLanguage('es');
  const called = App._enemyCallReinforcement(wolf);
  assertEqual(called, true, 'Wounded pack enemy should call reinforcement on successful roll');
  assert(App.creatures.some(c => c !== wolf && c.species === 'wolf'), 'Reinforcement should be added to creatures');
  assertEqual(App.combatState.turnQueue.length, 2, 'Reinforcement should be inserted into turn queue');
  assertContains(App.log[App.log.length - 1].text, 'Wolf pide ayuda!', 'Reinforcement call log should localize');
  assertContains(App.log[App.log.length - 1].text, 'se une al combate.', 'Reinforcement join log should localize');
});

test('Pack reinforcement calls are deterministic by combat state', () => {
  const buildCase = random => {
    const { App } = loadAppForCombat(random);
    App.worldMeta = { seed: 'call-seed', generatorVersion: 2 };
    const wolf = makeUnit('Wolf', { id: 'pack-wolf', species: 'wolf', disposition: App.DISPOSITION.ENEMY, CPun: 40, MPun: 100 });
    App.player = makeUnit('You');
    App.party = [App.player];
    App.creatures = [wolf];
    App.location = { x: 0, y: 0 };
    App.dayCount = 0;
    App.timeHour = 0;
    App.combatState = { active: true, round: 1, currentTurn: 0, turnQueue: [{ unit: wolf, initiative: 10 }], syncActions: [] };
    const called = App._enemyCallReinforcement(wolf);
    const reinforcement = App.creatures.find(c => c !== wolf && c.species === 'wolf');
    return { called, id: reinforcement?.id || '', queueLength: App.combatState.turnQueue.length };
  };
  const lowRandom = buildCase(() => 0);
  const highRandom = buildCase(() => 0.99);
  assertEqual(JSON.stringify(lowRandom), JSON.stringify(highRandom), 'Reinforcement outcome and id should not depend on ambient Math.random');
});

test('Enemy status combat logs localize', () => {
  const { App } = loadAppForCombat(() => 0.9);
  const enemy = makeUnit('Enemy', {
    disposition: App.DISPOSITION.ENEMY,
    poisonous: true,
    constrictor: true,
    enveloped: true,
    Figh: 20,
    CPun: 100,
    MPun: 100
  });
  const player = makeUnit('You', { CPun: 100, MPun: 100, size: 2, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.combatState = { active: true, turnQueue: [{ unit: enemy }], currentTurn: 0, syncActions: [] };
  App.nextTurn = function() { this._enemyStatusAdvanced = true; };
  App.updateLanguage('es');
  App.enemyTurn(enemy);
  const logs = App.log.map(entry => entry.text).join('\n');
  assertContains(logs, 'You queda envenenado!', 'Poison status log should localize');
  assertContains(logs, 'Enemy constrine a You! Queda inmovilizado.', 'Constrict status log should localize');
  assertContains(logs, 'Enemy envuelve a You!', 'Envelop status log should localize');
  assertEqual(App._enemyStatusAdvanced, true, 'Enemy status turn should still advance');
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
  assertContains(elements.get('enemies-content').innerHTML, "previewQuestFromUnit('guide-1')", 'Quest giver card should preview before accepting');
  App.previewQuestFromUnit('guide-1');
  assertEqual(App.quests.length, 0, 'Quest preview should not immediately accept the quest');
  assertContains(elements.get('scene-description').innerHTML, 'Quest Preview: Guide Task', 'Quest preview should show the quest title before acceptance');
  assertContains(elements.get('scene-description').innerHTML, 'Objectives', 'Quest preview should show objectives');
  assertContains(elements.get('scene-description').innerHTML, '10 XP', 'Quest preview should show XP reward');
  assertContains(elements.get('scene-description').innerHTML, '5 gold', 'Quest preview should show gold reward');
  assertContains(elements.get('scene-description').innerHTML, 'Old Coin', 'Quest preview should show item reward');
  assertContains(elements.get('scene-description').innerHTML, "acceptQuestFromUnit('guide-1')", 'Quest preview should include explicit accept');
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
  assertEqual(App.inventory[0].id, 'quest_item_wolf-hunt_old-coin_0', 'Quest reward item id should be stable without timestamp entropy');
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
  assertEqual(App.inventory[0].id, 'quest_item_deferred-wolf-hunt_old-coin_0', 'Deferred quest reward item id should be stable without timestamp entropy');
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
  App.worldMeta = { seed: 'b', generatorVersion: 2 };
  App.player = makeUnit('You');
  App.party = [App.player];
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map([['0,0', { biome: 'forest', explored: true, description: 'quiet' }]]);
  App.ITEMS = { 'Healing Herb': App.ITEMS['Healing Herb'] };
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
  App.showQuestLog();
  html = elements.get('scene-description').innerHTML;
  assertContains(html, 'Actual punto de ruta 2: Safe Camp en 6, 0, 6 pasos 6 este', 'Route preview aria text should localize');
  assertContains(html, '6 pasos 6 este', 'Route guidance should localize after language change');
  assertContains(html, '[Activa]', 'Quest status badge should localize');
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
  App.updateLanguage('es');
  App.showQuestLog();
  assertContains(elements.get('scene-description').innerHTML, 'la ruta conocida cruza 2 camino, 1 puente; 1 terreno dificil', 'Quest terrain guidance should localize');
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
  assert(App.inventory.some(item => item.id === 'buy_trader-1_healing-herb_1'), 'Bought item id should be stable without timestamp entropy');
  assertEqual(merchant.stock[0].qty, 0, 'Buying should reduce stock quantity');
  assertEqual(App.log[App.log.length - 1].text, 'Bought Healing Herb for 10 gold.', 'Buying should log localized purchase feedback');
  App.sellToMerchant('trader-1', 'gem-1');
  assertEqual(App.player.gold, 55, 'Selling should grant half item value');
  assert(!App.inventory.some(item => item.id === 'gem-1'), 'Selling should remove item from inventory');
  assert(merchant.stock.some(item => item.name === 'Shiny Gem'), 'Sold item should enter merchant stock');
  assert(merchant.stock.some(item => item.id === 'sold_trader-1_shiny-gem_1'), 'Sold stock id should be stable without timestamp entropy');
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

test('Default merchant restock quantities are deterministic by world seed and merchant identity', () => {
  const lowRandom = loadAppForCombat(() => 0);
  const highRandom = loadAppForCombat(() => 0.99);
  lowRandom.App.worldMeta = { seed: 'merchant-seed', generatorVersion: 7 };
  highRandom.App.worldMeta = { seed: 'merchant-seed', generatorVersion: 7 };
  lowRandom.App.dayCount = 6;
  highRandom.App.dayCount = 6;
  const lowMerchant = makeUnit('Road Trader', {
    id: 'road-trader-1',
    disposition: lowRandom.App.DISPOSITION.MERCHANT,
    stock: [],
    stockLastRefreshDay: 0
  });
  const highMerchant = makeUnit('Road Trader', {
    id: 'road-trader-1',
    disposition: highRandom.App.DISPOSITION.MERCHANT,
    stock: [],
    stockLastRefreshDay: 0
  });
  lowRandom.App._refreshMerchantStock(lowMerchant, true);
  highRandom.App._refreshMerchantStock(highMerchant, true);
  assertEqual(JSON.stringify(lowMerchant.stock), JSON.stringify(highMerchant.stock), 'Default restock should not depend on ambient Math.random');
  assertNotContains(lowRandom.App._defaultMerchantStock.toString(), 'Math.random', 'Default merchant stock should not use raw Math.random');
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
  App.STRUCTURES.camp.merchant.chance = 1;
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
  App.STRUCTURES.shrine.quest.chance = 1;
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
  assertContains(cardHtml, 'unit-bars', 'Player card should render compact tactical bars');
  assertContains(cardHtml, 'unit-bar-health', 'Player card should render health bar');
  assertContains(cardHtml, 'unit-bar-pleasure', 'Player card should render pleasure bar');
  assertContains(cardHtml, 'unit-bar-hunger', 'Player card should render hunger bar');
  assertContains(cardHtml, 'aria-label="Punishment: 75%"', 'Player card health bar should use live top-level vitals');
  assertContains(cardHtml, 'aria-label="Pleasure: 42%"', 'Player card pleasure bar should use live top-level vitals');
  assertContains(cardHtml, 'aria-label="Hunger: 0%"', 'Player card hunger bar should safely default when hunger is missing');
  assertNotContains(cardHtml, 'Pun:90/120 Ple:55/130', 'Default card should not render dense live top-level vitals');
  assertNotContains(cardHtml, 'Figh:</span> 21', 'Expanded card should keep exact combat stats in Stats/detail instead of the card body');
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
  assertContains(cardHtml, 'aria-label="Punishment: 67%"', 'Party card should render the live party player stats as a tactical bar');
  assertNotContains(cardHtml, 'Pun:80/120', 'Default party card should not render dense live party player stats');
  assertContains(statsHtml, '80/120', 'Character stats should render the same live punishment value');
  assertContains(statsHtml, 'Figh: 30', 'Character stats should render the same live combat value');
  assertContains(statsHtml, 'STR: 16', 'Character stats should render the same live attribute value');
  assertNotContains(statsHtml, '5/100', 'Character stats should not render stale duplicate player vitals');
});

test('Unit cards and mobile chips render compact tactical bars accessibly', () => {
  const { App } = loadAppForCombat();
  const player = makeUnit('You', { id: 'player-1', CPun: 80, MPun: 100, CPle: 25, MPle: 100, hunger: 45, maxHunger: 90 });
  const ally = makeUnit('Ally', { id: 'ally-1', CPun: 999, MPun: 100, CPle: -5, MPle: 100 });
  const creature = makeUnit('Fox', { id: 'fox-1', disposition: App.DISPOSITION.FRIENDLY, CPun: 30, MPun: 60, CPle: 20, MPle: 80, hunger: 200, maxHunger: 100 });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [creature];

  const partyCard = App.renderUnitCard(player, 0, 'party');
  const allyCard = App.renderUnitCard(ally, 1, 'party');
  const creatureCard = App.renderUnitCard(creature, 0, 'creature');
  const mobilePartyChip = App.renderMobileUnitChip(player, 0, 'party');
  const mobileCreatureChip = App.renderMobileUnitChip(creature, 0, 'creature');

  assertEqual(App._unitBarPercent(999, 100), 100, 'Bar percent should clamp overfilled values');
  assertEqual(App._unitBarPercent(-5, 100), 0, 'Bar percent should clamp negative values');
  assertEqual(App._unitBarPercent(10, 0), 0, 'Bar percent should handle zero max values');
  assertContains(partyCard, 'aria-label="Punishment: 80%"', 'Party card should expose health bar label');
  assertContains(partyCard, 'aria-label="Pleasure: 25%"', 'Party card should expose pleasure bar label');
  assertContains(partyCard, 'aria-label="Hunger: 50%"', 'Party card should expose hunger bar label');
  assertContains(allyCard, 'aria-label="Hunger: 0%"', 'Missing hunger should default safely');
  assertContains(creatureCard, 'aria-label="Hunger: 100%"', 'Hunger bar should clamp overfilled values');
  assertContains(partyCard, 'showPartyMemberStats(0)', 'Stats action should remain available from party card');
  assertContains(partyCard, 'role="button" tabindex="0"', 'Desktop unit cards should be keyboard focusable');
  assertContains(partyCard, "event.key==='Enter'||event.key===' '", 'Desktop unit cards should activate with Enter or Space');
  assertContains(partyCard, 'selectExplorationActor(0)', 'Act action should remain available from party card');
  assertContains(partyCard, "toggleExplorationTarget('party'", 'Target action should remain available from party card');
  assertContains(partyCard, 'aria-haspopup="dialog" aria-controls="desktop-intent-menu" onclick="event.stopPropagation();App.showIntentMenu(\'party\',0,\'desktop\')', 'Party action menu button should advertise and target its dialog popup');
  assertContains(creatureCard, "toggleExplorationTarget('creature'", 'Target action should remain available from creature card');
  assertContains(creatureCard, "outsideActionForCreature('inspect'", 'Creature inspect action should remain available from creature card');
  assertContains(creatureCard, "showIntentMenu('creature','fox-1','desktop')", 'Existing creature actions should move behind the card action menu');
  assertContains(creatureCard, 'aria-haspopup="dialog" aria-controls="desktop-intent-menu" onclick="event.stopPropagation();App.showIntentMenu(\'creature\',\'fox-1\',\'desktop\')', 'Creature action menu button should advertise and target its dialog popup');
  assertNotContains(creatureCard, "outsideActionForCreature('fight'", 'Default creature card should not show primary action spam');
  assertContains(mobilePartyChip, 'unit-bars compact', 'Mobile party chip should reuse compact tactical bars');
  assertContains(mobilePartyChip, 'role="button" tabindex="0"', 'Mobile unit chips should be keyboard focusable');
  assertContains(mobilePartyChip, "event.key==='Enter'||event.key===' '", 'Mobile unit chips should activate with Enter or Space');
  assertContains(mobileCreatureChip, 'unit-bars compact', 'Mobile creature chip should reuse compact tactical bars');
  assertContains(mobilePartyChip, 'aria-label="Hunger: 50%"', 'Mobile party chip should expose hunger bar label');
  assertContains(mobilePartyChip, 'aria-haspopup="dialog" aria-controls="mobile-context-menu" onclick="event.stopPropagation();App.showIntentMenu(\'party\',0)', 'Mobile party action menu button should advertise and target its dialog popup');
  assertContains(mobileCreatureChip, 'aria-haspopup="dialog" aria-controls="mobile-context-menu" onclick="event.stopPropagation();App.showIntentMenu(\'creature\',\'fox-1\')', 'Mobile creature action menu button should advertise and target its dialog popup');
  assertContains(mobilePartyChip, "oncontextmenu=\"event.preventDefault();event.stopPropagation();App.showRadialIntentMenu('party',0,'secondary-click')", 'Mobile party chip should keep secondary-click radial intent fallback');
  assertContains(mobileCreatureChip, "oncontextmenu=\"event.preventDefault();event.stopPropagation();App.showRadialIntentMenu('creature','fox-1','secondary-click')", 'Mobile creature chip should keep secondary-click radial intent fallback');
  assertNotContains(mobilePartyChip, '| 80/100', 'Mobile chip should avoid old dense numeric vital text');
});

test('Unit cards and mobile chips render capped localized trait chips', () => {
  const { App } = loadAppForCombat();
  const player = makeUnit('You', { id: 'player-1' });
  const ally = makeUnit('Guard Ally', {
    id: 'guard-1',
    partyRole: 'guard',
    CPun: 20,
    MPun: 100,
    hunger: 80,
    maxHunger: 100,
    status: {
      sleep: { turns: 1 },
      poisoned: { turns: 2, dmg: 1 },
      burn: { turns: 1, dmg: 2 }
    },
    flying: true,
    darkvision: true
  });
  const creature = makeUnit('Quest Bat', {
    id: 'bat-1',
    disposition: App.DISPOSITION.FRIENDLY,
    quest: { id: 'q1' },
    CPun: 20,
    MPun: 100,
    hunger: 90,
    maxHunger: 100,
    flying: true,
    darkvision: true
  });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [creature];

  const allyTraits = App._unitVisibleTraits(ally, 'party');
  assertEqual(allyTraits.length, 3, 'Default visible traits should cap at three chips');
  assertEqual(allyTraits.map(chip => chip.key).join(','), 'asleep,poisoned,burning', 'Trait cap should preserve high-priority status order');

  const allyCard = App.renderUnitCard(ally, 1, 'party');
  const creatureCard = App.renderUnitCard(creature, 0, 'creature');
  const mobileCreatureChip = App.renderMobileUnitChip(creature, 0, 'creature');
  assertContains(allyCard, 'class="unit-traits"', 'Party card should render trait chip container');
  assertContains(allyCard, 'aria-label="Unit traits"', 'Trait chips should have an accessible label');
  assertContains(allyCard, 'Asleep', 'Party card should render localized status trait chips');
  assertContains(allyCard, 'Poison', 'Party card should render localized danger trait chips');
  assertContains(allyCard, 'Burning', 'Party card should render capped third trait');
  assertNotContains(allyCard, 'Guard</span>', 'Lower-priority role chip should be hidden once cap is reached');
  assertContains(creatureCard, 'Wounded', 'Creature card should expose wounded state as a trait chip');
  assertContains(creatureCard, 'Hungry', 'Creature card should expose hunger pressure as a trait chip');
  assertContains(creatureCard, 'Quest', 'Creature card should expose contextual quest state as a trait chip');
  assertContains(mobileCreatureChip, 'unit-trait-chip', 'Mobile unit chip should reuse trait chip rendering');

  App.updateLanguage('es');
  const localizedAllyCard = App.renderUnitCard(ally, 1, 'party');
  assertContains(localizedAllyCard, 'aria-label="Rasgos de unidad"', 'Trait chip label should localize');
  assertContains(localizedAllyCard, 'Dormido', 'Trait chip text should localize');
  assertContains(localizedAllyCard, 'Veneno', 'Danger trait chip text should localize');
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
  App.updateLanguage('es');
  App.showCharacterStats();
  App.closeSceneDetails();
  assertEqual(App.combatState.active, true, 'Closing enemy-turn stats should keep combat mode active');
  assertContains(elements.get('scene-title').textContent, "Round 2 - Enemy's turn", 'Closing enemy-turn stats should restore enemy turn title');
  assertContains(elements.get('scene-description').innerHTML, 'Enemy esta actuando...', 'Closing enemy-turn stats should localize enemy acting status');
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
  assertEqual(App.player.xpToNext, 150, 'Level XP threshold should use the configured curve multiplier');
  assertEqual(App.player.MPun, 110, 'Level-up punishment gain should use balance config');
  assertEqual(App.player.MPle, 105, 'Level-up pleasure gain should use balance config');
  assertEqual(App.player.Figh, 11, 'Level-up stat gain should use balance config');
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
  assertContains(template, 'id="log-toggle-collapse"', 'Log should expose minimize control');
  assertContains(template, 'id="log-toggle-expand"', 'Log should expose expand control');
  assertContains(template, 'id="log-collapsed-summary"', 'Collapsed log should expose latest-entry summary');
  assertContains(template, 'App.exportLog()', 'Log should expose export action');
  assertContains(appContent, 'yaw-log-view', 'Log view preferences should persist separately');
  assertContains(appContent, 'loadLogViewPreferences()', 'Log view preferences should load during init');
  assertContains(appContent, 'LOG_CATEGORIES:', 'Log category registry should exist');
  assertContains(template, '.log-category', 'Log category badge style should exist');
  assertContains(template, '#app.log-collapsed', 'Log collapsed layout style should exist');
  assertContains(template, '#app.log-expanded', 'Log expanded layout style should exist');
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
  assertEqual(saved.collapsed, false, 'Default collapsed state should persist');
  assertEqual(saved.expanded, false, 'Default expanded state should persist');
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

test('Combat log expand and minimize states persist and stay exclusive', () => {
  const { App, elements, storage } = loadAppForCombat();
  App.log = [{ text: 'Latest field event', type: 'discovery' }];
  App.renderLog();
  const root = elements.get('app');
  const collapseBtn = elements.get('log-toggle-collapse');
  const expandBtn = elements.get('log-toggle-expand');
  App.toggleLogCollapsed();
  assertEqual(App.logCollapsed, true, 'Log should enter collapsed state');
  assertEqual(App.logExpanded, false, 'Collapsed log should clear expanded state');
  assertEqual(root.classList.contains('log-collapsed'), true, 'Collapsed log should apply root class');
  assertEqual(root.classList.contains('log-expanded'), false, 'Collapsed log should remove expanded class');
  assertEqual(collapseBtn.getAttribute('aria-pressed'), 'true', 'Collapsed control should expose pressed state');
  assertEqual(elements.get('log-collapsed-summary').textContent, 'Latest field event', 'Collapsed summary should show latest log entry');
  let saved = JSON.parse(storage.get('yaw-log-view'));
  assertEqual(saved.collapsed, true, 'Collapsed state should persist');
  assertEqual(saved.expanded, false, 'Collapsed state should persist as exclusive');
  App.toggleLogExpanded();
  assertEqual(App.logCollapsed, false, 'Expanded log should clear collapsed state');
  assertEqual(App.logExpanded, true, 'Log should enter expanded state');
  assertEqual(root.classList.contains('log-collapsed'), false, 'Expanded log should remove collapsed class');
  assertEqual(root.classList.contains('log-expanded'), true, 'Expanded log should apply root class');
  assertEqual(expandBtn.getAttribute('aria-pressed'), 'true', 'Expanded control should expose pressed state');
  saved = JSON.parse(storage.get('yaw-log-view'));
  assertEqual(saved.collapsed, false, 'Expanded state should persist as exclusive');
  assertEqual(saved.expanded, true, 'Expanded state should persist');
  App.toggleLogExpanded();
  assertEqual(App.logExpanded, false, 'Expanded toggle should restore normal layout');
  assertEqual(root.classList.contains('log-expanded'), false, 'Restored log should remove expanded class');
});

test('Combat log renders relative timestamps and status role', () => {
  const { App, elements } = loadAppForCombat();
  App.updateLanguage('es');
  App.log = [];
  App.renderLog();
  assertEqual(elements.get('mobile-log-summary').textContent, 'Bienvenido a You Are Wild', 'Mobile log fallback should localize when no entries exist');
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

test('Mobile context menus dismiss on outside pointer only', () => {
  const { App, body, elements, document } = loadAppForCombat();
  const opener = makeElement();
  document.activeElement = opener;
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [makeUnit('Friendly', { id: 'friendly-outside', disposition: App.DISPOSITION.FRIENDLY })];
  App.showIntentMenu('creature', 'friendly-outside');
  assertContains(body.innerHTML, 'aria-labelledby="mobile-context-menu-title"', 'Mobile context dialog should reference its visible title');
  assertContains(body.innerHTML, 'id="mobile-context-menu-title"', 'Mobile context dialog title should be addressable');
  const menu = elements.get('mobile-context-menu');
  menu.removed = undefined;
  const inside = makeElement();
  inside.parentNode = menu;
  assert(App._mobileContextOutsideHandler, 'Mobile context menu should register outside pointer dismissal');
  App._mobileContextOutsideHandler({ target: inside });
  assertEqual(menu.removed, undefined, 'Pointer inside the menu should not dismiss it');
  App._mobileContextOutsideHandler({ target: makeElement() });
  assertEqual(menu.removed, true, 'Pointer outside the menu should dismiss it');
  assertEqual(App._mobileContextOutsideHandler, null, 'Closing the menu should clear outside pointer dismissal');
  assertEqual(opener.focused, true, 'Outside dismissal should restore focus to the opener');
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

test('Tutorial steps localize through active language', () => {
  const { App, elements } = loadAppForCombat();
  App.updateLanguage('es');
  App.showTutorial();
  assertEqual(elements.get('tutorial-overlay').style.display, 'flex', 'Tutorial overlay should open');
  assertEqual(elements.get('tutorial-title').textContent, 'Bienvenida', 'First tutorial title should localize');
  assertContains(elements.get('tutorial-content').textContent, 'Eres salvaje', 'First tutorial content should localize');
  App.nextTutorial();
  assertEqual(elements.get('tutorial-title').textContent, 'Combate', 'Second tutorial title should localize');
  assertContains(elements.get('tutorial-content').textContent, 'acciones sincronizadas', 'Second tutorial content should localize');
});

test('Save manager renders localized accessible slot actions', () => {
  const { App, elements, storage } = loadAppForCombat();
  storage.set('yaw-save-time-slot1', '1710000000000');
  App.updateLanguage('es');
  App.renderSaveManager('load');
  const html = elements.get('save-manager').innerHTML;
  assertEqual(elements.get('save-manager').getAttribute('aria-label'), 'Cargar partida', 'Save manager dialog label should localize in load mode');
  assertContains(html, 'Cargar partida', 'Save manager title should localize in load mode');
  assertContains(html, 'Nueva partida', 'New game entry should localize');
  assertContains(html, 'Partida guardada', 'Occupied slot badge should localize');
  assertContains(html, 'Slot abierto', 'Empty slot badge should localize');
  assertContains(html, 'Slot guardado: carga, inicia una nueva partida o borra solo este slot.', 'Occupied load-mode slot hint should localize');
  assertContains(html, 'Slot vacio: inicia una partida nueva aqui.', 'Empty load-mode slot hint should localize');
  assertContains(html, 'aria-label="Acciones disponibles del slot"', 'Slot action summary should expose localized accessible label');
  assertContains(html, 'Acciones: Cargar, Nueva partida, Borrar', 'Occupied load-mode action summary should localize');
  assertContains(html, 'Acciones: Nueva partida', 'Empty load-mode action summary should localize');
  assertContains(html, 'aria-label="Iniciar una nueva partida en Slot 1"', 'New run action should expose localized accessible label');
  assertContains(html, 'aria-label="Cargar Slot 1"', 'Load action should expose localized accessible label');
  assertContains(html, 'aria-label="Borrar Slot 1"', 'Delete action should expose localized accessible label');
  assertContains(html, 'aria-label="Iniciar partida nueva en Slot 2"', 'Empty slot new-game action should expose localized accessible label');
  assertNotContains(html, 'Guardar partida actual en Slot 1', 'Load mode should not include save actions');
  App.renderSaveManager('save');
  const saveHtml = elements.get('save-manager').innerHTML;
  assertEqual(elements.get('save-manager').getAttribute('aria-label'), 'Guardar partida', 'Save manager dialog label should localize in save mode');
  assertContains(saveHtml, 'Slot ocupado: guardar aqui puede requerir confirmacion para sobrescribir.', 'Occupied save-mode slot hint should localize');
  assertContains(saveHtml, 'Slot vacio: guarda la partida actual aqui.', 'Empty save-mode slot hint should localize');
  assertContains(saveHtml, 'Acciones: Guardar, Borrar', 'Occupied save-mode action summary should localize');
  assertContains(saveHtml, 'Acciones: Guardar', 'Empty save-mode action summary should localize');
  assertContains(saveHtml, 'aria-label="Guardar partida actual en Slot 1"', 'Save mode should expose localized save action labels');
  assertNotContains(saveHtml, 'aria-label="Cargar Slot 1"', 'Save mode should not include load actions');
  App.renderSaveManager('new');
  const newHtml = elements.get('save-manager').innerHTML;
  assertEqual(elements.get('save-manager').getAttribute('aria-label'), 'Elegir slot de partida nueva', 'Save manager dialog label should describe new-game mode');
  assertContains(newHtml, 'Slot ocupado: sobrescribir requiere confirmacion.', 'Occupied new-mode slot hint should warn about confirmation');
  assertContains(newHtml, 'Slot vacio: listo para una nueva partida.', 'Empty new-mode slot hint should describe direct new-run use');
  assertContains(newHtml, 'Acciones: Sobrescribir, Borrar', 'Occupied new-mode action summary should localize');
  assertContains(newHtml, 'Acciones: Usar slot vacio', 'Empty new-mode action summary should localize');
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

  const Binary = loadBinaryForTest();
  const recovery = loadAppForCombat(() => 0.5, { binary: Binary });
  recovery.App.updateLanguage('es');
  const fallen = makeSerializableUnit('Tester', { CPun: 0, MPun: 100 });
  const recoverySave = Binary.saveGame({
    player: fallen,
    party: [fallen],
    location: { x: 0, y: 0 },
    currentBiome: 'forest',
    log: [],
    worldMap: new Map(),
    exploredTiles: new Set()
  });
  recovery.App._dbGet = async () => recoverySave;
  recovery.App.loadWorldStateFromMapStore = async () => {};
  const recovered = await recovery.App.loadFromSlot('slot1');
  assertEqual(recovered, true, 'Softcore load recovery should continue loading');
  assertEqual(recovery.App.player.CPun, 1, 'Loaded fallen player should be revived to one punishment point');
  assertContains(recovery.App.log[recovery.App.log.length - 1].text, 'Te recuperaste al borde de la derrota. Bienvenido de vuelta, Tester.', 'Load recovery log should localize');
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
  const { App, body } = loadAppForCombat();
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
  assertContains(partyHtml, 'aria-label="Acciones del grupo: Ally"', 'Mobile party action menu button should localize accessible label');
  assertContains(partyHtml, 'aria-label="Mostrar estadisticas de Ally"', 'Mobile party stats button should localize accessible label');
  assertContains(partyHtml, '>Actuar<', 'Mobile party actor button text should localize');
  assertContains(partyHtml, '>Objetivo<', 'Mobile party target button text should localize');
  const creatureHtml = App.renderMobileUnitChip(friendly, 0, 'creature');
  assertContains(creatureHtml, 'Amistoso', 'Mobile creature disposition should localize');
  assertContains(creatureHtml, 'aria-label="Castigo: 100%"', 'Mobile creature health bar should localize accessible label');
  assertContains(creatureHtml, 'aria-label="Marcar Friendly como objetivo"', 'Mobile creature target button should localize accessible label');
  assertContains(creatureHtml, 'aria-label="Inspeccionar Friendly"', 'Mobile inspect icon should expose localized accessible label');
  assertContains(creatureHtml, 'aria-label="Acciones de criatura: Friendly"', 'Mobile creature action menu button should localize accessible label');
  assertNotContains(creatureHtml, 'aria-label="Luchar Friendly"', 'Mobile creature chip should not show primary action spam by default');
  assertContains(creatureHtml, 'aria-label="Reclutar Friendly"', 'Mobile recruit icon should expose localized accessible label');
  assertContains(creatureHtml, 'aria-label="Aceptar mision Friendly"', 'Mobile quest icon should expose localized accessible label');
  App.showIntentMenu('creature', 'friendly-1');
  assertContains(body.innerHTML, 'aria-label="Luchar Friendly"', 'Mobile intent menu should localize fight accessible label');
  assertContains(body.innerHTML, 'aria-label="Seducir Friendly"', 'Mobile intent menu should localize pleasure accessible label');
  App.closeMobileContextMenu();
  const merchantHtml = App.renderMobileUnitChip(merchant, 1, 'creature');
  assertContains(merchantHtml, 'Mercader', 'Mobile merchant disposition should localize');
  assertContains(merchantHtml, 'aria-label="Comerciar Merchant"', 'Mobile trade icon should expose localized accessible label');
});

test('Desktop intent menu uses a bounded desktop surface', () => {
  const { App, body } = loadAppForCombat();
  const player = makeUnit('You', { id: 'player-1', Figh: 40 });
  const ally = makeUnit('Ally', { id: 'ally-desktop' });
  const friendly = makeUnit('Friendly', { id: 'friendly-desktop', disposition: App.DISPOSITION.FRIENDLY, CPle: 95, willing: true });
  App.player = player;
  App.party = [player, ally];
  App.creatures = [friendly];

  const partyHtml = App.renderUnitCard(ally, 1, 'party');
  assertContains(partyHtml, 'aria-controls="desktop-intent-menu"', 'Desktop party card should target the desktop intent surface');
  assertContains(partyHtml, "App.showIntentMenu('party',1,'desktop')", 'Desktop party card should request the desktop intent source');
  const creatureHtml = App.renderUnitCard(friendly, 0, 'creature');
  assertContains(creatureHtml, 'aria-controls="desktop-intent-menu"', 'Desktop creature card should target the desktop intent surface');
  assertContains(creatureHtml, "App.showIntentMenu('creature','friendly-desktop','desktop')", 'Desktop creature card should request the desktop intent source');

  App.showIntentMenu('creature', 'friendly-desktop', 'desktop');
  assertContains(body.innerHTML, 'id="desktop-intent-menu"', 'Desktop intent menu should render as a desktop-specific dialog');
  assertContains(body.innerHTML, 'class="desktop-intent-menu intent-menu intent-menu-desktop"', 'Desktop intent menu should use desktop-specific classes');
  assertNotContains(body.innerHTML, 'id="mobile-context-menu"', 'Desktop intent menu should not reuse the mobile bottom-sheet id');
  assertContains(body.innerHTML, "App.openIntentSubActionSheet('creature','friendly-desktop','fight','desktop')", 'Desktop primary actions should keep the desktop source');

  App.openIntentSubActionSheet('creature', 'friendly-desktop', 'fight', 'desktop');
  assertContains(body.innerHTML, 'id="desktop-intent-menu"', 'Desktop sub-action picker should remain on the desktop surface');
  assertContains(body.innerHTML, "App.selectIntent('creature','friendly-desktop','fight','desktop','attack')", 'Desktop sub-action selection should dispatch through shared intent selection');
  App.selectIntent('creature', 'friendly-desktop', 'fight', 'desktop', 'attack');
  assertEqual(App.lastIntentCommand.source, 'desktop', 'Desktop menu selection should record its command source');
  assertEqual(App.lastIntentCommand.subAction, 'attack', 'Desktop menu selection should record the chosen sub-action');
});

test('Desktop marked-target actions stay bounded and use desktop sub-action sheets', () => {
  const { App, body } = loadAppForCombat();
  const actor = makeUnit('You', { id: 'player-1' });
  const target = makeUnit('Wolfkin Guide', { id: 'guide-1', disposition: App.DISPOSITION.FRIENDLY, CPun: 80, MPun: 100 });
  App.player = actor;
  App.party = [actor];
  App.creatures = [target];
  App.explorationActorIds = ['player-1'];
  App.explorationTargetIds = ['creature:guide-1'];

  const html = App._renderExplorationTargetActions('desktop');
  assertContains(html, 'class="target-action-row"', 'Desktop marked-target actions should be wrapped in a bounded row');
  assertContains(html, "App.openExplorationTargetSubActionSheet('fight','desktop-target')", 'Desktop marked-target actions should open desktop sub-action source');
  assertContains(html, 'aria-controls="desktop-intent-menu"', 'Desktop marked-target actions should advertise the desktop popup');

  App.openExplorationTargetSubActionSheet('fight', 'desktop-target');
  assertContains(body.innerHTML, 'id="desktop-intent-menu"', 'Desktop marked-target sub-actions should use desktop popup');
  assertNotContains(body.innerHTML, 'id="mobile-context-menu"', 'Desktop marked-target sub-actions should not use mobile sheet');
});

test('Desktop play surface renders adjacent movement cells', () => {
  const { App, elements } = loadAppForCombat();
  const ids = ['nw', 'n', 'ne', 'w', 'center', 'e', 'sw', 's', 'se'];
  ids.forEach(id => elements.set(`desktop-play-cell-${id}`, makeElement()));
  elements.get('desktop-play-cell-center').className = 'desktop-play-cell center';
  App.location = { x: 0, y: 0 };
  App.worldMap = new Map();
  App.exploredTiles = new Set(['0,0']);
  App.renderMap();

  const north = elements.get('desktop-play-cell-n');
  assertContains(north.innerHTML, 'desktop-play-cell-icon', 'Desktop north cell should render a visible tile icon');
  assertContains(north.innerHTML, 'desktop-play-cell-label', 'Desktop north cell should render a compact tile label');
  assertContains(north.innerHTML, 'North:', 'Desktop north cell should label its movement direction');
  assertEqual(north.getAttribute('onclick'), 'App.move(0,-1)', 'Desktop north cell should move north');
  assertEqual(north.getAttribute('onkeydown'), "if(event.key==='Enter'||event.key===' '){event.preventDefault();App.move(0,-1)}", 'Desktop north cell should support keyboard movement');
  const center = elements.get('desktop-play-cell-center');
  assertContains(center.className, 'center', 'Desktop play surface should preserve the center tile');
  assert(center.getAttribute('data-tileset-key'), 'Desktop center tile should expose tileset metadata');
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
  assertContains(body.innerHTML, 'aria-labelledby="mobile-context-menu-title"', 'Party long-press menu should use its visible title as dialog label');
  assertContains(body.innerHTML, 'id="mobile-context-menu-title"', 'Party long-press menu title should be addressable');
  assertContains(body.innerHTML, 'Party actions', 'Party menu should use accessible party action label');
  assertContains(body.innerHTML, 'Stats', 'Party menu should expose stats');
  assertContains(body.innerHTML, 'aria-label="Party actions"', 'Party menu should expose an intent-sheet entry');
  assertContains(body.innerHTML, 'Make Leader', 'Party menu should expose leader action for allies');
  assertContains(body.innerHTML, 'Party role for Ally', 'Party menu should expose role selector');
  assertContains(body.innerHTML, 'AI order for Ally', 'Party menu should expose AI selector');
  assertContains(body.innerHTML, 'Dismiss', 'Party menu should expose dismiss action for allies');
  App.mobilePartyContextAction('actions', 1);
  assertContains(body.innerHTML, 'aria-label="Fight Ally"', 'Party long-press actions entry should open the shared intent sheet');
  assertContains(body.innerHTML, 'aria-labelledby="mobile-context-menu-title"', 'Party intent sheet should use its visible title as dialog label');
  assertContains(body.innerHTML, "App.openIntentSubActionSheet('party',1,'fight','sheet')", 'Party intent sheet should route primary actions through the sub-action picker');
  App.openIntentSubActionSheet('party', 1, 'fight', 'sheet');
  assertContains(body.innerHTML, 'aria-labelledby="mobile-context-menu-title"', 'Party sub-action sheet should use its visible title as dialog label');
  assertContains(body.innerHTML, "App.selectIntent('party',1,'fight','sheet','attack')", 'Party sub-action sheet should dispatch through shared intent selection');
  App.closeMobileContextMenu();
  App.showMobilePartyContext(1);
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
  assertContains(body.innerHTML, '>Acciones del grupo<', 'Intent-sheet menu entry should localize');
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
  assertContains(body.innerHTML, 'aria-labelledby="mobile-context-menu-title"', 'Long-press menu should use its visible title as dialog label');
  assertContains(body.innerHTML, 'id="mobile-context-menu-title"', 'Long-press menu title should be addressable');
  assertContains(body.innerHTML, 'intent-menu-radial', 'Long-press menu should use the radial intent presentation scaffold');
  assertContains(body.innerHTML, 'data-intent-presentation="radial"', 'Long-press menu should mark radial presentation for styling and later gesture handling');
  assertContains(body.innerHTML, 'role="menu"', 'Long-press menu should expose menu semantics for actions');
  assertContains(body.innerHTML, 'Fight', 'Long-press menu should expose Fight');
  assertContains(body.innerHTML, 'Flirt', 'Long-press menu should expose Flirt');
  assertContains(body.innerHTML, 'Fuck', 'Long-press menu should expose Fuck');
  assertContains(body.innerHTML, 'Feast', 'Long-press menu should expose Feast');
  assertContains(body.innerHTML, 'Feed', 'Long-press menu should expose Feed');
  assertContains(body.innerHTML, 'Inspect', 'Long-press menu should expose Inspect');
  assertContains(body.innerHTML, 'Recruit', 'Long-press menu should expose Recruit when available');
  assertContains(body.innerHTML, "App.openIntentSubActionSheet('creature','willing-1','fight','longpress')", 'Long-press menu should route registered primary actions through the sub-action picker');
  App.openIntentSubActionSheet('creature', 'willing-1', 'flirt', 'longpress');
  assertContains(body.innerHTML, 'aria-labelledby="mobile-context-menu-title"', 'Long-press sub-action sheet should use its visible title as dialog label');
  assertContains(body.innerHTML, "App.selectIntent('creature','willing-1','flirt','longpress','tease')", 'Long-press sub-action sheet should preserve command source');
  App.selectIntent('creature', 'willing-1', 'flirt', 'longpress', 'tease');
  assertEqual(App.lastIntentCommand.source, 'longpress', 'Long-press selection should record its command source');
  assertEqual(App.lastIntentCommand.subAction, 'tease', 'Long-press selection should record selected sub-action');
  assertEqual(App.lastIntentCommand.action, 'flirt', 'Long-press selection should record selected intent');
  App.closeMobileContextMenu();
  assertEqual(opener.focused, true, 'Closing long-press menu should restore focus to opener');
});

test('Radial intent menu remains an accelerator over shared dispatch', () => {
  const { App, body } = loadAppForCombat(() => 0);
  const player = makeUnit('You', { id: 'player-1', Figh: 40 });
  const enemy = makeUnit('Enemy', { id: 'enemy-radial', disposition: App.DISPOSITION.ENEMY, CPun: 100, con: 1 });
  App.player = player;
  App.party = [player];
  App.creatures = [enemy];
  App.showRadialIntentMenu('creature', 'enemy-radial');
  assertContains(body.innerHTML, 'intent-menu-radial', 'Radial helper should render the radial presentation class');
  assertContains(body.innerHTML, 'aria-labelledby="mobile-context-menu-title"', 'Radial helper should use its visible title as dialog label');
  assertContains(body.innerHTML, "App.openIntentSubActionSheet('creature','enemy-radial','fight','radial')", 'Radial primary actions should still route through the shared sub-action sheet');
  App.selectIntent('creature', 'enemy-radial', 'fight', 'radial', 'attack');
  assertEqual(App.lastIntentCommand.source, 'radial', 'Radial accelerator should record its command source');
  assertEqual(App.lastIntentCommand.subAction, 'attack', 'Radial accelerator should preserve selected sub-action');
  assert(enemy.CPun < 100, 'Radial accelerator should reuse existing outside-combat dispatch');
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
  assertContains(body.innerHTML, 'Seducir', 'Fuck menu item should localize');
  assertContains(body.innerHTML, 'Devorar', 'Feast menu item should localize');
  assertContains(body.innerHTML, 'Alimentar', 'Feed menu item should localize');
  assertContains(body.innerHTML, 'Inspeccionar', 'Inspect menu item should localize');
  assertContains(body.innerHTML, 'Reclutar', 'Recruit menu item should localize');
  assertContains(body.innerHTML, 'Cerrar', 'Close menu item should localize');
});

test('Mobile creature long-press menu preserves contextual quest and trade intents', () => {
  const { App, body } = loadAppForCombat();
  App.player = makeUnit('You');
  App.party = [App.player];
  App.creatures = [
    makeUnit('Guide', { id: 'guide-1', disposition: App.DISPOSITION.FRIENDLY, quest: { id: 'q1', title: 'Find path' } }),
    makeUnit('Merchant', { id: 'merchant-1', disposition: App.DISPOSITION.MERCHANT, stock: [{ id: 'ration', price: 2 }] })
  ];
  App.showMobileCreatureContext('guide-1');
  assertContains(body.innerHTML, 'Accept Quest', 'Long-press menu should expose quest intent when relevant');
  assertContains(body.innerHTML, "App.selectIntent('creature','guide-1','quest','longpress')", 'Quest long-press action should use shared intent dispatch');
  App.closeMobileContextMenu();
  App.showMobileCreatureContext('merchant-1');
  assertContains(body.innerHTML, 'Trade', 'Long-press menu should expose trade intent when relevant');
  assertContains(body.innerHTML, "App.selectIntent('creature','merchant-1','trade','longpress')", 'Trade long-press action should use shared intent dispatch');
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
