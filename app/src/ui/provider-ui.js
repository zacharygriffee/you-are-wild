/**
 * AI Provider management surface.
 */

const AIProviderUI = {
    busy: false,
    editingProfileId: '',
    editorReturnFocus: null,
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
            auth_window_closed: this.label('provider.puter.authCancelled', 'Puter sign-in was cancelled.'),
            insecure_storage: this.label('provider.error.insecureStorage', 'Secure credential storage is unavailable. Use this credential for the session only, configure a compatible Linux keyring, or use a credential-free local endpoint.'),
            authentication_required: this.label('managed.error.authentication', 'Sign in to use managed narration.'),
            content_access_required: this.label('managed.error.contentAccess', 'Confirm account content access before using managed Mature narration.'),
            entitlement_required: this.label('managed.error.entitlement', 'An active premium entitlement is required.'),
            allowance_exhausted: this.label('managed.error.allowance', 'The managed narration allowance is exhausted for this period.'),
            model_unavailable: this.label('managed.error.model', 'The selected managed narration model is unavailable.'),
            provider_timeout: this.label('managed.error.timeout', 'The managed narration provider timed out.'),
            provider_rejected: this.label('managed.error.provider', 'The managed narration provider rejected this request.'),
            service_unavailable: this.label('managed.error.service', 'The managed narration service is temporarily unavailable.')
        };
        const message = messages[code] || this.label('provider.error.generic', 'The provider operation failed. Check the connection details and try again.');
        const diagnostic = this.label(
            'provider.error.diagnostic',
            'Diagnostic: {code}{status}.',
            { code: code.slice(0, 80), status: status ? `; HTTP ${status}` : '' }
        );
        return `${message} ${diagnostic}`;
    },

    renderManaged(provider) {
        const snapshot = YAW_MANAGED_SERVICE.snapshot();
        const account = snapshot.account || { authenticated: false };
        if (!account.authenticated) {
            return `
                <section class="provider-service" aria-labelledby="provider-managed-title">
                    <div class="provider-service-heading">
                        <div><div class="provider-service-title"><h2 id="provider-managed-title">${this.escape(provider.name)}</h2><span class="provider-tier-badge" data-tier="recommended">${this.escape(this.label('managed.premium', 'Premium'))}</span></div><p>${this.escape(provider.description)}</p></div>
                        <div class="provider-capabilities">${this.capabilityBadges(provider.capabilities)}</div>
                    </div>
                    <div class="provider-connection-card">
                        <strong>${this.escape(this.label('managed.signInTitle', 'Sign in with a one-time email link'))}</strong>
                        <p>${this.escape(this.label('managed.signInHelp', 'Your account controls entitlement and allowance. Provider credentials remain on the server.'))}</p>
                        <label class="provider-field"><span>${this.escape(this.label('managed.email', 'Email'))}</span><input id="managed-service-email" type="email" maxlength="254" autocomplete="email"></label>
                        <div class="provider-actions"><button class="nav-btn primary" type="button" onclick="AIProviderUI.runManaged('sign-in')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('managed.sendLink', 'Send sign-in link'))}</button></div>
                    </div>
                </section>`;
        }
        const entitlement = account.entitlement || {};
        const allowance = account.allowance || {};
        const access = account.account?.contentAccess || {};
        const active = ['active', 'canceled'].includes(entitlement.status);
        const mature = access.ratings?.includes('mature');
        return `
            <section class="provider-service" aria-labelledby="provider-managed-title">
                <div class="provider-service-heading">
                    <div><div class="provider-service-title"><h2 id="provider-managed-title">${this.escape(provider.name)}</h2><span class="provider-tier-badge" data-tier="${active ? 'recommended' : 'unverified'}">${this.escape(active ? this.label('managed.active', 'Active') : this.label('managed.inactive', 'Inactive'))}</span></div><p>${this.escape(provider.description)}</p></div>
                    <div class="provider-capabilities">${this.capabilityBadges(provider.capabilities)}</div>
                </div>
                <div class="provider-connection-card">
                    <div class="provider-connection-summary"><strong>${this.escape(account.account?.displayName || this.label('managed.account', 'Account'))}</strong><span class="provider-state" data-connected="${active ? 'true' : 'false'}">${this.escape(entitlement.status || 'inactive')}</span></div>
                    <dl class="provider-metadata">
                        <div><dt>${this.escape(this.label('managed.allowance', 'Monthly allowance'))}</dt><dd>${this.escape(`${allowance.remaining ?? 0} / ${allowance.limit ?? 0} remaining`)}</dd></div>
                        <div><dt>${this.escape(this.label('managed.contentAccess', 'Managed Mature access'))}</dt><dd>${this.escape(mature ? this.label('managed.confirmed', 'Confirmed') : this.label('managed.notConfirmed', 'Not confirmed'))}</dd></div>
                    </dl>
                    <p class="provider-disclosure">${this.escape(this.label('managed.custody', 'The game and mods receive only this opaque connection, narration text, and sanitized usage. They never receive the service provider key.'))}</p>
                    <div class="provider-actions">
                        ${mature ? '' : `<button class="nav-btn" type="button" onclick="AIProviderUI.runManaged('confirm-content')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('managed.confirmContent', 'Confirm Mature account access'))}</button>`}
                        ${active ? '' : `<button class="nav-btn primary" type="button" onclick="AIProviderUI.runManaged('subscribe')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('managed.subscribe', 'View subscription options'))}</button>`}
                        <button class="nav-btn" type="button" onclick="AIProviderUI.runManaged('refresh')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('managed.refresh', 'Refresh account'))}</button>
                        <button class="nav-btn" type="button" onclick="AIProviderUI.runManaged('account')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('managed.manageAccount', 'Manage account'))}</button>
                        <button class="nav-btn" type="button" onclick="AIProviderUI.runManaged('logout')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('managed.signOut', 'Sign out'))}</button>
                    </div>
                </div>
            </section>`;
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
        const profileId = this.escape(profile.id);
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
                    <button class="nav-btn" type="button" data-command-surface="ai-providers" data-command-mode="system" data-command-control="edit-provider-connection" data-provider-profile-id="${profileId}" onclick="AIProviderUI.openEditor('${id}')" ${this.busy ? 'disabled' : ''}>${this.escape(profile.connected ? this.label('provider.edit', 'Edit') : this.label('provider.reconnect', 'Reconnect'))}</button>
                    <button class="nav-btn" type="button" onclick="AIProviderUI.runOpenAI('test','${id}')" ${!profile.connected || this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.test', 'Test'))}</button>
                    <button class="nav-btn" type="button" onclick="AIProviderUI.runOpenAI('disconnect','${id}')" ${!profile.connected || this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.clearCredential', 'Clear Credential'))}</button>
                    <button class="nav-btn danger" type="button" onclick="AIProviderUI.runOpenAI('remove','${id}')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.remove', 'Remove'))}</button>
                </div>
            </article>`;
    },

    renderNativeProfile(profile) {
        const metadata = profile.metadata || {};
        const id = this.escape(this.js(profile.id));
        const profileId = this.escape(profile.id);
        const state = metadata.credentialPresent
            ? (metadata.secureStorage
                ? this.label('provider.state.securelyRemembered', 'Credential remembered securely')
                : this.label('provider.state.connected', 'Connected for this session'))
            : this.label('provider.state.reenter', 'Credential required');
        return `
            <article class="provider-connection-card">
                <div class="provider-connection-summary">
                    <div><strong>${this.escape(profile.name)}</strong><small>${this.escape(metadata.model || '')}</small></div>
                    <span class="provider-state" data-connected="${profile.connected ? 'true' : 'false'}">${this.escape(state)}</span>
                </div>
                <dl class="provider-metadata">
                    <div><dt>${this.escape(this.label('provider.endpoint', 'Endpoint'))}</dt><dd>${this.escape(metadata.endpoint || '')}</dd></div>
                    <div><dt>${this.escape(this.label('provider.protocol', 'Protocol'))}</dt><dd>${this.escape(metadata.protocol || 'auto')}</dd></div>
                </dl>
                <div class="provider-actions" role="group" aria-label="${this.escape(this.label('provider.connectionActions', 'Connection actions'))}">
                    <button class="nav-btn" type="button" data-command-surface="ai-providers" data-command-mode="system" data-command-control="edit-provider-connection" data-provider-profile-id="${profileId}" onclick="AIProviderUI.openEditor('${id}')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.edit', 'Edit'))}</button>
                    <button class="nav-btn" type="button" onclick="AIProviderUI.runOpenAI('credential','${id}')" ${this.busy ? 'disabled' : ''}>${this.escape(metadata.credentialPresent ? this.label('provider.replaceCredential', 'Replace Credential') : this.label('provider.setCredential', 'Set Credential'))}</button>
                    <button class="nav-btn" type="button" onclick="AIProviderUI.runOpenAI('test','${id}')" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.test', 'Test'))}</button>
                    <button class="nav-btn" type="button" onclick="AIProviderUI.runOpenAI('disconnect','${id}')" ${!metadata.credentialPresent || this.busy ? 'disabled' : ''}>${this.escape(this.label('provider.clearCredential', 'Clear Credential'))}</button>
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
        const nativeHost = typeof YAW_HOST !== 'undefined' && YAW_HOST.capabilities().native === true;
        const fileOrigin = typeof App !== 'undefined' && App.isFileOrigin() && !nativeHost;
        const select = value => metadata.protocol === value ? 'selected' : '';
        const reasoningSelected = value => (metadata.reasoningEffort || 'provider') === value ? 'selected' : '';
        const replacingCredential = !profile?.connected;
        const endpoint = metadata.endpoint || 'https://api.openai.com/v1';
        const credentialEditor = nativeHost
            ? `<div class="provider-disclosure"><strong>${this.escape(this.label('provider.trustedCredentialTitle', 'Credential entry is isolated'))}</strong><br>${this.escape(this.label('provider.trustedCredentialHelp', 'Credential entry and replacement use a separate trusted desktop window that does not load the game or executable modules. The API key never enters this renderer.'))}</div>`
            : `<label class="provider-field"><span>${this.escape(this.label('provider.apiKey', 'API key'))}</span><input id="openai-provider-key" type="password" maxlength="500" value="" autocomplete="new-password" placeholder="${this.escape(profile?.connected ? this.label('provider.keepCredential', 'Current credential remains active') : this.label('provider.noAuthAllowed', 'Optional for no-auth local endpoints'))}" ${!replacingCredential ? 'disabled' : ''}><small>${this.escape(this.label('provider.apiKeyHelp', 'Held only in memory for this browser session.'))}</small></label>`;
        const credentialControls = nativeHost
            ? ''
            : `${profile?.connected ? `<label class="provider-replace-credential"><input id="openai-provider-replace-credential" type="checkbox" onchange="AIProviderUI.toggleCredentialReplacement(this.checked)"><span><strong>${this.escape(this.label('provider.replaceCredential', 'Replace session credential and headers'))}</strong><small>${this.escape(this.label('provider.replaceCredentialHelp', 'Re-enter every secret value. Saving without this option keeps the current session credential unchanged.'))}</small></span></label>` : ''}
                <fieldset id="openai-provider-credential-fields" class="provider-headers" ${!replacingCredential ? 'disabled' : ''}><legend>${this.escape(this.label('provider.additionalHeaders', 'Additional session headers'))}</legend><small>${this.escape(this.label('provider.additionalHeadersHelp', 'Values are session-only. Authorization and transport-controlled headers cannot be overridden.'))}</small><div id="openai-provider-header-rows">${this.renderHeaderRows(profile)}</div><button class="nav-btn" type="button" onclick="AIProviderUI.addHeaderRow()">${this.escape(this.label('provider.addHeader', 'Add Header'))}</button></fieldset>`;
        const disclosure = nativeHost
            ? this.label('provider.nativeTrustedDisclosure', 'Only non-secret profile metadata is handled here. Credential persistence and provider authentication remain inside the trusted desktop host.')
            : (fileOrigin
                ? this.label('provider.fileOriginWarning', 'File mode uses an opaque browser origin. Remote REST endpoints remain available, but each provider may accept or reject requests through CORS. Credentials remain session-only.')
                : this.label('provider.browserDirectDisclosure', 'Browser-direct requests send the credential only to the exact endpoint origin you approved and require compatible CORS behavior. Redirects are blocked.'));
        const title = profile
            ? this.label('provider.editor.editTitle', 'Edit provider connection')
            : this.label('provider.editor.addTitle', 'Add provider connection');
        return `
            <form id="openai-provider-form" class="provider-editor" aria-labelledby="openai-provider-editor-title" onsubmit="event.preventDefault(); AIProviderUI.runOpenAI('save','${this.escape(this.js(profile?.id || ''))}')">
                <h3 id="openai-provider-editor-title">${this.escape(title)}</h3>
                <div class="provider-form-grid">
                    <label class="provider-field"><span>${this.escape(this.label('provider.connectionName', 'Connection name'))}</span><input id="openai-provider-name" type="text" maxlength="120" value="${this.escape(profile?.name || this.label('provider.openai.defaultName', 'OpenAI-Compatible API'))}" required></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.endpoint', 'API endpoint'))}</span><input id="openai-provider-endpoint" type="url" maxlength="500" value="${this.escape(endpoint)}" required><small>${this.escape(this.label('provider.endpointHelp', 'Base URL. Authenticated endpoints require HTTPS; loopback HTTP is strictly no-auth.'))}</small></label>
                    ${credentialEditor}
                    <label class="provider-field"><span>${this.escape(this.label('provider.model', 'Model'))}</span><input id="openai-provider-model" type="text" maxlength="200" value="${this.escape(metadata.model || '')}" placeholder="gpt-5-mini or openai/gpt-*" required></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.protocol', 'API protocol'))}</span><select id="openai-provider-protocol"><option value="auto" ${select('auto')}>${this.escape(this.label('provider.protocol.auto', 'Auto-detect'))}</option><option value="responses" ${select('responses')}>${this.escape(this.label('provider.protocol.responses', 'OpenAI Responses API'))}</option><option value="chat" ${select('chat')}>${this.escape(this.label('provider.protocol.chat', 'OpenAI Chat Completions'))}</option></select></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.timeout', 'Request timeout'))}</span><input id="openai-provider-timeout" type="number" min="${YAW_OPENAI_COMPATIBLE_PROVIDER.MIN_TIMEOUT_MS}" max="${YAW_OPENAI_COMPATIBLE_PROVIDER.MAX_TIMEOUT_MS}" step="1000" value="${this.escape(metadata.timeoutMs || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_TIMEOUT_MS)}"><small>${this.escape(this.label('provider.timeoutHelp', 'Maximum wait per request in milliseconds. The 30-second default gives reasoning-heavy models time to finish.'))}</small></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.maxCompletionTokens', 'Completion-token ceiling'))}</span><input id="openai-provider-max-completion-tokens" type="number" min="${YAW_OPENAI_COMPATIBLE_PROVIDER.MIN_MAX_COMPLETION_TOKENS}" max="${YAW_OPENAI_COMPATIBLE_PROVIDER.MAX_MAX_COMPLETION_TOKENS}" step="64" value="${this.escape(metadata.maxCompletionTokens || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_MAX_COMPLETION_TOKENS)}" required><small>${this.escape(this.label('provider.maxCompletionTokensHelp', 'Maximum completion tokens per request, including hidden reasoning. New profiles default to 8,192; high reasoning may need 16,384 or more.'))}</small></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.reasoningEffort', 'Reasoning effort'))}</span><select id="openai-provider-reasoning-effort"><option value="provider" ${reasoningSelected('provider')}>${this.escape(this.label('provider.reasoning.provider', 'Provider managed'))}</option><option value="none" ${reasoningSelected('none')}>${this.escape(this.label('provider.reasoning.none', 'None'))}</option><option value="minimal" ${reasoningSelected('minimal')}>${this.escape(this.label('provider.reasoning.minimal', 'Minimal'))}</option><option value="low" ${reasoningSelected('low')}>${this.escape(this.label('provider.reasoning.low', 'Low'))}</option><option value="medium" ${reasoningSelected('medium')}>${this.escape(this.label('provider.reasoning.medium', 'Medium'))}</option><option value="high" ${reasoningSelected('high')}>${this.escape(this.label('provider.reasoning.high', 'High'))}</option></select><small>${this.escape(this.label('provider.reasoningHelp', 'Provider managed omits the parameter. Higher reasoning may require a much larger completion-token ceiling.'))}</small></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.organization', 'Organization header'))}</span><input id="openai-provider-organization" type="text" maxlength="160" value="${this.escape(metadata.organization || '')}"></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.project', 'Project header'))}</span><input id="openai-provider-project" type="text" maxlength="160" value="${this.escape(metadata.project || '')}"></label>
                    <label class="provider-field"><span>${this.escape(this.label('provider.temperature', 'Temperature'))}</span><input id="openai-provider-temperature" type="number" min="0" max="2" step="0.1" value="${metadata.temperature ?? ''}" placeholder="${this.escape(this.label('provider.unspecified', 'Unspecified'))}"><small>${this.escape(this.label('provider.temperatureHelp', 'Sent only when specified.'))}</small></label>
                </div>
                ${credentialControls}
                <p class="provider-disclosure">${this.escape(disclosure)}</p>
                <div class="provider-actions"><button class="nav-btn primary" type="submit" ${this.busy ? 'disabled' : ''}>${this.escape(profile?.connected ? this.label('provider.save', 'Save') : this.label('provider.connect', 'Connect'))}</button><button class="nav-btn" type="button" data-command-surface="ai-providers" data-command-mode="system" data-command-control="cancel-provider-editor" data-command-slot="exit" onclick="AIProviderUI.closeEditor()" ${this.busy ? 'disabled' : ''}>${this.escape(this.label('ui.cancel', 'Cancel'))}</button></div>
            </form>`;
    },

    renderOpenAI(provider, profiles) {
        const editing = this.editingProfileId === 'new'
            ? null
            : profiles.find(profile => profile.id === this.editingProfileId) || null;
        const editorOpen = this.editingProfileId === 'new' || Boolean(editing);
        const editor = editorOpen ? this.renderOpenAIEditor(editing) : '';
        const nativeHost = typeof YAW_HOST !== 'undefined' && YAW_HOST.capabilities().native === true;
        const fileOrigin = typeof App !== 'undefined' && App.isFileOrigin() && !nativeHost;
        return `
            <section class="provider-service" aria-labelledby="provider-openai-title">
                <div class="provider-service-heading">
                    <div><div class="provider-service-title"><h2 id="provider-openai-title">${this.escape(provider.name)}</h2><span class="provider-tier-badge" data-tier="recommended">${this.escape(this.label('provider.recommended', 'Recommended'))}</span></div><p>${this.escape(this.label('provider.openai.description', 'Connect OpenAI or another compatible service through the recommended provider path.'))}</p></div>
                    <div class="provider-capabilities">${this.capabilityBadges(provider.capabilities)}</div>
                </div>
                ${fileOrigin ? `<p class="provider-disclosure">${this.escape(this.label('provider.fileOriginWarning', 'File mode uses an opaque browser origin. Remote REST endpoints remain available, but each provider may accept or reject requests through CORS. Credentials remain session-only.'))}</p>` : ''}
                ${profiles.map(profile => this.renderOpenAIProfile(profile)).join('')}
                ${profiles.length || editor ? '' : `<p class="provider-empty">${this.escape(this.label('provider.openai.empty', 'No OpenAI-compatible connections saved.'))}</p>`}
                ${editor}
                ${editorOpen ? '' : `<button class="nav-btn primary" type="button" data-command-surface="ai-providers" data-command-mode="system" data-command-control="add-provider-connection" onclick="AIProviderUI.openEditor('new')">${this.escape(this.label('provider.addConnection', 'Add Connection'))}</button>`}
            </section>`;
    },

    refresh() {
        const container = document.getElementById('ai-provider-list');
        if (!container) return false;
        const providers = YAW_AI_PROVIDER_MANAGER.listProviders();
        const profiles = YAW_AI_PROVIDER_MANAGER.listProfiles();
        const visibleProviders = providers;
        visibleProviders.sort((left, right) => {
            const rank = provider => typeof YAW_MANAGED_SERVICE !== 'undefined' && provider.id === YAW_MANAGED_SERVICE.PROVIDER_ID
                ? 0
                : (provider.id === YAW_OPENAI_COMPATIBLE_PROVIDER.PROVIDER_ID
                    ? 1
                    : (provider.id === YAW_PUTER_PROVIDER.PROVIDER_ID ? 3 : 2));
            return rank(left) - rank(right) || left.name.localeCompare(right.name);
        });
        container.innerHTML = visibleProviders.map(provider => {
            const ownedProfiles = profiles.filter(profile => profile.providerId === provider.id);
            if (typeof YAW_MANAGED_SERVICE !== 'undefined' && provider.id === YAW_MANAGED_SERVICE.PROVIDER_ID) return this.renderManaged(provider);
            if (provider.id === YAW_PUTER_PROVIDER.PROVIDER_ID) return this.renderPuter(provider, ownedProfiles);
            if (provider.id === YAW_OPENAI_COMPATIBLE_PROVIDER.PROVIDER_ID) return this.renderOpenAI(provider, ownedProfiles);
            if (typeof YAW_HOST !== 'undefined' && provider.id === YAW_HOST.NATIVE_PROVIDER_ID) {
                const editing = ownedProfiles.find(profile => profile.id === this.editingProfileId) || null;
                return `<section class="provider-service"><div class="provider-service-heading"><div><h2>${this.escape(provider.name)}</h2><p>${this.escape(provider.description)}</p></div><div class="provider-capabilities">${this.capabilityBadges(provider.capabilities)}</div></div>${ownedProfiles.map(profile => this.renderNativeProfile(profile)).join('')}${editing ? this.renderOpenAIEditor(editing) : ''}</section>`;
            }
            return `<section class="provider-service"><div class="provider-service-heading"><div><h2>${this.escape(provider.name)}</h2><p>${this.escape(provider.description)}</p></div><div class="provider-capabilities">${this.capabilityBadges(provider.capabilities)}</div></div></section>`;
        }).join('');
        const status = document.getElementById('ai-provider-status');
        if (status) {
            status.textContent = this.message || '';
            status.dataset.kind = this.message ? this.messageKind : 'info';
        }
        return true;
    },

    show() {
        return App.showAIProviderScreen();
    },

    captureEditorReturnFocus(profileId = 'new') {
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        this.editorReturnFocus = {
            element: active && active !== document.body ? active : null,
            control: active?.dataset?.commandControl || (profileId === 'new' ? 'add-provider-connection' : 'edit-provider-connection'),
            profileId: profileId === 'new' ? '' : String(profileId || '')
        };
        return this.editorReturnFocus;
    },

    focusEditor() {
        const field = document.getElementById('openai-provider-name');
        field?.focus();
        return document.activeElement === field;
    },

    restoreEditorFocus() {
        const returnFocus = this.editorReturnFocus;
        this.editorReturnFocus = null;
        let target = returnFocus?.element;
        if (!target?.isConnected) {
            const controls = [...document.querySelectorAll('[data-command-control]')];
            target = controls.find(control => control.dataset.commandControl === returnFocus?.control
                && (!returnFocus?.profileId || control.dataset.providerProfileId === returnFocus.profileId));
        }
        if (!target) {
            target = document.querySelector('[data-command-control="add-provider-connection"]');
        }
        target?.focus();
        return document.activeElement === target;
    },

    openEditor(profileId = 'new') {
        const nextProfileId = String(profileId || 'new');
        this.captureEditorReturnFocus(nextProfileId);
        this.editingProfileId = nextProfileId;
        this.setMessage();
        this.refresh();
        this.focusEditor();
    },

    closeEditor() {
        this.editingProfileId = '';
        this.refresh();
        this.restoreEditorFocus();
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

    readHeaders() {
        return [...document.querySelectorAll('#openai-provider-header-rows .provider-header-row')]
            .map(row => ({
                name: row.querySelector('.provider-header-name')?.value || '',
                value: row.querySelector('.provider-header-value')?.value || ''
            }))
            .filter(header => header.name || header.value);
    },

    readOpenAIForm(id = '') {
        const nativeHost = typeof YAW_HOST !== 'undefined' && YAW_HOST.capabilities().native === true;
        const replaceControl = document.getElementById('openai-provider-replace-credential');
        const replacingCredential = !replaceControl || replaceControl.checked === true;
        return {
            id: id || undefined,
            name: document.getElementById('openai-provider-name')?.value || '',
            endpoint: document.getElementById('openai-provider-endpoint')?.value || '',
            apiKey: nativeHost ? '' : (replacingCredential ? (document.getElementById('openai-provider-key')?.value || '') : ''),
            model: document.getElementById('openai-provider-model')?.value || '',
            protocol: document.getElementById('openai-provider-protocol')?.value || 'auto',
            organization: document.getElementById('openai-provider-organization')?.value || '',
            project: document.getElementById('openai-provider-project')?.value || '',
            timeoutMs: document.getElementById('openai-provider-timeout')?.value || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_TIMEOUT_MS,
            maxCompletionTokens: document.getElementById('openai-provider-max-completion-tokens')?.value || YAW_OPENAI_COMPATIBLE_PROVIDER.DEFAULT_MAX_COMPLETION_TOKENS,
            reasoningEffort: document.getElementById('openai-provider-reasoning-effort')?.value || 'provider',
            temperature: document.getElementById('openai-provider-temperature')?.value || '',
            replaceCredential: !nativeHost && replaceControl?.checked === true,
            additionalHeaders: nativeHost ? [] : (replacingCredential ? this.readHeaders() : [])
        };
    },

    async runPuter(action) {
        if (this.busy) return false;
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

    async runManaged(action) {
        if (this.busy || typeof YAW_MANAGED_SERVICE === 'undefined') return false;
        if (action === 'account') return YAW_MANAGED_SERVICE.openAccount();
        if (action === 'subscribe') return YAW_MANAGED_SERVICE.openSubscribe();
        this.busy = true;
        this.setMessage(this.label('provider.working', 'Working...'));
        this.refresh();
        try {
            if (action === 'sign-in') {
                await YAW_MANAGED_SERVICE.requestSignIn(document.getElementById('managed-service-email')?.value || '');
            } else if (action === 'confirm-content') {
                await YAW_MANAGED_SERVICE.confirmContentAccess();
            } else if (action === 'refresh') {
                await YAW_MANAGED_SERVICE.refreshSession();
            } else if (action === 'logout') {
                await YAW_MANAGED_SERVICE.logout();
            }
            this.busy = false;
            this.setMessage(YAW_MANAGED_SERVICE.snapshot().message || this.label('provider.updated', 'Provider connection updated.'), 'success');
            this.refresh();
            return true;
        } catch (error) {
            this.busy = false;
            this.logError(error, action, 'You Are Wild Premium Narration');
            this.setMessage(this.errorMessage(error), 'error');
            this.refresh();
            return false;
        }
    },

    async runOpenAI(action, profileId = '') {
        if (this.busy) return false;
        if (action === 'remove' && !confirm(this.label('provider.confirmRemove', 'Remove this provider connection and permanently delete its stored credential?'))) return false;
        const formInput = action === 'save' ? this.readOpenAIForm(profileId) : null;
        this.busy = true;
        this.setMessage(this.label('provider.working', 'Working...'));
        this.refresh();
        if (action === 'save') this.focusEditor();
        try {
            const nativeHost = typeof YAW_HOST !== 'undefined' && YAW_HOST.capabilities().native === true;
            const profile = profileId ? YAW_AI_PROVIDER_MANAGER.profiles.get(String(profileId)) : null;
            const nativeProfile = Boolean(nativeHost && profile?.providerId === YAW_HOST.NATIVE_PROVIDER_ID);
            if (action === 'save') {
                if (nativeHost) {
                    const profileInput = {
                        name: formInput.name,
                        endpoint: formInput.endpoint,
                        model: formInput.model,
                        protocol: formInput.protocol,
                        timeoutMs: formInput.timeoutMs,
                        maxCompletionTokens: formInput.maxCompletionTokens,
                        reasoningEffort: formInput.reasoningEffort,
                        temperature: formInput.temperature,
                        organization: formInput.organization,
                        project: formInput.project
                    };
                    if (nativeProfile) {
                        const updated = await YAW_HOST.providers.updateProfile(profileId, profileInput);
                        if (!updated?.ok) {
                            throw Object.assign(new Error(updated?.error?.message || 'Native profile update failed'), updated?.error || {});
                        }
                        await YAW_HOST.syncNativeProviderConnections();
                        this.editingProfileId = '';
                        this.setMessage(updated.credentialInvalidated
                            ? this.label('provider.endpointCredentialCleared', 'Connection settings were saved. Because the endpoint changed, its stored credential was deleted; set the credential again for the new endpoint.')
                            : this.label('provider.nativeProfileUpdated', 'Connection settings were saved. The trusted desktop host retained credential custody.'), updated.credentialInvalidated ? 'warning' : 'success');
                    } else {
                        const created = await YAW_HOST.providers.createProfile(profileInput);
                        if (!created?.ok) {
                            throw Object.assign(new Error(created?.error?.message || 'Native profile creation failed'), created?.error || {});
                        }
                        profileId = created.profile.id;
                        const configured = await YAW_HOST.providers.configureCredential(profileId);
                        if (!configured?.ok) {
                            throw Object.assign(new Error(configured?.error?.message || 'Native credential setup failed'), configured?.error || {});
                        }
                        await YAW_HOST.syncNativeProviderConnections();
                        this.editingProfileId = '';
                        this.setMessage(this.label('provider.nativeProfileSaved', 'Connection metadata was saved. Credential custody remains in the trusted desktop host.'), 'success');
                    }
                } else {
                    const connected = YAW_OPENAI_COMPATIBLE_PROVIDER.connect(formInput);
                    profileId = connected.id;
                    this.editingProfileId = '';
                    this.setMessage(this.label('provider.savedSession', 'Connection metadata was saved and the session credential is active.'), 'success');
                }
            } else if (action === 'credential') {
                if (!nativeProfile) throw Object.assign(new Error('Native provider profile is unavailable'), { code: 'profile_unavailable' });
                const result = await YAW_HOST.providers.configureCredential(profileId);
                if (!result?.ok) {
                    throw Object.assign(new Error(result?.error?.message || 'Native credential setup failed'), result?.error || {});
                }
                await YAW_HOST.syncNativeProviderConnections();
                this.setMessage(result.canceled
                    ? this.label('provider.credentialUnchanged', 'Credential was left unchanged.')
                    : this.label('provider.credentialUpdatedTrusted', 'Credential was updated in the trusted desktop window.'), 'success');
            } else if (action === 'test') {
                const result = nativeProfile
                    ? await YAW_HOST.providers.test(profileId)
                    : await YAW_OPENAI_COMPATIBLE_PROVIDER.test(profileId);
                if (nativeProfile && !result?.ok) {
                    throw Object.assign(new Error(result?.error?.message || 'Native provider test failed'), result?.error || {});
                }
                this.setMessage(this.label('provider.testDetail', 'Connected using {protocol}. Endpoint, authentication, and model were accepted. Request URL: {url}', {
                    protocol: result.test?.protocol || profile?.metadata?.protocol || 'auto',
                    url: result.test?.endpoint || profile?.metadata?.endpoint || ''
                }), 'success');
            } else if (action === 'disconnect') {
                if (nativeProfile) {
                    const result = await YAW_HOST.providers.forgetCredential(profileId);
                    if (!result?.ok) {
                        throw Object.assign(new Error(result?.error?.message || 'Native credential removal failed'), result?.error || {});
                    }
                    await YAW_HOST.syncNativeProviderConnections();
                } else {
                    YAW_OPENAI_COMPATIBLE_PROVIDER.clearCredential(profileId);
                }
                this.setMessage(this.label('provider.credentialCleared', 'Session credential cleared. Saved non-secret metadata remains.'), 'success');
            } else if (action === 'remove') {
                if (nativeProfile) {
                    const result = await YAW_HOST.providers.removeProfile(profileId);
                    if (!result?.ok) {
                        throw Object.assign(new Error(result?.error?.message || 'Native provider removal failed'), result?.error || {});
                    }
                    await YAW_HOST.syncNativeProviderConnections();
                } else {
                    YAW_OPENAI_COMPATIBLE_PROVIDER.remove(profileId);
                }
                if (this.editingProfileId === profileId) this.editingProfileId = '';
                this.setMessage(this.label('provider.removed', 'Provider connection and stored credential removed.'), 'success');
            }
            this.busy = false;
            this.refresh();
            if (action === 'save') this.restoreEditorFocus();
            if (typeof ModUI !== 'undefined') ModUI.refreshModList();
            return true;
        } catch (error) {
            this.busy = false;
            this.logError(error, action, 'OpenAI-compatible API');
            this.setMessage(this.errorMessage(error), 'error');
            this.refresh();
            if (action === 'save') this.focusEditor();
            return false;
        }
    }
};

if (typeof window !== 'undefined') window.AIProviderUI = AIProviderUI;
