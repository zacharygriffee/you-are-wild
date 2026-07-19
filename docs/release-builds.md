# Release Builds

`dist/you-are-wild.html` is a generated playable artifact, not source of truth.
It remains the self-contained offline download with the first-party atlases
embedded. `npm --prefix app run build:hosted` additionally generates
`dist/you-are-wild.hosted.html`, which references separately hosted, cacheable
atlas files and can skip them entirely in `?graphics=emoji` mode. Both outputs
contain the same game runtime and module/tileset contracts.

Source of truth remains:

- `app/src/`
- `app/template.html`
- `app/test/`
- docs and build scripts

Do not hand-edit `dist/you-are-wild.html`, and do not commit it to `main`. Keep `dist/` ignored. CI builds the file from source and uploads it as the `you-are-wild-html` artifact for each pull request and push to `main`.

## Future Release Workflow

A later release workflow can run on tags matching `v*` and publish the generated HTML as a GitHub Release asset or GitHub Pages artifact.

Expected shape:

```yaml
on:
  push:
    tags:
      - "v*"
```

Release workflow steps should mirror CI:

```sh
npm ci --prefix app
cd app && npx playwright install --with-deps chromium
cd ..
npm run full-build
npm run audit:branding
git diff --check
```

Then publish `dist/you-are-wild.html` from that build. The release artifact should be produced by the workflow, not copied from a committed `dist/` file.
