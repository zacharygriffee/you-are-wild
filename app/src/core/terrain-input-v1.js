/**
 * YOU ARE WILD TERRAIN INPUT V1
 *
 * Backend-neutral interpretation of terrain pointer coordinates. This module
 * proposes intents only; App movement, discovery, traversal, and narration
 * remain authoritative.
 */

const YAW_TERRAIN_INPUT_V1 = (() => {
    const VERSION = 1;
    const DEFAULT_DRAG_THRESHOLD = 8;

    function finite(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function point(value = {}) {
        return { x: finite(value.x), y: finite(value.y) };
    }

    function distance(left, right) {
        const a = point(left);
        const b = point(right);
        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    function movedBeyond(start, current, threshold = DEFAULT_DRAG_THRESHOLD) {
        return distance(start, current) >= Math.max(1, finite(threshold, DEFAULT_DRAG_THRESHOLD));
    }

    function integerTile(value = {}) {
        const x = Number(value.x);
        const y = Number(value.y);
        if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
        return { x, y };
    }

    function intentForTile(mode, playerLocation, selectedTile) {
        const player = integerTile(playerLocation);
        const tile = integerTile(selectedTile);
        if (!player || !tile) return { kind: 'ignore', reason: 'invalid-coordinate' };
        if (mode !== 'local') return { kind: 'inspect', tile };
        const dx = tile.x - player.x;
        const dy = tile.y - player.y;
        if (dx === 0 && dy === 0) return { kind: 'current', tile };
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            return { kind: 'move', dx, dy, tile };
        }
        return { kind: 'ignore', reason: 'outside-local-neighborhood', tile };
    }

    function keyboardPan(event = {}) {
        const key = String(event.key || '');
        const code = String(event.code || '');
        const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
        const directions = {
            ArrowUp: { dx: 0, dy: -1 }, KeyW: { dx: 0, dy: -1 }, w: { dx: 0, dy: -1 },
            ArrowDown: { dx: 0, dy: 1 }, KeyS: { dx: 0, dy: 1 }, s: { dx: 0, dy: 1 },
            ArrowLeft: { dx: -1, dy: 0 }, KeyA: { dx: -1, dy: 0 }, a: { dx: -1, dy: 0 },
            ArrowRight: { dx: 1, dy: 0 }, KeyD: { dx: 1, dy: 0 }, d: { dx: 1, dy: 0 }
        };
        return directions[code] || directions[normalizedKey] || null;
    }

    return { VERSION, DEFAULT_DRAG_THRESHOLD, point, distance, movedBeyond, intentForTile, keyboardPan };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_INPUT_V1 = YAW_TERRAIN_INPUT_V1;
