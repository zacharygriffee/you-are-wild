/**
 * YOU ARE WILD INTERACTION STATE
 * Shared transient selection and refresh helpers for panel-first controls.
 */

const YAW_INTERACTION_STATE = {
    clearTransient(app) {
        app.targetSelection = null;
        app.syncSelection = null;
        app.feedSelection = null;
        app._syncSelected = [];
        app._syncParticipants = null;
        app._syncType = null;
    },

    render(app, options = {}) {
        const includeExploration = options.exploration ?? !app.combatState?.active;
        const includeToolbelt = options.toolbelt ?? Boolean(app.combatState?.active);
        app.renderParty();
        app.renderCreatures();
        if (includeExploration) app.renderExplorationActions();
        if (includeToolbelt) app.renderMobileCombatToolbelt();
    },

    syncSelectedParticipants(app) {
        if (!app.syncSelection?.active) return [];
        const ids = app.syncSelection.participantIds || [];
        return ids.map(id => app.party.find(unit => app._unitSelectionId(unit) === id || unit.id === id || unit.name === id)).filter(Boolean);
    },

    isSyncParticipant(app, unit) {
        if (!unit || !app.syncSelection?.active) return false;
        const id = app._unitSelectionId(unit);
        return (app.syncSelection.participantIds || []).includes(id);
    },

    toggleSyncParticipantById(app, id) {
        if (!app.syncSelection?.active || app.syncSelection.phase !== 'participants') return false;
        const participantIds = app.syncSelection.participantIds || [];
        const actorId = app.syncSelection.actorId;
        if (id === actorId) return false;
        app.syncSelection.participantIds = participantIds.includes(id)
            ? participantIds.filter(existing => existing !== id)
            : [...participantIds, id];
        app._syncSelected = app.syncSelection.participantIds
            .map(pid => app.party.find(unit => app._unitSelectionId(unit) === pid))
            .map(unit => app.party.indexOf(unit))
            .filter(index => index >= 0);
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_INTERACTION_STATE = YAW_INTERACTION_STATE;
}
