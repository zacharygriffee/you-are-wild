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

    autonomyStatus(app, unit) {
        return YAW_COMPANION_BEHAVIOR.autonomyStatus(app, unit);
    },

    autonomyStatusLabel(app, unit) {
        const status = this.autonomyStatus(app, unit);
        return status ? app._label(`party.autonomyStatus.${status}`, {
            active: 'Autonomy active',
            paused: 'Autonomy paused',
            'awaiting-direction': 'Awaiting direction'
        }[status]) : '';
    },

    autonomyControl(app, unit, index, options = {}) {
        if (!unit || unit === app.player || unit.mc) return '';
        if (!app.combatState?.active) return '';
        const status = this.autonomyStatus(app, unit);
        const canToggle = YAW_COMPANION_BEHAVIOR.canToggleAutonomy(app, unit);
        const action = status === 'active' ? 'pause' : (status === 'paused' ? 'play' : 'awaiting');
        const actionLabel = app._label(`party.autonomyAction.${action}`, {
            pause: 'Pause',
            play: 'Play',
            awaiting: 'Awaiting direction'
        }[action]);
        const statusLabel = this.autonomyStatusLabel(app, unit);
        const title = canToggle
            ? app._label('party.autonomyToggleFor', '{action} autonomy for {name}. {status}.', {
                action: actionLabel,
                name: unit.name || app._label('unit.partyMember', 'party member'),
                status: statusLabel
            })
            : app._label('party.autonomyUnavailableFor', '{status} for {name}. Play/Pause is available only on your turn.', {
                name: unit.name || app._label('unit.partyMember', 'party member'),
                status: statusLabel
            });
        const classes = [
            'action-btn',
            'autonomy-toggle',
            options.corner ? 'corner-card-toggle autonomy-corner-toggle' : '',
            options.micro ? 'micro-card-toggle' : '',
            status === 'paused' ? 'primary' : ''
        ].filter(Boolean).join(' ');
        const disabled = canToggle ? '' : ' disabled aria-disabled="true"';
        return `<button class="${classes}" data-command-surface="companion-autonomy" data-command-mode="combat" data-command-control="toggle-companion-autonomy" data-autonomy-status="${app._escapeHtml(status)}" aria-pressed="${status === 'paused' ? 'true' : 'false'}" title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${disabled} onclick="event.stopPropagation();App.toggleCompanionAutonomy(${index})">${options.micro ? '' : app._escapeHtml(actionLabel)}</button>`;
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

    providerAvailable(app) {
        return YAW_COMPANION_BEHAVIOR.hasProviderController(app);
    },

    feedback(app, text, unit = null, tags = []) {
        app.log = app.log || [];
        app.log.push({ text, type: 'discovery' });
        app.emitSceneBeat?.({
            mode: app.combatState?.active ? 'combat' : 'adventure',
            actors: [unit].filter(Boolean),
            targets: [],
            action: 'party-management',
            tags: ['party-management', ...tags],
            source: 'party-management'
        }, text, {
            resultKind: tags.includes('renamed') ? 'success' : 'feedback',
            importance: tags.includes('renamed') ? 'notable' : 'hint',
            tags: ['party-management', ...tags],
            source: 'party-management'
        });
        app.renderLog?.();
        return false;
    },

    remapUnitReferenceState(app, oldId, newId) {
        if (!oldId || oldId === newId) return;
        const replace = value => String(value || '') === String(oldId) ? newId : value;
        const replacePartyTarget = value => String(value || '') === `party:${oldId}` ? `party:${newId}` : value;
        app.partyLeaderId = replace(app.partyLeaderId);
        app.explorationActorId = replace(app.explorationActorId);
        app.explorationActorIds = (app.explorationActorIds || []).map(replace);
        app.explorationTargetIds = (app.explorationTargetIds || []).map(replacePartyTarget);
        app.combatTargetId = replace(app.combatTargetId);
        app.combatTargetIds = (app.combatTargetIds || []).map(replace);
        for (const state of [app.targetSelection, app.syncSelection, app.combatPlanSelection, app.feedSelection]) {
            if (!state) continue;
            state.actorId = replace(state.actorId);
            state.targetId = replace(state.targetId);
            if (Array.isArray(state.actorIds)) state.actorIds = state.actorIds.map(replace);
            if (Array.isArray(state.targetIds)) state.targetIds = state.targetIds.map(replace);
            if (Array.isArray(state.participantIds)) state.participantIds = state.participantIds.map(replace);
        }
    },

    ensureStableUnitId(app, unit) {
        if (unit?.id != null && String(unit.id)) return String(unit.id);
        const oldId = app._unitSelectionId?.(unit) || unit?.name || '';
        const baseName = String(unit?.species || unit?.name || 'companion')
            .normalize('NFKD')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase()
            .slice(0, 32) || 'companion';
        const used = new Set([...(app.party || []), ...(app.creatures || [])]
            .map(candidate => candidate?.id)
            .filter(value => value != null)
            .map(String));
        let suffix = 1;
        let id = `party-${baseName}-${suffix}`;
        while (used.has(id)) id = `party-${baseName}-${++suffix}`;
        unit.id = id;
        this.remapUnitReferenceState(app, oldId, id);
        return id;
    },

    rename(app, ownerId, proposedName) {
        const wanted = String(ownerId ?? '');
        const unit = (app.party || []).find((candidate, index) => (
            app._unitSelectionId(candidate) === wanted
            || String(candidate?.id || '') === wanted
            || `party:${index}` === wanted
            || `name:${candidate?.name || ''}` === wanted
        ));
        if (!unit || !(app.party || []).includes(unit)) {
            return this.feedback(app, app._label('party.renameMissing', 'That companion is no longer with the party, so the name remains unchanged.'), null, ['rename-failed', 'missing-companion']);
        }
        if (unit === app.player || unit.mc) {
            return this.feedback(app, app._label('party.renamePlayerUnavailable', 'Your own name remains part of your character identity.'), unit, ['rename-failed', 'player']);
        }
        const oldName = unit.name || app._label('unit.partyMember', 'That companion');
        const nextName = String(proposedName ?? '')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!nextName) {
            return this.feedback(app, app._label('party.renameEmpty', '{name} does not answer to an empty name.', { name: oldName }), unit, ['rename-failed', 'empty-name']);
        }
        if ([...nextName].length > 32) {
            return this.feedback(app, app._label('party.renameTooLong', '{name} cannot settle on a name that long.', { name: oldName }), unit, ['rename-failed', 'long-name']);
        }
        const duplicate = (app.party || []).find(candidate => candidate !== unit
            && String(candidate?.name || '').trim().toLocaleLowerCase() === nextName.toLocaleLowerCase());
        if (duplicate) {
            return this.feedback(app, app._label('party.renameDuplicate', '{name} pauses; someone in the party already answers to {newName}.', {
                name: oldName,
                newName: nextName
            }), unit, ['rename-failed', 'duplicate-name']);
        }
        if (oldName === nextName) return true;
        const holdingsOwner = typeof YAW_HOLDINGS !== 'undefined' && app.holdingsWindow
            ? YAW_HOLDINGS.ownerById(app, app.holdingsWindow.ownerId, { fallback: false })
            : null;
        const stableId = this.ensureStableUnitId(app, unit);
        unit.name = nextName;
        if (app.holdingsWindow && holdingsOwner === unit) app.holdingsWindow.ownerId = stableId;
        const text = app._label('party.renamed', '{oldName} asks the party to call them {newName}.', { oldName, newName: nextName });
        this.feedback(app, text, unit, ['renamed']);
        app.renderParty?.();
        app.renderCenterPresence?.();
        if (app.combatState?.active) app.renderCombatSceneForTurn?.(app._currentCombatActor?.());
        app.markAutoSaveDirty?.(['manifest', 'party', 'quests', 'combat', 'sceneFeed', 'activityLog'], 'party-rename');
        app.autoSave?.();
        if (typeof YAW_HOLDINGS !== 'undefined') YAW_HOLDINGS.refresh(app);
        return true;
    },

    preferredRowLabel(app, preferredRow) {
        const key = app.PARTY_PREFERRED_ROWS?.[preferredRow] ? preferredRow : 'auto';
        return app._label(`party.preferredRow.${key}`, app.PARTY_PREFERRED_ROWS?.[key]?.label || key);
    },

    preferredRowDescription(app, preferredRow) {
        const key = app.PARTY_PREFERRED_ROWS?.[preferredRow] ? preferredRow : 'auto';
        return app._label(`party.preferredRowDescription.${key}`, app.PARTY_PREFERRED_ROWS?.[key]?.description || '');
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
        const unavailableProvider = control === 'provider' && !this.providerAvailable(app);
        const effectiveControl = unavailableProvider ? 'deterministic' : control;
        const changed = this.saveBehaviorChange(app, unit, 'control', effectiveControl, this.controlLabel(app, effectiveControl));
        if (!changed || !unavailableProvider) return changed;
        const text = app._label('party.controlProviderUnavailable', '{name} has no AI assistance configured, so they will act autonomously.', {
            name: unit?.name || app._label('unit.partyMember', 'That companion')
        });
        app.log.push({ text, type: 'discovery' });
        app.emitSceneBeat?.({
            mode: app.combatState?.active ? 'combat' : 'adventure',
            actors: [unit].filter(Boolean),
            targets: [],
            action: 'companion-control',
            tags: ['companion-behavior', 'provider-unavailable', 'autonomous-fallback'],
            source: 'companion-behavior'
        }, text, {
            resultKind: 'feedback',
            importance: 'hint',
            tags: ['companion-behavior', 'provider-unavailable', 'autonomous-fallback'],
            source: 'companion-behavior'
        });
        app.renderLog();
        return true;
    },

    toggleAutonomy(app, index) {
        const unit = app.party?.[index];
        const paused = YAW_COMPANION_BEHAVIOR.toggleAutonomy(app, unit);
        if (paused === null) return false;
        app.log.push({
            text: app._label(paused ? 'party.autonomyPausedLog' : 'party.autonomyResumedLog', paused
                ? '{name} pauses autonomous behavior and keeps their current intent.'
                : '{name} resumes autonomous behavior.', { name: unit.name }),
            type: 'combat'
        });
        app.renderCombatSceneForTurn?.(YAW_COMPANION_BEHAVIOR.currentTurnUnit(app));
        app.renderParty();
        app.renderLog();
        app.markAutoSaveDirty?.(['manifest', 'party', 'quests', 'activityLog'], 'party-autonomy-paused');
        app.autoSave();
        return true;
    },

    setPreferredRow(app, index, preferredRow) {
        const unit = app.party[index];
        return this.saveBehaviorChange(app, unit, 'preferredRow', preferredRow, this.preferredRowLabel(app, preferredRow));
    },

    renderBehaviorSection(app, unit) {
        const index = (app.party || []).indexOf(unit);
        if (!unit || index < 0 || unit === app.player || unit.mc) {
            return `<section class="holdings-section holdings-behavior-section"><h3>${app._escapeHtml(app._label('party.manageBehavior', 'Behavior'))}</h3><p class="holding-entry-meta">${app._escapeHtml(app._label('party.playerBehaviorHelp', 'Your combat row is a tactical choice. Use Advance or Retreat during combat.'))}</p></section>`;
        }
        const behavior = YAW_COMPANION_BEHAVIOR.get(app, unit);
        const unitName = unit.name || app._label('unit.partyMember', 'party member');
        const select = (field, options, description) => {
            const setter = field === 'duty'
                ? 'setCompanionDuty'
                : (field === 'stance'
                    ? 'setCompanionStance'
                    : (field === 'control' ? 'setCompanionControl' : 'setCompanionPreferredRow'));
            const label = app._label(`party.${field}`, field);
            const controlKey = `set-companion-${field}`;
            const value = behavior[field];
            const choices = Object.keys(options).map(key => {
                const title = field === 'duty'
                    ? this.dutyLabel(app, key)
                    : (field === 'stance'
                        ? this.stanceLabel(app, key)
                        : (field === 'control' ? this.controlLabel(app, key) : this.preferredRowLabel(app, key)));
                const unavailableProvider = field === 'control' && key === 'provider' && !this.providerAvailable(app);
                const unavailableText = app._label('party.controlProviderUnavailableOption', 'AI assistance is not configured. Autonomous control will be used instead.');
                const optionTitle = unavailableProvider ? unavailableText : title;
                const optionState = [value === key ? 'selected' : '', unavailableProvider ? 'disabled' : ''].filter(Boolean).join(' ');
                return `<option value="${key}"${optionState ? ` ${optionState}` : ''} title="${app._escapeHtml(optionTitle)}">${app._escapeHtml(title)}${unavailableProvider ? ` (${app._escapeHtml(app._label('party.unavailable', 'unavailable'))})` : ''}</option>`;
            }).join('');
            const aria = app._label(`party.${field}For`, `${label} for {name}`, { name: unitName });
            return `<label class="companion-behavior-field"><span>${app._escapeHtml(label)}</span><select class="nav-btn" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="${controlKey}" title="${app._escapeHtml(description)}" aria-label="${app._escapeHtml(aria)}" onchange="App.${setter}(${index},this.value);App.refreshHoldingsWindow()">${choices}</select><small class="companion-behavior-preview">${app._escapeHtml(description)}</small></label>`;
        };
        const dutyDescription = `${this.dutyDescription(app, behavior.duty)} ${app._label('party.tradeoff', 'Tradeoff')}: ${this.dutyTradeoff(app, behavior.duty)}`;
        const controlDescription = this.providerAvailable(app)
            ? this.controlDescription(app, behavior.control)
            : `${this.controlDescription(app, behavior.control)} ${app._label('party.controlProviderUnavailableOption', 'AI assistance is not configured. Autonomous control will be used instead.')}`;
        const title = app._label('party.manageBehaviorFor', 'Behavior: {name}', { name: unitName });
        return `<section class="holdings-section holdings-behavior-section" data-command-surface="holdings-window" data-command-mode="exploration" aria-label="${app._escapeHtml(title)}">
            <h3>${app._escapeHtml(title)}</h3>
            <p class="holding-entry-meta">${app._escapeHtml(app._label('party.manageBehaviorHelp', 'Choose how this companion approaches exploration and autonomous turns.'))}</p>
            <div class="unit-actions unit-management-actions" style="display:grid;gap:10px;">${select('duty', app.PARTY_DUTIES, dutyDescription)}${select('stance', app.PARTY_STANCES, this.stanceDescription(app, behavior.stance))}${select('control', app.PARTY_CONTROLS, controlDescription)}${select('preferredRow', app.PARTY_PREFERRED_ROWS, this.preferredRowDescription(app, behavior.preferredRow))}</div>
        </section>`;
    },

    showBehavior(app, index) {
        const unit = app.party?.[index];
        if (!unit || unit === app.player || unit.mc || app.combatState?.active) return false;
        return typeof YAW_HOLDINGS !== 'undefined' && typeof YAW_HOLDINGS.showForUnit === 'function'
            ? YAW_HOLDINGS.showForUnit(app, unit, { tab: 'behavior' })
            : false;
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
        if (typeof YAW_AUTONOMOUS_ACTORS !== 'undefined') {
            YAW_AUTONOMOUS_ACTORS.ensure(app, dismissed, tile);
            dismissed.autonomousActor.knowledge.player = {
                x: Number(app.location?.x) || 0,
                y: Number(app.location?.y) || 0,
                seenAt: YAW_AUTONOMOUS_ACTORS.absoluteHour(app)
            };
        }
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
