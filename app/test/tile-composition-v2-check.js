#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src', 'core', 'tile-composition-v2.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const composition = new Function(`${source}\nreturn YAW_TILE_COMPOSITION_V2;`)();

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
  water: false,
  terrainTags: ['coast', 'high-ground', 'coast'],
  traversal: { passable: true, traversalCost: 0.8, requiredCapability: null, routeModifier: -0.2 },
  overlays: {
    shoreline: { edges: ['east', 'north'], nearWater: true },
    road: { id: 'shore-road', direction: 'east-west', connections: ['west', 'east'] },
    bridge: { id: 'shore-bridge', direction: 'east-west', connections: ['west', 'east'] },
    barriers: ['south'],
    cover: [{ id: 'pine-1', name: 'Pine' }],
    poi: { id: 'spring-1', category: 'resourceSite' }
  },
  structure: 'spring',
  resourceSearched: true,
  items: [{ id: 'rope-1', name: 'Rope', quantity: 2 }],
  deathBags: [{ resolutionId: 'bag-1', items: [{ id: 'knife' }], gold: 4 }],
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
check(first.layers.terrain.records.some(record => record.kind === 'shoreline' && record.edges.join(',') === 'north,east'), 'Terrain transitions must normalize shoreline topology');
check(first.layers.route.records[0].kind === 'bridge' && first.layers.route.records[0].connections.join(',') === 'east,west', 'Bridge must remain a route with normalized edge connections');
check(first.layers.cover.records[0].id === 'pine-1', 'Explicit cover must remain independent from ground');
check(first.layers.feature.records.some(record => record.kind === 'structure'), 'Structures must appear as features');
check(first.layers.feature.records.some(record => record.kind === 'resource' && record.depleted), 'Resource depletion must remain a feature fact');
check(first.layers.evidence.records.some(record => record.kind === 'item' && record.quantity === 2), 'Dropped items must become durable evidence');
check(first.layers.evidence.records.some(record => record.kind === 'remains'), 'Creature remains must become durable evidence rather than live presence');
check(first.layers.evidence.records.some(record => record.kind === 'recovery-bag' && record.gold === 4), 'Recovery bags must become durable evidence');
check(first.layers.presence.records.some(record => record.id === 'fox-1') && first.layers.presence.records.some(record => record.id === 'player-1'), 'Living creatures and supplied party occupants must share the presence layer');
check(first.layers.state.records.some(record => record.kind === 'current') && first.layers.state.records.some(record => record.kind === 'blocked'), 'Interaction and traversal state must remain above world content');
check(first.compatibility.tilesetPackVersion === 1 && first.compatibility.semanticKeys.includes('route-bridge-horizontal'), 'V1 semantic keys must remain available to the compatibility adapter');
check(first.facts.traversal.cost === 0.8 && first.facts.traversal.routeModifier === -0.2, 'Renderer facts must preserve simulation-owned traversal truth');

const crowded = composition.snapshot(null, {
  ...tile,
  creatures: [],
  deathBags: [],
  items: Array.from({ length: 30 }, (_, index) => ({ id: `item-${index}`, name: `Item ${index}` }))
});
check(crowded.layers.evidence.records.length === composition.MAX_RECORDS_PER_LAYER, 'Crowded evidence must be bounded');
check(crowded.layers.evidence.omitted === 6, 'Crowded evidence must report omitted records');
const longLabel = composition.snapshot(null, { items: [{ id: 'long', name: 'x'.repeat(1000) }] });
check(longLabel.layers.evidence.records[0].label.length === 160, 'Snapshot scalar text must be bounded');
check(!JSON.stringify(first).includes('function'), 'Snapshot must contain data, never executable rendering callbacks');

console.log(`Tile Composition V2 Phase A: ${passed}/21 checks passed`);
