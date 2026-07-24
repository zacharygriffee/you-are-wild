# You Are Wild Active Objectives

This is the short handoff for unfinished work. Completed implementation history lives in `docs/changelog.md`; detailed mechanics and UI contracts live in the focused doctrine documents.

## Current State

- Source of truth: `app/src/`, `app/template.html`, tests, and docs.
- `dist/you-are-wild.html` is generated, ignored on `main`, and uploaded by CI.
- Current row/reach work is Row-Blocking V2: ranged Fight reaches front, protected back, and flying targets from either row; grounded close-contact Feast and Play/Seduce require front-row access; flying does not waive contact requirements.
- Core gameplay is deterministic and does not depend on an LLM or remote service.
- Startup navigation keeps play actions primary, nests AI Providers under Settings, shows Host Catalog only when a real host catalog is loaded, and preserves origin-aware returns. Development fixtures are not exposed as player features. Vertical scrolling is an accessibility fallback rather than the normal layout.
- System overlays now preserve a visible base-screen focus origin through nested flows and return keyboard focus after the destination screen is restored, including menu, character-creation, and live-game entry points.
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
- Death/Defeat V3 now owns versioned `active`, `incapacitated`, `captured`, `dead`, `recovering`, and `run-ended` outcomes across direct combat, persistent combat damage, containment, legacy save migration, pending recovery, and arbitrary future module/environment causes. Player death no longer cancels an encounter while companions can act: the remaining battle resolves first, its real outcome is recorded, survivors persist at the defeat location, and only then does recovery return the player alone. Explicit Drop Off and Rejoin use the same persistent tile contract. Recovery-bag/retain-inventory and scoped Hardcore deletion remain intact. End-to-end serialization coverage now crosses pending companion combat, post-settlement recovery, stranded survivor placement, partial death-bag collection, overworld and exact-room interior Drop Off/Rejoin, and multiple sparse-save recovery generations; focused resolver fixtures keep nonterminal module states separate from fatal environment outcomes and preserve cause identity through hooks and recovery bags. The real containment terminalizer is also locked: survivable player containment becomes releasable nonterminal `captured`, while fatal digestion enters shared recovery exactly once.
- Public Module Contract V1 now distinguishes legacy content-template keys from module-owned Scene Feed templates, exposes owned Scene Feed registration and unload cleanup, persists bounded provider-owned creation choices through full and sparse saves, admits validated Play variants through the public action-variant seam, and reports unreachable legacy templates at enable time. The maintained explicit module no longer advertises dead template routes, while a neutral fixture covers install, enable, creation selection persistence, executable Play use, actual Scene Feed matching, runtime restoration, disable, deletion, clean reinstall, and ownership cleanup without becoming player-facing content.
- Locale Pack V1 now provides module-owned locale definitions, dynamic language selection, English fallback during asynchronous module restoration, dependency-versioned core or module targets, stable cross-module key namespaces, bounded missing/obsolete diagnostics, and unload-safe fallback. A paired neutral conformance fixture covers file-compatible install, enable, selection, reload, dependency disable, and ownership cleanup.
- Interaction accounting now has a versioned machine-readable matrix for source/recipient resource ownership, success, committed failure, multi-target, and group costs. Direct combat Feed respects its selected target, mutual commands charge each participant once, and a newly contained unit resets stale containment lifecycle flags so repeated release/recontain cycles remain releasable without regenerating quest or merchant state.
- Contextual Feed, Feast, and Play group menus now expose a bounded pair-by-pair preview with exact actor/target names, availability or attempt clues, overflow disclosure, and one shared action-cost explanation per actor. The preview is presentation-only and leaves deterministic target ordering and accounting unchanged.
- Resource Ledger V1 now gives units bounded namespaced renewable state with
  permissioned module-owned profiles, deterministic digestion/hour/rest
  renewal, zero-start legacy migration, sparse and binary persistence, and
  dormant-value restoration across module disable/re-enable. Nurse is the
  first core consumer: it previews and spends one nourishment charge in
  addition to its cooldown.
- Combat Technique V1 now gives modules a bounded namespaced declarative Fight
  profile for capability/equipment eligibility, command-scoped reach, damage,
  split or full-area distribution, and one core-owned deterministic status.
  Basic Attack remains available; solo and group selections use the shared
  accessible variant surface, queued keys survive saves, and module unload
  removes profiles plus dependent queued work.
- Recovery Mode V1 now gives modules bounded namespaced declarative defeat
  outcomes while core retains terminal resolution and persistence. The
  built-in Ghost pilgrimage begins at the defeat site, applies consequences
  once, permits encounter-free ethereal travel, blocks ordinary living
  actions, and resurrects only at the validated safe shrine. Legacy saves and
  unavailable module-owned journeys fall back safely to ordinary recovery.
- Sprite Pack V1 now layers code-free species/ability/disposition art over
  Asset Bundle V1. Bounded state/facing animation strips use local leases,
  shared unit surfaces, reduced-motion handling, semantic text, and emoji
  fallback; disabling an owner restores presentation without changing saves.
- Balance acceptance now emits a schema-v2 deterministic reference in addition to survival and digestion pacing: effect per command, expected commands and current XP across a neutral resolution, Starving thresholds, and one-, two-, and four-target Fight values at every practice tier plus authored full-area behavior. Each multi-target row is cross-checked against the live runtime profile. Tend is condition-only care and restoring one full allied target pool now awards at most 20 support XP regardless of command count; self-care and no-op attempts award none.
- Focused quest/trade windows now localize their title, summary labels, item metadata, quantities, prices, quest-section headings, and empty states through the maintained English/Spanish registry. Responsive checks exercise the longer Spanish presentation at 20px under high contrast and reduced motion, and closing a transaction restores keyboard focus to the originating mobile actor/target rail after the composer rerenders.
- Passive stomach digestion now uses bounded hunger bands (`0.8x` sated, `1x` ordinary, `1.2x` hungry, `1.4x` starving), re-evaluates its pace after each nutrition-bearing tick, and exposes the effective rate in Containers. Fast and slow modes retain distinct pacing and identical size-scaled total nutrition.
- Quest givers and merchants now retain a versioned authored service origin. Containment suspends their service without deleting accepted quest state or stock; release away from that origin keeps Quest/Trade absent from lookup, transaction controls, status chips, map markers, deterministic observations, and narration availability metadata. Repeated swallow/release and save/load preserve the suspension, while returning the same NPC to its authored structure restores the unchanged service state.
- `Break Down` is the safe-content presentation of Mature `Chew`, not a separate nonterminal move. Its preview now discloses the all-remaining-Vitality consequence, and terminal outcomes consistently become recoverable remains and leave the living combat queue rather than persisting as zero-condition hostiles. Desktop and mobile target surfaces now identify a remains-only result consistently, including the localized mobile rail/dock label, count, and non-danger state while combat teardown is still pending.
- Map acceptance now executes start safety and recovery-anchor invariants against generator versions 2 and 3, walks between paired cave mouths through the generated reciprocal room graph, and verifies bounded connected cabin, ruins, burrow, manor, and dungeon interiors with exactly one surface exit.
- Dynamic Holdings, contained-detail, perk, Quest/Trade, party-management, and action-variant dialogs now expose visible localized purpose text through stable `aria-describedby` relationships. Real mobile and desktop viewport checks keep those relationships, focus containment, long Spanish labels, and horizontal-overflow bounds together.
- Mobile contextual action-variant dialogs run in the full 313–1024px responsive matrix under 20px Spanish, high contrast, and reduced motion. The browser gate verifies localized title/purpose relationships, focus containment and restoration, 44px option targets, bounded scrolling, and horizontal clipping alongside the accepted Mobile Interaction Flow V2 shell.
- Combat target-confirmation trays now run in the same responsive matrix for player and companion turns with one and multiple marked targets. Counted English/Spanish confirmation copy, readable primary/Cancel widths, 44px controls, preserved actor/target state, cancellation, and horizontal bounds are browser-verified on phones, tablets, compact desktop, and standard desktop.
- Core-generated quest fallback titles, objective actions/targets, numbered checkpoints, and giver labels now use the maintained locale registry. Generated provenance lets existing normalized quests re-resolve those fallbacks after a locale change without rewriting authored or module-supplied quest text; rendered Spanish coverage keeps the quest log bounded and free of English fallback leakage.
- Startup readiness snapshots now carry stable locale keys alongside unchanged diagnostic labels. Pending domain summaries, gated-control accessible names, and coded timeout Activity Log entries re-resolve under Spanish, while legacy injected navigation controls initialize from the active locale and retain system-command metadata.
- Low-traffic nameless-unit, unknown-map, and unknown-item fallbacks now use the maintained locale registry. Responsive Spanish coverage verifies type-specific visible and accessible names across desktop cards, mobile rails, and context dialogs.
- Character creation now exposes synchronized pressed state for species, identity, trait, provider-choice, and encounter-preference cards. Module-authored species presentation is escaped before entering the DOM, optional authored locale keys remain bounded to text lookup, and Spanish browser coverage verifies empty default-trait scaffolding without allowing contributed markup to execute. Interior coordinate context labels likewise use the maintained locale registry.
- Persistent game scaffolding now localizes visible and accessible Holdings, tile-detail, Scene Feed, traversal-group, and command-composer labels together. The Spanish 20px/high-contrast/reduced-motion browser pass verifies those labels without overflow.
- Feast containment now localizes its complete common lifecycle rather than only its option labels: player-versus-named grammar, Swallow/Digest/Release results, unavailable outcomes, Scene Beats, softened/terminal notices, and Holdings Activity Log entries resolve through maintained English/Spanish keys.
- Canonical Tend, Nurse, and Offer Piece outcomes now preserve player-versus-named grammar in English and Spanish, including stale-command capability/cooldown failures. Hidden legacy Feed aliases remain compatibility-only and are not being promoted as new core presentation.
- Container lists, consumed history, details, and compact summaries now translate bounded lifecycle/integrity values without changing persisted `contained`/`digesting`/`softened`/terminal state semantics or command metadata.
- Holdings Pack entries now use the maintained English/Spanish item-category labels instead of rendering raw internal category tokens. Authored and module-supplied item names and descriptions remain outside that core localization boundary.
- Capacity-limited Feast feedback now localizes its bounded nameless actor, owner, and target fallbacks instead of leaking English placeholders from compatibility-era unit records.
- Every literal `_label` key used by core and UI code is now registered in both maintained locales. The regression suite scans source ownership and fails on future fallback-only keys, covering lower-traffic combat corrections, Holdings ground/remains text, observation/recruitment Scene Beats, responsive target controls, presence helpers, row accessible names, and contextual variant scopes.
- Direct core-generated combat, encounter, structure, death/remains, synchronization, and perk Activity Log or Scene fallback prose now uses the maintained English/Spanish registry. A source guard prevents new literal English dialog, DOM-text, and Activity Log entry points without claiming authored or module-owned prose is translated.
- Direct Fight, Talk, and Play results now preserve player-versus-named grammar in both maintained locales. Synchronized group Fight, Talk, Play, and Feed results use the same active-locale contract without changing their deterministic mechanics or accounting.
- Combat turn headings, large-map creature/item summaries, Scene Feed punishment/healing/Spirit deltas, and unknown-biome fallback sentences now use maintained locale keys while preserving canonical state and authored identifiers.
- Legacy save/module interaction aliases now localize their bounded results while remaining hidden from canonical Feed/Feast selection and retaining content-category gates. Search result prose also uses maintained keys, with item acquisition tracked structurally rather than inferred from English text.
- Lightweight map presentation now has browser-level equivalence evidence against Textured presentation for base terrain, routes, blocked edges, and traversal decisions across mobile, desktop, and large-map surfaces. It loads no atlas layers, while degraded atlas startup remains non-blocking and writes an Activity Log diagnostic.
- Feed Contract V1 now has executable coverage for species-derived livestock willingness, ordinary-prey refusal, renewable-piece source condition, Nurse cooldown distribution, Offer Self containment/removal, sequential group capacity, same- and opposing-side support reach, hostile consumers, and durable group/combat Scene outcomes. An unspecified Feed is always Tend; consuming a selected companion requires explicit Offer Self and authored willingness.

## Active Objectives

### Immediate Next — Responsive UI, Accessibility, and Localization

Continue the evidence-led interface cleanup on the accepted Mobile Interaction
Flow V2 shell without reintroducing separate phone navigation models.

1. Resolve demonstrated clipping, overflow, collapsed-command, focus-order, accessible-name, and dialog-relationship defects across mobile and desktop command surfaces.
2. Keep blocked-command, touch-target, high-contrast, reduced-motion, 12–20px font, and longer-localized-label browser coverage green.
3. Move lower-traffic hardcoded player-facing strings into the maintained English/Spanish registry and preserve exact locale-key parity.
4. Preserve actor/target/composer state and restore logical focus when responsive panels, submenus, transaction windows, and dialogs close after rerendering their opener. Holdings now retains its opener across owner/tab/detail replacement and re-traps contained inspection; add another fixture only for a newly demonstrated dialog lifecycle defect.
   Tile Details, Save Manager, action-variant sheets, and mobile party context now also have browser-verified visible label/description relationships, modal background isolation, focus containment, and restoration.
   The expanded Scene Feed now has a bounded localized purpose description and browser-verified opener-to-dialog-to-opener focus flow rather than relying on programmatic open/close coverage.
   Shared confirmation and save-recovery dialogs preserve exact nested background state, isolate their parent modal from pointer and assistive navigation, and restore the parent focus trap when dismissed.
   The first-run/Help tutorial now exposes its changing title and description through a real modal relationship, announces step changes, isolates the underlying screen, and restores opener focus on Escape in the downloadable `file://` browser path.
   Settings, AI Providers, release notes, Activity Log, Mods, and Host Catalog now reference nonempty visible titles and descriptions; Host Catalog preserves those IDs through its runtime localized rerender instead of breaking the outer dialog relationship.
   The Mods URI importer now exposes a synchronized disclosure relationship, moves focus into the URI field on open, removes its collapsed region from the accessibility tree, and restores the invoking control on Cancel in the localized `file://` path.
   The AI Providers editor now exposes a localized heading and stable command identities, enters its first field on Add/Edit, restores Add after Save, and restores the matching profile's Edit control after Cancel despite rebuilding the provider list; real `file://` viewport coverage locks both paths.
   Holdings, contained-detail, perk, Quest/Trade, party-management, and action-variant dialogs now pair their visible title with a visible localized purpose description; rendered viewport checks resolve both relationships instead of accepting attribute-only markup.
   Mobile action-variant sheets now have a real marked-target Feast scenario at every phone/tablet viewport under maximum localized-text and accessibility pressure, including opener restoration and finger-sized controls.
   The live-game app menu now enters its first available command, supports Arrow/Home/End navigation, consumes those keys before traversal, and returns focus to its trigger on Escape.
   The shared focus trap now rejects hidden, inert, assistive-hidden, CSS-hidden, hidden-input, and negative-tab descendants, with unit and rendered Save Manager coverage.
   Host module compatibility and policy restrictions now retain stable diagnostics while exposing localized reason keys and bounded variables; Spanish `file://` browser coverage verifies Host Catalog origin, policy, provenance, type, status, and install presentation.
5. Keep the implemented Mobile Interaction Flow V2 green as one state-aware Roster sheet plus the persistent context composer. Preserve the accepted Party/Here/Items and Allies/Enemies tab grammar, selection/focus behavior, and accessibility gates; do not reintroduce separate phone Party and Creatures destinations. UI Contribution V1 now exposes only the five accepted bounded declarative slots; retain its collision, policy, callback, unload, file-origin, and rendered accessibility acceptance.

### UI

1. Continue UI polish, accessibility, and localization as one workstream.
2. Resolve remaining actionable Node diagnostic assertions and distinguish product regressions from obsolete test expectations.
   The current diagnostic suite is clean: mobile party management now has a task-and-companion dialog title, state-aware combat rail expectations follow the shared presenter, and the DOM/localization fixtures match browser attribute semantics plus maintained quest and Feed keys.
3. Maintain automated mobile and desktop regression coverage for blocked commands, clipping, overflow, touch targets, high contrast, reduced motion, and 12-20px font scaling without treating incremental patches as the future phone-flow redesign. Include combat target-confirmation trays for player and companion turns, one and many marked targets, English and longer localized labels, and narrow desktop stages: primary confirmation and Cancel must retain readable widths instead of collapsing into a 70px multi-line column.
   Player and companion Fight target trays now cover one and many marked targets throughout the 313–1365px matrix under 20px Spanish, high contrast, and reduced motion; counted confirmation copy and dedicated desktop tray tracks prevent the primary and Cancel controls from collapsing.
4. Audit lower-traffic keyboard order, visible focus, accessible names, dialog relationships, and focus restoration.
5. Move remaining hardcoded user-facing strings into the matching English/Spanish registry and keep locale key parity passing. New-character log initialization is now covered alongside direct log pushes, dialogs, DOM text, and interaction results.

### Mechanics/Core

1. Continue manual longer-save playtests for Death/Defeat V3. Automated coverage now locks save/resume before and after companion settlement, repeated bags, full-pack partial retrieval without gold duplication, interior defeat placement, multiple sparse-save recovery generations, legacy state migration, scoped Hardcore deletion, nonterminal module-authored states, and fatal environment causes carried through hooks, companion settlement, and death bags. Add another fixture only when a genuinely new terminal consequence or persistence boundary appears rather than duplicating these paths.
2. Continue manual Drop Off, Rejoin, and defeat-stranded companion playtests across overworld and interiors. Automated coverage now locks overworld save/load/rejoin plus surface resume, structure re-entry, route traversal, exact-room discovery, rejoin removal, and a second reload for interiors. Follow-up work may add roster maps, rescue/capture routes, or companion extraction, but must preserve persistent tile placement as the baseline.
3. Continue the interaction-wide balance matrix using `docs/balance-scenario-baseline.md` for comparisons. It now covers command ownership, group/multi-target accounting, current Feed variants, condition-only Tend with bounded net-effect support XP, Nurse's Resource Ledger V1 reserve, bounded hunger-scaled stomach digestion with visible pacing and total-nutrition parity, a neutral action-resolution/XP reference, and every multi-Fight practice tier. `docs/feed-source-economy-decision.md` records the accepted Tend split and the implemented Nurse reserve boundary.
4. Harden multi-creature interaction edge cases only where behavior contradicts `docs/multi-interaction-regression-matrix.md`.
5. Continue Feed Contract V1 playtesting before extending it. The canonical actor-to-target direction, contextual Tend/Nurse/Offer Self/Offer Piece variants, hidden compatibility aliases, explicit-willingness boundary, sequential group distribution, capacity failures, survival removal, support reach, and Scene Feed outcomes are now regression-locked. Follow-up should add a fixture only for a newly demonstrated contradiction or persistence boundary. Coercive or explicit framing remains an opt-in rated provider/variant; core state and default presentation stay neutral.
6. Continue hardening the contextual action-variant orchestrator. Feed, Feast, Play, and declarative Combat Technique V1 Fight choices now remain stable primary buttons with accessible submenus. Reach, capacity, willingness, resistance, equipment, and technique limits remain clues; physically meaningful commands commit and resolve success or failure through the Scene Feed instead of disappearing as composer errors. Group menus retain bounded previews and once-per-actor accounting. Preserve Back/Cancel state and keep module variants inside validated owned registries.
7. Playtest Combat Technique V1 across equipment loss, protected rows, flying targets, split/full-area attacks, deterministic status expiry, queued group save/restore, and module unload. Snare/grab/pull, new blockers, and deeper back-row defensive value still require a separate design decision.
8. Design gameplay-bearing SFW body builds separately from stat-oriented traits. Explicit anatomy remains optional-provider gated.
9. Reproduce and close the hostile-encounter activation gap seen in operator play: a living `Hostile` unit can remain on the current tile while combat is inactive and the composer reports `Select a living actor`. Hostile tile entry is expected to start combat except during an explicit recovery journey. Test zero-vitality/defeat settlement, combat teardown, revisits, and save/resume; if combat is intentionally suppressed, present the recovery reason instead of an ordinary encounter and exploration composer.

### Features

1. Use `docs/feature-placement.md` to classify expansion proposals before implementation.
2. Continue public mod-context and example hardening for narrative, structural, and asset/content-pack lanes.
3. Strengthen deterministic map playability: start-area invariants, traversal metadata, roads/bridges/coasts, POI budgets, routes, and encounter pressure.
4. Keep advanced quests, companion loadouts, richer party roles, Feast extensions, generated narrative, advanced interiors, and major asset packs deferred until placement is decided.
5. Narration engine seams, exclusive first-party orchestrators, lifecycle reset, the dedicated AI Providers panel, Puter, and session-only browser-direct OpenAI-Compatible text connections now exist. Gather playtest feedback on that lifecycle before adding OAuth, relays, MCP, image/video/audio providers, or localhost sidecars.
6. After player-POV narration has enough playtest coverage, consider a narrator perspective setting with explicit player, first-person, third-person-limited, and cinematic modes. Keep player POV as the default and preserve the structured viewpoint-role contract across modes.
7. Continue representative coast, cave, building-interior, and authored-pack visual review for Tileset Pack V1 when those states surface in operator play. The 2026-07-23 live route/POI sample passes at 1280×720 and 390×844, including the 17×17 review map; its accessible center-cell action density is deferred to Mobile Interaction Flow V2 rather than “fixed” by shrinking touch targets. Automated acceptance records current offline/hosted/atlas bytes, estimates the Lightweight/Textured low-bandwidth difference, proves immutable hosted cache reuse, proves Lightweight makes no atlas requests, and keeps degraded startup non-blocking. Keep reduced-motion and emoji/text fallbacks intact.
8. Playtest Interior Skin V1 across huts, manors, and dungeons now that built structures use continuous masonry floors, perimeter walls with reciprocal openings, and restrained exit thresholds. Author richer structure-specific or mod-pack variants only after the room grammar proves legible; keep cave networks independent.
9. Playtest Terrain Transition V1 against straight coasts, peninsulas, coves, islands, and diagonal contacts. If the metadata grammar is sound, generalize the same material-pair seam to grass/sand, snow/rock, and swamp/plains without hard-coding biome pairs.
10. Sprite Pack V1 is implemented as a code-free Asset Bundle presentation with semantic unit, state, facing, bounded strip-animation, reduced-motion, local-lease, and emoji-fallback contracts. Playtest real authored packs before adding action-specific states, diagonals, or skeletal animation.
11. The owned `media:provide` adapter seam is implemented. Keep concrete later providers ordered in backlog: AI generation as a reviewed Source at priority 3; Electron, Pear, or another packaged-runtime bridge at priority 4; and OPFS as an optional browser-storage optimization at priority 5. None may become a prerequisite for the downloaded `file://` game.
12. Extend asset/content-pack presentation seams. Optional packs may eventually provide richer tilesets, sprites, portraits, audio, animated 2D media, and capability-gated 3D scenes, but their presentation formats must remain independent from storage providers and the bundle envelope.
13. Consider archive transport only after real bundle use shows that individually hashed URI resources are insufficient. Archives still need unpacked-size budgets and safe relative paths; publisher signatures and community update discovery remain separate work.
14. Recovery Mode V1 and the opt-in Ghost pilgrimage are implemented. Continue
    only for a demonstrated recovery contradiction or a separately authorized
    new profile capability; do not reopen core defeat callbacks.
15. Consider later recovery variants through the same resolver rather than separate death code: surviving companions can extract the player, a healer/faction can resurrect them for a coin debt or quest obligation, and a prior body/death bag can become a map landmark. These are downstream content hooks, not V2 baseline requirements.
16. Continue the accepted [Mobile Interaction Flow V2](mobile-interaction-flow-v2-decision.md) and [UI Contribution V1](ui-contribution-v1.md): one state-aware Roster sheet with Party/Here/Items or Allies/Enemies tabs, a persistent core-owned place composer, and only five bounded declarative module slots. Do not expand into dock, traversal, Scene Feed, or combat-confirmation ownership without a new product decision.
17. Before the next Sites publication, resolve the
    [Ghost recovery product decision](ghost-recovery-prepublish-decision.md).
    The current bounded implementation remains testable, but publication must
    not silently decide shrine identity, companion outcomes, resurrection
    economy, or how an active Ghost journey explains suppressed encounters.
17. Playtest Locale Pack V1 with a real maintained third language before bundling another locale. Keep English as the offline core fallback, require stable target namespaces and dependency-version floors for cross-module translations, and use diagnostics rather than silently accepting stale key coverage.

### Release / Distribution

1. Continue preserving immutable, rollback-ready hosted artifacts through the established Sites version workflow; publishing remains operator-mediated.
2. Keep the Sites-only newest-first development changelog synchronized with staged and published builds. Distinguish queued versus live changes, expose dates and optional source commits, and be ready to defer to or link into a future public GitHub changelog.
3. Continue the browsable numbered archive as releases accumulate. The bundled offline surface may continue to prioritize the current release.

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

- `docs/backlog-completion-audit.md`
- `docs/immediate-backlog-plan.md`
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
- `docs/interaction-balance-matrix.md`
- `docs/combat-technique-v1.md`
- `docs/recovery-mode-v1.md`
- `docs/sprite-pack-v1.md`
- `docs/balance-scenario-baseline.md`
- `docs/multi-interaction-regression-matrix.md`
- `docs/map-tileset-acceptance.md`
- `docs/feast-containment-v2.md`
- `docs/save-sparse-delta.md`
- `docs/testing.md`
