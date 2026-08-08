#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const OFFLINE_BUILD = path.join(ROOT, 'dist', 'you-are-wild.html');
const HOSTED_BUILD = path.join(ROOT, 'dist', 'you-are-wild.hosted.html');
const STARTUP_TIMEOUT = 30000;

function alphaUrl(base) {
  const url = new URL(base);
  url.searchParams.set('alphaScenario', 'terrain-composition');
  url.searchParams.set('terrainRenderer', 'canvas-v1');
  return url.href;
}

async function serveHostedBuild() {
  const html = fs.readFileSync(HOSTED_BUILD);
  const mediaRoot = path.join(ROOT, 'media');
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/' || pathname === '/you-are-wild.hosted.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(html);
      return;
    }
    if (pathname === '/yaw-service.json' || pathname.endsWith('/yaw-host.json')) {
      response.writeHead(204, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    if (pathname.startsWith('/media/') || pathname.startsWith('/assets/')) {
      const prefix = pathname.startsWith('/media/') ? '/media/' : '/assets/';
      const mediaPath = path.resolve(mediaRoot, pathname.slice(prefix.length));
      if (mediaPath.startsWith(`${mediaRoot}${path.sep}`) && fs.existsSync(mediaPath) && fs.statSync(mediaPath).isFile()) {
        const contentType = path.extname(mediaPath).toLowerCase() === '.png' ? 'image/png' : 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
        fs.createReadStream(mediaPath).pipe(response);
        return;
      }
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}/you-are-wild.hosted.html`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function waitForCanvasAlpha(page, gridSelector) {
  try {
    await page.waitForFunction(selector => {
      const grid = document.querySelector(selector);
      return Boolean(window.App?.alphaSession?.scenarioId === 'terrain-composition'
        && grid?.classList.contains('yaw-terrain-canvas-alpha')
        && grid.querySelector('canvas.yaw-terrain-world-canvas'));
    }, gridSelector, { timeout: STARTUP_TIMEOUT });
  } catch (error) {
    const state = await page.evaluate(selector => {
      const grid = document.querySelector(selector);
      return {
        ready: document.readyState,
        alpha: window.App?.alphaSession?.scenarioId || null,
        screen: window.App?.screen || null,
        grid: Boolean(grid),
        alphaClass: Boolean(grid?.classList.contains('yaw-terrain-canvas-alpha')),
        canvasCount: grid?.querySelectorAll('canvas.yaw-terrain-world-canvas').length || 0,
        rect: grid ? { width: grid.getBoundingClientRect().width, height: grid.getBoundingClientRect().height } : null
      };
    }, gridSelector).catch(() => ({ evaluation: 'failed' }));
    throw new Error(`Canvas Alpha did not mount: ${JSON.stringify(state)}`, { cause: error });
  }
}

async function exerciseNavigation(page, viewport, origin) {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error?.message || error)));
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'warning' && /^Sparse save .* took \d+ms/m.test(text)) return;
    if (['warning', 'error'].includes(message.type())) errors.push(`${message.type()}: ${text}`);
  });
  await page.setViewportSize(viewport);
  const gridSelector = viewport.width <= 1024 ? '#mobile-mini-map' : '#desktop-neighborhood-grid';
  const centerSelector = viewport.width <= 1024
    ? '#mobile-mini-map [data-mobile-play-cell="center"]'
    : '#desktop-map-cell-center';
  const eastSelector = viewport.width <= 1024
    ? '#mobile-mini-map [data-mobile-play-cell="e"]'
    : '#desktop-play-cell-e';
  const northwestSelector = viewport.width <= 1024
    ? '#mobile-mini-map [data-mobile-play-cell="nw"]'
    : '#desktop-play-cell-nw';

  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  try {
    await waitForCanvasAlpha(page, gridSelector);
    await page.waitForFunction(() => window.YAW_TERRAIN_CANVAS_V1?.assetStatus?.().count >= 8, null, { timeout: STARTUP_TIMEOUT });
  } catch (error) {
    throw new Error(`${error.message}; console: ${errors.join(' | ')}`, { cause: error });
  }

  const initial = await page.evaluate(selector => {
    const grid = document.querySelector(selector);
    window.__yawTerrainCanvasBeforeMovement = grid.querySelector('canvas.yaw-terrain-world-canvas');
    return {
      location: { ...App.location },
      explored: App.exploredTiles.size,
      worldTiles: App.worldMap.size,
      canvases: grid.querySelectorAll('canvas.yaw-terrain-world-canvas').length,
      totalCanvases: document.querySelectorAll('canvas.yaw-terrain-world-canvas').length,
      controls: grid.querySelectorAll('.yaw-terrain-canvas-controls').length,
      mode: grid.getAttribute('data-terrain-camera-mode'),
      assets: YAW_TERRAIN_CANVAS_V1.assetStatus(),
      viewLabel: grid.querySelector('.yaw-terrain-canvas-mode')?.textContent || '',
      inspectorHidden: grid.querySelector('.yaw-terrain-canvas-inspector')?.hidden,
      diagnostics: YAW_TERRAIN_CANVAS_ALPHA.diagnostics()[0] || null,
      tileLabelBackgrounds: [...grid.querySelectorAll('.desktop-play-cell-label, .mobile-play-tile-label')]
        .map(label => getComputedStyle(label).backgroundImage)
    };
  }, gridSelector);
  assert.deepStrictEqual(initial.location, { x: 0, y: 0 }, 'Canvas Alpha must begin at its deterministic origin');
  assert.strictEqual(initial.canvases, 1, 'The active terrain surface must contain exactly one Canvas');
  assert.strictEqual(initial.totalCanvases, 1, 'Hidden responsive layouts must not allocate inactive Canvas surfaces');
  assert.strictEqual(initial.controls, 1, 'The active terrain surface must contain exactly one camera control group');
  assert.strictEqual(initial.mode, 'local', 'Canvas Alpha must begin in local mode');
  assert.ok(initial.assets.ready && initial.assets.count >= 8, 'The first-party Canvas art pack must be ready before visual acceptance checks');
  assert.match(initial.viewLabel, /^View: Local$/, 'The local camera status must read as state rather than a duplicate Local button');
  assert.strictEqual(initial.inspectorHidden, true, 'The local movement view must not cover terrain with a duplicate map inspector');
  assert.ok(initial.diagnostics?.renderStats?.dynamicPresenceCount >= 1,
    'The Canvas display pass must retain live party presence outside cached terrain chunks');
  assert.ok(initial.tileLabelBackgrounds.every(background => background === 'none'),
    'Local semantic labels must not reintroduce a visible per-tile gradient grid over the Canvas');

  await page.evaluate(selector => {
    const grid = document.querySelector(selector);
    const rect = grid.getBoundingClientRect();
    grid.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 180,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    }));
  }, gridSelector);
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('data-terrain-camera-mode') === 'regional', gridSelector);
  const intermediate = await page.evaluate(selector => {
    const grid = document.querySelector(selector);
    return {
      location: { ...App.location },
      suppressed: grid.querySelectorAll(':scope > [data-terrain-input-suppressed][aria-hidden="true"][inert]').length,
      cells: grid.querySelectorAll(':scope > .map-tile, :scope > .desktop-play-cell').length
    };
  }, gridSelector);
  assert.deepStrictEqual(intermediate.location, initial.location, 'Intermediate zoom must not move the party');
  assert.strictEqual(intermediate.suppressed, intermediate.cells,
    'Intermediate zoom must suppress fixed 3x3 controls whose hit regions no longer align with Canvas tiles');
  await page.locator(`${gridSelector} [data-terrain-view="local"]`).click();
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('data-terrain-camera-mode') === 'local', gridSelector);
  await page.evaluate(selector => {
    window.__yawTerrainCanvasBeforeMovement = document.querySelector(selector)
      ?.querySelector('canvas.yaw-terrain-world-canvas') || null;
  }, gridSelector);

  const movementStarted = performance.now();
  await page.locator(eastSelector).click();
  await page.waitForFunction(() => App.location.x === 1 && App.location.y === 0);
  const movementElapsed = performance.now() - movementStarted;
  const moved = await page.evaluate(({ gridSelector, centerSelector }) => ({
    location: { ...App.location },
    centerLabel: document.querySelector(centerSelector)?.getAttribute('aria-label') || '',
    sameCanvas: window.__yawTerrainCanvasBeforeMovement
      === document.querySelector(gridSelector)?.querySelector('canvas.yaw-terrain-world-canvas'),
    canvases: document.querySelector(gridSelector)?.querySelectorAll('canvas.yaw-terrain-world-canvas').length || 0,
    controls: document.querySelector(gridSelector)?.querySelectorAll('.yaw-terrain-canvas-controls').length || 0,
    mode: document.querySelector(gridSelector)?.getAttribute('data-terrain-camera-mode'),
    diagnostics: YAW_TERRAIN_CANVAS_ALPHA.diagnostics()[0] || null,
    moveNarration: App.log.filter(entry => String(entry.text || '').startsWith('Moved to ')).length
  }), { gridSelector, centerSelector });
  assert.deepStrictEqual(moved.location, { x: 1, y: 0 }, 'A local Canvas click must dispatch one authoritative move');
  assert.match(moved.centerLabel, /\(1, 0\)/, 'The local semantic center must follow the moved player');
  assert.strictEqual(moved.moveNarration, 1, 'A Canvas click must produce exactly one movement narration');
  assert.strictEqual(moved.sameCanvas, true, 'Movement must preserve the mounted Canvas surface and its raster cache');
  assert.strictEqual(moved.canvases, 1, 'Movement must not duplicate the Canvas');
  assert.strictEqual(moved.controls, 1, 'Movement must not duplicate camera controls');
  assert.strictEqual(moved.mode, 'local', 'Movement from the 3x3 view must keep the camera in the 3x3 view');
  assert.ok(moved.diagnostics?.renderStats?.dynamicPresenceCount >= 1,
    'Movement must repaint live party presence without baking it into a terrain chunk');
  assert.ok((moved.diagnostics?.renderStats?.cacheHits ?? 0) >= 1,
    'Warm local movement must reuse at least one cached terrain chunk');
  assert.strictEqual(moved.diagnostics?.renderStats?.cacheMisses, 0,
    'Warm in-chunk movement must not rebuild unchanged terrain chunks');
  assert.ok(movementElapsed < 1000,
    `One local Canvas move must settle within the broad mobile latency gate, received ${Math.round(movementElapsed)}ms`
    + ` (${JSON.stringify(moved.diagnostics?.renderStats || {})})`);

  const visualMutation = await page.evaluate(async selector => {
    const grid = document.querySelector(selector);
    const canvas = grid?.querySelector('canvas.yaw-terrain-world-canvas') || null;
    const tile = App.getTile(App.location.x, App.location.y);
    const marker = { id: 'terrain-canvas-cache-test-item', name: 'Cache test marker', quantity: 1 };
    tile.items = Array.isArray(tile.items) ? tile.items : [];
    tile.items.push(marker);
    App.markCurrentWorldTileDirty('terrain-canvas-cache-test');
    App.renderMap();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const diagnostics = YAW_TERRAIN_CANVAS_ALPHA.diagnostics()[0] || null;
    const result = {
      sameCanvas: canvas === grid?.querySelector('canvas.yaw-terrain-world-canvas'),
      canvases: grid?.querySelectorAll('canvas.yaw-terrain-world-canvas').length || 0,
      controls: grid?.querySelectorAll('.yaw-terrain-canvas-controls').length || 0,
      diagnostics
    };
    tile.items = tile.items.filter(item => item !== marker);
    App.markCurrentWorldTileDirty('terrain-canvas-cache-test-cleanup');
    App.renderMap();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return result;
  }, gridSelector);
  assert.strictEqual(visualMutation.sameCanvas, true,
    'A legitimate tile visual mutation must preserve the mounted Canvas surface');
  assert.strictEqual(visualMutation.canvases, 1,
    'A legitimate tile visual mutation must not duplicate the Canvas');
  assert.strictEqual(visualMutation.controls, 1,
    'A legitimate tile visual mutation must not duplicate camera controls');
  assert.ok((visualMutation.diagnostics?.renderStats?.cacheMisses ?? 0) >= 1,
    'A legitimate tile visual mutation must rebuild its affected terrain chunk');
  assert.ok((visualMutation.diagnostics?.renderStats?.cacheHits ?? 0) >= 1,
    'A legitimate tile visual mutation must reuse unaffected cached terrain chunks');

  await page.locator(northwestSelector).click({ force: true });
  const blocked = await page.evaluate(() => ({
    location: { ...App.location },
    narrated: App.log.some(entry => /four cardinal directions/i.test(String(entry.text || ''))),
    duplicateToast: App.toasts.some(toast => /four cardinal directions/i.test(String(toast.text || '')))
  }));
  assert.deepStrictEqual(blocked.location, { x: 1, y: 0 }, 'A blocked Canvas attempt must not move the party');
  assert.strictEqual(blocked.narrated, true, 'A blocked Canvas attempt must reach core narration');
  assert.strictEqual(blocked.duplicateToast, false, 'A blocked Canvas attempt must remain narrative-only without a warning toast');

  const mapButton = page.locator(`${gridSelector} [data-terrain-view="survey"]`);
  await mapButton.click();
  await page.waitForFunction(() => App.worldMap.size >= 81
    && App.exploredTiles.size >= 81
    && App.tileDeltas.size >= 81);
  const surveyStart = await page.evaluate(selector => {
    const grid = document.querySelector(selector);
    return {
      location: { ...App.location },
      explored: App.exploredTiles.size,
      worldTiles: App.worldMap.size,
      mode: grid.getAttribute('data-terrain-camera-mode'),
      suppressed: grid.querySelectorAll(':scope > [data-terrain-input-suppressed][aria-hidden="true"][inert]').length,
      localCells: grid.querySelectorAll(':scope > .map-tile, :scope > .desktop-play-cell').length,
      label: grid.querySelector('.yaw-terrain-canvas-mode')?.textContent || '',
      inspectorHidden: grid.querySelector('.yaw-terrain-canvas-inspector')?.hidden,
      inspectorText: grid.querySelector('.yaw-terrain-canvas-inspector')?.textContent || '',
      inspectorRole: grid.querySelector('.yaw-terrain-canvas-inspector')?.getAttribute('role'),
      liveStatusCount: grid.querySelectorAll('[role="status"][aria-live]').length,
      surveyTiles: grid.querySelectorAll('.yaw-terrain-canvas-survey-list > li').length,
      surveyText: grid.querySelector('.yaw-terrain-canvas-survey-list')?.textContent || '',
      surveyRevision: grid.querySelector('.yaw-terrain-canvas-survey-list')?.dataset.revision || '',
      drawCount: YAW_TERRAIN_CANVAS_ALPHA.diagnostics()[0]?.drawCount || 0
    };
  }, gridSelector);
  assert.notStrictEqual(surveyStart.mode, 'local', 'Map control must enter the shared survey camera');
  assert.strictEqual(surveyStart.suppressed, surveyStart.localCells, 'Survey mode must remove the local 3x3 plane from input and accessibility');
  assert.strictEqual(surveyStart.inspectorHidden, false, 'Survey mode must expose a visible bounded terrain inspector');
  assert.match(surveyStart.inspectorText, /camera at 1, 0/i, 'Survey inspector must describe the current camera coordinate');
  assert.strictEqual(surveyStart.inspectorRole, null, 'The visible inspector must not duplicate the hidden live status region');
  assert.strictEqual(surveyStart.liveStatusCount, 1, 'Survey camera changes must have exactly one polite live status region');
  assert.strictEqual(surveyStart.surveyTiles, 9, 'Survey mode must expose one bounded semantic 3x3 neighborhood');
  assert.match(surveyStart.surveyText, /Center: beach at 1, 0/i, 'The semantic survey list must identify the cursor tile without relying on pixels');
  await page.waitForTimeout(250);
  const settledSurvey = await page.evaluate(selector => ({
    revision: document.querySelector(selector)?.querySelector('.yaw-terrain-canvas-survey-list')?.dataset.revision || '',
    drawCount: YAW_TERRAIN_CANVAS_ALPHA.diagnostics()[0]?.drawCount || 0
  }), gridSelector);
  assert.strictEqual(settledSurvey.revision, surveyStart.surveyRevision,
    'Canvas-owned survey semantics must settle after authoritative terrain generation');
  assert.strictEqual(settledSurvey.drawCount, surveyStart.drawCount,
    'Canvas-owned survey DOM must not invalidate and redraw itself after settling');

  await mapButton.press('ArrowRight');
  const surveyKey = await page.evaluate(selector => ({
    location: { ...App.location },
    explored: App.exploredTiles.size,
    worldTiles: App.worldMap.size,
    label: document.querySelector(selector)?.querySelector('.yaw-terrain-canvas-mode')?.textContent || ''
  }), gridSelector);
  assert.deepStrictEqual(surveyKey.location, surveyStart.location, 'Survey arrow keys must pan the camera rather than move the party');
  assert.notStrictEqual(surveyKey.label, surveyStart.label, 'Survey arrow keys must announce the updated camera center');
  assert.strictEqual(surveyKey.explored, surveyStart.explored, 'Survey camera input must not reveal terrain');
  assert.strictEqual(surveyKey.worldTiles, surveyStart.worldTiles, 'Survey camera input must not materialize unknown world tiles');

  const recenterButton = page.locator(`${gridSelector} [data-terrain-view="recenter"]`);
  await recenterButton.click();
  const recenteredSurvey = await page.evaluate(selector => ({
    location: { ...App.location },
    label: document.querySelector(selector)?.querySelector('.yaw-terrain-canvas-mode')?.textContent || ''
  }), gridSelector);
  assert.deepStrictEqual(recenteredSurvey.location, surveyStart.location, 'Survey recentering must not move the party');
  assert.match(recenteredSurvey.label, /1, 0$/, 'The explicit survey recovery control must recenter on the authoritative party location');

  const grid = page.locator(gridSelector);
  const box = await grid.boundingBox();
  assert.ok(box, 'The active Canvas terrain grid must have a visible bounding box');
  await grid.click({ position: { x: Math.round(box.width * 0.78), y: Math.round(box.height * 0.72) } });
  const surveyClick = await page.evaluate(() => ({
    location: { ...App.location },
    explored: App.exploredTiles.size
  }));
  assert.deepStrictEqual(surveyClick.location, surveyStart.location, 'Survey pointer inspection must never move the party');
  assert.strictEqual(surveyClick.explored, surveyStart.explored, 'Survey pointer inspection must never reveal terrain');

  const localButton = page.locator(`${gridSelector} [data-terrain-view="local"]`);
  await localButton.click();
  const localRestored = await page.evaluate(selector => {
    const grid = document.querySelector(selector);
    return {
      mode: grid.getAttribute('data-terrain-camera-mode'),
      suppressed: grid.querySelectorAll('[data-terrain-input-suppressed], [inert]').length
    };
  }, gridSelector);
  assert.strictEqual(localRestored.mode, 'local', 'Local control must return the shared camera to the player');
  assert.strictEqual(localRestored.suppressed, 0, 'Local control must restore the semantic movement plane');

  await page.evaluate(() => App.togglePanel('map'));
  const unifiedMap = await page.evaluate(selector => ({
    mode: document.querySelector(selector)?.getAttribute('data-terrain-camera-mode'),
    location: { ...App.location },
    legacyPanelActive: document.querySelector('#panel-map')?.classList.contains('active') || false
  }), gridSelector);
  assert.notStrictEqual(unifiedMap.mode, 'local', 'The ordinary Map command must open the unified Canvas survey camera');
  assert.deepStrictEqual(unifiedMap.location, surveyStart.location, 'Opening the unified Map must not move the party');
  assert.strictEqual(unifiedMap.legacyPanelActive, false, 'The ordinary Map command must not open a second legacy map compositor while Canvas is active');
  const focusedMap = await page.evaluate(selector => {
    const before = {
      location: { ...App.location }, timeHour: App.timeHour,
      explored: App.exploredTiles.size, worldTiles: App.worldMap.size
    };
    App.quests = [{
      id: 'canvas-map-quest', title: 'Survey marker', status: 'active', lifecycleState: 'active',
      objectives: [{
        id: 'canvas-map-objective', objective: 'Reach the marked terrain', complete: false,
        checkpoints: [{ x: 3, y: 2, label: 'Quest objective', complete: false }]
      }]
    }];
    const focused = App.focusQuestOnMap('canvas-map-quest', 'canvas-map-objective');
    const grid = document.querySelector(selector);
    const marker = grid?.querySelector('.yaw-terrain-canvas-focus-marker');
    return {
      focused,
      mode: grid?.getAttribute('data-terrain-camera-mode'),
      markerHidden: marker?.hidden,
      markerTitle: marker?.getAttribute('title') || '',
      status: grid?.querySelector('.yaw-terrain-canvas-inspection')?.textContent || '',
      inspector: grid?.querySelector('.yaw-terrain-canvas-inspector')?.textContent || '',
      before,
      after: {
        location: { ...App.location }, timeHour: App.timeHour,
        explored: App.exploredTiles.size, worldTiles: App.worldMap.size
      }
    };
  }, gridSelector);
  assert.strictEqual(focusedMap.focused, true, 'Quest commands must be able to focus the unified Canvas survey');
  assert.notStrictEqual(focusedMap.mode, 'local', 'A focused map target must remain in the non-movement survey camera');
  assert.strictEqual(focusedMap.markerHidden, false, 'A focused map target must have one bounded Canvas overlay marker');
  assert.strictEqual(focusedMap.markerTitle, 'Quest objective', 'The Canvas focus marker must retain its semantic label');
  assert.match(focusedMap.status, /focused on Quest objective at 3, 2/i, 'Canvas focus must be announced without depending on pixels');
  assert.match(focusedMap.inspector, /focused on Quest objective at 3, 2/i, 'Canvas focus must remain visibly inspectable');
  assert.deepStrictEqual(focusedMap.after, focusedMap.before,
    'Focusing a quest must not move time, reveal terrain, materialize world tiles, or move the party');

  const turnInFocus = await page.evaluate(selector => {
    App.quests.push({
      id: 'canvas-turn-in-quest', title: 'Return the survey', status: 'active', lifecycleState: 'objectives_complete',
      turnInPolicy: { type: 'named_location', location: { x: 4, y: 1, label: 'Turn-in camp' } }
    });
    const focused = App.focusQuestTurnInOnMap('canvas-turn-in-quest');
    const grid = document.querySelector(selector);
    return {
      focused,
      status: grid?.querySelector('.yaw-terrain-canvas-inspection')?.textContent || '',
      markerTitle: grid?.querySelector('.yaw-terrain-canvas-focus-marker')?.getAttribute('title') || ''
    };
  }, gridSelector);
  assert.strictEqual(turnInFocus.focused, true, 'Quest turn-in commands must use the renderer-neutral map focus route');
  assert.match(turnInFocus.status, /focused on Turn-in camp at 4, 1/i, 'Quest turn-in focus must be announced through the Canvas survey');
  assert.strictEqual(turnInFocus.markerTitle, 'Turn-in camp', 'Quest turn-in focus must retain its semantic label');

  const poiFocus = await page.evaluate(selector => {
    const before = {
      location: { ...App.location }, timeHour: App.timeHour,
      explored: App.exploredTiles.size, worldTiles: App.worldMap.size
    };
    const focused = App.focusMapTarget({ x: 30, y: 30, label: 'Hidden cave' });
    const grid = document.querySelector(selector);
    return {
      focused,
      status: grid?.querySelector('.yaw-terrain-canvas-inspection')?.textContent || '',
      markerTitle: grid?.querySelector('.yaw-terrain-canvas-focus-marker')?.getAttribute('title') || '',
      before,
      after: {
        location: { ...App.location }, timeHour: App.timeHour,
        explored: App.exploredTiles.size, worldTiles: App.worldMap.size
      }
    };
  }, gridSelector);
  assert.strictEqual(poiFocus.focused, true, 'POI callers must be able to use the renderer-neutral map focus route');
  assert.match(poiFocus.status, /focused on Hidden cave at 30, 30.*unknown/i, 'Unknown POI focus must preserve terrain privacy');
  assert.strictEqual(poiFocus.markerTitle, 'Hidden cave', 'POI focus must retain its semantic label');
  assert.deepStrictEqual(poiFocus.after, poiFocus.before,
    'Focusing an unknown POI must not move time, reveal terrain, materialize world tiles, or move the party');
  await page.keyboard.press('ArrowRight');
  const pannedFocusText = await page.locator(`${gridSelector} .yaw-terrain-canvas-inspector`).textContent();
  assert.doesNotMatch(pannedFocusText, /focused on Hidden cave/i,
    'Panning away from a focus target must not attach its label to the new camera coordinate');
  await localButton.click();
  const focusCleared = await page.evaluate(selector => ({
    hidden: document.querySelector(selector)?.querySelector('.yaw-terrain-canvas-focus-marker')?.hidden,
    mode: document.querySelector(selector)?.getAttribute('data-terrain-camera-mode')
  }), gridSelector);
  assert.strictEqual(focusCleared.hidden, true, 'Returning to 3x3 must clear the ephemeral map focus marker');
  assert.strictEqual(focusCleared.mode, 'local', 'Returning from a focused target must restore local movement mode');

  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => App.location.x === 0 && App.location.y === 0);
  const keyboard = await page.evaluate(() => ({
    location: { ...App.location },
    moveNarration: App.log.filter(entry => String(entry.text || '').startsWith('Moved to ')).length
  }));
  assert.deepStrictEqual(keyboard.location, { x: 0, y: 0 }, 'Local keyboard movement must retain established traversal semantics');
  assert.strictEqual(keyboard.moveNarration, 2, 'Pointer and keyboard movement must each dispatch exactly once');
  await page.setViewportSize({ width: viewport.height, height: viewport.width });
  await page.waitForTimeout(100);
  const resized = await page.evaluate(() => ({
    canvasCount: document.querySelectorAll('canvas.yaw-terrain-world-canvas').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    location: { ...App.location },
    mode: document.querySelector('.yaw-terrain-canvas-alpha')?.getAttribute('data-terrain-camera-mode') || null
  }));
  assert.strictEqual(resized.canvasCount, 1, 'Orientation changes must retain one active Canvas without mounting the hidden layout');
  assert.strictEqual(resized.overflow, false, 'Orientation changes must not introduce horizontal overflow');
  assert.deepStrictEqual(resized.location, { x: 0, y: 0 }, 'Responsive remount must retain the authoritative party location');
  assert.strictEqual(resized.mode, 'local', 'Responsive remount must retain local movement mode');
  await page.evaluate(() => {
    const active = [...document.querySelectorAll('#mobile-mini-map, #desktop-neighborhood-grid')]
      .find(grid => grid.classList.contains('yaw-terrain-canvas-alpha'));
    const east = active?.id === 'mobile-mini-map'
      ? active.querySelector('[data-mobile-play-cell="e"]')
      : document.getElementById('desktop-play-cell-e');
    east?.click();
  });
  await page.waitForFunction(() => App.location.x === 1 && App.location.y === 0);
  const postRemountMove = await page.evaluate(() => ({
    location: { ...App.location },
    canvases: document.querySelectorAll('canvas.yaw-terrain-world-canvas').length,
    mode: document.querySelector('.yaw-terrain-canvas-alpha')?.getAttribute('data-terrain-camera-mode') || null
  }));
  assert.deepStrictEqual(postRemountMove.location, { x: 1, y: 0 }, 'Movement must remain functional after responsive remount');
  assert.strictEqual(postRemountMove.canvases, 1, 'Post-remount movement must not duplicate Canvas surfaces');
  assert.strictEqual(postRemountMove.mode, 'local', 'Post-remount movement must keep the camera local');
  assert.deepStrictEqual(errors, [], `Canvas navigation must not throw page errors: ${errors.join('; ')}`);
}

async function exerciseVisibilityPrivacy(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await waitForCanvasAlpha(page, '#desktop-neighborhood-grid');
  await page.evaluate(() => {
    for (let y = -4; y <= 4; y += 1) {
      for (const x of [3, 4]) {
        const key = `${x},${y}`;
        App.worldMap.delete(key);
        App.exploredTiles.delete(key);
      }
    }
    App.renderMap();
  });
  await waitForCanvasAlpha(page, '#desktop-neighborhood-grid');
  await page.locator('#desktop-neighborhood-grid [data-terrain-view="survey"]').click();
  await page.waitForTimeout(100);
  const privacy = await page.evaluate(() => {
    const canvas = document.querySelector('#desktop-neighborhood-grid canvas.yaw-terrain-world-canvas');
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width, rect.height) / 17;
    const ratioX = canvas.width / rect.width;
    const ratioY = canvas.height / rect.height;
    const sample = (x, y) => {
      const pixel = canvas.getContext('2d').getImageData(
        Math.round((rect.width / 2 + x * scale) * ratioX),
        Math.round((rect.height / 2 + y * scale) * ratioY),
        1,
        1
      ).data;
      return [...pixel];
    };
    return {
      unknown: sample(3, 3),
      known: sample(-3, 3),
      explored: App.exploredTiles.size,
      worldTiles: App.worldMap.size
    };
  });
  assert.ok(Math.abs(privacy.unknown[0] - 26) <= 2 && Math.abs(privacy.unknown[1] - 28) <= 2 && Math.abs(privacy.unknown[2] - 40) <= 2,
    `Unknown survey terrain must render the opaque unknown palette, received ${privacy.unknown.join(',')}`);
  assert.notDeepStrictEqual(privacy.known.slice(0, 3), privacy.unknown.slice(0, 3), 'Known and unknown survey terrain must remain visually distinguishable');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(50);
  const afterPan = await page.evaluate(() => ({ explored: App.exploredTiles.size, worldTiles: App.worldMap.size }));
  assert.deepStrictEqual(afterPan, { explored: privacy.explored, worldTiles: privacy.worldTiles }, 'Surveying unknown terrain must not reveal or materialize it');
  await page.close();
}

async function exerciseOptOut(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const url = new URL(pathToFileURL(OFFLINE_BUILD).href);
  url.searchParams.set('alphaScenario', 'terrain-composition');
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  await waitForCanvasAlpha(page, '#mobile-mini-map');
  const defaultState = await page.evaluate(() => ({
    location: { ...App.location },
    canvases: document.querySelectorAll('canvas.yaw-terrain-world-canvas').length
  }));
  assert.strictEqual(defaultState.canvases, 1, 'Canvas must be the default overworld terrain renderer after acceptance');

  url.searchParams.set('terrainRenderer', 'legacy');
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App?.alphaSession?.scenarioId === 'terrain-composition', null, { timeout: STARTUP_TIMEOUT });
  const before = await page.evaluate(() => ({ location: { ...App.location }, canvases: document.querySelectorAll('canvas.yaw-terrain-world-canvas').length }));
  assert.strictEqual(before.canvases, 0, 'The legacy renderer query rollback must leave the established terrain renderer active');
  await page.locator('#mobile-mini-map [data-mobile-play-cell="e"]').click();
  await page.waitForFunction(() => App.location.x === 1 && App.location.y === 0);
  await page.close();
}

async function exerciseSaveLoad(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const url = new URL(origin);
  url.searchParams.set('alphaScenario', 'interaction-single');
  url.searchParams.set('terrainRenderer', 'canvas-v1');
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App?.alphaSession?.scenarioId === 'interaction-single'
    && document.querySelector('#mobile-mini-map canvas.yaw-terrain-world-canvas'), null, { timeout: STARTUP_TIMEOUT });
  const saved = await page.evaluate(async () => ({
    wrote: await App.autoSave({ immediate: true }),
    location: { ...App.location },
    player: App.player.name,
    slot: App.activeSlot
  }));
  assert.strictEqual(saved.wrote, true, 'Canvas-active Alpha state must write through the ordinary save path');
  await page.locator('#mobile-mini-map [data-terrain-view="survey"]').click();
  await page.keyboard.press('ArrowRight');
  const loaded = await page.evaluate(async () => {
    App.location = { x: 77, y: -41 };
    const restored = await App.loadFromSlot(App.activeSlot);
    return {
      restored,
      location: { ...App.location },
      player: App.player?.name,
      canvases: document.querySelectorAll('canvas.yaw-terrain-world-canvas').length
    };
  });
  assert.strictEqual(loaded.restored, true, 'Ordinary slot loading must succeed while Canvas is active');
  assert.deepStrictEqual(loaded.location, saved.location, 'Loading must restore simulation-owned location rather than Canvas camera state');
  assert.strictEqual(loaded.player, saved.player, 'Loading must preserve the saved player identity');
  await page.waitForFunction(() => document.querySelectorAll('canvas.yaw-terrain-world-canvas').length === 1);
  await page.locator('#mobile-mini-map [data-terrain-view="local"]').click();
  const recentered = await page.evaluate(() => ({
    location: { ...App.location },
    mode: document.querySelector('#mobile-mini-map')?.getAttribute('data-terrain-camera-mode'),
    canvasCount: document.querySelectorAll('canvas.yaw-terrain-world-canvas').length
  }));
  assert.deepStrictEqual(recentered.location, saved.location, 'Local after load must remain anchored to restored simulation state');
  assert.strictEqual(recentered.mode, 'local', 'Local after load must recenter the ephemeral camera');
  assert.strictEqual(recentered.canvasCount, 1, 'Save/load must not duplicate Canvas surfaces');
  await page.close();
}

async function exerciseLocaleParity(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await waitForCanvasAlpha(page, '#mobile-mini-map');
  await page.evaluate(() => App.updateLanguage('es'));
  await page.waitForFunction(() => document.querySelector('#mobile-mini-map .yaw-terrain-canvas-mode')?.textContent === 'Vista: Local');
  const local = await page.evaluate(() => {
    const grid = document.querySelector('#mobile-mini-map');
    return {
      surveyText: grid?.querySelector('[data-terrain-view="survey"]')?.textContent || '',
      surveyLabel: grid?.querySelector('[data-terrain-view="survey"]')?.getAttribute('aria-label') || '',
      localDescription: grid?.querySelector('.yaw-terrain-canvas-inspection')?.textContent || '',
      listLabel: grid?.querySelector('.yaw-terrain-canvas-survey-list')?.getAttribute('aria-label') || ''
    };
  });
  assert.strictEqual(local.surveyText, 'Exploracion', 'Spanish Canvas controls must use locale content');
  assert.match(local.surveyLabel, /^Alejar la camara/, 'Spanish Canvas accessibility labels must use locale content');
  assert.match(local.localDescription, /^Terreno local centrado/, 'Spanish Canvas status narration must use locale content');
  assert.match(local.listLabel, /^Terreno cercano/, 'Spanish Canvas survey-list label must use locale content');
  await page.locator('#mobile-mini-map [data-terrain-view="survey"]').click();
  const survey = await page.evaluate(() => ({
    mode: document.querySelector('#mobile-mini-map .yaw-terrain-canvas-mode')?.textContent || '',
    nearby: document.querySelector('#mobile-mini-map .yaw-terrain-canvas-survey-list li')?.textContent || ''
  }));
  assert.match(survey.mode, /^Vista: (?:Exploracion|Regional)/, 'Spanish survey camera mode must remain localized');
  assert.ok(survey.nearby && !/unknown terrain|point of interest|structure/i.test(survey.nearby),
    `Spanish survey narration must not fall back to English: ${survey.nearby}`);
  await page.close();
}

async function exerciseFractionalSeamsAndCache(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.YAW_TERRAIN_CANVAS_SURFACE_V1 && window.YAW_TERRAIN_CANVAS_V1, null, { timeout: STARTUP_TIMEOUT });
  const result = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const resolveTile = (x, y) => ({
      x, y,
      biome: 'forest',
      derivedBiome: 'forest',
      elevation: 0.5,
      traversal: { passable: true, traversalCost: 1 },
      overlays: {},
      creatures: [],
      items: []
    });
    const surface = YAW_TERRAIN_CANVAS_SURFACE_V1.create(canvas, {
      width: 319,
      height: 277,
      centerX: 3.25,
      centerY: -1.5,
      zoom: 0.37,
      pixelRatio: 2,
      chunkSize: 4,
      apron: 1,
      cacheTilePixels: 32,
      maxCacheEntries: 96,
      resolveTile
    });
    surface.setCamera({
      center: { x: 3.25, y: -1.5 },
      zoom: 0.37,
      viewport: { width: 319, height: 277 },
      baseTilePixels: 64,
      limits: { minZoom: 0.125, maxZoom: 4 }
    });
    const checksum = pixels => {
      let hash = 2166136261;
      for (let index = 0; index < pixels.length; index += 1) {
        hash ^= pixels[index];
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    surface.render();
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const firstChecksum = checksum(pixels);
    let transparent = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 255) transparent += 1;
    }
    surface.invalidate('deterministic-rebuild');
    surface.render();
    const secondChecksum = checksum(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
    const started = performance.now();
    let frame = null;
    let cacheHits = 0;
    let cacheMisses = 0;
    let slowestFrame = 0;
    for (let index = 0; index < 40; index += 1) {
      surface.panPixels(-96, index % 2 ? -13 : 13);
      frame = surface.render();
      cacheHits += frame.renderStats.cacheHits;
      cacheMisses += frame.renderStats.cacheMisses;
      slowestFrame = Math.max(slowestFrame, frame.renderStats.milliseconds);
    }
    const elapsed = performance.now() - started;
    const output = {
      width: canvas.width,
      height: canvas.height,
      transparent,
      firstChecksum,
      secondChecksum,
      cacheEntries: frame.cacheEntries,
      elapsed,
      cacheHits,
      cacheMisses,
      slowestFrame
    };
    surface.destroy();
    return output;
  });
  assert.deepStrictEqual({ width: result.width, height: result.height }, { width: 638, height: 554 }, 'DPR 2 must size the Canvas backing store without changing CSS camera units');
  assert.strictEqual(result.transparent, 0, 'Fractional zoom across fixed chunk boundaries must not expose transparent seams');
  assert.strictEqual(result.secondChecksum, result.firstChecksum, 'Equivalent chunk invalidation and rebuild must reproduce identical Canvas pixels');
  assert.ok(result.cacheEntries <= 96, `Survey stress must keep the chunk cache bounded, received ${result.cacheEntries}`);
  assert.ok(result.elapsed < 5000,
    `Forty cached survey frames must remain within the broad mobile performance gate, received ${Math.round(result.elapsed)}ms`
    + ` (${result.cacheHits} hits, ${result.cacheMisses} misses, slowest ${Math.round(result.slowestFrame)}ms)`);
  await page.close();
}

async function exerciseElevationPixels(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.YAW_TERRAIN_CANVAS_SURFACE_V1 && typeof WorldGen !== 'undefined', null, { timeout: STARTUP_TIMEOUT });
  const results = await page.evaluate(() => {
    const checksum = pixels => {
      let hash = 2166136261;
      for (let index = 0; index < pixels.length; index += 1) {
        hash ^= pixels[index];
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    const height = (x, y) => Math.max(0.04, Math.min(0.96,
      0.5 + Math.sin(x * 0.52) * 0.22 + Math.cos(y * 0.41) * 0.16));
    const tile = (x, y, relief) => {
      const corners = relief ? {
        nw: height(x - 0.5, y - 0.5), ne: height(x + 0.5, y - 0.5),
        se: height(x + 0.5, y + 0.5), sw: height(x - 0.5, y + 0.5)
      } : { nw: 0.5, ne: 0.5, se: 0.5, sw: 0.5 };
      const center = Object.values(corners).reduce((sum, value) => sum + value, 0) / 4;
      return {
        x, y, biome: 'cliff', derivedBiome: 'cliff', elevation: center,
        traversal: { passable: true, traversalCost: 2 },
        terrainTopology: {
          kind: relief ? 'cliff' : 'level', terraceCount: 6,
          terraceLevel: Math.max(0, Math.min(5, Math.floor(center * 6))),
          cornerElevations: corners,
          contours: relief ? WorldGen.getElevationContours(corners) : [],
          gradient: {
            x: ((corners.ne + corners.se) - (corners.nw + corners.sw)) / 2,
            y: ((corners.sw + corners.se) - (corners.nw + corners.ne)) / 2
          },
          terraceEdges: {}, wallEdges: [], riseEdges: [], cliffEdges: []
        },
        overlays: y === 4 ? { road: { id: `relief-road-${x}`, connections: ['east', 'west'] } } : {},
        creatures: [], items: []
      };
    };
    const render = (pixelRatio, zoom, relief) => {
      const canvas = document.createElement('canvas');
      const surface = YAW_TERRAIN_CANVAS_SURFACE_V1.create(canvas, {
        width: 321, height: 279, centerX: 3.5, centerY: 3.5, zoom,
        pixelRatio, chunkSize: 4, apron: 2, cacheTilePixels: 40,
        resolveTile: (x, y) => tile(x, y, relief)
      });
      surface.setCamera({
        center: { x: 3.5, y: 3.5 }, zoom,
        viewport: { width: 321, height: 279 }, baseTilePixels: 64,
        limits: { minZoom: 0.125, maxZoom: 4 }
      });
      surface.render();
      const context = canvas.getContext('2d');
      const first = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      for (let index = 3; index < first.length; index += 4) if (first[index] !== 255) transparent += 1;
      const firstChecksum = checksum(first);
      surface.invalidate('relief-rebuild');
      surface.render();
      const secondChecksum = checksum(context.getImageData(0, 0, canvas.width, canvas.height).data);
      const result = { firstChecksum, secondChecksum, transparent, width: canvas.width, height: canvas.height };
      surface.destroy();
      return result;
    };
    return [
      { dpr: 1, zoom: 1.333 },
      { dpr: 2, zoom: 0.37 },
      { dpr: 3, zoom: 0.5 }
    ].map(entry => ({
      ...entry,
      relief: render(entry.dpr, entry.zoom, true),
      flat: render(entry.dpr, entry.zoom, false)
    }));
  });
  for (const result of results) {
    assert.strictEqual(result.relief.transparent, 0,
      `Non-flat relief across a four-chunk junction must remain opaque at DPR ${result.dpr}, zoom ${result.zoom}`);
    assert.strictEqual(result.relief.firstChecksum, result.relief.secondChecksum,
      `Relief invalidation must reproduce identical pixels at DPR ${result.dpr}, zoom ${result.zoom}`);
    assert.notStrictEqual(result.relief.firstChecksum, result.flat.firstChecksum,
      `Continuous elevation must materially change Canvas pixels at DPR ${result.dpr}, zoom ${result.zoom}`);
    assert.strictEqual(result.relief.width, Math.round(321 * result.dpr), 'Relief Canvas backing width must honor DPR');
    assert.strictEqual(result.relief.height, Math.round(279 * result.dpr), 'Relief Canvas backing height must honor DPR');
  }
  await page.close();
}

async function exerciseBiomeJunctionPixels(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.YAW_TERRAIN_CANVAS_SURFACE_V1
    && window.YAW_TERRAIN_CANVAS_V1?.assetStatus?.().count >= 8, null, { timeout: STARTUP_TIMEOUT });
  const results = await page.evaluate(() => {
    const checksum = pixels => {
      let hash = 2166136261;
      for (let index = 0; index < pixels.length; index += 1) {
        hash ^= pixels[index];
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    const biomeAt = (x, y) => (y <= 0
      ? (x <= 0 ? 'beach' : 'plains')
      : (x <= 0 ? 'grove' : 'forest'));
    const tile = (x, y) => ({
      x, y, biome: biomeAt(x, y), derivedBiome: biomeAt(x, y), elevation: 0.5,
      traversal: { passable: true, traversalCost: 1 },
      terrainTopology: {
        kind: 'level', terraceCount: 6, terraceLevel: 3,
        cornerElevations: { nw: 0.5, ne: 0.5, se: 0.5, sw: 0.5 },
        contours: [], terraceEdges: {}, wallEdges: [], riseEdges: [], cliffEdges: []
      },
      overlays: {}, creatures: [], items: []
    });
    return [1, 2, 3].map(pixelRatio => {
      const canvas = document.createElement('canvas');
      const surface = YAW_TERRAIN_CANVAS_SURFACE_V1.create(canvas, {
        width: 257, height: 257, centerX: 0.5, centerY: 0.5, zoom: 1.15,
        pixelRatio, chunkSize: 1, apron: 2, cacheTilePixels: 40,
        resolveTile: tile
      });
      surface.setCamera({
        center: { x: 0.5, y: 0.5 }, zoom: 1.15,
        viewport: { width: 257, height: 257 }, baseTilePixels: 64,
        limits: { minZoom: 0.125, maxZoom: 4 }
      });
      surface.render();
      const context = canvas.getContext('2d');
      const first = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      for (let index = 3; index < first.length; index += 4) if (first[index] !== 255) transparent += 1;
      const centerX = Math.round(canvas.width / 2);
      const centerY = Math.round(canvas.height / 2);
      const radius = Math.max(4, Math.round(8 * pixelRatio));
      const colors = new Set();
      for (let y = centerY - radius; y <= centerY + radius; y += 1) {
        for (let x = centerX - radius; x <= centerX + radius; x += 1) {
          const offset = (y * canvas.width + x) * 4;
          colors.add(`${first[offset]},${first[offset + 1]},${first[offset + 2]},${first[offset + 3]}`);
        }
      }
      const firstChecksum = checksum(first);
      surface.invalidate('four-biome-junction-rebuild');
      surface.render();
      const secondChecksum = checksum(context.getImageData(0, 0, canvas.width, canvas.height).data);
      surface.destroy();
      return { pixelRatio, transparent, colors: colors.size, firstChecksum, secondChecksum };
    });
  });
  for (const result of results) {
    assert.strictEqual(result.transparent, 0,
      `A four-biome corner across one-tile chunks must remain fully opaque at DPR ${result.pixelRatio}`);
    assert.ok(result.colors >= 4,
      `The shared corner field must retain a composed multi-material neighborhood at DPR ${result.pixelRatio}`);
    assert.strictEqual(result.firstChecksum, result.secondChecksum,
      `Four-biome corner invalidation must reproduce identical pixels at DPR ${result.pixelRatio}`);
  }
  await page.close();
}

async function exerciseShorelinePixels(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.YAW_TERRAIN_CANVAS_SURFACE_V1
    && window.YAW_TERRAIN_CANVAS_V1?.assetStatus?.().count >= 8, null, { timeout: STARTUP_TIMEOUT });
  const results = await page.evaluate(() => {
    const checksum = pixels => {
      let hash = 2166136261;
      for (let index = 0; index < pixels.length; index += 1) {
        hash ^= pixels[index];
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    const tile = (x, y) => ({
      x, y, biome: x >= 0 ? 'water' : 'beach', derivedBiome: x >= 0 ? 'water' : 'beach',
      water: x >= 0, elevation: 0.08,
      traversal: { passable: x < 0, traversalCost: x < 0 ? 1 : 3 },
      terrainTopology: {
        kind: 'level', terraceCount: 6, terraceLevel: 1,
        cornerElevations: { nw: 0.08, ne: 0.08, se: 0.08, sw: 0.08 },
        contours: [], terraceEdges: {}, wallEdges: [], riseEdges: [], cliffEdges: []
      },
      overlays: {}, creatures: [], items: []
    });
    return [1, 2, 3].map(pixelRatio => {
      const canvas = document.createElement('canvas');
      const surface = YAW_TERRAIN_CANVAS_SURFACE_V1.create(canvas, {
        width: 257, height: 257, centerX: -0.5, centerY: 0, zoom: 1.25,
        pixelRatio, chunkSize: 1, apron: 2, cacheTilePixels: 64,
        resolveTile: tile
      });
      surface.setCamera({
        center: { x: -0.5, y: 0 }, zoom: 1.25,
        viewport: { width: 257, height: 257 }, baseTilePixels: 64,
        limits: { minZoom: 0.125, maxZoom: 4 }
      });
      surface.render();
      const context = canvas.getContext('2d');
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const firstChecksum = checksum(pixels);
      let transparent = 0;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index] !== 255) transparent += 1;
      const centerX = Math.round(canvas.width / 2);
      const centerY = Math.round(canvas.height / 2);
      const tilePixels = 80 * pixelRatio;
      const crossings = [];
      for (let y = Math.round(centerY - tilePixels * 0.9); y <= Math.round(centerY + tilePixels * 0.9); y += Math.max(1, pixelRatio * 2)) {
        for (let x = Math.round(centerX - tilePixels); x <= Math.round(centerX + tilePixels); x += 1) {
          const offset = (y * canvas.width + x) * 4;
          if (pixels[offset + 2] > pixels[offset] * 1.08) {
            crossings.push(x);
            break;
          }
        }
      }
      surface.invalidate('shoreline-rebuild');
      surface.render();
      const secondChecksum = checksum(context.getImageData(0, 0, canvas.width, canvas.height).data);
      surface.destroy();
      return {
        pixelRatio, transparent, firstChecksum, secondChecksum,
        crossingCount: crossings.length,
        crossingSpan: crossings.length ? Math.max(...crossings) - Math.min(...crossings) : 0
      };
    });
  });
  for (const result of results) {
    assert.strictEqual(result.transparent, 0,
      `A curved shore across one-tile chunks must remain fully opaque at DPR ${result.pixelRatio}`);
    assert.ok(result.crossingCount >= 20,
      `The rendered water mask must remain identifiable through the shoreline at DPR ${result.pixelRatio}`);
    assert.ok(result.crossingSpan >= 4 * result.pixelRatio,
      `The rendered shoreline must curve instead of following one tile-axis column at DPR ${result.pixelRatio}`);
    assert.strictEqual(result.firstChecksum, result.secondChecksum,
      `Shoreline invalidation must reproduce identical pixels at DPR ${result.pixelRatio}`);
  }
  await page.close();
}

async function exerciseRouteContinuityPixels(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.YAW_TERRAIN_CANVAS_SURFACE_V1
    && window.YAW_TERRAIN_CANVAS_V1?.assetStatus?.().count >= 8, null, { timeout: STARTUP_TIMEOUT });
  const results = await page.evaluate(() => {
    const difference = (left, right, index) => (
      Math.abs(left[index] - right[index])
      + Math.abs(left[index + 1] - right[index + 1])
      + Math.abs(left[index + 2] - right[index + 2])
      + Math.abs(left[index + 3] - right[index + 3])
    );
    const render = (kind, orientation, pixelRatio, withRoute) => {
      const canvas = document.createElement('canvas');
      const connections = orientation === 'horizontal' ? ['east', 'west'] : ['north', 'south'];
      const resolveTile = (x, y) => {
        const onAxis = orientation === 'horizontal' ? y === 0 : x === 0;
        const overlays = withRoute && onAxis ? {
          [kind === 'bridge' ? 'bridge' : 'road']: { connections }
        } : {};
        return {
          x, y,
          biome: kind === 'bridge' ? 'water' : 'plains',
          derivedBiome: kind === 'bridge' ? 'water' : 'plains',
          elevation: kind === 'bridge' ? 0.08 : 0.46,
          traversal: { passable: true, traversalCost: 1 },
          overlays,
          creatures: [], items: []
        };
      };
      const surface = YAW_TERRAIN_CANVAS_SURFACE_V1.create(canvas, {
        width: 320, height: 256, centerX: 0, centerY: 0,
        zoom: 0.83, pixelRatio, chunkSize: 1, apron: 1,
        cacheTilePixels: 64, maxCacheEntries: 64, resolveTile
      });
      surface.render();
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const output = { pixels, width: canvas.width, height: canvas.height };
      surface.destroy();
      return output;
    };
    const measured = [];
    for (const pixelRatio of [1, 2, 3]) {
      for (const kind of ['road', 'bridge']) {
        for (const orientation of ['horizontal', 'vertical']) {
          const base = render(kind, orientation, pixelRatio, false);
          const routed = render(kind, orientation, pixelRatio, true);
          const scale = 64 * 0.83 * pixelRatio;
          const centerX = routed.width / 2;
          const centerY = routed.height / 2;
          const start = Math.round((orientation === 'horizontal' ? centerX : centerY) - scale * 1.45);
          const end = Math.round((orientation === 'horizontal' ? centerX : centerY) + scale * 1.45);
          const crossCenter = Math.round(orientation === 'horizontal' ? centerY : centerX);
          const crossRadius = Math.ceil(scale * 0.3);
          let covered = 0;
          let currentGap = 0;
          let maximumGap = 0;
          for (let along = start; along <= end; along += 1) {
            let changed = false;
            for (let cross = crossCenter - crossRadius; cross <= crossCenter + crossRadius; cross += 1) {
              const x = orientation === 'horizontal' ? along : cross;
              const y = orientation === 'horizontal' ? cross : along;
              if (x < 0 || y < 0 || x >= routed.width || y >= routed.height) continue;
              const index = (y * routed.width + x) * 4;
              if (difference(base.pixels, routed.pixels, index) > 30) {
                changed = true;
                break;
              }
            }
            if (changed) {
              covered += 1;
              maximumGap = Math.max(maximumGap, currentGap);
              currentGap = 0;
            } else currentGap += 1;
          }
          maximumGap = Math.max(maximumGap, currentGap);
          let firstCross = null;
          let lastCross = null;
          const alongCenter = Math.round(orientation === 'horizontal' ? centerX : centerY);
          for (let cross = crossCenter - Math.ceil(scale / 2); cross <= crossCenter + Math.ceil(scale / 2); cross += 1) {
            const x = orientation === 'horizontal' ? alongCenter : cross;
            const y = orientation === 'horizontal' ? cross : alongCenter;
            const index = (y * routed.width + x) * 4;
            if (difference(base.pixels, routed.pixels, index) <= 30) continue;
            if (firstCross === null) firstCross = cross;
            lastCross = cross;
          }
          measured.push({
            kind, orientation, pixelRatio,
            coverage: covered / Math.max(1, end - start + 1),
            maximumGap,
            crossSpan: firstCross === null ? 0 : lastCross - firstCross + 1,
            scale
          });
        }
      }
    }
    return measured;
  });
  for (const result of results) {
    assert.ok(result.coverage >= 0.97,
      `${result.kind} ${result.orientation} must remain continuous across one-tile chunk boundaries at DPR ${result.pixelRatio}; coverage ${result.coverage}`);
    assert.ok(result.maximumGap <= result.pixelRatio * 2,
      `${result.kind} ${result.orientation} must not expose a route seam at DPR ${result.pixelRatio}; gap ${result.maximumGap}`);
    assert.ok(result.crossSpan >= result.scale * 0.07 && result.crossSpan <= result.scale * 0.48,
      `${result.kind} ${result.orientation} must remain legible and proportionate at DPR ${result.pixelRatio}; span ${result.crossSpan}/${result.scale}`);
  }
  await page.close();
}

async function exerciseFailureFallback(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error?.message || error)));
  await page.addInitScript(() => {
    const establishedGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
      if (type === '2d' && this.classList.contains('yaw-terrain-world-canvas')) return null;
      return establishedGetContext.call(this, type, ...args);
    };
  });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App?.alphaSession?.scenarioId === 'terrain-composition', null, { timeout: STARTUP_TIMEOUT });
  await page.waitForTimeout(100);
  const fallback = await page.evaluate(() => {
    const grid = document.querySelector('#mobile-mini-map');
    return {
      alphaClass: grid?.classList.contains('yaw-terrain-canvas-alpha'),
      canvasCount: grid?.querySelectorAll('canvas.yaw-terrain-world-canvas').length || 0,
      moveControlCount: grid?.querySelectorAll('[data-command-control="move"]').length || 0,
      hiddenArtCount: [...(grid?.querySelectorAll('.yaw-tile-art') || [])]
        .filter(element => Number.parseFloat(getComputedStyle(element).opacity || '1') < 0.1).length
    };
  });
  assert.strictEqual(fallback.alphaClass, false, 'Canvas initialization failure must restore the established renderer class');
  assert.strictEqual(fallback.canvasCount, 0, 'Canvas initialization failure must remove the failed Canvas');
  assert.ok(fallback.moveControlCount > 0, 'Canvas initialization failure must retain established movement controls');
  assert.strictEqual(fallback.hiddenArtCount, 0, 'Canvas initialization failure must not hide established terrain art');
  assert.deepStrictEqual(errors, [], `Canvas fallback must not throw page errors: ${errors.join('; ')}`);
  await page.close();
}

async function exerciseRuntimeFailureFallback(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await waitForCanvasAlpha(page, '#mobile-mini-map');
  await page.evaluate(() => {
    const canvas = document.querySelector('#mobile-mini-map canvas.yaw-terrain-world-canvas');
    const context = canvas.getContext('2d');
    context.drawImage = () => { throw new Error('forced post-mount Canvas draw failure'); };
    const grid = document.getElementById('mobile-mini-map');
    const rect = grid.getBoundingClientRect();
    grid.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    }));
  });
  await page.waitForFunction(() => !document.querySelector('#mobile-mini-map')?.classList.contains('yaw-terrain-canvas-alpha'));
  const fallback = await page.evaluate(() => {
    const grid = document.querySelector('#mobile-mini-map');
    return {
      enabled: YAW_TERRAIN_CANVAS_ALPHA.enabled(),
      canvasCount: grid?.querySelectorAll('canvas.yaw-terrain-world-canvas').length || 0,
      moveControlCount: grid?.querySelectorAll('[data-command-control="move"]').length || 0,
      hiddenArtCount: [...(grid?.querySelectorAll('.yaw-tile-art') || [])]
        .filter(element => Number.parseFloat(getComputedStyle(element).opacity || '1') < 0.1).length
    };
  });
  assert.strictEqual(fallback.enabled, false, 'A post-mount failure must latch Canvas off so legacy input behavior is restored');
  assert.strictEqual(fallback.canvasCount, 0, 'A post-mount failure must remove the failed Canvas');
  assert.ok(fallback.moveControlCount > 0, 'A post-mount failure must retain established movement controls');
  assert.strictEqual(fallback.hiddenArtCount, 0, 'A post-mount failure must restore established terrain art');
  const mapFallback = await page.evaluate(() => {
    const focused = App.focusMapTarget({ x: 2, y: 1, label: 'Fallback target' });
    return {
      focused,
      panelActive: document.getElementById('panel-map')?.classList.contains('active') || false,
      selected: { ...App.largeMapSelected }
    };
  });
  assert.strictEqual(mapFallback.focused, true, 'Map focus service must accept the target after Canvas runtime fallback');
  assert.strictEqual(mapFallback.panelActive, true, 'Map focus service must visibly open the established map after Canvas runtime fallback');
  assert.deepStrictEqual(mapFallback.selected, { x: 2, y: 1 }, 'Legacy fallback must retain the requested map target');
  await page.evaluate(() => App.closeAllPanels());
  await page.locator('#mobile-mini-map [data-mobile-play-cell="e"]').click();
  await page.waitForFunction(() => App.location.x === 1 && App.location.y === 0);
  assert.deepStrictEqual(pageErrors, [], `Post-mount Canvas fallback must not throw page errors: ${pageErrors.join('; ')}`);
  await page.close();
}

async function exerciseSurfaceMutationFallback(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await waitForCanvasAlpha(page, '#mobile-mini-map');
  await page.evaluate(() => {
    const establishedCreate = YAW_TERRAIN_CANVAS_SURFACE_V1.create;
    YAW_TERRAIN_CANVAS_ALPHA.stop();
    YAW_TERRAIN_CANVAS_SURFACE_V1.create = (...args) => {
      const surface = establishedCreate(...args);
      surface.setSurvey = () => { throw new Error('forced Canvas surface mutation failure'); };
      return surface;
    };
    YAW_TERRAIN_CANVAS_ALPHA.start();
  });
  await waitForCanvasAlpha(page, '#mobile-mini-map');
  await page.locator('#mobile-mini-map [data-terrain-view="survey"]').click();
  await page.waitForFunction(() => !document.querySelector('#mobile-mini-map')?.classList.contains('yaw-terrain-canvas-alpha'));
  const fallback = await page.evaluate(() => {
    const grid = document.querySelector('#mobile-mini-map');
    return {
      enabled: YAW_TERRAIN_CANVAS_ALPHA.enabled(),
      canvases: grid?.querySelectorAll('canvas.yaw-terrain-world-canvas').length || 0,
      moveControls: grid?.querySelectorAll('[data-command-control="move"]').length || 0
    };
  });
  assert.strictEqual(fallback.enabled, false, 'A surface mutation failure must latch Canvas off');
  assert.strictEqual(fallback.canvases, 0, 'A surface mutation failure must remove the failed Canvas');
  assert.ok(fallback.moveControls > 0, 'A surface mutation failure must restore established movement controls');
  assert.deepStrictEqual(pageErrors, [], `Surface mutation fallback must not throw page errors: ${pageErrors.join('; ')}`);
  await page.close();
}

async function main() {
  assert.ok(fs.existsSync(OFFLINE_BUILD), 'Offline dist build is required');
  assert.ok(fs.existsSync(HOSTED_BUILD), 'Hosted dist build is required');
  const hosted = await serveHostedBuild();
  const browser = await chromium.launch({ headless: true });
  try {
    const cases = [
      { name: 'hosted-mobile', origin: hosted.url, viewport: { width: 390, height: 844 } },
      { name: 'hosted-desktop', origin: hosted.url, viewport: { width: 1365, height: 768 } },
      { name: 'file-mobile', origin: pathToFileURL(OFFLINE_BUILD).href, viewport: { width: 390, height: 844 } },
      { name: 'file-desktop', origin: pathToFileURL(OFFLINE_BUILD).href, viewport: { width: 1365, height: 768 } }
    ];
    for (const testCase of cases) {
      const page = await browser.newPage({ viewport: testCase.viewport });
      await exerciseNavigation(page, testCase.viewport, testCase.origin);
      await page.close();
      console.log(`  ✓ ${testCase.name}`);
    }
    await exerciseFailureFallback(browser, hosted.url);
    console.log('  ✓ renderer failure fallback');
    await exerciseRuntimeFailureFallback(browser, hosted.url);
    console.log('  ✓ post-mount renderer failure fallback');
    await exerciseSurfaceMutationFallback(browser, hosted.url);
    console.log('  ✓ surface mutation failure fallback');
    await exerciseVisibilityPrivacy(browser, hosted.url);
    console.log('  ✓ mixed visibility privacy');
    await exerciseOptOut(browser);
    console.log('  ✓ renderer query opt-out');
    await exerciseSaveLoad(browser, hosted.url);
    console.log('  ✓ Canvas-active save/load');
    await exerciseLocaleParity(browser, hosted.url);
    console.log('  ✓ localized Canvas controls, status, and survey narration');
    await exerciseFractionalSeamsAndCache(browser, hosted.url);
    console.log('  ✓ fractional seams, DPR 2, and cache stress');
    await exerciseElevationPixels(browser, hosted.url);
    console.log('  ✓ continuous elevation across DPR and chunk junctions');
    await exerciseBiomeJunctionPixels(browser, hosted.url);
    console.log('  ✓ continuous four-biome corner fields across DPR and chunk junctions');
    await exerciseShorelinePixels(browser, hosted.url);
    console.log('  ✓ curved shoreline fields across DPR and chunk junctions');
    await exerciseRouteContinuityPixels(browser, hosted.url);
    console.log('  ✓ road and bridge continuity across orientation, DPR, and chunk junctions');
  } finally {
    await browser.close();
    await hosted.close();
  }
  console.log('Canvas terrain browser checks passed (16 cases).');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
