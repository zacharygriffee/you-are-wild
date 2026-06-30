/**
 * FightFuckFeed.me - STATE Module
 * Centralized game state management
 */

const STATE = (() => {
    // Core game state - marked with SAVENEEDED for persistence
    const gameState = {
        // Party and characters
        party: {},
        
        // World state
        map: [],
        travel: null,
        
        // Game progression
        version: CONFIG.VERSION,
        temp: {},
        tempInits: [],
        prevInit: 1,
        currInit: 1,
        inits: [],
        
        // Turn/action state
        foodtaketurn: "",
        skiptaketurn: "",
        pick1: -1,
        pick2: -1,
        action: -1,
        action2: -1,
        Good: "",
        Food: "",
        LastLog: "",
        Logbook: "",
        
        // Encounter state
        E: {},
        EventCountdown: 0,
        LogGameplay: false,
        lastMove: [0, 0],
        death: 0,
        nextNommed: null,
        
        // UI state
        settings: {
            playerGender: "female",
            targetGender: "female",
            // ... other settings
        },
        
        // Grid reference
        grid: null
    };
    
    // Event system for state changes
    const listeners = {};
    
    const on = (event, callback) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
    };
    
    const off = (event, callback) => {
        if (listeners[event]) {
            listeners[event] = listeners[event].filter(cb => cb !== callback);
        }
    };
    
    const emit = (event, data) => {
        if (listeners[event]) {
            listeners[event].forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error('State event error:', e);
                }
            });
        }
    };
    
    // Getters
    const get = (key) => gameState[key];
    const getParty = () => gameState.party;
    const getMap = () => gameState.map;
    const getSettings = () => gameState.settings;
    const getEncounter = () => gameState.E;
    
    // Setters with event emission
    const set = (key, value) => {
        const oldValue = gameState[key];
        gameState[key] = value;
        emit('stateChange', { key, value, oldValue });
        emit(`${key}Change`, { value, oldValue });
    };
    
    const setParty = (party) => {
        gameState.party = party;
        emit('partyChange', party);
    };
    
    const setMap = (map) => {
        gameState.map = map;
        emit('mapChange', map);
    };
    
    const setSettings = (settings) => {
        Object.assign(gameState.settings, settings);
        emit('settingsChange', gameState.settings);
    };
    
    // Helper for deep updates
    const update = (key, updater) => {
        const current = gameState[key];
        const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
        set(key, updated);
        return updated;
    };
    
    // Get serializable state for saving
    const getSaveData = () => ({
        party: gameState.party,
        map: gameState.map,
        version: gameState.version,
        temp: gameState.temp,
        tempInits: gameState.tempInits,
        prevInit: gameState.prevInit,
        currInit: gameState.currInit,
        inits: gameState.inits,
        foodtaketurn: gameState.foodtaketurn,
        skiptaketurn: gameState.skiptaketurn,
        pick1: gameState.pick1,
        pick2: gameState.pick2,
        action: gameState.action,
        action2: gameState.action2,
        Good: gameState.Good,
        Food: gameState.Food,
        LastLog: gameState.LastLog,
        Logbook: gameState.Logbook,
        EventCountdown: gameState.EventCountdown,
        LogGameplay: gameState.LogGameplay,
        lastMove: gameState.lastMove,
        death: gameState.death,
        settings: gameState.settings,
        savedAt: new Date().toISOString()
    });
    
    // Load saved state
    const loadSaveData = (data) => {
        Object.keys(data).forEach(key => {
            if (gameState.hasOwnProperty(key)) {
                gameState[key] = data[key];
            }
        });
        emit('stateLoaded', data);
    };
    
    // Reset to defaults
    const reset = () => {
        Object.keys(gameState).forEach(key => {
            if (key === 'settings') {
                gameState[key] = {};
            } else if (Array.isArray(gameState[key])) {
                gameState[key] = [];
            } else if (typeof gameState[key] === 'object' && gameState[key] !== null) {
                gameState[key] = {};
            } else if (typeof gameState[key] === 'number') {
                gameState[key] = key === 'version' ? CONFIG.VERSION : 0;
            } else {
                gameState[key] = '';
            }
        });
        emit('stateReset');
    };
    
    return {
        // Core state
        get,
        set,
        update,
        
        // Typed getters/setters
        getParty,
        setParty,
        getMap,
        setMap,
        getSettings,
        setSettings,
        getEncounter,
        
        // Save/Load
        getSaveData,
        loadSaveData,
        reset,
        
        // Events
        on,
        off,
        emit
    };
})();

window.STATE = STATE;
