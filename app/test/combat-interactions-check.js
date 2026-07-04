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
    App.explorationTargetIds = [];
    App.renderDesktopPlaySurface();
    App.renderParty();
    App.renderCreatures();
    App.renderExplorationActions();
  }, options);
}

async function clickIntentAndTarget(page, action) {
  await page.locator(`#party-content button[onclick*="executeCombatIntent('${action}')"]`).first().click();
  const target = page.locator('#enemies-content button[onclick*="executeActionOnTarget"]').first();
  await assert.doesNotReject(() => target.waitFor({ state: 'visible', timeout: 1000 }), `${action} should render a target button`);
  await target.click();
}

async function runActionMatrix(page) {
  await setupCombat(page);
  await clickIntentAndTarget(page, 'fight');
  let state = await page.evaluate(() => ({ enemyPun: App.creatures[0]?.CPun, targetSelection: App.targetSelection }));
  assert(state.enemyPun < 100, 'Fight should damage a reachable enemy through panel clicks');
  assert.strictEqual(state.targetSelection, null, 'Fight should clear target selection after resolving');

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
  await page.locator(`#party-content button[onclick*="executeCombatIntent('feed')"]`).first().click();
  state = await page.evaluate(() => ({
    allyPun: App.party.find(p => p.id === 'ally-1')?.CPun,
    advanced: App._advancedTurn === true
  }));
  assert(state.allyPun > 40, 'Feed should heal the wounded ally through the active party card');
  assert.strictEqual(state.advanced, true, 'Feed should consume the combat turn');
}

async function runReachabilityMatrix(page) {
  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 100, MPun: 100 } });
  await page.locator(`#party-content button[onclick*="executeCombatIntent('fight')"]`).first().click();
  let target = page.locator('#enemies-content button[onclick*="executeActionOnTarget"]').first();
  await target.waitFor({ state: 'visible', timeout: 1000 });
  let attrs = await target.evaluate(el => ({ ariaDisabled: el.getAttribute('aria-disabled'), label: el.getAttribute('aria-label') || '' }));
  assert.strictEqual(attrs.ariaDisabled, 'true', 'Unreachable fight target should be visibly unavailable but clickable for feedback');
  assert(attrs.label.includes('Cannot select Enemy as Fight target'), 'Unreachable fight target should explain why it is unavailable');
  await target.click({ force: true });
  let state = await page.evaluate(() => ({
    enemyPun: App.creatures[0]?.CPun,
    targetSelectionAction: App.targetSelection?.action || null,
    lastLog: App.log[App.log.length - 1]?.text || ''
  }));
  assert.strictEqual(state.enemyPun, 100, 'Invalid fight target click should not damage enemy');
  assert.strictEqual(state.targetSelectionAction, 'fight', 'Invalid fight target click should preserve selected intent for correction');
  assert(state.lastLog.includes('cannot reach'), 'Invalid fight target click should log reach feedback');

  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 20, MPun: 100, size: 2 } });
  await page.locator(`#party-content button[onclick*="executeCombatIntent('feast')"]`).first().click();
  target = page.locator('#enemies-content button[onclick*="executeActionOnTarget"]').first();
  await target.waitFor({ state: 'visible', timeout: 1000 });
  attrs = await target.evaluate(el => ({ ariaDisabled: el.getAttribute('aria-disabled'), label: el.getAttribute('aria-label') || '' }));
  assert.strictEqual(attrs.ariaDisabled, 'true', 'Unreachable feast target should be visibly unavailable but clickable for feedback');
  await target.click({ force: true });
  state = await page.evaluate(() => ({
    stomachCount: App.player.stomach.length,
    targetSelectionAction: App.targetSelection?.action || null,
    lastLog: App.log[App.log.length - 1]?.text || ''
  }));
  assert.strictEqual(state.stomachCount, 0, 'Invalid feast target click should not contain enemy');
  assert.strictEqual(state.targetSelectionAction, 'feast', 'Invalid feast target click should preserve selected intent for correction');
  assert(state.lastLog.includes('cannot reach'), 'Invalid feast target click should log reach feedback');

  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 100, MPun: 100 } });
  await clickIntentAndTarget(page, 'flirt');
  state = await page.evaluate(() => ({ enemyPle: App.creatures[0]?.CPle }));
  assert(state.enemyPle > 0, 'Flirt should still target flying back-row enemies because it is not physical reach');

  await setupCombat(page, { enemyOverrides: { flying: true, combatRow: 'back', CPun: 100, MPun: 100 } });
  await clickIntentAndTarget(page, 'fuck');
  state = await page.evaluate(() => ({ enemyPle: App.creatures[0]?.CPle }));
  assert(state.enemyPle > 0, 'Social combat action should still target flying back-row enemies because it is not physical reach');
}

async function runAdventureMarkedTargetFlow(page) {
  await setupAdventure(page);
  let center = await page.evaluate(() => document.querySelector('#desktop-play-cell-center')?.innerHTML || '');
  assert(!/selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(center), 'Center tile should not expose actor or target controls in adventure');

  await page.locator(`#party-content button[onclick*="selectExplorationActor(1)"]`).first().click();
  await page.locator(`#enemies-content button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();

  const tray = page.locator('#party-content .panel-interaction-tray');
  await assert.doesNotReject(() => tray.waitFor({ state: 'visible', timeout: 1000 }), 'Marked target tray should render above party cards');
  const trayState = await page.evaluate(() => {
    const trayEl = document.querySelector('#party-content .panel-interaction-tray');
    const partyContent = document.querySelector('#party-content');
    return {
      isFirstChild: partyContent?.firstElementChild === trayEl,
      hasPanelSource: trayEl?.innerHTML.includes("resolveExplorationTargetAction('fight','attack','panel-tray')") || false,
      actorSummary: trayEl?.textContent?.includes('Actors: Ally') || false,
      targetSummary: trayEl?.textContent?.includes('Targets: Friendly') || false,
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(trayState.isFirstChild, true, 'Marked target tray should sit above party cards');
  assert.strictEqual(trayState.hasPanelSource, true, 'Marked target tray should dispatch through the panel-tray command source');
  assert.strictEqual(trayState.actorSummary, true, 'Marked target tray should summarize the selected actor');
  assert.strictEqual(trayState.targetSummary, true, 'Marked target tray should summarize the marked creature target');
  assert.strictEqual(trayState.centerHasActorControls, false, 'Center tile should stay free of actor controls while a target is marked');

  await page.locator(`#party-content .panel-interaction-tray button[onclick*="resolveExplorationTargetAction('flirt','tease','panel-tray')"]`).first().click();
  const resolved = await page.evaluate(() => ({
    targetPle: App.creatures.find(unit => unit.id === 'friendly-1')?.CPle,
    targetsRemaining: App.explorationTargetIds.length,
    actors: App._getExplorationActors().map(unit => unit.id),
    commandSource: App.lastIntentCommand?.source || '',
    trayVisible: Boolean(document.querySelector('#party-content .panel-interaction-tray')),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(resolved.targetPle > 0, 'Panel-tray marked target action should resolve against the marked creature');
  assert.strictEqual(resolved.targetsRemaining, 0, 'Resolved marked target action should clear target marks');
  assert.deepStrictEqual(resolved.actors, ['ally-1'], 'Resolved marked target action should preserve the selected actor');
  assert.strictEqual(resolved.commandSource, 'panel-tray', 'Resolved marked target action should preserve panel source metadata');
  assert.strictEqual(resolved.trayVisible, false, 'Resolved marked target action should remove the tray after clearing targets');
  assert.strictEqual(resolved.centerHasActorControls, false, 'Center tile should stay free of actor controls after resolving a marked target action');

  await setupAdventure(page);
  await page.locator(`#party-content button[onclick*="selectExplorationActor(1)"]`).first().click();
  await page.locator(`#enemies-content button[onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();
  await setupCombat(page);
  const swapped = await page.evaluate(() => ({
    trayVisible: Boolean(document.querySelector('#party-content .panel-interaction-tray')),
    combatButtons: document.querySelector('#party-content')?.innerHTML.includes("executeCombatIntent('fight')") || false,
    creatureMarkButtons: document.querySelector('#enemies-content')?.innerHTML.includes("toggleExplorationTarget('creature'") || false,
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert.strictEqual(swapped.trayVisible, false, 'Switching into combat should hide adventure marked-target tray');
  assert.strictEqual(swapped.combatButtons, true, 'Switching into combat should render combat intent controls in the party panel');
  assert.strictEqual(swapped.creatureMarkButtons, false, 'Switching into combat should replace adventure target marks with combat target picks');
  assert.strictEqual(swapped.centerHasActorControls, false, 'Center tile should stay free of actor controls after switching into combat');
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
      selectedTarget: card.classList.contains('selected-target')
    }))
  }));
  assert.deepStrictEqual(initial.actors, ['player-1'], 'Adventure should start with the player as selected actor');
  assert.deepStrictEqual(initial.targets, [], 'Adventure should start with no marked targets');
  assert.strictEqual(initial.partyCards[0]?.purpose, 'focus-toggle', 'Party card click target should be explicitly scoped to focus');
  assert(initial.partyCards[0]?.label.includes('Focus You card'), 'Party card focus label should describe focus, not action selection');
  assert.strictEqual(initial.partyCards[0]?.selectedActor, true, 'Player card should show actor state separately from focus');
  assert.strictEqual(initial.partyCards[0]?.selectedTarget, false, 'Player card should not imply target state');

  await page.locator('#party-content .unit-card').nth(1).click({ position: { x: 16, y: 16 } });
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

  await page.locator('#enemies-content .unit-card').first().click({ position: { x: 16, y: 16 } });
  state = await page.evaluate(() => ({
    creatureExpanded: Boolean(App.creatures.find(unit => unit.id === 'friendly-1')?.expanded),
    actors: App._getExplorationActors().map(unit => unit.id || unit.name),
    targets: [...App.explorationTargetIds]
  }));
  assert.strictEqual(state.creatureExpanded, true, 'Clicking a marked creature card body should still only focus/expand the card');
  assert.deepStrictEqual(state.actors, ['ally-1'], 'Creature focus should not change selected actor');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1'], 'Creature focus should not clear or add target marks');

  await setupCombat(page);
  await page.locator(`#party-content button[onclick*="executeCombatIntent('fight')"]`).first().click();
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

  const search = page.locator(`#scene-actions button[onclick*="App.search()"]`).first();
  await assert.doesNotReject(() => search.waitFor({ state: 'visible', timeout: 1000 }), 'Search should render on a searchable resource-site center tile');

  let state = await page.evaluate(() => ({
    contextTitle: document.querySelector('#scene-title')?.textContent || '',
    contextDescription: document.querySelector('#scene-description')?.textContent || '',
    desktopSearchVisible: Boolean(document.querySelector('#scene-actions button[onclick*="App.search()"]')),
    mobileSearchVisible: Boolean(document.querySelector('#mobile-explore-actions button[onclick*="App.search()"]')),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.contextTitle.includes('Grove') || state.contextTitle.includes('Road') || state.contextTitle.includes('Tile'), 'Center context should continue to own the current tile title');
  assert(state.contextDescription.includes('berry thicket'), 'Center context should describe the searchable resource tile');
  assert.strictEqual(state.desktopSearchVisible, true, 'Desktop center actions should expose Search before resource-site consumption');
  assert.strictEqual(state.mobileSearchVisible, true, 'Mobile center actions should expose Search before resource-site consumption');
  assert.strictEqual(state.centerHasActorControls, false, 'Resource-site center context should not expose actor controls');

  await search.click();

  state = await page.evaluate(() => ({
    inventoryCount: App.inventory.length,
    inventoryName: App.inventory[0]?.name || '',
    tileSearched: App.getTile(4, 0)?.resourceSearched === true,
    deltaSearched: App.getTileDelta(4, 0)?.resourceSearched === true,
    desktopSearchVisible: Boolean(document.querySelector('#scene-actions button[onclick*="App.search()"]')),
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

  await page.locator(`#mobile-party-strip button[data-selection-mode="act-actor"][onclick*="selectExplorationActor(1)"]`).first().click();
  await page.locator(`#mobile-creature-strip button[data-selection-mode="mark-target"][onclick*="toggleExplorationTarget('creature','friendly-1')"]`).first().click();
  const mobileTray = page.locator('#mobile-party-strip .panel-interaction-tray').first();
  await assert.doesNotReject(() => mobileTray.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile marked-target tray should render above party chips');

  state = await page.evaluate(() => {
    const trayEl = document.querySelector('#mobile-party-strip .panel-interaction-tray');
    const partyStrip = document.querySelector('#mobile-party-strip');
    const allyChip = Array.from(document.querySelectorAll('#mobile-party-strip .mobile-unit-chip')).find(chip => chip.textContent.includes('Ally'));
    const creatureChip = document.querySelector('#mobile-creature-strip .mobile-unit-chip');
    return {
      isFirstChild: partyStrip?.firstElementChild === trayEl,
      actors: App._getExplorationActors().map(unit => unit.id || unit.name),
      targets: [...App.explorationTargetIds],
      allySelectedActor: allyChip?.classList.contains('selected-actor') || false,
      creatureSelectedTarget: creatureChip?.classList.contains('selected-target') || false,
      hasPanelSource: trayEl?.innerHTML.includes("resolveExplorationTargetAction('fight','attack','panel-tray')") || false,
      centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
    };
  });
  assert.strictEqual(state.isFirstChild, true, 'Mobile marked-target tray should sit above party chips');
  assert.deepStrictEqual(state.actors, ['ally-1'], 'Mobile Act should select the ally as the adventure actor');
  assert.deepStrictEqual(state.targets, ['creature:friendly-1'], 'Mobile Mark should select the creature as an adventure target');
  assert.strictEqual(state.allySelectedActor, true, 'Mobile Act-selected chip should expose actor state');
  assert.strictEqual(state.creatureSelectedTarget, true, 'Mobile marked creature chip should expose target state');
  assert.strictEqual(state.hasPanelSource, true, 'Mobile tray should dispatch through the shared panel-tray command source');
  assert.strictEqual(state.centerHasActorControls, false, 'Center tile should stay free of actor controls while mobile target tray is active');

  await page.locator(`#mobile-party-strip .panel-interaction-tray button[onclick*="resolveExplorationTargetAction('flirt','tease','panel-tray')"]`).first().click();
  state = await page.evaluate(() => ({
    targetPle: App.creatures.find(unit => unit.id === 'friendly-1')?.CPle,
    targetsRemaining: App.explorationTargetIds.length,
    commandSource: App.lastIntentCommand?.source || '',
    trayVisible: Boolean(document.querySelector('#mobile-party-strip .panel-interaction-tray')),
    centerHasActorControls: /selectExplorationActor|toggleExplorationTarget|resolveExplorationTargetAction|showIntentMenu\('creature'/.test(document.querySelector('#desktop-play-cell-center')?.innerHTML || '')
  }));
  assert(state.targetPle > 0, 'Mobile panel-tray action should resolve against the marked creature');
  assert.strictEqual(state.targetsRemaining, 0, 'Mobile marked-target action should clear target marks');
  assert.strictEqual(state.commandSource, 'panel-tray', 'Mobile marked-target action should preserve shared command source metadata');
  assert.strictEqual(state.trayVisible, false, 'Mobile marked-target tray should disappear after resolution');
  assert.strictEqual(state.centerHasActorControls, false, 'Center tile should stay free of actor controls after mobile resolution');

  await setupCombat(page);
  await page.locator(`#mobile-party-strip button[onclick*="executeCombatIntent('fight')"]`).first().click();
  const mobilePick = page.locator('#mobile-creature-strip button[data-selection-mode="combat-pick"]').first();
  await assert.doesNotReject(() => mobilePick.waitFor({ state: 'visible', timeout: 1000 }), 'Mobile combat pick should render in creature strip');
  state = await page.evaluate(() => {
    const pick = document.querySelector('#mobile-creature-strip button[data-selection-mode="combat-pick"]');
    const enemyChip = document.querySelector('#mobile-creature-strip .mobile-unit-chip');
    return {
      combatActive: document.querySelector('#mobile-play-surface')?.classList.contains('combat-active') || false,
      targetSelection: App.targetSelection?.action || null,
      pickControl: pick?.getAttribute('data-selection-control') || '',
      pickState: pick?.getAttribute('data-selection-state') || '',
      enemySelectedTarget: enemyChip?.classList.contains('selected-target') || false,
      hasAdventureMark: (document.querySelector('#mobile-creature-strip')?.innerHTML || '').includes("toggleExplorationTarget('creature'")
    };
  });
  assert.strictEqual(state.combatActive, true, 'Mobile play surface should switch into combat layout');
  assert.strictEqual(state.targetSelection, 'fight', 'Mobile combat Fight should enter target-pick state');
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
  assert.strictEqual(state.commandSource, 'panel-card', 'Mobile combat pick should preserve panel-card command source metadata');
  assert.strictEqual(state.centerHasActorControls, false, 'Center tile should stay free of actor controls after mobile combat resolution');

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

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await page.goto(distUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
    await clearBrowserStorage(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
    await runActionMatrix(page);
    await runReachabilityMatrix(page);
    await runAdventureMarkedTargetFlow(page);
    await runSelectionSemanticsFlow(page);
    await runCenterResourceSearchFlow(page);
    await runMobileSelectionAndCombatFlow(page);
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
