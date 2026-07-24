/**
 * YOU ARE WILD PERK FLOW
 * Progression perk availability, choice, respec, and debug grant behavior.
 */

const YAW_PERK_FLOW = {
    treeCount(app, treeId, unit = app.player) {
        return (unit?.perks || []).filter(perk => perk.tree === treeId).length;
    },

    hasPerk(app, perkId, unit = app.player) {
        return (unit?.perks || []).some(perk => perk.id === perkId);
    },

    hasEffect(app, effect, unit = app.player) {
        return (unit?.perks || []).some(perk => perk.perkEffect === effect);
    },

    canChoose(app, perk, treeId, unit = app.player) {
        if (!perk || !unit || this.hasPerk(app, perk.id, unit)) return false;
        if (!perk.requires) return true;
        if (perk.requires.perk && !this.hasPerk(app, perk.requires.perk, unit)) return false;
        if (perk.requires.tree && this.treeCount(app, perk.requires.tree, unit) < (perk.requires.count || 1)) return false;
        return true;
    },

    treesForUnit(app, unit = app.player) {
        const trees = { ...app.PERK_TREES };
        const speciesTree = app.SPECIES_PERK_TREES[unit?.species];
        if (speciesTree) trees[`species:${unit.species}`] = speciesTree;
        return trees;
    },

    availableChoices(app, unit = app.player) {
        const choices = [];
        for (const [treeId, tree] of Object.entries(this.treesForUnit(app, unit))) {
            for (const perk of tree.perks) {
                choices.push({ ...perk, tree: treeId, treeLabel: tree.label, available: this.canChoose(app, perk, treeId, unit) });
            }
        }
        return choices;
    },

    availableFilters(app, unit = app.player) {
        return [['all', app._label('perk.filter.all', 'All')], ...Object.entries(this.treesForUnit(app, unit)).map(([treeId, tree]) => [treeId, tree.label])];
    },

    setFilter(app, filter) {
        const valid = this.availableFilters(app).map(([value]) => value);
        app.perkTreeFilter = valid.includes(filter) ? filter : 'all';
        app.showPerkSelection();
    },

    choose(app, perkId) {
        if (!app.player || (app.player.pendingPerkChoices || 0) <= 0) return;
        const choice = this.availableChoices(app).find(perk => perk.id === perkId);
        if (!choice || !choice.available) {
            app.log.push({ text: app._label('perk.notAvailable', 'That perk is not available yet.'), type: 'discovery' });
            app.renderLog();
            app.showPerkSelection();
            return;
        }
        app.player.perks = app.player.perks || [];
        app.player.perks.push({
            id: choice.id,
            tree: choice.tree,
            species: choice.tree.startsWith('species:') ? app.player.species : null,
            name: choice.name,
            stat: choice.stat,
            val: choice.val,
            perkEffect: choice.perkEffect || null,
            desc: choice.desc
        });
        if (choice.stat) app.player[choice.stat] = (app.player[choice.stat] || 0) + (choice.val || 0);
        app.player.pendingPerkChoices = Math.max(0, (app.player.pendingPerkChoices || 0) - 1);
        app.log.push({ text: app._label('perk.chosen', 'Perk chosen: {name}. {description}', { name: choice.name, description: choice.desc }), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        if (app.player.pendingPerkChoices > 0) app.showPerkSelection();
        else app.showCharacterStats();
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'quests', 'activityLog'], 'perk-choice');
        app.autoSave();
    },

    completeRespec(app) {
        if (!app.player) return;
        const selected = app.player.perks || [];
        if (!selected.length) {
            app.log.push({ text: app._label('perk.noneToRespec', 'No perks selected to respec.'), type: 'discovery' });
            app.renderLog();
            return;
        }
        selected.forEach(perk => {
            if (perk.stat && typeof perk.val === 'number') {
                app.player[perk.stat] = Math.max(0, (app.player[perk.stat] || 0) - perk.val);
            }
        });
        app.player.pendingPerkChoices = (app.player.pendingPerkChoices || 0) + selected.length;
        app.player.perks = [];
        app.perkTreeFilter = 'all';
        app.log.push({ text: app._label(selected.length === 1 ? 'perk.respecDoneOne' : 'perk.respecDoneMany', selected.length === 1 ? 'Perks reset. Refunded {count} choice.' : 'Perks reset. Refunded {count} choices.', { count: selected.length }), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        app.showCharacterStats();
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'quests', 'activityLog'], 'perk-respec');
        app.autoSave();
    },

    respec(app, skipConfirm = false) {
        if (!app.player) return;
        const selected = app.player.perks || [];
        if (!selected.length) {
            app.log.push({ text: app._label('perk.noneToRespec', 'No perks selected to respec.'), type: 'discovery' });
            app.renderLog();
            return;
        }
        if (skipConfirm) return this.completeRespec(app);
        return app.showConfirmDialog({
            title: app._label('perk.respec', 'Respec Perks'),
            message: app._label('perk.confirmRespec', 'Reset selected perks and refund their choices?'),
            confirmLabel: app._label('perk.respec', 'Respec Perks'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            onConfirm: () => this.completeRespec(app)
        });
    },

    debugGrant(app, count = 1) {
        if (!app.player) return;
        const grant = Math.max(1, Math.floor(Number(count) || 1));
        app.player.pendingPerkChoices = (app.player.pendingPerkChoices || 0) + grant;
        app.log.push({ text: app._label(grant === 1 ? 'perk.debugGrantedOne' : 'perk.debugGrantedMany', grant === 1
            ? 'Debug: granted {count} perk choice.'
            : 'Debug: granted {count} perk choices.', { count: grant }), type: 'discovery' });
        app.renderLog();
        app.showCharacterStats();
        app.markAutoSaveDirty?.(['manifest', 'player', 'quests', 'activityLog'], 'perk-debug-grant');
        app.autoSave();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PERK_FLOW = YAW_PERK_FLOW;
}
