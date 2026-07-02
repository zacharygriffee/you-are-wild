# Sparse Map Generation Plan

This document defines the intended direction for replacing the current large-super-patch biome generator with a sparse, deterministic, layered map model.

The goal is not to build a full simulation engine now. The goal is to create a durable map foundation that supports believable geography, seed sharing, large low-detail map views, later high-resolution renderers, and modded/procedural semantics without bloating the single-file HTML output.

## Current Problem

The current overworld lazily generates tiles from deterministic super-patches:

- `PATCH_SIZE = 10`
- `SUPER_PATCH_SIZE = 3`
- one super-patch is effectively a `30x30` tile biome region
- `_getSuperPatchBiome()` chooses from every key in `App.biomes`

This makes all biome entries region-scale candidates. That works for broad terrain like `forest`, `plains`, and `water`, but it is wrong for route/place concepts like `bridge`, `road`, `farm`, `indoors`, and `entrance`.

The result is unrealistic large regions such as bridge biomes spanning many tiles.

## Design Goals

- Deterministic worlds from a shareable seed.
- Durable player/world state stored as deltas over generated baseline data.
- Sparse storage: do not persist unvisited/generated-only tiles.
- Multiple map layers: terrain/biome, features, discovery, entities, semantics.
- Low-detail large-map views without materializing every tile.
- Future high-resolution renderers that can draw richer local detail than simple square tiles.
- Mod hooks for terrain, feature, semantic, encounter, and art generators.
- Keep the existing gameplay-facing tile shape compatible while the internals evolve.

## Core Model

Generated world state should be treated as:

```text
base map = seed + generator version + enabled map mods + coordinates
effective map = base map + durable deltas
```

The resolver should eventually look like:

```js
const base = generateBaseTile(worldMeta, x, y);
const delta = await mapStore.getTileDelta(worldMeta.worldId, x, y);
const tile = applyTileDelta(base, delta);
```

Existing gameplay systems should still be able to consume:

```js
{
  x,
  y,
  biome,
  explored,
  description,
  hasLandmark,
  landmarkName,
  creatures,
  items,
  structure,
  structureSpawned
}
```

The richer layered model can sit below that compatibility shape.

## World Identity

Every generated world should have stable metadata:

```js
{
  worldId: "world_...",
  seed: "shareable-seed-string",
  generatorVersion: 1,
  mapModsHash: "hash-of-enabled-map-mods",
  createdAt: 1234567890
}
```

Seed sharing is only deterministic when all of these match:

- seed
- generator version
- enabled map generator mods
- core registry versions used by the generator

If any of those change, the same seed may produce a different world and should be treated as a different generation contract.

## Sparse Layers

Use layered sparse chunks rather than eagerly storing tile data.

Recommended first layers:

- `biome`: broad region identity, such as forest, plains, swamp, water.
- `terrain`: physical terrain, such as river, coast, ridge, clearing, roadbed.
- `features`: local features, such as bridge, cabin, camp, ruins, shrine, pond.
- `discovery`: explored/seen/known state.
- `entities`: creatures, corpses, merchants, quest givers, dropped items.
- `semantics`: generated tags and procedural meaning, such as predator territory, safe shelter, dangerous crossing, quest vector, mature-content hooks.

These layers can be resolved separately and combined into the effective tile.

## Sparse Quadtree / Chunk LOD

Use quadtree-like chunk levels, but keep the first implementation simple and chunk-oriented.

Example levels:

```js
const MAP_LOD = {
  WORLD: 0,   // very broad world regions
  REGION: 1,  // large biome areas
  LOCAL: 2,   // sub-biomes, roads, rivers, local clusters
  TILE: 3     // current tile-scale gameplay surface
};
```

Chunk key shape:

```js
{
  worldId,
  layer: "biome",
  lod: 1,
  cx: 4,
  cy: -2
}
```

Chunk payload shape:

```js
{
  generated: true,
  seed,
  generatorVersion,
  data: {
    biome: "forest",
    tags: ["temperate", "wild"]
  }
}
```

Higher LOD chunks can refine lower LOD chunks:

- region chunk says: forest
- local chunk says: river corridor crosses this region
- tile-level feature says: bridge where road intersects river

Biome blending is explicitly deferred. Initial resolution should choose clear winners by layer priority and deterministic rules.

## Deterministic Generation Rules

Every generated value must come from a stable deterministic random function derived from:

```text
seed + generatorVersion + layer + lod + coordinates + purpose
```

Do not use `Math.random()` for base map generation once the new map generator is introduced.

Use separate deterministic streams by purpose:

- biome region selection
- river/route generation
- feature placement
- encounter hints
- semantic tags

This avoids changing unrelated outcomes when a new generator step is added.

Example:

```js
const biomeRoll = seededNoise(seed, "biome", lod, cx, cy);
const featureRoll = seededNoise(seed, "feature", x, y);
```

## Durable Deltas

IndexedDB should store changes over the generated baseline, not the whole generated world.

Tile delta shape:

```js
{
  worldId,
  x,
  y,
  explored: true,
  seen: true,
  lastVisitedTurn: 204,
  state: {
    structureSpawned: true,
    structureLooted: false
  },
  entities: {
    creatures: [],
    corpses: [{ id: "corpse_wolf_1", decayTurns: 7 }],
    items: [{ id: "coin_1", name: "Old Coin" }]
  },
  overrides: {
    biome: null,
    terrain: null,
    featuresAdded: [],
    featuresRemoved: []
  },
  semanticMemory: {
    danger: "cleared",
    notes: ["wolf pack defeated here"]
  }
}
```

Only store deltas when something is observed or changed:

- player explores/sees a tile
- creatures/items/corpses persist there
- structure is spawned/looted
- quest/merchant state appears there
- world event changes terrain/features/semantics

Unvisited tiles should remain pure generated state.

## IndexedDB Store Plan

Add a map/world database separate from save slots.

Recommended stores:

```text
YAW_Worlds
  worlds
    worldId -> world metadata

  tileDeltas
    worldId:x:y -> tile delta

  chunkDeltas
    worldId:layer:lod:cx:cy -> chunk-level overrides

  entityIndex
    worldId:entityId -> entity location and type
```

Save slots should reference a world:

```js
{
  player,
  party,
  location,
  worldId,
  inventory,
  quests,
  log
}
```

This allows future support for:

- multiple saves in the same world
- sharing maps by seed
- importing/exporting map states separately from character state
- curated map packs
- generated-art cache keyed by world/tile/semantic data

## Large Map View

The sparse LOD model should support a large-map view without generating every tile.

Large map rendering should query low LOD chunks:

- broad biome colors from `biome` REGION/WORLD chunks
- major route/river/coast hints from `terrain` LOCAL chunks
- discovered POIs from `discovery` and `features`
- quest vectors from `semantics` or `quests`
- known entities from `entityIndex`

The large map should show unknown generated geography only when the player has discovered or otherwise learned it. A debug/dev view may reveal deterministic terrain for testing.

## High-Resolution Renderers

Future renderers should not be limited to one icon per tile.

The resolver should expose enough semantic data for richer renderers:

```js
{
  biome: "forest",
  terrain: ["riverbank", "road"],
  features: ["bridge"],
  semantics: ["dangerous_crossing", "wolf_range"],
  discovered: true
}
```

A later renderer can draw a curved river, road, bridge, and local foliage from the same resolved data without changing combat/exploration logic.

Generative art plugins should receive semantic prompts/data from the resolver rather than inspecting game internals.

## Modding Contract

Future APIs should allow mods to contribute map behavior without patching core generation:

```js
registerTerrainType(id, config)
registerMapFeature(id, config)
registerMapLayerGenerator(layerId, generator)
registerMapRule(rule)
registerSemanticGenerator(generator)
registerMapRenderer(renderer)
registerGeneratedArtProvider(provider)
```

Mods should be included in `mapModsHash` so seed sharing remains honest.

## Migration Path

### Phase 1: Region Eligibility

Keep the current `getTile(x, y)` API.

Add role metadata to biomes:

```js
forest: { role: "region" }
bridge: { role: "feature" }
road: { role: "route" }
indoors: { role: "interior" }
```

Update `_getSuperPatchBiome()` to choose only `role === "region"` entries.

This immediately prevents large bridge/road/indoors regions.

### Phase 2: Seeded World Metadata

Add `worldMeta` to app state and saves:

```js
worldMeta: {
  worldId,
  seed,
  generatorVersion,
  mapModsHash
}
```

Replace base-map `Math.random()` calls with deterministic seeded helpers.

### Phase 3: Tile Delta Boundary

Introduce:

```js
getBaseTile(x, y)
getTileDelta(x, y)
applyTileDelta(base, delta)
persistTileDelta(tile)
```

Keep returning the existing tile shape.

### Phase 4: IndexedDB Map Store - First Pass Complete

Persist durable tile/world state into `YAW_Worlds`.

The current implementation creates `worlds`, `tileDeltas`, `chunkDeltas`, and `entityIndex` stores. Save/load writes and reads world metadata plus tile deltas. New slot saves first persist `YAW_Worlds`; when that succeeds, the slot payload keeps `worldMeta.worldId`, explored keys, and player/session state without duplicating full tile payloads. If the world-store write fails, the slot payload keeps the older full `worldMap` fallback for compatibility.

### Phase 5: Large Map LOD

Add a large map view backed by low-LOD chunk queries and discovery overlays.

### Phase 6: Renderer/Art Plugin Contract

Expose resolved semantic map data to optional renderers and generated-art providers.

## Non-Goals For The First Implementation

- No biome blending.
- No realistic hydrology.
- No high-resolution rendered terrain.
- No full arbitrary-depth quadtree engine.
- No eager full-world generation.
- No generated art in core map logic.

## Immediate Implementation Target - Complete

The first code slice is complete:

1. Biome role metadata separates region, route, feature, settlement, and interior concepts.
2. Super-patch generation selects only region biomes.
3. `worldMeta` seed/version scaffolding exists and persists through saves.
4. Seeded deterministic helper functions drive region biome generation.
5. Tests prove `bridge`, `road`, `indoors`, `entrance`, and similar non-region entries cannot become large super-patch biomes.

That keeps the current game working while establishing the boundary for the sparse layered map system.

## Completed Implementation Target

The durable delta boundary now keeps the current gameplay-facing tile shape:

1. Add `getBaseTile(x, y)` for generated seed-only tile data.
2. Add `getTileDelta(x, y)` for discovered/changed state, initially backed by existing `worldMap` entries.
3. Add `applyTileDelta(base, delta)` to produce the effective tile consumed by gameplay.
4. Add `persistTileDelta(tile)` to store only observed or changed state.
5. Add tests proving unexplored generated tiles do not need durable entries, while explored/changed tiles preserve creatures, items, structures, and discovery state.

The IndexedDB `YAW_Worlds` first pass also exists: world metadata and tile deltas are written separately from compact save-slot data, with object stores reserved for future chunk/entity indexing.

## Current Large-Map Slice

The map panel now includes a first-pass discovered-region view:

1. It resolves low-detail biome data from generated base tiles only for known locations.
2. It overlays explored/known tiles from tile deltas and the in-memory explored set.
3. It surfaces landmarks, structures, creatures, and items as nearby discovery markers.
4. It avoids calling `getTile()` for unknown locations, so broad map viewing does not fill the compatibility `worldMap` cache.

The next code slice should focus on large-map controls such as zoom/pan, quest-vector markers, and mobile-specific ergonomics, or on chunk/entity indexing once gameplay systems need it.
