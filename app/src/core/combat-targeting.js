/**
 * YOU ARE WILD COMBAT TARGETING
 * Enemy target-pick state, reach validation, and panel target dispatch.
 */

const YAW_COMBAT_TARGETING = {
    selectTarget(app, action) {
        const actor = app.activeActor || app.player;
        app.targetSelection = { action, source: 'combat', actorId: actor?.id || actor?.name || 'player' };
        app._clearCenterActionsForCombat();
        app.renderCombatSceneForTurn(actor);
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
        if (!unit) return false;
        if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
            const participants = app._syncParticipants || app._syncSelectedParticipants();
            return this.canSyncTarget(app, participants, unit, app.syncSelection.type);
        }
        if (!app.targetSelection) return false;
        if (app.targetSelection.source === 'combat') {
            const actor = app.activeActor || app.player;
            if (app.targetSelection.action === 'scavenge') return app._canScavengeCorpse(unit);
            if (unit.CPun <= 0) return false;
            return unit.disposition === app.DISPOSITION.ENEMY && app._canReachCombatTarget(actor, unit, app.targetSelection.action);
        }
        if (unit.CPun <= 0 && !app._isCorpse(unit)) return false;
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

    targetPickHint(app, unit, action, canTarget = this.canSelectCreatureTarget(app, unit)) {
        const name = unit?.name || app._label('unit.generic', 'unit');
        const syncActive = Boolean(app.syncSelection?.active && app.syncSelection.phase === 'target');
        const effectiveAction = syncActive ? this.syncBaseAction(app.syncSelection.type) : action;
        const actionLabel = syncActive
            ? app._label('action.sync', 'Sync')
            : app._uiLabel(action || 'action');
        if (canTarget) {
            return app._label('target.selectAs', 'Select {name} as {action} target', { name, action: actionLabel });
        }
        const actors = syncActive
            ? (app._syncParticipants || app._syncSelectedParticipants?.() || [])
            : [app.activeActor || app.player].filter(Boolean);
        const physical = app._isPhysicalCombatAction?.(effectiveAction);
        if (physical && unit?.CPun > 0 && unit.disposition === app.DISPOSITION.ENEMY) {
            const anyRanged = actors.some(actor => actor?.flying || actor?.ranged || actor?.antiflying);
            if (unit.flying && !anyRanged) {
                return app._label('target.blockedFlying', '{name} is airborne. Use a flying or ranged actor before choosing {action}.', { name, action: actionLabel });
            }
            if (unit.combatRow === 'back' && !anyRanged) {
                return app._label('target.blockedBackRow', '{name} is in the back row. Use a flying or ranged actor, or move rows before choosing {action}.', { name, action: actionLabel });
            }
        }
        return app._label('target.cannotSelectAs', 'Cannot select {name} as {action} target', { name, action: actionLabel });
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
            constraints: { requireCurrentTurn: true, hostileOnly: action !== 'scavenge', checkReach: action !== 'scavenge', checkRows: action !== 'scavenge' }
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
