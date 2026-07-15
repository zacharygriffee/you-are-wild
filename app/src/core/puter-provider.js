/**
 * YOU ARE WILD PUTER PROVIDER
 * Optional, keyless user-pays narration transport loaded only after player consent.
 */

const YAW_PUTER_PROVIDER = {
    PROVIDER_ID: 'puter',
    SDK_URL: 'https://js.puter.com/v2/',
    connectionId: '',
    sdkPromise: null,

    normalizeModel(value) {
        return String(value || '').trim().slice(0, 160);
    },

    register() {
        if (YAW_AI_PROVIDER_MANAGER.adapters.has(this.PROVIDER_ID)) return this.PROVIDER_ID;
        return YAW_AI_PROVIDER_MANAGER.registerAdapter(this.PROVIDER_ID, {
            name: 'Puter (User Pays)',
            generate: request => this.generate(request)
        }, 'core-puter-provider');
    },

    loadSdk() {
        if (window.puter?.ai?.chat && window.puter?.auth) return Promise.resolve(window.puter);
        if (this.sdkPromise) return this.sdkPromise;
        this.sdkPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${this.SDK_URL}"]`);
            if (existing) existing.remove();
            const script = document.createElement('script');
            const finish = () => window.puter?.ai?.chat && window.puter?.auth
                ? resolve(window.puter)
                : reject(new Error('Puter loaded without its AI interface'));
            script.addEventListener('load', finish, { once: true });
            script.addEventListener('error', () => reject(new Error('Could not load Puter')), { once: true });
            script.src = this.SDK_URL;
            script.async = true;
            script.referrerPolicy = 'strict-origin-when-cross-origin';
            document.head.appendChild(script);
        }).catch(error => {
            this.sdkPromise = null;
            throw error;
        });
        return this.sdkPromise;
    },

    async connect(model = '') {
        this.register();
        const puter = await this.loadSdk();
        if (!puter.auth.isSignedIn()) await puter.auth.signIn();
        if (this.connectionId) YAW_AI_PROVIDER_MANAGER.removeConnection(this.connectionId);
        this.connectionId = YAW_AI_PROVIDER_MANAGER.createConnection(this.PROVIDER_ID, {
            model: this.normalizeModel(model),
            transport: 'puter-user-pays'
        });
        return this.snapshot();
    },

    async test() {
        if (!this.connectionId || !YAW_AI_PROVIDER_MANAGER.connections.has(this.connectionId)) {
            throw new Error('Connect Puter before testing it');
        }
        const result = await YAW_AI_PROVIDER_MANAGER.generate('core-puter-provider-test', {
            capability: 'narration',
            providerConnectionId: this.connectionId,
            profileId: 'neutral-connection-test',
            maxCharacters: 80,
            timeoutMs: 12000,
            input: {
                format: 'plain-text',
                task: 'Reply with the single word Connected.',
                context: { connectionTest: true }
            }
        });
        return { ...this.snapshot(), tested: true, modelId: result.modelId || '' };
    },

    disconnect() {
        if (this.connectionId) YAW_AI_PROVIDER_MANAGER.removeConnection(this.connectionId);
        this.connectionId = '';
        return this.snapshot();
    },

    snapshot() {
        const connection = YAW_AI_PROVIDER_MANAGER.connections.get(this.connectionId);
        return {
            connected: Boolean(connection),
            connectionId: connection?.id || '',
            providerId: this.PROVIDER_ID,
            providerName: 'Puter (User Pays)',
            model: String(connection?.metadata?.model || '')
        };
    },

    prompt(profileId, input, maxCharacters) {
        return [
            {
                role: 'system',
                content: `Write one plain-text game narration passage no longer than ${maxCharacters} characters. Preserve every deterministic fact. Do not add mechanics, choices, Markdown, or HTML. Profile: ${String(profileId || 'storyteller')}.`
            },
            {
                role: 'user',
                content: JSON.stringify(input)
            }
        ];
    },

    responseText(response) {
        const content = response?.message?.content ?? response?.text ?? response;
        if (Array.isArray(content)) {
            return content.map(part => typeof part === 'string' ? part : (part?.text || '')).join(' ');
        }
        return String(content || '');
    },

    async generate({ profileId, input, maxCharacters, connection, signal }) {
        const puter = await this.loadSdk();
        if (signal?.aborted) {
            const error = new Error('Puter request cancelled');
            error.code = 'cancelled';
            throw error;
        }
        const model = this.normalizeModel(connection?.metadata?.model);
        const options = { stream: false };
        if (model) options.model = model;
        let abortHandler = null;
        const aborted = new Promise((_, reject) => {
            abortHandler = () => {
                const error = new Error('Puter request cancelled');
                error.code = 'cancelled';
                reject(error);
            };
            if (signal?.aborted) abortHandler();
            else signal?.addEventListener?.('abort', abortHandler, { once: true });
        });
        try {
            const response = await Promise.race([
                puter.ai.chat(this.prompt(profileId, input, maxCharacters), options),
                aborted
            ]);
            return {
                text: this.responseText(response),
                modelId: model || String(response?.model || 'puter-default').slice(0, 120),
                usage: null
            };
        } finally {
            signal?.removeEventListener?.('abort', abortHandler);
        }
    }
};

YAW_PUTER_PROVIDER.register();

if (typeof window !== 'undefined') window.YAW_PUTER_PROVIDER = YAW_PUTER_PROVIDER;
