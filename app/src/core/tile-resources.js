/**
 * YOU ARE WILD TILE RESOURCES
 * Center-tile search and tile-local item pickup behavior.
 */

const YAW_TILE_RESOURCES = {
    search(app) {
        app._advanceTime(1);
        app._applyActionCost?.('search', app.player, null, {}, { mode: 'adventure', source: 'search', emitScene: true });
        const tile = app._currentExplorationTile();
        const tileX = Number(tile?.x ?? app.location?.x ?? 0);
        const tileY = Number(tile?.y ?? app.location?.y ?? 0);
        const searchDay = app.dayCount || 0;
        const searchHour = app.timeHour || 0;
        const roll = app._worldRoll('search-roll', tileX, tileY, searchDay, searchHour);
        const findChance = Math.min(0.85, 0.3 + (app._hasEquipmentEffect(app.player, 'luckyFind') ? 0.15 : 0) + (app._hasPerkEffect('predatorScent') ? 0.1 : 0) + app._partyRoleEffect('gatherer', 0.1, 0.25));
        let result = '';
        let foundItem = false;
        const resourceSite = tile?.overlays?.poi?.category === 'resourceSite' && !tile.resourceSearched;
        if (resourceSite && app.inventory.length >= app.MAX_INVENTORY) {
            result = app._label('inventory.full', 'Inventory is full.');
        } else if (resourceSite) {
            const items = Object.keys(app.ITEMS);
            const iname = app._pickWorldList(items, 'resource-site-search-item-name', tileX, tileY, searchDay) || items[0] || 'Old Coin';
            const iid = `resource_${tileX}_${tileY}_${searchDay}`;
            app.inventory.push({ id: iid, name: iname });
            tile.resourceSearched = true;
            app.persistTileDelta(tileX, tileY, tile);
            app._updateQuestProgress('find', { item: iname, name: iname });
            result = app._label('search.foundItem', 'You found a {item}!', { item: iname });
            foundItem = true;
        } else if (roll < findChance) {
            const struct = tile?.structure ? app.STRUCTURES[tile.structure] : null;
            const authoredLoot = struct?.lootTable && !tile.structureLooted ? app._lootItemNameFromTable(struct.lootTable, 'structure-search-loot', tileX, tileY, searchDay, searchHour) : null;
            const items = Object.keys(app.ITEMS);
            const iname = authoredLoot || app._pickWorldList(items, 'search-item-name', tileX, tileY, searchDay, searchHour);
            if (authoredLoot) {
                tile.structureLooted = true;
                app.persistTileDelta(tileX, tileY, tile);
            }
            const iid = `item_${tileX}_${tileY}_${searchDay}_${searchHour}`;
            app.inventory.push({ id: iid, name: iname });
            app._updateQuestProgress('find', { item: iname, name: iname });
            result = app._label('search.foundItem', 'You found a {item}!', { item: iname });
            foundItem = true;
        } else if (roll < 0.6) {
            result = app._label('search.explored', 'You explore the area. {description}', { description: tile.description || '' });
        } else {
            result = app._label('search.nothing', 'Nothing of interest here.');
        }
        app.log.push({ text: result, type: 'discovery' });
        app._addTileEvent(result, 'discovery');
        if (foundItem) {
            app.showToast?.({ text: result, type: 'loot', importance: 'notable', dedupeKey: `search-loot:${tileX},${tileY}:${searchDay}:${searchHour}` });
        }
        app.renderLog();
        app.renderExplorationActions();
        app.renderCenterPresence?.();
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'inventory', 'holdings', 'currentTile', 'worldTiles', 'quests', 'sceneFeed', 'activityLog'], 'search');
        app.autoSave();
    },

    canSearchHere(app, tile = app._currentExplorationTile()) {
        if (!tile) return false;
        if (tile.overlays?.poi?.category === 'resourceSite' && !tile.resourceSearched) return true;
        const struct = tile.structure ? app.STRUCTURES[tile.structure] : null;
        return Boolean(struct?.lootTable && !tile.structureLooted);
    },

    canTakeTileItems(tile = null) {
        return Array.isArray(tile?.items) && tile.items.length > 0;
    },

    tileItemLabel(app, item) {
        return item?.name || String(item || app._label('ui.item', 'item'));
    },

    tileItemSummary(app, tile = app._currentExplorationTile()) {
        const items = Array.isArray(tile?.items) ? tile.items : [];
        if (items.length === 0) return '';
        const names = items.slice(0, 3).map(item => this.tileItemLabel(app, item));
        const suffix = items.length > names.length
            ? app._label('ui.tileItems.more', ' and {count} more', { count: items.length - names.length })
            : '';
        return app._label('ui.tileItems.summary', 'Items here: {items}{suffix}.', {
            items: names.join(', '),
            suffix
        });
    },

    takeTileItems(app) {
        const tile = app._currentExplorationTile();
        if (!this.canTakeTileItems(tile)) return false;
        const space = Math.max(0, app.MAX_INVENTORY - app.inventory.length);
        if (space <= 0) {
            const fullText = app._label('inventory.full', 'Inventory is full.');
            app.log.push({ text: fullText, type: 'loot' });
            app._addTileEvent(fullText, 'loot');
            app.renderLog();
            app.renderExplorationActions();
            app.markAutoSaveDirty?.(['manifest', 'inventory', 'currentTile', 'worldTiles', 'activityLog'], 'tile-items-full');
            app.autoSave();
            return true;
        }
        const taken = tile.items.splice(0, space).map((item, index) => {
            if (item && typeof item === 'object' && !Array.isArray(item)) return app._cloneTileValue(item);
            const tileX = Number(tile.x ?? app.location?.x ?? 0);
            const tileY = Number(tile.y ?? app.location?.y ?? 0);
            return { id: `tile_item_${tileX}_${tileY}_${index}`, name: this.tileItemLabel(app, item) };
        });
        app.inventory.push(...taken);
        app._persistCurrentExplorationTile(tile);
        const itemNames = taken.map(item => this.tileItemLabel(app, item)).join(', ');
        const tookText = app._label('log.tookTileItems', 'Picked up {items}.', { items: itemNames });
        app.log.push({ text: tookText, type: 'loot' });
        app._addTileEvent(tookText, 'loot');
        app.showToast?.({ text: tookText, type: 'loot', importance: 'notable', dedupeKey: `tile-items:${tile.x},${tile.y}:${itemNames}` });
        if (tile.items.length > 0) {
            const fullText = app._label('inventory.full', 'Inventory is full.');
            app.log.push({ text: fullText, type: 'loot' });
            app._addTileEvent(fullText, 'loot');
        } else if (app.focusedStageObject?.type === 'items') {
            app.focusedStageObject = null;
        }
        app.renderLog();
        app.renderExplorationActions();
        app.markAutoSaveDirty?.(['manifest', 'inventory', 'currentTile', 'worldTiles', 'sceneFeed', 'activityLog'], 'take-tile-items');
        app.autoSave();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TILE_RESOURCES = YAW_TILE_RESOURCES;
}
