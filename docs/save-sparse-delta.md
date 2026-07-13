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
- `App.saveDebugState()`

Autosave marks a conservative default set when no explicit dirty domains exist. Future action code should mark narrower domains as it is touched.

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

1. Prepare the live save snapshot.
2. Persist world tile deltas when `worldTiles` or `currentTile` are dirty.
3. Write dirty domain records.
4. Write the slot manifest last.
5. Clear dirty domains only after manifest success.

If record or manifest writing fails, dirty domains remain set for retry. The previous committed manifest remains the load boundary.

## Queue Semantics

Autosave keeps:

- one active save;
- one latest pending dirty state;
- no unbounded queue.

Routine autosaves are debounced. Explicit immediate saves flush the current pending state. Debug state exposes `idle`, `scheduled`, `saving`, and `saving-dirty` style queue status.

## Load Semantics

Load order:

1. Try sparse manifest + records.
2. Reconstruct the Binary-compatible loaded shape.
3. Load world tile deltas from `YAW_Worlds`.
4. Fall back to old full Binary save data when no sparse manifest exists.

Old saves remain loadable. Manual full saves still use the Binary fallback path.

## Performance Instrumentation

`App.saveDebugState()` exposes:

- last total save milliseconds;
- last dirty domains;
- current dirty domains;
- sparse record count;
- queue state;
- last save mode: `sparse`, `full`, `fallback`, or `none`;
- timing breakdown for world store, record writes, and manifest write.

Saves slower than `App.SAVE_SLOW_LOG_MS` log a warning with timing details.
