/**
 * YOU ARE WILD COMBAT ACTION VARIANTS
 * Shared contextual Feed / Feast / Fight variant selection and resolution.
 * The historical YAW_COMBAT_FEED name remains as a compatibility alias.
 */

const YAW_COMBAT_FEED = {
    executeVariantAction(app, action, actor = app.activeActor || app._currentCombatActor() || app.player, target = null, options = {}) {
        actor = actor || app.activeActor || app._currentCombatActor() || app.player;
        const actors = [...new Set((options.actors || [actor]).filter(unit => unit && unit.CPun > 0))];
        const targets = [...new Set((options.targets || (Array.isArray(target) ? target : [target])).filter(unit => unit && unit.CPun > 0))];
        if (!targets.length) {
            app.selectTarget(action);
            return true;
        }
        const resolution = action === 'fight' && typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
            ? YAW_COMBAT_TECHNIQUES.resolve(app, { actors, targets, mode: 'combat' })
            : YAW_SUB_ACTIONS.resolve(app, action, { actors, targets, mode: 'combat' });
        const validVariants = resolution.variants.filter(variant => variant.available);
        if (validVariants.length === 0) {
            const fallback = app._label('variant.noOptions', 'No {action} variants are available for {name}. Choose another target.', {
                action: app._uiLabel(action),
                name: targets.map(unit => unit.name).join(', ')
            });
            app.log.push({ text: fallback, type: 'combat' });
            app.renderLog();
            app.combatCorrectionMessage = { text: fallback, reason: 'no-action-variants', action, time: Date.now() };
            app._renderInteractionState?.({ exploration: false, toolbelt: true });
            return false;
        }
        if (resolution.decision === 'direct') {
            return this.executeSubAction(app, validVariants[0].id, actor, targets[0], action, { actors, targets });
        }
        const selection = {
            active: true,
            action,
            actorId: app._unitSelectionId(actor),
            actorIds: actors.map(unit => app._unitSelectionId(unit)),
            actors,
            target: targets[0],
            targets,
            targetId: app._unitSelectionId(targets[0]),
            targetIds: targets.map(unit => app._unitSelectionId(unit)),
            targetType: app.party.includes(targets[0]) ? 'party' : (targets[0].disposition === app.DISPOSITION.ENEMY ? 'enemy' : 'creature'),
            subIds: validVariants.map(variant => variant.id),
            variants: resolution.variants,
            resume: {
                targetSelection: { action, source: 'combat', actorId: actor?.id || actor?.name || 'player' },
                combatTargetId: app.combatTargetId,
                combatTargetIds: [...(app.combatTargetIds || [])],
                explorationTargetIds: [...(app.explorationTargetIds || [])]
            }
        };
        app.feedSelection = selection;
        app.targetSelection = null;
        app.combatPlanSelection = null;
        app._renderInteractionState({ exploration: false, toolbelt: true });
        this.openVariantSheet(app);
        return true;
    },

    executeAction(app, actor = app.activeActor || app._currentCombatActor() || app.player, target = null) {
        return this.executeVariantAction(app, 'feed', actor, target);
    },

    openVariantSheet(app, presentation = '') {
        const selection = app.feedSelection;
        if (!selection?.active) return false;
        const actors = (selection.actors || []).filter(unit => unit && unit.CPun > 0);
        const actor = actors[0]
            || app._resolvePanelUnit?.('party', selection.actorId)
            || app.activeActor
            || app._currentCombatActor()
            || app.player;
        const targets = (selection.targets || [selection.target]).filter(unit => unit && unit.CPun > 0);
        const target = targets[0];
        if (!actor || !target) return false;
        const desktop = presentation === 'desktop'
            || (!presentation && typeof window !== 'undefined' && Number(window.innerWidth || 0) > 1024);
        const source = desktop ? 'desktop-combat' : 'combat-sheet';
        const action = selection.action || 'feed';
        const title = app._label('variant.optionsTitle', '{action} Options', { action: app._uiLabel(action) });
        return YAW_INTENT_MENU.openVariantSheet(app, {
            action,
            actors: actors.length ? actors : [actor],
            targets,
            scope: 'target',
            mode: 'combat',
            source,
            presentation: desktop ? 'desktop' : 'sheet',
            title,
            selectCall: `App._executeActionVariant('{id}', App.activeActor || App._currentCombatActor() || App.player)`,
            cancelCall: 'App.cancelActionVariantSelection()',
            onDismiss: () => app.cancelActionVariantSelection(),
            dismissOnOutside: false
        });
    },

    cancelVariantSelection(app) {
        const selection = app.feedSelection;
        if (!selection?.active) return app.cancelTargetSelection?.();
        const resume = selection.resume || {};
        app.closeIntentMenu?.();
        app.feedSelection = null;
        app.combatCorrectionMessage = null;
        app.targetSelection = resume.targetSelection || {
            action: selection.action || 'feed',
            source: 'combat',
            actorId: selection.actorId
        };
        app.combatTargetId = resume.combatTargetId || selection.targetId || null;
        app.combatTargetIds = resume.combatTargetIds?.length ? [...resume.combatTargetIds] : [selection.targetId].filter(Boolean);
        app.explorationTargetIds = resume.explorationTargetIds?.length ? [...resume.explorationTargetIds] : [...(app.explorationTargetIds || [])];
        app._renderInteractionState?.({ exploration: false, toolbelt: true });
        return true;
    },

    failSubAction(app, action, reason, fallback) {
        app.log.push({ text: app._label(reason || 'variant.noValidTarget', fallback || 'No valid target for this action variant.'), type: 'combat' });
        app.renderLog();
        app.combatState.processing = false;
        app.feedSelection = null;
        app.selectTarget?.(action);
    },

    executeSubAction(app, subId, actor, target = app.feedSelection?.target || null, action = app.feedSelection?.action || 'feed', options = {}) {
        const isFight = action === 'fight';
        const subDef = isFight ? null : app.SUB_ACTIONS[action]?.[subId];
        if (!isFight && !subDef) return false;
        app.closeIntentMenu?.();
        actor = actor || app.activeActor || app._currentCombatActor() || app.player;
        const selection = app.feedSelection;
        const actors = [...new Set((options.actors || selection?.actors || [actor]).filter(unit => unit && unit.CPun > 0))];
        const targets = [...new Set((options.targets || selection?.targets || [target]).filter(unit => unit && unit.CPun > 0))];
        if (!isFight) app.defaultSubActions[action] = subId;
        if (!targets.length) {
            this.failSubAction(app, action, action === 'feed' ? 'feed.noValidTarget' : 'variant.noValidTarget', action === 'feed' ? 'No valid target for this feed action.' : 'Choose a living target for this action.');
            return false;
        }
        const resolution = isFight
            ? YAW_COMBAT_TECHNIQUES.resolve(app, { actors, targets, preferred: subId, mode: 'combat' })
            : YAW_SUB_ACTIONS.resolve(app, action, { actors, targets, preferred: subId, mode: 'combat' });
        if (!resolution.variants.find(variant => variant.id === subId)?.available) {
            this.failSubAction(app, action, 'variant.noLongerAvailable', 'That variant is no longer available. Choose another.');
            return false;
        }
        const grouped = actors.length > 1;
        const dispatchAction = isFight && grouped ? 'sync_fight' : action;
        const targetType = targets.some(unit => app.party.includes(unit))
            ? (targets.every(unit => app.party.includes(unit)) ? 'party' : 'mixed')
            : (targets.every(unit => unit.disposition === app.DISPOSITION.ENEMY) ? 'enemy' : 'creature');
        const command = app._buildPanelInteractionCommand({
            mode: 'combat', actors, targets, action: dispatchAction, subAction: subId,
            source: 'action-variant-options',
            targetType,
            shape: grouped && targets.length > 1 ? 'many-to-many' : (grouped ? 'many-to-one' : (targets.length > 1 ? 'one-to-many' : 'one-to-one')),
            timing: grouped ? 'slowest-participant' : 'current-turn',
            distribution: targets.length > 1 ? 'all' : 'single',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: false,
                checkReach: true,
                checkRows: true,
                minActors: grouped ? 2 : 1,
                minTargets: 1,
                maxTargets: isFight ? YAW_COMBAT_TECHNIQUES.MAX_TARGETS : 1
            },
            metadata: { phase: 'action-variant', baseAction: action, consumeCurrentTurn: true }
        });
        app.feedSelection = null;
        app._clearCombatMarkedTargets?.();
        app.targetSelection = null;
        return app._dispatchInteractionCommand(command);
    },

    resolveCommand(app, command) {
        const action = command?.action || 'feed';
        const subId = command?.subAction;
        const subDef = app.SUB_ACTIONS[action]?.[subId];
        if (!subDef) return false;
        const actor = command.actors?.[0] || app.activeActor || app._currentCombatActor() || app.player;
        const target = command.targets?.[0] || null;
        if (!target) return false;
        const reach = app._combatReachResult?.(actor, target, action);
        if (reach?.canAttempt && !reach.canSucceed) {
            app._applyActionCost?.(action, actor, target, {}, { mode: 'combat', source: 'combat-variant-reach-failure', emitScene: true });
            YAW_COMBAT_RESOLUTION.reachFailure(app, action, [actor], target, reach);
            app.feedSelection = null;
            app.combatState.processing = false;
            app.combatCorrectionMessage = null;
            app.renderCombatSceneForTurn(actor);
            app.renderLog();
            app.renderParty();
            app.renderCreatures();
            app._syncCurrentTileCreatures?.();
            app.nextTurn();
            return true;
        }
        const actorName = actor.name === app.player?.name ? 'You' : actor.name;
        const actorVerb = actor.name === app.player?.name ? '' : 's';
        app._applyActionCost?.(action, actor, target, {}, { mode: 'combat', source: 'combat-variant', emitScene: true });
        const result = app._doSubAction(action, subId, actor, target, actorName, actorVerb);
        app.log.push({ text: result, type: action === 'feed' ? 'heal' : 'combat' });
        app._emitSubAction?.(action, subId, actor, target, result);
        app._emitCombatAction(action, actor, target, result);
        app.feedSelection = null;
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        app.combatState.processing = false;
        app._sanitizeCombatState({ preserveTurn: true });
        app.nextTurn();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_FEED = YAW_COMBAT_FEED;
    window.YAW_COMBAT_ACTION_VARIANTS = YAW_COMBAT_FEED;
}
