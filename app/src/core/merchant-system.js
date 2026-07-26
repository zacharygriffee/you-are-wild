/**
 * YOU ARE WILD MERCHANT SYSTEM
 * Deterministic merchant stock, item list filtering, and structure merchant creation.
 */

const YAW_MERCHANT_SYSTEM = {
    normalizeStock(app, stock = []) {
        return stock.map((entry, index) => {
            const itemName = typeof entry === 'string' ? entry : entry.name;
            const itemRef = typeof entry === 'string' ? { name: itemName } : entry;
            const def = app._getItemDef(itemRef);
            return {
                id: entry.id || `stock_${itemName || 'item'}_${index}`,
                ...(def.id || entry.definitionId ? { definitionId: def.id || entry.definitionId } : {}),
                name: itemName || 'Unknown Item',
                price: entry.price || def.value || 10,
                qty: entry.qty ?? 1
            };
        });
    },

    stockFromTable(app, tableId = 'general') {
        const table = app.MERCHANT_STOCK_TABLES[tableId] || app.MERCHANT_STOCK_TABLES.general || [];
        return this.normalizeStock(app, table).map((entry, index) => ({
            ...entry,
            id: `${tableId}_stock_${index}_${entry.name.replace(/\s+/g, '_').toLowerCase()}`
        }));
    },

    createStructureMerchant(app, structureId, biomeId = app.currentBiome || 'forest', tile = null) {
        const struct = app.STRUCTURES[structureId];
        if (!struct?.merchant) return null;
        const merchantConfig = struct.merchant;
        const speciesPool = merchantConfig.species || ['human'];
        const x = tile?.x ?? 0;
        const y = tile?.y ?? 0;
        const sid = typeof WorldGen !== 'undefined'
            ? (WorldGen.pickWeighted(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'structure-merchant-species', x, y, speciesPool) || 'human')
            : speciesPool[0] || 'human';
        const sp = app.species.find(s => s.id === sid) || app.species.find(s => s.id === 'human');
        const stockTable = merchantConfig.stockTable || 'general';
        return app._normalizeUnit({
            id: `merchant_${structureId}_${x}_${y}`,
            name: `${sp?.name || 'Traveling'} Merchant`,
            species: sid,
            icon: sp?.icon || '👤',
            disposition: app.DISPOSITION.MERCHANT,
            level: Math.max(1, app.player?.level || 1),
            bodyParts: app.SPECIES_DEFAULT_PARTS[sid] || [],
            stockTable,
            stock: this.stockFromTable(app, stockTable),
            stockLastRefreshDay: app.dayCount || 0,
            serviceOrigin: YAW_UNIT_CONTAINMENT.overworldServiceOrigin(tile, structureId),
            serviceSuspended: false,
            tags: [sp?.name || sid, 'Merchant', app.biomes[biomeId]?.name || biomeId],
            expanded: false,
            hero: false,
            ally: false,
            mc: false,
            obedient: false,
            willing: true
        });
    },

    maybeSpawnStructureMerchant(app, tile) {
        if (!tile?.structure || !app.STRUCTURES[tile.structure]?.merchant) return null;
        const config = app.STRUCTURES[tile.structure].merchant;
        if (typeof WorldGen !== 'undefined' && !WorldGen.chance(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'structure-merchant', tile.x, tile.y, config.chance ?? 0)) return null;
        if (typeof WorldGen === 'undefined' && (config.chance ?? 0) <= 0) return null;
        const merchant = this.createStructureMerchant(app, tile.structure, tile.biome, tile);
        if (!merchant) return null;
        app.creatures = app._tileCreatures([...(app.creatures || []), merchant]);
        tile.creatures = app._tileCreatures(app.creatures);
        return merchant;
    },

    itemCategory(app, item) {
        return app._getItemDef(item).type || 'misc';
    },

    itemValue(app, item) {
        return app._getItemDef(item).value || item?.price || 0;
    },

    itemListOptions(app, prefix, targetId = null) {
        const targetArg = targetId ? `,'${String(targetId).replace(/'/g, "\\'")}'` : '';
        const categoryLabel = app._escapeHtml(app._label('item.category', 'Category'));
        const sortLabel = app._escapeHtml(app._label('item.sort', 'Sort'));
        const filterOptions = ['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].map(type => {
            const label = app._escapeHtml(app._label(`item.category.${type}`, type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)));
            return `<option value="${type}" ${app[`${prefix.toLowerCase()}Filter`] === type ? 'selected' : ''}>${label}</option>`;
        }).join('');
        const sortOptions = [
            ['name', app._label('item.sort.name', 'Name')],
            ['type', app._label('item.sort.type', 'Type')],
            ['value-desc', app._label('item.sort.valueDesc', 'Value ↓')],
            ['value-asc', app._label('item.sort.valueAsc', 'Value ↑')]
        ].map(([value, label]) => `<option value="${value}" ${app[`${prefix.toLowerCase()}Sort`] === value ? 'selected' : ''}>${app._escapeHtml(label)}</option>`).join('');
        return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px;">
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">${categoryLabel}
                        <select class="nav-btn" data-command-surface="trade-detail" data-command-mode="exploration" data-command-control="filter-items" style="padding:4px 8px;font-size:11px;" onchange="App.set${prefix}Filter(this.value${targetArg})">
                            ${filterOptions}
                        </select>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">${sortLabel}
                        <select class="nav-btn" data-command-surface="trade-detail" data-command-mode="exploration" data-command-control="sort-items" style="padding:4px 8px;font-size:11px;" onchange="App.set${prefix}Sort(this.value${targetArg})">
                            ${sortOptions}
                        </select>
                    </label>
                </div>`;
    },

    filterAndSortItemEntries(app, entries, filter = 'all', sort = 'name') {
        const filtered = entries.filter(entry => filter === 'all' || this.itemCategory(app, entry.item) === filter);
        return filtered.sort((a, b) => {
            const aDef = app._getItemDef(a.item);
            const bDef = app._getItemDef(b.item);
            if (sort === 'value-desc') return this.itemValue(app, b.item) - this.itemValue(app, a.item) || a.item.name.localeCompare(b.item.name);
            if (sort === 'value-asc') return this.itemValue(app, a.item) - this.itemValue(app, b.item) || a.item.name.localeCompare(b.item.name);
            if (sort === 'type') return (aDef.type || 'misc').localeCompare(bDef.type || 'misc') || a.item.name.localeCompare(b.item.name);
            return a.item.name.localeCompare(b.item.name);
        });
    },

    stockQuantity(app, merchant, itemName, index, day) {
        const merchantId = String(merchant?.id || merchant?.name || merchant?.stockTable || 'default');
        const stockDay = Number.isFinite(Number(day)) ? Number(day) : 0;
        if (typeof WorldGen !== 'undefined') {
            const roll = WorldGen.hash01(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'merchant-default-stock-qty', merchantId, itemName, index, stockDay);
            return 1 + Math.floor(roll * 2);
        }
        const key = `${app.worldMeta?.seed || 'yaw'}|${app.worldMeta?.generatorVersion || 1}|${merchantId}|${itemName}|${index}|${stockDay}`;
        let hash = 2166136261;
        for (let i = 0; i < key.length; i++) {
            hash ^= key.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return 1 + ((hash >>> 0) % 2);
    },

    defaultStock(app, merchant = null, day = app.dayCount || 0) {
        return ['Healing Herb', 'Old Coin', 'Monster Fang'].map((name, index) => {
            const def = app._getItemDef({ name });
            return {
                id: `default_stock_${index}`,
                definitionId: def.id,
                name,
                price: def.value || 10,
                qty: this.stockQuantity(app, merchant, name, index, day)
            };
        });
    },

    refreshStock(app, merchant, force = false) {
        if (!merchant || merchant.disposition !== app.DISPOSITION.MERCHANT) return merchant;
        const currentDay = app.dayCount || 0;
        const needsStock = !merchant.stock || merchant.stock.length === 0;
        const stale = currentDay - (merchant.stockLastRefreshDay ?? currentDay) >= 3;
        if (force || needsStock || stale) {
            merchant.stock = merchant.stockTable ? this.stockFromTable(app, merchant.stockTable) : this.defaultStock(app, merchant, currentDay);
            merchant.stockLastRefreshDay = currentDay;
        } else {
            merchant.stock = this.normalizeStock(app, merchant.stock);
        }
        return merchant;
    },

    findById(app, targetId) {
        const merchant = app.creatures.find(c => c.disposition === app.DISPOSITION.MERCHANT
            && String(c.id || c.name) === String(targetId)
            && YAW_UNIT_CONTAINMENT.serviceAvailable(app, c));
        return this.refreshStock(app, merchant);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MERCHANT_SYSTEM = YAW_MERCHANT_SYSTEM;
}
