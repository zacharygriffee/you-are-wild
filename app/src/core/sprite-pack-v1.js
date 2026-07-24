/**
 * YOU ARE WILD SPRITE PACK V1
 * Code-free unit sprite validation layered on Asset Bundle V1.
 */

const YAW_SPRITE_PACK_V1 = {
    PRESENTATION_TYPE: 'yaw-sprite-pack',
    PRESENTATION_VERSION: 1,
    MAX_ATLASES: 16,
    MAX_SPRITES: 256,
    MAX_STATES_PER_SPRITE: 32,
    MAX_NATIVE_FRAME_SIZE: 2048,
    MAX_FRAMES: 32,
    STATES: ['idle', 'wounded', 'defeated', 'contained', 'ghost'],
    FACINGS: ['any', 'north', 'east', 'south', 'west'],
    SCALING_POLICIES: ['smooth', 'pixelated'],
    FIT_POLICIES: ['contain', 'cover'],

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
        } catch (_error) {
            throw this._error('invalid_sprite_pack', `Sprite Pack ${field} must be a token string`);
        }
    },

    _integer(value, field, min, max) {
        const number = Number(value);
        if (!Number.isInteger(number) || number < min || number > max) {
            throw this._error('invalid_sprite_pack', `Sprite Pack ${field} must be an integer from ${min} to ${max}`);
        }
        return number;
    },

    _number(value, field, min, max, fallback) {
        const number = value === undefined || value === null ? fallback : Number(value);
        if (!Number.isFinite(number) || number < min || number > max) {
            throw this._error('invalid_sprite_pack', `Sprite Pack ${field} must be from ${min} to ${max}`);
        }
        return number;
    },

    _nativeFrameSize(value) {
        const size = Number.isInteger(Number(value))
            ? { width: Number(value), height: Number(value) }
            : value;
        if (!size || typeof size !== 'object' || Array.isArray(size)) {
            throw this._error('invalid_sprite_pack', 'Sprite Pack nativeFrameSize must be an integer or width/height object');
        }
        return {
            width: this._integer(size.width, 'nativeFrameSize.width', 1, this.MAX_NATIVE_FRAME_SIZE),
            height: this._integer(size.height, 'nativeFrameSize.height', 1, this.MAX_NATIVE_FRAME_SIZE)
        };
    },

    _resources(value = []) {
        return new Map((Array.isArray(value) ? value : []).map(resource => [String(resource?.id || ''), resource]));
    },

    _normalizeAtlas(value, index, resources, contract) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this._error('invalid_sprite_pack', `Sprite Pack atlas ${index + 1} must be an object`);
        }
        const id = this._token(value.id, 'atlas id', contract);
        const resourceId = this._token(value.resourceId, `atlas ${id} resourceId`, contract);
        const resource = resources.get(resourceId);
        if (!resource) throw this._error('missing_sprite_resource', `Sprite Pack atlas ${id} references missing resource ${resourceId}`);
        if (resource.role !== 'sprite-atlas') {
            throw this._error('invalid_sprite_resource', `Sprite Pack atlas ${id} resource must use role sprite-atlas`);
        }
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(resource.mimeType)) {
            throw this._error('invalid_sprite_resource', `Sprite Pack atlas ${id} must reference PNG, JPEG, or WebP media`);
        }
        return {
            id,
            resourceId,
            width: this._integer(resource.width, `atlas ${id} resource width`, 1, 32768),
            height: this._integer(resource.height, `atlas ${id} resource height`, 1, 32768),
            density: this._number(value.density, `atlas ${id} density`, 0.25, 8, 1)
        };
    },

    _normalizeRect(value, atlas, spriteKey, stateKey) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this._error('invalid_sprite_rect', `Sprite Pack ${spriteKey} state ${stateKey} requires a rect`);
        }
        const rect = {
            x: this._integer(value.x, `${spriteKey}.${stateKey} rect.x`, 0, atlas.width - 1),
            y: this._integer(value.y, `${spriteKey}.${stateKey} rect.y`, 0, atlas.height - 1),
            width: this._integer(value.width, `${spriteKey}.${stateKey} rect.width`, 1, atlas.width),
            height: this._integer(value.height, `${spriteKey}.${stateKey} rect.height`, 1, atlas.height)
        };
        if (rect.x + rect.width > atlas.width || rect.y + rect.height > atlas.height) {
            throw this._error('sprite_rect_out_of_bounds', `Sprite Pack ${spriteKey} state ${stateKey} exceeds atlas ${atlas.id}`);
        }
        return rect;
    },

    _stateKey(value, spriteKey, contract) {
        const key = this._token(value, `sprite ${spriteKey} state`, contract);
        const [state, facing, extra] = key.split(':');
        if (extra !== undefined || !this.STATES.includes(state) || !this.FACINGS.includes(facing || 'any')) {
            throw this._error('invalid_sprite_state', `Sprite Pack ${spriteKey} state must use <state>:<facing>`);
        }
        return `${state}:${facing || 'any'}`;
    },

    _normalizeState(value, spriteKey, stateKey, atlases, contract) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this._error('invalid_sprite_state', `Sprite Pack ${spriteKey} state ${stateKey} must be an object`);
        }
        const atlasId = this._token(value.atlasId, `${spriteKey}.${stateKey} atlasId`, contract);
        const atlas = atlases.get(atlasId);
        if (!atlas) throw this._error('missing_sprite_atlas', `Sprite Pack ${spriteKey} state ${stateKey} references missing atlas ${atlasId}`);
        const frameCount = this._integer(value.frameCount ?? 1, `${spriteKey}.${stateKey} frameCount`, 1, this.MAX_FRAMES);
        const rect = this._normalizeRect(value.rect, atlas, spriteKey, stateKey);
        if (rect.width % frameCount !== 0) {
            throw this._error('invalid_sprite_strip', `Sprite Pack ${spriteKey} state ${stateKey} width must divide evenly by frameCount`);
        }
        const anchor = value.anchor === undefined || value.anchor === null ? {} : value.anchor;
        if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
            throw this._error('invalid_sprite_state', `Sprite Pack ${spriteKey} state ${stateKey} anchor must be an object`);
        }
        const fit = String(value.fit || 'contain').toLowerCase();
        if (!this.FIT_POLICIES.includes(fit)) {
            throw this._error('invalid_sprite_state', `Sprite Pack ${spriteKey} state ${stateKey} fit must be contain or cover`);
        }
        return {
            atlasId,
            rect,
            frameCount,
            frameWidth: rect.width / frameCount,
            durationMs: frameCount > 1
                ? this._integer(value.durationMs ?? frameCount * 180, `${spriteKey}.${stateKey} durationMs`, 80, 30000)
                : 0,
            loop: value.loop !== false,
            fit,
            anchor: {
                x: this._number(anchor.x, `${spriteKey}.${stateKey} anchor.x`, 0, 1, 0.5),
                y: this._number(anchor.y, `${spriteKey}.${stateKey} anchor.y`, 0, 1, 0.5)
            }
        };
    },

    _assertFallbackGraph(sprites) {
        const keys = new Set(Object.keys(sprites));
        for (const [key, sprite] of Object.entries(sprites)) {
            if (!sprite.fallback || !keys.has(sprite.fallback)) continue;
            const seen = new Set([key]);
            let cursor = sprite.fallback;
            while (cursor && keys.has(cursor)) {
                if (seen.has(cursor)) throw this._error('sprite_fallback_cycle', `Sprite Pack fallback cycle includes ${cursor}`);
                seen.add(cursor);
                cursor = sprites[cursor]?.fallback || '';
            }
        }
    },

    normalizePresentation(value, options = {}) {
        const contract = options.contract || YAW_MEDIA_CONTRACT;
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw this._error('invalid_sprite_pack', 'Sprite Pack presentation must be an object');
        }
        if (String(value.type || '') !== this.PRESENTATION_TYPE || Number(value.version) !== this.PRESENTATION_VERSION) {
            throw this._error('invalid_sprite_pack', `Sprite Pack must use ${this.PRESENTATION_TYPE} version ${this.PRESENTATION_VERSION}`);
        }
        const resources = this._resources(options.resources);
        if (!Array.isArray(value.atlases) || !value.atlases.length || value.atlases.length > this.MAX_ATLASES) {
            throw this._error('invalid_sprite_pack', `Sprite Pack atlases must contain between 1 and ${this.MAX_ATLASES} entries`);
        }
        const atlasList = value.atlases.map((atlas, index) => this._normalizeAtlas(atlas, index, resources, contract));
        const atlases = new Map();
        for (const atlas of atlasList) {
            if (atlases.has(atlas.id)) throw this._error('invalid_sprite_pack', `Duplicate Sprite Pack atlas ${atlas.id}`);
            atlases.set(atlas.id, atlas);
        }
        if (!value.sprites || typeof value.sprites !== 'object' || Array.isArray(value.sprites)) {
            throw this._error('invalid_sprite_pack', 'Sprite Pack sprites must be an object');
        }
        const entries = Object.entries(value.sprites);
        if (!entries.length || entries.length > this.MAX_SPRITES) {
            throw this._error('invalid_sprite_pack', `Sprite Pack sprites must contain between 1 and ${this.MAX_SPRITES} entries`);
        }
        const sprites = {};
        for (const [rawKey, definition] of entries) {
            const key = this._token(rawKey, 'sprite semantic key', contract);
            if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
                throw this._error('invalid_sprite_pack', `Sprite Pack sprite ${key} must be an object`);
            }
            const stateEntries = Object.entries(definition.states || {});
            if (stateEntries.length > this.MAX_STATES_PER_SPRITE) {
                throw this._error('invalid_sprite_pack', `Sprite Pack sprite ${key} states must contain at most ${this.MAX_STATES_PER_SPRITE} entries`);
            }
            const states = {};
            for (const [rawStateKey, state] of stateEntries) {
                const stateKey = this._stateKey(rawStateKey, key, contract);
                if (states[stateKey]) throw this._error('invalid_sprite_pack', `Duplicate Sprite Pack state ${key}.${stateKey}`);
                states[stateKey] = this._normalizeState(state, key, stateKey, atlases, contract);
            }
            const fallback = definition.fallback
                ? this._token(definition.fallback, `sprite ${key} fallback`, contract)
                : '';
            if (!stateEntries.length && !fallback) {
                throw this._error('invalid_sprite_pack', `Sprite Pack sprite ${key} requires states or a fallback`);
            }
            if (!states['idle:any'] && !fallback) {
                throw this._error('invalid_sprite_pack', `Sprite Pack sprite ${key} requires idle:any or a fallback`);
            }
            sprites[key] = {
                key,
                label: String(definition.label || key).slice(0, 120),
                fallback,
                states
            };
        }
        this._assertFallbackGraph(sprites);
        const scaling = String(value.scaling || 'smooth').toLowerCase();
        if (!this.SCALING_POLICIES.includes(scaling)) {
            throw this._error('invalid_sprite_pack', 'Sprite Pack scaling must be smooth or pixelated');
        }
        return {
            type: this.PRESENTATION_TYPE,
            version: this.PRESENTATION_VERSION,
            id: this._token(value.id, 'id', contract),
            name: String(value.name || value.id || '').trim().slice(0, 120),
            nativeFrameSize: this._nativeFrameSize(value.nativeFrameSize),
            scaling,
            atlases: atlasList,
            sprites,
            coverage: {
                semanticKeys: Object.keys(sprites).sort()
            }
        };
    },

    normalizeBundle(normalizedPackage, options = {}) {
        const bundle = normalizedPackage?.bundle;
        if (!bundle) throw this._error('invalid_sprite_pack', 'Normalized Asset Bundle V1 package is required');
        const presentations = (bundle.presentations || []).filter(presentation => presentation?.type === this.PRESENTATION_TYPE);
        if (presentations.length > 1) {
            throw this._error('ambiguous_sprite_pack', 'Asset Bundle V1 may contain at most one Sprite Pack V1 presentation');
        }
        return presentations.map(presentation => this.normalizePresentation(presentation, {
            ...options,
            resources: bundle.resources
        }));
    }
};

if (typeof window !== 'undefined') window.YAW_SPRITE_PACK_V1 = YAW_SPRITE_PACK_V1;
