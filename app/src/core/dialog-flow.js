/**
 * YOU ARE WILD DIALOG FLOW
 * Shared confirmation and save-recovery modal lifecycle.
 */

const YAW_DIALOG_FLOW = {
    showConfirm(app, options = {}) {
        const message = String(options.message || '');
        if (!message) return false;
        if (typeof document === 'undefined' || !document.body) {
            if (typeof confirm === 'function' && !confirm(message)) {
                return typeof options.onCancel === 'function' ? options.onCancel() : false;
            }
            return typeof options.onConfirm === 'function' ? options.onConfirm() : true;
        }
        this.closeConfirm(app, { restoreFocus: false, restoreParentTrap: false });
        const parentFocusTrap = app._focusTrap?.container
            ? { container: app._focusTrap.container, close: app._focusTrap.close || null }
            : null;
        const id = `confirm-${Date.now ? Date.now() : 'dialog'}`;
        const title = options.title || app._label('ui.confirm', 'Confirm');
        const confirmLabel = options.confirmLabel || app._label('ui.confirm', 'Confirm');
        const cancelLabel = options.cancelLabel || app._label('ui.cancel', 'Cancel');
        app.pendingConfirm = {
            id,
            title,
            message,
            confirmLabel,
            cancelLabel,
            danger: Boolean(options.danger),
            onConfirm: options.onConfirm || null,
            onCancel: options.onCancel || null,
            parentFocusTrap
        };
        const dangerClass = options.danger ? ' danger' : '';
        const html = `<div class="app-confirm-backdrop" id="app-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title" aria-describedby="app-confirm-message" data-command-surface="system-dialog" data-command-mode="system"><div class="app-confirm-card" data-command-surface="system-dialog" data-command-mode="system"><h3 id="app-confirm-title">${app._escapeHtml(title)}</h3><p id="app-confirm-message">${app._escapeHtml(message)}</p><div class="app-confirm-actions" data-command-surface="system-dialog" data-command-mode="system"><button class="nav-btn" data-command-surface="system-dialog" data-command-mode="system" data-command-control="cancel-dialog" data-command-slot="exit" onclick="App.resolveConfirmDialog(false)">${app._escapeHtml(cancelLabel)}</button><button class="nav-btn primary${dangerClass}" data-command-surface="system-dialog" data-command-mode="system" data-command-control="confirm-dialog" onclick="App.resolveConfirmDialog(true)">${app._escapeHtml(confirmLabel)}</button></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const dialog = document.getElementById('app-confirm-dialog');
        app._activateFocusTrap(dialog, { close: () => app.resolveConfirmDialog(false) });
        return false;
    },

    resolveConfirm(app, confirmed) {
        const pending = app.pendingConfirm;
        this.closeConfirm(app);
        if (!pending) return false;
        if (!confirmed) return typeof pending.onCancel === 'function' ? pending.onCancel() : false;
        return typeof pending.onConfirm === 'function' ? pending.onConfirm() : true;
    },

    closeConfirm(app, options = {}) {
        const dialog = typeof document !== 'undefined' ? document.getElementById('app-confirm-dialog') : null;
        const pending = app.pendingConfirm;
        const parentFocusTrap = pending?.parentFocusTrap || null;
        const hadConfirm = Boolean(dialog || pending);
        if (dialog) dialog.remove();
        app.pendingConfirm = null;
        if (!hadConfirm) return;
        app._restoreFocusTrap(options);
        if (options.restoreParentTrap === false) return;
        const parent = parentFocusTrap?.container;
        if (!parent || !parent.isConnected) return;
        const style = typeof getComputedStyle === 'function' ? getComputedStyle(parent) : null;
        if (style && style.display === 'none') return;
        app._activateFocusTrap(parent, { close: parentFocusTrap.close || null });
    },

    showSaveRecovery(app, slotName, saveData) {
        const message = app._label('save.recovery.prompt', 'Save data is incompatible or corrupted. Options:\n\n1 = Delete save\n2 = Download backup (as base64)\n3 = Cancel\n\nEnter 1, 2, or 3:');
        app.showToast?.({ text: message.split('\n')[0], type: 'system', importance: 'major', dedupeKey: 'save-recovery' });
        if (typeof document === 'undefined' || !document.body) {
            const choice = typeof prompt === 'function' ? prompt(message) : null;
            if (choice === '1') return app.resolveSaveRecoveryDialog('delete', slotName, saveData);
            if (choice === '2') return app.resolveSaveRecoveryDialog('backup', slotName, saveData);
            return false;
        }
        this.closeConfirm(app, { restoreFocus: false });
        this.closeSaveRecovery(app, { restoreFocus: false, restoreParentTrap: false });
        const parentFocusTrap = app._focusTrap?.container
            ? { container: app._focusTrap.container, close: app._focusTrap.close || null }
            : null;
        const title = app._label('save.recovery.title', 'Recover Save');
        const deleteLabel = app._label('save.recovery.delete', 'Delete Save');
        const backupLabel = app._label('save.recovery.backup', 'Download Backup');
        const cancelLabel = app._label('ui.cancel', 'Cancel');
        app.pendingSaveRecovery = { slotName, saveData, message, parentFocusTrap };
        const html = `<div class="app-confirm-backdrop" id="save-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="save-recovery-title" aria-describedby="save-recovery-message" data-command-surface="save-recovery-dialog" data-command-mode="system"><div class="app-confirm-card" data-command-surface="save-recovery-dialog" data-command-mode="system"><h3 id="save-recovery-title">${app._escapeHtml(title)}</h3><p id="save-recovery-message">${app._escapeHtml(message)}</p><div class="app-confirm-actions" data-command-surface="save-recovery-dialog" data-command-mode="system"><button class="nav-btn" data-command-surface="save-recovery-dialog" data-command-mode="system" data-command-control="cancel-save-recovery" data-command-slot="exit" onclick="App.resolveSaveRecoveryDialog('cancel')">${app._escapeHtml(cancelLabel)}</button><button class="nav-btn" data-command-surface="save-recovery-dialog" data-command-mode="system" data-command-control="backup-save" onclick="App.resolveSaveRecoveryDialog('backup')">${app._escapeHtml(backupLabel)}</button><button class="nav-btn primary danger" data-command-surface="save-recovery-dialog" data-command-mode="system" data-command-control="delete-save" onclick="App.resolveSaveRecoveryDialog('delete')">${app._escapeHtml(deleteLabel)}</button></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const dialog = document.getElementById('save-recovery-dialog');
        app._activateFocusTrap(dialog, { close: () => app.resolveSaveRecoveryDialog('cancel') });
        return false;
    },

    async resolveSaveRecovery(app, action, fallbackSlotName = null, fallbackSaveData = null) {
        const pending = app.pendingSaveRecovery || {};
        const slotName = app._normalizeSaveSlotName(fallbackSlotName || pending.slotName, null);
        const saveData = fallbackSaveData || pending.saveData;
        this.closeSaveRecovery(app);
        if (action === 'delete' && slotName) {
            await app._dbDelete('saves', slotName);
            app._removeSaveTime(slotName);
            app._clearCombatRefreshSnapshot(slotName);
            this.showSaveRecoveryStatus(app, 'success', app._label('save.recovery.deleted', 'Save deleted.'));
            return false;
        }
        if (action === 'backup' && slotName && saveData) {
            this.downloadSaveBackup(slotName, saveData);
            this.showSaveRecoveryStatus(app, 'success', app._label('save.recovery.backupDownloaded', 'Backup downloaded. Save remains intact.'));
            return false;
        }
        return false;
    },

    showSaveRecoveryStatus(app, kind, message) {
        if (!app || typeof app.renderSaveManager !== 'function') return false;
        app.showToast?.({ text: message, type: kind === 'success' ? 'system' : 'danger', importance: 'major', dedupeKey: `save-recovery:${kind}` });
        app.saveManagerMode = app.saveManagerMode || 'load';
        app.saveManagerStatus = { kind, message };
        if (typeof app.showScreen === 'function') app.showScreen('save-manager');
        app.renderSaveManager(app.saveManagerMode);
        return false;
    },

    closeSaveRecovery(app, options = {}) {
        const dialog = typeof document !== 'undefined' ? document.getElementById('save-recovery-dialog') : null;
        const pending = app.pendingSaveRecovery;
        const parentFocusTrap = pending?.parentFocusTrap || null;
        const hadRecovery = Boolean(dialog || pending);
        if (dialog) dialog.remove();
        app.pendingSaveRecovery = null;
        if (!hadRecovery) return;
        app._restoreFocusTrap(options);
        if (options.restoreParentTrap === false) return;
        const parent = parentFocusTrap?.container;
        if (!parent || !parent.isConnected) return;
        const style = typeof getComputedStyle === 'function' ? getComputedStyle(parent) : null;
        if (style && style.display === 'none') return;
        app._activateFocusTrap(parent, { close: parentFocusTrap.close || null });
    },

    downloadSaveBackup(slotName, saveData) {
        const bytes = new Uint8Array(saveData);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const blob = new Blob([base64], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'yaw_save_' + slotName + '_backup.txt';
        a.click();
        URL.revokeObjectURL(url);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_DIALOG_FLOW = YAW_DIALOG_FLOW;
}
