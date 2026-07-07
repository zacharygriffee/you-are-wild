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
  const target = page.locator('#enemies-content button[onclick*="executeActionOnTarget"]').first();
  await assert.doesNotReject(() => target.waitFor({ state: 'visible', timeout: 1000 }), `${action} should render a target button`);
  await target.click();
}

async function runCombatTargetFirstComposerFlow(page) {
  await page.setViewportSize({ width: 1365, height: 768 });
  await setupCombat(page);
  const desktopMark = page.locator('#enemies-content button[data-command-control="mark-combat-target"]').first();
  await assert.doesNotReject(() => desktopMark.waitFor({ state: 'visible', timeout: 1000 }), 'Desktop combat enemy card should expose target-first Mark');
  await desktopMark.click();
  let state = await page.evaluate(() => ({
    markedTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    sentence: document.querySelector('#selection-sentence')?.innerText || '',
    enemySelectedTarget: document.querySelector('#enemies-content .compact-tactical-card')?.classList.contains('selected-target') || false,
    hasCombatPick: Boolean(document.querySelector('#enemies-content button[data-selection-mode="combat-pick"]'))
  }));
  assert.strictEqual(state.markedTargetId, 'enemy-1', 'Desktop combat Mark should store a combat target');
  assert.strictEqual(state.targetSelection, null, 'Desktop combat Mark should not enter intent-first target-pick state');
  assert(state.sentence.includes('You') && state.sentence.includes('Enemy') && state.sentence.includes('Choose'), 'Desktop sentence should show Actor -> Target -> Intent after combat Mark');
  assert.strictEqual(state.enemySelectedTarget, true, 'Desktop marked combat enemy should expose selected-target state');
  assert.strictEqual(state.hasCombatPick, false, 'Desktop target-first Mark should not render combat-pick controls before intent');

  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    combatTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    commandSource: App.lastIntentCommand?.source || '',
    commandTargetIds: App.lastIntentCommand?.targetIds || [],
    commandAction: App.lastIntentCommand?.action || ''
  }));
  assert(state.enemyPun < 100, 'Desktop target-first Fight should resolve against the marked enemy');
  assert.strictEqual(state.combatTargetId, null, 'Desktop target-first Fight should clear the combat target after resolving');
  assert.strictEqual(state.targetSelection, null, 'Desktop target-first Fight should not leave target-pick state active');
  assert.strictEqual(state.commandSource, 'combat-composer', 'Desktop target-first Fight should identify the composer command source');
  assert.deepStrictEqual(state.commandTargetIds, ['enemy-1'], 'Desktop target-first Fight should dispatch the marked enemy id');
  assert.strictEqual(state.commandAction, 'fight', 'Desktop target-first Fight should dispatch the selected intent');

  await page.setViewportSize({ width: 390, height: 844 });
  await setupCombat(page);
  const mobileMark = page.locator('#mobile-creature-strip button[data-command-control="mark-combat-target"]').first();
  await assert.doesNotReject(() => mobileMark.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile combat enemy chip should expose target-first Mark');
  await mobileMark.click();
  state = await page.evaluate(() => ({
    markedTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    sentence: document.querySelector('#mobile-combat-toolbelt .mobile-combat-selection-sentence')?.innerText || '',
    enemySelectedTarget: document.querySelector('#mobile-creature-strip .mobile-unit-chip')?.classList.contains('selected-target') || false,
    hasCombatPick: Boolean(document.querySelector('#mobile-creature-strip button[data-selection-mode="combat-pick"]')),
    hasAdventureMark: (document.querySelector('#mobile-creature-strip')?.innerHTML || '').includes("toggleExplorationTarget('creature'")
  }));
  assert.strictEqual(state.markedTargetId, 'enemy-1', 'Mobile combat Mark should store a combat target');
  assert.strictEqual(state.targetSelection, null, 'Mobile combat Mark should not enter intent-first target-pick state');
  assert(state.sentence.includes('You') && state.sentence.includes('Enemy') && state.sentence.includes('Choose'), 'Mobile sentence should show Actor -> Target -> Intent after combat Mark');
  assert.strictEqual(state.enemySelectedTarget, true, 'Mobile marked combat enemy should expose selected-target state');
  assert.strictEqual(state.hasCombatPick, false, 'Mobile target-first Mark should not render combat-pick controls before intent');
  assert.strictEqual(state.hasAdventureMark, false, 'Mobile combat Mark should not render adventure target controls');

  await page.locator(`#mobile-combat-toolbelt button[onclick*="executeCombatIntent('fight')"]`).first().click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    combatTargetId: App.combatTargetId,
    targetSelection: App.targetSelection,
    commandSource: App.lastIntentCommand?.source || '',
    commandTargetIds: App.lastIntentCommand?.targetIds || []
  }));
  assert(state.enemyPun < 100, 'Mobile target-first Fight should resolve against the marked enemy');
  assert.strictEqual(state.combatTargetId, null, 'Mobile target-first Fight should clear the combat target after resolving');
  assert.strictEqual(state.targetSelection, null, 'Mobile target-first Fight should not leave target-pick state active');
  assert.strictEqual(state.commandSource, 'combat-composer', 'Mobile target-first Fight should identify the composer command source');
  assert.deepStrictEqual(state.commandTargetIds, ['enemy-1'], 'Mobile target-first Fight should dispatch the marked enemy id');
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
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|executeCombatIntent|executeActionOnTarget/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.enemyPun < 100, 'Fight should damage a reachable enemy through panel clicks');
  assert.strictEqual(state.targetSelection, null, 'Fight should clear target selection after resolving');
  assert.strictEqual(state.centerSummary, true, 'Combat center should render current-exchange feedback after a panel action');
  assert(state.turnOrder.includes('Current') && state.turnOrder.includes('Next'), 'Combat center should surface passive current and next turn context');
  assert(state.recentExchange.includes('hit') || state.recentExchange.includes('miss'), 'Combat center should surface the resolved exchange text');
  assert.strictEqual(state.centerHasActorControls, false, 'Combat center feedback should not duplicate actor or target controls');

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
  let target = page.locator('#enemies-content button[onclick*="executeActionOnTarget"]').first();
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
  target = page.locator('#mobile-creature-strip button[onclick*="executeActionOnTarget"]').first();
  await target.waitFor({ state: 'visible', timeout: 1000 });
  attrs = await target.evaluate(el => ({ disabled: el.disabled, ariaDisabled: el.getAttribute('aria-disabled'), label: el.getAttribute('aria-label') || '' }));
  state = await page.evaluate(() => {
    const chip = document.querySelector('#mobile-creature-strip .mobile-unit-chip');
    return {
      chipMeta: chip?.querySelector('.mobile-chip-meta')?.innerText || '',
      selectedTarget: chip?.classList.contains('selected-target') || false,
      targetSelectionAction: App.targetSelection?.action || null,
      enemyPun: App.creatures[0]?.CPun
    };
  });
  assert.strictEqual(attrs.disabled, true, 'Mobile unreachable fight target should be an actual disabled chip control');
  assert.strictEqual(attrs.ariaDisabled, 'true', 'Mobile unreachable fight target should expose disabled state accessibly');
  assert(attrs.label.includes('Enemy is airborne'), 'Mobile unreachable fight target should explain the flying reach blocker');
  assert(state.chipMeta.includes('Back'), 'Mobile compact enemy chip should show row feedback while targeting');
  assert.strictEqual(state.selectedTarget, false, 'Mobile blocked combat target should not be styled as a pickable target');
  assert.strictEqual(state.enemyPun, 100, 'Mobile disabled fight target should not damage enemy');
  assert.strictEqual(state.targetSelectionAction, 'fight', 'Mobile disabled fight target should preserve selected intent for correction');
  await page.setViewportSize({ width: 1365, height: 768 });

  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 20, MPun: 100, size: 2 } });
  await page.locator(`#desktop-context-belt button[onclick*="executeCombatIntent('feast')"]`).first().click();
  target = page.locator('#enemies-content button[onclick*="executeActionOnTarget"]').first();
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
    const pick = document.querySelector('#enemies-content button[data-selection-mode="combat-pick"]');
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
  assert.strictEqual(state.enemySelectedTarget, true, 'Combat pickable enemy should expose target state');
  assert.strictEqual(state.pickControl, 'combat-target', 'Combat pick button should use combat-target control semantics');
  assert.strictEqual(state.pickState, 'pickable', 'Combat pick button should expose pickable state');
  assert.strictEqual(state.hasAdventureMark, false, 'Combat target picking should not render adventure Mark controls');
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
  const mobileMark = page.locator(`#mobile-creature-strip button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first();
  await assert.doesNotReject(() => mobileMark.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile creature chip Mark should render as the chip-level target control');
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
  assert.strictEqual(state.mode, 'adventure', 'Mobile creature chip Inspect should normalize as an adventure command');
  assert.deepStrictEqual(state.targetIds, ['friendly-1'], 'Mobile creature chip Inspect should record the tapped creature target');
  assert(state.lastLog.includes('Friendly [human]'), 'Mobile creature chip Inspect should still use the normal inspect resolution');
  assert.strictEqual(state.centerHasActorControls, false, 'Mobile creature chip Inspect should keep center free of actor controls');

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

  await page.locator(`#mobile-creature-strip button[data-selection-mode="mark-target"][onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();
  const mobileTray = page.locator('#mobile-target-action-tray .target-action-row').first();
  await assert.doesNotReject(() => mobileTray.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile marked-target tray should render in the visible exploration control belt');
  await page.locator(`#mobile-actor-toggle`).first().click();
  await page.locator(`#mobile-actor-belt button[data-selection-mode="act-actor"][onclick*="selectExplorationActor(1)"]`).first().click();

  state = await page.evaluate(() => {
    const trayEl = document.querySelector('#mobile-target-action-tray');
    const partyStripTray = document.querySelector('#mobile-party-strip .panel-interaction-tray');
    const allyChip = Array.from(document.querySelectorAll('#mobile-actor-belt .mobile-actor-chip')).find(chip => chip.textContent.includes('Ally'));
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
  await page.locator(`#mobile-combat-toolbelt button[onclick*="executeCombatIntent('sync')"]`).first().click();
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
  const mobilePick = page.locator('#mobile-creature-strip button[data-selection-mode="combat-pick"]').first();
  await assert.doesNotReject(() => mobilePick.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile combat pick should render in creature strip');
  state = await page.evaluate(() => {
    const pick = document.querySelector('#mobile-creature-strip button[data-selection-mode="combat-pick"]');
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
  assert.strictEqual(state.pickControl, 'combat-target', 'Mobile combat pick should use combat-target semantics');
  assert.strictEqual(state.pickState, 'pickable', 'Mobile combat pick should expose pickable state');
  assert.strictEqual(state.enemySelectedTarget, true, 'Mobile combat pickable enemy should expose selected-target state');
  assert.strictEqual(state.hasAdventureMark, false, 'Mobile combat target picking should not render adventure Mark controls');

  await mobilePick.click();
  state = await page.evaluate(() => ({
    enemyPun: App.creatures.find(unit => unit.id === 'enemy-1')?.CPun,
    targetSelection: App.targetSelection,
    commandSource: App.lastIntentCommand?.source || '',
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.enemyPun < 100, 'Mobile combat pick should resolve the selected fight target');
  assert.strictEqual(state.targetSelection, null, 'Mobile combat pick should clear target selection after resolving');
  assert.strictEqual(state.commandSource, 'combat-targeting', 'Mobile combat pick should identify the combat target-picker command surface');
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
    creatureChipCount: document.querySelectorAll('#mobile-creature-strip .mobile-unit-chip').length,
    partyActorButtons: document.querySelectorAll('#mobile-actor-belt button[data-selection-mode="act-actor"]').length,
    targetIds: [...App.explorationTargetIds]
  }));
  assert(state.cueText.includes('2 creatures here'), 'Mobile presence cue should summarize multiple living creatures');
  assert(state.cueBounds && state.cueBounds.width > 0 && state.cueBounds.height > 0 && state.cueBounds.mobileSurfaceDisplay !== 'none' && state.cueBounds.screenGameDisplay !== 'none', `Mobile presence cue should be visible before opening target rail: ${JSON.stringify(state.cueBounds)}`);
  assert.strictEqual(state.creatureRailDisplay, 'none', 'Compact creature rail should start closed when explicitly toggled closed');
  assert.strictEqual(state.creatureChipCount, 3, 'Closed compact creature rail should keep rendered targets ready for reopening');
  assert.strictEqual(state.partyActorButtons, 0, 'Compact party actor rail should start closed');
  assert.deepStrictEqual(state.targetIds, [], 'Compact rail scenario should start without marked targets');

  const presenceCue = page.locator('#mobile-creature-presence-cue button[data-command-control="open-target-picker"]');
  await presenceCue.scrollIntoViewIfNeeded();
  await presenceCue.click();
  await page.locator(`#mobile-creature-strip button[onclick*="toggleExplorationTarget('creature','merchant-1')"]`).click();
  state = await page.evaluate(() => ({
    creatureRailOpen: App.mobileCreatureRailOpen,
    creatureRailDisplay: getComputedStyle(document.querySelector('#mobile-creature-card')).display,
    targets: [...App.explorationTargetIds],
    trayText: document.querySelector('#mobile-target-action-tray')?.innerText || '',
    fullDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false
  }));
  assert.strictEqual(state.creatureRailOpen, true, 'Presence cue should open the compact target rail for multiple creatures');
  assert.notStrictEqual(state.creatureRailDisplay, 'none', 'Compact target rail should be visible after cue activation');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1'], 'Creature rail target control should mark the selected creature');
  assert(state.trayText.includes('Fight') && state.trayText.includes('Trade'), 'Marked merchant should expose safe primary and contextual intents in the composer tray');
  assert.strictEqual(state.fullDrawerOpen, false, 'Creature rail marking should not open the full Creatures drawer');

  await page.locator(`.mobile-panel-dock button[data-command-control="toggle-actor-rail"]`).click();
  await page.locator(`#mobile-actor-belt button[onclick*="selectExplorationActor(1)"]`).click();
  await page.locator(`#mobile-actor-belt button[onclick*="selectExplorationActor(2)"]`).click();
  await page.locator(`#mobile-actor-belt button[onclick*="toggleExplorationTarget('party','player-1')"]`).click();
  state = await page.evaluate(() => ({
    actorRailOpen: App.mobileActorBeltOpen,
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort(),
    actorBeltText: document.querySelector('#mobile-actor-belt')?.innerText || '',
    sentence: document.querySelector('#mobile-selection-sentence')?.innerText || '',
    fullPartyDrawerOpen: document.querySelector('#panel-party')?.classList.contains('active') || false
  }));
  assert.strictEqual(state.actorRailOpen, true, 'Party dock should open the compact actor rail');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Compact actor rail should support multiple selected party actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Compact actor rail should allow marking a party member as target without losing creature target');
  assert(state.actorBeltText.includes('Ally') && state.actorBeltText.includes('Scout'), 'Compact actor rail should show selected party choices');
  assert(state.sentence.includes('Ally') && state.sentence.includes('Merchant'), 'Mobile composer sentence should summarize selected actors and targets');
  assert.strictEqual(state.fullPartyDrawerOpen, false, 'Party rail selection should not open the full Party drawer');

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

  await page.locator(`#mobile-creature-card button[data-command-control="open-target-drawer"]`).click();
  state = await page.evaluate(() => ({
    creatureDrawerOpen: document.querySelector('#panel-enemies')?.classList.contains('active') || false,
    actors: App._getExplorationActors().map(unit => unit.id),
    targets: [...App.explorationTargetIds].sort()
  }));
  assert.strictEqual(state.creatureDrawerOpen, true, 'Compact target rail Details should open the Creatures drawer');
  assert.deepStrictEqual(state.actors, ['ally-1', 'scout-1'], 'Opening Creature details should preserve selected actors');
  assert.deepStrictEqual(state.targets, ['creature:merchant-1', 'party:player-1'], 'Opening Creature details should preserve marked targets');
  await page.evaluate(() => App.closeAllPanels());

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
    await runStaleSyncParticipantFlow(page);
    await runCombatNonTargetClearFlow(page);
    await runAdventureMarkedTargetFlow(page);
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
