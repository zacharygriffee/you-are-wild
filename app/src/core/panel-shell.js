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
        if (!panel) return false;
        const isMobile = window.innerWidth <= 1024;
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
        if (isMobile && rail) app._mobilePanelReturnRail = rail;
        return this.open(app, panelName);
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
