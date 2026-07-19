# You Are Wild Active Objectives

This is the short handoff for unfinished work. Completed implementation history lives in `docs/changelog.md`; detailed mechanics and UI contracts live in the focused doctrine documents.

## Current State

- Source of truth: `app/src/`, `app/template.html`, tests, and docs.
- `dist/you-are-wild.html` is generated, ignored on `main`, and uploaded by CI.
- Current row/reach work is Row-Blocking V2: ranged Fight reaches front, protected back, and flying targets from either row; grounded close-contact Feast and Play/Seduce require front-row access; flying does not waive contact requirements.
- Core gameplay is deterministic and does not depend on an LLM or remote service.
- Startup navigation keeps play actions primary, nests AI Providers under Settings, shows Host Catalog only when a real host catalog is loaded, and preserves origin-aware returns. Development fixtures are not exposed as player features. Vertical scrolling is an accessibility fallback rather than the normal layout.
- Startup readiness is scoped rather than global: saved games, installed media, restored modules, and bundled tiles are independently timed; dependent menu actions wait with accessible status and retry behavior while unrelated help, settings, diagnostics, and release surfaces remain available.
- Future implementation slices must run `npm run full-build`, `npm run audit:branding`, and `git diff --check`. Layout changes also require browser smoke at `412x915` and `1365x768`.
- First-party narration references now include provider-backed Simple Narrator, offline Template Narrator, and opt-in Narration Diagnostics. Simple Narrator's Storyteller, Character reactions, and Hybrid profiles have explicit contracts, while mod instructions remain bounded and cannot override viewpoint, profile, deterministic, policy, plain-text, or output-length constraints.
- Simple Narrator promotes ready tile observations into the center passage and reuses a bounded state-fingerprinted cache for unchanged revisits. Changed visible tile state restores deterministic text and produces a fresh observation before narration is requested again.
- The Mod Manager can explicitly review and install HTTPS or localhost URI packages. Acquisition is bounded, credentialless, redirect-free, digest-recorded, and copied into IndexedDB; installs and updates never auto-enable or hotlink their source.
- Media Repository V1 now provides content-addressed catalog/ref tracking, staged IndexedDB payload storage, reviewed HTTPS/loopback HTTP acquisition, a capability-checked endpoint/sidecar adapter, cached object-URL leases, module ownership cleanup, and `media:read` access.
- Asset Bundle V1 adds a code-free URI manifest, per-resource integrity and quotas, relative source resolution, licensing/provenance, same-bundle fallbacks, target-module ownership, reviewed local installation, health/repair status, replacement, and cleanup. Tileset Pack V1 is its first bounded presentation consumer.
- Tileset Pack V1 now validates atlas geometry and transforms during review, acquires local Media Repository leases during module activation, composes opaque terrain with transparent topology/state layers across partial pack overrides, restores prior candidates on disable, embeds both offline first-party atlases, and paints cardinal routes, blocked edges, and topology-derived interiors across desktop, mobile, large maps, and interiors with emoji fallback. A real URI fixture covers install, replacement, persistence, and restoration.
- Coast presentation now composes neutral reusable sand with immediate-water cardinal shoreline semantics. Danger sites use one anchor marker plus bounded regional influence, while immediate live threats remain a separate state.
- Traversal Surface Geometry V1 now gives mobile and desktop equal square 3x3 map tracks. Desktop location prose lives in a sibling focus panel instead of forcing the current map cell to become oversized; mobile presence remains compact and contained. Combat continues to use the full stage.
- The group-interaction regression gate is restored: combat micro-cards retain actor selection, collective combat plans may mark multiple targets, each participant pays once and contributes to every valid mark at slowest-participant timing, queued target lists survive saves, impossible reach remains a non-consuming correction, and interior generator v2 removes surface-biome POIs from deterministic room graphs.

## Active Objectives

### UI

1. Continue UI polish, accessibility, and localization as one workstream.
2. Resolve remaining actionable Node diagnostic assertions and distinguish product regressions from obsolete test expectations.
3. Device-test mobile density, save slots, Holdings, combat rails/toolbelt, long labels, toast timing, high contrast, reduced motion, and 12-20px font scaling.
4. Audit lower-traffic keyboard order, visible focus, accessible names, dialog relationships, and focus restoration.
5. Move remaining hardcoded user-facing strings into the matching English/Spanish registry and keep locale key parity passing.

### Mechanics/Core

1. Playtest the size-scaled containment nutrition and rest-time digestion baseline before further retuning hunger, Spirit, action costs, recovery, XP, reward pacing, creature size, containment capacity, and Fight/Play/Feed/Feast/Flee tradeoffs.
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
7. Playtest Tileset Pack V1 for crop legibility, marker contrast, route recognition, low-bandwidth cost, and pack-author ergonomics before expanding the schema. Keep reduced-motion and emoji/text fallbacks intact.
8. Playtest Interior Skin V1 across huts, manors, and dungeons now that built structures use continuous masonry floors, perimeter walls with reciprocal openings, and restrained exit thresholds. Author richer structure-specific or mod-pack variants only after the room grammar proves legible; keep cave networks independent.
9. Playtest Terrain Transition V1 against straight coasts, peninsulas, coves, islands, and diagonal contacts. If the metadata grammar is sound, generalize the same material-pair seam to grass/sand, snow/rock, and swamp/plains without hard-coding biome pairs.
10. Define a separate Sprite Pack contract only after deciding the baseline character silhouette, facing, action-state, animation, and accessibility needs. Do not overload Tileset Pack V1 with actors or animation.
11. Keep later media providers ordered in backlog: AI generation as a reviewed Source at priority 3; Electron, Pear, or another packaged-runtime bridge at priority 4; and OPFS as an optional browser-storage optimization at priority 5. None may become a prerequisite for the downloaded `file://` game.
12. Extend asset/content-pack presentation seams. Optional packs may eventually provide richer tilesets, sprites, portraits, audio, animated 2D media, and capability-gated 3D scenes, but their presentation formats must remain independent from storage providers and the bundle envelope.
13. Consider archive transport only after real bundle use shows that individually hashed URI resources are insufficient. Archives still need unpacked-size budgets and safe relative paths; publisher signatures and community update discovery remain separate work.

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
- `docs/media-repository.md`
- `docs/asset-bundle-v1.md`
- `docs/tileset-pack-v1.md`
- `docs/ai-providers.md`
- `docs/scene-feed-dsl.md`
- `docs/holdings-model.md`
- `docs/balance-cost-doctrine.md`
- `docs/feast-containment-v2.md`
- `docs/save-sparse-delta.md`
- `docs/testing.md`
