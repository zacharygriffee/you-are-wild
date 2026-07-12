/**
 * YOU ARE WILD SCENE FEED
 * Deterministic semantic presentation layer for resolved actor-target-intent beats.
 *
 * The legacy YAW_STORY_EVENTS name is retained as a compatibility namespace.
 */

const YAW_STORY_EVENTS = {
    maxEvents: 18,
    builtInTemplates: [],

    currentContentTier() {
        const tier = Number((typeof CONTENT !== 'undefined' ? CONTENT?.preferences?.maxTier : 0) ?? 0);
        return Number.isFinite(tier) ? tier : 0;
    },

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
        return app._label('scene.defaultSummary', app._label('story.defaultSummary', '{actors} -> {targets}: {intent}.'), {
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
        const failureBeat = (id, match, priority = 30) => ({
            id,
            priority,
            match,
            render: (app, ctx) => {
                const actors = ctx.actorNames.join(', ') || app._label('target.actorRole', 'Actor');
                const targets = ctx.targetNames.join(', ') || app._label('target.targetRole', 'Target');
                const action = this.intentLabel(app, ctx.action);
                const summary = ctx.outcome.summary || app._label('scene.failure.generic', '{actors} tries {action} on {targets}, but it does not work.', {
                    actors,
                    action,
                    targets
                });
                return {
                    summary,
                    passage: ctx.outcome.passage || summary
                };
            }
        });
        this.builtInTemplates = [
            resultFirst('adventure.tileObservation', ctx => ctx.tags.includes('tile-entry') && ctx.tags.includes('observation'), 60),
            resultFirst('adventure.recruitAvailable', ctx => ctx.tags.includes('recruit-available'), 55),
            failureBeat('adventure.recruitBlocked', ctx => ctx.actionBase === 'recruit' && ctx.resultKind === 'failure', 50),
            resultFirst('adventure.transaction', ctx => ctx.tags.includes('transaction'), 52),
            resultFirst('adventure.quest', ctx => ctx.actionBase === 'quest' || ctx.tags.includes('quest'), 35),
            resultFirst('adventure.trade', ctx => ctx.actionBase === 'trade' || ctx.tags.includes('trade'), 35),
            failureBeat('combat.failure.cannotReach', ctx => ctx.mode === 'combat' && ctx.resultKind === 'failure' && ctx.tags.includes('cannot-reach'), 50),
            failureBeat('combat.failure.invalid', ctx => ctx.mode === 'combat' && ctx.resultKind === 'failure', 40),
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
            contentTier: Number.isFinite(template.contentTier) ? template.contentTier : null,
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
            contentTier: outcome.contentTier ?? this.currentContentTier(),
            tags: [...new Set([...(Array.isArray(plan.tags) ? plan.tags : []), ...(Array.isArray(outcome.tags) ? outcome.tags : [])].map(String))]
        };
    },

    templateMatches(app, template, ctx) {
        const tier = Number(ctx.contentTier ?? this.currentContentTier());
        if (Number.isFinite(template.contentTier) && tier !== template.contentTier) return false;
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
        if (/may be willing to join the party|ready to follow|ready to join/i.test(resultText)) tags.push('recruit-available');
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
            contentTier: Number.isFinite(options.contentTier) ? options.contentTier : (Number.isFinite(plan.contentTier) ? plan.contentTier : this.currentContentTier()),
            source: options.source || plan.source || 'interaction-result',
            subEvents: Array.isArray(options.subEvents) ? options.subEvents : []
        };
    },

    listNames(app, names = [], limit = 3) {
        const clean = names.filter(Boolean).map(String);
        if (clean.length <= limit) return clean.join(', ');
        return app._label('scene.listWithMore', '{items}, and {count} more', {
            items: clean.slice(0, limit).join(', '),
            count: clean.length - limit
        });
    },

    tileObservationData(app, tile = null, options = {}) {
        if (!tile) return null;
        const biome = app.biomes?.[tile.displayBiome || tile.biome] || app.biomes?.[tile.biome] || {};
        const place = tile.structure
            ? (app.STRUCTURES?.[tile.structure]?.name || tile.structure)
            : (tile.landmarkName || biome.name || app._label('ui.exploration', 'the area'));
        const living = (app._tileCreatures?.(app.creatures?.length ? app.creatures : tile.creatures || []) || [])
            .filter(unit => unit && !app._isCorpse?.(unit) && (unit.CPun ?? 1) > 0);
        const remains = (app._tileCreatures?.(app.creatures?.length ? app.creatures : tile.creatures || []) || [])
            .filter(unit => unit && app._isCorpse?.(unit));
        const items = Array.isArray(tile.items) ? tile.items : [];
        const details = [];
        const subEvents = [];
        if (tile.hasLandmark && tile.landmarkName) {
            details.push(app._label('scene.observe.landmark', '{name} stands out here.', { name: tile.landmarkName }));
            subEvents.push({ type: 'landmark', summary: tile.landmarkName });
        }
        if (tile.structure) {
            const structName = app.STRUCTURES?.[tile.structure]?.name || tile.structure;
            details.push(app._label('scene.observe.structure', 'There is a {name} here.', { name: structName }));
            subEvents.push({ type: 'structure', summary: structName });
        }
        if (living.length) {
            const names = this.listNames(app, living.map(unit => unit.name));
            const hungry = living.filter(unit => (unit.hunger || 0) >= 60).map(unit => unit.name);
            const merchants = living.filter(unit => unit.disposition === app.DISPOSITION.MERCHANT).map(unit => unit.name);
            const questGivers = living.filter(unit => unit.disposition === app.DISPOSITION.QUEST_GIVER || unit.quest).map(unit => unit.name);
            const creatureText = hungry.length
                ? app._label('scene.observe.creaturesHungry', 'You notice {names}; {hungry} looks hungry.', {
                    names,
                    hungry: this.listNames(app, hungry, 2)
                })
                : app._label('scene.observe.creatures', 'You notice {names} nearby.', { names });
            details.push(creatureText);
            if (merchants.length) {
                details.push(app._label('scene.observe.merchants', '{names} can trade with you here.', {
                    names: this.listNames(app, merchants, 2)
                }));
            }
            if (questGivers.length) {
                details.push(app._label('scene.observe.questGivers', '{names} may have work for you.', {
                    names: this.listNames(app, questGivers, 2)
                }));
            }
            living.forEach(unit => subEvents.push({
                type: unit.disposition === app.DISPOSITION.MERCHANT ? 'merchant' : ((unit.disposition === app.DISPOSITION.QUEST_GIVER || unit.quest) ? 'quest-giver' : 'creature'),
                targetId: unit.id || unit.name,
                targetName: unit.name,
                summary: unit.name
            }));
        }
        if (remains.length) {
            details.push(app._label('scene.observe.remains', 'Remains are visible: {names}.', {
                names: this.listNames(app, remains.map(unit => unit.corpseName || unit.name))
            }));
            remains.forEach(unit => subEvents.push({ type: 'remains', targetId: unit.id || unit.name, targetName: unit.corpseName || unit.name, summary: unit.corpseName || unit.name }));
        }
        if (items.length) {
            const itemNames = items.map(item => item?.name || String(item));
            details.push(app._label('scene.observe.items', 'You spot items here: {items}.', { items: this.listNames(app, itemNames) }));
            itemNames.forEach(name => subEvents.push({ type: 'item', summary: name }));
        }
        if (!details.length) return null;
        const intro = options.wasExplored
            ? app._label('scene.observe.return', 'You return to {place}.', { place })
            : app._label('scene.observe.enter', 'You enter {place}.', { place });
        return {
            place,
            summary: `${intro} ${details.join(' ')}`.trim(),
            passage: `${intro} ${details.join(' ')}`.trim(),
            targets: living,
            subEvents,
            tags: [
                'tile-entry',
                'observation',
                ...(tile.hasLandmark ? ['landmark'] : []),
                ...(tile.structure ? ['structure'] : []),
                ...(living.length ? ['creatures'] : []),
                ...(living.some(unit => unit.disposition === app.DISPOSITION.MERCHANT) ? ['merchant', 'trade'] : []),
                ...(living.some(unit => unit.disposition === app.DISPOSITION.QUEST_GIVER || unit.quest) ? ['quest-giver', 'quest'] : []),
                ...(remains.length ? ['remains'] : []),
                ...(items.length ? ['items'] : [])
            ],
            metadata: {
                tile: { x: tile.x, y: tile.y, biome: tile.biome, place },
                wasExplored: Boolean(options.wasExplored)
            }
        };
    },

    emitTileObservation(app, tile = null, options = {}) {
        const observation = this.tileObservationData(app, tile, options);
        if (!observation) return null;
        return this.emitResult(app, {
            mode: 'adventure',
            action: 'observe',
            shape: 'tile-entry',
            actors: [app.player].filter(Boolean),
            targets: observation.targets,
            tags: observation.tags,
            metadata: observation.metadata,
            source: 'tile-entry'
        }, observation.summary, {
            mode: 'adventure',
            resultKind: 'observation',
            importance: observation.tags.includes('creatures') || observation.tags.includes('landmark') ? 'notable' : 'normal',
            summary: observation.summary,
            passage: observation.passage,
            tags: observation.tags,
            subEvents: observation.subEvents,
            source: 'tile-entry',
            metadata: observation.metadata
        });
    },

    transactionMessage(app, npc, kind = 'trade', phase = 'opened', detail = {}) {
        const name = npc?.name || app._label('target.targetRole', 'Target');
        const itemName = detail.itemName || detail.name || '';
        const price = Number(detail.price || 0);
        const title = detail.title || detail.questTitle || '';
        if (kind === 'quest') {
            if (phase === 'accepted') return app._label('scene.quest.accepted', 'You accept {title} from {name}.', { title, name });
            if (phase === 'turned-in') return app._label('scene.quest.turnedIn', 'You turn in {title}.', { title, name });
            if (phase === 'blocked') return app._label('scene.quest.blocked', '{name} has no quest ready for you right now.', { name });
            return app._label('scene.quest.opened', '{name} lays out the work available here.', { name });
        }
        if (phase === 'bought') return app._label('scene.trade.bought', 'You buy {item} from {name} for {price} gold.', { item: itemName, name, price });
        if (phase === 'sold') return app._label('scene.trade.sold', 'You sell {item} to {name} for {price} gold.', { item: itemName, name, price });
        if (phase === 'blocked') return app._label('scene.trade.blocked', '{name} cannot complete that trade right now.', { name });
        return app._label('scene.trade.opened', '{name} shows what is for sale and what they will buy.', { name });
    },

    emitTransactionBeat(app, npc, kind = 'trade', phase = 'opened', detail = {}) {
        if (!npc) return null;
        const text = this.transactionMessage(app, npc, kind, phase, detail);
        const action = kind === 'quest' ? 'quest' : 'trade';
        const deltas = [];
        if (Number.isFinite(Number(detail.goldDelta)) && Number(detail.goldDelta) !== 0) {
            deltas.push({ type: 'gold', amount: Number(detail.goldDelta) });
        }
        if (detail.itemName || detail.name) {
            deltas.push({ type: 'item', name: detail.itemName || detail.name });
        }
        return this.emitResult(app, {
            mode: 'adventure',
            action,
            actors: [app.player].filter(Boolean),
            targets: [npc],
            tags: ['transaction', action, `${action}-${phase}`, phase].filter(Boolean),
            source: 'transaction',
            metadata: { phase, itemName: detail.itemName || detail.name || null, questTitle: detail.title || detail.questTitle || null }
        }, text, {
            mode: 'adventure',
            resultKind: phase === 'blocked' ? 'failure' : 'observation',
            importance: phase === 'opened' ? 'normal' : 'notable',
            tags: ['transaction', action, `${action}-${phase}`, phase].filter(Boolean),
            source: 'transaction',
            deltas,
            metadata: { phase, ...detail }
        });
    },

    recruitmentMessage(app, target, kind = 'blocked', reason = '') {
        const name = target?.name || app._label('target.targetRole', 'Target');
        if (kind === 'available') {
            return app._label('scene.recruit.available', '{name} looks ready to join you.', { name });
        }
        if (kind === 'joined') {
            return app._label('scene.recruit.joined', '{name} joins your party.', { name });
        }
        if (reason === 'party-full') {
            return app._label('scene.recruit.partyFull', '{name} seems willing, but your party is full.', { name });
        }
        if (reason === 'role-bound') {
            return app._label('scene.recruit.roleBound', '{name} has duties here and is not ready to leave.', { name });
        }
        return app._label('scene.recruit.notReady', '{name} is not ready to join you yet.', { name });
    },

    emitRecruitmentBeat(app, target, actor = app.player, kind = 'blocked', reason = '') {
        if (!target) return null;
        const text = this.recruitmentMessage(app, target, kind, reason);
        return this.emitResult(app, {
            mode: 'adventure',
            action: 'recruit',
            actors: [actor || app.player].filter(Boolean),
            targets: [target],
            tags: ['recruit', kind === 'available' ? 'recruit-available' : `recruit-${kind}`, reason].filter(Boolean),
            source: 'recruitment'
        }, text, {
            mode: 'adventure',
            resultKind: kind === 'blocked' ? 'failure' : 'social',
            importance: kind === 'blocked' ? 'hint' : 'notable',
            tags: ['recruit', kind === 'available' ? 'recruit-available' : `recruit-${kind}`, reason].filter(Boolean),
            source: 'recruitment'
        });
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
            contentTier: outcome.contentTier ?? ctx.contentTier ?? this.currentContentTier(),
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
            contentTier: Number.isFinite(input.contentTier) ? input.contentTier : this.currentContentTier(),
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

    emitSceneBeat(app, commandOrPlan = {}, result = '', options = {}) {
        return this.emitResult(app, commandOrPlan, result, options);
    },

    emit(app, input = {}) {
        const event = this.normalize(app, input);
        if (!Array.isArray(app.storyEvents)) app.storyEvents = [];
        app.storyEvents.push(event);
        if (app.storyEvents.length > this.maxEvents) app.storyEvents = app.storyEvents.slice(-this.maxEvents);
        app.latestStoryEvent = event;
        app.sceneEvents = app.storyEvents;
        app.latestSceneBeat = event;
        this.render(app);
        return event;
    },

    compactHtml(app, event = null) {
        if (!event) {
            return `<span class="story-empty">${app._escapeHtml(app._label('scene.empty', 'Scene beats will appear here after interactions.'))}</span>`;
        }
        const actors = event.actorNames?.length ? `<span class="story-actors">${app._escapeHtml(event.actorNames.join(', '))}</span>` : '';
        const targets = event.targetNames?.length ? `<span class="story-targets">${app._escapeHtml(event.targetNames.join(', '))}</span>` : '';
        const arrow = actors && targets ? '<span class="story-arrow" aria-hidden="true">-></span>' : '';
        const meta = [actors || '', arrow, targets || '', `<span class="story-intent">${app._escapeHtml(event.intentLabel)}</span>`].filter(Boolean).join('');
        return `<span class="story-latest-line"><span class="story-summary">${app._escapeHtml(event.summary)}</span><span class="story-meta-line">${meta}</span></span>`;
    },

    streamHtml(app, { limit = 5 } = {}) {
        const events = (app.storyEvents || []).slice(-Math.max(1, limit)).reverse();
        if (!events.length) {
            return `<div class="scene-beat-stream-empty">${this.compactHtml(app, null)}</div>`;
        }
        return events.map((event, index) => {
            const attrs = this.latestAttributes(app, event);
            const classes = ['scene-beat-stream-item'];
            if (index === 0) classes.push('latest');
            return `<article class="${classes.join(' ')}" data-scene-beat-id="${app._escapeHtml(attrs.id)}" data-scene-importance="${app._escapeHtml(attrs.importance)}" data-scene-result="${app._escapeHtml(attrs.result)}" data-has-scene-beat="true" aria-label="${app._escapeHtml(attrs.label)}">`
                + this.compactHtml(app, event)
                + `</article>`;
        }).join('');
    },

    latestAttributes(app, event = null) {
        const id = event?.id || '';
        const importance = event?.importance || 'empty';
        const result = event?.resultKind || 'empty';
        return {
            id,
            importance,
            result,
            hasBeat: event ? 'true' : 'false',
            label: event?.summary || app._label('scene.empty', 'Scene beats will appear here after interactions.')
        };
    },

    applyLatestElement(app, element, event, html, { hidden = false } = {}) {
        if (!element) return;
        const attrs = this.latestAttributes(app, event);
        element.hidden = Boolean(hidden);
        element.innerHTML = hidden ? '' : html;
        element.setAttribute('data-scene-beat-id', attrs.id);
        element.setAttribute('data-scene-importance', attrs.importance);
        element.setAttribute('data-scene-result', attrs.result);
        element.setAttribute('data-has-scene-beat', attrs.hasBeat);
        element.setAttribute('aria-label', attrs.label);
        element.classList.toggle('scene-beat-highlight', Boolean(event) && !hidden);
    },

    applyStreamElement(app, element, event, html, { hidden = false } = {}) {
        if (!element) return;
        const attrs = this.latestAttributes(app, event);
        element.hidden = Boolean(hidden);
        element.innerHTML = hidden ? '' : html;
        element.setAttribute('data-scene-beat-id', attrs.id);
        element.setAttribute('data-scene-importance', attrs.importance);
        element.setAttribute('data-scene-result', attrs.result);
        element.setAttribute('data-has-scene-beat', attrs.hasBeat);
        element.setAttribute('aria-label', attrs.label);
        element.classList.toggle('scene-beat-highlight', Boolean(event) && !hidden);
    },

    bindMobileNewBeatIndicator(app) {
        const indicator = document.getElementById('mobile-new-beat-indicator');
        const scroller = document.querySelector('#panel-main .panel-content');
        if (!indicator || !scroller || indicator.dataset.bound === 'true') return;
        indicator.dataset.bound = 'true';
        const update = () => {
            const hasBeat = Boolean(app.latestStoryEvent);
            indicator.hidden = !hasBeat || scroller.scrollTop <= 24;
        };
        indicator.addEventListener('click', () => {
            const feed = document.getElementById('mobile-story-latest');
            if (feed) {
                feed.scrollIntoView({ block: 'start', behavior: document.body.classList.contains('reduced-motion') ? 'auto' : 'smooth' });
            } else {
                scroller.scrollTop = 0;
            }
            indicator.hidden = true;
        });
        scroller.addEventListener('scroll', update, { passive: true });
        update();
    },

    updateMobileNewBeatIndicator(app) {
        const indicator = document.getElementById('mobile-new-beat-indicator');
        const scroller = document.querySelector('#panel-main .panel-content');
        if (!indicator || !scroller) return;
        this.bindMobileNewBeatIndicator(app);
        indicator.hidden = !app.latestStoryEvent || scroller.scrollTop <= 24;
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
        const passage = String(event.passage || '').trim();
        const summary = String(event.summary || passage || '').trim();
        const tagText = (Array.isArray(event.tags) ? event.tags : []).filter(Boolean).slice(0, 8).join(', ');
        const detailMeta = [
            [app._label('scene.meta.result', 'Result'), event.resultKind],
            [app._label('scene.meta.mode', 'Mode'), event.mode],
            [app._label('scene.meta.source', 'Source'), event.source],
            [app._label('scene.meta.importance', 'Importance'), event.importance],
            [app._label('scene.meta.tier', 'Tier'), String(event.contentTier ?? this.currentContentTier())],
            tagText ? [app._label('scene.meta.tags', 'Tags'), tagText] : null
        ].filter(entry => entry && entry[1]);
        const passageHtml = passage && passage !== summary
            ? `<p>${app._escapeHtml(passage)}</p>`
            : '';
        const deltas = event.deltas?.length
            ? `<ul class="story-deltas">${event.deltas.map(delta => `<li>${app._escapeHtml(this.deltaLabel(app, delta))}</li>`).join('')}</ul>`
            : '';
        const subEvents = event.subEvents?.length
            ? `<ul class="story-sub-events">${event.subEvents.map(subEvent => `<li>${app._escapeHtml(subEvent.summary || subEvent.targetName || '')}</li>`).join('')}</ul>`
            : '';
        const detailMetaHtml = detailMeta.length
            ? `<div class="story-event-detail-meta">${detailMeta.map(([label, value]) => `<span><strong>${app._escapeHtml(label)}:</strong> ${app._escapeHtml(String(value))}</span>`).join('')}</div>`
            : '';
        return `<article class="story-event" data-story-intent="${app._escapeHtml(event.intent)}" data-story-mode="${app._escapeHtml(event.mode)}">`
            + `<h3>${app._escapeHtml(summary || this.defaultSummary(app, event.actors, event.targets, event.intent))}</h3>`
            + passageHtml
            + `<div class="story-event-meta"><span>${app._escapeHtml(event.time)}</span><span>${app._escapeHtml(event.location)}</span><span>${app._escapeHtml(event.intentLabel)}</span><span>${app._escapeHtml(actors)} -> ${app._escapeHtml(targets)}</span></div>`
            + detailMetaHtml
            + deltas
            + subEvents
            + `</article>`;
    },

    listHtml(app) {
        const events = (app.storyEvents || []).slice(-this.maxEvents).reverse();
        if (!events.length) {
            return `<div class="story-empty">${app._escapeHtml(app._label('scene.noEvents', 'No scene beats yet. Resolve an interaction to begin the scene feed.'))}</div>`;
        }
        return events.map(event => this.eventHtml(app, event)).join('');
    },

    render(app) {
        const latest = app.latestStoryEvent || (app.storyEvents || [])[app.storyEvents?.length - 1] || null;
        const latestHtml = this.compactHtml(app, latest);
        const streamHtml = this.streamHtml(app, { limit: 5 });
        const mobileLatest = document.getElementById('mobile-story-latest');
        if (mobileLatest) {
            this.applyStreamElement(app, mobileLatest, latest, streamHtml);
        }
        this.updateMobileNewBeatIndicator(app);
        const desktopSceneLatest = document.getElementById('desktop-scene-feed-latest');
        if (desktopSceneLatest) this.applyLatestElement(app, desktopSceneLatest, latest, latestHtml);
        document.querySelectorAll?.('.desktop-combat-story-latest, .mobile-combat-story-latest').forEach(el => {
            this.applyLatestElement(app, el, latest, latestHtml);
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
