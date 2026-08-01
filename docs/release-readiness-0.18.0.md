# Release Readiness — 0.18.0

Status: **verified — candidate not published**

This checklist records evidence for the exact 0.18.0 Moddable Core V1
select-group alpha candidate. Local or CI success does not assign a release
date, publish Sites, create public release assets, or promote the channel.

Local evidence last refreshed: **2026-08-01**.

Release-payload commit: `8d9f5918b4df61021010a9f7d66efbb9c5c5b091`.
GitHub CI: [run 30686042187](https://github.com/zacharygriffee/you-are-wild/actions/runs/30686042187)
completed successfully for that exact commit on 2026-08-01.

## Documentation and identity

- [x] `app/release.json` identifies 0.18.0 as an unpublished alpha candidate.
- [x] Save Schema remains 11 and Module API remains 1.
- [x] Application package and package-lock root identity match 0.18.0.
- [x] First-party package `gameVersion` mirrors identify 0.18.0 while their
  verified older `minGameVersion` floors remain intact.
- [x] Mod Author Kit snapshots and package examples identify 0.18.0.
- [x] English and Spanish release copy describe the implemented V1 boundary.
- [x] `releases/0.18.0.md` records compatibility and deliberate exclusions.
- [x] `next-objectives.md` no longer lists implemented V1 mechanics as absent.
- [x] The unreviewed diagram is excluded because it visually implies deferred
  portal-world and regional-population behavior.

## Contract acceptance

- [x] Deterministic Action Resolver costs, checks, effects, structure
  requirements, and immutable post-commit outcomes pass.
- [x] Status and restraint ownership, duration, stacking, Pull, Escape, and
  unload cleanup pass.
- [x] Appetite-gated Seduce passes success, recruitment-ready, withdrawal, and
  party-capacity boundaries.
- [x] Equipment, resource, body mass, pieces, regrowth, corpse conversion, and
  consumption conservation pass.
- [x] Biome recipes preserve materialized geography and reject cross-owner
  authority.
- [x] Encounter/world/quest scaling and merchant lifecycle checks pass.
- [x] Dismissed-recruit autonomy and perception-limited sightings pass.
- [x] Combat pacing remains presentation-only and absent from saves.
- [x] Audio Pack V1 remains semantic, owned, bounded, and free of AI or TTS.

## Exact-candidate compatibility and runtime smoke

- [x] The published 0.14 representative save loads through the current slot
  migration path.
- [x] The Moddable Core fixture installs, enables, spends its owned resource,
  applies its restraint, reloads from enabled storage, disables, and deletes
  without residual definitions.
- [x] Core Grab, Pull, Escape, and Seduce resolve through the shared action
  contract with deterministic rolls.
- [x] The opened contributed-action menu stays visible and bounded at 313x670.
- [x] Maintained 390x844, 412x915, 1024x768, and 1365x768 surfaces pass.
- [x] The generated offline single-file artifact boots through `file://`.
- [x] The hosted artifact retains external immutable atlas paths and does not
  embed the atlas payload.
- [x] Offline and hosted artifacts identify the exact 0.18.0 candidate.

## Verification gates

- [x] Root `npm run full-build` passes.
- [x] Mod Author Kit validation passes with 27 runtime permissions.
- [x] Branding audit passes.
- [x] `git diff --check` passes.
- [x] Generated-source cleanliness passes.
- [x] Candidate changes are committed and pushed intentionally to `main`.
- [x] GitHub CI is observed green for the exact candidate commit.

## External/operator gates

- [ ] Operator approves 0.18.0 for the select playtest group.
- [ ] Release date is assigned and candidate metadata is changed to released.
- [ ] Physical-phone comfort is reviewed or explicitly accepted as follow-up.
- [ ] A rollback-ready Sites version is selected if Sites will be updated.
- [ ] Sites publication is explicitly authorized and confirmed, if desired.
- [ ] A downloadable release artifact or tag is explicitly authorized, if
  desired.

The unchecked operator gates do not block preparation of a verified candidate.
They do block claiming that 0.18.0 has been released or publicly published.
