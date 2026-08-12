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
        const valid = app._validateInteractionCommand?.(command) || { ok: true };
        if (!valid.ok) {
            app._reportInvalidCombatCommand?.(command, valid.reason);
            return false;
        }
        const baseAction = String(command.action || '').replace(/^sync_/, '');
        if (baseAction === 'fight' && command.subAction && typeof YAW_COMBAT_TECHNIQUES !== 'undefined') {
            const selectedTechnique = YAW_COMBAT_TECHNIQUES.selected(app, command.actors || [actor], command.subAction, Math.max(1, targets.length));
            if (selectedTechnique === false) {
                app._reportInvalidCombatCommand?.(command, 'invalid-combat-technique');
                return false;
            }
        }
        app.targetSelection = null;
        app._clearCombatMarkedTargets?.();
        app.renderMobileCombatToolbelt();
        if (targets.length > 1 && ['fight', 'flirt', 'fuck', 'feast'].includes(command.action)) {
            let resolved = false;
            let meaningfulAttempt = false;
            const resultLines = [];
            const spreadAction = command.action === 'fight'
                ? 'fight'
                : (command.action === 'feast' && command.subAction === 'chew' ? 'chew' : null);
            const multiEffect = spreadAction
                ? app._multiInteractionEffect?.(actor, spreadAction, targets.length, { techniqueKey: command.subAction })
                : null;
            const spreadText = spreadAction
                ? app._multiInteractionOutcomeText?.(spreadAction, [actor], targets)
                : '';
            for (const multiTarget of targets) {
                if (!app.combatState?.active) break;
                if (!multiTarget || multiTarget.CPun <= 0) continue;
                const reach = app._combatReachResult?.(actor, multiTarget, command.action, { techniqueKey: command.subAction });
                if (reach?.canAttempt && !reach.canSucceed) {
                    resultLines.push(this.reachFailure(app, command.action, [actor], multiTarget, reach, { suppressStory: true }));
                    resolved = true;
                    continue;
                }
                const targetResolved = app.executeActionAgainstTarget(command.action, actor, multiTarget, {
                    advanceTurn: false,
                    suppressStory: true,
                    applyCost: false,
                    multiEffect,
                    subAction: command.subAction || null
                }) !== false;
                if (targetResolved && app.lastCombatActionResult?.result) resultLines.push(app.lastCombatActionResult.result);
                meaningfulAttempt = targetResolved || meaningfulAttempt;
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
                let summary = resultLines.length > 0
                    ? resultLines.join(' ')
                    : app._label('target.multiActionDone', '{name} finishes a multi-target {action} action on {targets}.', {
                        name: actor?.name || app._label('target.actorRole', 'Actor'),
                        action: app._uiLabel(command.action).toLowerCase(),
                        targets: targetNames
                    });
                if (spreadText) summary += ` ${spreadText}`;
                app.emitStoryResult?.({ ...command, shape: command.shape || 'one-to-many' }, summary, { mode: 'combat' });
                if (spreadAction) {
                    app._awardMultiInteractionPractice?.([actor], spreadAction, targets, { success: meaningfulAttempt });
                }
            }
            app.renderCombatSceneForTurn(actor);
            app.renderLog();
            app.renderCreatures();
            app.renderParty();
            app._syncCurrentTileCreatures();
            app._sanitizeCombatState({ preserveTurn: true });
            app.markAutoSaveDirty?.(['manifest', 'party', 'currentTile', 'combat', 'quests', 'sceneFeed', 'activityLog'], 'combat-multi-target');
            app.autoSave();
            app.nextTurn();
            return resolved;
        }
        return app.executeActionAgainstTarget(command.action, actor, target, {
            subAction: command.subAction || null,
            semanticApproach: command.metadata?.semanticApproach || null
        });
    },

    executeActionAgainstTarget(app, action, actor, target) {
        const options = arguments[4] || {};
        const advanceTurn = options.advanceTurn !== false;
        // Direct resolvers are also used by the deterministic AI and tests.
        // When repairing an incomplete queue, retain the actor who actually
        // initiated this command until its turn is consumed.
        if (app.combatState?.active && actor) app.activeActor = actor;
        app.combatState.processing = true;
        try {
            if (!target || !actor || (target.CPun <= 0 && !app._isCorpse(target))) {
                app.combatState.processing = false;
                return false;
            }
            const actorIsPlayer = actor === app.player || actor.name === app.player?.name;
            const actorName = actorIsPlayer ? app._label('party.you', 'You') : actor.name;
            const actorVerb = actorIsPlayer ? '' : 's';
            const targetWasParty = app.party.includes(target);
            const careBefore = { CPun: target.CPun, CPle: target.CPle };
            let result = '';
            const reach = app._combatReachResult?.(actor, target, action, { techniqueKey: options.subAction });
            if (reach?.canAttempt && !reach.canSucceed) {
                app._applyActionCost?.(action, actor, target, {}, {
                    mode: 'combat',
                    source: 'combat-reach-failure',
                    emitScene: true,
                    applyCost: options.applyCost
                });
                const result = this.reachFailure(app, action, [actor], target, reach);
                app.lastCombatActionResult = {
                    action,
                    actor,
                    actors: [actor],
                    target,
                    result,
                    reach,
                    failedReach: true,
                    attempted: true
                };
                app.combatCorrectionMessage = null;
                app.renderCombatSceneForTurn(actor);
                app.renderLog();
                app.renderCreatures();
                app.renderParty();
                app._syncCurrentTileCreatures();
                app.markAutoSaveDirty?.(['manifest', 'party', 'currentTile', 'combat', 'sceneFeed', 'activityLog'], 'combat-reach-failure');
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
                const technique = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                    ? YAW_COMBAT_TECHNIQUES.selected(app, [actor], options.subAction || 'basic', 1)
                    : null;
                if (technique === false) {
                    result = app._label('combat.technique.unavailableAtResolution', '{actor} can no longer use that combat technique.', { actor: actorName });
                    break;
                }
                if (app._terrainCausesMiss(actor, target, action)) {
                    result = app._label(actorIsPlayer ? 'combat.action.fightMiss.player' : 'combat.action.fightMiss.named', actorIsPlayer
                        ? '{actor} miss {target}.'
                        : '{actor} misses {target}.', {
                        actor: actorName,
                        target: target.name
                    });
                    break;
                }
                const actorCanCounterFlight = actor.ranged || actor.antiflying;
                const targetDodge = target.flying && !actorCanCounterFlight
                    ? 0.5
                    : (target.swimming && !actor.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
                if (targetDodge > 0 && app._targetDodgeRoll(actor, target, 'fight') < targetDodge) {
                    result = app._label('combat.allyAttackDodged', "{target} dodges {ally}'s attack!", {
                        target: target.name,
                        ally: actorName
                    });
                    break;
                }
                const ar = app._combatActionRating(actor.Figh, actor, target, 'player-fight');
                const def = app._effectiveCon(target);
                const baseDmg = Math.max(1, ar - def * 0.3 + app._combatDamageVariance(actor, target, 'player-fight'));
                const unscaledDmg = Math.max(1, Math.floor(baseDmg * app._physicalDamageMultiplier(actor, target)));
                const techniqueDamage = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                    ? YAW_COMBAT_TECHNIQUES.damageValue(unscaledDmg, technique)
                    : unscaledDmg;
                const dmg = options.multiEffect
                    ? app._multiInteractionScaleValue(techniqueDamage, options.multiEffect)
                    : techniqueDamage;
                target.CPun -= dmg;
                app._wakeOnDamage(target);
                app._applyAttackStatus(actor, target, dmg);
                const techniqueStatus = technique ? app._applyTechniqueStatus?.(actor, target, technique, dmg) : false;
                result = technique
                    ? app._label('combat.action.techniqueHit', '{actor} uses {technique} on {target} for {amount} punishment!', {
                        actor: actorName,
                        technique: YAW_COMBAT_TECHNIQUES.label(app, technique),
                        target: target.name,
                        amount: dmg
                    })
                    : app._label(actorIsPlayer ? 'combat.action.fightHit.player' : 'combat.action.fightHit.named', actorIsPlayer
                        ? '{actor} hit {target} for {amount} punishment!'
                        : '{actor} hits {target} for {amount} punishment!', {
                        actor: actorName,
                        target: target.name,
                        amount: dmg
                    });
                if (techniqueStatus) {
                    result += ` ${app._label('combat.action.techniqueStatus', '{target} is affected by {status}.', {
                        target: target.name,
                        status: YAW_COMBAT_TECHNIQUES.statusLabel(app, technique.status.effect)
                    })}`;
                }
                if (target.CPun <= 0) {
                    result += ` ${app._label('combat.targetCollapses', '{name} collapses!', { name: target.name })}`;
                    if (targetWasParty) {
                        if (target === app.player) app._handlePlayerFall?.({ cause: 'party-combat-damage', source: 'combat-fight' });
                        else app._dropPartyCorpse?.(target, 'fight');
                    } else {
                        app._awardCombatXP(app.XP_REWARDS.defeatEnemy);
                        if (app.settings.powerDynamics) {
                            app._subdueCreature(target, actor, { source: 'combat-fight' });
                            result += ` ${app._label('combat.subduedRecruitable', '{name} yields and may be recruited.', { name: target.name })}`;
                        } else app._makeCorpse(target, 'fight', { actor, source: 'combat-fight' });
                    }
                }
                break;
            }
            case 'flirt': {
                const dancing = options.semanticApproach === 'dance';
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
                    result = dancing
                        ? app._label(actorIsPlayer ? 'combat.action.danceSuccess.player' : 'combat.action.danceSuccess.named', actorIsPlayer
                            ? '{actor} dance with {target}! Their guard lowers. Spirit rises to {current}/{max}.'
                            : '{actor} dances with {target}! Their guard lowers. Spirit rises to {current}/{max}.', {
                            actor: actorName,
                            target: target.name,
                            current: target.CPle,
                            max: target.MPle
                        })
                        : app._mlabel(actorIsPlayer ? 'combat.action.talkSuccess.player' : 'combat.action.talkSuccess.named', actorIsPlayer
                            ? '{actor} talk with {target}! Their guard lowers. Spirit rises to {current}/{max}.'
                            : '{actor} talks with {target}! Their guard lowers. Spirit rises to {current}/{max}.', {
                        actor: actorName,
                        target: target.name,
                        current: target.CPle,
                        max: target.MPle
                    });
                    if (target.charmed >= 3) {
                        result += ` ${app._label(targetWasParty ? 'combat.action.charmedParty' : 'combat.action.charmedFriendly', targetWasParty
                            ? '{target} is utterly charmed!'
                            : '{target} is utterly charmed and becomes friendly!', { target: target.name })}`;
                        if (!targetWasParty) target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        if (!targetWasParty) app._awardCombatXP(app.XP_REWARDS.flirtEnemy);
                    } else if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                        result += ` ${app._label(targetWasParty ? 'combat.action.relaxedParty' : 'combat.action.relaxedFriendly', targetWasParty
                            ? '{target} relaxes completely!'
                            : '{target} relaxes and becomes friendly!', { target: target.name })}`;
                        if (!targetWasParty) target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        target.orgasmed = true;
                        if (!targetWasParty) app._awardCombatXP(app.XP_REWARDS.flirtEnemy);
                    }
                    const breakthrough = targetWasParty ? null : app._resolveSpiritThreshold?.(actor, target, action, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else {
                    result = app._label(dancing ? 'combat.action.danceRejected' : 'combat.action.talkRejected', dancing
                        ? '{target} declines to dance with {actor}!'
                        : '{target} rejects the conversation with {actor}!', {
                        actor: actorName,
                        target: target.name
                    });
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
                    result = app._mlabel(actorIsPlayer ? 'combat.action.playSuccess.player' : 'combat.action.playSuccess.named', actorIsPlayer
                        ? '{actor} play with {target}! Spirit rises to {current}/{max}.'
                        : '{actor} plays with {target}! Spirit rises to {current}/{max}.', {
                        actor: actorName,
                        target: target.name,
                        current: target.CPle,
                        max: target.MPle
                    });
                    if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                        result += ` ${app._label(targetWasParty ? 'combat.action.playDazedParty' : 'combat.action.playDazedFriendly', targetWasParty
                            ? '{target} relaxes, becoming dazed!'
                            : '{target} relaxes, becoming dazed and friendly!', { target: target.name })}`;
                        if (!targetWasParty) target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        target.orgasmed = true;
                        if (!targetWasParty) app._awardCombatXP(app.XP_REWARDS.seduceEnemy);
                        if (app.settings.refractoryPeriod) {
                            target.refractory = true;
                            result += ` ${app._label('combat.action.catchBreath', 'They need a moment to catch their breath...')}`;
                        }
                        if (!targetWasParty && actor.name === app.player?.name) {
                            setTimeout(() => {
                                app._confirmRecruitCreature(target);
                            }, 100);
                        }
                    }
                    const breakthrough = targetWasParty ? null : app._resolveSpiritThreshold?.(actor, target, action, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else {
                    result = app._label('combat.action.playRejected', '{target} does not want to play!', { target: target.name });
                }
                break;
            }
            case 'feed': {
                const tend = app._resolveTendEffect(actor, target);
                result = app._label('feed.tendResult', '{actor} tends {target}, restoring {amount} punishment.', {
                    actor: actorName,
                    target: target.name,
                    amount: tend.restoredCondition
                });
                break;
            }
            case 'feast': {
                const subId = options.subAction || app._getDefaultSubAction('feast');
                result = app._doSubAction('feast', subId, actor, target, actorName, actorVerb, {
                    mode: 'combat',
                    multiEffect: options.multiEffect
                });
                app._emitSubAction('feast', subId, actor, target, result);
                break;
            }
            }
            app._pushLog(result, 'combat', { actor, targetId: target.id || target.name, targetName: target.name, action, phase: 'action' });
            app.lastCombatActionResult = { action, actor, target, result, multiEffect: options.multiEffect || null };
            YAW_COMPANION_BEHAVIOR.recordCareFromInteraction(app, {
                actor,
                target,
                action,
                before: careBefore,
                source: 'combat-resolution'
            });
            if (!options.suppressStory) app._emitCombatAction(action, actor, target, result);
            app.renderCombatSceneForTurn(actor);
            app.renderLog();
            app.renderCreatures();
            app.renderParty();
            app._syncCurrentTileCreatures();
            app._sanitizeCombatState({ preserveTurn: true });
            app.markAutoSaveDirty?.(['manifest', 'party', 'currentTile', 'combat', 'quests', 'sceneFeed', 'activityLog'], 'combat-action');
            app.autoSave();
            if (advanceTurn) app.nextTurn();
            return true;
        } catch (e) {
            console.error('Combat action failed:', e);
            app._reportInvalidCombatCommand?.({
                mode: 'combat', actors: [actor].filter(Boolean), targets: [target].filter(Boolean), action,
                source: 'combat-resolution', metadata: { baseAction: action }
            }, 'resolution-interrupted');
            app._recoverCombatProgress?.('combat-action-error');
            return false;
        } finally {
            if (app.combatState) app.combatState.processing = false;
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_RESOLUTION = YAW_COMBAT_RESOLUTION;
}
