/**
 * YOU ARE WILD PERK PROFILE REGISTRY V1
 * Data-only, namespaced authored perk profiles for bounded module content.
 */

const YAW_PERK_REGISTRY = {
    VERSION: 1,
    profiles: new Map(),

    _copy(value) {
        return JSON.parse(JSON.stringify(value));
    },

    _freeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.values(value).forEach(entry => this._freeze(entry));
        return Object.freeze(value);
    },

    _namespaced(owner, id, label) {
        const normalized = String(id || '').trim();
        if (!normalized.startsWith(`${owner}:`) || !/^[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.:-]+$/.test(normalized)) {
            throw new Error(`${label} must use the ${owner}: namespace`);
        }
        return normalized;
    },

    normalize(owner, input = {}) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('Perk profile must be an object');
        }
        const profile = this._copy(input);
        profile.id = this._namespaced(owner, profile.id, 'Perk profile id');
        profile.label = String(profile.label || '').trim().slice(0, 80);
        if (!profile.label) throw new Error('Perk profile label is required');
        if (profile.labelKey && !String(profile.labelKey).startsWith(`${owner}.`)) {
            throw new Error(`Perk profile labelKey must use the ${owner}. locale namespace`);
        }
        const species = Array.isArray(profile.species)
            ? profile.species.map(value => String(value || '').trim()).filter(Boolean)
            : [];
        if (!Array.isArray(profile.perks) || profile.perks.length < 1 || profile.perks.length > 6) {
            throw new Error('Perk profile must define between 1 and 6 perks');
        }
        const seen = new Set();
        const perks = profile.perks.map(raw => {
            const perk = this._copy(raw);
            perk.id = this._namespaced(owner, perk.id, 'Perk id');
            if (seen.has(perk.id)) throw new Error(`Duplicate perk id ${perk.id}`);
            seen.add(perk.id);
            perk.name = String(perk.name || '').trim().slice(0, 80);
            perk.desc = String(perk.desc || '').trim().slice(0, 240);
            if (!perk.name || !perk.desc) throw new Error(`Perk ${perk.id} requires name and desc`);
            if (perk.nameKey && !String(perk.nameKey).startsWith(`${owner}.`)) {
                throw new Error(`Perk ${perk.id} nameKey must use the ${owner}. locale namespace`);
            }
            if (perk.descKey && !String(perk.descKey).startsWith(`${owner}.`)) {
                throw new Error(`Perk ${perk.id} descKey must use the ${owner}. locale namespace`);
            }
            if (perk.requires && typeof perk.requires !== 'object') {
                throw new Error(`Perk ${perk.id} requires must be an object`);
            }
            const profileEffect = YAW_PERK_EFFECTS.profile(perk);
            perk.effectProfile = {
                version: profileEffect.version,
                effects: profileEffect.effects.map(effect => ({ ...effect }))
            };
            perk.definitionVersion = 2;
            return perk;
        });
        return this._freeze({
            schema: 'yaw-perk-profile-v1',
            version: 1,
            owner,
            id: profile.id,
            label: profile.label,
            labelKey: profile.labelKey ? String(profile.labelKey) : null,
            species,
            perks
        });
    },

    register(app, owner, input) {
        const profile = this.normalize(owner, input);
        if (this.profiles.has(profile.id)) throw new Error(`Perk profile ${profile.id} is already registered`);
        for (const existing of this.profiles.values()) {
            const ids = new Set(existing.perks.map(perk => perk.id));
            const duplicate = profile.perks.find(perk => ids.has(perk.id));
            if (duplicate) throw new Error(`Perk ${duplicate.id} is already registered`);
        }
        this.profiles.set(profile.id, profile);
        return profile;
    },

    unregisterOwner(owner) {
        let removed = 0;
        for (const [id, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== owner) continue;
            this.profiles.delete(id);
            removed += 1;
        }
        return removed;
    },

    forUnit(app, unit = app.player) {
        const species = String(unit?.species || '');
        const result = {};
        for (const profile of this.profiles.values()) {
            if (profile.species.length && !profile.species.includes(species)) continue;
            result[profile.id] = {
                id: profile.id,
                owner: profile.owner,
                label: profile.labelKey ? app._label(profile.labelKey, profile.label) : profile.label,
                perks: profile.perks.map(perk => ({
                    ...this._copy(perk),
                    name: perk.nameKey ? app._label(perk.nameKey, perk.name) : perk.name,
                    desc: perk.descKey ? app._label(perk.descKey, perk.desc) : perk.desc
                }))
            };
        }
        return result;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PERK_REGISTRY = YAW_PERK_REGISTRY;
}
