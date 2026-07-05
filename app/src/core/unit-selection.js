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
        const marked = type === 'creature'
            ? app._isExplorationTargetUnit(type, unit)
            : app._isExplorationTarget(type, app._unitSelectionId(unit));
        if (marked) {
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

    focusAttrs(app, unit, expanded = false) {
        const focusTitle = app._escapeHtml(this.focusLabel(app, unit));
        const state = expanded ? 'expanded' : 'collapsed';
        return `role="button" tabindex="0" data-card-purpose="focus-toggle" data-card-state="${state}" title="${focusTitle}" aria-label="${focusTitle}" aria-expanded="${expanded ? 'true' : 'false'}"`;
    },

    actionRowAttrs(app, scope, unit = null) {
        const safeScope = app._escapeHtml(String(scope || 'unknown'));
        const name = unit?.name || app._label('unit.generic', 'unit');
        const labels = {
            'party-selection': app._label('unit.row.partySelection', 'Actor and target controls for {name}', { name }),
            'party-management': app._label('unit.row.partyManagement', 'Party management controls for {name}', { name }),
            'sync-participants': app._label('unit.row.syncParticipants', 'Sync participant controls for {name}', { name }),
            'combat-actions': app._label('unit.row.combatActions', 'Combat intent controls for {name}', { name }),
            'corpse-utility': app._label('unit.row.corpseUtility', 'Corpse utility actions for {name}', { name }),
            'combat-target': app._label('unit.row.combatTarget', 'Combat target controls for {name}', { name }),
            'creature-selection': app._label('unit.row.creatureSelection', 'Target controls for {name}', { name })
        };
        const label = app._escapeHtml(labels[scope] || app._label('unit.row.actions', 'Actions for {name}', { name }));
        return `data-action-scope="${safeScope}" aria-label="${label}"`;
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
