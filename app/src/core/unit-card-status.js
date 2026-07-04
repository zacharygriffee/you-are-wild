/**
 * YOU ARE WILD UNIT CARD STATUS
 * Shared tactical bars and trait chips for desktop cards and mobile chips.
 */

const YAW_UNIT_CARD_STATUS = {
    barPercent(current, max) {
        const safeMax = Number(max);
        if (!Number.isFinite(safeMax) || safeMax <= 0) return 0;
        const value = Number(current);
        if (!Number.isFinite(value)) return 0;
        return Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));
    },

    tacticalBar(app, key, label, icon, current, max) {
        const percent = this.barPercent(current, max);
        const title = app._escapeHtml(`${label}: ${percent}%`);
        return `<div class="unit-bar unit-bar-${key}" title="${title}" aria-label="${title}"><span class="unit-bar-icon" aria-hidden="true">${icon}</span><span class="unit-bar-track" aria-hidden="true"><span class="unit-bar-fill" style="width:${percent}%"></span></span>${app._srOnly(title)}</div>`;
    },

    tacticalBars(app, unit, options = {}) {
        const stats = app._unitDisplayStats(unit || {});
        const compact = Boolean(options.compact);
        const healthLabel = app._label('party.punishment', 'Punishment');
        const pleasureLabel = app._label('party.pleasure', 'Pleasure');
        const hungerLabel = app._label('party.hunger', 'Hunger');
        const maxHunger = unit?.maxHunger || 100;
        const hunger = unit?.hunger ?? 0;
        const bars = [
            this.tacticalBar(app, 'health', healthLabel, compact ? '❤' : '❤', stats.CPun, stats.MPun),
            this.tacticalBar(app, 'pleasure', pleasureLabel, compact ? '✦' : '✦', stats.CPle, stats.MPle),
            this.tacticalBar(app, 'hunger', hungerLabel, compact ? '🍖' : '🍖', hunger, maxHunger)
        ].join('');
        return `<div class="unit-bars${compact ? ' compact' : ''}" aria-label="${app._escapeHtml(app._label('ui.tacticalStatus', 'Tactical status'))}">${bars}</div>`;
    },

    visibleTraits(app, unit, type, limit = 3) {
        if (!unit) return [];
        const stats = app._unitDisplayStats(unit || {});
        const maxHunger = unit.maxHunger || 100;
        const hunger = unit.hunger ?? 0;
        const status = unit.status || {};
        const chips = [];
        const add = (key, label, tone = 'neutral') => {
            if (!chips.some(chip => chip.key === key)) chips.push({ key, label, tone });
        };
        if (status.sleep || unit.asleep) add('asleep', app._label('unit.trait.asleep', 'Asleep'), 'status');
        if (status.poisoned) add('poisoned', app._label('unit.trait.poisoned', 'Poison'), 'danger');
        if (status.burn) add('burning', app._label('unit.trait.burning', 'Burning'), 'danger');
        if (status.bleed) add('bleeding', app._label('unit.trait.bleeding', 'Bleeding'), 'danger');
        if (status.stun) add('stunned', app._label('unit.trait.stunned', 'Stunned'), 'status');
        if (status.freeze) add('frozen', app._label('unit.trait.frozen', 'Frozen'), 'status');
        if (status.fear) add('fear', app._label('unit.trait.fear', 'Fear'), 'status');
        if (status.restrained || status.enveloped || status.stuck) add('restrained', app._label('unit.trait.restrained', 'Restrained'), 'status');
        if (stats.MPun > 0 && stats.CPun <= stats.MPun * 0.35) add('wounded', app._label('unit.trait.wounded', 'Wounded'), 'danger');
        if (maxHunger > 0 && hunger >= maxHunger * 0.7) add('hungry', app._label('unit.trait.hungry', 'Hungry'), 'need');
        if (type === 'party') {
            const role = app._getPartyRole(unit);
            if (role && role !== 'companion') add(`role-${role}`, app._partyRoleLabel(role), 'role');
        } else {
            if (unit.disposition === app.DISPOSITION.MERCHANT) add('merchant', app._label('disposition.merchant', 'Merchant'), 'special');
            else if (unit.quest) add('quest', app._label('disposition.quest', 'Quest'), 'special');
            else if (unit.disposition === app.DISPOSITION.FRIENDLY) add('friendly', app._label('disposition.friendly', 'Friendly'), 'relation');
            else if (unit.disposition === app.DISPOSITION.NEUTRAL) add('neutral', app._label('disposition.neutral', 'Neutral'), 'relation');
            else if (unit.disposition === app.DISPOSITION.ENEMY) add('hostile', app._label('disposition.hostile', 'Hostile'), 'danger');
        }
        if (unit.flying) add('flying', app._label('unit.trait.flying', 'Flying'), 'ability');
        if (unit.darkvision) add('darkvision', app._label('unit.trait.darkvision', 'Darkvision'), 'ability');
        if (unit.sapience === 'person' || unit.speciesTraits?.includes('person')) add('person', app._label('unit.trait.person', 'Person'), 'special');
        return chips.slice(0, Math.max(0, limit));
    },

    traitChips(app, unit, type, limit = 3) {
        const chips = this.visibleTraits(app, unit, type, limit);
        if (chips.length === 0) return '';
        const label = app._escapeHtml(app._label('ui.unitTraits', 'Unit traits'));
        const items = chips.map(chip => `<span class="unit-trait-chip ${app._escapeHtml(chip.tone)}" title="${app._escapeHtml(chip.label)}">${app._escapeHtml(chip.label)}</span>`).join('');
        return `<div class="unit-traits" aria-label="${label}">${items}</div>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UNIT_CARD_STATUS = YAW_UNIT_CARD_STATUS;
}
