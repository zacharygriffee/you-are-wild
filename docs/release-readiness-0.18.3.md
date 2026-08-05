# Release Readiness — 0.18.3

Status: **development candidate — local stabilization gate passed**

This checklist records the first independent agent-led stabilization pass for
0.18.3. It does not authorize publication. Human playtesting remains ongoing
and may add fixtures without pausing other candidate work.

## Agent and live-browser pass — 2026-08-04

### Coverage completed

- [x] An ordinary non-Alpha adventure created a character, traveled through
  cardinal tiles, searched a shrine, entered its interior, narrated each
  outcome, and completed the initial sparse save without a page error.
- [x] The interaction audit covered Fight, Talk, Play, Eat, and Feed across
  exploration/combat, single/group/self/mixed selections, SFW/Mature posture,
  mixed reach, containment, fear, terror, and desktop/mobile presentation.
- [x] The persistence audit covered source-level save/load, queue restoration,
  companion rename/loadout/behavior, AI-assisted fallback, containment,
  posture, and narrated failure contracts.
- [x] The Alpha browser matrix passed all 10 maintained cases.
- [x] A deterministic ordinary-adventure browser lifecycle passed all three
  phases: desktop setup/save, desktop reload plus phone containment actions,
  and phone reload/restoration. It uses the ordinary `YAW_Saves` and
  `YAW_Worlds` stores, not the Alpha sandbox.
- [x] The ordinary lifecycle preserves companion rename, loadout, Duty,
  Stance, autonomous provider fallback, preferred row, Mature posture and its
  local acknowledgement, active combat, fear, terror, containment, current
  actor, turn-queue object references, Scene narration, and responsive command
  availability through reload.
- [x] The same lifecycle executes current-actor Digest and Release from the
  phone Holdings surface during combat, saves both results, and verifies their
  narration and containment state after a second reload.
- [x] A live Alpha combat replay confirmed that a targetless group Fight keeps
  the plan editable and writes a narrated lost opening with no warning banner,
  consumed turn, or page error.

### Defects reproduced and closed

1. Spanish mixed-reach group Fight could fall back to the English player actor
   label `You`. A deterministic core case now makes the player the sole capable
   participant under Spanish and rejects any English actor leak. Combat uses
   the maintained `party.you` locale key.
2. A missing or newly unavailable group target wrote the instruction “Choose
   at least one target” into the Scene Feed. Browser regressions now cover both
   targetless commit and vanished-target commit. Both paths narrate the named
   group's lost opening while preserving the editable plan and unspent turn.
3. The generated single-file candidate was stale relative to the source tree.
   The existing `npm run check` gate reproduced the mismatch. The artifact was
   regenerated after the fixes and the same gate now passes.

The fixture-before-fix rule was followed for both gameplay defects: each new
assertion failed against the old behavior before its implementation changed.

## Validation evidence

- [x] `npm run full-build` — source tests, lint, exact artifact check, viewport,
  interaction, Alpha, ordinary lifecycle, Mod Author Kit, hosted build,
  map/tileset acceptance, and branding audit all passed.
- [x] `npm run test:interactions` — passed with targetless and vanished-target
  Scene narration assertions.
- [x] `npm run test:alpha` — 10/10 cases passed.
- [x] `npm run test:lifecycle` — 3/3 ordinary lifecycle phases passed.
- [x] `npm run check` — `dist/you-are-wild.html` is current.
- [x] `git diff --check` — passed.

## Remaining gates

- [ ] GitHub CI passes for the exact stabilization commit.
- [ ] Ongoing human testing reports no new reproducible blocker, or each report
  is converted into a deterministic fixture and resolved.
- [ ] Operator explicitly approves the candidate for merge and publication.
