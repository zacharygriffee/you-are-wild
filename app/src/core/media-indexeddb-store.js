/**
 * YOU ARE WILD INDEXEDDB MEDIA STORE
 * Reference browser payload store for content-addressed media.
 */

class YAWIndexedDBMediaStore {
    constructor(options = {}) {
        this.id = String(options.id || 'indexeddb');
        this.db = options.db || null;
        this.contract = options.contract || YAW_MEDIA_CONTRACT;
        this.urlApi = options.urlApi || (typeof URL !== 'undefined' ? URL : null);
        this.clock = options.clock || (() => Date.now());
        this.leases = new Map();
        this.STORES = {
            payloads: 'mediaPayloads',
            staging: 'mediaStaging'
        };
    }

    attachDatabase(db) {
        this.db = db || null;
        return this;
    }

    capabilities() {
        return {
            source: false,
            store: true,
            lease: true,
            stagedWrites: true,
            contentAddressed: true,
            offline: true,
            rangeReads: false,
            directLease: false
        };
    }

    async health() {
        return { ok: Boolean(this.db), providerId: this.id, capabilities: this.capabilities() };
    }

    async estimate() {
        const estimate = typeof navigator !== 'undefined' && navigator.storage?.estimate
            ? await navigator.storage.estimate()
            : {};
        return {
            usage: Number.isFinite(Number(estimate.usage)) ? Number(estimate.usage) : null,
            quota: Number.isFinite(Number(estimate.quota)) ? Number(estimate.quota) : null
        };
    }

    _requireDb() {
        if (!this.db) throw this.contract.error('store_unavailable', 'IndexedDB media storage is not initialized');
        return this.db;
    }

    _request(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || this.contract.error('storage_failed', 'Media database request failed'));
        });
    }

    _transactionDone(tx) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || this.contract.error('storage_failed', 'Media database transaction failed'));
            tx.onabort = () => reject(tx.error || this.contract.error('storage_failed', 'Media database transaction was aborted'));
        });
    }

    _batchId() {
        const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
        const suffix = cryptoApi?.randomUUID ? cryptoApi.randomUUID() : `${this.clock()}-${Math.random().toString(36).slice(2)}`;
        return `media-${suffix}`;
    }

    async beginBatch() {
        return { id: this._batchId(), providerId: this.id, createdAt: this.clock(), status: 'staging' };
    }

    async stage(batch, descriptorValue, payload) {
        const batchId = this.contract.token(batch?.id || batch, 'batch id');
        const descriptor = this.contract.descriptor(descriptorValue);
        const blob = payload instanceof Blob
            ? payload
            : new Blob([payload], { type: descriptor.mimeType });
        if (blob.size !== descriptor.byteLength) {
            throw this.contract.error('size_mismatch', `Media ${descriptor.id} size does not match its descriptor`);
        }
        const bytes = new Uint8Array(await blob.arrayBuffer());
        this.contract.assertSignature(bytes, descriptor.mimeType);
        const hash = await this.contract.sha256(bytes);
        if (hash !== descriptor.hash) {
            throw this.contract.error('integrity_mismatch', `Media ${descriptor.id} failed SHA-256 verification`);
        }
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.staging], 'readwrite');
        await this._request(tx.objectStore(this.STORES.staging).put({
            id: `${batchId}:${descriptor.hash}`,
            batchId,
            hash: descriptor.hash,
            descriptor,
            blob,
            stagedAt: this.clock()
        }));
        await this._transactionDone(tx);
        return { batchId, descriptor };
    }

    async commit(batch) {
        const batchId = this.contract.token(batch?.id || batch, 'batch id');
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.staging, this.STORES.payloads], 'readwrite');
        const staging = tx.objectStore(this.STORES.staging);
        const payloads = tx.objectStore(this.STORES.payloads);
        const records = await this._request(staging.index('batchId').getAll(batchId));
        for (const record of records) {
            const existing = await this._request(payloads.get(record.hash));
            if (!existing) {
                await this._request(payloads.put({
                    hash: record.hash,
                    blob: record.blob,
                    mimeType: record.descriptor.mimeType,
                    byteLength: record.descriptor.byteLength,
                    createdAt: this.clock()
                }));
            }
            await this._request(staging.delete(record.id));
        }
        await this._transactionDone(tx);
        return { batchId, providerId: this.id, hashes: records.map(record => record.hash) };
    }

    async abort(batch) {
        const batchId = this.contract.token(batch?.id || batch, 'batch id');
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.staging], 'readwrite');
        const store = tx.objectStore(this.STORES.staging);
        const records = await this._request(store.index('batchId').getAll(batchId));
        for (const record of records) await this._request(store.delete(record.id));
        await this._transactionDone(tx);
        return records.length;
    }

    async has(hashValue) {
        return Boolean(await this.stat(hashValue));
    }

    async stat(hashValue) {
        const hash = this.contract.hash(hashValue);
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.payloads], 'readonly');
        const record = await this._request(tx.objectStore(this.STORES.payloads).get(hash));
        await this._transactionDone(tx);
        return record ? {
            hash: record.hash,
            mimeType: record.mimeType,
            byteLength: record.byteLength,
            createdAt: record.createdAt,
            providerId: this.id
        } : null;
    }

    async open(hashValue) {
        const hash = this.contract.hash(hashValue);
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.payloads], 'readonly');
        const record = await this._request(tx.objectStore(this.STORES.payloads).get(hash));
        await this._transactionDone(tx);
        if (!record?.blob) throw this.contract.error('media_missing', 'Stored media payload is unavailable', { hash });
        return record.blob;
    }

    async acquire(hashValue) {
        const hash = this.contract.hash(hashValue);
        const current = this.leases.get(hash);
        if (current) {
            current.refs++;
            return { providerId: this.id, hash, url: current.url, release: () => this.release(hash) };
        }
        if (!this.urlApi?.createObjectURL) {
            throw this.contract.error('lease_unavailable', 'Object URL media leases are unavailable');
        }
        const blob = await this.open(hash);
        const url = this.urlApi.createObjectURL(blob);
        this.leases.set(hash, { url, refs: 1 });
        return { providerId: this.id, hash, url, release: () => this.release(hash) };
    }

    release(hashValue) {
        const hash = this.contract.hash(hashValue);
        const current = this.leases.get(hash);
        if (!current) return false;
        current.refs--;
        if (current.refs <= 0) {
            try { this.urlApi?.revokeObjectURL?.(current.url); } catch (error) {}
            this.leases.delete(hash);
        }
        return true;
    }

    releaseAll() {
        for (const current of this.leases.values()) {
            try { this.urlApi?.revokeObjectURL?.(current.url); } catch (error) {}
        }
        this.leases.clear();
    }

    async remove(hashValue) {
        const hash = this.contract.hash(hashValue);
        while (this.leases.has(hash)) this.release(hash);
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.payloads], 'readwrite');
        await this._request(tx.objectStore(this.STORES.payloads).delete(hash));
        await this._transactionDone(tx);
        return true;
    }

    async cleanupStaging(maxAgeMs = 24 * 60 * 60 * 1000) {
        const cutoff = this.clock() - Math.max(0, Number(maxAgeMs) || 0);
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.staging], 'readwrite');
        const store = tx.objectStore(this.STORES.staging);
        const records = await this._request(store.getAll());
        let removed = 0;
        for (const record of records) {
            if (Number(record.stagedAt) > cutoff) continue;
            await this._request(store.delete(record.id));
            removed++;
        }
        await this._transactionDone(tx);
        return removed;
    }

    close() {
        this.releaseAll();
        this.db = null;
    }
}

if (typeof window !== 'undefined') window.YAWIndexedDBMediaStore = YAWIndexedDBMediaStore;
