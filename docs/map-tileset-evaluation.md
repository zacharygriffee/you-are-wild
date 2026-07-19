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
Beach cells additionally expose cardinal shoreline edges over a neutral sand
base, and danger-site influence is distinct from both its single anchor marker
and immediate creature danger.
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

## Interior Cohesion Follow-Up

The deterministic room graph and directional semantics are sound, but the
current default atlas treats corridor overlays like miniature complete rooms.
That makes adjacent cells read as disconnected floor plans, and wall/exit art
uses a different scale. The next interior presentation slice should establish
a continuous floor field, edge-to-edge reciprocal path joins, compatible wall
joins, and a restrained exit marker. This is an art/composition correction,
not a change to structure generation or traversal topology.

The code seam remains deliberately metadata-first: terrain and overlays decide
what exists, while the active presentation stack decides how it looks.
