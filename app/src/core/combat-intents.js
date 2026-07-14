/**
 * YOU ARE WILD COMBAT INTENTS
 * Shared combat intent dispatcher for panel and toolbelt controls.
 */

const YAW_COMBAT_INTENTS = {
    execute(app, action, actor = app.activeActor || app._currentCombatActor()) {
        if (!app.combatState.active) {
            app.log.push({ text: app._label('combat.notInCombat', 'Not in combat!'), type: 'combat' });
            app.renderLog();
            return false;
        }
        if (app.combatState.processing) {
            app.log.push({ text: app._label('combat.waitForTurn', 'Wait for your turn!'), type: 'combat' });
            app.renderLog();
            return false;
        }
        const currentEntry = app.combatState.turnQueue[app.combatState.currentTurn];
        const current = currentEntry ? (currentEntry.unit || currentEntry) : null;
        const isCurrentActor = current && actor && app._unitSelectionId(current) === app._unitSelectionId(actor);
        const isControllable = current && app.party.includes(current) && (current.name === app.player?.name || current.obedient !== false);
        if (!isCurrentActor || !isControllable) {
            app.log.push({ text: app._label('combat.notYourTurn', 'Not your turn!'), type: 'combat' });
            app.renderLog();
            return false;
        }
        app.activeActor = current;
        if (action === 'skip') {
            app._clearTransientInteractionState?.();
            app.nextTurn();
            return true;
        }
        const pressure = app._canAffordActionPressure?.(action, current, { mode: 'combat' }) || { ok: true };
        if (!pressure.ok) {
            app.combatCorrectionMessage = { text: pressure.text, reason: pressure.reason || 'cost-blocked', action, time: Date.now() };
            app._pushLog?.(pressure.text, 'combat', { actor: current, action, phase: pressure.reason || 'cost-blocked' });
            app.emitStoryResult?.({
                mode: 'combat',
                actors: [current],
                targets: [],
                action,
                tags: ['hunger', 'blocked'],
                source: 'balance-system'
            }, pressure.text, {
                mode: 'combat',
                resultKind: 'failure',
                importance: 'hint',
                tags: ['hunger', 'blocked'],
                source: 'balance-system'
            });
            app._renderInteractionState?.({ exploration: false, toolbelt: true });
            app.renderLog();
            return false;
        }
        if (action === 'fight' || action === 'flirt' || action === 'fuck' || action === 'feast' || action === 'scavenge') {
            if (action !== 'scavenge' && YAW_COMBAT_PLANNING.shouldPlanIntent(app)) {
                if (!YAW_COMBAT_PLANNING.requiresCommit(app)) {
                    if (app._combatMarkedTarget?.()) {
                        return app._executeCombatIntentOnMarkedTarget(action, current);
                    }
                    app.selectTarget(action);
                    return true;
                }
                return app.setCombatPlanIntent(action);
            }
            if (action !== 'scavenge' && app._isCombatGroupCompose?.() && (app._syncSelectedParticipants?.() || []).length > 1) {
                return app.queueCombatGroupIntent(action);
            }
            if (action !== 'scavenge' && app._combatMarkedTarget?.()) {
                return app._executeCombatIntentOnMarkedTarget(action, current);
            }
            const currentActorId = app._unitSelectionId(current);
            if (app.targetSelection?.source === 'combat'
                && app.targetSelection.action === action
                && (!app.targetSelection.actorId || app.targetSelection.actorId === currentActorId || app.targetSelection.actorId === current.id || app.targetSelection.actorId === current.name)) {
                app.cancelTargetSelection();
                return true;
            }
            app.selectTarget(action);
            return true;
        }
        if (action === 'feed') {
            if (YAW_COMBAT_PLANNING.shouldPlanIntent(app)) {
                return app.setCombatPlanIntent(action);
            }
            if (app._isCombatGroupCompose?.() && (app._syncSelectedParticipants?.() || []).length > 1) {
                return app.queueCombatGroupIntent(action);
            }
            app.combatTargetId = null;
            app.combatTargetIds = [];
            return app._dispatchPanelInteraction({
                mode: 'combat',
                actors: [current],
                targets: [],
                action: 'feed',
                source: 'combat-composer',
                targetType: 'party'
            });
        }
        if (action === 'sync') {
            app.combatTargetId = null;
            app.combatTargetIds = [];
            app.combatPlanSelection = null;
            app.showSyncMenu();
            return true;
        }
        if (action === 'moveRow') {
            app.combatTargetId = null;
            app.combatTargetIds = [];
            app.combatPlanSelection = null;
            app.moveCombatRow();
            return true;
        }
        if (action === 'flee') {
            app.combatTargetId = null;
            app.combatTargetIds = [];
            app.combatPlanSelection = null;
            app.attemptFlee(current);
            return true;
        }
        return false;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_INTENTS = YAW_COMBAT_INTENTS;
}
