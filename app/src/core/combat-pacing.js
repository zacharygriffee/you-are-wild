/**
 * YOU ARE WILD COMBAT EVENT PACING V1
 * Presentation-only delay between automatic committed combat events.
 */

const YAW_COMBAT_PACING = {
    MODES: new Set(['instant', 'fast', 'readable']),

    mode(app) {
        const requested = String(app?.settings?.combatPacing || 'readable');
        return this.MODES.has(requested) ? requested : 'readable';
    },

    delayMs(app, text = '', options = {}) {
        if (options.instant === true || this.mode(app) === 'instant') return 0;
        const mode = this.mode(app);
        const charactersPerSecond = Math.max(10, Math.min(120, Math.floor(Number(app?.settings?.combatReadSpeed) || 32)));
        const length = Math.max(12, Math.min(240, String(text || '').trim().length));
        const readable = Math.round((length / charactersPerSecond) * 1000);
        return mode === 'fast'
            ? Math.max(80, Math.min(500, Math.round(readable * 0.3)))
            : Math.max(250, Math.min(2400, readable));
    },

    render(app) {
        app?.renderDesktopCombatComposer?.(app._currentCombatActor?.() || app.activeActor);
        app?.renderMobileCombatToolbelt?.();
    },

    isHeld(app) {
        return Boolean(app?.combatState?.active && app.combatState.presentationHeld);
    },

    presentationControls(app, { compact = false, bare = false, iconOnly = false } = {}) {
        if (!app?.combatState?.active) return '';
        const held = this.isHeld(app);
        const pending = Boolean(app.combatState.presentationPending);
        const label = held
            ? app._label('combat.agency.resume', 'Resume auto')
            : app._label('combat.agency.hold', 'Pause auto');
        const title = held
            ? app._label('combat.agency.resumeTitle', 'Resume automatic combat presentation')
            : app._label('combat.agency.holdTitle', 'Pause automatic combat presentation at the next safe boundary');
        const state = held ? 'held' : (pending ? 'pending' : 'ready');
        const classes = `action-btn combat-presentation-toggle${held ? ' primary' : ''}${compact ? ' compact-secondary' : ''}`;
        const visibleLabel = iconOnly ? '' : ` ${app._escapeHtml(label)}`;
        const button = `<button type="button" class="${classes}" data-command-surface="combat-presentation" data-command-mode="combat" data-command-control="presentation-hold" data-presentation-state="${state}" aria-pressed="${held ? 'true' : 'false'}" title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}" onclick="event.stopPropagation();App.toggleCombatPresentationHold()"><span aria-hidden="true">${held ? '▶' : '⏸'}</span>${visibleLabel}</button>`;
        if (bare) return button;
        return `<div class="combat-presentation-controls" data-presentation-state="${state}" role="group" aria-label="${app._escapeHtml(app._label('combat.agency.controls', 'Automatic combat presentation'))}">${button}</div>`;
    },

    clearPending(app) {
        const state = app?.combatState;
        if (!state) return;
        const timer = state.presentationTimer;
        if (timer != null && typeof clearTimeout !== 'undefined') clearTimeout(timer);
        state.presentationToken = Math.max(0, Number(state.presentationToken) || 0) + 1;
        state.presentationTimer = null;
        state.presentationPending = false;
        state.presentationCallback = null;
        state.presentationText = '';
        state.presentationOptions = null;
    },

    commitPending(app, token, expectedState = app?.combatState) {
        const state = app?.combatState;
        if (!state || state !== expectedState || token !== state.presentationToken || !state.presentationPending) return false;
        const callback = state.presentationCallback;
        state.presentationTimer = null;
        state.presentationPending = false;
        state.presentationCallback = null;
        state.presentationText = '';
        state.presentationOptions = null;
        if (!state.active || typeof callback !== 'function') return false;
        callback();
        return true;
    },

    arm(app) {
        const state = app?.combatState;
        if (!state?.active || typeof state.presentationCallback !== 'function') return false;
        if (state.presentationHeld) {
            state.presentationPending = true;
            state.presentationTimer = null;
            this.render(app);
            return true;
        }
        const delay = this.delayMs(app, state.presentationText, state.presentationOptions || {});
        const token = Math.max(0, Number(state.presentationToken) || 0) + 1;
        state.presentationToken = token;
        state.presentationPending = true;
        if (delay <= 0 || typeof setTimeout === 'undefined') {
            return this.commitPending(app, token, state);
        }
        state.presentationTimer = setTimeout(() => this.commitPending(app, token, state), delay);
        this.render(app);
        return true;
    },

    schedule(app, callback, text = '', options = {}) {
        if (typeof callback !== 'function' || !app?.combatState?.active) return false;
        const held = this.isHeld(app);
        this.clearPending(app);
        app.combatState.presentationHeld = held;
        app.combatState.presentationCallback = callback;
        app.combatState.presentationText = String(text || '');
        app.combatState.presentationOptions = { ...options };
        app.combatState.presentationPending = true;
        return this.arm(app);
    },

    hold(app) {
        const state = app?.combatState;
        if (!state?.active) return false;
        if (state.presentationHeld) return true;
        state.presentationHeld = true;
        if (state.presentationTimer != null && typeof clearTimeout !== 'undefined') {
            clearTimeout(state.presentationTimer);
            state.presentationTimer = null;
            state.presentationToken = Math.max(0, Number(state.presentationToken) || 0) + 1;
        }
        this.render(app);
        return true;
    },

    resume(app) {
        const state = app?.combatState;
        if (!state?.active || !state.presentationHeld) return false;
        state.presentationHeld = false;
        if (state.presentationPending && typeof state.presentationCallback === 'function') {
            return this.arm(app);
        }
        this.render(app);
        return true;
    },

    toggleHold(app) {
        return this.isHeld(app) ? this.resume(app) : this.hold(app);
    },

    cancel(app) {
        if (!app?.combatState) return;
        this.clearPending(app);
        app.combatState.presentationHeld = false;
        app.combatState.companionIntentPreview = null;
        app.combatState.companionIntentTransaction = null;
    },

    advance(app, callback, options = {}) {
        const latest = app?.log?.at?.(-1)?.text || '';
        return this.schedule(app, callback, latest, options);
    }
};

if (typeof window !== 'undefined') window.YAW_COMBAT_PACING = YAW_COMBAT_PACING;
