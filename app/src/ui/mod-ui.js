
/**
 * Module Manager UI Controller
 */
const ModUI = {
    pendingRemoteReview: null,

    label(key, fallback, vars = {}) {
        if (typeof App !== 'undefined' && App._label) return App._label(key, fallback, vars);
        if (typeof CONTENT !== 'undefined' && CONTENT.t) {
            const text = CONTENT.t(key, vars);
            return text === key ? fallback : text;
        }
        return fallback;
    },

    escapeHtml(value) {
        if (typeof App !== 'undefined' && App._escapeHtml) return App._escapeHtml(value);
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    },

    jsString(value) {
        return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    },

    syncCatalogControls() {
        const available = typeof MODULE_SYSTEM !== 'undefined'
            && typeof MODULE_SYSTEM.getHostCatalog === 'function'
            && MODULE_SYSTEM.getHostCatalog().length > 0;
        document.querySelectorAll('[data-host-catalog-entry]').forEach(control => {
            control.hidden = !available;
        });
        return available;
    },

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const content = await this.readFile(file);
            
            // Try to parse as module
            let moduleData;
            if (file.name.endsWith('.json')) {
                moduleData = JSON.parse(content);
            } else if (file.name.endsWith('.js')) {
                // Wrap JS in module format
                moduleData = {
                    manifest: {
                        id: 'mod_' + Date.now(),
                        name: file.name.replace('.js', ''),
                        version: '1.0.0',
                        type: 'feature_pack',
                        contentRating: 'safe',
                        permissions: [],
                        dependencies: []
                    },
                    code: content
                };
            } else {
                throw new Error(this.label('mod.unsupportedFile', 'Unsupported module file type'));
            }
            
            const installed = await MODULE_SYSTEM.installModule(moduleData);
            const moduleName = installed.manifest.name;
            App.log.push({ text: this.label('mod.installedLog', 'Installed module: {name}', { name: moduleName }), type: 'discovery' });
            App.renderLog();
            this.refreshModList();
            
            alert(this.label('mod.installedAlert', 'Module "{name}" installed successfully!', { name: moduleName }));
        } catch (e) {
            alert(this.label('mod.installFailed', 'Failed to install module: {message}', { message: e.message }));
            console.error(e);
        }
    },
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    logRemote(text, type = 'discovery') {
        if (typeof App === 'undefined' || !Array.isArray(App.log)) return;
        App.log.push({ text, type });
        App.renderLog?.();
    },

    toggleRemoteImport(forceOpen = null) {
        const panel = document.getElementById('remote-module-import');
        if (!panel) return;
        const open = forceOpen === null ? panel.hidden : Boolean(forceOpen);
        panel.hidden = !open;
        if (!open) {
            this.pendingRemoteReview = null;
            const review = document.getElementById('remote-module-review');
            if (review) review.innerHTML = '';
        } else {
            document.getElementById('remote-module-uri')?.focus();
        }
    },

    async beginRemoteUpdate(moduleId) {
        const module = (await MODULE_SYSTEM.getAllModules()).find(entry => entry.id === moduleId);
        if (!module || module.provenance !== 'remote' || !module.sourceUrl) return;
        this.toggleRemoteImport(true);
        const uri = document.getElementById('remote-module-uri');
        const integrity = document.getElementById('remote-module-integrity');
        if (uri) uri.value = module.sourceUrl;
        if (integrity) integrity.value = '';
        await this.reviewRemoteUri(module.id);
    },

    async beginAssetBundleUpdate(moduleId) {
        const bundle = await MODULE_SYSTEM.getModuleAssetBundle(moduleId);
        if (!bundle?.sourceUrl) return;
        this.toggleRemoteImport(true);
        const uri = document.getElementById('remote-module-uri');
        const integrity = document.getElementById('remote-module-integrity');
        if (uri) uri.value = bundle.sourceUrl;
        if (integrity) integrity.value = '';
        await this.reviewRemoteUri(moduleId);
    },

    async renderAssetBundleReview(review, output) {
        const bundle = review.bundle;
        const tileset = (bundle.presentations || []).find(presentation => presentation?.type === 'yaw-tileset-pack') || null;
        const tilesetReview = tileset
            ? `<dt>${this.escapeHtml(this.label('mod.assetPresentation', 'Presentation'))}</dt><dd>${this.escapeHtml(this.label('mod.assetTilesetPack', 'Tileset Pack V1'))}: ${this.escapeHtml(tileset.name || tileset.id)} • ${Object.keys(tileset.tiles || {}).length} ${this.escapeHtml(this.label('mod.assetTiles', 'tiles'))} • ${tileset.coverage?.missingRequired?.length || 0} ${this.escapeHtml(this.label('mod.assetFallbacks', 'fallbacks'))}</dd>`
            : '';
        const targetModule = (await MODULE_SYSTEM.getAllModules()).find(module => module.id === bundle.targetModuleId) || null;
        const current = targetModule ? await MODULE_SYSTEM.getModuleAssetBundle(bundle.targetModuleId) : null;
        const integrityNote = review.integrityVerified
            ? this.label('mod.remoteIntegrityVerified', 'Matched the supplied SHA-256 pin.')
            : this.label('mod.remoteIntegrityRecorded', 'No pin was supplied. This digest will be recorded for audit and future comparison.');
        const targetState = !targetModule
            ? this.label('mod.assetTargetMissing', 'Install target module {id} before this bundle.', { id: bundle.targetModuleId })
            : targetModule.enabled
                ? this.label('mod.assetTargetDisable', 'Disable target module {id} before installing or replacing this bundle.', { id: bundle.targetModuleId })
                : this.label('mod.assetTargetReady', 'Target module {id} is installed and disabled.', { id: bundle.targetModuleId });
        const replacement = current
            ? `<p style="color:var(--accent-warning);margin:8px 0 0;">${this.escapeHtml(this.label('mod.assetReplace', 'Installing replaces asset bundle {name} v{version} after every new resource verifies.', { name: current.name, version: current.version }))}</p>`
            : '';
        output.innerHTML = `
            <div style="border:1px solid var(--border-default);background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:12px;margin-top:12px;">
                <strong>${this.escapeHtml(bundle.name)} v${this.escapeHtml(bundle.version)}</strong>
                <p style="color:var(--text-muted);margin:6px 0;">${this.escapeHtml(bundle.description || this.label('mod.noDescription', 'No description'))}</p>
                <dl style="display:grid;grid-template-columns:max-content 1fr;gap:4px 10px;font-size:12px;margin:8px 0;overflow-wrap:anywhere;">
                    <dt>${this.escapeHtml(this.label('mod.assetPackageType', 'Package'))}</dt><dd>${this.escapeHtml(this.label('mod.assetBundleV1', 'Asset Bundle V1 (code-free)'))}</dd>
                    <dt>${this.escapeHtml(this.label('mod.assetTarget', 'Target module'))}</dt><dd>${this.escapeHtml(bundle.targetModuleId)}</dd>
                    <dt>${this.escapeHtml(this.label('mod.remoteRating', 'Content rating'))}</dt><dd>${this.escapeHtml(bundle.contentRating)}</dd>
                    <dt>${this.escapeHtml(this.label('mod.assetResources', 'Resources'))}</dt><dd>${bundle.resourceCount} • ${bundle.totalByteLength} bytes</dd>
                    <dt>${this.escapeHtml(this.label('mod.assetRoles', 'Roles'))}</dt><dd>${this.escapeHtml(bundle.roles.join(', '))}</dd>
                    ${tilesetReview}
                    <dt>${this.escapeHtml(this.label('mod.assetLicense', 'License'))}</dt><dd>${this.escapeHtml(bundle.license)}</dd>
                    <dt>SHA-256</dt><dd><code>${this.escapeHtml(review.integrity)}</code></dd>
                    <dt>${this.escapeHtml(this.label('mod.remoteSize', 'Manifest download'))}</dt><dd>${this.escapeHtml(String(review.byteLength))} bytes</dd>
                </dl>
                <p style="font-size:12px;color:${targetModule && !targetModule.enabled ? 'var(--accent-primary)' : 'var(--accent-warning)'};margin:6px 0;">${this.escapeHtml(targetState)}</p>
                <p style="font-size:12px;color:${review.integrityVerified ? 'var(--accent-primary)' : 'var(--accent-warning)'};margin:6px 0;">${this.escapeHtml(integrityNote)}</p>
                <p style="font-size:12px;color:var(--text-muted);margin:6px 0;">${this.escapeHtml(this.label('mod.assetReviewNotice', 'The manifest contains no executable code. Confirming downloads every resource, verifies its declared hash, and stores a local copy before replacing the current bundle.'))}</p>
                ${replacement}
                <button class="nav-btn" type="button" style="margin-top:8px;" ${targetModule && !targetModule.enabled ? '' : 'disabled'} onclick="ModUI.installReviewedRemote()">${this.escapeHtml(this.label('mod.remoteInstallReviewed', 'Install reviewed package'))}</button>
            </div>`;
    },

    async reviewRemoteUri(previousModuleId = '') {
        const uriInput = document.getElementById('remote-module-uri');
        const integrityInput = document.getElementById('remote-module-integrity');
        const output = document.getElementById('remote-module-review');
        const button = document.getElementById('remote-module-review-button');
        if (!uriInput || !output) return;
        this.pendingRemoteReview = null;
        output.innerHTML = `<p style="color:var(--text-muted);margin:8px 0;">${this.escapeHtml(this.label('mod.remoteFetching', 'Downloading and validating package...'))}</p>`;
        if (button) button.disabled = true;
        try {
            const review = await MODULE_SYSTEM.reviewRemoteModule(uriInput.value, integrityInput?.value || '');
            if (review.kind === 'asset_bundle_v1') {
                this.pendingRemoteReview = review;
                await this.renderAssetBundleReview(review, output);
                this.logRemote(this.label('mod.assetReviewedLog', 'Reviewed asset bundle: {name} v{version}', { name: review.bundle.name, version: review.bundle.version }));
                return;
            }
            const installed = (await MODULE_SYSTEM.getAllModules()).find(module => module.id === review.manifest.id) || null;
            review.previousModuleId = previousModuleId || installed?.id || '';
            review.previousIntegrity = installed?.integrity || '';
            this.pendingRemoteReview = review;
            const permissions = review.manifest.permissions?.length ? review.manifest.permissions.join(', ') : this.label('mod.remoteNone', 'none');
            const dependencies = review.manifest.dependencies?.length ? review.manifest.dependencies.join(', ') : this.label('mod.remoteNone', 'none');
            const changeNote = installed
                ? `<p style="color:var(--accent-warning);margin:8px 0 0;">${this.escapeHtml(this.label('mod.remoteReplace', 'Installing will replace the currently stored {name} v{version} and leave it disabled.', { name: installed.manifest?.name || installed.id, version: installed.manifest?.version || '?' }))}</p>`
                : '';
            const integrityNote = review.integrityVerified
                ? this.label('mod.remoteIntegrityVerified', 'Matched the supplied SHA-256 pin.')
                : this.label('mod.remoteIntegrityRecorded', 'No pin was supplied. This digest will be recorded for audit and future comparison.');
            output.innerHTML = `
                <div style="border:1px solid var(--border-default);background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:12px;margin-top:12px;">
                    <strong>${this.escapeHtml(review.manifest.name)} v${this.escapeHtml(review.manifest.version)}</strong>
                    <p style="color:var(--text-muted);margin:6px 0;">${this.escapeHtml(review.manifest.description || this.label('mod.noDescription', 'No description'))}</p>
                    <dl style="display:grid;grid-template-columns:max-content 1fr;gap:4px 10px;font-size:12px;margin:8px 0;overflow-wrap:anywhere;">
                        <dt>${this.escapeHtml(this.label('mod.type', 'Type'))}</dt><dd>${this.escapeHtml(review.manifest.type)}</dd>
                        <dt>${this.escapeHtml(this.label('mod.remoteRating', 'Content rating'))}</dt><dd>${this.escapeHtml(review.manifest.contentRating)}</dd>
                        <dt>${this.escapeHtml(this.label('mod.remotePermissions', 'Permissions'))}</dt><dd>${this.escapeHtml(permissions)}</dd>
                        <dt>${this.escapeHtml(this.label('mod.remoteDependencies', 'Dependencies'))}</dt><dd>${this.escapeHtml(dependencies)}</dd>
                        <dt>SHA-256</dt><dd><code>${this.escapeHtml(review.integrity)}</code></dd>
                        <dt>${this.escapeHtml(this.label('mod.remoteSize', 'Download'))}</dt><dd>${this.escapeHtml(String(review.byteLength))} bytes</dd>
                    </dl>
                    <p style="font-size:12px;color:${review.integrityVerified ? 'var(--accent-primary)' : 'var(--accent-warning)'};margin:6px 0;">${this.escapeHtml(integrityNote)}</p>
                    <p style="font-size:12px;color:var(--accent-danger);margin:6px 0;">${this.escapeHtml(this.label('mod.remoteTrustWarning', 'Trusted-local mod code runs in the game page. Install only if you trust the author and source.'))}</p>
                    ${changeNote}
                    <button class="nav-btn" type="button" style="margin-top:8px;" onclick="ModUI.installReviewedRemote()">${this.escapeHtml(this.label('mod.remoteInstallReviewed', 'Install reviewed package'))}</button>
                </div>`;
            this.logRemote(this.label('mod.remoteReviewedLog', 'Reviewed remote module: {name} v{version}', { name: review.manifest.name, version: review.manifest.version }));
        } catch (error) {
            const message = error?.message || String(error);
            output.innerHTML = `<p style="color:var(--accent-danger);margin:8px 0;">${this.escapeHtml(message)}</p>`;
            this.logRemote(this.label('mod.remoteFailedLog', 'Remote package review failed: {message}', { message }), 'error');
            console.error(error);
        } finally {
            if (button) button.disabled = false;
        }
    },

    async installReviewedRemote() {
        const review = this.pendingRemoteReview;
        if (!review) return;
        if (review.kind === 'asset_bundle_v1') {
            const bundle = review.bundle;
            const warning = this.label('mod.assetConfirm', 'Install {name} v{version} for {module}? The game will download and verify {count} resources ({bytes} bytes) before replacing its current bundle.', {
                name: bundle.name,
                version: bundle.version,
                module: bundle.targetModuleId,
                count: bundle.resourceCount,
                bytes: bundle.totalByteLength
            });
            if (!confirm(warning)) return;
            const output = document.getElementById('remote-module-review');
            try {
                await MODULE_SYSTEM.installReviewedRemoteAssetBundle(review, {
                    onProgress: progress => {
                        if (!output) return;
                        const completed = Number(progress.index || 0);
                        const count = Number(progress.count || bundle.resourceCount);
                        output.innerHTML = `<p style="color:var(--text-muted);margin:8px 0;">${this.escapeHtml(this.label('mod.assetInstalling', 'Installing asset bundle: {completed}/{count} resources verified...', { completed, count }))}</p>`;
                    }
                });
                this.pendingRemoteReview = null;
                this.logRemote(this.label('mod.assetInstalledLog', 'Installed asset bundle: {name} v{version} for {module}', { name: bundle.name, version: bundle.version, module: bundle.targetModuleId }));
                if (output) output.innerHTML = `<p style="color:var(--accent-primary);margin:8px 0;">${this.escapeHtml(this.label('mod.assetInstalled', 'Asset bundle installed locally. Enable its target module when ready.'))}</p>`;
                await this.refreshModList();
            } catch (error) {
                const message = error?.message || String(error);
                this.logRemote(this.label('mod.assetInstallFailedLog', 'Asset bundle install failed: {message}', { message }), 'error');
                if (output) output.innerHTML = `<p style="color:var(--accent-danger);margin:8px 0;">${this.escapeHtml(message)}</p>`;
                alert(message);
                console.error(error);
            }
            return;
        }
        const warning = this.label('mod.remoteConfirm', 'Install {name} v{version}? Its trusted-local code can access the game page. The package will be stored locally and will not be enabled automatically.', {
            name: review.manifest.name,
            version: review.manifest.version
        });
        if (!confirm(warning)) return;
        try {
            const installed = await MODULE_SYSTEM.installReviewedRemoteModule(review);
            this.pendingRemoteReview = null;
            this.logRemote(this.label('mod.remoteInstalledLog', 'Installed remote module: {name} v{version} (disabled)', {
                name: installed.manifest.name,
                version: installed.manifest.version
            }));
            const output = document.getElementById('remote-module-review');
            if (output) output.innerHTML = `<p style="color:var(--accent-primary);margin:8px 0;">${this.escapeHtml(this.label('mod.remoteInstalled', 'Package installed locally. Review its settings, then enable it when ready.'))}</p>`;
            await this.refreshModList();
        } catch (error) {
            const message = error?.message || String(error);
            this.logRemote(this.label('mod.remoteInstallFailedLog', 'Remote module install failed: {message}', { message }), 'error');
            alert(message);
            console.error(error);
        }
    },

    async removeAssetBundle(moduleId) {
        if (!confirm(this.label('mod.assetRemoveConfirm', 'Remove this module\'s installed asset bundle? The module must be disabled.'))) return;
        try {
            await MODULE_SYSTEM.removeModuleAssetBundle(moduleId);
            this.logRemote(this.label('mod.assetRemovedLog', 'Removed asset bundle for {module}', { module: moduleId }));
            await this.refreshModList();
        } catch (error) {
            alert(error?.message || String(error));
        }
    },
    
    async toggleModule(moduleId) {
        const modules = await MODULE_SYSTEM.getAllModules();
        const mod = modules.find(m => m.id === moduleId);
        if (!mod) return;
        
        const newState = !mod.enabled;
        const name = mod.manifest?.name || mod.id || 'Module';
        try {
            await MODULE_SYSTEM.setModuleEnabled(moduleId, newState);
            await this.refreshModList();
            App.markAutoSaveDirty?.(['manifest', 'quests'], 'module-toggle');

            App.log.push({
                text: this.label(newState ? 'mod.enabledLog' : 'mod.disabledLog', newState ? 'Enabled module: {name}' : 'Disabled module: {name}', { name }),
                type: 'discovery'
            });
            App.renderLog();
        } catch (e) {
            await this.refreshModList();
            const message = e?.message || e;
            const key = newState ? 'mod.enableFailed' : 'mod.disableFailed';
            const fallback = newState ? 'Could not enable {name}: {message}' : 'Could not disable {name}: {message}';
            const text = this.label(key, fallback, { name, message });
            App.log.push({ text, type: 'discovery' });
            App.renderLog();
            alert(text);
            console.error(e);
        }
    },
    
    async deleteModule(moduleId) {
        if (!confirm(this.label('mod.confirmDelete', 'Delete this module? This cannot be undone.'))) return;
        try {
            await MODULE_SYSTEM.deleteModule(moduleId);
            App.markAutoSaveDirty?.(['manifest', 'quests'], 'module-delete');
            await this.refreshModList();
        } catch (error) {
            alert(error.message || String(error));
            await this.refreshModList();
        }
    },

    settingControl(moduleId, declaration, value) {
        const id = this.escapeHtml(this.jsString(moduleId));
        const key = this.escapeHtml(this.jsString(declaration.key));
        const label = this.escapeHtml(declaration.label);
        const description = declaration.description ? `<small>${this.escapeHtml(declaration.description)}</small>` : '';
        let control = '';
        if (declaration.type === 'boolean') {
            control = `<input type="checkbox" ${value === true ? 'checked' : ''} onchange="ModUI.updateSetting('${id}','${key}',this.checked)">`;
        } else if (declaration.type === 'select') {
            control = `<select onchange="ModUI.updateSetting('${id}','${key}',this.value)">${declaration.options.map(option => `<option value="${this.escapeHtml(option.value)}" ${option.value === value ? 'selected' : ''}>${this.escapeHtml(option.label)}</option>`).join('')}</select>`;
        } else if (declaration.type === 'number') {
            control = `<input type="number" min="${declaration.min}" max="${declaration.max}" step="${declaration.step}" value="${this.escapeHtml(value)}" onchange="ModUI.updateSetting('${id}','${key}',this.value)">`;
        } else if (declaration.type === 'string') {
            control = declaration.multiline
                ? `<textarea rows="${declaration.rows}" maxlength="${declaration.maxLength}" onchange="ModUI.updateSetting('${id}','${key}',this.value)">${this.escapeHtml(value)}</textarea>`
                : `<input type="text" maxlength="${declaration.maxLength}" value="${this.escapeHtml(value)}" onchange="ModUI.updateSetting('${id}','${key}',this.value)">`;
        } else if (declaration.type === 'provider_connection') {
            const localOnly = typeof App !== 'undefined' && App.isFileOrigin();
            const capability = declaration.capability || 'text.generate';
            const profiles = YAW_AI_PROVIDER_MANAGER.listProfiles()
                .filter(profile => profile.capabilities.includes(capability))
                .filter(profile => !localOnly || (profile.providerId === YAW_OPENAI_COMPATIBLE_PROVIDER.PROVIDER_ID
                    && YAW_OPENAI_COMPATIBLE_PROVIDER.isLoopbackEndpoint(profile.metadata?.endpoint)))
                .sort((left, right) => {
                    const rank = profile => profile.providerId === YAW_OPENAI_COMPATIBLE_PROVIDER.PROVIDER_ID
                        ? 0
                        : (profile.providerId === YAW_PUTER_PROVIDER.PROVIDER_ID ? 2 : 1);
                    return rank(left) - rank(right) || left.name.localeCompare(right.name);
                });
            const options = profiles.map(profile => {
                const state = profile.connected
                    ? this.label('provider.state.connectedShort', 'connected')
                    : this.label('provider.state.reconnectShort', 'reconnect required');
                const tier = profile.providerId === YAW_PUTER_PROVIDER.PROVIDER_ID
                    ? ` - ${this.label('provider.experimental', 'experimental')}`
                    : '';
                return `<option value="${this.escapeHtml(profile.id)}" ${profile.id === value ? 'selected' : ''}>${this.escapeHtml(profile.name)}${this.escapeHtml(tier)} - ${this.escapeHtml(state)}</option>`;
            }).join('');
            const localNotice = localOnly
                ? `<small class="mod-provider-unavailable">${this.escapeHtml(this.label('provider.fileOriginLocalOnly', 'File mode supports local loopback providers such as Ollama; remote and credentialed providers are unavailable.'))}</small>`
                : '';
            control = `<span class="mod-provider-setting">${localNotice}<select onchange="ModUI.updateSetting('${id}','${key}',this.value)"><option value="">${this.escapeHtml(this.label('provider.none', 'No connection'))}</option>${options}</select><button class="nav-btn" type="button" onclick="App.showAIProviderScreen()">${this.escapeHtml(this.label('provider.manage', 'Manage Providers'))}</button></span>`;
        } else if (declaration.type === 'action') {
            const available = MODULE_SYSTEM.settingActions.has(`${moduleId}:${declaration.key}`);
            control = `<button class="nav-btn" type="button" ${available ? '' : 'disabled'} onclick="ModUI.runSettingAction('${id}','${key}')">${label}</button>`;
            return `<div class="mod-setting-row"><span>${description}</span>${control}</div>`;
        }
        const rowClass = declaration.type === 'string' && declaration.multiline ? 'mod-setting-row multiline' : 'mod-setting-row';
        return `<label class="${rowClass}"><span><strong>${label}</strong>${description}</span>${control}</label>`;
    },

    async updateSetting(moduleId, key, value) {
        const modules = await MODULE_SYSTEM.getAllModules();
        const mod = modules.find(module => module.id === moduleId);
        if (!mod) return false;
        try {
            await MODULE_SYSTEM.setDeclaredModuleSetting(moduleId, mod.manifest, key, value);
            return true;
        } catch (error) {
            alert(error.message);
            await this.refreshModList();
            return false;
        }
    },

    async runSettingAction(moduleId, key) {
        const action = MODULE_SYSTEM.settingActions.get(`${moduleId}:${key}`);
        if (!action) return false;
        try {
            await action();
            await this.refreshModList();
            return true;
        } catch (error) {
            alert(error.message || String(error));
            return false;
        }
    },
    
    async refreshModList() {
        this.syncCatalogControls();
        const container = document.getElementById('mod-list');
        if (!container) return;
        
        let modules = [];
        try {
            modules = await MODULE_SYSTEM.getAllModules();
        } catch (e) {
            console.warn('Failed to load modules:', e);
            container.innerHTML = `
                <p style="color: var(--text-muted); text-align: center; padding: 32px;">
                    ${this.escapeHtml(this.label('mod.storageNotReady', 'Module storage not ready. Try again in a moment.'))}
                </p>
            `;
            return;
        }
        
        if (modules.length === 0) {
            container.innerHTML = `
                <p style="color: var(--text-muted); text-align: center; padding: 32px;">
                    ${this.escapeHtml(this.label('mod.noneInstalled', 'No modules installed. Install one above or create an example.'))}
                </p>
            `;
            return;
        }
        
        const valuesByModule = Object.fromEntries(await Promise.all(modules.map(async mod => [
            mod.id,
            await MODULE_SYSTEM.getDeclaredModuleSettings(mod.id, mod.manifest || {})
        ])));
        const bundlesByModule = Object.fromEntries(await Promise.all(modules.map(async mod => [
            mod.id,
            await MODULE_SYSTEM.getModuleAssetBundleStatus(mod.id)
        ])));

        container.innerHTML = modules.map(mod => {
            const manifest = mod.manifest || {};
            const name = this.escapeHtml(manifest.name || mod.id || 'Module');
            const version = this.escapeHtml(manifest.version || '1.0.0');
            const description = this.escapeHtml(manifest.description || this.label('mod.noDescription', 'No description'));
            const type = this.escapeHtml(manifest.type || 'module');
            const installed = this.escapeHtml(new Date(mod.installedAt).toLocaleDateString());
            const id = this.escapeHtml(this.jsString(mod.id));
            const statusLabel = this.escapeHtml(this.label(mod.enabled ? 'mod.enabled' : 'mod.disabled', mod.enabled ? 'Enabled' : 'Disabled'));
            const enableTitle = this.escapeHtml(this.label(mod.enabled ? 'mod.disableModule' : 'mod.enableModule', mod.enabled ? 'Disable {name}' : 'Enable {name}', { name: manifest.name || mod.id || 'Module' }));
            const deleteLabel = this.escapeHtml(this.label('mod.delete', 'Delete'));
            const deleteTitle = this.escapeHtml(this.label('mod.deleteModule', 'Delete {name}', { name: manifest.name || mod.id || 'Module' }));
            const controlState = MODULE_SYSTEM.moduleControlState(mod);
            const provenanceLabel = this.escapeHtml({ host: 'Host supplied', 'built-in': 'Built in', user: 'Player installed', remote: 'URI installed' }[controlState.provenance] || controlState.provenance);
            const policyLabel = controlState.policyState
                ? `<span style="font-size:10px;color:var(--accent-primary);text-transform:uppercase;">${this.escapeHtml(controlState.policyState)}</span>`
                : '';
            const availabilityReason = controlState.reason
                ? `<div style="font-size:11px;color:${controlState.compatibilityReason ? 'var(--accent-danger)' : 'var(--text-muted)'};margin-top:4px;">${this.escapeHtml(controlState.reason)}</div>`
                : '';
            const toggleAllowed = mod.enabled ? controlState.canDisable : controlState.canEnable;
            const toggleTitle = toggleAllowed ? enableTitle : this.escapeHtml(controlState.reason || 'Controlled by this host');
            const settings = (manifest.settings || []).length
                ? `<details class="mod-settings"><summary>Settings</summary>${manifest.settings.map(setting => this.settingControl(mod.id, setting, valuesByModule[mod.id]?.[setting.key])).join('')}</details>`
                : '';
            const sourceDetails = mod.provenance === 'remote'
                ? `<details style="font-size:11px;color:var(--text-muted);margin-top:5px;"><summary>${this.escapeHtml(this.label('mod.remoteSource', 'Remote source'))}</summary><div style="overflow-wrap:anywhere;margin-top:4px;">${this.escapeHtml(mod.sourceUrl)}</div><div>SHA-256: <code>${this.escapeHtml(mod.integrity)}</code>${mod.integrityVerified ? ` • ${this.escapeHtml(this.label('mod.remotePinned', 'pin verified'))}` : ''}</div></details>`
                : '';
            const bundle = bundlesByModule[mod.id];
            const tileset = (bundle?.presentations || []).find(presentation => presentation?.type === 'yaw-tileset-pack') || null;
            const tilesetStatus = typeof YAW_TILESET_RUNTIME !== 'undefined' ? YAW_TILESET_RUNTIME.status(mod.id) : null;
            const tilesetDetails = tileset
                ? `<div style="margin-top:4px;color:${tilesetStatus?.active ? 'var(--accent-primary)' : 'var(--text-muted)'};">${this.escapeHtml(this.label('mod.assetTilesetPack', 'Tileset Pack V1'))}: ${this.escapeHtml(tileset.name || tileset.id)} • ${tilesetStatus?.active ? this.escapeHtml(this.label('mod.assetTilesetActive', 'active')) : this.escapeHtml(this.label('mod.assetTilesetInactive', 'inactive'))} • ${Object.keys(tileset.tiles || {}).length} ${this.escapeHtml(this.label('mod.assetTiles', 'tiles'))} • ${tileset.coverage?.missingRequired?.length || 0} ${this.escapeHtml(this.label('mod.assetFallbacks', 'fallbacks'))}</div>`
                : '';
            const bundleHealth = bundle?.health?.ok === false
                ? `<div style="color:var(--accent-warning);margin-top:4px;">${this.escapeHtml(this.label('mod.assetStatusRepair', 'Status: repair needed ({missing} missing)', { missing: bundle.health.missing?.length || Math.max(0, bundle.health.expectedCount - bundle.health.catalogCount) }))}</div>`
                : bundle
                    ? `<div style="color:var(--accent-primary);margin-top:4px;">${this.escapeHtml(this.label('mod.assetStatusReady', 'Status: verified locally'))}</div>`
                    : '';
            const bundleDetails = bundle
                ? `<details style="font-size:11px;color:var(--text-muted);margin-top:5px;"><summary>${this.escapeHtml(this.label('mod.assetInstalledBundle', 'Installed asset bundle'))}: ${this.escapeHtml(bundle.name)} v${this.escapeHtml(bundle.version)}</summary><div style="margin-top:4px;">${bundle.resourceCount} ${this.escapeHtml(this.label('mod.assetResourcesLower', 'resources'))} • ${bundle.totalByteLength} bytes • ${this.escapeHtml(bundle.roles?.join(', ') || 'media')}</div><div>${this.escapeHtml(this.label('mod.assetLicense', 'License'))}: ${this.escapeHtml(bundle.license)}</div>${bundleHealth}${tilesetDetails}<div style="overflow-wrap:anywhere;">${this.escapeHtml(bundle.sourceUrl)}</div><div>SHA-256: <code>${this.escapeHtml(bundle.integrity)}</code>${bundle.integrityVerified ? ` • ${this.escapeHtml(this.label('mod.remotePinned', 'pin verified'))}` : ''}</div></details>`
                : '';
            return `
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-default); 
                        border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px;
                        display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px;">📦</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary);">
                        ${name}
                        <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">
                            v${version}
                        </span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                        ${description}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                        ${this.escapeHtml(this.label('mod.type', 'Type'))}: ${type} • ${provenanceLabel} • ${this.escapeHtml(this.label('mod.installed', 'Installed'))}: ${installed} ${policyLabel}
                    </div>
                    ${availabilityReason}
                    ${sourceDetails}
                    ${bundleDetails}
                    ${settings}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                    <button class="nav-btn" data-command-surface="module-manager" data-command-mode="system" data-command-control="toggle-module" style="padding: 6px 12px; font-size: 12px;"
                            title="${toggleTitle}" aria-label="${enableTitle}" ${toggleAllowed ? '' : 'disabled'}
                            onclick="ModUI.toggleModule('${id}')">
                        ${mod.enabled ? '✓' : '○'} ${statusLabel}
                    </button>
                    ${controlState.canDelete ? `<button class="nav-btn" data-command-surface="module-manager" data-command-mode="system" data-command-control="delete-module" style="padding: 6px 12px; font-size: 12px; color: var(--accent-danger);"
                            title="${deleteTitle}" aria-label="${deleteTitle}"
                            onclick="ModUI.deleteModule('${id}')">
                        🗑️ ${deleteLabel}
                    </button>` : ''}
                    ${mod.provenance === 'remote' ? `<button class="nav-btn" type="button" style="padding:6px 12px;font-size:12px;" onclick="ModUI.beginRemoteUpdate('${id}')">${this.escapeHtml(this.label('mod.remoteReviewSource', 'Review source'))}</button>` : ''}
                    ${bundle ? `<button class="nav-btn" type="button" style="padding:6px 12px;font-size:12px;" onclick="ModUI.beginAssetBundleUpdate('${id}')">${this.escapeHtml(this.label(bundle.health?.ok === false ? 'mod.assetRepairSource' : 'mod.assetReviewSource', bundle.health?.ok === false ? 'Review source to repair' : 'Review asset source'))}</button><button class="nav-btn" type="button" style="padding:6px 12px;font-size:12px;color:var(--accent-danger);" ${mod.enabled ? 'disabled' : ''} onclick="ModUI.removeAssetBundle('${id}')">${this.escapeHtml(this.label('mod.assetRemove', 'Remove assets'))}</button>` : ''}
                </div>
            </div>
        `;
        }).join('');
    },

    async createExampleMod() {
        const exampleMod = {
            manifest: {
                id: 'mod_example_biome',
                name: 'Crystal Caverns',
                version: '1.0.0',
                author: 'Example Author',
                description: 'Adds shimmering crystal cave biomes with gem-themed creatures',
                type: 'biome_pack',
                permissions: ['world:add_biome', 'content:add_species'],
                dependencies: [],
                minGameVersion: '0.10.0'
            },
            code: `
                // Crystal Caverns Module
                MODS.registerHook('onMapGenerate', (tile, x, y) => {
                    // 5% chance for crystal biome
                    if (Math.random() < 0.05) {
                        tile.tag = 'CrystalCave';
                        tile.name = 'Shimmering Cavern';
                        tile.color = '#9b59b6';
                    }
                }, 10);
                
                MODS.addBiome({
                    id: 'crystal_cave',
                    name: 'Crystal Cavern',
                    color: '#9b59b6',
                    encounters: ['CrystalGolem', 'GemSerpent'],
                    loot: ['crystal_shard', 'gemstone']
                });
                
                MODS.addSpecies({
                    id: 'crystal_golem',
                    name: 'Crystal Golem',
                    icon: '💎',
                    desc: 'Animated mineral construct',
                    stats: { str: 15, con: 18, spd: 5 }
                });
                
                MODS.log('Crystal Caverns module loaded!');
            `
        };
        
        await MODULE_SYSTEM.installModule(exampleMod);
        App.log.push({ text: this.label('mod.createdExample', 'Created example module: Crystal Caverns'), type: 'discovery' });
        App.renderLog();
        this.refreshModList();
    },
    
    showModScreen() {
        if (typeof App !== 'undefined' && typeof App.showModScreen === 'function') {
            return App.showModScreen();
        }
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        document.getElementById('screen-mods').style.display = 'block';
        document.getElementById('screen-mods').classList.add('active');
        try { this.refreshModList(); } catch(e) { console.warn('ModUI error:', e); }
    }
};

// Add module manager to navigation
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-menu')) return;
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const modBtn = document.createElement('button');
        modBtn.className = 'nav-btn';
        modBtn.innerHTML = '📦 <span data-i18n="ui.menu.mods">Mods</span>';
        modBtn.title = 'Open mods';
        modBtn.setAttribute('data-i18n-title', 'ui.menu.modsTitle');
        modBtn.setAttribute('aria-label', 'Open mods');
        modBtn.setAttribute('data-i18n-aria-label', 'ui.menu.modsTitle');
        modBtn.onclick = () => ModUI.showModScreen();
        nav.appendChild(modBtn);
        App.applyStaticLocalization?.(nav);
    }
});
