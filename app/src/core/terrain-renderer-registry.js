/**
 * YOU ARE WILD TERRAIN RENDERER REGISTRY
 *
 * Renderer adapters consume Terrain Scene V1 data. They receive no App object,
 * world store, persistence API, movement callback, or interaction authority.
 */

const YAW_TERRAIN_RENDERERS = (() => {
    const API_VERSION = 1;
    const adapters = new Map();

    function normalizeDescriptor(value = {}) {
        const id = String(value.id || '').trim();
        if (!/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(id)) throw new TypeError('Terrain renderer id is invalid');
        if (Number(value.apiVersion) !== API_VERSION) throw new TypeError(`Terrain renderer ${id} requires API ${API_VERSION}`);
        if (typeof value.create !== 'function') throw new TypeError(`Terrain renderer ${id} must provide create(target, options)`);
        return Object.freeze({
            id,
            apiVersion: API_VERSION,
            label: String(value.label || id).slice(0, 120),
            engine: String(value.engine || 'custom').slice(0, 80),
            capabilities: Object.freeze([...(Array.isArray(value.capabilities) ? value.capabilities : [])]
                .map(capability => String(capability).slice(0, 80))),
            create: value.create
        });
    }

    function register(descriptor, options = {}) {
        const normalized = normalizeDescriptor(descriptor);
        if (adapters.has(normalized.id) && !options.replace) throw new Error(`Terrain renderer already registered: ${normalized.id}`);
        adapters.set(normalized.id, normalized);
        return normalized;
    }

    function unregister(id) {
        return adapters.delete(String(id || ''));
    }

    function list() {
        return [...adapters.values()].map(({ create: _create, ...metadata }) => metadata);
    }

    function create(id, target, options = {}) {
        const descriptor = adapters.get(String(id || ''));
        if (!descriptor) throw new Error(`Unknown terrain renderer: ${id}`);
        const instance = descriptor.create(target, { ...options });
        if (!instance || typeof instance.render !== 'function' || typeof instance.destroy !== 'function') {
            throw new TypeError(`Terrain renderer ${descriptor.id} returned an invalid instance`);
        }
        return instance;
    }

    return { API_VERSION, register, unregister, list, create };
})();

if (typeof window !== 'undefined') window.YAW_TERRAIN_RENDERERS = YAW_TERRAIN_RENDERERS;
