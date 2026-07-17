# Host-Supplied Modules

You Are Wild can optionally discover a same-origin `yaw-host.json` manifest when
the game runs over HTTP or HTTPS. File-origin builds never request a host
manifest and continue to support bundled content, IndexedDB modules, and local
`.yawmod.json` imports.

The host lane is curated, trusted code. It does not make the in-game catalog an
arbitrary remote community marketplace. Host package URLs must use the same
origin as the game, redirects are rejected, and packages can be pinned with a
SHA-256 integrity value.

## Discovery

By default the game resolves `yaw-host.json` beside the served game document.
A hosting shell may override the path with:

```html
<meta name="yaw-host-manifest" content="/game/yaw-host.json">
```

The override must remain same-origin. A missing manifest is normal and leaves
the trusted-local module workflow unchanged.

## Manifest

```json
{
  "schema": "yaw-host-modules-v1",
  "hostId": "example-world",
  "strictWorldModules": false,
  "catalog": [
    {
      "id": "example_rules",
      "name": "Example World Rules",
      "version": "1.0.0",
      "url": "mods/example-rules.yawmod.json",
      "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "preload": true,
      "runtimeRequirements": {
        "origins": ["https", "localhost"],
        "secureContext": true
      }
    }
  ],
  "policy": {
    "allowUserModules": true,
    "required": ["example_rules"],
    "defaultEnabled": [],
    "optional": [],
    "forbidden": []
  }
}
```

Catalog entries may contain an inline `package` instead of `url`. Same-origin
URLs are preferred for separately cacheable packages. A declared `sha256` is
verified against the exact downloaded JSON bytes before parsing or installing.

## Policy States

- `required`: installed, enabled, and not player-disableable.
- `defaultEnabled`: installed and enabled on first installation; the player may
  subsequently disable it.
- `optional`: offered by the Host Catalog and controlled by the player.
- `forbidden`: cannot be enabled for this hosted game, including a matching
  player-installed package.
- `allowUserModules: false`: preserves player packages in storage but prevents
  them from running under this host.

Host and built-in records retain their provenance and cannot be deleted through
the player Mod Manager. User packages cannot replace a host-owned module ID.

## Runtime Requirements And Lifecycle

Module manifests can declare:

```json
{
  "runtimeRequirements": {
    "origins": ["file", "https", "localhost", "http"],
    "network": false,
    "secureContext": false,
    "hotToggleSafe": false
  }
}
```

Modules default to all origins, no network or secure-context requirement, and
restart-required changes in an active world. A module must explicitly set
`hotToggleSafe` when its hooks and persistent contributions can safely be added
or removed while play is active.

## Save Content Profiles

Every new save records the enabled module IDs, versions, integrity pins, and
provenance under `yaw-content-profile-v1`. Loading resolves missing host catalog
packages where possible and rejects missing, mismatched, or differently pinned
modules before applying world state. Legacy saves without a content profile
remain loadable. `strictWorldModules` additionally rejects enabled modules that
were not present when the world was saved.

## Public Marketplace Boundary

A separate public marketplace may distribute downloadable `.yawmod.json`
packages. Installing those files remains an explicit player trust action until
remote packages have a stronger signature, permission, and execution sandbox.
The in-game Host Catalog only exposes packages curated by the current game host.
