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
        app.syncSelection = { active: true, phase: 'choose', actorId, participantIds: [actorId], type: null };
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    selectParticipants(app, syncType) {
        const actor = app.activeActor || app._currentCombatActor() || app.player;
        const actorId = app._unitSelectionId(actor);
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.syncSelection = { active: true, phase: 'participants', actorId, participantIds: [actorId], type: syncType };
        app._syncSelected = [app.party.indexOf(actor)].filter(index => index >= 0);
        app._renderInteractionState({ exploration: false, toolbelt: true });
    },

    toggleParticipant(app, idx) {
        const unit = app.party[idx];
        if (!unit) return false;
        return app._toggleSyncParticipantById(app._unitSelectionId(unit));
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

    queueAction(app, syncType, targetIndex) {
        const target = typeof targetIndex === 'object'
            ? targetIndex
            : app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0)[targetIndex];
        if (!target) return;
        const participants = app._syncParticipants || app._syncSelectedParticipants();
        if (!participants || participants.length < 2) {
            app.log.push({ text: app._label('combat.sync.needParticipants', 'Need at least 2 participants for a sync action.'), type: 'combat' });
            app.renderLog();
            return false;
        }
        if (!app._canSyncTarget(participants, target, syncType)) {
            const names = participants.map(p => p?.name).filter(Boolean).join(', ') || app._label('action.sync', 'Sync');
            app.log.push({ text: app._label('combat.cannotReachTarget', '{actor} cannot reach {target} from here.', { actor: names, target: target.name }), type: 'combat' });
            app.renderLog();
            app.renderCreatures();
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
            targets: [target],
            action: syncType,
            source: 'sync-composer',
            targetType: 'enemy',
            shape: 'many-to-one',
            timing: 'slowest-participant',
            resolveAt: slowestIdx,
            distribution: 'single',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: true,
                checkReach: true,
                checkRows: true,
                minActors: 2,
                minTargets: 1,
                maxTargets: 1
            },
            metadata: {
                baseAction: app._syncBaseAction(syncType),
                round: app.combatState.round
            }
        });
        app._syncCurrentTileCreatures();
        app.combatState.syncActions.push({
            type: syncType, participants: participants, target: target,
            resolveAtIndex: slowestIdx, resolved: false, round: app.combatState.round,
            plan
        });
        app.log.push({ text: `${participants.map(p => p.name).join(', ')} prepare a ${syncType.replace('sync_', '')} on ${target.name}! Resolves when the slowest participant acts.`, type: 'combat' });
        for (const p of participants) {
            const qEntry = app.combatState.turnQueue.find(q => q.unit === p);
            if (qEntry) qEntry.actedThisRound = true;
        }
        app._clearTransientInteractionState();
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        app.nextTurn();
        return true;
    },

    resolveAction(app, sync) {
        if (sync.resolved) return;
        sync.resolved = true;
        const incapacitated = (sync.participants || []).filter(p => !p || p.CPun <= 0 || p.knockedOut || p.fledCombat);
        if (incapacitated.length > 0) {
            app.log.push({ text: app._label('combat.sync.failedIncapacitated', 'Sync failed! {names} cannot participate.', { names: incapacitated.map(p => p?.name || 'Unknown').join(', ') }), type: 'combat' });
            app.renderLog();
            app.nextTurn();
            return;
        }
        sync.participants = (sync.participants || []).filter(unit => app._isCombatQueueUnitValid(unit) && app.party.includes(unit));
        if (!sync.target || !app._isCombatQueueUnitValid(sync.target) || sync.participants.length < 2) {
            app.log.push({ text: app._label('combat.sync.failedInvalid', 'Sync failed! The target or participants are no longer available.'), type: 'combat' });
            app.renderLog();
            app.nextTurn();
            return;
        }
        if (sync.target.CPun <= 0) {
            app.log.push({ text: `Sync target ${sync.target.name} is already defeated!`, type: 'combat' });
            app.renderLog();
            app.nextTurn();
            return;
        }
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
                    result = `${sync.participants.map(p => p.name).join(' and ')} play with ${sync.target.name}! They relax completely.`;
                    if (app.settings.refractoryPeriod) {
                        sync.target.refractory = true;
                        result += ` They need a moment to catch their breath...`;
                    }
                    setTimeout(() => {
                        app._confirmRecruitCreature(sync.target);
                    }, 100);
                } else if (totalCharm > resist) {
                    sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.3));
                    result = `${sync.participants.map(p => p.name).join(' and ')} play with ${sync.target.name}! They are dazed but not fully relaxed.`;
                    if (sync.target.CPle >= sync.target.MPle * 0.8 && oldPle < sync.target.MPle * 0.8) {
                        result += ` ${sync.target.name} needs a moment to catch their breath!`;
                        sync.target.orgasmed = true;
                        if (app.settings.refractoryPeriod) sync.target.refractory = true;
                    }
                } else {
                    result = `${sync.target.name} does not want to play with the group!`;
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
                    result = `${sync.participants.map(p => p.name).join(' and ')} talk ${sync.target.name} into standing down! They are convinced.`;
                } else if (totalCharm > resist) {
                    sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.3));
                    sync.target.charmed = (sync.target.charmed || 0) + 1;
                    sync.target.Figh = Math.max(1, (sync.target.Figh || 10) - 1);
                    result = `${sync.participants.map(p => p.name).join(' and ')} talk with ${sync.target.name}, softening their guard. Spirit rises to ${sync.target.CPle}/${sync.target.MPle}.`;
                } else {
                    result = `${sync.target.name} resists the group's combined charm!`;
                }
                break;
            }
            case 'sync_fight': {
                const totalStr = sync.participants.reduce((sum, p) => sum + (p.Figh || 0), 0);
                const def = app._effectiveCon(sync.target);
                const dmg = Math.max(1, Math.floor(totalStr - def * 0.5 + app._combatDamageVariance(sync.participants[0], sync.target, `sync-fight:${sync.participants.map(p => app._unitSelectionId(p)).join('|')}`, 10)));
                sync.target.CPun -= dmg;
                result = `${sync.participants.map(p => p.name).join(' and ')} gang up on ${sync.target.name}, dealing ${dmg} punishment!`;
                if (sync.target.CPun <= 0) {
                    result += ` ${sync.target.name} is overwhelmed and collapses!`;
                    app._awardCombatXP(app.XP_REWARDS.defeatEnemy);
                    if (app.settings.endoMode) { sync.target.CPun = 1; sync.target.disposition = app.DISPOSITION.FRIENDLY; }
                    else app._makeCorpse(sync.target, 'fight');
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
                    result = `${sync.participants.map(p => p.name).join(' and ')} force ${sync.target.name} into ${eater.name}'s stomach!`;
                } else {
                    result = `${sync.target.name} is too strong to be force-fed!`;
                }
                break;
            }
        }
        app.log.push({ text: result, type: 'combat' });
        app._emitCombatAction(sync.type, sync.participants, sync.target, result);
        app.renderLog();
        app.renderCreatures();
        app.renderParty();
        app.nextTurn();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_SYNC = YAW_COMBAT_SYNC;
}
