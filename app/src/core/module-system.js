
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
    PUBLIC_CONTEXT_VERSION: 1,
    TRUST_BOUNDARY: 'trusted-local',
    CONTENT_RATINGS: ['safe', 'mature', 'adult'],
    KNOWN_PERMISSIONS: ['ui.read', 'scene:read_narrative', 'scene:narrate', 'ai:request', 'ai:provide', 'world:add_biome', 'content:add_species', 'content:add_item', 'content:add_template', 'content:add_locale', 'content:add_creation_option'],
    db: null,
    
    // Hooks registry
    hooks: {
        onMapGenerate: [],
        onEncounterStart: [],
        onCombatAction: [],
        onDigestionTick: [],
        onSubActionExecute: [],
        onDefeat: [],
        onRegenerate: [],
        onPlayerMove: [],
        onGameStart: [],
        onGameLoad: [],
        onGameSave: [],
        onTick: [],
        onSceneBeat: [],
        onSceneExchangeClosed: [],
        onContentPolicyChanged: []
    },
    
    // Active modules
    activeModules: new Map(),
    ownedContributions: new Map(),
    settingActions: new Map(),
    loadingModuleId: null,

    _credentialLikeName(value) {
        const compact = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return [
            'apikey', 'accesskey', 'accesstoken', 'refreshtoken', 'authtoken', 'authorization',
            'bearertoken', 'token', 'password', 'passwd', 'secret', 'clientsecret', 'privatekey', 'credential'
        ].some(token => compact === token || compact.endsWith(token));
    },

    _credentialLikeValue(value, seen = new Set()) {
        if (typeof value === 'string') {
            const text = value.trim();
            return /^(?:bearer|basic)\s+\S+/i.test(text)
                || /^sk-(?:or-v1-)?[a-z0-9_-]{8,}$/i.test(text)
                || /^-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text);
        }
        if (!value || typeof value !== 'object' || seen.has(value)) return false;
        seen.add(value);
        if (Array.isArray(value)) return value.some(item => this._credentialLikeValue(item, seen));
        return Object.entries(value).some(([key, child]) => this._credentialLikeName(key) || this._credentialLikeValue(child, seen));
    },

    _assertSettingContainsNoCredentials(key, value) {
        if (this._credentialLikeName(key) || this._credentialLikeValue(value)) {
            throw new Error('Module settings cannot store credentials');
        }
    },

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

    _normalizePolicyDeclarations(value, fieldName, kind) {
        if (value === undefined) return [];
        if (!Array.isArray(value)) throw new Error(`Module manifest ${fieldName} must be an array`);
        const normalized = [];
        const seen = new Set();
        for (const entry of value) {
            const source = typeof entry === 'string' ? { id: entry } : entry;
            if (!source || typeof source !== 'object' || Array.isArray(source)) {
                throw new Error(`Module manifest ${fieldName} entries must be strings or objects`);
            }
            const id = String(source.id || '').trim();
            if (!id || id.length > 64 || !/^[a-zA-Z0-9_.:-]+$/.test(id)) {
                throw new Error(`Module manifest ${fieldName} ids must be token strings`);
            }
            if (seen.has(id)) continue;
            seen.add(id);
            const declaration = {
                id,
                label: String(source.label || id.replace(/[-_.:]+/g, ' ')).trim().slice(0, 120),
                description: String(source.description || '').trim().slice(0, 500)
            };
            if (kind === 'category') {
                declaration.required = source.required !== false;
            } else {
                declaration.default = source.default === true;
                declaration.settingKey = /^[a-zA-Z0-9_.:-]+$/.test(String(source.settingKey || '').trim()) ? String(source.settingKey).trim() : '';
                declaration.minPosture = String(source.minPosture || 'sfw').trim().toLowerCase() === 'mature' ? 'mature' : 'sfw';
                declaration.category = /^[a-zA-Z0-9_.:-]+$/.test(String(source.category || '').trim()) ? String(source.category).trim() : '';
            }
            normalized.push(declaration);
        }
        return normalized;
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

    _normalizeSettingsDeclarations(value) {
        if (value === undefined) return [];
        if (!Array.isArray(value)) throw new Error('Module manifest settings must be an array');
        const allowed = new Set(['boolean', 'select', 'number', 'string', 'provider_connection', 'action']);
        const seen = new Set();
        return value.map(entry => {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Module setting declarations must be objects');
            const key = this._normalizeSettingKey(entry.key);
            if (seen.has(key)) throw new Error(`Duplicate module setting declaration: ${key}`);
            seen.add(key);
            const type = String(entry.type || '').trim();
            if (!allowed.has(type)) throw new Error(`Unsupported module setting type: ${type || 'missing'}`);
            if (this._credentialLikeName(key)) throw new Error('Module settings cannot declare credential fields');
            const setting = {
                key,
                type,
                label: String(entry.label || key.replace(/[-_.:]+/g, ' ')).trim().slice(0, 120),
                description: String(entry.description || '').trim().slice(0, 300)
            };
            if (type === 'boolean') setting.default = entry.default === true;
            if (type === 'select') {
                setting.options = (Array.isArray(entry.options) ? entry.options : []).slice(0, 30).map(option => {
                    const source = typeof option === 'string' ? { value: option, label: option } : option;
                    return { value: this._normalizeSettingKey(source?.value), label: String(source?.label || source?.value).slice(0, 120) };
                });
                if (!setting.options.length) throw new Error(`Select setting ${key} requires options`);
                setting.default = setting.options.some(option => option.value === entry.default) ? entry.default : setting.options[0].value;
            }
            if (type === 'number') {
                setting.min = Number.isFinite(Number(entry.min)) ? Number(entry.min) : 0;
                setting.max = Number.isFinite(Number(entry.max)) ? Number(entry.max) : setting.min + 100;
                if (setting.max < setting.min) throw new Error(`Number setting ${key} has an invalid range`);
                setting.step = Math.max(0.01, Number(entry.step) || 1);
                setting.default = Math.max(setting.min, Math.min(setting.max, Number(entry.default) || setting.min));
            }
            if (type === 'string') {
                setting.maxLength = Math.max(1, Math.min(500, Number(entry.maxLength) || 120));
                setting.default = String(entry.default || '').slice(0, setting.maxLength);
                this._assertSettingContainsNoCredentials(key, setting.default);
            }
            if (type === 'provider_connection') setting.default = '';
            return setting;
        });
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
        const contentCategories = this._normalizePolicyDeclarations(manifest.contentCategories, 'contentCategories', 'category');
        if (contentRating === 'adult' && !contentCategories.some(category => category.id === 'explicit.sexual')) {
            contentCategories.push({
                id: 'explicit.sexual',
                label: 'Explicit sexual content',
                description: 'Legacy adult-rated module content.',
                required: true,
                legacyAdultAlias: true
            });
        }
        const gameplayVariants = this._normalizePolicyDeclarations(manifest.gameplayVariants, 'gameplayVariants', 'variant');

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
            minGameVersion,
            contentCategories,
            gameplayVariants,
            settings: this._normalizeSettingsDeclarations(manifest.settings)
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

    _normalizeSettingValue(value, key = '') {
        this._assertSettingContainsNoCredentials(key, value);
        try {
            this._assertSerializableData(value, 'Module setting value');
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            throw new Error('Module setting value must be serializable data');
        }
    },

    _declaredSetting(manifest, key) {
        const normalized = this._normalizeSettingKey(key);
        return (manifest?.settings || []).find(setting => setting.key === normalized) || null;
    },

    _normalizeDeclaredSettingValue(declaration, value) {
        if (!declaration || declaration.type === 'action') throw new Error('Module setting is not value-backed');
        if (declaration.type === 'boolean') return value === true || value === 'true';
        if (declaration.type === 'select') {
            const normalized = String(value);
            if (!declaration.options.some(option => option.value === normalized)) throw new Error('Module setting selection is invalid');
            return normalized;
        }
        if (declaration.type === 'number') {
            const number = Number(value);
            if (!Number.isFinite(number)) throw new Error('Module setting must be a number');
            return Math.max(declaration.min, Math.min(declaration.max, number));
        }
        if (declaration.type === 'string') return String(value || '').slice(0, declaration.maxLength);
        if (declaration.type === 'provider_connection') {
            const id = String(value || '');
            if (id && !YAW_AI_PROVIDER_MANAGER.connections.has(id)) throw new Error('Provider connection is unavailable');
            return id;
        }
        throw new Error('Unsupported module setting type');
    },

    async getDeclaredModuleSettings(moduleId, manifest) {
        const result = {};
        for (const declaration of manifest?.settings || []) {
            if (declaration.type === 'action') continue;
            result[declaration.key] = await this.getModuleSetting(moduleId, declaration.key, declaration.default ?? null);
        }
        return result;
    },

    async setDeclaredModuleSetting(moduleId, manifest, key, value) {
        const declaration = this._declaredSetting(manifest, key);
        if (!declaration) throw new Error('Module setting is not declared');
        const normalized = this._normalizeDeclaredSettingValue(declaration, value);
        await this.setModuleSetting(moduleId, declaration.key, normalized);
        return normalized;
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
            return { posture: 'sfw', maxTier: 0, explicitDescriptions: false, enabledCategories: [] };
        }
        return {
            posture: CONTENT.preferences.posture || (Number(CONTENT.preferences.maxTier) >= 1 ? 'mature' : 'sfw'),
            maxTier: Math.max(0, Math.min(2, Number(CONTENT.preferences.maxTier) || 0)),
            explicitDescriptions: !!CONTENT.preferences.explicitDescriptions,
            enabledCategories: Array.isArray(CONTENT.preferences.enabledCategories) ? [...CONTENT.preferences.enabledCategories] : []
        };
    },

    _contentRatingBlockReason(manifest) {
        const rating = String(manifest?.contentRating || 'safe').trim().toLowerCase();
        const policy = this._currentContentPolicy();
        if ((rating === 'mature' || rating === 'adult') && policy.posture !== 'mature') {
            return `Module contentRating ${rating} requires a higher content tier`;
        }
        if (rating === 'adult' && !policy.explicitDescriptions && !policy.enabledCategories.includes('explicit.sexual')) {
            return 'Module contentRating adult requires explicit descriptions to be enabled';
        }
        for (const category of manifest?.contentCategories || []) {
            if (category.required !== false && !policy.enabledCategories.includes(category.id)) {
                return `Module content category ${category.id} requires player opt-in`;
            }
        }
        return null;
    },

    _syncContentPolicyProvider(module) {
        if (typeof CONTENT === 'undefined' || !CONTENT?.registerPolicyProvider || !module?.manifest) return null;
        return CONTENT.registerPolicyProvider(module.id, module.manifest, {
            installed: true,
            enabled: module.enabled === true
        });
    },

    async syncContentPolicyProviders() {
        if (typeof CONTENT === 'undefined' || !CONTENT?.registerPolicyProvider) return [];
        const modules = await this.getAllModules();
        const installedIds = new Set(modules.map(module => module.id));
        for (const provider of CONTENT.policyProviders?.values?.() || []) {
            if (!provider.core && !installedIds.has(provider.id)) CONTENT.unregisterPolicyProvider(provider.id);
        }
        for (const module of modules) {
            module.manifest = this._normalizeManifest(module.manifest);
            this._syncContentPolicyProvider(module);
        }
        return modules;
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
            request.onsuccess = async () => {
                this.db = request.result;
                console.log('Module DB initialized');
                try {
                    await this.purgeCredentialSettings();
                    resolve();
                } catch (error) {
                    reject(error);
                }
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
        this._assertKnownHookEvent(event);
        const hooks = [...(this.hooks[event] || [])];
        for (const hook of hooks) {
            try {
                await hook.callback(...args);
            } catch (e) {
                console.error(`Hook error (${event}):`, e);
            }
        }
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.freeze(value);
        Object.values(value).forEach(child => this._deepFreeze(child));
        return value;
    },

    async executePublicHook(event, envelope) {
        this._assertKnownHookEvent(event);
        const hooks = [...(this.hooks[event] || [])];
        await Promise.all(hooks.map(async hook => {
            try {
                const payload = this._serializableCopy(envelope);
                await hook.callback(this._deepFreeze(payload));
            } catch (e) {
                console.error(`Public hook error (${event}):`, e);
            }
        }));
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
        this._syncContentPolicyProvider(module);
        
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
                module.enabled = false;
                try {
                    await this._storeModuleRecord(module);
                } catch (storeError) {
                    console.error(`Failed to persist disabled state for ${moduleId}:`, storeError);
                }
                this._syncContentPolicyProvider(module);
                throw e;
            }

            module.enabled = true;
            try {
                await this._storeModuleRecord(module);
            } catch (e) {
                this.unloadModule(moduleId);
                throw e;
            }
            this._syncContentPolicyProvider(module);
            return module;
        }

        module.enabled = false;
        await this._request(store.put(module));
        await this._transactionDone(tx);

        this.unloadModule(moduleId);
        module.disabledDependents = await this._disableDependentsOf(moduleId);
        this._syncContentPolicyProvider(module);
        
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

            const runtimeTimers = { timeouts: new Set(), intervals: new Set() };
            const setTrackedTimeout = (callback, delay, ...args) => {
                let timerId = null;
                const wrapped = typeof callback === 'function'
                    ? (...callbackArgs) => {
                        runtimeTimers.timeouts.delete(timerId);
                        return callback(...callbackArgs);
                    }
                    : callback;
                timerId = window.setTimeout(wrapped, delay, ...args);
                runtimeTimers.timeouts.add(timerId);
                return timerId;
            };
            const clearTrackedTimeout = (timerId) => {
                runtimeTimers.timeouts.delete(timerId);
                return window.clearTimeout(timerId);
            };
            const setTrackedInterval = (callback, delay, ...args) => {
                const timerId = window.setInterval(callback, delay, ...args);
                runtimeTimers.intervals.add(timerId);
                return timerId;
            };
            const clearTrackedInterval = (timerId) => {
                runtimeTimers.intervals.delete(timerId);
                return window.clearInterval(timerId);
            };

            // Create the trusted-local module runtime context. This is not a security boundary.
            const runtimeContext = {
                MODS: this.createModAPI(module.id, module.manifest),
                console: window.console,
                setTimeout: setTrackedTimeout,
                clearTimeout: clearTrackedTimeout,
                setInterval: setTrackedInterval,
                clearInterval: clearTrackedInterval,
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
            this.activeModules.set(module.id, {
                ...module,
                runtimeContext,
                runtimeTimers,
                loading: true
            });
            fn(runtimeContext);

            this.activeModules.set(module.id, {
                ...module,
                runtimeContext,
                runtimeTimers,
                loading: false
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
                items: new Set(),
                templates: [],
                locales: []
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

    _publicUnitSummary(unit) {
        if (!unit || typeof unit !== 'object') return null;
        const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
        return {
            id: String(unit.id || unit.name || ''),
            name: String(unit.name || ''),
            species: String(unit.species || ''),
            disposition: String(unit.disposition || ''),
            role: String(unit.partyRole || unit.role || ''),
            level: finite(unit.level),
            punishment: { current: finite(unit.CPun), max: finite(unit.MPun) },
            spirit: { current: finite(unit.CPle), max: finite(unit.MPle) },
            hunger: finite(unit.hunger),
            size: finite(unit.size),
            combatRow: unit.combatRow === 'back' ? 'back' : (unit.combatRow === 'front' ? 'front' : null),
            capabilities: ['flying', 'ranged', 'antiflying', 'swimming', 'darkvision'].filter(key => Boolean(unit[key])),
            statuses: Object.keys(unit.status || {}).filter(key => Boolean(unit.status[key])).sort()
        };
    },

    _publicSceneBeatSummary(event) {
        if (!event || typeof event !== 'object') return null;
        return {
            id: event.id == null ? null : String(event.id),
            exchangeId: String(event.exchangeId || event.metadata?.exchangeId || event.id || ''),
            mode: String(event.mode || ''),
            action: String(event.action || ''),
            subAction: event.subAction == null ? null : String(event.subAction),
            shape: String(event.shape || ''),
            resultKind: String(event.resultKind || ''),
            summary: String(event.summary || ''),
            passage: String(event.passage || ''),
            actors: (event.actors || []).map(unit => this._publicUnitSummary(unit)).filter(Boolean),
            targets: (event.targets || []).map(unit => this._publicUnitSummary(unit)).filter(Boolean),
            deltas: this._serializableCopy(event.deltas || []),
            tags: (event.tags || []).map(String),
            importance: String(event.importance || 'normal'),
            source: String(event.source || ''),
            contentTier: Number.isFinite(Number(event.contentTier)) ? Number(event.contentTier) : 0,
            subEvents: this._serializableCopy(event.subEvents || [])
        };
    },

    _publicNarrativeUnitSummary(unit) {
        const summary = this._publicUnitSummary(unit);
        if (!summary) return null;
        const strings = (value, limit = 8) => (Array.isArray(value) ? value : []).slice(0, limit).map(item => String(item).slice(0, 120));
        return {
            ...summary,
            pronouns: String(unit.pronouns || '').slice(0, 80),
            voice: String(unit.voice || '').slice(0, 160),
            traits: strings(unit.narrativeTraits || unit.traits),
            goals: strings(unit.goals, 5),
            relationshipSummary: String(unit.relationshipSummary || '').slice(0, 240),
            currentDisposition: String(unit.disposition || '').slice(0, 80),
            adultEligibility: this._serializableCopy(unit.adultEligibility || {
                version: 1,
                status: unit.adultEligible === true ? 'eligible' : 'unknown',
                authority: unit.adultEligible === true ? 'legacy-unit-migration' : 'unknown'
            }),
            adultEligible: unit.adultEligibility?.status === 'eligible'
        };
    },

    _publicActivitySummary(entry) {
        if (!entry || typeof entry !== 'object') return null;
        return {
            text: String(entry.text || ''),
            type: String(entry.type || 'info'),
            round: Number.isFinite(Number(entry.round)) ? Number(entry.round) : null,
            turn: Number.isFinite(Number(entry.turn)) ? Number(entry.turn) : null,
            actorId: entry.actorId == null ? null : String(entry.actorId),
            timestamp: Number.isFinite(Number(entry.timestamp)) ? Number(entry.timestamp) : null
        };
    },

    _publicQuestSummary(quest) {
        if (!quest || typeof quest !== 'object') return null;
        return {
            id: String(quest.id || quest.title || ''),
            title: String(quest.title || ''),
            status: String(quest.status || ''),
            type: String(quest.type || quest.objective?.type || ''),
            progress: Number.isFinite(Number(quest.progress)) ? Number(quest.progress) : 0,
            required: Number.isFinite(Number(quest.required)) ? Number(quest.required) : null,
            giverId: quest.giverId == null ? null : String(quest.giverId),
            completed: Boolean(quest.completed || quest.status === 'completed' || quest.status === 'turnIn'),
            objective: this._serializableCopy(quest.objective || null)
        };
    },

    _serializableCopy(value) {
        try {
            this._assertSerializableData(value, 'Public context');
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return Array.isArray(value) ? [] : null;
        }
    },

    getPublicContext(options = {}) {
        const requestedLimit = Number(options.limit ?? 20);
        const limit = Math.max(1, Math.min(50, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 20));
        const currentTile = App._currentExplorationTile?.()
            || App.worldMap?.get?.(`${App.location?.x || 0},${App.location?.y || 0}`)
            || null;
        const tileSummary = App.getTileMapSummary?.(currentTile) || (currentTile ? {
            x: Number(currentTile.x ?? App.location?.x ?? 0),
            y: Number(currentTile.y ?? App.location?.y ?? 0),
            biome: String(currentTile.biome || ''),
            explored: Boolean(currentTile.explored)
        } : null);
        return {
            version: this.PUBLIC_CONTEXT_VERSION,
            mode: App.combatState?.active ? 'combat' : 'adventure',
            content: {
                posture: String(CONTENT?.preferences?.posture || (Number(CONTENT?.preferences?.maxTier) >= 1 ? 'mature' : 'sfw')),
                maxTier: Number.isFinite(Number(CONTENT?.preferences?.maxTier)) ? Number(CONTENT.preferences.maxTier) : 0,
                language: String(CONTENT?.preferences?.language || 'en'),
                enabledCategories: Array.isArray(CONTENT?.preferences?.enabledCategories)
                    ? CONTENT.preferences.enabledCategories.map(String)
                    : [],
                gameplayVariants: Object.fromEntries(Object.entries(CONTENT?.preferences?.gameplayVariants || {})
                    .filter(([, enabled]) => enabled === true)
                    .map(([id]) => [String(id), true]))
            },
            location: {
                x: Number(App.location?.x || 0),
                y: Number(App.location?.y || 0),
                tile: this._serializableCopy(tileSummary)
            },
            party: (App.party || []).map(unit => this._publicUnitSummary(unit)).filter(Boolean),
            nearbyUnits: (App.creatures || []).map(unit => this._publicUnitSummary(unit)).filter(Boolean),
            quests: (App.quests || []).slice(0, limit).map(quest => this._publicQuestSummary(quest)).filter(Boolean),
            sceneBeats: (App.storyEvents || []).slice(-limit).map(event => this._publicSceneBeatSummary(event)).filter(Boolean),
            activity: (App.log || []).slice(-limit).map(entry => this._publicActivitySummary(entry)).filter(Boolean)
        };
    },

    _addOwnedArrayEntry(moduleId, collectionName, value) {
        const labels = { species: 'Species', items: 'Item' };
        const entry = this._normalizeDataContribution(value, labels[collectionName] || collectionName);
        App[collectionName] = App[collectionName] || [];
        App[collectionName].push(entry);
        this._contributionRecord(moduleId)[collectionName].add(entry);
    },

    _addOwnedTemplate(moduleId, category, type, variant, tier, renderer) {
        if (typeof CONTENT === 'undefined' || !CONTENT?.registerTemplateTier) throw new Error('Content template registry is unavailable');
        const previous = CONTENT.templateTier(category, type, variant, tier);
        CONTENT.registerTemplateTier(category, type, variant, tier, renderer);
        this._contributionRecord(moduleId).templates.push({ category, type, variant, tier, previous });
    },

    _addOwnedLocaleEntries(moduleId, locale, entries) {
        if (typeof CONTENT === 'undefined' || !CONTENT?.registerLocaleEntries) throw new Error('Content locale registry is unavailable');
        const previous = CONTENT.registerLocaleEntries(locale, entries);
        this._contributionRecord(moduleId).locales.push({ locale, previous });
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
        for (const contribution of [...record.templates].reverse()) {
            CONTENT?.registerTemplateTier?.(contribution.category, contribution.type, contribution.variant, contribution.tier, contribution.previous ?? null);
        }
        for (const contribution of [...record.locales].reverse()) {
            CONTENT?.restoreLocaleEntries?.(contribution.locale, contribution.previous);
        }
        CONTENT?.unregisterCreationOptions?.(moduleId);

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
        const activeModule = this.activeModules.get(moduleId);
        if (activeModule?.runtimeTimers) {
            for (const timerId of activeModule.runtimeTimers.timeouts || []) {
                try { window.clearTimeout(timerId); } catch (e) {}
            }
            for (const timerId of activeModule.runtimeTimers.intervals || []) {
                try { window.clearInterval(timerId); } catch (e) {}
            }
            activeModule.runtimeTimers.timeouts?.clear();
            activeModule.runtimeTimers.intervals?.clear();
        }

        // Remove hooks registered by this module
        for (const event in this.hooks) {
            this.hooks[event] = this.hooks[event].filter(
                h => h.moduleId !== moduleId
            );
        }
        this._removeModuleContributions(moduleId);
        if (typeof YAW_AI_PROVIDER_MANAGER !== 'undefined') YAW_AI_PROVIDER_MANAGER.unregisterOwner(moduleId);
        if (typeof YAW_NARRATION_SYSTEM !== 'undefined') {
            YAW_NARRATION_SYSTEM.removeContextExtensions(moduleId);
            YAW_NARRATION_SYSTEM.removeOrchestrators(moduleId);
            YAW_NARRATION_SYSTEM.removeOwner(App, moduleId);
        }
        for (const key of [...this.settingActions.keys()]) {
            if (key.startsWith(`${moduleId}:`)) this.settingActions.delete(key);
        }
        
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

            registerContentTemplate(category, type, variant, tier, renderer) {
                self._requirePermission(moduleId, manifest, 'content:add_template');
                self._addOwnedTemplate(moduleId, category, type, variant, tier, renderer);
            },

            registerLocaleEntries(locale, entries) {
                self._requirePermission(moduleId, manifest, 'content:add_locale');
                self._addOwnedLocaleEntries(moduleId, locale, entries);
            },

            registerCreationOption(option) {
                self._requirePermission(moduleId, manifest, 'content:add_creation_option');
                if (typeof CONTENT === 'undefined' || !CONTENT?.registerCreationOption) throw new Error('Creation option registry is unavailable');
                self._contributionRecord(moduleId);
                return CONTENT.registerCreationOption(moduleId, option);
            },

            getContext(options = {}) {
                self._requirePermission(moduleId, manifest, 'ui.read');
                return self.getPublicContext(options);
            },

            getNarrationContext(options = {}) {
                self._requirePermission(moduleId, manifest, 'scene:read_narrative');
                return YAW_NARRATION_SYSTEM.context(App, options);
            },

            publishNarration(record) {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                return YAW_NARRATION_SYSTEM.publish(App, moduleId, record);
            },

            updateNarration(id, patch) {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                return YAW_NARRATION_SYSTEM.update(App, moduleId, id, patch);
            },

            removeNarration(id) {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                return YAW_NARRATION_SYSTEM.remove(App, moduleId, id);
            },

            clearNarrations() {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                return YAW_NARRATION_SYSTEM.clearOwner(App, moduleId);
            },

            registerSettingAction(key, callback) {
                const declaration = self._declaredSetting(manifest, key);
                if (declaration?.type !== 'action' || typeof callback !== 'function') throw new Error('Setting action must match a declared action');
                self.settingActions.set(`${moduleId}:${declaration.key}`, callback);
            },

            registerNarrationContextExtension(extension) {
                self._requirePermission(moduleId, manifest, 'scene:read_narrative');
                return YAW_NARRATION_SYSTEM.registerContextExtension(moduleId, extension);
            },

            registerNarrationOrchestrator(orchestrator) {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                return YAW_NARRATION_SYSTEM.registerOrchestrator(moduleId, orchestrator);
            },

            ownsNarrationExchange(envelope = {}) {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                return YAW_NARRATION_SYSTEM.ownsOrchestration(moduleId, envelope.policy || undefined);
            },

            registerAIProvider(providerId, adapter) {
                self._requirePermission(moduleId, manifest, 'ai:provide');
                return YAW_AI_PROVIDER_MANAGER.registerAdapter(providerId, adapter, moduleId);
            },

            createAIProviderConnection(providerId, metadata = {}) {
                self._requirePermission(moduleId, manifest, 'ai:provide');
                return YAW_AI_PROVIDER_MANAGER.createConnection(providerId, metadata);
            },

            removeAIProviderConnection(connectionId) {
                self._requirePermission(moduleId, manifest, 'ai:provide');
                return YAW_AI_PROVIDER_MANAGER.removeOwnedConnection(moduleId, connectionId);
            },

            ai: {
                generate(request) {
                    self._requirePermission(moduleId, manifest, 'ai:request');
                    return YAW_AI_PROVIDER_MANAGER.generate(moduleId, request);
                },
                listConnections() {
                    self._requirePermission(moduleId, manifest, 'ai:request');
                    return YAW_AI_PROVIDER_MANAGER.listConnections();
                },
                cancelPending() {
                    self._requirePermission(moduleId, manifest, 'ai:request');
                    YAW_AI_PROVIDER_MANAGER.abortModule(moduleId);
                }
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

    async purgeCredentialSettings() {
        const db = this._requireDb();
        const tx = db.transaction(['settings'], 'readwrite');
        const store = tx.objectStore('settings');
        const settings = await this._request(store.getAll());
        let removed = 0;
        for (const setting of settings) {
            const namespacedKey = String(setting?.key || '');
            const settingKey = namespacedKey.includes(':') ? namespacedKey.slice(namespacedKey.indexOf(':') + 1) : namespacedKey;
            if (!this._credentialLikeName(settingKey) && !this._credentialLikeValue(setting?.value)) continue;
            await this._request(store.delete(namespacedKey));
            removed++;
        }
        await this._transactionDone(tx);
        return removed;
    },
    
    // Set module setting
    async setModuleSetting(moduleId, key, value) {
        const settingKey = this._normalizeSettingKey(key);
        const settingValue = this._normalizeSettingValue(value, settingKey);
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
        if (typeof CONTENT !== 'undefined' && CONTENT?.unregisterPolicyProvider) {
            CONTENT.unregisterPolicyProvider(moduleId);
        }
        
        console.log(`Module deleted: ${moduleId}`);
    }
};

// Initialize module system
MODULE_SYSTEM.init().then(() => {
    console.log('Module system ready');
}).catch(err => {
    console.error('Module system failed:', err);
});
