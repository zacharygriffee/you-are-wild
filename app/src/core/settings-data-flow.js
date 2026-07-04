/**
 * YOU ARE WILD SETTINGS DATA FLOW
 * Destructive local data cleanup and save reset flows.
 */

const YAW_SETTINGS_DATA_FLOW = {
    currentDatabaseNames(app) {
        return [
            app._moduleDbName(),
            app.SAVE_DB_NAME,
            app.WORLD_DB_NAME
        ];
    },

    legacyDatabaseNames(app) {
        return [
            app._legacyModuleDbName(),
            app.LEGACY_SAVE_DB_NAME
        ];
    },

    clearAllData(app) {
        return app.showConfirmDialog({
            title: app._label('settings.title', 'Settings'),
            message: app._label('settings.confirmClearAllData', 'WARNING: This will delete ALL saves, modules, and game data. This cannot be undone. Are you sure?'),
            confirmLabel: app._label('settings.clearAllSaves', 'Clear All Saves'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            danger: true,
            onConfirm: () => app._clearAllDataConfirmed()
        });
    },

    async clearAllDataConfirmed(app) {
        try {
            for (let i = 1; i <= 5; i++) {
                const slotName = 'slot' + i;
                await app._dbDelete('saves', slotName).catch(e => console.warn(`Failed to delete ${slotName}`, e));
                app._removeSaveTime(slotName);
                app._clearCombatRefreshSnapshot(slotName);
            }
            app._removeStoredValue('lastSlot');
            app._removeStoredValue('lastSaveTime');
            app._removeStoredValue('hasPlayed');
            app._removeStoredValue('tutorialComplete');
            app._removeStoredValue('settings');
            app._removeStoredValue('contentPrefs');
            app._removeStoredValue('logView');

            app._closeModuleDatabase();
            await Promise.all([
                ...this.currentDatabaseNames(app).map(dbName => app._deleteDatabase(dbName)),
                ...this.legacyDatabaseNames(app).map(dbName => app._deleteLegacyDatabase(dbName))
            ]);
            const continueButton = document.getElementById('menu-continue');
            if (continueButton) continueButton.style.display = 'none';
            alert(app._label('settings.clearAllDataDone', 'All data cleared. Refresh the page to start fresh.'));
            app._reloadPage();
            return true;
        } catch (e) {
            console.error('Clear all data failed:', e);
            alert(app._label('settings.clearAllDataFailed', 'Failed to clear all data: {message}', { message: e.message || e }));
            return false;
        }
    },

    deleteAllSaves(app) {
        return app.showConfirmDialog({
            title: app._label('settings.clearAllSaves', 'Clear All Saves'),
            message: app._label('save.confirmDeleteAll', 'Delete ALL save data? This cannot be undone!'),
            confirmLabel: app._label('settings.clearAllSaves', 'Clear All Saves'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            danger: true,
            onConfirm: () => app._deleteAllSavesConfirmed()
        });
    },

    async deleteAllSavesConfirmed(app) {
        try {
            for (let i = 1; i <= 5; i++) {
                const slotName = 'slot' + i;
                await app._dbDelete('saves', slotName);
                app._removeSaveTime(slotName);
                app._clearCombatRefreshSnapshot(slotName);
            }
            app._removeStoredValue('lastSlot');
            app._removeStoredValue('lastSaveTime');
            app._removeStoredValue('hasPlayed');
            app.activeSlot = 'slot1';
            await app.refreshContinueButton();
            alert(app._label('save.success.deletedAll', 'All saves deleted.'));
            if (document.getElementById('save-manager')?.classList.contains('active')) {
                app.renderSaveManager();
            }
            app._reloadPage();
        } catch (e) {
            alert(app._label('save.error.deleteAllFailed', 'Delete saves failed: {message}', { message: e.message }));
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SETTINGS_DATA_FLOW = YAW_SETTINGS_DATA_FLOW;
}
