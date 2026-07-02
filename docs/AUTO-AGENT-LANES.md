# Auto-Agent Lanes

This repo owns its autonomous-work boundaries through `.auto-agent/lanes.json`.
The lane map is intentionally narrow: it should help agents work in isolated
workspaces without turning broad product direction into unattended code changes.

## Scope Boundary

- Do not expand, rewrite, generate, or review explicit content for lane-map work.
- Use `app/src/` and `app/template.html` for maintained source changes.
- Do not hand-edit `dist/you-are-wild.html`; regenerate it through the build.
- Keep current icon and emoji fallbacks when adding image or tileset support.
- Treat final controls, release, publishing, and branding/legal decisions as
  operator-mediated.

## Current Lanes

1. `controls-doctrine`
   - Docs-first lane for traversal, selection, intent, and inspection controls.
   - This should complete before broad autonomous UI work.

2. `center-tile-traversal-doctrine`
   - Docs-first lane for the unified 3x3 center-tile navigation/context surface.
   - Defines how the center semantic/event slot, directional movement affordances,
     expanded map mode, and future desktop hotkeys should relate before UI code
     changes.

3. `desktop-intent-menu`
   - Desktop-only action menu layout work.
   - Preserve mobile bottom-sheet and long-press behavior.

4. `quest-preview`
   - Low-priority feature lane.
   - Adds a localized, safe preview path before quest acceptance.

5. `asset-tileset-manifest`
   - Feature lane for asset/tileset metadata, AI-generated provenance, relative
     paths, and fallback behavior.
   - Does not import the tilesheet yet.

## Suggested Auto-Agent Workflow

Run validation from the auto-agent repo:

```sh
cd /home/zevilz/work/prototypes/auto-agent-hirearchy
node src/cli.js process validate-lane-map --target /home/zevilz/work/porn
```

Create an isolated instance when ready:

```sh
cd /home/zevilz/work/prototypes/auto-agent-hirearchy
node src/cli.js instance init --name you-are-wild --target /home/zevilz/work/porn --adapter node-js --provider codex-cli
node src/cli.js instance run-to-boundary --name you-are-wild --provider codex-cli --progress
```

Review before applying anything back:

```sh
AUTOMATION_DIR=".automation/instances/you-are-wild/.automation" node src/cli.js process review
AUTOMATION_DIR=".automation/instances/you-are-wild/.automation" node src/cli.js process apply-back --all-promoted --dry-run
```

Apply-back never pushes. After applying work back to this repo, run the normal
repo verification and commit from the repo itself.

## Known Caution

The auto-agent workspace copier ignores nested `node_modules` directories. This
repo currently keeps Playwright under `app/node_modules`, so isolated worker
verification should prefer `npm run build`, `npm run test`, and
`npm run audit:branding`. Run `npm run full-build` manually in the main repo
after apply-back unless nested dependency hydration has been improved.
