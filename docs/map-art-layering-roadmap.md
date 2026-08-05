# Layered Map Art Roadmap

This is the approved post-stabilization direction for the 3x3 traversal map,
large map, and compatible replacement tilesets. It records product intent and
acceptance order; it does not authorize gameplay-contract changes during the
0.18.3 stabilization pass.

## Existing foundation

The map has a layered runtime, but the original Phase A showcase overstated
ordinary-world coverage. Tileset Pack V1 supports ordered `base`,
`route`, `feature`, `marker`, and `presence` slots with bounded z-order,
transforms, opacity, blending, partial-pack fallback, and shared resolution
across desktop, mobile, large-map, and interior cells. Roads, bridges,
shorelines, POIs, barriers, and state markers already resolve as semantic
layers instead of changing the underlying terrain identity.

Tile Composition V2 now supplies the common vocabulary. The first-party pack
uses pixel-edge-matched ground materials, simulation-directed elevation
shading, a full-span transparent bridge atlas, and transparent cover,
structure, POI, evidence, and presence atlases.
Dropped items, remains, recovery bags, resource depletion, and placed objects
project as bounded evidence and survive sparse world storage. Generator V7
now authors deterministic biome cover instead of relying on a handcrafted
fixture. Decorative cover explicitly carries no mechanic; obstacle art may
only mirror an existing authoritative barrier.

## Target semantic stack

Every rendered tile should be explainable as an ordered composition. Bitmap
appearance must never become the source of gameplay truth.

1. **Ground** — grass, dirt, sand, stone, water, floor, or another continuous
   material.
2. **Terrain transition and elevation** — shoreline masks, slope direction,
   ledges, cliff faces, banks, or height transitions derived from authored or
   deterministic topology.
3. **Route** — roads, paths, bridge decks, thresholds, and crossings. Route
   art reaches the exact edge and centerline advertised by its topology.
4. **Ground cover and obstacle** — trees, brush, rocks, reeds, mushrooms, and
   other reusable foliage or blockers above ground and routes where intended.
5. **Feature and resource** — structures, landmarks, harvestable nodes, and
   authored points of interest.
6. **Durable world evidence** — dropped items, remains, depleted or altered
   resources, placed objects, and other saved tile consequences.
7. **Presence** — party, creatures, and other live occupants, rendered without
   erasing durable evidence beneath them.
8. **State and interaction** — current position, quest, danger, selection,
   reachability, blocked edges, and accessibility/focus affordances.

This ordering is presentation doctrine, not a requirement that every cell
uses eight images. A tileset may collapse visually compatible layers while
the runtime retains their separate semantics.

## Phase A — topology and visual acceptance (complete)

The internal snapshot decision and first deterministic mixed-stack fixture are
recorded in [Tile Composition V2 — Phase A Decision](tile-composition-v2-decision.md).
Tileset Pack V1 remains the public compatibility contract during this phase.

- Ratify a focused Tile Composition V2 decision before changing public pack
  vocabulary. Define one bounded serializable map-scene snapshot and keep the
  existing flat tile and Tileset Pack V1 surfaces as compatibility adapters.
- Inventory the combinations actually emitted by the generator, tile deltas,
  structures, resources, items, remains, and encounter state.
- Add deterministic review fixtures for representative ground, road, bridge,
  shoreline, cliff, structure, resource, item, remains, and mixed stacks.
- Capture the same semantic cells at 313x670, 390x844, 412x915, and desktop
  widths, plus large-map and file-origin builds.
- Define measurable continuity rules before replacing art: shared centerline,
  exact cell-edge contact, no transparent inset on a connected route, and no
  layer that silently changes traversal identity.

## Phase B — cliffs, mountains, and bridges (complete for V2 contract)

- Introduce cardinal and corner slope or ledge semantics based on real
  signed neighbor elevation/topology data. Do not discard uphill/downhill
  direction or infer slope direction from the bitmap.
- Distinguish high ground, climbable slope, and blocking cliff only after
  traversal semantics author those facts; visual direction alone grants no
  movement rule.
- Replace bridge pieces with full-bleed topology art whose deck and rails meet
  adjacent bridge or road pieces without gaps, margins, or doubled seams.
- Separate the continuous art plane from inset focus, border, and hit-target
  affordances. Overworld cell gutters and rounded clipping must not cut a
  connected bridge or route even when controls remain visually distinct.
- Give a bridge span stable end, middle, and shore-transition semantics instead
  of exposing only a repeated horizontal or vertical axis piece.
- Verify straight, end, and shore-transition cases in both axes and across all
  supported render sizes.

## Phase C — compositional first-party terrain (generated baseline complete)

- Split grass, dirt, sand, stone, and water into reusable ground materials.
- Move trees, brush, rocks, reeds, and other cover into transparent obstacle or
  foliage sprites.
- Preserve the route below compatible foliage while keeping truly blocking
  obstacles visibly and mechanically distinct.
- Allow seeded visual variation only through bounded presentation choices;
  the same seed and tile state must remain reproducible.
- Keep partial third-party tilesets viable through semantic fallback rather
  than requiring an all-or-nothing atlas replacement.

The completion claim applies to the generated baseline, not to final art
variety. Cover families are generated in ordinary worlds, neighboring biomes
produce material transition layers, and old opaque structure/POI crops have
been replaced. Additional seasonal, regional, and damaged variants remain
content expansion rather than prerequisites for the layer contract.

## Phase D — persistent tile evidence (complete baseline)

- Project existing saved ground items, remains, resource depletion, placed
  objects, and relevant tile deltas into bounded semantic overlays.
- Keep persistence in the world/tile-delta model. The renderer consumes a
  snapshot and never owns inventory, remains, resource, or save authority.
- Cap and summarize crowded evidence so a tile remains readable and operable.
  Details stay available through the established presence and Holdings views.
- Ensure save/reload, leave/return, desktop/mobile, large-map, and hosted/file
  builds agree on the visible durable state.

## Phase E — future render adapters

Keep the semantic stack independent from CSS and atlas coordinates. A future
2.5D or 3D presentation mod should be able to map the same ground, elevation,
route, obstacle, feature, evidence, presence, and state records to meshes or
scene nodes without gaining simulation, arbitrary callback, or save ownership.

The serializable map-scene snapshot should provide normalized local anchors,
footprints, elevation, connections, and declarative asset references while
core continues to own controls, hit testing, accessibility, deterministic
state, and topology.

That future adapter requires a separate reviewed presentation contract. It is
not added by widening Tileset Pack V1 with executable rendering code.

## Mechanics enabled after art semantics stabilize

### Terrain Tactics V1

Terrain tactics may consume explicit facts such as elevation, cover, footing,
water depth, climbability, route access, and obstacles. Mechanical rules remain
owned by deterministic terrain definitions and combat/traversal resolvers;
art packs only represent them.

### Crafting V1

Crafting may consume explicit resource nodes, depletion, replenishment policy,
placed stations, inputs, outputs, ownership, and item sinks. Harvested or
placed changes must persist through tile deltas before crafting relies on them.
Foliage artwork alone never implies a harvestable resource.

## Acceptance boundary

- Visual-only phases do not change Save Schema 11 or Module API 1.
- The 3x3 map, large map, desktop/mobile views, Lightweight fallback, Textured
  build, and partial third-party packs receive the same ordered semantics.
- Connected bridges and routes meet exact shared edges at every tested size.
- Directional slope labels and graphics agree with authored topology.
- Ground, route, foliage, feature, evidence, presence, and state can coexist
  without hiding required movement, target, danger, or accessibility cues.
- Missing or failed art falls back without changing movement, encounters,
  resources, inventory, combat, or saves.
- Terrain tactics and crafting start only after their gameplay facts and
  persistence rules are separately accepted.
