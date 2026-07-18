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

    isPresenceSelected(app, entry) {
        const unit = entry?.unit || {};
        const type = entry?.type || '';
        if (type === 'items') return app.focusedStageObject?.type === 'items';
        if (type === 'place') return app.focusedStageObject?.type === 'place' && app.focusedStageObject.id === unit.id;
        const presenceType = type === 'creature' ? 'creature' : 'party';
        if (presenceType === 'creature') return app._isExplorationTargetUnit('creature', unit);
        return Boolean(app.explorationActorSelectionExplicit) && app._getExplorationActors().includes(unit);
    },

    visibleCenterPresenceEntries(app, presence = []) {
        if (presence.length <= 1) return { visible: presence, overflow: [] };
        if (typeof YAW_CENTER_CONTEXT !== 'undefined' && YAW_CENTER_CONTEXT.prioritizedPresenceEntries) {
            return YAW_CENTER_CONTEXT.prioritizedPresenceEntries(app, presence, 1);
        }
        const visible = presence.slice(0, 1);
        return { visible, overflow: presence.slice(visible.length) };
    },

    centerPresenceHtml(app) {
        const presence = typeof YAW_CENTER_CONTEXT !== 'undefined' && YAW_CENTER_CONTEXT.presenceEntries
            ? YAW_CENTER_CONTEXT.presenceEntries(app)
            : [];
        if (!presence.length) return '';
        const { visible, overflow } = this.visibleCenterPresenceEntries(app, presence);
        const extra = overflow.length;
        const icons = visible.map(entry => {
            const unit = entry.unit || {};
            const tone = app._escapeHtml(entry.tone || entry.type || 'party');
            if (entry.type === 'items') {
                const label = app._escapeHtml(app._label('action.takeItems', 'Take Items'));
                const selected = app.focusedStageObject?.type === 'items';
                const selectedClass = selected ? ' selected selected-stage-focus' : '';
                const selectionAttrs = `data-selection-control="stage-focus" aria-pressed="${selected ? 'true' : 'false'}" data-selection-mode="stage-focus" data-selection-state="${selected ? 'focused' : 'available'}" data-command-slot="target"`;
                return `<button type="button" class="mobile-play-presence-dot item${selectedClass}" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-items" data-command-intent="takeItems" data-presence-type="items" data-presence-ref="tile-items" ${selectionAttrs} title="${label}" aria-label="${label}" onclick="event.stopPropagation();App.focusPresence('items','tile-items')">${app._escapeHtml(unit.icon || '🎒')}</button>`;
            }
            if (entry.type === 'place') {
                const rawRef = unit.id || 'tile-place';
                const ref = app._escapeHtml(rawRef);
                const intent = unit.intent ? ` data-command-intent="${app._escapeHtml(unit.intent)}"` : '';
                const label = app._escapeHtml(app._label('ui.presence.focusPlace', 'Focus {name} location actions', { name: unit.name || app._label('ui.tileInfo.landmark', 'Landmark') }));
                const jsRef = app._escapeJsString(rawRef);
                const selected = app.focusedStageObject?.type === 'place' && app.focusedStageObject.id === rawRef;
                const selectedClass = selected ? ' selected selected-stage-focus' : '';
                const selectionAttrs = `data-selection-control="stage-focus" aria-pressed="${selected ? 'true' : 'false'}" data-selection-mode="stage-focus" data-selection-state="${selected ? 'focused' : 'available'}" data-command-slot="target"`;
                return `<button type="button" class="mobile-play-presence-dot place${selectedClass}" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-place"${intent} data-presence-type="place" data-presence-ref="${ref}" ${selectionAttrs} title="${label}" aria-label="${label}" onclick="event.stopPropagation();App.focusPresence('place','${jsRef}')">${app._escapeHtml(unit.icon || '◆')}</button>`;
            }
            const presenceType = entry.type === 'creature' ? 'creature' : 'party';
            const ref = presenceType === 'creature'
                ? app._explorationTargetUnitId('creature', unit)
                : app._unitSelectionId(unit);
            const actorSelected = presenceType === 'party'
                && Boolean(app.explorationActorSelectionExplicit)
                && app._getExplorationActors().includes(unit);
            const targetSelected = presenceType === 'creature' && app._isExplorationTargetUnit('creature', unit);
            const selected = actorSelected || targetSelected;
            const selectedClass = selected ? ` selected selected-${presenceType === 'creature' ? 'target' : 'actor'}` : '';
            const selectionAttrs = presenceType === 'creature'
                ? app._selectionControlAttrs('target', targetSelected)
                : app._selectionControlAttrs('actor', actorSelected);
            const label = presenceType === 'creature'
                ? app._targetToggleLabel(unit, targetSelected)
                : app._actorToggleLabel(unit, actorSelected);
            const escapedLabel = app._escapeHtml(label);
            const escapedRef = app._escapeHtml(ref);
            const jsType = app._escapeJsString(presenceType);
            const jsRef = app._escapeJsString(ref);
            const control = presenceType === 'creature' ? 'focus-target' : 'focus-actor';
            return `<button type="button" class="mobile-play-presence-dot ${tone}${selectedClass}" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="${control}" data-presence-type="${presenceType}" data-presence-ref="${escapedRef}" ${selectionAttrs} title="${escapedLabel}" aria-label="${escapedLabel}" onclick="event.stopPropagation();App.focusPresence('${jsType}','${jsRef}')">${app._escapeHtml(unit.icon || '👤')}</button>`;
        }).join('');
        const moreLabel = app._escapeHtml(typeof YAW_CENTER_CONTEXT !== 'undefined' && YAW_CENTER_CONTEXT.overflowCommandLabel
            ? YAW_CENTER_CONTEXT.overflowCommandLabel(app, overflow)
            : app._label('ui.presence.openDetails', 'Open {count} more in details', { count: extra }));
        const commandAttrs = typeof YAW_CENTER_CONTEXT !== 'undefined' && YAW_CENTER_CONTEXT.overflowCommandAttrs
            ? YAW_CENTER_CONTEXT.overflowCommandAttrs(app, overflow)
            : 'data-command-control="open-details"';
        const commandRoute = typeof YAW_CENTER_CONTEXT !== 'undefined' && YAW_CENTER_CONTEXT.overflowCommandRoute
            ? app._escapeJsString(YAW_CENTER_CONTEXT.overflowCommandRoute(overflow))
            : 'details';
        const more = extra > 0
            ? `<button type="button" class="mobile-play-presence-more" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" ${commandAttrs} title="${moreLabel}" aria-label="${moreLabel}" onclick="event.stopPropagation();App.focusPresenceOverflow('${commandRoute}')">${app._escapeHtml(`+${extra}`)}</button>`
            : '';
        return `<span class="mobile-play-presence">${icons}${more}</span>`;
    },

    cellHtml(app, { classes, visual, title, dx, dy, key, moveable }) {
        const escapedTitle = app._escapeHtml(title);
        const movementAttrs = moveable
            ? `data-command-surface="stage-traversal" data-command-mode="exploration" data-command-control="move" data-command-direction="${key}" onclick="App.move(${dx},${dy})" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.move(${dx},${dy})}"`
            : 'tabindex="-1"';
        const presence = key === 'center' ? this.centerPresenceHtml(app) : '';
        const stageSurface = key === 'center' ? 'current-tile' : 'traversal-cell';
        return `<div class="${classes}" data-stage-surface="${stageSurface}" data-stage-layer="tile" data-stage-cell="${key}" data-mobile-play-cell="${key}" data-direction="${key}" ${app._mapTileAttrs(visual)} title="${escapedTitle}" aria-label="${escapedTitle}" ${movementAttrs}><span class="mobile-play-tile-icon" aria-hidden="true">${app._escapeHtml(visual.icon)}</span>${presence}</div>`;
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
            const traversal = isCenter ? null : app._traversalDecision(cell.dx, cell.dy);
            const moveable = Boolean(room) && Boolean(traversal?.allowed);
            const visual = app._interiorTileVisual(room);
            let classes = 'map-tile mobile-play-cell';
            if (isCenter) classes += ' center';
            else if (room?.explored) classes += ` explored${moveable ? ' moveable' : ' blocked'}`;
            else if (room) classes += moveable ? ' moveable' : ' blocked';
            else classes += ' far';
            if (visual.classes) classes += ` ${visual.classes}`;
            let title = isCenter
                ? `${visual.label} (${tx}, ${ty})`
                : `${app._directionLabel(cell.dx, cell.dy)}: ${visual.label} (${tx}, ${ty})`;
            if (!isCenter && traversal && !traversal.allowed) title += ` — ${app._traversalMessage(traversal)}`;
            html += this.cellHtml(app, { classes, visual, title, dx: cell.dx, dy: cell.dy, key: cell.key, moveable });
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
            const traversal = isCenter ? null : app._traversalDecision(cell.dx, cell.dy);
            const isExplored = app.isExplored(tx, ty);
            const isVisible = Math.abs(cell.dx) <= visibilityRadius && Math.abs(cell.dy) <= visibilityRadius;
            const moveable = Boolean(traversal?.allowed) && isVisible;
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
            else if (isExplored) classes += ` explored${moveable ? ' moveable' : ' blocked'}`;
            else classes += moveable ? ' moveable' : ' blocked';
            if (visual.classes) classes += ` ${visual.classes}`;
            if (hasCreatures) classes += ' has-enemy';
            let title = tile
                ? (isCenter ? `${visual.label} (${tx}, ${ty})` : `${app._directionLabel(cell.dx, cell.dy)}: ${visual.label} (${tx}, ${ty})`)
                : `${tx}, ${ty}`;
            if (!isCenter && traversal && !traversal.allowed) title += ` — ${app._traversalMessage(traversal)}`;
            html += this.cellHtml(app, { classes, visual, title, dx: cell.dx, dy: cell.dy, key: cell.key, moveable });
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
