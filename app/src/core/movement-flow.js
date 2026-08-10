/**
 * YOU ARE WILD MOVEMENT FLOW
 * Overworld traversal, tile entry resolution, and movement-side effects.
 */

const YAW_MOVEMENT_FLOW = {
    move(app, dx, dy) {
        if (!app.player) return;
        const recoveryJourney = YAW_RECOVERY_MODES?.isJourney?.(app) === true;
        const recoveryMode = recoveryJourney ? YAW_RECOVERY_MODES.forState(app, app.defeatState) : null;
        if (app.transactionWindow || app.holdingsWindow) return false;
        if (app.inInterior) {
            app.moveInterior(dx, dy);
            return;
        }
        if (app.mode === app.GAME_MODE.COMBAT) {
            const text = app._label('log.inCombatCannotMove', 'You are in combat! Use Flee to escape.');
            app.log.push({ text, type: 'combat' });
            app.renderLog();
            return;
        }
        const traversal = recoveryJourney && recoveryMode?.traversal === 'ethereal'
            ? {
                allowed: true,
                to: { x: app.location.x + Math.trunc(Number(dx) || 0), y: app.location.y + Math.trunc(Number(dy) || 0) },
                cost: 1,
                reasonCode: 'ethereal-recovery'
            }
            : app._traversalDecision(dx, dy);
        if (!traversal.allowed) {
            const text = app._traversalMessage(traversal);
            app.log.push({ text, type: 'move' });
            app.renderLog();
            return false;
        }
        const from = { x: app.location.x, y: app.location.y, interior: false };
        const oldKey = `${app.location.x},${app.location.y}`;
        const oldTile = app.worldMap.get(oldKey);
        if (oldTile) {
            oldTile.creatures = app._tileCreatures(app.creatures);
            app.persistTileDelta(oldTile.x, oldTile.y, oldTile, { visual: false });
        }
        app.clearTileBoundExplorationTargets();
        app.location.x = traversal.to.x; app.location.y = traversal.to.y;
        app._advanceTime(traversal.cost);
        if (!YAW_RECOVERY_MODES?.restricts?.(app, 'hunger')) {
            app._applyTravelCost?.(app.party, { action: 'move', source: 'travel' });
        }
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
            if (app.creatures.length > 0) {
                app.updateScene(`${biome.name} - ${tile.hasLandmark ? tile.landmarkName : 'Wilderness'}`, `You return to the ${biome.name}. ${tile.description}`, false);
                app.renderExplorationActions();
            }
        } else {
            app.creatures = app._tileCreatures(tile.creatures || []);
            const hasQuestReservedEncounter = app.creatures.some(unit => unit?.questWorldDirective);
            if (!recoveryJourney && tile.structure && !tile.structureSpawned) {
                app.spawnStructureEncounter(tile, !wasExplored);
            } else if (!recoveryJourney && !hasQuestReservedEncounter && app._worldChance(
                'tile-wild-encounter',
                tile.x,
                tile.y,
                app._encounterChanceForTile?.(tile, biome) ?? (biome.encounterChance || 0)
            )) {
                app.spawnWildEncounter(tile, false, !wasExplored);
            }
        }
        tile.creatures = app._tileCreatures(app.creatures);
        app.persistTileDelta(tile.x, tile.y, tile, { visual: !wasExplored });
        app.emitTileObservation?.(tile, { wasExplored });
        YAW_COMPANION_BEHAVIOR?.reactToTile?.(app, tile, { wasExplored, interior: false });
        if (!recoveryJourney) {
            app._updateQuestProgress('escort', { x: app.location.x, y: app.location.y });
            app._updateQuestProgress('travel', { x: app.location.x, y: app.location.y });
        }
        if (!app.combatState.active) app._ensureCurrentHostileEncounter?.({ source: 'movement', announce: true });
        app.renderMap();
        const recoveryPending = Boolean(app.defeatState?.pending || app.defeatState?.terminal);
        if (!app.combatState.active && !recoveryPending) app.showExplorationActions();
        if (YAW_RECOVERY_MODES?.isJourney?.(app)) app._showRecoveryJourney?.();
        else if (recoveryPending) app.showDefeatRecovery?.();
        app.renderParty();
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
