/**
 * YOU ARE WILD EXPLORATION SELECTION
 * Actor and marked-target state helpers for exploration command composition.
 */

const YAW_EXPLORATION_SELECTION = {
    isImplicitPlayerSelection(app) {
        const playerId = app.player ? app._unitSelectionId(app.player) : null;
        return Boolean(playerId)
            && Array.isArray(app.explorationActorIds)
            && app.explorationActorIds.length === 1
            && String(app.explorationActorIds[0]) === String(playerId)
            && !app.explorationActorSelectionExplicit;
    },

    isExplicitActorSelected(app, unit) {
        if (!unit || !app.explorationActorSelectionExplicit) return false;
        return this.getActors(app).includes(unit);
    },

    getActors(app, actorId = null) {
        if (actorId) {
            const actor = app.party.find(p => app._unitSelectionId(p) === String(actorId) && app._isLivingCreature(p));
            return actor ? [actor] : [app.player].filter(Boolean);
        }
        const ids = app.explorationActorIds && app.explorationActorIds.length > 0
            ? app.explorationActorIds
            : (app.explorationActorId ? [app.explorationActorId] : []);
        const actors = ids
            .map(id => app.party.find(p => app._unitSelectionId(p) === String(id) && app._isLivingCreature(p)))
            .filter(Boolean);
        return actors.length > 0 ? actors : [app.player].filter(Boolean);
    },

    getActor(app, actorId = null) {
        return this.getActors(app, actorId)[0] || app.player;
    },

    selectedActorState(app, { allowFallback = true } = {}) {
        const selectedActorIds = Array.isArray(app.explorationActorIds)
            ? app.explorationActorIds.map(id => String(id)).filter(Boolean)
            : [];
        if (selectedActorIds.length > 0) {
            const actors = selectedActorIds
                .map(id => app.party.find(unit => app._unitSelectionId(unit) === id && app._isLivingCreature(unit)))
                .filter(Boolean);
            return {
                actorIds: selectedActorIds,
                actors,
                valid: actors.length === selectedActorIds.length
            };
        }
        const actors = allowFallback ? this.getActors(app) : [];
        return { actorIds: [], actors, valid: actors.length > 0 || !allowFallback };
    },

    actorsForOptionalId(app, actorId = null) {
        if (!actorId) return this.getActors(app);
        const actor = app.party.find(p => app._unitSelectionId(p) === String(actorId) && app._isLivingCreature(p));
        return actor ? [actor] : [];
    },

    normalize(app, { resetTargets = false } = {}) {
        const livingPartyIds = new Set((app.party || []).filter(unit => app._isLivingCreature(unit)).map(unit => app._unitSelectionId(unit)));
        app.explorationActorIds = (app.explorationActorIds || []).filter(id => livingPartyIds.has(String(id)));
        if (app.explorationActorIds.length === 0 && app.player) {
            app.explorationActorIds = [app._unitSelectionId(app.player)];
            app.explorationActorSelectionExplicit = false;
        } else if (app.explorationActorIds.length > 1 || !this.isImplicitPlayerSelection(app)) {
            app.explorationActorSelectionExplicit = true;
        }
        app.explorationActorId = app.explorationActorIds[0] || app._unitSelectionId(app.player);
        if (resetTargets) {
            app.explorationTargetIds = [];
            return;
        }
        app.explorationTargetIds = (app.explorationTargetIds || []).filter(key => this.targetFromKey(app, key));
    },

    clearTileBoundTargets(app) {
        app.explorationTargetIds = (app.explorationTargetIds || []).filter(key => String(key).startsWith('party:'));
        app.focusedStageObject = null;
    },

    selectActor(app, index) {
        const actor = app.party[index];
        if (!actor || !app._isLivingCreature(actor)) return;
        const id = app._unitSelectionId(actor);
        app.explorationActorIds = app.explorationActorIds || [];
        const defaultPlayerOnly = this.isImplicitPlayerSelection(app);
        if (defaultPlayerOnly && actor === app.player) {
            app.explorationActorSelectionExplicit = true;
            app.explorationActorId = id;
            app._renderInteractionState({ exploration: true, toolbelt: false });
            return;
        }
        if (defaultPlayerOnly && actor !== app.player) {
            app.explorationActorIds = [id];
            app.explorationActorId = id;
            app.explorationActorSelectionExplicit = true;
            app._renderInteractionState({ exploration: true, toolbelt: false });
            return;
        }
        if (app.explorationActorIds.includes(id)) {
            app.explorationActorIds = app.explorationActorIds.filter(existing => existing !== id);
        } else {
            app.explorationActorIds.push(id);
        }
        app.explorationActorSelectionExplicit = true;
        if (app.explorationActorIds.length === 0) {
            app.explorationActorIds = [app._unitSelectionId(app.player)];
            app.explorationActorSelectionExplicit = false;
            app.mobileActorBeltOpen = false;
        }
        app.explorationActorId = app.explorationActorIds[0];
        app._renderInteractionState({ exploration: true, toolbelt: false });
    },

    clearActors(app) {
        const playerId = app.player ? app._unitSelectionId(app.player) : '';
        app.explorationActorIds = playerId ? [playerId] : [];
        app.explorationActorId = playerId;
        app.explorationActorSelectionExplicit = false;
        app.mobileActorBeltOpen = false;
        app._renderInteractionState({ exploration: true, toolbelt: false });
    },

    targetKey(type, id) {
        return `${type}:${String(id || '')}`;
    },

    rawCreatureId(unit) {
        return String(unit?.id || unit?.name || '');
    },

    targetIdForUnit(app, type, unit) {
        if (type !== 'creature') return app._unitSelectionId(unit);
        const raw = this.rawCreatureId(unit);
        const creatures = app.creatures || [];
        const index = creatures.indexOf(unit);
        if (index < 0) return raw;
        const matches = creatures.filter(candidate => this.rawCreatureId(candidate) === raw);
        if (raw && matches.length === 1) return raw;
        return `@creature:${index}:${raw}`;
    },

    isTarget(app, type, id) {
        return (app.explorationTargetIds || []).includes(this.targetKey(type, id));
    },

    isTargetUnit(app, type, unit) {
        if (!unit) return false;
        const id = this.targetIdForUnit(app, type, unit);
        if (this.isTarget(app, type, id)) return true;
        return (app.explorationTargetIds || []).some(key => this.targetFromKey(app, key) === unit);
    },

    resolveCreatureRef(app, ref) {
        const key = String(ref || '');
        if (key.startsWith('@creature:')) {
            const [, indexText, ...rawParts] = key.split(':');
            const index = Number(indexText);
            const raw = rawParts.join(':');
            const candidate = Number.isInteger(index) ? (app.creatures || [])[index] : null;
            if (candidate && (!raw || this.rawCreatureId(candidate) === raw)) return candidate;
            if (raw) {
                const matches = (app.creatures || []).filter(unit => this.rawCreatureId(unit) === raw);
                if (matches.length === 1) return matches[0];
            }
            return null;
        }
        return (app.creatures || []).find(unit => this.rawCreatureId(unit) === key) || null;
    },

    targetFromKey(app, key) {
        const [type, ...rest] = String(key).split(':');
        const id = rest.join(':');
        let target = null;
        if (type === 'party') target = app.party.find(unit => app._unitSelectionId(unit) === id);
        if (type === 'creature') target = this.resolveCreatureRef(app, id);
        if (!target) return null;
        if (type === 'creature' && app._isCorpse?.(target)) return target;
        return app._isLivingCreature(target) ? target : null;
    },

    getTargets(app) {
        const ids = app.explorationTargetIds || [];
        return ids.map(key => this.targetFromKey(app, key)).filter(Boolean);
    },

    toggleTarget(app, type, id) {
        app.focusedStageObject = null;
        const key = this.targetKey(type, id);
        app.explorationTargetIds = app.explorationTargetIds || [];
        if (app.explorationTargetIds.includes(key)) {
            app.explorationTargetIds = app.explorationTargetIds.filter(existing => existing !== key);
        } else {
            if (app.combatState?.active && app.targetSelection?.source === 'combat' && app.targetSelection.action === 'feed') {
                app.explorationTargetIds = [];
                app.combatTargetId = null;
                app.combatTargetIds = [];
            }
            app.explorationTargetIds.push(key);
        }
        if (app.combatState?.active) app._renderInteractionState({ exploration: false, toolbelt: true });
        else app._renderInteractionState({ exploration: true, toolbelt: false });
        return true;
    },

    clearTargets(app) {
        app.explorationTargetIds = [];
        app._renderInteractionState({ exploration: true, toolbelt: false });
    },

    reportInvalidActor(app, action) {
        app.log.push({
            text: app._label('target.invalidActorSelection', 'Select a living actor before using {action} on marked targets.', {
                action: app._uiLabel(action).toLowerCase()
            }),
            type: 'discovery'
        });
        app.renderLog();
        app._renderInteractionState({ exploration: true, toolbelt: false });
        return false;
    },

    resolveTargetAction(app, action, subAction = null, source = 'target-bar') {
        // Choosing an approach completes the menu interaction even when the
        // game narrates that the attempt cannot proceed. Leaving the modal
        // surface mounted after a failed attempt blocks the corrected input.
        app.closeIntentMenu?.();
        const targets = this.getTargets(app);
        if (targets.length === 0) return false;
        const actorState = this.selectedActorState(app);
        const actors = actorState.actors;
        if (!actorState.valid) {
            return this.reportInvalidActor(app, action);
        }
        if (subAction && app.SUB_ACTIONS[action]?.[subAction]) app.defaultSubActions[action] = subAction;
        const command = app._buildPanelInteractionCommand({
            mode: 'adventure',
            actors,
            targets,
            action,
            subAction,
            source,
            targetType: 'marked',
            clearTargets: true
        });
        return app._dispatchInteractionCommand(command);
    },

    resolveSelfSubAction(app, action, subAction, source = 'actor-belt') {
        app.closeIntentMenu?.();
        const def = app.SUB_ACTIONS[action]?.[subAction];
        if (!def || !YAW_SUB_ACTIONS.supportsScope(def, 'self')) return false;
        const actorState = this.selectedActorState(app);
        if (!actorState.valid) return this.reportInvalidActor(app, action);
        const eligible = actorState.actors.filter(actor => {
            const resolution = YAW_SUB_ACTIONS.resolve(app, action, {
                actors: [actor],
                scope: 'self',
                preferred: subAction,
                mode: 'adventure'
            });
            return resolution.variants.some(variant => variant.id === subAction && variant.available);
        });
        if (eligible.length === 0) {
            const text = app._label('variant.noSelfOptions', 'No self-directed {action} is available for the selected actor.', {
                action: app._uiLabel(action).toLowerCase()
            });
            app.log.push({ text, type: 'discovery' });
            app.renderLog();
            app._renderInteractionState({ exploration: true, toolbelt: false });
            return false;
        }
        app.closeIntentMenu?.();
        app.lastIntentCommand = {
            mode: 'adventure',
            actorIds: eligible.map(actor => actor.id || actor.name),
            targetIds: eligible.map(actor => actor.id || actor.name),
            targetType: 'self',
            action,
            subAction,
            source,
            timing: 'immediate',
            scope: 'self'
        };
        let resolved = false;
        for (const actor of eligible) {
            resolved = app.outsideActionOnTarget(action, actor, actor, {
                subAction,
                source,
                allowPartySacrifice: false
            }) !== false || resolved;
        }
        return resolved;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_EXPLORATION_SELECTION = YAW_EXPLORATION_SELECTION;
}
