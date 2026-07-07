/**
 * YOU ARE WILD INTERACTION STATE
 * Shared actor-target-intent selection and command composer refresh helpers.
 */

const YAW_INTERACTION_STATE = {
    clearTransient(app) {
        app.targetSelection = null;
        app.combatTargetId = null;
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
        if (action === 'choose') return fallback;
        if (String(action).startsWith('sync_')) {
            const base = String(action).replace(/^sync_/, '');
            return app._label(`combat.sync.action.${base}`, fallback);
        }
        return app._uiLabel ? app._uiLabel(action) : action;
    },

    actorLabel(app, count = 1) {
        return count === 1
            ? app._label('target.actorRole', 'Actor')
            : app._label('target.actors', 'Actors');
    },

    targetLabel(app, count = 1) {
        return count === 1
            ? app._label('target.targetRole', 'Target')
            : app._label('target.targets', 'Targets');
    },

    explorationSentence(app) {
        const actorState = app._selectedExplorationActorState
            ? app._selectedExplorationActorState({ allowFallback: true })
            : { actors: [app.player].filter(Boolean), valid: Boolean(app.player) };
        const targets = app._getExplorationTargets ? app._getExplorationTargets() : [];
        const focusedObject = targets.length === 0 ? app.focusedStageObject : null;
        const actorLabel = this.actorLabel(app, actorState.actors?.length || 1);
        const targetLabel = this.targetLabel(app, targets.length || 1);
        const intentLabel = app._label('target.intent', 'Intent');
        const actorText = actorState.valid
            ? this.unitNames(app, actorState.actors, app._label('target.none', 'None'))
            : app._label('target.invalidActorSummary', 'Select a living actor');
        const actorCount = actorState.valid ? (actorState.actors?.length || 0) : 0;
        const parts = [{ slot: 'actor', label: actorLabel, value: actorText, count: actorCount }];
        if (targets.length > 0) {
            parts.push({ slot: 'target', label: targetLabel, value: this.unitNames(app, targets, app._label('target.none', 'None')), count: targets.length });
            parts.push({ slot: 'intent', label: intentLabel, value: app._label('ui.chooseAction', 'Choose'), intent: 'choose' });
        } else if (focusedObject?.name) {
            const intent = focusedObject.intent || 'choose';
            parts.push({ slot: 'target', label: app._label('target.targetRole', 'Target'), value: focusedObject.name, count: 1 });
            parts.push({ slot: 'intent', label: intentLabel, value: this.actionLabel(app, intent, app._label('ui.chooseAction', 'Choose')), intent });
        }
        return parts;
    },

    combatActor(app) {
        return app.activeActor || (app._currentCombatActor ? app._currentCombatActor() : null) || app.player || null;
    },

    combatSentence(app) {
        const actor = this.combatActor(app);
        const intentLabel = app._label('target.intent', 'Intent');
        let actorCount = actor ? 1 : 0;
        const parts = [{
            slot: 'actor',
            label: this.actorLabel(app, actorCount || 1),
            value: this.unitNames(app, [actor].filter(Boolean), app._label('target.none', 'None')),
            count: actorCount
        }];
        let targetText = '';
        let targetCount = 0;
        let intentText = app._label('ui.chooseAction', 'Choose');
        let intentId = 'choose';
        if (app.syncSelection?.active) {
            const participants = this.syncSelectedParticipants(app);
            if (participants.length > 0) {
                actorCount = participants.length;
                parts[0].label = this.actorLabel(app, actorCount);
                parts[0].value = this.unitNames(app, participants, parts[0].value);
                parts[0].count = actorCount;
            }
            intentId = app.syncSelection.type || 'sync';
            intentText = this.actionLabel(app, app.syncSelection.type, app._label('action.sync', 'Sync'));
            if (app.syncSelection.phase === 'target') {
                targetText = app._label('target.pickTarget', 'Pick target');
            }
        } else if (app.feedSelection?.active) {
            intentId = 'feed';
            intentText = app._label('feed.optionsTitle', 'Feed Options');
        } else if (app.targetSelection?.source === 'combat') {
            intentId = app.targetSelection.action || 'choose';
            intentText = this.actionLabel(app, app.targetSelection.action, app._label('ui.chooseAction', 'Choose'));
            targetText = app._label('target.pickTarget', 'Pick target');
        } else {
            const markedTarget = app._combatMarkedTarget?.();
            if (markedTarget) {
                targetText = this.unitNames(app, [markedTarget], app._label('target.none', 'None'));
                targetCount = 1;
            }
        }
        if (targetText) parts.push({ slot: 'target', label: this.targetLabel(app, 1), value: targetText, count: targetCount });
        parts.push({ slot: 'intent', label: intentLabel, value: intentText, intent: intentId });
        return parts;
    },

    selectionSentence(app) {
        return app.combatState?.active ? this.combatSentence(app) : this.explorationSentence(app);
    },

    sentenceHtml(app, parts = []) {
        if (!parts.length) return '';
        return parts.map((part, index) => {
            const arrow = index === 0 ? '' : '<span class="selection-sentence-arrow" aria-hidden="true">-&gt;</span>';
            const slot = app._escapeHtml(part.slot || 'unknown');
            const countAttr = Number.isFinite(part.count) ? ` data-command-count="${app._escapeHtml(String(part.count))}"` : '';
            const intentAttr = part.intent ? ` data-command-intent="${app._escapeHtml(part.intent)}"` : '';
            return `${arrow}<span class="selection-sentence-part" data-command-slot="${slot}"${countAttr}${intentAttr}><span class="selection-sentence-label">${app._escapeHtml(part.label)}</span><span class="selection-sentence-value">${app._escapeHtml(part.value)}</span></span>`;
        }).join('');
    },

    sentenceMeta(parts = []) {
        const actor = parts.find(part => part.slot === 'actor');
        const target = parts.find(part => part.slot === 'target');
        const intent = parts.find(part => part.slot === 'intent');
        return {
            actorCount: Number.isFinite(actor?.count) ? actor.count : 0,
            targetCount: Number.isFinite(target?.count) ? target.count : 0,
            intent: intent?.intent || 'choose'
        };
    },

    setSentenceSlot(slot, html, mode, meta = {}) {
        if (!slot) return;
        slot.innerHTML = html || '';
        if (html) {
            slot.setAttribute('data-command-surface', 'command-sentence');
            slot.setAttribute('data-command-mode', mode);
            slot.setAttribute('data-command-grammar', 'actor-target-intent');
            slot.setAttribute('data-command-actor-count', String(meta.actorCount ?? 0));
            slot.setAttribute('data-command-target-count', String(meta.targetCount ?? 0));
            slot.setAttribute('data-command-intent', meta.intent || 'choose');
        } else {
            slot.removeAttribute('data-command-surface');
            slot.removeAttribute('data-command-mode');
            slot.removeAttribute('data-command-grammar');
            slot.removeAttribute('data-command-actor-count');
            slot.removeAttribute('data-command-target-count');
            slot.removeAttribute('data-command-intent');
        }
    },

    renderSelectionSentence(app) {
        const parts = this.selectionSentence(app);
        const html = this.sentenceHtml(app, parts);
        const meta = this.sentenceMeta(parts);
        const desktop = document.getElementById('selection-sentence');
        const mode = app.combatState?.active ? 'combat' : 'exploration';
        const hasTargets = !app.combatState?.active && (app._getExplorationTargets?.() || []).length > 0;
        const hasFocusedObject = !app.combatState?.active && Boolean(app.focusedStageObject?.name);
        const hasExplicitActors = !app.combatState?.active && Boolean(app.explorationActorSelectionExplicit);
        const actorState = !app.combatState?.active && app._selectedExplorationActorState
            ? app._selectedExplorationActorState({ allowFallback: true })
            : null;
        const hasInvalidActors = Boolean(actorState && !actorState.valid);
        const hasCombatTransient = Boolean(app.combatState?.active && (
            app.targetSelection?.source === 'combat' ||
            app._combatMarkedTarget?.() ||
            app.syncSelection?.active ||
            app.feedSelection?.active
        ));
        const hasCombatTurn = Boolean(app.combatState?.active && this.combatActor(app));
        this.setSentenceSlot(desktop, hasTargets || hasFocusedObject || hasExplicitActors || hasInvalidActors || hasCombatTransient || hasCombatTurn ? html : '', mode, meta);
        const mobile = document.getElementById('mobile-selection-sentence');
        this.setSentenceSlot(mobile, hasTargets || hasFocusedObject || hasExplicitActors || hasInvalidActors ? html : '', 'exploration', meta);
        if (typeof YAW_SCENE_SHELL !== 'undefined') YAW_SCENE_SHELL.syncDesktopCommandComposer?.();
        if (!app.combatState?.active) app.renderMobileExplorationControls?.();
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
