# Sprite Pack V1

Sprite Pack V1 is the code-free character and creature presentation contract
layered on Asset Bundle V1. Asset Bundle V1 owns review, download, hashes,
storage, ownership, and leases. Sprite Pack V1 describes bounded atlas strips
that core may render in unit cards, compact rails, combat presence, and stage
presence. It never changes species, stats, actions, hit boxes, targeting,
combat state, or saves.

## Package shape

Declare one `yaw-sprite-pack` presentation in an Asset Bundle V1 manifest.
Atlas resources use the `sprite-atlas` role:

```json
{
  "type": "yaw-sprite-pack",
  "version": 1,
  "id": "example.creatures",
  "name": "Example Creatures",
  "nativeFrameSize": { "width": 64, "height": 64 },
  "scaling": "pixelated",
  "atlases": [
    { "id": "main", "resourceId": "sprites.main", "density": 1 }
  ],
  "sprites": {
    "species-human": {
      "label": "Human",
      "states": {
        "idle:any": {
          "atlasId": "main",
          "rect": { "x": 0, "y": 0, "width": 256, "height": 64 },
          "frameCount": 4,
          "durationMs": 720,
          "loop": true,
          "fit": "contain",
          "anchor": { "x": 0.5, "y": 0.5 }
        },
        "wounded:west": {
          "atlasId": "main",
          "rect": { "x": 0, "y": 64, "width": 64, "height": 64 }
        }
      }
    },
    "default": { "fallback": "species-human" }
  }
}
```

A bundle may contain at most one Sprite Pack V1 declaration. Unknown
presentation types remain inert. The target module must already declare
`media:read`, and remains disabled while its bundle is installed or replaced.

## Semantic matching

Core derives a bounded ordered key list from deterministic unit state:

1. `species-<species-id>`;
2. active `ability-<ability-id>` keys;
3. `disposition-<disposition>`;
4. `default`.

Player and Ghost flags also expose `flag-player` and `flag-ghost`. A newer
enabled pack has priority, then its keys are evaluated in the order above.
Missing entries fall through to older enabled packs and finally the existing
emoji. Sprite fallbacks remain inside their owning pack and cannot cycle.

## States, facings, and strips

State keys use `<state>:<facing>`.

- states: `idle`, `wounded`, `defeated`, `contained`, `ghost`;
- facings: `any`, `north`, `east`, `south`, `west`.

Core derives the state from committed unit data. It first tries the exact state
and facing, then state with `any`, then idle with the same facing, then
`idle:any`. It does not infer gameplay effects from the artwork.

One state rectangle is either a static frame or a horizontal strip of 1–32
equal integer frames. `frameCount` must divide the rectangle width exactly.
Animated strips use a bounded duration from 80 to 30,000 ms. Reduced-motion
settings and the operating-system preference stop animation on the first
frame. Scaling is `smooth` or `pixelated`; fit is `contain` or `cover`.

## Limits and validation

- 1–16 PNG, JPEG, or WebP atlases with declared dimensions;
- 1–256 semantic sprites;
- at most 32 state/facing entries per sprite;
- native frame axes from 1–2,048 pixels;
- integer atlas rectangles that remain inside the resource;
- no SVG, CSS, shaders, scripts, callbacks, arbitrary transforms, or remote
  gameplay URLs.

Known malformed declarations reject during package review before any media is
downloaded.

## Lifecycle and fallback

Enabled modules acquire local Media Repository leases for their atlas
resources. Core renders only those session URLs and releases them on module
disable, replacement, or unload. The source URI is never hotlinked during
play. A missing pack, state, atlas, decode, or lease leaves the localized unit
name and existing emoji presentation intact, including downloaded `file://`
play.

Sprites are decorative and assistive-hidden. Unit names, roles, status,
selection, targetability, and command feedback remain semantic text. Pack and
semantic keys are exposed as diagnostic data attributes without changing
gameplay state.

## V1 non-goals

- no gameplay collision, movement, reach, targeting, or combat declarations;
- no equipment layering, recoloring, paper-doll composition, or procedural
  character generation;
- no audio, video, 3D, arbitrary CSS, or executable animation;
- no saved animation cursor or network fetch during ordinary play.

