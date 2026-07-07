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
        actions.hidden = true;
        actions.setAttribute('aria-hidden', 'true');
        if (actions.dataset?.richHidden) delete actions.dataset.richHidden;
    },

    partyUtilities(app) {
        if (app.combatState?.active || !(app.quests || []).length) return '';
        const label = app._escapeHtml(app._label('quest.title', 'Quests'));
        const title = app._escapeHtml(app._label('quest.openLog', 'Open quest log'));
        return `<div class="panel-interaction-tray party-panel-utilities" data-surface-role="drawer-utility" role="toolbar" aria-label="${label}"><div class="target-action-row" data-command-surface="detail-management" data-command-mode="exploration"><button class="action-btn" data-command-surface="detail-management" data-command-mode="exploration" data-command-control="open-quest-log" title="${title}" aria-label="${title}" onclick="App.showQuestLog()">📜 ${label}</button></div></div>`;
    },

    listCard(app, unit, index, type) {
        if (unit?.expanded) return app.renderUnitCard(unit, index, type);
        return app.renderTacticalCard(unit, index, type, { presentation: 'desktop' });
    },

    party(app) {
        app._syncPlayerPartyReference();
        const container = document.getElementById('party-content');
        if (container) {
            const tray = app._renderPanelInteractionTray();
            const utilities = this.partyUtilities(app);
            container.innerHTML = `${utilities}${tray}${app.party.map((unit, i) => this.listCard(app, unit, i, 'party')).join('')}`;
        }
        this.syncDetailToggle(app, 'party');
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

    closeMobileDetailPanel(app, panel = 'party') {
        const isMobile = typeof window !== 'undefined' && Number(window.innerWidth || 0) > 0 && window.innerWidth <= 1024;
        if (!isMobile) return false;
        const panelId = panel === 'creature' ? 'panel-enemies' : 'panel-party';
        const activePanel = document.getElementById(panelId);
        if (!activePanel?.classList?.contains('active')) return false;
        activePanel.classList.remove('active');
        app.syncPanelBackdrop?.();
        if (typeof YAW_PANEL_SHELL !== 'undefined' && YAW_PANEL_SHELL.restoreMobileRailContext) {
            YAW_PANEL_SHELL.restoreMobileRailContext(app);
        } else {
            app._mobilePanelReturnRail = null;
        }
        return true;
    },

    closeDetails(app, panel = 'party') {
        this.clearLegacyCenterActions();
        if (panel === 'party') app.renderParty();
        if (panel === 'creature') app.renderCreatures();
        this.closeMobileDetailPanel(app, panel);
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
        const living = app.creatures.filter(c => !app._isCorpse(c));
        const corpses = app.creatures.filter(c => app._isCorpse(c));
        const hasTileItems = !app.combatState?.active && Boolean(app._canTakeTileItems?.());
        const hasTargetsHere = living.length > 0 || corpses.length > 0 || hasTileItems;
        let titleText = hasTargetsHere ? app._label('ui.here', 'Here') : app._label('ui.area', 'Area');
        document.querySelector('.stage')?.classList?.toggle('target-panel-empty', !app.combatState?.active && !hasTargetsHere);
        document.getElementById('panel-enemies')?.classList?.toggle('empty-target-panel', !hasTargetsHere);
        if (title) {
            const enemies = living.filter(c => c.disposition === app.DISPOSITION.ENEMY);
            const friendlies = living.filter(c => c.disposition !== app.DISPOSITION.ENEMY);
            if (enemies.length > 0) titleText = app._label('ui.enemies', 'Enemies');
            else if (friendlies.length > 0) titleText = app.combatState?.active ? app._label('ui.creatures', 'Creatures') : app._label('ui.here', 'Here');
            else if (corpses.length > 0) titleText = app._label('disposition.remains', 'Remains');
            title.textContent = titleText;
        }
        if (mobileTitle) mobileTitle.textContent = titleText;
        if (container) {
            let html = living.map(unit => this.listCard(app, unit, app.creatures.indexOf(unit), 'creature')).join('');
            if (corpses.length > 0) {
                html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);"><div style="color:var(--text-muted);font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">${app._escapeHtml(app._label('disposition.remains', 'Remains'))}</div>`;
                html += corpses.map(unit => this.listCard(app, unit, app.creatures.indexOf(unit), 'creature')).join('');
                html += '</div>';
            }
            container.innerHTML = html || `<p style="color: var(--text-muted); text-align: center;">${app._escapeHtml(app._label('ui.noCreaturesPresent', 'No creatures present'))}</p>`;
        }
        this.syncDetailToggle(app, 'creature');
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
    },

    syncDetailToggle(app, type) {
        const isParty = type === 'party';
        const list = isParty ? (app.party || []) : (app.creatures || []);
        const button = document.getElementById(isParty ? 'party-detail-toggle' : 'creature-detail-toggle');
        if (!button) return;
        const allExpanded = list.length > 0 && list.every(unit => unit?.expanded);
        const labelKey = allExpanded ? 'ui.hideDetails' : 'ui.showDetails';
        const titleKey = allExpanded
            ? (isParty ? 'ui.hidePartyDetailsTitle' : 'ui.hideCreatureDetailsTitle')
            : (isParty ? 'ui.showPartyDetailsTitle' : 'ui.showCreatureDetailsTitle');
        const fallbackLabel = allExpanded ? 'Hide Details' : 'Show Details';
        const fallbackTitle = allExpanded
            ? (isParty ? 'Hide details for all party cards' : 'Hide details for all creature cards')
            : (isParty ? 'Show details for all party cards' : 'Show details for all creature cards');
        const label = app._label(labelKey, fallbackLabel);
        const title = app._label(titleKey, fallbackTitle);
        button.textContent = label;
        button.title = title;
        button.setAttribute('aria-label', title);
        button.setAttribute('aria-pressed', String(allExpanded));
        button.dataset.detailState = allExpanded ? 'expanded' : 'collapsed';
        button.dataset.i18n = labelKey;
        button.dataset.i18nTitle = titleKey;
        button.dataset.i18nAriaLabel = titleKey;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_RENDERING = YAW_PANEL_RENDERING;
}
