# Release Readiness — 0.15.0

Status: **in progress — not published**

This checklist records evidence for the exact 0.15.0 candidate. A checked local
gate is not evidence of a green remote workflow or operator approval.

Local automated evidence last refreshed: **2026-07-25**.

## Documentation and identity

- [x] Authoritative document roles are consolidated.
- [x] Current architecture describes sparse generation, World Topology V3,
  sparse saves, unified mobile Roster, and the release pipeline.
- [x] Superseded immediate plan is marked historical.
- [x] Draft 0.15.0 release notes exist.
- [x] Generated artifact identifies itself as a 0.15.0 development draft.
- [x] Local browser main menu and update notice display
  `v0.15.0 · Development draft`.
- [ ] Public-preview release date and channel assigned by operator.

## Standard Adventure safety

- [x] Hungry/Starving penalties are visible, deterministic, reversible, shared
  by living units, and do not lower maximum Condition.
- [x] Generator V4 protected/opening policy is inherited by Generator V6.
- [x] Opening hostile group/tier/ambush/reinforcement bounds are executable.
- [x] Weakest-party opening threat admission avoids hidden damage scaling.
- [x] Roads reduce generated encounter pressure.
- [x] Stable Safe/Low/Guarded/Dangerous/Severe bands are visible for current
  and adjacent tiles before movement.
- [x] Scout/Guard ambush awareness and Scene/Activity explanation are
  deterministic.

## Ghost disposition

- [x] Product disposition is explicit: conservative opt-in traversal-only
  Ghost is included.
- [x] Entry, destination, inventory consequence, companion outcome, agency,
  resurrection cost, and failure fallback are documented.
- [x] Exact-candidate automated Ghost smoke covers defeat-site entry,
  traversal-only restrictions, hostile suppression, save-safe inventory policy,
  safe-place resurrection, and single-charge death-bag behavior.

## Compatibility

- [x] Save schema remains 11.
- [x] Module API remains 1.
- [x] Recorded generator versions load without rewriting their world.
- [x] A representative save serialized by the published 0.14.0 code loads
  through the exact-candidate slot migration path.
- [x] First-party package lifecycle tests pass; the Sites host catalog,
  synchronized package copies, package versions, and `gameVersion` mirrors are
  validated by both the root build and the independent Sites render suite.

## Local gates

- [x] `npm run full-build`
- [x] `npm run audit:branding`
- [x] `git diff --check`
- [x] Independent Sites build and server-render suite (5/5)
- [x] Automated mobile `412x915` release viewport
- [x] Automated desktop `1365x768` release viewport
- [x] Automated Spanish at 20px, high contrast, reduced motion
- [x] Automated checks find no horizontal overflow or blocked
  traversal/composer controls

## Candidate smoke

- [x] Clean-origin Mousefolk starter, protected opening, current/adjacent
  Safe/Low danger labels, and ten browser-driven moves
- [x] Talk, Fight, and a committed Feast attempt
- [x] Group/multi-target interaction
- [x] Row movement, target confirmation, and Flee
- [x] Combat save/reload
- [x] Ordinary Regenerate defeat/recovery from the shared death test control
- [x] Companion survives player fall and battle settles
- [x] Sparse autosave, manual save/reload, representative old save
- [x] Unified Roster, Holdings, and Scene Feed browser smoke; maintained
  Quest/Trade interaction and rendering acceptance
- [x] Offline generated HTML builds
- [x] Hosted artifact path builds and passes map/tileset acceptance

## External/operator gates

- [ ] Candidate commit pushed by operator authorization
- [ ] CI workflow observed green for that commit
- [ ] Rollback-ready artifact/version selected
- [ ] English and Spanish release record reconciled with exact artifact
- [ ] Sites staging/version saved
- [ ] Operator approves Sites publication

Sites publication remains operator-mediated and is never performed
automatically.
