/**
 * YOU ARE WILD DEFEAT RECOVERY
 * Explicit defeat, recovery, and safe-place helpers.
 */

const YAW_DEFEAT_RECOVERY = {
    SCHEMA_VERSION: 2,
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
        if (state.schemaVersion === this.SCHEMA_VERSION) {
            return {
                ...state,
                pending: Boolean(state.pending),
                terminal: Boolean(state.terminal),
                status: this.PLAYER_STATES.includes(state.status) ? state.status : (state.pending ? 'dead' : 'active'),
                cause: this.normalizeCause(state.cause || state.outcome),
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
            defeatedAt: { ...this.defeatLocation(app), ...(input.defeatedAt || {}) },
            safeAnchor: { ...this.ensureSafeAnchor(app) },
            loggedAt: now,
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

    handlePlayerFall(app, input = {}) {
        if (!app.player) return null;
        if (app.cheats?.godMode) {
            app.player.CPun = Math.max(1, app.player.CPun || 0);
            app.player.knockedOut = false;
            app.defeatState = null;
            return { status: 'active', terminal: false, rescued: true };
        }
        const livingAllies = (app.party || []).filter(unit => unit && unit !== app.player && unit.CPun > 0 && !unit.knockedOut && !unit.fledCombat);
        const fatal = Boolean(input.fatal || app.settings?.hardcore || livingAllies.length === 0);
        if (!fatal) {
            app.player.CPun = 0;
            app.player.CPle = 0;
            app.player.knockedOut = true;
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
            outcome: 'defeat'
        });
        if (app.settings?.hardcore) {
            void this.finalizeHardcore(app, state);
        } else if (app.combatState?.active && input.endCombat !== false) {
            app.endCombat('defeat');
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
        const pending = loaded?.questState?.defeatState?.pending;
        if (pending) return true;
        const party = Array.isArray(loaded?.party) && loaded.party.length ? loaded.party : [];
        const playerHp = Number.isFinite(loaded?.playerHp) ? loaded.playerHp : null;
        const playerDown = playerHp !== null && playerHp <= 0;
        const livingParty = party.filter(unit => unit && unit.CPun > 0 && !unit.knockedOut);
        return playerDown && livingParty.length === 0;
    },

    isWipedCombatSave(_app, loaded = null) {
        if (!loaded?.questState?.combatState?.active) return false;
        if (loaded.questState?.defeatState?.pending) return true;
        const party = Array.isArray(loaded.party) && loaded.party.length ? loaded.party : [];
        if (party.length === 0) return Number.isFinite(loaded.playerHp) && loaded.playerHp <= 0;
        return party.every(unit => !unit || unit.CPun <= 0 || unit.knockedOut || unit.fledCombat);
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
            return true;
        }
        app.defeatState = this.migrateState(app, loaded?.questState?.defeatState);
        return false;
    },

    showDefeatRecovery(app) {
        const state = app.defeatState?.pending ? app.defeatState : this.markDefeat(app, 'defeat');
        const anchor = this.normalizeAnchor(app, state.safeAnchor || app.safeAnchor || this.startAnchor(app));
        const title = app._label('recovery.defeatTitle', 'Defeat');
        const cause = String(state.cause || state.outcome || 'defeat').replace(/[-_]+/g, ' ');
        const message = app.settings?.inventoryRecovery === 'retain'
            ? app._label('recovery.defeatMessageRetain', 'You fell to {cause}. Regenerate alone at {label} with your inventory, or end this run for now.', { cause, label: anchor.label })
            : app._label('recovery.defeatMessageBag', 'You fell to {cause}. Regenerate alone at {label}; your ordinary pack and gold will remain in a recovery bag.', { cause, label: anchor.label });
        app.updateScene(title, message, false);
        app.renderParty();
        app.renderCreatures();
        app.renderLog();
        app.renderMobileCombatToolbelt();
        this.renderRecoveryControls(app);
    },

    recoveryControlsHtml(app) {
        const regenerate = app._escapeHtml(app._label('recovery.regenerate', 'Regenerate'));
        const endGame = app._escapeHtml(app._label('recovery.endGame', 'End Game'));
        return `<button class="action-btn primary" data-command-surface="defeat-recovery" data-command-mode="recovery" data-command-control="regenerate" onclick="App.regenerateFromDefeat()">${regenerate}</button><button class="action-btn danger" data-command-surface="defeat-recovery" data-command-mode="recovery" data-command-control="end-game" onclick="App.endDefeatedRun()">${endGame}</button>`;
    },

    renderRecoveryControls(app) {
        const html = this.recoveryControlsHtml(app);
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

    regenerate(app) {
        const state = this.migrateState(app, app.defeatState) || this.markDefeat(app, 'defeat');
        const anchor = this.validateRecoveryAnchor(app, state.safeAnchor || app.safeAnchor || this.startAnchor(app));
        this.applyRegularConsequences(app, state);
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
            app.player.CPun = Math.max(1, app.player.CPun || 0);
            app.player.knockedOut = false;
            app.player.fledCombat = false;
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
        app.showExplorationActions();
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'combat', 'quests', 'sceneFeed', 'activityLog'], 'regenerate');
        app.autoSave();
        return true;
    },

    isProtectedItem(item) {
        return Boolean(item && typeof item === 'object' && (item.bound || item.quest || item.questItem || item.protectedOnDefeat));
    },

    isUnsafeDropTile(tile) {
        const biome = String(tile?.biome || tile?.baseBiome || '').toLowerCase();
        return !tile || ['water', 'ocean', 'deep-water', 'void'].includes(biome) || tile.passable === false || tile.traversal?.passable === false;
    },

    deathBagTile(app, location = this.defeatLocation(app)) {
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

    applyRegularConsequences(app, state = app.defeatState) {
        state = this.migrateState(app, state);
        if (!state || state.consequencesApplied) return state;
        const companions = (app.party || []).filter(unit => unit && unit !== app.player);
        const existing = new Set((app.strandedCompanions || []).map(entry => `${entry.resolutionId}:${entry.id}`));
        app.strandedCompanions = Array.isArray(app.strandedCompanions) ? app.strandedCompanions : [];
        for (const unit of companions) {
            const id = String(app._unitSelectionId?.(unit) || unit.id || unit.name || 'companion');
            const key = `${state.resolutionId}:${id}`;
            if (existing.has(key)) continue;
            app.strandedCompanions.push({
                id,
                resolutionId: state.resolutionId,
                status: unit.CPun > 0 ? 'stranded' : 'dead',
                location: { ...state.defeatedAt },
                unit: this.clone(unit, {})
            });
        }
        if (app.settings?.inventoryRecovery !== 'retain') {
            const dropped = (app.inventory || []).filter(item => !this.isProtectedItem(item));
            const retained = (app.inventory || []).filter(item => this.isProtectedItem(item));
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
                    app.persistTileDelta(tile.x, tile.y, tile, { reason: 'death-bag' });
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
        const space = Math.max(0, app.MAX_INVENTORY - (app.inventory || []).length);
        const taken = (bag.items || []).splice(0, space);
        app.inventory.push(...this.clone(taken, []));
        const gold = Math.max(0, Number(bag.gold) || 0);
        if (app.player) app.player.gold = (Number(app.player.gold) || 0) + gold;
        bag.gold = 0;
        if ((bag.items || []).length === 0) bags.splice(index, 1);
        app.persistTileDelta(tile.x, tile.y, tile, { reason: 'collect-death-bag' });
        const text = app._label('recovery.deathBagCollected', 'Recovered {items} item(s) and {gold} gold.', { items: taken.length, gold });
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
