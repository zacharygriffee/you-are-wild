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
        if (app.combatState?.active) app.renderDesktopCombatComposer?.(this.combatActor(app));
        this.renderSelectionSentence(app);
    },

    unitNames(app, units = [], fallback = '') {
        const names = (units || [])
            .map(unit => unit === app.player ? app._label('party.you', 'You') : (unit?.name || unit?.species || ''))
            .filter(Boolean);
        return names.length ? names.join(' + ') : fallback;
    },

    actionLabel(app, action, fallback = 'Choose') {
        if (!action) return fallback;
        return app._uiLabel ? app._uiLabel(action) : action;
    },

    explorationSentence(app) {
        const actorState = app._selectedExplorationActorState
            ? app._selectedExplorationActorState({ allowFallback: true })
            : { actors: [app.player].filter(Boolean), valid: Boolean(app.player) };
        const targets = app._getExplorationTargets ? app._getExplorationTargets() : [];
        const actorLabel = app._label('target.actors', 'Actors');
        const targetLabel = app._label('target.targets', 'Targets');
        const intentLabel = app._label('target.intent', 'Intent');
        const actorText = actorState.valid
            ? this.unitNames(app, actorState.actors, app._label('target.none', 'None'))
            : app._label('target.invalidActorSummary', 'Select a living actor');
        const parts = [{ label: actorLabel, value: actorText }];
        if (targets.length > 0) {
            parts.push({ label: targetLabel, value: this.unitNames(app, targets, app._label('target.none', 'None')) });
            parts.push({ label: intentLabel, value: app._label('ui.chooseAction', 'Choose') });
        }
        return parts;
    },

    combatActor(app) {
        return app.activeActor || (app._currentCombatActor ? app._currentCombatActor() : null) || app.player || null;
    },

    combatSentence(app) {
        const actor = this.combatActor(app);
        const actorLabel = app._label('target.actors', 'Actors');
        const targetLabel = app._label('target.targets', 'Targets');
        const intentLabel = app._label('target.intent', 'Intent');
        const parts = [{
            label: actorLabel,
            value: this.unitNames(app, [actor].filter(Boolean), app._label('target.none', 'None'))
        }];
        let targetText = '';
        let intentText = app._label('ui.chooseAction', 'Choose');
        if (app.syncSelection?.active) {
            const participants = this.syncSelectedParticipants(app);
            if (participants.length > 0) {
                parts[0].value = this.unitNames(app, participants, parts[0].value);
            }
            intentText = this.actionLabel(app, app.syncSelection.type, app._label('action.sync', 'Sync'));
            if (app.syncSelection.phase === 'target') {
                targetText = app._label('target.pickTarget', 'Pick target');
            }
        } else if (app.feedSelection?.active) {
            intentText = app._label('feed.optionsTitle', 'Feed Options');
        } else if (app.targetSelection?.source === 'combat') {
            intentText = this.actionLabel(app, app.targetSelection.action, app._label('ui.chooseAction', 'Choose'));
            targetText = app._label('target.pickTarget', 'Pick target');
        }
        if (targetText) parts.push({ label: targetLabel, value: targetText });
        parts.push({ label: intentLabel, value: intentText });
        return parts;
    },

    selectionSentence(app) {
        return app.combatState?.active ? this.combatSentence(app) : this.explorationSentence(app);
    },

    sentenceHtml(app, parts = []) {
        if (!parts.length) return '';
        return parts.map((part, index) => {
            const arrow = index === 0 ? '' : '<span class="selection-sentence-arrow" aria-hidden="true">-&gt;</span>';
            return `${arrow}<span class="selection-sentence-part"><span class="selection-sentence-label">${app._escapeHtml(part.label)}</span><span class="selection-sentence-value">${app._escapeHtml(part.value)}</span></span>`;
        }).join('');
    },

    renderSelectionSentence(app) {
        const html = this.sentenceHtml(app, this.selectionSentence(app));
        const desktop = document.getElementById('selection-sentence');
        const hasTargets = !app.combatState?.active && (app._getExplorationTargets?.() || []).length > 0;
        const hasExplicitActors = !app.combatState?.active && Boolean(app.explorationActorSelectionExplicit);
        const actorState = !app.combatState?.active && app._selectedExplorationActorState
            ? app._selectedExplorationActorState({ allowFallback: true })
            : null;
        const hasInvalidActors = Boolean(actorState && !actorState.valid);
        const hasCombatTransient = Boolean(app.combatState?.active && (
            app.targetSelection?.source === 'combat' ||
            app.syncSelection?.active ||
            app.feedSelection?.active
        ));
        const hasCombatTurn = Boolean(app.combatState?.active && this.combatActor(app));
        if (desktop) desktop.innerHTML = hasTargets || hasExplicitActors || hasInvalidActors || hasCombatTransient || hasCombatTurn ? html : '';
        const mobile = document.getElementById('mobile-selection-sentence');
        if (mobile) {
            mobile.innerHTML = hasTargets || hasExplicitActors || hasInvalidActors ? html : '';
        }
        return html;
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
