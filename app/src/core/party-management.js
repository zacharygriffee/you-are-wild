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
        return this.getStance(app, unit);
    },

    getRole(app, unit) {
        return this.getDuty(app, unit);
    },

    getDuty(app, unit) {
        return YAW_COMPANION_BEHAVIOR.get(app, unit).duty;
    },

    getStance(app, unit) {
        return YAW_COMPANION_BEHAVIOR.get(app, unit).stance;
    },

    getControl(app, unit) {
        return YAW_COMPANION_BEHAVIOR.get(app, unit).control;
    },

    aiOrderLabel(app, order) {
        return this.stanceLabel(app, YAW_COMPANION_BEHAVIOR.legacyStance(order));
    },

    roleLabel(app, role) {
        return this.dutyLabel(app, YAW_COMPANION_BEHAVIOR.legacyDuty(role));
    },

    aiOrderDescription(app, order) {
        return this.stanceDescription(app, YAW_COMPANION_BEHAVIOR.legacyStance(order));
    },

    roleDescription(app, role) {
        const key = app.PARTY_DUTIES[role] ? role : YAW_COMPANION_BEHAVIOR.legacyDuty(role);
        const fallback = {
            scout: 'Improves night visibility and route awareness.',
            guard: 'Reduces ambush advantage and helps protect camp.',
            support: 'Improves recovery when resting somewhere safe.',
            gatherer: 'Improves search and foraging results.'
        }[key];
        return app._label(`party.dutyDescription.${key}`, app._label(`party.roleDescription.${key}`, fallback));
    },

    dutyLabel(app, duty) {
        const key = app.PARTY_DUTIES[duty] ? duty : 'support';
        return app._label(`party.duty.${key}`, app.PARTY_DUTIES[key].label);
    },

    dutyDescription(app, duty) {
        const key = app.PARTY_DUTIES[duty] ? duty : 'support';
        return app._label(`party.dutyDescription.${key}`, app.PARTY_DUTIES[key].description);
    },

    dutyTradeoff(app, duty) {
        const key = app.PARTY_DUTIES[duty] ? duty : 'support';
        return app._label(`party.dutyTradeoff.${key}`, app.PARTY_DUTIES[key].tradeoff);
    },

    stanceLabel(app, stance) {
        const key = app.PARTY_STANCES[stance] ? stance : 'balanced';
        return app._label(`party.stance.${key}`, app.PARTY_STANCES[key].label);
    },

    stanceDescription(app, stance) {
        const key = app.PARTY_STANCES[stance] ? stance : 'balanced';
        return app._label(`party.stanceDescription.${key}`, app.PARTY_STANCES[key].description);
    },

    controlLabel(app, control) {
        const key = app.PARTY_CONTROLS[control] ? control : 'manual';
        return app._label(`party.control.${key}`, app.PARTY_CONTROLS[key].label);
    },

    controlDescription(app, control) {
        const key = app.PARTY_CONTROLS[control] ? control : 'manual';
        return app._label(`party.controlDescription.${key}`, app.PARTY_CONTROLS[key].description);
    },

    saveBehaviorChange(app, unit, field, value, label) {
        if (!YAW_COMPANION_BEHAVIOR.set(app, unit, field, value)) return false;
        app.log.push({
            text: app._label(`party.${field}Set`, '{name}: {field} is now {value}.', {
                name: unit.name,
                field: app._label(`party.${field}`, field),
                value: label.toLowerCase()
            }),
            type: 'discovery'
        });
        app.renderParty();
        app.renderLog();
        app.markAutoSaveDirty?.(['manifest', 'party', 'quests', 'activityLog'], `party-${field}`);
        app.autoSave();
        return true;
    },

    setDuty(app, index, duty) {
        const unit = app.party[index];
        return this.saveBehaviorChange(app, unit, 'duty', duty, this.dutyLabel(app, duty));
    },

    setStance(app, index, stance) {
        const unit = app.party[index];
        return this.saveBehaviorChange(app, unit, 'stance', stance, this.stanceLabel(app, stance));
    },

    setControl(app, index, control) {
        const unit = app.party[index];
        return this.saveBehaviorChange(app, unit, 'control', control, this.controlLabel(app, control));
    },

    showBehavior(app, index) {
        const unit = app.party?.[index];
        if (!unit || unit === app.player || unit.mc || app.combatState?.active) return false;
        const behavior = YAW_COMPANION_BEHAVIOR.get(app, unit);
        const unitName = unit.name || app._label('unit.partyMember', 'party member');
        const title = app._label('party.manageBehaviorFor', 'Behavior: {name}', { name: unitName });
        const detailAttrs = 'data-command-surface="detail-management" data-command-mode="exploration"';
        const select = (field, options, description) => {
            const setter = field === 'duty' ? 'setCompanionDuty' : field === 'stance' ? 'setCompanionStance' : 'setCompanionControl';
            const label = app._label(`party.${field}`, field);
            const controlKey = `set-companion-${field}`;
            const value = behavior[field];
            const choices = Object.keys(options).map(key => `<option value="${key}" ${value === key ? 'selected' : ''}>${app._escapeHtml(field === 'duty' ? this.dutyLabel(app, key) : field === 'stance' ? this.stanceLabel(app, key) : this.controlLabel(app, key))}</option>`).join('');
            const aria = app._label(`party.${field}For`, `${label} for {name}`, { name: unitName });
            return `<label class="companion-behavior-field"><span>${app._escapeHtml(label)}</span><select class="nav-btn" ${detailAttrs} data-command-control="${controlKey}" title="${app._escapeHtml(description)}" aria-label="${app._escapeHtml(aria)}" onchange="App.${setter}(${index},this.value);App.showCompanionBehavior(${index})">${choices}</select><small class="companion-behavior-preview">${app._escapeHtml(description)}</small></label>`;
        };
        const dutyDescription = `${this.dutyDescription(app, behavior.duty)} ${app._label('party.tradeoff', 'Tradeoff')}: ${this.dutyTradeoff(app, behavior.duty)}`;
        const backLabel = app._label('ui.back', 'Back');
        const html = `<div class="party-behavior-view" data-command-surface="detail-management" data-command-mode="exploration" role="region" aria-label="${app._escapeHtml(title)}">
            <div class="party-stats-header"><div><h3>${app._escapeHtml(title)}</h3><p style="color:var(--text-muted);margin-top:4px">${app._escapeHtml(app._label('party.manageBehaviorHelp', 'Choose how this companion approaches exploration and autonomous turns.'))}</p></div><button class="nav-btn" ${detailAttrs} data-command-control="close-companion-behavior" data-command-slot="exit" title="${app._escapeHtml(backLabel)}" aria-label="${app._escapeHtml(backLabel)}" onclick="App.closePanelDetails('party')">${app._escapeHtml(backLabel)}</button></div>
            <div class="unit-actions unit-management-actions" style="display:grid;gap:10px;">${select('duty', app.PARTY_DUTIES, dutyDescription)}${select('stance', app.PARTY_STANCES, this.stanceDescription(app, behavior.stance))}${select('control', app.PARTY_CONTROLS, this.controlDescription(app, behavior.control))}</div>
            <div class="party-stats-footer"><button class="nav-btn" ${detailAttrs} data-command-control="close-companion-behavior" data-command-slot="exit" title="${app._escapeHtml(backLabel)}" aria-label="${app._escapeHtml(backLabel)}" onclick="App.closePanelDetails('party')">${app._escapeHtml(backLabel)}</button></div>
        </div>`;
        app.showPartyPanelDetail(title, html);
        return true;
    },

    setAIOrder(app, index, order) {
        if (order === 'healer') {
            this.setDuty(app, index, 'support');
            return this.setStance(app, index, 'balanced');
        }
        if (order === 'scavenger') {
            this.setDuty(app, index, 'gatherer');
            return this.setStance(app, index, 'balanced');
        }
        return this.setStance(app, index, YAW_COMPANION_BEHAVIOR.legacyStance(order));
    },

    setRole(app, index, role) {
        return this.setDuty(app, index, YAW_COMPANION_BEHAVIOR.legacyDuty(role));
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
            partyRole: this.getDuty(app, unit)
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

    canDropOff(app, unit) {
        if (!unit || unit === app.player || unit.mc || app.combatState?.active) return false;
        const tile = app._currentExplorationTile?.();
        if (!tile) return false;
        return !(app.creatures || []).some(candidate => candidate
            && candidate.disposition === app.DISPOSITION.ENEMY
            && candidate.CPun > 0
            && !candidate.knockedOut);
    },

    placeDroppedOff(app, unit, options = {}) {
        const tile = app._currentExplorationTile?.();
        if (!unit || !tile) return null;
        const location = {
            x: Number(app.location?.x) || 0,
            y: Number(app.location?.y) || 0,
            interior: Boolean(app.inInterior),
            interiorX: Number(app.interiorLocation?.x) || 0,
            interiorY: Number(app.interiorLocation?.y) || 0
        };
        const placed = app._normalizeUnit({
            ...unit,
            disposition: app.DISPOSITION.FRIENDLY,
            ally: false,
            mc: false,
            obedient: true,
            willing: true,
            recruitReady: true,
            droppedOffCompanion: true,
            strandedAfterDefeat: Boolean(options.strandedAfterDefeat),
            droppedOffAt: location
        }, { disposition: app.DISPOSITION.FRIENDLY, ally: false, mc: false, obedient: true, willing: true });
        const sameUnit = candidate => app._unitSelectionId(candidate) === app._unitSelectionId(placed);
        app.creatures = app._tileCreatures([...(app.creatures || []).filter(candidate => !sameUnit(candidate)), placed]);
        tile.creatures = app._tileCreatures([...(tile.creatures || []).filter(candidate => !sameUnit(candidate)), placed]);
        app._persistCurrentExplorationTile?.(tile);
        return placed;
    },

    dropOff(app, index) {
        const unit = app.party[index];
        if (!this.canDropOff(app, unit)) {
            const message = app._label('party.dropOffBlocked', 'Companions can only be dropped off outside combat at a location without active hostiles.');
            app.log.push({ text: message, type: 'discovery' });
            app.renderLog?.();
            return false;
        }
        return app.showConfirmDialog({
            title: app._label('party.dropOff', 'Drop Off'),
            message: app._label('party.confirmDropOff', 'Leave {name} here? You can return and ask them to rejoin later.', { name: unit.name }),
            confirmLabel: app._label('party.dropOff', 'Drop Off'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            onConfirm: () => this.confirmDropOff(app, index)
        });
    },

    confirmDropOff(app, index) {
        const unit = app.party[index];
        if (!this.canDropOff(app, unit)) return false;
        app.party.splice(index, 1);
        const placed = this.placeDroppedOff(app, unit);
        if (!placed) {
            app.party.splice(Math.min(index, app.party.length), 0, unit);
            return false;
        }
        app._normalizeExplorationSelections();
        if (app.partyLeaderId === app._unitSelectionId(unit)) app.partyLeaderId = app._unitSelectionId(app.player);
        const message = app._label('party.droppedOff', '{name} stays here. Return to this location when you want them to rejoin.', { name: unit.name });
        app.log.push({ text: message, type: 'discovery' });
        app._addTileEvent?.(message, 'discovery');
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        app.showExplorationActions?.();
        app.markAutoSaveDirty?.(['manifest', 'party', 'currentTile', 'worldTiles', 'quests', 'sceneFeed', 'activityLog'], 'party-drop-off');
        app.autoSave();
        return true;
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
