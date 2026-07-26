# Core Game Maturity Backlog

Status: **approved next program**

Begin this program after the 0.15.0 readiness goal is closed. Its purpose is
to bring ordinary play loops up to the maturity of the save, module, map, and
presentation foundations. It is not a feature-expansion cycle.

## Program guardrails

- Core play must remain deterministic and fully usable without an LLM or
  remote service.
- AI may choose among legal intents and provide characterization; it may not
  own costs, validation, outcomes, world mutation, or save truth.
- Existing saves receive explicit normalization or migration rather than
  silently changing meaning.
- Each mechanic must explain its current effect in player-facing UI and in the
  tutorial before it is considered mature.
- Balance changes require named scenarios and observable evidence.

## 1. Quest Contract V2

- Make the lifecycle explicit: Available, Active, Objectives Complete, Ready
  for Turn-In, Turned In, and Failed.
- Give every quest an explicit completion policy: automatic, original giver,
  named location, or an authorized faction representative.
- Enforce proximity and service availability for physical turn-ins. The Quest
  Log may guide the player but must not grant a remote physical reward.
- Preserve giver identity and origin, and keep objective and turn-in markers
  visible through the appropriate lifecycle states.
- Generate deterministic procedural quests from bounded archetypes such as
  hunt, gather, deliver, survey, escort, and recover. Destination, difficulty,
  and reward must reflect reachable distance, local danger, and player
  progression.
- Support authored quests as a declarative stage/event graph with bounded
  triggers such as accept, enter, interact, acquire, defeat, return, and
  choose. Core and modules must not require arbitrary quest callbacks.
- Persist branch, objective, giver, destination, and reward state across save,
  reload, containment, and service suspension.

## 2. Review Map V2

- Render active objectives, tracked objectives, turn-in destinations, quest
  givers, structures, danger, party presence, and other points of interest as
  distinguishable layers.
- Allow a quest to be tracked with a visible direction vector, distance, and
  next-step summary.
- Make known tiles clickable and keyboard accessible, with a selected-tile
  inspector that never materializes unknown world state.
- Provide visual zoom, pan, recenter, marker filters, and a legend rather than
  changing only the sampled map radius.
- Support a persistent or collapsible left/right desktop dock and a bounded
  full-screen or sheet presentation on mobile.
- Preserve fog of war, deterministic topology, traversal truth, and
  Lightweight/Textured semantic parity.

## 3. Companion Duty, Stance, and Control

Do not collapse these concepts in persisted game state. They may share one
player-facing **Companion Behavior** surface.

### Duty

Duty describes what a companion contributes and is practiced at:

- Guard: protection, threat response, and ambush mitigation.
- Scout: awareness, danger intelligence, and route observation.
- Support: recovery, assistance, and stabilization.
- Gatherer: search, resource detection, and safe scavenging.

Every duty needs a concrete benefit, tradeoff, visible effect summary, and
bounded exploration/combat acceptance scenario.

### Stance

Stance describes autonomous risk and targeting posture:

- Aggressive
- Balanced
- Defensive
- Passive

The current Healer behavior belongs under Support priorities; Scavenger
belongs under Gatherer priorities. They should not remain peer stances beside
Aggressive and Passive.

### Control source

Each companion supports a clear control source:

- Manual: the player chooses the turn.
- Deterministic autonomy: the canonical offline fallback scores legal intents.
- AI control: an optional provider chooses among the same legal intents.

Provider failure, timeout, invalid output, or unavailable service must fall
back to deterministic autonomy without losing the turn. All choices resolve
through the same action validator and deterministic mechanic.

### Recruitment continuity

Record a bounded recruitment context: method, initiator, target, location,
time, and relevant relationship/disposition snapshot. It seeds the initial
stance without permanently overriding player agency:

- defeated or submitted recruitment tends Passive or Defensive;
- player-led persuasion or seduction tends Defensive/protective;
- companion-led social recruitment tends Aggressive/confident;
- ordinary voluntary recruitment tends Balanced.

Changing duty or stance later may be constrained by loyalty, willingness, or
authority once those systems are explicitly balanced.

### Deterministic autonomy

The offline controller scores only legal actions using duty, stance, urgency,
relationship, condition, and a deterministic tie-break. It acts on companion
combat turns and may emit one bounded reaction during tile resolution:

- Scout notices danger or opportunity.
- Guard reacts to ambush pressure.
- Support assists recovery or a struggling ally.
- Gatherer notices or safely gathers resources.

Companions remain on the party's tile unless a resolved mechanic explicitly
moves, flees, drops off, or strands them.

### Deferred emotional evolution

Hunger, fear, loyalty, and remembered history may later add temporary,
player-visible biases. They must not silently rewrite the selected stance.
Treat evolving emotional state as experimental until survival and interaction
balance is stable.

## 4. Item Contract V2 and Core Economy

Items are a primary core loop for ordinary and mature content. The engine
contract stays content-neutral; first-party safe content and optional mature
packs supply their own names, descriptions, art, acquisition routes, and
rating metadata.

### Current truth

- Core currently supports individual inventory instances, a shared pack,
  ground drops, buying and selling, healing-item use, and equipment.
- Only healing consumables have an implemented `Use` resolver. Definitions
  that advertise damage or buff effects are data-only until a bounded item
  effect resolver exists.
- `material` and `effect: craft` are compatibility metadata only. There is no
  recipe registry, ingredient transaction, crafting action, station, skill,
  time cost, output resolver, or crafting save state.
- Material-like core loot is presented as **Trade Goods**. Preserve its
  internal future-use metadata, but do not promise crafting in item copy or
  player-facing controls.
- `content:add_item` currently owns serializable contributed data but does not
  register it in the runtime item-definition lookup used by inventory,
  merchants, equipment, or rewards. Mod-added items are not production-ready
  until Item Registry V2 closes that gap.

### Definition and instance contract

- Give every item definition a stable namespaced ID independent of its
  localized display name. Saves, quests, stock tables, loot, and equipment
  refer to IDs rather than English names.
- Separate immutable definitions from saved instances. Normalize quantity,
  ownership, equipped location, source, and any approved per-instance state.
- Decide which classes stack and enforce one capacity rule across inventory,
  loot, trade, quest rewards, death bags, and module content.
- Establish coherent classes for consumables, equipment, trade goods,
  quest/key items, and future tools without using a category as an implied
  mechanic.
- Define missing-owner behavior for saved instances whose supplying module is
  disabled or removed. Never silently delete or reinterpret player property.

### Bounded effects and equipment

- Replace string effects with a versioned declarative effect profile covering
  targets, costs, legal contexts, deterministic deltas, consumption, and
  player-facing preview.
- Ship and test healing first. Damage, buffs, cures, utility, and
  content-rated effects remain unavailable until each has a canonical
  resolver and failure language.
- Validate self, companion, and legal external targeting in exploration and
  combat, including turn consumption and committed narrative failure.
- Make equipment slots, species/body compatibility, stat changes, techniques,
  companion ownership, and unequip/drop/death behavior explicit.
- Keep mature item behavior in optional content packs using the same bounded
  engine vocabulary; do not add arbitrary module callbacks to item use.

### Acquisition, value, and progression

- Establish coherent starter items, loot tables, search finds, shops, quest
  rewards, scarcity, replacement paths, and gold sinks.
- Make the minimum core catalog intentional: at least one honest early option
  for every supported equipment slot, small and strong recovery, an ailment
  answer once that resolver exists, low/medium/high-value trade goods, and
  explicit quest/key objects. Optional mature packs may broaden this catalog
  without becoming required for ordinary progression.
- Give every shipped item a real acquisition source, implemented use or
  honest trade-only purpose, bounded value, localized explanation, and
  save-compatible identity.
- Protect quest/key items from accidental sale or drop according to an
  explicit policy.
- Validate healing, equipment, drops, sales, rewards, capacity, party
  targeting, death bags, and service suspension as one economy rather than
  isolated controls.
- Remove or clearly label compatibility-only and placeholder content.

### Crafting is deferred

Before adding a Craft action, approve a separate Craft Contract covering
recipe discovery, ingredients, quantities, stations, time, skill, failure,
outputs, refunds, module namespaces, missing-owner behavior, and save
migration. Until then, recipes and dedicated crafting ingredients should not
appear in core UI. Trade Goods may retain forward-compatible tags so a later
contract can adopt them without rewriting existing saves.

## 5. Progression and Reward Loop

- Define what grants XP and practice, what cannot be farmed indefinitely, and
  how quest, combat, exploration, support, search, trade, and item rewards
  reinforce distinct play styles.
- Make level, stats, perks, equipment, techniques, and companion development
  explain one coherent power curve rather than several unrelated bonus
  systems.
- Validate a starter-to-early-midgame route against visible danger bands,
  replacement gear, recovery access, quest rewards, and realistic companion
  acquisition.
- Remove dead perks and rewards, or label compatibility placeholders
  honestly, before expanding the catalog.
- Keep progression deterministic in core. Optional AI may characterize a
  choice but cannot award XP, invent items, or mutate advancement truth.

### Perk Frontier V2

Do not present perks as a sprawling map. The choice surface is a **current
frontier**: it shows only perks the player can select now.

- Hide locked, already-selected, incompatible, and merely hypothetical perks.
  Do not render future nodes, disabled silhouettes, connector lines, or
  prerequisite copy for choices the player cannot make.
- Recompute the frontier after every choice and relevant progression event.
  If multiple choices are pending, selecting one may reveal a newly eligible
  option immediately.
- Keep the choice surface flat and compact. Category or source labels may
  explain a choice, but tree filters are unnecessary while the eligible set is
  small. Selected perks belong in the character summary, not in the picker.
- Design the eligibility grammar so the full current frontier remains
  readable—normally three to six choices—rather than hiding an arbitrary
  subset behind random rolls.

The procedural element belongs in eligibility and offers, not in inventing
unbounded mechanics:

- Perk definitions remain authored, versioned, localized, and deterministic.
- Bounded conditions may use selected prerequisites, species/profile traits,
  level milestones, practiced actions, survival or exploration milestones,
  quest outcomes, equipment capability, or other saved canonical facts.
- A deterministic offer resolver may personalize which authored choices enter
  the frontier from those facts. It must use stable save/world inputs, explain
  why a newly available perk appeared, and reproduce the same choice set after
  save/load.
- AI may phrase or recommend a perk but cannot create definitions, change
  eligibility, or select for the player.

Before expanding the catalog:

- Audit the nine universal perks and the matching two-per-species branches.
  Keep distinct playstyle choices; replace filler stat steps that do not
  create a meaningful decision.
- Version a bounded perk-effect registry. Numeric stat changes and named
  passives must have canonical apply, rollback, save, and respec behavior.
- Move the debug perk grant behind an explicit cheat/development gate.
- Decide whether respec is free, costs a service/resource, or is a difficulty
  option; the ordinary Stats surface should not look like a debug console.
- Localize perk names, descriptions, availability explanations, and selection
  outcomes rather than only localizing the surrounding controls.
- Keep V2 player-focused until companion progression has an explicit ownership
  and autonomy policy.

There is no public mod perk seam today. A future Perk Profile contract should
register namespaced authored definitions and bounded eligibility/effect data,
reject executable callbacks, remove owned offers on unload, and preserve a
safe inert record for already-selected perks whose provider is unavailable.
Core and mature-content modules can then contribute perks through the same
mechanical contract and content-policy filtering.

## 6. Tutorial and Explainability

- Replace the broad one-pass tutorial with progressive, replayable lessons.
- Explain creature-card bars, badges, conditions, rows, current actor, marked
  target, Duty, Stance, and control source.
- Teach actor/target selection, group and many-to-many actions, committed
  failures, combat reach, quests, turn-ins, map tracking, item acquisition,
  item use, equipment, trade goods, containment, recovery, and companion
  management.
- Add optional tips and strategies without blocking experienced players.
- Put concise effect summaries, requirements, and tradeoffs at the point of
  choice so the tutorial is not the only documentation.
- Explain why each currently offered perk became available without previewing
  the hidden future catalog.

## 7. Acceptance before broad playtesting

- Canonical scenarios prove each quest lifecycle, turn-in policy, procedural
  quest archetype, authored branch, map marker, Duty, Stance, control source,
  item category, item ownership/unload case, and tutorial route.
- Mobile and desktop checks cover keyboard, touch, 20px text, high contrast,
  reduced motion, and long localized strings.
- AI and offline controllers are run from the same legal state; provider
  failure proves deterministic fallback.
- Only after these core loops are understandable, internally coherent, and
  locally green should broad balance and long-form playtesting resume.
