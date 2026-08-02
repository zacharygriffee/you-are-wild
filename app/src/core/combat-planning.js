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

    isQueuedParticipant(app, unit) {
        if (!unit || !app.party.includes(unit) || unit.CPun <= 0) return false;
        if (typeof app._isCombatQueueUnitValid === 'function' && !app._isCombatQueueUnitValid(unit)) return false;
        const unitId = this.actorId(app, unit);
        return (app.combatState?.turnQueue || []).some(entry => {
            const queued = entry?.unit || entry;
            return queued === unit || (unitId && this.actorId(app, queued) === unitId);
        });
    },

    isSelectableParticipant(app, unit) {
        return Boolean(unit && app.party.includes(unit));
    },

    unavailableParticipantReason(app, unit) {
        if (!unit || !app.party.includes(unit)) return 'missing';
        if (unit.CPun <= 0 || unit.knockedOut) return 'fallen';
        if (unit.fledCombat) return 'fled';
        const status = unit.status || {};
        if (status.fear?.turns > 0) return 'fear';
        if (status.stun?.turns > 0) return 'stunned';
        if (status.freeze?.skip) return 'frozen';
        if (status.restrained?.turns > 0) return 'restrained';
        if (status.stuck?.turns > 0) return 'stuck';
        if (status.enveloped?.turns > 0) return 'enveloped';
        if (!this.isQueuedParticipant(app, unit)) return 'not-in-turn-order';
        return null;
    },

    isActive(app) {
        return Boolean(app.combatPlanSelection?.active);
    },

    ensure(app, options = {}) {
        if (!app.combatState?.active || app.feedSelection?.active) return false;
        if (app.syncSelection?.active) return false;
        app._sanitizeCombatState?.({ preserveTurn: true });
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
            if (this.isSelectableParticipant(app, unit)) {
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
            .filter(unit => this.isSelectableParticipant(app, unit));
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
        if (!this.isSelectableParticipant(app, unit)) return false;
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
        const actors = this.actors(app);
        if (action === 'feast'
            && this.markedTargets(app).length === 0
            && YAW_COMBAT_FEED.hasAvailableSelfAction(app, action, actors)) {
            return YAW_COMBAT_FEED.executeVariantAction(app, action, actors[0], null, {
                actors,
                scope: 'self',
                forceChoose: true
            });
        }
        app.combatPlanSelection.pendingIntent = action || null;
        app.targetSelection = null;
        app._clearCenterActionsForCombat?.();
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    clearIntent(app) {
        if (!app.combatPlanSelection?.active) return false;
        app.combatCorrectionMessage = null;
        app.combatPlanSelection.pendingIntent = null;
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    pendingIntent(app) {
        return app.combatPlanSelection?.active ? (app.combatPlanSelection.pendingIntent || null) : null;
    },

    markedTargets(app) {
        const targets = [
            ...(app._combatMarkedTargets?.() || []),
            ...((app._getExplorationTargets?.() || []).filter(unit => app.party.includes(unit)))
        ];
        const seen = new Set();
        return targets.filter(unit => {
            if (!unit) return false;
            const id = this.actorId(app, unit) || String(unit.id || unit.name || '');
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    },

    targetType(app, targets = []) {
        const types = new Set(targets.map(unit => app.party.includes(unit)
            ? 'party'
            : (unit?.disposition === app.DISPOSITION.ENEMY ? 'enemy' : 'creature')));
        return types.size > 1 ? 'mixed' : ([...types][0] || 'target');
    },

    shouldPlanIntent(app) {
        if (!app.combatState?.active) return false;
        if (app.syncSelection?.active || app.feedSelection?.active) return false;
        const actorIds = app.combatPlanSelection?.actorIds || [];
        const actorPlan = Boolean(app.combatPlanSelection?.active && (app.combatPlanSelection.explicitActors || actorIds.length !== 1));
        const marked = this.markedTargets(app).length > 0;
        return actorPlan || marked;
    },

    requiresCommit(app) {
        if (!app.combatPlanSelection?.active) return false;
        const actors = this.actors(app);
        return Boolean(app.combatPlanSelection.hadGroupActors || actors.length > 1);
    },

    clear(app, reason = 'cancel', options = {}) {
        if (!app.combatPlanSelection?.active) return false;
        app.combatCorrectionMessage = null;
        app.combatPlanSelection = null;
        app.targetSelection = null;
        const clearTargets = options.clearTargets ?? reason === 'cancel';
        if (clearTargets) {
            app._clearCombatMarkedTargets?.();
        }
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    typeForIntent(app, action) {
        if (typeof YAW_COMBAT_SYNC !== 'undefined' && YAW_COMBAT_SYNC.typeForIntent) {
            return YAW_COMBAT_SYNC.typeForIntent(action);
        }
        const map = { fight: 'sync_fight', flirt: 'sync_flirt', fuck: 'sync_fuck', feed: 'sync_feed', feast: 'feast' };
        return map[action] || null;
    },

    confirm(app, options = {}) {
        if (!app.combatPlanSelection?.active) return false;
        const intendedGroup = Boolean(app.combatPlanSelection.hadGroupActors);
        this.normalize(app);
        const action = app.combatPlanSelection.pendingIntent;
        const syncType = this.typeForIntent(app, action);
        const actors = this.actors(app);
        const targets = this.markedTargets(app);
        const targetType = this.targetType(app, targets);
        const current = this.currentActor(app);
        const includesCurrent = Boolean(current && actors.some(unit => this.actorId(app, unit) === this.actorId(app, current)));
        const command = app._buildPanelInteractionCommand({
            mode: 'combat',
            actors,
            targets,
            action: syncType || action,
            source: 'combat-planner',
            targetType,
            shape: actors.length > 1 && targets.length > 1 ? 'many-to-many' : 'many-to-one',
            timing: 'slowest-participant',
            distribution: targets.length > 1 ? 'all' : 'single',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: false,
                checkReach: true,
                checkRows: true,
                minActors: 2,
                minTargets: 1,
                maxTargets: null
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
        if (intendedGroup && actors.length < 2) {
            app._reportInvalidCombatCommand?.(command, 'missing-actor');
            return false;
        }
        const unavailable = actors.filter(unit => this.unavailableParticipantReason(app, unit));
        if (unavailable.length) {
            command.metadata.unavailableActorReasons = unavailable.map(unit => ({
                id: this.actorId(app, unit),
                reason: this.unavailableParticipantReason(app, unit)
            }));
            app._reportInvalidCombatCommand?.(command, 'actor-unavailable');
            return false;
        }
        if (actors.length === 1 && !intendedGroup) {
            const opensApproachChooser = ['fight', 'flirt', 'fuck', 'feast', 'feed'].includes(action);
            if (opensApproachChooser && targets.length > 0) {
                app.combatPlanSelection = null;
                return YAW_COMBAT_FEED.executeVariantAction(app, action, actors[0], targets, {
                    actors,
                    targets,
                    forceChoose: options.forceChoose === true
                });
            }
            const singleCommand = app._buildPanelInteractionCommand({
                mode: 'combat',
                actors,
                targets,
                action,
                source: 'combat-planner',
                targetType,
                shape: 'one-to-one',
                timing: 'current-turn',
                distribution: 'single',
                constraints: {
                    requireCurrentTurn: true,
                    hostileOnly: false,
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
        if (['fight', 'flirt', 'fuck', 'feast', 'feed'].includes(action) && targets.length > 0) {
            app.combatPlanSelection = null;
            return YAW_COMBAT_FEED.executeVariantAction(app, action, actors[0], targets, {
                actors,
                targets,
                forceChoose: options.forceChoose === true
            });
        }
        return app._dispatchInteractionCommand(command);
    },

    controls(app, options = {}) {
        if (!app.combatPlanSelection?.active) return '';
        const actorCount = this.actors(app).length;
        const pendingIntent = app.combatPlanSelection.pendingIntent;
        const intentLabel = pendingIntent ? app._uiLabel(pendingIntent) : app._label('ui.chooseAction', 'Choose');
        const confirmLabel = app._escapeHtml(actorCount > 1
            ? app._label('combat.group.commitIntent', 'Commit Group {intent}', { intent: intentLabel })
            : app._label('combat.action.commitIntent', 'Commit {intent}', { intent: intentLabel }));
        const cancelLabel = app._escapeHtml(app._label('combat.group.cancel', 'Cancel Group'));
        const confirm = pendingIntent
            ? `<button class="action-btn primary" data-command-surface="combat-planner" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="confirm-combat-plan" data-command-slot="intent" data-command-intent="${app._escapeHtml(pendingIntent)}" title="${confirmLabel}" aria-label="${confirmLabel}" onclick="event.stopPropagation();App.confirmCombatPlan(true)">${confirmLabel}</button>`
            : '';
        const reset = options.includeReset === false
            ? ''
            : `<button class="action-btn compact-secondary" data-command-surface="combat-planner" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="clear-combat-group" data-command-slot="exit" title="${cancelLabel}" aria-label="${cancelLabel}" onclick="event.stopPropagation();App.clearCombatPlan()">${cancelLabel}</button>`;
        return `<div class="unit-actions unit-combat-actions compact combat-group-compose-controls" data-command-surface="combat-planner" data-command-mode="combat" data-command-grammar="actor-target-intent" role="group" aria-label="${pendingIntent ? confirmLabel : cancelLabel}">
            ${confirm}
            ${reset}
        </div>`;
    },

    quickTargetClick(app, action, targetId) {
        if (!app.combatState?.active || !action) return false;
        const target = app.creatures.find(c => String(c.id || c.name) === String(targetId) || app._unitSelectionId(c) === String(targetId));
        if (!target) return false;
        const actor = this.currentActor(app);
        if (['fight', 'flirt', 'fuck', 'feast', 'feed'].includes(action)) {
            app.targetSelection = null;
            app._clearCombatMarkedTargets?.();
            app.combatPlanSelection = null;
            return YAW_COMBAT_FEED.executeVariantAction(app, action, actor, [target], {
                actors: [actor].filter(Boolean),
                targets: [target],
                forceChoose: true
            });
        }
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
        app._clearCombatMarkedTargets?.();
        app.combatPlanSelection = null;
        return app._dispatchInteractionCommand(command);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_PLANNING = YAW_COMBAT_PLANNING;
}
