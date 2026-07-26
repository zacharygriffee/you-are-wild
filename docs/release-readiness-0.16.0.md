# Release Readiness — 0.16.0

Status: **in progress — not published**

This checklist records evidence for the exact 0.16.0 Core Game Maturity
candidate. A checked local gate is not evidence of a green remote workflow,
rollback readiness, or operator publication approval.

Local evidence last refreshed: **2026-07-26**.

## Documentation and identity

- [x] `app/release.json` identifies 0.16.0 as a development draft.
- [x] English and Spanish Added, Changed, Fixed, Known Issues, and
  compatibility copy describe the Core Game Maturity candidate.
- [x] `docs/releases/0.16.0.md` records the candidate boundary.
- [x] Package, first-party module, and Sites release mirrors identify 0.16.0.
- [x] The Sites changelog retains 0.15.0 as history and presents 0.16.0 first.
- [x] The generated 9:16 0.16 poster is inspected and installed.
- [ ] Public-preview release date and channel are assigned by the operator.

## Core Game Maturity contracts

- [x] Item Registry V2 and Item Effects V1 acceptance.
- [x] Quest Contract V2 lifecycle, procedural archetype, turn-in, and reward
  acceptance.
- [x] Quest World Directives V1 deterministic placement, scoped boosts,
  idempotence, cleanup, bounds, and module-template acceptance.
- [x] Defeat-resolution acceptance for player and autonomous companion kills,
  subdual, containment, one-time identity credit, flee exclusion, and
  save/resume.
- [x] Progressive Chew acceptance for equal Vitality/condition damage,
  exploration flee-or-combat escalation, group and multi-target scaling,
  remains, rewards, localization, and save compatibility.
- [x] Review Map V2 layer, tracking, known-route, inspector, desktop dock, and
  mobile sheet acceptance.
- [x] Companion Behavior V2 Duty, Stance, Control, autonomy, provider fallback,
  recruitment continuity, and persistence acceptance.
- [x] Progression V2, anti-farming, perk effects, visible-only frontier,
  respec, and module lifecycle acceptance.
- [x] Progressive Tutorial V2 unlock, replay, reset, persistence,
  localization, point-of-choice, and accessibility acceptance.

## Compatibility

- [x] Save Schema remains 11.
- [x] Module API remains 1.
- [x] Existing 0.10.x through 0.15.0 saves use maintained additive adapters.
- [x] Recorded generator versions and existing world topology remain unchanged.
- [x] Missing item/perk providers remain inert and recover safely when
  re-enabled.

## Exact-candidate local gates

- [x] `npm run full-build`
- [x] `npm run audit:branding`
- [x] `git diff --check`
- [x] Independent Sites build and server-render suite (5/5)
- [x] Generated offline and hosted artifacts identify 0.16.0
- [x] Desktop and 390x844 mobile Sites entry, changelog, What's New, tutorial,
  Review Map, Holdings/Perks, and Roster smoke without horizontal overflow.
- [ ] Live quest acceptance/defeat/turn-in in the exact candidate. Acceptance
  is verified; Camp Safety now reserves a deterministic nearby Wolfkin, but
  the resulting full defeat and original-giver turn-in sequence still needs
  one exact-candidate browser smoke.
- [x] Live companion Duty/Stance/Control changes in the exact candidate.
- [x] Live Perk Frontier selection and respec in the exact candidate.
- [x] Live progressive Chew smoke covers exploration damage plus survivor
  flight, combat reach-failure narration, and grouped Feast planning; grounded
  single/group/multi-target damage remains covered by the exact-candidate
  automated suite.

## External/operator gates

- [ ] Candidate metadata and poster commit pushed with operator authorization
- [ ] CI workflow observed green for that exact commit
- [ ] Rollback-ready Sites version selected
- [ ] English and Spanish release copy reconciled with the exact artifact
- [ ] Operator approves Sites publication

Sites publication remains operator-mediated and is never performed
automatically.
