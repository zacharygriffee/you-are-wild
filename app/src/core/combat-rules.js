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
        const base = String(action || '').replace(/^sync_/, '');
        return base === 'fight' || base === 'feast';
    },

    intentReachProfile(_app, actor, action = 'fight') {
        const base = String(action || '').replace(/^sync_/, '');
        const override = actor?.combatReachProfiles?.[base] || actor?.reachProfiles?.[base] || actor?.reachProfile || actor?.fightProfile;
        if (override) return String(override);
        if (base === 'fight') {
            if (actor?.flying || actor?.hybridReach) return 'hybrid';
            if (actor?.ranged) return 'ranged';
            return 'melee';
        }
        if (base === 'feast') return 'contact';
        if (base === 'flirt' || base === 'fuck') return 'social';
        if (base === 'feed') return 'support';
        return 'none';
    },

    reachResult(app, actor, target, action = 'fight') {
        const profile = this.intentReachProfile(app, actor, action);
        const base = String(action || '').replace(/^sync_/, '');
        const result = {
            canAttempt: Boolean(actor && target && target.CPun > 0),
            canSucceed: false,
            reason: '',
            counterplay: '',
            profile,
            action: base
        };
        if (!result.canAttempt) {
            result.reason = 'invalid-target';
            return result;
        }
        if (!this.isPhysicalCombatAction(base)) {
            result.canSucceed = true;
            return result;
        }
        if (profile === 'hybrid') {
            result.canSucceed = true;
            return result;
        }
        if (profile === 'ranged') {
            if (actor?.combatRow !== 'back' && !target?.flying) {
                result.reason = 'ranged-needs-back-row';
                result.counterplay = 'retreat';
                return result;
            }
            result.canSucceed = true;
            return result;
        }
        if (profile === 'contact' || base === 'feast') {
            if (actor?.flying) {
                result.canSucceed = true;
                return result;
            }
            if (target?.flying && !actor?.antiflying) {
                result.reason = 'target-flying-contact';
                result.counterplay = 'flying-or-anti-flying';
                return result;
            }
            if (target?.combatRow === 'back') {
                result.reason = 'contact-back-row';
                result.counterplay = 'front-row-contact';
                return result;
            }
            result.canSucceed = true;
            return result;
        }
        if (target?.flying && !actor?.flying && !actor?.ranged && !actor?.antiflying) {
            result.reason = 'target-flying';
            result.counterplay = 'flying-ranged-anti-flying';
            return result;
        }
        if (target?.combatRow === 'back' && !actor?.flying && !actor?.ranged) {
            result.reason = 'target-back-row';
            result.counterplay = 'flying-ranged-social';
            return result;
        }
        result.canSucceed = true;
        return result;
    },

    canReachCombatTarget(app, actor, target, action = 'fight') {
        return this.reachResult(app, actor, target, action).canSucceed;
    },

    canAttemptCombatTarget(app, actor, target, action = 'fight') {
        return this.reachResult(app, actor, target, action).canAttempt;
    },

    reachFailureText(app, actors = [], target = null, action = 'fight', reach = null) {
        const actorList = (Array.isArray(actors) ? actors : [actors]).filter(Boolean);
        const actorText = actorList.map(unit => unit?.name).filter(Boolean).join(', ') || app._label('target.actorRole', 'Actor');
        const targetName = target?.name || app._label('target.targetRole', 'Target');
        const actionLabel = app._uiLabel ? app._uiLabel(String(action || '').replace(/^sync_/, '')) : String(action || 'action');
        const reason = reach?.reason || 'cannot-reach';
        if (reason === 'target-flying' || reason === 'target-flying-contact') {
            return app._label('combat.reachFail.flying', '{actors} tries {action} on {target}, but {target} stays out of reach in the air. Use flying, ranged, or anti-flying reach.', {
                actors: actorText,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'target-back-row') {
            return app._label('combat.reachFail.backRow', '{actors} tries {action} on {target}, but the back row is beyond ordinary melee reach. Use ranged or flying reach, or try a social action.', {
                actors: actorText,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'contact-back-row') {
            return app._label('combat.reachFail.contactBackRow', '{actors} tries {action} on {target}, but that needs close contact and {target} is in the back row.', {
                actors: actorText,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'ranged-needs-back-row') {
            return app._label('combat.reachFail.rangedNeedsBack', '{actors} tries {action} on {target}, but needs back-row space to use ranged reach.', {
                actors: actorText,
                action: actionLabel,
                target: targetName
            });
        }
        return app._label('combat.cannotReachTarget', '{actor} cannot reach {target} from here.', { actor: actorText, target: targetName });
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
