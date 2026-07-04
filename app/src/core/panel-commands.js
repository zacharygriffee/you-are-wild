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
        const id = type === 'party' ? app._unitSelectionId(target) : String(target.id || target.name);
        app.toggleExplorationTarget(type, id);
        return false;
    },

    outsideAction(app, action, type, index) {
        const target = type === 'party'
            ? app.party.filter(p => p.name !== app.player.name)[index]
            : app.creatures.filter(c => c.disposition !== app.DISPOSITION.ENEMY)[index];
        if (!target) return false;
        if (type === 'party') return this.outsideActionForParty(app, action, app.party.indexOf(target));
        return this.outsideActionForCreature(app, action, target.id || target.name);
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
        const target = app.creatures.find(c => String(c.id || c.name) === String(targetId));
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
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_COMMANDS = YAW_PANEL_COMMANDS;
}
