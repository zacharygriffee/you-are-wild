/**
 * YOU ARE WILD MANAGED SERVICE
 *
 * Optional same-origin account and managed narration adapter. Discovery is
 * web-only and failure is non-fatal so hosted, standalone, and file builds keep
 * the same deterministic core.
 */

const YAW_MANAGED_SERVICE = (() => {
    const PROVIDER_ID = 'managed-yaw-service';
    const CONFIG_PATH = '/yaw-service.json';
    const state = {
        initialized: false,
        status: 'not-configured',
        config: null,
        account: { authenticated: false },
        connectionIds: new Set(),
        adapterRegistered: false,
        message: ''
    };

    function copy(value, fallback = null) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            return fallback;
        }
    }

    function currentOrigin() {
        if (typeof window === 'undefined') return '';
        if (!['http:', 'https:'].includes(String(window.location?.protocol || ''))) return '';
        return String(window.location.origin || '');
    }

    function sameOriginPath(value, fallback = '') {
        const origin = currentOrigin();
        if (!origin) return '';
        const url = new URL(String(value || fallback), origin);
        if (
            url.origin !== origin
            || !url.pathname.startsWith('/')
            || url.username
            || url.password
            || url.search
            || url.hash
        ) {
            throw new Error('Managed service URL must remain on the game origin');
        }
        return url.pathname;
    }

    function normalizeConfig(input) {
        if (!input || typeof input !== 'object' || input.schema !== 'yaw-managed-service-config-v1') {
            throw new Error('Managed service configuration is invalid');
        }
        if (input.enabled !== true) return null;
        return {
            schema: input.schema,
            apiBase: sameOriginPath(input.apiBase, '/api/yaw').replace(/\/+$/, ''),
            accountUrl: sameOriginPath(input.accountUrl, '/account'),
            subscribeUrl: sameOriginPath(input.subscribeUrl, '/subscribe'),
            approvedModuleIds: [...new Set((Array.isArray(input.approvedModuleIds) ? input.approvedModuleIds : [])
                .map(value => String(value || ''))
                .filter(value => /^[a-zA-Z0-9_-]+$/.test(value)))].slice(0, 40)
        };
    }

    function endpoint(path) {
        if (!state.config) throw new Error('Managed service is unavailable');
        return `${state.config.apiBase}${path}`;
    }

    function publicError(response, body) {
        const source = body?.error || {};
        const error = new Error(String(source.message || `Managed service returned HTTP ${response.status}`).slice(0, 300));
        error.code = String(source.code || 'service_unavailable').slice(0, 80);
        error.status = response.status;
        error.retryable = source.retryable === true;
        return error;
    }

    function publicAccountSnapshot() {
        const account = copy(state.account, { authenticated: false });
        if (account && typeof account === 'object') delete account.csrfToken;
        return account;
    }

    async function request(path, options = {}) {
        const headers = {
            Accept: 'application/json',
            ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(options.csrf === false || !state.account?.csrfToken
                ? {}
                : { 'X-YAW-CSRF': state.account.csrfToken })
        };
        const response = await window.fetch(endpoint(path), {
            method: options.method || 'GET',
            credentials: 'include',
            redirect: 'error',
            cache: 'no-store',
            headers,
            ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
            ...(options.signal ? { signal: options.signal } : {})
        });
        let body = null;
        try {
            body = await response.json();
        } catch (error) {
            body = null;
        }
        if (!response.ok) throw publicError(response, body);
        return copy(body, {});
    }

    function requestId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        return `request-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }

    function sceneFromInput(input = {}) {
        const context = copy(input.context || {}, {});
        return {
            mode: String(context.mode || input.task || '').slice(0, 80),
            location: copy(context.location || {}, {}),
            viewpoint: copy(context.viewpoint || {}, {}),
            beats: copy(context.beats || [], []).slice(0, 20),
            characters: copy(context.characters || [], []).slice(0, 20),
            recentContext: [
                ...copy(context.recentBeats || [], []),
                ...copy(context.activity || [], [])
            ].slice(0, 30)
        };
    }

    function registerAdapter() {
        if (state.adapterRegistered || typeof YAW_AI_PROVIDER_MANAGER === 'undefined') return state.adapterRegistered;
        YAW_AI_PROVIDER_MANAGER.registerAdapter(PROVIDER_ID, {
            name: 'You Are Wild Premium Narration',
            description: 'Optional account-backed narration with curated models and server-owned provider credentials.',
            capabilities: ['text.generate'],
            authorize(context) {
                const owner = String(context?.ownerModuleId || '');
                return state.config?.approvedModuleIds?.includes(owner) === true;
            },
            async invoke(context) {
                const metadata = context.connection?.metadata || {};
                const policy = context.input?.context?.policy || {};
                const result = await request('/v1/managed/narration', {
                    method: 'POST',
                    signal: context.signal,
                    body: {
                        schema: 'yaw-managed-narration-v1',
                        requestId: requestId(),
                        connectionId: String(metadata.serviceConnectionId || 'managed:narration'),
                        modelAlias: String(metadata.modelAlias || ''),
                        profileId: ['storyteller', 'characters', 'hybrid'].includes(context.profileId)
                            ? context.profileId
                            : 'storyteller',
                        maxCharacters: context.maxCharacters,
                        content: {
                            posture: policy.posture === 'mature' ? 'mature' : 'safe',
                            categories: Array.isArray(policy.enabledCategories)
                                ? policy.enabledCategories.filter(id => id === 'explicit.sexual')
                                : []
                        },
                        scene: sceneFromInput(context.input)
                    }
                });
                return {
                    text: result.text,
                    modelId: String(result.model?.id || metadata.modelAlias || ''),
                    protocol: 'managed-service',
                    usage: copy(result.usage || null, null)
                };
            }
        });
        state.adapterRegistered = true;
        return true;
    }

    function clearConnections() {
        if (typeof YAW_AI_PROVIDER_MANAGER === 'undefined') return;
        for (const id of state.connectionIds) YAW_AI_PROVIDER_MANAGER.removeProfile(id);
        state.connectionIds.clear();
    }

    async function syncConnections() {
        clearConnections();
        if (!state.account?.authenticated || !['active', 'canceled'].includes(state.account?.entitlement?.status)) return [];
        const declaration = await request('/v1/managed/connections');
        for (const connection of declaration.connections || []) {
            for (const model of connection.models || []) {
                const alias = String(model?.id || '');
                if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(alias)) continue;
                const id = `${String(connection.id || 'managed:narration')}:${alias}`;
                YAW_AI_PROVIDER_MANAGER.upsertProfile({
                    id,
                    providerId: PROVIDER_ID,
                    name: `${String(connection.displayName || 'Premium Narration').slice(0, 80)} — ${String(model.displayName || alias).slice(0, 80)}`,
                    metadata: {
                        serviceConnectionId: String(connection.id || 'managed:narration').slice(0, 120),
                        modelAlias: alias,
                        modelDisplayName: String(model.displayName || alias).slice(0, 80)
                    },
                    persisted: false
                });
                YAW_AI_PROVIDER_MANAGER.connectProfile(id);
                state.connectionIds.add(id);
            }
        }
        return YAW_AI_PROVIDER_MANAGER.listProfiles(PROVIDER_ID);
    }

    async function refreshSession() {
        if (!state.config) return { authenticated: false };
        state.account = await request('/v1/account/session', { csrf: false });
        await syncConnections();
        if (typeof AIProviderUI !== 'undefined') AIProviderUI.refresh();
        if (typeof ModUI !== 'undefined') ModUI.refreshModList();
        return copy(state.account, { authenticated: false });
    }

    async function consumeLocationMagicLink() {
        const hash = String(window.location?.hash || '');
        if (!hash.startsWith('#yaw-magic=')) return false;
        const encodedToken = hash.slice('#yaw-magic='.length);
        window.history?.replaceState?.(null, '', `${window.location.pathname}${window.location.search}`);
        let token = '';
        try {
            token = decodeURIComponent(encodedToken);
        } catch (error) {
            return false;
        }
        if (!token) return false;
        state.account = await request('/v1/auth/consume', {
            method: 'POST',
            csrf: false,
            body: { token }
        });
        await syncConnections();
        return true;
    }

    const api = {
        PROVIDER_ID,

        snapshot() {
            return {
                initialized: state.initialized,
                status: state.status,
                configured: Boolean(state.config),
                account: publicAccountSnapshot(),
                message: state.message
            };
        },

        async init() {
            if (state.initialized) return this.snapshot();
            state.initialized = true;
            if (!currentOrigin()) return this.snapshot();
            try {
                const response = await window.fetch(CONFIG_PATH, {
                    method: 'GET',
                    credentials: 'same-origin',
                    redirect: 'error',
                    cache: 'no-store',
                    headers: { Accept: 'application/json' }
                });
                if (response.status === 404 || response.status === 204) return this.snapshot();
                if (!response.ok) throw new Error(`Managed service discovery returned HTTP ${response.status}`);
                state.config = normalizeConfig(await response.json());
                if (!state.config) return this.snapshot();
                registerAdapter();
                state.status = 'available';
                await consumeLocationMagicLink();
                await refreshSession();
            } catch (error) {
                clearConnections();
                state.status = 'unavailable';
                state.message = 'Managed account service is temporarily unavailable.';
                console.warn('Managed account service discovery failed');
            }
            return this.snapshot();
        },

        async requestSignIn(email) {
            await request('/v1/auth/magic-link', {
                method: 'POST',
                csrf: false,
                body: { email: String(email || '').slice(0, 254) }
            });
            state.message = 'Check your email for a one-time sign-in link.';
            return true;
        },

        async confirmContentAccess() {
            if (!state.account?.authenticated) throw new Error('Sign in before confirming account content access');
            const categories = CONTENT?.preferences?.enabledCategories || [];
            return new Promise(resolve => {
                App.showConfirmDialog({
                    title: App._label('managed.confirmTitle', 'Confirm account content access?'),
                    message: App._label('managed.confirmMessage', 'This stores a versioned 18+ confirmation on your account for managed Mature narration. It does not store your birthday or identity document. Payment and content access remain separate.'),
                    confirmLabel: App._label('managed.confirmAction', 'I am 18 or older — Confirm'),
                    cancelLabel: App._label('ui.cancel', 'Cancel'),
                    onConfirm: async () => {
                        state.account = await request('/v1/account/content-access', {
                            method: 'POST',
                            body: {
                                policyVersion: 1,
                                adultConfirmed: true,
                                ratings: ['mature'],
                                categories: categories.filter(id => id === 'explicit.sexual')
                            }
                        });
                        state.message = 'Account content access updated.';
                        await syncConnections();
                        if (typeof AIProviderUI !== 'undefined') AIProviderUI.refresh?.();
                        resolve(true);
                    },
                    onCancel: () => resolve(false)
                });
            });
        },

        async logout() {
            await request('/v1/account/logout', { method: 'POST', body: {} });
            state.account = { authenticated: false };
            state.message = 'Signed out.';
            clearConnections();
            if (typeof ModUI !== 'undefined') ModUI.refreshModList();
            return true;
        },

        refreshSession,

        openAccount() {
            if (state.config?.accountUrl) window.location.assign(state.config.accountUrl);
        },

        openSubscribe() {
            if (state.config?.subscribeUrl) window.location.assign(state.config.subscribeUrl);
        }
    };

    return Object.freeze(api);
})();

if (typeof window !== 'undefined') window.YAW_MANAGED_SERVICE = YAW_MANAGED_SERVICE;
