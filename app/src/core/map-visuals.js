/**
 * YOU ARE WILD MAP VISUALS
 * Shared local, large-map, and desktop traversal tile presentation helpers.
 */

const YAW_MAP_VISUALS = {
    withComposition(app, tile, visual, options = {}) {
        if (typeof YAW_TILE_COMPOSITION_V2 === 'undefined') return visual;
        const presence = Array.isArray(options.presence)
            ? options.presence
            : (options.isCurrent ? (app.party || []) : []);
        return {
            ...visual,
            composition: YAW_TILE_COMPOSITION_V2.snapshot(app, tile, {
                ...options,
                presence,
                visual
            })
        };
    },

    directions() {
        return [
            { id: 'north', opposite: 'south', dx: 0, dy: -1 },
            { id: 'east', opposite: 'west', dx: 1, dy: 0 },
            { id: 'south', opposite: 'north', dx: 0, dy: 1 },
            { id: 'west', opposite: 'east', dx: -1, dy: 0 }
        ];
    },

    normalizedDirections(values = []) {
        const allowed = new Set(this.directions().map(direction => direction.id));
        return [...new Set((Array.isArray(values) ? values : []).map(String).filter(value => allowed.has(value)))];
    },

    shorelineNeighborPositions() {
        return [
            { id: 'north', dx: 0, dy: -1, bit: 1 },
            { id: 'ne', dx: 1, dy: -1, bit: 2 },
            { id: 'east', dx: 1, dy: 0, bit: 4 },
            { id: 'es', dx: 1, dy: 1, bit: 8 },
            { id: 'south', dx: 0, dy: 1, bit: 16 },
            { id: 'sw', dx: -1, dy: 1, bit: 32 },
            { id: 'west', dx: -1, dy: 0, bit: 64 },
            { id: 'wn', dx: -1, dy: -1, bit: 128 }
        ];
    },

    normalizedShorelineCorners(values = []) {
        const allowed = new Set(['outer-ne', 'outer-es', 'outer-sw', 'outer-wn', 'inner-ne', 'inner-es', 'inner-sw', 'inner-wn']);
        return [...new Set((Array.isArray(values) ? values : []).map(String).filter(value => allowed.has(value)))];
    },

    isWaterTile(tile) {
        return Boolean(tile?.water || tile?.terrain?.water || tile?.derivedBiome === 'water' || tile?.biome === 'water');
    },

    shorelineTopology(tile, resolver = null) {
        const biomeId = tile?.derivedBiome || tile?.baseBiome || tile?.biome || '';
        if (biomeId !== 'beach') return { edges: [], corners: [], mask: 0 };
        const explicitEdges = tile?.overlays?.shoreline?.edges;
        const explicitCorners = tile?.overlays?.shoreline?.corners;
        const positions = this.shorelineNeighborPositions();
        const canResolve = typeof resolver === 'function' && Number.isFinite(Number(tile?.x)) && Number.isFinite(Number(tile?.y));
        const x = Number(tile?.x);
        const y = Number(tile?.y);
        let mask = 0;
        if (canResolve) {
            positions.forEach(position => {
                if (this.isWaterTile(resolver(x + position.dx, y + position.dy))) mask |= position.bit;
            });
        }
        const edges = Array.isArray(explicitEdges)
            ? this.normalizedDirections(explicitEdges)
            : positions.filter(position => ['north', 'east', 'south', 'west'].includes(position.id) && (mask & position.bit)).map(position => position.id);
        if (Array.isArray(explicitEdges)) {
            const bitByEdge = { north: 1, east: 4, south: 16, west: 64 };
            edges.forEach(edge => { mask |= bitByEdge[edge] || 0; });
        }
        const corners = Array.isArray(explicitCorners)
            ? this.normalizedShorelineCorners(explicitCorners)
            : [
                { id: 'ne', edges: ['north', 'east'], diagonalBit: 2 },
                { id: 'es', edges: ['east', 'south'], diagonalBit: 8 },
                { id: 'sw', edges: ['south', 'west'], diagonalBit: 32 },
                { id: 'wn', edges: ['west', 'north'], diagonalBit: 128 }
            ].flatMap(corner => {
                const [first, second] = corner.edges.map(edge => edges.includes(edge));
                if (first && second) return [`outer-${corner.id}`];
                if (!first && !second && (mask & corner.diagonalBit)) return [`inner-${corner.id}`];
                return [];
            });
        return { edges, corners, mask };
    },

    connectionShape(values = [], fallback = 'isolated') {
        const connections = this.normalizedDirections(values);
        const has = direction => connections.includes(direction);
        const count = connections.length;
        if (count >= 4) return 'intersection';
        if (count === 3) {
            if (!has('north')) return 't-south';
            if (!has('east')) return 't-west';
            if (!has('south')) return 't-north';
            return 't-east';
        }
        if (count === 2) {
            if (has('east') && has('west')) return 'horizontal';
            if (has('north') && has('south')) return 'vertical';
            if (has('north') && has('east')) return 'corner-ne';
            if (has('east') && has('south')) return 'corner-es';
            if (has('south') && has('west')) return 'corner-sw';
            if (has('west') && has('north')) return 'corner-wn';
        }
        if (count === 1) return `end-${connections[0]}`;
        return fallback;
    },

    outwardDirection(values = []) {
        const connections = this.normalizedDirections(values);
        if (connections.length === 1) {
            return this.directions().find(direction => direction.id === connections[0])?.opposite || 'south';
        }
        return this.directions().find(direction => !connections.includes(direction.id))?.id || 'south';
    },

    blockedStateKeys(app, edges = []) {
        return this.normalizedDirections(edges).map(direction => (
            app.MAP_TILESET_KEYS.states[`blocked-${direction}`] || app.MAP_TILESET_KEYS.states.blocked
        ));
    },

    isRouteVisualTile(tile) {
        return Boolean(tile?.overlays?.road || tile?.overlays?.bridge);
    },

    routeTileAcceptsEntry(tile, direction) {
        if (!this.isRouteVisualTile(tile)) return false;
        const bridgeConnections = tile?.overlays?.bridge?.connections;
        if (Array.isArray(bridgeConnections)) return this.normalizedDirections(bridgeConnections).includes(direction);
        const bridgeDirection = tile?.overlays?.bridge?.direction;
        if (bridgeDirection === 'north-south') return direction === 'north' || direction === 'south';
        if (bridgeDirection === 'east-west') return direction === 'east' || direction === 'west';
        return true;
    },

    shorelineEdges(tile, resolver = null) {
        return this.shorelineTopology(tile, resolver).edges;
    },

    hasImmediateDanger(app, tile, explicit = undefined) {
        if (typeof explicit === 'boolean') return explicit;
        if (tile?.hostile === true) return true;
        return Array.isArray(tile?.creatures) && tile.creatures.some(creature => {
            if (creature?.disposition !== app.DISPOSITION.ENEMY) return false;
            if (creature?.alive === false || creature?.dead === true) return false;
            return !Number.isFinite(Number(creature?.hp)) || Number(creature.hp) > 0;
        });
    },

    routeVisualShape(app, tile, resolver = null) {
        const fallback = tile?.overlays?.bridge?.direction || tile?.overlays?.road?.direction || 'east-west';
        const bridgeConnections = tile?.overlays?.bridge?.connections;
        if (Array.isArray(bridgeConnections)) return this.connectionShape(bridgeConnections, fallback);
        if (!tile || typeof resolver !== 'function' || !Number.isFinite(Number(tile.x)) || !Number.isFinite(Number(tile.y))) {
            const explicitRoadConnections = tile?.overlays?.road?.connections;
            return Array.isArray(explicitRoadConnections) ? this.connectionShape(explicitRoadConnections, fallback) : fallback;
        }
        const x = Number(tile.x);
        const y = Number(tile.y);
        const explicitRoadConnections = this.normalizedDirections(tile?.overlays?.road?.connections || []);
        const connections = this.directions()
            .filter(direction => {
                const neighbor = resolver(x + direction.dx, y + direction.dy);
                // A null result means that surface is not currently known, so
                // retain deterministic topology metadata. A resolved tile is
                // authoritative and removes stale links into plain water or
                // another non-route surface.
                if (!neighbor) return explicitRoadConnections.includes(direction.id);
                return this.routeTileAcceptsEntry(neighbor, direction.opposite);
            })
            .map(direction => direction.id);
        return this.connectionShape(connections, fallback);
    },

    tileGroundBiome(tile) {
        return String(tile?.derivedBiome || tile?.baseBiome || tile?.biome || 'unknown');
    },

    groundTransitionTopology(tile, resolver = null) {
        if (!tile || typeof resolver !== 'function' || !Number.isFinite(Number(tile.x)) || !Number.isFinite(Number(tile.y))) return [];
        const currentBiome = this.tileGroundBiome(tile);
        return this.directions().flatMap(direction => {
            const neighbor = resolver(Number(tile.x) + direction.dx, Number(tile.y) + direction.dy);
            if (!neighbor) return [];
            const neighborBiome = this.tileGroundBiome(neighbor);
            if (!neighborBiome || neighborBiome === currentBiome) return [];
            if ((currentBiome === 'beach' && neighborBiome === 'water') || (currentBiome === 'water' && neighborBiome === 'beach')) return [];
            return [{ direction: direction.id, biome: neighborBiome }];
        });
    },

    featureTopology(tile, resolver = null) {
        if (!tile?.structure && !tile?.hasLandmark && !tile?.overlays?.poi) return { footprint: null, approachEdges: [] };
        const authored = tile.featureFootprint || tile.overlays?.poi?.footprint || {};
        const featureIdentity = value => String(
            value?.overlays?.poi?.id
            || (value?.structure ? `structure:${value.structure}` : '')
            || (value?.hasLandmark ? `landmark:${value.landmarkName || 'landmark'}` : '')
        );
        const identity = featureIdentity(tile);
        const footprint = {
            width: Number.isInteger(Number(authored.width)) ? Number(authored.width) : 1,
            height: Number.isInteger(Number(authored.height)) ? Number(authored.height) : 1,
            part: String(authored.part || 'single'),
            anchor: authored.anchor || { x: 0.5, y: 0.5 }
        };
        if (typeof resolver !== 'function' || !Number.isFinite(Number(tile.x)) || !Number.isFinite(Number(tile.y))) {
            return { footprint, approachEdges: this.normalizedDirections(tile.overlays?.road?.connections || []) };
        }
        const featureConnections = this.directions().filter(direction => {
            const neighbor = resolver(Number(tile.x) + direction.dx, Number(tile.y) + direction.dy);
            return Boolean(identity && neighbor && featureIdentity(neighbor) === identity);
        }).map(direction => direction.id);
        if (!authored.part && featureConnections.length) footprint.part = this.connectionShape(featureConnections, 'single');
        const approachEdges = this.directions().filter(direction => {
            const neighbor = resolver(Number(tile.x) + direction.dx, Number(tile.y) + direction.dy);
            if (identity && neighbor && featureIdentity(neighbor) === identity) return false;
            return Boolean(neighbor && neighbor.traversal?.passable !== false);
        }).map(direction => direction.id);
        return { footprint, approachEdges };
    },

    evidenceSemanticKeys(app, tile) {
        const keys = [];
        const evidence = app.MAP_TILESET_KEYS.evidence || {};
        if (Array.isArray(tile?.items) && tile.items.length) keys.push(evidence.item || 'evidence-item');
        const creatures = Array.isArray(tile?.creatures) ? tile.creatures : [];
        if (creatures.some(unit => Boolean(app?._isCorpse?.(unit) || unit?.corpse || unit?.dead || ['corpse', 'remains'].includes(unit?.disposition)))) {
            keys.push(evidence.remains || 'evidence-remains');
        }
        if (Array.isArray(tile?.deathBags) && tile.deathBags.length) keys.push(evidence.recoveryBag || 'evidence-recovery-bag');
        if (Array.isArray(tile?.placedObjects) && tile.placedObjects.length) keys.push(evidence.placedObject || 'evidence-placed-object');
        if (tile?.resourceSearched) keys.push(evidence.depleted || 'evidence-depleted');
        return keys;
    },

    mapTileVisual(app, tile, options = {}) {
        const known = Boolean(tile);
        if (!known) {
            const asset = this.tilesetAssetForKey('unknown');
            return this.withComposition(app, null, {
                icon: '·',
                tilesetKey: 'unknown',
                baseTilesetKey: 'unknown',
                kind: 'unknown',
                semanticKeys: ['unknown'],
                classes: 'map-visual-unknown',
                label: options.label || app._label('ui.largeMap.unknownTile', 'Unknown'),
                marker: null,
                hasPaintedAsset: Boolean(asset?.src),
                asset
            }, options);
        }
        const biomeId = tile.displayBiome || tile.derivedBiome || tile.biome || 'plains';
        const baseBiomeId = tile.derivedBiome || tile.baseBiome || tile.biome || biomeId;
        const biome = app.biomes[biomeId] || app.biomes[baseBiomeId] || {};
        const isBeach = baseBiomeId === 'beach';
        const biomeTilesetKey = app.MAP_TILESET_KEYS.biomes[baseBiomeId] || `terrain-${baseBiomeId}`;
        const baseTilesetKey = isBeach ? (app.MAP_TILESET_KEYS.biomes.sand || 'terrain-sand') : biomeTilesetKey;
        const shoreline = this.shorelineTopology(tile, options.neighborResolver);
        const shorelineEdges = shoreline.edges;
        const shorelineCorners = shoreline.corners;
        const groundTransitions = this.groundTransitionTopology(tile, options.neighborResolver);
        const featureTopology = this.featureTopology(tile, options.neighborResolver);
        const elevationTopology = tile.terrainTopology || tile.terrain?.topology || null;
        let icon = biome.icon || '□';
        let label = biome.name || biomeId;
        let tilesetKey = baseTilesetKey;
        let kind = 'biome';
        let routeShape = null;
        let hasRoute = false;
        const classes = ['map-visual', `map-visual-${baseBiomeId}`];
        const semanticKeys = [baseTilesetKey];
        groundTransitions.forEach(transition => {
            semanticKeys.push(`ground-transition-${transition.biome}-${transition.direction}`);
        });
        if (isBeach && biomeTilesetKey !== baseTilesetKey) semanticKeys.push(biomeTilesetKey);
        for (const direction of shorelineEdges) {
            semanticKeys.push(app.MAP_TILESET_KEYS.shorelines?.[direction] || `shoreline-water-${direction}`);
        }
        for (const corner of shorelineCorners) {
            semanticKeys.push(app.MAP_TILESET_KEYS.shorelineCorners?.[corner] || `shoreline-water-${corner}`);
        }
        if (tile.overlays?.bridge) {
            const direction = tile.overlays.bridge.direction || tile.overlays.road?.direction || 'east-west';
            tilesetKey = app.MAP_TILESET_KEYS.bridges[direction] || 'route-bridge-horizontal';
            icon = '🌉';
            kind = 'bridge';
            routeShape = direction;
            hasRoute = true;
            classes.push('map-visual-bridge');
        } else if (tile.overlays?.road) {
            routeShape = this.routeVisualShape(app, tile, options.neighborResolver);
            tilesetKey = app.MAP_TILESET_KEYS.roads[routeShape] || app.MAP_TILESET_KEYS.roads[tile.overlays.road.direction] || 'route-road-horizontal';
            icon = '🛤️';
            kind = 'road';
            hasRoute = true;
            classes.push('map-visual-road', `map-visual-route-${routeShape}`);
        }
        if (hasRoute && !semanticKeys.includes(tilesetKey)) semanticKeys.push(tilesetKey);
        if (Array.isArray(tile.overlays?.cover) && tile.overlays.cover.length) {
            const families = [...new Set(tile.overlays.cover.map(entry => String(entry?.family || 'foliage')))];
            families.forEach(family => semanticKeys.push(app.MAP_TILESET_KEYS.covers?.[family] || app.MAP_TILESET_KEYS.covers?.foliage || 'cover-foliage'));
            classes.push('map-visual-cover');
        }
        if (Array.isArray(tile.overlays?.obstacles) && tile.overlays.obstacles.length) {
            semanticKeys.push(app.MAP_TILESET_KEYS.covers?.obstacle || 'cover-obstacle');
            classes.push('map-visual-obstacle');
        }
        if (tile.overlays?.poi) {
            const category = tile.overlays.poi.category || 'landmark';
            const poiKey = app.MAP_TILESET_KEYS.poi[category] || 'poi-landmark';
            const poiLabels = {
                resourceSite: app._label('ui.poi.resourceSite', 'Resource Site'),
                restSite: app._label('ui.poi.restSite', 'Rest Site'),
                dangerSite: app._label('ui.poi.dangerSite', 'Danger Site'),
                settlement: app._label('ui.poi.settlement', 'Settlement'),
                landmark: app._label('ui.poi.landmark', 'Landmark'),
                structure: app._label('ui.poi.structure', 'Structure')
            };
            if (!semanticKeys.includes(poiKey)) semanticKeys.push(poiKey);
            label = `${poiLabels[category] || poiLabels.landmark} · ${label}`;
            if (!hasRoute) {
                tilesetKey = poiKey;
                icon = category === 'resourceSite' ? '💰' : '◆';
                kind = 'poi';
            }
            classes.push('map-visual-poi');
        }
        if (tile.structure) {
            tilesetKey = app.MAP_TILESET_KEYS.structures[tile.structure] || tilesetKey;
            const structure = app.STRUCTURES[tile.structure];
            icon = structure?.icon || icon;
            kind = 'structure';
            classes.push('map-visual-structure');
        } else if (tile.hasLandmark) {
            tilesetKey = 'poi-landmark';
            kind = 'landmark';
            classes.push('map-visual-landmark');
        }
        if (!semanticKeys.includes(tilesetKey)) semanticKeys.push(tilesetKey);
        semanticKeys.push(...this.evidenceSemanticKeys(app, tile));
        if ((Array.isArray(tile.creatures) && tile.creatures.some(unit => !(app?._isCorpse?.(unit) || unit?.corpse || unit?.dead))) || (options.isCurrent && (app.party || []).length)) {
            semanticKeys.push(app.MAP_TILESET_KEYS.presence?.occupants || 'presence-occupants');
        }
        const blockedEdges = this.normalizedDirections([
            ...(tile.overlays?.barriers || []),
            ...(options.blockedEdges || [])
        ]);
        const blockedReason = options.blockedReason ? String(options.blockedReason) : '';
        semanticKeys.push(...this.blockedStateKeys(app, blockedEdges));
        const dangerInfluence = Boolean(tile.overlays?.dangerInfluence);
        if (dangerInfluence) {
            classes.push('map-visual-danger-influence');
            semanticKeys.push(app.MAP_TILESET_KEYS.effects?.dangerInfluence || 'state-danger-influence');
        }
        const immediateDanger = this.hasImmediateDanger(app, tile, options.danger);
        if (immediateDanger) {
            classes.push('map-visual-immediate-danger');
            semanticKeys.push(app.MAP_TILESET_KEYS.states.danger);
        }
        if (options.questMarker) {
            icon = '◆';
            classes.push('map-visual-quest');
            semanticKeys.push(app.MAP_TILESET_KEYS.states.quest);
        }
        if (options.isCurrent) {
            icon = '●';
            classes.push('map-visual-current');
            semanticKeys.push(app.MAP_TILESET_KEYS.states.current);
        }
        const asset = this.tilesetAssetForKey(tilesetKey);
        return this.withComposition(app, tile, {
            icon,
            tilesetKey,
            baseTilesetKey,
            kind,
            routeShape,
            shorelineEdges,
            shorelineCorners,
            shorelineMask: shoreline.mask,
            groundTransitions,
            elevationKind: elevationTopology?.kind || 'level',
            elevationBand: elevationTopology?.band || 'mid',
            primaryUphill: elevationTopology?.primaryUphill || null,
            primaryDownhill: elevationTopology?.primaryDownhill || null,
            uphillEdges: this.normalizedDirections(elevationTopology?.uphillEdges || []),
            downhillEdges: this.normalizedDirections(elevationTopology?.downhillEdges || []),
            cliffEdges: this.normalizedDirections(elevationTopology?.cliffEdges || []),
            bridgeSpanIndex: Number.isInteger(tile.overlays?.bridge?.spanIndex) ? tile.overlays.bridge.spanIndex : null,
            bridgeSpanLength: Number.isInteger(tile.overlays?.bridge?.spanLength) ? tile.overlays.bridge.spanLength : null,
            bridgeSpanRole: tile.overlays?.bridge?.spanRole || null,
            bridgeShoreEdges: this.normalizedDirections(tile.overlays?.bridge?.shoreEdges || []),
            blockedEdges,
            blockedReason,
            dangerInfluence,
            immediateDanger,
            featureFootprint: featureTopology.footprint,
            featureApproachEdges: featureTopology.approachEdges,
            semanticKeys: [...new Set(semanticKeys)],
            classes: classes.join(' '),
            label,
            marker: options.questMarker || options.poi || null,
            hasPaintedAsset: Boolean(asset?.src),
            asset
        }, options);
    },

    tilesetAssetForKey(key) {
        if (typeof globalThis === 'undefined' || !globalThis.AssetManifest || !globalThis.AssetManifest.getTileAsset) return null;
        return globalThis.AssetManifest.getTileAsset(key);
    },

    mapTileAttrs(app, visual) {
        const key = app._escapeHtml(visual?.tilesetKey || 'unknown');
        const base = app._escapeHtml(visual?.baseTilesetKey || key);
        const kind = app._escapeHtml(visual?.kind || 'unknown');
        const shape = visual?.routeShape ? ` data-route-shape="${app._escapeHtml(visual.routeShape)}"` : '';
        const interiorShape = visual?.interiorShape ? ` data-interior-shape="${app._escapeHtml(visual.interiorShape)}"` : '';
        const interiorConnections = visual?.interiorConnections?.length ? ` data-interior-connections="${app._escapeHtml(visual.interiorConnections.join(' '))}"` : '';
        const interiorAdjacent = visual?.interiorAdjacent?.length ? ` data-interior-adjacent="${app._escapeHtml(visual.interiorAdjacent.join(' '))}"` : '';
        const interiorTheme = visual?.interiorTheme ? ` data-interior-theme="${app._escapeHtml(visual.interiorTheme)}"` : '';
        const interiorStructure = visual?.interiorStructure ? ` data-interior-structure="${app._escapeHtml(visual.interiorStructure)}"` : '';
        const interiorExitDirection = visual?.exitDirection ? ` data-interior-exit-direction="${app._escapeHtml(visual.exitDirection)}"` : '';
        const blocked = visual?.blockedEdges?.length ? ` data-blocked-edges="${app._escapeHtml(visual.blockedEdges.join(' '))}"` : '';
        const blockedReason = visual?.blockedReason ? ` data-blocked-reason="${app._escapeHtml(visual.blockedReason)}"` : '';
        const shoreline = visual?.shorelineEdges?.length ? ` data-shoreline-edges="${app._escapeHtml(visual.shorelineEdges.join(' '))}"` : '';
        const shorelineCorners = visual?.shorelineCorners?.length ? ` data-shoreline-corners="${app._escapeHtml(visual.shorelineCorners.join(' '))}"` : '';
        const shorelineMask = Number.isInteger(visual?.shorelineMask) && visual.shorelineMask > 0 ? ` data-shoreline-mask="${visual.shorelineMask}"` : '';
        const elevationKind = visual?.elevationKind ? ` data-elevation-kind="${app._escapeHtml(visual.elevationKind)}"` : '';
        const elevationBand = visual?.elevationBand ? ` data-elevation-band="${app._escapeHtml(visual.elevationBand)}"` : '';
        const primaryUphill = visual?.primaryUphill ? ` data-elevation-uphill="${app._escapeHtml(visual.primaryUphill)}"` : '';
        const primaryDownhill = visual?.primaryDownhill ? ` data-elevation-downhill="${app._escapeHtml(visual.primaryDownhill)}"` : '';
        const cliffEdges = visual?.cliffEdges?.length ? ` data-cliff-edges="${app._escapeHtml(visual.cliffEdges.join(' '))}"` : '';
        const bridgeSpan = Number.isInteger(visual?.bridgeSpanIndex) && Number.isInteger(visual?.bridgeSpanLength)
            ? ` data-bridge-span-index="${visual.bridgeSpanIndex}" data-bridge-span-length="${visual.bridgeSpanLength}" data-bridge-span-role="${app._escapeHtml(visual.bridgeSpanRole || 'middle')}"`
            : '';
        const bridgeShoreEdges = visual?.bridgeShoreEdges?.length ? ` data-bridge-shore-edges="${app._escapeHtml(visual.bridgeShoreEdges.join(' '))}"` : '';
        const dangerInfluence = visual?.dangerInfluence ? ' data-danger-influence="true"' : '';
        const immediateDanger = visual?.immediateDanger ? ' data-immediate-danger="true"' : '';
        const groundTransitions = visual?.groundTransitions?.length
            ? ` data-ground-transitions="${app._escapeHtml(visual.groundTransitions.map(entry => `${entry.direction}:${entry.biome}`).join(' '))}"`
            : '';
        const featureFootprint = visual?.featureFootprint
            ? ` data-feature-footprint="${app._escapeHtml(`${visual.featureFootprint.width}x${visual.featureFootprint.height}:${visual.featureFootprint.part}`)}" data-feature-approaches="${app._escapeHtml((visual.featureApproachEdges || []).join(' '))}"`
            : '';
        const composition = visual?.composition;
        const compositionLayers = composition?.layers
            ? Object.entries(composition.layers).filter(([, layer]) => layer?.records?.length).map(([name]) => name)
            : [];
        const compositionAttrs = composition
            ? ` data-tile-composition="${app._escapeHtml(composition.schema)}" data-tile-composition-version="${Number(composition.version) || 0}" data-tile-composition-space="${app._escapeHtml(composition.space)}" data-tile-composition-layers="${app._escapeHtml(compositionLayers.join(' '))}"`
            : '';
        const semanticKeys = composition?.compatibility?.semanticKeys || visual?.semanticKeys || [];
        const semantics = semanticKeys.length ? ` data-tileset-semantic-keys="${app._escapeHtml(semanticKeys.join(' '))}"` : '';
        const asset = visual?.asset;
        const assetAttrs = asset
            ? ` data-asset-id="${app._escapeHtml(asset.id)}" data-asset-fallback="${app._escapeHtml(asset.fallbackMode || 'emoji')}"${asset.src ? ` data-asset-src="${app._escapeHtml(asset.src)}"` : ''}`
            : '';
        return `data-tileset-key="${key}" data-base-tileset-key="${base}" data-map-kind="${kind}"${shape}${interiorShape}${interiorConnections}${interiorAdjacent}${interiorTheme}${interiorStructure}${interiorExitDirection}${blocked}${blockedReason}${shoreline}${shorelineCorners}${shorelineMask}${elevationKind}${elevationBand}${primaryUphill}${primaryDownhill}${cliffEdges}${bridgeSpan}${bridgeShoreEdges}${dangerInfluence}${immediateDanger}${groundTransitions}${featureFootprint}${compositionAttrs}${semantics}${assetAttrs}`;
    },

    interiorTileVisual(app, room = null, options = {}) {
        const interiorTheme = String(options.interiorKind || (room?.biome === 'cave' ? 'cave-network' : 'building'));
        const interiorStructure = String(options.interiorStructure || '');
        if (!room) {
            const adjacent = typeof options.roomResolver === 'function' && Number.isFinite(Number(options.x)) && Number.isFinite(Number(options.y))
                ? this.directions().filter(direction => options.roomResolver(Number(options.x) + direction.dx, Number(options.y) + direction.dy)).map(direction => direction.id)
                : [];
            const wallDirection = adjacent.length === 1 ? adjacent[0] : '';
            const wallKey = app.MAP_TILESET_KEYS.interiorWalls?.[wallDirection] || app.MAP_TILESET_KEYS.interior.wall;
            const asset = this.tilesetAssetForKey(app.MAP_TILESET_KEYS.interior.wall);
            const wallKeys = adjacent.length
                ? adjacent.map(direction => app.MAP_TILESET_KEYS.interiorWalls?.[direction] || app.MAP_TILESET_KEYS.interior.wall)
                : [wallKey];
            const wallTile = {
                x: options.x,
                y: options.y,
                biome: 'interior-wall',
                derivedBiome: 'interior-wall',
                traversal: { passable: false, traversalCost: 0, requiredCapability: 'interior-route' },
                overlays: { barriers: this.normalizedDirections([...adjacent, ...(options.blockedEdges || [])]) },
                creatures: [],
                items: [],
                deathBags: []
            };
            return this.withComposition(app, wallTile, {
                icon: '■',
                tilesetKey: app.MAP_TILESET_KEYS.interior.wall,
                baseTilesetKey: app.MAP_TILESET_KEYS.interior.wall,
                kind: 'interior-wall',
                interiorShape: wallDirection ? `wall-${wallDirection}` : (adjacent.length ? `wall-${this.connectionShape(adjacent)}` : 'wall'),
                interiorConnections: [],
                interiorAdjacent: this.normalizedDirections(adjacent),
                interiorTheme,
                interiorStructure,
                blockedEdges: this.normalizedDirections(options.blockedEdges || []),
                semanticKeys: [...new Set([app.MAP_TILESET_KEYS.interior.wall, ...wallKeys, ...this.blockedStateKeys(app, options.blockedEdges || [])])],
                classes: 'map-visual map-visual-interior map-visual-interior-wall',
                label: options.label || 'Wall',
                marker: null,
                hasPaintedAsset: Boolean(asset?.src),
                asset
            }, { ...options, space: 'interior' });
        }
        const biomeId = room.biome || 'indoors';
        const baseTilesetKey = app.MAP_TILESET_KEYS.biomes[biomeId] || (biomeId === 'cave' ? app.MAP_TILESET_KEYS.interior.cave : app.MAP_TILESET_KEYS.interior.room);
        const roomBaseKey = biomeId === 'cave' ? app.MAP_TILESET_KEYS.interior.cave : app.MAP_TILESET_KEYS.interior.room;
        const hasTopology = Array.isArray(room.connections);
        const interiorConnections = hasTopology ? this.normalizedDirections(room.connections) : [];
        const interiorShape = hasTopology ? this.connectionShape(interiorConnections) : '';
        const pathKey = hasTopology ? (app.MAP_TILESET_KEYS.interiorPaths?.[interiorShape] || roomBaseKey) : roomBaseKey;
        const exitDirection = hasTopology ? this.outwardDirection(room.connections) : '';
        let tilesetKey = pathKey;
        let icon = room.explored ? '□' : '·';
        let kind = 'interior-room';
        const classes = ['map-visual', 'map-visual-interior', `map-visual-${biomeId}`];
        const semanticKeys = [baseTilesetKey, roomBaseKey, pathKey];
        if (room.exit) {
            const exitKey = app.MAP_TILESET_KEYS.interiorExits?.[exitDirection] || app.MAP_TILESET_KEYS.interior.exit;
            tilesetKey = exitKey;
            semanticKeys.push(app.MAP_TILESET_KEYS.interior.exit, exitKey);
            if (biomeId !== 'cave') {
                semanticKeys.push(app.MAP_TILESET_KEYS.interiorDoors?.[exitDirection] || app.MAP_TILESET_KEYS.interior.door);
            }
            icon = '🚪';
            kind = 'interior-exit';
            classes.push('map-visual-interior-exit');
        } else if (room.structure) {
            tilesetKey = app.MAP_TILESET_KEYS.structures[room.structure] || app.MAP_TILESET_KEYS.interior.door;
            icon = app.STRUCTURES[room.structure]?.icon || '▣';
            kind = 'interior-feature';
            classes.push('map-visual-interior-feature');
            semanticKeys.push(tilesetKey);
        }
        const blockedEdges = this.normalizedDirections(options.blockedEdges || []);
        semanticKeys.push(...this.blockedStateKeys(app, blockedEdges));
        if (options.isCurrent) {
            classes.push('map-visual-current');
            semanticKeys.push(app.MAP_TILESET_KEYS.states.current);
        }
        const biome = app.biomes[biomeId] || app.biomes.indoors || {};
        const asset = this.tilesetAssetForKey(tilesetKey);
        const interiorTile = {
            ...room,
            x: Number.isFinite(Number(options.x)) ? Number(options.x) : room.x,
            y: Number.isFinite(Number(options.y)) ? Number(options.y) : room.y,
            biome: biomeId,
            derivedBiome: biomeId,
            traversal: room.traversal || { passable: true, traversalCost: 1, requiredCapability: null, routeModifier: 0 },
            overlays: room.overlays || {},
            creatures: Array.isArray(room.creatures) ? room.creatures : [],
            items: Array.isArray(room.items) ? room.items : [],
            deathBags: Array.isArray(room.deathBags) ? room.deathBags : [],
            placedObjects: Array.isArray(room.placedObjects) ? room.placedObjects : []
        };
        return this.withComposition(app, interiorTile, {
            icon,
            tilesetKey,
            baseTilesetKey,
            kind,
            routeShape: interiorShape || null,
            interiorShape: interiorShape || null,
            interiorConnections,
            interiorAdjacent: [],
            interiorTheme,
            interiorStructure,
            exitDirection: room.exit ? exitDirection : null,
            blockedEdges,
            semanticKeys: [...new Set(semanticKeys)],
            classes: classes.join(' '),
            label: room.exit ? 'Exit' : (app.STRUCTURES[room.structure]?.name || biome.name || 'Room'),
            marker: null,
            hasPaintedAsset: Boolean(asset?.src),
            asset
        }, {
            ...options,
            space: 'interior',
            route: hasTopology ? {
                kind: room.exit ? 'threshold' : 'path',
                id: room.exit ? 'interior-exit' : 'interior-path',
                direction: interiorShape,
                connections: interiorConnections
            } : null
        });
    },

    dangerPressureLabel(app, value = 0) {
        if (value >= 0.66) return app._label('ui.tileInfo.pressureHigh', 'High');
        if (value >= 0.36) return app._label('ui.tileInfo.pressureElevated', 'Elevated');
        return app._label('ui.tileInfo.pressureLow', 'Low');
    },

    dangerBandLabel(app, band = 'low') {
        const labels = {
            safe: ['ui.tileInfo.dangerSafe', 'Safe'],
            low: ['ui.tileInfo.dangerLow', 'Low'],
            guarded: ['ui.tileInfo.dangerGuarded', 'Guarded'],
            dangerous: ['ui.tileInfo.dangerDangerous', 'Dangerous'],
            severe: ['ui.tileInfo.dangerSevere', 'Severe']
        };
        const [key, fallback] = labels[band] || labels.low;
        return app._label(key, fallback);
    },

    tileDangerBand(app, tile = null) {
        const summary = this.tileMapSummary(app, tile);
        const band = summary?.dangerBand?.id || (
            summary?.danger === 'high' ? 'dangerous'
                : summary?.danger === 'elevated' ? 'guarded' : 'low'
        );
        return {
            id: band,
            label: this.dangerBandLabel(app, band),
            score: Number(summary?.dangerBand?.score || 0)
        };
    },

    tileMapSummary(app, tile = null) {
        const current = tile || app.getTile(app.location.x, app.location.y);
        if (typeof WorldGen === 'undefined') {
            return {
                biome: current.displayBiome || current.biome,
                coords: { x: current.x, y: current.y },
                terrain: { water: Boolean(current.water), tags: Array.isArray(current.terrainTags) ? current.terrainTags.slice() : [] },
                traversal: current.traversal || { passable: true, traversalCost: 1, requiredCapability: null, routeModifier: 0 },
                danger: 'low',
                markers: [],
                discovered: Boolean(current.explored),
                restAvailable: app._isRestCapableStructure(current.structure, current),
                questRelevant: false
            };
        }
        const biome = app.biomes[current.displayBiome || current.biome] || app.biomes[current.biome] || {};
        return WorldGen.getTileMapSummary(current, {
            biomeDef: biome,
            biomeDanger: biome.danger || 0,
            isNight: app._isNight(),
            restAvailable: app._isRestCapableStructure(current.structure, current),
            questRelevant: Boolean(app._largeMapQuestMarker(current.x, current.y))
        });
    },

    tileInfoHtml(app, tile = null) {
        if (app.inInterior && app.activeInterior) {
            const room = app._currentInteriorTile();
            const biome = app.biomes[room?.biome] || app.biomes.indoors;
            return `<div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">${app._escapeHtml(app._label('ui.tileInfo.title', 'Current Tile'))}</div>` +
                `<div>${biome?.icon || '□'} ${app._escapeHtml(biome?.name || app._label('ui.largeMap.interior', 'Interior'))} · ${app._escapeHtml(app.activeInterior.structureName)} (${app.interiorLocation.x}, ${app.interiorLocation.y})</div>`;
        }
        const current = tile || app.getTile(app.location.x, app.location.y);
        const biome = app.biomes[current.displayBiome || current.biome] || app.biomes[current.biome] || {};
        const structure = current.structure ? (app.STRUCTURES[current.structure]?.name || current.structure) : app._label('ui.tileInfo.none', 'None');
        const landmark = current.hasLandmark && current.landmarkName ? current.landmarkName : app._label('ui.tileInfo.none', 'None');
        const summary = this.tileMapSummary(app, current);
        const tagText = summary.terrain.tags.length || summary.markers.length ? [...new Set([...summary.terrain.tags, ...summary.markers.map(tag => String(tag).toLowerCase())])].join(', ') : app._label('ui.tileInfo.none', 'None');
        const phase = app._isNight() ? app._label('ui.tileInfo.night', 'Night') : app._label('ui.tileInfo.day', 'Day');
        const danger = this.dangerBandLabel(app, summary.dangerBand?.id || (summary.danger === 'high' ? 'dangerous' : (summary.danger === 'elevated' ? 'guarded' : 'low')));
        return `<div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">${app._escapeHtml(app._label('ui.tileInfo.title', 'Current Tile'))}</div>` +
            `<div><strong>${app._escapeHtml(app._label('ui.tileInfo.biome', 'Biome'))}:</strong> ${biome.icon || ''} ${app._escapeHtml(biome.name || current.biome)}</div>` +
            `<div><strong>${app._escapeHtml(app._label('ui.tileInfo.coords', 'Coords'))}:</strong> ${current.x}, ${current.y} · <strong>${app._escapeHtml(app._label('ui.tileInfo.time', 'Time'))}:</strong> ${app._escapeHtml(app._timeLabel())} ${app._escapeHtml(phase)}</div>` +
            `<div><strong>${app._escapeHtml(app._label('ui.tileInfo.danger', 'Danger'))}:</strong> ${app._escapeHtml(danger)} · <strong>${app._escapeHtml(app._label('ui.tileInfo.tags', 'Tags'))}:</strong> ${app._escapeHtml(tagText)}</div>` +
            `<div><strong>${app._escapeHtml(app._label('ui.tileInfo.structure', 'Structure'))}:</strong> ${app._escapeHtml(structure)} · <strong>${app._escapeHtml(app._label('ui.tileInfo.landmark', 'Landmark'))}:</strong> ${app._escapeHtml(landmark)}</div>`;
    },

    compactTileInfoHtml(app, tile = null) {
        const detailsLabel = app._escapeHtml(app._label('ui.details', 'Details'));
        if (app.inInterior && app.activeInterior) {
            const room = app._currentInteriorTile();
            const biome = app.biomes[room?.biome] || app.biomes.indoors;
            const phase = app._isNight() ? app._label('ui.tileInfo.night', 'Night') : app._label('ui.tileInfo.day', 'Day');
            return `<div class="mobile-tile-summary-row"><span><strong>${app._escapeHtml(app._label('ui.tileInfo.title', 'Current Tile'))}</strong> ${biome?.icon || '□'} ${app._escapeHtml(biome?.name || app._label('ui.largeMap.interior', 'Interior'))}</span><button class="nav-btn mobile-tile-details-btn" data-command-surface="tile-details" data-command-mode="navigation" data-command-control="open-tile-details" title="${app._escapeHtml(app._label('ui.tileDetails.open', 'Open tile details'))}" aria-label="${app._escapeHtml(app._label('ui.tileDetails.open', 'Open tile details'))}" onpointerdown="event.stopPropagation()">${detailsLabel}</button></div>`
                + `<div class="mobile-tile-meta-row">${app._escapeHtml(app.activeInterior.structureName)} · ${app.interiorLocation.x}, ${app.interiorLocation.y} · ${app._escapeHtml(app._timeLabel())} ${app._escapeHtml(phase)}</div>`;
        }
        const current = tile || app.getTile(app.location.x, app.location.y);
        const biome = app.biomes[current.displayBiome || current.biome] || app.biomes[current.biome] || {};
        const summary = this.tileMapSummary(app, current);
        const phase = app._isNight() ? app._label('ui.tileInfo.night', 'Night') : app._label('ui.tileInfo.day', 'Day');
        const danger = this.dangerBandLabel(app, summary.dangerBand?.id || (summary.danger === 'high' ? 'dangerous' : (summary.danger === 'elevated' ? 'guarded' : 'low')));
        return `<div class="mobile-tile-summary-row"><span><strong>${app._escapeHtml(app._label('ui.tileInfo.title', 'Current Tile'))}</strong> ${biome.icon || ''} ${app._escapeHtml(biome.name || current.biome)}</span><button class="nav-btn mobile-tile-details-btn" data-command-surface="tile-details" data-command-mode="navigation" data-command-control="open-tile-details" title="${app._escapeHtml(app._label('ui.tileDetails.open', 'Open tile details'))}" aria-label="${app._escapeHtml(app._label('ui.tileDetails.open', 'Open tile details'))}" onpointerdown="event.stopPropagation()">${detailsLabel}</button></div>`
            + `<div class="mobile-tile-meta-row">${current.x}, ${current.y} · ${app._escapeHtml(app._timeLabel())} ${app._escapeHtml(phase)} · ${app._escapeHtml(app._label('ui.tileInfo.danger', 'Danger'))}: ${app._escapeHtml(danger)}</div>`;
    },

    renderTileInfo(app, tile = null) {
        const html = this.tileInfoHtml(app, tile);
        const tileInfo = document.getElementById('tile-info');
        if (tileInfo) tileInfo.innerHTML = html;
        const mobileTileInfo = document.getElementById('mobile-tile-info');
        if (mobileTileInfo) {
            mobileTileInfo.innerHTML = this.compactTileInfoHtml(app, tile);
            mobileTileInfo.querySelector('[data-command-control="open-tile-details"]')?.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                app.openTileDetails?.();
            });
        }
        const mobileDetails = document.getElementById('mobile-tile-details-content');
        if (mobileDetails) mobileDetails.innerHTML = html;
    },

    setTileDetailsUnderlyingInert(app, sheet, enabled) {
        if (!sheet?.parentElement) return;
        if (enabled) {
            app._tileDetailsInertState = Array.from(sheet.parentElement.children)
                .filter(element => element !== sheet)
                .map(element => ({
                    element,
                    inert: element.hasAttribute('inert'),
                    ariaHidden: element.getAttribute('aria-hidden')
                }));
            app._tileDetailsInertState.forEach(({ element }) => {
                element.setAttribute('inert', '');
                element.setAttribute('aria-hidden', 'true');
            });
            return;
        }
        (app._tileDetailsInertState || []).forEach(({ element, inert, ariaHidden }) => {
            if (!element?.isConnected) return;
            if (inert) element.setAttribute('inert', '');
            else element.removeAttribute('inert');
            if (ariaHidden == null) element.removeAttribute('aria-hidden');
            else element.setAttribute('aria-hidden', ariaHidden);
        });
        app._tileDetailsInertState = null;
    },

    openTileDetails(app) {
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        app._tileDetailsReturnFocus = active && active !== document.body ? {
            element: active,
            control: active.getAttribute?.('data-command-control') || ''
        } : null;
        this.renderTileInfo(app);
        const sheet = document.getElementById('mobile-tile-details-sheet');
        if (!sheet) return false;
        sheet.hidden = false;
        sheet.setAttribute('aria-hidden', 'false');
        document.getElementById('mobile-play-surface')?.classList?.add('tile-details-open');
        this.setTileDetailsUnderlyingInert(app, sheet, true);
        app._activateFocusTrap?.(sheet, { close: () => app.closeTileDetails() });
        app._focusFirstIn?.(sheet);
        return true;
    },

    closeTileDetails(app) {
        const sheet = document.getElementById('mobile-tile-details-sheet');
        if (!sheet) return false;
        const returnFocus = app._tileDetailsReturnFocus || null;
        app._tileDetailsReturnFocus = null;
        sheet.hidden = true;
        sheet.setAttribute('aria-hidden', 'true');
        document.getElementById('mobile-play-surface')?.classList?.remove('tile-details-open');
        this.setTileDetailsUnderlyingInert(app, sheet, false);
        app._restoreFocusTrap?.({ restoreFocus: false });
        const equivalent = returnFocus?.control
            ? Array.from(document.querySelectorAll(`[data-command-control="${returnFocus.control}"]`)).find(element => {
                if (!element?.isConnected || element.disabled || element.closest?.('[inert]')) return false;
                const style = typeof getComputedStyle === 'function' ? getComputedStyle(element) : null;
                const rect = element.getBoundingClientRect?.();
                return (!style || (style.display !== 'none' && style.visibility !== 'hidden'))
                    && (!rect || rect.width > 0 || rect.height > 0);
            })
            : null;
        const target = returnFocus?.element?.isConnected && !returnFocus.element.closest?.('[inert]')
            ? returnFocus.element
            : equivalent;
        if (target?.focus) {
            try { target.focus({ preventScroll: true }); } catch (_error) { target.focus(); }
        }
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MAP_VISUALS = YAW_MAP_VISUALS;
}
