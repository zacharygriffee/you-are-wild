#!/usr/bin/env node

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const distUrl = pathToFileURL(path.resolve(__dirname, '../../dist/you-are-wild.html')).href;

async function clearBrowserStorage(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('yaw-has-played', 'true');
    localStorage.setItem('yaw-tutorial-complete', 'true');
    if (window.indexedDB?.databases) {
      const databases = await indexedDB.databases();
      await Promise.all(databases.map(db => new Promise(resolve => {
        if (!db.name) return resolve();
        const req = indexedDB.deleteDatabase(db.name);
        req.onsuccess = req.onerror = req.onblocked = resolve;
      })));
    }
  });
}

async function createIndexedDb(page, name, stores = ['records']) {
  await page.evaluate(({ name, stores }) => new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = event => {
      const db = event.target.result;
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    req.onsuccess = event => {
      event.target.result.close();
      resolve();
    };
    req.onerror = () => reject(req.error);
  }), { name, stores });
}

async function putIndexedDbValue(page, name, store, key, value) {
  await page.evaluate(({ name, store, key, value }) => new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
    };
    req.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(new Uint8Array(value), key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    req.onerror = () => reject(req.error);
  }), { name, store, key, value });
}

async function browserDatabaseNames(page) {
  return page.evaluate(async () => {
    if (!indexedDB.databases) return [];
    const databases = await indexedDB.databases();
    return databases.map(db => db.name).filter(Boolean).sort();
  });
}

async function setupCombat(page, options = {}) {
  await page.evaluate(({ playerOverrides = {}, enemyOverrides = {}, allyOverrides = {}, withAlly = false }) => {
    const makeUnit = (name, id, overrides = {}) => ({
      id,
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
      stomach: [],
      womb: [],
      balls: [],
      bodyParts: [],
      tags: ['Person'],
      status: {},
      disposition: 'party',
      ...overrides
    });
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    if (tutorialOverlay) tutorialOverlay.style.display = 'none';
    App.showScreen('game');
    App.worldMeta = { worldId: 'combat-interaction-world', seed: 'combat-interaction-seed', generatorVersion: 2, mapModsHash: 'core' };
    App.location = { x: 0, y: 0 };
    App.currentBiome = 'grove';
    App.worldMap = new Map([['0,0', { ...App.getBaseTile(0, 0), explored: true, biome: 'grove', creatures: [], items: [] }]]);
    App.tileDeltas = new Map();
    App.exploredTiles = new Set(['0,0']);
    App.player = makeUnit('You', 'player-1', { Figh: 80, Feas: 80, Flir: 80, Fuck: 40, Feed: 40, Flee: 80, size: 5, appetite: 5, ...playerOverrides });
    const party = [App.player];
    if (withAlly) party.push(makeUnit('Ally', 'ally-1', { CPun: 40, MPun: 100, ...allyOverrides }));
    App.party = party;
    const enemy = makeUnit('Enemy', 'enemy-1', {
      disposition: App.DISPOSITION.ENEMY,
      CPun: 100,
      MPun: 100,
      CPle: 0,
      MPle: 100,
      con: 1,
      wis: 1,
      Flee: 1,
      size: 2,
      combatRow: 'front',
      ...enemyOverrides
    });
    App.creatures = [enemy];
    App.combatState = {
      active: true,
      round: 1,
      currentTurn: 0,
      processing: false,
      xpEarned: 0,
      turnQueue: [{ unit: App.player, initiative: 20 }, { unit: enemy, initiative: 10 }],
      syncActions: []
    };
    App.activeActor = App.player;
    App._normalizeExplorationSelections({ resetTargets: true });
    App.nextTurn = function() { this._advancedTurn = true; };
    App.showActorActions(App.player);
    App.renderDesktopPlaySurface();
  }, options);
}

async function setupAdventure(page, options = {}) {
  await page.evaluate(({ withAlly = true, targetOverrides = {} }) => {
    const makeUnit = (name, id, overrides = {}) => ({
      id,
      name,
      species: 'human',
      icon: 'X',
      level: 1,
      CPun: 100,
      MPun: 100,
      CPle: 0,
      MPle: 100,
      Figh: 80,
      Feas: 80,
      Flir: 80,
      Fuck: 40,
      Flee: 80,
      Feed: 40,
      str: 10,
      con: 10,
      spd: 10,
      int: 10,
      wis: 10,
      cha: 10,
      size: 4,
      appetite: 4,
      stomach: [],
      womb: [],
      balls: [],
      bodyParts: [],
      tags: ['Person'],
      status: {},
      disposition: 'party',
      ...overrides
    });
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    if (tutorialOverlay) tutorialOverlay.style.display = 'none';
    App.showScreen('game');
    App.worldMeta = { worldId: 'adventure-interaction-world', seed: 'adventure-interaction-seed', generatorVersion: 2, mapModsHash: 'core' };
    App.location = { x: 0, y: 0 };
    App.currentBiome = 'grove';
    App.worldMap = new Map([['0,0', { ...App.getBaseTile(0, 0), explored: true, biome: 'grove', creatures: [], items: [] }]]);
    App.tileDeltas = new Map();
    App.exploredTiles = new Set(['0,0']);
    App.combatState = { active: false, round: 0, currentTurn: 0, processing: false, turnQueue: [], syncActions: [] };
    App.targetSelection = null;
    App.syncSelection = null;
    App.feedSelection = null;
    App.player = makeUnit('You', 'player-1', { size: 5, appetite: 5 });
    App.party = [App.player];
    if (withAlly) App.party.push(makeUnit('Ally', 'ally-1', { Figh: 90, Flir: 90 }));
    App.creatures = [
      makeUnit('Friendly', 'friendly-1', {
        disposition: App.DISPOSITION.FRIENDLY,
        CPun: 100,
        MPun: 100,
        CPle: 0,
        MPle: 100,
        con: 1,
        wis: 1,
        ...targetOverrides
      })
    ];
    App.explorationActorIds = [App._unitSelectionId(App.player)];
    App.explorationActorId = App.explorationActorIds[0];
    App.explorationActorSelectionExplicit = false;
    App.explorationTargetIds = [];
    App.renderDesktopPlaySurface();
    App.renderParty();
    App.renderCreatures();
    App.renderExplorationActions();
  }, options);
}

async function clickIntentAndTarget(page, action) {
  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('${action}')"]`).first().click();
  const target = page.locator('#enemies-content button[data-command-control="mark-combat-target"]').first();
  await assert.doesNotReject(() => target.waitFor({ state: 'visible', timeout: 1000 }), `${action} should render a target mark button`);
  await target.click();
  const confirm = page.locator('#desktop-context-belt button[data-command-control="confirm-targets"]').first();
  await assert.doesNotReject(() => confirm.waitFor({ state: 'visible', timeout: 1000 }), `${action} should render target confirmation`);
  await confirm.click();
}

async function mobileCombatToolbeltMetrics(page) {
  return page.evaluate(() => {
    const belt = document.querySelector('#mobile-combat-toolbelt');
    const beltRect = belt?.getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll('#mobile-combat-toolbelt .mobile-combat-intents .action-btn'));
    const rects = buttons.map(button => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }).filter(rect => rect.width > 0 && rect.height > 0);
    const min = (values, fallback = 0) => values.length ? Math.min(...values) : fallback;
    return {
      buttonCount: rects.length,
      minButtonWidth: min(rects.map(rect => rect.width)),
      minButtonHeight: min(rects.map(rect => rect.height)),
      buttonsInsideViewport: rects.every(rect => rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
      toolbeltVisible: Boolean(beltRect && beltRect.width > 0 && beltRect.height > 0 && getComputedStyle(belt).display !== 'none'),
      toolbeltInsideViewport: Boolean(beltRect && beltRect.left >= -1 && beltRect.right <= innerWidth + 1 && beltRect.top >= -1 && beltRect.bottom <= innerHeight + 1)
    };
  });
}

function assertMobileCombatToolbeltTapTargets(metrics, label) {
  assert(metrics.toolbeltVisible, `${label}: mobile combat toolbelt should be visible`);
  assert(metrics.buttonCount >= 1, `${label}: mobile combat toolbelt should expose at least one control`);
  assert(metrics.minButtonWidth >= 70, `${label}: mobile combat controls should keep readable thumb-width targets (${JSON.stringify(metrics)})`);
  assert(metrics.minButtonHeight >= 44, `${label}: mobile combat controls should keep finger-sized tap targets (${JSON.stringify(metrics)})`);
  assert.strictEqual(metrics.buttonsInsideViewport, true, `${label}: mobile combat controls should stay inside the viewport`);
  assert.strictEqual(metrics.toolbeltInsideViewport, true, `${label}: mobile combat toolbelt should stay inside the viewport`);
}

async function mobileExplorationRailMetrics(page) {
  return page.evaluate(() => {
    const rects = selector => Array.from(document.querySelectorAll(selector)).map(node => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }).filter(rect => rect.width > 0 && rect.height > 0);
    const buttonRects = selector => Array.from(document.querySelectorAll(selector)).map(button => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        width: rect.width,
        height: rect.height,
        fontSize: parseFloat(style.fontSize) || 0,
        title: button.getAttribute('title') || '',
        ariaLabel: button.getAttribute('aria-label') || ''
      };
    }).filter(rect => rect.width > 0 && rect.height > 0);
    const min = (values, fallback = 0) => values.length ? Math.min(...values) : fallback;
    const max = (values, fallback = 0) => values.length ? Math.max(...values) : fallback;
    const targetTray = rects('#mobile-target-action-tray .action-btn');
    const actorChips = rects('#mobile-actor-belt .mobile-unit-chip, #mobile-actor-belt .mobile-actor-chip');
    const actorButtons = buttonRects('#mobile-actor-belt .mobile-unit-chip .action-btn, #mobile-actor-belt .mobile-actor-chip-btn');
    const targetButtons = rects('#mobile-target-picker-belt .tactical-card-selection-controls .action-btn, #mobile-creature-strip .tactical-card-selection-controls .action-btn');
    return {
      targetPickerOpen: Boolean(window.App?.mobileTargetPickerOpen),
      targetTrayCount: targetTray.length,
      minTargetTrayWidth: min(targetTray.map(rect => rect.width)),
      minTargetTrayHeight: min(targetTray.map(rect => rect.height)),
      actorChipCount: actorChips.length,
      minActorChipHeight: min(actorChips.map(rect => rect.height)),
      maxActorChipHeight: max(actorChips.map(rect => rect.height)),
      actorButtonCount: actorButtons.length,
      minActorButtonWidth: min(actorButtons.map(rect => rect.width)),
      minActorButtonHeight: min(actorButtons.map(rect => rect.height)),
      maxActorButtonWidth: max(actorButtons.map(rect => rect.width)),
      maxActorButtonFontSize: max(actorButtons.map(rect => rect.fontSize)),
      actorButtonsAccessible: actorButtons.every(rect => rect.title && rect.ariaLabel),
      targetButtonCount: targetButtons.length,
      minTargetButtonWidth: min(targetButtons.map(rect => rect.width)),
      minTargetButtonHeight: min(targetButtons.map(rect => rect.height))
    };
  });
}

function assertMobileExplorationRailTapTargets(metrics, label) {
  assert(metrics.targetTrayCount >= 1, `${label}: marked target composer should expose visible intent controls`);
  assert(metrics.minTargetTrayWidth >= 70, `${label}: marked target intents should keep readable thumb-width targets`);
  assert(metrics.minTargetTrayHeight >= 44, `${label}: marked target intents should keep finger-sized tap targets`);
  assert(metrics.actorChipCount >= 1, `${label}: actor rail should expose compact actor chips`);
  assert(metrics.minActorChipHeight >= 44, `${label}: actor rail chips should keep a stable touch height`);
  assert(metrics.maxActorChipHeight <= 52, `${label}: actor rail micro chips should not regain excess vertical padding`);
  assert(metrics.actorButtonCount >= 1, `${label}: actor rail should expose Actor/Mark controls`);
  assert(metrics.minActorButtonWidth >= 40 && metrics.minActorButtonHeight >= 44, `${label}: actor rail Actor/Mark controls should keep compact icon tap targets`);
  assert(metrics.maxActorButtonWidth <= 44, `${label}: actor rail Actor/Mark controls should stay compact and icon-sized`);
  assert.strictEqual(metrics.maxActorButtonFontSize, 0, `${label}: actor rail Actor/Mark controls should hide visible text labels`);
  assert.strictEqual(metrics.actorButtonsAccessible, true, `${label}: icon-only actor rail controls should keep title and aria-label text`);
  if (metrics.targetPickerOpen) {
    assert(metrics.targetButtonCount >= 1, `${label}: target picker should expose compact Mark controls`);
    assert(metrics.minTargetButtonWidth >= 44, `${label}: target picker Mark controls should keep icon-sized touch width`);
    assert(metrics.minTargetButtonHeight >= 44, `${label}: target picker Mark controls should keep finger-sized tap targets`);
  }
}

async function mobileMicroCardOverlapMetrics(page, selector) {
  return page.evaluate((stripSelector) => {
    const cards = Array.from(document.querySelectorAll(`${stripSelector} .micro-tactical-card`));
    const rows = cards.map(card => {
      const left = card.querySelector('.micro-agency-slot .action-btn, .micro-agency-slot .micro-avatar');
      const right = card.querySelector('.micro-target-slot .action-btn, .micro-target-slot .micro-avatar');
      const rings = Array.from(card.querySelectorAll('.tactical-stat-ring'));
      const ringRects = rings.map(ring => ring.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
      if (!left || !right || !ringRects.length) return { overlaps: false, leftOverlap: 0, rightOverlap: 0 };
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      const ringsLeft = Math.min(...ringRects.map(rect => rect.left));
      const ringsRight = Math.max(...ringRects.map(rect => rect.right));
      const leftOverlap = Math.max(0, leftRect.right - ringsLeft);
      const rightOverlap = Math.max(0, ringsRight - rightRect.left);
      return {
        overlaps: leftOverlap > 0.5 || rightOverlap > 0.5,
        leftOverlap,
        rightOverlap
      };
    });
    return {
      count: rows.length,
      overlapCount: rows.filter(row => row.overlaps).length,
      maxLeftOverlap: rows.length ? Math.max(...rows.map(row => row.leftOverlap)) : 0,
      maxRightOverlap: rows.length ? Math.max(...rows.map(row => row.rightOverlap)) : 0
    };
  }, selector);
}

function assertMobileMicroCardsDoNotOverlap(metrics, label) {
  assert(metrics.count >= 1, `${label}: should render at least one micro tactical card`);
  assert.strictEqual(metrics.overlapCount, 0, `${label}: micro stat rings should not overlap actor/avatar or Mark/Target controls (${JSON.stringify(metrics)})`);
}

async function mobileCombatPartyMediumFitMetrics(page) {
  return page.evaluate(() => {
    App.toggleUnit(0, 'party');
    const shell = document.querySelector('#mobile-party-card');
    const strip = document.querySelector('#mobile-party-strip');
    const card = document.querySelector('#mobile-party-strip .mobile-unit-chip.density-medium');
    const rect = node => {
      const box = node?.getBoundingClientRect();
      return box ? { top: box.top, bottom: box.bottom, height: box.height } : null;
    };
    const shellRect = rect(shell);
    const stripRect = rect(strip);
    const cardRect = rect(card);
    return {
      hasMediumCard: Boolean(card),
      cardHeight: cardRect?.height || 0,
      stripHeight: stripRect?.height || 0,
      shellHeight: shellRect?.height || 0,
      cardInsideStrip: Boolean(cardRect && stripRect && cardRect.bottom <= stripRect.bottom + 1),
      cardInsideShell: Boolean(cardRect && shellRect && cardRect.bottom <= shellRect.bottom + 1),
      stripOverflowY: strip ? getComputedStyle(strip).overflowY : '',
      shellOverflowY: shell ? getComputedStyle(shell).overflowY : '',
      cardOverflowY: card ? getComputedStyle(card).overflowY : ''
    };
  });
}

function assertMobileCombatPartyMediumFits(metrics) {
  assert.strictEqual(metrics.hasMediumCard, true, `Mobile combat party strip should render an expanded medium card (${JSON.stringify(metrics)})`);
  assert(metrics.cardHeight > 134, `Expanded medium party card should be allowed to exceed the old fixed chip height (${JSON.stringify(metrics)})`);
  assert.strictEqual(metrics.cardInsideStrip, true, `Expanded medium party card should fit inside the party strip (${JSON.stringify(metrics)})`);
  assert.strictEqual(metrics.cardInsideShell, true, `Expanded medium party card should fit inside the party card container (${JSON.stringify(metrics)})`);
  assert.notStrictEqual(metrics.stripOverflowY, 'hidden', `Combat party strip should not hide medium-card overflow (${JSON.stringify(metrics)})`);
  assert.notStrictEqual(metrics.shellOverflowY, 'hidden', `Combat party card shell should not hide medium-card overflow (${JSON.stringify(metrics)})`);
  assert.notStrictEqual(metrics.cardOverflowY, 'hidden', `Expanded medium party card should not hide its own content (${JSON.stringify(metrics)})`);
}

async function runCombatTargetFirstComposerFlow(page) {
  await page.setViewportSize({ width: 1365, height: 768 });
  await setupCombat(page);
  const stageState = await page.evaluate(() => {
    const surface = document.querySelector('#desktop-play-surface');
    const north = document.querySelector('#desktop-play-cell-n');
    const south = document.querySelector('#desktop-play-cell-s');
    const center = document.querySelector('#desktop-play-cell-center');
    const stack = document.querySelector('#scene-description .desktop-battle-stack');
    const movementCommands = Array.from(document.querySelectorAll('#desktop-play-surface [data-command-surface="stage-traversal"]'));
    return {
      surfaceMode: surface?.getAttribute('data-surface-mode') || '',
      combatClass: surface?.classList.contains('combat-active') || false,
      northMoveable: north?.classList.contains('moveable') || false,
      northRole: north?.getAttribute('role') || null,
      northTabIndex: north?.getAttribute('tabindex') || null,
      northCommand: north?.getAttribute('data-command-surface') || null,
      northControl: north?.getAttribute('data-command-control') || null,
      northOnClick: north?.getAttribute('onclick') || null,
      movementCommandCount: movementCommands.length,
      centerStage: center?.getAttribute('data-stage-surface') || '',
      northStage: north?.getAttribute('data-stage-surface') || '',
      southStage: south?.getAttribute('data-stage-surface') || '',
      stackStage: stack?.getAttribute('data-stage-surface') || '',
      enemyLaneCount: stack?.querySelectorAll('.desktop-battle-lane.enemy').length || 0,
      partyLaneCount: stack?.querySelectorAll('.desktop-battle-lane.party').length || 0,
      stackMicroCount: stack?.querySelectorAll('.micro-tactical-card').length || 0,
      centerIntentCount: center?.querySelectorAll('[data-command-surface="combat-intents"], .unit-combat-actions').length || 0
    };
  });
  assert.strictEqual(stageState.surfaceMode, 'combat', 'Desktop play surface should identify combat mode during browser combat smoke');
  assert.strictEqual(stageState.combatClass, true, 'Desktop play surface should expose combat-active layout state');
  assert.strictEqual(stageState.northMoveable, false, 'Desktop combat surrounding cells should not present as moveable');
  assert.strictEqual(stageState.northRole, null, 'Desktop combat surrounding cells should not expose button semantics');
  assert.strictEqual(stageState.northTabIndex, '-1', 'Desktop combat surrounding cells should leave focus for combat controls');
  assert.strictEqual(stageState.northCommand, null, 'Desktop combat surrounding cells should not advertise traversal command ownership');
  assert.strictEqual(stageState.northControl, null, 'Desktop combat surrounding cells should not advertise movement controls');
  assert.strictEqual(stageState.northOnClick, null, 'Desktop combat surrounding cells should not dispatch movement clicks');
  assert.strictEqual(stageState.movementCommandCount, 0, 'Desktop combat surface should not expose routine stage-traversal commands');
  assert.strictEqual(stageState.centerStage, 'battle-context', 'Desktop combat center should become the turn/exchange context');
  assert.strictEqual(stageState.northStage, 'battle-hidden', 'Desktop combat north row should be hidden after enemy lane moves into the center stack');
  assert.strictEqual(stageState.southStage, 'battle-hidden', 'Desktop combat south row should be hidden after party lane moves into the center stack');
  assert.strictEqual(stageState.stackStage, 'battle-stack', 'Desktop combat center should own the stacked enemy and party belts');
  assert.strictEqual(stageState.enemyLaneCount, 1, 'Desktop combat battle stack should include an enemy belt without requiring side rails');
  assert.strictEqual(stageState.partyLaneCount, 1, 'Desktop combat battle stack should include a party belt without requiring side rails');
  assert(stageState.stackMicroCount >= 2, 'Desktop combat battle stack should use micro combat cards for visible combatants');
  assert.strictEqual(stageState.centerIntentCount, 0, 'Desktop combat center should stay free of duplicated intent/action grids');
  await page.locator('#enemies-content .compact-tactical-card').first().click();
  let state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    combatTargetId: App.combatTargetId,
    targetSelection: App.targetSelection
  }));
  assert.strictEqual(state.enemyPun, 100, 'Desktop target card body without pending intent should not attack');
  assert.strictEqual(state.combatTargetId, null, 'Desktop target card body without pending intent should not mark');
  assert.strictEqual(state.targetSelection, null, 'Desktop target card body without pending intent should not arm target-pick');
  const desktopMark = page.locator('#enemies-content button[data-command-control="mark-combat-target"]').first();
  await assert.doesNotReject(() => desktopMark.waitFor({ state: 'visible', timeout: 1000 }), 'Desktop combat enemy card should expose target-first Mark');
  await desktopMark.click();
  state = await page.evaluate(() => ({
    markedTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    sentence: document.querySelector('#selection-sentence')?.innerText || '',
    enemySelectedTarget: Boolean(document.querySelector('#enemies-content .compact-tactical-card.selected-target')),
    targetState: document.querySelector('#enemies-content button[data-command-control="mark-combat-target"]')?.getAttribute('data-selection-state') || '',
    currentActorBadge: document.querySelector('#party-content .compact-tactical-card.selected-actor .unit-selection-chips')?.innerText || '',
    enemyTargetBadge: document.querySelector('#enemies-content .compact-tactical-card.selected-target .unit-selection-chips')?.innerText || '',
    hasCombatPick: Boolean(document.querySelector('#enemies-content button[data-selection-mode="combat-pick"]')),
    composerActorCount: document.querySelector('#desktop-context-belt')?.getAttribute('data-command-actor-count') || '',
    composerTargetCount: document.querySelector('#desktop-context-belt')?.getAttribute('data-command-target-count') || '',
    composerIntent: document.querySelector('#desktop-context-belt')?.getAttribute('data-command-intent') || '',
    markRowSurface: document.querySelector('#enemies-content button[data-command-control="mark-combat-target"]')?.closest('.unit-actions')?.getAttribute('data-command-surface') || '',
    markRowMode: document.querySelector('#enemies-content button[data-command-control="mark-combat-target"]')?.closest('.unit-actions')?.getAttribute('data-command-mode') || '',
    markRowGrammar: document.querySelector('#enemies-content button[data-command-control="mark-combat-target"]')?.closest('.unit-actions')?.getAttribute('data-command-grammar') || '',
    markRowSlot: document.querySelector('#enemies-content button[data-command-control="mark-combat-target"]')?.closest('.unit-actions')?.getAttribute('data-command-slot') || ''
  }));
  assert.strictEqual(state.markedTargetId, 'enemy-1', 'Desktop combat Mark should store a combat target');
  assert.strictEqual(state.targetSelection, null, 'Desktop combat Mark should not enter intent-first target-pick state');
  assert(state.sentence.includes('You') && state.sentence.includes('Enemy') && state.sentence.includes('Choose'), 'Desktop sentence should show Actor -> Target -> Intent after combat Mark');
  assert.strictEqual(state.targetState, 'selected', 'Desktop marked combat enemy should expose selected combat target state');
  assert(state.currentActorBadge.includes('Current'), 'Desktop compact combat actor card should show a visible Current badge');
  assert.strictEqual(state.hasCombatPick, false, 'Desktop target-first Mark should not render combat-pick controls before intent');
  assert.strictEqual(state.composerActorCount, '1', 'Desktop combat composer root should expose current actor count after marking');
  assert.strictEqual(state.composerTargetCount, '1', 'Desktop combat composer root should expose marked target count');
  assert.strictEqual(state.composerIntent, 'choose', 'Desktop combat composer root should expose pending intent before resolution');
  assert.strictEqual(state.markRowSurface, 'combat-targeting', 'Desktop combat Mark row should identify the combat target composer surface');
  assert.strictEqual(state.markRowMode, 'combat', 'Desktop combat Mark row should identify combat mode');
  assert.strictEqual(state.markRowGrammar, 'actor-target-intent', 'Desktop combat Mark row should preserve composer grammar metadata');
  assert.strictEqual(state.markRowSlot, 'target', 'Desktop combat Mark row should identify the target command slot');

  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    combatTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    planActive: Boolean(App.combatPlanSelection?.active),
    pendingIntent: App.combatPlanSelection?.pendingIntent || null,
    commandSource: App.lastIntentCommand?.source || '',
    commandTargetIds: App.lastIntentCommand?.targetIds || [],
    commandAction: App.lastIntentCommand?.action || ''
  }));
  assert.strictEqual(state.enemyPun, 100, 'Desktop Mark + Fight should arm a plan, not resolve immediately');
  assert.strictEqual(state.combatTargetId, 'enemy-1', 'Desktop armed plan should preserve the marked target');
  assert.strictEqual(state.targetSelection, null, 'Desktop armed plan should not enter quick target-pick state');
  assert.strictEqual(state.planActive, true, 'Desktop Mark + Fight should create combat planner state');
  assert.strictEqual(state.pendingIntent, 'fight', 'Desktop Mark + Fight should arm Fight as the pending intent');

  await setupCombat(page);
  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  await page.locator('#enemies-content .compact-tactical-card').first().click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    combatTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    commandSource: App.lastIntentCommand?.source || '',
    commandTargetIds: App.lastIntentCommand?.targetIds || [],
    commandAction: App.lastIntentCommand?.action || ''
  }));
  assert(state.enemyPun < 100, 'Desktop action-first target body click should resolve against the tapped enemy');
  assert.strictEqual(state.combatTargetId, null, 'Desktop quick Fight should clear the combat target after resolving');
  assert.strictEqual(state.targetSelection, null, 'Desktop quick Fight should clear target-pick state after resolving');
  assert.strictEqual(state.commandSource, 'combat-quick-target', 'Desktop quick Fight should identify the quick target command source');
  assert.deepStrictEqual(state.commandTargetIds, ['enemy-1'], 'Desktop quick Fight should dispatch the tapped enemy id');
  assert.strictEqual(state.commandAction, 'fight', 'Desktop quick Fight should dispatch the selected intent');

  await page.setViewportSize({ width: 390, height: 844 });
  await setupCombat(page);
  assertMobileCombatPartyMediumFits(await mobileCombatPartyMediumFitMetrics(page));
  await setupCombat(page);
  await page.locator('#mobile-creature-strip .mobile-unit-chip').first().click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    combatTargetId: App.combatTargetId,
    targetSelection: App.targetSelection
  }));
  assert.strictEqual(state.enemyPun, 100, 'Mobile target card body without pending intent should not attack');
  assert.strictEqual(state.combatTargetId, null, 'Mobile target card body without pending intent should not mark');
  assert.strictEqual(state.targetSelection, null, 'Mobile target card body without pending intent should not arm target-pick');
  await setupCombat(page);
  const mobileMark = page.locator('#mobile-creature-strip button[data-command-control="mark-combat-target"]').first();
  await assert.doesNotReject(() => mobileMark.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile combat enemy chip should expose target-first Mark');
  assertMobileMicroCardsDoNotOverlap(await mobileMicroCardOverlapMetrics(page, '#mobile-creature-strip'), 'Mobile combat enemy strip');
  assertMobileMicroCardsDoNotOverlap(await mobileMicroCardOverlapMetrics(page, '#mobile-party-strip'), 'Mobile combat party strip');
  await mobileMark.click();
  state = await page.evaluate(() => ({
    markedTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || '',
    enemySelectedTarget: Boolean(document.querySelector('#mobile-creature-strip .mobile-unit-chip.selected-target')),
    currentActorState: document.querySelector('#mobile-party-strip .mobile-unit-chip.selected-actor')?.getAttribute('data-selection-state') || '',
    currentActorAria: document.querySelector('#mobile-party-strip .mobile-unit-chip.selected-actor')?.getAttribute('aria-current') || '',
    enemyTargetState: document.querySelector('#mobile-creature-strip .mobile-unit-chip.selected-target')?.getAttribute('data-selection-state') || '',
    hasCombatPick: Boolean(document.querySelector('#mobile-creature-strip button[data-selection-mode="combat-pick"]')),
    hasAdventureMark: (document.querySelector('#mobile-creature-strip')?.innerHTML || '').includes("toggleExplorationTarget('creature'"),
    composerActorCount: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-actor-count') || '',
    composerTargetCount: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-target-count') || '',
    composerIntent: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-intent') || '',
    markRowSurface: document.querySelector('#mobile-creature-strip button[data-command-control="mark-combat-target"]')?.closest('.unit-actions')?.getAttribute('data-command-surface') || '',
    markRowMode: document.querySelector('#mobile-creature-strip button[data-command-control="mark-combat-target"]')?.closest('.unit-actions')?.getAttribute('data-command-mode') || '',
    markRowGrammar: document.querySelector('#mobile-creature-strip button[data-command-control="mark-combat-target"]')?.closest('.unit-actions')?.getAttribute('data-command-grammar') || '',
    markRowSlot: document.querySelector('#mobile-creature-strip button[data-command-control="mark-combat-target"]')?.closest('.unit-actions')?.getAttribute('data-command-slot') || ''
  }));
  assert.strictEqual(state.markedTargetId, 'enemy-1', 'Mobile combat Mark should store a combat target');
  assert.strictEqual(state.targetSelection, null, 'Mobile combat Mark should not enter intent-first target-pick state');
  assert(state.sentence.includes('You') && state.sentence.includes('Enemy') && state.sentence.includes('Choose'), 'Mobile sentence should show Actor -> Target -> Intent after combat Mark');
  assert.strictEqual(state.enemyTargetState, 'selected', 'Mobile marked combat enemy should expose selected combat target state');
  assert.strictEqual(state.currentActorState, 'selected', 'Mobile compact combat actor chip should expose selected current state');
  assert.strictEqual(state.currentActorAria, 'true', 'Mobile compact combat actor chip should expose aria-current');
  assert.strictEqual(state.enemyTargetState, 'selected', 'Mobile marked combat enemy chip should expose selected target state');
  assert.strictEqual(state.hasCombatPick, false, 'Mobile target-first Mark should not render combat-pick controls before intent');
  assert.strictEqual(state.hasAdventureMark, false, 'Mobile combat Mark should not render adventure target controls');
  assert.strictEqual(state.composerActorCount, '1', 'Mobile combat composer root should expose current actor count after marking');
  assert.strictEqual(state.composerTargetCount, '1', 'Mobile combat composer root should expose marked target count');
  assert.strictEqual(state.composerIntent, 'choose', 'Mobile combat composer root should expose pending intent before resolution');
  assert.strictEqual(state.markRowSurface, 'combat-targeting', 'Mobile combat Mark row should identify the combat target composer surface');
  assert.strictEqual(state.markRowMode, 'combat', 'Mobile combat Mark row should identify combat mode');
  assert.strictEqual(state.markRowGrammar, 'actor-target-intent', 'Mobile combat Mark row should preserve composer grammar metadata');
  assert.strictEqual(state.markRowSlot, 'target', 'Mobile combat Mark row should identify the target command slot');

  await page.locator(`#mobile-combat-toolbelt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    combatTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    planActive: Boolean(App.combatPlanSelection?.active),
    pendingIntent: App.combatPlanSelection?.pendingIntent || null,
    commandSource: App.lastIntentCommand?.source || '',
    commandTargetIds: App.lastIntentCommand?.targetIds || []
  }));
  assert.strictEqual(state.enemyPun, 100, 'Mobile Mark + Fight should arm a plan, not resolve immediately');
  assert.strictEqual(state.combatTargetId, 'enemy-1', 'Mobile armed plan should preserve the marked target');
  assert.strictEqual(state.targetSelection, null, 'Mobile armed plan should not enter quick target-pick state');
  assert.strictEqual(state.planActive, true, 'Mobile Mark + Fight should create combat planner state');
  assert.strictEqual(state.pendingIntent, 'fight', 'Mobile Mark + Fight should arm Fight as the pending intent');

  await setupCombat(page);
  await page.locator(`#mobile-combat-toolbelt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  await page.locator('#mobile-creature-strip .mobile-unit-chip').first().click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    combatTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    commandSource: App.lastIntentCommand?.source || '',
    commandTargetIds: App.lastIntentCommand?.targetIds || []
  }));
  assert(state.enemyPun < 100, 'Mobile action-first target body click should resolve against the tapped enemy');
  assert.strictEqual(state.combatTargetId, null, 'Mobile quick Fight should clear the combat target after resolving');
  assert.strictEqual(state.targetSelection, null, 'Mobile quick Fight should clear target-pick state after resolving');
  assert.strictEqual(state.commandSource, 'combat-quick-target', 'Mobile quick Fight should identify the quick target command source');
  assert.deepStrictEqual(state.commandTargetIds, ['enemy-1'], 'Mobile quick Fight should dispatch the tapped enemy id');
  await page.setViewportSize({ width: 1365, height: 768 });
}

async function runActionMatrix(page) {
  await setupCombat(page);
  await clickIntentAndTarget(page, 'fight');
  let state = await page.evaluate(() => ({
    enemyPun: App.creatures[0]?.CPun,
    targetSelection: App.targetSelection,
    centerSummary: Boolean(document.querySelector('#desktop-play-cell-center .combat-scene-summary')),
    turnOrder: document.querySelector('#desktop-play-cell-center .combat-turn-order')?.textContent || '',
    recentExchange: document.querySelector('#desktop-play-cell-center .combat-recent-exchange')?.textContent || '',
    centerHasIntentControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.enemyPun < 100, 'Fight should damage a reachable enemy through panel clicks');
  assert.strictEqual(state.targetSelection, null, 'Fight should clear target selection after resolving');
  assert.strictEqual(state.centerSummary, true, 'Combat center should render current-exchange feedback after a panel action');
  assert(state.turnOrder.includes('Current') && state.turnOrder.includes('Next'), 'Combat center should surface passive current and next turn context');
  assert(state.recentExchange.includes('hit') || state.recentExchange.includes('miss'), 'Combat center should surface the resolved exchange text');
  assert.strictEqual(state.centerHasIntentControls, false, 'Combat center feedback should not duplicate intent/action controls');

  await setupCombat(page);
  await clickIntentAndTarget(page, 'flirt');
  state = await page.evaluate(() => ({ enemyPle: App.creatures[0]?.CPle, targetSelection: App.targetSelection }));
  assert(state.enemyPle > 0, 'Flirt should affect a reachable enemy through panel clicks');
  assert.strictEqual(state.targetSelection, null, 'Flirt should clear target selection after resolving');

  await setupCombat(page);
  await clickIntentAndTarget(page, 'fuck');
  state = await page.evaluate(() => ({ enemyPle: App.creatures[0]?.CPle, targetSelection: App.targetSelection }));
  assert(state.enemyPle > 0, 'Social combat action should affect a reachable enemy through panel clicks');
  assert.strictEqual(state.targetSelection, null, 'Social combat action should clear target selection after resolving');

  await setupCombat(page, { enemyOverrides: { CPun: 20, MPun: 100, size: 2 } });
  await clickIntentAndTarget(page, 'feast');
  state = await page.evaluate(() => ({
    stomachCount: App.player.stomach.length,
    enemyVisible: App.creatures.some(c => c.id === 'enemy-1' && c.disposition === App.DISPOSITION.ENEMY)
  }));
  assert.strictEqual(state.stomachCount, 1, 'Feast should contain a weakened reachable enemy through panel clicks');
  assert.strictEqual(state.enemyVisible, false, 'Feast should remove contained enemy from visible enemies');

  await setupCombat(page, { withAlly: true });
  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('feed')"]`).first().click();
  state = await page.evaluate(() => ({
    allyPun: App.party.find(p => p.id === 'ally-1')?.CPun,
    advanced: App._advancedTurn === true
  }));
  assert(state.allyPun > 40, 'Feed should heal the wounded ally through the active party card');
  assert.strictEqual(state.advanced, true, 'Feed should consume the combat turn');
}

async function runReachabilityMatrix(page) {
  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 100, MPun: 100 } });
  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  let target = page.locator('#enemies-content button[data-command-control="mark-combat-target"]').first();
  await target.waitFor({ state: 'visible', timeout: 1000 });
  let attrs = await target.evaluate(el => ({ disabled: el.disabled, ariaDisabled: el.getAttribute('aria-disabled'), label: el.getAttribute('aria-label') || '' }));
  assert.strictEqual(attrs.disabled, true, 'Unreachable fight target should be an actual disabled control');
  assert.strictEqual(attrs.ariaDisabled, 'true', 'Unreachable fight target should expose disabled state accessibly');
  assert(attrs.label.includes('Enemy is airborne'), 'Unreachable fight target should explain the flying reach blocker');
  let state = await page.evaluate(() => ({
    enemyPun: App.creatures[0]?.CPun,
    targetSelectionAction: App.targetSelection?.action || null
  }));
  assert.strictEqual(state.enemyPun, 100, 'Disabled fight target should not damage enemy');
  assert.strictEqual(state.targetSelectionAction, 'fight', 'Disabled fight target should preserve selected intent for correction');

  await page.setViewportSize({ width: 390, height: 844 });
  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 100, MPun: 100 } });
  await page.locator(`#mobile-combat-toolbelt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  target = page.locator('#mobile-creature-strip button[data-command-control="mark-combat-target"]').first();
  await target.waitFor({ state: 'visible', timeout: 1000 });
  attrs = await target.evaluate(el => ({ disabled: el.disabled, ariaDisabled: el.getAttribute('aria-disabled'), label: el.getAttribute('aria-label') || '' }));
  state = await page.evaluate(() => {
    const chip = document.querySelector('#mobile-creature-strip .mobile-unit-chip');
    return {
      chipRow: chip?.getAttribute('data-combat-row') || '',
      selectedTarget: chip?.classList.contains('selected-target') || false,
      targetSelectionAction: App.targetSelection?.action || null,
      enemyPun: App.creatures[0]?.CPun
    };
  });
  assert.strictEqual(attrs.disabled, true, 'Mobile unreachable fight target should be an actual disabled chip control');
  assert.strictEqual(attrs.ariaDisabled, 'true', 'Mobile unreachable fight target should expose disabled state accessibly');
  assert(attrs.label.includes('Enemy is airborne'), 'Mobile unreachable fight target should explain the flying reach blocker');
  assert.strictEqual(state.chipRow, 'back', 'Mobile compact enemy chip should expose row feedback while targeting');
  assert.strictEqual(state.selectedTarget, false, 'Mobile blocked combat target should not be styled as a pickable target');
  assert.strictEqual(state.enemyPun, 100, 'Mobile disabled fight target should not damage enemy');
  assert.strictEqual(state.targetSelectionAction, 'fight', 'Mobile disabled fight target should preserve selected intent for correction');
  await page.setViewportSize({ width: 1365, height: 768 });

  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 20, MPun: 100, size: 2 } });
  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('feast')"]`).first().click();
  target = page.locator('#enemies-content button[data-command-control="mark-combat-target"]').first();
  await target.waitFor({ state: 'visible', timeout: 1000 });
  attrs = await target.evaluate(el => ({ disabled: el.disabled, ariaDisabled: el.getAttribute('aria-disabled'), label: el.getAttribute('aria-label') || '' }));
  assert.strictEqual(attrs.disabled, true, 'Unreachable feast target should be an actual disabled control');
  assert.strictEqual(attrs.ariaDisabled, 'true', 'Unreachable feast target should expose disabled state accessibly');
  assert(attrs.label.includes('Enemy is airborne'), 'Unreachable feast target should explain the flying reach blocker');
  state = await page.evaluate(() => ({
    stomachCount: App.player.stomach.length,
    targetSelectionAction: App.targetSelection?.action || null
  }));
  assert.strictEqual(state.stomachCount, 0, 'Disabled feast target should not contain enemy');
  assert.strictEqual(state.targetSelectionAction, 'feast', 'Disabled feast target should preserve selected intent for correction');

  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 100, MPun: 100 } });
  await clickIntentAndTarget(page, 'flirt');
  state = await page.evaluate(() => ({ enemyPle: App.creatures[0]?.CPle }));
  assert(state.enemyPle > 0, 'Flirt should still target flying back-row enemies because it is not physical reach');

  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 100, MPun: 100 } });
  await clickIntentAndTarget(page, 'fuck');
  state = await page.evaluate(() => ({ enemyPle: App.creatures[0]?.CPle }));
  assert(state.enemyPle > 0, 'Social combat action should still target flying back-row enemies because it is not physical reach');
}

async function runMultiEnemyCombatTargetingFlow(page) {
  const prepare = async () => {
    await setupCombat(page, { enemyOverrides: { id: 'front-enemy', name: 'Frontline', combatRow: 'front', CPun: 100, MPun: 100, flying: false } });
    await page.evaluate(() => {
      App.player.combatRow = 'front';
      App.player.flying = false;
      App.player.ranged = false;
      App.player.antiflying = false;
      App.activeActor = App.player;
      const front = App.creatures[0];
      front.id = 'front-enemy';
      front.name = 'Frontline';
      front.CPun = 100;
      front.MPun = 100;
      front.combatRow = 'front';
      front.flying = false;
      front.disposition = App.DISPOSITION.ENEMY;
      const back = {
        ...front,
        id: 'back-enemy',
        name: 'Backline',
        CPun: 100,
        MPun: 100,
        combatRow: 'back',
        flying: false,
        status: {},
        stomach: [],
        womb: [],
        balls: []
      };
      App.creatures = [front, back];
      App.worldMap.set('0,0', { ...App.worldMap.get('0,0'), creatures: App.creatures });
      App.showActorActions(App.player);
      App.creatures[0].combatRow = 'front';
      App.creatures[1].combatRow = 'back';
      App.renderCreatures();
      App.renderMobileUnitStrips?.();
    });
  };

  await page.setViewportSize({ width: 1365, height: 768 });
  await prepare();
  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('flirt')"]`).first().click();
  let state = await page.evaluate(() => {
    const frontButton = document.querySelector('#enemies-content button[onclick*="front-enemy"]');
    const backButton = document.querySelector('#enemies-content button[onclick*="back-enemy"]');
    const cards = Array.from(document.querySelectorAll('#enemies-content .compact-tactical-card')).map(card => ({
      text: card.innerText || '',
      selectedTarget: card.classList.contains('selected-target'),
      pickState: card.querySelector('[data-selection-mode="combat-target"]')?.getAttribute('data-selection-state') || ''
    }));
    return {
      targetSelection: App.targetSelection?.action || null,
      frontDisabled: frontButton?.hasAttribute('disabled') || false,
      frontAriaDisabled: frontButton?.getAttribute('aria-disabled') || '',
      frontState: frontButton?.getAttribute('data-selection-state') || '',
      frontLabel: frontButton?.getAttribute('aria-label') || '',
      backDisabled: backButton?.hasAttribute('disabled') || false,
      backAriaDisabled: backButton?.getAttribute('aria-disabled') || '',
      backState: backButton?.getAttribute('data-selection-state') || '',
      backLabel: backButton?.getAttribute('aria-label') || '',
      frontCard: cards.find(card => card.text.includes('Frontline')) || null,
      backCard: cards.find(card => card.text.includes('Backline')) || null,
      pickCount: document.querySelectorAll('#enemies-content button[data-command-control="mark-combat-target"]').length,
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.targetSelection, 'flirt', 'Desktop multi-enemy setup should enter Flirt target-pick state');
  assert.strictEqual(state.pickCount, 2, 'Desktop multi-enemy target-pick should expose one mark control per enemy');
  assert.strictEqual(state.frontDisabled, false, 'Desktop front-row enemy should be pickable');
  assert.strictEqual(state.frontAriaDisabled, '', 'Desktop front-row enemy should not expose disabled state');
  assert.strictEqual(state.frontState, 'available', 'Desktop front-row enemy should expose available target state before marking');
  assert(state.frontLabel.includes('Frontline'), 'Desktop front-row pick label should name the target');
  assert.strictEqual(state.backDisabled, false, 'Desktop second enemy should be available for multi-target marking');
  assert.strictEqual(state.backAriaDisabled, '', 'Desktop second enemy should not expose disabled state');
  assert.strictEqual(state.backState, 'available', 'Desktop second enemy should expose available target state before marking');
  assert(state.backLabel.includes('Backline'), 'Desktop second enemy mark label should name the target');
  assert(state.frontCard?.text.includes('Front'), 'Desktop front-row card should show row feedback');
  assert(state.backCard?.text.includes('Backline'), 'Desktop second enemy card should show identity feedback');
  assert.strictEqual(state.frontCard?.selectedTarget, false, 'Desktop unmarked front-row card should not expose selected-target state while picking');
  assert.strictEqual(state.backCard?.selectedTarget, false, 'Desktop unmarked second enemy card should not look selected');
  assert.strictEqual(state.centerHasControls, false, 'Desktop multi-enemy target picking should keep center free of controls');

  await page.locator(`#enemies-content button[onclick*="front-enemy"]`).click();
  await page.locator(`#enemies-content button[onclick*="back-enemy"]`).click();
  state = await page.evaluate(() => ({
    markedTargets: App.combatTargetIds || [],
    targetCount: document.querySelector('#selection-sentence')?.getAttribute('data-command-target-count') || '',
    confirmDisabled: document.querySelector('#desktop-context-belt button[data-command-control="confirm-targets"]')?.hasAttribute('disabled') || false,
    frontSelected: document.querySelector('#enemies-content .compact-tactical-card')?.classList.contains('selected-target') || false
  }));
  assert.deepStrictEqual(state.markedTargets, ['front-enemy', 'back-enemy'], 'Desktop target clicks should mark multiple selected enemies');
  assert.strictEqual(state.targetCount, '2', 'Desktop command sentence should expose marked target count before confirmation');
  assert.strictEqual(state.confirmDisabled, false, 'Desktop target confirmation should enable after a target mark');
  assert.strictEqual(state.frontSelected, true, 'Desktop marked front-row card should expose selected-target state');
  await page.locator('#desktop-context-belt button[data-command-control="confirm-targets"]').click();
  state = await page.evaluate(() => ({
    frontPle: App.creatures.find(unit => unit.id === 'front-enemy')?.CPle,
    backPle: App.creatures.find(unit => unit.id === 'back-enemy')?.CPle,
    targetSelection: App.targetSelection,
    commandSource: App.lastIntentCommand?.source || '',
    commandTargets: App.lastIntentCommand?.targetIds || [],
    centerHasIntentControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.frontPle > 0, 'Desktop confirmation should affect the selected front enemy');
  assert(state.backPle > 0, 'Desktop confirmation should affect the second marked enemy');
  assert.strictEqual(state.targetSelection, null, 'Desktop front-row pick should clear target-pick state');
  assert.strictEqual(state.commandSource, 'combat-composer', 'Desktop front-row confirmation should preserve composer source');
  assert.deepStrictEqual(state.commandTargets, ['front-enemy', 'back-enemy'], 'Desktop confirmation should record every selected enemy id');
  assert.strictEqual(state.centerHasIntentControls, false, 'Desktop multi-enemy resolution should keep center free of intent/action controls');

  await page.setViewportSize({ width: 390, height: 844 });
  await prepare();
  await page.locator(`#mobile-combat-toolbelt button[onclick*="executeCombatIntent('flirt')"]`).first().click();
  state = await page.evaluate(() => {
    const frontButton = document.querySelector('#mobile-creature-strip button[onclick*="front-enemy"]');
    const backButton = document.querySelector('#mobile-creature-strip button[onclick*="back-enemy"]');
    const chips = Array.from(document.querySelectorAll('#mobile-creature-strip .mobile-unit-chip')).map(chip => ({
      text: chip.innerText || '',
      selectedTarget: chip.classList.contains('selected-target'),
      pickState: chip.querySelector('[data-selection-mode="combat-target"]')?.getAttribute('data-selection-state') || ''
    }));
    return {
      targetSelection: App.targetSelection?.action || null,
      frontDisabled: frontButton?.hasAttribute('disabled') || false,
      frontAriaDisabled: frontButton?.getAttribute('aria-disabled') || '',
      frontState: frontButton?.getAttribute('data-selection-state') || '',
      frontLabel: frontButton?.getAttribute('aria-label') || '',
      backDisabled: backButton?.hasAttribute('disabled') || false,
      backAriaDisabled: backButton?.getAttribute('aria-disabled') || '',
      backState: backButton?.getAttribute('data-selection-state') || '',
      backLabel: backButton?.getAttribute('aria-label') || '',
      frontChip: chips.find(chip => chip.text.includes('Frontline')) || null,
      backChip: chips.find(chip => chip.text.includes('Backline')) || null,
      pickCount: document.querySelectorAll('#mobile-creature-strip button[data-command-control="mark-combat-target"]').length,
      toolbeltActive: document.querySelector('#mobile-combat-toolbelt')?.classList.contains('active') || false,
      hasAdventureMark: (document.querySelector('#mobile-creature-strip')?.innerHTML || '').includes("toggleExplorationTarget('creature'"),
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.targetSelection, 'flirt', 'Mobile multi-enemy setup should enter Flirt target-pick state');
  assert.strictEqual(state.pickCount, 2, 'Mobile multi-enemy target-pick should expose one mark control per enemy');
  assert.strictEqual(state.toolbeltActive, true, 'Mobile combat toolbelt should stay active during multi-enemy target-pick');
  assert.strictEqual(state.frontDisabled, false, 'Mobile front-row enemy should be pickable');
  assert.strictEqual(state.frontAriaDisabled, '', 'Mobile front-row enemy should not expose disabled state');
  assert.strictEqual(state.frontState, 'available', 'Mobile front-row enemy should expose available target state before marking');
  assert(state.frontLabel.includes('Frontline'), 'Mobile front-row pick label should name the target');
  assert.strictEqual(state.backDisabled, false, 'Mobile second enemy should be available for multi-target marking');
  assert.strictEqual(state.backAriaDisabled, '', 'Mobile second enemy should not expose disabled state');
  assert.strictEqual(state.backState, 'available', 'Mobile second enemy should expose available target state before marking');
  assert(state.backLabel.includes('Backline'), 'Mobile second enemy mark label should name the target');
  assert(state.frontChip?.text.includes('Front'), 'Mobile front-row chip should show row feedback');
  assert(state.backChip?.text.includes('Backline'), 'Mobile second enemy chip should show identity feedback');
  assert.strictEqual(state.frontChip?.selectedTarget, false, 'Mobile unmarked front-row chip should not expose selected-target state while picking');
  assert.strictEqual(state.backChip?.selectedTarget, false, 'Mobile unmarked second enemy chip should not look selected');
  assert.strictEqual(state.hasAdventureMark, false, 'Mobile combat target-pick should not render adventure target controls');
  assert.strictEqual(state.centerHasControls, false, 'Mobile multi-enemy target picking should keep center free of controls');

  await page.locator(`#mobile-creature-strip button[onclick*="front-enemy"]`).click();
  await page.locator(`#mobile-creature-strip button[onclick*="back-enemy"]`).click();
  state = await page.evaluate(() => ({
    markedTargets: App.combatTargetIds || [],
    targetCount: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-target-count') || '',
    confirmDisabled: document.querySelector('#mobile-combat-toolbelt button[data-command-control="confirm-targets"]')?.hasAttribute('disabled') || false,
    frontSelected: document.querySelector('#mobile-creature-strip .mobile-unit-chip')?.classList.contains('selected-target') || false
  }));
  assert.deepStrictEqual(state.markedTargets, ['front-enemy', 'back-enemy'], 'Mobile target clicks should mark multiple selected enemies');
  assert.strictEqual(state.targetCount, '2', 'Mobile combat toolbelt should expose marked target count before confirmation');
  assert.strictEqual(state.confirmDisabled, false, 'Mobile target confirmation should enable after a target mark');
  assert.strictEqual(state.frontSelected, true, 'Mobile marked front-row chip should expose selected-target state');
  await page.locator('#mobile-combat-toolbelt button[data-command-control="confirm-targets"]').click();
  state = await page.evaluate(() => ({
    frontPle: App.creatures.find(unit => unit.id === 'front-enemy')?.CPle,
    backPle: App.creatures.find(unit => unit.id === 'back-enemy')?.CPle,
    targetSelection: App.targetSelection,
    commandSource: App.lastIntentCommand?.source || '',
    commandTargets: App.lastIntentCommand?.targetIds || [],
    toolbeltActive: document.querySelector('#mobile-combat-toolbelt')?.classList.contains('active') || false,
    centerHasIntentControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.frontPle > 0, 'Mobile confirmation should affect the selected front enemy');
  assert(state.backPle > 0, 'Mobile confirmation should affect the second marked enemy');
  assert.strictEqual(state.targetSelection, null, 'Mobile front-row pick should clear target-pick state');
  assert.strictEqual(state.commandSource, 'combat-composer', 'Mobile front-row confirmation should preserve composer source');
  assert.deepStrictEqual(state.commandTargets, ['front-enemy', 'back-enemy'], 'Mobile confirmation should record every selected enemy id');
  assert.strictEqual(state.toolbeltActive, true, 'Mobile combat toolbelt should remain active after multi-enemy resolution');
  assert.strictEqual(state.centerHasIntentControls, false, 'Mobile multi-enemy resolution should keep center free of intent/action controls');
  await page.setViewportSize({ width: 1365, height: 768 });
}

async function runStaleSyncParticipantFlow(page) {
  await setupCombat(page, { withAlly: true, allyOverrides: { combatRow: 'front' }, enemyOverrides: { combatRow: 'front' } });
  const state = await page.evaluate(() => {
    const ally = App.party.find(unit => unit.id === 'ally-1');
    const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
    App.syncSelection = {
      active: true,
      phase: 'target',
      type: 'sync_fight',
      actorId: App._unitSelectionId(App.player),
      participantIds: [App._unitSelectionId(App.player), App._unitSelectionId(ally)]
    };
    App._syncParticipants = [App.player, ally];
    App._advancedTurn = false;
    const queued = App.queueSyncAction('sync_fight', enemy);
    return {
      queued,
      syncCount: App.combatState.syncActions.length,
      advanced: App._advancedTurn,
      currentActed: Boolean(App.combatState.turnQueue[0]?.actedThisRound),
      phase: App.syncSelection?.phase || null,
      participantIds: (App._syncParticipants || []).map(unit => unit.id || unit.name),
      lastLog: App.log[App.log.length - 1]?.text || ''
    };
  });
  assert.strictEqual(state.queued, false, 'Stale sync participants should be rejected before queueing');
  assert.strictEqual(state.syncCount, 0, 'Rejected stale sync should not create a queued action');
  assert.strictEqual(state.advanced, false, 'Rejected stale sync should not advance the active turn');
  assert.strictEqual(state.currentActed, false, 'Rejected stale sync should not mark the active actor as acted');
  assert.strictEqual(state.phase, 'target', 'Rejected stale sync should preserve target-pick state for correction');
  assert.deepStrictEqual(state.participantIds, ['player-1', 'ally-1'], 'Rejected stale sync should preserve selected participants for correction');
  assert(state.lastLog.includes('Participants are no longer in the turn queue'), 'Rejected stale sync should explain the correction');
}

async function runCombatSlotGroupComposerFlow(page) {
  const prepare = async () => {
    await setupCombat(page, {
      withAlly: true,
      allyOverrides: { combatRow: 'front', Figh: 80 },
      enemyOverrides: { combatRow: 'front', CPun: 100, MPun: 100 }
    });
    await page.evaluate(() => {
      const ally = App.party.find(unit => unit.id === 'ally-1');
      const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
      if (ally && !App.combatState.turnQueue.some(entry => entry.unit === ally)) {
        App.combatState.turnQueue.splice(1, 0, { unit: ally, initiative: 15 });
      }
      App.combatState.currentTurn = 0;
      App.activeActor = App.player;
      App._advancedTurn = false;
      if (enemy) enemy.combatRow = 'front';
      App.showActorActions(App.player);
    });
  };

  await page.setViewportSize({ width: 1365, height: 768 });
  await prepare();
  await page.locator(`#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  let state = await page.evaluate(() => ({
    planActive: Boolean(App.combatPlanSelection?.active),
    source: App.combatPlanSelection?.source || null,
    participants: App._combatPlanActors().map(unit => unit.id || unit.name),
    sentence: document.querySelector('#selection-sentence')?.innerText || '',
    oldConfirmVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-control="confirm-sync-participants"]')),
    confirmGroupVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-control="confirm-combat-plan"]')),
    normalFightVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-intent="fight"]')),
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.planActive, true, 'Desktop actor badge should enter combat planner state');
  assert.strictEqual(state.source, 'combat-planner', 'Desktop actor badge should use combat planner state');
  assert.deepStrictEqual(state.participants, ['player-1', 'ally-1'], 'Desktop actor badge should select current actor plus ally');
  assert(state.sentence.includes('You') && state.sentence.includes('Ally'), 'Desktop group compose sentence should show both actors');
  assert.strictEqual(state.oldConfirmVisible, false, 'Desktop slot group compose should not show old Confirm Participants');
  assert.strictEqual(state.confirmGroupVisible, true, 'Desktop combat planner should expose Confirm Group');
  assert.strictEqual(state.normalFightVisible, true, 'Desktop slot group compose should keep normal intents visible');
  assert.strictEqual(state.centerHasControls, false, 'Desktop slot group compose should keep center stage free of controls');

  await page.locator(`#enemies-content button[data-command-control="mark-combat-target"]`).first().click();
  state = await page.evaluate(() => ({
    targetIds: App.combatTargetIds,
    sentence: document.querySelector('#selection-sentence')?.innerText || '',
    targetState: document.querySelector('#enemies-content button[data-command-control="mark-combat-target"]')?.getAttribute('data-selection-state') || ''
  }));
  assert.deepStrictEqual(state.targetIds, ['enemy-1'], 'Desktop slot group compose should keep enemy Mark usable');
  assert(state.sentence.includes('Enemy'), 'Desktop group compose sentence should show marked enemy target');
  assert.strictEqual(state.targetState, 'selected', 'Desktop marked enemy should expose selected combat target state');

  await page.locator(`#desktop-context-belt button[data-command-intent="fight"]`).first().click();
  state = await page.evaluate(() => ({
    combatPlanSelection: App.combatPlanSelection,
    targetSelection: App.targetSelection,
    syncCount: App.combatState.syncActions.length,
    pendingIntent: App.combatPlanSelection?.pendingIntent || null,
    advanced: App._advancedTurn === true,
    queuedType: App.combatState.syncActions[0]?.type || '',
    queuedTarget: App.combatState.syncActions[0]?.target?.id || '',
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name),
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.combatPlanSelection?.active, true, 'Desktop Fight should arm planner before confirmation');
  assert.strictEqual(state.targetSelection, null, 'Desktop slot group queue should leave no target-pick state');
  assert.strictEqual(state.syncCount, 0, 'Desktop Fight should not queue before Confirm Group');
  assert.strictEqual(state.pendingIntent, 'fight', 'Desktop Fight should become the pending group intent');
  assert.strictEqual(state.advanced, false, 'Desktop armed group plan should not advance the current turn');

  await page.locator(`#desktop-context-belt button[data-command-control="confirm-combat-plan"]`).first().click();
  state = await page.evaluate(() => ({
    combatPlanSelection: App.combatPlanSelection,
    targetSelection: App.targetSelection,
    syncCount: App.combatState.syncActions.length,
    advanced: App._advancedTurn === true,
    queuedType: App.combatState.syncActions[0]?.type || '',
    queuedTarget: App.combatState.syncActions[0]?.target?.id || '',
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name),
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.combatPlanSelection, null, 'Desktop Confirm Group should clear planner state');
  assert.strictEqual(state.targetSelection, null, 'Desktop Confirm Group should leave no target-pick state');
  assert.strictEqual(state.syncCount, 1, 'Desktop Confirm Group should queue one existing Sync action');
  assert.strictEqual(state.advanced, true, 'Desktop Confirm Group should advance the current turn when current actor participates');
  assert.strictEqual(state.queuedType, 'sync_fight', 'Desktop slot group Fight should map to sync_fight');
  assert.strictEqual(state.queuedTarget, 'enemy-1', 'Desktop slot group queue should preserve marked enemy');
  assert.deepStrictEqual(state.queuedParticipants, ['player-1', 'ally-1'], 'Desktop slot group queue should preserve selected actors');
  assert.strictEqual(state.centerHasControls, false, 'Desktop slot group queue should keep center stage free of controls');

  await prepare();
  await page.evaluate(() => {
    const makeUnit = (name, id) => ({
      ...App.player,
      name,
      id,
      icon: id === 'ally-2' ? 'Y' : 'X',
      CPun: 80,
      MPun: 100,
      Figh: 75,
      disposition: App.DISPOSITION.PARTY,
      combatRow: 'front'
    });
    const allyTwo = makeUnit('Ally Two', 'ally-2');
    App.party.push(allyTwo);
    App.combatState.turnQueue.splice(2, 0, { unit: allyTwo, initiative: 12 });
    App.renderParty();
    App.renderDesktopPlaySurface();
    App.renderDesktopCombatComposer(App.player);
  });
  await page.locator(`#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  await page.locator(`#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-2"]`).first().click();
  await page.locator(`#enemies-content button[data-command-control="mark-combat-target"]`).first().click();
  await page.locator(`#desktop-context-belt button[data-command-intent="fight"]`).first().click();
  await page.locator(`#desktop-context-belt button[data-command-control="confirm-combat-plan"]`).first().click();
  state = await page.evaluate(() => ({
    combatPlanSelection: App.combatPlanSelection,
    syncCount: App.combatState.syncActions.length,
    advanced: App._advancedTurn === true,
    currentActed: Boolean(App.combatState.turnQueue[0]?.actedThisRound),
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name)
  }));
  assert.strictEqual(state.combatPlanSelection, null, 'Desktop Confirm Group should clear planner state when lead stays included');
  assert.strictEqual(state.syncCount, 1, 'Desktop Confirm Group should queue one Sync action with the current actor as lead');
  assert.strictEqual(state.advanced, true, 'Desktop Confirm Group should spend the current actor turn when committing the group');
  assert.strictEqual(state.currentActed, true, 'Desktop Confirm Group should mark the current actor as acted');
  assert.deepStrictEqual(state.queuedParticipants, ['player-1', 'ally-1', 'ally-2'], 'Desktop group planning should preserve the current actor as lead');

  await page.setViewportSize({ width: 390, height: 844 });
  await prepare();
  await page.locator(`#mobile-party-strip button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  await page.locator(`#mobile-creature-strip button[data-command-control="mark-combat-target"]`).first().click();
  state = await page.evaluate(() => ({
    planActive: Boolean(App.combatPlanSelection?.active),
    source: App.combatPlanSelection?.source || null,
    participants: App._combatPlanActors().map(unit => unit.id || unit.name),
    sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || '',
    oldConfirmVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-control="confirm-sync-participants"]')),
    confirmGroupVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-control="confirm-combat-plan"]')),
    normalFightVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-intent="fight"]')),
    targetIds: App.combatTargetIds
  }));
  assert.strictEqual(state.planActive, true, 'Mobile actor badge should enter combat planner state');
  assert.strictEqual(state.source, 'combat-planner', 'Mobile actor badge should use combat planner state');
  assert.deepStrictEqual(state.participants, ['player-1', 'ally-1'], 'Mobile actor badge should select current actor plus ally');
  assert(state.sentence.includes('You') && state.sentence.includes('Ally') && state.sentence.includes('Enemy'), 'Mobile compose sentence should show actors and target');
  assert.strictEqual(state.oldConfirmVisible, false, 'Mobile slot group compose should not show old Confirm Participants');
  assert.strictEqual(state.confirmGroupVisible, true, 'Mobile combat planner should expose Confirm Group');
  assert.strictEqual(state.normalFightVisible, true, 'Mobile slot group compose should keep normal intents visible');
  assert.deepStrictEqual(state.targetIds, ['enemy-1'], 'Mobile slot group compose should keep enemy Mark usable');
  assertMobileMicroCardsDoNotOverlap(await mobileMicroCardOverlapMetrics(page, '#mobile-party-strip'), 'Mobile slot group party strip');
  assertMobileMicroCardsDoNotOverlap(await mobileMicroCardOverlapMetrics(page, '#mobile-creature-strip'), 'Mobile slot group enemy strip');

  await page.locator(`#mobile-combat-toolbelt button[data-command-intent="fight"]`).first().click();
  state = await page.evaluate(() => ({
    combatPlanSelection: App.combatPlanSelection,
    syncCount: App.combatState.syncActions.length,
    pendingIntent: App.combatPlanSelection?.pendingIntent || null,
    queuedType: App.combatState.syncActions[0]?.type || '',
    queuedTarget: App.combatState.syncActions[0]?.target?.id || '',
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name)
  }));
  assert.strictEqual(state.combatPlanSelection?.active, true, 'Mobile Fight should arm planner before confirmation');
  assert.strictEqual(state.syncCount, 0, 'Mobile Fight should not queue before Confirm Group');
  assert.strictEqual(state.pendingIntent, 'fight', 'Mobile Fight should become the pending group intent');
  await page.locator(`#mobile-combat-toolbelt button[data-command-control="confirm-combat-plan"]`).first().click();
  state = await page.evaluate(() => ({
    combatPlanSelection: App.combatPlanSelection,
    syncCount: App.combatState.syncActions.length,
    queuedType: App.combatState.syncActions[0]?.type || '',
    queuedTarget: App.combatState.syncActions[0]?.target?.id || '',
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name)
  }));
  assert.strictEqual(state.combatPlanSelection, null, 'Mobile Confirm Group should clear planner state');
  assert.strictEqual(state.syncCount, 1, 'Mobile Confirm Group should queue one existing Sync action');
  assert.strictEqual(state.queuedType, 'sync_fight', 'Mobile slot group Fight should map to sync_fight');
  assert.strictEqual(state.queuedTarget, 'enemy-1', 'Mobile slot group queue should preserve marked enemy');
  assert.deepStrictEqual(state.queuedParticipants, ['player-1', 'ally-1'], 'Mobile slot group queue should preserve selected actors');

  await page.setViewportSize({ width: 1365, height: 768 });
  await prepare();
  await page.locator(`#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  state = await page.evaluate(() => {
    App.executeCombatIntent('fight');
    const queued = App.confirmCombatPlan();
    return {
      queued,
      syncCount: App.combatState.syncActions.length,
      planActive: Boolean(App.combatPlanSelection?.active),
      lastLog: App.log[App.log.length - 1]?.text || ''
    };
  });
  assert.strictEqual(state.queued, false, 'Slot group intent with no target should not queue');
  assert.strictEqual(state.syncCount, 0, 'Slot group missing target should not create a queued action');
  assert.strictEqual(state.planActive, true, 'Slot group missing target should preserve planner state for correction');
  assert(state.lastLog.includes('Choose one target') || state.lastLog.includes('not valid') || state.lastLog.includes('valid'), 'Slot group missing target should report an invalid command');

  await prepare();
  await page.locator(`#enemies-content button[data-command-control="mark-combat-target"]`).first().click();
  await page.locator(`#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  state = await page.evaluate(() => ({
    planActive: Boolean(App.combatPlanSelection?.active),
    source: App.combatPlanSelection?.source || null,
    participants: App._combatPlanActors().map(unit => unit.id || unit.name),
    targetIds: App.combatTargetIds,
    sentence: document.querySelector('#selection-sentence')?.innerText || '',
    clearVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-control="clear-combat-group"]')),
    normalFightVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-intent="fight"]')),
    actorBadgeText: document.querySelector('#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]')?.textContent.trim() || '',
    actorBadgeStyle: document.querySelector('#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]')?.getAttribute('style') || ''
  }));
  assert.strictEqual(state.planActive, true, 'Desktop target-first flow should enter combat planner state');
  assert.strictEqual(state.source, 'combat-planner', 'Desktop target-first flow should preserve the planner source');
  assert.deepStrictEqual(state.participants, ['player-1', 'ally-1'], 'Desktop target-first flow should select current actor plus ally');
  assert.deepStrictEqual(state.targetIds, ['enemy-1'], 'Desktop target-first flow should preserve the already marked enemy');
  assert(state.sentence.includes('You') && state.sentence.includes('Ally') && state.sentence.includes('Enemy'), 'Desktop target-first sentence should show actors and target');
  assert.strictEqual(state.clearVisible, true, 'Desktop slot group compose should expose Clear Group');
  assert.strictEqual(state.normalFightVisible, true, 'Desktop slot group compose should keep normal intents visible next to Clear Group');
  assert.strictEqual(state.actorBadgeText, '', 'Desktop compact combat actor badge should not duplicate the avatar as text');
  assert(state.actorBadgeStyle.includes("--compact-card-icon-content:'X'"), 'Desktop compact combat actor badge should paint the unit avatar/icon');

  await page.locator(`#desktop-context-belt button[data-command-control="clear-combat-group"]`).first().click();
  state = await page.evaluate(() => ({
    combatPlanSelection: App.combatPlanSelection,
    targetIds: App.combatTargetIds,
    normalFightVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-intent="fight"]')),
    clearVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-control="clear-combat-group"]'))
  }));
  assert.strictEqual(state.combatPlanSelection, null, 'Clear Group should exit combat planner state');
  assert.deepStrictEqual(state.targetIds, ['enemy-1'], 'Clear Group should preserve the marked target for normal single-actor correction');
  assert.strictEqual(state.normalFightVisible, true, 'Clear Group should leave normal combat intents usable');
  assert.strictEqual(state.clearVisible, false, 'Clear Group control should disappear after clearing compose state');

  await prepare();
  await page.evaluate(() => {
    const enemyA = App.creatures.find(unit => unit.id === 'enemy-1');
    const enemyB = { ...enemyA, id: 'enemy-2', name: 'Enemy B', CPun: 100, MPun: 100, combatRow: 'front' };
    App.creatures.push(enemyB);
    App.combatState.turnQueue.push({ unit: enemyB, initiative: 9 });
    App.combatTargetIds = ['enemy-1', 'enemy-2'];
    App.combatTargetId = 'enemy-1';
    App.renderCreatures();
    App.renderDesktopPlaySurface();
    App.renderMobileCombatToolbelt();
  });
  await page.locator(`#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  state = await page.evaluate(() => {
    App.executeCombatIntent('fight');
    const queued = App.confirmCombatPlan();
    return {
      queued,
      syncCount: App.combatState.syncActions.length,
      planActive: Boolean(App.combatPlanSelection?.active),
      targetIds: App.combatTargetIds,
      lastLog: App.log[App.log.length - 1]?.text || ''
    };
  });
  assert.strictEqual(state.queued, false, 'Slot group intent with multiple targets should not queue in pass 2');
  assert.strictEqual(state.syncCount, 0, 'Slot group multiple targets should not create a queued action');
  assert.strictEqual(state.planActive, true, 'Slot group multiple targets should preserve planner state for correction');
  assert.deepStrictEqual(state.targetIds, ['enemy-1', 'enemy-2'], 'Slot group multiple targets should preserve selected targets for correction');
  assert(state.lastLog.includes('Choose one target'), 'Slot group multiple targets should explain the one-target correction');

  await prepare();
  await page.locator(`#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  await page.locator(`#enemies-content button[data-command-control="mark-combat-target"]`).first().click();
  state = await page.evaluate(() => {
    const ally = App.party.find(unit => unit.id === 'ally-1');
    ally.CPun = 0;
    App.executeCombatIntent('fight');
    const queued = App.confirmCombatPlan();
    return {
      queued,
      syncCount: App.combatState.syncActions.length,
      planActive: Boolean(App.combatPlanSelection?.active),
      participants: App._combatPlanActors().map(unit => unit.id || unit.name)
    };
  });
  assert.strictEqual(state.queued, false, 'Slot group with incapacitated helper should not queue');
  assert.strictEqual(state.syncCount, 0, 'Incapacitated helper should not create a queued action');
  assert.strictEqual(state.planActive, true, 'Incapacitated helper should leave planner state active for correction');
  assert.deepStrictEqual(state.participants, ['player-1'], 'Incapacitated helper should be removed before queueing');

  await prepare();
  await page.locator(`#party-content button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  await page.locator(`#enemies-content button[data-command-control="mark-combat-target"]`).first().click();
  state = await page.evaluate(() => {
    const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
    enemy.CPun = 0;
    App.executeCombatIntent('fight');
    const queued = App.confirmCombatPlan();
    return {
      queued,
      syncCount: App.combatState.syncActions.length,
      planActive: Boolean(App.combatPlanSelection?.active),
      participants: App._combatPlanActors().map(unit => unit.id || unit.name),
      targetIds: App.combatTargetIds
    };
  });
  assert.strictEqual(state.queued, false, 'Slot group with disappeared target should not queue');
  assert.strictEqual(state.syncCount, 0, 'Disappeared target should not create a queued action');
  assert.strictEqual(state.planActive, true, 'Disappeared target should leave actor planner state active for correction');
  assert.deepStrictEqual(state.participants, ['player-1', 'ally-1'], 'Disappeared target should preserve selected actors');
  assert.deepStrictEqual(state.targetIds, [], 'Disappeared target should clear only target selection');

  await page.setViewportSize({ width: 390, height: 844 });
  await prepare();
  await page.locator(`#mobile-creature-strip button[data-command-control="mark-combat-target"]`).first().click();
  await page.locator(`#mobile-party-strip button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]`).first().click();
  state = await page.evaluate(() => ({
    planActive: Boolean(App.combatPlanSelection?.active),
    participants: App._combatPlanActors().map(unit => unit.id || unit.name),
    targetIds: App.combatTargetIds,
    sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || '',
    clearVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-control="clear-combat-group"]')),
    normalFightVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-intent="fight"]')),
    actorBadgeText: document.querySelector('#mobile-party-strip button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]')?.textContent.trim() || '',
    actorBadgeStyle: document.querySelector('#mobile-party-strip button[data-command-surface="combat-plan-actors"][onclick*="ally-1"]')?.getAttribute('style') || ''
  }));
  assert.strictEqual(state.planActive, true, 'Mobile target-first flow should enter combat planner state');
  assert.deepStrictEqual(state.participants, ['player-1', 'ally-1'], 'Mobile target-first flow should select current actor plus ally');
  assert.deepStrictEqual(state.targetIds, ['enemy-1'], 'Mobile target-first flow should preserve the marked enemy');
  assert(state.sentence.includes('You') && state.sentence.includes('Ally') && state.sentence.includes('Enemy'), 'Mobile target-first sentence should show actors and target');
  assert.strictEqual(state.clearVisible, true, 'Mobile slot group compose should expose Clear Group');
  assert.strictEqual(state.normalFightVisible, true, 'Mobile slot group compose should keep normal intents visible');
  assert.strictEqual(state.actorBadgeText, '', 'Mobile compact combat actor badge should not duplicate the avatar as text');
  assert(state.actorBadgeStyle.includes("--compact-card-icon-content:'X'"), 'Mobile compact combat actor badge should paint the unit avatar/icon');
  await page.locator(`#mobile-combat-toolbelt button[data-command-intent="fight"]`).first().click();
  state = await page.evaluate(() => ({
    combatPlanSelection: App.combatPlanSelection,
    syncCount: App.combatState.syncActions.length,
    pendingIntent: App.combatPlanSelection?.pendingIntent || null,
    queuedType: App.combatState.syncActions[0]?.type || '',
    queuedTarget: App.combatState.syncActions[0]?.target?.id || '',
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name)
  }));
  assert.strictEqual(state.combatPlanSelection?.active, true, 'Mobile target-first Fight should arm planner before confirmation');
  assert.strictEqual(state.syncCount, 0, 'Mobile target-first Fight should not queue before Confirm Group');
  assert.strictEqual(state.pendingIntent, 'fight', 'Mobile target-first Fight should become the pending group intent');
  await page.locator(`#mobile-combat-toolbelt button[data-command-control="confirm-combat-plan"]`).first().click();
  state = await page.evaluate(() => ({
    combatPlanSelection: App.combatPlanSelection,
    syncCount: App.combatState.syncActions.length,
    queuedType: App.combatState.syncActions[0]?.type || '',
    queuedTarget: App.combatState.syncActions[0]?.target?.id || '',
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name)
  }));
  assert.strictEqual(state.combatPlanSelection, null, 'Mobile target-first Confirm Group should clear planner state');
  assert.strictEqual(state.syncCount, 1, 'Mobile target-first Confirm Group should queue one existing Sync action');
  assert.strictEqual(state.queuedType, 'sync_fight', 'Mobile target-first slot group Fight should map to sync_fight');
  assert.strictEqual(state.queuedTarget, 'enemy-1', 'Mobile target-first slot group queue should preserve marked enemy');
  assert.deepStrictEqual(state.queuedParticipants, ['player-1', 'ally-1'], 'Mobile target-first slot group queue should preserve selected actors');
}

async function runDesktopSyncComposerFlow(page) {
  await page.setViewportSize({ width: 1365, height: 768 });
  const prepare = async () => {
    await setupCombat(page, {
      withAlly: true,
      allyOverrides: { combatRow: 'front', Figh: 80 },
      enemyOverrides: { combatRow: 'front', CPun: 100, MPun: 100 }
    });
    await page.evaluate(() => {
      const ally = App.party.find(unit => unit.id === 'ally-1');
      const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
      if (ally && !App.combatState.turnQueue.some(entry => entry.unit === ally)) {
        App.combatState.turnQueue.splice(1, 0, { unit: ally, initiative: 15 });
      }
      App.combatState.currentTurn = 0;
      App.activeActor = App.player;
      App._advancedTurn = false;
      if (enemy) enemy.combatRow = 'front';
      App.showActorActions(App.player);
    });
  };

  await prepare();
  let state = await page.evaluate(() => ({
    syncVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-intent="sync"]'))
  }));
  assert.strictEqual(state.syncVisible, false, 'Desktop primary combat belt should hide Sync by default');
  await page.evaluate(() => App.executeCombatIntent('sync'));
  state = await page.evaluate(() => {
    const tray = document.querySelector('#desktop-context-belt .combat-sync-tray');
    const row = tray?.querySelector('.target-action-row');
    return {
      phase: App.syncSelection?.phase || null,
      surface: tray?.getAttribute('data-command-surface') || '',
      rowSurface: row?.getAttribute('data-command-surface') || '',
      mode: tray?.getAttribute('data-command-mode') || '',
      grammar: tray?.getAttribute('data-command-grammar') || '',
      controls: tray?.innerText || '',
      shellIntent: document.querySelector('#desktop-command-composer')?.getAttribute('data-command-intent') || '',
      beltIntent: document.querySelector('#desktop-context-belt')?.getAttribute('data-command-intent') || '',
      cancelVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-control="cancel-sync"]')),
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.phase, 'choose', 'Desktop Sync should enter choose phase');
  assert.strictEqual(state.surface, 'sync-intents', 'Desktop Sync choose tray should identify the sync intent surface');
  assert.strictEqual(state.rowSurface, 'sync-intents', 'Desktop Sync choose row should identify the sync intent surface');
  assert.strictEqual(state.mode, 'combat', 'Desktop Sync choose tray should identify combat mode');
  assert.strictEqual(state.grammar, 'actor-target-intent', 'Desktop Sync choose tray should preserve shared command grammar');
  assert(state.controls.includes('Group Fight') && state.controls.includes('Cancel Sync'), 'Desktop Sync choose tray should expose group intents and Cancel Sync');
  assert.strictEqual(state.shellIntent, 'sync', 'Desktop command shell should expose Sync as the pending intent');
  assert.strictEqual(state.beltIntent, 'sync', 'Desktop command belt should expose Sync as the pending intent');
  assert.strictEqual(state.cancelVisible, true, 'Desktop Sync choose phase should expose visible Cancel Sync');
  assert.strictEqual(state.centerHasControls, false, 'Desktop Sync choose phase should keep center stage free of combat controls');

  await page.locator(`#desktop-context-belt button[data-command-intent="sync_fight"]`).first().click();
  const allyParticipant = page.locator(`#party-content button[data-selection-mode="sync-participant"][onclick*="ally-1"]`).first();
  await assert.doesNotReject(() => allyParticipant.waitFor({ state: 'visible', timeout: 1000 }), 'Desktop Sync participant phase should expose ally participant controls');
  state = await page.evaluate(() => {
    const tray = document.querySelector('#desktop-context-belt .combat-sync-tray');
    const confirm = document.querySelector('#desktop-context-belt button[data-command-control="confirm-sync-participants"]');
    return {
      phase: App.syncSelection?.phase || null,
      surface: tray?.getAttribute('data-command-surface') || '',
      controls: tray?.innerText || '',
      participantButtons: document.querySelectorAll('#party-content button[data-selection-mode="sync-participant"]').length,
      lockedActorLabel: document.querySelector('#party-content button[data-selection-state="locked"][onclick*="player-1"]')?.getAttribute('aria-label') || '',
      lockedActorCornerSlot: document.querySelector('#party-content button[data-selection-state="locked"][onclick*="player-1"]')?.getAttribute('data-corner-slot') || '',
      lockedActorDisabled: document.querySelector('#party-content button[data-selection-state="locked"][onclick*="player-1"]')?.hasAttribute('disabled') || false,
      lockedActorAriaDisabled: document.querySelector('#party-content button[data-selection-state="locked"][onclick*="player-1"]')?.getAttribute('aria-disabled') || '',
      confirmDisabled: confirm?.hasAttribute('disabled') || false,
      confirmSlot: confirm?.getAttribute('data-command-slot') || '',
      cancelVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-control="cancel-sync"]')),
      shellIntent: document.querySelector('#desktop-command-composer')?.getAttribute('data-command-intent') || '',
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.phase, 'participants', 'Desktop Sync should enter participant phase');
  assert.strictEqual(state.surface, 'sync-participants', 'Desktop Sync participant tray should identify actor selection surface');
  assert(state.controls.includes('Confirm Participants') && state.controls.includes('Cancel Sync'), 'Desktop Sync participant tray should expose Confirm and Cancel Sync');
  assert(state.participantButtons >= 2, 'Desktop Sync participant phase should expose party participant controls');
  assert(state.lockedActorLabel.includes('Current sync actor'), 'Desktop compact Sync locked current actor should keep an accessible label');
  assert.strictEqual(state.lockedActorCornerSlot, 'agency', 'Desktop compact Sync locked current actor should live in the agency corner');
  assert.strictEqual(state.lockedActorDisabled, true, 'Desktop Sync locked current actor should be disabled');
  assert.strictEqual(state.lockedActorAriaDisabled, 'true', 'Desktop Sync locked current actor should expose aria-disabled');
  assert.strictEqual(state.confirmDisabled, true, 'Desktop Sync confirm should stay disabled until a helper is selected');
  assert.strictEqual(state.confirmSlot, 'actor', 'Desktop Sync confirm should identify actor slot completion');
  assert.strictEqual(state.cancelVisible, true, 'Desktop Sync participant phase should expose visible Cancel Sync');
  assert.strictEqual(state.shellIntent, 'sync_fight', 'Desktop command shell should expose chosen group intent during participant phase');
  assert.strictEqual(state.centerHasControls, false, 'Desktop Sync participant phase should keep center stage free of combat controls');

  await allyParticipant.click();
  state = await page.evaluate(() => ({
    participants: App._syncSelectedParticipants().map(unit => unit.id || unit.name),
    confirmDisabled: document.querySelector('#desktop-context-belt button[data-command-control="confirm-sync-participants"]')?.hasAttribute('disabled') || false,
    allySelected: document.querySelector('#party-content button[data-selection-mode="sync-participant"][onclick*="ally-1"]')?.getAttribute('data-selection-state') || '',
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.deepStrictEqual(state.participants, ['player-1', 'ally-1'], 'Desktop Sync participant click should add the ally helper');
  assert.strictEqual(state.confirmDisabled, false, 'Desktop Sync confirm should enable after helper selection');
  assert.strictEqual(state.allySelected, 'selected', 'Desktop Sync helper button should expose selected participant state');
  assert.strictEqual(state.centerHasControls, false, 'Desktop Sync helper selection should keep center stage free of combat controls');

  await page.locator(`#desktop-context-belt button[data-command-control="cancel-sync"]`).click();
  state = await page.evaluate(() => ({
    syncSelection: App.syncSelection,
    targetSelection: App.targetSelection,
    syncVisible: (document.querySelector('#desktop-context-belt')?.innerHTML || '').includes("executeCombatIntent('sync')"),
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.syncSelection, null, 'Desktop Cancel Sync should clear sync selection');
  assert.strictEqual(state.targetSelection, null, 'Desktop Cancel Sync should leave no target selection');
  assert.strictEqual(state.syncVisible, false, 'Desktop primary combat intents should keep Sync hidden after cancelling legacy Sync');
  assert.strictEqual(state.centerHasControls, false, 'Desktop Cancel Sync should keep center stage free of combat controls');

  await prepare();
  await page.evaluate(() => App.executeCombatIntent('sync'));
  await page.locator(`#desktop-context-belt button[data-command-intent="sync_fight"]`).first().click();
  await page.locator(`#party-content button[data-selection-mode="sync-participant"][onclick*="ally-1"]`).first().click();
  await page.locator(`#desktop-context-belt button[data-command-control="confirm-sync-participants"]`).click();
  const syncPick = page.locator('#enemies-content button[data-selection-mode="combat-pick"]').first();
  await assert.doesNotReject(() => syncPick.waitFor({ state: 'visible', timeout: 1000 }), 'Desktop Sync target phase should expose enemy Pick controls');
  await page.evaluate(() => {
    const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
    if (enemy) {
      enemy.combatRow = 'back';
      enemy.flying = true;
    }
    App.renderCreatures();
  });
  state = await page.evaluate(() => {
    const pick = document.querySelector('#enemies-content button[data-selection-mode="combat-pick"]');
    const card = document.querySelector('#enemies-content .compact-tactical-card');
    return {
      disabled: pick?.hasAttribute('disabled') || false,
      ariaDisabled: pick?.getAttribute('aria-disabled') || '',
      disabledClass: pick?.classList.contains('disabled') || false,
      selectionState: pick?.getAttribute('data-selection-state') || '',
      label: pick?.getAttribute('aria-label') || '',
      cardSelectedTarget: card?.classList.contains('selected-target') || false,
      rowFeedback: card?.innerText || ''
    };
  });
  assert.strictEqual(state.disabled, true, 'Desktop unreachable Sync target should be an actual disabled control');
  assert.strictEqual(state.ariaDisabled, 'true', 'Desktop unreachable Sync target should expose aria-disabled');
  assert.strictEqual(state.disabledClass, true, 'Desktop unreachable Sync target should carry disabled visual styling');
  assert.strictEqual(state.selectionState, 'blocked', 'Desktop unreachable Sync target should expose blocked selection state');
  assert(state.label.includes('airborne'), 'Desktop unreachable Sync target should explain the reach blocker');
  assert.strictEqual(state.cardSelectedTarget, false, 'Desktop unreachable Sync target should not look selected');
  assert(state.rowFeedback.includes('Back'), 'Desktop unreachable Sync target card should still show row feedback');
  await page.evaluate(() => {
    const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
    if (enemy) {
      enemy.combatRow = 'front';
      enemy.flying = false;
    }
    App.renderCreatures();
  });
  state = await page.evaluate(() => {
    const tray = document.querySelector('#desktop-context-belt .combat-sync-tray');
    const pick = document.querySelector('#enemies-content button[data-selection-mode="combat-pick"]');
    return {
      phase: App.syncSelection?.phase || null,
      surface: tray?.getAttribute('data-command-surface') || '',
      controls: tray?.innerText || '',
      sentence: document.querySelector('#selection-sentence')?.innerText || '',
      pickVisible: Boolean(pick),
      pickSurface: pick?.getAttribute('data-command-surface') || '',
      pickSlot: pick?.getAttribute('data-command-slot') || '',
      shellIntent: document.querySelector('#desktop-command-composer')?.getAttribute('data-command-intent') || '',
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.phase, 'target', 'Desktop Sync should enter target phase after confirming participants');
  assert.strictEqual(state.surface, 'sync-targeting', 'Desktop Sync target tray should identify target-pick surface');
  assert(state.controls.includes('Cancel Sync'), 'Desktop Sync target tray should expose Cancel Sync');
  assert(state.sentence.includes('You') && state.sentence.includes('Ally') && state.sentence.toLowerCase().includes('pick target'), 'Desktop Sync target phase should show group actor and target sentence');
  assert.strictEqual(state.pickVisible, true, 'Desktop Sync target phase should keep enemy Pick visible');
  assert.strictEqual(state.pickSurface, 'combat-targeting', 'Desktop Sync Pick button should route through combat targeting');
  assert.strictEqual(state.pickSlot, 'target', 'Desktop Sync Pick button should identify the target slot');
  assert.strictEqual(state.shellIntent, 'sync_fight', 'Desktop command shell should preserve group intent during Sync targeting');
  assert.strictEqual(state.centerHasControls, false, 'Desktop Sync target phase should keep center stage free of combat controls');

  await syncPick.click();
  state = await page.evaluate(() => ({
    syncSelection: App.syncSelection,
    targetSelection: App.targetSelection,
    syncCount: App.combatState.syncActions.length,
    advanced: App._advancedTurn === true,
    queuedType: App.combatState.syncActions[0]?.type || '',
    queuedTarget: App.combatState.syncActions[0]?.target?.id || '',
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name),
    partyBadges: Array.from(document.querySelectorAll('#party-content .turn-order-badge')).map(node => node.textContent.trim()).join(' '),
    enemyBadges: Array.from(document.querySelectorAll('#enemies-content .turn-order-badge')).map(node => node.textContent.trim()).join(' '),
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.syncSelection, null, 'Desktop Sync queue should clear sync selection after target pick');
  assert.strictEqual(state.targetSelection, null, 'Desktop Sync queue should leave no target selection after target pick');
  assert.strictEqual(state.syncCount, 1, 'Desktop Sync target pick should queue one group action');
  assert.strictEqual(state.advanced, true, 'Desktop Sync queue should advance the active turn');
  assert.strictEqual(state.queuedType, 'sync_fight', 'Desktop Sync queue should preserve the selected group intent');
  assert.strictEqual(state.queuedTarget, 'enemy-1', 'Desktop Sync queue should preserve the picked enemy target');
  assert.deepStrictEqual(state.queuedParticipants, ['player-1', 'ally-1'], 'Desktop Sync queue should preserve selected participants');
  assert(state.partyBadges.includes('Group'), 'Desktop queued Sync participants should expose group badges on compact cards');
  assert(state.enemyBadges.includes('Target'), 'Desktop queued Sync target should expose target badge on compact cards');
  assert.strictEqual(state.centerHasControls, false, 'Desktop queued Sync should keep center stage free of combat controls');

  state = await page.evaluate(() => {
    App.renderParty();
    App.renderCreatures();
    return {
      partyBadges: Array.from(document.querySelectorAll('#party-content .turn-order-badge')).map(node => node.textContent.trim()).join(' '),
      enemyBadges: Array.from(document.querySelectorAll('#enemies-content .turn-order-badge')).map(node => node.textContent.trim()).join(' '),
      participantControls: document.querySelectorAll('#party-content button[data-selection-mode="sync-participant"]').length,
      combatPickControls: document.querySelectorAll('#enemies-content button[data-selection-mode="combat-pick"]').length,
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert(state.partyBadges.includes('Group'), 'Desktop queued Sync group badges should survive compact party rerender');
  assert(state.enemyBadges.includes('Target'), 'Desktop queued Sync target badge should survive compact target rerender');
  assert.strictEqual(state.participantControls, 0, 'Desktop queued Sync should not leave helper-pick controls after compact rerender');
  assert.strictEqual(state.combatPickControls, 0, 'Desktop queued Sync should not leave target-pick controls after compact rerender');
  assert.strictEqual(state.centerHasControls, false, 'Desktop queued Sync rerender should keep center stage free of combat controls');
}

async function runMobileSyncComposerFlow(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  const prepare = async () => {
    await setupCombat(page, {
      withAlly: true,
      allyOverrides: { combatRow: 'front', Figh: 80 },
      enemyOverrides: { combatRow: 'front', CPun: 100, MPun: 100 }
    });
    await page.evaluate(() => {
      const ally = App.party.find(unit => unit.id === 'ally-1');
      const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
      if (ally && !App.combatState.turnQueue.some(entry => entry.unit === ally)) {
        App.combatState.turnQueue.splice(1, 0, { unit: ally, initiative: 15 });
      }
      App.combatState.currentTurn = 0;
      App.activeActor = App.player;
      App._advancedTurn = false;
      if (enemy) enemy.combatRow = 'front';
      App.showActorActions(App.player);
    });
  };

  await prepare();
  let state = await page.evaluate(() => ({
    syncVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-intent="sync"]'))
  }));
  assert.strictEqual(state.syncVisible, false, 'Mobile primary combat belt should hide Sync by default');
  await page.evaluate(() => App.executeCombatIntent('sync'));
  state = await page.evaluate(() => {
    const tray = document.querySelector('#mobile-combat-toolbelt .mobile-combat-phase-controls');
    const row = tray?.querySelector('.unit-actions');
    return {
      phase: App.syncSelection?.phase || null,
      toolbeltActive: document.querySelector('#mobile-combat-toolbelt')?.classList.contains('active') || false,
      surface: tray?.getAttribute('data-command-surface') || '',
      rowSurface: row?.getAttribute('data-command-surface') || '',
      mode: tray?.getAttribute('data-command-mode') || '',
      grammar: tray?.getAttribute('data-command-grammar') || '',
      controls: tray?.innerText || '',
      toolbeltIntent: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-intent') || '',
      sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || '',
      cancelVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-control="cancel-sync"]')),
      legacyActionsHidden: getComputedStyle(document.querySelector('#mobile-combat-actions')).display === 'none',
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.phase, 'choose', 'Mobile Sync should enter choose phase');
  assert.strictEqual(state.toolbeltActive, true, 'Mobile Sync choose phase should keep the combat toolbelt active');
  assert.strictEqual(state.surface, 'sync-intents', 'Mobile Sync choose tray should identify the sync intent surface');
  assert.strictEqual(state.rowSurface, 'sync-intents', 'Mobile Sync choose row should identify the sync intent surface');
  assert.strictEqual(state.mode, 'combat', 'Mobile Sync choose tray should identify combat mode');
  assert.strictEqual(state.grammar, 'actor-target-intent', 'Mobile Sync choose tray should preserve shared command grammar');
  assert(state.controls.includes('Group Fight') && state.controls.includes('Cancel Sync'), 'Mobile Sync choose tray should expose group intents and Cancel Sync');
  assert.strictEqual(state.toolbeltIntent, 'sync', 'Mobile toolbelt should expose Sync as the pending intent');
  assert(state.sentence.includes('You') && state.sentence.includes('Sync'), 'Mobile Sync choose phase should keep the command sentence visible');
  assert.strictEqual(state.cancelVisible, true, 'Mobile Sync choose phase should expose visible Cancel Sync');
  assert.strictEqual(state.legacyActionsHidden, true, 'Mobile Sync should not revive the legacy combat action bar');
  assert.strictEqual(state.centerHasControls, false, 'Mobile Sync choose phase should keep center stage free of combat controls');
  assertMobileCombatToolbeltTapTargets(await mobileCombatToolbeltMetrics(page), 'Mobile Sync choose phase');

  await page.locator(`#mobile-combat-toolbelt button[data-command-intent="sync_fight"]`).first().click();
  const allyParticipant = page.locator(`#mobile-party-strip button[data-selection-mode="sync-participant"][onclick*="ally-1"]`).first();
  await assert.doesNotReject(() => allyParticipant.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile Sync participant phase should expose ally participant controls');
  state = await page.evaluate(() => {
    const tray = document.querySelector('#mobile-combat-toolbelt .mobile-combat-phase-controls');
    const confirm = document.querySelector('#mobile-combat-toolbelt button[data-command-control="confirm-sync-participants"]');
    return {
      phase: App.syncSelection?.phase || null,
      surface: tray?.getAttribute('data-command-surface') || '',
      controls: tray?.innerText || '',
      participantButtons: document.querySelectorAll('#mobile-party-strip button[data-selection-mode="sync-participant"]').length,
      lockedActorLabel: document.querySelector('#mobile-party-strip button[data-selection-state="locked"][onclick*="player-1"]')?.getAttribute('aria-label') || '',
      lockedActorCornerSlot: document.querySelector('#mobile-party-strip button[data-selection-state="locked"][onclick*="player-1"]')?.getAttribute('data-corner-slot') || '',
      lockedActorDisabled: document.querySelector('#mobile-party-strip button[data-selection-state="locked"][onclick*="player-1"]')?.hasAttribute('disabled') || false,
      lockedActorAriaDisabled: document.querySelector('#mobile-party-strip button[data-selection-state="locked"][onclick*="player-1"]')?.getAttribute('aria-disabled') || '',
      confirmDisabled: confirm?.hasAttribute('disabled') || false,
      confirmSlot: confirm?.getAttribute('data-command-slot') || '',
      cancelVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-control="cancel-sync"]')),
      toolbeltIntent: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-intent') || '',
      sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || '',
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.phase, 'participants', 'Mobile Sync should enter participant phase');
  assert.strictEqual(state.surface, 'sync-participants', 'Mobile Sync participant tray should identify actor selection surface');
  assert(state.controls.includes('Confirm Participants') && state.controls.includes('Cancel Sync'), 'Mobile Sync participant tray should expose Confirm and Cancel Sync');
  assert(state.participantButtons >= 2, 'Mobile Sync participant phase should expose party participant controls');
  assert(state.lockedActorLabel.includes('Current sync actor'), 'Mobile Sync locked current actor should keep an accessible label');
  assert.strictEqual(state.lockedActorCornerSlot, 'agency', 'Mobile Sync locked current actor should live in the agency corner');
  assert.strictEqual(state.lockedActorDisabled, true, 'Mobile Sync locked current actor should be disabled');
  assert.strictEqual(state.lockedActorAriaDisabled, 'true', 'Mobile Sync locked current actor should expose aria-disabled');
  assert.strictEqual(state.confirmDisabled, true, 'Mobile Sync confirm should stay disabled until a helper is selected');
  assert.strictEqual(state.confirmSlot, 'actor', 'Mobile Sync confirm should identify actor slot completion');
  assert.strictEqual(state.cancelVisible, true, 'Mobile Sync participant phase should expose visible Cancel Sync');
  assert.strictEqual(state.toolbeltIntent, 'sync_fight', 'Mobile toolbelt should expose chosen group intent during participant phase');
  assert(state.sentence.includes('You') && state.sentence.includes('Group Fight'), 'Mobile Sync participant phase should show actor and group intent sentence');
  assert.strictEqual(state.centerHasControls, false, 'Mobile Sync participant phase should keep center stage free of combat controls');
  assertMobileCombatToolbeltTapTargets(await mobileCombatToolbeltMetrics(page), 'Mobile Sync participant phase');

  await allyParticipant.click();
  state = await page.evaluate(() => ({
    participants: App._syncSelectedParticipants().map(unit => unit.id || unit.name),
    confirmDisabled: document.querySelector('#mobile-combat-toolbelt button[data-command-control="confirm-sync-participants"]')?.hasAttribute('disabled') || false,
    allySelected: document.querySelector('#mobile-party-strip button[data-selection-mode="sync-participant"][onclick*="ally-1"]')?.getAttribute('data-selection-state') || '',
    allyChipSelectedParticipant: document.querySelector('#mobile-party-strip .mobile-unit-chip.selected-participant')?.textContent.includes('Ally') || false,
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.deepStrictEqual(state.participants, ['player-1', 'ally-1'], 'Mobile Sync participant click should add the ally helper');
  assert.strictEqual(state.confirmDisabled, false, 'Mobile Sync confirm should enable after helper selection');
  assert.strictEqual(state.allySelected, 'selected', 'Mobile Sync helper button should expose selected participant state');
  assert.strictEqual(state.allyChipSelectedParticipant, true, 'Mobile selected Sync helper chip should expose selected participant state');
  assert.strictEqual(state.centerHasControls, false, 'Mobile Sync helper selection should keep center stage free of combat controls');

  await page.locator(`#mobile-combat-toolbelt button[data-command-control="cancel-sync"]`).click();
  state = await page.evaluate(() => ({
    syncSelection: App.syncSelection,
    targetSelection: App.targetSelection,
    syncVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-intent="sync"]')),
    toolbeltActive: document.querySelector('#mobile-combat-toolbelt')?.classList.contains('active') || false,
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.syncSelection, null, 'Mobile Cancel Sync should clear sync selection');
  assert.strictEqual(state.targetSelection, null, 'Mobile Cancel Sync should leave no target selection');
  assert.strictEqual(state.syncVisible, false, 'Mobile primary combat intents should keep Sync hidden after cancelling legacy Sync');
  assert.strictEqual(state.toolbeltActive, true, 'Mobile combat toolbelt should remain active after cancelling Sync');
  assert.strictEqual(state.centerHasControls, false, 'Mobile Cancel Sync should keep center stage free of combat controls');

  await prepare();
  await page.evaluate(() => App.executeCombatIntent('sync'));
  await page.locator(`#mobile-combat-toolbelt button[data-command-intent="sync_fight"]`).first().click();
  await page.locator(`#mobile-party-strip button[data-selection-mode="sync-participant"][onclick*="ally-1"]`).first().click();
  await page.locator(`#mobile-combat-toolbelt button[data-command-control="confirm-sync-participants"]`).click();
  const syncPick = page.locator('#mobile-creature-strip button[data-selection-mode="combat-pick"]').first();
  await assert.doesNotReject(() => syncPick.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile Sync target phase should expose enemy Pick controls');
  await page.evaluate(() => {
    const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
    if (enemy) {
      enemy.combatRow = 'back';
      enemy.flying = true;
    }
    App.renderCreatures();
  });
  state = await page.evaluate(() => {
    const pick = document.querySelector('#mobile-creature-strip button[data-selection-mode="combat-pick"]');
    const chip = document.querySelector('#mobile-creature-strip .mobile-unit-chip');
    return {
      disabled: pick?.hasAttribute('disabled') || false,
      ariaDisabled: pick?.getAttribute('aria-disabled') || '',
      disabledClass: pick?.classList.contains('disabled') || false,
      selectionState: pick?.getAttribute('data-selection-state') || '',
      label: pick?.getAttribute('aria-label') || '',
      chipSelectedTarget: chip?.classList.contains('selected-target') || false,
      rowFeedback: chip?.getAttribute('data-combat-row') || ''
    };
  });
  assert.strictEqual(state.disabled, true, 'Mobile unreachable Sync target should be an actual disabled control');
  assert.strictEqual(state.ariaDisabled, 'true', 'Mobile unreachable Sync target should expose aria-disabled');
  assert.strictEqual(state.disabledClass, true, 'Mobile unreachable Sync target should carry disabled visual styling');
  assert.strictEqual(state.selectionState, 'blocked', 'Mobile unreachable Sync target should expose blocked selection state');
  assert(state.label.includes('airborne'), 'Mobile unreachable Sync target should explain the reach blocker');
  assert.strictEqual(state.chipSelectedTarget, false, 'Mobile unreachable Sync target should not look selected');
  assert.strictEqual(state.rowFeedback, 'back', 'Mobile unreachable Sync target chip should still expose row feedback');
  await page.evaluate(() => {
    const enemy = App.creatures.find(unit => unit.id === 'enemy-1');
    if (enemy) {
      enemy.combatRow = 'front';
      enemy.flying = false;
    }
    App.renderCreatures();
  });
  state = await page.evaluate(() => {
    const tray = document.querySelector('#mobile-combat-toolbelt .mobile-combat-phase-controls');
    const pick = document.querySelector('#mobile-creature-strip button[data-selection-mode="combat-pick"]');
    return {
      phase: App.syncSelection?.phase || null,
      surface: tray?.getAttribute('data-command-surface') || '',
      controls: tray?.innerText || '',
      sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || '',
      pickVisible: Boolean(pick),
      pickSurface: pick?.getAttribute('data-command-surface') || '',
      pickSlot: pick?.getAttribute('data-command-slot') || '',
      toolbeltIntent: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-intent') || '',
      enemySelectedTarget: document.querySelector('#mobile-creature-strip .mobile-unit-chip')?.classList.contains('selected-target') || false,
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.phase, 'target', 'Mobile Sync should enter target phase after confirming participants');
  assert.strictEqual(state.surface, 'sync-targeting', 'Mobile Sync target tray should identify target-pick surface');
  assert(state.controls.includes('Cancel Sync'), 'Mobile Sync target tray should expose Cancel Sync');
  assert(state.sentence.includes('You') && state.sentence.includes('Ally') && state.sentence.toLowerCase().includes('pick target'), 'Mobile Sync target phase should show group actor and target sentence');
  assert.strictEqual(state.pickVisible, true, 'Mobile Sync target phase should keep enemy Pick visible');
  assert.strictEqual(state.pickSurface, 'combat-targeting', 'Mobile Sync Pick button should route through combat targeting');
  assert.strictEqual(state.pickSlot, 'target', 'Mobile Sync Pick button should identify the target slot');
  assert.strictEqual(state.toolbeltIntent, 'sync_fight', 'Mobile toolbelt should preserve group intent during Sync targeting');
  assert.strictEqual(state.enemySelectedTarget, true, 'Mobile Sync target phase should visually mark the pickable enemy');
  assert.strictEqual(state.centerHasControls, false, 'Mobile Sync target phase should keep center stage free of combat controls');
  assertMobileCombatToolbeltTapTargets(await mobileCombatToolbeltMetrics(page), 'Mobile Sync target phase');

  await syncPick.click();
  state = await page.evaluate(() => ({
    syncSelection: App.syncSelection,
    targetSelection: App.targetSelection,
    syncCount: App.combatState.syncActions.length,
    advanced: App._advancedTurn === true,
    queuedType: App.combatState.syncActions[0]?.type || '',
    queuedTarget: App.combatState.syncActions[0]?.target?.id || '',
    queuedParticipants: (App.combatState.syncActions[0]?.participants || []).map(unit => unit.id || unit.name),
    partyGroupCount: document.querySelectorAll('#mobile-party-strip .mobile-unit-chip[data-sync-role="Group"]').length,
    enemyTargetCount: document.querySelectorAll('#mobile-creature-strip .mobile-unit-chip[data-sync-role="Target"]').length,
    toolbeltActive: document.querySelector('#mobile-combat-toolbelt')?.classList.contains('active') || false,
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.syncSelection, null, 'Mobile Sync queue should clear sync selection after target pick');
  assert.strictEqual(state.targetSelection, null, 'Mobile Sync queue should leave no target selection after target pick');
  assert.strictEqual(state.syncCount, 1, 'Mobile Sync target pick should queue one group action');
  assert.strictEqual(state.advanced, true, 'Mobile Sync queue should advance the active turn');
  assert.strictEqual(state.queuedType, 'sync_fight', 'Mobile Sync queue should preserve the selected group intent');
  assert.strictEqual(state.queuedTarget, 'enemy-1', 'Mobile Sync queue should preserve the picked enemy target');
  assert.deepStrictEqual(state.queuedParticipants, ['player-1', 'ally-1'], 'Mobile Sync queue should preserve selected participants');
  assert(state.partyGroupCount >= 1, 'Mobile queued Sync participants should expose group state on compact chips');
  assert(state.enemyTargetCount >= 1, 'Mobile queued Sync target should expose target state on compact chips');
  assert.strictEqual(state.toolbeltActive, true, 'Mobile combat toolbelt should remain active after queueing Sync');
  assert.strictEqual(state.centerHasControls, false, 'Mobile queued Sync should keep center stage free of combat controls');

  state = await page.evaluate(() => {
    App.renderParty();
    App.renderCreatures();
    App.renderMobileCombatToolbelt();
    return {
      partyGroupCount: document.querySelectorAll('#mobile-party-strip .mobile-unit-chip[data-sync-role="Group"]').length,
      enemyTargetCount: document.querySelectorAll('#mobile-creature-strip .mobile-unit-chip[data-sync-role="Target"]').length,
      participantControls: document.querySelectorAll('#mobile-party-strip button[data-selection-mode="sync-participant"]').length,
      combatPickControls: document.querySelectorAll('#mobile-creature-strip button[data-selection-mode="combat-pick"]').length,
      toolbeltActive: document.querySelector('#mobile-combat-toolbelt')?.classList.contains('active') || false,
      centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|selectSyncParticipants|confirmSyncParticipants/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert(state.partyGroupCount >= 1, 'Mobile queued Sync group state should survive compact party rerender');
  assert(state.enemyTargetCount >= 1, 'Mobile queued Sync target state should survive compact target rerender');
  assert.strictEqual(state.participantControls, 0, 'Mobile queued Sync should not leave helper-pick controls after compact rerender');
  assert.strictEqual(state.combatPickControls, 0, 'Mobile queued Sync should not leave target-pick controls after compact rerender');
  assert.strictEqual(state.toolbeltActive, true, 'Mobile combat toolbelt should remain active after queued Sync rerender');
  assert.strictEqual(state.centerHasControls, false, 'Mobile queued Sync rerender should keep center stage free of combat controls');

  await page.setViewportSize({ width: 1365, height: 768 });
}

async function runCombatNonTargetClearFlow(page) {
  await setupCombat(page);
  let state = await page.evaluate(() => {
    App.targetSelection = { action: 'fight', source: 'combat', actorId: 'player-1' };
    App.syncSelection = { active: true, phase: 'choose', actorId: 'player-1', participantIds: ['player-1'], type: null };
    App.feedSelection = { active: true, actorId: 'player-1', subIds: ['heal'] };
    App._advancedTurn = false;
    App.moveCombatRow();
    return {
      row: App.player.combatRow,
      targetSelection: App.targetSelection,
      syncSelection: App.syncSelection,
      feedSelection: App.feedSelection,
      advanced: App._advancedTurn
    };
  });
  assert.strictEqual(state.row, 'back', 'Move Row should still change the active actor row');
  assert.strictEqual(state.targetSelection, null, 'Move Row should clear stale target selection in the built app');
  assert.strictEqual(state.syncSelection, null, 'Move Row should clear stale sync selection in the built app');
  assert.strictEqual(state.feedSelection, null, 'Move Row should clear stale feed selection in the built app');
  assert.strictEqual(state.advanced, true, 'Move Row should still consume the active turn');

  await setupCombat(page, { playerOverrides: { Flee: 1 }, enemyOverrides: { spd: 80 } });
  state = await page.evaluate(() => {
    App._combatStateRoll = () => 1;
    App.targetSelection = { action: 'fight', source: 'combat', actorId: 'player-1' };
    App.syncSelection = { active: true, phase: 'choose', actorId: 'player-1', participantIds: ['player-1'], type: null };
    App.feedSelection = { active: true, actorId: 'player-1', subIds: ['heal'] };
    App._advancedTurn = false;
    App.attemptFlee();
    return {
      active: App.combatState.active,
      targetSelection: App.targetSelection,
      syncSelection: App.syncSelection,
      feedSelection: App.feedSelection,
      advanced: App._advancedTurn,
      lastLog: App.log[App.log.length - 1]?.text || ''
    };
  });
  assert.strictEqual(state.active, true, 'Failed Flee should keep combat active');
  assert.strictEqual(state.targetSelection, null, 'Failed Flee should clear stale target selection in the built app');
  assert.strictEqual(state.syncSelection, null, 'Failed Flee should clear stale sync selection in the built app');
  assert.strictEqual(state.feedSelection, null, 'Failed Flee should clear stale feed selection in the built app');
  assert.strictEqual(state.advanced, true, 'Failed Flee should still consume the active turn');
  assert(state.lastLog.includes('Flee failed'), 'Failed Flee should explain the failed escape');
}

async function runCombatFleeComposerFlow(page) {
  await page.setViewportSize({ width: 1365, height: 768 });
  await setupCombat(page, { playerOverrides: { Flee: 1 }, enemyOverrides: { spd: 80 } });
  await page.evaluate(() => {
    App._combatStateRoll = () => 1;
    App._advancedTurn = false;
    App.showActorActions(App.player);
  });

  let state = await page.evaluate(() => ({
    fleeVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-intent="flee"]')),
    shellSurface: document.querySelector('#desktop-command-composer')?.getAttribute('data-command-surface') || '',
    shellMode: document.querySelector('#desktop-command-composer')?.getAttribute('data-command-mode') || '',
    shellIntent: document.querySelector('#desktop-command-composer')?.getAttribute('data-command-intent') || '',
    partyCardHasFlee: (document.querySelector('#party-content')?.innerHTML || '').includes("executeCombatIntent('flee')"),
    creatureCardHasFlee: (document.querySelector('#enemies-content')?.innerHTML || '').includes("executeCombatIntent('flee')"),
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|attemptFlee/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.fleeVisible, true, 'Desktop combat composer should expose Flee as a visible intent');
  assert.strictEqual(state.shellSurface, 'command-composer', 'Desktop Flee should live inside the command composer shell');
  assert.strictEqual(state.shellMode, 'combat', 'Desktop Flee command shell should identify combat mode');
  assert.strictEqual(state.shellIntent, 'choose', 'Desktop Flee should start from the pending-intent composer state');
  assert.strictEqual(state.partyCardHasFlee, false, 'Desktop party cards should not duplicate Flee outside the composer');
  assert.strictEqual(state.creatureCardHasFlee, false, 'Desktop creature cards should not duplicate Flee outside the composer');
  assert.strictEqual(state.centerHasControls, false, 'Desktop center stage should not own Flee controls');

  await page.locator(`#desktop-context-belt button[data-command-intent="flee"]`).click();
  state = await page.evaluate(() => ({
    combatActive: App.combatState.active,
    advanced: App._advancedTurn === true,
    targetSelection: App.targetSelection,
    syncSelection: App.syncSelection,
    feedSelection: App.feedSelection,
    lastLog: App.log[App.log.length - 1]?.text || '',
    fleeVisible: Boolean(document.querySelector('#desktop-context-belt button[data-command-intent="flee"]')),
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|attemptFlee/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.combatActive, true, 'Failed desktop Flee should keep combat active');
  assert.strictEqual(state.advanced, true, 'Desktop Flee should consume the current actor turn on failure');
  assert.strictEqual(state.targetSelection, null, 'Desktop Flee should leave no target selection');
  assert.strictEqual(state.syncSelection, null, 'Desktop Flee should leave no sync selection');
  assert.strictEqual(state.feedSelection, null, 'Desktop Flee should leave no feed selection');
  assert(state.lastLog.includes('Flee failed'), 'Desktop Flee should report failed escape feedback');
  assert.strictEqual(state.fleeVisible, true, 'Desktop combat composer should remain reachable after failed Flee');
  assert.strictEqual(state.centerHasControls, false, 'Desktop failed Flee should keep center stage free of combat controls');

  await page.setViewportSize({ width: 390, height: 844 });
  await setupCombat(page, { playerOverrides: { Flee: 1 }, enemyOverrides: { spd: 80 } });
  await page.evaluate(() => {
    App._combatStateRoll = () => 1;
    App._advancedTurn = false;
    App.showActorActions(App.player);
  });

  state = await page.evaluate(() => ({
    fleeVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-intent="flee"]')),
    toolbeltSurface: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-surface') || '',
    toolbeltMode: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-mode') || '',
    toolbeltIntent: document.querySelector('#mobile-combat-toolbelt')?.getAttribute('data-command-intent') || '',
    oldMobileBarEmpty: (document.querySelector('#mobile-combat-actions')?.innerHTML || '') === '',
    oldMobileBarDisplay: getComputedStyle(document.querySelector('#mobile-combat-actions')).display,
    partyChipHasFlee: (document.querySelector('#mobile-party-strip')?.innerHTML || '').includes("executeCombatIntent('flee')"),
    creatureChipHasFlee: (document.querySelector('#mobile-creature-strip')?.innerHTML || '').includes("executeCombatIntent('flee')"),
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|attemptFlee/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.fleeVisible, true, 'Mobile combat toolbelt should expose Flee as a visible intent');
  assert.strictEqual(state.toolbeltSurface, 'combat-composer', 'Mobile Flee should live in the combat composer toolbelt');
  assert.strictEqual(state.toolbeltMode, 'combat', 'Mobile Flee toolbelt should identify combat mode');
  assert.strictEqual(state.toolbeltIntent, 'choose', 'Mobile Flee should start from the pending-intent composer state');
  assert.strictEqual(state.oldMobileBarEmpty, true, 'Legacy mobile combat action bar should not duplicate Flee');
  assert.strictEqual(state.oldMobileBarDisplay, 'none', 'Legacy mobile combat action bar should stay hidden');
  assert.strictEqual(state.partyChipHasFlee, false, 'Mobile party chips should not duplicate Flee outside the toolbelt');
  assert.strictEqual(state.creatureChipHasFlee, false, 'Mobile creature chips should not duplicate Flee outside the toolbelt');
  assert.strictEqual(state.centerHasControls, false, 'Mobile combat center stage should not own Flee controls');
  assertMobileCombatToolbeltTapTargets(await mobileCombatToolbeltMetrics(page), 'Mobile Flee intent phase');

  await page.locator(`#mobile-combat-toolbelt button[data-command-intent="flee"]`).click();
  state = await page.evaluate(() => ({
    combatActive: App.combatState.active,
    advanced: App._advancedTurn === true,
    targetSelection: App.targetSelection,
    syncSelection: App.syncSelection,
    feedSelection: App.feedSelection,
    lastLog: App.log[App.log.length - 1]?.text || '',
    fleeVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[data-command-intent="flee"]')),
    toolbeltActive: document.querySelector('#mobile-combat-toolbelt')?.classList.contains('active') || false,
    centerHasControls: /executeCombatIntent|unit-combat-actions|data-command-surface="combat-intents"|attemptFlee/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.combatActive, true, 'Failed mobile Flee should keep combat active');
  assert.strictEqual(state.advanced, true, 'Mobile Flee should consume the current actor turn on failure');
  assert.strictEqual(state.targetSelection, null, 'Mobile Flee should leave no target selection');
  assert.strictEqual(state.syncSelection, null, 'Mobile Flee should leave no sync selection');
  assert.strictEqual(state.feedSelection, null, 'Mobile Flee should leave no feed selection');
  assert(state.lastLog.includes('Flee failed'), 'Mobile Flee should report failed escape feedback');
  assert.strictEqual(state.fleeVisible, true, 'Mobile combat toolbelt should remain reachable after failed Flee');
  assert.strictEqual(state.toolbeltActive, true, 'Mobile combat toolbelt should stay active after failed Flee');
  assert.strictEqual(state.centerHasControls, false, 'Mobile failed Flee should keep center stage free of combat controls');
  assertMobileCombatToolbeltTapTargets(await mobileCombatToolbeltMetrics(page), 'Mobile failed Flee recovery');

  await page.setViewportSize({ width: 1365, height: 768 });
}

async function runAdventureMarkedTargetFlow(page) {
  await setupAdventure(page);
  let center = await page.evaluate(() => document.querySelector('#desktop-play-cell-center')?.innerHTML || '');
  assert(!/selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(center), 'Center tile should not expose actor or target controls in adventure');

  await page.locator(`#party-content button[onclick*="selectExplorationActor(1)"]`).first().click();
  await page.locator(`#enemies-content button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();

  const tray = page.locator('#desktop-context-belt .target-action-row');
  await assert.doesNotReject(() => tray.waitFor({ state: 'visible', timeout: 1000 }), 'Marked target composer should render in the desktop context belt');
  const trayState = await page.evaluate(() => {
    const beltEl = document.querySelector('#desktop-context-belt');
    const sentenceEl = document.querySelector('#selection-sentence');
    const partyContent = document.querySelector('#party-content');
    return {
      partyHasTray: Boolean(partyContent?.querySelector('.panel-interaction-tray')),
      hasComposerSource: beltEl?.innerHTML.includes("resolveExplorationTargetAction('fight','attack','composer-tray')") || false,
      actorSummary: sentenceEl?.textContent?.includes('ActorAlly') || false,
      targetSummary: sentenceEl?.textContent?.includes('TargetFriendly') || false,
      centerHasSentence: Boolean(document.querySelector('#desktop-play-cell-center #selection-sentence')),
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(trayState.partyHasTray, false, 'Party panel should not duplicate the desktop composer tray');
  assert.strictEqual(trayState.hasComposerSource, true, 'Marked target composer should dispatch defaults through the canonical composer command source');
  assert.strictEqual(trayState.actorSummary, true, 'Marked target composer should summarize the selected actor');
  assert.strictEqual(trayState.targetSummary, true, 'Marked target composer should summarize the marked creature target');
  assert.strictEqual(trayState.centerHasSentence, false, 'Center tile should not contain the desktop command sentence slot');
  assert.strictEqual(trayState.centerHasActorControls, false, 'Center tile should stay free of actor controls while a target is marked');

  await page.locator(`#desktop-context-belt button[onclick*="resolveExplorationTargetAction('flirt','tease','composer-tray')"]`).first().click();
  const resolved = await page.evaluate(() => ({
    targetPle: App.creatures.find(unit => unit.id === 'friendly-1')?.CPle,
    targetsRemaining: App.explorationTargetIds.length,
    actors: App._getExplorationActors().map(unit => unit.id),
    commandSource: App.lastIntentCommand?.source || '',
    trayVisible: Boolean(document.querySelector('#desktop-context-belt .target-action-row')),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(resolved.targetPle > 0, 'Composer marked target action should resolve against the marked creature');
  assert.strictEqual(resolved.targetsRemaining, 0, 'Resolved marked target action should clear target marks');
  assert.deepStrictEqual(resolved.actors, ['ally-1'], 'Resolved marked target action should preserve the selected actor');
  assert.strictEqual(resolved.commandSource, 'composer-tray', 'Resolved marked target action should preserve canonical composer source metadata');
  assert.strictEqual(resolved.trayVisible, false, 'Resolved marked target action should remove the composer tray after clearing targets');
  assert.strictEqual(resolved.centerHasActorControls, false, 'Center tile should stay free of actor controls after resolving a marked target action');

  await setupAdventure(page);
  await page.locator(`#party-content button[onclick*="selectExplorationActor(1)"]`).first().click();
  await page.locator(`#enemies-content button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();
  await setupCombat(page);
  const swapped = await page.evaluate(() => ({
    trayVisible: Boolean(document.querySelector('#desktop-context-belt .target-action-row')),
    combatButtons: document.querySelector('#desktop-context-belt')?.innerHTML.includes("executeCombatIntent('fight')") || false,
    creatureMarkButtons: document.querySelector('#enemies-content')?.innerHTML.includes("toggleExplorationTarget('creature'") || false,
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(swapped.trayVisible, false, 'Switching into combat should hide adventure marked-target composer tray');
  assert.strictEqual(swapped.combatButtons, true, 'Switching into combat should render combat intent controls in the desktop composer');
  assert.strictEqual(swapped.creatureMarkButtons, false, 'Switching into combat should replace adventure target marks with combat target picks');
  assert.strictEqual(swapped.centerHasActorControls, false, 'Center tile should stay free of actor controls after switching into combat');
}

async function runDesktopCompactCardRoundTripFlow(page) {
  await page.setViewportSize({ width: 1365, height: 768 });
  await setupAdventure(page);
  await page.evaluate(() => {
    const makeUnit = (name, id, overrides = {}) => ({
      id,
      name,
      species: 'human',
      icon: 'X',
      level: 1,
      CPun: 100,
      MPun: 100,
      CPle: 0,
      MPle: 100,
      Figh: 80,
      Feas: 80,
      Flir: 80,
      Fuck: 40,
      Flee: 80,
      Feed: 40,
      str: 10,
      con: 10,
      spd: 10,
      int: 10,
      wis: 10,
      cha: 10,
      size: 4,
      appetite: 4,
      stomach: [],
      womb: [],
      balls: [],
      bodyParts: [],
      tags: ['Person'],
      status: {},
      disposition: 'party',
      ...overrides
    });
    App.party.push(makeUnit('Scout', 'scout-1', { Figh: 70, Flir: 90 }));
    App.creatures = [
      makeUnit('Friendly', 'friendly-1', { disposition: App.DISPOSITION.FRIENDLY, CPle: 0, con: 1, wis: 1 }),
      makeUnit('Merchant', 'merchant-1', { disposition: App.DISPOSITION.MERCHANT || App.DISPOSITION.FRIENDLY, merchant: true, CPle: 0 }),
      makeUnit('Remains', 'corpse-desktop', { disposition: App.DISPOSITION.CORPSE, CPun: 0, corpseIcon: 'R', remainingPortions: 4 })
    ];
    const tile = App.getTile(0, 0);
    tile.items = [{ id: 'desktop-herb', name: 'Desktop Herb', type: 'resource' }];
    App.explorationActorIds = [App._unitSelectionId(App.player)];
    App.explorationActorId = App.explorationActorIds[0];
    App.explorationActorSelectionExplicit = false;
    App.explorationTargetIds = [];
    App.focusedStageObject = null;
    App.renderDesktopPlaySurface();
    App.renderParty();
    App.renderCreatures();
    App.renderCenterPresence();
    App.renderExplorationActions();
  });

  let state = await page.evaluate(() => ({
    partyCards: document.querySelectorAll('#party-content .compact-tactical-card').length,
    targetCards: document.querySelectorAll('#enemies-content .compact-tactical-card').length,
    desktopPresence: document.querySelector('#desktop-presence-rail')?.innerText || '',
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || ''),
    directIntentControls: /resolveExplorationTargetAction|showIntentMenu\('creature'|selectIntent\('creature'/.test(`${document.querySelector('#party-content')?.innerHTML || ''}${document.querySelector('#enemies-content')?.innerHTML || ''}`)
  }));
  assert(state.partyCards >= 3, 'Desktop compact flow should expose compact party cards for actor selection');
  assert(state.targetCards >= 3, 'Desktop compact flow should expose compact target cards for local creatures and remains');
  assert(state.desktopPresence.includes('Desktop Herb'), 'Desktop presence rail should expose tile items outside the center tile');
  assert.strictEqual(state.centerHasActorControls, false, 'Desktop compact flow should start with center free of actor and target controls');
  assert.strictEqual(state.directIntentControls, false, 'Desktop compact cards should not expose direct primary intent controls');

  await page.locator(`#party-content button[onclick*="selectExplorationActor(1)"]`).first().click();
  await page.locator(`#party-content button[onclick*="selectExplorationActor(2)"]`).first().click();
  await page.locator(`#party-content button[onclick*="toggleExplorationTarget('party','player-1')"]`).first().click();
  await page.locator(`#enemies-content button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();

  state = await page.evaluate(() => {
    const partyHtml = document.querySelector('#party-content')?.innerHTML || '';
    const targetHtml = document.querySelector('#enemies-content')?.innerHTML || '';
    const sentence = document.querySelector('#selection-sentence');
    const belt = document.querySelector('#desktop-context-belt');
    return {
      actors: App._getExplorationActors().map(unit => unit.id),
      targets: [...App.explorationTargetIds].sort(),
      sentenceText: sentence?.innerText || '',
      sentenceActors: sentence?.getAttribute('data-command-actor-count') || '',
      sentenceTargets: sentence?.getAttribute('data-command-target-count') || '',
      beltSurface: belt?.getAttribute('data-command-surface') || '',
      beltActorCount: belt?.getAttribute('data-command-actor-count') || '',
      beltTargetCount: belt?.getAttribute('data-command-target-count') || '',
      trayText: belt?.innerText || '',
      allySelected: Boolean(Array.from(document.querySelectorAll('#party-content .compact-tactical-card')).find(card => card.textContent.includes('Ally'))?.classList.contains('selected-actor')),
      scoutSelected: Boolean(Array.from(document.querySelectorAll('#party-content .compact-tactical-card')).find(card => card.textContent.includes('Scout'))?.classList.contains('selected-actor')),
      playerTargeted: Boolean(Array.from(document.querySelectorAll('#party-content .compact-tactical-card')).find(card => card.textContent.includes('You'))?.classList.contains('selected-target')),
      friendlyTargeted: Boolean(Array.from(document.querySelectorAll('#enemies-content .compact-tactical-card')).find(card => card.textContent.includes('Friendly'))?.classList.contains('selected-target')),
      partyDetailOpen: Boolean(document.querySelector('#party-content .party-panel-detail')),
      targetDetailOpen: Boolean(document.querySelector('#enemies-content .creature-panel-detail')),
      sidePanelDirectIntents: /resolveExplorationTargetAction|showIntentMenu\('creature'|selectIntent\('creature'/.test(`${partyHtml}${targetHtml}`),
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Desktop compact cards should support multiple selected party actors');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1', 'party:player-1'], 'Desktop compact cards should support mixed creature and party targets');
  assert.strictEqual(state.sentenceActors, '2', 'Desktop command sentence should expose selected actor count');
  assert.strictEqual(state.sentenceTargets, '2', 'Desktop command sentence should expose selected target count');
  assert(state.sentenceText.includes('Ally') && state.sentenceText.includes('Friendly'), 'Desktop command sentence should summarize selected actors and targets');
  assert.strictEqual(state.beltSurface, 'target-intents', 'Desktop marked-target controls should live in the composer belt');
  assert.strictEqual(state.beltActorCount, '2', 'Desktop composer belt should mirror selected actor count');
  assert.strictEqual(state.beltTargetCount, '2', 'Desktop composer belt should mirror selected target count');
  assert(state.trayText.includes('Fight') && state.trayText.includes('Clear'), 'Desktop composer belt should expose valid target intents and exits');
  assert.strictEqual(state.allySelected, true, 'Desktop Ally compact card should show selected actor state');
  assert.strictEqual(state.scoutSelected, true, 'Desktop Scout compact card should show selected actor state');
  assert.strictEqual(state.playerTargeted, true, 'Desktop player compact card should show selected target state');
  assert.strictEqual(state.friendlyTargeted, true, 'Desktop creature compact card should show selected target state');
  assert.strictEqual(state.partyDetailOpen, false, 'Desktop compact selection should not open Party details');
  assert.strictEqual(state.targetDetailOpen, false, 'Desktop compact selection should not open Creature details');
  assert.strictEqual(state.sidePanelDirectIntents, false, 'Desktop compact side panels should not duplicate composer-owned target intents');
  assert.strictEqual(state.centerHasActorControls, false, 'Desktop compact selection should keep center free of actor controls');

  await page.locator(`#party-content .compact-tactical-card[onclick="App.toggleUnit(1,'party')"]`).click();
  state = await page.evaluate(() => ({
    allyExpanded: Boolean(App.party.find(unit => unit.id === 'ally-1')?.expanded),
    statsVisible: Boolean(document.querySelector('#party-content button[data-command-control="open-party-stats"]')),
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    sentenceText: document.querySelector('#selection-sentence')?.innerText || '',
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.allyExpanded, true, 'Desktop card body click should open opt-in party details');
  assert.strictEqual(state.statsVisible, true, 'Expanded desktop party card should expose Stats as a detail command');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Opening desktop party card details should preserve selected actors');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1', 'party:player-1'], 'Opening desktop party card details should preserve marked targets');
  assert(state.sentenceText.includes('Ally') && state.sentenceText.includes('Friendly'), 'Expanded desktop party card should leave the composer sentence intact');
  assert.strictEqual(state.centerHasActorControls, false, 'Expanded desktop party details should keep center free of actor controls');

  await page.locator(`#party-content button[data-command-control="open-party-stats"]`).first().click();
  state = await page.evaluate(() => ({
    statsDetailOpen: Boolean(document.querySelector('#party-content .party-stats-view')),
    partyPanelFocused: document.querySelector('#panel-party')?.classList.contains('nav-focus') || false,
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    sentenceText: document.querySelector('#selection-sentence')?.innerText || '',
    trayText: document.querySelector('#desktop-context-belt')?.innerText || '',
    centerLeak: (document.querySelector('#scene-description')?.innerHTML || '').includes('party-stats-view'),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.statsDetailOpen, true, 'Desktop Stats should open as a Party detail surface');
  assert.strictEqual(state.partyPanelFocused, true, 'Desktop Stats should focus the Party detail panel without opening mobile drawers');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Opening desktop Stats should preserve selected actors');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1', 'party:player-1'], 'Opening desktop Stats should preserve marked targets');
  assert(state.sentenceText.includes('Ally') && state.sentenceText.includes('Friendly'), 'Desktop Stats should leave the composer sentence intact');
  assert(state.trayText.includes('Fight') && state.trayText.includes('Clear'), 'Desktop Stats should leave composer target intents reachable');
  assert.strictEqual(state.centerLeak, false, 'Desktop Stats should not leak detail markup into center presentation');
  assert.strictEqual(state.centerHasActorControls, false, 'Desktop Stats should keep center free of actor controls');

  await page.locator(`#party-content button[data-command-control="close-stats"]`).first().click();
  state = await page.evaluate(() => ({
    statsDetailOpen: Boolean(document.querySelector('#party-content .party-stats-view')),
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    partyCompactCards: document.querySelectorAll('#party-content .compact-tactical-card').length,
    sentenceText: document.querySelector('#selection-sentence')?.innerText || '',
    trayText: document.querySelector('#desktop-context-belt')?.innerText || ''
  }));
  assert.strictEqual(state.statsDetailOpen, false, 'Closing desktop Stats should return to the Party card surface');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Closing desktop Stats should preserve selected actors');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1', 'party:player-1'], 'Closing desktop Stats should preserve marked targets');
  assert(state.partyCompactCards >= 2, 'Closing desktop Stats should restore compact party cards');
  assert(state.sentenceText.includes('Ally') && state.sentenceText.includes('Friendly'), 'Closing desktop Stats should keep the composer sentence visible');
  assert(state.trayText.includes('Fight') && state.trayText.includes('Clear'), 'Closing desktop Stats should keep composer target intents visible');

  await page.locator(`#desktop-context-belt button[onclick*="resolveExplorationTargetAction('flirt','tease','composer-tray')"]`).first().click();
  state = await page.evaluate(() => ({
    commandAction: App.lastIntentCommand?.action || '',
    commandSubAction: App.lastIntentCommand?.subAction || '',
    commandSource: App.lastIntentCommand?.source || '',
    commandActors: App.lastIntentCommand?.actorIds || [],
    commandTargets: App.lastIntentCommand?.targetIds || [],
    targetsRemaining: [...App.explorationTargetIds],
    friendlyPleasure: App.creatures.find(unit => unit.id === 'friendly-1')?.CPle || 0,
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.commandAction, 'flirt', 'Desktop compact-card intent should resolve through shared intent dispatch');
  assert.strictEqual(state.commandSubAction, 'tease', 'Desktop compact-card intent should preserve the selected safe sub-action');
  assert.strictEqual(state.commandSource, 'composer-tray', 'Desktop compact-card intent should preserve composer source metadata');
  assert.deepStrictEqual(state.commandActors, ['ally-1', 'scout-1'], 'Desktop compact-card intent should record selected actors');
  assert(state.commandTargets.includes('friendly-1') && state.commandTargets.includes('player-1'), 'Desktop compact-card intent should record mixed party and creature targets');
  assert.strictEqual(state.targetsRemaining.length, 0, 'Resolving desktop compact-card intent should intentionally clear marked targets');
  assert(state.friendlyPleasure > 0, 'Desktop compact-card safe intent should affect the marked creature');
  assert.strictEqual(state.centerHasActorControls, false, 'Resolving desktop compact-card intent should keep center free of actor controls');
}

async function runStaleMarkedActorFlow(page) {
  await setupAdventure(page);
  await page.locator(`#enemies-content button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();
  await page.evaluate(() => {
    App.explorationActorIds = ['missing-actor'];
    App.explorationActorId = 'missing-actor';
    App.lastIntentCommand = null;
    App.renderParty();
    App.renderCreatures();
    App.renderExplorationActions();
  });

  const tray = page.locator('#desktop-context-belt .target-action-row');
  await assert.doesNotReject(() => tray.waitFor({ state: 'visible', timeout: 1000 }), 'Stale actor marked-target composer should still render for correction');

  let state = await page.evaluate(() => {
    const trayEl = document.querySelector('#selection-sentence');
    return {
      trayText: trayEl?.textContent || '',
      trayHasPlayerPrimary: trayEl?.textContent?.includes('Primary: You') || false,
      targetPle: App.creatures.find(unit => unit.id === 'friendly-1')?.CPle,
      actorIds: [...App.explorationActorIds],
      targetIds: [...App.explorationTargetIds],
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert(state.trayText.includes('Select a living actor'), 'Stale actor composer should explain that an actor must be selected');
  assert.strictEqual(state.trayHasPlayerPrimary, false, 'Stale actor composer should not present the player as primary actor');
  assert.strictEqual(state.targetPle, 0, 'Stale actor setup should start before target mutation');
  assert.deepStrictEqual(state.actorIds, ['missing-actor'], 'Stale actor setup should preserve explicit invalid actor id');
  assert.deepStrictEqual(state.targetIds, ['creature:friendly-1'], 'Stale actor setup should preserve marked creature target');
  assert.strictEqual(state.centerHasActorControls, false, 'Stale actor composer should keep center free of actor controls');

  await page.locator(`#desktop-context-belt button[onclick*="resolveExplorationTargetAction('flirt','tease','composer-tray')"]`).first().click();
  state = await page.evaluate(() => ({
    targetPle: App.creatures.find(unit => unit.id === 'friendly-1')?.CPle,
    actorIds: [...App.explorationActorIds],
    targetIds: [...App.explorationTargetIds],
    lastCommand: App.lastIntentCommand,
    lastLog: App.log[App.log.length - 1]?.text || '',
    trayVisible: Boolean(document.querySelector('#desktop-context-belt .target-action-row')),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.targetPle, 0, 'Stale actor marked-target action should not fall back to player and mutate target');
  assert.deepStrictEqual(state.actorIds, ['missing-actor'], 'Stale actor rejection should preserve actor selection for correction');
  assert.deepStrictEqual(state.targetIds, ['creature:friendly-1'], 'Stale actor rejection should preserve marked target for correction');
  assert.strictEqual(state.lastCommand, null, 'Stale actor rejection should not record a resolved intent command');
  assert(state.lastLog.includes('Select a living actor before using talk on marked targets.'), 'Stale actor rejection should log correction guidance');
  assert.strictEqual(state.trayVisible, true, 'Stale actor rejection should keep the tray visible for correction');
  assert.strictEqual(state.centerHasActorControls, false, 'Stale actor rejection should keep center free of actor controls');
}

async function runSelectionSemanticsFlow(page) {
  await setupAdventure(page);

  const initial = await page.evaluate(() => ({
    actors: App._getExplorationActors().map(unit => unit.id || unit.name),
    targets: [...App.explorationTargetIds],
    partyCards: Array.from(document.querySelectorAll('#party-content .unit-card')).map(card => ({
      purpose: card.getAttribute('data-card-purpose'),
      label: card.getAttribute('aria-label') || '',
      selectedActor: card.classList.contains('selected-actor'),
      selectedTarget: card.classList.contains('selected-target'),
      actorButtonState: card.querySelector('[data-selection-control="actor"]')?.getAttribute('data-selection-state') || '',
      actorButtonLabel: card.querySelector('[data-selection-control="actor"]')?.getAttribute('aria-label') || ''
    }))
  }));
  assert.deepStrictEqual(initial.actors, ['player-1'], 'Adventure should start with the player as selected actor');
  assert.deepStrictEqual(initial.targets, [], 'Adventure should start with no marked targets');
  assert.strictEqual(initial.partyCards[0]?.purpose, 'detail-toggle', 'Party card click target should be explicitly scoped to detail toggling');
  assert(initial.partyCards[0]?.label.includes('Show details for You'), 'Party card detail label should describe details, not action selection');
  assert.strictEqual(initial.partyCards[0]?.selectedActor, false, 'Implicit player fallback should not render as explicit actor selection');
  assert.strictEqual(initial.partyCards[0]?.actorButtonState, 'available', 'Implicit player actor button should remain available until explicitly selected');
  assert(initial.partyCards[0]?.actorButtonLabel.includes('Add You as actor'), 'Implicit player actor button should promote explicit selection');
  assert.strictEqual(initial.partyCards[0]?.selectedTarget, false, 'Player card should not imply target state');

  await page.locator('#party-content .unit-card').nth(1).click({ position: { x: 24, y: 64 } });
  let state = await page.evaluate(() => ({
    allyExpanded: Boolean(App.party.find(unit => unit.id === 'ally-1')?.expanded),
    actors: App._getExplorationActors().map(unit => unit.id || unit.name),
    targets: [...App.explorationTargetIds]
  }));
  assert.strictEqual(state.allyExpanded, true, 'Clicking the party card body should focus/expand the card');
  assert.deepStrictEqual(state.actors, ['player-1'], 'Card focus should not change selected actor');
  assert.deepStrictEqual(state.targets, [], 'Card focus should not mark a target');

  const allyAct = page.locator(`#party-content button[data-selection-mode="act-actor"][onclick*="selectExplorationActor(1)"]`).first();
  await allyAct.click();
  state = await page.evaluate(() => {
    const allyCard = Array.from(document.querySelectorAll('#party-content .unit-card')).find(card => card.textContent.includes('Ally'));
    const allyActButton = document.querySelector(`#party-content button[data-selection-mode="act-actor"][onclick*="selectExplorationActor(1)"]`);
    return {
      actors: App._getExplorationActors().map(unit => unit.id || unit.name),
      targets: [...App.explorationTargetIds],
      allySelectedActor: allyCard?.classList.contains('selected-actor') || false,
      allySelectedTarget: allyCard?.classList.contains('selected-target') || false,
      actState: allyActButton?.getAttribute('data-selection-state') || '',
      actPressed: allyActButton?.getAttribute('aria-pressed') || ''
    };
  });
  assert.deepStrictEqual(state.actors, ['ally-1'], 'Act should select the party card as the actor');
  assert.deepStrictEqual(state.targets, [], 'Act should not mark the party card as a target');
  assert.strictEqual(state.allySelectedActor, true, 'Act-selected party card should expose selected-actor state');
  assert.strictEqual(state.allySelectedTarget, false, 'Act-selected party card should not expose selected-target state');
  assert.strictEqual(state.actState, 'selected', 'Act control should expose selected state');
  assert.strictEqual(state.actPressed, 'true', 'Act control should expose pressed state');

  const creatureMark = page.locator(`#enemies-content button[data-selection-mode="mark-target"][onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first();
  await creatureMark.click();
  state = await page.evaluate(() => {
    const creatureCard = document.querySelector('#enemies-content .unit-card');
    const markButton = document.querySelector(`#enemies-content button[data-selection-mode="mark-target"][onclick*="toggleExplorationTarget('creature','friendly-1')"]`);
    return {
      actors: App._getExplorationActors().map(unit => unit.id || unit.name),
      targets: [...App.explorationTargetIds],
      creatureSelectedActor: creatureCard?.classList.contains('selected-actor') || false,
      creatureSelectedTarget: creatureCard?.classList.contains('selected-target') || false,
      markState: markButton?.getAttribute('data-selection-state') || '',
      markPressed: markButton?.getAttribute('aria-pressed') || '',
      creatureHasVisibleIntentMenu: (document.querySelector('#enemies-content')?.innerHTML || '').includes("showIntentMenu('creature','friendly-1'")
    };
  });
  assert.deepStrictEqual(state.actors, ['ally-1'], 'Mark should preserve the selected actor');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1'], 'Mark should select the creature as an adventure target');
  assert.strictEqual(state.creatureSelectedActor, false, 'Marked creature should not appear as an actor');
  assert.strictEqual(state.creatureSelectedTarget, true, 'Marked creature should expose selected-target state');
  assert.strictEqual(state.markState, 'marked', 'Mark control should expose marked state');
  assert.strictEqual(state.markPressed, 'true', 'Mark control should expose pressed state');
  assert.strictEqual(state.creatureHasVisibleIntentMenu, false, 'Living creature card should not expose a redundant visible action popup when marking owns shared actions');

  await page.locator('#enemies-content .unit-card').first().click({ position: { x: 24, y: 64 } });
  state = await page.evaluate(() => ({
    creatureExpanded: Boolean(App.creatures.find(unit => unit.id === 'friendly-1')?.expanded),
    actors: App._getExplorationActors().map(unit => unit.id || unit.name),
    targets: [...App.explorationTargetIds]
  }));
  assert.strictEqual(state.creatureExpanded, true, 'Clicking a marked creature card body should still only focus/expand the card');
  assert.deepStrictEqual(state.actors, ['ally-1'], 'Creature focus should not change selected actor');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1'], 'Creature focus should not clear or add target marks');

  await setupCombat(page);
  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  state = await page.evaluate(() => {
    const enemyCard = document.querySelector('#enemies-content .unit-card');
    const pick = document.querySelector('#enemies-content button[data-command-control="mark-combat-target"]');
    return {
      targetSelection: App.targetSelection?.action || null,
      adventureTargets: [...App.explorationTargetIds],
      enemySelectedTarget: enemyCard?.classList.contains('selected-target') || false,
      pickState: pick?.getAttribute('data-selection-state') || '',
      pickControl: pick?.getAttribute('data-selection-control') || '',
      hasAdventureMark: (document.querySelector('#enemies-content')?.innerHTML || '').includes("toggleExplorationTarget('creature'")
    };
  });
  assert.strictEqual(state.targetSelection, 'fight', 'Combat Fight should enter combat target-pick state');
  assert.deepStrictEqual(state.adventureTargets, [], 'Combat target picking should not reuse adventure marked targets');
  assert.strictEqual(state.enemySelectedTarget, false, 'Combat unmarked enemy should not expose selected target state');
  assert.strictEqual(state.pickControl, 'combat-target', 'Combat target mark button should use combat-target control semantics');
  assert.strictEqual(state.pickState, 'available', 'Combat target mark button should expose available state');
  assert.strictEqual(state.hasAdventureMark, false, 'Combat target picking should not render adventure Mark controls');

  await page.setViewportSize({ width: 412, height: 915 });
  await setupCombat(page);
  await page.evaluate(() => {
    App.executeCombatIntent('fight');
    if (typeof App.openPanelFromRail === 'function') App.openPanelFromRail('enemies', 'target');
    else if (typeof togglePanel === 'function') togglePanel('enemies');
  });
  state = await page.evaluate(() => {
    const pick = document.querySelector('#enemies-content button[data-command-control="mark-combat-target"]');
    const rect = pick?.getBoundingClientRect();
    const style = pick ? getComputedStyle(pick) : null;
    const before = pick ? getComputedStyle(pick, '::before') : null;
    return {
      pickExists: Boolean(pick),
      pickText: pick?.textContent.trim() || '',
      pickTitle: pick?.getAttribute('title') || '',
      pickAriaLabel: pick?.getAttribute('aria-label') || '',
      pickWidth: rect?.width || 0,
      pickHeight: rect?.height || 0,
      pickFontSize: style ? parseFloat(style.fontSize) || 0 : 0,
      pickBeforeContent: before?.content || '',
      pickBeforeColor: before?.color || ''
    };
  });
  assert.strictEqual(state.pickExists, true, 'Mobile drawer combat target picking should render a target mark control');
  assert.strictEqual(state.pickText, 'Target', 'Mobile drawer target mark should retain accessible DOM text');
  assert(state.pickTitle && state.pickAriaLabel, 'Mobile drawer icon-only target mark should keep title and aria-label text');
  assert(state.pickWidth <= 44 && state.pickHeight >= 44, 'Mobile drawer target mark should render as a compact icon-sized touch target');
  assert.strictEqual(state.pickFontSize, 0, 'Mobile drawer target mark should hide visible text labels');
  assert(state.pickBeforeContent.includes('⌖'), 'Mobile drawer target mark should render the target icon glyph');
  assert(state.pickBeforeColor.includes('184') || state.pickBeforeColor.includes('255'), 'Mobile drawer target mark icon should use warning/yellow color treatment');
  await page.evaluate(() => App.closeAllPanels());
  await page.setViewportSize({ width: 1365, height: 768 });
}

async function runCenterResourceSearchFlow(page) {
  await setupAdventure(page);
  await page.evaluate(() => {
    App.worldMeta = { worldId: 'browser-resource-world', seed: 'browser-resource-seed', generatorVersion: 2, mapModsHash: 'core' };
    App.location = { x: 4, y: 0 };
    App.currentBiome = 'grove';
    App.inventory = [];
    App.timeHour = 8;
    App.dayCount = 1;
    const tile = {
      ...App.getBaseTile(4, 0),
      x: 4,
      y: 0,
      explored: true,
      biome: 'grove',
      description: 'A marked berry thicket.',
      creatures: [],
      items: [],
      overlays: { poi: { category: 'resourceSite' } }
    };
    App.worldMap = new Map([['4,0', tile]]);
    App.tileDeltas = new Map();
    App.exploredTiles = new Set(['4,0']);
    App.showExplorationActions();
    App.renderDesktopPlaySurface();
  });

  const search = page.locator(`#desktop-context-belt button[onclick*="App.search()"]`).first();
  await assert.doesNotReject(() => search.waitFor({ state: 'visible', timeout: 1000 }), 'Search should render in the desktop context belt on a searchable resource-site tile');

  let state = await page.evaluate(() => ({
    contextTitle: document.querySelector('#scene-title')?.textContent || '',
    contextDescription: document.querySelector('#scene-description')?.textContent || '',
    desktopSearchVisible: Boolean(document.querySelector('#desktop-context-belt button[onclick*="App.search()"]')),
    mobileSearchVisible: Boolean(document.querySelector('#mobile-explore-actions button[onclick*="App.search()"]')),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.contextTitle.includes('Grove') || state.contextTitle.includes('Road') || state.contextTitle.includes('Tile'), 'Center context should continue to own the current tile title');
  assert(state.contextDescription.includes('berry thicket'), 'Center context should describe the searchable resource tile');
  assert.strictEqual(state.desktopSearchVisible, true, 'Desktop context belt should expose Search before resource-site consumption');
  assert.strictEqual(state.mobileSearchVisible, true, 'Mobile location actions should expose Search before resource-site consumption');
  assert.strictEqual(state.centerHasActorControls, false, 'Resource-site center context should not expose actor controls');

  await search.click();

  state = await page.evaluate(() => ({
    inventoryCount: App.inventory.length,
    inventoryName: App.inventory[0]?.name || '',
    tileSearched: App.getTile(4, 0)?.resourceSearched === true,
    deltaSearched: App.getTileDelta(4, 0)?.resourceSearched === true,
    desktopSearchVisible: Boolean(document.querySelector('#desktop-context-belt button[onclick*="App.search()"]')),
    mobileSearchVisible: Boolean(document.querySelector('#mobile-explore-actions button[onclick*="App.search()"]')),
    latestLog: App.log[App.log.length - 1]?.text || '',
    latestEvent: App.tileEvents[App.tileEvents.length - 1]?.text || '',
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.inventoryCount, 1, 'Clicking Search should grant one resource-site item through the browser UI');
  assert(state.inventoryName, 'Resource-site Search should name the found item');
  assert.strictEqual(state.tileSearched, true, 'Clicking Search should mark the resource-site tile consumed');
  assert.strictEqual(state.deltaSearched, true, 'Clicking Search should persist resource-site consumption as a tile delta');
  assert.strictEqual(state.desktopSearchVisible, false, 'Consumed resource sites should remove desktop Search');
  assert.strictEqual(state.mobileSearchVisible, false, 'Consumed resource sites should remove mobile Search');
  assert(state.latestLog.includes('You found a '), 'Resource-site Search should report the found item in the log');
  assert(state.latestEvent.includes('You found a '), 'Resource-site Search should report the found item in the tile event feed');
  assert.strictEqual(state.centerHasActorControls, false, 'Resource-site Search should keep center free of actor controls after resolving');
}

async function runContextualCardIntentSourceFlow(page) {
  await setupAdventure(page);
  const desktopMark = page.locator(`#enemies-content button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first();
  await assert.doesNotReject(() => desktopMark.waitFor({ state: 'visible', timeout: 1000 }), 'Desktop creature card Mark should render as the card-level target control');
  await desktopMark.click();
  const desktopInspect = page.locator(`#desktop-context-belt button[onclick*="selectIntent('creature','friendly-1','inspect','composer-tray')"]`).first();
  await assert.doesNotReject(() => desktopInspect.waitFor({ state: 'visible', timeout: 1000 }), 'Desktop marked-target composer Inspect should render through shared intent selection');
  await desktopInspect.click();

  let state = await page.evaluate(() => ({
    action: App.lastIntentCommand?.action || '',
    source: App.lastIntentCommand?.source || '',
    mode: App.lastIntentCommand?.mode || '',
    targetIds: App.lastIntentCommand?.targetIds || [],
    lastLog: App.log[App.log.length - 1]?.text || '',
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.action, 'inspect', 'Desktop marked-target tray Inspect should record the selected action');
  assert.strictEqual(state.source, 'composer-tray', 'Desktop marked-target tray Inspect should preserve composer-tray source metadata');
  assert.strictEqual(state.mode, 'adventure', 'Desktop creature card Inspect should normalize as an adventure command');
  assert.deepStrictEqual(state.targetIds, ['friendly-1'], 'Desktop creature card Inspect should record the clicked creature target');
  assert(state.lastLog.includes('Friendly [human]'), 'Desktop creature card Inspect should still use the normal inspect resolution');
  assert.strictEqual(state.centerHasActorControls, false, 'Desktop creature card Inspect should keep center free of actor controls');

  await page.setViewportSize({ width: 390, height: 844 });
  await setupAdventure(page);
  await page.evaluate(() => App.focusMobileTargetPicker?.());
  const mobileMark = page.locator(`#mobile-target-picker-belt button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first();
  await assert.doesNotReject(() => mobileMark.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile target picker Mark should render as the chip-level target control');
  await mobileMark.click();
  const mobileInspect = page.locator(`#mobile-target-action-tray button[onclick*="selectIntent('creature','friendly-1','inspect','composer-tray')"]`).first();
  await assert.doesNotReject(() => mobileInspect.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile marked-target tray Inspect should render through shared intent selection');
  await mobileInspect.click();

  state = await page.evaluate(() => ({
    action: App.lastIntentCommand?.action || '',
    source: App.lastIntentCommand?.source || '',
    mode: App.lastIntentCommand?.mode || '',
    targetIds: App.lastIntentCommand?.targetIds || [],
    lastLog: App.log[App.log.length - 1]?.text || '',
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.action, 'inspect', 'Mobile marked-target tray Inspect should record the selected action');
  assert.strictEqual(state.source, 'composer-tray', 'Mobile marked-target tray Inspect should preserve composer-tray source metadata');
  assert.strictEqual(state.mode, 'adventure', 'Mobile target picker Inspect should normalize as an adventure command');
  assert.deepStrictEqual(state.targetIds, ['friendly-1'], 'Mobile target picker Inspect should record the tapped creature target');
  assert(state.lastLog.includes('Friendly [human]'), 'Mobile target picker Inspect should still use the normal inspect resolution');
  assert.strictEqual(state.centerHasActorControls, false, 'Mobile target picker Inspect should keep center free of actor controls');

  await page.setViewportSize({ width: 1365, height: 768 });
}

async function runDesktopIntentSubActionSheetFlow(page) {
  await setupAdventure(page);

  let state = await page.evaluate(() => ({
    partyHasDuplicateMenu: (document.querySelector('#party-content')?.innerHTML || '').includes("showIntentMenu('party'"),
    creatureHasDuplicateMenu: (document.querySelector('#enemies-content')?.innerHTML || '').includes("showIntentMenu('creature'"),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.partyHasDuplicateMenu, false, 'Desktop party cards should not expose duplicate visible intent menus');
  assert.strictEqual(state.creatureHasDuplicateMenu, false, 'Desktop living creature cards should not expose duplicate visible intent menus');
  assert.strictEqual(state.centerHasActorControls, false, 'Desktop intent sheet flow should start with center free of actor controls');

  state = await page.evaluate(() => {
    const oldProbe = document.getElementById('desktop-intent-focus-probe');
    if (oldProbe) oldProbe.remove();
    const opener = document.createElement('button');
    opener.id = 'desktop-intent-focus-probe';
    opener.textContent = 'Open intent probe';
    document.body.appendChild(opener);
    opener.focus();
    const suppressed = App.showIntentMenu('creature', 'friendly-1', 'desktop', 'desktop') === false && !document.querySelector('#desktop-intent-menu');
    App.openIntentSubActionSheet('creature', 'friendly-1', 'fight', 'desktop');
    return {
      suppressed,
      activeId: document.activeElement?.id || ''
    };
  });
  let menu = page.locator('#desktop-intent-menu');
  assert.strictEqual(state.suppressed, true, 'Desktop living intent menu should stay suppressed in favor of marked-target actions');
  assert.strictEqual(state.activeId, 'desktop-intent-focus-probe', 'Suppressed desktop living menu should not steal opener focus');
  await assert.doesNotReject(() => menu.waitFor({ state: 'visible', timeout: 1000 }), 'Desktop sub-action sheet should render from a focused opener when invoked directly');
  await page.keyboard.press('Escape');
  await assert.doesNotReject(() => menu.waitFor({ state: 'detached', timeout: 1000 }), 'Escape should close the generated desktop intent menu');
  state = await page.evaluate(() => ({
    activeId: document.activeElement?.id || '',
    focusTrapActive: Boolean(App._focusTrap),
    outsideDismissActive: Boolean(App._mobileContextOutsideHandler)
  }));
  assert.strictEqual(state.activeId, 'desktop-intent-focus-probe', 'Generated desktop intent menu should restore focus to the opener after Escape');
  assert.strictEqual(state.focusTrapActive, false, 'Generated desktop intent menu should clear the focus trap after Escape');
  assert.strictEqual(state.outsideDismissActive, false, 'Generated desktop intent menu should clear outside dismissal after Escape');

  await page.evaluate(() => App.openIntentSubActionSheet('creature', 'friendly-1', 'fight', 'desktop'));
  menu = page.locator('#desktop-intent-menu');
  await assert.doesNotReject(() => menu.waitFor({ state: 'visible', timeout: 1000 }), 'Desktop sub-action sheet should render when invoked directly');

  state = await page.evaluate(() => {
    const menuEl = document.querySelector('#desktop-intent-menu');
    return {
      presentation: menuEl?.getAttribute('data-intent-presentation') || '',
      hasDesktopClass: menuEl?.classList.contains('intent-menu-desktop') || false,
      hasMobileMenu: Boolean(document.querySelector('#mobile-context-menu')),
      hasAttackButton: (menuEl?.innerHTML || '').includes("selectIntent('creature','friendly-1','fight','desktop','attack')"),
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.presentation, 'desktop', 'Desktop sub-action sheet should declare desktop presentation');
  assert.strictEqual(state.hasDesktopClass, true, 'Desktop sub-action sheet should use desktop layout class');
  assert.strictEqual(state.hasMobileMenu, false, 'Desktop sub-action sheet should not reuse the mobile context sheet');
  assert.strictEqual(state.hasAttackButton, true, 'Desktop sub-action sheet should dispatch through selectIntent with a sub-action');
  assert.strictEqual(state.centerHasActorControls, false, 'Opening the desktop sub-action sheet should not move actor controls into center');

  state = await page.evaluate(() => {
    const menuEl = document.querySelector('#desktop-intent-menu');
    return {
      hasDesktopClass: menuEl?.classList.contains('intent-menu-desktop') || false,
      hasAttackButton: (menuEl?.innerHTML || '').includes("selectIntent('creature','friendly-1','fight','desktop','attack')"),
      hasMobileMenu: Boolean(document.querySelector('#mobile-context-menu')),
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.hasDesktopClass, true, 'Desktop sub-action sheet should stay on the desktop surface');
  assert.strictEqual(state.hasAttackButton, true, 'Desktop sub-action sheet should dispatch through selectIntent with a sub-action');
  assert.strictEqual(state.hasMobileMenu, false, 'Desktop sub-action sheet should not create a mobile menu');
  assert.strictEqual(state.centerHasActorControls, false, 'Opening a desktop sub-action sheet should not move actor controls into center');

  await page.evaluate(() => {
    const oldProbe = document.getElementById('desktop-intent-edge-probe');
    if (oldProbe) oldProbe.remove();
    const opener = document.createElement('button');
    opener.id = 'desktop-intent-edge-probe';
    opener.textContent = 'Bottom right intent probe';
    opener.style.position = 'fixed';
    opener.style.right = '4px';
    opener.style.bottom = '4px';
    opener.style.width = '96px';
    opener.style.height = '40px';
    document.body.appendChild(opener);
    opener.focus();
    App.openIntentSubActionSheet('creature', 'friendly-1', 'fight', 'desktop', { currentTarget: opener });
  });
  menu = page.locator('#desktop-intent-menu');
  await assert.doesNotReject(() => menu.waitFor({ state: 'visible', timeout: 1000 }), 'Anchored desktop sub-action sheet should render near the opener');
  state = await page.evaluate(() => {
    const menuEl = document.querySelector('#desktop-intent-menu');
    const opener = document.getElementById('desktop-intent-edge-probe');
    const rect = menuEl?.getBoundingClientRect();
    const openerRect = opener?.getBoundingClientRect();
    return {
      positioned: menuEl?.getAttribute('data-intent-position') || '',
      presentation: menuEl?.getAttribute('data-intent-presentation') || '',
      hasDesktopClass: menuEl?.classList.contains('intent-menu-desktop') || false,
      role: menuEl?.getAttribute('role') || '',
      ariaModal: menuEl?.getAttribute('aria-modal') || '',
      hasMobileMenu: Boolean(document.querySelector('#mobile-context-menu')),
      left: rect?.left ?? 0,
      top: rect?.top ?? 0,
      right: rect?.right ?? 0,
      bottom: rect?.bottom ?? 0,
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
      openerRight: openerRect?.right ?? 0,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      hasAttackButton: (menuEl?.innerHTML || '').includes("selectIntent('creature','friendly-1','fight','desktop','attack')"),
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.positioned, 'anchored', 'Desktop sub-action sheet should mark anchored positioning when opened from an edge control');
  assert.strictEqual(state.presentation, 'desktop', 'Anchored sub-action sheet should keep desktop presentation metadata');
  assert.strictEqual(state.hasDesktopClass, true, 'Anchored sub-action sheet should keep desktop layout class');
  assert.strictEqual(state.role, 'dialog', 'Anchored sub-action sheet should remain a dialog');
  assert.strictEqual(state.ariaModal, 'true', 'Anchored sub-action sheet should remain modal for focus trapping');
  assert.strictEqual(state.hasMobileMenu, false, 'Anchored desktop sub-action sheet should not create a mobile sheet');
  assert(state.width > 0 && state.height > 0, 'Anchored desktop sub-action sheet should have rendered dimensions');
  assert(state.left >= -1 && state.top >= -1, 'Anchored desktop sub-action sheet should not clip above or left of the viewport');
  assert(state.right <= state.viewportWidth + 1, 'Anchored desktop sub-action sheet should not clip past the right viewport edge');
  assert(state.bottom <= state.viewportHeight + 1, 'Anchored desktop sub-action sheet should not clip past the bottom viewport edge');
  assert(state.left < state.openerRight, 'Anchored desktop sub-action sheet should stay visually related to the opener instead of defaulting to a distant sheet');
  assert.strictEqual(state.hasAttackButton, true, 'Anchored desktop sub-action sheet should still dispatch through selectIntent with a sub-action');
  assert.strictEqual(state.centerHasActorControls, false, 'Anchored desktop sub-action sheet should not move actor controls into center');

  await page.locator(`#desktop-intent-menu button[onclick*="selectIntent('creature','friendly-1','fight','desktop','attack')"]`).first().click();

  state = await page.evaluate(() => ({
    menuVisible: Boolean(document.querySelector('#desktop-intent-menu')),
    action: App.lastIntentCommand?.action || '',
    subAction: App.lastIntentCommand?.subAction || '',
    source: App.lastIntentCommand?.source || '',
    mode: App.lastIntentCommand?.mode || '',
    targetIds: App.lastIntentCommand?.targetIds || [],
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.menuVisible, false, 'Selecting a desktop sub-action should close the intent sheet');
  assert.strictEqual(state.action, 'fight', 'Desktop sub-action selection should record the selected action');
  assert.strictEqual(state.subAction, 'attack', 'Desktop sub-action selection should record the chosen sub-action');
  assert.strictEqual(state.source, 'desktop', 'Desktop sub-action selection should preserve desktop command source metadata');
  assert.strictEqual(state.mode, 'adventure', 'Desktop sub-action selection should normalize as an adventure command');
  assert.deepStrictEqual(state.targetIds, ['friendly-1'], 'Desktop sub-action selection should record the clicked creature target');
  assert.strictEqual(state.centerHasActorControls, false, 'Desktop sub-action resolution should keep center free of actor controls');
}

async function runRadialIntentSubActionPresentationFlow(page) {
  await setupAdventure(page);
  await page.evaluate(() => App.showRadialIntentMenu('creature', 'friendly-1'));
  let state = await page.evaluate(() => {
    const menu = document.querySelector('#mobile-context-menu');
    return {
      presentation: menu?.getAttribute('data-intent-presentation') || '',
      radialClass: menu?.classList.contains('intent-menu-radial') || false,
      menuVisible: Boolean(menu)
    };
  });
  assert.strictEqual(state.menuVisible, false, 'Radial living intent menu should stay suppressed in favor of marked-target actions');
  assert.strictEqual(state.presentation, '', 'Suppressed radial living menu should not declare a presentation');
  assert.strictEqual(state.radialClass, false, 'Suppressed radial living menu should not render radial classes');

  await page.evaluate(() => App.openIntentSubActionSheet('creature', 'friendly-1', 'fight', 'radial'));
  state = await page.evaluate(() => {
    const menu = document.querySelector('#mobile-context-menu');
    return {
      presentation: menu?.getAttribute('data-intent-presentation') || '',
      radialClass: menu?.classList.contains('intent-menu-radial') || false,
      attackButton: (menu?.innerHTML || '').includes("selectIntent('creature','friendly-1','fight','radial','attack')"),
      deadBackButton: (menu?.innerHTML || '').includes("showIntentMenu('creature','friendly-1','radial','radial')")
    };
  });
  assert.strictEqual(state.presentation, 'radial', 'Radial sub-action sheet should keep radial presentation in the built app');
  assert.strictEqual(state.radialClass, true, 'Radial sub-action sheet should keep radial class');
  assert.strictEqual(state.attackButton, true, 'Radial sub-action sheet should preserve radial source for selectIntent');
  assert.strictEqual(state.deadBackButton, false, 'Radial sub-action sheet should not include a Back path to suppressed living menus');

  await page.locator(`#mobile-context-menu button[onclick*="selectIntent('creature','friendly-1','fight','radial','attack')"]`).first().click();
  state = await page.evaluate(() => {
    const menu = document.querySelector('#mobile-context-menu');
    return {
      menuVisible: Boolean(menu),
      source: App.lastIntentCommand?.source || '',
      subAction: App.lastIntentCommand?.subAction || '',
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.menuVisible, false, 'Selecting a radial sub-action should close the sheet');
  assert.strictEqual(state.source, 'radial', 'Radial sub-action selection should preserve radial command source');
  assert.strictEqual(state.subAction, 'attack', 'Radial sub-action selection should record the chosen sub-action');
  assert.strictEqual(state.centerHasActorControls, false, 'Radial sub-action flow should keep center free of actor controls');
  await page.evaluate(() => App.closeMobileContextMenu());
}

async function runMobileSelectionAndCombatFlow(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupAdventure(page);

  let state = await page.evaluate(() => ({
    mobileSurfaceVisible: getComputedStyle(document.querySelector('#mobile-play-surface')).display !== 'none',
    partyChipCount: document.querySelectorAll('#mobile-party-strip .mobile-unit-chip').length,
    creatureChipCount: document.querySelectorAll('#mobile-creature-strip .mobile-unit-chip').length,
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.mobileSurfaceVisible, true, 'Mobile play surface should be visible at mobile viewport');
  assert.strictEqual(state.partyChipCount, 2, 'Mobile party strip should render player and ally chips');
  assert.strictEqual(state.creatureChipCount, 1, 'Mobile creature strip should render the area creature chip');
  assert.strictEqual(state.centerHasActorControls, false, 'Center tile should not expose actor controls at mobile viewport');

  state = await page.evaluate(() => {
    App.showMobileCreatureContext('friendly-1');
    const marked = [...App.explorationTargetIds];
    const menuVisible = Boolean(document.querySelector('#mobile-context-menu'));
    const creatureChipHtml = document.querySelector('#mobile-creature-strip')?.innerHTML || '';
    App.clearExplorationTargets();
    return {
      marked,
      menuVisible,
      hasRadialEntry: creatureChipHtml.includes("showRadialIntentMenu('creature','friendly-1'")
    };
  });
  assert.deepStrictEqual(state.marked, ['creature:friendly-1'], 'Mobile living creature long-press should mark the target');
  assert.strictEqual(state.menuVisible, false, 'Mobile living creature long-press should not open a duplicate action menu');
  assert.strictEqual(state.hasRadialEntry, false, 'Mobile living creature chip should not expose a secondary-click primary-action popup');

  await page.evaluate(() => App.focusMobileTargetPicker?.());
  await page.locator(`#mobile-target-picker-belt button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();
  const mobileTray = page.locator('#mobile-target-action-tray .target-action-row').first();
  await assert.doesNotReject(() => mobileTray.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile marked-target tray should render in the visible exploration control belt');
  await page.locator(`#mobile-selection-sentence [data-command-control="open-actor-slot"]`).first().click();
  await page.locator(`#mobile-actor-belt button[data-selection-mode="act-actor"][onclick*="selectExplorationActor(1)"]`).first().click();

  state = await page.evaluate(() => {
    const trayEl = document.querySelector('#mobile-target-action-tray');
    const partyStripTray = document.querySelector('#mobile-party-strip .panel-interaction-tray');
    const allyChip = Array.from(document.querySelectorAll('#mobile-actor-belt .mobile-unit-chip')).find(chip => chip.getAttribute('data-unit-name') === 'Ally');
    const creatureChip = document.querySelector('#mobile-creature-strip .mobile-unit-chip');
    return {
      hiddenPartyTrayVisible: Boolean(partyStripTray),
      actors: App._getExplorationActors().map(unit => unit.id || unit.name),
      targets: [...App.explorationTargetIds],
      allySelectedActor: allyChip?.classList.contains('selected-actor') || false,
      creatureSelectedTarget: creatureChip?.classList.contains('selected-target') || false,
      hasComposerSource: trayEl?.innerHTML.includes("resolveExplorationTargetAction('fight','attack','composer-tray')") || false,
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.hiddenPartyTrayVisible, false, 'Mobile marked-target tray should not live inside the hidden party strip');
  assert.deepStrictEqual(state.actors, ['ally-1'], 'Mobile Act should select the ally as the adventure actor');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1'], 'Mobile Mark should select the creature as an adventure target');
  assert.strictEqual(state.allySelectedActor, true, 'Mobile Act-selected compact actor chip should expose actor state');
  assert.strictEqual(state.creatureSelectedTarget, true, 'Mobile marked creature chip should expose target state');
  assert.strictEqual(state.hasComposerSource, true, 'Mobile tray should dispatch through the shared composer-tray command source');
  assert.strictEqual(state.centerHasActorControls, false, 'Center tile should stay free of actor controls while mobile target tray is active');

  await page.locator(`#mobile-target-action-tray button[onclick*="resolveExplorationTargetAction('flirt','tease','composer-tray')"]`).first().click();
  state = await page.evaluate(() => ({
    targetPle: App.creatures.find(unit => unit.id === 'friendly-1')?.CPle,
    targetsRemaining: App.explorationTargetIds.length,
    commandSource: App.lastIntentCommand?.source || '',
    trayVisible: Boolean((document.querySelector('#mobile-target-action-tray')?.innerHTML || '').trim()),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.targetPle > 0, 'Mobile composer-tray action should resolve against the marked creature');
  assert.strictEqual(state.targetsRemaining, 0, 'Mobile marked-target action should clear target marks');
  assert.strictEqual(state.commandSource, 'composer-tray', 'Mobile marked-target action should preserve shared command source metadata');
  assert.strictEqual(state.trayVisible, false, 'Mobile marked-target tray should disappear after resolution');
  assert.strictEqual(state.centerHasActorControls, false, 'Center tile should stay free of actor controls after mobile resolution');

  await setupCombat(page, { withAlly: true });
  await page.evaluate(() => {
    const ally = App.party.find(unit => unit.id === 'ally-1');
    if (ally && !App.combatState.turnQueue.some(entry => entry.unit === ally)) {
      App.combatState.turnQueue.splice(1, 0, { unit: ally, initiative: 15 });
    }
    App.combatState.currentTurn = 0;
    App.activeActor = App.player;
    App.showActorActions(App.player);
  });
  await page.evaluate(() => App.executeCombatIntent('sync'));
  const syncChoose = page.locator('#mobile-combat-toolbelt .mobile-combat-phase-controls').first();
  await assert.doesNotReject(() => syncChoose.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile Sync choose phase should render visible toolbelt controls');
  state = await page.evaluate(() => ({
    phase: App.syncSelection?.phase || null,
    sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || '',
    controls: document.querySelector('#mobile-combat-toolbelt .mobile-combat-phase-controls')?.innerText || '',
    intentButtonsVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[onclick*="selectSyncParticipants"]')),
    cancelVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[onclick*="cancelTargetSelection"]'))
  }));
  assert.strictEqual(state.phase, 'choose', 'Mobile Sync should enter choose phase');
  assert(state.sentence.toLowerCase().includes('actor') && state.sentence.toLowerCase().includes('intent'), 'Mobile Sync choose phase should keep Actor -> Intent sentence visible');
  assert(state.controls.includes('Group Fight') && state.controls.includes('Cancel Sync'), 'Mobile Sync choose controls should expose sync choices and Cancel Sync');
  assert.strictEqual(state.intentButtonsVisible, true, 'Mobile Sync choose phase should have visible next action buttons');
  assert.strictEqual(state.cancelVisible, true, 'Mobile Sync choose phase should have a visible cancel');

  await page.locator(`#mobile-combat-toolbelt button[onclick*="selectSyncParticipants('sync_fight')"]`).first().click();
  const allyParticipant = page.locator(`#mobile-party-strip button[onclick*="_toggleSyncParticipantById('ally-1')"]`).first();
  await assert.doesNotReject(() => allyParticipant.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile Sync participant phase should render party participant controls');
  state = await page.evaluate(() => ({
    phase: App.syncSelection?.phase || null,
    controls: document.querySelector('#mobile-combat-toolbelt .mobile-combat-phase-controls')?.innerText || '',
    confirmDisabled: document.querySelector('#mobile-combat-toolbelt button[onclick*="confirmSyncParticipants"]')?.hasAttribute('disabled') || false,
    participantButtons: document.querySelectorAll('#mobile-party-strip button[onclick*="_toggleSyncParticipantById"]').length
  }));
  assert.strictEqual(state.phase, 'participants', 'Mobile Sync should enter participant phase');
  assert(state.controls.includes('Confirm Participants') && state.controls.includes('Cancel Sync'), 'Mobile Sync participant controls should expose Confirm and Cancel Sync');
  assert.strictEqual(state.confirmDisabled, true, 'Mobile Sync confirm should stay disabled until enough participants are selected');
  assert(state.participantButtons >= 2, 'Mobile Sync participant phase should expose party participant controls');

  await allyParticipant.click();
  state = await page.evaluate(() => ({
    participants: App._syncSelectedParticipants().map(unit => unit.id || unit.name),
    confirmDisabled: document.querySelector('#mobile-combat-toolbelt button[onclick*="confirmSyncParticipants"]')?.hasAttribute('disabled') || false
  }));
  assert.deepStrictEqual(state.participants, ['player-1', 'ally-1'], 'Mobile Sync participant tap should add ally to group action');
  assert.strictEqual(state.confirmDisabled, false, 'Mobile Sync confirm should enable once enough participants are selected');

  await page.locator(`#mobile-combat-toolbelt button[onclick*="confirmSyncParticipants('sync_fight')"]`).first().click();
  const syncPick = page.locator('#mobile-creature-strip button[data-selection-mode="combat-pick"]').first();
  await assert.doesNotReject(() => syncPick.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile Sync target phase should expose enemy Pick controls');
  state = await page.evaluate(() => ({
    phase: App.syncSelection?.phase || null,
    controls: document.querySelector('#mobile-combat-toolbelt .mobile-combat-phase-controls')?.innerText || '',
    pickVisible: Boolean(document.querySelector('#mobile-creature-strip button[data-selection-mode="combat-pick"]')),
    sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || ''
  }));
  assert.strictEqual(state.phase, 'target', 'Mobile Sync should enter target phase after confirming participants');
  assert(state.controls.includes('Cancel Sync'), 'Mobile Sync target phase should expose Cancel Sync');
  assert.strictEqual(state.pickVisible, true, 'Mobile Sync target phase should keep enemy Pick visible');
  assert(state.sentence.includes('You + Ally') && state.sentence.toLowerCase().includes('pick target'), 'Mobile Sync target phase should show group actor and target sentence');

  await page.locator(`#mobile-combat-toolbelt button[onclick*="cancelTargetSelection"]`).first().click();
  state = await page.evaluate(() => ({
    syncSelection: App.syncSelection,
    targetSelection: App.targetSelection,
    fightVisible: (document.querySelector('#mobile-combat-toolbelt')?.innerHTML || '').includes("executeCombatIntent('fight')")
  }));
  assert.strictEqual(state.syncSelection, null, 'Mobile Cancel Sync should clear sync selection');
  assert.strictEqual(state.targetSelection, null, 'Mobile Cancel Sync should leave no target selection');
  assert.strictEqual(state.fightVisible, true, 'Mobile target selection should be reachable again after cancelling Sync');

  state = await page.evaluate(() => {
    App.feedSelection = { active: true, actorId: 'player-1', subIds: ['heal'] };
    App.targetSelection = null;
    App.syncSelection = null;
    App.renderMobileCombatToolbelt();
    return {
      feedSelection: Boolean(App.feedSelection?.active),
      controls: document.querySelector('#mobile-combat-toolbelt .mobile-combat-phase-controls')?.innerText || '',
      cancelVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[onclick*="cancelTargetSelection"]'))
    };
  });
  assert.strictEqual(state.feedSelection, true, 'Mobile Feed test should enter feed selection state');
  assert(state.controls.includes('Cancel Feed'), 'Mobile Feed selection should expose Cancel Feed');
  assert.strictEqual(state.cancelVisible, true, 'Mobile Feed selection should have a visible cancel');
  await page.locator(`#mobile-combat-toolbelt button[onclick*="cancelTargetSelection"]`).first().click();

  await page.locator(`#mobile-combat-toolbelt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  const mobilePick = page.locator('#mobile-creature-strip button[data-command-control="mark-combat-target"]').first();
  await assert.doesNotReject(() => mobilePick.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile combat target mark should render in creature strip');
  state = await page.evaluate(() => {
    const pick = document.querySelector('#mobile-creature-strip button[data-command-control="mark-combat-target"]');
    const enemyChip = document.querySelector('#mobile-creature-strip .mobile-unit-chip');
    return {
      combatActive: document.querySelector('#mobile-play-surface')?.classList.contains('combat-active') || false,
      targetSelection: App.targetSelection?.action || null,
      cancelVisible: Boolean(document.querySelector('#mobile-combat-toolbelt button[onclick*="cancelTargetSelection"]')),
      pickControl: pick?.getAttribute('data-selection-control') || '',
      pickState: pick?.getAttribute('data-selection-state') || '',
      enemySelectedTarget: enemyChip?.classList.contains('selected-target') || false,
      hasAdventureMark: (document.querySelector('#mobile-creature-strip')?.innerHTML || '').includes("toggleExplorationTarget('creature'")
    };
  });
  assert.strictEqual(state.combatActive, true, 'Mobile play surface should switch into combat layout');
  assert.strictEqual(state.targetSelection, 'fight', 'Mobile combat Fight should enter target-pick state');
  assert.strictEqual(state.cancelVisible, true, 'Mobile combat target-pick should expose a visible Cancel action');
  assert.strictEqual(state.pickControl, 'combat-target', 'Mobile combat target mark should use combat-target semantics');
  assert.strictEqual(state.pickState, 'available', 'Mobile combat target mark should expose available state');
  assert.strictEqual(state.enemySelectedTarget, false, 'Mobile unmarked combat enemy should not expose selected-target state');
  assert.strictEqual(state.hasAdventureMark, false, 'Mobile combat target picking should not render adventure Mark controls');

  await mobilePick.click();
  await page.locator('#mobile-combat-toolbelt button[data-command-control="confirm-targets"]').first().click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    targetSelection: App.targetSelection,
    commandSource: App.lastIntentCommand?.source || '',
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.enemyPun < 100, 'Mobile combat target confirmation should resolve the selected fight target');
  assert.strictEqual(state.targetSelection, null, 'Mobile combat target confirmation should clear target selection after resolving');
  assert.strictEqual(state.commandSource, 'combat-composer', 'Mobile combat target confirmation should identify the composer command surface');
  assert.strictEqual(state.centerHasActorControls, false, 'Center tile should stay free of actor controls after mobile combat resolution');

  await page.setViewportSize({ width: 1365, height: 768 });
}

async function runCompactRailRoundTripFlow(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupAdventure(page);
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    const makeUnit = (name, id, overrides = {}) => ({
      id,
      name,
      species: 'human',
      icon: 'X',
      level: 1,
      CPun: 100,
      MPun: 100,
      CPle: 0,
      MPle: 100,
      Figh: 80,
      Feas: 80,
      Flir: 80,
      Fuck: 40,
      Flee: 80,
      Feed: 40,
      str: 10,
      con: 10,
      spd: 10,
      int: 10,
      wis: 10,
      cha: 10,
      size: 4,
      appetite: 4,
      stomach: [],
      womb: [],
      balls: [],
      bodyParts: [],
      tags: ['Person'],
      status: {},
      disposition: 'party',
      ...overrides
    });
    const scout = makeUnit('Scout', 'scout-1', { Flir: 90 });
    App.party = [App.player, App.party[1], scout].filter(Boolean);
    App.creatures = [
      makeUnit('Guide', 'guide-1', { disposition: App.DISPOSITION.FRIENDLY }),
      makeUnit('Merchant', 'merchant-1', { disposition: App.DISPOSITION.MERCHANT, stock: [{ id: 'ration', price: 2 }] }),
      makeUnit('Remains', 'corpse-rail', { disposition: App.DISPOSITION.CORPSE, CPun: 0, portions: 2, inventory: [{ id: 'bone', name: 'Bone' }] })
    ];
    App.worldMap = new Map([['0,0', { ...App.getBaseTile(0, 0), explored: true, biome: 'grove', creatures: App.creatures, items: [{ id: 'test-item', name: 'Test Item' }] }]]);
    App.mobileCreatureRailOpen = false;
    App.mobileActorBeltOpen = false;
    App.explorationActorIds = [App._unitSelectionId(App.player)];
    App.explorationActorSelectionExplicit = false;
    App.explorationTargetIds = [];
    App.renderDesktopPlaySurface();
    App.renderParty();
    App.renderCreatures();
    App.renderExplorationActions();
  });

  let state = await page.evaluate(() => ({
    cueText: document.querySelector('#mobile-creature-presence-cue')?.innerText || '',
    cueBounds: (() => {
      const cue = document.querySelector('#mobile-creature-presence-cue button');
      const rect = cue?.getBoundingClientRect();
      const style = cue ? getComputedStyle(cue) : null;
      return rect && style ? {
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        parentBounds: (() => {
          const parent = cue.parentElement;
          const parentRect = parent?.getBoundingClientRect();
          const parentStyle = parent ? getComputedStyle(parent) : null;
          return parentRect && parentStyle ? {
            id: parent.id,
            className: parent.className,
            top: parentRect.top,
            bottom: parentRect.bottom,
            width: parentRect.width,
            height: parentRect.height,
            display: parentStyle.display,
            visibility: parentStyle.visibility
          } : null;
        })(),
        surfaceBounds: (() => {
          const surface = document.querySelector('#mobile-play-surface');
          const surfaceRect = surface?.getBoundingClientRect();
          return surfaceRect ? { top: surfaceRect.top, bottom: surfaceRect.bottom, width: surfaceRect.width, height: surfaceRect.height } : null;
        })(),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        mobileSurfaceDisplay: getComputedStyle(document.querySelector('#mobile-play-surface')).display,
        screenGameDisplay: getComputedStyle(document.querySelector('#screen-game')).display
      } : null;
    })(),
    creatureRailDisplay: getComputedStyle(document.querySelector('#mobile-creature-card')).display,
    creatureChipCount: document.querySelectorAll('#mobile-creature-strip .mobile-unit-chip:not(.item-target)').length,
    itemTargetChipCount: document.querySelectorAll('#mobile-creature-strip .mobile-unit-chip.item-target').length,
    partyActorButtons: document.querySelectorAll('#mobile-actor-belt button[data-selection-mode="act-actor"]').length,
    targetIds: [...App.explorationTargetIds]
  }));
  assert(state.cueText.includes('2 creatures here'), 'Mobile presence cue should summarize multiple living creatures');
  assert(state.cueBounds && state.cueBounds.width > 0 && state.cueBounds.height > 0 && state.cueBounds.mobileSurfaceDisplay !== 'none' && state.cueBounds.screenGameDisplay !== 'none', `Mobile presence cue should be visible before opening target rail: ${JSON.stringify(state.cueBounds)}`);
  assert.strictEqual(state.creatureRailDisplay, 'none', 'Compact creature rail should start closed when explicitly toggled closed');
  assert.strictEqual(state.creatureChipCount, 3, 'Closed compact creature rail should keep rendered targets ready for reopening');
  assert.strictEqual(state.itemTargetChipCount, 1, 'Closed compact creature rail should keep tile item targets ready for reopening');
  assert.strictEqual(state.partyActorButtons, 0, 'Compact party actor rail should start closed');
  assert.deepStrictEqual(state.targetIds, [], 'Compact rail scenario should start without marked targets');

  const presenceCue = page.locator('#mobile-creature-presence-cue button[data-command-control="open-target-picker"]');
  await presenceCue.scrollIntoViewIfNeeded();
  await presenceCue.click();
  await page.locator(`#mobile-target-picker-belt button[onclick*="toggleExplorationTarget('creature','merchant-1')"]`).click();
  state = await page.evaluate(() => ({
    creatureRailOpen: App.mobileCreatureRailOpen,
    creatureRailDisplay: getComputedStyle(document.querySelector('#mobile-creature-card')).display,
    targetPickerOpen: App.mobileTargetPickerOpen,
    targetPickerButtons: document.querySelectorAll('#mobile-target-picker-belt [data-command-control="focus-target"]').length,
    targets: [...App.explorationTargetIds],
    trayText: document.querySelector('#mobile-target-action-tray')?.innerText || '',
    fullDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false
  }));
  assert.strictEqual(state.targetPickerOpen, true, 'Presence cue should open the lightweight target picker for multiple creatures');
  assert(state.targetPickerButtons >= 2, 'Target picker should expose compact target choices');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1'], 'Target picker control should mark the selected creature');
  assert(state.trayText.includes('Fight') && state.trayText.includes('Trade'), 'Marked merchant should expose safe primary and contextual intents in the composer tray');
  assert.strictEqual(state.fullDrawerOpen, false, 'Target picker marking should not open the full Creatures drawer');

  await page.locator(`#mobile-selection-sentence [data-command-control="open-target-slot"]`).click();
  state = await page.evaluate(() => ({
    creatureRailOpen: App.mobileCreatureRailOpen,
    creatureRailDisplay: getComputedStyle(document.querySelector('#mobile-creature-card')).display,
    targetPickerOpen: App.mobileTargetPickerOpen,
    targets: [...App.explorationTargetIds],
    trayText: document.querySelector('#mobile-target-action-tray')?.innerText || '',
    sentence: document.querySelector('#mobile-selection-sentence')?.innerText || '',
    beltSurface: document.querySelector('#mobile-control-belt')?.getAttribute('data-command-surface') || '',
    compactIntentButtons: document.querySelectorAll('[data-card-role="compact-tactical"] [data-command-slot="intent"]').length,
    fullDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false
  }));
  assert.strictEqual(state.targetPickerOpen, true, 'Target slot should reopen the lightweight target picker');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1'], 'Reopening the target picker should preserve marked target state');
  assert(state.trayText.includes('Fight') && state.trayText.includes('Trade'), 'Target picker should keep marked-target composer intents reachable');
  assert(state.sentence.includes('Merchant'), 'Target picker should keep the mobile composer sentence tied to the marked target');
  assert.strictEqual(state.beltSurface, 'command-composer', 'Target picker should leave the composer as the active command surface');
  assert.strictEqual(state.compactIntentButtons, 0, 'Target picker should not move intent buttons onto compact cards');
  assert.strictEqual(state.fullDrawerOpen, false, 'Target picker should not open the full Creatures drawer');

  state = await page.evaluate(() => {
    const merchantChip = Array.from(document.querySelectorAll('#mobile-target-picker-belt .mobile-target-picker-chip')).find(chip => chip.textContent.includes('Merchant'));
    return {
      targetPickerOpen: App.mobileTargetPickerOpen,
      targetPickerDisplay: getComputedStyle(document.querySelector('#mobile-target-picker-belt')).display,
      merchantSelectedTarget: merchantChip?.classList.contains('selected-target') || false,
      targetButtonPressed: merchantChip?.querySelector('[data-selection-control="target"]')?.getAttribute('aria-pressed') || '',
      targets: [...App.explorationTargetIds]
    };
  });
  assert.strictEqual(state.targetPickerOpen, true, 'Target picker should remain open for normal target composition');
  assert.notStrictEqual(state.targetPickerDisplay, 'none', 'Target picker should keep targets visible while composing');
  assert.strictEqual(state.merchantSelectedTarget, true, 'Target picker should preserve the marked merchant visual state');
  assert.strictEqual(state.targetButtonPressed, 'true', 'Target picker should preserve target button pressed state');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1'], 'Target picker should preserve marked target ids');

  state = await page.evaluate(() => {
    const centerTile = document.querySelector('#mobile-mini-map .map-tile.center');
    const selectedTarget = centerTile?.querySelector('.mobile-play-presence-dot.selected-target');
    const rect = selectedTarget?.getBoundingClientRect();
    const tileRect = centerTile?.getBoundingClientRect();
    return {
      control: selectedTarget?.getAttribute('data-command-control') || '',
      mode: selectedTarget?.getAttribute('data-command-mode') || '',
      grammar: selectedTarget?.getAttribute('data-command-grammar') || '',
      selectionMode: selectedTarget?.getAttribute('data-selection-mode') || '',
      selectionState: selectedTarget?.getAttribute('data-selection-state') || '',
      ariaPressed: selectedTarget?.getAttribute('aria-pressed') || '',
      targetRef: selectedTarget?.getAttribute('data-presence-ref') || '',
      width: rect?.width || 0,
      height: rect?.height || 0,
      insideTile: Boolean(rect && tileRect
        && rect.left >= tileRect.left - 1
        && rect.right <= tileRect.right + 1
        && rect.top >= tileRect.top - 1
        && rect.bottom <= tileRect.bottom + 1)
    };
  });
  assert.strictEqual(state.control, 'focus-target', 'Selected center presence badge should remain a target control');
  assert.strictEqual(state.mode, 'exploration', 'Selected center presence badge should declare exploration command mode');
  assert.strictEqual(state.grammar, 'actor-target-intent', 'Selected center presence badge should keep shared composer grammar');
  assert.strictEqual(state.selectionMode, 'mark-target', 'Selected center presence badge should expose target selection semantics');
  assert.strictEqual(state.selectionState, 'marked', 'Selected center presence badge should expose marked target state');
  assert.strictEqual(state.ariaPressed, 'true', 'Selected center presence badge should expose pressed state to assistive tech');
  assert.strictEqual(state.targetRef, 'merchant-1', 'Selected center presence badge should point at the marked creature');
  assert(state.width >= 80 && state.height >= 80, 'Selected center presence badge should keep a roomy mobile target');
  assert.strictEqual(state.insideTile, true, 'Selected center presence badge should stay inside the current tile');

  await page.evaluate(() => App.focusPresence('items', 'tile-items'));
  state = await page.evaluate(() => {
    const centerTile = document.querySelector('#mobile-mini-map .map-tile.center');
    const focusedStage = centerTile?.querySelector('.mobile-play-presence-dot.selected-stage-focus');
    const rect = focusedStage?.getBoundingClientRect();
    const tileRect = centerTile?.getBoundingClientRect();
    return {
      focusedType: App.focusedStageObject?.type || '',
      focusedIntent: App.focusedStageObject?.intent || '',
      control: focusedStage?.getAttribute('data-command-control') || '',
      intent: focusedStage?.getAttribute('data-command-intent') || '',
      selectionMode: focusedStage?.getAttribute('data-selection-mode') || '',
      selectionState: focusedStage?.getAttribute('data-selection-state') || '',
      ariaPressed: focusedStage?.getAttribute('aria-pressed') || '',
      railItemSelected: Boolean(document.querySelector('#mobile-target-picker-belt .mobile-target-picker-chip.item-target.selected-stage-focus')),
      clearFocusVisible: Boolean(document.querySelector('#mobile-explore-actions button[data-command-control="clear-focused-object"]')),
      takeItemsVisible: Boolean(document.querySelector('#mobile-explore-actions button[data-command-intent="takeItems"]')),
      width: rect?.width || 0,
      height: rect?.height || 0,
      insideTile: Boolean(rect && tileRect
        && rect.left >= tileRect.left - 1
        && rect.right <= tileRect.right + 1
        && rect.top >= tileRect.top - 1
        && rect.bottom <= tileRect.bottom + 1)
    };
  });
  assert.strictEqual(state.focusedType, 'items', 'Focusing center tile items should set stage focus');
  assert.strictEqual(state.focusedIntent, 'takeItems', 'Focused item badge should route to the tile item intent');
  assert.strictEqual(state.control, 'focus-items', 'Focused center presence badge should remain an item focus control');
  assert.strictEqual(state.intent, 'takeItems', 'Focused center presence badge should declare the item intent');
  assert.strictEqual(state.selectionMode, 'stage-focus', 'Focused center presence badge should expose stage-focus semantics');
  assert.strictEqual(state.selectionState, 'focused', 'Focused center presence badge should expose focused state');
  assert.strictEqual(state.ariaPressed, 'true', 'Focused center presence badge should expose pressed state to assistive tech');
  assert.strictEqual(state.railItemSelected, true, 'Focused stage item should repaint the compact target rail item chip');
  assert.strictEqual(state.clearFocusVisible, true, 'Focused stage item should expose a visible Clear focus exit in the mobile composer');
  assert.strictEqual(state.takeItemsVisible, true, 'Focused stage item should keep Take Items reachable through location intents');
  assert(state.width >= 80 && state.height >= 80, 'Focused center presence badge should keep a roomy mobile target');
  assert.strictEqual(state.insideTile, true, 'Focused center presence badge should stay inside the current tile');

  await page.evaluate(() => App.clearFocusedStageObject());
  await page.locator(`#mobile-selection-sentence [data-command-control="open-target-slot"]`).click();
  await page.locator(`#mobile-target-picker-belt button[onclick*="toggleExplorationTarget('creature','merchant-1')"]`).click();

  await page.locator(`.mobile-panel-dock button[data-command-control="toggle-actor-rail"]`).click();
  await page.locator(`#mobile-actor-belt button[onclick*="selectExplorationActor(1)"]`).click();
  await page.locator(`#mobile-actor-belt button[onclick*="selectExplorationActor(2)"]`).click();
  await page.locator(`#mobile-actor-belt button[onclick*="toggleExplorationTarget('party','player-1')"]`).click();
  state = await page.evaluate(() => ({
    actorRailOpen: App.mobileActorBeltOpen,
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    actorBeltText: document.querySelector('#mobile-actor-belt')?.innerText || '',
    actorDetailsAttrs: (() => {
      const details = document.querySelector('#mobile-actor-belt .mobile-actor-details');
      return {
        surface: details?.getAttribute('data-command-surface') || '',
        mode: details?.getAttribute('data-command-mode') || '',
        control: details?.getAttribute('data-command-control') || '',
        drawer: details?.getAttribute('data-drawer-role') || '',
        returnRail: details?.getAttribute('data-return-rail') || '',
        slot: details?.getAttribute('data-command-slot') || ''
      };
    })(),
    sentence: document.querySelector('#mobile-selection-sentence')?.innerText || '',
    fullPartyDrawerOpen: document.querySelector('#panel-party')?.classList.contains('active') || false
  }));
  assert.strictEqual(state.actorRailOpen, true, 'Party dock should open the compact actor rail');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Compact actor rail should support multiple selected party actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Compact actor rail should allow marking a party member as target without losing creature target');
  assert(state.actorBeltText.includes('Ally') && state.actorBeltText.includes('Scout'), 'Compact actor rail should show selected party choices');
  assert.deepStrictEqual(state.actorDetailsAttrs, {
    surface: 'drawer-shortcuts',
    mode: 'navigation',
    control: 'open-actor-drawer',
    drawer: 'actors',
    returnRail: 'actor',
    slot: 'details'
  }, 'Compact actor rail Details should identify drawer navigation and return context');
  assert(state.sentence.includes('Ally') && state.sentence.includes('Merchant'), 'Mobile composer sentence should summarize selected actors and targets');
  assert.strictEqual(state.fullPartyDrawerOpen, false, 'Party rail selection should not open the full Party drawer');
  assertMobileExplorationRailTapTargets(await mobileExplorationRailMetrics(page), 'Compact exploration actor target flow');

  await page.locator(`#mobile-actor-belt .mobile-actor-details`).click();
  state = await page.evaluate(() => ({
    partyDrawerOpen: document.querySelector('#panel-party')?.classList.contains('active') || false,
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort()
  }));
  assert.strictEqual(state.partyDrawerOpen, true, 'Compact actor rail Details should open the Party drawer');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Opening Party details should preserve selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Opening Party details should preserve marked targets');
  await page.evaluate(() => App.closeAllPanels());
  state = await page.evaluate(() => ({
    partyDrawerOpen: document.querySelector('#panel-party')?.classList.contains('active') || false,
    actorRailOpen: App.mobileActorBeltOpen,
    actorButtons: document.querySelectorAll('#mobile-actor-belt button[data-selection-mode="act-actor"]').length,
    actorDetailsVisible: Boolean(document.querySelector('#mobile-actor-belt .mobile-actor-details')),
    activeControl: document.activeElement?.getAttribute('data-command-control') || '',
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    sentence: document.querySelector('#mobile-selection-sentence')?.innerText || ''
  }));
  assert.strictEqual(state.partyDrawerOpen, false, 'Closing Party details should return to normal mobile play');
  assert.strictEqual(state.actorRailOpen, true, 'Closing Party details should restore the compact actor rail');
  assert(state.actorButtons >= 3 && state.actorDetailsVisible, 'Returned actor rail should keep actor controls and Details reachable');
  assert.strictEqual(state.activeControl, 'focus-actor', 'Closing Party details should return focus to the compact actor rail');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Closing Party details should keep selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Closing Party details should keep marked targets');
  assert(state.sentence.includes('Ally') && state.sentence.includes('Merchant'), 'Closing Party details should keep the mobile composer sentence visible');

  await page.evaluate(() => {
    App._mobilePanelReturnRail = 'actor';
    App.showPartyMemberStats(1);
  });
  state = await page.evaluate(() => ({
    partyDrawerOpen: document.querySelector('#panel-party')?.classList.contains('active') || false,
    statsVisible: Boolean(document.querySelector('#mobile-party-strip .party-stats-view')),
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort()
  }));
  assert.strictEqual(state.partyDrawerOpen, true, 'Mobile party stats detail should open the Party drawer');
  assert.strictEqual(state.statsVisible, true, 'Mobile party stats detail should replace the compact actor rail temporarily');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Opening party stats detail should preserve selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Opening party stats detail should preserve marked targets');
  await page.evaluate(() => App.closePanelDetails('party'));
  state = await page.evaluate(() => ({
    partyDrawerOpen: document.querySelector('#panel-party')?.classList.contains('active') || false,
    actorRailOpen: App.mobileActorBeltOpen,
    actorButtons: document.querySelectorAll('#mobile-actor-belt button[data-selection-mode="act-actor"]').length,
    actorDetailsVisible: Boolean(document.querySelector('#mobile-actor-belt .mobile-actor-details')),
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    sentence: document.querySelector('#mobile-selection-sentence')?.innerText || ''
  }));
  assert.strictEqual(state.partyDrawerOpen, false, 'Party stats Back should close the Party drawer on mobile');
  assert.strictEqual(state.actorRailOpen, true, 'Party stats Back should restore the compact actor rail');
  assert(state.actorButtons >= 3 && state.actorDetailsVisible, 'Party stats Back should restore actor controls and Details');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Party stats Back should keep selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Party stats Back should keep marked targets');
  assert(state.sentence.includes('Ally') && state.sentence.includes('Merchant'), 'Party stats Back should keep the composer sentence visible');

  await page.locator(`#mobile-selection-sentence [data-command-control="open-target-slot"]`).click();
  state = await page.evaluate(() => {
    const details = document.querySelector('#mobile-target-picker-belt button[data-command-control="open-target-drawer"]');
    return {
      targetDetailsAttrs: {
        surface: details?.getAttribute('data-command-surface') || '',
        mode: details?.getAttribute('data-command-mode') || '',
        control: details?.getAttribute('data-command-control') || '',
        drawer: details?.getAttribute('data-drawer-role') || '',
        returnRail: details?.getAttribute('data-return-rail') || '',
        slot: details?.getAttribute('data-command-slot') || ''
      }
    };
  });
  assert.deepStrictEqual(state.targetDetailsAttrs, {
    surface: 'drawer-shortcuts',
    mode: 'navigation',
    control: 'open-target-drawer',
    drawer: 'targets',
    returnRail: 'target',
    slot: 'details'
  }, 'Target picker Details should identify drawer navigation and return context');
  await page.locator(`#mobile-target-picker-belt button[data-command-control="open-target-drawer"]`).click();
  state = await page.evaluate(() => ({
    creatureDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false,
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort()
  }));
  assert.strictEqual(state.creatureDrawerOpen, true, 'Target picker Details should open the Creatures drawer');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Opening Creature details should preserve selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Opening Creature details should preserve marked targets');
  await page.evaluate(() => App.closeAllPanels());
  state = await page.evaluate(() => ({
    creatureDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false,
    targetPickerOpen: App.mobileTargetPickerOpen,
    targetPickerDisplay: getComputedStyle(document.querySelector('#mobile-target-picker-belt')).display,
    targetButtons: document.querySelectorAll('#mobile-target-picker-belt button[data-command-control="focus-target"]').length,
    activeControl: document.activeElement?.getAttribute('data-command-control') || '',
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    trayText: document.querySelector('#mobile-target-action-tray')?.innerText || ''
  }));
  assert.strictEqual(state.creatureDrawerOpen, false, 'Closing Creature details should return to normal mobile play');
  assert.strictEqual(state.targetPickerOpen, true, 'Closing Creature details should restore the target picker');
  assert.notStrictEqual(state.targetPickerDisplay, 'none', 'Returned target picker should remain visible');
  assert(state.targetButtons >= 2, 'Returned target picker should keep target controls reachable');
  assert.strictEqual(state.activeControl, 'focus-target', 'Closing Creature details should return focus to the target picker');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Closing Creature details should keep selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Closing Creature details should keep marked targets');
  assert(state.trayText.includes('Fight') && state.trayText.includes('Clear'), 'Closing Creature details should keep shared composer intents visible');

  await page.evaluate(() => {
    App._mobilePanelReturnRail = 'target';
    App.selectIntent('creature', 'merchant-1', 'trade', 'composer-tray');
  });
  state = await page.evaluate(() => ({
    creatureDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false,
    tradeVisible: Boolean(document.querySelector('#mobile-creature-strip .trade-drawer, #mobile-target-picker-belt .trade-drawer')),
    transactionOpen: !document.getElementById('transaction-window-root')?.hidden,
    transactionKind: App.transactionWindow?.kind || '',
    transactionText: document.getElementById('transaction-window-root')?.textContent || '',
    composerHidden: getComputedStyle(document.getElementById('mobile-control-belt')).visibility === 'hidden',
    selectionControlsInsideTransaction: document.querySelectorAll('#transaction-window-root [data-command-control="focus-actor"], #transaction-window-root [data-command-control="focus-target"]').length,
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort()
  }));
  assert.strictEqual(state.creatureDrawerOpen, false, 'Mobile Trade should not open the Creatures drawer');
  assert.strictEqual(state.tradeVisible, false, 'Mobile Trade should not replace the compact target rail with inline trade content');
  assert.strictEqual(state.transactionOpen, true, 'Mobile Trade should open a focused transaction window');
  assert.strictEqual(state.transactionKind, 'trade', 'Mobile Trade should store trade transaction state');
  assert(state.transactionText.includes('Buy') && state.transactionText.includes('Sell'), 'Mobile Trade transaction should show Buy/Sell lists');
  assert.strictEqual(state.composerHidden, true, 'Mobile Trade transaction should hide the underlying composer');
  assert.strictEqual(state.selectionControlsInsideTransaction, 0, 'Mobile Trade transaction should not duplicate actor/target controls');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Opening target detail should preserve selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Opening target detail should preserve marked targets');
  await page.evaluate(() => App.closeTransactionWindow());
  state = await page.evaluate(() => ({
    creatureDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false,
    transactionOpen: !document.getElementById('transaction-window-root')?.hidden,
    targetPickerOpen: App.mobileTargetPickerOpen,
    targetPickerDisplay: getComputedStyle(document.querySelector('#mobile-target-picker-belt')).display,
    targetButtons: document.querySelectorAll('#mobile-target-picker-belt button[data-command-control="focus-target"]').length,
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    trayText: document.querySelector('#mobile-target-action-tray')?.innerText || ''
  }));
  assert.strictEqual(state.creatureDrawerOpen, false, 'Transaction Back should keep the Creatures drawer closed on mobile');
  assert.strictEqual(state.transactionOpen, false, 'Transaction Back should close the focused transaction window');
  assert.strictEqual(state.targetPickerOpen, true, 'Transaction Back should restore the target picker');
  assert.notStrictEqual(state.targetPickerDisplay, 'none', 'Transaction Back should keep the target picker visible');
  assert(state.targetButtons >= 2, 'Transaction Back should restore target controls');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Transaction Back should keep selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Transaction Back should keep marked targets');
  assert(state.trayText.includes('Fight') && state.trayText.includes('Clear'), 'Transaction Back should keep shared composer intents visible');

  await page.locator(`#mobile-target-action-tray button[onclick*="resolveExplorationTargetAction('flirt','tease','composer-tray')"]`).click();
  state = await page.evaluate(() => ({
    action: App.lastIntentCommand?.action || '',
    subAction: App.lastIntentCommand?.subAction || '',
    source: App.lastIntentCommand?.source || '',
    targetIds: App.lastIntentCommand?.targetIds || [],
    targetsRemaining: [...App.explorationTargetIds],
    targetPleasures: App.creatures.filter(unit => unit.id === 'merchant-1').map(unit => unit.CPle),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(state.action, 'flirt', 'Safe mobile target intent should route through shared intent dispatch');
  assert.strictEqual(state.subAction, 'tease', 'Safe mobile target intent should preserve the selected sub-action');
  assert.strictEqual(state.source, 'composer-tray', 'Resolved compact rail intent should preserve composer-tray source metadata');
  assert(state.targetIds.includes('merchant-1') && state.targetIds.includes('player-1'), 'Resolved compact rail intent should record marked creature and party targets');
  assert.strictEqual(state.targetsRemaining.length, 0, 'Resolved compact rail intent should clear marked targets intentionally');
  assert(state.targetPleasures[0] > 0, 'Resolved safe intent should affect the marked creature target');
  assert.strictEqual(state.centerHasActorControls, false, 'Compact rail resolution should keep center free of actor controls');

  await page.locator(`#mobile-target-picker-belt button[onclick*="toggleExplorationTarget('creature','corpse-rail')"]`).click();
  state = await page.evaluate(() => {
    const tray = document.querySelector('#mobile-target-action-tray');
    const corpse = App.creatures.find(unit => unit.id === 'corpse-rail');
    const corpseChip = Array.from(document.querySelectorAll('#mobile-target-picker-belt .mobile-target-picker-chip')).find(chip => chip.textContent.includes('Remains'));
    return {
      targets: [...App.explorationTargetIds],
      trayText: tray?.innerText || '',
      trayHtml: tray?.innerHTML || '',
      fullDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false,
      corpseSelectedTarget: corpseChip?.classList.contains('selected-target') || false,
      corpseRemaining: App._corpseRemainingPortions(corpse),
      chipHasDirectLoot: (corpseChip?.innerHTML || '').includes("selectIntent('creature','corpse-rail','loot'"),
      chipHasDirectScavenge: (corpseChip?.innerHTML || '').includes("selectIntent('creature','corpse-rail','scavenge'"),
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.deepStrictEqual(state.targets, ['creature:corpse-rail'], 'Target picker should mark remains through the shared target state');
  assert(state.trayText.includes('Loot') && state.trayText.includes('Scavenge'), 'Marked remains should expose Loot and Scavenge in the mobile composer tray');
  assert(state.trayHtml.includes('data-command-intent="loot"') && state.trayHtml.includes('data-command-intent="scavenge"'), 'Marked remains utilities should identify composer-owned intents');
  assert.strictEqual(state.fullDrawerOpen, false, 'Marking remains from the target picker should not open the full Creatures drawer');
  assert.strictEqual(state.corpseSelectedTarget, true, 'Marked remains chip should expose selected-target state');
  assert.strictEqual(state.corpseRemaining, 4, 'Marked remains test should start with finite scavenge portions');
  assert.strictEqual(state.chipHasDirectLoot, false, 'Compact remains chip should not duplicate Loot outside the composer tray');
  assert.strictEqual(state.chipHasDirectScavenge, false, 'Compact remains chip should not duplicate Scavenge outside the composer tray');
  assert.strictEqual(state.centerHasActorControls, false, 'Marked remains should keep center free of actor controls');

  await page.locator(`#mobile-target-action-tray button[data-command-intent="scavenge"]`).click();
  state = await page.evaluate(() => {
    const corpse = App.creatures.find(unit => unit.id === 'corpse-rail');
    return {
      action: App.lastIntentCommand?.action || '',
      source: App.lastIntentCommand?.source || '',
      targetId: App.lastIntentCommand?.targetId || '',
      actorIds: App.lastIntentCommand?.actorIds || [],
      remaining: corpse?.remainingPortions ?? null,
      creatureDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false,
      targetPickerOpen: App.mobileTargetPickerOpen,
      targetPickerDisplay: getComputedStyle(document.querySelector('#mobile-target-picker-belt')).display,
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.action, 'scavenge', 'Compact remains utility should resolve through shared contextual intent dispatch');
  assert.strictEqual(state.source, 'composer-tray', 'Compact remains utility should preserve composer-tray source metadata');
  assert.strictEqual(state.targetId, 'corpse-rail', 'Compact remains utility should record the remains target id');
  assert.deepStrictEqual(state.actorIds, ['ally-1', 'scout-1'], 'Compact remains utility should use the selected compact rail actors');
  assert(state.remaining < 4, 'Compact remains Scavenge should consume finite remains portions');
  assert.strictEqual(state.creatureDrawerOpen, false, 'Resolving compact remains utility should not open the full Creatures drawer');
  assert.strictEqual(state.targetPickerOpen, true, 'Resolving compact remains utility should keep the target picker context available');
  assert.notStrictEqual(state.targetPickerDisplay, 'none', 'Resolving compact remains utility should keep target picker visible');
  assert.strictEqual(state.centerHasActorControls, false, 'Compact remains utility resolution should keep center free of actor controls');

  await page.setViewportSize({ width: 1365, height: 768 });
}

async function runClearAllBrowserStorageFlow(page) {
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });

  await createIndexedDb(page, 'YAW_Modules', ['modules', 'assets', 'settings']);
  await createIndexedDb(page, 'YAW_Saves', ['saves']);
  await createIndexedDb(page, 'YAW_Worlds', ['tiles']);
  await createIndexedDb(page, 'FFFme_Modules', ['modules']);
  await createIndexedDb(page, 'FFF_Saves', ['saves']);
  await createIndexedDb(page, 'FFF_Unrelated', ['records']);

  let names = await browserDatabaseNames(page);
  for (const expected of ['YAW_Modules', 'YAW_Saves', 'YAW_Worlds', 'FFFme_Modules', 'FFF_Saves', 'FFF_Unrelated']) {
    assert(names.includes(expected), `Precondition: ${expected} should exist in browser IndexedDB`);
  }

  const result = await page.evaluate(async () => {
    window.__clearAllAlerts = [];
    window.__clearAllReloaded = false;
    window.alert = message => window.__clearAllAlerts.push(String(message));
    App._reloadPage = () => { window.__clearAllReloaded = true; };
    localStorage.setItem('yaw-last-slot', 'slot1');
    localStorage.setItem('yaw-save-time-slot1', '12345');
    App.clearAllData();
    const confirmed = await App.resolveConfirmDialog(true);
    return {
      confirmed,
      alerts: window.__clearAllAlerts,
      reloaded: window.__clearAllReloaded,
      lastSlot: localStorage.getItem('yaw-last-slot'),
      saveTime: localStorage.getItem('yaw-save-time-slot1')
    };
  });
  assert.strictEqual(result.confirmed, true, 'Browser clear-all should resolve true after deleting data');
  assert.strictEqual(result.reloaded, true, 'Browser clear-all should request reload after deletion');
  assert.strictEqual(result.lastSlot, null, 'Browser clear-all should remove active last-slot metadata');
  assert.strictEqual(result.saveTime, null, 'Browser clear-all should remove slot save-time metadata');
  assert(result.alerts.some(text => text.includes('All data cleared')), 'Browser clear-all should report success');

  names = await browserDatabaseNames(page);
  for (const deleted of ['YAW_Modules', 'YAW_Saves', 'YAW_Worlds', 'FFFme_Modules', 'FFF_Saves']) {
    assert(!names.includes(deleted), `Browser clear-all should delete ${deleted}`);
  }
  assert(names.includes('FFF_Unrelated'), 'Browser clear-all should not delete unrelated legacy-looking databases');
}

async function runContentSettingsBrowserFlow(page) {
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App && window.CONTENT), null, { timeout: 5000 });

  let state = await page.evaluate(() => {
    App.showScreen('settings');
    App.showSettings();
    const tierSafe = document.querySelector('#tier-safe');
    const matureSection = document.querySelector('[data-setting-tier="mature"]');
    const adultSection = document.querySelector('[data-setting-tier="adult"]');
    const prefs = JSON.parse(localStorage.getItem('yaw-content-prefs') || '{}');
    const settings = JSON.parse(localStorage.getItem('yaw-settings') || '{}');
    return {
      maxTier: CONTENT.preferences.maxTier,
      prefsMaxTier: prefs.maxTier,
      voreEnabled: CONTENT.preferences.voreEnabled,
      explicitDescriptions: CONTENT.preferences.explicitDescriptions,
      fatalVore: App.settings.fatalVore,
      cockVoreEnabled: App.settings.cockVoreEnabled,
      forcedFeeding: App.settings.forcedFeeding,
      savedCockVore: settings.cockVoreEnabled,
      safeSelected: tierSafe?.style.background.includes('accent-primary') || false,
      matureVisible: getComputedStyle(matureSection).display !== 'none',
      adultVisible: getComputedStyle(adultSection).display !== 'none',
      voreDisabled: document.querySelector('#toggle-vore')?.disabled || false,
      explicitDisabled: document.querySelector('#toggle-explicit')?.disabled || false,
      adultToggleDisabled: document.querySelector('#toggle-cockVore')?.disabled || false
    };
  });

  assert.strictEqual(state.maxTier, 0, 'Generated app should boot with safe content tier by default');
  assert.strictEqual(state.prefsMaxTier, 0, 'Generated app should persist safe content tier under yaw-content-prefs');
  assert.strictEqual(state.voreEnabled, false, 'Generated app should not enable mature content flags by default');
  assert.strictEqual(state.explicitDescriptions, false, 'Generated app should not enable explicit descriptions by default');
  assert.strictEqual(state.fatalVore, false, 'Generated app should force mature app settings off at safe tier');
  assert.strictEqual(state.cockVoreEnabled, false, 'Generated app should force adult app settings off at safe tier');
  assert.strictEqual(state.forcedFeeding, false, 'Generated app should force adult interaction settings off at safe tier');
  assert.strictEqual(state.savedCockVore, false, 'Generated app should persist sanitized safe-tier settings');
  assert.strictEqual(state.safeSelected, true, 'Safe tier button should render selected on boot');
  assert.strictEqual(state.matureVisible, false, 'Safe tier should hide mature settings in the generated app');
  assert.strictEqual(state.adultVisible, false, 'Safe tier should hide adult settings in the generated app');
  assert.strictEqual(state.voreDisabled, true, 'Hidden mature content toggle should be disabled at safe tier');
  assert.strictEqual(state.explicitDisabled, true, 'Hidden explicit content toggle should be disabled at safe tier');
  assert.strictEqual(state.adultToggleDisabled, true, 'Hidden adult interaction toggles should be disabled at safe tier');

  await page.evaluate(() => {
    localStorage.setItem('yaw-content-prefs', JSON.stringify({
      maxTier: 'adult',
      voreEnabled: 'true',
      explicitDescriptions: 'true',
      filterTags: ['safe_tag', 'bad tag'],
      language: 'missing',
      injected: true
    }));
    localStorage.setItem('yaw-settings', JSON.stringify({
      fatalVore: 'true',
      cockVoreEnabled: 'true',
      forcedFeeding: 'true',
      highContrast: true,
      partyPlayFightMode: 'unsafe',
      injected: true
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App && window.CONTENT), null, { timeout: 5000 });

  state = await page.evaluate(() => {
    App.showScreen('settings');
    App.showSettings();
    const prefs = JSON.parse(localStorage.getItem('yaw-content-prefs') || '{}');
    const settings = JSON.parse(localStorage.getItem('yaw-settings') || '{}');
    return {
      maxTier: CONTENT.preferences.maxTier,
      prefs,
      voreEnabled: CONTENT.preferences.voreEnabled,
      explicitDescriptions: CONTENT.preferences.explicitDescriptions,
      language: CONTENT.preferences.language,
      fatalVore: App.settings.fatalVore,
      cockVoreEnabled: App.settings.cockVoreEnabled,
      forcedFeeding: App.settings.forcedFeeding,
      partyPlayFightMode: App.settings.partyPlayFightMode,
      injectedSetting: App.settings.injected,
      savedSettings: settings,
      matureVisible: getComputedStyle(document.querySelector('[data-setting-tier="mature"]')).display !== 'none',
      adultVisible: getComputedStyle(document.querySelector('[data-setting-tier="adult"]')).display !== 'none'
    };
  });

  assert.strictEqual(state.maxTier, 0, 'Malformed stored content tier should fall back to safe in the generated app');
  assert.strictEqual(state.prefs.maxTier, 0, 'Malformed content preferences should be rewritten under the YAW key');
  assert.strictEqual(state.prefs.injected, undefined, 'Generated app should drop unknown content preference keys');
  assert.deepStrictEqual(state.prefs.filterTags, ['safe_tag'], 'Generated app should sanitize persisted content filter tags');
  assert.strictEqual(state.voreEnabled, false, 'String truthy stored mature flags should not enable content');
  assert.strictEqual(state.explicitDescriptions, false, 'String truthy stored explicit flags should not enable content');
  assert.strictEqual(state.language, 'en', 'Unknown stored language should normalize to English');
  assert.strictEqual(state.fatalVore, false, 'String truthy stored mature setting should not enable runtime behavior');
  assert.strictEqual(state.cockVoreEnabled, false, 'String truthy stored adult setting should not enable runtime behavior');
  assert.strictEqual(state.forcedFeeding, false, 'String truthy stored adult interaction setting should not enable runtime behavior');
  assert.strictEqual(state.partyPlayFightMode, 'nonlethal', 'Unknown stored interaction mode should normalize safely');
  assert.strictEqual(state.injectedSetting, undefined, 'Generated app should drop unknown stored settings keys');
  assert.strictEqual(state.savedSettings.injected, undefined, 'Generated app should rewrite settings without unknown keys');
  assert.strictEqual(state.matureVisible, false, 'Generated app should keep mature settings hidden after malformed stored preferences');
  assert.strictEqual(state.adultVisible, false, 'Generated app should keep adult settings hidden after malformed stored preferences');

  await page.locator('#tier-adult').click();
  await page.locator('#toggle-vore').click();
  await page.locator('#toggle-explicit').click();
  await page.locator('#toggle-cockVore').click();
  await page.locator('#toggle-forcedFeed').click();

  state = await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('yaw-content-prefs') || '{}');
    const settings = JSON.parse(localStorage.getItem('yaw-settings') || '{}');
    return {
      maxTier: CONTENT.preferences.maxTier,
      prefs,
      voreEnabled: CONTENT.preferences.voreEnabled,
      explicitDescriptions: CONTENT.preferences.explicitDescriptions,
      cockVoreEnabled: App.settings.cockVoreEnabled,
      forcedFeeding: App.settings.forcedFeeding,
      savedCockVore: settings.cockVoreEnabled,
      savedForcedFeeding: settings.forcedFeeding,
      matureVisible: getComputedStyle(document.querySelector('[data-setting-tier="mature"]')).display !== 'none',
      adultVisible: getComputedStyle(document.querySelector('[data-setting-tier="adult"]')).display !== 'none'
    };
  });

  assert.strictEqual(state.maxTier, 2, 'Adult content should require explicit tier selection in the generated app');
  assert.strictEqual(state.prefs.maxTier, 2, 'Adult opt-in should persist under yaw-content-prefs');
  assert.strictEqual(state.voreEnabled, true, 'Mature gated toggle should only enable after adult tier is selected');
  assert.strictEqual(state.explicitDescriptions, true, 'Explicit descriptions should only enable after adult tier is selected');
  assert.strictEqual(state.cockVoreEnabled, true, 'Adult interaction setting should only enable after adult tier is selected');
  assert.strictEqual(state.forcedFeeding, true, 'Adult interaction toggle should persist through the generated app settings path');
  assert.strictEqual(state.savedCockVore, true, 'Adult interaction setting should persist under yaw-settings');
  assert.strictEqual(state.savedForcedFeeding, true, 'Adult interaction toggle should persist under yaw-settings');
  assert.strictEqual(state.matureVisible, true, 'Adult tier should expose mature settings');
  assert.strictEqual(state.adultVisible, true, 'Adult tier should expose adult settings');

  await page.locator('#tier-safe').click();
  state = await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('yaw-content-prefs') || '{}');
    const settings = JSON.parse(localStorage.getItem('yaw-settings') || '{}');
    return {
      maxTier: CONTENT.preferences.maxTier,
      prefs,
      voreEnabled: CONTENT.preferences.voreEnabled,
      explicitDescriptions: CONTENT.preferences.explicitDescriptions,
      cockVoreEnabled: App.settings.cockVoreEnabled,
      forcedFeeding: App.settings.forcedFeeding,
      savedCockVore: settings.cockVoreEnabled,
      savedForcedFeeding: settings.forcedFeeding,
      adultVisible: getComputedStyle(document.querySelector('[data-setting-tier="adult"]')).display !== 'none',
      adultToggleDisabled: document.querySelector('#toggle-cockVore')?.disabled || false
    };
  });

  assert.strictEqual(state.maxTier, 0, 'Returning to safe tier should update runtime content preferences');
  assert.strictEqual(state.prefs.maxTier, 0, 'Returning to safe tier should persist under yaw-content-prefs');
  assert.strictEqual(state.voreEnabled, false, 'Returning to safe tier should clear mature content flags');
  assert.strictEqual(state.explicitDescriptions, false, 'Returning to safe tier should clear explicit content flags');
  assert.strictEqual(state.cockVoreEnabled, false, 'Returning to safe tier should clear adult interaction settings');
  assert.strictEqual(state.forcedFeeding, false, 'Returning to safe tier should clear adult interaction toggles');
  assert.strictEqual(state.savedCockVore, false, 'Returning to safe tier should persist sanitized adult settings');
  assert.strictEqual(state.savedForcedFeeding, false, 'Returning to safe tier should persist sanitized adult interaction settings');
  assert.strictEqual(state.adultVisible, false, 'Returning to safe tier should hide adult settings');
  assert.strictEqual(state.adultToggleDisabled, true, 'Returning to safe tier should disable adult controls');
}

async function runIndexedDbNamespaceBrowserFlow(page) {
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });

  let names = await browserDatabaseNames(page);
  assert(names.includes('YAW_Modules'), 'Generated app boot should use the active YAW module database');
  assert(names.includes('YAW_Saves'), 'Generated app boot should use the active YAW save database');
  assert(!names.includes('FFFme_Modules'), 'Generated app boot should not recreate the legacy module database');
  assert(!names.includes('FFF_Saves'), 'Generated app boot should not recreate the legacy save database');

  await page.evaluate(async () => {
    await MODULE_SYSTEM.init();
    App.worldMeta = {
      worldId: 'namespace-world',
      seed: 'namespace-seed',
      generatorVersion: 2,
      mapModsHash: 'core'
    };
    App.worldMap = new Map([['0,0', { ...App.getBaseTile(0, 0), explored: true, biome: 'grove', creatures: [], items: [] }]]);
    App.tileDeltas = new Map([['0,0', { explored: true, biome: 'grove', name: 'Namespace Test Grove' }]]);
    await App.persistWorldStateToMapStore();
    MODULE_SYSTEM.closeDatabase();
  });

  names = await browserDatabaseNames(page);
  for (const activeName of ['YAW_Modules', 'YAW_Saves', 'YAW_Worlds']) {
    assert(names.includes(activeName), `Generated app should use active IndexedDB namespace ${activeName}`);
  }
  for (const legacyName of ['FFFme_Modules', 'FFF_Saves']) {
    assert(!names.includes(legacyName), `Generated app should not recreate legacy IndexedDB namespace ${legacyName}`);
  }
}

async function runSaveManagerSlotBrowserFlow(page) {
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });

  await page.evaluate(() => {
    localStorage.setItem('yaw-save-time-slot2', '1710000000000');
    localStorage.setItem('yaw-save-time-slot3', '1720000000000');
    App.activeSlot = 'slot1';
    App.showNewGameManager();
  });

  let state = await page.evaluate(() => ({
    mode: App.saveManagerMode,
    label: document.querySelector('#save-manager')?.getAttribute('aria-label') || '',
    visible: getComputedStyle(document.querySelector('#save-manager')).display !== 'none',
    hasOverwriteSlot2: Boolean(document.querySelector(`#save-manager button[aria-label="Overwrite Slot 2 with a new game"]`)),
    hasDeleteSlot3: Boolean(document.querySelector(`#save-manager button[aria-label="Delete Slot 3"]`)),
    hasSaveSlot2: Boolean(document.querySelector(`#save-manager button[aria-label="Save current game to Slot 2"]`)),
    slot2Time: localStorage.getItem('yaw-save-time-slot2'),
    slot3Time: localStorage.getItem('yaw-save-time-slot3')
  }));
  assert.strictEqual(state.mode, 'new', 'Browser new-game manager should enter new slot mode');
  assert.strictEqual(state.label, 'Choose New Game Slot', 'Browser new-game manager should expose the new-slot dialog label');
  assert.strictEqual(state.visible, true, 'Browser new-game manager should be visible');
  assert.strictEqual(state.hasOverwriteSlot2, true, 'Browser occupied new-game slot should expose overwrite action');
  assert.strictEqual(state.hasDeleteSlot3, true, 'Browser occupied new-game slot should expose delete action');
  assert.strictEqual(state.hasSaveSlot2, false, 'Browser new-game slot mode should not expose save-current-game actions');
  assert.strictEqual(state.slot2Time, '1710000000000', 'Browser slot precondition should mark slot2 occupied');
  assert.strictEqual(state.slot3Time, '1720000000000', 'Browser slot precondition should mark slot3 occupied');

  await page.locator(`#save-manager button[aria-label="Overwrite Slot 2 with a new game"]`).click();
  await assert.doesNotReject(() => page.locator('#app-confirm-dialog').waitFor({ state: 'visible', timeout: 1000 }), 'Browser occupied new-game overwrite should open confirmation');

  state = await page.evaluate(() => ({
    pending: Boolean(App.pendingConfirm),
    message: document.querySelector('#app-confirm-message')?.textContent || '',
    confirmLabel: Array.from(document.querySelectorAll('#app-confirm-dialog button')).map(btn => btn.textContent.trim()).join('|'),
    activeSlot: App.activeSlot,
    lastSlot: localStorage.getItem('yaw-last-slot'),
    createVisible: getComputedStyle(document.querySelector('#screen-create')).display !== 'none',
    saveManagerVisible: getComputedStyle(document.querySelector('#save-manager')).display !== 'none'
  }));
  assert.strictEqual(state.pending, true, 'Browser occupied new-game overwrite should use in-app pending confirmation');
  assert.strictEqual(state.message, 'Start a new game in Slot 2? This will overwrite that save slot. This cannot be undone.', 'Browser occupied new-game overwrite should name the selected slot');
  assert(state.confirmLabel.includes('Overwrite Slot'), 'Browser occupied new-game confirmation should expose overwrite label');
  assert.strictEqual(state.activeSlot, 'slot1', 'Browser occupied new-game confirmation should not change active slot before approval');
  assert.strictEqual(state.lastSlot, null, 'Browser occupied new-game confirmation should not persist lastSlot before approval');
  assert.strictEqual(state.createVisible, false, 'Browser occupied new-game confirmation should not open character creation before approval');
  assert.strictEqual(state.saveManagerVisible, true, 'Browser occupied new-game confirmation should leave save manager behind the modal');

  await page.locator('#app-confirm-dialog button').first().click();
  await assert.doesNotReject(() => page.locator('#app-confirm-dialog').waitFor({ state: 'detached', timeout: 1000 }), 'Browser cancelled new-game overwrite should close confirmation');
  state = await page.evaluate(() => ({
    pending: Boolean(App.pendingConfirm),
    activeSlot: App.activeSlot,
    lastSlot: localStorage.getItem('yaw-last-slot'),
    createVisible: getComputedStyle(document.querySelector('#screen-create')).display !== 'none',
    saveManagerVisible: getComputedStyle(document.querySelector('#save-manager')).display !== 'none'
  }));
  assert.strictEqual(state.pending, false, 'Browser cancelled new-game overwrite should clear pending confirmation');
  assert.strictEqual(state.activeSlot, 'slot1', 'Browser cancelled new-game overwrite should keep the active slot');
  assert.strictEqual(state.lastSlot, null, 'Browser cancelled new-game overwrite should not persist lastSlot');
  assert.strictEqual(state.createVisible, false, 'Browser cancelled new-game overwrite should not open character creation');
  assert.strictEqual(state.saveManagerVisible, true, 'Browser cancelled new-game overwrite should keep save manager visible');

  await page.locator(`#save-manager button[aria-label="Overwrite Slot 2 with a new game"]`).click();
  await assert.doesNotReject(() => page.locator('#app-confirm-dialog').waitFor({ state: 'visible', timeout: 1000 }), 'Browser approved new-game overwrite should reopen confirmation');
  await page.locator('#app-confirm-dialog button.primary').click();
  await page.waitForFunction(() => localStorage.getItem('yaw-last-slot') === 'slot2', null, { timeout: 1000 });

  state = await page.evaluate(() => ({
    pending: Boolean(App.pendingConfirm),
    activeSlot: App.activeSlot,
    lastSlot: localStorage.getItem('yaw-last-slot'),
    createVisible: getComputedStyle(document.querySelector('#screen-create')).display !== 'none',
    saveManagerVisible: getComputedStyle(document.querySelector('#save-manager')).display !== 'none'
  }));
  assert.strictEqual(state.pending, false, 'Browser approved new-game overwrite should clear pending confirmation');
  assert.strictEqual(state.activeSlot, 'slot2', 'Browser approved new-game overwrite should select the requested slot');
  assert.strictEqual(state.lastSlot, 'slot2', 'Browser approved new-game overwrite should persist the requested slot');
  assert.strictEqual(state.createVisible, true, 'Browser approved new-game overwrite should open character creation');
  assert.strictEqual(state.saveManagerVisible, false, 'Browser approved new-game overwrite should close the save manager overlay');

  await page.evaluate(() => {
    localStorage.setItem('yaw-save-time-slot3', '1720000000000');
    App.showNewGameManager();
  });
  await page.locator(`#save-manager button[aria-label="Delete Slot 3"]`).click();
  await assert.doesNotReject(() => page.locator('#app-confirm-dialog').waitFor({ state: 'visible', timeout: 1000 }), 'Browser delete slot should open confirmation');
  await page.locator('#app-confirm-dialog button.primary').click();
  await page.waitForFunction(() => localStorage.getItem('yaw-save-time-slot3') === null, null, { timeout: 1000 });

  state = await page.evaluate(() => ({
    pending: Boolean(App.pendingConfirm),
    mode: App.saveManagerMode,
    label: document.querySelector('#save-manager')?.getAttribute('aria-label') || '',
    slot3Time: localStorage.getItem('yaw-save-time-slot3'),
    saveManagerVisible: getComputedStyle(document.querySelector('#save-manager')).display !== 'none',
    hasUseEmptySlot3: Boolean(document.querySelector(`#save-manager button[aria-label="Start new game in Slot 3"]`)),
    hasSaveSlot3: Boolean(document.querySelector(`#save-manager button[aria-label="Save current game to Slot 3"]`)),
    hasLoadSlot3: Boolean(document.querySelector(`#save-manager button[aria-label="Load Slot 3"]`))
  }));
  assert.strictEqual(state.pending, false, 'Browser delete slot should clear pending confirmation');
  assert.strictEqual(state.mode, 'new', 'Browser delete from new-game slot mode should preserve new mode');
  assert.strictEqual(state.label, 'Choose New Game Slot', 'Browser delete from new-game mode should keep new-game dialog label');
  assert.strictEqual(state.slot3Time, null, 'Browser delete slot should remove only the selected slot timestamp');
  assert.strictEqual(state.saveManagerVisible, true, 'Browser delete from new-game mode should return to the save manager');
  assert.strictEqual(state.hasUseEmptySlot3, true, 'Browser deleted new-game slot should become an empty new-run target');
  assert.strictEqual(state.hasSaveSlot3, false, 'Browser delete from new-game mode should not switch to save actions');
  assert.strictEqual(state.hasLoadSlot3, false, 'Browser deleted slot should not expose a load action');
}

async function runMalformedSaveMetadataBrowserFlow(page) {
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });

  await page.evaluate(() => {
    localStorage.setItem('yaw-last-slot', '../bad');
    localStorage.setItem('yaw-last-save-time', '999');
    localStorage.setItem('yaw-save-time-slot2', '1700000000000');
  });
  await putIndexedDbValue(page, 'YAW_Saves', 'saves', 'slot2', [1, 2, 3]);

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
  await page.waitForFunction(() => localStorage.getItem('yaw-last-slot') === 'slot2', null, { timeout: 5000 });

  let state = await page.evaluate(() => ({
    lastSlot: localStorage.getItem('yaw-last-slot'),
    lastSaveTime: localStorage.getItem('yaw-last-save-time'),
    invalidSlotTime: localStorage.getItem('yaw-save-time-../bad'),
    continueVisible: getComputedStyle(document.querySelector('#menu-continue')).display !== 'none',
    screen: App.screen
  }));
  assert.strictEqual(state.lastSlot, 'slot2', 'Browser boot should replace malformed last-slot metadata with the latest valid slot');
  assert.strictEqual(state.lastSaveTime, '1700000000000', 'Browser boot should replace stale last-save metadata with the valid slot timestamp');
  assert.strictEqual(state.invalidSlotTime, null, 'Browser boot should not create timestamp metadata for malformed slot names');
  assert.strictEqual(state.continueVisible, true, 'Browser boot should keep Continue available after recovering valid save metadata');
  assert.strictEqual(state.screen, 'menu', 'Malformed save metadata sync should not force navigation or broken UI state');

  state = await page.evaluate(async () => {
    localStorage.setItem('yaw-last-slot', '../bad');
    localStorage.setItem('yaw-last-save-time', '999');
    const originalDbGet = App._dbGet.bind(App);
    const queriedKeys = [];
    App._dbGet = async (store, key) => {
      queriedKeys.push(String(key));
      return originalDbGet(store, key);
    };
    const synced = await App._syncLastSaveSlot();
    App._dbGet = originalDbGet;
    return {
      synced,
      queriedKeys,
      lastSlot: localStorage.getItem('yaw-last-slot'),
      lastSaveTime: localStorage.getItem('yaw-last-save-time')
    };
  });
  assert.strictEqual(state.synced, 'slot2', 'Browser save sync should recover the latest valid slot after malformed metadata returns');
  assert(!state.queriedKeys.includes('../bad'), 'Browser save sync should never query IndexedDB with a malformed slot key');
  assert.strictEqual(state.lastSlot, 'slot2', 'Browser save sync should rewrite malformed last-slot metadata after recovery');
  assert.strictEqual(state.lastSaveTime, '1700000000000', 'Browser save sync should restore the valid slot timestamp after recovery');

  state = await page.evaluate(async () => {
    App.pendingConfirm = null;
    App.activeSlot = 'slot2';
    localStorage.setItem('yaw-last-slot', 'slot2');
    localStorage.setItem('yaw-save-time-slot1', '1700000000001');
    const deletedKeys = [];
    const originalDbDelete = App._dbDelete.bind(App);
    App._dbDelete = async (store, key) => {
      deletedKeys.push(String(key));
      return originalDbDelete(store, key);
    };
    const newGameStarted = App.beginNewGameInSlot('../bad');
    const deleteStarted = await App.deleteSlot('../bad');
    App._dbDelete = originalDbDelete;
    return {
      newGameStarted,
      deleteStarted,
      deletedKeys,
      pendingConfirm: Boolean(App.pendingConfirm),
      activeSlot: App.activeSlot,
      lastSlot: localStorage.getItem('yaw-last-slot'),
      slot1Time: localStorage.getItem('yaw-save-time-slot1'),
      createVisible: getComputedStyle(document.querySelector('#screen-create')).display !== 'none'
    };
  });
  assert.strictEqual(state.newGameStarted, false, 'Browser invalid new-game slot should be rejected instead of falling back');
  assert.strictEqual(state.deleteStarted, false, 'Browser invalid delete slot should be rejected instead of falling back');
  assert.deepStrictEqual(state.deletedKeys, [], 'Browser invalid delete slot should not delete any IndexedDB key');
  assert.strictEqual(state.pendingConfirm, false, 'Browser invalid destructive slot requests should not open confirmations');
  assert.strictEqual(state.activeSlot, 'slot2', 'Browser invalid destructive slot requests should preserve activeSlot');
  assert.strictEqual(state.lastSlot, 'slot2', 'Browser invalid destructive slot requests should preserve last-slot metadata');
  assert.strictEqual(state.slot1Time, '1700000000001', 'Browser invalid destructive slot requests should preserve unrelated save timestamps');
  assert.strictEqual(state.createVisible, false, 'Browser invalid new-game slot should not open character creation');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await page.goto(distUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
    await clearBrowserStorage(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
    await runCombatTargetFirstComposerFlow(page);
    await runActionMatrix(page);
    await runReachabilityMatrix(page);
    await runMultiEnemyCombatTargetingFlow(page);
    await runStaleSyncParticipantFlow(page);
    await runCombatSlotGroupComposerFlow(page);
    await runDesktopSyncComposerFlow(page);
    await runMobileSyncComposerFlow(page);
    await runCombatNonTargetClearFlow(page);
    await runCombatFleeComposerFlow(page);
    await runAdventureMarkedTargetFlow(page);
    await runDesktopCompactCardRoundTripFlow(page);
    await runStaleMarkedActorFlow(page);
    await runSelectionSemanticsFlow(page);
    await runCenterResourceSearchFlow(page);
    await runContextualCardIntentSourceFlow(page);
    await runDesktopIntentSubActionSheetFlow(page);
    await runRadialIntentSubActionPresentationFlow(page);
    await runMobileSelectionAndCombatFlow(page);
    await runCompactRailRoundTripFlow(page);
    await runContentSettingsBrowserFlow(page);
    await runIndexedDbNamespaceBrowserFlow(page);
    await runSaveManagerSlotBrowserFlow(page);
    await runMalformedSaveMetadataBrowserFlow(page);
    await runClearAllBrowserStorageFlow(page);
    await page.close();
  } finally {
    await browser.close();
  }
  console.log('Combat interaction checks passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
