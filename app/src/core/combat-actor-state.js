/**
 * YOU ARE WILD COMBAT ACTOR STATE
 * Current-turn actor lookup and mobile combat prompt coordination.
 */

const YAW_COMBAT_ACTOR_STATE = {
    current(app) {
        if (!app.combatState?.active) return null;
        return app.combatState.turnQueue?.[app.combatState.currentTurn]?.unit || null;
    },

    sanitize(app, options = {}) {
        if (!app.combatState?.active) return false;
        const preserveTurn = options.preserveTurn !== false;
        const previousUnit = app.combatState.turnQueue?.[app.combatState.currentTurn]?.unit || null;
        const validQueue = (app.combatState.turnQueue || [])
            .filter(entry => entry && app._isCombatQueueUnitValid(entry.unit));
        app.combatState.turnQueue = validQueue;
        app.combatState.syncActions = (app.combatState.syncActions || []).map(sync => {
            const participants = (sync.participants || []).filter(unit => app._isCombatQueueUnitValid(unit) && (app.party || []).includes(unit));
            const target = app._isCombatQueueUnitValid(sync.target) && sync.target?.disposition === app.DISPOSITION.ENEMY ? sync.target : null;
            return { ...sync, participants, target };
        }).filter(sync => sync.target && sync.participants.length >= 2 && !sync.resolved);
        if (validQueue.length === 0) {
            app.combatState.currentTurn = 0;
            app.activeActor = null;
        } else if (preserveTurn && previousUnit) {
            const nextIndex = validQueue.findIndex(entry => entry.unit === previousUnit);
            app.combatState.currentTurn = nextIndex >= 0
                ? nextIndex
                : Math.min(Math.max(0, app.combatState.currentTurn || 0), validQueue.length - 1);
        } else {
            app.combatState.currentTurn = Math.min(Math.max(0, app.combatState.currentTurn || 0), validQueue.length - 1);
        }
        app.mode = app.GAME_MODE.COMBAT;
        const current = validQueue[app.combatState.currentTurn]?.unit || null;
        if (current) app.activeActor = current;
        else if (!app._isCombatQueueUnitValid(app.activeActor)) app.activeActor = null;
        return true;
    },

    isCurrent(app, unit) {
        if (!unit || !app.combatState?.active) return false;
        const actor = app.activeActor || this.current(app);
        if (!actor) return false;
        return actor === unit || app._unitSelectionId(actor) === app._unitSelectionId(unit);
    },

    mobilePrompt(app, actor = app._currentCombatActor()) {
        return YAW_MOBILE_COMBAT_TOOLBELT.prompt(app, actor);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_ACTOR_STATE = YAW_COMBAT_ACTOR_STATE;
}
