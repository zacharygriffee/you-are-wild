/**
 * YOU ARE WILD TERRAIN CANVAS ALPHA
 *
 * Default overworld integration for Terrain Rendering V1. The established
 * renderer remains available with ?terrainRenderer=legacy and is restored
 * automatically if the Canvas surface cannot mount. Existing DOM traversal
 * controls remain the semantic interaction plane above one zoomable surface.
 */

const YAW_TERRAIN_CANVAS_ALPHA = (() => {
    const PARAMETER = 'terrainRenderer';
    const VALUE = 'canvas-v1';
    const LEGACY_VALUE = 'legacy';
    const records = new Map();
    let scheduled = false;
    let observer = null;
    let semanticGeneration = 0;
    let assetPromise = null;

    function enabled() {
        if (typeof window === 'undefined') return false;
        const requested = new URLSearchParams(window.location.search).get(PARAMETER);
        if (requested) return requested === VALUE;
        return window.YAW_GRAPHICS_MODE !== 'emoji';
    }

    function injectStyle() {
        if (document.getElementById('yaw-terrain-canvas-alpha-style')) return;
        const style = document.createElement('style');
        style.id = 'yaw-terrain-canvas-alpha-style';
        style.textContent = `
            .yaw-terrain-canvas-alpha {
                position: relative !important;
                isolation: isolate;
                touch-action: none;
            }
            .yaw-terrain-canvas-alpha > .yaw-terrain-world-canvas {
                position: absolute;
                inset: 0;
                z-index: 0;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none;
            }
            .yaw-terrain-canvas-alpha > :is(.map-tile, .desktop-play-cell) {
                z-index: 1;
                background: transparent !important;
            }
            .yaw-terrain-canvas-alpha > :is(.map-tile, .desktop-play-cell) > :is(.yaw-tile-art, .mobile-play-tile-icon, .desktop-play-cell-icon) {
                opacity: 0 !important;
            }
            .yaw-terrain-canvas-alpha[data-terrain-camera-mode="survey"] > :is(.map-tile, .desktop-play-cell),
            .yaw-terrain-canvas-alpha[data-terrain-camera-mode="regional"] > :is(.map-tile, .desktop-play-cell) {
                outline: 0 !important;
                box-shadow: none !important;
                pointer-events: none !important;
                visibility: hidden !important;
            }
            .yaw-terrain-canvas-alpha[data-terrain-camera-mode="survey"] > :is(.map-tile, .desktop-play-cell) > *,
            .yaw-terrain-canvas-alpha[data-terrain-camera-mode="regional"] > :is(.map-tile, .desktop-play-cell) > * {
                opacity: 0 !important;
            }
            .yaw-terrain-canvas-controls {
                position: absolute;
                top: 6px;
                left: 6px;
                z-index: 4;
                display: flex;
                gap: 5px;
                align-items: center;
                pointer-events: auto;
            }
            .yaw-terrain-canvas-controls button {
                min-height: 28px;
                padding: 4px 8px;
                color: var(--text-primary, #fff);
                background: color-mix(in srgb, var(--bg-primary, #151625) 88%, transparent);
                border: 1px solid var(--border-default, #4a4c62);
                border-radius: 6px;
                font: 600 11px/1 sans-serif;
            }
            .yaw-terrain-canvas-mode {
                padding: 4px 2px;
                color: var(--text-muted, #b4b6c8);
                font: 600 10px/1.2 sans-serif;
                white-space: nowrap;
            }
            .yaw-terrain-canvas-mode::before {
                content: '•';
                margin-right: 4px;
                color: var(--accent-primary, #55d8c2);
            }
            .yaw-terrain-canvas-controls [data-terrain-view="recenter"][hidden] {
                display: none !important;
            }
            .yaw-terrain-canvas-alpha[data-terrain-camera-mode="local"] > :is(.map-tile, .desktop-play-cell) > :is(.desktop-play-cell-label, .mobile-play-tile-label) {
                left: 2px;
                right: 2px;
                bottom: 2px;
                padding: 2px 3px;
                color: rgba(245, 247, 250, 0.82) !important;
                background: none;
                border-radius: 0 0 4px 4px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.92);
            }
        `;
        document.head.appendChild(style);
    }

    function tileResolver(app) {
        return (x, y) => {
            if (app.inInterior) return null;
            const radius = Math.max(1, Number(app._mapVisibilityRadius?.()) || 1);
            const nearParty = Math.abs(x - app.location.x) <= radius && Math.abs(y - app.location.y) <= radius;
            let tile = null;
            if (nearParty) tile = app.getTile(x, y);
            else if (typeof app._resolveLargeMapTile === 'function') tile = app._resolveLargeMapTile(x, y);
            else if (app.isExplored?.(x, y)) tile = app.worldMap?.get?.(`${x},${y}`) || null;
            if (!tile || x !== app.location.x || y !== app.location.y) return tile;
            const existing = Array.isArray(tile.creatures) ? tile.creatures : [];
            const ids = new Set(existing.map(unit => String(unit?.id || unit?.instanceId || '')));
            const partyPresence = (app.party || [])
                .filter(unit => unit && unit.CPun > 0 && !unit.knockedOut)
                .filter(unit => !ids.has(String(unit.id || unit.instanceId || '')))
                .map(unit => ({
                    id: unit.id || unit.instanceId,
                    name: unit.name,
                    species: unit.species,
                    alive: true,
                    role: unit === app.player || unit.mc ? 'player' : 'party'
                }));
            return { ...tile, creatures: [...existing, ...partyPresence] };
        };
    }

    function visibleContainer(container) {
        const rect = container?.getBoundingClientRect?.();
        if (!rect || rect.width <= 1 || rect.height <= 1) return false;
        const style = getComputedStyle(container);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function worldRevision(app) {
        return [
            app.worldMeta?.worldId || app.worldId || app.worldMeta?.seed || app.worldSeed || 'world',
            app.worldMeta?.generatorVersion || app.worldGeneratorVersion || app.generatorVersion || 'v',
            app.worldMap instanceof Map ? app.worldMap.size : Object.keys(app.worldMap || {}).length,
            app.exploredTiles instanceof Set ? app.exploredTiles.size : 0,
            app.tileDeltas instanceof Map ? app.tileDeltas.size : 0,
            `${app.location?.x || 0},${app.location?.y || 0}`
        ].join(':');
    }

    function renderRevision(app) {
        return `${worldRevision(app)}:semantic-${semanticGeneration}`;
    }

    function canvasSize(container) {
        const rect = container.getBoundingClientRect();
        return {
            width: Math.max(1, Math.round(rect.width || container.clientWidth || 320)),
            height: Math.max(1, Math.round(rect.height || container.clientHeight || 320))
        };
    }

    function controlHtml() {
        return '<button type="button" data-terrain-view="local" aria-label="Return terrain camera to the local three by three view">3×3</button>'
            + '<button type="button" data-terrain-view="survey" aria-label="Zoom terrain camera out to the survey map">Survey</button>'
            + '<button type="button" data-terrain-view="recenter" aria-label="Recenter the survey map on the party" hidden>Center</button>'
            + '<span class="yaw-terrain-canvas-mode">View: Local</span>'
            + '<span class="visually-hidden yaw-terrain-canvas-inspection" role="status" aria-live="polite" aria-atomic="true"></span>';
    }

    function inspectionText(record, center, modeText) {
        const x = Math.round(center.x);
        const y = Math.round(center.y);
        if (modeText === 'Local') return `Local terrain centered on ${x}, ${y}.`;
        const tile = record.resolveTile(x, y);
        if (!tile) return `${modeText} camera at ${x}, ${y}. Terrain is unknown.`;
        const biome = String(tile.displayBiome || tile.derivedBiome || tile.baseBiome || tile.biome || 'terrain');
        const details = [];
        if (tile.structure) details.push('structure');
        if (tile.hasLandmark || tile.overlays?.poi) details.push('point of interest');
        const evidence = (tile.items?.length || 0) + (tile.deathBags?.length || 0) + (tile.placedObjects?.length || 0);
        if (evidence) details.push(`${evidence} evidence ${evidence === 1 ? 'marker' : 'markers'}`);
        const creatures = (tile.creatures || []).filter(unit => unit?.alive !== false && unit?.dead !== true).length;
        if (creatures) details.push(`${creatures} ${creatures === 1 ? 'presence' : 'presences'}`);
        return `${modeText} camera at ${x}, ${y}. ${biome}${details.length ? `, ${details.join(', ')}` : ''}.`;
    }

    function updateMode(record, frame) {
        record.container.setAttribute('data-terrain-camera-mode', frame.mode);
        const label = record.controls.querySelector('.yaw-terrain-canvas-mode');
        const center = frame.camera?.center || record.app.location;
        const modeText = frame.mode === 'local' ? 'Local' : (frame.mode === 'regional' ? 'Regional' : 'Survey');
        const text = frame.mode === 'local' ? `View: ${modeText}` : `View: ${modeText} · ${Math.round(center.x)}, ${Math.round(center.y)}`;
        if (label && label.textContent !== text) label.textContent = text;
        const inspection = record.controls.querySelector('.yaw-terrain-canvas-inspection');
        const description = inspectionText(record, center, modeText);
        if (inspection && inspection.textContent !== description) inspection.textContent = description;
        for (const button of record.controls.querySelectorAll('[data-terrain-view]')) {
            const view = button.getAttribute('data-terrain-view');
            if (view === 'recenter') {
                button.hidden = frame.mode === 'local';
                button.removeAttribute('aria-pressed');
            } else {
                button.setAttribute('aria-pressed', String(view === 'local' ? frame.mode === 'local' : frame.mode !== 'local'));
            }
        }
        const local = frame.mode === 'local';
        for (const cell of record.container.querySelectorAll(':scope > :is(.map-tile, .desktop-play-cell)')) {
            if (local) {
                if (cell.hasAttribute('data-terrain-input-suppressed')) {
                    cell.removeAttribute('data-terrain-input-suppressed');
                    cell.removeAttribute('aria-hidden');
                    cell.removeAttribute('inert');
                    cell.inert = false;
                }
            } else {
                cell.setAttribute('data-terrain-input-suppressed', 'true');
                cell.setAttribute('aria-hidden', 'true');
                cell.setAttribute('inert', '');
                cell.inert = true;
            }
        }
    }

    function draw(record) {
        const frame = record.surface.render();
        updateMode(record, frame);
        record.frame = frame;
        return frame;
    }

    function bindGestures(record) {
        const signal = record.abortController.signal;
        const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal });
        const pointers = new Map();
        let pinch = null;
        let drag = null;
        let gestureMoved = false;
        const distance = (left, right) => Math.hypot(right.x - left.x, right.y - left.y);
        const midpoint = (left, right) => ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });
        const localPoint = event => {
            const rect = record.container.getBoundingClientRect();
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        };

        listen(record.container, 'wheel', event => {
            event.preventDefault();
            const point = localPoint(event);
            record.surface.zoomAt(Math.exp(-event.deltaY * 0.0015), point.x, point.y);
            draw(record);
        }, { passive: false });

        listen(record.container, 'pointerdown', event => {
            if (event.target.closest?.('.yaw-terrain-canvas-controls')) return;
            const point = localPoint(event);
            pointers.set(event.pointerId, { start: point, current: point });
            if (pointers.size === 1) gestureMoved = false;
            if (pointers.size === 1) drag = point;
            if (pointers.size === 2) {
                gestureMoved = true;
                for (const pointerId of pointers.keys()) {
                    try { record.container.setPointerCapture?.(pointerId); } catch (error) {}
                }
                const values = [...pointers.values()].map(entry => entry.current);
                pinch = { distance: distance(values[0], values[1]), midpoint: midpoint(values[0], values[1]) };
            }
        });

        listen(record.container, 'pointermove', event => {
            if (!pointers.has(event.pointerId)) return;
            const point = localPoint(event);
            const pointer = pointers.get(event.pointerId);
            pointer.current = point;
            if (YAW_TERRAIN_INPUT_V1.movedBeyond(pointer.start, point)) gestureMoved = true;
            if (gestureMoved && record.frame?.mode !== 'local') {
                try { record.container.setPointerCapture?.(event.pointerId); } catch (error) {}
            }
            if (pointers.size >= 2) {
                event.preventDefault();
                const values = [...pointers.values()].slice(0, 2).map(entry => entry.current);
                const nextMidpoint = midpoint(values[0], values[1]);
                const nextDistance = distance(values[0], values[1]);
                if (pinch) {
                    record.surface.panPixels(nextMidpoint.x - pinch.midpoint.x, nextMidpoint.y - pinch.midpoint.y);
                    record.surface.zoomAt(YAW_TERRAIN_VIEWPORT_V1.pinchFactor(pinch.distance, nextDistance), nextMidpoint.x, nextMidpoint.y);
                }
                pinch = { distance: nextDistance, midpoint: nextMidpoint };
                draw(record);
            } else if (drag && record.frame?.mode !== 'local') {
                event.preventDefault();
                record.surface.panPixels(point.x - drag.x, point.y - drag.y);
                drag = point;
                draw(record);
            }
        });

        const release = event => {
            pointers.delete(event.pointerId);
            try { record.container.releasePointerCapture?.(event.pointerId); } catch (error) {}
            pinch = null;
            drag = pointers.size === 1 ? [...pointers.values()][0].current : null;
        };
        listen(record.container, 'pointerup', release);
        listen(record.container, 'pointercancel', release);
        listen(record.container, 'click', event => {
            if (event.target.closest?.('.yaw-terrain-canvas-controls')) return;
            if (event.target.closest?.('button, a, input, select, textarea, [data-stage-surface="presence"]')) return;
            if (gestureMoved) {
                event.preventDefault();
                event.stopPropagation();
                gestureMoved = false;
                return;
            }
            const point = localPoint(event);
            const selectedTile = record.surface.tileAt(point.x, point.y);
            const intent = YAW_TERRAIN_INPUT_V1.intentForTile(record.frame?.mode, record.app.location, selectedTile);
            if (intent.kind === 'move') {
                event.preventDefault();
                event.stopImmediatePropagation?.();
                record.app.move(intent.dx, intent.dy);
                schedule();
                return;
            }
            if (intent.kind === 'inspect') {
                event.preventDefault();
                event.stopImmediatePropagation?.();
                record.surface.setCamera({ ...record.surface.camera(), center: intent.tile });
                draw(record);
            }
        }, { capture: true });

        listen(record.controls, 'click', event => {
            const view = event.target.closest?.('[data-terrain-view]')?.getAttribute('data-terrain-view');
            if (!view) return;
            if (view === 'local') record.surface.setLocal(record.app.location);
            else if (view === 'survey') record.surface.setSurvey(record.app.location, 17);
            else record.surface.setCamera({ ...record.surface.camera(), center: record.app.location });
            draw(record);
        });
    }

    function prepareRendererAssets(record) {
        if (!assetPromise) {
            assetPromise = window.YAW_GRAPHICS_MODE === 'emoji'
                ? Promise.resolve({ ready: false, count: 0 })
                : Promise.resolve(window.YAW_BUNDLED_TILESET_READY)
                .catch(() => null)
                .then(() => {
                    const urls = globalThis.AssetManifest?.bundledTilesetPack?.().atlasUrls || {};
                    return YAW_TERRAIN_CANVAS_V1.prepareAssets(urls);
                })
                .catch(() => ({ ready: false, count: 0 }));
        }
        assetPromise.then(result => {
            if (!result?.ready || !record.canvas?.isConnected || records.get(record.container) !== record) return;
            record.surface.invalidate(record.worldRevision);
            draw(record);
        });
    }

    function unmountRecord(record) {
        if (!record) return;
        record.abortController?.abort();
        record.surface?.destroy();
        record.canvas?.remove();
        record.controls?.remove();
        for (const cell of record.container?.querySelectorAll?.('[data-terrain-input-suppressed]') || []) {
            cell.removeAttribute('data-terrain-input-suppressed');
            cell.removeAttribute('aria-hidden');
            cell.removeAttribute('inert');
            cell.inert = false;
        }
        record.container?.classList?.remove('yaw-terrain-canvas-alpha');
        record.container?.removeAttribute?.('data-terrain-camera-mode');
        records.delete(record.container);
    }

    function mount(container, app, previousCamera = null) {
        const size = canvasSize(container);
        const canvas = document.createElement('canvas');
        canvas.className = 'yaw-terrain-world-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        const controls = document.createElement('div');
        controls.className = 'yaw-terrain-canvas-controls';
        controls.innerHTML = controlHtml();
        let surface = null;
        let record = null;
        try {
            const revision = renderRevision(app);
            const resolveTile = tileResolver(app);
            surface = YAW_TERRAIN_CANVAS_SURFACE_V1.create(canvas, {
                width: size.width,
                height: size.height,
                centerX: app.location.x,
                centerY: app.location.y,
                chunkSize: 16,
                apron: 2,
                cacheTilePixels: 64,
                worldRevision: revision,
                resolveTile
            });
            if (previousCamera) {
                surface.setCamera(previousCamera);
                if (YAW_TERRAIN_VIEWPORT_V1.mode(previousCamera) === 'local') surface.setLocal(app.location);
            } else surface.setLocal(app.location);
            record = {
                app, container, canvas, controls, surface, resolveTile, frame: null,
                worldRevision: revision, abortController: new AbortController()
            };
            container.classList.add('yaw-terrain-canvas-alpha');
            container.prepend(canvas);
            container.appendChild(controls);
            records.set(container, record);
            bindGestures(record);
            draw(record);
            prepareRendererAssets(record);
            return record;
        } catch (error) {
            if (record) unmountRecord(record);
            else surface?.destroy?.();
            canvas.remove();
            controls.remove();
            container.classList.remove('yaw-terrain-canvas-alpha');
            container.removeAttribute('data-terrain-camera-mode');
            console.warn('Canvas terrain alpha restored the established renderer after a mount failure.', error);
            return null;
        }
    }

    function syncContainer(container, app) {
        const prior = records.get(container);
        if (prior && prior.canvas.isConnected && container.contains(prior.canvas)) {
            const size = canvasSize(container);
            const nextRevision = renderRevision(app);
            const camera = prior.surface.camera();
            const isLocal = YAW_TERRAIN_VIEWPORT_V1.mode(camera) === 'local';
            const playerMoved = camera.center.x !== app.location.x || camera.center.y !== app.location.y;
            const resized = Math.abs(size.width - prior.frame.display.width) > 1 || Math.abs(size.height - prior.frame.display.height) > 1;
            const revised = prior.worldRevision !== nextRevision;
            if (revised) {
                prior.surface.invalidate(nextRevision);
                prior.worldRevision = nextRevision;
            }
            if (isLocal && playerMoved) prior.surface.setLocal(app.location);
            if (resized) {
                prior.surface.resize(size.width, size.height);
            }
            if (revised || (isLocal && playerMoved) || resized) draw(prior);
            return prior;
        }
        const camera = prior?.surface.camera();
        unmountRecord(prior);
        return mount(container, app, camera);
    }

    function sync() {
        scheduled = false;
        if (!enabled() || !window.App?.location || typeof window.App.getTile !== 'function') return;
        injectStyle();
        if (window.App.inInterior || window.App.combatState?.active) {
            for (const record of [...records.values()]) unmountRecord(record);
            return;
        }
        const containers = ['desktop-neighborhood-grid', 'mobile-mini-map']
            .map(id => document.getElementById(id))
            .filter(visibleContainer);
        const activeContainers = new Set(containers);
        for (const record of [...records.values()]) {
            if (!activeContainers.has(record.container)) unmountRecord(record);
        }
        for (const container of containers) syncContainer(container, window.App);
    }

    function schedule() {
        if (scheduled || !enabled()) return;
        scheduled = true;
        requestAnimationFrame(sync);
    }

    function openSurvey(app = window.App) {
        if (!enabled() || !app || app.inInterior || app.combatState?.active) return false;
        const record = [...records.values()].find(candidate => (
            candidate.app === app && candidate.canvas?.isConnected && visibleContainer(candidate.container)
        ));
        if (!record) return false;
        record.surface.setSurvey(app.location, 17);
        draw(record);
        record.container.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        record.controls.querySelector('[data-terrain-view="survey"]')?.focus?.({ preventScroll: true });
        return true;
    }

    function start() {
        if (!enabled() || observer) return;
        observer = new MutationObserver(mutations => {
            const semanticChange = mutations.some(mutation => {
                const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
                return !target?.closest?.('.yaw-terrain-canvas-controls, .yaw-terrain-world-canvas');
            });
            if (semanticChange) semanticGeneration += 1;
            schedule();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('resize', schedule);
        schedule();
    }

    function stop() {
        observer?.disconnect();
        observer = null;
        window.removeEventListener('resize', schedule);
        for (const record of [...records.values()]) unmountRecord(record);
    }

    function handleTraversalKey(event = {}) {
        if (!enabled()) return false;
        const direction = YAW_TERRAIN_INPUT_V1.keyboardPan(event);
        if (!direction) return false;
        const surveyRecords = [...records.values()].filter(record => record.canvas?.isConnected && record.frame?.mode !== 'local');
        if (!surveyRecords.length) return false;
        event.preventDefault?.();
        for (const record of surveyRecords) {
            const pixels = YAW_TERRAIN_VIEWPORT_V1.tilePixels(record.surface.camera());
            record.surface.panPixels(-direction.dx * pixels, -direction.dy * pixels);
            draw(record);
        }
        return true;
    }

    if (typeof document !== 'undefined' && enabled()) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }

    return { PARAMETER, VALUE, LEGACY_VALUE, enabled, start, sync, stop, openSurvey, handleTraversalKey };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_CANVAS_ALPHA = YAW_TERRAIN_CANVAS_ALPHA;
