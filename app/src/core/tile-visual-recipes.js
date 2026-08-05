/**
 * YOU ARE WILD TILE VISUAL RECIPES V2
 *
 * Deterministic presentation policy for Tile Composition V2. The pass owns
 * no mechanics or persistence. Every cross-tile decision is derived from a
 * canonical shared-edge key so either side observes the same seam identity,
 * phase, source material, and destination owner.
 */

const YAW_TILE_VISUAL_RECIPES = {
    VERSION: 2,
    DIRECTIONS: Object.freeze([
        Object.freeze({ id: 'north', opposite: 'south', dx: 0, dy: -1 }),
        Object.freeze({ id: 'east', opposite: 'west', dx: 1, dy: 0 }),
        Object.freeze({ id: 'south', opposite: 'north', dx: 0, dy: 1 }),
        Object.freeze({ id: 'west', opposite: 'east', dx: -1, dy: 0 })
    ]),
    CORNERS: Object.freeze([
        Object.freeze({ id: 'ne', directions: ['north', 'east'], dx: 1, dy: -1 }),
        Object.freeze({ id: 'es', directions: ['east', 'south'], dx: 1, dy: 1 }),
        Object.freeze({ id: 'sw', directions: ['south', 'west'], dx: -1, dy: 1 }),
        Object.freeze({ id: 'wn', directions: ['west', 'north'], dx: -1, dy: -1 })
    ]),
    PROFILES: Object.freeze({
        grove: Object.freeze({ materialGroup: 'grove', coverFamily: 'broadleaf', edgePriority: 56, edgeStyle: 'soft', edgeDepth: 0.29, spillScale: 0.74, spillOpacity: 0.84, routeShoulder: 'leaf-litter', routeClearance: 0.26, featureClearance: 0.34 }),
        forest: Object.freeze({ materialGroup: 'forest', coverFamily: 'conifer', edgePriority: 68, edgeStyle: 'soft', edgeDepth: 0.31, spillScale: 0.78, spillOpacity: 0.86, routeShoulder: 'needles', routeClearance: 0.28, featureClearance: 0.36 }),
        swamp: Object.freeze({ materialGroup: 'swamp', coverFamily: 'reeds', edgePriority: 62, edgeStyle: 'soft', edgeDepth: 0.32, spillScale: 0.68, spillOpacity: 0.8, routeShoulder: 'mud', routeClearance: 0.27, featureClearance: 0.34 }),
        plains: Object.freeze({ materialGroup: 'plains', coverFamily: 'grass', edgePriority: 28, edgeStyle: 'soft', edgeDepth: 0.22, spillScale: 0.46, spillOpacity: 0.64, routeShoulder: 'grass', routeClearance: 0.23, featureClearance: 0.31 }),
        jungle: Object.freeze({ materialGroup: 'jungle', coverFamily: 'jungle', edgePriority: 76, edgeStyle: 'soft', edgeDepth: 0.34, spillScale: 0.82, spillOpacity: 0.88, routeShoulder: 'leaf-litter', routeClearance: 0.3, featureClearance: 0.38 }),
        beach: Object.freeze({ materialGroup: 'sand', coverFamily: 'drift', edgePriority: 22, edgeStyle: 'soft', edgeDepth: 0.24, spillScale: 0.48, spillOpacity: 0.66, routeShoulder: 'sand', routeClearance: 0.24, featureClearance: 0.32 }),
        sand: Object.freeze({ materialGroup: 'sand', coverFamily: 'scrub', edgePriority: 24, edgeStyle: 'soft', edgeDepth: 0.23, spillScale: 0.44, spillOpacity: 0.64, routeShoulder: 'sand', routeClearance: 0.24, featureClearance: 0.32 }),
        cliff: Object.freeze({ materialGroup: 'stone', coverFamily: 'rock', edgePriority: 82, edgeStyle: 'hard', edgeDepth: 0.2, spillScale: 0, spillOpacity: 0, routeShoulder: 'stone', routeClearance: 0.27, featureClearance: 0.35 }),
        water: Object.freeze({ materialGroup: 'water', coverFamily: '', edgePriority: 100, edgeStyle: 'shoreline', edgeDepth: 0.28, spillScale: 0, spillOpacity: 0, routeShoulder: 'wet', routeClearance: 0.26, featureClearance: 0.34 }),
        cave: Object.freeze({ materialGroup: 'stone-dark', coverFamily: 'rock', edgePriority: 80, edgeStyle: 'hard', edgeDepth: 0.19, spillScale: 0, spillOpacity: 0, routeShoulder: 'stone', routeClearance: 0.27, featureClearance: 0.35 }),
        dungeon: Object.freeze({ materialGroup: 'stone-dark', coverFamily: 'rock', edgePriority: 84, edgeStyle: 'hard', edgeDepth: 0.18, spillScale: 0, spillOpacity: 0, routeShoulder: 'stone', routeClearance: 0.25, featureClearance: 0.34 }),
        manor: Object.freeze({ materialGroup: 'stone-dark', coverFamily: '', edgePriority: 86, edgeStyle: 'hard', edgeDepth: 0.16, spillScale: 0, spillOpacity: 0, routeShoulder: 'stone', routeClearance: 0.24, featureClearance: 0.34 }),
        farm: Object.freeze({ materialGroup: 'plains', coverFamily: 'grass', edgePriority: 30, edgeStyle: 'soft', edgeDepth: 0.22, spillScale: 0.42, spillOpacity: 0.62, routeShoulder: 'grass', routeClearance: 0.24, featureClearance: 0.34 }),
        indoors: Object.freeze({ materialGroup: 'interior', coverFamily: '', edgePriority: 90, edgeStyle: 'hard', edgeDepth: 0.14, spillScale: 0, spillOpacity: 0, routeShoulder: 'stone', routeClearance: 0.24, featureClearance: 0.34 }),
        entrance: Object.freeze({ materialGroup: 'interior', coverFamily: '', edgePriority: 88, edgeStyle: 'hard', edgeDepth: 0.16, spillScale: 0, spillOpacity: 0, routeShoulder: 'stone', routeClearance: 0.25, featureClearance: 0.34 }),
        unknown: Object.freeze({ materialGroup: 'unknown', coverFamily: '', edgePriority: 0, edgeStyle: 'hard', edgeDepth: 0.16, spillScale: 0, spillOpacity: 0, routeShoulder: 'earth', routeClearance: 0.25, featureClearance: 0.34 })
    }),

    biome(tile) {
        return String(tile?.derivedBiome || tile?.baseBiome || tile?.biome || 'unknown');
    },

    profile(value) {
        const biome = typeof value === 'string' ? value : this.biome(value);
        return this.PROFILES[biome] || this.PROFILES.unknown;
    },

    _hash01(...parts) {
        const text = parts.map(value => String(value ?? '')).join('|');
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0) / 4294967296;
    },

    _pointKey(x, y) {
        return `${Number(x)},${Number(y)}`;
    },

    _sharedEdgeKey(x, y, neighborX, neighborY) {
        const points = [
            { x: Number(x), y: Number(y) },
            { x: Number(neighborX), y: Number(neighborY) }
        ].sort((left, right) => left.y - right.y || left.x - right.x);
        return `edge:${this._pointKey(points[0].x, points[0].y)}>${this._pointKey(points[1].x, points[1].y)}`;
    },

    _sourceBiome(leftBiome, rightBiome, edgeKey) {
        const leftProfile = this.profile(leftBiome);
        const rightProfile = this.profile(rightBiome);
        if (leftProfile.edgePriority !== rightProfile.edgePriority) {
            return leftProfile.edgePriority > rightProfile.edgePriority ? leftBiome : rightBiome;
        }
        if (leftBiome !== rightBiome) return [leftBiome, rightBiome].sort()[1];
        return this._hash01(edgeKey, 'source') >= 0.5 ? leftBiome : rightBiome;
    },

    _edgePolicy(currentBiome, neighborBiome, edgeKey) {
        const currentProfile = this.profile(currentBiome);
        const neighborProfile = this.profile(neighborBiome);
        if (currentProfile.materialGroup === neighborProfile.materialGroup) {
            return { kind: 'same-material', style: 'none', sourceBiome: currentBiome, destinationBiome: neighborBiome };
        }
        if (currentBiome === 'water' || neighborBiome === 'water') {
            return {
                kind: 'shoreline',
                style: 'shoreline',
                sourceBiome: 'water',
                destinationBiome: currentBiome === 'water' ? neighborBiome : currentBiome
            };
        }
        const sourceBiome = this._sourceBiome(currentBiome, neighborBiome, edgeKey);
        const destinationBiome = sourceBiome === currentBiome ? neighborBiome : currentBiome;
        const sourceProfile = this.profile(sourceBiome);
        const destinationProfile = this.profile(destinationBiome);
        return {
            kind: 'ground-transition',
            style: sourceProfile.edgeStyle === 'hard' || destinationProfile.edgeStyle === 'hard' ? 'hard' : 'soft',
            sourceBiome,
            destinationBiome
        };
    },

    connectionsForShape(shapeValue, explicit = []) {
        const explicitValues = Array.isArray(explicit) ? explicit.map(String) : [];
        const normalized = this.DIRECTIONS.map(direction => direction.id).filter(direction => explicitValues.includes(direction));
        if (normalized.length) return normalized;
        const shape = String(shapeValue || '');
        const shapes = {
            vertical: ['north', 'south'],
            'north-south': ['north', 'south'],
            horizontal: ['east', 'west'],
            'east-west': ['east', 'west'],
            'corner-ne': ['north', 'east'],
            'corner-es': ['east', 'south'],
            'corner-sw': ['south', 'west'],
            'corner-wn': ['west', 'north'],
            't-north': ['east', 'south', 'west'],
            't-east': ['north', 'south', 'west'],
            't-south': ['north', 'east', 'west'],
            't-west': ['north', 'east', 'south'],
            intersection: ['north', 'east', 'south', 'west']
        };
        if (shapes[shape]) return shapes[shape].slice();
        const end = shape.match(/^end-(north|east|south|west)$/)?.[1];
        return end ? [end] : [];
    },

    _edgeAnchor(direction, phase, inset = 0.1) {
        const cross = Number((0.2 + phase * 0.6).toFixed(3));
        if (direction === 'north') return { x: cross, y: inset };
        if (direction === 'east') return { x: 1 - inset, y: cross };
        if (direction === 'south') return { x: cross, y: 1 - inset };
        return { x: inset, y: cross };
    },

    _cornerJunctions(tile, resolver, paintedEdges) {
        const x = Number(tile?.x);
        const y = Number(tile?.y);
        if (typeof resolver !== 'function' || !Number.isFinite(x) || !Number.isFinite(y)) return [];
        return this.CORNERS.map(corner => {
            const touching = paintedEdges.filter(edge => corner.directions.includes(edge.direction));
            const diagonal = resolver(x + corner.dx, y + corner.dy);
            const diagonalBiome = diagonal ? this.biome(diagonal) : '';
            let kind = touching.length ? 'cap' : (diagonalBiome ? 'diagonal-only' : 'empty');
            let winnerDirection = touching[0]?.direction || '';
            if (touching.length === 1 && diagonalBiome === touching[0].sourceBiome) kind = 'extend';
            if (touching.length === 2) {
                if (touching[0].sourceBiome === touching[1].sourceBiome) {
                    kind = 'join';
                } else {
                    kind = 'split';
                    const ranked = touching.slice().sort((left, right) => {
                        const priority = this.profile(right.sourceBiome).edgePriority - this.profile(left.sourceBiome).edgePriority;
                        return priority || this._hash01(right.sharedEdgeKey, corner.id) - this._hash01(left.sharedEdgeKey, corner.id);
                    });
                    winnerDirection = ranked[0].direction;
                }
            }
            touching.forEach(edge => {
                let state = kind;
                if (kind === 'split') state = edge.direction === winnerDirection ? 'extend' : 'trim';
                edge.corners[corner.id] = state;
            });
            return {
                corner: corner.id,
                kind,
                directions: touching.map(edge => edge.direction),
                sources: touching.map(edge => edge.sourceBiome),
                diagonalBiome,
                winnerDirection
            };
        });
    },

    _jungleIdentityCover(tile) {
        if (this.biome(tile) !== 'jungle') return [];
        const x = Number(tile?.x);
        const y = Number(tile?.y);
        const phase = this._hash01(x, y, 'jungle-identity');
        const anchors = [
            { x: Number((0.22 + phase * 0.16).toFixed(3)), y: Number((0.22 + (1 - phase) * 0.12).toFixed(3)) },
            { x: Number((0.68 + (1 - phase) * 0.1).toFixed(3)), y: Number((0.68 + phase * 0.1).toFixed(3)) }
        ];
        return [
            {
                kind: 'biome-identity', id: `jungle-canopy-${x}-${y}`, label: 'jungle canopy', family: 'jungle',
                stratum: 'canopy', subLayer: 30, anchor: anchors[0], scale: 1.12, opacity: 0.96,
                rotation: Math.round(phase * 10 - 5), flipX: phase >= 0.5,
                role: 'decorative', mechanical: false, blocksMovement: false, blocksSight: false, destinationOwned: true
            },
            {
                kind: 'biome-identity', id: `jungle-undergrowth-${x}-${y}`, label: 'jungle undergrowth', family: 'jungle',
                stratum: 'undergrowth', subLayer: 20, anchor: anchors[1], scale: 0.76, opacity: 0.82,
                rotation: Math.round((1 - phase) * 8 - 4), flipX: phase < 0.5,
                role: 'decorative', mechanical: false, blocksMovement: false, blocksSight: false, destinationOwned: true
            }
        ];
    },

    compose(tile, resolver = null, options = {}) {
        const x = Number(tile?.x);
        const y = Number(tile?.y);
        const currentBiome = this.biome(tile);
        const currentProfile = this.profile(currentBiome);
        const canResolve = typeof resolver === 'function' && Number.isFinite(x) && Number.isFinite(y);
        const sharedEdges = [];
        const transitions = [];
        const cover = this._jungleIdentityCover(tile);
        if (canResolve) {
            for (const direction of this.DIRECTIONS) {
                const neighborX = x + direction.dx;
                const neighborY = y + direction.dy;
                const neighbor = resolver(neighborX, neighborY);
                if (!neighbor) continue;
                const neighborBiome = this.biome(neighbor);
                if (!neighborBiome || neighborBiome === currentBiome) continue;
                const sharedEdgeKey = this._sharedEdgeKey(x, y, neighborX, neighborY);
                const policy = this._edgePolicy(currentBiome, neighborBiome, sharedEdgeKey);
                if (policy.style === 'none') continue;
                const phase = Number(this._hash01(sharedEdgeKey, policy.sourceBiome, 'phase').toFixed(6));
                const destinationOwned = policy.destinationBiome === currentBiome;
                const descriptor = {
                    sharedEdgeKey,
                    direction: direction.id,
                    mirrorDirection: direction.opposite,
                    neighborBiome,
                    sourceBiome: policy.sourceBiome,
                    destinationBiome: policy.destinationBiome,
                    policy: policy.kind,
                    style: policy.style,
                    phase,
                    destinationOwned,
                    corners: {}
                };
                sharedEdges.push(descriptor);
                if (!destinationOwned || policy.kind !== 'ground-transition') continue;
                const sourceProfile = this.profile(policy.sourceBiome);
                const destinationProfile = this.profile(policy.destinationBiome);
                const transition = {
                    ...descriptor,
                    biome: policy.sourceBiome,
                    depth: policy.style === 'hard'
                        ? Math.min(0.22, Math.max(sourceProfile.edgeDepth, destinationProfile.edgeDepth))
                        : Math.max(sourceProfile.edgeDepth, destinationProfile.edgeDepth),
                    opacity: policy.style === 'hard'
                        ? 0.94
                        : Number(((sourceProfile.spillOpacity + destinationProfile.spillOpacity) / 2).toFixed(3))
                };
                transitions.push(transition);
                if (policy.style !== 'soft' || !sourceProfile.coverFamily || sourceProfile.spillScale <= 0) continue;
                const anchor = this._edgeAnchor(direction.id, phase, 0.1);
                cover.push({
                    kind: 'adjacent-spill',
                    id: `blend-${sharedEdgeKey.replace(/[^a-z0-9]+/gi, '-')}`,
                    label: policy.sourceBiome,
                    family: sourceProfile.coverFamily,
                    variant: Math.floor(this._hash01(sharedEdgeKey, 'spill-variant') * 4),
                    anchor,
                    scale: Number((sourceProfile.spillScale * (0.82 + phase * 0.18)).toFixed(3)),
                    opacity: sourceProfile.spillOpacity,
                    rotation: Math.round(phase * 12 - 6),
                    flipX: phase >= 0.5,
                    edgeBand: direction.id,
                    sharedEdgeKey,
                    role: 'decorative',
                    mechanical: false,
                    blocksMovement: false,
                    blocksSight: false,
                    sourceBiome: policy.sourceBiome,
                    sourceDirection: direction.id,
                    destinationOwned: true
                });
            }
        }
        const junctions = this._cornerJunctions(tile, resolver, transitions);

        const routeValue = tile?.overlays?.bridge || tile?.overlays?.road || null;
        const routeKind = tile?.overlays?.bridge ? 'bridge' : (tile?.overlays?.road ? 'road' : '');
        const routeConnections = routeValue
            ? this.connectionsForShape(options.routeShape || routeValue.direction, routeValue.connections)
            : [];
        const route = routeValue ? [{
            kind: routeKind === 'bridge' ? 'bridge-approach' : 'route-verge',
            subLayer: 10,
            biome: currentBiome,
            shoulder: currentProfile.routeShoulder,
            vergeFamily: currentProfile.coverFamily,
            connections: routeConnections,
            approachEdges: routeKind === 'bridge'
                ? this.DIRECTIONS.filter(direction => routeConnections.includes(direction.id))
                    .filter(direction => !canResolve || !resolver(x + direction.dx, y + direction.dy)?.overlays?.bridge)
                    .map(direction => direction.id)
                : [],
            clearanceRadius: currentProfile.routeClearance,
            destinationOwned: true
        }] : [];

        const hasFeature = Boolean(tile?.structure || tile?.hasLandmark || tile?.overlays?.poi);
        const feature = hasFeature ? [{
            kind: 'feature-grounding',
            subLayer: 10,
            biome: currentBiome,
            material: currentProfile.routeShoulder,
            approachEdges: Array.isArray(options.featureApproachEdges) ? options.featureApproachEdges.slice(0, 4) : [],
            clearanceRadius: currentProfile.featureClearance,
            destinationOwned: true
        }] : [];

        return {
            version: this.VERSION,
            biome: currentBiome,
            profile: {
                coverFamily: currentProfile.coverFamily,
                edgeDepth: currentProfile.edgeDepth,
                edgePriority: currentProfile.edgePriority,
                edgeStyle: currentProfile.edgeStyle,
                routeShoulder: currentProfile.routeShoulder,
                routeClearance: currentProfile.routeClearance,
                featureClearance: currentProfile.featureClearance
            },
            sharedEdges,
            junctions,
            terrain: transitions,
            route,
            cover,
            feature,
            clearance: {
                routeKind,
                routeConnections,
                routeRadius: routeValue ? currentProfile.routeClearance : 0,
                featureRadius: hasFeature ? currentProfile.featureClearance : 0,
                edgePadding: 0.08
            }
        };
    }
};

if (typeof window !== 'undefined') window.YAW_TILE_VISUAL_RECIPES = YAW_TILE_VISUAL_RECIPES;
