/**
 * YOU ARE WILD COMBAT SAVE STATE
 * Combat refresh snapshots and loaded-combat resume behavior.
 */

const YAW_COMBAT_SAVE_STATE = {
    writeRefreshSnapshot(app, slotName = app.activeSlot) {
        slotName = app._normalizeSaveSlotName(slotName);
        if (!app.combatState?.active || !app.player || typeof Binary === 'undefined') return false;
        try {
            app._prepareSaveSnapshot();
            const saveData = Binary.saveGame(app, { omitWorldMap: false });
            return YAW_STORAGE.writeCombatRefreshSnapshot(app, saveData, slotName);
        } catch (e) {
            console.warn('Combat refresh snapshot failed', e);
            return false;
        }
    },

    readRefreshSnapshot(app, slotName = app.activeSlot) {
        slotName = app._normalizeSaveSlotName(slotName);
        if (typeof Binary === 'undefined') return null;
        try {
            const snapshot = YAW_STORAGE.readCombatRefreshSnapshot(app, slotName);
            if (!snapshot) return null;
            const loaded = Binary.loadGame(snapshot.saveData);
            if (!loaded?.questState?.combatState?.active) {
                app._clearCombatRefreshSnapshot(slotName);
                return null;
            }
            return snapshot;
        } catch (e) {
            console.warn('Combat refresh snapshot load failed', e);
            app._clearCombatRefreshSnapshot(slotName);
            return null;
        }
    },

    clearRefreshSnapshot(app, slotName = app.activeSlot) {
        slotName = app._normalizeSaveSlotName(slotName);
        try { YAW_STORAGE.clearCombatRefreshSnapshot(app, slotName); } catch (e) {}
    },

    resumeLoadedCombat(app) {
        if (!app.combatState?.active) return false;
        app._clearTransientInteractionState();
        const entry = app.combatState.turnQueue?.[app.combatState.currentTurn];
        const unit = entry?.unit;
        if (!unit || unit.CPun <= 0 || unit.knockedOut || unit.fledCombat) {
            app.processTurn();
            return true;
        }
        app.activeActor = unit;
        const isPartyTurn = unit === app.player || app.party.includes(unit);
        app.renderCombatSceneForTurn(unit);
        app.renderParty();
        app.renderCreatures();
        app.renderMobileCombatToolbelt();
        if (isPartyTurn) {
            app.showActorActions(unit);
        } else {
            app.processTurn();
            app.autoSave();
        }
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_SAVE_STATE = YAW_COMBAT_SAVE_STATE;
}
