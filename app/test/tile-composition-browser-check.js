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
const MEDIA_DIR = path.join(ROOT, 'media');
const VIEWPORTS = [
  { name: 'short-mobile', width: 313, height: 670 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'reported-mobile', width: 412, height: 915 },
  { name: 'desktop', width: 1365, height: 768 }
];

async function serveHostedBuild() {
  const html = fs.readFileSync(HOSTED_BUILD);
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
    if (pathname.startsWith('/assets/')) {
      const name = path.basename(pathname);
      const file = path.join(MEDIA_DIR, name);
      if (fs.existsSync(file)) {
        const bytes = fs.readFileSync(file);
        response.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'public, max-age=3600' });
        response.end(bytes);
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

async function seedCompositionLab(page) {
  await page.evaluate(() => {
    App.closeTutorial?.();
    const tutorial = document.getElementById('tutorial-overlay');
    if (tutorial) tutorial.style.display = 'none';
    App.showScreen('game');
    App.worldMeta = App._normalizeWorldMeta({
      worldId: 'tile-composition-lab',
      seed: 'tile-composition-lab',
      generatorVersion: 7,
      mapModsHash: 'core'
    });
    App.location = { x: 0, y: 0 };
    App.currentBiome = 'water';
    App.worldMap = new Map();
    App.tileDeltas = new Map();
    App.exploredTiles = new Set();
    App.largeMapRadius = 1;
    App.largeMapOffset = { x: 0, y: 0 };
    App.largeMapSelected = { x: 0, y: 0 };
    App.combatState.active = false;
    App.inInterior = false;
    App.activeInterior = null;

    const player = App._normalizeUnit({
      id: 'composition-player', name: 'ZX', species: 'human', icon: '🧭',
      disposition: App.DISPOSITION.PARTY, mc: true, hero: true, ally: false,
      CPun: 100, MPun: 100, CPle: 40, MPle: 100, level: 1,
      size: 4, appetite: 4, stomach: [], womb: [], balls: [], inventory: [], status: {}
    });
    const living = App._normalizeUnit({
      id: 'composition-fox', name: 'Fox', species: 'wolf', icon: '🦊',
      disposition: App.DISPOSITION.FRIENDLY, CPun: 40, MPun: 40,
      CPle: 10, MPle: 40, level: 1, size: 3, appetite: 3,
      stomach: [], womb: [], balls: [], inventory: [], status: {}
    });
    const remains = App._normalizeUnit({
      id: 'composition-remains', name: 'Hare', corpseName: 'Hare', species: 'bunny', icon: '🐇',
      disposition: App.DISPOSITION.CORPSE, corpse: true, dead: true, CPun: 0, MPun: 30,
      CPle: 0, MPle: 30, level: 1, size: 2, appetite: 2,
      stomach: [], womb: [], balls: [], inventory: [], status: {}
    });
    App.player = player;
    App.party = [player];
    App.partyLeaderId = player.id;
    App.creatures = [living, remains];

    const tileFor = (x, y, overrides = {}) => ({
      ...App.getBaseTile(x, y),
      x, y, explored: true, seen: true,
      creatures: [], items: [], deathBags: [],
      ...overrides
    });
    const tiles = [
      tileFor(-1, -1, {
        biome: 'cliff', derivedBiome: 'cliff', elevation: 0.86, terrainTags: ['high-ground', 'rocky'],
        terrainTopology: { kind: 'cliff', band: 'high', primaryUphill: 'north', primaryDownhill: 'south', uphillEdges: ['north'], downhillEdges: ['south'], cliffEdges: ['south'] }
      }),
      tileFor(0, -1, { biome: 'plains', derivedBiome: 'plains', structure: 'camp' }),
      tileFor(1, -1, { biome: 'grove', derivedBiome: 'grove', overlays: { cover: [{ id: 'oak-1', name: 'Oak' }] } }),
      tileFor(-1, 0, { biome: 'beach', derivedBiome: 'beach', overlays: { shoreline: { edges: ['east'], nearWater: true } } }),
      tileFor(0, 0, {
        biome: 'water', derivedBiome: 'water', displayBiome: 'bridge', water: true, elevation: 0.22,
        terrainTags: ['water', 'bridge'],
        traversal: { passable: true, traversalCost: 0.8, requiredCapability: null, routeModifier: -0.2 },
        overlays: {
          road: { id: 'lab-road', direction: 'east-west', connections: ['east', 'west'] },
          bridge: { id: 'lab-bridge', direction: 'east-west', connections: ['east', 'west'], spanIndex: 0, spanLength: 1, spanRole: 'single', shoreEdges: ['west', 'east'] },
          barriers: [], poi: null, shoreline: null, dangerInfluence: null
        },
        creatures: [living, remains],
        items: [{ id: 'composition-rope', name: 'Rope', quantity: 2 }],
        deathBags: [{ resolutionId: 'composition-bag', items: [{ id: 'knife' }], gold: 3 }],
        placedObjects: [{ id: 'composition-marker', name: 'Trail marker', state: 'placed' }]
      }),
      tileFor(1, 0, {
        biome: 'plains', derivedBiome: 'plains',
        overlays: { road: { id: 'lab-road-east', direction: 'east-west', connections: ['east', 'west'] } }
      }),
      tileFor(-1, 1, { biome: 'forest', derivedBiome: 'forest' }),
      tileFor(0, 1, {
        biome: 'grove', derivedBiome: 'grove', resourceSearched: true,
        overlays: { poi: { id: 'lab-resource', category: 'resourceSite' } }
      }),
      tileFor(1, 1, { biome: 'jungle', derivedBiome: 'jungle' })
    ];
    tiles.forEach(tile => {
      App.worldMap.set(`${tile.x},${tile.y}`, tile);
      App.exploredTiles.add(`${tile.x},${tile.y}`);
    });
    App.renderMap();
    App.renderParty();
    App.renderCreatures();
  });
  await page.waitForFunction(() => Boolean(window.YAW_TILESET_RUNTIME?.builtinCandidate), null, { timeout: 10000 });
  await page.evaluate(() => App.renderMap());
  await page.waitForTimeout(50);
}

async function readOverworldAcceptance(page) {
  return page.evaluate(() => {
    const read = selector => {
      const element = document.querySelector(selector);
      const bridgeLayer = element?.querySelector('[data-tileset-semantic-key="route-bridge-horizontal"]');
      const bridgeStyle = bridgeLayer ? getComputedStyle(bridgeLayer) : null;
      return {
        exists: Boolean(element),
        schema: element?.getAttribute('data-tile-composition') || '',
        version: element?.getAttribute('data-tile-composition-version') || '',
        space: element?.getAttribute('data-tile-composition-space') || '',
        layers: element?.getAttribute('data-tile-composition-layers') || '',
        semantics: element?.getAttribute('data-tileset-semantic-keys') || '',
        artLayers: element?.querySelectorAll('.yaw-tile-art-layer').length || 0,
        bridgeArt: Boolean(element?.querySelector('[data-tileset-semantic-key="route-bridge-horizontal"]')),
        bridgeSpanRole: element?.getAttribute('data-bridge-span-role') || '',
        bridgeSpanIndex: element?.getAttribute('data-bridge-span-index') || '',
        bridgeSpanLength: element?.getAttribute('data-bridge-span-length') || '',
        bridgeApproaches: element?.getAttribute('data-bridge-approach-edges') || '',
        visualRecipe: element?.getAttribute('data-visual-recipe') || '',
        routeShoulder: element?.getAttribute('data-route-shoulder') || '',
        adjacencyEdges: element?.getAttribute('data-adjacency-blend-edges') || '',
        sharedEdgeKeys: element?.getAttribute('data-shared-edge-keys') || '',
        junctions: element?.getAttribute('data-adjacency-junctions') || '',
        shorelineEdges: element?.getAttribute('data-shoreline-edges') || '',
        bridgeBleedsAcrossGutter: bridgeStyle?.left === '-4px' && bridgeStyle?.right === '-4px'
      };
    };
    const routeFilter = root => {
      const layer = document.querySelector(`${root} [data-route-shoulder="grass"] [data-tileset-semantic-key^="route-road-"]`);
      return layer ? getComputedStyle(layer).filter : '';
    };
    const tile = App.worldMap.get('0,0');
    const snapshot = App._mapTileVisual(tile, {
      isCurrent: true,
      neighborResolver: (x, y) => App.worldMap.get(`${x},${y}`) || null
    }).composition;
    const transitionTile = App.worldMap.get('0,-1');
    const transitionVisual = App._mapTileVisual(transitionTile, {
      neighborResolver: (x, y) => App.worldMap.get(`${x},${y}`) || null
    });
    const transitionSnapshot = transitionVisual.composition;
    const activeSurface = innerWidth <= 1024
      ? document.querySelector('.mobile-map-card')
      : document.querySelector('.desktop-play-surface');
    const rect = activeSurface?.getBoundingClientRect();
    const transitionLayer = document.querySelector('[data-edge-profile="ground-transition"]');
    const shorelineLayer = document.querySelector('[data-edge-profile="shoreline"]');
    const transitionStyle = transitionLayer ? getComputedStyle(transitionLayer) : null;
    const shorelineStyle = shorelineLayer ? getComputedStyle(shorelineLayer) : null;
    const shorelineFoamContent = shorelineLayer ? getComputedStyle(shorelineLayer, '::after').content : '';
    const duplicateWaterBlend = [...document.querySelectorAll('[data-shoreline-edges]')].some(element => String(element.getAttribute('data-ground-transitions') || '').includes(':water'));
    return {
      protocol: location.protocol,
      mobile: read('#mobile-mini-map [data-stage-cell="center"]'),
      desktop: read('#desktop-map-cell-center'),
      large: read('#large-map .large-map-tile.current'),
      mobileCount: document.querySelectorAll('#mobile-mini-map [data-tile-composition-version="2"]').length,
      desktopCount: document.querySelectorAll('#desktop-neighborhood-grid [data-tile-composition-version="2"]').length,
      largeCount: document.querySelectorAll('#large-map [data-tile-composition-version="2"]').length,
      mobileCliffCount: document.querySelectorAll('#mobile-mini-map [data-elevation-kind="cliff"]').length,
      desktopCliffCount: document.querySelectorAll('#desktop-neighborhood-grid [data-elevation-kind="cliff"]').length,
      largeCliffCount: document.querySelectorAll('#large-map [data-elevation-kind="cliff"]').length,
      elevationArtCounts: {
        mobile: document.querySelectorAll('#mobile-mini-map [data-tileset-semantic-key^="terrain-elevation-"]').length,
        desktop: document.querySelectorAll('#desktop-neighborhood-grid [data-tileset-semantic-key^="terrain-elevation-"]').length,
        large: document.querySelectorAll('#large-map [data-tileset-semantic-key^="terrain-elevation-"]').length
      },
      evidenceKinds: snapshot.layers.evidence.records.map(record => record.kind),
      presenceIds: snapshot.layers.presence.records.map(record => record.id),
      routeKinds: snapshot.layers.route.records.map(record => record.kind),
      bridgeApproachEdges: snapshot.layers.route.records.find(record => record.kind === 'bridge-approach')?.approachEdges || [],
      sharedEdges: snapshot.facts.adjacency.sharedEdges,
      coverSpills: transitionSnapshot.layers.cover.records.filter(record => record.kind === 'adjacent-spill'),
      transitionEdges: transitionSnapshot.layers.terrain.records.find(record => record.kind === 'ground-transition')?.edges || [],
      transitionJunctions: transitionSnapshot.facts.adjacency.junctions,
      transitionRecipeVersion: transitionSnapshot.facts.presentationRecipeVersion,
      transitionContour: transitionLayer?.getAttribute('data-edge-contour') || '',
      transitionClipPath: transitionStyle?.clipPath || '',
      transitionMaskImage: transitionStyle?.maskImage || transitionStyle?.webkitMaskImage || '',
      shorelineContour: shorelineLayer?.getAttribute('data-edge-contour') || '',
      shorelineClipPath: shorelineStyle?.clipPath || '',
      shorelineMaskImage: shorelineStyle?.maskImage || shorelineStyle?.webkitMaskImage || '',
      shorelineFoamContent,
      duplicateWaterBlend,
      jungleIdentityCounts: {
        mobile: document.querySelectorAll('#mobile-mini-map [data-visual-recipe="jungle"] [data-cover-kind="biome-identity"]').length,
        desktop: document.querySelectorAll('#desktop-neighborhood-grid [data-visual-recipe="jungle"] [data-cover-kind="biome-identity"]').length,
        large: document.querySelectorAll('#large-map [data-visual-recipe="jungle"] [data-cover-kind="biome-identity"]').length
      },
      plainsIdentityCount: document.querySelectorAll('[data-visual-recipe="plains"] [data-cover-kind="biome-identity"]').length,
      beachIdentityCount: document.querySelectorAll('[data-visual-recipe="beach"] [data-tileset-semantic-key="cover-beach-identity"]').length,
      mobileRoadFilter: routeFilter('#mobile-mini-map'),
      desktopRoadFilter: routeFilter('#desktop-neighborhood-grid'),
      largeRoadFilter: routeFilter('#large-map'),
      restoredEvidenceKinds: (() => {
        const delta = App._tileDeltaFromEffectiveTile(tile);
        const restored = App.applyTileDelta(App.getBaseTile(0, 0), JSON.parse(JSON.stringify(delta)));
        return App._mapTileVisual(restored, { isCurrent: true }).composition.layers.evidence.records.map(record => record.kind);
      })(),
      activeSurfaceInsideViewport: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
}

async function exerciseComposedTraversal(page) {
  const moved = await page.evaluate(() => {
    App.cheats.noEnemies = true;
    return App.move(1, 0);
  });
  await page.waitForTimeout(50);
  const state = await page.evaluate(() => {
    const activeGrid = innerWidth <= 1024
      ? document.querySelector('#mobile-mini-map')
      : document.querySelector('#desktop-neighborhood-grid');
    const current = innerWidth <= 1024
      ? document.querySelector('#mobile-mini-map [data-stage-cell="center"]')
      : document.querySelector('#desktop-map-cell-center');
    return {
      location: `${App.location.x},${App.location.y}`,
      gap: activeGrid ? getComputedStyle(activeGrid).gap : '',
      cells: activeGrid?.querySelectorAll('[data-tile-composition-version="2"]').length || 0,
      currentOpacity: current?.querySelector('[data-tileset-semantic-key="state-current"]')
        ? getComputedStyle(current.querySelector('[data-tileset-semantic-key="state-current"]')).opacity
        : '',
      currentRing: current ? getComputedStyle(current).boxShadow : '',
      reviewCurrent: document.querySelectorAll('#large-map .large-map-tile.current').length
    };
  });
  const returned = await page.evaluate(() => App.move(-1, 0));
  await page.waitForTimeout(50);
  return { moved, returned, state };
}

async function readArtAssetAcceptance(page) {
  return page.evaluate(async () => {
    const candidate = YAW_TILESET_RUNTIME.builtinCandidate;
    const loadPixels = async atlasId => {
      const atlas = candidate.leases.get(atlasId);
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = atlas.url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return {
        width: canvas.width,
        height: canvas.height,
        data: context.getImageData(0, 0, canvas.width, canvas.height).data
      };
    };
    const material = await loadPixels('materials-v2');
    const bridge = await loadPixels('bridge-v2');
    const cover = await loadPixels('cover-v2');
    const coverV3 = await loadPixels('cover-v3');
    const structuresV3 = await loadPixels('structures-v3');
    const poiV3 = await loadPixels('poi-v3');
    const evidenceV3 = await loadPixels('evidence-v3');
    const reliefV1 = await loadPixels('relief-v1');
    const jungleStrataV1 = await loadPixels('jungle-strata-v1');
    const biomeStrataV2 = await loadPixels('biome-strata-v2');
    const samePixel = (pixels, left, right) => {
      const offset = value => (value.y * pixels.width + value.x) * 4;
      const a = offset(left);
      const b = offset(right);
      return [0, 1, 2, 3].every(channel => pixels.data[a + channel] === pixels.data[b + channel]);
    };
    let materialEdgesMatch = true;
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        for (let offset = 0; offset < 256; offset += 1) {
          materialEdgesMatch &&= samePixel(material,
            { x: col * 256, y: row * 256 + offset },
            { x: col * 256 + 255, y: row * 256 + offset });
          materialEdgesMatch &&= samePixel(material,
            { x: col * 256 + offset, y: row * 256 },
            { x: col * 256 + offset, y: row * 256 + 255 });
        }
      }
    }
    const alphaAt = (pixels, x, y) => pixels.data[(y * pixels.width + x) * 4 + 3];
    const vertical = candidate.pack.tiles['route-bridge-vertical'].layers[0];
    const horizontal = candidate.pack.tiles['route-bridge-horizontal'].layers[0];
    const foliage = candidate.pack.tiles['cover-foliage'].layers[0];
    const alphaRatio = pixels => {
      let visible = 0;
      for (let index = 3; index < pixels.data.length; index += 4) {
        if (pixels.data[index] > 0) visible += 1;
      }
      return visible / (pixels.width * pixels.height);
    };
    const transparentCorners = pixels => [
      [0, 0], [pixels.width - 1, 0], [0, pixels.height - 1], [pixels.width - 1, pixels.height - 1]
    ].every(([x, y]) => alphaAt(pixels, x, y) === 0);
    const reliefAtlasIds = [...new Set(Object.entries(candidate.pack.tiles)
      .filter(([key]) => key.startsWith('terrain-elevation-'))
      .flatMap(([, tile]) => tile.layers.map(layer => layer.atlasId)))];
    const jungleAtlasIds = [...new Set(['cover-jungle-canopy', 'cover-jungle-undergrowth', 'cover-jungle-litter', 'cover-jungle-spill']
      .flatMap(key => candidate.pack.tiles[key].layers.map(layer => layer.atlasId)))];
    const biomeAtlasIds = [...new Set([
      'cover-grove-identity', 'cover-grove-spill', 'cover-forest-identity', 'cover-forest-spill',
      'cover-plains-identity', 'cover-plains-spill', 'cover-swamp-identity', 'cover-swamp-spill',
      'cover-cave-identity', 'cover-cave-spill'
    ].flatMap(key => candidate.pack.tiles[key].layers.map(layer => layer.atlasId)))];
    const beachIdentityAtlasIds = [...new Set(candidate.pack.tiles['cover-beach-identity'].layers.map(layer => layer.atlasId))];
    return {
      materialDimensions: `${material.width}x${material.height}`,
      materialEdgesMatch,
      bridgeDimensions: `${bridge.width}x${bridge.height}`,
      bridgeRects: `${vertical.rect.x}/${vertical.rect.width}:${horizontal.rect.x}/${horizontal.rect.width}`,
      bridgeTransparentCorners: alphaAt(bridge, 0, 0) === 0 && alphaAt(bridge, 1023, 511) === 0,
      coverDimensions: `${cover.width}x${cover.height}`,
      coverTransparentCorners: alphaAt(cover, 0, 0) === 0 && alphaAt(cover, 511, 511) === 0,
      coverSlot: foliage.slot,
      v3Dimensions: [`${coverV3.width}x${coverV3.height}`, `${structuresV3.width}x${structuresV3.height}`, `${poiV3.width}x${poiV3.height}`, `${evidenceV3.width}x${evidenceV3.height}`],
      v3TransparentCorners: [coverV3, structuresV3, poiV3, evidenceV3].every(pixels =>
        alphaAt(pixels, 0, 0) === 0 && alphaAt(pixels, pixels.width - 1, pixels.height - 1) === 0
      ),
      qualityPassDimensions: [`${reliefV1.width}x${reliefV1.height}`, `${jungleStrataV1.width}x${jungleStrataV1.height}`, `${biomeStrataV2.width}x${biomeStrataV2.height}`],
      qualityPassTransparentCorners: transparentCorners(reliefV1) && transparentCorners(jungleStrataV1) && transparentCorners(biomeStrataV2),
      qualityPassAlphaRatios: [alphaRatio(reliefV1), alphaRatio(jungleStrataV1), alphaRatio(biomeStrataV2)],
      reliefAtlasIds,
      jungleAtlasIds,
      biomeAtlasIds,
      beachIdentityAtlasIds
    };
  });
}

async function readGeneratedWorldAcceptance(page) {
  return page.evaluate(() => {
    App.worldMeta = App._normalizeWorldMeta({ worldId: 'generated-composition', seed: 'generated-composition', generatorVersion: 7, mapModsHash: 'core' });
    const tiles = [];
    for (let y = -24; y <= 24; y += 1) {
      for (let x = -24; x <= 24; x += 1) tiles.push(App.getBaseTile(x, y));
    }
    const coverTile = tiles.find(tile => tile.overlays?.cover?.length);
    const transitionTile = tiles.find(tile => {
      const visual = App._mapTileVisual(tile, { neighborResolver: (x, y) => App.getBaseTile(x, y) });
      return visual.groundTransitions?.length && visual.composition.layers.cover.records.some(record => record.kind === 'adjacent-spill');
    });
    const poiTile = tiles.find(tile => tile.overlays?.poi);
    const visualFor = tile => App._mapTileVisual(tile, {
      isCurrent: false,
      neighborResolver: (x, y) => App.getBaseTile(x, y)
    });
    const coverVisual = visualFor(coverTile);
    const transitionVisual = visualFor(transitionTile);
    const poiVisual = visualFor(poiTile);
    const coverLayers = YAW_TILESET_RUNTIME.layersForVisual(coverVisual).layers;
    const transitionLayers = YAW_TILESET_RUNTIME.layersForVisual(transitionVisual).layers;
    const poiLayers = YAW_TILESET_RUNTIME.layersForVisual(poiVisual).layers;
    const order = ['ground', 'terrain', 'route', 'cover', 'feature', 'evidence', 'presence', 'state'];
    const sorted = layers => layers.every((layer, index) => !index || order.indexOf(layers[index - 1].compositionLayer) <= order.indexOf(layer.compositionLayer));
    const identitySignatures = new Set(tiles.filter(tile => tile.derivedBiome === 'plains').slice(0, 24).map(tile => {
      const identity = YAW_TILE_VISUAL_RECIPES.compose(tile, () => null).cover.find(record => record.kind === 'biome-identity');
      return identity ? [identity.anchor.x, identity.anchor.y, identity.scale, identity.rotation, identity.flipX, identity.variant].join(':') : '';
    }).filter(Boolean));
    const contourSignatures = new Set(tiles.slice(0, 160).flatMap(tile => {
      const visual = visualFor(tile);
      return visual.adjacencyBlend.sharedEdges.filter(edge => edge.destinationOwned).map(edge => edge.contour.join(','));
    }));
    return {
      generatedTileCount: tiles.length,
      generatedCoverCount: tiles.filter(tile => tile.overlays?.cover?.length).length,
      generatedFamilies: [...new Set(tiles.flatMap(tile => (tile.overlays?.cover || []).map(record => record.family)))].sort(),
      coverRecords: coverVisual.composition.layers.cover.records,
      coverRendered: coverLayers.filter(layer => layer.compositionLayer === 'cover').length,
      coverSorted: sorted(coverLayers),
      transitionRecords: transitionVisual.composition.layers.terrain.records.filter(record => record.kind === 'ground-transition'),
      transitionSpills: transitionVisual.composition.layers.cover.records.filter(record => record.kind === 'adjacent-spill'),
      transitionSpillArt: transitionLayers.filter(layer => layer.compositionLayer === 'cover' && layer.recordIndex !== undefined).length,
      transitionArt: transitionLayers.some(layer => layer.semanticKey.startsWith('ground-transition-')),
      identitySignatureCount: identitySignatures.size,
      contourSignatureCount: contourSignatures.size,
      poiGroundLayer: poiLayers.some(layer => layer.compositionLayer === 'ground'),
      poiFeatureLayer: poiLayers.some(layer => layer.compositionLayer === 'feature'),
      poiGrounding: poiVisual.composition.layers.feature.records.some(record => record.kind === 'feature-grounding'),
      poiSorted: sorted(poiLayers)
    };
  });
}

async function seedInteriorLab(page) {
  await page.evaluate(() => {
    const center = {
      x: 0, y: 0, biome: 'indoors', explored: true,
      connections: ['north', 'east', 'south', 'west'],
      items: [{ id: 'interior-key', name: 'Key' }],
      creatures: [{ id: 'interior-moth', name: 'Moth', disposition: App.DISPOSITION.FRIENDLY }]
    };
    const tiles = {
      '0,0': center,
      '0,-1': { x: 0, y: -1, biome: 'indoors', explored: true, connections: ['south'] },
      '1,0': { x: 1, y: 0, biome: 'indoors', explored: true, connections: ['west'], exit: true },
      '0,1': { x: 0, y: 1, biome: 'indoors', explored: true, connections: ['north'] },
      '-1,0': { x: -1, y: 0, biome: 'indoors', explored: true, connections: ['east'], structure: 'camp' }
    };
    App.inInterior = true;
    App.interiorLocation = { x: 0, y: 0 };
    App.activeInterior = { kind: 'building', structure: 'cabin', structureName: 'Composition Lab', tiles };
    App.renderMap();
  });
  await page.waitForTimeout(50);
}

async function readInteriorAcceptance(page) {
  return page.evaluate(() => {
    const read = selector => {
      const element = document.querySelector(selector);
      return {
        schema: element?.getAttribute('data-tile-composition') || '',
        version: element?.getAttribute('data-tile-composition-version') || '',
        space: element?.getAttribute('data-tile-composition-space') || '',
        layers: element?.getAttribute('data-tile-composition-layers') || '',
        semantics: element?.getAttribute('data-tileset-semantic-keys') || ''
      };
    };
    const room = App.activeInterior.tiles['0,0'];
    const snapshot = App._interiorTileVisual(room, {
      x: 0, y: 0, isCurrent: true, interiorKind: 'building', interiorStructure: 'cabin'
    }).composition;
    return {
      mobile: read('#mobile-mini-map [data-stage-cell="center"]'),
      desktop: read('#desktop-map-cell-center'),
      mobileCount: document.querySelectorAll('#mobile-mini-map [data-tile-composition-space="interior"]').length,
      desktopCount: document.querySelectorAll('#desktop-neighborhood-grid [data-tile-composition-space="interior"]').length,
      routeKinds: snapshot.layers.route.records.map(record => record.kind),
      evidenceIds: snapshot.layers.evidence.records.map(record => record.id),
      presenceIds: snapshot.layers.presence.records.map(record => record.id),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
}

function assertSurface(surface, label, space) {
  assert.strictEqual(surface.exists ?? true, true, `${label}: surface should exist`);
  assert.strictEqual(surface.schema, 'yaw-map-scene-snapshot', `${label}: should expose the V2 snapshot schema`);
  assert.strictEqual(surface.version, '2', `${label}: should expose snapshot Version 2`);
  assert.strictEqual(surface.space, space, `${label}: should expose ${space} composition space`);
}

async function checkOriginViewport(browser, origin, url, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.width <= 1024 });
  const pageErrors = [];
  const failedResponses = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.App && window.YAW_TILE_COMPOSITION_V2), null, { timeout: 15000 });
    await seedCompositionLab(page);
    const overworld = await readOverworldAcceptance(page);
    const prefix = `${origin}/${viewport.name}`;
    const activeLocal = viewport.width <= 1024 ? overworld.mobile : overworld.desktop;
    const activeRoadFilter = viewport.width <= 1024 ? overworld.mobileRoadFilter : overworld.desktopRoadFilter;
    assertSurface(overworld.mobile, `${prefix} mobile 3x3`, 'overworld');
    assertSurface(overworld.desktop, `${prefix} desktop 3x3`, 'overworld');
    assertSurface(overworld.large, `${prefix} large map`, 'overworld');
    assert.strictEqual(overworld.mobile.layers, overworld.desktop.layers, `${prefix}: mobile and desktop active layers should agree`);
    assert.strictEqual(overworld.mobile.layers, overworld.large.layers, `${prefix}: local and large-map active layers should agree`);
    assert.strictEqual(overworld.mobile.semantics, overworld.desktop.semantics, `${prefix}: mobile and desktop V1 compatibility keys should agree`);
    assert.strictEqual(overworld.mobile.semantics, overworld.large.semantics, `${prefix}: local and large-map V1 compatibility keys should agree`);
    assert(overworld.mobile.layers.includes('route') && overworld.mobile.layers.includes('evidence') && overworld.mobile.layers.includes('presence') && overworld.mobile.layers.includes('state'), `${prefix}: mixed tile should expose route, evidence, presence, and state layers`);
    assert(overworld.mobile.artLayers > 0 && overworld.desktop.artLayers > 0 && overworld.large.artLayers > 0, `${prefix}: every surface should resolve V1 art layers; got ${JSON.stringify({ mobile: overworld.mobile.artLayers, desktop: overworld.desktop.artLayers, large: overworld.large.artLayers })}`);
    assert(overworld.mobile.bridgeArt && overworld.desktop.bridgeArt && overworld.large.bridgeArt, `${prefix}: every surface should resolve the bridge semantic`);
    assert(overworld.mobile.bridgeBleedsAcrossGutter && overworld.desktop.bridgeBleedsAcrossGutter && overworld.large.bridgeBleedsAcrossGutter, `${prefix}: horizontal bridge art should close each surface gutter`);
    assert.strictEqual(overworld.mobile.bridgeSpanRole, 'single', `${prefix}: mobile should expose the bridge span role`);
    assert.strictEqual(overworld.mobile.bridgeSpanRole, overworld.desktop.bridgeSpanRole, `${prefix}: desktop bridge span role should match mobile`);
    assert.strictEqual(overworld.mobile.bridgeSpanRole, overworld.large.bridgeSpanRole, `${prefix}: large-map bridge span role should match local maps`);
    assert.strictEqual(`${overworld.mobile.bridgeSpanIndex}/${overworld.mobile.bridgeSpanLength}`, '0/1', `${prefix}: bridge span position should remain exact`);
    assert.strictEqual(activeLocal.bridgeApproaches, 'east west', `${prefix}: active local bridge should expose both destination-owned land approaches`);
    assert.strictEqual(activeLocal.bridgeApproaches, overworld.large.bridgeApproaches, `${prefix}: Review Map bridge approaches should match the active local map`);
    assert.strictEqual(activeLocal.visualRecipe, 'water', `${prefix}: current bridge should expose its water presentation recipe`);
    assert.strictEqual(activeLocal.routeShoulder, 'wet', `${prefix}: current bridge should expose its biome-aware shoulder treatment`);
    assert(activeLocal.sharedEdgeKeys && activeLocal.sharedEdgeKeys === overworld.large.sharedEdgeKeys, `${prefix}: active local and Review Map surfaces should expose the same canonical shared-edge keys`);
    assert.strictEqual(activeLocal.adjacencyEdges, '', `${prefix}: a water source tile must not repaint land through a duplicate generic transition`);
    assert(overworld.sharedEdges.length >= 2 && overworld.sharedEdges.every(edge => edge.policy === 'shoreline' && !edge.destinationOwned), `${prefix}: water-side seam facts must retain specialized single-owner shoreline policy`);
    assert.strictEqual(overworld.mobileCount, 9, `${prefix}: mobile 3x3 should compose all nine cells`);
    assert.strictEqual(overworld.desktopCount, 9, `${prefix}: desktop 3x3 should compose all nine cells`);
    assert(overworld.largeCount >= 9, `${prefix}: large map should compose every known lab cell`);
    assert(overworld.mobileCliffCount >= 1 && overworld.desktopCliffCount >= 1 && overworld.largeCliffCount >= 1, `${prefix}: directional cliff topology should reach every overworld surface`);
    assert(overworld.elevationArtCounts.mobile >= 1 && overworld.elevationArtCounts.desktop >= 1 && overworld.elevationArtCounts.large >= 1, `${prefix}: directional relief artwork should resolve on every overworld surface`);
    assert(overworld.evidenceKinds.includes('item') && overworld.evidenceKinds.includes('remains') && overworld.evidenceKinds.includes('recovery-bag') && overworld.evidenceKinds.includes('placed-object'), `${prefix}: durable evidence kinds should coexist`);
    assert.deepStrictEqual(overworld.restoredEvidenceKinds, overworld.evidenceKinds, `${prefix}: sparse tile-delta restoration should preserve every evidence kind`);
    assert(overworld.presenceIds.includes('composition-player') && overworld.presenceIds.includes('composition-fox'), `${prefix}: party and live creature presence should coexist`);
    assert(overworld.routeKinds.includes('bridge') && overworld.routeKinds.includes('bridge-approach'), `${prefix}: bridge geometry and approach treatment should coexist in the route layer`);
    assert.deepStrictEqual(overworld.bridgeApproachEdges, ['east', 'west'], `${prefix}: bridge snapshot should preserve exact approach topology`);
    assert(overworld.coverSpills.length >= 1 && overworld.coverSpills.every(record => record.destinationOwned && !record.mechanical && record.edgeBand), `${prefix}: a soft dominant neighbor should contribute only edge-bounded destination-owned spill`);
    assert(overworld.transitionEdges.length >= 1 && overworld.transitionEdges.every(edge => edge.sharedEdgeKey && edge.style), `${prefix}: rendered terrain transitions should retain canonical seam metadata`);
    assert(overworld.transitionJunctions.length === 4, `${prefix}: the destination snapshot should publish all four eight-neighbor junction decisions`);
    assert.strictEqual(overworld.transitionRecipeVersion, 3, `${prefix}: map-scene snapshots should advertise visual recipe Version 3`);
    assert.strictEqual(overworld.transitionContour.split(' ').length, 5, `${prefix}: rendered soft transitions should expose their five-point deterministic contour`);
    assert(overworld.transitionClipPath.startsWith('polygon(') && overworld.transitionMaskImage !== 'none', `${prefix}: bundled soft transitions should combine a contour polygon with a feathered material mask`);
    assert.strictEqual(overworld.shorelineContour.split(' ').length, 5, `${prefix}: specialized water-land seams should expose their canonical contour`);
    assert(overworld.shorelineClipPath.startsWith('polygon(') && overworld.shorelineMaskImage !== 'none', `${prefix}: bundled shoreline water should follow the canonical contour through its specialized mask`);
    assert(['none', 'normal', ''].includes(overworld.shorelineFoamContent), `${prefix}: bundled shoreline paint must not restore the removed repeating scallop pseudo-element`);
    assert.strictEqual(overworld.duplicateWaterBlend, false, `${prefix}: a shoreline cell must not also render a generic water transition`);
    assert(overworld.jungleIdentityCounts.mobile >= 3 && overworld.jungleIdentityCounts.desktop >= 3 && overworld.jungleIdentityCounts.large >= 3, `${prefix}: jungle canopy, undergrowth, and litter strata must reach every map surface`);
    assert(overworld.plainsIdentityCount > 0, `${prefix}: plains should receive its restrained grass identity overlay`);
    assert(overworld.beachIdentityCount > 0, `${prefix}: beach should receive its restrained drift identity overlay`);
    assert(overworld.plainsIdentityCount < Object.values(overworld.jungleIdentityCounts).reduce((sum, count) => sum + count, 0), `${prefix}: plains identity should remain sparser than layered jungle`);
    assert(activeRoadFilter && activeRoadFilter !== 'none', `${prefix}: active local road should receive a visible biome-aware verge treatment`);
    assert.strictEqual(activeRoadFilter, overworld.largeRoadFilter, `${prefix}: Review Map road verge treatment should match the active local map`);
    assert.strictEqual(overworld.activeSurfaceInsideViewport, true, `${prefix}: active map surface should remain inside the viewport`);
    assert.strictEqual(overworld.horizontalOverflow, false, `${prefix}: overworld composition should not create horizontal overflow`);

    const art = await readArtAssetAcceptance(page);
    assert.strictEqual(art.materialDimensions, '768x768', `${prefix}: V2 ground atlas should retain its reviewed grid`);
    assert.strictEqual(art.materialEdgesMatch, true, `${prefix}: every V2 ground cell should match opposite edges pixel-for-pixel`);
    assert.strictEqual(art.bridgeDimensions, '1024x512', `${prefix}: bridge atlas should retain both cardinal directions`);
    assert.strictEqual(art.bridgeRects, '0/512:512/512', `${prefix}: bridge directions should use adjacent full-span cells`);
    assert.strictEqual(art.bridgeTransparentCorners, true, `${prefix}: bridge presentation should stay transparent off the deck`);
    assert.strictEqual(art.coverDimensions, '512x512', `${prefix}: cover sprite should retain its reviewed bounds`);
    assert.strictEqual(art.coverTransparentCorners, true, `${prefix}: cover presentation should remain independent from ground`);
    assert.strictEqual(art.coverSlot, 'feature', `${prefix}: Tileset Pack V1 should receive cover through its compatible feature slot`);
    assert.deepStrictEqual(art.v3Dimensions, ['1774x887', '1254x1254', '1536x1024', '1774x887'], `${prefix}: compositional overlay atlases should retain their reviewed grids`);
    assert.strictEqual(art.v3TransparentCorners, true, `${prefix}: structures, POIs, cover, and evidence must not carry baked terrain corners`);
    assert.deepStrictEqual(art.qualityPassDimensions, ['1995x788', '1774x887', '1500x600'], `${prefix}: quality-pass relief, jungle, and biome atlases should retain their reviewed bounds`);
    assert.strictEqual(art.qualityPassTransparentCorners, true, `${prefix}: relief and biome strata must retain transparent outer corners`);
    assert(art.qualityPassAlphaRatios.every(ratio => ratio > 0.05 && ratio < 0.5), `${prefix}: quality-pass overlays should contain visible art without reintroducing baked ground`);
    assert.deepStrictEqual(art.reliefAtlasIds, ['relief-v1'], `${prefix}: all directional elevation semantics should resolve through the relief atlas`);
    assert.deepStrictEqual(art.jungleAtlasIds, ['jungle-strata-v1'], `${prefix}: every jungle stratum and spill semantic should resolve through the jungle atlas`);
    assert.deepStrictEqual(art.biomeAtlasIds, ['biome-strata-v2'], `${prefix}: every remaining biome identity and spill semantic should resolve through the biome strata atlas`);
    assert.deepStrictEqual(art.beachIdentityAtlasIds, ['cover-v3'], `${prefix}: beach identity should reuse the reviewed transparent drift artwork without adding another atlas`);

    const generated = await readGeneratedWorldAcceptance(page);
    assert.strictEqual(generated.generatedTileCount, 2401, `${prefix}: generated-world audit should inspect the full deterministic sample`);
    assert(generated.generatedCoverCount > 0 && generated.generatedFamilies.length >= 4, `${prefix}: ordinary generation should populate varied cover families`);
    assert(generated.coverRecords.length > 0 && generated.coverRecords.every(record => record.role === 'decorative' || record.mechanical), `${prefix}: generated cover should expose explicit decorative/mechanical roles`);
    assert.strictEqual(generated.coverRendered, generated.coverRecords.length, `${prefix}: each generated cover record should become an independently positioned art layer`);
    assert.strictEqual(generated.coverSorted, true, `${prefix}: generated art should follow the explicit eight-layer order`);
    assert(generated.transitionRecords.length > 0 && generated.transitionArt, `${prefix}: adjacent generated biomes should produce terrain transition records and art`);
    assert(generated.transitionSpills.length > 0 && generated.transitionSpills.every(record => record.destinationOwned && !record.mechanical), `${prefix}: generated adjacency should add only destination-owned decorative cover spill`);
    assert(generated.transitionSpillArt >= generated.transitionSpills.length, `${prefix}: every generated adjacency spill should resolve through dynamic cover art`);
    assert(generated.identitySignatureCount >= 8, `${prefix}: generated plains identity art should receive broad deterministic coordinate variation`);
    assert(generated.contourSignatureCount >= 8, `${prefix}: generated shared edges should not repeat one transition contour`);
    assert(generated.poiGroundLayer && generated.poiFeatureLayer && generated.poiGrounding && generated.poiSorted, `${prefix}: generated POIs should retain ground and biome grounding beneath a later transparent feature layer`);

    await seedInteriorLab(page);
    const interior = await readInteriorAcceptance(page);
    assertSurface(interior.mobile, `${prefix} mobile interior`, 'interior');
    assertSurface(interior.desktop, `${prefix} desktop interior`, 'interior');
    assert.strictEqual(interior.mobile.layers, interior.desktop.layers, `${prefix}: mobile and desktop interior layers should agree`);
    assert.strictEqual(interior.mobile.semantics, interior.desktop.semantics, `${prefix}: mobile and desktop interior compatibility keys should agree`);
    assert.strictEqual(interior.mobileCount, 9, `${prefix}: mobile interior should compose its full 3x3 frame including walls`);
    assert.strictEqual(interior.desktopCount, 9, `${prefix}: desktop interior should compose its full 3x3 frame including walls`);
    assert(interior.routeKinds.includes('path'), `${prefix}: interior connections should project as route topology`);
    assert(interior.evidenceIds.includes('interior-key'), `${prefix}: interior items should project as durable evidence`);
    assert(interior.presenceIds.includes('composition-player') && interior.presenceIds.includes('interior-moth'), `${prefix}: interior party and creature presence should coexist`);
    assert.strictEqual(interior.horizontalOverflow, false, `${prefix}: interior composition should not create horizontal overflow`);

    await seedCompositionLab(page);
    const traversed = await exerciseComposedTraversal(page);
    assert.strictEqual(traversed.moved, true, `${prefix}: ordinary movement should enter the neighboring composed tile`);
    assert.strictEqual(traversed.returned, true, `${prefix}: ordinary movement should return across the composed edge`);
    assert.strictEqual(traversed.state.location, '1,0', `${prefix}: traversal should update the authoritative location`);
    assert.strictEqual(traversed.state.gap, '0px', `${prefix}: rerendered traversal art should remain continuous after movement`);
    assert.strictEqual(traversed.state.cells, 9, `${prefix}: traversal rerender should retain all nine independent cells`);
    assert.strictEqual(traversed.state.currentOpacity, '0', `${prefix}: movement should retain the unobstructed bundled current semantic`);
    assert.notStrictEqual(traversed.state.currentRing, 'none', `${prefix}: movement should retain the bounded current-cell ring`);
    assert.strictEqual(traversed.state.reviewCurrent, 1, `${prefix}: Review Map should follow traversal with one current tile`);

    assert.deepStrictEqual(pageErrors, [], `${prefix}: browser should not throw page errors`);
    assert.deepStrictEqual(failedResponses, [], `${prefix}: browser should not receive failed resources`);
    console.log(`  ✓ ${prefix}`);
  } finally {
    await page.close();
  }
}

(async () => {
  for (const file of [OFFLINE_BUILD, HOSTED_BUILD]) {
    if (!fs.existsSync(file)) throw new Error(`Missing build artifact: ${path.relative(ROOT, file)}`);
  }
  const hosted = await serveHostedBuild();
  const browser = await chromium.launch({ headless: true });
  try {
    const origins = [
      { name: 'file', url: pathToFileURL(OFFLINE_BUILD).href },
      { name: 'hosted', url: hosted.url }
    ];
    for (const origin of origins) {
      for (const viewport of VIEWPORTS) {
        await checkOriginViewport(browser, origin.name, origin.url, viewport);
      }
    }
  } finally {
    await browser.close();
    await hosted.close();
  }
  console.log('Tile Composition V2 browser acceptance: 2 origins × 4 viewports passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
