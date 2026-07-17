/**
 * YOU ARE WILD MOVEMENT FLOW
 * Overworld traversal, tile entry resolution, and movement-side effects.
 */

const YAW_MOVEMENT_FLOW = {
    move(app, dx, dy) {
        if (!app.player) return;
        if (app.transactionWindow || app.holdingsWindow) return false;
        if (app.inInterior) {
            app.moveInterior(dx, dy);
            return;
        }
        if (app.mode === app.GAME_MODE.COMBAT) {
            const text = app._label('log.inCombatCannotMove', 'You are in combat! Use Flee to escape.');
            app.log.push({ text, type: 'combat' });
            app.showToast?.({ text, type: 'blocked', importance: 'notable', dedupeKey: 'blocked:combat-move' });
            app.renderLog();
            return;
        }
        const traversal = app._traversalDecision(dx, dy);
        if (!traversal.allowed) {
            const text = app._traversalMessage(traversal);
            app.log.push({ text, type: 'move' });
            app.showToast?.({ text, type: 'blocked', importance: 'notable', dedupeKey: `blocked:travel:${traversal.reasonCode}` });
            app.renderLog();
            return false;
        }
        const from = { x: app.location.x, y: app.location.y, interior: false };
        const oldKey = `${app.location.x},${app.location.y}`;
        const oldTile = app.worldMap.get(oldKey);
        if (oldTile) {
            oldTile.creatures = app._tileCreatures(app.creatures);
            app.persistTileDelta(oldTile.x, oldTile.y, oldTile);
        }
        app.clearTileBoundExplorationTargets();
        app.location.x = traversal.to.x; app.location.y = traversal.to.y;
        app._advanceTime(traversal.cost);
        app._applyTravelCost?.(app.party, { action: 'move', source: 'travel' });
        app._clearTileEvents();
        app.clearToasts?.({ reason: 'tile-change' });
        document.getElementById('coords').textContent = `${app.location.x}, ${app.location.y}`;

        const wasExplored = app.isExplored(app.location.x, app.location.y);
        const tile = app.exploreTile(app.location.x, app.location.y);
        app.revealVisibleTiles(app.location.x, app.location.y, app._mapVisibilityRadius?.() ?? 1);
        const biome = app.biomes[tile.biome];
        const movedText = app._label('log.movedTo', 'Moved to {x}, {y} ({biome})', {
            x: app.location.x,
            y: app.location.y,
            biome: biome.name
        });
        app.log.push({ text: movedText, type: 'move' });
        app._addTileEvent(movedText, 'move');
        if (tile.hasLandmark) {
            const landmarkText = app._label('log.discoveredLandmark', 'Discovered {name}!', { name: tile.landmarkName });
            app.log.push({ text: landmarkText, type: 'discovery' });
            app._addTileEvent(landmarkText, 'discovery');
        }

        if (wasExplored) {
            app.creatures = app._tileCreatures(tile.creatures || []);
            const enemies = app._livingEnemies(app.creatures);
            if (enemies.length > 0) {
                const encounterText = `You encounter ${enemies.map(e => e.name).join(', ')}!`;
                app.log.push({ text: encounterText, type: 'combat' });
                app._addTileEvent(encounterText, 'combat');
                app.showToast?.({ text: encounterText, type: 'danger', importance: 'major', dedupeKey: `encounter:${tile.x},${tile.y}` });
                app.startCombat(enemies);
            } else if (app.creatures.length > 0) {
                app.updateScene(`${biome.name} - ${tile.hasLandmark ? tile.landmarkName : 'Wilderness'}`, `You return to the ${biome.name}. ${tile.description}`, false);
                app.renderExplorationActions();
            }
        } else {
            app.creatures = app._tileCreatures(tile.creatures || []);
            if (tile.structure && !tile.structureSpawned) {
                app.spawnStructureEncounter(tile, !wasExplored);
            } else if (app._worldChance('tile-wild-encounter', tile.x, tile.y, biome.encounterChance || 0)) {
                app.spawnWildEncounter(tile, false, !wasExplored);
            }
        }
        tile.creatures = app._tileCreatures(app.creatures);
        app.persistTileDelta(tile.x, tile.y, tile);
        app.emitTileObservation?.(tile, { wasExplored });
        app._updateQuestProgress('escort', { x: app.location.x, y: app.location.y });
        app._updateQuestProgress('travel', { x: app.location.x, y: app.location.y });
        if (!app.combatState.active) {
            const restoredEnemies = app._livingEnemies(app.creatures);
            if (restoredEnemies.length > 0) {
                const encounterText = `You encounter ${restoredEnemies.map(e => e.name).join(', ')}!`;
                app.log.push({ text: encounterText, type: 'combat' });
                app._addTileEvent(encounterText, 'combat');
                app.showToast?.({ text: encounterText, type: 'danger', importance: 'major', dedupeKey: `encounter:${tile.x},${tile.y}` });
                app.startCombat(restoredEnemies);
            }
        }
        app.renderMap();
        if (!app.combatState.active) app.showExplorationActions();
        app.renderCreatures();
        app.renderLog();
        app._emitModuleHook('onPlayerMove', {
            from,
            to: { x: app.location.x, y: app.location.y, interior: false },
            dx,
            dy,
            tile,
            interior: false
        });
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'quests', 'sceneFeed', 'activityLog'], 'movement');
        app.autoSave();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MOVEMENT_FLOW = YAW_MOVEMENT_FLOW;
}
