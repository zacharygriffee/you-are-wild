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
  'terrain-composition': { party: 1, creatures: 0, combat: false, knownTiles: 81, noEnemies: true },
  'terrain-workbench': { party: 1, creatures: 0, combat: false, knownTiles: 49, noEnemies: true }
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
      const activeGrid = innerWidth <= 1024
        ? document.querySelector('#mobile-mini-map')
        : document.querySelector('#desktop-neighborhood-grid');
      const inactiveTraversalCell = activeGrid?.querySelector('[data-stage-surface="traversal-cell"]:not(.moveable)');
      const moveableTraversalCell = activeGrid?.querySelector('.moveable:not(.center)');
      const restingPoiCell = activeGrid?.querySelector('.map-visual-poi:not(.center), .map-visual-landmark:not(.center), .map-visual-structure:not(.center)');
      const coverArt = activeGrid?.querySelector('.yaw-tile-art');
      const canopyLayers = [...(activeGrid?.querySelectorAll('[data-cover-kind="biome-identity"][data-cover-stratum="canopy"]') || [])];
      const interiorCanopyContained = canopyLayers.every(layer => {
        const cell = layer.closest('[data-tile-composition-space="overworld"]');
        const rect = layer.getBoundingClientRect();
        const cellRect = cell?.getBoundingClientRect();
        return Boolean(cellRect && rect.left >= cellRect.left - 1 && rect.right <= cellRect.right + 1 && rect.top >= cellRect.top - 1 && rect.bottom <= cellRect.bottom + 1);
      });
      const sharedEdgeLayer = activeGrid?.querySelector('[data-shared-edge-key][data-tileset-semantic-key^="ground-transition-"]');
      const sharedEdgeDirection = sharedEdgeLayer?.dataset.tilesetSemanticKey?.match(/-(north|east|south|west)$/)?.[1] || '';
      const sharedEdgeOverscan = sharedEdgeLayer && sharedEdgeDirection
        ? Number.parseFloat(getComputedStyle(sharedEdgeLayer)[sharedEdgeDirection === 'north' ? 'top' : sharedEdgeDirection === 'east' ? 'right' : sharedEdgeDirection === 'south' ? 'bottom' : 'left'])
        : 0;
      const stateLayer = activeCenter?.querySelector('[data-tileset-semantic-key="state-current"]');
      const stateZ = stateLayer ? Number(getComputedStyle(stateLayer).zIndex || 0) : 0;
      const lowerZ = Math.max(0, ...[...(activeCenter?.querySelectorAll('[data-tileset-semantic-key]:not([data-tileset-semantic-key="state-current"])') || [])]
        .map(layer => Number(getComputedStyle(layer).zIndex || 0)));
      const semanticKeys = elevationRow.flatMap(tile => App._mapTileVisual(tile, {
        neighborResolver: (x, y) => App.worldMap.get(`${x},${y}`) || null
      }).semanticKeys || []);
      const visualFor = tile => App._mapTileVisual(tile, {
        neighborResolver: (x, y) => App.worldMap.get(`${x},${y}`) || null
      });
      const routeVisuals = routeRow.map(visualFor);
      const structureVisuals = structureRow.map(visualFor);
      const poiVisuals = poiRow.map(visualFor);
      const beachCoastVisual = visualFor(row(-4).find(tile => tile.biome === 'beach'));
      const identityFamilies = [...new Set(row(-4).flatMap(tile => App._mapTileVisual(tile, {
        neighborResolver: (x, y) => App.worldMap.get(`${x},${y}`) || null
      }).composition?.layers?.cover?.records || [])
        .filter(record => record.kind === 'biome-identity')
        .map(record => record.family))]
        .sort();
      return {
        biomes: [...new Set(row(-4).map(tile => tile.displayBiome || tile.biome))].sort(),
        roadCount: routeRow.filter(tile => tile.overlays?.road).length,
        bridgeCount: routeRow.filter(tile => tile.overlays?.bridge).length,
        structureCount: structureRow.filter(tile => tile.structure).length,
        poiCount: poiRow.filter(tile => tile.overlays?.poi).length,
        evidenceCount: evidenceRow.filter(tile => tile.items?.length || tile.deathBags?.length || tile.placedObjects?.length || tile.resourceSearched).length,
        elevationSemantics: [...new Set(semanticKeys.filter(key => key.startsWith('terrain-elevation-')))].sort(),
        identityFamilies,
        routeLayersComplete: routeVisuals.every(visual =>
          visual.composition.layers.route.records.some(record => record.kind === 'road' || record.kind === 'bridge')
          && visual.composition.layers.route.records.some(record => record.kind === 'route-verge' || record.kind === 'bridge-approach')
        ),
        structureGroundingCount: structureVisuals.filter((visual, index) =>
          visual.composition.layers.ground.records[0]?.biome === structureRow[index].biome
          && visual.composition.layers.feature.records.some(record => record.kind === 'feature-grounding')
          && visual.composition.layers.feature.records.some(record => record.kind === 'structure')
        ).length,
        poiGroundingCount: poiVisuals.filter((visual, index) =>
          visual.composition.layers.ground.records[0]?.biome === poiRow[index].biome
          && visual.composition.layers.feature.records.some(record => record.kind === 'feature-grounding')
          && visual.composition.layers.feature.records.some(record => record.kind === 'poi' || record.kind === 'resource')
        ).length,
        coastSingleOwned: beachCoastVisual.semanticKeys.includes('shoreline-water-east')
          && !beachCoastVisual.semanticKeys.includes('ground-transition-water-east')
          && beachCoastVisual.composition.layers.cover.records.some(record => record.family === 'beach-identity'),
        junctionDescriptionsMatch: junctionRows.every(tile => tile.description === `Terrain survey ${tile.displayBiome || tile.biome} at ${tile.x}, ${tile.y}.`),
        waterFlagsMatch: tiles.every(tile => Boolean(tile.water) === (tile.biome === 'water') && Boolean(tile.terrain?.water) === (tile.biome === 'water')),
        desktopCells: document.querySelectorAll('#desktop-neighborhood-grid [data-tile-composition-version="2"]').length,
        mobileCells: document.querySelectorAll('#mobile-mini-map [data-tile-composition-version="2"]').length,
        visibleJungleStrata: document.querySelectorAll('[data-tileset-semantic-key="cover-jungle-canopy"], [data-tileset-semantic-key="cover-jungle-undergrowth"], [data-tileset-semantic-key="cover-jungle-litter"]').length,
        visibleBiomeDetails: document.querySelectorAll('[data-cover-kind="biome-detail"]').length,
        activeGridGap: activeGrid ? getComputedStyle(activeGrid).gap : '',
        activeCellBorder: activeCenter ? getComputedStyle(activeCenter).borderTopWidth : '',
        inactiveTerrainOpacity: inactiveTraversalCell ? getComputedStyle(inactiveTraversalCell).opacity : '',
        moveableRestingRing: moveableTraversalCell ? getComputedStyle(moveableTraversalCell).boxShadow : '',
        moveableCueContent: moveableTraversalCell ? getComputedStyle(moveableTraversalCell, '::before').content : '',
        restingPoiRing: restingPoiCell ? getComputedStyle(restingPoiCell).boxShadow : '',
        coverArtOverflow: coverArt ? getComputedStyle(coverArt).overflow : '',
        interiorCanopyContained,
        pairedJungleEdges: document.querySelectorAll('[data-cover-kind="edge-continuity"][data-shared-edge-key]').length,
        sharedEdgeOverscan,
        currentStateOpacity: stateLayer ? getComputedStyle(stateLayer).opacity : '',
        currentCellRing: activeCenter ? getComputedStyle(activeCenter).boxShadow : '',
        accessibleTraversalGroup: Boolean(traversalGroup),
        unnamedTraversalButtons: [...(traversalGroup?.querySelectorAll('button') || [])]
          .filter(button => !(button.getAttribute('aria-label') || button.textContent || '').trim()).length,
        currentStateAboveWorld: stateZ > lowerZ
      };
    })() : null;
    if (App.alphaSession?.scenarioId === 'terrain-workbench') App.renderLargeMap?.();
    const terrainWorkbench = App.alphaSession?.scenarioId === 'terrain-workbench' ? (() => {
      const tiles = [...App.worldMap.values()];
      const panel = document.getElementById('alpha-terrain-workbench');
      return {
        tileCount: tiles.length,
        source: App.alphaTerrainWorkbench?.source,
        destination: App.alphaTerrainWorkbench?.destination,
        caseCount: YAW_ALPHA_LAB.terrainWorkbenchCaseCount(),
        controls: panel?.querySelectorAll('[data-terrain-workbench-control]').length || 0,
        panelVisible: Boolean(panel && !panel.hidden && panel.getBoundingClientRect().height > 0),
        knownReviewTiles: document.querySelectorAll('#large-map .large-map-tile.known[data-tile-composition-version="2"]').length,
        phases: YAW_ALPHA_LAB.TERRAIN_WORKBENCH_PHASES.slice(),
        geometries: YAW_ALPHA_LAB.TERRAIN_WORKBENCH_GEOMETRIES.slice(),
        reliefs: YAW_ALPHA_LAB.TERRAIN_WORKBENCH_RELIEFS.slice(),
        overlays: YAW_ALPHA_LAB.TERRAIN_WORKBENCH_OVERLAYS.slice(),
        biomeCount: YAW_ALPHA_LAB.TERRAIN_WORKBENCH_BIOMES.length,
        sharedCornerTiles: tiles.filter(tile => ['nw', 'ne', 'se', 'sw'].every(corner => Number.isFinite(tile.terrainTopology?.cornerElevations?.[corner]))).length,
        contourTiles: tiles.filter(tile => tile.terrainTopology?.contours?.length).length,
        renderedContourSegments: document.querySelectorAll('.yaw-terrain-contour-segment').length,
        bodyPhase: document.body.dataset.dayPhase
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
      terrainSurvey,
      terrainWorkbench
    };
  });
}

async function checkScenario(browser, origin, scenarioId, viewport) {
  const { context, page, failures } = await makePage(browser, viewport);
  try {
    const query = new URLSearchParams({ alphaScenario: scenarioId });
    if (!['terrain-composition', 'terrain-workbench'].includes(scenarioId)) query.set('graphics', 'emoji');
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
      assert.deepEqual(actual.terrainSurvey.identityFamilies, [
        'beach-identity',
        'cave-identity',
        'forest-identity',
        'grove-identity',
        'jungle-canopy',
        'jungle-litter',
        'jungle-undergrowth',
        'plains-identity',
        'swamp-identity'
      ], 'terrain survey layered biome identity semantics');
      assert.equal(actual.terrainSurvey.routeLayersComplete, true, 'every surveyed road and bridge should retain its route deck and biome-aware underlay');
      assert.equal(actual.terrainSurvey.structureGroundingCount, 9, 'every surveyed structure should inherit its destination ground and grounding layer');
      assert.equal(actual.terrainSurvey.poiGroundingCount, 9, 'every surveyed POI should inherit its destination ground and grounding layer');
      assert.equal(actual.terrainSurvey.coastSingleOwned, true, 'beach identity and water shoreline should coexist without duplicate generic transition paint');
      assert.equal(actual.terrainSurvey.junctionDescriptionsMatch, true, 'terrain survey junction narration should match rebased biome identity');
      assert.equal(actual.terrainSurvey.waterFlagsMatch, true, 'terrain survey biome and water facts should agree');
      assert.equal(actual.terrainSurvey.desktopCells, 9, 'terrain survey desktop 3x3 composition');
      assert.equal(actual.terrainSurvey.mobileCells, 9, 'terrain survey mobile 3x3 composition');
      assert(actual.terrainSurvey.visibleJungleStrata >= 3, 'terrain survey should render separate jungle canopy, undergrowth, and litter strata');
      assert(actual.terrainSurvey.visibleBiomeDetails >= 1, 'terrain survey should render a coordinate-selected secondary biome detail');
      assert.equal(actual.terrainSurvey.activeGridGap, '0px', 'active terrain artwork should meet across all nine traversal cells');
      assert.equal(actual.terrainSurvey.activeCellBorder, '0px', 'active traversal cells should keep hit targets without artwork-breaking borders');
      assert.equal(actual.terrainSurvey.inactiveTerrainOpacity, '1', 'movement availability must not dim a whole terrain cell and fracture the composed surface');
      assert.equal(actual.terrainSurvey.moveableRestingRing, 'none', 'traversable neighbors should not divide continuous artwork with resting full-cell outlines');
      assert.notEqual(actual.terrainSurvey.moveableCueContent, 'none', 'traversable neighbors should retain a bounded non-text movement cue');
      assert.equal(actual.terrainSurvey.restingPoiRing, 'none', 'POI and structure ownership should remain on their bounded art instead of outlining the whole cell');
      assert.equal(actual.terrainSurvey.coverArtOverflow, 'hidden', 'each tile should clip art consistently after safe placement and paired edge composition');
      assert.equal(actual.terrainSurvey.interiorCanopyContained, true, 'interior jungle canopies should remain inside their owning safe inset');
      assert(actual.terrainSurvey.pairedJungleEdges >= 2, 'contiguous jungle should render paired shared-edge canopy bands');
      assert(actual.terrainSurvey.sharedEdgeOverscan < 0, 'bundled shared-edge paint should overscan its owning boundary to hide fractional raster seams');
      assert.equal(actual.terrainSurvey.currentStateOpacity, '0', 'bundled current-position atlas art should not obstruct terrain');
      assert.notEqual(actual.terrainSurvey.currentCellRing, 'none', 'current position should remain legible as a bounded owning-cell ring');
      assert.equal(actual.terrainSurvey.accessibleTraversalGroup, true, 'terrain survey traversal surface should expose a group label');
      assert.equal(actual.terrainSurvey.unnamedTraversalButtons, 0, 'terrain survey traversal controls should retain accessible names');
      assert.equal(actual.terrainSurvey.currentStateAboveWorld, true, 'terrain survey current-position cue should remain above world art');
    }
    if (scenarioId === 'terrain-workbench') {
      assert.equal(actual.terrainWorkbench.tileCount, 49, 'terrain workbench should isolate one bounded 7x7 case');
      assert.equal(actual.terrainWorkbench.source, 'jungle', 'terrain workbench default source');
      assert.equal(actual.terrainWorkbench.destination, 'plains', 'terrain workbench default destination');
      assert.equal(actual.terrainWorkbench.caseCount, 699840, 'terrain workbench should enumerate the complete bounded case matrix');
      assert.equal(actual.terrainWorkbench.controls, 8, 'terrain workbench should expose every case dimension');
      assert.equal(actual.terrainWorkbench.panelVisible, true, 'terrain workbench controls should open with the mission');
      assert.equal(actual.terrainWorkbench.knownReviewTiles, 49, `terrain workbench case should reach Review Map (got ${actual.terrainWorkbench.knownReviewTiles})`);
      assert.deepEqual(actual.terrainWorkbench.phases, ['day', 'night'], 'terrain workbench day/night controls');
      assert.equal(actual.terrainWorkbench.geometries.length, 6, 'terrain workbench boundary geometries');
      assert.deepEqual(actual.terrainWorkbench.reliefs, ['level', 'slope', 'terrace', 'cliff-corner', 'rugged'], 'terrain workbench relief fixtures');
      assert.equal(actual.terrainWorkbench.overlays.length, 9, 'terrain workbench overlay states');
      assert.equal(actual.terrainWorkbench.biomeCount, 9, 'terrain workbench biome matrix');
      assert.equal(actual.terrainWorkbench.sharedCornerTiles, 49, 'every workbench tile should carry shared corner-height topology');
      assert(actual.terrainWorkbench.contourTiles >= 7, 'the default terrace fixture should cross the full 7x7 case');
      assert(actual.terrainWorkbench.renderedContourSegments >= 7, 'the default terrace fixture should render connected contour walls');
      assert.equal(actual.terrainWorkbench.bodyPhase, 'day', 'terrain workbench default lighting');
      const changed = await page.evaluate(() => {
        const startedAt = performance.now();
        App.setTerrainWorkbench('destination', 'water');
        App.setTerrainWorkbench('direction', 'west');
        App.setTerrainWorkbench('geometry', 'four-way');
        App.setTerrainWorkbench('relief', 'rugged');
        App.setTerrainWorkbench('overlay', 'all');
        App.setTerrainWorkbench('phase', 'night');
        App.setTerrainWorkbench('seed', 3);
        const center = App.worldMap.get('0,0');
        const before = YAW_ALPHA_LAB.terrainWorkbenchCaseIndex(App.alphaTerrainWorkbench);
        const phaseBeforeStep = document.body.dataset.dayPhase;
        const urlBeforeStep = location.search;
        App.stepTerrainWorkbench(1);
        return {
          before,
          after: YAW_ALPHA_LAB.terrainWorkbenchCaseIndex(App.alphaTerrainWorkbench),
          phase: phaseBeforeStep,
          phaseAfterStep: document.body.dataset.dayPhase,
          structure: center.structure,
          poi: center.overlays?.poi?.category,
          evidence: center.items?.length,
          presence: center.creatures?.length,
          url: urlBeforeStep,
          durationMs: performance.now() - startedAt,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        };
      });
      assert.equal(changed.phase, 'night', 'workbench lighting changes should update the rendered phase');
      assert.equal(changed.structure, 'camp', 'all-overlay case should include a structure');
      assert.equal(changed.poi, 'landmark', 'all-overlay case should include a POI');
      assert.equal(changed.evidence, 1, 'all-overlay case should include evidence');
      assert.equal(changed.presence, 1, 'all-overlay case should include presence');
      assert.equal(changed.after, changed.before + 1, 'next case should advance exactly one bounded matrix case');
      assert(changed.durationMs < 5000, `seven synchronous workbench state changes should remain bounded (got ${changed.durationMs.toFixed(1)}ms)`);
      assert(changed.url.includes('terrainGeometry=four-way') && changed.url.includes('terrainRelief=rugged') && changed.url.includes('terrainPhase=night'), 'workbench state should remain shareable in the URL');
      assert.equal(changed.overflow, false, 'workbench controls should not create horizontal overflow');
      const reviewMapMode = await page.evaluate(() => {
        togglePanel('map');
        const map = document.getElementById('panel-map');
        const workbench = document.getElementById('alpha-terrain-workbench');
        return {
          mapDisplay: getComputedStyle(map).display,
          workbenchVisibility: getComputedStyle(workbench).visibility,
          knownTiles: document.querySelectorAll('#large-map .large-map-tile.known[data-tile-composition-version="2"]').length
        };
      });
      assert.equal(reviewMapMode.mapDisplay, 'flex', 'Review Map should open for composition inspection');
      assert.equal(reviewMapMode.workbenchVisibility, 'hidden', 'floating workbench controls must not cover Review Map tiles');
      assert.equal(reviewMapMode.knownTiles, 49, 'Review Map should retain the complete isolated workbench case');
      const restoredWorkbench = await page.evaluate(() => {
        togglePanel('map');
        return getComputedStyle(document.getElementById('alpha-terrain-workbench')).visibility;
      });
      assert.equal(restoredWorkbench, 'visible', 'closing Review Map should restore the unchanged workbench controls');
    }
    assert.equal(actual.diagnostics.activeScenario, scenarioId, `${scenarioId} diagnostic identity`);
    assert.equal(actual.diagnostics.isolatedSaveDb, true, `${scenarioId} isolated save database`);
    assert.equal(actual.diagnostics.isolatedWorldDb, true, `${scenarioId} isolated world database`);
    assert.equal(actual.bannerVisible, true, `${scenarioId} Alpha banner`);
    assert.equal(actual.bannerControls, scenarioId === 'terrain-workbench' ? 3 : 2, `${scenarioId} Alpha session controls`);
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
    await page.getByRole('button', { name: 'Open Alpha Lab' }).click({ force: true });
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
    results.push(await checkScenario(browser, fixture.origin, 'terrain-workbench', { width: 390, height: 844 }));
  } finally {
    await browser.close();
    await fixture.close();
  }
  console.log(JSON.stringify({ suite: 'alpha-playtest-matrix', passed: results.length, results }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  if (error && Object.prototype.hasOwnProperty.call(error, 'actual')) {
    console.error(`actual: ${JSON.stringify(error.actual)}`);
    console.error(`expected: ${JSON.stringify(error.expected)}`);
  }
  process.exitCode = 1;
});
