const WorldGen = (() => {
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const fade = t => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;
    const caveNetworkCache = new Map();
    const routeLoopCache = new Map();

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

    function getStartSafetyPolicy(worldMeta, x, y) {
        const version = Number(worldMeta?.generatorVersion || 1);
        const distance = Math.max(Math.abs(Number(x) || 0), Math.abs(Number(y) || 0));
        if (version < 4) {
            return {
                version,
                band: 'legacy',
                distance,
                hostileAllowed: true,
                maxHostiles: null,
                maxDifficulty: null,
                allowAmbush: true,
                allowReinforcement: true,
                allowHostileStructures: true,
                encounterMultiplier: 1
            };
        }
        if (distance <= 1) {
            return {
                version,
                band: 'protected',
                distance,
                hostileAllowed: false,
                maxHostiles: 0,
                maxDifficulty: 0,
                allowAmbush: false,
                allowReinforcement: false,
                allowHostileStructures: false,
                encounterMultiplier: 0
            };
        }
        if (distance <= 5) {
            const multipliers = { 2: 0.25, 3: 0.45, 4: 0.65, 5: 0.85 };
            return {
                version,
                band: 'opening',
                distance,
                hostileAllowed: true,
                maxHostiles: 1,
                maxDifficulty: 1,
                allowAmbush: false,
                allowReinforcement: false,
                allowHostileStructures: false,
                encounterMultiplier: multipliers[distance] || 0.85
            };
        }
        return {
            version,
            band: 'wilderness',
            distance,
            hostileAllowed: true,
            maxHostiles: null,
            maxDifficulty: null,
            allowAmbush: true,
            allowReinforcement: true,
            allowHostileStructures: true,
            encounterMultiplier: 1
        };
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
        const safeDangerDampening = (version || 1) >= 2 ? 0.75 : 0.45;
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
            dangerPressure: clamp01(Math.max(0, danger - safeStart * safeDangerDampening)),
            safeStart
        };
    }

    function isWater(seed, version, x, y) {
        return getTerrainFields(seed, version, x, y).water;
    }

    function coastInfo(seed, version, x, y) {
        const near = [];
        const cardinal = [];
        for (const [direction, dx, dy] of [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]]) {
            if (!isWater(seed, version, x + dx, y + dy)) continue;
            near.push({ direction, dx, dy, distance: 1 });
            cardinal.push(direction);
        }
        for (const [direction, dx, dy] of [['north', 0, -2], ['east', 2, 0], ['south', 0, 2], ['west', -2, 0]]) {
            if (isWater(seed, version, x + dx, y + dy)) near.push({ direction, dx, dy, distance: 2 });
        }
        return { nearWater: near.length > 0, waterNeighbors: near, shorelineEdges: cardinal };
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
        if (overlays.barriers?.length) tags.push('barrier-edge');
        if (overlays.shoreline?.edges?.length) tags.push('shoreline');
        if (overlays.dangerInfluence) tags.push('danger-influence');
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
        const influenceModifier = Number(tile.overlays?.dangerInfluence?.modifier || 0);
        const poiModifier = influenceModifier || (poiCategory === 'restSite' || poiCategory === 'settlement' ? -0.08 : 0);
        const timeModifier = context.isNight ? 0.08 : 0;
        const localStateModifier = Number(context.localStateModifier || 0);
        const policy = context.encounterPolicy || tile.encounterPolicy || null;
        const encounterMultiplier = Number.isFinite(Number(policy?.encounterMultiplier))
            ? Math.max(0, Number(policy.encounterMultiplier))
            : 1;
        const baseEncounterChance = clamp01(Number(context.baseEncounterChance || 0));
        const rawSpawnChance = baseEncounterChance + roadModifier + poiModifier + timeModifier + localStateModifier;
        return {
            baseDanger: Number(baseDanger.toFixed(4)),
            roadModifier,
            poiModifier,
            timeModifier,
            localStateModifier,
            encounterMultiplier,
            finalChance: Number(clamp01(baseDanger + roadModifier + poiModifier + timeModifier + localStateModifier).toFixed(4)),
            spawnChance: Number(clamp01(rawSpawnChance * encounterMultiplier).toFixed(4))
        };
    }

    function getDangerBand(tile = {}, context = {}) {
        const pressure = getEncounterPressure(tile, context);
        const policy = context.encounterPolicy || tile.encounterPolicy || null;
        const livingHostile = Array.isArray(tile.creatures) && tile.creatures.some(creature =>
            creature
            && Number(creature.CPun ?? 1) > 0
            && !creature.knockedOut
            && (creature.disposition === 'enemy' || creature.disposition === 'hostile' || creature.hostile === true)
        );
        const voluntaryDanger = tile.overlays?.poi?.category === 'dangerSite'
            || tile.dangerSite === true;
        let score = Number(pressure.finalChance || 0);
        if (livingHostile) score = Math.max(score, 0.72);
        if (voluntaryDanger) score = Math.max(score, 0.68);
        if (policy?.band === 'protected') score = 0;
        if (policy?.band === 'opening') score = Math.min(score, 0.48);
        score = clamp01(score);
        const id = score <= 0.1
            ? 'safe'
            : score <= 0.28
                ? 'low'
                : score <= 0.48
                    ? 'guarded'
                    : score <= 0.7
                        ? 'dangerous'
                        : 'severe';
        return { id, score: Number(score.toFixed(4)), pressure };
    }

    function getTileMapSummary(tile = {}, context = {}) {
        const biomeId = tile.displayBiome || tile.derivedBiome || tile.biome || 'plains';
        const traversal = tile.traversal || getTraversal(tile, context.biomeDef);
        const pressure = getEncounterPressure(tile, context);
        const dangerBand = getDangerBand(tile, context);
        const markers = [];
        if (tile.overlays?.road) markers.push('Road');
        if (tile.overlays?.bridge) markers.push('Bridge');
        if (tile.overlays?.poi?.category) markers.push(tile.overlays.poi.category);
        if (tile.overlays?.dangerInfluence && tile.overlays?.poi?.category !== 'dangerSite') markers.push('Danger influence');
        if (tile.structure) markers.push('Structure');
        if (tile.hasLandmark) markers.push('Landmark');
        if (Array.isArray(tile.creatures) && tile.creatures.some(creature => creature?.serviceSuspended !== true && (creature?.disposition === 'merchant' || creature?.merchant || creature?.stock))) markers.push('Merchant');
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
            dangerBand,
            markers,
            discovered: Boolean(tile.explored),
            restAvailable: typeof context.restAvailable === 'boolean'
                ? context.restAvailable
                : ['cabin', 'hut', 'shrine', 'spring'].includes(tile.structure) || (tile.structure === 'camp' && tile.overlays?.poi?.category === 'restSite'),
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
        let poiCandidate = false;
        const tileCache = new Map();
        const tileAt = (x, y) => {
            const key = `${x},${y}`;
            if (!tileCache.has(key)) tileCache.set(key, generateBaseTile(worldMeta, x, y, regionBiomes));
            return tileCache.get(key);
        };
        const parentByKey = new Map();
        const pathTo = (x, y) => {
            const path = [];
            let key = `${x},${y}`;
            const guardLimit = Math.max(1, restRadius * restRadius * 4);
            let guard = 0;
            while (key && guard < guardLimit) {
                const [px, py] = key.split(',').map(Number);
                path.push({ x: px, y: py });
                key = parentByKey.get(key);
                guard++;
            }
            return path.reverse();
        };
        for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (!tileAt(x, y).traversal.passable) blockedAdjacent++;
        }
        const reachable = [];
        const start = tileAt(0, 0);
        if (start.traversal.passable) {
            const startKey = '0,0';
            const seen = new Set([startKey]);
            parentByKey.set(startKey, null);
            const queue = [{ x: 0, y: 0, distance: 0, key: startKey }];
            while (queue.length) {
                const node = queue.shift();
                const tile = tileAt(node.x, node.y);
                reachable.push({ ...node, tile });
                if (node.distance >= restRadius) continue;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = node.x + dx;
                    const ny = node.y + dy;
                    const distance = Math.abs(nx) + Math.abs(ny);
                    if (distance > restRadius) continue;
                    const key = `${nx},${ny}`;
                    if (seen.has(key)) continue;
                    const nextTile = tileAt(nx, ny);
                    if (!nextTile.traversal.passable) continue;
                    seen.add(key);
                    parentByKey.set(key, node.key);
                    queue.push({ x: nx, y: ny, distance, key });
                }
            }
        }
        let nearestResourceSite = null;
        let nearestRestCandidate = null;
        let nearestRouteTile = null;
        let nearestPoi = null;
        for (const { x, y, distance, tile } of reachable) {
            if (distance <= radius && tile.dangerPressure <= 0.36 && ['grove', 'plains', 'forest', 'beach'].includes(tile.baseBiome)) safeTiles++;
            if (distance <= radius && tile.dangerPressure <= 0.32 && ['grove', 'plains', 'forest'].includes(tile.baseBiome)) lowDangerResource = true;
            if (distance <= radius && tile.overlays?.poi?.category === 'resourceSite') {
                if (!nearestResourceSite || distance < nearestResourceSite.distance) nearestResourceSite = { x, y, distance, category: tile.overlays.poi.category };
            }
            if (distance <= routeRadius && tile.overlays?.road) {
                routeAccess = true;
                if (!nearestRouteTile || distance < nearestRouteTile.distance) nearestRouteTile = { x, y, distance };
            }
            if (distance <= restRadius && tile.overlays?.poi && ['restSite', 'settlement'].includes(tile.overlays.poi.category)) {
                if (!nearestRestCandidate || distance < nearestRestCandidate.distance) nearestRestCandidate = { x, y, distance, category: tile.overlays.poi.category };
            }
            if (distance <= restRadius && tile.overlays?.poi) {
                poiCandidate = true;
                if (!nearestPoi || distance < nearestPoi.distance) nearestPoi = { x, y, distance, category: tile.overlays.poi.category };
            }
        }
        const minSafeTiles = options.minSafeTiles ?? Math.max(12, Math.floor(radius * radius * 0.3));
        const paths = {
            resourceSite: nearestResourceSite ? pathTo(nearestResourceSite.x, nearestResourceSite.y) : [],
            restCandidate: nearestRestCandidate ? pathTo(nearestRestCandidate.x, nearestRestCandidate.y) : [],
            recoveryAnchor: nearestRestCandidate ? pathTo(nearestRestCandidate.x, nearestRestCandidate.y) : [],
            routeAccess: nearestRouteTile ? pathTo(nearestRouteTile.x, nearestRouteTile.y) : [],
            earlyPoi: nearestPoi ? pathTo(nearestPoi.x, nearestPoi.y) : []
        };
        const checks = {
            safeBiomeRadius: safeTiles >= minSafeTiles,
            noHardLockout: blockedAdjacent < 4,
            lowDangerResource,
            resourceSite: paths.resourceSite.length > 0,
            routeAccess,
            restCandidate: paths.restCandidate.length > 0,
            recoveryReachable: paths.recoveryAnchor.length > 0,
            connectedRestRoute: routeAccess && paths.restCandidate.length > 0,
            earlyPoi: poiCandidate && paths.earlyPoi.length > 0
        };
        return {
            ok: Object.values(checks).every(Boolean),
            checks,
            paths,
            metrics: { safeTiles, blockedAdjacent, reachableTiles: reachable.length, radius, routeRadius, restRadius, nearestResourceSite, nearestRestCandidate, nearestRouteTile, nearestPoi }
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
    const POI_CANDIDATE_CACHE_LIMIT = 512;
    const poiCandidateCache = new Map();

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
        const cacheKey = `${seed}|${version}|${cellX}|${cellY}`;
        if (poiCandidateCache.has(cacheKey)) return poiCandidateCache.get(cacheKey);
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
        const result = accepted.sort((a, b) => a.anchor.y - b.anchor.y || a.anchor.x - b.anchor.x || a.category.localeCompare(b.category));
        poiCandidateCache.set(cacheKey, result);
        if (poiCandidateCache.size > POI_CANDIDATE_CACHE_LIMIT) {
            poiCandidateCache.delete(poiCandidateCache.keys().next().value);
        }
        return result;
    }

    function getRouteAnchorsForRegion(seed, version, cellX, cellY) {
        let anchors = getPoiCandidatesForRegion(seed, version, cellX, cellY).filter(candidate => candidate.routeAnchor);
        if ((version || 1) >= 6) {
            const priority = { settlement: 0, restSite: 1, structure: 2, landmark: 3 };
            anchors = anchors
                .slice()
                .sort((left, right) =>
                    (priority[left.category] ?? 9) - (priority[right.category] ?? 9)
                    || left.id.localeCompare(right.id)
                )
                .slice(0, 2);
        }
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

    function getPoiContextForTile(seed, version, x, y, regionCell = null) {
        if ((version || 1) >= 2 && x === 4 && y === 0) {
            return { poi: { id: 'poi_start_rest', category: 'restSite', regionId: 'start', anchor: { x, y }, startArea: true }, dangerInfluence: null };
        }
        if ((version || 1) >= 2 && x === -2 && y === 0) {
            return { poi: { id: 'poi_start_resource', category: 'resourceSite', regionId: 'start', anchor: { x, y }, startArea: true }, dangerInfluence: null };
        }
        const cell = regionCell || cellular2D(seed, version, 'macro-region', x, y, 36);
        const matches = [];
        const dangerMatches = [];
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                for (const candidate of getPoiCandidatesForRegion(seed, version, cell.cellX + ox, cell.cellY + oy)) {
                    const dx = Math.abs(x - candidate.anchor.x);
                    const dy = Math.abs(y - candidate.anchor.y);
                    const distance = Math.max(dx, dy);
                    if (candidate.category === 'dangerSite' && distance <= 1) dangerMatches.push({ candidate, distance });
                    const matchesTile = distance === 0;
                    if (matchesTile) matches.push({ candidate, distance });
                }
            }
        }
        matches.sort((left, right) => {
            const leftDangerAnchor = left.candidate.category === 'dangerSite' && left.distance === 0 ? 0 : 1;
            const rightDangerAnchor = right.candidate.category === 'dangerSite' && right.distance === 0 ? 0 : 1;
            return leftDangerAnchor - rightDangerAnchor || left.distance - right.distance || left.candidate.id.localeCompare(right.candidate.id);
        });
        dangerMatches.sort((left, right) => left.distance - right.distance || left.candidate.id.localeCompare(right.candidate.id));
        const danger = dangerMatches[0];
        return {
            poi: matches[0]?.candidate || null,
            dangerInfluence: danger ? {
                siteId: danger.candidate.id,
                category: 'dangerSite',
                anchor: { ...danger.candidate.anchor },
                distance: danger.distance,
                modifier: danger.distance === 0 ? 0.18 : 0.1
            } : null
        };
    }

    function getPoiForTile(seed, version, x, y, regionCell = null) {
        return getPoiContextForTile(seed, version, x, y, regionCell).poi;
    }

    function getDangerInfluenceForTile(seed, version, x, y, regionCell = null) {
        return getPoiContextForTile(seed, version, x, y, regionCell).dangerInfluence;
    }

    function routeParentCell(seed, version, cellX, cellY) {
        if (cellX === 0 && cellY === 0) return null;
        if (cellX === 0) return { x: 0, y: cellY - Math.sign(cellY) };
        if (cellY === 0) return { x: cellX - Math.sign(cellX), y: 0 };
        const reduceX = hash01(seed, version, 'route-parent-axis', cellX, cellY) < 0.5;
        return reduceX
            ? { x: cellX - Math.sign(cellX), y: cellY }
            : { x: cellX, y: cellY - Math.sign(cellY) };
    }

    function sameRouteCell(a, b) {
        return Boolean(a && b && a.x === b.x && a.y === b.y);
    }

    function routeTreeDistance(seed, version, from, to) {
        const cacheKey = `${seed}|${version}|${from.x},${from.y}|${to.x},${to.y}`;
        if (routeLoopCache.has(cacheKey)) return routeLoopCache.get(cacheKey);
        const fromAncestors = new Map();
        let cursor = { ...from };
        let steps = 0;
        while (cursor && steps <= 4096) {
            fromAncestors.set(`${cursor.x},${cursor.y}`, steps);
            cursor = routeParentCell(seed, version, cursor.x, cursor.y);
            steps++;
        }
        cursor = { ...to };
        steps = 0;
        let distance = null;
        while (cursor && steps <= 4096) {
            const known = fromAncestors.get(`${cursor.x},${cursor.y}`);
            if (known !== undefined) {
                distance = known + steps;
                break;
            }
            cursor = routeParentCell(seed, version, cursor.x, cursor.y);
            steps++;
        }
        routeLoopCache.set(cacheKey, distance);
        if (routeLoopCache.size > 4096) routeLoopCache.delete(routeLoopCache.keys().next().value);
        return distance;
    }

    function routeGraphEdge(seed, version, fromCell, toCell, suffix) {
        const fromParent = routeParentCell(seed, version, fromCell.x, fromCell.y);
        const toParent = routeParentCell(seed, version, toCell.x, toCell.y);
        const primary = sameRouteCell(fromParent, toCell) || sameRouteCell(toParent, fromCell);
        if (primary) return { tier: 'primary', cycleLength: 0 };
        if (!chance(seed, version, `road-loop-${suffix}`, fromCell.x, fromCell.y, 0.08)) return null;
        const treeDistance = routeTreeDistance(seed, version, fromCell, toCell);
        const cycleLength = treeDistance === null ? 0 : treeDistance + 1;
        if (cycleLength < 8) return null;
        return { tier: 'loop', cycleLength };
    }

    function getRouteGraphEdgesForRegion(seed, version, cellX, cellY) {
        if ((version || 1) < 5) return [];
        const fromCell = { x: cellX, y: cellY };
        const edges = [];
        for (const [dx, dy, suffix] of [[1, 0, 'e'], [0, 1, 's']]) {
            const toCell = { x: cellX + dx, y: cellY + dy };
            const policy = routeGraphEdge(seed, version, fromCell, toCell, suffix);
            if (!policy) continue;
            edges.push({
                id: `road_region_${cellX}_${cellY}_${suffix}`,
                fromCell: { ...fromCell },
                toCell,
                ...policy
            });
        }
        return edges;
    }

    function routeBranchSegments(seed, version, cellX, cellY) {
        if ((version || 1) < 5) return [];
        const anchors = getRouteAnchorsForRegion(seed, version, cellX, cellY);
        if (anchors.length <= 1) return [];
        const connected = [anchors[0]];
        const segments = [];
        for (const anchor of anchors.slice(1)) {
            const parent = connected
                .map(candidate => ({
                    candidate,
                    distance: Math.hypot(
                        anchor.anchor.x - candidate.anchor.x,
                        anchor.anchor.y - candidate.anchor.y
                    )
                }))
                .sort((a, b) => a.distance - b.distance || a.candidate.id.localeCompare(b.candidate.id))[0].candidate;
            segments.push({
                id: `road_branch_${parent.id}_${anchor.id}`,
                from: parent.anchor,
                to: anchor.anchor,
                fromAnchorId: parent.id,
                toAnchorId: anchor.id,
                tier: 'branch',
                cycleLength: 0
            });
            connected.push(anchor);
        }
        return segments;
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
                if ((version || 1) >= 5) {
                    segments.push(...routeBranchSegments(seed, version, cellX, cellY));
                    for (const edge of getRouteGraphEdgesForRegion(seed, version, cellX, cellY)) {
                        const toAnchor = getRouteAnchorsForRegion(seed, version, edge.toCell.x, edge.toCell.y)[0];
                        segments.push({
                            id: edge.id,
                            from,
                            to: toAnchor.anchor,
                            fromAnchorId: fromAnchor.id,
                            toAnchorId: toAnchor.id,
                            tier: edge.tier,
                            cycleLength: edge.cycleLength
                        });
                    }
                    continue;
                }
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

    function coordinateBetween(value, start, end) {
        return value >= Math.min(start, end) && value <= Math.max(start, end);
    }

    function orthogonalRouteMatch(seed, version, x, y, segment) {
        const fromX = Math.round(segment.from.x);
        const fromY = Math.round(segment.from.y);
        const toX = Math.round(segment.to.x);
        const toY = Math.round(segment.to.y);
        const horizontalFirst = hash01(seed, version, 'road-raster-axis', segment.id) < 0.5;
        const bendX = horizontalFirst ? toX : fromX;
        const bendY = horizontalFirst ? fromY : toY;
        const horizontal = y === bendY && coordinateBetween(x, fromX, toX);
        const vertical = x === bendX && coordinateBetween(y, fromY, toY);
        if (!horizontal && !vertical) return null;
        let direction;
        if (horizontal && vertical) {
            direction = Math.abs(toX - fromX) >= Math.abs(toY - fromY) ? 'east-west' : 'north-south';
        } else {
            direction = horizontal ? 'east-west' : 'north-south';
        }
        return { direction, distance: 0 };
    }

    function getRoadOverlayRaw(seed, version, x, y, fields = null) {
        if ((version || 1) >= 2 && y === 0 && Math.abs(x) <= 6) {
            if ((version || 1) < 5) {
                return { id: 'road_start_axis', direction: 'east-west', startArea: true };
            }
            return {
                id: 'road_start_axis',
                direction: 'east-west',
                startArea: true,
                segmentIds: ['road_start_axis'],
                routeTier: 'starter'
            };
        }
        const terrainFields = fields || getTerrainFields(seed, version, x, y);
        if ((version || 1) < 5 && terrainFields.roughness > 0.86) return null;
        const matches = [];
        for (const segment of routeSegmentsForTile(seed, version, x, y)) {
            const dist = (version || 1) >= 6
                ? orthogonalRouteMatch(seed, version, x, y, segment)
                : distanceToSegment(x, y, segment.from.x, segment.from.y, segment.to.x, segment.to.y);
            if (!dist || dist.distance > 0.72) continue;
            matches.push({
                id: segment.id,
                direction: dist.direction || (Math.abs(dist.dx) >= Math.abs(dist.dy) ? 'east-west' : 'north-south'),
                distance: dist.distance,
                routeTier: segment.tier || 'legacy',
                cycleLength: segment.cycleLength || 0
            });
        }
        matches.sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
        const best = matches[0];
        if (!best) return null;
        if ((version || 1) < 5) return { id: best.id, direction: best.direction };
        return {
            id: best.id,
            direction: best.direction,
            routeTier: best.routeTier,
            cycleLength: best.cycleLength,
            segmentIds: [...new Set(matches.map(match => match.id))]
        };
    }

    function getRoadOverlay(seed, version, x, y, fields) {
        const road = getRoadOverlayRaw(seed, version, x, y, fields);
        if (!road) return null;
        const tileFields = fields || getTerrainFields(seed, version, x, y);
        if (tileFields.water && !getBridgeOverlay(seed, version, x, y, tileFields, road)) return null;
        const connections = [];
        for (const [direction, dx, dy] of [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]]) {
            const neighbor = getRoadOverlayRaw(seed, version, x + dx, y + dy);
            const sharesSegment = (version || 1) >= 5
                ? road.segmentIds?.some(id => neighbor?.segmentIds?.includes(id))
                : neighbor?.id === road.id;
            if (!sharesSegment) continue;
            const neighborFields = getTerrainFields(seed, version, x + dx, y + dy);
            if (neighborFields.water && !getBridgeOverlay(seed, version, x + dx, y + dy, neighborFields, neighbor)) continue;
            connections.push(direction);
        }
        return { ...road, connections };
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
            spanLength: span.spanLength,
            connections: road.direction === 'north-south' ? ['north', 'south'] : ['east', 'west']
        };
    }

    function getBarrierEdges(seed, version, x, y, fields, road) {
        const barriers = [];
        const directions = [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]];
        for (const [direction, dx, dy] of directions) {
            if (road?.connections?.includes(direction)) continue;
            const neighbor = getTerrainFields(seed, version, x + dx, y + dy);
            if (fields.water || neighbor.water) continue;
            const elevationStep = Math.abs(fields.elevation - neighbor.elevation);
            const ruggedness = Math.max(fields.roughness, neighbor.roughness);
            if (elevationStep > 0.075 && ruggedness > 0.72) barriers.push(direction);
        }
        return barriers;
    }

    function cellularFeaturePoint(seed, version, purpose, cellX, cellY, cellSize = 36) {
        const safeSize = Math.max(4, cellSize);
        const jitterX = hash01(seed, version, `${purpose}:jx`, cellX, cellY);
        const jitterY = hash01(seed, version, `${purpose}:jy`, cellX, cellY);
        return {
            x: Math.floor((cellX + 0.18 + jitterX * 0.64) * safeSize),
            y: Math.floor((cellY + 0.18 + jitterY * 0.64) * safeSize)
        };
    }

    function nearestCavePortalLand(seed, version, cellX, cellY, target, salt) {
        const cellSize = 36;
        const minX = cellX * cellSize + 2;
        const maxX = (cellX + 1) * cellSize - 3;
        const minY = cellY * cellSize + 2;
        const maxY = (cellY + 1) * cellSize - 3;
        const candidates = [];
        for (let radius = 0; radius <= 14; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
                    const x = Math.max(minX, Math.min(maxX, target.x + dx));
                    const y = Math.max(minY, Math.min(maxY, target.y + dy));
                    const region = cellular2D(seed, version, 'macro-region', x, y, 36);
                    if (!isWater(seed, version, x, y) && region.cellX === cellX && region.cellY === cellY) {
                        candidates.push({ x, y, rank: hash01(seed, version, 'cave-portal-land', cellX, cellY, salt, x, y) });
                    }
                }
            }
            if (candidates.length) break;
        }
        candidates.sort((a, b) => a.rank - b.rank);
        return candidates[0] || target;
    }

    function getCavePortalsForCell(seed, version, cellX, cellY) {
        const cacheKey = `${seed}|${version}|${cellX}|${cellY}`;
        if (caveNetworkCache.has(cacheKey)) return caveNetworkCache.get(cacheKey);
        const center = cellularFeaturePoint(seed, version, 'macro-region', cellX, cellY, 36);
        const horizontal = hash01(seed, version, 'cave-network-axis', cellX, cellY) >= 0.5;
        const spread = 8 + Math.floor(hash01(seed, version, 'cave-network-spread', cellX, cellY) * 5);
        const targets = horizontal
            ? [{ x: center.x - spread, y: center.y }, { x: center.x + spread, y: center.y }]
            : [{ x: center.x, y: center.y - spread }, { x: center.x, y: center.y + spread }];
        const networkId = `cave_${cellX}_${cellY}`;
        const portals = targets.map((target, index) => {
            const point = nearestCavePortalLand(seed, version, cellX, cellY, target, index);
            return { id: `${networkId}_portal_${index + 1}`, x: point.x, y: point.y, index };
        });
        if (portals[0].x === portals[1].x && portals[0].y === portals[1].y) portals[1].x += horizontal ? 1 : 0;
        const network = { id: networkId, cellX, cellY, axis: horizontal ? 'east-west' : 'north-south', portals };
        caveNetworkCache.set(cacheKey, network);
        if (caveNetworkCache.size > 512) caveNetworkCache.delete(caveNetworkCache.keys().next().value);
        return network;
    }

    function getCavePortalForTile(worldMeta, x, y) {
        const seed = worldMeta?.seed || 'default';
        const version = worldMeta?.generatorVersion || 1;
        if (version < 3) return null;
        const squareX = Math.floor(x / 36);
        const squareY = Math.floor(y / 36);
        const network = getCavePortalsForCell(seed, version, squareX, squareY);
        const portal = network.portals.find(candidate => candidate.x === x && candidate.y === y);
        if (!portal) return null;
        return {
            kind: 'cave-portal',
            networkId: network.id,
            portalId: portal.id,
            portalIndex: portal.index,
            cellX: network.cellX,
            cellY: network.cellY,
            axis: network.axis,
            portals: network.portals.map(entry => ({ ...entry })),
            canonicalOrigin: { x: network.portals[0].x, y: network.portals[0].y }
        };
    }

    function generateBaseTile(worldMeta, x, y, regionBiomes = []) {
        const seed = worldMeta?.seed || 'default';
        const version = worldMeta?.generatorVersion || 1;
        const encounterPolicy = getStartSafetyPolicy(worldMeta, x, y);
        const regionCell = cellular2D(seed, version, 'macro-region', x, y, 36);
        const macroBiome = pickWeighted(seed, version, 'macro-biome', regionCell.cellX, regionCell.cellY, regionBiomes.map(id => ({ id, weight: id === 'grove' ? 2 : 1 }))) || 'plains';
        const fields = getTerrainFields(seed, version, x, y);
        if (encounterPolicy.band === 'protected') {
            fields.water = false;
            fields.waterPressure = Math.min(fields.waterPressure, 0.45);
            fields.dangerPressure = 0;
        } else if (encounterPolicy.band === 'opening') {
            fields.dangerPressure *= encounterPolicy.encounterMultiplier;
        }
        const coast = coastInfo(seed, version, x, y);
        fields.nearWater = coast.nearWater;
        fields.regionInfluence = regionCell.influence;
        let derivedBiome = classifyBiome(fields, macroBiome, regionBiomes);
        if (encounterPolicy.band === 'protected') {
            derivedBiome = regionBiomes.includes('grove') ? 'grove' : (regionBiomes.includes('plains') ? 'plains' : derivedBiome);
        }
        if (version >= 2 && fields.safeStart >= 0.35) {
            const safeStartBiomes = ['grove', 'plains', 'forest', 'beach'];
            if (!safeStartBiomes.includes(derivedBiome)) {
                derivedBiome = regionBiomes.includes('grove') ? 'grove' : (regionBiomes.find(id => safeStartBiomes.includes(id)) || 'plains');
            }
        }
        const roadCandidate = getRoadOverlay(seed, version, x, y, fields);
        const bridge = getBridgeOverlay(seed, version, x, y, fields, roadCandidate);
        // A road sampled over deep water is only meaningful when the complete
        // span resolves as a traversable bridge. Invalid crossings retain the
        // water terrain and discard the decorative/cost-reducing road layer.
        const road = fields.water && !bridge ? null : roadCandidate;
        const barriers = getBarrierEdges(seed, version, x, y, fields, road);
        const poiContext = getPoiContextForTile(seed, version, x, y, regionCell);
        const poi = !encounterPolicy.allowHostileStructures && poiContext.poi?.category === 'dangerSite'
            ? null
            : poiContext.poi;
        const dangerInfluence = encounterPolicy.allowHostileStructures ? poiContext.dangerInfluence : null;
        const cavePortal = encounterPolicy.allowHostileStructures ? getCavePortalForTile(worldMeta, x, y) : null;
        const shoreline = derivedBiome === 'beach'
            ? { edges: coast.shorelineEdges.slice(), nearWater: coast.nearWater }
            : null;
        const overlays = {
            road,
            bridge,
            barriers,
            poi,
            shoreline,
            dangerInfluence,
            structure: cavePortal ? { id: 'cave', site: cavePortal } : null
        };
        const traversal = getTraversal({ biome: derivedBiome, baseBiome: derivedBiome, derivedBiome, water: fields.water, overlays });
        const encounterPressure = getEncounterPressure({
            biome: derivedBiome,
            baseBiome: derivedBiome,
            derivedBiome,
            water: fields.water,
            dangerPressure: fields.dangerPressure,
            overlays,
            encounterPolicy
        }, { encounterPolicy });
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
            encounterPolicy,
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
                encounterPolicy,
                terrainTags: terrainTags(fields, derivedBiome, overlays),
                traversal,
                encounterPressure,
                explored: false
            }),
            overlays,
            site: cavePortal,
            structure: cavePortal ? 'cave' : null,
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
        getStartSafetyPolicy,
        getPoiForTile,
        getDangerInfluenceForTile,
        getPoiBudgetForRegion,
        getPoiCandidatesForRegion,
        getRouteAnchorsForRegion,
        getRouteGraphEdgesForRegion,
        getRoadOverlay,
        getBridgeOverlay,
        getBarrierEdges,
        cellularFeaturePoint,
        getCavePortalsForCell,
        getCavePortalForTile,
        getBiomeTraits,
        getTraversal,
        getEncounterPressure,
        getDangerBand,
        getTileMapSummary,
        validateStartArea,
        classifyBiome,
        generateBaseTile
    };
})();
