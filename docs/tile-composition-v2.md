# Tile Composition V2 Presentation Contract

Status: **reviewed implementation contract for the 0.18.3 development line**.

Tile Composition V2 is the common, bounded presentation input for the mobile
3x3 map, desktop 3x3 map, Review Map, and interior map. It does not replace
gameplay state, save state, Module API 1, or Tileset Pack V1.

## Contract identity

Every composed cell exposes a JSON-serializable snapshot with:

- `schema: "yaw-map-scene-snapshot"`
- `version: 2`
- `space: "overworld" | "interior"`
- integer `position.x` and `position.y`
- the eight ordered layers below
- bounded traversal and terrain facts
- `compatibility.tilesetPackVersion: 1` and ordered V1 semantic keys

The canonical producer is `app/src/core/tile-composition-v2.js`. Each layer
contains `records` and `omitted`. A layer may contain at most 24 records.

| Order | Layer | Presentation meaning | Simulation authority |
| --- | --- | --- | --- |
| 1 | `ground` | Continuous material and biome identity | Effective generated tile |
| 2 | `terrain` | Elevation, slope, ledge, cliff, shoreline, and barrier topology | Generator and traversal state |
| 3 | `route` | Roads, bridge spans, interior paths, and thresholds | Generated overlays or interior graph |
| 4 | `cover` | Reusable foliage and obstacles | Explicit cover/obstacle records |
| 5 | `feature` | Structures, landmarks, POIs, and resource nodes | Effective tile and content registries |
| 6 | `evidence` | Items, remains, recovery bags, depleted resources, and placed objects | Sparse tile deltas and materialized units |
| 7 | `presence` | Living creatures and party occupants | Encounter/party state supplied by the surface |
| 8 | `state` | Current, quest, selection, reachability, danger, and blocked state | View and interaction state |

Records contain bounded scalar facts and stable references. They never contain
callbacks, DOM, CSS, atlas coordinates, inventory graphs, or complete units.
Artwork cannot grant passability, cover, elevation advantage, resources,
items, targeting, or persistence.

## Directional topology

The current generator owns signed cardinal elevation grades and derives a
stable `level`, `slope`, `ledge`, or `cliff` classification. It publishes
uphill, downhill, and cliff edges plus a low/mid/high band. The classification
is presentation-only in this contract; current traversal and combat rules are
unchanged.

Bridge overlays own their axis, cardinal connections, zero-based span index,
span length, `single`, `shore-*`, or `middle` role, and shore edges. The
first-party deck reaches the advertised tile edges. The renderer may bleed
transparent bridge art across a visual gutter, but the cell remains the sole
hit target and state owner.

Cardinal neighbor biome changes produce bounded `ground-transition` terrain
records. The bundled renderer reuses the neighboring ground material through
an edge mask; neither the transition nor its bitmap changes the effective
biome. Structures and POIs carry a bounded footprint plus passable approach
edges. When several adjacent tiles share one feature identity, the renderer
derives its local footprint part from those shared cardinal connections.

Generator V7 emits deterministic cover families with normalized anchors,
scale, and an explicit `decorative` or `mechanical` role. Decorative foliage
sets `mechanical: false`, `blocksMovement: false`, and `blocksSight: false`.
Mechanical obstacle presentation is permitted only when it mirrors an
existing authoritative barrier edge.

## Persistence

Save Schema remains **11**. Existing sparse tile deltas remain authoritative.
The additive `placedObjects` collection joins existing item, creature/remains,
recovery-bag, and resource-search fields; malformed or absent collections
normalize to empty. Reloading a sparse world record reconstructs the same
evidence records before a renderer sees the tile.

The snapshot itself is never saved. It is deterministically rebuilt from the
effective tile and current view state. This avoids stale presentation data in
old saves and keeps generator-version pinning intact.

## Tileset Pack V1 compatibility

Tileset Pack remains Version 1 with its five public slots: `base`, `route`,
`feature`, `marker`, and `presence`. No existing pack must migrate to load.
The V2 snapshot carries the same semantic keys through `compatibility`, and
the runtime resolves them through the active pack, then the bundled pack, then
the emoji fallback.

The first-party pack adds optional `cover-foliage` and `cover-obstacle` keys.
V1 packs may omit them; omission is a presentation fallback, not a validation
or gameplay failure. Until a future reviewed pack version adds a public cover
slot, core maps V2 cover art into V1's compatible `feature` slot.

The bundled runtime assigns every resolved V1 semantic key an internal V2
render rank (`ground`, `terrain`, `route`, `cover`, `feature`, `evidence`,
`presence`, or `state`). This establishes the eight-layer visual order without
invalidating V1 packs. Cover and evidence records may expand into several
independently positioned art layers while their V1 assets continue to use
compatible `feature`, `marker`, or `presence` slots.

First-party generation prompts, alpha extraction, deterministic atlas
post-processing, and asset paths are recorded in
[Tile Composition V2 Art Provenance](tile-composition-v2-art-provenance.md).

### Migration guidance for pack authors

1. Keep the current V1 manifest and semantic keys.
2. Make terrain base layers edge-compatible and avoid baking routes, POIs, or
   live occupants into them.
3. Make route and bridge layers transparent and extend connected geometry to
   the exact advertised edge.
4. Treat `cover-foliage` and `cover-obstacle` as optional transparent feature
   overlays.
5. Do not infer mechanics from image choice. A visual replacement receives
   the same normalized topology and cannot alter it.
6. Verify partial-pack behavior; a replacement is not required to implement
   every V2 presentation key.

## Renderer and accessibility requirements

- Mobile, desktop, Review Map, and interior cells consume the same snapshot.
- File-origin and hosted builds expose the same layers and fallback keys.
- Focus, labels, hit targets, current position, quest, danger, reachability,
  and blocked-state cues stay renderer-owned above decorative art.
- Transparent gutter bleed must not create new hit targets or horizontal page
  overflow.
- Emoji/Lightweight fallback remains operable if every bitmap fails.

## Acceptance gates

`npm run test:tile-composition` checks deterministic serialization, topology,
bounded evidence, V1 compatibility, and shared interior/overworld projection.

`npm run test:tile-composition-browser` runs both the single-file `file:` build
and hosted HTTP build at 313x670, 390x844, 412x915, and 1365x768. It checks all
three map surfaces, interiors, viewport containment, resource failures,
pixel-matched ground edges, transparent bridge/cover assets, bridge gutter
continuity, sparse evidence restoration, and absence of horizontal overflow.

The full core suite additionally proves sparse world-store round trips and
preserves existing traversal, generator, save, module, and interaction rules.

## Explicitly deferred mechanics

Terrain Tactics and Crafting do not begin under this contract. They require
separate reviewed gameplay facts, costs, persistence, narration, mod
authority, and acceptance coverage. Tile art and the V2 snapshot alone never
authorize those mechanics.
