# Map Tileset Evaluation

This evaluates the proposed painted square tileset as a future replacement or augmentation for the current emoji map cells. Do not import or extract the image into the project until the source/license/ownership is confirmed.

## Current Fit

The sheet appears usable for a first pass over the current wilderness map:

- Core terrain: forest, grove/woods, plains, swamp, jungle, cliff/rock, cave/dark ground, water, beach/coast.
- Route overlays: straight roads, road corners, road intersections, horizontal bridge, vertical bridge.
- Structures/features: camp, spring/pond, cabin/hut, farm/garden, settlement, cave mouth, ruins/stonework, web, fog/unknown.
- Markers: generic focus/POI, alert/danger, gold/market, camp/rest, tower/landmark.

The implementation now exposes `data-tileset-key`, `data-base-tileset-key`, and `data-map-kind` on minimap and large-map cells so extracted tile assets can be attached later without changing map generation or gameplay state.

## Missing Or Deferred Tiles

Before using the sheet as the main map art, we likely need additional or clarified tiles for:

- Manor and other built-region biomes.
- Interior rooms, entrances, exits, walls, and doors.
- Road-water and road-coast transitions beyond simple bridge spans.
- River bends, shore curves, marsh edges, and rocky/coastal cliff edges.
- Road corners/intersections driven by actual route connectivity; current road generation only exposes east-west or north-south direction.
- POI-specific markers for quest, merchant, rest, danger, resource, structure, and settlement categories.
- Future special biomes such as snow, desert, lava, corrupted terrain, or modded environments.
- Asset-state variants for discovered, adjacent but undiscovered, hidden, current position, selected route, quest focus, and blocked terrain.

## Recommended Use

Use the sheet as an optional first art layer after licensing is confirmed:

1. Extract individual tiles into a generated/owned asset bundle.
2. Map each asset to the existing tileset keys in `App.MAP_TILESET_KEYS`.
3. Keep emoji/text fallback for accessibility, missing assets, and low-bandwidth builds.
4. Keep roads, bridges, structures, and POIs as overlays. Do not replace `baseBiome` or deterministic terrain identity with art choices.
5. Add visual tests after the actual image assets are present.

The current code seam is deliberately metadata-first: terrain and overlays still decide what exists, while CSS/assets can decide how it looks.
