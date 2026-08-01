# Media and Presentation Contracts

Executable modules and code-free asset bundles are separate packages:

- an executable `yaw-module` may declare `media:read` and consume only its own
  installed catalog;
- a `yaw-asset-bundle` targets that module and supplies reviewed, hashed media;
- Tileset Pack V1 and Sprite Pack V1 are inert presentation declarations
  inside an asset bundle.

No asset changes mechanics. Missing assets always fall back to existing
presentation.

## Reading Owned Media

Permission: `media:read`

```js
const resources = await MODS.media.list();
const descriptor = await MODS.media.metadata('portrait.hero');
const lease = await MODS.media.acquire('portrait.hero');

// Give lease.url to a documented presentation consumer.

MODS.media.release(lease.leaseId);
```

`list()` returns copied installed catalog records for this module.
`metadata(resourceId)` returns one copied record or `null`. A lease contains:

```text
{
  leaseId,
  url,
  resourceId,
  mimeType,
  byteLength,
  width,
  height,
  providerId
}
```

Leases are opaque, session-only, and owner-scoped. Never save a lease ID or
URL. Acquire once for an active presentation, cache the handle in module
memory, and release it when no longer needed. Module unload releases remaining
owned leases. `fallbackProviderId` is an advanced store-routing option; omit it
in normal mods.

The API deliberately has no arbitrary filesystem path, cross-owner catalog
read, raw IndexedDB access, or network hotlink.

## Asset Bundle V1

Asset bundles contain JSON and referenced bytes, never executable code.

```json
{
  "packageType": "yaw-asset-bundle",
  "packageVersion": 1,
  "bundle": {
    "id": "example.portraits",
    "targetModuleId": "example_module",
    "name": "Example Portraits",
    "version": "1.0.0",
    "description": "Optional presentation resources.",
    "author": "Example Author",
    "license": "CC-BY-4.0",
    "contentRating": "safe",
    "minGameVersion": "0.18.0",
    "minModuleVersion": "1.0.0",
    "provenance": {
      "homepage": "https://assets.example/"
    },
    "resources": [{
      "id": "portrait.hero",
      "uri": "./portrait-hero.webp",
      "hash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "mimeType": "image/webp",
      "byteLength": 24576,
      "width": 256,
      "height": 256,
      "role": "portrait",
      "license": "CC-BY-4.0",
      "provenance": {
        "artist": "Example Artist"
      }
    }]
  }
}
```

Required bundle fields are `id`, `targetModuleId`, `name`, semantic `version`,
`license`, and 1–256 `resources`. `contentRating` defaults to `safe` and may
not exceed the target module. `minGameVersion` and `minModuleVersion` are
optional compatibility floors.

Each resource requires:

- a stable token `id`;
- `uri` (`url` alias accepted);
- exact 64-character hexadecimal SHA-256 `hash` (`sha256` alias accepted);
- valid `mimeType`;
- exact positive `byteLength`;
- optional positive `width` and `height`, each at most 32,768;
- semantic token `role`;
- optional license/provenance;
- optional same-bundle fallback resource ID.

Limits and safety:

- manifest JSON at most 2 MiB;
- each resource at most 16 MiB;
- all declared resources at most 128 MiB;
- HTML, JavaScript, XHTML, and SVG MIME types reject;
- resource URLs are HTTPS, except HTTP loopback for development;
- no URL credentials, query, fragment, or redirects;
- each provenance object encodes to at most 4,096 characters;
- fallbacks cannot reference self, leave the bundle, or form cycles;
- up to 16 inert presentation declarations totaling at most 1 MiB encoded.

Relative resource URIs resolve against the reviewed manifest URI. Installation
fetches, bounds, signature-checks where supported, hashes, and stages every
resource before atomically replacing the target catalog. Runtime play uses the
local retained copy, never the source URI.

One target module has one current asset-bundle catalog. A new bundle replaces
it; it is not an overlay. The target module must be installed, declare
`media:read`, and be disabled during install, replacement, repair, or asset
removal.

## Sprite Pack V1

One `yaw-sprite-pack` presentation may appear in a bundle. Atlas resources use
role `sprite-atlas`.

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
    "species-moss_hare": {
      "label": "Moss Hare",
      "states": {
        "idle:any": {
          "atlasId": "main",
          "rect": { "x": 0, "y": 0, "width": 256, "height": 64 },
          "frameCount": 4,
          "durationMs": 720,
          "loop": true,
          "fit": "contain",
          "anchor": { "x": 0.5, "y": 0.5 }
        }
      }
    },
    "default": { "fallback": "species-moss_hare" }
  }
}
```

Limits:

- 1–16 PNG, JPEG, or WebP atlases, with dimensions declared in resources;
- 1–256 semantic sprites;
- at most 32 state/facing entries per sprite;
- native frame width and height 1–2,048;
- integer rectangles fully inside the atlas;
- 1–32 equal horizontal frames, with frame count exactly dividing rect width;
- duration 80–30,000 ms;
- scaling `smooth` or `pixelated`;
- fit `contain` or `cover`;
- anchor axes 0–1.

State keys are `<state>:<facing>`.

States: `idle`, `wounded`, `defeated`, `contained`, `ghost`.
Facings: `any`, `north`, `east`, `south`, `west`.

Resolution tries exact state/facing, state/any, idle/same-facing, then
`idle:any`. Reduced motion displays the first frame.

Semantic keys are tested in this order:

1. `species-<species-id>`;
2. active `ability-<ability-id>`;
3. `disposition-<disposition>`;
4. `flag-player` or `flag-ghost` when applicable;
5. `default`.

Fallbacks stay within the pack and cannot cycle. A missing match falls through
to older packs and the existing emoji. Artwork never changes hit boxes,
targeting, state, abilities, or saves.

## Audio Pack V1

One code-free `yaw-audio-pack` presentation may map semantic game events to
audio resources owned by the target module's installed asset bundle:

```json
{
  "type": "yaw-audio-pack",
  "version": 1,
  "id": "example.soundscape",
  "name": "Example Soundscape",
  "cues": {
    "encounter.start": {
      "resourceId": "audio.encounter.start",
      "volume": 0.7,
      "cooldownMs": 500
    },
    "combat.action": [
      { "resourceId": "audio.combat.hit.1", "volume": 0.6 },
      { "resourceId": "audio.combat.hit.2", "volume": 0.6 }
    ]
  }
}
```

A pack has 1–128 semantic events and at most eight variants per event. A cue
contains only `resourceId`, volume 0–1, and an optional cooldown of 0–60,000
milliseconds. Resources must use a supported packaged audio MIME type. Core
leases, selects, plays, and releases the resources; gameplay and modules never
receive the private lease URL through this contract.

Current core events include `encounter.start`, `encounter.victory`,
`encounter.defeat`, `encounter.flee`, `encounter.disengage`, and
`combat.action`. Missing cues are silent and never affect mechanics.

Audio Pack V1 contains no callbacks, microphones, speech recognition, prompts,
AI generation, streaming provider, or TTS channel. Those are intentionally
outside this phase.

## Tileset Pack V1

One `yaw-tileset-pack` presentation may appear in a bundle. Atlas resources use
role `tileset-atlas`.

```json
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
      "layers": [{
        "atlasId": "main",
        "rect": { "x": 0, "y": 0, "width": 128, "height": 128 },
        "slot": "base",
        "z": 0,
        "opacity": 1,
        "blend": "normal",
        "anchor": { "x": 0.5, "y": 0.5 },
        "transform": {
          "rotate": 0,
          "flipX": false,
          "flipY": false
        }
      }]
    }
  }
}
```

Limits:

- 1–16 PNG, JPEG, or WebP atlases with declared dimensions;
- 1–512 semantic tiles;
- 1–8 layers per tile, or a fallback-only alias;
- native tile width and height 1–2,048;
- integer rectangles fully inside the atlas.

Layer values:

| Field | Values |
| --- | --- |
| `slot` | `base`, `route`, `feature`, `marker`, `presence` |
| `z` | -100 through 100 |
| `opacity` | 0–1 |
| `blend` | `normal`, `multiply`, `screen` |
| `anchor.x`, `anchor.y` | 0–1 |
| `transform.rotate` | 0, 90, 180, 270 |
| `transform.flipX`, `flipY` | boolean |

Pack scaling is `smooth` or `pixelated`. Fallback aliases cannot cycle. A
partial pack inherits absent semantics from lower-priority enabled packs, the
built-in pack, then text/emoji. The complete semantic key inventory is in
`06-inventories.md`.

Tiles express presentation only. They cannot declare terrain identity,
traversal, blocked edges, roads, structures, encounters, danger, search,
placement, or save data.

## Providing Media

Permission: `media:provide`

This is a trusted-local infrastructure contract. Most game mods should use an
Asset Bundle V1 instead.

```js
MODS.registerMediaProvider('example-source', {
  capabilities() {
    return { source: true, store: false, lease: false };
  },
  async health() {
    return { ok: true };
  },
  async acquire(input, options) {
    // Return normalized descriptor plus verified bounded bytes/blob.
  }
});
```

Every adapter implements synchronous `capabilities()` and asynchronous
`health()`, and advertises at least one role:

- `source: true` requires `acquire(input, options)`;
- `store: true` requires `beginBatch`, `stage`, `commit`, `abort`, `has`,
  `stat`, `open`, `acquire`, `release`, and `remove`.

Optional methods are `estimate`, `cleanupStaging`, and `close`. A combined
adapter may implement source and store.

The repository still enforces bounded byte counts, declared MIME/dimensions,
signatures, SHA-256 identity, staged publication, explicit leases, and
sanitized errors. An adapter cannot replace a core/other-owner provider or read
another module's catalog. Disable/unload releases leases, unregisters roles,
then calls `close`.

Credentials must never enter module settings, manifest, catalog metadata,
saves, provenance, logs, or diagnostics. No adapter grants arbitrary
filesystem paths or unrestricted host APIs. Prefer the established endpoint
protocol when a sidecar is needed instead of inventing another transport.
