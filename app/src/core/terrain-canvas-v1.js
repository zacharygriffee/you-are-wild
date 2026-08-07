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
    const assets = { key: '', promise: null, images: new Map() };

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
        const field = ownerDocument.createElement('canvas');
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

    function drawBiomeStrata(context, record, tilePixels) {
        if (!asset('atlas.biome-strata-v2') && !asset('atlas.jungle-strata-v1')) return false;
        const density = { plains: 0.34, grove: 0.78, forest: 0.92, swamp: 0.67, jungle: 0.9, cliff: 0.32, cave: 0.26 }[record.biome] || 0;
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
            drawGroundTransitions(context, scene.layers.ground, tilePixels);
            drawGroundCorners(context, scene.layers.ground, tilePixels);
            drawWaterContinuum(context, scene.layers.ground, tilePixels);
            for (const ground of scene.layers.ground) {
                if (!asset('atlas.materials-v2')) drawGroundTexture(context, ground, tilePixels);
                drawBiomeStrata(context, ground, tilePixels);
            }
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
            for (const record of scene.layers.elevation) {
                if (!record.cliffs.length && !record.uphill.length) continue;
                const box = tileBox(record, tilePixels);
                context.strokeStyle = record.cliffs.length ? 'rgba(37,31,29,0.78)' : 'rgba(255,255,255,0.12)';
                context.lineWidth = Math.max(1, tilePixels * (record.cliffs.length ? 0.08 : 0.025));
                context.beginPath();
                for (const direction of (record.cliffs.length ? record.cliffs : record.uphill)) edgeLine(context, box, direction);
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
                const evidenceKind = record.kind === 'item' && /food|ration|provision/.test(label) ? 'provisions'
                    : (record.kind === 'placed-object' && /trail|marker/.test(label) ? 'trail-marker' : record.kind);
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
    return { ID, PALETTE, MATERIAL_CELLS, prepareAssets, assetStatus, create, descriptor };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_CANVAS_V1 = YAW_TERRAIN_CANVAS_V1;
