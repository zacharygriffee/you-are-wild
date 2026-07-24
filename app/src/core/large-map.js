/**
 * YOU ARE WILD LARGE MAP HELPERS
 * Planning/review map rendering without materializing unknown world tiles.
 */

const YAW_LARGE_MAP = {
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

    questMarker(app, x, y) {
        for (const quest of app.quests || []) {
            if (quest.status !== 'active') continue;
            for (const objective of quest.objectives || []) {
                const marker = app._nextQuestObjectiveMarker(objective);
                if (!marker) continue;
                if (Number(marker.x) === Number(x) && Number(marker.y) === Number(y)) {
                    return `${quest.title}: ${marker.label || objective.label || app._questObjectiveLabel(objective)}`;
                }
            }
        }
        return '';
    },

    setZoom(app, delta) {
        const current = app.largeMapRadius || 8;
        app.largeMapRadius = Math.max(4, Math.min(12, current + delta));
        return app.renderLargeMap();
    },

    pan(app, dx, dy) {
        const offset = app.largeMapOffset || { x: 0, y: 0 };
        const step = Math.max(1, Math.floor((app.largeMapRadius || 8) / 2));
        app.largeMapOffset = {
            x: offset.x + dx * step,
            y: offset.y + dy * step
        };
        return app.renderLargeMap();
    },

    recenter(app) {
        app.largeMapOffset = { x: 0, y: 0 };
        return app.renderLargeMap();
    },

    render(app) {
        const container = document.getElementById('large-map');
        const poiContainer = document.getElementById('large-map-pois');
        const viewLabel = document.getElementById('large-map-view');
        if (!container) return '';
        if (app.inInterior && app.activeInterior) {
            const message = app._label('ui.largeMap.outsideOnly', 'Discovered region is available outside.');
            container.innerHTML = `<div class="large-map-tile known" style="width:auto;min-width:180px;padding:8px;">${app._escapeHtml(message)}</div>`;
            if (poiContainer) poiContainer.innerHTML = '';
            if (viewLabel) viewLabel.textContent = app._label('ui.largeMap.interior', 'Interior');
            return container.innerHTML;
        }
        const offset = app.largeMapOffset || { x: 0, y: 0 };
        const cx = app.location.x + (offset.x || 0);
        const cy = app.location.y + (offset.y || 0);
        const radius = app.largeMapRadius || 8;
        if (viewLabel) viewLabel.textContent = `${cx}, ${cy} \u00b7 ${radius * 2 + 1}x${radius * 2 + 1}`;
        const points = [];
        let html = '';
        for (let dy = -radius; dy <= radius; dy++) {
            html += '<div class="large-map-row">';
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                const isCurrent = x === app.location.x && y === app.location.y;
                const tile = this.resolveTile(app, x, y);
                const poi = this.poiLabel(app, tile);
                const questMarker = this.questMarker(app, x, y);
                const visual = app._mapTileVisual(tile, {
                    isCurrent,
                    questMarker,
                    poi,
                    neighborResolver: (nx, ny) => this.resolveTile(app, nx, ny)
                });
                let classes = 'large-map-tile';
                if (tile) classes += ' known';
                if (isCurrent) classes += ' current';
                if (poi) classes += ' poi';
                if (questMarker) classes += ' quest';
                if (visual.classes) classes += ` ${visual.classes}`;
                const unknownLabel = app._label('ui.largeMap.unknownTile', 'Unknown');
                const label = tile ? `${visual.label} (${x}, ${y})` : `${unknownLabel} (${x}, ${y})`;
                const markerLabel = questMarker || poi;
                const tileArt = app._mapTileArtHtml(visual);
                html += `<div class="${classes}" ${app._mapTileAttrs(visual)} title="${app._escapeHtml(markerLabel ? `${label}: ${markerLabel}` : label)}" aria-label="${app._escapeHtml(label)}">${tileArt}<span class="large-map-tile-icon" aria-hidden="true">${app._escapeHtml(visual.icon)}</span></div>`;
                if (poi) points.push({ x, y, biome: visual.label || app._label('ui.largeMap.knownArea', 'Known area'), poi });
                if (questMarker) points.push({ x, y, biome: app._label('ui.largeMap.questMarker', 'Quest'), poi: questMarker });
            }
            html += '</div>';
        }
        container.innerHTML = html;
        if (poiContainer) {
            poiContainer.innerHTML = points.length
                ? points.slice(0, 6).map(point => `<div>${app._escapeHtml(point.poi)} <span style="color:var(--text-muted);">(${point.x}, ${point.y})</span></div>`).join('')
                : `<div>${app._escapeHtml(app._label('ui.largeMap.noPoints', 'No discovered points of interest nearby.'))}</div>`;
        }
        return html;
    }
};

window.YAW_LARGE_MAP = YAW_LARGE_MAP;
