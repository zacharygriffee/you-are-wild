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

    _distanceToSegment(point, start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
        const progress = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
        return Math.hypot(point.x - (start.x + progress * dx), point.y - (start.y + progress * dy));
    },

    _clearCoverAnchor(value, clearance = {}, edgeBand = '') {
        const original = this._anchor(value);
        const routeConnections = this._directions(clearance.routeConnections);
        const routeRadius = Math.max(0, Math.min(0.45, this._number(clearance.routeRadius, 0)));
        const featureRadius = Math.max(0, Math.min(0.48, this._number(clearance.featureRadius, 0)));
        const edgePadding = Math.max(0, Math.min(0.2, this._number(clearance.edgePadding, 0.08)));
        if ((!routeConnections.length || routeRadius <= 0) && featureRadius <= 0) return original;
        const endpoints = {
            north: { x: 0.5, y: 0 }, east: { x: 1, y: 0.5 },
            south: { x: 0.5, y: 1 }, west: { x: 0, y: 0.5 }
        };
        const center = { x: 0.5, y: 0.5 };
        const safe = point => {
            if (point.x < edgePadding || point.x > 1 - edgePadding || point.y < edgePadding || point.y > 1 - edgePadding) return false;
            if (edgeBand === 'north' && point.y > 0.22) return false;
            if (edgeBand === 'east' && point.x < 0.78) return false;
            if (edgeBand === 'south' && point.y < 0.78) return false;
            if (edgeBand === 'west' && point.x > 0.22) return false;
            if (featureRadius > 0 && Math.hypot(point.x - center.x, point.y - center.y) < featureRadius) return false;
            return !routeConnections.some(direction => this._distanceToSegment(point, center, endpoints[direction]) < routeRadius);
        };
        const positions = [0.1, 0.18, 0.28, 0.72, 0.82, 0.9];
        const edgeCandidates = edgeBand === 'north' || edgeBand === 'south'
            ? [0.18, 0.32, 0.68, 0.82].map(x => ({ x, y: edgeBand === 'north' ? 0.1 : 0.9 }))
            : (edgeBand === 'east' || edgeBand === 'west'
                ? [0.18, 0.32, 0.68, 0.82].map(y => ({ x: edgeBand === 'west' ? 0.1 : 0.9, y }))
                : []);
        const candidates = [original, ...edgeCandidates, ...positions.flatMap(y => positions.map(x => ({ x, y })))]
            .filter(safe)
            .sort((left, right) => {
                const leftDistance = (left.x - original.x) ** 2 + (left.y - original.y) ** 2;
                const rightDistance = (right.x - original.x) ** 2 + (right.y - original.y) ** 2;
                return leftDistance - rightDistance || left.y - right.y || left.x - right.x;
            });
        return candidates[0] || original;
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
        const adjacencyBlend = visual.adjacencyBlend && typeof visual.adjacencyBlend === 'object' ? visual.adjacencyBlend : {};
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
            subLayer: 0,
            id: biome,
            biome,
            water: Boolean(tile.water || tile.terrain?.water)
        }];

        const terrain = [{
            kind: 'elevation',
            subLayer: 30,
            value: this._number(tile.elevation ?? tile.terrain?.elevation, 0.5)
        }];
        const topology = tile.terrainTopology || tile.terrain?.topology;
        if (topology && typeof topology === 'object') {
            terrain.push({
                kind: 'elevation-transition',
                subLayer: 30,
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
            terrain.push({ kind: 'shoreline', subLayer: 20, edges: shorelineEdges, corners: shorelineCorners });
        }
        if (barrierEdges.length) terrain.push({ kind: 'barrier', subLayer: 40, edges: barrierEdges });
        const groundTransitions = Array.isArray(visual.groundTransitions) ? visual.groundTransitions : [];
        if (groundTransitions.length) {
            terrain.push({
                kind: 'ground-transition',
                subLayer: 10,
                edges: groundTransitions.slice(0, 8).map(entry => ({
                    direction: this._text(entry?.direction, '', 16),
                    biome: this._text(entry?.biome, 'unknown', 40),
                    sourceBiome: this._text(entry?.sourceBiome, entry?.biome || 'unknown', 40),
                    destinationBiome: this._text(entry?.destinationBiome, biome, 40),
                    sharedEdgeKey: this._text(entry?.sharedEdgeKey, '', 120),
                    mirrorDirection: this._text(entry?.mirrorDirection, '', 16),
                    style: this._text(entry?.style, 'soft', 20),
                    phase: Math.max(0, Math.min(1, this._number(entry?.phase, 0))),
                    corners: Object.fromEntries(Object.entries(entry?.corners || {})
                        .filter(([corner, state]) => ['ne', 'es', 'sw', 'wn'].includes(corner) && ['cap', 'extend', 'join', 'trim'].includes(state))
                        .slice(0, 4)),
                    depth: Math.max(0, Math.min(1, this._number(entry?.depth, 0.3))),
                    opacity: Math.max(0, Math.min(1, this._number(entry?.opacity, 1))),
                    destinationOwned: entry?.destinationOwned !== false
                })).filter(entry => entry.direction)
            });
        }

        const route = routeValue ? [{
            kind: routeKind,
            subLayer: 20,
            id: this._text(routeValue.id, routeKind),
            direction: routeDirection,
            connections: routeConnections,
            spanIndex: Math.max(0, Math.trunc(this._number(routeValue.spanIndex, 0))),
            spanLength: Math.max(0, Math.trunc(this._number(routeValue.spanLength, 0))),
            spanRole: this._text(routeValue.spanRole),
            shoreEdges: this._directions(routeValue.shoreEdges)
        }] : [];
        (Array.isArray(adjacencyBlend.route) ? adjacencyBlend.route : []).slice(0, 4).forEach(entry => {
            route.push({
                kind: this._text(entry?.kind, 'route-verge', 40),
                subLayer: Math.max(0, Math.min(99, Math.trunc(this._number(entry?.subLayer, 10)))),
                biome: this._text(entry?.biome, biome, 40),
                shoulder: this._text(entry?.shoulder, 'earth', 40),
                vergeFamily: this._text(entry?.vergeFamily, '', 40),
                connections: this._directions(entry?.connections),
                approachEdges: this._directions(entry?.approachEdges),
                clearanceRadius: Math.max(0, Math.min(0.5, this._number(entry?.clearanceRadius, 0))),
                destinationOwned: entry?.destinationOwned !== false
            });
        });

        const coverValues = [
            ...(Array.isArray(overlays.cover) ? overlays.cover : []),
            ...(Array.isArray(overlays.obstacles) ? overlays.obstacles : []),
            ...(Array.isArray(adjacencyBlend.cover) ? adjacencyBlend.cover : [])
        ];
        const cover = coverValues.map((value, index) => {
            const originalAnchor = this._anchor(value?.anchor);
            const edgeBand = this._text(value?.edgeBand, '', 16);
            const anchor = this._clearCoverAnchor(originalAnchor, adjacencyBlend.clearance, edgeBand);
            return {
                ...this._ref(value, this._text(value?.kind, 'cover'), index),
                subLayer: Math.max(0, Math.min(99, Math.trunc(this._number(value?.subLayer, 20)))),
                family: this._text(value?.family, 'foliage', 40),
                variant: Math.max(0, Math.trunc(this._number(value?.variant, 0))),
                stratum: this._text(value?.stratum, '', 24),
                anchor,
                scale: Math.max(0.25, Math.min(2, this._number(value?.scale, 1))),
                opacity: Math.max(0, Math.min(1, this._number(value?.opacity, 1))),
                rotation: Math.max(-180, Math.min(180, this._number(value?.rotation, 0))),
                flipX: Boolean(value?.flipX),
                role: value?.mechanical ? 'mechanical' : this._text(value?.role, 'decorative', 24),
                mechanical: Boolean(value?.mechanical),
                mechanic: this._text(value?.mechanic, '', 40),
                edges: this._directions(value?.edges),
                blocksMovement: Boolean(value?.blocksMovement),
                blocksSight: Boolean(value?.blocksSight),
                sourceBiome: this._text(value?.sourceBiome, '', 40),
                sourceDirection: this._text(value?.sourceDirection, '', 16),
                edgeBand,
                sharedEdgeKey: this._text(value?.sharedEdgeKey, '', 120),
                destinationOwned: value?.destinationOwned !== false,
                clearanceAdjusted: anchor.x !== originalAnchor.x || anchor.y !== originalAnchor.y
            };
        });

        const feature = [];
        if (tile.structure) {
            feature.push({
                kind: 'structure',
                subLayer: 20,
                id: this._text(tile.structure),
                depleted: Boolean(tile.structureLooted),
                footprint: this._footprint(visual.featureFootprint || tile.featureFootprint),
                approachEdges: this._directions(visual.featureApproachEdges)
            });
        }
        if (tile.hasLandmark) {
            feature.push({ kind: 'landmark', subLayer: 20, id: this._text(tile.landmarkName, 'landmark') });
        }
        if (overlays.poi) {
            feature.push({
                kind: overlays.poi.category === 'resourceSite' ? 'resource' : 'poi',
                subLayer: 20,
                id: this._text(overlays.poi.id, overlays.poi.category || 'poi'),
                category: this._text(overlays.poi.category, 'landmark'),
                depleted: overlays.poi.category === 'resourceSite' ? Boolean(tile.resourceSearched) : false,
                footprint: this._footprint(visual.featureFootprint || overlays.poi.footprint),
                approachEdges: this._directions(visual.featureApproachEdges)
            });
        }
        (Array.isArray(adjacencyBlend.feature) ? adjacencyBlend.feature : []).slice(0, 4).forEach(entry => {
            feature.push({
                kind: this._text(entry?.kind, 'feature-grounding', 40),
                subLayer: Math.max(0, Math.min(99, Math.trunc(this._number(entry?.subLayer, 10)))),
                biome: this._text(entry?.biome, biome, 40),
                material: this._text(entry?.material, 'earth', 40),
                approachEdges: this._directions(entry?.approachEdges),
                clearanceRadius: Math.max(0, Math.min(0.5, this._number(entry?.clearanceRadius, 0))),
                destinationOwned: entry?.destinationOwned !== false
            });
        });
        terrain.sort((left, right) => this._number(left.subLayer, 0) - this._number(right.subLayer, 0));
        route.sort((left, right) => this._number(left.subLayer, 0) - this._number(right.subLayer, 0));
        cover.sort((left, right) => this._number(left.subLayer, 0) - this._number(right.subLayer, 0));
        feature.sort((left, right) => this._number(left.subLayer, 0) - this._number(right.subLayer, 0));

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
                presentationRecipeVersion: Math.max(0, Math.trunc(this._number(adjacencyBlend.version, 0))),
                adjacency: {
                    sharedEdges: (Array.isArray(adjacencyBlend.sharedEdges) ? adjacencyBlend.sharedEdges : []).slice(0, 4).map(entry => ({
                        key: this._text(entry?.sharedEdgeKey, '', 120),
                        direction: this._text(entry?.direction, '', 16),
                        mirrorDirection: this._text(entry?.mirrorDirection, '', 16),
                        policy: this._text(entry?.policy, '', 24),
                        style: this._text(entry?.style, '', 20),
                        sourceBiome: this._text(entry?.sourceBiome, '', 40),
                        destinationBiome: this._text(entry?.destinationBiome, '', 40),
                        destinationOwned: Boolean(entry?.destinationOwned)
                    })),
                    junctions: (Array.isArray(adjacencyBlend.junctions) ? adjacencyBlend.junctions : []).slice(0, 4).map(entry => ({
                        corner: this._text(entry?.corner, '', 8),
                        kind: this._text(entry?.kind, '', 24),
                        winnerDirection: this._text(entry?.winnerDirection, '', 16),
                        diagonalBiome: this._text(entry?.diagonalBiome, '', 40)
                    }))
                },
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
