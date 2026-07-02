const WorldGen = (() => {
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const fade = t => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;

    function hash01(seed, version, purpose, ...parts) {
        const input = `${String(seed || 'default')}|v${version || 1}|${purpose}|${parts.join('|')}`;
        let hash = 2166136261;
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        hash += hash << 13;
        hash ^= hash >>> 7;
        hash += hash << 3;
        hash ^= hash >>> 17;
        hash += hash << 5;
        return (hash >>> 0) / 4294967296;
    }

    function valueNoise2D(seed, version, purpose, x, y, scale = 16) {
        const safeScale = Math.max(1, scale);
        const fx = x / safeScale;
        const fy = y / safeScale;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fade(fx - x0);
        const ty = fade(fy - y0);
        const n00 = hash01(seed, version, purpose, x0, y0);
        const n10 = hash01(seed, version, purpose, x0 + 1, y0);
        const n01 = hash01(seed, version, purpose, x0, y0 + 1);
        const n11 = hash01(seed, version, purpose, x0 + 1, y0 + 1);
        return lerp(lerp(n00, n10, tx), lerp(n01, n11, tx), ty);
    }

    function fractalNoise2D(seed, version, purpose, x, y, scale = 24, octaves = 4, persistence = 0.5) {
        let amplitude = 1;
        let frequency = 1;
        let total = 0;
        let max = 0;
        for (let octave = 0; octave < octaves; octave++) {
            total += valueNoise2D(seed, version, `${purpose}:o${octave}`, x * frequency, y * frequency, scale) * amplitude;
            max += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return max > 0 ? total / max : 0;
    }

    function cellular2D(seed, version, purpose, x, y, cellSize = 32) {
        const safeSize = Math.max(4, cellSize);
        const cx = Math.floor(x / safeSize);
        const cy = Math.floor(y / safeSize);
        let best = null;
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const cellX = cx + ox;
                const cellY = cy + oy;
                const jitterX = hash01(seed, version, `${purpose}:jx`, cellX, cellY);
                const jitterY = hash01(seed, version, `${purpose}:jy`, cellX, cellY);
                const centerX = (cellX + 0.18 + jitterX * 0.64) * safeSize;
                const centerY = (cellY + 0.18 + jitterY * 0.64) * safeSize;
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (!best || distance < best.distance) {
                    best = { cellX, cellY, centerX, centerY, distance, id: `${cellX},${cellY}` };
                }
            }
        }
        return {
            ...best,
            influence: clamp01(1 - (best?.distance || 0) / safeSize)
        };
    }

    function pickWeighted(seed, version, purpose, x, y, table = []) {
        const normalized = table
            .map(entry => typeof entry === 'string' ? { id: entry, weight: 1 } : entry)
            .filter(entry => entry && entry.id && (entry.weight ?? 1) > 0);
        if (normalized.length === 0) return null;
        const total = normalized.reduce((sum, entry) => sum + (entry.weight ?? 1), 0);
        let roll = hash01(seed, version, purpose, x, y) * total;
        for (const entry of normalized) {
            roll -= entry.weight ?? 1;
            if (roll <= 0) return entry.id;
        }
        return normalized[normalized.length - 1].id;
    }

    function chance(seed, version, purpose, x, y, probability) {
        return hash01(seed, version, purpose, x, y) < Math.max(0, Math.min(1, probability || 0));
    }

    function hash32(...parts) {
        return Math.floor(hash01('', 1, 'hash32', ...parts) * 0x100000000) >>> 0;
    }

    function startMask(x, y, radius = 9) {
        const distance = Math.sqrt(x * x + y * y);
        return clamp01(1 - distance / Math.max(1, radius));
    }

    function getTerrainFields(seed, version, x, y) {
        const safeStart = startMask(x, y, 9);
        const elevation = fractalNoise2D(seed, version, 'elevation', x, y, 30, 5, 0.52);
        const moisture = fractalNoise2D(seed, version, 'moisture', x + 101, y - 37, 26, 4, 0.55);
        const heat = fractalNoise2D(seed, version, 'heat', x - 53, y + 211, 42, 4, 0.5);
        const fertility = fractalNoise2D(seed, version, 'fertility', x + 503, y + 97, 20, 4, 0.5);
        const roughness = fractalNoise2D(seed, version, 'roughness', x - 707, y + 409, 18, 4, 0.56);
        const danger = fractalNoise2D(seed, version, 'danger', x - 311, y - 149, 34, 4, 0.52);
        const waterPressure = clamp01((1 - elevation) * 0.72 + moisture * 0.52 - roughness * 0.18 - safeStart * 0.45);
        const water = waterPressure > 0.72 && elevation < 0.48;
        return {
            elevation,
            moisture,
            heat,
            fertility,
            roughness,
            waterPressure,
            water,
            danger,
            dangerPressure: clamp01(Math.max(0, danger - safeStart * 0.45)),
            safeStart
        };
    }

    function isWater(seed, version, x, y) {
        return getTerrainFields(seed, version, x, y).water;
    }

    function coastInfo(seed, version, x, y) {
        const near = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
            if (isWater(seed, version, x + dx, y + dy)) near.push({ dx, dy });
        }
        return { nearWater: near.length > 0, waterNeighbors: near };
    }

    function terrainTags(fields, biome, overlays = {}) {
        const tags = [];
        if (fields.elevation > 0.72) tags.push('high-ground');
        if (fields.elevation < 0.28 && fields.moisture > 0.55) tags.push('waterlogged');
        if (fields.roughness > 0.68) tags.push('rough');
        if (fields.moisture > 0.68 && fields.fertility > 0.5) tags.push('dense-growth');
        if (fields.moisture < 0.32) tags.push('dry');
        if (fields.heat > 0.68) tags.push('warm');
        if (fields.heat < 0.32) tags.push('cool');
        if (fields.dangerPressure > 0.68) tags.push('dangerous');
        if (fields.safeStart > 0.15) tags.push('safe-start');
        if (biome === 'water') tags.push('water');
        if (biome === 'beach') tags.push('coast');
        if (biome === 'cliff') tags.push('rocky');
        if (overlays.road) tags.push('road');
        if (overlays.bridge) tags.push('bridge');
        return tags;
    }

    function getBiomeTraits(biomeId, biomeDef = null) {
        const builtin = {
            grove: ['organic', 'safe', 'lowland'],
            forest: ['organic', 'dense', 'rough'],
            swamp: ['wet', 'rough', 'lowland', 'organic'],
            plains: ['open', 'lowland'],
            cave: ['rocky', 'dark', 'rough'],
            jungle: ['wet', 'dense', 'organic', 'rough'],
            dungeon: ['dangerous', 'built', 'dark'],
            manor: ['built', 'settled'],
            beach: ['coast', 'open', 'lowland'],
            cliff: ['rocky', 'rough', 'highland'],
            water: ['water', 'deep'],
            road: ['route'],
            bridge: ['route', 'crossing'],
            farm: ['settled', 'resource'],
            indoors: ['interior', 'built'],
            entrance: ['feature', 'transition']
        };
        return [...new Set([...(builtin[biomeId] || []), ...((biomeDef && Array.isArray(biomeDef.traits)) ? biomeDef.traits : [])])];
    }

    function getTraversal(tile = {}, biomeDef = null) {
        const overlays = tile.overlays || {};
        const biome = tile.derivedBiome || tile.baseBiome || tile.biome || 'plains';
        const traits = getBiomeTraits(biome, biomeDef);
        let passable = true;
        let traversalCost = 1;
        let requiredCapability = null;
        let routeModifier = 0;

        if (tile.water || biome === 'water' || traits.includes('water')) {
            passable = false;
            traversalCost = 5;
            requiredCapability = 'swim';
        }
        if (biome === 'swamp' || traits.includes('wet')) traversalCost += 2;
        if (biome === 'forest' || biome === 'jungle' || traits.includes('dense')) traversalCost += 1;
        if (biome === 'cave' || biome === 'cliff' || traits.includes('rocky') || traits.includes('rough')) traversalCost += 2;
        if (biome === 'beach' || traits.includes('coast')) {
            passable = true;
            requiredCapability = null;
            traversalCost = Math.min(traversalCost, 2);
        }
        if (overlays.road) {
            routeModifier -= 1;
            traversalCost = Math.max(1, traversalCost - 1);
        }
        if (overlays.bridge) {
            passable = true;
            requiredCapability = null;
            routeModifier -= 2;
            traversalCost = 1;
        }
        return {
            passable,
            traversalCost,
            requiredCapability,
            routeModifier,
            traits
        };
    }

    function getEncounterPressure(tile = {}, context = {}) {
        const terrainDanger = Number(tile.dangerPressure ?? 0);
        const biomeDanger = Number(context.biomeDanger ?? 0) / 5;
        const baseDanger = clamp01(Math.max(terrainDanger, biomeDanger));
        const roadModifier = tile.overlays?.road ? -0.12 : 0;
        const poiCategory = tile.overlays?.poi?.category || null;
        const poiModifier = poiCategory === 'dangerSite' ? 0.18 : (poiCategory === 'restSite' || poiCategory === 'settlement' ? -0.08 : 0);
        const timeModifier = context.isNight ? 0.08 : 0;
        const localStateModifier = Number(context.localStateModifier || 0);
        return {
            baseDanger: Number(baseDanger.toFixed(4)),
            roadModifier,
            poiModifier,
            timeModifier,
            localStateModifier,
            finalChance: Number(clamp01(baseDanger + roadModifier + poiModifier + timeModifier + localStateModifier).toFixed(4))
        };
    }

    function getTileMapSummary(tile = {}, context = {}) {
        const biomeId = tile.displayBiome || tile.derivedBiome || tile.biome || 'plains';
        const traversal = tile.traversal || getTraversal(tile, context.biomeDef);
        const pressure = getEncounterPressure(tile, context);
        const markers = [];
        if (tile.overlays?.road) markers.push('Road');
        if (tile.overlays?.bridge) markers.push('Bridge');
        if (tile.overlays?.poi?.category) markers.push(tile.overlays.poi.category);
        if (tile.structure) markers.push('Structure');
        if (tile.hasLandmark) markers.push('Landmark');
        if (Array.isArray(tile.creatures) && tile.creatures.some(creature => creature?.disposition === 'merchant' || creature?.merchant || creature?.stock)) markers.push('Merchant');
        if (context.questRelevant) markers.push('Quest');
        return {
            biome: biomeId,
            coords: { x: Number(tile.x ?? 0), y: Number(tile.y ?? 0) },
            terrain: {
                water: Boolean(tile.water || tile.terrain?.water),
                tags: Array.isArray(tile.terrainTags) ? tile.terrainTags.slice() : []
            },
            traversal: {
                passable: traversal.passable,
                traversalCost: traversal.traversalCost,
                requiredCapability: traversal.requiredCapability,
                routeModifier: traversal.routeModifier
            },
            danger: pressure.finalChance >= 0.66 ? 'high' : (pressure.finalChance >= 0.36 ? 'elevated' : 'low'),
            markers,
            discovered: Boolean(tile.explored),
            restAvailable: ['cabin', 'hut', 'camp', 'shrine', 'spring'].includes(tile.structure),
            questRelevant: Boolean(context.questRelevant)
        };
    }

    function validateStartArea(worldMeta, regionBiomes = [], options = {}) {
        const radius = options.radius ?? 8;
        const routeRadius = options.routeRadius ?? 12;
        const restRadius = options.restRadius ?? 18;
        let safeTiles = 0;
        let blockedAdjacent = 0;
        let lowDangerResource = false;
        let routeAccess = false;
        let restCandidate = false;
        let poiCandidate = false;
        for (let x = -restRadius; x <= restRadius; x++) {
            for (let y = -restRadius; y <= restRadius; y++) {
                const distance = Math.abs(x) + Math.abs(y);
                const tile = generateBaseTile(worldMeta, x, y, regionBiomes);
                if (distance <= radius && tile.traversal.passable && tile.dangerPressure <= 0.36 && ['grove', 'plains', 'forest', 'beach'].includes(tile.baseBiome)) safeTiles++;
                if (distance === 1 && !tile.traversal.passable) blockedAdjacent++;
                if (distance <= radius && tile.traversal.passable && tile.dangerPressure <= 0.32 && ['grove', 'plains', 'forest'].includes(tile.baseBiome)) lowDangerResource = true;
                if (distance <= routeRadius && tile.overlays?.road) routeAccess = true;
                if (distance <= restRadius && tile.traversal.passable && tile.overlays?.poi && ['restSite', 'settlement'].includes(tile.overlays.poi.category)) restCandidate = true;
                if (distance <= restRadius && tile.traversal.passable && tile.overlays?.poi) poiCandidate = true;
            }
        }
        const minSafeTiles = options.minSafeTiles ?? Math.max(12, Math.floor(radius * radius * 0.3));
        const checks = {
            safeBiomeRadius: safeTiles >= minSafeTiles,
            noHardLockout: blockedAdjacent < 4,
            lowDangerResource,
            routeAccess,
            restCandidate,
            earlyPoi: poiCandidate
        };
        return {
            ok: Object.values(checks).every(Boolean),
            checks,
            metrics: { safeTiles, blockedAdjacent, radius, routeRadius, restRadius }
        };
    }

    function classifyBiome(fields, macroBiome, availableBiomes = []) {
        const allowed = new Set(availableBiomes);
        if (fields.water) return allowed.has('water') ? 'water' : 'plains';
        if (fields.nearWater && fields.elevation < 0.58 && fields.roughness < 0.68 && fields.moisture < 0.78 && allowed.has('beach')) return 'beach';
        const score = {
            grove: 0.35 + fields.safeStart * 2 + fields.fertility * 0.35 + fields.moisture * 0.15 - fields.danger * 0.45,
            forest: 0.25 + fields.moisture * 0.35 + fields.fertility * 0.45 - Math.abs(fields.elevation - 0.48) * 0.25,
            swamp: fields.moisture * 0.85 + (1 - fields.elevation) * 0.35 + fields.fertility * 0.25 - fields.heat * 0.05,
            plains: (1 - fields.moisture) * 0.45 + (1 - fields.elevation) * 0.28 + (1 - Math.abs(fields.heat - 0.55)) * 0.25,
            cave: fields.elevation * 0.5 + fields.danger * 0.42 + (1 - fields.heat) * 0.18,
            jungle: fields.moisture * 0.58 + fields.heat * 0.45 + fields.fertility * 0.35,
            dungeon: fields.danger * 0.72 + fields.elevation * 0.2 + (1 - fields.fertility) * 0.2,
            manor: fields.danger * 0.25 + fields.fertility * 0.15 + (1 - fields.moisture) * 0.15,
            beach: fields.nearWater ? fields.heat * 0.35 + (1 - fields.elevation) * 0.45 + Math.max(0, 0.55 - Math.abs(fields.moisture - 0.48)) * 0.25 : -Infinity,
            cliff: fields.elevation * 0.95 + (1 - fields.moisture) * 0.08,
            water: -Infinity
        };
        if (macroBiome && score[macroBiome] != null) {
            score[macroBiome] += 0.48 + fields.regionInfluence * 0.48;
        }
        if (fields.safeStart > 0.35) {
            score.grove += 1.2;
            score.dungeon -= 1.5;
            score.cave -= 0.8;
            score.swamp -= 0.4;
            score.water -= 0.35;
            score.cliff -= 0.35;
        }
        let best = 'plains';
        let bestScore = -Infinity;
        for (const [biome, value] of Object.entries(score)) {
            if (allowed.size && !allowed.has(biome)) continue;
            if (value > bestScore) {
                best = biome;
                bestScore = value;
            }
        }
        return best;
    }

    function cellCenter(seed, version, purpose, cellX, cellY, cellSize = 36) {
        const safeSize = Math.max(4, cellSize);
        const jitterX = hash01(seed, version, `${purpose}:jx`, cellX, cellY);
        const jitterY = hash01(seed, version, `${purpose}:jy`, cellX, cellY);
        return {
            x: (cellX + 0.18 + jitterX * 0.64) * safeSize,
            y: (cellY + 0.18 + jitterY * 0.64) * safeSize
        };
    }

    function distanceToSegment(px, py, ax, ay, bx, by) {
        const vx = bx - ax;
        const vy = by - ay;
        const wx = px - ax;
        const wy = py - ay;
        const lenSq = vx * vx + vy * vy;
        const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
        const sx = ax + t * vx;
        const sy = ay + t * vy;
        const dx = px - sx;
        const dy = py - sy;
        return { distance: Math.sqrt(dx * dx + dy * dy), t, sx, sy, dx: vx, dy: vy };
    }

    const POI_BUDGET_RULES = {
        settlement: { min: 0, max: 1, minDistance: 20, weight: 2 },
        restSite: { min: 1, max: 2, minDistance: 8, weight: 3 },
        resourceSite: { min: 1, max: 3, minDistance: 5, weight: 3 },
        dangerSite: { min: 1, max: 2, minDistance: 8, weight: 2 },
        landmark: { min: 1, max: 3, minDistance: 8, weight: 3 },
        structure: { min: 0, max: 2, minDistance: 6, weight: 2 }
    };

    function budgetCount(seed, version, category, cellX, cellY, rule) {
        const min = Math.max(0, rule.min || 0);
        const max = Math.max(min, rule.max || min);
        const spread = max - min + 1;
        return min + Math.floor(hash01(seed, version, `poi-budget:${category}`, cellX, cellY) * spread);
    }

    function getPoiBudgetForRegion(seed, version, cellX, cellY) {
        const categories = {};
        for (const [category, rule] of Object.entries(POI_BUDGET_RULES)) {
            categories[category] = {
                count: budgetCount(seed, version, category, cellX, cellY, rule),
                minDistance: rule.minDistance,
                weight: rule.weight
            };
        }
        return {
            regionId: `${cellX},${cellY}`,
            cellX,
            cellY,
            categories
        };
    }

    function poiCandidatePoint(seed, version, cellX, cellY, category, index, cellSize = 36) {
        const margin = Math.max(3, Math.floor(cellSize * 0.12));
        const span = Math.max(1, cellSize - margin * 2);
        return {
            x: Math.round(cellX * cellSize + margin + hash01(seed, version, `poi-x:${category}`, cellX, cellY, index) * span),
            y: Math.round(cellY * cellSize + margin + hash01(seed, version, `poi-y:${category}`, cellX, cellY, index) * span)
        };
    }

    function poiSpacingOk(candidate, accepted) {
        return accepted.every(other => {
            const minDistance = Math.min(candidate.minDistance || 0, other.minDistance || 0);
            if (candidate.category !== other.category && minDistance > 6) return true;
            const dx = candidate.anchor.x - other.anchor.x;
            const dy = candidate.anchor.y - other.anchor.y;
            return Math.sqrt(dx * dx + dy * dy) >= minDistance;
        });
    }

    function getPoiCandidatesForRegion(seed, version, cellX, cellY) {
        const budget = getPoiBudgetForRegion(seed, version, cellX, cellY);
        const accepted = [];
        const categories = Object.keys(POI_BUDGET_RULES)
            .sort((a, b) => (POI_BUDGET_RULES[b].weight || 1) - (POI_BUDGET_RULES[a].weight || 1) || a.localeCompare(b));
        for (const category of categories) {
            const rule = budget.categories[category];
            const desired = rule.count;
            let acceptedForCategory = 0;
            for (let attempt = 0; attempt < desired * 5 && acceptedForCategory < desired; attempt++) {
                const anchor = poiCandidatePoint(seed, version, cellX, cellY, category, attempt);
                const candidate = {
                    id: `poi_${cellX}_${cellY}_${category}_${acceptedForCategory}`,
                    category,
                    regionId: budget.regionId,
                    anchor,
                    minDistance: rule.minDistance,
                    routeAnchor: ['settlement', 'restSite', 'landmark', 'structure'].includes(category)
                };
                if (!poiSpacingOk(candidate, accepted)) continue;
                accepted.push(candidate);
                acceptedForCategory++;
            }
        }
        return accepted.sort((a, b) => a.anchor.y - b.anchor.y || a.anchor.x - b.anchor.x || a.category.localeCompare(b.category));
    }

    function getRouteAnchorsForRegion(seed, version, cellX, cellY) {
        const anchors = getPoiCandidatesForRegion(seed, version, cellX, cellY).filter(candidate => candidate.routeAnchor);
        if (anchors.length) return anchors;
        const center = cellCenter(seed, version, 'macro-region', cellX, cellY, 36);
        return [{
            id: `route_anchor_${cellX}_${cellY}`,
            category: 'routeAnchor',
            regionId: `${cellX},${cellY}`,
            anchor: { x: Math.round(center.x), y: Math.round(center.y) },
            routeAnchor: true
        }];
    }

    function getPoiForTile(seed, version, x, y, regionCell = null) {
        if ((version || 1) >= 2 && x === 4 && y === 0) {
            return {
                id: 'poi_start_rest',
                category: 'restSite',
                regionId: 'start',
                anchor: { x, y },
                startArea: true
            };
        }
        const cell = regionCell || cellular2D(seed, version, 'macro-region', x, y, 36);
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const match = getPoiCandidatesForRegion(seed, version, cell.cellX + ox, cell.cellY + oy)
                    .find(candidate => Math.abs(x - candidate.anchor.x) <= 1 && Math.abs(y - candidate.anchor.y) <= 1);
                if (match) return match;
            }
        }
        return null;
    }

    function routeSegmentsForTile(seed, version, x, y) {
        const cellSize = 36;
        const cx = Math.floor(x / cellSize);
        const cy = Math.floor(y / cellSize);
        const segments = [];
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const cellX = cx + ox;
                const cellY = cy + oy;
                const fromAnchor = getRouteAnchorsForRegion(seed, version, cellX, cellY)[0];
                const from = fromAnchor.anchor;
                for (const [nx, ny, suffix] of [[cellX + 1, cellY, 'e'], [cellX, cellY + 1, 's']]) {
                    if (!chance(seed, version, `road-edge-${suffix}`, cellX, cellY, 0.62)) continue;
                    const toAnchor = getRouteAnchorsForRegion(seed, version, nx, ny)[0];
                    const to = toAnchor.anchor;
                    segments.push({ id: `road_${fromAnchor.id}_${toAnchor.id}`, from, to, fromAnchorId: fromAnchor.id, toAnchorId: toAnchor.id });
                }
            }
        }
        return segments;
    }

    function getRoadOverlay(seed, version, x, y, fields) {
        if ((version || 1) >= 2 && y === 0 && Math.abs(x) <= 6) {
            return { id: 'road_start_axis', direction: 'east-west', startArea: true };
        }
        if (fields.roughness > 0.86) return null;
        let best = null;
        for (const segment of routeSegmentsForTile(seed, version, x, y)) {
            const dist = distanceToSegment(x, y, segment.from.x, segment.from.y, segment.to.x, segment.to.y);
            if (dist.distance <= 0.72 && (!best || dist.distance < best.distance)) {
                const direction = Math.abs(dist.dx) >= Math.abs(dist.dy) ? 'east-west' : 'north-south';
                best = { id: segment.id, direction, distance: dist.distance };
            }
        }
        return best ? { id: best.id, direction: best.direction } : null;
    }

    function bridgeSpan(seed, version, x, y, direction) {
        const axis = direction === 'east-west' ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        let left = 0;
        let right = 0;
        for (let step = 1; step <= 3; step++) {
            if (isWater(seed, version, x + axis[0][0] * step, y + axis[0][1] * step)) left++;
            else break;
        }
        for (let step = 1; step <= 3; step++) {
            if (isWater(seed, version, x + axis[1][0] * step, y + axis[1][1] * step)) right++;
            else break;
        }
        const landA = !isWater(seed, version, x + axis[0][0] * (left + 1), y + axis[0][1] * (left + 1));
        const landB = !isWater(seed, version, x + axis[1][0] * (right + 1), y + axis[1][1] * (right + 1));
        const spanLength = left + right + 1;
        return { valid: landA && landB && spanLength <= 7, spanLength };
    }

    function getBridgeOverlay(seed, version, x, y, fields, road) {
        if (!road || !fields.water) return null;
        const span = bridgeSpan(seed, version, x, y, road.direction);
        if (!span.valid) return null;
        return {
            id: `bridge_${road.id}_${x}_${y}`,
            direction: road.direction,
            roadId: road.id,
            spanIndex: 0,
            spanLength: span.spanLength
        };
    }

    function generateBaseTile(worldMeta, x, y, regionBiomes = []) {
        const seed = worldMeta?.seed || 'default';
        const version = worldMeta?.generatorVersion || 1;
        const regionCell = cellular2D(seed, version, 'macro-region', x, y, 36);
        const macroBiome = pickWeighted(seed, version, 'macro-biome', regionCell.cellX, regionCell.cellY, regionBiomes.map(id => ({ id, weight: id === 'grove' ? 2 : 1 }))) || 'plains';
        const fields = getTerrainFields(seed, version, x, y);
        const coast = coastInfo(seed, version, x, y);
        fields.nearWater = coast.nearWater;
        fields.regionInfluence = regionCell.influence;
        const derivedBiome = classifyBiome(fields, macroBiome, regionBiomes);
        const road = getRoadOverlay(seed, version, x, y, fields);
        const bridge = getBridgeOverlay(seed, version, x, y, fields, road);
        const poi = getPoiForTile(seed, version, x, y, regionCell);
        const overlays = { road, bridge, poi, structure: null };
        const traversal = getTraversal({ biome: derivedBiome, baseBiome: derivedBiome, derivedBiome, water: fields.water, overlays });
        const encounterPressure = getEncounterPressure({ biome: derivedBiome, baseBiome: derivedBiome, derivedBiome, water: fields.water, dangerPressure: fields.dangerPressure, overlays });
        return {
            biome: derivedBiome,
            baseBiome: derivedBiome,
            derivedBiome,
            displayBiome: bridge ? 'bridge' : (road ? 'road' : derivedBiome),
            macroBiome,
            elevation: Number(fields.elevation.toFixed(4)),
            moisture: Number(fields.moisture.toFixed(4)),
            heat: Number(fields.heat.toFixed(4)),
            fertility: Number(fields.fertility.toFixed(4)),
            roughness: Number(fields.roughness.toFixed(4)),
            waterPressure: Number(fields.waterPressure.toFixed(4)),
            water: Boolean(fields.water),
            dangerPressure: Number(fields.dangerPressure.toFixed(4)),
            terrain: {
                elevation: Number(fields.elevation.toFixed(4)),
                moisture: Number(fields.moisture.toFixed(4)),
                heat: Number(fields.heat.toFixed(4)),
                roughness: Number(fields.roughness.toFixed(4)),
                water: Boolean(fields.water),
                waterPressure: Number(fields.waterPressure.toFixed(4)),
                dangerPressure: Number(fields.dangerPressure.toFixed(4)),
                traversal: {
                    passable: traversal.passable,
                    traversalCost: traversal.traversalCost,
                    requiredCapability: traversal.requiredCapability,
                    routeModifier: traversal.routeModifier
                }
            },
            traversal: {
                passable: traversal.passable,
                traversalCost: traversal.traversalCost,
                requiredCapability: traversal.requiredCapability,
                routeModifier: traversal.routeModifier
            },
            encounterPressure,
            mapSummary: getTileMapSummary({
                x,
                y,
                biome: derivedBiome,
                baseBiome: derivedBiome,
                derivedBiome,
                displayBiome: bridge ? 'bridge' : (road ? 'road' : derivedBiome),
                water: Boolean(fields.water),
                dangerPressure: Number(fields.dangerPressure.toFixed(4)),
                overlays,
                terrainTags: terrainTags(fields, derivedBiome, overlays),
                traversal,
                encounterPressure,
                explored: false
            }),
            overlays,
            regionCell: {
                id: regionCell.id,
                x: regionCell.cellX,
                y: regionCell.cellY,
                influence: Number(regionCell.influence.toFixed(4))
            },
            terrainTags: terrainTags(fields, derivedBiome, overlays)
        };
    }

    return {
        hash32,
        hash01,
        valueNoise2D,
        fractalNoise2D,
        cellular2D,
        chance,
        pickWeighted,
        getTerrainFields,
        getPoiForTile,
        getPoiBudgetForRegion,
        getPoiCandidatesForRegion,
        getRouteAnchorsForRegion,
        getRoadOverlay,
        getBridgeOverlay,
        getBiomeTraits,
        getTraversal,
        getEncounterPressure,
        getTileMapSummary,
        validateStartArea,
        classifyBiome,
        generateBaseTile
    };
})();
