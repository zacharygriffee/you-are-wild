/**
 * YOU ARE WILD WORLD STORE
 * Sparse world metadata and tile-delta IndexedDB persistence.
 */

const YAW_WORLD_STORE = {
    nowMs() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
        return Date.now();
    },

    makeWorldId(app, purpose = 'world') {
        const cleanPurpose = String(purpose || 'world').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'world';
        const random = Math.floor(Math.random() * 0xFFFFFF).toString(36).padStart(4, '0');
        return `world_${Date.now()}_${cleanPurpose}_${random}`;
    },

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
        const totalStart = this.nowMs();
        const debug = {
            worldId: app.worldMeta?.worldId || '',
            worldMapSize: app.worldMap?.size || 0,
            tileDeltaCountBefore: app.tileDeltas?.size || 0
        };
        let phaseStart = this.nowMs();
        app.persistAllTileDeltas();
        debug.persistAllTileDeltasMs = Math.round(this.nowMs() - phaseStart);
        debug.tileDeltaCountAfter = app.tileDeltas?.size || 0;
        app.worldMeta = app._normalizeWorldMeta(app.worldMeta, app._defaultWorldMeta());
        const worldId = app.worldMeta.worldId || 'world_default';
        debug.worldId = worldId;
        phaseStart = this.nowMs();
        const db = await app._worldDbOpen();
        debug.dbOpenMs = Math.round(this.nowMs() - phaseStart);
        phaseStart = this.nowMs();
        const records = Array.from(app.tileDeltas.entries()).map(([key, delta]) => app._tileDeltaRecordFromEntry(key, delta));
        debug.recordBuildMs = Math.round(this.nowMs() - phaseStart);
        debug.recordCount = records.length;
        return new Promise((resolve, reject) => {
            const txStart = this.nowMs();
            const tx = db.transaction(['worlds', 'tileDeltas'], 'readwrite');
            const worlds = tx.objectStore('worlds');
            const tileDeltas = tx.objectStore('tileDeltas');
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
            tx.oncomplete = () => {
                debug.txMs = Math.round(this.nowMs() - txStart);
                debug.totalMs = Math.round(this.nowMs() - totalStart);
                app._lastWorldStoreDebug = debug;
                db.close();
                resolve(records.length);
            };
            tx.onerror = () => {
                debug.txMs = Math.round(this.nowMs() - txStart);
                debug.totalMs = Math.round(this.nowMs() - totalStart);
                debug.error = tx.error?.message || String(tx.error || 'world-store-persist-error');
                app._lastWorldStoreDebug = debug;
                db.close();
                reject(tx.error);
            };
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
    },

    forkCurrent(app, purpose = 'save') {
        const current = app._normalizeWorldMeta(app.worldMeta, app._defaultWorldMeta());
        const previousWorldId = current.worldId;
        const worldId = this.makeWorldId(app, purpose);
        app.worldMeta = { ...current, worldId };
        return { previousWorldId, worldId };
    },

    async referencedWorldIds(app) {
        const ids = new Set();
        for (const slotName of app._saveSlotNames()) {
            let saveData = null;
            try {
                saveData = await app._dbGet('saves', slotName);
            } catch (e) {
                console.warn(`Failed to read save slot ${slotName} for world cleanup`, e);
                return null;
            }
            if (saveData) {
                try {
                    const loaded = Binary.loadGame(saveData);
                    const meta = app._normalizeWorldMeta(loaded.worldMeta, null);
                    if (meta?.worldId) ids.add(meta.worldId);
                } catch (e) {
                    console.warn(`Skipped world cleanup because ${slotName} could not be decoded`, e);
                    return null;
                }
            }
            try {
                const manifest = await app._dbGet('saveManifests', slotName);
                const meta = app._normalizeWorldMeta(manifest?.worldMeta, null);
                if (meta?.worldId) ids.add(meta.worldId);
            } catch (e) {}
        }
        return ids;
    },

    recordWorldId(storeName, key, record) {
        if (storeName === 'worlds') return record?.worldId || String(key || '');
        if (record?.worldId) return record.worldId;
        const keyText = String(record?.key || key || '');
        return keyText.includes(':') ? keyText.split(':')[0] : '';
    },

    async pruneUnreferenced(app, referencedIds = null) {
        const refs = referencedIds instanceof Set ? referencedIds : await this.referencedWorldIds(app);
        if (!(refs instanceof Set)) return { skipped: true, deleted: 0 };
        const db = await app._worldDbOpen();
        const storeNames = ['worlds', 'tileDeltas', 'chunkDeltas', 'entityIndex']
            .filter(name => db.objectStoreNames?.contains?.(name));
        if (!storeNames.length) {
            db.close();
            return { skipped: false, deleted: 0 };
        }
        return new Promise((resolve, reject) => {
            let deleted = 0;
            const tx = db.transaction(storeNames, 'readwrite');
            for (const storeName of storeNames) {
                const store = tx.objectStore(storeName);
                const cursorReq = store.openCursor();
                cursorReq.onsuccess = e => {
                    const cursor = e.target.result;
                    if (!cursor) return;
                    const worldId = this.recordWorldId(storeName, cursor.key, cursor.value);
                    if (worldId && !refs.has(worldId)) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                };
                cursorReq.onerror = () => reject(cursorReq.error);
            }
            tx.oncomplete = () => { db.close(); resolve({ skipped: false, deleted }); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_WORLD_STORE = YAW_WORLD_STORE;
}
