/**
 * YOU ARE WILD LOCAL MAP
 * Mobile local-map rendering and coordinated surface refresh.
 */

const YAW_LOCAL_MAP = {
    cells: [
        { dx: -1, dy: -1, key: 'nw' },
        { dx: 0, dy: -1, key: 'n' },
        { dx: 1, dy: -1, key: 'ne' },
        { dx: -1, dy: 0, key: 'w' },
        { dx: 0, dy: 0, key: 'center' },
        { dx: 1, dy: 0, key: 'e' },
        { dx: -1, dy: 1, key: 'sw' },
        { dx: 0, dy: 1, key: 's' },
        { dx: 1, dy: 1, key: 'se' }
    ],

    render(app) {
        if (app.inInterior && app.activeInterior) {
            this.renderInterior(app);
            return;
        }
        this.renderOverworld(app);
    },

    cellHtml(app, { classes, visual, title, dx, dy, key, moveable }) {
        const escapedTitle = app._escapeHtml(title);
        const movementAttrs = moveable
            ? `onclick="App.move(${dx},${dy})" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.move(${dx},${dy})}"`
            : 'tabindex="-1"';
        return `<div class="${classes}" data-mobile-play-cell="${key}" data-direction="${key}" ${app._mapTileAttrs(visual)} title="${escapedTitle}" aria-label="${escapedTitle}" ${movementAttrs}>${app._escapeHtml(visual.icon)}</div>`;
    },

    renderInterior(app) {
        const cx = app.interiorLocation.x;
        const cy = app.interiorLocation.y;
        let html = '';
        this.cells.forEach(cell => {
            const tx = cx + cell.dx;
            const ty = cy + cell.dy;
            const room = app.activeInterior.tiles[`${tx},${ty}`];
            const isCenter = cell.key === 'center';
            const visual = app._interiorTileVisual(room);
            let classes = 'map-tile mobile-play-cell';
            if (isCenter) classes += ' center';
            else if (room?.explored) classes += ' explored moveable';
            else if (room) classes += ' moveable';
            else classes += ' far';
            if (visual.classes) classes += ` ${visual.classes}`;
            const title = isCenter
                ? `${visual.label} (${tx}, ${ty})`
                : `${app._directionLabel(cell.dx, cell.dy)}: ${visual.label} (${tx}, ${ty})`;
            html += this.cellHtml(app, { classes, visual, title, dx: cell.dx, dy: cell.dy, key: cell.key, moveable: Boolean(room) && !isCenter });
        });
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
        this.cells.forEach(cell => {
            const tx = cx + cell.dx;
            const ty = cy + cell.dy;
            const isCenter = cell.key === 'center';
            const isExplored = app.isExplored(tx, ty);
            const isVisible = Math.abs(cell.dx) <= visibilityRadius && Math.abs(cell.dy) <= visibilityRadius;
            const tile = (isVisible && (isExplored || !isCenter)) || isCenter ? app.getTile(tx, ty) : null;
            const visual = app._mapTileVisual(tile, {
                isCurrent: isCenter,
                neighborResolver: (nx, ny) => {
                    const vx = nx - cx;
                    const vy = ny - cy;
                    const known = app.isExplored(nx, ny) || (Math.abs(vx) <= 1 && Math.abs(vy) <= 1);
                    const visible = Math.abs(vx) <= visibilityRadius && Math.abs(vy) <= visibilityRadius;
                    return visible && known ? app.getTile(nx, ny) : null;
                }
            });
            const hasCreatures = tile && tile.creatures && tile.creatures.length > 0;
            let classes = 'map-tile mobile-play-cell';
            if (isCenter) classes += ' center';
            else if (!isVisible) classes += ' far';
            else if (isExplored) classes += ' explored moveable';
            else classes += ' moveable';
            if (visual.classes) classes += ` ${visual.classes}`;
            if (hasCreatures) classes += ' has-enemy';
            const title = tile
                ? (isCenter ? `${visual.label} (${tx}, ${ty})` : `${app._directionLabel(cell.dx, cell.dy)}: ${visual.label} (${tx}, ${ty})`)
                : `${tx}, ${ty}`;
            html += this.cellHtml(app, { classes, visual, title, dx: cell.dx, dy: cell.dy, key: cell.key, moveable: !isCenter && isVisible });
        });
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
