# Map Tileset Evaluation

This evaluates the proposed painted square tileset as a future replacement or augmentation for the current emoji map cells. Do not import or extract the image into the project until the source/license/ownership is confirmed.

## Current Fit

The sheet appears usable for a first pass over the current wilderness map:

- Core terrain: forest, grove/woods, plains, swamp, jungle, cliff/rock, cave/dark ground, water, beach/coast.
- Route overlays: straight roads, road corners, road intersections, horizontal bridge, vertical bridge.
- Structures/features: camp, spring/pond, cabin/hut, farm/garden, settlement, cave mouth, ruins/stonework, web, fog/unknown.
- Markers: generic focus/POI, alert/danger, gold/market, camp/rest, tower/landmark.

The implementation now exposes `data-tileset-key`, `data-base-tileset-key`, `data-map-kind`, and route shape metadata on minimap, interior minimap, and large-map cells so extracted tile assets can be attached later without changing map generation or gameplay state. Route visuals infer straight, corner, T-junction, intersection, and dead-end keys from known/visible neighboring route tiles. Interior visuals expose room, cave-room, exit, wall, and structure-feature keys.

Traversal Surface Geometry V1 also removes the variable-track blocker. Mobile and desktop local maps now use equal square 3x3 cells. Desktop keeps narration and location context in a sibling focus panel, so the visual current-location cell has the same geometry as every neighbor; combat still expands into the full presentation stage. The next blocker is rendering/schema work rather than layout geometry.

## Missing Or Deferred Tiles

Before using the sheet as the main map art, we likely need additional or clarified tiles for:

- Manor and other built-region biomes.
- Door/opening variants beyond the first interior room, cave-room, exit, wall, and structure-feature metadata keys.
- Road-water and road-coast transitions beyond simple bridge spans.
- River bends, shore curves, marsh edges, and rocky/coastal cliff edges.
- Direction-specific bridge span variants beyond the current horizontal/vertical bridge keys.
- POI-specific markers for quest, merchant, rest, danger, resource, structure, and settlement categories.
- Future special biomes such as snow, desert, lava, corrupted terrain, or modded environments.
- Asset-state variants for discovered, adjacent but undiscovered, hidden, current position, selected route, quest focus, and blocked terrain.

## Recommended Use

Use the sheet as an optional first art layer after licensing is confirmed:

1. Extract individual tiles into a generated/owned asset bundle.
2. Map each asset to the existing tileset keys in `App.MAP_TILESET_KEYS`.
3. Include route variants for straight roads, corners, T-junctions, intersections, dead ends, bridge directions, and interior room/exit/wall variants.
4. Keep emoji/text fallback for accessibility, missing assets, and low-bandwidth builds.
5. Keep roads, bridges, structures, and POIs as overlays. Do not replace `baseBiome` or deterministic terrain identity with art choices.
6. Define integer atlas rectangles, rotation/flip behavior, layer order, and pixelated-versus-smooth scaling in Tileset Pack V1.
7. Reconcile route-shape names with manifest keys before activating bitmap lookup, then add visual tests after the actual image assets are present.

The current code seam is deliberately metadata-first: terrain and overlays still decide what exists, while CSS/assets can decide how it looks.
