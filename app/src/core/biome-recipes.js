/**
 * YOU ARE WILD BIOME RECIPE V1
 * Deterministic biome placement recipes applied only when a tile first materializes.
 */

const YAW_BIOME_RECIPES = {
    VERSION: 1,
    MAX_RECIPES: 128,
    MODES: new Set(['boundary', 'procedural', 'placed', 'portal']),
    profiles: new Map(),

    _token(value, label = 'Biome recipe id') {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a bounded token`);
        }
        return token;
    },

    _integer(value, fallback, minimum, maximum, field) {
        const number = value === undefined ? fallback : Number(value);
        if (!Number.isInteger(number) || number < minimum || number > maximum) {
            throw new Error(`Biome recipe ${field} must be an integer from ${minimum} to ${maximum}`);
        }
        return number;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    normalizeProfile(owner, localId, definition = {}) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('Biome recipe definition must be an object');
        }
        const allowed = new Set(['biome', 'mode', 'weight', 'minDistance', 'maxDistance', 'replaces', 'salt']);
        for (const field of Object.keys(definition)) {
            if (!allowed.has(field)) throw new Error(`Biome recipe contains unsupported field ${field}`);
        }
        const normalizedOwner = this._token(owner, 'Biome recipe owner');
        const id = this._token(localId);
        const mode = String(definition.mode || 'boundary');
        if (!this.MODES.has(mode)) throw new Error(`Biome recipe mode must be one of: ${[...this.MODES].join(', ')}`);
        const replaces = definition.replaces === undefined ? [] : definition.replaces;
        if (!Array.isArray(replaces) || replaces.length > 32) throw new Error('Biome recipe replaces must be a bounded array');
        const minDistance = this._integer(definition.minDistance, 0, 0, 1000000, 'minDistance');
        const maxDistance = this._integer(definition.maxDistance, 1000000, minDistance, 1000000, 'maxDistance');
        return this._deepFreeze({
            version: this.VERSION,
            id,
            key: `${normalizedOwner}:${id}`,
            owner: normalizedOwner,
            biome: this._token(definition.biome, 'Biome recipe biome'),
            mode,
            weight: this._integer(definition.weight, 10, 1, 100, 'weight'),
            minDistance,
            maxDistance,
            replaces: [...new Set(replaces.map(value => this._token(value, 'Biome recipe replaces entry')))],
            salt: this._token(definition.salt || id, 'Biome recipe salt')
        });
    },

    register(owner, localId, definition = {}) {
        if (this.profiles.size >= this.MAX_RECIPES) throw new Error('Biome recipe limit reached');
        const profile = this.normalizeProfile(owner, localId, definition);
        if (this.profiles.has(profile.key)) throw new Error(`Biome recipe ${profile.key} is already registered`);
        this.profiles.set(profile.key, profile);
        return profile;
    },

    profile(key) {
        return this.profiles.get(String(key || '')) || null;
    },

    unregisterOwner(owner) {
        const normalizedOwner = this._token(owner, 'Biome recipe owner');
        let removed = 0;
        for (const [key, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== normalizedOwner) continue;
            this.profiles.delete(key);
            removed++;
        }
        return removed;
    },

    _isBoundary(app, tile) {
        if (typeof WorldGen === 'undefined') return false;
        const meta = app.worldMeta;
        const regions = app._regionBiomeKeys();
        return [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => {
            const neighbor = WorldGen.generateBaseTile(meta, tile.x + dx, tile.y + dy, regions);
            return neighbor.biome !== tile.biome;
        });
    },

    apply(app, tile) {
        if (!tile || !app?.biomes) return tile;
        const distance = Math.max(Math.abs(Number(tile.x) || 0), Math.abs(Number(tile.y) || 0));
        const boundary = this._isBoundary(app, tile);
        for (const profile of [...this.profiles.values()].sort((left, right) => left.key.localeCompare(right.key))) {
            if (!app.biomes[profile.biome]) continue;
            if (profile.mode === 'placed' || profile.mode === 'portal') continue;
            if (distance < profile.minDistance || distance > profile.maxDistance) continue;
            if (profile.replaces.length && !profile.replaces.includes(tile.biome)) continue;
            if (profile.mode === 'boundary' && !boundary) continue;
            const roll = app._worldRoll
                ? app._worldRoll(`biome-recipe:${profile.key}`, tile.x, tile.y, profile.salt)
                : 1;
            if (roll >= profile.weight / 100) continue;
            return {
                ...tile,
                biome: profile.biome,
                derivedBiome: profile.biome,
                biomeRecipe: profile.key,
                biomeRecipeMode: profile.mode
            };
        }
        return tile;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_BIOME_RECIPES = YAW_BIOME_RECIPES;
}
