/**
 * YOU ARE WILD ACTION OUTCOME V1
 * Immutable, serializable, post-commit envelopes for public observation.
 */

const YAW_ACTION_OUTCOMES = {
    VERSION: 1,
    SCHEMA: 'yaw-action-outcome-v1',
    MAX_LIST: 32,
    MAX_DEPTH: 5,
    RESULTS: new Set(['committed', 'success', 'partial', 'resisted', 'failed', 'blocked', 'withdrawn']),

    _token(value, fallback = 'unknown') {
        const text = String(value || fallback).trim().slice(0, 120);
        return /^[a-zA-Z0-9_.:-]+$/.test(text) ? text : fallback;
    },

    _credentialLike(value) {
        const compact = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return ['apikey', 'credential', 'authorization', 'accesstoken', 'refreshtoken', 'password', 'secret']
            .some(token => compact.includes(token));
    },

    _safeValue(value, depth = 0) {
        if (depth > this.MAX_DEPTH || value === undefined || typeof value === 'function' || typeof value === 'symbol') return undefined;
        if (value === null || typeof value === 'boolean') return value;
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'string') return value.slice(0, 500);
        if (Array.isArray(value)) {
            return value.slice(0, this.MAX_LIST)
                .map(item => this._safeValue(item, depth + 1))
                .filter(item => item !== undefined);
        }
        if (typeof value !== 'object') return String(value).slice(0, 500);
        const result = {};
        for (const [key, child] of Object.entries(value).slice(0, this.MAX_LIST)) {
            if (this._credentialLike(key)) continue;
            const safe = this._safeValue(child, depth + 1);
            if (safe !== undefined) result[String(key).slice(0, 80)] = safe;
        }
        return result;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    _unitId(app, unit) {
        if (unit === undefined || unit === null) return '';
        if (typeof unit === 'string' || typeof unit === 'number') return String(unit).slice(0, 160);
        const resolved = app?._unitSelectionId?.(unit) || unit.id || unit.name || '';
        return String(resolved).slice(0, 160);
    },

    _unitIds(app, value) {
        const values = Array.isArray(value) ? value : [value];
        return [...new Set(values.slice(0, this.MAX_LIST).map(unit => this._unitId(app, unit)).filter(Boolean))];
    },

    create(app, input = {}) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('Action outcome input must be an object');
        }
        const action = this._token(input.action, 'core:unknown');
        const mode = ['combat', 'adventure', 'recovery', 'system'].includes(String(input.mode))
            ? String(input.mode)
            : (app?.combatState?.active ? 'combat' : 'adventure');
        const result = this.RESULTS.has(String(input.result)) ? String(input.result) : 'committed';
        const nextSequence = Math.max(0, Math.floor(Number(app?._actionOutcomeSequence) || 0)) + 1;
        if (app && typeof app === 'object') app._actionOutcomeSequence = nextSequence;
        const day = Math.max(0, Math.floor(Number(input.day ?? app?.dayCount) || 0));
        const hour = Math.max(0, Math.floor(Number(input.hour ?? app?.timeHour) || 0));
        const round = Math.max(0, Math.floor(Number(input.round ?? app?.combatState?.round) || 0));
        const turn = Math.max(0, Math.floor(Number(input.turn ?? app?.combatState?.turnIndex) || 0));
        const commitId = [
            mode, day, hour, round, turn, nextSequence, action
        ].map(value => String(value).replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 120)).join(':');
        const envelope = {
            schema: this.SCHEMA,
            version: this.VERSION,
            commitId,
            action,
            variant: input.variant ? this._token(input.variant, '') : '',
            mode,
            result,
            actors: this._unitIds(app, input.actors ?? input.actor),
            targets: this._unitIds(app, input.targets ?? input.target),
            costs: this._safeValue(Array.isArray(input.costs) ? input.costs : []),
            effects: this._safeValue(Array.isArray(input.effects) ? input.effects : []),
            summary: String(input.summary || '').slice(0, 500),
            detail: this._safeValue(input.detail && typeof input.detail === 'object' ? input.detail : {}),
            time: { day, hour, round, turn }
        };
        return this._deepFreeze(envelope);
    },

    async publish(app, input = {}, moduleSystem = null) {
        const envelope = this.create(app, input);
        const publicHooks = moduleSystem || (typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM : null);
        if (publicHooks?.executePublicHook) {
            await publicHooks.executePublicHook('onActionCommitted', envelope);
        }
        return envelope;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_ACTION_OUTCOMES = YAW_ACTION_OUTCOMES;
}
