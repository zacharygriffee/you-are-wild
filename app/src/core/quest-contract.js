/**
 * YOU ARE WILD QUEST CONTRACT V2
 * Canonical lifecycle and bounded completion-policy rules.
 */

const YAW_QUEST_CONTRACT = {
    VERSION: 2,
    STATES: Object.freeze({
        AVAILABLE: 'available',
        ACTIVE: 'active',
        OBJECTIVES_COMPLETE: 'objectives_complete',
        READY_FOR_TURN_IN: 'ready_for_turn_in',
        TURNED_IN: 'turned_in',
        FAILED: 'failed'
    }),
    POLICIES: Object.freeze({
        AUTOMATIC: 'automatic',
        ORIGINAL_GIVER: 'original_giver',
        NAMED_LOCATION: 'named_location',
        AUTHORIZED_FACTION: 'authorized_faction'
    }),

    normalizeLocation(value = null) {
        if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return null;
        return {
            x: Number(value.x),
            y: Number(value.y),
            ...(value.label ? { label: String(value.label) } : {})
        };
    },

    normalizePolicy(source = {}, giver = null) {
        const raw = source.turnInPolicy;
        const requested = typeof raw === 'string' ? { type: raw } : (raw && typeof raw === 'object' ? raw : {});
        const type = requested.type
            || (source.turnInRequired || source.rewardOnTurnIn ? this.POLICIES.ORIGINAL_GIVER : this.POLICIES.AUTOMATIC);
        if (!Object.values(this.POLICIES).includes(type)) throw new Error(`Unsupported quest turn-in policy: ${type}`);
        const policy = { type };
        if (type === this.POLICIES.ORIGINAL_GIVER) {
            policy.giverId = String(requested.giverId || source.giverId || giver?.id || giver?.name || '');
        }
        if (type === this.POLICIES.NAMED_LOCATION) {
            const location = this.normalizeLocation(requested.location || source.destination || source.turnInLocation);
            if (!location) throw new Error('Named-location quest policy requires a finite location');
            policy.location = location;
        }
        if (type === this.POLICIES.AUTHORIZED_FACTION) {
            const faction = String(requested.faction || source.authorizedFaction || '').trim();
            if (!faction) throw new Error('Authorized-faction quest policy requires a faction');
            policy.faction = faction;
        }
        return policy;
    },

    objectivesComplete(quest) {
        return Array.isArray(quest?.objectives) && quest.objectives.length > 0 && quest.objectives.every(objective => objective.complete);
    },

    stateFromLegacy(source = {}, policy = this.normalizePolicy(source)) {
        if (Object.values(this.STATES).includes(source.lifecycleState)) return source.lifecycleState;
        if (source.status === 'failed') return this.STATES.FAILED;
        if (source.rewardClaimed) return this.STATES.TURNED_IN;
        if (source.status === 'completed') {
            return policy.type === this.POLICIES.AUTOMATIC
                ? this.STATES.OBJECTIVES_COMPLETE
                : this.STATES.READY_FOR_TURN_IN;
        }
        if (source.status === 'active') return this.STATES.ACTIVE;
        return this.STATES.AVAILABLE;
    },

    legacyStatus(state) {
        if (state === this.STATES.AVAILABLE) return 'available';
        if (state === this.STATES.ACTIVE) return 'active';
        if (state === this.STATES.FAILED) return 'failed';
        return 'completed';
    },

    sync(quest, state = quest?.lifecycleState) {
        if (!quest) return quest;
        const next = Object.values(this.STATES).includes(state) ? state : this.STATES.AVAILABLE;
        quest.lifecycleState = next;
        quest.status = this.legacyStatus(next);
        quest.turnInRequired = quest.turnInPolicy?.type !== this.POLICIES.AUTOMATIC;
        quest.rewardClaimed = next === this.STATES.TURNED_IN || Boolean(quest.rewardClaimed);
        return quest;
    },

    normalizeMetadata(source = {}, giver = null) {
        const turnInPolicy = this.normalizePolicy(source, giver);
        const destination = this.normalizeLocation(source.destination);
        const authoredOrigin = source.authoredOrigin && typeof source.authoredOrigin === 'object'
            ? { ...source.authoredOrigin }
            : {
                kind: source.templateId ? 'template' : 'authored',
                ...(source.templateId ? { templateId: source.templateId } : {})
            };
        return {
            contractVersion: this.VERSION,
            lifecycleState: this.stateFromLegacy(source, turnInPolicy),
            turnInPolicy,
            authoredOrigin,
            ...(destination ? { destination } : {}),
            branch: source.branch || null,
            stage: Math.max(0, Math.floor(Number(source.stage) || 0)),
            giverServiceSuspended: Boolean(source.giverServiceSuspended || giver?.serviceSuspended)
        };
    },

    assertSerializableData(value, label = 'Quest data', seen = new WeakSet()) {
        if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) throw new Error(`${label} must use finite numbers`);
            return true;
        }
        if (value === undefined || ['function', 'symbol', 'bigint'].includes(typeof value)) {
            throw new Error(`${label} must be serializable data`);
        }
        if (typeof value !== 'object') throw new Error(`${label} must be serializable data`);
        if (seen.has(value)) throw new Error(`${label} must not contain circular references`);
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) {
            throw new Error(`${label} must use plain objects and arrays`);
        }
        seen.add(value);
        if (Array.isArray(value)) {
            value.forEach((entry, index) => this.assertSerializableData(entry, `${label}[${index}]`, seen));
        } else {
            for (const [key, entry] of Object.entries(value)) {
                this.assertSerializableData(entry, `${label}.${key}`, seen);
            }
        }
        seen.delete(value);
        return true;
    },

    normalizeStageGraph(graph = null) {
        if (graph == null) return null;
        this.assertSerializableData(graph, 'Quest stage graph');
        if (!graph || typeof graph !== 'object' || Array.isArray(graph)) throw new Error('Quest stage graph must be an object');
        const stages = Array.isArray(graph.stages) ? graph.stages : [];
        if (stages.length < 1 || stages.length > 16) throw new Error('Quest stage graph requires 1 to 16 stages');
        const allowedEvents = new Set(['accept', 'travel', 'defeat', 'find', 'consume', 'seduce', 'objective_complete', 'turn_in', 'fail']);
        const allowedEffects = new Set(['set_destination', 'add_objective', 'grant_item', 'set_branch', 'log']);
        const ids = new Set();
        const normalizedStages = stages.map((stage, stageIndex) => {
            const id = String(stage?.id || `stage_${stageIndex}`).trim();
            if (!id || ids.has(id)) throw new Error(`Quest stage id must be unique: ${id || '(empty)'}`);
            ids.add(id);
            const transitions = Array.isArray(stage.transitions) ? stage.transitions : [];
            if (transitions.length > 8) throw new Error(`Quest stage ${id} supports at most 8 transitions`);
            return {
                id,
                label: String(stage.label || id),
                transitions: transitions.map((transition, transitionIndex) => {
                    const event = String(transition?.event || '').trim();
                    if (!allowedEvents.has(event)) throw new Error(`Unsupported quest stage event: ${event || '(empty)'}`);
                    const effects = Array.isArray(transition.effects) ? transition.effects : [];
                    if (effects.length > 8) throw new Error(`Quest stage transition ${id}:${transitionIndex} supports at most 8 effects`);
                    return {
                        id: String(transition.id || `${id}_${event}_${transitionIndex}`),
                        event,
                        to: transition.to == null ? null : String(transition.to),
                        match: transition.match && typeof transition.match === 'object' && !Array.isArray(transition.match)
                            ? { ...transition.match }
                            : {},
                        effects: effects.map(effect => {
                            if (!effect || typeof effect !== 'object' || Array.isArray(effect)) throw new Error('Quest stage effect must be an object');
                            const type = String(effect.type || '').trim();
                            if (!allowedEffects.has(type)) throw new Error(`Unsupported quest stage effect: ${type || '(empty)'}`);
                            if (type === 'set_destination' && !this.normalizeLocation(effect.location)) {
                                throw new Error('set_destination effect requires a finite location');
                            }
                            if (type === 'add_objective' && (!effect.objective || typeof effect.objective !== 'object')) {
                                throw new Error('add_objective effect requires objective data');
                            }
                            if (type === 'grant_item') {
                                const quantity = Math.floor(Number(effect.item?.quantity ?? effect.quantity) || 1);
                                if (!effect.item || typeof effect.item !== 'object' || quantity < 1 || quantity > 20) {
                                    throw new Error('grant_item effect requires bounded item data');
                                }
                            }
                            return { ...effect };
                        })
                    };
                })
            };
        });
        for (const stage of normalizedStages) {
            for (const transition of stage.transitions) {
                if (transition.to && !ids.has(transition.to)) throw new Error(`Unknown quest stage transition target: ${transition.to}`);
            }
        }
        const initialStage = String(graph.initialStage || normalizedStages[0].id);
        if (!ids.has(initialStage)) throw new Error(`Unknown initial quest stage: ${initialStage}`);
        const currentStage = String(graph.currentStage || initialStage);
        if (!ids.has(currentStage)) throw new Error(`Unknown current quest stage: ${currentStage}`);
        return {
            version: 1,
            initialStage,
            currentStage,
            stages: normalizedStages,
            history: Array.isArray(graph.history) ? graph.history.slice(-32).map(String) : []
        };
    },

    stageMatch(app, transition, payload = {}) {
        const match = transition?.match || {};
        if (match.objectiveId && String(match.objectiveId) !== String(payload.objectiveId || '')) return false;
        if (match.species && String(match.species) !== String(payload.species || payload.target?.species || '')) return false;
        if (match.item) {
            const required = app._itemDefinitionId(match.item) || match.item?.definitionId || match.item;
            const actual = app._itemDefinitionId(payload.definitionId || payload.item || payload.name) || payload.definitionId || payload.item || payload.name;
            if (String(required || '') !== String(actual || '')) return false;
        }
        if (match.location) {
            const location = this.normalizeLocation(match.location);
            if (!location || Number(location.x) !== Number(payload.x) || Number(location.y) !== Number(payload.y)) return false;
        }
        return true;
    },

    nextStageTransition(app, quest, event, payload = {}) {
        const graph = quest?.stageGraph;
        if (!graph || !Array.isArray(graph.stages)) return null;
        const stage = graph.stages.find(entry => entry.id === graph.currentStage);
        return stage?.transitions.find(transition => transition.event === event && this.stageMatch(app, transition, payload)) || null;
    },

    advanceAfterObjectives(quest) {
        if (!quest) return quest;
        this.sync(quest, this.STATES.OBJECTIVES_COMPLETE);
        if (quest.turnInPolicy?.type === this.POLICIES.AUTOMATIC) return quest;
        return this.sync(quest, this.STATES.READY_FOR_TURN_IN);
    },

    currentServiceUnit(app, predicate) {
        return (app.creatures || []).find(unit => (
            unit
            && app._isLivingCreature?.(unit)
            && YAW_UNIT_CONTAINMENT.serviceAvailable(app, unit)
            && predicate(unit)
        )) || null;
    },

    turnInEligibility(app, quest, context = {}) {
        if (!quest || quest.lifecycleState !== this.STATES.READY_FOR_TURN_IN || quest.rewardClaimed) {
            return { ok: false, reason: 'not-ready' };
        }
        const policy = quest.turnInPolicy || this.normalizePolicy(quest);
        if (policy.type === this.POLICIES.AUTOMATIC) return { ok: false, reason: 'automatic' };
        if (policy.type === this.POLICIES.NAMED_LOCATION) {
            const here = Number(app.location?.x) === Number(policy.location?.x)
                && Number(app.location?.y) === Number(policy.location?.y);
            return here ? { ok: true, policy } : { ok: false, reason: 'wrong-location', policy };
        }
        if (policy.type === this.POLICIES.ORIGINAL_GIVER) {
            const expected = String(policy.giverId || quest.giverId || quest.giverName || '');
            const requested = context.giverId == null ? null : String(context.giverId);
            const giver = this.currentServiceUnit(app, unit => {
                const key = String(unit.id || unit.name || '');
                if (requested && key !== requested) return false;
                return key === expected || String(unit.name || '') === String(quest.giverName || '');
            });
            return giver ? { ok: true, policy, giver } : { ok: false, reason: 'giver-unavailable', policy };
        }
        const faction = String(policy.faction || '');
        const giver = this.currentServiceUnit(app, unit => (
            String(unit.faction || '') === faction
            || (unit.tags || []).some(tag => String(tag) === faction)
        ));
        return giver ? { ok: true, policy, giver } : { ok: false, reason: 'faction-unavailable', policy };
    },

    proceduralTilePassable(app, x, y) {
        const tile = app.getBaseTile?.(x, y);
        if (!tile) return true;
        const traversal = tile.traversal || tile.terrain?.traversal;
        return traversal?.passable !== false;
    },

    proceduralEdgePassable(app, from, to, direction) {
        const source = app.getBaseTile?.(from.x, from.y);
        const target = app.getBaseTile?.(to.x, to.y);
        if (!target || !this.proceduralTilePassable(app, to.x, to.y)) return false;
        const connections = tile => {
            const bridge = tile?.overlays?.bridge;
            if (Array.isArray(bridge?.connections)) return bridge.connections;
            if (bridge?.direction === 'north-south') return ['north', 'south'];
            if (bridge) return ['east', 'west'];
            return null;
        };
        const opposite = { north: 'south', east: 'west', south: 'north', west: 'east' };
        const sourceConnections = connections(source);
        const targetConnections = connections(target);
        if (sourceConnections && !sourceConnections.includes(direction)) return false;
        if (targetConnections && !targetConnections.includes(opposite[direction])) return false;
        if (source?.overlays?.barriers?.includes(direction)) return false;
        if (target?.overlays?.barriers?.includes(opposite[direction])) return false;
        return true;
    },

    proceduralCoordinate(app, origin, archetype, index, distance) {
        const directions = [
            { id: 'east', dx: 1, dy: 0 },
            { id: 'south', dx: 0, dy: 1 },
            { id: 'west', dx: -1, dy: 0 },
            { id: 'north', dx: 0, dy: -1 }
        ];
        const rotation = Math.floor(app._worldRoll(`quest-v2-${archetype}-direction`, origin.x, origin.y, index) * directions.length) % directions.length;
        const ordered = directions.map((_, offset) => directions[(rotation + offset) % directions.length]);
        const start = { x: Number(origin.x), y: Number(origin.y), depth: 0 };
        const queue = [start];
        const visited = new Set([`${start.x},${start.y}`]);
        const byDepth = new Map();
        while (queue.length) {
            const current = queue.shift();
            if (current.depth >= distance) continue;
            for (const direction of ordered) {
                const next = {
                    x: current.x + direction.dx,
                    y: current.y + direction.dy,
                    depth: current.depth + 1
                };
                const key = `${next.x},${next.y}`;
                if (visited.has(key) || !this.proceduralEdgePassable(app, current, next, direction.id)) continue;
                visited.add(key);
                queue.push(next);
                if (!byDepth.has(next.depth)) byDepth.set(next.depth, []);
                byDepth.get(next.depth).push(next);
            }
        }
        let candidates = byDepth.get(distance) || [];
        if (!candidates.length) {
            const fallbackDepth = [...byDepth.keys()].filter(depth => depth >= 2).sort((a, b) => b - a)[0];
            candidates = fallbackDepth ? byDepth.get(fallbackDepth) : [];
        }
        if (!candidates.length) return { x: origin.x, y: origin.y };
        const roll = app._worldRoll(`quest-v2-${archetype}-destination`, origin.x, origin.y, index, distance);
        const selected = candidates[Math.floor(roll * candidates.length) % candidates.length];
        return { x: selected.x, y: selected.y };
    },

    generate(app, archetype, context = {}) {
        const supported = ['hunt', 'gather', 'deliver', 'survey', 'escort', 'recover'];
        if (!supported.includes(archetype)) throw new Error(`Unsupported procedural quest archetype: ${archetype}`);
        const giver = context.giver || null;
        const origin = this.normalizeLocation(context.origin || context.giverLocation || {
            x: app.location?.x || 0,
            y: app.location?.y || 0
        }) || { x: 0, y: 0 };
        const level = Math.max(1, Math.floor(Number(context.level ?? app.player?.level) || 1));
        const sequence = Math.max(0, Math.floor(Number(context.sequence) || 0));
        const distance = Math.max(2, Math.min(8, 2 + Math.floor(app._worldRoll(`quest-v2-${archetype}-distance`, origin.x, origin.y, sequence, level) * (3 + Math.min(4, level)))));
        const destination = this.proceduralCoordinate(app, origin, archetype, sequence, distance);
        const danger = Math.max(1, level + Math.floor(distance / 3));
        const reward = {
            xp: 6 + distance * 2 + danger * 3,
            gold: 3 + distance + danger * 2
        };
        const id = `proc_${archetype}_${origin.x}_${origin.y}_${sequence}`;
        const common = {
            id,
            procedural: true,
            archetype,
            giverId: giver?.id || giver?.name || context.giverId || null,
            giverName: giver?.name || context.giverName || null,
            giverLocation: { ...origin, label: giver?.name || context.giverName || 'Quest giver' },
            authoredOrigin: {
                kind: 'procedural',
                archetype,
                seed: String(app.worldMeta?.seed || app.worldMeta?.worldId || 'yaw'),
                sequence
            },
            difficulty: danger,
            destination: { ...destination, label: context.destinationLabel || 'Objective area' },
            reward
        };
        if (archetype === 'hunt') {
            const candidates = ['rat', 'snake', 'wolf', 'boar'].filter(id => (app.species || []).some(species => species.id === id));
            const species = candidates[Math.floor(app._worldRoll('quest-v2-hunt-species', origin.x, origin.y, sequence) * Math.max(1, candidates.length)) % Math.max(1, candidates.length)] || 'wolf';
            const speciesName = (app.species || []).find(entry => entry.id === species)?.name || species;
            return {
                ...common,
                title: `Hunt: ${speciesName}`,
                titleKey: 'quest.procedural.hunt.title',
                titleParams: { species: speciesName },
                description: `Track a nearby ${speciesName} threat and return with news.`,
                descriptionKey: 'quest.procedural.hunt.description',
                descriptionParams: { species: speciesName },
                turnInPolicy: { type: this.POLICIES.ORIGINAL_GIVER, giverId: common.giverId },
                objectives: [{ type: 'defeat', species, required: Math.max(1, Math.min(3, Math.ceil(danger / 2))), location: destination }],
                turnInRequired: true
            };
        }
        if (archetype === 'gather') {
            const pool = ['core:healing_herb', 'core:old_coin', 'core:monster_fang'];
            const itemId = pool[Math.floor(app._worldRoll('quest-v2-gather-item', origin.x, origin.y, sequence) * pool.length) % pool.length];
            const definition = app._getItemDef(itemId);
            return {
                ...common,
                title: `Gather: ${definition.name || itemId}`,
                titleKey: 'quest.procedural.gather.title',
                titleParams: { item: definition.name || itemId },
                description: `Find ${definition.name || itemId} and return it to the original giver.`,
                descriptionKey: 'quest.procedural.gather.description',
                descriptionParams: { item: definition.name || itemId },
                turnInPolicy: { type: this.POLICIES.ORIGINAL_GIVER, giverId: common.giverId },
                objectives: [{ type: 'find', item: { definitionId: itemId, name: definition.name }, required: Math.max(1, Math.min(3, Math.ceil(danger / 3))) }],
                consumeOnTurnIn: [itemId],
                turnInRequired: true
            };
        }
        if (archetype === 'deliver') {
            return {
                ...common,
                title: 'Sealed Delivery',
                titleKey: 'quest.procedural.deliver.title',
                description: 'Carry the protected parcel to the marked destination.',
                descriptionKey: 'quest.procedural.deliver.description',
                turnInPolicy: { type: this.POLICIES.NAMED_LOCATION, location: { ...destination, label: 'Delivery point' } },
                grantOnAccept: [{ definitionId: 'core:sealed_parcel', name: 'Sealed Parcel', quantity: 1 }],
                objectives: [{ type: 'deliver', item: { definitionId: 'core:sealed_parcel', name: 'Sealed Parcel' }, location: destination, required: 1 }],
                consumeOnTurnIn: ['core:sealed_parcel'],
                turnInRequired: true
            };
        }
        if (archetype === 'survey') {
            return {
                ...common,
                title: 'Survey the Wilds',
                titleKey: 'quest.procedural.survey.title',
                description: 'Reach the marked area and record a safe route.',
                descriptionKey: 'quest.procedural.survey.description',
                turnInPolicy: { type: this.POLICIES.ORIGINAL_GIVER, giverId: common.giverId },
                objectives: [{ type: 'travel', location: destination, required: 1 }],
                turnInRequired: true
            };
        }
        if (archetype === 'escort') {
            const midpoint = {
                x: origin.x + Math.trunc((destination.x - origin.x) / 2),
                y: origin.y + Math.trunc((destination.y - origin.y) / 2)
            };
            return {
                ...common,
                title: 'Guide the Route',
                titleKey: 'quest.procedural.escort.title',
                description: 'Guide the traveler through each marked checkpoint.',
                descriptionKey: 'quest.procedural.escort.description',
                turnInPolicy: { type: this.POLICIES.NAMED_LOCATION, location: { ...destination, label: 'Safe destination' } },
                objectives: [{
                    type: 'escort',
                    checkpoints: [
                        { ...midpoint, label: 'Route checkpoint' },
                        { ...destination, label: 'Safe destination' }
                    ]
                }],
                turnInRequired: true
            };
        }
        return {
            ...common,
            title: 'Recover the Waystone Sigil',
            titleKey: 'quest.procedural.recover.title',
            description: 'Search the marked area for a protected waystone sigil.',
            descriptionKey: 'quest.procedural.recover.description',
            turnInPolicy: { type: this.POLICIES.ORIGINAL_GIVER, giverId: common.giverId },
            objectives: [{ type: 'recover', item: { definitionId: 'core:waystone_sigil', name: 'Waystone Sigil' }, location: destination, required: 1 }],
            consumeOnTurnIn: ['core:waystone_sigil'],
            turnInRequired: true
        };
    }
};

if (typeof window !== 'undefined') {
    window.YAW_QUEST_CONTRACT = YAW_QUEST_CONTRACT;
}
