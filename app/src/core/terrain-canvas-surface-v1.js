/**
 * YOU ARE WILD TERRAIN CANVAS SURFACE V1
 *
 * Composes cached fixed chunks into one camera-controlled canvas. The close
 * traversal surface and broad map are camera presets over this same surface.
 */

const YAW_TERRAIN_CANVAS_SURFACE_V1 = (() => {
    const VERSION = 1;

    function create(target, options = {}) {
        if (!target || typeof target.getContext !== 'function') throw new TypeError('Terrain canvas surface requires a canvas');
        if (typeof options.resolveTile !== 'function') throw new TypeError('Terrain canvas surface requires resolveTile(x, y)');
        const context = target.getContext('2d');
        if (!context) throw new TypeError('Terrain canvas surface requires CanvasRenderingContext2D');
        const chunkSize = Math.max(1, Math.min(128, Math.trunc(Number(options.chunkSize) || YAW_TERRAIN_SCENE_V1.DEFAULT_CHUNK_SIZE)));
        const apron = Math.max(0, Math.min(8, Math.trunc(Number(options.apron) || YAW_TERRAIN_SCENE_V1.DEFAULT_APRON)));
        const cacheTilePixels = Math.max(16, Math.min(256, Number(options.cacheTilePixels) || 64));
        const maxCacheEntries = Math.max(8, Math.min(512, Math.trunc(Number(options.maxCacheEntries) || 96)));
        const createCanvas = typeof options.createCanvas === 'function'
            ? options.createCanvas
            : (() => document.createElement('canvas'));
        const chunkCache = new Map();
        let destroyed = false;
        let worldRevision = String(options.worldRevision || 'unversioned');
        let displayWidth = Math.max(1, Number(options.width) || target.clientWidth || 320);
        let displayHeight = Math.max(1, Number(options.height) || target.clientHeight || 320);
        let camera = YAW_TERRAIN_VIEWPORT_V1.create({
            centerX: options.centerX,
            centerY: options.centerY,
            width: displayWidth,
            height: displayHeight,
            zoom: options.zoom,
            baseTilePixels: options.baseTilePixels,
            minZoom: options.minZoom,
            maxZoom: options.maxZoom
        });

        function prepareDisplay() {
            const width = displayWidth;
            const height = displayHeight;
            const pixelRatio = Math.max(1, Math.min(4, Number(options.pixelRatio) || (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)));
            camera = YAW_TERRAIN_VIEWPORT_V1.resize(camera, width, height);
            target.width = Math.round(width * pixelRatio);
            target.height = Math.round(height * pixelRatio);
            if (target.style) {
                target.style.width = `${width}px`;
                target.style.height = `${height}px`;
            }
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            context.clearRect(0, 0, width, height);
            return { width, height, pixelRatio };
        }

        function chunkRaster(address) {
            const scene = YAW_TERRAIN_SCENE_V1.compileChunk({
                chunkX: address.x,
                chunkY: address.y,
                chunkSize,
                apron,
                worldRevision,
                resolveTile: options.resolveTile
            });
            const key = `${scene.cache.sceneKey}:canvas:${cacheTilePixels}`;
            if (chunkCache.has(key)) return chunkCache.get(key);
            const canvas = createCanvas();
            const renderer = YAW_TERRAIN_RENDERERS.create(YAW_TERRAIN_CANVAS_V1.ID, canvas, {
                tilePixels: cacheTilePixels,
                pixelRatio: 1
            });
            const frame = renderer.render(scene);
            const raster = { key, canvas, scene, frame, renderer };
            chunkCache.set(key, raster);
            return raster;
        }

        function pruneCache(keepKeys) {
            if (chunkCache.size <= maxCacheEntries) return;
            for (const [key, raster] of chunkCache) {
                if (chunkCache.size <= maxCacheEntries) break;
                if (keepKeys.has(key)) continue;
                raster.renderer.destroy();
                chunkCache.delete(key);
            }
        }

        function render() {
            if (destroyed) throw new Error('Terrain canvas surface is destroyed');
            const display = prepareDisplay();
            const addresses = YAW_TERRAIN_VIEWPORT_V1.visibleChunks(camera, { chunkSize, overscanTiles: apron });
            const scale = YAW_TERRAIN_VIEWPORT_V1.tilePixels(camera);
            const renderedChunks = [];
            context.imageSmoothingEnabled = true;
            for (const address of addresses) {
                const raster = chunkRaster(address);
                const interior = raster.scene.interiorBounds;
                const topLeft = YAW_TERRAIN_VIEWPORT_V1.worldToScreen(camera, interior.minX - 0.5, interior.minY - 0.5);
                const width = interior.width * scale;
                const height = interior.height * scale;
                const source = raster.frame.interiorSourceRect;
                // Sample one cached pixel into the deterministic apron. Adjacent
                // chunks overlap with identical world content instead of exposing
                // transparent resampling fringes at fractional zoom.
                const sourcePad = Math.min(1, source.x, source.y);
                const destinationPad = sourcePad * scale / cacheTilePixels;
                context.drawImage(
                    raster.canvas,
                    source.x - sourcePad, source.y - sourcePad,
                    source.width + sourcePad * 2, source.height + sourcePad * 2,
                    topLeft.x - destinationPad, topLeft.y - destinationPad,
                    width + destinationPad * 2, height + destinationPad * 2
                );
                renderedChunks.push({ key: raster.key, x: topLeft.x, y: topLeft.y, width, height });
            }
            pruneCache(new Set(renderedChunks.map(chunk => chunk.key)));
            return {
                version: VERSION,
                mode: YAW_TERRAIN_VIEWPORT_V1.mode(camera),
                camera,
                display,
                renderedChunks,
                visibleBounds: YAW_TERRAIN_VIEWPORT_V1.visibleBounds(camera),
                cacheEntries: chunkCache.size
            };
        }

        function setCamera(next) {
            camera = YAW_TERRAIN_VIEWPORT_V1.create({
                centerX: next?.center?.x ?? camera.center.x,
                centerY: next?.center?.y ?? camera.center.y,
                width: next?.viewport?.width ?? camera.viewport.width,
                height: next?.viewport?.height ?? camera.viewport.height,
                zoom: next?.zoom ?? camera.zoom,
                baseTilePixels: next?.baseTilePixels ?? camera.baseTilePixels,
                minZoom: next?.limits?.minZoom ?? camera.limits.minZoom,
                maxZoom: next?.limits?.maxZoom ?? camera.limits.maxZoom
            });
            return camera;
        }

        function resize(width, height) {
            displayWidth = Math.max(1, Number(width) || displayWidth);
            displayHeight = Math.max(1, Number(height) || displayHeight);
            camera = YAW_TERRAIN_VIEWPORT_V1.resize(camera, displayWidth, displayHeight);
            return camera;
        }

        function setLocal(anchor = camera.center) {
            camera = YAW_TERRAIN_VIEWPORT_V1.local(camera, anchor);
            return camera;
        }

        function setSurvey(anchor = camera.center, visibleTiles = 17) {
            camera = YAW_TERRAIN_VIEWPORT_V1.survey(camera, anchor, visibleTiles);
            return camera;
        }

        function zoomAt(factor, screenX, screenY) {
            camera = YAW_TERRAIN_VIEWPORT_V1.zoomAt(camera, factor, screenX, screenY);
            return camera;
        }

        function panPixels(deltaX, deltaY) {
            camera = YAW_TERRAIN_VIEWPORT_V1.panPixels(camera, deltaX, deltaY);
            return camera;
        }

        function worldAt(screenX, screenY) {
            return YAW_TERRAIN_VIEWPORT_V1.screenToWorld(camera, screenX, screenY);
        }

        function tileAt(screenX, screenY) {
            const world = worldAt(screenX, screenY);
            return { x: Math.floor(world.x + 0.5), y: Math.floor(world.y + 0.5) };
        }

        function invalidate(revision = worldRevision) {
            worldRevision = String(revision || 'unversioned');
            for (const raster of chunkCache.values()) raster.renderer.destroy();
            chunkCache.clear();
        }

        function destroy() {
            if (destroyed) return;
            invalidate(worldRevision);
            target.width = 0;
            target.height = 0;
            destroyed = true;
        }

        return {
            version: VERSION,
            render,
            camera: () => camera,
            setCamera,
            resize,
            setLocal,
            setSurvey,
            zoomAt,
            panPixels,
            worldAt,
            tileAt,
            invalidate,
            destroy
        };
    }

    return { VERSION, create };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_CANVAS_SURFACE_V1 = YAW_TERRAIN_CANVAS_SURFACE_V1;
