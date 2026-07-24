/**
 * YOU ARE WILD SPRITE RUNTIME
 * Async Media Repository leases with synchronous unit-art fallback.
 */

const YAW_SPRITE_RUNTIME = {
    candidates: new Map(),
    sequence: 0,
    styleSequence: 0,

    repository() {
        return typeof YAW_MEDIA_REPOSITORY !== 'undefined' ? YAW_MEDIA_REPOSITORY : null;
    },

    _presentation(metadata) {
        return (Array.isArray(metadata?.presentations) ? metadata.presentations : [])
            .find(presentation => presentation?.type === YAW_SPRITE_PACK_V1.PRESENTATION_TYPE) || null;
    },

    _registerAtlasUrl(url) {
        const safeUrl = String(url || '');
        if (typeof document === 'undefined' || !document.documentElement?.style?.setProperty) {
            return { cssImage: `url("${this._styleUrl(safeUrl)}")`, cssVariable: '' };
        }
        const cssVariable = `--yaw-sprite-atlas-${++this.styleSequence}`;
        document.documentElement.style.setProperty(cssVariable, `url("${this._styleUrl(safeUrl)}")`);
        return { cssImage: `var(${cssVariable})`, cssVariable };
    },

    _releaseAtlasUrl(atlas) {
        if (!atlas?.cssVariable || typeof document === 'undefined') return;
        document.documentElement?.style?.removeProperty?.(atlas.cssVariable);
    },

    _refreshUnits() {
        if (typeof App === 'undefined' || !App?.player || App.screen !== 'game') return;
        try { App.renderParty?.(); } catch (_error) {}
        try { App.renderCreatures?.(); } catch (_error) {}
        try { App.renderMap?.(); } catch (_error) {}
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
        const pack = YAW_SPRITE_PACK_V1.normalizePresentation(presentation, { resources });
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
        this.candidates.set(moduleId, { moduleId, pack, leases, sequence: ++this.sequence });
        if (options.refresh !== false) this._refreshUnits();
        return this.status(moduleId);
    },

    deactivateModule(moduleValue, options = {}) {
        const moduleId = String(moduleValue || '').trim();
        const candidate = this.candidates.get(moduleId);
        if (!candidate) return false;
        const repository = options.repository || this.repository();
        for (const lease of candidate.leases.values()) {
            this._releaseAtlasUrl(lease);
            try { repository?.release(moduleId, lease.leaseId); } catch (_error) {}
        }
        this.candidates.delete(moduleId);
        if (options.refresh !== false) this._refreshUnits();
        return true;
    },

    clear(options = {}) {
        for (const moduleId of [...this.candidates.keys()]) {
            this.deactivateModule(moduleId, { ...options, refresh: false });
        }
        if (options.refresh !== false) this._refreshUnits();
    },

    status(moduleId) {
        const candidate = this.candidates.get(String(moduleId || ''));
        if (!candidate) return null;
        return {
            moduleId: candidate.moduleId,
            packId: candidate.pack.id,
            name: candidate.pack.name,
            atlasCount: candidate.pack.atlases.length,
            spriteCount: Object.keys(candidate.pack.sprites).length,
            scaling: candidate.pack.scaling
        };
    },

    _token(value) {
        return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '');
    },

    semanticKeys(unit = {}, options = {}) {
        const keys = [];
        const push = key => {
            const token = this._token(key);
            if (token && !keys.includes(token)) keys.push(token);
        };
        push(`species-${unit.species || unit.type || ''}`);
        if (options.isPlayer === true || unit.player || unit.isPlayer) push('flag-player');
        if (unit.recoveryGhost) push('flag-ghost');
        for (const [ability, active] of Object.entries(unit.abilities || {})) {
            if (active === true) push(`ability-${ability}`);
        }
        push(`disposition-${unit.disposition || ''}`);
        push('default');
        return keys;
    },

    stateFor(unit = {}) {
        if (unit.recoveryGhost) return 'ghost';
        const containmentState = String(unit.containmentState || unit.containedState || '').toLowerCase();
        if (['contained', 'digesting', 'softened'].includes(containmentState) || unit.contained === true) return 'contained';
        if (unit.corpse === true || unit.isCorpse === true || Number(unit.CPun) <= 0) return 'defeated';
        const maximum = Math.max(1, Number(unit.MPun) || 1);
        if (Number(unit.CPun) / maximum <= 0.35) return 'wounded';
        return 'idle';
    },

    facingFor(unit = {}) {
        const facing = String(unit.facing || '').toLowerCase();
        return YAW_SPRITE_PACK_V1.FACINGS.includes(facing) ? facing : 'any';
    },

    _candidateChain() {
        return [...this.candidates.values()].sort((left, right) => right.sequence - left.sequence);
    },

    _resolveSpriteFrom(candidate, key, seen = new Set()) {
        if (!key || seen.has(key)) return null;
        seen.add(key);
        const sprite = candidate.pack.sprites[key];
        if (!sprite) return null;
        if (Object.keys(sprite.states).length) return sprite;
        return sprite.fallback ? this._resolveSpriteFrom(candidate, sprite.fallback, seen) : null;
    },

    resolveUnit(unit = {}, options = {}) {
        const keys = this.semanticKeys(unit, options);
        const state = this.stateFor(unit);
        const facing = this.facingFor(unit);
        for (const candidate of this._candidateChain()) {
            for (const key of keys) {
                let sprite = this._resolveSpriteFrom(candidate, key);
                const seen = new Set();
                while (sprite && !seen.has(sprite.key)) {
                    seen.add(sprite.key);
                    const stateKeys = [`${state}:${facing}`, `${state}:any`, `idle:${facing}`, 'idle:any'];
                    const frame = stateKeys.map(stateKey => ({ stateKey, frame: sprite.states[stateKey] }))
                        .find(entry => entry.frame);
                    if (frame) {
                        const atlas = candidate.leases.get(frame.frame.atlasId);
                        if (atlas?.url) {
                            return {
                                moduleId: candidate.moduleId,
                                pack: candidate.pack,
                                sprite,
                                semanticKey: key,
                                state,
                                facing,
                                stateKey: frame.stateKey,
                                frame: frame.frame,
                                atlas
                            };
                        }
                    }
                    sprite = sprite.fallback ? this._resolveSpriteFrom(candidate, sprite.fallback) : null;
                }
            }
        }
        return null;
    },

    _styleUrl(value) {
        return String(value || '').replace(/[\\"'()\n\r]/g, character => `\\${character}`);
    },

    _stripStyle(resolved) {
        const { frame, atlas, pack } = resolved;
        const rect = frame.rect;
        const frameCount = frame.frameCount;
        const widthPercent = frameCount * 100;
        const sizeX = (atlas.width / rect.width) * 100;
        const sizeY = (atlas.height / rect.height) * 100;
        const positionX = atlas.width === rect.width ? 0 : (rect.x / (atlas.width - rect.width)) * 100;
        const positionY = atlas.height === rect.height ? 0 : (rect.y / (atlas.height - rect.height)) * 100;
        const animation = frameCount > 1
            ? `animation:yaw-sprite-strip ${frame.durationMs}ms steps(${Math.max(1, frameCount - 1)},end) ${frame.loop ? 'infinite' : '1 forwards'};--yaw-sprite-shift:-${((frameCount - 1) / frameCount) * 100}%`
            : '';
        return [
            `width:${widthPercent}%`,
            `background-image:${atlas.cssImage || `url("${this._styleUrl(atlas.url)}")`}`,
            `background-size:${sizeX}% ${sizeY}%`,
            `background-position:${positionX}% ${positionY}%`,
            `image-rendering:${pack.scaling === 'pixelated' ? 'pixelated' : 'auto'}`,
            `transform-origin:${frame.anchor.x * 100}% ${frame.anchor.y * 100}%`,
            animation
        ].filter(Boolean).join(';');
    },

    unitArtHtml(app, unit = {}, fallback = '👤', options = {}) {
        const resolved = this.resolveUnit(unit, {
            ...options,
            isPlayer: options.isPlayer === true || unit === app?.player
        });
        const escapedFallback = app._escapeHtml(fallback || unit.icon || '👤');
        if (!resolved) return escapedFallback;
        const className = app._escapeHtml(String(options.className || ''));
        const classes = `yaw-unit-visual has-sprite${className ? ` ${className}` : ''}`;
        const style = app._escapeHtml(this._stripStyle(resolved));
        const aspect = resolved.frame.frameWidth / resolved.frame.rect.height;
        const contain = resolved.frame.fit === 'contain';
        const viewportWidth = contain
            ? (aspect >= 1 ? 100 : aspect * 100)
            : (aspect >= 1 ? aspect * 100 : 100);
        const viewportHeight = contain
            ? (aspect >= 1 ? 100 / aspect : 100)
            : (aspect >= 1 ? 100 : 100 / aspect);
        const viewportStyle = app._escapeHtml(`width:${viewportWidth}%;height:${viewportHeight}%`);
        return `<span class="${classes}" data-sprite-pack="${app._escapeHtml(resolved.pack.id)}" data-sprite-key="${app._escapeHtml(resolved.semanticKey)}" data-sprite-state="${app._escapeHtml(resolved.state)}" data-sprite-facing="${app._escapeHtml(resolved.facing)}" data-sprite-fit="${app._escapeHtml(resolved.frame.fit)}" aria-hidden="true"><span class="yaw-unit-sprite-viewport" style="${viewportStyle}"><span class="yaw-unit-sprite-frame" style="${style}"></span></span><span class="yaw-unit-icon-fallback">${escapedFallback}</span></span>`;
    }
};

if (typeof window !== 'undefined') window.YAW_SPRITE_RUNTIME = YAW_SPRITE_RUNTIME;
