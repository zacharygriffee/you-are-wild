# You Are Wild Active Objectives

This is the short handoff for unfinished work. Completed implementation history lives in `docs/changelog.md`; detailed mechanics and UI contracts live in the focused doctrine documents.

## Current State

- Source of truth: `app/src/`, `app/template.html`, tests, and docs.
- `dist/you-are-wild.html` is generated, ignored on `main`, and uploaded by CI.
- Current row/reach work is Row-Blocking V2: ranged Fight reaches front, protected back, and flying targets from either row; grounded close-contact Feast and Play/Seduce require front-row access; flying does not waive contact requirements.
- Core gameplay is deterministic and does not depend on an LLM or remote service.
- Future implementation slices must run `npm run full-build`, `npm run audit:branding`, and `git diff --check`. Layout changes also require browser smoke at `412x915` and `1365x768`.

## Active Objectives

### UI

1. Continue UI polish, accessibility, and localization as one workstream.
2. Resolve remaining actionable Node diagnostic assertions and distinguish product regressions from obsolete test expectations.
3. Device-test mobile density, save slots, Holdings, combat rails/toolbelt, long labels, toast timing, high contrast, reduced motion, and 12-20px font scaling.
4. Audit lower-traffic keyboard order, visible focus, accessible names, dialog relationships, and focus restoration.
5. Move remaining hardcoded user-facing strings into the matching English/Spanish registry and keep locale key parity passing.

### Mechanics/Core

1. Gather playtest data before retuning hunger, Spirit, action costs, recovery, XP, reward pacing, creature size, containment capacity, and Fight/Play/Feed/Feast/Flee tradeoffs.
2. Harden multi-creature interaction edge cases only where behavior contradicts current actor-target-intent doctrine.
3. Later, audit equipment reach, reach traits, snare/grab/pull, area distribution, blockers, and back-row defensive value. Do not expand row mechanics without a design decision.
4. Design gameplay-bearing SFW body builds separately from stat-oriented traits. Explicit anatomy remains content-tier gated and module-capable.

### Features

1. Use `docs/feature-placement.md` to classify expansion proposals before implementation.
2. Continue public mod-context and example hardening for narrative, structural, and asset/content-pack lanes.
3. Strengthen deterministic map playability: start-area invariants, traversal metadata, roads/bridges/coasts, POI budgets, routes, and encounter pressure.
4. Keep advanced quests, companion loadouts, richer party roles, Feast extensions, generated narrative, advanced interiors, and major asset packs deferred until placement is decided.

## Operator-Mediated Decisions

- Detailed mechanics balance and acceptable difficulty/pressure targets.
- Final body-build taxonomy and preference model.
- Core versus first-party module versus third-party seam placement.
- New row/reach mechanics beyond current doctrine.
- Final translation review, physical-device acceptance, brand/legal clearance, release, publishing, commit, and push.

## Autonomous Work Boundary

Agents may fix demonstrated regressions, add tests, improve accessibility/localization coverage, maintain docs, harden safe mod APIs, and run local verification. Agents must not invent decision-heavy balance, expand explicit content, hand-edit generated dist, make legal claims, or publish without operator authorization.

## References

- `docs/changelog.md`
- `docs/control-model.md`
- `docs/combat-row-reach-audit.md`
- `docs/modding.md`
- `docs/scene-feed-dsl.md`
- `docs/holdings-model.md`
- `docs/balance-cost-doctrine.md`
- `docs/feast-containment-v2.md`
- `docs/save-sparse-delta.md`
- `docs/testing.md`
