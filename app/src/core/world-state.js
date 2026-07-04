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

    defaultWorldMeta() {
        return { worldId: 'world_legacy', seed: 'default', generatorVersion: 1, mapModsHash: 'legacy' };
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

    getBaseTile(app, x, y) {
        const generated = typeof WorldGen !== 'undefined'
            ? WorldGen.generateBaseTile(app.worldMeta, x, y, app._regionBiomeKeys())
            : { biome: 'plains', baseBiome: 'plains', macroBiome: 'plains', elevation: 0.5, moisture: 0.5, heat: 0.5, fertility: 0.5, dangerPressure: 0.3, regionCell: null, terrainTags: [] };
        return { x, y, ...generated, explored: false, description: '', hasLandmark: false, landmarkName: '', hostile: false, creatures: [], items: [], structure: null, structureSpawned: false };
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
        return tile;
    },

    tileDeltaFromEffectiveTile(app, tile) {
        if (!tile) return null;
        const base = app.getBaseTile(tile.x, tile.y);
        const delta = {};
        const fields = ['biome', 'explored', 'description', 'hasLandmark', 'landmarkName', 'hostile', 'creatures', 'items', 'structure', 'structureSpawned', 'structureLooted', 'resourceSearched', 'interior', 'tag', 'name', 'color'];
        for (const field of fields) {
            const value = tile[field];
            const baseValue = base[field];
            const changed = JSON.stringify(value ?? null) !== JSON.stringify(baseValue ?? null);
            if (changed) delta[field] = app._cloneTileValue(value);
        }
        return Object.keys(delta).length ? delta : null;
    },

    persistTileDelta(app, x, y, tile = null) {
        const key = app._tileKey(x, y);
        const effective = tile || app.worldMap.get(key);
        const delta = app._tileDeltaFromEffectiveTile(effective);
        if (delta) app.tileDeltas.set(key, delta);
        else app.tileDeltas.delete(key);
        return delta;
    },

    persistAllTileDeltas(app) {
        if (!app.tileDeltas) app.tileDeltas = new Map();
        app._syncCurrentTileCreatures();
        for (const tile of app.worldMap.values()) {
            app.persistTileDelta(tile.x, tile.y, tile);
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

    getTile(app, x, y) {
        const key = app._tileKey(x, y);
        if (app.worldMap.has(key)) return app.worldMap.get(key);
        const tile = app.applyTileDelta(app.getBaseTile(x, y), app.getTileDelta(x, y));
        app.worldMap.set(key, tile);
        return tile;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_WORLD_STATE = YAW_WORLD_STATE;
}
