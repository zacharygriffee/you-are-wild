/**
 * FightFuckFeed.me - SAVE-UI Module
 * Visual save/load interface with slots and previews
 */

const SAVE_UI = (() => {
    // Modal instance
    let modal = null;
    let currentView = 'slots'; // 'slots', 'import', 'confirm'
    
    // Open save/load manager
    const open = () => {
        if (modal) close();
        
        modal = document.createElement('div');
        modal.className = 'save-manager-modal';
        modal.innerHTML = `
            <div class="save-manager-overlay"></div>
            <div class="save-manager-content">
                <div class="save-manager-header">
                    <h2>Save / Load Game</h2>
                    <button class="save-manager-close">&times;</button>
                </div>
                <div class="save-manager-body">
                    <div class="save-tabs">
                        <button class="save-tab active" data-tab="slots">Save Slots</button>
                        <button class="save-tab" data-tab="import">Import / Export</button>
                        <button class="save-tab" data-tab="auto">Auto Saves</button>
                    </div>
                    <div class="save-panels">
                        <div class="save-panel active" id="panel-slots">
                            ${renderSlotsPanel()}
                        </div>
                        <div class="save-panel" id="panel-import">
                            ${renderImportPanel()}
                        </div>
                        <div class="save-panel" id="panel-auto">
                            ${renderAutoSavePanel()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.save-manager-close').onclick = close;
        modal.querySelector('.save-manager-overlay').onclick = close;
        
        // Tab switching
        modal.querySelectorAll('.save-tab').forEach(tab => {
            tab.onclick = () => switchTab(tab.dataset.tab);
        });
        
        // Slot buttons
        modal.querySelectorAll('.slot-btn-save').forEach(btn => {
            btn.onclick = () => handleSave(parseInt(btn.dataset.slot));
        });
        
        modal.querySelectorAll('.slot-btn-load').forEach(btn => {
            btn.onclick = () => handleLoad(parseInt(btn.dataset.slot));
        });
        
        modal.querySelectorAll('.slot-btn-delete').forEach(btn => {
            btn.onclick = () => confirmDelete(parseInt(btn.dataset.slot));
        });
        
        // Import/Export
        const importBtn = modal.querySelector('#import-file-btn');
        if (importBtn) {
            importBtn.onchange = (e) => handleImport(e.target.files[0]);
        }
        
        modal.querySelectorAll('.export-btn').forEach(btn => {
            btn.onclick = () => SAVE.exportSave(parseInt(btn.dataset.slot));
        });
        
        // Keyboard
        document.addEventListener('keydown', handleKeydown);
        
        STATE.emit('saveUIOpen');
    };
    
    // Close manager
    const close = () => {
        if (!modal) return;
        document.removeEventListener('keydown', handleKeydown);
        modal.remove();
        modal = null;
        STATE.emit('saveUIClose');
    };
    
    // Handle keyboard
    const handleKeydown = (e) => {
        if (e.key === 'Escape') close();
    };
    
    // Switch tab
    const switchTab = (tab) => {
        modal.querySelectorAll('.save-tab').forEach(t => t.classList.remove('active'));
        modal.querySelectorAll('.save-panel').forEach(p => p.classList.remove('active'));
        
        modal.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`panel-${tab}`).classList.add('active');
    };
    
    // Render slots panel
    const renderSlotsPanel = () => {
        let html = '<div class="save-slots-grid">';
        
        for (let i = 1; i <= 3; i++) {
            const info = SAVE.getSlotInfo(i);
            html += renderSlotCard(i, info);
        }
        
        html += '</div>';
        return html;
    };
    
    // Render individual slot
    const renderSlotCard = (slot, info) => {
        if (!info.exists) {
            return `
                <div class="save-slot empty" data-slot="${slot}">
                    <div class="slot-header">
                        <span class="slot-number">Slot ${slot}</span>
                        <span class="slot-status">Empty</span>
                    </div>
                    <div class="slot-body">
                        <div class="slot-preview">
                            <div class="slot-empty-icon">💾</div>
                            <p>No save data</p>
                        </div>
                    </div>
                    <div class="slot-actions">
                        <button class="slot-btn-save btnact" data-slot="${slot}">
                            Save Here
                        </button>
                    </div>
                </div>
            `;
        }
        
        const preview = SAVE.getSlotPreview(slot);
        const date = new Date(info.timestamp).toLocaleDateString();
        const time = new Date(info.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="save-slot occupied" data-slot="${slot}">
                <div class="slot-header">
                    <span class="slot-number">Slot ${slot}</span>
                    <span class="slot-status" title="${info.version}">${date} ${time}</span>
                </div>
                <div class="slot-body">
                    <div class="slot-preview">
                        <div class="slot-character">
                            <span class="slot-species">${preview?.species || 'Unknown'}</span>
                            <span class="slot-name">${preview?.partyName || 'Unknown'}</span>
                        </div>
                        <div class="slot-details">
                            <span>📍 ${preview?.location || '0, 0'}</span>
                            <span>⏱️ ${preview?.playtime || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                <div class="slot-actions">
                    <button class="slot-btn-load btnavl" data-slot="${slot}">Load</button>
                    <button class="slot-btn-save btn" data-slot="${slot}">Overwrite</button>
                    <button class="slot-btn-delete" data-slot="${slot}" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    };
    
    // Render import/export panel
    const renderImportPanel = () => {
        return `
            <div class="import-export-section">
                <div class="export-section">
                    <h3>Export Save</h3>
                    <p>Download your save files to back them up or transfer to another device.</p>
                    <div class="export-slots">
                        <button class="export-btn btnavl" data-slot="1">Export Slot 1</button>
                        <button class="export-btn btnavl" data-slot="2">Export Slot 2</button>
                        <button class="export-btn btnavl" data-slot="3">Export Slot 3</button>
                    </div>
                </div>
                <div class="import-section">
                    <h3>Import Save</h3>
                    <p>Select a save file (.json) to import into an empty slot.</p>
                    <div class="import-dropzone">
                        <input type="file" id="import-file-btn" accept=".json" />
                        <label for="import-file-btn" class="import-label">
                            <span>📁 Choose File or Drag Here</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    };
    
    // Render auto-save panel
    const renderAutoSavePanel = () => {
        const autoSaveEnabled = UTILS.storage.get('autoSaveEnabled') !== false;
        const interval = UTILS.storage.get('autoSaveInterval') || 5;
        
        return `
            <div class="autosave-section">
                <div class="autosave-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" id="autosave-check" ${autoSaveEnabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">Auto-save enabled</span>
                    </label>
                </div>
                <div class="autosave-interval">
                    <label>Save every: 
                        <select id="autosave-interval">
                            <option value="3" ${interval == 3 ? 'selected' : ''}>3 minutes</option>
                            <option value="5" ${interval == 5 ? 'selected' : ''}>5 minutes</option>
                            <option value="10" ${interval == 10 ? 'selected' : ''}>10 minutes</option>
                            <option value="15" ${interval == 15 ? 'selected' : ''}>15 minutes</option>
                        </select>
                    </label>
                </div>
                <div class="autosave-info">
                    <p>Auto-saves to the current slot. Last auto-save: <span id="last-autosave">Never</span></p>
                </div>
            </div>
        `;
    };
    
    // Handle save
    const handleSave = (slot) => {
        const result = SAVE.saveToSlot(slot);
        
        if (result.success) {
            UI.showToast(`Game saved to Slot ${slot}`, 'success');
            refreshSlots();
            UTILS.storage.set('currentSaveSlot', slot);
        } else {
            UI.showToast(`Save failed: ${result.error}`, 'error');
        }
    };
    
    // Handle load
    const handleLoad = (slot) => {
        const result = SAVE.loadFromSlot(slot);
        
        if (result.success) {
            UI.showToast(`Game loaded from Slot ${slot}`, 'success');
            UTILS.storage.set('currentSaveSlot', slot);
            close();
            STATE.emit('gameLoaded', { slot });
        } else {
            UI.showToast(`Load failed: ${result.error}`, 'error');
        }
    };
    
    // Confirm delete
    const confirmDelete = (slot) => {
        const confirmed = confirm(`Are you sure you want to delete Slot ${slot}?\nThis cannot be undone.`);
        if (confirmed) {
            SAVE.deleteSlot(slot);
            UI.showToast(`Slot ${slot} deleted`, 'info');
            refreshSlots();
        }
    };
    
    // Handle import
    const handleImport = async (file) => {
        if (!file) return;
        
        // Find first empty slot
        let targetSlot = null;
        for (let i = 1; i <= 3; i++) {
            const info = SAVE.getSlotInfo(i);
            if (!info.exists) {
                targetSlot = i;
                break;
            }
        }
        
        if (!targetSlot) {
            // Ask which slot to overwrite
            const choice = prompt('All slots are full. Enter slot number (1-3) to overwrite:');
            targetSlot = parseInt(choice);
            if (isNaN(targetSlot) || targetSlot < 1 || targetSlot > 3) {
                UI.showToast('Invalid slot', 'error');
                return;
            }
        }
        
        const result = await SAVE.importSave(file, targetSlot);
        
        if (result.success) {
            UI.showToast(`Save imported to Slot ${targetSlot}`, 'success');
            refreshSlots();
        } else {
            UI.showToast(`Import failed: ${result.error}`, 'error');
        }
    };
    
    // Refresh slots display
    const refreshSlots = () => {
        const panel = modal?.querySelector('#panel-slots');
        if (panel) {
            panel.innerHTML = renderSlotsPanel();
            
            // Re-attach listeners
            modal.querySelectorAll('.slot-btn-save').forEach(btn => {
                btn.onclick = () => handleSave(parseInt(btn.dataset.slot));
            });
            modal.querySelectorAll('.slot-btn-load').forEach(btn => {
                btn.onclick = () => handleLoad(parseInt(btn.dataset.slot));
            });
            modal.querySelectorAll('.slot-btn-delete').forEach(btn => {
                btn.onclick = () => confirmDelete(parseInt(btn.dataset.slot));
            });
        }
    };
    
    return {
        open,
        close,
        refreshSlots
    };
})();

window.SAVE_UI = SAVE_UI;
