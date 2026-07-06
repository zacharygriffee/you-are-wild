/**
 * YOU ARE WILD PANEL RENDERING
 * Party and creature panel refresh plus bounded panel-detail presentation.
 */

const YAW_PANEL_RENDERING = {
    clearLegacyCenterActions() {
        const actions = document.getElementById('scene-actions');
        if (!actions) return;
        actions.innerHTML = '';
        actions.style.display = 'none';
        if (actions.dataset?.richHidden) delete actions.dataset.richHidden;
    },

    partyUtilities(app) {
        if (app.combatState?.active || !(app.quests || []).length) return '';
        const label = app._escapeHtml(app._label('quest.title', 'Quests'));
        const title = app._escapeHtml(app._label('quest.openLog', 'Open quest log'));
        return `<div class="panel-interaction-tray party-panel-utilities" data-surface-role="drawer-utility" role="toolbar" aria-label="${label}"><div class="target-action-row" data-command-surface="detail-management" data-command-mode="exploration"><button class="action-btn" data-command-control="open-quest-log" title="${title}" aria-label="${title}" onclick="App.showQuestLog()">📜 ${label}</button></div></div>`;
    },

    party(app) {
        app._syncPlayerPartyReference();
        const container = document.getElementById('party-content');
        if (container) {
            const tray = app._renderPanelInteractionTray();
            const utilities = this.partyUtilities(app);
            container.innerHTML = `${utilities}${tray}${app.party.map((unit, i) => app.renderUnitCard(unit, i, 'party')).join('')}`;
        }
        app.renderMobilePartyStrip();
    },

    showPartyDetail(app, title, html) {
        const label = app._escapeHtml(title || app._label('ui.party', 'Party'));
        const detail = `<div class="party-panel-detail" data-surface-role="actor-detail" role="region" aria-label="${label}">${html || ''}</div>`;
        const container = document.getElementById('party-content');
        const mobileStrip = document.getElementById('mobile-party-strip');
        if (container) container.innerHTML = detail;
        if (mobileStrip) mobileStrip.innerHTML = detail;
        const panel = document.getElementById('panel-party');
        const isMobile = typeof window !== 'undefined' && Number(window.innerWidth || 0) > 0 && window.innerWidth <= 1024;
        if (isMobile && panel) {
            document.querySelectorAll('.panel-map, .panel-party, .panel-enemies').forEach(panelEl => panelEl.classList.remove('active'));
            panel.classList.add('active');
            app.syncPanelBackdrop();
        } else if (panel) {
            panel.classList.add('nav-focus');
            if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
            try { panel.focus({ preventScroll: true }); } catch (e) { panel.focus(); }
        }
        this.clearLegacyCenterActions();
        app._restoreCenterContextIfPanelDetailLeaked();
    },

    centerHasPanelDetailLeak() {
        const desc = document.getElementById('scene-description');
        const html = desc?.innerHTML || '';
        return html.includes('party-stats-view') ||
            html.includes('character-stats-view') ||
            html.includes('inventory-panel-detail');
    },

    restoreCenterContextIfPanelDetailLeaked(app) {
        if (app.combatState?.active || !app._centerHasPanelDetailLeak()) return false;
        const context = app._centerTileContext();
        app.updateScene(context.title, context.description, false);
        return true;
    },

    closeDetails(app, panel = 'party') {
        this.clearLegacyCenterActions();
        if (panel === 'party') app.renderParty();
        if (panel === 'creature') app.renderCreatures();
        if (app.combatState?.active) {
            const actor = app._currentCombatActor?.() || app.activeActor;
            if (actor === app.player || app.party.includes(actor)) {
                app.activeActor = actor;
                app.renderDesktopCombatComposer?.(actor);
                app.renderMobileCombatToolbelt?.();
                app.renderSelectionSentence?.();
            }
        }
    },

    creatures(app) {
        const container = document.getElementById('enemies-content');
        const title = document.getElementById('enemies-title');
        const mobileTitle = document.getElementById('mobile-creature-title');
        let titleText = app._label('ui.area', 'Area');
        const living = app.creatures.filter(c => !app._isCorpse(c));
        const corpses = app.creatures.filter(c => app._isCorpse(c));
        if (title) {
            const enemies = living.filter(c => c.disposition === app.DISPOSITION.ENEMY);
            const friendlies = living.filter(c => c.disposition !== app.DISPOSITION.ENEMY);
            if (enemies.length > 0) titleText = app._label('ui.enemies', 'Enemies');
            else if (friendlies.length > 0) titleText = app._label('ui.creatures', 'Creatures');
            else if (corpses.length > 0) titleText = app._label('disposition.remains', 'Remains');
            title.textContent = titleText;
        }
        if (mobileTitle) mobileTitle.textContent = titleText;
        if (container) {
            let html = living.map(unit => app.renderUnitCard(unit, app.creatures.indexOf(unit), 'creature')).join('');
            if (corpses.length > 0) {
                html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);"><div style="color:var(--text-muted);font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">${app._escapeHtml(app._label('disposition.remains', 'Remains'))}</div>`;
                html += corpses.map(unit => app.renderUnitCard(unit, app.creatures.indexOf(unit), 'creature')).join('');
                html += '</div>';
            }
            container.innerHTML = html || `<p style="color: var(--text-muted); text-align: center;">${app._escapeHtml(app._label('ui.noCreaturesPresent', 'No creatures present'))}</p>`;
        }
        app.renderMobileCreatureStrip();
    },

    showCreatureDetail(app, title, html) {
        const label = app._escapeHtml(title || app._label('ui.creatures', 'Creatures'));
        const detail = `<div class="party-panel-detail creature-panel-detail" data-surface-role="target-detail" role="region" aria-label="${label}">${html || ''}</div>`;
        const container = document.getElementById('enemies-content');
        const mobileStrip = document.getElementById('mobile-creature-strip');
        const mobileCard = document.getElementById('mobile-creature-card');
        if (container) container.innerHTML = detail;
        if (mobileStrip) mobileStrip.innerHTML = detail;
        if (mobileCard) mobileCard.style.display = 'block';
        const panel = document.getElementById('panel-enemies');
        const isMobile = typeof window !== 'undefined' && Number(window.innerWidth || 0) > 0 && window.innerWidth <= 1024;
        if (isMobile && panel) {
            document.querySelectorAll('.panel-map, .panel-party, .panel-enemies').forEach(panelEl => panelEl.classList.remove('active'));
            panel.classList.add('active');
            app.syncPanelBackdrop();
        } else if (panel) {
            panel.classList.add('nav-focus');
            if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
            try { panel.focus({ preventScroll: true }); } catch (e) { panel.focus(); }
        }
        this.clearLegacyCenterActions();
    },

    toggleUnit(app, index, type) {
        const list = type === 'party' ? app.party : app.creatures;
        if (list[index]) { list[index].expanded = !list[index].expanded; }
        if (type === 'party') app.renderParty(); else app.renderCreatures();
    },

    expandAll(app, type) {
        const list = type === 'party' ? app.party : app.creatures;
        const allExpanded = list.every(u => u.expanded);
        list.forEach(u => u.expanded = !allExpanded);
        if (type === 'party') app.renderParty(); else app.renderCreatures();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_RENDERING = YAW_PANEL_RENDERING;
}
