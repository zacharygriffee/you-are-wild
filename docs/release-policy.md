# Public Release Policy

`app/release.json` is the authoritative release record. Runtime module
compatibility, sparse-save metadata, the generated single-file artifact,
player-facing version labels, hosted packaging, and release notes consume that
record. Package versions and first-party package `gameVersion` fields are
mirrors; the build rejects mismatches. The Sites project synchronizes its
release mirror and hosted first-party packages from the authoritative sources;
its chooser and development changelog derive candidate identity from that
mirror instead of hard-coded version strings.

## Product Versioning

- Patch (`0.11.1`): compatible fixes, copy, diagnostics, accessibility, and
  presentation changes that do not intentionally change save or mod contracts.
- Minor (`0.12.0`): new player-facing features or compatible API additions.
- Major (`1.0.0`, then `2.0.0`): an intentional incompatible save or module
  contract that cannot be loaded through a safe automatic migration. It must
  be called out as breaking, include recovery guidance, and receive operator
  approval.
- A save-schema field or schema-version increment is not automatically a
  product major when it is additive and safely migrated. Product SemVer
  follows player and module compatibility; the separate save-schema and
  module-API numbers identify the technical contract being loaded.

Select-group releases use `status: released`, `channel: alpha`, and the actual
release date. They are intentionally not general-public releases. General
public alpha distribution uses the `public-preview` channel until the operator
promotes the project. Development builds may use a development channel but may
not impersonate a released version. Unpublished records use numeric semantic
versioning, `status: draft` or `candidate`, `channel: development`, and
`releasedAt: null`.

## Required Release Record

Every released build declares:

- semantic version and release date;
- release channel;
- current save schema and module API version;
- localized Added, Changed, Fixed, and Known Issues notes;
- save and mod compatibility guidance.

Release notes are bundled into the HTML and remain available offline. The
once-per-version notice is device-local and does not use analytics or a network
request.

## Release Checklist

1. Update `app/release.json` and its localized notes.
2. Update only intentional package-version mirrors and first-party package
   `gameVersion` mirrors.
3. Load a representative older save and confirm migration/recovery behavior.
4. Install and enable the bundled Simple Narrator through the applicable host
   or local import route.
5. Verify `file://`, localhost, and hosted builds show the same version.
6. Run `npm run full-build`, `npm run audit:branding`, and `git diff --check`.
7. Verify mobile and desktop system screens, including What's New, Activity
   Log, AI Providers, Mods, and Host Catalog.
8. Curate the newest-first Sites archive according to
   [Sites Changelog and Release Archive](sites-changelog.md), then run its
   server-render tests.
9. Save a rollback-ready hosted version. Publishing remains operator-mediated.

## Version 0.11.0 Compatibility

- Existing 0.10.x saves load automatically; no manual migration is required.
- The sparse save manifest records game version, save schema, and module API.
- Modules with `minGameVersion: 0.10.0` remain compatible.
- First-party packages are stamped as produced by game version 0.11.0 while
  retaining their intentional minimum compatible game version.

## Version 0.11.1 Compatibility

- Existing saves and modules remain compatible without migration.
- Existing provider profiles retain their explicitly stored token ceiling.
- New provider profiles default to an 8,192-token completion ceiling.

## Version 0.12.0 Compatibility

- Existing 0.10.x and 0.11.x saves load without a schema migration.
- Multi-target Fight practice is additive save metadata; older units begin at
  Novice and learn through play.
- Modules requiring game version 0.10.0 or 0.11.x remain compatible. Tileset
  packs authored against the finalized first-party V1 semantics may declare
  0.12.0 as their minimum version.

## Version 0.12.1 Compatibility

- Existing 0.10.x, 0.11.x, and 0.12.0 saves load without player migration.
- Defeat, recovery-bag, and companion-placement metadata is additive.
- Existing module minimum-version contracts remain valid; first-party package
  production metadata is stamped with 0.12.1.
- Hosted Textured and Lightweight choices use the same runtime, save format,
  and module API. The choice only controls first-party atlas acquisition.

## Version 0.12.2 Compatibility

- Existing 0.10.x through 0.12.1 saves load without player migration.
- Feed variants, living retreat outcomes, and interface refinements do not
  change the save schema or module API.
- Existing module minimum-version contracts remain valid; first-party package
  production metadata is stamped with 0.12.2.
- The Sites chooser remains the same runtime split between Textured and
  Lightweight presentation.

## Version 0.12.3 Compatibility

- Existing 0.10.x through 0.12.2 saves load without player migration.
- The shared combat subinteraction sheet changes presentation state only; the
  save schema and module API remain unchanged.
- Existing module minimum-version contracts remain valid; first-party package
  production metadata is stamped with 0.12.3.
- The canonical Module Doctrine clarifies the existing runtime contract and
  does not add an unsupported hook or contribution type.

## Version 0.13.0 Compatibility

- Existing 0.10.x through 0.12.3 saves load without player migration.
- Exchange-specific narration ownership is an additive module contract and does
  not change the save schema or invalidate existing narration orchestrators.
- Orchestrators that use `claimsExchange` must declare game version 0.13.0 or
  newer; orchestrators that omit it retain the original claim-all behavior.
- First-party package production metadata is stamped with 0.13.0.

## Version 0.14.0 Compatibility

- Existing 0.10.x through 0.13.0 saves load without player migration.
- Species Profile V1 is an additive, bounded extension to species contributions;
  existing species modules that omit a profile retain their original behavior.
- Modules using Species Profile V1 must declare game version 0.14.0 or newer.
- First-party package production metadata is stamped with 0.14.0.

## Version 0.15.0 Candidate Compatibility

- The development head is stamped 0.15.0 with explicit draft/development
  metadata; it is not the published 0.15.0 public preview.
- Save schema remains 11 and module API remains 1.
- Existing minimum module-version declarations remain valid. First-party
  package production metadata mirrors the candidate while intentional
  `minGameVersion` floors remain unchanged.

## Version 0.16.0 Candidate Compatibility

- Existing 0.10.x through 0.15.0 saves load through maintained additive
  normalization. Save schema remains 11 and recorded generator versions remain
  unchanged.
- Module API remains 1. Existing module minimum-version declarations remain
  valid.
- Modules using Item Definition V2 or Perk Profile V1 should require game
  version 0.16.0 or newer. Missing providers remain inert without deleting
  saved compatible instances or selected effects.
- Chew practice is additive compatibility metadata alongside existing
  multi-target Fight practice. Older units begin Chew at Novice without a save
  schema migration.
- Generator V4 introduced the safe-start contract, Generator V5 introduced the
  route graph, and Generator V6 changes new-world road rasterization. Recorded
  older generator versions remain immutable.
- Final compatibility claims require exact-candidate old-save and package
  lifecycle smoke before the record may become `released`.

## Version 0.18.3 Candidate Compatibility

- Existing 0.10.x through 0.18.2 saves remain within the maintained additive
  migration contract. Save Schema remains 11 and Module API remains 1.
- This patch changes repository and distribution licensing, not gameplay,
  simulation, save, or module contracts.
- The annotated `v0.18.2` tag is the final MIT-licensed revision. Version
  `0.18.3` and later use PolyForm Noncommercial 1.0.0 unless a later release
  or individual file expressly states otherwise.
