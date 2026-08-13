# Release Readiness — 0.19.0

Status: **candidate preparation — not published**

This checklist records evidence for the exact 0.19.0 companion autonomy and
Combat Agency candidate. Local or CI success does not assign a release date,
publish Sites, create a tag or release asset, deploy a build, or promote the
channel.

Candidate source base: `44e0dad3b9489a441e7d6ca842a446e9ee264af6`
(merged PR #18).

Candidate branch: `codex/release-0.19.0-rc`.

Local evidence last refreshed: **2026-08-12**.

## Documentation and identity

- [x] `app/release.json` identifies 0.19.0 as an unpublished development
  candidate with no release date.
- [x] Save Schema remains 11 and Module API remains 1.
- [x] Application package, lockfile root, first-party package, and Mod Author
  Kit production mirrors identify 0.19.0 without changing minimum-version
  floors.
- [x] English and Spanish release copy describe only the post-0.18.3 candidate
  delta and its deliberate exclusions.
- [x] `releases/0.19.0.md`, the development changelog, active objectives, and
  implemented evidence no longer describe merged player features as local-only
  or unfinished work.

## Implemented candidate boundary

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
- [x] Generated offline and hosted artifacts both identify 0.19.0 candidate
  metadata and retain their expected embedded/external atlas boundaries.
- [ ] GitHub CI passes for the exact draft-PR head.

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
- [ ] Open the candidate through `file://` and localhost and compare its visible
  version and mechanics with the hosted candidate artifact before publication.

## Observed human-smoke follow-ups

- [ ] **Minor UX:** Character Creation needs a clear Exit or Back control that
  returns to the Main Menu without requiring the player to finish creating a
  character.
- [ ] **Minor UX:** The live-game context/app menu needs a Main Menu option so
  the player can leave the current play surface through an explicit navigation
  path.

## External/operator gates

- [ ] Human smoke is accepted or any remaining observational item is explicitly
  accepted as follow-up.
- [ ] GitHub CI is green for the final candidate head.
- [ ] The operator separately assigns a release date and changes candidate
  metadata to a released channel.
- [ ] A rollback-ready hosted version is selected before any Sites publication.
- [ ] Any tag, release asset, deployment, publication, or promotion receives
  explicit authorization.

The unchecked operator gates do not block preparation of a verified candidate.
They do block claiming that 0.19.0 has been released or published.
