/**
 * YOU ARE WILD COMBAT FEED
 * Combat feed sub-action selection and resolution helpers.
 */

const YAW_COMBAT_FEED = {
    executeAction(app, actor = app.activeActor || app._currentCombatActor() || app.player) {
        actor = actor || app.activeActor || app._currentCombatActor() || app.player;
        const allies = app.party.filter(p => p.CPun > 0 && p.name !== actor.name);
        const available = app._getAvailableSubActions('feed', actor, null);
        const validSubs = available.filter(s => s.available);
        if (allies.some(ally => ally.CPun < ally.MPun) && !validSubs.some(sub => sub.id === 'heal')) {
            const healDef = app.SUB_ACTIONS.feed && app.SUB_ACTIONS.feed.heal;
            validSubs.unshift({
                id: 'heal',
                label: app._getActionLabel('feed', 'heal'),
                icon: healDef?.icon || '',
                available: true,
                setting: healDef?.setting || null
            });
        }
        if (validSubs.length === 0) {
            app.log.push({ text: app._label('feed.noOptions', 'No feed options available right now.'), type: 'combat' });
            app.renderLog();
            app.nextTurn();
            return;
        }
        if (validSubs.length === 1) {
            app._executeFeedSubAction(validSubs[0].id, actor);
            return true;
        }
        app.feedSelection = {
            active: true,
            actorId: app._unitSelectionId(actor),
            subIds: validSubs.map(sub => sub.id)
        };
        app.targetSelection = null;
        app.combatTargetId = null;
        app.syncSelection = null;
        app._renderInteractionState({ exploration: false, toolbelt: true });
        return true;
    },

    executeSubAction(app, subId, actor) {
        const subDef = app.SUB_ACTIONS.feed && app.SUB_ACTIONS.feed[subId];
        if (!subDef) return;
        actor = actor || app.activeActor || app._currentCombatActor() || app.player;
        app.defaultSubActions.feed = subId;
        const actorName = actor.name === app.player?.name ? 'You' : actor.name;
        const actorVerb = actor.name === app.player?.name ? '' : 's';
        let target = null;
        if (subId === 'heal' || subId === 'breastfeed') {
            const allies = app.party.filter(p => p.CPun > 0 && p.name !== actor.name && p.CPun < p.MPun);
            if (allies.length === 0) {
                app.log.push({ text: app._label('feed.noWoundedAllies', 'No wounded allies to feed.'), type: 'combat' });
                app.renderLog();
                app.combatState.processing = false;
                app.nextTurn();
                return;
            }
            target = allies.reduce((w, a) => (a.CPun / a.MPun < w.CPun / w.MPun) ? a : w, allies[0]);
        } else if (subId === 'sacrifice') {
            const prey = app.party.filter(p => p.CPun > 0 && p.name !== actor.name && (p.livestock || p.willingPrey));
            if (prey.length === 0) {
                app.log.push({ text: app._label('feed.noWillingLivestock', 'No willing livestock to sacrifice.'), type: 'combat' });
                app.renderLog();
                app.combatState.processing = false;
                app.nextTurn();
                return;
            }
            target = prey[0];
        } else if (subId === 'forceFeed') {
            const enemies = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
            if (enemies.length === 0) {
                app.log.push({ text: app._label('feed.noForceFeedEnemies', 'No enemies to force-feed.'), type: 'combat' });
                app.renderLog();
                app.combatState.processing = false;
                app.nextTurn();
                return;
            }
            target = enemies[0];
        }
        if (!target) {
            app.log.push({ text: app._label('feed.noValidTarget', 'No valid target for this feed action.'), type: 'combat' });
            app.renderLog();
            app.combatState.processing = false;
            app.nextTurn();
            return;
        }
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
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_FEED = YAW_COMBAT_FEED;
}
