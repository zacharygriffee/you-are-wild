# Module Doctrine

This document is the canonical authoring contract for You Are Wild modules.
It describes the capabilities that exist in the current runtime, not planned
APIs. Historical plans, release notes, changelogs, and generated examples are
not doctrine.

For a portable, self-contained snapshot that can be handed to an authoring
agent without the game source, use the
[Mod Author Kit](mod-author-kit/README.md). The kit freezes the current
`0.17.0` package/API contracts, bounded vocabularies, inventories, templates,
and source-independent release checklist in one directory.

The copied kit includes a dependency-free static package validator:

```bash
node docs/mod-author-kit/tools/validate-module.mjs path/to/module.yawmod.json
```

A passing validator report is `static-checked` evidence, not proof that a
module was installed or exercised through browser lifecycle transitions.

## Authority And Scope

When documentation disagrees, use this order:

1. Runtime validation and ownership in `app/src/core/module-system.js`,
   `app/src/core/sub-actions.js`, and their tests.
2. This document.
3. Focused current contracts linked below.
4. Maintained first-party packages in `optional-mods/`.

Planning documents may describe future work but cannot grant a permission,
hook, package field, action seam, or security property. Examples demonstrate
only the APIs they actually call. Do not infer general support from legacy
fields retained for save or package compatibility.

Focused contracts:

- [Content posture and optional providers](content-posture-and-providers.md)
- [Host-supplied modules](host-modules.md)
- [Remote module import](remote-modules.md)
- [AI providers](ai-providers.md)
- [Narration mods](narration-mods.md)
- [Media repository](media-repository.md)
- [Media Provider Adapter Contract](media-provider-adapters.md)
- [Asset Bundle V1](asset-bundle-v1.md)
- [Tileset Pack V1](tileset-pack-v1.md)
- [Locale Pack V1](locale-pack-v1.md)
- [Combat Technique V1](combat-technique-v1.md)

## Trust Boundary

All executable modules currently use the `trusted-local` boundary. Their code
runs in the game page after an explicit install or host-policy decision. File
import, URI import, and host supply change provenance and acquisition policy;
they do not create isolation. Permission checks prevent accidental use of
unsupported APIs and make review clearer, but they are not a security sandbox.

Only install executable packages whose code you trust. A digest proves which
bytes were reviewed or fetched; it does not prove author identity. Runtime code
must never claim that session-only provider credentials are protected from a
deliberately malicious same-page module.

## Canonical Package Envelope

New executable packages must use the version-one envelope:

```json
{
  "packageType": "yaw-module",
  "packageVersion": 1,
  "packageId": "example_module",
  "gameVersion": "0.12.2",
  "trustBoundary": "trusted-local",
  "module": {
    "manifest": {
      "id": "example_module",
      "name": "Example Module",
      "version": "1.0.0",
      "description": "A concise player-facing description.",
      "type": "feature_pack",
      "contentRating": "safe",
      "minGameVersion": "0.12.2",
      "trustBoundary": "trusted-local",
      "runtimeRequirements": {
        "origins": ["file", "https", "localhost", "http"],
        "hosts": [],
        "capabilities": [],
        "network": false,
        "secureContext": false,
        "hotToggleSafe": true
      },
      "permissions": [],
      "dependencies": [],
      "settings": []
    },
    "code": "MODS.log('Example module enabled.');",
    "assets": {}
  }
}
```

The installer still accepts the older bare `{ manifest, code, assets }` shape
for compatibility. It is not the authoring format for new distributable mods.
`packageId` must match `module.manifest.id`. `gameVersion` records the packager;
`minGameVersion` is the actual runtime compatibility floor.

### Manifest fields

- `id`, `name`, and `version` are required. IDs use letters, numbers,
  underscores, and hyphens.
- `type` defaults to `feature_pack` and is descriptive metadata.
- `contentRating` is `safe` or `mature` for new modules. `adult` remains a
  deprecated package alias that also requires `explicit.sexual`; do not author
  new packages around an Adult core posture.
- `contentCategories` and `gameplayVariants` declare provider-owned policy.
  Categories that are `required` must be opted into before enablement.
- `permissions` must contain only the implemented tokens listed below.
- `dependencies` contains module IDs. Dependencies must be installed and
  enabled first.
- `minGameVersion` is a numeric version such as `0.12.2`. `gameVersion` inside
  a legacy manifest is normalized only as a compatibility alias.
- `runtimeRequirements` may declare `origins`, semantic `hosts` and
  `capabilities`, `network`, `secureContext`, and `hotToggleSafe`. Host and
  capability declarations only block activation when incompatible; they do
  not grant methods or native authority. Omitting the object permits every
  current origin and host, no capability, network, or secure-context
  requirement, and restart-required toggling during a run.
- `settings` contains bounded declarative controls. It is not a secret store.
- `trustBoundary` must be `trusted-local`.

Module `code` must be a string that passes syntax validation. Module `assets`
is bounded JSON-style metadata, not an executable object or a binary store.
Circular data, functions, symbols, `undefined`, `bigint`, and non-finite numbers
are rejected.

## Installation, Provenance, And Lifecycle

There are four provenance values:

- `user`: reviewed local file import;
- `remote`: explicit HTTPS or loopback URI review followed by a local
  IndexedDB copy;
- `host`: a package curated by the current same-origin host manifest;
- `built-in`: a host/game-owned package record.

Installed packages start disabled unless host policy says otherwise. Replacing
an ID unloads its owned runtime work, disables dependents, stores the new
package as disabled, and requires a fresh enable. Disabling, replacing, or
deleting a module removes its hooks, timers, provider adapters, narration
records/orchestrators, action variants, registry contributions, media leases,
and declared settings/actions through the owning lifecycle.

Host `required`, `defaultEnabled`, `optional`, and `forbidden` states apply only
to that hosted game. File-origin builds do not discover `yaw-host.json` and
remain playable with built-in content and locally retained modules.

URI import is review-and-copy, not hotlinking or automatic updating. Cross-origin
fetches still depend on browser CORS. Query strings, fragments, credentials,
redirects, oversized packages, invalid UTF-8/JSON, and mismatched optional pins
are rejected.

## Runtime API And Permissions

Module code receives the `MODS` API plus tracked timers and safe language
intrinsics. Author against `MODS`; do not read or mutate `App`, DOM markup,
IndexedDB records, provider internals, or generated prose as application state.
The same-page trust boundary may make globals observable, but observation is
not a stable API contract.

Implemented permissions:

| Permission | Capability |
| --- | --- |
| `ui.read` | `MODS.getContext()` bounded public context |
| `ui:contribute` | register owned bounded UI Contribution V1 descriptors |
| `media:read` | list, inspect, acquire, and release owned media leases |
| `media:provide` | register an owned trusted-local Media Source/Store adapter |
| `scene:add_template` | register owned deterministic Scene Feed templates |
| `scene:read_narrative` | bounded narration context and extensions |
| `scene:narrate` | owned narration publication and orchestration |
| `ai:request` | request an existing opaque provider connection |
| `ai:provide` | register a trusted provider adapter and session connection |
| `world:add_biome` | add or temporarily replace an owned biome definition; this legacy seam is not a save-stable geography-placement promise |
| `world:add_biome_recipe` | register an owned deterministic Biome Recipe V1 for boundary or procedural placement |
| `content:add_species` | add owned serializable species data |
| `content:add_item` | register an owned Item Definition V2 |
| `content:add_equipment` | register owned equipment for existing slots and bounded stat/technique tags |
| `content:add_quest` | register an owned bounded Quest Contract V2 template |
| `content:add_template` | register owned legacy content templates for documented core request keys |
| `content:add_locale` | register an owned locale definition and bounded target-owned translation entries |
| `content:add_creation_option` | register owned creation choices persisted under the provider namespace |
| `content:add_action_variant` | register an owned Feed, Feast, or Play variant |
| `content:add_perk_profile` | register an owned data-only Perk Profile V1 |
| `mechanics:add_resource_profile` | register and mutate an owned bounded Resource Ledger V1 profile |
| `mechanics:add_status_effect` | register an owned data-only Status Effect V1 profile |
| `mechanics:add_restraint_profile` | register an owned data-only source-to-target restraint profile |
| `mechanics:add_action_profile` | register an owned data-only Action Resolver V1 profile |
| `mechanics:add_body_profile` | register an owned Body Mass Ledger V1 profile for same-module species |
| `mechanics:add_combat_technique` | register an owned declarative Combat Technique V1 Fight profile |
| `mechanics:add_recovery_mode` | register an owned declarative Recovery Mode V1 profile |

Unknown permissions reject installation. Calling a permissioned API without
declaring its token fails module enablement and cleans partial contributions.

### Item Definition V2

`MODS.addItem(definition)` registers an immutable, owned item definition in
the same lookup used by core inventory, equipment, merchants, and trade. The
definition must be serializable data and must include:

- `id`: an owner-local token such as `tonic`, or the full
  `<module-id>:tonic` identity;
- `name`: the English compatibility label used by legacy name-only saves;
- an honest supported purpose such as `type: "material"` for a trade good.

Fungible definitions may declare `stackable: true` and `maxStack` from 2 to
99; omitted limits default to 20. Equipment, quest/key objects, unknown
provider items, and definitions without that explicit flag remain individual
instances. Pack capacity counts occupied stacks.

The current bounded actionable effect vocabulary contains only:

```js
{
  type: "consumable",
  purpose: "use",
  effect: "heal",
  healAmount: 15 // integer from 1 through 100
}
```

Trade definitions use `purpose: "trade"` with inert `effect: "sell"` or the
legacy future-compatible `effect: "craft"`. Quest/key definitions use
`purpose: "quest"` or `"key"` and are protected from ordinary sale/drop while
required. Module equipment is not yet part of Item Definition V2; declaring
slots, bonuses, or equipment effects rejects enablement instead of silently
granting an unbounded mechanic.

An item can opt into existing core acquisition tables without owning world
generation:

```js
acquisition: {
  merchantTables: [{ id: "general", qty: 2 }],
  lootTables: [{ id: "basicGear", weight: 3 }],
  search: true,
  searchWeight: 2
}
```

Only existing merchant/loot table IDs are accepted. Merchant quantity is
bounded to 1–20, loot weight to 1–100, and each list to 16 entries. Unknown
tables or fields reject module enablement and roll back partial placement.
Search inclusion is opt-in, with an optional search weight from 1–100
(default 1). Disable/delete removes the exact owned placements; re-enable
restores one copy.

An owner-local ID is normalized to the module namespace. A module may not
register inside another owner's namespace, replace a core definition, or
claim a display-name alias already owned by another definition. Item
instances persist the stable identity in `definitionId`; their unique `id`
remains instance identity and is never treated as a definition ID.

Disabling or deleting the provider removes its live definition. Saved
instances are retained as opaque unavailable-provider objects and must not be
reinterpreted through a coincidentally matching core label. Re-enabling the
same compatible provider restores lookup. Modules should not rename an
existing definition ID's compatibility `name` until explicit alias migration
support is documented.

The V2 registry does not grant arbitrary item mechanics. Function-backed
effects reject registration. Damage, buffs, cures, utility actions, rated
effects, direct quest rewards, new stock-table creation, and new loot-table
creation remain unavailable until the corresponding bounded declarative
contract is documented and implemented. A registered item with no supported
mechanical resolver must identify itself honestly as trade-only or quest/key
data rather than advertise a nonfunctional action.

### Quest Contract V2

`MODS.addQuestTemplate(definition)` registers one owned, serializable quest
template using the same lifecycle as core quests. It requires
`content:add_quest`. Owner-local IDs become
`<module-id>:<quest-id>` and may not replace core or another provider's
template.

Every template declares one to sixteen existing structure routes:

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
    id: 'satchel-search',
    type: 'boost',
    content: { kind: 'item', id: 'example_mod:courier_satchel' },
    center: 'destination',
    radius: 3,
    multiplier: 5,
    objectiveId: 'recover_satchel'
  }],
  reward: { gold: 18 },
  stageGraph: {
    initialStage: 'search',
    stages: [{
      id: 'search',
      transitions: [{
        event: 'objective_complete',
        to: 'return',
        effects: [{ type: 'log', text: 'The satchel is secure.' }]
      }]
    }, {
      id: 'return',
      transitions: []
    }]
  }
});
```

Supported lifecycle states are Available, Active, Objectives Complete, Ready
for Turn-In, Turned In, and Failed. Turn-in policy may be `automatic`,
`original_giver`, `named_location`, or `authorized_faction`; policies that
need a destination or identity must provide it. Ordinary quest/item
requirements use stable Item Definition V2 IDs.

The optional stage graph is bounded to sixteen stages, eight transitions per
stage, and eight declarative effects per transition. Supported events and
effects are validated by core. Functions, callbacks, non-finite values,
circular data, unknown transitions, and arbitrary script effects reject
enablement. Disabling or deleting a provider removes its template and exact
structure placements, but already-issued saved quest records remain bounded
data so a player's history is not silently deleted. Re-enabling restores one
copy of each owned placement.

Quest World Directives V1 adds two bounded, declarative behaviors to an owned
quest template:

- `place` reserves one to eight registered creatures or items at a stable,
  reachable coordinate. It accepts either an explicit `location` or a
  `distance: { min, max }` search, optional existing `biomes`, an optional
  related `objectiveId`, and `enemy`, `neutral`, or `friendly` creature
  disposition.
- `boost` multiplies the matching registered creature or item weight within a
  Manhattan `radius` around the quest `origin` or `destination`. It may be
  restricted to existing `biomes`. A boost stops when the quest is no longer
  actively seeking its objective.

Core owns coordinate choice, stable entity IDs, persistence, map guidance,
idempotence, lifecycle cleanup, and bounds. Functions, callbacks, unknown
content, arbitrary fields, more than eight directives, placement counts above
eight, radii above thirty-two, and multipliers above ten reject registration.
Use `place` for a mandatory objective; probability alone must not make a
required quest impossible. Already-issued module quests remain serializable
when their provider is disabled, but unavailable provider content is not
re-created.

This quest-scoped contract does not expose general world generation. Species
Profile V1 may still contribute rare encounters to existing biome tables, and
`world:add_biome` remains the definition seam. Biome Recipe V1 adds bounded,
deterministic `boundary` and `procedural` placement for a biome owned by the
same module. Once a generated tile is materialized, its effective biome is
pinned through normal world persistence. `placed` and `portal` recipes may be
declared for forward compatibility but do not auto-place terrain in V1. There
is still no public structure, landmark, resource-site, route, interior, or
executable placement callback. See
[Biome Boundary and World Recipe V1 Decision](biome-boundary-world-recipe-v1-decision.md).

### UI Contribution V1

`MODS.registerUiContribution(slot, contributionId, definition)` registers
owned declarative commands, badges, or definition-list rows. It does not
expose DOM access or arbitrary HTML. The stable V1 slots are
`composer.place.after`, `roster.party.badges`, `roster.here.badges`,
`roster.details.sections`, and `system.utilities`. Core retains navigation,
combat confirmation, ordering, escaping, focus, responsive placement, and
content-policy enforcement. Callbacks receive only a fresh deeply frozen
serializable public context; bounded command results open a core-owned dialog.
Disable/unload removes every owned contribution. See
[UI Contribution V1](ui-contribution-v1.md) for descriptor fields, limits,
file-origin behavior, and examples.

`MODS.registerMediaProvider(providerId, adapter)` is reserved for executable
trusted-local infrastructure modules. It requires `media:provide`, cannot
replace a provider owned by core or another module, and unregisters every
owned role on disable. It does not expose credential persistence or arbitrary
filesystem paths. See the Media Provider Adapter Contract for required roles
and the separate `media:read` consumer boundary.

### Locale Packs

`MODS.registerLocale(definition)` registers one module-owned locale with a
display name, active fallback, and 1 to 16 versioned targets.
`MODS.registerLocaleEntries(locale, entries, { target })` adds its translation
entries. Non-core targets must be active declared dependencies and every key
must start with `<target-module-id>.`. Module and core target versions are
checked before registration; disabling either the locale owner or a translated
dependency removes the locale and safely selects its fallback. Missing and
obsolete target keys appear as bounded module diagnostics. See
[Locale Pack V1](locale-pack-v1.md) for the complete contract and maintained
conformance fixtures.

### Legacy Content Template Keys

`MODS.registerContentTemplate(category, type, variant, tier, renderer)` uses
exactly three key tokens: `category.type.variant`. Each token accepts letters,
numbers, underscores, hyphens, dots, or colons. Registration only supplies
text; it does not create a gameplay route. The current core consumers are:

| Request key | Consumer |
| --- | --- |
| `biome.<installed-biome-id>.default` | surface and structure encounter observations |
| `action.cockVore.default` | enabled Capture compatibility outcome |
| `action.unbirth.default` | enabled Engulf compatibility outcome |
| `action.corpseLoot.default` | remains-loot outcome |
| `action.corpseScavenge.default` | remains-scavenge outcome |

An enabled module receives an Activity Log diagnostic for any other legacy
template key because core cannot request it. Do not use legacy content
templates for Scene Feed matching; declare `scene:add_template` and use
`MODS.registerSceneTemplate` instead.

### Creation Option Persistence

Creation options selected for a new character are copied into
`player.creationOptions[providerId][optionId]` and survive full and sparse save
round trips. Values remain bounded strings owned by the provider; they do not
create mechanics merely by being selected. The four compatibility anatomy
values continue to populate the established `parts` and `chest` fields. Each
provider may register at most 64 creation options.

### Species Profile V1

`content:add_species` permits an owned, serializable identity plus an optional
bounded mechanical profile:

```js
MODS.addSpecies({
  id: 'emberkin',
  name: 'Emberkin',
  icon: '🔥',
  desc: 'Sapient adult elemental person shaped by living flame',
  adultEligibility: 'eligible',
  profile: {
    version: 1,
    baseStats: { MPun: 110, Figh: 13, con: 12 },
    size: 4,
    difficulty: 3,
    bodyParts: ['scales'],
    abilities: { ranged: true, menacing: true },
    temperament: { aggressive: true, territorial: true },
    canon: {
      sapience: 'person',
      bodyPlan: 'elementalfolk',
      baselineInteraction: 'sapient',
      adultEligibility: 'eligible',
      traits: ['person', 'elemental', 'fire']
    },
    encounters: [
      { biome: 'cave', table: 'hostile', weight: 8 },
      { biome: 'cliff', table: 'friendly', weight: 4 }
    ]
  }
});
```

Profile fields are consumed by character creation, unit normalization, and
encounter generation. Omitted base stats use the neutral core baseline;
omitted size and difficulty default to `4` and `2`. Encounter `table` is
`hostile` or `friendly`, and every referenced biome must already exist when
the species is registered. Core rejects unknown profile fields, unknown body
parts or abilities, out-of-range numbers, duplicate species IDs, and
unavailable encounter biomes. Registration is atomic, and disabling the
module removes the species, profile maps, and exact encounter entries it owns.

The V1 ability and temperament keys are deliberately limited to mechanics the
game already consumes. A label such as `fire` in `canon.traits` is descriptive;
it does not create fire damage, resistance, new actions, predator/prey rules,
or perks. Those require a separately documented extension seam. Do not present
descriptive fields as executable powers.

### Perk Profile V1

`content:add_perk_profile` permits a module to add one bounded authored path
to the visible-only Perk Frontier:

```js
MODS.registerPerkProfile({
  id: 'example_mod:wayfinder',
  label: 'Wayfinder',
  labelKey: 'example_mod.perkProfile.wayfinder',
  species: ['human', 'wolf'],
  perks: [{
    id: 'example_mod:trailwise',
    name: 'Trailwise',
    nameKey: 'example_mod.perk.trailwise',
    desc: 'Your practiced routes improve awareness.',
    descKey: 'example_mod.perk.trailwise.desc',
    stat: 'wis',
    val: 2
  }]
});
```

The profile and every perk ID must use the module namespace. A profile contains
one to six serializable definitions and may use only the core stat and named
flag effect vocabulary plus bounded declarative eligibility. It cannot supply
callbacks, award its own choices, mutate XP, inspect hidden state, or resolve
effects.

Eligible definitions join the same flat current frontier as core perks.
Locked definitions remain absent. Locale keys must use the module's dot
namespace and should be supplied through `content:add_locale`. On unload,
future offers disappear immediately while already-selected player records and
their frozen core-owned effect profiles remain saveable and safely reversible.
Re-enable restores eligibility without duplicating a selected perk.

### Resource Ledger V1

`mechanics:add_resource_profile` permits a module to declare a bounded,
provider-owned renewable resource and to read, grant, or spend only that
resource:

```js
MODS.registerResourceProfile('sap', {
  label: 'sap reserve',
  labelKey: 'example_mod.resource.sap',
  capacity: 4,
  regeneration: { trigger: 'rest', every: 2, amount: 1 },
  eligibility: { species: ['mosskin'] }
});

const state = MODS.resources.read(actor, 'sap');
const granted = MODS.resources.grant(actor, 'sap', 1);
const spent = MODS.resources.spend(actor, 'sap', 1);
```

Profile IDs become `<module-id>:<resource-id>`. Capacity is an integer from 1
to 1,000,000. Regeneration is optional and accepts only `digestion`, `hour`, or
`rest`, with bounded integer `every` and `amount` values. Eligibility may list
species, existing ability flags, and ordinary boolean unit flags; all authored
lists must match. A profile with no eligibility constraints can apply to any
unit, but it still starts empty.

The ledger is core-owned save state. Missing entries, including legacy saves,
normalize to zero rather than receiving a free capability. Sparse saves retain
the ledger with the unit; binary compatibility exports mirror it outside the
fixed legacy unit codec. Disabling a module removes its executable profile but
keeps bounded dormant values so re-enabling cannot refill or duplicate the
resource. Modules cannot read or mutate another owner's ledger through
`MODS.resources`.

Resource labels should use an owned locale key registered through
`content:add_locale`; the bounded fallback label remains available when that
locale entry is absent. Resource profiles do not create actions by themselves.
An action variant still needs its own declared capability and must spend the
resource only after the deterministic attempt commits.

### Combat Technique V1

`mechanics:add_combat_technique` registers a namespaced declarative Fight
profile through `MODS.registerCombatTechnique(id, definition)`. The bounded
profile may specify capability and equipment eligibility, one command-scoped
reach profile, deterministic damage shaping, an explicit multi-target cap and
distribution, and one core-owned status profile. It cannot run a combat
callback or replace Basic Attack.

Eligible techniques appear beneath Fight after actor and target selection.
Single, multi-target, and group commands carry the selected namespaced key in
the canonical `InteractionPlan`. Full and sparse combat saves retain queued
keys; unload removes profiles and cancels their queued work without changing
unrelated combat. See [Combat Technique V1](combat-technique-v1.md) for the
complete schema, equipment tags, limits, resolution order, localization, and
save rules.

### Recovery Mode V1

`mechanics:add_recovery_mode` registers a namespaced declarative terminal
recovery profile through `MODS.registerRecoveryMode(id, definition)`. A
profile may select immediate or shrine resolution, defeat-site or safe-anchor
entry, the existing inventory policy, normal or ethereal traversal, bounded
living-action restrictions, and resurrection vitality. It cannot replace
defeat, companion, inventory, Hardcore, movement, save, or resurrection code
with callbacks.

The selected profile is snapshotted at defeat and persists through full and
sparse saves. Unloading its owner removes the profile, restores the default
setting, and returns an active owned journey to the explicit ordinary recovery
prompt. See [Recovery Mode V1](recovery-mode-v1.md) for the complete schema,
core Ghost pilgrimage, localization, persistence, and unload rules.

### Code-free Sprite Pack V1

Sprite art is delivered as an Asset Bundle V1 presentation rather than
executable module code. The target module declares `media:read`; the bundle
uses one `yaw-sprite-pack` declaration and image resources with the
`sprite-atlas` role. Core validates semantic species keys, bounded
state/facing strips, dimensions, animation duration, and fallbacks before any
resource is downloaded.

Enabled packs acquire local Media Repository leases and render through shared
unit cards and presence rails. Disabling the owner releases the leases and
restores the prior pack or emoji immediately. Sprites cannot add stats,
actions, targeting, collision, or save state. See
[Sprite Pack V1](sprite-pack-v1.md) for the schema and limits.

### Hook events

The current hook registry accepts exactly:

- `onMapGenerate`, `onEncounterStart`, `onEncounterResolved`,
  `onAutonomousEvent`, `onCombatAction`;
- `onDigestionTick`, `onSubActionExecute`;
- `onDefeat`, `onDefeatEncounterSettled`, `onPlayerState`, `onRegenerate`;
- `onPlayerMove`, `onGameStart`, `onGameLoad`, `onGameSave`, `onTick`;
- `onActionCommitted`;
- `onSceneBeat`, `onSceneExchangeClosed`, `onContentPolicyChanged`.

Unknown hook names reject registration. Hooks and tracked timers are removed on
unload. A hook is notification or a documented extension seam, not permission
to bypass authoritative resolution. `onEncounterResolved`,
`onActionCommitted`, and narrative hooks
receive copied/frozen envelopes after deterministic state commits; save
hydration does not replay them. Action outcomes use the
`yaw-action-outcome-v1` schema and contain only opaque actor/target IDs,
bounded safe detail, and deterministic game-time metadata. They cannot veto or
mutate the action.

## Action Variant Contract

The public registration seam extends `feed`, `feast`, and `play` (`play` maps
to the internal Play intent while remaining the public spelling):

```js
MODS.registerActionVariant('feed', 'exampleOffer', {
  label: 'Offer Example',
  sfwLabel: 'Offer Example',
  icon: '🎁',
  scope: 'target',
  requirements: ['reach', 'cost'],
  validate(actor, target) {
    return Boolean(actor && target && actor !== target);
  },
  execute(actor, target) {
    return { ok: true, actorId: actor.id, targetId: target.id };
  }
});
```

Definitions require executable `validate` and `execute` functions. `scope` is
`self`, `target`, or `both`; requirements are limited to `cost`, `reach`,
`capacity`, and `willingness`. IDs are bounded and owned, and unload removes
them. A module may not replace an existing variant.

Play variants use the same self/target contextual menu and dispatch contract;
register them with the public action name `play`. Generic callback-based Fight,
Talk, and Flee action variants are not public capabilities. Named Fight choices
use the separate declarative Combat Technique V1 contract. Manifest
`gameplayVariants` are policy toggles, not executable action variants.

Content gating belongs to the owning module manifest, not an undocumented field
inside an action-variant definition. Use the manifest `contentRating` and
required `contentCategories`; a blocked module never registers its variants,
and lowering policy unloads them with the rest of that module's contributions.
If one package needs independently available safe and rated variants, split
them into separately owned modules rather than relying on per-variant
`minPosture` or `contentCategory` fields.

Ordinary tactical uncertainty should resolve after commitment through an
`ActionOutcome` and Scene Beat. A mod should use `validate` for structural
eligibility and use result logic for attempts that can meaningfully fail; it
should not turn resistance, reach pressure, or unfavorable odds into raw UI
errors merely to prevent an attempt.

## Settings And Content Ownership

Supported setting types are `boolean`, `select`, bounded `number`, bounded
`string`, `provider_connection`, and `action`. Only declared settings render.
Keys and values are namespaced under the module ID, copied before persistence,
and deleted with the module. Credential-like keys or values are rejected.

Use module-owned settings for specialized or niche controls. Do not add a core
setting merely so one optional module can operate. Content categories default
off, cannot enable themselves, and unload dependent modules when disabled.
Core supports SFW and Mature postures; explicit presentation and specialized
explicit mechanics remain opt-in, category-gated module content.

`MODS.getSetting()` and `MODS.setSetting()` are asynchronous and return
Promises. Await them in asynchronous hooks and action handlers. A synchronous
content-template renderer cannot branch directly on `MODS.getSetting()`; doing
so tests the truthiness of a Promise rather than the stored value. Either keep
the renderer deterministic from its supplied context or explicitly maintain
module-owned cached state with a documented refresh lifecycle.

Template registration is not an event subscription. A template contributes
only to the exact content path that the game or another documented extension
seam resolves. Inventing a new template path does not make it run after an
action. Use an implemented hook or action-variant seam when behavior must be
triggered, and use templates only for paths whose consumer is known and tested.

Manifest `contentRating` is the minimum posture required to enable the whole
module. A `mature` module therefore cannot promise SFW availability merely
because it registers a safe-tier fallback. For content categories,
`required: true` blocks module enablement until opt-in; `required: false` merely
advertises an optional category and does not by itself suppress the module's
other contributions. Stability Rule 6 protects core fallback content; it does
not require every arbitrary module-only template key to add an unused safe tier.

Compatibility fields and internal action IDs may remain readable for old saves.
New modules must use declared policy, public APIs, and structured eligibility
metadata instead of writing legacy global switches.

## AI And Narration

OpenAI-Compatible profiles are the canonical browser-direct text provider.
Puter remains an optional keyless adapter, not the default mod contract. Mods
select only an opaque `provider_connection` with the required capability.
Credentials and secret header values belong exclusively to the AI Providers
session vault and never to a manifest, module setting, save, log, context, or
URL.

Narration is presentation-only. Consume Scene Beats and bounded narration
context, preserve the captured player viewpoint and deterministic facts, and
publish owned records separately. Generated text cannot become the only record
of a mechanic or mutate authoritative state. Orchestrators must cancel private
work on unload, policy change, game start, and game load.

`registerNarrationOrchestrator` separates two concerns: `isActive(policy)` is
module-wide readiness under the active policy, and `claimsExchange(envelope)`
declares interest in one closed exchange. The predicate must be a function (a
non-function value is rejected); omitting it claims every otherwise-eligible
exchange (the original behavior). Core resolves one owner per closed exchange
and caches it before dispatching `onSceneExchangeClosed`, and predicates
receive a deep-frozen bounded copy so they cannot mutate each other's input.
Priority applies only among orchestrators that claim that exchange, and a
declined or throwing predicate falls through to lower-priority candidates.
Modules still call `await MODS.ownsNarrationExchange(envelope)` before
publishing.

## Media And Code-Free Packs

Executable module packages do not embed arbitrary binary payloads in runtime
code. Asset Bundle V1 describes reviewed, individually hashed resources copied
into durable storage. Modules with `media:read` receive session leases whose
URLs must not be persisted. Tileset Pack V1 is the only current map-presentation
consumer. Sprite, animation, audio, video, and 3D schemas are future contracts,
not implied by Asset Bundle V1.

## Authoring Checklist

Before calling a module complete:

1. Use the canonical `yaw-module` envelope and a unique stable ID.
2. Set the lowest honest content rating and declare every required category.
3. Request only permissions the code actually uses.
4. Declare an accurate minimum game version and runtime requirements.
5. Keep settings bounded, namespaced, credential-free, and removable.
6. Use only documented `MODS` APIs and current hook names.
7. Keep mechanics deterministic without remote services; keep AI optional.
8. Verify install, enable, use, disable, re-enable, replacement, deletion, and
   save/reload behavior.
9. Verify SFW/Mature policy changes, file/localhost/HTTPS origins as declared,
   and desktop/mobile surfaces affected by the module.
10. Ensure every advertised option has an executable route and every owned
    contribution disappears cleanly on unload.

## Deferred Boundaries

The following are not current module capabilities:

- a sandboxed community marketplace or verified publisher identity;
- automatic URI updates or runtime hotlinking;
- callback-based custom Fight, Talk, or Flee action-variant registration
  outside the declarative Combat Technique V1 seam;
- arbitrary save-schema mutation or direct mechanical control from narration;
- sprite, animation, audio, video, or 3D presentation schemas;
- persistent provider credentials in mods;
- archive installation without separate unpacking and path-safety contracts.

Add these only by changing runtime validation, tests, and this doctrine
together.
