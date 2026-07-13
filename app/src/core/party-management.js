/**
 * YOU ARE WILD PARTY MANAGEMENT
 * Party leadership, roles, AI orders, reorder, drag, and dismissal behavior.
 */

const YAW_PARTY_MANAGEMENT = {
    roleCount(app, role) {
        return (app.party || []).filter(unit => unit && unit !== app.player && unit.CPun > 0 && this.getRole(app, unit) === role).length;
    },

    roleEffect(app, role, amount = 1, cap = Infinity) {
        return Math.min(cap, this.roleCount(app, role) * amount);
    },

    getAIOrder(app, unit) {
        const order = unit?.aiOrder || 'aggressive';
        return app.PARTY_AI_ORDERS[order] ? order : 'aggressive';
    },

    getRole(app, unit) {
        const role = unit?.partyRole || 'companion';
        return app.PARTY_ROLES[role] ? role : 'companion';
    },

    aiOrderLabel(app, order) {
        const key = app.PARTY_AI_ORDERS[order] ? order : 'aggressive';
        return app._label(`party.aiOrder.${key}`, app.PARTY_AI_ORDERS[key]);
    },

    roleLabel(app, role) {
        const key = app.PARTY_ROLES[role] ? role : 'companion';
        return app._label(`party.role.${key}`, app.PARTY_ROLES[key]);
    },

    aiOrderDescription(app, order) {
        const key = app.PARTY_AI_ORDERS[order] ? order : 'aggressive';
        const fallback = {
            aggressive: 'Prioritizes attacking reachable threats.',
            defensive: 'Favors safer positioning and protecting allies.',
            healer: 'Feeds the most wounded ally first.',
            scavenger: 'Looks for corpse-feast opportunities after victory.',
            passive: 'Avoids acting unless wounded or pressured.'
        }[key];
        return app._label(`party.aiOrderDescription.${key}`, fallback);
    },

    roleDescription(app, role) {
        const key = app.PARTY_ROLES[role] ? role : 'companion';
        const fallback = {
            companion: 'No special exploration role.',
            scout: 'Improves night visibility and route awareness.',
            guard: 'Reduces ambush advantage and helps protect camp.',
            support: 'Improves recovery when resting somewhere safe.',
            gatherer: 'Improves search and foraging results.'
        }[key];
        return app._label(`party.roleDescription.${key}`, fallback);
    },

    setAIOrder(app, index, order) {
        const unit = app.party[index];
        if (!unit || unit === app.player || !app.PARTY_AI_ORDERS[order]) return;
        unit.aiOrder = order;
        app.log.push({ text: app._label('party.aiOrderSet', '{name} will act {order}.', {
            name: unit.name,
            order: this.aiOrderLabel(app, order).toLowerCase()
        }), type: 'discovery' });
        app.renderParty();
        app.renderLog();
        app.markAutoSaveDirty?.(['manifest', 'party', 'quests', 'activityLog'], 'party-ai-order');
        app.autoSave();
    },

    setRole(app, index, role) {
        const unit = app.party[index];
        if (!unit || unit === app.player || !app.PARTY_ROLES[role]) return;
        unit.partyRole = role;
        app.log.push({ text: app._label('party.roleSet', '{name} is assigned as {role}.', {
            name: unit.name,
            role: this.roleLabel(app, role).toLowerCase()
        }), type: 'discovery' });
        app.renderParty();
        app.renderLog();
        app.markAutoSaveDirty?.(['manifest', 'party', 'quests', 'activityLog'], 'party-role');
        app.autoSave();
    },

    leader(app) {
        const leader = app.party.find(p => app._unitSelectionId(p) === String(app.partyLeaderId || ''));
        return leader || app.player || app.party[0] || null;
    },

    setLeader(app, index) {
        const unit = app.party[index];
        if (!unit) return;
        app.partyLeaderId = app._unitSelectionId(unit);
        app.log.push({ text: app._label('party.leaderSet', '{name} is now party leader.', { name: unit.name }), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        app.markAutoSaveDirty?.(['manifest', 'party', 'quests', 'activityLog'], 'party-leader');
        app.autoSave();
    },

    move(app, index, direction) {
        const targetIndex = index + direction;
        return this.reorder(app, index, targetIndex);
    },

    reorder(app, index, targetIndex) {
        if (index <= 0 || targetIndex <= 0 || targetIndex >= app.party.length || index === targetIndex) return false;
        const [unit] = app.party.splice(index, 1);
        app.party.splice(targetIndex, 0, unit);
        app.log.push({ text: app._label('party.positionChanged', '{name} changes party position.', { name: unit.name }), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        app.markAutoSaveDirty?.(['manifest', 'party', 'quests', 'activityLog'], 'party-reorder');
        app.autoSave();
        return true;
    },

    startDrag(app, index) {
        if (index <= 0 || !app.party[index] || app.combatState.active) return false;
        app.draggedPartyIndex = index;
        return true;
    },

    dragOver(event) {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
    },

    clearDrag(app) {
        app.draggedPartyIndex = null;
    },

    drop(app, targetIndex) {
        const draggedIndex = Number(app.draggedPartyIndex);
        this.clearDrag(app);
        if (!Number.isInteger(draggedIndex)) return false;
        return this.reorder(app, draggedIndex, targetIndex);
    },

    dropDismissed(app, unit) {
        const tile = app._currentExplorationTile();
        if (!unit || !tile) return null;
        const dismissed = app._normalizeUnit({
            ...unit,
            disposition: app.DISPOSITION.NEUTRAL,
            ally: false,
            mc: false,
            obedient: false,
            formerPartyMember: true,
            formerPartyRole: this.getRole(app, unit),
            partyRole: 'companion'
        }, {});
        const sameUnit = candidate => app._unitSelectionId(candidate) === app._unitSelectionId(dismissed);
        app.creatures = app._tileCreatures([...(app.creatures || []).filter(candidate => !sameUnit(candidate)), dismissed]);
        tile.creatures = app._tileCreatures([...(tile.creatures || []).filter(candidate => !sameUnit(candidate)), dismissed]);
        if (app.inInterior && app.activeInterior?.origin) {
            const origin = app.getTile(app.activeInterior.origin.x, app.activeInterior.origin.y);
            origin.interior = app.activeInterior;
            app.persistTileDelta(origin.x, origin.y, origin);
        } else if (Number.isFinite(Number(tile.x)) && Number.isFinite(Number(tile.y))) {
            app.persistTileDelta(tile.x, tile.y, tile);
        }
        return dismissed;
    },

    dismiss(app, index) {
        const unit = app.party[index];
        if (!unit || unit === app.player || unit.mc) return;
        const confirmMessage = app._label('party.confirmDismiss', 'Dismiss {name} from the party?', { name: unit.name });
        return app.showConfirmDialog({
            title: app._label('party.dismiss', 'Dismiss'),
            message: confirmMessage,
            confirmLabel: app._label('party.dismiss', 'Dismiss'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            danger: true,
            onConfirm: () => this.confirmDismiss(app, index)
        });
    },

    confirmDismiss(app, index) {
        const unit = app.party[index];
        if (!unit || unit === app.player || unit.mc) return false;
        app.party.splice(index, 1);
        const dropped = this.dropDismissed(app, unit);
        app._normalizeExplorationSelections();
        if (app.partyLeaderId === app._unitSelectionId(unit)) app.partyLeaderId = app._unitSelectionId(app.player);
        app.log.push({
            text: app._label(
                dropped ? 'party.dismissedNearby' : 'party.dismissed',
                dropped ? '{name} leaves the party and remains nearby.' : '{name} leaves the party.',
                { name: unit.name }
            ),
            type: 'discovery'
        });
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        app.markAutoSaveDirty?.(['manifest', 'party', 'currentTile', 'worldTiles', 'quests', 'activityLog'], 'party-dismiss');
        app.autoSave();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PARTY_MANAGEMENT = YAW_PARTY_MANAGEMENT;
}
