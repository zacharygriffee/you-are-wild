#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const BUILD = path.join(ROOT, 'dist', 'you-are-wild.html');
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

async function serveBuild() {
  const bytes = fs.readFileSync(BUILD);
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/yaw-service.json' || pathname.endsWith('/yaw-host.json')) {
      response.writeHead(204, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    if (!['/', '/dist/you-are-wild', '/dist/you-are-wild.html'].includes(pathname)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'no-store'
    });
    response.end(bytes);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function waitForApp(page) {
  await page.waitForFunction(() => Boolean(window.App && window.CONTENT && window.YAW_UNIT_CONTAINMENT), null, { timeout: 30000 });
}

async function seedOrdinaryAdventure(page) {
  return page.evaluate(async () => {
    const makeUnit = (id, name, species, overrides = {}) => {
      const speciesDef = App.species.find(entry => entry.id === species) || App.species[0] || { icon: '👤' };
      const base = App._getSpeciesBaseStats(species);
      return App._normalizeUnit({
        id,
        name,
        species,
        icon: speciesDef.icon,
        level: 1,
        MPun: base.MPun || 100,
        CPun: base.MPun || 100,
        MPle: base.MPle || 100,
        CPle: Math.floor((base.MPle || 100) * 0.35),
        Figh: base.Figh || 10,
        Feas: base.Feas || 10,
        Flir: base.Flir || 10,
        Fuck: base.Fuck || 10,
        Flee: base.Flee || 10,
        Feed: base.Feed || 10,
        str: base.str || 10,
        con: base.con || 10,
        spd: base.spd || 10,
        int: base.int || 10,
        wis: base.wis || 10,
        cha: base.cha || 10,
        size: App.SPECIES_SIZE[species] || 4,
        appetite: 8,
        bodyParts: [...(App.SPECIES_DEFAULT_PARTS[species] || [])],
        stomach: [],
        womb: [],
        balls: [],
        status: {},
        disposition: App.DISPOSITION.NEUTRAL,
        ...overrides
      }, overrides);
    };

    document.getElementById('tutorial-overlay')?.setAttribute('aria-hidden', 'true');
    const tutorial = document.getElementById('tutorial-overlay');
    if (tutorial) tutorial.style.display = 'none';

    App.alphaSession = null;
    App.SAVE_DB_NAME = 'YAW_Saves';
    App.WORLD_DB_NAME = 'YAW_Worlds';
    App.activeSlot = 'slot1';
    App._autoSaveSuppressed = true;
    App.cancelAutoSave?.();

    const player = makeUnit('lifecycle-player', 'You', 'human', {
      disposition: App.DISPOSITION.PARTY,
      hero: true,
      mc: true,
      ally: false,
      obedient: true,
      willing: true,
      spd: 80,
      Figh: 70,
      Feas: 70,
      size: 6
    });
    const companion = makeUnit('lifecycle-companion', 'Bunnyfolk', 'bunny', {
      disposition: App.DISPOSITION.PARTY,
      hero: false,
      mc: false,
      ally: true,
      obedient: true,
      willing: true,
      spd: 40,
      status: { fear: { turns: 2, by: 'Gale', source: 'combat-technique' } }
    });
    const enemy = makeUnit('lifecycle-enemy', 'Gale', 'harpy', {
      disposition: App.DISPOSITION.ENEMY,
      flying: true,
      ranged: true,
      combatRow: 'back',
      spd: 10,
      status: { terror: { turns: 2, by: 'You', source: 'combat-technique' } }
    });
    const digestPrey = makeUnit('lifecycle-digest-prey', 'Morsel', 'mouse', {
      CPun: 38,
      MPun: 60,
      size: 2,
      disposition: App.DISPOSITION.NEUTRAL
    });
    const releasePrey = makeUnit('lifecycle-release-prey', 'Sprig', 'mouse', {
      CPun: 44,
      MPun: 60,
      size: 2,
      disposition: App.DISPOSITION.NEUTRAL
    });
    player.stomach = [digestPrey, releasePrey].map(prey => App._createStomachPrey(prey, {
      holder: player,
      holderId: player.id,
      containedId: prey.id,
      containerId: 'stomach',
      entryVerb: 'swallow'
    }));

    App.player = player;
    App.party = [player, companion];
    App.partyLeaderId = player.id;
    App.creatures = [enemy];
    App.inventory = [App._createItemInstance('Focus Ring', { id: 'lifecycle-focus-ring' })];
    App.quests = [];
    App.storyEvents = [];
    App.sceneEvents = App.storyEvents;
    App.latestStoryEvent = null;
    App.latestSceneBeat = null;
    App.storyEventSeq = 0;
    App.log = [];
    App.tileEvents = [];
    App.location = { x: 0, y: 0 };
    App.currentBiome = 'grove';
    App.timeHour = 13;
    App.dayCount = 2;
    App.worldMeta = App._normalizeWorldMeta({
      worldId: 'lifecycle-ordinary-world',
      seed: 'lifecycle-ordinary-seed',
      generatorVersion: 7,
      mapModsHash: 'core-lifecycle',
      createdAt: 1
    });
    App.worldMap = new Map();
    App.tileDeltas = new Map();
    App.exploredTiles = new Set(['0,0']);
    App.superPatchMap = new Map();
    App.largeMapOffset = { x: 0, y: 0 };
    App.largeMapSelected = null;
    App.worldMap.set('0,0', {
      ...App.getBaseTile(0, 0),
      x: 0,
      y: 0,
      explored: true,
      biome: 'grove',
      danger: 1,
      creatures: App.creatures,
      items: []
    });
    App.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
    App.mode = App.GAME_MODE.NORMAL;
    App.activeActor = null;
    App.targetSelection = null;
    App.combatTargetId = null;
    App.combatTargetIds = [];
    App.combatPlanSelection = null;
    App.explorationActorIds = [player.id];
    App.explorationActorId = player.id;
    App.explorationActorSelectionExplicit = false;
    App.explorationTargetIds = [];
    App.holdingsWindow = null;
    App.transactionWindow = null;
    App.defeatState = null;
    App.strandedCompanions = [];

    const originalAutoSave = App.autoSave;
    App.autoSave = async () => true;
    const renamed = App.renamePartyMember(companion.id, 'Juniper');
    const duty = App.setCompanionDuty(1, 'guard');
    const stance = App.setCompanionStance(1, 'defensive');
    const control = App.setCompanionControl(1, 'provider');
    const preferredRow = App.setCompanionPreferredRow(1, 'back');
    const equipped = App.equipItem('lifecycle-focus-ring', companion.id);
    YAW_CONTENT_ACCESS.grantLocal(App, { rating: 'mature' });
    App.setContentTier('mature');
    App.autoSave = originalAutoSave;

    App.showScreen('game');
    App.renderMap();
    App.renderParty();
    App.renderCreatures();
    App.renderLog();
    App.startCombat([enemy], { source: 'lifecycle-check', announce: false });
    App.combatState.currentTurn = App.combatState.turnQueue.findIndex(entry => entry.unit === player);
    App.activeActor = player;
    App.renderCombatSceneForTurn(player);
    App.renderDesktopCombatComposer(player);
    App.renderMobileCombatToolbelt();

    App.combatPlanSelection = {
      active: true,
      source: 'combat-planner',
      actorIds: [player.id, companion.id],
      pendingIntent: 'fight',
      explicitActors: true,
      hadGroupActors: true
    };
    App.combatTargetIds = [];
    const missingTargetAccepted = App.confirmCombatPlan();
    const narratedFailure = [...App.log].reverse().find(entry => /gather for Fight|find no target|opening closes/i.test(entry.text || ''))?.text || '';
    const correction = App.combatCorrectionMessage;
    App.clearCombatPlan();
    App.combatState.currentTurn = App.combatState.turnQueue.findIndex(entry => entry.unit === player);
    App.activeActor = player;
    App.renderCombatSceneForTurn(player);
    App.renderDesktopCombatComposer(player);
    App.renderMobileCombatToolbelt();

    App._autoSaveSuppressed = false;
    App.markAutoSaveDirty?.([
      'manifest', 'player', 'party', 'inventory', 'holdings', 'currentTile',
      'worldTiles', 'combat', 'sceneFeed', 'activityLog', 'settings'
    ], 'ordinary-lifecycle-fixture');
    const saved = await App._saveToSlotConfirmed('slot1');
    return {
      saved,
      renamed,
      duty,
      stance,
      control,
      preferredRow,
      equipped,
      missingTargetAccepted,
      narratedFailure,
      correction,
      saveDb: App.SAVE_DB_NAME,
      worldDb: App.WORLD_DB_NAME,
      alphaSession: App.alphaSession,
      posture: CONTENT.preferences.posture,
      companionName: companion.name,
      companionControl: companion.companionBehavior?.control,
      equippedOwner: Object.values(companion.equipment || {}).find(Boolean)?.id || '',
      containmentCount: player.stomach.length,
      combatActive: App.combatState.active,
      desktopIntentCount: document.querySelectorAll('#desktop-context-belt [data-command-surface="combat-intents"] button').length,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
}

async function snapshot(page) {
  return page.evaluate(async () => {
    const companion = App.party.find(unit => unit.id === 'lifecycle-companion');
    const enemy = App.creatures.find(unit => unit.id === 'lifecycle-enemy');
    const current = App._currentCombatActor?.();
    const databases = indexedDB.databases ? (await indexedDB.databases()).map(db => db.name).filter(Boolean).sort() : [];
    const behavior = companion ? YAW_COMPANION_BEHAVIOR.get(App, companion) : null;
    return {
      screen: App.screen,
      saveDb: App.SAVE_DB_NAME,
      worldDb: App.WORLD_DB_NAME,
      alphaSession: App.alphaSession,
      databases,
      posture: CONTENT.preferences.posture,
      playerId: App.player?.id,
      companionName: companion?.name,
      companionBehavior: behavior ? {
        duty: behavior.duty,
        stance: behavior.stance,
        control: behavior.control,
        preferredRow: behavior.preferredRow,
        recruitmentContinuity: behavior.recruitmentContinuity
      } : null,
      companionEquipment: Object.values(companion?.equipment || {}).filter(Boolean).map(item => item.id),
      inventoryIds: App.inventory.map(item => item.id),
      fearTurns: companion?.status?.fear?.turns || 0,
      terrorTurns: enemy?.status?.terror?.turns || 0,
      containment: (App.player?.stomach || []).map(prey => ({ id: prey.id, state: prey.state, progress: prey.progress })),
      combatActive: App.combatState?.active === true,
      currentActorId: current?.id || null,
      queueIds: (App.combatState?.turnQueue || []).map(entry => entry.unit?.id),
      queueUsesLiveReferences: (App.combatState?.turnQueue || []).every(entry => [...App.party, ...App.creatures].includes(entry.unit)),
      desktopComposerVisible: Boolean(document.querySelector('#desktop-context-belt [data-command-surface="combat-intents"]')),
      mobileToolbeltActive: document.getElementById('mobile-combat-toolbelt')?.classList.contains('active') || false,
      mobileIntentCount: document.querySelectorAll('#mobile-combat-toolbelt [data-command-surface="combat-intents"] button').length,
      correction: App.combatCorrectionMessage,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      logText: App.log.map(entry => entry.text).join('\n')
    };
  });
}

async function loadSlot(page) {
  const loaded = await page.evaluate(() => App.loadFromSlot('slot1'));
  assert.equal(loaded, true, 'ordinary slot should load');
  await page.waitForFunction(() => App.screen === 'game' && App.combatState?.active === true, null, { timeout: 15000 });
  await page.waitForTimeout(100);
}

function assertRestored(state, viewport) {
  assert.equal(state.screen, 'game', 'loaded lifecycle should show the game');
  assert.equal(state.saveDb, 'YAW_Saves', 'lifecycle should use ordinary save storage');
  assert.equal(state.worldDb, 'YAW_Worlds', 'lifecycle should use ordinary world storage');
  assert.equal(state.alphaSession, null, 'lifecycle should not become an Alpha Lab session');
  assert.ok(state.databases.includes('YAW_Saves'), 'ordinary save database should exist');
  assert.ok(state.databases.includes('YAW_Worlds'), 'ordinary world database should exist');
  assert.ok(!state.databases.includes('YAW_Alpha_Saves'), 'ordinary lifecycle should not use the Alpha save database');
  assert.ok(!state.databases.includes('YAW_Alpha_Worlds'), 'ordinary lifecycle should not use the Alpha world database');
  assert.equal(state.posture, 'mature', 'Mature content posture should survive reload');
  assert.equal(state.playerId, 'lifecycle-player', 'player identity should survive reload');
  assert.equal(state.companionName, 'Juniper', 'companion rename should survive reload');
  assert.deepEqual(state.companionBehavior, {
    duty: 'guard',
    stance: 'defensive',
    control: 'deterministic',
    preferredRow: 'back',
    recruitmentContinuity: null
  }, 'companion behavior and provider fallback should survive reload');
  assert.deepEqual(state.companionEquipment, ['lifecycle-focus-ring'], 'companion loadout should survive reload');
  assert.ok(!state.inventoryIds.includes('lifecycle-focus-ring'), 'equipped companion item should stay out of the shared Pack');
  assert.equal(state.fearTurns, 2, 'companion fear should survive reload');
  assert.equal(state.terrorTurns, 2, 'enemy terror should survive reload');
  assert.deepEqual(state.containment.map(entry => entry.id), ['lifecycle-digest-prey', 'lifecycle-release-prey'], 'both contained creatures should survive reload');
  assert.equal(state.combatActive, true, 'active combat should survive reload');
  assert.equal(state.currentActorId, 'lifecycle-player', 'restored combat should return control to the saved actor');
  assert.deepEqual(state.queueIds, ['lifecycle-player', 'lifecycle-companion', 'lifecycle-enemy'], 'restored turn queue should preserve deterministic order');
  assert.equal(state.queueUsesLiveReferences, true, 'restored turn queue should bind to live party and enemy objects');
  assert.equal(state.correction, null, 'restored lifecycle should not retain a warning/correction banner');
  assert.equal(state.horizontalOverflow, false, `${viewport.width}px lifecycle should not overflow horizontally`);
}

async function exerciseMobileContainment(page) {
  await page.setViewportSize(PHONE);
  const before = await page.evaluate(async () => {
    // This phase proves the explicit full-save contract. Suppress the ordinary
    // action autosave before rendering or committing either containment action
    // so no sparse write can race the full snapshot used by the reload checks.
    const pendingSave = YAW_SAVE_PERSISTENCE.autoSaveState(App).running;
    if (pendingSave) await pendingSave;
    App.cancelAutoSave?.({ suppress: true });
    App.renderMobileCombatToolbelt();
    App.showInventory();
    App.setHoldingsTab('containers');
    App.setHoldingsOwner('lifecycle-player');
    const root = document.getElementById('holdings-window-root');
    return {
      digestButton: Boolean(root?.querySelector('[data-command-control="digest-contained"]:not([disabled])')),
      releaseButton: Boolean(root?.querySelector('[data-command-control="release-contained"]:not([disabled])')),
      commandMode: root?.querySelector('[data-command-surface="container-inventory"]')?.getAttribute('data-command-mode') || '',
      toolbeltActive: document.getElementById('mobile-combat-toolbelt')?.classList.contains('active') || false,
      intentCount: document.querySelectorAll('#mobile-combat-toolbelt [data-command-surface="combat-intents"] button').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.equal(before.digestButton, true, 'mobile Holdings should expose Digest for the current combat actor');
  assert.equal(before.releaseButton, true, 'mobile Holdings should expose Release for the current combat actor');
  assert.equal(before.commandMode, 'combat', 'mobile containment controls should retain combat command context');
  assert.equal(before.toolbeltActive, true, 'mobile combat toolbelt should remain active');
  assert.ok(before.intentCount >= 5, 'mobile combat toolbelt should remain usable alongside Holdings');
  assert.equal(before.overflow, false, 'mobile containment surface should not overflow horizontally');

  return page.evaluate(async () => {
    App.closeInventory?.();
    const digested = App.digestContained('party', 0, 'stomach', 0);
    App.combatState.currentTurn = App.combatState.turnQueue.findIndex(entry => entry.unit === App.player);
    App.activeActor = App.player;
    const released = App.releaseContained('party', 0, 'stomach', 1);
    App.combatState.currentTurn = App.combatState.turnQueue.findIndex(entry => entry.unit === App.player);
    App.activeActor = App.player;
    App.renderCombatSceneForTurn(App.player);
    App.renderMobileCombatToolbelt();
    App.markAutoSaveDirty?.(['manifest', 'party', 'holdings', 'currentTile', 'worldTiles', 'combat', 'sceneFeed', 'activityLog'], 'ordinary-lifecycle-mobile');
    const saved = await App._saveToSlotConfirmed('slot1');
    const digestRecord = App.player.stomach.find(prey => prey.id === 'lifecycle-digest-prey');
    return {
      digested,
      released,
      saved,
      digestState: digestRecord?.state,
      digestProgress: digestRecord?.progress,
      releaseStillContained: App.player.stomach.some(prey => prey.id === 'lifecycle-release-prey'),
      releasePresentInArea: App.creatures.some(unit => unit.id === 'lifecycle-release-prey'),
      digestNarrated: App.log.some(entry => /digests Morsel/i.test(entry.text || '')),
      releaseNarrated: App.log.some(entry => /Sprig is released/i.test(entry.text || '')),
      correction: App.combatCorrectionMessage,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
}

async function main() {
  assert.ok(fs.existsSync(BUILD), 'Build missing; run npm run build first');
  const fixture = await serveBuild();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') {
      const source = message.location()?.url || '';
      failures.push(`console${source ? ` (${source})` : ''}: ${message.text()}`);
    }
  });
  page.on('dialog', async dialog => {
    failures.push(`dialog: ${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });

  try {
    await context.addInitScript(() => {
      localStorage.setItem('yaw-has-played', 'true');
      localStorage.setItem('yaw-tutorial-complete', 'true');
    });
    await page.goto(`${fixture.origin}/dist/you-are-wild`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const seeded = await seedOrdinaryAdventure(page);
    assert.equal(seeded.saved, true, 'seeded ordinary lifecycle should save');
    assert.equal(seeded.renamed, true, 'companion should be renamed through the normal command');
    assert.equal(seeded.duty, true, 'companion duty command should succeed');
    assert.equal(seeded.stance, true, 'companion stance command should succeed');
    assert.equal(seeded.control, true, 'unavailable provider selection should narratively fall back');
    assert.equal(seeded.preferredRow, true, 'companion preferred row command should succeed');
    assert.equal(seeded.equipped, true, 'companion loadout command should succeed');
    assert.equal(seeded.missingTargetAccepted, false, 'missing group target should remain an unsuccessful action');
    assert.match(seeded.narratedFailure, /gather for Fight|find no target|opening closes/i, 'missing group target should produce scene narration');
    assert.equal(seeded.correction, null, 'missing group target should not produce a warning banner');
    assert.equal(seeded.saveDb, 'YAW_Saves', 'seed should use ordinary save storage');
    assert.equal(seeded.worldDb, 'YAW_Worlds', 'seed should use ordinary world storage');
    assert.equal(seeded.alphaSession, null, 'seed should not use Alpha session state');
    assert.equal(seeded.posture, 'mature', 'seed should use Mature posture');
    assert.equal(seeded.companionName, 'Juniper', 'rename should take effect before save');
    assert.equal(seeded.companionControl, 'deterministic', 'provider should fall back to deterministic autonomy');
    assert.equal(seeded.equippedOwner, 'lifecycle-focus-ring', 'Focus Ring should be equipped to the companion');
    assert.equal(seeded.containmentCount, 2, 'two containment commands should be available after reload');
    assert.equal(seeded.combatActive, true, 'seed should save during active combat');
    assert.ok(seeded.desktopIntentCount >= 5, 'desktop combat composer should expose ordinary intents');
    assert.equal(seeded.horizontalOverflow, false, 'desktop seed should not overflow horizontally');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await loadSlot(page);
    const desktopRestored = await snapshot(page);
    assertRestored(desktopRestored, DESKTOP);
    assert.equal(desktopRestored.desktopComposerVisible, true, 'desktop combat composer should remain usable after reload');
    assert.match(desktopRestored.logText, /has no AI assistance configured, so they will act autonomously/i, 'provider fallback should survive as narrated feedback');
    assert.match(desktopRestored.logText, /gather for Fight|find no target|opening closes/i, 'failed group action should survive as narration');

    const mobileActions = await exerciseMobileContainment(page);
    assert.equal(mobileActions.digested, true, 'Digest should execute from the current combat actor');
    assert.equal(mobileActions.released, true, 'Release should execute from the current combat actor');
    assert.equal(mobileActions.saved, true, 'mobile containment results should save');
    assert.ok(['terminal', 'digested'].includes(mobileActions.digestState), 'Digest should terminalize the selected contained creature');
    assert.equal(mobileActions.digestProgress, 100, 'Digest should complete containment progress');
    assert.equal(mobileActions.releaseStillContained, false, 'Release should remove the selected creature from containment');
    assert.equal(mobileActions.releasePresentInArea, true, 'Release should restore the selected creature to the area');
    assert.equal(mobileActions.digestNarrated, true, 'Digest outcome should be narrated');
    assert.equal(mobileActions.releaseNarrated, true, 'Release outcome should be narrated');
    assert.equal(mobileActions.correction, null, 'containment actions should not create warning banners');
    assert.equal(mobileActions.overflow, false, 'mobile actions should not cause horizontal overflow');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await loadSlot(page);
    const finalMobile = await snapshot(page);
    assert.equal(finalMobile.posture, 'mature', 'content posture should survive the second reload');
    assert.equal(finalMobile.companionName, 'Juniper', 'companion identity should survive the second reload');
    assert.equal(finalMobile.combatActive, true, 'combat should remain resumable after containment commands');
    assert.equal(finalMobile.currentActorId, 'lifecycle-player', 'player controls should remain usable after the second reload');
    assert.equal(finalMobile.mobileToolbeltActive, true, 'mobile combat toolbelt should restore after reload');
    assert.ok(finalMobile.mobileIntentCount >= 5, 'mobile combat intents should restore after reload');
    assert.equal(finalMobile.horizontalOverflow, false, 'final phone lifecycle should not overflow horizontally');
    const digested = finalMobile.containment.find(entry => entry.id === 'lifecycle-digest-prey');
    assert.ok(
      digested && ['terminal', 'digested'].includes(digested.state),
      `digested containment state should survive reload: ${JSON.stringify(finalMobile.containment)}`
    );
    assert.ok(!finalMobile.containment.some(entry => entry.id === 'lifecycle-release-prey'), 'released creature should stay outside containment after reload');
    assert.match(finalMobile.logText, /digests Morsel/i, 'Digest narration should survive reload');
    assert.match(finalMobile.logText, /Sprig is released/i, 'Release narration should survive reload');
    assert.deepEqual(failures, [], `ordinary lifecycle browser failures:\n${failures.join('\n')}`);

    console.log(JSON.stringify({
      suite: 'ordinary-adventure-lifecycle',
      passed: 3,
      phases: [
        { phase: 'desktop-seed-and-save', outcome: 'passed' },
        { phase: 'desktop-reload-and-mobile-actions', outcome: 'passed' },
        { phase: 'mobile-reload-and-restoration', outcome: 'passed' }
      ]
    }, null, 2));
  } finally {
    await context.close();
    await browser.close();
    await fixture.close();
  }
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
