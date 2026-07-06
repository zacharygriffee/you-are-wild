const YAW_MOBILE_UNIT_STRIPS = {
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
        const visible = [...living, ...corpses];
        this.updateCreatureDockBadge(app, living);
        if (card) card.style.display = visible.length > 0 || app.combatState.active ? 'block' : 'none';
        strip.innerHTML = visible.length > 0
            ? visible.map(unit => app.renderMobileUnitChip(unit, app.creatures.indexOf(unit), 'creature')).join('')
            : `<div style="color:var(--text-muted);font-size:12px;padding:6px;">${app._escapeHtml(app._label('ui.noCreaturesHere', 'No creatures here'))}</div>`;
        this.explorationControls(app);
    },

    explorationControls(app) {
        const movePad = document.getElementById('mobile-move-pad');
        const moveToggle = document.getElementById('mobile-move-toggle');
        const actorToggle = document.getElementById('mobile-actor-toggle');
        const targetTray = document.getElementById('mobile-target-action-tray');
        const actorBelt = document.getElementById('mobile-actor-belt');
        const controlBelt = document.getElementById('mobile-control-belt');
        const surface = document.getElementById('mobile-play-surface');
        const exploreActions = document.getElementById('mobile-explore-actions');
        const creatureCue = document.getElementById('mobile-creature-presence-cue');
        const selectionSentence = document.getElementById('mobile-selection-sentence');
        const inCombat = Boolean(app.combatState?.active);
        const hasTargets = !inCombat && (app._getExplorationTargets?.() || []).length > 0;
        if (inCombat || !hasTargets) app.mobileActorBeltOpen = false;
        const actorSelectionOpen = !inCombat && Boolean(app.mobileActorBeltOpen || app.explorationActorSelectionExplicit);
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
            const showActorToggle = hasTargets || actorSelectionOpen;
            actorToggle.hidden = !showActorToggle;
            actorToggle.style.display = showActorToggle ? '' : 'none';
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
        this.creaturePresenceCue(app);
        if (controlBelt) {
            const hasSelectionSentence = Boolean((selectionSentence?.innerHTML || '').trim());
            const hasTargetActions = Boolean((targetTray?.innerHTML || '').trim());
            const hasActorControls = Boolean((actorBelt?.innerHTML || '').trim());
            const hasLocationActions = !hasTargets && Boolean((exploreActions?.innerHTML || '').trim());
            const hasCreatureCue = !hasTargets && Boolean((creatureCue?.innerHTML || '').trim());
            const hasMovePad = Boolean(movePad?.classList?.contains('expanded'));
            const hasContent = !inCombat && Boolean(
                hasSelectionSentence
                || hasLocationActions
                || hasTargetActions
                || hasActorControls
                || hasCreatureCue
                || hasMovePad
            );
            const expandedControls = hasContent && Boolean(
                hasTargetActions
                || hasActorControls
                || actorSelectionOpen
                || hasMovePad
            );
            controlBelt.classList.toggle('has-controls', hasContent);
            controlBelt.classList.toggle('target-controls-open', hasTargets);
            controlBelt.classList.toggle('expanded-controls-open', expandedControls);
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
        } else {
            surface?.classList?.remove('has-control-belt');
            surface?.classList?.remove('control-belt-expanded');
        }
    },

    actorControls(app) {
        const actors = app._getExplorationActors?.() || [];
        const chips = (app.party || []).map((unit, index) => {
            if (!unit || !app._isLivingCreature(unit)) return '';
            const selected = actors.includes(unit);
            const unitName = unit === app.player ? app._label('party.you', 'You') : (unit.name || app._label('ui.unknown', 'Unknown'));
            const role = unit === app.player ? app._label('party.you', 'You') : app._partyRoleLabel(app._getPartyRole(unit));
            const title = app._escapeHtml(app._actorToggleLabel(unit, selected));
            const label = app._escapeHtml(unitName);
            const meta = app._escapeHtml(role || '');
            const icon = app._escapeHtml(unit.icon || '👤');
            const selectedClass = selected ? ' selected selected-actor' : '';
            const pressed = app._selectionControlAttrs('actor', selected);
            return `<button type="button" class="mobile-actor-chip${selectedClass}" data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-actor" title="${title}" aria-label="${title}" ${pressed} onclick="event.stopPropagation();App.selectExplorationActor(${index})"><span class="mobile-actor-chip-icon" aria-hidden="true">${icon}</span><span class="mobile-actor-chip-text"><strong>${label}</strong>${meta ? `<span>${meta}</span>` : ''}</span></button>`;
        }).join('');
        const clearLabel = app._escapeHtml(app._label('target.clearActors', 'Clear actors'));
        const clearTitle = app._escapeHtml(app._label('target.clearActorsTitle', 'Clear selected actors'));
        const clear = `<button type="button" class="mobile-actor-chip mobile-actor-clear" data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="clear-actors" title="${clearTitle}" aria-label="${clearTitle}" onclick="event.stopPropagation();App.clearExplorationActors()"><span class="mobile-actor-chip-icon" aria-hidden="true">×</span><span class="mobile-actor-chip-text"><strong>${clearLabel}</strong></span></button>`;
        return `${chips}${clear}`;
    },

    livingCreatures(app) {
        return (app.creatures || []).filter(unit => unit && (unit.CPun ?? 1) > 0 && !app._isCorpse(unit));
    },

    updateCreatureDockBadge(app, living = this.livingCreatures(app)) {
        const badge = document.getElementById('mobile-creature-dock-badge');
        const button = document.getElementById('mobile-creatures-dock-btn');
        const count = living.length;
        const baseLabel = app.combatState?.active
            ? app._label('ui.enemies', 'Enemies')
            : app._label('ui.creatures', 'Creatures');
        const title = count > 0
            ? app._label('ui.creatureDock.count', '{label}: {count} here', { label: baseLabel, count })
            : baseLabel;
        if (button) {
            button.setAttribute('title', title);
            button.setAttribute('aria-label', title);
        }
        if (!badge) return;
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = count <= 0;
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
        const targetCountAttr = ` data-command-target-count="${app._escapeHtml(String(living.length))}"`;
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
        app.renderCreatures();
        app.openPanel('enemies');
        if (typeof document !== 'undefined') {
            const target = document.querySelector('#mobile-creature-strip [data-command-control="focus-target"], #enemies-content [data-command-control="focus-target"]');
            if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
        }
        return true;
    }
};
