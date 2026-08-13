# Release Readiness — 0.19.0

Status: **released select-group alpha**

This checklist records the accepted evidence and continuing observations for
the exact 0.19.0 companion autonomy and Combat Agency release. Sites deployment
and broader promotion remain separate operator actions.

Accepted candidate main commit: `1f57aa5c934f216d015c7041cf53f5a1269ce962`
(merged PR #19).

Promotion branch: `codex/release-0.19.0-promotion`.

Evidence last refreshed: **2026-08-13**.

## Documentation and identity

- [x] `app/release.json` identifies 0.19.0 as a released alpha dated
  2026-08-13.
- [x] Save Schema remains 11 and Module API remains 1.
- [x] Application package, lockfile root, first-party package, and Mod Author
  Kit production mirrors identify 0.19.0 without changing minimum-version
  floors.
- [x] English and Spanish release copy describe only the post-0.18.3 release
  delta and its deliberate exclusions.
- [x] `releases/0.19.0.md`, the development changelog, active objectives, and
  implemented evidence no longer describe merged player features as local-only
  or unfinished work.

## Implemented release boundary

- [x] Per-companion Play/Pause is restricted to recruited non-player cards and
  the player's turn, preserves configured behavior and history, and exposes
  active, paused, and awaiting-direction presentation.
- [x] One uncommitted companion intent and bounded stored legal alternatives
  feed the existing deterministic resolver exactly once.
- [x] One suggestion deterministically complies or refuses from saved Bond and
  reserves the player's next ordinary actionable turn in either case.
- [x] Chew debits conserved finite body mass and nourishes only participating
  chewers; global Vitality and Punishment scaling remain unchanged.
- [x] Companion flight narrates its cause and synchronizes party, queue, world,
  selection, and save state.
- [x] Flying-player Terror distinguishes unreachable ground-only attackers from
  reachable flying, ranged, or anti-flying threats; no-progress encounters use
  explicit stalemate disengagement rather than individual flee.

## Exact-candidate automated validation

- [x] `npm run full-build` passes.
- [x] `npm run audit:branding` passes as part of the root full-build gate.
- [x] `git diff --check` passes.
- [x] Focused core regression passes after generating the clean worktree's
  required candidate artifact.
- [x] Combat interaction/browser regression passes.
- [x] Desktop/mobile viewport regression passes.
- [x] The 15-case Alpha browser matrix passes.
- [x] Ordinary-adventure lifecycle and save/reload regression passes all three
  phases.
- [x] Canvas browser acceptance passes 17 cases; Tile Composition browser
  acceptance passes two origins across four viewports.
- [x] Generated offline and hosted artifacts both identify 0.19.0 runtime
  metadata and retain their expected embedded/external atlas boundaries.
- [x] GitHub CI passed for the exact candidate head and merged main commit
  `1f57aa5c934f216d015c7041cf53f5a1269ce962`.

## Recommended human smoke

- [ ] Load a representative older save, confirm companion identity/history,
  then save and reload during a paused companion turn and intent preview.
- [ ] Exercise Play/Pause on every recruited companion card during the player's
  turn; confirm the player card has no companion-only control.
- [ ] Observe one accepted and one refused suggestion, including the explanation
  and exactly one consumed next ordinary player turn after each request.
- [ ] Confirm single and group Chew nourish only actual chewers by the finite
  mass removed, including a sated chewer and a target that survives.
- [ ] Compare flying-player Terror against unreachable ground-only attackers and
  against reachable flying, ranged, or anti-flying attackers; observe an
  explicit stalemate/disengage when neither side can progress.
- [ ] Inspect the companion cards and intent controls on desktop and maintained
  phone widths, including active, paused, awaiting-direction, English, Spanish,
  and enlarged-text presentation.
- [ ] Open the released artifact through `file://` and localhost and compare
  its visible version and mechanics with the hosted artifact.

## Observed human-smoke follow-ups

- [ ] **Minor UX:** Character Creation needs a clear Exit or Back control that
  returns to the Main Menu without requiring the player to finish creating a
  character.
- [ ] **Minor UX:** The live-game context/app menu needs a Main Menu option so
  the player can leave the current play surface through an explicit navigation
  path.

## Release decisions and continuing gates

- [x] Human smoke was accepted; difficult-to-reproduce Terror observations and
  the minor navigation UX items remain explicit follow-ups.
- [x] GitHub CI is green for the final candidate head and exact merged main
  commit.
- [x] The operator assigned release date 2026-08-13 and the alpha channel.
- [ ] A rollback-ready hosted version is selected before any Sites publication.
- [x] The operator authorized release publication after the protected promotion
  merge; Sites deployment remains excluded.
- [ ] Any Sites deployment or broader promotion receives separate explicit
  authorization.

The unchecked items remain continuing observations or Sites-specific gates;
they do not invalidate this exact released alpha record.
