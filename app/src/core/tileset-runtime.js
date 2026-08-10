/**
 * YOU ARE WILD TILESET RUNTIME
 * Async Media Repository leases with synchronous, layered map presentation.
 */

const YAW_TILESET_RUNTIME = {
    candidates: new Map(),
    builtinCandidate: null,
    activeModuleId: '',
    sequence: 0,
    styleSequence: 0,

    repository() {
        return typeof YAW_MEDIA_REPOSITORY !== 'undefined' ? YAW_MEDIA_REPOSITORY : null;
    },

    requiredKeys() {
        if (typeof globalThis === 'undefined' || !globalThis.AssetManifest?.allTileKeys) return [];
        return globalThis.AssetManifest.allTileKeys();
    },

    _presentation(metadata) {
        return (Array.isArray(metadata?.presentations) ? metadata.presentations : [])
            .find(presentation => presentation?.type === YAW_TILESET_PACK_V1.PRESENTATION_TYPE) || null;
    },

    _setActiveCandidate() {
        const candidates = [...this.candidates.values()].sort((left, right) => right.sequence - left.sequence);
        this.activeModuleId = candidates[0]?.moduleId || '';
        return candidates[0] || null;
    },

    _registerAtlasUrl(url) {
        const safeUrl = String(url || '');
        if (typeof document === 'undefined' || !document.documentElement?.style?.setProperty) {
            return { cssImage: `url("${this._styleUrl(safeUrl)}")`, cssVariable: '' };
        }
        const cssVariable = `--yaw-tileset-atlas-${++this.styleSequence}`;
        document.documentElement.style.setProperty(cssVariable, `url("${this._styleUrl(safeUrl)}")`);
        return { cssImage: `var(${cssVariable})`, cssVariable };
    },

    _releaseAtlasUrl(atlas) {
        if (!atlas?.cssVariable || typeof document === 'undefined') return;
        document.documentElement?.style?.removeProperty?.(atlas.cssVariable);
    },

    registerBuiltin(value) {
        const presentation = value?.presentation;
        const resources = Array.isArray(value?.resources) ? value.resources : [];
        const atlasUrls = value?.atlasUrls || {};
        const pack = YAW_TILESET_PACK_V1.normalizePresentation(presentation, {
            resources,
            requiredKeys: this.requiredKeys()
        });
        const leases = new Map(pack.atlases.map(atlas => {
            const url = String(atlasUrls[atlas.resourceId] || '');
            return [atlas.id, { ...atlas, leaseId: '', url, ...this._registerAtlasUrl(url) }];
        }));
        if ([...leases.values()].some(atlas => !atlas.url)) {
            throw new Error('Bundled Tileset Pack is missing an atlas URL');
        }
        this.builtinCandidate = { moduleId: '__bundled__', pack, leases, sequence: 0, bundled: true };
        return this.status('__bundled__');
    },

    _refreshMaps() {
        if (typeof App === 'undefined' || !App?.player || App.screen !== 'game') return;
        try { App.renderMap?.(); } catch (error) {}
    },

    async activateModule(moduleValue, options = {}) {
        const moduleId = String(moduleValue || '').trim();
        const repository = options.repository || this.repository();
        if (!moduleId || !repository) return null;
        const metadata = await repository.ownerMetadata(moduleId);
        const presentation = this._presentation(metadata);
        if (!presentation) return null;
        const records = await repository.listOwner(moduleId);
        const resources = records.map(record => record?.descriptor).filter(Boolean);
        const pack = YAW_TILESET_PACK_V1.normalizePresentation(presentation, {
            resources,
            requiredKeys: this.requiredKeys()
        });
        const leases = new Map();
        try {
            for (const atlas of pack.atlases) {
                const lease = await repository.acquire(moduleId, atlas.resourceId);
                leases.set(atlas.id, { ...atlas, ...lease, ...this._registerAtlasUrl(lease.url) });
            }
        } catch (error) {
            for (const lease of leases.values()) {
                this._releaseAtlasUrl(lease);
                repository.release(moduleId, lease.leaseId);
            }
            throw error;
        }
        this.deactivateModule(moduleId, { repository, refresh: false });
        const candidate = { moduleId, pack, leases, sequence: ++this.sequence };
        this.candidates.set(moduleId, candidate);
        this._setActiveCandidate();
        if (options.refresh !== false) this._refreshMaps();
        return this.status(moduleId);
    },

    deactivateModule(moduleValue, options = {}) {
        const moduleId = String(moduleValue || '').trim();
        const candidate = this.candidates.get(moduleId);
        if (!candidate) return false;
        const repository = options.repository || this.repository();
        for (const lease of candidate.leases.values()) {
            this._releaseAtlasUrl(lease);
            try { repository?.release(moduleId, lease.leaseId); } catch (error) {}
        }
        this.candidates.delete(moduleId);
        this._setActiveCandidate();
        if (options.refresh !== false) this._refreshMaps();
        return true;
    },

    clear(options = {}) {
        for (const moduleId of [...this.candidates.keys()]) {
            this.deactivateModule(moduleId, { ...options, refresh: false });
        }
        this.activeModuleId = '';
        if (options.refresh !== false) this._refreshMaps();
    },

    activeCandidate() {
        return this.activeModuleId ? this.candidates.get(this.activeModuleId) || this.builtinCandidate : this.builtinCandidate;
    },

    _candidateChain() {
        const modules = [...this.candidates.values()].sort((left, right) => right.sequence - left.sequence);
        if (this.builtinCandidate) modules.push(this.builtinCandidate);
        return modules;
    },

    status(moduleId = this.activeModuleId) {
        const normalizedId = String(moduleId || '');
        const candidate = normalizedId === '__bundled__' ? this.builtinCandidate : this.candidates.get(normalizedId);
        if (!candidate) return null;
        return {
            moduleId: candidate.moduleId,
            packId: candidate.pack.id,
            name: candidate.pack.name,
            active: candidate.moduleId === (this.activeModuleId || '__bundled__'),
            scaling: candidate.pack.scaling,
            atlasCount: candidate.pack.atlases.length,
            tileCount: Object.keys(candidate.pack.tiles).length,
            missingRequired: candidate.pack.coverage.missingRequired.slice()
        };
    },

    resolveTile(keyValue) {
        const requestedKey = String(keyValue || '');
        const candidates = this._candidateChain();
        const resolveFrom = (key, startIndex, seen) => {
            if (!key || seen.has(`${startIndex}:${key}`)) return null;
            seen.add(`${startIndex}:${key}`);
            for (let index = startIndex; index < candidates.length; index++) {
                const candidate = candidates[index];
                const localSeen = new Set();
                let cursor = key;
                while (cursor && !localSeen.has(cursor)) {
                    localSeen.add(cursor);
                    const tile = candidate.pack.tiles[cursor];
                    if (!tile) break;
                    if (tile.layers?.length) {
                        return {
                            key: cursor,
                            requestedKey,
                            tile,
                            pack: candidate.pack,
                            atlases: candidate.leases,
                            moduleId: candidate.moduleId
                        };
                    }
                    if (!tile.fallback) break;
                    if (!candidate.pack.tiles[tile.fallback]) {
                        const inherited = resolveFrom(tile.fallback, index + 1, seen);
                        if (inherited) return inherited;
                    }
                    cursor = tile.fallback;
                }
            }
            return null;
        };
        return resolveFrom(requestedKey, 0, new Set());
    },

    _semanticKeys(visual = {}) {
        const keys = [];
        const push = key => {
            const normalized = String(key || '');
            if (normalized && !keys.includes(normalized)) keys.push(normalized);
        };
        const compositionKeys = visual?.composition?.compatibility?.semanticKeys;
        if (Array.isArray(compositionKeys)) compositionKeys.forEach(push);
        else if (Array.isArray(visual.semanticKeys)) visual.semanticKeys.forEach(push);
        else {
            push(visual.baseTilesetKey);
            push(visual.tilesetKey);
        }
        if (String(visual.classes || '').includes('map-visual-quest')) push('state-quest');
        if (String(visual.classes || '').includes('map-visual-current')) push('state-current');
        return keys;
    },

    _compositionLayerForKey(key = '') {
        const value = String(key || '');
        if (/^(terrain-(?!transition)|interior-(room|cave-room)$)/.test(value)) return 'ground';
        if (/^(shoreline-|ground-transition-|terrain-transition-|terrain-elevation-|state-blocked)/.test(value)) return 'terrain';
        if (/^(route-|interior-path-|interior-door-|interior-exit-)/.test(value)) return 'route';
        if (/^(cover-)/.test(value)) return 'cover';
        if (/^(structure-|poi-)/.test(value) || value === 'interior-door' || value === 'interior-exit') return 'feature';
        if (/^(evidence-)/.test(value)) return 'evidence';
        if (/^(presence-)/.test(value)) return 'presence';
        if (/^(state-)/.test(value)) return 'state';
        return 'feature';
    },

    _compositionSubRankForKey(key = '') {
        const value = String(key || '');
        if (/^ground-transition-/.test(value)) return 10;
        if (/^shoreline-/.test(value)) return 20;
        if (/^(terrain-transition-|terrain-elevation-)/.test(value)) return 30;
        if (/^state-blocked/.test(value)) return 40;
        if (/^(route-|interior-path-|interior-door-|interior-exit-)/.test(value)) return 20;
        if (/^cover-/.test(value)) return 20;
        if (/^(structure-|poi-)/.test(value)) return 20;
        return 20;
    },

    _transitionMetadata(visual, semanticKey) {
        const value = String(semanticKey || '');
        const groundMatch = value.match(/^ground-transition-(.+)-(north|east|south|west)$/);
        if (groundMatch) {
            const [, biome, direction] = groundMatch;
            const metadata = (visual?.adjacencyBlend?.terrain || []).find(entry => (
                String(entry?.biome || entry?.sourceBiome) === biome && String(entry?.direction) === direction
            ));
            return metadata ? { ...metadata, kind: 'ground-transition' } : null;
        }
        const shorelineMatch = value.match(/^shoreline-water-(north|east|south|west)$/);
        if (!shorelineMatch) return null;
        const direction = shorelineMatch[1];
        const metadata = (visual?.adjacencyBlend?.sharedEdges || []).find(entry => (
            entry?.policy === 'shoreline' && entry?.destinationOwned && String(entry?.direction) === direction
        ));
        return metadata ? { ...metadata, kind: 'shoreline' } : null;
    },

    _edgeClipPath(metadata = {}) {
        const direction = String(metadata?.direction || '');
        const contour = (Array.isArray(metadata?.contour) ? metadata.contour : [])
            .slice(0, 5)
            .map(value => Math.max(0.12, Math.min(0.46, Number(value) || 0)));
        if (!['north', 'east', 'south', 'west'].includes(direction) || contour.length !== 5) return '';
        const endpointCorners = {
            north: ['wn', 'ne'], east: ['ne', 'es'], south: ['sw', 'es'], west: ['wn', 'sw']
        }[direction];
        const cornerState = endpointCorners.map(corner => String(metadata?.corners?.[corner] || ''));
        const isTrimmed = state => state === 'trim';
        const isCapped = state => state === 'cap';
        const edgeStart = isTrimmed(cornerState[0]) ? 0.26 : 0;
        const edgeEnd = isTrimmed(cornerState[1]) ? 0.74 : 1;
        // A cap must still meet the source material at the shared boundary,
        // but it tapers before entering the four-cell corner. A split trims
        // the losing edge more aggressively, leaving exactly one material to
        // own the junction. Joined or extended same-material edges remain
        // full width so their identical paint can meet without a hole.
        const contourStart = isTrimmed(cornerState[0]) ? 0.38 : 0;
        const contourEnd = isTrimmed(cornerState[1]) ? 0.62 : 1;
        // Interpolate the five canonical samples before clipping. Corner caps
        // need more than one intermediate point or an otherwise continuous
        // beach/ground edge collapses into a conspicuous triangular wedge.
        const interpolatedContour = Array.from({ length: 9 }, (_, index) => {
            const position = index / 2;
            const lower = Math.floor(position);
            const upper = Math.min(4, Math.ceil(position));
            const mix = position - lower;
            return contour[lower] * (1 - mix) + contour[upper] * mix;
        });
        const adjustedDepth = interpolatedContour.map((value, index) => {
            const state = index === 0 ? cornerState[0] : (index === 8 ? cornerState[1] : '');
            const extension = state === 'extend' ? 0.045 : (state === 'join' ? 0.025 : 0);
            let cappedDepth = value;
            const startDistance = index;
            const endDistance = 8 - index;
            if (isCapped(cornerState[0]) && startDistance <= 3) {
                const progress = startDistance / 3;
                const eased = progress * progress * (3 - 2 * progress);
                cappedDepth = 0.12 + (cappedDepth - 0.12) * eased;
            }
            if (isCapped(cornerState[1]) && endDistance <= 3) {
                const progress = endDistance / 3;
                const eased = progress * progress * (3 - 2 * progress);
                cappedDepth = 0.12 + (cappedDepth - 0.12) * eased;
            }
            return Math.max(0.12, Math.min(0.48, cappedDepth + extension));
        });
        const crossValues = Array.from({ length: 9 }, (_, index) => contourStart + (contourEnd - contourStart) * index / 8);
        const percent = value => Number((value * 100).toFixed(1));
        const edgePoint = cross => {
            if (direction === 'north') return `${percent(cross)}% 0%`;
            if (direction === 'east') return `100% ${percent(cross)}%`;
            if (direction === 'south') return `${percent(cross)}% 100%`;
            return `0% ${percent(cross)}%`;
        };
        const contourPoint = (cross, depth) => {
            if (direction === 'north') return `${percent(cross)}% ${percent(depth)}%`;
            if (direction === 'east') return `${percent(1 - depth)}% ${percent(cross)}%`;
            if (direction === 'south') return `${percent(cross)}% ${percent(1 - depth)}%`;
            return `${percent(depth)}% ${percent(cross)}%`;
        };
        const points = [edgePoint(edgeStart), edgePoint(edgeEnd)];
        for (let index = 8; index >= 0; index--) points.push(contourPoint(crossValues[index], adjustedDepth[index]));
        return `polygon(${points.join(', ')})`;
    },

    _dynamicLayerRequests(visual = {}) {
        const composition = visual?.composition;
        if (!composition?.layers) return [];
        const requests = [];
        const cover = composition.layers.cover?.records || [];
        cover.forEach((record, index) => {
            const family = String(record?.family || (record?.mechanical ? 'rock' : 'foliage'));
            const kind = String(record?.kind || 'cover');
            const scale = Number(record?.scale || 1);
            const edgeCover = ['adjacent-spill', 'edge-spill-origin', 'edge-continuity'].includes(kind);
            const renderedScale = edgeCover
                ? (family.endsWith('-spill')
                    ? Math.max(0.52, Math.min(0.74, scale * 0.86))
                    : Math.max(0.24, Math.min(0.44, scale * 0.46)))
                : (kind === 'biome-identity' && record?.stratum === 'canopy'
                    ? Math.max(0.46, Math.min(0.68, scale * 0.58))
                    : Math.max(0.28, Math.min(0.58, scale * 0.5)));
            const rotation = Number(record?.rotation || 0);
            const radians = rotation * Math.PI / 180;
            const requestedX = Number(record?.anchor?.x ?? 0.5);
            const requestedY = Number(record?.anchor?.y ?? 0.5);
            const interiorSafe = record?.edgeSafe === undefined
                ? ['biome-identity', 'biome-detail'].includes(kind)
                : Boolean(record.edgeSafe);
            const rotatedExtent = Math.min(0.48, renderedScale * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians))) / 2 + 0.012);
            const safeCoordinate = value => Math.max(rotatedExtent, Math.min(1 - rotatedExtent, value));
            requests.push({
                key: `cover-${family}`,
                fallbackKey: record?.mechanical ? 'cover-obstacle' : 'cover-foliage',
                compositionLayer: 'cover',
                compositionSubLayer: Math.max(0, Math.min(99, Number(record?.subLayer ?? 20))),
                placement: {
                    x: interiorSafe && !edgeCover ? safeCoordinate(requestedX) : requestedX,
                    y: interiorSafe && !edgeCover ? safeCoordinate(requestedY) : requestedY,
                    scale: record?.mechanical ? Math.max(0.28, Math.min(0.68, scale * 0.58)) : renderedScale,
                    rotate: rotation,
                    flipX: Boolean(record?.flipX)
                },
                opacity: Math.max(0, Math.min(1, Number(record?.opacity ?? 1))),
                recordKind: kind,
                variant: Math.max(0, Math.min(3, Math.trunc(Number(record?.variant || 0)))),
                stratum: String(record?.stratum || ''),
                edgeBand: String(record?.edgeBand || ''),
                sharedEdgeKey: String(record?.sharedEdgeKey || ''),
                pairRole: String(record?.pairRole || ''),
                interiorSafe,
                recordIndex: index
            });
        });
        const evidenceKey = {
            item: 'evidence-item', remains: 'evidence-remains', 'recovery-bag': 'evidence-recovery-bag',
            'placed-object': 'evidence-placed-object', 'resource-change': 'evidence-depleted'
        };
        const evidence = composition.layers.evidence?.records || [];
        evidence.forEach((record, index) => requests.push({
            key: evidenceKey[record?.kind] || 'evidence-item',
            compositionLayer: 'evidence',
            placement: {
                x: [0.26, 0.74, 0.5, 0.28, 0.72][index % 5],
                y: [0.72, 0.7, 0.28, 0.3, 0.32][index % 5],
                scale: 0.34
            },
            recordIndex: index
        }));
        if ((composition.layers.presence?.records || []).length) {
            requests.push({
                key: 'presence-occupants', compositionLayer: 'presence',
                placement: { x: 0.78, y: 0.78, scale: 0.26 }, recordIndex: 0
            });
        }
        return requests;
    },

    layersForVisual(visual = {}) {
        const semanticKeys = this._semanticKeys(visual);
        const dynamicRequests = this._dynamicLayerRequests(visual);
        const dynamicPrefixes = new Set(dynamicRequests.map(request => request.compositionLayer));
        const primaryKey = String(visual.tilesetKey || visual.baseTilesetKey || '');
        const bundledContourTerrain = visual.elevationCorners && typeof visual.elevationCorners === 'object';
        const reliefMode = String(visual?.visualRecipe?.reliefMode || 'terrace');
        const layers = [];
        let primaryRendered = false;
        for (const semanticKey of semanticKeys) {
            const semanticLayer = this._compositionLayerForKey(semanticKey);
            if (dynamicPrefixes.has(semanticLayer) && ['cover', 'evidence', 'presence'].includes(semanticLayer)) continue;
            const resolved = this.resolveTile(semanticKey);
            if (!resolved) continue;
            const bundledLegacyRelief = resolved.pack.id === 'yaw.default-basic-v1'
                && /^terrain-elevation-(?:ledge|cliff)-/.test(semanticKey);
            if (bundledLegacyRelief && (
                bundledContourTerrain
                || ['none', 'slope-only'].includes(reliefMode)
                || (reliefMode === 'restrained' && /^terrain-elevation-cliff-/.test(semanticKey))
            )) continue;
            if (semanticKey === primaryKey || resolved.key === primaryKey) primaryRendered = true;
            for (const layer of resolved.tile.layers) {
                const atlas = resolved.atlases.get(layer.atlasId);
                if (!atlas?.url) continue;
                const bundledPoiPlacement = resolved.pack.id === 'yaw.default-basic-v1' && semanticKey.startsWith('poi-')
                    ? { x: 0.5, y: 0.5, scale: Number(globalThis.YAW_TILE_VISUAL_RECIPES?.VISUAL_SCALE?.poi || 0.42) }
                    : null;
                layers.push({
                    ...layer,
                    semanticKey,
                    compositionLayer: this._compositionLayerForKey(semanticKey),
                    compositionSubLayer: this._compositionSubRankForKey(semanticKey),
                    transitionMetadata: this._transitionMetadata(visual, semanticKey),
                    ...(bundledPoiPlacement ? { placement: bundledPoiPlacement } : {}),
                    packId: resolved.pack.id,
                    url: atlas.url,
                    cssImage: atlas.cssImage,
                    atlasWidth: atlas.width,
                    atlasHeight: atlas.height,
                    scaling: resolved.pack.scaling
                });
            }
        }
        for (const request of dynamicRequests) {
            const resolved = this.resolveTile(request.key) || (request.fallbackKey ? this.resolveTile(request.fallbackKey) : null);
            if (!resolved) continue;
            for (const layer of resolved.tile.layers) {
                const atlas = resolved.atlases.get(layer.atlasId);
                if (!atlas?.url) continue;
                layers.push({
                    ...layer,
                    semanticKey: request.key,
                    compositionLayer: request.compositionLayer,
                    compositionSubLayer: request.compositionSubLayer ?? 20,
                    placement: request.placement,
                    opacity: Math.max(0, Math.min(1, Number(layer.opacity ?? 1) * Number(request.opacity ?? 1))),
                    recordIndex: request.recordIndex,
                    recordKind: request.recordKind,
                    variant: request.variant,
                    stratum: request.stratum,
                    edgeBand: request.edgeBand,
                    sharedEdgeKey: request.sharedEdgeKey,
                    packId: resolved.pack.id,
                    url: atlas.url,
                    cssImage: atlas.cssImage,
                    atlasWidth: atlas.width,
                    atlasHeight: atlas.height,
                    scaling: resolved.pack.scaling
                });
            }
        }
        const compositionOrder = ['ground', 'terrain', 'route', 'cover', 'feature', 'evidence', 'presence', 'state'];
        const compositionRank = layer => Math.max(0, compositionOrder.indexOf(layer.compositionLayer));
        const compositionSubRank = layer => Math.max(0, Math.min(99, Number(layer.compositionSubLayer || 0)));
        const slotRank = slot => Math.max(0, YAW_TILESET_PACK_V1.LAYER_SLOTS.indexOf(slot));
        layers.sort((left, right) =>
            (compositionRank(left) * 100000 + compositionSubRank(left) * 1000 + slotRank(left.slot) * 100 + left.z)
            - (compositionRank(right) * 100000 + compositionSubRank(right) * 1000 + slotRank(right.slot) * 100 + right.z)
        );
        return { layers, primaryRendered };
    },

    _terrainHeightAt(corners, x, y) {
        const nw = Number(corners?.nw ?? 0.5);
        const ne = Number(corners?.ne ?? nw);
        const se = Number(corners?.se ?? ne);
        const sw = Number(corners?.sw ?? nw);
        const north = nw + (ne - nw) * x;
        const south = sw + (se - sw) * x;
        return north + (south - north) * y;
    },

    _terrainContourHtml(app, visual = {}, packId = '') {
        if (packId !== 'yaw.default-basic-v1') return '';
        const contours = Array.isArray(visual.elevationContours) ? visual.elevationContours : [];
        const corners = visual.elevationCorners;
        const reliefMode = String(visual?.visualRecipe?.reliefMode || 'terrace');
        if (['none', 'slope-only'].includes(reliefMode)
            || !corners || !contours.length || !['ledge', 'cliff'].includes(String(visual.elevationKind || ''))) return '';
        const spans = [];
        const visibleContours = reliefMode === 'restrained' ? contours.slice(0, 2) : contours.slice(0, 6);
        visibleContours.forEach((contour, contourIndex) => {
            (Array.isArray(contour?.segments) ? contour.segments : []).slice(0, 2).forEach((segment, segmentIndex) => {
                const from = segment?.from || {};
                const to = segment?.to || {};
                const x1 = Math.max(0, Math.min(1, Number(from.x) || 0));
                const y1 = Math.max(0, Math.min(1, Number(from.y) || 0));
                const x2 = Math.max(0, Math.min(1, Number(to.x) || 0));
                const y2 = Math.max(0, Math.min(1, Number(to.y) || 0));
                const dx = x2 - x1;
                const dy = y2 - y1;
                const length = Math.hypot(dx, dy);
                if (length < 0.01) return;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                const normalX = -dy / length;
                const normalY = dx / length;
                const midpointX = (x1 + x2) / 2;
                const midpointY = (y1 + y2) / 2;
                const sample = 0.035;
                const leftHeight = this._terrainHeightAt(corners,
                    Math.max(0, Math.min(1, midpointX + normalX * sample)),
                    Math.max(0, Math.min(1, midpointY + normalY * sample)));
                const rightHeight = this._terrainHeightAt(corners,
                    Math.max(0, Math.min(1, midpointX - normalX * sample)),
                    Math.max(0, Math.min(1, midpointY - normalY * sample)));
                const wallSign = leftHeight <= rightHeight ? 1 : -1;
                const style = [
                    `left:${(x1 * 100).toFixed(2)}%`,
                    `top:${(y1 * 100).toFixed(2)}%`,
                    `width:${(length * 100).toFixed(2)}%`,
                    `--yaw-contour-angle:${angle.toFixed(3)}deg`,
                    `--yaw-contour-side:${wallSign}`,
                    `--yaw-contour-level:${Math.max(0, Math.min(8, Number(contour?.level) || 0))}`
                ].join(';');
                spans.push(`<span class="yaw-terrain-contour-segment" data-relief-mode="${app._escapeHtml(reliefMode)}" data-contour-level="${app._escapeHtml(String(contour?.level ?? 0))}" data-contour-mask="${app._escapeHtml(String(contour?.mask ?? 0))}" data-contour-segment="${contourIndex}-${segmentIndex}" style="${app._escapeHtml(style)}"></span>`);
            });
        });
        return spans.length ? `<span class="yaw-terrain-contours" data-relief-mode="${app._escapeHtml(reliefMode)}" data-contour-count="${spans.length}">${spans.join('')}</span>` : '';
    },

    _styleUrl(value) {
        return String(value || '').replace(/[\\"'()\n\r]/g, character => `\\${character}`);
    },

    _layerStyle(layer) {
        const rect = layer.rect;
        // Smoothly scaled atlas crops can borrow a fractional pixel from the
        // neighboring sprite at a grid boundary. Inset only the bundled
        // material planes inside their atlas rectangles; authored packs keep
        // their exact crop contract and full-atlas images need no gutter.
        const atlasInset = layer.packId === 'yaw.default-basic-v1'
            && ['ground', 'terrain'].includes(layer.compositionLayer)
            && (rect.width < layer.atlasWidth || rect.height < layer.atlasHeight)
            ? Math.min(0.75, rect.width / 16, rect.height / 16)
            : 0;
        const sampleRect = {
            x: rect.x + atlasInset,
            y: rect.y + atlasInset,
            width: rect.width - atlasInset * 2,
            height: rect.height - atlasInset * 2
        };
        const sizeX = (layer.atlasWidth / sampleRect.width) * 100;
        const sizeY = (layer.atlasHeight / sampleRect.height) * 100;
        const positionX = layer.atlasWidth === sampleRect.width ? 0 : (sampleRect.x / (layer.atlasWidth - sampleRect.width)) * 100;
        const positionY = layer.atlasHeight === sampleRect.height ? 0 : (sampleRect.y / (layer.atlasHeight - sampleRect.height)) * 100;
        const scaleX = Boolean(layer.transform.flipX) !== Boolean(layer.placement?.flipX) ? -1 : 1;
        const scaleY = layer.transform.flipY ? -1 : 1;
        const placement = layer.placement;
        const contour = Array.isArray(layer.transitionMetadata?.contour) ? layer.transitionMetadata.contour : [];
        const contourClip = layer.packId === 'yaw.default-basic-v1' ? this._edgeClipPath(layer.transitionMetadata) : '';
        const contourStyles = contourClip ? [
            `--yaw-edge-fade-end:${Math.max(...contour.map(value => Number(value) || 0), 0.28) * 100}%`,
            `clip-path:${contourClip}`
        ] : [];
        const placementStyles = placement ? [
            'inset:auto',
            `left:${(placement.x - placement.scale / 2) * 100}%`,
            `top:${(placement.y - placement.scale / 2) * 100}%`,
            `width:${placement.scale * 100}%`,
            `height:${placement.scale * 100}%`
        ] : [];
        return [
            ...placementStyles,
            ...contourStyles,
            `background-image:${layer.cssImage || `url("${this._styleUrl(layer.url)}")`}`,
            `background-size:${sizeX}% ${sizeY}%`,
            `background-position:${positionX}% ${positionY}%`,
            `image-rendering:${layer.scaling === 'pixelated' ? 'pixelated' : 'auto'}`,
            `opacity:${layer.opacity}`,
            `mix-blend-mode:${layer.blend}`,
            `z-index:${Math.max(0, ['ground', 'terrain', 'route', 'cover', 'feature', 'evidence', 'presence', 'state'].indexOf(layer.compositionLayer)) * 100 + Math.max(0, Math.min(99, Number(layer.compositionSubLayer || 0))) + layer.z}`,
            `transform-origin:${layer.anchor.x * 100}% ${layer.anchor.y * 100}%`,
            `transform:rotate(${Number(layer.transform.rotate || 0) + Number(placement?.rotate || 0)}deg) scale(${scaleX},${scaleY})`
        ].join(';');
    },

    tileArtHtml(app, visual = {}) {
        const rendered = this.layersForVisual(visual);
        if (!rendered.layers.length) return '';
        const layers = rendered.layers.map((layer, index) => {
            const style = app._escapeHtml(this._layerStyle(layer));
            const slot = app._escapeHtml(layer.slot);
            const key = app._escapeHtml(layer.semanticKey);
            const compositionLayer = app._escapeHtml(layer.compositionLayer);
            const subLayer = app._escapeHtml(String(layer.compositionSubLayer ?? 0));
            const transition = layer.transitionMetadata;
            const edgeAttrs = transition
                ? ` data-shared-edge-key="${app._escapeHtml(transition.sharedEdgeKey || '')}" data-edge-profile="${app._escapeHtml(transition.kind || 'ground-transition')}" data-edge-blend-style="${app._escapeHtml(transition.style || 'soft')}" data-edge-phase="${Number(transition.phase || 0).toFixed(6)}" data-edge-contour="${app._escapeHtml((transition.contour || []).join(' '))}" data-edge-corners="${app._escapeHtml(Object.entries(transition.corners || {}).map(([corner, state]) => `${corner}:${state}`).join(' '))}"`
                : '';
            const coverAttrs = layer.recordKind
                ? ` data-cover-kind="${app._escapeHtml(layer.recordKind)}" data-cover-variant="${app._escapeHtml(String(layer.variant || 0))}" data-cover-stratum="${app._escapeHtml(layer.stratum || '')}" data-edge-band="${app._escapeHtml(layer.edgeBand || '')}" data-interior-safe="${layer.interiorSafe ? 'true' : 'false'}"${layer.pairRole ? ` data-edge-pair-role="${app._escapeHtml(layer.pairRole)}"` : ''}${layer.sharedEdgeKey ? ` data-shared-edge-key="${app._escapeHtml(layer.sharedEdgeKey)}"` : ''}`
                : '';
            return `<span class="yaw-tile-art-layer" data-tileset-layer="${slot}" data-tile-composition-layer="${compositionLayer}" data-composition-sub-layer="${subLayer}" data-tileset-semantic-key="${key}" data-tileset-layer-index="${index}"${edgeAttrs}${coverAttrs} style="${style}"></span>`;
        }).join('');
        const primaryClass = rendered.primaryRendered ? ' primary-rendered' : '';
        const packId = app._escapeHtml(this.activeCandidate()?.pack.id || '');
        const terrainContours = this._terrainContourHtml(app, visual, this.activeCandidate()?.pack.id || '');
        const groundSeal = this.activeCandidate()?.pack.id === 'yaw.default-basic-v1'
            ? '<span class="yaw-ground-edge-seal"></span>'
            : '';
        return `<span class="yaw-tile-art${primaryClass}" data-tileset-pack="${packId}" aria-hidden="true">${layers}${groundSeal}${terrainContours}</span>`;
    }
};

if (typeof window !== 'undefined') window.YAW_TILESET_RUNTIME = YAW_TILESET_RUNTIME;
if (typeof globalThis !== 'undefined' && globalThis.AssetManifest?.bundledTilesetPack) {
    const registerBundled = () => {
        try {
            YAW_TILESET_RUNTIME.registerBuiltin(globalThis.AssetManifest.bundledTilesetPack());
            YAW_TILESET_RUNTIME._refreshMaps();
        } catch (error) {
            console.error('Bundled Tileset Pack failed to initialize:', error);
        }
    };
    const bundledReady = typeof window !== 'undefined' ? window.YAW_BUNDLED_TILESET_READY : null;
    if (bundledReady?.then) bundledReady.then(url => { if (url && !url.disabled) registerBundled(); });
    else registerBundled();
}
