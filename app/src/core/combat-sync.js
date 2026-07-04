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
        app.syncSelection = { active: true, phase: 'choose', actorId, participantIds: [actorId], type: null };
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    selectParticipants(app, syncType) {
        const actor = app.activeActor || app._currentCombatActor() || app.player;
        const actorId = app._unitSelectionId(actor);
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
        app._syncCurrentTileCreatures();
        app.combatState.syncActions.push({
            type: syncType, participants: participants, target: target,
            resolveAtIndex: slowestIdx, resolved: false, round: app.combatState.round
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
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_SYNC = YAW_COMBAT_SYNC;
}
