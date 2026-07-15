# Modding

Content posture, optional provider ownership, and compatibility rules are
defined in [Content Posture And Optional Providers](content-posture-and-providers.md).
AI transport profiles, capabilities, and credential boundaries are defined in
[AI Providers](ai-providers.md).

The current module system is a trusted-local mod lane. Installed module code runs in the same page context and should be treated as code the player deliberately chose to trust.

## Source Of Truth

Maintained module code lives in:

- `app/src/core/module-system.js`
- `app/src/ui/mod-ui.js`
- `app/src/ui/market-screen.js`

The marketplace screen currently uses local sample catalog fixtures. It is not a remote community marketplace and should not be presented as one until a stronger package, permissions, and sandbox model exists. Sample entries must use explicit fixture names/descriptions and must not use fake social-proof metadata such as downloads, ratings, package sizes, or community/staff-pick claims. Installing a sample creates a local stub module for workflow testing; it is not a real content download. The module-tools action should route to the local Mod Manager rather than placeholder remote publishing or creator flows.

Catalog entries should declare and display `contentRating` metadata so players can see whether a pack is safe or requires a higher content tier before install or enablement.

## Manifest Fields

`MODULE_SYSTEM.installModule()` validates and normalizes manifests before storage:

- `id`: required, letters/numbers/underscore/hyphen only
- `name`: required
- `version`: required
- `type`: optional, defaults to `feature_pack`
- `contentRating`: optional, one of `safe`, `mature`, `adult`; defaults to `safe`
- `contentCategories`: optional array of category IDs or declarations; required categories must be opted into before enablement
- `gameplayVariants`: optional array of variant IDs or declarations shown dynamically in Settings
- `permissions`: optional string array; entries must be token-like identifiers using letters, numbers, `_`, `-`, `.`, or `:`
- `dependencies`: optional string array; entries use the same token rules as permissions
- `minGameVersion` or `gameVersion`: optional minimum game version such as `0.10.0`; `gameVersion` is normalized into `minGameVersion`
- `trustBoundary`: optional, defaults to `trusted-local`; other trust boundaries are rejected until a stronger sandbox/package model exists

Malformed modules should fail before they are written to IndexedDB. Repeated permissions or dependencies are deduplicated during normalization.

Module package code must be a string and must pass syntax validation against the same trusted-local wrapper used at runtime before the package is stored or enabled. Package `assets` metadata must be a JSON-style serializable object; executable fields, circular references, symbols, `undefined`, `bigint`, non-finite numbers, arrays as the root asset payload, and other unsupported values are rejected before storage. Already-stored malformed packages are revalidated on enable and remain disabled if validation fails.

Module settings use namespaced keys under the module ID. Setting keys must be non-empty token strings using letters, numbers, underscores, hyphens, dots, or colons. Setting values must be JSON-style serializable data and are copied before storage so later in-memory mutation does not change persisted settings. Every write path, including direct `MODS.setSetting()`, rejects credential-like names, nested credential fields, bearer/private-key material, and common API-key shapes. Startup removes legacy setting records that violate this rule. Ordinary module settings and game saves are never credential stores.

Dependencies are module IDs. A module cannot depend on itself, and a module can only be enabled when every declared dependency is installed and enabled. Disabling or deleting a module disables enabled dependents so stored enabled state and runtime hooks/contributions do not drift.

Installing a package with the same module ID replaces the stored package as disabled. If the previous package was active, its hooks and runtime contributions are unloaded and enabled dependents are disabled before the replacement can be enabled explicitly.

Game-version compatibility is enforced at install and enable time. A module that declares a `minGameVersion` newer than the current game build is rejected before storage through the normal installer, and an already-stored module with a newer requirement cannot be enabled.

## Runtime Contributions

Hooks registered through `MODS.registerHook()` are tagged with the loading module ID. Disabling, deleting, or reloading a module removes that module's owned hooks so behavior does not duplicate during the same session.

Supported hook events include `onMapGenerate`, `onEncounterStart`, `onCombatAction`, `onPlayerMove`, `onGameStart`, `onGameLoad`, `onGameSave`, `onTick`, `onSceneBeat`, `onSceneExchangeClosed`, and `onContentPolicyChanged`. Unknown hook event names and non-finite priorities fail module enablement before the hook is registered. Narration modules must clear private pending queues and cancel requests on both `onGameStart` and `onGameLoad`.

Runtime data added through `MODS.addBiome()`, `MODS.addSpecies()`, and `MODS.addItem()` is also owned by the loading module. Disabling, deleting, or reloading a module removes those owned additions. If a module temporarily replaces an existing biome ID, unloading the module restores the previous biome definition.

Biome, species, and item contributions must be object data with a non-empty `id`. Species and item contributions are copied as JSON-style serializable data before they enter the live registries, so circular references, function-backed fields, symbols, `undefined`, `bigint`, and non-finite numbers reject enablement and leave the module disabled.

Species that should participate in baseline party, recruit, social, quest, merchant, feed, eat, or mature-capable interaction systems must declare person-like canon metadata such as `sapience: 'person'` or `baselineInteraction: 'sapient'`, a non-`animal` `bodyPlan`, and appropriate `interactionEligibility` flags. Species explicitly classified as ordinary animals with `sapience: 'animal'`, `bodyPlan: 'animal'`, `baselineInteraction: 'animal'`, or `modOnlyAnimal: true` do not inherit those baseline person-like interaction lanes even if a mod sets individual eligibility flags. They can still exist as authored/modded creatures, but interactions must be added deliberately by the mod rather than leaking through core defaults.

Explicit narration additionally requires structured `adultEligibility` metadata with status `eligible` and a non-unknown authority. Core-authored species migrate to species-canon eligibility. Explicitly ineligible life stages override every legacy flag. Mod species remain `unknown` unless trusted species/unit metadata opts them in. The legacy `adultEligible` boolean migrates into the structured record for save compatibility but should not be authored in new content.

Mutating runtime registries requires declared permissions:

- `MODS.getContext(options)` requires `ui.read`
- `MODS.addBiome()` requires `world:add_biome`
- `MODS.addSpecies()` requires `content:add_species`
- `MODS.addItem()` requires `content:add_item`
- `MODS.registerContentTemplate()` requires `content:add_template`
- `MODS.registerLocaleEntries()` requires `content:add_locale`
- `MODS.registerCreationOption()` requires `content:add_creation_option`

If a module calls one of these APIs without the matching permission, enablement fails, partial runtime contributions are cleaned up, and the module remains disabled in storage.

## Public Narrative Context

Narrative and optional LLM-facing modules should call `MODS.getContext({ limit })` instead of reading `App`, save records, DOM text, or compatibility fields directly. The returned JSON-serializable contract is versioned through `context.version` and currently contains:

- active mode and content policy, including `posture`, `enabledCategories`, and enabled `gameplayVariants`
- safe location/tile summary
- public party and nearby-unit summaries
- bounded quest summaries
- bounded Scene Beat summaries
- bounded Activity Log summaries

The limit is clamped to 1-50 entries. Public unit summaries intentionally omit anatomy compatibility fields, containers, inventory, raw status payloads, save internals, credentials, and executable values. A narrative module can retain the returned snapshot, but must not treat it as a mutable reference to core state.

```js
const context = MODS.getContext({ limit: 12 });
MODS.log(JSON.stringify({
  mode: context.mode,
  location: context.location.tile,
  latestBeat: context.sceneBeats.at(-1) || null
}));
```

Core remains authoritative. A model response may provide presentation, continuity notes, or optional prose, but it cannot become the only record of a mechanical result.

### Narration Events And API

Narration modules declare `scene:read_narrative`, `scene:narrate`, and, when
needed, `ai:request`. Core dispatches copied, deeply frozen envelopes through
`onSceneBeat`, `onSceneExchangeClosed`, and `onContentPolicyChanged` only after
the deterministic beat or policy update is committed. Hydrating a save does not
replay these hooks.

Use `MODS.getNarrationContext({ beatId, exchangeId, recentBeatLimit,
activityLimit })` for bounded actors, consequences, policy, location, quests,
and recent continuity. Publish generated prose separately with
`MODS.publishNarration()`, then complete it through `MODS.updateNarration()`.
Modules can modify only their own records. Ready records persist; pending
requests do not. Current policy is reapplied whenever records render.
Mode, location, and time are taken from the recorded target exchange rather
than current play state. Recent beats are also bounded at the target, so a
delayed request cannot see events that happened later.

Orchestration packages register through `MODS.registerNarrationOrchestrator()`
and check `await MODS.ownsNarrationExchange(envelope)` before publishing. Core
selects one ready owner by policy and priority. This prevents standard and
category-specific packages from narrating the same exchange.

`MODS.ai.generate()` accepts a capability, opaque session connection id,
profile id, structured input, timeout, and character limit. It returns plain
text and non-secret provider/model metadata. Provider modules declare
`ai:provide`, register an adapter, and create session connections only after
their own authorization flow. Credential-like fields are rejected from both
manifest settings, public setting writes, and connection metadata. The dedicated
AI Providers panel owns profile setup. Puter is keyless from the game's
perspective; the OpenAI-Compatible adapter holds API keys and additional header
values only in its private in-memory session vault. Saved profiles contain
non-secret endpoint/model/protocol metadata and restore disconnected.

Manifest `settings` declarations support `boolean`, `select`, bounded `number`,
bounded `string`, `provider_connection`, and `action`. Only declared controls
render in the Mod Manager. `provider_connection` declares a capability such as
`text.generate`, stores an opaque profile id, lists compatible connected or
reconnectable profiles, and links to AI Providers. There is deliberately no
persistent secret setting type.

## Narrative And Structural Mod Lanes

Mod work should be classified before implementation:

- **Narrative/presentation mods** consume existing structured gameplay data and render it differently. They may register content templates, Scene Feed templates, safe summaries, Activity Log exporters, or optional LLM bridge output. They should read `SceneBeat`, `InteractionPlan`, `ActionOutcome`, Activity Log entries, content preferences, and public unit/tile summaries rather than parsing rendered prose as state.
- **Structural/gameplay mods** add or alter game data and mechanics. They may register species, biomes, items, quest templates, encounter hooks, combat/action hooks, or balance constants through explicit APIs and permissions. They must preserve save compatibility boundaries, content-tier policy, and sapient/person-like interaction eligibility gates.
- **Asset/content-pack mods** provide images, sprites, tilesets, local content packs, or template bundles. They need manifest provenance, content rating, relative paths, fallbacks, and clear ownership/licensing metadata before they are treated as more than local trusted fixtures.

Optional LLM-facing mods are narrative consumers, not core dependencies. Core gameplay must remain deterministic and readable without a model call, network request, or remote service. If a module prepares data for an LLM, it should emit bounded structured context from Scene Beats, Activity history, safe map summaries, quest state, and public unit metadata. It must not require hidden raw save internals, credentials, or unreviewed remote package behavior.

Feature-expansion proposals should explicitly choose one of three destinations before coding:

- **Core game:** mechanics or UI required for the baseline loop, save compatibility, accessibility, localization, or safety policy.
- **First-party optional mod/content pack:** desirable expansion that should be installable or toggleable without increasing core complexity.
- **Third-party mod seam:** documented API capability where the project supplies hooks and examples, but does not own the feature content or balance.

## Body Features And Optional Anatomy Providers

The default/SFW game describes player-facing creation choices as traits, builds, capacities, and visible features. Core does not create hidden anatomy defaults. Optional providers may contribute body-option controls, but those choices remain optional unless a separate mechanic explicitly requires them. Do not expose explicit anatomy words in the static creation UI or SFW stats/inspection surfaces.

Internal lower/chest compatibility IDs remain stable so existing saves and mechanics continue to load. Rendered labels pass through category-aware localization. An explicit provider owns new explicit labels, creation options, and templates, and its module remains blocked until the player selects Mature posture and opts into its required category.

When expanding build/body gameplay, prefer SFW mechanics in core first: capacity, appetite, size, mobility, intimidation, charm, visibility, equipment fit, and trait interactions. Explicit anatomy mechanics belong in category-gated optional providers unless a future doctrine change deliberately changes core posture.

## Content Rating

Content ratings are compatibility metadata for install and broad posture policy. The core UI exposes `sfw` and `mature` postures. Optional categories and gameplay variants are declared by providers and rendered dynamically in Settings. Explicit material must not be introduced into core defaults, and templates unavailable under active policy must fall back rather than returning empty output.

Stored content preferences are normalized on load and before save. Unknown keys are dropped, tiers are clamped to known values, booleans must be real booleans, filter tags are tokenized, and unknown languages fall back to English. Module/content policy checks should use the normalized `CONTENT.preferences` object instead of reading raw storage.

Modules can be installed at any declared content rating so their policy declarations are discoverable. Safe modules can enable under either posture. Mature modules require Mature posture. Legacy `adult` manifests remain loadable as a deprecated alias that implicitly requires the `explicit.sexual` category; there is no built-in Adult posture button.

When the player lowers content settings, already-enabled modules are rechecked against the active policy. Modules above the selected policy are disabled, unloaded, and have their owned hooks removed while allowed modules remain active.

Built-in content-pack handles exposed through `window.CONTENT_PACKS` contain baseline and non-explicit examples only. Explicit first-party content is distributed as an optional module and is not included in the generated HTML.

Content templates registered through `CONTENT.registerTemplate(category, type, variant, templates)` use tokenized category/type/variant keys. The internal `adult` template slot remains a compatibility/provider lane, not a third core posture. Provider modules normally contribute individual tiers through `MODS.registerContentTemplate()`. Malformed registrations reject before mutating the registry.

## Future Marketplace Requirements

Before enabling remote/community packages, add:

- remote package signing or integrity checks
- explicit permission prompts
- dependency and game-version resolution
- stronger runtime isolation, such as an iframe or Worker capability boundary
- package-level content rating review
- asset provenance metadata for externally supplied media
