# Package, Runtime, and Lifecycle Contract

## Canonical executable envelope

New modules use exactly this outer shape:

```json
{
  "packageType": "yaw-module",
  "packageVersion": 1,
  "packageId": "example_module",
  "gameVersion": "0.17.0",
  "trustBoundary": "trusted-local",
  "module": {
    "manifest": {
      "id": "example_module",
      "name": "Example Module",
      "version": "1.0.0",
      "description": "A concise player-facing description.",
      "type": "feature_pack",
      "contentRating": "safe",
      "minGameVersion": "0.17.0",
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

Rules:

- `packageId` must equal `module.manifest.id`.
- IDs use letters, numbers, `_`, or `-`.
- `name` and `version` are required.
- `gameVersion` records the packager version.
- `minGameVersion` is the lowest honestly supported runtime.
- Use `0.17.0` unless compatibility with an older contract was actually
  verified. Item Definition V2 and Perk Profile V1 require at least `0.16.0`.
- `trustBoundary` must be `trusted-local` in both places.
- `module.code` is JavaScript source executed once when the module enables.
- `module.assets` is serializable metadata, not a binary archive or private
  filesystem bridge.

Older bare `{manifest, code, assets}` packages may import for compatibility,
but they are not the authoring format.

## Manifest

### Content

`contentRating` is one of:

- `safe`
- `mature`
- `adult`

It gates the entire module. A blocked module registers nothing.

Optional `contentCategories` entries are tokens or:

```json
{
  "id": "example.category",
  "label": "Example category",
  "description": "What enabling it permits.",
  "required": true
}
```

Required categories block enablement until selected. Optional categories merely
advertise a category and do not independently hide contributions.

Optional `gameplayVariants` declare policy toggles; they do not register
executable action variants:

```json
{
  "id": "example.variant",
  "label": "Example variant",
  "description": "What changes.",
  "default": false,
  "settingKey": "variantEnabled",
  "minPosture": "sfw",
  "category": ""
}
```

### Runtime requirements

Allowed origins:

- `file`
- `localhost`
- `http`
- `https`

`network: true` blocks the module on `file:`. Set it only when module code
itself requires a hosted network origin. Selecting an AI provider through
`MODS.ai` does not mean the module owns provider transport.

`secureContext: true` requires HTTPS or localhost.

`hosts` and `capabilities` are optional compatibility declarations. Current
host IDs are `browser` and `pear-electron`; current semantic capabilities are
listed in `runtime-inventory.json`. A declaration can block activation on an
incompatible host, but it never grants a module a method, permission, Electron
access, filesystem authority, credential access, or distribution controls.
Modules should omit these arrays unless their documented behavior genuinely
cannot degrade on the browser host.

`hotToggleSafe: true` means core-owned unload is sufficient and the module
does not leave unsupported world mutations. Use `false` for definition seams
whose removal can affect an already-materialized run, such as a newly invented
biome.

### Dependencies

`dependencies` is an array of installed module IDs. Dependencies enable before
their dependent. Disabling, deleting, or replacing a dependency disables its
enabled dependents. Locale targets must also be declared dependencies.

## Settings

Every setting has a token `key`, `type`, label up to 120 characters, and
description up to 300 characters. Supported types:

| Type | Additional fields |
| --- | --- |
| `boolean` | `default` |
| `select` | 1–30 `{value,label}` options and `default` |
| `number` | `min`, `max`, `step`, `default` |
| `string` | `default`, `maxLength`, optional `multiline`, `rows` |
| `provider_connection` | `capability`, normally `text.generate`; default is always empty |
| `action` | register matching callback with `MODS.registerSettingAction` |

Single-line strings are limited to 500 characters; multiline strings to 2,000;
rows to 2–12. Settings are module-owned, persisted separately, and deleted
with the module.

Credential-like keys and values are rejected. Never store API keys, access
tokens, authorization values, passwords, secrets, private keys, or secret
headers in settings.

`MODS.getSetting()` and `MODS.setSetting()` return Promises. Await them.

## Stable runtime API

Module code receives:

- `MODS`
- tracked `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`
- safe standard language and browser primitives appropriate to trusted-local
  code

Only `MODS` is the stable game API. Do not access application globals, DOM,
internal IndexedDB stores, generated HTML, provider vaults, or save records.

Unpermissioned methods:

```js
MODS.id;
MODS.registerHook(event, callback, priority = 0);
MODS.registerSettingAction(key, callback);
await MODS.getSetting(key, fallback);
await MODS.setSetting(key, value);
MODS.log(message);
```

Hook callbacks must be functions and hook priority must be a finite number.
Higher priority runs first.

Every other API is listed with its permission in `contract-index.json`.
Declaring a permission without using it is poor review practice. Calling a
permissioned API without declaring it fails enablement and rolls back partial
contributions.

## Hook events

Only these events exist:

| Hook | Use |
| --- | --- |
| `onMapGenerate` | observe supported map-generation payload |
| `onEncounterStart` | observe encounter start |
| `onEncounterResolved` | frozen Encounter Outcome V1 after combat resolution |
| `onAutonomousEvent` | frozen coarse Autonomous Actor V1 event |
| `onCombatAction` | observe committed combat action |
| `onDigestionTick` | digestion-triggered module work |
| `onSubActionExecute` | committed Feed/Feast/Play variant outcome |
| `onDefeat` | terminal defeat notification |
| `onDefeatEncounterSettled` | post-companion-settlement defeat boundary |
| `onPlayerState` | player terminal/recovery state notification |
| `onRegenerate` | ordinary regeneration boundary |
| `onPlayerMove` | committed movement |
| `onGameStart` | new run boundary |
| `onGameLoad` | loaded run boundary |
| `onGameSave` | save notification |
| `onTick` | time/tick notification |
| `onActionCommitted` | copied/frozen committed Action Outcome V1 envelope |
| `onSceneBeat` | copied/frozen committed Scene Beat |
| `onSceneExchangeClosed` | copied/frozen closed exchange |
| `onContentPolicyChanged` | posture/category policy replacement |

Hooks do not grant authority over the event they observe. Encounter, action,
and narrative outcome hooks run after deterministic state commits. The
`onEncounterResolved` envelope contains only a bounded encounter ID, result,
round, XP total, location summary, and redacted participant summaries; it does
not expose live combatants. `onAutonomousEvent` reports only the actor's stable
ID, sequence, time, high-level intent, and committed origin/destination. Save
hydration does not replay hooks. Unknown hook names reject registration.

## Ownership and cleanup

Core owns cleanup. On disable, failed enablement, policy unload, replacement,
or deletion it removes:

- hooks and tracked timers;
- settings actions;
- UI contributions;
- biome/species/item/quest/template registrations;
- locale definitions and entries;
- action variants, resource profiles, combat techniques, recovery modes, and
  perk profiles;
- narration extensions, orchestrators, requests, and owned records;
- AI and media provider roles;
- media leases, tileset candidates, and sprite candidates.

Saved module-defined objects may remain bounded dormant data where the focused
contract explicitly says so. They do not remain executable while their owner
is absent.

### Lifecycle expectations

| Event | Required result |
| --- | --- |
| Install | Validate package; store disabled unless host policy says otherwise |
| Enable | Validate policy, version, origin, dependencies, permissions, and registrations atomically |
| Save/load | Only documented core-owned state persists |
| Disable | Remove executable contributions and restore deterministic fallback |
| Re-enable | Restore one owned registration without duplication |
| Replacement | Unload old owner; store replacement disabled; require fresh enable |
| Dependency loss | Disable dependents before target unload |
| Delete | Remove module, settings, owned runtime work, and owned asset catalog |

## Distribution and provenance

Players may obtain identical trusted-local packages through:

- `user`: reviewed local file import;
- `remote`: explicit HTTPS or loopback review followed by a local copy;
- `host`: current same-origin host manifest;
- `built-in`: game-owned package record.

Remote import is review-and-copy, not hotlinking or automatic updating.
Credentials, query strings, fragments, redirects, invalid JSON/UTF-8,
oversized packages, and mismatched digest pins reject. File-origin play does
not discover a host manifest.
