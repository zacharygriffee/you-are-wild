# Core Game Maturity Acceptance

Status: **local acceptance complete on 2026-07-25; release handoff is
operator-gated**

This record closes the dependency-ordered Core Game Maturity implementation
program against the exact local worktree. It does not assign a release
version, authorize a commit or push, claim remote CI evidence, or authorize a
Sites deployment.

## Accepted mechanic surfaces

| Surface | Evidence |
| --- | --- |
| Starter and danger contract | Canonical scenario baselines, weakest-starter multi-seed checks, current Generator V6 inheritance of the protected V4 opening contract, and localized current/adjacent danger metadata |
| Items and economy | Stable definition and instance identity, bounded stacks and capacity, honest core purposes and acquisition, healing effects, quest-item protection, merchant/loot/search routes, legacy aliases, and missing-provider recovery |
| Quests | Six-state lifecycle, deterministic procedural archetypes, bounded authored stages, stable giver/destination/reward state, physical turn-in policies, service suspension, duplicate-reward protection, and one-time party-attributed hostile resolution across slaying, subdual, and containment |
| Review Map | Known-world quest, giver, turn-in, structure, danger, party, recovery, and POI layers; tracked guidance; operable cells; inspector; zoom, pan, recenter, filters, desktop dock, and mobile sheet |
| Companion behavior | Separate Duty, Stance, and Control; deterministic legal-action scoring; recruitment continuity; bounded exploration reactions; shared manual/autonomous validation; provider fallback; containment, drop-off, defeat, and save behavior |
| Progression and perks | Versioned effects, visible-only frontier, deterministic eligibility, anti-farming boundaries, apply/rollback, free confirmed alpha respec, cheat isolation, localization, and module lifecycle |
| Progressive tutorial | State-derived lessons, replay/reset/read state, cards, interactions, combat, rows, groups, items, equipment, quests, map, companions, perks, containment, recovery, strategy tips, and point-of-choice help |
| Save and module lifecycle | Published 0.14 fixture, sparse/current saves, quest/combat/death/containment/drop-off states, and representative safe, mature, locale, item, species, narration, graphics, and provider-failure scenarios |

## Accessibility and delivery evidence

- Viewport acceptance covers 320px, 390px, and 412px mobile layouts plus
  desktop presentation, keyboard operation, touch targets, enlarged text,
  high contrast, reduced motion, and long Spanish copy.
- Direct in-app browser checks covered the two-column desktop tutorial and the
  bounded mobile tutorial. The active-lesson contrast defect discovered
  during that pass was corrected.
- Browser console inspection found no application runtime errors; the only
  observed message was the generic Electron development CSP warning.
- `npm run full-build` passed the complete core, lint, viewport, interaction,
  map, tileset, generated-artifact, offline-single-file, and hosted-runtime
  checks.
- `npm --prefix site test` passed all five server-render and host-package
  checks, including host mods remaining disabled by default.
- `npm run audit:branding` and `git diff --check` passed.
- The generated downloadable file remains offline-capable, and the hosted
  artifact retains its stable external cache contract.

## Deliberate exclusions

- Broad external and physical-phone playtesting remains observational work for
  balance, pacing, clarity, and enjoyment rather than a substitute for the
  accepted contracts.
- Crafting, emotional-state evolution, new difficulty profiles, arbitrary
  module callbacks, new perk/effect vocabulary, and new recovery economies
  remain deferred.
- Provider-backed companion control remains optional. Deterministic autonomy
  is the canonical offline fallback, and Manual remains an explicit escape
  hatch.

## Operator release handoff

No core-mechanic decision blocks handoff. The following actions require
operator direction:

1. Version decision resolved: this compatible gameplay program forms the
   0.16.0 minor line while Save Schema 11 and Module API 1 remain unchanged.
2. Core implementation commit and push completed at `f0f79c4`.
3. Observe and record green remote CI for the exact release-candidate commit.
4. Reconcile and validate the 0.16 release artifact, metadata, localized notes,
   poster, compatibility text, and Sites changelog.
5. Select and record the rollback artifact/version.
6. Authorize Sites publication.
