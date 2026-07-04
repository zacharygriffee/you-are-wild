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

    handleTouchStart(app, event) {
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;
        app._touchStartX = touch.screenX;
        app._touchStartY = touch.screenY;
    },

    handleTouchEnd(app, event) {
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;
        const endX = touch.screenX;
        const endY = touch.screenY;
        const dx = endX - app._touchStartX;
        const dy = endY - app._touchStartY;
        if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
        if (window.innerWidth > 1024) return;

        const mapP = document.getElementById('panel-map');
        const partyP = document.getElementById('panel-party');
        const enemiesP = document.getElementById('panel-enemies');
        app._haptic(6);

        if (dx > 0) {
            if (partyP && partyP.classList.contains('active')) partyP.classList.remove('active');
            else if (enemiesP && enemiesP.classList.contains('active')) enemiesP.classList.remove('active');
            else if (mapP && !mapP.classList.contains('active')) mapP.classList.add('active');
        } else {
            if (mapP && mapP.classList.contains('active')) mapP.classList.remove('active');
            else if (partyP && !partyP.classList.contains('active')) partyP.classList.add('active');
            else if (partyP && partyP.classList.contains('active') && enemiesP) {
                partyP.classList.remove('active');
                enemiesP.classList.add('active');
            } else if (enemiesP && enemiesP.classList.contains('active')) {
                enemiesP.classList.remove('active');
            }
        }

        app.syncPanelBackdrop();
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
