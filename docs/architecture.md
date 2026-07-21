# Architecture

The maintained app is under `app/`.

## Source Package

```text
app/
  build.js
  dev.js
  package.json
  template.html
  src/
    core/
    ui/
  test/
```

## Runtime Shape

The project still emits a single HTML file for distribution. Build order is explicit in `app/build.js` so browser globals are initialized predictably.

Do not hand-edit `dist/you-are-wild.html`. It is generated from `app/template.html` and `app/src/` by `npm run build`.

Core modules live in `src/core/`:

- `serialization.js`: save/load codec
- `storage-system.js`: localStorage, combat refresh snapshot, and save-slot IndexedDB helpers
- `app.js`: main tactical app state and gameplay loop
- `module-system.js`: optional content/module loader
- `content-system.js`: content preference and template handling
- `marketplace.js`: built-in content pack handles and policy checks

UI modules live in `src/ui/`:

- `settings-nav.js`
- `mod-ui.js`
- `market-screen.js`
- `market-nav.js`
- `global-nav.js`

## Map Direction

The current overworld uses lazy deterministic super-patch biome generation. The intended next architecture is a sparse, seeded, layered map model with durable IndexedDB deltas over generated baseline data. See `docs/sparse-map-generation.md` for the quadtree/chunk plan, seed contract, map delta model, and migration path.

## Legacy And Archive Areas

- `legacy/` contains the original monolithic HTML app and backup.
- `archive/` contains historical experiments, patches, and old planning docs.
- `dist/` contains generated release output.

Agents should default to `app/src/`, `app/template.html`, tests, and docs unless a task explicitly targets legacy code.

## Persistence Boundary

Stored settings, content preferences, UI view preferences, and save-slot metadata are not trusted as runtime state. App settings normalize through `App._normalizeSettings()` on startup and before save. Content preferences normalize through `CONTENT.applyPreferences()` / `CONTENT.savePreferences()`. Combat log view state normalizes through `App._normalizeLogViewPreferences()`. Save-slot names normalize through `App._normalizeSaveSlotName()` before IndexedDB/localStorage key use, and save timestamps normalize through `App._normalizeSaveTimestamp()`. Content policy, module enablement policy, accessibility controls, mature/adult setting visibility, log layout controls, and save/load entry points should read normalized runtime values instead of raw storage.

Current IndexedDB namespaces are `YAW_Saves`, `YAW_Modules`, and `YAW_Worlds`. `FFF_Saves` and `FFFme_Modules` are legacy cleanup targets only: normal save/module operations should not open or write those databases, and destructive cleanup should delete them only when `indexedDB.databases()` reports that they already exist.

## Modding Boundary

The current executable mod lane is trusted-local. Module manifests are
validated before IndexedDB storage, hooks and contributions are owned by module
ID, and unload removes owned runtime work. `docs/modding.md` is the canonical
authoring doctrine. Development sample fixtures are not player-facing catalog
content. `market-screen.js` renders only a validated same-origin Host Catalog;
`src/core/marketplace.js` retains separate built-in content-pack handles.

HTTP(S) builds may additionally load a same-origin `yaw-host.json` catalog.
Host packages retain host provenance and policy separately from player-installed
IndexedDB modules; file-origin builds skip this discovery entirely. See
`docs/host-modules.md` for the manifest, integrity, lifecycle, and save-lock
contracts.
