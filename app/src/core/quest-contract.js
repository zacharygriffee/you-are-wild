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
    WORLD_DIRECTIVE_VERSION: 1,
    WORLD_DIRECTIVE_TYPES: Object.freeze({
        PLACE: 'place',
        BOOST: 'boost'
    }),
    WORLD_CONTENT_KINDS: Object.freeze({
        CREATURE: 'creature',
        ITEM: 'item'
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

    normalizeWorldContent(app, source = {}, options = {}) {
        const content = source.content && typeof source.content === 'object' && !Array.isArray(source.content)
            ? source.content
            : {};
        const inferredKind = source.species ? this.WORLD_CONTENT_KINDS.CREATURE
            : (source.item ? this.WORLD_CONTENT_KINDS.ITEM : null);
        const kind = String(source.kind || content.kind || inferredKind || '').trim().toLowerCase();
        if (!Object.values(this.WORLD_CONTENT_KINDS).includes(kind)) {
            throw new Error(`Quest world directive content kind must be creature or item: ${kind || '(empty)'}`);
        }
        const rawId = content.id
            || content.definitionId
            || source.species
            || source.item
            || (typeof source.content === 'string' ? source.content : '');
        const id = String(rawId || '').trim();
        if (!id || id.length > 120 || !/^[a-zA-Z0-9_.:-]+$/.test(id)) {
            throw new Error('Quest world directive content id must be a token string');
        }
        if (kind === this.WORLD_CONTENT_KINDS.CREATURE) {
            if (!options.allowUnavailable && !(app.species || []).some(species => String(species.id) === id)) {
                throw new Error(`Quest world directive references unknown species: ${id}`);
            }
        } else {
            const definition = app._getItemDef?.(id) || {};
            const known = Boolean(definition.id)
                || Object.entries(app.ITEMS || {}).some(([name, entry]) => name === id || String(entry?.id || '') === id);
            if (!options.allowUnavailable && !known) throw new Error(`Quest world directive references unknown item: ${id}`);
        }
        return { kind, id };
    },

    normalizeWorldDirectives(app, directives = [], questId = 'quest', options = {}) {
        if (directives == null) return [];
        this.assertSerializableData(directives, 'Quest world directives');
        if (!Array.isArray(directives)) throw new Error('Quest world directives must be an array');
        if (directives.length > 8) throw new Error('Quest world directives support at most 8 entries');
        const seen = new Set();
        const allowedFields = new Set([
            'id', 'type', 'content', 'kind', 'species', 'item', 'count', 'distance',
            'location', 'center', 'radius', 'biomes', 'multiplier', 'objectiveId',
            'disposition', 'locationLabel', 'resolvedLocation', 'resolvedCenter',
            'materializedIds', 'active', 'contractVersion'
        ]);
        return directives.map((directive, index) => {
            if (!directive || typeof directive !== 'object' || Array.isArray(directive)) {
                throw new Error('Quest world directive must be an object');
            }
            for (const key of Object.keys(directive)) {
                if (!allowedFields.has(key)) throw new Error(`Unsupported quest world directive field: ${key}`);
            }
            const type = String(directive.type || '').trim().toLowerCase();
            if (!Object.values(this.WORLD_DIRECTIVE_TYPES).includes(type)) {
                throw new Error(`Unsupported quest world directive type: ${type || '(empty)'}`);
            }
            const rawId = String(directive.id || `${questId}_world_${index}`).trim();
            if (!rawId || rawId.length > 120 || !/^[a-zA-Z0-9_.:-]+$/.test(rawId) || seen.has(rawId)) {
                throw new Error(`Quest world directive id must be a unique token: ${rawId || '(empty)'}`);
            }
            seen.add(rawId);
            const content = this.normalizeWorldContent(app, directive, options);
            const biomes = Array.isArray(directive.biomes) ? [...new Set(directive.biomes.map(String))] : [];
            if (biomes.length > 16) throw new Error('Quest world directive supports at most 16 biomes');
            for (const biome of biomes) {
                if (!/^[a-zA-Z0-9_.:-]+$/.test(biome)) throw new Error(`Invalid quest world directive biome: ${biome}`);
                if (Object.keys(app.biomes || {}).length && !app.biomes?.[biome]) {
                    throw new Error(`Quest world directive references unknown biome: ${biome}`);
                }
            }
            const normalized = {
                contractVersion: this.WORLD_DIRECTIVE_VERSION,
                id: rawId,
                type,
                content,
                biomes,
                objectiveId: directive.objectiveId == null ? null : String(directive.objectiveId),
                locationLabel: String(directive.locationLabel || '').trim().slice(0, 120),
                active: directive.active !== false,
                materializedIds: [...new Set((Array.isArray(directive.materializedIds) ? directive.materializedIds : [])
                    .map(value => String(value || '').trim())
                    .filter(Boolean))].slice(0, 32)
            };
            const resolvedLocation = this.normalizeLocation(directive.resolvedLocation);
            const resolvedCenter = this.normalizeLocation(directive.resolvedCenter);
            if (resolvedLocation) normalized.resolvedLocation = resolvedLocation;
            if (resolvedCenter) normalized.resolvedCenter = resolvedCenter;
            if (type === this.WORLD_DIRECTIVE_TYPES.PLACE) {
                const count = Math.floor(Number(directive.count) || 1);
                if (count < 1 || count > 8) throw new Error('Quest place directive count must be between 1 and 8');
                const requestedDistance = directive.distance && typeof directive.distance === 'object' && !Array.isArray(directive.distance)
                    ? directive.distance
                    : {};
                const min = Math.floor(Number(requestedDistance.min) || 2);
                const max = Math.floor(Number(requestedDistance.max) || Math.max(min, 5));
                if (min < 1 || max < min || max > 32) {
                    throw new Error('Quest place directive distance must use min >= 1 and max <= 32');
                }
                const location = this.normalizeLocation(directive.location);
                normalized.count = count;
                normalized.distance = { min, max };
                normalized.disposition = String(directive.disposition || (content.kind === this.WORLD_CONTENT_KINDS.CREATURE ? 'enemy' : '')).trim().toLowerCase();
                if (content.kind === this.WORLD_CONTENT_KINDS.CREATURE
                    && !['enemy', 'neutral', 'friendly'].includes(normalized.disposition)) {
                    throw new Error('Quest creature placement disposition must be enemy, neutral, or friendly');
                }
                if (location) normalized.location = location;
            } else {
                const radius = Math.floor(Number(directive.radius) || 3);
                const multiplier = Number(directive.multiplier) || 2;
                const center = String(directive.center || 'destination').trim().toLowerCase();
                if (radius < 1 || radius > 32) throw new Error('Quest boost directive radius must be between 1 and 32');
                if (!Number.isFinite(multiplier) || multiplier <= 1 || multiplier > 10) {
                    throw new Error('Quest boost directive multiplier must be greater than 1 and at most 10');
                }
                if (!['origin', 'destination'].includes(center)) {
                    throw new Error('Quest boost directive center must be origin or destination');
                }
                normalized.radius = radius;
                normalized.multiplier = multiplier;
                normalized.center = center;
            }
            return normalized;
        });
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

    worldDirectiveOrigin(app, quest) {
        return this.normalizeLocation(quest?.giverLocation)
            || this.normalizeLocation(quest?.authoredOrigin?.location)
            || { x: Number(app.location?.x || 0), y: Number(app.location?.y || 0) };
    },

    worldDirectivePlacementCoordinate(app, quest, directive) {
        const explicit = this.normalizeLocation(directive.location);
        if (explicit) return explicit;
        const origin = this.worldDirectiveOrigin(app, quest);
        const min = directive.distance?.min || 2;
        const max = directive.distance?.max || Math.max(min, 5);
        const directions = [
            { id: 'east', dx: 1, dy: 0 },
            { id: 'south', dx: 0, dy: 1 },
            { id: 'west', dx: -1, dy: 0 },
            { id: 'north', dx: 0, dy: -1 }
        ];
        const queue = [{ ...origin, depth: 0 }];
        const visited = new Set([`${origin.x},${origin.y}`]);
        const preferred = [];
        const fallback = [];
        while (queue.length) {
            const current = queue.shift();
            if (current.depth >= max) continue;
            for (const direction of directions) {
                const next = {
                    x: current.x + direction.dx,
                    y: current.y + direction.dy,
                    depth: current.depth + 1
                };
                const key = `${next.x},${next.y}`;
                if (visited.has(key) || !this.proceduralEdgePassable(app, current, next, direction.id)) continue;
                visited.add(key);
                queue.push(next);
                if (next.depth < min) continue;
                const tile = app.getBaseTile?.(next.x, next.y) || app.getTile?.(next.x, next.y);
                fallback.push(next);
                if (!directive.biomes?.length || directive.biomes.includes(String(tile?.biome || ''))) preferred.push(next);
            }
        }
        const candidates = preferred.length ? preferred : fallback;
        if (!candidates.length) return { x: origin.x, y: origin.y };
        const roll = app._worldRoll?.(
            'quest-world-place',
            origin.x,
            origin.y,
            quest.id,
            directive.id,
            directive.content.id
        ) ?? 0;
        const selected = candidates[Math.min(candidates.length - 1, Math.floor(roll * candidates.length))];
        return { x: selected.x, y: selected.y };
    },

    worldDirectiveObjective(quest, directive) {
        const objectives = quest?.objectives || [];
        if (directive.objectiveId) {
            return objectives.find(objective => String(objective.id) === String(directive.objectiveId)) || null;
        }
        return objectives.find(objective => {
            if (directive.content.kind === this.WORLD_CONTENT_KINDS.CREATURE) {
                return String(objective.species || '') === String(directive.content.id);
            }
            const item = objective.item;
            const itemId = item && typeof item === 'object' ? item.definitionId || item.id : item;
            return String(itemId || '') === String(directive.content.id);
        }) || null;
    },

    worldDirectiveLocationLabel(app, directive) {
        if (directive.locationLabel) return directive.locationLabel;
        if (directive.content.kind === this.WORLD_CONTENT_KINDS.CREATURE) {
            const species = (app.species || []).find(entry => String(entry.id) === String(directive.content.id));
            return `${species?.name || directive.content.id} signs`;
        }
        const definition = app._getItemDef?.(directive.content.id) || {};
        return `${definition.name || directive.content.id} search area`;
    },

    materializeWorldDirective(app, quest, directive) {
        const location = directive.resolvedLocation
            || this.worldDirectivePlacementCoordinate(app, quest, directive);
        directive.resolvedLocation = {
            x: Number(location.x),
            y: Number(location.y),
            label: location.label || this.worldDirectiveLocationLabel(app, directive)
        };
        const objective = this.worldDirectiveObjective(quest, directive);
        if (objective && !objective.location) {
            objective.location = { ...directive.resolvedLocation };
        }
        const tile = app.getTile?.(directive.resolvedLocation.x, directive.resolvedLocation.y);
        if (!tile) return false;
        if (!Array.isArray(tile.creatures)) tile.creatures = [];
        if (!Array.isArray(tile.items)) tile.items = [];
        const createdIds = [];
        for (let index = 0; index < directive.count; index++) {
            const entityId = `quest_${app._stableIdPart?.(quest.id, 'quest') || 'quest'}_${app._stableIdPart?.(directive.id, 'world') || 'world'}_${index}`;
            const alreadyMaterialized = tile.creatures.some(unit => String(unit?.id) === entityId)
                || tile.items.some(item => String(item?.id) === entityId);
            if (!alreadyMaterialized && !directive.materializedIds.includes(entityId)) {
                if (directive.content.kind === this.WORLD_CONTENT_KINDS.CREATURE) {
                    const species = (app.species || []).find(entry => String(entry.id) === String(directive.content.id));
                    const disposition = {
                        enemy: app.DISPOSITION?.ENEMY || 'enemy',
                        neutral: app.DISPOSITION?.NEUTRAL || 'neutral',
                        friendly: app.DISPOSITION?.FRIENDLY || 'friendly'
                    }[directive.disposition] || app.DISPOSITION?.ENEMY || 'enemy';
                    const roll = app._worldRoll?.(
                        'quest-world-creature',
                        directive.resolvedLocation.x,
                        directive.resolvedLocation.y,
                        quest.id,
                        directive.id,
                        index
                    ) ?? 0;
                    const identity = app._pickEncounterIdentity?.(roll) || 'female';
                    const anatomy = app._anatomyForIdentity?.(identity, roll) || {};
                    const unitData = {
                        id: entityId,
                        questResolutionId: entityId,
                        name: `${species?.name || directive.content.id}${directive.count > 1 ? ` ${index + 1}` : ''}`,
                        species: directive.content.id,
                        icon: species?.icon || '👤',
                        identity,
                        gender: identity,
                        parts: anatomy.parts,
                        chest: anatomy.chest,
                        level: Math.max(1, Math.floor(Number(quest.difficulty || app.player?.level) || 1)),
                        disposition,
                        expanded: false,
                        hero: false,
                        ally: false,
                        mc: false,
                        obedient: false,
                        willing: disposition === (app.DISPOSITION?.FRIENDLY || 'friendly'),
                        questWorldDirective: {
                            version: this.WORLD_DIRECTIVE_VERSION,
                            questId: quest.id,
                            directiveId: directive.id
                        }
                    };
                    const creature = app._normalizeUnit?.(unitData, { disposition }) || unitData;
                    tile.creatures.push(creature);
                } else {
                    const definition = app._getItemDef?.(directive.content.id) || {};
                    const itemData = {
                        id: entityId,
                        definitionId: definition.id || directive.content.id,
                        name: definition.name || directive.content.id,
                        questWorldDirective: {
                            version: this.WORLD_DIRECTIVE_VERSION,
                            questId: quest.id,
                            directiveId: directive.id
                        }
                    };
                    const item = app._createItemInstance?.(directive.content.id, itemData) || itemData;
                    tile.items.push(item);
                }
            }
            createdIds.push(entityId);
        }
        directive.materializedIds = [...new Set([...directive.materializedIds, ...createdIds])].slice(0, 32);
        if (Number(app.location?.x) === Number(tile.x) && Number(app.location?.y) === Number(tile.y)) {
            app.creatures = app._tileCreatures?.(tile.creatures) || tile.creatures;
        }
        app.persistTileDelta?.(tile.x, tile.y, tile, { reason: 'quest-world-place' });
        return true;
    },

    resolveWorldBoost(app, quest, directive) {
        if (directive.resolvedCenter) return directive.resolvedCenter;
        const requested = directive.center === 'origin'
            ? this.worldDirectiveOrigin(app, quest)
            : (this.normalizeLocation(quest.destination) || this.worldDirectiveOrigin(app, quest));
        directive.resolvedCenter = { x: Number(requested.x), y: Number(requested.y), ...(requested.label ? { label: requested.label } : {}) };
        const objective = this.worldDirectiveObjective(quest, directive);
        if (objective && !objective.location) {
            objective.location = {
                ...directive.resolvedCenter,
                label: directive.locationLabel || this.worldDirectiveLocationLabel(app, directive)
            };
        }
        return directive.resolvedCenter;
    },

    activateWorldDirectives(app, quest) {
        if (!quest || quest.lifecycleState !== this.STATES.ACTIVE) return false;
        let changed = false;
        for (const directive of quest.worldDirectives || []) {
            if (directive.active === false) continue;
            if (directive.type === this.WORLD_DIRECTIVE_TYPES.PLACE) {
                changed = this.materializeWorldDirective(app, quest, directive) || changed;
            } else if (directive.type === this.WORLD_DIRECTIVE_TYPES.BOOST) {
                this.resolveWorldBoost(app, quest, directive);
                changed = true;
            }
        }
        return changed;
    },

    deactivateWorldDirectives(app, quest) {
        if (!quest) return false;
        const reservedIds = new Set();
        for (const directive of quest.worldDirectives || []) {
            directive.active = false;
            for (const id of directive.materializedIds || []) reservedIds.add(String(id));
        }
        if (!reservedIds.size) return false;
        let changed = false;
        for (const tile of app.worldMap?.values?.() || []) {
            const beforeCreatures = (tile.creatures || []).length;
            const beforeItems = (tile.items || []).length;
            tile.creatures = (tile.creatures || []).filter(unit => !reservedIds.has(String(unit?.id || '')));
            tile.items = (tile.items || []).filter(item => !reservedIds.has(String(item?.id || '')));
            if (tile.creatures.length !== beforeCreatures || tile.items.length !== beforeItems) {
                app.persistTileDelta?.(tile.x, tile.y, tile, { reason: 'quest-world-cleanup' });
                changed = true;
            }
        }
        if (Array.isArray(app.creatures)) {
            app.creatures = app.creatures.filter(unit => !reservedIds.has(String(unit?.id || '')));
        }
        return changed;
    },

    worldBoostApplies(app, quest, directive, kind, tile) {
        if (!quest || quest.lifecycleState !== this.STATES.ACTIVE || directive.active === false) return false;
        if (directive.type !== this.WORLD_DIRECTIVE_TYPES.BOOST || directive.content.kind !== kind) return false;
        if (directive.biomes?.length && !directive.biomes.includes(String(tile?.biome || ''))) return false;
        const center = directive.resolvedCenter || this.resolveWorldBoost(app, quest, directive);
        const distance = Math.abs(Number(tile?.x || 0) - Number(center.x))
            + Math.abs(Number(tile?.y || 0) - Number(center.y));
        return distance <= directive.radius;
    },

    boostWeightedTable(app, table, kind, tile) {
        const multipliers = new Map();
        for (const quest of app.quests || []) {
            for (const directive of quest.worldDirectives || []) {
                if (!this.worldBoostApplies(app, quest, directive, kind, tile)) continue;
                const current = multipliers.get(directive.content.id) || 1;
                multipliers.set(directive.content.id, Math.min(20, current * directive.multiplier));
            }
        }
        if (!multipliers.size) return table;
        return (table || []).map(entry => {
            const source = typeof entry === 'string' ? { id: entry, weight: 1 } : entry;
            const multiplier = multipliers.get(String(source?.id || '')) || 1;
            return { ...source, weight: Math.max(1, Number(source?.weight) || 1) * multiplier };
        });
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
        const authoredDanger = Math.max(1, level + Math.floor(distance / 3));
        const destinationTile = app.getBaseTile?.(destination.x, destination.y) || destination;
        const worldScale = typeof YAW_WORLD_SCALING !== 'undefined'
            ? YAW_WORLD_SCALING.profile(app, destinationTile, authoredDanger)
            : { difficulty: authoredDanger, rewardMultiplier: 1 };
        const danger = worldScale.difficulty;
        const reward = {
            xp: Math.max(1, Math.round((6 + distance * 2 + danger * 3) * worldScale.rewardMultiplier)),
            gold: Math.max(1, Math.round((3 + distance + danger * 2) * worldScale.rewardMultiplier))
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
            const required = Math.max(1, Math.min(3, Math.ceil(danger / 2)));
            return {
                ...common,
                title: `Hunt: ${speciesName}`,
                titleKey: 'quest.procedural.hunt.title',
                titleParams: { species: speciesName },
                description: `Track a nearby ${speciesName} threat and return with news.`,
                descriptionKey: 'quest.procedural.hunt.description',
                descriptionParams: { species: speciesName },
                turnInPolicy: { type: this.POLICIES.ORIGINAL_GIVER, giverId: common.giverId },
                objectives: [{ id: 'hunt_target', type: 'defeat', species, required, location: destination }],
                worldDirectives: [{
                    id: 'hunt_encounter',
                    type: this.WORLD_DIRECTIVE_TYPES.PLACE,
                    content: { kind: this.WORLD_CONTENT_KINDS.CREATURE, id: species },
                    count: required,
                    location: destination,
                    objectiveId: 'hunt_target',
                    disposition: 'enemy',
                    locationLabel: `${speciesName} signs`
                }],
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
                objectives: [{ id: 'gather_target', type: 'find', item: { definitionId: itemId, name: definition.name }, location: destination, required: Math.max(1, Math.min(3, Math.ceil(danger / 3))) }],
                worldDirectives: [{
                    id: 'gather_search_boost',
                    type: this.WORLD_DIRECTIVE_TYPES.BOOST,
                    content: { kind: this.WORLD_CONTENT_KINDS.ITEM, id: itemId },
                    center: 'destination',
                    radius: 3,
                    multiplier: 6,
                    objectiveId: 'gather_target',
                    locationLabel: `${definition.name || itemId} search area`
                }],
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
                title: 'Patrol the Route',
                titleKey: 'quest.procedural.escort.title',
                description: 'Patrol each marked checkpoint, then report back to the original giver.',
                descriptionKey: 'quest.procedural.escort.description',
                turnInPolicy: { type: this.POLICIES.ORIGINAL_GIVER, giverId: common.giverId },
                objectives: [{
                    type: 'escort',
                    checkpoints: [
                        { ...midpoint, label: 'Route checkpoint' },
                        { ...destination, label: 'Patrol boundary' }
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
