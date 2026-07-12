/**
 * YOU ARE WILD COMBAT RESOLUTION
 * Direct combat action resolution after actor, target, and intent are selected.
 */

const YAW_COMBAT_RESOLUTION = {
    reachFailure(app, action, actors = [], target = null, reach = null, options = {}) {
        const actorList = (Array.isArray(actors) ? actors : [actors]).filter(Boolean);
        const result = app._combatReachFailureText?.(actorList, target, action, reach)
            || app._label('combat.cannotReachTarget', '{actor} cannot reach {target} from here.', {
                actor: actorList.map(unit => unit?.name).filter(Boolean).join(', ') || app._label('target.actorRole', 'Actor'),
                target: target?.name || app._label('target.targetRole', 'Target')
            });
        app._pushLog(result, 'combat', {
            actor: actorList[0] || null,
            targetId: target?.id || target?.name,
            targetName: target?.name,
            action,
            phase: 'reach-failure',
            reason: reach?.reason || 'cannot-reach',
            profile: reach?.profile || ''
        });
        app.lastCombatActionResult = { action, actor: actorList[0] || null, actors: actorList, target, result, reach, failedReach: true };
        if (!options.suppressStory) {
            app.emitStoryResult?.({
                mode: 'combat',
                actors: actorList,
                targets: [target].filter(Boolean),
                action,
                resultKind: 'failure',
                tags: ['cannot-reach', 'reach-profile', reach?.reason, reach?.profile].filter(Boolean),
                source: 'combat-resolution'
            }, result, {
                mode: 'combat',
                resultKind: 'failure',
                importance: 'hint',
                tags: ['cannot-reach', 'reach-profile', reach?.reason, reach?.profile].filter(Boolean),
                source: 'combat-resolution'
            });
        }
        return result;
    },

    resolveCommand(app, command) {
        const actor = command?.actors?.[0] || app.activeActor || app._currentCombatActor() || app.player;
        const targets = (command?.targets || []).filter(Boolean);
        const target = targets[0] || null;
        app.targetSelection = null;
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.renderMobileCombatToolbelt();
        if (targets.length > 1 && ['fight', 'flirt', 'fuck', 'feast'].includes(command.action)) {
            let resolved = false;
            const resultLines = [];
            for (const multiTarget of targets) {
                if (!app.combatState?.active) break;
                if (!multiTarget || multiTarget.CPun <= 0 || multiTarget.disposition !== app.DISPOSITION.ENEMY) continue;
                const reach = app._combatReachResult?.(actor, multiTarget, command.action);
                if (reach?.canAttempt && !reach.canSucceed) {
                    resultLines.push(this.reachFailure(app, command.action, [actor], multiTarget, reach, { suppressStory: true }));
                    resolved = true;
                    continue;
                }
                const targetResolved = app.executeActionAgainstTarget(command.action, actor, multiTarget, { advanceTurn: false, suppressStory: true, applyCost: false }) !== false;
                if (targetResolved && app.lastCombatActionResult?.result) resultLines.push(app.lastCombatActionResult.result);
                resolved = targetResolved || resolved;
            }
            if (resolved) {
                app._applyActionCost?.(command.action, actor, target, {}, {
                    mode: 'combat',
                    source: 'combat-multi-target-resolution',
                    emitScene: true,
                    applyCost: command.applyCost
                });
                const targetNames = targets.map(unit => unit?.name).filter(Boolean).join(', ');
                const summary = resultLines.length > 0
                    ? resultLines.join(' ')
                    : app._label('target.multiActionDone', '{name} finishes a multi-target {action} action on {targets}.', {
                        name: actor?.name || app._label('target.actorRole', 'Actor'),
                        action: app._uiLabel(command.action).toLowerCase(),
                        targets: targetNames
                    });
                app.emitStoryResult?.({ ...command, shape: command.shape || 'one-to-many' }, summary, { mode: 'combat' });
            }
            app.renderCombatSceneForTurn(actor);
            app.renderLog();
            app.renderCreatures();
            app.renderParty();
            app._syncCurrentTileCreatures();
            app._sanitizeCombatState({ preserveTurn: true });
            app.autoSave();
            app.nextTurn();
            return resolved;
        }
        return app.executeActionAgainstTarget(command.action, actor, target);
    },

    executeActionAgainstTarget(app, action, actor, target) {
        const options = arguments[4] || {};
        const advanceTurn = options.advanceTurn !== false;
        app.combatState.processing = true;
        try {
            if (!target || !actor || (target.CPun <= 0 && !app._isCorpse(target))) {
                app.combatState.processing = false;
                if (advanceTurn) app.nextTurn();
                return false;
            }
            const actorName = actor.name === app.player?.name ? 'You' : actor.name;
            const actorVerb = actor.name === app.player?.name ? '' : 's';
            let result = '';
            const reach = app._combatReachResult?.(actor, target, action);
            if (reach?.canAttempt && !reach.canSucceed) {
                result = this.reachFailure(app, action, [actor], target, reach, options);
                app.renderCombatSceneForTurn(actor);
                app.renderLog();
                app.renderCreatures();
                app.renderParty();
                app._syncCurrentTileCreatures();
                app._sanitizeCombatState({ preserveTurn: true });
                app.autoSave();
                if (advanceTurn) app.nextTurn();
                return true;
            }
            app._applyActionCost?.(action, actor, target, {}, {
                mode: 'combat',
                source: 'combat-resolution',
                emitScene: true,
                applyCost: options.applyCost
            });
            switch (action) {
            case 'scavenge': {
                const consumed = app._consumeCorpsePortions(target, [actor]);
                if (consumed.length === 0) {
                    result = app._label('corpse.depleted', 'Scavenged');
                } else {
                    const portions = consumed[0].consumed;
                    result = app._label('combat.scavengeRemains', '{actor} uses {count} portion(s) from {target}.', {
                        actor: actorName,
                        target: target.corpseName || target.name,
                        count: portions
                    });
                }
                break;
            }
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
                let charm = app._combatActionRating(actor.Flir + (actor.cha || 10) * 0.5, actor, target, 'player-flirt');
                if (app.settings.sameSpeciesBonus && target.species === actor.species) {
                    charm += 3;
                }
                const resist = (target.wis || 10) + (app._safeRatio(target.CPle, target.MPle) * 10);
                if (charm > resist) {
                    const oldPle = target.CPle;
                    target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.3));
                    target.charmed = (target.charmed || 0) + 1;
                    target.Figh = Math.max(1, (target.Figh || 10) - 1);
                    result = `${actorName} talk${actorVerb} with ${target.name}! Their guard lowers. Spirit rises to ${target.CPle}/${target.MPle}.`;
                    if (target.charmed >= 3) {
                        result += ` ${target.name} is utterly charmed and becomes friendly!`;
                        target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        app._awardCombatXP(app.XP_REWARDS.flirtEnemy);
                    } else if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                        result += ` ${target.name} relaxes and becomes friendly!`;
                        target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        target.orgasmed = true;
                        app._awardCombatXP(app.XP_REWARDS.flirtEnemy);
                    }
                    const breakthrough = app._resolveSpiritThreshold?.(actor, target, action, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else {
                    result = `${target.name} rejects the conversation with ${actorName}!`;
                }
                break;
            }
            case 'fuck': {
                let charm = app._combatActionRating(actor.Fuck + actor.Flir, actor, target, 'player-seduce');
                if (app.settings.sameSpeciesBonus && target.species === actor.species) {
                    charm += 5;
                }
                const resist = (target.wis || 10) + (app._safeRatio(target.CPle, target.MPle) * 10);
                if (charm > resist) {
                    const oldPle = target.CPle;
                    target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                    result = `${actorName} play${actorVerb} with ${target.name}! Spirit rises to ${target.CPle}/${target.MPle}.`;
                    if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                        result += ` ${target.name} relaxes, becoming dazed and friendly!`;
                        target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        target.orgasmed = true;
                        app._awardCombatXP(app.XP_REWARDS.seduceEnemy);
                        if (app.settings.refractoryPeriod) {
                            target.refractory = true;
                            result += ` They need a moment to catch their breath...`;
                        }
                        if (actor.name === app.player?.name) {
                            setTimeout(() => {
                                app._confirmRecruitCreature(target);
                            }, 100);
                        }
                    }
                    const breakthrough = app._resolveSpiritThreshold?.(actor, target, action, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else {
                    result = `${target.name} does not want to play!`;
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
            app.lastCombatActionResult = { action, actor, target, result };
            if (!options.suppressStory) app._emitCombatAction(action, actor, target, result);
            app.renderCombatSceneForTurn(actor);
            app.renderLog();
            app.renderCreatures();
            app.renderParty();
            app._syncCurrentTileCreatures();
            app._sanitizeCombatState({ preserveTurn: true });
            app.autoSave();
            if (advanceTurn) app.nextTurn();
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
