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
        return structureId === 'cave' || structureId === 'burrow' || structureId === 'web' || structureId === 'dungeon' ? 'cave' : 'indoors';
    },

    layoutDirections() {
        return [
            { id: 'north', opposite: 'south', dx: 0, dy: -1 },
            { id: 'east', opposite: 'west', dx: 1, dy: 0 },
            { id: 'south', opposite: 'north', dx: 0, dy: 1 },
            { id: 'west', opposite: 'east', dx: -1, dy: 0 }
        ];
    },

    interiorProfile(app, structureId) {
        const configured = app.STRUCTURES?.[structureId]?.interior?.profile || '';
        const profiles = {
            'small-building': { budget: 6, radius: 2, kind: 'building' },
            'large-building': { budget: 12, radius: 3, kind: 'building' },
            manor: { budget: 14, radius: 3, kind: 'building' },
            dungeon: { budget: 16, radius: 3, kind: 'building' },
            burrow: { budget: 10, radius: 3, kind: 'burrow' },
            'cave-network': { budget: 13, radius: 3, kind: 'cave-network' }
        };
        return profiles[configured] || profiles['small-building'];
    },

    interiorRoom(app, tile, struct, biomeId, x, y, options = {}) {
        const originBiome = app.biomes[tile.biome] || app.biomes.forest;
        const featureTable = originBiome.structureTable || [];
        const roll = typeof WorldGen !== 'undefined'
            ? WorldGen.hash01(app._mapSeed(), app.worldMeta?.generatorVersion || 3, 'interior-feature', tile.x, tile.y, tile.structure, x, y)
            : 0;
        const feature = featureTable.length ? featureTable[Math.floor(roll * featureTable.length) % featureTable.length] : null;
        return {
            x,
            y,
            biome: biomeId,
            explored: Boolean(options.exit),
            description: options.description || `${struct.name} ${options.archetype || 'chamber'}.`,
            archetype: options.archetype || 'chamber',
            hasLandmark: false,
            landmarkName: '',
            structure: options.exit ? null : feature,
            structureSpawned: false,
            creatures: [],
            items: [],
            exit: Boolean(options.exit),
            surfaceExit: options.surfaceExit || null,
            connections: []
        };
    },

    linkInteriorRooms(tiles) {
        const directions = this.layoutDirections();
        Object.values(tiles).forEach(room => {
            room.connections = directions
                .filter(direction => Boolean(tiles[`${room.x + direction.dx},${room.y + direction.dy}`]))
                .map(direction => direction.id);
        });
        return tiles;
    },

    generateSparseBuilding(app, tile, struct, profile) {
        const biomeId = this.interiorBiomeForStructure(tile.structure);
        const tiles = {
            '0,0': this.interiorRoom(app, tile, struct, biomeId, 0, 0, {
                exit: true,
                archetype: 'entry',
                surfaceExit: { x: tile.x, y: tile.y }
            })
        };
        const directions = this.layoutDirections();
        for (let index = 1; index < profile.budget; index++) {
            const frontier = [];
            Object.values(tiles).forEach(room => directions.forEach(direction => {
                const x = room.x + direction.dx;
                const y = room.y + direction.dy;
                if (Math.abs(x) > profile.radius || Math.abs(y) > profile.radius || tiles[`${x},${y}`]) return;
                frontier.push({ x, y });
            }));
            const unique = Array.from(new Map(frontier.map(entry => [`${entry.x},${entry.y}`, entry])).values());
            if (!unique.length) break;
            const roll = typeof WorldGen !== 'undefined'
                ? WorldGen.hash01(app._mapSeed(), app.worldMeta?.generatorVersion || 3, 'interior-layout', tile.x, tile.y, tile.structure, index)
                : 0;
            const point = unique[Math.floor(roll * unique.length) % unique.length];
            const archetype = index % 4 === 0 ? 'chamber' : (index % 3 === 0 ? 'junction' : 'corridor');
            tiles[`${point.x},${point.y}`] = this.interiorRoom(app, tile, struct, biomeId, point.x, point.y, { archetype });
        }
        this.linkInteriorRooms(tiles);
        const xs = Object.values(tiles).map(room => room.x);
        const ys = Object.values(tiles).map(room => room.y);
        return {
            id: `interior_${tile.x}_${tile.y}_${tile.structure}`,
            generatorVersion: 1,
            kind: profile.kind,
            structure: tile.structure,
            structureName: struct.name,
            origin: { x: tile.x, y: tile.y },
            width: Math.max(...xs) - Math.min(...xs) + 1,
            height: Math.max(...ys) - Math.min(...ys) + 1,
            tiles,
            entryRooms: { default: '0,0' }
        };
    },

    generateCaveNetwork(app, tile, struct, site) {
        const axis = site.axis || 'east-west';
        const tiles = {};
        const portals = site.portals || [{ id: site.portalId || 'entry', x: tile.x, y: tile.y, index: 0 }];
        const start = axis === 'north-south' ? { x: 0, y: -3 } : { x: -3, y: 0 };
        const end = axis === 'north-south' ? { x: 0, y: 3 } : { x: 3, y: 0 };
        for (let step = -3; step <= 3; step++) {
            const x = axis === 'north-south' ? 0 : step;
            const y = axis === 'north-south' ? step : 0;
            const portal = step === -3 ? portals[0] : (step === 3 ? portals[1] : null);
            tiles[`${x},${y}`] = this.interiorRoom(app, tile, struct, 'cave', x, y, {
                exit: Boolean(portal),
                archetype: portal ? 'cave-mouth' : (step === 0 ? 'cavern' : 'tunnel'),
                surfaceExit: portal ? { x: portal.x, y: portal.y, portalId: portal.id } : null,
                description: portal ? 'A cave mouth opens toward the surface.' : (step === 0 ? 'A broad underground chamber joins several passages.' : 'A natural tunnel winds through the rock.')
            });
        }
        const directions = this.layoutDirections();
        const budget = this.interiorProfile(app, 'cave').budget;
        for (let index = Object.keys(tiles).length; index < budget; index++) {
            const frontier = [];
            Object.values(tiles).forEach(room => directions.forEach(direction => {
                const x = room.x + direction.dx;
                const y = room.y + direction.dy;
                if (Math.abs(x) > 3 || Math.abs(y) > 3 || tiles[`${x},${y}`]) return;
                frontier.push({ x, y });
            }));
            const unique = Array.from(new Map(frontier.map(entry => [`${entry.x},${entry.y}`, entry])).values());
            const roll = WorldGen.hash01(app._mapSeed(), app.worldMeta?.generatorVersion || 3, 'cave-branch', site.networkId, index);
            const point = unique[Math.floor(roll * unique.length) % unique.length];
            tiles[`${point.x},${point.y}`] = this.interiorRoom(app, tile, struct, 'cave', point.x, point.y, {
                archetype: index % 2 ? 'side-passage' : 'cavern',
                description: index % 2 ? 'A narrow side passage cuts through the stone.' : 'A hidden cavern opens beyond the tunnel.'
            });
        }
        this.linkInteriorRooms(tiles);
        const entryRooms = {};
        if (portals[0]) entryRooms[portals[0].id] = `${start.x},${start.y}`;
        if (portals[1]) entryRooms[portals[1].id] = `${end.x},${end.y}`;
        return {
            id: `interior_${site.networkId}`,
            generatorVersion: 1,
            kind: 'cave-network',
            networkId: site.networkId,
            structure: 'cave',
            structureName: struct.name,
            origin: { ...site.canonicalOrigin },
            width: 7,
            height: 7,
            portals: portals.map(portal => ({ ...portal })),
            entryRooms,
            tiles
        };
    },

    ensureInterior(app, tile) {
        if (!tile || !tile.structure) return null;
        const struct = app.STRUCTURES[tile.structure] || { name: tile.structure, icon: '🚪' };
        const site = tile.site?.kind === 'cave-portal' ? tile.site : null;
        const canonicalTile = site ? app.getTile(site.canonicalOrigin.x, site.canonicalOrigin.y) : tile;
        if (canonicalTile.interior?.tiles) return canonicalTile.interior;
        const profile = this.interiorProfile(app, tile.structure);
        canonicalTile.interior = site
            ? this.generateCaveNetwork(app, canonicalTile, struct, site)
            : this.generateSparseBuilding(app, tile, struct, profile);
        app.persistTileDelta(canonicalTile.x, canonicalTile.y, canonicalTile);
        return canonicalTile.interior;
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

    isStructureEnterable(app, structureId, tile = null) {
        if (!structureId) return false;
        const struct = app.STRUCTURES?.[structureId] || null;
        return Boolean(
            tile?.enterable === true
            || tile?.interior?.enabled === true
            || struct?.enterable === true
            || struct?.interior?.enabled === true
        );
    },

    enter(app) {
        if (app.inInterior) return;
        const tile = this.currentOverworldTile(app);
        if (!tile || !tile.structure) {
            app.log.push({ text: app._label('structure.noStructure', 'There is no structure to enter here.'), type: 'discovery' });
            app.renderLog();
            return;
        }
        if (!this.isStructureEnterable(app, tile.structure, tile)) {
            app.log.push({ text: app._label('structure.notEnterable', 'There is no interior to enter here.'), type: 'discovery' });
            app.renderLog();
            return false;
        }
        tile.creatures = app._tileCreatures(app.creatures);
        app.activeInterior = this.ensureInterior(app, tile);
        app.persistTileDelta(tile.x, tile.y, tile);
        app.clearTileBoundExplorationTargets();
        app.inInterior = true;
        const entryKey = app.activeInterior.entryRooms?.[tile.site?.portalId] || app.activeInterior.entryRooms?.default || '0,0';
        const [entryX, entryY] = entryKey.split(',').map(Number);
        app.interiorLocation = { x: entryX, y: entryY };
        app.interiorEntrySurface = { x: tile.x, y: tile.y };
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
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'sceneFeed', 'activityLog'], 'structure-enter');
        app.autoSave();
    },

    exit(app) {
        if (!app.inInterior || !app.activeInterior) return;
        const room = this.currentInteriorTile(app);
        if (room) room.creatures = app._tileCreatures(app.creatures);
        const origin = app.activeInterior.origin;
        const surfaceExit = room?.surfaceExit || app.interiorEntrySurface || origin;
        const tile = app.getTile(surfaceExit.x, surfaceExit.y);
        app.clearTileBoundExplorationTargets();
        app.location = { x: surfaceExit.x, y: surfaceExit.y };
        app.inInterior = false;
        app.activeInterior = null;
        app.interiorEntrySurface = null;
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
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'sceneFeed', 'activityLog'], 'structure-exit');
        app.autoSave();
    },

    moveInterior(app, dx, dy) {
        if (app.transactionWindow || app.holdingsWindow) return false;
        if (!app.activeInterior) return;
        const traversal = app._traversalDecision(dx, dy);
        if (!traversal.allowed) {
            const text = app._traversalMessage(traversal);
            app.log.push({ text, type: 'move' });
            app.showToast?.({ text, type: 'blocked', importance: 'notable', dedupeKey: `blocked:interior:${traversal.reasonCode}` });
            app.renderLog();
            return false;
        }
        const from = { x: app.interiorLocation.x, y: app.interiorLocation.y, interior: true };
        const nx = traversal.to.x;
        const ny = traversal.to.y;
        const oldRoom = this.currentInteriorTile(app);
        if (oldRoom) oldRoom.creatures = app._tileCreatures(app.creatures);
        app.clearTileBoundExplorationTargets();
        app.interiorLocation = { x: nx, y: ny };
        app._advanceTime(traversal.cost);
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
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'sceneFeed', 'activityLog'], 'structure-move');
        app.autoSave();
        return true;
    },

    rest(app) {
        if (!this.canRestHere(app)) {
            const unavailableText = app._label('log.restUnavailable', 'There is no safe place to rest here.');
            app.log.push({ text: unavailableText, type: 'discovery' });
            app._addTileEvent(unavailableText, 'discovery');
            app.showToast?.({ text: unavailableText, type: 'blocked', importance: 'notable', dedupeKey: 'blocked:rest-unavailable' });
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
        const cured = YAW_COMBAT_STATUS.curePersistentAilments([...healed]);
        app._advanceTime(8);
        const restedText = app._label('log.rested', 'Rested and recovered.');
        app.log.push({ text: restedText, type: 'heal' });
        app._addTileEvent(restedText, 'heal');
        if (cured.length > 0) {
            const curedText = app._label('log.restCuredAilments', 'Safe rest clears lingering poison, bleeding, and burns.');
            app.log.push({ text: curedText, type: 'heal' });
            app._addTileEvent(curedText, 'heal');
        }
        app.renderLog();
        app.renderParty();
        app.renderExplorationActions();
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'sceneFeed', 'activityLog'], 'rest');
        app.autoSave();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_STRUCTURE_NAVIGATION = YAW_STRUCTURE_NAVIGATION;
}
