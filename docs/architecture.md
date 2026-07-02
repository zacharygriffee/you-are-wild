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

Core modules live in `src/core/`:

- `serialization.js`: save/load codec
- `app.js`: main tactical app state and gameplay loop
- `module-system.js`: optional content/module loader
- `content-system.js`: content preference and template handling
- `marketplace.js`: built-in content pack metadata

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
