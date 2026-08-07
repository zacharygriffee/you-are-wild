#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'alpha-lab.js'), 'utf8');
const lab = new Function(`${source}\nreturn YAW_ALPHA_LAB;`)();

let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
  passed += 1;
};

const expectedBiomes = ['grove', 'forest', 'plains', 'swamp', 'jungle', 'beach', 'water', 'cliff', 'cave'];
check(JSON.stringify(lab.TERRAIN_WORKBENCH_BIOMES) === JSON.stringify(expectedBiomes), 'Workbench biomes must match the maintained generated presentation set');
check(lab.TERRAIN_WORKBENCH_DIRECTIONS.length === 4, 'Workbench must expose every cardinal orientation');
check(lab.TERRAIN_WORKBENCH_GEOMETRIES.length === 6, 'Workbench must expose six distinct boundary geometries');
check(JSON.stringify(lab.TERRAIN_WORKBENCH_RELIEFS) === JSON.stringify(['level', 'slope', 'terrace', 'cliff-corner', 'rugged']), 'Workbench must expose reproducible level, slope, terrace, cliff-corner, and rugged relief');
check(lab.TERRAIN_WORKBENCH_OVERLAYS.includes('selection') && lab.TERRAIN_WORKBENCH_OVERLAYS.includes('all'), 'Workbench must directly exercise selection and mixed overlays');
check(JSON.stringify(lab.TERRAIN_WORKBENCH_PHASES) === JSON.stringify(['day', 'night']), 'Workbench must expose day and night rendering');
const expectedRegressionIds = ['plains-relief', 'swamp-relief', 'beach-corner', 'forest-cover', 'jungle-variation', 'road-scale', 'bridge-water-walls'];
check(JSON.stringify(lab.TERRAIN_WORKBENCH_REGRESSIONS.map(entry => entry.id)) === JSON.stringify(expectedRegressionIds),
  'Workbench must retain one pinned regression for every reported correction case');
for (const regression of lab.TERRAIN_WORKBENCH_REGRESSIONS) {
  const normalizedRegression = lab.normalizeTerrainWorkbench(regression);
  check(JSON.stringify(normalizedRegression) === JSON.stringify({
    source: regression.source, destination: regression.destination, direction: regression.direction,
    geometry: regression.geometry, relief: regression.relief, overlay: regression.overlay,
    phase: regression.phase, seed: regression.seed
  }), `${regression.id} must be a stable, valid workbench state`);
  check(lab.terrainWorkbenchCaseAt(lab.terrainWorkbenchCaseIndex(normalizedRegression)).source === regression.source,
    `${regression.id} must round-trip through the exhaustive case index`);
}

const expectedCount = expectedBiomes.length ** 2
  * lab.TERRAIN_WORKBENCH_DIRECTIONS.length
  * lab.TERRAIN_WORKBENCH_GEOMETRIES.length
  * lab.TERRAIN_WORKBENCH_RELIEFS.length
  * lab.TERRAIN_WORKBENCH_OVERLAYS.length
  * lab.TERRAIN_WORKBENCH_PHASES.length
  * lab.TERRAIN_WORKBENCH_SEED_COUNT;
check(lab.terrainWorkbenchCaseCount() === expectedCount, 'Workbench case count must equal the complete Cartesian matrix');

for (let index = 0; index < expectedCount; index++) {
  const state = lab.terrainWorkbenchCaseAt(index);
  check(lab.terrainWorkbenchCaseIndex(state) === index, `Workbench case ${index} must round-trip through its stable index`);
}

for (const direction of lab.TERRAIN_WORKBENCH_DIRECTIONS) {
  const geometrySignatures = new Set();
  for (const geometry of lab.TERRAIN_WORKBENCH_GEOMETRIES) {
    const state = lab.normalizeTerrainWorkbench({ source: 'jungle', destination: 'plains', direction, geometry });
    const cells = [];
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) cells.push(lab.terrainWorkbenchBiomeAt(x, y, state) === state.destination ? 'D' : 'S');
    }
    check(cells.includes('S') && cells.includes('D'), `${geometry} ${direction} must show both sides of its boundary`);
    geometrySignatures.add(cells.join(''));
  }
  check(geometrySignatures.size === lab.TERRAIN_WORKBENCH_GEOMETRIES.length, `Every ${direction} boundary geometry must produce a distinct review pattern`);
}

const normalized = lab.normalizeTerrainWorkbench({
  source: 'not-a-biome', destination: 'water', direction: 'sideways', geometry: 'unknown',
  relief: 'not-relief', overlay: 'selection', phase: 'night', seed: 1200
});
check(normalized.source === 'jungle' && normalized.destination === 'water', 'Invalid workbench biome input must normalize without losing valid input');
check(normalized.direction === 'north' && normalized.geometry === 'straight', 'Invalid geometry input must normalize to reproducible defaults');
check(normalized.relief === 'terrace', 'Invalid relief input must normalize to the reproducible terrace default');
check(normalized.overlay === 'selection' && normalized.phase === 'night' && normalized.seed === 999, 'Overlay, lighting, and seed normalization must remain bounded');

for (const relief of lab.TERRAIN_WORKBENCH_RELIEFS) {
  const state = lab.normalizeTerrainWorkbench({ relief, direction: 'north' });
  const topology = lab.terrainWorkbenchTopologyAt(0, 0, state);
  check(relief === 'rugged'
    ? ['slope', 'ledge', 'cliff'].includes(topology.kind)
    : topology.kind === (relief === 'cliff-corner' ? 'cliff' : (relief === 'terrace' ? 'ledge' : relief)),
  `${relief} must publish its intended presentation topology`);
  check(Object.keys(topology.cornerElevations).sort().join(',') === 'ne,nw,se,sw', `${relief} must publish four shared corner samples`);
  check(Object.keys(topology.terraceEdges).sort().join(',') === 'east,north,south,west', `${relief} must publish four reciprocal terrace edges`);
}

console.log(`Tile Composition Workbench: ${passed} checks passed across ${expectedCount.toLocaleString()} cases`);
