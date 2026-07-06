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
        if (app.player) add(app.player, 'player', app._label('party.you', 'You'), 'party');
        (app.party || []).forEach(unit => {
            const role = typeof app._getPartyRole === 'function' ? app._getPartyRole(unit) : 'companion';
            const roleLabel = typeof app._partyRoleLabel === 'function' ? app._partyRoleLabel(role) : role;
            add(unit, 'party', roleLabel, 'party');
        });
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
        const presenceType = entry.type === 'creature' ? 'creature' : 'party';
        const ref = presenceType === 'creature'
            ? app._explorationTargetUnitId('creature', unit)
            : app._unitSelectionId(unit);
        const focusTitle = app._escapeHtml(presenceType === 'creature'
            ? app._label('ui.presence.selectTarget', 'Select {name} as target', { name: unit.name || app._label('ui.unknown', 'Unknown') })
            : app._label('ui.presence.selectActor', 'Select {name} as actor', { name: unit.name || app._label('ui.unknown', 'Unknown') }));
        const escapedType = app._escapeHtml(entry.type);
        const escapedTone = app._escapeHtml(entry.tone);
        const escapedRef = app._escapeHtml(ref);
        const jsType = app._escapeJsString(presenceType);
        const jsRef = app._escapeJsString(ref);
        return `<button type="button" class="center-presence-chip ${escapedType} ${escapedTone}" data-presence-type="${escapedType}" data-presence-ref="${escapedRef}" title="${focusTitle}" aria-label="${focusTitle}" onclick="event.stopPropagation();App.focusPresence('${jsType}','${jsRef}')"><span class="center-presence-icon" aria-hidden="true">${icon}</span><span class="center-presence-text"><strong>${name}</strong>${meta}</span></button>`;
    },

    focusPresence(app, type, ref) {
        if (!ref || app.combatState?.active) return false;
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
        const moreLabel = app._escapeHtml(app._label('ui.presence.more', '+{count} more', { count: extra }));
        const more = extra > 0
            ? `<button type="button" class="center-presence-more" title="${moreLabel}" aria-label="${moreLabel}" onclick="event.stopPropagation();App.focusPresenceOverflow()">${moreLabel}</button>`
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
        return app._iconActionButton(key, app._actionIcon(key), handlers[key] || '');
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
        const desktopBelt = document.getElementById('desktop-context-belt');
        if (desktopBelt) desktopBelt.innerHTML = html;
        const mobileExplore = document.getElementById('mobile-explore-actions');
        if (mobileExplore) mobileExplore.innerHTML = html;
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
