
/**
 * YOU ARE WILD MODULE MANAGER
 * IndexedDB-based module storage with hook system
 */

const MODULE_SYSTEM = {
    DB_NAME: 'YAW_Modules',
    LEGACY_DB_NAME: 'FFFme_Modules',
    DB_VERSION: 1,
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
    
    // Register a hook
    registerHook(event, callback, priority = 0) {
        if (!this.hooks[event]) {
            this.hooks[event] = [];
        }
        this.hooks[event].push({ callback, priority });
        this.hooks[event].sort((a, b) => b.priority - a.priority);
    },
    
    // Execute hooks
    async executeHook(event, ...args) {
        const hooks = this.hooks[event] || [];
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
        const module = {
            id: moduleData.manifest.id,
            manifest: moduleData.manifest,
            code: moduleData.code,
            assets: moduleData.assets || {},
            enabled: false,
            installedAt: Date.now()
        };
        
        const tx = this.db.transaction(['modules'], 'readwrite');
        const store = tx.objectStore('modules');
        await store.put(module);
        
        console.log(`Module installed: ${module.manifest.name}`);
        return module;
    },
    
    // Enable/disable module
    async setModuleEnabled(moduleId, enabled) {
        const tx = this.db.transaction(['modules'], 'readwrite');
        const store = tx.objectStore('modules');
        
        const module = await store.get(moduleId);
        if (!module) throw new Error('Module not found');
        
        module.enabled = enabled;
        await store.put(module);
        
        if (enabled) {
            await this.loadModule(module);
        } else {
            this.unloadModule(moduleId);
        }
        
        return module;
    },
    
    // Load module into game
    async loadModule(module) {
        try {
            // Create sandboxed context
            const sandbox = {
                MODS: this.createModAPI(module.id),
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
            
            // Execute module code in sandbox
            const fn = new Function('sandbox', `
                with(sandbox) {
                    ${module.code}
                }
            `);
            
            fn(sandbox);
            
            this.activeModules.set(module.id, {
                ...module,
                sandbox
            });
            
            console.log(`Module loaded: ${module.manifest.name}`);
        } catch (e) {
            console.error(`Failed to load module ${module.id}:`, e);
            throw e;
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
        
        this.activeModules.delete(moduleId);
        console.log(`Module unloaded: ${moduleId}`);
    },
    
    // Create API for mods
    createModAPI(moduleId) {
        const self = this;
        return {
            id: moduleId,
            
            registerHook(event, callback, priority = 0) {
                self.registerHook(event, callback, priority);
            },
            
            executeHook(event, ...args) {
                return self.executeHook(event, ...args);
            },
            
            addBiome(biomeDef) {
                App.biomes = App.biomes || {};
                App.biomes[biomeDef.id] = biomeDef;
            },
            
            addSpecies(speciesDef) {
                App.species.push(speciesDef);
            },
            
            addItem(itemDef) {
                App.items = App.items || [];
                App.items.push(itemDef);
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
        const tx = this.db.transaction(['modules'], 'readonly');
        const store = tx.objectStore('modules');
        return await store.getAll();
    },
    
    // Get module settings
    async getModuleSetting(moduleId, key, defaultValue = null) {
        const tx = this.db.transaction(['settings'], 'readonly');
        const store = tx.objectStore('settings');
        const setting = await store.get(`${moduleId}:${key}`);
        return setting ? setting.value : defaultValue;
    },
    
    // Set module setting
    async setModuleSetting(moduleId, key, value) {
        const tx = this.db.transaction(['settings'], 'readwrite');
        const store = tx.objectStore('settings');
        await store.put({
            key: `${moduleId}:${key}`,
            value: value
        });
    },
    
    // Delete module
    async deleteModule(moduleId) {
        this.unloadModule(moduleId);
        
        const tx = this.db.transaction(['modules', 'assets', 'settings'], 'readwrite');
        
        await tx.objectStore('modules').delete(moduleId);
        
        // Delete associated assets
        const assetStore = tx.objectStore('assets');
        const assetIndex = assetStore.index('moduleId');
        const assets = await assetIndex.getAll(moduleId);
        for (const asset of assets) {
            await assetStore.delete(asset.id);
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
