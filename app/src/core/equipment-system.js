/**
 * YOU ARE WILD EQUIPMENT SYSTEM
 * Equipment definitions, stat/effect recalculation, and display summaries.
 */

const YAW_EQUIPMENT_SYSTEM = {
    itemDef(app, item) {
        return YAW_ITEM_REGISTRY.definition(app, item);
    },

    isEquippable(app, item) {
        const def = app._getItemDef(item);
        return def.type === 'equipment' && Boolean(def.slot);
    },

    applyBonus(app, unit, item, direction = 1) {
        const bonus = app._getItemDef(item).equipBonus || {};
        for (const [stat, amount] of Object.entries(bonus)) {
            unit[stat] = (unit[stat] || 0) + amount * direction;
        }
    },

    bonusTotals(app, unit) {
        const totals = {};
        for (const item of Object.values(unit?.equipment || {})) {
            if (!item) continue;
            const bonus = app._getItemDef(item).equipBonus || {};
            for (const [stat, amount] of Object.entries(bonus)) {
                totals[stat] = (totals[stat] || 0) + amount;
            }
        }
        return totals;
    },

    captureBaseStats(app, unit, { inferBase = false } = {}) {
        if (!unit) return {};
        const totals = inferBase ? app._equipmentBonusTotals(unit) : {};
        const base = {};
        for (const stat of app.EQUIPMENT_STAT_KEYS) {
            const current = unit[stat];
            if (typeof current === 'number') base[stat] = current - (totals[stat] || 0);
        }
        return base;
    },

    applyEffect(app, unit, item, direction = 1) {
        const effect = app._getItemDef(item).equipEffect;
        if (!effect) return;
        unit.equipmentEffects = unit.equipmentEffects || {};
        const next = (unit.equipmentEffects[effect] || 0) + direction;
        if (next > 0) unit.equipmentEffects[effect] = next;
        else delete unit.equipmentEffects[effect];
    },

    hasEffect(unit, effect) {
        return Boolean(unit?.equipmentEffects?.[effect]);
    },

    rebuildEffects(app, unit) {
        if (!unit) return;
        unit.equipmentEffects = {};
        for (const item of Object.values(unit.equipment || {})) {
            if (item) app._applyEquipmentEffect(unit, item, 1);
        }
    },

    recalculate(app, unit, { inferBase = false } = {}) {
        if (!unit) return;
        unit.equipment = unit.equipment || {};
        for (const slot of Object.keys(app.EQUIPMENT_SLOTS)) {
            if (!(slot in unit.equipment)) unit.equipment[slot] = null;
        }
        if (!unit.equipmentBaseStats) {
            unit.equipmentBaseStats = app._captureEquipmentBaseStats(unit, { inferBase });
        }
        for (const [stat, value] of Object.entries(unit.equipmentBaseStats || {})) {
            if (typeof value === 'number') unit[stat] = value;
        }
        for (const item of Object.values(unit.equipment || {})) {
            if (item) app._applyEquipmentBonus(unit, item, 1);
        }
        app._rebuildEquipmentEffects(unit);
    },

    summary(app, unit = app.player) {
        const equipment = unit?.equipment || {};
        return Object.entries(app.EQUIPMENT_SLOTS).map(([slot, label]) => {
            const item = equipment[slot];
            return `${app._escapeHtml(label)}: ${item ? app._escapeHtml(item.name) : app._escapeHtml(app._label('save.empty', 'Empty'))}`;
        }).join('<br>');
    },

    compactSummary(app, unit = app.player) {
        const equipment = unit?.equipment || {};
        const equipped = Object.entries(app.EQUIPMENT_SLOTS)
            .map(([slot, label]) => {
                const item = equipment[slot];
                return item ? `${label}: ${item.name}` : '';
            })
            .filter(Boolean);
        return equipped.length ? equipped.map(entry => app._escapeHtml(entry)).join('<br>') : app._escapeHtml(app._label('inventory.noEquipment', 'No equipment'));
    },

    bonusText(app, item) {
        const bonus = app._getItemDef(item).equipBonus || {};
        const entries = Object.entries(bonus).map(([stat, amount]) => `${stat.toUpperCase()} ${amount >= 0 ? '+' : ''}${amount}`);
        const effect = app._getItemDef(item).equipEffect;
        if (effect) entries.push(`${app._label('inventory.effect', 'Effect')}: ${effect}`);
        return entries.length ? entries.join(', ') : app._label('inventory.noBonus', 'No bonus');
    }
};

if (typeof window !== 'undefined') {
    window.YAW_EQUIPMENT_SYSTEM = YAW_EQUIPMENT_SYSTEM;
}
