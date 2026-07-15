/**
 * YOU ARE WILD OPENAI-COMPATIBLE PROVIDER
 * Browser-direct Responses and Chat Completions transport with session credentials.
 */

const YAW_OPENAI_COMPATIBLE_PROVIDER = (() => {
    const fetchRequest = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    const PROVIDER_ID = 'openai-compatible';
    const protocols = new Set(['auto', 'responses', 'chat']);
    const fallbackCodes = new Set([
        'unsupported_endpoint', 'unsupported_protocol', 'unknown_url', 'route_not_found',
        'not_found', 'unsupported_request', 'unknown_parameter'
    ]);
    const reservedHeaders = new Set([
        'authorization', 'proxy-authorization', 'content-type', 'content-length', 'host',
        'origin', 'cookie', 'set-cookie', 'connection', 'transfer-encoding',
        'openai-organization', 'openai-project'
    ]);

    const fail = (code, status = 0) => {
        const error = new Error('OpenAI-compatible provider request failed');
        error.code = code;
        error.status = status;
        return error;
    };

    const provider = {
        PROVIDER_ID,

        register() {
            if (YAW_AI_PROVIDER_MANAGER.adapters.has(PROVIDER_ID)) return PROVIDER_ID;
            return YAW_AI_PROVIDER_MANAGER.registerAdapter(PROVIDER_ID, {
                name: 'OpenAI-Compatible API',
                description: 'Browser-direct text generation using Responses or Chat Completions compatible endpoints.',
                capabilities: ['text.generate'],
                generate: request => this.generate(request)
            }, 'core-openai-compatible-provider');
        },

        normalizeBaseUrl(value) {
            const input = String(value || '').trim();
            if (!input) throw fail('invalid_endpoint');
            let url;
            try { url = new URL(input); } catch (error) { throw fail('invalid_endpoint'); }
            const loopbackHttp = url.protocol === 'http:' && (
                url.hostname === 'localhost'
                || url.hostname.endsWith('.localhost')
                || /^127(?:\.\d{1,3}){3}$/.test(url.hostname)
                || url.hostname === '[::1]'
            );
            if (!(url.protocol === 'https:' || loopbackHttp) || url.username || url.password || url.search || url.hash) {
                throw fail('invalid_endpoint');
            }
            return url.toString().replace(/\/+$/, '');
        },

        endpointFor(baseUrl, protocol) {
            const normalized = this.normalizeBaseUrl(baseUrl);
            const route = protocol === 'responses' ? '/responses' : '/chat/completions';
            const endpoint = new URL(`${normalized}${route}`);
            if (endpoint.origin !== new URL(normalized).origin) throw fail('origin_mismatch');
            return endpoint.toString();
        },

        normalizeProtocol(value) {
            const protocol = String(value || 'auto').trim().toLowerCase();
            if (!protocols.has(protocol)) throw fail('invalid_protocol');
            return protocol;
        },

        normalizeHeaders(value = []) {
            if (!Array.isArray(value)) throw fail('invalid_headers');
            const seen = new Set();
            return value.slice(0, 20).map(entry => {
                const name = String(entry?.name || '').trim();
                const headerValue = String(entry?.value || '').trim();
                const lower = name.toLowerCase();
                if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,80}$/.test(name) || reservedHeaders.has(lower) || seen.has(lower)) {
                    throw fail('reserved_header');
                }
                if (headerValue.length > 500 || /[\r\n]/.test(headerValue)) throw fail('invalid_headers');
                seen.add(lower);
                return { name, value: headerValue };
            });
        },

        normalizeProfile(input = {}, existing = null) {
            const endpoint = this.normalizeBaseUrl(input.endpoint ?? existing?.metadata?.endpoint ?? 'https://api.openai.com/v1');
            const model = String(input.model ?? existing?.metadata?.model ?? '').trim().slice(0, 200);
            if (!model) throw fail('invalid_model');
            const timeoutMs = Math.max(1000, Math.min(30000, Number(input.timeoutMs ?? existing?.metadata?.timeoutMs) || 12000));
            const temperatureInput = input.temperature ?? existing?.metadata?.temperature;
            const temperature = temperatureInput === '' || temperatureInput === null || temperatureInput === undefined
                ? null
                : Math.max(0, Math.min(2, Number(temperatureInput)));
            if (temperature !== null && !Number.isFinite(temperature)) throw fail('invalid_temperature');
            return {
                name: String(input.name ?? existing?.name ?? 'OpenAI-Compatible API').trim().slice(0, 120) || 'OpenAI-Compatible API',
                metadata: {
                    endpoint,
                    model,
                    protocol: this.normalizeProtocol(input.protocol ?? existing?.metadata?.protocol ?? 'auto'),
                    organization: String(input.organization ?? existing?.metadata?.organization ?? '').trim().slice(0, 160),
                    project: String(input.project ?? existing?.metadata?.project ?? '').trim().slice(0, 160),
                    additionalHeaderNames: this.normalizeHeaders(input.additionalHeaders || []).map(header => header.name),
                    timeoutMs,
                    temperature,
                    lastSuccessfulProtocol: String(existing?.metadata?.lastSuccessfulProtocol || ''),
                    lastRequestUrl: String(existing?.metadata?.lastRequestUrl || ''),
                    transport: 'browser-direct'
                }
            };
        },

        connect(input = {}) {
            this.register();
            const existing = input.id ? YAW_AI_PROVIDER_MANAGER.listProfiles(PROVIDER_ID).find(profile => profile.id === input.id) : null;
            const replacesCredential = !existing?.connected
                || input.replaceCredential === true
                || Boolean(String(input.apiKey || ''))
                || (input.additionalHeaders || []).some(header => String(header?.value || '').trim());
            const profileInput = replacesCredential ? input : {
                ...input,
                additionalHeaders: (existing?.metadata?.additionalHeaderNames || []).map(name => ({ name, value: '' }))
            };
            const normalized = this.normalizeProfile(profileInput, existing);
            const additionalHeaders = replacesCredential ? this.normalizeHeaders(input.additionalHeaders || []) : [];
            const id = YAW_AI_PROVIDER_MANAGER.upsertProfile({
                id: input.id || undefined,
                providerId: PROVIDER_ID,
                name: normalized.name,
                metadata: normalized.metadata,
                persisted: true
            });
            if (replacesCredential) {
                YAW_AI_PROVIDER_MANAGER.connectProfile(id, {
                    apiKey: String(input.apiKey || ''),
                    additionalHeaders
                });
            }
            return this.snapshot(id);
        },

        replaceCredential(profileId, apiKey = '', additionalHeaders = []) {
            const profile = this.profile(profileId);
            if (!profile) throw fail('profile_unavailable');
            YAW_AI_PROVIDER_MANAGER.connectProfile(profile.id, {
                apiKey: String(apiKey || ''),
                additionalHeaders: this.normalizeHeaders(additionalHeaders)
            });
            return this.snapshot(profile.id);
        },

        clearCredential(profileId) {
            YAW_AI_PROVIDER_MANAGER.disconnectProfile(profileId, { clearCredential: true });
            return this.snapshot(profileId);
        },

        disconnect(profileId) {
            return this.clearCredential(profileId);
        },

        remove(profileId) {
            return YAW_AI_PROVIDER_MANAGER.removeProfile(profileId);
        },

        profile(profileId) {
            return YAW_AI_PROVIDER_MANAGER.listProfiles(PROVIDER_ID).find(profile => profile.id === String(profileId)) || null;
        },

        snapshot(profileId) {
            return this.profile(profileId);
        },

        prompt(profileId, input, maxCharacters) {
            return {
                instructions: `Write one plain-text game narration passage no longer than ${maxCharacters} characters. Preserve every deterministic fact. Do not add mechanics, choices, Markdown, or HTML. Profile: ${String(profileId || 'storyteller')}.`,
                input: JSON.stringify(input)
            };
        },

        requestBody(protocol, metadata, prompt) {
            if (protocol === 'responses') {
                const body = { model: metadata.model, instructions: prompt.instructions, input: prompt.input };
                if (metadata.temperature !== null) body.temperature = metadata.temperature;
                return body;
            }
            const body = {
                model: metadata.model,
                messages: [
                    { role: 'system', content: prompt.instructions },
                    { role: 'user', content: prompt.input }
                ],
                stream: false
            };
            if (metadata.temperature !== null) body.temperature = metadata.temperature;
            return body;
        },

        requestHeaders(metadata, credential = {}) {
            const headers = { 'Content-Type': 'application/json' };
            if (credential.apiKey) headers.Authorization = `Bearer ${credential.apiKey}`;
            if (metadata.organization) headers['OpenAI-Organization'] = metadata.organization;
            if (metadata.project) headers['OpenAI-Project'] = metadata.project;
            for (const header of this.normalizeHeaders(credential.additionalHeaders || [])) headers[header.name] = header.value;
            return headers;
        },

        errorCode(status, payload = {}) {
            const source = payload?.error || payload || {};
            const providerCode = String(source.code || source.type || payload?.error_type || '').toLowerCase();
            if ([404, 405, 501].includes(status)) return 'unsupported_route';
            if (status === 401) return 'auth_invalid';
            if (status === 402) return 'quota_exceeded';
            if (status === 403) return 'forbidden';
            if (status === 408) return 'timeout';
            if (status === 429) return 'rate_limited';
            if (/model.*not.*found|invalid.*model|model_not_found/.test(providerCode)) return 'invalid_model';
            if (/moderation|policy|content_filter/.test(providerCode)) return 'policy_rejected';
            if (status === 400 && fallbackCodes.has(providerCode)) return 'unsupported_request_shape';
            return status >= 500 ? 'provider_unavailable' : 'request_rejected';
        },

        canFallback(error) {
            return error?.code === 'unsupported_route' || error?.code === 'unsupported_request_shape';
        },

        async responseJson(response) {
            try {
                if (typeof response.text === 'function') {
                    const text = String(await response.text()).slice(0, 100000);
                    return text ? JSON.parse(text) : {};
                }
                if (typeof response.json === 'function') return await response.json();
            } catch (error) {
                throw fail('invalid_response', Number(response?.status) || 0);
            }
            return {};
        },

        responseText(protocol, payload) {
            if (protocol === 'responses') {
                if (typeof payload?.output_text === 'string') return payload.output_text;
                return (payload?.output || []).flatMap(item => item?.content || [])
                    .map(part => part?.text || part?.output_text || '')
                    .filter(Boolean)
                    .join(' ');
            }
            const content = payload?.choices?.[0]?.message?.content;
            if (Array.isArray(content)) return content.map(part => part?.text || '').join(' ');
            return String(content || '');
        },

        async requestProtocol(protocol, { profileId, profileName, input, maxCharacters, metadata, credential, signal }) {
            if (!fetchRequest) throw fail('transport_unavailable');
            const endpoint = this.endpointFor(metadata.endpoint, protocol);
            const approvedOrigin = new URL(metadata.endpoint).origin;
            if (new URL(endpoint).origin !== approvedOrigin) throw fail('origin_mismatch');
            let response;
            try {
                response = await fetchRequest(endpoint, {
                    method: 'POST',
                    headers: this.requestHeaders(metadata, credential),
                    body: JSON.stringify(this.requestBody(protocol, metadata, this.prompt(profileName, input, maxCharacters))),
                    signal,
                    redirect: 'manual',
                    referrerPolicy: 'no-referrer'
                });
            } catch (error) {
                if (signal?.aborted) throw error;
                throw fail('cors_or_network');
            }
            if (response?.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) throw fail('redirect_blocked', response.status);
            const payload = await this.responseJson(response);
            if (!response.ok) throw fail(this.errorCode(response.status, payload), response.status);
            const text = this.responseText(protocol, payload);
            if (!String(text || '').trim()) throw fail('invalid_response', response.status);
            YAW_AI_PROVIDER_MANAGER.updateProfileMetadata(profileId, {
                lastSuccessfulProtocol: protocol,
                lastRequestUrl: endpoint
            });
            return {
                text,
                modelId: String(payload?.model || metadata.model),
                usage: payload?.usage || null,
                protocol,
                endpoint,
                endpointReached: true,
                authenticationAccepted: true,
                modelAccepted: true
            };
        },

        async generate({ profileId, input, maxCharacters, connection, credential = {}, signal }) {
            const metadata = connection?.metadata || {};
            const selected = this.normalizeProtocol(metadata.protocol || 'auto');
            const preferred = selected === 'auto' && ['responses', 'chat'].includes(metadata.lastSuccessfulProtocol)
                ? metadata.lastSuccessfulProtocol
                : selected === 'auto' ? 'responses' : selected;
            const request = {
                profileId: connection.id,
                profileName: profileId,
                input,
                maxCharacters,
                metadata,
                credential,
                signal
            };
            try {
                return await this.requestProtocol(preferred, request);
            } catch (error) {
                if (selected !== 'auto' || !this.canFallback(error)) throw error;
                return this.requestProtocol(preferred === 'responses' ? 'chat' : 'responses', request);
            }
        },

        async test(profileId) {
            const profile = this.profile(profileId);
            if (!profile?.connected) throw fail('profile_disconnected');
            const result = await YAW_AI_PROVIDER_MANAGER.generate('core-openai-compatible-provider-test', {
                capability: 'text.generate',
                providerConnectionId: profile.id,
                profileId: 'neutral-connection-test',
                maxCharacters: 80,
                timeoutMs: profile.metadata.timeoutMs,
                input: { format: 'plain-text', task: 'Reply with the single word Connected.', context: { connectionTest: true } }
            });
            return { ...this.snapshot(profile.id), test: result };
        }
    };

    provider.register();
    return provider;
})();

if (typeof window !== 'undefined') window.YAW_OPENAI_COMPATIBLE_PROVIDER = YAW_OPENAI_COMPATIBLE_PROVIDER;
