# Active Objectives

This file contains unfinished, approved, actionable work only. Completed work
belongs in `changelog.md`; requirement evidence belongs in
`backlog-completion-audit.md`; subsystem behavior belongs in focused doctrine.

## Scope freeze for 0.17.0

Until the 0.17.0 readiness goal is closed, do not introduce new module
permissions, public UI slots, media providers, asset/sprite contract versions,
recovery profiles, resource profile types, combat-technique capabilities,
row/reach rules, narration providers, containers, Feast variants,
progression/perk systems, quest engines, or arbitrary module DOM/callback
authority.

Existing regressions may be fixed. Existing contracts may receive tests,
documentation corrections, localization/accessibility fixes, and narrow
hardening.

Core gameplay remains deterministic and does not depend on an LLM or remote
service.

## Immediate — 0.17.0 development

1. Keep authoritative documentation coherent:
   - current architecture describes the shipped runtime;
   - this file contains unfinished work only;
   - superseded plans are visibly historical;
   - release evidence and deferred decisions remain distinct.
2. Preserve the accepted Core Game Maturity contracts without expanding their
   bounded vocabularies during release preparation.
3. Start the 0.17 release-readiness record only after its first user-facing
   regression slice is accepted:
   - current save, quest, item, perk, companion, and mod compatibility;
   - local full-build, branding, and diff evidence;
   - mobile `412x915` and desktop `1365x768` smoke;
   - English/Spanish at 20px, high contrast, and reduced motion;
   - offline and hosted artifact identity;
   - observed green CI;
   - rollback artifact.
4. Keep the accepted conservative Ghost baseline explicit in
   `ghost-recovery-prepublish-decision.md` and the 0.16.0 historical notes. Do not add a
   shrine economy, entry prompt, spectral actions, or altered companion
   outcomes.
5. Preserve the published 0.16.0 alpha identity and select-group distribution
   boundary. Beta and general-public promotion require separate operator
   decisions; 0.17.0 remains a development draft.

## Demonstrated regression and release backlog

These are the concrete items to clear or classify before the 0.16 handoff.

1. Group strategy scheduling is implemented for same-round and next-round
   participant reservation. Existing queue invalidation and save/load coverage
   still need release-smoke observation for cancellation, defeat, flee, and a
   restored queued action.
2. The former core-suite contradictions are resolved: exploration Feast uses
   player voice, Spanish single-action output uses second-person grammar,
   group Chew tests the numeric combat-rating contract, and reach failures use
   the live interface locale for singular/plural grammar.
3. Run the exact release smoke from this document and retain seed, save,
   viewport, device, artifact, and observed-result evidence for any defect.

## Completed locally — Core Game Maturity

`core-maturity-backlog.md` and its ordered
`core-maturity-implementation-plan.md` are implemented and locally accepted.
The program brings the everyday game loops up to the maturity of the existing
technical foundation:

- Quest Contract V2 and Review Map V2;
- companion Duty, Stance, Control, and Recruitment Continuity;
- deterministic offline autonomy as the canonical fallback for optional AI
  character control;
- Item Contract V2, a coherent core economy, and an honest deferred-crafting
  boundary;
- a coherent progression and reward loop across quests, combat, exploration,
  equipment, perks, and companions;
- a compact Perk Frontier V2 that renders only current choices and derives
  deterministic offers from authored, saved progression facts;
- progressive tutorial, point-of-choice explanations, and strategy tips;
- canonical acceptance scenarios before broad external playtesting.

Duty describes capability (Guard, Scout, Support, Gatherer). Stance describes
autonomous posture (Aggressive, Balanced, Defensive, Passive). They may share
one Companion Behavior UI but remain separate persisted concepts. Healer and
Scavenger become Duty-derived priorities rather than peer stances.

Exact-worktree evidence is recorded in `core-maturity-acceptance.md`. The
remaining work is release handoff: choose the semantic release boundary,
commit and push intentionally, observe CI, reconcile release notes and
compatibility, select a rollback artifact, and authorize Sites publication.

## Evidence-led release smoke

Before operator publication approval, exercise the exact candidate:

- weakest valid starter, protected 3x3, adjacent danger, ten ordinary moves;
- Talk, Fight, group/multi-target, and Feed or Feast;
- rows, target confirmation, Flee, and combat save/reload;
- ordinary defeat/recovery and companion-survives-player-fall;
- sparse autosave, manual save/reload, and a representative older save;
- unified mobile Roster, persistent composer, Holdings, Quest/Trade, and Scene
  Feed at the required viewports and accessibility settings;
- offline generated HTML and the hosted artifact path.

Ghost is included only under the accepted product decision. Record defects;
do not expand contracts during smoke testing.

## Operator playtest needs

These are observational unless a concrete contradiction is demonstrated:

- longer Death/Defeat V3 saves, repeated recovery bags, Hardcore, and interior
  deaths;
- Drop Off/Rejoin across overworld and exact interior rooms;
- authored coast, cave, building, sprite, tileset, and locale-pack review;
- combat-technique equipment/row cases and interaction-balance observations;
- physical-phone review of the unified Roster, composer, and structure actions.

## Explicitly deferred decisions

- An opt-in adventure-pressure/difficulty profile for players who prefer
  lethal uncertainty.
- Early-adventure danger and information V2: starting-area encounter pressure,
  scouting/perception checks, guard/scout warnings, and explicit player-facing
  difficulty cues. The baseline should remain conservative until players can
  anticipate or mitigate sudden defeat.
- Quest and Review Map expansion beyond V2: additional procedural objective
  types, authored scripted events, richer return guidance, and future map
  interactions/docking only after concrete player evidence identifies a gap in
  the current bounded contract.
- Route hierarchy V3: reduce visually and mechanically noisy road loops while
  preserving deterministic traversal, route branches, and legacy-world
  compatibility.
- Authored shrine networks, resurrection costs, spectral abilities, companion
  extraction, healer/faction debt, and other Recovery Mode V2 profiles.
- New row/reach mechanics such as grab, pull, snare, or defensive formations.
- A mass ledger replacing Offer Piece's condition proxy.
- A complete Sleep/Rest V2 loop. Natural and combat sleep are currently
  suppressed from ordinary play while the game lacks clear waking, risk,
  reward, and player-choice rules; compatibility-era sleep data is retained
  for a later authored migration.
- Combat Event Pacing V1. Add a player-configurable presentation delay between
  automatic combat events so rapid exchanges remain readable, character
  autonomy has observable space, and narration/dialogue can be appreciated.
  The default should remain brisk (roughly half a second or less), with an
  accessibility-friendly faster/slower setting. This must pace rendering and
  automatic decision dispatch only: deterministic combat order, simulation
  time, saves, and ordinary player commands must not depend on wall-clock
  delays. Future instant/reaction abilities need an explicit interruption and
  priority contract rather than silently bypassing this pacing layer.
- Additional media providers: reviewed AI generation, packaged-runtime
  bridges, then optional OPFS optimization.
- Archive transport until a real pack demonstrates request-latency, portable
  handoff, CORS, or repair pressure.
- Gameplay-bearing body-build taxonomy and preference design.
- Companion loadouts, companion equipment management, richer structure skins,
  audio, generated media, and 3D presentation beyond the approved Core Game
  Maturity program.
- Crafting V1 and new item sinks. The current core item catalog may expose
  trade, quest, equip, healing, loot, and utility purposes honestly, but must
  not imply a crafting loop before recipes, stations, costs, output ownership,
  and save/mod contracts are designed.
- New content-placement APIs until a canonical new-world recipe,
  `mapModsHash`, arbitration, materialization, missing-owner behavior, and
  offline reconstruction are designed.

## Later work with prerequisites

- Post-publication autonomous and human long-form playtests must use the exact
  published 0.16.0 artifact, record seed/build/device/action/save evidence, and
  must not retune mechanics during the run.
- Compatible demonstrated defects may ship as patch releases. Balance opinions
  require scenario evidence before tuning.
- Locale expansion remains pack-owned; the partial French pack is lifecycle
  evidence, not a reviewed translation.
- Presentation contracts may expand only after representative real-pack review
  shows an unmet semantic need.

## Delivery boundary

Agents may implement the approved work above and run local verification.
Commit, push, release-date assignment, CI observation, rollback selection, and
Sites publication remain operator-mediated. Publication is never automatic.

## Authoritative references

- `architecture.md`
- `backlog-completion-audit.md`
- `release-readiness-0.16.0.md`
- `releases/0.16.0.md`
- `release-readiness-0.15.0.md`
- `releases/0.15.0.md`
- `balance-cost-doctrine.md`
- `balance-scenario-baseline.md`
- `core-maturity-backlog.md`
- `core-maturity-implementation-plan.md`
- `core-maturity-baseline.md`
- `ghost-recovery-prepublish-decision.md`
- `route-hierarchy-v2.md`
- `mobile-interaction-flow-v2-decision.md`
- `control-model.md`
- `feast-containment-v2.md`
- `modding.md`
- `testing.md`
