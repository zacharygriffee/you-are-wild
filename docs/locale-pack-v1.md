# Locale Pack V1

Locale Pack V1 is the optional-module contract for adding interface languages
without bundling every translation into the offline game. English remains the
core fallback. A locale pack is executable trusted-local module code and must
declare `content:add_locale`.

## Registering A Locale

Register one reviewed locale definition before adding entries:

```js
MODS.registerLocale({
  id: 'fr',
  displayName: 'Francais',
  fallback: 'en',
  targets: [
    { moduleId: 'core', minVersion: '0.14.0' },
    { moduleId: 'example_module', minVersion: '1.2.0' }
  ]
});
```

- `id` is a lowercase BCP-47-style token, at most 35 characters.
- `displayName` is player-facing text, at most 80 characters.
- `fallback` must already be active and cannot reference the new locale.
- `targets` contains 1 to 16 unique module targets.
- A `core` target checks the running game version.
- Every other target must also appear in the locale pack manifest's
  `dependencies`, be active before the locale pack, and satisfy `minVersion`.

The language selector is rebuilt from the active locale catalog. If a saved
game selected a locale whose module is still loading from IndexedDB, the game
temporarily presents English, retains the requested locale ID, and restores it
when that owner registers. If the owner unloads, the active language moves to
the declared fallback and the selector refreshes.

## Registering Entries

Entries for a declared target use the target module's stable namespace:

```js
MODS.registerLocaleEntries('fr', {
  'example_module.creation.crest': 'Crete solaire',
  'example_module.action.greet': 'Saluer'
}, { target: 'example_module' });
```

Cross-module keys must start with `<target-module-id>.`. Locale packs must not
translate another module's rendered prose, DOM, save data, or implementation
names. The translated module owns its English reference keys and must retain
their meanings within a compatible module version.

Entries targeting `core` do not use a module prefix because existing core keys
already have stable semantic namespaces such as `action.*`, `settings.*`, and
`ui.*`:

```js
MODS.registerLocaleEntries('fr', {
  'action.fight': 'Combattre',
  'settings.language': 'Langue'
}, { target: 'core' });
```

Legacy modules may continue contributing entries to the maintained built-in
`en` or `es` tables without declaring a new locale. New cross-module locale
packs should use the explicit locale-definition and target form above.

## Ownership, Diagnostics, And Unload

A non-core locale has exactly one module owner. Other modules cannot add to or
replace it. Disabling, replacing, or deleting the owner restores prior entries,
removes the locale definition, and falls back safely if it was selected.
Disabling a translated dependency disables the locale pack through the normal
module dependency lifecycle before unloading that target.

At enable time, the module diagnostics compare each target namespace with the
locale's fallback table. Summary diagnostics use stable codes:

- `locale_missing_keys`: fallback keys without a translation;
- `locale_obsolete_keys`: translated keys absent from the fallback table.

Each diagnostic contains a count and at most 20 sample keys. Missing entries
remain usable through fallback; diagnostics do not synthesize translations.

The maintained fixtures are
[`neutral-conformance.yawmod.json`](examples/neutral-conformance.yawmod.json)
and
[`neutral-conformance-locale-pack.yawmod.json`](examples/neutral-conformance-locale-pack.yawmod.json).
They cover dependency order, version checks, dynamic selection, fallback,
reload, and unload without becoming player-facing content.

[`You Are Wild: French Preview`](../optional-mods/you-are-wild-french-preview.yawmod.json)
is the maintained real partial-language package. It intentionally translates
only high-frequency navigation, traversal, composer, and Activity Log text.
Browser acceptance installs and selects it, verifies visible and accessible
French menu text plus explicit English fallback diagnostics, restores it after
reload, and returns safely to English on disable. See
[Real Presentation Pack Acceptance](real-presentation-pack-acceptance.md).
