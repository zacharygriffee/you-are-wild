#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '../../..');
const { chromium } = require(path.join(root, 'app/node_modules/playwright'));
const distUrl = pathToFileURL(path.join(root, 'dist/you-are-wild.html')).href;
const packages = [
  '01-school-of-steel/submission/yaw-school-of-steel.yawmod.json',
  '02-field-journal/submission/yaw-field-journal.yawmod.json',
  '03-couriers-trail/submission/you-are-wild-couriers-trail.yawmod.json'
].map(relativePath => JSON.parse(fs.readFileSync(path.join(__dirname, relativePath), 'utf8')));
const moduleIds = ['yaw_school_of_steel', 'yaw_field_journal', 'yaw_couriers_trail'];

async function clearBrowserStorage(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    if (!window.indexedDB?.databases) return;
    const databases = await indexedDB.databases();
    await Promise.all(databases.map(database => new Promise(resolve => {
      if (!database.name) return resolve();
      const request = indexedDB.deleteDatabase(database.name);
      request.onsuccess = request.onerror = request.onblocked = resolve;
    })));
  });
}

async function waitForRuntime(page) {
  await page.waitForFunction(() => Boolean(window.App && typeof MODULE_SYSTEM !== 'undefined'), null, { timeout: 10000 });
  await page.waitForFunction(() => ['ready', 'error'].includes(window.YAW_STARTUP_READINESS?.state('modules')?.status), null, { timeout: 15000 });
  const state = await page.evaluate(() => YAW_STARTUP_READINESS.state('modules')?.status);
  assert.strictEqual(state, 'ready', 'Module startup domain should be ready');
}

async function snapshot(page) {
  return page.evaluate(async () => {
    const modules = await MODULE_SYSTEM.getAllModules();
    const itemIds = [
      'yaw_couriers_trail:field_dressing',
      'yaw_couriers_trail:waxed_route_cord',
      'yaw_couriers_trail:courier_satchel'
    ];
    const ui = {};
    for (const [slot, registry] of MODULE_SYSTEM.uiContributions.entries()) {
      ui[slot] = [...registry.keys()].filter(key => key.startsWith('yaw_field_journal:'));
    }
    return {
      modules: Object.fromEntries(modules.filter(module => [
        'yaw_school_of_steel',
        'yaw_field_journal',
        'yaw_couriers_trail'
      ].includes(module.id)).map(module => [module.id, module.enabled])),
      techniques: [...YAW_COMBAT_TECHNIQUES.profiles.keys()].filter(key => key.startsWith('yaw_school_of_steel:')).sort(),
      ui,
      items: Object.fromEntries(itemIds.map(id => [id, Boolean(App._getItemDef({ definitionId: id })?.id)])),
      questTemplate: Boolean(App.QUEST_TEMPLATES?.['yaw_couriers_trail:recover_courier_satchel']),
      merchantPlacements: {
        general: (App.MERCHANT_STOCK_TABLES.general || []).filter(entry => String(entry.definitionId || '').startsWith('yaw_couriers_trail:')).length,
        traveler: (App.MERCHANT_STOCK_TABLES.traveler || []).filter(entry => String(entry.definitionId || '').startsWith('yaw_couriers_trail:')).length
      },
      questRoutes: {
        cabin: (App.STRUCTURES.cabin?.quest?.templates || []).filter(id => id === 'yaw_couriers_trail:recover_courier_satchel').length,
        camp: (App.STRUCTURES.camp?.quest?.templates || []).filter(id => id === 'yaw_couriers_trail:recover_courier_satchel').length
      }
    };
  });
}

function assertEnabledSnapshot(value, label) {
  assert.deepStrictEqual(value.modules, {
    yaw_school_of_steel: true,
    yaw_field_journal: true,
    yaw_couriers_trail: true
  }, `${label}: all pilot modules should be enabled`);
  assert.deepStrictEqual(value.techniques, [
    'yaw_school_of_steel:measured-strike',
    'yaw_school_of_steel:staggering-blow',
    'yaw_school_of_steel:sweeping-rhythm'
  ], `${label}: all School of Steel techniques should be registered once`);
  assert.strictEqual(value.ui['roster.here.badges']?.length, 1, `${label}: Field Journal badge should be registered once`);
  assert.strictEqual(value.ui['roster.details.sections']?.length, 1, `${label}: Field Journal details should be registered once`);
  assert.strictEqual(value.ui['system.utilities']?.length, 1, `${label}: Field Journal utility should be registered once`);
  assert(Object.values(value.items).every(Boolean), `${label}: all Courier item definitions should be available`);
  assert.strictEqual(value.questTemplate, true, `${label}: Courier quest template should be available`);
  assert.deepStrictEqual(value.merchantPlacements, { general: 2, traveler: 2 }, `${label}: Courier merchant routes should be registered exactly once`);
  assert.deepStrictEqual(value.questRoutes, { cabin: 1, camp: 1 }, `${label}: Courier quest routes should be registered exactly once`);
}

function assertDisabledSnapshot(value, label) {
  assert.strictEqual(value.techniques.length, 0, `${label}: School of Steel profiles should unload`);
  assert.strictEqual(Object.values(value.ui).flat().length, 0, `${label}: Field Journal contributions should unload`);
  assert(Object.values(value.items).every(present => present === false), `${label}: Courier item definitions should unload`);
  assert.strictEqual(value.questTemplate, false, `${label}: Courier quest template should unload`);
  assert.deepStrictEqual(value.merchantPlacements, { general: 0, traveler: 0 }, `${label}: Courier merchant placements should unload`);
  assert.deepStrictEqual(value.questRoutes, { cabin: 0, camp: 0 }, `${label}: Courier quest routes should unload`);
}

function unitFixture(name, id, disposition = 'friendly') {
  return {
    id,
    name,
    species: 'human',
    icon: '👤',
    disposition,
    CPun: 75,
    MPun: 100,
    CPle: 40,
    MPle: 100,
    level: 1,
    size: 4,
    appetite: 4,
    stomach: [],
    womb: [],
    balls: [],
    inventory: [],
    equipment: {},
    status: {},
    Figh: 10,
    Flir: 10,
    Fuck: 10,
    Feas: 10,
    Feed: 10,
    Flee: 10,
    con: 10,
    wis: 10,
    cha: 10
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(distUrl, { waitUntil: 'load' });
    await waitForRuntime(page);
    await clearBrowserStorage(page);
    await page.reload({ waitUntil: 'load' });
    await waitForRuntime(page);

    await page.evaluate(async trialPackages => {
      for (const trialPackage of trialPackages) await MODULE_SYSTEM.installModule(trialPackage);
      for (const id of ['yaw_school_of_steel', 'yaw_field_journal', 'yaw_couriers_trail']) {
        await MODULE_SYSTEM.setModuleEnabled(id, true);
      }
    }, packages);

    const installed = await snapshot(page);
    assertEnabledSnapshot(installed, 'initial enable');

    const representative = await page.evaluate(async () => {
      const make = (name, id, disposition = 'friendly') => ({
        id, name, species: 'human', icon: '👤', disposition,
        CPun: 75, MPun: 100, CPle: 40, MPle: 100,
        level: 1, size: 4, appetite: 4,
        stomach: [], womb: [], balls: [], inventory: [], equipment: {}, status: {},
        Figh: 10, Flir: 10, Fuck: 10, Feas: 10, Feed: 10, Flee: 10,
        con: 10, wis: 10, cha: 10
      });
      App.showScreen('game');
      App.player = make('You', 'pilot-player', App.DISPOSITION.PARTY);
      App.player.mc = true;
      App.party = [App.player, make('Scout', 'pilot-scout', App.DISPOSITION.PARTY)];
      const creature = make('Trail Wolf', 'pilot-creature', App.DISPOSITION.ENEMY);
      creature.expanded = true;
      creature.status = { bleed: { turns: 1 } };
      creature.darkvision = true;
      App.creatures = [creature];
      App.location = { x: 0, y: 0 };
      App.worldMap = new Map([['0,0', {
        ...App.getBaseTile(0, 0),
        x: 0,
        y: 0,
        explored: true,
        biome: 'jungle',
        creatures: App.creatures,
        items: []
      }]]);
      App.tileDeltas = new Map();
      App.exploredTiles = new Set(['0,0']);
      App.inventory = [];
      App.quests = [];
      App.log = [];
      App.storyEvents = [];
      App.combatState.active = false;
      App.renderParty();
      App.renderCreatures();
      App.renderExplorationActions();

      const measured = YAW_COMBAT_TECHNIQUES.profile('yaw_school_of_steel:measured-strike');
      const sweep = YAW_COMBAT_TECHNIQUES.profile('yaw_school_of_steel:sweeping-rhythm');
      const stagger = YAW_COMBAT_TECHNIQUES.profile('yaw_school_of_steel:staggering-blow');
      const availableForThree = YAW_COMBAT_TECHNIQUES.availableProfiles(App, [App.player], 3).map(profile => profile.key);

      const badgeHtml = MODULE_SYSTEM.renderUiSlot('roster.here.badges', { unit: creature, unitType: 'creature', expanded: true });
      const detailHtml = MODULE_SYSTEM.renderUiSlot('roster.details.sections', { unit: creature, unitType: 'creature', expanded: true });
      await MODULE_SYSTEM.invokeUiContribution('system.utilities', 'yaw_field_journal:current-summary');
      const dialog = document.getElementById('mod-ui-contribution-dialog');
      const dialogText = dialog?.innerText || '';

      const source = App.QUEST_TEMPLATES['yaw_couriers_trail:recover_courier_satchel'];
      const giver = {
        id: 'pilot-dispatcher',
        name: 'Trail Dispatcher',
        giverLocation: { x: 0, y: 0, label: 'Trail Dispatcher' }
      };
      const quest = YAW_QUEST_FLOW.normalize(App, {
        ...JSON.parse(JSON.stringify(source)),
        id: 'pilot-courier-quest',
        templateId: 'yaw_couriers_trail:recover_courier_satchel',
        giverId: giver.id,
        giverName: giver.name,
        giverLocation: giver.giverLocation,
        turnInPolicy: { type: 'original_giver', giverId: giver.id }
      }, giver);
      const accepted = YAW_QUEST_FLOW.accept(App, quest, giver);
      const directive = accepted?.worldDirectives?.[0];
      const placedTile = directive?.resolvedLocation
        ? App.getTile(directive.resolvedLocation.x, directive.resolvedLocation.y)
        : null;
      const placed = placedTile?.items?.find(item => item.definitionId === 'yaw_couriers_trail:courier_satchel');
      App._prepareSaveSnapshot();
      const saveRoundTrip = JSON.parse(JSON.stringify(YAW_SAVE_PERSISTENCE.buildQuestStateDto(App)));
      App.closeModUiContributionDialog?.();

      return {
        technique: {
          measuredDamage: YAW_COMBAT_TECHNIQUES.damageValue(10, measured),
          sweepTargets: sweep.area.maxTargets,
          sweepAvailableForThree: availableForThree.includes(sweep.key),
          staggerStatus: stagger.status
        },
        ui: {
          badgePresent: badgeHtml.includes('1 condition'),
          detailsPresent: detailHtml.includes('Trail Wolf') === false
            && detailHtml.includes('Punishment')
            && detailHtml.includes('Conditions'),
          utilityDialogPresent: Boolean(dialog),
          utilityText: dialogText
        },
        quest: {
          accepted: Boolean(accepted),
          lifecycleState: accepted?.lifecycleState,
          stage: accepted?.stageGraph?.currentStage,
          location: directive?.resolvedLocation || null,
          placedDefinitionId: placed?.definitionId || '',
          inSave: Boolean(saveRoundTrip.quests?.find?.(entry => entry.id === 'pilot-courier-quest'))
        }
      };
    });

    assert.strictEqual(representative.technique.measuredDamage, 14, 'Measured Strike should shape deterministic damage');
    assert.strictEqual(representative.technique.sweepTargets, 3, 'Sweeping Rhythm should cap at three targets');
    assert.strictEqual(representative.technique.sweepAvailableForThree, true, 'Sweeping Rhythm should be discoverable for three targets');
    assert.deepStrictEqual(representative.technique.staggerStatus, { effect: 'stun', chance: 0.6, turns: 1, power: 1 }, 'Staggering Blow should use the bounded stun profile');
    assert.strictEqual(representative.ui.badgePresent, true, 'Field Journal badge should render from public unit state');
    assert.strictEqual(representative.ui.detailsPresent, true, 'Field Journal detail rows should render');
    assert.strictEqual(representative.ui.utilityDialogPresent, true, 'Field Journal utility should open a core-owned dialog');
    assert(representative.ui.utilityText.includes('Field journal') && representative.ui.utilityText.includes('Coordinates'), 'Field Journal utility should summarize public context');
    assert.strictEqual(representative.quest.accepted, true, 'Courier quest should be accepted');
    assert.strictEqual(representative.quest.lifecycleState, 'active', 'Courier quest should become active');
    assert.strictEqual(representative.quest.stage, 'following_trail', 'Courier acceptance should advance its authored stage');
    assert(representative.quest.location && Number.isFinite(representative.quest.location.x), 'Courier directive should resolve a location');
    assert.strictEqual(representative.quest.placedDefinitionId, 'yaw_couriers_trail:courier_satchel', 'Courier directive should place the required satchel');
    assert.strictEqual(representative.quest.inSave, true, 'Accepted Courier quest should serialize in the save snapshot');

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await page.evaluate(() => {
      App.renderCreatures();
      const creature = App.creatures[0];
      const badge = MODULE_SYSTEM.renderUiSlot('roster.here.badges', { unit: creature, unitType: 'creature', expanded: true });
      const details = MODULE_SYSTEM.renderUiSlot('roster.details.sections', { unit: creature, unitType: 'creature', expanded: true });
      return {
        badge: badge.includes('condition'),
        details: details.includes('Field journal'),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.deepStrictEqual(mobile, { badge: true, details: true, overflow: false }, 'Field Journal should remain present without phone-width overflow');

    await page.evaluate(async () => {
      App.combatState.syncActions = [{
        id: 'pilot-queued-technique',
        techniqueKey: 'yaw_school_of_steel:measured-strike'
      }];
      for (const id of ['yaw_school_of_steel', 'yaw_field_journal', 'yaw_couriers_trail']) {
        await MODULE_SYSTEM.setModuleEnabled(id, false, { bypassLifecycle: true });
      }
    });
    const disabledWithIssuedQuest = await snapshot(page);
    assertDisabledSnapshot(disabledWithIssuedQuest, 'disable');
    const retained = await page.evaluate(() => ({
      queuedTechniqueCount: App.combatState.syncActions.filter(action => action.techniqueKey?.startsWith('yaw_school_of_steel:')).length,
      issuedQuestPresent: App.quests.some(quest => quest.id === 'pilot-courier-quest')
    }));
    assert.deepStrictEqual(retained, { queuedTechniqueCount: 0, issuedQuestPresent: true }, 'Unload should cancel owned queued techniques and retain issued quest history');

    await page.evaluate(async () => {
      for (const id of ['yaw_school_of_steel', 'yaw_field_journal', 'yaw_couriers_trail']) {
        await MODULE_SYSTEM.setModuleEnabled(id, true, { bypassLifecycle: true });
      }
    });
    assertEnabledSnapshot(await snapshot(page), 're-enable');

    await page.reload({ waitUntil: 'load' });
    await waitForRuntime(page);
    assertEnabledSnapshot(await snapshot(page), 'browser reload');

    await page.evaluate(async trialPackages => {
      for (const trialPackage of trialPackages) await MODULE_SYSTEM.installModule(trialPackage);
    }, packages);
    const replaced = await snapshot(page);
    assertDisabledSnapshot(replaced, 'compatible replacement');
    assert.deepStrictEqual(replaced.modules, {
      yaw_school_of_steel: false,
      yaw_field_journal: false,
      yaw_couriers_trail: false
    }, 'Replacement should store every package disabled');

    await page.evaluate(async () => {
      for (const id of ['yaw_school_of_steel', 'yaw_field_journal', 'yaw_couriers_trail']) {
        await MODULE_SYSTEM.setModuleEnabled(id, true, { bypassLifecycle: true });
      }
    });
    assertEnabledSnapshot(await snapshot(page), 'replacement re-enable');

    await page.evaluate(async () => {
      for (const id of ['yaw_school_of_steel', 'yaw_field_journal', 'yaw_couriers_trail']) {
        await MODULE_SYSTEM.deleteModule(id);
      }
    });
    const deleted = await snapshot(page);
    assertDisabledSnapshot(deleted, 'delete');
    assert.deepStrictEqual(deleted.modules, {}, 'Deleted pilot modules should leave module storage');

    assert.deepStrictEqual(pageErrors, [], `Pilot runtime should not raise page errors: ${pageErrors.join('; ')}`);
    console.log(JSON.stringify({
      result: 'PASS',
      modules: moduleIds,
      initial: installed,
      representative,
      mobile,
      disabledRetained: retained,
      pageErrors
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
