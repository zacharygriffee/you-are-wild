/**
 * YOU ARE WILD HOST CAPABILITIES
 * Host-neutral mediation for browser and bounded native hosts.
 */

const YAW_HOST = (() => {
    const MAX_SAVE_BYTES = 8 * 1024 * 1024;
    const NATIVE_HOST_ID = 'pear-electron';
    const NATIVE_PROVIDER_ID = 'native-openai-compatible';
    const CAPABILITIES = Object.freeze([
        'files.export_save',
        'files.import_save',
        'providers.session_transport',
        'providers.secure_transport',
        'providers.persistent_credentials',
        'distribution.read_status'
    ]);
    const APPROVED_BRIDGE_KEYS = Object.freeze(['app', 'capabilities', 'distribution', 'files', 'providers']);
    const APPROVED_METHODS = Object.freeze({
        app: ['platform'],
        distribution: ['status'],
        files: ['exportSave', 'importSave'],
        providers: ['configureCredential', 'createProfile', 'forgetCredential', 'generate', 'listProfiles', 'removeProfile', 'test', 'updateProfile']
    });
    const state = {
        nativeSnapshot: null,
        nativeConnectionIds: new Set(),
        adapterRegistered: false
    };

    function copy(value, fallback = null) {
        try {
            const serialized = JSON.stringify(value);
            if (serialized === undefined) return fallback;
            return JSON.parse(serialized);
        } catch (error) {
            return fallback;
        }
    }

    function normalizedError(error, capability = '') {
        const code = String(error?.code || (capability ? 'host_operation_failed' : 'host_error'))
            .replace(/[^a-z0-9_.-]/gi, '_')
            .toLowerCase()
            .slice(0, 80);
        const message = String(error?.message || error || 'Host operation failed')
            .replace(/(?:bearer|basic)\s+\S+/gi, '[redacted]')
            .replace(/sk-(?:or-v1-)?[a-z0-9_-]{8,}/gi, '[redacted]')
            .slice(0, 500);
        return { ok: false, error: { code, message, capability } };
    }

    function unsupported(capability) {
        return {
            ok: false,
            unsupported: true,
            error: {
                code: 'unsupported_capability',
                message: `Host capability is unavailable: ${capability}`,
                capability
            }
        };
    }

    function nativeBridge() {
        const bridge = typeof window !== 'undefined' ? window.yawHost : null;
        if (!bridge || typeof bridge !== 'object' || Array.isArray(bridge)) return null;
        for (const key of Object.keys(bridge)) {
            if (!APPROVED_BRIDGE_KEYS.includes(key)) return null;
        }
        for (const [section, methods] of Object.entries(APPROVED_METHODS)) {
            const value = bridge[section];
            if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
            for (const key of Object.keys(value)) {
                if (!methods.includes(key) || typeof value[key] !== 'function') return null;
            }
            if (methods.some(method => typeof value[method] !== 'function')) return null;
        }
        if (typeof bridge.capabilities !== 'function') return null;
        return bridge;
    }

    function browserSnapshot() {
        const protocol = typeof window !== 'undefined' ? String(window.location?.protocol || '') : '';
        return {
            schema: 'yaw-host-capabilities-v1',
            hostId: 'browser',
            kind: 'browser',
            native: false,
            origin: protocol === 'file:' ? 'file' : 'web',
            capabilities: {
                'files.export_save': true,
                'files.import_save': true,
                'providers.session_transport': true,
                'providers.secure_transport': false,
                'providers.persistent_credentials': false,
                'distribution.read_status': false
            }
        };
    }

    function inferredNativeSnapshot() {
        return {
            schema: 'yaw-host-capabilities-v1',
            hostId: NATIVE_HOST_ID,
            kind: 'native',
            native: true,
            origin: 'app',
            capabilities: Object.fromEntries(CAPABILITIES.map(capability => [capability, true]))
        };
    }

    async function call(section, method, args = [], capability = '') {
        const bridge = nativeBridge();
        if (!bridge) return unsupported(capability);
        try {
            const value = await bridge[section][method](...copy(args, []));
            const safe = copy(value, null);
            if (safe === null && value !== null) throw new Error('Native host returned a non-serializable result');
            return safe;
        } catch (error) {
            return normalizedError(error, capability);
        }
    }

    function bytesToBase64(value) {
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
        if (bytes.byteLength > MAX_SAVE_BYTES) throw new Error(`Save exceeds ${MAX_SAVE_BYTES} byte limit`);
        let binary = '';
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
        }
        return btoa(binary);
    }

    function base64ToBytes(value) {
        const text = String(value || '');
        if (!text || !/^[a-z0-9+/]+={0,2}$/i.test(text)) throw new Error('Save payload is not valid base64');
        const binary = atob(text);
        if (binary.length > MAX_SAVE_BYTES) throw new Error(`Save exceeds ${MAX_SAVE_BYTES} byte limit`);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
        return bytes;
    }

    function normalizeSaveEnvelope(options = {}) {
        const slotName = String(options.slotName || 'slot1');
        if (!/^slot[1-5]$/.test(slotName)) throw new Error('Save slot is invalid');
        const dataBase64 = String(options.dataBase64 || '');
        base64ToBytes(dataBase64);
        return {
            schema: 'yaw-native-save-v1',
            gameVersion: String(options.gameVersion || window.YAW_RELEASE?.version || '0.0.0').slice(0, 40),
            slotName,
            savedAt: Number(options.savedAt) || Date.now(),
            dataBase64
        };
    }

    async function browserExportSave(options) {
        try {
            const envelope = normalizeSaveEnvelope(options);
            const name = String(options?.suggestedName || `you-are-wild-${envelope.slotName}.yawsave`)
                .replace(/[^a-z0-9._-]/gi, '-')
                .slice(0, 160);
            const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = name.endsWith('.yawsave') ? name : `${name}.yawsave`;
            anchor.click();
            URL.revokeObjectURL(url);
            return { ok: true, canceled: false, name: anchor.download };
        } catch (error) {
            return normalizedError(error, 'files.export_save');
        }
    }

    async function browserImportSave() {
        if (typeof document === 'undefined') return unsupported('files.import_save');
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.yawsave,application/json';
            input.hidden = true;
            let settled = false;
            const finish = value => {
                if (settled) return;
                settled = true;
                input.remove();
                resolve(value);
            };
            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                if (!file) return finish({ ok: true, canceled: true });
                if (file.size > MAX_SAVE_BYTES * 2) {
                    return finish(normalizedError(new Error('Save file is too large'), 'files.import_save'));
                }
                try {
                    const envelope = normalizeSaveEnvelope(JSON.parse(await file.text()));
                    finish({ ok: true, canceled: false, name: file.name, envelope });
                } catch (error) {
                    finish(normalizedError(error, 'files.import_save'));
                }
            }, { once: true });
            document.body.appendChild(input);
            input.click();
            setTimeout(() => {
                if (!input.files?.length) finish({ ok: true, canceled: true });
            }, 60000);
        });
    }

    const api = {
        MAX_SAVE_BYTES,
        NATIVE_HOST_ID,
        NATIVE_PROVIDER_ID,

        capabilities() {
            return copy(state.nativeSnapshot || (nativeBridge() ? inferredNativeSnapshot() : browserSnapshot()), browserSnapshot());
        },

        async refreshCapabilities() {
            if (!nativeBridge()) {
                state.nativeSnapshot = null;
                return this.capabilities();
            }
            try {
                const raw = await nativeBridge().capabilities();
                const snapshot = copy(raw, null);
                if (!snapshot || snapshot.hostId !== NATIVE_HOST_ID || !snapshot.capabilities) {
                    throw new Error('Native host capability snapshot is invalid');
                }
                state.nativeSnapshot = snapshot;
            } catch (error) {
                state.nativeSnapshot = inferredNativeSnapshot();
            }
            return this.capabilities();
        },

        supports(capability) {
            return this.capabilities().capabilities?.[String(capability || '')] === true;
        },

        files: {
            async exportSave(options = {}) {
                if (!nativeBridge()) return browserExportSave(options);
                try {
                    const envelope = normalizeSaveEnvelope(options);
                    return call('files', 'exportSave', [{ ...options, envelope }], 'files.export_save');
                } catch (error) {
                    return normalizedError(error, 'files.export_save');
                }
            },

            async importSave(options = {}) {
                if (!nativeBridge()) return browserImportSave();
                const result = await call('files', 'importSave', [options], 'files.import_save');
                if (!result?.ok || result.canceled) return result;
                try {
                    return { ...result, envelope: normalizeSaveEnvelope(result.envelope) };
                } catch (error) {
                    return normalizedError(error, 'files.import_save');
                }
            }
        },

        providers: {
            listProfiles() {
                return call('providers', 'listProfiles', [], 'providers.secure_transport');
            },
            createProfile(input) {
                return call('providers', 'createProfile', [input], 'providers.secure_transport');
            },
            updateProfile(profileId, input) {
                return call('providers', 'updateProfile', [profileId, input], 'providers.secure_transport');
            },
            removeProfile(profileId) {
                return call('providers', 'removeProfile', [profileId], 'providers.secure_transport');
            },
            configureCredential(profileId) {
                return call('providers', 'configureCredential', [profileId], 'providers.secure_transport');
            },
            forgetCredential(profileId) {
                return call('providers', 'forgetCredential', [profileId], 'providers.secure_transport');
            },
            test(profileId) {
                return call('providers', 'test', [profileId], 'providers.secure_transport');
            },
            generate(profileId, request) {
                return call('providers', 'generate', [profileId, request], 'providers.secure_transport');
            }
        },

        distribution: {
            status() {
                if (!nativeBridge()) {
                    return Promise.resolve({
                        ok: true,
                        available: false,
                        runtime: 'browser',
                        distribution: { mode: 'unavailable' }
                    });
                }
                return call('distribution', 'status', [], 'distribution.read_status');
            }
        },

        app: {
            platform() {
                if (!nativeBridge()) {
                    return Promise.resolve({
                        ok: true,
                        hostId: 'browser',
                        platform: typeof navigator !== 'undefined' ? String(navigator.platform || 'web') : 'web'
                    });
                }
                return call('app', 'platform', [], '');
            }
        },

        registerNativeProviderAdapter() {
            if (state.adapterRegistered || !nativeBridge() || typeof YAW_AI_PROVIDER_MANAGER === 'undefined') return false;
            YAW_AI_PROVIDER_MANAGER.registerAdapter(NATIVE_PROVIDER_ID, {
                name: 'Native secure provider',
                description: 'Provider transport and persistent credentials are owned by the native host.',
                capabilities: ['text.generate'],
                async invoke(context) {
                    const result = await api.providers.generate(context.connection.id, {
                        capability: context.capability,
                        request: {
                            instructions: context.instructions,
                            input: context.input,
                            maxCharacters: context.maxCharacters
                        }
                    });
                    if (!result?.ok) throw new Error(result?.error?.message || 'Native provider request failed');
                    return result.result;
                }
            });
            state.adapterRegistered = true;
            return true;
        },

        async syncNativeProviderConnections() {
            if (!this.registerNativeProviderAdapter()) {
                if (!state.adapterRegistered) return [];
            }
            const result = await this.providers.listProfiles();
            if (!result?.ok || !Array.isArray(result.profiles)) return [];
            const next = new Set();
            for (const profile of result.profiles) {
                const id = String(profile?.id || '');
                if (!id) continue;
                YAW_AI_PROVIDER_MANAGER.upsertProfile({
                    id,
                    providerId: NATIVE_PROVIDER_ID,
                    name: String(profile.name || 'Native provider'),
                    metadata: {
                        endpoint: String(profile.endpoint || ''),
                        model: String(profile.model || ''),
                        protocol: String(profile.protocol || ''),
                        timeoutMs: Number(profile.timeoutMs) || 0,
                        maxCompletionTokens: Number(profile.maxCompletionTokens) || 0,
                        reasoningEffort: String(profile.reasoningEffort || 'provider'),
                        temperature: profile.temperature === null ? null : Number(profile.temperature),
                        organization: String(profile.organization || ''),
                        project: String(profile.project || ''),
                        secureStorage: profile.secureStorage === true,
                        credentialPresent: profile.credentialPresent === true
                    },
                    persisted: false
                });
                YAW_AI_PROVIDER_MANAGER.connectProfile(id);
                next.add(id);
            }
            for (const id of state.nativeConnectionIds) {
                if (!next.has(id)) YAW_AI_PROVIDER_MANAGER.removeProfile(id);
            }
            state.nativeConnectionIds = next;
            return YAW_AI_PROVIDER_MANAGER.listProfiles(NATIVE_PROVIDER_ID);
        },

        bytesToBase64,
        base64ToBytes
    };

    return Object.freeze(api);
})();

const YAW_HOST_SAVE_TRANSFER = {
    async exportSlot(app, slotName) {
        const normalized = app._normalizeSaveSlotName(slotName, null);
        if (!normalized) return false;
        try {
            const saveData = await app._dbGet('saves', normalized);
            if (!saveData) throw new Error('Save slot is empty');
            const result = await YAW_HOST.files.exportSave({
                slotName: normalized,
                gameVersion: window.YAW_RELEASE?.version || '0.0.0',
                savedAt: Number(app._getSaveTime(normalized)) || Date.now(),
                suggestedName: `you-are-wild-${normalized}.yawsave`,
                dataBase64: YAW_HOST.bytesToBase64(saveData)
            });
            if (!result?.ok) throw new Error(result?.error?.message || 'Save export failed');
            if (!result.canceled) {
                app.saveManagerStatus = { kind: 'success', message: app._label('save.exported', 'Save exported.') };
                app.renderSaveManager();
            }
            return !result.canceled;
        } catch (error) {
            app.saveManagerStatus = { kind: 'error', message: String(error?.message || error) };
            app.renderSaveManager();
            return false;
        }
    },

    async importFile(app) {
        try {
            const result = await YAW_HOST.files.importSave();
            if (!result?.ok) throw new Error(result?.error?.message || 'Save import failed');
            if (result.canceled) return false;
            const envelope = result.envelope || {};
            const slotName = app._normalizeSaveSlotName(envelope.slotName, null);
            if (!slotName) throw new Error('Imported save slot is invalid');
            const bytes = YAW_HOST.base64ToBytes(envelope.dataBase64);
            Binary.loadGame(bytes);
            const existing = await app._dbGet('saves', slotName);
            if (existing && typeof confirm === 'function' && !confirm(app._label('save.importOverwrite', 'Replace the existing save in this slot?'))) {
                return false;
            }
            await app._dbPut('saves', slotName, bytes);
            app._setSaveTime(slotName, Number(envelope.savedAt) || Date.now());
            app.saveManagerStatus = { kind: 'success', message: app._label('save.imported', 'Save imported and validated.') };
            await app.refreshContinueButton();
            app.renderSaveManager();
            return true;
        } catch (error) {
            app.saveManagerStatus = { kind: 'error', message: String(error?.message || error) };
            app.renderSaveManager();
            return false;
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_HOST = YAW_HOST;
    window.YAW_HOST_SAVE_TRANSFER = YAW_HOST_SAVE_TRANSFER;
    Promise.resolve().then(() => YAW_HOST.syncNativeProviderConnections()).catch(() => {});
}
