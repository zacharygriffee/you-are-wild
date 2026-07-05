/**
 * YOU ARE WILD DEFEAT RECOVERY
 * Explicit defeat, recovery, and safe-place helpers.
 */

const YAW_DEFEAT_RECOVERY = {
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
        app.autoSave();
        return true;
    },

    markDefeat(app, outcome = 'defeat') {
        const anchor = this.ensureSafeAnchor(app);
        app.defeatState = {
            pending: true,
            outcome,
            defeatedAt: {
                x: app.location?.x || 0,
                y: app.location?.y || 0,
                interior: Boolean(app.inInterior),
                interiorX: app.interiorLocation?.x || 0,
                interiorY: app.interiorLocation?.y || 0
            },
            safeAnchor: { ...anchor },
            loggedAt: Date.now()
        };
        app._emitModuleHook('onDefeat', {
            defeatState: app.defeatState,
            safeAnchor: anchor,
            location: { ...app.location },
            party: app.party,
            enemies: (app.creatures || []).filter(c => c.disposition === app.DISPOSITION.ENEMY)
        });
        return app.defeatState;
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
                ? { ...loaded.questState.defeatState, pending: true, safeAnchor: this.normalizeAnchor(app, loaded.questState.defeatState.safeAnchor || app.safeAnchor) }
                : this.markDefeat(app, 'defeat');
            app.mode = app.GAME_MODE.NORMAL;
            app.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
            app.activeActor = null;
            app.targetSelection = null;
            app._clearTransientInteractionState();
            app._clearCombatRefreshSnapshot(app.activeSlot);
            return true;
        }
        app.defeatState = loaded?.questState?.defeatState || null;
        return false;
    },

    showDefeatRecovery(app) {
        const state = app.defeatState?.pending ? app.defeatState : this.markDefeat(app, 'defeat');
        const anchor = this.normalizeAnchor(app, state.safeAnchor || app.safeAnchor || this.startAnchor(app));
        const title = app._label('recovery.defeatTitle', 'Defeat');
        const message = app._label('recovery.defeatMessage', 'Your party has fallen. Regenerate at {label}, or end this run for now.', { label: anchor.label });
        const regenerate = app._label('recovery.regenerate', 'Regenerate');
        const endGame = app._label('recovery.endGame', 'End Game');
        const html = `
            <div class="scene-detail-panel">
                <p>${app._escapeHtml(message)}</p>
                <div class="scene-actions center-tile-actions" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                    <button class="action-btn primary" onclick="App.regenerateFromDefeat()">${app._escapeHtml(regenerate)}</button>
                    <button class="action-btn danger" onclick="App.endDefeatedRun()">${app._escapeHtml(endGame)}</button>
                </div>
            </div>`;
        app._setRichSceneContent(title, html);
        app.renderParty();
        app.renderCreatures();
        app.renderLog();
        app.renderMobileCombatToolbelt();
    },

    regenerate(app) {
        const anchor = this.validateRecoveryAnchor(app, app.defeatState?.safeAnchor || app.safeAnchor || this.startAnchor(app));
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
        for (const unit of app.party || []) {
            unit.CPun = Math.max(1, unit.CPun || 0);
            unit.knockedOut = false;
            unit.fledCombat = false;
        }
        if (app.player) {
            app.player.CPun = Math.max(1, app.player.CPun || 0);
            app.player.knockedOut = false;
            app.player.fledCombat = false;
        }
        app.defeatState = null;
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
        app.autoSave();
        return true;
    },

    validateRecoveryAnchor(app, anchor = null) {
        const normalized = this.normalizeAnchor(app, anchor || app.safeAnchor || this.startAnchor(app));
        const tile = app.getTile(normalized.x, normalized.y);
        const creatures = app._tileCreatures(tile?.creatures || []);
        if (!tile || this.hasLivingHostile(app, creatures)) return this.startAnchor(app);
        return normalized;
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
