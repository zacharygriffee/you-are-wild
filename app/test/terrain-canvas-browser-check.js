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
    }, gridSelector, { timeout: 15000 });
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
    await page.waitForFunction(() => window.YAW_TERRAIN_CANVAS_V1?.assetStatus?.().count >= 8, null, { timeout: 15000 });
  } catch (error) {
    throw new Error(`${error.message}; console: ${errors.join(' | ')}`, { cause: error });
  }

  const initial = await page.evaluate(selector => {
    const grid = document.querySelector(selector);
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
  assert.ok(initial.tileLabelBackgrounds.every(background => background === 'none'),
    'Local semantic labels must not reintroduce a visible per-tile gradient grid over the Canvas');

  await page.locator(eastSelector).click();
  await page.waitForFunction(() => App.location.x === 1 && App.location.y === 0);
  const moved = await page.evaluate(({ gridSelector, centerSelector }) => ({
    location: { ...App.location },
    centerLabel: document.querySelector(centerSelector)?.getAttribute('aria-label') || '',
    canvases: document.querySelector(gridSelector)?.querySelectorAll('canvas.yaw-terrain-world-canvas').length || 0,
    controls: document.querySelector(gridSelector)?.querySelectorAll('.yaw-terrain-canvas-controls').length || 0,
    moveNarration: App.log.filter(entry => String(entry.text || '').startsWith('Moved to ')).length
  }), { gridSelector, centerSelector });
  assert.deepStrictEqual(moved.location, { x: 1, y: 0 }, 'A local Canvas click must dispatch one authoritative move');
  assert.match(moved.centerLabel, /\(1, 0\)/, 'The local semantic center must follow the moved player');
  assert.strictEqual(moved.moveNarration, 1, 'A Canvas click must produce exactly one movement narration');
  assert.strictEqual(moved.canvases, 1, 'Movement remount must not duplicate the Canvas');
  assert.strictEqual(moved.controls, 1, 'Movement remount must not duplicate camera controls');

  await page.locator(northwestSelector).click({ force: true });
  const blocked = await page.evaluate(() => ({
    location: { ...App.location },
    narrated: App.log.some(entry => /four cardinal directions/i.test(String(entry.text || ''))),
    duplicateToast: (App.toasts || []).some(entry => /four cardinal directions/i.test(String(entry.text || '')))
  }));
  assert.deepStrictEqual(blocked.location, { x: 1, y: 0 }, 'A blocked Canvas attempt must not move the party');
  assert.strictEqual(blocked.narrated, true, 'A blocked Canvas attempt must reach core narration');
  assert.strictEqual(blocked.duplicateToast, false, 'A blocked Canvas attempt must not duplicate narrative feedback as a warning toast');

  const mapButton = page.locator(`${gridSelector} [data-terrain-view="survey"]`);
  await mapButton.click();
  const surveyStart = await page.evaluate(selector => {
    const grid = document.querySelector(selector);
    return {
      location: { ...App.location },
      explored: App.exploredTiles.size,
      worldTiles: App.worldMap.size,
      mode: grid.getAttribute('data-terrain-camera-mode'),
      suppressed: grid.querySelectorAll(':scope > [data-terrain-input-suppressed][aria-hidden="true"][inert]').length,
      localCells: grid.querySelectorAll(':scope > .map-tile, :scope > .desktop-play-cell').length,
      label: grid.querySelector('.yaw-terrain-canvas-mode')?.textContent || ''
    };
  }, gridSelector);
  assert.notStrictEqual(surveyStart.mode, 'local', 'Map control must enter the shared survey camera');
  assert.strictEqual(surveyStart.suppressed, surveyStart.localCells, 'Survey mode must remove the local 3x3 plane from input and accessibility');

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
  await localButton.click();

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
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }));
  assert.strictEqual(resized.canvasCount, 1, 'Orientation changes must retain one active Canvas without mounting the hidden layout');
  assert.strictEqual(resized.overflow, false, 'Orientation changes must not introduce horizontal overflow');
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
  await page.waitForFunction(() => window.App?.alphaSession?.scenarioId === 'terrain-composition', null, { timeout: 15000 });
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
    && document.querySelector('#mobile-mini-map canvas.yaw-terrain-world-canvas'), null, { timeout: 15000 });
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

async function exerciseFractionalSeamsAndCache(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(alphaUrl(origin), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.YAW_TERRAIN_CANVAS_SURFACE_V1 && window.YAW_TERRAIN_CANVAS_V1, null, { timeout: 15000 });
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
    for (let index = 0; index < 40; index += 1) {
      surface.panPixels(-96, index % 2 ? -13 : 13);
      frame = surface.render();
    }
    const elapsed = performance.now() - started;
    const output = {
      width: canvas.width,
      height: canvas.height,
      transparent,
      firstChecksum,
      secondChecksum,
      cacheEntries: frame.cacheEntries,
      elapsed
    };
    surface.destroy();
    return output;
  });
  assert.deepStrictEqual({ width: result.width, height: result.height }, { width: 638, height: 554 }, 'DPR 2 must size the Canvas backing store without changing CSS camera units');
  assert.strictEqual(result.transparent, 0, 'Fractional zoom across fixed chunk boundaries must not expose transparent seams');
  assert.strictEqual(result.secondChecksum, result.firstChecksum, 'Equivalent chunk invalidation and rebuild must reproduce identical Canvas pixels');
  assert.ok(result.cacheEntries <= 96, `Survey stress must keep the chunk cache bounded, received ${result.cacheEntries}`);
  assert.ok(result.elapsed < 5000, `Forty cached survey frames must remain within the broad mobile performance gate, received ${Math.round(result.elapsed)}ms`);
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
  await page.waitForFunction(() => window.App?.alphaSession?.scenarioId === 'terrain-composition', null, { timeout: 15000 });
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
    await exerciseVisibilityPrivacy(browser, hosted.url);
    console.log('  ✓ mixed visibility privacy');
    await exerciseOptOut(browser);
    console.log('  ✓ renderer query opt-out');
    await exerciseSaveLoad(browser, hosted.url);
    console.log('  ✓ Canvas-active save/load');
    await exerciseFractionalSeamsAndCache(browser, hosted.url);
    console.log('  ✓ fractional seams, DPR 2, and cache stress');
  } finally {
    await browser.close();
    await hosted.close();
  }
  console.log('Canvas terrain browser checks passed (9 cases).');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
