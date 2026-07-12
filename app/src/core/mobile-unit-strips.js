const YAW_MOBILE_UNIT_STRIPS = {
    hasInteractiveMarkup(slot) {
        return /<(button|a|input|select|textarea)\b/i.test(slot?.innerHTML || '');
    },

    party(app) {
        const strip = document.getElementById('mobile-party-strip');
        if (!strip) return;
        strip.innerHTML = app.party.map((unit, i) => app.renderMobileUnitChip(unit, i, 'party')).join('');
        this.explorationControls(app);
    },

    creatures(app) {
        const strip = document.getElementById('mobile-creature-strip');
        const card = document.getElementById('mobile-creature-card');
        const title = document.getElementById('mobile-creature-title');
        if (!strip) return;
        if (title) title.textContent = app.combatState?.active
            ? app._label('ui.enemies', 'Enemies')
            : app._label('ui.creatures', 'Creatures');
        const living = app.creatures.filter(c => c.CPun > 0 && !app._isCorpse(c));
        const corpses = app.creatures.filter(c => app._isCorpse(c));
        const itemChip = this.tileItemChip(app);
        const visible = [...living, ...corpses];
        this.updateCreatureDockBadge(app, living);
        if (card) card.style.display = (app.combatState.active || ((visible.length > 0 || itemChip) && app.mobileCreatureRailOpen !== false)) ? 'block' : 'none';
        strip.innerHTML = visible.length > 0 || itemChip
            ? `${visible.map(unit => app.renderMobileUnitChip(unit, app.creatures.indexOf(unit), 'creature')).join('')}${itemChip}`
            : `<div style="color:var(--text-muted);font-size:12px;padding:6px;">${app._escapeHtml(app._label('ui.noCreaturesHere', 'No creatures here'))}</div>`;
        this.explorationControls(app);
    },

    explorationControls(app) {
        const movePad = document.getElementById('mobile-move-pad');
        const moveToggle = document.getElementById('mobile-move-toggle');
        const actorToggle = document.getElementById('mobile-actor-toggle');
        const targetTray = document.getElementById('mobile-target-action-tray');
        const actorBelt = document.getElementById('mobile-actor-belt');
        const targetPickerBelt = document.getElementById('mobile-target-picker-belt');
        const controlBelt = document.getElementById('mobile-control-belt');
        const controlRow = document.getElementById('mobile-control-row');
        const surface = document.getElementById('mobile-play-surface');
        const exploreActions = document.getElementById('mobile-explore-actions');
        const creatureCue = document.getElementById('mobile-creature-presence-cue');
        const selectionSentence = document.getElementById('mobile-selection-sentence');
        const inCombat = Boolean(app.combatState?.active);
        surface?.classList?.toggle('combat-active', inCombat);
        document.documentElement?.classList?.toggle('mobile-combat-active', inCombat);
        const hasTargets = !inCombat && (app._getExplorationTargets?.() || []).length > 0;
        if (inCombat) {
            app.mobileActorBeltOpen = false;
            app.mobileTargetPickerOpen = false;
        }
        const actorSelectionOpen = !inCombat && Boolean(app.mobileActorBeltOpen);
        const targetPickerOpen = !inCombat && Boolean(app.mobileTargetPickerOpen);
        if ((inCombat || hasTargets || actorSelectionOpen) && app.mobileMovePadOpen) {
            app.mobileMovePadOpen = false;
        }
        if (movePad) {
            movePad.classList.toggle('expanded', Boolean(app.mobileMovePadOpen) && !inCombat);
            if (inCombat) movePad.classList.remove('expanded');
        }
        if (moveToggle) {
            moveToggle.hidden = true;
            moveToggle.style.display = 'none';
            moveToggle.setAttribute('aria-expanded', String(Boolean(app.mobileMovePadOpen) && !inCombat));
        }
        if (actorToggle) {
            actorToggle.hidden = true;
            actorToggle.style.display = 'none';
            actorToggle.classList.toggle('selected', actorSelectionOpen);
            actorToggle.setAttribute('aria-expanded', String(actorSelectionOpen));
        }
        if (targetTray) {
            targetTray.innerHTML = inCombat ? '' : app._renderExplorationTargetActions('mobile-target');
            if ((targetTray.innerHTML || '').trim()) {
                targetTray.setAttribute('data-command-surface', 'target-intents');
                targetTray.setAttribute('data-command-mode', 'exploration');
                targetTray.setAttribute('data-command-grammar', 'actor-target-intent');
            } else {
                targetTray.removeAttribute('data-command-surface');
                targetTray.removeAttribute('data-command-mode');
                targetTray.removeAttribute('data-command-grammar');
            }
        }
        if (actorBelt) {
            actorBelt.innerHTML = actorSelectionOpen
                ? this.actorControls(app)
                : '';
            if (actorSelectionOpen) {
                actorBelt.setAttribute('data-command-surface', 'actor-target-routing');
                actorBelt.setAttribute('data-command-mode', 'exploration');
                actorBelt.setAttribute('data-command-grammar', 'actor-target-intent');
            } else {
                actorBelt.removeAttribute('data-command-surface');
                actorBelt.removeAttribute('data-command-mode');
                actorBelt.removeAttribute('data-command-grammar');
            }
        }
        if (targetPickerBelt) {
            targetPickerBelt.innerHTML = targetPickerOpen
                ? this.targetControls(app)
                : '';
            if (targetPickerOpen) {
                targetPickerBelt.setAttribute('data-command-surface', 'target-routing');
                targetPickerBelt.setAttribute('data-command-mode', 'exploration');
                targetPickerBelt.setAttribute('data-command-grammar', 'actor-target-intent');
            } else {
                targetPickerBelt.removeAttribute('data-command-surface');
                targetPickerBelt.removeAttribute('data-command-mode');
                targetPickerBelt.removeAttribute('data-command-grammar');
            }
        }
        this.creaturePresenceCue(app);
        const hasCreatureCue = !hasTargets && this.hasInteractiveMarkup(creatureCue);
        creatureCue?.classList?.toggle('has-visible-cue', hasCreatureCue);
        if (controlBelt) {
            const hasSelectionSentence = Boolean((selectionSentence?.innerHTML || '').trim());
            const hasTargetActions = this.hasInteractiveMarkup(targetTray);
            const hasActorControls = this.hasInteractiveMarkup(actorBelt);
            const hasTargetPicker = this.hasInteractiveMarkup(targetPickerBelt);
            const hasLocationActions = !hasTargets && this.hasInteractiveMarkup(exploreActions);
            const hasMovePad = Boolean(movePad?.classList?.contains('expanded'));
            const hasControlRow = Boolean(
                (!moveToggle?.hidden && moveToggle?.style?.display !== 'none')
                || (!actorToggle?.hidden && actorToggle?.style?.display !== 'none')
                || hasTargetActions
            );
            const hasContent = !inCombat && Boolean(
                hasSelectionSentence
                || hasLocationActions
                || hasTargetActions
                || hasActorControls
                || hasTargetPicker
                || hasMovePad
            );
            controlBelt.hidden = !hasContent;
            controlBelt.setAttribute('aria-hidden', hasContent ? 'false' : 'true');
            const expandedControls = hasContent && Boolean(
                hasTargetActions
                || hasActorControls
                || hasTargetPicker
                || actorSelectionOpen
                || targetPickerOpen
                || hasMovePad
            );
            controlBelt.classList.toggle('has-controls', hasContent);
            controlBelt.classList.toggle('target-controls-open', hasTargets);
            controlBelt.classList.toggle('actor-controls-open', actorSelectionOpen);
            controlBelt.classList.toggle('target-picker-open', targetPickerOpen);
            controlBelt.classList.toggle('expanded-controls-open', expandedControls);
            controlRow?.classList?.toggle('has-visible-controls', hasControlRow);
            if (hasContent) {
                controlBelt.setAttribute('data-command-surface', 'command-composer');
                controlBelt.setAttribute('data-command-mode', 'exploration');
                controlBelt.setAttribute('data-command-grammar', 'actor-target-intent');
            } else {
                controlBelt.removeAttribute('data-command-surface');
                controlBelt.removeAttribute('data-command-mode');
                controlBelt.removeAttribute('data-command-grammar');
            }
            surface?.classList?.toggle('has-control-belt', hasContent);
            surface?.classList?.toggle('control-belt-expanded', expandedControls);
            surface?.classList?.toggle('target-controls-open', hasTargets);
            surface?.classList?.toggle('actor-controls-open', actorSelectionOpen);
            surface?.classList?.toggle('target-picker-open', targetPickerOpen);
        } else {
            surface?.classList?.remove('has-control-belt');
            surface?.classList?.remove('control-belt-expanded', 'target-controls-open', 'actor-controls-open', 'target-picker-open');
            controlRow?.classList?.remove('has-visible-controls');
        }
        if (actorSelectionOpen && actorBelt && typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                controlBelt.scrollTop = controlBelt.scrollHeight;
                const selected = actorBelt.querySelector('.mobile-unit-chip.selected-actor, .mobile-unit-chip.selected-target, .mobile-actor-chip.selected-actor, .mobile-actor-chip.selected-target');
                if (selected && typeof selected.scrollIntoView === 'function') {
                    selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
            });
        }
        if (targetPickerOpen && targetPickerBelt && typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                const selected = targetPickerBelt.querySelector('.mobile-target-picker-chip.selected, .mobile-target-picker-chip.selected-target');
                if (selected && typeof selected.scrollIntoView === 'function') {
                    selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
            });
        }
    },

    actorControls(app) {
        const chips = (app.party || []).map((unit, index) => {
            if (!unit || !app._isLivingCreature(unit)) return '';
            return app.renderTacticalCard(unit, index, 'party', { presentation: 'mobile', density: 'micro' });
        }).join('');
        const detailsLabel = app._escapeHtml(app._label('ui.details', 'Details'));
        const detailsTitle = app._escapeHtml(app._label('ui.openPartyDetails', 'Open party details'));
        const details = `<button type="button" class="mobile-actor-chip mobile-actor-details mobile-strip-details-btn" data-command-surface="drawer-shortcuts" data-command-mode="navigation" data-command-control="open-actor-drawer" data-drawer-role="actors" data-return-rail="actor" data-command-slot="details" title="${detailsTitle}" aria-label="${detailsTitle}" onclick="event.stopPropagation();App.openPanelFromRail('party','actor')"><span class="mobile-actor-chip-icon" aria-hidden="true">☰</span><span class="mobile-actor-chip-text"><strong>${detailsLabel}</strong></span></button>`;
        return `${details}${chips}`;
    },

    targetControls(app) {
        const targets = this.visibleTargets(app);
        const chips = targets.map((unit, index) => this.targetControlChip(app, unit, index)).join('');
        const items = this.targetItemControl(app);
        const detailsLabel = app._escapeHtml(app._label('ui.details', 'Details'));
        const detailsTitle = app._escapeHtml(app._label('ui.openCreatureDetails', 'Open creature details'));
        const details = `<button type="button" class="mobile-target-picker-chip mobile-actor-details mobile-strip-details-btn" data-command-surface="drawer-shortcuts" data-command-mode="navigation" data-command-control="open-target-drawer" data-drawer-role="targets" data-return-rail="target" data-command-slot="details" title="${detailsTitle}" aria-label="${detailsTitle}" onclick="event.stopPropagation();App.openPanelFromRail('enemies','target')"><span class="mobile-target-picker-icon" aria-hidden="true">☰</span><span class="mobile-target-picker-name">${detailsLabel}</span></button>`;
        const emptyLabel = app._escapeHtml(app._label('ui.noCreaturesHere', 'No creatures here'));
        const empty = `<div class="mobile-target-picker-chip" role="status" aria-label="${emptyLabel}"><span class="mobile-target-picker-icon" aria-hidden="true">∅</span><span class="mobile-target-picker-name">${emptyLabel}</span></div>`;
        return `${details}${chips || items ? `${chips}${items}` : empty}`;
    },

    targetControlChip(app, unit, index) {
        if (!unit) return '';
        const creatureIndex = Math.max(0, app.creatures.indexOf(unit));
        return app.renderTacticalCard(unit, creatureIndex, 'creature', {
            presentation: 'mobile',
            density: 'micro',
            extraClass: 'mobile-target-picker-chip',
            surfaceRoleAttrs: 'data-surface-role="target-picker-chip" data-drawer-role="targets"'
        });
    },

    targetItemControl(app) {
        if (!this.hasTileItems(app)) return '';
        const summary = this.tileItemSummary(app);
        if (!summary) return '';
        const selected = app.focusedStageObject?.type === 'items';
        const label = app._escapeHtml(summary.name);
        const icon = app._escapeHtml(app._actionIcon('takeItems') || '🎒');
        const title = app._escapeHtml(app._label('action.takeItems', 'Take Items'));
        return `<button type="button" class="mobile-target-picker-chip item-target${selected ? ' selected selected-stage-focus' : ''}" data-surface-role="target-picker-chip" data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-items" data-command-slot="target" title="${title}" aria-label="${title}" onclick="event.stopPropagation();App.focusPresence('items','tile-items')"><span class="mobile-target-picker-icon" aria-hidden="true">${icon}</span><span class="mobile-target-picker-name">${label}</span>${summary.count > 1 ? `<span class="mobile-target-picker-count" aria-hidden="true">+${app._escapeHtml(String(summary.count - 1))}</span>` : ''}</button>`;
    },

    livingCreatures(app) {
        return (app.creatures || []).filter(unit => unit && (unit.CPun ?? 1) > 0 && !app._isCorpse(unit));
    },

    visibleTargets(app) {
        return (app.creatures || []).filter(unit => unit && ((unit.CPun ?? 1) > 0 || app._isCorpse(unit)));
    },

    hasTileItems(app) {
        return !app.combatState?.active && Boolean(app._canTakeTileItems?.());
    },

    tileItemSummary(app) {
        const tile = app._currentExplorationTile?.();
        const items = Array.isArray(tile?.items) ? tile.items : [];
        if (!items.length) return null;
        const first = app._tileItemLabel(items[0]);
        return {
            name: items.length === 1
                ? first
                : app._label('ui.tileItems.count', '{count} items', { count: items.length }),
            count: items.length
        };
    },

    tileItemChip(app) {
        if (!this.hasTileItems(app)) return '';
        const summary = this.tileItemSummary(app);
        if (!summary) return '';
        const selected = app.focusedStageObject?.type === 'items';
        const selectedClass = selected ? ' selected selected-target selected-stage-focus' : '';
        const selectionAttrs = `data-selection-control="stage-focus" aria-pressed="${selected ? 'true' : 'false'}" data-selection-mode="stage-focus" data-selection-state="${selected ? 'focused' : 'available'}" data-command-slot="target"`;
        const label = app._escapeHtml(summary.name);
        const icon = app._escapeHtml(app._actionIcon('takeItems') || '🎒');
        const meta = app._escapeHtml(app._label('action.takeItems', 'Take Items'));
        const targetTitle = app._escapeHtml(app._label('action.takeItems', 'Take Items'));
        const statusLabel = app._escapeHtml(app._label('ui.presence.itemsHere', 'Items here'));
        const targetLabel = app._escapeHtml(app._targetMarkLabel());
        return `<div class="mobile-unit-chip item-target compact-tactical-card has-corner-controls${selectedClass}" data-card-role="compact-tactical" data-surface-role="target-presence-chip" data-drawer-role="targets" data-selection-state="${selected ? 'selected' : 'available'}" data-selection-roles="${selected ? 'target stage-focus' : 'none'}" data-command-intent="takeItems" role="group" aria-label="${label}" onclick="App.focusPresence('items','tile-items')" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();App.focusPresence('items','tile-items')}">
                    <div class="unit-actions tactical-card-selection-controls corner-card-controls" data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-action-scope="stage-focus" aria-label="${targetTitle}">
                        <button class="action-btn target-toggle corner-card-toggle target-corner-toggle${selected ? ' primary' : ''}" data-corner-slot="target" title="${targetTitle}" aria-label="${targetTitle}" data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-items" data-command-intent="takeItems" ${selectionAttrs} onclick="event.stopPropagation();App.focusPresence('items','tile-items')">${targetLabel}</button>
                    </div>
                    <div class="mobile-chip-name"><span>${icon}</span><span>${label}</span></div>
                    <div class="mobile-chip-meta">${statusLabel} · ${meta}</div>
                    ${selected ? `<div class="unit-selection-chips"><span class="unit-selection-chip target">${app._escapeHtml(app._label('target.targetRole', 'Target'))}</span></div>` : ''}
                </div>`;
    },

    updateCreatureDockBadge(app, living = this.livingCreatures(app)) {
        const badge = document.getElementById('mobile-creature-dock-badge');
        const button = document.getElementById('mobile-creatures-dock-btn');
        const count = living.length;
        const hostileCount = living.filter(unit => unit?.disposition === app.DISPOSITION?.ENEMY || String(unit?.disposition || '').toLowerCase().includes('hostile')).length;
        const danger = Boolean(app.combatState?.active || hostileCount > 0);
        const baseLabel = danger
            ? app._label('ui.enemies', 'Enemies')
            : app._label('ui.creatures', 'Creatures');
        const title = count > 0
            ? app._label('ui.creatureDock.count', '{label}: {count} here', { label: baseLabel, count })
            : baseLabel;
        if (button) {
            button.setAttribute('title', title);
            button.setAttribute('aria-label', title);
            button.classList.toggle('danger', danger && count > 0);
            const label = button.querySelector?.('.mobile-panel-dock-label');
            if (label) {
                label.textContent = baseLabel;
                label.setAttribute('data-i18n', danger ? 'ui.enemies' : 'ui.creatures');
            }
        }
        if (!badge) return;
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = count <= 0;
        badge.classList.toggle('danger', danger && count > 0);
    },

    creaturePresenceCue(app) {
        const cue = document.getElementById('mobile-creature-presence-cue');
        const living = this.livingCreatures(app);
        this.updateCreatureDockBadge(app, living);
        if (!cue) return;
        if (app.combatState?.active) {
            cue.innerHTML = '';
            return;
        }
        if (!living.length) {
            cue.innerHTML = '';
            return;
        }
        if (app.mobileCreatureRailOpen !== false || app.mobileTargetPickerOpen) {
            cue.innerHTML = '';
            return;
        }
        const first = living[0] || {};
        const icon = app._escapeHtml(first.icon || '👤');
        const selected = living.length === 1 && app._isExplorationTargetUnit('creature', first);
        const selectedClass = selected ? ' selected selected-target' : '';
        const selectionAttrs = living.length === 1
            ? app._selectionControlAttrs('target', selected)
            : '';
        const text = living.length === 1
            ? app._label('ui.creatureCue.single', 'Here: {name}', { name: first.name || app._label('ui.unknown', 'Unknown') })
            : app._label('ui.creatureCue.count', '{count} creatures here', { count: living.length });
        const actionLabel = living.length === 1
            ? app._targetToggleLabel(first, selected)
            : app._label('ui.creatureCue.openPanel', 'Open {count} creatures here', { count: living.length });
        const escapedText = app._escapeHtml(text);
        const escapedActionLabel = app._escapeHtml(actionLabel);
        const commandControl = living.length === 1 ? 'focus-target' : 'open-target-picker';
        const targetCountAttr = living.length === 1
            ? ` data-command-target-count="${app._escapeHtml(String(living.length))}"`
            : ` data-command-slot="target" data-command-target-count="${app._escapeHtml(String(living.length))}"`;
        cue.innerHTML = `<button type="button" class="mobile-creature-presence-btn${selectedClass}" data-stage-surface="presence" data-command-surface="stage-presence" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="${commandControl}"${targetCountAttr} ${selectionAttrs} onclick="App.focusMobileCreaturePresence()" aria-label="${escapedActionLabel}" title="${escapedActionLabel}"><span aria-hidden="true">${icon}</span><span class="mobile-creature-presence-text">${escapedText}</span></button>`;
    },

    focusCreaturePresence(app) {
        if (app.combatState?.active) return false;
        const living = this.livingCreatures(app);
        if (!living.length) return false;
        if (living.length === 1) {
            const ref = app._explorationTargetUnitId('creature', living[0]);
            return app.focusPresence('creature', ref);
        }
        return this.focusTargetPicker(app);
    },

    focusTargetPicker(app) {
        if (app.combatState?.active) return app.openPanel('enemies');
        const visible = this.visibleTargets(app);
        if (!visible.length && !this.hasTileItems(app)) return app.openPanel('enemies');
        app.mobileTargetPickerOpen = true;
        app.mobileActorBeltOpen = false;
        app.mobileMovePadOpen = false;
        app.renderMobileExplorationControls?.();
        if (typeof document !== 'undefined') {
            const target = document.querySelector('#mobile-target-picker-belt [data-command-control="focus-target"], #mobile-target-picker-belt [data-command-control="focus-items"]');
            if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
        }
        return true;
    },

    focusActorRail(app) {
        if (app.combatState?.active) return app.openPanel('party');
        app.mobileActorBeltOpen = true;
        app.mobileTargetPickerOpen = false;
        app.mobileMovePadOpen = false;
        app.renderParty();
        app.renderMobileExplorationControls?.();
        if (typeof document !== 'undefined') {
            const belt = document.getElementById('mobile-actor-belt');
            const actor = belt?.querySelector?.('[data-command-control="focus-actor"]');
            if (actor && typeof actor.focus === 'function') actor.focus({ preventScroll: true });
        }
        return true;
    },

    toggleTargetPicker(app) {
        if (app.combatState?.active) return app.openPanel('enemies');
        if (app.mobileTargetPickerOpen) {
            app.mobileTargetPickerOpen = false;
            app.renderMobileExplorationControls?.();
            return false;
        }
        return this.focusTargetPicker(app);
    },

    focusCreatureRail(app) {
        if (app.combatState?.active) return app.openPanel('enemies');
        const visible = this.visibleTargets(app);
        if (!visible.length && !this.hasTileItems(app)) return app.openPanel('enemies');
        app.mobileCreatureRailOpen = true;
        app.renderCreatures();
        if (typeof document !== 'undefined') {
            const card = document.getElementById('mobile-creature-card');
            if (card) card.style.display = 'block';
            if (card && typeof card.scrollIntoView === 'function') card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            const target = document.querySelector('#mobile-creature-strip [data-command-control="focus-target"], #mobile-creature-strip [data-command-control="focus-items"]');
            if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
        }
        return true;
    },

    toggleCreatureRail(app) {
        if (app.combatState?.active) return app.openPanel('enemies');
        const visible = this.visibleTargets(app);
        if (!visible.length && !this.hasTileItems(app)) return app.openPanel('enemies');
        if (app.mobileCreatureRailOpen !== false) {
            app.mobileCreatureRailOpen = false;
            const card = typeof document !== 'undefined' ? document.getElementById('mobile-creature-card') : null;
            if (card) card.style.display = 'none';
            return true;
        }
        return this.focusCreatureRail(app);
    }
};
