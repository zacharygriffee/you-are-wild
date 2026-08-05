/**
 * YOU ARE WILD TILE COMPOSITION V2 — PHASE A
 *
 * Produces a bounded, serializable presentation snapshot from simulation-owned
 * tile state. The snapshot is read-only input for present and future renderers;
 * it does not grant art packs gameplay, persistence, or hit-testing authority.
 */

const YAW_TILE_COMPOSITION_V2 = {
    SCHEMA: 'yaw-map-scene-snapshot',
    VERSION: 2,
    LAYERS: ['ground', 'terrain', 'route', 'cover', 'feature', 'evidence', 'presence', 'state'],
    MAX_RECORDS_PER_LAYER: 24,
    DIRECTIONS: ['north', 'east', 'south', 'west'],

    _text(value, fallback = '', maxLength = 160) {
        const text = String(value ?? '').trim();
        return (text || String(fallback || '')).slice(0, maxLength);
    },

    _number(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    },

    _directions(values = []) {
        const input = new Set((Array.isArray(values) ? values : []).map(value => this._text(value).toLowerCase()));
        return this.DIRECTIONS.filter(direction => input.has(direction));
    },

    _ref(value, kind, index = 0) {
        const source = value && typeof value === 'object' ? value : { name: value };
        const label = this._text(source.corpseName || source.displayName || source.name, kind);
        return {
            kind,
            id: this._text(source.id || source.instanceId || source.resolutionId, `${kind}-${index + 1}`, 120),
            label: label.slice(0, 160)
        };
    },

    _anchor(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            x: Math.max(0, Math.min(1, this._number(source.x, 0.5))),
            y: Math.max(0, Math.min(1, this._number(source.y, 0.5)))
        };
    },

    _footprint(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            width: Math.max(1, Math.min(8, Math.trunc(this._number(source.width, 1)))),
            height: Math.max(1, Math.min(8, Math.trunc(this._number(source.height, 1)))),
            part: this._text(source.part, 'single', 40),
            anchor: this._anchor(source.anchor)
        };
    },

    _bounded(records = []) {
        const list = Array.isArray(records) ? records : [];
        return {
            records: list.slice(0, this.MAX_RECORDS_PER_LAYER),
            omitted: Math.max(0, list.length - this.MAX_RECORDS_PER_LAYER)
        };
    },

    _layerRecord(records, omitted = 0) {
        return { records, omitted };
    },

    snapshot(app, tileValue, options = {}) {
        const tile = tileValue && typeof tileValue === 'object' ? tileValue : {};
        const overlays = tile.overlays && typeof tile.overlays === 'object' ? tile.overlays : {};
        const visual = options.visual && typeof options.visual === 'object' ? options.visual : {};
        const biome = this._text(tile.derivedBiome || tile.baseBiome || tile.biome, 'unknown');
        const shorelineEdges = this._directions(overlays.shoreline?.edges || visual.shorelineEdges);
        const shorelineCorners = (Array.isArray(visual.shorelineCorners) ? visual.shorelineCorners : [])
            .map(value => this._text(value).toLowerCase())
            .filter(Boolean)
            .slice(0, 8);
        const suppliedRoute = options.route && typeof options.route === 'object' ? options.route : null;
        const routeValue = suppliedRoute || overlays.bridge || overlays.road || null;
        const routeKind = this._text(suppliedRoute?.kind || (overlays.bridge ? 'bridge' : (overlays.road ? 'road' : '')));
        const routeConnections = this._directions(routeValue?.connections || []);
        const routeDirection = this._text(routeValue?.direction || visual.routeShape);
        const barrierEdges = this._directions([...(overlays.barriers || []), ...(options.blockedEdges || visual.blockedEdges || [])]);

        const ground = [{
            kind: 'material',
            id: biome,
            biome,
            water: Boolean(tile.water || tile.terrain?.water)
        }];

        const terrain = [{
            kind: 'elevation',
            value: this._number(tile.elevation ?? tile.terrain?.elevation, 0.5)
        }];
        const topology = tile.terrainTopology || tile.terrain?.topology;
        if (topology && typeof topology === 'object') {
            terrain.push({
                kind: 'elevation-transition',
                type: this._text(topology.kind, 'level'),
                band: this._text(topology.band, 'mid'),
                primaryUphill: this._text(topology.primaryUphill),
                primaryDownhill: this._text(topology.primaryDownhill),
                uphillEdges: this._directions(topology.uphillEdges),
                downhillEdges: this._directions(topology.downhillEdges),
                cliffEdges: this._directions(topology.cliffEdges)
            });
        }
        if (shorelineEdges.length || shorelineCorners.length) {
            terrain.push({ kind: 'shoreline', edges: shorelineEdges, corners: shorelineCorners });
        }
        if (barrierEdges.length) terrain.push({ kind: 'barrier', edges: barrierEdges });
        const groundTransitions = Array.isArray(visual.groundTransitions) ? visual.groundTransitions : [];
        if (groundTransitions.length) {
            terrain.push({
                kind: 'ground-transition',
                edges: groundTransitions.slice(0, 8).map(entry => ({
                    direction: this._text(entry?.direction, '', 16),
                    biome: this._text(entry?.biome, 'unknown', 40)
                })).filter(entry => entry.direction)
            });
        }

        const route = routeValue ? [{
            kind: routeKind,
            id: this._text(routeValue.id, routeKind),
            direction: routeDirection,
            connections: routeConnections,
            spanIndex: Math.max(0, Math.trunc(this._number(routeValue.spanIndex, 0))),
            spanLength: Math.max(0, Math.trunc(this._number(routeValue.spanLength, 0))),
            spanRole: this._text(routeValue.spanRole),
            shoreEdges: this._directions(routeValue.shoreEdges)
        }] : [];

        const coverValues = [
            ...(Array.isArray(overlays.cover) ? overlays.cover : []),
            ...(Array.isArray(overlays.obstacles) ? overlays.obstacles : [])
        ];
        const cover = coverValues.map((value, index) => ({
            ...this._ref(value, this._text(value?.kind, 'cover'), index),
            family: this._text(value?.family, 'foliage', 40),
            variant: Math.max(0, Math.trunc(this._number(value?.variant, 0))),
            anchor: this._anchor(value?.anchor),
            scale: Math.max(0.25, Math.min(2, this._number(value?.scale, 1))),
            role: value?.mechanical ? 'mechanical' : this._text(value?.role, 'decorative', 24),
            mechanical: Boolean(value?.mechanical),
            mechanic: this._text(value?.mechanic, '', 40),
            edges: this._directions(value?.edges),
            blocksMovement: Boolean(value?.blocksMovement),
            blocksSight: Boolean(value?.blocksSight)
        }));

        const feature = [];
        if (tile.structure) {
            feature.push({
                kind: 'structure',
                id: this._text(tile.structure),
                depleted: Boolean(tile.structureLooted),
                footprint: this._footprint(visual.featureFootprint || tile.featureFootprint),
                approachEdges: this._directions(visual.featureApproachEdges)
            });
        }
        if (tile.hasLandmark) {
            feature.push({ kind: 'landmark', id: this._text(tile.landmarkName, 'landmark') });
        }
        if (overlays.poi) {
            feature.push({
                kind: overlays.poi.category === 'resourceSite' ? 'resource' : 'poi',
                id: this._text(overlays.poi.id, overlays.poi.category || 'poi'),
                category: this._text(overlays.poi.category, 'landmark'),
                depleted: overlays.poi.category === 'resourceSite' ? Boolean(tile.resourceSearched) : false,
                footprint: this._footprint(visual.featureFootprint || overlays.poi.footprint),
                approachEdges: this._directions(visual.featureApproachEdges)
            });
        }

        const creatures = Array.isArray(tile.creatures) ? tile.creatures : [];
        const isCorpse = unit => Boolean(
            app?._isCorpse?.(unit)
            || unit?.corpse
            || unit?.dead
            || unit?.disposition === 'corpse'
            || unit?.disposition === 'remains'
        );
        const remains = creatures.filter(isCorpse);
        const living = creatures.filter(unit => !isCorpse(unit));
        const itemEvidence = (Array.isArray(tile.items) ? tile.items : []).map((item, index) => ({
            ...this._ref(item, 'item', index),
            quantity: Math.max(1, this._number(item?.quantity ?? item?.qty, 1))
        }));
        const remainsEvidence = remains.map((unit, index) => ({
            ...this._ref(unit, 'remains', index),
            depleted: Boolean(unit?.depleted || unit?.scavenged)
        }));
        const bagEvidence = (Array.isArray(tile.deathBags) ? tile.deathBags : []).map((bag, index) => ({
            ...this._ref(bag, 'recovery-bag', index),
            itemCount: Array.isArray(bag?.items) ? bag.items.length : 0,
            gold: Math.max(0, this._number(bag?.gold, 0))
        }));
        const placedEvidence = (Array.isArray(tile.placedObjects) ? tile.placedObjects : []).map((object, index) => ({
            ...this._ref(object, 'placed-object', index),
            state: this._text(object?.state, 'placed')
        }));
        const resourceEvidence = overlays.poi?.category === 'resourceSite' && tile.resourceSearched
            ? [{
                kind: 'resource-change',
                id: this._text(overlays.poi.id, 'resource-site'),
                label: this._text(overlays.poi.name || overlays.poi.id, 'Resource site'),
                state: 'depleted'
            }]
            : [];
        const evidenceBounded = this._bounded([...itemEvidence, ...remainsEvidence, ...bagEvidence, ...placedEvidence, ...resourceEvidence]);

        const optionPresence = Array.isArray(options.presence) ? options.presence : [];
        const presenceBounded = this._bounded([
            ...living.map((unit, index) => this._ref(unit, 'creature', index)),
            ...optionPresence.map((unit, index) => this._ref(unit, this._text(unit?.kind, 'party'), living.length + index))
        ]);

        const state = [];
        if (options.isCurrent) state.push({ kind: 'current' });
        if (options.questMarker) state.push({ kind: 'quest', id: this._text(options.questMarker?.id || options.questMarker, 'quest') });
        if (options.selected) state.push({ kind: 'selected' });
        if (options.reachable !== undefined) state.push({ kind: 'reachable', value: Boolean(options.reachable) });
        if (Boolean(options.danger ?? visual.immediateDanger ?? tile.hostile)) state.push({ kind: 'danger' });
        if (barrierEdges.length) state.push({ kind: 'blocked', edges: barrierEdges, reason: this._text(options.blockedReason || visual.blockedReason) });

        const coverBounded = this._bounded(cover);
        const featureBounded = this._bounded(feature);
        const stateBounded = this._bounded(state);
        const semanticKeys = [...new Set((Array.isArray(visual.semanticKeys) ? visual.semanticKeys : [])
            .map(value => this._text(value))
            .filter(Boolean))].slice(0, 64);

        return {
            schema: this.SCHEMA,
            version: this.VERSION,
            space: options.space === 'interior' ? 'interior' : 'overworld',
            position: {
                x: Math.trunc(this._number(tile.x ?? options.x, 0)),
                y: Math.trunc(this._number(tile.y ?? options.y, 0))
            },
            layers: {
                ground: this._layerRecord(ground, 0),
                terrain: this._layerRecord(terrain, 0),
                route: this._layerRecord(route, 0),
                cover: this._layerRecord(coverBounded.records, coverBounded.omitted),
                feature: this._layerRecord(featureBounded.records, featureBounded.omitted),
                evidence: this._layerRecord(evidenceBounded.records, evidenceBounded.omitted),
                presence: this._layerRecord(presenceBounded.records, presenceBounded.omitted),
                state: this._layerRecord(stateBounded.records, stateBounded.omitted)
            },
            facts: {
                traversal: {
                    passable: tile.traversal?.passable !== false,
                    cost: Math.max(0, this._number(tile.traversal?.traversalCost, 1)),
                    requiredCapability: this._text(tile.traversal?.requiredCapability),
                    routeModifier: this._number(tile.traversal?.routeModifier, 0)
                },
                terrainTags: [...new Set((Array.isArray(tile.terrainTags) ? tile.terrainTags : [])
                    .map(value => this._text(value))
                    .filter(Boolean))].sort().slice(0, 32)
            },
            compatibility: {
                tilesetPackVersion: 1,
                semanticKeys: semanticKeys.map(value => value.slice(0, 120))
            }
        };
    }
};

if (typeof window !== 'undefined') window.YAW_TILE_COMPOSITION_V2 = YAW_TILE_COMPOSITION_V2;
