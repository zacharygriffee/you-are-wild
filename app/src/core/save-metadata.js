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

    async readSlotPresence(app) {
        const slotNames = this.slotNames();
        if (typeof app._readSaveSlotPresence === 'function') {
            return app._readSaveSlotPresence(slotNames);
        }
        const presence = new Map();
        for (const slotName of slotNames) {
            const saveData = await app._dbGet('saves', slotName);
            const sparseManifest = saveData ? null : await app._dbGet('saveManifests', slotName).catch(() => null);
            presence.set(slotName, { saveData, sparseManifest, exists: Boolean(saveData || sparseManifest) });
        }
        return presence;
    },

    async findLatestExistingSlot(app) {
        const presence = await this.readSlotPresence(app);
        const slots = [];
        for (const slotName of this.slotNames()) {
            if (presence.get(slotName)?.exists) {
                const time = parseInt(app._getSaveTime(slotName), 10) || 0;
                slots.push({ slotName, time });
            }
        }
        slots.sort((a, b) => b.time - a.time || a.slotName.localeCompare(b.slotName));
        return slots[0]?.slotName || null;
    },

    async syncLastSlot(app) {
        const presence = await this.readSlotPresence(app);
        const rawLastSlot = app._getStoredValue('lastSlot');
        const lastSlot = rawLastSlot ? app._normalizeSaveSlotName(rawLastSlot, null) : null;
        if (rawLastSlot && !lastSlot) {
            app._removeStoredValue('lastSlot');
            app._removeStoredValue('lastSaveTime');
        }
        if (lastSlot) {
            if (presence.get(lastSlot)?.exists) {
                if (rawLastSlot !== lastSlot) app._setStoredValue('lastSlot', lastSlot);
                const saveTime = app._getSaveTime(lastSlot);
                if (parseInt(saveTime, 10) > 0) app._setStoredValue('lastSaveTime', saveTime);
                else app._removeStoredValue('lastSaveTime');
                return lastSlot;
            }
        }
        const fallbackSlot = this.slotNames()
            .filter(slotName => presence.get(slotName)?.exists)
            .sort((a, b) => (parseInt(app._getSaveTime(b), 10) || 0) - (parseInt(app._getSaveTime(a), 10) || 0) || a.localeCompare(b))[0] || null;
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
