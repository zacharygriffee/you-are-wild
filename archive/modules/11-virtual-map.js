/**
 * FightFuckFeed.me - VIRTUAL-MAP Module
 * Optimized map rendering with virtual scrolling
 */

const VIRTUAL_MAP = (() => {
    // Configuration
    const CONFIG = {
        TILE_SIZE: 10,
        VISIBLE_RANGE: 5,
        BUFFER_SIZE: 2
    };
    
    // Canvas and context
    let canvas = null;
    let ctx = null;
    
    // Viewport state
    let viewport = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };
    
    // Visible tile cache
    let visibleTiles = new Map();
    let renderQueue = [];
    
    // Initialize
    const init = (canvasId) => {
        canvas = document.getElementById(canvasId);
        if (!canvas) return false;
        
        ctx = canvas.getContext('2d', { alpha: false }); // Optimize
        resize();
        
        // Handle resize
        window.addEventListener('resize', UTILS.throttle(resize, 100));
        
        return true;
    };
    
    // Resize canvas
    const resize = () => {
        const parent = canvas.parentElement;
        canvas.width = parent?.clientWidth || 300;
        canvas.height = parent?.clientHeight || 300;
        
        viewport.width = Math.ceil(canvas.width / CONFIG.TILE_SIZE);
        viewport.height = Math.ceil(canvas.height / CONFIG.TILE_SIZE);
    };
    
    // Calculate visible range
    const getVisibleRange = (centerX, centerY) => {
        const halfWidth = Math.floor(viewport.width / 2);
        const halfHeight = Math.floor(viewport.height / 2);
        
        return {
            minX: centerX - halfWidth - CONFIG.BUFFER_SIZE,
            maxX: centerX + halfWidth + CONFIG.BUFFER_SIZE,
            minY: centerY - halfHeight - CONFIG.BUFFER_SIZE,
            maxY: centerY + halfHeight + CONFIG.BUFFER_SIZE
        };
    };
    
    // Render map centered on player
    const render = (centerX, centerY) => {
        if (!ctx) return;
        
        // Clear canvas
        ctx.fillStyle = '#2e4052';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const range = getVisibleRange(centerX, centerY);
        const newVisible = new Map();
        
        // Render tiles
        for (let y = range.minY; y <= range.maxY; y++) {
            for (let x = range.minX; x <= range.maxX; x++) {
                const tile = MAP.GetMap(y, x);
                const screenX = (x - centerX) * CONFIG.TILE_SIZE + canvas.width / 2;
                const screenY = (y - centerY) * CONFIG.TILE_SIZE + canvas.height / 2;
                
                // Skip if off-screen
                if (screenX < -CONFIG.TILE_SIZE || screenX > canvas.width ||
                    screenY < -CONFIG.TILE_SIZE || screenY > canvas.height) {
                    continue;
                }
                
                // Draw tile
                drawTile(ctx, tile, screenX, screenY, x === centerX && y === centerY);
                
                // Cache
                newVisible.set(`${x},${y}`, tile);
            }
        }
        
        visibleTiles = newVisible;
        
        // Draw player marker
        const playerX = canvas.width / 2;
        const playerY = canvas.height / 2;
        drawPlayerMarker(ctx, playerX, playerY);
    };
    
    // Draw individual tile
    const drawTile = (ctx, tile, x, y, isPlayer) => {
        let color = '#cccccc';
        
        if (tile) {
            if (tile.discovered) {
                color = MAP.GetMapTileColor(tile.y, tile.x);
            } else {
                color = '#1a1a1a'; // Undiscovered
            }
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        
        // Draw grid lines
        ctx.strokeStyle = '#2e4052';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        
        // Draw units if present
        if (tile?.units?.length > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(x + CONFIG.TILE_SIZE/2, y + CONFIG.TILE_SIZE/2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    
    // Draw player marker
    const drawPlayerMarker = (ctx, x, y) => {
        ctx.fillStyle = '#FCEB88';
        ctx.beginPath();
        ctx.arc(x + CONFIG.TILE_SIZE/2, y + CONFIG.TILE_SIZE/2, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.shadowColor = '#FCEB88';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    };
    
    // Click to move
    const handleClick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convert to tile coordinates
        const party = STATE.getParty();
        const tileX = Math.floor((clickX - canvas.width / 2) / CONFIG.TILE_SIZE) + party.x;
        const tileY = Math.floor((clickY - canvas.height / 2) / CONFIG.TILE_SIZE) + party.y;
        
        // Calculate direction
        const dx = tileX - party.x;
        const dy = tileY - party.y;
        
        // Only move one tile at a time
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
            MAP.Walk(dy, dx);
        }
    };
    
    // Enable click handling
    const enableClick = () => {
        if (canvas) {
            canvas.addEventListener('click', handleClick);
        }
    };
    
    // Get visible tiles
    const getVisibleTiles = () => visibleTiles;
    
    return {
        init,
        resize,
        render,
        enableClick,
        getVisibleTiles,
        CONFIG
    };
})();

window.VIRTUAL_MAP = VIRTUAL_MAP;
