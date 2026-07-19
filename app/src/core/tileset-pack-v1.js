/**
 * YOU ARE WILD TILESET PACK V1
 * Code-free tileset presentation validation layered on Asset Bundle V1.
 */

const YAW_TILESET_PACK_V1 = {
    PRESENTATION_TYPE: 'yaw-tileset-pack',
    PRESENTATION_VERSION: 1,
    MAX_ATLASES: 16,
    MAX_TILES: 512,
    MAX_LAYERS_PER_TILE: 8,
    MAX_NATIVE_TILE_SIZE: 2048,
    LAYER_SLOTS: ['base', 'route', 'feature', 'marker', 'presence'],
    SCALING_POLICIES: ['smooth', 'pixelated'],
    BLEND_MODES: ['normal', 'multiply', 'screen'],
    ROTATIONS: [0, 90, 180, 270],

    _error(code, message, details = {}) {
        if (typeof YAW_MEDIA_CONTRACT !== 'undefined' && YAW_MEDIA_CONTRACT?.error) {
            return YAW_MEDIA_CONTRACT.error(code, message, details);
        }
        const error = new Error(message);
        error.code = code;
        error.details = details;
        return error;
    },

    _token(value, field, contract) {
        try {
            return contract.token(value, field);
        } catch (error) {
            throw this._error('invalid_tileset_pack', `Tileset Pack ${field} must be a token string`);
        }
    },

    _integer(value, field, min, max) {
        const number = Number(value);
        if (!Number.isInteger(number) || number < min || number > max) {
            throw this._error('invalid_tileset_pack', `Tileset Pack ${field} must be an integer from ${min} to ${max}`);
        }
        return number;
    },

    _number(value, field, min, max, fallback) {
        const number = value === undefined || value === null ? fallback : Number(value);
        if (!Number.isFinite(number) || number < min || number > max) {
            throw this._error('invalid_tileset_pack', `Tileset Pack ${field} must be from ${min} to ${max}`);
        }
        return number;
    },

    _nativeTileSize(value) {
        const size = Number.isInteger(Number(value))
            ? { width: Number(value), height: Number(value) }
            : value;
        if (!size || typeof size !== 'object' || Array.isArray(size)) {
            throw this._error('invalid_tileset_pack', 'Tileset Pack nativeTileSize must be an integer or width/height object');
        }
        return {
            width: this._integer(size.width, 'nativeTileSize.width', 1, this.MAX_NATIVE_TILE_SIZE),
            height: this._integer(size.height, 'nativeTileSize.height', 1, this.MAX_NATIVE_TILE_SIZE)
        };
    },

    _resources(value = []) {
        return new Map((Array.isArray(value) ? value : []).map(resource => [String(resource?.id || ''), resource]));
    },

    _normalizeAtlas(value, index, resources, contract) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this._error('invalid_tileset_pack', `Tileset Pack atlas ${index + 1} must be an object`);
        }
        const id = this._token(value.id, 'atlas id', contract);
        const resourceId = this._token(value.resourceId, `atlas ${id} resourceId`, contract);
        const resource = resources.get(resourceId);
        if (!resource) {
            throw this._error('missing_tileset_resource', `Tileset Pack atlas ${id} references missing resource ${resourceId}`);
        }
        if (resource.role !== 'tileset-atlas') {
            throw this._error('invalid_tileset_resource', `Tileset Pack atlas ${id} resource must use role tileset-atlas`);
        }
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(resource.mimeType)) {
            throw this._error('invalid_tileset_resource', `Tileset Pack atlas ${id} must reference PNG, JPEG, or WebP media`);
        }
        const width = this._integer(resource.width, `atlas ${id} resource width`, 1, 32768);
        const height = this._integer(resource.height, `atlas ${id} resource height`, 1, 32768);
        return {
            id,
            resourceId,
            width,
            height,
            density: this._number(value.density, `atlas ${id} density`, 0.25, 8, 1)
        };
    },

    _normalizeRect(value, atlas, tileKey, layerIndex) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this._error('invalid_tileset_rect', `Tileset Pack tile ${tileKey} layer ${layerIndex + 1} requires a rect`);
        }
        const rect = {
            x: this._integer(value.x, `tile ${tileKey} rect.x`, 0, atlas.width - 1),
            y: this._integer(value.y, `tile ${tileKey} rect.y`, 0, atlas.height - 1),
            width: this._integer(value.width, `tile ${tileKey} rect.width`, 1, atlas.width),
            height: this._integer(value.height, `tile ${tileKey} rect.height`, 1, atlas.height)
        };
        if (rect.x + rect.width > atlas.width || rect.y + rect.height > atlas.height) {
            throw this._error('tileset_rect_out_of_bounds', `Tileset Pack tile ${tileKey} layer ${layerIndex + 1} exceeds atlas ${atlas.id}`);
        }
        return rect;
    },

    _normalizeTransform(value, tileKey) {
        const transform = value === undefined || value === null ? {} : value;
        if (!transform || typeof transform !== 'object' || Array.isArray(transform)) {
            throw this._error('invalid_tileset_transform', `Tileset Pack tile ${tileKey} transform must be an object`);
        }
        const rotate = Number(transform.rotate ?? 0);
        if (!this.ROTATIONS.includes(rotate)) {
            throw this._error('invalid_tileset_transform', `Tileset Pack tile ${tileKey} rotation must be 0, 90, 180, or 270`);
        }
        return {
            rotate,
            flipX: transform.flipX === true,
            flipY: transform.flipY === true
        };
    },

    _normalizeLayer(value, index, tileKey, atlases, contract) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this._error('invalid_tileset_layer', `Tileset Pack tile ${tileKey} layer ${index + 1} must be an object`);
        }
        const atlasId = this._token(value.atlasId, `tile ${tileKey} atlasId`, contract);
        const atlas = atlases.get(atlasId);
        if (!atlas) throw this._error('missing_tileset_atlas', `Tileset Pack tile ${tileKey} references missing atlas ${atlasId}`);
        const slot = String(value.slot || 'base').trim().toLowerCase();
        if (!this.LAYER_SLOTS.includes(slot)) {
            throw this._error('invalid_tileset_layer', `Tileset Pack tile ${tileKey} has unsupported layer slot ${slot}`);
        }
        const blend = String(value.blend || 'normal').trim().toLowerCase();
        if (!this.BLEND_MODES.includes(blend)) {
            throw this._error('invalid_tileset_layer', `Tileset Pack tile ${tileKey} has unsupported blend mode ${blend}`);
        }
        const anchor = value.anchor === undefined || value.anchor === null ? {} : value.anchor;
        if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
            throw this._error('invalid_tileset_layer', `Tileset Pack tile ${tileKey} anchor must be an object`);
        }
        return {
            atlasId,
            rect: this._normalizeRect(value.rect, atlas, tileKey, index),
            slot,
            z: this._integer(value.z ?? this.LAYER_SLOTS.indexOf(slot) * 10, `tile ${tileKey} layer z`, -100, 100),
            opacity: this._number(value.opacity, `tile ${tileKey} layer opacity`, 0, 1, 1),
            blend,
            anchor: {
                x: this._number(anchor.x, `tile ${tileKey} anchor.x`, 0, 1, 0.5),
                y: this._number(anchor.y, `tile ${tileKey} anchor.y`, 0, 1, 0.5)
            },
            transform: this._normalizeTransform(value.transform, tileKey)
        };
    },

    _assertFallbackGraph(tiles) {
        const keys = new Set(Object.keys(tiles));
        for (const [tileKey, tile] of Object.entries(tiles)) {
            if (!tile.fallback || !keys.has(tile.fallback)) continue;
            const seen = new Set([tileKey]);
            let cursor = tile.fallback;
            while (cursor && keys.has(cursor)) {
                if (seen.has(cursor)) {
                    throw this._error('tileset_fallback_cycle', `Tileset Pack fallback cycle includes ${cursor}`);
                }
                seen.add(cursor);
                cursor = tiles[cursor]?.fallback || '';
            }
        }
    },

    normalizePresentation(value, options = {}) {
        const contract = options.contract || YAW_MEDIA_CONTRACT;
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this._error('invalid_tileset_pack', 'Tileset Pack presentation must be an object');
        }
        if (String(value.type || '') !== this.PRESENTATION_TYPE) {
            throw this._error('invalid_tileset_pack', `Tileset Pack type must be ${this.PRESENTATION_TYPE}`);
        }
        if (Number(value.version) !== this.PRESENTATION_VERSION) {
            throw this._error('invalid_tileset_pack', `Tileset Pack version must be ${this.PRESENTATION_VERSION}`);
        }
        const resources = this._resources(options.resources);
        if (!Array.isArray(value.atlases) || !value.atlases.length || value.atlases.length > this.MAX_ATLASES) {
            throw this._error('invalid_tileset_pack', `Tileset Pack atlases must contain between 1 and ${this.MAX_ATLASES} entries`);
        }
        const atlasList = value.atlases.map((atlas, index) => this._normalizeAtlas(atlas, index, resources, contract));
        const atlases = new Map();
        for (const atlas of atlasList) {
            if (atlases.has(atlas.id)) throw this._error('invalid_tileset_pack', `Duplicate Tileset Pack atlas ${atlas.id}`);
            atlases.set(atlas.id, atlas);
        }
        if (!value.tiles || typeof value.tiles !== 'object' || Array.isArray(value.tiles)) {
            throw this._error('invalid_tileset_pack', 'Tileset Pack tiles must be an object keyed by semantic tile id');
        }
        const entries = Object.entries(value.tiles);
        if (!entries.length || entries.length > this.MAX_TILES) {
            throw this._error('invalid_tileset_pack', `Tileset Pack tiles must contain between 1 and ${this.MAX_TILES} entries`);
        }
        const tiles = {};
        for (const [rawKey, tileValue] of entries) {
            const tileKey = this._token(rawKey, 'tile key', contract);
            if (!tileValue || typeof tileValue !== 'object' || Array.isArray(tileValue)) {
                throw this._error('invalid_tileset_pack', `Tileset Pack tile ${tileKey} must be an object`);
            }
            const fallback = tileValue.fallback
                ? this._token(tileValue.fallback, `tile ${tileKey} fallback`, contract)
                : '';
            const inputLayers = tileValue.layers === undefined ? [] : tileValue.layers;
            if (!Array.isArray(inputLayers) || inputLayers.length > this.MAX_LAYERS_PER_TILE || (!inputLayers.length && !fallback)) {
                throw this._error('invalid_tileset_pack', `Tileset Pack tile ${tileKey} requires a fallback or between 1 and ${this.MAX_LAYERS_PER_TILE} layers`);
            }
            tiles[tileKey] = {
                key: tileKey,
                label: String(tileValue.label || tileKey).trim().slice(0, 120),
                fallback,
                layers: inputLayers
                    .map((layer, index) => this._normalizeLayer(layer, index, tileKey, atlases, contract))
                    .sort((left, right) => left.z - right.z)
            };
        }
        this._assertFallbackGraph(tiles);
        const scaling = String(value.scaling || 'smooth').trim().toLowerCase();
        if (!this.SCALING_POLICIES.includes(scaling)) {
            throw this._error('invalid_tileset_pack', `Tileset Pack scaling must be ${this.SCALING_POLICIES.join(' or ')}`);
        }
        const requiredKeys = Array.isArray(options.requiredKeys)
            ? [...new Set(options.requiredKeys.map(key => this._token(key, 'required tile key', contract)))]
            : [];
        return {
            type: this.PRESENTATION_TYPE,
            version: this.PRESENTATION_VERSION,
            id: this._token(value.id, 'id', contract),
            name: String(value.name || value.id || '').trim().slice(0, 120),
            nativeTileSize: this._nativeTileSize(value.nativeTileSize),
            scaling,
            atlases: atlasList,
            tiles,
            coverage: {
                provided: Object.keys(tiles).sort(),
                missingRequired: requiredKeys.filter(key => !tiles[key]).sort()
            }
        };
    },

    normalizeBundle(normalizedPackage, options = {}) {
        const bundle = normalizedPackage?.bundle;
        if (!bundle || !Array.isArray(bundle.presentations)) {
            throw this._error('invalid_tileset_pack', 'Normalized Asset Bundle V1 presentations are required');
        }
        const packs = bundle.presentations
            .filter(presentation => String(presentation?.type || '') === this.PRESENTATION_TYPE)
            .map(presentation => this.normalizePresentation(presentation, {
                ...options,
                resources: bundle.resources
            }));
        if (packs.length > 1) {
            throw this._error('invalid_tileset_pack', 'Asset Bundle V1 may contain at most one Tileset Pack V1 presentation');
        }
        return packs;
    }
};

if (typeof window !== 'undefined') window.YAW_TILESET_PACK_V1 = YAW_TILESET_PACK_V1;
