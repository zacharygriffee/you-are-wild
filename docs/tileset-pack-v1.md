# Tileset Pack V1

Tileset Pack V1 is the code-free map presentation contract layered on Asset
Bundle V1. Asset Bundle V1 remains responsible for review, download,
integrity, storage, ownership, and leases. Tileset Pack V1 gives a trusted host
renderer bounded instructions for turning those installed images into map
layers. It never changes terrain identity, traversal, structures, encounters,
or save data.

## Package Shape

A tileset is declared in the Asset Bundle V1 `bundle.presentations` array. A
bundle may contain at most one Tileset Pack V1 presentation, which keeps
activation precedence unambiguous. Its
atlas resources are ordinary bundle resources with the role
`tileset-atlas`:

```json
{
  "packageType": "yaw-asset-bundle",
  "packageVersion": 1,
  "bundle": {
    "id": "example.wilderness-art",
    "targetModuleId": "example_wilderness_art",
    "name": "Example Wilderness Art",
    "version": "1.0.0",
    "license": "CC-BY-4.0",
    "presentations": [
      {
        "type": "yaw-tileset-pack",
        "version": 1,
        "id": "example.wilderness",
        "name": "Example Wilderness",
        "nativeTileSize": { "width": 128, "height": 128 },
        "scaling": "smooth",
        "atlases": [
          { "id": "main", "resourceId": "tiles.main", "density": 1 }
        ],
        "tiles": {
          "terrain-forest": {
            "label": "Forest",
            "fallback": "terrain-grove",
            "layers": [
              {
                "atlasId": "main",
                "rect": { "x": 0, "y": 0, "width": 128, "height": 128 },
                "slot": "base",
                "z": 0,
                "opacity": 1,
                "blend": "normal",
                "anchor": { "x": 0.5, "y": 0.5 },
                "transform": { "rotate": 0, "flipX": false, "flipY": false }
              }
            ]
          }
        }
      }
    ],
    "resources": [
      {
        "id": "tiles.main",
        "uri": "./tiles-main.webp",
        "hash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "mimeType": "image/webp",
        "byteLength": 24576,
        "width": 1024,
        "height": 1024,
        "role": "tileset-atlas"
      }
    ]
  }
}
```

## Geometry And Layers

- `nativeTileSize` accepts a square integer or a `{ width, height }` object,
  with each axis between 1 and 2,048 pixels.
- Atlases must reference an image resource in the same bundle. PNG, JPEG, and
  WebP are accepted; declared resource width and height are required.
- Every rectangle uses integer pixels and must fit fully inside its atlas.
- A semantic tile has 1 to 8 layers, or may be an alias containing only a
  fallback. Slots are `base`, `route`, `feature`,
  `marker`, and `presence`; `z` from -100 to 100 establishes order.
- Rotation is restricted to 0, 90, 180, or 270 degrees. Horizontal and
  vertical flips are explicit booleans. Anchors and opacity range from 0 to 1.
- Scaling is `smooth` or `pixelated`. Blend modes are `normal`, `multiply`, or
  `screen`.
- A fallback may name another semantic tile in the pack. Cycles are rejected.
  Missing external semantic keys continue through the first-party tileset and
  finally the text/emoji fallback.

The host composes map semantics in this order: base terrain, route or bridge,
structure or POI, state markers, and party/current-position presence. Packs
only provide presentation for those semantic keys.

Directional topology is part of the semantic vocabulary rather than inferred
from bitmap appearance. Surface roads expose straight, corner, T-junction,
intersection, and north/east/south/west end keys. Interior room connections
expose the corresponding `interior-path-*` shapes. Surface exits, building
doors, adjacent walls, and blocked edges expose cardinal keys such as
`interior-exit-west`, `interior-door-west`, `interior-wall-south`, and
`state-blocked-north`. A rendered cell also exposes its ordered stack in
`data-tileset-semantic-keys`, with `data-blocked-edges` and
`data-interior-shape` available for diagnostics and authoring tests.
`data-interior-connections` carries the authoritative reciprocal passable
edges, `data-interior-adjacent` carries every room-facing edge on a blocked
boundary cell, and `data-interior-theme` distinguishes building, burrow, and
cave-network presentation. Core interior grids remove their overworld gutters
so edge-to-edge topology art composes as one plan; packs should draw route
layers through the indicated cell edges and treat exits as localized markers.
The first-party `yaw.default-basic-v1` skin currently composes building floors,
walls, doorway gaps, and exit thresholds from that metadata and suppresses its
own miniature path/door/exit atlas layers. Those layers are not removed from
the DOM or semantic stack, and the suppression is pack-scoped, so an authored
replacement pack can render them normally. Cave-network presentation remains
independent.

Coasts use a reusable `terrain-sand` base plus zero or more cardinal
`shoreline-water-north|east|south|west` semantics. Outer joins use
`shoreline-water-outer-ne|es|sw|wn`; diagonal-only contacts use matching
`shoreline-water-inner-*` keys. The generator derives edges only from
immediately adjacent water, while presentation derives corners from all eight
neighbors. A beach merely near water keeps neutral sand. `terrain-beach`
remains a separate identity semantic so a future desert can reuse sand
presentation without becoming a coast. Rendered cells expose
`data-shoreline-edges`, `data-shoreline-corners`, and an eight-bit
`data-shoreline-mask` ordered N, NE, E, SE, S, SW, W, NW.

The bundled pack's transition layers reuse its water atlas and are clipped by
pack-scoped alpha masks over `terrain-sand`. Replacement packs may provide
ordinary authored layers for any edge or corner semantic; core does not apply
the bundled masks to them.

Danger sites deliberately separate place from pressure. Only the deterministic
anchor tile receives `poi-danger-site`; its bounded surrounding footprint uses
`state-danger-influence`. `state-danger` is reserved for an immediate live
threat on the tile. This prevents a regional encounter modifier from painting
every affected cell as the same skull POI, while leaving each layer available
to partial mod packs.

Enabled pack candidates are ordered by activation time. For each semantic
key, the newest pack wins when it provides a renderable layer. A partial pack
inherits missing semantics from earlier enabled packs and finally the bundled
pack; a fallback alias can also resolve its target from a lower-priority pack.
If no pack resolves a key, the existing text/emoji presentation remains
visible. Disabling the newest pack restores the prior candidate without
changing world or save state.

## Safety And Lifecycle

Asset Bundle V1 bounds presentation metadata to 16 declarations and 1 MiB of
encoded JSON. Tileset Pack V1 additionally limits a pack to 16 atlases, 512
semantic tiles, and 8 layers per tile. Unknown presentation types remain inert.
Known malformed tileset declarations reject during package review, before any
resource is downloaded.

Runtime atlas URLs are Media Repository leases. They are acquired only for an
enabled target module, cached for that session, and released when the module
is disabled, replaced, or unloaded. Remote source URIs are never used as
gameplay hotlinks. If installation, activation, decoding, or lookup fails, the
map remains usable through the bundled or emoji presentation.

The first-party `yaw.default-basic-v1` pack uses two owned AI-generated PNGs.
`media/basic-tileset-v1.png` is a 1,774 by 887 opaque 8 by 4 terrain/feature
atlas. `media/basic-tileset-overlays-v1.png` is a 1,254 by 1,254 RGBA 4 by 4
route, interior-topology, exit, barrier, and state atlas. Deterministic integer
boundaries slice both sources. Keeping routes and markers transparent preserves
the actual swamp, jungle, beach, or other biome beneath them. The build embeds
both byte streams and prepares short session blob URLs asynchronously, so
bitmap decoding cannot block file-origin menu startup and the generated
single-file game retains the full layered presentation on `file://` without
runtime network access.
Desktop, mobile, large-map, and structure-interior cells all consume the same
semantic layer resolver.

The repository includes a real loopback/HTTPS authoring fixture at
`optional-mods/example-tileset-pack/`. It provides an installable target
module, an initial partial pack, and a replacement manifest. Browser regression
coverage reviews the manifest over HTTP, verifies and retains its atlas in
IndexedDB, activates only its provided semantics, inherits missing semantics,
reloads the replacement from local storage, and restores the bundled pack on
disable.

## V1 Non-Goals

- no gameplay or traversal declarations;
- no executable shaders, scripts, SVG, or arbitrary CSS;
- no sprite animation, character sprites, portraits, audio, video, or 3D;
- no fractional atlas rectangles or arbitrary rotation;
- no network fetch during ordinary play after installation.
