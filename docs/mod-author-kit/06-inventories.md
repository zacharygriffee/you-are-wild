# Current Runtime Inventories

These are the built-in identifiers available in game `0.17.0`. They are
evidence for references, not permission to mutate the corresponding core
records. A module may add its own identifiers only through a documented
registration API.

## Core species IDs

```text
human      wolf        fox         cat         dragon
naga       bear        tiger       bunny       slime
harpy      bat         deer        frog        plant
shroom     bee         goblin      mouse       rat
pig        cow         sheep       horse       lizard
spider     centaur     drow        hyena       raccoon
otter      fish        crab        siren       troll
bandit     skeleton    goat        eagle
```

Use these for species eligibility, quest creature objectives/directives, and
existing encounter references.

## Core biome IDs

```text
grove      forest     swamp       plains      cave
jungle     dungeon    manor       beach       road
cliff      water      bridge      farm        indoors
entrance
```

These may be referenced by Species Profile V1 encounters and Quest World
Directives V1. A newly registered biome may be referenced only after its
registration has run.

## Core structure IDs

All current structure IDs:

```text
cabin      hut         cave        ruins       camp
shrine     pond        tree        spring      burrow
nest       web         manor       dungeon
```

Quest Contract V2 acquisition routes must name a structure with an existing
quest service. The currently usable route IDs are:

```text
cabin      hut         ruins       camp         shrine
```

Other structure IDs are not valid quest acquisition routes even though they
exist in the world.

## Item acquisition table IDs

Merchant stock:

```text
general    traveler    herbalist    relic       outfitter
```

Loot:

```text
basicGear  armory      relicGear
```

Modules may append their registered Item Definition V2 IDs to these tables
through `acquisition`. They cannot create new tables.

## Core locale IDs

```text
en         es
```

English is the fallback. A new locale may target `core` and fall back to one of
these. A module may add English/Spanish entries under its own locale-key
namespace without registering a new locale definition.

## Equipment matching tokens

Core equipped slots:

```text
head       body        hands       feet        accessory1
accessory2
```

Combat Technique V1 can match these slot tokens. Item Definition V2 cannot
currently add equipment.

## Hooks

Every accepted hook name:

```text
onMapGenerate
onEncounterStart
onCombatAction
onDigestionTick
onSubActionExecute
onDefeat
onDefeatEncounterSettled
onPlayerState
onRegenerate
onPlayerMove
onGameStart
onGameLoad
onGameSave
onTick
onSceneBeat
onSceneExchangeClosed
onContentPolicyChanged
```

Source-independent authoring rule:

- `onSceneBeat(envelope)`, `onSceneExchangeClosed(envelope)`, and
  `onContentPolicyChanged(policy)` have bounded copied narration contracts
  described in `04-ui-scene-narration-ai.md`.
- `onGameStart()` and `onGameLoad()` are safe boundaries for clearing
  module-private queues and caches; do not depend on their runtime-bearing
  payload.
- the remaining legacy hooks expose live game objects or evolving payloads.
  Without a focused contract, use them only as a notification and do not read
  or mutate their arguments.

Do not use a hook to obtain authority absent from the manifest permissions and
focused APIs.

## UI slots

```text
composer.place.after
roster.party.badges
roster.here.badges
roster.details.sections
system.utilities
```

## Runtime origins

```text
file        https       localhost   http
```

`localhost` distinguishes loopback HTTP from general HTTP. Runtime requirements
are compatibility declarations, not fetch permission.

## Application hosts and semantic capabilities

```text
browser
pear-electron
```

```text
app.host_settings
files.export_save
files.import_save
providers.session_transport
providers.secure_transport
providers.persistent_credentials
distribution.read_status
```

Declaring a host or capability only blocks activation when it is missing. It
does not add a `MODS` method or authorize native operations.

## Permission tokens

```text
ui.read
ui:contribute
media:read
media:provide
scene:add_template
scene:read_narrative
scene:narrate
ai:request
ai:provide
world:add_biome
content:add_species
content:add_item
content:add_quest
content:add_template
content:add_locale
content:add_creation_option
content:add_action_variant
content:add_perk_profile
mechanics:add_resource_profile
mechanics:add_combat_technique
mechanics:add_recovery_mode
```

Unknown permissions reject installation.

## Tileset semantic keys

### Terrain

```text
unknown
terrain-grove
terrain-forest
terrain-plains
terrain-swamp
terrain-cave
terrain-jungle
terrain-beach
terrain-cliff
terrain-water
terrain-sand
terrain-dungeon
terrain-manor
terrain-farm
terrain-indoors
terrain-entrance
```

The biome identities `road` and `bridge` resolve to route semantics rather than
new base terrain keys.

### Roads

```text
route-road-vertical
route-road-horizontal
route-road-end
route-road-end-north
route-road-end-east
route-road-end-south
route-road-end-west
route-road-corner
route-road-corner-ne
route-road-corner-es
route-road-corner-sw
route-road-corner-wn
route-road-t-north
route-road-t-east
route-road-t-south
route-road-t-west
route-road-intersection
```

### Bridges

```text
route-bridge-vertical
route-bridge-horizontal
```

### Points of interest

```text
poi-settlement
poi-rest-site
poi-danger-site
poi-resource-site
poi-landmark
poi-structure
```

### Structures

```text
structure-camp
structure-hut
structure-ruins
structure-spring
structure-shrine
structure-farm
structure-village
structure-cave
structure-web
structure-cabin
structure-pond
structure-great-tree
structure-burrow
structure-nest
structure-cave-mouth
```

### Interior identity

```text
interior-room
interior-cave-room
interior-exit
interior-wall
interior-door
interior-entrance
```

### Interior path topology

```text
interior-path-isolated
interior-path-end-north
interior-path-end-east
interior-path-end-south
interior-path-end-west
interior-path-horizontal
interior-path-vertical
interior-path-corner-ne
interior-path-corner-es
interior-path-corner-sw
interior-path-corner-wn
interior-path-t-north
interior-path-t-east
interior-path-t-south
interior-path-t-west
interior-path-intersection
```

### Doors, exits, and walls

```text
interior-door-north
interior-door-east
interior-door-south
interior-door-west

interior-exit-north
interior-exit-east
interior-exit-south
interior-exit-west

interior-wall-north
interior-wall-east
interior-wall-south
interior-wall-west
```

### Shorelines

```text
shoreline-water-north
shoreline-water-east
shoreline-water-south
shoreline-water-west

shoreline-water-outer-ne
shoreline-water-outer-es
shoreline-water-outer-sw
shoreline-water-outer-wn

shoreline-water-inner-ne
shoreline-water-inner-es
shoreline-water-inner-sw
shoreline-water-inner-wn
```

### State and effect overlays

```text
state-danger-influence
state-current
state-quest
state-blocked
state-danger
state-blocked-north
state-blocked-east
state-blocked-south
state-blocked-west
```

## Sprite semantic inventory

Lookup keys:

```text
species-<species-id>
ability-<ability-id>
disposition-<disposition>
flag-player
flag-ghost
default
```

States:

```text
idle        wounded     defeated    contained   ghost
```

Facings:

```text
any         north       east        south       west
```

## Vocabularies duplicated for machine-independent authoring

Species body parts:

```text
fangs wings tail claws horns webbing scales fins stinger tentacles pincers
```

Species abilities:

```text
rage menacing flying ranged constrictor poisonous darkvision bloodsuck
swimming floopy enveloped venom antiflying tasty fastFlee small livestock
laughing
```

Species temperaments:

```text
timid prey fastFlee herd livestock aquatic territorial aggressive swarm
opportunistic pack nocturnal cunning ambush apex aerial adaptable relentless
passive playful enveloping
```

Species interaction eligibility:

```text
social party quest merchant recruit sensitiveSocial combat feed feast
```

Perk stat effects:

```text
MPun MPle Figh Feas Flir Fuck Flee Feed str con spd int wis cha
```

Perk flag effects:

```text
predatorScent fearResist nightVision
```

Combat technique statuses:

```text
bleed burn freeze stun sleep charm fear
```
