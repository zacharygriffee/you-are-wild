/**
 * YOU ARE WILD LOCAL MAP
 * Mobile local-map rendering and coordinated surface refresh.
 */

const YAW_LOCAL_MAP = {
    render(app) {
        if (app.inInterior && app.activeInterior) {
            this.renderInterior(app);
            return;
        }
        this.renderOverworld(app);
    },

    renderInterior(app) {
        const cx = app.interiorLocation.x;
        const cy = app.interiorLocation.y;
        let html = '';
        for (let dy = -2; dy <= 2; dy++) {
            html += '<div style="display:flex;gap:4px;justify-content:center;">';
            for (let dx = -2; dx <= 2; dx++) {
                const tx = dx;
                const ty = dy;
                const room = app.activeInterior.tiles[`${tx},${ty}`];
                const isCenter = tx === cx && ty === cy;
                const isAdjacent = Math.abs(tx - cx) <= 1 && Math.abs(ty - cy) <= 1;
                const visual = app._interiorTileVisual(room);
                const content = visual.icon;
                let classes = 'map-tile';
                if (isCenter) classes += ' center';
                else if (room?.explored) classes += ' explored';
                else if (isAdjacent) classes += ' moveable';
                else classes += ' far';
                if (visual.classes) classes += ` ${visual.classes}`;
                const onclick = isCenter ? '' : (isAdjacent ? `onclick="App.move(${tx - cx},${ty - cy})"` : '');
                const title = `${visual.label} (${tx}, ${ty})`;
                html += `<div class="${classes}" ${app._mapTileAttrs(visual)} title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}" ${onclick}>${app._escapeHtml(content)}</div>`;
            }
            html += '</div>';
        }
        this.writeMobileMap(html);
        const coords = document.getElementById('coords');
        if (coords) coords.textContent = `Inside ${app.activeInterior.structureName}`;
        const mobileCoords = document.getElementById('mobile-coords');
        if (mobileCoords) mobileCoords.textContent = `Inside ${cx}, ${cy}`;
        app.renderTileInfo();
        app.renderLargeMap();
        app.renderDesktopPlaySurface();
        app._renderTime();
    },

    renderOverworld(app) {
        const cx = app.location.x;
        const cy = app.location.y;
        const visibilityRadius = app._mapVisibilityRadius();
        let html = '';
        for (let dy = -2; dy <= 2; dy++) {
            html += '<div style="display:flex;gap:4px;justify-content:center;">';
            for (let dx = -2; dx <= 2; dx++) {
                const tx = cx + dx;
                const ty = cy + dy;
                const isCenter = dx === 0 && dy === 0;
                const isExplored = app.isExplored(tx, ty);
                const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
                const isVisible = Math.abs(dx) <= visibilityRadius && Math.abs(dy) <= visibilityRadius;
                const tile = (isVisible && (isExplored || isAdjacent)) ? app.getTile(tx, ty) : null;
                const visual = app._mapTileVisual(tile, {
                    isCurrent: false,
                    neighborResolver: (nx, ny) => {
                        const vx = nx - cx;
                        const vy = ny - cy;
                        const known = app.isExplored(nx, ny) || (Math.abs(vx) <= 1 && Math.abs(vy) <= 1);
                        const visible = Math.abs(vx) <= visibilityRadius && Math.abs(vy) <= visibilityRadius;
                        return visible && known ? app.getTile(nx, ny) : null;
                    }
                });
                const hasCreatures = tile && tile.creatures && tile.creatures.length > 0;
                let classes = 'map-tile';
                if (isCenter) classes += ' center';
                else if (!isVisible) classes += ' far';
                else if (isExplored) classes += ' explored';
                else if (isAdjacent) classes += ' moveable';
                else classes += ' far';
                if (visual.classes) classes += ` ${visual.classes}`;
                if (hasCreatures) classes += ' has-enemy';
                const onclick = isCenter ? '' : (isAdjacent ? `onclick="App.move(${dx},${dy})"` : '');
                const title = tile ? `${visual.label} (${tx}, ${ty})` : `${tx}, ${ty}`;
                html += `<div class="${classes}" ${app._mapTileAttrs(visual)} title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}" ${onclick}>${app._escapeHtml(visual.icon)}</div>`;
            }
            html += '</div>';
        }
        this.writeMobileMap(html);
        const mobileCoords = document.getElementById('mobile-coords');
        if (mobileCoords) mobileCoords.textContent = `${cx}, ${cy}`;
        app.renderTileInfo(app.getTile(cx, cy));
        app.renderLargeMap();
        app.renderDesktopPlaySurface();
        app.applyMobileMapZoom();
        app._renderTime();
    },

    writeMobileMap(html) {
        const containers = [document.getElementById('mobile-mini-map')].filter(Boolean);
        containers.forEach(container => { container.innerHTML = html; });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_LOCAL_MAP = YAW_LOCAL_MAP;
}
