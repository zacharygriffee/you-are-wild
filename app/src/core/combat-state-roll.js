/**
 * YOU ARE WILD COMBAT STATE ROLL
 * Deterministic combat-scoped roll seeds for AI, status, terrain, and movement outcomes.
 */

const YAW_COMBAT_STATE_ROLL = {
    roll(app, namespace, unit = null, purpose = 'roll') {
        const x = Number(app.location?.x ?? 0);
        const y = Number(app.location?.y ?? 0);
        const unitId = app._unitSelectionId(unit || {});
        return app._worldRoll(
            namespace,
            x,
            y,
            unitId,
            app.combatState.round || 0,
            app.combatState.currentTurn || 0,
            app.dayCount || 0,
            app.timeHour || 0,
            purpose
        );
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_STATE_ROLL = YAW_COMBAT_STATE_ROLL;
}
