# Module Doctrine

This document is the canonical authoring contract for You Are Wild modules.
It describes the capabilities that exist in the current runtime, not planned
APIs. Historical plans, release notes, changelogs, and generated examples are
not doctrine.

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
- [Asset Bundle V1](asset-bundle-v1.md)
- [Tileset Pack V1](tileset-pack-v1.md)

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
- `runtimeRequirements` may declare `origins`, `network`, `secureContext`, and
  `hotToggleSafe`. Omitting it permits every current origin, no network or
  secure-context requirement, and restart-required toggling during a run.
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
| `media:read` | list, inspect, acquire, and release owned media leases |
| `scene:read_narrative` | bounded narration context and extensions |
| `scene:narrate` | owned narration publication and orchestration |
| `ai:request` | request an existing opaque provider connection |
| `ai:provide` | register a trusted provider adapter and session connection |
| `world:add_biome` | add or temporarily replace an owned biome definition |
| `content:add_species` | add owned serializable species data |
| `content:add_item` | add owned serializable item data |
| `content:add_template` | register owned content templates |
| `content:add_locale` | register owned locale entries |
| `content:add_creation_option` | register owned creation choices |
| `content:add_action_variant` | register an owned Feed or Feast variant |

Unknown permissions reject installation. Calling a permissioned API without
declaring its token fails module enablement and cleans partial contributions.

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

### Hook events

The current hook registry accepts exactly:

- `onMapGenerate`, `onEncounterStart`, `onCombatAction`;
- `onDigestionTick`, `onSubActionExecute`;
- `onDefeat`, `onDefeatEncounterSettled`, `onPlayerState`, `onRegenerate`;
- `onPlayerMove`, `onGameStart`, `onGameLoad`, `onGameSave`, `onTick`;
- `onSceneBeat`, `onSceneExchangeClosed`, `onContentPolicyChanged`.

Unknown hook names reject registration. Hooks and tracked timers are removed on
unload. A hook is notification or a documented extension seam, not permission
to bypass authoritative resolution. Narrative hooks receive copied/frozen
envelopes after deterministic state commits; save hydration does not replay
them.

## Action Variant Contract

The public registration seam currently extends only `feed` and `feast`:

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

The UI also presents core Play self/target choices through the contextual menu,
but custom Play variants are not a public module capability yet. Do not declare
or document a Play, Fight, Talk, or Flee variant until the runtime registry
explicitly supports it. Manifest `gameplayVariants` are policy toggles, not
executable action variants.

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
- custom Play/Fight/Talk/Flee action-variant registration;
- arbitrary save-schema mutation or direct mechanical control from narration;
- sprite, animation, audio, video, or 3D presentation schemas;
- persistent provider credentials in mods;
- archive installation without separate unpacking and path-safety contracts.

Add these only by changing runtime validation, tests, and this doctrine
together.
