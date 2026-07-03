
/**
 * MODULE MARKETPLACE
 * Browse, download, and share community content
 */

const MODULE_MARKETPLACE = {
    // Simulated market data (in real app, fetch from server)
    featuredModules: [
        {
            id: 'mod_desert_expansion',
            name: 'Desert of Whispers',
            author: 'SandyClaws',
            version: '1.2.0',
            description: 'Scorching sands, mirage oases, and sand-wyrm encounters',
            downloads: 15420,
            rating: 4.8,
            size: '1.2 MB',
            type: 'biome_pack',
            tags: ['biome', 'desert', 'hard'],
            preview: '🏜️'
        },
        {
            id: 'mod_cyberpunk_city',
            name: 'Neon District',
            author: 'GlitchQueen',
            version: '2.0.1',
            description: 'Futuristic city biome with android predators',
            downloads: 8932,
            rating: 4.5,
            size: '2.8 MB',
            type: 'biome_pack',
            tags: ['biome', 'cyberpunk', 'scifi'],
            preview: '🌃'
        },
        {
            id: 'mod_ancient_ruins',
            name: 'Forgotten Temples',
            author: 'RuinDelver',
            version: '1.0.5',
            description: 'Jungle ruins with trap mechanics and ancient guardians',
            downloads: 5621,
            rating: 4.9,
            size: '890 KB',
            type: 'feature_pack',
            tags: ['dungeon', 'exploration', 'puzzle'],
            preview: '🏛️'
        },
        {
            id: 'mod_dragon_breeds',
            name: 'Dragon Compendium',
            author: 'ScaleScholar',
            version: '1.5.0',
            description: '15 new dragon species with unique abilities',
            downloads: 22134,
            rating: 4.7,
            size: '1.5 MB',
            type: 'species_pack',
            tags: ['species', 'dragons', 'late-game'],
            preview: '🐲'
        },
        {
            id: 'mod_halloween_special',
            name: 'Spooky Season',
            author: 'PumpkinKing',
            version: '1.0.0',
            description: 'Limited time: Halloween-themed encounters and costumes',
            downloads: 9876,
            rating: 4.6,
            size: '600 KB',
            type: 'seasonal',
            tags: ['seasonal', 'halloween', 'limited'],
            preview: '🎃'
        },
        {
            id: 'mod_deep_sea',
            name: 'Abyssal Depths',
            author: 'OceanExplorer',
            version: '0.9.0',
            description: 'Underwater biomes with pressure mechanics',
            downloads: 3421,
            rating: 4.3,
            size: '1.8 MB',
            type: 'biome_pack',
            tags: ['biome', 'ocean', 'experimental'],
            preview: '🌊'
        }
    ],
    
    // UI Controller
    ui: {
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

        showMarketplace() {
            const featured = MODULE_MARKETPLACE.featuredModules[0] || {};
            const title = this.escapeHtml(this.label('market.title', 'Module Marketplace'));
            const subtitle = this.escapeHtml(this.label('market.subtitle', 'Discover community-made biomes, species, and features'));
            const myModules = this.escapeHtml(this.label('market.myModules', 'My Modules'));
            const create = this.escapeHtml(this.label('market.create', 'Create'));
            const search = this.escapeHtml(this.label('market.search', 'Search modules...'));
            const typeLabel = this.escapeHtml(this.label('market.typeFilter', 'Module type'));
            const sortLabel = this.escapeHtml(this.label('market.sort', 'Sort modules'));
            const staffPicks = this.escapeHtml(this.label('market.staffPicks', 'Staff Picks'));
            const installLabel = this.escapeHtml(this.label('market.install', 'Install'));
            const closeLabel = this.escapeHtml(this.label('ui.close', 'Close'));
            const closeTitle = this.escapeHtml(this.label('market.closeTitle', 'Close marketplace'));
            const staffTitle = this.escapeHtml(featured.name || 'Desert of Whispers');
            const staffDesc = this.escapeHtml(this.label('market.staffPickDescription', 'Our most popular biome expansion. Navigate scorching sands, discover hidden oases, and survive encounters with legendary sand-wyrms.'));
            const downloadsText = this.escapeHtml(this.label('market.downloadsCount', '{count} downloads', { count: '15k+' }));
            const ratingText = this.escapeHtml(this.label('market.ratingCount', '{rating} rating', { rating: '4.8' }));
            const installTitle = this.escapeHtml(this.label('market.installModule', 'Install {name}', { name: featured.name || 'module' }));
            const html = `
                <div style="max-width: 1000px; margin: 0 auto; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <div>
                            <h1 style="color: var(--accent-primary); margin: 0;">🏪 ${title}</h1>
                            <p style="color: var(--text-muted); margin: 8px 0 0 0;">
                                ${subtitle}
                            </p>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="nav-btn" title="${myModules}" aria-label="${myModules}" onclick="MODULE_MARKETPLACE.ui.showInstalled()">
                                📦 ${myModules}
                            </button>
                            <button class="nav-btn" title="${create}" aria-label="${create}" onclick="MODULE_MARKETPLACE.ui.showCreate()">
                                ✏️ ${create}
                            </button>
                            <button class="nav-btn" title="${closeTitle}" aria-label="${closeTitle}" onclick="returnToGame()">
                                ${closeLabel}
                            </button>
                        </div>
                    </div>
                    
                    <!-- Search & Filter -->
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-default); 
                                    border-radius: var(--radius-md); padding: 16px; margin-bottom: 24px;">
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <input type="text" placeholder="🔍 ${search}" aria-label="${search}"
                                   style="flex: 1; min-width: 200px; background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                                          border-radius: var(--radius-sm); padding: 8px 12px; color: var(--text-primary); font-size: 14px;"
                                   oninput="MODULE_MARKETPLACE.ui.filter(this.value)">
                            <select aria-label="${typeLabel}" onchange="MODULE_MARKETPLACE.ui.filterByType(this.value)"
                                    style="background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                                           border-radius: var(--radius-sm); padding: 8px 12px; color: var(--text-primary); font-size: 14px;">
                                <option value="all">${this.escapeHtml(this.label('market.type.all', 'All Types'))}</option>
                                <option value="biome_pack">${this.escapeHtml(this.label('market.type.biome_pack', 'Biomes'))}</option>
                                <option value="species_pack">${this.escapeHtml(this.label('market.type.species_pack', 'Species'))}</option>
                                <option value="feature_pack">${this.escapeHtml(this.label('market.type.feature_pack', 'Features'))}</option>
                                <option value="content_pack">${this.escapeHtml(this.label('market.type.content_pack', 'Content'))}</option>
                            </select>
                            <select aria-label="${sortLabel}" onchange="MODULE_MARKETPLACE.ui.sort(this.value)"
                                    style="background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                                           border-radius: var(--radius-sm); padding: 8px 12px; color: var(--text-primary); font-size: 14px;">
                                <option value="featured">${this.escapeHtml(this.label('market.sort.featured', 'Featured'))}</option>
                                <option value="downloads">${this.escapeHtml(this.label('market.sort.downloads', 'Most Downloaded'))}</option>
                                <option value="rating">${this.escapeHtml(this.label('market.sort.rating', 'Highest Rated'))}</option>
                                <option value="newest">${this.escapeHtml(this.label('market.sort.newest', 'Newest'))}</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Module Grid -->
                    <div id="market-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                        ${MODULE_MARKETPLACE.featuredModules.map(m => this.renderModuleCard(m)).join('')}
                    </div>
                    
                    <!-- Featured Section -->
                    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border-default);">
                        <h2 style="color: var(--text-secondary); font-size: 18px; margin-bottom: 16px;">
                            ⭐ ${staffPicks}
                        </h2>
                        <div style="background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary)); 
                                        border: 1px solid var(--border-default); border-radius: var(--radius-md); 
                                        padding: 20px; display: flex; gap: 20px; align-items: center;">
                            <div style="font-size: 64px;">🏜️</div>
                            <div style="flex: 1;">
                                <h3 style="color: var(--accent-primary); margin: 0 0 8px 0;">${staffTitle}</h3>
                                <p style="color: var(--text-secondary); margin: 0 0 12px 0;">
                                    ${staffDesc}
                                </p>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                    <span style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: var(--radius-sm); 
                                                 font-size: 12px; color: var(--text-muted);">${downloadsText}</span>
                                    <span style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: var(--radius-sm); 
                                                 font-size: 12px; color: var(--text-muted);">⭐ ${ratingText}</span>
                                </div>
                            </div>
                            <button class="nav-btn" style="background: var(--accent-primary); color: var(--bg-primary);"
                                    title="${installTitle}" aria-label="${installTitle}"
                                    onclick="MODULE_MARKETPLACE.ui.install('mod_desert_expansion')">
                                ${installLabel}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('market-content').innerHTML = html;
        },
        
        renderModuleCard(mod) {
            const name = this.escapeHtml(mod.name);
            const type = this.escapeHtml(String(mod.type || '').replace('_', ' '));
            const description = this.escapeHtml(mod.description);
            const preview = this.escapeHtml(mod.preview);
            const author = this.escapeHtml(mod.author);
            const version = this.escapeHtml(mod.version);
            const size = this.escapeHtml(mod.size);
            const id = this.escapeHtml(this.jsString(mod.id));
            const installLabel = this.escapeHtml(this.label('market.install', 'Install'));
            const installTitle = this.escapeHtml(this.label('market.installModule', 'Install {name}', { name: mod.name }));
            const downloads = this.escapeHtml(this.formatNumber(mod.downloads));
            const rating = this.escapeHtml(String(mod.rating));
            const byline = this.escapeHtml(this.label('market.byline', 'by {author} • v{version} • {size}', {
                author: mod.author,
                version: mod.version,
                size: mod.size
            }));
            return `
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-default); 
                                border-radius: var(--radius-md); overflow: hidden; transition: all 0.2s; cursor: pointer;"
                     onmouseenter="this.style.borderColor='var(--accent-primary)'; this.style.transform='translateY(-4px)'"
                     onmouseleave="this.style.borderColor='var(--border-default)'; this.style.transform='translateY(0)'">
                    <div style="height: 100px; background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-elevated)); 
                                    display: flex; align-items: center; justify-content: center; font-size: 48px;">
                        ${preview}
                    </div>
                    <div style="padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">${name}</h3>
                            <span style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: var(--radius-sm); 
                                         font-size: 10px; color: var(--text-muted); text-transform: uppercase;">
                                ${type}
                            </span>
                        </div>
                        <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-muted); line-height: 1.5;">
                            ${description}
                        </p>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-muted);">
                                <span>⬇️ ${downloads}</span>
                                <span>⭐ ${rating}</span>
                            </div>
                            <button class="nav-btn" style="padding: 6px 12px; font-size: 12px;"
                                    title="${installTitle}" aria-label="${installTitle}"
                                    onclick="event.stopPropagation(); MODULE_MARKETPLACE.ui.install('${id}')">
                                ${installLabel}
                            </button>
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
                            ${byline}
                        </div>
                    </div>
                </div>
            `;
        },
        
        formatNumber(n) {
            if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
            return n.toString();
        },
        
        filter(query) {
            // Filter implementation
            console.log('Filter:', query);
        },
        
        filterByType(type) {
            console.log('Filter by type:', type);
        },
        
        sort(method) {
            console.log('Sort by:', method);
        },
        
        async install(moduleId) {
            const mod = MODULE_MARKETPLACE.featuredModules.find(m => m.id === moduleId);
            if (!mod) return;
            
            // Simulate download
            App.log.push({ text: this.label('market.downloading', 'Downloading {name}...', { name: mod.name }), type: 'discovery' });
            App.renderLog();
            
            await new Promise(r => setTimeout(r, 1500));
            
            // Create mock module
            const mockModule = {
                manifest: {
                    id: mod.id,
                    name: mod.name,
                    version: mod.version,
                    author: mod.author,
                    description: mod.description,
                    type: mod.type
                },
                code: `
                    // ${mod.name} Module
                    MODS.log('${mod.name} loaded!');
                    // Module content would be here
                `
            };
            
            await MODULE_SYSTEM.installModule(mockModule);
            await MODULE_SYSTEM.setModuleEnabled(mod.id, true);
            
            App.log.push({ text: this.label('market.installedEnabled', 'Installed and enabled {name}!', { name: mod.name }), type: 'discovery' });
            App.renderLog();
            
            alert(this.label('market.installSuccess', 'Successfully installed {name}!', { name: mod.name }));
            
            // Refresh UI
            ModUI.refreshModList();
        },
        
        showInstalled() {
            ModUI.showModScreen();
        },
        
        showCreate() {
            alert(this.label('market.createWizardPlaceholder', 'Module creation wizard would open here!\n\nThis would guide you through:\n- Creating a manifest\n- Writing content templates\n- Testing in sandbox\n- Packaging for upload'));
        }
    }
};

// Make available
window.MARKET = MODULE_MARKETPLACE;
