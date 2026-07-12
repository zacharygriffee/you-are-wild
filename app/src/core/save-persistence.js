/**
 * YOU ARE WILD SAVE PERSISTENCE
 * Shared save snapshot, world-store, slot metadata, and save-hook writes.
 */

const YAW_SAVE_PERSISTENCE = {
    autoSaveState(app) {
        if (!app._autoSaveState) {
            app._autoSaveState = {
                dirty: false,
                saving: false,
                timer: null,
                running: null
            };
        }
        return app._autoSaveState;
    },

    autoSaveDelay(app, options = {}) {
        if (Number.isFinite(options.delayMs)) return Math.max(0, options.delayMs);
        if (Number.isFinite(app.AUTO_SAVE_DEBOUNCE_MS)) return Math.max(0, app.AUTO_SAVE_DEBOUNCE_MS);
        return 900;
    },

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
        const saveData = Binary.saveGame(app, { omitWorldMap: worldStoreSaved && options.auto === true });
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

    async runAutoSave(app) {
        if (!app.player || app.screen !== 'game') return false;
        const state = this.autoSaveState(app);
        if (state.saving) {
            state.dirty = true;
            return state.running || false;
        }
        state.dirty = false;
        state.saving = true;
        state.running = (async () => {
            try {
                const result = await this.writeSlot(app, app.activeSlot, { auto: true });
                console.log('Auto-saved to', result.slotName);
                return true;
            } catch (e) {
                console.error('Auto-save failed:', e);
                return false;
            } finally {
                state.saving = false;
                state.running = null;
                if (state.dirty && app.player && app.screen === 'game') this.autoSave(app, { delayMs: 0 });
            }
        })();
        return state.running;
    },

    async flushAutoSave(app) {
        const state = this.autoSaveState(app);
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        state.dirty = true;
        return this.runAutoSave(app);
    },

    async autoSave(app) {
        const options = arguments[1] || {};
        if (options.immediate === true) return this.flushAutoSave(app);
        if (!app.player || app.screen !== 'game') return false;
        const state = this.autoSaveState(app);
        state.dirty = true;
        if (state.timer) clearTimeout(state.timer);
        const delay = this.autoSaveDelay(app, options);
        state.timer = setTimeout(() => {
            state.timer = null;
            this.runAutoSave(app);
        }, delay);
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SAVE_PERSISTENCE = YAW_SAVE_PERSISTENCE;
}
