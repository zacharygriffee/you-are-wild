#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function load(file, names = {}, result) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', file), 'utf8');
  const keys = Object.keys(names);
  return new Function(...keys, `${source}\nreturn ${result};`)(...keys.map(key => names[key]));
}

const scene = load('terrain-scene-v1.js', {}, 'YAW_TERRAIN_SCENE_V1');
const viewport = load('terrain-viewport-v1.js', {
  YAW_TERRAIN_SCENE_V1: scene
}, 'YAW_TERRAIN_VIEWPORT_V1');
const input = load('terrain-input-v1.js', {}, 'YAW_TERRAIN_INPUT_V1');
const registry = load('terrain-renderer-registry.js', {}, 'YAW_TERRAIN_RENDERERS');
const canvas = load('terrain-canvas-v1.js', {
  YAW_TERRAIN_SCENE_V1: scene,
  YAW_TERRAIN_RENDERERS: registry
}, 'YAW_TERRAIN_CANVAS_V1');
const canvasSurface = load('terrain-canvas-surface-v1.js', {
  YAW_TERRAIN_SCENE_V1: scene,
  YAW_TERRAIN_VIEWPORT_V1: viewport,
  YAW_TERRAIN_RENDERERS: registry,
  YAW_TERRAIN_CANVAS_V1: canvas,
  devicePixelRatio: 1
}, 'YAW_TERRAIN_CANVAS_SURFACE_V1');

let passed = 0;
function check(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
}

check(scene.chunkAddress(0, 0, 16).key === '0,0', 'Origin must use chunk 0,0');
check(scene.chunkAddress(15, 15, 16).key === '0,0', 'Positive chunk upper edge must remain in chunk 0,0');
check(scene.chunkAddress(16, 16, 16).key === '1,1', 'Positive chunk rollover must be exact');
check(scene.chunkAddress(-1, -1, 16).key === '-1,-1', 'Negative coordinates must floor into chunk -1,-1');
check(scene.chunkAddress(-16, -16, 16).key === '-1,-1', 'Negative exact multiples must remain stable');
check(scene.chunkAddress(-17, -17, 16).key === '-2,-2', 'Negative chunk rollover must be exact');

const camera = viewport.create({ centerX: 0, centerY: 0, width: 320, height: 320, baseTilePixels: 64 });
const localCamera = viewport.local(camera);
const surveyCamera = viewport.survey(camera, { x: 0, y: 0 }, 17);
check(Math.abs(viewport.tilePixels(localCamera) - 320 / 3) < 0.0001, 'Local camera must fit three tiles across the limiting viewport axis');
check(viewport.mode(localCamera) === 'local' && viewport.mode(surveyCamera) === 'regional', 'Local and survey presets must share one continuous zoom model');
const anchorBefore = viewport.screenToWorld(camera, 80, 120);
const zoomed = viewport.zoomAt(camera, 1.8, 80, 120);
const anchorAfter = viewport.screenToWorld(zoomed, 80, 120);
check(Math.abs(anchorBefore.x - anchorAfter.x) < 1e-9 && Math.abs(anchorBefore.y - anchorAfter.y) < 1e-9,
  'Pinch or wheel zoom must keep the world point below the gesture anchor stationary');
check(viewport.pinchFactor(100, 175) === 1.75, 'Pinch distance must map to a backend-neutral zoom factor');
check(viewport.visibleChunks(viewport.recenter(surveyCamera, -1, -1), { chunkSize: 4 }).some(chunk => chunk.x < 0 && chunk.y < 0),
  'A zoomed-out viewport must enumerate negative-coordinate chunks correctly');
check(!input.movedBeyond({ x: 10, y: 10 }, { x: 14, y: 14 }), 'Pointer jitter below the drag threshold must remain a click');
check(input.movedBeyond({ x: 10, y: 10 }, { x: 20, y: 10 }), 'Pointer travel beyond the drag threshold must suppress movement clicks');
check(input.intentForTile('local', { x: 7, y: -3 }, { x: 8, y: -4 }).kind === 'move',
  'A local adjacent Canvas tile must propose movement');
check(input.intentForTile('local', { x: 7, y: -3 }, { x: 8, y: -4 }).dx === 1,
  'Canvas movement proposals must remain relative to the authoritative player location');
check(input.intentForTile('local', { x: 7, y: -3 }, { x: 10, y: -3 }).kind === 'ignore',
  'A local Canvas must not propose movement outside the adjacent neighborhood');
check(input.intentForTile('survey', { x: 7, y: -3 }, { x: 20, y: 12 }).kind === 'inspect',
  'Survey clicks must inspect or recenter rather than move the player');
check(input.keyboardPan({ key: 'ArrowLeft' }).dx === -1 && input.keyboardPan({ code: 'KeyW' }).dy === -1,
  'Survey keyboard input must resolve to camera pan directions rather than party movement');

let resolutions = 0;
const resolveTile = (x, y) => {
  resolutions += 1;
  return {
    x, y,
    biome: x < 0 ? 'water' : (y < 0 ? 'beach' : 'forest'),
    derivedBiome: x < 0 ? 'water' : (y < 0 ? 'beach' : 'forest'),
    elevation: (x + y + 20) / 100,
    water: x < 0,
    traversal: { passable: x >= 0, traversalCost: x >= 0 ? 1 : 3 },
    terrainTopology: { kind: 'slope', uphillEdges: ['north'], downhillEdges: ['south'] },
    overlays: {
      road: y === 0 ? { id: `road-${x}`, connections: ['east', 'west'] } : null,
      shoreline: x < 0 ? { edges: ['east'] } : null,
      cover: x === 0 && y === 0 ? [{ id: 'tree-1', name: 'Tree', family: 'conifer', anchor: { x: 0.2, y: 0.8 }, scale: 1.25 }] : [],
      poi: x === 1 && y === 1 ? { id: 'spring-1', name: 'Spring', category: 'resource' } : null
    },
    items: x === 0 && y === 0 ? [{ id: 'rope-1', name: 'Rope' }] : [],
    deathBags: x === 0 && y === 0 ? [{ id: 'bag-1', name: 'Recovery bag' }] : [],
    placedObjects: x === 0 && y === 0 ? [{ id: 'marker-1', name: 'Trail marker' }] : [],
    creatures: x === 0 && y === 0 ? [{ id: 'fox-1', name: 'Fox' }] : []
  };
};

const first = scene.compileChunk({ chunkX: -1, chunkY: 0, chunkSize: 4, apron: 1, worldRevision: 'test-7', resolveTile });
const second = scene.compileChunk({ chunkX: -1, chunkY: 0, chunkSize: 4, apron: 1, worldRevision: 'test-7', resolveTile: (x, y) => resolveTile(x, y) });
check(first.schema === 'yaw-terrain-scene' && first.version === 1, 'Compiled chunks must use Terrain Scene V1');
check(first.renderBounds.width === 6 && first.renderBounds.height === 6, 'A one-tile apron must expand a 4x4 chunk to 6x6');
check(first.crop.x === 1 && first.crop.y === 1 && first.crop.width === 4, 'The interior crop must exclude the apron');
check(resolutions === 72, 'Each compile must resolve every tile in its expanded bounds exactly once');
check(first.layers.ground.length === 36, 'Every expanded chunk coordinate must have one ground record');
check(first.layers.routes.every(route => route.connections.join(',') === 'east,west'), 'Routes must carry normalized semantic connections');
check(first.cache.sceneKey === second.cache.sceneKey, 'Equivalent chunks must have stable cache identities');
check(JSON.stringify(first) === JSON.stringify(second), 'Equivalent simulation state must compile to byte-stable scene data');
check(!JSON.stringify(first).includes('function'), 'Terrain scenes must contain data rather than executable callbacks');
check(first.layers.ground.some(record => record.x === -1 && record.biome === 'water' && !record.passable), 'Simulation-owned biome and traversal facts must survive compilation');
check(first.layers.hydrology.some(record => record.kind === 'water' && record.edges.includes('east')), 'Hydrology must carry authored shoreline edges without renderer policy');
check(first.layers.cover.some(record => record.family === 'conifer' && record.anchor.x === 0.2 && record.scale === 1.25), 'Cover semantics must retain deterministic family, anchor, and scale facts');
check(first.layers.evidence.some(record => record.kind === 'item') && first.layers.evidence.some(record => record.kind === 'recovery-bag'), 'Durable evidence types must survive scene compilation');
check(first.layers.presence.some(record => record.label === 'Fox'), 'Known live presence must survive scene compilation');

const calls = [];
const context = {
  canvas: { width: 0, height: 0, style: {} },
  setTransform(...args) { calls.push(['setTransform', ...args]); },
  clearRect(...args) { calls.push(['clearRect', ...args]); },
  fillRect(...args) { calls.push(['fillRect', ...args]); },
  beginPath(...args) { calls.push(['beginPath', ...args]); },
  moveTo(...args) { calls.push(['moveTo', ...args]); },
  lineTo(...args) { calls.push(['lineTo', ...args]); },
  stroke(...args) { calls.push(['stroke', ...args]); },
  arc(...args) { calls.push(['arc', ...args]); },
  fill(...args) { calls.push(['fill', ...args]); }
};
const metadata = registry.list().find(entry => entry.id === canvas.ID);
check(metadata?.engine === 'Canvas2D' && !Object.hasOwn(metadata, 'create'), 'Registry listings must expose metadata without executable factories');
const renderer = registry.create(canvas.ID, context, { tilePixels: 32 });
const before = JSON.stringify(first);
const frame = renderer.render(first);
check(frame.pixelWidth === 192 && frame.pixelHeight === 192, 'Canvas output must include the apron in its backing surface');
check(frame.interiorSourceRect.x === 32 && frame.interiorSourceRect.width === 128, 'Canvas output must identify the crop for the canonical chunk interior');
check(calls.filter(call => call[0] === 'fillRect').length >= first.layers.ground.length, 'Canvas backend must paint every ground sample without per-cell DOM art');
check(JSON.stringify(first) === before, 'Renderers must not mutate terrain scenes');
renderer.destroy();
check(context.canvas.width === 0 && context.canvas.height === 0, 'Destroy must release the canvas backing surface');

let transitionStyle = '';
const transitionFills = [];
const transitionContext = {
  canvas: { width: 0, height: 0, style: {} },
  set fillStyle(value) { transitionStyle = value; },
  get fillStyle() { return transitionStyle; },
  setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
  save() {}, restore() {}, clip() {}, stroke() {}, arc() {}, fill() {},
  fillRect(...args) { transitionFills.push({ style: transitionStyle, args }); }
};
const transitionScene = scene.compileChunk({
  chunkX: 0,
  chunkY: 0,
  chunkSize: 2,
  apron: 0,
  worldRevision: 'transition-owner',
  resolveTile: (x, y) => ({
    x, y,
    biome: (x + y) % 2 === 0 ? 'beach' : 'plains',
    elevation: (x + y) % 2 === 0 ? 0.1 : 0.7,
    traversal: { passable: true, traversalCost: 1 }
  })
});
const transitionRenderer = registry.create(canvas.ID, transitionContext, { tilePixels: 32 });
transitionRenderer.render(transitionScene);
const boundaryFills = transitionFills.slice(transitionScene.layers.ground.length, transitionScene.layers.ground.length + 4);
check(boundaryFills.length === 4 && boundaryFills.every(fill => fill.style === canvas.PALETTE.beach),
  'Lower ecological surfaces must own horizontal and vertical non-water contours regardless of paint order');
check(transitionFills[transitionScene.layers.ground.length + 4]?.style === canvas.PALETTE.beach,
  'Four-tile mixed corners must receive one shared cap owned by the lower ecological surface');
transitionRenderer.destroy();

function fakeCanvas() {
  const drawCalls = [];
  const fakeContext = {
    canvas: null,
    setTransform(...args) { drawCalls.push(['setTransform', ...args]); },
    clearRect(...args) { drawCalls.push(['clearRect', ...args]); },
    fillRect(...args) { drawCalls.push(['fillRect', ...args]); },
    beginPath(...args) { drawCalls.push(['beginPath', ...args]); },
    moveTo(...args) { drawCalls.push(['moveTo', ...args]); },
    lineTo(...args) { drawCalls.push(['lineTo', ...args]); },
    stroke(...args) { drawCalls.push(['stroke', ...args]); },
    arc(...args) { drawCalls.push(['arc', ...args]); },
    fill(...args) { drawCalls.push(['fill', ...args]); },
    drawImage(...args) { drawCalls.push(['drawImage', ...args]); }
  };
  const fake = {
    width: 0, height: 0, clientWidth: 320, clientHeight: 320, style: {}, drawCalls,
    getContext() { return fakeContext; }
  };
  fakeContext.canvas = fake;
  return fake;
}

const displayCanvas = fakeCanvas();
const surface = canvasSurface.create(displayCanvas, {
  width: 320,
  height: 320,
  centerX: 0,
  centerY: 0,
  chunkSize: 4,
  apron: 1,
  cacheTilePixels: 16,
  resolveTile,
  createCanvas: fakeCanvas
});
surface.setLocal({ x: 0, y: 0 });
const localFrame = surface.render();
const localCacheCount = localFrame.cacheEntries;
check(localFrame.mode === 'local' && localFrame.renderedChunks.length > 0, 'One canvas surface must render the local traversal camera');
check(surface.tileAt(160, 160).x === 0 && surface.tileAt(160, 160).y === 0, 'Canvas hit translation must resolve the centered tile without granting movement authority');
surface.resize(480, 240);
const resizedFrame = surface.render();
check(resizedFrame.display.width === 480 && resizedFrame.display.height === 240,
  'The unified surface must accept responsive viewport changes without rebuilding its world contract');
surface.setSurvey({ x: 0, y: 0 }, 17);
const surveyFrame = surface.render();
check(surveyFrame.renderedChunks.length > localFrame.renderedChunks.length && surveyFrame.cacheEntries > localCacheCount,
  'The same canvas surface must load more fixed chunks when zoomed to the survey map');
check(displayCanvas.drawCalls.some(call => call[0] === 'drawImage'), 'The unified surface must crop cached chunk interiors onto the display canvas');
const chunkDraw = displayCanvas.drawCalls.find(call => call[0] === 'drawImage' && call.length === 10);
check(chunkDraw && chunkDraw[2] < 16 && chunkDraw[6] < localFrame.renderedChunks[0].x,
  'Chunk composition must sample into the deterministic apron and overlap fractional seams');
surface.invalidate('changed-world');
check(surface.render().cacheEntries > 0, 'Invalidation must rebuild visible chunk rasters against the new world revision');
surface.destroy();
check(displayCanvas.width === 0 && displayCanvas.height === 0, 'Unified surface destruction must release display and cached canvases');

const cappedCanvas = fakeCanvas();
const cappedSurface = canvasSurface.create(cappedCanvas, {
  width: 320,
  height: 320,
  centerX: 0,
  centerY: 0,
  chunkSize: 4,
  apron: 1,
  cacheTilePixels: 16,
  maxCacheEntries: 12,
  resolveTile,
  createCanvas: fakeCanvas
});
cappedSurface.setLocal({ x: 0, y: 0 });
for (let index = 0; index < 20; index += 1) {
  cappedSurface.panPixels(-320, 0);
  cappedSurface.render();
}
check(cappedSurface.render().cacheEntries <= 12, 'Long-distance camera panning must evict off-screen chunk rasters from the bounded cache');
cappedSurface.destroy();

console.log(`Terrain renderer V1 checks passed (${passed} checks).`);
