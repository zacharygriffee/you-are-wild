/**
 * YOU ARE WILD SAVE METADATA
 * Save-slot names, timestamps, latest-slot sync, and continue-button helpers.
 */

const YAW_SAVE_METADATA = {
    slotNames() {
        return Array.from({ length: 5 }, (_, index) => 'slot' + (index + 1));
    },

    normalizeSlotName(slotName, fallback = 'slot1') {
        const value = String(slotName ?? '').trim();
        if (this.slotNames().includes(value)) return value;
        return fallback;
    },

    normalizeTimestamp(value) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) return '0';
        return String(parsed);
    },

    async findLatestExistingSlot(app) {
        const slots = [];
        for (const slotName of this.slotNames()) {
            const saveData = await app._dbGet('saves', slotName);
            if (saveData) {
                const time = parseInt(app._getSaveTime(slotName), 10) || 0;
                slots.push({ slotName, time });
            }
        }
        slots.sort((a, b) => b.time - a.time || a.slotName.localeCompare(b.slotName));
        return slots[0]?.slotName || null;
    },

    async syncLastSlot(app) {
        const rawLastSlot = app._getStoredValue('lastSlot');
        const lastSlot = rawLastSlot ? app._normalizeSaveSlotName(rawLastSlot, null) : null;
        if (rawLastSlot && !lastSlot) {
            app._removeStoredValue('lastSlot');
            app._removeStoredValue('lastSaveTime');
        }
        if (lastSlot) {
            const saveData = await app._dbGet('saves', lastSlot);
            if (saveData) {
                if (rawLastSlot !== lastSlot) app._setStoredValue('lastSlot', lastSlot);
                const saveTime = app._getSaveTime(lastSlot);
                if (parseInt(saveTime, 10) > 0) app._setStoredValue('lastSaveTime', saveTime);
                else app._removeStoredValue('lastSaveTime');
                return lastSlot;
            }
        }
        const fallbackSlot = await app._findLatestExistingSaveSlot();
        if (fallbackSlot) {
            app._setStoredValue('lastSlot', fallbackSlot);
            const saveTime = app._getSaveTime(fallbackSlot);
            if (parseInt(saveTime, 10) > 0) app._setStoredValue('lastSaveTime', saveTime);
            return fallbackSlot;
        }
        app._removeStoredValue('lastSlot');
        app._removeStoredValue('lastSaveTime');
        return null;
    },

    async refreshContinueButton(app) {
        const button = document.getElementById('menu-continue');
        if (!button) return false;
        button.style.display = 'none';
        const hasSave = await app.checkLastPlayed().catch(() => false);
        button.style.display = hasSave ? 'block' : 'none';
        return hasSave;
    },

    async checkLastPlayed(app) {
        return !!(await app._syncLastSaveSlot());
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SAVE_METADATA = YAW_SAVE_METADATA;
}
