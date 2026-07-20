# Sites Changelog and Release Archive

The public Sites wrapper owns a newest-first `/changelog` page outside the game iframe. It complements, rather than replaces, the offline in-game What's New surface.

## Source boundaries

- `app/release.json` remains authoritative for the current numbered version, release date, compatibility, and localized in-game notes.
- `docs/releases/<version>.md` is the detailed permanent record for each numbered release.
- `docs/changelog.md` is the broader development history used to curate the newest Sites development entry.
- `site/app/changelog/entries.ts` is the public Sites presentation copy. It contains no gameplay state and is bundled only with the host wrapper.

## Update contract

1. Add completed work to the top development entry as it becomes ready for the next Sites build.
2. Keep the entry labeled `Development head` until that exact game build is staged with the wrapper. A staged numbered build may use `vX.Y.Z · Next public preview`; it must not say `Public preview` until the version is deployed.
3. When publishing a numbered version, change its staged label to `vX.Y.Z · Public preview`, place it immediately below any newer development work, and keep all older entries in descending date/version order.
4. Copy compatibility claims from the release record or focused release document; do not infer them from commit messages.
5. Run the Sites server-render tests so the chooser links the archive, entries remain newest-first, and the staged game version matches the wrapper.
6. Publishing remains an explicit operator action. Preparing, building, testing, or committing the wrapper does not authorize a Sites deployment.

The archive is intentionally static and anonymous. It does not need D1, accounts, analytics, or game IndexedDB access.
