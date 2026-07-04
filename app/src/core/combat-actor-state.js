/**
 * YOU ARE WILD COMBAT ACTOR STATE
 * Current-turn actor lookup and mobile combat prompt coordination.
 */

const YAW_COMBAT_ACTOR_STATE = {
    current(app) {
        if (!app.combatState?.active) return null;
        return app.combatState.turnQueue?.[app.combatState.currentTurn]?.unit || null;
    },

    mobilePrompt(app, actor = app._currentCombatActor()) {
        return YAW_MOBILE_COMBAT_TOOLBELT.prompt(app, actor);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_ACTOR_STATE = YAW_COMBAT_ACTOR_STATE;
}
