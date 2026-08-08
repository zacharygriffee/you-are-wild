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
and hidden from assistive technology while core provides a visible inspector,
a single bounded live description, and a semantic 3x3 neighborhood around the camera
cursor. Quest objective and turn-in focus commands center that same camera and
place one ephemeral labelled marker without moving the party or revealing
unknown terrain. This avoids creating an unbounded DOM button for every world
tile. Those callers use the renderer-neutral `App.focusMapTarget` service;
Canvas failure routes the same request to the established Map instead of making
quest code depend on a concrete renderer. The generic service is also ready for
future structure and POI callers, but those UI paths are not claimed here.

## Fixed chunks

- The renderer contract defaults to 16 by 16 authoritative world tiles. The
  first-party responsive surface uses 8 by 8 chunks so a local movement frame
  never recompiles a phone-sized 16-tile region.
- Each compiled scene includes a two-tile apron on every side.
- Terrain, routes, vegetation, and features may be drawn continuously through
  the apron. Only the canonical 16 by 16 interior is cached or displayed.
- Chunk coordinates use mathematical floor division, including negative world
  coordinates.
- Chunk scenes are deterministic JSON data and have stable revision-aware cache
  keys.
- The Canvas surface retains at most 96 off-screen chunk rasters by default;
  visible chunks are never evicted during their frame.
- Static terrain chunks never contain live party markers. Presence is a cheap
  display pass, so movement can reuse unchanged ground while actors move.
- World identity changes clear the cache. Bounded tile changes invalidate only
  intersecting chunks and their apron dependents; camera movement alone does
  not change the terrain revision.
- Sparse persistence bookkeeping is not itself a terrain revision. Merely
  materializing or marking a tile delta during traversal must preserve cached
  rasters; changes to known geography or the current tile's visible contents
  still invalidate the affected chunks.
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

Water and shoreline presentation is reconstructed as a deterministic,
world-aligned scalar raster over the chunk apron. Smooth deformation and an
interpolated threshold produce one curved coast across straight edges,
diagonals, and corners without a second shoreline stroke. This keeps beaches
continuous instead of exposing square per-tile shoreline steps. Terrain Scene also
compiles known corner elevations into a canonical world-coordinate vertex
field. Adjacent chunks therefore sample the same owner and height at every
shared vertex, while unknown-only vertices remain explicitly masked. Canvas2D
uses that field for restrained world-aligned hillshade, shared plateau fills,
and stronger contour lips, jagged rock faces, fractures, and low-side shadows
in cliff and cave terrain. Relief has a fixed-north presentation: south-facing
drops open toward the viewer, side faces remain narrow, and rear drops reduce
to a lip instead of making every contour resemble a road. Open and wooded biomes keep the lighter hillshade policy so
elevation does not bury their identity art. Cached chunks sample one pixel into
their identical aprons so fractional zoom cannot expose transparent borders.

Soft non-water biomes are not painted as tile-edge strips. A deterministic
multi-material ownership raster samples nearby authored tile centers in one
smoothly deformed world plane. It crosses tile interiors, resolves arbitrary
multi-biome corners in one pass, and yields identical samples inside adjacent
chunk aprons. Ecological priority gives lower surfaces a modest visual reach:
beach and sand yield to water but own their boundary against wetland and higher
ground; swamp owns open-ground boundaries; open ground owns wooded boundaries.
Numeric elevation breaks close ties. Distance remains dominant, so every
authored biome retains a readable core. This is renderer policy only and never
rewrites the biome or elevation stored in Terrain Scene.

First-party ground materials render as world-aligned two-by-two mirrored
fields. Both sides of every repeated edge therefore share the same source
pixels, including when the field is rebuilt in an adjacent fixed chunk. A
narrow feathered bridge remains as a compatibility fallback where Canvas
patterns are unavailable. The compatibility renderer also retains the older
edge-and-corner contour fallback for minimal Canvas implementations or missing
material atlases; the first-party path uses the continuous ownership field.
Local semantic labels retain text shadow but no longer paint separate per-cell
gradient panels over the field.

## Mobile performance policy

Canvas keeps semantic quality independent from device pixel ratio, while its
presentation cost is bounded. Continuous biome and water masks use local
numeric record grids and precomputed deterministic noise planes rather than
string-keyed lookups per sample. Repeated material fields are cached, uniform
chunks skip redundant masks and hillshade, and survey/mobile raster scale uses
a lower decorative-cover density without removing ground, routes, structures,
POIs, evidence, or actor semantics. Camera frames report cache hits, misses,
dynamic-presence count, and render time for acceptance tests.

The browser gate requires the mounted Canvas and its controls to survive local
movement, a warm in-chunk move to settle in under one second with cache hits and
no unchanged-terrain misses, and a legitimate tile-visual mutation to rebuild
its affected chunk while reusing unaffected chunks. It also keeps forty cached
Survey frames within the broader stress budget. Hosted and offline mobile
builds run the same checks. This is a regression ceiling, not a claim that every
physical phone will have identical timing.

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
mount, asset refresh, or later draw restores that renderer automatically.
Surface mutation and camera-input failures use the same boundary rather than
leaking an exception from a half-mounted renderer. Canvas controls, status, and
semantic survey descriptions resolve through the active content locale.
Canvas-owned inspector, status, control, and marker mutations are excluded from
the semantic observer, preventing redraw loops while ordinary game-state DOM
changes still invalidate the surface.

## Current verification gate

Run `npm run test:terrain-renderer` for deterministic scene, camera, input,
layer, negative-coordinate, chunk-crop, cache-bound, and adapter checks. Run
`npm run test:terrain-canvas-browser` for hosted and `file://` desktop/mobile
navigation, narrative-only blocked attempts, responsive remounting, focused
quest inspection and generic target-focus capability, localized survey
semantics, survey authority/privacy, four-biome corners, elevation, curved
shoreline fields, and road/bridge continuity at multiple device-pixel ratios
and chunk junctions, query opt-out, and renderer/surface-failure fallback.

Independent touch playthroughs must additionally cover repeated movement,
drag, pinch through Regional into Survey, survey inspection, Local recentering,
orientation changes, and console/page errors. Passing automation is not a
substitute for the aesthetic seam and legibility review that must precede a
default-renderer cutover.
