/**
 * YOU ARE WILD COMBAT TARGETING
 * Enemy target-pick state, reach validation, and panel target dispatch.
 */

const YAW_COMBAT_TARGETING = {
    selectTarget(app, action) {
        const actor = app.activeActor || app.player;
        app.combatCorrectionMessage = null;
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.combatPlanSelection = null;
        app.targetSelection = { action, source: 'combat', actorId: actor?.id || actor?.name || 'player' };
        app._clearCenterActionsForCombat();
        app.renderCombatSceneForTurn(actor);
        app._renderInteractionState({ exploration: false, toolbelt: true });
    },

    cancelTargetSelection(app) {
        app.combatCorrectionMessage = null;
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
            return unit.disposition === app.DISPOSITION.ENEMY && Boolean(app._combatReachResult?.(actor, unit, app.targetSelection.action)?.canSucceed);
        }
        if (unit.CPun <= 0 && !app._isCorpse(unit)) return false;
        return unit.disposition !== app.DISPOSITION.PARTY;
    },

    targetIds(app) {
        const ids = Array.isArray(app.combatTargetIds)
            ? app.combatTargetIds.map(id => String(id)).filter(Boolean)
            : [];
        if (app.combatTargetId && !ids.includes(String(app.combatTargetId))) ids.unshift(String(app.combatTargetId));
        const validIds = ids.filter(id => app.creatures.some(unit => unit
            && unit.CPun > 0
            && unit.disposition === app.DISPOSITION.ENEMY
            && (app._unitSelectionId(unit) === id || String(unit.id || unit.name) === id)));
        app.combatTargetIds = [...new Set(validIds)];
        app.combatTargetId = app.combatTargetIds[0] || null;
        return app.combatTargetIds;
    },

    markedTargets(app) {
        if (!app.combatState?.active) return [];
        const ids = this.targetIds(app);
        return ids.map(targetId => app.creatures.find(unit => {
            if (!unit || unit.CPun <= 0 || unit.disposition !== app.DISPOSITION.ENEMY) return false;
            return app._unitSelectionId(unit) === targetId || String(unit.id || unit.name) === targetId;
        })).filter(Boolean);
    },

    markedTarget(app) {
        return this.markedTargets(app)[0] || null;
    },

    isMarkedTarget(app, unit) {
        if (!unit) return false;
        const unitIds = [app._unitSelectionId(unit), String(unit.id || unit.name)];
        return this.targetIds(app).some(targetId => unitIds.includes(targetId));
    },

    toggleMarkedTarget(app, targetId) {
        const targetPickActive = app.targetSelection?.source === 'combat' && app.targetSelection.action !== 'scavenge';
        const composeActive = app._isCombatGroupCompose?.() || false;
        if (!app.combatState?.active || (app.syncSelection?.active && !composeActive) || app.feedSelection?.active) return false;
        if (app.targetSelection && !targetPickActive) return false;
        const id = String(targetId || '');
        const target = app.creatures.find(unit => unit
            && unit.CPun > 0
            && unit.disposition === app.DISPOSITION.ENEMY
            && (app._unitSelectionId(unit) === id || String(unit.id || unit.name) === id));
        if (!target) return false;
        if (targetPickActive && !this.canSelectCreatureTarget(app, target)) return false;
        app.combatCorrectionMessage = null;
        const unitId = app._unitSelectionId(target);
        if (targetPickActive) {
            app.combatTargetIds = [unitId];
            app.combatTargetId = unitId;
            return this.executeIntentOnMarkedTarget(app, app.targetSelection.action, app.activeActor || app._currentCombatActor() || app.player);
        }
        const ids = this.targetIds(app);
        app.combatTargetIds = ids.includes(unitId)
            ? ids.filter(existing => existing !== unitId)
            : [...ids, unitId];
        app.combatTargetId = app.combatTargetIds[0] || null;
        app._clearCenterActionsForCombat();
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    confirmMarkedTargetSelection(app, actor = app.activeActor || app._currentCombatActor() || app.player) {
        if (app.targetSelection?.source !== 'combat') return false;
        const action = app.targetSelection.action;
        if (!action || action === 'scavenge') return false;
        if (!this.markedTargets(app).length) {
            app._reportInvalidCombatCommand?.({ action, actors: [actor], targets: [] }, 'missing-target');
            return false;
        }
        return this.executeIntentOnMarkedTarget(app, action, actor);
    },

    executeIntentOnMarkedTarget(app, action, actor = app.activeActor || app._currentCombatActor() || app.player) {
        const targets = this.markedTargets(app);
        if (!targets.length) return false;
        if (app._isCombatGroupCompose?.() && (app._syncSelectedParticipants?.() || []).length > 1) {
            return app.queueCombatGroupIntent(action);
        }
        const command = app._buildPanelInteractionCommand({
            mode: 'combat',
            actors: [actor],
            targets,
            action,
            source: 'combat-composer',
            constraints: { requireCurrentTurn: true, hostileOnly: true, checkReach: true, checkRows: true }
        });
        const valid = app._validateInteractionCommand(command);
        if (!valid.ok) {
            app._reportInvalidCombatCommand(command, valid.reason);
            return false;
        }
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.targetSelection = null;
        app.combatPlanSelection = null;
        return app._dispatchInteractionCommand(command);
    },

    syncBaseAction(syncType) {
        return String(syncType || 'sync_fight').replace(/^sync_/, '') || 'fight';
    },

    canSyncTarget(app, participants, target, syncType = 'sync_fight') {
        const livingParticipants = (participants || []).filter(unit => unit && unit.CPun > 0);
        if (!target || target.CPun <= 0 || target.disposition !== app.DISPOSITION.ENEMY) return false;
        if (livingParticipants.length < 2) return false;
        const action = this.syncBaseAction(syncType);
        if (app._isPhysicalCombatAction?.(action)) {
            return livingParticipants.every(unit => app._combatReachResult?.(unit, target, action)?.canSucceed);
        }
        return livingParticipants.every(unit => app._canAttemptCombatTarget(unit, target, action));
    },

    reachWarning(app, actors = [], unit, action) {
        const actorList = (Array.isArray(actors) ? actors : [actors]).filter(Boolean);
        if (!unit || !actorList.length) return null;
        const physical = app._isPhysicalCombatAction?.(action);
        if (!physical) return null;
        const results = actorList.map(actor => app._combatReachResult?.(actor, unit, action)).filter(Boolean);
        if (results.some(result => result.canSucceed)) return null;
        return results.find(result => result.canAttempt) || null;
    },

    targetPickHint(app, unit, action, canTarget = this.canSelectCreatureTarget(app, unit)) {
        const name = unit?.name || app._label('unit.generic', 'unit');
        const syncActive = Boolean(app.syncSelection?.active && app.syncSelection.phase === 'target');
        const effectiveAction = syncActive ? this.syncBaseAction(app.syncSelection.type) : action;
        const actionLabel = syncActive
            ? app._label('action.sync', 'Sync')
            : app._uiLabel(action || 'action');
        const actors = syncActive
            ? (app._syncParticipants || app._syncSelectedParticipants?.() || [])
            : [app.activeActor || app.player].filter(Boolean);
        const warning = this.reachWarning(app, actors, unit, effectiveAction);
        if (warning) {
            return app._combatReachFailureText?.(actors, unit, effectiveAction, warning)
                || app._label('target.likelyFails', 'You can try {action} on {name}, but it may not connect.', { name, action: actionLabel });
        }
        if (canTarget) {
            return app._label('target.selectAs', 'Select {name} as {action} target', { name, action: actionLabel });
        }
        return app._label('target.cannotSelectAs', 'Cannot select {name} as {action} target', { name, action: actionLabel });
    },

    targetPickLabel(app, unit, action, canTarget = this.canSelectCreatureTarget(app, unit)) {
        if (canTarget && unit) {
            const syncActive = Boolean(app.syncSelection?.active && app.syncSelection.phase === 'target');
            const effectiveAction = syncActive ? this.syncBaseAction(app.syncSelection.type) : action;
            const actors = syncActive
                ? (app._syncParticipants || app._syncSelectedParticipants?.() || [])
                : [app.activeActor || app.player].filter(Boolean);
            return app._label('target.pick', 'Pick');
        }
        if (!unit) return app._label('target.pick', 'Pick');
        const syncActive = Boolean(app.syncSelection?.active && app.syncSelection.phase === 'target');
        const effectiveAction = syncActive ? this.syncBaseAction(app.syncSelection.type) : action;
        const actors = syncActive
            ? (app._syncParticipants || app._syncSelectedParticipants?.() || [])
            : [app.activeActor || app.player].filter(Boolean);
        return app._label('target.unavailable', 'Unavailable');
    },

    executeActionOnTarget(app, action, targetId) {
        const target = app.creatures.find(c => String(c.id || c.name) === String(targetId));
        if (!target) {
            app.cancelTargetSelection();
            return;
        }
        if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
            const participants = app._syncParticipants || app._syncSelectedParticipants();
            const syncType = app.syncSelection.type || action || 'sync_fight';
            const command = app._buildPanelInteractionCommand({
                mode: 'combat',
                actors: participants,
                targets: [target],
                action: syncType,
                source: 'sync-targeting',
                targetType: 'enemy',
                shape: 'many-to-one',
                timing: 'slowest-participant',
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
                metadata: { baseAction: app._syncBaseAction(syncType), phase: 'target' }
            });
            return app._dispatchInteractionCommand(command);
        }
        const actor = app.activeActor || app.player;
        if (app.targetSelection?.source === 'combat' && action !== 'scavenge') {
            if (!this.canSelectCreatureTarget(app, target)) return false;
            app.combatTargetIds = [app._unitSelectionId(target)];
            app.combatTargetId = app.combatTargetIds[0];
            return this.executeIntentOnMarkedTarget(app, action, actor);
        }
        const command = app._buildPanelInteractionCommand({
            mode: 'combat',
            actors: [actor],
            targets: [target],
            action,
            source: 'combat-targeting',
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
