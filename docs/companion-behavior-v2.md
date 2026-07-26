# Companion Behavior V2

Status: **implemented core contract**

Companion Behavior separates three questions that the earlier Role/AI Order
fields mixed together:

- **Duty** — what the companion contributes and practices.
- **Stance** — how autonomous choices weigh risk and escalation.
- **Control** — who chooses from the legal actions.

These values share one management surface but remain separate persisted facts.

## Duties

| Duty | Concrete contribution | Tradeoff |
| --- | --- | --- |
| Guard | Reduces ambush pressure and prioritizes immediate threats | Gives exploration and resource opportunities less weight |
| Scout | Improves map visibility and notices unfamiliar routes | Prefers safer openings over prolonged pressure |
| Support | Improves safe-rest recovery and prioritizes wounded allies | Gives up offensive tempo when care is needed |
| Gatherer | Improves search results and post-combat scavenging | Gives resource opportunities more weight than pressing an advantage |

Duty effects are deterministic and apply independently of narration. During
traversal, an autonomous companion may emit at most one non-consuming
observation for a relevant situation. These observations never search, heal,
loot, move, or spend time on the player's behalf.

## Stances

- **Aggressive** presses reachable threats and accepts more risk.
- **Balanced** weighs pressure, safety, care, and opportunity.
- **Defensive** favors protection, recovery, and lower-risk actions.
- **Passive** avoids escalation unless another party member is endangered.

A stance biases candidate scores. It does not create actions, bypass reach or
row rules, or alter the deterministic outcome resolver.

## Control

- **Manual** exposes the ordinary player action surface on that companion's
  turn.
- **Autonomous** uses the deterministic controller.
- **AI assisted** permits a registered character controller to choose from a
  bounded list of already-validated candidates.

AI assisted control is an extension point, not the narration provider. If no
controller is registered, if it fails, or if it returns an illegal choice,
the same deterministic ranking takes over without consuming or skipping the
turn. The chosen command is then dispatched through the same validator and
resolver used by manual play. AI never owns costs, legality, outcomes, world
mutation, or save truth.

## Deterministic choice contract

The controller:

1. Builds candidates from current living actors and targets.
2. Passes every candidate through the shared interaction validator.
3. Scores only legal candidates from Duty, Stance, condition, hunger,
   relationship-relevant state, and the immediate tactical situation.
4. Uses the combat-state deterministic roll only as a stable tie-break.
5. Records the decision in the Activity Log and Scene Feed.
6. Holds position and advances safely if a previously legal command cannot be
   completed.

Manual and autonomous actions therefore share the same reach, row, target,
cost, multi-target, containment, and resolution mechanics.

## Recruitment continuity

Recruitment stores a bounded snapshot containing method, source, initiator,
day, and hour. It seeds the initial Duty and Stance:

- submission tends Guard / Passive;
- bonding or a strong social breakthrough tends Support / Defensive;
- ordinary friendly recruitment tends Scout / Balanced.

This history does not permanently control the companion. Duty and Stance are
free to change during alpha. Drop-off and rejoin preserve the selected
behavior and recruitment history rather than reseeding them.

## Persistence and migration

The canonical per-unit record is:

```text
companionBehavior: {
  version: 2,
  duty,
  stance,
  control,
  recruitmentContinuity
}
```

Legacy `partyRole` and `aiOrder` values remain compatibility mirrors. Old
Healer orders migrate to Support / Balanced; Scavenger migrates to Gatherer /
Balanced; generic companions migrate to Scout. Older obedient companions
remain Manual, while newly recruited companions default to deterministic
autonomy.

Sparse and binary saves preserve Duty, Stance, Control, recruitment
continuity, bounded traversal-reaction history, drop-off records, defeat
stranding, and containment through the normal unit serialization path.

## Deliberately deferred

- evolving emotional state that silently changes behavior;
- loyalty, authority, or service costs for changing behavior;
- free-form AI actions or provider-owned outcomes;
- independent companion movement during ordinary party traversal;
- automatic searching, looting, healing, or structure interaction.
