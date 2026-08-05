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
