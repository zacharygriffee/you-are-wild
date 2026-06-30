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
