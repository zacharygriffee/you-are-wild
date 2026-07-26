# Active Objectives

This file contains unfinished, approved, actionable work only. Completed work
belongs in `changelog.md`; requirement evidence belongs in
`backlog-completion-audit.md`; subsystem behavior belongs in focused doctrine.

## Scope freeze for 0.15.0

Until the 0.15.0 readiness goal is closed, do not introduce new module
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

## Immediate — 0.15.0 public-preview candidate

1. Keep authoritative documentation coherent:
   - current architecture describes the shipped runtime;
   - this file contains unfinished work only;
   - superseded plans are visibly historical;
   - release evidence and deferred decisions remain distinct.
2. Complete the Standard Adventure bounded-safety evidence:
   - preserve visible Hungry/Starving penalties for every living unit without
     lowering maximum Condition;
   - preserve Generator V4's safe-start contract through current Generator V6;
   - expose stable current/adjacent danger bands before movement;
   - keep roads materially safer or more predictable;
   - preserve player-relative opening admission and deterministic
     Scout/Guard ambush awareness.
3. Complete `release-readiness-0.15.0.md`:
   - current save and mod compatibility;
   - local full-build, branding, and diff evidence;
   - mobile `412x915` and desktop `1365x768` smoke;
   - English/Spanish at 20px, high contrast, and reduced motion;
   - offline and hosted artifact identity;
   - observed green CI;
   - rollback artifact.
4. Keep the accepted conservative Ghost baseline explicit in
   `ghost-recovery-prepublish-decision.md` and the 0.15.0 notes. Do not add a
   shrine economy, entry prompt, spectral actions, or altered companion
   outcomes.
5. Prepare an accurate 0.15.0 record and development identity. Do not publish
   or mark the candidate released without operator authorization.

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
- Authored shrine networks, resurrection costs, spectral abilities, companion
  extraction, healer/faction debt, and other Recovery Mode V2 profiles.
- New row/reach mechanics such as grab, pull, snare, or defensive formations.
- A mass ledger replacing Offer Piece's condition proxy.
- Additional media providers: reviewed AI generation, packaged-runtime
  bridges, then optional OPFS optimization.
- Archive transport until a real pack demonstrates request-latency, portable
  handoff, CORS, or repair pressure.
- Gameplay-bearing body-build taxonomy and preference design.
- Companion loadouts, richer structure skins, audio, generated media, and 3D
  presentation beyond the approved Core Game Maturity program.
- New content-placement APIs until a canonical new-world recipe,
  `mapModsHash`, arbitration, materialization, missing-owner behavior, and
  offline reconstruction are designed.

## Later work with prerequisites

- Post-publication autonomous and human long-form playtests must use the exact
  published 0.15.0 artifact, record seed/build/device/action/save evidence, and
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
