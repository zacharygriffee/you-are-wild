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

    preferredCombatRow(app, unit) {
        const preference = app?.party?.includes?.(unit)
            ? (app?._getCompanionBehavior?.(unit)?.preferredRow || unit?.preferredCombatRow || 'auto')
            : 'auto';
        if (preference === 'front' || preference === 'back') return preference;
        return this.defaultCombatRow(unit);
    },

    prepareCombatRows(app, units) {
        for (const unit of units || []) {
            if (!unit) continue;
            // A saved preference controls the opening position for every fresh
            // encounter. Mid-combat Advance/Retreat remains tactical state and
            // is never written back as the preference.
            if (app?.party?.includes?.(unit)) {
                unit.combatRow = this.preferredCombatRow(app, unit);
            }
        }
        return this.assignCombatRows(app, units);
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
        if (status.stunned || status.frozen || (app?._sleepSystemEnabled?.() && status.asleep) || status.recovering || status.restrainedSkip) return false;
        if (status.freeze?.turns > 0 || (app?._sleepSystemEnabled?.() && status.sleep?.turns > 0) || status.stun?.turns > 0) return false;
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

    intentReachProfile(_app, actor, action = 'fight', options = {}) {
        const base = String(action || '').replace(/^sync_/, '');
        if (base === 'fight' && options.techniqueKey && typeof YAW_COMBAT_TECHNIQUES !== 'undefined') {
            const techniqueReach = YAW_COMBAT_TECHNIQUES.reachProfile(_app, actor, options.techniqueKey);
            if (techniqueReach) return techniqueReach;
        }
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

    reachResult(app, actor, target, action = 'fight', options = {}) {
        const profile = this.intentReachProfile(app, actor, action, options);
        const base = String(action || '').replace(/^sync_/, '');
        const sameSide = this.sameCombatSide(app, actor, target);
        const result = {
            canAttempt: Boolean(actor && target && target.CPun > 0),
            canSucceed: false,
            reason: '',
            counterplay: '',
            profile,
            action: base,
            protectedBackRow: false,
            exposedBackRow: false,
            sameSide
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
            result.canSucceed = true;
            return result;
        }
        if (profile === 'contact' || base === 'feast') {
            const hasContactAccess = this.hasContactPermission(actor, target, base);
            if (!sameSide && actor?.combatRow === 'back' && !hasContactAccess) {
                result.reason = 'contact-needs-front-row';
                result.counterplay = 'advance-or-social';
                return result;
            }
            if (!sameSide && target?.combatRow === 'back') {
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
        if (!sameSide && profile === 'melee' && actor?.combatRow === 'back' && !this.hasSpecialReachAccess(actor, base)) {
            result.reason = 'melee-needs-front-row';
            result.counterplay = 'advance-or-social';
            return result;
        }
        if (!sameSide && target?.combatRow === 'back' && !actor?.flying && !actor?.ranged && !this.hasSpecialReachAccess(actor, base)) {
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

    canReachCombatTarget(app, actor, target, action = 'fight', options = {}) {
        return this.reachResult(app, actor, target, action, options).canSucceed;
    },

    canAttemptCombatTarget(app, actor, target, action = 'fight', options = {}) {
        return this.reachResult(app, actor, target, action, options).canAttempt;
    },

    reachFailureText(app, actors = [], target = null, action = 'fight', reach = null) {
        const actorList = (Array.isArray(actors) ? actors : [actors]).filter(Boolean);
        const actorText = actorList.map(unit => unit?.name).filter(Boolean).join(', ') || app._label('target.actorRole', 'Actor');
        const targetName = target?.name || app._label('target.targetRole', 'Target');
        const actionLabel = app._uiLabel ? app._uiLabel(String(action || '').replace(/^sync_/, '')) : String(action || 'action');
        // Interface language is content policy state, not a combat setting. Reading
        // it here keeps dynamically switched locales grammatically correct without
        // requiring a combat-state rebuild.
        const language = typeof CONTENT !== 'undefined'
            ? CONTENT?.preferences?.language
            : app.settings?.language;
        const attemptVerb = language === 'es'
            ? (actorList.length === 1 ? 'intenta' : 'intentan')
            : (actorList.length === 1 ? 'tries' : 'try');
        const reason = reach?.reason || 'cannot-reach';
        if (reason === 'target-flying-contact') {
            return app._label('combat.reachFail.flyingContact', '{actors} {attemptVerb} {action} on {target}, but close contact cannot reach {target} in the air. Use flying, anti-flying, or explicit contact reach.', {
                actors: actorText,
                attemptVerb,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'target-flying') {
            return app._label('combat.reachFail.flying', '{actors} {attemptVerb} {action} on {target}, but {target} stays out of reach in the air. Use flying, ranged, or anti-flying reach.', {
                actors: actorText,
                attemptVerb,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'target-protected-back-row' || reason === 'target-back-row') {
            return app._label('combat.reachFail.protectedBackRow', '{actors} {attemptVerb} {action} on {target}, but the front row closes ranks and keeps {target} out of reach. Open the front line, use ranged or flying reach, or try a social action.', {
                actors: actorText,
                attemptVerb,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'contact-protected-back-row' || reason === 'contact-back-row') {
            return app._label('combat.reachFail.contactProtectedBackRow', '{actors} {attemptVerb} {action} on {target}, but the front row blocks every path to close contact.', {
                actors: actorText,
                attemptVerb,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'melee-needs-front-row') {
            return app._label('combat.reachFail.meleeNeedsFront', '{actors} {attemptVerb} {action} on {target}, but ordinary melee needs the front row. Advance first, use ranged or flying reach, or try a social action.', {
                actors: actorText,
                attemptVerb,
                action: actionLabel,
                target: targetName
            });
        }
        if (reason === 'contact-needs-front-row') {
            return app._label('combat.reachFail.contactNeedsFront', '{actors} {attemptVerb} {action} on {target}, but close contact needs the front row. Advance first or try a social action.', {
                actors: actorText,
                attemptVerb,
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
            app.log.push({ text: app._label('combat.terrain.caveMiss', '{name} loses the target in the cave darkness!', { name: actor.name }), type: 'combat' });
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
                unit.status.stuck = { turns: 1, source: 'combat' };
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
