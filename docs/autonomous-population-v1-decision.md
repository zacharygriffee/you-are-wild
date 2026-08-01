# Autonomous NPC and Regional Population V1 Decision

Status: coarse dismissed-recruit and perception slice implemented; regional
population simulation remains deferred

## Actor classes

- **Party companion** participates in the current party and uses existing
  combat autonomy.
- **Dropped-off companion** remains at an exact known location and may rejoin.
- **Dismissed recruit** remains a persistent autonomous world actor unless the
  relationship is explicitly severed.
- **Named persistent NPC** retains identity, services, stock, quests, and
  authored origin.
- **Generic population** may be represented by a regional aggregate while not
  observed.

LRU or FIFO pressure may compact representation. It must not erase a named
actor, player-caused state, unique service, quest responsibility, carried
content, or unresolved encounter.

## Coarse autonomous time

Player movement and other time-advancing actions advance an autonomous clock.
Core processes bounded coarse steps rather than simulating every offscreen
combat turn.

Each actor has:

- stable identity and current/last-known location;
- duty, stance, and control fallback;
- travel intent and home/roam policy;
- knowledge of the player and significant places;
- perception and visibility profile;
- bounded inventory/resource summary;
- deterministic event ledger;
- next simulation time.

At a step, core scores legal high-level intents using stable world facts and a
seeded purpose key. Outcomes materialize only bounded facts such as travel,
resource change, meeting, injury, recruitment relationship, service return, or
death. Provider AI may choose among the same legal intents or narrate committed
ledger entries; it cannot create mechanical facts.

An autonomous recruit may seek the player only when its knowledge contains a
plausible location or trail. Returning by omniscience is forbidden.

## Perception and visibility

Observation is a deterministic comparison among:

- observer Wisdom, scouting, sensory traits, and current conditions;
- target size, concealment, movement, and authored visibility;
- distance, light, biome, terrain, and structure context.

Failure to observe hides current information. It does not remove the target
from world truth. Small creatures may be harder to notice; large, noisy, or
bright targets may be easier.

## Stories

Returning actors can summarize their event ledger. Deterministic templates
always work offline. Optional narration receives only bounded committed events
and may not add rewards, locations, encounters, or relationships.

The implemented slice advances dismissed recruits in six-hour deterministic
steps, processes at most eight overdue steps per tick, and retains at most
twenty-four travel/wait events. Seeking the player requires a remembered
sighting no more than seventy-two hours old and within twelve tiles. Dropped-off
companions remain intentionally stationary. Modules may observe frozen
`onAutonomousEvent` facts but cannot choose or mutate intents.

## Regional population

Unobserved generic populations use a regional record containing ecological
capacity, last simulation time, pressure, and bounded composition. Revisiting a
region materializes creatures from that record with seeded identities and
never duplicates a previously persistent actor.

Repopulation is not a reset. Explored geography, structures, quest state,
depleted unique resources, player placements, corpses, and named actors remain
durable.

## Merchant lifecycle

Merchant profiles declare one lifecycle:

- `transient` — finite stock; no automatic restock; may compact with its generic
  population;
- `persistent` — named actor and saved stock; no restock unless declared;
- `restocking` — authored schedule and table, bounded by elapsed game time;
- `supplied` — stock changes through quests, player sales, or deliveries.

The implemented merchant slice preserves legacy authored restocking for
compatibility, adds explicit `finite` and `authored-restock` lifecycles, and
gives generated structure services an authored interval. A finite merchant's
empty stock no longer repopulates merely because its trade window is reopened.
Persistent/supplied regional population behavior remains deferred.

## Acceptance

- Identical time, seed, and inputs produce identical actor and population
  ledgers.
- Large elapsed time is processed with a bounded number of steps.
- Named actors and player-altered state never disappear through compaction.
- Save/load, module removal, and region revisit do not duplicate actors or
  stock.
- Provider failure falls back to deterministic intent selection.
- Returning stories are derivable from the committed ledger.
