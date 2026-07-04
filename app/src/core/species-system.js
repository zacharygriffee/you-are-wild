/**
 * YOU ARE WILD SPECIES SYSTEM
 * Species canon normalization, baseline interaction gates, and base stats.
 */

const YAW_SPECIES_SYSTEM = {
    canon(app, sid) {
        const override = app.SPECIES_CANON[sid] || {};
        return {
            ...app.DEFAULT_SPECIES_CANON,
            ...override,
            interactionEligibility: {
                ...(app.DEFAULT_SPECIES_CANON.interactionEligibility || {}),
                ...(override.interactionEligibility || {})
            },
            traits: [...new Set([...(app.DEFAULT_SPECIES_CANON.traits || []), ...(override.traits || [])])]
        };
    },

    applyCanon(app, unit) {
        if (!unit) return unit;
        const canon = this.canon(app, unit.species || 'human');
        unit.sapience = unit.sapience || canon.sapience;
        unit.bodyPlan = unit.bodyPlan || canon.bodyPlan;
        unit.baselineInteraction = unit.baselineInteraction || canon.baselineInteraction;
        unit.interactionEligibility = {
            ...(canon.interactionEligibility || {}),
            ...(unit.interactionEligibility || {})
        };
        unit.modOnlyAnimal = unit.modOnlyAnimal ?? canon.modOnlyAnimal;
        unit.speciesTraits = [...new Set([...(unit.speciesTraits || []), ...(canon.traits || [])])];
        return unit;
    },

    hasBaselineInteractionEligibility(app, unit, interaction = 'social') {
        if (!unit || app._isCorpse(unit)) return false;
        const canon = this.canon(app, unit.species || 'human');
        const eligibility = {
            ...(canon.interactionEligibility || {}),
            ...(unit.interactionEligibility || {})
        };
        const sapience = unit.sapience || canon.sapience;
        const bodyPlan = unit.bodyPlan || canon.bodyPlan;
        const baselineInteraction = unit.baselineInteraction || canon.baselineInteraction;
        const speciesTraits = [...new Set([...(canon.traits || []), ...(unit.speciesTraits || [])])];
        if (eligibility[interaction] === false) return false;
        if (unit.modOnlyAnimal || sapience === 'animal' || bodyPlan === 'animal') return false;
        return baselineInteraction === 'sapient' || sapience === 'person' || sapience === 'spirit' || speciesTraits.includes('person');
    },

    baseStats(sid) {
        const defaults = {
            human: { MPun: 100, MPle: 100, Figh: 10, Feas: 10, Flir: 10, Fuck: 10, Flee: 10, Feed: 10, hunger: 30, str: 10, con: 10, spd: 10, int: 10, wis: 10, cha: 10 },
            wolf: { MPun: 90, MPle: 90, Figh: 14, Feas: 12, Flir: 8, Fuck: 10, Flee: 12, Feed: 12, hunger: 60, str: 14, con: 10, spd: 12, int: 8, wis: 10, cha: 8 },
            fox: { MPun: 85, MPle: 100, Figh: 10, Feas: 10, Flir: 14, Fuck: 12, Flee: 14, Feed: 10, hunger: 40, str: 10, con: 8, spd: 14, int: 12, wis: 10, cha: 14 },
            cat: { MPun: 80, MPle: 90, Figh: 12, Feas: 10, Flir: 12, Fuck: 10, Flee: 16, Feed: 10, hunger: 45, str: 12, con: 8, spd: 16, int: 10, wis: 10, cha: 12 },
            dragon: { MPun: 150, MPle: 120, Figh: 18, Feas: 18, Flir: 8, Fuck: 14, Flee: 6, Feed: 18, hunger: 80, str: 18, con: 16, spd: 10, int: 12, wis: 14, cha: 8 },
            naga: { MPun: 110, MPle: 100, Figh: 12, Feas: 16, Flir: 10, Fuck: 12, Flee: 10, Feed: 16, hunger: 50, str: 12, con: 14, spd: 10, int: 10, wis: 12, cha: 10 },
            slime: { MPun: 80, MPle: 120, Figh: 8, Feas: 16, Flir: 10, Fuck: 18, Flee: 8, Feed: 14, hunger: 70, str: 8, con: 18, spd: 8, int: 10, wis: 10, cha: 10 },
            harpy: { MPun: 85, MPle: 90, Figh: 10, Feas: 10, Flir: 12, Fuck: 10, Flee: 18, Feed: 10, str: 10, con: 8, spd: 18, int: 10, wis: 10, cha: 12 },
            bunny: { MPun: 70, MPle: 100, Figh: 6, Feas: 8, Flir: 14, Fuck: 14, Flee: 20, Feed: 8, hunger: 20, str: 6, con: 6, spd: 20, int: 8, wis: 10, cha: 14 },
            default: { MPun: 100, MPle: 100, Figh: 10, Feas: 10, Flir: 10, Fuck: 10, Flee: 10, Feed: 10, hunger: 40, str: 10, con: 10, spd: 10, int: 10, wis: 10, cha: 10 }
        };
        return defaults[sid] || defaults.default;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SPECIES_SYSTEM = YAW_SPECIES_SYSTEM;
}
