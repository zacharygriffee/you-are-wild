# Map Tileset Evaluation

This records the evaluation that led to the first-party Tileset Pack V1 atlas.
The accepted sources are normalized as the opaque terrain atlas
`media/basic-tileset-v1.png` and transparent topology/state atlas
`media/basic-tileset-overlays-v1.png`, with project ownership/provenance
recorded in the asset manifest. Emoji and text remain the guaranteed fallback
rather than being removed.

## Current Fit

The sheet appears usable for a first pass over the current wilderness map:

- Core terrain: forest, grove/woods, plains, swamp, jungle, cliff/rock, cave/dark ground, water, beach/coast.
- Route overlays: straight roads, road corners, road intersections, horizontal bridge, vertical bridge.
- Structures/features: camp, spring/pond, cabin/hut, farm/garden, settlement, cave mouth, ruins/stonework, web, fog/unknown.
- Markers: generic focus/POI, alert/danger, gold/market, camp/rest, tower/landmark.

The implementation exposes `data-tileset-key`, `data-base-tileset-key`,
`data-tileset-semantic-keys`, `data-map-kind`, route shape, interior shape, and
blocked-edge metadata on mobile, desktop, interior, and large-map cells.
Beach cells additionally expose cardinal shoreline edges, inner/outer corner
joins, and an eight-neighbor water mask over a neutral sand base. Danger-site
influence is distinct from both its single anchor marker and immediate creature
danger. Terrain Transition V1 replaces the old crop of the atlas's baked
west-facing coast with a dedicated seamless sand material. The bundled skin
reuses its water texture through directional alpha masks and foam boundaries;
the mask CSS is scoped to the bundled pack so authored edge/corner art remains
unmodified.
Tileset Pack V1 consumes those semantics through bounded atlas rectangles and
local Media Repository leases. Route visuals infer straight, corner,
T-junction, intersection, and cardinal dead-end keys from authoritative
connections. Interior visuals derive matching path shapes, outward exits,
building doors, adjacent walls, and blocked edges from deterministic room
graphs.

Traversal Surface Geometry V1 removed the variable-track blocker. Mobile and
desktop local maps use equal square 3x3 cells, while desktop narration and
location context live in a sibling focus panel. The renderer and schema are
now active; remaining work is art-direction playtesting and additional future
presentation contracts, not foundational map layout.

## Missing Or Deferred Tiles

Before using the sheet as the main map art, we likely need additional or clarified tiles for:

- Manor and other built-region biomes.
- Road-water and road-coast transitions beyond simple bridge spans.
- River bends, marsh edges, and rocky/coastal cliff edges. Cardinal beach-water
  edges now compose in core; authored corner foam and irregular shore curves
  remain art-pack opportunities.
- Bridge art beyond the current horizontal/vertical span variants.
- POI-specific markers for quest, merchant, rest, danger, resource, structure, and settlement categories.
- Future special biomes such as snow, desert, lava, corrupted terrain, or modded environments.
- Asset-state variants for discovered, adjacent but undiscovered, hidden, and selected-route presentation. Current position, quest, danger, and directional blocked edges are now layered.

## Implemented Use

The accepted sheet is used through these boundaries:

1. `AssetManifest.bundledTilesetPack()` maps deterministic integer atlas
   rectangles to existing semantic keys.
2. Straight roads, corners, T-junctions, intersections, cardinal ends,
   bridges, topology-aware interiors, exits, doors, walls, and state markers
   reuse transparent atlas cells through right-angle transforms and aliases.
3. Roads, bridges, structures, and POIs remain layers over base terrain; art
   never replaces `baseBiome`, traversal, or deterministic state.
4. Missing mod semantics inherit prior enabled packs and the bundled pack,
   then retain emoji/text fallback.
5. URI-installed packs use the same renderer only after review, local
   retention, target-module enable, and atlas lease acquisition. Gameplay does
   not hotlink the package source.
6. The generated single-file build embeds both accepted atlases and creates a
   session blob URL for each, retaining offline `file://` support.
7. The example pack under `optional-mods/example-tileset-pack/` proves partial
   URI override, fallback, replacement, persistence, and restoration without
   hotlinking its source during play.

## Interior Cohesion

The deterministic room graph remains the gameplay authority. Interior mode
now removes the overworld card gutters so reciprocal corridor overlays meet at
their shared cell edges on mobile and desktop. Missing-room cells use a
shadowed boundary field rather than a freestanding cliff tile, compose every
adjacent directional wall semantic, and expose `data-interior-adjacent`.
Passable cells expose their authoritative edges in
`data-interior-connections`, while `data-interior-theme` keeps buildings and
cave networks available to different art treatments. Interior Skin V1 hides
the bundled miniature corridor, hut, and exit atlas cells for building rooms.
It paints a restrained masonry floor, perimeter walls with reciprocal doorway
gaps, and an outward threshold at the structure exit. This override is scoped
to the bundled pack: replacement packs still receive and may render every
path, door, exit, wall, marker, and presence semantic. Cave networks retain
their organic atlas treatment rather than inheriting building masonry.

This remains an art/composition correction, not a change to structure
generation, traversal topology, deterministic saves, or mod ownership. A
future authored atlas can replace the default room grammar without changing
these semantics.

The code seam remains deliberately metadata-first: terrain and overlays decide
what exists, while the active presentation stack decides how it looks.
