/**
 * YOU ARE WILD COMBAT RESOLUTION
 * Direct combat action resolution after actor, target, and intent are selected.
 */

const YAW_COMBAT_RESOLUTION = {
    executeActionAgainstTarget(app, action, actor, target) {
        app.combatState.processing = true;
        try {
            if (!target || target.CPun <= 0 || !actor) { app.combatState.processing = false; app.nextTurn(); return false; }
            const actorName = actor.name === app.player?.name ? 'You' : actor.name;
            const actorVerb = actor.name === app.player?.name ? '' : 's';
            let result = '';
            switch (action) {
            case 'fight': {
                if (app._terrainCausesMiss(actor, target, action)) {
                    result = `${actorName} miss${actorVerb} ${target.name}.`;
                    break;
                }
                const ar = app._combatActionRating(actor.Figh, actor, target, 'player-fight');
                const def = app._effectiveCon(target);
                const baseDmg = Math.max(1, ar - def * 0.3 + app._combatDamageVariance(actor, target, 'player-fight'));
                const dmg = Math.max(1, Math.floor(baseDmg * app._physicalDamageMultiplier(actor, target)));
                target.CPun -= dmg;
                app._wakeOnDamage(target);
                app._applyAttackStatus(actor, target, dmg);
                result = `${actorName} hit${actorVerb} ${target.name} for ${dmg} punishment!`;
                if (target.CPun <= 0) {
                    result += ` ${target.name} collapses!`;
                    app._awardCombatXP(app.XP_REWARDS.defeatEnemy);
                    if (app.settings.endoMode) { target.CPun = 1; target.disposition = app.DISPOSITION.FRIENDLY; }
                    else app._makeCorpse(target, 'fight');
                }
                break;
            }
            case 'flirt': {
                let charm = app._AR(actor.Flir + (actor.cha || 10) * 0.5);
                if (app.settings.sameSpeciesBonus && target.species === actor.species) {
                    charm += 3;
                }
                const resist = (target.wis || 10) + (app._safeRatio(target.CPle, target.MPle) * 10);
                if (charm > resist) {
                    const oldPle = target.CPle;
                    target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.3));
                    target.charmed = (target.charmed || 0) + 1;
                    target.Figh = Math.max(1, (target.Figh || 10) - 1);
                    result = `${actorName} flirt${actorVerb} with ${target.name}! Their guard lowers. Pleasure rises to ${target.CPle}/${target.MPle}.`;
                    if (target.charmed >= 3) {
                        result += ` ${target.name} is utterly charmed and becomes friendly!`;
                        target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        app._awardCombatXP(app.XP_REWARDS.flirtEnemy);
                    } else if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                        result += ` ${target.name} is aroused and submits!`;
                        target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        target.orgasmed = true;
                        app._awardCombatXP(app.XP_REWARDS.flirtEnemy);
                    }
                } else {
                    result = `${target.name} rebuffs ${actorName}'s flirtation!`;
                }
                break;
            }
            case 'fuck': {
                let charm = app._AR(actor.Fuck + actor.Flir);
                if (app.settings.sameSpeciesBonus && target.species === actor.species) {
                    charm += 5;
                }
                const resist = (target.wis || 10) + (app._safeRatio(target.CPle, target.MPle) * 10);
                if (charm > resist) {
                    const oldPle = target.CPle;
                    target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                    result = `${actorName} seduce${actorVerb} ${target.name}! Pleasure rises to ${target.CPle}/${target.MPle}.`;
                    if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                        result += ` ${target.name} orgasms, becoming dazed and submissive!`;
                        target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        target.orgasmed = true;
                        app._awardCombatXP(app.XP_REWARDS.seduceEnemy);
                        if (app.settings.refractoryPeriod) {
                            target.refractory = true;
                            result += ` They need a moment to recover...`;
                        }
                        if (actor.name === app.player?.name) {
                            setTimeout(() => {
                                app._confirmRecruitCreature(target);
                            }, 100);
                        }
                    }
                } else {
                    result = `${target.name} resists your advances!`;
                }
                break;
            }
            case 'feed': {
                const healAmount = Math.floor((actor.Feed || 10) * 2);
                actor.CPun = Math.min(actor.MPun, actor.CPun + healAmount);
                actor.hunger = Math.max(0, (actor.hunger || 0) - 25);
                result = `${actorName} nourish${actorVerb} themself, restoring ${healAmount} punishment and sating hunger.`;
                app._awardCombatXP(app.XP_REWARDS.feedAlly);
                break;
            }
            case 'feast': {
                const subId = app._getDefaultSubAction('feast');
                result = app._doSubAction('feast', subId, actor, target, actorName, actorVerb);
                app._emitSubAction('feast', subId, actor, target, result);
                break;
            }
            }
            app._pushLog(result, 'combat', { actor, targetId: target.id || target.name, targetName: target.name, action, phase: 'action' });
            app._emitCombatAction(action, actor, target, result);
            app.renderCombatSceneForTurn(actor);
            app.renderLog();
            app.renderCreatures();
            app.renderParty();
            app._syncCurrentTileCreatures();
            app._sanitizeCombatState({ preserveTurn: true });
            app.autoSave();
            app.nextTurn();
            return true;
        } catch (e) {
            console.error('Combat action failed:', e);
            app._pushLog(app._label('combat.actionFailed', 'Combat action failed. Try another action.'), 'combat', { actor, targetId: target?.id || target?.name, targetName: target?.name, action, phase: 'error' });
            app.renderLog();
            app.renderCreatures();
            app.renderParty();
            return false;
        } finally {
            if (app.combatState) app.combatState.processing = false;
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_RESOLUTION = YAW_COMBAT_RESOLUTION;
}
