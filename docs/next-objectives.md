# You Are Wild Active Objectives

This is the short handoff for unfinished work. Completed implementation history lives in `docs/changelog.md`; detailed mechanics and UI contracts live in the focused doctrine documents.

## Current State

- Source of truth: `app/src/`, `app/template.html`, tests, and docs.
- `dist/you-are-wild.html` is generated, ignored on `main`, and uploaded by CI.
- Current row/reach work is Row-Blocking V2: ranged Fight reaches front, protected back, and flying targets from either row; grounded close-contact Feast and Play/Seduce require front-row access; flying does not waive contact requirements.
- Core gameplay is deterministic and does not depend on an LLM or remote service.
- Startup navigation keeps play actions primary, nests AI Providers under Settings, shows Host Catalog only when a real host catalog is loaded, and preserves origin-aware returns. Development fixtures are not exposed as player features. Vertical scrolling is an accessibility fallback rather than the normal layout.
- Future implementation slices must run `npm run full-build`, `npm run audit:branding`, and `git diff --check`. Layout changes also require browser smoke at `412x915` and `1365x768`.
- First-party narration references now include provider-backed Simple Narrator, offline Template Narrator, and opt-in Narration Diagnostics. Simple Narrator's Storyteller, Character reactions, and Hybrid profiles have explicit contracts, while mod instructions remain bounded and cannot override viewpoint, profile, deterministic, policy, plain-text, or output-length constraints.
- Simple Narrator promotes ready tile observations into the center passage and reuses a bounded state-fingerprinted cache for unchanged revisits. Changed visible tile state restores deterministic text and produces a fresh observation before narration is requested again.

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
4. Design gameplay-bearing SFW body builds separately from stat-oriented traits. Explicit anatomy remains optional-provider gated.

### Features

1. Use `docs/feature-placement.md` to classify expansion proposals before implementation.
2. Continue public mod-context and example hardening for narrative, structural, and asset/content-pack lanes.
3. Strengthen deterministic map playability: start-area invariants, traversal metadata, roads/bridges/coasts, POI budgets, routes, and encounter pressure.
4. Keep advanced quests, companion loadouts, richer party roles, Feast extensions, generated narrative, advanced interiors, and major asset packs deferred until placement is decided.
5. Narration engine seams, exclusive first-party orchestrators, lifecycle reset, the dedicated AI Providers panel, Puter, and session-only browser-direct OpenAI-Compatible text connections now exist. Gather playtest feedback on that lifecycle before adding OAuth, relays, MCP, image/video/audio providers, or localhost sidecars.
6. After player-POV narration has enough playtest coverage, consider a narrator perspective setting with explicit player, first-person, third-person-limited, and cinematic modes. Keep player POV as the default and preserve the structured viewpoint-role contract across modes.
7. Establish a lightweight default graphics layer: small local 2D tiles, sprites, icons, and restrained animation with text/emoji fallbacks, reduced-motion support, low-bandwidth operation, and no dependency on WebGL. Keep terrain and gameplay semantics independent from the selected art.
8. Extend asset/content-pack mod seams so optional packs can provide richer tilesets, animated 2D media, and eventually capability-gated 3D models or scenes. Define performance budgets, fallback assets, provenance/licensing metadata, accessibility behavior, runtime capability checks, and cleanup/storage limits before treating heavyweight packs as supported.
9. Design explicit user-initiated remote mod import from an HTTPS or permitted localhost package URI. Download and validate the package once, then install its package and owned assets into IndexedDB so play never hotlinks runtime media. Require CORS, bounded download and unpacked sizes, redirect/origin policy, integrity or signature metadata, manifest and game-version validation, permission/content-rating review, atomic installation, and explicit update/removal flows. Remote URIs must never auto-install, auto-update, or execute before the player confirms trust.

### Release / Distribution

1. Preserve immutable, rollback-ready hosted artifacts when the publishing workflow is formalized; publishing remains operator-mediated.
2. Add a browsable archive when more than one player-facing release record exists. The bundled offline surface may continue to prioritize the current release.

## Operator-Mediated Decisions

- Detailed mechanics balance and acceptable difficulty/pressure targets.
- Final body-build taxonomy and preference model.
- Core versus first-party module versus third-party seam placement.
- New row/reach mechanics beyond current doctrine.
- Final translation review, physical-device acceptance, brand/legal clearance, release, publishing, commit, and push.

## Autonomous Work Boundary

Agents may fix demonstrated regressions, add tests, improve accessibility/localization coverage, maintain docs, harden safe mod APIs, and run local verification. Agents must not invent decision-heavy balance, expand explicit content, hand-edit generated dist, make legal claims, or publish without operator authorization.

The content-boundary migration follows `docs/content-posture-and-providers.md`.
Core owns SFW and Mature presentation; explicit presentation and sexually framed
mechanics belong to optional providers and must not be added to the default
generated artifact.

## References

- `docs/changelog.md`
- `docs/control-model.md`
- `docs/combat-row-reach-audit.md`
- `docs/modding.md`
- `docs/ai-providers.md`
- `docs/scene-feed-dsl.md`
- `docs/holdings-model.md`
- `docs/balance-cost-doctrine.md`
- `docs/feast-containment-v2.md`
- `docs/save-sparse-delta.md`
- `docs/testing.md`
