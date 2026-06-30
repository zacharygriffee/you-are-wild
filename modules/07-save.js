/**
 * FightFuckFeed.me - SAVE Module
 * Save/load system with compression and slot management
 */

const SAVE = (() => {
    // Storage keys
    const KEYS = {
        FILE_A: 'saveFileA',
        FILE_B: 'saveFileB',
        FILE_C: 'saveFileC',
        PREMIUM: 'saveFilesPremium',
        SETTINGS: 'gameSettings',
        METADATA: 'saveMetadata'
    };
    
    // Maximum save size (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    
    // Compression using LZ-string like approach (simplified)
    const compress = (data) => {
        try {
            const json = JSON.stringify(data);
            // Basic compression: remove whitespace, shorten keys
            const compressed = json
                .replace(/"(\w+)":/g, (m, p1) => `"${p1}":`)
                .replace(/\s+/g, '');
            return btoa(compressed);
        } catch (e) {
            console.error('Compression failed:', e);
            return null;
        }
    };
    
    const decompress = (compressed) => {
        try {
            const json = atob(compressed);
            return JSON.parse(json);
        } catch (e) {
            console.error('Decompression failed:', e);
            return null;
        }
    };
    
    // Estimate size
    const getSize = (data) => {
        const blob = new Blob([JSON.stringify(data)]);
        return blob.size;
    };
    
    // Compress map data (heavy optimization)
    const Compressinator = (doMain = true) => {
        const map = STATE.getMap();
        const compressed = [];
        
        map.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile && tile.discovered) {
                    // Store minimal data
                    compressed.push({
                        y, x,
                        t: tile.tag?.[0], // First letter only
                        d: tile.discovered,
                        u: tile.units?.length || 0
                    });
                }
            });
        });
        
        return compressed;
    };
    
    // Decompress map data
    const decompressMap = (compressed) => {
        const map = [];
        const tagMap = {
            'F': 'Forest',
            'J': 'Jungle',
            'C': 'Cave',
            'P': 'Plains',
            'S': 'Swamp',
            'W': 'Water',
            'R': 'Castle'
        };
        
        compressed.forEach(item => {
            if (!map[item.y]) map[item.y] = [];
            map[item.y][item.x] = {
                tag: tagMap[item.t] || 'Plains',
                discovered: item.d,
                units: item.u > 0 ? [] : [], // Simplified
                x: item.x,
                y: item.y
            };
        });
        
        return map;
    };
    
    // Save game to slot
    const saveToSlot = (slot, data = null) => {
        const saveData = data || STATE.getSaveData();
        const compressed = compress(saveData);
        
        if (!compressed) {
            return { success: false, error: 'Compression failed' };
        }
        
        const size = getSize(compressed);
        if (size > MAX_SIZE) {
            return { success: false, error: 'Save too large', size };
        }
        
        const key = `saveFile${slot}`;
        const result = UTILS.storage.set(key, {
            data: compressed,
            timestamp: new Date().toISOString(),
            size,
            slot,
            version: CONFIG.VERSION
        });
        
        if (result) {
            updateSlotMetadata(slot, saveData);
            STATE.emit('gameSaved', { slot, size });
            return { success: true, size };
        }
        
        return { success: false, error: 'Storage failed' };
    };
    
    // Load game from slot
    const loadFromSlot = (slot) => {
        const key = `saveFile${slot}`;
        const saved = UTILS.storage.get(key);
        
        if (!saved) {
            return { success: false, error: 'No save found' };
        }
        
        if (saved.version !== CONFIG.VERSION) {
            console.warn('Version mismatch:', saved.version, 'vs', CONFIG.VERSION);
        }
        
        const data = decompress(saved.data);
        if (!data) {
            return { success: false, error: 'Decompression failed' };
        }
        
        STATE.loadSaveData(data);
        STATE.emit('gameLoaded', { slot, timestamp: saved.timestamp });
        
        return { success: true, data };
    };
    
    // Get slot info
    const getSlotInfo = (slot) => {
        const key = `saveFile${slot}`;
        const saved = UTILS.storage.get(key);
        
        if (!saved) {
            return { exists: false, slot };
        }
        
        return {
            exists: true,
            slot,
            timestamp: saved.timestamp,
            size: saved.size,
            version: saved.version,
            preview: getSlotPreview(slot)
        };
    };
    
    // Get preview data for slot
    const getSlotPreview = (slot) => {
        const key = `saveFile${slot}`;
        const saved = UTILS.storage.get(key);
        
        if (!saved) return null;
        
        const data = decompress(saved.data);
        if (!data) return null;
        
        return {
            partyName: data.party?.units?.[0]?.name || 'Unknown',
            location: `${data.party?.y || 0}, ${data.party?.x || 0}`,
            playtime: calculatePlaytime(data.savedAt),
            species: data.party?.units?.[0]?.Tags?.[0] || 'Unknown'
        };
    };
    
    // Calculate approximate playtime
    const calculatePlaytime = (savedAt) => {
        if (!savedAt) return 'Unknown';
        const saved = new Date(savedAt);
        const now = new Date();
        const hours = Math.floor((now - saved) / (1000 * 60 * 60));
        if (hours < 1) return '< 1 hour';
        if (hours === 1) return '1 hour';
        return `${hours} hours`;
    };
    
    // Update slot metadata
    const updateSlotMetadata = (slot, data) => {
        const metadata = UTILS.storage.get(KEYS.METADATA) || {};
        metadata[slot] = {
            lastSaved: new Date().toISOString(),
            partyName: data.party?.units?.[0]?.name,
            version: CONFIG.VERSION
        };
        UTILS.storage.set(KEYS.METADATA, metadata);
    };
    
    // Delete save
    const deleteSlot = (slot) => {
        const key = `saveFile${slot}`;
        UTILS.storage.remove(key);
        
        const metadata = UTILS.storage.get(KEYS.METADATA) || {};
        delete metadata[slot];
        UTILS.storage.set(KEYS.METADATA, metadata);
        
        STATE.emit('saveDeleted', { slot });
        return true;
    };
    
    // Export save as file
    const exportSave = (slot) => {
        const key = `saveFile${slot}`;
        const saved = UTILS.storage.get(key);
        
        if (!saved) return false;
        
        const data = JSON.stringify(saved, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `fffme_save_${slot}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    };
    
    // Import save from file
    const importSave = async (file, slot) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const result = saveToSlot(slot, decompress(data.data));
                    resolve(result);
                } catch (err) {
                    resolve({ success: false, error: 'Invalid save file' });
                }
            };
            
            reader.onerror = () => {
                resolve({ success: false, error: 'File read failed' });
            };
            
            reader.readAsText(file);
        });
    };
    
    // Auto-save
    let autoSaveInterval = null;
    
    const startAutoSave = (intervalMinutes = 5) => {
        stopAutoSave();
        autoSaveInterval = setInterval(() => {
            const currentSlot = UTILS.storage.get('currentSaveSlot') || 1;
            saveToSlot(currentSlot);
            UI.showToast('Game auto-saved', 'info', 2000);
        }, intervalMinutes * 60 * 1000);
    };
    
    const stopAutoSave = () => {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            autoSaveInterval = null;
        }
    };
    
    return {
        KEYS,
        MAX_SIZE,
        compress,
        decompress,
        Compressinator,
        decompressMap,
        saveToSlot,
        loadFromSlot,
        getSlotInfo,
        getSlotPreview,
        deleteSlot,
        exportSave,
        importSave,
        startAutoSave,
        stopAutoSave
    };
})();

window.SAVE = SAVE;
