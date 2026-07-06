/**
 * YOU ARE WILD TILE EVENT FEED
 * Ephemeral current-location event presentation for desktop and mobile center surfaces.
 */

const YAW_TILE_EVENT_FEED = {
    clear(app) {
        app.tileEvents = [];
        this.render(app);
    },

    timestamp(app) {
        try {
            return `${app._timeLabel()} ${app._isNight() ? app._label('ui.tileInfo.night', 'Night') : app._label('ui.tileInfo.day', 'Day')}`;
        } catch(e) {
            return '';
        }
    },

    normalizeMeta(app, type = 'discovery', meta = {}) {
        const logMeta = app._logCategoryMeta(type);
        const actorName = meta.actorName || meta.speakerName || meta.actor?.name || null;
        const semanticKind = meta.semanticKind || meta.kind || (actorName ? 'action' : type);
        return {
            icon: meta.icon || logMeta.icon,
            label: meta.label || logMeta.label,
            actorName,
            speakerName: meta.speakerName || null,
            intent: meta.intent || null,
            semanticKind,
            summary: meta.summary || null
        };
    },

    add(app, text, type = 'discovery', meta = {}) {
        const message = String(text || '').trim();
        if (!message) return null;
        const presentation = this.normalizeMeta(app, type, meta);
        const event = {
            text: message,
            type: type || 'discovery',
            x: app.inInterior ? app.interiorLocation?.x : app.location?.x,
            y: app.inInterior ? app.interiorLocation?.y : app.location?.y,
            time: this.timestamp(app),
            ...meta,
            ...presentation
        };
        if (!Array.isArray(app.tileEvents)) app.tileEvents = [];
        app.tileEvents.push(event);
        if (app.tileEvents.length > 12) app.tileEvents = app.tileEvents.slice(-12);
        this.render(app);
        return event;
    },

    html(app, { limit = 6, compact = false } = {}) {
        const events = Array.isArray(app.tileEvents) ? app.tileEvents.slice(-limit) : [];
        if (!events.length) return '';
        const title = app._escapeHtml(app._label('ui.tileEvents.title', 'Here now'));
        const items = events.map(event => {
            const type = event.type || 'discovery';
            const meta = this.normalizeMeta(app, type, event);
            const kind = app._escapeHtml(meta.semanticKind || type);
            const actor = meta.actorName ? `<span class="tile-event-actor">${app._escapeHtml(meta.actorName)}</span>` : '';
            const intent = meta.intent ? `<span class="tile-event-intent">${app._escapeHtml(meta.intent)}</span>` : '';
            const time = event.time ? `<span class="tile-event-time">${app._escapeHtml(event.time)}</span>` : '';
            return `<div class="tile-event-item ${app._escapeHtml(type)}" data-event-kind="${kind}" role="listitem">` +
                `<span class="tile-event-icon" aria-label="${app._escapeHtml(meta.label)}">${app._escapeHtml(meta.icon)}</span>` +
                `<span class="tile-event-body">${actor}${intent}<span class="tile-event-text">${app._escapeHtml(event.text)}</span></span>` +
                time +
            `</div>`;
        }).join('');
        const titleHtml = compact ? '' : `<div class="tile-event-title">${title}</div>`;
        const className = compact ? 'tile-event-feed compact' : 'tile-event-feed';
        return `<section class="${className}" aria-label="${title}">${titleHtml}<div class="tile-event-list" role="list">${items}</div></section>`;
    },

    render(app) {
        const desktopHtml = this.html(app);
        const mobileHtml = this.html(app, { limit: 1, compact: true });
        const desktop = document.getElementById('tile-event-feed');
        const mobile = document.getElementById('mobile-tile-event-feed');
        if (desktop) desktop.innerHTML = desktopHtml;
        if (mobile) mobile.innerHTML = mobileHtml;
        return desktopHtml;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TILE_EVENT_FEED = YAW_TILE_EVENT_FEED;
}
