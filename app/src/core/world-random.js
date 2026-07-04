/**
 * YOU ARE WILD WORLD RANDOM
 * Deterministic world-scoped rolls, chances, weighted picks, and stable ID tokens.
 */

const YAW_WORLD_RANDOM = {
    weightedPick(table) {
        if (!table || table.length === 0) return 'bunny';
        if (typeof table[0] === 'string') return table[Math.floor(Math.random() * table.length)];
        const total = table.reduce((sum, entry) => sum + (entry.weight || 10), 0);
        let roll = Math.random() * total;
        for (const entry of table) {
            roll -= (entry.weight || 10);
            if (roll <= 0) return entry.id;
        }
        return table[0].id;
    },

    roll(app, namespace, x = 0, y = 0, ...parts) {
        if (typeof WorldGen === 'undefined') return Math.random();
        return WorldGen.hash01(app._mapSeed(), app.worldMeta?.generatorVersion || 1, namespace, x, y, ...parts);
    },

    chance(app, namespace, x, y, probability, ...parts) {
        return this.roll(app, namespace, x, y, ...parts) < Math.max(0, Math.min(1, probability || 0));
    },

    weightedPickWorld(app, table, namespace, x, y, ...parts) {
        if (!table || table.length === 0) return 'bunny';
        if (typeof WorldGen === 'undefined') return this.weightedPick(table);
        const entries = table.map(entry => typeof entry === 'string'
            ? { id: entry, weight: 1 }
            : { id: entry.id, weight: entry.weight || 10 });
        return WorldGen.pickWeighted(app._mapSeed(), app.worldMeta?.generatorVersion || 1, namespace, x, y, entries) || entries[0]?.id || 'bunny';
    },

    pickList(app, items, namespace, x = 0, y = 0, ...parts) {
        if (!Array.isArray(items) || items.length === 0) return null;
        const index = Math.floor(this.roll(app, namespace, x, y, ...parts) * items.length) % items.length;
        return items[index];
    },

    stableIdPart(value, fallback = 'item') {
        const raw = String(value ?? fallback).toLowerCase();
        return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_WORLD_RANDOM = YAW_WORLD_RANDOM;
}
