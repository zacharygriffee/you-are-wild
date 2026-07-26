/**
 * YOU ARE WILD PERK EFFECTS V2
 * Bounded, serializable perk mutation profiles with symmetric rollback.
 */

const YAW_PERK_EFFECTS = {
    VERSION: 2,
    STAT_KEYS: new Set(['MPun', 'MPle', 'Figh', 'Feas', 'Flir', 'Fuck', 'Flee', 'Feed', 'str', 'con', 'spd', 'int', 'wis', 'cha']),
    FLAG_KEYS: new Set(['predatorScent', 'fearResist', 'nightVision']),

    profile(definition = {}) {
        const supplied = definition.effectProfile && typeof definition.effectProfile === 'object'
            ? definition.effectProfile
            : null;
        const effects = Array.isArray(supplied?.effects)
            ? supplied.effects
            : [
                definition.stat && Number.isFinite(Number(definition.val))
                    ? { kind: 'stat', key: definition.stat, amount: Number(definition.val) }
                    : null,
                definition.perkEffect
                    ? { kind: 'flag', key: definition.perkEffect }
                    : null
            ].filter(Boolean);
        const normalized = effects.map(effect => {
            if (!effect || typeof effect !== 'object') throw new Error('Perk effects must be objects');
            if (effect.kind === 'stat') {
                const key = String(effect.key || '');
                const amount = Number(effect.amount);
                if (!this.STAT_KEYS.has(key) || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 20) {
                    throw new Error(`Unsupported perk stat effect ${key}`);
                }
                return Object.freeze({ kind: 'stat', key, amount });
            }
            if (effect.kind === 'flag') {
                const key = String(effect.key || '');
                if (!this.FLAG_KEYS.has(key)) throw new Error(`Unsupported perk flag effect ${key}`);
                return Object.freeze({ kind: 'flag', key });
            }
            throw new Error(`Unsupported perk effect kind ${String(effect.kind || '')}`);
        });
        if (normalized.length === 0) throw new Error(`Perk ${definition.id || '(unknown)'} has no implemented effect`);
        return Object.freeze({
            version: this.VERSION,
            effects: Object.freeze(normalized)
        });
    },

    apply(unit, definition = {}) {
        if (!unit) return null;
        const profile = this.profile(definition);
        for (const effect of profile.effects) {
            if (effect.kind === 'stat') unit[effect.key] = Number(unit[effect.key] || 0) + effect.amount;
        }
        return profile;
    },

    rollback(unit, selectedPerk = {}) {
        if (!unit) return false;
        const profile = this.profile(selectedPerk);
        for (const effect of profile.effects) {
            if (effect.kind === 'stat') unit[effect.key] = Math.max(0, Number(unit[effect.key] || 0) - effect.amount);
        }
        return true;
    },

    normalizeSelected(perk = {}) {
        if (!perk || typeof perk !== 'object') return perk;
        const profile = this.profile(perk);
        perk.effectProfile = {
            version: profile.version,
            effects: profile.effects.map(effect => ({ ...effect }))
        };
        perk.effectVersion = this.VERSION;
        return perk;
    },

    normalizeUnit(unit) {
        if (!unit) return unit;
        unit.perks = (Array.isArray(unit.perks) ? unit.perks : []).map(perk => this.normalizeSelected(perk));
        return unit;
    },

    hasFlag(unit, flag) {
        return (unit?.perks || []).some(perk => {
            if (perk.perkEffect === flag) return true;
            try {
                return this.profile(perk).effects.some(effect => effect.kind === 'flag' && effect.key === flag);
            } catch (error) {
                return false;
            }
        });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PERK_EFFECTS = YAW_PERK_EFFECTS;
}
