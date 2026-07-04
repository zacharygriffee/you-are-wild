/**
 * YOU ARE WILD DESKTOP PLAY SURFACE HELPERS
 * Rendering helpers for the 3x3 traversal/context surface.
 */

const YAW_DESKTOP_PLAY_SURFACE = {
    cells: [
        { id: 'desktop-play-cell-nw', dx: -1, dy: -1 },
        { id: 'desktop-play-cell-n', dx: 0, dy: -1 },
        { id: 'desktop-play-cell-ne', dx: 1, dy: -1 },
        { id: 'desktop-play-cell-w', dx: -1, dy: 0 },
        { id: 'desktop-play-cell-e', dx: 1, dy: 0 },
        { id: 'desktop-play-cell-sw', dx: -1, dy: 1 },
        { id: 'desktop-play-cell-s', dx: 0, dy: 1 },
        { id: 'desktop-play-cell-se', dx: 1, dy: 1 }
    ],

    cellHtml(app, visual, label) {
        const escapedLabel = app._escapeHtml(label);
        return `<span class="desktop-play-cell-icon" aria-hidden="true">${app._escapeHtml(visual.icon)}</span><span class="desktop-play-cell-label">${escapedLabel}</span>`;
    },

    directionLabel(app, dx, dy) {
        const directions = {
            '-1,-1': app._label('direction.northwest', 'Northwest'),
            '0,-1': app._label('direction.north', 'North'),
            '1,-1': app._label('direction.northeast', 'Northeast'),
            '-1,0': app._label('direction.west', 'West'),
            '1,0': app._label('direction.east', 'East'),
            '-1,1': app._label('direction.southwest', 'Southwest'),
            '0,1': app._label('direction.south', 'South'),
            '1,1': app._label('direction.southeast', 'Southeast')
        };
        return directions[`${dx},${dy}`] || '';
    },

    updateCenter(app, visual, label) {
        const el = document.getElementById('desktop-play-cell-center');
        if (!el) return;
        el.className = `desktop-play-cell center ${visual?.classes || ''}`;
        if (typeof el.setAttribute === 'function') {
            el.setAttribute('title', app._escapeHtml(label));
            el.setAttribute('aria-label', app._escapeHtml(label));
            el.setAttribute('data-tileset-key', visual?.tilesetKey || 'unknown');
            el.setAttribute('data-base-tileset-key', visual?.baseTilesetKey || visual?.tilesetKey || 'unknown');
            el.setAttribute('data-map-kind', visual?.kind || 'current');
            if (visual?.routeShape) el.setAttribute('data-route-shape', visual.routeShape);
            else if (typeof el.removeAttribute === 'function') el.removeAttribute('data-route-shape');
        }
    },

    updateCell(app, el, visual, label, dx, dy, moveable = true) {
        if (!el) return;
        const classes = `desktop-play-cell${moveable ? ' moveable' : ''} ${visual.classes || ''}`;
        const escapedLabel = app._escapeHtml(label);
        el.className = classes;
        el.innerHTML = this.cellHtml(app, visual, label);
        if (typeof el.setAttribute === 'function') {
            el.setAttribute('title', escapedLabel);
            el.setAttribute('aria-label', escapedLabel);
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', moveable ? '0' : '-1');
            el.setAttribute('data-tileset-key', visual?.tilesetKey || 'unknown');
            el.setAttribute('data-base-tileset-key', visual?.baseTilesetKey || visual?.tilesetKey || 'unknown');
            el.setAttribute('data-map-kind', visual?.kind || 'unknown');
            if (visual?.routeShape) el.setAttribute('data-route-shape', visual.routeShape);
            else if (typeof el.removeAttribute === 'function') el.removeAttribute('data-route-shape');
            if (moveable) el.setAttribute('onclick', `App.move(${dx},${dy})`);
            else if (typeof el.removeAttribute === 'function') el.removeAttribute('onclick');
            if (moveable) el.setAttribute('onkeydown', `if(event.key==='Enter'||event.key===' '){event.preventDefault();App.move(${dx},${dy})}`);
            else if (typeof el.removeAttribute === 'function') el.removeAttribute('onkeydown');
        }
        el.onclick = moveable ? () => app.move(dx, dy) : null;
    },

    renderInterior(app) {
        const cx = app.interiorLocation.x;
        const cy = app.interiorLocation.y;
        this.cells.forEach(cell => {
            const el = document.getElementById(cell.id);
            if (!el) return;
            const tx = cx + cell.dx;
            const ty = cy + cell.dy;
            const room = app.activeInterior.tiles[`${tx},${ty}`];
            const visual = app._interiorTileVisual(room);
            const direction = this.directionLabel(app, cell.dx, cell.dy);
            const label = `${direction}: ${visual.label} (${tx}, ${ty})`;
            this.updateCell(app, el, visual, label, cell.dx, cell.dy, Boolean(room));
        });
        const currentRoom = app.activeInterior.tiles[`${cx},${cy}`];
        const currentVisual = app._interiorTileVisual(currentRoom);
        this.updateCenter(app, currentVisual, `${currentVisual.label} (${cx}, ${cy})`);
    },

    renderExploration(app) {
        const cx = app.location.x;
        const cy = app.location.y;
        this.cells.forEach(cell => {
            const el = document.getElementById(cell.id);
            if (!el) return;
            const tx = cx + cell.dx;
            const ty = cy + cell.dy;
            const tile = app.getTile(tx, ty);
            const visual = app._mapTileVisual(tile, {
                neighborResolver: (nx, ny) => app.getTile(nx, ny)
            });
            const direction = this.directionLabel(app, cell.dx, cell.dy);
            const label = `${direction}: ${visual.label} (${tx}, ${ty})`;
            this.updateCell(app, el, visual, label, cell.dx, cell.dy, true);
        });
        const currentTile = app.getTile(cx, cy);
        const currentVisual = app._mapTileVisual(currentTile, {
            neighborResolver: (nx, ny) => app.getTile(nx, ny)
        });
        this.updateCenter(app, currentVisual, `${currentVisual.label} (${cx}, ${cy})`);
    },

    render(app) {
        if (app.inInterior && app.activeInterior) {
            this.renderInterior(app);
            return;
        }
        this.renderExploration(app);
    }
};

window.YAW_DESKTOP_PLAY_SURFACE = YAW_DESKTOP_PLAY_SURFACE;
