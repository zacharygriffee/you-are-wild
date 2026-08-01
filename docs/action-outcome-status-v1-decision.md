# Action, Outcome, Status, and Restraint V1 Decision

Status: bounded foundational subset implemented

## Action profiles

Action Profile V1 is declarative data consumed by core. It describes a legal
action; it does not execute it.

The implemented authoring schema is normative in
`docs/mod-author-kit/03-mechanics-contracts.md`. It supports bounded modes,
self/target scope, participant relations, appetite/restraint/structure
requirements, seeded stat checks, owned resource costs, and the initial
stat/status/restraint/pull/release/recruit/withdraw effect vocabulary.

Allowed fields are bounded and versioned. Unknown fields reject registration.
Core validates targets and reach, checks costs, derives seeded rolls, commits
the action once, applies effects in declared order, and emits one outcome.

Action IDs are namespaced. Core actions use `core:*`. A module cannot replace a
core or foreign profile by registering the same local ID or by declaring a
higher priority.

The initial effect vocabulary is deliberately small:

- condition, spirit, and hunger deltas;
- Resource Ledger spend;
- Status Effect apply;
- restraint create, pull, and release;
- encounter participation withdrawal;
- recruitment transition through the core recruitment resolver;
- bounded Scene Beat metadata.

Adding an effect kind requires a core consumer, save behavior, AI behavior,
presentation, and conformance fixture.

## Commit and outcome

An action has three boundaries:

1. **Plan** — mutable player selection; no cost and no world mutation.
2. **Validate** — core produces a legal preview or normalized rejection.
3. **Commit** — costs are charged once and the resulting state transition is
   final.

A failed pre-commit validation charges nothing. A committed miss, resistance,
or in-world failure ordinarily charges the declared costs. Refunds require an
explicit core-supported effect and are not inferred by modules.

Every commit emits a copied, deeply frozen, serializable envelope:

```json
{
  "schema": "yaw-action-outcome-v1",
  "action": "example:silken-pull",
  "commitId": "opaque deterministic id",
  "mode": "combat",
  "actorId": "unit id",
  "targetId": "unit id",
  "result": "success",
  "effects": [],
  "costs": [],
  "scene": {},
  "round": 2,
  "turn": 4
}
```

Public hooks observe this envelope after state commits. They cannot veto,
replace, or mutate it. Save hydration does not replay it.

## Status effects

Status Effect V1 represents a bounded temporary condition. Definitions may
declare:

- domains such as combat, feast, social, medical, or traversal;
- duration unit and maximum duration;
- stack policy and maximum stacks;
- approved stat modifiers;
- action-category restrictions;
- deterministic periodic deltas;
- cure and resistance tags;
- presentation metadata;
- persistence outside combat.

Core registers compatibility profiles for existing combat statuses and shared
restraint-facing profiles. Sleep stays dormant until Rest/Sleep V2 defines
wake, risk, and reward rules.

Not every state is a status. Containment, digestion lifecycle, recruitment,
death/corpse state, recovery journey, and encounter participation are
authoritative records. A status may explain or restrict those records but
cannot replace them.

## Restraint relationships

Grab, web, snare, coil, and tentacle control use a relationship record rather
than unrelated booleans on the target:

```json
{
  "schema": "yaw-restraint-v1",
  "id": "opaque deterministic id",
  "profile": "core:grabbed",
  "sourceId": "actor id",
  "targetId": "target id",
  "strength": 12,
  "turns": 2,
  "breakCheck": { "actor": "str", "target": "str" }
}
```

The target status is a public summary of the authoritative relationship.
Removing the source, leaving combat, defeat, expiry, or a successful break
resolves the relationship exactly once.

Grab establishes the relationship. Pull requires a compatible relationship and
uses core row movement. Webs, snares, and tentacles add profiles and resource
costs without inventing new state models. Terrain-dependent tactics remain
deferred.

## Seduce reference action

Seduce is a high-appetite social recruitment action.

- It targets one eligible living participant.
- Core performs the Spirit resolution.
- A failed or resisted committed attempt consumes its action cost.
- Success recruits through the normal recruitment truth.
- The actor and new recruit withdraw from participation for the rest of the
  current encounter.
- Withdrawal is an encounter state, not a dispellable status.
- Neither participant acts again in that encounter, including through module
  hooks or AI.
- Recruitment XP and quest credit use the existing one-time ledgers.

The profile exposes eligibility and presentation. A module cannot directly
join a unit to the party or remove combatants.

## UI

The action composer renders Action Profile V1 entries by category and current
availability. Core early actions remain directly visible. Additional actions
enter a bounded contextual list rather than adding permanent top-level buttons.
Holdings may expose advanced loadout and technique selection, but ordinary
early play must not require repeated Holdings navigation.
