/**
 * FightFuckFeed.me - KEYBOARD Module
 * Keyboard shortcuts and hotkey management
 */

const KEYBOARD = (() => {
    // Key mappings
    const SHORTCUTS = {
        // Movement
        'ArrowUp': { action: () => MAP.Walk(-1, 0), desc: 'Move North', category: 'Movement' },
        'ArrowDown': { action: () => MAP.Walk(1, 0), desc: 'Move South', category: 'Movement' },
        'ArrowLeft': { action: () => MAP.Walk(0, -1), desc: 'Move West', category: 'Movement' },
        'ArrowRight': { action: () => MAP.Walk(0, 1), desc: 'Move East', category: 'Movement' },
        'w': { action: () => MAP.Walk(-1, 0), desc: 'Move North', category: 'Movement' },
        's': { action: () => MAP.Walk(1, 0), desc: 'Move South', category: 'Movement' },
        'a': { action: () => MAP.Walk(0, -1), desc: 'Move West', category: 'Movement' },
        'd': { action: () => MAP.Walk(0, 1), desc: 'Move East', category: 'Movement' },
        
        // Quick actions
        '1': { action: () => COMBAT.SelectAction('fight'), desc: 'Select Fight', category: 'Combat' },
        '2': { action: () => COMBAT.SelectAction('fuck'), desc: 'Select Fuck', category: 'Combat' },
        '3': { action: () => COMBAT.SelectAction('feed'), desc: 'Select Feed', category: 'Combat' },
        '4': { action: () => COMBAT.SelectAction('flee'), desc: 'Flee', category: 'Combat' },
        
        // System
        'Escape': { action: () => closeMenus(), desc: 'Close menus/dialogs', category: 'System' },
        'F1': { action: () => showHelp(), desc: 'Show help', category: 'System' },
        'F5': { action: () => quickSave(), desc: 'Quick save', category: 'System', preventDefault: true },
        'F9': { action: () => quickLoad(), desc: 'Quick load', category: 'System', preventDefault: true },
    };
    
    let enabled = true;
    
    // Initialize
    const init = () => {
        document.addEventListener('keydown', handleKeydown);
        console.log('Keyboard shortcuts initialized');
    };
    
    // Handle keydown
    const handleKeydown = (e) => {
        if (!enabled) return;
        
        // Don't trigger when typing in inputs
        if (e.target.matches('input, textarea, select')) return;
        
        const key = e.key;
        const shortcut = SHORTCUTS[key];
        
        if (shortcut) {
            if (shortcut.preventDefault) e.preventDefault();
            shortcut.action();
        }
    };
    
    // Enable/disable
    const enable = () => { enabled = true; };
    const disable = () => { enabled = false; };
    
    // Close all menus
    const closeMenus = () => {
        // Close modals
        document.querySelectorAll('.modal-overlay, .save-manager-modal, .tutorial-overlay').forEach(el => {
            el.remove();
        });
    };
    
    // Quick save to current slot
    const quickSave = () => {
        const slot = UTILS.storage.get('currentSaveSlot') || 1;
        const result = SAVE.saveToSlot(slot);
        if (result.success) {
            UI.showToast('Game saved', 'success', 2000);
        } else {
            UI.showToast('Save failed', 'error', 2000);
        }
    };
    
    // Quick load from current slot
    const quickLoad = () => {
        const slot = UTILS.storage.get('currentSaveSlot') || 1;
        const result = SAVE.loadFromSlot(slot);
        if (result.success) {
            UI.showToast('Game loaded', 'success', 2000);
        } else {
            UI.showToast('No save found', 'error', 2000);
        }
    };
    
    // Show help modal
    const showHelp = () => {
        const content = Object.entries(SHORTCUTS)
            .map(([key, data]) => ({ key, ...data }))
            .reduce((acc, curr) => {
                if (!acc[curr.category]) acc[curr.category] = [];
                acc[curr.category].push(curr);
                return acc;
            }, {});
        
        let html = '<div class="keyboard-help">';
        html += '<h3>Keyboard Shortcuts</h3>';
        
        Object.entries(content).forEach(([category, shortcuts]) => {
            html += `<div class="shortcut-category"><h4>${category}</h4><ul>`;
            shortcuts.forEach(s => {
                html += `<li><kbd>${s.key}</kbd> - ${s.desc}</li>`;
            });
            html += '</ul></div>';
        });
        
        html += '</div>';
        
        UI.showModal(html, { title: 'Keyboard Shortcuts' });
    };
    
    // Get all shortcuts
    const getShortcuts = () => SHORTCUTS;
    
    return {
        init,
        enable,
        disable,
        getShortcuts,
        showHelp
    };
})();

window.KEYBOARD = KEYBOARD;
