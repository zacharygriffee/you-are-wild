/**
 * YOU ARE WILD REVIEW MAP V2
 * Read-only planning layers. Unknown world tiles are never materialized.
 */

const YAW_LARGE_MAP = {
    FILTERS: Object.freeze({
        objective: ['🎯', 'Objectives'],
        turnIn: ['✅', 'Turn-ins'],
        giver: ['📜', 'Quest givers'],
        structure: ['🏠', 'Structures'],
        danger: ['⚠️', 'Danger'],
        party: ['👥', 'Party'],
        recovery: ['🎒', 'Recovery'],
        poi: ['◆', 'Other points']
    }),

    isKnown(app, x, y) {
        const key = app._tileKey(x, y);
        if (x === app.location.x && y === app.location.y) return true;
        if (app.exploredTiles?.has(key)) return true;
        const cached = app.worldMap?.get(key);
        if (cached && (cached.explored || cached.seen || cached.hasLandmark || cached.structure || (cached.creatures || []).length || (cached.items || []).length)) return true;
        const delta = app.getTileDelta(x, y);
        return Boolean(delta && (delta.explored || delta.seen || delta.hasLandmark || delta.structure || (delta.creatures || []).length || (delta.items || []).length));
    },

    resolveTile(app, x, y) {
        if (!this.isKnown(app, x, y)) return null;
        const key = app._tileKey(x, y);
        const cached = app.worldMap?.get(key);
        if (cached) return cached;
        return app.applyTileDelta(app.getBaseTile(x, y), app.getTileDelta(x, y));
    },

    poiLabel(app, tile) {
        if (!tile) return '';
        if (tile.hasLandmark && tile.landmarkName) return tile.landmarkName;
        if (tile.structure) return app.STRUCTURES[tile.structure]?.name || tile.structure;
        const living = (tile.creatures || []).filter(creature => app._isLivingCreature(creature));
        if (living.length > 0) return app._label(living.length === 1 ? 'ui.largeMap.creatureCountOne' : 'ui.largeMap.creatureCountMany', living.length === 1 ? '{count} creature' : '{count} creatures', { count: living.length });
        const itemCount = (tile.items || []).length;
        if (itemCount > 0) return app._label(itemCount === 1 ? 'ui.largeMap.itemCountOne' : 'ui.largeMap.itemCountMany', itemCount === 1 ? '{count} item' : '{count} items', { count: itemCount });
        return '';
    },

    questTitle(app, quest) {
        return app._questTitleLabel?.(quest) || quest?.title || app._label('ui.largeMap.questMarker', 'Quest');
    },

    objectiveMarker(app, quest) {
        for (const objective of quest?.objectives || []) {
            const marker = app._nextQuestObjectiveMarker(objective);
            if (marker) return { marker, objective };
        }
        return null;
    },

    questMarker(app, x, y) {
        const marker = this.markersAt(app, x, y).find(entry => entry.kind === 'objective' || entry.kind === 'turnIn');
        return marker?.label || '';
    },

    marker(kind, label, detail = '', questId = null) {
        return { kind, label, detail, questId, icon: this.FILTERS[kind]?.[0] || '◆' };
    },

    markersAt(app, x, y, tile = undefined) {
        const found = [];
        const same = location => location
            && Number(location.x) === Number(x)
            && Number(location.y) === Number(y);
        const quests = (app.quests || []).filter(quest => ['active', 'objectives_complete'].includes(quest.lifecycleState) || quest.status === 'active');
        for (const quest of quests) {
            const title = this.questTitle(app, quest);
            const objective = this.objectiveMarker(app, quest);
            if (objective && same(objective.marker)) {
                const objectiveLabel = objective.marker.label || app._questObjectiveLabel?.(objective.objective) || '';
                found.push(this.marker('objective', `${title}: ${objectiveLabel}`, objectiveLabel, String(quest.id)));
            }
            const turnIn = app._questTurnInMarker?.(quest) || (typeof YAW_QUEST_FLOW !== 'undefined' ? YAW_QUEST_FLOW.turnInMarker(app, quest) : null);
            const ready = quest.lifecycleState === 'objectives_complete';
            if (ready && same(turnIn)) found.push(this.marker('turnIn', `${title}: ${turnIn.label || app._label('quest.turnIn', 'Turn in')}`, '', String(quest.id)));
            if (same(quest.giverLocation)) found.push(this.marker('giver', quest.giverName || quest.giverLocation.label || title, title, String(quest.id)));
        }

        const knownTile = tile === undefined ? this.resolveTile(app, x, y) : tile;
        if (knownTile) {
            if (knownTile.structure) found.push(this.marker('structure', app.STRUCTURES[knownTile.structure]?.name || knownTile.structure));
            const dangerPressure = Number(knownTile.dangerPressure ?? knownTile.worldFields?.dangerPressure ?? 0);
            const dangerId = dangerPressure >= 0.72 ? 'severe' : (dangerPressure >= 0.52 ? 'dangerous' : (dangerPressure >= 0.34 ? 'guarded' : 'low'));
            if (dangerId !== 'low') {
                const dangerLabels = {
                    guarded: app._label('ui.tileInfo.dangerGuarded', 'Guarded'),
                    dangerous: app._label('ui.tileInfo.dangerDangerous', 'Dangerous'),
                    severe: app._label('ui.tileInfo.dangerSevere', 'Severe')
                };
                found.push(this.marker('danger', dangerLabels[dangerId], app._label('ui.tileInfo.danger', 'Danger')));
            }
            if ((knownTile.deathBags || []).length) found.push(this.marker('recovery', app._label('recovery.deathBag', 'Recovery bag')));
            const dropped = (knownTile.creatures || []).filter(unit => unit?.droppedOffCompanion);
            if (dropped.length) found.push(this.marker('party', dropped.map(unit => unit.name).join(', '), app._label('ui.largeMap.partyWaiting', 'Waiting party')));
            const poi = this.poiLabel(app, knownTile);
            if (poi && (!knownTile.structure || knownTile.hasLandmark)) found.push(this.marker('poi', poi));
        }
        return found;
    },

    activeFilters(app) {
        if (!app.largeMapFilters) {
            app.largeMapFilters = Object.fromEntries(Object.keys(this.FILTERS).map(kind => [kind, true]));
        }
        return app.largeMapFilters;
    },

    visibleMarkers(app, markers) {
        const filters = this.activeFilters(app);
        return markers.filter(marker => filters[marker.kind] !== false);
    },

    trackedQuest(app) {
        const active = (app.quests || []).filter(quest => ['active', 'objectives_complete'].includes(quest.lifecycleState) || quest.status === 'active');
        let quest = active.find(entry => String(entry.id) === String(app.trackedQuestId || ''));
        if (!quest) quest = active[0] || null;
        if (quest && app.trackedQuestId !== String(quest.id)) app.trackedQuestId = String(quest.id);
        return quest;
    },

    knownRoute(app, destination) {
        if (!destination) return null;
        const start = { x: Number(app.location.x || 0), y: Number(app.location.y || 0) };
        const goalKey = `${Number(destination.x)},${Number(destination.y)}`;
        const startKey = `${start.x},${start.y}`;
        if (goalKey === startKey) return [];
        if (!this.isKnown(app, Number(destination.x), Number(destination.y))) return null;
        const queue = [{ ...start, path: [] }];
        const visited = new Set([startKey]);
        const directions = [
            { id: 'north', dx: 0, dy: -1 },
            { id: 'east', dx: 1, dy: 0 },
            { id: 'south', dx: 0, dy: 1 },
            { id: 'west', dx: -1, dy: 0 }
        ];
        while (queue.length && visited.size <= 512) {
            const current = queue.shift();
            for (const direction of directions) {
                const next = { x: current.x + direction.dx, y: current.y + direction.dy };
                const key = `${next.x},${next.y}`;
                if (visited.has(key) || !this.isKnown(app, next.x, next.y)) continue;
                const tile = this.resolveTile(app, next.x, next.y);
                const traversal = tile?.traversal || tile?.terrain?.traversal;
                if (traversal?.passable === false) continue;
                const path = [...current.path, direction.id];
                if (key === goalKey) return path;
                visited.add(key);
                queue.push({ ...next, path });
            }
        }
        return null;
    },

    questGuidance(app, quest) {
        if (!quest) return null;
        const ready = quest.lifecycleState === 'objectives_complete';
        const objective = ready ? null : this.objectiveMarker(app, quest);
        const location = ready
            ? (typeof YAW_QUEST_FLOW !== 'undefined' ? YAW_QUEST_FLOW.turnInMarker(app, quest) : null)
            : objective?.marker;
        if (!location) return null;
        const dx = Number(location.x) - Number(app.location.x || 0);
        const dy = Number(location.y) - Number(app.location.y || 0);
        const distance = Math.abs(dx) + Math.abs(dy);
        const vertical = dy < 0 ? app._label('direction.north', 'north') : (dy > 0 ? app._label('direction.south', 'south') : '');
        const horizontal = dx < 0 ? app._label('direction.west', 'west') : (dx > 0 ? app._label('direction.east', 'east') : '');
        const direction = [vertical, horizontal].filter(Boolean).join(' ') || app._label('ui.largeMap.here', 'here');
        const route = this.knownRoute(app, location);
        return {
            quest,
            location,
            distance,
            direction,
            route,
            label: ready
                ? app._label('ui.largeMap.readyToTurnIn', 'Ready to turn in')
                : (location.label || app._questObjectiveLabel?.(objective?.objective) || app._label('ui.largeMap.objective', 'Objective'))
        };
    },

    setZoom(app, delta) {
        const current = app.largeMapRadius || 8;
        app.largeMapRadius = Math.max(4, Math.min(12, current + delta));
        return app.renderLargeMap();
    },

    pan(app, dx, dy) {
        const offset = app.largeMapOffset || { x: 0, y: 0 };
        const step = Math.max(1, Math.floor((app.largeMapRadius || 8) / 2));
        app.largeMapOffset = { x: offset.x + dx * step, y: offset.y + dy * step };
        return app.renderLargeMap();
    },

    recenter(app) {
        app.largeMapOffset = { x: 0, y: 0 };
        return app.renderLargeMap();
    },

    selectTile(app, x, y) {
        const tile = this.resolveTile(app, Number(x), Number(y));
        const markers = this.visibleMarkers(app, this.markersAt(app, Number(x), Number(y), tile));
        if (!tile && !markers.length) return false;
        app.largeMapSelected = { x: Number(x), y: Number(y) };
        return app.renderLargeMap();
    },

    toggleFilter(app, kind) {
        if (!this.FILTERS[kind]) return false;
        const filters = this.activeFilters(app);
        filters[kind] = filters[kind] === false;
        return app.renderLargeMap();
    },

    trackQuest(app, questId) {
        app.trackedQuestId = questId ? String(questId) : null;
        const quest = this.trackedQuest(app);
        const guidance = this.questGuidance(app, quest);
        if (guidance) {
            app.largeMapOffset = {
                x: Number(guidance.location.x) - Number(app.location.x || 0),
                y: Number(guidance.location.y) - Number(app.location.y || 0)
            };
        }
        app.markAutoSaveDirty?.(['quests'], 'track-quest');
        app.autoSave?.();
        return app.renderLargeMap();
    },

    toggleDock(app) {
        app.largeMapDocked = !app.largeMapDocked;
        document.getElementById('panel-map')?.classList.toggle('docked', app.largeMapDocked);
        return app.largeMapDocked;
    },

    renderFilters(app) {
        const container = document.getElementById('large-map-filters');
        const legend = document.getElementById('large-map-legend');
        if (!container) return;
        const filters = this.activeFilters(app);
        container.innerHTML = Object.entries(this.FILTERS).map(([kind, [icon, fallback]]) => {
            const label = app._label(`ui.largeMap.filter.${kind}`, fallback);
            const enabled = filters[kind] !== false;
            return `<button type="button" class="large-map-filter${enabled ? ' active' : ''}" aria-pressed="${enabled}" onclick="App.toggleLargeMapFilter('${kind}')"><span aria-hidden="true">${icon}</span>${app._escapeHtml(label)}</button>`;
        }).join('');
        if (legend) {
            legend.innerHTML = Object.entries(this.FILTERS)
                .filter(([kind]) => filters[kind] !== false)
                .map(([kind, [icon, fallback]]) => `<span><span aria-hidden="true">${icon}</span> ${app._escapeHtml(app._label(`ui.largeMap.filter.${kind}`, fallback))}</span>`)
                .join('');
        }
    },

    renderTracked(app) {
        const container = document.getElementById('large-map-tracked');
        if (!container) return;
        const active = (app.quests || []).filter(quest => ['active', 'objectives_complete'].includes(quest.lifecycleState) || quest.status === 'active');
        if (!active.length) {
            container.innerHTML = `<span>${app._escapeHtml(app._label('ui.largeMap.noTrackedQuest', 'No active quest to track.'))}</span>`;
            return;
        }
        const tracked = this.trackedQuest(app);
        const guidance = this.questGuidance(app, tracked);
        const options = active.map(quest => `<option value="${app._escapeHtml(String(quest.id))}"${String(quest.id) === String(tracked?.id) ? ' selected' : ''}>${app._escapeHtml(this.questTitle(app, quest))}</option>`).join('');
        const summary = guidance
            ? app._label('ui.largeMap.guidance', '{label} · {distance} step(s) {direction}', {
                label: guidance.label,
                distance: guidance.distance,
                direction: guidance.direction
            }) + (guidance.route?.length
                ? ` · ${app._label('ui.largeMap.knownRoute', 'Known route: {direction}, {steps} step(s)', {
                    direction: app._label(`direction.${guidance.route[0]}`, guidance.route[0]),
                    steps: guidance.route.length
                })}`
                : '')
            : app._label('ui.largeMap.noGuidance', 'No mapped destination for this quest.');
        container.innerHTML = `<label><span>${app._escapeHtml(app._label('ui.largeMap.trackedQuest', 'Tracked quest'))}</span><select onchange="App.trackQuestOnMap(this.value)">${options}</select></label><div>${app._escapeHtml(summary)}</div>`;
    },

    renderInspector(app) {
        const container = document.getElementById('large-map-inspector');
        if (!container) return;
        const selected = app.largeMapSelected || { x: app.location.x, y: app.location.y };
        const tile = this.resolveTile(app, selected.x, selected.y);
        const markers = this.visibleMarkers(app, this.markersAt(app, selected.x, selected.y, tile));
        if (!tile && !markers.length) {
            container.innerHTML = `<strong>${app._escapeHtml(app._label('ui.largeMap.selectedTile', 'Selected tile'))}</strong><span>${selected.x}, ${selected.y} · ${app._escapeHtml(app._label('ui.largeMap.unknownTile', 'Unknown'))}</span>`;
            return;
        }
        const visual = app._mapTileVisual(tile, { isCurrent: selected.x === app.location.x && selected.y === app.location.y });
        const distance = Math.abs(selected.x - app.location.x) + Math.abs(selected.y - app.location.y);
        const markerHtml = markers.length
            ? `<div class="large-map-inspector-markers">${markers.map(marker => `<span>${marker.icon} ${app._escapeHtml(marker.label)}</span>`).join('')}</div>`
            : '';
        container.innerHTML = `<strong>${app._escapeHtml(app._label('ui.largeMap.selectedTile', 'Selected tile'))}</strong><span>${app._escapeHtml(visual.label || app._label('ui.largeMap.knownArea', 'Known area'))} · ${selected.x}, ${selected.y} · ${app._escapeHtml(app._label('ui.largeMap.distance', '{distance} step(s) away', { distance }))}</span>${markerHtml}`;
    },

    render(app) {
        const container = document.getElementById('large-map');
        const poiContainer = document.getElementById('large-map-pois');
        const viewLabel = document.getElementById('large-map-view');
        if (!container) return '';
        document.getElementById('panel-map')?.classList.toggle('docked', Boolean(app.largeMapDocked));
        this.renderFilters(app);
        this.renderTracked(app);
        if (app.inInterior && app.activeInterior) {
            const message = app._label('ui.largeMap.outsideOnly', 'Discovered region is available outside.');
            container.innerHTML = `<div class="large-map-tile known" style="width:auto;min-width:180px;padding:8px;">${app._escapeHtml(message)}</div>`;
            if (poiContainer) poiContainer.innerHTML = '';
            if (viewLabel) viewLabel.textContent = app._label('ui.largeMap.interior', 'Interior');
            this.renderInspector(app);
            return container.innerHTML;
        }
        const offset = app.largeMapOffset || { x: 0, y: 0 };
        const cx = app.location.x + (offset.x || 0);
        const cy = app.location.y + (offset.y || 0);
        const radius = app.largeMapRadius || 8;
        if (viewLabel) viewLabel.textContent = `${cx}, ${cy} · ${radius * 2 + 1}x${radius * 2 + 1}`;
        const points = [];
        let html = '';
        for (let dy = -radius; dy <= radius; dy++) {
            html += '<div class="large-map-row">';
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                const isCurrent = x === app.location.x && y === app.location.y;
                const selected = Number(app.largeMapSelected?.x) === x && Number(app.largeMapSelected?.y) === y;
                const tile = this.resolveTile(app, x, y);
                const markers = this.visibleMarkers(app, this.markersAt(app, x, y, tile));
                const poi = this.poiLabel(app, tile);
                const questMarker = markers.find(marker => marker.kind === 'objective' || marker.kind === 'turnIn')?.label || '';
                const visual = app._mapTileVisual(tile, { isCurrent, questMarker, poi, neighborResolver: (nx, ny) => this.resolveTile(app, nx, ny) });
                let classes = 'large-map-tile';
                if (tile) classes += ' known';
                if (isCurrent) classes += ' current';
                if (selected) classes += ' selected';
                if (questMarker) classes += ' quest';
                if (markers.length) classes += ' marked';
                if (visual.classes) classes += ` ${visual.classes}`;
                const unknownLabel = app._label('ui.largeMap.unknownTile', 'Unknown');
                const label = tile ? `${visual.label} (${x}, ${y})` : `${unknownLabel} (${x}, ${y})`;
                const markerLabel = markers.map(marker => marker.label).join('; ');
                const title = markerLabel ? `${label}: ${markerLabel}` : label;
                const tileArt = app._mapTileArtHtml(visual);
                const markerIcons = markers.slice(0, 2).map(marker => marker.icon).join('');
                const enabled = Boolean(tile || markers.length);
                html += `<button type="button" class="${classes}" ${app._mapTileAttrs(visual)} title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${enabled ? ` onclick="App.selectLargeMapTile(${x},${y})"` : ' disabled'}>${tileArt}<span class="large-map-tile-icon" aria-hidden="true">${app._escapeHtml(visual.icon)}</span>${markerIcons ? `<span class="large-map-marker-icons" aria-hidden="true">${markerIcons}</span>` : ''}</button>`;
                for (const marker of markers) points.push({ x, y, marker });
            }
            html += '</div>';
        }
        container.innerHTML = html;
        if (poiContainer) {
            poiContainer.innerHTML = points.length
                ? points.slice(0, 8).map(point => `<button type="button" onclick="App.selectLargeMapTile(${point.x},${point.y})">${point.marker.icon} ${app._escapeHtml(point.marker.label)} <span>(${point.x}, ${point.y})</span></button>`).join('')
                : `<div>${app._escapeHtml(app._label('ui.largeMap.noPoints', 'No discovered points of interest nearby.'))}</div>`;
        }
        this.renderInspector(app);
        return html;
    }
};

window.YAW_LARGE_MAP = YAW_LARGE_MAP;
