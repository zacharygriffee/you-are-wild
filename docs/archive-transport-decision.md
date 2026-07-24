# Archive Transport Decision

Status: deferred transport option, with a bounded activation gate.

The maintained Tileset and Sprite bundles now prove that individual,
content-addressed URI resources are sufficient for current real packs. Review,
atomic staged installation, IndexedDB retention, local runtime leases,
replacement, reload, disable, and cleanup all work without an archive parser.
Adding ZIP support now would increase the offline artifact and create a second
untrusted byte-expansion boundary without solving a demonstrated player
problem.

## When to reopen

Archive Transport V1 should be designed only when a real distributable pack
demonstrates at least one of these needs:

- request-count or per-resource latency makes installation materially
  unreliable despite normal HTTP/2 or HTTP/3 hosting;
- authors need one portable file for offline handoff or backup;
- a target host can serve one reviewed file but cannot provide stable CORS for
  every referenced resource;
- operational evidence shows individual-resource atomic repair is inadequate.

Pack size alone is not sufficient: Asset Bundle V1 already permits bounded
large resources and reports cancellable progress.

## Required future boundary

An archive would be acquisition transport only. After extraction, the existing
Asset Bundle V1 manifest, resource descriptors, SHA-256 hashes, ownership, and
presentation contracts remain authoritative. It must not become a new module
format or runtime media source.

A future proposal must include all of these before implementation:

- one explicitly versioned archive envelope and one root manifest;
- compressed-download and independent unpacked-size limits;
- a bounded entry count, path length, filename length, and expansion ratio;
- normalized relative POSIX paths only;
- rejection of absolute paths, `..`, duplicate/case-colliding names, links,
  devices, encryption, nested archives, and executable MIME types;
- streaming or otherwise bounded extraction with cancellation;
- per-resource size, signature, and SHA-256 verification after extraction;
- one staged commit so failure or cancellation preserves the installed bundle;
- no runtime reads from the source archive and no network dependency after
  installation;
- the same HTTPS/loopback, credentialless, redirect-free, and `file://` CORS
  posture as current URI acquisition.

Publisher signatures and update discovery remain separate decisions. A signed
archive does not replace resource hashes, content policy, permissions, or
player review.

## Current distribution recommendation

Authors should publish:

1. one versioned `.yawmod.json` target module;
2. one versioned Asset Bundle V1 JSON manifest;
3. immutable resources at stable relative HTTPS paths;
4. optional published SHA-256 pins for the module and manifest.

Players review and install each package explicitly. The game copies media
locally, never hotlinks it during play, and continues to work without the
publisher after installation.
