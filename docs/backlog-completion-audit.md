# Backlog Completion Audit

This is a requirement-to-evidence index for the active backlog. It prevents
completed foundations from being reopened without a demonstrated contradiction
and prevents deferred/operator-gated features from being mistaken for missing
implementation.

## Acceptance status

| Dependency phase | Current evidence | Status / remaining gate |
| --- | --- | --- |
| Public Module Contract V1 | `docs/modding.md`; neutral conformance and locale-pack fixtures; tests for Scene template ownership, creation persistence, Play dispatch, save/reload, disable/delete/reinstall, dependency floors, namespace diagnostics, and unload cleanup | Automated acceptance complete. Continue only for a demonstrated third-party contradiction. |
| Death/Defeat V3 and companions | Shared resolver, recovery policies, scoped Hardcore deletion, death bags, pending companion settlement, Drop Off/Rejoin, sparse/full save compatibility, module/environment cause identity | Automated acceptance complete for documented V3 boundaries. Longer operator saves remain observational rather than an implementation blocker. |
| Interaction and Feed Contract V1 | Shape matrix, selected actor/target direction, self/mixed targets, many-to-many ordering, partial failure, queued invalidation, committed in-world failure, one-cost/one-practice accounting, canonical Feed variants, bounded pair-by-pair availability and once-per-actor cost previews | Automated acceptance complete for the current grammar. Add fixtures only for a newly demonstrated contradiction. |
| Digestion and survival pacing | Fast/slow total-nutrition parity, size scaling, rest acceleration, empty-rest hunger, bounded hunger-rate bands, visible rate, containment terminal/nonterminal separation | Automated acceptance complete for current formulas. Numeric retuning remains operator-mediated. |
| Balance instrumentation | Schema-v2 scenario report, neutral command/effect/XP reference, every multi-Fight practice tier, interaction resource matrix | Tend is now condition-only care with net-effect support XP capped across one full target pool and no self/no-op reward. Remaining nutrition-bearing reserve design is deferred. |
| Responsive UI, accessibility, localization | 313–1365px viewport matrix; 12–20px text; English/Spanish key parity and source guards; touch targets; high contrast; reduced motion; dialog relationships, isolation, focus trap/restoration, and file-origin browser flows | Current diagnostic gates clean. Mobile Interaction Flow V2 and its five bounded UI Contribution V1 slots are implemented; final rendered contribution acceptance is in progress. |
| Map, tileset, interior, and terrain | Deterministic start/recovery anchors; traversal and interior graph tests; Textured/Lightweight/partial-pack semantic equivalence; degraded fallback; artifact audit; cold/cache/zero-atlas browser fixtures; live route/POI desktop/mobile review | Automated acceptance complete. Continue coast/cave/building/art-pack visual review when representative states surface in operator play. |
| Optional/deferred contracts | Feature-placement doctrine, Media Repository, Asset Bundle V1, Tileset Pack V1, Sprite Pack V1, Locale Pack V1, Resource Ledger V1, Combat Technique V1, Recovery Mode V1, narration ownership and provider seams | Implement only after the named prerequisite and operator decision. Mobile UI contribution slots, new row/reach rules beyond technique-scoped profiles, Offer Piece mass-ledger replacement, and concrete new media-provider implementations remain in the active goal order. |
| Delivery | Full build, viewport, interaction, branding, artifact, and diff gates | Local gates are green. Commit, push, versioning, and Sites publication remain explicitly operator-authorized. |

## Cross-cutting invariant ledger

`Proved` means the cited executable acceptance currently passes and directly
exercises the invariant. `Operator-gated` means the prerequisite foundation is
proved but the named product/design choice has not been authorized; it is not
an invitation to infer a default.

| Required invariant | Authoritative implementation / doctrine | Direct executable evidence | Status |
| --- | --- | --- | --- |
| Downloaded `file://` play remains viable | Runtime-origin checks in `module-system.js` and `openai-compatible-provider.js`; embedded offline atlas; origin-aware startup and system navigation | `File origin permits no-auth loopback Ollama-style providers and rejects remote providers`; `Module runtime requirements preserve file play and gate secure server modules`; `viewport-check.js` first-run, Locale Pack, tutorial, URI importer, provider editor, and Host Catalog file-origin flows | Proved |
| Existing saves remain readable where compatibility is required | `serialization.js`, sparse save records, normalized legacy defeat/containment/module metadata | `Binary load tolerates old saves without world data`; `Binary save compatibility metadata preserves multi-action practice and module creation choices`; `Death resolver migrates legacy state and resolves a pending terminal outcome once`; `Containment adapter normalizes existing stomach prey saves without data loss`; sparse/full save-load fixtures | Proved |
| Content boundaries remain provider-owned | `content-posture-and-providers.md`, content-policy registry, rating-gated module lifecycle | `Settings default SFW while neutral mechanics remain core and optional policy is provider-driven`; `First-party explicit provider is a valid optional module and is excluded from the default build`; `Module action variants follow manifest content policy and unload on policy downgrade`; branding audit | Proved |
| Module contributions are owned and unload cleanly | `module-system.js`, `story-events.js`, `content-system.js`, Media Repository ownership records, `docs/modding.md` | Neutral module and Locale Pack conformance fixtures; `Module Scene Feed templates are permissioned namespaced and removed on unload`; `Module action variant registration is permissioned bounded owned and executable`; asset/media replacement and cleanup fixtures | Proved |
| Core mechanics stay deterministic and service-independent | Seeded world/combat/interaction resolvers; provider output is presentation-only and Scene Beats retain deterministic facts | `Deterministic world generation paths do not use Math.random`; deterministic combat damage/status/encounter fixtures; `Narrative modules receive bounded serializable public context`; `OpenAI-compatible adapter composes immutable constraints before mod instructions`; offline Template Narrator fixture | Proved |
| Responsive commands and recovery remain usable and perceivable | Shared command composer, focus trap/restore, maintained locale registries, viewport and interaction matrices | `npm --prefix app run test:viewport`; `npm --prefix app run test:interactions`; locale-key parity and source-literal guards; dialog relationship, touch-target, high-contrast, reduced-motion, and horizontal-overflow assertions | Proved |
| Map topology remains playable independently of artwork | Versioned generator/traversal rules, semantic tileset keys, Lightweight fallback, sparse deterministic deltas | Start/recovery invariant, reciprocal cave/interior graph, road/bridge/coast traversal, partial-pack fallback, Lightweight/Textured equivalence, and map artifact acceptance fixtures | Proved |
| Delivery mutations require explicit authority | `docs/next-objectives.md` autonomous boundary and Sites workflow | Local verification commands below; no test or build command stages, commits, pushes, versions, or deploys | Proved locally; commit/push/version/Sites remain operator-gated |

## Deferred decision ledger

These foundations are ready, but implementation must wait for the corresponding
operator-mediated decision:

| Deferred work | Proved prerequisite | Missing authorization / decision |
| --- | --- | --- |
| Mobile Interaction Flow V2 public UI slots | Accepted unified Roster sheet and persistent context composer; permissioned declarative UI Contribution V1 with bounded context, deterministic ownership, escaping, unload, policy, and file-origin tests | Final rendered responsive/focus acceptance before treating the contract as complete |
| Concrete new media providers | Provider-neutral Media Repository and owned `media:provide` adapter seam | Reviewed AI-source workflow, packaged-runtime bridge policy, or OPFS value |
| New row/reach rules beyond Combat Technique V1 | Row-Blocking V2, committed-failure contract, and technique-scoped equipment/reach/area/status profiles | Grab/pull/snare, new blockers, and defensive-value design |

## Dormant definitions are not capabilities

Core still contains compatibility-era internal labels for possible Fight,
Talk, and Flee sub-actions. The public action-variant contract intentionally
admits only Feed, Feast, and Play; Combat Technique V1 separately admits
declarative named Fight profiles without callbacks. Disarm, Grapple, Gift, Dance, Retreat, and
Surrender must not become visible or moddable merely because a definition
exists: each would require authored resolution, reach/status/equipment rules,
costs, Scene outcomes, AI behavior, save semantics where applicable, and
desktop/mobile acceptance.

Talk/Flee expansion and bespoke Fight callbacks remain design slices, not
missing router flags. Ordinary Fight continues to provide Basic Attack through
the deterministic resolver when no authored technique is selected.

## Evidence commands

Run the complete acceptance boundary with:

```bash
npm run full-build
npm run audit:branding
git diff --check
```

`npm run full-build` includes the current artifact-size/cache-contract audit.
The focused source of truth remains the tests themselves; this index does not
replace executable evidence.
