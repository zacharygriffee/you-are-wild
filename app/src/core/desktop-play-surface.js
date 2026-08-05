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

    targetFacingEdge(dx, dy) {
        if (dx === 0 && dy === -1) return 'south';
        if (dx === 1 && dy === 0) return 'west';
        if (dx === 0 && dy === 1) return 'north';
        if (dx === -1 && dy === 0) return 'east';
        return '';
    },

    applyVisualMetadata(target, visual = {}) {
        if (!target || typeof target.setAttribute !== 'function') return;
        const setOrRemove = (name, value) => {
            if (value) target.setAttribute(name, value);
            else target.removeAttribute?.(name);
        };
        const composition = visual?.composition;
        const semanticKeys = composition?.compatibility?.semanticKeys || visual.semanticKeys || [];
        const compositionLayers = composition?.layers
            ? Object.entries(composition.layers).filter(([, layer]) => layer?.records?.length).map(([name]) => name)
            : [];
        setOrRemove('data-tileset-semantic-keys', Array.isArray(semanticKeys) ? semanticKeys.join(' ') : '');
        setOrRemove('data-tile-composition', composition?.schema || '');
        setOrRemove('data-tile-composition-version', composition?.version ? String(composition.version) : '');
        setOrRemove('data-tile-composition-space', composition?.space || '');
        setOrRemove('data-tile-composition-layers', compositionLayers.join(' '));
        setOrRemove('data-blocked-edges', Array.isArray(visual.blockedEdges) ? visual.blockedEdges.join(' ') : '');
        setOrRemove('data-blocked-reason', visual.blockedReason || '');
        setOrRemove('data-interior-shape', visual.interiorShape || '');
        setOrRemove('data-interior-connections', Array.isArray(visual.interiorConnections) ? visual.interiorConnections.join(' ') : '');
        setOrRemove('data-interior-adjacent', Array.isArray(visual.interiorAdjacent) ? visual.interiorAdjacent.join(' ') : '');
        setOrRemove('data-interior-theme', visual.interiorTheme || '');
        setOrRemove('data-interior-structure', visual.interiorStructure || '');
        setOrRemove('data-interior-exit-direction', visual.exitDirection || '');
        setOrRemove('data-shoreline-edges', Array.isArray(visual.shorelineEdges) ? visual.shorelineEdges.join(' ') : '');
        setOrRemove('data-shoreline-corners', Array.isArray(visual.shorelineCorners) ? visual.shorelineCorners.join(' ') : '');
        setOrRemove('data-shoreline-mask', Number.isInteger(visual.shorelineMask) && visual.shorelineMask > 0 ? visual.shorelineMask : '');
        setOrRemove('data-elevation-kind', visual.elevationKind || '');
        setOrRemove('data-elevation-band', visual.elevationBand || '');
        setOrRemove('data-elevation-uphill', visual.primaryUphill || '');
        setOrRemove('data-elevation-downhill', visual.primaryDownhill || '');
        setOrRemove('data-cliff-edges', Array.isArray(visual.cliffEdges) ? visual.cliffEdges.join(' ') : '');
        setOrRemove('data-bridge-span-index', Number.isInteger(visual.bridgeSpanIndex) ? String(visual.bridgeSpanIndex) : '');
        setOrRemove('data-bridge-span-length', Number.isInteger(visual.bridgeSpanLength) ? String(visual.bridgeSpanLength) : '');
        setOrRemove('data-bridge-span-role', visual.bridgeSpanRole || '');
        setOrRemove('data-bridge-shore-edges', Array.isArray(visual.bridgeShoreEdges) ? visual.bridgeShoreEdges.join(' ') : '');
        setOrRemove('data-danger-influence', visual.dangerInfluence ? 'true' : '');
        setOrRemove('data-immediate-danger', visual.immediateDanger ? 'true' : '');
    },

    cellHtml(app, visual, label, danger = null) {
        const escapedLabel = app._escapeHtml(label);
        const tileArt = app._mapTileArtHtml(visual);
        const dangerBadge = danger
            ? `<span class="desktop-play-danger-band ${app._escapeHtml(danger.id)}">${app._escapeHtml(danger.label)}</span>`
            : '';
        return `${tileArt}<span class="desktop-play-cell-icon" aria-hidden="true">${app._escapeHtml(visual.icon)}</span>${dangerBadge}<span class="desktop-play-cell-label">${escapedLabel}</span>`;
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

    keyDirection(event = {}) {
        const key = String(event.key || '');
        const code = String(event.code || '');
        const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
        const candidates = [code, normalizedKey].filter(Boolean);
        const directions = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            KeyW: [0, -1],
            KeyS: [0, 1],
            KeyA: [-1, 0],
            KeyD: [1, 0],
            Numpad8: [0, -1],
            Numpad2: [0, 1],
            Numpad4: [-1, 0],
            Numpad6: [1, 0],
            w: [0, -1],
            s: [0, 1],
            a: [-1, 0],
            d: [1, 0]
        };
        for (const candidate of candidates) {
            if (directions[candidate]) return directions[candidate];
        }
        return null;
    },

    isEditableEventTarget(target) {
        const tag = String(target?.tagName || target?.nodeName || '').toLowerCase();
        return Boolean(target?.isContentEditable) || ['input', 'textarea', 'select'].includes(tag);
    },

    hasBlockingOverlay(app) {
        const menu = document.getElementById('app-menu');
        if (menu?.classList?.contains('open')) return true;
        if (document.querySelector?.('#app-confirm-dialog, #save-recovery-dialog, #mobile-context-menu, #desktop-intent-menu')) return true;
        const tutorial = document.getElementById('tutorial-overlay');
        if (tutorial && tutorial.style?.display && tutorial.style.display !== 'none') return true;
        if (['settings', 'mods', 'market', 'save-manager'].includes(app.screen)) return true;
        return false;
    },

    isCombatActive(app) {
        return Boolean(app.combatState?.active);
    },

    syncSurfaceMode(app) {
        const surface = document.getElementById('desktop-play-surface');
        if (!surface) return;
        const inCombat = this.isCombatActive(app);
        surface.classList?.toggle('combat-active', inCombat);
        surface.setAttribute?.('data-surface-mode', inCombat ? 'combat' : (app.inInterior ? 'interior' : 'exploration'));
    },

    clearCellCommand(el) {
        if (!el) return;
        [
            'role',
            'data-command-surface',
            'data-command-mode',
            'data-command-control',
            'data-command-direction',
            'onclick',
            'onkeydown'
        ].forEach(attr => el.removeAttribute?.(attr));
        el.setAttribute?.('tabindex', '-1');
        el.onclick = null;
    },

    handleTraversalKey(app, event = {}) {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return false;
        if (this.isEditableEventTarget(event.target || document.activeElement)) return false;
        if (app.screen !== 'game' || !app.player || this.isCombatActive(app)) return false;
        if (this.hasBlockingOverlay(app)) return false;
        const direction = this.keyDirection(event);
        if (!direction) return false;
        event.preventDefault?.();
        app.move(direction[0], direction[1]);
        return true;
    },

    updateCenter(app, visual, label) {
        const el = document.getElementById('desktop-play-cell-center');
        const mapCell = document.getElementById('desktop-map-cell-center');
        const escapedLabel = app._escapeHtml(label);
        const applyMetadata = target => {
            if (!target || typeof target.setAttribute !== 'function') return;
            target.setAttribute('title', escapedLabel);
            target.setAttribute('aria-label', escapedLabel);
            target.setAttribute('data-tileset-key', visual?.tilesetKey || 'unknown');
            target.setAttribute('data-base-tileset-key', visual?.baseTilesetKey || visual?.tilesetKey || 'unknown');
            target.setAttribute('data-map-kind', visual?.kind || 'current');
            target.setAttribute('data-stage-surface', 'current-tile');
            target.setAttribute('data-stage-layer', 'tile');
            target.setAttribute('data-stage-cell', 'center');
            if (visual?.routeShape) target.setAttribute('data-route-shape', visual.routeShape);
            else if (typeof target.removeAttribute === 'function') target.removeAttribute('data-route-shape');
            this.applyVisualMetadata(target, visual);
        };
        if (el) {
            el.className = `desktop-play-cell center desktop-location-focus ${visual?.classes || ''}`;
            applyMetadata(el);
        }
        if (mapCell) {
            mapCell.className = `desktop-play-cell center desktop-map-current-cell ${visual?.classes || ''}`;
            mapCell.innerHTML = this.cellHtml(app, visual, label);
            mapCell.setAttribute?.('aria-current', 'location');
            applyMetadata(mapCell);
        }
    },

    updateCell(app, el, visual, label, dx, dy, moveable = true, danger = null) {
        if (!el) return;
        const classes = `desktop-play-cell${moveable ? ' moveable' : ''} ${visual.classes || ''}`;
        const escapedLabel = app._escapeHtml(label);
        el.className = classes;
        el.innerHTML = this.cellHtml(app, visual, label, danger);
        if (typeof el.setAttribute === 'function') {
            el.setAttribute('title', escapedLabel);
            el.setAttribute('aria-label', escapedLabel);
            el.setAttribute('tabindex', moveable ? '0' : '-1');
            el.setAttribute('data-tileset-key', visual?.tilesetKey || 'unknown');
            el.setAttribute('data-base-tileset-key', visual?.baseTilesetKey || visual?.tilesetKey || 'unknown');
            el.setAttribute('data-map-kind', visual?.kind || 'unknown');
            el.setAttribute('data-stage-surface', 'traversal-cell');
            el.setAttribute('data-stage-layer', 'tile');
            el.setAttribute('data-stage-cell', `${dx},${dy}`);
            el.setAttribute('data-stage-direction', `${dx},${dy}`);
            if (danger?.id) el.setAttribute('data-danger-band', danger.id);
            else el.removeAttribute?.('data-danger-band');
            el.removeAttribute?.('aria-hidden');
            if (visual?.routeShape) el.setAttribute('data-route-shape', visual.routeShape);
            else if (typeof el.removeAttribute === 'function') el.removeAttribute('data-route-shape');
            this.applyVisualMetadata(el, visual);
            if (moveable) {
                el.setAttribute('role', 'button');
                el.setAttribute('data-command-surface', 'stage-traversal');
                el.setAttribute('data-command-mode', 'exploration');
                el.setAttribute('data-command-control', 'move');
                el.setAttribute('data-command-direction', `${dx},${dy}`);
                el.setAttribute('onclick', `App.move(${dx},${dy})`);
                el.setAttribute('onkeydown', `if(event.key==='Enter'||event.key===' '){event.preventDefault();App.move(${dx},${dy})}`);
            } else if (typeof el.removeAttribute === 'function') {
                el.removeAttribute('role');
                el.removeAttribute('data-command-surface');
                el.removeAttribute('data-command-mode');
                el.removeAttribute('data-command-control');
                el.removeAttribute('data-command-direction');
                el.removeAttribute('onclick');
                el.removeAttribute('onkeydown');
            }
        }
        el.onclick = moveable ? () => app.move(dx, dy) : null;
    },

    combatantIds(app, unit) {
        if (!unit) return [];
        return [app._unitSelectionId?.(unit), unit.id, unit.name].map(id => String(id || '')).filter(Boolean);
    },

    combatantHtml(app, unit, type, actor = null) {
        if (!unit) return '';
        const ids = this.combatantIds(app, unit);
        const cardType = type === 'party' ? 'party' : 'creature';
        const source = cardType === 'party' ? app.party : app.creatures;
        const unitIndex = Math.max(0, (source || []).indexOf(unit));
        const html = app.renderTacticalCard(unit, unitIndex, cardType, {
            presentation: 'desktop',
            density: 'micro',
            stage: 'combat'
        });
        return html.replace(
            'data-card-density="micro"',
            `data-card-density="micro" data-unit-id="${app._escapeHtml(ids[0] || '')}"`
        );
    },

    combatLaneHtml(app, title, units, type, actor = null) {
        const empty = type === 'enemy'
            ? app._label('combat.exchange.noEnemies', 'No enemies in the line.')
            : app._label('combat.exchange.noParty', 'No party combatants in the line.');
        const items = units.length
            ? units.map(unit => this.combatantHtml(app, unit, type, actor)).join('')
            : `<div class="desktop-battle-empty">${app._escapeHtml(empty)}</div>`;
        return `<div class="desktop-battle-lane ${app._escapeHtml(type)}" data-stage-surface="battle-row" data-stage-layer="${app._escapeHtml(type)}"><div class="desktop-battle-lane-title">${app._escapeHtml(title)}</div><div class="desktop-battle-units">${items}</div></div>`;
    },

    updateCombatLane(app, id, title, units, type, actor) {
        const el = document.getElementById(id);
        if (!el) return;
        el.className = `desktop-play-cell desktop-battle-row ${type}`;
        el.innerHTML = this.combatLaneHtml(app, title, units, type, actor);
        el.setAttribute?.('data-stage-surface', 'battle-row');
        el.setAttribute?.('data-stage-layer', type);
        el.setAttribute?.('aria-label', title);
        this.clearCellCommand(el);
    },

    renderCombatStack(app, enemies, party, actor) {
        const desc = document.getElementById('scene-description');
        if (!desc) return;
        const html = `<div class="desktop-battle-stack" data-stage-surface="battle-stack" data-stage-layer="combatants">`
            + this.combatLaneHtml(app, app._label('ui.enemies', 'Enemies'), enemies, 'enemy', actor)
            + this.combatLaneHtml(app, app._label('ui.party', 'Party'), party, 'party', actor)
            + `</div>`;
        const summary = desc.querySelector?.('.combat-scene-summary');
        if (summary) {
            summary.querySelector?.('.desktop-battle-stack')?.remove();
            summary.insertAdjacentHTML?.('beforeend', html);
            return;
        }
        desc.insertAdjacentHTML?.('beforeend', html);
    },

    clearCombatStack() {
        const desc = document.getElementById('scene-description');
        document.querySelectorAll?.('#scene-description .desktop-battle-stack').forEach(el => el.remove());
        if (desc?.querySelector?.('.combat-scene-summary')) desc.innerHTML = '';
    },

    renderCombat(app) {
        if (typeof YAW_CENTER_CONTEXT !== 'undefined') YAW_CENTER_CONTEXT.clearPresence?.();
        const actor = app.activeActor || app._currentCombatActor?.() || app.player;
        const enemies = (app.creatures || []).filter(unit => unit && (
            unit.disposition === app.DISPOSITION.ENEMY ||
            unit.CPun <= 0 ||
            app._isCorpse?.(unit)
        ));
        const party = (app.party || []).filter(Boolean);
        const hiddenIds = ['desktop-play-cell-nw', 'desktop-play-cell-n', 'desktop-play-cell-ne', 'desktop-play-cell-w', 'desktop-play-cell-e', 'desktop-play-cell-sw', 'desktop-play-cell-s', 'desktop-play-cell-se'];
        hiddenIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.className = 'desktop-play-cell combat-stage-hidden';
            el.innerHTML = '';
            el.setAttribute?.('aria-hidden', 'true');
            el.setAttribute?.('data-stage-surface', 'battle-hidden');
            this.clearCellCommand(el);
        });
        this.updateCenter(app, { classes: 'desktop-battle-center', tilesetKey: 'combat', baseTilesetKey: 'combat', kind: 'combat' }, app._label('combat.exchange.summary', 'Combat summary'));
        const center = document.getElementById('desktop-play-cell-center');
        if (center) {
            center.setAttribute('data-stage-surface', 'battle-context');
            center.setAttribute('data-stage-layer', 'turn-context');
        }
        this.renderCombatStack(app, enemies, party, actor);
    },

    renderInterior(app) {
        const cx = app.interiorLocation.x;
        const cy = app.interiorLocation.y;
        const inCombat = this.isCombatActive(app);
        this.cells.forEach(cell => {
            const el = document.getElementById(cell.id);
            if (!el) return;
            const tx = cx + cell.dx;
            const ty = cy + cell.dy;
            const room = app.activeInterior.tiles[`${tx},${ty}`];
            const direction = this.directionLabel(app, cell.dx, cell.dy);
            const traversal = app._traversalDecision(cell.dx, cell.dy);
            const blockedEdge = !traversal.allowed ? this.targetFacingEdge(cell.dx, cell.dy) : '';
            const visual = app._interiorTileVisual(room, {
                x: tx,
                y: ty,
                interiorKind: app.activeInterior.kind,
                interiorStructure: app.activeInterior.structure,
                blockedEdges: blockedEdge ? [blockedEdge] : [],
                roomResolver: (x, y) => app.activeInterior.tiles[`${x},${y}`] || null
            });
            const moveable = Boolean(room) && traversal.allowed && !inCombat;
            const blocked = traversal.allowed ? '' : ` — ${app._traversalMessage(traversal)}`;
            const label = `${direction}: ${visual.label} (${tx}, ${ty})${blocked}`;
            this.updateCell(app, el, visual, label, cell.dx, cell.dy, moveable);
        });
        const currentRoom = app.activeInterior.tiles[`${cx},${cy}`];
        const currentVisual = app._interiorTileVisual(currentRoom, {
            x: cx,
            y: cy,
            isCurrent: true,
            interiorKind: app.activeInterior.kind,
            interiorStructure: app.activeInterior.structure,
            roomResolver: (x, y) => app.activeInterior.tiles[`${x},${y}`] || null
        });
        this.updateCenter(app, currentVisual, `${currentVisual.label} (${cx}, ${cy})`);
    },

    renderExploration(app) {
        const cx = app.location.x;
        const cy = app.location.y;
        const inCombat = this.isCombatActive(app);
        this.cells.forEach(cell => {
            const el = document.getElementById(cell.id);
            if (!el) return;
            const tx = cx + cell.dx;
            const ty = cy + cell.dy;
            const tile = app.getTile(tx, ty);
            const traversal = app._traversalDecision(cell.dx, cell.dy);
            const visual = app._mapTileVisual(tile, {
                blockedEdges: !traversal.allowed && this.targetFacingEdge(cell.dx, cell.dy)
                    ? [this.targetFacingEdge(cell.dx, cell.dy)]
                    : [],
                blockedReason: !traversal.allowed ? traversal.reasonCode : '',
                neighborResolver: (nx, ny) => app.getTile(nx, ny)
            });
            const direction = this.directionLabel(app, cell.dx, cell.dy);
            const moveable = traversal.allowed && !inCombat;
            const blocked = traversal.allowed ? '' : ` — ${app._traversalMessage(traversal)}`;
            const danger = app._tileDangerBand(tile);
            const label = `${direction}: ${visual.label} · ${danger.label} (${tx}, ${ty})${blocked}`;
            this.updateCell(app, el, visual, label, cell.dx, cell.dy, moveable, danger);
        });
        const currentTile = app.getTile(cx, cy);
        const currentVisual = app._mapTileVisual(currentTile, {
            isCurrent: true,
            neighborResolver: (nx, ny) => app.getTile(nx, ny)
        });
        this.updateCenter(app, currentVisual, `${currentVisual.label} (${cx}, ${cy})`);
    },

    render(app) {
        this.syncSurfaceMode(app);
        if (this.isCombatActive(app)) {
            this.renderCombat(app);
            return;
        }
        this.clearCombatStack();
        if (app.inInterior && app.activeInterior) {
            this.renderInterior(app);
            return;
        }
        this.renderExploration(app);
    }
};

window.YAW_DESKTOP_PLAY_SURFACE = YAW_DESKTOP_PLAY_SURFACE;
