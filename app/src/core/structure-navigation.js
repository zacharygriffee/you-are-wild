/**
 * YOU ARE WILD STRUCTURE NAVIGATION
 * Current exploration tile, structure interiors, and safe-rest traversal.
 */

const YAW_STRUCTURE_NAVIGATION = {
    interiorKey(app, x = app.interiorLocation.x, y = app.interiorLocation.y) {
        return `${x},${y}`;
    },

    currentOverworldTile(app) {
        return app.getTile(app.location.x, app.location.y);
    },

    currentInteriorTile(app) {
        if (!app.activeInterior) return null;
        return app.activeInterior.tiles[this.interiorKey(app)];
    },

    currentExplorationTile(app) {
        return app.inInterior ? this.currentInteriorTile(app) : this.currentOverworldTile(app);
    },

    interiorBiomeForStructure(structureId) {
        return structureId === 'cave' || structureId === 'burrow' || structureId === 'web' || structureId === 'ruins' ? 'cave' : 'indoors';
    },

    ensureInterior(app, tile) {
        if (!tile || !tile.structure) return null;
        if (tile.interior && tile.interior.tiles) return tile.interior;
        const struct = app.STRUCTURES[tile.structure] || { name: tile.structure, icon: '🚪' };
        const biomeId = this.interiorBiomeForStructure(tile.structure);
        const originBiome = app.biomes[tile.biome] || app.biomes.forest;
        const featureTable = originBiome.structureTable || [];
        const tiles = {};
        for (let y = -2; y <= 2; y++) {
            for (let x = -2; x <= 2; x++) {
                const key = `${x},${y}`;
                const feature = x === 0 && y === 0 ? 'exit' : featureTable[Math.abs((tile.x + x) * 17 + (tile.y + y) * 31) % Math.max(1, featureTable.length)];
                tiles[key] = {
                    x, y, biome: biomeId, explored: x === 0 && y === 0,
                    description: `${struct.name} interior chamber.`,
                    hasLandmark: false, landmarkName: '',
                    structure: feature === 'exit' ? null : feature,
                    structureSpawned: false,
                    creatures: [], items: [], exit: x === 0 && y === 0
                };
            }
        }
        tile.interior = {
            id: `interior_${tile.x}_${tile.y}_${tile.structure}`,
            structure: tile.structure,
            structureName: struct.name,
            origin: { x: tile.x, y: tile.y },
            width: 5,
            height: 5,
            tiles
        };
        app.persistTileDelta(tile.x, tile.y, tile);
        return tile.interior;
    },

    persistCurrentExplorationTile(app, tile = this.currentExplorationTile(app)) {
        if (!tile) return null;
        if (app.inInterior && app.activeInterior?.origin) {
            const origin = app.getTile(app.activeInterior.origin.x, app.activeInterior.origin.y);
            return app.persistTileDelta(origin.x, origin.y, origin);
        }
        return app.persistTileDelta(tile.x, tile.y, tile);
    },

    canRestHere(app) {
        if (app.inInterior && app.activeInterior) {
            return app.SAFE_REST_STRUCTURES.includes(app.activeInterior.structure);
        }
        const tile = this.currentOverworldTile(app);
        if (!tile) return false;
        return this.isRestCapableStructure(app, tile.structure, tile);
    },

    isRestCapableStructure(app, structureId, tile = null) {
        if (!structureId) return false;
        if (app.SAFE_REST_STRUCTURES.includes(structureId)) return true;
        return structureId === 'camp' && tile?.overlays?.poi?.category === 'restSite';
    },

    enter(app) {
        if (app.inInterior) return;
        const tile = this.currentOverworldTile(app);
        if (!tile || !tile.structure) {
            app.log.push({ text: app._label('structure.noStructure', 'There is no structure to enter here.'), type: 'discovery' });
            app.renderLog();
            return;
        }
        tile.creatures = app._tileCreatures(app.creatures);
        app.activeInterior = this.ensureInterior(app, tile);
        app.persistTileDelta(tile.x, tile.y, tile);
        app.clearTileBoundExplorationTargets();
        app.inInterior = true;
        app.interiorLocation = { x: 0, y: 0 };
        const room = this.currentInteriorTile(app);
        room.explored = true;
        app.creatures = app._tileCreatures(room.creatures || []);
        app.currentBiome = room.biome;
        app._clearTileEvents();
        const enteredText = app._label('structure.entered', 'Entered {name}.', { name: app.activeInterior.structureName });
        app.log.push({ text: enteredText, type: 'discovery' });
        app._addTileEvent(enteredText, 'discovery');
        app.renderMap();
        app.renderCreatures();
        app.renderLog();
        app.showExplorationActions();
        app.autoSave();
    },

    exit(app) {
        if (!app.inInterior || !app.activeInterior) return;
        const room = this.currentInteriorTile(app);
        if (room) room.creatures = app._tileCreatures(app.creatures);
        const origin = app.activeInterior.origin;
        const tile = app.getTile(origin.x, origin.y);
        app.clearTileBoundExplorationTargets();
        app.location = { x: origin.x, y: origin.y };
        app.inInterior = false;
        app.activeInterior = null;
        app.interiorLocation = { x: 0, y: 0 };
        app.creatures = app._tileCreatures(tile.creatures || []);
        app.currentBiome = tile.biome;
        app.persistTileDelta(tile.x, tile.y, tile);
        document.getElementById('coords').textContent = `${app.location.x}, ${app.location.y}`;
        app._clearTileEvents();
        const exitedText = app._label('structure.exited', 'Exited {name}.', { name: app.STRUCTURES[tile.structure]?.name || app._label('structure.fallbackName', 'the structure') });
        app.log.push({ text: exitedText, type: 'move' });
        app._addTileEvent(exitedText, 'move');
        app.showExplorationActions();
        app.renderMap();
        app.renderCreatures();
        app.renderLog();
        app.autoSave();
    },

    moveInterior(app, dx, dy) {
        if (app.transactionWindow || app.holdingsWindow) return false;
        if (!app.activeInterior) return;
        const from = { x: app.interiorLocation.x, y: app.interiorLocation.y, interior: true };
        const nx = app.interiorLocation.x + dx;
        const ny = app.interiorLocation.y + dy;
        if (Math.abs(nx) > 2 || Math.abs(ny) > 2) {
            app.log.push({ text: app._label('structure.wallBlocked', 'A wall blocks the way.'), type: 'move' });
            app.renderLog();
            return;
        }
        const oldRoom = this.currentInteriorTile(app);
        if (oldRoom) oldRoom.creatures = app._tileCreatures(app.creatures);
        app.clearTileBoundExplorationTargets();
        app.interiorLocation = { x: nx, y: ny };
        app._advanceTime(1);
        const room = this.currentInteriorTile(app);
        const wasExplored = room.explored;
        room.explored = true;
        app.creatures = app._tileCreatures(room.creatures || []);
        app.currentBiome = room.biome;
        const biome = app.biomes[room.biome] || app.biomes.indoors;
        app._clearTileEvents();
        const movedInsideText = app._label('structure.movedInside', 'Moved inside {name} to {x}, {y}.', {
            name: app.activeInterior.structureName,
            x: nx,
            y: ny
        });
        app.log.push({ text: movedInsideText, type: 'move' });
        app._addTileEvent(movedInsideText, 'move');
        if (!wasExplored && app._worldChance('interior-encounter', app.activeInterior.origin.x, app.activeInterior.origin.y, biome.encounterChance || 0, nx, ny)) {
            app.spawnWildEncounter(room, false, true);
        }
        room.creatures = app._tileCreatures(app.creatures);
        app.renderMap();
        app.renderCreatures();
        app.renderLog();
        if (!app.combatState.active) app.showExplorationActions();
        app._emitModuleHook('onPlayerMove', {
            from,
            to: { x: nx, y: ny, interior: true },
            dx,
            dy,
            tile: room,
            interior: true
        });
        app.autoSave();
    },

    rest(app) {
        if (!this.canRestHere(app)) {
            const unavailableText = app._label('log.restUnavailable', 'There is no safe place to rest here.');
            app.log.push({ text: unavailableText, type: 'discovery' });
            app._addTileEvent(unavailableText, 'discovery');
            app.renderLog();
            app.renderExplorationActions();
            return;
        }
        const healAmount = 30 + app._partyRoleEffect('support', 10, 20);
        const healed = new Set([app.player, ...app.party]);
        healed.forEach(p => {
            p.CPun = Math.min(p.MPun, p.CPun + healAmount);
            app._applyHungerRelief?.(p, app.BALANCE_V1?.relief?.rest ?? 10, { action: 'rest', source: 'rest' });
        });
        app._advanceTime(8);
        const restedText = app._label('log.rested', 'Rested and recovered.');
        app.log.push({ text: restedText, type: 'heal' });
        app._addTileEvent(restedText, 'heal');
        app.renderLog();
        app.renderParty();
        app.renderExplorationActions();
        app.autoSave();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_STRUCTURE_NAVIGATION = YAW_STRUCTURE_NAVIGATION;
}
