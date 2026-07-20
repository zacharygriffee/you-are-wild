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

function makeUnitScript() {
  return `
    const make = (name, id) => ({
      id, name, species: 'human', icon: '👤',
      CPun: 100, MPun: 100, CPle: 50, MPle: 100,
      level: 1, size: 4, appetite: 4,
      stomach: [], womb: [], balls: [], inventory: [],
      Figh: 10, Flir: 10, Fuck: 10, Feas: 10, Feed: 10, Flee: 10,
      con: 10, wis: 10, cha: 10
    });
    App.showScreen('game');
    App.player = make('You', 'player-1');
    App.player.mc = true;
    App.party = [App.player, make('Ally', 'ally-1')];
    App.creatures = [
      Object.assign(make('Creature', 'creature-1'), { disposition: App.DISPOSITION.FRIENDLY }),
      Object.assign(make('Remains', 'corpse-1'), { disposition: App.DISPOSITION.CORPSE, CPun: 0 })
    ];
    App.combatState.active = false;
    App.location = { x: 0, y: 0 };
    App.worldMap = new Map([['0,0', { ...App.getBaseTile(0, 0), x: 0, y: 0, explored: true, biome: 'jungle', terrainTags: ['merchant', 'dense canopy', 'wet trail'], creatures: App.creatures, items: [{ id: 'test-item', name: 'Test Item' }] }]]);
    App.tileDeltas = new Map();
    App.exploredTiles = new Set(['0,0']);
    App.inventory = [];
    App.renderMap();
    App.renderParty();
    App.renderCreatures();
    App.renderExplorationActions();
  `;
}

async function checkFileOriginFirstRunMenu(browser) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(distUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });

  const firstRun = await page.evaluate(() => {
    const tutorial = document.getElementById('tutorial-overlay');
    const menu = document.getElementById('screen-menu');
    return {
      protocol: location.protocol,
      appScreen: App.screen,
      tutorialDisplay: getComputedStyle(tutorial).display,
      menuDisplay: getComputedStyle(menu).display,
      focusTrapId: App._focusTrap?.container?.id || '',
      focusInsideTutorial: tutorial.contains(document.activeElement)
    };
  });
  assert.strictEqual(firstRun.protocol, 'file:', 'first-run menu check should exercise the downloadable file origin');
  assert.strictEqual(firstRun.appScreen, 'menu', 'first-run startup should establish the main-menu screen before opening help');
  assert.strictEqual(firstRun.tutorialDisplay, 'flex', 'first-run startup should visibly present the tutorial');
  assert.strictEqual(firstRun.menuDisplay, 'flex', 'first-run startup should retain the menu behind the tutorial');
  assert.strictEqual(firstRun.focusTrapId, 'tutorial-overlay', 'first-run tutorial should own the active focus trap');
  assert.strictEqual(firstRun.focusInsideTutorial, true, 'first-run tutorial should receive keyboard focus');

  await page.locator('#tutorial-overlay [data-command-control="skip-tutorial"]').click();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('tutorial-overlay')).display === 'none');

  const actions = [
    ['open-settings', 'screen-settings', 'close-settings'],
    ['open-mods', 'screen-mods', 'close-modules'],
    ['open-activity-log', 'screen-activity', 'close-activity-log'],
    ['open-release-notes', 'screen-release', 'close-release-notes']
  ];
  for (const [openControl, screenId, closeControl] of actions) {
    await page.locator(`#screen-menu [data-command-control="${openControl}"]`).click();
    await page.waitForFunction(id => {
      const screen = document.getElementById(id);
      return Boolean(screen?.classList.contains('active') && getComputedStyle(screen).display !== 'none');
    }, screenId);
    await page.locator(`#${screenId} [data-command-control="${closeControl}"]`).click();
    await page.waitForFunction(() => App.screen === 'menu' && getComputedStyle(document.getElementById('screen-menu')).display === 'flex');
  }

  await page.locator('#screen-menu [data-command-control="open-help"]').click();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('tutorial-overlay')).display === 'flex');
  await page.locator('#tutorial-overlay [data-command-control="skip-tutorial"]').click();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('tutorial-overlay')).display === 'none');

  await page.locator('#screen-menu [data-command-control="start-new-game"]').click();
  await page.waitForFunction(() => App.screen === 'save-manager' && getComputedStyle(document.getElementById('save-manager')).display !== 'none');
  await page.locator('#save-manager [data-command-control="close-save-manager"]').click();
  await page.waitForFunction(() => App.screen === 'menu');

  await page.locator('#screen-menu [data-command-control="open-load-slots"]').click();
  await page.waitForFunction(() => App.screen === 'save-manager' && getComputedStyle(document.getElementById('save-manager')).display !== 'none');
  await page.locator('#save-manager [data-command-control="close-save-manager"]').click();
  await page.waitForFunction(() => App.screen === 'menu');

  assert.deepStrictEqual(pageErrors, [], `file-origin first-run menu should not raise page errors: ${pageErrors.join('; ')}`);
  await page.close();
}

async function checkViewport(browser, name, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: width <= 1024 });
  await page.goto(distUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });

  const shell = await page.evaluate(() => ({
    title: document.title,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    largeMapControlsLocalized: Boolean(document.querySelector('[data-i18n-aria-label="ui.largeMap.controls"]')),
    zoomTitle: document.querySelector('[data-i18n-title="ui.largeMap.zoomIn"]')?.getAttribute('title') || ''
  }));
  assert.strictEqual(shell.title, 'You Are Wild', `${name}: document title should be branded`);
  assert(shell.scrollWidth <= shell.clientWidth + 1, `${name}: page should not horizontally overflow`);
  assert(shell.largeMapControlsLocalized, `${name}: large-map control group should expose localization hook`);
  assert(shell.zoomTitle.length > 0, `${name}: large-map zoom control should have a title`);

  const menuHierarchy = await page.evaluate(() => {
    const menu = document.getElementById('screen-menu');
    const primary = menu?.querySelector('.menu-primary-actions');
    const utility = menu?.querySelector('.menu-utility-actions');
    const commands = root => Array.from(root?.querySelectorAll('[data-command-control]') || [])
      .filter(control => getComputedStyle(control).display !== 'none')
      .map(control => control.getAttribute('data-command-control'));
    return {
      primary: commands(primary),
      utility: commands(utility),
      hasDirectProviders: Boolean(menu?.querySelector('[data-command-control="open-ai-providers"]')),
      hasDirectMarket: Boolean(menu?.querySelector('[data-command-control="open-market"]')),
      overflowY: getComputedStyle(menu).overflowY,
      horizontalOverflow: menu.scrollWidth > menu.clientWidth + 1
    };
  });
  assert.deepStrictEqual(menuHierarchy.primary, ['start-new-game', 'open-load-slots'], `${name}: visible primary menu actions should be New and Load before a save exists`);
  assert.deepStrictEqual(menuHierarchy.utility, ['open-settings', 'open-mods', 'open-help', 'open-activity-log', 'open-release-notes'], `${name}: utility menu actions should expose settings, mods, help, diagnostics, and release notes`);
  assert.strictEqual(menuHierarchy.hasDirectProviders, false, `${name}: AI Providers should be nested under Settings`);
  assert.strictEqual(menuHierarchy.hasDirectMarket, false, `${name}: Host Catalog should not be a top-level menu action`);
  assert(menuHierarchy.overflowY === 'auto' || menuHierarchy.overflowY === 'scroll', `${name}: main menu should retain a vertical scroll fallback`);
  assert.strictEqual(menuHierarchy.horizontalOverflow, false, `${name}: compact main menu should not overflow horizontally`);

  await page.evaluate(() => App.closeTutorial?.());
  await page.waitForTimeout(50);
  await page.locator('#screen-menu [data-command-control="open-settings"]').click();
  await page.waitForTimeout(50);
  const openedSettings = await page.evaluate(() => {
    const menu = document.getElementById('screen-menu');
    const settings = document.getElementById('screen-settings');
    const app = document.getElementById('app');
    const close = settings?.querySelector('[data-command-control="close-settings"]');
    const settingsRect = settings.getBoundingClientRect();
    const closeRect = close?.getBoundingClientRect();
    return {
      appScreen: App.screen,
      returnScreen: App.settingsReturnScreen,
      menuDisplay: getComputedStyle(menu).display,
      menuActive: menu.classList.contains('active'),
      appDisplay: getComputedStyle(app).display,
      settingsDisplay: getComputedStyle(settings).display,
      settingsActive: settings.classList.contains('active'),
      settingsInsideViewport: settingsRect.left >= -1 && settingsRect.right <= innerWidth + 1 && settingsRect.top >= -1 && settingsRect.bottom <= innerHeight + 1,
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      closeControl: close?.getAttribute('data-command-control') || '',
      closeSlot: close?.getAttribute('data-command-slot') || '',
      dialogRole: settings.getAttribute('role') || '',
      ariaModal: settings.getAttribute('aria-modal') || '',
      labelled: Boolean(document.getElementById(settings.getAttribute('aria-labelledby') || '')),
      focusInside: settings.contains(document.activeElement)
    };
  });
  assert.strictEqual(openedSettings.appScreen, 'settings', `${name}: main-menu Settings should enter settings screen state`);
  assert.strictEqual(openedSettings.returnScreen, 'menu', `${name}: main-menu Settings should remember the menu return target`);
  assert.strictEqual(openedSettings.menuDisplay, 'none', `${name}: main menu should hide behind the settings overlay`);
  assert.strictEqual(openedSettings.menuActive, false, `${name}: main menu should not stay active behind settings`);
  assert.strictEqual(openedSettings.appDisplay, 'none', `${name}: game app shell should stay hidden while menu Settings is open`);
  assert.notStrictEqual(openedSettings.settingsDisplay, 'none', `${name}: Settings overlay should be visible from the main menu`);
  assert.strictEqual(openedSettings.settingsActive, true, `${name}: Settings overlay should become active from the main menu`);
  assert.strictEqual(openedSettings.settingsInsideViewport, true, `${name}: Settings overlay should stay bounded in the viewport`);
  assert.strictEqual(openedSettings.closeVisible, true, `${name}: Settings overlay should expose a visible close/back exit`);
  assert.strictEqual(openedSettings.closeControl, 'close-settings', `${name}: Settings close should expose its command control`);
  assert.strictEqual(openedSettings.closeSlot, 'exit', `${name}: Settings close should identify the exit slot`);
  assert.strictEqual(openedSettings.dialogRole, 'dialog', `${name}: Settings should expose dialog semantics`);
  assert.strictEqual(openedSettings.ariaModal, 'true', `${name}: Settings should identify itself as modal`);
  assert.strictEqual(openedSettings.labelled, true, `${name}: Settings should reference a visible accessible heading`);
  assert.strictEqual(openedSettings.focusInside, true, `${name}: Settings should move focus into the active overlay`);

  await page.locator('#screen-settings [data-command-control="open-ai-providers"]').click();
  await page.waitForTimeout(50);
  const openedProviders = await page.evaluate(() => ({
    appScreen: App.screen,
    returnStack: [...App.overlayReturnStack],
    providersDisplay: getComputedStyle(document.getElementById('screen-providers')).display,
    settingsDisplay: getComputedStyle(document.getElementById('screen-settings')).display,
    focusTrapId: App._focusTrap?.container?.id || '',
    dialogRole: document.getElementById('screen-providers').getAttribute('role') || '',
    ariaModal: document.getElementById('screen-providers').getAttribute('aria-modal') || '',
    labelled: Boolean(document.getElementById(document.getElementById('screen-providers').getAttribute('aria-labelledby') || '')),
    focusInside: document.getElementById('screen-providers').contains(document.activeElement),
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }));
  assert.strictEqual(openedProviders.appScreen, 'providers', `${name}: Settings should open AI Providers`);
  assert.deepStrictEqual(openedProviders.returnStack, ['settings'], `${name}: AI Providers should retain Settings as its parent`);
  assert.notStrictEqual(openedProviders.providersDisplay, 'none', `${name}: AI Providers should be visible`);
  assert.strictEqual(openedProviders.settingsDisplay, 'none', `${name}: Settings should hide behind AI Providers`);
  assert.strictEqual(openedProviders.focusTrapId, 'screen-providers', `${name}: AI Providers should own the focus trap`);
  assert.strictEqual(openedProviders.dialogRole, 'dialog', `${name}: AI Providers should expose dialog semantics`);
  assert.strictEqual(openedProviders.ariaModal, 'true', `${name}: AI Providers should identify itself as modal`);
  assert.strictEqual(openedProviders.labelled, true, `${name}: AI Providers should reference its visible heading`);
  assert.strictEqual(openedProviders.focusInside, true, `${name}: AI Providers should move focus into the active overlay`);
  assert.strictEqual(openedProviders.pageOverflow, false, `${name}: AI Providers should not create horizontal overflow`);

  await page.locator('#screen-providers [data-command-control="close-ai-providers"]').click();
  await page.waitForTimeout(50);
  const returnedSettings = await page.evaluate(() => ({
    appScreen: App.screen,
    returnScreen: App.settingsReturnScreen,
    returnStack: [...App.overlayReturnStack],
    providersDisplay: getComputedStyle(document.getElementById('screen-providers')).display,
    settingsDisplay: getComputedStyle(document.getElementById('screen-settings')).display,
    settingsActive: document.getElementById('screen-settings').classList.contains('active'),
    focusTrapId: App._focusTrap?.container?.id || ''
  }));
  assert.strictEqual(returnedSettings.appScreen, 'settings', `${name}: closing AI Providers should return to Settings`);
  assert.strictEqual(returnedSettings.returnScreen, 'menu', `${name}: returned Settings should retain its main-menu origin`);
  assert.deepStrictEqual(returnedSettings.returnStack, [], `${name}: returning to Settings should consume its nested return entry`);
  assert.strictEqual(returnedSettings.providersDisplay, 'none', `${name}: AI Providers should hide after close`);
  assert.notStrictEqual(returnedSettings.settingsDisplay, 'none', `${name}: Settings should be visible after AI Providers closes`);
  assert.strictEqual(returnedSettings.settingsActive, true, `${name}: Settings should regain active state after AI Providers closes`);
  assert.strictEqual(returnedSettings.focusTrapId, 'screen-settings', `${name}: returned Settings should regain the focus trap`);

  await page.locator('#screen-settings [data-command-control="close-settings"]').click();
  await page.waitForTimeout(50);
  const returnedMenu = await page.evaluate(() => {
    const menu = document.getElementById('screen-menu');
    const menuShell = menu?.querySelector('.menu-shell');
    const actions = menu?.querySelector('.menu-actions');
    const settings = document.getElementById('screen-settings');
    const game = document.getElementById('screen-game');
    const app = document.getElementById('app');
    const shellRect = menuShell.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const visibleActions = Array.from(actions.querySelectorAll('button')).filter(button => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(button).display !== 'none';
    }).map(button => {
      const rect = button.getBoundingClientRect();
      return {
        label: button.textContent.trim(),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    });
    const actionColumnCentered = Math.abs((actionsRect.left + actionsRect.width / 2) - innerWidth / 2) <= 2;
    return {
      appScreen: App.screen,
      returnScreen: App.settingsReturnScreen,
      menuDisplay: getComputedStyle(menu).display,
      menuActive: menu.classList.contains('active'),
      settingsDisplay: getComputedStyle(settings).display,
      settingsActive: settings.classList.contains('active'),
      gameDisplay: getComputedStyle(game).display,
      gameActive: game.classList.contains('active'),
      appDisplay: getComputedStyle(app).display,
      shellClassed: menuShell.classList.contains('menu-shell'),
      shellBounds: {
        left: shellRect.left,
        right: shellRect.right,
        top: shellRect.top,
        bottom: shellRect.bottom,
        width: shellRect.width,
        height: shellRect.height
      },
      actionsClassed: actions.classList.contains('menu-actions'),
      actionsBounds: {
        left: actionsRect.left,
        right: actionsRect.right,
        top: actionsRect.top,
        bottom: actionsRect.bottom,
        width: actionsRect.width,
        height: actionsRect.height
      },
      actionColumnCentered,
      focusControl: document.activeElement?.getAttribute('data-command-control') || '',
      visibleActions,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight
    };
  });
  assert.strictEqual(returnedMenu.appScreen, 'menu', `${name}: closing menu Settings should restore menu screen state`);
  assert.strictEqual(returnedMenu.returnScreen, null, `${name}: closing menu Settings should clear return state`);
  assert.strictEqual(returnedMenu.menuDisplay, 'flex', `${name}: main menu should be visible after Settings closes`);
  assert.strictEqual(returnedMenu.menuActive, true, `${name}: main menu should regain active state after Settings closes`);
  assert.strictEqual(returnedMenu.settingsDisplay, 'none', `${name}: Settings overlay should be hidden after close`);
  assert.strictEqual(returnedMenu.settingsActive, false, `${name}: Settings overlay should clear active state after close`);
  assert.strictEqual(returnedMenu.gameDisplay, 'none', `${name}: closing menu Settings should not activate the game screen`);
  assert.strictEqual(returnedMenu.gameActive, false, `${name}: game screen should stay inactive after menu Settings closes`);
  assert.strictEqual(returnedMenu.appDisplay, 'none', `${name}: game app shell should stay hidden after menu Settings closes`);
  assert.strictEqual(returnedMenu.shellClassed, true, `${name}: returned main menu should keep the centered menu shell class`);
  assert(returnedMenu.shellBounds.left >= -1 && returnedMenu.shellBounds.right <= returnedMenu.viewportWidth + 1, `${name}: returned menu shell should stay horizontally bounded`);
  assert(returnedMenu.shellBounds.top >= -1 && returnedMenu.shellBounds.bottom <= returnedMenu.viewportHeight + 1, `${name}: returned menu shell should stay vertically bounded`);
  assert.strictEqual(returnedMenu.actionsClassed, true, `${name}: returned main menu actions should keep the bounded action column class`);
  assert(returnedMenu.actionsBounds.width <= Math.min(400, returnedMenu.viewportWidth) + 1, `${name}: returned menu actions should stay width-bounded`);
  assert(returnedMenu.actionsBounds.left >= -1 && returnedMenu.actionsBounds.right <= returnedMenu.viewportWidth + 1, `${name}: returned menu actions should stay inside the viewport`);
  assert.strictEqual(returnedMenu.actionColumnCentered, true, `${name}: returned menu action column should be horizontally centered`);
  assert.strictEqual(returnedMenu.focusControl, 'open-settings', `${name}: closing menu Settings should restore keyboard focus to its visible trigger`);
  assert(returnedMenu.visibleActions.length >= 5, `${name}: returned menu should expose primary menu actions`);
  assert(returnedMenu.visibleActions.every(button => button.width >= 44 && button.height >= 44), `${name}: returned menu actions should remain tappable`);
  assert.strictEqual(returnedMenu.pageOverflow, false, `${name}: closing Settings should not introduce menu horizontal overflow`);

  await page.evaluate(() => {
    App.showScreen('create');
    App.syncCreateContentLevel?.();
  });
  await page.waitForTimeout(50);
  await page.locator('#screen-create [data-command-control="open-content-settings"]').click();
  await page.waitForTimeout(50);
  const openedCreateSettings = await page.evaluate(() => {
    const create = document.getElementById('screen-create');
    const menu = document.getElementById('screen-menu');
    const settings = document.getElementById('screen-settings');
    const app = document.getElementById('app');
    const close = settings?.querySelector('[data-command-control="close-settings"]');
    const contentLevel = document.getElementById('settings-content-level');
    const settingsRect = settings.getBoundingClientRect();
    const closeRect = close?.getBoundingClientRect();
    return {
      appScreen: App.screen,
      returnScreen: App.settingsReturnScreen,
      createDisplay: getComputedStyle(create).display,
      createActive: create.classList.contains('active'),
      menuDisplay: getComputedStyle(menu).display,
      appDisplay: getComputedStyle(app).display,
      settingsDisplay: getComputedStyle(settings).display,
      settingsActive: settings.classList.contains('active'),
      settingsInsideViewport: settingsRect.left >= -1 && settingsRect.right <= innerWidth + 1 && settingsRect.top >= -1 && settingsRect.bottom <= innerHeight + 1,
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      closeControl: close?.getAttribute('data-command-control') || '',
      closeSlot: close?.getAttribute('data-command-slot') || '',
      contentFocused: contentLevel?.classList.contains('settings-focus') || false
    };
  });
  assert.strictEqual(openedCreateSettings.appScreen, 'settings', `${name}: create content settings should enter settings screen state`);
  assert.strictEqual(openedCreateSettings.returnScreen, 'create', `${name}: create content settings should remember the create return target`);
  assert.strictEqual(openedCreateSettings.createDisplay, 'none', `${name}: create screen should hide behind content settings`);
  assert.strictEqual(openedCreateSettings.createActive, false, `${name}: create screen should not stay active behind content settings`);
  assert.strictEqual(openedCreateSettings.menuDisplay, 'none', `${name}: main menu should stay hidden while create content settings are open`);
  assert.strictEqual(openedCreateSettings.appDisplay, 'none', `${name}: game app shell should stay hidden while create content settings are open`);
  assert.notStrictEqual(openedCreateSettings.settingsDisplay, 'none', `${name}: Settings overlay should be visible from character creation`);
  assert.strictEqual(openedCreateSettings.settingsActive, true, `${name}: Settings overlay should become active from character creation`);
  assert.strictEqual(openedCreateSettings.settingsInsideViewport, true, `${name}: create Settings overlay should stay bounded in the viewport`);
  assert.strictEqual(openedCreateSettings.closeVisible, true, `${name}: create Settings overlay should expose a visible close/back exit`);
  assert.strictEqual(openedCreateSettings.closeControl, 'close-settings', `${name}: create Settings close should expose its command control`);
  assert.strictEqual(openedCreateSettings.closeSlot, 'exit', `${name}: create Settings close should identify the exit slot`);
  assert.strictEqual(openedCreateSettings.contentFocused, true, `${name}: create content settings should focus the content-level setting`);

  await page.locator('#screen-settings [data-command-control="close-settings"]').click();
  await page.waitForTimeout(50);
  const returnedCreate = await page.evaluate(() => {
    const create = document.getElementById('screen-create');
    const container = create?.querySelector('.create-container');
    const settings = document.getElementById('screen-settings');
    const menu = document.getElementById('screen-menu');
    const game = document.getElementById('screen-game');
    const app = document.getElementById('app');
    const contentButton = create?.querySelector('[data-command-control="open-content-settings"]');
    const contentLabel = document.getElementById('create-content-level-label');
    const containerRect = container.getBoundingClientRect();
    const contentRect = contentButton?.getBoundingClientRect();
    return {
      appScreen: App.screen,
      returnScreen: App.settingsReturnScreen,
      createDisplay: getComputedStyle(create).display,
      createActive: create.classList.contains('active'),
      settingsDisplay: getComputedStyle(settings).display,
      settingsActive: settings.classList.contains('active'),
      menuDisplay: getComputedStyle(menu).display,
      gameDisplay: getComputedStyle(game).display,
      gameActive: game.classList.contains('active'),
      appDisplay: getComputedStyle(app).display,
      containerInsideViewport: containerRect.left >= -1 && containerRect.right <= innerWidth + 1 && containerRect.top >= -1 && containerRect.bottom <= innerHeight + 1,
      contentVisible: Boolean(contentRect && contentRect.width > 0 && contentRect.height > 0),
      contentTappable: Boolean(contentRect && contentRect.width >= 44 && contentRect.height >= 44),
      contentControl: contentButton?.getAttribute('data-command-control') || '',
      contentSurface: contentButton?.getAttribute('data-command-surface') || '',
      focusControl: document.activeElement?.getAttribute('data-command-control') || '',
      contentLabel: contentLabel?.textContent?.trim() || '',
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(returnedCreate.appScreen, 'create', `${name}: closing create Settings should restore create screen state`);
  assert.strictEqual(returnedCreate.returnScreen, null, `${name}: closing create Settings should clear return state`);
  assert.strictEqual(returnedCreate.createDisplay, 'flex', `${name}: create screen should be visible after content Settings closes`);
  assert.strictEqual(returnedCreate.createActive, true, `${name}: create screen should regain active state after content Settings closes`);
  assert.strictEqual(returnedCreate.settingsDisplay, 'none', `${name}: Settings overlay should hide after returning to character creation`);
  assert.strictEqual(returnedCreate.settingsActive, false, `${name}: Settings overlay should clear active state after returning to character creation`);
  assert.strictEqual(returnedCreate.menuDisplay, 'none', `${name}: closing create Settings should not restore the main menu`);
  assert.strictEqual(returnedCreate.gameDisplay, 'none', `${name}: closing create Settings should not activate the game screen`);
  assert.strictEqual(returnedCreate.gameActive, false, `${name}: game screen should stay inactive after create Settings closes`);
  assert.strictEqual(returnedCreate.appDisplay, 'none', `${name}: game app shell should stay hidden after create Settings closes`);
  assert.strictEqual(returnedCreate.containerInsideViewport, true, `${name}: returned create container should stay within the viewport`);
  assert.strictEqual(returnedCreate.contentVisible, true, `${name}: returned create content-level shortcut should stay visible`);
  assert.strictEqual(returnedCreate.contentTappable, true, `${name}: returned create content-level shortcut should remain tappable`);
  assert.strictEqual(returnedCreate.contentControl, 'open-content-settings', `${name}: returned create content shortcut should keep its command control`);
  assert.strictEqual(returnedCreate.contentSurface, 'character-creation', `${name}: returned create content shortcut should keep setup surface ownership`);
  assert.strictEqual(returnedCreate.focusControl, 'open-content-settings', `${name}: closing create Settings should restore keyboard focus to its visible trigger`);
  assert(returnedCreate.contentLabel.length > 0, `${name}: returned create content-level label should be populated`);
  assert.strictEqual(returnedCreate.pageOverflow, false, `${name}: closing create Settings should not introduce horizontal overflow`);

  await page.evaluate(() => {
    App.updateAccessibilitySetting('highContrast', true);
    App.updateAccessibilitySetting('reducedMotion', true);
    App.updateAccessibilitySetting('fontSize', 20);
  });
  await page.waitForTimeout(50);
  const accessibility = await page.evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);
    const button = document.querySelector('button');
    const buttonStyle = button ? getComputedStyle(button) : null;
    return {
      highContrast: document.body.classList.contains('high-contrast'),
      reducedMotion: document.body.classList.contains('reduced-motion'),
      fontSize: bodyStyle.fontSize,
      baseFontSize: document.body.style.getPropertyValue('--base-font-size'),
      background: bodyStyle.backgroundColor,
      transitionDuration: buttonStyle?.transitionDuration || ''
    };
  });
  assert.strictEqual(accessibility.highContrast, true, `${name}: high contrast should apply to body`);
  assert.strictEqual(accessibility.reducedMotion, true, `${name}: reduced motion should apply to body`);
  assert.strictEqual(accessibility.fontSize, '20px', `${name}: maximum font size should apply to rendered body`);
  assert.strictEqual(accessibility.baseFontSize.trim(), '20px', `${name}: base font CSS variable should sync`);
  assert(accessibility.background === 'rgb(0, 0, 0)' || accessibility.background === '#000000', `${name}: high contrast should update rendered background`);
  assert(accessibility.transitionDuration.split(',').every(value => value.trim() === '0s'), `${name}: reduced motion should suppress button transitions`);

  await page.evaluate(() => {
    App.showScreen('menu');
    App._setSaveTime?.('slot2', '1710000000000');
  });
  await page.waitForTimeout(50);
  await page.locator('#screen-menu [data-command-control="open-load-slots"]').click();
  await page.waitForTimeout(50);
  const save = await page.evaluate(() => {
    const root = document.getElementById('save-manager');
    const box = root?.querySelector('.save-manager-modal, .modal-content, .save-manager-content') || root?.firstElementChild || root;
    const close = root?.querySelector('[data-command-control="close-save-manager"]');
    const rect = box.getBoundingClientRect();
    const closeRect = close?.getBoundingClientRect();
    const visibleButtons = Array.from(root.querySelectorAll('button')).filter(btn => {
      const r = btn.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).length;
    return {
      appScreen: App.screen,
      saveMode: App.saveManagerMode,
      display: getComputedStyle(root).display,
      active: root.classList.contains('active'),
      overflowY: getComputedStyle(box).overflowY,
      top: rect.top,
      bottom: rect.bottom,
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      closeSlot: close?.getAttribute('data-command-slot') || '',
      visibleButtons,
      viewportHeight: innerHeight,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(save.appScreen, 'save-manager', `${name}: main-menu Load should enter save-manager screen state`);
  assert.strictEqual(save.saveMode, 'load', `${name}: main-menu Load should open save manager in load mode`);
  assert.notStrictEqual(save.display, 'none', `${name}: save manager should be visible`);
  assert.strictEqual(save.active, true, `${name}: save manager should become active`);
  assert(save.overflowY === 'auto' || save.overflowY === 'scroll', `${name}: save manager content should be scrollable`);
  assert(save.top >= -1, `${name}: save manager should not clip above viewport`);
  assert(save.bottom <= save.viewportHeight + 1, `${name}: save manager should not clip below viewport`);
  assert.strictEqual(save.closeVisible, true, `${name}: save manager should expose a visible close exit`);
  assert.strictEqual(save.closeSlot, 'exit', `${name}: save manager close should identify the exit slot`);
  assert(save.visibleButtons >= 2, `${name}: save manager should expose reachable actions`);
  assert.strictEqual(save.pageOverflow, false, `${name}: save manager should not create horizontal overflow`);

  await page.locator('#save-manager [data-save-slot="slot2"] [data-command-control="new-run-slot"]').click();
  await page.waitForTimeout(50);
  const overwriteConfirm = await page.evaluate(() => {
    const dialog = document.getElementById('app-confirm-dialog');
    const card = dialog?.querySelector('.app-confirm-card');
    const cancel = dialog?.querySelector('[data-command-control="cancel-dialog"]');
    const confirm = dialog?.querySelector('[data-command-control="confirm-dialog"]');
    const saveManager = document.getElementById('save-manager');
    const create = document.getElementById('screen-create');
    const dialogRect = dialog?.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();
    const cancelRect = cancel?.getBoundingClientRect();
    const confirmRect = confirm?.getBoundingClientRect();
    return {
      exists: Boolean(dialog),
      pendingMessage: App.pendingConfirm?.message || '',
      dialogSurface: dialog?.getAttribute('data-command-surface') || '',
      dialogMode: dialog?.getAttribute('data-command-mode') || '',
      dialogInsideViewport: Boolean(dialogRect && dialogRect.left >= -1 && dialogRect.right <= innerWidth + 1 && dialogRect.top >= -1 && dialogRect.bottom <= innerHeight + 1),
      cardInsideViewport: Boolean(cardRect && cardRect.left >= -1 && cardRect.right <= innerWidth + 1 && cardRect.top >= -1 && cardRect.bottom <= innerHeight + 1),
      cancelVisible: Boolean(cancelRect && cancelRect.width > 0 && cancelRect.height > 0),
      cancelInsideViewport: Boolean(cancelRect && cancelRect.left >= -1 && cancelRect.right <= innerWidth + 1 && cancelRect.top >= -1 && cancelRect.bottom <= innerHeight + 1),
      cancelSlot: cancel?.getAttribute('data-command-slot') || '',
      confirmVisible: Boolean(confirmRect && confirmRect.width > 0 && confirmRect.height > 0),
      confirmInsideViewport: Boolean(confirmRect && confirmRect.left >= -1 && confirmRect.right <= innerWidth + 1 && confirmRect.top >= -1 && confirmRect.bottom <= innerHeight + 1),
      focusTrapId: App._focusTrap?.container?.id || '',
      saveManagerDisplay: getComputedStyle(saveManager).display,
      saveManagerActive: saveManager.classList.contains('active'),
      createDisplay: getComputedStyle(create).display,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(overwriteConfirm.exists, true, `${name}: occupied-slot New Run should open the shared confirm dialog`);
  assert(overwriteConfirm.pendingMessage.includes('Slot 2'), `${name}: occupied-slot confirmation should name the selected slot`);
  assert.strictEqual(overwriteConfirm.dialogSurface, 'system-dialog', `${name}: confirm dialog should identify the system dialog surface`);
  assert.strictEqual(overwriteConfirm.dialogMode, 'system', `${name}: confirm dialog should identify system mode`);
  assert.strictEqual(overwriteConfirm.dialogInsideViewport, true, `${name}: confirm dialog backdrop should stay inside the viewport`);
  assert.strictEqual(overwriteConfirm.cardInsideViewport, true, `${name}: confirm dialog card should stay inside the viewport`);
  assert.strictEqual(overwriteConfirm.cancelVisible, true, `${name}: confirm dialog should expose a visible cancel exit`);
  assert.strictEqual(overwriteConfirm.cancelInsideViewport, true, `${name}: confirm dialog cancel should stay inside the viewport`);
  assert.strictEqual(overwriteConfirm.cancelSlot, 'exit', `${name}: confirm dialog cancel should identify the exit slot`);
  assert.strictEqual(overwriteConfirm.confirmVisible, true, `${name}: confirm dialog should expose a visible confirm action`);
  assert.strictEqual(overwriteConfirm.confirmInsideViewport, true, `${name}: confirm dialog confirm action should stay inside the viewport`);
  assert.strictEqual(overwriteConfirm.focusTrapId, 'app-confirm-dialog', `${name}: confirm dialog should activate the shared focus trap`);
  assert.notStrictEqual(overwriteConfirm.saveManagerDisplay, 'none', `${name}: save manager should remain visible behind its confirmation`);
  assert.strictEqual(overwriteConfirm.saveManagerActive, true, `${name}: save manager should remain active behind its confirmation`);
  assert.strictEqual(overwriteConfirm.createDisplay, 'none', `${name}: overwrite confirmation should not open character creation before approval`);
  assert.strictEqual(overwriteConfirm.pageOverflow, false, `${name}: confirm dialog should not create horizontal overflow`);

  await page.locator('#app-confirm-dialog [data-command-control="cancel-dialog"]').click();
  await page.waitForTimeout(50);
  const cancelledOverwrite = await page.evaluate(() => {
    const dialog = document.getElementById('app-confirm-dialog');
    const saveManager = document.getElementById('save-manager');
    const create = document.getElementById('screen-create');
    const close = saveManager?.querySelector('[data-command-control="close-save-manager"]');
    const closeRect = close?.getBoundingClientRect();
    return {
      dialogExists: Boolean(dialog),
      pendingCleared: !App.pendingConfirm,
      appScreen: App.screen,
      activeSlot: App.activeSlot,
      lastSlot: App._getStoredValue?.('lastSlot') || '',
      saveManagerDisplay: getComputedStyle(saveManager).display,
      saveManagerActive: saveManager.classList.contains('active'),
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      closeInsideViewport: Boolean(closeRect && closeRect.left >= -1 && closeRect.right <= innerWidth + 1 && closeRect.top >= -1 && closeRect.bottom <= innerHeight + 1),
      createDisplay: getComputedStyle(create).display,
      focusTrapId: App._focusTrap?.container?.id || '',
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(cancelledOverwrite.dialogExists, false, `${name}: cancelled overwrite confirmation should remove the dialog`);
  assert.strictEqual(cancelledOverwrite.pendingCleared, true, `${name}: cancelled overwrite confirmation should clear pending state`);
  assert.strictEqual(cancelledOverwrite.appScreen, 'save-manager', `${name}: cancelling overwrite should keep save manager screen state`);
  assert.notStrictEqual(cancelledOverwrite.activeSlot, 'slot2', `${name}: cancelling overwrite should not switch the active slot`);
  assert.notStrictEqual(cancelledOverwrite.lastSlot, 'slot2', `${name}: cancelling overwrite should not persist the selected slot`);
  assert.notStrictEqual(cancelledOverwrite.saveManagerDisplay, 'none', `${name}: cancelling overwrite should return to the save manager`);
  assert.strictEqual(cancelledOverwrite.saveManagerActive, true, `${name}: cancelling overwrite should keep save manager active`);
  assert.strictEqual(cancelledOverwrite.closeVisible, true, `${name}: save manager close should remain visible after cancelling overwrite`);
  assert.strictEqual(cancelledOverwrite.closeInsideViewport, true, `${name}: save manager close should remain inside the viewport after cancelling overwrite`);
  assert.strictEqual(cancelledOverwrite.createDisplay, 'none', `${name}: cancelling overwrite should not open character creation`);
  assert.strictEqual(cancelledOverwrite.focusTrapId, 'save-manager', `${name}: cancelling overwrite should restore save-manager focus trap`);
  assert.strictEqual(cancelledOverwrite.pageOverflow, false, `${name}: cancelling overwrite should not introduce horizontal overflow`);

  await page.evaluate(() => App.showSaveRecoveryDialog('slot2', new Uint8Array([1, 2, 3, 4])));
  await page.waitForTimeout(50);
  const recoveryDialog = await page.evaluate(() => {
    const dialog = document.getElementById('save-recovery-dialog');
    const card = dialog?.querySelector('.app-confirm-card');
    const cancel = dialog?.querySelector('[data-command-control="cancel-save-recovery"]');
    const backup = dialog?.querySelector('[data-command-control="backup-save"]');
    const deleteSave = dialog?.querySelector('[data-command-control="delete-save"]');
    const saveManager = document.getElementById('save-manager');
    const dialogRect = dialog?.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();
    const cancelRect = cancel?.getBoundingClientRect();
    const backupRect = backup?.getBoundingClientRect();
    const deleteRect = deleteSave?.getBoundingClientRect();
    const insideViewport = rect => Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1);
    return {
      exists: Boolean(dialog),
      pendingSlot: App.pendingSaveRecovery?.slotName || '',
      dialogSurface: dialog?.getAttribute('data-command-surface') || '',
      dialogMode: dialog?.getAttribute('data-command-mode') || '',
      dialogInsideViewport: insideViewport(dialogRect),
      cardInsideViewport: insideViewport(cardRect),
      cancelVisible: Boolean(cancelRect && cancelRect.width > 0 && cancelRect.height > 0),
      cancelInsideViewport: insideViewport(cancelRect),
      cancelSlot: cancel?.getAttribute('data-command-slot') || '',
      backupVisible: Boolean(backupRect && backupRect.width > 0 && backupRect.height > 0),
      backupInsideViewport: insideViewport(backupRect),
      deleteVisible: Boolean(deleteRect && deleteRect.width > 0 && deleteRect.height > 0),
      deleteInsideViewport: insideViewport(deleteRect),
      focusTrapId: App._focusTrap?.container?.id || '',
      saveManagerDisplay: getComputedStyle(saveManager).display,
      saveManagerActive: saveManager.classList.contains('active'),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(recoveryDialog.exists, true, `${name}: save recovery should open the shared recovery dialog`);
  assert.strictEqual(recoveryDialog.pendingSlot, 'slot2', `${name}: save recovery should remember the selected slot`);
  assert.strictEqual(recoveryDialog.dialogSurface, 'save-recovery-dialog', `${name}: save recovery dialog should identify its command surface`);
  assert.strictEqual(recoveryDialog.dialogMode, 'system', `${name}: save recovery dialog should identify system mode`);
  assert.strictEqual(recoveryDialog.dialogInsideViewport, true, `${name}: save recovery backdrop should stay inside the viewport`);
  assert.strictEqual(recoveryDialog.cardInsideViewport, true, `${name}: save recovery card should stay inside the viewport`);
  assert.strictEqual(recoveryDialog.cancelVisible, true, `${name}: save recovery should expose a visible cancel exit`);
  assert.strictEqual(recoveryDialog.cancelInsideViewport, true, `${name}: save recovery cancel should stay inside the viewport`);
  assert.strictEqual(recoveryDialog.cancelSlot, 'exit', `${name}: save recovery cancel should identify the exit slot`);
  assert.strictEqual(recoveryDialog.backupVisible, true, `${name}: save recovery should expose a visible backup action`);
  assert.strictEqual(recoveryDialog.backupInsideViewport, true, `${name}: save recovery backup action should stay inside the viewport`);
  assert.strictEqual(recoveryDialog.deleteVisible, true, `${name}: save recovery should expose a visible delete action`);
  assert.strictEqual(recoveryDialog.deleteInsideViewport, true, `${name}: save recovery delete action should stay inside the viewport`);
  assert.strictEqual(recoveryDialog.focusTrapId, 'save-recovery-dialog', `${name}: save recovery should activate the shared focus trap`);
  assert.notStrictEqual(recoveryDialog.saveManagerDisplay, 'none', `${name}: save manager should remain visible behind save recovery`);
  assert.strictEqual(recoveryDialog.saveManagerActive, true, `${name}: save manager should remain active behind save recovery`);
  assert.strictEqual(recoveryDialog.pageOverflow, false, `${name}: save recovery should not create horizontal overflow`);

  await page.locator('#save-recovery-dialog [data-command-control="cancel-save-recovery"]').click();
  await page.waitForTimeout(50);
  const cancelledRecovery = await page.evaluate(() => {
    const dialog = document.getElementById('save-recovery-dialog');
    const saveManager = document.getElementById('save-manager');
    const close = saveManager?.querySelector('[data-command-control="close-save-manager"]');
    const closeRect = close?.getBoundingClientRect();
    return {
      dialogExists: Boolean(dialog),
      pendingCleared: !App.pendingSaveRecovery,
      appScreen: App.screen,
      saveManagerDisplay: getComputedStyle(saveManager).display,
      saveManagerActive: saveManager.classList.contains('active'),
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      closeInsideViewport: Boolean(closeRect && closeRect.left >= -1 && closeRect.right <= innerWidth + 1 && closeRect.top >= -1 && closeRect.bottom <= innerHeight + 1),
      focusTrapId: App._focusTrap?.container?.id || '',
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(cancelledRecovery.dialogExists, false, `${name}: cancelled save recovery should remove the dialog`);
  assert.strictEqual(cancelledRecovery.pendingCleared, true, `${name}: cancelled save recovery should clear pending state`);
  assert.strictEqual(cancelledRecovery.appScreen, 'save-manager', `${name}: cancelling save recovery should keep save manager screen state`);
  assert.notStrictEqual(cancelledRecovery.saveManagerDisplay, 'none', `${name}: cancelling save recovery should return to the save manager`);
  assert.strictEqual(cancelledRecovery.saveManagerActive, true, `${name}: cancelling save recovery should keep save manager active`);
  assert.strictEqual(cancelledRecovery.closeVisible, true, `${name}: save manager close should remain visible after cancelling recovery`);
  assert.strictEqual(cancelledRecovery.closeInsideViewport, true, `${name}: save manager close should remain inside the viewport after cancelling recovery`);
  assert.strictEqual(cancelledRecovery.focusTrapId, 'save-manager', `${name}: cancelling save recovery should restore save-manager focus trap`);
  assert.strictEqual(cancelledRecovery.pageOverflow, false, `${name}: cancelling save recovery should not introduce horizontal overflow`);

  await page.locator('#save-manager [data-command-control="close-save-manager"]').click();
  await page.waitForTimeout(50);
  const returnedSaveMenu = await page.evaluate(() => {
    const menu = document.getElementById('screen-menu');
    const menuShell = menu?.querySelector('.menu-shell');
    const actions = menu?.querySelector('.menu-actions');
    const saveManager = document.getElementById('save-manager');
    const app = document.getElementById('app');
    const game = document.getElementById('screen-game');
    const shellRect = menuShell.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const visibleActions = Array.from(actions.querySelectorAll('button')).filter(button => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(button).display !== 'none';
    });
    return {
      appScreen: App.screen,
      menuDisplay: getComputedStyle(menu).display,
      menuActive: menu.classList.contains('active'),
      saveDisplay: getComputedStyle(saveManager).display,
      saveActive: saveManager.classList.contains('active'),
      gameDisplay: getComputedStyle(game).display,
      gameActive: game.classList.contains('active'),
      appDisplay: getComputedStyle(app).display,
      shellInsideViewport: shellRect.left >= -1 && shellRect.right <= innerWidth + 1 && shellRect.top >= -1 && shellRect.bottom <= innerHeight + 1,
      actionsInsideViewport: actionsRect.left >= -1 && actionsRect.right <= innerWidth + 1,
      actionsWidthBounded: actionsRect.width <= Math.min(400, innerWidth) + 1,
      actionColumnCentered: Math.abs((actionsRect.left + actionsRect.width / 2) - innerWidth / 2) <= 2,
      visibleActionCount: visibleActions.length,
      actionsTappable: visibleActions.every(button => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(returnedSaveMenu.appScreen, 'menu', `${name}: closing menu Save Manager should restore menu screen state`);
  assert.strictEqual(returnedSaveMenu.menuDisplay, 'flex', `${name}: main menu should be visible after Save Manager closes`);
  assert.strictEqual(returnedSaveMenu.menuActive, true, `${name}: main menu should regain active state after Save Manager closes`);
  assert.strictEqual(returnedSaveMenu.saveDisplay, 'none', `${name}: Save Manager should hide after close`);
  assert.strictEqual(returnedSaveMenu.saveActive, false, `${name}: Save Manager should clear active state after close`);
  assert.strictEqual(returnedSaveMenu.gameDisplay, 'none', `${name}: closing menu Save Manager should not activate the game screen`);
  assert.strictEqual(returnedSaveMenu.gameActive, false, `${name}: game screen should stay inactive after menu Save Manager closes`);
  assert.strictEqual(returnedSaveMenu.appDisplay, 'none', `${name}: game app shell should stay hidden after menu Save Manager closes`);
  assert.strictEqual(returnedSaveMenu.shellInsideViewport, true, `${name}: returned menu shell after Save Manager should stay bounded`);
  assert.strictEqual(returnedSaveMenu.actionsInsideViewport, true, `${name}: returned menu actions after Save Manager should stay inside the viewport`);
  assert.strictEqual(returnedSaveMenu.actionsWidthBounded, true, `${name}: returned menu actions after Save Manager should stay width-bounded`);
  assert.strictEqual(returnedSaveMenu.actionColumnCentered, true, `${name}: returned menu actions after Save Manager should stay centered`);
  assert(returnedSaveMenu.visibleActionCount >= 5, `${name}: returned menu after Save Manager should expose primary actions`);
  assert.strictEqual(returnedSaveMenu.actionsTappable, true, `${name}: returned menu actions after Save Manager should remain tappable`);
  assert.strictEqual(returnedSaveMenu.pageOverflow, false, `${name}: closing Save Manager should not introduce menu horizontal overflow`);

  const checkMenuOverlayReturn = async ({ control, screenName, closeControl, label }) => {
    await page.evaluate(() => App.showScreen('menu'));
    await page.waitForTimeout(50);
    await page.locator(`#screen-menu [data-command-control="${control}"]`).click();
    await page.waitForTimeout(50);
    const opened = await page.evaluate(({ screenName, closeControl }) => {
      const overlay = document.getElementById(`screen-${screenName}`);
      const close = overlay?.querySelector(`[data-command-control="${closeControl}"]`);
      const app = document.getElementById('app');
      const menu = document.getElementById('screen-menu');
      const overlayRect = overlay.getBoundingClientRect();
      const closeRect = close?.getBoundingClientRect();
      return {
        appScreen: App.screen,
        overlayDisplay: getComputedStyle(overlay).display,
        overlayActive: overlay.classList.contains('active'),
        overlayInsideViewport: overlayRect.left >= -1 && overlayRect.right <= innerWidth + 1 && overlayRect.top >= -1 && overlayRect.bottom <= innerHeight + 1,
        closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
        closeInsideViewport: Boolean(closeRect && closeRect.left >= -1 && closeRect.right <= innerWidth + 1 && closeRect.top >= -1 && closeRect.bottom <= innerHeight + 1),
        closeSlot: close?.getAttribute('data-command-slot') || '',
        appDisplay: getComputedStyle(app).display,
        menuDisplay: getComputedStyle(menu).display,
        focusTrapId: App._focusTrap?.container?.id || '',
        dialogRole: overlay.getAttribute('role') || '',
        ariaModal: overlay.getAttribute('aria-modal') || '',
        labelled: Boolean(document.getElementById(overlay.getAttribute('aria-labelledby') || '')),
        focusInside: overlay.contains(document.activeElement),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    }, { screenName, closeControl });
    assert.strictEqual(opened.appScreen, screenName, `${name}: main-menu ${label} should enter ${screenName} screen state`);
    assert.notStrictEqual(opened.overlayDisplay, 'none', `${name}: main-menu ${label} overlay should be visible`);
    assert.strictEqual(opened.overlayActive, true, `${name}: main-menu ${label} overlay should become active`);
    assert.strictEqual(opened.overlayInsideViewport, true, `${name}: main-menu ${label} overlay should stay bounded in the viewport`);
    assert.strictEqual(opened.closeVisible, true, `${name}: main-menu ${label} should expose a visible close exit`);
    assert.strictEqual(opened.closeInsideViewport, true, `${name}: main-menu ${label} close exit should stay inside the viewport`);
    assert.strictEqual(opened.closeSlot, 'exit', `${name}: main-menu ${label} close should identify the exit slot`);
    assert.strictEqual(opened.appDisplay, 'none', `${name}: game app shell should stay hidden while main-menu ${label} is open`);
    assert.strictEqual(opened.menuDisplay, 'none', `${name}: main menu should hide behind main-menu ${label}`);
    assert.strictEqual(opened.focusTrapId, `screen-${screenName}`, `${name}: main-menu ${label} should activate the shared focus trap`);
    assert.strictEqual(opened.dialogRole, 'dialog', `${name}: main-menu ${label} should expose dialog semantics`);
    assert.strictEqual(opened.ariaModal, 'true', `${name}: main-menu ${label} should identify itself as modal`);
    assert.strictEqual(opened.labelled, true, `${name}: main-menu ${label} should reference a visible heading`);
    assert.strictEqual(opened.focusInside, true, `${name}: main-menu ${label} should move focus into the active overlay`);
    assert.strictEqual(opened.pageOverflow, false, `${name}: main-menu ${label} should not create horizontal overflow`);

    await page.locator(`#screen-${screenName} [data-command-control="${closeControl}"]`).first().click();
    await page.waitForTimeout(50);
    const returned = await page.evaluate(({ screenName }) => {
      const overlay = document.getElementById(`screen-${screenName}`);
      const app = document.getElementById('app');
      const menu = document.getElementById('screen-menu');
      const game = document.getElementById('screen-game');
      const menuShell = menu?.querySelector('.menu-shell');
      const shellRect = menuShell.getBoundingClientRect();
      return {
        appScreen: App.screen,
        overlayDisplay: getComputedStyle(overlay).display,
        overlayActive: overlay.classList.contains('active'),
        appDisplay: getComputedStyle(app).display,
        menuDisplay: getComputedStyle(menu).display,
        menuActive: menu.classList.contains('active'),
        gameDisplay: getComputedStyle(game).display,
        gameActive: game.classList.contains('active'),
        focusTrapCleared: !App._focusTrap,
        menuShellInsideViewport: shellRect.left >= -1 && shellRect.right <= innerWidth + 1 && shellRect.top >= -1 && shellRect.bottom <= innerHeight + 1,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    }, { screenName });
    assert.strictEqual(returned.appScreen, 'menu', `${name}: closing main-menu ${label} should restore menu screen state`);
    assert.strictEqual(returned.overlayDisplay, 'none', `${name}: main-menu ${label} overlay should hide after close`);
    assert.strictEqual(returned.overlayActive, false, `${name}: main-menu ${label} overlay should clear active state after close`);
    assert.strictEqual(returned.appDisplay, 'none', `${name}: game app shell should stay hidden after main-menu ${label} closes`);
    assert.strictEqual(returned.menuDisplay, 'flex', `${name}: main menu should be visible after main-menu ${label} closes`);
    assert.strictEqual(returned.menuActive, true, `${name}: main menu should regain active state after main-menu ${label} closes`);
    assert.strictEqual(returned.gameDisplay, 'none', `${name}: closing main-menu ${label} should not activate the game screen`);
    assert.strictEqual(returned.gameActive, false, `${name}: game screen should stay inactive after main-menu ${label} closes`);
    assert.strictEqual(returned.focusTrapCleared, true, `${name}: main-menu ${label} should clear the shared focus trap on close`);
    assert.strictEqual(returned.menuShellInsideViewport, true, `${name}: returned menu shell after ${label} should stay bounded`);
    assert.strictEqual(returned.pageOverflow, false, `${name}: closing main-menu ${label} should not introduce horizontal overflow`);
  };

  await checkMenuOverlayReturn({ control: 'open-mods', screenName: 'mods', closeControl: 'close-modules', label: 'Mods' });
  await checkMenuOverlayReturn({ control: 'open-activity-log', screenName: 'activity', closeControl: 'close-activity-log', label: 'Activity Log' });
  await checkMenuOverlayReturn({ control: 'open-release-notes', screenName: 'release', closeControl: 'close-release-notes', label: "What's New" });

  await page.evaluate(() => App.showScreen('menu'));
  await page.locator('#screen-menu [data-command-control="open-mods"]').click();
  const catalogControl = await page.locator('#screen-mods [data-command-control="open-market"]').evaluate(control => ({
    hidden: control.hidden,
    display: getComputedStyle(control).display
  }));
  assert.strictEqual(catalogControl.hidden, true, `${name}: no-host build should hide the Host Catalog control`);
  assert.strictEqual(catalogControl.display, 'none', `${name}: hidden Host Catalog control should not occupy Mod Manager layout`);
  await page.evaluate(() => App.showMarketScreen());
  await page.waitForTimeout(50);
  const guardedCatalog = await page.evaluate(() => ({
    appScreen: App.screen,
    returnStack: [...App.overlayReturnStack],
    marketDisplay: getComputedStyle(document.getElementById('screen-market')).display,
    modsDisplay: getComputedStyle(document.getElementById('screen-mods')).display,
    focusTrapId: App._focusTrap?.container?.id || '',
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }));
  assert.strictEqual(guardedCatalog.appScreen, 'mods', `${name}: no-host catalog route should remain in Mods`);
  assert.deepStrictEqual(guardedCatalog.returnStack, ['menu'], `${name}: guarded catalog route should preserve the menu origin`);
  assert.strictEqual(guardedCatalog.marketDisplay, 'none', `${name}: no-host catalog should stay hidden`);
  assert.notStrictEqual(guardedCatalog.modsDisplay, 'none', `${name}: Mod Manager should remain visible after guarded catalog routing`);
  assert.strictEqual(guardedCatalog.focusTrapId, 'screen-mods', `${name}: Mod Manager should retain the focus trap`);
  assert.strictEqual(guardedCatalog.pageOverflow, false, `${name}: guarded catalog routing should not create horizontal overflow`);

  await page.locator('#screen-mods [data-command-control="close-modules"]').click();
  await page.waitForTimeout(50);
  assert.strictEqual(await page.evaluate(() => App.screen), 'menu', `${name}: closing returned Mods should restore the main menu`);

  await page.evaluate(makeUnitScript());
  await page.waitForTimeout(50);
  await page.evaluate(() => App.showSaveManager('save'));
  await page.waitForTimeout(50);
  const openGameSave = await page.evaluate(() => {
    const root = document.getElementById('save-manager');
    const close = root?.querySelector('[data-command-control="close-save-manager"]');
    const closeRect = close?.getBoundingClientRect();
    return {
      appScreen: App.screen,
      saveMode: App.saveManagerMode,
      display: getComputedStyle(root).display,
      active: root.classList.contains('active'),
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      closeSlot: close?.getAttribute('data-command-slot') || '',
      appDisplay: getComputedStyle(document.getElementById('app')).display,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(openGameSave.appScreen, 'save-manager', `${name}: live-game Save should enter save-manager screen state`);
  assert.strictEqual(openGameSave.saveMode, 'save', `${name}: live-game Save should open save manager in save mode`);
  assert.notStrictEqual(openGameSave.display, 'none', `${name}: live-game Save Manager should be visible`);
  assert.strictEqual(openGameSave.active, true, `${name}: live-game Save Manager should become active`);
  assert.strictEqual(openGameSave.closeVisible, true, `${name}: live-game Save Manager should expose a visible close exit`);
  assert.strictEqual(openGameSave.closeSlot, 'exit', `${name}: live-game Save Manager close should identify the exit slot`);
  assert.strictEqual(openGameSave.appDisplay, 'grid', `${name}: live-game Save Manager should preserve the game shell behind the overlay`);
  assert.strictEqual(openGameSave.pageOverflow, false, `${name}: live-game Save Manager should not create horizontal overflow`);

  await page.locator('#save-manager [data-command-control="close-save-manager"]').click();
  await page.waitForTimeout(50);
  const returnedGameSave = await page.evaluate(() => {
    const root = document.getElementById('save-manager');
    const app = document.getElementById('app');
    const game = document.getElementById('screen-game');
    const menu = document.getElementById('screen-menu');
    const dock = document.querySelector('.mobile-panel-dock');
    const playSurface = document.getElementById('mobile-play-surface');
    const desktopSurface = document.querySelector('.desktop-play-surface');
    const activeSurface = innerWidth <= 1024 ? playSurface : desktopSurface;
    const surfaceRect = activeSurface?.getBoundingClientRect();
    return {
      appScreen: App.screen,
      saveDisplay: getComputedStyle(root).display,
      saveActive: root.classList.contains('active'),
      appDisplay: getComputedStyle(app).display,
      gameDisplay: getComputedStyle(game).display,
      gameActive: game.classList.contains('active'),
      menuDisplay: getComputedStyle(menu).display,
      dockVisible: Boolean(dock) && getComputedStyle(dock).display !== 'none' && dock.getBoundingClientRect().height > 0,
      surfaceVisible: Boolean(surfaceRect && surfaceRect.width > 0 && surfaceRect.height > 0),
      surfaceInsideViewport: !surfaceRect || (surfaceRect.left >= -1 && surfaceRect.right <= innerWidth + 1),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(returnedGameSave.appScreen, 'game', `${name}: closing live-game Save Manager should restore game screen state`);
  assert.strictEqual(returnedGameSave.saveDisplay, 'none', `${name}: live-game Save Manager should hide after close`);
  assert.strictEqual(returnedGameSave.saveActive, false, `${name}: live-game Save Manager should clear active state after close`);
  assert.strictEqual(returnedGameSave.appDisplay, 'grid', `${name}: game app shell should be visible after live-game Save Manager closes`);
  assert.strictEqual(returnedGameSave.gameDisplay, 'flex', `${name}: game screen should be visible after live-game Save Manager closes`);
  assert.strictEqual(returnedGameSave.gameActive, true, `${name}: game screen should regain active state after live-game Save Manager closes`);
  assert.strictEqual(returnedGameSave.menuDisplay, 'none', `${name}: closing live-game Save Manager should not restore the main menu`);
  if (width <= 1024) assert.strictEqual(returnedGameSave.dockVisible, true, `${name}: mobile dock should be visible after live-game Save Manager closes`);
  assert.strictEqual(returnedGameSave.surfaceVisible, true, `${name}: play surface should be visible after live-game Save Manager closes`);
  assert.strictEqual(returnedGameSave.surfaceInsideViewport, true, `${name}: play surface should stay horizontally bounded after live-game Save Manager closes`);
  assert.strictEqual(returnedGameSave.pageOverflow, false, `${name}: closing live-game Save Manager should not introduce horizontal overflow`);

  await page.evaluate(() => {
    const make = (name, id) => ({
      id, name, species: 'human', icon: '👤',
      CPun: 100, MPun: 100, CPle: 30, MPle: 100,
      level: 1, size: 4, appetite: 4,
      stomach: [], womb: [], balls: [], inventory: [],
      Figh: 10, Flir: 10, Fuck: 10, Feas: 10, Feed: 10, Flee: 10,
      con: 10, wis: 10, cha: 10
    });
    App.player.gold = 12;
    App.inventory = [];
    App.creatures = [
      Object.assign(make('Guide', 'guide-transaction'), {
        disposition: App.DISPOSITION.QUEST_GIVER,
        quest: {
          id: 'transaction-q1',
          title: 'Road Errand',
          description: 'Check the next marker.',
          objectives: [{ type: 'travel', required: 1, progress: 0, label: 'Walk east' }],
          reward: { gold: 3 }
        }
      }),
      Object.assign(make('Merchant', 'merchant-transaction'), {
        disposition: App.DISPOSITION.MERCHANT,
        stock: [{ id: 'stock-herb', name: 'Healing Herb', price: 2, qty: 1 }]
      })
    ];
    App.renderCreatures();
    App.renderExplorationActions();
    App.selectIntent('creature', 'merchant-transaction', 'trade', 'composer-tray');
  });
  await page.waitForTimeout(50);
  const tradeWindow = await page.evaluate(() => {
    const root = document.getElementById('transaction-window-root');
    const modal = root?.querySelector('.transaction-window');
    const close = root?.querySelector('[data-command-control="close-transaction"]');
    const composer = document.getElementById(innerWidth <= 1024 ? 'mobile-control-belt' : 'desktop-command-composer');
    const rect = modal?.getBoundingClientRect();
    const closeRect = close?.getBoundingClientRect();
    return {
      hidden: Boolean(root?.hidden),
      kind: App.transactionWindow?.kind || '',
      text: root?.textContent || '',
      role: modal?.getAttribute('role') || '',
      ariaModal: modal?.getAttribute('aria-modal') || '',
      inViewport: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      appInert: document.querySelector('#app > .stage')?.hasAttribute('inert') || false,
      composerHidden: composer ? getComputedStyle(composer).visibility === 'hidden' : true,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(tradeWindow.hidden, false, `${name}: trade transaction window should be visible`);
  assert.strictEqual(tradeWindow.kind, 'trade', `${name}: trade transaction should store trade state`);
  assert.strictEqual(tradeWindow.role, 'dialog', `${name}: trade transaction should use dialog semantics`);
  assert.strictEqual(tradeWindow.ariaModal, 'true', `${name}: trade transaction should be modal`);
  assert.strictEqual(tradeWindow.inViewport, true, `${name}: trade transaction should fit inside the viewport`);
  assert.strictEqual(tradeWindow.closeVisible, true, `${name}: trade transaction should expose a visible Back exit`);
  assert.strictEqual(tradeWindow.appInert, true, `${name}: transaction should make the underlying stage inert`);
  assert.strictEqual(tradeWindow.composerHidden, true, `${name}: transaction should hide underlying composer controls`);
  assert.strictEqual(tradeWindow.pageOverflow, false, `${name}: trade transaction should not create horizontal overflow`);
  assert(tradeWindow.text.includes('Buy') && tradeWindow.text.includes('Sell') && tradeWindow.text.includes('Gold'), `${name}: trade transaction should show Buy/Sell and gold`);
  await page.evaluate(() => App.closeTransactionWindow());
  await page.waitForTimeout(50);
  const afterTradeClose = await page.evaluate(() => ({
    closed: App.transactionWindow === null,
    hidden: document.getElementById('transaction-window-root')?.hidden || false,
    stageInert: document.querySelector('#app > .stage')?.hasAttribute('inert') || false
  }));
  assert.strictEqual(afterTradeClose.closed, true, `${name}: Back should clear transaction state`);
  assert.strictEqual(afterTradeClose.hidden, true, `${name}: Back should hide transaction root`);
  assert.strictEqual(afterTradeClose.stageInert, false, `${name}: Back should restore underlying stage interactivity`);

  await page.evaluate(() => App.selectIntent('creature', 'guide-transaction', 'quest', 'composer-tray'));
  await page.waitForTimeout(50);
  const questWindow = await page.evaluate(() => {
    const root = document.getElementById('transaction-window-root');
    const modal = root?.querySelector('.transaction-window');
    const rect = modal?.getBoundingClientRect();
    return {
      kind: App.transactionWindow?.kind || '',
      text: root?.textContent || '',
      inViewport: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(questWindow.kind, 'quest', `${name}: quest transaction should store quest state`);
  assert.strictEqual(questWindow.inViewport, true, `${name}: quest transaction should fit inside the viewport`);
  assert.strictEqual(questWindow.pageOverflow, false, `${name}: quest transaction should not create horizontal overflow`);
  assert(questWindow.text.includes('Available') && questWindow.text.includes('Accepted') && questWindow.text.includes('Completed'), `${name}: quest transaction should show quest status lists`);
  await page.evaluate(() => App.closeTransactionWindow());
  await page.evaluate(makeUnitScript());
  await page.waitForTimeout(50);

  await page.evaluate(() => {
    App.setAppMenuOpen?.(true);
    App.openSettingsFromGame();
  });
  await page.waitForTimeout(50);
  const openGameSettings = await page.evaluate(() => {
    const settings = document.getElementById('screen-settings');
    const app = document.getElementById('app');
    const game = document.getElementById('screen-game');
    const appMenu = document.getElementById('app-menu');
    const appMenuToggle = document.getElementById('app-menu-toggle');
    const close = settings?.querySelector('[data-command-control="close-settings"]');
    const settingsRect = settings.getBoundingClientRect();
    const closeRect = close?.getBoundingClientRect();
    return {
      appScreen: App.screen,
      returnScreen: App.settingsReturnScreen,
      appDisplay: getComputedStyle(app).display,
      gameDisplay: getComputedStyle(game).display,
      gameActive: game.classList.contains('active'),
      settingsDisplay: getComputedStyle(settings).display,
      settingsActive: settings.classList.contains('active'),
      settingsInsideViewport: settingsRect.left >= -1 && settingsRect.right <= innerWidth + 1 && settingsRect.top >= -1 && settingsRect.bottom <= innerHeight + 1,
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      closeControl: close?.getAttribute('data-command-control') || '',
      closeSlot: close?.getAttribute('data-command-slot') || '',
      appMenuOpen: appMenu?.classList.contains('open') || false,
      appMenuExpanded: appMenuToggle?.getAttribute('aria-expanded') || '',
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(openGameSettings.appScreen, 'settings', `${name}: live-game Settings should enter settings screen state`);
  assert.strictEqual(openGameSettings.returnScreen, 'game', `${name}: live-game Settings should remember the game return target`);
  assert.strictEqual(openGameSettings.appDisplay, 'none', `${name}: game app shell should hide while live-game Settings is open`);
  assert.strictEqual(openGameSettings.gameDisplay, 'none', `${name}: game screen should hide behind live-game Settings`);
  assert.strictEqual(openGameSettings.gameActive, false, `${name}: game screen should not stay active behind live-game Settings`);
  assert.notStrictEqual(openGameSettings.settingsDisplay, 'none', `${name}: live-game Settings overlay should be visible`);
  assert.strictEqual(openGameSettings.settingsActive, true, `${name}: live-game Settings overlay should become active`);
  assert.strictEqual(openGameSettings.settingsInsideViewport, true, `${name}: live-game Settings overlay should stay bounded in the viewport`);
  assert.strictEqual(openGameSettings.closeVisible, true, `${name}: live-game Settings should expose a visible close exit`);
  assert.strictEqual(openGameSettings.closeControl, 'close-settings', `${name}: live-game Settings close should expose its command control`);
  assert.strictEqual(openGameSettings.closeSlot, 'exit', `${name}: live-game Settings close should identify the exit slot`);
  assert.strictEqual(openGameSettings.appMenuOpen, false, `${name}: live-game Settings should close the app menu`);
  assert.strictEqual(openGameSettings.appMenuExpanded, 'false', `${name}: live-game Settings should collapse the app-menu toggle state`);
  assert.strictEqual(openGameSettings.pageOverflow, false, `${name}: live-game Settings should not create horizontal overflow`);

  await page.locator('#screen-settings [data-command-control="close-settings"]').click();
  await page.waitForTimeout(50);
  const returnedGameSettings = await page.evaluate(() => {
    const settings = document.getElementById('screen-settings');
    const app = document.getElementById('app');
    const game = document.getElementById('screen-game');
    const menu = document.getElementById('screen-menu');
    const appMenu = document.getElementById('app-menu');
    const appMenuToggle = document.getElementById('app-menu-toggle');
    const dock = document.querySelector('.mobile-panel-dock');
    const playSurface = document.getElementById('mobile-play-surface');
    const desktopSurface = document.querySelector('.desktop-play-surface');
    const activeSurface = innerWidth <= 1024 ? playSurface : desktopSurface;
    const surfaceRect = activeSurface?.getBoundingClientRect();
    return {
      appScreen: App.screen,
      returnScreen: App.settingsReturnScreen,
      settingsDisplay: getComputedStyle(settings).display,
      settingsActive: settings.classList.contains('active'),
      appDisplay: getComputedStyle(app).display,
      gameDisplay: getComputedStyle(game).display,
      gameActive: game.classList.contains('active'),
      menuDisplay: getComputedStyle(menu).display,
      appMenuOpen: appMenu?.classList.contains('open') || false,
      appMenuExpanded: appMenuToggle?.getAttribute('aria-expanded') || '',
      focusId: document.activeElement?.id || '',
      dockVisible: Boolean(dock) && getComputedStyle(dock).display !== 'none' && dock.getBoundingClientRect().height > 0,
      surfaceVisible: Boolean(surfaceRect && surfaceRect.width > 0 && surfaceRect.height > 0),
      surfaceInsideViewport: !surfaceRect || (surfaceRect.left >= -1 && surfaceRect.right <= innerWidth + 1),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(returnedGameSettings.appScreen, 'game', `${name}: closing live-game Settings should restore game screen state`);
  assert.strictEqual(returnedGameSettings.returnScreen, null, `${name}: closing live-game Settings should clear return state`);
  assert.strictEqual(returnedGameSettings.settingsDisplay, 'none', `${name}: live-game Settings should hide after close`);
  assert.strictEqual(returnedGameSettings.settingsActive, false, `${name}: live-game Settings should clear active state after close`);
  assert.strictEqual(returnedGameSettings.appDisplay, 'grid', `${name}: game app shell should be visible after live-game Settings closes`);
  assert.strictEqual(returnedGameSettings.gameDisplay, 'flex', `${name}: game screen should be visible after live-game Settings closes`);
  assert.strictEqual(returnedGameSettings.gameActive, true, `${name}: game screen should regain active state after live-game Settings closes`);
  assert.strictEqual(returnedGameSettings.menuDisplay, 'none', `${name}: closing live-game Settings should not restore the main menu`);
  assert.strictEqual(returnedGameSettings.appMenuOpen, false, `${name}: app menu should stay closed after live-game Settings closes`);
  assert.strictEqual(returnedGameSettings.appMenuExpanded, 'false', `${name}: app-menu toggle should stay collapsed after live-game Settings closes`);
  assert.strictEqual(returnedGameSettings.focusId, 'app-menu-toggle', `${name}: closing live-game Settings should restore keyboard focus to the app-menu trigger`);
  if (width <= 1024) assert.strictEqual(returnedGameSettings.dockVisible, true, `${name}: mobile dock should be visible after live-game Settings closes`);
  assert.strictEqual(returnedGameSettings.surfaceVisible, true, `${name}: play surface should be visible after live-game Settings closes`);
  assert.strictEqual(returnedGameSettings.surfaceInsideViewport, true, `${name}: play surface should stay horizontally bounded after live-game Settings closes`);
  assert.strictEqual(returnedGameSettings.pageOverflow, false, `${name}: closing live-game Settings should not introduce horizontal overflow`);

  const checkLiveOverlayReturn = async ({ control, screenName, closeControl, label }) => {
    await page.evaluate(({ control }) => {
      App.setAppMenuOpen?.(true);
      document.querySelector(`#app-menu [data-command-control="${control}"]`)?.click();
    }, { control });
    await page.waitForTimeout(50);
    const opened = await page.evaluate(({ screenName, closeControl }) => {
      const overlay = document.getElementById(`screen-${screenName}`);
      const close = overlay?.querySelector(`[data-command-control="${closeControl}"]`);
      const app = document.getElementById('app');
      const game = document.getElementById('screen-game');
      const appMenu = document.getElementById('app-menu');
      const appMenuToggle = document.getElementById('app-menu-toggle');
      const overlayRect = overlay.getBoundingClientRect();
      const closeRect = close?.getBoundingClientRect();
      return {
        appScreen: App.screen,
        overlayDisplay: getComputedStyle(overlay).display,
        overlayActive: overlay.classList.contains('active'),
        overlayInsideViewport: overlayRect.left >= -1 && overlayRect.right <= innerWidth + 1 && overlayRect.top >= -1 && overlayRect.bottom <= innerHeight + 1,
        closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
        closeInsideViewport: Boolean(closeRect && closeRect.left >= -1 && closeRect.right <= innerWidth + 1 && closeRect.top >= -1 && closeRect.bottom <= innerHeight + 1),
        closeSlot: close?.getAttribute('data-command-slot') || '',
        appDisplay: getComputedStyle(app).display,
        gameDisplay: getComputedStyle(game).display,
        gameActive: game.classList.contains('active'),
        appMenuOpen: appMenu?.classList.contains('open') || false,
        appMenuExpanded: appMenuToggle?.getAttribute('aria-expanded') || '',
        focusTrapId: App._focusTrap?.container?.id || '',
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    }, { screenName, closeControl });
    assert.strictEqual(opened.appScreen, screenName, `${name}: live-game ${label} should enter ${screenName} screen state`);
    assert.notStrictEqual(opened.overlayDisplay, 'none', `${name}: live-game ${label} overlay should be visible`);
    assert.strictEqual(opened.overlayActive, true, `${name}: live-game ${label} overlay should become active`);
    assert.strictEqual(opened.overlayInsideViewport, true, `${name}: live-game ${label} overlay should stay bounded in the viewport`);
    assert.strictEqual(opened.closeVisible, true, `${name}: live-game ${label} should expose a visible close exit`);
    assert.strictEqual(opened.closeInsideViewport, true, `${name}: live-game ${label} close exit should stay inside the viewport`);
    assert.strictEqual(opened.closeSlot, 'exit', `${name}: live-game ${label} close should identify the exit slot`);
    assert.strictEqual(opened.appDisplay, 'none', `${name}: game app shell should hide while live-game ${label} is open`);
    assert.strictEqual(opened.gameDisplay, 'none', `${name}: game screen should hide behind live-game ${label}`);
    assert.strictEqual(opened.gameActive, false, `${name}: game screen should not stay active behind live-game ${label}`);
    assert.strictEqual(opened.appMenuOpen, false, `${name}: live-game ${label} should close the app menu`);
    assert.strictEqual(opened.appMenuExpanded, 'false', `${name}: live-game ${label} should collapse the app-menu toggle state`);
    assert.strictEqual(opened.focusTrapId, `screen-${screenName}`, `${name}: live-game ${label} should activate the shared focus trap`);
    assert.strictEqual(opened.pageOverflow, false, `${name}: live-game ${label} should not create horizontal overflow`);

    await page.locator(`#screen-${screenName} [data-command-control="${closeControl}"]`).first().click();
    await page.waitForTimeout(50);
    const returned = await page.evaluate(({ screenName }) => {
      const overlay = document.getElementById(`screen-${screenName}`);
      const app = document.getElementById('app');
      const game = document.getElementById('screen-game');
      const menu = document.getElementById('screen-menu');
      const dock = document.querySelector('.mobile-panel-dock');
      const appMenuToggle = document.getElementById('app-menu-toggle');
      const playSurface = document.getElementById('mobile-play-surface');
      const desktopSurface = document.querySelector('.desktop-play-surface');
      const activeSurface = innerWidth <= 1024 ? playSurface : desktopSurface;
      const surfaceRect = activeSurface?.getBoundingClientRect();
      return {
        appScreen: App.screen,
        overlayDisplay: getComputedStyle(overlay).display,
        overlayActive: overlay.classList.contains('active'),
        appDisplay: getComputedStyle(app).display,
        gameDisplay: getComputedStyle(game).display,
        gameActive: game.classList.contains('active'),
        menuDisplay: getComputedStyle(menu).display,
        focusTrapCleared: !App._focusTrap,
        dockVisible: Boolean(dock) && getComputedStyle(dock).display !== 'none' && dock.getBoundingClientRect().height > 0,
        surfaceVisible: Boolean(surfaceRect && surfaceRect.width > 0 && surfaceRect.height > 0),
        surfaceInsideViewport: !surfaceRect || (surfaceRect.left >= -1 && surfaceRect.right <= innerWidth + 1),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    }, { screenName });
    assert.strictEqual(returned.appScreen, 'game', `${name}: closing live-game ${label} should restore game screen state`);
    assert.strictEqual(returned.overlayDisplay, 'none', `${name}: live-game ${label} overlay should hide after close`);
    assert.strictEqual(returned.overlayActive, false, `${name}: live-game ${label} overlay should clear active state after close`);
    assert.strictEqual(returned.appDisplay, 'grid', `${name}: game app shell should be visible after live-game ${label} closes`);
    assert.strictEqual(returned.gameDisplay, 'flex', `${name}: game screen should be visible after live-game ${label} closes`);
    assert.strictEqual(returned.gameActive, true, `${name}: game screen should regain active state after live-game ${label} closes`);
    assert.strictEqual(returned.menuDisplay, 'none', `${name}: closing live-game ${label} should not restore the main menu`);
    assert.strictEqual(returned.focusTrapCleared, true, `${name}: live-game ${label} should clear the shared focus trap on close`);
    if (width <= 1024) assert.strictEqual(returned.dockVisible, true, `${name}: mobile dock should be visible after live-game ${label} closes`);
    assert.strictEqual(returned.surfaceVisible, true, `${name}: play surface should be visible after live-game ${label} closes`);
    assert.strictEqual(returned.surfaceInsideViewport, true, `${name}: play surface should stay horizontally bounded after live-game ${label} closes`);
    assert.strictEqual(returned.pageOverflow, false, `${name}: closing live-game ${label} should not introduce horizontal overflow`);
  };

  await checkLiveOverlayReturn({ control: 'open-mods', screenName: 'mods', closeControl: 'close-modules', label: 'Mods' });
  await checkLiveOverlayReturn({ control: 'open-activity-log', screenName: 'activity', closeControl: 'close-activity-log', label: 'Activity Log' });
  await checkLiveOverlayReturn({ control: 'open-release-notes', screenName: 'release', closeControl: 'close-release-notes', label: "What's New" });

  await page.evaluate(() => {
    App.player.stomach = [
      {
        id: 'viewport-held-one',
        containedId: 'viewport-held-one',
        name: 'Held One',
        icon: '🐰',
        CPun: 20,
        MPun: 40,
        size: 1,
        inStomach: true,
        releaseEligible: true,
        progress: 25,
        digestionProgress: 25,
        vitalMax: 20,
        vitalRemaining: 15
      },
      {
        id: 'viewport-terminal-one',
        containedId: 'viewport-terminal-one',
        name: 'Terminal One',
        icon: '🐀',
        CPun: 0,
        MPun: 40,
        size: 1,
        inStomach: true,
        releaseEligible: false,
        state: 'terminal',
        digestionState: 'terminal',
        progress: 100,
        digestionProgress: 100,
        vitalMax: 20,
        vitalRemaining: 0
      }
    ];
    App.player.stomach.forEach(prey => App._normalizeContainmentRecord(App.player, prey, 'stomach'));
    const companionHeld = {
      id: 'viewport-companion-held',
      containedId: 'viewport-companion-held',
      name: 'Companion Held',
      icon: '🐸',
      CPun: 12,
      MPun: 36,
      size: 1,
      inStomach: true,
      releaseEligible: true,
      progress: 15,
      digestionProgress: 15,
      vitalMax: 12,
      vitalRemaining: 11
    };
    let companion = (App.party || []).find(unit => unit?.id === 'ally-1') || (App.party || [])[1];
    if (!companion) {
      companion = { ...App.player, id: 'ally-1', name: 'Ally', icon: '🐰' };
      App.party = [App.player, companion];
    }
    companion.id = companion.id || 'ally-1';
    companion.name = companion.name || 'Ally';
    companion.icon = companion.icon || '🐰';
    companion.equipment = { ...(companion.equipment || {}), head: { id: 'viewport-ally-cap', name: 'Leather Cap' } };
    companion.stomach = [companionHeld];
    App._normalizeContainmentRecord(companion, companionHeld, 'stomach');
    if (!(App.party || []).includes(companion)) App.party = [App.player, companion];
    App.showCharacterStats();
  });
  await page.waitForTimeout(50);
  const holdingsWindow = await page.evaluate(() => {
    const root = document.getElementById('holdings-window-root');
    const dialog = root?.querySelector('.holdings-window');
    const close = root?.querySelector('.holdings-close[data-command-control="close-holdings"]');
    const tabs = Array.from(root?.querySelectorAll('[data-command-control="switch-holdings-tab"]') || []);
    const body = root?.querySelector('.holdings-window-body');
    const controlShelf = root?.querySelector('.holdings-control-shelf');
    const tabRow = root?.querySelector('.holdings-tabs');
    const ownerRow = root?.querySelector('.holdings-owner-row');
    const statsSummary = root?.querySelector('.holdings-character-summary');
    const app = document.getElementById('app');
    const stage = document.querySelector('#app > .stage');
    const rect = dialog?.getBoundingClientRect();
    const closeRect = close?.getBoundingClientRect();
    const bodyRect = body?.getBoundingClientRect();
    const controlShelfRect = controlShelf?.getBoundingClientRect();
    const tabRowRect = tabRow?.getBoundingClientRect();
    const ownerRect = ownerRow?.getBoundingClientRect();
    const statsSummaryRect = statsSummary?.getBoundingClientRect();
    const ownerChips = Array.from(root?.querySelectorAll('[data-command-control="select-holdings-owner"]') || []);
    return {
      hidden: Boolean(root?.hidden),
      role: dialog?.getAttribute('role') || '',
      ariaModal: dialog?.getAttribute('aria-modal') || '',
      surfaceRole: dialog?.getAttribute('data-surface-role') || '',
      title: root?.querySelector('#holdings-window-title')?.textContent?.trim() || '',
      inViewport: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
      closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
      closeInsideViewport: Boolean(closeRect && closeRect.left >= -1 && closeRect.right <= innerWidth + 1 && closeRect.top >= -1 && closeRect.bottom <= innerHeight + 1),
      tabs: tabs.map(tab => tab.getAttribute('data-command-slot') || tab.textContent.trim()),
      ownerChipCount: ownerChips.length,
      ownerChipLabels: ownerChips.map(chip => chip.textContent.trim()),
      selectedOwner: ownerChips.find(chip => chip.getAttribute('aria-pressed') === 'true')?.textContent.trim() || '',
      bodyVisible: Boolean(bodyRect && bodyRect.width > 0 && bodyRect.height > 0),
      controlShelfVisible: Boolean(controlShelfRect && controlShelfRect.width > 0 && controlShelfRect.height > 0),
      ownerAboveBody: Boolean(ownerRect && bodyRect && ownerRect.bottom <= bodyRect.top + 1),
      ownerAboveStatsSummary: Boolean(ownerRect && statsSummaryRect && ownerRect.bottom <= statsSummaryRect.top + 1),
      controlsBelowBody: Boolean(controlShelfRect && bodyRect && bodyRect.bottom <= controlShelfRect.top + 1),
      tabsNearDialogBottom: Boolean(tabRowRect && rect && rect.bottom - tabRowRect.bottom <= 2 + parseFloat(getComputedStyle(controlShelf).paddingBottom || '0')),
      appClass: app?.classList.contains('holdings-window-open') || false,
      stageInert: stage?.hasAttribute('inert') || false,
      focusTrapIsDialog: App._focusTrap?.container === dialog,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(holdingsWindow.hidden, false, `${name}: Holdings window should be visible from live play`);
  assert.strictEqual(holdingsWindow.role, 'dialog', `${name}: Holdings window should use dialog semantics`);
  assert.strictEqual(holdingsWindow.ariaModal, 'true', `${name}: Holdings window should be modal`);
  assert.strictEqual(holdingsWindow.surfaceRole, 'holdings-window', `${name}: Holdings window should identify its surface role`);
  assert(holdingsWindow.title.length > 0, `${name}: Holdings window should expose a title`);
  assert.strictEqual(holdingsWindow.inViewport, true, `${name}: Holdings window should stay inside the viewport`);
  assert.strictEqual(holdingsWindow.closeVisible, true, `${name}: Holdings window should expose a visible close control`);
  assert.strictEqual(holdingsWindow.closeInsideViewport, true, `${name}: Holdings close control should stay inside the viewport`);
  assert(holdingsWindow.tabs.includes('stats') && holdingsWindow.tabs.includes('equipment') && holdingsWindow.tabs.includes('pack') && holdingsWindow.tabs.includes('containers') && holdingsWindow.tabs.includes('ground'), `${name}: Holdings window should expose Stats, Equipment, Pack, Containers, and Here/Ground tabs`);
  assert(holdingsWindow.ownerChipCount >= 2, `${name}: Holdings window should expose owner chips for player and companions`);
  assert(holdingsWindow.ownerChipLabels.some(label => label.includes('Ally')), `${name}: Holdings owner selector should include companions`);
  assert(holdingsWindow.selectedOwner.includes('You'), `${name}: Holdings should default to the player owner`);
  assert.strictEqual(holdingsWindow.bodyVisible, true, `${name}: Holdings window body should be visible`);
  assert.strictEqual(holdingsWindow.controlShelfVisible, true, `${name}: Holdings controls should render in a visible shelf`);
  if (width <= 1024) {
    assert.strictEqual(holdingsWindow.controlsBelowBody, true, `${name}: mobile Holdings controls should sit below the scrollable body`);
    assert.strictEqual(holdingsWindow.tabsNearDialogBottom, true, `${name}: mobile Holdings tabs should stay near the dialog bottom safe area`);
  } else {
    assert.strictEqual(holdingsWindow.ownerAboveBody, true, `${name}: desktop Holdings owner selector should stay above the body`);
    assert.strictEqual(holdingsWindow.ownerAboveStatsSummary, true, `${name}: desktop Holdings owner selector should stay above the stats summary`);
  }
  assert.strictEqual(holdingsWindow.appClass, true, `${name}: Holdings window should mark the app shell while open`);
  assert.strictEqual(holdingsWindow.stageInert, true, `${name}: Holdings window should make the stage inert`);
  assert.strictEqual(holdingsWindow.focusTrapIsDialog, true, `${name}: Holdings window should activate its dialog focus trap`);
  assert.strictEqual(holdingsWindow.pageOverflow, false, `${name}: Holdings window should not create horizontal overflow`);

  await page.evaluate(() => App.setHoldingsTab('containers'));
  await page.waitForTimeout(50);
  const holdingsContainers = await page.evaluate(() => {
    const root = document.getElementById('holdings-window-root');
    const body = root?.querySelector('.holdings-window-body');
    const entries = Array.from(root?.querySelectorAll('.container-inventory-entry') || []);
    const consumedEntries = Array.from(root?.querySelectorAll('.container-inventory-entry[data-contained-list="consumed"]') || []);
    const activeEntries = entries.filter(entry => entry.getAttribute('data-contained-list') !== 'consumed');
    const releaseButtons = Array.from(root?.querySelectorAll('[data-command-control="release-contained"]') || []);
    const digestButtons = Array.from(root?.querySelectorAll('[data-command-control="digest-contained"]') || []);
    const inspectButtons = Array.from(root?.querySelectorAll('[data-command-control="inspect-contained"]') || []);
    const bodyRect = body?.getBoundingClientRect();
    return {
      text: body?.innerText || '',
      entryCount: entries.length,
      activeEntryCount: activeEntries.length,
      consumedEntryCount: consumedEntries.length,
      inspectCount: inspectButtons.length,
      releaseCount: releaseButtons.length,
      digestCount: digestButtons.length,
      consumedReleaseCount: consumedEntries.reduce((count, entry) => count + entry.querySelectorAll('[data-command-control="release-contained"]').length, 0),
      consumedDigestCount: consumedEntries.reduce((count, entry) => count + entry.querySelectorAll('[data-command-control="digest-contained"]').length, 0),
      releaseTitles: releaseButtons.map(button => button.getAttribute('title') || ''),
      digestTitles: digestButtons.map(button => button.getAttribute('title') || ''),
      bodyVisible: Boolean(bodyRect && bodyRect.width > 0 && bodyRect.height > 0),
      bodyInsideViewport: Boolean(bodyRect && bodyRect.left >= -1 && bodyRect.right <= innerWidth + 1 && bodyRect.top >= -1 && bodyRect.bottom <= innerHeight + 1),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert(holdingsContainers.text.includes('Held One') && holdingsContainers.text.includes('Terminal One'), `${name}: Holdings Containers tab should list contained creatures`);
  assert(holdingsContainers.text.includes('Vitality') && holdingsContainers.text.includes('Progress'), `${name}: Holdings Containers tab should expose vitality and digestion progress`);
  assert(holdingsContainers.entryCount >= 2, `${name}: Holdings Containers tab should render separate contained entries`);
  assert(holdingsContainers.inspectCount >= 2, `${name}: Holdings Containers tab should keep contained entries inspectable`);
  assert(holdingsContainers.activeEntryCount >= 1 && holdingsContainers.consumedEntryCount >= 1, `${name}: Holdings Containers tab should split active containment from consumed history`);
  assert(holdingsContainers.releaseCount >= 1 && holdingsContainers.digestCount >= 1, `${name}: active contained entries should expose release and digest controls`);
  assert(holdingsContainers.releaseTitles.every(Boolean) && holdingsContainers.digestTitles.every(Boolean), `${name}: Holdings container controls should keep accessible titles`);
  assert.strictEqual(holdingsContainers.consumedReleaseCount, 0, `${name}: consumed entries should not expose active Release controls`);
  assert.strictEqual(holdingsContainers.consumedDigestCount, 0, `${name}: consumed entries should not expose active Digest controls`);
  assert.strictEqual(holdingsContainers.bodyVisible, true, `${name}: Holdings Containers body should be visible`);
  assert.strictEqual(holdingsContainers.bodyInsideViewport, true, `${name}: Holdings Containers body should stay viewport-bounded`);
  assert.strictEqual(holdingsContainers.pageOverflow, false, `${name}: Holdings Containers tab should not create horizontal overflow`);

  await page.evaluate(() => {
    App.setHoldingsOwner('ally-1');
    App.setHoldingsTab('containers');
  });
  await page.waitForTimeout(50);
  const companionContainers = await page.evaluate(() => {
    const root = document.getElementById('holdings-window-root');
    const selectedOwner = root?.querySelector('[data-command-control="select-holdings-owner"][aria-pressed="true"]')?.textContent.trim() || '';
    const body = root?.querySelector('.holdings-window-body');
    return {
      selectedOwner,
      text: body?.innerText || '',
      releaseRoute: root?.querySelector('[data-command-control="release-contained"]')?.getAttribute('onclick') || '',
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert(companionContainers.selectedOwner.includes('Ally'), `${name}: Holdings owner switch should preserve selected companion`);
  assert(companionContainers.text.includes('Companion Held'), `${name}: Companion Containers tab should show companion-held creatures`);
  assert(companionContainers.releaseRoute.includes("App.releaseContained('party',1,'stomach',0)"), `${name}: Companion container actions should target the companion holder index`);
  assert.strictEqual(companionContainers.pageOverflow, false, `${name}: Companion container owner switch should not create overflow`);

  await page.evaluate(() => {
    App.setHoldingsOwner(App._holdingsOwnerId(App.player));
    App.setHoldingsTab('containers');
  });
  await page.waitForTimeout(50);

  await page.locator('#holdings-window-root [data-command-control="inspect-contained"]').first().click();
  await page.waitForTimeout(50);
  const containedDetail = await page.evaluate(() => {
    const root = document.getElementById('holdings-window-root');
    const title = root?.querySelector('#holdings-window-title');
    const close = root?.querySelector('.holdings-close[data-command-control="close-holdings"]');
    const back = root?.querySelector('[data-command-control="back-holdings"]');
    const release = root?.querySelector('[data-command-control="release-contained"]');
    const digest = root?.querySelector('[data-command-control="digest-contained"]');
    return {
      title: title?.textContent?.trim() || '',
      text: root?.innerText || '',
      closeText: close?.textContent?.trim() || '',
      closeTitle: close?.getAttribute('title') || '',
      backText: back?.textContent?.trim() || '',
      backTitle: back?.getAttribute('title') || '',
      releaseTitle: release?.getAttribute('title') || '',
      digestTitle: digest?.getAttribute('title') || '',
      appClass: document.getElementById('app')?.classList.contains('holdings-window-open') || false,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert(containedDetail.title.includes('Held One'), `${name}: contained Inspect should open the selected creature inside Holdings`);
  assert(containedDetail.text.includes('Vitality') && containedDetail.text.includes('Integrity'), `${name}: contained Inspect should show vitality, integrity, and release state`);
  assert.strictEqual(containedDetail.closeText, 'Close', `${name}: contained Inspect header exit should close the overlay rather than masquerading as Back`);
  assert.strictEqual(containedDetail.closeTitle, 'Close', `${name}: contained Inspect close control should keep an accessible title`);
  assert.strictEqual(containedDetail.backText, 'Back', `${name}: contained Inspect should expose an in-body Back control to return to Containers`);
  assert.strictEqual(containedDetail.backTitle, 'Back', `${name}: contained Inspect Back control should keep an accessible title`);
  assert(containedDetail.releaseTitle && containedDetail.digestTitle, `${name}: contained Inspect Release/Digest controls should keep accessible titles`);
  assert.strictEqual(containedDetail.appClass, true, `${name}: contained Inspect should stay inside the Holdings overlay state`);
  assert.strictEqual(containedDetail.pageOverflow, false, `${name}: contained Inspect should not create horizontal overflow`);

  await page.locator('#holdings-window-root [data-command-control="back-holdings"]').click();
  await page.waitForTimeout(50);
  const returnedContainers = await page.evaluate(() => {
    const root = document.getElementById('holdings-window-root');
    return {
      title: root?.querySelector('#holdings-window-title')?.textContent?.trim() || '',
      selectedTab: root?.querySelector('.holdings-tab.selected')?.getAttribute('data-command-slot') || '',
      hasContainerEntries: Boolean(root?.querySelector('.container-inventory-entry'))
    };
  });
  assert.strictEqual(returnedContainers.selectedTab, 'containers', `${name}: contained Inspect Back should return to the Containers tab`);
  assert.strictEqual(returnedContainers.hasContainerEntries, true, `${name}: contained Inspect Back should restore the container entry list`);

  await page.locator('#holdings-window-root .holdings-close[data-command-control="close-holdings"]').click();
  await page.waitForTimeout(50);
  const returnedHoldings = await page.evaluate(() => {
    const root = document.getElementById('holdings-window-root');
    const app = document.getElementById('app');
    const dock = document.querySelector('.mobile-panel-dock');
    const playSurface = document.getElementById('mobile-play-surface');
    const desktopSurface = document.querySelector('.desktop-play-surface');
    const activeSurface = innerWidth <= 1024 ? playSurface : desktopSurface;
    const surfaceRect = activeSurface?.getBoundingClientRect();
    return {
      hidden: Boolean(root?.hidden),
      appClass: app?.classList.contains('holdings-window-open') || false,
      stageInert: document.querySelector('#app > .stage')?.hasAttribute('inert') || false,
      focusTrapCleared: !App._focusTrap,
      dockVisible: Boolean(dock) && getComputedStyle(dock).display !== 'none' && dock.getBoundingClientRect().height > 0,
      surfaceVisible: Boolean(surfaceRect && surfaceRect.width > 0 && surfaceRect.height > 0),
      surfaceInsideViewport: !surfaceRect || (surfaceRect.left >= -1 && surfaceRect.right <= innerWidth + 1),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  assert.strictEqual(returnedHoldings.hidden, true, `${name}: closing Holdings should hide the window root`);
  assert.strictEqual(returnedHoldings.appClass, false, `${name}: closing Holdings should clear the app shell marker`);
  assert.strictEqual(returnedHoldings.stageInert, false, `${name}: closing Holdings should restore stage interactivity`);
  assert.strictEqual(returnedHoldings.focusTrapCleared, true, `${name}: closing Holdings should clear the focus trap`);
  if (width <= 1024) assert.strictEqual(returnedHoldings.dockVisible, true, `${name}: mobile dock should be visible after Holdings closes`);
  assert.strictEqual(returnedHoldings.surfaceVisible, true, `${name}: play surface should be visible after Holdings closes`);
  assert.strictEqual(returnedHoldings.surfaceInsideViewport, true, `${name}: play surface should stay horizontally bounded after Holdings closes`);
  assert.strictEqual(returnedHoldings.pageOverflow, false, `${name}: closing Holdings should not introduce horizontal overflow`);

  if (width <= 1024) {
    await page.evaluate(() => togglePanel('party'));
    await page.waitForTimeout(350);
    const party = await page.evaluate(() => {
      const panel = document.getElementById('panel-party');
      const panelRect = panel.getBoundingClientRect();
      const clippedButtons = Array.from(document.querySelectorAll('#party-content button')).filter(btn => {
        const r = btn.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.x < -1 || r.y < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1);
      }).map(btn => btn.textContent.trim());
      return {
        panelLeft: panelRect.left,
        panelRight: panelRect.right,
        viewportWidth: innerWidth,
        clippedButtons
      };
    });
    assert(party.panelLeft >= 0, `${name}: party panel should be inside viewport`);
    assert(party.panelRight <= party.viewportWidth + 1, `${name}: party panel should not extend beyond viewport`);
    assert.deepStrictEqual(party.clippedButtons, [], `${name}: party panel buttons should not clip`);
    const largeFontShell = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert(largeFontShell.scrollWidth <= largeFontShell.clientWidth + 1, `${name}: large font/high contrast mobile shell should not horizontally overflow`);
    await page.evaluate(() => App.closeAllPanels());

    await page.evaluate(() => {
      App.closeTutorial?.();
      App.returnToGame?.();
      App.closeAllPanels?.();
    });
    await page.locator('#app-menu-toggle').click();
    await page.waitForTimeout(50);
    const appMenu = await page.evaluate(() => {
      const menu = document.getElementById('app-menu');
      const toggle = document.getElementById('app-menu-toggle');
      const topNav = document.querySelector('.app-nav');
      const timeDisplay = document.getElementById('time-display');
      const rect = menu.getBoundingClientRect();
      const timeRect = timeDisplay.getBoundingClientRect();
      const style = getComputedStyle(menu);
      const visibleItems = Array.from(menu.querySelectorAll('button')).filter(btn => {
        const r = btn.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).map(btn => btn.textContent.trim());
      return {
        open: menu.classList.contains('open'),
        expanded: toggle.getAttribute('aria-expanded'),
        position: style.position,
        display: style.display,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        topNavDisplay: topNav ? getComputedStyle(topNav).display : '',
        timeDisplayVisible: Boolean(timeDisplay) && getComputedStyle(timeDisplay).display !== 'none' && timeRect.width > 0 && timeRect.height > 0,
        visibleItems
      };
    });
    assert.strictEqual(appMenu.open, true, `${name}: mobile brand button should open the app menu`);
    assert.strictEqual(appMenu.expanded, 'true', `${name}: mobile app menu toggle should expose expanded state`);
    assert.strictEqual(appMenu.position, 'fixed', `${name}: mobile app menu should escape the clipped header`);
    assert.notStrictEqual(appMenu.display, 'none', `${name}: mobile app menu should be visible after opening`);
    assert(appMenu.top >= 52, `${name}: mobile app menu should render below the header`);
    assert(appMenu.left >= -1 && appMenu.right <= appMenu.viewportWidth + 1, `${name}: mobile app menu should stay inside viewport horizontally`);
    assert(appMenu.bottom <= appMenu.viewportHeight + 1, `${name}: mobile app menu should stay inside viewport vertically`);
    assert(appMenu.visibleItems.some(label => label.includes('Save')), `${name}: mobile app menu should expose Save`);
    assert(appMenu.visibleItems.some(label => label.includes('Load')), `${name}: mobile app menu should expose Load`);
    assert.strictEqual(appMenu.topNavDisplay, 'none', `${name}: mobile header should hide duplicated desktop play shortcuts`);
    assert.strictEqual(appMenu.timeDisplayVisible, true, `${name}: mobile header should keep the time indicator visible`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);

    const mobileControls = await page.evaluate(() => {
      const dock = document.querySelector('.mobile-panel-dock');
      const appMenuToggle = document.getElementById('app-menu-toggle');
      const belt = document.getElementById('mobile-control-belt');
      const map = document.querySelector('.mobile-map-card');
      const tileInfo = document.getElementById('mobile-tile-info');
      const miniMap = document.getElementById('mobile-mini-map');
      const centerTile = document.querySelector('#mobile-mini-map .map-tile.center');
      const movementCells = Array.from(document.querySelectorAll('#mobile-mini-map .map-tile.moveable'));
      const centerPresenceButtons = Array.from(document.querySelectorAll('#mobile-mini-map .map-tile.center .mobile-play-presence-dot, #mobile-mini-map .map-tile.center .mobile-play-presence-more'));
      const sheet = document.querySelector('.mobile-scene-sheet');
      const storyLatest = document.getElementById('mobile-story-latest');
      const latestBeat = storyLatest?.querySelector('.scene-beat-stream-item.latest, .scene-beat-stream-empty') || storyLatest;
      const actions = document.getElementById('mobile-explore-actions');
      const unitStrips = document.querySelector('.mobile-unit-strips');
      const creatureCard = document.getElementById('mobile-creature-card');
      const creatureCue = document.getElementById('mobile-creature-presence-cue');
      const cueButton = creatureCue?.querySelector('button');
      const creatureTargetButtons = Array.from(document.querySelectorAll('#mobile-target-picker-belt [data-command-control="focus-target"].target-toggle, #mobile-target-picker-belt [data-command-control="focus-target"] .target-toggle, #mobile-creature-strip .target-toggle[data-command-control="focus-target"]'));
      const detailButtons = Array.from(document.querySelectorAll('.mobile-strip-details-btn'));
      const moveToggle = document.getElementById('mobile-move-toggle');
      const storyHandle = document.querySelector('.mobile-story-handle');
      const topStoryButton = document.querySelector('.mobile-scene-sheet .mobile-story-expand-btn');
      const tileDetailsButton = document.querySelector('.mobile-tile-details-btn');
      const dockButtons = Array.from(dock.querySelectorAll('.nav-btn'));
      const dockRect = dock.getBoundingClientRect();
      const beltRect = belt.getBoundingClientRect();
      const mapRect = map.getBoundingClientRect();
      const sheetRect = sheet.getBoundingClientRect();
      const storyLatestRect = storyLatest.getBoundingClientRect();
      const latestBeatRect = latestBeat.getBoundingClientRect();
      const storyHandleRect = storyHandle.getBoundingClientRect();
      const topStoryButtonRect = topStoryButton.getBoundingClientRect();
      const appMenuToggleRect = appMenuToggle.getBoundingClientRect();
      const tileDetailsButtonRect = tileDetailsButton.getBoundingClientRect();
      const dockButtonRects = dockButtons.map(button => button.getBoundingClientRect());
      const unitStripsRect = unitStrips.getBoundingClientRect();
      const creatureCardRect = creatureCard.getBoundingClientRect();
      const tileInfoRect = tileInfo.getBoundingClientRect();
      const miniMapRect = miniMap.getBoundingClientRect();
      const centerTileRect = centerTile.getBoundingClientRect();
      const movementCellRects = movementCells.map(cell => {
        const rect = cell.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
      const centerPresenceRects = centerPresenceButtons.map(button => {
        const rect = button.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          fontSize: parseFloat(getComputedStyle(button).fontSize) || 0
        };
      });
      const visibleCenterPresenceRects = centerPresenceRects.filter(rect => rect.width > 0 && rect.height > 0);
      const detailButtonRects = detailButtons.map(button => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          fontSize: parseFloat(style.fontSize) || 0,
          title: button.getAttribute('title') || '',
          ariaLabel: button.getAttribute('aria-label') || ''
        };
      });
      const creatureTargetButtonRects = creatureTargetButtons.map(button => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return {
          width: rect.width,
          height: rect.height,
          fontSize: parseFloat(style.fontSize) || 0,
          title: button.getAttribute('title') || '',
          ariaLabel: button.getAttribute('aria-label') || ''
        };
      });
      const visibleDetailButtonRects = detailButtonRects.filter(rect => rect.width > 0 && rect.height > 0);
      const cueRect = creatureCue.getBoundingClientRect();
      const moveToggleRect = moveToggle.getBoundingClientRect();
      const beltStyle = getComputedStyle(belt);
      const storyHandleStyle = getComputedStyle(storyHandle);
      const topStoryButtonStyle = getComputedStyle(topStoryButton);
      const overlapArea = (a, b) => {
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return x * y;
      };
      return {
        dockPosition: getComputedStyle(dock).position,
        dockTop: dockRect.top,
        dockBottom: dockRect.bottom,
        dockLeft: dockRect.left,
        dockRight: dockRect.right,
        appMenuToggleHeight: appMenuToggleRect.height,
        tileDetailsButtonVisible: tileDetailsButtonRect.width > 0 && tileDetailsButtonRect.height > 0,
        tileDetailsButtonHeight: tileDetailsButtonRect.height,
        minDockButtonHeight: Math.min(...dockButtonRects.map(rect => rect.height)),
        beltPosition: beltStyle.position,
        beltDisplay: beltStyle.display,
        beltTop: beltRect.top,
        beltBottom: beltRect.bottom,
        beltLeft: beltRect.left,
        beltRight: beltRect.right,
        beltCreatureOverlap: overlapArea(beltRect, creatureCardRect),
        beltUnitStripOverlap: overlapArea(beltRect, unitStripsRect),
        beltHasControls: belt.classList.contains('has-controls'),
        surfaceHasBeltPadding: document.getElementById('mobile-play-surface')?.classList.contains('has-control-belt') || false,
        mapHeight: mapRect.height,
        mapTop: mapRect.top,
        mapBottom: mapRect.bottom,
        mapContentContained: miniMapRect.bottom <= mapRect.bottom + 1,
        mapBeforeSceneFeed: mapRect.bottom <= storyLatestRect.top + 1,
        sheetHeight: sheetRect.height,
        sheetBottom: sheetRect.bottom,
        storyLatestTop: storyLatestRect.top,
        storyLatestBottom: storyLatestRect.bottom,
        storyLatestHeight: storyLatestRect.height,
        storyLatestBeltOverlap: overlapArea(storyLatestRect, beltRect),
        latestBeatTop: latestBeatRect.top,
        latestBeatBottom: latestBeatRect.bottom,
        latestBeatHeight: latestBeatRect.height,
        latestBeatBeltOverlap: overlapArea(latestBeatRect, beltRect),
        storyHandlePosition: storyHandleStyle.position,
        storyHandleDisplay: storyHandleStyle.display,
        storyHandleVisibility: storyHandleStyle.visibility,
        storyHandleTop: storyHandleRect.top,
        storyHandleRight: storyHandleRect.right,
        storyHandleBottom: storyHandleRect.bottom,
        storyHandleLeft: storyHandleRect.left,
        storyHandleWidth: storyHandleRect.width,
        storyHandleHeight: storyHandleRect.height,
        storyHandleMinHeight: parseFloat(storyHandleStyle.minHeight) || 0,
        storyHandleText: storyHandle?.innerText || '',
        topStoryButtonDisplay: topStoryButtonStyle.display,
        topStoryButtonHeight: topStoryButtonRect.height,
        topStoryButtonLatestBeatOverlap: overlapArea(topStoryButtonRect, latestBeatRect),
        miniMapBottom: miniMapRect.bottom,
        unitStripsTop: unitStripsRect.top,
        creatureCardTop: creatureCardRect.top,
        tileInfoBottom: tileInfoRect.bottom,
        miniMapTop: miniMapRect.top,
        miniMapWidth: miniMapRect.width,
        miniMapHeight: miniMapRect.height,
        centerTileWidth: centerTileRect.width,
        centerTileHeight: centerTileRect.height,
        movementCellCount: movementCellRects.length,
        minMovementCellWidth: Math.min(...movementCellRects.map(rect => rect.width)),
        minMovementCellHeight: Math.min(...movementCellRects.map(rect => rect.height)),
        movementCellsInsideMap: movementCellRects.every(rect => (
          rect.left >= miniMapRect.left - 1
          && rect.right <= miniMapRect.right + 1
          && rect.top >= miniMapRect.top - 1
          && rect.bottom <= miniMapRect.bottom + 1
        )),
        centerTileBottom: centerTileRect.bottom,
        centerPresenceInsideTile: visibleCenterPresenceRects.every(rect => (
          rect.left >= centerTileRect.left - 1
          && rect.right <= centerTileRect.right + 1
          && rect.top >= centerTileRect.top - 1
          && rect.bottom <= centerTileRect.bottom + 1
        )),
        centerPresenceCount: visibleCenterPresenceRects.length,
        minCenterPresenceWidth: Math.min(...visibleCenterPresenceRects.map(rect => rect.width)),
        minCenterPresenceHeight: Math.min(...visibleCenterPresenceRects.map(rect => rect.height)),
        minCenterPresenceFontSize: Math.min(...visibleCenterPresenceRects.map(rect => rect.fontSize)),
        detailButtonCount: detailButtonRects.length,
        visibleDetailButtonCount: visibleDetailButtonRects.length,
        minVisibleDetailButtonWidth: Math.min(...visibleDetailButtonRects.map(rect => rect.width)),
        minVisibleDetailButtonHeight: Math.min(...visibleDetailButtonRects.map(rect => rect.height)),
        maxVisibleDetailButtonWidth: Math.max(0, ...visibleDetailButtonRects.map(rect => rect.width)),
        maxVisibleDetailButtonHeight: Math.max(0, ...visibleDetailButtonRects.map(rect => rect.height)),
        maxVisibleDetailButtonFontSize: Math.max(0, ...visibleDetailButtonRects.map(rect => rect.fontSize)),
        visibleDetailButtonsAccessible: visibleDetailButtonRects.every(rect => rect.title && rect.ariaLabel),
        visibleDetailsInsideViewport: visibleDetailButtonRects.every(rect => rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
        visibleDetailsAboveDock: visibleDetailButtonRects.every(rect => rect.bottom <= dockRect.top + 1),
        creatureTargetButtonCount: creatureTargetButtonRects.length,
        maxCreatureTargetButtonWidth: Math.max(0, ...creatureTargetButtonRects.map(rect => rect.width)),
        maxCreatureTargetButtonHeight: Math.max(0, ...creatureTargetButtonRects.map(rect => rect.height)),
        maxCreatureTargetButtonFontSize: Math.max(0, ...creatureTargetButtonRects.map(rect => rect.fontSize)),
        creatureTargetButtonsAccessible: creatureTargetButtonRects.every(rect => rect.title && rect.ariaLabel),
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        locationActionsText: actions?.innerText || '',
        locationActionsInSheet: Boolean(sheet?.querySelector('#mobile-explore-actions')),
        sheetActionButtons: sheet ? sheet.querySelectorAll('.action-btn').length : 0,
        creatureCueText: creatureCue?.innerText || '',
        creatureCueVisible: Boolean(cueButton) && getComputedStyle(creatureCue).display !== 'none' && cueRect.width > 0 && cueRect.height > 0,
        creatureCueTop: cueRect.top,
        creatureCueBottom: cueRect.bottom,
        creatureCueButtonHeight: cueButton?.getBoundingClientRect().height || 0,
        creatureCueInSheet: Boolean(sheet?.querySelector('#mobile-creature-presence-cue')),
        moveToggleHidden: Boolean(moveToggle?.hidden),
        moveToggleHeight: moveToggleRect.height,
        moveExpanded: document.getElementById('mobile-move-pad')?.classList.contains('expanded') || false,
        controlBeltHasLocationActions: Boolean(belt?.querySelector('#mobile-explore-actions'))
      };
    });
    assert.strictEqual(mobileControls.dockPosition, 'fixed', `${name}: mobile dock should be fixed to the viewport`);
    assert(mobileControls.dockTop >= 0, `${name}: mobile dock should not clip above viewport`);
    assert(mobileControls.dockBottom <= mobileControls.viewportHeight + 1, `${name}: mobile dock should be visible without scrolling`);
    assert(mobileControls.dockLeft >= -1 && mobileControls.dockRight <= mobileControls.viewportWidth + 1, `${name}: mobile dock should stay inside viewport horizontally`);
    assert(mobileControls.appMenuToggleHeight >= 44, `${name}: mobile app-menu trigger should keep a finger-sized touch target`);
    if (mobileControls.tileDetailsButtonVisible) {
      assert(mobileControls.tileDetailsButtonHeight >= 44, `${name}: visible mobile tile details should keep a finger-sized touch target`);
    }
    assert(mobileControls.minDockButtonHeight >= 44, `${name}: mobile dock shortcuts should keep finger-sized touch targets`);
    assert.strictEqual(mobileControls.beltPosition, 'fixed', `${name}: mobile context belt should stay viewport-anchored above the fixed dock`);
    assert.notStrictEqual(mobileControls.beltDisplay, 'none', `${name}: populated mobile context belt should be visible`);
    assert.strictEqual(mobileControls.beltHasControls, true, `${name}: populated mobile context belt should mark real controls`);
    assert.strictEqual(mobileControls.surfaceHasBeltPadding, true, `${name}: mobile play surface should reserve dock space when the context belt is populated`);
    assert(mobileControls.beltLeft >= -1 && mobileControls.beltRight <= mobileControls.viewportWidth + 1, `${name}: mobile context belt should stay inside viewport horizontally`);
    assert(mobileControls.beltTop >= 0, `${name}: mobile context belt should not clip above viewport`);
    assert(mobileControls.sheetHeight >= 1, `${name}: mobile Scene Feed should participate in the stage flow`);
    assert(mobileControls.latestBeatHeight >= 1, `${name}: mobile latest Scene Beat should be visible without opening a sheet`);
    assert(
      mobileControls.latestBeatTop >= 0 && mobileControls.latestBeatTop < mobileControls.beltTop - 1,
      `${name}: mobile latest Scene Beat should start visibly above the sticky command belt (beatTop=${mobileControls.latestBeatTop}, beltTop=${mobileControls.beltTop}, sheetBottom=${mobileControls.sheetBottom})`
    );
    assert(mobileControls.mapBottom <= mobileControls.sheetBottom + 1, `${name}: mobile traversal stage should render before the inline Scene Feed`);
    assert.strictEqual(mobileControls.mapContentContained, true, `${name}: mobile 3x3 traversal grid should not be clipped by the traversal card`);
    assert.strictEqual(mobileControls.mapBeforeSceneFeed, true, `${name}: mobile Scene Feed should start after the traversal card, not overlap the map`);
    assert.notStrictEqual(mobileControls.topStoryButtonDisplay, 'none', `${name}: compact story capsule button should be visible on mobile`);
    assert(mobileControls.topStoryButtonHeight >= 44, `${name}: compact Scene Feed button should keep a finger-sized touch target`);
    assert.strictEqual(mobileControls.topStoryButtonLatestBeatOverlap, 0, `${name}: compact Scene Feed button should reserve space instead of overlapping the latest narrative`);
    assert.strictEqual(mobileControls.storyHandleDisplay, 'none', `${name}: retired floating story handle should not occupy the mobile action zone`);
    assert(/scene|feed|story/i.test(mobileControls.storyHandleText), `${name}: retained mobile scene feed handle markup should stay labeled accessibly`);
    assert(mobileControls.mapHeight <= Math.min(350, mobileControls.viewportHeight * 0.5) + 1, `${name}: mobile traversal map frame should not absorb short viewport height`);
    assert(mobileControls.mapBottom <= mobileControls.beltTop + 1, `${name}: mobile traversal map should stay above the fixed command belt`);
    assert(mobileControls.miniMapBottom <= mobileControls.mapBottom + 1, `${name}: mobile traversal grid should fit inside the Play Surface card`);
    assert(mobileControls.latestBeatTop < mobileControls.beltTop - 1, `${name}: mobile latest Scene Beat preview should stay above the sticky command belt`);
    assert(mobileControls.miniMapTop - mobileControls.tileInfoBottom >= 6, `${name}: mobile tile metadata should not overlap the traversal grid`);
    assert(mobileControls.miniMapHeight >= Math.min(204, mobileControls.viewportHeight * 0.3), `${name}: mobile traversal grid should keep a usable minimum height`);
    assert.strictEqual(mobileControls.movementCellCount, 4, `${name}: mobile traversal grid should expose four cardinal movement cells`);
    assert(mobileControls.minMovementCellWidth >= 44 && mobileControls.minMovementCellHeight >= 44, `${name}: mobile movement cells should keep finger-sized tap targets`);
    assert.strictEqual(mobileControls.movementCellsInsideMap, true, `${name}: mobile movement cells should stay inside the traversal grid`);
    assert(Math.abs(mobileControls.miniMapWidth - mobileControls.miniMapHeight) <= 2, `${name}: mobile traversal grid should preserve a square footprint`);
    assert(Math.abs(mobileControls.centerTileWidth - mobileControls.centerTileHeight) <= 2, `${name}: mobile current tile should be square`);
    assert(Math.abs(mobileControls.centerTileWidth - mobileControls.minMovementCellWidth) <= 2, `${name}: mobile current tile should use the same width as movement tiles`);
    assert(Math.abs(mobileControls.centerTileHeight - mobileControls.minMovementCellHeight) <= 2, `${name}: mobile current tile should use the same height as movement tiles`);
    assert(mobileControls.centerPresenceCount >= 1, `${name}: mobile current tile should expose clickable presence badges`);
    assert(mobileControls.centerPresenceCount <= 2, `${name}: mobile current tile should summarize dense presence instead of wrapping controls out of the tile`);
    assert(mobileControls.minCenterPresenceWidth >= 44 && mobileControls.minCenterPresenceHeight >= 44, `${name}: mobile current tile presence badges should keep finger-sized touch targets inside the square tile`);
    assert(mobileControls.minCenterPresenceFontSize >= 20, `${name}: mobile current tile presence badges should keep readable compact symbols`);
    assert.strictEqual(
      mobileControls.centerPresenceInsideTile,
      true,
      `${name}: mobile current tile presence badges should stay inside the center tile (cell=${mobileControls.centerTileWidth}x${mobileControls.centerTileHeight}, presence=${mobileControls.minCenterPresenceWidth}x${mobileControls.minCenterPresenceHeight})`
    );
    assert(mobileControls.centerTileBottom <= mobileControls.mapBottom + 1, `${name}: mobile current tile should not clip below the Play Surface card`);
    assert(mobileControls.detailButtonCount >= 2, `${name}: mobile party and creature rails should expose explicit Details routes`);
    if (mobileControls.visibleDetailButtonCount > 0) {
      assert(mobileControls.minVisibleDetailButtonWidth >= 40 && mobileControls.minVisibleDetailButtonHeight >= 40, `${name}: visible mobile rail Details routes should keep usable icon tap targets`);
      assert(mobileControls.maxVisibleDetailButtonWidth <= 48 && mobileControls.maxVisibleDetailButtonHeight <= 48, `${name}: visible mobile rail Details routes should stay compact and icon-sized`);
      assert.strictEqual(mobileControls.maxVisibleDetailButtonFontSize, 0, `${name}: visible mobile rail Details routes should hide visible text labels`);
      assert.strictEqual(mobileControls.visibleDetailButtonsAccessible, true, `${name}: icon-only mobile rail Details routes should keep title and aria-label text`);
      assert.strictEqual(mobileControls.visibleDetailsInsideViewport, true, `${name}: visible mobile rail Details routes should stay inside the viewport`);
      assert.strictEqual(mobileControls.visibleDetailsAboveDock, true, `${name}: visible mobile rail Details routes should stay above the fixed dock`);
    }
    if (mobileControls.creatureTargetButtonCount > 0) {
      assert(mobileControls.maxCreatureTargetButtonWidth <= 44 && mobileControls.maxCreatureTargetButtonHeight <= 44, `${name}: mobile creature target toggles should stay compact and icon-sized while preserving touch area`);
      assert.strictEqual(mobileControls.maxCreatureTargetButtonFontSize, 0, `${name}: mobile creature target toggles should hide visible text labels`);
      assert.strictEqual(mobileControls.creatureTargetButtonsAccessible, true, `${name}: icon-only mobile creature target toggles should keep title and aria-label text`);
    }
    assert(mobileControls.controlBeltHasLocationActions, `${name}: location actions should live in the control belt`);
    assert(mobileControls.locationActionsText.includes('Items'), `${name}: location action row should expose tile-local actions in the control belt`);
    assert.strictEqual(mobileControls.locationActionsInSheet, false, `${name}: presentation sheet should not contain location actions`);
    assert.strictEqual(mobileControls.sheetActionButtons, 0, `${name}: presentation sheet should not contain duplicated full action controls`);
    assert.strictEqual(mobileControls.creatureCueVisible, true, `${name}: baseline mobile play should expose a creature cue without opening the full target rail`);
    assert(mobileControls.creatureCueButtonHeight >= 44, `${name}: baseline mobile creature cue should keep a finger-sized touch target`);
    assert(mobileControls.creatureCueText.includes('Here:'), `${name}: baseline mobile creature cue should summarize the first visible creature`);
    assert.strictEqual(mobileControls.creatureCueInSheet, false, `${name}: mobile creature cue should not reintroduce a HERE block into the presentation sheet`);
    const hingeDelta = (before, after) => Math.abs(Number(before) - Number(after));
    const assertStableMobileMapHinge = (state) => {
      assert(
        hingeDelta(mobileControls.mapTop, state.mapTop) <= 2,
        `${name}: mobile hinge should keep the map top stable when ${state.label} appears`
      );
      assert(
        hingeDelta(mobileControls.mapBottom, state.mapBottom) <= 2,
        `${name}: mobile hinge should keep the map bottom stable when ${state.label} appears`
      );
    };
    const locationActionHinge = await page.evaluate(() => {
      const tile = App.getTile?.(App.location?.x || 0, App.location?.y || 0);
      const previousItems = tile && Array.isArray(tile.items) ? [...tile.items] : null;
      if (tile) tile.items = [{ id: 'hinge-herb', name: 'Hinge Herb' }];
      App.renderMap?.();
      App.renderExplorationActions?.();
      App.renderMobileExplorationControls?.();
      const mapRect = document.querySelector('.mobile-map-card').getBoundingClientRect();
      const actions = document.getElementById('mobile-explore-actions');
      const result = {
        label: 'location actions',
        mapTop: mapRect.top,
        mapBottom: mapRect.bottom,
        hasLocationAction: /Items|Take/.test(actions?.innerText || '')
      };
      if (tile) tile.items = previousItems || [];
      App.renderMap?.();
      App.renderExplorationActions?.();
      App.renderMobileExplorationControls?.();
      return result;
    });
    assert.strictEqual(locationActionHinge.hasLocationAction, true, `${name}: fixture should expose a location action while checking mobile hinge stability`);
    assertStableMobileMapHinge(locationActionHinge);
    const closedCreatureCue = await page.evaluate(() => {
      App.mobileCreatureRailOpen = false;
      App.mobileTargetPickerOpen = false;
      App.renderCreatures();
      App.renderMobileExplorationControls?.();
      const dock = document.querySelector('.mobile-panel-dock');
      const cue = document.getElementById('mobile-creature-presence-cue');
      const cueButton = cue?.querySelector('button');
      const cueRect = cue.getBoundingClientRect();
      const dockRect = dock.getBoundingClientRect();
      const visible = Boolean(cueButton) && getComputedStyle(cue).display !== 'none' && cueRect.width > 0 && cueRect.height > 0;
      const result = {
        text: cue?.innerText || '',
        visible,
        top: cueRect.top,
        bottom: cueRect.bottom,
        dockTop: dockRect.top
      };
      App.mobileCreatureRailOpen = false;
      App.mobileTargetPickerOpen = false;
      App.renderCreatures();
      App.renderMobileExplorationControls?.();
      return result;
    });
    assert.strictEqual(closedCreatureCue.visible, true, `${name}: closed compact creature rail should expose a visible mobile creature cue without scrolling`);
    assert(closedCreatureCue.text.includes('Here:'), `${name}: mobile creature cue should summarize the first visible creature when the rail is closed`);
    assert(closedCreatureCue.top >= 0, `${name}: mobile creature cue should not start above the viewport`);
    assert(closedCreatureCue.bottom <= closedCreatureCue.dockTop + 1, `${name}: mobile creature cue should stay above the fixed dock`);
    const openedTargetPicker = await page.evaluate(() => {
      App.focusMobileTargetPicker?.();
      const dock = document.querySelector('.mobile-panel-dock');
      const cue = document.getElementById('mobile-creature-presence-cue');
      const picker = document.getElementById('mobile-target-picker-belt');
      const belt = document.getElementById('mobile-control-belt');
      const cueButton = cue?.querySelector('button');
      const cueRect = cue.getBoundingClientRect();
      const dockRect = dock.getBoundingClientRect();
      const beltRect = belt.getBoundingClientRect();
      const pickerRect = picker.getBoundingClientRect();
      const mapRect = document.querySelector('.mobile-map-card').getBoundingClientRect();
      const detailButtons = Array.from(document.querySelectorAll('#mobile-target-picker-belt .mobile-strip-details-btn'));
      const detailRects = detailButtons.map(button => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return {
          width: rect.width,
          height: rect.height,
          fontSize: parseFloat(style.fontSize) || 0,
          bottom: rect.bottom,
          title: button.getAttribute('title') || '',
          ariaLabel: button.getAttribute('aria-label') || ''
        };
      }).filter(rect => rect.width > 0 && rect.height > 0);
      const targetButtons = Array.from(document.querySelectorAll('#mobile-target-picker-belt [data-command-control="focus-target"].target-toggle, #mobile-target-picker-belt [data-command-control="focus-target"] .target-toggle')).map(button => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return {
          width: rect.width,
          height: rect.height,
          fontSize: parseFloat(style.fontSize) || 0,
          title: button.getAttribute('title') || button.closest('button')?.getAttribute('title') || '',
          ariaLabel: button.getAttribute('aria-label') || button.closest('button')?.getAttribute('aria-label') || ''
        };
      }).filter(rect => rect.width > 0 && rect.height > 0);
      const targetChipRects = Array.from(document.querySelectorAll('#mobile-target-picker-belt .mobile-target-picker-chip')).map(chip => {
        const rect = chip.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        };
      }).filter(rect => rect.width > 0 && rect.height > 0);
      const result = {
        label: 'target picker',
        pickerOpen: App.mobileTargetPickerOpen,
        pickerVisible: Boolean(picker && getComputedStyle(picker).display !== 'none' && picker.getBoundingClientRect().height > 0),
        mapTop: mapRect.top,
        mapBottom: mapRect.bottom,
        beltAboveDock: beltRect.bottom <= dockRect.top + 1,
        pickerAboveDock: pickerRect.bottom <= dockRect.top + 1,
        pickerInsideBelt: pickerRect.top >= beltRect.top - 1 && pickerRect.bottom <= beltRect.bottom + 1,
        targetChipCount: targetChipRects.length,
        targetChipsAboveDock: targetChipRects.every(rect => rect.bottom <= dockRect.top + 1),
        targetChipsInsideBelt: targetChipRects.every(rect => rect.top >= beltRect.top - 1 && rect.bottom <= beltRect.bottom + 1),
        beltScrollHeight: belt.scrollHeight,
        beltClientHeight: belt.clientHeight,
        cueVisible: Boolean(cueButton) && getComputedStyle(cue).display !== 'none' && cueRect.width > 0 && cueRect.height > 0,
        detailCount: detailRects.length,
        minDetailWidth: Math.min(...detailRects.map(rect => rect.width)),
        minDetailHeight: Math.min(...detailRects.map(rect => rect.height)),
        maxDetailWidth: Math.max(0, ...detailRects.map(rect => rect.width)),
        maxDetailHeight: Math.max(0, ...detailRects.map(rect => rect.height)),
        maxDetailFontSize: Math.max(0, ...detailRects.map(rect => rect.fontSize)),
        detailsAccessible: detailRects.every(rect => rect.title && rect.ariaLabel),
        detailsAboveDock: detailRects.every(rect => rect.bottom <= dockRect.top + 1),
        targetButtonCount: targetButtons.length,
        maxTargetButtonWidth: Math.max(0, ...targetButtons.map(rect => rect.width)),
        maxTargetButtonHeight: Math.max(0, ...targetButtons.map(rect => rect.height)),
        maxTargetButtonFontSize: Math.max(0, ...targetButtons.map(rect => rect.fontSize)),
        targetButtonsAccessible: targetButtons.every(rect => rect.title && rect.ariaLabel)
      };
      App.mobileTargetPickerOpen = false;
      App.renderMobileExplorationControls?.();
      return result;
    });
    assert.strictEqual(openedTargetPicker.pickerOpen, true, `${name}: Target slot should open the lightweight target picker`);
    assert.strictEqual(openedTargetPicker.pickerVisible, true, `${name}: open target picker should be visible`);
    assert.strictEqual(openedTargetPicker.beltAboveDock, true, `${name}: open target picker belt should stay above the fixed dock`);
    assert.strictEqual(openedTargetPicker.pickerAboveDock, true, `${name}: open target picker should stay above the fixed dock`);
    assert.strictEqual(openedTargetPicker.pickerInsideBelt, true, `${name}: open target picker should fit inside the fixed command belt`);
    assert.strictEqual(openedTargetPicker.cueVisible, false, `${name}: open target picker should suppress the duplicate mobile creature cue`);
    assert(openedTargetPicker.detailCount >= 1, `${name}: open target picker should expose an explicit Details route`);
    assert(openedTargetPicker.minDetailWidth >= 40 && openedTargetPicker.minDetailHeight >= 40, `${name}: target picker Details route should keep a usable icon tap target`);
    assert(openedTargetPicker.maxDetailWidth <= 48 && openedTargetPicker.maxDetailHeight <= 48, `${name}: target picker Details route should stay compact and icon-sized`);
    assert.strictEqual(openedTargetPicker.maxDetailFontSize, 0, `${name}: target picker Details route should hide visible text labels`);
    assert.strictEqual(openedTargetPicker.detailsAccessible, true, `${name}: target picker Details route should keep title and aria-label text`);
    assert.strictEqual(openedTargetPicker.detailsAboveDock, true, `${name}: target picker Details route should stay above the fixed dock`);
    assert(openedTargetPicker.targetButtonCount >= 1, `${name}: open target picker should expose compact target toggle controls`);
    assert(openedTargetPicker.targetChipCount >= 2, `${name}: open target picker should expose target and utility chips`);
    assert.strictEqual(openedTargetPicker.targetChipsAboveDock, true, `${name}: open target picker chips should stay fully above the fixed dock`);
    assert.strictEqual(openedTargetPicker.targetChipsInsideBelt, true, `${name}: open target picker chips should fit inside the fixed command belt`);
    assertStableMobileMapHinge(openedTargetPicker);
    assert(openedTargetPicker.beltScrollHeight <= openedTargetPicker.beltClientHeight + 1, `${name}: open target picker should not require internal belt scrolling`);
    assert(openedTargetPicker.maxTargetButtonWidth <= 44 && openedTargetPicker.maxTargetButtonHeight <= 44, `${name}: target picker toggles should stay compact and icon-sized while preserving touch area`);
    assert.strictEqual(openedTargetPicker.maxTargetButtonFontSize, 0, `${name}: target picker toggles should hide visible text labels`);
    assert.strictEqual(openedTargetPicker.targetButtonsAccessible, true, `${name}: icon-only target picker toggles should keep title and aria-label text`);
    await page.evaluate(() => {
      App.mobileActorBeltOpen = false;
      App.mobileTargetPickerOpen = false;
      App.renderMobileExplorationControls?.();
      App.toggleMobileActorBelt?.();
    });
    await page.waitForTimeout(80);
    const openedActorPicker = await page.evaluate(() => {
      const dock = document.querySelector('.mobile-panel-dock');
      const belt = document.getElementById('mobile-control-belt');
      const actorBelt = document.getElementById('mobile-actor-belt');
      const map = document.querySelector('.mobile-map-card');
      const dockRect = dock.getBoundingClientRect();
      const beltRect = belt.getBoundingClientRect();
      const actorBeltRect = actorBelt.getBoundingClientRect();
      const mapRect = map.getBoundingClientRect();
      const detailsChip = actorBelt.querySelector('.mobile-actor-details.mobile-strip-details-btn');
      const detailsRect = detailsChip?.getBoundingClientRect();
      const microChips = Array.from(actorBelt.querySelectorAll('.mobile-unit-chip.micro-tactical-card')).map(chip => chip.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
      const chips = Array.from(actorBelt.querySelectorAll('.mobile-actor-chip, .mobile-unit-chip, .compact-tactical-card')).map(chip => {
        const rect = chip.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height
        };
      }).filter(rect => rect.width > 0 && rect.height > 0);
      const centerY = rect => rect.top + rect.height / 2;
      const detailsCenter = detailsRect ? centerY(detailsRect) : 0;
      const microCenters = microChips.map(centerY);
      const microHeights = microChips.map(rect => rect.height);
      return {
        label: 'actor picker',
        actorBeltOpen: Boolean(App.mobileActorBeltOpen),
        beltHasControls: belt.classList.contains('has-controls'),
        beltActorClass: belt.classList.contains('actor-controls-open'),
        surfaceActorClass: document.getElementById('mobile-play-surface')?.classList.contains('actor-controls-open') || false,
        beltAboveDock: beltRect.bottom <= dockRect.top + 1,
        actorBeltVisible: getComputedStyle(actorBelt).display !== 'none' && actorBeltRect.width > 0 && actorBeltRect.height > 0,
        actorBeltAboveDock: actorBeltRect.bottom <= dockRect.top + 1,
        actorBeltInsideBelt: actorBeltRect.top >= beltRect.top - 1 && actorBeltRect.bottom <= beltRect.bottom + 1,
        actorChipCount: chips.length,
        actorRailVisualBand: actorBeltRect.height,
        detailsChipHeight: detailsRect?.height || 0,
        microChipMinHeight: microHeights.length ? Math.min(...microHeights) : 0,
        microChipMaxHeight: microHeights.length ? Math.max(...microHeights) : 0,
        detailsAlignedWithMicroCards: Boolean(detailsRect && microCenters.length && microCenters.every(value => Math.abs(value - detailsCenter) <= 1.5)),
        actorChipsAboveDock: chips.every(rect => rect.bottom <= dockRect.top + 1),
        actorChipsInsideBelt: chips.every(rect => rect.top >= beltRect.top - 1 && rect.bottom <= beltRect.bottom + 1),
        beltScrollHeight: belt.scrollHeight,
        beltClientHeight: belt.clientHeight,
        mapTop: mapRect.top,
        mapBottom: mapRect.bottom
      };
    });
    assert.strictEqual(openedActorPicker.actorBeltOpen, true, `${name}: Actor slot should open the lightweight actor picker`);
    assert.strictEqual(openedActorPicker.beltHasControls, true, `${name}: open actor picker should populate the command belt`);
    assert.strictEqual(openedActorPicker.beltActorClass, true, `${name}: open actor picker should set actor-controls-open on the command belt`);
    assert.strictEqual(openedActorPicker.surfaceActorClass, true, `${name}: open actor picker should set actor-controls-open on the play surface`);
    assert.strictEqual(openedActorPicker.beltAboveDock, true, `${name}: open actor picker belt should stay above the fixed dock`);
    assert.strictEqual(openedActorPicker.actorBeltVisible, true, `${name}: open actor picker should be visible`);
    assert.strictEqual(openedActorPicker.actorBeltAboveDock, true, `${name}: open actor picker should stay fully above the fixed dock`);
    assert.strictEqual(openedActorPicker.actorBeltInsideBelt, true, `${name}: open actor picker should fit inside the fixed command belt`);
    assert(openedActorPicker.actorChipCount >= 3, `${name}: open actor picker should expose exit, actors, and details chips`);
    assert(openedActorPicker.actorRailVisualBand >= 54, `${name}: open actor picker should reserve enough vertical rail band for card borders and selected glow`);
    assert(openedActorPicker.detailsChipHeight >= 49 && openedActorPicker.detailsChipHeight <= 51, `${name}: actor picker Details/menu chip should match compact card height`);
    assert(openedActorPicker.microChipMinHeight >= 49 && openedActorPicker.microChipMaxHeight <= 51, `${name}: actor picker micro cards should share a stable compact height`);
    assert.strictEqual(openedActorPicker.detailsAlignedWithMicroCards, true, `${name}: actor picker Details/menu chip should align with party micro cards`);
    assert.strictEqual(openedActorPicker.actorChipsAboveDock, true, `${name}: open actor picker chips should stay fully above the fixed dock`);
    assert.strictEqual(openedActorPicker.actorChipsInsideBelt, true, `${name}: open actor picker chips should fit inside the fixed command belt`);
    assert(openedActorPicker.beltScrollHeight <= openedActorPicker.beltClientHeight + 1, `${name}: open actor picker should not require internal belt scrolling`);
    assertStableMobileMapHinge(openedActorPicker);
    await page.evaluate(() => {
      App.mobileActorBeltOpen = false;
      App.renderMobileExplorationControls?.();
    });
    assert.strictEqual(mobileControls.moveToggleHidden, true, `${name}: dormant move toggle should be hidden while map traversal is primary`);
    assert.strictEqual(mobileControls.moveToggleHeight, 0, `${name}: hidden move toggle should not consume vertical space`);
    assert.strictEqual(mobileControls.moveExpanded, false, `${name}: move pad should start collapsed`);

    const openHistoryDrawer = await page.evaluate(() => {
      const dock = document.querySelector('.mobile-panel-dock');
      const log = document.getElementById('mobile-activity-log');
      const sheet = document.querySelector('.mobile-scene-sheet');
      log.open = true;
      const dockRect = dock.getBoundingClientRect();
      const logRect = log.getBoundingClientRect();
      const sheetRect = sheet.getBoundingClientRect();
      return {
        position: getComputedStyle(log).position,
        top: logRect.top,
        right: logRect.right,
        bottom: logRect.bottom,
        left: logRect.left,
        height: logRect.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        dockTop: dockRect.top,
        sheetHeightWhileOpen: sheetRect.height
      };
    });
    assert.strictEqual(openHistoryDrawer.position, 'fixed', `${name}: open mobile activity log should become an opt-in history drawer overlay`);
    assert(openHistoryDrawer.left >= -1 && openHistoryDrawer.right <= openHistoryDrawer.viewportWidth + 1, `${name}: open mobile activity log should stay inside viewport horizontally`);
    assert(openHistoryDrawer.top >= -1 && openHistoryDrawer.bottom <= openHistoryDrawer.viewportHeight + 1, `${name}: open mobile activity log should stay inside viewport vertically`);
    assert(openHistoryDrawer.bottom <= openHistoryDrawer.dockTop + 1, `${name}: open mobile activity log should stay above the fixed dock`);
    assert(openHistoryDrawer.sheetHeightWhileOpen >= 1, `${name}: opening mobile history should leave the inline Scene Feed in normal stage flow`);
    await page.evaluate(() => {
      document.getElementById('mobile-activity-log').open = false;
    });

    const toastLayout = await page.evaluate(() => {
      App.clearToasts?.();
      App.showToast?.({ text: 'Quest updated', type: 'quest', importance: 'major', dedupeKey: 'viewport-toast' });
      const stack = document.getElementById('toast-stack');
      const toast = stack?.querySelector('.toast');
      const dock = document.querySelector('.mobile-panel-dock');
      const header = document.querySelector('.app-header');
      const log = document.querySelector('.panel-log');
      const root = document.getElementById('app');
      const beforeExpanded = root.classList.contains('log-expanded');
      const rect = toast?.getBoundingClientRect();
      const stackRect = stack?.getBoundingClientRect();
      const dockRect = dock?.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      const logRect = log?.getBoundingClientRect();
      let expanded = null;
      if (innerWidth >= 700) {
        if (!beforeExpanded) App.toggleLogExpanded();
        const stage = document.querySelector('.stage')?.getBoundingClientRect();
        const expandedLog = document.querySelector('.panel-log')?.getBoundingClientRect();
        const expandedToast = document.querySelector('#toast-stack .toast')?.getBoundingClientRect();
        expanded = {
          stageHeight: stage?.height || 0,
          logHeight: expandedLog?.height || 0,
          toastBottom: expandedToast?.bottom || 0,
          logTop: expandedLog?.top || 0
        };
        if (!beforeExpanded) App.toggleLogExpanded();
      }
      App.clearToasts?.();
      return {
        exists: Boolean(toast),
        hidden: Boolean(stack?.hidden),
        left: rect?.left || 0,
        right: rect?.right || 0,
        top: rect?.top || 0,
        bottom: rect?.bottom || 0,
        stackPosition: stack ? getComputedStyle(stack).position : '',
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        dockTop: dockRect?.top || innerHeight,
        headerBottom: headerRect?.bottom || 0,
        logTop: logRect?.top || innerHeight,
        stackWidth: stackRect?.width || 0,
        expanded
      };
    });
    assert.strictEqual(toastLayout.exists, true, `${name}: toast API should render a visible toast`);
    assert.strictEqual(toastLayout.stackPosition, 'fixed', `${name}: toast stack should be fixed to the viewport`);
    assert(toastLayout.left >= -1 && toastLayout.right <= toastLayout.viewportWidth + 1, `${name}: toast should stay inside viewport horizontally`);
    assert(toastLayout.top >= -1 && toastLayout.bottom <= toastLayout.viewportHeight + 1, `${name}: toast should stay inside viewport vertically`);
    if (width <= 1024) {
      assert(toastLayout.top >= toastLayout.headerBottom - 1, `${name}: mobile toast should appear below the app header`);
      assert(toastLayout.top < toastLayout.viewportHeight / 3, `${name}: mobile toast should stay in the top notification region`);
      assert(toastLayout.bottom < toastLayout.dockTop, `${name}: mobile toast should not cover the fixed interaction dock`);
    } else {
      assert(toastLayout.bottom <= toastLayout.logTop + 1, `${name}: desktop toast should stay above the Activity Log`);
      assert(toastLayout.expanded.stageHeight >= 220, `${name}: expanded desktop log should leave a usable play surface`);
      assert(toastLayout.expanded.logHeight <= Math.max(300, toastLayout.viewportHeight * 0.34), `${name}: expanded desktop log should stay bounded`);
      assert(toastLayout.expanded.toastBottom <= toastLayout.expanded.logTop + 1, `${name}: toast should track expanded desktop log top`);
    }

    const openStorySheet = await page.evaluate(() => {
      App.emitStoryResult({
        actors: [App.player],
        targets: [App.creatures?.[0]],
        intent: 'Talk'
      }, 'You and Bunnyfolk exchange a tense look.', {
        summary: 'You and Bunnyfolk exchange a tense look.',
        passage: 'Bunnyfolk studies the camp while you hold position.'
      });
      App.openStorySheet();
      const appRoot = document.getElementById('app');
      const sheet = document.getElementById('story-sheet');
      const windowEl = sheet?.querySelector('.story-sheet-window');
      const close = sheet?.querySelector('[data-command-control="close-story-sheet"]');
      const header = document.querySelector('#app > .app-header');
      const main = document.querySelector('#app .panel-main');
      const handle = document.querySelector('.mobile-story-handle');
      const sheetRect = sheet.getBoundingClientRect();
      const windowRect = windowEl.getBoundingClientRect();
      const closeRect = close.getBoundingClientRect();
      const handleStyle = getComputedStyle(handle);
      const storyText = document.getElementById('story-sheet-list')?.innerText || '';
      const opened = {
        appOpenClass: appRoot.classList.contains('story-sheet-open'),
        hidden: sheet.hidden,
        ariaHidden: sheet.getAttribute('aria-hidden'),
        sheetLeft: sheetRect.left,
        sheetRight: sheetRect.right,
        sheetTop: sheetRect.top,
        sheetBottom: sheetRect.bottom,
        windowBottom: windowRect.bottom,
        windowHeight: windowRect.height,
        closeVisible: closeRect.width >= 32 && closeRect.height >= 32,
        headerInert: header?.hasAttribute('inert') || false,
        mainInert: main?.hasAttribute('inert') || false,
        handleVisibility: handleStyle.visibility,
        handlePointerEvents: handleStyle.pointerEvents,
        storyText,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight
      };
      App.closeStorySheet();
      opened.closedHidden = sheet.hidden;
      opened.closedAriaHidden = sheet.getAttribute('aria-hidden');
      opened.headerInertAfterClose = header?.hasAttribute('inert') || false;
      opened.mainInertAfterClose = main?.hasAttribute('inert') || false;
      opened.appOpenClassAfterClose = appRoot.classList.contains('story-sheet-open');
      return opened;
    });
    assert.strictEqual(openStorySheet.hidden, false, `${name}: mobile story sheet should open from the inline scene feed access path`);
    assert.strictEqual(openStorySheet.ariaHidden, 'false', `${name}: open mobile story sheet should expose dialog semantics`);
    assert.strictEqual(openStorySheet.appOpenClass, true, `${name}: open mobile story sheet should mark root state`);
    assert(openStorySheet.sheetLeft >= -1 && openStorySheet.sheetRight <= openStorySheet.viewportWidth + 1, `${name}: mobile story sheet should stay inside viewport horizontally`);
    assert(openStorySheet.sheetTop >= -1 && openStorySheet.sheetBottom <= openStorySheet.viewportHeight + 1, `${name}: mobile story sheet should stay inside viewport vertically`);
    assert(openStorySheet.windowHeight <= openStorySheet.viewportHeight * 0.7 + 8, `${name}: mobile story sheet should remain a bounded bottom sheet`);
    assert(openStorySheet.windowBottom <= openStorySheet.viewportHeight + 1, `${name}: mobile story window should not run under the viewport`);
    assert.strictEqual(openStorySheet.closeVisible, true, `${name}: mobile story sheet should keep Close visible`);
    assert.strictEqual(openStorySheet.headerInert, true, `${name}: mobile story sheet should make header inert behind the dialog`);
    assert.strictEqual(openStorySheet.mainInert, true, `${name}: mobile story sheet should make play surface inert behind the dialog`);
    assert.strictEqual(openStorySheet.handleVisibility, 'hidden', `${name}: mobile story handle should hide while the sheet is open`);
    assert.strictEqual(openStorySheet.handlePointerEvents, 'none', `${name}: mobile story handle should be inert while the sheet is open`);
    assert(openStorySheet.storyText.includes('Bunnyfolk studies'), `${name}: mobile story sheet should show recent story events`);
    assert.strictEqual(openStorySheet.closedHidden, true, `${name}: closing mobile story sheet should hide it again`);
    assert.strictEqual(openStorySheet.closedAriaHidden, 'true', `${name}: closed mobile story sheet should restore hidden semantics`);
    assert.strictEqual(openStorySheet.headerInertAfterClose, false, `${name}: closing mobile story sheet should restore header interaction`);
    assert.strictEqual(openStorySheet.mainInertAfterClose, false, `${name}: closing mobile story sheet should restore play surface interaction`);
    assert.strictEqual(openStorySheet.appOpenClassAfterClose, false, `${name}: closing mobile story sheet should clear root state`);

    await page.evaluate(() => {
      App.toggleMobileMovePad();
      App.toggleExplorationTarget('creature', 'creature-1');
    });
    await page.waitForTimeout(50);
    const markedControls = await page.evaluate(() => {
      const dock = document.querySelector('.mobile-panel-dock');
      const tray = document.getElementById('mobile-target-action-tray');
      const movePad = document.getElementById('mobile-move-pad');
      const sentence = document.getElementById('mobile-selection-sentence');
      const dockRect = dock.getBoundingClientRect();
      const trayRect = tray.getBoundingClientRect();
      return {
        trayText: tray?.innerText || '',
        sentenceText: sentence?.innerText || '',
        trayBottom: trayRect.bottom,
        dockTop: dockRect.top,
        moveExpanded: movePad?.classList.contains('expanded') || false,
        moveAria: document.getElementById('mobile-move-toggle')?.getAttribute('aria-expanded') || ''
      };
    });
    assert(markedControls.trayText.includes('Fight') && markedControls.trayText.includes('Clear'), `${name}: marked target tray should be visible above the dock`);
    assert(markedControls.sentenceText.toLowerCase().includes('target'), `${name}: mobile actor target sentence should move into the control belt when target state exists`);
    assert(markedControls.trayBottom <= markedControls.dockTop + 1, `${name}: marked target tray should stay above the fixed dock`);
    assert.strictEqual(markedControls.moveExpanded, false, `${name}: move pad should close when target tray opens`);
    assert.strictEqual(markedControls.moveAria, 'false', `${name}: move toggle aria state should reflect collapsed target-tray mode`);

    await page.waitForTimeout(50);
    const expandedComposer = await page.evaluate(() => {
      const dock = document.querySelector('.mobile-panel-dock');
      const surface = document.getElementById('mobile-play-surface');
      const belt = document.getElementById('mobile-control-belt');
      const row = document.getElementById('mobile-control-row');
      const tray = document.getElementById('mobile-target-action-tray');
      const actorBelt = document.getElementById('mobile-actor-belt');
      const sentence = document.getElementById('mobile-selection-sentence');
      const dockRect = dock.getBoundingClientRect();
      const beltRect = belt.getBoundingClientRect();
      const trayRect = tray.getBoundingClientRect();
      const actorRect = actorBelt.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const sentenceRect = sentence.getBoundingClientRect();
      const targetActionRow = tray.querySelector('.target-action-row');
      const beltViewportBottom = Math.min(beltRect.bottom, dockRect.top);
      const visibleRect = rect => (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > 0 &&
        rect.left < innerWidth &&
        rect.bottom > 0 &&
        rect.top < dockRect.top
      );
      const visibleInBelt = rect => (
        visibleRect(rect) &&
        rect.left >= -1 &&
        rect.right <= innerWidth + 1 &&
        rect.top >= beltRect.top - 1 &&
        rect.bottom <= beltViewportBottom + 1
      );
      const readVisibleButtons = selector => Array.from(document.querySelectorAll(selector))
        .map(button => {
          const rect = button.getBoundingClientRect();
          return {
            label: button.textContent.trim(),
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          };
        })
        .filter(item => visibleInBelt(item));
      const trayButtons = readVisibleButtons('#mobile-target-action-tray button');
      const initialScrollTop = belt.scrollTop;
      belt.scrollTop = belt.scrollHeight;
      const actorButtons = readVisibleButtons('#mobile-actor-belt button');
      const actorChips = readVisibleButtons('#mobile-actor-belt .mobile-actor-chip');
      const actorScrollTop = belt.scrollTop;
      belt.scrollTop = initialScrollTop;
      const everyUsable = (items, minWidth, minHeight) => items.every(item => (
        item.left >= -1 &&
        item.right <= innerWidth + 1 &&
        item.top >= beltRect.top - 1 &&
        item.bottom <= beltViewportBottom + 1 &&
        item.width >= minWidth &&
        item.height >= minHeight
      ));
      const overlapArea = (a, b) => {
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return x * y;
      };
      return {
        surfaceHasBelt: surface?.classList.contains('has-control-belt') || false,
        surfaceExpanded: surface?.classList.contains('control-belt-expanded') || false,
        beltHasControls: belt.classList.contains('has-controls'),
        beltExpanded: belt.classList.contains('expanded-controls-open'),
        beltSurface: belt.getAttribute('data-command-surface'),
        beltMode: belt.getAttribute('data-command-mode'),
        beltGrammar: belt.getAttribute('data-command-grammar'),
        actorExpanded: document.getElementById('mobile-actor-toggle')?.getAttribute('aria-expanded') || '',
        rowVisible: row.classList.contains('has-visible-controls') && rowRect.width > 0 && rowRect.height > 0,
        sentenceText: sentence.innerText || '',
        sentenceVisible: sentenceRect.width > 0 && sentenceRect.height > 0,
        traySurface: tray.getAttribute('data-command-surface'),
        trayGrammar: tray.getAttribute('data-command-grammar'),
        actorSurface: actorBelt.getAttribute('data-command-surface'),
        actorGrammar: actorBelt.getAttribute('data-command-grammar'),
        actorBeltCollapsed: actorRect.width === 0 && actorRect.height === 0 && getComputedStyle(actorBelt).display === 'none',
        beltInsideViewport: beltRect.left >= -1 && beltRect.right <= innerWidth + 1 && beltRect.top >= 0 && beltRect.bottom <= dockRect.top + 1,
        trayInsideBelt: overlapArea(trayRect, beltRect) >= (trayRect.width * trayRect.height) - 2,
        targetActionsScrollable: Boolean(targetActionRow) && targetActionRow.scrollWidth >= targetActionRow.clientWidth,
        actorReachableInBelt: actorScrollTop > 0 || overlapArea(actorRect, beltRect) >= (actorRect.width * actorRect.height) - 2,
        trayButtonCount: trayButtons.length,
        actorButtonCount: actorButtons.length,
        trayButtonsUsable: everyUsable(trayButtons, 44, 44),
        actorButtonsUsable: everyUsable(actorButtons, 44, 34),
        hasActorChip: actorChips.some(chip => /You|Ally/.test(chip.label)),
        hasActorExit: actorButtons.some(button => /Close actors|Clear actors/i.test(button.label)),
        hasClearTargetExit: trayButtons.some(button => /Clear/i.test(button.label)),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.strictEqual(expandedComposer.surfaceHasBelt, true, `${name}: active mobile composer should reserve control-belt space`);
    assert.strictEqual(expandedComposer.surfaceExpanded, true, `${name}: active mobile composer should reserve expanded controls space`);
    assert.strictEqual(expandedComposer.beltHasControls, true, `${name}: active mobile composer should identify real controls`);
    assert.strictEqual(expandedComposer.beltExpanded, true, `${name}: active mobile composer should mark expanded control state`);
    assert.strictEqual(expandedComposer.beltSurface, 'command-composer', `${name}: active mobile belt should identify composer ownership`);
    assert.strictEqual(expandedComposer.beltMode, 'exploration', `${name}: active mobile belt should identify exploration mode`);
    assert.strictEqual(expandedComposer.beltGrammar, 'actor-target-intent', `${name}: active mobile belt should identify shared grammar`);
    assert.strictEqual(expandedComposer.actorExpanded, 'false', `${name}: target-priority mobile composer should collapse the actor toggle instead of stacking actor controls`);
    assert.strictEqual(expandedComposer.rowVisible, true, `${name}: active mobile composer row should be visible`);
    assert.strictEqual(expandedComposer.sentenceVisible, true, `${name}: active mobile composer should keep the selection sentence visible`);
    assert(expandedComposer.sentenceText.includes('You') && expandedComposer.sentenceText.includes('Creature'), `${name}: active mobile composer sentence should summarize actor and target`);
    assert.strictEqual(expandedComposer.traySurface, 'target-intents', `${name}: active mobile target tray should identify target-intent ownership`);
    assert.strictEqual(expandedComposer.trayGrammar, 'actor-target-intent', `${name}: active mobile target tray should identify shared grammar`);
    assert.strictEqual(expandedComposer.actorSurface, null, `${name}: target-priority mobile composer should clear collapsed actor rail surface metadata`);
    assert.strictEqual(expandedComposer.actorGrammar, null, `${name}: target-priority mobile composer should clear collapsed actor rail grammar metadata`);
    assert.strictEqual(expandedComposer.actorBeltCollapsed, true, `${name}: target-priority mobile composer should collapse actor controls while target intents are active`);
    assert.strictEqual(expandedComposer.beltInsideViewport, true, `${name}: expanded mobile composer should stay inside the viewport and above the fixed dock`);
    assert.strictEqual(expandedComposer.trayInsideBelt, true, `${name}: expanded mobile target tray should stay inside the composer belt`);
    assert.strictEqual(expandedComposer.targetActionsScrollable, true, `${name}: target-priority mobile intent controls should stay in a compact horizontal row instead of pushing under the dock`);
    assert.strictEqual(expandedComposer.actorReachableInBelt, true, `${name}: collapsed mobile actor rail should not overflow the composer belt`);
    assert(expandedComposer.trayButtonCount >= 2, `${name}: expanded mobile target tray should expose visible target intents and an exit`);
    assert.strictEqual(expandedComposer.actorButtonCount, 0, `${name}: target-priority mobile composer should not stack actor controls under target intents`);
    assert.strictEqual(expandedComposer.trayButtonsUsable, true, `${name}: visible mobile target intent controls should remain tappable`);
    assert.strictEqual(expandedComposer.actorButtonsUsable, true, `${name}: visible mobile actor controls should remain tappable`);
    assert.strictEqual(expandedComposer.hasActorChip, false, `${name}: target-priority mobile composer should summarize actors in the sentence instead of stacking chips`);
    assert.strictEqual(expandedComposer.hasActorExit, false, `${name}: collapsed target-priority actor rail should not expose a redundant exit`);
    assert.strictEqual(expandedComposer.hasClearTargetExit, true, `${name}: expanded mobile target tray should expose a clear-target exit`);
    assert.strictEqual(expandedComposer.pageOverflow, false, `${name}: expanded mobile composer should not create horizontal overflow`);

    await page.evaluate(() => App.selectExplorationActor(1));
    await page.waitForTimeout(50);
    await page.evaluate(() => App.openPanelFromRail('party', 'actor'));
    await page.waitForTimeout(50);
    const actorDrawer = await page.evaluate(() => {
      const panel = document.getElementById('panel-party');
      const backdrop = document.getElementById('panel-backdrop');
      const close = panel?.querySelector('[data-command-control="close-actor-drawer"]');
      const panelRect = panel?.getBoundingClientRect();
      const closeRect = close?.getBoundingClientRect();
      const compactCards = Array.from(panel?.querySelectorAll('.unit-card.compact-tactical-card.density-medium:not(.expanded)') || []);
      const cardRects = compactCards.map(card => card.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
      const ringCounts = compactCards.map(card => card.querySelectorAll('.tactical-stat-ring').length);
      const clippedCardButtons = compactCards.flatMap(card => Array.from(card.querySelectorAll('button')).filter(button => {
        const buttonRect = button.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        return buttonRect.width > 0 && buttonRect.height > 0 && (
          buttonRect.left < cardRect.left - 1 ||
          buttonRect.right > cardRect.right + 1 ||
          buttonRect.top < cardRect.top - 1 ||
          buttonRect.bottom > cardRect.bottom + 1
        );
      }).map(button => button.getAttribute('data-command-control') || button.textContent.trim()));
      return {
        panelActive: panel?.classList.contains('active') || false,
        panelInsideViewport: Boolean(panelRect && panelRect.left >= -1 && panelRect.right <= innerWidth + 1 && panelRect.top >= -1 && panelRect.bottom <= innerHeight + 1),
        backdropActive: backdrop?.classList.contains('active') || false,
        returnRail: App._mobilePanelReturnRail || '',
        actorIds: (App.explorationActorIds || []).join(','),
        actorExplicit: Boolean(App.explorationActorSelectionExplicit),
        targetIds: (App.explorationTargetIds || []).join(','),
        closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
        closeSlot: close?.getAttribute('data-command-slot') || '',
        compactCardCount: compactCards.length,
        compactMinHeight: cardRects.length ? Math.min(...cardRects.map(rect => rect.height)) : 0,
        compactMaxHeight: cardRects.length ? Math.max(...cardRects.map(rect => rect.height)) : 0,
        compactCardsHaveRings: ringCounts.every(count => count >= 3),
        clippedCardButtons,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.strictEqual(actorDrawer.panelActive, true, `${name}: actor Details should open the full actor drawer`);
    assert.strictEqual(actorDrawer.panelInsideViewport, true, `${name}: actor Details drawer should stay inside the mobile viewport`);
    assert.strictEqual(actorDrawer.backdropActive, true, `${name}: actor Details drawer should activate the panel backdrop`);
    assert.strictEqual(actorDrawer.returnRail, 'actor', `${name}: actor Details should remember the compact actor rail return target`);
    assert.strictEqual(actorDrawer.actorIds, 'ally-1', `${name}: actor Details should preserve explicit actor selection`);
    assert.strictEqual(actorDrawer.actorExplicit, true, `${name}: actor Details should preserve explicit actor mode`);
    assert(actorDrawer.targetIds.includes('creature:creature-1'), `${name}: actor Details should preserve marked creature targets`);
    assert.strictEqual(actorDrawer.closeVisible, true, `${name}: actor Details drawer should expose a visible close exit`);
    assert.strictEqual(actorDrawer.closeSlot, 'exit', `${name}: actor Details close should identify the exit slot`);
    assert(actorDrawer.compactCardCount >= 2, `${name}: actor Details drawer should render collapsed medium party cards`);
    assert(actorDrawer.compactMinHeight >= 60, `${name}: collapsed medium party cards should keep a usable touch height, got ${actorDrawer.compactMinHeight}`);
    assert(actorDrawer.compactMaxHeight <= 92, `${name}: collapsed medium party cards should not waste vertical drawer space, got ${actorDrawer.compactMaxHeight}`);
    assert.strictEqual(actorDrawer.compactCardsHaveRings, true, `${name}: collapsed medium party cards should keep stat rings visible`);
    assert.deepStrictEqual(actorDrawer.clippedCardButtons, [], `${name}: collapsed medium party card controls should not clip`);
    assert.strictEqual(actorDrawer.pageOverflow, false, `${name}: actor Details drawer should not create horizontal overflow`);

    await page.locator('#panel-party [data-command-control="close-actor-drawer"]').click();
    await page.waitForTimeout(80);
    const actorDrawerReturn = await page.evaluate(() => {
      const panel = document.getElementById('panel-party');
      const backdrop = document.getElementById('panel-backdrop');
      const actorBelt = document.getElementById('mobile-actor-belt');
      const tray = document.getElementById('mobile-target-action-tray');
      const sentence = document.getElementById('mobile-selection-sentence');
      const actorBeltRect = actorBelt?.getBoundingClientRect();
      return {
        panelActive: panel?.classList.contains('active') || false,
        backdropActive: backdrop?.classList.contains('active') || false,
        returnRail: App._mobilePanelReturnRail || '',
        actorBeltOpen: Boolean(App.mobileActorBeltOpen),
        actorBeltSurface: actorBelt?.getAttribute('data-command-surface') || '',
        actorBeltCollapsed: Boolean(actorBeltRect && actorBeltRect.width === 0 && actorBeltRect.height === 0),
        actorIds: (App.explorationActorIds || []).join(','),
        actorExplicit: Boolean(App.explorationActorSelectionExplicit),
        targetIds: (App.explorationTargetIds || []).join(','),
        sentenceText: sentence?.innerText || '',
        trayText: tray?.innerText || '',
        focusReturnedToRail: Boolean(document.activeElement?.closest?.('#mobile-actor-belt')),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.strictEqual(actorDrawerReturn.panelActive, false, `${name}: closing actor Details should hide the full actor drawer`);
    assert.strictEqual(actorDrawerReturn.backdropActive, false, `${name}: closing actor Details should clear the panel backdrop`);
    assert.strictEqual(actorDrawerReturn.returnRail, '', `${name}: closing actor Details should clear the temporary return rail`);
    assert.strictEqual(actorDrawerReturn.actorBeltOpen, true, `${name}: closing actor Details should restore the compact actor rail`);
    assert.strictEqual(actorDrawerReturn.actorBeltSurface, 'actor-target-routing', `${name}: restored actor rail should keep actor-target routing ownership`);
    assert.strictEqual(actorDrawerReturn.actorBeltCollapsed, false, `${name}: restored actor rail should be visible after returning from actor Details`);
    assert.strictEqual(actorDrawerReturn.actorIds, 'ally-1', `${name}: closing actor Details should preserve selected actors`);
    assert.strictEqual(actorDrawerReturn.actorExplicit, true, `${name}: closing actor Details should preserve explicit actor mode`);
    assert(actorDrawerReturn.targetIds.includes('creature:creature-1'), `${name}: closing actor Details should preserve marked targets`);
    assert(actorDrawerReturn.sentenceText.includes('Ally') && actorDrawerReturn.sentenceText.includes('Creature'), `${name}: returned compact rail should keep the composer sentence intact`);
    assert(actorDrawerReturn.trayText.includes('Fight') && actorDrawerReturn.trayText.includes('Clear'), `${name}: returned compact rail should keep target intents reachable`);
    assert.strictEqual(actorDrawerReturn.focusReturnedToRail, true, `${name}: closing actor Details should return focus to the compact actor rail`);
    assert.strictEqual(actorDrawerReturn.pageOverflow, false, `${name}: closing actor Details should not create horizontal overflow`);

    await page.evaluate(() => App.openPanelFromRail('enemies', 'target'));
    await page.waitForTimeout(50);
    const targetDrawer = await page.evaluate(() => {
      const panel = document.getElementById('panel-enemies');
      const backdrop = document.getElementById('panel-backdrop');
      const close = panel?.querySelector('[data-command-control="close-target-drawer"]');
      const panelRect = panel?.getBoundingClientRect();
      const closeRect = close?.getBoundingClientRect();
      const compactCards = Array.from(panel?.querySelectorAll('.unit-card.compact-tactical-card.density-medium:not(.expanded)') || []);
      const cardRects = compactCards.map(card => card.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
      const ringCounts = compactCards.map(card => card.querySelectorAll('.tactical-stat-ring').length);
      const clippedCardButtons = compactCards.flatMap(card => Array.from(card.querySelectorAll('button')).filter(button => {
        const buttonRect = button.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        return buttonRect.width > 0 && buttonRect.height > 0 && (
          buttonRect.left < cardRect.left - 1 ||
          buttonRect.right > cardRect.right + 1 ||
          buttonRect.top < cardRect.top - 1 ||
          buttonRect.bottom > cardRect.bottom + 1
        );
      }).map(button => button.getAttribute('data-command-control') || button.textContent.trim()));
      return {
        panelActive: panel?.classList.contains('active') || false,
        panelInsideViewport: Boolean(panelRect && panelRect.left >= -1 && panelRect.right <= innerWidth + 1 && panelRect.top >= -1 && panelRect.bottom <= innerHeight + 1),
        backdropActive: backdrop?.classList.contains('active') || false,
        returnRail: App._mobilePanelReturnRail || '',
        actorIds: (App.explorationActorIds || []).join(','),
        targetIds: (App.explorationTargetIds || []).join(','),
        closeVisible: Boolean(closeRect && closeRect.width > 0 && closeRect.height > 0),
        closeSlot: close?.getAttribute('data-command-slot') || '',
        compactCardCount: compactCards.length,
        compactMinHeight: cardRects.length ? Math.min(...cardRects.map(rect => rect.height)) : 0,
        compactMaxHeight: cardRects.length ? Math.max(...cardRects.map(rect => rect.height)) : 0,
        compactCardsHaveRings: ringCounts.every(count => count >= 3),
        clippedCardButtons,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.strictEqual(targetDrawer.panelActive, true, `${name}: target Details should open the full target drawer`);
    assert.strictEqual(targetDrawer.panelInsideViewport, true, `${name}: target Details drawer should stay inside the mobile viewport`);
    assert.strictEqual(targetDrawer.backdropActive, true, `${name}: target Details drawer should activate the panel backdrop`);
    assert.strictEqual(targetDrawer.returnRail, 'target', `${name}: target Details should remember the compact target rail return target`);
    assert.strictEqual(targetDrawer.actorIds, 'ally-1', `${name}: target Details should preserve selected actors`);
    assert(targetDrawer.targetIds.includes('creature:creature-1'), `${name}: target Details should preserve marked targets`);
    assert.strictEqual(targetDrawer.closeVisible, true, `${name}: target Details drawer should expose a visible close exit`);
    assert.strictEqual(targetDrawer.closeSlot, 'exit', `${name}: target Details close should identify the exit slot`);
    assert(targetDrawer.compactCardCount >= 1, `${name}: target Details drawer should render collapsed medium target cards`);
    assert(targetDrawer.compactMinHeight >= 60, `${name}: collapsed medium target cards should keep a usable touch height, got ${targetDrawer.compactMinHeight}`);
    assert(targetDrawer.compactMaxHeight <= 92, `${name}: collapsed medium target cards should not waste vertical drawer space, got ${targetDrawer.compactMaxHeight}`);
    assert.strictEqual(targetDrawer.compactCardsHaveRings, true, `${name}: collapsed medium target cards should keep stat rings visible`);
    assert.deepStrictEqual(targetDrawer.clippedCardButtons, [], `${name}: collapsed medium target card controls should not clip`);
    assert.strictEqual(targetDrawer.pageOverflow, false, `${name}: target Details drawer should not create horizontal overflow`);

    await page.locator('#panel-enemies [data-command-control="close-target-drawer"]').click();
    await page.waitForTimeout(80);
    const targetDrawerReturn = await page.evaluate(() => {
      const panel = document.getElementById('panel-enemies');
      const backdrop = document.getElementById('panel-backdrop');
      const targetPicker = document.getElementById('mobile-target-picker-belt');
      const tray = document.getElementById('mobile-target-action-tray');
      const sentence = document.getElementById('mobile-selection-sentence');
      const pickerRect = targetPicker?.getBoundingClientRect();
      return {
        panelActive: panel?.classList.contains('active') || false,
        backdropActive: backdrop?.classList.contains('active') || false,
        returnRail: App._mobilePanelReturnRail || '',
        targetPickerOpen: Boolean(App.mobileTargetPickerOpen),
        targetPickerVisible: Boolean(pickerRect && pickerRect.width > 0 && pickerRect.height > 0 && getComputedStyle(targetPicker).display !== 'none'),
        targetPickerHasTargetControl: Boolean(targetPicker?.querySelector('[data-command-control="focus-target"]')),
        actorIds: (App.explorationActorIds || []).join(','),
        targetIds: (App.explorationTargetIds || []).join(','),
        sentenceText: sentence?.innerText || '',
        trayText: tray?.innerText || '',
        focusReturnedToRail: Boolean(document.activeElement?.closest?.('#mobile-target-picker-belt')),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.strictEqual(targetDrawerReturn.panelActive, false, `${name}: closing target Details should hide the full target drawer`);
    assert.strictEqual(targetDrawerReturn.backdropActive, false, `${name}: closing target Details should clear the panel backdrop`);
    assert.strictEqual(targetDrawerReturn.returnRail, '', `${name}: closing target Details should clear the temporary return rail`);
    assert.strictEqual(targetDrawerReturn.targetPickerOpen, true, `${name}: closing target Details should restore target picker state`);
    assert.strictEqual(targetDrawerReturn.targetPickerVisible, true, `${name}: closing target Details should leave the target picker visible`);
    assert.strictEqual(targetDrawerReturn.targetPickerHasTargetControl, true, `${name}: returned target picker should keep target controls reachable`);
    assert.strictEqual(targetDrawerReturn.actorIds, 'ally-1', `${name}: closing target Details should preserve selected actors`);
    assert(targetDrawerReturn.targetIds.includes('creature:creature-1'), `${name}: closing target Details should preserve marked targets`);
    assert(targetDrawerReturn.sentenceText.includes('Ally') && targetDrawerReturn.sentenceText.includes('Creature'), `${name}: returned target picker should keep the composer sentence intact`);
    assert(targetDrawerReturn.trayText.includes('Fight') && targetDrawerReturn.trayText.includes('Clear'), `${name}: returned target picker should keep target intents reachable`);
    assert.strictEqual(targetDrawerReturn.focusReturnedToRail, true, `${name}: closing target Details should return focus to the target picker`);
    assert.strictEqual(targetDrawerReturn.pageOverflow, false, `${name}: closing target Details should not create horizontal overflow`);

    await page.evaluate(() => App.clearExplorationTargets());

    await page.evaluate(() => {
      const enemy = {
        id: 'enemy-viewport',
        name: 'Enemy',
        species: 'human',
        icon: '👤',
        disposition: App.DISPOSITION.ENEMY,
        CPun: 100,
        MPun: 100,
        CPle: 0,
        MPle: 100,
        level: 1,
        size: 4,
        appetite: 4,
        stomach: [],
        inventory: [],
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
      App.creatures = [enemy];
      App.combatState = {
        active: true,
        round: 1,
        currentTurn: 0,
        turnQueue: [{ unit: App.player, initiative: 10 }, { unit: App.party[1], initiative: 8 }, { unit: enemy, initiative: 5 }],
        syncActions: [],
        processing: false
      };
      App.log.push({ text: 'You hit Enemy for 4.', type: 'combat', actorName: 'You', action: 'fight' });
      App.emitSceneBeat({
        mode: 'combat',
        actors: [App.player],
        targets: [enemy],
        action: 'fight',
        source: 'viewport-check'
      }, 'You hit Enemy for 4.');
      App.renderCreatures();
      App.renderParty();
      App.renderCombatSceneForTurn(App.player);
      App.renderMobileCombatToolbelt();
    });
    await page.waitForTimeout(50);
    const mobileCombat = await page.evaluate(() => {
      const dock = document.querySelector('.mobile-panel-dock');
      const map = document.querySelector('.mobile-map-card');
      const controlBelt = document.getElementById('mobile-control-belt');
      const context = document.querySelector('.mobile-combat-context-strip');
      const sceneFeed = document.getElementById('mobile-story-latest');
      const mobileDesc = document.getElementById('mobile-scene-description');
      const dockRect = dock.getBoundingClientRect();
      const contextRect = context.getBoundingClientRect();
      const controlRect = controlBelt.getBoundingClientRect();
      return {
        mapDisplay: getComputedStyle(map).display,
        controlDisplay: getComputedStyle(controlBelt).display,
        controlHeight: controlRect.height,
        contextText: context?.innerText || '',
        sceneFeedText: sceneFeed?.innerText || '',
        contextTop: contextRect.top,
        contextBottom: contextRect.bottom,
        dockTop: dockRect.top,
        descHasBoxedRecent: Boolean(mobileDesc?.querySelector('.combat-recent-exchange')),
        descHasTurnOrder: Boolean(mobileDesc?.querySelector('.combat-turn-order')),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.strictEqual(mobileCombat.mapDisplay, 'none', `${name}: mobile combat should hide traversal map`);
    assert.strictEqual(mobileCombat.controlDisplay, 'none', `${name}: empty exploration control belt should hide during combat`);
    assert.strictEqual(mobileCombat.controlHeight, 0, `${name}: hidden exploration control belt should not consume combat space`);
    assert(mobileCombat.contextText.includes('Choose your next action.'), `${name}: mobile combat should expose compact current-turn context`);
    assert(!mobileCombat.contextText.includes('You hit Enemy for 4.'), `${name}: mobile turn context should not duplicate resolved feed history`);
    assert(mobileCombat.sceneFeedText.includes('You hit Enemy for 4.'), `${name}: shared mobile Scene Feed should expose the resolved exchange`);
    assert(mobileCombat.contextTop >= 0, `${name}: mobile turn context should be visible in the viewport`);
    assert(mobileCombat.contextBottom <= mobileCombat.dockTop + 1, `${name}: mobile turn context should stay above the fixed dock`);
    assert.strictEqual(mobileCombat.descHasBoxedRecent, false, `${name}: mobile combat should not embed the boxed recent-exchange list`);
    assert.strictEqual(mobileCombat.descHasTurnOrder, false, `${name}: mobile combat should not embed the full turn-order box`);
    assert.strictEqual(mobileCombat.pageOverflow, false, `${name}: mobile combat strip should not create horizontal overflow`);
    if (width === 412 && height === 915) {
      const groupIntentPhase = await page.evaluate(() => {
        const enemy = App.creatures[0];
        const ally = App.party[1];
        App.combatPlanSelection = {
          active: true,
          source: 'combat-planner',
          actorIds: [App._unitSelectionId(App.player), App._unitSelectionId(ally)],
          pendingIntent: null,
          explicitActors: true,
          hadGroupActors: true
        };
        App.combatTargetIds = [App._unitSelectionId(enemy)];
        App.combatTargetId = App._unitSelectionId(enemy);
        App.renderMobileCombatToolbelt();
        const belt = document.getElementById('mobile-combat-toolbelt');
        const dock = document.querySelector('.mobile-panel-dock');
        const dockRect = dock.getBoundingClientRect();
        const buttonRects = Array.from(belt.querySelectorAll('.action-btn')).map(button => {
          const rect = button.getBoundingClientRect();
          return {
            text: button.textContent.trim(),
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          };
        });
        return {
          text: belt.innerText,
          buttonRects,
          dockTop: dockRect.top,
          beltScrollHeight: belt.scrollHeight,
          beltClientHeight: belt.clientHeight,
          beltOverflowY: getComputedStyle(belt).overflowY
        };
      });
      const intentLabels = ['Fight', 'Talk', 'Eat', 'Play', 'Feed', 'Flee'];
      for (const label of intentLabels) {
        const match = groupIntentPhase.buttonRects.find(button => button.text.includes(label));
        assert(match, `${name}: group intent phase should expose ${label}`);
        assert(match.bottom <= groupIntentPhase.dockTop + 1, `${name}: ${label} should be fully reachable above the fixed dock`);
      }
      assert(!groupIntentPhase.buttonRects.some(button => button.text.includes('Commit Group')), `${name}: group intent phase should not show a group commit before an intent is pending`);
      const cancelGroup = groupIntentPhase.buttonRects.find(button => button.text === 'Cancel Group');
      assert(cancelGroup, `${name}: group intent phase should expose an explicit Cancel Group exit`);
      assert(cancelGroup.bottom <= groupIntentPhase.dockTop + 1, `${name}: Cancel Group should remain reachable above the fixed dock`);
      assert(groupIntentPhase.beltScrollHeight <= groupIntentPhase.beltClientHeight + 1, `${name}: group intent phase should not require internal belt scrolling at 412x915`);
      assert.strictEqual(groupIntentPhase.beltOverflowY, 'visible', `${name}: group intent phase should avoid a nested scroll belt`);

      const groupConfirmPhase = await page.evaluate(() => {
        App.combatPlanSelection.pendingIntent = 'fight';
        App.renderMobileCombatToolbelt();
        const belt = document.getElementById('mobile-combat-toolbelt');
        const dock = document.querySelector('.mobile-panel-dock');
        const dockRect = dock.getBoundingClientRect();
        const buttonRects = Array.from(belt.querySelectorAll('.action-btn')).map(button => {
          const rect = button.getBoundingClientRect();
          return {
            text: button.textContent.trim(),
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          };
        });
        return {
          text: belt.innerText,
          buttonRects,
          dockTop: dockRect.top,
          beltScrollHeight: belt.scrollHeight,
          beltClientHeight: belt.clientHeight
        };
      });
      const confirm = groupConfirmPhase.buttonRects.find(button => button.text.includes('Commit Group Fight'));
      const cancel = groupConfirmPhase.buttonRects.find(button => button.text === 'Cancel Group');
      assert(confirm && cancel, `${name}: group confirm phase should expose intent-owned commit and Cancel Group controls`);
      assert(confirm.bottom <= groupConfirmPhase.dockTop + 1 && cancel.bottom <= groupConfirmPhase.dockTop + 1, `${name}: group confirm controls should stay above the fixed dock`);
      assert(!groupConfirmPhase.buttonRects.some(button => button.text.includes('Talk') || button.text.includes('Eat') || button.text.includes('Play')), `${name}: group confirm phase should not keep the full intent grid visible`);
      assert(groupConfirmPhase.beltScrollHeight <= groupConfirmPhase.beltClientHeight + 1, `${name}: group confirm phase should not require internal belt scrolling at 412x915`);
    }
    await page.evaluate(() => {
      App.combatState.active = false;
      App.renderMobileCombatToolbelt();
      App.showExplorationActions();
    });

    const readContextMenuBounds = async label => page.evaluate(menuLabel => {
      const menu = document.getElementById('mobile-context-menu');
      const toolbar = document.getElementById('mobile-actions');
      if (!menu) return { label: menuLabel, exists: false };
      const menuRect = menu.getBoundingClientRect();
      const toolbarRect = toolbar?.getBoundingClientRect();
      const toolbarVisible = toolbar && getComputedStyle(toolbar).display !== 'none' && toolbarRect.height > 0;
      return {
        label: menuLabel,
        exists: true,
        role: menu.getAttribute('role'),
        ariaModal: menu.getAttribute('aria-modal'),
        overflowY: getComputedStyle(menu).overflowY,
        top: menuRect.top,
        left: menuRect.left,
        right: menuRect.right,
        bottom: menuRect.bottom,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        toolbarTop: toolbarVisible ? toolbarRect.top : null,
        toolbarVisible
      };
    }, label);

    await page.evaluate(() => App.showMobilePartyContext(1));
    await page.waitForTimeout(50);
    const partyMenu = await readContextMenuBounds('party menu');
    assert(partyMenu.exists, `${name}: party long-press menu should render`);
    assert.strictEqual(partyMenu.role, 'dialog', `${name}: party long-press menu should use dialog semantics`);
    assert.strictEqual(partyMenu.ariaModal, 'true', `${name}: party long-press menu should be modal`);
    assert(partyMenu.overflowY === 'auto' || partyMenu.overflowY === 'scroll', `${name}: party long-press menu should be scrollable`);
    assert(partyMenu.top >= -1, `${name}: party long-press menu should not clip above viewport`);
    assert(partyMenu.left >= -1, `${name}: party long-press menu should not clip left`);
    assert(partyMenu.right <= partyMenu.viewportWidth + 1, `${name}: party long-press menu should not clip right`);
    assert(partyMenu.bottom <= partyMenu.viewportHeight + 1, `${name}: party long-press menu should not clip below viewport`);
    if (partyMenu.toolbarVisible) assert(partyMenu.bottom <= partyMenu.toolbarTop + 1, `${name}: party long-press menu should stay above mobile toolbar`);

    await page.evaluate(() => {
      App.closeMobileContextMenu();
      App.creatures.push({
        id: 'corpse-1',
        name: 'Fallen',
        species: 'human',
        icon: '👤',
        disposition: App.DISPOSITION.CORPSE,
        CPun: 0,
        MPun: 100,
        CPle: 0,
        MPle: 100,
        stomach: [],
        womb: [],
        balls: []
      });
      App.showMobileCreatureContext('corpse-1');
    });
    await page.waitForTimeout(50);
    const corpseComposer = await page.evaluate(() => {
      const tray = document.getElementById('mobile-target-action-tray');
      const trayRect = tray?.getBoundingClientRect();
      const visibleButtons = tray
        ? Array.from(tray.querySelectorAll('button')).filter(btn => {
            const rect = btn.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }).map(btn => {
            const rect = btn.getBoundingClientRect();
            return {
              label: btn.textContent.trim(),
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right
            };
          })
        : [];
      return {
        marked: App.explorationTargetIds.includes('creature:corpse-1'),
        hasContextMenu: Boolean(document.getElementById('mobile-context-menu')),
        hasRadialMenu: Boolean(document.querySelector('.intent-menu-radial')),
        trayVisible: Boolean(trayRect && trayRect.width > 0 && trayRect.height > 0),
        viewportHeight: innerHeight,
        viewportWidth: innerWidth,
        visibleButtons
      };
    });
    assert(corpseComposer.marked, `${name}: corpse long-press should mark remains as the composer target`);
    assert(!corpseComposer.hasContextMenu, `${name}: corpse long-press should not open duplicate context menu`);
    assert(!corpseComposer.hasRadialMenu, `${name}: corpse long-press should not open duplicate radial menu`);
    assert(corpseComposer.trayVisible, `${name}: corpse composer target tray should be visible`);
    assert(corpseComposer.visibleButtons.some(btn => /loot/i.test(btn.label)), `${name}: corpse composer target tray should expose Loot`);
    assert(corpseComposer.visibleButtons.some(btn => /scavenge/i.test(btn.label)), `${name}: corpse composer target tray should expose Scavenge`);
  } else {
    const desktopPanels = await page.evaluate(() => {
      const read = id => {
        const el = document.getElementById(id);
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          display: style.display,
          position: style.position,
          active: el.classList.contains('active'),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          zIndex: Number.parseInt(style.zIndex, 10) || 0
        };
      };
      const stageStyle = getComputedStyle(document.querySelector('.stage'));
      return {
        stageAreas: stageStyle.gridTemplateAreas,
        stageColumns: stageStyle.gridTemplateColumns,
        map: read('panel-map'),
        main: read('panel-main'),
        surface: read('desktop-play-surface'),
        party: read('panel-party'),
        enemies: read('panel-enemies'),
        center: read('desktop-play-cell-center')
      };
    });
    assert(!desktopPanels.stageAreas.includes('map'), `${name}: desktop stage should not reserve a routine map column`);
    assert.strictEqual(desktopPanels.map.display, 'none', `${name}: desktop map panel should be hidden by default`);
    assert.strictEqual(desktopPanels.map.active, false, `${name}: desktop map panel should not start active`);
    assert.notStrictEqual(desktopPanels.party.display, 'none', `${name}: desktop party panel should remain a primary side panel`);
    assert.notStrictEqual(desktopPanels.enemies.display, 'none', `${name}: desktop creatures panel should remain a primary side panel`);
    assert(desktopPanels.main.width > desktopPanels.party.width, `${name}: desktop main play area should be wider than side panels`);
    assert(desktopPanels.surface.width <= 982, `${name}: desktop play surface should cap width instead of expanding with spare side-panel space`);
    assert(desktopPanels.center.width > 0 && desktopPanels.center.height > 0, `${name}: desktop center play tile should be visible`);

    const desktopLongContentStability = await page.evaluate(() => {
      const app = document.getElementById('app');
      const stage = document.querySelector('.stage');
      const main = document.getElementById('panel-main');
      const summary = document.getElementById('log-collapsed-summary');
      const sceneFeed = document.getElementById('desktop-scene-feed-latest');
      const composer = document.getElementById('desktop-command-composer');
      const sentence = document.getElementById('selection-sentence');
      const original = {
        collapsed: app.classList.contains('log-collapsed'),
        summaryText: summary.textContent,
        composerHidden: composer.hidden,
        composerAriaHidden: composer.getAttribute('aria-hidden'),
        sentenceHtml: sentence.innerHTML
      };
      const measure = () => {
        const mainRect = main.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        return {
          mainLeft: mainRect.left,
          mainRight: mainRect.right,
          stageLeft: stageRect.left,
          stageRight: stageRect.right,
          pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        };
      };
      const baseline = measure();
      const longToken = 'ActorWithAnIntentionallyUnbreakableDisplayName'.repeat(45);
      const pressure = document.createElement('article');
      pressure.className = 'scene-beat-stream-item';
      pressure.innerHTML = `<div class="story-summary">${longToken}</div>`;

      app.classList.add('log-collapsed');
      summary.textContent = longToken;
      sceneFeed.appendChild(pressure);
      composer.hidden = false;
      composer.setAttribute('aria-hidden', 'false');
      sentence.innerHTML = `<span class="selection-sentence-part"><span class="selection-sentence-value">${longToken}</span></span>`;
      const pressured = measure();

      pressure.remove();
      summary.textContent = original.summaryText;
      sentence.innerHTML = original.sentenceHtml;
      composer.hidden = original.composerHidden;
      if (original.composerAriaHidden === null) composer.removeAttribute('aria-hidden');
      else composer.setAttribute('aria-hidden', original.composerAriaHidden);
      app.classList.toggle('log-collapsed', original.collapsed);
      return { baseline, pressured, viewportWidth: innerWidth };
    });
    assert(Math.abs(desktopLongContentStability.pressured.mainLeft - desktopLongContentStability.baseline.mainLeft) <= 1, `${name}: long scene and activity text should not shift the centered desktop stage`);
    assert(Math.abs(desktopLongContentStability.pressured.stageLeft - desktopLongContentStability.baseline.stageLeft) <= 1, `${name}: long scene and activity text should not resize the desktop stage shell`);
    assert(desktopLongContentStability.pressured.mainRight <= desktopLongContentStability.viewportWidth + 1, `${name}: long scene and activity text should keep the main play column inside the viewport`);
    assert.strictEqual(desktopLongContentStability.pressured.pageOverflow, false, `${name}: long scene and activity text should not create horizontal page overflow`);

    const desktopCombatSceneLayout = await page.evaluate(() => {
      const tile = App._currentExplorationTile?.();
      const originalCreatures = [...(App.creatures || [])];
      const originalParty = [...(App.party || [])];
      const originalPlayer = App.player;
      const originalCombatState = App.combatState ? {
        ...App.combatState,
        turnQueue: Array.isArray(App.combatState.turnQueue) ? [...App.combatState.turnQueue] : [],
        syncActions: Array.isArray(App.combatState.syncActions) ? [...App.combatState.syncActions] : []
      } : null;
      const originalLog = [...(App.log || [])];
      const originalTileCreatures = tile && Array.isArray(tile.creatures) ? [...tile.creatures] : null;
      const originalTileItems = tile && Array.isArray(tile.items) ? [...tile.items] : null;
      const make = (name, id, icon = '👤') => ({
        id,
        name,
        species: 'human',
        icon,
        CPun: 100,
        MPun: 100,
        CPle: 50,
        MPle: 100,
        level: 1,
        size: 4,
        appetite: 4,
        stomach: [],
        womb: [],
        balls: [],
        inventory: [],
        Figh: 10,
        Flir: 10,
        Fuck: 10,
        Feas: 10,
        Feed: 10,
        Flee: 10,
        con: 10,
        wis: 10,
        cha: 10
      });
      const player = make('You', 'desktop-combat-player', '👤');
      player.mc = true;
      const ally = make('Ally', 'desktop-combat-ally', '🐰');
      const helper = make('Mousefolk', 'desktop-combat-helper', '🐭');
      const enemy = { ...make('Ratfolk', 'desktop-combat-enemy', '🐀'), disposition: App.DISPOSITION.ENEMY };
      App.player = player;
      App.party = [player, ally, helper];
      App.creatures = [enemy];
      if (tile) tile.creatures = App.creatures;
      App.combatState = {
        active: true,
        round: 1,
        currentTurn: 0,
        turnQueue: [
          { unit: player, initiative: 12 },
          { unit: ally, initiative: 10 },
          { unit: helper, initiative: 8 },
          { unit: enemy, initiative: 5 }
        ],
        syncActions: [],
        processing: false
      };
      App.log = [
        ...originalLog,
        { text: 'Combat started with Ratfolk!', type: 'combat', phase: 'start' },
        { text: 'Ratfolk hits You for 8 punishment!', type: 'combat', actorName: 'Ratfolk', action: 'fight' },
        { text: 'You play with Ratfolk. Spirit rises.', type: 'combat', actorName: 'You', action: 'fuck' }
      ];
      App.emitSceneBeat?.({
        mode: 'combat',
        action: 'fight',
        actors: [enemy],
        targets: [player],
        source: 'desktop-layout-check'
      }, {
        summary: 'Ratfolk hits You for 8 punishment.',
        passage: 'Ratfolk catches You during the exchange.',
        resultKind: 'success',
        source: 'desktop-layout-check'
      });
      App.renderCreatures();
      App.renderParty();
      App.renderCombatSceneForTurn(player);
      App.renderDesktopPlaySurface();
      App.renderDesktopCombatComposer(player);

      const read = selector => {
        const el = document.querySelector(selector);
        const rect = el?.getBoundingClientRect?.();
        const style = el ? getComputedStyle(el) : null;
        return {
          exists: Boolean(el),
          hidden: Boolean(el?.hidden),
          display: style?.display || '',
          overflowY: style?.overflowY || '',
          top: rect ? Math.round(rect.top) : 0,
          bottom: rect ? Math.round(rect.bottom) : 0,
          width: rect ? Math.round(rect.width) : 0,
          height: rect ? Math.round(rect.height) : 0,
          scrollHeight: el?.scrollHeight || 0,
          clientHeight: el?.clientHeight || 0,
          text: el?.innerText || ''
        };
      };
      const metrics = {
        surface: read('#desktop-play-surface'),
        sceneScroll: read('#desktop-scene-scroll'),
        center: read('#desktop-play-cell-center'),
        content: read('#desktop-play-cell-center .desktop-play-cell-content'),
        summary: read('#desktop-play-cell-center .combat-scene-summary'),
        feedSlot: read('#desktop-scene-feed-slot'),
        latestExchange: read('#desktop-scene-feed-latest .scene-exchange-group.latest'),
        composer: read('#desktop-command-composer'),
        belt: read('#desktop-context-belt'),
        actionButtons: Array.from(document.querySelectorAll('#desktop-context-belt button')).map(button => {
          const rect = button.getBoundingClientRect();
          return {
            text: button.textContent.trim(),
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          };
        }),
        viewportHeight: innerHeight
      };

      App.combatState = originalCombatState || { active: false, round: 0, currentTurn: 0, turnQueue: [], syncActions: [], processing: false };
      App.player = originalPlayer;
      App.party = originalParty;
      App.creatures = originalCreatures;
      App.log = originalLog;
      if (tile) {
        if (originalTileCreatures) tile.creatures = originalTileCreatures;
        else delete tile.creatures;
        if (originalTileItems) tile.items = originalTileItems;
        else delete tile.items;
      }
      App.renderCreatures();
      App.renderParty();
      App.renderMap();
      App.renderDesktopPlaySurface();
      App.renderExplorationActions();
      return metrics;
    });
    assert.strictEqual(desktopCombatSceneLayout.summary.exists, true, `${name}: desktop combat stage should render the combat summary`);
    assert.strictEqual(desktopCombatSceneLayout.feedSlot.exists, true, `${name}: desktop combat should keep the Scene Feed slot rendered`);
    assert.strictEqual(desktopCombatSceneLayout.composer.hidden, false, `${name}: desktop combat composer should be visible for current actor controls`);
    assert(desktopCombatSceneLayout.sceneScroll.bottom <= desktopCombatSceneLayout.composer.top + 1, `${name}: desktop scene content should stop above the docked composer`);
    assert(desktopCombatSceneLayout.sceneScroll.overflowY === 'auto' || desktopCombatSceneLayout.sceneScroll.overflowY === 'scroll', `${name}: desktop battle and narrative content should own vertical scrolling`);
    assert(desktopCombatSceneLayout.center.scrollHeight <= desktopCombatSceneLayout.center.clientHeight + 1, `${name}: desktop combat center should not require internal scrolling to see the battle context`);
    assert(desktopCombatSceneLayout.summary.bottom <= desktopCombatSceneLayout.center.bottom + 1, `${name}: desktop combat summary should fit visibly inside the battle center`);
    assert(desktopCombatSceneLayout.feedSlot.top >= desktopCombatSceneLayout.surface.bottom - 1, `${name}: desktop Scene Feed should sit below the combat stage`);
    assert(desktopCombatSceneLayout.feedSlot.top < desktopCombatSceneLayout.composer.top, `${name}: desktop Scene Feed should begin visibly above the combat composer`);
    assert(desktopCombatSceneLayout.latestExchange.exists && desktopCombatSceneLayout.latestExchange.top < desktopCombatSceneLayout.composer.top, `${name}: newest desktop exchange should begin in the visible scene viewport`);
    assert(desktopCombatSceneLayout.composer.bottom <= desktopCombatSceneLayout.viewportHeight + 1, `${name}: desktop combat composer should stay inside the viewport`);
    assert(desktopCombatSceneLayout.actionButtons.length >= 5, `${name}: desktop combat composer should expose the primary action grid`);
    assert(desktopCombatSceneLayout.actionButtons.every(button => button.bottom <= desktopCombatSceneLayout.viewportHeight + 1 && button.width >= 58 && button.height >= 38), `${name}: desktop combat action buttons should remain visible and usable`);

    const desktopDockStability = await page.evaluate(() => {
      const scroll = document.getElementById('desktop-scene-scroll');
      const composer = document.getElementById('desktop-command-composer');
      const before = composer.getBoundingClientRect();
      const spacer = document.createElement('div');
      spacer.setAttribute('data-test-scene-overflow', 'true');
      spacer.style.flex = '0 0 1200px';
      spacer.style.width = '1px';
      scroll.appendChild(spacer);
      scroll.scrollTop = scroll.scrollHeight;
      const after = composer.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      const result = {
        beforeTop: before.top,
        beforeBottom: before.bottom,
        afterTop: after.top,
        afterBottom: after.bottom,
        scrollBottom: scrollRect.bottom,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
        scrollTop: scroll.scrollTop
      };
      spacer.remove();
      scroll.scrollTop = 0;
      return result;
    });
    assert(desktopDockStability.scrollHeight > desktopDockStability.clientHeight, `${name}: dock test should create overflowing scene content`);
    assert(desktopDockStability.scrollTop > 0, `${name}: desktop scene region should accept independent scrolling`);
    assert(Math.abs(desktopDockStability.beforeTop - desktopDockStability.afterTop) <= 1, `${name}: scene scrolling should not move the command shelf top edge`);
    assert(Math.abs(desktopDockStability.beforeBottom - desktopDockStability.afterBottom) <= 1, `${name}: scene scrolling should not move the command shelf bottom edge`);
    assert(desktopDockStability.scrollBottom <= desktopDockStability.afterTop + 1, `${name}: overflowing scene content should remain above the command shelf`);

    const desktopSurfaceStability = await page.evaluate(() => {
      const measure = () => {
        const stage = document.querySelector('.stage');
        const main = document.getElementById('panel-main');
        const surface = document.getElementById('desktop-play-surface');
        const center = document.getElementById('desktop-play-cell-center');
        const stageStyle = getComputedStyle(stage);
        const mainRect = main.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();
        const centerRect = center.getBoundingClientRect();
        return {
          stageColumns: stageStyle.gridTemplateColumns,
          stageTargetEmpty: stage.classList.contains('target-panel-empty'),
          mainWidth: mainRect.width,
          surfaceWidth: surfaceRect.width,
          centerWidth: centerRect.width
        };
      };
      const originalCreatures = [...App.creatures];
      const tile = App._currentExplorationTile?.();
      const originalTileCreatures = Array.isArray(tile?.creatures) ? [...tile.creatures] : null;
      const originalTileItems = Array.isArray(tile?.items) ? [...tile.items] : null;
      const withTargets = measure();
      App.creatures = [];
      if (tile) {
        tile.creatures = [];
        tile.items = [];
      }
      App.renderCreatures();
      App.renderDesktopPlaySurface();
      const withoutTargets = measure();
      App.creatures = originalCreatures;
      if (tile) {
        if (originalTileCreatures) tile.creatures = originalTileCreatures;
        if (originalTileItems) tile.items = originalTileItems;
      }
      App.renderCreatures();
      App.renderDesktopPlaySurface();
      return { withTargets, withoutTargets };
    });
    assert.strictEqual(desktopSurfaceStability.withTargets.stageTargetEmpty, false, `${name}: desktop stability setup should start with a target panel`);
    assert.strictEqual(desktopSurfaceStability.withoutTargets.stageTargetEmpty, true, `${name}: desktop stability setup should exercise the empty target-panel layout`);
    assert(Math.abs(desktopSurfaceStability.withTargets.surfaceWidth - desktopSurfaceStability.withoutTargets.surfaceWidth) <= 2, `${name}: desktop play surface width should stay stable when the local target panel collapses`);
    assert(Math.abs(desktopSurfaceStability.withTargets.centerWidth - desktopSurfaceStability.withoutTargets.centerWidth) <= 2, `${name}: desktop center tile width should stay stable when the local target panel collapses`);

    const desktopTraversalRectContract = await page.evaluate(() => {
      const tile = App._currentExplorationTile?.();
      const originalCreatures = [...(App.creatures || [])];
      const originalTileCreatures = tile && Array.isArray(tile.creatures) ? [...tile.creatures] : null;
      const originalTileItems = tile && Array.isArray(tile.items) ? [...tile.items] : null;
      const hadStructure = tile && Object.prototype.hasOwnProperty.call(tile, 'structure');
      const originalStructure = hadStructure ? tile.structure : undefined;
      const originalTargets = [...(App.explorationTargetIds || [])];
      const originalActorIds = [...(App.explorationActorIds || [])];
      const originalFocusedStageObject = App.focusedStageObject || null;
      const originalPendingIntent = App.pendingIntent || null;
      const originalIntentSelection = App.intentSelection ? { ...App.intentSelection } : null;

      const rectFor = el => {
        const rect = el.getBoundingClientRect();
        return {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom)
        };
      };
      const measure = label => ({
        label,
        surface: rectFor(document.getElementById('desktop-play-surface')),
        grid: rectFor(document.getElementById('desktop-neighborhood-grid')),
        center: rectFor(document.getElementById('desktop-play-cell-center')),
        south: rectFor(document.getElementById('desktop-play-cell-s')),
        sceneFeed: rectFor(document.getElementById('desktop-scene-feed-slot')),
        composer: rectFor(document.getElementById('desktop-command-composer')),
        targetPanelEmpty: document.querySelector('.stage')?.classList.contains('target-panel-empty') || false
      });
      const render = () => {
        App.renderCreatures();
        App.renderMap();
        App.renderExplorationActions();
        App.renderDesktopPlaySurface();
      };
      const clearSelection = () => {
        App.explorationTargetIds = [];
        App.explorationActorIds = [];
        App.focusedStageObject = null;
        App.pendingIntent = null;
        App.intentSelection = null;
      };

      clearSelection();
      App.creatures = [];
      if (tile) {
        tile.creatures = [];
        tile.items = [];
        delete tile.structure;
      }
      render();
      const empty = measure('empty');

      if (tile) tile.items = [{ id: 'desktop-stability-herb', name: 'Stability Herb' }];
      render();
      const locationAction = measure('location action');

      const stableCreature = {
        id: 'desktop-stability-creature',
        name: 'Stability Mousefolk',
        species: 'human',
        icon: '🐭',
        disposition: App.DISPOSITION.NEUTRAL,
        CPun: 100,
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
      App.creatures = [stableCreature];
      if (tile) tile.creatures = App.creatures;
      render();
      const creature = measure('creature');

      App.toggleExplorationTarget('creature', 'desktop-stability-creature');
      const target = measure('target');

      App.creatures = originalCreatures;
      if (tile) {
        if (originalTileCreatures) tile.creatures = originalTileCreatures;
        else delete tile.creatures;
        if (originalTileItems) tile.items = originalTileItems;
        else delete tile.items;
        if (hadStructure) tile.structure = originalStructure;
        else delete tile.structure;
      }
      App.explorationTargetIds = originalTargets;
      App.explorationActorIds = originalActorIds;
      App.focusedStageObject = originalFocusedStageObject;
      App.pendingIntent = originalPendingIntent;
      App.intentSelection = originalIntentSelection;
      render();
      return { empty, locationAction, creature, target };
    });
    const assertDesktopRectStable = (actual, expected, state, part) => {
      for (const key of ['left', 'top', 'width', 'height']) {
        assert(Math.abs(actual[key] - expected[key]) <= 1, `${name}: desktop ${part} ${key} should stay stable when ${state} appears`);
      }
    };
    assert.strictEqual(desktopTraversalRectContract.empty.targetPanelEmpty, true, `${name}: desktop controlled stability baseline should start without a target panel`);
    assert.strictEqual(desktopTraversalRectContract.creature.targetPanelEmpty, false, `${name}: desktop controlled stability state should exercise a visible target panel`);
    ['locationAction', 'creature', 'target'].forEach(state => {
      assertDesktopRectStable(desktopTraversalRectContract[state].surface, desktopTraversalRectContract.empty.surface, state, '3x3 surface');
      assertDesktopRectStable(desktopTraversalRectContract[state].center, desktopTraversalRectContract.empty.center, state, 'center tile');
    });
    ['empty', 'locationAction', 'creature', 'target'].forEach(state => {
      const rects = desktopTraversalRectContract[state];
      assert(rects.grid.top >= rects.surface.top + 4 && rects.grid.bottom <= rects.surface.bottom - 4, `${name}: desktop 3x3 traversal grid should keep focus-ring clearance inside the play surface when ${state} appears`);
      assert(rects.sceneFeed.top >= rects.south.bottom + 1, `${name}: desktop Scene Feed should stay below the south traversal row when ${state} appears`);
    });

    await page.evaluate(() => App.toggleExplorationTarget('creature', 'creature-1'));
    await page.waitForTimeout(50);
    const desktopComposerOwnership = await page.evaluate(() => {
      const center = document.getElementById('desktop-play-cell-center');
      const title = document.getElementById('scene-title');
      const description = document.getElementById('scene-description');
      const eventFeed = document.getElementById('tile-event-feed');
      const sceneActions = document.getElementById('scene-actions');
      const shell = document.getElementById('desktop-command-composer');
      const belt = document.getElementById('desktop-context-belt');
      const sentence = document.getElementById('selection-sentence');
      const partyPanel = document.getElementById('party-content');
      const creaturePanel = document.getElementById('enemies-content');
      const centerRect = center.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const beltRect = belt.getBoundingClientRect();
      const sceneActionsRect = sceneActions.getBoundingClientRect();
      const sceneActionsParent = sceneActions?.parentElement;
      const visibleButtons = selector => Array.from(document.querySelectorAll(selector)).filter(button => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(button).visibility !== 'hidden';
      }).map(button => {
        const rect = button.getBoundingClientRect();
        return {
          label: button.textContent.trim(),
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          control: button.getAttribute('data-command-control') || '',
          intent: button.getAttribute('data-command-intent') || '',
          surface: button.getAttribute('data-command-surface') || ''
        };
      });
      const beltButtons = visibleButtons('#desktop-context-belt button');
      const commandSelector = '[data-command-surface], button, [role="button"], input, select, textarea, .action-btn, [onclick]';
      const gameplayCommandCount = node => Array.from(node?.querySelectorAll(commandSelector) || [])
        .filter(command => command.getAttribute('data-command-surface') !== 'story-controls')
        .length;
      const centerCommands = gameplayCommandCount(center);
      const storyCommands = [title, description, eventFeed].reduce((count, node) => {
        if (!node) return count;
        return count + gameplayCommandCount(node);
      }, 0);
      const firstBeltButton = beltButtons[0] || null;
      return {
        markedTargets: [...App.explorationTargetIds],
        shellDisplay: getComputedStyle(shell).display,
        shellHidden: Boolean(shell.hidden),
        shellAriaHidden: shell.getAttribute('aria-hidden'),
        shellSurface: shell.getAttribute('data-command-surface'),
        shellMode: shell.getAttribute('data-command-mode'),
        shellGrammar: shell.getAttribute('data-command-grammar'),
        shellTargetCount: shell.getAttribute('data-command-target-count'),
        shellInsideMain: shellRect.left >= centerRect.left - 1 && shellRect.right <= centerRect.right + 1,
        beltSurface: belt.getAttribute('data-command-surface'),
        beltMode: belt.getAttribute('data-command-mode'),
        beltGrammar: belt.getAttribute('data-command-grammar'),
        beltTargetCount: belt.getAttribute('data-command-target-count'),
        beltVisible: beltRect.width > 0 && beltRect.height > 0,
        beltInsideViewport: beltRect.left >= -1 && beltRect.right <= innerWidth + 1 && beltRect.top >= -1 && beltRect.bottom <= innerHeight + 1,
        sentenceText: sentence.innerText || '',
        beltButtonCount: beltButtons.length,
        firstBeltButton,
        beltButtonsUsable: beltButtons.every(button => button.left >= -1 && button.right <= innerWidth + 1 && button.width >= 58 && button.height >= 38),
        hasFightIntent: beltButtons.some(button => button.intent === 'fight'),
        hasClearExit: beltButtons.some(button => button.control === 'clear-targets'),
        centerCommands,
        storyCommands,
        centerHasStoryTitle: Boolean(center.querySelector('#scene-title')),
        centerHasPresenceVisual: Boolean(center.querySelector('#center-presence [data-stage-layer="presence"]')),
        sceneActionsInsideCenter: Boolean(center.querySelector('#scene-actions')),
        sceneActionsParentId: sceneActionsParent?.id || '',
        sceneActionsHidden: Boolean(sceneActions.hidden) && getComputedStyle(sceneActions).display === 'none' && sceneActionsRect.height === 0,
        sceneActionsEmpty: (sceneActions.innerHTML || '').trim() === '',
        partyCompactCards: partyPanel.querySelectorAll('[data-card-role="compact-tactical"]').length,
        creatureCompactCards: creaturePanel.querySelectorAll('[data-card-role="compact-tactical"]').length,
        partyHasActorRouting: Boolean(partyPanel.querySelector('[data-command-control="focus-actor"]')),
        creatureHasTargetRouting: Boolean(creaturePanel.querySelector('[data-command-control="focus-target"]')),
        panelIntentSpam: Boolean(partyPanel.querySelector('[data-command-intent="fight"], [data-command-intent="flirt"], [data-command-intent="feed"]') || creaturePanel.querySelector('[data-command-intent="fight"], [data-command-intent="flirt"], [data-command-intent="feed"]')),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.deepStrictEqual(desktopComposerOwnership.markedTargets, ['creature:creature-1'], `${name}: desktop setup should mark the creature target`);
    assert.notStrictEqual(desktopComposerOwnership.shellDisplay, 'none', `${name}: desktop command composer should become visible when a target is marked`);
    assert.strictEqual(desktopComposerOwnership.shellHidden, false, `${name}: desktop command composer should unhide when active`);
    assert.strictEqual(desktopComposerOwnership.shellAriaHidden, 'false', `${name}: active desktop command composer should be available to assistive tech`);
    assert.strictEqual(desktopComposerOwnership.shellSurface, 'command-composer', `${name}: desktop command shell should identify composer ownership`);
    assert.strictEqual(desktopComposerOwnership.shellMode, 'exploration', `${name}: desktop command shell should identify exploration mode`);
    assert.strictEqual(desktopComposerOwnership.shellGrammar, 'actor-target-intent', `${name}: desktop command shell should identify shared grammar`);
    assert.strictEqual(desktopComposerOwnership.shellTargetCount, '1', `${name}: desktop command shell should mirror target count`);
    assert.strictEqual(desktopComposerOwnership.beltSurface, 'target-intents', `${name}: desktop belt should identify target-intent ownership`);
    assert.strictEqual(desktopComposerOwnership.beltMode, 'exploration', `${name}: desktop belt should identify exploration mode`);
    assert.strictEqual(desktopComposerOwnership.beltGrammar, 'actor-target-intent', `${name}: desktop belt should identify shared grammar`);
    assert.strictEqual(desktopComposerOwnership.beltTargetCount, '1', `${name}: desktop belt should mirror target count`);
    assert.strictEqual(desktopComposerOwnership.beltVisible, true, `${name}: desktop target-intent belt should be visible`);
    assert.strictEqual(desktopComposerOwnership.beltInsideViewport, true, `${name}: desktop target-intent belt should stay inside the viewport`);
    assert(desktopComposerOwnership.sentenceText.includes('You') && desktopComposerOwnership.sentenceText.includes('Creature'), `${name}: desktop composer sentence should summarize actor and target`);
    assert(desktopComposerOwnership.beltButtonCount >= 2, `${name}: desktop target-intent belt should expose visible intents and an exit`);
    assert.strictEqual(desktopComposerOwnership.firstBeltButton?.control, 'clear-targets', `${name}: desktop target-intent belt should put the clear-target exit first`);
    assert.strictEqual(desktopComposerOwnership.beltButtonsUsable, true, `${name}: desktop target-intent belt buttons should remain usable and in bounds`);
    assert.strictEqual(desktopComposerOwnership.hasFightIntent, true, `${name}: desktop target-intent belt should expose Fight`);
    assert.strictEqual(desktopComposerOwnership.hasClearExit, true, `${name}: desktop target-intent belt should expose Clear`);
    assert.strictEqual(desktopComposerOwnership.centerCommands, 0, `${name}: desktop center stage should not own command controls`);
    assert.strictEqual(desktopComposerOwnership.storyCommands, 0, `${name}: desktop story/event content should stay read-only`);
    assert.strictEqual(desktopComposerOwnership.centerHasStoryTitle, true, `${name}: desktop center should retain story presentation`);
    assert.strictEqual(desktopComposerOwnership.centerHasPresenceVisual, true, `${name}: desktop center should retain passive stage presence`);
    assert.strictEqual(desktopComposerOwnership.sceneActionsInsideCenter, false, `${name}: legacy action slot should live outside the center presentation tile`);
    assert.strictEqual(desktopComposerOwnership.sceneActionsParentId, 'scene-display', `${name}: legacy action slot should be parked outside stage/story/composer surfaces`);
    assert.strictEqual(desktopComposerOwnership.sceneActionsHidden, true, `${name}: legacy action slot should stay hard-hidden`);
    assert.strictEqual(desktopComposerOwnership.sceneActionsEmpty, true, `${name}: legacy action slot should stay empty`);
    assert(desktopComposerOwnership.partyCompactCards >= 1, `${name}: desktop party panel should provide compact actor cards`);
    assert(desktopComposerOwnership.creatureCompactCards >= 1, `${name}: desktop creature panel should provide compact target cards`);
    assert.strictEqual(desktopComposerOwnership.partyHasActorRouting, true, `${name}: desktop party panel should own actor routing controls`);
    assert.strictEqual(desktopComposerOwnership.creatureHasTargetRouting, true, `${name}: desktop creature panel should own target routing controls`);
    assert.strictEqual(desktopComposerOwnership.panelIntentSpam, false, `${name}: desktop compact panels should not duplicate primary intent buttons`);
    assert.strictEqual(desktopComposerOwnership.pageOverflow, false, `${name}: active desktop composer should not create horizontal overflow`);
    await page.evaluate(() => App.clearExplorationTargets());
    const desktopCenterAfterComposer = await page.evaluate(() => {
      const center = document.getElementById('desktop-play-cell-center');
      const rect = center.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    });

    const readDesktopIntentBounds = async label => page.evaluate(menuLabel => {
      const menu = document.getElementById('desktop-intent-menu');
      if (!menu) return { label: menuLabel, exists: false };
      const rect = menu.getBoundingClientRect();
      const style = getComputedStyle(menu);
      const buttons = Array.from(menu.querySelectorAll('button')).filter(btn => {
        const buttonRect = btn.getBoundingClientRect();
        return buttonRect.width > 0 && buttonRect.height > 0;
      });
      return {
        label: menuLabel,
        exists: true,
        role: menu.getAttribute('role'),
        ariaModal: menu.getAttribute('aria-modal'),
        presentation: menu.getAttribute('data-intent-presentation'),
        overflowY: style.overflowY,
        zIndex: Number.parseInt(style.zIndex, 10) || 0,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        visibleButtons: buttons.length,
        clippedButtons: buttons.filter(btn => {
          const buttonRect = btn.getBoundingClientRect();
          return buttonRect.left < rect.left - 1 ||
            buttonRect.top < rect.top - 1 ||
            buttonRect.right > rect.right + 1 ||
            buttonRect.bottom > rect.bottom + 1;
        }).map(btn => btn.textContent.trim())
      };
    }, label);

    const livingIntentSuppressed = await page.evaluate(() => App.showIntentMenu('creature', 'creature-1', 'desktop', 'desktop') === false && !document.getElementById('desktop-intent-menu'));
    assert(livingIntentSuppressed, `${name}: living desktop intent menu should stay suppressed in favor of marked-target actions`);
    const corpseIntentSuppressed = await page.evaluate(() => App.showIntentMenu('creature', 'corpse-1', 'desktop', 'desktop') === false && !document.getElementById('desktop-intent-menu'));
    assert(corpseIntentSuppressed, `${name}: corpse desktop intent menu should stay suppressed in favor of marked-target actions`);
    await page.evaluate(() => App.openIntentSubActionSheet('creature', 'creature-1', 'fight', 'desktop'));
    await page.waitForTimeout(50);
    const desktopIntentMenu = await readDesktopIntentBounds('desktop intent menu');
    const desktopSubActionSheet = desktopIntentMenu;
    assert(desktopSubActionSheet.exists, `${name}: desktop sub-action sheet should render`);
    assert.strictEqual(desktopSubActionSheet.role, 'dialog', `${name}: desktop sub-action sheet should use dialog semantics`);
    assert.strictEqual(desktopSubActionSheet.ariaModal, 'true', `${name}: desktop sub-action sheet should be modal`);
    assert.strictEqual(desktopSubActionSheet.presentation, 'desktop', `${name}: desktop sub-action sheet should declare desktop presentation`);
    assert(desktopSubActionSheet.overflowY === 'auto' || desktopSubActionSheet.overflowY === 'scroll', `${name}: desktop sub-action sheet should be scrollable`);
    assert(desktopSubActionSheet.zIndex > desktopPanels.party.zIndex, `${name}: desktop sub-action sheet should layer above side panels`);
    assert(desktopSubActionSheet.top >= -1, `${name}: desktop sub-action sheet should not clip above viewport`);
    assert(desktopSubActionSheet.left >= -1, `${name}: desktop sub-action sheet should not clip left`);
    assert(desktopSubActionSheet.right <= desktopSubActionSheet.viewportWidth + 1, `${name}: desktop sub-action sheet should not clip right`);
    assert(desktopSubActionSheet.bottom <= desktopSubActionSheet.viewportHeight + 1, `${name}: desktop sub-action sheet should not clip below viewport`);
    assert(desktopSubActionSheet.visibleButtons >= 3, `${name}: desktop sub-action sheet should expose reachable action buttons`);
    assert.deepStrictEqual(desktopSubActionSheet.clippedButtons, [], `${name}: desktop sub-action sheet buttons should not clip`);
    await page.evaluate(() => App.closeIntentMenu());

    await page.evaluate(() => togglePanel('map'));
    await page.waitForTimeout(50);
    const mapOverlay = await page.evaluate(previousCenter => {
      const read = id => {
        const el = document.getElementById(id);
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          display: style.display,
          position: style.position,
          active: el.classList.contains('active'),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          zIndex: Number.parseInt(style.zIndex, 10) || 0
        };
      };
      return {
        map: read('panel-map'),
        party: read('panel-party'),
        enemies: read('panel-enemies'),
        center: read('desktop-play-cell-center'),
        previousCenter
      };
    }, desktopCenterAfterComposer);
    assert.strictEqual(mapOverlay.map.active, true, `${name}: desktop Map toggle should activate the map overlay`);
    assert.notStrictEqual(mapOverlay.map.display, 'none', `${name}: desktop map overlay should become visible after toggling Map`);
    assert.strictEqual(mapOverlay.map.position, 'fixed', `${name}: desktop map should be a fixed overlay`);
    assert(mapOverlay.map.zIndex > mapOverlay.party.zIndex, `${name}: desktop map overlay should layer above side panels`);
    assert(mapOverlay.map.left >= -1 && mapOverlay.map.right <= width + 1, `${name}: desktop map overlay should stay inside viewport horizontally`);
    assert(mapOverlay.map.top >= 59 && mapOverlay.map.bottom <= height + 1, `${name}: desktop map overlay should stay below the header and inside the viewport`);
    assert.notStrictEqual(mapOverlay.party.display, 'none', `${name}: desktop party panel should remain rendered behind the map overlay`);
    assert.notStrictEqual(mapOverlay.enemies.display, 'none', `${name}: desktop creatures panel should remain rendered behind the map overlay`);
    assert(Math.abs(mapOverlay.center.left - mapOverlay.previousCenter.left) <= 1, `${name}: opening desktop map should not reflow center play tile horizontally`);
    assert(Math.abs(mapOverlay.center.top - mapOverlay.previousCenter.top) <= 1, `${name}: opening desktop map should not reflow center play tile vertically`);
  }

  await page.close();
}

async function checkShortMenuScrollFallback(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 360 }, isMobile: true });
  await page.goto(distUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App), null, { timeout: 5000 });
  await page.evaluate(() => {
    App.closeTutorial?.();
    document.documentElement.style.setProperty('--base-font-size', '20px');
  });
  await page.waitForTimeout(50);

  const before = await page.evaluate(() => {
    const menu = document.getElementById('screen-menu');
    const footer = menu.querySelector('.menu-footer');
    return {
      scrollable: menu.scrollHeight > menu.clientHeight + 1,
      overflowY: getComputedStyle(menu).overflowY,
      horizontalOverflow: menu.scrollWidth > menu.clientWidth + 1,
      footerBottom: footer.getBoundingClientRect().bottom,
      viewportHeight: innerHeight
    };
  });
  assert.strictEqual(before.scrollable, true, 'short large-text menu: content should use the vertical scroll fallback');
  assert(before.overflowY === 'auto' || before.overflowY === 'scroll', 'short large-text menu: vertical overflow should remain scrollable');
  assert.strictEqual(before.horizontalOverflow, false, 'short large-text menu: content should not overflow horizontally');
  assert(before.footerBottom > before.viewportHeight, 'short large-text menu: overflow fixture should extend below the initial viewport');

  await page.evaluate(() => {
    const menu = document.getElementById('screen-menu');
    menu.scrollTop = menu.scrollHeight;
  });
  await page.waitForTimeout(50);
  const after = await page.evaluate(() => {
    const menu = document.getElementById('screen-menu');
    const footerRect = menu.querySelector('.menu-footer').getBoundingClientRect();
    return {
      reachedBottom: menu.scrollTop > 0 && menu.scrollTop + menu.clientHeight >= menu.scrollHeight - 1,
      footerVisible: footerRect.top >= -1 && footerRect.bottom <= innerHeight + 1
    };
  });
  assert.strictEqual(after.reachedBottom, true, 'short large-text menu: the scroll fallback should reach the end of the menu');
  assert.strictEqual(after.footerVisible, true, 'short large-text menu: footer should remain reachable after scrolling');
  await page.close();
}

async function checkScopedStartupReadiness(browser) {
  const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
  await page.goto(distUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.App && window.YAW_STARTUP_READINESS), null, { timeout: 5000 });
  await page.waitForFunction(() => ['ready', 'error'].includes(YAW_STARTUP_READINESS.state('modules')?.status), null, { timeout: 5000 });
  await page.evaluate(() => App.closeTutorial?.());

  await page.evaluate(() => {
    window.__startupDeferred = {};
    const deferred = name => new Promise(resolve => { window.__startupDeferred[name] = resolve; });
    YAW_STARTUP_READINESS.start('saves', () => deferred('saves'), { label: 'saved games', force: true });
    YAW_STARTUP_READINESS.start('installedMedia', () => deferred('media'), { label: 'installed media', force: true });
    YAW_STARTUP_READINESS.start('bundledAssets', () => deferred('assets'), { label: 'visual assets', blocking: false, force: true });
    App.syncStartupReadinessUI();
  });
  const pending = await page.evaluate(() => ({
    newGameDisabled: document.getElementById('menu-new-game').disabled,
    loadDisabled: document.getElementById('menu-load-game').disabled,
    modsDisabled: document.getElementById('menu-mods').disabled,
    settingsDisabled: document.querySelector('[data-command-control="open-settings"]').disabled,
    helpDisabled: document.querySelector('[data-command-control="open-help"]').disabled,
    busy: document.getElementById('menu-load-game').getAttribute('aria-busy'),
    status: document.getElementById('menu-startup-status-text').textContent
  }));
  assert.strictEqual(pending.newGameDisabled, true, 'startup readiness: New Game should wait for required save and content state');
  assert.strictEqual(pending.loadDisabled, true, 'startup readiness: Load should wait for save discovery');
  assert.strictEqual(pending.modsDisabled, true, 'startup readiness: Mods should wait for installed media');
  assert.strictEqual(pending.settingsDisabled, false, 'startup readiness: Settings should remain available');
  assert.strictEqual(pending.helpDisabled, false, 'startup readiness: Help should remain available');
  assert.strictEqual(pending.busy, 'true', 'startup readiness: gated controls should expose aria-busy');
  assert(pending.status.includes('saved games') && pending.status.includes('installed media'), 'startup readiness: live status should identify pending domains');

  await page.evaluate(async () => {
    window.__startupDeferred.saves(null);
    window.__startupDeferred.media(null);
    window.__startupDeferred.assets({ terrainUrl: 'blob:test', overlayUrl: 'blob:test-overlay' });
    await Promise.all([
      YAW_STARTUP_READINESS.state('saves').promise,
      YAW_STARTUP_READINESS.state('installedMedia').promise,
      YAW_STARTUP_READINESS.state('bundledAssets').promise
    ]);
    YAW_STARTUP_READINESS.start('modules', async () => { throw new Error('delayed test failure'); }, { label: 'mods', force: true });
    await YAW_STARTUP_READINESS.state('modules').promise;
    App.syncStartupReadinessUI();
  });
  const failed = await page.evaluate(() => ({
    statusState: document.getElementById('menu-startup-status').dataset.state,
    retryHidden: document.getElementById('menu-startup-retry').hidden,
    modsDisabled: document.getElementById('menu-mods').disabled,
    settingsDisabled: document.querySelector('[data-command-control="open-settings"]').disabled,
    activityError: App.log.some(entry => entry.errorCode === 'startup_modules_failed')
  }));
  assert.strictEqual(failed.statusState, 'error', 'startup readiness: failures should become a visible error state');
  assert.strictEqual(failed.retryHidden, false, 'startup readiness: failed domains should expose Retry');
  assert.strictEqual(failed.modsDisabled, true, 'startup readiness: a failed module domain should remain gated');
  assert.strictEqual(failed.settingsDisabled, false, 'startup readiness: unrelated controls should remain available after failure');
  assert.strictEqual(failed.activityError, true, 'startup readiness: failures should be recorded in the Activity Log');
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await checkFileOriginFirstRunMenu(browser);
    await checkScopedStartupReadiness(browser);
    await checkShortMenuScrollFallback(browser);
    await checkViewport(browser, 'small phone 320', 320, 568);
    await checkViewport(browser, 'reported mobile', 412, 915);
    await checkViewport(browser, 'handoff mobile 390', 390, 844);
    await checkViewport(browser, 'narrow mobile 360', 360, 780);
    await checkViewport(browser, 'mobile', 393, 852);
    await checkViewport(browser, 'short mobile', 313, 670);
    await checkViewport(browser, 'compact tablet landscape', 742, 768);
    await checkViewport(browser, 'tablet portrait', 768, 1024);
    await checkViewport(browser, 'compact desktop', 1100, 768);
    await checkViewport(browser, 'desktop', 1365, 768);
  } finally {
    await browser.close();
  }
  console.log('Viewport checks passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
