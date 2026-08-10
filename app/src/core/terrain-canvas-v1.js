/**
 * YOU ARE WILD CANVAS TERRAIN BACKEND V1
 *
 * The first Terrain Scene V1 adapter. Terrain Scene remains purely semantic;
 * this backend owns the first-party material, contour, cover, route, feature,
 * evidence, and presence language. Rich atlases are optional renderer assets,
 * so a missing or mod-replaced art pack still has a deterministic procedural
 * fallback rather than changing simulation authority.
 */

const YAW_TERRAIN_CANVAS_V1 = (() => {
    const ID = 'yaw.canvas2d.v1';
    const PALETTE = Object.freeze({
        unknown: '#1a1c28', water: '#174c63', beach: '#cdb47a', sand: '#c5a865',
        plains: '#71834b', grove: '#496a3c', forest: '#294d36', jungle: '#1d4933',
        swamp: '#425842', cave: '#4b4a4b', cliff: '#696563', dungeon: '#3d4145',
        indoors: '#6b6255', farm: '#81784c'
    });
    const MATERIAL_CELLS = Object.freeze({
        plains: [0, 0], grove: [1, 0], forest: [2, 0], swamp: [0, 1], jungle: [1, 1],
        sand: [2, 1], beach: [2, 1], water: [0, 2], cliff: [1, 2], cave: [2, 2],
        dungeon: [2, 2], indoors: [2, 2], farm: [0, 0]
    });
    const STRUCTURE_CELLS = Object.freeze({
        camp: [0, 0], hut: [1, 0], ruins: [2, 0], spring: [3, 0], shrine: [0, 1],
        farm: [1, 1], village: [2, 1], settlement: [2, 1], cave: [3, 1], web: [0, 2],
        cabin: [1, 2], pond: [2, 2], tree: [3, 2], burrow: [0, 3], nest: [1, 3],
        'cave-mouth': [2, 3], cavemouth: [2, 3]
    });
    const POI_CELLS = Object.freeze({
        settlement: [0, 0], rest: [1, 0], 'rest-site': [1, 0], danger: [2, 0],
        'danger-site': [2, 0], resource: [0, 1], 'resource-site': [0, 1],
        landmark: [1, 1], structure: [2, 1]
    });
    const COVER_CELLS = Object.freeze({
        conifer: [0, 0], broadleaf: [1, 0], foliage: [1, 0], jungle: [2, 0],
        reeds: [3, 0], grass: [0, 1], drift: [1, 1], beach: [1, 1], scrub: [2, 1],
        rock: [3, 1], obstacle: [3, 1]
    });
    const EVIDENCE_CELLS = Object.freeze({
        item: [0, 0], provisions: [1, 0], remains: [2, 0], 'recovery-bag': [3, 0],
        depleted: [0, 1], 'placed-object': [1, 1], 'trail-marker': [2, 1], occupants: [3, 1]
    });
    const ASSET_IDS = Object.freeze([
        'atlas.materials-v2', 'atlas.bridge-v2', 'atlas.cover-v3', 'atlas.jungle-strata-v1',
        'atlas.biome-strata-v2', 'atlas.structures-v3', 'atlas.poi-v3', 'atlas.evidence-v3'
    ]);
    const SURFACE_PRIORITY = Object.freeze({
        water: 0,
        beach: 1,
        sand: 1,
        swamp: 2,
        plains: 3,
        farm: 3,
        grove: 4,
        forest: 5,
        jungle: 5,
        cliff: 6,
        cave: 6,
        indoors: 7,
        dungeon: 7,
        unknown: 99
    });
    const SOFT_BIOMES = new Set([
        'beach', 'sand', 'swamp', 'plains', 'farm', 'grove', 'forest', 'jungle'
    ]);
    const RELIEF_PROFILE = Object.freeze({
        water: { shade: 0, curvature: 0, contour: 0, plateau: 0, walls: false, wallDepth: 0 },
        unknown: { shade: 0, curvature: 0, contour: 0, plateau: 0, walls: false, wallDepth: 0 },
        beach: { shade: 0.24, curvature: 0.1, contour: 0.05, plateau: 0.012, walls: false, wallDepth: 0 },
        sand: { shade: 0.24, curvature: 0.1, contour: 0.05, plateau: 0.012, walls: false, wallDepth: 0 },
        plains: { shade: 0.32, curvature: 0.14, contour: 0.07, plateau: 0.014, walls: false, wallDepth: 0 },
        farm: { shade: 0.28, curvature: 0.12, contour: 0.06, plateau: 0.012, walls: false, wallDepth: 0 },
        swamp: { shade: 0.28, curvature: 0.12, contour: 0.055, plateau: 0.01, walls: false, wallDepth: 0 },
        grove: { shade: 0.26, curvature: 0.11, contour: 0.055, plateau: 0.008, walls: false, wallDepth: 0 },
        forest: { shade: 0.25, curvature: 0.1, contour: 0.05, plateau: 0.007, walls: false, wallDepth: 0 },
        jungle: { shade: 0.22, curvature: 0.09, contour: 0.045, plateau: 0.006, walls: false, wallDepth: 0 },
        cliff: { shade: 0.72, curvature: 0.34, contour: 0.2, plateau: 0.034, walls: true, wallDepth: 0.17 },
        cave: { shade: 0.62, curvature: 0.3, contour: 0.18, plateau: 0.03, walls: true, wallDepth: 0.145 },
        dungeon: { shade: 0.5, curvature: 0.24, contour: 0.14, plateau: 0.024, walls: true, wallDepth: 0.12 },
        indoors: { shade: 0.12, curvature: 0.04, contour: 0, plateau: 0, walls: false, wallDepth: 0 }
    });
    const assets = { key: '', promise: null, images: new Map() };
    const materialFieldCanvases = new Map();
    const noiseSamples = new Map();
    const MAX_NOISE_SAMPLES = 8192;

    function asset(id) {
        const image = assets.images.get(id);
        return image && (image.naturalWidth || image.width) ? image : null;
    }

    function prepareAssets(urls = {}) {
        const entries = ASSET_IDS.map(id => [id, String(urls[id] || '')]).filter(([, url]) => url);
        const key = entries.map(([id, url]) => `${id}:${url}`).join('|');
        if (!key || typeof Image === 'undefined') return Promise.resolve({ ready: false, count: 0 });
        if (assets.promise && assets.key === key) return assets.promise;
        assets.key = key;
        assets.images.clear();
        materialFieldCanvases.clear();
        assets.promise = Promise.all(entries.map(([id, url]) => new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => { assets.images.set(id, image); resolve(true); };
            image.onerror = () => resolve(false);
            image.src = url;
        }))).then(results => ({ ready: results.some(Boolean), count: results.filter(Boolean).length }));
        return assets.promise;
    }

    function assetStatus() {
        return { ready: assets.images.size > 0, count: assets.images.size };
    }

    function colorFor(record) {
        return PALETTE[record.biome] || PALETTE.unknown;
    }

    function point(seed, salt) {
        const hash = YAW_TERRAIN_SCENE_V1.hash32(seed, salt);
        return 0.18 + (hash / 0xffffffff) * 0.64;
    }

    function unitPoint(seed, salt) {
        return YAW_TERRAIN_SCENE_V1.hash32(seed, salt) / 0xffffffff;
    }

    function cachedUnitPoint(seed, column, row) {
        const key = `${seed}:${column},${row}`;
        const cached = noiseSamples.get(key);
        if (cached !== undefined) return cached;
        const value = unitPoint(seed, `${column},${row}`);
        if (noiseSamples.size >= MAX_NOISE_SAMPLES) {
            const oldest = noiseSamples.keys().next().value;
            noiseSamples.delete(oldest);
        }
        noiseSamples.set(key, value);
        return value;
    }

    function tileBox(record, tilePixels) {
        return {
            x: record.localX * tilePixels,
            y: record.localY * tilePixels,
            size: tilePixels,
            cx: (record.localX + 0.5) * tilePixels,
            cy: (record.localY + 0.5) * tilePixels
        };
    }

    function edgeLine(context, box, direction) {
        const endpoints = {
            north: [box.x, box.y, box.x + box.size, box.y],
            east: [box.x + box.size, box.y, box.x + box.size, box.y + box.size],
            south: [box.x, box.y + box.size, box.x + box.size, box.y + box.size],
            west: [box.x, box.y, box.x, box.y + box.size]
        };
        const line = endpoints[direction];
        if (!line) return;
        context.moveTo(line[0], line[1]);
        context.lineTo(line[2], line[3]);
    }

    function circle(context, x, y, radius, color) {
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }

    function triangle(context, x, y, radius, color) {
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(x, y - radius);
        context.lineTo(x + radius, y + radius);
        context.lineTo(x - radius, y + radius);
        context.fill();
    }

    function drawAtlasRect(context, id, source, destination, options = {}) {
        const image = asset(id);
        if (!image || typeof context.drawImage !== 'function') return false;
        const canTransform = typeof context.save === 'function' && typeof context.restore === 'function'
            && typeof context.translate === 'function' && typeof context.scale === 'function';
        if (canTransform && (options.flipX || options.flipY)) {
            context.save();
            context.globalAlpha = options.alpha ?? 1;
            context.translate(
                destination.x + (options.flipX ? destination.width : 0),
                destination.y + (options.flipY ? destination.height : 0)
            );
            context.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
            context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, destination.width, destination.height);
            context.restore();
        } else {
            if (typeof context.save === 'function') context.save();
            if ('globalAlpha' in context) context.globalAlpha = options.alpha ?? 1;
            context.drawImage(image, source.x, source.y, source.width, source.height,
                destination.x, destination.y, destination.width, destination.height);
            if (typeof context.restore === 'function') context.restore();
        }
        return true;
    }

    function gridSource(width, height, columns, rows, cell) {
        const [column, row] = cell;
        const x = Math.floor(column * width / columns);
        const y = Math.floor(row * height / rows);
        return {
            x, y,
            width: Math.floor((column + 1) * width / columns) - x,
            height: Math.floor((row + 1) * height / rows) - y
        };
    }

    function materialSource(biome) {
        const cell = MATERIAL_CELLS[biome];
        if (!cell) return false;
        const source = gridSource(768, 768, 3, 3, cell);
        // Stay inside the atlas cell so bilinear sampling never borrows a faint
        // row or column from its neighboring material at fractional zoom.
        const gutter = 1.25;
        return {
            x: source.x + gutter,
            y: source.y + gutter,
            width: source.width - gutter * 2,
            height: source.height - gutter * 2
        };
    }

    function drawMaterial(context, record, destination) {
        const source = materialSource(record.biome);
        if (!source) return false;
        return drawAtlasRect(context, 'atlas.materials-v2', source, destination, {
            flipX: Math.abs(Math.trunc(Number(record.x) || 0)) % 2 === 1,
            flipY: Math.abs(Math.trunc(Number(record.y) || 0)) % 2 === 1
        });
    }

    function materialFieldPattern(context, biome, tilePixels, originX, originY) {
        const image = asset('atlas.materials-v2');
        const source = materialSource(biome);
        const ownerDocument = context.canvas?.ownerDocument
            || (typeof document !== 'undefined' ? document : null);
        if (!image || !source || typeof context.createPattern !== 'function'
            || !ownerDocument?.createElement) return false;
        const tileSize = Math.max(1, Math.round(tilePixels));
        const parity = value => ((Math.trunc(Number(value) || 0) % 2) + 2) % 2;
        const fieldKey = `${assets.key}:${biome}:${tileSize}:${parity(originX)},${parity(originY)}`;
        let field = materialFieldCanvases.get(fieldKey);
        if (!field) {
            field = ownerDocument.createElement('canvas');
            field.width = tileSize * 2;
            field.height = tileSize * 2;
            const fieldContext = field.getContext?.('2d');
            if (!fieldContext) return false;
            fieldContext.imageSmoothingEnabled = true;
            for (let row = 0; row < 2; row += 1) {
                for (let column = 0; column < 2; column += 1) {
                    drawAtlasRect(fieldContext, 'atlas.materials-v2', source, {
                        x: column * tileSize,
                        y: row * tileSize,
                        width: tileSize,
                        height: tileSize
                    }, {
                        // Mirroring makes both sides of every repeat boundary share
                        // the same source pixels. The render-bound origin preserves
                        // the phase when this field is rebuilt in another chunk.
                        flipX: Math.abs(Math.trunc(originX + column)) % 2 === 1,
                        flipY: Math.abs(Math.trunc(originY + row)) % 2 === 1
                    });
                }
            }
            materialFieldCanvases.set(fieldKey, field);
        }
        return context.createPattern(field, 'repeat') || false;
    }

    function organicDepth(record, neighbor, direction, sample) {
        const edgeX = Math.min(record.x, neighbor.x);
        const edgeY = Math.min(record.y, neighbor.y);
        const axis = direction === 'east' || direction === 'west' ? 'vertical' : 'horizontal';
        const value = unitPoint('terrain-boundary-v2', `${edgeX},${edgeY}:${axis}:${sample}`);
        const seedPair = [record.seed, neighbor.seed].sort().join(':');
        const wave = Math.sin((sample / 6) * Math.PI * 2 + unitPoint('terrain-boundary-phase-v2', seedPair) * Math.PI);
        return 0.11 + value * 0.13 + (wave + 1) * 0.025;
    }

    function smoothstep(value) {
        const amount = Math.max(0, Math.min(1, Number(value) || 0));
        return amount * amount * (3 - 2 * amount);
    }

    function valueNoise(seed, x, y) {
        const left = Math.floor(x);
        const top = Math.floor(y);
        const u = smoothstep(x - left);
        const v = smoothstep(y - top);
        const northwest = cachedUnitPoint(seed, left, top);
        const northeast = cachedUnitPoint(seed, left + 1, top);
        const southwest = cachedUnitPoint(seed, left, top + 1);
        const southeast = cachedUnitPoint(seed, left + 1, top + 1);
        const north = northwest + (northeast - northwest) * u;
        const south = southwest + (southeast - southwest) * u;
        return north + (south - north) * v;
    }

    function noisePlane(seed, minX, maxX, minY, maxY) {
        const left = Math.floor(Math.min(minX, maxX)) - 1;
        const top = Math.floor(Math.min(minY, maxY)) - 1;
        const right = Math.ceil(Math.max(minX, maxX)) + 1;
        const bottom = Math.ceil(Math.max(minY, maxY)) + 1;
        const width = right - left + 1;
        const height = bottom - top + 1;
        const values = new Float32Array(width * height);
        for (let row = 0; row < height; row += 1) {
            for (let column = 0; column < width; column += 1) {
                values[row * width + column] = unitPoint(seed, `${left + column},${top + row}`);
            }
        }
        return (x, y) => {
            const cellX = Math.floor(x);
            const cellY = Math.floor(y);
            const column = cellX - left;
            const row = cellY - top;
            if (column < 0 || row < 0 || column + 1 >= width || row + 1 >= height) {
                return valueNoise(seed, x, y);
            }
            const u = smoothstep(x - cellX);
            const v = smoothstep(y - cellY);
            const index = row * width + column;
            const northwest = values[index];
            const northeast = values[index + 1];
            const southwest = values[index + width];
            const southeast = values[index + width + 1];
            const north = northwest + (northeast - northwest) * u;
            const south = southwest + (southeast - southwest) * u;
            return north + (south - north) * v;
        };
    }

    function recordGrid(records = []) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const record of records) {
            const x = Number(record?.x);
            const y = Number(record?.y);
            if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
        if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
            return { minX: 0, minY: 0, width: 0, height: 0, records: [], at: () => null };
        }
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const indexed = new Array(width * height);
        for (const record of records) {
            const x = Number(record?.x);
            const y = Number(record?.y);
            if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
            indexed[(y - minY) * width + (x - minX)] = record;
        }
        const at = (x, y) => {
            const column = x - minX;
            const row = y - minY;
            if (!Number.isInteger(column) || !Number.isInteger(row)
                || column < 0 || row < 0 || column >= width || row >= height) return null;
            return indexed[row * width + column] || null;
        };
        return { minX, minY, width, height, records: indexed, at };
    }

    function prepareSoftBiomeSeeds(records = []) {
        return new Map(records.filter(record => record?.known && SOFT_BIOMES.has(record.biome)).map(record => [
            `${record.x},${record.y}`,
            {
                record,
                centerX: record.x + 0.5
                    + (unitPoint('soft-biome-seed-x-v1', record.seed) - 0.5) * 0.24,
                centerY: record.y + 0.5
                    + (unitPoint('soft-biome-seed-y-v1', record.seed) - 0.5) * 0.24,
                bias: (SURFACE_PRIORITY[record.biome] ?? 50) * 0.018
                    + Math.max(0, Math.min(1, Number(record.elevation) || 0)) * 0.045
            }
        ]));
    }

    function softBiomeOwner(recordsByWorldPosition, worldX, worldY, preparedSeeds = null, indexed = null, warp = null) {
        const tileX = Math.floor(worldX);
        const tileY = Math.floor(worldY);
        const base = indexed?.recordAt?.(tileX, tileY)
            || recordsByWorldPosition.get(`${tileX},${tileY}`);
        if (!base?.known || base.biome === 'unknown') return null;
        if (!SOFT_BIOMES.has(base.biome) && !isWater(base)) return base;

        // Distort one shared world-space sampling plane instead of perturbing
        // individual tile edges. Every chunk therefore asks the same question
        // at the same world coordinate, including corners and negative space.
        const frequency = 0.61;
        const noiseX = warp?.x
            ? warp.x(worldX * frequency, worldY * frequency)
            : valueNoise('soft-biome-warp-x-v1', worldX * frequency, worldY * frequency);
        const noiseY = warp?.y
            ? warp.y(worldX * frequency, worldY * frequency)
            : valueNoise('soft-biome-warp-y-v1', worldX * frequency, worldY * frequency);
        const warpedX = worldX + (noiseX - 0.5) * 0.76;
        const warpedY = worldY + (noiseY - 0.5) * 0.76;
        const originX = Math.floor(warpedX);
        const originY = Math.floor(warpedY);
        const seeds = preparedSeeds || prepareSoftBiomeSeeds([...recordsByWorldPosition.values()]);
        let owner = null;
        let bestScore = Infinity;
        for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
                const seed = indexed?.seedAt?.(originX + dx, originY + dy)
                    || seeds.get(`${originX + dx},${originY + dy}`);
                if (!seed) continue;
                const candidate = seed.record;
                const distanceX = warpedX - seed.centerX;
                const distanceY = warpedY - seed.centerY;
                // Lower ecological surfaces expand modestly into higher ones;
                // distance remains dominant so every authored tile keeps a
                // readable core and the renderer never changes simulation facts.
                const score = distanceX * distanceX + distanceY * distanceY + seed.bias;
                if (score < bestScore - 0.0000001
                    || (Math.abs(score - bestScore) <= 0.0000001
                        && owner && transitionOwner(owner, candidate) === candidate)) {
                    owner = candidate;
                    bestScore = score;
                }
            }
        }
        if (owner) return owner;
        return SOFT_BIOMES.has(base.biome) ? base : null;
    }

    function softBiomeField(records, bounds, samplesPerTile = 12) {
        const samples = Math.max(6, Math.min(32, Math.round(Number(samplesPerTile) || 12)));
        const width = Math.max(1, Math.round(bounds.width * samples));
        const height = Math.max(1, Math.round(bounds.height * samples));
        const byWorldPosition = new Map(records.map(record => [`${record.x},${record.y}`, record]));
        const preparedSeeds = prepareSoftBiomeSeeds(records);
        const grid = recordGrid(records);
        const seedRecords = new Array(grid.records.length);
        for (let index = 0; index < grid.records.length; index += 1) {
            const record = grid.records[index];
            if (!record) continue;
            seedRecords[index] = preparedSeeds.get(`${record.x},${record.y}`) || null;
        }
        const gridIndex = (x, y) => {
            const column = x - grid.minX;
            const row = y - grid.minY;
            if (!Number.isInteger(column) || !Number.isInteger(row)
                || column < 0 || row < 0 || column >= grid.width || row >= grid.height) return -1;
            return row * grid.width + column;
        };
        const indexed = {
            recordAt: grid.at,
            seedAt: (x, y) => {
                const index = gridIndex(x, y);
                return index < 0 ? null : (seedRecords[index] || null);
            }
        };
        const frequency = 0.61;
        const warp = {
            x: noisePlane('soft-biome-warp-x-v1', bounds.minX * frequency,
                (bounds.minX + bounds.width) * frequency, bounds.minY * frequency,
                (bounds.minY + bounds.height) * frequency),
            y: noisePlane('soft-biome-warp-y-v1', bounds.minX * frequency,
                (bounds.minX + bounds.width) * frequency, bounds.minY * frequency,
                (bounds.minY + bounds.height) * frequency)
        };
        const owners = new Array(width * height);
        for (let row = 0; row < height; row += 1) {
            const worldY = bounds.minY + (row + 0.5) / samples;
            for (let column = 0; column < width; column += 1) {
                const worldX = bounds.minX + (column + 0.5) / samples;
                owners[row * width + column] = softBiomeOwner(
                    byWorldPosition, worldX, worldY, preparedSeeds, indexed, warp
                )?.biome || null;
            }
        }
        return { width, height, samplesPerTile: samples, owners };
    }

    function drawContinuousSoftBiomeField(context, scene, tilePixels) {
        const ownerDocument = context.canvas?.ownerDocument
            || (typeof document !== 'undefined' ? document : null);
        if (!asset('atlas.materials-v2') || !ownerDocument?.createElement
            || typeof context.drawImage !== 'function') return false;
        const authoredSoftBiomes = new Set(scene.layers.ground
            .filter(record => record?.known && SOFT_BIOMES.has(record.biome))
            .map(record => record.biome));
        // The base material pass is already continuous for a homogeneous soft
        // surface. Avoid constructing an ownership raster for the overwhelmingly
        // common survey-map case where it could not change a single pixel.
        if (authoredSoftBiomes.size <= 1) return true;
        // A ten-to-twelve sample mask is smooth once Canvas scales it with
        // interpolation, while remaining cheap enough for synchronous mount.
        // DPR changes the final texture raster, not semantic ownership.
        const samplesPerTile = 18;
        const field = softBiomeField(scene.layers.ground, scene.renderBounds, samplesPerTile);
        const materialBiomes = [...new Set(field.owners.filter(Boolean).filter(biome => SOFT_BIOMES.has(biome)))];
        if (!materialBiomes.length) return false;
        // The base paint is already one world-aligned mirrored field. There is
        // no boundary mask to composite when a chunk contains one soft biome.
        if (materialBiomes.length === 1) return true;
        const width = scene.renderBounds.width * tilePixels;
        const height = scene.renderBounds.height * tilePixels;
        const mask = ownerDocument.createElement('canvas');
        mask.width = field.width;
        mask.height = field.height;
        const maskContext = mask.getContext?.('2d');
        const layer = ownerDocument.createElement('canvas');
        layer.width = Math.max(1, Math.round(width));
        layer.height = Math.max(1, Math.round(height));
        const layerContext = layer.getContext?.('2d');
        if (!maskContext?.createImageData || !maskContext?.putImageData || !layerContext) return false;
        for (const biome of materialBiomes) {
            const image = maskContext.createImageData(field.width, field.height);
            for (let index = 0; index < field.owners.length; index += 1) {
                if (field.owners[index] !== biome) continue;
                const offset = index * 4;
                image.data[offset] = 255;
                image.data[offset + 1] = 255;
                image.data[offset + 2] = 255;
                image.data[offset + 3] = 255;
            }
            maskContext.clearRect(0, 0, field.width, field.height);
            maskContext.putImageData(image, 0, 0);
            layerContext.clearRect(0, 0, layer.width, layer.height);
            const pattern = materialFieldPattern(layerContext, biome, tilePixels,
                scene.renderBounds.minX, scene.renderBounds.minY);
            if (!pattern) return false;
            layerContext.fillStyle = pattern;
            layerContext.fillRect(0, 0, layer.width, layer.height);
            layerContext.save();
            layerContext.globalCompositeOperation = 'destination-in';
            layerContext.imageSmoothingEnabled = true;
            layerContext.drawImage(mask, 0, 0, field.width, field.height,
                0, 0, layer.width, layer.height);
            layerContext.restore();
            context.drawImage(layer, 0, 0, layer.width, layer.height,
                0, 0, width, height);
        }
        return true;
    }

    function waterField(records, bounds, samplesPerTile = 18) {
        const samples = Math.max(8, Math.min(32, Math.round(Number(samplesPerTile) || 18)));
        const width = Math.max(1, Math.round(bounds.width * samples));
        const height = Math.max(1, Math.round(bounds.height * samples));
        const grid = recordGrid(records);
        const seededValues = new Float32Array(grid.records.length);
        const seedValue = record => {
            if (!record?.known || record.biome === 'unknown') return 0;
            const variation = (unitPoint('water-center-value-v1', record.seed) - 0.5) * 0.16;
            return Math.max(0, Math.min(1, (isWater(record) ? 0.84 : 0.16) + variation));
        };
        for (let index = 0; index < grid.records.length; index += 1) {
            seededValues[index] = seedValue(grid.records[index]);
        }
        const valueAt = (x, y) => {
            const column = x - grid.minX;
            const row = y - grid.minY;
            if (!Number.isInteger(column) || !Number.isInteger(row)
                || column < 0 || row < 0 || column >= grid.width || row >= grid.height) return 0;
            return seededValues[row * grid.width + column];
        };
        const values = new Float32Array(width * height);
        const frequency = 1.08;
        const warpXNoise = noisePlane('water-field-warp-x-v1', bounds.minX * frequency,
            (bounds.minX + bounds.width) * frequency, bounds.minY * frequency,
            (bounds.minY + bounds.height) * frequency);
        const warpYNoise = noisePlane('water-field-warp-y-v1', bounds.minX * frequency,
            (bounds.minX + bounds.width) * frequency, bounds.minY * frequency,
            (bounds.minY + bounds.height) * frequency);
        for (let row = 0; row < height; row += 1) {
            const worldY = bounds.minY + (row + 0.5) / samples;
            for (let column = 0; column < width; column += 1) {
                const worldX = bounds.minX + (column + 0.5) / samples;
                const warpedX = worldX
                    + (warpXNoise(worldX * frequency, worldY * frequency) - 0.5) * 0.92
                    + Math.sin(worldY * 2.05 + 1.37) * 0.18
                    + Math.sin(worldY * 0.71 - 0.82) * 0.11;
                const warpedY = worldY
                    + (warpYNoise(worldX * frequency, worldY * frequency) - 0.5) * 0.68
                    + Math.sin(worldX * 2.17 - 0.43) * 0.18
                    + Math.sin(worldX * 0.67 + 1.12) * 0.11;
                const gridX = warpedX - 0.5;
                const gridY = warpedY - 0.5;
                const left = Math.floor(gridX);
                const top = Math.floor(gridY);
                const u = smoothstep(gridX - left);
                const v = smoothstep(gridY - top);
                const northwest = valueAt(left, top);
                const northeast = valueAt(left + 1, top);
                const southwest = valueAt(left, top + 1);
                const southeast = valueAt(left + 1, top + 1);
                const north = northwest + (northeast - northwest) * u;
                const south = southwest + (southeast - southwest) * u;
                values[row * width + column] = north + (south - north) * v;
            }
        }
        return { width, height, samplesPerTile: samples, values };
    }

    function drawContinuousWaterField(context, scene, tilePixels) {
        const waterCount = scene.layers.ground.filter(isWater).length;
        if (!waterCount) return false;
        // A uniform water chunk already received the continuous base pattern.
        if (waterCount === scene.layers.ground.length) return true;
        const ownerDocument = context.canvas?.ownerDocument
            || (typeof document !== 'undefined' ? document : null);
        if (!asset('atlas.materials-v2') || !ownerDocument?.createElement
            || typeof context.drawImage !== 'function') return false;
        const field = waterField(scene.layers.ground, scene.renderBounds, 18);
        const mask = ownerDocument.createElement('canvas');
        mask.width = field.width;
        mask.height = field.height;
        const maskContext = mask.getContext?.('2d');
        const width = scene.renderBounds.width * tilePixels;
        const height = scene.renderBounds.height * tilePixels;
        const layer = ownerDocument.createElement('canvas');
        layer.width = Math.max(1, Math.round(width));
        layer.height = Math.max(1, Math.round(height));
        const layerContext = layer.getContext?.('2d');
        if (!maskContext?.createImageData || !maskContext?.putImageData || !layerContext) return false;
        const image = maskContext.createImageData(field.width, field.height);
        for (let index = 0; index < field.values.length; index += 1) {
            // A narrow interpolated threshold gives the coast an anti-aliased
            // lip without introducing a second shoreline stroke.
            const alpha = Math.max(0, Math.min(1, (field.values[index] - 0.47) / 0.06));
            const offset = index * 4;
            image.data[offset] = 255;
            image.data[offset + 1] = 255;
            image.data[offset + 2] = 255;
            image.data[offset + 3] = Math.round(alpha * 255);
        }
        maskContext.putImageData(image, 0, 0);
        const pattern = materialFieldPattern(layerContext, 'water', tilePixels,
            scene.renderBounds.minX, scene.renderBounds.minY);
        if (!pattern) return false;
        layerContext.fillStyle = pattern;
        layerContext.fillRect(0, 0, layer.width, layer.height);
        layerContext.save();
        layerContext.globalCompositeOperation = 'destination-in';
        layerContext.imageSmoothingEnabled = true;
        layerContext.drawImage(mask, 0, 0, field.width, field.height,
            0, 0, layer.width, layer.height);
        layerContext.restore();
        context.drawImage(layer, 0, 0, layer.width, layer.height,
            0, 0, width, height);
        return true;
    }

    function transitionOwner(record, neighbor) {
        const recordPriority = SURFACE_PRIORITY[record.biome] ?? 50;
        const neighborPriority = SURFACE_PRIORITY[neighbor.biome] ?? 50;
        if (recordPriority !== neighborPriority) return recordPriority < neighborPriority ? record : neighbor;
        const recordElevation = Number(record.elevation) || 0;
        const neighborElevation = Number(neighbor.elevation) || 0;
        if (Math.abs(recordElevation - neighborElevation) > 0.001) {
            return recordElevation < neighborElevation ? record : neighbor;
        }
        if (record.biome !== neighbor.biome) return record.biome < neighbor.biome ? record : neighbor;
        return record;
    }

    function pathRectangle(context, x, y, width, height) {
        context.moveTo(x, y);
        context.lineTo(x + width, y);
        context.lineTo(x + width, y + height);
        context.lineTo(x, y + height);
        context.closePath();
    }

    function drawSharedMaterialSeams(context, records, tilePixels, fieldBackedBiomes = new Set()) {
        if (!asset('atlas.materials-v2') || typeof context.save !== 'function'
            || typeof context.restore !== 'function' || typeof context.clip !== 'function'
            || typeof context.closePath !== 'function') return false;
        const byPosition = new Map(records.map(record => [`${record.localX},${record.localY}`, record]));
        const bands = [
            { width: 0.16, alpha: 0.2 },
            { width: 0.095, alpha: 0.34 },
            { width: 0.035, alpha: 0.58 }
        ];
        const paint = (record, neighbor, direction) => {
            if (!neighbor || record.biome !== neighbor.biome || fieldBackedBiomes.has(record.biome)) return;
            const source = materialSource(record.biome);
            if (!source) return;
            const box = tileBox(record, tilePixels);
            const vertical = direction === 'east';
            const edge = vertical ? box.x + box.size : box.y + box.size;
            const destination = vertical
                ? { x: edge - tilePixels / 2, y: box.y, width: tilePixels, height: tilePixels }
                : { x: box.x, y: edge - tilePixels / 2, width: tilePixels, height: tilePixels };
            for (const band of bands) {
                const size = tilePixels * band.width;
                context.save();
                context.beginPath();
                if (vertical) pathRectangle(context, edge - size / 2, box.y, size, box.size);
                else pathRectangle(context, box.x, edge - size / 2, box.size, size);
                context.clip();
                drawAtlasRect(context, 'atlas.materials-v2', source, destination, { alpha: band.alpha });
                context.restore();
            }
        };
        for (const record of records) {
            paint(record, byPosition.get(`${record.localX + 1},${record.localY}`), 'east');
            paint(record, byPosition.get(`${record.localX},${record.localY + 1}`), 'south');
        }
        return true;
    }

    function isWater(record) {
        return record?.biome === 'water';
    }

    function nearestLandUnderpaint(record, byWorldPosition) {
        if (!isWater(record)) return record;
        for (let radius = 1; radius <= 2; radius += 1) {
            const candidates = [];
            for (let dy = -radius; dy <= radius; dy += 1) {
                for (let dx = -radius; dx <= radius; dx += 1) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
                    const candidate = byWorldPosition.get(`${record.x + dx},${record.y + dy}`);
                    if (!candidate || isWater(candidate) || candidate.biome === 'unknown') continue;
                    candidates.push(candidate);
                }
            }
            const coast = candidates.find(candidate => candidate.biome === 'beach' || candidate.biome === 'sand');
            if (coast) return coast;
            if (candidates.length) return candidates[0];
        }
        return record;
    }

    function waterFieldValue(record, byWorldPosition) {
        const center = isWater(record) ? 1 : 0;
        const neighbors = [
            byWorldPosition.get(`${record.x},${record.y - 1}`),
            byWorldPosition.get(`${record.x + 1},${record.y}`),
            byWorldPosition.get(`${record.x},${record.y + 1}`),
            byWorldPosition.get(`${record.x - 1},${record.y}`)
        ];
        const neighborWater = neighbors.reduce((sum, neighbor) => sum + (isWater(neighbor) ? 1 : 0), 0) / neighbors.length;
        const organicOffset = (unitPoint('water-contour-v2', `${record.x},${record.y}`) - 0.5) * 0.12;
        return Math.max(0, Math.min(1, center * 0.64 + neighborWater * 0.36 + organicOffset));
    }

    function clippedTriangle(points, threshold = 0.5) {
        const output = [];
        for (let index = 0; index < points.length; index += 1) {
            const current = points[index];
            const previous = points[(index + points.length - 1) % points.length];
            const currentInside = current.value >= threshold;
            const previousInside = previous.value >= threshold;
            if (currentInside !== previousInside) {
                const span = current.value - previous.value;
                const amount = span ? (threshold - previous.value) / span : 0.5;
                output.push({
                    x: previous.x + (current.x - previous.x) * amount,
                    y: previous.y + (current.y - previous.y) * amount,
                    value: threshold
                });
            }
            if (currentInside) output.push(current);
        }
        return output;
    }

    function reliefProfile(biome) {
        return RELIEF_PROFILE[biome] || RELIEF_PROFILE.plains;
    }

    function bilinearHeight(corners, x, y) {
        const u = Math.max(0, Math.min(1, Number(x) || 0));
        const v = Math.max(0, Math.min(1, Number(y) || 0));
        if (!corners || ['nw', 'ne', 'se', 'sw'].some(corner => corners[corner] === null || corners[corner] === undefined)) return null;
        const nw = Number(corners?.nw);
        const ne = Number(corners?.ne);
        const se = Number(corners?.se);
        const sw = Number(corners?.sw);
        if (![nw, ne, se, sw].every(Number.isFinite)) return null;
        const north = nw + (ne - nw) * u;
        const south = sw + (se - sw) * u;
        return north + (south - north) * v;
    }

    function elevationFieldCorners(field, record) {
        if (!field || !record || !Number.isInteger(field.width) || !Number.isInteger(field.height)) return null;
        const column = Math.round(Number(record.localX));
        const row = Math.round(Number(record.localY));
        if (column < 0 || row < 0 || column + 1 >= field.width || row + 1 >= field.height) return null;
        const sample = (x, y) => {
            const index = y * field.width + x;
            return field.validity?.[index] ? Number(field.values?.[index]) : null;
        };
        const corners = {
            nw: sample(column, row),
            ne: sample(column + 1, row),
            se: sample(column + 1, row + 1),
            sw: sample(column, row + 1)
        };
        return Object.values(corners).every(Number.isFinite) ? corners : null;
    }

    function heightFieldSample(field, x, y) {
        if (!field || field.width < 2 || field.height < 2) return null;
        const boundedX = Math.max(0, Math.min(field.width - 1, Number(x) || 0));
        const boundedY = Math.max(0, Math.min(field.height - 1, Number(y) || 0));
        const column = Math.min(field.width - 2, Math.floor(boundedX));
        const row = Math.min(field.height - 2, Math.floor(boundedY));
        const u = boundedX - column;
        const v = boundedY - row;
        const sample = (sampleX, sampleY) => {
            const index = sampleY * field.width + sampleX;
            return field.validity?.[index] ? Number(field.values?.[index]) : null;
        };
        const corners = {
            nw: sample(column, row), ne: sample(column + 1, row),
            se: sample(column + 1, row + 1), sw: sample(column, row + 1)
        };
        return bilinearHeight(corners, u, v);
    }

    function heightFieldDifferential(field, x, y, radius = 0.42) {
        const center = heightFieldSample(field, x, y);
        if (center === null) return null;
        const west = heightFieldSample(field, x - radius, y);
        const east = heightFieldSample(field, x + radius, y);
        const north = heightFieldSample(field, x, y - radius);
        const south = heightFieldSample(field, x, y + radius);
        if (![west, east, north, south].every(Number.isFinite)) return null;
        const divisor = Math.max(0.001, radius * 2);
        return {
            height: center,
            gradientX: (east - west) / divisor,
            gradientY: (south - north) / divisor,
            laplacian: west + east + north + south - center * 4
        };
    }

    function contourEdgePoint(corners, threshold, edge) {
        const endpoints = {
            north: ['nw', 'ne', [0, 0], [1, 0]],
            east: ['ne', 'se', [1, 0], [1, 1]],
            south: ['sw', 'se', [0, 1], [1, 1]],
            west: ['nw', 'sw', [0, 0], [0, 1]]
        }[edge];
        if (!endpoints) return null;
        const [firstKey, secondKey, firstPoint, secondPoint] = endpoints;
        const first = Number(corners[firstKey]);
        const second = Number(corners[secondKey]);
        const span = second - first;
        const amount = Math.abs(span) < 0.000001 ? 0.5 : Math.max(0, Math.min(1, (threshold - first) / span));
        return {
            edge,
            x: firstPoint[0] + (secondPoint[0] - firstPoint[0]) * amount,
            y: firstPoint[1] + (secondPoint[1] - firstPoint[1]) * amount
        };
    }

    function contourEdgePairs(mask, centerHigh) {
        const fixed = {
            1: [['west', 'north']], 2: [['north', 'east']], 3: [['west', 'east']],
            4: [['east', 'south']], 6: [['north', 'south']], 7: [['west', 'south']],
            8: [['south', 'west']], 9: [['north', 'south']], 11: [['east', 'south']],
            12: [['west', 'east']], 13: [['north', 'east']], 14: [['west', 'north']]
        };
        if (mask === 5) return centerHigh
            ? [['west', 'south'], ['north', 'east']]
            : [['west', 'north'], ['east', 'south']];
        if (mask === 10) return centerHigh
            ? [['west', 'north'], ['east', 'south']]
            : [['north', 'east'], ['south', 'west']];
        return fixed[mask] || [];
    }

    function contoursForCorners(corners, terraceCount = 6) {
        const cornerKeys = ['nw', 'ne', 'se', 'sw'];
        const values = cornerKeys.map(corner => Number(corners[corner]));
        const minimum = Math.min(...values);
        const maximum = Math.max(...values);
        const center = values.reduce((sum, value) => sum + value, 0) / values.length;
        const contours = [];
        for (let level = 1; level < terraceCount; level += 1) {
            const threshold = level / terraceCount;
            if (threshold <= minimum || threshold >= maximum) continue;
            const mask = cornerKeys.reduce((value, corner, index) => (
                value | (Number(corners[corner]) >= threshold ? (1 << index) : 0)
            ), 0);
            if (mask === 0 || mask === 15) continue;
            contours.push({
                level,
                threshold,
                mask,
                segments: contourEdgePairs(mask, center >= threshold).map(([firstEdge, secondEdge]) => ({
                    from: contourEdgePoint(corners, threshold, firstEdge),
                    to: contourEdgePoint(corners, threshold, secondEdge)
                }))
            });
        }
        return contours;
    }

    function reliefGeometry(records, tilePixels = 1, elevationField = null) {
        const plateaus = [];
        const contours = [];
        for (const sourceRecord of records || []) {
            const canonicalCorners = elevationFieldCorners(elevationField, sourceRecord);
            const terraceCount = Math.max(1, Math.min(8, Math.trunc(Number(sourceRecord?.terraceCount) || 6)));
            const record = canonicalCorners
                ? { ...sourceRecord, corners: canonicalCorners, contours: contoursForCorners(canonicalCorners, terraceCount) }
                : sourceRecord;
            if (!record?.known || !record.corners) continue;
            const profile = reliefProfile(record.biome);
            if (!profile.shade && !profile.plateau && !profile.walls) continue;
            const box = tileBox(record, tilePixels);
            const corners = [
                { x: box.x, y: box.y, value: Number(record.corners.nw) },
                { x: box.x + box.size, y: box.y, value: Number(record.corners.ne) },
                { x: box.x + box.size, y: box.y + box.size, value: Number(record.corners.se) },
                { x: box.x, y: box.y + box.size, value: Number(record.corners.sw) }
            ];
            if (!corners.every(corner => Number.isFinite(corner.value))) continue;
            const minimumCorner = Math.min(...corners.map(corner => corner.value));
            const maximumCorner = Math.max(...corners.map(corner => corner.value));
            const center = {
                x: box.cx,
                y: box.cy,
                value: corners.reduce((sum, corner) => sum + corner.value, 0) / corners.length
            };
            if (maximumCorner - minimumCorner > 0.001) {
                for (let level = 1; level < terraceCount; level += 1) {
                    const threshold = level / terraceCount;
                    const triangles = [
                        [corners[0], corners[1], center],
                        [corners[1], corners[2], center],
                        [corners[2], corners[3], center],
                        [corners[3], corners[0], center]
                    ];
                    for (const triangle of triangles) {
                        const points = clippedTriangle(triangle, threshold);
                        if (points.length >= 3) plateaus.push({ record, profile, level, threshold, points });
                    }
                }
            }
            for (const contour of record.contours || []) {
                for (const segment of contour.segments || []) {
                    if (![segment?.from?.x, segment?.from?.y, segment?.to?.x, segment?.to?.y].every(value => Number.isFinite(Number(value)))) continue;
                    contours.push({
                        record,
                        profile,
                        level: Number(contour.level) || 0,
                        threshold: Number(contour.threshold) || 0,
                        from: { x: box.x + Number(segment.from.x) * box.size, y: box.y + Number(segment.from.y) * box.size },
                        to: { x: box.x + Number(segment.to.x) * box.size, y: box.y + Number(segment.to.y) * box.size },
                        localFrom: { x: Number(segment.from.x), y: Number(segment.from.y) },
                        localTo: { x: Number(segment.to.x), y: Number(segment.to.y) }
                    });
                }
            }
        }
        return { plateaus, contours };
    }

    function lowSideNormal(segment) {
        const dx = segment.localTo.x - segment.localFrom.x;
        const dy = segment.localTo.y - segment.localFrom.y;
        const length = Math.hypot(dx, dy) || 1;
        const first = { x: -dy / length, y: dx / length };
        const second = { x: -first.x, y: -first.y };
        const middle = {
            x: (segment.localFrom.x + segment.localTo.x) / 2,
            y: (segment.localFrom.y + segment.localTo.y) / 2
        };
        const epsilon = 0.035;
        const firstHeight = bilinearHeight(segment.record.corners, middle.x + first.x * epsilon, middle.y + first.y * epsilon);
        const secondHeight = bilinearHeight(segment.record.corners, middle.x + second.x * epsilon, middle.y + second.y * epsilon);
        if (firstHeight === null || secondHeight === null || Math.abs(firstHeight - secondHeight) < 0.000001) {
            return first.x + first.y >= second.x + second.y ? first : second;
        }
        return firstHeight < secondHeight ? first : second;
    }

    function drawHillshadeField(context, scene, tilePixels, pixelRatio = 1) {
        const field = scene?.elevationField;
        const ownerDocument = context.canvas?.ownerDocument
            || (typeof document !== 'undefined' ? document : null);
        if (!field || !ownerDocument?.createElement || typeof context.drawImage !== 'function') return false;
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let index = 0; index < field.values.length; index += 1) {
            if (!field.validity[index]) continue;
            const value = Number(field.values[index]);
            if (!Number.isFinite(value)) continue;
            minimum = Math.min(minimum, value);
            maximum = Math.max(maximum, value);
        }
        if (!Number.isFinite(minimum) || maximum - minimum <= 0.001) return true;
        const samplesPerTile = Math.max(5, Math.min(12, Math.round(5 * Math.max(1, pixelRatio))));
        const raster = ownerDocument.createElement('canvas');
        raster.width = Math.max(1, (field.width - 1) * samplesPerTile);
        raster.height = Math.max(1, (field.height - 1) * samplesPerTile);
        const rasterContext = raster.getContext?.('2d');
        if (!rasterContext?.createImageData || !rasterContext?.putImageData) return false;
        const image = rasterContext.createImageData(raster.width, raster.height);
        const groundByLocal = new Map((scene.layers.ground || []).map(record => [`${record.localX},${record.localY}`, record]));
        const light = { x: -0.48, y: -0.62, z: 0.62 };
        const lightLength = Math.hypot(light.x, light.y, light.z);
        light.x /= lightLength;
        light.y /= lightLength;
        light.z /= lightLength;
        for (let py = 0; py < raster.height; py += 1) {
            const row = Math.min(field.height - 2, Math.floor(py / samplesPerTile));
            for (let px = 0; px < raster.width; px += 1) {
                const column = Math.min(field.width - 2, Math.floor(px / samplesPerTile));
                const ground = groundByLocal.get(`${column},${row}`);
                const profile = reliefProfile(ground?.biome);
                if (!ground?.known || !profile.shade) continue;
                const sampleX = (px + 0.5) / samplesPerTile;
                const sampleY = (py + 0.5) / samplesPerTile;
                const differential = heightFieldDifferential(field, sampleX, sampleY);
                if (!differential) continue;
                const gradientX = differential.gradientX;
                const gradientY = differential.gradientY;
                const reliefScale = profile.walls ? 8.5 : 5.5;
                let nx = -gradientX * reliefScale;
                let ny = -gradientY * reliefScale;
                let nz = 1;
                const normalLength = Math.hypot(nx, ny, nz) || 1;
                nx /= normalLength;
                ny /= normalLength;
                nz /= normalLength;
                const directional = nx * light.x + ny * light.y + nz * light.z - 0.64;
                const curvature = Math.max(-0.5, Math.min(0.5, -differential.laplacian * 4.2));
                const intensity = Math.max(-1, Math.min(1, directional + curvature * 0.34));
                const offset = (py * raster.width + px) * 4;
                const lightPixel = intensity >= 0;
                image.data[offset] = lightPixel ? 255 : 18;
                image.data[offset + 1] = lightPixel ? 250 : 20;
                image.data[offset + 2] = lightPixel ? 235 : 24;
                image.data[offset + 3] = Math.round(Math.min(0.72,
                    Math.abs(intensity) * profile.shade + Math.abs(curvature) * profile.curvature) * 255);
            }
        }
        rasterContext.putImageData(image, 0, 0);
        if (typeof context.save === 'function') context.save();
        if ('globalCompositeOperation' in context) context.globalCompositeOperation = 'soft-light';
        context.drawImage(raster, 0, 0, raster.width, raster.height, 0, 0,
            (field.width - 1) * tilePixels, (field.height - 1) * tilePixels);
        if (typeof context.restore === 'function') context.restore();
        return true;
    }

    function drawElevationRelief(context, records, tilePixels, elevationField = null) {
        const geometry = reliefGeometry(records, tilePixels, elevationField);
        const supportsPaths = typeof context.save === 'function' && typeof context.restore === 'function'
            && typeof context.closePath === 'function' && typeof context.fill === 'function';
        if (supportsPaths) {
            const plateauGroups = new Map();
            for (const plateau of geometry.plateaus) {
                if (!plateau.profile.plateau) continue;
                const key = `${plateau.profile.plateau}:${plateau.level}`;
                if (!plateauGroups.has(key)) plateauGroups.set(key, { ...plateau, polygons: [] });
                plateauGroups.get(key).polygons.push(plateau.points);
            }
            context.save();
            if ('globalCompositeOperation' in context) context.globalCompositeOperation = 'soft-light';
            for (const group of plateauGroups.values()) {
                context.fillStyle = `rgba(255,246,220,${Math.min(0.09, group.profile.plateau + group.level * 0.002)})`;
                context.beginPath();
                for (const polygon of group.polygons) {
                    context.moveTo(polygon[0].x, polygon[0].y);
                    for (let index = 1; index < polygon.length; index += 1) context.lineTo(polygon[index].x, polygon[index].y);
                    context.closePath();
                }
                context.fill();
            }
            context.restore();

            for (const segment of geometry.contours.filter(entry => !entry.profile.walls && entry.profile.contour)) {
                const normal = lowSideNormal(segment);
                const offset = tilePixels * (0.008 + Math.min(6, segment.level) * 0.0015);
                context.save();
                context.strokeStyle = `rgba(19,17,18,${segment.profile.contour})`;
                context.lineWidth = Math.max(0.55, tilePixels * 0.012);
                context.beginPath();
                context.moveTo(segment.from.x + normal.x * offset, segment.from.y + normal.y * offset);
                context.lineTo(segment.to.x + normal.x * offset, segment.to.y + normal.y * offset);
                context.stroke();
                context.strokeStyle = `rgba(249,241,214,${segment.profile.contour * 0.72})`;
                context.lineWidth = Math.max(0.45, tilePixels * 0.007);
                context.beginPath();
                context.moveTo(segment.from.x, segment.from.y);
                context.lineTo(segment.to.x, segment.to.y);
                context.stroke();
                context.restore();
            }

            const wallSegments = geometry.contours.filter(entry => entry.profile.walls);
            const wallSegmentsByRecord = new Map();
            for (const segment of wallSegments) {
                if (!wallSegmentsByRecord.has(segment.record.key)) wallSegmentsByRecord.set(segment.record.key, []);
                wallSegmentsByRecord.get(segment.record.key).push(segment);
            }
            const faceSegments = [];
            for (const segments of wallSegmentsByRecord.values()) {
                const terraceCount = Math.max(2, Number(segments[0]?.record?.terraceCount) || 6);
                const canonicalLevel = Math.round(terraceCount / 2);
                const preferredLevel = segments.some(segment => segment.level === canonicalLevel)
                    ? canonicalLevel
                    : segments.slice().sort((left, right) => (
                        Math.abs(left.threshold - 0.5) - Math.abs(right.threshold - 0.5)
                        || left.level - right.level
                    ))[0]?.level;
                faceSegments.push(...segments.filter(segment => segment.level === preferredLevel));
            }

            // A steep cell can cross most terrace thresholds. Extruding every
            // contour makes parallel rock faces read like roads or brick
            // courses. Keep every threshold in the shared height field and
            // plateau shading, but project one canonical scarp per cell.
            for (const segment of faceSegments) {
                const normal = lowSideNormal(segment);
                // Canvas uses one fixed-north reading of relief. South-facing
                // drops open toward the viewer, east/west faces remain narrow,
                // and north-facing drops reduce to a rear lip. Giving every
                // orientation equal depth makes a plateau read like a road.
                const towardViewer = Math.max(0, normal.y);
                const sideFacing = 1 - Math.abs(normal.y);
                const faceVisibility = Math.max(0.02, towardViewer + sideFacing * 0.18);
                const baseDepth = tilePixels * Math.min(0.19,
                    segment.profile.wallDepth * (0.72 + Math.min(6, segment.level) * 0.055));
                const depth = baseDepth * faceVisibility;
                const facePoint = amount => {
                    const localX = segment.localFrom.x
                        + (segment.localTo.x - segment.localFrom.x) * amount;
                    const localY = segment.localFrom.y
                        + (segment.localTo.y - segment.localFrom.y) * amount;
                    const worldX = segment.record.x + localX;
                    const worldY = segment.record.y + localY;
                    const variation = 0.76 + unitPoint('cliff-face-depth-v1',
                        `${Math.round(worldX * 48)},${Math.round(worldY * 48)}:${segment.level}`) * 0.42;
                    const straightTopX = segment.from.x + (segment.to.x - segment.from.x) * amount;
                    const straightTopY = segment.from.y + (segment.to.y - segment.from.y) * amount;
                    const lipJitter = Math.max(tilePixels * 0.006, depth * 0.18)
                        * (unitPoint('cliff-face-lip-v2',
                            `${Math.round(worldX * 64)},${Math.round(worldY * 64)}:${segment.level}`) - 0.5) * 2;
                    const topX = straightTopX + normal.x * lipJitter;
                    const topY = straightTopY + normal.y * lipJitter;
                    return {
                        topX, topY,
                        x: topX + normal.x * depth * variation,
                        y: topY + normal.y * depth * variation,
                        variation
                    };
                };
                const top = Array.from({ length: 7 }, (_, index) => facePoint(index / 6));
                const bottom = top.slice().reverse();
                context.save();
                const faceAlpha = 0.28 + faceVisibility * 0.5;
                context.fillStyle = segment.record.biome === 'cliff'
                    ? `rgba(48,43,40,${faceAlpha})`
                    : `rgba(24,23,25,${Math.min(0.78, faceAlpha + 0.02)})`;
                context.beginPath();
                context.moveTo(top[0].topX, top[0].topY);
                for (const point of top.slice(1)) context.lineTo(point.topX, point.topY);
                for (const point of bottom) context.lineTo(point.x, point.y);
                context.closePath();
                context.fill();
                context.strokeStyle = `rgba(226,218,196,${0.2 + faceVisibility * 0.28})`;
                context.lineWidth = Math.max(0.7, tilePixels * (0.009 + faceVisibility * 0.007));
                context.beginPath();
                context.moveTo(top[0].topX, top[0].topY);
                for (const point of top.slice(1)) context.lineTo(point.topX, point.topY);
                context.stroke();
                context.strokeStyle = `rgba(224,205,180,${0.08 + faceVisibility * 0.12})`;
                context.lineWidth = Math.max(0.65, tilePixels * 0.008);
                for (const amount of [0.28, 0.58, 0.81]) {
                    const point = facePoint(amount);
                    const fracture = depth * (0.22 + unitPoint('cliff-face-fracture-v1',
                        `${segment.record.x},${segment.record.y}:${segment.level}:${amount}`) * 0.38);
                    context.beginPath();
                    context.moveTo(point.topX + normal.x * depth * 0.18, point.topY + normal.y * depth * 0.18);
                    context.lineTo(point.topX + normal.x * fracture, point.topY + normal.y * fracture);
                    context.stroke();
                }
                context.strokeStyle = `rgba(17,13,14,${0.18 + faceVisibility * 0.32})`;
                context.lineWidth = Math.max(0.8, tilePixels * (0.012 + faceVisibility * 0.022));
                context.beginPath();
                context.moveTo(bottom[0].x + normal.x * depth * 0.12, bottom[0].y + normal.y * depth * 0.12);
                for (const point of bottom.slice(1)) {
                    context.lineTo(point.x + normal.x * depth * 0.12, point.y + normal.y * depth * 0.12);
                }
                context.stroke();
                context.restore();
            }
        }

        // Mechanical cliff edges remain authoritative even when an authored or
        // legacy tile does not provide marching-contour segments. Draw each
        // downhill edge once and keep the fallback strictly presentational.
        // A canonical height field already describes the face inside any tile
        // that owns a contour. Painting its old cardinal barrier as well would
        // lay a straight, road-like cross over the continuous plateau.
        if (elevationField) return geometry;
        const contouredRecords = new Set(geometry.contours.map(segment => segment.record.key));
        const paintedEdges = new Set();
        for (const record of records || []) {
            if (!record?.known || !record.cliffs?.length || contouredRecords.has(record.key)) continue;
            const box = tileBox(record, tilePixels);
            for (const direction of record.cliffs) {
                const canonical = direction === 'east' ? `${record.x + 1},${record.y}:vertical`
                    : direction === 'west' ? `${record.x},${record.y}:vertical`
                        : direction === 'south' ? `${record.x},${record.y + 1}:horizontal`
                            : `${record.x},${record.y}:horizontal`;
                if (paintedEdges.has(canonical)) continue;
                const delta = Number(record.terraceEdges?.[direction]) || 0;
                if (delta > 0) continue;
                paintedEdges.add(canonical);
                context.strokeStyle = 'rgba(37,31,29,0.78)';
                context.lineWidth = Math.max(1, tilePixels * (delta < 0 ? 0.07 : 0.035));
                context.beginPath();
                edgeLine(context, box, direction);
                context.stroke();
            }
        }
        return geometry;
    }

    function drawWaterContinuum(context, records, tilePixels) {
        if (typeof context.save !== 'function' || typeof context.restore !== 'function'
            || typeof context.clip !== 'function' || typeof context.closePath !== 'function') return false;
        const byPosition = new Map(records.map(record => [`${record.localX},${record.localY}`, record]));
        const byWorldPosition = new Map(records.map(record => [`${record.x},${record.y}`, record]));
        if (!records.some(isWater)) return false;
        context.save();
        context.beginPath();
        let polygons = 0;
        for (const northwest of records) {
            const northeast = byPosition.get(`${northwest.localX + 1},${northwest.localY}`);
            const southeast = byPosition.get(`${northwest.localX + 1},${northwest.localY + 1}`);
            const southwest = byPosition.get(`${northwest.localX},${northwest.localY + 1}`);
            if (!northeast || !southeast || !southwest) continue;
            const x0 = (northwest.localX + 0.5) * tilePixels;
            const y0 = (northwest.localY + 0.5) * tilePixels;
            const x1 = x0 + tilePixels;
            const y1 = y0 + tilePixels;
            const corners = [
                { x: x0, y: y0, value: waterFieldValue(northwest, byWorldPosition) },
                { x: x1, y: y0, value: waterFieldValue(northeast, byWorldPosition) },
                { x: x1, y: y1, value: waterFieldValue(southeast, byWorldPosition) },
                { x: x0, y: y1, value: waterFieldValue(southwest, byWorldPosition) }
            ];
            let centerValue = corners.reduce((sum, corner) => sum + corner.value, 0) / corners.length;
            if (Math.abs(centerValue - 0.5) < 0.001) {
                centerValue += unitPoint('water-contour-center-v2', `${northwest.x},${northwest.y}`) > 0.5 ? 0.025 : -0.025;
            }
            const center = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, value: centerValue };
            const triangles = [
                [corners[0], corners[1], center],
                [corners[1], corners[2], center],
                [corners[2], corners[3], center],
                [corners[3], corners[0], center]
            ];
            for (const triangle of triangles) {
                const polygon = clippedTriangle(triangle);
                if (polygon.length < 3) continue;
                context.moveTo(polygon[0].x, polygon[0].y);
                for (let index = 1; index < polygon.length; index += 1) context.lineTo(polygon[index].x, polygon[index].y);
                context.closePath();
                polygons += 1;
            }
        }
        if (!polygons) {
            context.restore();
            return false;
        }
        context.clip();
        for (const record of records) {
            const destination = {
                x: record.localX * tilePixels,
                y: record.localY * tilePixels,
                width: tilePixels,
                height: tilePixels
            };
            if (!drawMaterial(context, { ...record, biome: 'water' }, destination)) {
                context.fillStyle = PALETTE.water;
                context.fillRect(destination.x, destination.y, destination.width, destination.height);
            }
        }
        context.restore();
        return true;
    }

    function decorativeDensityFor(tilePixels, densityOverride = null) {
        // Chunk rasters are a level-of-detail boundary. At survey resolution,
        // material texture carries biome identity and dense full-atlas canopy
        // draws are both visually noisy and disproportionately expensive.
        return densityOverride != null && Number.isFinite(Number(densityOverride))
            ? Math.max(0, Math.min(1, Number(densityOverride)))
            : (tilePixels <= 36 ? 0.26 : (tilePixels <= 52 ? 0.58 : 1));
    }

    function drawBiomeStrata(context, record, tilePixels, densityOverride = null) {
        if (!asset('atlas.biome-strata-v2') && !asset('atlas.jungle-strata-v1')) return false;
        const baseDensity = { plains: 0.34, grove: 0.78, forest: 0.92, swamp: 0.67, jungle: 0.9, cliff: 0.32, cave: 0.26 }[record.biome] || 0;
        const detailDensity = decorativeDensityFor(tilePixels, densityOverride);
        const density = baseDensity * detailDensity;
        if (!density || unitPoint(record.seed, 'biome-strata-density') > density) return false;
        const box = tileBox(record, tilePixels);
        const scaleBase = { plains: 0.62, grove: 0.92, forest: 1.04, swamp: 0.74, jungle: 1.12, cliff: 0.62, cave: 0.62 }[record.biome] || 0.75;
        const scale = scaleBase * (0.9 + unitPoint(record.seed, 'biome-strata-scale') * 0.24);
        const width = tilePixels * scale;
        const height = tilePixels * scale;
        const offsetX = (unitPoint(record.seed, 'biome-strata-x') - 0.5) * tilePixels * 0.34;
        const offsetY = (unitPoint(record.seed, 'biome-strata-y') - 0.5) * tilePixels * 0.28;
        const destination = { x: box.cx - width / 2 + offsetX, y: box.cy - height / 2 + offsetY, width, height };
        const flipX = unitPoint(record.seed, 'biome-strata-flip') > 0.5;
        if (record.biome === 'jungle') {
            const jungleRects = [
                { x: 44, y: 241, width: 398, height: 406 },
                { x: 483, y: 252, width: 384, height: 377 },
                { x: 923, y: 253, width: 407, height: 382 }
            ];
            const source = jungleRects[YAW_TERRAIN_SCENE_V1.hash32(record.seed, 'jungle-variant') % jungleRects.length];
            return drawAtlasRect(context, 'atlas.jungle-strata-v1', source, destination, { alpha: 0.82, flipX });
        }
        const cell = { grove: [0, 0], forest: [1, 0], plains: [2, 0], swamp: [3, 0], cliff: [4, 0], cave: [4, 0] }[record.biome];
        return cell ? drawAtlasRect(context, 'atlas.biome-strata-v2', gridSource(1500, 600, 5, 2, cell), destination, {
            alpha: record.biome === 'forest' || record.biome === 'grove' ? 0.84 : 0.66,
            flipX
        }) : false;
    }

    function drawGroundTexture(context, record, tilePixels) {
        if (record.biome === 'unknown') return;
        const box = tileBox(record, tilePixels);
        const position = (index, axis) => {
            const value = unitPoint(record.seed, `ambient-${record.biome}-${axis}:${index}`);
            return (axis === 'x' ? box.x : box.y) + (value * 1.12 - 0.06) * tilePixels;
        };
        const shortStroke = (index, color, length = 0.09) => {
            const x = position(index, 'x');
            const y = position(index, 'y');
            const lean = (unitPoint(record.seed, `ambient-lean:${index}`) - 0.5) * tilePixels * 0.08;
            context.strokeStyle = color;
            context.lineWidth = Math.max(0.7, tilePixels * 0.012);
            context.beginPath();
            context.moveTo(x, y + tilePixels * length * 0.5);
            context.lineTo(x + lean, y - tilePixels * length * 0.5);
            context.stroke();
        };
        if (record.biome === 'water') {
            context.strokeStyle = 'rgba(133,214,225,0.24)';
            context.lineWidth = Math.max(0.7, tilePixels * 0.012);
            for (let index = 0; index < 3; index += 1) {
                const x = box.x + unitPoint(record.seed, `water-x:${index}`) * tilePixels * 0.65;
                const y = box.y + (0.22 + index * 0.28) * tilePixels;
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(x + tilePixels * (0.18 + unitPoint(record.seed, `water-l:${index}`) * 0.18), y);
                context.stroke();
            }
            return;
        }
        if (record.biome === 'beach' || record.biome === 'sand') {
            for (let index = 0; index < 7; index += 1) {
                circle(context, position(index, 'x'), position(index, 'y'), tilePixels * 0.012, 'rgba(112,91,53,0.32)');
            }
            return;
        }
        if (record.biome === 'plains' || record.biome === 'farm') {
            for (let index = 0; index < 7; index += 1) shortStroke(index, 'rgba(43,72,31,0.42)', 0.1);
            return;
        }
        if (record.biome === 'swamp') {
            for (let index = 0; index < 2; index += 1) {
                circle(context, position(index, 'x'), position(index, 'y'), tilePixels * (0.07 + index * 0.015), 'rgba(31,69,61,0.55)');
            }
            for (let index = 2; index < 7; index += 1) shortStroke(index, 'rgba(92,113,62,0.58)', 0.15);
            return;
        }
        if (record.biome === 'grove' || record.biome === 'forest' || record.biome === 'jungle') {
            const count = record.biome === 'jungle' ? 7 : (record.biome === 'forest' ? 5 : 3);
            for (let index = 0; index < count; index += 1) {
                const x = position(index, 'x');
                const y = position(index, 'y');
                const scale = 0.07 + unitPoint(record.seed, `tree-scale:${index}`) * 0.045;
                if (record.biome === 'forest') triangle(context, x, y, tilePixels * scale, 'rgba(21,63,39,0.72)');
                else circle(context, x, y, tilePixels * scale, record.biome === 'jungle' ? 'rgba(28,91,48,0.72)' : 'rgba(39,91,48,0.66)');
            }
            return;
        }
        if (record.biome === 'cliff' || record.biome === 'cave') {
            const count = record.biome === 'cliff' ? 5 : 3;
            for (let index = 0; index < count; index += 1) {
                triangle(context, position(index, 'x'), position(index, 'y'), tilePixels * 0.045,
                    record.biome === 'cliff' ? 'rgba(45,42,41,0.48)' : 'rgba(24,24,26,0.42)');
            }
        }
    }

    function drawGroundTransitions(context, records, tilePixels) {
        const byPosition = new Map(records.map(record => [`${record.localX},${record.localY}`, record]));
        const hardBiomes = new Set(['unknown', 'cliff', 'cave', 'indoors', 'dungeon']);
        const paint = (record, neighbor, direction) => {
            if (!neighbor || record.biome === neighbor.biome) return;
            // Water is rendered as one continuous scalar field below. Painting it
            // again per tile would restore the square shoreline this path removes.
            if (isWater(record) || isWater(neighbor)) return;
            if (hardBiomes.has(record.biome) || hardBiomes.has(neighbor.biome)) return;
            const owner = transitionOwner(record, neighbor);
            const target = owner === record ? neighbor : record;
            const targetDirection = owner === record
                ? ({ east: 'west', south: 'north' }[direction])
                : direction;
            const box = tileBox(target, tilePixels);
            if (typeof context.save === 'function' && typeof context.restore === 'function'
                && typeof context.clip === 'function' && typeof context.closePath === 'function') {
                const samples = Array.from({ length: 7 }, (_, index) => organicDepth(record, neighbor, targetDirection, index));
                context.save();
                context.beginPath();
                if (targetDirection === 'east') {
                    context.moveTo(box.x + box.size, box.y);
                    context.lineTo(box.x + box.size, box.y + box.size);
                    for (let index = samples.length - 1; index >= 0; index -= 1) {
                        context.lineTo(box.x + box.size - samples[index] * box.size, box.y + box.size * index / (samples.length - 1));
                    }
                } else if (targetDirection === 'west') {
                    context.moveTo(box.x, box.y);
                    context.lineTo(box.x, box.y + box.size);
                    for (let index = samples.length - 1; index >= 0; index -= 1) {
                        context.lineTo(box.x + samples[index] * box.size, box.y + box.size * index / (samples.length - 1));
                    }
                } else if (targetDirection === 'south') {
                    context.moveTo(box.x, box.y + box.size);
                    context.lineTo(box.x + box.size, box.y + box.size);
                    for (let index = samples.length - 1; index >= 0; index -= 1) {
                        context.lineTo(box.x + box.size * index / (samples.length - 1), box.y + box.size - samples[index] * box.size);
                    }
                } else {
                    context.moveTo(box.x, box.y);
                    context.lineTo(box.x + box.size, box.y);
                    for (let index = samples.length - 1; index >= 0; index -= 1) {
                        context.lineTo(box.x + box.size * index / (samples.length - 1), box.y + samples[index] * box.size);
                    }
                }
                context.closePath();
                context.clip();
                if ('globalAlpha' in context) context.globalAlpha = 0.94;
                const ownerAtTarget = { ...owner, x: target.x, y: target.y };
                if (!drawMaterial(context, ownerAtTarget, { x: box.x, y: box.y, width: box.size, height: box.size })) {
                    context.fillStyle = colorFor(owner);
                    context.fillRect(box.x, box.y, box.size, box.size);
                }
                context.restore();
                return;
            }
            if (typeof context.createLinearGradient !== 'function') return;
            const half = tilePixels * 0.12;
            const vertical = targetDirection === 'east' || targetDirection === 'west';
            const positive = targetDirection === 'east' || targetDirection === 'south';
            const edge = vertical
                ? box.x + (positive ? box.size : 0)
                : box.y + (positive ? box.size : 0);
            const gradient = vertical
                ? context.createLinearGradient(edge - half, 0, edge + half, 0)
                : context.createLinearGradient(0, edge - half, 0, edge + half);
            gradient.addColorStop(0, positive ? colorFor(target) : colorFor(owner));
            gradient.addColorStop(1, positive ? colorFor(owner) : colorFor(target));
            context.fillStyle = gradient;
            if (vertical) context.fillRect(edge - half, box.y, half * 2, box.size);
            else context.fillRect(box.x, edge - half, box.size, half * 2);
        };
        for (const record of records) {
            paint(record, byPosition.get(`${record.localX + 1},${record.localY}`), 'east');
            paint(record, byPosition.get(`${record.localX},${record.localY + 1}`), 'south');
        }
    }

    function drawGroundCorners(context, records, tilePixels) {
        if (typeof context.save !== 'function' || typeof context.restore !== 'function'
            || typeof context.clip !== 'function' || typeof context.closePath !== 'function') return false;
        const byPosition = new Map(records.map(record => [`${record.localX},${record.localY}`, record]));
        const hardBiomes = new Set(['unknown', 'cliff', 'cave', 'indoors', 'dungeon']);
        let painted = 0;
        for (const northwest of records) {
            const northeast = byPosition.get(`${northwest.localX + 1},${northwest.localY}`);
            const southeast = byPosition.get(`${northwest.localX + 1},${northwest.localY + 1}`);
            const southwest = byPosition.get(`${northwest.localX},${northwest.localY + 1}`);
            if (!northeast || !southeast || !southwest) continue;
            const cornerRecords = [northwest, northeast, southeast, southwest];
            const biomes = new Set(cornerRecords.map(record => record.biome));
            if (biomes.size < 2 || cornerRecords.some(record => isWater(record) || hardBiomes.has(record.biome))) continue;
            const owner = cornerRecords.reduce((current, record) => transitionOwner(current, record));
            const cornerX = northwest.x + 1;
            const cornerY = northwest.y + 1;
            const x = (northwest.localX + 1) * tilePixels;
            const y = (northwest.localY + 1) * tilePixels;
            const radius = tilePixels * (0.19 + unitPoint('terrain-corner-radius-v1', `${cornerX},${cornerY}`) * 0.045);
            context.save();
            context.beginPath();
            const points = 10;
            for (let index = 0; index < points; index += 1) {
                const angle = -Math.PI / 2 + index * Math.PI * 2 / points;
                const variance = 0.86 + unitPoint('terrain-corner-shape-v1', `${cornerX},${cornerY}:${index}`) * 0.24;
                const px = x + Math.cos(angle) * radius * variance;
                const py = y + Math.sin(angle) * radius * variance;
                if (!index) context.moveTo(px, py);
                else context.lineTo(px, py);
            }
            context.closePath();
            context.clip();
            if ('globalAlpha' in context) context.globalAlpha = 0.94;
            const materialAtCorner = { ...owner, x: cornerX, y: cornerY };
            const destination = { x: x - tilePixels / 2, y: y - tilePixels / 2, width: tilePixels, height: tilePixels };
            if (!drawMaterial(context, materialAtCorner, destination)) {
                context.fillStyle = colorFor(owner);
                context.fillRect(destination.x, destination.y, destination.width, destination.height);
            }
            context.restore();
            painted += 1;
        }
        return painted > 0;
    }

    function contextFor(target) {
        if (target && typeof target.getContext === 'function') return target.getContext('2d');
        if (target && typeof target.fillRect === 'function') return target;
        return null;
    }

    function create(target, options = {}) {
        const context = contextFor(target);
        if (!context) throw new TypeError('Canvas terrain renderer requires a canvas or CanvasRenderingContext2D');
        const canvas = target?.getContext ? target : context.canvas;
        let tilePixels = Math.max(8, Math.min(256, Number(options.tilePixels) || 64));
        let pixelRatio = Math.max(1, Math.min(4, Number(options.pixelRatio) || 1));
        const decorativeDensity = options.decorativeDensity == null
            ? null
            : Math.max(0, Math.min(1, Number(options.decorativeDensity) || 0));

        function resize(scene) {
            const width = scene.renderBounds.width * tilePixels;
            const height = scene.renderBounds.height * tilePixels;
            if (canvas) {
                canvas.width = Math.round(width * pixelRatio);
                canvas.height = Math.round(height * pixelRatio);
                if (canvas.style) {
                    canvas.style.width = `${width}px`;
                    canvas.style.height = `${height}px`;
                }
            }
            if (typeof context.setTransform === 'function') context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            return { width, height };
        }

        function render(scene) {
            if (scene?.schema !== YAW_TERRAIN_SCENE_V1.SCHEMA || scene?.version !== YAW_TERRAIN_SCENE_V1.VERSION) {
                throw new TypeError('Canvas terrain renderer requires Terrain Scene V1');
            }
            const size = resize(scene);
            context.clearRect(0, 0, size.width, size.height);
            const groundByWorldPosition = new Map(scene.layers.ground.map(record => [`${record.x},${record.y}`, record]));
            const materialFields = new Map();
            const fieldBackedBiomes = new Set();
            const fieldFor = biome => {
                if (materialFields.has(biome)) return materialFields.get(biome);
                const field = materialFieldPattern(context, biome, tilePixels,
                    scene.renderBounds.minX, scene.renderBounds.minY);
                materialFields.set(biome, field);
                return field;
            };
            for (const ground of scene.layers.ground) {
                const underpaint = nearestLandUnderpaint(ground, groundByWorldPosition);
                const material = { ...underpaint, x: ground.x, y: ground.y };
                const destination = {
                    x: ground.localX * tilePixels,
                    y: ground.localY * tilePixels,
                    width: tilePixels,
                    height: tilePixels
                };
                const field = fieldFor(material.biome);
                if (field) {
                    context.fillStyle = field;
                    context.fillRect(destination.x, destination.y, destination.width, destination.height);
                    fieldBackedBiomes.add(ground.biome);
                } else if (!drawMaterial(context, material, destination)) {
                    context.fillStyle = colorFor(material);
                    context.fillRect(destination.x, destination.y, destination.width, destination.height);
                }
            }
            drawSharedMaterialSeams(context, scene.layers.ground, tilePixels, fieldBackedBiomes);
            const continuousSoftField = drawContinuousSoftBiomeField(context, scene, tilePixels);
            // The old edge/corner path remains a procedural fallback for a
            // minimal Canvas implementation or an art pack without materials.
            if (!continuousSoftField) {
                drawGroundTransitions(context, scene.layers.ground, tilePixels);
                drawGroundCorners(context, scene.layers.ground, tilePixels);
            }
            if (!drawContinuousWaterField(context, scene, tilePixels)) {
                drawWaterContinuum(context, scene.layers.ground, tilePixels);
            }
            for (const ground of scene.layers.ground) {
                if (!asset('atlas.materials-v2')) drawGroundTexture(context, ground, tilePixels);
                drawBiomeStrata(context, ground, tilePixels, decorativeDensity);
            }
            // Relief is presentation over the material field, not another
            // ground texture. Painting strata after hillshade erased slope and
            // ridge cues, especially in wooded biomes.
            drawHillshadeField(context, scene, tilePixels, pixelRatio);
            drawElevationRelief(context, scene.layers.elevation, tilePixels, scene.elevationField);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            for (const record of scene.layers.hydrology) {
                if (!record.edges.length) continue;
                if (record.water) continue;
                const box = tileBox(record, tilePixels);
                context.strokeStyle = record.water ? 'rgba(150,225,235,0.52)' : 'rgba(225,211,161,0.72)';
                context.lineWidth = Math.max(1, tilePixels * 0.055);
                context.beginPath();
                for (const direction of record.edges) edgeLine(context, box, direction);
                context.stroke();
            }
            for (const route of scene.layers.routes) {
                const cx = (route.localX + 0.5) * tilePixels;
                const cy = (route.localY + 0.5) * tilePixels;
                const endpoints = {
                    north: [cx, route.localY * tilePixels],
                    east: [(route.localX + 1) * tilePixels, cy],
                    south: [cx, (route.localY + 1) * tilePixels],
                    west: [route.localX * tilePixels, cy]
                };
                const connections = route.connections.length ? route.connections : ['east', 'west'];
                const vertical = connections.includes('north') || connections.includes('south');
                if (route.kind === 'bridge' && drawAtlasRect(context, 'atlas.bridge-v2',
                    gridSource(1024, 512, 2, 1, vertical ? [0, 0] : [1, 0]),
                    { x: route.localX * tilePixels, y: route.localY * tilePixels, width: tilePixels + 0.5, height: tilePixels + 0.5 })) {
                    continue;
                }
                const strokeRoute = (color, width) => {
                    context.strokeStyle = color;
                    context.lineWidth = tilePixels * width;
                    context.beginPath();
                    for (const direction of connections) {
                        context.moveTo(cx, cy);
                        context.lineTo(...endpoints[direction]);
                    }
                    context.stroke();
                };
                strokeRoute(route.kind === 'bridge' ? 'rgba(52,35,23,0.86)' : 'rgba(65,55,39,0.66)', route.kind === 'bridge' ? 0.17 : 0.145);
                strokeRoute(route.kind === 'bridge' ? '#9b6c43' : '#aa956f', route.kind === 'bridge' ? 0.12 : 0.09);
                if (route.kind === 'bridge') {
                    context.strokeStyle = 'rgba(49,35,25,0.68)';
                    context.lineWidth = Math.max(1, tilePixels * 0.018);
                    for (let offset = -0.28; offset <= 0.281; offset += 0.14) {
                        context.beginPath();
                        if (vertical) {
                            context.moveTo(cx - tilePixels * 0.11, cy + tilePixels * offset);
                            context.lineTo(cx + tilePixels * 0.11, cy + tilePixels * offset);
                        } else {
                            context.moveTo(cx + tilePixels * offset, cy - tilePixels * 0.11);
                            context.lineTo(cx + tilePixels * offset, cy + tilePixels * 0.11);
                        }
                        context.stroke();
                    }
                }
            }
            for (const record of scene.layers.cover) {
                const anchorX = record.anchor?.x ?? point(record.seed, `cover-x:${record.ordinal}`);
                const anchorY = record.anchor?.y ?? point(record.seed, `cover-y:${record.ordinal}`);
                const x = (record.localX + anchorX) * tilePixels;
                const y = (record.localY + anchorY) * tilePixels;
                const scale = record.scale || 1;
                const obstacle = record.kind === 'obstacle' || record.blocksMovement;
                const family = String(record.family || (obstacle ? 'obstacle' : 'foliage')).toLowerCase();
                const coverCell = COVER_CELLS[family] || COVER_CELLS[obstacle ? 'obstacle' : 'foliage'];
                const coverSize = tilePixels * Math.min(1.3, 0.58 * scale + (obstacle ? 0.08 : 0.18));
                if (drawAtlasRect(context, 'atlas.cover-v3', gridSource(1774, 887, 4, 2, coverCell), {
                    x: x - coverSize / 2, y: y - coverSize / 2, width: coverSize, height: coverSize
                }, { flipX: unitPoint(record.seed, `cover-flip:${record.ordinal}`) > 0.5, alpha: 0.92 })) continue;
                context.fillStyle = obstacle ? '#343a32' : (record.family === 'grass' || record.family === 'reeds' ? '#60723b' : '#244b31');
                const count = obstacle ? 1 : Math.max(2, Math.min(5, Math.round(3 * scale)));
                for (let index = 0; index < count; index += 1) {
                    const offsetX = (point(record.seed, `cover-cluster-x:${record.ordinal}:${index}`) - 0.5) * tilePixels * 0.38 * scale;
                    const offsetY = (point(record.seed, `cover-cluster-y:${record.ordinal}:${index}`) - 0.5) * tilePixels * 0.38 * scale;
                    context.beginPath();
                    context.arc(x + offsetX, y + offsetY, tilePixels * (obstacle ? 0.13 : 0.075) * scale, 0, Math.PI * 2);
                    context.fill();
                }
            }
            for (const record of scene.layers.features) {
                const x = (record.localX + 0.5) * tilePixels;
                const y = (record.localY + 0.5) * tilePixels;
                const category = String(record.category || record.label || '').toLowerCase().replace(/\s+/g, '-');
                if (record.kind === 'structure') {
                    const cell = STRUCTURE_CELLS[category] || STRUCTURE_CELLS[String(record.label || '').toLowerCase()] || STRUCTURE_CELLS.hut;
                    const size = tilePixels * 0.82;
                    if (drawAtlasRect(context, 'atlas.structures-v3', gridSource(1254, 1254, 4, 4, cell), {
                        x: x - size / 2, y: y - size / 2, width: size, height: size
                    })) continue;
                } else {
                    const cell = POI_CELLS[category] || POI_CELLS.landmark;
                    const size = tilePixels * 0.58;
                    if (drawAtlasRect(context, 'atlas.poi-v3', gridSource(1536, 1024, 3, 2, cell), {
                        x: x - size / 2, y: y - size / 2, width: size, height: size
                    })) continue;
                }
                context.fillStyle = record.kind === 'structure' ? '#d2bd8d' : '#55d8c2';
                if (record.kind === 'structure') {
                    context.fillRect(x - tilePixels * 0.14, y - tilePixels * 0.11, tilePixels * 0.28, tilePixels * 0.22);
                    context.fillStyle = '#70513e';
                    context.beginPath();
                    context.moveTo(x - tilePixels * 0.18, y - tilePixels * 0.11);
                    context.lineTo(x, y - tilePixels * 0.24);
                    context.lineTo(x + tilePixels * 0.18, y - tilePixels * 0.11);
                    context.fill();
                } else {
                    context.beginPath();
                    context.arc(x, y, tilePixels * 0.12, 0, Math.PI * 2);
                    context.fill();
                }
            }
            for (const record of scene.layers.evidence) {
                const box = tileBox(record, tilePixels);
                const offset = (record.ordinal % 3) - 1;
                const label = String(record.label || '').toLowerCase();
                const evidenceKind = record.kind === 'resource-change' && record.state === 'depleted' ? 'depleted'
                    : (record.kind === 'item' && /food|ration|provision/.test(label) ? 'provisions'
                        : (record.kind === 'placed-object' && /trail|marker/.test(label) ? 'trail-marker' : record.kind));
                const evidenceCell = EVIDENCE_CELLS[evidenceKind] || EVIDENCE_CELLS.item;
                const evidenceSize = tilePixels * 0.24;
                if (drawAtlasRect(context, 'atlas.evidence-v3', gridSource(1774, 887, 4, 2, evidenceCell), {
                    x: box.cx + offset * tilePixels * 0.11 - evidenceSize / 2,
                    y: box.cy + tilePixels * 0.18 - evidenceSize / 2,
                    width: evidenceSize,
                    height: evidenceSize
                })) continue;
                context.fillStyle = record.kind === 'recovery-bag' ? '#be8b55' : (record.kind === 'item' ? '#e2c967' : '#9b8d77');
                context.fillRect(box.cx + offset * tilePixels * 0.1 - tilePixels * 0.045, box.cy + tilePixels * 0.2, tilePixels * 0.09, tilePixels * 0.09);
            }
            for (const record of scene.layers.presence) {
                const box = tileBox(record, tilePixels);
                const angle = point(record.seed, `presence-angle:${record.ordinal}`) * Math.PI * 2;
                const radius = record.ordinal ? tilePixels * 0.17 : 0;
                const x = box.cx + Math.cos(angle) * radius;
                const y = box.cy + Math.sin(angle) * radius;
                context.fillStyle = record.role === 'player' ? '#f3da61' : (record.role === 'party' ? '#55d8c2' : '#d4877d');
                context.beginPath();
                context.arc(x, y, tilePixels * 0.085, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = 'rgba(10,12,20,0.86)';
                context.lineWidth = Math.max(1, tilePixels * 0.025);
                context.stroke();
            }
            return {
                sceneKey: scene.cache.sceneKey,
                pixelWidth: size.width,
                pixelHeight: size.height,
                interiorSourceRect: {
                    x: scene.crop.x * tilePixels,
                    y: scene.crop.y * tilePixels,
                    width: scene.crop.width * tilePixels,
                    height: scene.crop.height * tilePixels
                }
            };
        }

        function configure(next = {}) {
            if (next.tilePixels !== undefined) tilePixels = Math.max(8, Math.min(256, Number(next.tilePixels) || tilePixels));
            if (next.pixelRatio !== undefined) pixelRatio = Math.max(1, Math.min(4, Number(next.pixelRatio) || pixelRatio));
        }

        function destroy() {
            if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
            }
        }

        return { id: ID, render, configure, destroy };
    }

    const descriptor = {
        id: ID,
        apiVersion: 1,
        label: 'First-party Canvas2D terrain renderer',
        engine: 'Canvas2D',
        capabilities: ['fixed-chunks', 'apron', 'offline', 'deterministic'],
        create
    };

    if (typeof YAW_TERRAIN_RENDERERS !== 'undefined') YAW_TERRAIN_RENDERERS.register(descriptor);
    return {
        ID, PALETTE, MATERIAL_CELLS, RELIEF_PROFILE,
        prepareAssets, assetStatus, decorativeDensityFor, bilinearHeight, heightFieldSample, heightFieldDifferential,
        reliefGeometry, softBiomeField, waterField, create, descriptor
    };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_CANVAS_V1 = YAW_TERRAIN_CANVAS_V1;
