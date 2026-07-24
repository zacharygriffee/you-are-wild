# Recovery Mode V1

Recovery Mode V1 is the bounded module contract for choosing what happens
after an ordinary terminal defeat. Core still owns defeat detection,
companion settlement, inventory consequences, world persistence, Hardcore
deletion, and resurrection. A module may declare a recovery profile; it may
not replace those resolvers with callbacks.

## Registration

Declare `mechanics:add_recovery_mode`, then register a namespaced profile:

```js
MODS.registerRecoveryMode('moon-pilgrimage', {
  label: 'Moon pilgrimage',
  labelKey: 'example_mod.recovery.moon',
  descriptionKey: 'example_mod.recovery.moon.description',
  icon: '🌙',
  entry: 'defeat-site',
  resolution: 'shrine',
  inventory: 'death-bag',
  traversal: 'ethereal',
  restrictions: ['combat', 'inventory', 'interactions', 'structures'],
  vitalityPercent: 25
});
```

The resulting key is `<module-id>:<profile-id>`. Profiles are copied,
validated, and deeply frozen. An installed profile appears in the Game Mode
setting and is snapshotted into `defeatState` when a terminal defeat resolves.

## Bounded schema

| Field | Values |
| --- | --- |
| `entry` | `defeat-site`, `safe-anchor` |
| `resolution` | `immediate`, `shrine` |
| `inventory` | `settings`, `death-bag`, `retain` |
| `traversal` | `normal`, `ethereal` |
| `restrictions` | `combat`, `inventory`, `hunger`, `interactions`, `recruitment`, `structures` |
| `vitalityPercent` | integer 1–100 |

`label`, `description`, and `icon` are bounded fallbacks. Non-core locale keys
must begin with the owning module ID. A `shrine` profile must restrict combat;
this prevents a partly recovered character from re-entering battle.

V1 does not admit arbitrary destinations, resurrection callbacks, item
creation, stat mutation, procedural shrine placement, or module-owned death
handling.

The maintained
[Waystone Recovery](../optional-mods/you-are-wild-waystone-recovery.yawmod.json)
fixture demonstrates a module-owned profile composed only from these fields.
The boundary between expressible V1 profiles and later companion extraction,
resurrection economies, authored destinations, landmarks, or spectral
abilities is recorded in
[Later Recovery Variants Decision](recovery-variants-decision.md).

## Core profiles

- `core:regenerate` immediately returns the player alone to the validated safe
  anchor and applies the selected inventory policy.
- `core:ghost` rises at the defeat site, applies consequences once, permits
  ethereal cardinal travel without hunger or encounters, and blocks ordinary
  combat, inventory use, interactions, recruitment, and structure use until
  the player reaches their validated safe anchor and resurrects.

Hardcore is authoritative and continues to end and delete only the active run;
it does not offer a regular recovery profile.

## Persistence and unload

Full and sparse saves retain the selected mode key, recovery phase, and shrine
anchor. Legacy defeated saves migrate to `core:regenerate`. A saved shrine
journey resumes as a journey rather than replaying defeat consequences.

Disabling a module removes its profiles. If its profile is selected, Settings
falls back to `core:regenerate`. If its journey is active, the player returns
to the explicit ordinary recovery prompt; core does not continue executing a
missing owner's rules. Inventory consequences remain idempotent through this
fallback.

## Ownership and presentation

Modules own labels and declarations, while core owns command surfaces, Scene
facts, Activity Log outcomes, save state, movement, and resurrection. A
recovery mode cannot use narration to create state, suppress deterministic
consequences, revive companions, or bypass content policy.
