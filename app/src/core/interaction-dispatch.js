/**
 * YOU ARE WILD INTERACTION DISPATCH
 * Shared command building and routing for actor-target-intent flows.
 */

const YAW_INTERACTION_DISPATCH = {
    normalizeSource(source = 'sheet') {
        return ['panel-tray', 'desktop-target', 'mobile-target'].includes(source) ? 'composer-tray' : source;
    },

    intentTarget(app, type, targetRef) {
        return type === 'party'
            ? app.party[Number(targetRef)]
            : app._resolveCreatureRef(targetRef);
    },

    intentCommand(app, type, targetRef, action, subAction = null, source = 'sheet') {
        const commandSource = this.normalizeSource(source);
        const actorIds = app._getExplorationActors().map(actor => actor.id || actor.name);
        const target = this.intentTarget(app, type, targetRef);
        return {
            actorIds,
            action,
            subAction,
            targetId: target?.id || target?.name || String(targetRef),
            targetIds: [target?.id || target?.name || String(targetRef)],
            targetType: type,
            source: commandSource
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
        if (app.combatState?.active && ['loot', 'scavenge'].includes(action)) return false;
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
        if (action === 'scavenge') return Boolean(app.scavengeCorpse(targetId, app._getExplorationActors()));
        if (action === 'recruit') return Boolean(app.recruitCreatureById(targetId));
        if (action === 'rejoin') return Boolean(app.recruitCreatureById(targetId));
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
        const requestedMode = context.mode || (app.combatState?.active ? 'combat' : 'exploration');
        const mode = requestedMode === 'combat' ? 'combat' : 'adventure';
        const actors = context.actors || (mode === 'combat'
            ? [context.actor || app.activeActor || app._currentCombatActor()].filter(Boolean)
            : app._getExplorationActors());
        const targets = context.targets || (mode === 'combat'
            ? [context.target].filter(Boolean)
            : app._getExplorationTargets());
        const planContext = {
            ...context,
            mode,
            planMode: mode === 'combat' ? 'combat' : 'exploration',
            actors,
            targets,
            source: this.normalizeSource(context.source || 'command-composer')
        };
        const planned = typeof YAW_INTERACTION_PLAN !== 'undefined'
            ? YAW_INTERACTION_PLAN.build(app, planContext)
            : null;
        if (planned) return planned;
        const targetTypes = new Set(targets.map(target => app.party.includes(target) ? 'party' : (target.disposition === app.DISPOSITION.ENEMY ? 'enemy' : 'creature')));
        const inferredTargetType = targetTypes.size > 1 ? 'mixed' : ([...targetTypes][0] || null);
        return {
            mode,
            planMode: mode === 'combat' ? 'combat' : 'exploration',
            actorIds: actors.map(actor => actor?.id || actor?.name).filter(Boolean),
            targetIds: targets.map(target => target?.id || target?.name).filter(Boolean),
            targetType: context.targetType || inferredTargetType,
            action: context.action || null,
            subAction: context.subAction || null,
            source: this.normalizeSource(context.source || 'command-composer'),
            timing: context.timing || 'immediate',
            resolveAt: context.resolveAt || null,
            constraints: context.constraints || {},
            shape: context.shape || null,
            distribution: context.distribution || null,
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

    actionProfile(app, command = {}) {
        const routed = typeof YAW_SUB_ACTIONS !== 'undefined'
            ? YAW_SUB_ACTIONS.actionProfile(command.action, command.subAction)
            : null;
        // Group Seduce resolves through the shared Talk resolver, which owns
        // contribution and narration for both immediate exploration and
        // delayed combat. The direct profile remains authoritative for one
        // actor only.
        if (routed?.key === 'core:seduce'
            && command.action === 'flirt'
            && command.subAction === 'seduce'
            && (command.actors || []).length > 1) return null;
        return routed || (typeof YAW_ACTION_PROFILES !== 'undefined'
            ? YAW_ACTION_PROFILES.profile(command.action)
            : null);
    },

    profileCommand(command, profile) {
        if (!profile || profile.key === command.action) return command;
        return {
            ...command,
            action: profile.key,
            metadata: {
                ...(command.metadata || {}),
                baseAction: command.action,
                subAction: command.subAction || null
            }
        };
    },

    validate(app, command) {
        if (!command || !command.action) return { ok: false, reason: 'missing-action' };
        const actionProfile = this.actionProfile(app, command);
        if (YAW_RECOVERY_MODES?.isJourney?.(app)
            && (YAW_RECOVERY_MODES.restricts(app, 'interactions') || YAW_RECOVERY_MODES.restricts(app, 'combat'))) {
            return { ok: false, reason: 'recovery-restricted' };
        }
        if (!command.actors?.length) return { ok: false, reason: 'missing-actor' };
        if (actionProfile) {
            if (command.actors.length !== 1) return { ok: false, reason: 'too-many-actors' };
            if (actionProfile.scope === 'target' && command.targets?.length !== 1) {
                return { ok: false, reason: command.targets?.length ? 'too-many-targets' : 'missing-target' };
            }
            const availability = YAW_ACTION_PROFILES.availability(
                app,
                actionProfile,
                command.actors[0],
                actionProfile.scope === 'self' ? command.actors[0] : command.targets?.[0],
                command.mode === 'combat' ? 'combat' : 'exploration'
            );
            return availability.ok ? { ok: true, actionProfile } : { ok: false, reason: availability.reason, actionProfile };
        }
        if (['fight', 'flirt', 'fuck', 'feast', 'feed', 'inspect'].includes(command.action) && !command.targets?.length && command.mode !== 'combat') {
            return { ok: false, reason: 'missing-target' };
        }
        if (command.mode !== 'combat' && command.targets?.length) {
            const requiredInteraction = {
                flirt: 'social',
                fuck: 'sensitiveSocial',
                feast: 'feast',
                feed: 'feed'
            }[command.action];
            if (requiredInteraction && command.targets.some(target => !app._hasBaselineInteractionEligibility(target, requiredInteraction))) {
                return { ok: false, reason: 'ineligible-target' };
            }
        }
        if (command.mode === 'combat') {
            const constraints = command.constraints || {};
            if (Number.isFinite(constraints.minActors) && (command.actors?.length || 0) < constraints.minActors) return { ok: false, reason: 'missing-actor' };
            if (Number.isFinite(constraints.maxActors) && (command.actors?.length || 0) > constraints.maxActors) return { ok: false, reason: 'too-many-actors' };
            if (Number.isFinite(constraints.minTargets) && (command.targets?.length || 0) < constraints.minTargets) return { ok: false, reason: 'missing-target' };
            if (Number.isFinite(constraints.maxTargets) && (command.targets?.length || 0) > constraints.maxTargets) return { ok: false, reason: 'too-many-targets' };
            const current = app._currentCombatActor() || app.activeActor || command.actors[0];
            const actor = command.actors[0];
            if (constraints.requireCurrentTurn !== false && (!current || !actor || app._unitSelectionId(current) !== app._unitSelectionId(actor))) return { ok: false, reason: 'not-current-actor' };
            const normalizedCombatAction = String(command.action || '').replace(/^sync_/, '') || command.action;
            if (normalizedCombatAction === 'scavenge') {
                const target = command.targets?.[0];
                if (!target || !app._canScavengeCorpse(target)) return { ok: false, reason: 'invalid-combat-target' };
                return { ok: true };
            }
            if (command.targets?.length && ['fight', 'flirt', 'fuck', 'feast'].includes(normalizedCombatAction)) {
                const reachActors = command.timing === 'slowest-participant' ? command.actors : [actor];
                for (const target of command.targets) {
                    if (!target || target.CPun <= 0) return { ok: false, reason: 'invalid-combat-target' };
                    if (constraints.hostileOnly !== false && target.disposition !== app.DISPOSITION.ENEMY) return { ok: false, reason: 'invalid-combat-target' };
                    if (constraints.checkReach !== false && app._isReachSensitiveCombatAction?.(normalizedCombatAction)) {
                        const reachResults = reachActors.map(unit => app._combatReachResult?.(unit, target, normalizedCombatAction, {
                            techniqueKey: command.subAction
                        })).filter(Boolean);
                        const allCanAttempt = reachResults.length === reachActors.length && reachResults.every(result => result.canAttempt);
                        if (!allCanAttempt) return { ok: false, reason: 'cannot-reach' };
                    } else if (constraints.checkReach !== false && !reachActors.some(unit => app._canAttemptCombatTarget?.(unit, target, normalizedCombatAction))) {
                        return { ok: false, reason: 'cannot-reach' };
                    }
                }
            }
        }
        return { ok: true };
    },

    dispatch(app, command) {
        if (command?.mode === 'combat') {
            return this.dispatchCombat(app, command);
        }
        const valid = this.validate(app, command);
        if (!valid.ok) {
            if (valid.reason === 'recovery-restricted') {
                app._guardRecoveryCapability?.('interactions', { action: command?.action });
            } else {
                this.reportInvalidAdventure(app, command, valid.reason);
            }
            return false;
        }
        app.lastIntentCommand = {
            actorIds: command.actorIds,
            action: command.action,
            subAction: command.subAction,
            targetIds: command.targetIds,
            targetType: command.targetType,
            source: command.source,
            mode: command.mode,
            timing: command.timing,
            shape: command.shape,
            distribution: command.distribution,
            planMode: command.planMode || command.plan?.mode || 'exploration'
        };
        if (valid.actionProfile) {
            return YAW_ACTION_PROFILES.dispatch(app, this.profileCommand(command, valid.actionProfile));
        }
        return this.dispatchAdventure(app, command);
    },

    dispatchCombat(app, command) {
        if (!command || command.mode !== 'combat') return false;
        const valid = this.validate(app, command);
        if (!valid.ok) {
            this.reportInvalidCombat(app, command, valid.reason);
            return false;
        }
        app.combatCorrectionMessage = null;
        app.lastIntentCommand = {
            actorIds: command.actorIds,
            action: command.action,
            subAction: command.subAction,
            targetIds: command.targetIds,
            targetType: command.targetType,
            source: command.source,
            mode: 'combat',
            timing: command.timing,
            shape: command.shape,
            distribution: command.distribution,
            resolveAt: command.resolveAt,
            planMode: command.planMode || command.plan?.mode || 'combat'
        };
        if (valid.actionProfile) {
            return YAW_ACTION_PROFILES.dispatch(app, this.profileCommand(command, valid.actionProfile));
        }
        if (command.timing === 'queued' || command.timing === 'slowest-participant') return app.queueSyncAction(command.action, command.targets?.[0], command);
        if (['feed', 'feast', 'flirt', 'fuck'].includes(command.action) && command.subAction) return app._resolveCombatFeedCommand(command);
        if (['feed', 'feast'].includes(command.action) && !command.targets?.length) return app.executeActionVariant(command.action, command.actors[0]);
        if (['flirt', 'fuck'].includes(command.action) && !command.subAction && command.targets?.length === 1) {
            return app.executeActionVariant(command.action, command.actors[0], command.targets[0]);
        }
        if (command.targets?.length) return app._resolveCombatAction(command);
        return app.executeCombatIntent(command.action, command.actors[0]);
    },

    combatReachCorrection(app, command, actor, target) {
        if (!target) return null;
        const baseAction = String(command?.metadata?.baseAction || command?.action || 'fight').replace(/^sync_/, '') || 'fight';
        if (!app._isReachSensitiveCombatAction?.(baseAction)) return null;
        const actors = command?.timing === 'slowest-participant'
            ? (command?.actors || [])
            : [actor].filter(Boolean);
        const reach = actors.map(unit => app._combatReachResult?.(unit, target, baseAction, {
            techniqueKey: command?.subAction
        })).find(result => result?.canAttempt && !result.canSucceed);
        if (reach) return app._combatReachFailureText?.(actors, target, baseAction, reach);
        return null;
    },

    reportInvalidCombat(app, command, reason = 'invalid-combat-target') {
        const actor = command?.actors?.[0] || app.activeActor || app._currentCombatActor() || app.player;
        const target = command?.targets?.[0] || null;
        const actionLabel = app._uiLabel?.(command?.metadata?.baseAction || command?.action?.replace(/^sync_/, '') || 'action') || 'action';
        const actorName = actor?.name || app._label('ui.ally', 'Someone');
        const commandActorNames = (command?.actors || []).map(unit => unit?.name).filter(Boolean);
        const groupActorNames = commandActorNames.length > 2
            ? app._label('combat.narration.actorList', '{leading}, and {last}', {
                leading: commandActorNames.slice(0, -1).join(', '),
                last: commandActorNames[commandActorNames.length - 1]
            })
            : (commandActorNames.length === 2
                ? app._label('combat.narration.actorPair', '{first} and {second}', {
                    first: commandActorNames[0],
                    second: commandActorNames[1]
                })
                : (commandActorNames[0] || actorName));
        let text = app._label('combat.narration.noOpening', '{name} pauses; there is no clear opening for {action} right now.', { name: actorName, action: actionLabel });
        if (reason === 'cannot-reach' && target) {
            text = this.combatReachCorrection(app, command, actor, target)
                || app._label('combat.cannotReachTarget', '{actor} cannot reach {target} from here.', { actor: actor?.name || 'Actor', target: target.name });
        } else if (reason === 'not-in-combat') {
            text = app._label('combat.narration.notInCombat', '{name} looks around, but there is no battle to continue.', { name: actorName });
        } else if (reason === 'resolving') {
            text = app._label('combat.narration.resolving', '{name} waits for the current exchange to finish.', { name: actorName });
        } else if (reason === 'too-many-targets' && ['combat-slot-composer', 'combat-planner'].includes(command?.source)) {
            text = app._label('combat.narration.groupTooManyTargets', '{actors} try to coordinate {action}, but their attention splits between too many targets.', {
                actors: groupActorNames,
                action: actionLabel
            });
        } else if (reason === 'missing-target' && ['combat-slot-composer', 'combat-planner'].includes(command?.source)) {
            text = app._label('combat.narration.groupNoTarget', '{actors} gather for {action}, but find no target when the moment comes.', {
                actors: groupActorNames,
                action: actionLabel
            });
        } else if (reason === 'missing-action' && command?.source === 'combat-planner') {
            text = app._label('combat.narration.groupNoIntent', '{actors} gather to act, but hesitation leaves the effort without direction.', {
                actors: groupActorNames
            });
        } else if (reason === 'missing-lead-actor' && command?.source === 'combat-planner') {
            text = app._label('combat.narration.groupNoLead', '{actors} try to move together, but the effort loses its lead before it begins.', {
                actors: groupActorNames
            });
        } else if (reason === 'missing-target') {
            text = app._label('combat.narration.needTarget', '{name} looks for an opening, but needs a target for {action}.', { name: actorName, action: actionLabel });
        } else if (['too-many-targets', 'single-target-required'].includes(reason)) {
            text = app._label('combat.narration.oneTarget', '{name} needs one clear focus for {action}.', { name: actorName, action: actionLabel });
        } else if (reason === 'missing-actor') {
            text = app._label('combat.narration.needActor', 'No one steps forward to carry out {action}.', { action: actionLabel });
        } else if (reason === 'too-many-actors') {
            text = app._label('combat.narration.tooManyActors', 'The group cannot coordinate that many actors for {action} at once.', { action: actionLabel });
        } else if (reason === 'not-current-actor') {
            const currentName = app._currentCombatActor?.()?.name || app._label('ui.ally', 'another combatant');
            text = app._label('combat.narration.otherTurn', '{name} holds back; it is {current}’s turn.', { name: actorName, current: currentName });
        } else if (reason === 'recovery-restricted') {
            text = app._label('combat.narration.recovering', '{name} is recovering and cannot commit to {action} yet.', { name: actorName, action: actionLabel });
        } else if (reason === 'resolution-interrupted') {
            text = app._label('combat.narration.interrupted', '{name}\'s attempt is interrupted, and the battle regains its footing.', { name: actorName });
        } else if (reason === 'actor-unavailable') {
            const unavailable = (command?.actors || []).find(unit => {
                if (!unit || unit.CPun <= 0 || unit.knockedOut || unit.fledCombat) return true;
                const status = unit.status || {};
                return Boolean(status.terror?.turns > 0 || status.frightened || status.stun?.turns > 0 || status.freeze?.skip
                    || status.restrained?.turns > 0 || status.stuck?.turns > 0 || status.enveloped?.turns > 0);
            }) || (command?.actors || []).find(unit => {
                const id = app._unitSelectionId?.(unit) || String(unit?.id || unit?.name || '');
                return !(app.combatState?.turnQueue || []).some(entry => {
                    const queued = entry?.unit || entry;
                    const queuedId = app._unitSelectionId?.(queued) || String(queued?.id || queued?.name || '');
                    return queued === unit || (id && id === queuedId);
                });
            });
            const name = unavailable?.name || app._label('ui.ally', 'That companion');
            const action = actionLabel;
            const status = unavailable?.status || {};
            if (status.terror?.turns > 0 || status.frightened) {
                text = app._label('combat.actorUnavailable.terror', '{name} is already breaking away in terror and cannot join the {action} action.', { name, action });
            } else if (unavailable?.fledCombat) {
                text = app._label('combat.actorUnavailable.fled', '{name} has fled and cannot join the {action} action.', { name, action });
            } else if (unavailable?.CPun <= 0 || unavailable?.knockedOut) {
                text = app._label('combat.actorUnavailable.fallen', '{name} is down and cannot join the {action} action.', { name, action });
            } else if (status.restrained?.turns > 0 || status.stuck?.turns > 0 || status.enveloped?.turns > 0) {
                text = app._label('combat.actorUnavailable.restrained', '{name} cannot comply with the {action} action while restrained.', { name, action });
            } else if (status.stun?.turns > 0 || status.freeze?.skip) {
                text = app._label('combat.actorUnavailable.disabled', '{name} cannot comply with the {action} action while incapacitated.', { name, action });
            } else {
                text = app._label('combat.actorUnavailable.turnOrder', '{name} is not in this battle\'s turn order yet, so they cannot join the {action} action.', { name, action });
            }
        } else if (reason === 'sub-action-unavailable') {
            text = app._label('combat.narration.variantClosed', '{name} reaches for {action}, but the opening closes before the attempt can begin.', {
                name: actorName,
                action: actionLabel
            });
        } else if (reason === 'too-few-participants') {
            text = app._label('combat.narration.needCompanion', '{name} looks to the party for help with {action}, but no one else is ready to join.', {
                name: actorName,
                action: actionLabel
            });
        } else if (reason === 'invalid-combat-technique') {
            const names = (command?.actors || []).map(unit => unit?.name).filter(Boolean).join(', ') || actorName;
            text = app._label('combat.technique.invalid', '{names} lose the opening for {action}; their prepared technique falls apart before it can land.', {
                names,
                action: actionLabel
            });
        }
        // A failed attempt is part of the encounter fiction, never a separate UI warning.
        // Keep controls usable and let the Scene Feed carry the reason it did not resolve.
        app.combatCorrectionMessage = null;
        app._pushLog(text, 'combat', { actor, targetId: target?.id || target?.name, targetName: target?.name, action: command?.action, phase: reason });
        app.emitStoryResult?.({
            ...(command || {}),
            mode: 'combat',
            actors: command?.actors?.length ? command.actors : [actor].filter(Boolean),
            targets: command?.targets?.length ? command.targets : [target].filter(Boolean),
            action: command?.metadata?.baseAction || command?.action || 'action',
            tags: [reason, ...(reason === 'cannot-reach' ? ['cannot-reach', 'row'] : [])],
            source: 'combat-validation'
        }, text, {
            mode: 'combat',
            resultKind: 'failure',
            importance: reason === 'cannot-reach' ? 'hint' : 'normal',
            tags: [reason, ...(reason === 'cannot-reach' ? ['cannot-reach', 'row'] : [])],
            source: 'combat-validation'
        });
        app.renderLog();
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return text;
    },

    reportInvalidAdventure(app, command, reason = 'invalid-target') {
        const actor = command?.actors?.[0] || app._getExplorationActors?.()?.[0] || app.player;
        const target = command?.targets?.[0] || null;
        const action = app._uiLabel?.(command?.action || 'action') || 'action';
        const name = actor?.name || app._label('ui.ally', 'Someone');
        let text = app._label('explore.narration.noOpening', '{name} cannot find a way to {action} right now.', { name, action });
        if (reason === 'missing-target') {
            text = app._label('explore.narration.needTarget', '{name} looks for a clear target before trying to {action}.', { name, action });
        } else if (reason === 'missing-actor') {
            text = app._label('explore.narration.needActor', 'No one is ready to carry out {action}.', { action });
        } else if (reason === 'ineligible-target') {
            text = app._label('explore.narration.ineligibleTarget', '{name} cannot use {action} with that target.', { name, action });
        } else if (reason === 'too-many-actors' || reason === 'too-many-targets') {
            text = app._label('explore.narration.focus', '{name} needs a clearer focus for {action}.', { name, action });
        }
        app._pushLog?.(text, 'discovery', { actor, targetId: target?.id || target?.name, targetName: target?.name, action: command?.action, phase: reason });
        app.emitStoryResult?.({
            ...(command || {}),
            mode: 'adventure',
            actors: command?.actors?.length ? command.actors : [actor].filter(Boolean),
            targets: command?.targets?.length ? command.targets : [target].filter(Boolean),
            action: command?.action || 'action',
            tags: [reason],
            source: 'adventure-validation'
        }, text, { resultKind: 'failure', importance: 'hint', tags: [reason], source: 'adventure-validation' });
        app.renderLog?.();
        app._renderInteractionState?.({ exploration: true, toolbelt: false });
    },

    dispatchAdventure(app, command) {
        if (!command || command.mode === 'combat') return false;
        if (typeof YAW_ACTION_PROFILES !== 'undefined' && YAW_ACTION_PROFILES.profile(command.action)) {
            return YAW_ACTION_PROFILES.dispatch(app, command);
        }
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
            source: command.source || 'command-composer',
            mode: 'adventure',
            timing: command.timing || 'immediate',
            shape: command.shape,
            distribution: command.distribution,
            planMode: command.planMode || command.plan?.mode || 'exploration'
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
        } else if (command.distribution === 'paired' && actors.length === targets.length) {
            resolved = app.outsidePairedActionsOnTargets(command.action, actors, targets, options);
        } else {
            resolved = app.outsideManyToManyActionOnTargets(command.action, actors, targets, options);
        }
        if (resolved !== false && command.clearTargets) app.clearExplorationTargets();
        return resolved !== false;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_INTERACTION_DISPATCH = YAW_INTERACTION_DISPATCH;
}
