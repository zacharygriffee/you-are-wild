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
            if (type === 'party' && app._isSyncParticipant(unit) && !roles.includes('actor')) roles.push('participant');
            if (type === 'creature' && app._isCombatMarkedTarget?.(unit)) roles.push('target');
            if (type === 'creature' && app.targetSelection?.source === 'combat' && app.canSelectCreatureTarget(unit)) roles.push('target');
            if (type === 'creature' && app.syncSelection?.active && app.syncSelection.phase === 'target' && app.canSelectCreatureTarget(unit)) roles.push('target');
            return roles;
        }
        if (type === 'party' && app._isExplicitExplorationActor?.(unit)) {
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

    stateAttrs(app, unit, type) {
        const roles = this.roles(app, unit, type);
        if (roles.length === 0) return '';
        const roleList = app._escapeHtml(roles.join(' '));
        const current = app.combatState?.active && roles.includes('actor') ? ' aria-current="true"' : '';
        return `data-selection-roles="${roleList}" data-selection-state="selected"${current}`;
    },

    targetMarkLabel(app) {
        return app._label('target.mark', 'Mark');
    },

    combatTargetMarkLabel(app) {
        return app._label('target.combatTarget', 'Target');
    },

    targetToggleLabel(app, unit, selected = false) {
        const name = unit?.name || app._label('unit.generic', 'unit');
        return selected
            ? app._label('target.removeTargetFor', 'Remove {name} from targets', { name })
            : app._label('target.markFor', 'Mark {name} as target', { name });
    },

    combatTargetToggleLabel(app, unit, selected = false) {
        const name = unit?.name || app._label('unit.generic', 'unit');
        return selected
            ? app._label('target.clearCombatTargetFor', 'Clear {name} combat target', { name })
            : app._label('target.setCombatTargetFor', 'Set {name} as combat target', { name });
    },

    actorToggleLabel(app, unit, selected = false) {
        const name = unit?.name || app._label('unit.generic', 'unit');
        return selected
            ? app._label('target.removeActorFor', 'Remove {name} from actors', { name })
            : app._label('target.addActorFor', 'Add {name} as actor', { name });
    },

    combatTargetPickLabel(app) {
        return app._label('target.pick', 'Pick');
    },

    controlAttrs(app, kind, active = false) {
        if (kind === 'actor') {
            return `data-selection-control="actor" aria-pressed="${Boolean(active)}" data-selection-mode="act-actor" data-selection-state="${active ? 'selected' : 'available'}" data-command-slot="actor"`;
        }
        if (kind === 'target') {
            return `data-selection-control="target" aria-pressed="${Boolean(active)}" data-selection-mode="mark-target" data-selection-state="${active ? 'marked' : 'available'}" data-command-slot="target"`;
        }
        if (kind === 'combat-target') {
            return `data-selection-control="combat-target" data-selection-mode="combat-pick" data-selection-state="${active ? 'pickable' : 'blocked'}" data-command-slot="target"`;
        }
        if (kind === 'combat-mark-target') {
            return `data-selection-control="combat-target" aria-pressed="${Boolean(active)}" data-selection-mode="combat-target" data-selection-state="${active ? 'selected' : 'available'}" data-command-slot="target"`;
        }
        return `data-selection-control="${app._escapeHtml(String(kind || 'unknown'))}"`;
    },

    roleLabel(app, role) {
        if (role === 'actor' && app.combatState?.active && app.syncSelection?.active && app.syncSelection.phase === 'participants') {
            return app._label('target.actorRole', 'Actor');
        }
        if (role === 'actor' && app.combatState?.active) return app._label('combat.exchange.currentActor', 'Current');
        if (role === 'actor') return app._label('target.actorRole', 'Actor');
        if (role === 'participant') return app._label('combat.sync.participantRole', 'Participant');
        if (role === 'target' && app.combatState?.active) return app._label('target.targetRole', 'Target');
        if (role === 'target') return app._label('target.markedRole', 'Marked');
        return role;
    },

    detailLabel(app, unit, expanded = false) {
        const key = expanded ? 'unit.cardHideDetails' : 'unit.cardShowDetails';
        const fallback = expanded ? 'Hide details for {name}' : 'Show details for {name}';
        return app._label(key, fallback, { name: unit?.name || 'unit' });
    },

    focusAttrs(app, unit, expanded = false) {
        const focusTitle = app._escapeHtml(this.detailLabel(app, unit, expanded));
        const state = expanded ? 'expanded' : 'collapsed';
        return `role="button" tabindex="0" data-card-purpose="detail-toggle" data-card-state="${state}" title="${focusTitle}" aria-label="${focusTitle}" aria-expanded="${expanded ? 'true' : 'false'}"`;
    },

    actionRowAttrs(app, scope, unit = null) {
        const safeScope = app._escapeHtml(String(scope || 'unknown'));
        const name = unit?.name || app._label('unit.generic', 'unit');
        const labels = {
            'party-selection': app._label('unit.row.partySelection', 'Actor and target controls for {name}', { name }),
            'party-details': app._label('unit.row.partyDetails', 'Detail controls for {name}', { name }),
            'party-management': app._label('unit.row.partyManagement', 'Party management controls for {name}', { name }),
            'sync-participants': app._label('unit.row.syncParticipants', 'Sync participant controls for {name}', { name }),
            'combat-actions': app._label('unit.row.combatActions', 'Combat intent controls for {name}', { name }),
            'combat-target': app._label('unit.row.combatTarget', 'Combat target controls for {name}', { name }),
            'combat-target-mark': app._label('unit.row.combatTargetMark', 'Combat target marking controls for {name}', { name }),
            'creature-selection': app._label('unit.row.creatureSelection', 'Target controls for {name}', { name })
        };
        const commandSurfaces = {
            'party-selection': 'actor-target-routing',
            'creature-selection': 'target-routing',
            'sync-participants': 'sync-participants',
            'combat-actions': 'combat-intents',
            'combat-target': 'combat-targeting',
            'combat-target-mark': 'combat-targeting',
            'party-details': 'detail-management',
            'party-management': 'detail-management'
        };
        const commandModes = {
            'sync-participants': 'combat',
            'combat-actions': 'combat',
            'combat-target': 'combat',
            'combat-target-mark': 'combat'
        };
        const commandSlots = {
            'creature-selection': 'target',
            'sync-participants': 'actor',
            'combat-actions': 'intent',
            'combat-target': 'target',
            'combat-target-mark': 'target'
        };
        const commandSlotGroups = {
            'party-selection': 'actor target'
        };
        const grammarScopes = new Set([
            'party-selection',
            'creature-selection',
            'sync-participants',
            'combat-actions',
            'combat-target',
            'combat-target-mark'
        ]);
        const label = app._escapeHtml(labels[scope] || app._label('unit.row.actions', 'Actions for {name}', { name }));
        const surface = commandSurfaces[scope];
        const commandMode = commandModes[scope] || 'exploration';
        const slot = commandSlots[scope];
        const slotGroup = commandSlotGroups[scope];
        const slotAttrs = slot
            ? ` data-command-slot="${slot}"`
            : (slotGroup ? ` data-command-slots="${slotGroup}"` : '');
        const commandAttrs = surface
            ? ` data-command-surface="${app._escapeHtml(surface)}" data-command-mode="${commandMode}"${grammarScopes.has(scope) ? ' data-command-grammar="actor-target-intent"' : ''}${slotAttrs}`
            : '';
        return `data-action-scope="${safeScope}" aria-label="${label}"${commandAttrs}`;
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
