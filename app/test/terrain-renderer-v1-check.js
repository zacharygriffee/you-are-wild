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
const intermediateCamera = viewport.zoomAt(localCamera, 0.8, 160, 160);
check(viewport.isLocalFit(localCamera) && viewport.mode(intermediateCamera) === 'regional',
  'Only the canonical three-tile fit may expose the fixed local semantic plane');
check(input.intentForTile(viewport.mode(intermediateCamera), { x: 0, y: 0 }, { x: 1, y: 0 }).kind === 'inspect',
  'Intermediate zoom must inspect terrain rather than dispatch movement through misaligned local cells');
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
    terrainTopology: {
      kind: 'slope', landform: 'ridge', band: 'mid', terraceLevel: 3, terraceCount: 6,
      primaryUphill: 'north', primaryDownhill: 'south',
      dropOrientation: 'south',
      uphillEdges: ['north'], downhillEdges: ['south'], cliffEdges: ['west'],
      cornerElevations: { nw: 0.42, ne: 0.48, se: 0.36, sw: 0.31 },
      gradient: { x: 0.055, y: -0.115, magnitude: 0.1275, aspect: 'north' },
      curvature: { x: -0.08, y: 0.02, cross: 0.03, laplacian: -0.06 },
      terraceEdges: { north: 1, east: 0, south: -1, west: -2 },
      wallEdges: ['south', 'west'], riseEdges: ['north'],
      grades: { north: 0.08, east: 0.01, south: -0.09, west: -0.12 },
      contours: [{
        level: 3, threshold: 0.5, mask: 3,
        segments: [{ from: { edge: 'west', x: 0, y: 0.4 }, to: { edge: 'east', x: 1, y: 0.6 } }]
      }]
    },
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
const elevationRecord = first.layers.elevation[0];
check(elevationRecord.terraceLevel === 3 && elevationRecord.terraceCount === 6
  && elevationRecord.gradient.aspect === 'north' && elevationRecord.gradient.x === 0.055,
  'Terrain Scene must preserve bounded terrace and gradient topology');
check(elevationRecord.terraceEdges.west === -2 && elevationRecord.wallEdges.join(',') === 'south,west'
  && elevationRecord.riseEdges.join(',') === 'north' && elevationRecord.grades.south === -0.09,
  'Terrain Scene must preserve signed edge, wall, rise, and grade topology');
check(elevationRecord.contours[0].mask === 3 && elevationRecord.contours[0].segments[0].to.edge === 'east'
  && elevationRecord.corners.se === 0.36 && elevationRecord.primaryDownhill === 'south',
  'Terrain Scene must preserve bounded shared corners, contours, and primary directions');
check(elevationRecord.landform === 'ridge' && elevationRecord.dropOrientation === 'south'
  && elevationRecord.curvature.laplacian === -0.06 && elevationRecord.curvature.cross === 0.03,
  'Terrain Scene must preserve renderer-neutral derived landform, orientation, and curvature cues');
check(first.elevationField.width === first.renderBounds.width + 1
  && first.elevationField.height === first.renderBounds.height + 1
  && first.elevationField.values.length === first.elevationField.validity.length,
  'Terrain Scene must compile one bounded vertex grid and parallel validity mask');

function fieldSample(field, x, y) {
  const column = Math.round(x - field.origin.x);
  const row = Math.round(y - field.origin.y);
  const index = row * field.width + column;
  return {
    value: field.values[index],
    valid: field.validity[index],
    owner: field.owners[index],
    disagreement: field.disagreements[index]
  };
}

function continuousTile(x, y) {
  const height = (vertexX, vertexY) => Number((0.5 + vertexX * 0.01 + vertexY * 0.02).toFixed(4));
  return {
    x, y, biome: 'plains', elevation: height(x, y), traversal: { passable: true, traversalCost: 1 },
    terrainTopology: {
      kind: 'slope',
      cornerElevations: {
        nw: height(x - 0.5, y - 0.5), ne: height(x + 0.5, y - 0.5),
        se: height(x + 0.5, y + 0.5), sw: height(x - 0.5, y + 0.5)
      }
    }
  };
}

const negativeChunk = scene.compileChunk({ chunkX: -1, chunkY: 0, chunkSize: 2, apron: 1, worldRevision: 'height-grid', resolveTile: continuousTile });
const positiveChunk = scene.compileChunk({ chunkX: 0, chunkY: 0, chunkSize: 2, apron: 1, worldRevision: 'height-grid', resolveTile: continuousTile });
const sharedNegative = fieldSample(negativeChunk.elevationField, -0.5, 0.5);
const sharedPositive = fieldSample(positiveChunk.elevationField, -0.5, 0.5);
check(sharedNegative.valid === 1 && sharedNegative.value === sharedPositive.value
  && JSON.stringify(sharedNegative.owner) === JSON.stringify(sharedPositive.owner),
  'Adjacent negative and positive chunks must publish the same global shared vertex and owner');
check(sharedNegative.owner.tileX === -1 && sharedNegative.owner.tileY === 0 && sharedNegative.owner.corner === 'se',
  'Shared vertex ownership must use stable world-coordinate tile ordering across the zero boundary');

const disagreementScene = scene.compileChunk({
  chunkX: 0, chunkY: 0, chunkSize: 1, apron: 1, worldRevision: 'authored-disagreement',
  resolveTile: (x, y) => {
    const corners = { nw: 0.44, ne: 0.33, se: 0.11, sw: 0.22 };
    return { x, y, biome: 'cliff', elevation: 0.5, terrainTopology: { kind: 'cliff', cornerElevations: corners } };
  }
});
const disputed = fieldSample(disagreementScene.elevationField, 0.5, 0.5);
check(disputed.value === 0.11 && disputed.disagreement === 1
  && disputed.owner.tileX === 0 && disputed.owner.tileY === 0 && disputed.owner.corner === 'se',
  'Authored corner disagreements must resolve to the stable northwest tile owner and remain observable as scene data');
const disputedRelief = canvas.reliefGeometry(disagreementScene.layers.elevation, 32, disagreementScene.elevationField);
const tileLocalDispute = canvas.reliefGeometry(disagreementScene.layers.elevation, 32);
check(tileLocalDispute.plateaus.some(entry => entry.record.x === 0 && entry.record.y === 0)
  && !disputedRelief.plateaus.some(entry => entry.record.x === 0 && entry.record.y === 0)
  && !disputedRelief.contours.some(entry => entry.record.x === 0 && entry.record.y === 0),
  'Plateau and wall geometry must consume canonical field owners rather than disputed tile-local corners');

const maskedScene = scene.compileChunk({
  chunkX: 0, chunkY: 0, chunkSize: 1, apron: 1, worldRevision: 'unknown-mask',
  resolveTile: (x, y) => x === 0 && y === 0 ? continuousTile(x, y) : null
});
const knownVertex = fieldSample(maskedScene.elevationField, -0.5, -0.5);
const unknownVertex = fieldSample(maskedScene.elevationField, -1.5, -1.5);
check(knownVertex.valid === 1 && knownVertex.value !== null,
  'Known tile corners must remain valid when adjacent terrain is unknown');
check(unknownVertex.valid === 0 && unknownVertex.value === null && unknownVertex.owner === null,
  'Unknown-only vertices must remain explicitly masked without a synthetic height value');

check(Math.abs(canvas.bilinearHeight({ nw: 0, ne: 1, se: 1, sw: 0 }, 0.25, 0.75) - 0.25) < 1e-9,
  'Canvas relief interpolation must preserve a linear shared-corner height plane');
check(canvas.bilinearHeight({ nw: 0, ne: null, se: 1, sw: 0 }, 0.5, 0.5) === null,
  'Canvas relief interpolation must refuse incomplete or unknown corner data');
const sampledField = {
  width: 3, height: 3,
  values: [0.2, 0.4, 0.2, 0.4, 0.8, 0.4, 0.2, 0.4, 0.2],
  validity: Array(9).fill(1)
};
check(Math.abs(canvas.heightFieldSample(sampledField, 1, 1) - 0.8) < 1e-9,
  'Canvas height sampling must retain the authoritative shared vertex at integer coordinates');
const sampledPeak = canvas.heightFieldDifferential(sampledField, 1, 1, 0.5);
check(sampledPeak && Math.abs(sampledPeak.gradientX) < 1e-9 && Math.abs(sampledPeak.gradientY) < 1e-9
  && sampledPeak.laplacian < 0,
  'Canvas differential sampling must distinguish a peak from a flat slope without changing source heights');

const connectedReliefScene = scene.compileChunk({
  chunkX: 0, chunkY: 0, chunkSize: 2, apron: 0, worldRevision: 'connected-relief',
  resolveTile: (x, y) => ({
    x, y, biome: 'cliff', elevation: 0.5, traversal: { passable: true, traversalCost: 2 },
    terrainTopology: {
      kind: 'cliff', terraceCount: 6, terraceLevel: 3,
      cornerElevations: { nw: 0.35, ne: 0.65, se: 0.65, sw: 0.35 },
      gradient: { x: 0.3, y: 0, magnitude: 0.3, aspect: 'east' },
      terraceEdges: { north: 0, east: -1, south: 0, west: 1 },
      wallEdges: ['east'], riseEdges: ['west'], cliffEdges: ['east'],
      contours: [{
        level: 3, threshold: 0.5, mask: 6,
        segments: [{ from: { edge: 'north', x: 0.5, y: 0 }, to: { edge: 'south', x: 0.5, y: 1 } }]
      }]
    }
  })
});
const relief = canvas.reliefGeometry(connectedReliefScene.layers.elevation, 32);
check(relief.plateaus.length > 0 && relief.contours.length === connectedReliefScene.layers.elevation.length,
  'Canvas relief geometry must derive plateau fills and one semantic contour segment per authored cliff sample');
const leftRelief = relief.contours.find(segment => segment.record.localX === 0 && segment.record.localY === 0);
const rightRelief = relief.contours.find(segment => segment.record.localX === 1 && segment.record.localY === 0);
check(leftRelief?.to.y === rightRelief?.to.y && leftRelief?.from.y === rightRelief?.from.y
  && rightRelief.from.x - leftRelief.from.x === 32,
  'Adjacent relief segments must retain one continuous world-aligned contour phase without tile-local drift');
check(relief.contours.every(segment => segment.profile.walls),
  'Cliff and cave relief records must opt into plateau wall faces while ordinary biomes remain hillshade-only');
check(relief.contours.every(segment => segment.profile.wallDepth >= 0.12),
  'Full-relief profiles must reserve enough world-relative depth for a readable plateau face');

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

const fieldBiome = (x, y) => (y < 0
  ? (x < 0 ? 'beach' : 'plains')
  : (x < 0 ? 'grove' : 'forest'));
const fieldTile = (x, y) => ({
  x, y, biome: fieldBiome(x, y), derivedBiome: fieldBiome(x, y),
  elevation: fieldBiome(x, y) === 'beach' ? 0.1 : 0.55,
  traversal: { passable: true, traversalCost: 1 }
});
const westFieldScene = scene.compileChunk({
  chunkX: -1, chunkY: 0, chunkSize: 2, apron: 2,
  worldRevision: 'continuous-soft-field', resolveTile: fieldTile
});
const eastFieldScene = scene.compileChunk({
  chunkX: 0, chunkY: 0, chunkSize: 2, apron: 2,
  worldRevision: 'continuous-soft-field', resolveTile: fieldTile
});
const westField = canvas.softBiomeField(westFieldScene.layers.ground, westFieldScene.renderBounds, 16);
const repeatedWestField = canvas.softBiomeField(westFieldScene.layers.ground, westFieldScene.renderBounds, 16);
const eastField = canvas.softBiomeField(eastFieldScene.layers.ground, eastFieldScene.renderBounds, 16);
check(JSON.stringify(westField) === JSON.stringify(repeatedWestField),
  'Continuous soft-biome ownership must be byte-stable for the same world field');
const fieldAt = (field, bounds, x, y) => {
  const column = Math.floor((x - bounds.minX) * field.samplesPerTile);
  const row = Math.floor((y - bounds.minY) * field.samplesPerTile);
  return field.owners[row * field.width + column];
};
let sharedFieldSamples = 0;
for (let y = -1.75; y < 1.75; y += 0.25) {
  for (let x = -1.75; x < 1.75; x += 0.25) {
    check(fieldAt(westField, westFieldScene.renderBounds, x, y)
      === fieldAt(eastField, eastFieldScene.renderBounds, x, y),
    'Overlapping chunk aprons must publish identical soft-biome ownership at every shared world sample');
    sharedFieldSamples += 1;
  }
}
check(sharedFieldSamples > 100, 'The soft-biome seam proof must compare a material area, not one boundary point');
check(['beach', 'plains', 'grove', 'forest'].every(biome => westField.owners.includes(biome)),
  'A four-biome junction must retain every authored ecological material');
let interiorSpill = 0;
for (let row = 0; row < westField.height; row += 1) {
  for (let column = 0; column < westField.width; column += 1) {
    const worldX = westFieldScene.renderBounds.minX + (column + 0.5) / westField.samplesPerTile;
    const worldY = westFieldScene.renderBounds.minY + (row + 0.5) / westField.samplesPerTile;
    const fractionX = worldX - Math.floor(worldX);
    const fractionY = worldY - Math.floor(worldY);
    const owner = westField.owners[row * westField.width + column];
    if (owner !== fieldBiome(Math.floor(worldX), Math.floor(worldY))
      && fractionX > 0.12 && fractionX < 0.88 && fractionY > 0.12 && fractionY < 0.88) interiorSpill += 1;
  }
}
check(interiorSpill > 0,
  'World-space material ownership must cross authored tile interiors instead of decorating only their edges and corners');

const waterTile = (x, y) => ({
  x, y, biome: x >= 0 ? 'water' : 'beach', derivedBiome: x >= 0 ? 'water' : 'beach',
  water: x >= 0, elevation: 0.08, traversal: { passable: x < 0, traversalCost: x < 0 ? 1 : 3 }
});
const westWaterScene = scene.compileChunk({
  chunkX: -1, chunkY: 0, chunkSize: 2, apron: 2,
  worldRevision: 'continuous-water-field', resolveTile: waterTile
});
const eastWaterScene = scene.compileChunk({
  chunkX: 0, chunkY: 0, chunkSize: 2, apron: 2,
  worldRevision: 'continuous-water-field', resolveTile: waterTile
});
const westWaterField = canvas.waterField(westWaterScene.layers.ground, westWaterScene.renderBounds, 18);
const repeatedWaterField = canvas.waterField(westWaterScene.layers.ground, westWaterScene.renderBounds, 18);
const eastWaterField = canvas.waterField(eastWaterScene.layers.ground, eastWaterScene.renderBounds, 18);
check(Buffer.from(westWaterField.values.buffer).equals(Buffer.from(repeatedWaterField.values.buffer)),
  'Continuous water ownership must be byte-stable for the same world field');
const waterAt = (field, bounds, x, y) => {
  const column = Math.floor((x - bounds.minX) * field.samplesPerTile);
  const row = Math.floor((y - bounds.minY) * field.samplesPerTile);
  return field.values[row * field.width + column];
};
for (let y = -0.7; y <= 0.7; y += 0.1) {
  for (let x = -0.7; x <= 0.7; x += 0.1) {
    check(waterAt(westWaterField, westWaterScene.renderBounds, x, y)
      === waterAt(eastWaterField, eastWaterScene.renderBounds, x, y),
    'Overlapping chunk aprons must publish identical water levels at shared world samples');
  }
}
const coastlineColumns = new Set();
for (let row = 0; row < eastWaterField.height; row += 1) {
  const worldY = eastWaterScene.renderBounds.minY + (row + 0.5) / eastWaterField.samplesPerTile;
  if (worldY < -1.5 || worldY > 1.5) continue;
  for (let column = 1; column < eastWaterField.width; column += 1) {
    const previous = eastWaterField.values[row * eastWaterField.width + column - 1];
    const current = eastWaterField.values[row * eastWaterField.width + column];
    if (previous < 0.5 && current >= 0.5) {
      coastlineColumns.add(column);
      break;
    }
  }
}
check(coastlineColumns.size >= 5,
  'A straight authored land-water boundary must render as a continuous curved coast rather than one tile-axis line');

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
  resolvePresence: () => [{ id: 'player-1', role: 'player', x: 0, y: 0 }],
  createCanvas: fakeCanvas
});
surface.setLocal({ x: 0, y: 0 });
const localFrame = surface.render();
const localCacheCount = localFrame.cacheEntries;
check(localFrame.mode === 'local' && localFrame.renderedChunks.length > 0, 'One canvas surface must render the local traversal camera');
check(localFrame.renderStats.cacheMisses === localFrame.renderedChunks.length
  && localFrame.renderStats.dynamicPresenceCount === 1,
  'The first local frame must report chunk misses and paint renderer-neutral live party presence');
const cachedLocalFrame = surface.render();
check(cachedLocalFrame.renderStats.cacheMisses === 0
  && cachedLocalFrame.renderStats.cacheHits === cachedLocalFrame.renderedChunks.length,
  'An unchanged movement frame must reuse every fixed chunk without recompiling terrain fields');
check(surface.invalidateTiles(['999,999'], 'same-world') === 0
  && surface.render().renderStats.cacheMisses === 0,
  'Selective invalidation must preserve cached chunks outside the changed tile');
check(surface.invalidateTiles(['0,0'], 'same-world', { includeApron: false }) > 0
  && surface.render().renderStats.cacheMisses > 0,
  'Selective local invalidation must rebuild the owning chunk when visible tile semantics change');
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
