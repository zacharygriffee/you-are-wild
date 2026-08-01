/**
 * YOU ARE WILD AUDIO PACK V1
 * Inert semantic audio mappings backed only by owned Asset Bundle resources.
 */

const YAW_AUDIO_PACK_V1 = {
    PRESENTATION_TYPE: 'yaw-audio-pack',
    VERSION: 1,
    MAX_CUES: 128,
    MAX_EVENT_VARIANTS: 8,
    MIME_TYPES: new Set([
        'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
        'audio/mp4', 'audio/aac', 'audio/flac'
    ]),

    _token(value, field) {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`Audio Pack V1 ${field} must be a bounded token`);
        }
        return token;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    normalizePresentation(value, options = {}) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Audio Pack V1 presentation must be an object');
        }
        const allowed = new Set(['type', 'version', 'id', 'name', 'cues']);
        for (const field of Object.keys(value)) {
            if (!allowed.has(field)) throw new Error(`Audio Pack V1 contains unsupported field ${field}`);
        }
        if (value.type !== this.PRESENTATION_TYPE || Number(value.version) !== this.VERSION) {
            throw new Error(`Audio Pack V1 must use type ${this.PRESENTATION_TYPE} and version ${this.VERSION}`);
        }
        const resources = new Map((options.resources || []).map(resource => [String(resource?.id || ''), resource]));
        const cueEntries = Object.entries(value.cues || {});
        if (!cueEntries.length || cueEntries.length > this.MAX_CUES) {
            throw new Error(`Audio Pack V1 cues must contain 1 to ${this.MAX_CUES} semantic events`);
        }
        const cues = {};
        for (const [eventValue, cueValue] of cueEntries) {
            const event = this._token(eventValue, 'event');
            const variants = Array.isArray(cueValue) ? cueValue : [cueValue];
            if (!variants.length || variants.length > this.MAX_EVENT_VARIANTS) {
                throw new Error(`Audio Pack V1 cue ${event} must contain 1 to ${this.MAX_EVENT_VARIANTS} variants`);
            }
            cues[event] = variants.map((variant, index) => {
                if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
                    throw new Error(`Audio Pack V1 cue ${event}[${index}] must be an object`);
                }
                for (const field of Object.keys(variant)) {
                    if (!['resourceId', 'volume', 'cooldownMs'].includes(field)) {
                        throw new Error(`Audio Pack V1 cue ${event}[${index}] contains unsupported field ${field}`);
                    }
                }
                const resourceId = this._token(variant.resourceId, `cue ${event} resourceId`);
                const resource = resources.get(resourceId);
                if (!resource) throw new Error(`Audio Pack V1 cue ${event} references missing resource ${resourceId}`);
                if (!this.MIME_TYPES.has(String(resource.mimeType || '').toLowerCase())) {
                    throw new Error(`Audio Pack V1 resource ${resourceId} must use a supported audio MIME type`);
                }
                const volume = variant.volume === undefined ? 1 : Number(variant.volume);
                if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
                    throw new Error(`Audio Pack V1 cue ${event} volume must be between 0 and 1`);
                }
                const cooldownMs = variant.cooldownMs === undefined ? 0 : Number(variant.cooldownMs);
                if (!Number.isInteger(cooldownMs) || cooldownMs < 0 || cooldownMs > 60000) {
                    throw new Error(`Audio Pack V1 cue ${event} cooldownMs must be an integer from 0 to 60000`);
                }
                return { resourceId, volume, cooldownMs };
            });
        }
        return this._deepFreeze({
            type: this.PRESENTATION_TYPE,
            version: this.VERSION,
            id: this._token(value.id, 'id'),
            name: String(value.name || value.id || '').trim().slice(0, 120),
            cues
        });
    }
};

if (typeof window !== 'undefined') window.YAW_AUDIO_PACK_V1 = YAW_AUDIO_PACK_V1;
