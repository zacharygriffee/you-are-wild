/**
 * YOU ARE WILD CENTER CONTEXT HELPERS
 * Current tile context and center action helpers.
 */

const YAW_CENTER_CONTEXT = {
    actionKeys(app) {
        const keys = [];
        if ((app.quests || []).length > 0) keys.push('quests');
        if (app._canTakeTileItems()) keys.unshift('takeItems');
        if (app._canSearchHere()) keys.unshift('search');
        if (app.inInterior) keys.unshift('exit');
        else if (app._currentExplorationTile()?.structure) keys.unshift('enter');
        if (app._canRestHere()) keys.unshift('rest');
        return keys;
    },

    actionButton(app, key) {
        const handlers = {
            rest: 'App.rest()',
            search: 'App.search()',
            takeItems: 'App.takeTileItems()',
            quests: 'App.showQuestLog()',
            stats: 'App.showCharacterStats()',
            enter: 'App.enterStructure()',
            exit: 'App.exitStructure()',
            map: "togglePanel('map')",
            party: "togglePanel('party')",
            enemies: "togglePanel('enemies')"
        };
        return app._iconActionButton(key, app._actionIcon(key), handlers[key] || '');
    },

    renderActions(app, includePanels = false) {
        const keys = this.actionKeys(app);
        const panelKeys = includePanels ? ['stats', 'map', 'party', 'enemies'] : [];
        const allKeys = [...keys, ...panelKeys];
        return allKeys.map(key => this.actionButton(app, key)).join('');
    },

    context(app) {
        if (app.inInterior && app.activeInterior) {
            const room = app._currentInteriorTile();
            const biome = app.biomes[room?.biome] || app.biomes.indoors || {};
            const title = room?.exit
                ? app._label('structure.exit', 'Exit')
                : (app.activeInterior.structureName || app._label('ui.largeMap.interior', 'Interior'));
            const details = [room?.description ||
                `${biome.icon || ''} ${app._label('ui.largeMap.interior', 'Interior')} (${app.interiorLocation.x}, ${app.interiorLocation.y})`];
            const itemSummary = app._tileItemSummary(room);
            if (itemSummary) details.push(itemSummary);
            const description = details.join(' ');
            return { title, description };
        }
        const tile = app._currentExplorationTile() || app.getTile(app.location.x, app.location.y);
        const biome = app.biomes[tile?.displayBiome || tile?.biome] || app.biomes[tile?.biome] || app.biomes.forest || {};
        const structure = tile?.structure ? app.STRUCTURES[tile.structure] : null;
        const title = structure
            ? `${structure.name} - ${biome.name || tile.biome}`
            : `${biome.name || tile?.biome || app._label('ui.exploration', 'Exploration')} - ${tile?.hasLandmark && tile.landmarkName ? tile.landmarkName : app._label('ui.scene.wildernessTitle', 'The Wilderness')}`;
        const details = [];
        if (tile?.description) details.push(tile.description);
        if (structure) details.push(`${structure.icon || '🚪'} ${structure.name}`);
        if (tile?.hasLandmark && tile.landmarkName) details.push(tile.landmarkName);
        const itemSummary = app._tileItemSummary(tile);
        if (itemSummary) details.push(itemSummary);
        const description = details.length
            ? details.join(' ')
            : `${biome.icon || ''} ${app._label('ui.chooseAction', 'Choose your next action.')}`;
        return { title, description };
    }
};

window.YAW_CENTER_CONTEXT = YAW_CENTER_CONTEXT;
