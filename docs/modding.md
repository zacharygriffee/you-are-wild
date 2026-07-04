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

Mutating runtime registries requires declared permissions:

- `MODS.addBiome()` requires `world:add_biome`
- `MODS.addSpecies()` requires `content:add_species`
- `MODS.addItem()` requires `content:add_item`

If a module calls one of these APIs without the matching permission, enablement fails, partial runtime contributions are cleaned up, and the module remains disabled in storage.

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
