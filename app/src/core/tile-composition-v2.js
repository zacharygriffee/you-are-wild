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
        const routeValue = overlays.bridge || overlays.road || null;
        const routeKind = overlays.bridge ? 'bridge' : (overlays.road ? 'road' : '');
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
        if (shorelineEdges.length || shorelineCorners.length) {
            terrain.push({ kind: 'shoreline', edges: shorelineEdges, corners: shorelineCorners });
        }
        if (barrierEdges.length) terrain.push({ kind: 'barrier', edges: barrierEdges });

        const route = routeValue ? [{
            kind: routeKind,
            id: this._text(routeValue.id, routeKind),
            direction: routeDirection,
            connections: routeConnections
        }] : [];

        const coverValues = [
            ...(Array.isArray(overlays.cover) ? overlays.cover : []),
            ...(Array.isArray(overlays.obstacles) ? overlays.obstacles : [])
        ];
        const cover = coverValues.map((value, index) => this._ref(value, 'cover', index));

        const feature = [];
        if (tile.structure) {
            feature.push({
                kind: 'structure',
                id: this._text(tile.structure),
                depleted: Boolean(tile.structureLooted)
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
                depleted: overlays.poi.category === 'resourceSite' ? Boolean(tile.resourceSearched) : false
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
        const evidenceBounded = this._bounded([...itemEvidence, ...remainsEvidence, ...bagEvidence]);

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
