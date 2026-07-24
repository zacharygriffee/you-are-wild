/**
 * YOU ARE WILD RESOURCE LEDGER V1
 * Core-owned, bounded, namespaced renewable resources for units.
 */

const YAW_RESOURCE_LEDGER = {
    VERSION: 1,
    MAX_PROFILES: 128,
    MAX_LEDGER_ENTRIES: 64,
    MAX_CAPACITY: 1000000,
    TRIGGERS: new Set(['digestion', 'hour', 'rest']),
    profiles: new Map(),

    _token(value, label = 'Resource id') {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a bounded token`);
        }
        return token;
    },

    key(owner, localId) {
        return `${this._token(owner, 'Resource owner')}:${this._token(localId)}`;
    },

    _stringList(value, field) {
        if (value === undefined) return [];
        if (!Array.isArray(value)) throw new Error(`Resource profile ${field} must be an array`);
        return [...new Set(value.map(item => this._token(item, `Resource profile ${field}`)))].slice(0, 64);
    },

    _integer(value, fallback, minimum, maximum, field) {
        const number = value === undefined ? fallback : Number(value);
        if (!Number.isInteger(number) || number < minimum || number > maximum) {
            throw new Error(`Resource profile ${field} must be an integer from ${minimum} to ${maximum}`);
        }
        return number;
    },

    normalizeProfile(owner, localId, definition = {}) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('Resource profile definition must be an object');
        }
        const allowed = ['label', 'labelKey', 'capacity', 'regeneration', 'eligibility'];
        for (const field of Object.keys(definition)) {
            if (!allowed.includes(field)) throw new Error(`Resource profile contains unsupported field ${field}`);
        }
        const id = this._token(localId);
        const key = this.key(owner, id);
        const capacity = this._integer(definition.capacity, 1, 1, this.MAX_CAPACITY, 'capacity');
        const regeneration = definition.regeneration === undefined || definition.regeneration === null
            ? null
            : (() => {
                const value = definition.regeneration;
                if (!value || typeof value !== 'object' || Array.isArray(value)) {
                    throw new Error('Resource profile regeneration must be an object');
                }
                for (const field of Object.keys(value)) {
                    if (!['trigger', 'every', 'amount'].includes(field)) {
                        throw new Error(`Resource profile regeneration contains unsupported field ${field}`);
                    }
                }
                const trigger = String(value.trigger || '').trim();
                if (!this.TRIGGERS.has(trigger)) {
                    throw new Error(`Resource profile regeneration trigger must be one of: ${[...this.TRIGGERS].join(', ')}`);
                }
                return {
                    trigger,
                    every: this._integer(value.every, 1, 1, 10000, 'regeneration.every'),
                    amount: this._integer(value.amount, 1, 1, capacity, 'regeneration.amount')
                };
            })();
        const eligibility = definition.eligibility === undefined || definition.eligibility === null
            ? { species: [], abilities: [], flags: [] }
            : (() => {
                const value = definition.eligibility;
                if (!value || typeof value !== 'object' || Array.isArray(value)) {
                    throw new Error('Resource profile eligibility must be an object');
                }
                for (const field of Object.keys(value)) {
                    if (!['species', 'abilities', 'flags'].includes(field)) {
                        throw new Error(`Resource profile eligibility contains unsupported field ${field}`);
                    }
                }
                return {
                    species: this._stringList(value.species, 'eligibility.species'),
                    abilities: this._stringList(value.abilities, 'eligibility.abilities'),
                    flags: this._stringList(value.flags, 'eligibility.flags')
                };
            })();
        return Object.freeze({
            version: this.VERSION,
            id,
            key,
            owner: this._token(owner, 'Resource owner'),
            label: String(definition.label || id).trim().slice(0, 80) || id,
            labelKey: definition.labelKey ? this._token(definition.labelKey, 'Resource label key') : '',
            capacity,
            regeneration: regeneration ? Object.freeze(regeneration) : null,
            eligibility: Object.freeze({
                species: Object.freeze(eligibility.species),
                abilities: Object.freeze(eligibility.abilities),
                flags: Object.freeze(eligibility.flags)
            })
        });
    },

    register(owner, localId, definition = {}) {
        if (this.profiles.size >= this.MAX_PROFILES) throw new Error('Resource profile limit reached');
        const profile = this.normalizeProfile(owner, localId, definition);
        if (this.profiles.has(profile.key)) throw new Error(`Resource profile ${profile.key} is already registered`);
        this.profiles.set(profile.key, profile);
        return profile;
    },

    unregisterOwner(owner) {
        const normalized = this._token(owner, 'Resource owner');
        let removed = 0;
        for (const [key, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== normalized) continue;
            this.profiles.delete(key);
            removed++;
        }
        return removed;
    },

    profile(resourceKey) {
        return this.profiles.get(String(resourceKey || '')) || null;
    },

    eligible(unit, profile) {
        if (!unit || !profile) return false;
        const eligibility = profile.eligibility || {};
        if (eligibility.species?.length && !eligibility.species.includes(String(unit.species || ''))) return false;
        const abilities = unit.abilities && typeof unit.abilities === 'object' ? unit.abilities : {};
        if (eligibility.abilities?.some(ability => unit[ability] !== true && abilities[ability] !== true)) return false;
        if (eligibility.flags?.some(flag => unit[flag] !== true)) return false;
        return true;
    },

    _sanitizeEntry(entry, profile = null) {
        const capacity = profile?.capacity || this.MAX_CAPACITY;
        const current = Math.max(0, Math.min(capacity, Math.floor(Number(entry?.current) || 0)));
        const progressLimit = profile?.regeneration?.every ? Math.max(0, profile.regeneration.every - 1) : 0;
        const progress = Math.max(0, Math.min(progressLimit, Math.floor(Number(entry?.progress) || 0)));
        return { current, progress };
    },

    normalizeUnit(unit) {
        if (!unit || typeof unit !== 'object') return unit;
        const source = unit.resourceLedger && typeof unit.resourceLedger === 'object' && !Array.isArray(unit.resourceLedger)
            ? unit.resourceLedger
            : {};
        const normalized = {};
        for (const [key, entry] of Object.entries(source).slice(0, this.MAX_LEDGER_ENTRIES)) {
            if (!/^[a-zA-Z0-9_.:-]+:[a-zA-Z0-9_.:-]+$/.test(key) || key.length > 193) continue;
            normalized[key] = this._sanitizeEntry(entry, this.profile(key));
        }
        unit.resourceLedgerVersion = this.VERSION;
        unit.resourceLedger = normalized;
        return unit;
    },

    state(unit, resourceKey, options = {}) {
        const profile = this.profile(resourceKey);
        if (!profile || !this.eligible(unit, profile)) return null;
        this.normalizeUnit(unit);
        if (!unit.resourceLedger[profile.key] && options.create !== false) {
            unit.resourceLedger[profile.key] = { current: 0, progress: 0 };
        }
        const entry = unit.resourceLedger[profile.key];
        if (!entry) return { key: profile.key, current: 0, capacity: profile.capacity, progress: 0, profile };
        const normalized = this._sanitizeEntry(entry, profile);
        unit.resourceLedger[profile.key] = normalized;
        return { key: profile.key, current: normalized.current, capacity: profile.capacity, progress: normalized.progress, profile };
    },

    grant(unit, resourceKey, amount) {
        const state = this.state(unit, resourceKey);
        const grant = Math.max(0, Math.floor(Number(amount) || 0));
        if (!state || grant < 1) return 0;
        const next = Math.min(state.capacity, state.current + grant);
        unit.resourceLedger[state.key].current = next;
        return next - state.current;
    },

    spend(unit, resourceKey, amount) {
        const state = this.state(unit, resourceKey);
        const spend = Math.max(0, Math.floor(Number(amount) || 0));
        if (!state || spend < 1 || state.current < spend) return 0;
        unit.resourceLedger[state.key].current = state.current - spend;
        return spend;
    },

    tick(unit, trigger, steps = 1) {
        const normalizedTrigger = String(trigger || '');
        const normalizedSteps = Math.max(0, Math.min(10000, Math.floor(Number(steps) || 0)));
        if (!unit || !this.TRIGGERS.has(normalizedTrigger) || normalizedSteps < 1) return [];
        const changed = [];
        for (const profile of this.profiles.values()) {
            const regeneration = profile.regeneration;
            if (!regeneration || regeneration.trigger !== normalizedTrigger || !this.eligible(unit, profile)) continue;
            const state = this.state(unit, profile.key);
            if (!state || state.current >= state.capacity) continue;
            const entry = unit.resourceLedger[profile.key];
            const totalProgress = entry.progress + normalizedSteps;
            const cycles = Math.floor(totalProgress / regeneration.every);
            entry.progress = totalProgress % regeneration.every;
            if (cycles < 1) continue;
            const granted = this.grant(unit, profile.key, cycles * regeneration.amount);
            if (granted > 0) changed.push({ key: profile.key, amount: granted, current: entry.current, capacity: profile.capacity });
        }
        return changed;
    },

    label(app, resourceKey) {
        const profile = this.profile(resourceKey);
        if (!profile) return String(resourceKey || '');
        return profile.labelKey && app?._label
            ? app._label(profile.labelKey, profile.label)
            : profile.label;
    },

    cost(app, unit, resourceKey, amount = 1) {
        const state = this.state(unit, resourceKey);
        if (!state) return null;
        return {
            resource: resourceKey,
            amount: Math.max(1, Math.floor(Number(amount) || 1)),
            current: state.current,
            capacity: state.capacity,
            label: app?._label
                ? app._label('resource.cost', '{amount} {resource} ({current}/{capacity})', {
                    amount: Math.max(1, Math.floor(Number(amount) || 1)),
                    resource: this.label(app, resourceKey),
                    current: state.current,
                    capacity: state.capacity
                })
                : `${amount} ${state.profile?.label || resourceKey} (${state.current}/${state.capacity})`
        };
    }
};

YAW_RESOURCE_LEDGER.register('core', 'nurse', {
    label: 'nourishment reserve',
    labelKey: 'resource.core.nurse',
    capacity: 3,
    regeneration: { trigger: 'digestion', every: 3, amount: 1 },
    eligibility: { flags: ['lactating'] }
});

if (typeof window !== 'undefined') {
    window.YAW_RESOURCE_LEDGER = YAW_RESOURCE_LEDGER;
}
