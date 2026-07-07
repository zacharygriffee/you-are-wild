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

async function checkViewport(browser, name, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 600 });
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
      closeSlot: close?.getAttribute('data-command-slot') || ''
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
  assert(returnedMenu.visibleActions.length >= 5, `${name}: returned menu should expose primary menu actions`);
  assert(returnedMenu.visibleActions.every(button => button.width >= 44 && button.height >= 44), `${name}: returned menu actions should remain tappable`);
  assert.strictEqual(returnedMenu.pageOverflow, false, `${name}: closing Settings should not introduce menu horizontal overflow`);

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

  await page.evaluate(() => App.showSaveManager('new'));
  await page.waitForTimeout(50);
  const save = await page.evaluate(() => {
    const root = document.getElementById('save-manager');
    const box = root?.querySelector('.save-manager-modal, .modal-content, .save-manager-content') || root?.firstElementChild || root;
    const rect = box.getBoundingClientRect();
    const visibleButtons = Array.from(root.querySelectorAll('button')).filter(btn => {
      const r = btn.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).length;
    return {
      display: getComputedStyle(root).display,
      overflowY: getComputedStyle(box).overflowY,
      top: rect.top,
      bottom: rect.bottom,
      visibleButtons,
      viewportHeight: innerHeight
    };
  });
  assert.notStrictEqual(save.display, 'none', `${name}: save manager should be visible`);
  assert(save.overflowY === 'auto' || save.overflowY === 'scroll', `${name}: save manager content should be scrollable`);
  assert(save.top >= -1, `${name}: save manager should not clip above viewport`);
  assert(save.bottom <= save.viewportHeight + 1, `${name}: save manager should not clip below viewport`);
  assert(save.visibleButtons >= 2, `${name}: save manager should expose reachable actions`);

  await page.evaluate(makeUnitScript());
  if (width < 600) {
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
      const belt = document.getElementById('mobile-control-belt');
      const map = document.querySelector('.mobile-map-card');
      const tileInfo = document.getElementById('mobile-tile-info');
      const miniMap = document.getElementById('mobile-mini-map');
      const centerTile = document.querySelector('#mobile-mini-map .map-tile.center');
      const movementCells = Array.from(document.querySelectorAll('#mobile-mini-map .map-tile.moveable'));
      const centerPresenceButtons = Array.from(document.querySelectorAll('#mobile-mini-map .map-tile.center .mobile-play-presence-dot, #mobile-mini-map .map-tile.center .mobile-play-presence-more'));
      const sheet = document.querySelector('.mobile-scene-sheet');
      const actions = document.getElementById('mobile-explore-actions');
      const unitStrips = document.querySelector('.mobile-unit-strips');
      const creatureCard = document.getElementById('mobile-creature-card');
      const creatureCue = document.getElementById('mobile-creature-presence-cue');
      const cueButton = creatureCue?.querySelector('button');
      const detailButtons = Array.from(document.querySelectorAll('.mobile-strip-details-btn'));
      const moveToggle = document.getElementById('mobile-move-toggle');
      const dockRect = dock.getBoundingClientRect();
      const beltRect = belt.getBoundingClientRect();
      const mapRect = map.getBoundingClientRect();
      const sheetRect = sheet.getBoundingClientRect();
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
      const detailButtonRects = detailButtons.map(button => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
      const visibleDetailButtonRects = detailButtonRects.filter(rect => rect.width > 0 && rect.height > 0);
      const cueRect = creatureCue.getBoundingClientRect();
      const moveToggleRect = moveToggle.getBoundingClientRect();
      const beltStyle = getComputedStyle(belt);
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
        sheetHeight: sheetRect.height,
        sheetBottom: sheetRect.bottom,
        miniMapBottom: miniMapRect.bottom,
        unitStripsTop: unitStripsRect.top,
        creatureCardTop: creatureCardRect.top,
        tileInfoBottom: tileInfoRect.bottom,
        miniMapTop: miniMapRect.top,
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
        centerPresenceInsideTile: centerPresenceRects.every(rect => (
          rect.left >= centerTileRect.left - 1
          && rect.right <= centerTileRect.right + 1
          && rect.top >= centerTileRect.top - 1
          && rect.bottom <= centerTileRect.bottom + 1
        )),
        centerPresenceCount: centerPresenceRects.length,
        minCenterPresenceWidth: Math.min(...centerPresenceRects.map(rect => rect.width)),
        minCenterPresenceHeight: Math.min(...centerPresenceRects.map(rect => rect.height)),
        minCenterPresenceFontSize: Math.min(...centerPresenceRects.map(rect => rect.fontSize)),
        detailButtonCount: detailButtonRects.length,
        visibleDetailButtonCount: visibleDetailButtonRects.length,
        minVisibleDetailButtonWidth: Math.min(...visibleDetailButtonRects.map(rect => rect.width)),
        minVisibleDetailButtonHeight: Math.min(...visibleDetailButtonRects.map(rect => rect.height)),
        visibleDetailsInsideViewport: visibleDetailButtonRects.every(rect => rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
        visibleDetailsAboveDock: visibleDetailButtonRects.every(rect => rect.bottom <= dockRect.top + 1),
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        locationActionsText: actions?.innerText || '',
        locationActionsInSheet: Boolean(sheet?.querySelector('#mobile-explore-actions')),
        sheetActionButtons: sheet ? sheet.querySelectorAll('.action-btn').length : 0,
        creatureCueText: creatureCue?.innerText || '',
        creatureCueVisible: Boolean(cueButton) && getComputedStyle(creatureCue).display !== 'none' && cueRect.width > 0 && cueRect.height > 0,
        creatureCueTop: cueRect.top,
        creatureCueBottom: cueRect.bottom,
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
    assert.strictEqual(mobileControls.beltPosition, 'static', `${name}: mobile context belt should participate in layout without covering stage or cast rails`);
    assert.notStrictEqual(mobileControls.beltDisplay, 'none', `${name}: populated mobile context belt should be visible`);
    assert.strictEqual(mobileControls.beltHasControls, true, `${name}: populated mobile context belt should mark real controls`);
    assert.strictEqual(mobileControls.surfaceHasBeltPadding, true, `${name}: mobile play surface should reserve dock space when the context belt is populated`);
    assert(mobileControls.beltLeft >= -1 && mobileControls.beltRight <= mobileControls.viewportWidth + 1, `${name}: mobile context belt should stay inside viewport horizontally`);
    assert(mobileControls.beltTop >= 0, `${name}: mobile context belt should not clip above viewport`);
    assert.strictEqual(mobileControls.beltCreatureOverlap, 0, `${name}: mobile context belt should not cover compact creature rail`);
    assert.strictEqual(mobileControls.beltUnitStripOverlap, 0, `${name}: mobile context belt should not cover cast rail container`);
    assert(mobileControls.sheetHeight <= 150, `${name}: mobile story capsule should stay compact above the traversal stage`);
    assert(mobileControls.sheetBottom <= mobileControls.mapTop + 1, `${name}: mobile story capsule should not overlap the traversal map`);
    assert(mobileControls.mapHeight <= Math.min(340, mobileControls.viewportHeight * 0.5) + 1, `${name}: mobile traversal map should not absorb short viewport height`);
    assert(mobileControls.mapBottom <= mobileControls.beltTop + 1, `${name}: mobile traversal map should stay above the command belt`);
    assert(mobileControls.miniMapBottom <= mobileControls.mapBottom + 1, `${name}: mobile traversal grid should fit inside the Play Surface card`);
    assert(mobileControls.beltBottom <= mobileControls.unitStripsTop + 1, `${name}: mobile command belt should stay before cast rails in the play surface`);
    assert(mobileControls.miniMapTop - mobileControls.tileInfoBottom >= 6, `${name}: mobile tile metadata should not overlap the traversal grid`);
    assert(mobileControls.miniMapHeight >= Math.min(204, mobileControls.viewportHeight * 0.3), `${name}: mobile traversal grid should keep a usable minimum height`);
    assert.strictEqual(mobileControls.movementCellCount, 8, `${name}: mobile traversal grid should expose eight movement cells`);
    assert(mobileControls.minMovementCellWidth >= 44 && mobileControls.minMovementCellHeight >= 44, `${name}: mobile movement cells should keep finger-sized tap targets`);
    assert.strictEqual(mobileControls.movementCellsInsideMap, true, `${name}: mobile movement cells should stay inside the traversal grid`);
    assert(mobileControls.centerTileWidth >= 176, `${name}: mobile current tile should keep a broad target column for stage presence`);
    assert(mobileControls.centerTileHeight >= 144, `${name}: mobile current tile should leave room for larger presence controls`);
    assert(mobileControls.centerPresenceCount >= 1, `${name}: mobile current tile should expose clickable presence badges`);
    assert(mobileControls.centerPresenceCount <= 2, `${name}: mobile current tile should summarize dense presence instead of wrapping controls out of the tile`);
    assert(mobileControls.minCenterPresenceWidth >= 80 && mobileControls.minCenterPresenceHeight >= 80, `${name}: mobile current tile presence badges should keep roomy finger-sized tap targets`);
    assert(mobileControls.minCenterPresenceFontSize >= 34, `${name}: mobile current tile presence badges should keep readable visible symbols`);
    assert.strictEqual(mobileControls.centerPresenceInsideTile, true, `${name}: mobile current tile presence badges should stay inside the center tile`);
    assert(mobileControls.centerTileBottom <= mobileControls.mapBottom + 1, `${name}: mobile current tile should not clip below the Play Surface card`);
    assert.strictEqual(mobileControls.detailButtonCount, 2, `${name}: mobile party and creature rails should expose explicit Details routes`);
    assert(mobileControls.visibleDetailButtonCount >= 1, `${name}: visible mobile rail should expose an explicit Details route`);
    assert(mobileControls.minVisibleDetailButtonWidth >= 78 && mobileControls.minVisibleDetailButtonHeight >= 34, `${name}: visible mobile rail Details routes should keep usable tap targets`);
    assert.strictEqual(mobileControls.visibleDetailsInsideViewport, true, `${name}: visible mobile rail Details routes should stay inside the viewport`);
    assert.strictEqual(mobileControls.visibleDetailsAboveDock, true, `${name}: visible mobile rail Details routes should stay above the fixed dock`);
    assert(mobileControls.controlBeltHasLocationActions, `${name}: location actions should live in the control belt`);
    assert(mobileControls.locationActionsText.includes('Items'), `${name}: location action row should expose tile-local actions in the control belt`);
    assert.strictEqual(mobileControls.locationActionsInSheet, false, `${name}: presentation sheet should not contain location actions`);
    assert.strictEqual(mobileControls.sheetActionButtons, 0, `${name}: presentation sheet should not contain duplicated full action controls`);
    assert.strictEqual(mobileControls.creatureCueVisible, true, `${name}: tile with a living creature should expose a visible mobile creature cue without scrolling`);
    assert(mobileControls.creatureCueText.includes('Here: Creature'), `${name}: mobile creature cue should summarize the first visible creature`);
    assert.strictEqual(mobileControls.creatureCueInSheet, false, `${name}: mobile creature cue should not reintroduce a HERE block into the presentation sheet`);
    assert(mobileControls.creatureCueTop >= 0, `${name}: mobile creature cue should not start above the viewport`);
    assert(mobileControls.creatureCueBottom <= mobileControls.dockTop + 1, `${name}: mobile creature cue should stay above the fixed dock`);
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
    assert(openHistoryDrawer.sheetHeightWhileOpen <= 150, `${name}: opening mobile history should not expand the compact story capsule`);
    await page.evaluate(() => {
      document.getElementById('mobile-activity-log').open = false;
    });

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

    await page.evaluate(() => App.toggleMobileActorBelt());
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
        beltInsideViewport: beltRect.left >= -1 && beltRect.right <= innerWidth + 1 && beltRect.top >= 0 && beltRect.bottom <= dockRect.top + 1,
        trayInsideBelt: overlapArea(trayRect, beltRect) >= (trayRect.width * trayRect.height) - 2,
        actorReachableInBelt: actorScrollTop > 0 || overlapArea(actorRect, beltRect) >= (actorRect.width * actorRect.height) - 2,
        trayButtonCount: trayButtons.length,
        actorButtonCount: actorButtons.length,
        trayButtonsUsable: everyUsable(trayButtons, 44, 30),
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
    assert.strictEqual(expandedComposer.actorExpanded, 'true', `${name}: mobile Actors toggle should expose expanded state`);
    assert.strictEqual(expandedComposer.rowVisible, true, `${name}: active mobile composer row should be visible`);
    assert.strictEqual(expandedComposer.sentenceVisible, true, `${name}: active mobile composer should keep the selection sentence visible`);
    assert(expandedComposer.sentenceText.includes('You') && expandedComposer.sentenceText.includes('Creature'), `${name}: active mobile composer sentence should summarize actor and target`);
    assert.strictEqual(expandedComposer.traySurface, 'target-intents', `${name}: active mobile target tray should identify target-intent ownership`);
    assert.strictEqual(expandedComposer.trayGrammar, 'actor-target-intent', `${name}: active mobile target tray should identify shared grammar`);
    assert.strictEqual(expandedComposer.actorSurface, 'actor-target-routing', `${name}: active mobile actor belt should identify actor routing ownership`);
    assert.strictEqual(expandedComposer.actorGrammar, 'actor-target-intent', `${name}: active mobile actor belt should identify shared grammar`);
    assert.strictEqual(expandedComposer.beltInsideViewport, true, `${name}: expanded mobile composer should stay inside the viewport and above the fixed dock`);
    assert.strictEqual(expandedComposer.trayInsideBelt, true, `${name}: expanded mobile target tray should stay inside the composer belt`);
    assert.strictEqual(expandedComposer.actorReachableInBelt, true, `${name}: expanded mobile actor rail should be reachable inside the composer belt`);
    assert(expandedComposer.trayButtonCount >= 2, `${name}: expanded mobile target tray should expose visible target intents and an exit`);
    assert(expandedComposer.actorButtonCount >= 2, `${name}: expanded mobile actor rail should expose visible actors and an exit`);
    assert.strictEqual(expandedComposer.trayButtonsUsable, true, `${name}: visible mobile target intent controls should remain tappable`);
    assert.strictEqual(expandedComposer.actorButtonsUsable, true, `${name}: visible mobile actor controls should remain tappable`);
    assert.strictEqual(expandedComposer.hasActorChip, true, `${name}: expanded mobile actor rail should expose party actors`);
    assert.strictEqual(expandedComposer.hasActorExit, true, `${name}: expanded mobile actor rail should expose a visible exit`);
    assert.strictEqual(expandedComposer.hasClearTargetExit, true, `${name}: expanded mobile target tray should expose a clear-target exit`);
    assert.strictEqual(expandedComposer.pageOverflow, false, `${name}: expanded mobile composer should not create horizontal overflow`);
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
        turnQueue: [{ unit: App.player, initiative: 10 }, { unit: enemy, initiative: 5 }],
        syncActions: [],
        processing: false
      };
      App.log.push({ text: 'You hit Enemy for 4.', type: 'combat', actorName: 'You', action: 'fight' });
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
      const latest = document.querySelector('.mobile-combat-latest-strip');
      const mobileDesc = document.getElementById('mobile-scene-description');
      const dockRect = dock.getBoundingClientRect();
      const latestRect = latest.getBoundingClientRect();
      const controlRect = controlBelt.getBoundingClientRect();
      return {
        mapDisplay: getComputedStyle(map).display,
        controlDisplay: getComputedStyle(controlBelt).display,
        controlHeight: controlRect.height,
        latestText: latest?.innerText || '',
        latestTop: latestRect.top,
        latestBottom: latestRect.bottom,
        dockTop: dockRect.top,
        descHasBoxedRecent: Boolean(mobileDesc?.querySelector('.combat-recent-exchange')),
        descHasTurnOrder: Boolean(mobileDesc?.querySelector('.combat-turn-order')),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      };
    });
    assert.strictEqual(mobileCombat.mapDisplay, 'none', `${name}: mobile combat should hide traversal map`);
    assert.strictEqual(mobileCombat.controlDisplay, 'none', `${name}: empty exploration control belt should hide during combat`);
    assert.strictEqual(mobileCombat.controlHeight, 0, `${name}: hidden exploration control belt should not consume combat space`);
    assert(mobileCombat.latestText.includes('You hit Enemy for 4.'), `${name}: mobile combat should expose one latest-exchange strip`);
    assert(mobileCombat.latestTop >= 0, `${name}: latest-exchange strip should be visible in the viewport`);
    assert(mobileCombat.latestBottom <= mobileCombat.dockTop + 1, `${name}: latest-exchange strip should stay above the fixed dock`);
    assert.strictEqual(mobileCombat.descHasBoxedRecent, false, `${name}: mobile combat should not embed the boxed recent-exchange list`);
    assert.strictEqual(mobileCombat.descHasTurnOrder, false, `${name}: mobile combat should not embed the full turn-order box`);
    assert.strictEqual(mobileCombat.pageOverflow, false, `${name}: mobile combat strip should not create horizontal overflow`);
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
    assert(desktopPanels.center.width > 0 && desktopPanels.center.height > 0, `${name}: desktop center play tile should be visible`);

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
      const centerCommands = center.querySelectorAll('[data-command-surface], button, [role="button"], input, select, textarea, .action-btn, [onclick]').length;
      const storyCommands = [title, description, eventFeed].reduce((count, node) => {
        if (!node) return count;
        return count + node.querySelectorAll('[data-command-surface], button, [role="button"], input, select, textarea, .action-btn, [onclick]').length;
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

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await checkViewport(browser, 'reported mobile', 412, 915);
    await checkViewport(browser, 'handoff mobile 390', 390, 844);
    await checkViewport(browser, 'narrow mobile 360', 360, 780);
    await checkViewport(browser, 'mobile', 393, 852);
    await checkViewport(browser, 'short mobile', 313, 670);
    await checkViewport(browser, 'desktop', 1365, 768);
  } finally {
    await browser.close();
  }
  console.log('Viewport checks passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
