/**
 * YOU ARE WILD COMBAT PLANNING
 * Unified combat Actor(s) -> Mark(s) -> Intent -> Confirm planning state.
 */

const YAW_COMBAT_PLANNING = {
    currentActor(app) {
        return app._currentCombatActor?.() || app.activeActor || app.player || null;
    },

    actorId(app, unit) {
        return unit ? app._unitSelectionId(unit) : '';
    },

    isActive(app) {
        return Boolean(app.combatPlanSelection?.active);
    },

    ensure(app, options = {}) {
        if (!app.combatState?.active || app.feedSelection?.active) return false;
        if (app.syncSelection?.active) return false;
        const current = this.currentActor(app);
        if (!current || !app.party.includes(current) || current.CPun <= 0) return false;
        if (!app.combatPlanSelection?.active) {
            const currentId = this.actorId(app, current);
            app.combatPlanSelection = {
                active: true,
                source: 'combat-planner',
                actorIds: options.skipDefaultActor ? [] : [currentId],
                pendingIntent: null,
                explicitActors: false,
                hadGroupActors: false
            };
        }
        this.normalize(app);
        return true;
    },

    normalize(app) {
        if (!app.combatPlanSelection?.active) return false;
        const current = this.currentActor(app);
        const currentId = current && app.party.includes(current) && current.CPun > 0 ? this.actorId(app, current) : '';
        const validIds = [];
        for (const id of app.combatPlanSelection.actorIds || []) {
            const unit = app.party.find(candidate => this.actorId(app, candidate) === String(id) || String(candidate?.id || candidate?.name) === String(id));
            if (unit && unit.CPun > 0) {
                const unitId = this.actorId(app, unit);
                if (!validIds.includes(unitId)) validIds.push(unitId);
            }
        }
        app.combatPlanSelection.actorIds = currentId
            ? [currentId, ...validIds.filter(id => id !== currentId)]
            : validIds;
        if (app._combatMarkedTargets) app._combatMarkedTargets();
        return true;
    },

    actors(app) {
        if (!app.combatState?.active) return [];
        if (!app.combatPlanSelection?.active) {
            const current = this.currentActor(app);
            return current && app.party.includes(current) && current.CPun > 0 ? [current] : [];
        }
        this.normalize(app);
        return (app.combatPlanSelection.actorIds || [])
            .map(id => app.party.find(unit => this.actorId(app, unit) === id || String(unit?.id || unit?.name) === id))
            .filter(Boolean);
    },

    isActorSelected(app, unit) {
        if (!unit || !app.combatState?.active) return false;
        const id = this.actorId(app, unit);
        if (!app.combatPlanSelection?.active) {
            const current = this.currentActor(app);
            return Boolean(current && this.actorId(app, current) === id);
        }
        return (app.combatPlanSelection.actorIds || []).includes(id);
    },

    toggleActor(app, id) {
        if (!this.ensure(app)) return false;
        app.combatCorrectionMessage = null;
        const key = String(id || '');
        const unit = app.party.find(candidate => this.actorId(app, candidate) === key || String(candidate?.id || candidate?.name) === key);
        if (!unit || unit.CPun <= 0) return false;
        const unitId = this.actorId(app, unit);
        const current = this.currentActor(app);
        const currentId = current ? this.actorId(app, current) : '';
        const ids = app.combatPlanSelection.actorIds || [];
        app.combatPlanSelection.actorIds = unitId === currentId
            ? [unitId, ...ids.filter(existing => existing !== unitId)]
            : (ids.includes(unitId)
                ? ids.filter(existing => existing !== unitId)
                : [...ids, unitId]);
        app.combatPlanSelection.hadGroupActors = app.combatPlanSelection.actorIds.length > 1;
        app.combatPlanSelection.explicitActors = true;
        app.targetSelection = null;
        this.normalize(app);
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    setIntent(app, action) {
        if (!this.ensure(app)) return false;
        app.combatCorrectionMessage = null;
        app.combatPlanSelection.pendingIntent = action || null;
        app.targetSelection = null;
        app._clearCenterActionsForCombat?.();
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    pendingIntent(app) {
        return app.combatPlanSelection?.active ? (app.combatPlanSelection.pendingIntent || null) : null;
    },

    shouldPlanIntent(app) {
        if (!app.combatState?.active) return false;
        if (app.syncSelection?.active || app.feedSelection?.active) return false;
        const actorIds = app.combatPlanSelection?.actorIds || [];
        const actorPlan = Boolean(app.combatPlanSelection?.active && (app.combatPlanSelection.explicitActors || actorIds.length !== 1));
        const marked = (app._combatMarkedTargets?.() || []).length > 0;
        return actorPlan || marked;
    },

    clear(app, reason = 'cancel', options = {}) {
        if (!app.combatPlanSelection?.active) return false;
        app.combatCorrectionMessage = null;
        app.combatPlanSelection = null;
        app.targetSelection = null;
        if (options.clearTargets) {
            app.combatTargetId = null;
            app.combatTargetIds = [];
        }
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    typeForIntent(app, action) {
        if (typeof YAW_COMBAT_SYNC !== 'undefined' && YAW_COMBAT_SYNC.typeForIntent) {
            return YAW_COMBAT_SYNC.typeForIntent(action);
        }
        const map = { fight: 'sync_fight', flirt: 'sync_flirt', fuck: 'sync_fuck', feed: 'sync_feed' };
        return map[action] || null;
    },

    confirm(app) {
        if (!app.combatPlanSelection?.active) return false;
        const intendedGroup = Boolean(app.combatPlanSelection.hadGroupActors);
        this.normalize(app);
        const action = app.combatPlanSelection.pendingIntent;
        const syncType = this.typeForIntent(app, action);
        const actors = this.actors(app);
        const targets = app._combatMarkedTargets?.() || [];
        const current = this.currentActor(app);
        const includesCurrent = Boolean(current && actors.some(unit => this.actorId(app, unit) === this.actorId(app, current)));
        const partyTargets = (app._getExplorationTargets?.() || []).filter(unit => app.party.includes(unit));
        const supportIntents = new Set(['feed', 'heal', 'guard', 'assist']);
        const command = app._buildPanelInteractionCommand({
            mode: 'combat',
            actors,
            targets,
            action: syncType || action,
            source: 'combat-planner',
            targetType: 'enemy',
            shape: 'many-to-one',
            timing: 'slowest-participant',
            distribution: 'single',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: true,
                checkReach: true,
                checkRows: true,
                minActors: 2,
                minTargets: 1,
                maxTargets: 1
            },
            metadata: {
                baseAction: syncType ? app._syncBaseAction(syncType) : action,
                phase: 'confirm',
                consumeCurrentTurn: true
            }
        });
        if (!action) {
            app._reportInvalidCombatCommand?.(command, 'missing-action');
            return false;
        }
        if (!includesCurrent) {
            app._reportInvalidCombatCommand?.(command, 'missing-lead-actor');
            return false;
        }
        if (partyTargets.length > 0 && !supportIntents.has(action)) {
            app._reportInvalidCombatCommand?.({ ...command, targets: partyTargets, targetType: 'party' }, 'party-target-blocked');
            return false;
        }
        if (actors.length === 1 && !intendedGroup) {
            const singleCommand = app._buildPanelInteractionCommand({
                mode: 'combat',
                actors,
                targets,
                action,
                source: 'combat-planner',
                targetType: 'enemy',
                shape: 'one-to-one',
                timing: 'current-turn',
                distribution: 'single',
                constraints: {
                    requireCurrentTurn: true,
                    hostileOnly: true,
                    checkReach: true,
                    checkRows: true,
                    minActors: 1,
                    minTargets: 1,
                    maxTargets: 1
                },
                metadata: {
                    baseAction: action,
                    phase: 'confirm',
                    consumeCurrentTurn: true
                }
            });
            const singleValid = app._validateInteractionCommand?.(singleCommand) || { ok: true };
            if (!singleValid.ok) {
                app._reportInvalidCombatCommand?.(singleCommand, singleValid.reason);
                return false;
            }
            app.combatPlanSelection = null;
            return app._dispatchInteractionCommand(singleCommand);
        }
        if (!syncType) {
            app._reportInvalidCombatCommand?.(command, 'invalid-combat-target');
            return false;
        }
        const valid = app._validateInteractionCommand?.(command) || { ok: true };
        if (!valid.ok) {
            app._reportInvalidCombatCommand?.(command, valid.reason);
            return false;
        }
        return app._dispatchInteractionCommand(command);
    },

    controls(app) {
        if (!app.combatPlanSelection?.active) return '';
        const actorCount = this.actors(app).length;
        const confirmLabel = app._escapeHtml(actorCount > 1
            ? app._label('combat.group.confirm', 'Confirm Group')
            : app._label('combat.action.confirm', 'Confirm Action'));
        const clearLabel = app._escapeHtml(app._label('combat.group.clear', 'Clear Group'));
        const pending = Boolean(app.combatPlanSelection.pendingIntent);
        const pendingClass = pending ? ' primary' : '';
        return `<div class="unit-actions unit-combat-actions compact combat-group-compose-controls" data-command-surface="combat-planner" data-command-mode="combat" data-command-grammar="actor-target-intent" role="group" aria-label="${confirmLabel}">
            <button class="action-btn${pendingClass}" data-command-surface="combat-planner" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="confirm-combat-plan" data-command-slot="intent" title="${confirmLabel}" aria-label="${confirmLabel}" onclick="event.stopPropagation();App.confirmCombatPlan()">${confirmLabel}</button>
            <button class="action-btn" data-command-surface="combat-planner" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="clear-combat-group" data-command-slot="exit" title="${clearLabel}" aria-label="${clearLabel}" onclick="event.stopPropagation();App.clearCombatPlan()">${clearLabel}</button>
        </div>`;
    },

    quickTargetClick(app, action, targetId) {
        if (!app.combatState?.active || !action) return false;
        const target = app.creatures.find(c => String(c.id || c.name) === String(targetId) || app._unitSelectionId(c) === String(targetId));
        if (!target) return false;
        const actor = this.currentActor(app);
        const command = app._buildPanelInteractionCommand({
            mode: 'combat',
            actors: [actor].filter(Boolean),
            targets: [target],
            action,
            source: 'combat-quick-target',
            targetType: 'enemy',
            constraints: { requireCurrentTurn: true, hostileOnly: action !== 'scavenge', checkReach: action !== 'scavenge', checkRows: action !== 'scavenge' }
        });
        const valid = app._validateInteractionCommand?.(command) || { ok: true };
        if (!valid.ok) {
            app._reportInvalidCombatCommand?.(command, valid.reason);
            return false;
        }
        app.targetSelection = null;
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.combatPlanSelection = null;
        return app._dispatchInteractionCommand(command);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_PLANNING = YAW_COMBAT_PLANNING;
}
