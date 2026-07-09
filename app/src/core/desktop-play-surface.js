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
            KeyQ: [-1, -1],
            KeyE: [1, -1],
            KeyZ: [-1, 1],
            KeyC: [1, 1],
            Numpad8: [0, -1],
            Numpad2: [0, 1],
            Numpad4: [-1, 0],
            Numpad6: [1, 0],
            Numpad7: [-1, -1],
            Numpad9: [1, -1],
            Numpad1: [-1, 1],
            Numpad3: [1, 1],
            Home: [-1, -1],
            PageUp: [1, -1],
            End: [-1, 1],
            PageDown: [1, 1],
            w: [0, -1],
            s: [0, 1],
            a: [-1, 0],
            d: [1, 0],
            q: [-1, -1],
            e: [1, -1],
            z: [-1, 1],
            c: [1, 1]
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
        surface.setAttribute?.('data-surface-mode', inCombat ? 'combat' : 'exploration');
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
        if (!el) return;
        el.className = `desktop-play-cell center ${visual?.classes || ''}`;
        if (typeof el.setAttribute === 'function') {
            el.setAttribute('title', app._escapeHtml(label));
            el.setAttribute('aria-label', app._escapeHtml(label));
            el.setAttribute('data-tileset-key', visual?.tilesetKey || 'unknown');
            el.setAttribute('data-base-tileset-key', visual?.baseTilesetKey || visual?.tilesetKey || 'unknown');
            el.setAttribute('data-map-kind', visual?.kind || 'current');
            el.setAttribute('data-stage-surface', 'current-tile');
            el.setAttribute('data-stage-layer', 'tile');
            el.setAttribute('data-stage-cell', 'center');
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
            el.setAttribute('tabindex', moveable ? '0' : '-1');
            el.setAttribute('data-tileset-key', visual?.tilesetKey || 'unknown');
            el.setAttribute('data-base-tileset-key', visual?.baseTilesetKey || visual?.tilesetKey || 'unknown');
            el.setAttribute('data-map-kind', visual?.kind || 'unknown');
            el.setAttribute('data-stage-surface', 'traversal-cell');
            el.setAttribute('data-stage-layer', 'tile');
            el.setAttribute('data-stage-cell', `${dx},${dy}`);
            el.setAttribute('data-stage-direction', `${dx},${dy}`);
            if (visual?.routeShape) el.setAttribute('data-route-shape', visual.routeShape);
            else if (typeof el.removeAttribute === 'function') el.removeAttribute('data-route-shape');
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
            stage: 'combat',
            suppressTargetControl: cardType === 'party'
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
            const visual = app._interiorTileVisual(room);
            const direction = this.directionLabel(app, cell.dx, cell.dy);
            const label = `${direction}: ${visual.label} (${tx}, ${ty})`;
            this.updateCell(app, el, visual, label, cell.dx, cell.dy, Boolean(room) && !inCombat);
        });
        const currentRoom = app.activeInterior.tiles[`${cx},${cy}`];
        const currentVisual = app._interiorTileVisual(currentRoom);
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
            const visual = app._mapTileVisual(tile, {
                neighborResolver: (nx, ny) => app.getTile(nx, ny)
            });
            const direction = this.directionLabel(app, cell.dx, cell.dy);
            const label = `${direction}: ${visual.label} (${tx}, ${ty})`;
            this.updateCell(app, el, visual, label, cell.dx, cell.dy, !inCombat);
        });
        const currentTile = app.getTile(cx, cy);
        const currentVisual = app._mapTileVisual(currentTile, {
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
