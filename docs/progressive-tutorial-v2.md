# Progressive Tutorial V2

Status: **implemented; integrated accessibility acceptance complete**

Help is a replayable library rather than a one-pass feature tour. A lesson is
added to the library only when current game state proves its mechanic is
relevant. Once unlocked it remains available, even when the immediate state
changes.

Tutorial state is stored locally as a versioned set of unlocked and completed
lesson IDs. It contains no world truth and cannot change game outcomes. Reset
clears that history and immediately re-derives only the lessons justified by
the current state.

## Lesson and point-of-choice crosswalk

| Lesson | Unlock evidence | Point-of-choice help |
| --- | --- | --- |
| Welcome | Always | Main menu and Help entry |
| Creature cards | Player exists | Card bars, badges, expandable details, Actor and Mark labels |
| Actors, targets, attempts | Player exists | Selection sentence, action requirements, costs, commit/cancel controls, Scene Feed |
| Travel and Review Map | Player exists | 3x3 direction labels, tile inspector, map legend, layers, quest tracking, zoom/pan/recenter |
| Combat turns | Combat observed | Current/next order, legal controls, Skip/Flee fallback, autonomous action evidence |
| Rows and reach | Combat observed | Row badges, reach preview, protected-attempt preview, committed narrative failure |
| Group actions | More than one living party member | Actor/target belts, selection sentence, plan summary, per-target effectiveness preview |
| Items and Holdings | Carried item exists | Item purpose, effect preview, legal target chooser, protected quest-item feedback |
| Equipment | Equipped or equippable item exists | Slot, bonus, compatibility, technique requirement and equip/unequip preview |
| Quests and turn-in | Quest or quest giver exists | Lifecycle status, objective/turn-in marker, guidance, reward and physical turn-in controls |
| Companion behavior | Companion exists | Duty benefit/tradeoff, Stance description, Control source and fallback copy |
| Perk Frontier | Level, pending choice, or selected perk exists | Only-current frontier, availability reason, effect description, confirmed respec |
| Containment | Living-container state observed | Progress, vitality, capacity, release eligibility and specific-target commands |
| Defeat and recovery | Defeat/recovery state observed | Recovery-mode descriptions, restrictions, cost/location guidance and Flee distinction |

## Interaction contract

- The Help button may be opened at any time.
- The lesson index contains only unlocked lessons and exposes Read/New state.
- Previous, Next, direct lesson selection, Close, and Reset are native buttons
  inside the existing focus-trapped modal contract.
- Next, Previous, or selecting a different lesson records the current lesson
  as read. Reading never mutates game state.
- The final Next control becomes Done and closes Help.
- Newly relevant lessons use one deduplicated, non-blocking system toast.
- Optional strategy tips are visually subordinate and do not block progress.

## Accessibility and localization

- Title, content, tip, controls, status, progress, and unlock notifications are
  maintained in English and Spanish.
- The modal has an explicit accessible name and descriptions, polite atomic
  lesson announcements, native keyboard controls, and focus restoration.
- Mobile uses a bounded vertical layout with a horizontally scrollable lesson
  index. Desktop uses an index-and-content layout.
- The surface uses theme variables, has no required motion, tolerates long
  localized copy through internal scrolling, and remains operable at enlarged
  text.
