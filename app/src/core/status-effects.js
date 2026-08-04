/**
 * YOU ARE WILD STATUS EFFECT V1
 * Owned, namespaced, data-only temporary condition profiles.
 */

const YAW_STATUS_EFFECTS = {
    VERSION: 1,
    MAX_PROFILES: 256,
    MAX_ACTIVE_PER_UNIT: 48,
    DOMAINS: new Set(['combat', 'feast', 'social', 'medical', 'traversal']),
    PERSISTENCE: new Set(['combat', 'persistent']),
    STACKING: new Set(['replace', 'refresh', 'stack']),
    RESTRICTIONS: new Set(['none', 'skip-turn']),
    PERIODIC_STATS: new Set(['condition', 'spirit', 'hunger']),
    profiles: new Map(),

    _token(value, label = 'Status effect id') {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a bounded token`);
        }
        return token;
    },

    key(owner, localId) {
        return `${this._token(owner, 'Status effect owner')}:${this._token(localId)}`;
    },

    _integer(value, fallback, minimum, maximum, field) {
        const number = value === undefined ? fallback : Number(value);
        if (!Number.isInteger(number) || number < minimum || number > maximum) {
            throw new Error(`Status effect ${field} must be an integer from ${minimum} to ${maximum}`);
        }
        return number;
    },

    _stringList(value, field, known = null, maximum = 24) {
        if (value === undefined) return [];
        if (!Array.isArray(value) || value.length > maximum) {
            throw new Error(`Status effect ${field} must be a bounded array`);
        }
        const result = [...new Set(value.map(item => this._token(item, `Status effect ${field}`)))];
        if (known) {
            for (const entry of result) {
                if (!known.has(entry)) throw new Error(`Status effect ${field} contains unsupported value ${entry}`);
            }
        }
        return result;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    normalizeProfile(owner, localId, definition = {}, options = {}) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('Status effect definition must be an object');
        }
        const allowed = new Set([
            'label', 'labelKey', 'description', 'descriptionKey', 'icon', 'domains',
            'duration', 'stacking', 'persistence', 'restriction', 'periodic',
            'cureTags', 'resistanceTags'
        ]);
        for (const field of Object.keys(definition)) {
            if (!allowed.has(field)) throw new Error(`Status effect contains unsupported field ${field}`);
        }
        const normalizedOwner = this._token(owner, 'Status effect owner');
        const id = this._token(localId);
        const key = this.key(normalizedOwner, id);
        const labelKey = definition.labelKey ? this._token(definition.labelKey, 'Status effect labelKey') : '';
        const descriptionKey = definition.descriptionKey ? this._token(definition.descriptionKey, 'Status effect descriptionKey') : '';
        if (normalizedOwner !== 'core' && labelKey && !labelKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Status effect labelKey must use the owning module namespace');
        }
        if (normalizedOwner !== 'core' && descriptionKey && !descriptionKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Status effect descriptionKey must use the owning module namespace');
        }
        const durationInput = definition.duration === undefined ? {} : definition.duration;
        if (!durationInput || typeof durationInput !== 'object' || Array.isArray(durationInput)) {
            throw new Error('Status effect duration must be an object');
        }
        for (const field of Object.keys(durationInput)) {
            if (!['default', 'max'].includes(field)) throw new Error(`Status effect duration contains unsupported field ${field}`);
        }
        const maximumTurns = this._integer(durationInput.max, 10, 1, 999, 'duration.max');
        const defaultTurns = this._integer(durationInput.default, 1, 1, maximumTurns, 'duration.default');
        const stackingInput = definition.stacking === undefined ? {} : definition.stacking;
        if (!stackingInput || typeof stackingInput !== 'object' || Array.isArray(stackingInput)) {
            throw new Error('Status effect stacking must be an object');
        }
        for (const field of Object.keys(stackingInput)) {
            if (!['mode', 'max'].includes(field)) throw new Error(`Status effect stacking contains unsupported field ${field}`);
        }
        const stackingMode = String(stackingInput.mode || 'refresh');
        if (!this.STACKING.has(stackingMode)) {
            throw new Error(`Status effect stacking.mode must be one of: ${[...this.STACKING].join(', ')}`);
        }
        const maximumStacks = this._integer(stackingInput.max, stackingMode === 'stack' ? 5 : 1, 1, 20, 'stacking.max');
        const persistence = String(definition.persistence || 'combat');
        if (!this.PERSISTENCE.has(persistence)) {
            throw new Error(`Status effect persistence must be one of: ${[...this.PERSISTENCE].join(', ')}`);
        }
        const restriction = String(definition.restriction || 'none');
        if (!this.RESTRICTIONS.has(restriction)) {
            throw new Error(`Status effect restriction must be one of: ${[...this.RESTRICTIONS].join(', ')}`);
        }
        const periodic = definition.periodic === undefined || definition.periodic === null
            ? null
            : (() => {
                const input = definition.periodic;
                if (!input || typeof input !== 'object' || Array.isArray(input)) {
                    throw new Error('Status effect periodic must be an object');
                }
                for (const field of Object.keys(input)) {
                    if (!['stat', 'amount'].includes(field)) throw new Error(`Status effect periodic contains unsupported field ${field}`);
                }
                const stat = String(input.stat || '');
                if (!this.PERIODIC_STATS.has(stat)) {
                    throw new Error(`Status effect periodic.stat must be one of: ${[...this.PERIODIC_STATS].join(', ')}`);
                }
                return {
                    stat,
                    amount: this._integer(input.amount, 0, -100, 100, 'periodic.amount')
                };
            })();
        return this._deepFreeze({
            version: this.VERSION,
            id,
            key,
            owner: normalizedOwner,
            storageKey: options.storageKey ? this._token(options.storageKey, 'Status effect storage key') : key,
            legacyProcessor: options.legacyProcessor === true,
            label: String(definition.label || id).trim().slice(0, 80) || id,
            labelKey,
            description: String(definition.description || '').trim().slice(0, 320),
            descriptionKey,
            icon: String(definition.icon || '').trim().slice(0, 16),
            domains: this._stringList(definition.domains || ['combat'], 'domains', this.DOMAINS),
            duration: { default: defaultTurns, max: maximumTurns },
            stacking: { mode: stackingMode, max: maximumStacks },
            persistence,
            restriction,
            periodic,
            cureTags: this._stringList(definition.cureTags, 'cureTags'),
            resistanceTags: this._stringList(definition.resistanceTags, 'resistanceTags')
        });
    },

    register(owner, localId, definition = {}, options = {}) {
        if (this.profiles.size >= this.MAX_PROFILES) throw new Error('Status effect profile limit reached');
        const profile = this.normalizeProfile(owner, localId, definition, options);
        if (this.profiles.has(profile.key)) throw new Error(`Status effect ${profile.key} is already registered`);
        this.profiles.set(profile.key, profile);
        return profile;
    },

    profile(key) {
        const requested = String(key || '');
        return this.profiles.get(requested) || this.profiles.get(requested.includes(':') ? requested : `core:${requested}`) || null;
    },

    apply(unit, profileKey, input = {}) {
        const profile = this.profile(profileKey);
        if (!unit || !profile) return null;
        unit.status = unit.status && typeof unit.status === 'object' && !Array.isArray(unit.status) ? unit.status : {};
        if (!unit.status[profile.storageKey] && Object.keys(unit.status).length >= this.MAX_ACTIVE_PER_UNIT) {
            throw new Error('Unit status effect limit reached');
        }
        const turns = this._integer(input.turns, profile.duration.default, 1, profile.duration.max, 'application.turns');
        const power = this._integer(input.power, 1, 1, 100, 'application.power');
        const existing = unit.status[profile.storageKey] && typeof unit.status[profile.storageKey] === 'object'
            ? unit.status[profile.storageKey]
            : null;
        const next = {
            schema: 'yaw-status-instance-v1',
            profile: profile.key,
            turns,
            stacks: 1,
            power,
            source: String(input.source || '').slice(0, 160)
        };
        if (existing && profile.stacking.mode === 'refresh') {
            next.turns = Math.max(turns, Math.max(0, Math.floor(Number(existing.turns) || 0)));
            next.stacks = Math.max(1, Math.min(profile.stacking.max, Math.floor(Number(existing.stacks) || 1)));
            next.power = Math.max(power, Math.max(1, Math.floor(Number(existing.power) || 1)));
        } else if (existing && profile.stacking.mode === 'stack') {
            next.turns = Math.max(turns, Math.max(0, Math.floor(Number(existing.turns) || 0)));
            next.stacks = Math.min(profile.stacking.max, Math.max(1, Math.floor(Number(existing.stacks) || 1)) + 1);
            next.power = Math.max(power, Math.max(1, Math.floor(Number(existing.power) || 1)));
        }
        unit.status[profile.storageKey] = next;
        return { ...next };
    },

    remove(unit, profileKey) {
        const profile = this.profile(profileKey);
        if (!unit?.status || !profile || !unit.status[profile.storageKey]) return false;
        delete unit.status[profile.storageKey];
        return true;
    },

    _activeProfiles(unit) {
        if (!unit?.status || typeof unit.status !== 'object') return [];
        return [...this.profiles.values()].filter(profile => unit.status[profile.storageKey]);
    },

    skipTurn(app, unit) {
        const profile = this._activeProfiles(unit)
            .filter(candidate => !candidate.legacyProcessor && candidate.restriction === 'skip-turn')
            .sort((left, right) => left.key.localeCompare(right.key))[0];
        if (!profile) return null;
        const label = profile.labelKey && app?._label ? app._label(profile.labelKey, profile.label, {}) : profile.label;
        return app?._label?.('combat.status.moduleSkip', '{name} cannot act while affected by {status}.', {
            name: unit.name,
            status: label
        }) || `${unit.name} cannot act while affected by ${label}.`;
    },

    processRound(unit) {
        const changes = [];
        for (const profile of this._activeProfiles(unit)) {
            if (profile.legacyProcessor) continue;
            const state = unit.status[profile.storageKey];
            const multiplier = Math.max(1, Math.floor(Number(state.stacks) || 1)) * Math.max(1, Math.floor(Number(state.power) || 1));
            if (profile.periodic) {
                const amount = profile.periodic.amount * multiplier;
                if (profile.periodic.stat === 'condition') {
                    const maximum = Math.max(1, Number(unit.MPun) || 1);
                    unit.CPun = Math.max(0, Math.min(maximum, (Number(unit.CPun) || 0) + amount));
                } else if (profile.periodic.stat === 'spirit') {
                    const maximum = Math.max(1, Number(unit.MPle) || 1);
                    unit.CPle = Math.max(0, Math.min(maximum, (Number(unit.CPle) || 0) + amount));
                } else if (profile.periodic.stat === 'hunger') {
                    unit.hunger = Math.max(0, Math.min(100, (Number(unit.hunger) || 0) + amount));
                }
                changes.push({ profile: profile.key, stat: profile.periodic.stat, amount });
            }
            state.turns = Math.max(0, Math.floor(Number(state.turns) || 0) - 1);
            if (state.turns <= 0) {
                delete unit.status[profile.storageKey];
                changes.push({ profile: profile.key, expired: true });
            }
        }
        return changes;
    },

    clearCombat(units = []) {
        let removed = 0;
        for (const unit of new Set((units || []).filter(Boolean))) {
            for (const profile of this._activeProfiles(unit)) {
                if (profile.legacyProcessor || profile.persistence !== 'combat') continue;
                delete unit.status[profile.storageKey];
                removed++;
            }
        }
        return removed;
    },

    unregisterOwner(owner, app = null) {
        const normalizedOwner = this._token(owner, 'Status effect owner');
        const removedProfiles = [];
        for (const [key, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== normalizedOwner) continue;
            this.profiles.delete(key);
            removedProfiles.push(profile);
        }
        if (app && removedProfiles.length) {
            const units = new Set([
                ...(app.party || []),
                ...(app.creatures || []),
                app.player,
                ...((app.worldMap && typeof app.worldMap.values === 'function')
                    ? [...app.worldMap.values()].flatMap(tile => tile?.creatures || [])
                    : [])
            ].filter(Boolean));
            for (const unit of units) {
                if (!unit.status) continue;
                for (const profile of removedProfiles) delete unit.status[profile.storageKey];
            }
        }
        return removedProfiles.length;
    }
};

[
    ['bleed', { label: 'Bleeding', domains: ['combat', 'medical'], persistence: 'persistent', duration: { default: 3, max: 20 }, stacking: { mode: 'stack', max: 5 }, periodic: { stat: 'condition', amount: -2 }, cureTags: ['medical'] }],
    ['burn', { label: 'Burning', domains: ['combat', 'medical'], persistence: 'persistent', duration: { default: 2, max: 20 }, periodic: { stat: 'condition', amount: -3 }, cureTags: ['medical'] }],
    ['poisoned', { label: 'Poisoned', domains: ['combat', 'medical'], persistence: 'persistent', duration: { default: 3, max: 50 }, periodic: { stat: 'condition', amount: -2 }, cureTags: ['medical', 'antidote'] }],
    ['freeze', { label: 'Frozen', domains: ['combat'], duration: { default: 2, max: 10 }, restriction: 'skip-turn' }],
    ['stun', { label: 'Stunned', domains: ['combat'], duration: { default: 1, max: 10 }, restriction: 'skip-turn' }],
    ['charm', { label: 'Charmed', domains: ['combat', 'social'], duration: { default: 2, max: 20 } }],
    ['fear', { label: 'Afraid', domains: ['combat', 'social'], duration: { default: 2, max: 20 } }],
    ['terror', { label: 'Terrified', domains: ['combat', 'social'], duration: { default: 1, max: 20 } }],
    ['restrained', { label: 'Restrained', domains: ['combat', 'feast'], duration: { default: 2, max: 20 }, restriction: 'skip-turn' }],
    ['grabbed', { label: 'Grabbed', domains: ['combat', 'feast'], duration: { default: 2, max: 20 } }],
    ['snared', { label: 'Snared', domains: ['combat', 'feast'], duration: { default: 2, max: 20 } }],
    ['enveloped', { label: 'Enveloped', domains: ['combat', 'feast'], duration: { default: 2, max: 20 }, periodic: { stat: 'condition', amount: -4 } }]
].forEach(([id, definition]) => {
    YAW_STATUS_EFFECTS.register('core', id, definition, { storageKey: id, legacyProcessor: true });
});

if (typeof window !== 'undefined') {
    window.YAW_STATUS_EFFECTS = YAW_STATUS_EFFECTS;
}
