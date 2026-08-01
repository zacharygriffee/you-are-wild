# Biome Boundary and World Recipe V1 Decision

Status: deterministic boundary/procedural prototype implemented; frozen
new-world recipe metadata, designed regions, anomalies, and portal worlds
remain deferred

## Fixed-grid interpretation

The world uses stable integer coordinates. A module cannot literally insert
new coordinates between two existing tiles without moving saved locations,
routes, quests, structures, and sparse tile deltas.

"Expand at biome seams" therefore means boundary-band classification on
unmaterialized coordinates:

1. Core computes the ordinary Generator V7 terrain and biome scores.
2. It derives a boundary score where the leading compatible biome candidates
   are close enough to represent a seam.
3. Frozen world-recipe candidates may compete only inside that boundary band.
4. Core chooses with a seeded purpose key and applies all start-safety,
   traversal, spacing, and placement budgets.
5. Once materialized, the tile persists as an ordinary delta and never rerolls.

Existing materialized tiles and worlds without a recipe retain their original
Generator V7 results.

## World recipe

The intended later new-game contract normalizes every enabled geography-bearing
declaration into an immutable recipe containing:

- owner ID and module version;
- declaration version and normalized data;
- canonical digest;
- missing-owner policy;
- generator version.

`worldMeta.mapModsHash` is not yet derived from this recipe. The current V1
prototype sorts owner-qualified recipe IDs, applies them only to
unmaterialized tiles, and pins effective biome changes into ordinary sparse
world persistence.

The default missing-owner policy is `require-owner`. A later degraded mode must
be user-confirmed and retain stable placeholder geography. Silent
reclassification is forbidden.

## Placement families

1. **Encounter injection** adds species or events to an existing biome. It does
   not change geography.
2. **Seam biome** occupies eligible unmaterialized boundary-band tiles.
3. **Designed region** contributes a bounded declarative map section that core
   places and validates.
4. **Placeable anomaly** materializes a structure or region through an
   authoritative world event. Placement in explored space requires explicit
   conflict and displacement rules.
5. **Portal world** creates a separate coordinate space with its own seed,
   generator, recipe, recovery anchor, and sparse deltas.

Encounter injection and seam biomes come first. Designed regions and anomalies
follow the shared placement envelope. Portal worlds are last because travel,
quest routing, recovery, and missing-owner behavior cross world identities.

## Declarative seam profile direction

The implemented bounded profile is:

```json
{
  "biome": "twilight_mere",
  "mode": "boundary",
  "weight": 20,
  "minDistance": 12,
  "maxDistance": 80,
  "replaces": ["forest", "swamp"],
  "salt": "twilight-mere-v1"
}
```

Core owns the exact boundary formula. Profiles cannot execute classifiers,
choose coordinates, change routes, or inspect mutable tiles during generation.

## Acceptance

- Same seed and canonical recipe match regardless of module enable order.
- Worlds without a recipe match existing Generator V7 fixtures.
- Materialized tiles never reroll after module order or settings changes.
- Existing routes, start safety, water barriers, caves, and interiors remain
  valid.
- Missing owners are explicit.
- Save/load and sparse reconstruction match.
- The fixture works in downloaded `file://` play with the network unavailable.
