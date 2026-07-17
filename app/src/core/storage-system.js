/**
 * YOU ARE WILD STORAGE HELPERS
 * LocalStorage and IndexedDB helpers kept separate from the main App object.
 */

const YAW_STORAGE = {
    saveTimeKey(app, slotName) {
        return app.storageKeys.saveTimePrefix + slotName;
    },

    legacySaveTimeKey(app, slotName) {
        return app.legacyStorageKeys.saveTimePrefix + slotName;
    },

    getStoredValue(app, keyName) {
        const current = localStorage.getItem(app.storageKeys[keyName]);
        const legacyKey = app.legacyStorageKeys[keyName];
        return current ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    },

    setStoredValue(app, keyName, value) {
        localStorage.setItem(app.storageKeys[keyName], value);
    },

    removeStoredValue(app, keyName) {
        localStorage.removeItem(app.storageKeys[keyName]);
        const legacyKey = app.legacyStorageKeys[keyName];
        if (legacyKey) localStorage.removeItem(legacyKey);
    },

    getSaveTime(app, slotName) {
        return localStorage.getItem(this.saveTimeKey(app, slotName)) || localStorage.getItem(this.legacySaveTimeKey(app, slotName)) || '0';
    },

    setSaveTime(app, slotName, value) {
        localStorage.setItem(this.saveTimeKey(app, slotName), value);
    },

    removeSaveTime(app, slotName) {
        localStorage.removeItem(this.saveTimeKey(app, slotName));
        localStorage.removeItem(this.legacySaveTimeKey(app, slotName));
    },

    combatRefreshKey(app, slotName = app.activeSlot) {
        return `${app.storageKeys.combatRefreshPrefix}${slotName || 'slot1'}`;
    },

    bytesToBase64(bytes) {
        const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
        if (typeof Buffer !== 'undefined') return Buffer.from(data).toString('base64');
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < data.length; i += chunkSize) {
            binary += String.fromCharCode(...data.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    },

    base64ToBytes(value) {
        if (typeof value !== 'string') return null;
        if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64'));
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    },

    parseCombatRefreshData(parsed) {
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.dataB64 === 'string') return this.base64ToBytes(parsed.dataB64);
        if (!Array.isArray(parsed.data)) return null;
        const validBytes = parsed.data.every(value => Number.isInteger(value) && value >= 0 && value <= 255);
        return validBytes ? new Uint8Array(parsed.data) : null;
    },

    isQuotaError(error) {
        return Boolean(error && (
            error.name === 'QuotaExceededError'
            || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
            || error.code === 22
            || error.code === 1014
        ));
    },

    writeCombatRefreshSnapshot(app, saveData, slotName = app.activeSlot) {
        if (typeof localStorage === 'undefined' || !saveData) return false;
        const key = this.combatRefreshKey(app, slotName);
        const payload = JSON.stringify({
            schema: 'yaw-combat-refresh-v2',
            slot: slotName,
            savedAt: Date.now(),
            encoding: 'base64',
            dataB64: this.bytesToBase64(saveData)
        });
        try {
            localStorage.removeItem(key);
            localStorage.setItem(key, payload);
            return true;
        } catch (e) {
            try { localStorage.removeItem(key); } catch (clearError) {}
            if (this.isQuotaError(e)) {
                if (!app._combatRefreshQuotaWarnings) app._combatRefreshQuotaWarnings = new Set();
                if (!app._combatRefreshQuotaWarnings.has(slotName)) {
                    app._combatRefreshQuotaWarnings.add(slotName);
                    console.warn('Combat refresh snapshot skipped: localStorage quota exceeded; primary autosave remains active.');
                }
                return false;
            }
            throw e;
        }
    },

    readCombatRefreshSnapshot(app, slotName = app.activeSlot) {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(this.combatRefreshKey(app, slotName));
        if (!raw) return null;
        let parsed = null;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            this.clearCombatRefreshSnapshot(app, slotName);
            return null;
        }
        if (!parsed || parsed.slot !== slotName) {
            this.clearCombatRefreshSnapshot(app, slotName);
            return null;
        }
        const saveData = this.parseCombatRefreshData(parsed);
        if (!saveData) {
            this.clearCombatRefreshSnapshot(app, slotName);
            return null;
        }
        const savedAt = Number(parsed.savedAt || 0);
        if (!savedAt || Date.now() - savedAt > app.COMBAT_REFRESH_TTL_MS) {
            this.clearCombatRefreshSnapshot(app, slotName);
            return null;
        }
        return { saveData, savedAt };
    },

    clearCombatRefreshSnapshot(app, slotName = app.activeSlot) {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(this.combatRefreshKey(app, slotName));
    },

    reloadPage() {
        if (typeof location !== 'undefined' && location.reload) location.reload();
    },

    deleteDatabase(dbName) {
        return new Promise((resolve, reject) => {
            if (!dbName || typeof indexedDB === 'undefined' || typeof indexedDB.deleteDatabase !== 'function') {
                resolve(false);
                return;
            }
            const req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => {
                console.log(`${dbName} deleted`);
                resolve(true);
            };
            req.onerror = () => reject(req.error || new Error(`Failed to delete ${dbName}`));
            req.onblocked = () => reject(new Error(`Delete blocked for ${dbName}. Close other game tabs and try again.`));
        });
    },

    async databaseExists(dbName) {
        if (!dbName || typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') {
            return false;
        }
        try {
            const databases = await indexedDB.databases();
            return Array.isArray(databases) && databases.some(db => db && db.name === dbName);
        } catch (e) {
            console.warn(`Failed to inspect IndexedDB databases for ${dbName}:`, e);
            return false;
        }
    },

    async deleteDatabaseIfExists(dbName) {
        if (!await this.databaseExists(dbName)) return false;
        return this.deleteDatabase(dbName);
    },

    async dbOpen(app, dbName = app.SAVE_DB_NAME) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(dbName, app.SAVE_DB_VERSION || 1);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
                if (!db.objectStoreNames.contains('saveManifests')) db.createObjectStore('saveManifests');
                if (!db.objectStoreNames.contains('saveRecords')) db.createObjectStore('saveRecords');
            };
            req.onsuccess = e => resolve(e.target.result);
            req.onerror = () => reject(req.error);
        });
    },

    async dbPut(app, store, key, value) {
        return new Promise((resolve, reject) => {
            this.dbOpen(app, app.SAVE_DB_NAME).then(db => {
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).put(value, key);
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => { db.close(); reject(tx.error); };
            }).catch(reject);
        });
    },

    async dbGet(app, store, key) {
        return new Promise((resolve, reject) => {
            this.dbOpen(app, app.SAVE_DB_NAME).then(db => {
                const tx = db.transaction(store, 'readonly');
                const getReq = tx.objectStore(store).get(key);
                getReq.onsuccess = () => { db.close(); resolve(getReq.result); };
                getReq.onerror = () => { db.close(); reject(getReq.error); };
            }).catch(reject);
        });
    },

    async dbDelete(app, store, key) {
        return new Promise((resolve, reject) => {
            this.dbOpen(app, app.SAVE_DB_NAME).then(db => {
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).delete(key);
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => { db.close(); reject(tx.error); };
            }).catch(reject);
        });
    }
};

window.YAW_STORAGE = YAW_STORAGE;
