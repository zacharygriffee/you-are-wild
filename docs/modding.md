# Modding

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
- `permissions`: optional string array; entries must be token-like identifiers using letters, numbers, `_`, `-`, `.`, or `:`
- `dependencies`: optional string array; entries use the same token rules as permissions
- `minGameVersion` or `gameVersion`: optional minimum game version such as `0.10.0`; `gameVersion` is normalized into `minGameVersion`
- `trustBoundary`: optional, defaults to `trusted-local`; other trust boundaries are rejected until a stronger sandbox/package model exists

Malformed modules should fail before they are written to IndexedDB. Repeated permissions or dependencies are deduplicated during normalization.

Module package code must be a string and must pass syntax validation against the same trusted-local wrapper used at runtime before the package is stored or enabled. Package `assets` metadata must be a JSON-style serializable object; executable fields, circular references, symbols, `undefined`, `bigint`, non-finite numbers, arrays as the root asset payload, and other unsupported values are rejected before storage. Already-stored malformed packages are revalidated on enable and remain disabled if validation fails.

Module settings use namespaced keys under the module ID. Setting keys must be non-empty token strings using letters, numbers, underscores, hyphens, dots, or colons. Setting values must be JSON-style serializable data and are copied before storage so later in-memory mutation does not change persisted settings.

Dependencies are module IDs. A module cannot depend on itself, and a module can only be enabled when every declared dependency is installed and enabled. Disabling or deleting a module disables enabled dependents so stored enabled state and runtime hooks/contributions do not drift.

Installing a package with the same module ID replaces the stored package as disabled. If the previous package was active, its hooks and runtime contributions are unloaded and enabled dependents are disabled before the replacement can be enabled explicitly.

Game-version compatibility is enforced at install and enable time. A module that declares a `minGameVersion` newer than the current game build is rejected before storage through the normal installer, and an already-stored module with a newer requirement cannot be enabled.

## Runtime Contributions

Hooks registered through `MODS.registerHook()` are tagged with the loading module ID. Disabling, deleting, or reloading a module removes that module's owned hooks so behavior does not duplicate during the same session.

Supported hook events are `onMapGenerate`, `onEncounterStart`, `onCombatAction`, `onPlayerMove`, `onGameLoad`, `onGameSave`, and `onTick`. Unknown hook event names and non-finite priorities fail module enablement before the hook is registered.

Runtime data added through `MODS.addBiome()`, `MODS.addSpecies()`, and `MODS.addItem()` is also owned by the loading module. Disabling, deleting, or reloading a module removes those owned additions. If a module temporarily replaces an existing biome ID, unloading the module restores the previous biome definition.

Biome, species, and item contributions must be object data with a non-empty `id`. Species and item contributions are copied as JSON-style serializable data before they enter the live registries, so circular references, function-backed fields, symbols, `undefined`, `bigint`, and non-finite numbers reject enablement and leave the module disabled.

Species that should participate in baseline party, recruit, social, quest, merchant, feed, eat, or mature-capable interaction systems must declare person-like canon metadata such as `sapience: 'person'` or `baselineInteraction: 'sapient'`, a non-`animal` `bodyPlan`, and appropriate `interactionEligibility` flags. Species explicitly classified as ordinary animals with `sapience: 'animal'`, `bodyPlan: 'animal'`, `baselineInteraction: 'animal'`, or `modOnlyAnimal: true` do not inherit those baseline person-like interaction lanes even if a mod sets individual eligibility flags. They can still exist as authored/modded creatures, but interactions must be added deliberately by the mod rather than leaking through core defaults.

Mutating runtime registries requires declared permissions:

- `MODS.getContext(options)` requires `ui.read`
- `MODS.addBiome()` requires `world:add_biome`
- `MODS.addSpecies()` requires `content:add_species`
- `MODS.addItem()` requires `content:add_item`

If a module calls one of these APIs without the matching permission, enablement fails, partial runtime contributions are cleaned up, and the module remains disabled in storage.

## Public Narrative Context

Narrative and optional LLM-facing modules should call `MODS.getContext({ limit })` instead of reading `App`, save records, DOM text, or compatibility fields directly. The returned JSON-serializable contract is versioned through `context.version` and currently contains:

- active mode and content policy
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

## Body Features And Adult Anatomy

The default/SFW game should describe player-facing creation choices as neutral body options, traits, builds, capacities, and visible features. Safe mode hides explicit anatomy controls and uses compatibility defaults only for saves and mechanics. Do not expose explicit anatomy words in the static creation UI or safe stats/inspection surfaces.

Internal ids such as lower/chest anatomy values may remain stable for save compatibility and adult-capable mechanics, but rendered labels must pass through content-tier-aware localization. Core adult detail views may use adult-specific labels when the player has opted into the adult tier. Uncensored modules or agent-authored packs must declare an appropriate `contentRating`, use adult-specific labels/templates, and preserve the same content-tier gates.

When expanding build/body gameplay, prefer SFW mechanics in core first: capacity, appetite, size, mobility, intimidation, charm, visibility, equipment fit, and trait interactions. Explicit anatomy mechanics belong in adult-rated modules or clearly gated first-party optional packs unless a future doctrine change deliberately moves them into core adult content.

## Content Rating

Content ratings are metadata for install and UI policy. Text rendering still goes through `CONTENT` preferences and tier checks. Adult or mature content should not be introduced into core-safe defaults, and templates that are unavailable at a selected tier should fall back rather than returning empty output.

Stored content preferences are normalized on load and before save. Unknown keys are dropped, tiers are clamped to known values, booleans must be real booleans, filter tags are tokenized, and unknown languages fall back to English. Module/content policy checks should use the normalized `CONTENT.preferences` object instead of reading raw storage.

Modules can be installed at any declared content rating, but they can only be enabled when the active content policy allows that rating. Safe modules can enable by default, mature modules require the mature tier, and adult modules require both the adult tier and explicit descriptions.

When the player lowers content settings, already-enabled modules are rechecked against the active policy. Modules above the selected policy are disabled, unloaded, and have their owned hooks removed while allowed modules remain active.

Built-in optional content-pack handles exposed through `window.CONTENT_PACKS` use the same policy shape before registering templates. The core pack is installed automatically as baseline content; optional mature or adult packs must pass the current content settings before their templates are registered.

Content templates registered through `CONTENT.registerTemplate(category, type, variant, templates)` use tokenized category/type/variant keys. Template tiers are limited to `safe`, `mature`, and `adult`; each tier value must be a function or `null`, and at least one tier must be renderable. Malformed template registrations reject before mutating the registry.

## Future Marketplace Requirements

Before enabling remote/community packages, add:

- remote package signing or integrity checks
- explicit permission prompts
- dependency and game-version resolution
- stronger runtime isolation, such as an iframe or Worker capability boundary
- package-level content rating review
- asset provenance metadata for externally supplied media
