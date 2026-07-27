/**
 * YOU ARE WILD TILE RESOURCES
 * Center-tile search and tile-local item pickup behavior.
 */

const YAW_TILE_RESOURCES = {
    searchableItemEntries(app, tile = app._currentExplorationTile?.()) {
        const entries = Object.entries(app.ITEMS || {}).flatMap(([name, raw]) => {
            const definition = app._getItemDef(raw?.id || name);
            const weight = Number(definition.acquisition?.searchWeight);
            return Number.isFinite(weight) && weight > 0 ? [{ id: definition.id || name, weight }] : [];
        });
        if (typeof YAW_ITEM_REGISTRY !== 'undefined') {
            for (const definition of YAW_ITEM_REGISTRY.list(app)) {
                if (definition.owner === YAW_ITEM_REGISTRY.CORE_OWNER || definition.acquisition?.search !== true) continue;
                entries.push({
                    id: definition.id,
                    weight: Math.max(1, Math.min(100, Number(definition.acquisition?.searchWeight) || 1))
                });
            }
        }
        const unique = [...new Map(entries.map(entry => [entry.id, entry])).values()];
        return YAW_QUEST_CONTRACT.boostWeightedTable(
            app,
            unique,
            YAW_QUEST_CONTRACT.WORLD_CONTENT_KINDS.ITEM,
            tile
        );
    },

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
        const questItemRef = app._questSearchItemForLocation?.(tile) || null;
        const resourceSite = tile?.overlays?.poi?.category === 'resourceSite' && !tile.resourceSearched;
        if (questItemRef || resourceSite) {
            const items = this.searchableItemEntries(app, tile);
            const itemRef = questItemRef || app._weightedPickWorld(items, 'resource-site-search-item-name', tileX, tileY, searchDay) || items[0]?.id || 'Old Coin';
            const definition = app._getItemDef(itemRef);
            const iname = definition.name || itemRef;
            if (!app._canAddInventoryItem(itemRef, 1)) {
                result = app._label('inventory.full', 'Inventory is full.');
            } else {
                const iid = `resource_${tileX}_${tileY}_${searchDay}`;
                app._addInventoryItem(itemRef, { id: iid });
                if (resourceSite) {
                    tile.resourceSearched = true;
                    app.persistTileDelta(tileX, tileY, tile);
                }
                app._updateQuestProgress('find', { item: iname, name: iname, definitionId: definition.id || null, x: tileX, y: tileY });
                result = app._label('search.foundItem', 'You found a {item}!', { item: iname });
                foundItem = true;
            }
        } else if (roll < findChance) {
            const struct = tile?.structure ? app.STRUCTURES[tile.structure] : null;
            const authoredLoot = struct?.lootTable && !tile.structureLooted ? app._lootItemNameFromTable(struct.lootTable, 'structure-search-loot', tileX, tileY, searchDay, searchHour) : null;
            const items = this.searchableItemEntries(app, tile);
            const itemRef = authoredLoot || app._weightedPickWorld(items, 'search-item-name', tileX, tileY, searchDay, searchHour);
            const definition = app._getItemDef(itemRef);
            const iname = definition.name || itemRef;
            if (authoredLoot) {
                tile.structureLooted = true;
                app.persistTileDelta(tileX, tileY, tile);
            }
            if (!app._canAddInventoryItem(itemRef, 1)) {
                result = app._label('inventory.full', 'Inventory is full.');
            } else {
                const iid = `item_${tileX}_${tileY}_${searchDay}_${searchHour}`;
                app._addInventoryItem(itemRef, { id: iid });
                app._updateQuestProgress('find', { item: iname, name: iname, definitionId: definition.id || null, x: tileX, y: tileY });
                result = app._label('search.foundItem', 'You found a {item}!', { item: iname });
                foundItem = true;
            }
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
        // Recovery objectives deliberately yield their protected item through
        // Search at the marked tile. Keep that action visible even when the
        // tile is not otherwise a resource site or loot-bearing structure.
        if (app._questSearchItemForLocation?.(tile)) return true;
        if (tile.overlays?.poi?.category === 'resourceSite' && !tile.resourceSearched) return true;
        const struct = tile.structure ? app.STRUCTURES[tile.structure] : null;
        return Boolean(struct?.lootTable && !tile.structureLooted);
    },

    canTakeTileItems(tile = null) {
        return Array.isArray(tile?.items) && tile.items.length > 0;
    },

    tileItemLabel(app, item) {
        const name = item?.name || String(item || app._label('ui.item', 'item'));
        return item?.questReward
            ? app._label('quest.rewardCache.item', 'Quest reward: {item}', { item: name })
            : name;
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
        const taken = [];
        const remaining = [];
        tile.items.forEach((item, index) => {
            let normalized;
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                normalized = app._normalizeItemInstance(app._cloneTileValue(item));
            } else {
                const tileX = Number(tile.x ?? app.location?.x ?? 0);
                const tileY = Number(tile.y ?? app.location?.y ?? 0);
                normalized = app._createItemInstance(this.tileItemLabel(app, item), { id: `tile_item_${tileX}_${tileY}_${index}` });
            }
            const itemRef = normalized.definitionId || normalized.name;
            const quantity = Math.max(1, Math.floor(Number(normalized.quantity) || 1));
            if (!app._canAddInventoryItem(itemRef, quantity)) {
                remaining.push(item);
                return;
            }
            app._addInventoryItem(itemRef, normalized);
            taken.push(normalized);
        });
        tile.items = remaining;
        if (taken.length === 0) {
            const fullText = app._label('inventory.full', 'Inventory is full.');
            app.log.push({ text: fullText, type: 'loot' });
            app._addTileEvent(fullText, 'loot');
            app.renderLog();
            app.renderExplorationActions();
            app.markAutoSaveDirty?.(['manifest', 'inventory', 'currentTile', 'worldTiles', 'activityLog'], 'tile-items-full');
            app.autoSave();
            return true;
        }
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
