/**
 * YOU ARE WILD DEFEAT RECOVERY
 * Explicit defeat, recovery, and safe-place helpers.
 */

const YAW_DEFEAT_RECOVERY = {
    SCHEMA_VERSION: 3,
    PLAYER_STATES: ['active', 'incapacitated', 'captured', 'defeated', 'dead', 'recovering', 'run-ended'],

    clone(value, fallback = null) {
        try { return JSON.parse(JSON.stringify(value)); } catch (_error) { return fallback; }
    },

    defeatLocation(app) {
        return {
            x: Number.isFinite(app.location?.x) ? app.location.x : 0,
            y: Number.isFinite(app.location?.y) ? app.location.y : 0,
            interior: Boolean(app.inInterior),
            interiorX: Number.isFinite(app.interiorLocation?.x) ? app.interiorLocation.x : 0,
            interiorY: Number.isFinite(app.interiorLocation?.y) ? app.interiorLocation.y : 0
        };
    },

    normalizeCause(cause = 'unknown') {
        const token = String(cause || 'unknown').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
        return token || 'unknown';
    },

    migrateState(app, state = null) {
        if (!state || typeof state !== 'object') return null;
        if (Number(state.schemaVersion) >= 2) {
            return {
                ...state,
                schemaVersion: this.SCHEMA_VERSION,
                pending: Boolean(state.pending),
                terminal: Boolean(state.terminal),
                awaitingEncounterSettlement: Boolean(state.awaitingEncounterSettlement),
                encounterSettled: Boolean(state.encounterSettled),
                companionsSettled: Boolean(state.companionsSettled),
                companionRoster: Array.isArray(state.companionRoster) ? this.clone(state.companionRoster, []) : [],
                status: this.PLAYER_STATES.includes(state.status) ? state.status : (state.pending ? 'dead' : 'active'),
                cause: this.normalizeCause(state.cause || state.outcome),
                recoveryModeKey: String(state.recoveryModeKey || YAW_RECOVERY_MODES?.selectedKey?.(app) || 'core:ghost'),
                recoveryPhase: String(state.recoveryPhase || (state.status === 'recovering' ? 'journey' : 'prompt')),
                shrineAnchor: state.shrineAnchor ? this.normalizeAnchor(app, state.shrineAnchor) : null,
                safeAnchor: this.normalizeAnchor(app, state.safeAnchor || app.safeAnchor),
                defeatedAt: { ...this.defeatLocation(app), ...(state.defeatedAt || {}) }
            };
        }
        const terminal = Boolean(state.pending);
        return {
            schemaVersion: this.SCHEMA_VERSION,
            resolutionId: state.resolutionId || `defeat-${Number(state.loggedAt) || Date.now()}`,
            status: terminal ? 'dead' : 'active',
            pending: terminal,
            terminal,
            cause: this.normalizeCause(state.cause || state.outcome || 'defeat'),
            source: state.source || 'legacy-save',
            outcome: state.outcome || 'defeat',
            recoveryModeKey: 'core:ghost',
            recoveryPhase: 'prompt',
            shrineAnchor: null,
            defeatedAt: { ...this.defeatLocation(app), ...(state.defeatedAt || {}) },
            safeAnchor: this.normalizeAnchor(app, state.safeAnchor || app.safeAnchor),
            loggedAt: Number(state.loggedAt) || Date.now(),
            consequencesApplied: Boolean(state.consequencesApplied)
        };
    },

    resolve(app, input = {}) {
        const status = this.PLAYER_STATES.includes(input.status) ? input.status : (input.terminal ? 'dead' : 'incapacitated');
        const terminal = Boolean(input.terminal || ['defeated', 'dead', 'run-ended'].includes(status));
        const existing = this.migrateState(app, app.defeatState);
        if (existing?.terminal && existing.pending && terminal && existing.status !== 'run-ended') return existing;
        const now = Number(input.loggedAt) || Date.now();
        const combatActive = Boolean(app.combatState?.active);
        const companionRoster = Array.isArray(input.companionRoster)
            ? this.clone(input.companionRoster, [])
            : (Array.isArray(existing?.companionRoster) && existing.companionRoster.length
                ? this.clone(existing.companionRoster, [])
                : (terminal ? this.clone((app.party || []).filter(unit => unit && unit !== app.player), []) : []));
        app._defeatResolutionSeq = (Number(app._defeatResolutionSeq) || 0) + 1;
        const state = {
            schemaVersion: this.SCHEMA_VERSION,
            resolutionId: input.resolutionId || existing?.resolutionId || `defeat-${now}-${app._defeatResolutionSeq}`,
            status,
            pending: terminal && status !== 'run-ended',
            terminal,
            cause: this.normalizeCause(input.cause || input.outcome || 'defeat'),
            source: String(input.source || 'gameplay'),
            outcome: String(input.outcome || (terminal ? 'defeat' : status)),
            recoveryModeKey: String(input.recoveryModeKey || existing?.recoveryModeKey || YAW_RECOVERY_MODES?.selectedKey?.(app) || 'core:ghost'),
            recoveryPhase: String(input.recoveryPhase || existing?.recoveryPhase || 'prompt'),
            shrineAnchor: input.shrineAnchor
                ? this.normalizeAnchor(app, input.shrineAnchor)
                : (existing?.shrineAnchor ? this.normalizeAnchor(app, existing.shrineAnchor) : null),
            defeatedAt: { ...this.defeatLocation(app), ...(input.defeatedAt || {}) },
            safeAnchor: { ...this.ensureSafeAnchor(app) },
            loggedAt: now,
            awaitingEncounterSettlement: Boolean(input.awaitingEncounterSettlement ?? (terminal && combatActive)),
            encounterSettled: Boolean(existing?.encounterSettled),
            companionsSettled: Boolean(existing?.companionsSettled),
            companionRoster,
            consequencesApplied: Boolean(existing?.consequencesApplied)
        };
        app.defeatState = state;
        app._emitModuleHook('onPlayerState', {
            state: this.clone(state),
            playerId: String(app._unitSelectionId?.(app.player) || app.player?.id || app.player?.name || ''),
            partyIds: (app.party || []).map(unit => String(app._unitSelectionId?.(unit) || unit?.id || unit?.name || '')).filter(Boolean)
        });
        if (terminal) {
            app._emitModuleHook('onDefeat', {
                defeatState: state,
                safeAnchor: state.safeAnchor,
                location: { ...app.location },
                party: app.party,
                enemies: (app.creatures || []).filter(c => c.disposition === app.DISPOSITION.ENEMY)
            });
        }
        return state;
    },
    normalizeAnchor(app, anchor = null) {
        const fallback = { x: 0, y: 0, interior: false, label: app._label('recovery.startAnchor', 'The Beginning') };
        const source = anchor && typeof anchor === 'object' ? anchor : fallback;
        const x = Number.isFinite(source.x) ? Math.trunc(source.x) : fallback.x;
        const y = Number.isFinite(source.y) ? Math.trunc(source.y) : fallback.y;
        return {
            x,
            y,
            interior: false,
            label: String(source.label || fallback.label),
            setAtTurn: Number.isFinite(source.setAtTurn) ? source.setAtTurn : null,
            setAtHour: Number.isFinite(source.setAtHour) ? source.setAtHour : null
        };
    },

    startAnchor(app) {
        return this.normalizeAnchor(app, { x: 0, y: 0, label: app._label('recovery.startAnchor', 'The Beginning') });
    },

    ensureSafeAnchor(app) {
        app.safeAnchor = this.normalizeAnchor(app, app.safeAnchor || this.startAnchor(app));
        return app.safeAnchor;
    },

    canSetSafeAnchor(app) {
        if (!app.player || app.combatState?.active || app.inInterior) return false;
        const tile = app._currentExplorationTile?.() || app.getTile(app.location.x, app.location.y);
        if (!app._isRestCapableStructure?.(tile?.structure, tile)) return false;
        return !this.hasLivingHostile(app, app.creatures);
    },

    hasLivingHostile(app, creatures = []) {
        return (creatures || []).some(unit => unit && unit.disposition === app.DISPOSITION.ENEMY && app._isLivingCreature(unit));
    },

    setSafeAnchorFromCurrentLocation(app) {
        if (!this.canSetSafeAnchor(app)) {
            const blocked = app._label('recovery.setSafeBlocked', 'This place is not safe enough to mark as home.');
            app.log.push({ text: blocked, type: 'discovery' });
            app._addTileEvent(blocked, 'discovery');
            app.renderLog();
            app.showExplorationActions();
            return false;
        }
        const context = app._centerTileContext();
        app.safeAnchor = this.normalizeAnchor(app, {
            x: app.location.x,
            y: app.location.y,
            label: context?.title || app._label('recovery.safeAnchor', 'Safe Place'),
            setAtTurn: app.log.length,
            setAtHour: app.timeHour
        });
        const message = app._label('recovery.safePlaceSet', 'Home set: {label}.', { label: app.safeAnchor.label });
        app.log.push({ text: message, type: 'discovery' });
        app._addTileEvent(message, 'discovery');
        app.renderLog();
        app.showExplorationActions();
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'quests', 'activityLog'], 'safe-anchor');
        app.autoSave();
        return true;
    },

    markDefeat(app, outcome = 'defeat') {
        return this.resolve(app, { status: 'dead', terminal: true, outcome, cause: outcome, source: 'defeat-recovery' });
    },

    canTriggerDebugDeath(app) {
        const gameOrigin = app.screen === 'game'
            || app.settingsReturnScreen === 'game'
            || (Array.isArray(app.overlayReturnStack) && app.overlayReturnStack.includes('game'));
        return Boolean(gameOrigin
            && app.player
            && app.player.CPun > 0
            && !app.defeatState?.pending
            && app.defeatState?.status !== 'run-ended');
    },

    confirmDebugDeath(app) {
        if (!this.canTriggerDebugDeath(app)) {
            const message = app._label('cheat.playerDeathUnavailable', 'Start or load an active game before testing player death.');
            app.log.push({ text: message, type: 'discovery' });
            app.renderLog?.();
            return false;
        }
        const hardcore = Boolean(app.settings?.hardcore);
        return app.showConfirmDialog({
            title: app._label('cheat.playerDeathTitle', 'Test Player Death'),
            message: hardcore
                ? app._label('cheat.playerDeathConfirmHardcore', 'This will trigger real Hardcore death handling and permanently delete the active save slot. Continue?')
                : app._label('cheat.playerDeathConfirm', 'This will trigger real player death and recovery consequences, including the selected inventory policy. Continue?'),
            confirmLabel: app._label('cheat.playerDeathConfirmAction', 'Trigger Death'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            danger: true,
            onConfirm: () => this.triggerDebugDeath(app)
        });
    },

    triggerDebugDeath(app) {
        if (!this.canTriggerDebugDeath(app)) {
            const message = app._label('cheat.playerDeathUnavailable', 'Start or load an active game before testing player death.');
            app.log.push({ text: message, type: 'discovery' });
            app.renderLog?.();
            return false;
        }
        const wasCombat = Boolean(app.combatState?.active);
        if (app.screen !== 'game') app.returnToGame?.();
        const message = app._label('cheat.playerDeathTriggered', 'Player death test triggered.');
        app.log.push({ text: message, type: 'discovery' });
        app.player.CPun = 0;
        app.player.CPle = 0;
        app.player.knockedOut = true;
        const state = this.handlePlayerFall(app, {
            fatal: true,
            cause: 'debug-cheat',
            source: 'cheat-player-death',
            ignoreGodMode: true
        });
        if (wasCombat && state?.awaitingEncounterSettlement && app.combatState?.active) app.processTurn?.();
        if (!app.settings?.hardcore && !wasCombat) {
            app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'combat', 'quests', 'sceneFeed', 'activityLog'], 'debug-player-death');
            app.autoSave?.();
        }
        return state;
    },

    handlePlayerFall(app, input = {}) {
        if (!app.player) return null;
        if (app.cheats?.godMode && input.ignoreGodMode !== true) {
            app.player.CPun = Math.max(1, app.player.CPun || 0);
            app.player.knockedOut = false;
            app.defeatState = null;
            app.log?.push?.({
                text: app._label('combat.godModeSaved', 'God Mode keeps {name} standing.', {
                    name: app.player.name || app._label('party.you', 'You')
                }),
                type: 'combat'
            });
            return { status: 'active', terminal: false, rescued: true };
        }
        const livingAllies = (app.party || []).filter(unit => unit && unit !== app.player && unit.CPun > 0 && !unit.knockedOut && !unit.fledCombat);
        app.player.CPun = 0;
        app.player.CPle = 0;
        app.player.knockedOut = true;
        const fatal = input.nonterminal !== true && !input.captured;
        if (!fatal) {
            return this.resolve(app, {
                status: input.captured ? 'captured' : 'incapacitated',
                terminal: false,
                cause: input.cause,
                source: input.source || 'combat'
            });
        }
        const state = this.resolve(app, {
            status: 'dead',
            terminal: true,
            cause: input.cause,
            source: input.source || 'gameplay',
            outcome: 'defeat',
            awaitingEncounterSettlement: Boolean(app.combatState?.active && livingAllies.length > 0)
        });
        if (app.settings?.hardcore) {
            void this.finalizeHardcore(app, state);
        } else if (app.combatState?.active) {
            app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'combat', 'quests', 'sceneFeed', 'activityLog'], 'player-death-pending-settlement');
            if (livingAllies.length === 0) app.endCombat('defeat');
        } else {
            this.showDefeatRecovery(app);
        }
        return state;
    },

    async finalizeHardcore(app, state = app.defeatState) {
        const slotName = app._normalizeSaveSlotName?.(app.activeSlot, null);
        const pendingSave = app._autoSaveState?.running || null;
        app.defeatState = {
            ...this.migrateState(app, state),
            status: 'run-ended',
            pending: false,
            terminal: true,
            endedAt: Date.now()
        };
        app.cancelAutoSave?.({ suppress: true });
        if (pendingSave && typeof pendingSave.then === 'function') await pendingSave.catch(() => false);
        if (app.combatState) app.combatState.active = false;
        app._clearCombatRefreshSnapshot?.(slotName);
        if (slotName) await app._deleteSlotData?.(slotName, { showManager: false, resetActiveSlot: false });
        app.log.push({ text: app._label('combat.hardcoreSaveDeleted', 'HARDCORE MODE: Your save has been deleted.'), type: 'combat' });
        app.renderLog?.();
        app.showScreen('menu');
        return true;
    },

    shouldLoadAsDefeated(_app, loaded = null) {
        const state = loaded?.questState?.defeatState;
        const pending = state?.pending;
        const party = Array.isArray(loaded?.party) && loaded.party.length ? loaded.party : [];
        const livingAllies = party.filter((unit, index) => index > 0 && unit && unit.CPun > 0 && !unit.knockedOut && !unit.fledCombat);
        if (pending) {
            const mayResumeEncounter = Boolean(state.awaitingEncounterSettlement
                && !state.encounterSettled
                && loaded?.questState?.combatState?.active
                && livingAllies.length > 0);
            return !mayResumeEncounter;
        }
        const playerHp = Number.isFinite(loaded?.playerHp) ? loaded.playerHp : null;
        const playerDown = playerHp !== null && playerHp <= 0;
        const resumableCompanionBattle = Boolean(loaded?.questState?.combatState?.active && livingAllies.length > 0);
        return playerDown && !resumableCompanionBattle;
    },

    isWipedCombatSave(_app, loaded = null) {
        if (!loaded?.questState?.combatState?.active) return false;
        const party = Array.isArray(loaded.party) && loaded.party.length ? loaded.party : [];
        const pendingState = loaded.questState?.defeatState;
        if (pendingState?.pending) {
            const livingAllies = party.filter((unit, index) => index > 0 && unit && unit.CPun > 0 && !unit.knockedOut && !unit.fledCombat);
            if (pendingState.awaitingEncounterSettlement && !pendingState.encounterSettled && livingAllies.length > 0) return false;
            return true;
        }
        if (party.length === 0) return Number.isFinite(loaded.playerHp) && loaded.playerHp <= 0;
        return party.every(unit => !unit || unit.CPun <= 0 || unit.knockedOut);
    },

    sanitizeLoadedDefeat(app, loaded = null) {
        app.safeAnchor = this.normalizeAnchor(app, loaded?.questState?.safeAnchor || loaded?.questState?.defeatState?.safeAnchor || app.safeAnchor || this.startAnchor(app));
        if (this.shouldLoadAsDefeated(app, loaded)) {
            app.defeatState = loaded?.questState?.defeatState?.pending
                ? this.migrateState(app, loaded.questState.defeatState)
                : this.markDefeat(app, 'defeat');
            app.mode = app.GAME_MODE.NORMAL;
            app.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
            app.activeActor = null;
            app.targetSelection = null;
            app._clearTransientInteractionState();
            app._clearCombatRefreshSnapshot(app.activeSlot);
            const journeyMode = YAW_RECOVERY_MODES?.profile?.(app.defeatState?.recoveryModeKey);
            if (app.defeatState?.status === 'recovering'
                && app.defeatState?.recoveryPhase === 'journey'
                && journeyMode?.resolution === 'shrine') {
                app.party = app.player ? [app.player] : [];
                app.partyLeaderId = app.player ? (app._unitSelectionId?.(app.player) || app.player.id || app.player.name) : null;
                if (app.player) {
                    app.player.CPun = Math.max(1, Number(app.player.CPun) || 1);
                    app.player.knockedOut = false;
                    app.player.recoveryGhost = true;
                    app.player.recoveryModeKey = app.defeatState.recoveryModeKey;
                }
            } else if (app.defeatState?.status === 'recovering') {
                app.defeatState.status = 'dead';
                app.defeatState.recoveryPhase = 'prompt';
                app.defeatState.recoveryModeKey = 'core:regenerate';
                if (app.player) {
                    app.player.CPun = 0;
                    app.player.knockedOut = true;
                    delete app.player.recoveryGhost;
                    delete app.player.recoveryModeKey;
                }
            }
            return true;
        }
        app.defeatState = this.migrateState(app, loaded?.questState?.defeatState);
        return false;
    },

    showDefeatRecovery(app) {
        const state = app.defeatState?.pending ? app.defeatState : this.markDefeat(app, 'defeat');
        if (app.combatState?.active && state.awaitingEncounterSettlement && !state.encounterSettled) return false;
        const anchor = this.normalizeAnchor(app, state.safeAnchor || app.safeAnchor || this.startAnchor(app));
        const mode = YAW_RECOVERY_MODES?.forState?.(app, state);
        const title = app._label('recovery.defeatTitle', 'Defeat');
        const cause = String(state.cause || state.outcome || 'defeat').replace(/[-_]+/g, ' ');
        let message = app.settings?.inventoryRecovery === 'retain'
            ? app._label('recovery.defeatMessageRetain', 'You fell to {cause}. Regenerate alone at {label} with your inventory, or end this run for now.', { cause, label: anchor.label })
            : app._label('recovery.defeatMessageBag', 'You fell to {cause}. Regenerate alone at {label}; your ordinary pack and gold will remain in a recovery bag.', { cause, label: anchor.label });
        if (mode?.resolution === 'shrine') {
            message = app._label('recovery.defeatMessageGhost', 'You fell to {cause}. Rise as a harmless ghost at the defeat site and return to {label} to resurrect.', {
                cause,
                label: anchor.label
            });
        }
        app.updateScene(title, message, false);
        app.renderParty();
        app.renderCreatures();
        app.renderLog();
        app.renderMobileCombatToolbelt();
        this.renderRecoveryControls(app);
        return true;
    },

    companionId(app, unit) {
        return String(app._unitSelectionId?.(unit) || unit?.id || unit?.name || 'companion');
    },

    settleEncounter(app, outcome = 'defeat') {
        let state = this.migrateState(app, app.defeatState);
        if (!state?.terminal || !state.pending) return state;
        if (state.encounterSettled && state.companionsSettled) return state;
        const roster = Array.isArray(state.companionRoster) && state.companionRoster.length
            ? state.companionRoster
            : this.clone((app.party || []).filter(unit => unit && unit !== app.player), []);
        const partyById = new Map((app.party || []).filter(unit => unit && unit !== app.player).map(unit => [this.companionId(app, unit), unit]));
        const localById = new Map((app.creatures || []).filter(Boolean).map(unit => [this.companionId(app, unit), unit]));
        const existing = Array.isArray(app.strandedCompanions) ? app.strandedCompanions : [];
        const otherResolutions = existing.filter(entry => entry?.resolutionId !== state.resolutionId);
        const records = [];
        for (const snapshot of roster) {
            const id = this.companionId(app, snapshot);
            const live = partyById.get(id);
            const local = localById.get(id);
            const source = live || local || snapshot;
            let status = 'missing';
            if (live?.fledCombat) status = 'fled';
            else if (live && live.CPun > 0 && !live.knockedOut) status = 'stranded';
            else if (local && (app._isCorpse?.(local) || local.CPun <= 0)) status = 'dead';
            else if ((source?.CPun || 0) <= 0 || source?.knockedOut) status = 'dead';
            const record = {
                id,
                resolutionId: state.resolutionId,
                status,
                encounterOutcome: String(outcome || 'defeat'),
                location: { ...state.defeatedAt },
                unit: this.clone(source, {})
            };
            records.push(record);
            if ((status === 'stranded' || status === 'fled') && typeof YAW_PARTY_MANAGEMENT !== 'undefined') {
                YAW_PARTY_MANAGEMENT.placeDroppedOff(app, source, { strandedAfterDefeat: true });
            }
        }
        app.strandedCompanions = [...otherResolutions, ...records];
        state = {
            ...state,
            awaitingEncounterSettlement: false,
            encounterSettled: true,
            companionsSettled: true,
            encounterOutcome: String(outcome || 'defeat'),
            settledAt: Date.now()
        };
        app.defeatState = state;
        app._emitModuleHook?.('onDefeatEncounterSettled', {
            defeatState: this.clone(state),
            companions: this.clone(records, [])
        });
        return state;
    },

    recoveryControlsHtml(app) {
        const state = app.defeatState;
        const mode = YAW_RECOVERY_MODES?.forState?.(app, state);
        if (YAW_RECOVERY_MODES?.isJourney?.(app)) {
            const atShrine = this.isAtRecoveryShrine(app, state);
            const resurrect = app._escapeHtml(app._label('recovery.resurrect', 'Resurrect'));
            const journey = app._escapeHtml(app._label('recovery.ghostJourney', 'Return to {label} to resurrect.', {
                label: state?.shrineAnchor?.label || state?.safeAnchor?.label || app._label('recovery.safeAnchor', 'Safe Place')
            }));
            const primary = atShrine
                ? `<button class="action-btn primary" data-command-surface="defeat-recovery" data-command-mode="recovery" data-command-control="resurrect" onclick="App.resurrectFromRecovery()">${resurrect}</button>`
                : `<span class="action-variant-reason" role="status">${journey}</span>`;
            const endGame = app._escapeHtml(app._label('recovery.endGame', 'End Game'));
            return `${primary}<button class="action-btn danger" data-command-surface="defeat-recovery" data-command-mode="recovery" data-command-control="end-game" onclick="App.endDefeatedRun()">${endGame}</button>`;
        }
        const regenerate = app._escapeHtml(mode?.resolution === 'shrine'
            ? app._label('recovery.riseGhost', 'Rise as Ghost')
            : (mode?.key === 'core:regenerate'
                ? app._label('recovery.regenerate', 'Regenerate')
                : (mode ? YAW_RECOVERY_MODES.label(app, mode) : app._label('recovery.regenerate', 'Regenerate'))));
        const endGame = app._escapeHtml(app._label('recovery.endGame', 'End Game'));
        return `<button class="action-btn primary" data-command-surface="defeat-recovery" data-command-mode="recovery" data-command-control="regenerate" onclick="App.beginDefeatRecovery()">${regenerate}</button><button class="action-btn danger" data-command-surface="defeat-recovery" data-command-mode="recovery" data-command-control="end-game" onclick="App.endDefeatedRun()">${endGame}</button>`;
    },

    renderRecoveryControls(app) {
        const html = this.recoveryControlsHtml(app);
        const selectionSentence = document.getElementById('selection-sentence');
        if (selectionSentence) selectionSentence.innerHTML = '';
        const desktopBelt = document.getElementById('desktop-context-belt');
        if (desktopBelt) {
            desktopBelt.innerHTML = html;
            desktopBelt.setAttribute('data-command-surface', 'defeat-recovery');
            desktopBelt.setAttribute('data-command-mode', 'recovery');
        }
        if (typeof YAW_SCENE_SHELL !== 'undefined') YAW_SCENE_SHELL.syncDesktopCommandComposer?.();
        const mobileExplore = document.getElementById('mobile-explore-actions');
        if (mobileExplore) {
            mobileExplore.innerHTML = html;
            mobileExplore.setAttribute('data-command-surface', 'defeat-recovery');
            mobileExplore.setAttribute('data-command-mode', 'recovery');
            mobileExplore.style.display = 'flex';
        }
        const mobileTargetTray = document.getElementById('mobile-target-action-tray');
        if (mobileTargetTray) mobileTargetTray.innerHTML = '';
        const mobileActorBelt = document.getElementById('mobile-actor-belt');
        if (mobileActorBelt) mobileActorBelt.innerHTML = '';
        document.getElementById('mobile-control-row')?.classList?.remove('has-visible-controls');
        const mobileCreatureCue = document.getElementById('mobile-creature-presence-cue');
        if (mobileCreatureCue) mobileCreatureCue.innerHTML = '';
        const mobileMovePad = document.getElementById('mobile-move-pad');
        if (mobileMovePad) mobileMovePad.classList?.remove('expanded');
        const mobileActorToggle = document.getElementById('mobile-actor-toggle');
        if (mobileActorToggle) {
            mobileActorToggle.hidden = true;
            mobileActorToggle.style.display = 'none';
            mobileActorToggle.setAttribute('aria-expanded', 'false');
            mobileActorToggle.classList?.remove('selected');
        }
        const mobileControlBelt = document.getElementById('mobile-control-belt');
        if (mobileControlBelt) {
            mobileControlBelt.classList?.add('has-controls');
            mobileControlBelt.classList?.remove('target-controls-open', 'expanded-controls-open');
            mobileControlBelt.hidden = false;
            mobileControlBelt.setAttribute('aria-hidden', 'false');
        }
        const surface = document.getElementById('mobile-play-surface');
        surface?.classList?.add('has-control-belt');
        surface?.classList?.remove('control-belt-expanded', 'target-controls-open', 'actor-controls-open');
        app.mobileMovePadOpen = false;
        app.mobileActorBeltOpen = false;
    },

    beginSelectedRecovery(app) {
        const state = this.migrateState(app, app.defeatState) || this.markDefeat(app, 'defeat');
        const mode = YAW_RECOVERY_MODES?.forState?.(app, state);
        if (!mode || mode.resolution === 'immediate') return this.regenerate(app);
        return this.beginRecoveryJourney(app, state, mode);
    },

    beginRecoveryJourney(app, state = app.defeatState, mode = YAW_RECOVERY_MODES?.forState?.(app, state)) {
        state = this.migrateState(app, state);
        if (!state?.pending || !mode || mode.resolution !== 'shrine') return false;
        if (!state.companionsSettled) state = this.settleEncounter(app, state.encounterOutcome || 'noncombat');
        state.recoveryModeKey = mode.key;
        state.recoveryPhase = 'journey';
        state.status = 'recovering';
        state.pending = true;
        state.terminal = true;
        state.shrineAnchor = this.validateRecoveryAnchor(app, state.safeAnchor || app.safeAnchor || this.startAnchor(app));
        app.defeatState = state;
        this.applyRegularConsequences(app, state, mode);
        app._clearTransientInteractionState();
        app._clearCombatRefreshSnapshot(app.activeSlot);
        app.mode = app.GAME_MODE.NORMAL;
        app.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
        app.activeActor = null;
        app.targetSelection = null;
        app.inInterior = false;
        app.activeInterior = null;
        app.interiorLocation = { x: 0, y: 0 };
        const origin = mode.entry === 'safe-anchor' ? state.shrineAnchor : state.defeatedAt;
        app.location = { x: Number(origin?.x) || 0, y: Number(origin?.y) || 0 };
        const tile = app.getTile(app.location.x, app.location.y);
        app.currentBiome = tile?.biome || app.currentBiome || 'forest';
        app.creatures = app._tileCreatures(tile?.creatures || []);
        app.party = app.player ? [app.player] : [];
        app.partyLeaderId = app.player ? (app._unitSelectionId?.(app.player) || app.player.id || app.player.name) : null;
        if (app.player) {
            app.player.CPun = Math.max(1, Math.ceil((Math.max(1, Number(app.player.MPun) || 1) * mode.vitalityPercent) / 100));
            app.player.knockedOut = false;
            app.player.fledCombat = false;
            app.player.recoveryGhost = true;
            app.player.recoveryModeKey = mode.key;
        }
        app._autoSaveSuppressed = false;
        const message = app._label('recovery.ghostRises', 'You rise as a ghost. Return to {label}; ordinary combat, inventory use, and creature interactions are unavailable until resurrection.', {
            label: state.shrineAnchor.label
        });
        app.log.push({ text: message, type: 'discovery' });
        app._addTileEvent?.(message, 'discovery');
        app.showScreen('game');
        app.updateScene(app._label('recovery.ghostTitle', 'Ghost Journey'), message, false);
        app.renderMap();
        app.renderParty();
        app.renderCreatures();
        app.renderLog();
        app.showExplorationActions();
        this.renderRecoveryControls(app);
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'combat', 'quests', 'sceneFeed', 'activityLog'], 'begin-recovery-journey');
        app.autoSave?.();
        return true;
    },

    isAtRecoveryShrine(app, state = app.defeatState) {
        const anchor = state?.shrineAnchor || state?.safeAnchor;
        return Boolean(anchor
            && !app.inInterior
            && Number(app.location?.x) === Number(anchor.x)
            && Number(app.location?.y) === Number(anchor.y));
    },

    showRecoveryJourney(app) {
        if (!YAW_RECOVERY_MODES?.isJourney?.(app)) return false;
        const state = app.defeatState;
        const atShrine = this.isAtRecoveryShrine(app, state);
        const message = atShrine
            ? app._label('recovery.shrineReached', 'You reach {label}. You may resurrect now.', { label: state.shrineAnchor.label })
            : app._label('recovery.ghostJourney', 'Return to {label} to resurrect.', { label: state.shrineAnchor.label });
        app.updateScene(app._label('recovery.ghostTitle', 'Ghost Journey'), message, false);
        this.renderRecoveryControls(app);
        return true;
    },

    resurrectFromJourney(app) {
        if (!YAW_RECOVERY_MODES?.isJourney?.(app) || !this.isAtRecoveryShrine(app)) return false;
        return this.regenerate(app, { fromJourney: true });
    },

    fallbackFromUnavailableMode(app) {
        if (!app.defeatState?.pending) return false;
        if (app.player) {
            delete app.player.recoveryGhost;
            delete app.player.recoveryModeKey;
            app.player.CPun = 0;
            app.player.knockedOut = true;
        }
        return this.showDefeatRecovery(app);
    },

    regenerate(app, options = {}) {
        const state = this.migrateState(app, app.defeatState) || this.markDefeat(app, 'defeat');
        const anchor = this.validateRecoveryAnchor(app, state.safeAnchor || app.safeAnchor || this.startAnchor(app));
        const mode = YAW_RECOVERY_MODES?.forState?.(app, state);
        this.applyRegularConsequences(app, state, mode);
        app._clearTransientInteractionState();
        app._clearCombatRefreshSnapshot(app.activeSlot);
        app.mode = app.GAME_MODE.NORMAL;
        app.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
        app.activeActor = null;
        app.targetSelection = null;
        app.inInterior = false;
        app.activeInterior = null;
        app.interiorLocation = { x: 0, y: 0 };
        app.location = { x: anchor.x, y: anchor.y };
        app.currentBiome = app.getTile(anchor.x, anchor.y)?.biome || app.currentBiome || 'forest';
        app.creatures = app._tileCreatures(app.getTile(anchor.x, anchor.y)?.creatures || []);
        app.party = app.player ? [app.player] : [];
        app.partyLeaderId = app.player ? (app._unitSelectionId?.(app.player) || app.player.id || app.player.name) : null;
        const recoveringParty = [app.player].filter(Boolean);
        YAW_COMBAT_STATUS.clearCombatOnlyStatuses(recoveringParty);
        YAW_COMBAT_STATUS.curePersistentAilments(recoveringParty);
        if (app.player) {
            const vitalityPercent = Math.max(1, Math.min(100, Number(mode?.vitalityPercent) || 1));
            app.player.CPun = Math.max(1, Math.ceil((Math.max(1, Number(app.player.MPun) || 1) * vitalityPercent) / 100));
            app.player.knockedOut = false;
            app.player.fledCombat = false;
            delete app.player.recoveryGhost;
            delete app.player.recoveryModeKey;
        }
        app.defeatState = null;
        app._autoSaveSuppressed = false;
        app.safeAnchor = this.normalizeAnchor(app, app.safeAnchor || anchor);
        const message = app._label('recovery.regeneratedAt', 'Regenerated at {label}.', { label: anchor.label });
        app.log.push({ text: message, type: 'discovery' });
        app._addTileEvent(message, 'discovery');
        app._emitModuleHook('onRegenerate', {
            safeAnchor: anchor,
            location: { ...app.location },
            party: app.party
        });
        app.showScreen('game');
        app.renderMap();
        app.renderParty();
        app.renderCreatures();
        app.renderLog();
        const encounter = app._ensureCurrentHostileEncounter?.({ source: options.fromJourney ? 'ghost-resurrection' : 'regeneration', announce: true });
        if (!app.combatState?.active && (!encounter || encounter.reason === 'no-hostiles')) app.showExplorationActions();
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'combat', 'quests', 'sceneFeed', 'activityLog'], 'regenerate');
        app.autoSave();
        return true;
    },

    isProtectedItem(app, item) {
        return Boolean(item && typeof item === 'object' && (item.bound || item.quest || item.questItem || item.protectedOnDefeat || app._isQuestProtectedItem?.(item)));
    },

    isUnsafeDropTile(tile) {
        const biome = String(tile?.biome || tile?.baseBiome || '').toLowerCase();
        return !tile || ['water', 'ocean', 'deep-water', 'void'].includes(biome) || tile.passable === false || tile.traversal?.passable === false;
    },

    interiorForDefeatLocation(app, location = null) {
        if (!location?.interior) return null;
        const sameActiveInterior = app.activeInterior?.origin
            && Number(app.activeInterior.origin.x) === Number(location.x)
            && Number(app.activeInterior.origin.y) === Number(location.y);
        if (sameActiveInterior) return app.activeInterior;
        return app.getTile(location.x, location.y)?.interior || null;
    },

    persistDeathBagTile(app, tile, location = null) {
        if (!tile) return null;
        const interior = this.interiorForDefeatLocation(app, location);
        if (interior?.origin) {
            const origin = app.getTile(interior.origin.x, interior.origin.y);
            origin.interior = interior;
            return app.persistTileDelta(origin.x, origin.y, origin, { reason: 'death-bag' });
        }
        return app.persistTileDelta(tile.x, tile.y, tile, { reason: 'death-bag' });
    },

    deathBagTile(app, location = this.defeatLocation(app)) {
        const interior = this.interiorForDefeatLocation(app, location);
        if (interior?.tiles) {
            const exactKey = `${Number(location.interiorX) || 0},${Number(location.interiorY) || 0}`;
            if (interior.tiles[exactKey]) return interior.tiles[exactKey];
            const fallbackKey = interior.entryRooms?.default || Object.values(interior.entryRooms || {})[0] || '0,0';
            if (interior.tiles[fallbackKey]) return interior.tiles[fallbackKey];
            const firstRoom = Object.values(interior.tiles)[0];
            if (firstRoom) return firstRoom;
        }
        const offsets = [[0, 0]];
        for (let radius = 1; radius <= 4; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dy = radius - Math.abs(dx);
                offsets.push([dx, dy]);
                if (dy) offsets.push([dx, -dy]);
            }
        }
        for (const [dx, dy] of offsets) {
            const tile = app.getTile(location.x + dx, location.y + dy);
            if (!this.isUnsafeDropTile(tile)) return tile;
        }
        const anchor = this.validateRecoveryAnchor(app, app.safeAnchor || this.startAnchor(app));
        return app.getTile(anchor.x, anchor.y);
    },

    applyRegularConsequences(app, state = app.defeatState, mode = YAW_RECOVERY_MODES?.forState?.(app, state)) {
        state = this.migrateState(app, state);
        if (!state || state.consequencesApplied) return state;
        if (!state.companionsSettled) state = this.settleEncounter(app, state.encounterOutcome || 'noncombat');
        const inventoryPolicy = mode?.inventory && mode.inventory !== 'settings'
            ? mode.inventory
            : app.settings?.inventoryRecovery;
        if (inventoryPolicy !== 'retain') {
            const dropped = (app.inventory || []).filter(item => !this.isProtectedItem(app, item));
            const retained = (app.inventory || []).filter(item => this.isProtectedItem(app, item));
            const gold = Math.max(0, Number(app.player?.gold) || 0);
            if (dropped.length || gold > 0) {
                const tile = this.deathBagTile(app, state.defeatedAt);
                tile.deathBags = Array.isArray(tile.deathBags) ? tile.deathBags : [];
                if (!tile.deathBags.some(bag => bag.resolutionId === state.resolutionId)) {
                    tile.deathBags.push({
                        id: `death-bag-${state.resolutionId}`,
                        resolutionId: state.resolutionId,
                        ownerId: String(app.player?.id || app.player?.name || 'player'),
                        items: this.clone(dropped, []),
                        gold,
                        createdAt: Date.now(),
                        cause: state.cause,
                        sourceLocation: { ...state.defeatedAt }
                    });
                    this.persistDeathBagTile(app, tile, state.defeatedAt);
                }
                app.inventory = retained;
                if (app.player) app.player.gold = 0;
            }
        }
        state.consequencesApplied = true;
        app.defeatState = state;
        return state;
    },

    collectDeathBag(app, bagId) {
        const tile = app._currentExplorationTile?.() || app.getTile(app.location.x, app.location.y);
        const bags = Array.isArray(tile?.deathBags) ? tile.deathBags : [];
        const index = bags.findIndex(bag => String(bag.id) === String(bagId));
        if (index < 0) return false;
        const bag = bags[index];
        const taken = [];
        const remaining = [];
        for (const source of this.clone(bag.items || [], [])) {
            const item = app._normalizeItemInstance(source);
            const itemRef = item.definitionId || item.name;
            const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
            if (!app._canAddInventoryItem(itemRef, quantity)) {
                remaining.push(source);
                continue;
            }
            app._addInventoryItem(itemRef, item);
            taken.push(item);
        }
        bag.items = remaining;
        const gold = Math.max(0, Number(bag.gold) || 0);
        if (app.player) app.player.gold = (Number(app.player.gold) || 0) + gold;
        bag.gold = 0;
        if ((bag.items || []).length === 0) bags.splice(index, 1);
        if (typeof app._persistCurrentExplorationTile === 'function') app._persistCurrentExplorationTile(tile);
        else app.persistTileDelta(tile.x, tile.y, tile, { reason: 'collect-death-bag' });
        const takenQuantity = taken.reduce((sum, item) => sum + Math.max(1, Math.floor(Number(item.quantity) || 1)), 0);
        const text = app._label('recovery.deathBagCollected', 'Recovered {items} item(s) and {gold} gold.', { items: takenQuantity, gold });
        app.log.push({ text, type: 'loot' });
        app._addTileEvent?.(text, 'loot');
        app.renderLog?.();
        app.renderExplorationActions?.();
        app.markAutoSaveDirty?.(['manifest', 'player', 'inventory', 'currentTile', 'worldTiles', 'activityLog'], 'collect-death-bag');
        app.autoSave?.();
        return true;
    },

    validateRecoveryAnchor(app, anchor = null) {
        const normalized = this.normalizeAnchor(app, anchor || app.safeAnchor || this.startAnchor(app));
        const start = this.startAnchor(app);
        const candidates = [normalized, start];
        for (let radius = 1; radius <= 4; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dy = radius - Math.abs(dx);
                candidates.push({ ...start, x: start.x + dx, y: start.y + dy });
                if (dy) candidates.push({ ...start, x: start.x + dx, y: start.y - dy });
            }
        }
        const seen = new Set();
        for (const candidate of candidates) {
            const key = `${candidate.x},${candidate.y}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const tile = app.getTile(candidate.x, candidate.y);
            const creatures = app._tileCreatures(tile?.creatures || []);
            if (!tile || tile.traversal?.passable === false || this.hasLivingHostile(app, creatures)) continue;
            return this.normalizeAnchor(app, candidate);
        }
        return start;
    },

    endDefeatedRun(app) {
        app._clearTransientInteractionState();
        app.showScreen('menu');
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_DEFEAT_RECOVERY = YAW_DEFEAT_RECOVERY;
}
