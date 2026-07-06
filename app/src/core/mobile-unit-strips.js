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
        if (card) card.style.display = visible.length > 0 || app.combatState.active ? 'block' : 'none';
        strip.innerHTML = visible.length > 0
            ? visible.map(unit => app.renderMobileUnitChip(unit, app.creatures.indexOf(unit), 'creature')).join('')
            : `<div style="color:var(--text-muted);font-size:12px;padding:6px;">${app._escapeHtml(app._label('ui.noCreaturesHere', 'No creatures here'))}</div>`;
        this.explorationControls(app);
    },

    explorationControls(app) {
        const movePad = document.getElementById('mobile-move-pad');
        const moveToggle = document.getElementById('mobile-move-toggle');
        const targetTray = document.getElementById('mobile-target-action-tray');
        const actorBelt = document.getElementById('mobile-actor-belt');
        const inCombat = Boolean(app.combatState?.active);
        const hasTargets = !inCombat && (app._getExplorationTargets?.() || []).length > 0;
        const actorSelectionOpen = !inCombat && Boolean(app.explorationActorSelectionExplicit);
        if ((inCombat || hasTargets || actorSelectionOpen) && app.mobileMovePadOpen) {
            app.mobileMovePadOpen = false;
        }
        if (movePad) {
            movePad.classList.toggle('expanded', Boolean(app.mobileMovePadOpen) && !inCombat);
            if (inCombat) movePad.classList.remove('expanded');
        }
        if (moveToggle) {
            moveToggle.style.display = inCombat ? 'none' : '';
            moveToggle.setAttribute('aria-expanded', String(Boolean(app.mobileMovePadOpen) && !inCombat));
        }
        if (targetTray) {
            targetTray.innerHTML = inCombat ? '' : app._renderExplorationTargetActions('mobile-target');
        }
        if (actorBelt) {
            actorBelt.innerHTML = hasTargets || actorSelectionOpen
                ? app.party.map((unit, i) => app.renderMobileUnitChip(unit, i, 'party')).join('')
                : '';
        }
    }
};
