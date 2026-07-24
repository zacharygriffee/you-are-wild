# Real Presentation Pack Acceptance

This record covers maintained, installable examples for the three current
presentation extension lanes. These are real packages served over loopback
HTTP and installed through the same module, Asset Bundle, Media Repository,
and locale paths used by player-supplied packages. They are not mocks embedded
only in a unit test.

## Maintained fixtures

| Lane | Module or bundle | What it exercises |
| --- | --- | --- |
| Locale Pack V1 | `optional-mods/you-are-wild-french-preview.yawmod.json` | A deliberately partial third language, dynamic selection, visible menu and accessibility text, English fallback, missing-key diagnostics, reload, and unload. |
| Sprite Pack V1 | `optional-mods/example-sprite-pack/` | A reproducible atlas, static and animated Human/Wolfkin states, Ghost and wounded state selection, pack fallback, local leases, reload, and emoji restoration. |
| Tileset Pack V1 | `optional-mods/example-tileset-pack/` | Partial base and overlay ownership, routes, beach material, cardinal/corner shoreline transitions, building and cave interiors, topology-aware corridors, replacement, reload, and restoration. |

The Sprite atlas is reproducible with:

```bash
npm run build:example-sprites
```

The generated file is `media/example-sprite-atlas-v1.png`; its declared
SHA-256 and geometry are checked against the bundle before the lifecycle test
is allowed to install it.

## Automated lifecycle gate

`npm run test:interactions` serves the repository from an ephemeral loopback
origin and proves:

1. the package is fetched without credentials through an allowed origin;
2. review recognizes the bounded contract before installation;
3. enabled presentation resolves through module ownership;
4. media bytes are copied into IndexedDB and rendered through `blob:` leases
   instead of hotlinking the source;
5. an ordinary reload restores enabled ownership and retained media without a
   second source request;
6. disabling the owner removes only its presentation and restores core
   fallbacks;
7. the French Preview visibly changes the main-menu text and accessible label,
   survives reload, reports bounded missing-key diagnostics, and returns to
   English on disable.

Core tests separately validate atlas geometry, resource digests, locale
dependency/version rules, semantic shoreline and interior coverage, and
malformed-package rejection.

## What this does not approve

This gate proves contracts and lifecycle behavior, not artistic quality or
translation completeness. French Preview intentionally falls back to English.
The Sprite atlas is a tiny neutral fixture rather than production character
art. The Tileset fixture exercises composition and fallback but does not
replace the operator review required for crop legibility, terrain seams, and
marker contrast on representative phone and desktop screens.

Downloaded `file://` play remains a supported runtime. Installed assets are
local after review, and missing, disabled, or failed presentation packs always
leave semantic text plus core emoji/tileset fallback available.
