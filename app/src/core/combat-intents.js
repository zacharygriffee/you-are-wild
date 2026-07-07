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
        if (action === 'fight' || action === 'flirt' || action === 'fuck' || action === 'feast' || action === 'scavenge') {
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
            app.showSyncMenu();
            return true;
        }
        if (action === 'moveRow') {
            app.moveCombatRow();
            return true;
        }
        if (action === 'flee' && current.name === app.player?.name) {
            app.attemptFlee();
            return true;
        }
        if (action === 'skip') {
            app.nextTurn();
            return true;
        }
        return false;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_INTENTS = YAW_COMBAT_INTENTS;
}
