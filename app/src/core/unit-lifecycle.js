/**
 * YOU ARE WILD UNIT LIFECYCLE
 * Shared predicates and lookup helpers for living units, remains, and save references.
 */

const YAW_UNIT_LIFECYCLE = {
    isCorpse(app, unit) {
        return unit?.disposition === app.DISPOSITION.CORPSE;
    },

    isLiving(app, unit) {
        return Boolean(unit && !this.isCorpse(app, unit) && unit.CPun > 0);
    },

    livingEnemies(app, list = app.creatures) {
        return (list || []).filter(unit => unit.disposition === app.DISPOSITION.ENEMY && this.isLiving(app, unit));
    },

    isCombatQueueUnitValid(app, unit) {
        if (!unit || unit.CPun <= 0 || unit.knockedOut || unit.fledCombat || this.isCorpse(app, unit)) return false;
        if ((app.party || []).includes(unit)) return true;
        return (app.creatures || []).includes(unit) && unit.disposition === app.DISPOSITION.ENEMY;
    },

    tileCreatures(app, list = []) {
        return (list || []).filter(unit => this.isCorpse(app, unit) || unit.CPun > 0);
    },

    saveRef(unit) {
        return unit ? String(unit.id || unit.name || '') : '';
    },

    findBySaveRef(app, ref) {
        const key = String(ref || '');
        if (!key) return null;
        return [...(app.party || []), ...(app.creatures || [])].find(unit => this.saveRef(unit) === key || String(unit.name || '') === key) || null;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UNIT_LIFECYCLE = YAW_UNIT_LIFECYCLE;
}
