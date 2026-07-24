/**
 * YOU ARE WILD COMBAT SYNC
 * Group combat action participant selection and delayed queue orchestration.
 */

const YAW_COMBAT_SYNC = {
    showMenu(app) {
        const allies = app.party.filter(p => p.CPun > 0 && p.name !== app.player.name);
        if (allies.length === 0) {
            app.log.push({ text: app._label('combat.sync.noAllies', 'No allies available for sync.'), type: 'combat' });
            app.renderLog();
            return false;
        }
        const actor = app.activeActor || app._currentCombatActor() || app.player;
        const actorId = app._unitSelectionId(actor);
        app.targetSelection = null;
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.combatPlanSelection = null;
        app.syncSelection = { active: true, phase: 'choose', actorId, participantIds: [actorId], type: null };
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    selectParticipants(app, syncType) {
        const actor = app.activeActor || app._currentCombatActor() || app.player;
        const actorId = app._unitSelectionId(actor);
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.combatPlanSelection = null;
        app.syncSelection = { active: true, phase: 'participants', actorId, participantIds: [actorId], type: syncType };
        app._syncSelected = [app.party.indexOf(actor)].filter(index => index >= 0);
        app._renderInteractionState({ exploration: false, toolbelt: true });
    },

    toggleParticipant(app, idx) {
        const unit = app.party[idx];
        if (!unit) return false;
        return app._toggleSyncParticipantById(app._unitSelectionId(unit));
    },

    isSlotCompose(app) {
        return Boolean(app.syncSelection?.active && app.syncSelection.phase === 'compose' && app.syncSelection.source === 'slot-composer');
    },

    clearSlotCompose(app, reason = 'cancel') {
        if (!this.isSlotCompose(app)) return false;
        app.syncSelection = null;
        app._syncSelected = [];
        app._syncParticipants = null;
        app._syncType = null;
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    normalizeSlotCompose(app) {
        if (!this.isSlotCompose(app)) return false;
        const actor = app.activeActor || app._currentCombatActor() || app.player;
        if (!actor || !app.party.includes(actor) || actor.CPun <= 0) {
            return this.clearSlotCompose(app, 'missing-actor');
        }
        const actorId = app._unitSelectionId(actor);
        const validIds = [];
        for (const id of app.syncSelection.participantIds || []) {
            const unit = app.party.find(candidate => app._unitSelectionId(candidate) === id || String(candidate.id || candidate.name) === id);
            if (unit && unit.CPun > 0) {
                const unitId = app._unitSelectionId(unit);
                if (!validIds.includes(unitId)) validIds.push(unitId);
            }
        }
        app.syncSelection.actorId = actorId;
        app.syncSelection.participantIds = validIds.includes(actorId)
            ? [actorId, ...validIds.filter(id => id !== actorId)]
            : [actorId, ...validIds];
        app._syncSelected = app.syncSelection.participantIds
            .map(id => app.party.findIndex(unit => app._unitSelectionId(unit) === id))
            .filter(index => index >= 0);
        app.targetSelection = null;
        if (app._combatMarkedTargets) app._combatMarkedTargets();
        return true;
    },

    status(app) {
        if (!this.isSlotCompose(app)) return null;
        this.normalizeSlotCompose(app);
        return {
            participants: app._syncSelectedParticipants?.() || [],
            targets: app._combatMarkedTargets?.() || [],
            actorId: app.syncSelection?.actorId || null
        };
    },

    composeControls(app) {
        if (!this.isSlotCompose(app)) return '';
        return '';
    },

    ensureSlotCompose(app) {
        if (!app.combatState?.active || app.feedSelection?.active) return false;
        const actor = app.activeActor || app._currentCombatActor() || app.player;
        if (!actor || !app.party.includes(actor) || actor.CPun <= 0) return false;
        const actorId = app._unitSelectionId(actor);
        if (!this.isSlotCompose(app)) {
            app.targetSelection = null;
            app.syncSelection = {
                active: true,
                phase: 'compose',
                source: 'slot-composer',
                actorId,
                participantIds: [actorId],
                type: null
            };
        } else {
            app.syncSelection.actorId = app.syncSelection.actorId || actorId;
            const ids = app.syncSelection.participantIds || [];
            app.syncSelection.participantIds = ids.includes(actorId) ? ids : [actorId, ...ids];
        }
        this.normalizeSlotCompose(app);
        return true;
    },

    toggleSlotParticipant(app, id) {
        if (!this.ensureSlotCompose(app)) return false;
        const key = String(id || '');
        const unit = app.party.find(candidate => app._unitSelectionId(candidate) === key || String(candidate.id || candidate.name) === key);
        if (!unit || unit.CPun <= 0) return false;
        const unitId = app._unitSelectionId(unit);
        const actorId = app.syncSelection.actorId;
        if (unitId !== actorId) {
            const participantIds = app.syncSelection.participantIds || [];
            app.syncSelection.participantIds = participantIds.includes(unitId)
                ? participantIds.filter(existing => existing !== unitId)
                : [...participantIds, unitId];
        }
        this.normalizeSlotCompose(app);
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    typeForIntent(action) {
        const map = {
            fight: 'sync_fight',
            flirt: 'sync_flirt',
            fuck: 'sync_fuck',
            feed: 'sync_feed'
        };
        return map[action] || null;
    },

    queueSlotIntent(app, action) {
        if (!this.isSlotCompose(app)) return false;
        this.normalizeSlotCompose(app);
        const syncType = this.typeForIntent(action);
        const participants = app._syncSelectedParticipants();
        const targets = app._combatMarkedTargets?.() || [];
        const command = app._buildPanelInteractionCommand({
            mode: 'combat',
            actors: participants,
            targets,
            action: syncType || action,
            source: 'combat-slot-composer',
            targetType: 'enemy',
            shape: participants.length > 1 && targets.length > 1 ? 'many-to-many' : 'many-to-one',
            timing: 'slowest-participant',
            distribution: targets.length > 1 ? 'all' : 'single',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: true,
                checkReach: true,
                checkRows: true,
                minActors: 2,
                minTargets: 1,
                maxTargets: null
            },
            metadata: { baseAction: syncType ? app._syncBaseAction(syncType) : action, phase: 'compose' }
        });
        if (!syncType) {
            app._reportInvalidCombatCommand?.(command, 'invalid-combat-target');
            return false;
        }
        const valid = app._validateInteractionCommand?.(command) || { ok: true };
        if (!valid.ok) {
            app._reportInvalidCombatCommand?.(command, valid.reason);
            return false;
        }
        return app._dispatchInteractionCommand(command);
    },

    confirmParticipants(app, syncType) {
        if (syncType && (!app.syncSelection?.active || app.syncSelection.type !== syncType)) app.selectSyncParticipants(syncType);
        const participants = app._syncSelectedParticipants();
        if (participants.length < 2) {
            app.log.push({ text: app._label('combat.sync.needParticipants', 'Need at least 2 participants for a sync action.'), type: 'combat' });
            app.renderLog();
            app.renderParty();
            return false;
        }
        app._syncParticipants = participants;
        app._syncType = syncType || app.syncSelection?.type;
        app.syncSelection = { ...app.syncSelection, phase: 'target', type: app._syncType };
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    queueAction(app, syncType, targetIndex, command = null) {
        const target = typeof targetIndex === 'object'
            ? targetIndex
            : app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0)[targetIndex];
        const targets = (command?.targets?.length ? command.targets : [target]).filter((unit, index, list) => unit && list.indexOf(unit) === index);
        if (!targets.length) return false;
        const selectedParticipants = command?.actors?.length ? command.actors : (app._syncParticipants || app._syncSelectedParticipants() || []);
        const participants = selectedParticipants
            .filter(unit => unit && unit.CPun > 0);
        if (!participants || participants.length < 2) {
            app.log.push({ text: app._label('combat.sync.needParticipants', 'Need at least 2 participants for a sync action.'), type: 'combat' });
            app.renderLog();
            return false;
        }
        const queueEntries = participants.map(p => {
            const index = app.combatState.turnQueue.findIndex(q => q.unit === p);
            return index >= 0 ? { index, entry: app.combatState.turnQueue[index] } : null;
        });
        if (queueEntries.some(entry => !entry)) {
            app.log.push({ text: app._label('combat.sync.failedNoQueue', 'Sync failed! Participants are no longer in the turn queue.'), type: 'combat' });
            app.renderLog();
            app.renderParty();
            app.renderCreatures();
            return false;
        }
        let slowestIdx = -1, slowestInit = Infinity;
        for (const { index, entry } of queueEntries) {
            if (entry.initiative < slowestInit) {
                slowestInit = entry.initiative;
                slowestIdx = index;
            }
        }
        const plan = app._buildInteractionPlan({
            mode: 'combat',
            actors: participants,
            targets,
            action: syncType,
            subAction: command?.subAction || null,
            source: command?.source || 'sync-composer',
            targetType: 'enemy',
            shape: targets.length > 1 ? 'many-to-many' : 'many-to-one',
            timing: 'slowest-participant',
            resolveAt: slowestIdx,
            distribution: targets.length > 1 ? 'all' : 'single',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: true,
                checkReach: true,
                checkRows: true,
                minActors: 2,
                minTargets: 1,
                maxTargets: null
            },
            metadata: {
                baseAction: app._syncBaseAction(syncType),
                round: app.combatState.round
            }
        });
        app._syncCurrentTileCreatures();
        app.combatState.syncActions.push({
            type: syncType, participants: participants, target: targets[0], targets,
            techniqueKey: command?.subAction || null,
            resolveAtIndex: slowestIdx, resolved: false, round: app.combatState.round,
            plan
        });
        app.log.push({ text: app._label('combat.sync.prepared', '{participants} prepare {action} against {targets}! It resolves when the slowest participant acts.', {
            participants: participants.map(p => p.name).join(', '),
            action: app._label(`combat.sync.action.${app._syncBaseAction(syncType)}`, app._syncBaseAction(syncType)),
            targets: targets.map(unit => unit.name).join(', ')
        }), type: 'combat' });
        const consumeCurrentTurn = command?.metadata?.consumeCurrentTurn !== false;
        for (const p of participants) {
            const qEntry = app.combatState.turnQueue.find(q => q.unit === p);
            if (qEntry) qEntry.actedThisRound = true;
        }
        app._clearTransientInteractionState();
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        if (consumeCurrentTurn) app.nextTurn();
        else {
            app._renderInteractionState({ exploration: false, toolbelt: true });
            app.renderCombatSceneForTurn?.(app._currentCombatActor?.() || app.activeActor || app.player);
        }
        return true;
    },

    resolveAction(app, sync) {
        if (sync.resolved) return;
        sync.resolved = true;
        const incapacitated = (sync.participants || []).filter(p => !p || p.CPun <= 0 || p.knockedOut || p.fledCombat);
        if (incapacitated.length > 0) {
            app.log.push({ text: app._label('combat.sync.failedIncapacitated', 'Sync failed! {names} cannot participate.', {
                names: incapacitated.map(p => p?.name || app._label('ui.unknown', 'Unknown')).join(', ')
            }), type: 'combat' });
            app.renderLog();
            app.nextTurn();
            return;
        }
        sync.participants = (sync.participants || []).filter(unit => app._isCombatQueueUnitValid(unit) && app.party.includes(unit));
        const queuedTargets = (sync.targets?.length ? sync.targets : [sync.target])
            .filter((unit, index, list) => app._isCombatQueueUnitValid(unit) && unit.disposition === app.DISPOSITION.ENEMY && list.indexOf(unit) === index);
        if (!queuedTargets.length || sync.participants.length < 2) {
            app.log.push({ text: app._label('combat.sync.failedInvalid', 'Sync failed! The target or participants are no longer available.'), type: 'combat' });
            app.renderLog();
            app.nextTurn();
            return;
        }
        sync.targets = queuedTargets;
        sync.target = queuedTargets[0];
        const baseAction = app._syncBaseAction(sync.type);
        const technique = baseAction === 'fight' && typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
            ? YAW_COMBAT_TECHNIQUES.selected(app, sync.participants || [], sync.techniqueKey || sync.plan?.subAction || 'basic', queuedTargets.length)
            : null;
        if (baseAction === 'fight' && technique === false) {
            const result = app._label('combat.technique.groupUnavailable', 'The group can no longer perform the prepared combat technique.');
            app.log.push({ text: result, type: 'combat' });
            app.renderLog();
            app.nextTurn();
            return result;
        }
        if (app._isReachSensitiveCombatAction?.(baseAction)) {
            for (const target of queuedTargets) {
                const reachResults = (sync.participants || []).map(unit => app._combatReachResult?.(unit, target, baseAction, {
                    techniqueKey: sync.techniqueKey || sync.plan?.subAction
                })).filter(Boolean);
                if (reachResults.length !== (sync.participants || []).length || !reachResults.every(result => result.canSucceed)) {
                    const reach = reachResults.find(result => result?.canAttempt && !result.canSucceed) || reachResults[0] || null;
                    for (const participant of sync.participants || []) {
                        app._applyActionCost?.(baseAction, participant, target, {}, {
                            mode: 'combat',
                            source: 'sync-reach-failure',
                            emitScene: true
                        });
                    }
                    const result = YAW_COMBAT_RESOLUTION.reachFailure(app, baseAction, sync.participants || [], target, reach);
                    if (baseAction === 'fight' && queuedTargets.length > 1) {
                        app._awardMultiInteractionPractice?.(sync.participants || [], 'fight', queuedTargets, { success: false });
                    }
                    app.renderLog();
                    app.renderParty();
                    app.renderCreatures();
                    app.renderCombatSceneForTurn?.(app._currentCombatActor?.() || app.activeActor || app.player);
                    app.nextTurn();
                    return result;
                }
            }
        }
        for (const participant of sync.participants || []) {
            app._applyActionCost?.(baseAction, participant, sync.target, {}, {
                mode: 'combat',
                source: 'sync-resolution',
                emitScene: true
            });
        }
        const fightEffects = baseAction === 'fight'
            ? new Map((sync.participants || []).map(participant => [participant, app._multiInteractionEffect?.(participant, 'fight', queuedTargets.length, {
                techniqueKey: sync.techniqueKey || sync.plan?.subAction
            })]))
            : new Map();
        const spreadText = baseAction === 'fight'
            ? app._multiInteractionOutcomeText?.('fight', sync.participants || [], queuedTargets)
            : '';
        let meaningfulAttempt = false;
        for (let targetIndex = 0; targetIndex < queuedTargets.length; targetIndex++) {
            const target = queuedTargets[targetIndex];
            sync.target = target;
            const participantNames = sync.participants.map(participant => participant.name).join(', ');
            let result = '';
            switch (sync.type) {
            case 'sync_fuck': {
                let totalCharm = sync.participants.reduce((sum, p) => sum + (p.Fuck || 0) + (p.Flir || 0), 0);
                if (app.settings.sameSpeciesBonus) {
                    const speciesMatch = sync.participants.filter(p => p.species === sync.target.species).length;
                    totalCharm += speciesMatch * 5;
                }
                const resist = (sync.target.wis || 10) + (app._safeRatio(sync.target.CPle, sync.target.MPle) * 10);
                const oldPle = sync.target.CPle;
                if (totalCharm > resist * 1.5) {
                    sync.target.CPle = sync.target.MPle;
                    sync.target.disposition = app.DISPOSITION.FRIENDLY;
                    sync.target.willing = true;
                    sync.target.orgasmed = true;
                    app._awardCombatXP(app.XP_REWARDS.seduceEnemy);
                    result = app._label('combat.sync.playComplete', '{participants} play with {target}! They relax completely.', {
                        participants: participantNames,
                        target: sync.target.name
                    });
                    if (app.settings.refractoryPeriod) {
                        sync.target.refractory = true;
                        result += ` ${app._label('combat.action.catchBreath', 'They need a moment to catch their breath...')}`;
                    }
                    setTimeout(() => {
                        app._confirmRecruitCreature(sync.target);
                    }, 100);
                    const breakthrough = app._resolveSpiritThreshold?.(sync.participants[0], sync.target, sync.type, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else if (totalCharm > resist) {
                    sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.3));
                    result = app._label('combat.sync.playPartial', '{participants} play with {target}! They are dazed but not fully relaxed.', {
                        participants: participantNames,
                        target: sync.target.name
                    });
                    if (sync.target.CPle >= sync.target.MPle * 0.8 && oldPle < sync.target.MPle * 0.8) {
                        result += ` ${app._label('combat.sync.targetCatchBreath', '{target} needs a moment to catch their breath!', { target: sync.target.name })}`;
                        sync.target.orgasmed = true;
                        if (app.settings.refractoryPeriod) sync.target.refractory = true;
                    }
                    const breakthrough = app._resolveSpiritThreshold?.(sync.participants[0], sync.target, sync.type, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else {
                    result = app._label('combat.sync.playRejected', '{target} does not want to play with the group!', { target: sync.target.name });
                }
                break;
            }
            case 'sync_flirt': {
                let totalCharm = sync.participants.reduce((sum, p) => sum + (p.Flir || 0) + (p.cha || 10) * 0.5, 0);
                if (app.settings.sameSpeciesBonus) {
                    const speciesMatch = sync.participants.filter(p => p.species === sync.target.species).length;
                    totalCharm += speciesMatch * 3;
                }
                const resist = (sync.target.wis || 10) + (app._safeRatio(sync.target.CPle, sync.target.MPle) * 10);
                if (totalCharm > resist * 1.2) {
                    sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.4));
                    sync.target.charmed = (sync.target.charmed || 0) + 2;
                    sync.target.Figh = Math.max(1, (sync.target.Figh || 10) - 2);
                    sync.target.disposition = app.DISPOSITION.FRIENDLY;
                    sync.target.willing = true;
                    app._awardCombatXP(app.XP_REWARDS.flirtEnemy);
                    result = app._label('combat.sync.talkConvinced', '{participants} talk {target} into standing down! They are convinced.', {
                        participants: participantNames,
                        target: sync.target.name
                    });
                    const breakthrough = app._resolveSpiritThreshold?.(sync.participants[0], sync.target, sync.type, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else if (totalCharm > resist) {
                    sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.3));
                    sync.target.charmed = (sync.target.charmed || 0) + 1;
                    sync.target.Figh = Math.max(1, (sync.target.Figh || 10) - 1);
                    result = app._label('combat.sync.talkSoftened', '{participants} talk with {target}, softening their guard. Spirit rises to {current}/{max}.', {
                        participants: participantNames,
                        target: sync.target.name,
                        current: sync.target.CPle,
                        max: sync.target.MPle
                    });
                    const breakthrough = app._resolveSpiritThreshold?.(sync.participants[0], sync.target, sync.type, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else {
                    result = app._label('combat.sync.talkResisted', "{target} resists the group's combined charm!", { target: sync.target.name });
                }
                break;
            }
            case 'sync_fight': {
                const totalStr = sync.participants.reduce((sum, participant) => {
                    const rawContribution = participant.Figh || 0;
                    const contribution = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                        ? YAW_COMBAT_TECHNIQUES.damageValue(rawContribution, technique)
                        : rawContribution;
                    const effect = fightEffects.get(participant);
                    return sum + contribution * (effect?.scale ?? 1);
                }, 0);
                const def = app._effectiveCon(sync.target);
                const dmg = Math.max(1, Math.floor(totalStr - def * 0.5 + app._combatDamageVariance(sync.participants[0], sync.target, `sync-fight:${sync.participants.map(p => app._unitSelectionId(p)).join('|')}`, 10)));
                sync.target.CPun -= dmg;
                const techniqueStatus = technique ? app._applyTechniqueStatus?.(sync.participants[0], sync.target, technique, dmg) : false;
                result = technique
                    ? app._label('combat.sync.techniqueHit', '{participants} combine {technique} against {target}, dealing {amount} punishment!', {
                        participants: participantNames,
                        technique: YAW_COMBAT_TECHNIQUES.label(app, technique),
                        target: sync.target.name,
                        amount: dmg
                    })
                    : app._label('combat.sync.fightHit', '{participants} gang up on {target}, dealing {amount} punishment!', {
                        participants: participantNames,
                        target: sync.target.name,
                        amount: dmg
                    });
                if (techniqueStatus) {
                    result += ` ${app._label('combat.action.techniqueStatus', '{target} is affected by {status}.', {
                        target: sync.target.name,
                        status: YAW_COMBAT_TECHNIQUES.statusLabel(app, technique.status.effect)
                    })}`;
                }
                meaningfulAttempt = true;
                if (sync.target.CPun <= 0) {
                    result += ` ${app._label('combat.sync.fightCollapse', '{target} is overwhelmed and collapses!', { target: sync.target.name })}`;
                    app._awardCombatXP(app.XP_REWARDS.defeatEnemy);
                    if (app.settings.powerDynamics) {
                        app._subdueCreature(sync.target, sync.participants[0], { source: 'group-fight' });
                        result += ` ${app._label('combat.subduedRecruitable', '{name} yields and may be recruited.', { name: sync.target.name })}`;
                    } else app._makeCorpse(sync.target, 'fight');
                }
                break;
            }
            case 'sync_feed': {
                const totalFeas = sync.participants.reduce((sum, p) => sum + (p.Feas || 0), 0);
                const canEat = sync.target.CPun <= sync.target.MPun * 0.3 || totalFeas > sync.target.Flee + 5;
                if (canEat) {
                    const eater = sync.participants[0];
                    if (!app._canFitPrey(eater, sync.target, 'stomach')) {
                        result = app._capacityFailureMessage(eater, sync.target, 'stomach');
                        break;
                    }
                    app._containTargetIn(eater, sync.target, 'stomach');
                    app._awardCombatXP(app.XP_REWARDS.consumeEnemy);
                    result = app._label('combat.sync.feedSuccess', "{participants} force {target} into {eater}'s stomach!", {
                        participants: participantNames,
                        target: sync.target.name,
                        eater: eater.name
                    });
                } else {
                    result = app._label('combat.sync.feedResisted', '{target} is too strong to be force-fed!', { target: sync.target.name });
                }
                break;
            }
            }
            if (targetIndex === 0 && spreadText) result += ` ${spreadText}`;
            app.log.push({ text: result, type: 'combat' });
            app._emitCombatAction(sync.type, sync.participants, sync.target, result);
        }
        if (baseAction === 'fight') {
            app._awardMultiInteractionPractice?.(sync.participants || [], 'fight', queuedTargets, { success: meaningfulAttempt });
        }
        sync.target = queuedTargets[0];
        app.renderLog();
        app.renderCreatures();
        app.renderParty();
        app.nextTurn();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_SYNC = YAW_COMBAT_SYNC;
}
