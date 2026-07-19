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

    beginUnitStripPan(app, strip, clientX, clientY, pointerId = null) {
        app._mobileUnitStripPan = {
            strip,
            pointerId,
            startX: clientX,
            startY: clientY,
            scrollLeft: strip.scrollLeft || 0,
            active: false
        };
    },

    moveUnitStripPan(app, strip, clientX, clientY) {
        const pan = app._mobileUnitStripPan;
        if (!pan || pan.strip !== strip) return false;
        const dx = clientX - pan.startX;
        const dy = clientY - pan.startY;
        if (!pan.active) {
            if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return false;
            pan.active = true;
            strip.classList?.add('is-dragging');
            this.cancelCreaturePress(app);
            this.cancelPartyPress(app);
        }
        pan.strip.scrollLeft = pan.scrollLeft - dx;
        app._mobileUnitStripSuppressClickUntil = Date.now() + 400;
        return true;
    },

    endUnitStripPan(app, strip) {
        const pan = app._mobileUnitStripPan;
        if (pan?.strip === strip && pan.active) {
            app._mobileUnitStripSuppressClickUntil = Date.now() + 400;
        }
        strip?.classList?.remove('is-dragging');
        if (pan?.strip === strip) app._mobileUnitStripPan = null;
    },

    bindUnitStripPan(app, strip) {
        if (!strip || typeof strip.addEventListener !== 'function') return;
        strip.dataset = strip.dataset || {};
        if (strip.dataset.unitStripPanBound === 'true') return;
        strip.dataset.unitStripPanBound = 'true';
        strip.addEventListener('click', event => {
            if ((app._mobileUnitStripSuppressClickUntil || 0) < Date.now()) return;
            app._mobileUnitStripSuppressClickUntil = 0;
            if (typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        }, true);

        if (typeof PointerEvent !== 'undefined') {
            strip.addEventListener('pointerdown', event => {
                if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
                const touchedStrip = event.target?.closest?.(this.unitStripPanSelector) || event.currentTarget || strip;
                if (touchedStrip !== strip && !strip.contains?.(touchedStrip)) return;
                this.beginUnitStripPan(app, strip, event.clientX, event.clientY, event.pointerId);
            }, { passive: true });
            strip.addEventListener('pointermove', event => {
                const pan = app._mobileUnitStripPan;
                if (!pan || pan.strip !== strip || (pan.pointerId !== null && event.pointerId !== pan.pointerId)) return;
                if (!this.moveUnitStripPan(app, strip, event.clientX, event.clientY)) return;
                try { strip.setPointerCapture?.(event.pointerId); } catch (error) {}
                if (event.cancelable && typeof event.preventDefault === 'function') event.preventDefault();
            }, { passive: false });
            const clearPointer = event => {
                const pan = app._mobileUnitStripPan;
                if (!pan || pan.strip !== strip || (pan.pointerId !== null && event.pointerId !== pan.pointerId)) return;
                try { strip.releasePointerCapture?.(event.pointerId); } catch (error) {}
                this.endUnitStripPan(app, strip);
            };
            strip.addEventListener('pointerup', clearPointer, { passive: true });
            strip.addEventListener('pointercancel', clearPointer, { passive: true });
            return;
        }

        strip.addEventListener('touchstart', event => {
            if (!event.touches || event.touches.length !== 1) return;
            const touchedStrip = event.target?.closest?.(this.unitStripPanSelector) || event.currentTarget || strip;
            if (touchedStrip !== strip && !strip.contains?.(touchedStrip)) return;
            const touch = event.touches[0];
            this.beginUnitStripPan(app, strip, touch.clientX, touch.clientY);
        }, { passive: true });
        strip.addEventListener('touchmove', event => {
            if (!event.touches || event.touches.length !== 1) return;
            const touch = event.touches[0];
            if (!this.moveUnitStripPan(app, strip, touch.clientX, touch.clientY)) return;
            if (event.cancelable && typeof event.preventDefault === 'function') event.preventDefault();
        }, { passive: false });
        const clearTouch = () => this.endUnitStripPan(app, strip);
        strip.addEventListener('touchend', clearTouch, { passive: true });
        strip.addEventListener('touchcancel', clearTouch, { passive: true });
    },

    initUnitStripPan(app, root = document) {
        if (typeof document === 'undefined') return;
        app._mobileUnitStripPan = app._mobileUnitStripPan || null;
        app._mobileUnitStripSuppressClickUntil = app._mobileUnitStripSuppressClickUntil || 0;
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
