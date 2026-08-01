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

    schedule(app, callback, text = '', options = {}) {
        if (typeof callback !== 'function') return false;
        this.cancel(app);
        const delay = this.delayMs(app, text, options);
        if (delay <= 0 || typeof setTimeout === 'undefined') {
            callback();
            return true;
        }
        app.combatState.presentationPending = true;
        app.combatState.presentationTimer = setTimeout(() => {
            app.combatState.presentationTimer = null;
            app.combatState.presentationPending = false;
            if (app.combatState.active) callback();
        }, delay);
        return true;
    },

    cancel(app) {
        const timer = app?.combatState?.presentationTimer;
        if (timer != null && typeof clearTimeout !== 'undefined') clearTimeout(timer);
        if (app?.combatState) {
            app.combatState.presentationTimer = null;
            app.combatState.presentationPending = false;
        }
    },

    advance(app, callback, options = {}) {
        const latest = app?.log?.at?.(-1)?.text || '';
        return this.schedule(app, callback, latest, options);
    }
};

if (typeof window !== 'undefined') window.YAW_COMBAT_PACING = YAW_COMBAT_PACING;
