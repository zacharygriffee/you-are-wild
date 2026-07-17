/**
 * AI Provider management surface.
 */

const AIProviderUI = {
    busy: false,
    editingProfileId: '',
    message: '',
    messageKind: 'info',

    label(key, fallback, vars = {}) {
        if (typeof App !== 'undefined' && App._label) return App._label(key, fallback, vars);
        if (typeof CONTENT !== 'undefined' && CONTENT.t) {
            const text = CONTENT.t(key, vars);
            return text === key ? fallback : text;
        }
        return fallback;
    },

    escape(value) {
        if (typeof App !== 'undefined' && App._escapeHtml) return App._escapeHtml(value);
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[character]));
    },

    js(value) {
        return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    },

    capabilityLabel(capability) {
        const labels = {
            'text.generate': this.label('provider.capability.text', 'Text generation'),
            'image.generate': this.label('provider.capability.image', 'Image generation'),
            'video.generate': this.label('provider.capability.video', 'Video generation'),
            'audio.speech': this.label('provider.capability.speech', 'Speech generation'),
            'audio.transcribe': this.label('provider.capability.transcribe', 'Audio transcription')
        };
        return labels[capability] || capability;
    },

    capabilityBadges(capabilities = []) {
        return capabilities.map(capability => `<span class="provider-capability">${this.escape(this.capabilityLabel(capability))}</span>`).join('');
    },

    setMessage(message = '', kind = 'info') {
        this.message = String(message || '');
        this.messageKind = kind;
    },

    errorMessage(error) {
        const code = String(error?.code || 'provider_error');
        const status = Number(error?.status) || 0;
        const messages = {
            invalid_endpoint: this.label('provider.error.endpoint', 'Enter an HTTPS base URL or a loopback HTTP URL without credentials, query parameters, or fragments.'),
            plaintext_credentials_forbidden: this.label('provider.error.plaintextCredentials', 'Plaintext loopback endpoints are no-auth only. Remove the API key and session-header values, or expose the authenticated local endpoint over HTTPS.'),
            auth_invalid: this.label('provider.error.auth', 'Authentication was rejected. Replace the API key and try again.'),
            quota_exceeded: this.label('provider.error.quota', 'The provider reported insufficient quota or credits.'),
            forbidden: this.label('provider.error.forbidden', 'The provider denied this request or blocked it by policy.'),
            rate_limited: this.label('provider.error.rateLimit', 'The provider rate limit was reached. Wait before testing again.'),
            invalid_model: this.label('provider.error.modelRejected', 'The endpoint rejected the configured model.'),
            redirect_blocked: this.label('provider.error.redirect', 'The endpoint redirected the request. Redirects are blocked to protect credentials.'),
            cors_or_network: this.label('provider.error.cors', 'The browser could not reach the endpoint. Check the URL, network, TLS, and CORS configuration.'),
            file_origin_local_only: this.label('provider.error.fileOriginLocalOnly', 'File mode only supports unauthenticated loopback providers such as Ollama.'),
            invalid_reasoning_effort: this.label('provider.error.reasoningEffort', 'Choose Provider managed, None, Minimal, Low, Medium, or High reasoning effort.'),
            unsupported_reasoning_effort: this.label('provider.error.reasoningUnsupported', 'This endpoint or model does not support the selected reasoning effort. Use Provider managed or choose a supported level.'),
            timeout: this.label('provider.error.timeout', 'The provider request timed out.'),
            cancelled: this.label('provider.error.cancelled', 'The provider request was cancelled.'),
            reserved_header: this.label('provider.error.header', 'An additional header is duplicated, invalid, or reserved by the provider transport.'),
            invalid_headers: this.label('provider.error.headerValue', 'Check additional header names and values.'),
            unsupported_route: this.label('provider.error.protocol', 'The selected API protocol is not available at this endpoint.'),
            request_rejected: this.label('provider.error.request', 'The endpoint rejected the request. Check the model and protocol.'),
            invalid_response: error?.diagnostic?.finishReason === 'length' && error?.diagnostic?.reasoningPresent === true
                ? this.label('provider.error.reasoningBudgetExhausted', 'The model used its completion budget for reasoning before producing narration. Increase Maximum completion tokens (try 8,192–16,384), reduce reasoning, or choose a non-reasoning model.')
                : this.label('provider.error.invalidResponse', 'The endpoint returned a successful response without readable text.'),
            invalid_token_budget: this.label('provider.error.tokenBudget', 'Enter a completion-token ceiling between 64 and 32,768.'),
            unsupported_output_token_parameter: this.label('provider.error.tokenParameter', 'The endpoint rejected both supported output-token parameters.'),
            provider_unavailable: this.label('provider.error.unavailable', 'The provider is temporarily unavailable.'),
            policy_rejected: this.label('provider.error.policy', 'The provider rejected the request under its content policy.'),
            transport_unavailable: this.label('provider.error.transport', 'Browser networking is unavailable for this provider request.'),
            origin_mismatch: this.label('provider.error.originMismatch', 'The derived request URL did not match the approved endpoint origin.'),
            profile_unavailable: this.label('provider.error.profileUnavailable', 'The saved provider profile is unavailable.'),
            popup_blocked: this.label('provider.puter.popupBlocked', 'The sign-in popup was blocked. Allow popups and try again.'),
            auth_window_closed: this.label('provider.puter.authCancelled', 'Puter sign-in was cancelled.')
        };
        const message = messages[code] || this.label('provider.error.generic', 'The provider operation failed. Check the connection details and try again.');
        const diagnostic = this.label(
            'provider.error.diagnostic',
            'Diagnostic: {code}{status}.',
            { code: code.slice(0, 80), status: status ? `; HTTP ${status}` : '' }
        );
        return `${message} ${diagnostic}`;
    },

    logError(error, action = 'operation', providerName = 'AI provider') {
        if (typeof App === 'undefined') return null;
        const code = String(error?.code || 'provider_error').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'provider_error';
        const status = Number(error?.status) || 0;
        const operation = String(action || 'operation').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'operation';
        const provider = String(providerName || 'AI provider').replace(/[\r\n]/g, ' ').trim().slice(0, 120) || 'AI provider';
        const text = this.label(
            'provider.error.activityLog',
            '{provider} {operation} failed ({code}{status}).',
            { provider, operation, code, status: status ? `; HTTP ${status}` : '' }
        );
        const entry = { text, type: 'error', errorCode: code, provider, providerOperation: operation, httpStatus: status };
        if (typeof App._pushLog === 'function') App._pushLog(entry, 'error');
        else if (Array.isArray(App.log)) App.log.push(entry);
        App.markAutoSaveDirty?.(['activityLog'], 'provider-error');
        App.renderLog?.();
        return entry;
    },

    renderPuter(provider, profiles) {
        const profile = profiles.find(item => item.id === YAW_PUTER_PROVIDER.PROFILE_ID) || { connected: false, metadata: {} };
        const state = profile.connected
            ? this.label('provider.state.connected', 'Connected for this browser session')
            : this.label('provider.state.disconnected', 'Disconnected');
        return `
            <section class="provider-service provider-service-secondary" aria-labelledby="provider-puter-title">
                <div class="provider-service-heading">
                    <div>
                        <div class="provider-service-title"><h2 id="provider-puter-title">${this.escape(provider.name)}</h2><span class="provider-tier-badge" data-tier="experimental">${this.escape(this.label('provider.experimental', 'Experimental'))}</span><span class="provider-tier-badge" data-tier="unverified">${this.escape(this.label('provider.unverified', 'Not currently verified'))}</span></div>
                        <p>${this.escape(this.label('provider.puter.experimentalDescription', 'Optional browser sign-in with user-paid model access. Retained for evaluation; this integration is not currently verified.'))}</p>
                    </div>
                    <div class="provider-capabilities">${this.capabilityBadges(provider.capabilities)}</div>
                </div>
                <div class="provider-connection-card">
                    <div class="provider-connection-summary">
                        <strong>${this.escape(this.label('provider.puter.connectionName', 'Puter browser session'))}</strong>
                        <span class="provider-state" data-connected="${profile.connected ? 'true' : 'false'}">${this.escape(state)}</span>
                    </div>
                    <label class="provider-field">
                        <span>${this.escape(this.label('provider.puter.model', 'Model'))}</span>
                        <small>${this.escape(this.label('provider.puter.modelHelp', 'Optional Puter model identifier. Leave blank for the provider default.'))}</small>
                        <input id="provider-puter-model" type="text" maxlength="160" autocomplete="off" value="${this.escape(profile.metadata?.model || '')}" placeholder="${this.escape(this.label('provider.puter.modelPlaceholder', 'Provider default'))}" ${profile.connected || this.busy ? 'disabled' : ''}>
                    </label>
                    <div class="provider-actions" role="group" aria-label="${this.escape(this.label('provider.puter.actions', 'Puter provider actions'))}">
                        <button class="nav-btn" type="button" onclick="AIProviderUI.runPuter('connect')" ${profile.connected || this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.connect', 'Connect'))}</button>
                        <button class="nav-btn" type="button" onclick="AIProviderUI.runPuter('test')" ${!profile.connected || this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.test', 'Test'))}</button>
                        <button class="nav-btn" type="button" onclick="AIProviderUI.runPuter('disconnect')" ${!profile.connected || this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.disconnect', 'Disconnect'))}</button>
                    </div>
                </div>
            </section>`;
    },

    renderOpenAIProfile(profile) {
        const metadata = profile.metadata || {};
        const state = profile.connected
            ? this.label('provider.state.connected', 'Connected for this browser session')
            : this.label('provider.state.reenter', 'Credential required for this session');
        const id = this.escape(this.js(profile.id));
        return `
            <article class="provider-connection-card">
                <div class="provider-connection-summary">
                    <div><strong>${this.escape(profile.name)}</strong><small>${this.escape(metadata.model || '')}</small></div>
                    <span class="provider-state" data-connected="${profile.connected ? 'true' : 'false'}">${this.escape(state)}</span>
                </div>
                <dl class="provider-metadata">
                    <div><dt>${this.escape(this.label('provider.endpoint', 'Endpoint'))}</dt><dd>${this.escape(metadata.endpoint || '')}</dd></div>
                    <div><dt>${this.escape(this.label('provider.protocol', 'Protocol'))}</dt><dd>${this.escape(metadata.lastSuccessfulProtocol || metadata.protocol || 'auto')}</dd></div>
                    <div><dt>${this.escape(this.label('provider.maxCompletionTokens', 'Completion-token ceiling'))}</dt><dd>${this.escape(metadata.maxCompletionTokens || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_MAX_COMPLETION_TOKENS)}</dd></div>
                    <div><dt>${this.escape(this.label('provider.reasoningEffort', 'Reasoning effort'))}</dt><dd>${this.escape(this.label(`provider.reasoning.${metadata.reasoningEffort || 'provider'}`, metadata.reasoningEffort || 'Provider managed'))}</dd></div>
                </dl>
                <div class="provider-actions" role="group" aria-label="${this.escape(this.label('provider.connectionActions', 'Connection actions'))}">
                    <button class="nav-btn" type="button" onclick="AIProviderUI.openEditor('${id}')" ${this.busy ? 'disabled' : ''}>${this.escape(profile.connected ? this.label('provider.edit', 'Edit') : this.label('provider.reconnect', 'Reconnect'))}</button>
                    <button class="nav-btn" type="button" onclick="AIProviderUI.runOpenAI('test','${id}')" ${!profile.connected || this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.test', 'Test'))}</button>
                    <button class="nav-btn" type="button" onclick="AIProviderUI.runOpenAI('disconnect','${id}')" ${!profile.connected || this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.clearCredential', 'Clear Credential'))}</button>
                    <button class="nav-btn danger" type="button" onclick="AIProviderUI.runOpenAI('remove','${id}')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.remove', 'Remove'))}</button>
                </div>
            </article>`;
    },

    renderHeaderRows(profile) {
        const names = profile?.metadata?.additionalHeaderNames || [];
        const rows = names.length ? names : [''];
        return rows.map(name => this.headerRow(name)).join('');
    },

    headerRow(name = '') {
        return `<div class="provider-header-row"><input class="provider-header-name" type="text" maxlength="80" value="${this.escape(name)}" placeholder="X-Custom-Header" aria-label="${this.escape(this.label('provider.headerName', 'Header name'))}"><input class="provider-header-value" type="password" maxlength="500" value="" autocomplete="new-password" placeholder="${this.escape(this.label('provider.sessionValue', 'Session value'))}" aria-label="${this.escape(this.label('provider.headerValue', 'Header value'))}"><button class="icon-btn" type="button" title="${this.escape(this.label('provider.removeHeader', 'Remove header'))}" aria-label="${this.escape(this.label('provider.removeHeader', 'Remove header'))}" onclick="this.closest('.provider-header-row').remove()">×</button></div>`;
    },

    renderOpenAIEditor(profile = null) {
        const metadata = profile?.metadata || {};
        const localOnly = typeof App !== 'undefined' && App.isFileOrigin() && !YAW_OPENAI_COMPATIBLE_PROVIDER.fileOriginRemoteOverrideEnabled();
        const select = value => metadata.protocol === value ? 'selected' : '';
        const reasoningSelected = value => (metadata.reasoningEffort || 'provider') === value ? 'selected' : '';
        const replacingCredential = !profile?.connected;
        const endpoint = metadata.endpoint || (localOnly ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');
        return `
            <form id="openai-provider-form" class="provider-editor" onsubmit="event.preventDefault(); AIProviderUI.runOpenAI('save','${this.escape(this.js(profile?.id || ''))}')">
                <div class="provider-form-grid">
                    <label class="provider-field"><span>${this.escape(this.label('provider.connectionName', 'Connection name'))}</span><input id="openai-provider-name" type="text" maxlength="120" value="${this.escape(profile?.name || this.label('provider.openai.defaultName', 'OpenAI-Compatible API'))}" required></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.endpoint', 'API endpoint'))}</span><input id="openai-provider-endpoint" type="url" maxlength="500" value="${this.escape(endpoint)}" required><small>${this.escape(localOnly ? this.label('provider.fileOriginEndpointHelp', 'Use an unauthenticated loopback OpenAI-compatible endpoint, such as http://localhost:11434/v1 for Ollama.') : this.label('provider.endpointHelp', 'Base URL. Authenticated endpoints require HTTPS; loopback HTTP is strictly no-auth.'))}</small></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.apiKey', 'API key'))}</span><input id="openai-provider-key" type="password" maxlength="500" value="" autocomplete="new-password" placeholder="${this.escape(localOnly ? this.label('provider.fileOriginNoCredential', 'Unavailable in file mode') : (profile?.connected ? this.label('provider.keepCredential', 'Current credential remains active') : this.label('provider.noAuthAllowed', 'Optional for no-auth local endpoints')))}" ${localOnly || !replacingCredential ? 'disabled' : ''}><small>${this.escape(localOnly ? this.label('provider.fileOriginNoCredentialHelp', 'Credentials are disabled for file-origin connections.') : this.label('provider.apiKeyHelp', 'Held only in memory for this browser session.'))}</small></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.model', 'Model'))}</span><input id="openai-provider-model" type="text" maxlength="200" value="${this.escape(metadata.model || '')}" placeholder="gpt-5-mini or openai/gpt-*" required></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.protocol', 'API protocol'))}</span><select id="openai-provider-protocol"><option value="auto" ${select('auto')}>${this.escape(this.label('provider.protocol.auto', 'Auto-detect'))}</option><option value="responses" ${select('responses')}>${this.escape(this.label('provider.protocol.responses', 'OpenAI Responses API'))}</option><option value="chat" ${select('chat')}>${this.escape(this.label('provider.protocol.chat', 'OpenAI Chat Completions'))}</option></select></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.timeout', 'Request timeout'))}</span><input id="openai-provider-timeout" type="number" min="${YAW_OPENAI_COMPATIBLE_PROVIDER.MIN_TIMEOUT_MS}" max="${YAW_OPENAI_COMPATIBLE_PROVIDER.MAX_TIMEOUT_MS}" step="1000" value="${this.escape(metadata.timeoutMs || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_TIMEOUT_MS)}"><small>${this.escape(this.label('provider.timeoutHelp', 'Maximum wait per request in milliseconds. The 30-second default gives reasoning-heavy models time to finish.'))}</small></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.maxCompletionTokens', 'Completion-token ceiling'))}</span><input id="openai-provider-max-completion-tokens" type="number" min="${YAW_OPENAI_COMPATIBLE_PROVIDER.MIN_MAX_COMPLETION_TOKENS}" max="${YAW_OPENAI_COMPATIBLE_PROVIDER.MAX_MAX_COMPLETION_TOKENS}" step="64" value="${this.escape(metadata.maxCompletionTokens || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_MAX_COMPLETION_TOKENS)}" required><small>${this.escape(this.label('provider.maxCompletionTokensHelp', 'Maximum completion tokens per request, including hidden reasoning. New profiles default to 8,192; high reasoning may need 16,384 or more.'))}</small></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.reasoningEffort', 'Reasoning effort'))}</span><select id="openai-provider-reasoning-effort"><option value="provider" ${reasoningSelected('provider')}>${this.escape(this.label('provider.reasoning.provider', 'Provider managed'))}</option><option value="none" ${reasoningSelected('none')}>${this.escape(this.label('provider.reasoning.none', 'None'))}</option><option value="minimal" ${reasoningSelected('minimal')}>${this.escape(this.label('provider.reasoning.minimal', 'Minimal'))}</option><option value="low" ${reasoningSelected('low')}>${this.escape(this.label('provider.reasoning.low', 'Low'))}</option><option value="medium" ${reasoningSelected('medium')}>${this.escape(this.label('provider.reasoning.medium', 'Medium'))}</option><option value="high" ${reasoningSelected('high')}>${this.escape(this.label('provider.reasoning.high', 'High'))}</option></select><small>${this.escape(this.label('provider.reasoningHelp', 'Provider managed omits the parameter. Higher reasoning may require a much larger completion-token ceiling.'))}</small></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.organization', 'Organization header'))}</span><input id="openai-provider-organization" type="text" maxlength="160" value="${this.escape(metadata.organization || '')}"></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.project', 'Project header'))}</span><input id="openai-provider-project" type="text" maxlength="160" value="${this.escape(metadata.project || '')}"></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.temperature', 'Temperature'))}</span><input id="openai-provider-temperature" type="number" min="0" max="2" step="0.1" value="${metadata.temperature ?? ''}" placeholder="${this.escape(this.label('provider.unspecified', 'Unspecified'))}"><small>${this.escape(this.label('provider.temperatureHelp', 'Sent only when specified.'))}</small></label>
                </div>
                ${profile?.connected && !localOnly ? `<label class="provider-replace-credential"><input id="openai-provider-replace-credential" type="checkbox" onchange="AIProviderUI.toggleCredentialReplacement(this.checked)"><span><strong>${this.escape(this.label('provider.replaceCredential', 'Replace session credential and headers'))}</strong><small>${this.escape(this.label('provider.replaceCredentialHelp', 'Re-enter every secret value. Saving without this option keeps the current session credential unchanged.'))}</small></span></label>` : ''}
                <fieldset id="openai-provider-credential-fields" class="provider-headers" ${localOnly || !replacingCredential ? 'disabled' : ''}><legend>${this.escape(this.label('provider.additionalHeaders', 'Additional session headers'))}</legend><small>${this.escape(this.label('provider.additionalHeadersHelp', 'Values are session-only. Authorization and transport-controlled headers cannot be overridden.'))}</small><div id="openai-provider-header-rows">${this.renderHeaderRows(profile)}</div><button class="nav-btn" type="button" onclick="AIProviderUI.addHeaderRow()">${this.escape(this.label('provider.addHeader', 'Add Header'))}</button></fieldset>
                <p class="provider-disclosure">${this.escape(localOnly ? this.label('provider.fileOriginDisclosure', 'File mode permits only unauthenticated loopback endpoints. Ollama supports OpenAI-compatible requests at http://localhost:11434/v1.') : this.label('provider.browserDirectDisclosure', 'Browser-direct requests send the credential only to the exact endpoint origin you approved and require compatible CORS behavior. Redirects are blocked.'))}</p>
                <div class="provider-actions"><button class="nav-btn primary" type="submit" ${this.busy ? 'disabled' : ''}>${this.escape(profile?.connected ? this.label('provider.save', 'Save') : this.label('provider.connect', 'Connect'))}</button><button class="nav-btn" type="button" onclick="AIProviderUI.closeEditor()" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('ui.cancel', 'Cancel'))}</button></div>
            </form>`;
    },

    renderOpenAI(provider, profiles) {
        const editing = this.editingProfileId === 'new'
            ? null
            : profiles.find(profile => profile.id === this.editingProfileId) || null;
        const editor = this.editingProfileId ? this.renderOpenAIEditor(editing) : '';
        const fileOrigin = typeof App !== 'undefined' && App.isFileOrigin();
        const override = YAW_OPENAI_COMPATIBLE_PROVIDER.fileOriginRemoteOverrideEnabled();
        const localOnly = fileOrigin && !override;
        return `
            <section class="provider-service" aria-labelledby="provider-openai-title">
                <div class="provider-service-heading">
                    <div><div class="provider-service-title"><h2 id="provider-openai-title">${this.escape(provider.name)}</h2><span class="provider-tier-badge" data-tier="recommended">${this.escape(this.label('provider.recommended', 'Recommended'))}</span></div><p>${this.escape(this.label('provider.openai.description', 'Connect OpenAI or another compatible service through the recommended provider path.'))}</p></div>
                    <div class="provider-capabilities">${this.capabilityBadges(provider.capabilities)}</div>
                </div>
                ${fileOrigin ? `<label class="provider-replace-credential"><input id="openai-provider-file-origin-override" type="checkbox" ${override ? 'checked' : ''} onchange="AIProviderUI.toggleFileOriginRemoteOverride(this.checked)"><span><strong>${this.escape(this.label('provider.fileOriginOverride', 'Allow remote endpoint attempts for this session'))}</strong><small>${this.escape(this.label('provider.fileOriginOverrideHelp', 'Advanced: the page has an opaque null origin. Credentials and this override are never persisted; browser TLS and CORS rules still apply.'))}</small></span></label>` : ''}
                ${profiles.map(profile => this.renderOpenAIProfile(profile)).join('')}
                ${profiles.length || editor ? '' : `<p class="provider-empty">${this.escape(this.label('provider.openai.empty', 'No OpenAI-compatible connections saved.'))}</p>`}
                ${editor}
                ${this.editingProfileId ? '' : `<button class="nav-btn primary" type="button" onclick="AIProviderUI.openEditor('new')">${this.escape(localOnly ? this.label('provider.addLocalConnection', 'Add Local Connection') : this.label('provider.addConnection', 'Add Connection'))}</button>`}
            </section>`;
    },

    refresh() {
        const container = document.getElementById('ai-provider-list');
        if (!container) return false;
        const providers = YAW_AI_PROVIDER_MANAGER.listProviders();
        const profiles = YAW_AI_PROVIDER_MANAGER.listProfiles();
        const localOnly = typeof App !== 'undefined' && App.isFileOrigin() && !YAW_OPENAI_COMPATIBLE_PROVIDER.fileOriginRemoteOverrideEnabled();
        const visibleProviders = localOnly
            ? providers.filter(provider => provider.id === YAW_OPENAI_COMPATIBLE_PROVIDER.PROVIDER_ID)
            : providers;
        visibleProviders.sort((left, right) => {
            const rank = provider => provider.id === YAW_OPENAI_COMPATIBLE_PROVIDER.PROVIDER_ID
                ? 0
                : (provider.id === YAW_PUTER_PROVIDER.PROVIDER_ID ? 2 : 1);
            return rank(left) - rank(right) || left.name.localeCompare(right.name);
        });
        container.innerHTML = visibleProviders.map(provider => {
            const ownedProfiles = profiles
                .filter(profile => profile.providerId === provider.id)
                .filter(profile => !localOnly || YAW_OPENAI_COMPATIBLE_PROVIDER.isLoopbackEndpoint(profile.metadata?.endpoint));
            if (provider.id === YAW_PUTER_PROVIDER.PROVIDER_ID) return this.renderPuter(provider, ownedProfiles);
            if (provider.id === YAW_OPENAI_COMPATIBLE_PROVIDER.PROVIDER_ID) return this.renderOpenAI(provider, ownedProfiles);
            return `<section class="provider-service"><div class="provider-service-heading"><div><h2>${this.escape(provider.name)}</h2><p>${this.escape(provider.description)}</p></div><div class="provider-capabilities">${this.capabilityBadges(provider.capabilities)}</div></div></section>`;
        }).join('');
        const status = document.getElementById('ai-provider-status');
        if (status) {
            status.textContent = this.message || (localOnly
                ? this.label('provider.fileOriginLocalOnly', 'File mode supports local loopback providers such as Ollama; remote and credentialed providers are unavailable.')
                : '');
            status.dataset.kind = this.message ? this.messageKind : 'info';
        }
        return true;
    },

    show() {
        return App.showAIProviderScreen();
    },

    openEditor(profileId = 'new') {
        this.editingProfileId = String(profileId || 'new');
        this.setMessage();
        this.refresh();
    },

    closeEditor() {
        this.editingProfileId = '';
        this.refresh();
    },

    addHeaderRow() {
        document.getElementById('openai-provider-header-rows')?.insertAdjacentHTML('beforeend', this.headerRow());
    },

    toggleCredentialReplacement(enabled) {
        const key = document.getElementById('openai-provider-key');
        const fields = document.getElementById('openai-provider-credential-fields');
        if (key) key.disabled = !enabled;
        if (fields) fields.disabled = !enabled;
        if (enabled) key?.focus();
    },

    toggleFileOriginRemoteOverride(enabled) {
        YAW_OPENAI_COMPATIBLE_PROVIDER.setFileOriginRemoteOverride(enabled === true);
        this.editingProfileId = '';
        this.setMessage(enabled
            ? this.label('provider.fileOriginOverrideEnabled', 'Remote endpoint attempts are enabled for this page session. Browser TLS and CORS enforcement still applies.')
            : this.label('provider.fileOriginLocalOnly', 'File mode supports local loopback providers such as Ollama; remote and credentialed providers are unavailable.'), enabled ? 'warning' : 'info');
        this.refresh();
        return enabled === true;
    },

    readHeaders() {
        return [...document.querySelectorAll('#openai-provider-header-rows .provider-header-row')]
            .map(row => ({
                name: row.querySelector('.provider-header-name')?.value || '',
                value: row.querySelector('.provider-header-value')?.value || ''
            }))
            .filter(header => header.name || header.value);
    },

    readOpenAIForm(id = '') {
        const replaceControl = document.getElementById('openai-provider-replace-credential');
        const localOnly = typeof App !== 'undefined' && App.isFileOrigin() && !YAW_OPENAI_COMPATIBLE_PROVIDER.fileOriginRemoteOverrideEnabled();
        const replacingCredential = localOnly || !replaceControl || replaceControl.checked === true;
        return {
            id: id || undefined,
            name: document.getElementById('openai-provider-name')?.value || '',
            endpoint: document.getElementById('openai-provider-endpoint')?.value || '',
            apiKey: localOnly ? '' : (replacingCredential ? (document.getElementById('openai-provider-key')?.value || '') : ''),
            model: document.getElementById('openai-provider-model')?.value || '',
            protocol: document.getElementById('openai-provider-protocol')?.value || 'auto',
            organization: document.getElementById('openai-provider-organization')?.value || '',
            project: document.getElementById('openai-provider-project')?.value || '',
            timeoutMs: document.getElementById('openai-provider-timeout')?.value || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_TIMEOUT_MS,
            maxCompletionTokens: document.getElementById('openai-provider-max-completion-tokens')?.value || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_MAX_COMPLETION_TOKENS,
            reasoningEffort: document.getElementById('openai-provider-reasoning-effort')?.value || 'provider',
            temperature: document.getElementById('openai-provider-temperature')?.value || '',
            replaceCredential: localOnly || replaceControl?.checked === true,
            additionalHeaders: localOnly ? [] : (replacingCredential ? this.readHeaders() : [])
        };
    },

    async runPuter(action) {
        if (this.busy) return false;
        if (typeof App !== 'undefined' && App.isFileOrigin()) {
            this.setMessage(this.label('provider.fileOriginLocalOnly', 'File mode supports local loopback providers such as Ollama; remote and credentialed providers are unavailable.'), 'error');
            this.refresh();
            return false;
        }
        const model = document.getElementById('provider-puter-model')?.value || '';
        this.busy = true;
        this.setMessage(this.label('provider.working', 'Working...'));
        this.refresh();
        try {
            if (action === 'connect') await YAW_PUTER_PROVIDER.connect(model);
            if (action === 'test') await YAW_PUTER_PROVIDER.test();
            if (action === 'disconnect') YAW_PUTER_PROVIDER.disconnect();
            this.setMessage(action === 'test'
                ? this.label('provider.testPassed', 'Connection test passed.')
                : this.label('provider.updated', 'Provider connection updated.'), 'success');
            this.busy = false;
            this.refresh();
            return true;
        } catch (error) {
            this.busy = false;
            this.logError(error, action, 'Puter');
            this.setMessage(this.errorMessage(error), 'error');
            this.refresh();
            return false;
        }
    },

    async runOpenAI(action, profileId = '') {
        if (this.busy) return false;
        if (action === 'remove' && !confirm(this.label('provider.confirmRemove', 'Remove this provider connection profile?'))) return false;
        const formInput = action === 'save' ? this.readOpenAIForm(profileId) : null;
        this.busy = true;
        this.setMessage(this.label('provider.working', 'Working...'));
        this.refresh();
        try {
            if (action === 'save') {
                const profile = YAW_OPENAI_COMPATIBLE_PROVIDER.connect(formInput);
                this.editingProfileId = '';
                this.setMessage(this.label('provider.savedSession', 'Connection metadata was saved and the session credential is active.'), 'success');
                profileId = profile.id;
            } else if (action === 'test') {
                const result = await YAW_OPENAI_COMPATIBLE_PROVIDER.test(profileId);
                this.setMessage(this.label('provider.testDetail', 'Connected using {protocol}. Endpoint, authentication, and model were accepted. Request URL: {url}', {
                    protocol: result.test.protocol,
                    url: result.test.endpoint
                }), 'success');
            } else if (action === 'disconnect') {
                YAW_OPENAI_COMPATIBLE_PROVIDER.clearCredential(profileId);
                this.setMessage(this.label('provider.credentialCleared', 'Session credential cleared. Saved non-secret metadata remains.'), 'success');
            } else if (action === 'remove') {
                YAW_OPENAI_COMPATIBLE_PROVIDER.remove(profileId);
                if (this.editingProfileId === profileId) this.editingProfileId = '';
                this.setMessage(this.label('provider.removed', 'Provider connection removed.'), 'success');
            }
            this.busy = false;
            this.refresh();
            if (typeof ModUI !== 'undefined') ModUI.refreshModList();
            return true;
        } catch (error) {
            this.busy = false;
            this.logError(error, action, 'OpenAI-compatible API');
            this.setMessage(this.errorMessage(error), 'error');
            this.refresh();
            return false;
        }
    }
};

if (typeof window !== 'undefined') window.AIProviderUI = AIProviderUI;
