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
    let runtimeDisabled = false;

    function enabled() {
        if (typeof window === 'undefined') return false;
        if (runtimeDisabled) return false;
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
            .yaw-terrain-canvas-focus-marker {
                position: absolute;
                left: 0;
                top: 0;
                z-index: 3;
                width: 18px;
                height: 18px;
                margin: -9px 0 0 -9px;
                pointer-events: none;
                border: 3px solid #fff2a8;
                border-radius: 50%;
                background: rgba(20, 25, 34, 0.58);
                box-shadow: 0 0 0 2px rgba(23, 18, 16, 0.72), 0 0 12px rgba(255, 218, 92, 0.66);
            }
            .yaw-terrain-canvas-focus-marker::after {
                content: '';
                position: absolute;
                left: 50%;
                top: 100%;
                width: 2px;
                height: 8px;
                margin-left: -1px;
                background: #fff2a8;
                box-shadow: 0 1px 1px rgba(23, 18, 16, 0.72);
            }
            .yaw-terrain-canvas-inspector {
                position: absolute;
                left: 6px;
                bottom: 6px;
                z-index: 4;
                max-width: min(76%, 360px);
                padding: 5px 7px;
                color: var(--text-primary, #f5f7fa);
                background: color-mix(in srgb, var(--bg-primary, #151625) 88%, transparent);
                border: 1px solid var(--border-default, #4a4c62);
                border-radius: 6px;
                font: 600 10px/1.35 sans-serif;
                pointer-events: none;
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
            return tile;
        };
    }

    function presenceResolver(app) {
        return () => {
            const units = [app.player, ...(app.party || [])].filter(Boolean);
            const seen = new Set();
            return units.filter(unit => {
                const id = String(unit.id || unit.instanceId || unit.name || 'party');
                if (seen.has(id) || Number(unit.CPun ?? 1) <= 0 || unit.knockedOut) return false;
                seen.add(id);
                return true;
            }).map(unit => ({
                id: unit.id || unit.instanceId || unit.name,
                label: unit.name || unit.species || 'Party member',
                role: unit === app.player || unit.mc ? 'player' : 'party',
                x: Number(app.location?.x) || 0,
                y: Number(app.location?.y) || 0
            }));
        };
    }

    function visibleContainer(container) {
        const rect = container?.getBoundingClientRect?.();
        if (!rect || rect.width <= 1 || rect.height <= 1) return false;
        const style = getComputedStyle(container);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function worldIdentity(app) {
        return [
            app.worldMeta?.worldId || app.worldId || 'world',
            app.worldMeta?.seed || app.worldSeed || 'seed',
            app.worldMeta?.generatorVersion || app.worldGeneratorVersion || app.generatorVersion || 'v',
            app.worldMeta?.mapModsHash || 'core'
        ].join(':');
    }

    function worldRevision(app) {
        return [
            worldIdentity(app),
            app.worldMap instanceof Map ? app.worldMap.size : Object.keys(app.worldMap || {}).length,
            app.exploredTiles instanceof Set ? app.exploredTiles.size : 0,
            app.tileDeltas instanceof Map ? app.tileDeltas.size : 0
        ].join(':');
    }

    function renderRevision(app) {
        return worldRevision(app);
    }

    function tileVisualSignature(app) {
        const x = Number(app.location?.x) || 0;
        const y = Number(app.location?.y) || 0;
        const tile = app.worldMap?.get?.(`${x},${y}`) || null;
        if (!tile) return 'unknown';
        const units = values => (Array.isArray(values) ? values : []).map(unit => [
            unit?.id || unit?.instanceId || unit?.name || '',
            Number(unit?.CPun ?? unit?.hp ?? 0),
            Boolean(unit?.knockedOut || unit?.dead || unit?.alive === false)
        ]);
        const evidence = values => (Array.isArray(values) ? values : []).map(value => [
            value?.id || value?.instanceId || value?.name || '', Number(value?.quantity || 1), value?.state || ''
        ]);
        return JSON.stringify([
            tile.biome, tile.derivedBiome, tile.structure, tile.hasLandmark, tile.landmarkName,
            units(tile.creatures), evidence(tile.items), evidence(tile.deathBags), evidence(tile.placedObjects)
        ]);
    }

    function canvasSize(container) {
        const rect = container.getBoundingClientRect();
        return {
            width: Math.max(1, Math.round(rect.width || container.clientWidth || 320)),
            height: Math.max(1, Math.round(rect.height || container.clientHeight || 320))
        };
    }

    function localized(app, key, fallback, vars = {}) {
        return typeof app?._label === 'function' ? app._label(key, fallback, vars) : fallback;
    }

    function escaped(app, value) {
        const text = String(value ?? '');
        return typeof app?._escapeHtml === 'function' ? app._escapeHtml(text) : text
            .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    }

    function controlHtml(app) {
        const local = localized(app, 'ui.terrainCanvas.local', 'Local');
        const survey = localized(app, 'ui.terrainCanvas.survey', 'Survey');
        const center = localized(app, 'direction.center', 'Center');
        return `<button type="button" data-terrain-view="local" aria-label="${escaped(app, localized(app, 'ui.terrainCanvas.returnLocal', 'Return terrain camera to the local three by three view'))}">3×3</button>`
            + `<button type="button" data-terrain-view="survey" aria-label="${escaped(app, localized(app, 'ui.terrainCanvas.openSurvey', 'Zoom terrain camera out to the survey map'))}">${escaped(app, survey)}</button>`
            + `<button type="button" data-terrain-view="recenter" aria-label="${escaped(app, localized(app, 'ui.terrainCanvas.recenter', 'Recenter the survey map on the party'))}" hidden>${escaped(app, center)}</button>`
            + `<span class="yaw-terrain-canvas-mode">${escaped(app, localized(app, 'ui.terrainCanvas.view', 'View: {mode}', { mode: local }))}</span>`
            + '<span class="visually-hidden yaw-terrain-canvas-inspection" role="status" aria-live="polite" aria-atomic="true"></span>';
    }

    function inspectionText(record, center, mode, modeText) {
        const x = Math.round(center.x);
        const y = Math.round(center.y);
        const app = record.app;
        if (mode === 'local') return localized(app, 'ui.terrainCanvas.localAt', 'Local terrain centered on {x}, {y}.', { x, y });
        const tile = record.resolveTile(x, y);
        const focusAtCamera = record.focusTarget
            && Math.round(record.focusTarget.x) === x
            && Math.round(record.focusTarget.y) === y;
        if (focusAtCamera) {
            const target = record.focusTarget.label || localized(app, 'ui.terrainCanvas.mapTarget', 'map target');
            if (!tile) return localized(app, 'ui.terrainCanvas.focusUnknown', '{mode} camera focused on {target} at {x}, {y}. Terrain is unknown.', { mode: modeText, target, x, y });
            const terrain = String(tile.displayBiome || tile.derivedBiome || tile.baseBiome || tile.biome
                || localized(app, 'ui.terrainCanvas.terrain', 'terrain'));
            return localized(app, 'ui.terrainCanvas.focusAt', '{mode} camera focused on {target} at {x}, {y}. {terrain}.', { mode: modeText, target, x, y, terrain });
        }
        if (!tile) return localized(app, 'ui.terrainCanvas.cameraUnknown', '{mode} camera at {x}, {y}. Terrain is unknown.', { mode: modeText, x, y });
        const terrain = String(tile.displayBiome || tile.derivedBiome || tile.baseBiome || tile.biome
            || localized(app, 'ui.terrainCanvas.terrain', 'terrain'));
        const details = [];
        if (tile.structure) details.push(localized(app, 'ui.terrainCanvas.structure', 'structure'));
        if (tile.hasLandmark || tile.overlays?.poi) details.push(localized(app, 'ui.terrainCanvas.poi', 'point of interest'));
        const evidence = (tile.items?.length || 0) + (tile.deathBags?.length || 0) + (tile.placedObjects?.length || 0);
        if (evidence) details.push(localized(app,
            evidence === 1 ? 'ui.terrainCanvas.evidenceOne' : 'ui.terrainCanvas.evidenceMany',
            evidence === 1 ? '1 evidence marker' : '{count} evidence markers', { count: evidence }));
        const creatures = (tile.creatures || []).filter(unit => unit?.alive !== false && unit?.dead !== true).length;
        if (creatures) details.push(localized(app,
            creatures === 1 ? 'ui.terrainCanvas.presenceOne' : 'ui.terrainCanvas.presenceMany',
            creatures === 1 ? '1 presence' : '{count} presences', { count: creatures }));
        return localized(app, 'ui.terrainCanvas.cameraAt', '{mode} camera at {x}, {y}. {terrain}{details}.', {
            mode: modeText, x, y, terrain, details: details.length ? `, ${details.join(', ')}` : ''
        });
    }

    function updateSurveyList(record, center, modeText) {
        if (!record.surveyList) return;
        const app = record.app;
        const local = modeText === localized(app, 'ui.terrainCanvas.local', 'Local');
        record.surveyList.hidden = local;
        if (local) return;
        const centerX = Math.round(center.x);
        const centerY = Math.round(center.y);
        const localeRevision = localized(app, 'ui.terrainCanvas.survey', 'Survey');
        const revision = `${centerX},${centerY}:${record.worldRevision}:${localeRevision}`;
        if (record.surveyList.dataset.revision === revision) return;
        record.surveyList.dataset.revision = revision;
        record.surveyList.replaceChildren();
        const directions = [
            ['direction.northwest', 'Northwest', -1, -1], ['direction.north', 'North', 0, -1], ['direction.northeast', 'Northeast', 1, -1],
            ['direction.west', 'West', -1, 0], ['direction.center', 'Center', 0, 0], ['direction.east', 'East', 1, 0],
            ['direction.southwest', 'Southwest', -1, 1], ['direction.south', 'South', 0, 1], ['direction.southeast', 'Southeast', 1, 1]
        ];
        for (const [directionKey, directionFallback, dx, dy] of directions) {
            const direction = localized(app, directionKey, directionFallback);
            const x = centerX + dx;
            const y = centerY + dy;
            const tile = record.resolveTile(x, y);
            const item = document.createElement('li');
            if (!tile) item.textContent = localized(app, 'ui.terrainCanvas.unknownAt', '{direction}: unknown terrain at {x}, {y}.', { direction, x, y });
            else {
                const terrain = String(tile.displayBiome || tile.derivedBiome || tile.baseBiome || tile.biome
                    || localized(app, 'ui.terrainCanvas.terrain', 'terrain'));
                const details = [];
                if (tile.structure) details.push(localized(app, 'ui.terrainCanvas.structure', 'structure'));
                if (tile.hasLandmark || tile.overlays?.poi) details.push(localized(app, 'ui.terrainCanvas.poi', 'point of interest'));
                item.textContent = localized(app, 'ui.terrainCanvas.tileAt', '{direction}: {terrain} at {x}, {y}{details}.', {
                    direction, terrain, x, y, details: details.length ? `, ${details.join(', ')}` : ''
                });
            }
            record.surveyList.appendChild(item);
        }
    }

    function updateMode(record, frame) {
        record.container.setAttribute('data-terrain-camera-mode', frame.mode);
        const localButton = record.controls.querySelector('[data-terrain-view="local"]');
        const surveyButton = record.controls.querySelector('[data-terrain-view="survey"]');
        const recenterButton = record.controls.querySelector('[data-terrain-view="recenter"]');
        if (localButton) localButton.setAttribute('aria-label', localized(record.app, 'ui.terrainCanvas.returnLocal', 'Return terrain camera to the local three by three view'));
        if (surveyButton) {
            surveyButton.setAttribute('aria-label', localized(record.app, 'ui.terrainCanvas.openSurvey', 'Zoom terrain camera out to the survey map'));
            surveyButton.textContent = localized(record.app, 'ui.terrainCanvas.survey', 'Survey');
        }
        if (recenterButton) {
            recenterButton.setAttribute('aria-label', localized(record.app, 'ui.terrainCanvas.recenter', 'Recenter the survey map on the party'));
            recenterButton.textContent = localized(record.app, 'direction.center', 'Center');
        }
        if (record.surveyList) record.surveyList.setAttribute('aria-label',
            localized(record.app, 'ui.terrainCanvas.surveyList', 'Nearby terrain around the survey camera'));
        const label = record.controls.querySelector('.yaw-terrain-canvas-mode');
        const center = frame.camera?.center || record.app.location;
        const modeText = frame.mode === 'local'
            ? localized(record.app, 'ui.terrainCanvas.local', 'Local')
            : (frame.mode === 'regional'
                ? localized(record.app, 'ui.terrainCanvas.regional', 'Regional')
                : localized(record.app, 'ui.terrainCanvas.survey', 'Survey'));
        const text = localized(record.app,
            frame.mode === 'local' ? 'ui.terrainCanvas.view' : 'ui.terrainCanvas.viewAt',
            frame.mode === 'local' ? 'View: {mode}' : 'View: {mode} · {x}, {y}',
            { mode: modeText, x: Math.round(center.x), y: Math.round(center.y) });
        if (label && label.textContent !== text) label.textContent = text;
        const inspection = record.controls.querySelector('.yaw-terrain-canvas-inspection');
        const description = inspectionText(record, center, frame.mode, modeText);
        if (inspection && inspection.textContent !== description) inspection.textContent = description;
        if (record.inspector) {
            record.inspector.hidden = frame.mode === 'local';
            if (record.inspector.textContent !== description) record.inspector.textContent = description;
        }
        updateSurveyList(record, center, modeText);
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
        if (record.focusMarker) {
            const target = record.focusTarget;
            const point = target ? YAW_TERRAIN_VIEWPORT_V1.worldToScreen(frame.camera, target.x, target.y) : null;
            const visible = Boolean(point && frame.mode !== 'local'
                && point.x >= -12 && point.y >= -12
                && point.x <= frame.display.width + 12 && point.y <= frame.display.height + 12);
            record.focusMarker.hidden = !visible;
            if (visible) {
                record.focusMarker.style.transform = `translate(${point.x}px, ${point.y}px)`;
                record.focusMarker.setAttribute('title', target.label || `Map focus ${target.x}, ${target.y}`);
            }
        }
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

    function drawUnsafe(record) {
        const frame = record.surface.render();
        updateMode(record, frame);
        record.frame = frame;
        record.drawCount = (record.drawCount || 0) + 1;
        return frame;
    }

    function restoreLegacyAfterFailure(record, error, phase = 'render') {
        runtimeDisabled = true;
        observer?.disconnect();
        observer = null;
        window.removeEventListener('resize', schedule);
        for (const active of [...records.values()]) unmountRecord(active);
        if (record && records.get(record.container) === record) unmountRecord(record);
        console.warn(`Canvas terrain restored the established renderer after a ${phase} failure.`, error);
        return null;
    }

    function draw(record, options = {}) {
        try {
            return drawUnsafe(record);
        } catch (error) {
            if (options.rethrow === true) throw error;
            return restoreLegacyAfterFailure(record, error, options.phase || 'render');
        }
    }

    function bindGestures(record) {
        const signal = record.abortController.signal;
        const listen = (target, type, handler, options = {}) => target.addEventListener(type, event => {
            try {
                return handler(event);
            } catch (error) {
                return restoreLegacyAfterFailure(record, error, `${type} input`);
            }
        }, { ...options, signal });
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
            if (view === 'local') {
                record.focusTarget = null;
                record.surface.setLocal(record.app.location);
            }
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
            try {
                record.surface.invalidate(record.worldRevision);
            } catch (error) {
                restoreLegacyAfterFailure(record, error, 'asset refresh');
                return;
            }
            draw(record, { phase: 'asset refresh' });
        });
    }

    function unmountRecord(record) {
        if (!record) return;
        try { record.abortController?.abort(); } catch (error) {}
        try { record.surface?.destroy(); } catch (error) {}
        record.canvas?.remove();
        record.controls?.remove();
        record.focusMarker?.remove();
        record.inspector?.remove();
        record.surveyList?.remove();
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
        controls.innerHTML = controlHtml(app);
        const focusMarker = document.createElement('div');
        focusMarker.className = 'yaw-terrain-canvas-focus-marker';
        focusMarker.setAttribute('aria-hidden', 'true');
        focusMarker.hidden = true;
        const inspector = document.createElement('div');
        inspector.className = 'yaw-terrain-canvas-inspector';
        inspector.hidden = true;
        const surveyList = document.createElement('ul');
        surveyList.className = 'visually-hidden yaw-terrain-canvas-survey-list';
        surveyList.setAttribute('aria-label', localized(app, 'ui.terrainCanvas.surveyList', 'Nearby terrain around the survey camera'));
        surveyList.hidden = true;
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
                // Eight-tile chunks keep local movement refreshes bounded on
                // phones while still amortizing survey rendering and caching.
                chunkSize: 8,
                apron: 2,
                cacheTilePixels: size.width <= 420 ? 48 : 64,
                worldRevision: revision,
                resolveTile,
                resolvePresence: presenceResolver(app)
            });
            if (previousCamera) {
                surface.setCamera(previousCamera);
                if (YAW_TERRAIN_VIEWPORT_V1.mode(previousCamera) === 'local') surface.setLocal(app.location);
            } else surface.setLocal(app.location);
            record = {
                app, container, canvas, controls, focusMarker, inspector, surveyList, focusTarget: null, surface, resolveTile, frame: null,
                worldIdentity: worldIdentity(app),
                worldRevision: revision,
                tileVisualSignature: tileVisualSignature(app),
                location: { x: app.location.x, y: app.location.y },
                abortController: new AbortController()
            };
            container.classList.add('yaw-terrain-canvas-alpha');
            container.prepend(canvas);
            container.appendChild(controls);
            container.appendChild(focusMarker);
            container.appendChild(inspector);
            container.appendChild(surveyList);
            records.set(container, record);
            bindGestures(record);
            draw(record, { rethrow: true, phase: 'mount' });
            prepareRendererAssets(record);
            return record;
        } catch (error) {
            if (record) unmountRecord(record);
            else {
                try { surface?.destroy?.(); } catch (destroyError) {}
            }
            canvas.remove();
            controls.remove();
            focusMarker.remove();
            inspector.remove();
            surveyList.remove();
            container.classList.remove('yaw-terrain-canvas-alpha');
            container.removeAttribute('data-terrain-camera-mode');
            restoreLegacyAfterFailure(record, error, 'mount');
            return null;
        }
    }

    function syncContainer(container, app) {
        const prior = records.get(container);
        try {
            if (prior && prior.canvas.isConnected && container.contains(prior.canvas)) {
                const size = canvasSize(container);
                const nextRevision = renderRevision(app);
                const nextIdentity = worldIdentity(app);
                const nextTileVisualSignature = tileVisualSignature(app);
                const camera = prior.surface.camera();
                const isLocal = prior.frame?.mode === 'local' || YAW_TERRAIN_VIEWPORT_V1.mode(camera) === 'local';
                const playerMoved = camera.center.x !== app.location.x || camera.center.y !== app.location.y;
                const locationChanged = prior.location?.x !== app.location.x || prior.location?.y !== app.location.y;
                const resized = Math.abs(size.width - prior.frame.display.width) > 1 || Math.abs(size.height - prior.frame.display.height) > 1;
                const revised = prior.worldRevision !== nextRevision;
                const identityChanged = prior.worldIdentity !== nextIdentity;
                const tileVisualChanged = prior.tileVisualSignature !== nextTileVisualSignature;
                if (identityChanged) {
                    prior.surface.invalidate(nextRevision);
                } else if (revised || (!locationChanged && tileVisualChanged)) {
                    const dirty = new Set(app.dirtyWorldTileKeys?.() || []);
                    dirty.add(`${app.location.x},${app.location.y}`);
                    dirty.add(`${prior.location?.x ?? app.location.x},${prior.location?.y ?? app.location.y}`);
                    prior.surface.invalidateTiles(dirty, nextRevision, { includeApron: revised });
                }
                if (revised || identityChanged) {
                    prior.worldRevision = nextRevision;
                }
                prior.worldIdentity = nextIdentity;
                prior.tileVisualSignature = nextTileVisualSignature;
                prior.location = { x: app.location.x, y: app.location.y };
                if (resized) {
                    prior.surface.resize(size.width, size.height);
                }
                if (isLocal && (playerMoved || resized)) prior.surface.setLocal(app.location);
                if (revised || identityChanged || tileVisualChanged || (isLocal && playerMoved) || resized) {
                    draw(prior, { phase: 'synchronization' });
                } else if (prior.frame) updateMode(prior, prior.frame);
                return prior;
            }
            const camera = prior?.surface.camera();
            const restoreLocal = prior?.frame?.mode === 'local';
            unmountRecord(prior);
            const mounted = mount(container, app, camera);
            if (mounted && restoreLocal) {
                mounted.surface.setLocal(app.location);
                draw(mounted, { phase: 'local remount' });
            }
            return mounted;
        } catch (error) {
            return restoreLegacyAfterFailure(prior, error, 'synchronization');
        }
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
        try {
            record.focusTarget = null;
            record.surface.setSurvey(app.location, 17);
            if (!draw(record)) return false;
        } catch (error) {
            restoreLegacyAfterFailure(record, error, 'survey navigation');
            return false;
        }
        app.closeAllPanels?.();
        record.container.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        record.controls.querySelector('[data-terrain-view="survey"]')?.focus?.({ preventScroll: true });
        return true;
    }

    function focusSurvey(app = window.App, target = {}, options = {}) {
        if (!enabled() || !app || app.inInterior || app.combatState?.active) return false;
        const x = Number(target.x);
        const y = Number(target.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
        const record = [...records.values()].find(candidate => (
            candidate.app === app && candidate.canvas?.isConnected && visibleContainer(candidate.container)
        ));
        if (!record) return false;
        try {
            record.focusTarget = { x, y, label: String(target.label || options.label || '') };
            record.surface.setSurvey({ x, y }, Number(options.visibleTiles) || 17);
            if (!draw(record)) return false;
        } catch (error) {
            restoreLegacyAfterFailure(record, error, 'map target navigation');
            return false;
        }
        app.closeAllPanels?.();
        record.container.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        record.controls.querySelector('[data-terrain-view="survey"]')?.focus?.({ preventScroll: true });
        return true;
    }

    function start() {
        if (!enabled() || observer) return;
        observer = new MutationObserver(mutations => {
            const semanticChange = mutations.some(mutation => {
                const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
                return !target?.closest?.(
                    '.yaw-terrain-canvas-controls, .yaw-terrain-world-canvas, '
                    + '.yaw-terrain-canvas-inspector, .yaw-terrain-canvas-survey-list, .yaw-terrain-canvas-focus-marker'
                );
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
        scheduled = false;
        window.removeEventListener('resize', schedule);
        for (const record of [...records.values()]) unmountRecord(record);
    }

    function diagnostics() {
        return [...records.values()].map(record => ({
            containerId: record.container?.id || '',
            mode: record.frame?.mode || null,
            cacheEntries: record.frame?.cacheEntries || 0,
            drawCount: record.drawCount || 0,
            renderStats: record.frame?.renderStats ? { ...record.frame.renderStats } : null
        }));
    }

    function handleTraversalKey(event = {}) {
        if (!enabled()) return false;
        const direction = YAW_TERRAIN_INPUT_V1.keyboardPan(event);
        if (!direction) return false;
        const surveyRecords = [...records.values()].filter(record => record.canvas?.isConnected && record.frame?.mode !== 'local');
        if (!surveyRecords.length) return false;
        event.preventDefault?.();
        for (const record of surveyRecords) {
            try {
                const pixels = YAW_TERRAIN_VIEWPORT_V1.tilePixels(record.surface.camera());
                record.surface.panPixels(-direction.dx * pixels, -direction.dy * pixels);
                draw(record);
            } catch (error) {
                restoreLegacyAfterFailure(record, error, 'keyboard navigation');
                return false;
            }
        }
        return true;
    }

    if (typeof document !== 'undefined' && enabled()) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }

    return {
        PARAMETER, VALUE, LEGACY_VALUE,
        enabled, start, sync, stop, openSurvey, focusSurvey, diagnostics, handleTraversalKey
    };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_CANVAS_ALPHA = YAW_TERRAIN_CANVAS_ALPHA;
