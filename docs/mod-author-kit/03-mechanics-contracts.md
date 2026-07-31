# Mechanics Contracts

These contracts add bounded player-facing mechanics. Prefer declarative
profiles. Action Variant V1 is the one current callback-based mechanic and
therefore has a deliberately narrow authoring rule below.

## Action Variant V1

Permission: `content:add_action_variant`

```js
MODS.registerActionVariant('play', 'shareGreeting', {
  label: 'Share Greeting',
  sfwLabel: 'Share Greeting',
  icon: '👋',
  scope: 'both',
  requirements: ['reach'],
  validate(actor, target) {
    return Boolean(actor && target);
  },
  execute(actor, target) {
    return {
      summary: `${actor.name} shares a friendly greeting with ${target.name}.`
    };
  }
});
```

Public action names are `feed`, `feast`, and `play`. `play` is normalized to
the runtime's compatibility action name, but authors should continue to spell
it `play`. Fight, Talk, Flee, arbitrary new top-level commands, and replacement
of core variants are not in this contract.

Variant IDs match `[a-z][a-zA-Z0-9_-]*`, at most 64 characters. Each action
has a total limit of 24 variants including core variants.

| Field | Contract |
| --- | --- |
| `label` | Fallback text, truncated to 80 characters. |
| `sfwLabel` | Safe-posture fallback, truncated to 80; defaults to `label`. |
| `icon` | Truncated to 16 characters. |
| `scope` | `self`, `target`, or `both`; default `target`. |
| `requirements` | At most the recognized values `cost`, `reach`, `capacity`, and `willingness`. |
| `cost` | Optional static serializable object copied for display. It is not automatically charged. |
| `validate` | Required synchronous function returning truthy when one actor/target pair can use the variant. |
| `execute` | Required synchronous function invoked for the selected pair. |
| `unavailableReason` | Optional synchronous function returning explanation text. |
| `defaultForAction` | If truthy, makes this variant the default while installed. Avoid this unless the mod's purpose requires it. |

`validate(actor, target, holder)` must be quick, deterministic, and free of
side effects. An exception means unavailable.

`execute(actor, target, context)` may return a string or an object with
`summary`; exceptions become a core-owned failure result. The context currently
contains `app`, `action`, `subAction`, `actorName`, and `actorVerb`, but `app`
is not a stable public API. A source-independent mod must not inspect or mutate
`context.app`.

The source-independent authoring subset is:

- produce a presentation-only result from `actor` and `target`;
- read, grant, or spend the module's own registered resource through the
  closed-over `MODS.resources` API;
- do not alter arbitrary actor/target fields;
- do not call DOM, storage, world, combat, inventory, quest, or save internals;
- do not claim damage, healing, containment, inventory transfer, recruitment,
  or another state change unless a documented API performed it.

Example using an owned resource:

```js
MODS.registerResourceProfile('spark', {
  label: 'spark',
  capacity: 3,
  regeneration: { trigger: 'rest', every: 1, amount: 1 }
});

MODS.registerActionVariant('play', 'sparkDisplay', {
  label: 'Spark Display',
  icon: '✨',
  scope: 'target',
  requirements: ['cost'],
  validate(actor, target) {
    return Boolean(target) &&
      (MODS.resources.read(actor, 'spark')?.current || 0) >= 1;
  },
  execute(actor, target) {
    if (MODS.resources.spend(actor, 'spark', 1) !== 1) {
      return { summary: `${actor.name} cannot gather enough spark.` };
    }
    return { summary: `${actor.name} traces a harmless spark for ${target.name}.` };
  }
});
```

Core still owns pair selection, reach evaluation, action timing, Activity Log,
Scene Feed, and unload. Register a matching Scene Feed template if the result
needs richer presentation.

Action Variant V1 has no `labelKey` field. The current action picker resolves
its label through the built-in locale keys
`subaction.<normalized-action>.<variant-id>` and the safe-posture form with
`.sfw`. `play` normalizes to `fuck`, so a localizable Play variant may register
entries such as:

```js
MODS.registerLocaleEntries('en', {
  'subaction.fuck.shareGreeting': 'Share Greeting',
  'subaction.fuck.shareGreeting.sfw': 'Share Greeting'
});
MODS.registerLocaleEntries('es', {
  'subaction.fuck.shareGreeting': 'Compartir saludo',
  'subaction.fuck.shareGreeting.sfw': 'Compartir saludo'
});
```

This additionally requires `content:add_locale`. These keys occupy a shared
core namespace, so choose a variant ID specific to the module and never replace
another owner's existing variant ID. Descriptor fallbacks remain required.

## Resource Ledger V1

Permission: `mechanics:add_resource_profile`

```js
MODS.registerResourceProfile('focus', {
  label: 'focus',
  labelKey: 'example_mod.resource.focus',
  capacity: 5,
  regeneration: {
    trigger: 'rest',
    every: 1,
    amount: 2
  },
  eligibility: {
    species: ['human'],
    abilities: [],
    flags: []
  }
});
```

The saved key is `<module-id>:<resource-id>`. IDs are token strings at most 96
characters. At most 128 profiles exist globally and each unit retains at most
64 ledger entries.

Only these definition fields exist:

| Field | Contract |
| --- | --- |
| `label` | Fallback, at most 80 characters; default is the ID. |
| `labelKey` | Token for localization. Use the module namespace. |
| `capacity` | Integer 1–1,000,000; default 1. |
| `regeneration` | Optional object containing only `trigger`, `every`, `amount`. |
| `eligibility` | Optional object containing only `species`, `abilities`, `flags`. |

Regeneration triggers are `digestion`, `hour`, and `rest`. `every` is an
integer 1–10,000 and `amount` is an integer 1–capacity. Core advances these
triggers; module hooks must not duplicate regeneration.

Each eligibility list is unique bounded token data, at most 64 values. A unit
must match a listed species, every listed ability, and every listed boolean
flag. Empty lists mean universal eligibility.

Resources start at zero, not full. Access only this module's local resource
IDs:

```js
const state = MODS.resources.read(unit, 'focus');
// { key, current, capacity, progress } or null when unavailable/ineligible

const added = MODS.resources.grant(unit, 'focus', 2);
const spent = MODS.resources.spend(unit, 'focus', 1);
```

Grant is capped at capacity and returns the amount actually added. Spend is
all-or-nothing and returns the amount spent or zero. Amounts normalize to
non-negative integers. These calls mark relevant save domains dirty.

When the module is absent, saved ledger values remain dormant. Reinstalling a
compatible provider restores the profile. Do not reuse a resource ID for a
different meaning.

## Combat Technique V1

Permission: `mechanics:add_combat_technique`

```js
MODS.registerCombatTechnique('sweepingArc', {
  label: 'Sweeping Arc',
  labelKey: 'example_mod.technique.sweepingArc',
  description: 'A broad trained arc.',
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
  damage: { multiplier: 1.1, flat: 0 },
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

The runtime key is `<module-id>:<technique-id>`. The local ID is a token at
most 96 characters. The registry holds at most 128 profiles. Unknown fields
reject registration.

Fallback `label` is required after defaulting and is at most 80 characters;
`description` at most 240; `icon` at most 16. Locale keys must start with
`<module-id>.`.

Eligibility lists (`species`, `abilities`, `flags`) each accept at most 32
unique token values. Every selected actor must satisfy the profile.

Equipment accepts:

- `required`: whether any item must be equipped;
- `anyTags`: at least one matching tag;
- `allTags`: every tag must match;
- `slots`: at least one equipped item in one of at most 16 slots.

Tags may come from item `techniqueTags`, `combatTags`, `tags`, name, type,
definition slot, or equipped slot. Item Definition V2 cannot currently create
module equipment, so a standalone technique should not depend on a new
module-authored item. It may target established core equipment facts, but that
couples it to those inventory identifiers.

`reach` is omitted/null or `melee`, `ranged`, `hybrid`, or `special`.
`damage.multiplier` is 0.25–2 and `damage.flat` is an integer 0–25.

Area:

- `maxTargets`: integer 1–8;
- `distribution`: `split` or `full`, default `split`;
- `recovery`: 0–1, used by split distribution to recover a share of missing
  per-target contribution.

Optional status:

- `effect`: `bleed`, `burn`, `freeze`, `stun`, `sleep`, `charm`, or `fear`;
- `chance`: 0–1;
- `turns`: integer 1–5;
- `power`: integer 1–10.

Core owns deterministic rolls, reach, damage, status processing, target order,
turn cost, Scene facts, saves, and defeat. A technique has no execution
callback and never replaces Basic Attack. On unload, owned profiles and queued
commands that reference them are removed.

## Recovery Mode V1

Permission: `mechanics:add_recovery_mode`

```js
MODS.registerRecoveryMode('moonPilgrimage', {
  label: 'Moon pilgrimage',
  labelKey: 'example_mod.recovery.moon',
  description: 'Return to safety as a harmless moonlit spirit.',
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

The runtime key is `<module-id>:<mode-id>`. IDs are tokens at most 96
characters; at most 64 profiles exist.

| Field | Values and limits |
| --- | --- |
| `label` | 1–80 characters after defaulting. |
| `description` | Optional, 1–320 characters when supplied. |
| `icon` | Optional, 1–16 characters. |
| `entry` | `defeat-site` or `safe-anchor`. |
| `resolution` | `immediate` or `shrine`. |
| `inventory` | `settings`, `death-bag`, or `retain`. |
| `traversal` | `normal` or `ethereal`. |
| `restrictions` | Unique values from `combat`, `inventory`, `hunger`, `interactions`, `recruitment`, `structures`. |
| `vitalityPercent` | Integer 1–100; default 1. |

Locale keys must use the module namespace. A `shrine` mode must include
`combat` in restrictions. Defaults are:

- immediate: entry `safe-anchor`, traversal `normal`;
- shrine: entry `defeat-site`, traversal `ethereal`;
- inventory: `settings`.

Core owns defeat detection, companion settlement, safe-anchor validation,
world persistence, inventory consequences, Hardcore deletion, resurrection,
Scene facts, and saves. The contract has no arbitrary destinations, callbacks,
item creation, stat mutation, shrine placement, or module-owned death handler.

If a selected provider is unloaded, Settings falls back to
`core:regenerate`. An active provider-owned journey returns to the ordinary
recovery prompt; it does not continue executing missing rules.
