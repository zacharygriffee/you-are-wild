/**
 * YOU ARE WILD PANEL COMMANDS
 * Compatibility commands that keep actor/target intents routed through panels.
 */

const YAW_PANEL_COMMANDS = {
    showInteractMenu(app) {
        app.log.push({ text: app._label('target.chooseFromPanel', 'Select a target from the creature panel.'), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        app.renderExplorationActions();
        return false;
    },

    showCreatureInteract(app, type, index) {
        const target = type === 'party'
            ? app.party.filter(p => p.name !== app.player.name)[index]
            : app.creatures.filter(c => c.disposition !== app.DISPOSITION.ENEMY)[index];
        if (!target) return false;
        const id = type === 'party' ? app._unitSelectionId(target) : app._explorationTargetUnitId('creature', target);
        app.toggleExplorationTarget(type, id);
        return false;
    },

    outsideAction(app, action, type, index) {
        const target = type === 'party'
            ? app.party.filter(p => p.name !== app.player.name)[index]
            : app.creatures.filter(c => c.disposition !== app.DISPOSITION.ENEMY)[index];
        if (!target) return false;
        if (type === 'party') return this.outsideActionForParty(app, action, app.party.indexOf(target));
        return this.outsideActionForCreature(app, action, app._explorationTargetUnitId('creature', target));
    },

    outsideActionForParty(app, action, targetIndex, actorId = null, options = {}) {
        const target = app.party[targetIndex];
        if (!target) return false;
        const actors = app._explorationActorsForOptionalId(actorId);
        if (actorId && actors.length === 0) return false;
        return app._dispatchPanelInteraction({
            mode: 'adventure',
            actors,
            targets: [target],
            action,
            subAction: options.subAction || null,
            source: 'party-wrapper',
            targetType: 'party'
        });
    },

    outsideActionForCreature(app, action, targetId, options = {}) {
        return app._dispatchPanelInteraction({
            mode: 'adventure',
            targetType: 'creature',
            targetRef: targetId,
            action,
            subAction: options.subAction || null,
            source: 'creature-wrapper'
        });
    },

    outsideActionForCreatureAs(app, actorId, action, targetId, options = {}) {
        const target = app._resolveCreatureRef(targetId);
        if (!target) return false;
        const actors = app._explorationActorsForOptionalId(actorId);
        if (actorId && actors.length === 0) return false;
        return app._dispatchPanelInteraction({
            mode: 'adventure',
            actors,
            targets: [target],
            action,
            subAction: options.subAction || null,
            source: 'creature-wrapper',
            targetType: 'creature'
        });
    },

    outsideActionForPartyTargets(app, action, targetIndexes, actorId = null, options = {}) {
        const targets = (targetIndexes || []).map(index => app.party[index]).filter(Boolean);
        const actors = app._explorationActorsForOptionalId(actorId);
        if (actorId && actors.length === 0) return false;
        return app._dispatchPanelInteraction({
            mode: 'adventure',
            actors,
            targets,
            action,
            subAction: options.subAction || null,
            source: 'party-target-wrapper',
            targetType: 'party'
        });
    },

    outsideActionForCreatureTargets(app, action, targetIds, actorId = null, options = {}) {
        const seen = new Set();
        const targets = (targetIds || [])
            .map(id => app._resolveCreatureRef(id))
            .filter(target => {
                if (!target || seen.has(target)) return false;
                seen.add(target);
                return true;
            });
        const actors = app._explorationActorsForOptionalId(actorId);
        if (actorId && actors.length === 0) return false;
        return app._dispatchPanelInteraction({
            mode: 'adventure',
            actors,
            targets,
            action,
            subAction: options.subAction || null,
            source: 'creature-target-wrapper',
            targetType: 'creature'
        });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_COMMANDS = YAW_PANEL_COMMANDS;
}
