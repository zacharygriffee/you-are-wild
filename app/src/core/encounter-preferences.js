/**
 * YOU ARE WILD ENCOUNTER PREFERENCES
 * Encounter identity weight normalization, presets, UI synchronization, and identity anatomy mapping.
 */

const YAW_ENCOUNTER_PREFERENCES = {
    keys: ['female', 'male', 'nonbinary'],
    defaults: { female: 34, male: 33, nonbinary: 33 },

    normalize(weights = null) {
        const source = weights && typeof weights === 'object' ? weights : {};
        const normalized = {
            female: Math.max(0, Math.min(100, Math.round(Number(source.female) || 0))),
            male: Math.max(0, Math.min(100, Math.round(Number(source.male) || 0))),
            nonbinary: Math.max(0, Math.min(100, Math.round(Number(source.nonbinary) || 0)))
        };
        const total = normalized.female + normalized.male + normalized.nonbinary;
        if (total <= 0) return { ...this.defaults };
        if (total === 100) return normalized;
        const scaled = {
            female: Math.round((normalized.female / total) * 100),
            male: Math.round((normalized.male / total) * 100),
            nonbinary: Math.round((normalized.nonbinary / total) * 100)
        };
        const delta = 100 - (scaled.female + scaled.male + scaled.nonbinary);
        const topKey = Object.entries(scaled).sort((a, b) => b[1] - a[1])[0][0];
        scaled[topKey] += delta;
        return scaled;
    },

    preset(value) {
        if (value === 'female') return { female: 75, male: 13, nonbinary: 12 };
        if (value === 'male') return { female: 13, male: 75, nonbinary: 12 };
        if (value === 'nonbinary') return { female: 13, male: 12, nonbinary: 75 };
        return { ...this.defaults };
    },

    preferenceFromWeights(weights) {
        const normalized = this.normalize(weights);
        const [topKey, topValue] = Object.entries(normalized).sort((a, b) => b[1] - a[1])[0];
        return topValue >= 70 ? topKey : 'any';
    },

    setWeights(app, weights, preset = null) {
        app.selectedEncounterWeights = this.normalize(weights);
        app.selectedEncounterPreference = preset || this.preferenceFromWeights(app.selectedEncounterWeights);
        this.syncUI(app);
    },

    syncUI(app) {
        const weights = this.normalize(app.selectedEncounterWeights);
        for (const key of this.keys) {
            const input = document.getElementById(`encounter-weight-${key}`);
            const output = document.getElementById(`encounter-weight-${key}-value`);
            if (input) input.value = String(weights[key]);
            if (output) output.textContent = `${weights[key]}%`;
        }
        document.querySelectorAll('#preference-grid .option-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.value === app.selectedEncounterPreference);
        });
    },

    setPreset(app, value) {
        this.setWeights(app, this.preset(value), value);
    },

    updateWeight(app, key, value) {
        const weights = this.normalize(app.selectedEncounterWeights);
        const nextValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
        const others = this.keys.filter(candidate => candidate !== key);
        const remaining = 100 - nextValue;
        const otherTotal = others.reduce((sum, candidate) => sum + weights[candidate], 0);
        weights[key] = nextValue;
        if (otherTotal <= 0) {
            weights[others[0]] = Math.ceil(remaining / 2);
            weights[others[1]] = Math.floor(remaining / 2);
        } else {
            weights[others[0]] = Math.round((weights[others[0]] / otherTotal) * remaining);
            weights[others[1]] = remaining - weights[others[0]];
        }
        this.setWeights(app, weights);
    },

    pickIdentity(rollValue, weights) {
        const normalized = this.normalize(weights);
        const total = normalized.female + normalized.male + normalized.nonbinary;
        const pick = Math.max(0, Math.min(0.999999, rollValue)) * total;
        if (pick < normalized.female) return 'female';
        if (pick < normalized.female + normalized.male) return 'male';
        return 'nonbinary';
    },

    anatomyForIdentity(identity, rollValue) {
        if (identity === 'male') return { parts: 'cock', chest: 'pecs' };
        if (identity === 'female') return { parts: 'clit', chest: 'tits' };
        return rollValue < 0.5 ? { parts: 'cock', chest: 'pecs' } : { parts: 'clit', chest: 'tits' };
    }
};

if (typeof window !== 'undefined') {
    window.YAW_ENCOUNTER_PREFERENCES = YAW_ENCOUNTER_PREFERENCES;
}
