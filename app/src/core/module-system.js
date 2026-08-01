
/**
 * YOU ARE WILD MODULE MANAGER
 * IndexedDB-based module storage with hook system
 */

const MODULE_SYSTEM = {
    DB_NAME: 'YAW_Modules',
    LEGACY_DB_NAME: 'FFFme_Modules',
    DB_VERSION: 3,
    GAME_VERSION: window.YAW_RELEASE?.version || '0.0.0',
    PACKAGE_TYPE: 'yaw-module',
    PACKAGE_VERSION: 1,
    PUBLIC_CONTEXT_VERSION: 1,
    TRUST_BOUNDARY: 'trusted-local',
    CONTENT_RATINGS: ['safe', 'mature', 'adult'],
    MODULE_PROVENANCES: ['user', 'remote', 'host', 'built-in'],
    RUNTIME_ORIGINS: ['file', 'https', 'localhost', 'http'],
    HOST_MANIFEST_SCHEMA: 'yaw-host-modules-v1',
    CONTENT_PROFILE_SCHEMA: 'yaw-content-profile-v1',
    UI_CONTRIBUTION_VERSION: 1,
    UI_CONTRIBUTION_SLOTS: Object.freeze([
        'composer.place.after',
        'roster.party.badges',
        'roster.here.badges',
        'roster.details.sections',
        'system.utilities'
    ]),
    SPECIES_PROFILE_VERSION: 1,
    SPECIES_PROFILE_DEFAULT_STATS: Object.freeze({
        MPun: 100, MPle: 100, Figh: 10, Feas: 10, Flir: 10, Fuck: 10,
        Flee: 10, Feed: 10, hunger: 40, str: 10, con: 10, spd: 10,
        int: 10, wis: 10, cha: 10
    }),
    SPECIES_PROFILE_BODY_PARTS: Object.freeze(['fangs', 'wings', 'tail', 'claws', 'horns', 'webbing', 'scales', 'fins', 'stinger', 'tentacles', 'pincers']),
    SPECIES_PROFILE_ABILITIES: Object.freeze(['rage', 'menacing', 'flying', 'ranged', 'constrictor', 'poisonous', 'darkvision', 'bloodsuck', 'swimming', 'floopy', 'enveloped', 'venom', 'antiflying', 'tasty', 'fastFlee', 'small', 'livestock', 'laughing']),
    SPECIES_PROFILE_TEMPERAMENTS: Object.freeze(['timid', 'prey', 'fastFlee', 'herd', 'livestock', 'aquatic', 'territorial', 'aggressive', 'swarm', 'opportunistic', 'pack', 'nocturnal', 'cunning', 'ambush', 'apex', 'aerial', 'adaptable', 'relentless', 'passive', 'playful', 'enveloping']),
    SPECIES_PROFILE_INTERACTIONS: Object.freeze(['social', 'party', 'quest', 'merchant', 'recruit', 'sensitiveSocial', 'combat', 'feed', 'feast']),
    DEFAULT_HOST_MANIFEST_PATH: 'yaw-host.json',
    REMOTE_PACKAGE_MAX_BYTES: 2 * 1024 * 1024,
    REMOTE_PACKAGE_TIMEOUT_MS: 15000,
    KNOWN_PERMISSIONS: ['ui.read', 'ui:contribute', 'media:read', 'media:provide', 'scene:add_template', 'scene:read_narrative', 'scene:narrate', 'ai:request', 'ai:provide', 'world:add_biome', 'world:add_biome_recipe', 'content:add_species', 'content:add_item', 'content:add_equipment', 'content:add_quest', 'content:add_template', 'content:add_locale', 'content:add_creation_option', 'content:add_action_variant', 'content:add_perk_profile', 'mechanics:add_resource_profile', 'mechanics:add_status_effect', 'mechanics:add_restraint_profile', 'mechanics:add_action_profile', 'mechanics:add_body_profile', 'mechanics:add_combat_technique', 'mechanics:add_recovery_mode'],
    db: null,
    hostManifest: null,
    hostManifestState: { status: 'uninitialized', reason: '', url: '' },
    hostCatalog: new Map(),
    moduleRecords: new Map(),
    
    // Hooks registry
    hooks: {
        onMapGenerate: [],
        onEncounterStart: [],
        onEncounterResolved: [],
        onAutonomousEvent: [],
        onCombatAction: [],
        onDigestionTick: [],
        onSubActionExecute: [],
        onDefeat: [],
        onDefeatEncounterSettled: [],
        onPlayerState: [],
        onRegenerate: [],
        onPlayerMove: [],
        onGameStart: [],
        onGameLoad: [],
        onGameSave: [],
        onTick: [],
        onActionCommitted: [],
        onSceneBeat: [],
        onSceneExchangeClosed: [],
        onContentPolicyChanged: []
    },
    
    // Active modules
    activeModules: new Map(),
    ownedContributions: new Map(),
    moduleDiagnostics: new Map(),
    settingActions: new Map(),
    uiContributions: new Map(),
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

    _normalizeRuntimeRequirements(value, legacyHotToggleSafe = false) {
        if (value === undefined || value === null) value = {};
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Module manifest runtimeRequirements must be an object');
        }
        const requestedOrigins = value.origins === undefined
            ? [...this.RUNTIME_ORIGINS]
            : this._normalizeStringList(value.origins, 'runtimeRequirements.origins').map(origin => origin.toLowerCase());
        if (!requestedOrigins.length) throw new Error('Module manifest runtimeRequirements.origins cannot be empty');
        for (const origin of requestedOrigins) {
            if (!this.RUNTIME_ORIGINS.includes(origin)) {
                throw new Error(`Module manifest runtimeRequirements.origins contains unsupported origin ${origin}`);
            }
        }
        const hosts = this._normalizeStringList(value.hosts, 'runtimeRequirements.hosts').map(host => host.toLowerCase());
        const capabilities = this._normalizeStringList(value.capabilities, 'runtimeRequirements.capabilities').map(capability => capability.toLowerCase());
        return {
            origins: [...new Set(requestedOrigins)],
            hosts: [...new Set(hosts)],
            capabilities: [...new Set(capabilities)],
            network: value.network === true,
            secureContext: value.secureContext === true,
            hotToggleSafe: value.hotToggleSafe === true || legacyHotToggleSafe === true
        };
    },

    _normalizeProvenance(value, fallback = 'user') {
        const provenance = String(value || fallback).trim().toLowerCase();
        if (!this.MODULE_PROVENANCES.includes(provenance)) {
            throw new Error(`Module provenance must be one of: ${this.MODULE_PROVENANCES.join(', ')}`);
        }
        return provenance;
    },

    _runtimeOrigin() {
        const location = typeof window !== 'undefined' ? window.location : null;
        const protocol = String(location?.protocol || '').toLowerCase();
        const hostname = String(location?.hostname || '').toLowerCase();
        if (protocol === 'file:') return 'file';
        if (hostname === 'localhost' || hostname === '::1' || /^127(?:\.\d{1,3}){3}$/.test(hostname)) return 'localhost';
        if (protocol === 'https:') return 'https';
        return 'http';
    },

    _runtimeCompatibilityBlock(manifest) {
        const requirements = this._normalizeRuntimeRequirements(manifest?.runtimeRequirements, manifest?.hotToggleSafe);
        const origin = this._runtimeOrigin();
        if (!requirements.origins.includes(origin)) {
            const origins = requirements.origins.join(', ');
            return {
                key: 'mod.compatibility.origins',
                vars: { origins },
                message: `Module requires one of these runtime origins: ${origins}`
            };
        }
        const secure = origin === 'https' || origin === 'localhost';
        if (requirements.secureContext && !secure) {
            return {
                key: 'mod.compatibility.secureContext',
                vars: {},
                message: 'Module requires HTTPS or localhost'
            };
        }
        if (requirements.network && origin === 'file') {
            return {
                key: 'mod.compatibility.network',
                vars: {},
                message: 'Module requires a server-hosted network origin'
            };
        }
        const hostSnapshot = typeof YAW_HOST !== 'undefined'
            ? YAW_HOST.capabilities()
            : { hostId: 'browser', capabilities: {} };
        if (requirements.hosts.length && !requirements.hosts.includes(String(hostSnapshot.hostId || 'browser'))) {
            const hosts = requirements.hosts.join(', ');
            return {
                key: 'mod.compatibility.hosts',
                vars: { hosts },
                message: `Module requires one of these application hosts: ${hosts}`
            };
        }
        const missingCapabilities = requirements.capabilities.filter(capability => hostSnapshot.capabilities?.[capability] !== true);
        if (missingCapabilities.length) {
            const capabilities = missingCapabilities.join(', ');
            return {
                key: 'mod.compatibility.hostCapabilities',
                vars: { capabilities },
                message: `Application host is missing required capabilities: ${capabilities}`
            };
        }
        return null;
    },

    _runtimeCompatibilityBlockReason(manifest) {
        return this._runtimeCompatibilityBlock(manifest)?.message || null;
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
                setting.multiline = entry.multiline === true;
                setting.rows = setting.multiline ? Math.max(2, Math.min(12, Number(entry.rows) || 5)) : 1;
                const hardLimit = setting.multiline ? 2000 : 500;
                setting.maxLength = Math.max(1, Math.min(hardLimit, Number(entry.maxLength) || (setting.multiline ? 1200 : 120)));
                setting.default = String(entry.default || '').slice(0, setting.maxLength);
                this._assertSettingContainsNoCredentials(key, setting.default);
            }
            if (type === 'provider_connection') {
                setting.default = '';
                setting.capability = YAW_AI_PROVIDER_MANAGER.normalizeCapability(entry.capability || 'text.generate');
            }
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
        const runtimeRequirements = this._normalizeRuntimeRequirements(manifest.runtimeRequirements, manifest.hotToggleSafe);

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
            runtimeRequirements,
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
        if (declaration.type === 'string') {
            const normalized = String(value || '').replace(/\r\n?/g, '\n').slice(0, declaration.maxLength);
            this._assertSettingContainsNoCredentials(declaration.key, normalized);
            return normalized;
        }
        if (declaration.type === 'provider_connection') {
            const id = String(value || '');
            const profile = id ? YAW_AI_PROVIDER_MANAGER.profiles.get(id) : null;
            if (id && (!profile || !profile.capabilities.includes(declaration.capability || 'text.generate'))) {
                throw new Error('Provider connection is unavailable');
            }
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

    _assertLocalContentAccess(manifest) {
        if (typeof YAW_CONTENT_ACCESS === 'undefined'
            || typeof YAW_CONTENT_ACCESS.requirementsForManifest !== 'function'
            || typeof YAW_CONTENT_ACCESS.hasLocalGrant !== 'function'
            || typeof App === 'undefined') return;
        const requirements = YAW_CONTENT_ACCESS.requirementsForManifest(manifest);
        if (!YAW_CONTENT_ACCESS.hasLocalGrant(App, requirements)) {
            throw new Error(`Module ${manifest?.name || manifest?.id || 'content'} requires player content acknowledgement`);
        }
    },

    _normalizeHostPolicy(value = {}) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Host module policy must be an object');
        }
        const list = (key, fallback = []) => this._normalizeStringList(value[key] ?? fallback, `policy.${key}`);
        const required = list('required', value.lockedEnabled || []);
        const defaultEnabled = list('defaultEnabled');
        const optional = list('optional');
        const forbidden = list('forbidden', value.lockedDisabled || []);
        const stateById = {};
        for (const id of required) stateById[id] = 'required';
        for (const id of defaultEnabled) if (!stateById[id]) stateById[id] = 'default';
        for (const id of optional) if (!stateById[id]) stateById[id] = 'optional';
        for (const id of forbidden) stateById[id] = 'forbidden';
        if (value.modules !== undefined) {
            if (!value.modules || typeof value.modules !== 'object' || Array.isArray(value.modules)) {
                throw new Error('Host module policy.modules must be an object');
            }
            for (const [id, declaration] of Object.entries(value.modules)) {
                if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Host module policy ids must be module ids');
                const state = String(typeof declaration === 'string' ? declaration : declaration?.state || '').trim().toLowerCase();
                if (!['required', 'default', 'optional', 'forbidden'].includes(state)) {
                    throw new Error(`Host module policy for ${id} has an invalid state`);
                }
                stateById[id] = state;
            }
        }
        return {
            allowUserModules: value.allowUserModules !== false,
            stateById
        };
    },

    _sameOriginUrl(value, baseUrl = '') {
        const currentHref = String(baseUrl || (typeof window !== 'undefined' ? window.location?.href : '') || 'http://localhost/');
        let url;
        try {
            url = new URL(String(value || ''), currentHref);
        } catch (e) {
            throw new Error('Host module URL is invalid');
        }
        const current = new URL(currentHref);
        if (url.origin !== current.origin) throw new Error('Host module URLs must use the game origin');
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Host module URLs must use HTTP or HTTPS');
        return url.href;
    },

    _normalizeRemotePackageUrl(value) {
        let url;
        try {
            url = new URL(String(value || '').trim());
        } catch (error) {
            throw new Error('Remote package URI is invalid');
        }
        const hostname = String(url.hostname || '').toLowerCase();
        const loopback = hostname === 'localhost' || hostname === '::1' || /^127(?:\.\d{1,3}){3}$/.test(hostname);
        if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
            throw new Error('Remote packages require HTTPS, except for HTTP localhost or loopback development servers');
        }
        if (url.username || url.password) throw new Error('Remote package URIs cannot contain credentials');
        if (url.search) throw new Error('Remote package URIs cannot contain query parameters');
        if (url.hash) throw new Error('Remote package URIs cannot contain fragments');
        return url.href;
    },

    _normalizeRemoteIntegrity(value) {
        const integrity = String(value || '').trim();
        if (!integrity) return '';
        if (!/^(?:[a-f0-9]{64}|sha256-[A-Za-z0-9+/=]+)$/i.test(integrity)) {
            throw new Error('Expected SHA-256 must be 64 hexadecimal characters or a sha256- base64 value');
        }
        return integrity;
    },

    async _sha256Bytes(bytes) {
        const cryptoApi = typeof window !== 'undefined' ? window.crypto : null;
        if (!cryptoApi?.subtle?.digest) throw new Error('Remote package integrity verification is unavailable');
        const digest = new Uint8Array(await cryptoApi.subtle.digest('SHA-256', bytes));
        return {
            hex: Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join(''),
            bytes: digest
        };
    },

    _base64Bytes(bytes) {
        const encode = typeof window !== 'undefined' && typeof window.btoa === 'function' ? window.btoa.bind(window) : null;
        if (!encode) throw new Error('Remote package integrity verification is unavailable');
        return encode(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
    },

    _normalizeAssetBundlePackage(packageData, sourceUrl) {
        const normalizedPackage = YAW_ASSET_BUNDLE_V1.normalizePackage(packageData, { sourceUrl });
        if (typeof YAW_TILESET_PACK_V1 !== 'undefined') {
            const normalizedTilesets = YAW_TILESET_PACK_V1.normalizeBundle(normalizedPackage, {
                requiredKeys: typeof globalThis !== 'undefined' && globalThis.AssetManifest?.allTileKeys
                    ? globalThis.AssetManifest.allTileKeys()
                    : []
            });
            let index = 0;
            normalizedPackage.bundle.presentations = normalizedPackage.bundle.presentations.map(presentation => {
                if (String(presentation?.type || '') !== YAW_TILESET_PACK_V1.PRESENTATION_TYPE) return presentation;
                return normalizedTilesets[index++];
            });
        }
        if (typeof YAW_SPRITE_PACK_V1 !== 'undefined') {
            const normalizedSprites = YAW_SPRITE_PACK_V1.normalizeBundle(normalizedPackage);
            let index = 0;
            normalizedPackage.bundle.presentations = normalizedPackage.bundle.presentations.map(presentation => {
                if (String(presentation?.type || '') !== YAW_SPRITE_PACK_V1.PRESENTATION_TYPE) return presentation;
                return normalizedSprites[index++];
            });
        }
        return normalizedPackage;
    },

    async _readBoundedRemoteResponse(response) {
        const declaredLength = Number(response.headers?.get?.('content-length') || 0);
        if (declaredLength > this.REMOTE_PACKAGE_MAX_BYTES) {
            throw new Error(`Remote package exceeds the ${this.REMOTE_PACKAGE_MAX_BYTES} byte download limit`);
        }
        if (response.body?.getReader) {
            const reader = response.body.getReader();
            const chunks = [];
            let total = 0;
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    total += value.byteLength;
                    if (total > this.REMOTE_PACKAGE_MAX_BYTES) {
                        await reader.cancel();
                        throw new Error(`Remote package exceeds the ${this.REMOTE_PACKAGE_MAX_BYTES} byte download limit`);
                    }
                    chunks.push(value);
                }
            } finally {
                reader.releaseLock?.();
            }
            const bytes = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) {
                bytes.set(chunk, offset);
                offset += chunk.byteLength;
            }
            return bytes;
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > this.REMOTE_PACKAGE_MAX_BYTES) {
            throw new Error(`Remote package exceeds the ${this.REMOTE_PACKAGE_MAX_BYTES} byte download limit`);
        }
        return bytes;
    },

    async reviewRemoteModule(sourceUrl, expectedIntegrity = '', options = {}) {
        const url = this._normalizeRemotePackageUrl(sourceUrl);
        const expected = this._normalizeRemoteIntegrity(expectedIntegrity);
        const fetchApi = options.fetch || (typeof window !== 'undefined' ? window.fetch?.bind(window) : null);
        if (!fetchApi) throw new Error('Remote package loading is unavailable');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.REMOTE_PACKAGE_TIMEOUT_MS);
        let response;
        try {
            response = await fetchApi(url, {
                method: 'GET',
                credentials: 'omit',
                redirect: 'error',
                cache: 'no-store',
                referrerPolicy: 'no-referrer',
                headers: { Accept: 'application/json, text/json;q=0.9, text/plain;q=0.5' },
                signal: controller.signal
            });
        } catch (error) {
            clearTimeout(timer);
            if (controller.signal.aborted) throw new Error('Remote package download timed out');
            throw new Error(`Remote package download failed: ${error?.message || error}`);
        }
        if (!response.ok) {
            clearTimeout(timer);
            throw new Error(`Remote package returned HTTP ${response.status}`);
        }
        const responseUrl = this._normalizeRemotePackageUrl(response.url || url);
        if (responseUrl !== url) {
            clearTimeout(timer);
            throw new Error('Remote package redirects are not allowed');
        }
        const contentType = String(response.headers?.get?.('content-type') || '').split(';')[0].trim().toLowerCase();
        const allowedTypes = ['', 'application/json', 'text/json', 'text/plain', 'application/octet-stream'];
        if (!allowedTypes.includes(contentType)) {
            clearTimeout(timer);
            throw new Error(`Remote package returned unsupported content type ${contentType}`);
        }
        let bytes;
        try {
            bytes = await this._readBoundedRemoteResponse(response);
        } catch (error) {
            if (controller.signal.aborted) throw new Error('Remote package download timed out');
            throw error;
        } finally {
            clearTimeout(timer);
        }
        const digest = await this._sha256Bytes(bytes);
        const actualSRI = `sha256-${this._base64Bytes(digest.bytes)}`;
        if (expected && expected.toLowerCase() !== digest.hex.toLowerCase() && expected !== actualSRI) {
            throw new Error('Remote package failed SHA-256 integrity verification');
        }
        let text;
        try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch (error) {
            throw new Error('Remote package is not valid UTF-8 text');
        }
        let packageData;
        try {
            packageData = JSON.parse(text);
        } catch (error) {
            throw new Error('Remote package is not valid JSON');
        }
        if (String(packageData?.packageType || '') === YAW_ASSET_BUNDLE_V1.PACKAGE_TYPE) {
            const normalizedPackage = this._normalizeAssetBundlePackage(packageData, url);
            const bundle = normalizedPackage.bundle;
            this._assertGameVersionCompatible({ id: bundle.id, minGameVersion: bundle.minGameVersion });
            return {
                kind: 'asset_bundle_v1',
                packageData,
                bundle,
                sourceUrl: url,
                integrity: digest.hex,
                integrityVerified: Boolean(expected),
                byteLength: bytes.byteLength,
                contentType: contentType || 'unspecified',
                fetchedAt: Date.now()
            };
        }
        const validated = this._validateModuleData(this._normalizeModulePackage(packageData));
        this._assertGameVersionCompatible(validated.manifest);
        return {
            kind: 'module',
            packageData,
            manifest: validated.manifest,
            sourceUrl: url,
            integrity: digest.hex,
            integrityVerified: Boolean(expected),
            byteLength: bytes.byteLength,
            contentType: contentType || 'unspecified',
            fetchedAt: Date.now()
        };
    },

    async installReviewedRemoteModule(review) {
        if (!review || typeof review !== 'object' || !review.packageData) throw new Error('Review a remote module before installing it');
        if (review.kind && review.kind !== 'module') throw new Error('Reviewed package is not a module');
        const sourceUrl = this._normalizeRemotePackageUrl(review.sourceUrl);
        const integrity = this._normalizeRemoteIntegrity(review.integrity);
        if (!integrity) throw new Error('Reviewed remote module is missing its computed integrity digest');
        const validated = this._validateModuleData(this._normalizeModulePackage(review.packageData));
        if (validated.manifest.id !== review.manifest?.id || validated.manifest.version !== review.manifest?.version) {
            throw new Error('Reviewed remote module metadata changed before installation');
        }
        return this.installModule(review.packageData, {
            provenance: 'remote',
            sourceUrl,
            integrity,
            integrityVerified: review.integrityVerified === true,
            sourceFetchedAt: Number(review.fetchedAt) || Date.now(),
            sourceByteLength: Number(review.byteLength) || 0,
            sourceContentType: String(review.contentType || '').slice(0, 160)
        });
    },

    async getModuleAssetBundle(moduleId) {
        if (typeof YAW_MEDIA_REPOSITORY === 'undefined') return null;
        const metadata = await YAW_MEDIA_REPOSITORY.ownerMetadata(moduleId);
        return metadata?.kind === 'asset_bundle_v1' ? metadata : null;
    },

    async getModuleAssetBundleStatus(moduleId) {
        const bundle = await this.getModuleAssetBundle(moduleId);
        if (!bundle) return null;
        const health = await YAW_MEDIA_REPOSITORY.repairOwner(moduleId);
        return { ...bundle, health };
    },

    async installReviewedRemoteAssetBundle(review, options = {}) {
        if (!review || review.kind !== 'asset_bundle_v1' || !review.packageData) {
            throw new Error('Review an asset bundle before installing it');
        }
        const sourceUrl = this._normalizeRemotePackageUrl(review.sourceUrl);
        const integrity = this._normalizeRemoteIntegrity(review.integrity);
        if (!integrity) throw new Error('Reviewed asset bundle is missing its computed integrity digest');
        const normalizedPackage = this._normalizeAssetBundlePackage(review.packageData, sourceUrl);
        const bundle = normalizedPackage.bundle;
        if (bundle.id !== review.bundle?.id || bundle.version !== review.bundle?.version || bundle.targetModuleId !== review.bundle?.targetModuleId) {
            throw new Error('Reviewed asset bundle metadata changed before installation');
        }
        this._assertGameVersionCompatible({ id: bundle.id, minGameVersion: bundle.minGameVersion });
        this._assertContentRatingEnabled({ id: bundle.id, contentRating: bundle.contentRating });
        const module = this.moduleRecords.get(bundle.targetModuleId)
            || (await this.getAllModules()).find(record => record.id === bundle.targetModuleId);
        if (!module) throw new Error(`Install target module ${bundle.targetModuleId} before its asset bundle`);
        if (module.enabled === true || this.activeModules.has(bundle.targetModuleId)) {
            throw new Error(`Disable module ${bundle.targetModuleId} before installing or replacing its asset bundle`);
        }
        if (!module.manifest?.permissions?.includes('media:read')) {
            throw new Error(`Target module ${bundle.targetModuleId} must declare permission media:read`);
        }
        if (this._contentRatingTier(bundle.contentRating) > this._contentRatingTier(module.manifest.contentRating)) {
            throw new Error('Asset bundle contentRating cannot exceed its target module contentRating');
        }
        if (bundle.minModuleVersion && this._compareVersions(module.manifest.version, bundle.minModuleVersion) < 0) {
            throw new Error(`Asset bundle ${bundle.id} requires ${bundle.targetModuleId} version ${bundle.minModuleVersion} or newer`);
        }
        const ownerMetadata = YAW_ASSET_BUNDLE_V1.ownerMetadata(normalizedPackage, {
            sourceUrl,
            integrity,
            integrityVerified: review.integrityVerified === true
        });
        const result = await YAW_MEDIA_REPOSITORY.installFromSource(
            bundle.targetModuleId,
            YAW_ASSET_BUNDLE_V1.installationResources(normalizedPackage),
            {
                sourceId: options.sourceId || 'http',
                storeId: options.storeId || 'auto',
                signal: options.signal,
                onProgress: options.onProgress,
                ownerMetadata
            }
        );
        return { ...result, bundle: await this.getModuleAssetBundle(bundle.targetModuleId) };
    },

    async removeModuleAssetBundle(moduleId) {
        const module = this.moduleRecords.get(moduleId) || (await this.getAllModules()).find(record => record.id === moduleId);
        if (!module) throw new Error('Module not found');
        if (module.enabled === true || this.activeModules.has(moduleId)) {
            throw new Error(`Disable module ${moduleId} before removing its asset bundle`);
        }
        const existing = await this.getModuleAssetBundle(moduleId);
        if (!existing) return false;
        await YAW_MEDIA_REPOSITORY.removeOwner(moduleId);
        return true;
    },

    _normalizeHostCatalogEntry(value, baseUrl) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Host catalog entries must be objects');
        }
        const id = String(value.id || value.package?.packageId || value.package?.module?.manifest?.id || value.package?.manifest?.id || '').trim();
        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Host catalog entry id must be a module id');
        const version = String(value.version || value.package?.module?.manifest?.version || value.package?.manifest?.version || '').trim();
        if (!version) throw new Error(`Host catalog entry ${id} requires a version`);
        if (!value.url && !value.package) throw new Error(`Host catalog entry ${id} requires url or package`);
        const sha256 = String(value.sha256 || '').trim();
        if (sha256 && !/^(?:[a-f0-9]{64}|sha256-[A-Za-z0-9+/=]+)$/i.test(sha256)) {
            throw new Error(`Host catalog entry ${id} has an invalid sha256 value`);
        }
        return {
            id,
            name: String(value.name || value.package?.module?.manifest?.name || value.package?.manifest?.name || id).trim().slice(0, 120),
            version,
            description: String(value.description || value.package?.module?.manifest?.description || value.package?.manifest?.description || '').trim().slice(0, 500),
            type: String(value.type || value.package?.module?.manifest?.type || value.package?.manifest?.type || 'feature_pack').trim(),
            contentRating: String(value.contentRating || value.package?.module?.manifest?.contentRating || value.package?.manifest?.contentRating || 'safe').trim().toLowerCase(),
            preview: String(value.preview || '📦').slice(0, 16),
            url: value.url ? this._sameOriginUrl(value.url, baseUrl) : '',
            sha256,
            preload: value.preload === true,
            package: value.package || null,
            runtimeRequirements: this._normalizeRuntimeRequirements(value.runtimeRequirements)
        };
    },

    normalizeHostManifest(value, manifestUrl = '') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Host manifest must be an object');
        if (String(value.schema || '') !== this.HOST_MANIFEST_SCHEMA) {
            throw new Error(`Host manifest schema must be ${this.HOST_MANIFEST_SCHEMA}`);
        }
        const hostId = String(value.hostId || 'default-host').trim();
        if (!hostId || !/^[a-zA-Z0-9_.:-]+$/.test(hostId)) throw new Error('Host manifest hostId must be a token');
        const catalog = (Array.isArray(value.catalog) ? value.catalog : []).map(entry => this._normalizeHostCatalogEntry(entry, manifestUrl));
        const ids = new Set();
        for (const entry of catalog) {
            if (ids.has(entry.id)) throw new Error(`Duplicate host catalog module: ${entry.id}`);
            ids.add(entry.id);
        }
        const policy = this._normalizeHostPolicy(value.policy || {});
        for (const [id, state] of Object.entries(policy.stateById)) {
            if (state !== 'forbidden' && !ids.has(id)) throw new Error(`Host policy references missing catalog module ${id}`);
        }
        return {
            schema: this.HOST_MANIFEST_SCHEMA,
            hostId,
            catalog,
            policy,
            strictWorldModules: value.strictWorldModules === true,
            manifestUrl: String(manifestUrl || '')
        };
    },

    _hostManifestDiscoveryUrl() {
        if (this._runtimeOrigin() === 'file') return '';
        const declared = typeof document !== 'undefined'
            ? document.querySelector('meta[name="yaw-host-manifest"]')?.getAttribute('content')
            : '';
        const href = typeof window !== 'undefined' ? window.location?.href : '';
        return this._sameOriginUrl(declared || this.DEFAULT_HOST_MANIFEST_PATH, href);
    },

    async _sha256Matches(text, expected) {
        if (!expected) return true;
        const cryptoApi = typeof window !== 'undefined' ? window.crypto : null;
        if (!cryptoApi?.subtle?.digest) throw new Error('Host package integrity verification is unavailable');
        const bytes = new TextEncoder().encode(String(text));
        const digest = new Uint8Array(await cryptoApi.subtle.digest('SHA-256', bytes));
        if (/^[a-f0-9]{64}$/i.test(expected)) {
            const hex = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
            return hex.toLowerCase() === expected.toLowerCase();
        }
        const binary = Array.from(digest, byte => String.fromCharCode(byte)).join('');
        const encode = typeof window !== 'undefined' && typeof window.btoa === 'function' ? window.btoa.bind(window) : null;
        if (!encode) throw new Error('Host package integrity verification is unavailable');
        return `sha256-${encode(binary)}` === expected;
    },

    async _fetchHostPackage(entry) {
        if (entry.package) return entry.package;
        const fetchApi = typeof window !== 'undefined' ? window.fetch?.bind(window) : null;
        if (!fetchApi) throw new Error('Host package loading is unavailable');
        const response = await fetchApi(entry.url, {
            method: 'GET',
            credentials: 'same-origin',
            redirect: 'error',
            cache: 'no-cache',
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`Host package ${entry.id} returned HTTP ${response.status}`);
        const text = await response.text();
        if (!(await this._sha256Matches(text, entry.sha256))) throw new Error(`Host package ${entry.id} failed integrity verification`);
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error(`Host package ${entry.id} is not valid JSON`);
        }
    },

    hostPolicyState(moduleId) {
        return this.hostManifest?.policy?.stateById?.[String(moduleId)] || '';
    },

    moduleControlState(module) {
        const record = module || {};
        const provenance = this._normalizeProvenance(record.provenance || 'user');
        const policyState = this.hostPolicyState(record.id);
        const compatibility = this._runtimeCompatibilityBlock(record.manifest || {});
        const compatibilityReason = compatibility?.message || null;
        const userBlocked = Boolean(this.hostManifest && ['user', 'remote'].includes(provenance) && this.hostManifest.policy.allowUserModules === false);
        const policyReason = policyState === 'required'
            ? { key: 'mod.control.required', vars: {}, message: 'Required by this host' }
            : (policyState === 'forbidden'
                ? { key: 'mod.control.forbidden', vars: {}, message: 'Disabled by this host' }
                : (userBlocked
                    ? { key: 'mod.control.userModulesDisabled', vars: {}, message: 'User-installed modules are disabled by this host' }
                    : null));
        const reason = compatibility || policyReason;
        return {
            provenance,
            policyState,
            lockedEnabled: policyState === 'required',
            lockedDisabled: policyState === 'forbidden',
            canDelete: ['user', 'remote'].includes(provenance),
            canEnable: policyState !== 'forbidden' && !userBlocked && !compatibilityReason,
            canDisable: policyState !== 'required',
            compatibilityReason,
            compatibilityReasonKey: compatibility?.key || '',
            compatibilityReasonVars: compatibility?.vars || {},
            reason: reason?.message || '',
            reasonKey: reason?.key || '',
            reasonVars: reason?.vars || {}
        };
    },

    _assertModuleControl(module, enabled, options = {}) {
        if (options.bypassHostPolicy !== true) {
            const control = this.moduleControlState(module);
            if (enabled && !control.canEnable) throw new Error(control.reason || 'Module cannot be enabled in this hosted game');
            if (!enabled && !control.canDisable) throw new Error(control.reason || 'Module is required by this host');
        }
        if (enabled) {
            const compatibilityReason = this._runtimeCompatibilityBlockReason(module.manifest || {});
            if (compatibilityReason) throw new Error(compatibilityReason);
        }
        const inActiveWorld = typeof App !== 'undefined' && App.screen === 'game' && App.player;
        const hotToggleSafe = module.manifest?.runtimeRequirements?.hotToggleSafe === true;
        if (inActiveWorld && !hotToggleSafe && options.bypassLifecycle !== true) {
            throw new Error('Module changes require returning to the menu or reloading the world');
        }
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

    async initializeHostCatalog(options = {}) {
        if (this._runtimeOrigin() === 'file') {
            this.hostManifest = null;
            this.hostCatalog.clear();
            this.hostManifestState = { status: 'offline-file', reason: 'File mode does not load host manifests', url: '' };
            return this.hostManifestState;
        }
        let url = '';
        try {
            url = options.url ? this._sameOriginUrl(options.url) : this._hostManifestDiscoveryUrl();
            const fetchApi = options.fetch || (typeof window !== 'undefined' ? window.fetch?.bind(window) : null);
            if (!fetchApi) throw new Error('Host manifest loading is unavailable');
            const response = await fetchApi(url, {
                method: 'GET',
                credentials: 'same-origin',
                redirect: 'error',
                cache: 'no-cache',
                headers: { Accept: 'application/json' }
            });
            if (response.status === 404 || response.status === 204) {
                this.hostManifest = null;
                this.hostCatalog.clear();
                this.hostManifestState = { status: 'not-configured', reason: '', url };
                return this.hostManifestState;
            }
            if (!response.ok) throw new Error(`Host manifest returned HTTP ${response.status}`);
            const manifest = this.normalizeHostManifest(await response.json(), url);
            this.hostManifest = manifest;
            this.hostCatalog = new Map(manifest.catalog.map(entry => [entry.id, entry]));
            this.hostManifestState = { status: 'loaded', reason: '', url, hostId: manifest.hostId };
            await this.getAllModules();

            const previousById = new Map(this.moduleRecords);
            const replacedEnabled = new Set();
            for (const entry of manifest.catalog) {
                const state = this.hostPolicyState(entry.id);
                if (!entry.preload && !['required', 'default'].includes(state)) continue;
                const previous = previousById.get(entry.id) || null;
                const needsInstall = !previous
                    || previous.provenance !== 'host'
                    || String(previous.manifest?.version || '') !== entry.version
                    || String(previous.integrity || '') !== entry.sha256;
                if (needsInstall) {
                    if (previous?.enabled) replacedEnabled.add(entry.id);
                    const installed = await this.installHostCatalogModule(entry.id, { enable: false });
                    for (const dependent of installed.disabledDependents || []) replacedEnabled.add(dependent.id);
                }
            }
            const enableIds = new Set();
            const defaultIds = new Set();
            for (const entry of manifest.catalog) {
                const state = this.hostPolicyState(entry.id);
                const previous = previousById.get(entry.id) || null;
                if (state === 'required' || replacedEnabled.has(entry.id)) enableIds.add(entry.id);
                if (state === 'default' && !previous) {
                    enableIds.add(entry.id);
                    defaultIds.add(entry.id);
                }
            }
            for (const id of replacedEnabled) enableIds.add(id);
            const addDependencies = id => {
                const module = this.moduleRecords.get(id);
                for (const dependencyId of module?.manifest?.dependencies || []) {
                    if (!this.moduleRecords.has(dependencyId)) throw new Error(`Host module ${id} requires missing dependency ${dependencyId}`);
                    if (!enableIds.has(dependencyId)) {
                        enableIds.add(dependencyId);
                        addDependencies(dependencyId);
                    }
                }
            };
            [...enableIds].forEach(addDependencies);
            const pendingEnable = new Set([...enableIds].filter(id => !this.moduleRecords.get(id)?.enabled));
            while (pendingEnable.size) {
                const ready = [...pendingEnable].find(id => (this.moduleRecords.get(id)?.manifest?.dependencies || []).every(dependencyId => !pendingEnable.has(dependencyId)));
                if (!ready) throw new Error('Host module dependency cycle prevented enablement');
                const enabledModule = await this.setModuleEnabled(ready, true, { bypassLifecycle: true });
                if (defaultIds.has(ready)) {
                    enabledModule.hostDefaultApplied = true;
                    await this._storeModuleRecord(enabledModule);
                }
                pendingEnable.delete(ready);
            }
            await this.enforceHostPolicy();
            return this.hostManifestState;
        } catch (error) {
            this.hostManifest = null;
            this.hostCatalog.clear();
            this.hostManifestState = { status: 'error', reason: error?.message || String(error), url };
            console.warn('Host module manifest was not loaded:', error);
            return this.hostManifestState;
        }
    },

    async installHostCatalogModule(moduleId, options = {}) {
        const entry = this.hostCatalog.get(String(moduleId));
        if (!entry) throw new Error('Host catalog module not found');
        const packageData = await this._fetchHostPackage(entry);
        const normalizedPackage = this._normalizeModulePackage(packageData);
        const validated = this._validateModuleData(normalizedPackage);
        if (validated.manifest.id !== entry.id) throw new Error(`Host package id does not match catalog entry ${entry.id}`);
        if (validated.manifest.version !== entry.version) throw new Error(`Host package version does not match catalog entry ${entry.id}`);
        const installed = await this.installModule(packageData, {
            provenance: 'host',
            hostId: this.hostManifest?.hostId || '',
            sourceUrl: entry.url,
            integrity: entry.sha256,
            hostPolicyState: this.hostPolicyState(entry.id)
        });
        if (options.enable === true) {
            try {
                return await this.setModuleEnabled(installed.id, true, { bypassLifecycle: options.bypassLifecycle === true });
            } catch (error) {
                error.installedModule = installed;
                throw error;
            }
        }
        return installed;
    },

    async enforceHostPolicy() {
        if (!this.hostManifest) return [];
        const modules = await this.getAllModules();
        const changed = [];
        for (const module of modules) {
            const state = this.hostPolicyState(module.id);
            const userBlocked = ['user', 'remote'].includes(module.provenance) && this.hostManifest.policy.allowUserModules === false;
            if ((state === 'forbidden' || userBlocked) && module.enabled) {
                changed.push(await this.setModuleEnabled(module.id, false, { bypassHostPolicy: true, bypassLifecycle: true }));
            }
        }
        for (const [id, state] of Object.entries(this.hostManifest.policy.stateById)) {
            if (state !== 'required') continue;
            let module = this.moduleRecords.get(id);
            if (!module && this.hostCatalog.has(id)) module = await this.installHostCatalogModule(id, { enable: false });
            if (module && !module.enabled) changed.push(await this.setModuleEnabled(id, true, { bypassLifecycle: true }));
        }
        return changed;
    },

    getHostCatalog() {
        return [...this.hostCatalog.values()].map(entry => {
            const installed = this.moduleRecords.get(entry.id) || null;
            const manifest = installed?.manifest || { runtimeRequirements: entry.runtimeRequirements };
            const control = this.moduleControlState({
                id: entry.id,
                provenance: 'host',
                manifest
            });
            return {
                ...entry,
                provenance: 'host',
                hostId: this.hostManifest?.hostId || '',
                policyState: this.hostPolicyState(entry.id) || 'optional',
                installed: Boolean(installed),
                enabled: Boolean(installed?.enabled),
                compatibilityReason: control.compatibilityReason,
                compatibilityReasonKey: control.compatibilityReasonKey,
                compatibilityReasonVars: control.compatibilityReasonVars
            };
        });
    },

    contentProfileSnapshot() {
        const modules = [...this.moduleRecords.values()]
            .filter(module => module.enabled === true)
            .map(module => ({
                id: module.id,
                version: String(module.manifest?.version || ''),
                integrity: String(module.integrity || ''),
                provenance: this._normalizeProvenance(module.provenance || 'user')
            }))
            .sort((a, b) => a.id.localeCompare(b.id));
        return {
            schema: this.CONTENT_PROFILE_SCHEMA,
            hostId: this.hostManifest?.hostId || '',
            strict: this.hostManifest?.strictWorldModules === true,
            modules
        };
    },

    async _resolveContentProfile(profile) {
        if (!profile) return true;
        if (!profile || typeof profile !== 'object' || profile.schema !== this.CONTENT_PROFILE_SCHEMA || !Array.isArray(profile.modules)) {
            throw new Error('Save has an invalid module content profile');
        }
        if (profile.hostId && this.hostManifest?.hostId && profile.hostId !== this.hostManifest.hostId) {
            throw new Error(`Save requires host ${profile.hostId}`);
        }
        await this.getAllModules();
        const resolved = new Map();
        for (const lock of profile.modules) {
            const id = String(lock?.id || '');
            if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Save module content profile contains an invalid module id');
            let module = this.moduleRecords.get(id);
            if (!module && this.hostCatalog.has(id)) module = await this.installHostCatalogModule(id, { enable: false });
            if (!module) throw new Error(`Save requires missing module ${id}`);
            if (String(module.manifest?.version || '') !== String(lock.version || '')) {
                throw new Error(`Save requires module ${id} version ${lock.version}`);
            }
            if (lock.integrity && String(module.integrity || '') !== String(lock.integrity)) {
                throw new Error(`Save requires a different build of module ${id}`);
            }
            resolved.set(id, module);
        }
        if (profile.strict === true) {
            const requiredIds = new Set(profile.modules.map(module => String(module.id)));
            const extras = [...this.moduleRecords.values()].filter(module => module.enabled && !requiredIds.has(module.id));
            if (extras.length) throw new Error(`Save does not allow additional enabled modules: ${extras.map(module => module.id).join(', ')}`);
        }
        return resolved;
    },

    async contentAccessRequirementsForProfile(profile) {
        if (!profile) return { rating: 'safe', categories: [] };
        const resolved = await this._resolveContentProfile(profile);
        if (typeof YAW_CONTENT_ACCESS !== 'undefined' && typeof YAW_CONTENT_ACCESS.requirementsForManifests === 'function') {
            return YAW_CONTENT_ACCESS.requirementsForManifests(
                [...resolved.values()].map(module => module.manifest)
            );
        }
        const categories = new Set();
        let rating = 'safe';
        for (const module of resolved.values()) {
            const manifestRating = String(module.manifest?.contentRating || 'safe').trim().toLowerCase();
            if (manifestRating === 'mature' || manifestRating === 'adult') rating = 'mature';
            if (manifestRating === 'adult') categories.add('explicit.sexual');
            for (const category of module.manifest?.contentCategories || []) {
                if (category.required !== false) categories.add(category.id);
            }
        }
        return { rating, categories: [...categories].sort() };
    },

    async assertContentProfile(profile) {
        if (!profile) return true;
        const resolved = await this._resolveContentProfile(profile);
        const pendingEnable = new Set([...resolved.values()].filter(module => !module.enabled).map(module => module.id));
        while (pendingEnable.size) {
            const ready = [...pendingEnable].find(id => (resolved.get(id)?.manifest?.dependencies || [])
                .every(dependencyId => !pendingEnable.has(dependencyId)));
            if (!ready) throw new Error('Save module dependency cycle prevented enablement');
            await this.setModuleEnabled(ready, true, { bypassLifecycle: true });
            pendingEnable.delete(ready);
        }
        return true;
    },
    
    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = async () => {
                this.db = request.result;
                if (typeof YAW_MEDIA_REPOSITORY !== 'undefined') {
                    YAW_MEDIA_REPOSITORY.attachDatabase(this.db);
                    YAW_MEDIA_REPOSITORY.setLogger(event => {
                        if (typeof App === 'undefined' || !Array.isArray(App.log)) return;
                        const details = event?.details || {};
                        const detail = details.message || details.providerId || details.ownerId || '';
                        App.log.push({
                            text: `[Media] ${String(event?.code || 'media_event')}${detail ? `: ${String(detail).slice(0, 300)}` : ''}`,
                            type: event?.type === 'error' ? 'error' : 'discovery'
                        });
                        App.renderLog?.();
                    });
                }
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

                if (!db.objectStoreNames.contains('mediaPayloads')) {
                    db.createObjectStore('mediaPayloads', { keyPath: 'hash' });
                }

                if (!db.objectStoreNames.contains('mediaStaging')) {
                    const stagingStore = db.createObjectStore('mediaStaging', { keyPath: 'id' });
                    stagingStore.createIndex('batchId', 'batchId', { unique: false });
                    stagingStore.createIndex('hash', 'hash', { unique: false });
                }

                if (!db.objectStoreNames.contains('mediaCatalog')) {
                    const catalogStore = db.createObjectStore('mediaCatalog', { keyPath: 'id' });
                    catalogStore.createIndex('ownerId', 'ownerId', { unique: false });
                    catalogStore.createIndex('hash', 'hash', { unique: false });
                    catalogStore.createIndex('providerId', 'providerId', { unique: false });
                }

                if (!db.objectStoreNames.contains('mediaRefs')) {
                    const refStore = db.createObjectStore('mediaRefs', { keyPath: 'id' });
                    refStore.createIndex('hash', 'hash', { unique: false });
                    refStore.createIndex('providerId', 'providerId', { unique: false });
                }

                if (!db.objectStoreNames.contains('mediaOwners')) {
                    const ownerStore = db.createObjectStore('mediaOwners', { keyPath: 'ownerId' });
                    ownerStore.createIndex('kind', 'kind', { unique: false });
                    ownerStore.createIndex('bundleId', 'bundleId', { unique: false });
                }
            };
        });
    },

    async loadEnabledModules() {
        const enabled = (await this.getAllModules()).filter(module => module.enabled === true);
        const pending = new Map(enabled.map(module => [module.id, module]));
        const loaded = [];
        let progressed = true;
        while (pending.size && progressed) {
            progressed = false;
            for (const [moduleId, module] of [...pending.entries()]) {
                const manifest = this._normalizeManifest(module.manifest);
                if (manifest.dependencies.some(dependencyId => pending.has(dependencyId))) continue;
                pending.delete(moduleId);
                progressed = true;
                const dependenciesReady = manifest.dependencies.every(dependencyId => this.activeModules.has(dependencyId));
                if (!dependenciesReady) {
                    console.error(`Enabled module dependencies are unavailable: ${manifest.name}`);
                    continue;
                }
                try {
                    const control = this.moduleControlState({ ...module, manifest });
                    if (!control.canEnable) throw new Error(control.reason || 'Module is unavailable in this runtime');
                    this._assertLocalContentAccess(manifest);
                    this._assertContentRatingEnabled(manifest);
                    await this.loadModule({ ...module, manifest });
                    this._syncContentPolicyProvider({ ...module, manifest });
                    loaded.push(moduleId);
                } catch (error) {
                    console.error(`Failed to restore enabled module ${moduleId}:`, error);
                }
            }
        }
        return loaded;
    },

    closeDatabase() {
        if (typeof YAW_MEDIA_REPOSITORY !== 'undefined') YAW_MEDIA_REPOSITORY.close();
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
    async installModule(moduleData, options = {}) {
        const packageModuleData = this._normalizeModulePackage(moduleData);
        const validated = this._validateModuleData(packageModuleData);
        this._assertGameVersionCompatible(validated.manifest);
        const provenance = this._normalizeProvenance(options.provenance || 'user');
        const module = {
            id: validated.manifest.id,
            manifest: validated.manifest,
            code: validated.code,
            assets: validated.assets,
            enabled: false,
            installedAt: Date.now(),
            provenance,
            hostId: provenance === 'host' ? String(options.hostId || '').slice(0, 160) : '',
            sourceUrl: ['host', 'remote'].includes(provenance) ? String(options.sourceUrl || '').slice(0, 1000) : '',
            integrity: ['host', 'remote'].includes(provenance) ? String(options.integrity || '') : '',
            integrityVerified: provenance === 'remote' && options.integrityVerified === true,
            sourceFetchedAt: provenance === 'remote' ? Number(options.sourceFetchedAt) || Date.now() : 0,
            sourceByteLength: provenance === 'remote' ? Math.max(0, Number(options.sourceByteLength) || 0) : 0,
            sourceContentType: provenance === 'remote' ? String(options.sourceContentType || '').slice(0, 160) : '',
            hostPolicyState: provenance === 'host' ? String(options.hostPolicyState || '') : ''
        };
        
        const db = this._requireDb();
        const tx = db.transaction(['modules', 'assets'], 'readwrite');
        const store = tx.objectStore('modules');
        const assetStore = tx.objectStore('assets');
        const previous = await this._request(store.get(module.id));
        if (previous?.provenance === 'host' && provenance !== 'host') {
            throw new Error('A player-installed module cannot replace a host-supplied module');
        }
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

        if (previous && options.preserveMedia !== true && typeof YAW_MEDIA_REPOSITORY !== 'undefined') {
            await YAW_MEDIA_REPOSITORY.removeOwner(module.id);
        }

        if (previous?.enabled || this.activeModules.has(module.id)) {
            this.unloadModule(module.id);
            module.disabledDependents = await this._disableDependentsOf(module.id);
        }
        this._syncContentPolicyProvider(module);
        this.moduleRecords.set(module.id, module);
        
        console.log(`Module installed: ${module.manifest.name}`);
        return module;
    },

    async installModuleMedia(moduleId, resources, options = {}) {
        const module = this.moduleRecords.get(moduleId) || (await this.getAllModules()).find(record => record.id === moduleId);
        if (!module) throw new Error('Module not found');
        if (typeof YAW_MEDIA_REPOSITORY === 'undefined') throw new Error('Media repository is unavailable');
        return YAW_MEDIA_REPOSITORY.installFromSource(moduleId, resources, options);
    },
    
    // Enable/disable module
    async setModuleEnabled(moduleId, enabled, options = {}) {
        const db = this._requireDb();
        const tx = db.transaction(['modules'], 'readwrite');
        const store = tx.objectStore('modules');
        
        const module = await this._request(store.get(moduleId));
        if (!module) throw new Error('Module not found');
        module.provenance = this._normalizeProvenance(module.provenance || 'user');
        this._assertModuleControl(module, Boolean(enabled), options);

        if (enabled) {
            const validated = this._validateModuleData(module);
            module.manifest = validated.manifest;
            module.code = validated.code;
            module.assets = validated.assets;
            this._assertGameVersionCompatible(module.manifest);
            this._assertLocalContentAccess(module.manifest);
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
            this.moduleRecords.set(module.id, module);
            return module;
        }

        module.enabled = false;
        await this._request(store.put(module));
        await this._transactionDone(tx);

        this.unloadModule(moduleId);
        module.disabledDependents = await this._disableDependentsOf(moduleId);
        this._syncContentPolicyProvider(module);
        this.moduleRecords.set(module.id, module);
        
        return module;
    },

    async _storeModuleRecord(module) {
        const db = this._requireDb();
        const tx = db.transaction(['modules'], 'readwrite');
        const store = tx.objectStore('modules');
        await this._request(store.put(module));
        await this._transactionDone(tx);
        this.moduleRecords.set(module.id, module);
        return module;
    },

    async _disableDependentsOf(moduleId) {
        const modules = await this.getAllModules();
        const disabled = [];
        for (const module of modules) {
            if (!module.enabled || module.id === moduleId) continue;
            const manifest = this._normalizeManifest(module.manifest);
            if (!manifest.dependencies.includes(moduleId)) continue;
            const disabledModule = await this.setModuleEnabled(module.id, false, { bypassLifecycle: true });
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

            const disabledModule = await this.setModuleEnabled(module.id, false, { bypassLifecycle: true });
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
            this._evaluateModuleContributions(module.id);
            App.refreshLanguagePresentation?.();

            if (typeof YAW_TILESET_RUNTIME !== 'undefined') {
                try {
                    await YAW_TILESET_RUNTIME.activateModule(module.id);
                } catch (error) {
                    YAW_MEDIA_REPOSITORY?.diagnostic?.('tileset_activation_failed', {
                        ownerId: module.id,
                        message: error.code || error.message || 'tileset_error'
                    }, 'error');
                }
            }
            if (typeof YAW_SPRITE_RUNTIME !== 'undefined') {
                try {
                    await YAW_SPRITE_RUNTIME.activateModule(module.id);
                } catch (error) {
                    YAW_MEDIA_REPOSITORY?.diagnostic?.('sprite_activation_failed', {
                        ownerId: module.id,
                        message: error.code || error.message || 'sprite_error'
                    }, 'error');
                }
            }
            if (typeof YAW_AUDIO_RUNTIME !== 'undefined') {
                try {
                    await YAW_AUDIO_RUNTIME.activateModule(module.id);
                } catch (error) {
                    console.warn(`Audio pack activation failed for ${module.id}: ${error?.message || error}`);
                }
            }
            
            App.initSpeciesGrid?.();
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
                biomeRecipes: [],
                species: new Set(),
                speciesProfiles: [],
                items: new Set(),
                itemPlacements: [],
                questTemplates: new Map(),
                questPlacements: [],
                templates: [],
                sceneTemplates: [],
                locales: [],
                localeDefinitions: [],
                actionVariants: [],
                resourceProfiles: [],
                statusEffects: [],
                restraintProfiles: [],
                actionProfiles: [],
                bodyProfiles: [],
                combatTechniques: [],
                recoveryModes: [],
                perkProfiles: [],
                uiContributions: []
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

    _addOwnedBiomeRecipe(moduleId, recipeId, definition) {
        if (typeof YAW_BIOME_RECIPES === 'undefined') throw new Error('Biome Recipe V1 is unavailable');
        const biome = String(definition?.biome || '').trim();
        if (!biome || !this._contributionRecord(moduleId).biomes.has(biome)) {
            throw new Error('Biome recipe must target a biome contributed by the same module');
        }
        const profile = YAW_BIOME_RECIPES.register(moduleId, recipeId, definition);
        this._contributionRecord(moduleId).biomeRecipes.push({ key: profile.key });
        return {
            version: profile.version,
            id: profile.id,
            key: profile.key,
            biome: profile.biome,
            mode: profile.mode,
            weight: profile.weight,
            minDistance: profile.minDistance,
            maxDistance: profile.maxDistance,
            replaces: [...profile.replaces],
            salt: profile.salt
        };
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

    _assertKnownKeys(value, allowed, label) {
        for (const key of Object.keys(value || {})) {
            if (!allowed.includes(key)) throw new Error(`${label} contains unsupported field ${key}`);
        }
    },

    _normalizeProfileBooleanMap(value, allowed, label) {
        if (value == null) return {};
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
        this._assertKnownKeys(value, allowed, label);
        const normalized = {};
        for (const [key, enabled] of Object.entries(value)) {
            if (typeof enabled !== 'boolean') throw new Error(`${label}.${key} must be boolean`);
            if (enabled) normalized[key] = true;
        }
        return normalized;
    },

    _normalizeSpeciesProfile(speciesDef) {
        if (speciesDef.profile == null) return null;
        const profile = speciesDef.profile;
        if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error('Species profile must be an object');
        this._assertKnownKeys(profile, ['version', 'baseStats', 'size', 'difficulty', 'bodyParts', 'bodyProfile', 'abilities', 'temperament', 'canon', 'encounters'], 'Species profile');
        const version = Number(profile.version ?? this.SPECIES_PROFILE_VERSION);
        if (version !== this.SPECIES_PROFILE_VERSION) throw new Error(`Unsupported species profile version ${profile.version}`);

        const baseStats = { ...this.SPECIES_PROFILE_DEFAULT_STATS };
        if (profile.baseStats != null) {
            if (!profile.baseStats || typeof profile.baseStats !== 'object' || Array.isArray(profile.baseStats)) throw new Error('Species profile baseStats must be an object');
            this._assertKnownKeys(profile.baseStats, Object.keys(baseStats), 'Species profile baseStats');
            const broadStats = new Set(['MPun', 'MPle']);
            for (const [key, raw] of Object.entries(profile.baseStats)) {
                const value = Number(raw);
                const min = key === 'hunger' ? 0 : (broadStats.has(key) ? 20 : 1);
                const max = key === 'hunger' ? 100 : (broadStats.has(key) ? 300 : 30);
                if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Species profile baseStats.${key} must be between ${min} and ${max}`);
                baseStats[key] = Math.round(value);
            }
        }

        const boundedInteger = (raw, fallback, min, max, label) => {
            const value = Number(raw ?? fallback);
            if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be an integer between ${min} and ${max}`);
            return value;
        };
        const size = boundedInteger(profile.size, 4, 1, 8, 'Species profile size');
        const difficulty = boundedInteger(profile.difficulty, 2, 1, 5, 'Species profile difficulty');

        const bodyParts = profile.bodyParts == null ? [] : profile.bodyParts;
        if (!Array.isArray(bodyParts) || bodyParts.length > 11) throw new Error('Species profile bodyParts must be an array with at most 11 entries');
        const normalizedParts = [...new Set(bodyParts.map(part => String(part || '').trim()))];
        for (const part of normalizedParts) {
            if (!this.SPECIES_PROFILE_BODY_PARTS.includes(part)) throw new Error(`Species profile bodyParts contains unsupported part ${part}`);
        }
        const bodyProfile = profile.bodyProfile == null ? '' : String(profile.bodyProfile).trim();
        if (bodyProfile && !/^[a-zA-Z0-9_.:-]+:[a-zA-Z0-9_.:-]+$/.test(bodyProfile)) {
            throw new Error('Species profile bodyProfile must be a namespaced body profile key');
        }

        const canon = profile.canon == null ? {} : profile.canon;
        if (!canon || typeof canon !== 'object' || Array.isArray(canon)) throw new Error('Species profile canon must be an object');
        this._assertKnownKeys(canon, ['sapience', 'bodyPlan', 'baselineInteraction', 'adultEligibility', 'interactionEligibility', 'traits'], 'Species profile canon');
        const normalizedCanon = {};
        if (canon.sapience != null) {
            const sapience = String(canon.sapience);
            if (!['person', 'spirit', 'animal'].includes(sapience)) throw new Error('Species profile canon.sapience is unsupported');
            normalizedCanon.sapience = sapience;
        }
        if (canon.bodyPlan != null) {
            const bodyPlan = String(canon.bodyPlan).trim();
            if (!/^[a-z][a-z0-9-]{0,39}$/.test(bodyPlan)) throw new Error('Species profile canon.bodyPlan must be a bounded identifier');
            normalizedCanon.bodyPlan = bodyPlan;
        }
        if (canon.baselineInteraction != null) {
            const baseline = String(canon.baselineInteraction);
            if (!['sapient', 'animal', 'none'].includes(baseline)) throw new Error('Species profile canon.baselineInteraction is unsupported');
            normalizedCanon.baselineInteraction = baseline;
        }
        if (canon.adultEligibility != null) {
            const eligibility = String(canon.adultEligibility).toLowerCase();
            if (!['eligible', 'ineligible', 'unknown'].includes(eligibility)) throw new Error('Species profile canon.adultEligibility is unsupported');
            normalizedCanon.adultEligibility = eligibility;
        }
        normalizedCanon.interactionEligibility = this._normalizeProfileBooleanMap(canon.interactionEligibility, this.SPECIES_PROFILE_INTERACTIONS, 'Species profile canon.interactionEligibility');
        const traits = canon.traits == null ? [] : canon.traits;
        if (!Array.isArray(traits) || traits.length > 16) throw new Error('Species profile canon.traits must be an array with at most 16 entries');
        normalizedCanon.traits = [...new Set(traits.map(trait => String(trait || '').trim()).filter(Boolean))];
        if (normalizedCanon.traits.some(trait => trait.length > 50)) throw new Error('Species profile canon.traits entries must be 50 characters or fewer');

        const encounterDefs = profile.encounters == null ? [] : profile.encounters;
        if (!Array.isArray(encounterDefs) || encounterDefs.length > 24) throw new Error('Species profile encounters must be an array with at most 24 entries');
        const encounters = encounterDefs.map((encounter, index) => {
            if (!encounter || typeof encounter !== 'object' || Array.isArray(encounter)) throw new Error(`Species profile encounters[${index}] must be an object`);
            this._assertKnownKeys(encounter, ['biome', 'table', 'weight'], `Species profile encounters[${index}]`);
            const biome = String(encounter.biome || '').trim();
            const table = String(encounter.table || 'hostile');
            const weight = boundedInteger(encounter.weight, 5, 1, 100, `Species profile encounters[${index}].weight`);
            if (!biome || !App.biomes?.[biome]) throw new Error(`Species profile encounter biome ${biome || '(missing)'} is unavailable`);
            if (!['hostile', 'friendly'].includes(table)) throw new Error(`Species profile encounters[${index}].table must be hostile or friendly`);
            return { biome, table, weight };
        });

        return {
            version,
            baseStats,
            size,
            difficulty,
            bodyParts: normalizedParts,
            bodyProfile,
            abilities: this._normalizeProfileBooleanMap(profile.abilities, this.SPECIES_PROFILE_ABILITIES, 'Species profile abilities'),
            temperament: this._normalizeProfileBooleanMap(profile.temperament, this.SPECIES_PROFILE_TEMPERAMENTS, 'Species profile temperament'),
            canon: normalizedCanon,
            encounters
        };
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
        const labels = { items: 'Item' };
        const entry = this._normalizeDataContribution(value, labels[collectionName] || collectionName);
        App[collectionName] = App[collectionName] || [];
        App[collectionName].push(entry);
        this._contributionRecord(moduleId)[collectionName].add(entry);
    },

    _addOwnedItem(moduleId, value) {
        if (typeof YAW_ITEM_REGISTRY === 'undefined') throw new Error('Item Registry V2 is unavailable');
        if (typeof YAW_ITEM_EFFECTS === 'undefined') throw new Error('Item Effects V1 is unavailable');
        const source = this._normalizeDataContribution(value, 'Item');
        const purpose = source.purpose || (source.effect === 'heal' ? 'use' : 'trade');
        const entry = {
            ...source,
            type: source.type || 'material',
            purpose,
            effect: source.effect || (purpose === 'trade' ? 'sell' : ''),
            value: Math.max(0, Math.min(1000, Math.floor(Number(source.value) || 0))),
            ...(purpose === 'quest' ? { questItem: true } : {}),
            ...(purpose === 'key' ? { keyItem: true } : {})
        };
        if (entry.type === 'equipment' || entry.purpose === 'equip' || entry.slot || entry.equipBonus || entry.equipEffect) {
            throw new Error('Module equipment items are not available in Item Definition V2');
        }
        if (!['consumable', 'valuable', 'material', 'quest', 'key'].includes(entry.type)) {
            throw new Error('Module item type must be consumable, valuable, material, quest, or key');
        }
        if (!['use', 'trade', 'quest', 'key'].includes(entry.purpose)) {
            throw new Error('Module item purpose must be use, trade, quest, or key');
        }
        YAW_ITEM_EFFECTS.validateDefinition(entry, { module: true });
        const rawId = String(entry.id || '').trim();
        const namespace = String(moduleId).toLowerCase();
        const id = (rawId.includes(':') ? rawId : `${namespace}:${rawId}`).toLowerCase();
        if (!id.startsWith(`${namespace}:`)) {
            throw new Error(`Item definition id must use the ${namespace}: namespace`);
        }
        const registered = YAW_ITEM_REGISTRY.register(App, moduleId, {
            ...entry,
            id
        }, {
            legacyNames: Array.isArray(entry.legacyNames) ? entry.legacyNames : []
        });
        App.items = App.items || [];
        App.items.push(registered);
        const record = this._contributionRecord(moduleId);
        record.items.add(registered);
        this._placeOwnedItem(moduleId, registered, record);
        return registered;
    },

    _addOwnedEquipment(moduleId, value) {
        if (typeof YAW_ITEM_REGISTRY === 'undefined') throw new Error('Item Registry V2 is unavailable');
        const source = this._normalizeDataContribution(value, 'Equipment');
        const allowed = new Set([
            'id', 'name', 'nameKey', 'icon', 'desc', 'descriptionKey', 'type',
            'purpose', 'value', 'slot', 'equipBonus', 'techniqueTags',
            'legacyNames', 'acquisition'
        ]);
        for (const field of Object.keys(source)) {
            if (!allowed.has(field)) throw new Error(`Equipment definition contains unsupported field ${field}`);
        }
        if (!String(source.name || '').trim()) throw new Error('Equipment definition name is required');
        if (source.type !== undefined && source.type !== 'equipment') throw new Error('Equipment definition type must be equipment');
        if (source.purpose !== undefined && source.purpose !== 'equip') throw new Error('Equipment definition purpose must be equip');
        const slot = String(source.slot || '');
        if (!Object.prototype.hasOwnProperty.call(App.EQUIPMENT_SLOTS || {}, slot)) {
            throw new Error(`Equipment definition uses unsupported slot ${slot || '(empty)'}`);
        }
        if (!source.equipBonus || typeof source.equipBonus !== 'object' || Array.isArray(source.equipBonus)) {
            throw new Error('Equipment definition equipBonus must be an object');
        }
        const equipBonus = {};
        for (const [stat, raw] of Object.entries(source.equipBonus)) {
            if (!(App.EQUIPMENT_STAT_KEYS || []).includes(stat)) throw new Error(`Equipment definition uses unsupported stat ${stat}`);
            const amount = Number(raw);
            if (!Number.isInteger(amount) || amount < -10 || amount > 10) {
                throw new Error(`Equipment bonus ${stat} must be an integer from -10 to 10`);
            }
            if (amount !== 0) equipBonus[stat] = amount;
        }
        if (!Object.keys(equipBonus).length) throw new Error('Equipment definition requires at least one non-zero bonus');
        const techniqueTags = source.techniqueTags === undefined ? [] : source.techniqueTags;
        if (!Array.isArray(techniqueTags) || techniqueTags.length > 16) {
            throw new Error('Equipment techniqueTags must be a bounded array');
        }
        const normalizedTags = [...new Set(techniqueTags.map(tag => String(tag || '').trim()).filter(Boolean))];
        if (normalizedTags.some(tag => tag.length > 64 || !/^[a-zA-Z0-9_.:-]+$/.test(tag))) {
            throw new Error('Equipment techniqueTags must contain bounded semantic tokens');
        }
        const namespace = String(moduleId).toLowerCase();
        const rawId = String(source.id || '').trim();
        const id = (rawId.includes(':') ? rawId : `${namespace}:${rawId}`).toLowerCase();
        if (!id.startsWith(`${namespace}:`)) {
            throw new Error(`Equipment definition id must use the ${namespace}: namespace`);
        }
        const registered = YAW_ITEM_REGISTRY.register(App, moduleId, {
            ...source,
            id,
            name: String(source.name).trim().slice(0, 120),
            icon: String(source.icon || '🛡️').slice(0, 16),
            desc: String(source.desc || '').slice(0, 400),
            type: 'equipment',
            purpose: 'equip',
            stackable: false,
            maxStack: 1,
            value: Math.max(0, Math.min(1000, Math.floor(Number(source.value) || 0))),
            slot,
            equipBonus,
            techniqueTags: normalizedTags
        }, {
            legacyNames: Array.isArray(source.legacyNames) ? source.legacyNames.slice(0, 16) : []
        });
        App.items = App.items || [];
        App.items.push(registered);
        const record = this._contributionRecord(moduleId);
        record.items.add(registered);
        this._placeOwnedItem(moduleId, registered, record);
        return registered;
    },

    _placeOwnedItem(moduleId, definition, record = this._contributionRecord(moduleId)) {
        const acquisition = definition.acquisition;
        if (acquisition == null) return;
        if (!acquisition || typeof acquisition !== 'object' || Array.isArray(acquisition)) {
            throw new Error('Item acquisition must be an object');
        }
        const allowed = new Set(['merchantTables', 'lootTables', 'search', 'searchWeight']);
        for (const key of Object.keys(acquisition)) {
            if (!allowed.has(key)) throw new Error(`Unsupported item acquisition field: ${key}`);
        }
        if (acquisition.search != null && typeof acquisition.search !== 'boolean') {
            throw new Error('Item acquisition search must be boolean');
        }
        if (acquisition.searchWeight != null) {
            const searchWeight = Number(acquisition.searchWeight);
            if (!Number.isFinite(searchWeight) || searchWeight < 1 || searchWeight > 100) {
                throw new Error('Item acquisition searchWeight must be between 1 and 100');
            }
        }
        const merchantTables = Array.isArray(acquisition.merchantTables) ? acquisition.merchantTables : [];
        if (merchantTables.length > 16) throw new Error('Item acquisition supports at most 16 merchant tables');
        for (const raw of merchantTables) {
            const request = typeof raw === 'string' ? { id: raw } : raw;
            const tableId = String(request?.id || request?.table || '').trim();
            const table = App.MERCHANT_STOCK_TABLES?.[tableId];
            if (!tableId || !Array.isArray(table)) throw new Error(`Unknown merchant stock table: ${tableId || '(empty)'}`);
            const quantity = Math.max(1, Math.min(20, Math.floor(Number(request.qty ?? request.quantity) || 1)));
            const entry = { definitionId: definition.id, name: definition.name, qty: quantity };
            table.push(entry);
            record.itemPlacements.push({ kind: 'merchant', tableId, entry });
        }
        const lootTables = Array.isArray(acquisition.lootTables) ? acquisition.lootTables : [];
        if (lootTables.length > 16) throw new Error('Item acquisition supports at most 16 loot tables');
        for (const raw of lootTables) {
            const request = typeof raw === 'string' ? { id: raw } : raw;
            const tableId = String(request?.id || request?.table || '').trim();
            const table = App.EQUIPMENT_LOOT_TABLES?.[tableId];
            if (!tableId || !Array.isArray(table)) throw new Error(`Unknown loot table: ${tableId || '(empty)'}`);
            const weight = Math.max(1, Math.min(100, Math.floor(Number(request.weight) || 1)));
            const entry = { id: definition.id, weight };
            table.push(entry);
            record.itemPlacements.push({ kind: 'loot', tableId, entry });
        }
    },

    _addOwnedQuestTemplate(moduleId, questDef) {
        const entry = this._normalizeDataContribution(questDef, 'Quest template');
        const namespace = String(moduleId).toLowerCase();
        const rawId = String(entry.id || '').trim();
        if (!rawId) throw new Error('Quest template id is required');
        const id = (rawId.includes(':') ? rawId : `${namespace}:${rawId}`).toLowerCase();
        if (!id.startsWith(`${namespace}:`)) throw new Error(`Quest template id must use the ${namespace}: namespace`);
        App.QUEST_TEMPLATES = App.QUEST_TEMPLATES || {};
        if (Object.prototype.hasOwnProperty.call(App.QUEST_TEMPLATES, id)) {
            throw new Error(`Quest template already registered: ${id}`);
        }
        const acquisition = entry.acquisition == null ? {} : entry.acquisition;
        if (!acquisition || typeof acquisition !== 'object' || Array.isArray(acquisition)) {
            throw new Error('Quest template acquisition must be an object');
        }
        const allowed = new Set(['structures']);
        for (const key of Object.keys(acquisition)) {
            if (!allowed.has(key)) throw new Error(`Unsupported quest template acquisition field: ${key}`);
        }
        const structures = Array.isArray(acquisition.structures) ? acquisition.structures : [];
        if (structures.length < 1 || structures.length > 16) {
            throw new Error('Quest template requires 1 to 16 structure acquisition routes');
        }
        for (const structureId of structures) {
            const structure = App.STRUCTURES?.[String(structureId)];
            if (!structure?.quest || !Array.isArray(structure.quest.templates)) {
                throw new Error(`Unknown quest structure route: ${String(structureId)}`);
            }
        }
        const normalized = YAW_QUEST_FLOW.normalize(App, {
            ...entry,
            id,
            templateId: id,
            status: 'available',
            authoredOrigin: {
                kind: 'module',
                moduleId,
                templateId: id
            }
        });
        delete normalized.id;
        const record = this._contributionRecord(moduleId);
        App.QUEST_TEMPLATES[id] = normalized;
        record.questTemplates.set(id, normalized);
        for (const structureId of structures) {
            App.STRUCTURES[String(structureId)].quest.templates.push(id);
            record.questPlacements.push({ structureId: String(structureId), id });
        }
        return normalized;
    },

    _addOwnedResourceProfile(moduleId, resourceId, definition) {
        if (typeof YAW_RESOURCE_LEDGER === 'undefined') throw new Error('Resource Ledger V1 is unavailable');
        const profile = YAW_RESOURCE_LEDGER.register(moduleId, resourceId, definition);
        this._contributionRecord(moduleId).resourceProfiles.push({ key: profile.key });
        return {
            version: profile.version,
            id: profile.id,
            key: profile.key,
            label: profile.label,
            labelKey: profile.labelKey,
            capacity: profile.capacity,
            regeneration: profile.regeneration ? { ...profile.regeneration } : null,
            eligibility: {
                species: [...profile.eligibility.species],
                abilities: [...profile.eligibility.abilities],
                flags: [...profile.eligibility.flags]
            }
        };
    },

    _addOwnedStatusEffect(moduleId, statusId, definition) {
        if (typeof YAW_STATUS_EFFECTS === 'undefined') throw new Error('Status Effect V1 is unavailable');
        const profile = YAW_STATUS_EFFECTS.register(moduleId, statusId, definition);
        this._contributionRecord(moduleId).statusEffects.push({ key: profile.key });
        return {
            version: profile.version,
            id: profile.id,
            key: profile.key,
            label: profile.label,
            labelKey: profile.labelKey,
            description: profile.description,
            descriptionKey: profile.descriptionKey,
            icon: profile.icon,
            domains: [...profile.domains],
            duration: { ...profile.duration },
            stacking: { ...profile.stacking },
            persistence: profile.persistence,
            restriction: profile.restriction,
            periodic: profile.periodic ? { ...profile.periodic } : null,
            cureTags: [...profile.cureTags],
            resistanceTags: [...profile.resistanceTags]
        };
    },

    _addOwnedActionProfile(moduleId, actionId, definition) {
        if (typeof YAW_ACTION_PROFILES === 'undefined') throw new Error('Action Resolver V1 is unavailable');
        const profile = YAW_ACTION_PROFILES.register(moduleId, actionId, definition);
        this._contributionRecord(moduleId).actionProfiles.push({ key: profile.key });
        return {
            version: profile.version,
            id: profile.id,
            key: profile.key,
            label: profile.label,
            labelKey: profile.labelKey,
            description: profile.description,
            descriptionKey: profile.descriptionKey,
            icon: profile.icon,
            category: profile.category,
            modes: [...profile.modes],
            scope: profile.scope,
            relations: [...profile.relations],
            requirements: { ...profile.requirements },
            check: profile.check ? { ...profile.check } : null,
            costs: profile.costs.map(cost => ({ ...cost })),
            effects: profile.effects.map(effect => ({ ...effect })),
            failureEffects: profile.failureEffects.map(effect => ({ ...effect }))
        };
    },

    _addOwnedRestraintProfile(moduleId, restraintId, definition) {
        if (typeof YAW_RESTRAINTS === 'undefined') throw new Error('Restraint Relationship V1 is unavailable');
        const profile = YAW_RESTRAINTS.register(moduleId, restraintId, definition);
        this._contributionRecord(moduleId).restraintProfiles.push({ key: profile.key });
        return {
            version: profile.version,
            id: profile.id,
            key: profile.key,
            label: profile.label,
            labelKey: profile.labelKey,
            description: profile.description,
            descriptionKey: profile.descriptionKey,
            icon: profile.icon,
            kind: profile.kind,
            statusProfile: profile.statusProfile,
            duration: profile.duration,
            strength: profile.strength,
            breakOnSourceDown: profile.breakOnSourceDown
        };
    },

    _addOwnedBodyProfile(moduleId, bodyId, definition) {
        if (typeof YAW_BODY_MASS === 'undefined') throw new Error('Body Mass Ledger V1 is unavailable');
        const profile = YAW_BODY_MASS.register(moduleId, bodyId, definition);
        this._contributionRecord(moduleId).bodyProfiles.push({ key: profile.key });
        return {
            version: profile.version,
            id: profile.id,
            key: profile.key,
            label: profile.label,
            labelKey: profile.labelKey,
            massPerSize: profile.massPerSize,
            minimumViablePercent: profile.minimumViablePercent,
            renewable: profile.renewable,
            piecePercents: [...profile.piecePercents],
            regrowth: profile.regrowth ? { ...profile.regrowth } : null,
            corpseYieldPercent: profile.corpseYieldPercent
        };
    },

    _addOwnedCombatTechnique(moduleId, techniqueId, definition) {
        if (typeof YAW_COMBAT_TECHNIQUES === 'undefined') throw new Error('Combat Technique V1 is unavailable');
        const profile = YAW_COMBAT_TECHNIQUES.register(moduleId, techniqueId, definition);
        this._contributionRecord(moduleId).combatTechniques.push({ key: profile.key });
        return {
            version: profile.version,
            id: profile.id,
            key: profile.key,
            label: profile.label,
            labelKey: profile.labelKey,
            description: profile.description,
            descriptionKey: profile.descriptionKey,
            icon: profile.icon,
            eligibility: {
                species: [...profile.eligibility.species],
                abilities: [...profile.eligibility.abilities],
                flags: [...profile.eligibility.flags]
            },
            equipment: {
                required: profile.equipment.required,
                anyTags: [...profile.equipment.anyTags],
                allTags: [...profile.equipment.allTags],
                slots: [...profile.equipment.slots]
            },
            reach: profile.reach,
            damage: { ...profile.damage },
            area: { ...profile.area },
            status: profile.status ? { ...profile.status } : null
        };
    },

    _addOwnedRecoveryMode(moduleId, modeId, definition) {
        if (typeof YAW_RECOVERY_MODES === 'undefined') throw new Error('Recovery Mode V1 is unavailable');
        const profile = YAW_RECOVERY_MODES.register(moduleId, modeId, definition);
        this._contributionRecord(moduleId).recoveryModes.push({ key: profile.key });
        App.renderRecoveryModeOptions?.();
        return {
            version: profile.version,
            id: profile.id,
            key: profile.key,
            label: profile.label,
            labelKey: profile.labelKey,
            description: profile.description,
            descriptionKey: profile.descriptionKey,
            icon: profile.icon,
            entry: profile.entry,
            resolution: profile.resolution,
            inventory: profile.inventory,
            traversal: profile.traversal,
            restrictions: [...profile.restrictions],
            vitalityPercent: profile.vitalityPercent
        };
    },

    _addOwnedSpecies(moduleId, speciesDef) {
        const entry = this._normalizeDataContribution(speciesDef, 'Species');
        const profile = this._normalizeSpeciesProfile(entry);
        App.species = App.species || [];
        if (App.species.some(species => String(species?.id) === entry.id)) {
            throw new Error(`Species definition id ${entry.id} is already registered`);
        }
        if (profile?.bodyProfile) {
            const namespace = `${String(moduleId)}:`;
            if (typeof YAW_BODY_MASS === 'undefined'
                || !profile.bodyProfile.startsWith(namespace)
                || !YAW_BODY_MASS.profile?.(profile.bodyProfile)) {
                throw new Error('Species bodyProfile must reference a body profile owned by the same module');
            }
        }

        const record = this._contributionRecord(moduleId);
        const profileRecord = { id: entry.id, maps: [], encounters: [] };
        const setMapValue = (mapName, value) => {
            App[mapName] = App[mapName] || {};
            profileRecord.maps.push({
                mapName,
                existed: Object.prototype.hasOwnProperty.call(App[mapName], entry.id),
                value: App[mapName][entry.id]
            });
            App[mapName][entry.id] = value;
        };

        App.species.push(entry);
        record.species.add(entry);
        if (!profile) return entry;
        record.speciesProfiles.push(profileRecord);

        setMapValue('SPECIES_BASE_STATS', { ...profile.baseStats });
        setMapValue('SPECIES_DEFAULT_PARTS', [...profile.bodyParts]);
        if (profile.bodyProfile) setMapValue('SPECIES_BODY_PROFILES', profile.bodyProfile);
        setMapValue('SPECIES_ABILITIES', { ...profile.abilities });
        setMapValue('SPECIES_DIFFICULTY', profile.difficulty);
        setMapValue('SPECIES_SIZE', profile.size);
        setMapValue('SPECIES_TEMPERAMENT', { ...profile.temperament });
        setMapValue('SPECIES_CANON', { ...profile.canon, traits: [...profile.canon.traits], interactionEligibility: { ...profile.canon.interactionEligibility } });

        for (const encounter of profile.encounters) {
            const biome = App.biomes[encounter.biome];
            const property = encounter.table === 'friendly' ? 'friendlyTable' : 'encounterTable';
            const createdTable = !Array.isArray(biome[property]);
            if (createdTable) biome[property] = [];
            const tableEntry = { id: entry.id, weight: encounter.weight };
            biome[property].push(tableEntry);
            profileRecord.encounters.push({ biome: encounter.biome, property, entry: tableEntry, createdTable });
        }
        return entry;
    },

    _addOwnedTemplate(moduleId, category, type, variant, tier, renderer) {
        if (typeof CONTENT === 'undefined' || !CONTENT?.registerTemplateTier) throw new Error('Content template registry is unavailable');
        const previous = CONTENT.templateTier(category, type, variant, tier);
        CONTENT.registerTemplateTier(category, type, variant, tier, renderer);
        this._contributionRecord(moduleId).templates.push({ category, type, variant, tier, previous });
    },

    _addOwnedSceneTemplate(moduleId, template) {
        if (typeof YAW_STORY_EVENTS === 'undefined' || !YAW_STORY_EVENTS?.registerSceneTemplate) throw new Error('Scene Feed template registry is unavailable');
        if (!template || typeof template !== 'object' || Array.isArray(template)) throw new Error('Scene Feed template must be an object');
        const localId = String(template.id || '').trim();
        if (!localId || localId.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(localId)) throw new Error('Scene Feed template id must be a token');
        const id = `${moduleId}:${localId}`;
        const registered = YAW_STORY_EVENTS.registerSceneTemplate(App, { ...template, id, source: moduleId }, { owner: moduleId });
        if (!registered) throw new Error('Scene Feed template requires a matcher or selector');
        this._contributionRecord(moduleId).sceneTemplates.push({ id });
        return id;
    },

    _legacyTemplateConsumer(category, type, variant) {
        const key = `${category}.${type}.${variant}`;
        if (category === 'biome' && variant === 'default' && Object.prototype.hasOwnProperty.call(App.biomes || {}, type)) return { reachable: true, key };
        const actionKeys = new Set(['action.cockVore.default', 'action.unbirth.default', 'action.corpseLoot.default', 'action.corpseScavenge.default']);
        return { reachable: actionKeys.has(key), key };
    },

    _evaluateModuleContributions(moduleId) {
        const record = this.ownedContributions.get(moduleId);
        const diagnostics = [];
        for (const template of record?.templates || []) {
            const consumer = this._legacyTemplateConsumer(template.category, template.type, template.variant);
            if (!consumer.reachable) diagnostics.push({
                code: 'unreachable_content_template',
                severity: 'warning',
                contribution: consumer.key,
                message: `Content template ${consumer.key} has no known core consumer`
            });
        }
        for (const locale of record?.localeDefinitions || []) {
            const definition = CONTENT?.localeDefinition?.(locale.id);
            if (!definition) continue;
            for (const target of definition.targets || []) {
                const referenceLocale = definition.fallback || 'en';
                let expected = [];
                if (target.moduleId === 'core') {
                    const moduleOnlyKeys = new Set();
                    for (const contributionRecord of this.ownedContributions.values()) {
                        for (const contribution of contributionRecord.locales || []) {
                            if (contribution.locale !== referenceLocale) continue;
                            for (const [key, prior] of Object.entries(contribution.previous || {})) {
                                if (prior === undefined) moduleOnlyKeys.add(key);
                            }
                        }
                    }
                    expected = Object.keys(CONTENT.locales?.[referenceLocale] || {}).filter(key => !moduleOnlyKeys.has(key));
                } else {
                    const targetRecord = this.ownedContributions.get(target.moduleId);
                    expected = (targetRecord?.locales || [])
                        .filter(contribution => contribution.locale === referenceLocale)
                        .flatMap(contribution => Object.keys(contribution.previous || {}));
                }
                const actual = (record.locales || [])
                    .filter(contribution => contribution.locale === definition.id && contribution.target === target.moduleId)
                    .flatMap(contribution => Object.keys(contribution.previous || {}));
                const expectedSet = new Set(expected);
                const actualSet = new Set(actual);
                const missing = [...expectedSet].filter(key => !actualSet.has(key)).sort();
                const obsolete = [...actualSet].filter(key => !expectedSet.has(key)).sort();
                if (missing.length) diagnostics.push({
                    code: 'locale_missing_keys',
                    severity: 'warning',
                    locale: definition.id,
                    target: target.moduleId,
                    count: missing.length,
                    sample: missing.slice(0, 20),
                    message: `Locale ${definition.id} is missing ${missing.length} ${target.moduleId} translation key(s)`
                });
                if (obsolete.length) diagnostics.push({
                    code: 'locale_obsolete_keys',
                    severity: 'warning',
                    locale: definition.id,
                    target: target.moduleId,
                    count: obsolete.length,
                    sample: obsolete.slice(0, 20),
                    message: `Locale ${definition.id} has ${obsolete.length} obsolete ${target.moduleId} translation key(s)`
                });
            }
        }
        this.moduleDiagnostics.set(moduleId, diagnostics);
        for (const diagnostic of diagnostics) {
            console.warn(`[${moduleId}] ${diagnostic.message}`);
            App.log?.push?.({ text: `[${moduleId}] ${diagnostic.message}`, type: 'error' });
        }
        if (diagnostics.length) App.renderLog?.();
        return diagnostics.map(entry => ({ ...entry }));
    },

    getModuleDiagnostics(moduleId) {
        return (this.moduleDiagnostics.get(String(moduleId || '')) || []).map(entry => ({ ...entry }));
    },

    _normalizeLocaleTarget(moduleId, manifest, source) {
        const target = typeof source === 'string' ? { moduleId: source } : source;
        if (!target || typeof target !== 'object' || Array.isArray(target)) throw new Error('Locale targets must be module ids or target objects');
        const targetModuleId = String(target.moduleId || target.id || '').trim();
        if (!targetModuleId || !/^[a-zA-Z0-9_-]+$/.test(targetModuleId)) throw new Error('Locale target moduleId must be a module id token');
        const minVersion = this._normalizeGameVersion(target.minVersion || '', 'locale target minVersion');
        if (targetModuleId === 'core') {
            if (minVersion && this._compareVersions(this._currentGameVersion(), minVersion) < 0) {
                throw new Error(`Locale ${moduleId} requires core ${minVersion} or newer`);
            }
            return { moduleId: 'core', minVersion };
        }
        if (!manifest?.dependencies?.includes(targetModuleId)) {
            throw new Error(`Locale target ${targetModuleId} must be declared as a module dependency`);
        }
        const activeTarget = this.activeModules.get(targetModuleId);
        if (!activeTarget || activeTarget.loading) throw new Error(`Locale target ${targetModuleId} is not active`);
        const targetVersion = String(activeTarget.manifest?.version || '0.0.0');
        if (minVersion && this._compareVersions(targetVersion, minVersion) < 0) {
            throw new Error(`Locale ${moduleId} requires ${targetModuleId} ${minVersion} or newer`);
        }
        return { moduleId: targetModuleId, minVersion };
    },

    _addOwnedLocaleDefinition(moduleId, manifest, definition) {
        if (typeof CONTENT === 'undefined' || !CONTENT?.registerLocale) throw new Error('Content locale registry is unavailable');
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) throw new Error('Locale definition must be an object');
        const fallback = CONTENT.localeDefinition?.(definition.fallback || 'en');
        if (!fallback) throw new Error(`Unknown locale fallback ${definition.fallback || 'en'}`);
        if (!fallback.builtIn && fallback.owner !== moduleId) {
            if (!manifest?.dependencies?.includes(fallback.owner)) {
                throw new Error(`Locale fallback ${fallback.id} requires dependency ${fallback.owner}`);
            }
            if (!this.activeModules.has(fallback.owner)) throw new Error(`Locale fallback owner ${fallback.owner} is not active`);
        }
        const rawTargets = Array.isArray(definition.targets) ? definition.targets : [];
        if (!rawTargets.length || rawTargets.length > 16) throw new Error('Locale definitions require 1 to 16 targets');
        const targets = [];
        const seen = new Set();
        for (const source of rawTargets) {
            const target = this._normalizeLocaleTarget(moduleId, manifest, source);
            if (seen.has(target.moduleId)) throw new Error(`Duplicate locale target ${target.moduleId}`);
            seen.add(target.moduleId);
            targets.push(target);
        }
        const registered = CONTENT.registerLocale(moduleId, { ...definition, targets });
        this._contributionRecord(moduleId).localeDefinitions.push({ id: registered.id });
        return registered;
    },

    _addOwnedLocaleEntries(moduleId, manifest, locale, entries, options = {}) {
        if (typeof CONTENT === 'undefined' || !CONTENT?.registerLocaleEntries) throw new Error('Content locale registry is unavailable');
        const definition = CONTENT.localeDefinition?.(locale);
        if (!definition) throw new Error(`Unknown locale ${locale}`);
        let targetModuleId = String(options?.target || options?.moduleId || '').trim();
        if (definition.builtIn) {
            targetModuleId = targetModuleId || 'core';
            if (targetModuleId !== 'core') this._normalizeLocaleTarget(moduleId, manifest, { moduleId: targetModuleId });
        } else {
            if (definition.owner !== moduleId) throw new Error(`Locale ${definition.id} is owned by ${definition.owner}`);
            if (!targetModuleId) throw new Error(`Locale ${definition.id} entries require a declared target`);
            const declaredTarget = definition.targets.find(target => target.moduleId === targetModuleId);
            if (!declaredTarget) throw new Error(`Locale target ${targetModuleId} was not declared for ${definition.id}`);
            this._normalizeLocaleTarget(moduleId, manifest, declaredTarget);
        }
        if (targetModuleId !== 'core') {
            const prefix = `${targetModuleId}.`;
            for (const key of Object.keys(entries || {})) {
                if (!String(key).startsWith(prefix)) throw new Error(`Locale keys for ${targetModuleId} must use the ${prefix} namespace`);
            }
        }
        const previous = CONTENT.registerLocaleEntries(locale, entries);
        this._contributionRecord(moduleId).locales.push({ locale: definition.id, previous, target: targetModuleId });
        return Object.keys(previous).length;
    },

    _normalizeUiContributionText(value, field, maxLength, options = {}) {
        const text = String(value ?? '').trim();
        if (options.required && !text) throw new Error(`UI contribution ${field} is required`);
        if (text.length > maxLength) throw new Error(`UI contribution ${field} exceeds ${maxLength} characters`);
        return text;
    },

    _normalizeUiLocaleKey(moduleId, value, field) {
        const key = String(value || '').trim();
        if (!key) return '';
        if (!key.startsWith(`${moduleId}.`)) {
            throw new Error(`UI contribution ${field} must use the ${moduleId}. locale namespace`);
        }
        if (!/^[a-zA-Z0-9_.:-]+$/.test(key)) throw new Error(`UI contribution ${field} contains unsupported characters`);
        return key;
    },

    _normalizeUiRows(rows, label = 'rows', moduleId = '') {
        if (rows === undefined || rows === null) return [];
        if (!Array.isArray(rows)) throw new Error(`UI contribution ${label} must be an array`);
        if (rows.length > 6) throw new Error(`UI contribution ${label} cannot exceed 6 rows`);
        return rows.map((row, index) => {
            if (!row || typeof row !== 'object' || Array.isArray(row)) {
                throw new Error(`UI contribution ${label}[${index}] must be an object`);
            }
            return Object.freeze({
                label: this._normalizeUiContributionText(row.label, `${label}[${index}].label`, 48, { required: true }),
                labelKey: moduleId ? this._normalizeUiLocaleKey(moduleId, row.labelKey, `${label}[${index}].labelKey`) : '',
                value: this._normalizeUiContributionText(row.value, `${label}[${index}].value`, 160, { required: true }),
                valueKey: moduleId ? this._normalizeUiLocaleKey(moduleId, row.valueKey, `${label}[${index}].valueKey`) : ''
            });
        });
    },

    _registerUiContribution(moduleId, slot, contributionId, definition) {
        const normalizedSlot = String(slot || '').trim();
        if (!this.UI_CONTRIBUTION_SLOTS.includes(normalizedSlot)) {
            throw new Error(`Unsupported UI contribution slot ${normalizedSlot || '(empty)'}`);
        }
        const id = String(contributionId || '').trim();
        if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(id)) {
            throw new Error('UI contribution id must use 1-64 letters, numbers, underscores, hyphens, dots, or colons');
        }
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('UI contribution definition must be an object');
        }
        const commandSlot = normalizedSlot === 'composer.place.after' || normalizedSlot === 'system.utilities';
        const detailSlot = normalizedSlot === 'roster.details.sections';
        const key = `${moduleId}:${id}`;
        const slotRegistry = this.uiContributions.get(normalizedSlot) || new Map();
        if (slotRegistry.has(key)) throw new Error(`UI contribution ${key} is already registered in ${normalizedSlot}`);
        const ownedCount = [...slotRegistry.values()].filter(record => record.owner === moduleId).length;
        if (ownedCount >= 4) throw new Error(`Module ${moduleId} cannot register more than 4 contributions in ${normalizedSlot}`);
        if (slotRegistry.size >= 24) throw new Error(`UI contribution slot ${normalizedSlot} is full`);
        if (commandSlot && typeof definition.onInvoke !== 'function') {
            throw new Error(`UI contribution ${normalizedSlot} requires onInvoke`);
        }
        if (definition.when !== undefined && typeof definition.when !== 'function') {
            throw new Error('UI contribution when must be a function');
        }
        if (definition.read !== undefined && typeof definition.read !== 'function') {
            throw new Error('UI contribution read must be a function');
        }
        if (detailSlot && definition.read === undefined && definition.rows === undefined) {
            throw new Error('Roster detail contribution requires rows or read');
        }
        const tone = String(definition.tone || 'neutral').trim().toLowerCase();
        if (!['neutral', 'info', 'success', 'warning', 'danger'].includes(tone)) {
            throw new Error('UI contribution tone is unsupported');
        }
        const priorityValue = Number(definition.priority || 0);
        if (!Number.isFinite(priorityValue) || priorityValue < -10 || priorityValue > 10) {
            throw new Error('UI contribution priority must be between -10 and 10');
        }
        const record = Object.freeze({
            version: this.UI_CONTRIBUTION_VERSION,
            slot: normalizedSlot,
            id,
            key,
            owner: moduleId,
            label: this._normalizeUiContributionText(definition.label, 'label', 48, { required: true }),
            labelKey: this._normalizeUiLocaleKey(moduleId, definition.labelKey, 'labelKey'),
            description: this._normalizeUiContributionText(definition.description, 'description', 160),
            descriptionKey: this._normalizeUiLocaleKey(moduleId, definition.descriptionKey, 'descriptionKey'),
            icon: this._normalizeUiContributionText(definition.icon, 'icon', 8),
            tone,
            priority: Math.trunc(priorityValue),
            rows: Object.freeze(this._normalizeUiRows(definition.rows, 'rows', moduleId)),
            when: definition.when || null,
            read: definition.read || null,
            onInvoke: definition.onInvoke || null
        });
        slotRegistry.set(key, record);
        this.uiContributions.set(normalizedSlot, slotRegistry);
        this._contributionRecord(moduleId).uiContributions.push({ slot: normalizedSlot, key });
        this.refreshUiContributions();
        return Object.freeze({ version: record.version, slot: record.slot, id: record.id, key: record.key });
    },

    _removeUiContributionOwner(moduleId) {
        let changed = false;
        for (const [slot, registry] of this.uiContributions.entries()) {
            for (const [key, record] of registry.entries()) {
                if (record.owner !== moduleId) continue;
                registry.delete(key);
                changed = true;
            }
            if (!registry.size) this.uiContributions.delete(slot);
        }
        if (changed) this.refreshUiContributions();
        return changed;
    },

    _uiContributionContext(record, extra = {}) {
        const context = {
            ...this.getPublicContext({ limit: 12 }),
            surface: { slot: record.slot, contributionId: record.id, owner: record.owner },
            selection: {
                actorIds: (App.explorationActorIds || []).map(String),
                targetIds: (App.explorationTargetIds || []).map(String)
            },
            unit: extra.unit && typeof extra.unit === 'object' ? this._publicUnitSummary(extra.unit) : null,
            unitType: extra.unitType === 'party' ? 'party' : (extra.unitType === 'creature' ? 'creature' : null),
            expanded: extra.expanded === true
        };
        return this._deepFreeze(this._serializableCopy(context));
    },

    _uiContributionText(record, field) {
        const fallback = String(record[field] || '');
        const key = String(record[`${field}Key`] || '');
        return key ? App._label(key, fallback) : fallback;
    },

    _uiContributionDiagnostic(record, error) {
        const message = String(error?.message || error || 'UI contribution failed').slice(0, 240);
        console.error(`UI contribution failed (${record.owner}:${record.id}):`, error);
        App.log?.push?.({ text: `[${record.owner}] UI contribution ${record.id} failed: ${message}`, type: 'error' });
        App.renderLog?.();
    },

    _uiContributionVisible(record, context) {
        if (!record.when) return true;
        try {
            return record.when(context) !== false;
        } catch (error) {
            this._uiContributionDiagnostic(record, error);
            return false;
        }
    },

    _uiContributionRecords(slot, extra = {}) {
        const registry = this.uiContributions.get(String(slot || ''));
        if (!registry) return [];
        return [...registry.values()]
            .sort((left, right) => left.priority - right.priority || left.owner.localeCompare(right.owner) || left.id.localeCompare(right.id))
            .map(record => ({ record, context: this._uiContributionContext(record, extra) }))
            .filter(entry => this._uiContributionVisible(entry.record, entry.context));
    },

    _normalizeUiReadResult(record, result) {
        if (record.slot === 'roster.details.sections') {
            return this._normalizeUiRows((Array.isArray(result) ? result : result?.rows) ?? record.rows, 'read.rows', record.owner);
        }
        if (result === undefined || result === null || result === '') {
            return { label: this._uiContributionText(record, 'label'), tone: record.tone };
        }
        if (typeof result === 'string' || typeof result === 'number') {
            return { label: this._normalizeUiContributionText(result, 'read.label', 64, { required: true }), tone: record.tone };
        }
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
            throw new Error('UI contribution read returned unsupported data');
        }
        const labelKey = this._normalizeUiLocaleKey(record.owner, result.labelKey, 'read.labelKey');
        const tone = String(result.tone || record.tone).trim().toLowerCase();
        if (!['neutral', 'info', 'success', 'warning', 'danger'].includes(tone)) {
            throw new Error('UI contribution read returned an unsupported tone');
        }
        return {
            label: labelKey
                ? App._label(labelKey, this._normalizeUiContributionText(result.label ?? record.label, 'read.label', 64, { required: true }))
                : this._normalizeUiContributionText(result.label, 'read.label', 64, { required: true }),
            tone
        };
    },

    renderUiSlot(slot, extra = {}) {
        const entries = this._uiContributionRecords(slot, extra);
        if (!entries.length) return '';
        if (slot === 'composer.place.after' || slot === 'system.utilities') {
            return entries.map(({ record }) => {
                const label = App._escapeHtml(this._uiContributionText(record, 'label'));
                const description = App._escapeHtml(this._uiContributionText(record, 'description') || label);
                const icon = App._escapeHtml(record.icon || '◇');
                const safeSlot = App._escapeJsString(record.slot);
                const safeKey = App._escapeJsString(record.key);
                const menuAttrs = slot === 'system.utilities' ? ' role="menuitem"' : '';
                return `<button class="${slot === 'system.utilities' ? 'nav-btn' : 'action-btn'} mod-ui-command mod-ui-tone-${record.tone}"${menuAttrs} data-module-owner="${App._escapeHtml(record.owner)}" data-ui-contribution="${App._escapeHtml(record.key)}" data-command-surface="${slot === 'system.utilities' ? 'app-system' : 'command-composer'}" data-command-mode="${slot === 'system.utilities' ? 'system' : 'exploration'}" data-command-control="invoke-mod-ui" title="${description}" aria-label="${description}" onclick="App.invokeModUiContribution('${safeSlot}','${safeKey}')"><span aria-hidden="true">${icon}</span> <span>${label}</span></button>`;
            }).join('');
        }
        if (slot === 'roster.party.badges' || slot === 'roster.here.badges') {
            const badges = entries.map(({ record, context }) => {
                try {
                    const value = this._normalizeUiReadResult(record, record.read ? record.read(context) : null);
                    return `<span class="mod-ui-badge mod-ui-tone-${value.tone}" data-module-owner="${App._escapeHtml(record.owner)}" data-ui-contribution="${App._escapeHtml(record.key)}">${App._escapeHtml(value.label)}</span>`;
                } catch (error) {
                    this._uiContributionDiagnostic(record, error);
                    return '';
                }
            }).join('');
            return badges ? `<div class="mod-ui-badges" aria-label="${App._escapeHtml(App._label('ui.modContributions', 'Module contributions'))}">${badges}</div>` : '';
        }
        if (slot === 'roster.details.sections') {
            return entries.map(({ record, context }) => {
                try {
                    const rows = this._normalizeUiReadResult(record, record.read ? record.read(context) : record.rows);
                    if (!rows.length) return '';
                    const title = App._escapeHtml(this._uiContributionText(record, 'label'));
                    return `<section class="mod-ui-detail-section" data-module-owner="${App._escapeHtml(record.owner)}" data-ui-contribution="${App._escapeHtml(record.key)}"><h4>${title}</h4><dl>${rows.map(row => `<div><dt>${App._escapeHtml(row.labelKey ? App._label(row.labelKey, row.label) : row.label)}</dt><dd>${App._escapeHtml(row.valueKey ? App._label(row.valueKey, row.value) : row.value)}</dd></div>`).join('')}</dl></section>`;
                } catch (error) {
                    this._uiContributionDiagnostic(record, error);
                    return '';
                }
            }).join('');
        }
        return '';
    },

    _uiUnitExtra(unitType, index) {
        const type = unitType === 'party' ? 'party' : (unitType === 'creature' ? 'creature' : '');
        const list = type === 'party' ? App.party : (type === 'creature' ? App.creatures : []);
        const numericIndex = Number(index);
        const unit = Number.isInteger(numericIndex) ? list?.[numericIndex] : null;
        return { unit, unitType: type, expanded: unit?.expanded === true };
    },

    async invokeUiContribution(slot, key, unitType = '', index = null) {
        const record = this.uiContributions.get(String(slot || ''))?.get(String(key || ''));
        if (!record) return false;
        const context = this._uiContributionContext(record, this._uiUnitExtra(unitType, index));
        if (!this._uiContributionVisible(record, context) || typeof record.onInvoke !== 'function') return false;
        try {
            const result = await record.onInvoke(context);
            if (result !== undefined && result !== null && result !== false) this.openUiContributionDialog(record, result);
            return true;
        } catch (error) {
            this._uiContributionDiagnostic(record, error);
            return false;
        }
    },

    openUiContributionDialog(record, result) {
        if (typeof document === 'undefined' || !document.body) return false;
        this.closeUiContributionDialog();
        const activeElement = document.activeElement;
        App._modUiDialogOpener = activeElement?.closest?.('#app-menu')
            ? document.getElementById('app-menu-toggle')
            : activeElement;
        const payload = typeof result === 'string' ? { description: result } : result;
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new Error('UI contribution callback must return text or a bounded dialog descriptor');
        }
        const titleKey = this._normalizeUiLocaleKey(record.owner, payload.titleKey, 'dialog.titleKey');
        const descriptionKey = this._normalizeUiLocaleKey(record.owner, payload.descriptionKey, 'dialog.descriptionKey');
        const titleFallback = this._normalizeUiContributionText(payload.title || this._uiContributionText(record, 'label'), 'dialog.title', 80, { required: true });
        const descriptionFallback = this._normalizeUiContributionText(payload.description, 'dialog.description', 600);
        const title = titleKey ? App._label(titleKey, titleFallback) : titleFallback;
        const description = descriptionKey ? App._label(descriptionKey, descriptionFallback) : descriptionFallback;
        const rows = this._normalizeUiRows(payload.rows, 'dialog.rows', record.owner);
        const close = App._escapeHtml(App._label('ui.close', 'Close'));
        const body = `${description ? `<p id="mod-ui-dialog-description">${App._escapeHtml(description)}</p>` : ''}${rows.length ? `<dl class="mod-ui-dialog-rows">${rows.map(row => `<div><dt>${App._escapeHtml(row.labelKey ? App._label(row.labelKey, row.label) : row.label)}</dt><dd>${App._escapeHtml(row.valueKey ? App._label(row.valueKey, row.value) : row.value)}</dd></div>`).join('')}</dl>` : ''}`;
        const describedBy = description ? ' aria-describedby="mod-ui-dialog-description"' : '';
        const html = `<div class="app-confirm-backdrop" id="mod-ui-contribution-dialog" role="dialog" aria-modal="true" aria-labelledby="mod-ui-dialog-title"${describedBy} data-command-surface="module-dialog" data-command-mode="system"><div class="app-confirm-card mod-ui-dialog-card"><h3 id="mod-ui-dialog-title">${App._escapeHtml(title)}</h3>${body}<div class="app-confirm-actions"><button class="nav-btn primary" data-command-surface="module-dialog" data-command-mode="system" data-command-control="close-mod-ui-dialog" data-command-slot="exit" onclick="App.closeModUiContributionDialog()">${close}</button></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const dialog = document.getElementById('mod-ui-contribution-dialog');
        App._modUiDialogState = typeof YAW_DIALOG_FLOW !== 'undefined'
            ? YAW_DIALOG_FLOW.isolateUnderlying?.(dialog) || []
            : [];
        App._activateFocusTrap?.(dialog, { close: () => App.closeModUiContributionDialog() });
        return true;
    },

    closeUiContributionDialog() {
        const dialog = typeof document !== 'undefined' ? document.getElementById('mod-ui-contribution-dialog') : null;
        if (!dialog && !App._modUiDialogState) return false;
        const opener = App._modUiDialogOpener;
        dialog?.remove?.();
        if (typeof YAW_DIALOG_FLOW !== 'undefined') {
            YAW_DIALOG_FLOW.restoreUnderlying?.(App._modUiDialogState || []);
        }
        App._modUiDialogState = null;
        App._modUiDialogOpener = null;
        App._restoreFocusTrap?.();
        if (opener?.isConnected && typeof opener.focus === 'function') {
            requestAnimationFrame(() => {
                try { opener.focus({ preventScroll: true }); } catch (_error) { opener.focus(); }
            });
        }
        return true;
    },

    renderSystemUtilities() {
        const container = typeof document !== 'undefined' ? document.getElementById('module-system-utilities') : null;
        if (!container) return false;
        const html = this.renderUiSlot('system.utilities');
        container.innerHTML = html;
        container.hidden = !html;
        return Boolean(html);
    },

    refreshUiContributions() {
        this.renderSystemUtilities();
        App.renderExplorationActions?.();
        App.renderParty?.();
        App.renderCreatures?.();
        if (typeof YAW_PANEL_SHELL !== 'undefined') YAW_PANEL_SHELL.renderRoster?.(App);
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
        for (const profile of [...record.speciesProfiles].reverse()) {
            for (const encounter of [...profile.encounters].reverse()) {
                const biome = App.biomes?.[encounter.biome];
                if (!biome || !Array.isArray(biome[encounter.property])) continue;
                biome[encounter.property] = biome[encounter.property].filter(entry => entry !== encounter.entry);
                if (encounter.createdTable && biome[encounter.property].length === 0) delete biome[encounter.property];
            }
            for (const map of [...profile.maps].reverse()) {
                if (!App[map.mapName]) continue;
                if (map.existed) App[map.mapName][profile.id] = map.value;
                else delete App[map.mapName][profile.id];
            }
        }
        if (Array.isArray(App.items)) {
            App.items = App.items.filter(entry => !record.items.has(entry));
        }
        for (const placement of [...record.itemPlacements].reverse()) {
            const tables = placement.kind === 'merchant' ? App.MERCHANT_STOCK_TABLES : App.EQUIPMENT_LOOT_TABLES;
            const table = tables?.[placement.tableId];
            if (!Array.isArray(table)) continue;
            const index = table.indexOf(placement.entry);
            if (index >= 0) table.splice(index, 1);
        }
        if (typeof YAW_ITEM_REGISTRY !== 'undefined') {
            YAW_ITEM_REGISTRY.unregisterOwner?.(App, moduleId);
        }
        for (const placement of [...record.questPlacements].reverse()) {
            const templates = App.STRUCTURES?.[placement.structureId]?.quest?.templates;
            if (!Array.isArray(templates)) continue;
            const index = templates.lastIndexOf(placement.id);
            if (index >= 0) templates.splice(index, 1);
        }
        for (const [id, template] of record.questTemplates.entries()) {
            if (App.QUEST_TEMPLATES?.[id] === template) delete App.QUEST_TEMPLATES[id];
        }
        for (const contribution of [...record.templates].reverse()) {
            CONTENT?.registerTemplateTier?.(contribution.category, contribution.type, contribution.variant, contribution.tier, contribution.previous ?? null);
        }
        for (const contribution of [...record.sceneTemplates].reverse()) {
            if (typeof YAW_STORY_EVENTS !== 'undefined') YAW_STORY_EVENTS.unregisterSceneTemplate?.(App, contribution.id, moduleId);
        }
        for (const contribution of [...record.locales].reverse()) {
            CONTENT?.restoreLocaleEntries?.(contribution.locale, contribution.previous);
        }
        let languageChanged = false;
        for (const contribution of [...record.localeDefinitions].reverse()) {
            const result = CONTENT?.unregisterLocale?.(contribution.id, moduleId);
            languageChanged = languageChanged || result?.languageChanged === true;
        }
        CONTENT?.unregisterCreationOptions?.(moduleId);
        if (typeof YAW_BIOME_RECIPES !== 'undefined') YAW_BIOME_RECIPES.unregisterOwner?.(moduleId);
        if (typeof YAW_SUB_ACTIONS !== 'undefined') YAW_SUB_ACTIONS.unregisterOwner?.(App, moduleId);
        if (typeof YAW_RESOURCE_LEDGER !== 'undefined') YAW_RESOURCE_LEDGER.unregisterOwner?.(moduleId);
        if (typeof YAW_STATUS_EFFECTS !== 'undefined') YAW_STATUS_EFFECTS.unregisterOwner?.(moduleId, App);
        if (typeof YAW_RESTRAINTS !== 'undefined') YAW_RESTRAINTS.unregisterOwner?.(moduleId, App);
        if (typeof YAW_ACTION_PROFILES !== 'undefined') YAW_ACTION_PROFILES.unregisterOwner?.(moduleId);
        if (typeof YAW_BODY_MASS !== 'undefined') YAW_BODY_MASS.unregisterOwner?.(moduleId);
        if (typeof YAW_COMBAT_TECHNIQUES !== 'undefined') YAW_COMBAT_TECHNIQUES.unregisterOwner?.(moduleId, App);
        if (typeof YAW_RECOVERY_MODES !== 'undefined') YAW_RECOVERY_MODES.unregisterOwner?.(moduleId, App);
        if (typeof YAW_PERK_REGISTRY !== 'undefined') YAW_PERK_REGISTRY.unregisterOwner?.(moduleId);
        this._removeUiContributionOwner(moduleId);

        this.ownedContributions.delete(moduleId);
        this.moduleDiagnostics.delete(moduleId);
        if (record.localeDefinitions.length || languageChanged) App.refreshLanguagePresentation?.();
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
        if (typeof YAW_BIOME_RECIPES !== 'undefined') YAW_BIOME_RECIPES.unregisterOwner(moduleId);
        if (typeof YAW_AI_PROVIDER_MANAGER !== 'undefined') YAW_AI_PROVIDER_MANAGER.unregisterOwner(moduleId);
        if (typeof YAW_NARRATION_SYSTEM !== 'undefined') {
            YAW_NARRATION_SYSTEM.removeContextExtensions(moduleId);
            YAW_NARRATION_SYSTEM.removeOrchestrators(moduleId);
            YAW_NARRATION_SYSTEM.removeOwner(App, moduleId);
        }
        if (typeof YAW_TILESET_RUNTIME !== 'undefined') YAW_TILESET_RUNTIME.deactivateModule(moduleId);
        if (typeof YAW_SPRITE_RUNTIME !== 'undefined') YAW_SPRITE_RUNTIME.deactivateModule(moduleId);
        if (typeof YAW_AUDIO_RUNTIME !== 'undefined') YAW_AUDIO_RUNTIME.deactivateModule(moduleId);
        if (typeof YAW_MEDIA_REPOSITORY !== 'undefined') YAW_MEDIA_REPOSITORY.releaseOwner(moduleId);
        if (typeof YAW_MEDIA_REPOSITORY !== 'undefined') YAW_MEDIA_REPOSITORY.unregisterProviderOwner?.(moduleId);
        for (const key of [...this.settingActions.keys()]) {
            if (key.startsWith(`${moduleId}:`)) this.settingActions.delete(key);
        }
        
        this.activeModules.delete(moduleId);
        App.initSpeciesGrid?.();
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

            registerBiomeRecipe(recipeId, definition) {
                self._requirePermission(moduleId, manifest, 'world:add_biome_recipe');
                return self._addOwnedBiomeRecipe(moduleId, recipeId, definition);
            },
            
            addSpecies(speciesDef) {
                self._requirePermission(moduleId, manifest, 'content:add_species');
                return self._addOwnedSpecies(moduleId, speciesDef);
            },
            
            addItem(itemDef) {
                self._requirePermission(moduleId, manifest, 'content:add_item');
                return self._addOwnedItem(moduleId, itemDef);
            },

            addEquipment(equipmentDef) {
                self._requirePermission(moduleId, manifest, 'content:add_equipment');
                return self._addOwnedEquipment(moduleId, equipmentDef);
            },

            addQuestTemplate(questDef) {
                self._requirePermission(moduleId, manifest, 'content:add_quest');
                return self._addOwnedQuestTemplate(moduleId, questDef);
            },

            registerContentTemplate(category, type, variant, tier, renderer) {
                self._requirePermission(moduleId, manifest, 'content:add_template');
                self._addOwnedTemplate(moduleId, category, type, variant, tier, renderer);
            },

            registerSceneTemplate(template) {
                self._requirePermission(moduleId, manifest, 'scene:add_template');
                return self._addOwnedSceneTemplate(moduleId, template);
            },

            registerLocale(definition) {
                self._requirePermission(moduleId, manifest, 'content:add_locale');
                return self._addOwnedLocaleDefinition(moduleId, manifest, definition);
            },

            registerLocaleEntries(locale, entries, options = {}) {
                self._requirePermission(moduleId, manifest, 'content:add_locale');
                return self._addOwnedLocaleEntries(moduleId, manifest, locale, entries, options);
            },

            registerCreationOption(option) {
                self._requirePermission(moduleId, manifest, 'content:add_creation_option');
                if (typeof CONTENT === 'undefined' || !CONTENT?.registerCreationOption) throw new Error('Creation option registry is unavailable');
                self._contributionRecord(moduleId);
                return CONTENT.registerCreationOption(moduleId, option);
            },

            registerActionVariant(action, variantId, definition) {
                self._requirePermission(moduleId, manifest, 'content:add_action_variant');
                const registered = YAW_SUB_ACTIONS.register(App, action, variantId, definition, { owner: moduleId });
                self._contributionRecord(moduleId).actionVariants.push({ action: String(action), id: String(variantId) });
                return registered;
            },

            registerResourceProfile(resourceId, definition) {
                self._requirePermission(moduleId, manifest, 'mechanics:add_resource_profile');
                return self._addOwnedResourceProfile(moduleId, resourceId, definition);
            },

            registerStatusEffect(statusId, definition) {
                self._requirePermission(moduleId, manifest, 'mechanics:add_status_effect');
                return self._addOwnedStatusEffect(moduleId, statusId, definition);
            },

            registerRestraintProfile(restraintId, definition) {
                self._requirePermission(moduleId, manifest, 'mechanics:add_restraint_profile');
                return self._addOwnedRestraintProfile(moduleId, restraintId, definition);
            },

            registerActionProfile(actionId, definition) {
                self._requirePermission(moduleId, manifest, 'mechanics:add_action_profile');
                return self._addOwnedActionProfile(moduleId, actionId, definition);
            },

            registerBodyProfile(bodyId, definition) {
                self._requirePermission(moduleId, manifest, 'mechanics:add_body_profile');
                return self._addOwnedBodyProfile(moduleId, bodyId, definition);
            },

            registerCombatTechnique(techniqueId, definition) {
                self._requirePermission(moduleId, manifest, 'mechanics:add_combat_technique');
                return self._addOwnedCombatTechnique(moduleId, techniqueId, definition);
            },

            registerRecoveryMode(modeId, definition) {
                self._requirePermission(moduleId, manifest, 'mechanics:add_recovery_mode');
                return self._addOwnedRecoveryMode(moduleId, modeId, definition);
            },

            registerPerkProfile(definition) {
                self._requirePermission(moduleId, manifest, 'content:add_perk_profile');
                self._assertSerializableData(definition, 'Perk profile');
                const registered = YAW_PERK_REGISTRY.register(App, moduleId, definition);
                self._contributionRecord(moduleId).perkProfiles.push({ id: registered.id });
                return registered;
            },

            resources: {
                read(unit, resourceId) {
                    self._requirePermission(moduleId, manifest, 'mechanics:add_resource_profile');
                    const state = YAW_RESOURCE_LEDGER.state(unit, YAW_RESOURCE_LEDGER.key(moduleId, resourceId));
                    return state ? {
                        key: state.key,
                        current: state.current,
                        capacity: state.capacity,
                        progress: state.progress
                    } : null;
                },

                spend(unit, resourceId, amount = 1) {
                    self._requirePermission(moduleId, manifest, 'mechanics:add_resource_profile');
                    const spent = YAW_RESOURCE_LEDGER.spend(unit, YAW_RESOURCE_LEDGER.key(moduleId, resourceId), amount);
                    if (spent > 0) {
                        App._markSaveDirty?.('party', 'module-resource-spend');
                        App._markSaveDirty?.('holdings', 'module-resource-spend');
                    }
                    return spent;
                },

                grant(unit, resourceId, amount = 1) {
                    self._requirePermission(moduleId, manifest, 'mechanics:add_resource_profile');
                    const granted = YAW_RESOURCE_LEDGER.grant(unit, YAW_RESOURCE_LEDGER.key(moduleId, resourceId), amount);
                    if (granted > 0) {
                        App._markSaveDirty?.('party', 'module-resource-grant');
                        App._markSaveDirty?.('holdings', 'module-resource-grant');
                    }
                    return granted;
                }
            },

            getContext(options = {}) {
                self._requirePermission(moduleId, manifest, 'ui.read');
                return self.getPublicContext(options);
            },

            registerUiContribution(slot, contributionId, definition) {
                self._requirePermission(moduleId, manifest, 'ui:contribute');
                return self._registerUiContribution(moduleId, slot, contributionId, definition);
            },

            media: {
                async list() {
                    self._requirePermission(moduleId, manifest, 'media:read');
                    return YAW_MEDIA_REPOSITORY.listOwner(moduleId);
                },

                async metadata(resourceId) {
                    self._requirePermission(moduleId, manifest, 'media:read');
                    return YAW_MEDIA_REPOSITORY.metadata(moduleId, resourceId);
                },

                async acquire(resourceId, options = {}) {
                    self._requirePermission(moduleId, manifest, 'media:read');
                    return YAW_MEDIA_REPOSITORY.acquire(moduleId, resourceId, {
                        fallbackProviderId: options?.fallbackProviderId ? String(options.fallbackProviderId) : undefined
                    });
                },

                release(leaseId) {
                    self._requirePermission(moduleId, manifest, 'media:read');
                    return YAW_MEDIA_REPOSITORY.release(moduleId, leaseId);
                }
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

            getCachedTileNarration(options = {}) {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                return YAW_NARRATION_SYSTEM.getCachedTileNarration(App, moduleId, options);
            },

            cacheTileNarration(narrationId, options = {}) {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                return YAW_NARRATION_SYSTEM.cacheTileNarration(App, moduleId, narrationId, options);
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

            async ownsNarrationExchange(envelope = {}) {
                self._requirePermission(moduleId, manifest, 'scene:narrate');
                const enabledSetting = (manifest?.settings || []).find(setting => setting.key === 'enabled' && setting.type === 'boolean');
                if (enabledSetting && !(await self.getModuleSetting(moduleId, enabledSetting.key, enabledSetting.default ?? true))) return false;
                const providerSetting = (manifest?.settings || []).find(setting => setting.type === 'provider_connection');
                if (providerSetting) {
                    const connectionId = await self.getModuleSetting(moduleId, providerSetting.key, providerSetting.default || '');
                    if (!connectionId) {
                        YAW_NARRATION_SYSTEM.logOperationalError(App, moduleId, 'provider_connection_not_selected');
                        return false;
                    }
                    const available = YAW_AI_PROVIDER_MANAGER.listConnections(providerSetting.capability || 'text.generate', moduleId)
                        .some(connection => connection.id === connectionId);
                    if (!available) {
                        YAW_NARRATION_SYSTEM.logOperationalError(App, moduleId, 'provider_connection_unavailable');
                        return false;
                    }
                    YAW_NARRATION_SYSTEM.clearOperationalErrors(moduleId);
                }
                return YAW_NARRATION_SYSTEM.ownsExchange(moduleId, envelope);
            },

            registerAIProvider(providerId, adapter) {
                self._requirePermission(moduleId, manifest, 'ai:provide');
                return YAW_AI_PROVIDER_MANAGER.registerAdapter(providerId, adapter, moduleId);
            },

            registerMediaProvider(providerId, adapter) {
                self._requirePermission(moduleId, manifest, 'media:provide');
                if (!self.activeModules.has(moduleId)) throw new Error(`Module ${moduleId} is not active`);
                return YAW_MEDIA_REPOSITORY.registerAdapter(moduleId, providerId, adapter);
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
                listConnections(capability = 'text.generate') {
                    self._requirePermission(moduleId, manifest, 'ai:request');
                    return YAW_AI_PROVIDER_MANAGER.listConnections(capability, moduleId);
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
        const normalized = modules.map(module => ({
            ...module,
            provenance: this._normalizeProvenance(module.provenance || 'user'),
            hostId: String(module.hostId || ''),
            sourceUrl: String(module.sourceUrl || ''),
            integrity: String(module.integrity || ''),
            integrityVerified: module.integrityVerified === true,
            sourceFetchedAt: Number(module.sourceFetchedAt) || 0,
            sourceByteLength: Math.max(0, Number(module.sourceByteLength) || 0),
            sourceContentType: String(module.sourceContentType || ''),
            hostPolicyState: this.hostPolicyState(module.id) || String(module.hostPolicyState || '')
        }));
        this.moduleRecords = new Map(normalized.map(module => [module.id, module]));
        return normalized;
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
    async deleteModule(moduleId, options = {}) {
        const existing = (await this.getAllModules()).find(module => module.id === moduleId);
        if (existing && !['user', 'remote'].includes(existing.provenance) && options.bypassOwnership !== true) {
            throw new Error('Host and built-in modules cannot be deleted by the player');
        }
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
        if (typeof YAW_MEDIA_REPOSITORY !== 'undefined') await YAW_MEDIA_REPOSITORY.removeOwner(moduleId);
        if (typeof CONTENT !== 'undefined' && CONTENT?.unregisterPolicyProvider) {
            CONTENT.unregisterPolicyProvider(moduleId);
        }
        this.moduleRecords.delete(moduleId);
        
        console.log(`Module deleted: ${moduleId}`);
    }
};

// Initialize module storage. App.init restores enabled module runtimes after
// content preferences have been applied.
MODULE_SYSTEM.ready = MODULE_SYSTEM.init().then(() => {
    console.log('Module system ready');
    return MODULE_SYSTEM;
}).catch(err => {
    console.error('Module system failed:', err);
    throw err;
});
MODULE_SYSTEM.prepareInstalledMedia = async () => {
    await MODULE_SYSTEM.ready;
    if (typeof YAW_MEDIA_REPOSITORY !== 'undefined') await YAW_MEDIA_REPOSITORY.cleanup?.();
    console.log('Installed media ready');
    return typeof YAW_MEDIA_REPOSITORY !== 'undefined' ? YAW_MEDIA_REPOSITORY : null;
};
MODULE_SYSTEM.mediaReady = MODULE_SYSTEM.prepareInstalledMedia().catch(err => {
    console.error('Installed media failed:', err);
    throw err;
});
