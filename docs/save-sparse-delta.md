# Sparse / Delta Save Foundation

This project uses a hybrid save model:

- **Full Binary saves** remain the compatibility/export fallback.
- **World tile deltas** remain in `YAW_Worlds`.
- **Routine autosaves** write sparse record DTOs into `YAW_Saves`.

The sparse model is not event sourcing. It stores the latest state for each dirty domain, then commits a slot manifest last.

## Dirty Domains

Known domains:

- `manifest`
- `player`
- `party`
- `inventory`
- `holdings`
- `currentTile`
- `worldTiles`
- `combat`
- `quests`
- `settings`
- `sceneFeed`
- `activityLog`

Helpers:

- `App.markSaveDirty(domain, reason)`
- `App.markSaveDirtyMany(domains, reason)`
- `App.clearSaveDirty(domain)`
- `App.clearSaveDirtyAll()`
- `App.dirtySaveDomains()`
- `App.hasDirtySaveDomains()`
- `App.markWorldTileDirty(x, y, reason)`
- `App.markCurrentWorldTileDirty(reason)`
- `App.dirtyWorldTileKeys()`
- `App.clearDirtyWorldTileKeys(keys)`
- `App.persistDirtyWorldTilesToMapStore(keys)`
- `App.saveDebugState()`

Autosave marks a conservative default set when no explicit dirty domains exist. Future action code should mark narrower domains as it is touched.

Routine gameplay should mark targeted domains before requesting autosave. The conservative default remains a compatibility fallback and is exposed in debug state so it can be treated as rare, measurable behavior rather than the normal path.

Expected common-domain ownership:

| Mutation | Expected dirty domains |
| --- | --- |
| Movement / tile entry | `manifest`, `player`, `party`, `currentTile`, `worldTiles`, `quests`, `sceneFeed`, `activityLog` |
| Structure enter/exit/interior move/rest | `manifest`, `player`, `party`, `currentTile`, `worldTiles`, `sceneFeed`, `activityLog` |
| Combat action / reach failure / enemy turn | `manifest`, `party`, `currentTile`, `combat`, `sceneFeed`, `activityLog`; `quests` only where combat outcome/progress can change |
| Combat end / regenerate | `manifest`, `player`, `party`, `currentTile`, `worldTiles`, `combat`, `quests`, `sceneFeed`, `activityLog` |
| Equipment / inventory owner state | `manifest`, `player`, `party`, `inventory`, `holdings`, `activityLog` |
| Drop / pickup / tile item | `manifest`, `inventory`, `holdings`, `currentTile`, `worldTiles`, `sceneFeed`, `activityLog` |
| Scene Beat only | `sceneFeed` |
| Containment / release / digest | `manifest`, `party`, `holdings`, `currentTile`, `worldTiles`, `combat`, `sceneFeed`, `activityLog` |
| Corpse scavenge | `manifest`, `party`, `holdings`, `currentTile`, `worldTiles`, `sceneFeed`, `activityLog` |
| Quest accept/progress/turn-in | `manifest`, `quests`, `sceneFeed`, `activityLog`, plus `player`, `party`, or `inventory` when rewards/progress can affect them |
| Trade buy/sell | `manifest`, `player`, `inventory`, `sceneFeed`, `activityLog` |
| Settings record | `manifest`, `settings` when slot-level settings are explicitly dirtied |
| Holdings owner switch | no dirty domain; this is UI-only selection state |

## IndexedDB Stores

`YAW_Saves` version 2 contains:

- `saves` for full Binary compatibility saves.
- `saveRecords` for sparse per-domain DTO records.
- `saveManifests` for manifest-last slot commits.

Record keys use:

- `slotName:domain`, for example `slot1:player`.
- Slot manifests are keyed by `slotName`.

World tile deltas stay in `YAW_Worlds` stores:

- `worlds`
- `tileDeltas`
- reserved `chunkDeltas`
- reserved `entityIndex`

## Commit Order

Sparse autosave:

1. Prepare live save state.
   - First sparse baseline for a slot may run full `_prepareSaveSnapshot()` so the slot has a complete compatibility boundary.
   - Routine sparse autosaves use narrow sparse preparation and should not call full `_prepareSaveSnapshot()`.
   - Manual/full saves still use full snapshot preparation.
2. Persist world tile deltas when `worldTiles` or `currentTile` are dirty.
   - First sparse baseline may persist all known tile deltas.
   - Routine sparse autosaves persist only explicit dirty world tile keys.
3. Write dirty domain records.
4. Write the slot manifest last.
5. Clear dirty domains only after manifest success.

If record or manifest writing fails, dirty domains remain set for retry. The previous committed manifest remains the load boundary. Sparse records are treated as a committed set: if a manifest points to a missing or invalid record, sparse reconstruction returns `null` so load can use the full Binary fallback when available.

## Queue Semantics

Autosave keeps:

- one active save;
- one latest pending dirty state;
- no unbounded queue.

Routine autosaves are debounced. Explicit immediate saves flush the current pending state. Debug state exposes `idle`, `scheduled`, `saving`, and `saving-dirty` style queue status.

## Load Semantics

Load order:

1. If a valid combat refresh snapshot exists for the slot, load that first. It is the authoritative crash/refresh recovery boundary for active combat.
2. Otherwise, try sparse manifest + records.
3. Reconstruct the Binary-compatible loaded shape.
4. Load world tile deltas from `YAW_Worlds`.
5. Fall back to old full Binary save data when no sparse manifest exists or sparse records are incomplete/corrupt.

Old saves remain loadable. Manual full saves still use the Binary fallback path.

## Performance Instrumentation

`App.saveDebugState()` exposes:

- last total save milliseconds;
- last dirty domains;
- current dirty domains;
- sparse record domains and keys written by the last save;
- whether the default all-dirty fallback was used and why;
- sparse record count;
- queue state;
- last save mode: `sparse`, `full`, `fallback`, or `none`;
- flat top-level fields for `prepareSnapshotMs`, `worldStoreMs`, `worldTilesScanned`, `worldTilesWritten`, `recordBuildMs`, `recordWriteMs`, `manifestWriteMs`, and `totalMs`;
- timing breakdown for save state preparation, dirty collection, record building, world store, record writes, manifest write, full Binary build/write when applicable, and total time;
- `snapshotDebug`, including either full `_prepareSaveSnapshot()` internal phase timing or routine sparse-prep timing, world map size, tile-delta count before/after, dirty world tile keys, and the `persistAllTileDeltas()` time spent inside full snapshot preparation when full prep is used;
- `worldStoreDebug`, including `worldPersistenceMode` (`baseline`, `dirty-tiles`, `skipped`, or `fallback-full-scan`), fallback reason when relevant, dirty world tile keys, world tiles scanned/written/deleted, record count, IndexedDB open time, record build time, and transaction time;
- `performanceDiagnostic`, a ranked phase summary that identifies the dominant save phase for the latest save;
- `slowSaveDiagnostic`, populated when the save exceeds `App.SAVE_SLOW_LOG_MS`.

Saves slower than `App.SAVE_SLOW_LOG_MS` log a flat multi-line warning instead of an object that requires console expansion. The warning includes the save slot, dirty reason, dirty domains, record domains, fallback state, snapshot preparation time, world store time, world persistence mode, tile scan/write counts, record build/write timing, manifest timing, and total time.

During mobile movement/combat playtests, check `App.saveDebugState()` after a hitch. The first questions should be:

1. Is `prepareSnapshotMs` high?
   - For routine autosaves, `snapshotDebug.mode` should be `sparse`. If it is full after the initial baseline, inspect the fallback reason/callsite.
   - For full/manual/baseline saves, inspect `snapshotDebug.persistAllTileDeltasMs`, `snapshotDebug.worldMapSize`, and `snapshotDebug.tileDeltaCountAfter`.
2. Is `worldStoreMs` high?
   - For routine movement/combat saves, `worldStoreDebug.worldPersistenceMode` should normally be `dirty-tiles`, with `worldTilesScanned` matching the bounded dirty key count.
   - If it is `fallback-full-scan`, inspect `worldStoreDebug.fallbackReason` and `defaultDirtyFallbackCallSite`.
   - If IndexedDB dominates, inspect `worldStoreDebug.dbOpenMs`, `worldStoreDebug.recordBuildMs`, and `worldStoreDebug.txMs`.
3. Is `performanceDiagnostic.dominantPhase` neither `prepareSnapshotMs` nor `worldStoreMs`? Then inspect record build/write or manifest phases before optimizing world storage.

Routine sparse autosave should no longer scan or write the entire known map after the first sparse baseline. If playtest hitches still point at sparse prep or dirty-tile persistence, the next optimization target should be the specific dirty owner or IndexedDB transaction shown by the flat diagnostics, not a broad save rewrite.
