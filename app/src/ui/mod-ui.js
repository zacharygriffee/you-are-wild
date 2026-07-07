
/**
 * Module Manager UI Controller
 */
const ModUI = {
    label(key, fallback, vars = {}) {
        if (typeof App !== 'undefined' && App._label) return App._label(key, fallback, vars);
        if (typeof CONTENT !== 'undefined' && CONTENT.t) {
            const text = CONTENT.t(key, vars);
            return text === key ? fallback : text;
        }
        return fallback;
    },

    escapeHtml(value) {
        if (typeof App !== 'undefined' && App._escapeHtml) return App._escapeHtml(value);
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    },

    jsString(value) {
        return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    },

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const content = await this.readFile(file);
            
            // Try to parse as module
            let moduleData;
            if (file.name.endsWith('.json')) {
                moduleData = JSON.parse(content);
            } else if (file.name.endsWith('.js')) {
                // Wrap JS in module format
                moduleData = {
                    manifest: {
                        id: 'mod_' + Date.now(),
                        name: file.name.replace('.js', ''),
                        version: '1.0.0',
                        type: 'feature_pack',
                        contentRating: 'safe',
                        permissions: [],
                        dependencies: []
                    },
                    code: content
                };
            } else {
                throw new Error(this.label('mod.unsupportedFile', 'Unsupported module file type'));
            }
            
            const installed = await MODULE_SYSTEM.installModule(moduleData);
            const moduleName = installed.manifest.name;
            App.log.push({ text: this.label('mod.installedLog', 'Installed module: {name}', { name: moduleName }), type: 'discovery' });
            App.renderLog();
            this.refreshModList();
            
            alert(this.label('mod.installedAlert', 'Module "{name}" installed successfully!', { name: moduleName }));
        } catch (e) {
            alert(this.label('mod.installFailed', 'Failed to install module: {message}', { message: e.message }));
            console.error(e);
        }
    },
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },
    
    async toggleModule(moduleId) {
        const modules = await MODULE_SYSTEM.getAllModules();
        const mod = modules.find(m => m.id === moduleId);
        if (!mod) return;
        
        const newState = !mod.enabled;
        const name = mod.manifest?.name || mod.id || 'Module';
        try {
            await MODULE_SYSTEM.setModuleEnabled(moduleId, newState);
            await this.refreshModList();

            App.log.push({
                text: this.label(newState ? 'mod.enabledLog' : 'mod.disabledLog', newState ? 'Enabled module: {name}' : 'Disabled module: {name}', { name }),
                type: 'discovery'
            });
            App.renderLog();
        } catch (e) {
            await this.refreshModList();
            const message = e?.message || e;
            const key = newState ? 'mod.enableFailed' : 'mod.disableFailed';
            const fallback = newState ? 'Could not enable {name}: {message}' : 'Could not disable {name}: {message}';
            const text = this.label(key, fallback, { name, message });
            App.log.push({ text, type: 'discovery' });
            App.renderLog();
            alert(text);
            console.error(e);
        }
    },
    
    async deleteModule(moduleId) {
        if (!confirm(this.label('mod.confirmDelete', 'Delete this module? This cannot be undone.'))) return;
        
        await MODULE_SYSTEM.deleteModule(moduleId);
        this.refreshModList();
    },
    
    async refreshModList() {
        const container = document.getElementById('mod-list');
        if (!container) return;
        
        let modules = [];
        try {
            modules = await MODULE_SYSTEM.getAllModules();
        } catch (e) {
            console.warn('Failed to load modules:', e);
            container.innerHTML = `
                <p style="color: var(--text-muted); text-align: center; padding: 32px;">
                    ${this.escapeHtml(this.label('mod.storageNotReady', 'Module storage not ready. Try again in a moment.'))}
                </p>
            `;
            return;
        }
        
        if (modules.length === 0) {
            container.innerHTML = `
                <p style="color: var(--text-muted); text-align: center; padding: 32px;">
                    ${this.escapeHtml(this.label('mod.noneInstalled', 'No modules installed. Install one above or create an example.'))}
                </p>
            `;
            return;
        }
        
        container.innerHTML = modules.map(mod => {
            const manifest = mod.manifest || {};
            const name = this.escapeHtml(manifest.name || mod.id || 'Module');
            const version = this.escapeHtml(manifest.version || '1.0.0');
            const description = this.escapeHtml(manifest.description || this.label('mod.noDescription', 'No description'));
            const type = this.escapeHtml(manifest.type || 'module');
            const installed = this.escapeHtml(new Date(mod.installedAt).toLocaleDateString());
            const id = this.escapeHtml(this.jsString(mod.id));
            const statusLabel = this.escapeHtml(this.label(mod.enabled ? 'mod.enabled' : 'mod.disabled', mod.enabled ? 'Enabled' : 'Disabled'));
            const enableTitle = this.escapeHtml(this.label(mod.enabled ? 'mod.disableModule' : 'mod.enableModule', mod.enabled ? 'Disable {name}' : 'Enable {name}', { name: manifest.name || mod.id || 'Module' }));
            const deleteLabel = this.escapeHtml(this.label('mod.delete', 'Delete'));
            const deleteTitle = this.escapeHtml(this.label('mod.deleteModule', 'Delete {name}', { name: manifest.name || mod.id || 'Module' }));
            return `
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                        border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px;
                        display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px;">📦</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary);">
                        ${name}
                        <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">
                            v${version}
                        </span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                        ${description}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                        ${this.escapeHtml(this.label('mod.type', 'Type'))}: ${type} • ${this.escapeHtml(this.label('mod.installed', 'Installed'))}: ${installed}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="nav-btn" data-command-surface="module-manager" data-command-mode="system" data-command-control="toggle-module" style="padding: 6px 12px; font-size: 12px;"
                            title="${enableTitle}" aria-label="${enableTitle}"
                            onclick="ModUI.toggleModule('${id}')">
                        ${mod.enabled ? '✓' : '○'} ${statusLabel}
                    </button>
                    <button class="nav-btn" data-command-surface="module-manager" data-command-mode="system" data-command-control="delete-module" style="padding: 6px 12px; font-size: 12px; color: var(--accent-danger);"
                            title="${deleteTitle}" aria-label="${deleteTitle}"
                            onclick="ModUI.deleteModule('${id}')">
                        🗑️ ${deleteLabel}
                    </button>
                </div>
            </div>
        `;
        }).join('');
    },
    
    async createExampleMod() {
        const exampleMod = {
            manifest: {
                id: 'mod_example_biome',
                name: 'Crystal Caverns',
                version: '1.0.0',
                author: 'Example Author',
                description: 'Adds shimmering crystal cave biomes with gem-themed creatures',
                type: 'biome_pack',
                permissions: ['world:add_biome', 'content:add_species'],
                dependencies: [],
                minGameVersion: '0.10.0'
            },
            code: `
                // Crystal Caverns Module
                MODS.registerHook('onMapGenerate', (tile, x, y) => {
                    // 5% chance for crystal biome
                    if (Math.random() < 0.05) {
                        tile.tag = 'CrystalCave';
                        tile.name = 'Shimmering Cavern';
                        tile.color = '#9b59b6';
                    }
                }, 10);
                
                MODS.addBiome({
                    id: 'crystal_cave',
                    name: 'Crystal Cavern',
                    color: '#9b59b6',
                    encounters: ['CrystalGolem', 'GemSerpent'],
                    loot: ['crystal_shard', 'gemstone']
                });
                
                MODS.addSpecies({
                    id: 'crystal_golem',
                    name: 'Crystal Golem',
                    icon: '💎',
                    desc: 'Animated mineral construct',
                    stats: { str: 15, con: 18, spd: 5 }
                });
                
                MODS.log('Crystal Caverns module loaded!');
            `
        };
        
        await MODULE_SYSTEM.installModule(exampleMod);
        App.log.push({ text: this.label('mod.createdExample', 'Created example module: Crystal Caverns'), type: 'discovery' });
        App.renderLog();
        this.refreshModList();
    },
    
    showModScreen() {
        if (typeof App !== 'undefined' && typeof App.showScreen === 'function') {
            return App.showScreen('mods');
        }
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        document.getElementById('screen-mods').style.display = 'block';
        document.getElementById('screen-mods').classList.add('active');
        try { this.refreshModList(); } catch(e) { console.warn('ModUI error:', e); }
    }
};

// Add module manager to navigation
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-menu')) return;
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const modBtn = document.createElement('button');
        modBtn.className = 'nav-btn';
        modBtn.innerHTML = '📦 <span data-i18n="ui.menu.mods">Mods</span>';
        modBtn.title = 'Open mods';
        modBtn.setAttribute('data-i18n-title', 'ui.menu.modsTitle');
        modBtn.setAttribute('aria-label', 'Open mods');
        modBtn.setAttribute('data-i18n-aria-label', 'ui.menu.modsTitle');
        modBtn.onclick = () => ModUI.showModScreen();
        nav.appendChild(modBtn);
        App.applyStaticLocalization?.(nav);
    }
});
