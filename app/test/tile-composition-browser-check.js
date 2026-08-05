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
      tileFor(1, 1, { biome: 'swamp', derivedBiome: 'swamp' })
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
        bridgeBleedsAcrossGutter: bridgeStyle?.left === '-4px' && bridgeStyle?.right === '-4px'
      };
    };
    const tile = App.worldMap.get('0,0');
    const snapshot = App._mapTileVisual(tile, {
      isCurrent: true,
      neighborResolver: (x, y) => App.worldMap.get(`${x},${y}`) || null
    }).composition;
    const activeSurface = innerWidth <= 1024
      ? document.querySelector('.mobile-map-card')
      : document.querySelector('.desktop-play-surface');
    const rect = activeSurface?.getBoundingClientRect();
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
      evidenceKinds: snapshot.layers.evidence.records.map(record => record.kind),
      presenceIds: snapshot.layers.presence.records.map(record => record.id),
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
    return {
      materialDimensions: `${material.width}x${material.height}`,
      materialEdgesMatch,
      bridgeDimensions: `${bridge.width}x${bridge.height}`,
      bridgeRects: `${vertical.rect.x}/${vertical.rect.width}:${horizontal.rect.x}/${horizontal.rect.width}`,
      bridgeTransparentCorners: alphaAt(bridge, 0, 0) === 0 && alphaAt(bridge, 1023, 511) === 0,
      coverDimensions: `${cover.width}x${cover.height}`,
      coverTransparentCorners: alphaAt(cover, 0, 0) === 0 && alphaAt(cover, 511, 511) === 0,
      coverSlot: foliage.slot
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
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.App && window.YAW_TILE_COMPOSITION_V2), null, { timeout: 15000 });
    await seedCompositionLab(page);
    const overworld = await readOverworldAcceptance(page);
    const prefix = `${origin}/${viewport.name}`;
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
    assert.strictEqual(overworld.mobileCount, 9, `${prefix}: mobile 3x3 should compose all nine cells`);
    assert.strictEqual(overworld.desktopCount, 9, `${prefix}: desktop 3x3 should compose all nine cells`);
    assert(overworld.largeCount >= 9, `${prefix}: large map should compose every known lab cell`);
    assert(overworld.mobileCliffCount >= 1 && overworld.desktopCliffCount >= 1 && overworld.largeCliffCount >= 1, `${prefix}: directional cliff topology should reach every overworld surface`);
    assert(overworld.evidenceKinds.includes('item') && overworld.evidenceKinds.includes('remains') && overworld.evidenceKinds.includes('recovery-bag') && overworld.evidenceKinds.includes('placed-object'), `${prefix}: durable evidence kinds should coexist`);
    assert.deepStrictEqual(overworld.restoredEvidenceKinds, overworld.evidenceKinds, `${prefix}: sparse tile-delta restoration should preserve every evidence kind`);
    assert(overworld.presenceIds.includes('composition-player') && overworld.presenceIds.includes('composition-fox'), `${prefix}: party and live creature presence should coexist`);
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
