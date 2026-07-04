/**
 * YOU ARE WILD SAVE MANAGER RENDERING
 * Builds the save-slot manager UI while App keeps save/load/delete behavior.
 */

const YAW_SAVE_MANAGER = {
    render(app, mode = app.saveManagerMode || 'load') {
        const lastSlot = app._normalizeSaveSlotName(app._getStoredValue('lastSlot'), 'slot1');
        const isNewMode = mode === 'new';
        const isSaveMode = mode === 'save';
        const titleKey = isNewMode ? 'save.newTitle' : (isSaveMode ? 'save.saveTitle' : 'save.loadTitle');
        const title = app._label(titleKey, isNewMode ? 'Choose New Game Slot' : (isSaveMode ? 'Save Game' : 'Load Game'));
        const saveManager = document.getElementById('save-manager');
        if (saveManager) saveManager.setAttribute('aria-label', title);
        const saveButton = (classes, label, titleText, onclick, style = '') => `<button class="${classes}" title="${app._escapeHtml(titleText)}" aria-label="${app._escapeHtml(titleText)}"${style ? ` style="${style}"` : ''} onclick="${onclick}">${app._escapeHtml(label)}</button>`;
        const descriptionKey = isNewMode ? 'save.newDescription' : (isSaveMode ? 'save.saveDescription' : 'save.loadDescription');
        const description = app._label(descriptionKey, isNewMode ? 'Pick an empty slot for the new run, or deliberately overwrite an occupied slot.' : (isSaveMode ? 'Choose where to save the current game. Occupied slots warn before overwrite.' : 'Choose a save to load, start a new run in a slot, or delete one slot.'));
        let html = '<div class="save-manager-shell"><h1 style="color:var(--accent-primary);margin-bottom:8px;">' + app._escapeHtml(title) + '</h1><p style="color:var(--text-muted);margin-bottom:16px;">' + app._escapeHtml(description) + '</p>';
        if (!isNewMode && !isSaveMode) {
            html += '<div class="save-manager-toolbar">' + saveButton('nav-btn primary', '🆕 ' + app._label('save.toolbarNew', 'New Game'), app._label('save.action.newGame', 'Choose a slot for a new game'), 'App.showNewGameManager()') + '<span>' + app._escapeHtml(app._label('save.toolbarHint', 'Choose a slot next; occupied slots warn before overwrite.')) + '</span></div>';
        }
        for (let i = 1; i <= 5; i++) {
            html += this.slotCard(app, {
                slotName: 'slot' + i,
                index: i,
                lastSlot,
                isNewMode,
                isSaveMode,
                saveButton
            });
        }
        html += '<div style="display:flex;gap:12px;justify-content:center;margin-top:24px;">' + saveButton('nav-btn save-manager-close', app._label('save.close', 'Close'), app._label('save.close', 'Close'), 'returnToGame()') + '</div></div>';
        if (saveManager) {
            saveManager.innerHTML = html;
            saveManager.style.display = 'block';
        }
        return html;
    },

    slotCard(app, options) {
        const { slotName, index, lastSlot, isNewMode, isSaveMode, saveButton } = options;
        const isActive = slotName === lastSlot;
        const saveTime = app._getSaveTime(slotName);
        const hasData = parseInt(saveTime) > 0;
        const slotLabel = app._label('save.slotLabel', 'Slot {number}', { number: index });
        const timeStr = hasData ? new Date(parseInt(saveTime)).toLocaleString() : app._label('save.empty', 'Empty');
        const slotStatus = hasData ? app._label('save.savedGame', 'Saved game') : app._label('save.openSlot', 'Open slot');
        const hintKey = isNewMode
            ? (hasData ? 'save.slotHint.occupiedNew' : 'save.slotHint.emptyNew')
            : (isSaveMode
                ? (hasData ? 'save.slotHint.occupiedSave' : 'save.slotHint.emptySave')
                : (hasData ? 'save.slotHint.occupiedLoad' : 'save.slotHint.emptyLoad'));
        const slotHint = app._label(hintKey, hasData ? 'Saved slot.' : 'Empty slot.');
        const actionSummaryKey = isNewMode
            ? (hasData ? 'save.slotActions.occupiedNew' : 'save.slotActions.emptyNew')
            : (isSaveMode
                ? (hasData ? 'save.slotActions.occupiedSave' : 'save.slotActions.emptySave')
                : (hasData ? 'save.slotActions.occupiedLoad' : 'save.slotActions.emptyLoad'));
        const actionSummary = app._label(actionSummaryKey, 'Actions available for this slot.');
        const actionSummaryLabel = app._label('save.slotActions.label', 'Available slot actions');
        let html = '<div class="save-slot-card ' + (hasData ? 'occupied' : 'empty') + (isActive ? ' active' : '') + '">';
        html += '<div><div class="save-slot-title">' + (isActive ? '▶ ' : '') + app._escapeHtml(slotLabel) + '<span class="save-slot-badge">' + app._escapeHtml(slotStatus) + '</span></div><div class="save-slot-time">' + app._escapeHtml(timeStr) + '</div><div class="save-slot-hint">' + app._escapeHtml(slotHint) + '</div><div class="save-slot-summary" aria-label="' + app._escapeHtml(actionSummaryLabel) + '">' + app._escapeHtml(actionSummary) + '</div></div>';
        html += '<div class="save-slot-actions">';
        if (isNewMode) html += saveButton('nav-btn primary', '🆕 ' + app._label(hasData ? 'save.overwriteSlot' : 'save.useEmpty', hasData ? 'Overwrite Slot' : 'Use Empty Slot'), app._label(hasData ? 'save.action.overwrite' : 'save.action.useEmpty', hasData ? 'Overwrite {slot} with a new game' : 'Start new game in {slot}', { slot: slotLabel }), 'App.beginNewGameInSlot(\'' + slotName + '\')');
        if (!isNewMode && !isSaveMode && !hasData) html += saveButton('nav-btn primary', '🆕 ' + app._label('save.toolbarNew', 'New Game'), app._label('save.action.useEmpty', 'Start new game in {slot}', { slot: slotLabel }), 'App.beginNewGameInSlot(\'' + slotName + '\')');
        if (!isNewMode && !isSaveMode && hasData) html += saveButton('nav-btn', '🆕 ' + app._label('save.newRun', 'New Run'), app._label('save.action.newRun', 'Start a new run in {slot}', { slot: slotLabel }), 'App.beginNewGameInSlot(\'' + slotName + '\')');
        if (!isNewMode && !isSaveMode && hasData) html += saveButton('nav-btn', '📂 ' + app._label('save.load', 'Load'), app._label('save.action.load', 'Load {slot}', { slot: slotLabel }), 'App.loadFromSlot(\'' + slotName + '\').then(ok => { if (ok) App.showScreen(\'game\'); })');
        if (isSaveMode) html += saveButton('nav-btn primary', '💾 ' + app._label('save.save', 'Save'), app._label('save.action.save', 'Save current game to {slot}', { slot: slotLabel }), 'App.saveToSlot(\'' + slotName + '\')');
        if (hasData) html += saveButton('nav-btn', '🗑️ ' + app._label('save.delete', 'Delete'), app._label('save.action.delete', 'Delete {slot}', { slot: slotLabel }), 'App.deleteSlot(\'' + slotName + '\')', 'color:var(--accent-danger);');
        html += '</div></div>';
        return html;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SAVE_MANAGER = YAW_SAVE_MANAGER;
}
