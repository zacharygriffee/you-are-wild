/**
 * FightFuckFeed.me - CONFIG Module
 * Game constants, species data, and configuration
 */

const CONFIG = (() => {
    // Version and game balance
    const VERSION = "0.10.13.17";
    const eatValue = 3;
    const fuckValue = 2;
    
    // Species data
    const SPECIES = [
        "Bat", "Bear", "Bee", "Bunny", "Butterfly", "Carnage", "Cat", "Caterpillar",
        "Centaur", "Chicken", "Chocolate", "Cow", "Coyote", "Deer", "Dog", "Drow",
        "Elephant", "Faerie", "Fox", "Frog", "Gator", "Goat", "Goblin", "Gazelle",
        "Harpy", "Human", "Hyena", "Lizard", "Mosquito", "Mouse", "Naga", "Opossum",
        "Ork", "Otter", "Owl", "Pig", "Piranha", "Plant", "Raccoon", "Rat",
        "Salamander", "Sheep", "Shroom", "Slime", "Squirrel", "Tiger", "Toad",
        "Turkey", "Wolf"
    ];
    
    const SPECIES_DESC = [
        "A Bitey Bat", "A Brawny Bear", "A Buzzy Bee", "A Beloved Bunny",
        "A Beautiful Butterfly", "A Cleaving Carnage", "A Cute Cat",
        "A Carnivorous Caterpillar", "A Courageous Centaur", "A Concerned Chicken",
        "A Chunk Of Chocolate", "A Caring Cow", "A Cunning Coyote", "A Darling Deer",
        "A Domesticated Dog", "A Devious Drow", "An Enormous Elephant",
        "A Fickle Faerie", "A Feisty Fox", "A Friendly Frog", "A Grinning Gator",
        "A Gutsy Goat", "A Grubby Goblin", "A Graceful Gazelle", "A Hectic Harpy",
        "A Humble Human", "A Hilarious Hyena", "A Lanky Lizard", "A Malicious Mosquito",
        "A Modest Mouse", "A Noodley Naga", "An Outlined Opossum", "An Outraged Ork",
        "An Ornery Otter", "An Observant Owl", "A Pudgy Pig", "A Puny Piranha",
        "A Prickly Plant", "A Roguish Raccoon", "A Roughish Rat", "A Sneaky Salamander",
        "A Sleepy Sheep", "A Shy Shroom", "A Slimy Slime", "A Sneaky Squirrel",
        "A Tough Tiger", "A Tiresome Toad", "A Troublesome Turkey", "A Wily Wolf"
    ];
    
    // Biome configurations
    const BIOMES = {
        FOREST: { color: '#228B22', difficulty: 1 },
        JUNGLE: { color: '#006400', difficulty: 2 },
        CAVE: { color: '#696969', difficulty: 2 },
        CASTLE: { color: '#8B4513', difficulty: 3 },
        PLAINS: { color: '#90EE90', difficulty: 1 },
        SWAMP: { color: '#556B2F', difficulty: 2 },
        CANYON: { color: '#D2691E', difficulty: 3 }
    };
    
    // Save file templates
    const createSaveFile = (slot) => ({
        saves: 0,
        loads: 0,
        cheating: false,
        current_save: slot,
        version: VERSION
    });
    
    return {
        VERSION,
        eatValue,
        fuckValue,
        SPECIES,
        SPECIES_DESC,
        BIOMES,
        createSaveFile,
        MAX_SAVE_SLOTS: 3
    };
})();

// Make available globally for compatibility
window.CONFIG = CONFIG;
/**
 * FightFuckFeed.me - UTILS Module
 * Utility functions and helpers
 */

const UTILS = (() => {
    // ID generation
    let idCounter = 0;
    const NewID = () => ++idCounter;
    
    // Random utilities
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randomBool = (probability = 0.5) => Math.random() < probability;
    
    // String utilities
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const formatText = (template, ...values) => {
        return template.replace(/\{(\d+)\}/g, (match, index) => values[index] ?? match);
    };
    
    // Array utilities
    const shuffle = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };
    
    // Debounce for performance
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };
    
    // Throttle for performance
    const throttle = (func, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };
    
    // LocalStorage with error handling
    const storage = {
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Storage get error:', e);
                return defaultValue;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Storage set error:', e);
                return false;
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Storage remove error:', e);
                return false;
            }
        }
    };
    
    // Date/time utilities
    const getEasterDate = (year) => {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    };
    
    // Validation utilities
    const isValidCoordinate = (x, y) => typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y);
    const isInBounds = (x, y, width, height) => x >= 0 && x < width && y >= 0 && y < height;
    
    return {
        NewID,
        randomInt,
        randomChoice,
        randomBool,
        capitalize,
        formatText,
        shuffle,
        debounce,
        throttle,
        storage,
        getEasterDate,
        isValidCoordinate,
        isInBounds
    };
})();

window.UTILS = UTILS;
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
/**
 * FightFuckFeed.me - MAP Module
 * World generation, tile management, and navigation
 */

const MAP = (() => {
    const MAP_SIZE = 100; // Default map size
    
    // Get map tile at coordinates
    const GetMap = (y = -1000, x = -1000) => {
        const map = STATE.getMap();
        if (y === -1000) y = STATE.getParty()?.y ?? 0;
        if (x === -1000) x = STATE.getParty()?.x ?? 0;
        return map[y]?.[x] ?? null;
    };
    
    // Get tile crossroad info
    const GetMapCrossroad = (y, x) => {
        const tile = GetMap(y, x);
        return tile?.crossroad ?? null;
    };
    
    // Get tile tag (biome type)
    const GetMapTag = (y, x) => {
        const tile = GetMap(y, x);
        return tile?.tag ?? 'Plains';
    };
    
    // Check if tile can be made (exists)
    const GetMapTagCanMake = (y, x) => {
        return GetMap(y, x) !== null;
    };
    
    // Get tile name
    const GetMapName = (y, x) => {
        const tile = GetMap(y, x);
        return tile?.name ?? 'Unknown';
    };
    
    // Get tile with offset
    const GetMapOffset = (yMod, xMod) => {
        const party = STATE.getParty();
        return GetMap(party.y + yMod, party.x + xMod);
    };
    
    // Get tile object
    const GetMapObject = (y, x) => {
        const tile = GetMap(y, x);
        return tile?.object ?? null;
    };
    
    // Get compact tile data
    const GMTC = (val) => {
        // Compactinator for map tiles
        return typeof val === 'object' ? JSON.stringify(val).length : val;
    };
    
    // Get full tile data
    const GetMapTile = (y, x) => {
        const map = STATE.getMap();
        if (!map[y]) map[y] = [];
        if (!map[y][x]) {
            map[y][x] = MakeMapTile(y, x);
        }
        return map[y][x];
    };
    
    // Get tile color
    const GetMapTileColor = (y, x) => {
        const tile = GetMap(y, x);
        if (!tile) return '#cccccc';
        
        const biomeColors = {
            'Forest': '#228B22',
            'Jungle': '#006400',
            'Cave': '#696969',
            'Castle': '#8B4513',
            'Plains': '#90EE90',
            'Swamp': '#556B2F',
            'Canyon': '#D2691E',
            'Water': '#4169E1'
        };
        
        return biomeColors[tile.tag] ?? '#cccccc';
    };
    
    const GetMapTileColor2 = (y, x) => {
        // Secondary color (for borders, etc.)
        return GetMapTileColor(y, x);
    };
    
    // Check tile proximity
    const IsMapTileNearName = (name, y, x, checkCorners = true, canBeEmpty = false) => {
        const offsets = checkCorners ? [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ] : [
            [-1, 0], [0, -1], [0, 1], [1, 0]
        ];
        
        return offsets.some(([dy, dx]) => {
            const tile = GetMap(y + dy, x + dx);
            if (!tile) return canBeEmpty;
            return tile.name?.includes(name) || tile.tag?.includes(name);
        });
    };
    
    const CountMapTileNearName = (name, y, x, checkCorners = true) => {
        const offsets = checkCorners ? [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ] : [
            [-1, 0], [0, -1], [0, 1], [1, 0]
        ];
        
        return offsets.filter(([dy, dx]) => {
            const tile = GetMap(y + dy, x + dx);
            return tile && (tile.name?.includes(name) || tile.tag?.includes(name));
        }).length;
    };
    
    const IsMapTileANumber = (y, x) => {
        const tile = GetMap(y, x);
        return tile && typeof tile.id === 'number';
    };
    
    const IsMapTileNearAPath = (y, x, checkCorners = true) => {
        return IsMapTileNearName('Path', y, x, checkCorners, false);
    };
    
    const IsMapTileAPath = (y, x) => {
        const tile = GetMap(y, x);
        return tile?.tag === 'Path' || tile?.isPath === true;
    };
    
    const IsMapTileNearWater = (y, x, checkCorners = true) => {
        return IsMapTileNearName('Water', y, x, checkCorners, false);
    };
    
    const IsMapTileNearPlains = (y, x, checkCorners = true) => {
        return IsMapTileNearName('Plains', y, x, checkCorners, false);
    };
    
    const IsMapTilePlains = (y, x) => {
        return GetMapTag(y, x) === 'Plains';
    };
    
    // Generate a new tile
    const MakeMapTile = (y, x) => {
        const seed = y * 10000 + x;
        UTILS.randomInt(seed, seed + 1000); // Seed random
        
        const tile = {
            x,
            y,
            id: UTILS.NewID(),
            tag: 'Plains',
            name: 'Plains',
            discovered: false,
            units: [],
            objects: [],
            travel: null,
            crossroad: null,
            biome: 'Plains'
        };
        
        // Biome generation logic (simplified)
        const noise = Math.sin(y * 0.1) * Math.cos(x * 0.1);
        if (noise > 0.5) {
            tile.tag = 'Forest';
            tile.name = 'Forest';
            tile.biome = 'Forest';
        } else if (noise < -0.5) {
            tile.tag = 'Cave';
            tile.name = 'Cave Entrance';
            tile.biome = 'Cave';
        }
        
        // Ensure map structure exists
        const map = STATE.getMap();
        if (!map[y]) map[y] = [];
        map[y][x] = tile;
        
        return tile;
    };
    
    // Movement
    const Walk = (dy, dx, fastTravel = false) => {
        const party = STATE.getParty();
        if (!party) return false;
        
        const newY = party.y + dy;
        const newX = party.x + dx;
        
        // Check bounds
        if (newY < 0 || newX < 0) return false;
        
        // Ensure tile exists
        const tile = GetMapTile(newY, newX);
        if (!tile) return false;
        
        // Update position
        party.y = newY;
        party.x = newX;
        tile.discovered = true;
        
        STATE.set('lastMove', [dy, dx]);
        
        // Trigger encounter check
        if (!fastTravel && tile.units?.length > 0) {
            STATE.emit('encounter', { tile, party });
        }
        
        STATE.emit('move', { y: newY, x: newX, tile });
        return true;
    };
    
    // Initialize empty map
    const initMap = (size = MAP_SIZE) => {
        const map = [];
        for (let y = 0; y < size; y++) {
            map[y] = [];
        }
        STATE.setMap(map);
        return map;
    };
    
    // Render helpers
    const RenderPlayerOnMap = (color) => {
        const party = STATE.getParty();
        if (!party) return null;
        return { y: party.y, x: party.x, color };
    };
    
    // Drawing on canvas
    const Draw = (ctx, y, x, color, painting = false) => {
        if (!ctx) return;
        ctx.fillStyle = color;
        const size = painting ? 2 : 10;
        ctx.fillRect(x * size, y * size, size, size);
    };
    
    return {
        // Getters
        GetMap,
        GetMapCrossroad,
        GetMapTag,
        GetMapTagCanMake,
        GetMapName,
        GetMapOffset,
        GetMapObject,
        GMTC,
        GetMapTile,
        GetMapTileColor,
        GetMapTileColor2,
        
        // Proximity checks
        IsMapTileNearName,
        CountMapTileNearName,
        IsMapTileANumber,
        IsMapTileNearAPath,
        IsMapTileAPath,
        IsMapTileNearWater,
        IsMapTileNearPlains,
        IsMapTilePlains,
        
        // Generation
        MakeMapTile,
        initMap,
        
        // Movement
        Walk,
        
        // Rendering
        RenderPlayerOnMap,
        Draw,
        
        // Constants
        MAP_SIZE
    };
})();

window.MAP = MAP;
/**
 * FightFuckFeed.me - COMBAT Module
 * Battle system, actions, and encounter handling
 */

const COMBAT = (() => {
    // Action types
    const ACTIONS = {
        FIGHT: 'fight',
        FUCK: 'fuck',
        FEED: 'feed',
        FLEE: 'flee',
        TALK: 'talk'
    };
    
    // Current encounter state
    let currentEncounter = null;
    
    // Select dom/sub for encounter
    const SelectDom = (entry) => {
        STATE.set('pick1', entry);
        STATE.emit('domSelected', entry);
    };
    
    const SelectSub = (entry) => {
        STATE.set('pick2', entry);
        STATE.emit('subSelected', entry);
    };
    
    // Select primary action
    const SelectAction = (entry) => {
        STATE.set('action', entry);
        
        const actionMap = {
            'fight': ACTIONS.FIGHT,
            'fuck': ACTIONS.FUCK,
            'feed': ACTIONS.FEED,
            'flee': ACTIONS.FLEE,
            'talk': ACTIONS.TALK
        };
        
        const action = actionMap[entry] ?? entry;
        STATE.emit('actionSelected', action);
        
        // Process immediate actions
        if (action === ACTIONS.FLEE) {
            attemptFlee();
        }
    };
    
    // Select secondary action
    const SelectAction2 = (entry) => {
        STATE.set('action2', entry);
        STATE.emit('action2Selected', entry);
    };
    
    // Lethal check for dangerous actions
    const LethalCheck = (dom) => {
        const encounter = STATE.getEncounter();
        if (!encounter) return false;
        
        // Check if action would be lethal
        const isLethal = encounter.lethal || dom?.lethal;
        
        if (isLethal) {
            STATE.emit('lethalWarning', { dom, encounter });
        }
        
        return isLethal;
    };
    
    const CheckActionTwo = () => {
        const action2 = STATE.get('action2');
        return action2 !== -1 && action2 !== '';
    };
    
    const RenderActionTwo = () => {
        // Render secondary action options
        const action2 = STATE.get('action2');
        return {
            selected: action2,
            canConfirm: CheckActionTwo()
        };
    };
    
    // Feeding mechanics
    const CanNommed = (pick1, pick2) => {
        if (pick1 === -1 || pick2 === -1) return false;
        
        const party = STATE.getParty();
        const units = party.units;
        
        if (!units[pick1] || !units[pick2]) return false;
        
        // Check size/power difference
        const dom = units[pick1];
        const sub = units[pick2];
        
        return dom.Feed >= sub.size && dom.willing !== 'NEVER';
    };
    
    const CanCocked = (pick1, pick2) => {
        if (pick1 === -1 || pick2 === -1) return false;
        
        const party = STATE.getParty();
        const units = party.units;
        
        if (!units[pick1] || !units[pick2]) return false;
        
        const dom = units[pick1];
        const sub = units[pick2];
        
        return dom.male && dom.cocksize >= sub.size && dom.willing !== 'NEVER';
    };
    
    // Attempt to flee
    const attemptFlee = () => {
        const encounter = STATE.getEncounter();
        const party = STATE.getParty();
        
        // Flee chance based on speed comparison
        const partySpeed = party.units[0]?.speed ?? 5;
        const enemySpeed = encounter.hostile?.speed ?? 5;
        
        const fleeChance = 0.5 + (partySpeed - enemySpeed) * 0.1;
        const success = Math.random() < fleeChance;
        
        if (success) {
            STATE.emit('fleeSuccess', { encounter });
            endEncounter();
        } else {
            STATE.emit('fleeFail', { encounter });
            // Enemy gets free attack
        }
        
        return success;
    };
    
    // Execute combat action
    const executeAction = () => {
        const action = STATE.get('action');
        const pick1 = STATE.get('pick1');
        const pick2 = STATE.get('pick2');
        
        const result = {
            action,
            pick1,
            pick2,
            success: false,
            message: ''
        };
        
        switch (action) {
            case ACTIONS.FIGHT:
                result.success = executeFight(pick1, pick2);
                break;
            case ACTIONS.FUCK:
                result.success = executeFuck(pick1, pick2);
                break;
            case ACTIONS.FEED:
                result.success = executeFeed(pick1, pick2);
                break;
            case ACTIONS.TALK:
                result.success = executeTalk(pick1, pick2);
                break;
        }
        
        STATE.emit('actionExecuted', result);
        return result;
    };
    
    const executeFight = (domIdx, subIdx) => {
        const party = STATE.getParty();
        const dom = party.units[domIdx];
        const sub = party.units[subIdx];
        
        if (!dom || !sub) return false;
        
        // Combat calculation
        const damage = Math.max(1, dom.attack - (sub.defense ?? 0));
        sub.hp = (sub.hp ?? 10) - damage;
        
        if (sub.hp <= 0) {
            // Defeated
            STATE.emit('unitDefeated', { winner: dom, loser: sub });
        }
        
        return true;
    };
    
    const executeFuck = (domIdx, subIdx) => {
        const party = STATE.getParty();
        const dom = party.units[domIdx];
        const sub = party.units[subIdx];
        
        if (!dom || !sub) return false;
        
        // Relationship mechanics
        sub.relationship = (sub.relationship ?? 0) + 1;
        dom.fuckValue = (dom.fuckValue ?? 0) + CONFIG.fuckValue;
        
        STATE.emit('relationshipImproved', { dom, sub });
        
        return true;
    };
    
    const executeFeed = (domIdx, subIdx) => {
        if (!CanNommed(domIdx, subIdx)) return false;
        
        const party = STATE.getParty();
        const dom = party.units[domIdx];
        const sub = party.units[subIdx];
        
        // Remove sub from party
        party.units.splice(subIdx, 1);
        
        // Buff dom
        dom.Feed = (dom.Feed ?? 0) + CONFIG.eatValue;
        dom.fullness = (dom.fullness ?? 0) + sub.size;
        
        STATE.emit('unitConsumed', { predator: dom, prey: sub });
        
        return true;
    };
    
    const executeTalk = (domIdx, subIdx) => {
        const party = STATE.getParty();
        const sub = party.units[subIdx];
        
        if (!sub) return false;
        
        // Dialogue system
        const dialogue = generateDialogue(sub);
        STATE.emit('dialogue', { speaker: sub, text: dialogue });
        
        return true;
    };
    
    const generateDialogue = (unit) => {
        const lines = [
            `${unit.name} looks at you curiously.`,
            `"Greetings, traveler," ${unit.name} says.`,
            `${unit.name} seems ${UTILS.randomChoice(['friendly', 'cautious', 'interested'])}.`,
        ];
        return UTILS.randomChoice(lines);
    };
    
    // Start encounter
    const startEncounter = (encounterData) => {
        currentEncounter = encounterData;
        STATE.set('E', encounterData);
        STATE.set('pick1', -1);
        STATE.set('pick2', -1);
        STATE.set('action', -1);
        STATE.set('action2', -1);
        
        STATE.emit('encounterStart', encounterData);
    };
    
    // End encounter
    const endEncounter = () => {
        currentEncounter = null;
        STATE.set('E', {});
        STATE.emit('encounterEnd');
    };
    
    return {
        ACTIONS,
        SelectDom,
        SelectSub,
        SelectAction,
        SelectAction2,
        LethalCheck,
        CheckActionTwo,
        RenderActionTwo,
        CanNommed,
        CanCocked,
        executeAction,
        executeFight,
        executeFuck,
        executeFeed,
        executeTalk,
        attemptFlee,
        startEncounter,
        endEncounter
    };
})();

window.COMBAT = COMBAT;
/**
 * FightFuckFeed.me - UI Module
 * Interface rendering, buttons, and display management
 */

const UI = (() => {
    // Element references (cached)
    const elements = {};
    
    // Cache DOM elements
    const init = () => {
        elements.gridContainer = document.getElementById('gridContainer');
        elements.status = document.getElementById('status');
        elements.main = document.getElementById('main');
        elements.actions = document.getElementById('actions');
        elements.log = document.getElementById('log');
        elements.canvas = document.getElementById('myCanvas');
    };
    
    // Button creation helpers
    const createButton = (text, onClick, className = 'btnavl') => {
        const btn = document.createElement('button');
        btn.className = className;
        btn.textContent = text;
        btn.onclick = onClick;
        return btn;
    };
    
    // Wiki button (WBTN replacement)
    const WBTN = (text, link, selected, style = 'btnavl') => {
        if (selected) {
            style += ' btnact';
        }
        return `<button class="${style} interactive-item" onclick="HeaderSettings('${link}')" tabindex="0">${text}</button>`;
    };
    
    // Render status header
    const renderStatus = (text) => {
        if (elements.status) {
            elements.status.innerHTML = text;
        }
    };
    
    // Render main content
    const renderMain = (content) => {
        if (elements.main) {
            elements.main.innerHTML = content;
        }
    };
    
    // Render action buttons
    const renderActions = (actions) => {
        if (!elements.actions) return;
        
        elements.actions.innerHTML = '';
        
        if (Array.isArray(actions)) {
            actions.forEach(action => {
                const btn = createButton(action.text, action.onClick, action.className);
                elements.actions.appendChild(btn);
            });
        } else if (typeof actions === 'string') {
            elements.actions.innerHTML = actions;
        }
    };
    
    // Render log
    const renderLog = (message, type = 'info') => {
        if (!elements.log) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = message;
        
        elements.log.appendChild(entry);
        elements.log.scrollTop = elements.log.scrollHeight;
        
        // Limit log size
        while (elements.log.children.length > 100) {
            elements.log.removeChild(elements.log.firstChild);
        }
    };
    
    // Clear log
    const clearLog = () => {
        if (elements.log) {
            elements.log.innerHTML = '';
        }
    };
    
    // Map grid rendering
    const renderMapGrid = (visibleRange = 1) => {
        if (!elements.gridContainer) return;
        
        const party = STATE.getParty();
        if (!party) return;
        
        const container = elements.gridContainer;
        container.innerHTML = '';
        
        // Create 3x3 grid centered on player
        const directions = [
            { id: 'northwest', y: -1, x: -1 },
            { id: 'north', y: -1, x: 0 },
            { id: 'northeast', y: -1, x: 1 },
            { id: 'west', y: 0, x: -1 },
            { id: 'center', y: 0, x: 0 },
            { id: 'east', y: 0, x: 1 },
            { id: 'southwest', y: 1, x: -1 },
            { id: 'south', y: 1, x: 0 },
            { id: 'southeast', y: 1, x: 1 }
        ];
        
        // Add edge elements
        const edge = document.createElement('div');
        edge.className = 'grid-edge';
        container.appendChild(edge);
        
        directions.forEach(dir => {
            const tile = document.createElement('div');
            tile.id = `map_${dir.id}`;
            tile.className = dir.id === 'center' ? 'grid-item' : 'grid-item interactive-item';
            
            if (dir.id !== 'center') {
                tile.onclick = () => MAP.Walk(dir.y, dir.x);
            }
            
            const mapTile = MAP.GetMap(party.y + dir.y, party.x + dir.x);
            if (mapTile) {
                tile.style.backgroundColor = MAP.GetMapTileColor(party.y + dir.y, party.x + dir.x);
                if (mapTile.units?.length > 0) {
                    tile.textContent = '⚔️';
                }
            }
            
            container.appendChild(tile);
        });
    };
    
    // Draw minimap on canvas
    const DrawMiniMap = () => {
        const canvas = elements.canvas;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const party = STATE.getParty();
        if (!party) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw area around player
        const range = 5;
        for (let y = -range; y <= range; y++) {
            for (let x = -range; x <= range; x++) {
                const tile = MAP.GetMap(party.y + y, party.x + x);
                if (tile && tile.discovered) {
                    const color = MAP.GetMapTileColor(party.y + y, party.x + x);
                    MAP.Draw(ctx, y + range, x + range, color);
                }
            }
        }
        
        // Draw player
        MAP.Draw(ctx, range, range, '#ff0000');
    };
    
    // Draw hostile/peaceful maps
    const DrawHostileMap = () => {
        // Highlight hostile areas
        DrawMiniMap();
        const canvas = elements.canvas;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    const DrawPeaceMap = () => {
        // Highlight safe areas
        DrawMiniMap();
        const canvas = elements.canvas;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    // Modal/dialog system
    const showModal = (content, options = {}) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content ${options.className || ''}">
                ${options.title ? `<h3>${options.title}</h3>` : ''}
                <div class="modal-body">${content}</div>
                ${options.buttons ? `
                    <div class="modal-buttons">
                        ${options.buttons.map(btn => `
                            <button onclick="${btn.action}" class="${btn.className || 'btnavl'}">${btn.text}</button>
                        `).join('')}
                    </div>
                ` : ''}
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        return modal;
    };
    
    // Notification toast
    const showToast = (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };
    
    // Loading indicator
    const showLoading = (message = 'Loading...') => {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        loader.id = 'global-loader';
        document.body.appendChild(loader);
    };
    
    const hideLoading = () => {
        const loader = document.getElementById('global-loader');
        if (loader) loader.remove();
    };
    
    return {
        init,
        createButton,
        WBTN,
        renderStatus,
        renderMain,
        renderActions,
        renderLog,
        clearLog,
        renderMapGrid,
        DrawMiniMap,
        DrawHostileMap,
        DrawPeaceMap,
        showModal,
        showToast,
        showLoading,
        hideLoading
    };
})();

window.UI = UI;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', UI.init);
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
/**
 * FightFuckFeed.me - TUTORIAL Module
 * Interactive tutorial system for new players
 */

const TUTORIAL = (() => {
    // Tutorial steps
    const STEPS = [
        {
            id: 'welcome',
            title: 'Welcome to FightFuckFeed.me',
            content: 'This is a pred-focused sandbox text adventure. Explore, encounter monstergirls, and grow stronger through consumption and relationships.',
            highlight: null,
            position: 'center'
        },
        {
            id: 'movement',
            title: 'Moving Around',
            content: 'Click the grid squares around you to move. The center shows your current location. You can move in 8 directions (including diagonals).',
            highlight: '#gridContainer',
            position: 'bottom'
        },
        {
            id: 'encounters',
            title: 'Encounters',
            content: 'When you move into a tile with enemies, you\'ll enter an encounter. You can Fight, Fuck (romance), Feed (consume), or Flee.',
            highlight: '#main',
            position: 'top'
        },
        {
            id: 'actions',
            title: 'Actions',
            content: 'During encounters, select actions from the action panel. Different actions have different outcomes based on your stats.',
            highlight: '#actions',
            position: 'top'
        },
        {
            id: 'saving',
            title: 'Saving Your Game',
            content: 'Use the wiki menu to save your progress. You have 3 save slots. The game also auto-saves periodically.',
            highlight: null,
            position: 'center'
        },
        {
            id: 'wiki',
            title: 'Wiki & Help',
            content: 'The built-in wiki contains information about species, mechanics, and your discovered content. Check it when you need help!',
            highlight: null,
            position: 'center'
        }
    ];
    
    let currentStep = 0;
    let isActive = false;
    let overlay = null;
    let tooltip = null;
    
    // Check if tutorial should show
    const shouldShow = () => {
        const completed = UTILS.storage.get('tutorialCompleted');
        const dismissed = UTILS.storage.get('tutorialDismissed');
        return !completed && !dismissed;
    };
    
    // Start tutorial
    const start = () => {
        if (isActive) return;
        currentStep = 0;
        isActive = true;
        createOverlay();
        showStep();
        STATE.emit('tutorialStart');
    };
    
    // Create overlay
    const createOverlay = () => {
        overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-backdrop"></div>
            <div class="tutorial-tooltip">
                <div class="tutorial-header">
                    <h3 class="tutorial-title"></h3>
                    <button class="tutorial-close">&times;</button>
                </div>
                <div class="tutorial-content"></div>
                <div class="tutorial-progress">
                    <span class="tutorial-step-counter"></span>
                    <div class="tutorial-buttons">
                        <button class="tutorial-prev btn">Previous</button>
                        <button class="tutorial-next btnact">Next</button>
                        <button class="tutorial-skip btn">Skip Tutorial</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Event listeners
        overlay.querySelector('.tutorial-close').onclick = dismiss;
        overlay.querySelector('.tutorial-prev').onclick = prevStep;
        overlay.querySelector('.tutorial-next').onclick = nextStep;
        overlay.querySelector('.tutorial-skip').onclick = dismiss;
        
        // Close on backdrop click
        overlay.querySelector('.tutorial-backdrop').onclick = (e) => {
            if (e.target === e.currentTarget) dismiss();
        };
        
        // Keyboard navigation
        document.addEventListener('keydown', handleKeydown);
    };
    
    // Handle keyboard
    const handleKeydown = (e) => {
        if (!isActive) return;
        
        switch (e.key) {
            case 'ArrowRight':
            case 'Enter':
                nextStep();
                break;
            case 'ArrowLeft':
                prevStep();
                break;
            case 'Escape':
                dismiss();
                break;
        }
    };
    
    // Show current step
    const showStep = () => {
        const step = STEPS[currentStep];
        if (!step) {
            complete();
            return;
        }
        
        // Update content
        const title = overlay.querySelector('.tutorial-title');
        const content = overlay.querySelector('.tutorial-content');
        const counter = overlay.querySelector('.tutorial-step-counter');
        const prevBtn = overlay.querySelector('.tutorial-prev');
        const nextBtn = overlay.querySelector('.tutorial-next');
        
        title.textContent = step.title;
        content.innerHTML = step.content;
        counter.textContent = `Step ${currentStep + 1} of ${STEPS.length}`;
        
        // Update buttons
        prevBtn.disabled = currentStep === 0;
        prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
        
        if (currentStep === STEPS.length - 1) {
            nextBtn.textContent = 'Finish';
        } else {
            nextBtn.textContent = 'Next';
        }
        
        // Position and highlight
        positionTooltip(step);
        highlightElement(step.highlight);
        
        STATE.emit('tutorialStep', { step: currentStep, data: step });
    };
    
    // Position tooltip
    const positionTooltip = (step) => {
        const tooltip = overlay.querySelector('.tutorial-tooltip');
        
        if (step.position === 'center' || !step.highlight) {
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }
        
        const target = document.querySelector(step.highlight);
        if (!target) {
            // Fall back to center
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }
        
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        switch (step.position) {
            case 'bottom':
                tooltip.style.top = `${rect.bottom + 10}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'top':
                tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'left':
                tooltip.style.top = `${rect.top + rect.height / 2}px`;
                tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
                tooltip.style.transform = 'translateY(-50%)';
                break;
            case 'right':
                tooltip.style.top = `${rect.top + rect.height / 2}px`;
                tooltip.style.left = `${rect.right + 10}px`;
                tooltip.style.transform = 'translateY(-50%)';
                break;
        }
    };
    
    // Highlight element
    const highlightElement = (selector) => {
        // Remove existing highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        if (!selector) return;
        
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('tutorial-highlight');
        }
    };
    
    // Next step
    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            currentStep++;
            showStep();
        } else {
            complete();
        }
    };
    
    // Previous step
    const prevStep = () => {
        if (currentStep > 0) {
            currentStep--;
            showStep();
        }
    };
    
    // Dismiss tutorial
    const dismiss = () => {
        UTILS.storage.set('tutorialDismissed', true);
        cleanup();
        STATE.emit('tutorialDismiss');
    };
    
    // Complete tutorial
    const complete = () => {
        UTILS.storage.set('tutorialCompleted', true);
        UTILS.storage.set('tutorialVersion', '1.0');
        cleanup();
        
        // Show completion message
        UI.showToast('Tutorial completed! Check the wiki if you need help.', 'success', 5000);
        
        STATE.emit('tutorialComplete');
    };
    
    // Cleanup
    const cleanup = () => {
        isActive = false;
        document.removeEventListener('keydown', handleKeydown);
        
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    };
    
    // Reset tutorial (for testing)
    const reset = () => {
        UTILS.storage.remove('tutorialCompleted');
        UTILS.storage.remove('tutorialDismissed');
        UTILS.storage.remove('tutorialVersion');
        currentStep = 0;
    };
    
    // Get current step
    const getCurrentStep = () => currentStep;
    
    // Check if active
    const getIsActive = () => isActive;
    
    return {
        STEPS,
        shouldShow,
        start,
        nextStep,
        prevStep,
        dismiss,
        complete,
        reset,
        getCurrentStep,
        getIsActive
    };
})();

window.TUTORIAL = TUTORIAL;
