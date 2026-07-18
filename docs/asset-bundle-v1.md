# Asset Bundle V1

Asset Bundle V1 is the code-free packaging and installation contract for
module-owned media. It lets a player review one JSON manifest from an HTTPS or
loopback URI, then download, verify, and retain its resources locally through
the Media Repository. It does not define tiles, sprite sheets, animation,
portraits, audio playback, or any other presentation format.

## Package Envelope

```json
{
  "packageType": "yaw-asset-bundle",
  "packageVersion": 1,
  "bundle": {
    "id": "example.portraits",
    "targetModuleId": "example-module",
    "name": "Example Portraits",
    "version": "1.0.0",
    "description": "Optional presentation resources.",
    "author": "Example Author",
    "license": "CC-BY-4.0",
    "contentRating": "safe",
    "minGameVersion": "0.11.1",
    "minModuleVersion": "1.0.0",
    "provenance": {
      "homepage": "https://assets.example/"
    },
    "resources": [
      {
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
        },
        "fallback": {
          "resourceId": "portrait.fallback"
        }
      },
      {
        "id": "portrait.fallback",
        "uri": "./portrait-fallback.png",
        "hash": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        "mimeType": "image/png",
        "byteLength": 8192,
        "width": 128,
        "height": 128,
        "role": "portrait"
      }
    ]
  }
}
```

`id`, `targetModuleId`, `name`, semantic `version`, `license`, and one or more
`resources` are required. `contentRating` defaults to `safe`. A resource must
declare a stable token ID, URI, SHA-256 hash, MIME type, and exact byte length.
`sha256` is accepted as an alias for `hash`, `url` as an alias for `uri`, and a
fallback may be either a resource ID string or `{ "resourceId": "..." }`.

Relative resource URIs resolve against the reviewed manifest URI. Resource
licenses inherit the bundle license when omitted. Bundle and resource
provenance are merged into the installed descriptor; the installer always
binds the authoritative bundle ID and version.

Roles are presentation-neutral token labels. A future portrait, tileset,
sprite, audio, or other consumer defines the roles and metadata it understands.
Unknown roles can remain installed without changing core gameplay state.

## Validation And Budgets

Review rejects a bundle before downloading any resource unless all metadata
passes these boundaries:

- one JSON manifest, at most 2 MiB encoded;
- 1 to 256 resources;
- at most 16 MiB per resource;
- at most 128 MiB declared across the bundle;
- exact 64-character hexadecimal SHA-256 per resource;
- valid MIME type, with HTML, JavaScript, XHTML, and SVG rejected;
- positive dimensions no greater than 32,768 when supplied;
- HTTPS resource URIs, except HTTP loopback for development;
- no URI credentials, query parameters, fragments, or redirects;
- at most 4,096 encoded characters for each provenance object;
- fallbacks must name another resource in the same bundle and cannot form
  self-references or cycles.

The bundle content rating cannot exceed its target module's rating. Optional
minimum game and target-module versions are checked before installation.

## Player Lifecycle

1. Install the target module. It must declare `media:read`.
2. Disable the target module before installing, replacing, repairing, or
   removing its assets. This releases active media leases.
3. In Mods, choose **Import from URI**, enter the manifest URI and optional
   SHA-256 pin, then choose **Review package**.
4. Review bundle identity, target, rating, roles, license, resource count,
   declared byte total, source, and manifest digest. Review runs no code and
   does not fetch the resources.
5. Confirm installation. Every resource is fetched without credentials or
   referrer data, bounded, MIME/signature checked where supported, size checked,
   SHA-256 verified, and staged.
6. Only after every resource verifies does the target module's catalog and
   bundle audit record replace the prior catalog. The module remains disabled
   until the player enables it.

One target module has one current Asset Bundle V1 catalog. Installing another
bundle for that module is an explicit replacement, not an overlay. Shared
content hashes are deduplicated and reference-counted. Unreferenced old
payloads are removed after a successful replacement. A failed download or
verification leaves the prior catalog active.

The module card shows the installed source, digest, license, roles, size, and a
local verification status. If catalog entries or payloads are missing, the
card marks the bundle as needing repair; reviewing and reinstalling its source
is the repair path. Explicit asset removal and target-module deletion remove
catalog ownership and delete payloads after their final reference is gone.

## Runtime Contract

Asset bundles contain no executable code and cannot enable themselves. The
target module consumes its own resources with the existing `MODS.media` API:

```js
const resources = await MODS.media.list();
const lease = await MODS.media.acquire('portrait.hero');
image.src = lease.url;

// Release when the presentation no longer needs it.
MODS.media.release(lease.leaseId);
```

Leases are session-scoped and must not be saved. The bundle source URI is audit
and explicit-repair metadata, never a gameplay hotlink. The downloaded
`file://` game remains playable without asset bundles or network access; URI
acquisition on file origin still depends on the endpoint's browser CORS policy.

## Deliberate V1 Non-Goals

- no archive extraction or executable module code;
- no automatic update polling, background repair, or publisher identity;
- no multiple bundle overlays for one module;
- no tileset, sprite-sheet, atlas, animation, audio, video, or 3D schema;
- no direct remote hotlinking during play;
- no dependency on AI generation, packaged-runtime bridges, or OPFS.

Presentation consumers are the next layer. They should resolve leases during
asynchronous activation, cache render-ready handles, preserve text/emoji or
local fallback presentation, and keep terrain and gameplay semantics separate
from the selected art.
