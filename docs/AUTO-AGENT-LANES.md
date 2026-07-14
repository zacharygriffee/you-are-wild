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

`docs/next-objectives.md` is the current backlog authority. Completed doctrine
and prototype lanes have been removed from the lane map so terminal checks track
maintained source ownership instead of historical milestones.

1. `ui-accessibility-localization-regressions`
   - Fixes demonstrated UI regressions and hardens locale parity, keyboard/ARIA,
     overflow, and supported viewport behavior.

2. `mod-public-context-examples`
   - Hardens the permission-gated public context used by narrative and optional
     LLM-facing modules without creating a core model/network dependency.

3. `multi-interaction-regression-hardening`
   - Covers existing actor-target-intent contracts and selection cleanup without
     inventing unresolved group semantics.

4. `deterministic-map-invariants`
   - Adds narrow start-safety, traversal, and deterministic overlay tests while
     preserving sparse world generation and save compatibility.

New or revised lanes should distinguish narrative/presentation mods from
structural/gameplay mods. Narrative or LLM-facing work should consume
`SceneBeat`, Activity Log, safe map summaries, quest state, and public unit
metadata without becoming a core dependency. Structural work should use explicit
mod APIs, permissions, content ratings, and save-compatibility boundaries.

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
