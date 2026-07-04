/**
 * YOU ARE WILD WORLD STORE
 * Sparse world metadata and tile-delta IndexedDB persistence.
 */

const YAW_WORLD_STORE = {
    async dbOpen(app) {
        return new Promise((resolve, reject) => {
            if (!indexedDB || typeof indexedDB.open !== 'function') {
                reject(new Error('IndexedDB unavailable'));
                return;
            }
            const req = indexedDB.open(app.WORLD_DB_NAME, app.WORLD_DB_VERSION);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds', { keyPath: 'worldId' });
                if (!db.objectStoreNames.contains('tileDeltas')) db.createObjectStore('tileDeltas', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('chunkDeltas')) db.createObjectStore('chunkDeltas', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('entityIndex')) db.createObjectStore('entityIndex', { keyPath: 'key' });
            };
            req.onsuccess = e => resolve(e.target.result);
            req.onerror = () => reject(req.error);
        });
    },

    async persist(app) {
        app.persistAllTileDeltas();
        app.worldMeta = app._normalizeWorldMeta(app.worldMeta, app._defaultWorldMeta());
        const worldId = app.worldMeta.worldId || 'world_default';
        const db = await app._worldDbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['worlds', 'tileDeltas'], 'readwrite');
            const worlds = tx.objectStore('worlds');
            const tileDeltas = tx.objectStore('tileDeltas');
            const records = Array.from(app.tileDeltas.entries()).map(([key, delta]) => app._tileDeltaRecordFromEntry(key, delta));
            worlds.put({ ...app.worldMeta, worldId, updatedAt: Date.now() });
            const cursorReq = tileDeltas.openCursor();
            cursorReq.onsuccess = e => {
                const cursor = e.target.result;
                if (!cursor) {
                    for (const record of records) tileDeltas.put(record);
                    return;
                }
                if (cursor.value?.worldId === worldId) cursor.delete();
                cursor.continue();
            };
            cursorReq.onerror = () => reject(cursorReq.error);
            tx.oncomplete = () => { db.close(); resolve(records.length); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    },

    async load(app) {
        app.worldMeta = app._normalizeWorldMeta(app.worldMeta, app._defaultWorldMeta());
        const worldId = app.worldMeta.worldId;
        if (!worldId) return 0;
        const db = await app._worldDbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['worlds', 'tileDeltas'], 'readonly');
            const worlds = tx.objectStore('worlds');
            const tileDeltas = tx.objectStore('tileDeltas');
            const records = [];
            const worldReq = worlds.get(worldId);
            worldReq.onsuccess = () => {
                if (worldReq.result) {
                    const loadedMeta = app._normalizeWorldMeta(worldReq.result, app.worldMeta);
                    if (loadedMeta.worldId === worldId) app.worldMeta = loadedMeta;
                }
            };
            const cursorReq = tileDeltas.openCursor();
            cursorReq.onsuccess = e => {
                const cursor = e.target.result;
                if (!cursor) return;
                if (cursor.value?.worldId === worldId) records.push(cursor.value);
                cursor.continue();
            };
            cursorReq.onerror = () => reject(cursorReq.error);
            tx.oncomplete = () => {
                db.close();
                app._applyTileDeltaRecords(records);
                const currentTile = app.getTile(app.location.x, app.location.y);
                app.currentBiome = currentTile.biome;
                app.creatures = app._tileCreatures(currentTile.creatures || []);
                resolve(records.length);
            };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_WORLD_STORE = YAW_WORLD_STORE;
}
