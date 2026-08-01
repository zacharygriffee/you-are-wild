/**
 * YOU ARE WILD RESTRAINT RELATIONSHIP V1
 * Core-owned source-to-target control relationships used by Grab, Pull, and Escape.
 */

const YAW_RESTRAINTS = {
    VERSION: 1,
    MAX_PROFILES: 128,
    MAX_ACTIVE_PER_UNIT: 8,
    KINDS: new Set(['grab', 'snare', 'web', 'tentacle', 'generic']),
    profiles: new Map(),

    _token(value, label = 'Restraint id') {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a bounded token`);
        }
        return token;
    },

    _integer(value, fallback, minimum, maximum, field) {
        const number = value === undefined ? fallback : Number(value);
        if (!Number.isInteger(number) || number < minimum || number > maximum) {
            throw new Error(`Restraint ${field} must be an integer from ${minimum} to ${maximum}`);
        }
        return number;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    key(owner, localId) {
        return `${this._token(owner, 'Restraint owner')}:${this._token(localId)}`;
    },

    normalizeProfile(owner, localId, definition = {}) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('Restraint profile definition must be an object');
        }
        const allowed = new Set([
            'label', 'labelKey', 'description', 'descriptionKey', 'icon', 'kind',
            'statusProfile', 'duration', 'strength', 'breakOnSourceDown'
        ]);
        for (const field of Object.keys(definition)) {
            if (!allowed.has(field)) throw new Error(`Restraint profile contains unsupported field ${field}`);
        }
        const normalizedOwner = this._token(owner, 'Restraint owner');
        const id = this._token(localId);
        const labelKey = definition.labelKey ? this._token(definition.labelKey, 'Restraint labelKey') : '';
        const descriptionKey = definition.descriptionKey ? this._token(definition.descriptionKey, 'Restraint descriptionKey') : '';
        if (normalizedOwner !== 'core' && labelKey && !labelKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Restraint labelKey must use the owning module namespace');
        }
        if (normalizedOwner !== 'core' && descriptionKey && !descriptionKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Restraint descriptionKey must use the owning module namespace');
        }
        const kind = String(definition.kind || 'generic');
        if (!this.KINDS.has(kind)) throw new Error(`Restraint kind must be one of: ${[...this.KINDS].join(', ')}`);
        const statusProfile = this._token(definition.statusProfile || 'core:restrained', 'Restraint statusProfile');
        if (normalizedOwner !== 'core'
            && !statusProfile.startsWith(`${normalizedOwner}:`)
            && !statusProfile.startsWith('core:')) {
            throw new Error('Restraints may reference only core or module-owned status profiles');
        }
        return this._deepFreeze({
            version: this.VERSION,
            id,
            key: this.key(normalizedOwner, id),
            owner: normalizedOwner,
            label: String(definition.label || id).trim().slice(0, 80) || id,
            labelKey,
            description: String(definition.description || '').trim().slice(0, 320),
            descriptionKey,
            icon: String(definition.icon || '🔗').trim().slice(0, 16) || '🔗',
            kind,
            statusProfile,
            duration: this._integer(definition.duration, 2, 1, 999, 'duration'),
            strength: this._integer(definition.strength, 0, -100, 100, 'strength'),
            breakOnSourceDown: definition.breakOnSourceDown !== false
        });
    },

    register(owner, localId, definition = {}) {
        if (this.profiles.size >= this.MAX_PROFILES) throw new Error('Restraint profile limit reached');
        const profile = this.normalizeProfile(owner, localId, definition);
        if (this.profiles.has(profile.key)) throw new Error(`Restraint profile ${profile.key} is already registered`);
        this.profiles.set(profile.key, profile);
        return profile;
    },

    unregisterOwner(owner, app = null) {
        const normalizedOwner = this._token(owner, 'Restraint owner');
        const removedKeys = new Set();
        for (const [key, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== normalizedOwner) continue;
            this.profiles.delete(key);
            removedKeys.add(key);
        }
        if (app && removedKeys.size) {
            for (const unit of this._allUnits(app)) {
                unit.restraints = this._records(unit).filter(record => !removedKeys.has(record.profile));
            }
        }
        return removedKeys.size;
    },

    profile(key) {
        const requested = String(key || '');
        return this.profiles.get(requested) || this.profiles.get(requested.includes(':') ? requested : `core:${requested}`) || null;
    },

    _unitId(app, unit) {
        return String(app?._unitSelectionId?.(unit) || unit?.id || unit?.name || '').slice(0, 160);
    },

    _records(unit) {
        if (!unit) return [];
        if (!Array.isArray(unit.restraints)) unit.restraints = [];
        unit.restraints = unit.restraints
            .filter(record => record && record.schema === 'yaw-restraint-v1' && this.profile(record.profile))
            .slice(0, this.MAX_ACTIVE_PER_UNIT);
        return unit.restraints;
    },

    _allUnits(app) {
        return [...new Set([
            ...(app?.party || []),
            ...(app?.creatures || []),
            app?.player
        ].filter(Boolean))];
    },

    active(app, target, options = {}) {
        const sourceId = options.source ? this._unitId(app, options.source) : String(options.sourceId || '');
        const profileKey = options.profile ? String(options.profile) : '';
        return this._records(target).filter(record => {
            if (sourceId && record.sourceId !== sourceId) return false;
            if (profileKey && record.profile !== profileKey) return false;
            return record.turns > 0;
        });
    },

    apply(app, source, target, profileKey, input = {}) {
        const profile = this.profile(profileKey);
        if (!profile || !source || !target || source === target) return null;
        const sourceId = this._unitId(app, source);
        const targetId = this._unitId(app, target);
        if (!sourceId || !targetId) return null;
        const records = this._records(target);
        let record = records.find(entry => entry.sourceId === sourceId && entry.profile === profile.key);
        const turns = this._integer(input.turns, profile.duration, 1, 999, 'application.turns');
        const power = this._integer(input.power, 1, 1, 100, 'application.power');
        if (record) {
            record.turns = Math.max(record.turns, turns);
            record.power = Math.max(record.power, power);
        } else {
            if (records.length >= this.MAX_ACTIVE_PER_UNIT) throw new Error('Target restraint limit reached');
            record = {
                schema: 'yaw-restraint-v1',
                profile: profile.key,
                sourceId,
                targetId,
                turns,
                power
            };
            records.push(record);
        }
        if (typeof YAW_STATUS_EFFECTS !== 'undefined') {
            const statusProfile = YAW_STATUS_EFFECTS.profile(profile.statusProfile);
            YAW_STATUS_EFFECTS.apply(target, profile.statusProfile, {
                turns: Math.min(turns, statusProfile?.duration?.max || turns),
                power,
                source: `${profile.key}:${sourceId}`
            });
        }
        return { ...record };
    },

    release(app, target, options = {}) {
        const records = this._records(target);
        const matches = this.active(app, target, options);
        if (!matches.length) return 0;
        const matchSet = new Set(matches);
        target.restraints = records.filter(record => !matchSet.has(record));
        for (const record of matches) {
            const profile = this.profile(record.profile);
            const statusStillRequired = profile && target.restraints.some(other => this.profile(other.profile)?.statusProfile === profile.statusProfile);
            if (profile && !statusStillRequired && typeof YAW_STATUS_EFFECTS !== 'undefined') {
                YAW_STATUS_EFFECTS.remove(target, profile.statusProfile);
            }
        }
        return matches.length;
    },

    pull(app, source, target) {
        const relationship = this.active(app, target, { source })[0];
        if (!relationship) return null;
        const before = target.combatRow || 'front';
        const after = source.combatRow === 'back' ? 'back' : 'front';
        target.combatRow = after;
        return { profile: relationship.profile, before, after, moved: before !== after };
    },

    tick(app) {
        const expired = [];
        const unitsById = new Map(this._allUnits(app).map(unit => [this._unitId(app, unit), unit]));
        for (const target of this._allUnits(app)) {
            for (const record of [...this._records(target)]) {
                const profile = this.profile(record.profile);
                const source = unitsById.get(record.sourceId);
                if (!profile || (profile.breakOnSourceDown && (!source || Number(source.CPun) <= 0))) {
                    this.release(app, target, { sourceId: record.sourceId, profile: record.profile });
                    expired.push({ ...record, reason: 'source-unavailable' });
                    continue;
                }
                record.turns = Math.max(0, Math.floor(Number(record.turns) || 0) - 1);
                if (record.turns <= 0) {
                    this.release(app, target, { sourceId: record.sourceId, profile: record.profile });
                    expired.push({ ...record, reason: 'expired' });
                }
            }
        }
        return expired;
    },

    clearCombat(app) {
        let removed = 0;
        for (const target of this._allUnits(app)) removed += this.release(app, target);
        return removed;
    }
};

YAW_RESTRAINTS.register('core', 'grab', {
    label: 'Grabbed',
    kind: 'grab',
    statusProfile: 'core:grabbed',
    duration: 2,
    breakOnSourceDown: true
});
YAW_RESTRAINTS.register('core', 'snare', {
    label: 'Snared',
    kind: 'snare',
    statusProfile: 'core:snared',
    duration: 3,
    breakOnSourceDown: false
});
YAW_RESTRAINTS.register('core', 'web', {
    label: 'Webbed',
    kind: 'web',
    statusProfile: 'core:snared',
    duration: 3,
    breakOnSourceDown: false
});
YAW_RESTRAINTS.register('core', 'tentacle', {
    label: 'Tentacle hold',
    kind: 'tentacle',
    statusProfile: 'core:restrained',
    duration: 2,
    breakOnSourceDown: true
});

if (typeof window !== 'undefined') {
    window.YAW_RESTRAINTS = YAW_RESTRAINTS;
}
