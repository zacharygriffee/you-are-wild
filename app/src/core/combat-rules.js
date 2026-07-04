/**
 * YOU ARE WILD COMBAT RULES
 * Shared terrain, row, reach, and combat math helpers.
 */

const YAW_COMBAT_RULES = {
    currentBiomeId(app) {
        const tile = app.worldMap?.get(`${app.location.x},${app.location.y}`);
        return tile?.biome || app.currentBiome || null;
    },

    isDenseForestBiome(biomeId = null) {
        return biomeId === 'forest' || biomeId === 'jungle' || biomeId === 'grove';
    },

    terrainSpeedModifier(app, unit, biomeId = this.currentBiomeId(app)) {
        let mod = 0;
        if (biomeId === 'water') mod += unit?.swimming ? 2 : -2;
        if (this.isDenseForestBiome(biomeId)) mod -= 2;
        return mod;
    },

    terrainConModifier(_app, _unit, biomeId = null) {
        return this.isDenseForestBiome(biomeId) ? 2 : 0;
    },

    effectiveSpeed(app, unit) {
        const frozenSlow = unit?.status?.freeze?.slowTurns > 0 ? -2 : 0;
        return Math.max(1, (unit?.spd || 10) + this.terrainSpeedModifier(app, unit) + frozenSlow);
    },

    effectiveCon(app, unit) {
        return Math.max(1, (unit?.con || 10) + this.terrainConModifier(app, unit, this.currentBiomeId(app)));
    },

    safeRatio(current, max, fallback = 0) {
        const numerator = Number(current);
        const denominator = Number(max);
        if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return fallback;
        return numerator / denominator;
    },

    defaultCombatRow(unit) {
        return unit?.flying || unit?.ranged ? 'back' : 'front';
    },

    assignCombatRows(app, units) {
        for (const unit of units) {
            if (!unit || unit.CPun <= 0) continue;
            if (unit.combatRow !== 'front' && unit.combatRow !== 'back') {
                unit.combatRow = this.defaultCombatRow(unit);
            }
        }
    },

    isPhysicalCombatAction(action) {
        return action === 'fight' || action === 'feast';
    },

    canReachCombatTarget(app, actor, target, action = 'fight') {
        if (!actor || !target || target.CPun <= 0) return false;
        if (!this.isPhysicalCombatAction(action)) return true;
        if (target.flying && !actor.flying && !actor.ranged && !actor.antiflying) return false;
        if (target.combatRow !== 'back') return true;
        return Boolean(actor.flying || actor.ranged || actor.antiflying);
    },

    terrainCausesMiss(app, actor, target, action = 'fight') {
        if (!this.isPhysicalCombatAction(action)) return false;
        if (this.currentBiomeId(app) === 'cave'
            && !actor?.darkvision
            && app._combatStateRoll('combat-terrain-miss', actor, `${app._unitSelectionId(target)}:${action}`) < 0.5) {
            app.log.push({ text: `${actor.name} loses the target in the cave darkness!`, type: 'combat' });
            return true;
        }
        return false;
    },

    applyTerrainRoundEffects(app, living) {
        if (this.currentBiomeId(app) !== 'swamp') return;
        for (const unit of living) {
            if (!unit || unit.CPun <= 0 || unit.flying || unit.status?.stuck) continue;
            if (app._combatStateRoll('combat-terrain-stuck', unit, 'round-effect') < 0.2) {
                unit.status = unit.status || {};
                unit.status.stuck = { turns: 1 };
            }
        }
    },

    physicalDamageMultiplier(_app, actor, target) {
        let mult = 1;
        if (actor?.flying && target?.combatRow === 'back') mult += 0.2;
        if (actor?.combatRow === 'back' && target?.combatRow === 'front' && (actor.ranged || actor.antiflying)) mult -= 0.1;
        return Math.max(0.5, mult);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_RULES = YAW_COMBAT_RULES;
}
