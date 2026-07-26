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
        return YAW_PERK_EFFECTS.hasFlag(unit, effect);
    },

    canChoose(app, perk, treeId, unit = app.player) {
        if (!perk || !unit || this.hasPerk(app, perk.id, unit)) return false;
        if (!perk.requires) return true;
        if (perk.requires.perk && !this.hasPerk(app, perk.requires.perk, unit)) return false;
        if (perk.requires.tree && this.treeCount(app, perk.requires.tree, unit) < (perk.requires.count || 1)) return false;
        if (perk.requires.level && Number(unit.level || 1) < Number(perk.requires.level)) return false;
        if (perk.requires.practice) {
            const record = unit.multiActionPractice?.multi?.[perk.requires.practice.key];
            if (Number(record?.attempts || 0) < Number(perk.requires.practice.count || 1)) return false;
        }
        if (perk.requires.equipmentEffect && !app._hasEquipmentEffect?.(unit, perk.requires.equipmentEffect)) return false;
        if (perk.requires.milestone && !unit.progressionMilestones?.[perk.requires.milestone]) return false;
        return true;
    },

    localizeTree(app, treeId, tree) {
        if (!tree || tree.owner) return tree;
        const isSpecies = treeId.startsWith('species:');
        const treeKey = isSpecies ? treeId.slice('species:'.length) : treeId;
        return {
            ...tree,
            label: app._label(`perk.tree.${treeKey}`, tree.label),
            perks: (tree.perks || []).map(perk => ({
                ...perk,
                name: app._label(`perk.name.${perk.id}`, perk.name),
                desc: app._label(`perk.desc.${perk.id}`, perk.desc)
            }))
        };
    },

    treesForUnit(app, unit = app.player) {
        const trees = Object.fromEntries(Object.entries(app.PERK_TREES)
            .map(([treeId, tree]) => [treeId, this.localizeTree(app, treeId, tree)]));
        Object.assign(trees, YAW_PERK_REGISTRY.forUnit(app, unit));
        const speciesTree = app.SPECIES_PERK_TREES[unit?.species];
        if (speciesTree) {
            const treeId = `species:${unit.species}`;
            trees[treeId] = this.localizeTree(app, treeId, speciesTree);
        }
        return trees;
    },

    definitionFor(app, perkId, unit = app.player) {
        for (const tree of Object.values(this.treesForUnit(app, unit))) {
            const definition = (tree.perks || []).find(perk => perk.id === perkId);
            if (definition) return definition;
        }
        return null;
    },

    selectedName(app, selectedPerk, unit = app.player) {
        return this.definitionFor(app, selectedPerk?.id, unit)?.name
            || selectedPerk?.name
            || selectedPerk?.id
            || '';
    },

    availableChoices(app, unit = app.player) {
        const choices = [];
        for (const [treeId, tree] of Object.entries(this.treesForUnit(app, unit))) {
            for (const perk of tree.perks) {
                if (!this.canChoose(app, perk, treeId, unit)) continue;
                choices.push({
                    ...perk,
                    tree: treeId,
                    treeLabel: tree.label,
                    available: true,
                    availabilityReason: this.availabilityReason(app, perk, treeId, tree, unit)
                });
            }
        }
        return choices;
    },

    availabilityReason(app, perk, treeId, tree, unit = app.player) {
        if (perk.requires?.perk) {
            const prerequisite = this.definitionFor(app, perk.requires.perk, unit);
            return app._label('perk.available.fromPerk', 'Unlocked by {name}.', {
                name: prerequisite?.name || perk.requires.perk
            });
        }
        if (perk.requires?.tree) {
            return app._label('perk.available.fromPath', 'Unlocked by your {path} path.', {
                path: this.treesForUnit(app, unit)[perk.requires.tree]?.label || perk.requires.tree
            });
        }
        if (treeId.startsWith('species:')) {
            return app._label('perk.available.fromSpecies', 'Available to your {species} lineage.', {
                species: tree.label || unit?.species || ''
            });
        }
        return app._label('perk.available.current', 'Available from your current experience.');
    },

    availableFilters(app, unit = app.player) {
        return [['all', app._label('perk.frontier', 'Current choices')]];
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
        const effectProfile = YAW_PERK_EFFECTS.apply(app.player, choice);
        app.player.perks.push({
            id: choice.id,
            tree: choice.tree,
            species: choice.tree.startsWith('species:') ? app.player.species : null,
            name: choice.name,
            stat: choice.stat,
            val: choice.val,
            perkEffect: choice.perkEffect || null,
            desc: choice.desc,
            definitionVersion: 2,
            effectVersion: effectProfile.version,
            effectProfile: {
                version: effectProfile.version,
                effects: effectProfile.effects.map(effect => ({ ...effect }))
            },
            availabilityReason: choice.availabilityReason
        });
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
        selected.forEach(perk => YAW_PERK_EFFECTS.rollback(app.player, perk));
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
