# Terrain Rendering V1 — Clean Architecture Decision

Terrain Rendering V1 starts from simulation-owned world tiles. It is not an
adaptation of the existing DOM/CSS tile compositor. Tile Composition V2 and
Tileset Pack V1 remain compatibility and comparison surfaces while this new
lane proves itself.

## Authority boundary

Core owns world generation, tile deltas, saves, traversal, discovery, input,
hit testing, labels, focus, and accessibility. A terrain renderer receives a
bounded serializable scene and a drawing target. It does not receive the App
object, callbacks, stores, credentials, or permission to infer mechanics from
pixels.

The data flow is:

`world tile resolver -> Terrain Scene V1 -> renderer adapter -> pixels`

DOM controls remain a transparent semantic and interaction plane above those
pixels. Losing or replacing a renderer must never make the map inoperable.

## One canvas, two familiar views

The local 3x3 view and the broader Map are camera presets over the same chunked
world canvas. Local mode fits roughly three tiles across the limiting axis.
Pinch, wheel, keyboard, or explicit Map controls may zoom continuously into a
regional or survey scale without switching terrain implementations. Panning
and zooming do not move the party.

The camera contract is renderer-neutral and provides world/screen transforms,
visible tile bounds, visible chunk enumeration, anchored pinch zoom, panning,
and local/survey presets. Renderer adapters consume the resulting camera state;
they do not own navigation or reveal undiscovered simulation facts.

The Canvas surface rasterizes apron-expanded chunks into private buffers, crops
only each chunk's canonical interior, and places those interiors on one display
canvas through the camera transform. Local and survey views therefore share
the same scene compiler, chunk cache, renderer adapter, and world-to-screen
math rather than attempting to keep a separate Review Map compositor aligned.

At close scale, the existing semantic DOM controls remain aligned above the
visible neighboring cells. At survey scale, those local controls become inert
and hidden from assistive technology while core provides a bounded live
description for the inspected camera coordinate. This avoids creating an
unbounded DOM button for every world tile.

## Fixed chunks

- The default chunk is 16 by 16 authoritative world tiles.
- Each compiled scene includes a two-tile apron on every side.
- Terrain, routes, vegetation, and features may be drawn continuously through
  the apron. Only the canonical 16 by 16 interior is cached or displayed.
- Chunk coordinates use mathematical floor division, including negative world
  coordinates.
- Chunk scenes are deterministic JSON data and have stable revision-aware cache
  keys.
- The Canvas surface retains at most 96 off-screen chunk rasters by default;
  visible chunks are never evicted during their frame.
- Fixed chunks are the render, cache, invalidation, and visual-test unit. They
  are not new save entities.

A future quadtree may index chunks, POIs, structures, or visible instances for
large-map culling and level of detail. It must remain an ephemeral index rather
than authoritative world state or a rendering boundary.

## Renderer adapter contract

Adapters register an id, API version, engine label, capabilities, and a factory.
An instance must provide `render(scene)` and `destroy()`. Canvas2D is the first
adapter. PixiJS, BabylonJS, WebGPU, or mod-supplied trusted-local adapters can
implement the same contract later without changing saves or simulation rules.

Terrain Scene V1 contains semantic layers for ground, hydrology, elevation,
routes, cover, features, durable evidence, and live presence. Canvas2D paints
each of those layers in that order, including player and party presence on the
current known tile. Its first-party art adapter may consume bundled or
renderer-supplied material, vegetation, bridge, structure, POI, and evidence
atlases. Atlas identities and rectangles remain renderer policy: Terrain Scene
does not contain CSS classes, tileset keys, atlas rectangles, HTML, or
executable rendering instructions.

The Canvas adapter owns deterministic organic biome contours, continuous
material paint, cover placement that may extend through the chunk apron,
narrow route scale, bridge continuity, and procedural fallbacks for missing
assets. Loading or replacing artwork cannot reveal terrain, change traversal,
or mutate the scene.

Water and shoreline presentation is reconstructed as a deterministic scalar
field across neighboring tile centers. This keeps beaches continuous through
corners instead of exposing square per-tile shoreline steps. Elevation remains
semantic scene data, but Canvas does not apply a rectangular tint per sample;
cliffs and future continuous-relief renderers may consume it without revealing
tile ownership. Cached chunks sample one pixel into their identical aprons so
fractional zoom cannot expose transparent borders.

Non-water shared contours have one ecological owner independent of traversal
direction or paint order: beach and sand yield to water but own their boundary
against wetland and higher ground; swamp owns open-ground boundaries; open
ground owns wooded boundaries. Numeric elevation breaks ties inside the same
surface family. This is renderer policy only and never rewrites the biome or
elevation stored in Terrain Scene.

First-party ground materials render as world-aligned two-by-two mirrored
fields. Both sides of every repeated edge therefore share the same source
pixels, including when the field is rebuilt in an adjacent fixed chunk. A
narrow feathered bridge remains as a compatibility fallback where Canvas
patterns are unavailable. Every non-water four-tile junction also receives one
deterministic organic corner cap from the same ecological owner used by its
edges, so independent horizontal and vertical contours cannot leave an L,
square notch, or competing corner paint. Local semantic labels retain text
shadow but no longer paint separate per-cell gradient panels over the field.

## First implementation boundary

The Canvas2D backend was built independently from the DOM/CSS compositor. It
first proved continuous chunk rendering, cropping, caching, negative-coordinate
behavior, and engine replacement with procedural marks, then added a distinct
renderer-owned art pass. It reuses first-party media assets, but does not carry
forward the previous per-cell CSS composition algorithm or make its seam rules
part of the scene contract.

The Canvas default cutover required all of these acceptance gates:

1. Desktop, mobile, Review Map, hosted, and `file://` operation.
2. Keyboard, pointer, focus, label, and screen-reader parity through the DOM
   interaction plane.
3. Seam inspection at fractional zoom and supported device-pixel ratios.
4. Deterministic chunk rebuild and visual regression checks.
5. Failure fallback with no movement or save-state impact.

After passing the automated and independent acceptance gates, Canvas V1 is the
default overworld terrain renderer. Wheel or pinch zooms around the gesture
anchor, two-finger or survey drag pans, and 3x3/Survey controls select the
three-tile or broader camera preset. The ordinary Map command opens this same
survey camera, and Survey exposes an explicit Center recovery control.

`terrainRenderer=canvas-v1` remains an explicit selection for diagnostics.
`terrainRenderer=legacy` is the rollback switch and returns to the established
renderer without migrating saves or world state. Emoji graphics mode also
keeps the established presentation. A failed Canvas context or transactional
mount restores that renderer automatically.

## Current verification gate

Run `npm run test:terrain-renderer` for deterministic scene, camera, input,
layer, negative-coordinate, chunk-crop, cache-bound, and adapter checks. Run
`npm run test:terrain-canvas-browser` for hosted and `file://` desktop/mobile
navigation, narrative-only blocked attempts, responsive remounting, survey
authority/privacy, query opt-out, and renderer-failure fallback.

Independent touch playthroughs must additionally cover repeated movement,
drag, pinch through Regional into Survey, survey inspection, Local recentering,
orientation changes, and console/page errors. Passing automation is not a
substitute for the aesthetic seam and legibility review that must precede a
default-renderer cutover.
