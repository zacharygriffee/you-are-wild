# Remote Module Import

This focused transport contract is subordinate to `docs/modding.md`. URI import
does not add capabilities beyond those accepted by the canonical module runtime.

The Mod Manager supports explicit, player-initiated package import from a URI.
It auto-detects trusted-local module packages and code-free Asset Bundle V1
manifests. This is a transport and provenance feature, not a sandbox,
marketplace, hotlink system, or automatic updater.

## Player Flow

1. Open **Mods** and choose **Import from URI**.
2. Enter an HTTPS package URI. HTTP is accepted only for `localhost`, `127/8`,
   or `::1` development servers.
3. Optionally enter a known SHA-256 digest as 64 hexadecimal characters or an
   SRI-style `sha256-...` value.
4. Choose **Review package**. No code executes during review.
5. Review module identity, permissions, dependencies, rating, size, and digest,
   or review an asset bundle's target, resource count, byte total, roles,
   license, rating, and digest.
6. Confirm installation. A module package is copied into IndexedDB and remains
   disabled. For an asset bundle, every declared resource is downloaded and
   verified before its target module's local catalog is replaced.

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

## Asset Bundle V1

Backend roles and implementation priority are defined in
[Media Repository And Provider Priority](media-repository.md). IndexedDB and
reviewed HTTP endpoint/sidecar providers come first; AI generation, packaged
runtime bridges, and OPFS remain ordered backlog providers.

Module packages may include their existing bounded JSON-style `assets`
metadata object. Separately, [Asset Bundle V1](asset-bundle-v1.md) defines a
code-free `yaw-asset-bundle` envelope with per-resource hashes, exact MIME and
size declarations, roles, same-bundle fallbacks, provenance/licensing, quotas,
local storage, repair status, and explicit replacement/removal.

Asset Bundle V1 is a JSON manifest that points to individually verified
resources; it is not an archive. A future archive transport would still need
explicit encoded and unpacked budgets and path-traversal protection. Tileset,
sprite, animation, audio, video, and 3D presentation schemas remain downstream
and should consume the bundle/repository contracts rather than create a
parallel downloader.
