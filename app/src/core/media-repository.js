/**
 * YOU ARE WILD MEDIA REPOSITORY
 * Provider-neutral source, store, catalog, ownership, and lease coordinator.
 */

class YAWMediaRepository {
    constructor(options = {}) {
        this.contract = options.contract || YAW_MEDIA_CONTRACT;
        this.db = options.db || null;
        this.sources = new Map();
        this.stores = new Map();
        this.providerOwners = new Map();
        this.ownerProviders = new Map();
        this.activeLeases = new Map();
        this.ownerLeases = new Map();
        this.sequence = 0;
        this.logger = options.logger || null;
        this.STORES = {
            catalog: 'mediaCatalog',
            refs: 'mediaRefs',
            owners: 'mediaOwners'
        };
        const indexeddb = options.indexeddbStore || new YAWIndexedDBMediaStore({ contract: this.contract, db: this.db });
        const http = options.httpSource || new YAWHttpMediaSource({ contract: this.contract });
        this.registerStore(indexeddb, { ownerId: 'core' });
        this.registerSource(http, { ownerId: 'core' });
    }

    attachDatabase(db) {
        this.db = db || null;
        const indexeddb = this.stores.get('indexeddb');
        indexeddb?.attachDatabase?.(this.db);
        return this;
    }

    setLogger(logger) {
        this.logger = typeof logger === 'function' ? logger : null;
    }

    diagnostic(code, details = {}, type = 'discovery') {
        const safe = this.contract.serializable(details, {});
        if (this.logger) {
            try { this.logger({ code: String(code), details: safe, type }); } catch (error) {}
            return;
        }
        if (typeof App !== 'undefined' && Array.isArray(App.log)) {
            const detail = safe.message || safe.providerId || safe.ownerId || '';
            App.log.push({ text: `[Media] ${String(code)}${detail ? `: ${String(detail).slice(0, 300)}` : ''}`, type });
            App.renderLog?.();
        }
    }

    _providerOwner(id, ownerValue = 'core') {
        const ownerId = this.contract.token(ownerValue || 'core', 'provider owner id');
        const current = this.providerOwners.get(id);
        if (current && current !== ownerId) {
            throw this.contract.error('provider_owned', `Media provider ${id} is already registered by another owner`);
        }
        if (!current) {
            this.providerOwners.set(id, ownerId);
            if (!this.ownerProviders.has(ownerId)) this.ownerProviders.set(ownerId, new Set());
            this.ownerProviders.get(ownerId).add(id);
        }
        return ownerId;
    }

    registerSource(provider, options = {}) {
        const id = this.contract.token(provider?.id, 'source provider id');
        if (typeof provider.acquire !== 'function') throw this.contract.error('invalid_provider', `Media source ${id} must implement acquire()`);
        this._providerOwner(id, options.ownerId);
        const existing = this.sources.get(id);
        if (existing && existing !== provider) throw this.contract.error('provider_registered', `Media source ${id} is already registered`);
        this.sources.set(id, provider);
        return id;
    }

    registerStore(provider, options = {}) {
        const id = this.contract.token(provider?.id, 'store provider id');
        for (const method of ['beginBatch', 'stage', 'commit', 'abort', 'has', 'stat', 'open', 'acquire', 'release', 'remove']) {
            if (typeof provider[method] !== 'function') throw this.contract.error('invalid_provider', `Media store ${id} must implement ${method}()`);
        }
        this._providerOwner(id, options.ownerId);
        const existing = this.stores.get(id);
        if (existing && existing !== provider) throw this.contract.error('provider_registered', `Media store ${id} is already registered`);
        this.stores.set(id, provider);
        return id;
    }

    registerEndpointStore(options = {}) {
        const provider = new YAWEndpointMediaStore({ contract: this.contract, ...options });
        this.registerStore(provider, { ownerId: options.ownerId || 'core' });
        if (provider.capabilities().source) this.registerSource(provider, { ownerId: options.ownerId || 'core' });
        return provider.id;
    }

    registerAdapter(ownerValue, providerValue, adapter) {
        const ownerId = this.contract.token(ownerValue, 'provider owner id');
        const id = this.contract.token(providerValue, 'media provider id');
        if (!adapter || typeof adapter !== 'object' || Array.isArray(adapter)) {
            throw this.contract.error('invalid_provider', `Media provider ${id} must be an adapter object`);
        }
        if (adapter.id != null && this.contract.token(adapter.id, 'media provider id') !== id) {
            throw this.contract.error('invalid_provider', 'Media provider adapter id must match its registered id');
        }
        if (typeof adapter.health !== 'function' || typeof adapter.capabilities !== 'function') {
            throw this.contract.error('invalid_provider', `Media provider ${id} must implement health() and capabilities()`);
        }
        const capabilities = adapter.capabilities();
        if (!capabilities || typeof capabilities !== 'object' || typeof capabilities.then === 'function') {
            throw this.contract.error('invalid_provider', `Media provider ${id} capabilities must be a synchronous object`);
        }
        const providesSource = capabilities.source === true;
        const providesStore = capabilities.store === true;
        if (!providesSource && !providesStore) {
            throw this.contract.error('invalid_provider', `Media provider ${id} must advertise a source or store capability`);
        }
        const provider = { id };
        for (const method of [
            'capabilities', 'health', 'estimate', 'acquire', 'beginBatch', 'stage',
            'commit', 'abort', 'has', 'stat', 'open', 'release', 'remove',
            'cleanupStaging', 'close'
        ]) {
            if (typeof adapter[method] === 'function') provider[method] = adapter[method].bind(adapter);
        }
        if (providesStore) this.registerStore(provider, { ownerId });
        if (providesSource) this.registerSource(provider, { ownerId });
        return {
            id,
            ownerId,
            capabilities: this.contract.serializable(capabilities, {})
        };
    }

    unregisterProvider(ownerValue, providerValue) {
        const ownerId = this.contract.token(ownerValue, 'provider owner id');
        const id = this.contract.token(providerValue, 'media provider id');
        if (this.providerOwners.get(id) !== ownerId || ownerId === 'core') return false;
        for (const record of [...this.activeLeases.values()]) {
            if (record.providerId === id) this.release(record.ownerId, record.leaseId);
        }
        const providers = new Set([this.sources.get(id), this.stores.get(id)].filter(Boolean));
        this.sources.delete(id);
        this.stores.delete(id);
        this.providerOwners.delete(id);
        const owned = this.ownerProviders.get(ownerId);
        owned?.delete(id);
        if (owned && owned.size === 0) this.ownerProviders.delete(ownerId);
        for (const provider of providers) {
            try { provider.close?.(); } catch (error) {}
        }
        return true;
    }

    unregisterProviderOwner(ownerValue) {
        const ownerId = this.contract.token(ownerValue, 'provider owner id');
        if (ownerId === 'core') return 0;
        const ids = [...(this.ownerProviders.get(ownerId) || [])];
        return ids.reduce((count, id) => count + (this.unregisterProvider(ownerId, id) ? 1 : 0), 0);
    }

    async providerState() {
        const states = [];
        for (const provider of new Set([...this.sources.values(), ...this.stores.values()])) {
            try {
                const health = await provider.health();
                states.push({
                    ok: health?.ok === true,
                    providerId: provider.id,
                    status: Number.isInteger(Number(health?.status)) ? Number(health.status) : null,
                    code: health?.code ? String(health.code).slice(0, 120) : '',
                    capabilities: this.contract.serializable(provider.capabilities?.() || {}, {})
                });
            } catch (error) {
                let capabilities = {};
                try { capabilities = this.contract.serializable(provider.capabilities?.() || {}, {}); } catch (capabilityError) {}
                states.push({
                    ok: false,
                    providerId: provider.id,
                    code: String(error?.code || 'provider_unavailable').slice(0, 120),
                    capabilities
                });
            }
        }
        return states;
    }

    async resolveStore(preferred = 'auto') {
        const requested = String(preferred || 'auto');
        if (requested !== 'auto') {
            const provider = this.stores.get(requested);
            if (!provider) throw this.contract.error('store_not_found', `Media store ${requested} is not registered`);
            const health = await provider.health();
            if (!health.ok) throw this.contract.error('store_unavailable', `Media store ${requested} is unavailable`);
            return provider;
        }
        const ordered = [this.stores.get('indexeddb'), ...[...this.stores.values()].filter(provider => provider.id !== 'indexeddb')].filter(Boolean);
        for (const provider of ordered) {
            try {
                if ((await provider.health()).ok) return provider;
            } catch (error) {}
        }
        throw this.contract.error('store_unavailable', 'No media store is available');
    }

    resolveSource(id = 'http') {
        const source = this.sources.get(String(id || 'http'));
        if (!source) throw this.contract.error('source_not_found', `Media source ${id} is not registered`);
        return source;
    }

    _requireDb() {
        if (!this.db) throw this.contract.error('catalog_unavailable', 'Media catalog is not initialized');
        return this.db;
    }

    _request(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || this.contract.error('catalog_failed', 'Media catalog request failed'));
        });
    }

    _transactionDone(tx) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || this.contract.error('catalog_failed', 'Media catalog transaction failed'));
            tx.onabort = () => reject(tx.error || this.contract.error('catalog_failed', 'Media catalog transaction was aborted'));
        });
    }

    _catalogId(ownerId, resourceId) {
        return `${this.contract.token(ownerId, 'owner id')}:${this.contract.token(resourceId, 'resource id')}`;
    }

    async listOwner(ownerValue) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.catalog], 'readonly');
        const records = await this._request(tx.objectStore(this.STORES.catalog).index('ownerId').getAll(ownerId));
        await this._transactionDone(tx);
        return records.map(record => this.contract.serializable(record));
    }

    async metadata(ownerValue, resourceValue) {
        const id = this._catalogId(ownerValue, resourceValue);
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.catalog], 'readonly');
        const record = await this._request(tx.objectStore(this.STORES.catalog).get(id));
        await this._transactionDone(tx);
        return record ? this.contract.serializable(record) : null;
    }

    async ownerMetadata(ownerValue) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.owners], 'readonly');
        const record = await this._request(tx.objectStore(this.STORES.owners).get(ownerId));
        await this._transactionDone(tx);
        return record ? this.contract.serializable(record) : null;
    }

    async installFromSource(ownerValue, resources, options = {}) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        if (!Array.isArray(resources) || !resources.length) throw this.contract.error('invalid_resources', 'Media install requires at least one resource');
        const source = this.resolveSource(options.sourceId || 'http');
        const store = await this.resolveStore(options.storeId || 'auto');
        const batch = await store.beginBatch({ signal: options.signal });
        const descriptors = [];
        this.diagnostic('install_started', { ownerId, providerId: store.id, count: resources.length });
        try {
            for (let index = 0; index < resources.length; index++) {
                if (options.signal?.aborted) throw this.contract.error('aborted', 'Media installation was canceled');
                const acquired = await source.acquire(resources[index], {
                    signal: options.signal,
                    maxBytes: options.maxBytes,
                    onProgress: progress => options.onProgress?.({ phase: 'download', index, count: resources.length, ...progress })
                });
                await store.stage(batch, acquired.descriptor, acquired.blob, { signal: options.signal, maxBytes: options.maxBytes });
                descriptors.push(acquired.descriptor);
                options.onProgress?.({ phase: 'staged', index: index + 1, count: resources.length });
            }
            await store.commit(batch, { signal: options.signal });
            await this.replaceOwnerCatalog(ownerId, store.id, descriptors, { ownerMetadata: options.ownerMetadata });
            this.diagnostic('install_complete', { ownerId, providerId: store.id, count: descriptors.length });
            return { ownerId, providerId: store.id, resources: await this.listOwner(ownerId) };
        } catch (error) {
            try { await store.abort(batch, { signal: options.signal }); } catch (abortError) {}
            this.diagnostic('install_failed', { ownerId, providerId: store.id, message: error.code || error.message || 'media_error' }, 'error');
            throw error;
        }
    }

    async replaceOwnerCatalog(ownerValue, providerValue, descriptorValues, options = {}) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        this.releaseOwner(ownerId);
        const providerId = this.contract.token(providerValue, 'provider id');
        const provider = this.stores.get(providerId);
        if (!provider) throw this.contract.error('store_not_found', `Media store ${providerId} is not registered`);
        const descriptors = descriptorValues.map(value => this.contract.descriptor(value));
        const retainedPayloads = new Set(descriptors.map(descriptor => `${providerId}:${descriptor.hash}`));
        const ids = new Set();
        for (const descriptor of descriptors) {
            if (ids.has(descriptor.id)) throw this.contract.error('duplicate_resource', `Duplicate media resource ${descriptor.id}`);
            ids.add(descriptor.id);
            if (!(await provider.has(descriptor.hash))) throw this.contract.error('media_missing', `Media payload ${descriptor.id} was not committed`);
        }

        const db = this._requireDb();
        const stores = [this.STORES.catalog, this.STORES.refs];
        if (options.ownerMetadata !== undefined) stores.push(this.STORES.owners);
        const tx = db.transaction(stores, 'readwrite');
        const catalog = tx.objectStore(this.STORES.catalog);
        const refs = tx.objectStore(this.STORES.refs);
        const previous = await this._request(catalog.index('ownerId').getAll(ownerId));
        const previousById = new Map(previous.map(record => [record.id, record]));
        const nextById = new Map(descriptors.map(descriptor => [this._catalogId(ownerId, descriptor.id), descriptor]));
        const removals = [];

        for (const record of previous) {
            const next = nextById.get(record.id);
            if (next && next.hash === record.hash && providerId === record.providerId) continue;
            await this._request(catalog.delete(record.id));
            const refId = `${record.providerId}:${record.hash}`;
            const ref = await this._request(refs.get(refId));
            if (ref) {
                ref.count = Math.max(0, Number(ref.count || 0) - 1);
                if (ref.count === 0) {
                    await this._request(refs.delete(refId));
                    removals.push({ providerId: record.providerId, hash: record.hash });
                } else {
                    await this._request(refs.put(ref));
                }
            }
        }

        for (const descriptor of descriptors) {
            const id = this._catalogId(ownerId, descriptor.id);
            const previousRecord = previousById.get(id);
            if (!previousRecord || previousRecord.hash !== descriptor.hash || previousRecord.providerId !== providerId) {
                const refId = `${providerId}:${descriptor.hash}`;
                const ref = await this._request(refs.get(refId)) || { id: refId, providerId, hash: descriptor.hash, count: 0 };
                ref.count = Number(ref.count || 0) + 1;
                ref.updatedAt = Date.now();
                await this._request(refs.put(ref));
            }
            await this._request(catalog.put({
                id,
                ownerId,
                resourceId: descriptor.id,
                providerId,
                hash: descriptor.hash,
                descriptor,
                installedAt: Date.now(),
                state: 'ready'
            }));
        }
        if (options.ownerMetadata !== undefined) {
            const ownerMetadata = this.contract.serializable(options.ownerMetadata, null);
            if (!ownerMetadata || typeof ownerMetadata !== 'object' || Array.isArray(ownerMetadata)) {
                throw this.contract.error('invalid_owner_metadata', 'Media owner metadata must be serializable object data');
            }
            await this._request(tx.objectStore(this.STORES.owners).put({ ...ownerMetadata, ownerId }));
        }
        await this._transactionDone(tx);

        for (const removal of removals) {
            if (retainedPayloads.has(`${removal.providerId}:${removal.hash}`)) continue;
            const removalStore = this.stores.get(removal.providerId);
            try { await removalStore?.remove(removal.hash); } catch (error) {
                this.diagnostic('cleanup_failed', { providerId: removal.providerId, message: error.code || 'media_error' }, 'error');
            }
        }
        return descriptors.length;
    }

    async acquire(ownerValue, resourceValue, options = {}) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        const record = await this.metadata(ownerId, resourceValue);
        if (!record) throw this.contract.error('resource_not_found', `Media resource ${resourceValue} is not installed`);
        const provider = this.stores.get(record.providerId);
        if (!provider) throw this.contract.error('store_not_found', `Media store ${record.providerId} is not registered`);
        let lease;
        try {
            lease = await provider.acquire(record.hash, options);
        } catch (error) {
            if (options.fallbackProviderId && options.fallbackProviderId !== record.providerId) {
                const fallback = this.stores.get(options.fallbackProviderId);
                if (fallback && await fallback.has(record.hash)) {
                    lease = await fallback.acquire(record.hash, options);
                    this.diagnostic('lease_fallback', { ownerId, providerId: fallback.id });
                }
            }
            if (!lease) throw error;
        }
        const leaseId = `lease-${++this.sequence}`;
        const leaseRecord = { leaseId, ownerId, providerId: lease.providerId, hash: record.hash, release: lease.release };
        this.activeLeases.set(leaseId, leaseRecord);
        if (!this.ownerLeases.has(ownerId)) this.ownerLeases.set(ownerId, new Set());
        this.ownerLeases.get(ownerId).add(leaseId);
        return {
            leaseId,
            url: lease.url,
            resourceId: record.resourceId,
            mimeType: record.descriptor.mimeType,
            byteLength: record.descriptor.byteLength,
            width: record.descriptor.width,
            height: record.descriptor.height,
            providerId: lease.providerId
        };
    }

    release(ownerValue, leaseValue) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        const leaseId = String(leaseValue || '');
        const record = this.activeLeases.get(leaseId);
        if (!record || record.ownerId !== ownerId) return false;
        try { record.release?.(); } catch (error) {}
        this.activeLeases.delete(leaseId);
        const ownerSet = this.ownerLeases.get(ownerId);
        ownerSet?.delete(leaseId);
        if (ownerSet && ownerSet.size === 0) this.ownerLeases.delete(ownerId);
        return true;
    }

    releaseOwner(ownerValue) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        const leases = [...(this.ownerLeases.get(ownerId) || [])];
        leases.forEach(leaseId => this.release(ownerId, leaseId));
        return leases.length;
    }

    async removeOwner(ownerValue) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        this.releaseOwner(ownerId);
        const db = this._requireDb();
        const tx = db.transaction([this.STORES.catalog, this.STORES.refs, this.STORES.owners], 'readwrite');
        const catalog = tx.objectStore(this.STORES.catalog);
        const refs = tx.objectStore(this.STORES.refs);
        const records = await this._request(catalog.index('ownerId').getAll(ownerId));
        const removals = [];
        for (const record of records) {
            await this._request(catalog.delete(record.id));
            const refId = `${record.providerId}:${record.hash}`;
            const ref = await this._request(refs.get(refId));
            if (!ref) continue;
            ref.count = Math.max(0, Number(ref.count || 0) - 1);
            if (ref.count === 0) {
                await this._request(refs.delete(refId));
                removals.push({ providerId: record.providerId, hash: record.hash });
            } else {
                await this._request(refs.put(ref));
            }
        }
        await this._request(tx.objectStore(this.STORES.owners).delete(ownerId));
        await this._transactionDone(tx);
        for (const removal of removals) {
            try { await this.stores.get(removal.providerId)?.remove(removal.hash); } catch (error) {
                this.diagnostic('cleanup_failed', { providerId: removal.providerId, message: error.code || 'media_error' }, 'error');
            }
        }
        return records.length;
    }

    async repairOwner(ownerValue) {
        const ownerId = this.contract.token(ownerValue, 'owner id');
        const [records, ownerMetadata] = await Promise.all([
            this.listOwner(ownerId),
            this.ownerMetadata(ownerId)
        ]);
        const installedIds = new Set(records.map(record => record.resourceId));
        const expectedIds = Array.isArray(ownerMetadata?.resourceIds) ? ownerMetadata.resourceIds : [];
        const missing = [];
        for (const resourceId of expectedIds) {
            if (!installedIds.has(resourceId)) missing.push(resourceId);
        }
        for (const record of records) {
            const provider = this.stores.get(record.providerId);
            if ((!provider || !(await provider.has(record.hash))) && !missing.includes(record.resourceId)) missing.push(record.resourceId);
        }
        const expectedCount = Number.isSafeInteger(Number(ownerMetadata?.resourceCount))
            ? Number(ownerMetadata.resourceCount)
            : records.length;
        return {
            ownerId,
            ok: missing.length === 0 && records.length === expectedCount,
            missing,
            catalogCount: records.length,
            expectedCount
        };
    }

    async cleanup() {
        let staged = 0;
        for (const provider of this.stores.values()) {
            if (provider.cleanupStaging) staged += await provider.cleanupStaging();
        }
        return { staged };
    }

    close() {
        for (const ownerId of [...this.ownerLeases.keys()]) this.releaseOwner(ownerId);
        for (const provider of new Set([...this.sources.values(), ...this.stores.values()])) provider.close?.();
        this.db = null;
    }
}

const YAW_MEDIA_REPOSITORY = new YAWMediaRepository();

if (typeof window !== 'undefined') {
    window.YAWMediaRepository = YAWMediaRepository;
    window.YAW_MEDIA_REPOSITORY = YAW_MEDIA_REPOSITORY;
}
