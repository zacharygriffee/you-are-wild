/**
 * YOU ARE WILD COMBAT INTENTS
 * Shared combat intent dispatcher for panel and toolbelt controls.
 */

const YAW_COMBAT_INTENTS = {
    execute(app, action, actor = app.activeActor || app._currentCombatActor()) {
        if (!app.combatState.active) {
            app._reportInvalidCombatCommand?.({ mode: 'combat', actors: [actor || app.player].filter(Boolean), targets: [], action, source: 'combat-intent' }, 'not-in-combat');
            return false;
        }
        if (app.combatState.processing) {
            app._reportInvalidCombatCommand?.({ mode: 'combat', actors: [actor || app._currentCombatActor() || app.player].filter(Boolean), targets: [], action, source: 'combat-intent' }, 'resolving');
            return false;
        }
        const currentEntry = app.combatState.turnQueue[app.combatState.currentTurn];
        const current = currentEntry ? (currentEntry.unit || currentEntry) : null;
        const isCurrentActor = current && actor && app._unitSelectionId(current) === app._unitSelectionId(actor);
        const isControllable = current && app.party.includes(current) && (current.name === app.player?.name || current.obedient !== false);
        if (!isCurrentActor || !isControllable) {
            app._reportInvalidCombatCommand?.({ mode: 'combat', actors: [actor || current || app.player].filter(Boolean), targets: [], action, source: 'combat-intent' }, 'not-current-actor');
            return false;
        }
        app.activeActor = current;
        if (action === 'skip') {
            app._clearTransientInteractionState?.();
            app.nextTurn();
            return true;
        }
        if (app._fearState?.(current) === 'terrified') {
            app._clearTransientInteractionState?.();
            app.processTurn();
            return true;
        }
        const pressure = app._canAffordActionPressure?.(action, current, { mode: 'combat' }) || { ok: true };
        if (!pressure.ok) {
            app.combatCorrectionMessage = null;
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
        const actionProfile = typeof YAW_ACTION_PROFILES !== 'undefined'
            ? YAW_ACTION_PROFILES.profile(action)
            : null;
        if (actionProfile) {
            if (actionProfile.scope === 'self') {
                return app._dispatchInteractionCommand(app._buildPanelInteractionCommand({
                    mode: 'combat',
                    actors: [current],
                    targets: [current],
                    action,
                    source: 'combat-composer',
                    constraints: { requireCurrentTurn: true, hostileOnly: false, checkReach: false, checkRows: false }
                }));
            }
            if (app._combatMarkedTarget?.()) return app._executeCombatIntentOnMarkedTarget(action, current);
            const currentActorId = app._unitSelectionId(current);
            if (app.targetSelection?.source === 'combat'
                && app.targetSelection.action === action
                && (!app.targetSelection.actorId || app.targetSelection.actorId === currentActorId)) {
                app.cancelTargetSelection();
                return true;
            }
            app.selectTarget(action);
            return true;
        }
        if (action === 'fight' || action === 'flirt' || action === 'fuck' || action === 'feast' || action === 'scavenge') {
            if (action !== 'scavenge' && YAW_COMBAT_PLANNING.shouldPlanIntent(app)) {
                if (!YAW_COMBAT_PLANNING.requiresCommit(app)) {
                    if (app._combatMarkedTarget?.()) {
                        return app._executeCombatIntentOnMarkedTarget(action, current, { forceChoose: true });
                    }
                    if (action === 'feast' && YAW_COMBAT_FEED.hasAvailableSelfAction(app, action, [current])) {
                        return YAW_COMBAT_FEED.executeVariantAction(app, action, current, null, {
                            actors: [current],
                            scope: 'self',
                            forceChoose: true
                        });
                    }
                    app.selectTarget(action);
                    return true;
                }
                return app.setCombatPlanIntent(action);
            }
            if (action !== 'scavenge' && app._isCombatGroupCompose?.() && (app._syncSelectedParticipants?.() || []).length > 1) {
                const participants = app._syncSelectedParticipants();
                if (action === 'feast' && YAW_COMBAT_FEED.hasAvailableSelfAction(app, action, participants)) {
                    return YAW_COMBAT_FEED.executeVariantAction(app, action, participants[0], null, {
                        actors: participants,
                        scope: 'self',
                        forceChoose: true
                    });
                }
                return app.queueCombatGroupIntent(action, { forceChoose: true });
            }
            if (action !== 'scavenge' && app._combatMarkedTarget?.()) {
                return app._executeCombatIntentOnMarkedTarget(action, current, { forceChoose: true });
            }
            const currentActorId = app._unitSelectionId(current);
            if (app.targetSelection?.source === 'combat'
                && app.targetSelection.action === action
                && (!app.targetSelection.actorId || app.targetSelection.actorId === currentActorId || app.targetSelection.actorId === current.id || app.targetSelection.actorId === current.name)) {
                app.cancelTargetSelection();
                return true;
            }
            if (action === 'feast' && YAW_COMBAT_FEED.hasAvailableSelfAction(app, action, [current])) {
                return YAW_COMBAT_FEED.executeVariantAction(app, action, current, null, {
                    actors: [current],
                    scope: 'self',
                    forceChoose: true
                });
            }
            app.selectTarget(action);
            return true;
        }
        if (action === 'feed') {
            if (YAW_COMBAT_PLANNING.shouldPlanIntent(app)) {
                return app.setCombatPlanIntent(action);
            }
            if (app._isCombatGroupCompose?.() && (app._syncSelectedParticipants?.() || []).length > 1) {
                return app.queueCombatGroupIntent(action, { forceChoose: true });
            }
            if (app._combatMarkedTarget?.()) {
                return app._executeCombatIntentOnMarkedTarget(action, current, { forceChoose: true });
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
