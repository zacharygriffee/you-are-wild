# Tile Composition V2 — Phase A Decision

Status: **accepted for internal Phase A fixtures**. This decision begins the
post-stabilization map-art work without changing Save Schema 11, Module API 1,
or the public Tileset Pack V1 vocabulary.

## Decision

Core may project the effective tile and view state into one bounded,
JSON-serializable `yaw-map-scene-snapshot` Version 2 record. The snapshot is a
read-only presentation description with eight ordered layers:

1. `ground`
2. `terrain`
3. `route`
4. `cover`
5. `feature`
6. `evidence`
7. `presence`
8. `state`

The source implementation is `app/src/core/tile-composition-v2.js`. It is not
yet the renderer's primary input. Existing map visuals and Tileset Pack V1
remain compatibility adapters while Phase A fixtures establish coverage.

## Source authority inventory

| Snapshot layer | Current authoritative inputs | Phase A coverage | Known gap before art replacement |
| --- | --- | --- | --- |
| Ground | Generator and effective tile `biome`, `baseBiome`, `derivedBiome`, and water facts | Deterministic material record | Several first-party sprites still bake foliage into ground |
| Terrain | Generator numeric elevation plus effective shoreline topology and barrier edges | Elevation, shoreline, and barrier records | No authored slope/ledge direction or cliff-face topology |
| Route | Generator road and bridge overlays plus their connections | Road/bridge kind, direction, and cardinal connections | Bridge span roles and full-bleed seam measurements are not authored |
| Cover | Explicit `overlays.cover` and `overlays.obstacles` only | Bounded independent records | Generator does not yet author reusable foliage/obstacle instances broadly |
| Feature | Generated structures/POIs plus sparse tile-delta landmark, loot, and resource-search state | Independent structure/resource/POI records | Resource-node quantity and replenishment need a later gameplay contract |
| Evidence | Sparse tile-delta ground items, materialized creature remains, and recovery bags | Bounded item/remains/bag records with overflow count | Placed objects and generalized altered-terrain evidence are not yet authored |
| Presence | Materialized encounter creatures plus renderer-supplied party occupants | Stable identity references only | Renderer integration must supply the same occupants to every map surface |
| State | Current, quest, selection, reachability, danger, blocked edges | Independent top-layer records | Focus and hit-target geometry remains renderer-owned by design |

## Boundaries

- Simulation and persistence remain authoritative. A bitmap or snapshot record
  cannot grant passability, cover, elevation advantage, resources, or items.
- A layer contains at most 24 records and reports how many were omitted.
- Records use stable identity references and bounded scalar facts, never full
  units, inventory graphs, callbacks, CSS, or atlas coordinates.
- Tileset Pack V1 semantic keys may be carried under `compatibility`, but its
  five public slots and validation rules do not change in Phase A.
- Missing direction is preserved as missing. Phase A does not infer cliff or
  slope direction from biome artwork.

## Deterministic fixture

`npm run test:tile-composition` covers a mixed coastal bridge tile containing
elevation, shoreline, barrier, cover, structure, depleted resource, dropped
item, remains, recovery bag, live creature, party presence, and interaction
state. It checks stable JSON output, the eight-layer order, V1 compatibility,
simulation-owned traversal facts, and bounded crowded evidence.

Phase B may begin only after representative visual fixtures and measurable
edge-continuity rules are added for bridge spans and directional elevation.
