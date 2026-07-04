
/**
 * YOU ARE WILD MODULE MANAGER
 * IndexedDB-based module storage with hook system
 */

const MODULE_SYSTEM = {
    DB_NAME: 'YAW_Modules',
    LEGACY_DB_NAME: 'FFFme_Modules',
    DB_VERSION: 1,
    GAME_VERSION: '0.10.0',
    PACKAGE_TYPE: 'yaw-module',
    PACKAGE_VERSION: 1,
    TRUST_BOUNDARY: 'trusted-local',
    CONTENT_RATINGS: ['safe', 'mature', 'adult'],
    KNOWN_PERMISSIONS: ['ui.read', 'world:add_biome', 'content:add_species', 'content:add_item'],
    db: null,
    
    // Hooks registry
    hooks: {
        onMapGenerate: [],
        onEncounterStart: [],
        onCombatAction: [],
        onPlayerMove: [],
        onGameLoad: [],
        onGameSave: [],
        onTick: []
    },
    
    // Active modules
    activeModules: new Map(),
    ownedContributions: new Map(),
    loadingModuleId: null,

    _request(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
        });
    },

    _transactionDone(tx) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
            tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
        });
    },

    _requireDb() {
        if (!this.db) {
            throw new Error('Module DB not initialized');
        }
        return this.db;
    },

    _normalizeStringList(value, fieldName) {
        if (value === undefined) return [];
        if (!Array.isArray(value)) {
            throw new Error(`Module manifest ${fieldName} must be an array`);
        }
        const normalized = [];
        for (const item of value) {
            if (typeof item !== 'string') {
                throw new Error(`Module manifest ${fieldName} entries must be strings`);
            }
            const token = item.trim();
            if (!token) continue;
            if (!/^[a-zA-Z0-9_.:-]+$/.test(token)) {
                throw new Error(`Module manifest ${fieldName} entries must use letters, numbers, underscores, hyphens, dots, or colons`);
            }
            if (!normalized.includes(token)) normalized.push(token);
        }
        return normalized;
    },

    _normalizePermissions(value) {
        const permissions = this._normalizeStringList(value, 'permissions');
        for (const permission of permissions) {
            if (!this.KNOWN_PERMISSIONS.includes(permission)) {
                throw new Error(`Module manifest permissions contains unknown permission ${permission}`);
            }
        }
        return permissions;
    },

    _normalizeGameVersion(value, fieldName = 'minGameVersion') {
        const text = String(value || '').trim();
        if (!text) return '';
        const normalized = text.replace(/^v/i, '');
        if (!/^\d+(?:\.\d+){0,2}$/.test(normalized)) {
            throw new Error(`Module manifest ${fieldName} must be a numeric version like 0.10.0`);
        }
        return normalized;
    },

    _versionParts(version) {
        const normalized = this._normalizeGameVersion(version, 'gameVersion');
        return normalized.split('.').map(part => Number(part || 0)).concat([0, 0, 0]).slice(0, 3);
    },

    _compareVersions(left, right) {
        const a = this._versionParts(left);
        const b = this._versionParts(right);
        for (let i = 0; i < 3; i++) {
            if (a[i] > b[i]) return 1;
            if (a[i] < b[i]) return -1;
        }
        return 0;
    },

    _currentGameVersion() {
        return String(this.GAME_VERSION || '0.0.0').trim();
    },

    _normalizeManifest(manifest) {
        if (!manifest || typeof manifest !== 'object') {
            throw new Error('Module manifest is required');
        }
        const id = String(manifest.id || '').trim();
        const name = String(manifest.name || '').trim();
        const version = String(manifest.version || '').trim();
        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
            throw new Error('Module manifest id must use letters, numbers, underscores, or hyphens');
        }
        if (!name) throw new Error('Module manifest name is required');
        if (!version) throw new Error('Module manifest version is required');

        const contentRating = String(manifest.contentRating || 'safe').trim().toLowerCase();
        if (!this.CONTENT_RATINGS.includes(contentRating)) {
            throw new Error(`Module manifest contentRating must be one of: ${this.CONTENT_RATINGS.join(', ')}`);
        }
        const trustBoundary = String(manifest.trustBoundary || this.TRUST_BOUNDARY).trim();
        if (trustBoundary !== this.TRUST_BOUNDARY) {
            throw new Error(`Module manifest trustBoundary must be ${this.TRUST_BOUNDARY}`);
        }

        const dependencies = this._normalizeStringList(manifest.dependencies, 'dependencies');
        if (dependencies.includes(id)) {
            throw new Error('Module manifest dependencies cannot include the module id');
        }
        const minGameVersion = this._normalizeGameVersion(manifest.minGameVersion || manifest.gameVersion || '', manifest.minGameVersion ? 'minGameVersion' : 'gameVersion');

        return {
            ...manifest,
            id,
            name,
            version,
            type: String(manifest.type || 'feature_pack').trim() || 'feature_pack',
            contentRating,
            trustBoundary,
            permissions: this._normalizePermissions(manifest.permissions),
            dependencies,
            minGameVersion
        };
    },

    _normalizeModulePackage(packageData) {
        if (!packageData || typeof packageData !== 'object') {
            throw new Error('Module package data is required');
        }
        if (Object.prototype.hasOwnProperty.call(packageData, 'manifest')) {
            return packageData;
        }

        const packageType = String(packageData.packageType || '').trim();
        if (packageType !== this.PACKAGE_TYPE) {
            throw new Error(`Module package type must be ${this.PACKAGE_TYPE}`);
        }
        const packageVersion = Number(packageData.packageVersion ?? 1);
        if (!Number.isInteger(packageVersion) || packageVersion !== this.PACKAGE_VERSION) {
            throw new Error(`Module package version must be ${this.PACKAGE_VERSION}`);
        }
        if (!packageData.module || typeof packageData.module !== 'object' || Array.isArray(packageData.module)) {
            throw new Error('Module package module payload is required');
        }
        if (packageData.packageId !== undefined) {
            const packageId = String(packageData.packageId || '').trim();
            const manifestId = String(packageData.module.manifest?.id || '').trim();
            if (packageId && manifestId && packageId !== manifestId) {
                throw new Error('Module package id must match manifest id');
            }
        }
        if (packageData.trustBoundary !== undefined) {
            const trustBoundary = String(packageData.trustBoundary || '').trim();
            if (trustBoundary !== this.TRUST_BOUNDARY) {
                throw new Error(`Module package trustBoundary must be ${this.TRUST_BOUNDARY}`);
            }
        }
        if (packageData.gameVersion !== undefined) {
            this._normalizeGameVersion(packageData.gameVersion, 'gameVersion');
        }
        return packageData.module;
    },

    createModulePackage(moduleData) {
        const validated = this._validateModuleData(moduleData);
        return {
            packageType: this.PACKAGE_TYPE,
            packageVersion: this.PACKAGE_VERSION,
            packageId: validated.manifest.id,
            gameVersion: this._currentGameVersion(),
            trustBoundary: this.TRUST_BOUNDARY,
            module: {
                manifest: validated.manifest,
                code: validated.code,
                assets: validated.assets
            }
        };
    },

    _validateModuleData(moduleData) {
        if (!moduleData || typeof moduleData !== 'object') {
            throw new Error('Module data is required');
        }
        const manifest = this._normalizeManifest(moduleData.manifest);
        const code = moduleData.code === undefined ? '' : String(moduleData.code);
        if (moduleData.code !== undefined && typeof moduleData.code !== 'string') {
            throw new Error('Module code must be a string');
        }
        this._assertModuleCodeSyntax(code, manifest.id);
        const assets = this._normalizeAssets(moduleData.assets);
        return {
            manifest,
            code,
            assets
        };
    },

    _assertModuleCodeSyntax(code, moduleId = 'module') {
        try {
            new Function('runtimeContext', `
                with(runtimeContext) {
                    ${code}
                }
            `);
        } catch (e) {
            throw new Error(`Module ${moduleId} code failed syntax validation: ${e.message || e}`);
        }
    },

    _normalizeAssets(assets) {
        if (assets === undefined) return {};
        if (!assets || typeof assets !== 'object' || Array.isArray(assets)) {
            throw new Error('Module assets must be a serializable object');
        }
        this._assertSerializableData(assets, 'Module assets');
        const copied = JSON.parse(JSON.stringify(assets));
        const normalized = {};
        for (const [key, value] of Object.entries(copied)) {
            const assetKey = this._normalizeAssetKey(key);
            if (Object.prototype.hasOwnProperty.call(normalized, assetKey)) {
                throw new Error(`Duplicate module asset key: ${assetKey}`);
            }
            normalized[assetKey] = value;
        }
        return normalized;
    },

    _normalizeAssetKey(key) {
        const normalized = String(key || '').trim();
        if (!normalized || !/^[a-zA-Z0-9_.:-]+$/.test(normalized)) {
            throw new Error('Module asset keys must use letters, numbers, underscores, hyphens, dots, or colons');
        }
        return normalized;
    },

    _assetRecordId(moduleId, key) {
        return `${moduleId}:${key}`;
    },

    _assetRecordsForModule(moduleId, assets = {}) {
        return Object.entries(assets).map(([key, value]) => {
            const assetKey = this._normalizeAssetKey(key);
            return {
                id: this._assetRecordId(moduleId, assetKey),
                moduleId,
                key: assetKey,
                value: JSON.parse(JSON.stringify(value))
            };
        });
    },

    _normalizeSettingKey(key) {
        const normalized = String(key || '').trim();
        if (!normalized || !/^[a-zA-Z0-9_.:-]+$/.test(normalized)) {
            throw new Error('Module setting key must use letters, numbers, underscores, hyphens, dots, or colons');
        }
        return normalized;
    },

    _normalizeSettingValue(value) {
        try {
            this._assertSerializableData(value, 'Module setting value');
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            throw new Error('Module setting value must be serializable data');
        }
    },

    _gameVersionBlockReason(manifest) {
        const minGameVersion = String(manifest?.minGameVersion || '').trim();
        if (!minGameVersion) return null;
        const current = this._currentGameVersion();
        if (this._compareVersions(current, minGameVersion) < 0) {
            return `Module ${manifest.id || 'module'} requires game version ${minGameVersion} or newer`;
        }
        return null;
    },

    _assertGameVersionCompatible(manifest) {
        const reason = this._gameVersionBlockReason(manifest);
        if (reason) throw new Error(reason);
    },

    _contentRatingTier(contentRating) {
        return { safe: 0, mature: 1, adult: 2 }[String(contentRating || 'safe').trim().toLowerCase()] ?? 0;
    },

    _currentContentPolicy() {
        if (typeof CONTENT === 'undefined' || !CONTENT?.preferences) {
            return { maxTier: 0, explicitDescriptions: false };
        }
        return {
            maxTier: Math.max(0, Math.min(2, Number(CONTENT.preferences.maxTier) || 0)),
            explicitDescriptions: !!CONTENT.preferences.explicitDescriptions
        };
    },

    _contentRatingBlockReason(manifest) {
        const rating = String(manifest?.contentRating || 'safe').trim().toLowerCase();
        const requiredTier = this._contentRatingTier(rating);
        const policy = this._currentContentPolicy();
        if (requiredTier > policy.maxTier) {
            return `Module contentRating ${rating} requires a higher content tier`;
        }
        if (rating === 'adult' && !policy.explicitDescriptions) {
            return 'Module contentRating adult requires explicit descriptions to be enabled';
        }
        return null;
    },

    _assertContentRatingEnabled(manifest) {
        const reason = this._contentRatingBlockReason(manifest);
        if (reason) throw new Error(reason);
    },

    async _assertDependenciesEnabled(moduleId, manifest, store) {
        for (const dependencyId of manifest.dependencies || []) {
            const dependency = await this._request(store.get(dependencyId));
            if (!dependency) {
                throw new Error(`Module ${moduleId} requires missing dependency ${dependencyId}`);
            }
            if (!dependency.enabled) {
                throw new Error(`Module ${moduleId} requires dependency ${dependencyId} to be enabled`);
            }
        }
    },

    async _assertNoDependencyCycle(moduleId, dependencies, store) {
        const rootDependencies = this._normalizeStringList(dependencies, 'dependencies');
        const visiting = new Set();
        const visited = new Set();
        const dependencyCache = new Map([[moduleId, rootDependencies]]);

        const getDependencies = async (id) => {
            if (dependencyCache.has(id)) return dependencyCache.get(id);
            const module = await this._request(store.get(id));
            if (!module) {
                dependencyCache.set(id, []);
                return [];
            }
            const manifest = this._normalizeManifest(module.manifest);
            dependencyCache.set(id, manifest.dependencies || []);
            return manifest.dependencies || [];
        };

        const visit = async (id, path = []) => {
            if (visiting.has(id)) {
                throw new Error(`Module dependency cycle detected: ${path.concat(id).join(' -> ')}`);
            }
            if (visited.has(id)) return;

            visiting.add(id);
            const dependenciesForId = await getDependencies(id);
            for (const dependencyId of dependenciesForId) {
                await visit(dependencyId, path.concat(id));
            }
            visiting.delete(id);
            visited.add(id);
        };

        await visit(moduleId);
    },

    _assertKnownHookEvent(event) {
        if (!Object.prototype.hasOwnProperty.call(this.hooks, event)) {
            throw new Error(`Unknown module hook event: ${event}`);
        }
    },

    _normalizeHookPriority(priority) {
        const normalized = Number(priority || 0);
        if (!Number.isFinite(normalized)) {
            throw new Error('Hook priority must be a finite number');
        }
        return normalized;
    },
    
    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Module DB initialized');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Modules store
                if (!db.objectStoreNames.contains('modules')) {
                    const moduleStore = db.createObjectStore('modules', { keyPath: 'id' });
                    moduleStore.createIndex('type', 'type', { unique: false });
                    moduleStore.createIndex('enabled', 'enabled', { unique: false });
                }
                
                // Assets store
                if (!db.objectStoreNames.contains('assets')) {
                    const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
                    assetStore.createIndex('moduleId', 'moduleId', { unique: false });
                }
                
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    },

    closeDatabase() {
        if (this.db && typeof this.db.close === 'function') {
            this.db.close();
        }
        this.db = null;
    },
    
    // Register a hook
    registerHook(event, callback, priority = 0, moduleId = null) {
        this._assertKnownHookEvent(event);
        if (typeof callback !== 'function') {
            throw new Error(`Hook callback for ${event} must be a function`);
        }
        const normalizedPriority = this._normalizeHookPriority(priority);
        this.hooks[event].push({
            callback,
            priority: normalizedPriority,
            moduleId: moduleId || this.loadingModuleId || null
        });
        this.hooks[event].sort((a, b) => b.priority - a.priority);
    },
    
    // Execute hooks
    async executeHook(event, ...args) {
        const hooks = [...(this.hooks[event] || [])];
        for (const hook of hooks) {
            try {
                await hook.callback(...args);
            } catch (e) {
                console.error(`Hook error (${event}):`, e);
            }
        }
    },
    
    // Install module from file
    async installModule(moduleData) {
        const packageModuleData = this._normalizeModulePackage(moduleData);
        const validated = this._validateModuleData(packageModuleData);
        this._assertGameVersionCompatible(validated.manifest);
        const module = {
            id: validated.manifest.id,
            manifest: validated.manifest,
            code: validated.code,
            assets: validated.assets,
            enabled: false,
            installedAt: Date.now()
        };
        
        const db = this._requireDb();
        const tx = db.transaction(['modules', 'assets'], 'readwrite');
        const store = tx.objectStore('modules');
        const assetStore = tx.objectStore('assets');
        const previous = await this._request(store.get(module.id));
        await this._assertNoDependencyCycle(module.id, module.manifest.dependencies, store);
        const previousAssets = await this._request(assetStore.index('moduleId').getAll(module.id));
        for (const asset of previousAssets) {
            await this._request(assetStore.delete(asset.id));
        }
        for (const asset of this._assetRecordsForModule(module.id, module.assets)) {
            await this._request(assetStore.put(asset));
        }
        await this._request(store.put(module));
        await this._transactionDone(tx);

        if (previous?.enabled || this.activeModules.has(module.id)) {
            this.unloadModule(module.id);
            module.disabledDependents = await this._disableDependentsOf(module.id);
        }
        
        console.log(`Module installed: ${module.manifest.name}`);
        return module;
    },
    
    // Enable/disable module
    async setModuleEnabled(moduleId, enabled) {
        const db = this._requireDb();
        const tx = db.transaction(['modules'], 'readwrite');
        const store = tx.objectStore('modules');
        
        const module = await this._request(store.get(moduleId));
        if (!module) throw new Error('Module not found');

        if (enabled) {
            const validated = this._validateModuleData(module);
            module.manifest = validated.manifest;
            module.code = validated.code;
            module.assets = validated.assets;
            this._assertGameVersionCompatible(module.manifest);
            this._assertContentRatingEnabled(module.manifest);
            await this._assertNoDependencyCycle(moduleId, module.manifest.dependencies, store);
            await this._assertDependenciesEnabled(moduleId, module.manifest, store);
            await this._transactionDone(tx);
            try {
                await this.loadModule(module);
            } catch (e) {
                throw e;
            }

            module.enabled = true;
            try {
                await this._storeModuleRecord(module);
            } catch (e) {
                this.unloadModule(moduleId);
                throw e;
            }
            return module;
        }

        module.enabled = false;
        await this._request(store.put(module));
        await this._transactionDone(tx);

        this.unloadModule(moduleId);
        module.disabledDependents = await this._disableDependentsOf(moduleId);
        
        return module;
    },

    async _storeModuleRecord(module) {
        const db = this._requireDb();
        const tx = db.transaction(['modules'], 'readwrite');
        const store = tx.objectStore('modules');
        await this._request(store.put(module));
        await this._transactionDone(tx);
        return module;
    },

    async _disableDependentsOf(moduleId) {
        const modules = await this.getAllModules();
        const disabled = [];
        for (const module of modules) {
            if (!module.enabled || module.id === moduleId) continue;
            const manifest = this._normalizeManifest(module.manifest);
            if (!manifest.dependencies.includes(moduleId)) continue;
            const disabledModule = await this.setModuleEnabled(module.id, false);
            disabled.push(disabledModule);
        }
        return disabled;
    },

    async enforceContentPolicy() {
        const modules = await this.getAllModules();
        const disabled = [];

        for (const module of modules) {
            if (!module.enabled) continue;

            const manifest = this._normalizeManifest(module.manifest);
            const reason = this._contentRatingBlockReason(manifest);
            if (!reason) continue;

            const disabledModule = await this.setModuleEnabled(module.id, false);
            disabled.push({
                ...disabledModule,
                manifest,
                disabledReason: reason
            });
        }

        return disabled;
    },
    
    // Load module into game
    async loadModule(module) {
        try {
            if (this.activeModules.has(module.id)) {
                this.unloadModule(module.id);
            }

            // Create the trusted-local module runtime context. This is not a security boundary.
            const runtimeContext = {
                MODS: this.createModAPI(module.id, module.manifest),
                console: window.console,
                setTimeout: window.setTimeout,
                clearTimeout: window.clearTimeout,
                setInterval: window.setInterval,
                clearInterval: window.clearInterval,
                JSON: window.JSON,
                Math: window.Math,
                Date: window.Date,
                Object: window.Object,
                Array: window.Array,
                String: window.String,
                Number: window.Number,
                Boolean: window.Boolean
            };
            
            // Execute module code in the trusted-local runtime context.
            const fn = new Function('runtimeContext', `
                with(runtimeContext) {
                    ${module.code}
                }
            `);
            
            this.loadingModuleId = module.id;
            fn(runtimeContext);
            
            this.activeModules.set(module.id, {
                ...module,
                runtimeContext
            });
            
            console.log(`Module loaded: ${module.manifest.name}`);
        } catch (e) {
            this.unloadModule(module.id);
            console.error(`Failed to load module ${module.id}:`, e);
            throw e;
        } finally {
            this.loadingModuleId = null;
        }
    },

    _contributionRecord(moduleId) {
        if (!this.ownedContributions.has(moduleId)) {
            this.ownedContributions.set(moduleId, {
                biomes: new Map(),
                species: new Set(),
                items: new Set()
            });
        }
        return this.ownedContributions.get(moduleId);
    },

    _addOwnedBiome(moduleId, biomeDef) {
        if (!biomeDef || typeof biomeDef !== 'object') {
            throw new Error('Biome definition must be an object');
        }
        const id = String(biomeDef.id || '').trim();
        if (!id) throw new Error('Biome definition id is required');

        App.biomes = App.biomes || {};
        const record = this._contributionRecord(moduleId);
        if (!record.biomes.has(id)) {
            record.biomes.set(id, {
                existed: Object.prototype.hasOwnProperty.call(App.biomes, id),
                value: App.biomes[id]
            });
        }
        App.biomes[id] = { ...biomeDef, id };
    },

    _normalizeDataContribution(value, label) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`${label} definition must be an object`);
        }
        const id = String(value.id || '').trim();
        if (!id) throw new Error(`${label} definition id is required`);

        try {
            this._assertSerializableData(value, label);
            return { ...JSON.parse(JSON.stringify(value)), id };
        } catch (e) {
            throw new Error(`${label} definition must be serializable data`);
        }
    },

    _assertSerializableData(value, label, stack = new Set()) {
        if (value === null) return;
        const type = typeof value;
        if (type === 'string' || type === 'boolean') return;
        if (type === 'number') {
            if (!Number.isFinite(value)) throw new Error(`${label} definition contains a non-finite number`);
            return;
        }
        if (type !== 'object') {
            throw new Error(`${label} definition contains unsupported data`);
        }
        if (stack.has(value)) {
            throw new Error(`${label} definition contains a circular reference`);
        }
        if (Object.getOwnPropertySymbols(value).length > 0) {
            throw new Error(`${label} definition contains symbol keys`);
        }
        stack.add(value);
        const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
        for (const [, child] of entries) {
            this._assertSerializableData(child, label, stack);
        }
        stack.delete(value);
    },

    _addOwnedArrayEntry(moduleId, collectionName, value) {
        const labels = { species: 'Species', items: 'Item' };
        const entry = this._normalizeDataContribution(value, labels[collectionName] || collectionName);
        App[collectionName] = App[collectionName] || [];
        App[collectionName].push(entry);
        this._contributionRecord(moduleId)[collectionName].add(entry);
    },

    _removeModuleContributions(moduleId) {
        const record = this.ownedContributions.get(moduleId);
        if (!record) return;

        if (App.biomes) {
            for (const [id, previous] of record.biomes.entries()) {
                if (previous.existed) App.biomes[id] = previous.value;
                else delete App.biomes[id];
            }
        }

        if (Array.isArray(App.species)) {
            App.species = App.species.filter(entry => !record.species.has(entry));
        }
        if (Array.isArray(App.items)) {
            App.items = App.items.filter(entry => !record.items.has(entry));
        }

        this.ownedContributions.delete(moduleId);
    },

    _hasPermission(manifest, permission) {
        return Array.isArray(manifest?.permissions) && manifest.permissions.includes(permission);
    },

    _requirePermission(moduleId, manifest, permission) {
        if (!this._hasPermission(manifest, permission)) {
            throw new Error(`Module ${moduleId} requires permission ${permission}`);
        }
    },
    
    // Unload module
    unloadModule(moduleId) {
        // Remove hooks registered by this module
        for (const event in this.hooks) {
            this.hooks[event] = this.hooks[event].filter(
                h => h.moduleId !== moduleId
            );
        }
        this._removeModuleContributions(moduleId);
        
        this.activeModules.delete(moduleId);
        console.log(`Module unloaded: ${moduleId}`);
    },
    
    // Create API for mods
    createModAPI(moduleId, manifest = null) {
        const self = this;
        return {
            id: moduleId,
            
            registerHook(event, callback, priority = 0) {
                self.registerHook(event, callback, priority, moduleId);
            },
            
            executeHook(event, ...args) {
                return self.executeHook(event, ...args);
            },
            
            addBiome(biomeDef) {
                self._requirePermission(moduleId, manifest, 'world:add_biome');
                self._addOwnedBiome(moduleId, biomeDef);
            },
            
            addSpecies(speciesDef) {
                self._requirePermission(moduleId, manifest, 'content:add_species');
                self._addOwnedArrayEntry(moduleId, 'species', speciesDef);
            },
            
            addItem(itemDef) {
                self._requirePermission(moduleId, manifest, 'content:add_item');
                self._addOwnedArrayEntry(moduleId, 'items', itemDef);
            },
            
            log(message) {
                App.log.push({ text: `[${moduleId}] ${message}`, type: 'mod' });
                App.renderLog();
            },
            
            getSetting(key, defaultValue = null) {
                return self.getModuleSetting(moduleId, key, defaultValue);
            },
            
            setSetting(key, value) {
                return self.setModuleSetting(moduleId, key, value);
            }
        };
    },
    
    // Get all installed modules
    async getAllModules() {
        if (!this.db) {
            console.warn('Module DB not initialized yet');
            return [];
        }
        const db = this._requireDb();
        const tx = db.transaction(['modules'], 'readonly');
        const store = tx.objectStore('modules');
        const modules = await this._request(store.getAll());
        await this._transactionDone(tx);
        return modules;
    },
    
    // Get module settings
    async getModuleSetting(moduleId, key, defaultValue = null) {
        const settingKey = this._normalizeSettingKey(key);
        const db = this._requireDb();
        const tx = db.transaction(['settings'], 'readonly');
        const store = tx.objectStore('settings');
        const setting = await this._request(store.get(`${moduleId}:${settingKey}`));
        await this._transactionDone(tx);
        return setting ? setting.value : defaultValue;
    },
    
    // Set module setting
    async setModuleSetting(moduleId, key, value) {
        const settingKey = this._normalizeSettingKey(key);
        const settingValue = this._normalizeSettingValue(value);
        const db = this._requireDb();
        const tx = db.transaction(['settings'], 'readwrite');
        const store = tx.objectStore('settings');
        await this._request(store.put({
            key: `${moduleId}:${settingKey}`,
            value: settingValue
        }));
        await this._transactionDone(tx);
    },
    
    // Delete module
    async deleteModule(moduleId) {
        await this._disableDependentsOf(moduleId);
        this.unloadModule(moduleId);
        
        const db = this._requireDb();
        const tx = db.transaction(['modules', 'assets', 'settings'], 'readwrite');
        
        await this._request(tx.objectStore('modules').delete(moduleId));
        
        // Delete associated assets
        const assetStore = tx.objectStore('assets');
        const assetIndex = assetStore.index('moduleId');
        const assets = await this._request(assetIndex.getAll(moduleId));
        for (const asset of assets) {
            await this._request(assetStore.delete(asset.id));
        }

        const settingsStore = tx.objectStore('settings');
        const settings = await this._request(settingsStore.getAll());
        for (const setting of settings) {
            if (setting.key && setting.key.startsWith(`${moduleId}:`)) {
                await this._request(settingsStore.delete(setting.key));
            }
        }
        await this._transactionDone(tx);
        
        console.log(`Module deleted: ${moduleId}`);
    }
};

// Initialize module system
MODULE_SYSTEM.init().then(() => {
    console.log('Module system ready');
}).catch(err => {
    console.error('Module system failed:', err);
});
