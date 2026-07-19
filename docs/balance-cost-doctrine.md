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
- Rest: `+8` hunger over eight hours, plus eight digestion ticks and existing recovery behavior
- Stomach containment: `-3 × prey size` immediate fullness, capped at `20`
- Complete digestion: `-15 × prey size` hunger, capped at `100` and distributed by progress

These numbers are deliberately low. The goal is to reveal tradeoffs without making the early game brittle.

## Action Cost Rules

- Travel applies tiny hunger pressure to living party members.
- Talk remains low-cost and slow Spirit progress.
- Play/Seduce costs more hunger and usually produces faster Spirit progress.
- Fight and Flee add moderate hunger pressure.
- Move Row consumes the turn and adds a small cost.
- Feed costs the supporting actor a small amount while preserving existing healing/hunger-relief effects for the recipient.
- Feast gives modest size-scaled fullness when prey enters a stomach. Most nourishment arrives as digestion advances.
- Fast and slow digestion provide the same total size-scaled nourishment. Slow digestion spreads that relief across more ticks instead of reducing its total.
- Scavenge continues to use finite Remains Pool relief; this pass does not create itemized creature pieces or permanent stat gains.
- Inspect, quest, trade, recruit, loot, and structural detail actions do not add hunger pressure.

Impossible actions that are blocked during selection or preview should not charge a cost. Actions that are allowed to resolve and then fail can still cost the actor because the attempt happened.

One-to-many actions use command-level costs in V1. A single actor performing one multi-target command pays the action cost once for that command, not once per target. Group actions charge each committed participant once when the group action resolves, not once per target. If a delayed/group plan fizzles before resolution because the target or participants are no longer valid, the current V1 behavior consumes the queued plan/turn flow but does not apply an extra hunger charge.

Multi-target Fight is an opt-in distributed effect rather than repeated full-strength attacks. With `N` targets, a novice begins at `1 / N` of their ordinary contribution per target. Persistent multi-Fight practice recovers the missing contribution continuously up to mastery, while explicit equipment, natural-technique, instinct, or true-area declarations may recover additional effect. In many-to-many Fight, each participant is scaled from their own practice and technique before contributions are combined. Practice is awarded once per completed command, diminishes within the same encounter/tile-day context, persists per party member, and never directly raises general `Figh` or global XP. Single-target Fight, mutual sparring, paired commands, action costs, reach, status application, and every unprofiled intent retain their prior rules.

Rest is recovery and elapsed time, not food. Eight hours of rest add eight hunger points, heal condition, and advance containment by eight digestion ticks. A creature with nothing digesting wakes hungrier. A sufficiently large active meal can offset that pressure or leave the holder more sated; small or slow meals may offset only part of it.

## Flee and Submission Outcomes

Successful non-party creature flee relocates the survivor to one deterministic, traversable cardinally adjacent tile or connected interior room. It leaves the current encounter without being deleted from the world. Individual party members can withdraw from active combat, but V1 does not split party membership across multiple map tiles.

`Survivable containment` is scoped to containment outcomes only. Terminal digestion under that option leaves a fully softened survivor at minimal condition who can still be released; `Fatal digestion` takes precedence when both variants are enabled. Survivable containment never converts an enemy defeated by Fight into a friendly one. With `Power dynamics` disabled, ordinary Fight defeat follows the ordinary defeated/remains path. With `Power dynamics` enabled, a Fight defeat becomes explicit submission: the survivor remains at one condition, becomes friendly and `recruitReady`, and can be recruited through the normal party-cap and eligibility checks.

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

Action buttons should expose compact cost previews through `title` / `aria-label`. When a profiled multi-target Fight is composed, desktop and mobile surfaces also show the current per-target contribution percentage before commitment.

Scene Feed may emit cost and relief beats when a threshold is crossed or a notable hunger/relief event happens. Activity Log remains technical history.

## Non-Goals

This V1 pass does not implement:

- a new stamina, focus, morale, or fatigue resource
- a full combat economy rebalance
- procedural or moddable perk balancing
- Feast / Containment V2 redesign
- itemized creature pieces
- permanent stat absorption
- party-size upgrade balance

Broader balance should be driven by playtest data after this V1 pressure layer is stable.
