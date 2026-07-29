# Runtime Architecture

This document describes the current maintained runtime. Historical proposals
are not architecture; use focused doctrine files and the archive for their
context.

## Source and generated artifacts

The maintained source is under `app/`:

```text
app/
  build.js
  release.json
  template.html
  src/core/
  src/ui/
  test/
```

`app/build.js` assembles the template and browser-global modules in one
explicit order. The offline distribution is a generated single HTML file.
The hosted build uses the same gameplay runtime with cacheable presentation
assets. Never hand-edit a file under `dist/`.

`app/release.json` is the release-identity source of truth. Package versions,
generated labels, save metadata, module compatibility, and first-party package
production metadata mirror it. A development candidate uses numeric semantic
versioning plus explicit channel/status metadata; it does not impersonate the
published build.

## Runtime layers

- `src/core/` owns deterministic game state, interactions, combat, traversal,
  persistence, content arbitration, module boundaries, presentation-pack
  resolution, accessibility text, and release UI.
- `src/ui/` owns system-screen controllers such as Mods, Host Catalog, AI
  Providers, Settings, and top-level navigation.
- `template.html` owns static structure and styles. Runtime modules populate
  declared surfaces rather than receiving arbitrary DOM authority.
- `test/` supplies core, viewport, interaction, persistence, module, and
  distribution acceptance.

Core gameplay is deterministic and service-independent. Narration providers
may restyle recorded Scene Beats but cannot decide game facts.

An optional hosted account service is discovered only through a same-origin
`/yaw-service.json` declaration. It owns sessions, entitlements, allowance, and
managed provider credentials; missing discovery is a normal offline/browser
state. See `server-backed-ai.md`. Electron/Pear remains an independent optional
host and is not required by this service path.

## World and persistence

The overworld is a deterministic sparse generated baseline keyed by seed,
generator version, coordinates, purpose, and map-mod hash. World Topology V3
provides versioned terrain, traversal, structures, reciprocal interior graphs,
cave networks, POI budgets, and durable topology semantics. Generator V4
introduced the safe-start and opening-pressure contract; Generator V5 added
the route hierarchy; Generator V6 is the current new-world default and uses a
clean one-tile orthogonal road raster. A save retains its recorded generator,
so later versions never rewrite an existing world.

Only durable changes are persisted over that baseline. Sparse saves record a
manifest and scoped deltas for player, party, current tile, changed world
tiles, quests, modules, Scene Feed, Activity Log, combat, defeat/recovery, and
other owned state. Full/binary compatibility remains available for migration
and recovery. See `save-sparse-delta.md`, `sparse-map-generation.md`, and
`world-topology-v3.md`.

Current browser persistence stores are:

- `YAW_Saves`: save slots and manifests
- `YAW_Modules`: installed modules and package metadata
- `YAW_Worlds`: sparse world deltas
- Media Repository IndexedDB storage for installed asset payloads and refs

`FFF_Saves` and `FFFme_Modules` are legacy cleanup targets only. Stored state
is normalized before it becomes runtime authority.

## Interaction and responsive UI

Desktop and mobile share the actor-target-intent grammar and one core-owned
composer. Mobile Interaction Flow V2 uses one state-aware Roster with
Party/Here/Items outside combat and Allies/Enemies in combat; it does not use
separate Party and Creatures navigation models. Contextual Feed, Feast, Play,
and Fight-technique choices open bounded subinteraction surfaces while
preserving actor/target state.

The center stage, 3x3 traversal surface, Scene Feed, Activity Log, Holdings,
Quest/Trade, dialogs, and system overlays share maintained localization,
keyboard-focus, touch-target, high-contrast, reduced-motion, and responsive
contracts. UI Contribution V1 exposes only its five declared module slots.

## Content, modules, and presentation

Core owns deterministic SFW/Mature mechanics and safe fallback presentation.
Optional content providers may supply rated prose and bounded declarative
contributions. The trusted-local module lane validates manifests, permissions,
ownership, compatibility, and unload cleanup before executable code runs.
Same-origin host catalogs may preload optional or required packages; reviewed
URI installs are copied locally and never hotlink their package.

Presentation remains separate from gameplay:

- Locale Pack V1 owns text namespaces and fallback.
- Asset Bundle V1 and Media Repository own reviewed media acquisition/storage.
- Tileset Pack V1 and Sprite Pack V1 resolve code-free visual semantics.
- Lightweight and Textured modes communicate identical topology.

Modules cannot receive arbitrary DOM callbacks, world-generation callbacks, or
provider authority. Focused contracts in `modding.md`, `host-modules.md`,
`locale-pack-v1.md`, `asset-bundle-v1.md`, `tileset-pack-v1.md`, and
`sprite-pack-v1.md` are authoritative.

## Release pipeline

Local acceptance is:

```bash
npm run full-build
npm run audit:branding
git diff --check
```

`full-build` includes core, viewport, interaction, lint, generated-artifact,
and map/tileset acceptance. CI uploads generated artifacts; `dist/` is not a
source input. Sites versions are immutable and rollback-ready. Saving or
publishing a Sites version remains operator-mediated.

## Legacy and historical material

- `legacy/` contains the original monolithic app and backups.
- `archive/` contains historical experiments and plans.
- Documents explicitly marked superseded are context only.

Agents should work from this document, `next-objectives.md`,
`backlog-completion-audit.md`, focused doctrine, maintained source, and tests.
