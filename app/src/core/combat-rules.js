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

    sameCombatSide(app, a, b) {
        if (!app || !a || !b) return false;
        const aParty = app.party?.includes?.(a);
        const bParty = app.party?.includes?.(b);
        if (aParty || bParty) return Boolean(aParty && bParty);
        return app.creatures?.includes?.(a) && app.creatures?.includes?.(b);
    },

    sideUnitsFor(app, unit) {
        if (!app || !unit) return [];
        if (app.party?.includes?.(unit)) return app.party || [];
        if (app.creatures?.includes?.(unit)) return app.creatures || [];
        return [];
    },

    isAbleFrontBlocker(app, unit, protectedUnit = null) {
        if (!unit || unit === protectedUnit) return false;
        if (unit.CPun <= 0 || unit.knockedOut || unit.fledCombat) return false;
        if (unit.disposition === app?.DISPOSITION?.CORPSE || unit.corpse || unit.isRemains) return false;
        if (unit.combatRow !== 'front') return false;
        const status = unit.status || {};
        if (status.stunned || status.frozen || status.asleep || status.recovering || status.restrainedSkip) return false;
        if (status.freeze?.turns > 0 || status.sleep?.turns > 0 || status.stun?.turns > 0) return false;
        return true;
    },

    livingFrontBlockers(app, target) {
        if (!target) return [];
        return this.sideUnitsFor(app, target).filter(unit => this.isAbleFrontBlocker(app, unit, target));
    },

    isBackRowProtected(app, target) {
        return Boolean(target && target.combatRow === 'back' && this.livingFrontBlockers(app, target).length > 0);
    },

    isBackRowExposed(app, target) {
        return Boolean(target && target.combatRow === 'back' && this.livingFrontBlockers(app, target).length === 0);
    },

    isPhysicalCombatAction(action) {
        const base = String(action || '').replace(/^sync_/, '');
        return base === 'fight' || base === 'feast';
    },

    isReachSensitiveCombatAction(action) {
        const base = String(action || '').replace(/^sync_/, '');
        return base === 'fight' || base === 'feast' || base === 'fuck';
    },

    hasSpecialReachAccess(actor, action = 'fight') {
        const base = String(action || '').replace(/^sync_/, '');
        return Boolean(actor?.specialReach
            || actor?.reach
            || actor?.reachAccess
            || actor?.snareReach
            || actor?.grabReach
            || actor?.sizeReach
            || actor?.combatReachProfiles?.[base] === 'special'
            || actor?.reachProfiles?.[base] === 'special');
    },

    hasContactPermission(actor, target = null, action = 'feast') {
        if (this.hasSpecialReachAccess(actor, action)) return true;
        if (actor?.contactReach || actor?.contactPermission) return true;
        if (target?.status?.snared || target?.status?.grabbed || target?.status?.restrained) return true;
        return false;
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
        if (base === 'fuck') return 'contact';
        if (base === 'flirt') return 'social';
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
            action: base,
            protectedBackRow: false,
            exposedBackRow: false
        };
        if (!result.canAttempt) {
            result.reason = 'invalid-target';
            return result;
        }
        if (profile === 'social' || profile === 'support' || profile === 'none' || !this.isReachSensitiveCombatAction(base)) {
            result.canSucceed = true;
            return result;
        }
        if (profile === 'hybrid' || profile === 'special') {
            result.canSucceed = true;
            return result;
        }
        if (profile === 'ranged') {
            if (actor?.combatRow !== 'back') {
                result.reason = 'ranged-needs-back-row';
                result.counterplay = 'retreat';
                return result;
            }
            if (target?.combatRow === 'front' && !target?.flying && !this.hasSpecialReachAccess(actor, base)) {
                result.reason = 'ranged-front-row-limited';
                result.counterplay = 'target-back-row-or-advance';
                return result;
            }
            result.canSucceed = true;
            return result;
        }
        if (profile === 'contact' || base === 'feast') {
            const hasContactAccess = this.hasContactPermission(actor, target, base);
            if (actor?.combatRow === 'back' && !hasContactAccess) {
                result.reason = 'contact-needs-front-row';
                result.counterplay = 'advance-or-social';
                return result;
            }
            if (target?.combatRow === 'back') {
                result.protectedBackRow = this.isBackRowProtected(app, target);
                result.exposedBackRow = !result.protectedBackRow;
                if (result.protectedBackRow && !hasContactAccess) {
                    result.reason = 'contact-protected-back-row';
                    result.counterplay = 'front-blockers-or-social';
                    return result;
                }
            }
            if (target?.flying && !actor?.antiflying && !actor?.flying && !hasContactAccess) {
                result.reason = 'target-flying-contact';
                result.counterplay = 'flying-or-anti-flying';
                return result;
            }
            result.canSucceed = true;
            return result;
        }
        if (profile === 'melee' && actor?.combatRow === 'back' && !this.hasSpecialReachAccess(actor, base)) {
            result.reason = 'melee-needs-front-row';
            result.counterplay = 'advance-or-social';
            return result;
        }
        if (target?.combatRow === 'back' && !actor?.flying && !actor?.ranged && !this.hasSpecialReachAccess(actor, base)) {
            result.protectedBackRow = this.isBackRowProtected(app, target);
            result.exposedBackRow = !result.protectedBackRow;
            if (result.protectedBackRow) {
                result.reason = 'target-protected-back-row';
                result.counterplay = 'front-blockers-ranged-flying-social';
                return result;
            }
        }
        if (target?.flying && !actor?.flying && !actor?.ranged && !actor?.antiflying && !this.hasSpecialReachAccess(actor, base)) {
            result.reason = 'target-flying';
            result.counterplay = 'flying-ranged-anti-flying';
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
        if (reason === 'target-protected-back-row' || reason === 'target-back-row') {
            return app._label('combat.reachFail.protectedBackRow', '{actors} cannot use {action} on {target}: front-row blockers protect the back row. Use ranged or flying reach, clear the front row, or try a social action.', {
                actors: actorText,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'contact-protected-back-row' || reason === 'contact-back-row') {
            return app._label('combat.reachFail.contactProtectedBackRow', '{actors} cannot use {action} on {target}: close contact cannot reach a protected back-row target.', {
                actors: actorText,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'melee-needs-front-row') {
            return app._label('combat.reachFail.meleeNeedsFront', '{actors} tries {action} on {target}, but ordinary melee needs the front row. Advance first, use ranged or flying reach, or try a social action.', {
                actors: actorText,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'contact-needs-front-row') {
            return app._label('combat.reachFail.contactNeedsFront', '{actors} tries {action} on {target}, but close contact needs the front row. Advance first or try a social action.', {
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
        if (reason === 'ranged-front-row-limited') {
            return app._label('combat.reachFail.rangedFrontLimited', '{actors} tries {action} on {target}, but this ranged attack is meant for back-row or flying targets. Advance for close pressure, pick a back-row target, or try a social action.', {
                actors: actorText,
                action: actionLabel,
                target: targetName
            });
        }
        return app._label('combat.cannotReachTarget', '{actor} cannot reach {target} from here.', { actor: actorText, target: targetName });
    },

    moveRowIntentLabel(app, actor = null) {
        const row = actor?.combatRow;
        if (row === 'back') return app._label('action.advance', 'Advance');
        if (row === 'front') return app._label('action.retreat', 'Retreat');
        return app._label('action.moveRow', 'Move Row');
    },

    fleeRowModifier(app, actor, enemies = []) {
        if (!actor) return 0;
        if (actor.combatRow === 'back') return 0.1;
        const threatened = actor.combatRow === 'front'
            && (enemies || []).some(enemy => enemy
                && enemy.CPun > 0
                && !enemy.fledCombat
                && enemy.disposition === app?.DISPOSITION?.ENEMY
                && (enemy.combatRow || this.defaultCombatRow(enemy)) === 'front');
        return threatened ? -0.1 : 0;
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
