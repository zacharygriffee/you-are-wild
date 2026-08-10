# Tile Composition V2 Art Provenance

The initial three V2 first-party assets were generated with the built-in ChatGPT image
generation tool on 2026-08-04, reviewed locally, and post-processed with
Pillow. They use the repository's `owner-supplied-ai-generated` asset policy.

## Ground materials

Output: `media/terrain-materials-v2.png`

Prompt:

> Create a clean 3 by 3 orthographic texture atlas containing exactly nine
> equal square ground materials: grass meadow, leafy forest floor, dry pine
> forest floor; dark swamp mud, tropical jungle floor, pale beach sand; deep
> blue water, gray mountain rock, dark cave stone. Use polished hand-painted
> 2D game texture, perfectly top-down, diffuse light, restrained detail, no
> gutters, labels, objects, roads, bridges, trees, buildings, shadows, or
> perspective. Fill every cell and make opposite edges visually compatible.

Post-processing downsized the source to a 768x768 three-by-three atlas. Each
256px cell was mirrored from a 128px source quadrant so opposite edges match
pixel-for-pixel. The browser acceptance fixture verifies all nine pairs.

## Bridge spans

Output: `media/bridge-span-v2.png`

Prompt:

> Create one perfectly vertical top-down wooden footbridge from the exact top
> edge to the exact bottom edge of a square canvas, centered with constant
> width, weathered warm-brown planks and dark side beams. Use polished
> hand-painted 2D game art on a perfectly uniform #ff00ff chroma-key
> background. Include no water, ground, banks, rocks, labels, people, shadows,
> perspective, gutters, or frame. Make the top and bottom profiles match so
> consecutive copies join without a seam.

The chroma key was removed with the maintained imagegen helper. The reviewed
vertical source was downsized to 512px, rotated deterministically for the
horizontal variant, and packed into a 1024x512 two-cell transparent atlas.

## Foliage cover

Output: `media/foliage-cover-v2.png`

Prompt:

> Create one compact irregular top-down cluster of low shrubs, fern fronds,
> and small rocks as a reusable terrain-cover overlay. Use polished
> hand-painted dark-fantasy game art with diffuse light, centered with generous
> padding on a perfectly uniform #ff00ff chroma-key background. Include no
> ground plane, tree trunk, tall tree, flowers, road, bridge, building, text,
> creatures, shadows, frame, or watermark.

The chroma key was removed with the maintained imagegen helper and the result
was downsized to a 512px RGBA sprite. It is presented through optional
`cover-foliage` and `cover-obstacle` semantics while remaining compatible with
the Tileset Pack V1 feature slot.

## Generated-world overlay atlases

The generated-layer pass on 2026-08-05 added four reviewed chroma-key sources
under `art/tile-composition/` and four RGBA runtime atlases:

- `media/cover-overlays-v3.png` — 4x2 conifer, broadleaf, jungle, reeds,
  grass, drift, scrub, and rock cover families.
- `media/structure-overlays-v3.png` — 4x4 camp, hut, ruins, spring, shrine,
  farm, village, cave, web, cabin, pond, great-tree, burrow, nest, cave-mouth,
  and waystone sprites.
- `media/poi-overlays-v3.png` — 3x2 settlement, rest, danger, resource,
  landmark, and structure markers.
- `media/evidence-overlays-v3.png` — 4x2 item, provisions, remains, recovery
  bag, depletion, placed-object, trail-marker, and occupant-trace sprites.

Each prompt required an exact grid, isolated consistently scaled subjects, a
uniform `#ff00ff` background, no baked terrain or cast shadows, and no text or
watermark. The built-in ChatGPT image-generation workflow produced the source
PNGs. The maintained imagegen chroma-key helper removed the backgrounds with a
soft matte and despill. Browser acceptance verifies transparent atlas corners,
pack loading through file and hosted origins, and inherited ground beneath
generated POIs and structures.

## Terrain Art Quality Pass 1 overlays

The 2026-08-05 quality pass added two reviewed source images and two bounded
runtime atlases. Both were generated with the built-in ChatGPT image-generation
tool on a uniform `#ff00ff` chroma background. The maintained chroma-key helper
removed the background and despilled edges; Pillow then palette-quantized the
runtime PNGs without changing their dimensions or semantic crop rectangles.

### Directional terrain relief

Source: `art/tile-composition/terrain-relief-v1-source.png`

Runtime output: `media/terrain-relief-v1.png`

Prompt:

> Create a perfectly top-down hand-painted dark-fantasy terrain overlay sheet
> with three isolated columns: a rocky cliff face entering from the north edge,
> a lower eroded ledge entering from the north edge, and a gentler earthen slope
> entering from the north edge. Use transparent-ready silhouettes on a perfectly
> uniform #ff00ff background, generous separation, no ground plane, water,
> foliage, road, structure, text, frame, perspective, or cast shadow. Each form
> must meet the north edge cleanly and remain readable when rotated to every
> cardinal direction.

The 1995x788 runtime atlas is 161,601 bytes with SHA-256
`a722c1ad84a4a638447ab749dfa8e053169f6299e989c91c2d28a78afaccb40b`.
Manifest rotation maps the three authored north-facing crops to all twelve
`terrain-elevation-{slope|ledge|cliff}-{north|east|south|west}` semantics.

### Layered jungle identity

Source: `art/tile-composition/jungle-strata-v1-source.png`

Runtime output: `media/jungle-strata-v1.png`

Prompt:

> Create a perfectly top-down hand-painted dark-fantasy jungle overlay sheet
> with four isolated columns: dense upper canopy, tangled undergrowth, leaf
> litter and small floor debris, and a vine-and-frond strip entering from the
> north edge for adjacent-biome spill. Use transparent-ready silhouettes on a
> perfectly uniform #ff00ff background, consistent scale, generous separation,
> no baked ground, road, building, creature, text, frame, perspective, or cast
> shadow. Keep each stratum legible alone and composable with the others.

The 1774x887 runtime atlas is 266,504 bytes with SHA-256
`ed78657cf0f0c966c78d40f37db869a4dc903b61011e7168ad9ab18b3a72d785`.
Its crops resolve `cover-jungle-canopy`, `cover-jungle-undergrowth`,
`cover-jungle-litter`, and cardinally rotated `cover-jungle-spill` semantics.

Browser acceptance verifies transparent outer corners, bounded non-empty alpha,
exact atlas ownership for every new semantic, file and hosted loading, and
resolution on mobile, desktop, and Review Map surfaces. Static art alone grants
no elevation, cover, movement, resource, or persistence rule.

## Terrain Art Quality Pass 2 biome strata

Source: `art/tile-composition/biome-strata-v2-source.png`

Runtime output: `media/biome-strata-v2.png`

The built-in ChatGPT image-generation tool produced a five-column by two-row
chroma-key sheet. The top row contains grove, forest, plains, swamp, and cave
identity clusters. The bottom row contains matching north-edge spill strips.
The prompt required a strictly top-down hand-painted dark-fantasy style,
consistent scale, isolated subjects on uniform `#ff00ff`, and no baked routes,
structures, characters, text, shadows, or perspective. Each spill strip was
required to remain readable when rotated to every cardinal direction.

The maintained chroma-key helper removed the background with a soft matte and
despill. The reviewed 1983x793 source was cropped to a regular 1980x792 grid,
resampled to 1500x600, and palette-quantized to 128 colors without changing
semantic cell ownership. The 161,425-byte runtime atlas has SHA-256
`786672f78ddf2e89be4f9d5863ac87f5b8dece464494e3292630925cf19a6b45`.
The preserved source has SHA-256
`f6e18452308db4e4446bb4889e24510414476b9e839fa634e446a6bae27d4a30`.

The atlas owns `cover-{grove|forest|plains|swamp|cave}-identity` plus the
matching `cover-*-spill` semantics. Ordinary biome identity emits one bounded
decorative record for these biomes, while jungle remains the intentionally
denser three-stratum case. Soft adjacency can use the matching edge strip;
hard cave boundaries retain their existing topology policy and do not gain a
mechanic from the available cave-spill artwork.

Beach completes the same identity contract through `cover-beach-identity`, a
dedicated semantic key backed by the already-reviewed transparent drift cell
in `cover-overlays-v3-source.png`. Water adjacency remains exclusively owned
by the shoreline semantics, so this restrained shore detail does not restore
the removed repeating foam/scallop treatment and does not add another embedded
atlas.

## Terrain Art Quality Pass 3 contour policy

Pass 3 adds no generated image and no runtime atlas. It derives a bounded
five-sample contour from each canonical shared-edge key and uses that contour
to clip the existing biome or water material inside the bundled first-party
skin. The same deterministic inputs always produce the same contour; other
tileset packs are not clipped and may continue to supply authored edge and
corner artwork. Wider coordinate-derived transform signatures vary the
placement of existing transparent identity sprites, while the seamless ground
atlas remains untransformed so shared material edges stay pixel-compatible.

The Pass 3 correction also adds no generated image or runtime atlas. It
recomposes the existing material, relief, jungle, biome-strata, cover, and POI
media: zero-gap surfaces, bounded state/POI presentation, shallower
single-compositor edge polygons, deterministic secondary-family selection, and
a first-party-only night readability filter. Replacement packs keep their
authored current-state, POI, transition, and color-grading ownership.
