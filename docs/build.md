# Build Process

The tactical app is built from `FightFuckFeed.tactical/template.html` and the ordered JavaScript modules in `FightFuckFeed.tactical/src/`.

## Output

The generated file is written to:

```text
dist/FightFuckFeed.tactical.html
```

The generated output includes a banner warning that it should not be edited directly.

## Scripts

Run from `FightFuckFeed.tactical/`:

```sh
npm run build      # regenerate dist/FightFuckFeed.tactical.html
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
