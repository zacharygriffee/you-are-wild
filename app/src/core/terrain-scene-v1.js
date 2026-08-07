/**
 * YOU ARE WILD TERRAIN SCENE V1
 *
 * Clean, renderer-neutral terrain input compiled directly from simulation-owned
 * world tiles. This module deliberately does not depend on Map Visuals, Tile
 * Composition V2, Tileset Pack V1, CSS classes, atlas coordinates, or DOM
 * controls.
 */

const YAW_TERRAIN_SCENE_V1 = (() => {
    const SCHEMA = 'yaw-terrain-scene';
    const VERSION = 1;
    const DEFAULT_CHUNK_SIZE = 16;
    const DEFAULT_APRON = 2;
    const DIRECTIONS = ['north', 'east', 'south', 'west'];
    const LAYERS = ['ground', 'hydrology', 'elevation', 'routes', 'cover', 'features', 'evidence', 'presence'];

    function integer(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.trunc(number) : fallback;
    }

    function number(value, fallback = 0) {
        const result = Number(value);
        return Number.isFinite(result) ? result : fallback;
    }

    function text(value, fallback = '', maxLength = 160) {
        const result = String(value ?? '').trim() || String(fallback ?? '');
        return result.slice(0, maxLength);
    }

    function boundedSize(value, fallback, minimum = 1, maximum = 128) {
        return Math.max(minimum, Math.min(maximum, integer(value, fallback)));
    }

    function directions(values = []) {
        const source = new Set((Array.isArray(values) ? values : []).map(value => text(value).toLowerCase()));
        return DIRECTIONS.filter(direction => source.has(direction));
    }

    function hash32(...parts) {
        const input = parts.map(part => String(part ?? '')).join('|');
        let hash = 2166136261;
        for (let index = 0; index < input.length; index += 1) {
            hash ^= input.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function chunkAddress(tileX, tileY, chunkSize = DEFAULT_CHUNK_SIZE) {
        const size = boundedSize(chunkSize, DEFAULT_CHUNK_SIZE);
        const x = Math.floor(integer(tileX) / size);
        const y = Math.floor(integer(tileY) / size);
        return { x, y, size, key: `${x},${y}` };
    }

    function chunkBounds(chunkX, chunkY, options = {}) {
        const size = boundedSize(options.chunkSize, DEFAULT_CHUNK_SIZE);
        const apron = boundedSize(options.apron, DEFAULT_APRON, 0, 8);
        const x = integer(chunkX);
        const y = integer(chunkY);
        const minX = x * size;
        const minY = y * size;
        const maxX = minX + size - 1;
        const maxY = minY + size - 1;
        return {
            chunk: { x, y, size },
            interior: { minX, minY, maxX, maxY, width: size, height: size },
            render: {
                minX: minX - apron,
                minY: minY - apron,
                maxX: maxX + apron,
                maxY: maxY + apron,
                width: size + apron * 2,
                height: size + apron * 2
            },
            apron
        };
    }

    function tileIdentity(tile, x, y) {
        return {
            x,
            y,
            localX: 0,
            localY: 0,
            key: `${x},${y}`,
            seed: hash32('terrain-scene-v1', x, y),
            known: Boolean(tile)
        };
    }

    function normalizeRoute(tile, identity) {
        const overlays = tile?.overlays || {};
        const bridge = overlays.bridge;
        const road = overlays.road;
        const source = bridge || road;
        if (!source) return null;
        let connections = directions(source.connections);
        if (!connections.length) {
            const axis = text(source.direction).toLowerCase();
            if (axis === 'north-south' || axis === 'vertical') connections = ['north', 'south'];
            if (axis === 'east-west' || axis === 'horizontal') connections = ['east', 'west'];
        }
        return {
            ...identity,
            kind: bridge ? 'bridge' : 'road',
            id: text(source.id, `${bridge ? 'bridge' : 'road'}:${identity.key}`, 120),
            connections,
            spanIndex: integer(source.spanIndex, 0),
            spanLength: boundedSize(source.spanLength, 1, 1, 128),
            spanRole: text(source.spanRole, 'single', 40)
        };
    }

    function normalizedRefs(values, kind, identity) {
        const source = Array.isArray(values) ? values : [];
        return source.slice(0, 64).map((value, index) => {
            const record = value && typeof value === 'object' ? value : { name: value };
            return {
                ...identity,
                kind,
                id: text(record.id || record.instanceId || record.resolutionId, `${kind}:${identity.key}:${index}`, 120),
                label: text(record.corpseName || record.displayName || record.name, kind),
                quantity: Math.max(1, integer(record.quantity, 1)),
                state: text(record.state, '', 60),
                family: text(record.family || record.species || record.type, '', 60),
                role: text(record.role, '', 60),
                anchor: record.anchor && typeof record.anchor === 'object' ? {
                    x: Math.max(0, Math.min(1, number(record.anchor.x, 0.5))),
                    y: Math.max(0, Math.min(1, number(record.anchor.y, 0.5)))
                } : null,
                scale: Math.max(0.2, Math.min(2, number(record.scale, 1))),
                mechanical: Boolean(record.mechanical),
                blocksMovement: Boolean(record.blocksMovement),
                blocksSight: Boolean(record.blocksSight),
                ordinal: index
            };
        });
    }

    function normalizeTile(tileValue, xValue, yValue) {
        const x = integer(xValue);
        const y = integer(yValue);
        const tile = tileValue && typeof tileValue === 'object' ? tileValue : null;
        const identity = tileIdentity(tile, x, y);
        if (!tile) {
            return {
                identity,
                ground: { ...identity, kind: 'unknown', biome: 'unknown', elevation: 0 },
                hydrology: [], elevation: [], routes: [], cover: [], features: [], evidence: [], presence: []
            };
        }

        const overlays = tile.overlays && typeof tile.overlays === 'object' ? tile.overlays : {};
        const topology = tile.terrainTopology || tile.terrain?.topology || {};
        const biome = text(tile.derivedBiome || tile.baseBiome || tile.biome, 'unknown', 80);
        const elevation = number(tile.elevation ?? tile.terrain?.elevation, 0);
        const ground = {
            ...identity,
            kind: 'ground',
            biome,
            elevation,
            moisture: number(tile.moisture ?? tile.terrain?.moisture, 0),
            heat: number(tile.heat ?? tile.terrain?.heat, 0),
            roughness: number(tile.roughness ?? tile.terrain?.roughness, 0),
            passable: tile.traversal?.passable !== false,
            traversalCost: number(tile.traversal?.traversalCost, 1)
        };
        const hydrology = (tile.water || tile.terrain?.water || biome === 'water' || overlays.shoreline)
            ? [{
                ...identity,
                kind: tile.water || tile.terrain?.water || biome === 'water' ? 'water' : 'shoreline',
                water: Boolean(tile.water || tile.terrain?.water || biome === 'water'),
                pressure: number(tile.waterPressure ?? tile.terrain?.waterPressure, 0),
                edges: directions(overlays.shoreline?.edges)
            }]
            : [];
        const elevationLayer = [{
            ...identity,
            kind: 'height-sample',
            value: elevation,
            type: text(topology.kind, 'level', 40),
            uphill: directions(topology.uphillEdges),
            downhill: directions(topology.downhillEdges),
            cliffs: directions(topology.cliffEdges),
            corners: {
                nw: number(topology.cornerElevations?.nw, elevation),
                ne: number(topology.cornerElevations?.ne, elevation),
                se: number(topology.cornerElevations?.se, elevation),
                sw: number(topology.cornerElevations?.sw, elevation)
            }
        }];
        const route = normalizeRoute(tile, identity);
        const cover = [
            ...normalizedRefs(overlays.cover, 'cover', identity),
            ...normalizedRefs(overlays.obstacles, 'obstacle', identity)
        ];
        const features = [];
        if (tile.structure || overlays.structure) {
            features.push({
                ...identity,
                kind: 'structure',
                id: text(overlays.structure?.id || tile.structure, `structure:${identity.key}`, 120),
                label: text(overlays.structure?.name || tile.structure, 'Structure'),
                category: text(overlays.structure?.category || tile.structure, 'structure', 80),
                footprint: {
                    width: boundedSize(overlays.structure?.footprint?.width || tile.featureFootprint?.width, 1, 1, 16),
                    height: boundedSize(overlays.structure?.footprint?.height || tile.featureFootprint?.height, 1, 1, 16),
                    part: text(overlays.structure?.footprint?.part || tile.featureFootprint?.part, 'single', 40)
                }
            });
        }
        if (overlays.poi || tile.hasLandmark) {
            features.push({
                ...identity,
                kind: overlays.poi ? 'poi' : 'landmark',
                id: text(overlays.poi?.id || tile.landmarkName, `feature:${identity.key}`, 120),
                label: text(overlays.poi?.name || tile.landmarkName, overlays.poi ? 'Point of interest' : 'Landmark'),
                category: text(overlays.poi?.category, '', 80),
                footprint: {
                    width: boundedSize(overlays.poi?.footprint?.width, 1, 1, 16),
                    height: boundedSize(overlays.poi?.footprint?.height, 1, 1, 16),
                    part: text(overlays.poi?.footprint?.part, 'single', 40)
                }
            });
        }
        const evidence = [
            ...normalizedRefs(tile.items, 'item', identity),
            ...normalizedRefs(tile.deathBags, 'recovery-bag', identity),
            ...normalizedRefs(tile.placedObjects, 'placed-object', identity)
        ];
        const presence = normalizedRefs(tile.creatures, 'creature', identity)
            .filter((_record, index) => tile.creatures[index]?.alive !== false && tile.creatures[index]?.dead !== true);

        return {
            identity, ground, hydrology, elevation: elevationLayer,
            routes: route ? [route] : [], cover, features, evidence, presence
        };
    }

    function compileChunk(options = {}) {
        if (typeof options.resolveTile !== 'function') throw new TypeError('Terrain scene compilation requires resolveTile(x, y)');
        const bounds = chunkBounds(options.chunkX, options.chunkY, options);
        const layers = Object.fromEntries(LAYERS.map(layer => [layer, []]));
        for (let y = bounds.render.minY; y <= bounds.render.maxY; y += 1) {
            for (let x = bounds.render.minX; x <= bounds.render.maxX; x += 1) {
                const normalized = normalizeTile(options.resolveTile(x, y), x, y);
                const place = record => ({
                    ...record,
                    localX: record.x - bounds.render.minX,
                    localY: record.y - bounds.render.minY
                });
                layers.ground.push(place(normalized.ground));
                for (const layer of LAYERS.slice(1)) layers[layer].push(...normalized[layer].map(place));
            }
        }
        const revision = text(options.worldRevision, 'unversioned', 120);
        return {
            schema: SCHEMA,
            version: VERSION,
            coordinateSpace: { unit: 'tile', xAxis: 'east-positive', yAxis: 'south-positive' },
            chunk: bounds.chunk,
            apron: bounds.apron,
            interiorBounds: bounds.interior,
            renderBounds: bounds.render,
            crop: {
                x: bounds.apron,
                y: bounds.apron,
                width: bounds.interior.width,
                height: bounds.interior.height
            },
            cache: {
                worldRevision: revision,
                sceneKey: `${SCHEMA}:v${VERSION}:${bounds.chunk.size}:${bounds.chunk.x},${bounds.chunk.y}:${revision}`
            },
            layers
        };
    }

    return {
        SCHEMA, VERSION, DEFAULT_CHUNK_SIZE, DEFAULT_APRON, DIRECTIONS, LAYERS,
        hash32, chunkAddress, chunkBounds, normalizeTile, compileChunk
    };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_SCENE_V1 = YAW_TERRAIN_SCENE_V1;
