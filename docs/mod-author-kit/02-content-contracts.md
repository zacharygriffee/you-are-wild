# Content Contracts

This file describes every current content-registration seam. All examples run
inside the executable module's `code` string and therefore use the `MODS`
object described in `01-package-runtime-and-lifecycle.md`.

Content registrations are owned by the registering module. A failed enable
rolls back partial registration. Disable, replacement, deletion, or unload
removes live registrations and exact table placements. Saved records are not
silently reinterpreted as another provider's content.

## Biomes

Permission: `world:add_biome`

```js
MODS.addBiome({
  id: 'mistwood',
  name: 'Mistwood',
  role: 'region',
  icon: '🌫️',
  color: '#52635f',
  bgColor: '#1f2927',
  danger: 2,
  encounterChance: 0.12,
  friendlyChance: 0.08,
  structureChance: 0.04,
  encounterTable: [{ id: 'wolf', weight: 5 }],
  friendlyTable: [{ id: 'deer', weight: 8 }],
  structureTable: ['camp', 'ruins'],
  descriptions: ['Silver mist clings to the roots.']
});
```

The current biome seam validates only that the argument is an object with a
non-empty `id`; the remaining shape is a legacy core biome definition. Use the
fields above and existing IDs from `06-inventories.md`. Do not invent callbacks
or assume unknown fields have consumers.

This seam changes the runtime definition map. It is not a promise to place a
new geographical region into an existing or generated world. Reusing an
existing biome ID temporarily replaces that definition while the module is
enabled and restores it on unload. New mods should prefer a new ID.

## Biome Recipe V1

Permission: `world:add_biome_recipe`

Register the biome with `MODS.addBiome()` first, then declare how new,
previously unmaterialized tiles may adopt it:

```js
MODS.registerBiomeRecipe('mistwood_edge', {
  biome: 'mistwood',
  mode: 'boundary',
  weight: 18,
  minDistance: 4,
  maxDistance: 80,
  replaces: ['forest', 'grove'],
  salt: 'mistwood-edge-v1'
});
```

The target biome must be owned by the same module. IDs, owner, biome, and salt
are bounded tokens. `weight` is an integer 1–100, distance bounds are
0–1,000,000, and `replaces` contains at most 32 biome IDs.

`boundary` recipes consider tiles adjoining a different core region;
`procedural` recipes consider any matching tile. Core sorts recipes by stable
owner-qualified key and uses the world seed, coordinate, and salt for the
placement roll. Already materialized tiles are never reclassified when a
module is enabled or disabled, and the resulting effective biome persists with
the ordinary world delta.

`placed` and `portal` are accepted declarative extension modes but do not
auto-place terrain in V1. They reserve interoperable intent for later
structure/action contracts without giving modules a generation callback or
arbitrary world mutation.

## Species Profile V1

Permission: `content:add_species`

`MODS.addSpecies(definition)` accepts serializable data. The minimal outer
definition needs an unused `id`; player-facing fields such as `name`, `icon`,
and `desc` are ordinary species data. `nameKey` and `descriptionKey` are
resolved through the locale registry with `name` and `description`/`desc` as
fallbacks; use keys beginning with `<module-id>.`. Add `profile` when the
species needs bounded mechanics or encounter placement.

```js
MODS.addSpecies({
  id: 'moss_hare',
  name: 'Moss Hare',
  nameKey: 'example_mod.species.moss_hare.name',
  icon: '🐇',
  desc: 'A cautious hare camouflaged by living moss.',
  descriptionKey: 'example_mod.species.moss_hare.description',
  profile: {
    version: 1,
    baseStats: {
      MPun: 70, MPle: 90,
      Figh: 6, Feas: 7, Flir: 8, Fuck: 7, Flee: 16, Feed: 9,
      hunger: 35,
      str: 6, con: 9, spd: 16, int: 8, wis: 12, cha: 9
    },
    size: 2,
    difficulty: 1,
    bodyParts: ['fangs'],
    abilities: { small: true, fastFlee: true },
    temperament: { timid: true, prey: true },
    canon: {
      sapience: 'animal',
      bodyPlan: 'quadruped',
      baselineInteraction: 'animal',
      adultEligibility: 'ineligible',
      interactionEligibility: {
        combat: true,
        feed: true,
        sensitiveSocial: false
      },
      traits: ['moss-camouflaged', 'crepuscular']
    },
    encounters: [
      { biome: 'forest', table: 'friendly', weight: 8 },
      { biome: 'grove', table: 'friendly', weight: 5 }
    ]
  }
});
```

Exact profile fields:

| Field | Contract |
| --- | --- |
| `version` | Must be `1`; omitted means `1`. |
| `baseStats` | May contain only the stat keys listed below. Omitted keys receive the defaults below. |
| `size` | Integer 1–8; default 4. |
| `difficulty` | Integer 1–5; default 2. |
| `bodyParts` | At most 11 unique entries from the vocabulary below. |
| `bodyProfile` | Optional Body Mass Ledger V1 key owned by the same module and registered before the species. |
| `abilities` | Boolean map using only the vocabulary below. False entries are omitted after normalization. |
| `temperament` | Boolean map using only the vocabulary below. |
| `canon` | Only `sapience`, `bodyPlan`, `baselineInteraction`, `adultEligibility`, `interactionEligibility`, and `traits`. |
| `encounters` | At most 24 existing-biome placements. |

Default stats:

```json
{
  "MPun": 100, "MPle": 100,
  "Figh": 10, "Feas": 10, "Flir": 10, "Fuck": 10,
  "Flee": 10, "Feed": 10, "hunger": 40,
  "str": 10, "con": 10, "spd": 10,
  "int": 10, "wis": 10, "cha": 10
}
```

`MPun` and `MPle` accept 20–300; `hunger` accepts 0–100; every other stat
accepts 1–30. Values are rounded.

Allowed `bodyParts`: `fangs`, `wings`, `tail`, `claws`, `horns`, `webbing`,
`scales`, `fins`, `stinger`, `tentacles`, `pincers`.

Allowed `abilities`: `rage`, `menacing`, `flying`, `ranged`, `constrictor`,
`poisonous`, `darkvision`, `bloodsuck`, `swimming`, `floopy`, `enveloped`,
`venom`, `antiflying`, `tasty`, `fastFlee`, `small`, `livestock`,
`laughing`.

Allowed `temperament`: `timid`, `prey`, `fastFlee`, `herd`, `livestock`,
`aquatic`, `territorial`, `aggressive`, `swarm`, `opportunistic`, `pack`,
`nocturnal`, `cunning`, `ambush`, `apex`, `aerial`, `adaptable`,
`relentless`, `passive`, `playful`, `enveloping`.

`canon.sapience` is `person`, `spirit`, or `animal`. `canon.bodyPlan` is a
lowercase token of at most 40 characters. `canon.baselineInteraction` is
`sapient`, `animal`, or `none`. `canon.adultEligibility` is `eligible`,
`ineligible`, or `unknown`; do not infer this value from appearance,
sapience, species, or prose.

Allowed `canon.interactionEligibility` keys: `social`, `party`, `quest`,
`merchant`, `recruit`, `sensitiveSocial`, `combat`, `feed`, `feast`.
`canon.traits` accepts at most 16 unique non-empty strings, each no longer
than 50 characters.

Each encounter has only `biome`, `table`, and `weight`. The biome must already
exist when registration runs; `table` is `hostile` or `friendly`; `weight` is
an integer 1–100. Register a new biome before a species that references it.

## Item Definition V2

Permission: `content:add_item`
Recommended compatibility floor: game `0.16.0`

```js
MODS.addItem({
  id: 'field_tonic',
  name: 'Field Tonic',
  type: 'consumable',
  purpose: 'use',
  stackable: true,
  maxStack: 12,
  icon: '🧴',
  desc: 'Restores 18 condition.',
  effect: 'heal',
  healAmount: 18,
  value: 24,
  acquisition: {
    merchantTables: [{ id: 'general', qty: 2 }],
    lootTables: [{ id: 'basicGear', weight: 2 }],
    search: true,
    searchWeight: 2
  }
});
```

An owner-local ID is normalized to `<module-id>:<id>` in lowercase. A supplied
full ID must use that same namespace. IDs match
`[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*`. `name` is required and is the
English compatibility label for older name-only saves.

| Field | Contract |
| --- | --- |
| `type` | `consumable`, `valuable`, `material`, `quest`, or `key`. |
| `purpose` | `use`, `trade`, `quest`, or `key`. |
| `value` | Normalized to an integer 0–1000. |
| `stackable` | Only literal `true` enables stacking. |
| `maxStack` | Integer 2–99; default 20 when stackable, otherwise 1. |
| `legacyNames` | Optional compatibility aliases. An alias may not collide with another item. |

The only actionable effect is a healing consumable:

```js
{ type: 'consumable', purpose: 'use', effect: 'heal', healAmount: 15 }
```

`healAmount` is an integer 1–100. Trade items use `purpose: "trade"` with the
inert effect `sell` or legacy inert effect `craft`. Quest/key items use the
matching purpose and are protected from ordinary sale/drop while required.

Equipment is intentionally not an Item Definition V2 subtype for module
authorization. Use the separate Equipment Definition V1 permission and API
below. Damage, buffs, cures, callbacks, arbitrary use actions, new merchant
tables, and new loot tables do not exist in either contract.

`acquisition` may contain only:

- `merchantTables`: at most 16 existing IDs, as a string or
  `{ id, qty }`; quantity is clamped to 1–20.
- `lootTables`: at most 16 existing IDs, as a string or
  `{ id, weight }`; weight is clamped to 1–100.
- `search`: boolean opt-in.
- `searchWeight`: number 1–100; default 1 when search is enabled.

Use table IDs from `06-inventories.md`. Item instances save the stable identity
in `definitionId`. When the provider is unavailable, saved instances remain
opaque unavailable-provider objects.

## Equipment Definition V1

Permission: `content:add_equipment`

```js
MODS.addEquipment({
  id: 'web_gauntlet',
  name: 'Web Gauntlet',
  icon: '🧤',
  desc: 'A fitted launcher for trained web techniques.',
  slot: 'hands',
  equipBonus: { Figh: 1, str: 1 },
  techniqueTags: ['web-launcher'],
  value: 65,
  acquisition: {
    merchantTables: [{ id: 'general', qty: 1 }],
    lootTables: [{ id: 'basicGear', weight: 1 }]
  }
});
```

An ordinary Item Definition is inventory content whose purpose is use, trade,
quest progress, or key ownership. Equipment is a non-stackable item whose
purpose is to occupy one existing equipment slot, contribute bounded stats,
and satisfy declarative Combat Technique V1 tags. Keeping the permissions
separate lets a host or package policy allow ordinary content without allowing
mechanical stat changes.

Equipment uses the same stable `<module-id>:<id>` identity and unavailable
provider behavior as Item Definition V2. It always normalizes to
`type: "equipment"`, `purpose: "equip"`, `stackable: false`, and
`maxStack: 1`.

Allowed slots are `head`, `body`, `hands`, `feet`, `accessory1`, and
`accessory2`. `equipBonus` must contain at least one non-zero integer from -10
through 10, using only `Figh`, `Feas`, `Flir`, `Fuck`, `Flee`, `Feed`, `str`,
`con`, `spd`, `int`, `wis`, or `cha`. `techniqueTags` accepts up to 16 unique
bounded semantic tokens.

Equipment V1 cannot add slots, callbacks, arbitrary equipment effects,
periodic mutations, credentials, or script-driven equip behavior. Use Resource
Ledger V1 and Combat Technique V1 for renewable technique costs and bounded
combat behavior. Acquisition uses the existing tables and limits described
for Item Definition V2.

## Quest Contract V2

Permission: `content:add_quest`

```js
MODS.addQuestTemplate({
  id: 'lost_satchel',
  title: 'The Lost Satchel',
  description: 'Recover a courier satchel from the marked trail.',
  acquisition: { structures: ['cabin', 'camp'] },
  turnInPolicy: { type: 'original_giver' },
  objectives: [{
    id: 'recover_satchel',
    type: 'recover',
    item: { definitionId: 'example_mod:courier_satchel', quantity: 1 },
    required: 1
  }],
  worldDirectives: [{
    id: 'satchel_search',
    type: 'boost',
    content: { kind: 'item', id: 'example_mod:courier_satchel' },
    center: 'destination',
    radius: 3,
    multiplier: 5,
    objectiveId: 'recover_satchel'
  }],
  reward: { xp: 12, gold: 18 }
});
```

The ID is required and becomes `<module-id>:<id>`. `acquisition.structures`
must contain 1–16 existing structures that already have quest service. The
currently usable quest-route structures are listed in `06-inventories.md`.

Useful objective types are `find`, `deliver`, `recover`, `defeat`, `travel`,
and `escort`. Common fields are `id`, `type`, `label`, `targetId`, `species`,
`item`, `location: {x,y,label}`, `checkpoints`, and `required`. Use stable item
definition IDs. A quest must contain at least one objective if it is expected
to complete.

Lifecycle states are `available`, `active`, `objectives_complete`,
`ready_for_turn_in`, `turned_in`, and `failed`. Do not set live lifecycle
fields in a reusable template.

Turn-in policies:

- `{ type: "automatic" }`
- `{ type: "original_giver" }`
- `{ type: "named_location", location: { x, y, label } }`
- `{ type: "authorized_faction", faction: "faction-id" }`

The optional stage graph contains 1–16 uniquely named stages, at most 8
transitions per stage, and at most 8 effects per transition. Events are
`accept`, `travel`, `defeat`, `find`, `consume`, `seduce`,
`objective_complete`, `turn_in`, and `fail`. A transition may use
`match.objectiveId`, `match.species`, `match.item`, or
`match.location`. Effects are:

- `set_destination` with finite `{x,y,label}` location;
- `add_objective` with objective data;
- `grant_item` with item data and quantity 1–20;
- `set_branch` with a string branch;
- `log` with text.

All transition targets must name a stage. No functions or arbitrary effects
are allowed.

### Quest World Directives V1

A quest may declare at most 8 directives referencing registered creature or
item IDs.

`place` ensures mandatory content exists:

```js
{
  id: 'nearby_wolf',
  type: 'place',
  content: { kind: 'creature', id: 'wolf' },
  count: 1,
  distance: { min: 2, max: 5 },
  biomes: ['forest'],
  objectiveId: 'defeat_wolf',
  disposition: 'enemy',
  locationLabel: 'Wolf signs'
}
```

It accepts an explicit finite `location` or a Manhattan distance search with
`min >= 1`, `max >= min`, and `max <= 32`. Count is 1–8. Biomes are optional,
unique, existing IDs, at most 16. Creature disposition is `enemy`, `neutral`,
or `friendly`.

`boost` increases encounter/search weight while an objective is active:

```js
{
  id: 'mushroom_boost',
  type: 'boost',
  content: { kind: 'item', id: 'example_mod:mushroom' },
  center: 'origin',
  radius: 4,
  multiplier: 3,
  objectiveId: 'find_mushrooms'
}
```

`center` is `origin` or `destination`; radius is 1–32; multiplier is greater
than 1 and at most 10. Probability cannot guarantee a required objective, so
use `place` for mandatory content.

This is quest-scoped placement, not a general world-generation API. There is
no public structure, landmark, route, interior, or arbitrary placement
callback.

## Locale Pack V1

Permission: `content:add_locale`

```js
MODS.registerLocale({
  id: 'fr-ca',
  displayName: 'Français (Canada)',
  fallback: 'en',
  targets: [{ moduleId: 'core', minVersion: '0.17.0' }]
});

MODS.registerLocaleEntries('fr-ca', {
  'ui.close': 'Fermer'
}, { target: 'core' });
```

Locale IDs are lowercase BCP-47-style tokens:
`[a-z]{2,8}(-[a-z0-9]{1,8})*`, at most 35 characters. `displayName` is 1–80
characters. The fallback must already be registered, may not reference itself,
and must either be built in, owned by this module, or owned by an installed,
active declared dependency.

A locale declares 1–16 unique targets:

- `core`, optionally with `minVersion`, checks the running game version.
- another module must be listed in this module's `dependencies`, active at
  enable time, and satisfy optional `minVersion`.

Entry maps contain at most 5,000 keys per call. Keys are token strings of at
most 120 characters; values are strings truncated to 1,000 characters. Entries
for a non-core target must start with `<target-module-id>.`. Core-owned keys
have their established core names. The module diagnostics report missing and
obsolete keys against the fallback locale; treat those diagnostics as
authoring failures before distribution.

## Creation Options

Permission: `content:add_creation_option`

```js
MODS.registerCreationOption({
  id: 'moss_markings',
  group: 'markings',
  label: 'Moss Markings',
  description: 'Adds a moss-marking choice to character creation.',
  value: 'moss',
  icon: '🌿'
});
```

An option is saved under
`player.creationOptions[<module-id>][<option-id>]`. Each provider may register
at most 64 options.

| Field | Normalization |
| --- | --- |
| `id` | Required token. |
| `group` | Token; default `optional`. |
| `label` | At most 120 characters; default is the ID. |
| `description` | At most 500 characters. |
| `value` | String at most 64 characters; default is the ID. |
| `icon` | String at most 16 characters. |

The contract does not currently provide species gating, locale-key fields, a
custom renderer, or mechanical effects. Treat it as a bounded player choice,
not a way to mutate character state.

## Perk Profile V1

Permission: `content:add_perk_profile`
Recommended compatibility floor: game `0.16.0`

```js
MODS.registerPerkProfile({
  id: 'example_mod:trailcraft',
  label: 'Trailcraft',
  species: ['human', 'fox'],
  perks: [{
    id: 'example_mod:pathfinder',
    name: 'Pathfinder',
    desc: 'SPD +2.',
    effectProfile: {
      version: 2,
      effects: [{ kind: 'stat', key: 'spd', amount: 2 }]
    }
  }, {
    id: 'example_mod:night_eyes',
    name: 'Night Eyes',
    desc: 'Grants the bounded night-vision perk flag.',
    requires: { perk: 'example_mod:pathfinder' },
    effectProfile: {
      version: 2,
      effects: [{ kind: 'flag', key: 'nightVision' }]
    }
  }]
});
```

Profile and perk IDs must use the exact `<module-id>:` namespace. A profile has
a required `label` of at most 80 characters, an optional `labelKey` beginning
with `<module-id>.`, an optional species allow-list, and 1–6 perks.

Each perk needs a unique namespaced ID, `name` up to 80 characters, and `desc`
up to 240. Optional `nameKey` and `descKey` use the module locale namespace.
`requires` is data only. Stable useful requirement fields are `perk`,
`tree` plus optional `count`, `level`, `practice: {key,count}`,
`equipmentEffect`, and `milestone`. Reference only prerequisites that exist in
the target runtime; a bad prerequisite can make a perk permanently
unavailable.

Each effect profile has `version: 2` and one or more effects:

- `{ kind: "stat", key, amount }`, where `key` is `MPun`, `MPle`, `Figh`,
  `Feas`, `Flir`, `Fuck`, `Flee`, `Feed`, `str`, `con`, `spd`, `int`, `wis`,
  or `cha`; amount must be finite, non-zero, and have absolute value at most
  20.
- `{ kind: "flag", key }`, where `key` is `predatorScent`, `fearResist`, or
  `nightVision`.

There are no callbacks, arbitrary effects, module-owned XP awards, or custom
perk screens.

## Legacy Content Templates

Permission: `content:add_template`

```js
MODS.registerContentTemplate(
  'biome', 'forest', 'default', 'safe',
  context => `The forest settles around ${context?.actor?.name || 'the traveler'}.`
);
```

The signature is
`registerContentTemplate(category, type, variant, tier, renderer)`. Tier is
`safe`, `mature`, or legacy `adult`. A renderer may be a string or function,
but only these request keys currently have core consumers:

- `biome.<existing-biome-id>.default`
- `action.cockVore.default`
- `action.unbirth.default`
- `action.corpseLoot.default`
- `action.corpseScavenge.default`

Other keys can register but produce an `unreachable_content_template`
diagnostic. Do not use this older prose seam for new mechanical behavior.
Prefer Scene Feed templates for presentation around resolved events.
