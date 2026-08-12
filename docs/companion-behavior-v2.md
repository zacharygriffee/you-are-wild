# Companion Behavior V2

Status: **implemented core contract**

Companion Behavior separates three questions that the earlier Role/AI Order
fields mixed together:

- **Duty** — what the companion contributes and practices.
- **Stance** — how autonomous choices weigh risk and escalation.
- **Control** — who chooses from the legal actions.

These values share one management surface but remain separate persisted facts.

Each recruited companion card also exposes a per-companion Play/Pause control.
It can be changed only during the player's combat turn. Pause suspends autonomous
choices while retaining the configured Control, Duty, Stance, recruitment
history, and any already-committed group intent. A paused companion presents
the normal player action surface on their turn, previews the deterministic
action they would prefer, and then reads as awaiting direction. The player can
follow that one preference or choose another action; either choice leaves
autonomy paused. Play resumes the same autonomous controller.

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

### Combat intent transaction

Combat Agency V1 adds a bounded transaction before an autonomous
companion commits. One candidate build supplies one primary preview and at most
three stored alternatives. Repeated held-turn processing does not rerank. At
most one player suggestion may select a stored alternative. The request reserves
the player's next ordinary actionable turn whether the companion complies or
refuses. Compliance is deterministic from the companion's saved Bond projection
and departure from their own stored ranking. At commit, only the requested
choice or original primary and one bounded stale fallback are checked. Exactly
one choice then enters the existing resolver.

The callback, preview, and live transaction references are transient. Saves
retain the unspent round, queue index, unit identities, Companion Bond ledger,
and plain-data player-turn reservation, then rebuild the same deterministic turn
after reload. The full contract is in
[Combat Agency / Interruption V1 Decision](combat-agency-v1-decision.md).

## Recruitment continuity

Recruitment stores a bounded snapshot containing method, source, initiator,
day, and hour. It seeds the initial Duty and Stance:

- submission tends Guard / Passive;
- bonding or a strong social breakthrough tends Support / Defensive;
- ordinary friendly recruitment tends Scout / Balanced.

This history does not permanently control the companion. Duty and Stance are
free to change during alpha. Drop-off and rejoin preserve the selected
behavior and recruitment history rather than reseeding them.

Recruitment also seeds Companion Bond V1. Its bounded authored event ledger is
separate from tactical preference: Bond may affect whether a companion accepts
a player suggestion, while Duty and Stance continue to rank what the companion
wants to do. Successful player-to-companion Feed, Talk, and Play can add
deduplicated care events. Broader neglect, coercion, witnessed conduct,
desertion, and hostility remain future authored event types.

## Persistence and migration

The canonical per-unit record is:

```text
companionBehavior: {
  version: 2,
  duty,
  stance,
  control,
  autonomyPaused,
  recruitmentContinuity
}

companionBond: {
  version: 1,
  nextSeq,
  carriedWeight,
  prunedCount,
  events: [authoredEvent, ...] // maximum 48 live entries
}
```

Legacy `partyRole` and `aiOrder` values remain compatibility mirrors. Old
Healer orders migrate to Support / Balanced; Scavenger migrates to Gatherer /
Balanced; generic companions migrate to Scout. Older obedient companions
remain Manual, while newly recruited companions default to deterministic
autonomy.

Sparse and binary saves preserve Duty, Stance, Control, recruitment
continuity, the bounded Bond ledger, bounded traversal-reaction history,
drop-off records, defeat stranding, per-companion autonomy pause, and
containment through the normal unit serialization path. Active combat saves
also preserve a plain-data pending player-turn reservation; preview objects and
callbacks remain transient.

## Deliberately deferred

- evolving emotional state that silently changes behavior;
- broader loyalty decay, authority, or service costs beyond Combat Agency V1;
- free-form AI actions or provider-owned outcomes;
- independent companion movement during ordinary party traversal;
- automatic searching, looting, healing, or structure interaction.
