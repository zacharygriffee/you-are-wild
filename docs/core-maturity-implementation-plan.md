# Core Game Maturity Implementation Plan

Status: **local implementation and integrated acceptance complete; release
handoff remains operator-gated**

This plan converts `core-maturity-backlog.md` into dependency-ordered work
packs. The program strengthens existing core loops before adding more feature
families. Each pack must remain deterministic, offline-capable, localized,
save-compatible, and usable without optional modules or AI.

## Delivery rules

- Complete one contract-sized work pack at a time.
- Write migration and missing-provider behavior before changing persisted
  identities.
- Add canonical mechanic tests before presentation tests.
- Add mobile, desktop, keyboard, touch, and long-localized-copy checks with
  every new player-facing surface.
- Update the progressive tutorial when a mechanic lands; do not defer all
  explanation work to the end.
- Keep AI advisory. It may choose among legal actions or characterize results,
  but it may not own validation, costs, rewards, eligibility, or save truth.
- Do not publish during the program merely because an individual work pack is
  green. Publish after the integrated acceptance pack or an explicitly
  authorized patch boundary.

## Operator decision gates

Work Pack 0 has no operator blocker. The following decisions were resolved
with the recommended alpha defaults before the named pack reached its
mechanic-changing portion:

1. **Item stacking and capacity — before Work Pack 1 economy tuning.**
   Recommended: stack fungible consumables and trade goods; keep equipment,
   quest/key objects, and stateful items as individual instances. Pack
   capacity counts occupied stacks, with explicit per-stack limits.
2. **Quest/key item disposal — before Work Pack 1 catalog completion.**
   Recommended: block ordinary sale and drop while an item is required by an
   active quest; allow explicit disposal only after the quest resolves or is
   abandoned. Do not add durability in V2.
3. **Procedural quest turn-in default — before Work Pack 2 generation.**
   Recommended: return to the original giver by default, always with map
   guidance. Use automatic completion only for tutorial/discovery objectives
   and use faction representatives only when an archetype explicitly declares
   them.
4. **Companion control default and behavior-change cost — before Work Pack 4
   activation.** Recommended: deterministic autonomy for ordinary companions,
   with Manual and provider-backed AI as explicit alternatives. Keep Duty and
   Stance changes free during alpha; add loyalty, authority, or service costs
   only after those economies are balanced.
5. **Perk respec policy — before Work Pack 5 presentation.** Recommended:
   retain free confirmed respec during alpha, remove it from debug-looking
   presentation, and defer a trainer/resource cost until the economy can
   support it without trapping experimental builds.

The visible-only Perk Frontier, deferred crafting, content-neutral item engine,
rated mature packs, deterministic core, and no arbitrary module callbacks are
already accepted directions rather than open decisions.

## Work Pack 0 — Baseline and migration fixtures

### Purpose

Establish evidence for current behavior before changing item, quest,
companion, or perk identities.

### Work

- Inventory the current save shapes for items, quests, party roles/orders,
  perks, pending choices, map markers, merchants, and module contributions.
- Add representative fixtures for a new save, the current public save, a save
  with equipment and trade goods, active and completed quests, recruited and
  dropped-off companions, and selected perks.
- Name the canonical scenarios that every later work pack must preserve.
- Identify compatibility adapters and version fields needed by Items, Quests,
  Companion Behavior, and Perks.
- Record existing placeholders and debug-only controls so they cannot be
  mistaken for accepted mechanics.

### Exit gate

- Every affected persisted shape has a fixture and explicit migration owner.
- Current tests and full build are green before contract changes begin.

Current evidence and migration ownership are tracked in
`core-maturity-baseline.md`.

## Work Pack 1 — Item Registry V2 and core economy

### Purpose

Make item identity, use, acquisition, trade, save behavior, and module
ownership one coherent contract.

### Work

1. Introduce stable namespaced definition IDs and a compatibility lookup for
   legacy English-name item instances.
2. Separate immutable definitions from saved instances. Normalize identity,
   quantity/stack policy, ownership, equipment location, and approved
   instance state.
3. Route inventory, equipment, loot, quest rewards, death bags, merchants,
   and stock tables through the same registry.
4. Implement a bounded declarative effect resolver. Ship healing first;
   equipment and trade-only purposes remain explicit. Damage, buff, cure,
   utility, and rated effects remain unavailable until individually resolved.
5. Audit the core catalog:
   - early and strong recovery;
   - one honest early option for each supported equipment slot;
   - low, medium, and high-value trade goods;
   - explicit quest/key objects;
   - no player-facing crafting promise.
6. Decide stacking, pack capacity, quest-item sale/drop protection, pricing,
   stock refresh, loot rarity, and replacement paths.
7. Replace the disconnected `content:add_item` side collection with an owned
   registry contract. Define collision, unload, saved-instance, localization,
   content-rating, and missing-provider behavior.
8. Keep optional mature items in rated packs using the same bounded effects
   and ownership rules.

### Exit gate

- Every shipped item has an acquisition route and an implemented use or honest
  trade/quest purpose.
- Legacy saves migrate without item loss.
- Module install, use, save/reload, disable, missing-provider, re-enable, and
  delete scenarios pass.
- Inventory and trade remain accessible on required mobile and desktop
  viewports.

## Work Pack 2 — Quest Contract V2

### Purpose

Turn quests into a complete, reproducible lifecycle rather than isolated
accept/progress events.

### Work

1. Normalize Available, Active, Objectives Complete, Ready for Turn-In,
   Turned In, and Failed states.
2. Define automatic, original-giver, named-location, and authorized-faction
   completion policies.
3. Preserve giver identity, authored origin, service suspension, destination,
   objectives, branch, and reward state.
4. Resolve item objectives and rewards through Item Registry V2 IDs.
5. Add deterministic procedural quest archetypes: hunt, gather, deliver,
   survey, escort, and recover. Scale distance, danger, and reward from
   canonical world and progression facts.
6. Add a bounded declarative stage/event graph for authored quests. Do not
   expose arbitrary module callbacks.
7. Prevent containment, release, recruitment, save/load, or module lifecycle
   from duplicating quests or rewards.

### Exit gate

- Every lifecycle and turn-in policy has a canonical scenario.
- Procedural quests reproduce from stable inputs and remain reachable.
- Authored branches, item rewards, service suspension, and save/reload pass.

## Work Pack 3 — Review Map V2

### Purpose

Make the map a usable planning surface for quests and known-world navigation.

### Work

1. Add distinct layers for tracked objectives, turn-ins, givers, structures,
   danger, party presence, recovery, and other known points of interest.
2. Add tracked-quest direction, distance, next-step summary, and known-route
   guidance.
3. Make known tiles clickable and keyboard accessible with a selected-tile
   inspector.
4. Add visual zoom, pan, recenter, filters, and a legend without materializing
   unknown world state.
5. Support a collapsible desktop side dock and a bounded mobile sheet.
6. Preserve traversal, fog-of-war, Lightweight/Textured, and save semantics.

### Exit gate

- Quest and turn-in routes can be planned without remote reward collection.
- Unknown tiles remain unmaterialized.
- Mouse, keyboard, touch, zoom, long labels, and both graphics modes pass.

## Work Pack 4 — Companion Behavior V2

### Purpose

Give current party roles/orders concrete mechanics and one understandable
behavior surface.

### Work

1. Migrate the existing state into separate persisted concepts:
   - Duty: Guard, Scout, Support, Gatherer.
   - Stance: Aggressive, Balanced, Defensive, Passive.
   - Control: Manual, deterministic autonomy, optional AI.
2. Give every Duty a concrete benefit, tradeoff, preview, and Scene Feed
   evidence.
3. Record recruitment continuity and use it only to seed initial behavior.
4. Implement deterministic autonomy that scores legal actions from Duty,
   Stance, urgency, condition, relationship, and stable tie-breaks.
5. Use the same validator and resolver for manual, deterministic, and AI
   choices. Provider failure falls back without losing the turn.
6. Cover combat turns, bounded tile reactions, drop-off/rejoin, defeat
   stranding, containment, and save/load.
7. Present Duty, Stance, and Control together without implying they are one
   persisted value.

### Exit gate

- Every Duty/Stance combination has bounded behavior evidence.
- Manual and autonomous choices resolve through identical legal mechanics.
- Offline fallback, AI failure, recruitment, drop-off, and save/load pass.

Status: **complete.** The implemented contract and deliberate exclusions are
recorded in `companion-behavior-v2.md`.

## Work Pack 5 — Progression V2 and Perk Frontier

### Purpose

Make advancement coherent without creating a complex perk-management map.

### Work

1. Audit XP, practice, levels, stat growth, perks, equipment, techniques,
   quests, companions, and anti-farming as one power curve.
2. Version a bounded perk-effect registry with canonical apply, rollback,
   respec, save, and migration behavior.
3. Replace the current full-tree picker with a flat current frontier:
   - show only selectable perks;
   - hide locked, selected, incompatible, and hypothetical choices;
   - recompute immediately after selection and progression;
   - keep the normal frontier to roughly three to six meaningful choices.
4. Keep definitions authored. Derive deterministic eligibility from saved
   facts such as prerequisites, species/profile, level, practiced actions,
   survival/exploration milestones, quests, and equipment capabilities.
5. Explain why a perk became available without previewing the hidden catalog.
6. Audit the current universal and species perks. Replace filler increments
   where they do not create a distinct play decision.
7. Move debug grants behind a development/cheat gate and decide the ordinary
   respec policy.
8. Add a bounded namespaced Perk Profile module contract only after core
   effect and eligibility vocabulary is stable.

### Exit gate

- The picker never renders unavailable future nodes.
- Frontier choices reproduce across save/load and localization.
- Every perk has a demonstrated effect, rollback, and progression purpose.
- Module lifecycle cannot corrupt selected perks or eligibility.

Status: **complete.** The
implemented power curve, anti-farming rules, visible-only frontier, effect
registry, localization behavior, and module lifecycle are recorded in
`progression-v2.md`.

## Work Pack 6 — Progressive tutorial and explainability

This work begins with Pack 1 and closes after Pack 5.

### Work

- Replace the broad one-pass tutorial with replayable lessons that unlock when
  the relevant mechanic first becomes usable.
- Explain cards, bars, conditions, rows, actor/target selection, group actions,
  reach, committed failures, items, equipment, quests, map tracking,
  companion behavior, perks, containment, and recovery.
- Add concise requirements, costs, tradeoffs, and outcome previews at the
  point of choice.
- Add optional strategy tips without blocking experienced players.
- Explain currently available choices without advertising hidden future
  systems.

### Exit gate

- Every matured mechanic has a replayable lesson and point-of-choice help.
- Tutorial state persists, can be reset, and works with keyboard, touch,
  reduced motion, high contrast, and maintained locales.

Status: **complete.** Lesson unlocks, persistence, reset, replay, strategy
tips, point-of-choice help, and integrated accessibility acceptance are
recorded in `progressive-tutorial-v2.md` and
`core-maturity-acceptance.md`.

## Work Pack 7 — Integrated acceptance and release candidate

### Work

- Run starter-to-early-midgame scenarios through quest, item, economy,
  companion, perk, recovery, and map loops.
- Verify difficulty and danger communication against weakest valid starters.
- Exercise legacy migration and current save/resume at every major lifecycle
  state.
- Exercise representative safe, mature, locale, item, species, narration,
  graphics, and behavior modules through install/use/save/unload/reload.
- Run required mobile and desktop viewport, keyboard, touch, screen-reader
  semantics, 20px text, high contrast, reduced motion, and long-copy checks.
- Run full build, branding, generated-artifact identity, offline/file-origin,
  localhost, and hosted smoke.
- Update changelog, release notes, compatibility statement, and rollback
  artifact only after the evidence is green.

### Exit gate

- No known core loop depends on a placeholder, unavailable provider, hidden
  debug action, or unexplained mechanic.
- Broad external playtesting can focus on balance and enjoyment rather than
  discovering contract gaps.

Status: **local acceptance complete.** Exact-worktree evidence and the
remaining operator-owned release handoff are recorded in
`core-maturity-acceptance.md`. Assigning the release boundary, committing and
pushing, observing CI, selecting a rollback artifact, and publishing to Sites
are deliberately not inferred from local acceptance.

## Recommended first execution slice

Begin with Work Pack 0 and the registry-only portion of Work Pack 1:

1. Add current and legacy item fixtures.
2. Introduce stable item definition IDs plus name compatibility.
3. Route read-only item lookup through the registry without changing balance.
4. Prove save, inventory, merchant, equipment, loot, and quest compatibility.

The recommended first execution slice and all subsequent work packs are
complete locally. Future expansion remains subject to the bounded contracts
and explicit exclusions recorded by each subsystem document.
