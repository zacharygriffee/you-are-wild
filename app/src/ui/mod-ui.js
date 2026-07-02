
/**
 * Module Manager UI Controller
 */
const ModUI = {
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
                        type: 'feature_pack'
                    },
                    code: content
                };
            }
            
            await MODULE_SYSTEM.installModule(moduleData);
            App.log.push({ text: `Installed module: ${moduleData.manifest.name}`, type: 'discovery' });
            App.renderLog();
            this.refreshModList();
            
            alert(`Module "${moduleData.manifest.name}" installed successfully!`);
        } catch (e) {
            alert('Failed to install module: ' + e.message);
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
        await MODULE_SYSTEM.setModuleEnabled(moduleId, newState);
        this.refreshModList();
        
        App.log.push({ 
            text: `${newState ? 'Enabled' : 'Disabled'} module: ${mod.manifest.name}`, 
            type: 'discovery' 
        });
        App.renderLog();
    },
    
    async deleteModule(moduleId) {
        if (!confirm('Delete this module? This cannot be undone.')) return;
        
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
                    Module storage not ready. Try again in a moment.
                </p>
            `;
            return;
        }
        
        if (modules.length === 0) {
            container.innerHTML = `
                <p style="color: var(--text-muted); text-align: center; padding: 32px;">
                    No modules installed. Install one above or create an example.
                </p>
            `;
            return;
        }
        
        container.innerHTML = modules.map(mod => `
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                        border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px;
                        display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px;">📦</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary);">
                        ${mod.manifest.name}
                        <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">
                            v${mod.manifest.version}
                        </span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                        ${mod.manifest.description || 'No description'}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                        Type: ${mod.manifest.type} • Installed: ${new Date(mod.installedAt).toLocaleDateString()}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="nav-btn" style="padding: 6px 12px; font-size: 12px;"
                            onclick="ModUI.toggleModule('${mod.id}')">
                        ${mod.enabled ? '✓ Enabled' : '○ Disabled'}
                    </button>
                    <button class="nav-btn" style="padding: 6px 12px; font-size: 12px; color: var(--accent-danger);"
                            onclick="ModUI.deleteModule('${mod.id}')">
                        �️ Delete
                    </button>
                </div>
            </div>
        `).join('');
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
        App.log.push({ text: 'Created example module: Crystal Caverns', type: 'discovery' });
        App.renderLog();
        this.refreshModList();
    },
    
    showModScreen() {
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
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const modBtn = document.createElement('button');
        modBtn.className = 'nav-btn';
        modBtn.textContent = '📦 Mods';
        modBtn.title = 'Open mods';
        modBtn.setAttribute('aria-label', 'Open mods');
        modBtn.onclick = () => ModUI.showModScreen();
        nav.appendChild(modBtn);
    }
});
