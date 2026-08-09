# Active Objectives

This file contains unfinished, approved, actionable work only. Completed work
belongs in `changelog.md`; requirement evidence belongs in
`backlog-completion-audit.md`; subsystem behavior belongs in focused doctrine.

## Select-group alpha maintenance

Version 0.18.2 is the active released public-access alpha for the accepted
Moddable Core V1 boundary. Public access began on 2026-08-03 without a broader
advertising campaign. Version 0.18.3 is the current unpublished development
candidate. It carries the same frozen gameplay and module boundary while
adding the versioned license cutoff and stabilization evidence.

During candidate stabilization, do not add new module
permissions, public UI slots, resolver effect types, saved schemas, media
providers, biome-recipe modes, recovery profiles, population simulation,
elemental semantics, crafting, commerce, or arbitrary module callbacks.

Existing regressions may be fixed. Existing contracts may receive tests,
documentation corrections, localization and accessibility fixes, and narrow
hardening. Core gameplay remains deterministic, offline-capable, and
independent of LLM or remote-service availability.

## Immediate — 0.18.3 stabilization

1. Exercise the built candidate through deterministic Alpha missions and
   ordinary adventures. Cover exploration and combat, single/group/self/mixed
   interactions, SFW and Mature posture, companion control, containment,
   save/reload, and desktop/mobile presentation. Keep the maintained
   `test:lifecycle` ordinary-adventure path in the release gate alongside the
   Alpha and interaction matrices.
2. Treat a reported problem as actionable only after it has stable setup and
   reproduction steps. Add the smallest deterministic regression fixture that
   fails first, then fix the implementation and keep the fixture permanently.
3. Continue agent-led testing while human testing remains ongoing. Human
   observations inform narration quality, touch comfort, pacing, and balance;
   they do not pause independent automated or agent exploration.
4. Keep candidate identity synchronized across the application package,
   package lock, first-party packages, Mod Author Kit, fixtures, tests, and
   release copy.
5. Retain exact-candidate evidence for:
   - the full local build, branding and whitespace checks;
   - representative older-save loading;
   - deterministic fixture install, enable, action resolution, runtime reload,
     disable, and deletion;
   - core Grab, restraint, Pull, Escape, and Seduce flows;
   - short-mobile contributed-action disclosure;
   - offline single-file and hosted artifact identity;
   - green GitHub CI on each release-patch commit.
6. Record observational defects without expanding the frozen contracts.
7. Keep 0.18.3 unpublished until the operator explicitly approves release and
   Sites publication. Public-preview promotion, advertising, and any
   access-policy change remain separate decisions.

## Post-stabilization priority — layered map art

After the 0.18.3 stabilization gate, improve the 3x3 traversal presentation
through the staged [Layered Map Art Roadmap](map-art-layering-roadmap.md).
The first priorities are directional cliff and mountain slopes, edge-to-edge
bridge continuity, and decomposing baked terrain art into reusable ground,
route, foliage, feature, durable-world-evidence, presence, and state layers.

This presentation work should precede Terrain Tactics V1 and Crafting V1.
Those systems need stable terrain, obstacle, resource, and persistent tile
semantics so mechanics can consume world facts rather than infer rules from
bitmap appearance.

## Evidence-led release smoke

Exercise the exact released build rather than a nearby development build:

- load the representative published 0.14 save and create a fresh world;
- use ordinary movement, Talk, Fight, Feed or Feast, Flee, save, and reload;
- use Grab, Pull, Escape, and successful and failed Seduce outcomes;
- install and enable the Moddable Core fixture, spend its owned resource,
  observe its restraint, reload the enabled runtime, then disable and delete it;
- inspect the combat composer at 313x670, 390x844, 412x915, and 1365x768,
  including the opened contributed-action menu;
- open the generated single-file artifact through `file://` and run the hosted
  artifact with external atlas paths;
- verify the same seed and committed inputs preserve mechanical outcomes.

The maintained automated suites may provide this evidence where they exercise
the real artifact and state path. Subjective comfort and play quality remain
operator observations.

## Operator playtest needs

These are observational and do not authorize mechanic changes without a
demonstrated contradiction:

- physical-phone comfort for the compact combat composer and action menu;
- longer sessions covering dismissed-recruit sightings and rejoining;
- perceived readability of readable, fast, and instant combat pacing;
- authored biome-boundary, cave, structure, merchant, and audio-pack content;
- appetite, recruitment, restraint duration, danger, and reward balance;
- English and Spanish player-facing clarity and human translation quality.

## Post-stabilization — Chew nourishment and combat agency

These reported gaps are accepted backlog items. They do not interrupt the
active performance and visual-quality branch, and they require stable
reproduction fixtures before gameplay code changes.

1. **Audit Chew nourishment.** Chew currently spends the Feast hunger cost but
   resolves as vitality and punishment damage with no automatic consumption
   credit. Reproduce the reported hunger result for player and companion
   actors, in single and group Chew, across hit, resisted, surviving, and
   depleted-target outcomes. Decide whether actual mass removed should grant
   bounded immediate nourishment, or whether Chew remains strictly an attack
   and its cost, label, and feedback must make that clear. Any nourishment rule
   must conserve food value so the same mass cannot feed the chewer once and
   then grant full value again through later containment or digestion.
2. **Design Combat Agency / Interruption V1.** Preserve the deterministic turn
   queue, but do not leave the player without meaningful agency while automatic
   combat events advance. Separate and specify:
   - an always-available presentation pause or hold control;
   - an out-of-turn emergency attempt to flee or stop party automation, with an
     explicit cost, cooldown, or reservation against future player action;
   - a pre-commit companion-intent preview such as "A party member is about to
     do X," followed by a bounded opportunity to *try* to redirect or stop it;
   - deterministic companion compliance or refusal based on authored state,
     with every refusal or unavailable response narrated rather than surfaced
     as a warning or error; and
   - a separate priority contract for true instant or reaction actions, rather
     than treating the existing readable, fast, and instant presentation modes
     as mechanical priority.
3. **Audit unexplained companion flight and its narrative continuity.**
   Reproduce the reported combat in which Harpy appears in the opening turn
   order, then a later group Talk attempt reports that Harpy has fled even
   though no intervening Scene or Activity Log event says that Harpy tried to
   flee, succeeded, or had a reason to do so. Trace the exact state transition
   that sets the fled flag and distinguish an authored flee action from stale
   queue state, settlement cleanup, fear handling, or target-validation drift.
   Acceptance requires:
   - every attempted and resolved flee to create an immediate causal combat
     event and player-facing narration, including the relevant authored reason;
   - a later group-action failure to narrate the consequence without becoming
     the first or only disclosure that the companion left;
   - deterministic flee scoring that accounts for condition, fear, stance,
     relative threat, safe routes, reach, row, and mobility, so an airborne
     companion facing a grounded threat does not flee without another credible
     pressure; and
   - queue, party, world-placement, save/reload, and interaction-selection state
     to agree after flight, with fixtures for manual and autonomous companions
     and single and committed group actions.

The preview duration is a UI opportunity, not authoritative real-time game
state: pausing, slow devices, accessibility needs, save/reload, and `file://`
play must not change the deterministic outcome. Acceptance must cover the
player, manual and autonomous companions, enemies, committed group actions,
fear and restraint, save/reload, all combat-pacing modes, and desktop and mobile
layouts without duplicate turns, free repeated reactions, or lost action cost.

## Later gameplay and mod work

The following remain valid backlog, but none blocks 0.18.3 stabilization:

- regional population aggregation and offscreen service simulation;
- persistent merchant supply, unloading, and designed repopulation;
- immutable new-world recipe sets, meaningful `mapModsHash`, designed regions,
  placeable anomalies, and portal worlds;
- objective and return-burden quest scaling after scenario evidence;
- authored shrine networks, resurrection costs, medical NPCs, spectral
  abilities, companion extraction, and richer Recovery Mode V2 economies;
- permanent body-piece stat consequences only after balance and migration
  acceptance;
- Sleep or Rest V2 with explicit waking, risk, reward, and choice;
- terrain tactics and reaction or interruption priority contracts, after the
  layered map-art semantic inventory is accepted;
- shared elemental damage and resistance semantics, if real modules prove a
  common contract is needed;
- crafting recipes, stations, costs, outputs, ownership, item sinks, and
  terrain resource placement, after persistent resource semantics are accepted;
- reviewed AI media generation, packaged-runtime media bridges, optional OPFS
  optimization, and AI or TTS audio;
- long-form balance, progression, reward, and difficulty-profile evaluation.

## Explicit non-release tracks

Commerce, paid mods, accounts, managed LLM entitlement, payment processors,
public marketplace services, Pear seeding, mesh sidecars, and public-launch
administration are separate tracks. They do not block this game release and
must not be folded into 0.18.3 stabilization.

## Delivery boundary

Agents may prepare patch candidates, run verification, commit and push when the
active goal explicitly authorizes it, and observe CI. Changing release status,
selecting rollback Sites versions, publishing Sites, creating public release
assets, changing access, advertising, and promoting the channel remain
operator-mediated.

## Authoritative references

- `moddable-core-v1.md`
- `action-outcome-status-v1-decision.md`
- `biome-boundary-world-recipe-v1-decision.md`
- `body-mass-pieces-v1-decision.md`
- `autonomous-population-v1-decision.md`
- `release-readiness-0.18.2.md`
- `release-readiness-0.18.3.md`
- `releases/0.18.2.md`
- `releases/0.18.3.md`
- `map-art-layering-roadmap.md`
- `architecture.md`
- `backlog-completion-audit.md`
- `control-model.md`
- `modding.md`
- `testing.md`
