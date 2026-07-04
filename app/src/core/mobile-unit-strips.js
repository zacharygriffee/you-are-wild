const YAW_MOBILE_UNIT_STRIPS = {
    party(app) {
        const strip = document.getElementById('mobile-party-strip');
        if (!strip) return;
        strip.innerHTML = `${app._renderPanelInteractionTray()}${app.party.map((unit, i) => app.renderMobileUnitChip(unit, i, 'party')).join('')}`;
    },

    creatures(app) {
        const strip = document.getElementById('mobile-creature-strip');
        const card = document.getElementById('mobile-creature-card');
        if (!strip) return;
        const living = app.creatures.filter(c => c.CPun > 0 && !app._isCorpse(c));
        const corpses = app.creatures.filter(c => app._isCorpse(c));
        const visible = [...living, ...corpses];
        if (card) card.style.display = visible.length > 0 || app.combatState.active ? 'block' : 'none';
        strip.innerHTML = visible.length > 0
            ? visible.map(unit => app.renderMobileUnitChip(unit, app.creatures.indexOf(unit), 'creature')).join('')
            : `<div style="color:var(--text-muted);font-size:12px;padding:6px;">${app._escapeHtml(app._label('ui.noCreaturesHere', 'No creatures here'))}</div>`;
    }
};
