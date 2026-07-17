/**
 * YOU ARE WILD OPENAI-COMPATIBLE PROVIDER
 * Browser-direct Responses and Chat Completions transport with session credentials.
 */

const YAW_OPENAI_COMPATIBLE_PROVIDER = (() => {
    const fetchRequest = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    const PROVIDER_ID = 'openai-compatible';
    const DEFAULT_TIMEOUT_MS = 30000;
    const MIN_TIMEOUT_MS = 1000;
    const MAX_TIMEOUT_MS = 30000;
    const DEFAULT_MAX_COMPLETION_TOKENS = 8192;
    const MIN_MAX_COMPLETION_TOKENS = 64;
    const MAX_MAX_COMPLETION_TOKENS = 32768;
    const CHAT_TOKEN_PARAMETERS = new Set(['max_completion_tokens', 'max_tokens']);
    const REASONING_EFFORTS = new Set(['provider', 'none', 'minimal', 'low', 'medium', 'high']);
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

    const fail = (code, status = 0, diagnostic = null) => {
        const error = new Error('OpenAI-compatible provider request failed');
        error.code = code;
        error.status = status;
        if (diagnostic) error.diagnostic = diagnostic;
        return error;
    };

    const provider = {
        PROVIDER_ID,
        DEFAULT_TIMEOUT_MS,
        MIN_TIMEOUT_MS,
        MAX_TIMEOUT_MS,
        DEFAULT_MAX_COMPLETION_TOKENS,
        MIN_MAX_COMPLETION_TOKENS,
        MAX_MAX_COMPLETION_TOKENS,
        REASONING_EFFORTS: [...REASONING_EFFORTS],
        fileOriginRemoteOverride: false,

        setFileOriginRemoteOverride(enabled) {
            this.fileOriginRemoteOverride = this.isFileOrigin() && enabled === true;
            return this.fileOriginRemoteOverride;
        },

        fileOriginRemoteOverrideEnabled() {
            return this.isFileOrigin() && this.fileOriginRemoteOverride === true;
        },

        isFileOrigin() {
            return window.location?.protocol === 'file:' || window.location?.origin === 'null';
        },

        isLoopbackEndpoint(value) {
            let url;
            try { url = new URL(this.normalizeBaseUrl(value)); } catch (error) { return false; }
            return url.hostname === 'localhost'
                || url.hostname.endsWith('.localhost')
                || /^127(?:\.\d{1,3}){3}$/.test(url.hostname)
                || url.hostname === '[::1]';
        },

        assertPageOriginCompatible(endpoint, credential = {}) {
            if (!this.isFileOrigin()) return true;
            if (this.fileOriginRemoteOverrideEnabled()) return true;
            if (!this.isLoopbackEndpoint(endpoint) || this.credentialHasValues(credential)) {
                throw fail('file_origin_local_only');
            }
            return true;
        },

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

        isPlaintextEndpoint(value) {
            return new URL(this.normalizeBaseUrl(value)).protocol === 'http:';
        },

        normalizeProtocol(value) {
            const protocol = String(value || 'auto').trim().toLowerCase();
            if (!protocols.has(protocol)) throw fail('invalid_protocol');
            return protocol;
        },

        normalizeMaxCompletionTokens(value) {
            const parsed = Number(value ?? DEFAULT_MAX_COMPLETION_TOKENS);
            if (!Number.isInteger(parsed)
                || parsed < MIN_MAX_COMPLETION_TOKENS
                || parsed > MAX_MAX_COMPLETION_TOKENS) {
                throw fail('invalid_token_budget');
            }
            return parsed;
        },

        normalizeReasoningEffort(value) {
            const effort = String(value || 'provider').trim().toLowerCase();
            if (!REASONING_EFFORTS.has(effort)) throw fail('invalid_reasoning_effort');
            return effort;
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

        credentialHasValues(credential = {}) {
            if (String(credential?.apiKey || '').trim()) return true;
            return this.normalizeHeaders(credential?.additionalHeaders || [])
                .some(header => Boolean(header.value));
        },

        assertPlaintextNoAuth(endpoint, credential = {}) {
            if (this.isPlaintextEndpoint(endpoint) && this.credentialHasValues(credential)) {
                throw fail('plaintext_credentials_forbidden');
            }
        },

        normalizeProfile(input = {}, existing = null) {
            const endpoint = this.normalizeBaseUrl(input.endpoint ?? existing?.metadata?.endpoint ?? 'https://api.openai.com/v1');
            const model = String(input.model ?? existing?.metadata?.model ?? '').trim().slice(0, 200);
            if (!model) throw fail('invalid_model');
            const timeoutMs = Math.max(MIN_TIMEOUT_MS, Math.min(
                MAX_TIMEOUT_MS,
                Number(input.timeoutMs ?? existing?.metadata?.timeoutMs) || DEFAULT_TIMEOUT_MS
            ));
            const temperatureInput = input.temperature ?? existing?.metadata?.temperature;
            const temperature = temperatureInput === '' || temperatureInput === null || temperatureInput === undefined
                ? null
                : Math.max(0, Math.min(2, Number(temperatureInput)));
            if (temperature !== null && !Number.isFinite(temperature)) throw fail('invalid_temperature');
            const maxCompletionTokens = this.normalizeMaxCompletionTokens(
                input.maxCompletionTokens ?? existing?.metadata?.maxCompletionTokens
            );
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
                    maxCompletionTokens,
                    reasoningEffort: this.normalizeReasoningEffort(input.reasoningEffort ?? existing?.metadata?.reasoningEffort ?? 'provider'),
                    lastSuccessfulProtocol: String(existing?.metadata?.lastSuccessfulProtocol || ''),
                    lastSuccessfulChatTokenParameter: CHAT_TOKEN_PARAMETERS.has(existing?.metadata?.lastSuccessfulChatTokenParameter)
                        ? existing.metadata.lastSuccessfulChatTokenParameter
                        : '',
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
            const submittedCredential = { apiKey: String(input.apiKey || ''), additionalHeaders };
            this.assertPageOriginCompatible(normalized.metadata.endpoint, submittedCredential);
            this.assertPlaintextNoAuth(normalized.metadata.endpoint, submittedCredential);
            const downgradedToPlaintext = Boolean(existing?.connected)
                && !this.isPlaintextEndpoint(existing.metadata?.endpoint)
                && this.isPlaintextEndpoint(normalized.metadata.endpoint);
            const id = YAW_AI_PROVIDER_MANAGER.upsertProfile({
                id: input.id || undefined,
                providerId: PROVIDER_ID,
                name: normalized.name,
                metadata: normalized.metadata,
                persisted: true
            });
            if (replacesCredential || downgradedToPlaintext) {
                YAW_AI_PROVIDER_MANAGER.connectProfile(id, downgradedToPlaintext
                    ? { apiKey: '', additionalHeaders: [] }
                    : submittedCredential);
            }
            return this.snapshot(id);
        },

        replaceCredential(profileId, apiKey = '', additionalHeaders = []) {
            const profile = this.profile(profileId);
            if (!profile) throw fail('profile_unavailable');
            const credential = {
                apiKey: String(apiKey || ''),
                additionalHeaders: this.normalizeHeaders(additionalHeaders)
            };
            this.assertPageOriginCompatible(profile.metadata?.endpoint, credential);
            this.assertPlaintextNoAuth(profile.metadata?.endpoint, credential);
            YAW_AI_PROVIDER_MANAGER.connectProfile(profile.id, credential);
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

        prompt(profileId, instructions, input, maxCharacters) {
            const engineContract = `Write one plain-text game narration passage no longer than ${maxCharacters} characters. Preserve every deterministic fact. Do not add mechanics, choices, Markdown, or HTML. Profile: ${String(profileId || 'storyteller')}.`;
            return {
                instructions: [engineContract, instructions ? `Narration mod instructions:\n${instructions}` : ''].filter(Boolean).join('\n\n'),
                input: JSON.stringify(input)
            };
        },

        outputTokenLimit(metadata = {}) {
            // Completion limits include hidden reasoning for many providers. The final
            // visible narration length remains independently enforced by the caller.
            return this.normalizeMaxCompletionTokens(metadata.maxCompletionTokens);
        },

        requestBody(protocol, metadata, prompt, outputTokenLimit, chatTokenParameter = 'max_completion_tokens') {
            const reasoningEffort = this.normalizeReasoningEffort(metadata.reasoningEffort || 'provider');
            if (protocol === 'responses') {
                const body = {
                    model: metadata.model,
                    instructions: prompt.instructions,
                    input: prompt.input,
                    max_output_tokens: outputTokenLimit
                };
                if (reasoningEffort !== 'provider') body.reasoning = { effort: reasoningEffort };
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
            body[CHAT_TOKEN_PARAMETERS.has(chatTokenParameter) ? chatTokenParameter : 'max_completion_tokens'] = outputTokenLimit;
            if (reasoningEffort !== 'provider') body.reasoning_effort = reasoningEffort;
            if (metadata.temperature !== null) body.temperature = metadata.temperature;
            return body;
        },

        requestHeaders(metadata, credential = {}) {
            const headers = { 'Content-Type': 'application/json' };
            const apiKey = String(credential.apiKey || '').trim();
            if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
            if (metadata.organization) headers['OpenAI-Organization'] = metadata.organization;
            if (metadata.project) headers['OpenAI-Project'] = metadata.project;
            for (const header of this.normalizeHeaders(credential.additionalHeaders || [])) {
                if (header.value) headers[header.name] = header.value;
            }
            return headers;
        },

        unsupportedTokenParameter(status, payload, parameter) {
            if (status !== 400 || !CHAT_TOKEN_PARAMETERS.has(parameter)) return false;
            const source = payload?.error || payload || {};
            const code = String(source.code || source.type || payload?.error_type || '').toLowerCase();
            const reportedParameter = String(source.param || source.parameter || '').toLowerCase();
            const message = String(source.message || '').toLowerCase();
            const named = reportedParameter === parameter || message.includes(parameter);
            const unsupported = fallbackCodes.has(code)
                || /unknown|unsupported|unrecognized|not permitted|not allowed/.test(message);
            return named && unsupported;
        },

        errorCode(status, payload = {}) {
            const source = payload?.error || payload || {};
            const providerCode = String(source.code || source.type || payload?.error_type || '').toLowerCase();
            const parameter = String(source.param || source.parameter || '').toLowerCase();
            const message = String(source.message || '').toLowerCase();
            if ([404, 405, 501].includes(status)) return 'unsupported_route';
            if (status === 401) return 'auth_invalid';
            if (status === 402) return 'quota_exceeded';
            if (status === 403) return 'forbidden';
            if (status === 408) return 'timeout';
            if (status === 429) return 'rate_limited';
            if (/model.*not.*found|invalid.*model|model_not_found/.test(providerCode)) return 'invalid_model';
            if (/moderation|policy|content_filter/.test(providerCode)) return 'policy_rejected';
            if (status === 400 && (parameter.includes('reasoning') || message.includes('reasoning_effort') || message.includes('reasoning effort'))) return 'unsupported_reasoning_effort';
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

        responseDiagnostic(protocol, payload = {}) {
            const choices = Array.isArray(payload?.choices) ? payload.choices : [];
            const output = Array.isArray(payload?.output) ? payload.output : [];
            const choice = choices[0] || {};
            const message = choice?.message || {};
            const reasoningPresent = Boolean(
                String(message?.reasoning_content || '').trim()
                || output.some(item => item?.type === 'reasoning' || String(item?.reasoning || '').trim())
            );
            const refusalPresent = Boolean(
                String(message?.refusal || '').trim()
                || output.some(item => item?.type === 'refusal')
            );
            return {
                protocol,
                finishReason: String(choice?.finish_reason || payload?.status || '').slice(0, 40),
                choiceCount: choices.length,
                outputItemCount: output.length,
                reasoningPresent,
                refusalPresent
            };
        },

        async requestProtocol(protocol, { profileId, profileName, instructions, input, maxCharacters, metadata, credential, signal }, chatTokenParameter = 'max_completion_tokens') {
            if (!fetchRequest) throw fail('transport_unavailable');
            const endpoint = this.endpointFor(metadata.endpoint, protocol);
            this.assertPageOriginCompatible(endpoint, credential);
            const approvedOrigin = new URL(metadata.endpoint).origin;
            if (new URL(endpoint).origin !== approvedOrigin) throw fail('origin_mismatch');
            this.assertPlaintextNoAuth(endpoint, credential);
            const headers = this.requestHeaders(metadata, credential);
            if (new URL(endpoint).protocol === 'http:' && Object.keys(headers).some(name => name.toLowerCase() === 'authorization')) {
                throw fail('plaintext_credentials_forbidden');
            }
            const outputTokenLimit = this.outputTokenLimit(metadata);
            let response;
            try {
                response = await fetchRequest(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(this.requestBody(
                        protocol,
                        metadata,
                        this.prompt(profileName, instructions, input, maxCharacters),
                        outputTokenLimit,
                        chatTokenParameter
                    )),
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
            if (!response.ok) {
                const code = protocol === 'chat' && this.unsupportedTokenParameter(response.status, payload, chatTokenParameter)
                    ? 'unsupported_output_token_parameter'
                    : this.errorCode(response.status, payload);
                throw fail(code, response.status);
            }
            const text = this.responseText(protocol, payload);
            if (!String(text || '').trim()) {
                throw fail('invalid_response', response.status, this.responseDiagnostic(protocol, payload));
            }
            const successfulMetadata = {
                lastSuccessfulProtocol: protocol,
                lastRequestUrl: endpoint
            };
            if (protocol === 'chat') successfulMetadata.lastSuccessfulChatTokenParameter = chatTokenParameter;
            YAW_AI_PROVIDER_MANAGER.updateProfileMetadata(profileId, successfulMetadata);
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

        async requestWithProtocol(protocol, request) {
            if (protocol !== 'chat') return this.requestProtocol(protocol, request);
            const preferred = CHAT_TOKEN_PARAMETERS.has(request.metadata?.lastSuccessfulChatTokenParameter)
                ? request.metadata.lastSuccessfulChatTokenParameter
                : 'max_completion_tokens';
            try {
                return await this.requestProtocol('chat', request, preferred);
            } catch (error) {
                if (error?.code !== 'unsupported_output_token_parameter') throw error;
                const alternate = preferred === 'max_completion_tokens' ? 'max_tokens' : 'max_completion_tokens';
                return this.requestProtocol('chat', request, alternate);
            }
        },

        async generate({ profileId, instructions, input, maxCharacters, connection, credential = {}, signal }) {
            const metadata = connection?.metadata || {};
            const selected = this.normalizeProtocol(metadata.protocol || 'auto');
            const preferred = selected === 'auto' && ['responses', 'chat'].includes(metadata.lastSuccessfulProtocol)
                ? metadata.lastSuccessfulProtocol
                : selected === 'auto' ? 'responses' : selected;
            const request = {
                profileId: connection.id,
                profileName: profileId,
                instructions,
                input,
                maxCharacters,
                metadata,
                credential,
                signal
            };
            try {
                return await this.requestWithProtocol(preferred, request);
            } catch (error) {
                if (selected !== 'auto' || !this.canFallback(error)) throw error;
                return this.requestWithProtocol(preferred === 'responses' ? 'chat' : 'responses', request);
            }
        },

        async test(profileId) {
            const profile = this.profile(profileId);
            if (!profile?.connected) throw fail('profile_disconnected');
            const result = await YAW_AI_PROVIDER_MANAGER.generate('core-openai-compatible-provider-test', {
                capability: 'text.generate',
                providerConnectionId: profile.id,
                profileId: 'narration-compatibility-test',
                instructions: "Use player POV from context.viewpoint. Address viewpoint.player as 'you'. Keep actual non-player actors in third person, and preserve every deterministic fact.",
                // Exercise a narration-shaped workload rather than a one-word health check.
                // Reasoning models can pass a trivial request while exhausting their
                // configured completion ceiling before producing real narration.
                maxCharacters: 500,
                timeoutMs: profile.metadata.timeoutMs,
                input: {
                    format: 'plain-text',
                    task: 'Write one concise two-sentence narration passage for the target exchange.',
                    viewpointMode: 'player',
                    context: {
                        version: 1,
                        target: { exchangeId: 'provider-narration-test' },
                        policy: { posture: 'sfw', enabledCategories: [], gameplayVariants: {} },
                        mode: 'combat',
                        location: { label: 'Forest road', time: 'Late afternoon' },
                        viewpoint: {
                            mode: 'player',
                            player: { id: 'player-test', name: 'Traveler' },
                            participation: 'observer',
                            beatRoles: [{ beatId: 'test-beat-1', participation: 'observer' }]
                        },
                        beats: [{
                            id: 'test-beat-1', action: 'fight', resultKind: 'damage',
                            summary: 'Wolfkin strikes Batfolk for 4 punishment.',
                            actors: [{ id: 'wolf-test', name: 'Wolfkin' }],
                            targets: [{ id: 'bat-test', name: 'Batfolk' }],
                            deltas: [{ type: 'punishment', amount: 4 }]
                        }],
                        recentBeats: [
                            { id: 'test-recent-1', summary: 'You enter the forest road.' },
                            { id: 'test-recent-2', summary: 'Wolfkin and Batfolk circle one another.' },
                            { id: 'test-beat-1', summary: 'Wolfkin strikes Batfolk for 4 punishment.' }
                        ],
                        characters: [
                            { id: 'wolf-test', name: 'Wolfkin', currentDisposition: 'hostile' },
                            { id: 'bat-test', name: 'Batfolk', currentDisposition: 'hostile' }
                        ],
                        activity: [
                            { type: 'discovery', text: 'You enter the forest road.' },
                            { type: 'combat', text: 'Wolfkin strikes Batfolk for 4 punishment.' }
                        ]
                    }
                }
            });
            return { ...this.snapshot(profile.id), test: result };
        }
    };

    provider.register();
    return provider;
})();

if (typeof window !== 'undefined') window.YAW_OPENAI_COMPATIBLE_PROVIDER = YAW_OPENAI_COMPATIBLE_PROVIDER;
