/**
 * YOU ARE WILD UNIT STATS
 * Shared live stat normalization for unit cards, panels, and save/load flows.
 */

const YAW_UNIT_STATS = {
    coreStats(unit) {
        const source = unit || {};
        const nested = source.stats || {};
        const value = (key, fallback = 10) => source[key] ?? nested[key] ?? fallback;
        return {
            str: value('str'),
            con: value('con'),
            spd: value('spd'),
            int: value('int'),
            wis: value('wis'),
            cha: value('cha')
        };
    },

    displayStats(app, unit) {
        const source = unit || {};
        const base = app._getSpeciesBaseStats(source.species || 'human');
        const core = app._unitCoreStats(source);
        const value = (key, fallback = 0) => source[key] ?? base[key] ?? fallback;
        return {
            CPun: source.CPun ?? source.hp ?? source.MPun ?? source.maxHp ?? base.MPun ?? 100,
            MPun: source.MPun ?? source.maxHp ?? base.MPun ?? 100,
            CPle: source.CPle ?? 0,
            MPle: source.MPle ?? base.MPle ?? 100,
            level: source.level || 1,
            Figh: value('Figh', core.str),
            Feas: value('Feas', 10),
            Flir: value('Flir', core.cha),
            Fuck: value('Fuck', 10),
            Flee: value('Flee', core.spd),
            Feed: value('Feed', 10),
            ...core
        };
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UNIT_STATS = YAW_UNIT_STATS;
}
