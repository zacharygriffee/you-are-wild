
/**
 * MODULE MARKETPLACE
 * Browse local sample module fixtures and exercise install workflows
 */

const MODULE_MARKETPLACE = {
    // Sample local catalog fixtures. This is not a remote marketplace feed.
    sampleModules: [
        {
            id: 'sample_biome_safe',
            name: 'Safe Biome Fixture',
            version: '0.1.0',
            description: 'Fixture stub for the safe biome-pack install path',
            samplePurpose: 'Biome-pack install and enable flow',
            type: 'biome_pack',
            contentRating: 'safe',
            tags: ['fixture', 'biome', 'safe-flow'],
            preview: '🏜️'
        },
        {
            id: 'sample_policy_mature',
            name: 'Mature Policy Fixture',
            version: '0.1.0',
            description: 'Fixture stub for mature-rating enablement policy checks',
            samplePurpose: 'Mature-rating policy flow',
            type: 'biome_pack',
            contentRating: 'mature',
            tags: ['fixture', 'policy', 'mature-flow'],
            preview: '🌃'
        },
        {
            id: 'sample_feature_pack',
            name: 'Feature Metadata Fixture',
            version: '0.1.0',
            description: 'Fixture stub for feature-pack metadata rendering',
            samplePurpose: 'Feature-pack metadata flow',
            type: 'feature_pack',
            contentRating: 'safe',
            tags: ['fixture', 'feature', 'metadata'],
            preview: '🏛️'
        },
        {
            id: 'sample_species_pack',
            name: 'Species Metadata Fixture',
            version: '0.1.0',
            description: 'Fixture stub for species-pack catalog metadata',
            samplePurpose: 'Species-pack metadata flow',
            type: 'species_pack',
            contentRating: 'safe',
            tags: ['fixture', 'species', 'metadata'],
            preview: '🐲'
        },
        {
            id: 'sample_policy_seasonal',
            name: 'Seasonal Tag Fixture',
            version: '0.1.0',
            description: 'Fixture stub for seasonal tag and filter behavior',
            samplePurpose: 'Seasonal tag/filter flow',
            type: 'seasonal',
            contentRating: 'mature',
            tags: ['fixture', 'seasonal', 'filter-flow'],
            preview: '🎃'
        },
        {
            id: 'sample_experimental_biome',
            name: 'Experimental Tag Fixture',
            version: '0.1.0',
            description: 'Fixture stub for experimental tag and sort behavior',
            samplePurpose: 'Experimental tag/filter flow',
            type: 'biome_pack',
            contentRating: 'safe',
            tags: ['fixture', 'experimental', 'sort-flow'],
            preview: '🌊'
        }
    ],
    
    // UI Controller
    ui: {
        filterQuery: '',
        typeFilter: 'all',
        sortMethod: 'catalog',

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

        normalizeContentRating(value) {
            const rating = String(value || 'safe').trim().toLowerCase();
            return ['safe', 'mature', 'adult'].includes(rating) ? rating : 'safe';
        },

        contentRatingLabel(value) {
            const rating = this.normalizeContentRating(value);
            const fallback = rating.charAt(0).toUpperCase() + rating.slice(1);
            return this.label(`market.rating.${rating}`, fallback);
        },

        renderContentRatingBadge(value) {
            const rating = this.normalizeContentRating(value);
            const rawLabel = this.contentRatingLabel(rating);
            const label = this.escapeHtml(rawLabel);
            const title = this.escapeHtml(this.label('market.contentRatingTitle', 'Content rating: {rating}', { rating: rawLabel }));
            return `<span data-content-rating="${this.escapeHtml(rating)}" title="${title}" aria-label="${title}" style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: var(--radius-sm); font-size: 10px; color: var(--text-muted); text-transform: uppercase;">${label}</span>`;
        },

        catalogModules() {
            const hosted = typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM.getHostCatalog() : [];
            return hosted;
        },

        showMarketplace() {
            const hosted = typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM.getHostCatalog() : [];
            const hasHostCatalog = hosted.length > 0;
            if (!hasHostCatalog) {
                ModUI.showModScreen();
                return false;
            }
            const title = this.escapeHtml(this.label('market.hostCatalog', 'Host Catalog'));
            const subtitle = this.escapeHtml(this.label('market.subtitle', 'Modules supplied and governed by this game host.'));
            const myModules = this.escapeHtml(this.label('market.myModules', 'My Modules'));
            const create = this.escapeHtml(this.label('market.create', 'Module Tools'));
            const search = this.escapeHtml(this.label('market.search', 'Search samples...'));
            const typeLabel = this.escapeHtml(this.label('market.typeFilter', 'Module type'));
            const sortLabel = this.escapeHtml(this.label('market.sort', 'Sort modules'));
            const closeLabel = this.escapeHtml(this.label('ui.close', 'Close'));
            const closeTitle = this.escapeHtml(this.label('market.closeTitle', 'Close host catalog'));
            const html = `
                <div data-command-surface="marketplace" data-command-mode="system" style="width: 100%; max-width: 1000px; box-sizing: border-box; margin: 0 auto; padding: 24px; overflow-y: auto; max-height: 100dvh;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
                        <div style="min-width: 0;">
                            <h1 id="host-catalog-title" style="color: var(--accent-primary); margin: 0;">🏪 ${title}</h1>
                            <p id="host-catalog-description" style="color: var(--text-muted); margin: 8px 0 0 0;">
                                ${subtitle}
                            </p>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                            <button class="nav-btn" data-command-surface="marketplace" data-command-mode="system" data-command-control="open-activity-log" title="${this.escapeHtml(this.label('ui.activityLog.open', 'Open activity log'))}" aria-label="${this.escapeHtml(this.label('ui.activityLog.open', 'Open activity log'))}" onclick="App.showActivityLogScreen()">
                                📜 ${this.escapeHtml(this.label('ui.activityLog', 'Activity Log'))}
                            </button>
                            <button class="nav-btn" data-command-surface="marketplace" data-command-mode="system" data-command-control="open-installed-modules" title="${myModules}" aria-label="${myModules}" onclick="MODULE_MARKETPLACE.ui.showInstalled()">
                                📦 ${myModules}
                            </button>
                            <button class="nav-btn" data-command-surface="marketplace" data-command-mode="system" data-command-control="open-module-tools" title="${create}" aria-label="${create}" onclick="MODULE_MARKETPLACE.ui.showCreate()">
                                ✏️ ${create}
                            </button>
                            <button class="nav-btn mobile-screen-exit-source" data-command-surface="marketplace" data-command-mode="system" data-command-control="close-marketplace" data-command-slot="exit" title="${closeTitle}" aria-label="${closeTitle}" onclick="returnToGame()">
                                ${closeLabel}
                            </button>
                        </div>
                    </div>
                    
                    <!-- Search & Filter -->
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-default); 
                                    border-radius: var(--radius-md); padding: 16px; margin-bottom: 24px;">
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <input type="text" data-command-surface="marketplace" data-command-mode="system" data-command-control="search-marketplace" placeholder="🔍 ${search}" aria-label="${search}"
                                   style="flex: 1; min-width: 200px; background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                                          border-radius: var(--radius-sm); padding: 8px 12px; color: var(--text-primary); font-size: 14px;"
                                   oninput="MODULE_MARKETPLACE.ui.filter(this.value)">
                            <select data-command-surface="marketplace" data-command-mode="system" data-command-control="filter-marketplace-type" aria-label="${typeLabel}" onchange="MODULE_MARKETPLACE.ui.filterByType(this.value)"
                                    style="background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                                           border-radius: var(--radius-sm); padding: 8px 12px; color: var(--text-primary); font-size: 14px;">
                                <option value="all">${this.escapeHtml(this.label('market.type.all', 'All Types'))}</option>
                                <option value="biome_pack">${this.escapeHtml(this.label('market.type.biome_pack', 'Biomes'))}</option>
                                <option value="species_pack">${this.escapeHtml(this.label('market.type.species_pack', 'Species'))}</option>
                                <option value="feature_pack">${this.escapeHtml(this.label('market.type.feature_pack', 'Features'))}</option>
                                <option value="content_pack">${this.escapeHtml(this.label('market.type.content_pack', 'Content'))}</option>
                            </select>
                            <select data-command-surface="marketplace" data-command-mode="system" data-command-control="sort-marketplace" aria-label="${sortLabel}" onchange="MODULE_MARKETPLACE.ui.sort(this.value)"
                                    style="background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                                           border-radius: var(--radius-sm); padding: 8px 12px; color: var(--text-primary); font-size: 14px;">
                                <option value="catalog">${this.escapeHtml(this.label('market.sort.catalog', 'Catalog Order'))}</option>
                                <option value="name">${this.escapeHtml(this.label('market.sort.name', 'Name'))}</option>
                                <option value="type">${this.escapeHtml(this.label('market.sort.type', 'Type'))}</option>
                                <option value="version">${this.escapeHtml(this.label('market.sort.version', 'Version'))}</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Module Grid -->
                    <div id="market-grid" aria-live="polite" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                        ${this.filteredModules().map(m => this.renderModuleCard(m)).join('')}
                    </div>
                    
                    <div class="mobile-screen-exit-bar" data-command-surface="marketplace" data-command-mode="system">
                        <button class="nav-btn" data-command-surface="marketplace" data-command-mode="system" data-command-control="close-marketplace" data-command-slot="exit" title="${closeTitle}" aria-label="${closeTitle}" onclick="returnToGame()">
                            ${closeLabel}
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('market-content').innerHTML = html;
        },
        
        renderModuleCard(mod) {
            const name = this.escapeHtml(mod.name);
            const typeToken = String(mod.type || '').trim();
            const type = this.escapeHtml(this.label(`market.type.${typeToken}`, typeToken.replace('_', ' ')));
            const description = this.escapeHtml(mod.description);
            const preview = this.escapeHtml(mod.preview);
            const version = this.escapeHtml(mod.version);
            const id = this.escapeHtml(this.jsString(mod.id));
            const isHostModule = mod.provenance === 'host';
            const installLabel = this.escapeHtml(mod.installed
                ? this.label(mod.enabled ? 'market.status.enabled' : 'market.status.installed', mod.enabled ? 'Enabled' : 'Installed')
                : (isHostModule ? this.label('market.installHost', 'Install') : this.label('market.installSample', 'Install Fixture')));
            const installTitle = this.escapeHtml(mod.installed
                ? this.label('market.alreadyInstalled', '{name} is already installed', { name: mod.name })
                : (isHostModule
                    ? this.label('market.installHostModule', 'Install {name} from this host', { name: mod.name })
                    : this.label('market.installSampleModule', 'Install fixture {name}', { name: mod.name })));
            const contentRating = this.renderContentRatingBadge(mod.contentRating);
            const sampleBadge = this.escapeHtml(isHostModule ? this.label('market.hostSupplied', 'Host supplied') : this.label('market.sampleBadge', 'Fixture sample'));
            const samplePurpose = this.escapeHtml(isHostModule
                ? this.label(`mod.policy.${mod.policyState || 'optional'}`, mod.policyState || 'optional')
                : (mod.samplePurpose || this.label('market.samplePurposeFallback', 'Workflow test')));
            const byline = this.escapeHtml(isHostModule
                ? this.label('market.hostByline', '{host} - v{version}', { host: mod.hostId || 'host', version: mod.version })
                : this.label('market.sampleByline', 'local sample - v{version}', { version: mod.version }));
            const compatibilityReason = mod.compatibilityReasonKey
                ? this.label(mod.compatibilityReasonKey, mod.compatibilityReason, mod.compatibilityReasonVars || {})
                : mod.compatibilityReason;
            const requirements = isHostModule
                ? `<div style="margin-top:8px;font-size:11px;color:${compatibilityReason ? 'var(--accent-danger)' : 'var(--text-muted)'};">${this.escapeHtml(compatibilityReason || this.label('market.runtimeOrigins', 'Origins: {origins}', { origins: (mod.runtimeRequirements?.origins || []).join(', ') }))}</div>`
                : '';
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
                            ${contentRating}
                        </div>
                        <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-muted); line-height: 1.5;">
                            ${description}
                        </p>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted);">
                                <span>${sampleBadge}</span>
                                <span>${samplePurpose}</span>
                            </div>
                            <button class="nav-btn" data-command-surface="marketplace" data-command-mode="system" data-command-control="install-sample-module" style="padding: 6px 12px; font-size: 12px;"
                                    title="${installTitle}" aria-label="${installTitle}" ${mod.installed || mod.compatibilityReason ? 'disabled' : ''}
                                    onclick="event.stopPropagation(); MODULE_MARKETPLACE.ui.install('${id}')">
                                ${installLabel}
                            </button>
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
                            ${byline}
                        </div>
                        ${requirements}
                    </div>
                </div>
            `;
        },

        filteredModules() {
            const query = String(this.filterQuery || '').trim().toLowerCase();
            const type = this.typeFilter || 'all';
            const scored = this.catalogModules().filter(mod => {
                const matchesType = type === 'all' || mod.type === type;
                const haystack = [
                    mod.name,
                    mod.description,
                    mod.samplePurpose,
                    mod.type,
                    mod.contentRating,
                    this.contentRatingLabel(mod.contentRating),
                    ...(mod.tags || [])
                ].join(' ').toLowerCase();
                return matchesType && (!query || haystack.includes(query));
            });
            const sorted = [...scored];
            if (this.sortMethod === 'name') sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            else if (this.sortMethod === 'type') sorted.sort((a, b) => String(a.type || '').localeCompare(String(b.type || '')) || String(a.name || '').localeCompare(String(b.name || '')));
            else if (this.sortMethod === 'version') sorted.sort((a, b) => String(b.version || '').localeCompare(String(a.version || ''), undefined, { numeric: true }));
            return sorted;
        },

        renderGrid() {
            const grid = document.getElementById('market-grid');
            if (!grid) return;
            const modules = this.filteredModules();
            if (modules.length === 0) {
                grid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--text-muted); text-align: center; padding: 32px;">${this.escapeHtml(this.label('market.noMatches', 'No modules match the current filters.'))}</p>`;
                return;
            }
            grid.innerHTML = modules.map(m => this.renderModuleCard(m)).join('');
        },
        
        filter(query) {
            this.filterQuery = query || '';
            this.renderGrid();
        },
        
        filterByType(type) {
            this.typeFilter = type || 'all';
            this.renderGrid();
        },
        
        sort(method) {
            this.sortMethod = method || 'catalog';
            this.renderGrid();
        },
        
        async install(moduleId) {
            const hostMod = typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM.getHostCatalog().find(module => module.id === moduleId) : null;
            if (hostMod) {
                try {
                    App.log.push({ text: `Installing host module: ${hostMod.name}`, type: 'discovery' });
                    App.renderLog();
                    await MODULE_SYSTEM.installHostCatalogModule(moduleId, { enable: true });
                    App.log.push({ text: `Installed host module: ${hostMod.name}`, type: 'discovery' });
                    App.renderLog();
                    await ModUI.refreshModList();
                    this.showMarketplace();
                    return true;
                } catch (error) {
                    await ModUI.refreshModList();
                    this.showMarketplace();
                    alert(error.message || String(error));
                    return false;
                }
            }
            const mod = MODULE_MARKETPLACE.sampleModules.find(m => m.id === moduleId);
            if (!mod) return;

            try {
                App.log.push({ text: this.label('market.preparingSample', 'Preparing local fixture {name}...', { name: mod.name }), type: 'discovery' });
                App.renderLog();

                const mockModule = {
                    manifest: {
                        id: mod.id,
                        name: mod.name,
                        version: mod.version,
                        author: this.label('market.sampleAuthor', 'Local sample catalog'),
                        description: this.label('market.sampleManifestDescription', 'Sample stub: {description}', { description: mod.description }),
                        type: mod.type,
                        contentRating: mod.contentRating || 'safe',
                        runtimeRequirements: { origins: ['file', 'https', 'localhost', 'http'], hotToggleSafe: true },
                        permissions: [],
                        dependencies: []
                    },
                    code: `
                        // ${mod.name} Module
                        MODS.log(${JSON.stringify(`${mod.name} sample stub loaded.`)});
                        // Sample stub; no gameplay content is registered.
                    `
                };

                await MODULE_SYSTEM.installModule(mockModule);
                try {
                    await MODULE_SYSTEM.setModuleEnabled(mod.id, true);
                } catch (enableError) {
                    await ModUI.refreshModList();
                    const message = enableError?.message || enableError;
                    const text = this.label('market.installedNotEnabled', 'Installed {name}, but it could not be enabled: {message}', { name: mod.name, message });
                    App.log.push({ text, type: 'discovery' });
                    App.renderLog();
                    alert(text);
                    console.error(enableError);
                    return;
                }

                App.log.push({ text: this.label('market.installedEnabled', 'Installed and enabled {name}!', { name: mod.name }), type: 'discovery' });
                App.renderLog();

                alert(this.label('market.installSuccess', 'Successfully installed {name}!', { name: mod.name }));

                // Refresh UI
                ModUI.refreshModList();
            } catch (e) {
                const message = e?.message || e;
                const text = this.label('market.installFailed', 'Could not install {name}: {message}', { name: mod.name, message });
                App.log.push({ text, type: 'discovery' });
                App.renderLog();
                alert(text);
                console.error(e);
            }
        },
        
        showInstalled() {
            ModUI.showModScreen();
        },
        
        showCreate() {
            if (typeof ModUI !== 'undefined' && typeof ModUI.showModScreen === 'function') {
                ModUI.showModScreen();
                if (typeof App !== 'undefined' && Array.isArray(App.log)) {
                    App.log.push({ text: this.label('market.openedModTools', 'Opened local module tools.'), type: 'discovery' });
                    if (typeof App.renderLog === 'function') App.renderLog();
                }
                return true;
            }

            const text = this.label('market.modToolsUnavailable', 'Local module tools are unavailable right now.');
            if (typeof alert === 'function') alert(text);
            return false;
        }
    }
};

// Make available
window.MARKET = MODULE_MARKETPLACE;
