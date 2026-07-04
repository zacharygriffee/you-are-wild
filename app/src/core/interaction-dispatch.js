/**
 * YOU ARE WILD INTERACTION DISPATCH
 * Shared command building and routing for actor-target-intent flows.
 */

const YAW_INTERACTION_DISPATCH = {
    intentTarget(app, type, targetRef) {
        return type === 'party'
            ? app.party[Number(targetRef)]
            : app._resolveCreatureRef(targetRef);
    },

    intentCommand(app, type, targetRef, action, subAction = null, source = 'sheet') {
        const actorIds = app._getExplorationActors().map(actor => actor.id || actor.name);
        const target = this.intentTarget(app, type, targetRef);
        return {
            actorIds,
            action,
            subAction,
            targetId: target?.id || target?.name || String(targetRef),
            targetIds: [target?.id || target?.name || String(targetRef)],
            targetType: type,
            source
        };
    },

    selectIntent(app, type, targetRef, action, source = 'sheet', subAction = null) {
        app._haptic(8);
        if (subAction && app.SUB_ACTIONS[action]?.[subAction]) app.defaultSubActions[action] = subAction;
        const command = this.intentCommand(app, type, targetRef, action, subAction, source);
        app.closeIntentMenu();
        if (action === 'close') return false;
        const target = this.intentTarget(app, type, targetRef);
        if (!target) return false;
        app.lastIntentCommand = {
            ...command,
            mode: 'adventure',
            timing: 'immediate'
        };
        if (type === 'party') {
            return this.dispatchPanel(app, {
                mode: 'adventure',
                actors: app._getExplorationActors(),
                targets: [target],
                action,
                subAction,
                source,
                targetType: 'party'
            });
        }
        const targetId = app._unitSelectionId(target);
        if (action === 'loot') return Boolean(app.lootCorpse(targetId));
        if (action === 'scavenge') return Boolean(app.scavengeCorpse(targetId));
        if (action === 'recruit') return Boolean(app.recruitCreatureById(targetId));
        if (action === 'quest') return Boolean(app.previewQuestFromUnit(targetId));
        if (action === 'trade') return Boolean(app.showTrade(targetId));
        return this.dispatchPanel(app, {
            mode: 'adventure',
            actors: app._getExplorationActors(),
            targets: [target],
            action,
            subAction,
            source,
            targetType: 'creature'
        });
    },

    buildCommand(app, context = {}) {
        const mode = context.mode || (app.combatState?.active ? 'combat' : 'adventure');
        const actors = context.actors || (mode === 'combat'
            ? [context.actor || app.activeActor || app._currentCombatActor()].filter(Boolean)
            : app._getExplorationActors());
        const targets = context.targets || (mode === 'combat'
            ? [context.target].filter(Boolean)
            : app._getExplorationTargets());
        const targetTypes = new Set(targets.map(target => app.party.includes(target) ? 'party' : (target.disposition === app.DISPOSITION.ENEMY ? 'enemy' : 'creature')));
        const inferredTargetType = targetTypes.size > 1 ? 'mixed' : ([...targetTypes][0] || null);
        return {
            mode,
            actorIds: actors.map(actor => actor?.id || actor?.name).filter(Boolean),
            targetIds: targets.map(target => target?.id || target?.name).filter(Boolean),
            targetType: context.targetType || inferredTargetType,
            action: context.action || null,
            subAction: context.subAction || null,
            source: context.source || 'panel-card',
            timing: context.timing || 'immediate',
            resolveAt: context.resolveAt || null,
            constraints: context.constraints || {},
            clearTargets: Boolean(context.clearTargets),
            actors,
            targets
        };
    },

    resolvePanelUnit(app, type, ref) {
        if (!ref && ref !== 0) return null;
        if (typeof ref === 'object') return ref;
        const key = String(ref);
        const byKey = unit => app._unitSelectionId(unit) === key || String(unit?.id || unit?.name) === key;
        if (type === 'party') return app.party.find(byKey) || app.party[Number(ref)] || null;
        if (type === 'creature' || type === 'enemy') return app._resolveCreatureRef(ref) || app.creatures.find(byKey) || app.creatures[Number(ref)] || null;
        return app.party.find(byKey) || app.creatures.find(byKey) || null;
    },

    resolvePanelUnits(app, type, refs = []) {
        return (Array.isArray(refs) ? refs : [refs])
            .map(ref => this.resolvePanelUnit(app, type, ref))
            .filter(Boolean);
    },

    buildPanelCommand(app, context = {}) {
        const mode = context.mode || (app.combatState?.active ? 'combat' : 'adventure');
        const actors = context.actors
            || (context.actorRefs ? this.resolvePanelUnits(app, context.actorType || 'party', context.actorRefs) : null)
            || (context.actorRef !== undefined ? this.resolvePanelUnits(app, context.actorType || 'party', [context.actorRef]) : null)
            || (mode === 'combat' ? [app.activeActor || app._currentCombatActor()].filter(Boolean) : app._getExplorationActors());
        const targets = context.targets
            || (context.targetRefs ? this.resolvePanelUnits(app, context.targetType || 'mixed', context.targetRefs) : null)
            || (context.targetRef !== undefined ? this.resolvePanelUnits(app, context.targetType || 'mixed', [context.targetRef]) : null)
            || [];
        return this.buildCommand(app, {
            ...context,
            mode,
            actors,
            targets,
            targetType: context.commandTargetType || context.targetType
        });
    },

    dispatchPanel(app, context = {}) {
        return app._dispatchInteractionCommand(this.buildPanelCommand(app, context));
    },

    validate(app, command) {
        if (!command || !command.action) return { ok: false, reason: 'missing-action' };
        if (!command.actors?.length) return { ok: false, reason: 'missing-actor' };
        if (['fight', 'flirt', 'fuck', 'feast', 'feed', 'inspect'].includes(command.action) && !command.targets?.length && command.mode !== 'combat') {
            return { ok: false, reason: 'missing-target' };
        }
        if (command.mode === 'combat') {
            const current = app._currentCombatActor() || app.activeActor || command.actors[0];
            const actor = command.actors[0];
            if (!current || !actor || app._unitSelectionId(current) !== app._unitSelectionId(actor)) return { ok: false, reason: 'not-current-actor' };
            if (command.targets?.length && ['fight', 'flirt', 'fuck', 'feast'].includes(command.action)) {
                const target = command.targets[0];
                if (!target || target.CPun <= 0 || target.disposition !== app.DISPOSITION.ENEMY) return { ok: false, reason: 'invalid-combat-target' };
                if (!app._canReachCombatTarget(actor, target, command.action)) return { ok: false, reason: 'cannot-reach' };
            }
        }
        return { ok: true };
    },

    dispatch(app, command) {
        if (command?.mode === 'combat') {
            return this.dispatchCombat(app, command);
        }
        const valid = this.validate(app, command);
        if (!valid.ok) return false;
        app.lastIntentCommand = {
            actorIds: command.actorIds,
            action: command.action,
            subAction: command.subAction,
            targetIds: command.targetIds,
            targetType: command.targetType,
            source: command.source,
            mode: command.mode,
            timing: command.timing
        };
        return this.dispatchAdventure(app, command);
    },

    dispatchCombat(app, command) {
        if (!command || command.mode !== 'combat') return false;
        const valid = this.validate(app, command);
        if (!valid.ok) {
            this.reportInvalidCombat(app, command, valid.reason);
            return false;
        }
        app.lastIntentCommand = {
            actorIds: command.actorIds,
            action: command.action,
            subAction: command.subAction,
            targetIds: command.targetIds,
            targetType: command.targetType,
            source: command.source,
            mode: 'combat',
            timing: command.timing
        };
        if (command.timing === 'queued') return app.queueSyncAction(command.action, command.targets?.[0]);
        if (command.action === 'feed' && !command.targets?.length) return app.executeFeedAction(command.actors[0]);
        if (command.targets?.length) return app._resolveCombatAction(command);
        return app.executeCombatIntent(command.action, command.actors[0]);
    },

    reportInvalidCombat(app, command, reason = 'invalid-combat-target') {
        const actor = command?.actors?.[0] || app.activeActor || app._currentCombatActor() || app.player;
        const target = command?.targets?.[0] || null;
        const text = reason === 'cannot-reach' && target
            ? app._label('combat.cannotReachTarget', '{actor} cannot reach {target} from here.', { actor: actor?.name || 'Actor', target: target.name })
            : app._label('combat.invalidCommand', 'That combat action is not valid right now.');
        app._pushLog(text, 'combat', { actor, targetId: target?.id || target?.name, targetName: target?.name, action: command?.action, phase: reason });
        app.renderLog();
        app._renderInteractionState({ exploration: false, toolbelt: true });
    },

    dispatchAdventure(app, command) {
        if (!command || command.mode === 'combat') return false;
        const actors = (command.actors || []).filter(actor => actor && app._isLivingCreature(actor));
        const targets = (command.targets || []).filter(target => target && app._isLivingCreature(target));
        if (!command.action || actors.length === 0 || targets.length === 0) return false;
        app.lastIntentCommand = {
            actorIds: actors.map(actor => actor.id || actor.name),
            action: command.action,
            subAction: command.subAction,
            targetId: targets[0]?.id || targets[0]?.name,
            targetIds: targets.map(target => target.id || target.name),
            targetType: command.targetType || 'marked',
            source: command.source || 'panel-card',
            mode: 'adventure',
            timing: command.timing || 'immediate'
        };
        app.closeMobileContextMenu?.();
        const options = { subAction: command.subAction };
        let resolved = true;
        if (targets.length === 1 && actors.length === 1) {
            resolved = app.outsideActionOnTarget(command.action, targets[0], actors[0], options);
        } else if (targets.length === 1 && actors.length > 1) {
            resolved = app.outsideGroupActionOnTarget(command.action, targets[0], actors, options);
        } else if (targets.length > 1 && actors.length === 1) {
            resolved = app.outsideActionOnTargets(command.action, targets, actors[0], options);
        } else if (app._sameUnitSet(actors, targets)) {
            resolved = app.outsideMutualGroupAction(command.action, actors, options);
        } else if (app._isUnitSubset(targets, actors)) {
            resolved = app.outsideMutualGroupAction(command.action, actors, options);
        } else if (app._isUnitSubset(actors, targets)) {
            resolved = app.outsideMutualGroupAction(command.action, [...actors, ...targets], options);
        } else if (actors.length === targets.length) {
            resolved = app.outsidePairedActionsOnTargets(command.action, actors, targets, options);
        } else {
            app.log.push({ text: app._label('target.chooseOneActor', 'Choose one actor for multi-target {action} actions, or one target for group {action} actions.', {
                action: app._uiLabel(command.action).toLowerCase(),
                actorCount: actors.length,
                targetCount: targets.length
            }), type: 'discovery' });
            app.renderLog();
            app._renderInteractionState({ exploration: true, toolbelt: false });
            return false;
        }
        if (resolved !== false && command.clearTargets) app.clearExplorationTargets();
        return resolved !== false;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_INTERACTION_DISPATCH = YAW_INTERACTION_DISPATCH;
}
