#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src', 'core', 'tile-composition-v2.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const composition = new Function(`${source}\nreturn YAW_TILE_COMPOSITION_V2;`)();
const visualRecipesSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'tile-visual-recipes.js'), 'utf8');
const visualRecipes = new Function(`${visualRecipesSource}\nreturn YAW_TILE_VISUAL_RECIPES;`)();
const visualsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'map-visuals.js'), 'utf8');
const visuals = new Function('YAW_TILE_COMPOSITION_V2', 'YAW_TILE_VISUAL_RECIPES', `${visualsSource}\nreturn YAW_MAP_VISUALS;`)(composition, visualRecipes);
const runtimeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'tileset-runtime.js'), 'utf8');
const runtime = new Function('YAW_TILESET_PACK_V1', `${runtimeSource}\nreturn YAW_TILESET_RUNTIME;`)({ LAYER_SLOTS: ['base', 'route', 'feature', 'marker', 'presence'] });
const worldGenerationSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'world-generation.js'), 'utf8');
const worldGeneration = new Function(`${worldGenerationSource}\nreturn WorldGen;`)();
const templateSource = fs.readFileSync(path.join(__dirname, '..', 'template.html'), 'utf8');

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
    terraceLevel: 4, terraceCount: 6,
    cornerElevations: { nw: 0.82, ne: 0.77, se: 0.66, sw: 0.7 },
    gradient: { x: -0.045, y: -0.115, magnitude: 0.1235, aspect: 'north' },
    terraceEdges: { north: 1, east: 0, south: -1, west: 0 },
    wallEdges: ['south'], riseEdges: ['north'],
    contours: [{
      level: 4, threshold: 0.6667, mask: 11,
      segments: [{ from: { edge: 'east', x: 1, y: 0.94 }, to: { edge: 'south', x: 0.08, y: 1 } }]
    }],
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
const elevationTransition = first.layers.terrain.records.find(record => record.kind === 'elevation-transition');
check(elevationTransition.terraceLevel === 4 && elevationTransition.terraceCount === 6
  && elevationTransition.cornerElevations.nw === 0.82 && elevationTransition.terraceEdges.south === -1,
  'Terrain snapshots must retain bounded shared-corner and terrace topology');
check(elevationTransition.contours[0].mask === 11 && elevationTransition.contours[0].segments[0].to.edge === 'south',
  'Terrain snapshots must retain bounded marching-squares contour segments');
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
check(visualRecipes.VERSION === 6 && ['grove', 'forest', 'swamp', 'plains', 'jungle', 'beach', 'cliff', 'water'].every(biome => visualRecipes.PROFILES[biome]), 'Visual recipes must cover every generated overworld biome');
check(visualRecipes.VISUAL_SCALE.road === 0.22 && visualRecipes.VISUAL_SCALE.bridge === 0.22
  && visualRecipes.VISUAL_SCALE.treeCrown === 0.38 && visualRecipes.VISUAL_SCALE.structure === 0.5,
  'Visual recipes must publish one bounded scale reference for routes, vegetation, structures, and POIs');
check(visualRecipes.PROFILES.plains.reliefMode === 'slope-only'
  && visualRecipes.PROFILES.swamp.reliefMode === 'slope-only'
  && visualRecipes.PROFILES.forest.reliefMode === 'restrained'
  && visualRecipes.PROFILES.cliff.reliefMode === 'terrace'
  && visualRecipes.PROFILES.water.reliefMode === 'none',
  'Relief presentation must distinguish flat, restrained, terraced, and non-relief biomes');
check(JSON.stringify(visualRecipes.compose(tile, () => null, { routeShape: 'horizontal' })) === JSON.stringify(visualRecipes.compose(JSON.parse(JSON.stringify(tile)), () => null, { routeShape: 'horizontal' })), 'Visual recipe composition must be deterministic for equivalent input');

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
check(runtime._compositionSubRankForKey('ground-transition-jungle-east') < runtime._compositionSubRankForKey('shoreline-water-east')
  && runtime._compositionSubRankForKey('route-road-horizontal') === 20, 'Shared runtime ordering must place terrain blend before shoreline and route decks at their canonical sub-rank');
const plainsTile = { ...tile, biome: 'plains', derivedBiome: 'plains', overlays: {} };
const jungleTile = {
  ...tile, x: 8, y: -3, biome: 'jungle', derivedBiome: 'jungle', overlays: {}, traversal: { passable: true },
  structure: null, hasLandmark: false, resourceSearched: false, items: [], deathBags: [], placedObjects: [], creatures: []
};
const adjacentVisual = visuals.mapTileVisual(app, plainsTile, {
  neighborResolver: (x, y) => x === 8 && y === -3 ? jungleTile : null
});
const mirroredVisual = visuals.mapTileVisual(app, jungleTile, {
  neighborResolver: (x, y) => x === 7 && y === -3 ? plainsTile : null
});
check(adjacentVisual.groundTransitions.some(entry => entry.direction === 'east' && entry.biome === 'jungle'), 'The lower-priority destination must paint one deterministic cardinal ground transition');
check(adjacentVisual.composition.layers.terrain.records.some(record => record.kind === 'ground-transition'), 'Ground-transition topology must enter the shared terrain layer');
const adjacentSpill = adjacentVisual.composition.layers.cover.records.find(record => record.kind === 'adjacent-spill');
check(adjacentSpill?.sourceBiome === 'jungle' && adjacentSpill.sourceDirection === 'east' && adjacentSpill.edgeBand === 'east' && adjacentSpill.destinationOwned, 'Cardinal cover spill must stay in the shared edge band owned by the destination tile');
const sourceSpill = mirroredVisual.composition.layers.cover.records.find(record => record.kind === 'edge-spill-origin');
check(sourceSpill?.sourceBiome === 'jungle' && sourceSpill.sharedEdgeKey === adjacentSpill.sharedEdgeKey && sourceSpill.edgeBand === 'west', 'Jungle boundaries must pair the destination spill with a source-owned edge band');
check(sourceSpill?.pairRole === 'source' && adjacentSpill?.pairRole === 'destination'
  && sourceSpill.variant === adjacentSpill.variant && sourceSpill.scale === adjacentSpill.scale
  && sourceSpill.opacity === adjacentSpill.opacity && sourceSpill.rotation === adjacentSpill.rotation
  && sourceSpill.anchor.y === adjacentSpill.anchor.y,
  'Paired soft-edge artwork must share one variant, scale, opacity, orientation, and cross-edge position across source and destination cells');
const routedPlains = {
  ...plainsTile, structure: null,
  overlays: { road: { id: 'pair-road-west', direction: 'east-west', connections: ['east', 'west'] } }
};
const routedJungle = {
  ...jungleTile,
  overlays: { road: { id: 'pair-road-east', direction: 'east-west', connections: ['east', 'west'] } }
};
const routedDestinationCover = visualRecipes.compose(routedPlains, (x, y) => x === 8 && y === -3 ? routedJungle : null, { routeShape: 'east-west' }).cover;
const routedSourceCover = visualRecipes.compose(routedJungle, (x, y) => x === 7 && y === -3 ? routedPlains : null, { routeShape: 'east-west' }).cover;
check(![...routedDestinationCover, ...routedSourceCover].some(record => ['adjacent-spill', 'edge-spill-origin', 'edge-continuity'].includes(record.kind) && record.sharedEdgeKey === adjacentSpill.sharedEdgeKey),
  'A route crossing a shared edge must symmetrically suppress decorative edge cover instead of moving only one half of the pair');
const destinationEdge = adjacentVisual.adjacencyBlend.sharedEdges[0];
const sourceEdge = mirroredVisual.adjacencyBlend.sharedEdges[0];
check(destinationEdge.sharedEdgeKey === sourceEdge.sharedEdgeKey && destinationEdge.direction === sourceEdge.mirrorDirection && destinationEdge.phase === sourceEdge.phase, 'Both sides of a shared edge must observe one canonical key, mirrored direction, and phase');
check(destinationEdge.contour.length === 5 && destinationEdge.contour.every(value => value >= 0.12 && value <= 0.46), 'Canonical soft seams must publish a bounded five-point contour');
check(destinationEdge.depth >= 0.17 && destinationEdge.depth <= 0.26, 'Soft material paint must stay within a restrained shared-edge band');
check(destinationEdge.contour.join(',') === sourceEdge.contour.join(','), 'Both sides of a shared edge must observe the same deterministic contour');
check(destinationEdge.destinationOwned && !sourceEdge.destinationOwned && mirroredVisual.groundTransitions.length === 0, 'Exactly one side of a shared seam may paint the dominant material');
check(adjacentVisual.composition.facts.presentationRecipeVersion === 6, 'Composition facts must advertise the applied visual recipe version without changing save schema');
check(adjacentVisual.composition.facts.adjacency.sharedEdges[0].key === destinationEdge.sharedEdgeKey, 'The serializable snapshot must expose bounded canonical seam evidence');
check(adjacentVisual.composition.facts.adjacency.sharedEdges[0].contour.join(',') === destinationEdge.contour.join(','), 'The serializable snapshot must retain the canonical seam contour');
check(adjacentVisual.composition.layers.terrain.records.find(record => record.kind === 'ground-transition')?.edges[0].contour.length === 5, 'Ground-transition records must carry the same bounded contour to render adapters');
const cappedClipPath = runtime._edgeClipPath(destinationEdge);
check(cappedClipPath.startsWith('polygon(') && cappedClipPath.split(',').length === 11, 'The bundled runtime must interpolate a five-point seam into a smoother direction-aware contour polygon');
check(destinationEdge.corners.ne === 'cap' && destinationEdge.corners.es === 'cap', 'An isolated material edge must taper both four-cell endpoints instead of painting square corner blocks');
const contourLayer = {
  rect: { x: 0, y: 0, width: 256, height: 256 }, atlasWidth: 256, atlasHeight: 256,
  cssImage: 'none', scaling: 'smooth', opacity: 1, blend: 'normal', z: 0,
  anchor: { x: 0.5, y: 0.5 }, transform: { rotate: 0, flipX: false, flipY: false },
  compositionLayer: 'terrain', compositionSubLayer: 10, transitionMetadata: destinationEdge
};
check(runtime._layerStyle({ ...contourLayer, packId: 'yaw.default-basic-v1' }).includes('clip-path:polygon(')
  && !runtime._layerStyle({ ...contourLayer, packId: 'mod.authored-transitions' }).includes('clip-path:'), 'Canonical contour clipping must apply only to the bundled skin and leave replacement-pack artwork untouched');
const atlasCropLayer = {
  ...contourLayer,
  rect: { x: 64, y: 64, width: 64, height: 64 },
  atlasWidth: 256,
  atlasHeight: 256,
  compositionLayer: 'ground',
  transitionMetadata: null
};
check(runtime._layerStyle({ ...atlasCropLayer, packId: 'yaw.default-basic-v1' }) !== runtime._layerStyle({ ...atlasCropLayer, packId: 'mod.authored-ground' }), 'Bundled material crops must inset their atlas sample to prevent adjacent-sprite hairlines without changing authored replacement packs');
check(!templateSource.includes('.yaw-tile-art > [data-tileset-semantic-key^="ground-transition-"]'), 'Bundled material masks must not use an unscoped selector that clips authored replacement-pack transitions');
check(visuals.mapTileAttrs(app, adjacentVisual).includes('data-shared-edge-keys="edge:7,-3&gt;8,-3"') || visuals.mapTileAttrs(app, adjacentVisual).includes('data-shared-edge-keys="edge:7,-3>8,-3"'), 'Rendered cells must expose canonical shared-edge identity');
const hiddenNeighborVisual = visuals.mapTileVisual(app, { ...tile, biome: 'jungle', derivedBiome: 'jungle', overlays: {} }, { neighborResolver: () => null });
check(!hiddenNeighborVisual.composition.layers.cover.records.some(record => record.kind === 'adjacent-spill'), 'Unknown neighbors must not leak cover or biome details into a visible destination');
const sameJungleVisual = visuals.mapTileVisual(app, { ...jungleTile, x: 0, y: 0, visualSeed: 3 }, {
  neighborResolver: (x, y) => x === 1 && y === 0 ? { ...jungleTile, x, y, visualSeed: 3 } : null
});
const denseJungleIdentity = sameJungleVisual.composition.layers.cover.records.filter(record => record.kind === 'biome-identity');
check(denseJungleIdentity.filter(record => record.stratum === 'canopy').length >= 4
  && denseJungleIdentity.filter(record => record.stratum === 'undergrowth').length === 2
  && denseJungleIdentity.filter(record => record.stratum === 'floor').length === 2,
  'Unobstructed jungle must fill the tile with multiple canopy, undergrowth, and floor strata');
check(denseJungleIdentity.every(record => record.edgeSafe && record.anchor.x >= 0.2 && record.anchor.x <= 0.8 && record.anchor.y >= 0.2 && record.anchor.y <= 0.8), 'Jungle identity art must remain inside its bounded placement inset while allowing less rigid variation');
const continuity = sameJungleVisual.composition.layers.cover.records.find(record => record.kind === 'edge-continuity');
check(continuity?.sharedEdgeKey && continuity.edgeBand === 'east' && continuity.family === 'jungle-spill', 'Adjacent jungle tiles must receive deterministic paired canopy continuity bands');
const mirroredSameJungleVisual = visuals.mapTileVisual(app, { ...jungleTile, x: 1, y: 0, visualSeed: 3 }, {
  neighborResolver: (x, y) => x === 0 && y === 0 ? { ...jungleTile, x, y, visualSeed: 3 } : null
});
const continuityPairs = sameJungleVisual.composition.layers.cover.records.filter(record => record.kind === 'edge-continuity');
const mirroredContinuityPairs = mirroredSameJungleVisual.composition.layers.cover.records.filter(record => record.kind === 'edge-continuity');
check(continuityPairs.length === 3 && mirroredContinuityPairs.length === 3
  && continuityPairs.every((record, index) => record.sharedEdgeKey === mirroredContinuityPairs[index].sharedEdgeKey
    && record.variant === mirroredContinuityPairs[index].variant
    && record.scale === mirroredContinuityPairs[index].scale
    && record.opacity === mirroredContinuityPairs[index].opacity
    && record.rotation === mirroredContinuityPairs[index].rotation
    && record.flipX === mirroredContinuityPairs[index].flipX
    && record.anchor.y === mirroredContinuityPairs[index].anchor.y),
  'Same-jungle continuity pairs must render three overlapping transform-identical halves along their shared edge');
const alternateSeedJungle = visuals.mapTileVisual(app, { ...jungleTile, x: 0, y: 0, visualSeed: 2 }, { neighborResolver: () => null });
check(JSON.stringify(alternateSeedJungle.composition.layers.cover.records) !== JSON.stringify(denseJungleIdentity), 'Workbench art seeds must deterministically vary jungle composition');

for (const direction of visualRecipes.DIRECTIONS) {
  const source = {
    ...jungleTile, x: 20, y: 20, visualSeed: 5,
    overlays: {}, structure: null, hasLandmark: false
  };
  const destination = {
    ...plainsTile, x: 20 + direction.dx, y: 20 + direction.dy, visualSeed: 7,
    overlays: {}, structure: null, hasLandmark: false, items: [], deathBags: [], placedObjects: [], creatures: []
  };
  const sourceRecipe = visualRecipes.compose(source, (x, y) => x === destination.x && y === destination.y ? destination : null);
  const destinationRecipe = visualRecipes.compose(destination, (x, y) => x === source.x && y === source.y ? source : null);
  const sourcePair = sourceRecipe.cover.find(record => record.kind === 'edge-spill-origin');
  const destinationPair = destinationRecipe.cover.find(record => record.kind === 'adjacent-spill');
  const crossAxis = direction.id === 'north' || direction.id === 'south' ? 'x' : 'y';
  check(sourcePair?.sharedEdgeKey === destinationPair?.sharedEdgeKey
    && sourcePair?.edgeBand === direction.id && destinationPair?.edgeBand === direction.opposite
    && sourcePair?.variant === destinationPair?.variant
    && sourcePair?.scale === destinationPair?.scale
    && sourcePair?.opacity === destinationPair?.opacity
    && sourcePair?.rotation === destinationPair?.rotation
    && sourcePair?.flipX === destinationPair?.flipX
    && sourcePair?.anchor?.[crossAxis] === destinationPair?.anchor?.[crossAxis],
  `${direction.id} soft edge must split one transform-identical sprite across the paired cells`);

  const routedSource = {
    ...source,
    overlays: { road: { id: `route-source-${direction.id}`, connections: [direction.id] } }
  };
  const routedDestination = {
    ...destination,
    overlays: { road: { id: `route-destination-${direction.id}`, connections: [direction.opposite] } }
  };
  const routedSourceRecipe = visualRecipes.compose(routedSource, (x, y) => x === routedDestination.x && y === routedDestination.y ? routedDestination : null);
  const routedDestinationRecipe = visualRecipes.compose(routedDestination, (x, y) => x === routedSource.x && y === routedSource.y ? routedSource : null);
  check(![...routedSourceRecipe.cover, ...routedDestinationRecipe.cover].some(record => (
    ['adjacent-spill', 'edge-spill-origin', 'edge-continuity'].includes(record.kind)
      && record.sharedEdgeKey === sourcePair.sharedEdgeKey
  )), `${direction.id} route crossing must symmetrically reserve the shared edge from decorative spill`);

  const sameDestination = { ...destination, biome: 'jungle', derivedBiome: 'jungle', visualSeed: source.visualSeed };
  const sameSourceRecipe = visualRecipes.compose(source, (x, y) => x === sameDestination.x && y === sameDestination.y ? sameDestination : null);
  const sameDestinationRecipe = visualRecipes.compose(sameDestination, (x, y) => x === source.x && y === source.y ? source : null);
  const sourceContinuity = sameSourceRecipe.cover.filter(record => record.kind === 'edge-continuity');
  const destinationContinuity = sameDestinationRecipe.cover.filter(record => record.kind === 'edge-continuity');
  check(sourceContinuity.length === 3 && destinationContinuity.length === 3
    && sourceContinuity.every((record, index) => record.sharedEdgeKey === destinationContinuity[index].sharedEdgeKey
      && record.variant === destinationContinuity[index].variant
      && record.scale === destinationContinuity[index].scale
      && record.opacity === destinationContinuity[index].opacity
      && record.rotation === destinationContinuity[index].rotation
      && record.flipX === destinationContinuity[index].flipX
      && record.anchor[crossAxis] === destinationContinuity[index].anchor[crossAxis]),
  `${direction.id} same-jungle edge must render three transform-identical continuity pairs`);
}

const shoreLand = { ...tile, x: 0, y: 0, biome: 'beach', derivedBiome: 'beach', overlays: {} };
const shoreWater = { ...tile, x: 1, y: 0, biome: 'water', derivedBiome: 'water', water: true, overlays: {} };
const shoreVisual = visuals.mapTileVisual(app, shoreLand, { neighborResolver: (x, y) => x === 1 && y === 0 ? shoreWater : null });
check(shoreVisual.shorelineEdges.join(',') === 'east' && shoreVisual.semanticKeys.includes('shoreline-water-east'), 'Visible water must resolve through the specialized shoreline authority');
check(!shoreVisual.semanticKeys.includes('ground-transition-water-east') && shoreVisual.groundTransitions.length === 0, 'Water and land must never receive duplicate generic adjacency paint');
check(shoreVisual.adjacencyBlend.sharedEdges[0].policy === 'shoreline' && shoreVisual.adjacencyBlend.sharedEdges[0].destinationOwned, 'The land cell must own the canonical water shoreline seam');
const shorelineMetadata = runtime._transitionMetadata(shoreVisual, 'shoreline-water-east');
check(shorelineMetadata?.kind === 'shoreline' && shorelineMetadata.contour.length === 5 && runtime._edgeClipPath(shorelineMetadata).startsWith('polygon('), 'Specialized shoreline semantics must use their canonical contour instead of generic transition paint');
const cornerShoreTile = { ...shoreLand, overlays: { cover: [{ id: 'shore-cover', family: 'drift', anchor: { x: 0.92, y: 0.08 } }] } };
const cornerShoreVisual = visuals.mapTileVisual(app, cornerShoreTile, {
  neighborResolver: (x, y) => (x === 1 && y === 0) || (x === 0 && y === -1) || (x === 1 && y === -1)
    ? { x, y, biome: 'water', derivedBiome: 'water', water: true, terrain: { water: true }, overlays: {} }
    : null
});
check(cornerShoreVisual.shorelineCorners.includes('outer-ne')
  && !cornerShoreVisual.semanticKeys.includes('shoreline-water-outer-ne'),
  'Outer coast joins must be owned by shared cardinal contours rather than an overlapping corner sticker');
const eastShore = cornerShoreVisual.adjacencyBlend.sharedEdges.find(edge => edge.policy === 'shoreline' && edge.direction === 'east');
const northShore = cornerShoreVisual.adjacencyBlend.sharedEdges.find(edge => edge.policy === 'shoreline' && edge.direction === 'north');
check(eastShore?.corners.ne === 'join' && northShore?.corners.ne === 'join',
  'Two shoreline contours meeting at a corner must publish the same joined endpoint state');
const clearedShoreCover = cornerShoreVisual.composition.layers.cover.records.find(record => record.id === 'shore-cover');
check(clearedShoreCover?.clearanceAdjusted && clearedShoreCover.anchor.x <= 0.76 && clearedShoreCover.anchor.y >= 0.24,
  'Decorative cover must move out of the visible shoreline bank without mutating terrain facts');
const explicitShoreVisual = visuals.mapTileVisual(app, {
  ...shoreLand,
  overlays: { shoreline: { edges: ['north'] } }
}, { neighborResolver: () => null });
const explicitShoreMetadata = runtime._transitionMetadata(explicitShoreVisual, 'shoreline-water-north');
check(explicitShoreMetadata?.contour.length === 5 && explicitShoreMetadata.destinationOwned, 'Authored shoreline topology must retain canonical contour authority when the neighboring tile is unavailable');

const hardVisual = visuals.mapTileVisual(app, { ...plainsTile, x: 0, y: 0 }, {
  neighborResolver: (x, y) => x === 1 && y === 0 ? { x, y, biome: 'cliff', derivedBiome: 'cliff', overlays: {} } : null
});
check(hardVisual.groundTransitions[0]?.style === 'hard', 'Stone and open terrain must use the hard shared-edge policy');
check(!hardVisual.composition.layers.cover.records.some(record => record.kind === 'adjacent-spill'), 'Hard material boundaries must not scatter unrelated decorative foliage onto the destination');

const junctionVisual = visuals.mapTileVisual(app, { ...plainsTile, x: 0, y: 0 }, {
  neighborResolver: (x, y) => {
    if (x === 0 && y === -1) return { x, y, biome: 'jungle', derivedBiome: 'jungle', overlays: {} };
    if (x === 1 && y === 0) return { x, y, biome: 'cliff', derivedBiome: 'cliff', overlays: {} };
    if (x === 1 && y === -1) return { x, y, biome: 'jungle', derivedBiome: 'jungle', overlays: {} };
    return null;
  }
});
const northJunctionEdge = junctionVisual.groundTransitions.find(entry => entry.direction === 'north');
const eastJunctionEdge = junctionVisual.groundTransitions.find(entry => entry.direction === 'east');
check(junctionVisual.adjacencyBlend.junctions.find(entry => entry.corner === 'ne')?.kind === 'split', 'Eight-neighbor junctions must classify a mixed-source four-tile corner');
check(northJunctionEdge?.corners.ne === 'trim' && eastJunctionEdge?.corners.ne === 'extend', 'A mixed corner must trim the losing material and extend the deterministic winner');
check(runtime._edgeClipPath(northJunctionEdge).includes('74% 0%') && runtime._edgeClipPath(eastJunctionEdge).startsWith('polygon(100% 0%'), 'The bundled compositor must reserve the mixed corner for one winner while clipping the losing edge away');

const jungleIdentity = visualRecipes.compose({ ...jungleTile, overlays: {} }, () => null);
const plainsIdentity = visualRecipes.compose({ ...plainsTile, overlays: {} }, () => null);
const identityFamilies = ['grove', 'forest', 'plains', 'swamp', 'cave', 'beach'].map(biome => {
  const identity = visualRecipes.compose({ ...plainsTile, biome, derivedBiome: biome, overlays: {} }, () => null)
    .cover.find(record => record.kind === 'biome-identity');
  return [biome, identity];
});
check(new Set(jungleIdentity.cover.filter(record => record.kind === 'biome-identity').map(record => record.stratum)).size === 3, 'Jungle must compose distinct canopy, undergrowth, and forest-floor strata');
check(['jungle-canopy', 'jungle-undergrowth', 'jungle-litter'].every(family => jungleIdentity.cover.some(record => record.kind === 'biome-identity' && record.family === family)), 'Jungle strata must resolve independently replaceable first-party overlay semantics');
check(plainsIdentity.cover.filter(record => record.kind === 'biome-identity').length === 1, 'Plains must receive one restrained identity overlay instead of inheriting jungle density');
check(identityFamilies.every(([biome, identity]) => identity?.family === `${biome}-identity` && !identity.mechanical && !identity.blocksMovement && !identity.blocksSight), 'Biome identity art must use independently replaceable, presentation-only semantics');
const forestIdentity = visualRecipes.compose({ ...plainsTile, biome: 'forest', derivedBiome: 'forest', x: 30, y: 30, overlays: {} },
  (x, y) => x === 31 && y === 30 ? { ...plainsTile, biome: 'forest', derivedBiome: 'forest', x, y, overlays: {} } : null);
const forestCanopy = forestIdentity.cover.filter(record => record.kind === 'biome-identity' && record.stratum === 'canopy');
const forestContinuity = forestIdentity.cover.filter(record => record.kind === 'edge-continuity');
check(forestCanopy.length === 3 && new Set(forestCanopy.map(record => `${Math.round(record.anchor.x * 4)}:${Math.round(record.anchor.y * 4)}`)).size >= 2,
  'Forest canopy must distribute across more than one interior region instead of clumping at the tile center');
check(forestContinuity.length === 2 && forestContinuity.every(record => record.family === 'forest-spill' && record.edgeBand === 'east'),
  'Adjacent forest cells must paint paired edge canopy that prevents empty tile margins');
const swampIdentity = visualRecipes.compose({ ...plainsTile, biome: 'swamp', derivedBiome: 'swamp', overlays: {} }, () => null).cover;
check(swampIdentity.some(record => record.family === 'swamp-identity')
  && swampIdentity.filter(record => record.family === 'reeds').length === 2,
  'Swamp composition must combine shallow wetland identity with distributed reed detail');
const plainsVariation = Array.from({ length: 8 }, (_, index) => visualRecipes.compose({
  ...plainsTile, x: index, y: index * -2, overlays: {}
}, () => null).cover.find(record => record.kind === 'biome-identity'));
const variationSignatures = new Set(plainsVariation.map(record => [
  record.anchor.x, record.anchor.y, record.scale, record.rotation, record.flipX, record.variant
].join(':')));
check(variationSignatures.size >= 6, 'Repeated biome identity art must receive broad deterministic placement, scale, rotation, flip, and variant signatures');
for (const biome of ['grove', 'plains', 'cave', 'beach']) {
  const variants = Array.from({ length: 20 }, (_, index) => visualRecipes.compose({
    ...plainsTile, biome, derivedBiome: biome, x: index - 7, y: index * 3 - 11, overlays: {}
  }, () => null).cover.filter(record => record.kind === 'biome-identity' || record.kind === 'biome-detail'));
  const detailFamilies = new Set(variants.flatMap(records => records.filter(record => record.kind === 'biome-detail').map(record => record.family)));
  const recordCounts = new Set(variants.map(records => records.length));
  check(detailFamilies.size >= 2 || (biome === 'plains' && recordCounts.size >= 2), `${biome} coordinate variants must visibly change secondary art family or density`);
}
const variantLayer = runtime._dynamicLayerRequests({ composition: { layers: { cover: { records: [{ kind: 'biome-detail', family: 'reeds', variant: 3, anchor: { x: 0.4, y: 0.6 }, scale: 0.6 }] } } } })[0];
check(variantLayer?.variant === 3, 'Visible biome variant identity must survive into the shared renderer request');

const clearanceTile = {
  ...tile,
  biome: 'jungle', derivedBiome: 'jungle', structure: null, hasLandmark: false,
  items: [], creatures: [], deathBags: [], placedObjects: [], resourceSearched: false,
  overlays: {
    road: { id: 'clearance-road', direction: 'east-west', connections: ['east', 'west'] },
    cover: [{ id: 'center-cover', family: 'jungle', anchor: { x: 0.5, y: 0.5 }, scale: 1 }]
  }
};
const clearanceBefore = JSON.stringify(clearanceTile);
const clearanceVisual = visuals.mapTileVisual(app, clearanceTile, { neighborResolver: () => null });
const routeVerge = clearanceVisual.composition.layers.route.records.find(record => record.kind === 'route-verge');
const clearedCover = clearanceVisual.composition.layers.cover.records.find(record => record.id === 'center-cover');
check(routeVerge?.shoulder === 'leaf-litter' && routeVerge.connections.join(',') === 'east,west', 'Road records must receive the biome recipe verge treatment and exact topology');
check(clearanceVisual.composition.layers.route.records[0].kind === 'route-verge' && clearanceVisual.composition.layers.route.records.at(-1).kind === 'road', 'Route underlay records must sort before the authored route deck');
check(clearedCover?.clearanceAdjusted && Math.abs(clearedCover.anchor.y - 0.5) >= routeVerge.clearanceRadius, 'Route clearance must move decorative cover outside the rendered centerline corridor');
check(JSON.stringify(clearanceTile) === clearanceBefore, 'Visual clearance must not mutate simulation or persistence input');
check(visuals.mapTileAttrs(app, clearanceVisual).includes('data-route-shoulder="leaf-litter"'), 'Rendered cells must expose their biome-aware route treatment');
check(visuals.mapTileAttrs(app, adjacentVisual).includes('data-relief-mode="slope-only"'), 'Rendered map attributes must expose the active biome-aware relief mode');

const featureTile = {
  ...clearanceTile,
  overlays: { cover: [{ id: 'feature-cover', family: 'jungle', anchor: { x: 0.5, y: 0.5 } }], poi: { id: 'feature-poi', category: 'landmark' } }
};
const featureVisual = visuals.mapTileVisual(app, featureTile, { neighborResolver: () => null });
const featureGrounding = featureVisual.composition.layers.feature.records.find(record => record.kind === 'feature-grounding');
const featureCover = featureVisual.composition.layers.cover.records.find(record => record.id === 'feature-cover');
check(featureGrounding?.biome === 'jungle' && featureGrounding.destinationOwned, 'Features must receive destination-owned biome grounding records');
check(featureVisual.composition.layers.feature.records[0].kind === 'feature-grounding', 'Feature grounding must sort before transparent structure and POI art');
check(featureCover?.clearanceAdjusted && Math.hypot(featureCover.anchor.x - 0.5, featureCover.anchor.y - 0.5) >= featureGrounding.clearanceRadius, 'Feature clearance must preserve readable negative space around POIs');

const bridgeTile = {
  ...clearanceTile,
  water: true,
  overlays: { bridge: { id: 'bridge', direction: 'east-west', connections: ['east', 'west'], spanIndex: 0, spanLength: 1, spanRole: 'single' } }
};
const bridgeVisual = visuals.mapTileVisual(app, bridgeTile, {
  neighborResolver: (x, y) => ({ x, y, biome: 'plains', derivedBiome: 'plains', overlays: { road: { direction: 'east-west' } }, traversal: { passable: true } })
});
const bridgeApproach = bridgeVisual.composition.layers.route.records.find(record => record.kind === 'bridge-approach');
check(bridgeApproach?.approachEdges.join(',') === 'east,west', 'Bridge approach records must identify landward cardinal ends without changing span topology');
check(visuals.mapTileAttrs(app, bridgeVisual).includes('data-bridge-approach-edges="east west"'), 'Bridge cells must expose approach edges to the shared renderer');
const spillRequest = runtime._dynamicLayerRequests(adjacentVisual).find(request => request.recordKind === 'adjacent-spill');
check(spillRequest?.fallbackKey === 'cover-foliage' && spillRequest.opacity > 0 && spillRequest.opacity <= 1 && spillRequest.edgeBand === 'east' && spillRequest.pairRole === 'destination', 'Adjacent spill art must retain bounded partial-pack fallback, opacity, edge-band, and pair-role metadata');
const unsafeCanopyRequest = runtime._dynamicLayerRequests({ composition: { layers: { cover: { records: [{
  kind: 'biome-identity', family: 'jungle-canopy', stratum: 'canopy', edgeSafe: true,
  anchor: { x: 0.01, y: 0.99 }, scale: 1, rotation: 35
}] } } } })[0];
const canopyExtent = unsafeCanopyRequest.placement.scale * (Math.abs(Math.cos(35 * Math.PI / 180)) + Math.abs(Math.sin(35 * Math.PI / 180))) / 2;
check(unsafeCanopyRequest.interiorSafe && unsafeCanopyRequest.placement.x >= canopyExtent && unsafeCanopyRequest.placement.y <= 1 - canopyExtent, 'The renderer must enforce safe interior placement after scale and rotation are known');
for (const sourceBiome of ['grove', 'forest', 'plains', 'swamp', 'jungle']) {
  const source = { ...tile, x: 1, y: 0, biome: sourceBiome, derivedBiome: sourceBiome, overlays: {} };
  const destination = { ...tile, x: 0, y: 0, biome: 'beach', derivedBiome: 'beach', overlays: {} };
  const destinationVisual = visuals.mapTileVisual(app, destination, { neighborResolver: (x, y) => x === 1 && y === 0 ? source : null });
  const sourceVisual = visuals.mapTileVisual(app, source, { neighborResolver: (x, y) => x === 0 && y === 0 ? destination : null });
  const destinationPair = destinationVisual.composition.layers.cover.records.find(record => record.kind === 'adjacent-spill');
  const sourcePair = sourceVisual.composition.layers.cover.records.find(record => record.kind === 'edge-spill-origin');
  check(destinationPair?.sharedEdgeKey === sourcePair?.sharedEdgeKey
    && destinationPair?.pairRole === 'destination' && sourcePair?.pairRole === 'source'
    && destinationPair?.family === sourcePair?.family && destinationPair?.variant === sourcePair?.variant,
  `${sourceBiome} soft edges must create complementary source and destination cover records`);
}
const generatedWorld = { seed: 'composition-world', generatorVersion: 7 };
const generatedBiomes = ['forest', 'grove', 'jungle', 'swamp', 'plains', 'beach', 'sand', 'cliff'];
const generatedA = worldGeneration.generateBaseTile(generatedWorld, 31, -12, generatedBiomes);
const generatedB = worldGeneration.generateBaseTile(generatedWorld, 31, -12, generatedBiomes);
check(JSON.stringify(generatedA.overlays.cover) === JSON.stringify(generatedB.overlays.cover), 'Generated cover must be deterministic for a pinned world coordinate');
const generatedEast = worldGeneration.generateBaseTile(generatedWorld, 32, -12, generatedBiomes);
check(generatedA.terrainTopology.cornerElevations.ne === generatedEast.terrainTopology.cornerElevations.nw
  && generatedA.terrainTopology.cornerElevations.se === generatedEast.terrainTopology.cornerElevations.sw,
  'Adjacent generated tiles must share byte-identical elevation samples at both edge corners');
check(generatedA.terrainTopology.terraceEdges.east === -generatedEast.terrainTopology.terraceEdges.west,
  'Adjacent generated tiles must publish reciprocal terrace deltas across their shared edge');
check(generatedA.terrainTopology.contours.every(contour => contour.mask > 0 && contour.mask < 15
  && contour.segments.every(segment => [segment.from, segment.to].every(point => point.x === 0 || point.x === 1 || point.y === 0 || point.y === 1))),
  'Generated marching-squares contours must remain bounded and terminate on tile edges');
const contourVisual = {
  elevationKind: 'cliff',
  elevationCorners: { nw: 0.8, ne: 0.8, se: 0.4, sw: 0.4 },
  elevationContours: [{
    level: 3, threshold: 0.5, mask: 3,
    segments: [{ from: { edge: 'west', x: 0, y: 0.75 }, to: { edge: 'east', x: 1, y: 0.75 } }]
  }]
};
const contourHtml = runtime._terrainContourHtml(app, contourVisual, 'yaw.default-basic-v1');
check(contourHtml.includes('yaw-terrain-contour-segment') && contourHtml.includes('data-contour-mask="3"'),
  'The bundled renderer must turn contour segments into connected terrace-wall presentation');
check(runtime._terrainContourHtml(app, contourVisual, 'mod.authored-terrain') === '',
  'Procedural plateau walls must not override an authored replacement tileset');
check(runtime._terrainContourHtml(app, { ...contourVisual, visualRecipe: { reliefMode: 'slope-only' } }, 'yaw.default-basic-v1') === '',
  'Flat-biome slopes and terrace samples must not render repeated plateau walls');
check(runtime._terrainContourHtml(app, { ...contourVisual, visualRecipe: { reliefMode: 'none' } }, 'yaw.default-basic-v1') === '',
  'Non-relief materials such as water must never render plateau walls');
const restrainedHtml = runtime._terrainContourHtml(app, {
  ...contourVisual,
  visualRecipe: { reliefMode: 'restrained' },
  elevationContours: Array.from({ length: 5 }, (_, index) => ({ ...contourVisual.elevationContours[0], level: index }))
}, 'yaw.default-basic-v1');
check(restrainedHtml.includes('data-relief-mode="restrained"')
  && (restrainedHtml.match(/yaw-terrain-contour-segment/g) || []).length === 2,
  'Restrained relief must cap decorative wall density while retaining readable elevation');
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
check(!visuals.mapTileAttrs(app, unknownVisual).includes('data-elevation-contours'),
  'Unknown cells must not reveal contour topology through rendered data attributes');

const flatBiomeCliff = visuals.mapTileVisual(app, {
  ...plainsTile,
  terrainTopology: {
    kind: 'cliff', primaryDownhill: 'south', cliffEdges: ['south'],
    contours: [{ level: 2, mask: 3, segments: [] }]
  }
});
check(flatBiomeCliff.semanticKeys.includes('terrain-elevation-cliff-south'),
  'Slope-only biomes must retain rugged elevation semantics for authored replacement packs');
const terraceBiomeCliff = visuals.mapTileVisual(app, {
  ...plainsTile,
  biome: 'cliff', baseBiome: 'cliff', derivedBiome: 'cliff',
  terrainTopology: { kind: 'cliff', primaryDownhill: 'south', cliffEdges: ['south'], contours: [] }
});
check(terraceBiomeCliff.semanticKeys.includes('terrain-elevation-cliff-south'),
  'Terrace biomes must retain directional cliff artwork');

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
