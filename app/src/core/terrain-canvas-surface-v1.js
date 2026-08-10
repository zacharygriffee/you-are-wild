/**
 * YOU ARE WILD TERRAIN CANVAS SURFACE V1
 *
 * Composes cached fixed chunks into one camera-controlled canvas. The close
 * traversal surface and broad map are camera presets over this same surface.
 */

const YAW_TERRAIN_CANVAS_SURFACE_V1 = (() => {
    const VERSION = 1;
    const DEFAULT_QUALITY = 'balanced';
    const QUALITY_PROFILES = Object.freeze({
        performance: Object.freeze({
            local: Object.freeze({ tilePixels: 96, decorativeDensity: 1, maxCacheEntries: 8 }),
            regional: Object.freeze({ tilePixels: 64, decorativeDensity: 0.72, maxCacheEntries: 16 }),
            survey: Object.freeze({ tilePixels: 32, decorativeDensity: 0.26, maxCacheEntries: 24 })
        }),
        balanced: Object.freeze({
            local: Object.freeze({ tilePixels: 112, decorativeDensity: 1, maxCacheEntries: 6 }),
            regional: Object.freeze({ tilePixels: 64, decorativeDensity: 0.82, maxCacheEntries: 16 }),
            survey: Object.freeze({ tilePixels: 40, decorativeDensity: 0.42, maxCacheEntries: 24 })
        }),
        high: Object.freeze({
            local: Object.freeze({ tilePixels: 128, decorativeDensity: 1, maxCacheEntries: 4 }),
            regional: Object.freeze({ tilePixels: 64, decorativeDensity: 0.92, maxCacheEntries: 16 }),
            survey: Object.freeze({ tilePixels: 48, decorativeDensity: 0.58, maxCacheEntries: 24 })
        })
    });

    function normalizeQuality(value) {
        const quality = String(value || DEFAULT_QUALITY).toLowerCase();
        return Object.prototype.hasOwnProperty.call(QUALITY_PROFILES, quality) ? quality : DEFAULT_QUALITY;
    }

    function qualityPolicy(quality, mode) {
        const normalizedQuality = normalizeQuality(quality);
        const normalizedMode = ['local', 'regional', 'survey'].includes(mode) ? mode : 'regional';
        const profile = QUALITY_PROFILES[normalizedQuality][normalizedMode];
        return {
            id: `${normalizedQuality}:${normalizedMode}`,
            quality: normalizedQuality,
            mode: normalizedMode,
            tilePixels: profile.tilePixels,
            decorativeDensity: profile.decorativeDensity,
            maxCacheEntries: profile.maxCacheEntries
        };
    }

    function create(target, options = {}) {
        if (!target || typeof target.getContext !== 'function') throw new TypeError('Terrain canvas surface requires a canvas');
        if (typeof options.resolveTile !== 'function') throw new TypeError('Terrain canvas surface requires resolveTile(x, y)');
        const context = target.getContext('2d');
        if (!context) throw new TypeError('Terrain canvas surface requires CanvasRenderingContext2D');
        const chunkSize = Math.max(1, Math.min(128, Math.trunc(Number(options.chunkSize) || YAW_TERRAIN_SCENE_V1.DEFAULT_CHUNK_SIZE)));
        const apron = Math.max(0, Math.min(8, Math.trunc(Number(options.apron) || YAW_TERRAIN_SCENE_V1.DEFAULT_APRON)));
        const fixedCacheTilePixels = options.cacheTilePixels == null
            ? null
            : Math.max(16, Math.min(256, Number(options.cacheTilePixels) || 64));
        const fixedMaxCacheEntries = Math.max(1, Math.min(512, Math.trunc(Number(options.maxCacheEntries) || 96)));
        const fixedDecorativeDensity = options.decorativeDensity == null
            ? null
            : Math.max(0, Math.min(1, Number(options.decorativeDensity) || 0));
        const createCanvas = typeof options.createCanvas === 'function'
            ? options.createCanvas
            : (() => document.createElement('canvas'));
        const chunkCaches = new Map();
        let destroyed = false;
        let quality = normalizeQuality(options.quality);
        let worldRevision = String(options.worldRevision || 'unversioned');
        let displayWidth = Math.max(1, Number(options.width) || target.clientWidth || 320);
        let displayHeight = Math.max(1, Number(options.height) || target.clientHeight || 320);
        let lastRenderStats = null;
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

        function rasterPolicy() {
            if (fixedCacheTilePixels !== null) {
                return {
                    id: `fixed:${fixedCacheTilePixels}:${fixedDecorativeDensity ?? 'auto'}`,
                    quality: 'fixed',
                    mode: YAW_TERRAIN_VIEWPORT_V1.mode(camera),
                    tilePixels: fixedCacheTilePixels,
                    decorativeDensity: fixedDecorativeDensity,
                    maxCacheEntries: fixedMaxCacheEntries
                };
            }
            return qualityPolicy(quality, YAW_TERRAIN_VIEWPORT_V1.mode(camera));
        }

        function cacheFor(policy) {
            if (!chunkCaches.has(policy.id)) chunkCaches.set(policy.id, new Map());
            return chunkCaches.get(policy.id);
        }

        function chunkRaster(address, counters, policy, cache) {
            const key = `${address.x},${address.y}:${chunkSize}:${apron}:${policy.tilePixels}:${policy.decorativeDensity ?? 'auto'}`;
            if (cache.has(key)) {
                counters.hits += 1;
                return cache.get(key);
            }
            const scene = YAW_TERRAIN_SCENE_V1.compileChunk({
                chunkX: address.x,
                chunkY: address.y,
                chunkSize,
                apron,
                worldRevision,
                resolveTile: options.resolveTile
            });
            const canvas = createCanvas();
            const renderer = YAW_TERRAIN_RENDERERS.create(YAW_TERRAIN_CANVAS_V1.ID, canvas, {
                tilePixels: policy.tilePixels,
                pixelRatio: 1,
                decorativeDensity: policy.decorativeDensity
            });
            const frame = renderer.render(scene);
            const raster = { key, canvas, scene, frame, renderer, byteEstimate: canvas.width * canvas.height * 4 };
            cache.set(key, raster);
            counters.misses += 1;
            return raster;
        }

        function drawDynamicPresence(scale, display) {
            const source = typeof options.resolvePresence === 'function' ? options.resolvePresence() : [];
            const presence = Array.isArray(source) ? source.filter(Boolean) : [];
            const groups = new Map();
            for (const record of presence) {
                const x = Number(record.x);
                const y = Number(record.y);
                if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                const key = `${x},${y}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(record);
            }
            let painted = 0;
            for (const records of groups.values()) {
                records.forEach((record, ordinal) => {
                    const point = YAW_TERRAIN_VIEWPORT_V1.worldToScreen(camera, Number(record.x), Number(record.y));
                    if (point.x < -scale || point.y < -scale
                        || point.x > display.width + scale || point.y > display.height + scale) return;
                    const angle = (YAW_TERRAIN_SCENE_V1.hash32(record.id || record.label || ordinal, 'surface-presence') / 0xffffffff)
                        * Math.PI * 2;
                    const radius = ordinal ? Math.min(12, scale * 0.17) : 0;
                    const x = point.x + Math.cos(angle) * radius;
                    const y = point.y + Math.sin(angle) * radius;
                    context.fillStyle = record.role === 'player' ? '#f3da61'
                        : (record.role === 'party' ? '#55d8c2' : '#d4877d');
                    context.beginPath();
                    context.arc(x, y, Math.max(3, Math.min(9, scale * 0.085)), 0, Math.PI * 2);
                    context.fill();
                    context.strokeStyle = 'rgba(10,12,20,0.86)';
                    context.lineWidth = Math.max(1, Math.min(3, scale * 0.025));
                    context.stroke();
                    painted += 1;
                });
            }
            return painted;
        }

        function lightingPhase() {
            const source = typeof options.resolveLighting === 'function'
                ? options.resolveLighting()
                : options.lighting;
            const value = typeof source === 'string' ? source : source?.phase;
            return String(value || 'day').toLowerCase() === 'night' ? 'night' : 'day';
        }

        function drawLighting(display) {
            const phase = lightingPhase();
            if (phase !== 'night') return phase;
            // Lighting belongs to the camera composition, not a fixed terrain
            // chunk. A phase change therefore preserves geometry and warm
            // chunk rasters while tinting routes, relief, features, evidence,
            // and POIs together. Dynamic actor presence is painted afterward
            // so mobile navigation markers retain their contrast.
            context.save();
            context.fillStyle = 'rgba(8,14,36,0.27)';
            context.fillRect(0, 0, display.width, display.height);
            context.restore();
            return phase;
        }

        function pruneCache(cache, keepKeys, maxCacheEntries) {
            if (cache.size <= maxCacheEntries) return;
            for (const [key, raster] of cache) {
                if (cache.size <= maxCacheEntries) break;
                if (keepKeys.has(key)) continue;
                raster.renderer.destroy();
                cache.delete(key);
            }
        }

        function cacheDiagnostics() {
            const entriesByTier = {};
            let entries = 0;
            let byteEstimate = 0;
            for (const [id, cache] of chunkCaches) {
                entriesByTier[id] = cache.size;
                entries += cache.size;
                for (const raster of cache.values()) byteEstimate += Number(raster.byteEstimate) || 0;
            }
            return { entries, entriesByTier, byteEstimate };
        }

        function render() {
            if (destroyed) throw new Error('Terrain canvas surface is destroyed');
            const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now() : Date.now();
            const display = prepareDisplay();
            const policy = rasterPolicy();
            const cache = cacheFor(policy);
            const addresses = YAW_TERRAIN_VIEWPORT_V1.visibleChunks(camera, { chunkSize, overscanTiles: apron });
            const scale = YAW_TERRAIN_VIEWPORT_V1.tilePixels(camera);
            const renderedChunks = [];
            const counters = { hits: 0, misses: 0 };
            context.imageSmoothingEnabled = true;
            for (const address of addresses) {
                const raster = chunkRaster(address, counters, policy, cache);
                const interior = raster.scene.interiorBounds;
                const topLeft = YAW_TERRAIN_VIEWPORT_V1.worldToScreen(camera, interior.minX - 0.5, interior.minY - 0.5);
                const width = interior.width * scale;
                const height = interior.height * scale;
                const source = raster.frame.interiorSourceRect;
                // Sample one cached pixel into the deterministic apron. Adjacent
                // chunks overlap with identical world content instead of exposing
                // transparent resampling fringes at fractional zoom.
                const sourcePad = Math.min(1, source.x, source.y);
                const destinationPad = sourcePad * scale / policy.tilePixels;
                context.drawImage(
                    raster.canvas,
                    source.x - sourcePad, source.y - sourcePad,
                    source.width + sourcePad * 2, source.height + sourcePad * 2,
                    topLeft.x - destinationPad, topLeft.y - destinationPad,
                    width + destinationPad * 2, height + destinationPad * 2
                );
                renderedChunks.push({ key: raster.key, x: topLeft.x, y: topLeft.y, width, height });
            }
            const phase = drawLighting(display);
            const dynamicPresenceCount = drawDynamicPresence(scale, display);
            pruneCache(cache, new Set(renderedChunks.map(chunk => chunk.key)), policy.maxCacheEntries);
            const cacheState = cacheDiagnostics();
            const endedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now() : Date.now();
            lastRenderStats = {
                milliseconds: Math.max(0, endedAt - startedAt),
                cacheHits: counters.hits,
                cacheMisses: counters.misses,
                dynamicPresenceCount,
                lightingPhase: phase,
                quality: policy.quality,
                rasterTier: policy.mode,
                cacheTilePixels: policy.tilePixels,
                decorativeDensity: policy.decorativeDensity,
                cacheByteEstimate: cacheState.byteEstimate
            };
            return {
                version: VERSION,
                mode: YAW_TERRAIN_VIEWPORT_V1.mode(camera),
                camera,
                display,
                renderedChunks,
                visibleBounds: YAW_TERRAIN_VIEWPORT_V1.visibleBounds(camera),
                cacheEntries: cacheState.entries,
                cacheEntriesByTier: cacheState.entriesByTier,
                renderStats: { ...lastRenderStats }
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

        function setQuality(next) {
            const normalized = normalizeQuality(next);
            if (normalized === quality) return quality;
            quality = normalized;
            invalidate(worldRevision);
            return quality;
        }

        function invalidate(revision = worldRevision) {
            worldRevision = String(revision || 'unversioned');
            for (const cache of chunkCaches.values()) {
                for (const raster of cache.values()) raster.renderer.destroy();
                cache.clear();
            }
            chunkCaches.clear();
        }

        function invalidateTiles(tileKeys = [], revision = worldRevision, options = {}) {
            worldRevision = String(revision || 'unversioned');
            const coordinates = (Array.isArray(tileKeys) ? tileKeys : [...tileKeys]).map(value => {
                if (value && typeof value === 'object') return { x: Number(value.x), y: Number(value.y) };
                const [x, y] = String(value || '').split(',').map(Number);
                return { x, y };
            }).filter(value => Number.isFinite(value.x) && Number.isFinite(value.y));
            let removed = 0;
            for (const cache of chunkCaches.values()) {
                for (const [key, raster] of [...cache]) {
                    const bounds = options.includeApron === false ? raster.scene.interiorBounds : raster.scene.renderBounds;
                    if (!coordinates.some(point => point.x >= bounds.minX && point.x <= bounds.maxX
                        && point.y >= bounds.minY && point.y <= bounds.maxY)) continue;
                    raster.renderer.destroy();
                    cache.delete(key);
                    removed += 1;
                }
            }
            return removed;
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
            quality: () => quality,
            setQuality,
            invalidate,
            invalidateTiles,
            stats: () => lastRenderStats ? { ...lastRenderStats } : null,
            destroy
        };
    }

    return { VERSION, DEFAULT_QUALITY, QUALITY_PROFILES, normalizeQuality, qualityPolicy, create };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_CANVAS_SURFACE_V1 = YAW_TERRAIN_CANVAS_SURFACE_V1;
