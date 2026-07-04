/**
 * YOU ARE WILD SAVE SLOT FLOW
 * Save-slot mode selection, overwrite confirmation, and scoped slot deletion.
 */

const YAW_SAVE_SLOT_FLOW = {
    showNewGameManager(app) {
        return this.showManager(app, 'new');
    },

    showManager(app, mode = 'load') {
        const safeMode = ['load', 'save', 'new'].includes(mode) ? mode : 'load';
        app.saveManagerMode = safeMode;
        app.saveManagerStatus = null;
        app.showScreen('save-manager');
        app.renderSaveManager(safeMode);
    },

    slotDisplayLabel(app, slotName) {
        const match = String(slotName || '').match(/^slot(\d+)$/);
        return match ? app._label('save.slotLabel', 'Slot {number}', { number: match[1] }) : String(slotName || '');
    },

    beginNewGameInSlot(app, slotName) {
        slotName = app._normalizeSaveSlotName(slotName, null);
        if (!slotName) return false;
        const saveTime = app._getSaveTime(slotName);
        const hasData = parseInt(saveTime) > 0;
        const slotLabel = app._slotDisplayLabel(slotName);
        if (hasData) {
            return app.showConfirmDialog({
                title: app._label('save.newTitle', 'Choose New Game Slot'),
                message: app._label('save.confirm.newGameOverwrite', 'Start a new game in {slot}? This will overwrite that save slot. This cannot be undone.', { slot: slotLabel }),
                confirmLabel: app._label('save.overwriteSlot', 'Overwrite Slot'),
                cancelLabel: app._label('ui.cancel', 'Cancel'),
                danger: true,
                onConfirm: () => app._startNewGameInSlot(slotName)
            });
        }
        return app._startNewGameInSlot(slotName);
    },

    startNewGameInSlot(app, slotName) {
        slotName = app._normalizeSaveSlotName(slotName, null);
        if (!slotName) return false;
        app.activeSlot = slotName;
        app._setStoredValue('lastSlot', slotName);
        app.showScreen('create');
        return true;
    },

    async saveToSlot(app, slotName) {
        slotName = app._normalizeSaveSlotName(slotName);
        if (!app.player) { alert(app._label('save.error.noGame', 'No game to save!')); return; }
        const saveTime = app._getSaveTime(slotName);
        const slotLabel = app._slotDisplayLabel(slotName);
        if (parseInt(saveTime) > 0 && slotName !== app.activeSlot) {
            return app.showConfirmDialog({
                title: app._label('save.saveTitle', 'Save Game'),
                message: app._label('save.confirm.manualOverwrite', 'Overwrite {slot} with the current game? This cannot be undone.', { slot: slotLabel }),
                confirmLabel: app._label('save.save', 'Save'),
                cancelLabel: app._label('ui.cancel', 'Cancel'),
                danger: true,
                onConfirm: () => app._saveToSlotConfirmed(slotName)
            });
        }
        return app._saveToSlotConfirmed(slotName);
    },

    async saveToSlotConfirmed(app, slotName) {
        slotName = app._normalizeSaveSlotName(slotName);
        const slotLabel = app._slotDisplayLabel(slotName);
        try {
            await YAW_SAVE_PERSISTENCE.writeSlot(app, slotName, { auto: false });
            app.saveManagerStatus = {
                kind: 'success',
                message: app._label('save.success.saved', 'Game saved to {slot}!', { slot: slotLabel })
            };
            app.renderSaveManager(app.saveManagerMode || 'save');
            return true;
        } catch (e) {
            app.saveManagerStatus = {
                kind: 'error',
                message: app._label('save.error.saveFailed', 'Save failed: {message}', { message: e.message })
            };
            app.renderSaveManager(app.saveManagerMode || 'save');
        }
        return false;
    },

    async deleteSlot(app, slotName) {
        slotName = app._normalizeSaveSlotName(slotName, null);
        if (!slotName) return false;
        const slotLabel = app._slotDisplayLabel(slotName);
        return app.showConfirmDialog({
            title: app._label('save.delete', 'Delete'),
            message: app._label('save.confirm.deleteSlot', 'Delete save slot {slot}? This permanently removes only this slot and cannot be undone.', { slot: slotLabel }),
            confirmLabel: app._label('save.delete', 'Delete'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            danger: true,
            onConfirm: () => app._deleteSlotConfirmed(slotName)
        });
    },

    async deleteSlotConfirmed(app, slotName) {
        slotName = app._normalizeSaveSlotName(slotName, null);
        if (!slotName) return false;
        try {
            await app._dbDelete('saves', slotName);
            app._removeSaveTime(slotName);
            app._clearCombatRefreshSnapshot(slotName);
            const lastSlot = app._normalizeSaveSlotName(app._getStoredValue('lastSlot'), null);
            if (lastSlot === slotName) {
                app._removeStoredValue('lastSlot');
                app._removeStoredValue('lastSaveTime');
            }
            if (app._normalizeSaveSlotName(app.activeSlot) === slotName) app.activeSlot = 'slot1';
            await app.refreshContinueButton();
            app.showSaveManager(app.saveManagerMode || 'load');
            return true;
        } catch (e) { alert(app._label('save.error.deleteFailed', 'Delete failed: {message}', { message: e.message })); }
        return false;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SAVE_SLOT_FLOW = YAW_SAVE_SLOT_FLOW;
}
