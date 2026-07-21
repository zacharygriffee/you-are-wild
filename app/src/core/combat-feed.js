/**
 * YOU ARE WILD COMBAT ACTION VARIANTS
 * Shared contextual Feed / Feast variant selection and resolution.
 * The historical YAW_COMBAT_FEED name remains as a compatibility alias.
 */

const YAW_COMBAT_FEED = {
    executeVariantAction(app, action, actor = app.activeActor || app._currentCombatActor() || app.player, target = null) {
        actor = actor || app.activeActor || app._currentCombatActor() || app.player;
        if (!target || target.CPun <= 0) {
            app.selectTarget(action);
            return true;
        }
        const resolution = YAW_SUB_ACTIONS.resolve(app, action, { actors: [actor], targets: [target], mode: 'combat' });
        const validVariants = resolution.variants.filter(variant => variant.available);
        if (validVariants.length === 0) {
            const fallback = app._label('variant.noOptions', 'No {action} variants are available for {name}. Choose another target.', {
                action: app._uiLabel(action),
                name: target.name
            });
            app.log.push({ text: fallback, type: 'combat' });
            app.renderLog();
            app.combatCorrectionMessage = { text: fallback, reason: 'no-action-variants', action, time: Date.now() };
            app._renderInteractionState?.({ exploration: false, toolbelt: true });
            return false;
        }
        if (resolution.decision === 'direct') {
            return this.executeSubAction(app, validVariants[0].id, actor, target, action);
        }
        const selection = {
            active: true,
            action,
            actorId: app._unitSelectionId(actor),
            target,
            targetId: app._unitSelectionId(target),
            targetType: app.party.includes(target) ? 'party' : (target.disposition === app.DISPOSITION.ENEMY ? 'enemy' : 'creature'),
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
        const actor = app._resolvePanelUnit?.('party', selection.actorId)
            || app.activeActor
            || app._currentCombatActor()
            || app.player;
        const target = selection.target;
        if (!actor || !target) return false;
        const desktop = presentation === 'desktop'
            || (!presentation && typeof window !== 'undefined' && Number(window.innerWidth || 0) > 1024);
        const source = desktop ? 'desktop-combat' : 'combat-sheet';
        const action = selection.action || 'feed';
        const title = app._label('variant.optionsTitle', '{action} Options', { action: app._uiLabel(action) });
        return YAW_INTENT_MENU.openVariantSheet(app, {
            action,
            actors: [actor],
            targets: [target],
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

    executeSubAction(app, subId, actor, target = app.feedSelection?.target || null, action = app.feedSelection?.action || 'feed') {
        const subDef = app.SUB_ACTIONS[action]?.[subId];
        if (!subDef) return false;
        app.closeIntentMenu?.();
        actor = actor || app.activeActor || app._currentCombatActor() || app.player;
        app.defaultSubActions[action] = subId;
        if (!target || target.CPun <= 0) {
            this.failSubAction(app, action, action === 'feed' ? 'feed.noValidTarget' : 'variant.noValidTarget', action === 'feed' ? 'No valid target for this feed action.' : 'Choose a living target for this action.');
            return false;
        }
        const resolution = YAW_SUB_ACTIONS.resolve(app, action, { actors: [actor], targets: [target], preferred: subId, mode: 'combat' });
        if (!resolution.variants.find(variant => variant.id === subId)?.available) {
            this.failSubAction(app, action, 'variant.noLongerAvailable', 'That variant is no longer available. Choose another.');
            return false;
        }
        const command = app._buildPanelInteractionCommand({
            mode: 'combat', actors: [actor], targets: [target], action, subAction: subId,
            source: 'action-variant-options',
            targetType: app.party.includes(target) ? 'party' : (target.disposition === app.DISPOSITION.ENEMY ? 'enemy' : 'creature'),
            timing: 'current-turn',
            constraints: { requireCurrentTurn: true, hostileOnly: false, checkReach: false, checkRows: false, minActors: 1, minTargets: 1, maxTargets: 1 },
            metadata: { phase: 'action-variant' }
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
