/**
 * YOU ARE WILD STORY EVENTS
 * Lightweight semantic presentation layer for resolved actor-target-intent beats.
 */

const YAW_STORY_EVENTS = {
    maxEvents: 18,

    units(input = []) {
        const list = Array.isArray(input) ? input : [input];
        const seen = new Set();
        return list.filter(unit => {
            if (!unit) return false;
            const id = String(unit.id || unit.name || seen.size);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    },

    unitNames(app, units = []) {
        const playerName = app.player?.name || app._label('party.you', 'You');
        return this.units(units).map(unit => unit === app.player || unit.name === playerName
            ? app._label('party.you', 'You')
            : (unit.name || app._label('ui.unknown', 'Unknown')));
    },

    intentLabel(app, intent = '') {
        const clean = String(intent || 'action').replace(/^sync_/, '');
        if (intent && typeof app._syncActionLabel === 'function' && String(intent).startsWith('sync_')) {
            return app._syncActionLabel(intent);
        }
        return app._uiLabel ? app._uiLabel(clean) : clean;
    },

    locationLabel(app) {
        if (app.inInterior && app.activeInterior) {
            return app.activeInterior.structureName || app._label('ui.largeMap.interior', 'Interior');
        }
        const tile = app._currentExplorationTile?.() || app.getTile?.(app.location?.x || 0, app.location?.y || 0);
        const biome = tile ? (app.biomes[tile.displayBiome || tile.biome] || app.biomes[tile.biome]) : null;
        const name = tile?.structure ? (app.STRUCTURES[tile.structure]?.name || tile.structure) : (tile?.landmarkName || biome?.name || app._label('ui.exploration', 'Exploration'));
        return `${name} (${app.location?.x || 0}, ${app.location?.y || 0})`;
    },

    defaultSummary(app, actors, targets, intent) {
        const actorText = this.unitNames(app, actors).join(', ') || app._label('target.actorRole', 'Actor');
        const targetText = this.unitNames(app, targets).join(', ') || app._label('target.targetRole', 'Target');
        return app._label('story.defaultSummary', '{actors} -> {targets}: {intent}.', {
            actors: actorText,
            targets: targetText,
            intent: this.intentLabel(app, intent)
        });
    },

    normalize(app, input = {}) {
        const actors = this.units(input.actors || input.actor || []);
        const targets = this.units(input.targets || input.target || []);
        const intent = input.intent || input.action || 'action';
        const rawSummary = String(input.summary || input.result || '').trim();
        const summary = rawSummary || this.defaultSummary(app, actors, targets, intent);
        const passage = String(input.passage || summary).trim();
        const actorNames = this.unitNames(app, actors);
        const targetNames = this.unitNames(app, targets);
        app.storyEventSeq = (Number(app.storyEventSeq) || 0) + 1;
        return {
            id: `story-${app.storyEventSeq}`,
            type: input.type || input.mode || 'interaction',
            mode: input.mode || (app.combatState?.active ? 'combat' : 'adventure'),
            intent,
            intentLabel: this.intentLabel(app, intent),
            actors,
            targets,
            actorNames,
            targetNames,
            summary,
            passage,
            deltas: Array.isArray(input.deltas) ? input.deltas : [],
            metadata: input.metadata || {},
            location: input.location || this.locationLabel(app),
            time: input.time || app._timeLabel?.() || '',
            createdAt: app.storyEventSeq
        };
    },

    emitResult(app, commandOrPlan = {}, result = '', options = {}) {
        const command = commandOrPlan?.plan || commandOrPlan || {};
        const resultText = Array.isArray(result)
            ? result.filter(Boolean).join(' ')
            : String(result || command.result || command.summary || '').trim();
        const actors = this.units(options.actors || command.actors || command.actor || []);
        const targets = this.units(options.targets || command.targets || command.target || []);
        const intent = options.intent || command.subAction || command.intent || command.action || 'action';
        const shape = options.shape || command.shape || command.distribution || '';
        const deltas = Array.isArray(options.deltas) ? options.deltas : (Array.isArray(command.deltas) ? command.deltas : []);
        return this.emit(app, {
            mode: options.mode || command.mode || command.planMode || (app.combatState?.active ? 'combat' : 'adventure'),
            type: options.type || 'interaction-result',
            actors,
            targets,
            intent,
            summary: options.summary || resultText || this.defaultSummary(app, actors, targets, intent),
            passage: options.passage || resultText || options.summary || '',
            deltas,
            metadata: {
                shape,
                source: options.source || command.source || 'interaction-result'
            }
        });
    },

    emit(app, input = {}) {
        const event = this.normalize(app, input);
        if (!Array.isArray(app.storyEvents)) app.storyEvents = [];
        app.storyEvents.push(event);
        if (app.storyEvents.length > this.maxEvents) app.storyEvents = app.storyEvents.slice(-this.maxEvents);
        app.latestStoryEvent = event;
        this.render(app);
        return event;
    },

    compactHtml(app, event = null) {
        if (!event) {
            return `<span class="story-empty">${app._escapeHtml(app._label('story.empty', 'Story beats will appear here after interactions.'))}</span>`;
        }
        const actors = event.actorNames?.length ? `<span class="story-actors">${app._escapeHtml(event.actorNames.join(', '))}</span>` : '';
        const targets = event.targetNames?.length ? `<span class="story-targets">${app._escapeHtml(event.targetNames.join(', '))}</span>` : '';
        const arrow = actors && targets ? '<span class="story-arrow" aria-hidden="true">-></span>' : '';
        const meta = [actors || '', arrow, targets || '', `<span class="story-intent">${app._escapeHtml(event.intentLabel)}</span>`].filter(Boolean).join('');
        return `<span class="story-latest-line"><span class="story-summary">${app._escapeHtml(event.summary)}</span><span class="story-meta-line">${meta}</span></span>`;
    },

    eventHtml(app, event) {
        const actors = event.actorNames?.length ? event.actorNames.join(', ') : app._label('target.actorRole', 'Actor');
        const targets = event.targetNames?.length ? event.targetNames.join(', ') : app._label('target.targetRole', 'Target');
        const deltas = event.deltas?.length
            ? `<ul class="story-deltas">${event.deltas.map(delta => `<li>${app._escapeHtml(delta)}</li>`).join('')}</ul>`
            : '';
        return `<article class="story-event" data-story-intent="${app._escapeHtml(event.intent)}" data-story-mode="${app._escapeHtml(event.mode)}">`
            + `<div class="story-event-meta"><span>${app._escapeHtml(event.time)}</span><span>${app._escapeHtml(event.location)}</span><span>${app._escapeHtml(event.intentLabel)}</span></div>`
            + `<h3>${app._escapeHtml(actors)} -> ${app._escapeHtml(targets)}</h3>`
            + `<p>${app._escapeHtml(event.passage || event.summary)}</p>`
            + deltas
            + `</article>`;
    },

    listHtml(app) {
        const events = (app.storyEvents || []).slice(-this.maxEvents).reverse();
        if (!events.length) {
            return `<div class="story-empty">${app._escapeHtml(app._label('story.noEvents', 'No story events yet. Resolve an interaction to begin the scene record.'))}</div>`;
        }
        return events.map(event => this.eventHtml(app, event)).join('');
    },

    render(app) {
        const latest = app.latestStoryEvent || (app.storyEvents || [])[app.storyEvents?.length - 1] || null;
        const latestHtml = this.compactHtml(app, latest);
        const mobileLatest = document.getElementById('mobile-story-latest');
        if (mobileLatest) mobileLatest.innerHTML = latestHtml;
        const desktopLatest = document.getElementById('desktop-story-latest');
        if (desktopLatest) desktopLatest.innerHTML = latestHtml;
        document.querySelectorAll?.('.desktop-combat-story-latest, .mobile-combat-story-latest').forEach(el => {
            el.innerHTML = latestHtml;
        });
        const sheetList = document.getElementById('story-sheet-list');
        if (sheetList) sheetList.innerHTML = this.listHtml(app);
        const count = String((app.storyEvents || []).length);
        document.querySelectorAll?.('[data-story-count]').forEach(el => {
            el.setAttribute('data-story-count', count);
        });
    },

    setUnderlyingInert(enabled) {
        const selectors = ['#app > .app-header', '#app .panel-main', '#app .panel-map', '#app .panel-party', '#app .panel-enemies', '#app > .panel-log'];
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) return;
            if (enabled) {
                element.setAttribute('inert', '');
                element.setAttribute('aria-hidden', 'true');
            } else {
                element.removeAttribute('inert');
                element.removeAttribute('aria-hidden');
            }
        });
    },

    open(app) {
        this.render(app);
        const sheet = document.getElementById('story-sheet');
        if (!sheet) return false;
        sheet.hidden = false;
        sheet.setAttribute('aria-hidden', 'false');
        document.getElementById('app')?.classList?.add('story-sheet-open');
        this.setUnderlyingInert(true);
        app._activateFocusTrap?.(sheet, { close: () => app.closeStorySheet() });
        app._focusFirstIn?.(sheet);
        return true;
    },

    close(app) {
        const sheet = document.getElementById('story-sheet');
        if (!sheet) return false;
        sheet.hidden = true;
        sheet.setAttribute('aria-hidden', 'true');
        app._restoreFocusTrap?.();
        this.setUnderlyingInert(false);
        document.getElementById('app')?.classList?.remove('story-sheet-open');
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_STORY_EVENTS = YAW_STORY_EVENTS;
}
