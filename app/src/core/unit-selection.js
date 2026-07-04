/**
 * YOU ARE WILD UNIT SELECTION HELPERS
 * Shared presentation semantics for party/creature focus, acting, marking, and combat picks.
 */

const YAW_UNIT_SELECTION = {
    roles(app, unit, type) {
        if (!unit) return [];
        const roles = [];
        if (app.combatState?.active) {
            if (type === 'party' && app._isCurrentCombatActor(unit)) roles.push('actor');
            if (type === 'party' && app._isSyncParticipant(unit) && !roles.includes('actor')) roles.push('actor');
            if (type === 'creature' && app.targetSelection?.source === 'combat' && app.canSelectCreatureTarget(unit)) roles.push('target');
            if (type === 'creature' && app.syncSelection?.active && app.syncSelection.phase === 'target' && app.canSelectCreatureTarget(unit)) roles.push('target');
            return roles;
        }
        if (type === 'party' && app._getExplorationActors().includes(unit)) {
            roles.push('actor');
        }
        const id = type === 'creature' ? String(unit.id || unit.name || '') : app._unitSelectionId(unit);
        if (app._isExplorationTarget(type, id)) {
            roles.push('target');
        }
        return roles;
    },

    className(app, unit, type) {
        const roles = this.roles(app, unit, type);
        return roles.length ? ` selected ${roles.map(role => `selected-${role}`).join(' ')}` : '';
    },

    targetMarkLabel(app) {
        return app._label('target.mark', 'Mark');
    },

    combatTargetPickLabel(app) {
        return app._label('target.pick', 'Pick');
    },

    controlAttrs(app, kind, active = false) {
        if (kind === 'actor') {
            return `data-selection-control="actor" aria-pressed="${Boolean(active)}" data-selection-mode="act-actor" data-selection-state="${active ? 'selected' : 'available'}"`;
        }
        if (kind === 'target') {
            return `data-selection-control="target" aria-pressed="${Boolean(active)}" data-selection-mode="mark-target" data-selection-state="${active ? 'marked' : 'available'}"`;
        }
        if (kind === 'combat-target') {
            return `data-selection-control="combat-target" data-selection-mode="combat-pick" data-selection-state="${active ? 'pickable' : 'blocked'}"`;
        }
        return `data-selection-control="${app._escapeHtml(String(kind || 'unknown'))}"`;
    },

    roleLabel(app, role) {
        if (role === 'actor') return app._label('target.actorRole', 'Actor');
        if (role === 'target' && app.combatState?.active) return app._label('target.targetRole', 'Target');
        if (role === 'target') return app._label('target.markedRole', 'Marked');
        return role;
    },

    focusLabel(app, unit) {
        return app._label('unit.cardFocus', 'Focus {name} card', { name: unit?.name || 'unit' });
    },

    chips(app, unit, type) {
        const chips = this.roles(app, unit, type).map(role => {
            const safeLabel = app._escapeHtml(this.roleLabel(app, role));
            return `<span class="unit-trait-chip selection" data-selection-role="${app._escapeHtml(role)}" title="${safeLabel}">${safeLabel}</span>`;
        });
        if (chips.length === 0) return '';
        const label = app._escapeHtml(app._label('target.selectedSummary', 'Selected exploration targets'));
        return `<div class="unit-traits unit-selection-chips" aria-label="${label}">${chips.join('')}</div>`;
    }
};

window.YAW_UNIT_SELECTION = YAW_UNIT_SELECTION;
