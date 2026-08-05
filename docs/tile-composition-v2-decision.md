# Tile Composition V2 — Decision Record

Status: **implemented and superseded as operational guidance by the reviewed
[Tile Composition V2 Presentation Contract](tile-composition-v2.md)**. This
record preserves the Phase A rationale. Save Schema 11, Module API 1, and the
public Tileset Pack V1 vocabulary remain unchanged.

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

The source implementation is `app/src/core/tile-composition-v2.js`. All map
surfaces now carry the snapshot; existing map visuals and Tileset Pack V1 are
the maintained compatibility adapters.

## Source authority inventory

| Snapshot layer | Current authoritative inputs | Phase A coverage | Known gap before art replacement |
| --- | --- | --- | --- |
| Ground | Generator and effective tile `biome`, `baseBiome`, `derivedBiome`, and water facts | Deterministic material record | Several first-party sprites still bake foliage into ground |
| Terrain | Generator numeric elevation plus effective shoreline topology and barrier edges | Elevation, shoreline, and barrier records | No authored slope/ledge direction or cliff-face topology |
| Route | Generator road and bridge overlays plus their connections | Road/bridge kind, direction, and cardinal connections | Bridge span roles and full-bleed seam measurements are not authored |
| Cover | Explicit `overlays.cover` and `overlays.obstacles` only | Bounded independent records | Generator does not yet author reusable foliage/obstacle instances broadly |
| Feature | Generated structures/POIs plus sparse tile-delta landmark, loot, and resource-search state | Independent structure/resource/POI records | Resource-node quantity and replenishment need a later gameplay contract |
| Evidence | Sparse tile-delta ground items, materialized creature remains, recovery bags, placed objects, and resource-search state | Bounded item/remains/bag/object/resource-change records with overflow count | Generalized altered-terrain evidence is not yet authored |
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

`npm run test:tile-composition-browser` is the cross-surface acceptance lab. It
renders the same mixed overworld tile and an interior fixture through the
mobile 3x3, desktop 3x3, and large-map adapters under both downloadable
`file:` and hosted HTTP origins. The fixture runs at 313x670, 390x844,
412x915, and 1365x768; it checks layer and V1-key parity, evidence and presence
coexistence, interior route projection, atlas resolution, resource loading,
viewport containment, and horizontal overflow.

The Phase B gate passed with simulation-owned directional elevation and bridge
span topology, exact-width cross-surface fixtures, pixel-matched ground edges,
and measured bridge gutter continuity. Terrain tactics and crafting remain
separately gated by the reviewed contract.
