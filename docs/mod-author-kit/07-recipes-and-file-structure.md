# Recipes and Delivery Structure

The player's installable artifact is one `.yawmod.json` executable package,
plus an optional separately installed code-free asset bundle and its media
files.

## Smallest useful delivery

```text
my-mod/
├── my-mod.yawmod.json        # required installable artifact
├── README.md                 # player description and install/uninstall notes
├── LICENSE                   # distribution terms
└── src/
    └── module.js             # optional readable source mirrored into module.code
```

The game imports only `my-mod.yawmod.json`. `src/module.js` is a review and
maintenance convenience; its exact text must be copied into the JSON
`module.code` string. Do not make runtime behavior depend on adjacent files,
Node, npm, bundlers, source maps, environment variables, or the source game.

For a mod with media:

```text
my-mod/
├── my-mod.yawmod.json
├── my-mod-assets.json
├── media/
│   └── atlas.webp
├── README.md
├── LICENSE
└── src/
    └── module.js
```

The executable module and asset bundle are installed separately. Every media
file must be referenced by the asset manifest with exact bytes, length, MIME,
dimensions, and SHA-256.

## Naming rules

Choose one stable module ID and never repurpose it:

```text
lowercase_words_with_underscores
```

Use it consistently for:

- `packageId`;
- `module.manifest.id`;
- item, quest, resource, technique, recovery, and perk ownership;
- locale-key prefix with a dot;
- target module ID in an asset bundle.

Examples:

```text
module id:       moss_hare_pack
item id:         moss_hare_pack:field_tonic
perk id:         moss_hare_pack:pathfinder
resource key:    moss_hare_pack:spark
locale key:      moss_hare_pack.ui.about
```

Registration helpers automatically add some namespaces, but explicit
namespaced IDs in persisted contracts make review clearer.

## Recipe: content-only pack

Manifest permissions:

```json
[
  "content:add_species",
  "content:add_item",
  "content:add_quest"
]
```

Registration order:

1. add any new biome;
2. add species, including encounter placements;
3. add items;
4. add quests that reference those species/items;
5. add optional locale entries or UI presentation.

If any registration fails, the module does not enable. Put dependencies before
consumers so the first error points to the actual invalid definition.

## Recipe: mechanics pack

For declarative Fight and recovery choices:

```json
[
  "mechanics:add_combat_technique",
  "mechanics:add_recovery_mode"
]
```

Register profiles directly during module enable. Do not add hooks; core handles
resolution and persistence.

For a custom Play/Feed/Feast choice with an owned resource:

```json
[
  "content:add_action_variant",
  "mechanics:add_resource_profile",
  "scene:add_template"
]
```

Register resource, then action, then deterministic Scene template. The action
may read/spend/grant only its owned resource. Keep the returned summary true
even if the resource call returns zero.

## Recipe: UI utility

```json
["ui.read", "ui:contribute"]
```

Use `MODS.getContext()` for a one-time snapshot or rely on the frozen context
passed to the UI callback. Return text or a bounded dialog. Never create HTML.

If the contribution only needs callback context, omit `ui.read`;
`ui:contribute` already supplies its bounded context.

## Recipe: deterministic offline narrator

```json
["scene:read_narrative", "scene:narrate"]
```

Required pieces:

1. register an orchestrator;
2. listen for `onSceneExchangeClosed`;
3. await `MODS.ownsNarrationExchange(envelope)`;
4. obtain copied narration context;
5. produce at most 500 characters from its deterministic facts;
6. publish one ready exchange record;
7. clear private work queues on start/load/policy changes.

No AI permission, network requirement, or provider setting is needed.

## Recipe: provider-backed narrator

Permissions:

```json
[
  "scene:read_narrative",
  "scene:narrate",
  "ai:request"
]
```

Declare a provider setting:

```json
{
  "key": "provider",
  "type": "provider_connection",
  "capability": "text.generate",
  "label": "Text provider",
  "description": "Session connection used for optional narration."
}
```

Then follow the offline recipe, except:

1. publish a `pending` record after ownership;
2. read the selected opaque connection ID;
3. request `capability: "narration"` with copied context;
4. update the record to `ready`, `failed`, or `cancelled`;
5. never place credentials in the module.

The deterministic Scene Feed is always the fallback.

## Recipe: sprite or tileset pack

Deliver:

1. a small target executable module declaring `media:read`;
2. a separately reviewed `yaw-asset-bundle`;
3. one presentation declaration and atlas resources.

The executable module does not have to manually acquire atlases for the
built-in sprite/tileset consumers; activation does that through the target
owner. The module may contain only a log line if its sole purpose is to own the
presentation pack.

The player installs the target module, leaves/disables it, installs the asset
bundle from HTTPS or loopback, then enables the target.

## Source hygiene

A source-independent module must:

- use only `MODS`, callback arguments explicitly documented in this kit, and
  ordinary JavaScript;
- not reference `App`, `MODULE_SYSTEM`, `CONTENT`, `YAW_*`, DOM selectors,
  storage databases, or global game objects;
- not import source files or fetch code;
- not assume undocumented actor/target fields;
- keep hooks and timers owned and bounded;
- keep all mechanical state in documented core registries;
- use deterministic fallback text for all optional presentation.

Search the finished source for forbidden runtime reach-through:

```text
App
window.
document.
localStorage
indexedDB
MODULE_SYSTEM
CONTENT
YAW_
eval
Function(
```

These strings can occur harmlessly in prose, but any executable occurrence
needs removal or explicit justification outside the source-independent
contract.

## Packaging without a build tool

The authoring agent may write the final JSON directly. JSON strings must escape
newlines, quotes, and backslashes. A safer review workflow is:

1. author readable `src/module.js`;
2. produce `my-mod.yawmod.json` whose `module.code` is exactly that source as a
   JSON string;
3. parse the final JSON with any standards-compliant JSON parser;
4. compare the parsed `module.code` text with the source;
5. deliver the JSON as the canonical artifact.

Do not use comments, trailing commas, `NaN`, `Infinity`, functions outside the
code string, or binary data in JSON.

## Player README minimum

State:

- what the mod adds in player language;
- content rating and any required categories;
- minimum game version;
- permissions and why each is required;
- whether it works offline and on `file://`;
- whether it is safe to toggle during a run;
- dependencies;
- saved state that becomes dormant when disabled;
- install, enable, disable, update, and uninstall behavior;
- asset-bundle installation order if applicable.
