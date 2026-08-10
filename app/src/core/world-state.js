/**
 * YOU ARE WILD WORLD STATE
 * Deterministic world metadata, base tile reconstruction, and sparse tile deltas.
 */

const YAW_WORLD_STATE = {
    mapSeed(app) {
        return String(app.worldMeta?.seed || 'default');
    },

    seededNoise(app, ...parts) {
        if (typeof WorldGen !== 'undefined') {
            return WorldGen.hash01(app._mapSeed(), app.worldMeta?.generatorVersion || 1, parts.shift() || 'seeded', ...parts);
        }
        return 0;
    },

    patchNoise(app, spx, spy) {
        return app._seededNoise('legacy-biome-region', spx, spy);
    },

    tileKey(x, y) {
        return `${x},${y}`;
    },

    tileDeltaStoreKey(app, worldId, x, y) {
        return `${worldId || app.worldMeta?.worldId || 'world_default'}:${x}:${y}`;
    },

    dirtyWorldTileState(app) {
        if (!(app._dirtyWorldTileKeys instanceof Set)) app._dirtyWorldTileKeys = new Set(app._dirtyWorldTileKeys || []);
        return app._dirtyWorldTileKeys;
    },

    worldTileVisualJournal(app) {
        if (!Array.isArray(app._worldTileVisualDirtyJournal)) app._worldTileVisualDirtyJournal = [];
        app._worldTileVisualDirtyRevision = Math.max(0, Number(app._worldTileVisualDirtyRevision) || 0);
        return app._worldTileVisualDirtyJournal;
    },

    markWorldTileDirty(app, x, y, reason = '', options = {}) {
        const nx = Number(x);
        const ny = Number(y);
        if (!Number.isFinite(nx) || !Number.isFinite(ny)) return false;
        const key = app._tileKey(Math.floor(nx), Math.floor(ny));
        this.dirtyWorldTileState(app).add(key);
        if (options.visual !== false && String(reason || '') !== 'sparse-current-tile') {
            const journal = this.worldTileVisualJournal(app);
            const revision = app._worldTileVisualDirtyRevision + 1;
            app._worldTileVisualDirtyRevision = revision;
            journal.push({ revision, key, reason: String(reason || 'world-tile-dirty') });
            if (journal.length > 512) journal.splice(0, journal.length - 512);
        }
        app._lastWorldTileDirtyReason = String(reason || 'world-tile-dirty');
        return true;
    },

    markCurrentWorldTileDirty(app, reason = '') {
        return this.markWorldTileDirty(app, app.location?.x || 0, app.location?.y || 0, reason || 'current-world-tile');
    },

    dirtyWorldTileKeys(app) {
        return Array.from(this.dirtyWorldTileState(app));
    },

    worldTileVisualRevision(app) {
        this.worldTileVisualJournal(app);
        return app._worldTileVisualDirtyRevision;
    },

    worldTileVisualChangesSince(app, cursor = 0) {
        const journal = this.worldTileVisualJournal(app);
        const revision = app._worldTileVisualDirtyRevision;
        const normalizedCursor = Math.max(0, Number(cursor) || 0);
        const oldestRevision = journal[0]?.revision || (revision + 1);
        const overflow = normalizedCursor > revision || normalizedCursor < oldestRevision - 1;
        return {
            revision,
            overflow,
            keys: overflow
                ? []
                : journal.filter(entry => entry.revision > normalizedCursor).map(entry => entry.key)
        };
    },

    clearDirtyWorldTileKeys(app, keys = null) {
        const state = this.dirtyWorldTileState(app);
        if (!keys) {
            state.clear();
            return true;
        }
        for (const key of keys || []) state.delete(String(key));
        return true;
    },

    defaultWorldMeta() {
        return { worldId: 'world_v7', seed: 'default', generatorVersion: 7, mapModsHash: 'core' };
    },

    normalizeWorldMeta(app, meta, fallback = null) {
        const defaults = app._defaultWorldMeta();
        const base = fallback && typeof fallback === 'object' ? fallback : defaults;
        const source = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
        const cleanToken = (value, fallbackValue) => {
            const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
            if (text && /^[a-zA-Z0-9_.:-]+$/.test(text)) return text;
            const fallbackText = typeof fallbackValue === 'string' || typeof fallbackValue === 'number' ? String(fallbackValue).trim() : '';
            return fallbackText && /^[a-zA-Z0-9_.:-]+$/.test(fallbackText) ? fallbackText : '';
        };
        const worldId = cleanToken(source.worldId, base.worldId) || defaults.worldId;
        const seed = cleanToken(source.seed, base.seed) || defaults.seed;
        const sourceVersion = Number(source.generatorVersion);
        const baseVersion = Number(base.generatorVersion);
        const generatorVersion = Number.isInteger(sourceVersion) && sourceVersion > 0
            ? sourceVersion
            : (Number.isInteger(baseVersion) && baseVersion > 0 ? baseVersion : defaults.generatorVersion);
        const mapModsHash = cleanToken(source.mapModsHash, base.mapModsHash) || defaults.mapModsHash;
        return { worldId, seed, generatorVersion, mapModsHash };
    },

    cloneTileValue(value) {
        if (value == null) return value;
        if (Array.isArray(value) || typeof value === 'object') {
            try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
        }
        return value;
    },

    regionBiomeKeys(app) {
        const legacyInteriorRegions = new Set(['cave', 'dungeon', 'manor']);
        const legacyWorld = Number(app.worldMeta?.generatorVersion || 1) < 3;
        return Object.entries(app.biomes)
            .filter(([id, biome]) => (biome.role || 'region') === 'region' || (legacyWorld && legacyInteriorRegions.has(id)))
            .map(([id]) => id);
    },

    getSuperPatchBiome(app, spx, spy) {
        const key = `${spx},${spy}`;
        if (app.superPatchMap.has(key)) return app.superPatchMap.get(key);
        const biomeKeys = app._regionBiomeKeys();
        const biomeId = typeof WorldGen !== 'undefined'
            ? (WorldGen.pickWeighted(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'legacy-super-patch-biome', spx, spy, biomeKeys.map(id => ({ id, weight: id === 'grove' ? 2 : 1 }))) || 'plains')
            : biomeKeys[Math.floor(app._patchNoise(spx, spy) * biomeKeys.length) % biomeKeys.length];
        app.superPatchMap.set(key, biomeId);
        return biomeId;
    },

    rebuildSuperPatchMap(app) {
        app.superPatchMap = new Map();
        for (const [key, tile] of app.worldMap) {
            if (tile.baseBiome || tile.biomeDelta) continue;
            const spx = Math.floor(Math.floor(tile.x / app.PATCH_SIZE) / app.SUPER_PATCH_SIZE);
            const spy = Math.floor(Math.floor(tile.y / app.PATCH_SIZE) / app.SUPER_PATCH_SIZE);
            const skey = `${spx},${spy}`;
            if (!app.superPatchMap.has(skey)) {
                app.superPatchMap.set(skey, tile.biome);
            }
        }
    },

    getBaseTile(app, x, y) {
        const generated = typeof WorldGen !== 'undefined'
            ? WorldGen.generateBaseTile(app.worldMeta, x, y, app._regionBiomeKeys())
            : { biome: 'plains', baseBiome: 'plains', macroBiome: 'plains', elevation: 0.5, moisture: 0.5, heat: 0.5, fertility: 0.5, dangerPressure: 0.3, regionCell: null, terrainTags: [] };
        return { x, y, ...generated, explored: false, seen: false, description: '', hasLandmark: false, landmarkName: '', hostile: false, creatures: [], items: [], deathBags: [], placedObjects: [], structure: generated.structure || null, structureSpawned: false };
    },

    encounterPressureForTile(app, tile, biomeDef = null) {
        if (typeof WorldGen === 'undefined' || !tile) {
            const chance = Number(biomeDef?.encounterChance || 0);
            return { finalChance: chance, spawnChance: chance };
        }
        return WorldGen.getEncounterPressure(tile, {
            biomeDanger: Number(biomeDef?.danger || 0),
            baseEncounterChance: Number(biomeDef?.encounterChance || 0),
            isNight: Boolean(app._isNight?.()),
            encounterPolicy: tile.encounterPolicy
        });
    },

    encounterChanceForTile(app, tile, biomeDef = null) {
        const legacyChance = Number(biomeDef?.encounterChance || 0);
        if (Number(app.worldMeta?.generatorVersion || 1) < 4) return legacyChance;
        return this.encounterPressureForTile(app, tile, biomeDef).spawnChance;
    },

    getTileDelta(app, x, y) {
        return app.tileDeltas?.get(app._tileKey(x, y)) || null;
    },

    applyTileDelta(app, base, delta = null) {
        const tile = { ...base };
        if (delta) {
            for (const [field, value] of Object.entries(delta)) {
                if (field === 'x' || field === 'y') continue;
                tile[field] = app._cloneTileValue(value);
            }
        }
        tile.x = base.x;
        tile.y = base.y;
        tile.baseBiome = base.baseBiome || base.biome;
        if (!Array.isArray(tile.creatures)) tile.creatures = [];
        if (!Array.isArray(tile.items)) tile.items = [];
        if (!Array.isArray(tile.deathBags)) tile.deathBags = [];
        if (!Array.isArray(tile.placedObjects)) tile.placedObjects = [];
        return tile;
    },

    tileDeltaFromEffectiveTile(app, tile) {
        if (!tile) return null;
        const base = app.getBaseTile(tile.x, tile.y);
        const delta = {};
        const fields = ['biome', 'explored', 'seen', 'description', 'hasLandmark', 'landmarkName', 'hostile', 'creatures', 'items', 'deathBags', 'placedObjects', 'structure', 'structureSpawned', 'structureLooted', 'resourceSearched', 'interior', 'site', 'tag', 'name', 'color'];
        for (const field of fields) {
            const value = tile[field];
            const baseValue = base[field];
            const changed = JSON.stringify(value ?? null) !== JSON.stringify(baseValue ?? null);
            if (changed) delta[field] = app._cloneTileValue(value);
        }
        return Object.keys(delta).length ? delta : null;
    },

    persistTileDelta(app, x, y, tile = null, options = {}) {
        const key = app._tileKey(x, y);
        const effective = tile || app.worldMap.get(key);
        const delta = app._tileDeltaFromEffectiveTile(effective);
        if (delta) app.tileDeltas.set(key, delta);
        else app.tileDeltas.delete(key);
        if (options.markDirty !== false) {
            app.markWorldTileDirty?.(x, y, options.reason || 'tile-delta', { visual: options.visual !== false });
        }
        return delta;
    },

    persistAllTileDeltas(app) {
        if (!app.tileDeltas) app.tileDeltas = new Map();
        app._syncCurrentTileCreatures();
        for (const tile of app.worldMap.values()) {
            app.persistTileDelta(tile.x, tile.y, tile, { markDirty: false });
        }
        return app.tileDeltas;
    },

    tileDeltaRecordFromEntry(app, key, delta) {
        const [x, y] = key.split(',').map(Number);
        const worldId = app.worldMeta?.worldId || 'world_default';
        return {
            key: app._tileDeltaStoreKey(worldId, x, y),
            worldId,
            x,
            y,
            delta: app._cloneTileValue(delta),
            updatedAt: Date.now()
        };
    },

    normalizeTileDeltaRecord(app, record) {
        if (!record || record.worldId !== app.worldMeta?.worldId) return null;
        const x = Number(record.x);
        const y = Number(record.y);
        if (!Number.isFinite(x) || !Number.isFinite(y) || Math.floor(x) !== x || Math.floor(y) !== y) return null;
        const delta = record.delta;
        if (!delta || typeof delta !== 'object' || Array.isArray(delta)) return null;
        const cloned = app._cloneTileValue(delta);
        if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned) || Object.keys(cloned).length === 0) return null;
        return { x, y, delta: cloned };
    },

    applyTileDeltaRecords(app, records = []) {
        if (!app.tileDeltas) app.tileDeltas = new Map();
        for (const record of records) {
            const normalized = app._normalizeTileDeltaRecord(record);
            if (!normalized) continue;
            const key = app._tileKey(normalized.x, normalized.y);
            app.tileDeltas.set(key, normalized.delta);
            const effective = app.applyTileDelta(app.getBaseTile(normalized.x, normalized.y), normalized.delta);
            app.worldMap.set(key, effective);
            if (effective.explored) app.exploredTiles.add(key);
        }
    },

    restoreWorldState(app, loaded) {
        app.worldMap = new Map();
        app.tileDeltas = new Map();
        app.exploredTiles = new Set(loaded.exploredTiles || []);
        app.worldMeta = app._normalizeWorldMeta(loaded.worldMeta, app.worldMeta || app._defaultWorldMeta());
        app.superPatchMap = new Map();
        if (loaded.worldMap) {
            for (const [key, tile] of Object.entries(loaded.worldMap)) {
                const [kx, ky] = key.split(',').map(Number);
                if (typeof tile.x !== 'number') tile.x = Number.isFinite(kx) ? kx : 0;
                if (typeof tile.y !== 'number') tile.y = Number.isFinite(ky) ? ky : 0;
                if (Array.isArray(tile.creatures)) {
                    tile.creatures = tile.creatures.map(unit => app._normalizeUnit(unit, {}));
                }
                // Inline saves from older builds contain generated fields such as overlays and
                // encounter pressure. Rebuild those from the current deterministic generator and
                // carry forward only mutable tile state, or legacy danger footprints can overwrite
                // corrected anchor/influence semantics indefinitely.
                const delta = app._tileDeltaFromEffectiveTile(tile);
                const effective = app.applyTileDelta(app.getBaseTile(tile.x, tile.y), delta);
                const effectiveKey = app._tileKey(effective.x, effective.y);
                app.worldMap.set(effectiveKey, effective);
                app.persistTileDelta(effective.x, effective.y, effective, { markDirty: false });
                if (effective.explored) app.exploredTiles.add(effectiveKey);
            }
        }
        app._rebuildSuperPatchMap();
        const currentTile = app.getTile(app.location.x, app.location.y);
        app.currentBiome = currentTile.biome;
        app.creatures = app._tileCreatures(currentTile.creatures || []);
    },

    getTile(app, x, y) {
        const key = app._tileKey(x, y);
        if (app.worldMap.has(key)) return app.worldMap.get(key);
        const delta = app.getTileDelta(x, y);
        const base = !delta && typeof YAW_BIOME_RECIPES !== 'undefined'
            ? YAW_BIOME_RECIPES.apply(app, app.getBaseTile(x, y))
            : app.getBaseTile(x, y);
        const tile = app.applyTileDelta(base, delta);
        app.worldMap.set(key, tile);
        return tile;
    },

    isExplored(app, x, y) {
        return app.exploredTiles.has(app._tileKey(x, y));
    },

    exploreTile(app, x, y) {
        const key = app._tileKey(x, y);
        const tile = app.getTile(x, y);
        tile.seen = true;
        if (!tile.explored) {
            tile.explored = true;
            app.exploredTiles.add(key);
            const biome = app.biomes[tile.biome];
            const descriptions = biome.descriptions || [''];
            const descIndex = typeof WorldGen !== 'undefined'
                ? Math.floor(WorldGen.hash01(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'tile-description', x, y) * descriptions.length) % descriptions.length
                : Math.abs(x * 31 + y * 17) % descriptions.length;
            tile.description = descriptions[descIndex];
            if (typeof WorldGen !== 'undefined' && WorldGen.chance(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'tile-landmark', x, y, 0.1)) {
                const landmarks = { grove: ['Sacred Spring','Old Bench','Butterfly Garden'], forest: ['Ancient Tree','Fairy Ring','Hunter\'s Camp'], swamp: ['Sunken Shrine','Witch\'s Hut','Bone Pile'], plains: ['Lone Tree','Abandoned Wagon','Stone Circle'], cave: ['Crystal Chamber','Underground Lake','Collapsed Tunnel'], jungle: ['Waterfall','Hidden Pool','Rope Bridge'], beach: ['Tide Pool','Shell Ring','Wreck Marker'], cliff: ['High Overlook','Goat Trail','Wind Carved Arch'], water: ['Quiet Inlet','River Bend','Blue Spring'], dungeon: ['Sealed Door','Old Watchpost','Broken Obelisk'], manor: ['Garden Gate','Fountain Court','Old Conservatory'] };
                const list = landmarks[tile.biome] || ['Mysterious Structure'];
                tile.hasLandmark = true;
                tile.landmarkName = WorldGen.pickWeighted(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'tile-landmark-name', x, y, list) || list[0];
            }
            if (!tile.structure && tile.overlays?.poi?.category === 'restSite') {
                tile.structure = 'camp';
            }
            if (!tile.structure && typeof WorldGen !== 'undefined' && WorldGen.chance(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'tile-structure', x, y, biome.structureChance || 0)) {
                const table = (biome.structureTable || []).filter(entry => {
                    if (tile.encounterPolicy?.allowHostileStructures !== false) return true;
                    const structureId = typeof entry === 'string' ? entry : entry?.id;
                    const structure = app.STRUCTURES?.[structureId];
                    return structure && structure.disposition !== 'enemy' && Number(structure.threat || 0) < 2;
                });
                tile.structure = WorldGen.pickWeighted(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'tile-structure-kind', x, y, table) || null;
            }
            app._emitMapGenerate(tile, x, y);
            app.currentBiome = tile.biome;
            app.persistTileDelta(x, y, tile);
        }
        return tile;
    },

    revealVisibleTiles(app, x = app.location?.x || 0, y = app.location?.y || 0, radius = 1) {
        const centerX = Number(x);
        const centerY = Number(y);
        const revealRadius = Math.max(0, Math.floor(Number(radius) || 0));
        if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return [];
        const revealed = [];
        for (let dy = -revealRadius; dy <= revealRadius; dy++) {
            for (let dx = -revealRadius; dx <= revealRadius; dx++) {
                const tx = centerX + dx;
                const ty = centerY + dy;
                const tile = app.getTile(tx, ty);
                if (tile.seen || tile.explored) continue;
                tile.seen = true;
                app.persistTileDelta(tx, ty, tile);
                revealed.push(tile);
            }
        }
        return revealed;
    },

    fleeDestination(app, unit, options = {}) {
        const directions = Object.values(YAW_TRAVERSAL?.DIRECTIONS || {});
        let candidates = directions.map(direction => {
            const decision = app.inInterior
                ? YAW_TRAVERSAL.resolveInterior(app, direction.dx, direction.dy)
                : YAW_TRAVERSAL.resolveOverworld(app, direction.dx, direction.dy);
            return decision?.allowed ? decision : null;
        }).filter(Boolean);
        if (options.safeOnly) {
            candidates = candidates.filter(decision => !(decision.tile?.creatures || []).some(candidate => candidate
                && candidate.CPun > 0
                && !candidate.knockedOut
                && candidate.disposition === app.DISPOSITION.ENEMY));
        }
        const unitId = app._unitSelectionId?.(unit) || unit.id || unit.name || 'creature';
        const roll = app._worldRoll?.(
            'creature-flee-destination',
            Number(app.location?.x || 0),
            Number(app.location?.y || 0),
            unitId,
            Number(app.dayCount || 0),
            Number(app.timeHour || 0),
            options.source || 'flee'
        ) ?? 0;
        return candidates.length
            ? candidates[Math.min(candidates.length - 1, Math.floor(roll * candidates.length))]
            : null;
    },

    placeAtFleeDestination(app, unit, destination) {
        if (!unit || !destination) return null;
        if (app.inInterior) {
            const room = destination.tile;
            if (!Array.isArray(room.creatures)) room.creatures = [];
            if (!room.creatures.includes(unit)) room.creatures.push(unit);
            if (app.activeInterior?.origin) {
                const origin = app.getTile(app.activeInterior.origin.x, app.activeInterior.origin.y);
                origin.interior = app.activeInterior;
                app.persistTileDelta(origin.x, origin.y, origin);
            }
            return { interior: true, x: destination.to.x, y: destination.to.y, direction: destination.direction, tile: room };
        }
        const tile = destination.tile || app.getTile(destination.to.x, destination.to.y);
        if (!Array.isArray(tile.creatures)) tile.creatures = [];
        if (!tile.creatures.includes(unit)) tile.creatures.push(unit);
        app.persistTileDelta(tile.x, tile.y, tile);
        return { interior: false, x: tile.x, y: tile.y, direction: destination.direction, tile };
    },

    relocateFleeingCreature(app, unit, options = {}) {
        if (!unit || (app.party || []).includes(unit)) return null;
        const destination = options.destination || this.fleeDestination(app, unit, options);
        if (!destination) {
            unit.fledCombat = false;
            return null;
        }
        const queueIndex = (app.combatState?.turnQueue || []).findIndex(entry => entry?.unit === unit);
        app._removeCreatureFromArea(unit);
        if (queueIndex >= 0 && queueIndex <= Number(app.combatState?.currentTurn || 0)) {
            app.combatState.currentTurn = Math.max(-1, Number(app.combatState.currentTurn || 0) - 1);
        }
        if (typeof YAW_COMBAT_STATUS !== 'undefined') YAW_COMBAT_STATUS.clearCombatOnlyStatuses([unit]);
        unit.fledCombat = false;
        unit.lastFledAt = {
            day: Number(app.dayCount || 0),
            hour: Number(app.timeHour || 0),
            source: options.source || 'flee'
        };
        return this.placeAtFleeDestination(app, unit, destination);
    },

    relocateFleeingPartyMember(app, unit, options = {}) {
        if (!unit || unit === app.player || !(app.party || []).includes(unit)) return null;
        const destination = options.destination || this.fleeDestination(app, unit, { ...options, safeOnly: true });
        if (!destination) return null;
        const partyIndex = app.party.indexOf(unit);
        app.party.splice(partyIndex, 1);
        const queueIndex = (app.combatState?.turnQueue || []).findIndex(entry => entry?.unit === unit);
        app.combatState.turnQueue = (app.combatState.turnQueue || []).filter(entry => entry?.unit !== unit);
        if (queueIndex >= 0 && queueIndex <= Number(app.combatState?.currentTurn || 0)) {
            app.combatState.currentTurn = Math.max(-1, Number(app.combatState.currentTurn || 0) - 1);
        }
        if (typeof YAW_COMBAT_STATUS !== 'undefined') YAW_COMBAT_STATUS.clearCombatOnlyStatuses([unit]);
        Object.assign(unit, {
            disposition: app.DISPOSITION.FRIENDLY,
            ally: false,
            mc: false,
            fledCombat: false,
            willing: true,
            recruitReady: true,
            droppedOffCompanion: true,
            strandedAfterFlee: true,
            lastFledAt: {
                day: Number(app.dayCount || 0),
                hour: Number(app.timeHour || 0),
                source: options.source || 'party-flee'
            }
        });
        if (app.partyLeaderId === app._unitSelectionId?.(unit)) app.partyLeaderId = app._unitSelectionId?.(app.player);
        app._normalizeExplorationSelections?.();
        return this.placeAtFleeDestination(app, unit, destination);
    },

    retreatPartyFromCombat(app, actor = app.player, options = {}) {
        const destination = options.destination || this.fleeDestination(app, actor, { ...options, safeOnly: true });
        if (!destination) return null;
        const sourceTile = app._currentExplorationTile?.();
        if (sourceTile) {
            sourceTile.creatures = app._tileCreatures?.(app.creatures || []) || [...(app.creatures || [])];
            app._persistCurrentExplorationTile?.(sourceTile);
        }
        if (app.inInterior) {
            app.interiorLocation = { x: destination.to.x, y: destination.to.y };
        } else {
            app.location = { x: destination.to.x, y: destination.to.y };
            destination.tile.seen = true;
            destination.tile.explored = true;
            app.persistTileDelta?.(destination.tile.x, destination.tile.y, destination.tile);
            const coords = typeof document !== 'undefined' ? document.getElementById?.('coords') : null;
            if (coords) coords.textContent = `${app.location.x}, ${app.location.y}`;
        }
        app.creatures = app._tileCreatures?.(destination.tile?.creatures || []) || [...(destination.tile?.creatures || [])];
        app.party.forEach(unit => { unit.fledCombat = false; });
        app.clearTileBoundExplorationTargets?.();
        app._clearTileEvents?.();
        app.clearToasts?.({ reason: 'combat-flee' });
        return {
            interior: Boolean(app.inInterior),
            x: destination.to.x,
            y: destination.to.y,
            direction: destination.direction,
            tile: destination.tile
        };
    }
};

if (typeof window !== 'undefined') {
    window.YAW_WORLD_STATE = YAW_WORLD_STATE;
}
