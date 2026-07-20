/**
 * YOU ARE WILD COMBAT FEED
 * Combat feed sub-action selection and resolution helpers.
 */

const YAW_COMBAT_FEED = {
    executeAction(app, actor = app.activeActor || app._currentCombatActor() || app.player, target = null) {
        actor = actor || app.activeActor || app._currentCombatActor() || app.player;
        if (!target || target.CPun <= 0) {
            app.selectTarget('feed');
            return true;
        }
        const available = app._getAvailableSubActions('feed', actor, target);
        const validSubs = available.filter(s => s.available);
        if (validSubs.length === 0) {
            app.log.push({ text: app._label('feed.noOptions', 'No feed options available right now.'), type: 'combat' });
            app.renderLog();
            app.selectTarget('feed');
            app.combatCorrectionMessage = {
                text: app._label('feed.noOptionsForTarget', 'No feed option currently works on {name}. Choose another target.', { name: target.name }),
                reason: 'no-feed-options',
                action: 'feed',
                time: Date.now()
            };
            app._renderInteractionState?.({ exploration: false, toolbelt: true });
            return false;
        }
        if (validSubs.length === 1) {
            app._executeFeedSubAction(validSubs[0].id, actor, target);
            return true;
        }
        app.feedSelection = {
            active: true,
            actorId: app._unitSelectionId(actor),
            target,
            targetId: app._unitSelectionId(target),
            targetType: app.party.includes(target) ? 'party' : (target.disposition === app.DISPOSITION.ENEMY ? 'enemy' : 'creature'),
            subIds: validSubs.map(sub => sub.id)
        };
        app.targetSelection = null;
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.syncSelection = null;
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    failSubAction(app, reason, fallback) {
        app.log.push({ text: app._label(reason || 'feed.noValidTarget', fallback || 'No valid target for this feed action.'), type: 'combat' });
        app.renderLog();
        app.combatState.processing = false;
        app.selectTarget?.('feed');
    },

    executeSubAction(app, subId, actor, target = app.feedSelection?.target || null) {
        const subDef = app.SUB_ACTIONS.feed && app.SUB_ACTIONS.feed[subId];
        if (!subDef) return false;
        actor = actor || app.activeActor || app._currentCombatActor() || app.player;
        app.defaultSubActions.feed = subId;
        if (!target || target.CPun <= 0) {
            this.failSubAction(app, 'feed.noValidTarget', 'Choose a living target for this feed action.');
            return false;
        }
        const command = app._buildPanelInteractionCommand({
            mode: 'combat',
            actors: [actor],
            targets: [target],
            action: 'feed',
            subAction: subId,
            source: 'feed-options',
            targetType: app.party.includes(target) ? 'party' : (target.disposition === app.DISPOSITION.ENEMY ? 'enemy' : 'creature'),
            timing: 'current-turn',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: false,
                checkReach: false,
                checkRows: false,
                minActors: 1,
                minTargets: 1,
                maxTargets: 1
            },
            metadata: { phase: 'sub-action' }
        });
        return app._dispatchInteractionCommand(command);
    },

    resolveCommand(app, command) {
        const subId = command?.subAction;
        const subDef = app.SUB_ACTIONS.feed && app.SUB_ACTIONS.feed[subId];
        if (!subDef) return false;
        const actor = command.actors?.[0] || app.activeActor || app._currentCombatActor() || app.player;
        const target = command.targets?.[0] || null;
        if (!target) return false;
        const actorName = actor.name === app.player?.name ? 'You' : actor.name;
        const actorVerb = actor.name === app.player?.name ? '' : 's';
        app._applyActionCost?.('feed', actor, target, {}, { mode: 'combat', source: 'combat-feed', emitScene: true });
        const result = app._doSubAction('feed', subId, actor, target, actorName, actorVerb);
        app.log.push({ text: result, type: 'heal' });
        app._emitCombatAction('feed', actor, target, result);
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
}
