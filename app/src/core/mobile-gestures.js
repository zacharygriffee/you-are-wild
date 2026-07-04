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
