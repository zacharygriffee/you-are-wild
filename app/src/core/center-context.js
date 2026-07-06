/**
 * YOU ARE WILD CENTER CONTEXT HELPERS
 * Current tile context and center action helpers.
 */

const YAW_CENTER_CONTEXT = {
    presenceEntries(app) {
        if (app.combatState?.active) return [];
        const entries = [];
        const seen = new Set();
        const seenUnits = new Set();
        const isLiving = unit => {
            if (!unit) return false;
            if (typeof app._isCorpse === 'function' && app._isCorpse(unit)) return false;
            if (typeof app._isLivingCreature === 'function') return app._isLivingCreature(unit);
            return (unit.CPun ?? 1) > 0;
        };
        const keyFor = (unit, type) => {
            if (type === 'items') return `items:${unit?.id || 'tile-items'}`;
            if (type === 'place') return `place:${unit?.id || 'tile-place'}`;
            if (type === 'creature' && typeof app._explorationTargetUnitId === 'function') {
                return `creature:${app._explorationTargetUnitId('creature', unit)}`;
            }
            if (typeof app._unitSelectionId === 'function') {
                return `${type}:${app._unitSelectionId(unit)}`;
            }
            return `${type}:${unit?.id || unit?.name || entries.length}`;
        };
        const add = (unit, type, meta, tone = type) => {
            if (!unit || !isLiving(unit)) return;
            if (seenUnits.has(unit)) return;
            const key = keyFor(unit, type);
            if (seen.has(key)) return;
            seenUnits.add(unit);
            seen.add(key);
            entries.push({ unit, type, meta, tone });
        };
        const addItemEntry = tile => {
            const items = Array.isArray(tile?.items) ? tile.items : [];
            if (!items.length) return;
            const first = app._tileItemLabel(items[0]);
            const name = items.length === 1
                ? first
                : app._label('ui.tileItems.count', '{count} items', { count: items.length });
            const key = 'items:tile-items';
            if (seen.has(key)) return;
            seen.add(key);
            entries.push({
                unit: { id: 'tile-items', name, icon: app._actionIcon('takeItems') || '🎒' },
                type: 'items',
                meta: app._label('action.takeItems', 'Take Items'),
                tone: 'item'
            });
        };
        const addPlaceEntries = tile => {
            if (!tile) return;
            const addPlace = ({ id, name, icon, meta, tone = 'place', intent = '' }) => {
                if (!name) return;
                const key = `place:${id}`;
                if (seen.has(key)) return;
                seen.add(key);
                entries.push({
                    unit: { id, name, icon: icon || '◆', intent },
                    type: 'place',
                    meta,
                    tone
                });
            };
            if (tile.structure) {
                const structure = app.STRUCTURES?.[tile.structure] || {};
                addPlace({
                    id: `structure:${tile.structure}`,
                    name: structure.name || tile.structure,
                    icon: structure.icon || '🚪',
                    meta: app._label('action.enter', 'Enter'),
                    tone: 'structure',
                    intent: 'enter'
                });
            }
            if (tile.hasLandmark && tile.landmarkName) {
                addPlace({
                    id: `landmark:${tile.landmarkName}`,
                    name: tile.landmarkName,
                    icon: '◆',
                    meta: app._label('ui.tileInfo.landmark', 'Landmark'),
                    tone: 'landmark'
                });
            }
        };
        if (app.player) add(app.player, 'player', app._label('party.you', 'You'), 'party');
        (app.party || []).forEach(unit => {
            const role = typeof app._getPartyRole === 'function' ? app._getPartyRole(unit) : 'companion';
            const roleLabel = typeof app._partyRoleLabel === 'function' ? app._partyRoleLabel(role) : role;
            add(unit, 'party', roleLabel, 'party');
        });
        const tile = app._currentExplorationTile?.();
        addPlaceEntries(tile);
        addItemEntry(tile);
        (app.creatures || []).forEach(unit => {
            const meta = typeof app._unitDispositionLabel === 'function' ? app._unitDispositionLabel(unit) : '';
            const tone = unit.disposition || 'creature';
            add(unit, 'creature', meta || app._label('ui.creatures', 'Creatures'), tone);
        });
        return entries;
    },

    presenceChip(app, entry) {
        const unit = entry.unit || {};
        const name = app._escapeHtml(unit.name || app._label('ui.unknown', 'Unknown'));
        const icon = app._escapeHtml(unit.icon || '👤');
        const meta = entry.meta ? `<span class="center-presence-meta">${app._escapeHtml(entry.meta)}</span>` : '';
        if (entry.type === 'items') {
            const focusTitle = app._escapeHtml(app._label('action.takeItems', 'Take Items'));
            return `<button type="button" class="center-presence-chip items item" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-items" data-command-intent="takeItems" data-presence-type="items" data-presence-ref="tile-items" title="${focusTitle}" aria-label="${focusTitle}" onclick="event.stopPropagation();App.focusPresence('items','tile-items')"><span class="center-presence-icon" aria-hidden="true">${icon}</span><span class="center-presence-text"><strong>${name}</strong>${meta}</span></button>`;
        }
        if (entry.type === 'place') {
            const ref = app._escapeHtml(unit.id || 'tile-place');
            const intent = unit.intent ? ` data-command-intent="${app._escapeHtml(unit.intent)}"` : '';
            const jsRef = app._escapeJsString(unit.id || 'tile-place');
            const focusTitle = app._escapeHtml(app._label('ui.presence.focusPlace', 'Focus {name} location actions', { name: unit.name || app._label('ui.tileInfo.landmark', 'Landmark') }));
            const escapedTone = app._escapeHtml(entry.tone || 'place');
            return `<button type="button" class="center-presence-chip place ${escapedTone}" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-place"${intent} data-presence-type="place" data-presence-ref="${ref}" title="${focusTitle}" aria-label="${focusTitle}" onclick="event.stopPropagation();App.focusPresence('place','${jsRef}')"><span class="center-presence-icon" aria-hidden="true">${icon}</span><span class="center-presence-text"><strong>${name}</strong>${meta}</span></button>`;
        }
        const presenceType = entry.type === 'creature' ? 'creature' : 'party';
        const ref = presenceType === 'creature'
            ? app._explorationTargetUnitId('creature', unit)
            : app._unitSelectionId(unit);
        const actorSelected = presenceType === 'party' && app._getExplorationActors().includes(unit);
        const targetSelected = presenceType === 'creature' && app._isExplorationTargetUnit('creature', unit);
        const selected = actorSelected || targetSelected;
        const selectedClass = selected ? ` selected selected-${presenceType === 'creature' ? 'target' : 'actor'}` : '';
        const selectionAttrs = presenceType === 'creature'
            ? app._selectionControlAttrs('target', targetSelected)
            : app._selectionControlAttrs('actor', actorSelected);
        const focusTitle = app._escapeHtml(presenceType === 'creature'
            ? app._targetToggleLabel(unit, targetSelected)
            : app._actorToggleLabel(unit, actorSelected));
        const escapedType = app._escapeHtml(entry.type);
        const escapedTone = app._escapeHtml(entry.tone);
        const escapedRef = app._escapeHtml(ref);
        const jsType = app._escapeJsString(presenceType);
        const jsRef = app._escapeJsString(ref);
        const control = presenceType === 'creature' ? 'focus-target' : 'focus-actor';
        return `<button type="button" class="center-presence-chip ${escapedType} ${escapedTone}${selectedClass}" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="${control}" data-presence-type="${escapedType}" data-presence-ref="${escapedRef}" ${selectionAttrs} title="${focusTitle}" aria-label="${focusTitle}" onclick="event.stopPropagation();App.focusPresence('${jsType}','${jsRef}')"><span class="center-presence-icon" aria-hidden="true">${icon}</span><span class="center-presence-text"><strong>${name}</strong>${meta}</span></button>`;
    },

    focusPresence(app, type, ref) {
        if (!ref || app.combatState?.active) return false;
        if (type === 'items') {
            if (ref !== 'tile-items' || !app._canTakeTileItems?.()) return false;
            const tile = app._currentExplorationTile?.();
            const items = Array.isArray(tile?.items) ? tile.items : [];
            const first = items[0] ? app._tileItemLabel(items[0]) : app._label('action.takeItems', 'Take Items');
            app.focusedStageObject = {
                type: 'items',
                id: 'tile-items',
                name: items.length === 1 ? first : app._label('ui.tileItems.count', '{count} items', { count: items.length }),
                intent: 'takeItems'
            };
            app.renderExplorationActions?.();
            if (typeof document !== 'undefined') {
                const button = document.querySelector('#mobile-explore-actions [data-command-intent="takeItems"], #desktop-context-belt [data-command-intent="takeItems"]');
                if (button && typeof button.focus === 'function') button.focus({ preventScroll: true });
            }
            return true;
        }
        if (type === 'place') {
            const tile = app._currentExplorationTile?.();
            let name = '';
            let intent = 'choose';
            if (String(ref || '').startsWith('structure:')) {
                const structureId = String(ref).slice('structure:'.length);
                const structure = app.STRUCTURES?.[structureId] || {};
                if (!tile?.structure || tile.structure !== structureId) return false;
                name = structure.name || structureId;
                intent = 'enter';
            } else if (String(ref || '').startsWith('landmark:')) {
                const landmarkName = String(ref).slice('landmark:'.length);
                if (!tile?.hasLandmark || tile.landmarkName !== landmarkName) return false;
                name = landmarkName;
            }
            app.focusedStageObject = { type: 'place', id: String(ref), name, intent };
            app.renderExplorationActions?.();
            if (typeof document !== 'undefined') {
                const focusIntent = String(ref || '').startsWith('structure:') ? 'enter' : '';
                const selector = focusIntent
                    ? `#mobile-explore-actions [data-command-intent="${focusIntent}"], #desktop-context-belt [data-command-intent="${focusIntent}"]`
                    : '#mobile-explore-actions .action-btn, #desktop-context-belt .action-btn, #mobile-control-belt, #desktop-context-belt';
                const target = document.querySelector(selector);
                if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
            }
            return true;
        }
        if (type === 'party') {
            const index = (app.party || []).findIndex(unit => app._unitSelectionId(unit) === String(ref) || unit?.id === ref || unit?.name === ref);
            if (index < 0) return false;
            app.selectExplorationActor(index);
            return true;
        }
        if (type === 'creature') {
            const index = (app.creatures || []).findIndex(unit => app._explorationTargetUnitId('creature', unit) === String(ref) || app._unitKey(unit) === String(ref) || unit?.id === ref || unit?.name === ref);
            if (index < 0) return false;
            app.toggleExplorationTarget('creature', app._explorationTargetUnitId('creature', app.creatures[index]));
            return true;
        }
        return false;
    },

    focusPresenceOverflow(app) {
        if (app.combatState?.active) return false;
        const entries = this.presenceEntries(app);
        const hasCreature = entries.some(entry => entry.type === 'creature');
        if (hasCreature) {
            app.renderCreatures();
            app.openPanel('enemies');
            return true;
        }
        const hasParty = entries.some(entry => entry.type === 'player' || entry.type === 'party');
        if (hasParty) {
            app.renderParty();
            app.openPanel('party');
            return true;
        }
        return false;
    },

    renderPresence(app) {
        const centerSlot = document.getElementById('center-presence');
        if (centerSlot) centerSlot.innerHTML = '';
        const rail = document.getElementById('desktop-presence-rail');
        if (!rail) return '';
        rail.innerHTML = '';
        const entries = this.presenceEntries(app);
        if (!entries.length) return '';
        const visible = entries.slice(0, 6);
        const extra = entries.length - visible.length;
        const chips = visible.map(entry => this.presenceChip(app, entry)).join('');
        const moreText = app._escapeHtml(app._label('ui.presence.more', '+{count} more', { count: extra }));
        const moreLabel = app._escapeHtml(app._label('ui.presence.openDetails', 'Open {count} more in details', { count: extra }));
        const more = extra > 0
            ? `<button type="button" class="center-presence-more" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" data-command-control="open-details" title="${moreLabel}" aria-label="${moreLabel}" onclick="event.stopPropagation();App.focusPresenceOverflow()">${moreText}</button>`
            : '';
        const label = app._escapeHtml(app._label('ui.presence.stage', 'Stage presence'));
        rail.innerHTML = `<div class="center-presence center-presence-rail" role="group" aria-label="${label}"><div class="center-presence-list">${chips}${more}</div></div>`;
        return rail.innerHTML;
    },

    clearPresence() {
        ['center-presence', 'desktop-presence-rail'].forEach(id => {
            const slot = document.getElementById(id);
            if (slot) slot.innerHTML = '';
        });
    },

    actionKeys(app) {
        const keys = [];
        if (app._canTakeTileItems()) keys.unshift('takeItems');
        if (app._canSearchHere()) keys.unshift('search');
        if (app._canSetSafeAnchor()) keys.push('setSafePlace');
        if (app.inInterior) keys.unshift('exit');
        else if (app._currentExplorationTile()?.structure) keys.unshift('enter');
        if (app._canRestHere()) keys.unshift('rest');
        return keys;
    },

    actionButton(app, key) {
        const handlers = {
            rest: 'App.rest()',
            search: 'App.search()',
            takeItems: 'App.takeTileItems()',
            setSafePlace: 'App.setSafeAnchorFromCurrentLocation()',
            enter: 'App.enterStructure()',
            exit: 'App.exitStructure()'
        };
        const intent = app._escapeHtml(key);
        return app._iconActionButton(key, app._actionIcon(key), handlers[key] || '', '', `data-command-surface="location-actions" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-intent="${intent}"`);
    },

    renderActions(app) {
        const keys = this.actionKeys(app);
        return keys.map(key => this.actionButton(app, key)).join('');
    },

    renderCenterActions(app) {
        if (app.combatState?.active) return;
        const hasMarkedTargets = (app._getExplorationTargets?.() || []).length > 0;
        const html = hasMarkedTargets
            ? app._renderExplorationTargetActions('desktop')
            : this.renderActions(app);
        const actions = document.getElementById('scene-actions');
        if (actions) {
            actions.innerHTML = '';
            actions.style.display = 'none';
        }
        const commandSurface = html ? (hasMarkedTargets ? 'target-intents' : 'location-actions') : '';
        const desktopBelt = document.getElementById('desktop-context-belt');
        if (desktopBelt) {
            desktopBelt.innerHTML = html;
            if (commandSurface) {
                desktopBelt.setAttribute('data-command-surface', commandSurface);
                desktopBelt.setAttribute('data-command-mode', 'exploration');
                desktopBelt.setAttribute('data-command-grammar', 'actor-target-intent');
            } else {
                desktopBelt.removeAttribute('data-command-surface');
                desktopBelt.removeAttribute('data-command-mode');
                desktopBelt.removeAttribute('data-command-grammar');
            }
        }
        const mobileExplore = document.getElementById('mobile-explore-actions');
        if (mobileExplore) {
            mobileExplore.innerHTML = html;
            if (commandSurface) {
                mobileExplore.setAttribute('data-command-surface', commandSurface);
                mobileExplore.setAttribute('data-command-mode', 'exploration');
                mobileExplore.setAttribute('data-command-grammar', 'actor-target-intent');
            } else {
                mobileExplore.removeAttribute('data-command-surface');
                mobileExplore.removeAttribute('data-command-mode');
                mobileExplore.removeAttribute('data-command-grammar');
            }
        }
        app.renderMobileExplorationControls?.();
    },

    showExplorationActions(app) {
        const context = this.context(app);
        app.updateScene(context.title, context.description, false);
        this.renderPresence(app);
        const titleEl = document.getElementById('scene-title');
        const descEl = document.getElementById('scene-description');
        if (titleEl && !titleEl.textContent) titleEl.textContent = context.title || '';
        if (descEl && !descEl.textContent && !descEl.innerHTML) descEl.textContent = context.description || '';
        this.renderCenterActions(app);
    },

    context(app) {
        if (app.inInterior && app.activeInterior) {
            const room = app._currentInteriorTile();
            const biome = app.biomes[room?.biome] || app.biomes.indoors || {};
            const title = room?.exit
                ? app._label('structure.exit', 'Exit')
                : (app.activeInterior.structureName || app._label('ui.largeMap.interior', 'Interior'));
            const details = [room?.description ||
                `${biome.icon || ''} ${app._label('ui.largeMap.interior', 'Interior')} (${app.interiorLocation.x}, ${app.interiorLocation.y})`];
            const itemSummary = app._tileItemSummary(room);
            if (itemSummary) details.push(itemSummary);
            const description = details.join(' ');
            return { title, description };
        }
        const tile = app._currentExplorationTile() || app.getTile(app.location.x, app.location.y);
        const biome = app.biomes[tile?.displayBiome || tile?.biome] || app.biomes[tile?.biome] || app.biomes.forest || {};
        const structure = tile?.structure ? app.STRUCTURES[tile.structure] : null;
        const title = structure
            ? `${structure.name} - ${biome.name || tile.biome}`
            : `${biome.name || tile?.biome || app._label('ui.exploration', 'Exploration')} - ${tile?.hasLandmark && tile.landmarkName ? tile.landmarkName : app._label('ui.scene.wildernessTitle', 'The Wilderness')}`;
        const details = [];
        if (tile?.description) details.push(tile.description);
        if (structure) details.push(`${structure.icon || '🚪'} ${structure.name}`);
        if (tile?.hasLandmark && tile.landmarkName) details.push(tile.landmarkName);
        const itemSummary = app._tileItemSummary(tile);
        if (itemSummary) details.push(itemSummary);
        const description = details.length
            ? details.join(' ')
            : `${biome.icon || ''} ${app._label('ui.chooseAction', 'Choose your next action.')}`;
        return { title, description };
    }
};

window.YAW_CENTER_CONTEXT = YAW_CENTER_CONTEXT;
