# Public Release Policy

`app/release.json` is the authoritative release record. Runtime module
compatibility, sparse-save metadata, the generated single-file artifact,
player-facing version labels, hosted packaging, and release notes consume that
record. Package versions and first-party package `gameVersion` fields are
mirrors; the build rejects mismatches.

## Pre-1.0 Versioning

- Patch (`0.11.1`): compatible fixes, copy, diagnostics, accessibility, and
  presentation changes that do not intentionally change save or mod contracts.
- Minor (`0.12.0`): new player-facing features or compatible API additions.
- Breaking pre-1.0 minor: any intentional save or module contract break must be
  called out as breaking in release notes, include migration or recovery
  guidance, and receive operator approval.

Published artifacts use the `public-preview` channel until the operator
promotes the project. Development builds may use a development channel but may
not impersonate a published version.

## Required Release Record

Every public release declares:

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
8. Save a rollback-ready hosted version. Publishing remains operator-mediated.

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
