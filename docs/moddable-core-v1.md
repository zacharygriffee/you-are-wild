# Moddable Core V1

Status: foundational V1 slice implemented; regional population, designed
regions, placeable anomalies, portal worlds, and permanent body penalties
remain deferred

Moddable Core makes the shipped game use the same bounded definition and
resolver seams that are available to modules wherever practical. It does not
turn save truth, deterministic rolls, state mutation, rendering, or conflict
arbitration over to module callbacks.

## Governing invariant

Core owns:

- normalization and validation;
- seeded choice and deterministic resolution;
- costs, commit boundaries, and state transitions;
- persistence, migration, and missing-provider behavior;
- conflict arbitration and ownership cleanup;
- accessible responsive rendering.

Modules may own:

- namespaced definitions and presentation fallbacks;
- bounded eligibility, cost, targeting, effect, and placement profiles;
- packaged media selected by semantic role;
- post-commit observation of frozen serializable outcomes.

Registering a definition never grants authority beyond its declared permission.
Load order never changes mechanical truth.

## Current-to-target audit

| Area | Current evidence | V1 target |
| --- | --- | --- |
| Actions | Action Profile V1 now resolves bounded data-only actions through one authoritative resolver; legacy action functions and callback variants remain compatibility paths | Broaden the effect vocabulary only with new versioned core consumers |
| Outcomes and hooks | Scene Beats are copied/frozen; several older hooks still receive live or evolving payloads | Versioned immutable post-commit outcome envelopes; no veto or mutation hooks |
| Status | Combat status logic has bleed, burn, freeze, stun, charm, fear, dormant sleep, and several restraint-shaped legacy fields | Namespaced Status Effect V1 definitions plus explicit restraint relationships; authoritative containment/recruitment/encounter state remains separate |
| Items and equipment | Item Definition V2 is public and data-only; module equipment is rejected; core equipment is a special item classification | Equipment Definition V1 as a permissioned item component using approved slots, modifiers, tags, and reversible effects |
| Resources | Resource Ledger V1 owns bounded renewable unit resources | Action and technique profiles may declare ledger costs charged exactly once at commit |
| Recovery | Ghost pilgrimage is the core default; Regenerate and owned Recovery Mode V1 profiles remain selectable | Expand anchors only through bounded recovery-profile versions |
| World | Biome Recipe V1 deterministically classifies new tiles and sparse deltas pin materialized results; `mapModsHash` remains `core` | Freeze complete recipes into new-world metadata before designed regions or portal worlds |
| Encounters and quests | Encounter Outcome V1 and World Scaling V1 apply distance, biome, cave, structure, and authored difficulty to encounters and procedural quests | Add objective/return-burden factors only with scenario balance evidence |
| Merchants | Explicit `finite` and `authored-restock` lifecycles preserve depletion or use a designed interval | Add persistent/supplied lifecycle simulation with regional population |
| Companions | Dismissed recruits receive six-hour coarse autonomy, sighting knowledge, perception, and bounded event ledgers; Drop Off stays stationary | Regional population aggregation and offscreen service simulation remain deferred |
| UI | Five bounded UI Contribution V1 slots and shared desktop/mobile composers exist | Actions enter the scalable action catalog; no arbitrary DOM or one-slot-per-mechanic expansion |
| Audio | Media Repository and owned asset bundles exist | Implemented Audio Pack V1 maps semantic events to internally leased packaged media; no AI or TTS generation |

## Compatibility policy

Existing saves and installed V1 modules remain readable. New saved fields are
additive and normalized with conservative defaults.

Action Variant V1 remains supported for trusted-local compatibility but is not
expanded to new primary action families. New first-party mechanics and new
public authoring guidance use data-only action profiles. A later removal of V1
would require a release boundary and migration evidence.

Provider loss follows the existing ownership doctrine:

- unselected future definitions disappear;
- committed outcomes remain historical facts;
- saved materialized world state does not reroll;
- equipped or carried content becomes an inert unavailable-provider record
  when its definition cannot be resolved;
- an active exclusive profile falls back through an explicit core policy.

## Conflict policy

There is no global module priority.

1. Core safety, save, and content-policy constraints always apply.
2. An immutable world recipe controls an existing world's geography.
3. Player selection controls exclusive replaceable roles.
4. Mechanical definition IDs are owner-namespaced and collision-rejecting.
5. Presentation priority orders peers but cannot replace their mechanics.
6. Equal presentation order uses owner ID and definition ID as stable ties.

## Delivery slices

1. Action/outcome/status foundations and a scalable action catalog.
2. Grab, Pull, restraints, and resource-backed techniques.
3. Seduce as the first cross-system reference action.
4. Equipment and body-mass economies.
5. World recipe, biome seams, danger, encounters, quests, structures, and
   merchant lifecycle.
6. Autonomous dismissed recruits and perception; regional population remains a
   later slice.
7. Shrine recovery, pacing, Audio Pack V1, fixture modules, and full
   compatibility verification.

The current slice keeps elemental behavior outside core: modules compose
namespaced resources, statuses, actions, techniques, species data, and
presentation, while shared elemental damage/resistance semantics remain
deferred to a separately versioned contract.

Each slice requires source-independent contract documentation, negative tests,
disable/delete/reinstall coverage, save/load coverage where state is involved,
and a maintained fixture proving the public contract rather than a private core
shortcut.
