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
    App.worldMap = new Map([['0,0', { ...App.getBaseTile(0, 0), x: 0, y: 0, explored: true, biome: 'grove', items: [{ id: 'test-item', name: 'Test Item' }] }]]);
    App.tileDeltas = new Map();
    App.exploredTiles = new Set(['0,0']);
    App.inventory = [];
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
      const sheet = document.querySelector('.mobile-scene-sheet');
      const actions = document.getElementById('mobile-explore-actions');
      const creatureCue = document.getElementById('mobile-creature-presence-cue');
      const cueButton = creatureCue?.querySelector('button');
      const moveToggle = document.getElementById('mobile-move-toggle');
      const dockRect = dock.getBoundingClientRect();
      const beltRect = belt.getBoundingClientRect();
      const cueRect = creatureCue.getBoundingClientRect();
      const moveToggleRect = moveToggle.getBoundingClientRect();
      const beltStyle = getComputedStyle(belt);
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
        beltHasControls: belt.classList.contains('has-controls'),
        surfaceHasBeltPadding: document.getElementById('mobile-play-surface')?.classList.contains('has-control-belt') || false,
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
    assert.strictEqual(mobileControls.beltPosition, 'fixed', `${name}: mobile context belt should be fixed above the dock`);
    assert.notStrictEqual(mobileControls.beltDisplay, 'none', `${name}: populated mobile context belt should be visible`);
    assert.strictEqual(mobileControls.beltHasControls, true, `${name}: populated mobile context belt should mark real controls`);
    assert.strictEqual(mobileControls.surfaceHasBeltPadding, true, `${name}: mobile play surface should reserve padding for the fixed context belt`);
    assert(mobileControls.beltLeft >= -1 && mobileControls.beltRight <= mobileControls.viewportWidth + 1, `${name}: mobile context belt should stay inside viewport horizontally`);
    assert(mobileControls.beltTop >= 0, `${name}: mobile context belt should not clip above viewport`);
    assert(mobileControls.beltBottom <= mobileControls.dockTop + 1, `${name}: mobile context belt should sit above the fixed dock`);
    assert(mobileControls.dockTop - mobileControls.beltBottom <= 24, `${name}: mobile context belt should stay visually attached to the dock`);
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
    assert(markedControls.sentenceText.toLowerCase().includes('targets'), `${name}: mobile actor target sentence should move into the control belt when target state exists`);
    assert(markedControls.trayBottom <= markedControls.dockTop + 1, `${name}: marked target tray should stay above the fixed dock`);
    assert.strictEqual(markedControls.moveExpanded, false, `${name}: move pad should close when target tray opens`);
    assert.strictEqual(markedControls.moveAria, 'false', `${name}: move toggle aria state should reflect collapsed target-tray mode`);
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
    const corpseMenu = await readContextMenuBounds('corpse menu');
    assert(corpseMenu.exists, `${name}: corpse long-press menu should render`);
    assert.strictEqual(corpseMenu.role, 'dialog', `${name}: corpse long-press menu should use dialog semantics`);
    assert.strictEqual(corpseMenu.ariaModal, 'true', `${name}: corpse long-press menu should be modal`);
    assert(corpseMenu.overflowY === 'auto' || corpseMenu.overflowY === 'scroll', `${name}: corpse long-press menu should be scrollable`);
    assert(corpseMenu.top >= -1, `${name}: corpse long-press menu should not clip above viewport`);
    assert(corpseMenu.left >= -1, `${name}: corpse long-press menu should not clip left`);
    assert(corpseMenu.right <= corpseMenu.viewportWidth + 1, `${name}: corpse long-press menu should not clip right`);
    assert(corpseMenu.bottom <= corpseMenu.viewportHeight + 1, `${name}: corpse long-press menu should not clip below viewport`);
    if (corpseMenu.toolbarVisible) assert(corpseMenu.bottom <= corpseMenu.toolbarTop + 1, `${name}: corpse long-press menu should stay above mobile toolbar`);
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
    await page.evaluate(() => App.showIntentMenu('creature', 'corpse-1', 'desktop', 'desktop'));
    await page.waitForTimeout(50);
    const desktopIntentMenu = await readDesktopIntentBounds('desktop intent menu');
    assert(desktopIntentMenu.exists, `${name}: desktop intent menu should render`);
    assert.strictEqual(desktopIntentMenu.role, 'dialog', `${name}: desktop intent menu should use dialog semantics`);
    assert.strictEqual(desktopIntentMenu.ariaModal, 'true', `${name}: desktop intent menu should be modal`);
    assert.strictEqual(desktopIntentMenu.presentation, 'desktop', `${name}: desktop intent menu should declare desktop presentation`);
    assert(desktopIntentMenu.overflowY === 'auto' || desktopIntentMenu.overflowY === 'scroll', `${name}: desktop intent menu should be scrollable`);
    assert(desktopIntentMenu.zIndex > desktopPanels.party.zIndex, `${name}: desktop intent menu should layer above side panels`);
    assert(desktopIntentMenu.top >= -1, `${name}: desktop intent menu should not clip above viewport`);
    assert(desktopIntentMenu.left >= -1, `${name}: desktop intent menu should not clip left`);
    assert(desktopIntentMenu.right <= desktopIntentMenu.viewportWidth + 1, `${name}: desktop intent menu should not clip right`);
    assert(desktopIntentMenu.bottom <= desktopIntentMenu.viewportHeight + 1, `${name}: desktop intent menu should not clip below viewport`);
    assert(desktopIntentMenu.visibleButtons >= 3, `${name}: desktop intent menu should expose reachable utility buttons`);
    assert.deepStrictEqual(desktopIntentMenu.clippedButtons, [], `${name}: desktop intent menu buttons should not clip`);

    await page.evaluate(() => App.openIntentSubActionSheet('creature', 'creature-1', 'fight', 'desktop'));
    await page.waitForTimeout(50);
    const desktopSubActionSheet = await readDesktopIntentBounds('desktop sub-action sheet');
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
    }, desktopPanels.center);
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
    await checkViewport(browser, 'mobile', 393, 852);
    await checkViewport(browser, 'desktop', 1365, 768);
  } finally {
    await browser.close();
  }
  console.log('Viewport checks passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
