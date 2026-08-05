#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src', 'core', 'tile-composition-v2.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const composition = new Function(`${source}\nreturn YAW_TILE_COMPOSITION_V2;`)();
const visualsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'map-visuals.js'), 'utf8');
const visuals = new Function('YAW_TILE_COMPOSITION_V2', `${visualsSource}\nreturn YAW_MAP_VISUALS;`)(composition);
const runtimeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'tileset-runtime.js'), 'utf8');
const runtime = new Function('YAW_TILESET_PACK_V1', `${runtimeSource}\nreturn YAW_TILESET_RUNTIME;`)({ LAYER_SLOTS: ['base', 'route', 'feature', 'marker', 'presence'] });
const worldGenerationSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'world-generation.js'), 'utf8');
const worldGeneration = new Function(`${worldGenerationSource}\nreturn WorldGen;`)();

let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
  passed += 1;
};

const tile = {
  x: 7,
  y: -3,
  biome: 'beach',
  derivedBiome: 'beach',
  elevation: 0.7421,
  terrainTopology: {
    kind: 'slope', band: 'high', primaryUphill: 'north', primaryDownhill: 'south',
    uphillEdges: ['north'], downhillEdges: ['south'], cliffEdges: [],
    grades: { north: 0.08, east: 0.01, south: -0.07, west: -0.02 }
  },
  water: false,
  terrainTags: ['coast', 'high-ground', 'coast'],
  traversal: { passable: true, traversalCost: 0.8, requiredCapability: null, routeModifier: -0.2 },
  overlays: {
    shoreline: { edges: ['east', 'north'], nearWater: true },
    road: { id: 'shore-road', direction: 'east-west', connections: ['west', 'east'] },
    bridge: { id: 'shore-bridge', direction: 'east-west', connections: ['west', 'east'], spanIndex: 1, spanLength: 3, spanRole: 'middle', shoreEdges: [] },
    barriers: ['south'],
    cover: [{ id: 'pine-1', name: 'Pine' }],
    poi: { id: 'spring-1', category: 'resourceSite' }
  },
  structure: 'spring',
  resourceSearched: true,
  items: [{ id: 'rope-1', name: 'Rope', quantity: 2 }],
  deathBags: [{ resolutionId: 'bag-1', items: [{ id: 'knife' }], gold: 4 }],
  placedObjects: [{ id: 'bedroll-1', name: 'Bedroll', state: 'placed' }],
  creatures: [
    { id: 'fox-1', name: 'Fox' },
    { id: 'hare-remains', corpseName: 'Hare', disposition: 'remains', depleted: false }
  ]
};
const visual = {
  semanticKeys: ['terrain-sand', 'terrain-beach', 'shoreline-water-north', 'route-bridge-horizontal', 'state-current'],
  shorelineEdges: ['north', 'east'],
  shorelineCorners: ['outer-ne'],
  routeShape: 'east-west',
  blockedEdges: ['south'],
  blockedReason: 'barrier',
  immediateDanger: true
};
const options = {
  visual,
  isCurrent: true,
  questMarker: { id: 'quest-1' },
  selected: true,
  reachable: false,
  presence: [{ id: 'player-1', name: 'ZX', kind: 'party' }]
};

const first = composition.snapshot(null, tile, options);
const second = composition.snapshot(null, JSON.parse(JSON.stringify(tile)), JSON.parse(JSON.stringify(options)));

check(first.schema === 'yaw-map-scene-snapshot' && first.version === 2, 'Snapshot must use the ratified Phase A identity');
check(JSON.stringify(first) === JSON.stringify(second), 'Equivalent state must produce a byte-stable JSON snapshot');
check(Object.keys(first.layers).join(',') === composition.LAYERS.join(','), 'Snapshot must preserve the approved eight-layer order');
check(first.layers.ground.records[0].biome === 'beach', 'Ground must retain simulation biome identity');
check(first.layers.terrain.records.some(record => record.kind === 'elevation' && record.value === 0.7421), 'Terrain must retain authored numeric elevation');
check(first.layers.terrain.records.some(record => record.kind === 'elevation-transition' && record.type === 'slope' && record.primaryDownhill === 'south'), 'Terrain must retain directional elevation topology');
check(first.layers.terrain.records.some(record => record.kind === 'shoreline' && record.edges.join(',') === 'north,east'), 'Terrain transitions must normalize shoreline topology');
check(first.layers.route.records[0].kind === 'bridge' && first.layers.route.records[0].connections.join(',') === 'east,west', 'Bridge must remain a route with normalized edge connections');
check(first.layers.route.records[0].spanIndex === 1 && first.layers.route.records[0].spanLength === 3 && first.layers.route.records[0].spanRole === 'middle', 'Bridge route records must retain their span position');
check(first.layers.cover.records[0].id === 'pine-1', 'Explicit cover must remain independent from ground');
check(first.layers.feature.records.some(record => record.kind === 'structure'), 'Structures must appear as features');
check(first.layers.feature.records.some(record => record.kind === 'resource' && record.depleted), 'Resource depletion must remain a feature fact');
check(first.layers.evidence.records.some(record => record.kind === 'item' && record.quantity === 2), 'Dropped items must become durable evidence');
check(first.layers.evidence.records.some(record => record.kind === 'remains'), 'Creature remains must become durable evidence rather than live presence');
check(first.layers.evidence.records.some(record => record.kind === 'recovery-bag' && record.gold === 4), 'Recovery bags must become durable evidence');
check(first.layers.evidence.records.some(record => record.kind === 'placed-object' && record.id === 'bedroll-1'), 'Placed objects must become durable evidence');
check(first.layers.evidence.records.some(record => record.kind === 'resource-change' && record.state === 'depleted'), 'Depleted resources must become durable evidence');
check(first.layers.presence.records.some(record => record.id === 'fox-1') && first.layers.presence.records.some(record => record.id === 'player-1'), 'Living creatures and supplied party occupants must share the presence layer');
check(first.layers.state.records.some(record => record.kind === 'current') && first.layers.state.records.some(record => record.kind === 'blocked'), 'Interaction and traversal state must remain above world content');
check(first.compatibility.tilesetPackVersion === 1 && first.compatibility.semanticKeys.includes('route-bridge-horizontal'), 'V1 semantic keys must remain available to the compatibility adapter');
check(first.facts.traversal.cost === 0.8 && first.facts.traversal.routeModifier === -0.2, 'Renderer facts must preserve simulation-owned traversal truth');

const crowded = composition.snapshot(null, {
  ...tile,
  creatures: [],
  deathBags: [],
  placedObjects: [],
  resourceSearched: false,
  items: Array.from({ length: 30 }, (_, index) => ({ id: `item-${index}`, name: `Item ${index}` }))
});
check(crowded.layers.evidence.records.length === composition.MAX_RECORDS_PER_LAYER, 'Crowded evidence must be bounded');
check(crowded.layers.evidence.omitted === 6, 'Crowded evidence must report omitted records');
const longLabel = composition.snapshot(null, { items: [{ id: 'long', name: 'x'.repeat(1000) }] });
check(longLabel.layers.evidence.records[0].label.length === 160, 'Snapshot scalar text must be bounded');
check(!JSON.stringify(first).includes('function'), 'Snapshot must contain data, never executable rendering callbacks');

const app = {
  party: [{ id: 'player-1', name: 'ZX' }],
  biomes: { beach: { name: 'Beach', icon: '🏖️' }, indoors: { name: 'Indoors', icon: '□' } },
  STRUCTURES: { spring: { name: 'Spring', icon: '💧' } },
  DISPOSITION: { ENEMY: 'enemy' },
  MAP_TILESET_KEYS: {
    biomes: { beach: 'terrain-beach', sand: 'terrain-sand', indoors: 'interior-room' },
    roads: { horizontal: 'route-road-horizontal', 'east-west': 'route-road-horizontal' },
    bridges: { 'east-west': 'route-bridge-horizontal' },
    covers: { foliage: 'cover-foliage', obstacle: 'cover-obstacle' },
    shorelines: { north: 'shoreline-water-north', east: 'shoreline-water-east' },
    shorelineCorners: { 'outer-ne': 'shoreline-water-outer-ne' },
    poi: { resourceSite: 'poi-resource-site' },
    structures: { spring: 'structure-spring' },
    effects: { dangerInfluence: 'state-danger-influence' },
    states: { current: 'state-current', quest: 'state-quest', danger: 'state-danger', blocked: 'state-blocked', 'blocked-south': 'state-blocked-south' },
    interior: { wall: 'interior-wall', room: 'interior-room', cave: 'interior-cave-room', exit: 'interior-exit', door: 'interior-door' },
    interiorWalls: { north: 'interior-wall-north' },
    interiorPaths: { horizontal: 'interior-path-horizontal' },
    interiorExits: { east: 'interior-exit-east' },
    interiorDoors: { east: 'interior-door-east' }
  },
  _label(_key, fallback) { return fallback; },
  _escapeHtml(value) { return String(value); }
};
const mapVisual = visuals.mapTileVisual(app, tile, { ...options, neighborResolver: () => null });
check(mapVisual.composition?.version === 2, 'Shared overworld visuals must carry the V2 snapshot');
check(mapVisual.composition.layers.presence.records.some(record => record.id === 'player-1'), 'Current overworld snapshots must include party presence');
check(mapVisual.composition.compatibility.semanticKeys.includes('cover-foliage'), 'Cover records must receive a transparent V1-compatible presentation key');
check(visuals.mapTileAttrs(app, mapVisual).includes('data-tile-composition-version="2"'), 'Rendered map cells must expose their composition contract');
check(runtime._semanticKeys(mapVisual).join(',') === mapVisual.composition.compatibility.semanticKeys.join(','), 'Tileset Pack V1 must resolve through snapshot compatibility keys');
check(runtime._compositionLayerForKey('terrain-jungle') === 'ground'
  && runtime._compositionLayerForKey('cover-jungle') === 'cover'
  && runtime._compositionLayerForKey('evidence-remains') === 'evidence'
  && runtime._compositionLayerForKey('state-current') === 'state', 'V1 semantic keys must receive explicit eight-layer render ranks');
const adjacentVisual = visuals.mapTileVisual(app, { ...tile, biome: 'jungle', derivedBiome: 'jungle', overlays: {} }, {
  neighborResolver: (x, y) => x === 8 && y === -3 ? { x, y, biome: 'plains', derivedBiome: 'plains', traversal: { passable: true } } : null
});
check(adjacentVisual.groundTransitions.some(entry => entry.direction === 'east' && entry.biome === 'plains'), 'Cardinal neighbor biomes must produce deterministic ground-transition topology');
check(adjacentVisual.composition.layers.terrain.records.some(record => record.kind === 'ground-transition'), 'Ground-transition topology must enter the shared terrain layer');
const generatedWorld = { seed: 'composition-world', generatorVersion: 7 };
const generatedBiomes = ['forest', 'grove', 'jungle', 'swamp', 'plains', 'beach', 'sand', 'cliff'];
const generatedA = worldGeneration.generateBaseTile(generatedWorld, 31, -12, generatedBiomes);
const generatedB = worldGeneration.generateBaseTile(generatedWorld, 31, -12, generatedBiomes);
check(JSON.stringify(generatedA.overlays.cover) === JSON.stringify(generatedB.overlays.cover), 'Generated cover must be deterministic for a pinned world coordinate');
const generatedCoverSample = Array.from({ length: 400 }, (_, index) => worldGeneration.generateBaseTile(generatedWorld, index % 20, Math.floor(index / 20), generatedBiomes))
  .find(entry => entry.overlays.cover.length);
check(Boolean(generatedCoverSample), 'Ordinary generated worlds must author cover records without a handcrafted fixture');
check(generatedCoverSample.overlays.cover.every(record => record.role === 'decorative' && record.mechanical === false && !record.blocksMovement), 'Decorative generated cover must not imply mechanics');
const barrierWorld = { seed: 'composition-barriers', generatorVersion: 7 };
const generatedBarrierSample = Array.from({ length: 2500 }, (_, index) => worldGeneration.generateBaseTile(barrierWorld, index % 50, Math.floor(index / 50), generatedBiomes))
  .find(entry => entry.overlays.obstacles.some(record => record.mechanical));
check(!generatedBarrierSample || generatedBarrierSample.overlays.obstacles.every(record => record.mechanic === 'edge-barrier' && record.edges.every(edge => generatedBarrierSample.overlays.barriers.includes(edge))), 'Mechanical obstacle art may only mirror authoritative barrier edges');
const unknownVisual = visuals.mapTileVisual(app, null);
check(unknownVisual.composition.compatibility.semanticKeys[0] === 'unknown', 'Unknown cells must retain their V1 fallback semantic through composition');

const interiorVisual = visuals.interiorTileVisual(app, {
  x: 1,
  y: 2,
  biome: 'indoors',
  explored: true,
  connections: ['east', 'west'],
  items: [{ id: 'coin', name: 'Coin' }]
}, { x: 1, y: 2, isCurrent: true, interiorKind: 'building' });
check(interiorVisual.composition?.space === 'interior', 'Interior visuals must carry an interior V2 snapshot');
check(interiorVisual.composition.layers.route.records[0]?.kind === 'path', 'Interior topology must project into the shared route layer');
check(interiorVisual.composition.layers.evidence.records[0]?.id === 'coin', 'Interior durable evidence must use the shared evidence layer');

console.log(`Tile Composition V2 convergence: ${passed} checks passed`);
