/**
 * YOU ARE WILD INVENTORY PANEL
 * Player-owned inventory rendering and direct item actions.
 */

const YAW_INVENTORY_PANEL = {
    show(app) {
        const backLabel = app._escapeHtml(app._label('inventory.back', 'Back'));
        const backButton = `<button class="nav-btn" style="margin-top:12px" title="${backLabel}" aria-label="${backLabel}" onclick="App.closePanelDetails('party')">${backLabel}</button>`;
        const title = app._escapeHtml(app._label('inventory.titleWithCount', 'Inventory ({count}/{max})', { count: app.inventory.length, max: app.MAX_INVENTORY }));
        const equippedLabel = app._escapeHtml(app._label('inventory.equippedSection', 'Equipped'));
        let html = `<div class="inventory-panel-detail"><h3>${title}</h3>`;
        html += `<div class="option-card" style="text-align:left;cursor:default;margin-top:12px;"><div style="font-weight:700;color:var(--text-primary)">${equippedLabel}</div><div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:6px">${app._equipmentSummary()}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">`;
        Object.entries(app.EQUIPMENT_SLOTS).forEach(([slot, label]) => {
            const equipped = app.player?.equipment?.[slot];
            if (equipped) {
                const unequipTitle = app._escapeHtml(app._label('inventory.unequipSlot', 'Unequip {slot}', { slot: label }));
                const unequipLabel = app._escapeHtml(`${app._label('inventory.unequip', 'Unequip')} ${label}`);
                html += `<button class="nav-btn" style="padding:4px 8px;font-size:11px" title="${unequipTitle}" aria-label="${unequipTitle}" onclick="App.unequipItem('${slot}')">${unequipLabel}</button>`;
            }
        });
        html += `</div></div>`;
        if (app.inventory.length === 0) {
            html += `<p style="color:var(--text-muted);margin-top:12px;">${app._escapeHtml(app._label('inventory.empty', 'Empty.'))}</p>${backButton}</div>`;
            app.showPartyPanelDetail(title, html);
            return;
        }
        html += app._itemListOptions('Inventory');
        const entries = app._filterAndSortItemEntries(app.inventory.map((item, index) => ({ item, index })), app.inventoryFilter, app.inventorySort);
        if (entries.length === 0) {
            html += `<p style="color:var(--text-muted);margin-top:12px;">${app._escapeHtml(app._label('inventory.noItemsMatch', 'No items match the current filter.'))}</p>${backButton}</div>`;
            app.showPartyPanelDetail(title, html);
            return;
        }
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px;">`;
        entries.forEach(({ item }) => {
            const def = app.ITEMS[item.name] || { icon: '?', desc: 'Unknown' };
            const canUse = def.effect === 'heal' || def.effect === 'buff' || def.effect === 'damage';
            const canEquip = app._isEquippable(item);
            html += `<div class="option-card" style="text-align:left;cursor:default;">`;
            html += `<div style="font-size:24px">${def.icon}</div><div style="font-weight:600;color:var(--text-primary)">${item.name}</div>`;
            html += `<div style="font-size:11px;color:var(--text-muted);margin:4px 0">${def.type || 'misc'} · ${def.desc}${canEquip ? '<br>' + app._equipmentBonusText(item) : ''}</div><div style="display:flex;gap:8px;margin-top:8px">`;
            const itemKey = String(item.id).replace(/'/g, "\\'");
            const useLabel = app._escapeHtml(app._label('inventory.use', 'Use'));
            const equipLabel = app._escapeHtml(app._label('inventory.equip', 'Equip'));
            const dropLabel = app._escapeHtml(app._label('inventory.drop', 'Drop'));
            const useTitle = app._escapeHtml(app._label('inventory.useItem', 'Use {name}', { name: item.name }));
            const equipTitle = app._escapeHtml(app._label('inventory.equipItem', 'Equip {name}', { name: item.name }));
            const dropTitle = app._escapeHtml(app._label('inventory.dropItem', 'Drop {name}', { name: item.name }));
            if (canUse) html += `<button class="nav-btn" style="flex:1;padding:4px 8px;font-size:11px" title="${useTitle}" aria-label="${useTitle}" onclick="App.useItem('${itemKey}')">${useLabel}</button>`;
            if (canEquip) html += `<button class="nav-btn" style="flex:1;padding:4px 8px;font-size:11px" title="${equipTitle}" aria-label="${equipTitle}" onclick="App.equipItem('${String(item.id).replace(/'/g, "\\'")}')">${equipLabel}</button>`;
            html += `<button class="nav-btn" style="padding:4px 8px;font-size:11px;color:var(--accent-danger)" title="${dropTitle}" aria-label="${dropTitle}" onclick="App.dropItem('${itemKey}')">${dropLabel}</button></div></div>`;
        });
        html += `</div>${backButton}</div>`;
        app.showPartyPanelDetail(title, html);
    },

    setFilter(app, filter) {
        app.inventoryFilter = ['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].includes(filter) ? filter : 'all';
        app.showInventory();
    },

    setSort(app, sort) {
        app.inventorySort = ['name', 'type', 'value-desc', 'value-asc'].includes(sort) ? sort : 'name';
        app.showInventory();
    },

    equip(app, itemId) {
        if (!app.player) return;
        const item = app.inventory.find(i => String(i.id) === String(itemId));
        if (!item || !app._isEquippable(item)) return;
        const def = app._getItemDef(item);
        const slot = def.slot;
        app.player.equipment = app.player.equipment || {};
        if (!app.player.equipmentBaseStats) app.player.equipmentBaseStats = app._captureEquipmentBaseStats(app.player);
        const current = app.player.equipment[slot];
        if (current) {
            app.inventory.push(current);
        }
        app.inventory = app.inventory.filter(i => String(i.id) !== String(itemId));
        app.player.equipment[slot] = item;
        app._recalculateEquipment(app.player);
        app.log.push({ text: app._label('inventory.equipped', 'Equipped {name}.', { name: item.name }), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        app.showInventory();
        app.autoSave();
    },

    unequip(app, slot) {
        if (!app.player?.equipment || !app.player.equipment[slot]) return;
        if (app.inventory.length >= app.MAX_INVENTORY) {
            app.log.push({ text: app._label('inventory.full', 'Inventory is full.'), type: 'discovery' });
            app.renderLog();
            return;
        }
        const item = app.player.equipment[slot];
        app.player.equipment[slot] = null;
        app._recalculateEquipment(app.player);
        app.inventory.push(item);
        app.log.push({ text: app._label('inventory.unequipped', 'Unequipped {name}.', { name: item.name }), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        app.showInventory();
        app.autoSave();
    },

    drop(app, itemId) {
        const index = app.inventory.findIndex(item => String(item?.id) === String(itemId));
        if (index === -1) return false;
        const tile = app._currentExplorationTile();
        if (!tile) return false;
        const [item] = app.inventory.splice(index, 1);
        if (!Array.isArray(tile.items)) tile.items = [];
        tile.items.push(app._cloneTileValue(item));
        app._persistCurrentExplorationTile(tile);
        const droppedText = app._label('log.droppedTileItem', 'Dropped {item}.', { item: app._tileItemLabel(item) });
        app.log.push({ text: droppedText, type: 'loot' });
        app._addTileEvent(droppedText, 'loot');
        app.showInventory();
        app.renderExplorationActions();
        app.renderLog();
        app.autoSave();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_INVENTORY_PANEL = YAW_INVENTORY_PANEL;
}
