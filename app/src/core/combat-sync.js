/**
 * YOU ARE WILD COMBAT SYNC
 * Group combat action participant selection and delayed queue orchestration.
 */

const YAW_COMBAT_SYNC = {
    isQueuedParticipant(app, unit) {
        if (!unit || !app.party.includes(unit) || unit.CPun <= 0) return false;
        if (typeof app._isCombatQueueUnitValid === 'function' && !app._isCombatQueueUnitValid(unit)) return false;
        const unitId = app._unitSelectionId?.(unit) || String(unit.id || unit.name || '');
        return (app.combatState?.turnQueue || []).some(entry => {
            const queued = entry?.unit || entry;
            const queuedId = app._unitSelectionId?.(queued) || String(queued?.id || queued?.name || '');
            return queued === unit || (unitId && queuedId === unitId);
        });
    },

    isSelectableParticipant(app, unit) {
        return Boolean(unit && app.party.includes(unit));
    },

    isParticipant(app, sync, unit) {
        if (!sync || !unit) return false;
        const unitId = app._unitSelectionId?.(unit) || String(unit.id || unit.name || '');
        return (sync.participants || []).some(participant => {
            const participantId = app._unitSelectionId?.(participant) || String(participant?.id || participant?.name || '');
            return participant === unit || (unitId && participantId === unitId);
        });
    },

    pendingParticipantAction(app, unit) {
        if (!app?.combatState?.active || !unit) return null;
        return (app.combatState.syncActions || []).find(sync =>
            !sync.resolved
            && sync.round === app.combatState.round
            && this.isParticipant(app, sync, unit)
        ) || null;
    },

    showMenu(app) {
        app._sanitizeCombatState?.({ preserveTurn: true });
        const allies = app.party.filter(p => p.CPun > 0 && p.name !== app.player.name);
        if (allies.length === 0) {
            const actor = app.activeActor || app._currentCombatActor() || app.player;
            app._reportInvalidCombatCommand?.({
                mode: 'combat', actors: [actor].filter(Boolean), targets: [], action: 'sync_fight',
                source: 'sync-composer', metadata: { baseAction: 'fight' }
            }, 'too-few-participants');
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
        app._sanitizeCombatState?.({ preserveTurn: true });
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
            if (this.isSelectableParticipant(app, unit)) {
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
        app._sanitizeCombatState?.({ preserveTurn: true });
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
        if (!this.isSelectableParticipant(app, unit)) return false;
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
            feed: 'sync_feed',
            feast: 'feast'
        };
        return map[action] || null;
    },

    queueSlotIntent(app, action, options = {}) {
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
            targetType: app._combatPlanTargetType?.(targets)
                || (targets.every(unit => app.party.includes(unit)) ? 'party' : 'enemy'),
            shape: participants.length > 1 && targets.length > 1 ? 'many-to-many' : 'many-to-one',
            timing: 'slowest-participant',
            distribution: targets.length > 1 ? 'all' : 'single',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: syncType !== 'sync_feed',
                checkReach: syncType !== 'sync_feed',
                checkRows: syncType !== 'sync_feed',
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
        if (['fight', 'flirt', 'fuck', 'feast', 'feed'].includes(action)) {
            return YAW_COMBAT_FEED.executeVariantAction(app, action, participants[0], targets, {
                actors: participants,
                targets,
                forceChoose: options.forceChoose === true
            });
        }
        return app._dispatchInteractionCommand(command);
    },

    confirmParticipants(app, syncType) {
        if (syncType && (!app.syncSelection?.active || app.syncSelection.type !== syncType)) app.selectSyncParticipants(syncType);
        const participants = app._syncSelectedParticipants();
        if (participants.length < 2) {
            const actor = app.activeActor || app._currentCombatActor() || app.player;
            app._reportInvalidCombatCommand?.({
                mode: 'combat', actors: participants.length ? participants : [actor].filter(Boolean), targets: [], action: syncType,
                source: 'sync-composer', metadata: { baseAction: app._syncBaseAction(syncType) }
            }, 'too-few-participants');
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
        const participants = selectedParticipants.filter(Boolean);
        if (!participants || participants.length < 2) {
            const actor = app.activeActor || app._currentCombatActor() || app.player;
            app._reportInvalidCombatCommand?.(command || {
                mode: 'combat', actors: participants.length ? participants : [actor].filter(Boolean), targets, action: syncType,
                source: 'sync-composer', metadata: { baseAction: app._syncBaseAction(syncType) }
            }, 'too-few-participants');
            return false;
        }
        const unavailable = participants.find(unit => typeof YAW_COMBAT_PLANNING !== 'undefined'
            && YAW_COMBAT_PLANNING.unavailableParticipantReason?.(app, unit));
        if (unavailable) {
            const failedCommand = command || app._buildPanelInteractionCommand({
                mode: 'combat', actors: participants, targets, action: syncType,
                source: 'sync-composer', timing: 'slowest-participant',
                metadata: { baseAction: app._syncBaseAction(syncType) }
            });
            app._reportInvalidCombatCommand?.(failedCommand, 'actor-unavailable');
            return false;
        }
        const queueEntries = participants.map(p => {
            const index = app.combatState.turnQueue.findIndex(q => this.isParticipant(app, { participants: [p] }, q.unit));
            return index >= 0 ? { index, entry: app.combatState.turnQueue[index] } : null;
        });
        if (queueEntries.some(entry => !entry)) {
            const failedCommand = command || app._buildPanelInteractionCommand({
                mode: 'combat', actors: participants, targets, action: syncType,
                source: 'sync-composer', timing: 'slowest-participant',
                metadata: { baseAction: app._syncBaseAction(syncType) }
            });
            app._reportInvalidCombatCommand?.(failedCommand, 'actor-unavailable');
            return false;
        }
        let slowestIdx = -1, slowestInit = Infinity;
        for (const { index, entry } of queueEntries) {
            if (entry.initiative < slowestInit) {
                slowestInit = entry.initiative;
                slowestIdx = index;
            }
        }
        const currentTurn = Number(app.combatState.currentTurn || 0);
        // The acting lead has just committed its current turn. A group can still
        // resolve this round when every other participant is ahead in the queue.
        // If any helper has already acted, or the planned resolution point has
        // passed, reserve the entire group for the following round instead.
        const hasElapsedParticipantTurn = queueEntries.some(({ index }) => index < currentTurn);
        const resolveNextRound = hasElapsedParticipantTurn || slowestIdx <= currentTurn;
        const resolveRound = app.combatState.round + (resolveNextRound ? 1 : 0);
        const baseAction = app._syncBaseAction(syncType);
        const subAction = YAW_SUB_ACTIONS.normalizeSubAction(baseAction, command?.subAction || null);
        const plan = app._buildInteractionPlan({
            mode: 'combat',
            actors: participants,
            targets,
            action: syncType,
            subAction,
            source: command?.source || 'sync-composer',
            targetType: targets.every(unit => app.party.includes(unit)) ? 'party' : 'enemy',
            shape: targets.length > 1 ? 'many-to-many' : 'many-to-one',
            timing: 'slowest-participant',
            resolveAt: slowestIdx,
            distribution: targets.length > 1 ? 'all' : 'single',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: syncType !== 'sync_feed',
                checkReach: syncType !== 'sync_feed',
                checkRows: syncType !== 'sync_feed',
                minActors: 2,
                minTargets: 1,
                maxTargets: null
            },
            metadata: {
                baseAction,
                round: resolveRound,
                queuedFromRound: app.combatState.round
            }
        });
        app._syncCurrentTileCreatures();
        app.combatState.syncActions.push({
            type: syncType, participants: participants, target: targets[0], targets,
            techniqueKey: subAction,
            resolveAtIndex: slowestIdx, resolved: false, round: resolveRound,
            plan
        });
        const preparedKey = resolveNextRound ? 'combat.sync.preparedNextRound' : 'combat.sync.prepared';
        const preparedFallback = resolveNextRound
            ? '{participants} prepare {action} against {targets}! It is reserved for next round and resolves when the slowest participant acts.'
            : '{participants} prepare {action} against {targets}! It resolves when the slowest participant acts.';
        app.log.push({ text: app._label(preparedKey, preparedFallback, {
            participants: participants.map(p => p.name).join(', '),
            action: app._label(`combat.sync.action.${app._syncBaseAction(syncType)}`, app._syncBaseAction(syncType)),
            targets: targets.map(unit => unit.name).join(', ')
        }), type: 'combat' });
        const consumeCurrentTurn = command?.metadata?.consumeCurrentTurn !== false;
        for (const p of participants) {
            const qEntry = app.combatState.turnQueue.find(q => this.isParticipant(app, { participants: [p] }, q.unit));
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
            app._reportInvalidCombatCommand?.({
                mode: 'combat', actors: sync.participants || [], targets: [sync.target].filter(Boolean), action: sync.type,
                source: 'sync-resolution', metadata: { baseAction: app._syncBaseAction(sync.type) }
            }, 'actor-unavailable');
            app.nextTurn();
            return;
        }
        sync.participants = (sync.participants || []).filter(unit => app._isCombatQueueUnitValid(unit) && app.party.includes(unit));
        const baseAction = app._syncBaseAction(sync.type);
        const queuedApproach = YAW_SUB_ACTIONS.normalizeSubAction(baseAction, sync.techniqueKey || sync.plan?.subAction || null);
        sync.techniqueKey = queuedApproach;
        if (sync.plan) sync.plan.subAction = queuedApproach;
        const selfFeast = baseAction === 'feast' && ['digest', 'release'].includes(queuedApproach);
        const queuedTargets = (sync.targets?.length ? sync.targets : [sync.target])
            .filter((unit, index, list) => {
                if (!app._isCombatQueueUnitValid(unit) || list.indexOf(unit) !== index) return false;
                // Feed is support.  Its canonical target is a living party
                // member; it must never fall through to the old hostile
                // force-feeding behavior.
                if (selfFeast) return app.party.includes(unit) && sync.participants.includes(unit);
                return baseAction === 'feed'
                    ? app.party.includes(unit)
                    : unit.disposition === app.DISPOSITION.ENEMY;
            });
        if (!queuedTargets.length || sync.participants.length < 2) {
            app._reportInvalidCombatCommand?.({
                mode: 'combat', actors: sync.participants || [], targets: [sync.target].filter(Boolean), action: sync.type,
                source: 'sync-resolution', metadata: { baseAction: app._syncBaseAction(sync.type) }
            }, 'group-action-unavailable');
            app.nextTurn();
            return;
        }
        sync.targets = queuedTargets;
        sync.target = queuedTargets[0];
        const technique = baseAction === 'fight' && typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
            ? YAW_COMBAT_TECHNIQUES.selected(app, sync.participants || [], sync.techniqueKey || sync.plan?.subAction || 'basic', queuedTargets.length)
            : null;
        if (baseAction === 'fight' && technique === false) {
            const result = app._reportInvalidCombatCommand?.({
                mode: 'combat', actors: sync.participants || [], targets: queuedTargets, action: sync.type,
                subAction: sync.techniqueKey || sync.plan?.subAction || null,
                source: 'sync-resolution', metadata: { baseAction }
            }, 'invalid-combat-technique');
            app.nextTurn();
            return result;
        }
        const reachByTarget = new Map();
        if (!selfFeast && app._isReachSensitiveCombatAction?.(baseAction)) {
            for (const target of queuedTargets) {
                const entries = (sync.participants || []).map(participant => ({
                    participant,
                    reach: app._combatReachResult?.(participant, target, baseAction, {
                        techniqueKey: sync.techniqueKey || sync.plan?.subAction
                    }) || null
                }));
                reachByTarget.set(target, {
                    capable: entries.filter(entry => entry.reach?.canSucceed).map(entry => entry.participant),
                    blocked: entries.filter(entry => !entry.reach?.canSucceed)
                });
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
        const spreadAction = baseAction === 'fight'
            ? 'fight'
            : (baseAction === 'feast' && (sync.techniqueKey || sync.plan?.subAction) === 'chew' ? 'chew' : null);
        const spreadText = spreadAction
            ? app._multiInteractionOutcomeText?.(spreadAction, sync.participants || [], queuedTargets)
            : '';
        let meaningfulAttempt = false;
        for (let targetIndex = 0; targetIndex < queuedTargets.length; targetIndex++) {
            const target = queuedTargets[targetIndex];
            sync.target = target;
            const targetReach = reachByTarget.get(target) || null;
            const targetParticipants = targetReach?.capable || sync.participants;
            const reachNarration = (targetReach?.blocked || []).map(({ participant, reach }) =>
                app._combatReachFailureText?.([participant], target, baseAction, reach)
                || app._label('combat.cannotReachTarget', '{actor} cannot reach {target} from here.', {
                    actor: participant?.name || app._label('target.actorRole', 'Actor'),
                    target: target?.name || app._label('target.targetRole', 'Target')
                })
            ).join(' ');
            const participantNames = targetParticipants.map(participant => participant.name).join(', ');
            let result = '';
            if (targetParticipants.length > 0) switch (sync.type) {
            case 'sync_fuck': {
                let totalCharm = targetParticipants.reduce((sum, p) => sum + (p.Fuck || 0) + (p.Flir || 0), 0);
                if (app.settings.sameSpeciesBonus) {
                    const speciesMatch = targetParticipants.filter(p => p.species === sync.target.species).length;
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
                    result = app._mlabel('combat.sync.playComplete', '{participants} play with {target}! They relax completely.', {
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
                    const breakthrough = app._resolveSpiritThreshold?.(targetParticipants[0], sync.target, sync.type, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else if (totalCharm > resist) {
                    sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.3));
                    result = app._mlabel('combat.sync.playPartial', '{participants} play with {target}! They are dazed but not fully relaxed.', {
                        participants: participantNames,
                        target: sync.target.name
                    });
                    if (sync.target.CPle >= sync.target.MPle * 0.8 && oldPle < sync.target.MPle * 0.8) {
                        result += ` ${app._label('combat.sync.targetCatchBreath', '{target} needs a moment to catch their breath!', { target: sync.target.name })}`;
                        sync.target.orgasmed = true;
                        if (app.settings.refractoryPeriod) sync.target.refractory = true;
                    }
                    const breakthrough = app._resolveSpiritThreshold?.(targetParticipants[0], sync.target, sync.type, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else {
                    result = app._mlabel('combat.sync.playRejected', '{target} does not want to play with the group!', { target: sync.target.name });
                }
                break;
            }
            case 'sync_flirt': {
                const approach = YAW_SUB_ACTIONS.normalizeSubAction('flirt', sync.techniqueKey || sync.plan?.subAction);
                const isSeduce = approach === 'seduce';
                let totalCharm = targetParticipants.reduce((sum, p) => sum
                    + (p.Flir || 0)
                    + (p.cha || 10) * 0.5
                    + (isSeduce ? (p.Fuck || 0) : 0), 0);
                if (app.settings.sameSpeciesBonus) {
                    const speciesMatch = targetParticipants.filter(p => p.species === sync.target.species).length;
                    totalCharm += speciesMatch * (isSeduce ? 5 : 3);
                }
                const resist = (sync.target.wis || 10) + (app._safeRatio(sync.target.CPle, sync.target.MPle) * 10);
                if (totalCharm > resist * 1.2) {
                    sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.4));
                    sync.target.charmed = (sync.target.charmed || 0) + 2;
                    sync.target.Figh = Math.max(1, (sync.target.Figh || 10) - 2);
                    sync.target.disposition = app.DISPOSITION.FRIENDLY;
                    sync.target.willing = true;
                    app._awardCombatXP(isSeduce ? app.XP_REWARDS.seduceEnemy : app.XP_REWARDS.flirtEnemy);
                    result = app._label(
                        isSeduce ? 'combat.sync.seduceConvinced' : 'combat.sync.talkConvinced',
                        isSeduce
                            ? '{participants} invite {target} closer, and {target} willingly lowers their guard.'
                            : '{participants} talk with {target} until they choose to stand down.', {
                        participants: participantNames,
                        target: sync.target.name
                    });
                    const breakthrough = app._resolveSpiritThreshold?.(targetParticipants[0], sync.target, sync.type, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else if (totalCharm > resist) {
                    sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.3));
                    sync.target.charmed = (sync.target.charmed || 0) + 1;
                    sync.target.Figh = Math.max(1, (sync.target.Figh || 10) - 1);
                    result = app._label(
                        isSeduce ? 'combat.sync.seduceSoftened' : 'combat.sync.talkSoftened',
                        isSeduce
                            ? '{participants} draw {target} closer, softening their guard. Spirit rises to {current}/{max}.'
                            : '{participants} talk with {target}, softening their guard. Spirit rises to {current}/{max}.', {
                        participants: participantNames,
                        target: sync.target.name,
                        current: sync.target.CPle,
                        max: sync.target.MPle
                    });
                    const breakthrough = app._resolveSpiritThreshold?.(targetParticipants[0], sync.target, sync.type, { emitScene: false });
                    if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                } else {
                    result = app._label(
                        isSeduce ? 'combat.sync.seduceResisted' : 'combat.sync.talkResisted',
                        isSeduce
                            ? '{target} pulls away from the group’s overture.'
                            : '{target} resists the group’s combined appeal.',
                        { target: sync.target.name }
                    );
                }
                break;
            }
            case 'sync_fight': {
                const totalStr = targetParticipants.reduce((sum, participant) => {
                    const rawContribution = participant.Figh || 0;
                    const contribution = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                        ? YAW_COMBAT_TECHNIQUES.damageValue(rawContribution, technique)
                        : rawContribution;
                    const effect = fightEffects.get(participant);
                    return sum + contribution * (effect?.scale ?? 1);
                }, 0);
                const def = app._effectiveCon(sync.target);
                const dmg = Math.max(1, Math.floor(totalStr - def * 0.5 + app._combatDamageVariance(targetParticipants[0], sync.target, `sync-fight:${targetParticipants.map(p => app._unitSelectionId(p)).join('|')}`, 10)));
                sync.target.CPun -= dmg;
                const techniqueStatus = technique ? app._applyTechniqueStatus?.(targetParticipants[0], sync.target, technique, dmg) : false;
                const loneParticipant = targetParticipants.length === 1 ? targetParticipants[0] : null;
                result = technique
                    ? (loneParticipant
                        ? app._label('combat.action.techniqueHit', '{actor} uses {technique} on {target} for {amount} punishment!', {
                            actor: loneParticipant.name,
                            technique: YAW_COMBAT_TECHNIQUES.label(app, technique),
                            target: sync.target.name,
                            amount: dmg
                        })
                        : app._label('combat.sync.techniqueHit', '{participants} combine {technique} against {target}, dealing {amount} punishment!', {
                        participants: participantNames,
                        technique: YAW_COMBAT_TECHNIQUES.label(app, technique),
                        target: sync.target.name,
                        amount: dmg
                    }))
                    : (loneParticipant
                        ? app._label(loneParticipant === app.player ? 'combat.action.fightHit.player' : 'combat.action.fightHit.named', loneParticipant === app.player
                            ? '{actor} hit {target} for {amount} punishment!'
                            : '{actor} hits {target} for {amount} punishment!', {
                            actor: loneParticipant === app.player ? app._label('party.you', 'You') : loneParticipant.name,
                            target: sync.target.name,
                            amount: dmg
                        })
                        : app._label('combat.sync.fightHit', '{participants} gang up on {target}, dealing {amount} punishment!', {
                        participants: participantNames,
                        target: sync.target.name,
                        amount: dmg
                    }));
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
                        app._subdueCreature(sync.target, targetParticipants[0], { source: 'group-fight' });
                        result += ` ${app._label('combat.subduedRecruitable', '{name} yields and may be recruited.', { name: sync.target.name })}`;
                    } else app._makeCorpse(sync.target, 'fight', { actor: targetParticipants[0], source: 'group-fight' });
                }
                break;
            }
            case 'sync_feed': {
                const approach = sync.techniqueKey || sync.plan?.subAction || 'tend';
                if (!['tend', 'nurse'].includes(approach)) {
                    result = app._label('feed.group.approachUnavailable', '{participants} cannot coordinate {approach} for {target} right now.', {
                        participants: participantNames,
                        approach: app._uiLabel?.(approach) || approach,
                        target: sync.target.name
                    });
                    break;
                }
                if (approach === 'tend') {
                    const totalRestored = sync.participants.reduce((sum, participant) => {
                        const tend = app._resolveTendEffect(participant, sync.target, { emitScene: false });
                        return sum + Math.max(0, Number(tend?.restoredCondition) || 0);
                    }, 0);
                    result = app._label('feed.group.tendResult', '{participants} tend {target}, restoring {amount} punishment.', {
                        participants: participantNames,
                        target: sync.target.name,
                        amount: totalRestored
                    });
                    break;
                }
                const nursingActors = sync.participants.filter(participant => YAW_SUB_ACTIONS.resolve(app, 'feed', {
                    actors: [participant], targets: [sync.target], mode: 'combat', preferred: 'nurse'
                }).variants.some(variant => variant.id === 'nurse' && variant.available));
                if (!nursingActors.length) {
                    result = app._label('feed.group.nurseUnavailable', '{participants} are no longer ready to nurse {target}.', {
                        participants: participantNames,
                        target: sync.target.name
                    });
                    break;
                }
                result = nursingActors.map(participant => {
                    const actorInfo = app._actorNameAndVerb?.(participant) || { actorName: participant.name, actorVerb: 's' };
                    return app._doSubAction('feed', 'nurse', participant, sync.target, actorInfo.actorName, actorInfo.actorVerb, { mode: 'combat' });
                }).join(' ');
                break;
            }
            case 'feast': {
                const subAction = sync.techniqueKey
                    || sync.plan?.subAction
                    || (app.settings.chewing ? 'chew' : app._getDefaultSubAction('feast'));
                if (['digest', 'release'].includes(subAction)) {
                    const selfActor = sync.participants.find(participant => participant === sync.target);
                    if (!selfActor) {
                        result = app._label('combat.selfFeast.actorUnavailable', '{target} is no longer able to complete that self-directed Feast action.', {
                            target: sync.target.name
                        });
                        break;
                    }
                    const actorInfo = app._actorNameAndVerb?.(selfActor) || { actorName: selfActor.name, actorVerb: 's' };
                    result = app._doSubAction('feast', subAction, selfActor, selfActor, actorInfo.actorName, actorInfo.actorVerb, { mode: 'combat' });
                    meaningfulAttempt = true;
                    break;
                }
                if (subAction === 'chew') {
                    const multiEffect = queuedTargets.length > 1
                        ? app._multiInteractionEffect?.(targetParticipants[0], 'chew', queuedTargets.length)
                        : null;
                    result = app._groupChewFeast(targetParticipants, sync.target, {
                        mode: 'combat',
                        multiEffect
                    });
                    meaningfulAttempt = true;
                    break;
                }
                const selection = app._selectGroupFeastPrimary(targetParticipants, sync.target);
                if (!selection.primary || !selection.canOverpower) {
                    result = app._label('group.feast.resisted', '{actors} try to eat {target}, but {target} resists the group.', {
                        actors: participantNames,
                        target: sync.target.name
                    });
                    break;
                }
                const helpers = targetParticipants.filter(participant => participant !== selection.primary);
                app._containTargetIn(selection.primary, sync.target, 'stomach');
                app._awardCombatXP(app.XP_REWARDS.consumeEnemy);
                result = app._label('group.feast.swallow', '{helpers} help {primary} eat {target}.', {
                    helpers: helpers.map(participant => participant.name).join(', ') || selection.primary.name,
                    primary: selection.primary.name,
                    target: sync.target.name
                });
                meaningfulAttempt = true;
                break;
            }
            }
            if (reachNarration) result = result ? `${reachNarration} ${result}` : reachNarration;
            if (targetIndex === 0 && spreadText) result += ` ${spreadText}`;
            app.log.push({ text: result, type: 'combat' });
            app._emitCombatAction(sync.type, sync.participants, sync.target, result);
        }
        if (spreadAction) {
            app._awardMultiInteractionPractice?.(sync.participants || [], spreadAction, queuedTargets, { success: meaningfulAttempt });
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
