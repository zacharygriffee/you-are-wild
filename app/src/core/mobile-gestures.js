/**
 * YOU ARE WILD MOBILE GESTURES
 * Touch gestures, haptics, and long-press timers for mobile play surfaces.
 */

const YAW_MOBILE_GESTURES = {
    haptic(pattern = 12) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) {}
        }
    },

    touchDistance(touches) {
        if (!touches || touches.length < 2) return 0;
        const dx = touches[0].screenX - touches[1].screenX;
        const dy = touches[0].screenY - touches[1].screenY;
        return Math.sqrt(dx * dx + dy * dy);
    },

    handleMapTouchStart(app, event) {
        if (!event.touches || event.touches.length < 2) return;
        app._pinchStartDistance = this.touchDistance(event.touches);
        app._pinchStartZoom = app.mobileMapZoom || 1;
    },

    handleMapTouchMove(app, event) {
        if (!event.touches || event.touches.length < 2 || !app._pinchStartDistance) return;
        if (typeof event.preventDefault === 'function') event.preventDefault();
        const distance = this.touchDistance(event.touches);
        const nextZoom = Math.max(0.75, Math.min(1.8, app._pinchStartZoom * (distance / app._pinchStartDistance)));
        app.mobileMapZoom = Math.round(nextZoom * 100) / 100;
        this.applyMobileMapZoom(app);
    },

    handleMapTouchEnd(app) {
        app._pinchStartDistance = 0;
    },

    applyMobileMapZoom(app) {
        const map = document.getElementById('mobile-mini-map');
        if (map) map.style.transform = `scale(${app.mobileMapZoom || 1})`;
    },

    unitStripPanSelector: '.mobile-unit-strip, .mobile-actor-belt, .mobile-target-picker-belt',

    bindUnitStripPan(app, strip) {
        if (!strip || typeof strip.addEventListener !== 'function') return;
        strip.dataset = strip.dataset || {};
        if (strip.dataset.unitStripPanBound === 'true') return;
        strip.dataset.unitStripPanBound = 'true';
        strip.addEventListener('touchstart', event => {
            if (!event.touches || event.touches.length !== 1) return;
            const touchedStrip = event.target?.closest?.(this.unitStripPanSelector) || event.currentTarget || strip;
            if (touchedStrip !== strip && !strip.contains?.(touchedStrip)) return;
            const touch = event.touches[0];
            app._mobileUnitStripPan = {
                strip,
                startX: touch.clientX,
                startY: touch.clientY,
                scrollLeft: strip.scrollLeft || 0,
                active: false
            };
        }, { passive: true });

        strip.addEventListener('touchmove', event => {
            const pan = app._mobileUnitStripPan;
            if (!pan || pan.strip !== strip || !event.touches || event.touches.length !== 1) return;
            const touch = event.touches[0];
            const dx = touch.clientX - pan.startX;
            const dy = touch.clientY - pan.startY;
            if (!pan.active) {
                if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
                pan.active = true;
                this.cancelCreaturePress(app);
                this.cancelPartyPress(app);
            }
            pan.strip.scrollLeft = pan.scrollLeft - dx;
            if (event.cancelable && typeof event.preventDefault === 'function') event.preventDefault();
        }, { passive: false });

        const clear = () => { app._mobileUnitStripPan = null; };
        strip.addEventListener('touchend', clear, { passive: true });
        strip.addEventListener('touchcancel', clear, { passive: true });
    },

    initUnitStripPan(app, root = document) {
        if (typeof document === 'undefined') return;
        app._mobileUnitStripPan = app._mobileUnitStripPan || null;
        const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
        const strips = scope.querySelectorAll?.(this.unitStripPanSelector) || [];
        for (const strip of strips) {
            this.bindUnitStripPan(app, strip);
        }
    },

    startCreaturePress(app, targetId) {
        this.cancelCreaturePress(app);
        app._mobilePressTargetId = targetId;
        app._mobilePressTimer = setTimeout(() => {
            app._haptic([12, 20, 12]);
            app.showMobileCreatureContext(targetId);
        }, 500);
    },

    cancelCreaturePress(app) {
        if (app._mobilePressTimer) clearTimeout(app._mobilePressTimer);
        app._mobilePressTimer = null;
    },

    startPartyPress(app, index) {
        this.cancelPartyPress(app);
        app._mobilePartyPressIndex = index;
        app._mobilePartyPressTimer = setTimeout(() => {
            app._haptic([12, 20, 12]);
            app.showMobilePartyContext(index);
        }, 500);
    },

    cancelPartyPress(app) {
        if (app._mobilePartyPressTimer) clearTimeout(app._mobilePartyPressTimer);
        app._mobilePartyPressTimer = null;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MOBILE_GESTURES = YAW_MOBILE_GESTURES;
}
