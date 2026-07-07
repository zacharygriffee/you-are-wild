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
      const unitStripsRect = unitStrips.getBoundingClientRect();
      const creatureCardRect = creatureCard.getBoundingClientRect();
      const tileInfoRect = tileInfo.getBoundingClientRect();
      const miniMapRect = miniMap.getBoundingClientRect();
      const centerTileRect = centerTile.getBoundingClientRect();
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
        mapBottom: mapRect.bottom,
        miniMapBottom: miniMapRect.bottom,
        unitStripsTop: unitStripsRect.top,
        creatureCardTop: creatureCardRect.top,
        tileInfoBottom: tileInfoRect.bottom,
        miniMapTop: miniMapRect.top,
        miniMapHeight: miniMapRect.height,
        centerTileWidth: centerTileRect.width,
        centerTileHeight: centerTileRect.height,
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
    assert(mobileControls.mapHeight <= Math.min(340, mobileControls.viewportHeight * 0.5) + 1, `${name}: mobile traversal map should not absorb short viewport height`);
    assert(mobileControls.mapBottom <= mobileControls.beltTop + 1, `${name}: mobile traversal map should stay above the command belt`);
    assert(mobileControls.miniMapBottom <= mobileControls.mapBottom + 1, `${name}: mobile traversal grid should fit inside the Play Surface card`);
    assert(mobileControls.beltBottom <= mobileControls.unitStripsTop + 1, `${name}: mobile command belt should stay before cast rails in the play surface`);
    assert(mobileControls.miniMapTop - mobileControls.tileInfoBottom >= 6, `${name}: mobile tile metadata should not overlap the traversal grid`);
    assert(mobileControls.miniMapHeight >= Math.min(204, mobileControls.viewportHeight * 0.3), `${name}: mobile traversal grid should keep a usable minimum height`);
    assert(mobileControls.centerTileWidth >= 176, `${name}: mobile current tile should keep a broad target column for stage presence`);
    assert(mobileControls.centerTileHeight >= 144, `${name}: mobile current tile should leave room for larger presence controls`);
    assert(mobileControls.centerPresenceCount >= 1, `${name}: mobile current tile should expose clickable presence badges`);
    assert(mobileControls.centerPresenceCount <= 2, `${name}: mobile current tile should summarize dense presence instead of wrapping controls out of the tile`);
    assert(mobileControls.minCenterPresenceWidth >= 72 && mobileControls.minCenterPresenceHeight >= 72, `${name}: mobile current tile presence badges should keep roomy finger-sized tap targets`);
    assert(mobileControls.minCenterPresenceFontSize >= 30, `${name}: mobile current tile presence badges should keep readable visible symbols`);
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
