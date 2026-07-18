# Media Repository And Provider Priority

The media repository is backend-neutral infrastructure for module-owned images,
sprites, audio, video, generated media, and future presentation packs. It does
not decide how tiles, portraits, animation, or other presentation should look.

## V1 Implementation Status

V1 is implemented in `app/src/core/media-*.js` and is initialized with the
module database. The database migration adds payload, staging, catalog, and
reference stores without changing game saves. Implemented providers are:

- `YAWIndexedDBMediaStore` for staged, content-addressed offline payloads and
  cached object-URL leases.
- `YAWHttpMediaSource` for bounded, credentialless HTTPS or loopback HTTP
  acquisition with required SHA-256, MIME, size, redirect, and signature checks.
- `YAWEndpointMediaStore` for an explicitly configured local or remote sidecar
  implementing the `yaw-media-endpoint-v1` protocol.

`YAWMediaRepository` owns provider routing, catalog replacement, cross-module
reference counts, repair checks, diagnostics, and lease cleanup. Module code
receives only its own normalized metadata and opaque leases through the
`media:read` API. [Asset Bundle V1](asset-bundle-v1.md) now supplies the first
code-free packaging/install layer above the repository; all rendering formats
remain downstream.

## Contract Layers

One `MediaRepository` facade coordinates three provider roles:

- **MediaSource** acquires or produces a bounded byte stream and normalized
  metadata.
- **MediaStore** stages, commits, opens, repairs, and removes durable payloads.
- **MediaLeaseProvider** gives presentation code a renderable URL or opaque
  handle with an explicit release lifecycle.

A provider may implement one or more roles. Callers use capabilities rather
than provider-specific APIs, filesystem paths, `Blob` assumptions, HTTP URLs,
or host-runtime globals.

Media identity is content-addressed by SHA-256. A small durable catalog records
resource-to-hash mappings, ownership and reference counts, MIME type, byte
length, dimensions when applicable, provenance, license, selected provider,
installation state, and fallback information independently from payload
storage.

## First Supported Providers

### Priority 1: IndexedDB

`YAWIndexedDBMediaStore` is the primary offline-first payload store and lease
provider. It supports staged `Blob` writes, integrity verification,
deduplication, reference-aware deletion, quota diagnostics, recovery of
abandoned staging, and cached session object URLs.

Rendering must never query IndexedDB per tile or frame. Pack or module
activation resolves required leases asynchronously once; active presentation
uses the cached leases synchronously and releases them during disable,
replacement, removal, or teardown.

### Priority 2: HTTP Endpoints And Sidecars

`HttpMediaSource` acquires explicitly reviewed HTTPS or permitted localhost
resources with bounded streaming, CORS, omitted credentials and referrer,
redirect/origin policy, MIME validation, and required integrity metadata.
Downloaded media normally flows into the selected durable store so gameplay
does not depend on a remote hotlink.

Endpoint-backed leases may later be selected explicitly for media intended to
stream rather than cache. That policy must disclose its online dependency and
must retain deterministic fallback behavior when the endpoint is unavailable.

A sidecar may implement Source, Store, and Lease roles through a capability-
advertising endpoint. The contract must cover health, pairing or session
authorization, content-addressed staged writes and reads, optional range
support, removal and reference semantics, origin/CORS behavior, and sanitized
diagnostics. Sidecars bind to an explicitly configured endpoint and never
expose arbitrary filesystem paths to modules.

IndexedDB and HTTP/sidecar providers are the first supported implementation
scope. Provider routing supports explicit selection plus an `auto` policy with
deterministic fallback. Module and media records remain provider-neutral so
payloads can migrate without changing their resource IDs.

The V1 sidecar routes are:

- `GET media/v1/health` returning schema `yaw-media-endpoint-v1` and capabilities
- `GET media/v1/estimate`
- `POST media/v1/batches`
- `PUT media/v1/batches/{batchId}/content/{sha256}`
- `POST media/v1/batches/{batchId}/commit`
- `DELETE media/v1/batches/{batchId}`
- `HEAD`, `GET`, and `DELETE media/v1/content/{sha256}`

Endpoint authorization values are session-only headers on the configured
adapter. They are not module settings, catalog metadata, or saved game data.

## Ordered Backlog

### Priority 3: AI-Generated Media Source

An AI media provider is a `MediaSource`, not a store. It accepts a bounded,
policy-reviewed generation request and returns candidate bytes plus generation
provenance. Output must pass the ordinary MIME, size, dimension, policy, and
integrity review before the selected `MediaStore` accepts it. Generated media
does not auto-install and never becomes authoritative gameplay state.

### Priority 4: Packaged Runtime Bridge

Electron, Pear, or another packaged host may expose Source, Store, or Lease
capabilities through a narrow host adapter. Modules do not receive filesystem
paths, platform globals, or unrestricted host APIs. The exact adapters remain
deferred until a packaged runtime is selected and its security model is
defined.

### Priority 5: OPFS

An OPFS store remains a possible browser-side optimization for larger payloads.
It is not part of the first supported scope and must not become a dependency of
the downloadable `file://` game. A future adapter should satisfy the same
provider contract and fall back cleanly when unavailable.

## Downstream Consumers

Asset Bundle V1 now consumes the repository as a presentation-neutral,
replaceable module resource catalog. Tilesets, sprites, portraits, UI skins,
audio, animation, video, and 3D media remain later consumers with their own
formats and presentation lifecycles. Storage providers and the bundle envelope
must not embed tileset-specific assumptions.
