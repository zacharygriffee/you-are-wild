#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const BUILD = path.join(ROOT, 'dist', 'you-are-wild.html');

const EXPECTED = {
  'interaction-single': { party: 1, creatures: 1, combat: false },
  'interaction-group': { party: 2, creatures: 2, combat: false },
  'self-containment': { party: 1, creatures: 0, combat: false, contained: 1 },
  'combat-group': { party: 2, creatures: 2, combat: true },
  'failure-narration': { party: 1, creatures: 1, combat: true },
  'companion-management': { party: 3, creatures: 0, combat: false, inventory: 4 },
  'content-posture': { party: 1, creatures: 1, combat: false },
  'responsive-layout': { party: 2, creatures: 2, combat: false },
  'terrain-composition': { party: 1, creatures: 0, combat: false, knownTiles: 81, noEnemies: true }
};

async function serveBuild() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/yaw-service.json' || pathname.endsWith('/yaw-host.json')) {
      response.writeHead(204, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    if (!['/', '/dist/you-are-wild', '/dist/you-are-wild.html'].includes(pathname)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const bytes = fs.readFileSync(BUILD);
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'no-store'
    });
    response.end(bytes);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function makePage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    localStorage.setItem('yaw-has-played', 'true');
    localStorage.setItem('yaw-tutorial-complete', 'true');
  });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  return { context, page, failures };
}

async function inspectScenario(page) {
  return page.evaluate(() => {
    const banner = document.getElementById('alpha-session-banner');
    const appRoot = document.getElementById('app');
    const terrainSurvey = App.alphaSession?.scenarioId === 'terrain-composition' ? (() => {
      const tiles = [...App.worldMap.values()];
      const row = y => tiles.filter(tile => tile.y === y);
      const routeRow = row(-2);
      const structureRow = row(-1);
      const poiRow = row(0);
      const evidenceRow = row(1);
      const elevationRow = row(2);
      const junctionRows = tiles.filter(tile => tile.y === 3 || tile.y === 4);
      const traversalGroup = document.querySelector('[aria-label="3 by 3 traversal grid"], [aria-label="3x3 traversal surface"]');
      const activeCenter = innerWidth <= 1024
        ? document.querySelector('#mobile-mini-map [data-stage-cell="center"]')
        : document.querySelector('#desktop-map-cell-center');
      const stateLayer = activeCenter?.querySelector('[data-tileset-semantic-key="state-current"]');
      const stateZ = stateLayer ? Number(getComputedStyle(stateLayer).zIndex || 0) : 0;
      const lowerZ = Math.max(0, ...[...(activeCenter?.querySelectorAll('[data-tileset-semantic-key]:not([data-tileset-semantic-key="state-current"])') || [])]
        .map(layer => Number(getComputedStyle(layer).zIndex || 0)));
      const semanticKeys = elevationRow.flatMap(tile => App._mapTileVisual(tile, {
        neighborResolver: (x, y) => App.worldMap.get(`${x},${y}`) || null
      }).semanticKeys || []);
      return {
        biomes: [...new Set(row(-4).map(tile => tile.displayBiome || tile.biome))].sort(),
        roadCount: routeRow.filter(tile => tile.overlays?.road).length,
        bridgeCount: routeRow.filter(tile => tile.overlays?.bridge).length,
        structureCount: structureRow.filter(tile => tile.structure).length,
        poiCount: poiRow.filter(tile => tile.overlays?.poi).length,
        evidenceCount: evidenceRow.filter(tile => tile.items?.length || tile.deathBags?.length || tile.placedObjects?.length || tile.resourceSearched).length,
        elevationSemantics: [...new Set(semanticKeys.filter(key => key.startsWith('terrain-elevation-')))].sort(),
        junctionDescriptionsMatch: junctionRows.every(tile => tile.description === `Terrain survey ${tile.displayBiome || tile.biome} at ${tile.x}, ${tile.y}.`),
        waterFlagsMatch: tiles.every(tile => Boolean(tile.water) === (tile.biome === 'water') && Boolean(tile.terrain?.water) === (tile.biome === 'water')),
        desktopCells: document.querySelectorAll('#desktop-neighborhood-grid [data-tile-composition-version="2"]').length,
        mobileCells: document.querySelectorAll('#mobile-mini-map [data-tile-composition-version="2"]').length,
        visibleJungleStrata: document.querySelectorAll('[data-tileset-semantic-key="cover-jungle-canopy"], [data-tileset-semantic-key="cover-jungle-undergrowth"], [data-tileset-semantic-key="cover-jungle-litter"]').length,
        accessibleTraversalGroup: Boolean(traversalGroup),
        unnamedTraversalButtons: [...(traversalGroup?.querySelectorAll('button') || [])]
          .filter(button => !(button.getAttribute('aria-label') || button.textContent || '').trim()).length,
        currentStateAboveWorld: stateZ > lowerZ
      };
    })() : null;
    return {
      diagnostics: YAW_ALPHA_LAB.diagnostics(App),
      screen: App.screen,
      party: App.party.length,
      creatures: App.creatures.length,
      inventory: App.inventory.length,
      contained: App.player?.stomach?.length || 0,
      combat: App.combatState.active === true,
      knownTiles: App.worldMap.size,
      noEnemies: App.cheats.noEnemies === true,
      bannerVisible: Boolean(banner && !banner.hidden && banner.getBoundingClientRect().height > 0),
      bannerControls: banner?.querySelectorAll('button').length || 0,
      gameVisible: getComputedStyle(appRoot).display !== 'none',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      terrainSurvey
    };
  });
}

async function checkScenario(browser, origin, scenarioId, viewport) {
  const { context, page, failures } = await makePage(browser, viewport);
  try {
    const query = new URLSearchParams({ alphaScenario: scenarioId });
    if (scenarioId !== 'terrain-composition') query.set('graphics', 'emoji');
    await page.goto(`${origin}/dist/you-are-wild?${query}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(id => window.App?.alphaSession?.scenarioId === id, scenarioId, { timeout: 60000 });
    await page.waitForTimeout(250);
    const actual = await inspectScenario(page);
    const expected = EXPECTED[scenarioId];
    assert.equal(actual.screen, 'game', `${scenarioId} should open the game`);
    assert.equal(actual.party, expected.party, `${scenarioId} party fixture`);
    assert.equal(actual.creatures, expected.creatures, `${scenarioId} creature fixture`);
    assert.equal(actual.combat, expected.combat, `${scenarioId} combat fixture`);
    if (expected.inventory !== undefined) assert.equal(actual.inventory, expected.inventory, `${scenarioId} inventory fixture`);
    if (expected.contained !== undefined) assert.equal(actual.contained, expected.contained, `${scenarioId} containment fixture`);
    if (expected.knownTiles !== undefined) assert.equal(actual.knownTiles, expected.knownTiles, `${scenarioId} deterministic survey tile count`);
    if (expected.noEnemies !== undefined) assert.equal(actual.noEnemies, expected.noEnemies, `${scenarioId} survey encounter posture`);
    if (scenarioId === 'terrain-composition') {
      assert.deepEqual(actual.terrainSurvey.biomes, ['beach', 'cave', 'cliff', 'forest', 'grove', 'jungle', 'plains', 'swamp', 'water'], 'terrain survey biome identity row');
      assert.equal(actual.terrainSurvey.roadCount, 8, 'terrain survey edge-to-edge road row');
      assert.equal(actual.terrainSurvey.bridgeCount, 1, 'terrain survey bridge span');
      assert.equal(actual.terrainSurvey.structureCount, 9, 'terrain survey transparent structure row');
      assert.equal(actual.terrainSurvey.poiCount, 9, 'terrain survey POI row');
      assert.equal(actual.terrainSurvey.evidenceCount, 9, 'terrain survey evidence row');
      assert.deepEqual(actual.terrainSurvey.elevationSemantics, [
        'terrain-elevation-cliff-east',
        'terrain-elevation-cliff-south',
        'terrain-elevation-cliff-west',
        'terrain-elevation-ledge-south',
        'terrain-elevation-slope-east',
        'terrain-elevation-slope-north',
        'terrain-elevation-slope-south',
        'terrain-elevation-slope-west'
      ], 'terrain survey directional elevation semantics');
      assert.equal(actual.terrainSurvey.junctionDescriptionsMatch, true, 'terrain survey junction narration should match rebased biome identity');
      assert.equal(actual.terrainSurvey.waterFlagsMatch, true, 'terrain survey biome and water facts should agree');
      assert.equal(actual.terrainSurvey.desktopCells, 9, 'terrain survey desktop 3x3 composition');
      assert.equal(actual.terrainSurvey.mobileCells, 9, 'terrain survey mobile 3x3 composition');
      assert(actual.terrainSurvey.visibleJungleStrata >= 3, 'terrain survey should render separate jungle canopy, undergrowth, and litter strata');
      assert.equal(actual.terrainSurvey.accessibleTraversalGroup, true, 'terrain survey traversal surface should expose a group label');
      assert.equal(actual.terrainSurvey.unnamedTraversalButtons, 0, 'terrain survey traversal controls should retain accessible names');
      assert.equal(actual.terrainSurvey.currentStateAboveWorld, true, 'terrain survey current-position cue should remain above world art');
    }
    assert.equal(actual.diagnostics.activeScenario, scenarioId, `${scenarioId} diagnostic identity`);
    assert.equal(actual.diagnostics.isolatedSaveDb, true, `${scenarioId} isolated save database`);
    assert.equal(actual.diagnostics.isolatedWorldDb, true, `${scenarioId} isolated world database`);
    assert.equal(actual.bannerVisible, true, `${scenarioId} Alpha banner`);
    assert.equal(actual.bannerControls, 2, `${scenarioId} report and exit controls`);
    assert.equal(actual.gameVisible, true, `${scenarioId} game surface`);
    assert.equal(actual.horizontalOverflow, false, `${scenarioId} page overflow at ${viewport.width}px`);
    assert.deepEqual(failures, [], `${scenarioId} browser failures:\n${failures.join('\n')}`);
    return { scenarioId, viewport, outcome: 'passed' };
  } finally {
    await context.close();
  }
}

async function checkPublicLab(browser, origin) {
  const { context, page, failures } = await makePage(browser, { width: 390, height: 844 });
  try {
    await page.goto(`${origin}/dist/you-are-wild?graphics=emoji`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#screen-menu.active', { state: 'visible', timeout: 60000 });
    await page.getByRole('button', { name: 'Open Alpha Lab' }).waitFor({ state: 'visible', timeout: 60000 });
    await page.getByRole('button', { name: 'Open Alpha Lab' }).click();
    await page.waitForSelector('#screen-alpha.active');
    assert.equal(await page.locator('.alpha-mission-card').count(), Object.keys(EXPECTED).length, 'public lab should list every mission');
    assert.equal(await page.locator('#alpha-report-preview').count(), 0, 'public lab should not expose a report before a mission starts');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, 'public lab mobile width should not overflow');
    await page.locator('[data-alpha-scenario="interaction-single"]').click();
    await page.waitForFunction(() => App.alphaSession?.scenarioId === 'interaction-single', null, { timeout: 60000 });
    await page.getByRole('button', { name: 'Report outcome' }).click();
    await page.waitForSelector('#screen-alpha.active #alpha-report-preview');
    assert.equal(await page.locator('#alpha-report-notes').count(), 1, 'mission report should include notes');
    assert.equal(await page.locator('.alpha-check-row').count(), 3, 'mission report should include its checklist');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, 'mobile report should not overflow');
    assert.deepEqual(failures, [], `public Alpha Lab browser failures:\n${failures.join('\n')}`);
    return { surface: 'public-alpha-lab', viewport: { width: 390, height: 844 }, outcome: 'passed' };
  } finally {
    await context.close();
  }
}

async function main() {
  assert.ok(fs.existsSync(BUILD), 'Build missing; run npm run build first');
  const fixture = await serveBuild();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    results.push(await checkPublicLab(browser, fixture.origin));
    for (const scenarioId of Object.keys(EXPECTED)) {
      results.push(await checkScenario(browser, fixture.origin, scenarioId, { width: 1280, height: 800 }));
    }
    results.push(await checkScenario(browser, fixture.origin, 'responsive-layout', { width: 390, height: 844 }));
    results.push(await checkScenario(browser, fixture.origin, 'terrain-composition', { width: 390, height: 844 }));
  } finally {
    await browser.close();
    await fixture.close();
  }
  console.log(JSON.stringify({ suite: 'alpha-playtest-matrix', passed: results.length, results }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
