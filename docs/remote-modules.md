# Remote Module Import

The Mod Manager supports explicit, player-initiated package import from a URI.
This is a transport and provenance feature for the existing trusted-local
module lane. It is not a sandbox, marketplace, hotlink system, or automatic
updater.

## Player Flow

1. Open **Mods** and choose **Import from URI**.
2. Enter an HTTPS package URI. HTTP is accepted only for `localhost`, `127/8`,
   or `::1` development servers.
3. Optionally enter a known SHA-256 digest as 64 hexadecimal characters or an
   SRI-style `sha256-...` value.
4. Choose **Review package**. No code executes during review.
5. Review the module identity, version, description, content rating,
   permissions, dependencies, size, and computed digest.
6. Confirm installation. The package is copied into IndexedDB and remains
   disabled until the player explicitly enables it.

Installed URI modules expose their source and recorded digest in the Mod
Manager. **Review source** performs a new user-initiated download and review;
it never updates the stored module on its own. Removing the module uses the
ordinary module deletion path and removes its owned asset metadata and settings.

## Acquisition Boundary

Remote acquisition:

- omits credentials and referrer data;
- rejects credentials, query parameters, and fragments in the package URI;
- rejects redirects and a changed response URI;
- requires browser CORS permission for cross-origin packages;
- disables HTTP cache reuse for the review request;
- uses a 15-second timeout and a 2 MiB encoded package limit;
- accepts JSON, JSON-like text, plain text, or octet-stream responses;
- requires valid UTF-8 and JSON;
- computes SHA-256 before parsing or installation;
- verifies an optional player-supplied digest;
- runs the normal package envelope, manifest, syntax, asset-metadata,
  permission, dependency, content-rating, and game-version validators.

The computed digest is always stored for audit and future comparison. A digest
shown as **pin verified** means the player supplied an expected digest and it
matched. A digest recorded without a supplied pin proves the bytes installed
but does not independently establish who authored them.

## Storage And Runtime

The response body is held only for the review step. Confirmed installation
uses the same atomic `modules` and `assets` IndexedDB transaction as file and
host packages. Runtime enablement reads that stored package; it does not fetch
the source URI. Updates are explicit replacements and leave the replacement
disabled.

URI-installed modules use `remote` provenance. A game host may disable player
modules, including URI-installed modules, through the existing host policy.
They remain player-removable when the host permits them.

Module code still uses the `trusted-local` boundary and executes in the game
page. The review warning is therefore a trust decision, not a security sandbox.

## Asset-Pack Extension Seam

Current version-1 packages may include the existing bounded JSON-style
`assets` metadata object. They cannot hotlink arbitrary runtime media through
this importer.

Future asset packs should extend this acquisition contract rather than create
a parallel downloader. An archive or multi-resource format will need explicit
encoded and unpacked byte budgets, path traversal protection, per-resource
digests, media-type checks, atomic blob storage, licensing/provenance metadata,
fallback assets, capability declarations, and cleanup quotas. Until that
format is designed, URI import intentionally handles one JSON module package
only.
