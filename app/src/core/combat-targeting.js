/**
 * YOU ARE WILD COMBAT TARGETING
 * Enemy target-pick state, reach validation, and panel target dispatch.
 */

const YAW_COMBAT_TARGETING = {
    selectTarget(app, action) {
        const actor = app.activeActor || app.player;
        app.targetSelection = { action, source: 'combat', actorId: actor?.id || actor?.name || 'player' };
        app._clearCenterActionsForCombat();
        app._renderInteractionState({ exploration: false, toolbelt: true });
    },

    cancelTargetSelection(app) {
        app._clearTransientInteractionState();
        if (app.combatState.active) app.showActorActions(app._currentCombatActor() || app.activeActor || app.player);
        else {
            app._renderInteractionState({ exploration: true, toolbelt: false });
            app.showExplorationActions();
        }
    },

    canSelectCreatureTarget(app, unit) {
        if (!unit || unit.CPun <= 0) return false;
        if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
            const participants = app._syncParticipants || app._syncSelectedParticipants();
            return this.canSyncTarget(app, participants, unit, app.syncSelection.type);
        }
        if (!app.targetSelection) return false;
        if (app.targetSelection.source === 'combat') {
            const actor = app.activeActor || app.player;
            return unit.disposition === app.DISPOSITION.ENEMY && app._canReachCombatTarget(actor, unit, app.targetSelection.action);
        }
        return unit.disposition !== app.DISPOSITION.PARTY;
    },

    syncBaseAction(syncType) {
        return String(syncType || 'sync_fight').replace(/^sync_/, '') || 'fight';
    },

    canSyncTarget(app, participants, target, syncType = 'sync_fight') {
        const livingParticipants = (participants || []).filter(unit => unit && unit.CPun > 0);
        if (!target || target.CPun <= 0 || target.disposition !== app.DISPOSITION.ENEMY) return false;
        if (livingParticipants.length < 2) return false;
        const action = this.syncBaseAction(syncType);
        return livingParticipants.some(unit => app._canReachCombatTarget(unit, target, action));
    },

    executeActionOnTarget(app, action, targetId) {
        const target = app.creatures.find(c => String(c.id || c.name) === String(targetId));
        if (!target) {
            app.cancelTargetSelection();
            return;
        }
        if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
            return app.queueSyncAction(app.syncSelection.type, target);
        }
        const actor = app.activeActor || app.player;
        const command = app._buildPanelInteractionCommand({
            mode: 'combat',
            actors: [actor],
            targets: [target],
            action,
            source: 'panel-card',
            constraints: { requireCurrentTurn: true, hostileOnly: true, checkReach: true, checkRows: true }
        });
        return app._dispatchInteractionCommand(command);
    },

    executeAction(app, action, creatureIndex) {
        const target = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0)[creatureIndex];
        if (!target) return false;
        return app.executeActionOnTarget(action, target.id || target.name);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_TARGETING = YAW_COMBAT_TARGETING;
}
