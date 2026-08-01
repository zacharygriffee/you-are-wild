/**
 * YOU ARE WILD WORLD SCALING V1
 * Deterministic distance, biome, cave-depth, and authored-difficulty profile.
 */

const YAW_WORLD_SCALING = {
    VERSION: 1,

    profile(app, tile = {}, authoredDifficulty = 0) {
        const x = Number(tile.x) || 0;
        const y = Number(tile.y) || 0;
        const distance = Math.max(Math.abs(x), Math.abs(y));
        const biomeDanger = Math.max(0, Math.floor(Number(app?.biomes?.[tile.biome]?.danger) || 0));
        const caveDepth = Math.max(0, Math.floor(Number(
            tile.interior?.depth
            ?? tile.caveDepth
            ?? (tile.terrainTags?.includes?.('cave') || tile.biome === 'cave' ? 1 : 0)
        ) || 0));
        const structureThreat = Math.max(0, Math.floor(Number(app?.STRUCTURES?.[tile.structure]?.threat) || 0));
        const distanceTier = Math.min(5, Math.floor(distance / 8));
        const raw = Math.max(
            1,
            Math.floor(Number(authoredDifficulty) || 0),
            biomeDanger,
            distanceTier + 1,
            caveDepth + 1,
            structureThreat
        );
        const difficulty = Math.max(1, Math.min(5, raw));
        const rewardMultiplier = Number((1 + (difficulty - 1) * 0.2 + Math.min(0.5, distance / 100) + Math.min(0.4, caveDepth * 0.1)).toFixed(2));
        return Object.freeze({
            version: this.VERSION,
            distance,
            distanceTier,
            biomeDanger,
            caveDepth,
            structureThreat,
            authoredDifficulty: Math.max(0, Math.floor(Number(authoredDifficulty) || 0)),
            difficulty,
            rewardMultiplier
        });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_WORLD_SCALING = YAW_WORLD_SCALING;
}
