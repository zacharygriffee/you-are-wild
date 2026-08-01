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

## Body Mass Ledger V1

Permission: `mechanics:add_body_profile`

```js
MODS.registerBodyProfile('renewable_slime', {
  label: 'Renewable slime body',
  labelKey: 'example_mod.body.renewableSlime',
  massPerSize: 30,
  minimumViablePercent: 20,
  renewable: true,
  piecePercents: [5, 10, 20],
  regrowth: { trigger: 'digestion', every: 3, amount: 2 },
  corpseYieldPercent: 100
});
```

Register the profile before a same-module Species Profile V1 references it:

```js
MODS.addSpecies({
  id: 'moss_slime',
  name: 'Moss Slime',
  profile: {
    bodyProfile: 'example_mod:renewable_slime'
  }
});
```

Mass is conserved body quantity, separate from Condition, Strength,
Constitution, and inventory. `massPerSize` is 1–1000;
`minimumViablePercent` is 1–100; `piecePercents` contains 1–8 unique
percentages from 1–50; and `corpseYieldPercent` is 0–100. Regrowth is available
only to a renewable profile and uses Resource Ledger-style `digestion`,
`hour`, or `rest` triggers with bounded `every` and `amount`.

The core deterministically initializes old saves from stable size facts,
records at most 64 immutable mass transactions, creates opaque
`yaw-body-piece-v1` records, converts remaining living mass to corpse mass,
and spends that mass alongside existing corpse portions. The first release
does not impose permanent stat or maximum-Condition penalties; that balance
gate remains closed until scenario evidence exists.

Modules can define profiles but cannot directly add, remove, or duplicate
mass. A species may reference only a body profile owned by the same module.
Unknown providers leave saved mass state dormant and never reinterpret it as a
different body.

## Status Effect V1

Permission: `mechanics:add_status_effect`

```js
MODS.registerStatusEffect('webbed', {
  label: 'Webbed',
  labelKey: 'example_mod.status.webbed',
  description: 'The target cannot act until the webbing expires.',
  domains: ['combat', 'feast'],
  duration: { default: 2, max: 5 },
  stacking: { mode: 'refresh', max: 1 },
  persistence: 'combat',
  restriction: 'skip-turn',
  cureTags: ['cutting', 'solvent'],
  resistanceTags: ['web-resistant']
});
```

The saved identity is `<module-id>:<status-id>`. Registration is data-only and
does not apply the status. Action Profile V1 and other documented core
resolvers will reference registered statuses; hooks may not apply them
directly.

Allowed fields are:

| Field | Contract |
| --- | --- |
| `label`, `description`, `icon` | Bounded fallback presentation. |
| `labelKey`, `descriptionKey` | Optional locale keys in the owning module namespace. |
| `domains` | Up to 24 of `combat`, `feast`, `social`, `medical`, `traversal`. |
| `duration` | `{default,max}` integer turns from 1 through 999. |
| `stacking` | `{mode,max}` where mode is `replace`, `refresh`, or `stack`; maximum 20 stacks. |
| `persistence` | `combat` or `persistent`. |
| `restriction` | `none` or `skip-turn`. |
| `periodic` | Optional `{stat,amount}` for `condition`, `spirit`, or `hunger`; amount -100 through 100 per round per stack/power. |
| `cureTags`, `resistanceTags` | Bounded semantic token lists. |

Core owns application, seeded checks, duration, periodic processing, removal,
Scene outcomes, and save normalization. A missing or disabled owner removes
its active temporary statuses and prevents future application. Committed
historical outcomes remain in Scene and Activity records.

Core registers compatibility profiles for bleed, burn, poison, freeze, stun,
charm, fear, restrained, grabbed, snared, and enveloped. Their existing
special processors remain authoritative until each mechanic migrates to the
generic vocabulary.

## Restraint Relationship V1

Permission: `mechanics:add_restraint_profile`

```js
MODS.registerRestraintProfile('vineHold', {
  label: 'Vine held',
  labelKey: 'example_mod.restraint.vineHold',
  description: 'A living vine anchors its target.',
  kind: 'snare',
  statusProfile: 'example_mod:vineHeld',
  duration: 3,
  strength: 2,
  breakOnSourceDown: false
});
```

A status says what presentation and periodic restrictions apply. A restraint
relationship separately records who or what holds whom. The core stores only
the profile key, opaque source and target IDs, remaining turns, and bounded
power. Modules never receive a mutable relationship object.

Kinds are `grab`, `snare`, `web`, `tentacle`, and `generic`. A module
restraint may reference a core status or a status owned by the same module.
Duration is 1–999 turns, strength is -100 through 100, and
`breakOnSourceDown` defaults to true. Unknown fields and executable callbacks
are rejected.

Action Resolver V1 applies, pulls through, escapes, releases, expires, and
publishes outcomes for these relationships. Naming another module's status or
restraint does not grant authority over it. Unloading the owner removes its
active relationships. Core provides `core:grab`, `core:snare`, `core:web`, and
`core:tentacle`; Grab, Pull, and Escape are initial core action profiles.

## Action Resolver V1

Permission: `mechanics:add_action_profile`

```js
MODS.registerActionProfile('webPull', {
  label: 'Web Pull',
  labelKey: 'example_mod.action.webPull',
  description: 'Spend web reserve to slow a hostile target.',
  icon: '🕸️',
  category: 'control',
  modes: ['exploration', 'combat'],
  scope: 'target',
  relations: ['hostile'],
  check: {
    actorStat: 'str',
    targetStat: 'spd',
    modifier: 2,
    difficulty: 10
  },
  costs: [
    { resource: 'example_mod:web', amount: 1 }
  ],
  effects: [
    {
      type: 'status',
      target: 'target',
      profile: 'example_mod:webbed',
      turns: 2,
      power: 1
    }
  ]
});
```

The saved identity is `<module-id>:<action-id>`. The profile is immutable,
owned by the registering module, and contains no callbacks. Registration does
not grant an authority beyond this resolver.

Allowed top-level fields are bounded presentation (`label`, `labelKey`,
`description`, `descriptionKey`, `icon`), a semantic `category`, `modes`,
`scope`, `relations`, bounded `requirements`, an optional deterministic
`check`, up to eight `costs`, and up to twelve `effects` or
`failureEffects`.

- Modes are `exploration` and `combat`.
- Scope is `self` or `target`.
- Relations are `self`, `party`, `friendly`, `neutral`, and `hostile`.
- Check stats are `Figh`, `Flir`, `Fuck`, `Feas`, `Feed`, `Flee`, `str`,
  `con`, `spd`, `wis`, `cha`, and the bounded current-Spirit ratio
  `spirit`. `appetiteMultiplier` may add 0–10 times the actor's appetite.
- A cost references a registered Resource Ledger V1 key and a positive bounded
  integer amount. Costs are checked before commitment and spent atomically
  when the attempt commits.
- A `stat` effect may change only `condition`, `spirit`, or `hunger`, is
  clamped by the core, and selects `actor` or `target`.
- A `status` effect references a Status Effect V1 key, bounded turns and
  power, and selects `actor` or `target`.
- A `restraint` effect creates an owned Restraint Relationship V1; `pull`
  moves a target through an existing source-owned relationship; and
  `release-restraint` removes the selected unit's active relationship.
- `requirements.restraint` is `none`, `source`, or `target`. `source` means
  the actor must already hold the selected target. `target` means the actor
  must currently be restrained. `requirements.minAppetite` is a bounded
  0–100 threshold. `requirements.structures` accepts at most sixteen structure
  IDs and makes the action available only at one of those overworld structures
  or inside its matching interior. This is the V1 structure-interaction seam:
  it does not grant arbitrary tile or interior mutation.
- `recruit-ready` moves a valid non-party target into the existing core
  recruitment-ready state; `withdraw-combat` removes the selected actor or
  target from the remainder of the encounter.

Core `core:seduce` is the first recruitment-oriented action profile. It
requires appetite 4, resolves current Spirit plus an appetite contribution
against the target's Wisdom, marks a success as recruitment-ready, and
withdraws both participants from the remainder of combat. It does not bypass
party capacity or automatically transfer the target into the party.

The core resolves eligibility, participant relationships, seeded checks,
resource spending, state mutation, rendering refresh, turn advancement, and
an immutable `yaw-action-outcome-v1` event. Modules may observe the committed
event through `onActionCommitted`; they cannot veto or alter it.

## Combat Event Pacing V1

Automatic enemy and autonomous-companion events use a presentation-only delay
before the next turn. The player may choose `readable`, `fast`, or `instant`
pacing and a bounded reading speed of 10–120 characters per second. Readable
delays are clamped to 250–2,400 milliseconds; fast delays are clamped to
80–500 milliseconds.

The deterministic action is already committed before this delay begins.
Changing pacing never changes initiative, random rolls, state, saves, hooks,
or outcomes. An explicitly instant presentation bypasses the delay. This is
not a reaction, interrupt, priority, or rollback contract; mods cannot insert
work between commitment and the next turn.

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

## Elemental boundary

Core does not define an elemental damage chart, resistance system, status
interaction matrix, or elemental resource economy. Modules may use their own
namespaced resource profiles, statuses, action profiles, technique tags,
species abilities, presentation, and post-commit narration to build such a
system within the existing bounded contracts. A tag by itself has no
mechanical authority, and modules may not reinterpret another owner's tag or
silently alter core damage. A future shared elemental contract requires a
separate versioned decision.

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
