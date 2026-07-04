/**
 * YOU ARE WILD SAVE PERSISTENCE
 * Shared save snapshot, world-store, slot metadata, and save-hook writes.
 */

const YAW_SAVE_PERSISTENCE = {
    async writeSlot(app, slotName, options = {}) {
        slotName = app._normalizeSaveSlotName(slotName);
        app._prepareSaveSnapshot();
        let worldStoreSaved = false;
        try {
            await app.persistWorldStateToMapStore();
            worldStoreSaved = true;
        } catch (e) {
            console.warn('World map persistence failed', e);
        }
        const saveData = Binary.saveGame(app, { omitWorldMap: worldStoreSaved });
        await app._dbPut('saves', slotName, saveData);
        app.activeSlot = slotName;
        const savedAt = Date.now().toString();
        app._setStoredValue('lastSlot', slotName);
        app._setStoredValue('lastSaveTime', savedAt);
        app._setSaveTime(slotName, savedAt);
        if (app.combatState?.active) app._writeCombatRefreshSnapshot(slotName);
        else app._clearCombatRefreshSnapshot(slotName);
        app._emitModuleHook('onGameSave', {
            slotName,
            auto: Boolean(options.auto),
            worldStoreSaved,
            combatActive: Boolean(app.combatState?.active)
        });
        return { slotName, saveData, savedAt, worldStoreSaved };
    },

    async autoSave(app) {
        if (!app.player || app.screen !== 'game') return false;
        try {
            const result = await this.writeSlot(app, app.activeSlot, { auto: true });
            console.log('Auto-saved to', result.slotName);
            return true;
        } catch (e) {
            console.error('Auto-save failed:', e);
            return false;
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SAVE_PERSISTENCE = YAW_SAVE_PERSISTENCE;
}
