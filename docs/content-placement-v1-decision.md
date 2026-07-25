# Content Placement V1 Decision

Content Placement V1 is an evaluated boundary, not a new executable generator
API. The current public module surface can add definitions and can place a
species into existing biome encounter tables, but it cannot yet promise that a
module-authored terrain region, structure, landmark, route, interior network,
or resource site will reconstruct identically after save/load or module
removal.

## What is supported now

- `MODS.addSpecies()` with Species Profile V1 `encounters` may add a bounded
  weight to an existing biome's hostile or friendly encounter table. The
  Elemental Species module is the maintained rare-placement example.
- `MODS.addBiome()` owns a runtime biome definition. It is a legacy definition
  seam, not a complete placement contract. A region-role biome may currently
  enter selection for previously unmaterialized tiles, but `worldMeta` does not
  snapshot the definition or enabled-module recipe. Distributable modules must
  not rely on that behavior for save-stable geography.
- Asset Bundles, Tileset Packs, and Sprite Packs alter presentation only. They
  never place gameplay content.
- Core alone owns Generator V6 terrain classification, start safety, roads,
  bridges, barriers, POIs, cave portals, interior topology, and tile-delta
  persistence.

## Why arbitrary placement callbacks are rejected

`worldMeta.mapModsHash` is currently metadata scaffolding and remains `core` for
new games. It does not prove which module versions, normalized declarations, or
content definitions generated an unexplored tile. Allowing
`registerMapRule(fn)`, a layer generator, or a semantic callback now would make
the same seed depend on module load order and executable code that may later be
disabled or missing. It would also let callbacks bypass protected-start,
traversal, route-connectivity, and placement-budget invariants.

Content Placement V1 therefore does **not** expose executable world-generation
callbacks, DOM/render callbacks, or mutation hooks.

## Required recipe before a placement API

A future declarative placement profile must land as one coordinated generator
version and satisfy all of these requirements:

1. **New-world snapshot.** Normalize enabled placement declarations at game
   creation. Store their owner ID, module version, declaration version, and
   canonical digest in an immutable world recipe. Derive `mapModsHash` from
   that canonical recipe.
2. **Declarative candidates.** Admit bounded data such as content kind,
   content ID, allowed existing biomes and terrain tags, weight, minimum
   spacing, per-region maximum, route relationship, danger band, and
   structure/interior eligibility. Do not admit functions.
3. **Core arbitration.** Core filters and orders candidates, owns seeded
   purpose keys, enforces start safety and traversal/connectivity, and records
   the winning placement. Modules never choose coordinates directly.
4. **Materialized persistence.** Once visited or otherwise materialized, a
   placement becomes a normal tile delta and cannot reroll because settings,
   module order, or content availability changed.
5. **Missing-owner policy.** Before release, choose and test one explicit
   behavior for an absent recipe owner: require the module, or enter a
   user-confirmed degraded mode with stable placeholders. Silent regeneration
   is not acceptable.
6. **Unload boundary.** Disabling a presentation pack remains harmless.
   Disabling a module required by an active world recipe must not rewrite
   geography or silently substitute another placement.
7. **Offline parity.** The recipe and all required definitions must remain
   locally retained. HTTPS, a host manifest, or a hotlinked resource cannot be
   required to reconstruct a downloaded `file://` world.

## Candidate schema direction

The following is design vocabulary, not a callable API:

```json
{
  "version": 1,
  "kind": "structure",
  "contentId": "example_mod:moon-shrine",
  "biomes": ["grove", "forest"],
  "terrainTags": ["land"],
  "weight": 2,
  "minDistance": 12,
  "maxPerRegion": 1,
  "routeRelation": "near",
  "dangerBands": ["wild"]
}
```

Structures, landmarks, resources, and interior entrances may eventually share
this candidate envelope. Terrain classifiers and route generators need a
separate, stricter generator-version decision; they are not ordinary content
placements.

## Acceptance gate

Do not implement `world:add_placement` until one fixture proves:

- two fresh worlds with the same seed and recipe match despite module enable
  order;
- save/reload and IndexedDB sparse reconstruction match;
- materialized tiles do not reroll;
- missing-owner handling is explicit and deterministic;
- protected-start, road connectivity, water traversal, and cave/interior
  topology remain valid;
- the same fixture works from `file://` with the network unavailable.
