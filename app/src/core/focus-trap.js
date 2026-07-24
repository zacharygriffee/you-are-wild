/**
 * Focus and outside-dismiss helpers for overlays, dialogs, and intent menus.
 */
const YAW_FOCUS_TRAP = {
    focusableSelector() {
        return 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    },

    isFocusableChild(element, container) {
        if (!element || element.disabled || element.hidden) return false;
        if (String(element.getAttribute?.('type') || '').toLowerCase() === 'hidden') return false;
        const tabIndex = element.getAttribute?.('tabindex');
        if (tabIndex !== null && tabIndex !== undefined && Number(tabIndex) < 0) return false;
        let current = element;
        while (current) {
            if (current.hidden || current.hasAttribute?.('hidden') || current.inert || current.hasAttribute?.('inert')) return false;
            if (current.getAttribute?.('aria-hidden') === 'true') return false;
            const style = typeof getComputedStyle === 'function' ? getComputedStyle(current) : current.style;
            if (style && (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')) return false;
            if (current === container) break;
            current = current.parentElement;
        }
        if (element.isConnected !== false && typeof element.getClientRects === 'function' && element.getClientRects().length === 0) return false;
        return true;
    },

    focusableChildren(container) {
        if (!container || typeof container.querySelectorAll !== 'function') return [];
        return Array.from(container.querySelectorAll(this.focusableSelector())).filter(element => this.isFocusableChild(element, container));
    },

    focusFirstIn(container) {
        const focusables = this.focusableChildren(container);
        const target = focusables[0] || container;
        if (target && typeof target.focus === 'function') {
            try { target.focus(); } catch(e) {}
        }
    },

    activate(app, container, options = {}) {
        if (!container) return;
        this.restore(app, { restoreFocus: false });
        const previous = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
        app._focusTrap = { container, previous, close: options.close || null };
        if (typeof container.hasAttribute === 'function' && typeof container.setAttribute === 'function' && !container.hasAttribute('tabindex')) {
            container.setAttribute('tabindex', '-1');
        }
        app._focusTrapHandler = (event) => {
            if (!app._focusTrap || app._focusTrap.container !== container) return;
            if (event.key === 'Escape' && app._focusTrap.close) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                app._focusTrap.close();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusables = this.focusableChildren(container);
            if (focusables.length === 0) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                this.focusFirstIn(container);
                return;
            }
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                first.focus();
            }
        };
        if (typeof document.addEventListener === 'function') document.addEventListener('keydown', app._focusTrapHandler);
        setTimeout(() => this.focusFirstIn(container), 0);
    },

    activateOutsideDismiss(app, container) {
        if (!container || typeof document.addEventListener !== 'function') return;
        app._mobileContextOutsideHandler = (event) => {
            const target = event && event.target;
            const inside = target && (target === container || (typeof container.contains === 'function' && container.contains(target)));
            if (inside) return;
            app.closeIntentMenu();
        };
        setTimeout(() => {
            if (app._mobileContextOutsideHandler) {
                document.addEventListener('pointerdown', app._mobileContextOutsideHandler);
            }
        }, 0);
    },

    restore(app, options = {}) {
        const trap = app._focusTrap;
        if (app._focusTrapHandler && typeof document.removeEventListener === 'function') {
            document.removeEventListener('keydown', app._focusTrapHandler);
        }
        if (app._mobileContextOutsideHandler && typeof document.removeEventListener === 'function') {
            document.removeEventListener('pointerdown', app._mobileContextOutsideHandler);
        }
        app._mobileContextOutsideHandler = null;
        app._focusTrapHandler = null;
        app._focusTrap = null;
        if (options.restoreFocus !== false && trap?.previous && typeof trap.previous.focus === 'function') {
            try { trap.previous.focus(); } catch(e) {}
        }
    }
};

window.YAW_FOCUS_TRAP = YAW_FOCUS_TRAP;
