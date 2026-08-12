/**
 * YOU ARE WILD BODY MASS LEDGER V1
 * Conserved body quantity, pieces, regrowth, and corpse-mass foundations.
 */

const YAW_BODY_MASS = {
    VERSION: 1,
    MAX_PROFILES: 128,
    MAX_TRANSACTIONS: 64,
    TRIGGERS: new Set(['digestion', 'hour', 'rest']),
    profiles: new Map(),

    _token(value, label = 'Body profile id') {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a bounded token`);
        }
        return token;
    },

    _integer(value, fallback, minimum, maximum, field) {
        const number = value === undefined ? fallback : Number(value);
        if (!Number.isInteger(number) || number < minimum || number > maximum) {
            throw new Error(`Body profile ${field} must be an integer from ${minimum} to ${maximum}`);
        }
        return number;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    key(owner, localId) {
        return `${this._token(owner, 'Body profile owner')}:${this._token(localId)}`;
    },

    normalizeProfile(owner, localId, definition = {}) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('Body profile definition must be an object');
        }
        const allowed = new Set([
            'label', 'labelKey', 'massPerSize', 'minimumViablePercent',
            'renewable', 'piecePercents', 'regrowth', 'corpseYieldPercent'
        ]);
        for (const field of Object.keys(definition)) {
            if (!allowed.has(field)) throw new Error(`Body profile contains unsupported field ${field}`);
        }
        const normalizedOwner = this._token(owner, 'Body profile owner');
        const id = this._token(localId);
        const labelKey = definition.labelKey ? this._token(definition.labelKey, 'Body profile labelKey') : '';
        if (normalizedOwner !== 'core' && labelKey && !labelKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Body profile labelKey must use the owning module namespace');
        }
        const piecePercents = definition.piecePercents === undefined ? [5, 10, 25] : definition.piecePercents;
        if (!Array.isArray(piecePercents) || piecePercents.length < 1 || piecePercents.length > 8) {
            throw new Error('Body profile piecePercents must contain 1 to 8 entries');
        }
        const normalizedPieces = [...new Set(piecePercents.map(value => this._integer(value, 10, 1, 50, 'piecePercents')))].sort((a, b) => a - b);
        const renewable = definition.renewable === true;
        const regrowth = definition.regrowth === undefined || definition.regrowth === null
            ? null
            : (() => {
                const value = definition.regrowth;
                if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Body profile regrowth must be an object');
                for (const field of Object.keys(value)) {
                    if (!['trigger', 'every', 'amount'].includes(field)) throw new Error(`Body profile regrowth contains unsupported field ${field}`);
                }
                const trigger = String(value.trigger || '');
                if (!this.TRIGGERS.has(trigger)) throw new Error(`Body profile regrowth trigger is unsupported: ${trigger}`);
                return {
                    trigger,
                    every: this._integer(value.every, 1, 1, 10000, 'regrowth.every'),
                    amount: this._integer(value.amount, 1, 1, 10000, 'regrowth.amount')
                };
            })();
        if (regrowth && !renewable) throw new Error('Only renewable body profiles may declare regrowth');
        return this._deepFreeze({
            version: this.VERSION,
            id,
            key: this.key(normalizedOwner, id),
            owner: normalizedOwner,
            label: String(definition.label || id).trim().slice(0, 80) || id,
            labelKey,
            massPerSize: this._integer(definition.massPerSize, 25, 1, 1000, 'massPerSize'),
            minimumViablePercent: this._integer(definition.minimumViablePercent, 25, 1, 100, 'minimumViablePercent'),
            renewable,
            piecePercents: normalizedPieces,
            regrowth,
            corpseYieldPercent: this._integer(definition.corpseYieldPercent, 100, 0, 100, 'corpseYieldPercent')
        });
    },

    register(owner, localId, definition = {}) {
        if (this.profiles.size >= this.MAX_PROFILES) throw new Error('Body profile limit reached');
        const profile = this.normalizeProfile(owner, localId, definition);
        if (this.profiles.has(profile.key)) throw new Error(`Body profile ${profile.key} is already registered`);
        this.profiles.set(profile.key, profile);
        return profile;
    },

    unregisterOwner(owner) {
        const normalizedOwner = this._token(owner, 'Body profile owner');
        let removed = 0;
        for (const [key, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== normalizedOwner) continue;
            this.profiles.delete(key);
            removed++;
        }
        return removed;
    },

    profile(key) {
        const requested = String(key || '');
        return this.profiles.get(requested) || this.profiles.get(requested.includes(':') ? requested : `core:${requested}`) || null;
    },

    profileFor(app, unit, requested = null) {
        const key = requested
            || unit?.bodyMass?.profile
            || unit?.bodyProfileKey
            || app?.SPECIES_BODY_PROFILES?.[unit?.species]
            || 'core:standard';
        return this.profile(key) || this.profile('core:standard');
    },

    _unitId(app, unit) {
        return String(app?._unitSelectionId?.(unit) || unit?.id || unit?.name || '').slice(0, 160);
    },

    ensure(app, unit, requestedProfile = null) {
        if (!unit || typeof unit !== 'object') return null;
        const profile = this.profileFor(app, unit, requestedProfile);
        const defaultMaximum = Math.max(1, Math.floor((Number(unit.size) || 1) * profile.massPerSize));
        const source = unit.bodyMass && typeof unit.bodyMass === 'object' && !Array.isArray(unit.bodyMass)
            ? unit.bodyMass
            : {};
        const maximum = Math.max(1, Math.floor(Number(source.maximum) || defaultMaximum));
        const current = Math.max(0, Math.min(maximum, Math.floor(Number(source.current ?? maximum) || 0)));
        unit.bodyProfileKey = profile.key;
        unit.bodyMass = {
            version: this.VERSION,
            profile: profile.key,
            maximum,
            current,
            regrowthProgress: Math.max(0, Math.floor(Number(source.regrowthProgress) || 0)),
            transactions: Array.isArray(source.transactions)
                ? source.transactions.filter(entry => entry && entry.schema === 'yaw-body-mass-transaction-v1').slice(-this.MAX_TRANSACTIONS)
                : []
        };
        return unit.bodyMass;
    },

    _record(app, unit, input = {}) {
        const state = this.ensure(app, unit);
        const sequence = Math.max(0, Math.floor(Number(unit._bodyMassSequence) || state.transactions.length)) + 1;
        unit._bodyMassSequence = sequence;
        const record = this._deepFreeze({
            schema: 'yaw-body-mass-transaction-v1',
            version: this.VERSION,
            commitId: [
                this._unitId(app, unit),
                Math.max(0, Math.floor(Number(app?.dayCount) || 0)),
                Math.max(0, Math.floor(Number(app?.timeHour) || 0)),
                sequence,
                this._token(input.reason || 'body-change', 'Body transaction reason')
            ].join(':'),
            unitId: this._unitId(app, unit),
            kind: this._token(input.kind || 'change', 'Body transaction kind'),
            amount: Math.max(0, Math.floor(Number(input.amount) || 0)),
            before: Math.max(0, Math.floor(Number(input.before) || 0)),
            after: Math.max(0, Math.floor(Number(input.after) || 0)),
            reason: this._token(input.reason || 'body-change', 'Body transaction reason'),
            sourceId: String(input.sourceId || '').slice(0, 160)
        });
        state.transactions.push(record);
        state.transactions = state.transactions.slice(-this.MAX_TRANSACTIONS);
        return record;
    },

    remove(app, unit, amount, options = {}) {
        const state = this.ensure(app, unit);
        const requested = Math.max(0, Math.floor(Number(amount) || 0));
        const profile = this.profileFor(app, unit);
        const minimum = Math.ceil(state.maximum * profile.minimumViablePercent / 100);
        if (requested < 1 || state.current - requested < minimum) return null;
        const before = state.current;
        state.current -= requested;
        return this._record(app, unit, {
            kind: options.kind || 'loss',
            amount: requested,
            before,
            after: state.current,
            reason: options.reason || 'body-loss',
            sourceId: options.sourceId
        });
    },

    consume(app, unit, amount, options = {}) {
        const state = this.ensure(app, unit);
        const requested = Math.max(0, Math.floor(Number(amount) || 0));
        const profile = this.profileFor(app, unit);
        const preserveViable = options.preserveViable !== false;
        const minimum = preserveViable
            ? Math.ceil(state.maximum * profile.minimumViablePercent / 100)
            : 0;
        const consumed = Math.min(requested, Math.max(0, state.current - minimum));
        if (consumed < 1) return null;
        const before = state.current;
        state.current -= consumed;
        return this._record(app, unit, {
            kind: options.kind || 'consumption',
            amount: consumed,
            before,
            after: state.current,
            reason: options.reason || 'body-consumed',
            sourceId: options.sourceId
        });
    },

    add(app, unit, amount, options = {}) {
        const state = this.ensure(app, unit);
        const requested = Math.max(0, Math.floor(Number(amount) || 0));
        if (requested < 1 || state.current >= state.maximum) return null;
        const before = state.current;
        state.current = Math.min(state.maximum, state.current + requested);
        return this._record(app, unit, {
            kind: options.kind || 'regrowth',
            amount: state.current - before,
            before,
            after: state.current,
            reason: options.reason || 'body-regrowth',
            sourceId: options.sourceId
        });
    },

    removePiece(app, unit, percent, options = {}) {
        const state = this.ensure(app, unit);
        const profile = this.profileFor(app, unit);
        const normalizedPercent = this._integer(percent, 10, 1, 50, 'piece percent');
        if (!profile.piecePercents.includes(normalizedPercent)) return null;
        const amount = Math.max(1, Math.floor(state.maximum * normalizedPercent / 100));
        const transaction = this.remove(app, unit, amount, {
            kind: 'piece',
            reason: options.reason || 'piece-removed',
            sourceId: options.sourceId
        });
        if (!transaction) return null;
        return this._deepFreeze({
            schema: 'yaw-body-piece-v1',
            version: this.VERSION,
            id: transaction.commitId,
            sourceId: transaction.unitId,
            profile: state.profile,
            mass: transaction.amount,
            renewable: profile.renewable,
            label: String(options.label || `${unit.name || unit.species || 'Body'} piece`).slice(0, 120),
            transaction
        });
    },

    tick(app, unit, trigger, steps = 1) {
        const state = this.ensure(app, unit);
        const profile = this.profileFor(app, unit);
        const regrowth = profile.regrowth;
        const normalizedSteps = Math.max(0, Math.min(10000, Math.floor(Number(steps) || 0)));
        if (!regrowth || regrowth.trigger !== trigger || normalizedSteps < 1 || state.current >= state.maximum) return [];
        const total = state.regrowthProgress + normalizedSteps;
        const cycles = Math.floor(total / regrowth.every);
        state.regrowthProgress = total % regrowth.every;
        if (cycles < 1) return [];
        const transaction = this.add(app, unit, cycles * regrowth.amount, { kind: 'regrowth', reason: `regrowth-${trigger}` });
        return transaction ? [transaction] : [];
    },

    toCorpse(app, unit) {
        const state = this.ensure(app, unit);
        const profile = this.profileFor(app, unit);
        const mass = Math.max(0, Math.floor(state.current * profile.corpseYieldPercent / 100));
        unit.corpseMassMaximum = mass;
        unit.corpseMassRemaining = mass;
        unit.corpseBodyProfile = profile.key;
        return { maximum: mass, remaining: mass, profile: profile.key };
    },

    normalizeCorpse(corpse) {
        if (!corpse || typeof corpse !== 'object') return null;
        const fallback = Math.max(0, Math.floor((Number(corpse.size) || 1) * this.profile('core:standard').massPerSize));
        corpse.corpseMassMaximum = Math.max(0, Math.floor(Number(corpse.corpseMassMaximum) || fallback));
        corpse.corpseMassRemaining = Math.max(0, Math.min(
            corpse.corpseMassMaximum,
            Math.floor(Number(corpse.corpseMassRemaining ?? corpse.corpseMassMaximum) || 0)
        ));
        corpse.corpseBodyProfile = this.profile(corpse.corpseBodyProfile)?.key || 'core:standard';
        return {
            maximum: corpse.corpseMassMaximum,
            remaining: corpse.corpseMassRemaining,
            profile: corpse.corpseBodyProfile
        };
    },

    consumeCorpse(corpse, consumedPortions, portionsBefore) {
        const state = this.normalizeCorpse(corpse);
        const consumed = Math.max(0, Math.floor(Number(consumedPortions) || 0));
        const beforePortions = Math.max(1, Math.floor(Number(portionsBefore) || 1));
        const mass = Math.min(state.remaining, Math.max(1, Math.ceil(state.remaining * consumed / beforePortions)));
        corpse.corpseMassRemaining = Math.max(0, state.remaining - mass);
        return { mass, before: state.remaining, after: corpse.corpseMassRemaining };
    }
};

YAW_BODY_MASS.register('core', 'standard', {
    label: 'Standard body',
    massPerSize: 25,
    minimumViablePercent: 25,
    renewable: false,
    piecePercents: [5, 10, 25],
    corpseYieldPercent: 100
});

if (typeof window !== 'undefined') {
    window.YAW_BODY_MASS = YAW_BODY_MASS;
}
