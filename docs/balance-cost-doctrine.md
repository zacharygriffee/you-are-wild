# Balance / Cost Doctrine V1

This document defines the conservative first economy pass for travel, routine actions, Spirit thresholds, and hunger pressure. It is intentionally small: it gives the current game enough cost shape for playtesting without introducing a new stamina/focus resource or a broad combat rebalance.

## Resource Semantics

- **Punishment / CPun / MPun** is the current health-like condition track.
- **Spirit / CPle / MPle** is the player-facing social and inner-pressure track. The implementation keeps the existing `CPle` / `MPle` field names for compatibility.
- **Hunger** uses higher numbers to mean hungrier. `0` is sated and `100` is the V1 cap.
- **Vitality / Vital Pool** belongs to Feast / Containment V2 and is separate from ordinary fight damage.

## V1 Constants

The default constants live in `YAW_BALANCE_SYSTEM.defaults()` and are mirrored by `App.BALANCE_V1`:

- Hunger warning: `60`
- Hungry threshold: `70`
- Starving threshold: `85`
- Spirit breakthrough threshold: `85%`
- Spirit after breakthrough: `20%`
- Move/travel: `+1` hunger
- Search: `+1` hunger
- Fight: `+3` hunger
- Talk: `+1` hunger
- Play/Seduce: `+4` hunger
- Feast/contact: `+2` hunger before any relief or containment result
- Feed/support: `+1` hunger
- Flee: `+3` hunger
- Move Row: `+1` hunger
- Rest: `-10` hunger relief, plus existing recovery/time behavior

These numbers are deliberately low. The goal is to reveal tradeoffs without making the early game brittle.

## Action Cost Rules

- Travel applies tiny hunger pressure to living party members.
- Talk remains low-cost and slow Spirit progress.
- Play/Seduce costs more hunger and usually produces faster Spirit progress.
- Fight and Flee add moderate hunger pressure.
- Move Row consumes the turn and adds a small cost.
- Feed costs the supporting actor a small amount while preserving existing healing/hunger-relief effects for the recipient.
- Feast and Scavenge continue to use existing containment/remains relief paths; this pass does not create itemized creature pieces or permanent stat gains.
- Inspect, quest, trade, recruit, loot, and structural detail actions do not add hunger pressure.

Impossible actions that are blocked during selection or preview should not charge a cost. Actions that are allowed to resolve and then fail can still cost the actor because the attempt happened.

## Spirit Breakthrough

When social actions raise a non-party target to the V1 Spirit threshold, the target enters a breakthrough state:

- `spiritResolved = true`
- `recruitReady = true`
- `willing = true`
- disposition becomes friendly where appropriate
- current Spirit drops to the post-breakthrough floor

The drop represents guard lowering and emotional resolution, not a loss of progress. Recruitment stays explicit: the target does not automatically join the party, and existing party cap / NPC role checks still apply.

## Reward Parity

Baseline nonviolent victory should be equivalent to ordinary combat victory. V1 sets Talk and Play/Seduce enemy-resolution rewards to the same baseline as fight defeat, while preserving different flavor, tags, relationship outcomes, and follow-up opportunities.

## UI Feedback

Action buttons should expose compact cost previews through `title` / `aria-label` rather than adding more visible clutter to the composer.

Scene Feed may emit cost and relief beats when a threshold is crossed or a notable hunger/relief event happens. Activity Log remains technical history.

## Non-Goals

This V1 pass does not implement:

- a new stamina, focus, morale, or fatigue resource
- a full combat economy rebalance
- procedural or moddable perk balancing
- Feast / Containment V2 redesign
- itemized creature pieces
- permanent stat absorption
- detailed size-based nourishment balancing beyond existing Feast/Remains behavior
- party-size upgrade balance

Broader balance should be driven by playtest data after this V1 pressure layer is stable.
