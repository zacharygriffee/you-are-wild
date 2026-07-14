# Build Process

The app is built from `app/template.html` and the ordered JavaScript modules in `app/src/`.

The source of truth is the modular source, template, tests, docs, and build scripts. The single-file HTML is generated output.

## Output

The generated file is written to:

```text
dist/you-are-wild.html
```

The generated output includes a banner warning that it should not be edited directly.

Keep `dist/` ignored and do not commit `dist/you-are-wild.html` to `main`. CI generates the playable HTML and uploads it as a workflow artifact. Future release builds may publish the generated file as a GitHub Release asset or GitHub Pages artifact.

## Scripts

Run from `app/`:

```sh
npm run build      # regenerate dist/you-are-wild.html
npm run check      # fail if the generated file is stale
npm run lint       # syntax-check every source module in build order
npm run full-build # clean, build, test, lint, and check
```

The build fails if:

- any file in `src/` is missing from the explicit script order
- any file in the script order is missing
- any source module has a syntax error
- the template does not contain `<!-- SCRIPTS_PLACEHOLDER -->`

## Development Server

```sh
npm run dev
```

This starts both the build watcher and a static server. The process handles `SIGINT` and `SIGTERM` so both child processes shut down together.
