/**
 * YOU ARE WILD TERRAIN VIEWPORT V1
 *
 * Renderer-neutral camera math shared by the close 3x3 traversal view and the
 * broader survey map. Pointer and gesture code may propose camera changes;
 * core remains authoritative over movement, selection, and discovery.
 */

const YAW_TERRAIN_VIEWPORT_V1 = (() => {
    const VERSION = 1;
    const DEFAULT_BASE_TILE_PIXELS = 64;
    const DEFAULT_MIN_ZOOM = 0.125;
    const DEFAULT_MAX_ZOOM = 4;

    function finite(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function create(options = {}) {
        const minZoom = Math.max(0.03125, finite(options.minZoom, DEFAULT_MIN_ZOOM));
        const maxZoom = Math.max(minZoom, finite(options.maxZoom, DEFAULT_MAX_ZOOM));
        const baseTilePixels = clamp(finite(options.baseTilePixels, DEFAULT_BASE_TILE_PIXELS), 8, 512);
        return {
            version: VERSION,
            center: { x: finite(options.centerX), y: finite(options.centerY) },
            zoom: clamp(finite(options.zoom, 1), minZoom, maxZoom),
            limits: { minZoom, maxZoom },
            baseTilePixels,
            viewport: {
                width: Math.max(1, finite(options.width, 320)),
                height: Math.max(1, finite(options.height, 320))
            }
        };
    }

    function tilePixels(camera) {
        return camera.baseTilePixels * camera.zoom;
    }

    function mode(camera) {
        const pixels = tilePixels(camera);
        if (pixels >= 44) return 'local';
        if (pixels >= 14) return 'regional';
        return 'survey';
    }

    function worldToScreen(camera, worldX, worldY) {
        const scale = tilePixels(camera);
        return {
            x: camera.viewport.width / 2 + (finite(worldX) - camera.center.x) * scale,
            y: camera.viewport.height / 2 + (finite(worldY) - camera.center.y) * scale
        };
    }

    function screenToWorld(camera, screenX, screenY) {
        const scale = tilePixels(camera);
        return {
            x: camera.center.x + (finite(screenX) - camera.viewport.width / 2) / scale,
            y: camera.center.y + (finite(screenY) - camera.viewport.height / 2) / scale
        };
    }

    function visibleBounds(camera, options = {}) {
        const overscan = Math.max(0, Math.min(16, finite(options.overscanTiles, 1)));
        const topLeft = screenToWorld(camera, 0, 0);
        const bottomRight = screenToWorld(camera, camera.viewport.width, camera.viewport.height);
        return {
            minX: Math.floor(topLeft.x - overscan),
            minY: Math.floor(topLeft.y - overscan),
            maxX: Math.ceil(bottomRight.x + overscan) - 1,
            maxY: Math.ceil(bottomRight.y + overscan) - 1
        };
    }

    function visibleChunks(camera, options = {}) {
        if (typeof YAW_TERRAIN_SCENE_V1 === 'undefined') throw new Error('Terrain Viewport V1 requires Terrain Scene V1');
        const chunkSize = Math.max(1, Math.min(128, Math.trunc(finite(options.chunkSize, YAW_TERRAIN_SCENE_V1.DEFAULT_CHUNK_SIZE))));
        const bounds = visibleBounds(camera, options);
        const first = YAW_TERRAIN_SCENE_V1.chunkAddress(bounds.minX, bounds.minY, chunkSize);
        const last = YAW_TERRAIN_SCENE_V1.chunkAddress(bounds.maxX, bounds.maxY, chunkSize);
        const result = [];
        for (let y = first.y; y <= last.y; y += 1) {
            for (let x = first.x; x <= last.x; x += 1) result.push({ x, y, size: chunkSize, key: `${x},${y}` });
        }
        return result;
    }

    function resize(camera, width, height) {
        return {
            ...camera,
            viewport: { width: Math.max(1, finite(width, camera.viewport.width)), height: Math.max(1, finite(height, camera.viewport.height)) }
        };
    }

    function recenter(camera, x, y) {
        return { ...camera, center: { x: finite(x, camera.center.x), y: finite(y, camera.center.y) } };
    }

    function panPixels(camera, deltaX, deltaY) {
        const scale = tilePixels(camera);
        return {
            ...camera,
            center: {
                x: camera.center.x - finite(deltaX) / scale,
                y: camera.center.y - finite(deltaY) / scale
            }
        };
    }

    function zoomAt(camera, factorValue, screenX = camera.viewport.width / 2, screenY = camera.viewport.height / 2) {
        const factor = Math.max(0.01, finite(factorValue, 1));
        const anchor = screenToWorld(camera, screenX, screenY);
        const zoom = clamp(camera.zoom * factor, camera.limits.minZoom, camera.limits.maxZoom);
        const scaled = { ...camera, zoom };
        const displacedAnchor = screenToWorld(scaled, screenX, screenY);
        return {
            ...scaled,
            center: {
                x: scaled.center.x + anchor.x - displacedAnchor.x,
                y: scaled.center.y + anchor.y - displacedAnchor.y
            }
        };
    }

    function fitTiles(camera, tileCount, anchor = camera.center) {
        const count = Math.max(1, finite(tileCount, 3));
        const pixels = Math.min(camera.viewport.width, camera.viewport.height) / count;
        const zoom = clamp(pixels / camera.baseTilePixels, camera.limits.minZoom, camera.limits.maxZoom);
        return { ...camera, center: { x: finite(anchor.x), y: finite(anchor.y) }, zoom };
    }

    function local(camera, anchor = camera.center) {
        return fitTiles(camera, 3, anchor);
    }

    function survey(camera, anchor = camera.center, visibleTiles = 17) {
        return fitTiles(camera, Math.max(7, finite(visibleTiles, 17)), anchor);
    }

    function pinchFactor(startDistance, currentDistance) {
        const start = Math.max(1, finite(startDistance, 1));
        return Math.max(0.01, finite(currentDistance, start) / start);
    }

    return {
        VERSION, DEFAULT_BASE_TILE_PIXELS, DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM,
        create, tilePixels, mode, worldToScreen, screenToWorld, visibleBounds,
        visibleChunks, resize, recenter, panPixels, zoomAt, fitTiles, local,
        survey, pinchFactor
    };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_VIEWPORT_V1 = YAW_TERRAIN_VIEWPORT_V1;
