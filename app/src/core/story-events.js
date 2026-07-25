/**
 * YOU ARE WILD SCENE FEED
 * Deterministic semantic presentation layer for resolved actor-target-intent beats.
 *
 * The legacy YAW_STORY_EVENTS name is retained as a compatibility namespace.
 */

const YAW_STORY_EVENTS = {
    maxEvents: 60,
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
                const playerActs = ctx.actors.some(unit => unit === app.player
                    || (unit?.id && app.player?.id && String(unit.id) === String(app.player.id)));
                const summary = ctx.outcome.summary || (playerActs
                    ? app._label('scene.failure.player', 'You try to {action} {targets}, but it does not work.', {
                        action,
                        targets
                    })
                    : app._label('scene.failure.generic', '{actors} tries to {action} {targets}, but it does not work.', {
                        actors,
                        action,
                        targets
                    }));
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

    registerSceneTemplate(app, template = {}, options = {}) {
        if (!template || typeof template !== 'object') return false;
        if (!template.id && !template.action && !template.mode && typeof template.match !== 'function') return false;
        const owner = String(options.owner || template.owner || 'legacy-runtime').trim().slice(0, 160) || 'legacy-runtime';
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
            source: template.source || owner,
            owner
        };
        if (!Array.isArray(app.sceneTemplates)) app.sceneTemplates = [];
        app.sceneTemplates = app.sceneTemplates.filter(existing => existing.id !== normalized.id);
        app.sceneTemplates.push(normalized);
        return true;
    },

    unregisterSceneTemplate(app, templateId, owner = null) {
        if (!Array.isArray(app.sceneTemplates)) return false;
        const id = String(templateId || '');
        const expectedOwner = owner === null ? null : String(owner);
        const before = app.sceneTemplates.length;
        app.sceneTemplates = app.sceneTemplates.filter(template => template.id !== id || (expectedOwner !== null && template.owner !== expectedOwner));
        return app.sceneTemplates.length !== before;
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
            resultKind: outcome.resultKind || 'resolved',
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

    sameTileObservationVisit(first, second) {
        const isObservation = event => event?.source === 'tile-entry' || event?.tags?.includes?.('tile-entry');
        if (!isObservation(first) || !isObservation(second)) return false;
        const firstTile = first.metadata?.tile;
        const secondTile = second.metadata?.tile;
        const firstTime = String(first.time || '').trim();
        const secondTime = String(second.time || '').trim();
        return firstTile
            && secondTile
            && firstTime
            && firstTime === secondTime
            && Number(firstTile.x) === Number(secondTile.x)
            && Number(firstTile.y) === Number(secondTile.y);
    },

    canonicalNarrativeValue(value) {
        if (Array.isArray(value)) return value.map(item => this.canonicalNarrativeValue(item));
        if (!value || typeof value !== 'object') return value;
        return Object.keys(value).sort().reduce((result, key) => {
            const next = this.canonicalNarrativeValue(value[key]);
            if (next !== undefined) result[key] = next;
            return result;
        }, {});
    },

    narrativeFingerprint(value) {
        const text = JSON.stringify(this.canonicalNarrativeValue(value));
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
    },

    tileNarrativeDescriptor(app, tile = null, options = {}) {
        if (!tile || app.inInterior) return null;
        const creatures = app._tileCreatures?.(app.creatures?.length ? app.creatures : tile.creatures || []) || [];
        const normalizedCreatures = creatures.map(unit => {
            const serviceUnit = unit?.disposition === (app.DISPOSITION?.MERCHANT || 'merchant')
                || unit?.disposition === (app.DISPOSITION?.QUEST_GIVER || 'quest_giver')
                || Boolean(unit?.quest);
            const serviceAvailable = serviceUnit ? Boolean(app._isServiceAvailable?.(unit)) : null;
            return {
                id: String(unit?.id || unit?.name || ''),
                name: String(unit?.name || ''),
                species: String(unit?.species || ''),
                disposition: String(unit?.disposition || ''),
                corpse: Boolean(app._isCorpse?.(unit)),
                punishment: Number(unit?.CPun ?? 0),
                maxPunishment: Number(unit?.MPun ?? 0),
                hungerBand: Math.max(0, Math.min(4, Math.floor(Number(unit?.hunger || 0) / 25))),
                restrained: Boolean(unit?.restrained || unit?.isRestrained),
                serviceAvailable,
                questAvailable: Boolean(unit?.quest && serviceAvailable)
            };
        }).sort((first, second) => `${first.id}:${first.name}`.localeCompare(`${second.id}:${second.name}`));
        const normalizedItems = (Array.isArray(tile.items) ? tile.items : []).map(item => ({
            id: String(item?.id || ''),
            name: String(item?.name || item || ''),
            quantity: Math.max(1, Number(item?.quantity || item?.qty || 1))
        })).sort((first, second) => `${first.id}:${first.name}:${first.quantity}`.localeCompare(`${second.id}:${second.name}:${second.quantity}`));
        const policy = typeof CONTENT !== 'undefined' ? CONTENT.preferences || {} : {};
        const state = {
            version: 1,
            worldId: String(app.worldMeta?.worldId || 'world_default'),
            tile: {
                x: Number(tile.x ?? app.location?.x ?? 0),
                y: Number(tile.y ?? app.location?.y ?? 0),
                biome: String(tile.biome || ''),
                displayBiome: String(tile.displayBiome || ''),
                description: String(tile.description || ''),
                structure: String(tile.structure || ''),
                structureLooted: Boolean(tile.structureLooted),
                landmark: tile.hasLandmark ? String(tile.landmarkName || '') : '',
                resourceSearched: Boolean(tile.resourceSearched)
            },
            visitKind: options.wasExplored ? 'return' : 'arrival',
            dayPhase: app._isNight?.() ? 'night' : 'day',
            language: String(policy.language || 'en'),
            posture: policy.posture === 'mature' ? 'mature' : 'sfw',
            enabledCategories: Array.isArray(policy.enabledCategories) ? policy.enabledCategories.map(String).sort() : [],
            creatures: normalizedCreatures,
            items: normalizedItems
        };
        const tileKey = `${state.worldId}:${state.tile.x}:${state.tile.y}`;
        return { version: 1, tileKey, fingerprint: this.narrativeFingerprint(state), state };
    },

    ensureCurrentTileObservation(app) {
        if (!app || app.inInterior || app.combatState?.active) return null;
        const tile = app._currentExplorationTile?.() || app.getTile?.(app.location?.x || 0, app.location?.y || 0);
        if (!tile) return null;
        const latest = [...(app.storyEvents || [])].reverse().find(event => {
            const eventTile = event?.metadata?.tile;
            return (event?.source === 'tile-entry' || event?.tags?.includes?.('tile-entry'))
                && Number(eventTile?.x) === Number(tile.x)
                && Number(eventTile?.y) === Number(tile.y);
        });
        if (!latest) return null;
        const wasExplored = latest.metadata?.wasExplored !== false;
        const descriptor = this.tileNarrativeDescriptor(app, tile, { wasExplored });
        if (descriptor?.fingerprint === latest.metadata?.tileNarrativeState?.fingerprint) return null;
        return this.emitTileObservation(app, tile, { wasExplored, reason: 'tile-state-changed' });
    },

    coalescedEvents(events = []) {
        return events.reduce((result, event) => {
            const previous = result[result.length - 1];
            if (this.sameTileObservationVisit(previous, event)) result[result.length - 1] = event;
            else result.push(event);
            return result;
        }, []);
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
        const serviceAvailable = unit => Boolean(app._isServiceAvailable?.(unit));
        const details = [];
        const subEvents = [];
        if (tile.description) {
            details.push(String(tile.description));
            subEvents.push({ type: 'setting', summary: String(tile.description) });
        }
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
            const merchants = living.filter(unit => unit.disposition === app.DISPOSITION.MERCHANT && serviceAvailable(unit)).map(unit => unit.name);
            const questGivers = living.filter(unit => (unit.disposition === app.DISPOSITION.QUEST_GIVER || unit.quest) && serviceAvailable(unit)).map(unit => unit.name);
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
                type: unit.disposition === app.DISPOSITION.MERCHANT && serviceAvailable(unit) ? 'merchant' : (((unit.disposition === app.DISPOSITION.QUEST_GIVER || unit.quest) && serviceAvailable(unit)) ? 'quest-giver' : 'creature'),
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
        const tileNarrativeState = this.tileNarrativeDescriptor(app, tile, options);
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
                ...(living.some(unit => unit.disposition === app.DISPOSITION.MERCHANT && serviceAvailable(unit)) ? ['merchant', 'trade'] : []),
                ...(living.some(unit => (unit.disposition === app.DISPOSITION.QUEST_GIVER || unit.quest) && serviceAvailable(unit)) ? ['quest-giver', 'quest'] : []),
                ...(remains.length ? ['remains'] : []),
                ...(items.length ? ['items'] : [])
            ],
            metadata: {
                tile: { x: tile.x, y: tile.y, biome: tile.biome, place },
                wasExplored: Boolean(options.wasExplored),
                tileNarrativeState
            }
        };
    },

    emitTileObservation(app, tile = null, options = {}) {
        const observation = this.tileObservationData(app, tile, options);
        if (!observation) return null;
        const previous = app.storyEvents?.[app.storyEvents.length - 1];
        const visit = {
            source: 'tile-entry',
            tags: observation.tags,
            time: app._timeLabel?.() || '',
            metadata: observation.metadata
        };
        if (this.sameTileObservationVisit(previous, visit)) {
            const removed = app.storyEvents.pop();
            if (typeof YAW_NARRATION_SYSTEM !== 'undefined') YAW_NARRATION_SYSTEM.discardTarget?.(app, removed);
        }
        return this.emitResult(app, {
            exchangeId: app.transactionWindow?.exchangeId,
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
            exchangeId: app.transactionWindow?.exchangeId,
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
        const mode = input.mode || (app.combatState?.active ? 'combat' : 'adventure');
        const rawSummary = String(input.summary || input.result || '').trim();
        const summary = rawSummary || this.defaultSummary(app, actors, targets, intent);
        const passage = String(input.passage || summary).trim();
        const actorNames = this.unitNames(app, actors);
        const targetNames = this.unitNames(app, targets);
        app.storyEventSeq = (Number(app.storyEventSeq) || 0) + 1;
        const id = `story-${app.storyEventSeq}`;
        const metadata = { ...(input.metadata || {}) };
        const locationLabel = String(input.location || this.locationLabel(app));
        const timeLabel = String(input.time || app._timeLabel?.() || '');
        const combatRound = Number.isFinite(metadata.combatRound)
            ? metadata.combatRound
            : (mode === 'combat' && Number.isFinite(app.combatState?.round) ? app.combatState.round : null);
        const combatTurn = Number.isFinite(metadata.combatTurn)
            ? metadata.combatTurn
            : (mode === 'combat' && Number.isFinite(app.combatState?.currentTurn) ? app.combatState.currentTurn : null);
        const combatEncounter = String(metadata.combatEncounter || app.combatState?.sceneExchangeId || '');
        const combatExchangeId = combatRound !== null
            ? (combatEncounter ? `${combatEncounter}-round-${combatRound}` : `combat-round-${combatRound}`)
            : '';
        const exchangeId = String(input.exchangeId || metadata.exchangeId || combatExchangeId || id);
        if (combatRound !== null) metadata.combatRound = combatRound;
        if (combatTurn !== null) metadata.combatTurn = combatTurn;
        if (combatEncounter) metadata.combatEncounter = combatEncounter;
        metadata.exchangeId = exchangeId;
        const suppliedSnapshot = metadata.contextSnapshot && typeof metadata.contextSnapshot === 'object'
            ? metadata.contextSnapshot
            : {};
        const suppliedViewpoint = suppliedSnapshot.viewpoint && typeof suppliedSnapshot.viewpoint === 'object'
            ? suppliedSnapshot.viewpoint
            : {};
        const playerId = String(suppliedViewpoint.playerId || app.player?.id || app.player?.name || '').slice(0, 160);
        const playerName = String(suppliedViewpoint.playerName || app.player?.name || '').slice(0, 160);
        metadata.contextSnapshot = {
            version: 1,
            mode: String(suppliedSnapshot.mode || mode),
            location: {
                x: Number.isFinite(Number(suppliedSnapshot.location?.x)) ? Number(suppliedSnapshot.location.x) : Number(app.location?.x || 0),
                y: Number.isFinite(Number(suppliedSnapshot.location?.y)) ? Number(suppliedSnapshot.location.y) : Number(app.location?.y || 0),
                biome: String(suppliedSnapshot.location?.biome || app.currentBiome || ''),
                label: String(suppliedSnapshot.location?.label || locationLabel)
            },
            time: {
                hour: Number.isFinite(Number(suppliedSnapshot.time?.hour)) ? Number(suppliedSnapshot.time.hour) : Number(app.timeHour || 0),
                day: Number.isFinite(Number(suppliedSnapshot.time?.day)) ? Number(suppliedSnapshot.time.day) : Number(app.dayCount || 0),
                label: String(suppliedSnapshot.time?.label || timeLabel)
            },
            viewpoint: {
                mode: 'player',
                playerId,
                playerName
            }
        };
        return {
            id,
            type: input.type || 'scene-beat',
            mode,
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
            exchangeId,
            metadata,
            location: locationLabel,
            time: timeLabel,
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
        app.markAutoSaveDirty?.(['sceneFeed'], 'scene-feed');
        this.render(app);
        const announcer = document.getElementById?.('scene-feed-announcer');
        if (announcer) {
            announcer.textContent = event.summary;
            announcer.setAttribute('data-scene-beat-id', event.id);
        }
        if (typeof YAW_NARRATION_SYSTEM !== 'undefined') YAW_NARRATION_SYSTEM.onBeatCommitted(app, event);
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

    exchangeInfo(app, event) {
        const combatRound = Number(event?.metadata?.combatRound);
        const hasCombatRound = event?.mode === 'combat' && Number.isFinite(combatRound);
        return {
            id: String(event?.exchangeId || event?.metadata?.exchangeId || event?.id || ''),
            label: event?.metadata?.exchangeLabel || (hasCombatRound
                ? app._label('scene.exchange.round', 'Round {round}', { round: combatRound })
                : ''),
            isCombat: hasCombatRound
        };
    },

    exchangeGroups(app, events = []) {
        const groups = [];
        events.forEach(event => {
            const exchange = this.exchangeInfo(app, event);
            const current = groups[groups.length - 1];
            if (current?.id === exchange.id) {
                current.events.push(event);
                return;
            }
            groups.push({ ...exchange, events: [event] });
        });
        return groups.reverse().map(group => ({
            ...group,
            events: [...group.events].reverse()
        }));
    },

    exchangeEventCountLabel(app, count) {
        return count === 1
            ? app._label('scene.exchange.oneEvent', '1 event')
            : app._label('scene.exchange.eventCount', '{count} events', { count });
    },

    streamHtml(app, { limit = this.maxEvents } = {}) {
        const events = this.coalescedEvents(app.storyEvents || []).slice(-Math.max(1, limit));
        if (!events.length) {
            return `<div class="scene-beat-stream-empty">${this.compactHtml(app, null)}</div>`;
        }
        const latestId = events[events.length - 1]?.id;
        return this.exchangeGroups(app, events).map((group, groupIndex) => {
            const classes = ['scene-exchange-group'];
            if (groupIndex === 0) classes.push('latest');
            if (!group.label) classes.push('unlabeled');
            const header = group.label
                ? `<header class="scene-exchange-header"><strong>${app._escapeHtml(group.label)}</strong><span>${app._escapeHtml(this.exchangeEventCountLabel(app, group.events.length))}</span></header>`
                : '';
            const items = group.events.map(event => {
                const attrs = this.latestAttributes(app, event);
                const itemClasses = ['scene-beat-stream-item'];
                if (event.id === latestId) itemClasses.push('latest');
                return `<article class="${itemClasses.join(' ')}" data-scene-beat-id="${app._escapeHtml(attrs.id)}" data-scene-importance="${app._escapeHtml(attrs.importance)}" data-scene-result="${app._escapeHtml(attrs.result)}" data-has-scene-beat="true" aria-label="${app._escapeHtml(attrs.label)}">`
                    + this.compactHtml(app, event)
                    + (typeof YAW_NARRATION_SYSTEM !== 'undefined' ? YAW_NARRATION_SYSTEM.narrationHtml(app, 'beat', String(event.id)) : '')
                    + `</article>`;
            }).join('');
            const narration = typeof YAW_NARRATION_SYSTEM !== 'undefined' ? YAW_NARRATION_SYSTEM.narrationHtml(app, 'exchange', group.id) : '';
            const narrationReady = typeof YAW_NARRATION_SYSTEM !== 'undefined'
                && YAW_NARRATION_SYSTEM.hasReadyNarration(app, 'exchange', group.id);
            const sourceEvents = narrationReady
                ? `<details class="scene-exchange-source-events"><summary>${app._escapeHtml(app._label('scene.narration.sourceEvents', 'Events ({count})', { count: group.events.length }))}</summary><div class="scene-exchange-events">${items}</div></details>`
                : `<div class="scene-exchange-events">${items}</div>`;
            const content = narrationReady ? `${narration}${sourceEvents}` : `${sourceEvents}${narration}`;
            return `<section class="${classes.join(' ')}" data-scene-exchange-id="${app._escapeHtml(group.id)}">${header}${content}</section>`;
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
        const anchor = this.captureScrollAnchor(element);
        const previousId = element.getAttribute?.('data-scene-beat-id') || '';
        const attrs = this.latestAttributes(app, event);
        element.hidden = Boolean(hidden);
        element.innerHTML = hidden ? '' : html;
        element.setAttribute('data-scene-beat-id', attrs.id);
        element.setAttribute('data-scene-importance', attrs.importance);
        element.setAttribute('data-scene-result', attrs.result);
        element.setAttribute('data-has-scene-beat', attrs.hasBeat);
        element.setAttribute('aria-label', app._label('scene.exchange.feedLabel', 'Scene feed, newest exchanges first'));
        element.classList.toggle('scene-beat-highlight', Boolean(event) && !hidden);
        this.restoreScrollAnchor(element, anchor);
        this.bindStreamNavigation(app, element);
        if (anchor && previousId && previousId !== attrs.id) {
            const indicator = this.streamIndicator(element);
            if (indicator) indicator.dataset.pendingCount = String((Number(indicator.dataset.pendingCount) || 0) + 1);
        }
        this.refreshStreamIndicator(app, element);
    },

    streamScroller(element) {
        if (!element) return null;
        if (element.id === 'desktop-scene-feed-latest') return document.getElementById('desktop-scene-scroll');
        if (element.id === 'mobile-story-latest') return document.querySelector('#panel-main .panel-content');
        return null;
    },

    streamIndicator(element) {
        const id = element?.dataset?.sceneIndicatorId;
        return id ? document.getElementById(id) : null;
    },

    captureScrollAnchor(element) {
        const scroller = this.streamScroller(element);
        if (!scroller?.getBoundingClientRect || !element?.querySelectorAll) return null;
        const groups = Array.from(element.querySelectorAll('[data-scene-exchange-id]'));
        if (!groups.length) return null;
        const viewport = scroller.getBoundingClientRect();
        const firstRect = groups[0].getBoundingClientRect();
        if (firstRect.top >= viewport.top - 4) return null;
        const anchor = groups.find(group => group.getBoundingClientRect().bottom > viewport.top + 4);
        if (!anchor) return null;
        return {
            id: anchor.getAttribute('data-scene-exchange-id'),
            offset: anchor.getBoundingClientRect().top - viewport.top
        };
    },

    restoreScrollAnchor(element, anchor) {
        const scroller = this.streamScroller(element);
        if (!anchor || !scroller?.getBoundingClientRect || !element?.querySelectorAll) return;
        const match = Array.from(element.querySelectorAll('[data-scene-exchange-id]'))
            .find(group => group.getAttribute('data-scene-exchange-id') === anchor.id);
        if (!match) return;
        const viewport = scroller.getBoundingClientRect();
        const nextOffset = match.getBoundingClientRect().top - viewport.top;
        scroller.scrollTop += nextOffset - anchor.offset;
    },

    latestBeatVisible(element) {
        const scroller = this.streamScroller(element);
        const latest = element?.querySelector?.('.scene-exchange-group.latest');
        if (!scroller?.getBoundingClientRect || !latest?.getBoundingClientRect) return true;
        const viewport = scroller.getBoundingClientRect();
        const rect = latest.getBoundingClientRect();
        return rect.top >= viewport.top - 4 && rect.bottom <= viewport.bottom + 4;
    },

    refreshStreamIndicator(app, element) {
        const indicator = this.streamIndicator(element);
        if (!indicator) return;
        const pending = Number(indicator.dataset.pendingCount) || 0;
        const visible = this.latestBeatVisible(element);
        if (visible) indicator.dataset.pendingCount = '0';
        const count = visible ? 0 : pending;
        indicator.hidden = !app.latestStoryEvent || count <= 0;
        if (count > 0) {
            const label = app._label('scene.exchange.newEvents', '{count} new', { count });
            indicator.textContent = label;
            indicator.title = app._label('scene.exchange.jumpNewest', 'Jump to newest scene beat');
            indicator.setAttribute('aria-label', `${indicator.title}. ${label}`);
        }
    },

    bindStreamNavigation(app, element) {
        const indicator = this.streamIndicator(element);
        const scroller = this.streamScroller(element);
        if (!indicator || !scroller || indicator.dataset.bound === 'true') return;
        indicator.dataset.bound = 'true';
        indicator.addEventListener('click', () => {
            const latest = element.querySelector?.('.scene-exchange-group.latest');
            latest?.scrollIntoView?.({
                block: 'nearest',
                behavior: document.body.classList.contains('reduced-motion') ? 'auto' : 'smooth'
            });
            indicator.dataset.pendingCount = '0';
            indicator.hidden = true;
        });
        scroller.addEventListener('scroll', () => this.refreshStreamIndicator(app, element), { passive: true });
    },

    deltaLabel(app, delta) {
        if (typeof delta === 'string') return delta;
        if (!delta || typeof delta !== 'object') return String(delta || '');
        if (delta.label) return String(delta.label);
        const kind = delta.kind || delta.type || 'delta';
        if (kind === 'punishment' || kind === 'damage') return app._label('scene.delta.punishment', '{amount} punishment', { amount: delta.amount ?? '' }).trim();
        if (kind === 'healing' || kind === 'heal') return app._label('scene.delta.healing', '{amount} punishment restored', { amount: delta.amount ?? '' }).trim();
        if (kind === 'spirit') return delta.max
            ? app._label('scene.delta.spirit', 'Spirit {current}/{max}', { current: delta.current ?? '', max: delta.max })
            : app._label('scene.delta.spiritChanged', 'Spirit changed');
        if (kind === 'state') return delta.state || app._label('scene.delta.stateChanged', 'State changed');
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
            + (typeof YAW_NARRATION_SYSTEM !== 'undefined' ? YAW_NARRATION_SYSTEM.narrationHtml(app, 'beat', String(event.id), { detailed: true }) : '')
            + `</article>`;
    },

    listHtml(app) {
        const events = this.coalescedEvents(app.storyEvents || []).slice(-this.maxEvents);
        if (!events.length) {
            return `<div class="story-empty">${app._escapeHtml(app._label('scene.noEvents', 'No scene beats yet. Resolve an interaction to begin the scene feed.'))}</div>`;
        }
        return this.exchangeGroups(app, events).map(group => {
            const header = group.label
                ? `<header class="story-event-group-header"><h3>${app._escapeHtml(group.label)}</h3><span>${app._escapeHtml(this.exchangeEventCountLabel(app, group.events.length))}</span></header>`
                : '';
            const narration = typeof YAW_NARRATION_SYSTEM !== 'undefined' ? YAW_NARRATION_SYSTEM.narrationHtml(app, 'exchange', group.id, { detailed: true }) : '';
            const narrationReady = typeof YAW_NARRATION_SYSTEM !== 'undefined'
                && YAW_NARRATION_SYSTEM.hasReadyNarration(app, 'exchange', group.id);
            const items = group.events.map(event => this.eventHtml(app, event)).join('');
            const sourceEvents = narrationReady
                ? `<details class="scene-exchange-source-events detailed"><summary>${app._escapeHtml(app._label('scene.narration.sourceEvents', 'Events ({count})', { count: group.events.length }))}</summary>${items}</details>`
                : items;
            const content = narrationReady ? `${narration}${sourceEvents}` : `${sourceEvents}${narration}`;
            return `<section class="story-event-group${group.label ? '' : ' unlabeled'}" data-scene-exchange-id="${app._escapeHtml(group.id)}">${header}${content}</section>`;
        }).join('');
    },

    render(app) {
        const latest = app.latestStoryEvent || (app.storyEvents || [])[app.storyEvents?.length - 1] || null;
        const latestHtml = this.compactHtml(app, latest);
        const streamHtml = this.streamHtml(app, { limit: this.maxEvents });
        const mobileLatest = document.getElementById('mobile-story-latest');
        if (mobileLatest) {
            this.applyStreamElement(app, mobileLatest, latest, streamHtml);
        }
        const desktopSceneLatest = document.getElementById('desktop-scene-feed-latest');
        if (desktopSceneLatest) this.applyStreamElement(app, desktopSceneLatest, latest, streamHtml);
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
        this.setUnderlyingInert(false);
        app._restoreFocusTrap?.();
        document.getElementById('app')?.classList?.remove('story-sheet-open');
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_STORY_EVENTS = YAW_STORY_EVENTS;
}
