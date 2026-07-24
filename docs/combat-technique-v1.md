# Combat Technique V1

Combat Technique V1 is the declarative module contract for named Fight
variants. Core remains authoritative for target selection, turn timing,
deterministic rolls, reach failure, damage, multi-target practice, status
processing, defeat, Scene Beats, saves, and Activity Log output. A technique
selects bounded parameters inside that resolver; it does not execute module
code during combat.

## Registration

A module declares `mechanics:add_combat_technique` and registers an owned
profile:

```js
MODS.registerCombatTechnique('sweepingArc', {
  label: 'Sweeping Arc',
  labelKey: 'example_mod.technique.sweepingArc',
  description: 'A broad trained weapon arc.',
  descriptionKey: 'example_mod.technique.sweepingArc.description',
  icon: '🌀',
  eligibility: {
    species: [],
    abilities: ['trained'],
    flags: []
  },
  equipment: {
    required: true,
    anyTags: ['sweeping'],
    allTags: [],
    slots: ['hands']
  },
  reach: 'hybrid',
  damage: {
    multiplier: 1.1,
    flat: 0
  },
  area: {
    maxTargets: 3,
    distribution: 'split',
    recovery: 0.25
  },
  status: {
    effect: 'stun',
    chance: 0.2,
    turns: 1,
    power: 1
  }
});
```

The runtime key is `<module-id>:<technique-id>`. IDs, text, lists, numbers,
target counts, and the total registry are bounded. Unknown fields and values
reject registration atomically. Returned profiles and their nested data are
frozen copies.

## Eligibility And Equipment

All listed `species`, `abilities`, and boolean `flags` must match the actor.
An empty eligibility object is universal. Equipment can require at least one
equipped item, any authored tag, every authored tag, and an equipped item in
one of the listed slots.

Equipment tags may come from an equipped item instance or its registered item
definition through `techniqueTags`, `combatTags`, or `tags`. Slot, item name,
item type, and item-definition slot are also matching tokens. A provider that
supplies a technique-specific item should author explicit `techniqueTags` and
must also use a documented route that makes the item obtainable; registering
item data alone does not place it in an inventory. Do not depend on localized
display text for tag matching.

For a group technique, every selected actor must satisfy the profile. If the
equipment or capability is lost before a queued command resolves, the prepared
technique fails as an in-world combat outcome rather than silently becoming a
different attack.

## Reach

`reach` is optional. When omitted, the actor's ordinary Fight reach remains in
effect. An explicit value is `melee`, `ranged`, `hybrid`, or `special`.

The selected profile changes reach for that command only. It does not write a
permanent reach flag to the actor. Core still decides formation blockers,
flying access, contact rules, terrain, and the narrative reach failure.

## Damage And Area

`damage.multiplier` is from `0.25` to `2`; `damage.flat` is an integer from
`0` to `25`. Core computes the ordinary deterministic Fight result first and
then applies the selected profile. A minimum successful hit remains one.

`area.maxTargets` is from `1` to `8`.

- `distribution: "split"` retains the established multi-target distribution
  and practice model. `recovery` from `0` to `1` recovers part of the missing
  per-target contribution.
- `distribution: "full"` declares a true authored area technique and preserves
  full effect for every target up to the cap.

Basic Attack remains available and keeps its existing distributed
multi-target behavior. Registering a module never replaces Basic Attack.

## Status

One optional status profile may use `bleed`, `burn`, `freeze`, `stun`, `sleep`,
`charm`, or `fear`. Chance is from `0` to `1`, duration is one to five turns,
and power is one to ten. Core performs the chance roll through the combat-state
deterministic random stream after positive damage and owns the resulting
status shape and round processing.

A technique may not register a new arbitrary status key, callback, script, or
status processor. Extending the status vocabulary requires a later versioned
core contract.

## UI And Resolution

After actors and targets are selected, Fight opens the same accessible
sub-interaction surface used by other contextual actions when at least one
additional technique is eligible. The sheet shows Basic Attack, owned
localized technique labels, requirements, and unavailable reasons. The chosen
namespaced key is carried in `InteractionPlan.subAction`.

Single-actor and group commands use the same registry. Group commands retain
slowest-participant timing, and multi-target commands retain deterministic
target order. A module does not receive a combat execution callback.

## Saves, Ownership, And Unload

Profiles are module-owned runtime registrations, not unit save data. Queued
group commands persist the selected namespaced technique key in full and sparse
combat saves. Restore keeps a queued command only when the profile is active
and every actor still satisfies it; legacy saves without a key use Basic
Attack.

Disabling, replacing, deleting, or policy-unloading a module removes its
profiles and cancels queued commands that reference them. Unrelated Basic
Attack and other owners' work remain. No profile, reach override, status
callback, or UI contribution survives unload.

## Content And Localization

Profiles inherit the owning module's content rating and required category
gates. A blocked module does not register its techniques. Use owned locale
entries for `labelKey` and `descriptionKey`; bounded fallback text remains
available. Technique narration is built from deterministic core facts and
cannot invent state that the resolver did not record.
