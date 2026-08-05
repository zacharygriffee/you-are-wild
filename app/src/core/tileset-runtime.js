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
        const match = String(semanticKey || '').match(/^ground-transition-(.+)-(north|east|south|west)$/);
        if (!match) return null;
        const [, biome, direction] = match;
        return (visual?.adjacencyBlend?.terrain || []).find(entry => (
            String(entry?.biome || entry?.sourceBiome) === biome && String(entry?.direction) === direction
        )) || null;
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
            const renderedScale = kind === 'adjacent-spill'
                ? Math.max(0.24, Math.min(0.44, scale * 0.46))
                : (kind === 'biome-identity' && record?.stratum === 'canopy'
                    ? Math.max(0.46, Math.min(0.68, scale * 0.58))
                    : Math.max(0.28, Math.min(0.58, scale * 0.5)));
            requests.push({
                key: `cover-${family}`,
                fallbackKey: record?.mechanical ? 'cover-obstacle' : 'cover-foliage',
                compositionLayer: 'cover',
                compositionSubLayer: Math.max(0, Math.min(99, Number(record?.subLayer ?? 20))),
                placement: {
                    x: Number(record?.anchor?.x ?? 0.5),
                    y: Number(record?.anchor?.y ?? 0.5),
                    scale: record?.mechanical ? Math.max(0.28, Math.min(0.68, scale * 0.58)) : renderedScale,
                    rotate: Number(record?.rotation || 0),
                    flipX: Boolean(record?.flipX)
                },
                opacity: Math.max(0, Math.min(1, Number(record?.opacity ?? 1))),
                recordKind: kind,
                stratum: String(record?.stratum || ''),
                edgeBand: String(record?.edgeBand || ''),
                sharedEdgeKey: String(record?.sharedEdgeKey || ''),
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
        const layers = [];
        let primaryRendered = false;
        for (const semanticKey of semanticKeys) {
            const semanticLayer = this._compositionLayerForKey(semanticKey);
            if (dynamicPrefixes.has(semanticLayer) && ['cover', 'evidence', 'presence'].includes(semanticLayer)) continue;
            const resolved = this.resolveTile(semanticKey);
            if (!resolved) continue;
            if (semanticKey === primaryKey || resolved.key === primaryKey) primaryRendered = true;
            for (const layer of resolved.tile.layers) {
                const atlas = resolved.atlases.get(layer.atlasId);
                if (!atlas?.url) continue;
                layers.push({
                    ...layer,
                    semanticKey,
                    compositionLayer: this._compositionLayerForKey(semanticKey),
                    compositionSubLayer: this._compositionSubRankForKey(semanticKey),
                    transitionMetadata: this._transitionMetadata(visual, semanticKey),
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
                    stratum: request.stratum,
                    edgeBand: request.edgeBand,
                    sharedEdgeKey: request.sharedEdgeKey,
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

    _styleUrl(value) {
        return String(value || '').replace(/[\\"'()\n\r]/g, character => `\\${character}`);
    },

    _layerStyle(layer) {
        const rect = layer.rect;
        const sizeX = (layer.atlasWidth / rect.width) * 100;
        const sizeY = (layer.atlasHeight / rect.height) * 100;
        const positionX = layer.atlasWidth === rect.width ? 0 : (rect.x / (layer.atlasWidth - rect.width)) * 100;
        const positionY = layer.atlasHeight === rect.height ? 0 : (rect.y / (layer.atlasHeight - rect.height)) * 100;
        const scaleX = Boolean(layer.transform.flipX) !== Boolean(layer.placement?.flipX) ? -1 : 1;
        const scaleY = layer.transform.flipY ? -1 : 1;
        const placement = layer.placement;
        const placementStyles = placement ? [
            'inset:auto',
            `left:${(placement.x - placement.scale / 2) * 100}%`,
            `top:${(placement.y - placement.scale / 2) * 100}%`,
            `width:${placement.scale * 100}%`,
            `height:${placement.scale * 100}%`
        ] : [];
        return [
            ...placementStyles,
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
                ? ` data-shared-edge-key="${app._escapeHtml(transition.sharedEdgeKey || '')}" data-edge-blend-style="${app._escapeHtml(transition.style || 'soft')}" data-edge-corners="${app._escapeHtml(Object.entries(transition.corners || {}).map(([corner, state]) => `${corner}:${state}`).join(' '))}"`
                : '';
            const coverAttrs = layer.recordKind
                ? ` data-cover-kind="${app._escapeHtml(layer.recordKind)}" data-cover-stratum="${app._escapeHtml(layer.stratum || '')}" data-edge-band="${app._escapeHtml(layer.edgeBand || '')}"${layer.sharedEdgeKey ? ` data-shared-edge-key="${app._escapeHtml(layer.sharedEdgeKey)}"` : ''}`
                : '';
            return `<span class="yaw-tile-art-layer" data-tileset-layer="${slot}" data-tile-composition-layer="${compositionLayer}" data-composition-sub-layer="${subLayer}" data-tileset-semantic-key="${key}" data-tileset-layer-index="${index}"${edgeAttrs}${coverAttrs} style="${style}"></span>`;
        }).join('');
        const primaryClass = rendered.primaryRendered ? ' primary-rendered' : '';
        const packId = app._escapeHtml(this.activeCandidate()?.pack.id || '');
        return `<span class="yaw-tile-art${primaryClass}" data-tileset-pack="${packId}" aria-hidden="true">${layers}</span>`;
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
