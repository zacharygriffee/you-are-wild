/**
 * YOU ARE WILD PANEL SHELL
 * Desktop and mobile panel navigation, focus, and backdrop behavior.
 */

const YAW_PANEL_SHELL = {
    panels() {
        return document.querySelectorAll('.panel-map, .panel-party, .panel-enemies');
    },

    toggle(app, panelName) {
        const panel = document.getElementById('panel-' + panelName);
        if (!panel) return;
        const isMobile = window.innerWidth <= 1024;
        if (!isMobile) {
            if (panelName === 'map') {
                this.toggleDesktopMap(app, panel);
                return;
            }
            this.focusDesktopPanel(app, panelName);
            return;
        }
        const wasActive = panel.classList.contains('active');
        this.panels().forEach(panelEl => panelEl.classList.remove('active'));
        if (!wasActive) panel.classList.add('active');
        this.syncBackdrop(app);
    },

    open(app, panelName) {
        const panel = document.getElementById('panel-' + panelName);
        const isMobile = window.innerWidth <= 1024;
        if (isMobile && (panelName === 'party' || panelName === 'enemies')) {
            return this.openRoster(app, panelName === 'party' ? (app.combatState?.active ? 'allies' : 'party') : (app.combatState?.active ? 'enemies' : 'here'));
        }
        if (!panel) return false;
        if (!isMobile) {
            if (panelName === 'map') {
                this.toggleDesktopMap(app, panel);
                return true;
            }
            this.focusDesktopPanel(app, panelName);
            return true;
        }
        this.panels().forEach(panelEl => panelEl.classList.remove('active'));
        panel.classList.add('active');
        this.syncBackdrop(app);
        this.focusPanel(panel, { preventScroll: true });
        return true;
    },

    openFromRail(app, panelName, rail = '') {
        const isMobile = window.innerWidth <= 1024;
        if (isMobile && (panelName === 'party' || panelName === 'enemies')) {
            app._mobilePanelReturnRail = rail || (panelName === 'party' ? 'actor' : 'target');
            return this.openRoster(app, panelName === 'party' ? (app.combatState?.active ? 'allies' : 'party') : (app.combatState?.active ? 'enemies' : 'here'));
        }
        if (isMobile && rail) app._mobilePanelReturnRail = rail;
        return this.open(app, panelName);
    },

    rosterTabs(app) {
        if (app.combatState?.active) {
            return [
                { id: 'allies', key: 'ui.allies', label: app._label('ui.allies', 'Allies') },
                { id: 'enemies', key: 'ui.enemies', label: app._label('ui.enemies', 'Enemies') }
            ];
        }
        const tabs = [
            { id: 'party', key: 'ui.party', label: app._label('ui.party', 'Party') },
            { id: 'here', key: 'ui.here', label: app._label('ui.here', 'Here') }
        ];
        if (YAW_MOBILE_UNIT_STRIPS?.hasTileItems?.(app)) {
            tabs.push({ id: 'items', key: 'ui.items', label: app._label('ui.items', 'Items') });
        }
        return tabs;
    },

    normalizeRosterTab(app, requested = app.mobileRosterTab) {
        const tabs = this.rosterTabs(app);
        const requestedId = String(requested || '');
        if (tabs.some(tab => tab.id === requestedId)) return requestedId;
        if (app.combatState?.active) {
            return app._livingEnemies?.(app.creatures)?.length ? 'enemies' : 'allies';
        }
        return 'party';
    },

    rosterCards(app, tab) {
        if (tab === 'items') {
            return YAW_MOBILE_UNIT_STRIPS?.tileItemChip?.(app)
                || `<p class="mobile-roster-empty">${app._escapeHtml(app._label('ui.noItemsHere', 'No items here'))}</p>`;
        }
        const partyTab = tab === 'party' || tab === 'allies';
        const list = partyTab
            ? (app.party || [])
            : (app.creatures || []).filter(unit => tab !== 'enemies' || unit?.disposition === app.DISPOSITION.ENEMY);
        const html = list.map(unit => {
            const type = partyTab ? 'party' : 'creature';
            const index = partyTab ? app.party.indexOf(unit) : app.creatures.indexOf(unit);
            return app.renderMobileUnitChip(unit, index, type);
        }).join('');
        const empty = partyTab
            ? app._label('ui.noPartyMembers', 'No party members')
            : app._label(tab === 'enemies' ? 'ui.noEnemiesPresent' : 'ui.noCreaturesHere', tab === 'enemies' ? 'No enemies present' : 'No creatures here');
        return html || `<p class="mobile-roster-empty">${app._escapeHtml(empty)}</p>`;
    },

    renderRoster(app) {
        const sheet = document.getElementById('mobile-roster-sheet');
        if (!sheet) return false;
        const tabs = this.rosterTabs(app);
        const activeTab = this.normalizeRosterTab(app);
        app.mobileRosterTab = activeTab;
        const tabIds = new Set(tabs.map(tab => tab.id));
        sheet.querySelectorAll('[data-roster-tab]').forEach(button => {
            const id = button.dataset.rosterTab;
            const available = tabIds.has(id);
            const selected = available && id === activeTab;
            button.hidden = !available;
            button.setAttribute('aria-selected', String(selected));
            button.setAttribute('tabindex', selected ? '0' : '-1');
            button.classList.toggle('selected', selected);
            const tab = tabs.find(candidate => candidate.id === id);
            if (tab) {
                button.textContent = tab.label;
                button.dataset.i18n = tab.key;
            }
        });
        const panel = document.getElementById('mobile-roster-tabpanel');
        const selectedButton = sheet.querySelector(`[data-roster-tab="${activeTab}"]`);
        if (panel) {
            panel.setAttribute('aria-labelledby', selectedButton?.id || 'mobile-roster-title');
            const detail = app.mobileRosterDetail;
            if (detail && detail.tab === activeTab) {
                const back = app._escapeHtml(app._label('ui.back', 'Back'));
                panel.innerHTML = `<div class="mobile-roster-detail"><div class="mobile-roster-detail-toolbar"><button type="button" class="nav-btn" data-command-surface="roster" data-command-mode="navigation" data-command-control="close-roster-detail" title="${back}" aria-label="${back}" onclick="App.clearMobileRosterDetail()">${back}</button><strong>${app._escapeHtml(detail.title || '')}</strong></div>${detail.html || ''}</div>`;
            } else {
                panel.innerHTML = this.rosterCards(app, activeTab);
            }
        }
        const dock = document.getElementById('mobile-creatures-dock-btn');
        if (dock) {
            dock.setAttribute('aria-expanded', String(Boolean(app.mobileRosterOpen)));
            dock.classList.toggle('selected', Boolean(app.mobileRosterOpen));
        }
        return true;
    },

    openRoster(app, requestedTab = '') {
        if (window.innerWidth > 1024) {
            return this.open(app, requestedTab === 'party' || requestedTab === 'allies' ? 'party' : 'enemies');
        }
        const sheet = document.getElementById('mobile-roster-sheet');
        if (!sheet) return false;
        if (!app.mobileRosterOpen) app._mobileRosterOpener = document.activeElement;
        app.mobileRosterOpen = true;
        app.mobileRosterTab = this.normalizeRosterTab(app, requestedTab || app.mobileRosterTab);
        this.renderRoster(app);
        sheet.hidden = false;
        sheet.setAttribute('aria-hidden', 'false');
        sheet.classList.add('open');
        document.getElementById('mobile-play-surface')?.classList?.add('roster-open');
        const tab = sheet.querySelector(`[data-roster-tab="${app.mobileRosterTab}"]`);
        if (tab && typeof tab.focus === 'function') {
            try { tab.focus({ preventScroll: true }); } catch (_error) { tab.focus(); }
        }
        return true;
    },

    closeRoster(app, options = {}) {
        const sheet = document.getElementById('mobile-roster-sheet');
        if (!sheet || !app.mobileRosterOpen) return false;
        app.mobileRosterOpen = false;
        app.mobileRosterDetail = null;
        sheet.classList.remove('open');
        sheet.hidden = true;
        sheet.setAttribute('aria-hidden', 'true');
        document.getElementById('mobile-play-surface')?.classList?.remove('roster-open');
        const dock = document.getElementById('mobile-creatures-dock-btn');
        if (dock) {
            dock.setAttribute('aria-expanded', 'false');
            dock.classList.remove('selected');
        }
        const focusComposer = options.focusComposer === true;
        const focusTarget = focusComposer
            ? document.querySelector('#mobile-target-action-tray button, #mobile-explore-actions button, #mobile-combat-toolbelt button, #mobile-selection-sentence [tabindex]')
            : (app._mobileRosterOpener || dock);
        app._mobileRosterOpener = null;
        app._mobilePanelReturnRail = null;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            requestAnimationFrame(() => {
                try { focusTarget.focus({ preventScroll: true }); } catch (_error) { focusTarget.focus(); }
            });
        }
        return true;
    },

    toggleRoster(app, requestedTab = '') {
        if (app.mobileRosterOpen) return this.closeRoster(app);
        return this.openRoster(app, requestedTab);
    },

    setRosterTab(app, tab, options = {}) {
        app.mobileRosterDetail = null;
        app.mobileRosterTab = this.normalizeRosterTab(app, tab);
        this.renderRoster(app);
        if (options.focus !== false) {
            const button = document.querySelector(`#mobile-roster-sheet [data-roster-tab="${app.mobileRosterTab}"]`);
            if (button && typeof button.focus === 'function') button.focus({ preventScroll: true });
        }
        return true;
    },

    rosterTabKeydown(app, event) {
        if (!event || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return false;
        const buttons = [...document.querySelectorAll('#mobile-roster-tabs [data-roster-tab]:not([hidden])')];
        if (!buttons.length) return false;
        const current = Math.max(0, buttons.indexOf(document.activeElement));
        const next = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? buttons.length - 1
                : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        event.preventDefault();
        return this.setRosterTab(app, buttons[next].dataset.rosterTab);
    },

    handleRosterSelection(app, event) {
        const control = event?.target?.closest?.('[data-command-control]');
        const selectionControls = new Set([
            'focus-actor', 'focus-target', 'focus-items', 'mark-combat-target',
            'pick-target', 'toggle-sync-participant', 'toggle-combat-plan-actor'
        ]);
        if (!control || !selectionControls.has(control.dataset.commandControl)) return false;
        requestAnimationFrame(() => this.closeRoster(app, { focusComposer: true }));
        return true;
    },

    showRosterDetail(app, tab, title, html) {
        app.mobileRosterDetail = { tab: this.normalizeRosterTab(app, tab), title: String(title || ''), html: String(html || '') };
        return this.openRoster(app, app.mobileRosterDetail.tab);
    },

    clearRosterDetail(app) {
        if (!app.mobileRosterDetail) return false;
        const tab = app.mobileRosterDetail.tab;
        app.mobileRosterDetail = null;
        this.setRosterTab(app, tab, { focus: false });
        const panel = document.getElementById('mobile-roster-tabpanel');
        const focusTarget = panel?.querySelector?.('button, [tabindex="0"]');
        if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });
        return true;
    },

    toggleDesktopMap(app, panel) {
        this.panels().forEach(panelEl => panelEl.classList.remove('nav-focus'));
        const isActive = panel.classList.toggle('active');
        if (!isActive) return;
        this.focusPanel(panel, { preventScroll: true });
    },

    focusDesktopPanel(app, panelName) {
        const panel = document.getElementById('panel-' + panelName);
        if (!panel) return;
        this.closeAll(app);
        this.panels().forEach(panelEl => panelEl.classList.remove('nav-focus'));
        panel.classList.add('nav-focus');
        this.scrollPanelIntoView(panel);
        this.focusPanel(panel, { preventScroll: true });
        clearTimeout(app._panelFocusTimer);
        app._panelFocusTimer = setTimeout(() => {
            panel.classList.remove('nav-focus');
        }, 1200);
    },

    focusPanel(panel, options = {}) {
        if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
        try { panel.focus(options); } catch (e) { panel.focus(); }
    },

    scrollPanelIntoView(panel) {
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        try {
            panel.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        } catch (e) {
            panel.scrollIntoView();
        }
    },

    closeAll(app) {
        this.closeRoster(app);
        const hadActivePanel = Boolean(document.querySelector('.panel-map.active, .panel-party.active, .panel-enemies.active'));
        this.panels().forEach(panel => panel.classList.remove('active'));
        this.syncBackdrop(app);
        if (hadActivePanel) this.restoreMobileRailContext(app);
    },

    restoreMobileRailContext(app) {
        const isMobile = window.innerWidth <= 1024;
        if (!isMobile || app.combatState?.active) {
            app._mobilePanelReturnRail = null;
            return false;
        }
        const rail = app._mobilePanelReturnRail || '';
        app._mobilePanelReturnRail = null;
        if (rail === 'actor') app.mobileActorBeltOpen = true;
        if (rail === 'target') {
            app.mobileTargetPickerOpen = true;
            app.mobileCreatureRailOpen = false;
        }
        app.renderMobileExplorationControls?.();
        if (rail === 'target') app.renderMobileCreatureStrip?.();
        const focusSelectors = rail === 'target'
            ? ['#mobile-target-picker-belt [data-command-control="focus-target"]', '#mobile-target-picker-belt [data-command-control="focus-items"]', '#mobile-target-picker-belt [data-command-control="open-target-drawer"]']
            : ['#mobile-actor-belt [data-command-control="focus-actor"]', '#mobile-actor-belt button'];
        const target = focusSelectors.map(selector => document.querySelector(selector)).find(Boolean);
        if (target && typeof target.focus === 'function') {
            try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
        }
        return Boolean(target);
    },

    syncBackdrop() {
        const backdrop = document.getElementById('panel-backdrop');
        const hasActivePanel = Boolean(document.querySelector('.panel-map.active, .panel-party.active, .panel-enemies.active'));
        if (backdrop) backdrop.classList.toggle('active', hasActivePanel);
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
        document.getElementById('mobile-play-surface')?.classList?.toggle('details-drawer-open', Boolean(isMobile && hasActivePanel));
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_SHELL = YAW_PANEL_SHELL;
}
