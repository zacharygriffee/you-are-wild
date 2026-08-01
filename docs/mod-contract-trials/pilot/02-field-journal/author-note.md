# Field Journal author note

## Artifact

`submission/yaw-field-journal.yawmod.json` is a canonical version-one
`yaw-module` package. It is safe-rated, offline-capable, and requires game
version 0.14.0 or newer.

## Repository evidence used

- `docs/modding.md` supplied the canonical package envelope, the implemented
  permission list, the `MODS.getContext()` public-context boundary, trusted-local
  execution rules, and settings/content ownership rules.
- `docs/ui-contribution-v1.md` supplied the stable
  `roster.here.badges`, `roster.details.sections`, and `system.utilities`
  slots; callback result bounds; responsive/core-owned rendering guarantees;
  and atomic owner cleanup on unload.
- `docs/examples/ui-contribution-v1.yawmod.json` demonstrated the installable
  envelope and registration shapes for a badge, detail rows, and a utility.
- `app/src/core/module-system.js` confirmed the public unit summary fields,
  location/tile and party fields, six-row limits, text limits, frozen callback
  contexts, command-dialog normalization, permission enforcement, and owned
  contribution removal.
- `app/src/core/panel-shell.js` confirmed that the same roster contribution
  slots are rendered through the unified party/here roster surface.
- `app/test/test.js` supplied maintained conformance evidence for permission
  denial, frozen contexts, escaping, unload cleanup, and the public context's
  party and tile summaries.
- `app/test/viewport-check.js` showed the maintained mobile viewport fixture
  exercising these exact badge, details, and utility contribution shapes.
- `app/release.json` and `app/package.json` supplied the current packaging
  version, 0.17.0. The minimum version remains 0.14.0 because that is the
  maintained UI Contribution V1 example's compatibility floor.

## Decisions and assumptions

- “Creature-details section” is interpreted as journal rows shown only for
  `unitType === "creature"` in the nearby/enemy roster. It does not duplicate
  those rows for party/allied entries.
- The roster badge favors immediate usefulness: it reports active condition
  count first, then a simple hostile/friendly/observed classification.
- The utility calls `MODS.getContext()` when invoked, so its dialog summarizes
  a fresh bounded public snapshot rather than cached state. It reports
  coordinates, terrain, public danger, party size and names, and current mode.
- The module declares both `ui:contribute` and `ui.read`. It has no settings or
  persistent state because the brief does not need configuration and all
  displayed facts are derived from the current public context.
- `runtimeRequirements.hotToggleSafe` is true because registration is entirely
  owner-tracked presentation state. Core removes all three contributions when
  the module is disabled, replaced, deleted, or unloaded.
- Desktop and mobile behavior is delegated to the stable contribution slots
  and core-owned dialog. No module-specific layout, CSS, focus management, or
  viewport branching is needed.

## Public-contract limits

The public contracts prevented creating an arbitrary journal panel, adding
custom HTML or CSS, reading DOM/application/save internals, mutating party or
location state, or presenting hidden creature data. The details therefore use
only the bounded public unit summary, and the utility uses only
`MODS.getContext()`. Core owns placement, escaping, accessibility semantics,
responsive layout, dialog focus and close behavior, and unload cleanup.

Per the trial brief, I did not run a development server, Playwright/browser
checks, the full build, or edit tracked repository files. Validation was
limited to JSON parsing, module-code syntax checks, and targeted contract
inspection.
