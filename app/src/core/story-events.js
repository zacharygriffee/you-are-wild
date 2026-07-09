/**
 * YOU ARE WILD STORY EVENTS
 * Lightweight semantic presentation layer for resolved actor-target-intent beats.
 */

const YAW_STORY_EVENTS = {
    maxEvents: 18,
    builtInTemplates: [],

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

    registerBuiltIns() {
        if (this.builtInTemplates.length) return;
        const resultFirst = (id, match, priority = 10) => ({
            id,
            priority,
            match,
            render: (app, ctx) => ({
                summary: ctx.outcome.summary || ctx.defaultSummary,
                passage: ctx.outcome.passage || ctx.outcome.summary || ctx.defaultSummary
            })
        });
        this.builtInTemplates = [
            resultFirst('combat.groupFight', ctx => ctx.mode === 'combat' && ctx.shape === 'many-to-one' && ctx.actionBase === 'fight' && ctx.actors.length > 1, 20),
            resultFirst('combat.fight', ctx => ctx.mode === 'combat' && ctx.actionBase === 'fight'),
            resultFirst('combat.social', ctx => ctx.mode === 'combat' && ['flirt', 'fuck'].includes(ctx.actionBase)),
            resultFirst('combat.feed', ctx => ctx.mode === 'combat' && ctx.actionBase === 'feed'),
            resultFirst('exploration.partySocial', ctx => ctx.mode !== 'combat' && ['flirt', 'fuck'].includes(ctx.actionBase) && ctx.targets.some(target => ctx.app.party.includes(target)), 15),
            resultFirst('exploration.creatureSocial', ctx => ctx.mode !== 'combat' && ['flirt', 'fuck'].includes(ctx.actionBase)),
            resultFirst('exploration.feed', ctx => ctx.mode !== 'combat' && ctx.actionBase === 'feed'),
            resultFirst('exploration.fight', ctx => ctx.mode !== 'combat' && ctx.actionBase === 'fight')
        ];
    },

    registerSceneTemplate(app, template = {}) {
        if (!template || typeof template !== 'object') return false;
        if (!template.id && !template.action && !template.mode && typeof template.match !== 'function') return false;
        const normalized = {
            id: String(template.id || `mod-template-${Date.now()}-${Math.random().toString(36).slice(2)}`),
            mode: template.mode || null,
            action: template.action || null,
            shape: template.shape || null,
            tags: Array.isArray(template.tags) ? template.tags.map(String) : [],
            minTier: Number.isFinite(template.minTier) ? template.minTier : 0,
            maxTier: Number.isFinite(template.maxTier) ? template.maxTier : Infinity,
            priority: Number.isFinite(template.priority) ? template.priority : 0,
            match: typeof template.match === 'function' ? template.match : null,
            render: typeof template.render === 'function' ? template.render : null,
            summary: typeof template.summary === 'function' || typeof template.summary === 'string' ? template.summary : null,
            passage: typeof template.passage === 'function' || typeof template.passage === 'string' ? template.passage : null,
            source: template.source || 'mod'
        };
        if (!Array.isArray(app.sceneTemplates)) app.sceneTemplates = [];
        app.sceneTemplates = app.sceneTemplates.filter(existing => existing.id !== normalized.id);
        app.sceneTemplates.push(normalized);
        return true;
    },

    templateContext(app, plan = {}, outcome = {}) {
        const actors = this.units(outcome.actors || plan.actors || plan.actor || []);
        const targets = this.units(outcome.targets || plan.targets || plan.target || []);
        const action = outcome.action || outcome.intent || plan.subAction || plan.intent || plan.action || 'action';
        const actionBase = String(action || 'action').replace(/^sync_/, '').replace(/^(enemy|ally)_/, '') || action;
        const mode = outcome.mode || plan.mode || plan.planMode || (app.combatState?.active ? 'combat' : 'adventure');
        const shape = outcome.shape || plan.shape || plan.distribution || (actors.length > 1 && targets.length === 1 ? 'many-to-one' : (actors.length === 1 && targets.length > 1 ? 'one-to-many' : 'one-to-one'));
        const defaultSummary = this.defaultSummary(app, actors, targets, action);
        return {
            app,
            plan,
            outcome,
            mode,
            action,
            actionBase,
            subAction: outcome.subAction || plan.subAction || null,
            shape,
            actors,
            targets,
            actorNames: this.unitNames(app, actors),
            targetNames: this.unitNames(app, targets),
            defaultSummary,
            tags: [...new Set([...(Array.isArray(plan.tags) ? plan.tags : []), ...(Array.isArray(outcome.tags) ? outcome.tags : [])].map(String))]
        };
    },

    templateMatches(app, template, ctx) {
        const tier = Number((typeof CONTENT !== 'undefined' ? CONTENT?.preferences?.maxTier : 0) ?? 0);
        if (tier < template.minTier || tier > template.maxTier) return false;
        if (template.mode && template.mode !== ctx.mode) return false;
        if (template.action && template.action !== ctx.action && template.action !== ctx.actionBase) return false;
        if (template.shape && template.shape !== ctx.shape) return false;
        if (template.tags?.length && !template.tags.every(tag => ctx.tags.includes(tag))) return false;
        if (template.match) return Boolean(template.match(ctx, app));
        return true;
    },

    renderTemplateText(app, value, ctx) {
        if (typeof value === 'function') return String(value(ctx, app) || '');
        if (typeof value !== 'string') return '';
        const vars = {
            actors: ctx.actorNames.join(', ') || app._label('target.actorRole', 'Actor'),
            targets: ctx.targetNames.join(', ') || app._label('target.targetRole', 'Target'),
            action: this.intentLabel(app, ctx.action),
            summary: ctx.outcome.summary || ctx.defaultSummary,
            passage: ctx.outcome.passage || ctx.outcome.summary || ctx.defaultSummary
        };
        return value.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
    },

    selectTemplate(app, ctx) {
        this.registerBuiltIns();
        const templates = [...(app.sceneTemplates || []), ...this.builtInTemplates]
            .filter(template => this.templateMatches(app, template, ctx))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        return templates[0] || null;
    },

    extractDeltas(resultText = '') {
        const text = String(resultText || '');
        const deltas = [];
        const pushNumber = (type, match, unit = '') => {
            if (match) deltas.push({ type, amount: Number(match[1]), unit });
        };
        pushNumber('punishment', text.match(/(?:for|dealing)\s+(\d+)\s+punishment/i));
        pushNumber('healing', text.match(/restor(?:ing|es)\s+(\d+)\s+punishment/i));
        const spirit = text.match(/Spirit rises to\s+(\d+)\/(\d+)/i);
        if (spirit) deltas.push({ type: 'spirit', current: Number(spirit[1]), max: Number(spirit[2]) });
        if (/collapses|defeated|subdued|overwhelmed/i.test(text)) deltas.push({ type: 'state', state: 'defeated' });
        if (/friendly|standing down|charmed/i.test(text)) deltas.push({ type: 'state', state: 'friendly' });
        return deltas;
    },

    normalizeOutcome(app, plan = {}, result = '', options = {}) {
        const resultText = Array.isArray(result)
            ? result.filter(Boolean).join(' ')
            : String(result || plan.result || plan.summary || '').trim();
        const deltas = Array.isArray(options.deltas)
            ? options.deltas
            : (Array.isArray(plan.deltas) ? plan.deltas : this.extractDeltas(resultText));
        const tags = [...new Set([...(Array.isArray(options.tags) ? options.tags : []), ...(Array.isArray(plan.tags) ? plan.tags : [])].map(String))];
        const inferredResultKind = (() => {
            if (deltas.some(delta => (delta.type || delta.kind) === 'state' && delta.state === 'defeated')) return 'decisive';
            if (deltas.some(delta => ['punishment', 'damage'].includes(delta.type || delta.kind))) return 'damage';
            if (deltas.some(delta => ['healing', 'heal'].includes(delta.type || delta.kind))) return 'recovery';
            if (deltas.some(delta => (delta.type || delta.kind) === 'spirit')) return 'social';
            return 'resolved';
        })();
        return {
            mode: options.mode || plan.mode || plan.planMode || (app.combatState?.active ? 'combat' : 'adventure'),
            action: options.intent || options.action || plan.subAction || plan.intent || plan.action || 'action',
            subAction: options.subAction || plan.subAction || null,
            shape: options.shape || plan.shape || plan.distribution || '',
            actors: this.units(options.actors || plan.actors || plan.actor || []),
            targets: this.units(options.targets || plan.targets || plan.target || []),
            resultKind: options.resultKind || plan.resultKind || inferredResultKind,
            summary: options.summary || resultText || '',
            passage: options.passage || resultText || options.summary || '',
            deltas,
            tags,
            importance: options.importance || plan.importance || (deltas.some(delta => (delta.type || delta.kind) === 'state') ? 'major' : 'normal'),
            source: options.source || plan.source || 'interaction-result',
            subEvents: Array.isArray(options.subEvents) ? options.subEvents : []
        };
    },

    defaultSubEvents(app, ctx, renderedSummary = '') {
        if (Array.isArray(ctx.outcome.subEvents) && ctx.outcome.subEvents.length) return ctx.outcome.subEvents;
        if (ctx.targets.length <= 1) return [];
        return ctx.targets.map(target => ({
            targetId: target.id || target.name,
            targetName: target.name || app._label('target.targetRole', 'Target'),
            summary: renderedSummary
        }));
    },

    renderSceneBeat(app, plan = {}, outcomeInput = {}) {
        const outcome = outcomeInput && typeof outcomeInput === 'object' && !Array.isArray(outcomeInput)
            ? { ...this.normalizeOutcome(app, plan, '', outcomeInput), ...outcomeInput }
            : this.normalizeOutcome(app, plan, outcomeInput);
        const ctx = this.templateContext(app, plan, outcome);
        const template = this.selectTemplate(app, ctx);
        let rendered = null;
        if (template?.render) rendered = template.render(app, ctx) || null;
        const summary = this.renderTemplateText(app, rendered?.summary ?? template?.summary, ctx)
            || outcome.summary
            || ctx.defaultSummary;
        const passage = this.renderTemplateText(app, rendered?.passage ?? template?.passage, ctx)
            || outcome.passage
            || summary;
        return {
            mode: ctx.mode,
            action: ctx.action,
            subAction: ctx.subAction,
            shape: ctx.shape,
            actors: ctx.actors,
            targets: ctx.targets,
            resultKind: outcome.resultKind || 'resolved',
            summary,
            passage,
            deltas: Array.isArray(outcome.deltas) ? outcome.deltas : [],
            tags: ctx.tags,
            importance: outcome.importance || 'normal',
            source: outcome.source || plan.source || 'scene-template',
            subEvents: this.defaultSubEvents(app, ctx, summary),
            metadata: {
                ...(plan.metadata || {}),
                ...(outcome.metadata || {}),
                templateId: template?.id || 'fallback',
                sceneDsl: 'scene-beat-v1'
            }
        };
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
            type: input.type || 'scene-beat',
            mode: input.mode || (app.combatState?.active ? 'combat' : 'adventure'),
            action: input.action || intent,
            subAction: input.subAction || null,
            shape: input.shape || input.metadata?.shape || '',
            resultKind: input.resultKind || 'resolved',
            intent,
            intentLabel: this.intentLabel(app, intent),
            actors,
            targets,
            actorNames,
            targetNames,
            summary,
            passage,
            deltas: Array.isArray(input.deltas) ? input.deltas : [],
            tags: Array.isArray(input.tags) ? input.tags : [],
            importance: input.importance || 'normal',
            source: input.source || input.metadata?.source || 'scene-feed',
            subEvents: Array.isArray(input.subEvents) ? input.subEvents : [],
            metadata: input.metadata || {},
            location: input.location || this.locationLabel(app),
            time: input.time || app._timeLabel?.() || '',
            createdAt: app.storyEventSeq
        };
    },

    emitResult(app, commandOrPlan = {}, result = '', options = {}) {
        const command = commandOrPlan?.plan || commandOrPlan || {};
        const outcome = this.normalizeOutcome(app, command, result, options);
        return this.emit(app, this.renderSceneBeat(app, command, outcome));
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

    deltaLabel(app, delta) {
        if (typeof delta === 'string') return delta;
        if (!delta || typeof delta !== 'object') return String(delta || '');
        if (delta.label) return String(delta.label);
        const kind = delta.kind || delta.type || 'delta';
        if (kind === 'punishment' || kind === 'damage') return `${delta.amount ?? ''} punishment`.trim();
        if (kind === 'healing' || kind === 'heal') return `${delta.amount ?? ''} punishment restored`.trim();
        if (kind === 'spirit') return delta.max ? `Spirit ${delta.current}/${delta.max}` : 'Spirit changed';
        if (kind === 'state') return delta.state || 'State changed';
        return [kind, delta.amount, delta.unit].filter(Boolean).join(' ');
    },

    eventHtml(app, event) {
        const actors = event.actorNames?.length ? event.actorNames.join(', ') : app._label('target.actorRole', 'Actor');
        const targets = event.targetNames?.length ? event.targetNames.join(', ') : app._label('target.targetRole', 'Target');
        const deltas = event.deltas?.length
            ? `<ul class="story-deltas">${event.deltas.map(delta => `<li>${app._escapeHtml(this.deltaLabel(app, delta))}</li>`).join('')}</ul>`
            : '';
        const subEvents = event.subEvents?.length
            ? `<ul class="story-sub-events">${event.subEvents.map(subEvent => `<li>${app._escapeHtml(subEvent.summary || subEvent.targetName || '')}</li>`).join('')}</ul>`
            : '';
        return `<article class="story-event" data-story-intent="${app._escapeHtml(event.intent)}" data-story-mode="${app._escapeHtml(event.mode)}">`
            + `<div class="story-event-meta"><span>${app._escapeHtml(event.time)}</span><span>${app._escapeHtml(event.location)}</span><span>${app._escapeHtml(event.intentLabel)}</span></div>`
            + `<h3>${app._escapeHtml(actors)} -> ${app._escapeHtml(targets)}</h3>`
            + `<p>${app._escapeHtml(event.passage || event.summary)}</p>`
            + deltas
            + subEvents
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
        if (mobileLatest) {
            const combatOwnsMobileStory = Boolean(app.combatState?.active);
            mobileLatest.hidden = combatOwnsMobileStory;
            mobileLatest.innerHTML = combatOwnsMobileStory ? '' : latestHtml;
        }
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
