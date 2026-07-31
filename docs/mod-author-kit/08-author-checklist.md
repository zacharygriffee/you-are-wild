# Source-Independent Mod Checklist

Use this as the release gate. A mod is not finished merely because its JSON
parses.

## Player value

- [ ] The package describes a player-facing experience, not only a contract
      demonstration.
- [ ] Every advertised mechanic is produced by a documented API.
- [ ] Optional AI/media failure leaves a complete deterministic fallback.
- [ ] Labels, descriptions, icons, and unavailable reasons explain the choice.

## Package

- [ ] Outer type is `yaw-module`, package version is `1`.
- [ ] `packageId` equals manifest `id`.
- [ ] Both trust-boundary fields are `trusted-local`.
- [ ] `gameVersion` records the authoring snapshot; `minGameVersion` is honest.
- [ ] The manifest contains only known permission tokens.
- [ ] Every declared permission is used and every called API has its permission.
- [ ] Dependencies and runtime requirements are explicit.
- [ ] Content rating/categories cover every contribution.
- [ ] Settings contain no credentials or secret-like values.
- [ ] `module.code` is a string and `module.assets` is serializable metadata.

## Source independence

- [ ] Code uses `MODS`, documented callback arguments, and ordinary JavaScript.
- [ ] Code does not access `App`, DOM, storage, `YAW_*`, or other game globals.
- [ ] No neighboring file, package manager, source checkout, environment
      variable, remote code, or build step is needed at runtime.
- [ ] No undocumented hook payload or actor/target field controls mechanics.
- [ ] Generated prose is never parsed as state or commands.

## IDs and references

- [ ] Module ID is stable and consistently namespaced.
- [ ] Persisted item, quest, resource, perk, technique, and recovery IDs will
      not be repurposed in updates.
- [ ] Every referenced biome, species, structure route, merchant/loot table,
      locale target, item, and dependency exists in `06-inventories.md` or is
      registered earlier by this package/dependency.
- [ ] Locale keys use the owning target namespace.

## Lifecycle

- [ ] Enable can run once without partial leftovers.
- [ ] Disable removes every live contribution and leaves deterministic fallback.
- [ ] Re-enable produces one copy, not duplicates.
- [ ] Timers and provider requests are bounded and unload-safe.
- [ ] New game/load/policy changes clear private queues and stale async work.
- [ ] Saved provider-owned records become dormant safely when the provider is
      absent.
- [ ] `hotToggleSafe` is false when removing definitions can affect a live run.

## Contract-specific

- [ ] Content values meet exact bounds in `02-content-contracts.md`.
- [ ] Mechanics use only the effect/status/resource vocabularies in
      `03-mechanics-contracts.md`.
- [ ] Action `validate` is synchronous, deterministic, and side-effect free.
- [ ] Action `execute` uses only owned resources or presentation results.
- [ ] Scene/narration text never contradicts deterministic facts.
- [ ] UI callbacks return only bounded escaped core-owned descriptors.
- [ ] AI credentials remain in provider session management only.
- [ ] Media leases are released and never saved.
- [ ] Asset bytes, sizes, dimensions, MIME, license, provenance, and SHA-256
      match exactly.

## Artifact checks

- [ ] Final `.yawmod.json` parses as strict JSON.
- [ ] Parsed `module.code` matches the reviewed readable source.
- [ ] JavaScript syntax parses.
- [ ] No unknown package, manifest, definition, or presentation fields remain.
- [ ] No placeholder IDs, example hashes, TODOs, or dummy URLs remain.
- [ ] README explains permissions, install order, fallback, and saved state.
- [ ] Test notes cover install, enable, use, save/load when applicable,
      disable, re-enable, replacement, and deletion.

## Evidence packet for an agent-made mod

Deliver these together:

```text
mod-id.yawmod.json
README.md
LICENSE
src/module.js                 optional but strongly recommended
mod-id-assets.json            when media is used
media/*                       when media is used
AUTHOR-EVIDENCE.md
```

`AUTHOR-EVIDENCE.md` should record:

- kit snapshot/game version;
- contracts used;
- permissions used;
- identifiers referenced;
- lifecycle cases considered;
- JSON and JavaScript parse results;
- contract bounds checked;
- known non-goals and fallbacks;
- any behavior not actually run in the game.

Do not label a package runtime-tested unless it was installed and exercised in
the matching game build. A package created from this kit alone can be
contract-authored and statically checked; runtime confirmation remains a
separate evidence class.
