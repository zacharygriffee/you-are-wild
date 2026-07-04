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
        this.panels().forEach(panel => panel.classList.remove('active'));
        this.syncBackdrop(app);
    },

    syncBackdrop() {
        const backdrop = document.getElementById('panel-backdrop');
        if (!backdrop) return;
        const hasActivePanel = Boolean(document.querySelector('.panel-map.active, .panel-party.active, .panel-enemies.active'));
        backdrop.classList.toggle('active', hasActivePanel);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_SHELL = YAW_PANEL_SHELL;
}
