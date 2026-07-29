/**
 * YOU ARE WILD NARRATION SYSTEM
 * Presentation-only narration records, public narrative context, and provider-neutral AI requests.
 */

const YAW_NARRATION_SYSTEM = {
    VERSION: 1,
    MAX_TEXT_LENGTH: 500,
    MAX_CONTEXT_BEATS: 12,
    MAX_ACTIVITY: 12,
    MAX_TILE_CACHE: 32,
    statuses: new Set(['pending', 'ready', 'failed', 'cancelled']),
    ratings: new Set(['safe', 'mature', 'explicit']),
    lifecycleStages: new Set(['queued', 'request_sent', 'response_received', 'attached']),
    contextExtensions: new Map(),
    orchestrators: new Map(),
    operationalErrors: new Set(),
    fallbackTimers: new Map(),
    hookTimers: new Set(),
    closedExchanges: new Set(),
    exchangeOwnership: new Map(),
    exchangeEnvelopes: new Map(),
    runtimeGeneration: 0,

    copy(value, fallback = null) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return fallback;
        }
    },

    token(value, label = 'value') {
        const token = String(value || '').trim();
        if (!token || token.length > 160 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a token string`);
        }
        return token;
    },

    providerDiagnostic(value = null) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const cleanToken = input => String(input || '').replace(/[^a-z0-9_.:-]/gi, '').slice(0, 40);
        return {
            protocol: cleanToken(value.protocol),
            finishReason: cleanToken(value.finishReason),
            choiceCount: Math.max(0, Math.min(20, Number(value.choiceCount) || 0)),
            outputItemCount: Math.max(0, Math.min(20, Number(value.outputItemCount) || 0)),
            reasoningPresent: value.reasoningPresent === true,
            refusalPresent: value.refusalPresent === true
        };
    },

    providerDiagnosticSummary(status = 0, value = null) {
        const diagnostic = this.providerDiagnostic(value);
        const parts = [];
        const httpStatus = Math.max(0, Math.min(599, Number(status) || 0));
        if (httpStatus) parts.push(`HTTP ${httpStatus}`);
        if (diagnostic?.protocol) parts.push(`protocol=${diagnostic.protocol}`);
        if (diagnostic?.finishReason) parts.push(`finish=${diagnostic.finishReason}`);
        if (diagnostic?.reasoningPresent) parts.push('reasoning=yes');
        if (diagnostic?.refusalPresent) parts.push('refusal=yes');
        if (diagnostic && diagnostic.choiceCount !== 0) parts.push(`choices=${diagnostic.choiceCount}`);
        if (diagnostic && diagnostic.outputItemCount !== 0) parts.push(`output_items=${diagnostic.outputItemCount}`);
        return parts.join('; ');
    },

    policySnapshot() {
        const prefs = typeof CONTENT !== 'undefined' ? CONTENT.preferences || {} : {};
        return {
            posture: prefs.posture === 'mature' ? 'mature' : 'sfw',
            enabledCategories: Array.isArray(prefs.enabledCategories) ? prefs.enabledCategories.map(String).sort() : [],
            gameplayVariants: Object.fromEntries(Object.entries(prefs.gameplayVariants || {})
                .filter(([, enabled]) => enabled === true)
                .map(([id]) => [String(id), true]))
        };
    },

    outputAllowed(record, policy = this.policySnapshot()) {
        if (!record) return false;
        if (record.outputRating === 'mature' && policy.posture !== 'mature') return false;
        if (record.outputRating === 'explicit') {
            if (policy.posture !== 'mature') return false;
            if (!policy.enabledCategories.includes('explicit.sexual')) return false;
        }
        return (record.contentCategories || []).every(category => policy.enabledCategories.includes(category));
    },

    publicBeat(event) {
        if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM?._publicSceneBeatSummary) {
            return MODULE_SYSTEM._publicSceneBeatSummary(event);
        }
        if (!event || typeof event !== 'object') return null;
        return this.copy({
            id: event.id,
            exchangeId: event.exchangeId || event.metadata?.exchangeId || event.id,
            mode: event.mode,
            action: event.action,
            subAction: event.subAction,
            shape: event.shape,
            resultKind: event.resultKind,
            summary: event.summary,
            passage: event.passage,
            actorNames: event.actorNames || [],
            targetNames: event.targetNames || [],
            deltas: event.deltas || [],
            tags: event.tags || [],
            importance: event.importance || 'normal',
            source: event.source || '',
            location: event.location || '',
            time: event.time || '',
            contextSnapshot: event.metadata?.contextSnapshot || null
        }, null);
    },

    envelope(app, event) {
        return this.copy({
            version: this.VERSION,
            eventId: String(event.id),
            exchangeId: String(event.exchangeId || event.metadata?.exchangeId || event.id),
            beat: this.publicBeat(event),
            policy: this.policySnapshot()
        }, null);
    },

    scheduleHook(eventName, envelope) {
        if (!envelope || typeof MODULE_SYSTEM === 'undefined' || !MODULE_SYSTEM?.executePublicHook) return;
        const generation = this.runtimeGeneration;
        let timer = null;
        timer = window.setTimeout(() => {
            this.hookTimers.delete(timer);
            if (generation !== this.runtimeGeneration) return;
            MODULE_SYSTEM.executePublicHook(eventName, envelope).catch(error => {
                console.error(`Narrative hook delivery failed (${eventName}):`, error);
            });
        }, 0);
        this.hookTimers.add(timer);
    },

    resetRuntime(app, { clearRecords = false, reason = 'run-switch' } = {}) {
        this.runtimeGeneration++;
        for (const timer of this.fallbackTimers.values()) window.clearTimeout(timer);
        for (const timer of this.hookTimers) window.clearTimeout(timer);
        this.fallbackTimers.clear();
        this.hookTimers.clear();
        this.closedExchanges.clear();
        this.exchangeOwnership.clear();
        this.exchangeEnvelopes.clear();
        this.operationalErrors.clear();
        if (typeof YAW_AI_PROVIDER_MANAGER !== 'undefined') YAW_AI_PROVIDER_MANAGER.resetRuntime(reason);
        if (clearRecords && app) {
            app.sceneNarrations = [];
            app.tileNarrationCache = [];
        }
        return this.runtimeGeneration;
    },

    onBeatCommitted(app, event) {
        const envelope = this.envelope(app, event);
        this.scheduleHook('onSceneBeat', envelope);
        const exchangeId = envelope?.exchangeId;
        if (!exchangeId) return;
        const isGroupedFlow = event.mode === 'combat' || (event.tags || []).includes('transaction');
        if (isGroupedFlow) return;
        const previous = this.fallbackTimers.get(exchangeId);
        if (previous) window.clearTimeout(previous);
        const timer = window.setTimeout(() => {
            this.fallbackTimers.delete(exchangeId);
            this.closeExchange(app, exchangeId, { reason: 'debounce-fallback' });
        }, 250);
        this.fallbackTimers.set(exchangeId, timer);
    },

    closeExchange(app, exchangeId, options = {}) {
        const id = String(exchangeId || '').trim();
        if (!id) return false;
        const closeKey = `${id}:${String(options.boundaryId || 'final')}`;
        if (this.closedExchanges.has(closeKey)) return false;
        const beats = (app.storyEvents || []).filter(event => String(event.exchangeId || event.metadata?.exchangeId || event.id) === id);
        if (!beats.length) return false;
        const timer = this.fallbackTimers.get(id);
        if (timer) window.clearTimeout(timer);
        this.fallbackTimers.delete(id);
        this.closedExchanges.add(closeKey);
        if (this.closedExchanges.size > 200) this.closedExchanges.delete(this.closedExchanges.values().next().value);
        const envelope = this.copy({
            version: this.VERSION,
            eventId: String(beats[beats.length - 1].id),
            exchangeId: id,
            beatIds: beats.map(beat => String(beat.id)),
            beats: beats.map(beat => this.publicBeat(beat)).filter(Boolean),
            reason: String(options.reason || 'explicit-boundary'),
            policy: this.policySnapshot()
        }, null);
        this.exchangeEnvelopes.set(id, this._boundedExchangeEnvelope(envelope));
        this._resolveClosedExchangeOwnership(id);
        this.scheduleHook('onSceneExchangeClosed', envelope);
        return true;
    },

    notifyPolicyChanged(app, reason = 'settings') {
        const snapshot = this.copy({
            version: this.VERSION,
            eventId: `policy-${Date.now()}`,
            reason: String(reason || 'settings'),
            policy: this.policySnapshot()
        }, null);
        this.scheduleHook('onContentPolicyChanged', snapshot);
        app.renderStoryEvents?.();
        if (typeof YAW_CENTER_CONTEXT !== 'undefined') YAW_CENTER_CONTEXT.refreshPassage?.(app);
        if (typeof YAW_STORY_EVENTS !== 'undefined') YAW_STORY_EVENTS.ensureCurrentTileObservation?.(app);
        return snapshot;
    },

    records(app) {
        if (!Array.isArray(app.sceneNarrations)) app.sceneNarrations = [];
        return app.sceneNarrations;
    },

    tileCache(app) {
        if (!Array.isArray(app.tileNarrationCache)) app.tileNarrationCache = [];
        return app.tileNarrationCache;
    },

    tileDescriptorForTarget(app, scope = 'exchange', targetId = '') {
        const id = String(targetId || '');
        const beats = (app.storyEvents || []).filter(beat => scope === 'beat'
            ? String(beat.id) === id
            : String(beat.exchangeId || beat.metadata?.exchangeId || beat.id) === id);
        const beat = [...beats].reverse().find(item => item?.metadata?.tileNarrativeState?.fingerprint);
        return beat ? {
            beat,
            descriptor: this.copy(beat.metadata.tileNarrativeState),
            wasExplored: Boolean(beat.metadata?.wasExplored)
        } : null;
    },

    normalizeTileCacheEntry(input = {}) {
        const tileKey = String(input.tileKey || '').trim().slice(0, 240);
        const fingerprint = String(input.fingerprint || '').trim().slice(0, 80);
        const variant = String(input.variant || '').trim().slice(0, 160);
        const text = String(input.text || '').replace(/\s+/g, ' ').trim();
        if (!tileKey || !fingerprint || !variant || !text || text.length > this.MAX_TEXT_LENGTH) return null;
        const outputRating = this.ratings.has(String(input.outputRating)) ? String(input.outputRating) : 'safe';
        const contentCategories = [...new Set((Array.isArray(input.contentCategories) ? input.contentCategories : [])
            .map(value => String(value || '').trim())
            .filter(value => value && value.length <= 160 && /^[a-zA-Z0-9_.:-]+$/.test(value)))];
        return {
            tileKey,
            fingerprint,
            variant,
            text,
            ownerModuleId: String(input.ownerModuleId || '').slice(0, 160),
            providerId: String(input.providerId || '').slice(0, 120),
            modelId: String(input.modelId || '').slice(0, 120),
            profileId: String(input.profileId || '').slice(0, 120),
            profileVersion: String(input.profileVersion || '1').slice(0, 40),
            outputRating,
            contentCategories,
            createdAt: Number.isFinite(Number(input.createdAt)) ? Number(input.createdAt) : Date.now(),
            lastUsedAt: Number.isFinite(Number(input.lastUsedAt)) ? Number(input.lastUsedAt) : Date.now()
        };
    },

    getCachedTileNarration(app, ownerModuleId, options = {}) {
        const scope = String(options.scope || 'exchange') === 'beat' ? 'beat' : 'exchange';
        const targetId = String(options.targetId || options.exchangeId || options.beatId || '');
        const target = this.tileDescriptorForTarget(app, scope, targetId);
        if (!target) return null;
        const owner = this.token(ownerModuleId, 'Narration owner');
        const variant = this.token(options.variant, 'Tile narration variant');
        const descriptor = target.descriptor;
        const entry = this.tileCache(app).find(item => item.ownerModuleId === owner
            && item.tileKey === descriptor.tileKey
            && item.fingerprint === descriptor.fingerprint
            && item.variant === variant);
        if (!entry || !this.outputAllowed(entry)) return null;
        entry.lastUsedAt = Date.now();
        app.markAutoSaveDirty?.(['sceneFeed'], 'tile-narration-cache-hit');
        return this.copy(entry);
    },

    cacheTileNarration(app, ownerModuleId, narrationId, options = {}) {
        const owner = this.token(ownerModuleId, 'Narration owner');
        const record = this.records(app).find(item => item.id === String(narrationId) && item.ownerModuleId === owner);
        if (!record || record.status !== 'ready') return null;
        const target = this.tileDescriptorForTarget(app, record.scope, record.targetId);
        if (!target) return null;
        const entry = this.normalizeTileCacheEntry({
            ...record,
            ownerModuleId: owner,
            tileKey: target.descriptor.tileKey,
            fingerprint: target.descriptor.fingerprint,
            variant: this.token(options.variant, 'Tile narration variant'),
            lastUsedAt: Date.now()
        });
        if (!entry) return null;
        const cache = this.tileCache(app);
        const existing = cache.findIndex(item => item.ownerModuleId === entry.ownerModuleId
            && item.tileKey === entry.tileKey
            && item.fingerprint === entry.fingerprint
            && item.variant === entry.variant);
        if (existing >= 0) cache.splice(existing, 1);
        cache.push(entry);
        cache.sort((first, second) => Number(first.lastUsedAt || 0) - Number(second.lastUsedAt || 0));
        if (cache.length > this.MAX_TILE_CACHE) app.tileNarrationCache = cache.slice(-this.MAX_TILE_CACHE);
        app.markAutoSaveDirty?.(['sceneFeed'], 'tile-narration-cache-store');
        return this.copy(entry);
    },

    persistedTileCache(app) {
        return this.tileCache(app).slice(-this.MAX_TILE_CACHE).map(entry => this.copy(entry)).filter(Boolean);
    },

    restoreTileCache(app, entries = []) {
        const next = [];
        for (const input of Array.isArray(entries) ? entries : []) {
            const entry = this.normalizeTileCacheEntry(input);
            if (entry) next.push(entry);
        }
        next.sort((first, second) => Number(first.lastUsedAt || 0) - Number(second.lastUsedAt || 0));
        app.tileNarrationCache = next.slice(-this.MAX_TILE_CACHE);
        return app.tileNarrationCache;
    },

    beatIdsForTarget(app, scope, targetId) {
        if (scope === 'beat') {
            return (app.storyEvents || []).some(beat => String(beat.id) === targetId) ? [targetId] : [];
        }
        return (app.storyEvents || [])
            .filter(beat => String(beat.exchangeId || beat.metadata?.exchangeId || beat.id) === targetId)
            .map(beat => String(beat.id));
    },

    normalizeRecord(app, ownerModuleId, input = {}, previous = null) {
        const owner = this.token(ownerModuleId, 'Narration owner');
        const id = this.token(input.id || previous?.id, 'Narration id');
        const scope = String(input.scope || previous?.scope || 'beat') === 'exchange' ? 'exchange' : 'beat';
        const targetId = this.token(input.targetId || (scope === 'exchange' ? input.exchangeId : input.beatId) || previous?.targetId, 'Narration target');
        const beatIds = this.beatIdsForTarget(app, scope, targetId);
        if (!beatIds.length) throw new Error('Narration target does not exist');
        const status = String(input.status || previous?.status || 'pending');
        if (!this.statuses.has(status)) throw new Error('Narration status is invalid');
        const outputRating = String(input.outputRating || previous?.outputRating || 'safe');
        if (!this.ratings.has(outputRating)) throw new Error('Narration output rating is invalid');
        const text = String(input.text ?? previous?.text ?? '').replace(/\s+/g, ' ').trim();
        if (text.length > this.MAX_TEXT_LENGTH) throw new Error(`Narration text exceeds ${this.MAX_TEXT_LENGTH} characters`);
        if (status === 'ready' && !text) throw new Error('Ready narration requires text');
        const categories = [...new Set((input.contentCategories || previous?.contentCategories || []).map(category => this.token(category, 'Narration category')))];
        if (outputRating === 'explicit' && !categories.includes('explicit.sexual')) categories.push('explicit.sexual');
        return {
            id,
            ownerModuleId: owner,
            scope,
            targetId,
            beatIds,
            exchangeId: scope === 'exchange' ? targetId : String((app.storyEvents || []).find(beat => String(beat.id) === targetId)?.exchangeId || ''),
            status,
            text,
            outputRating,
            contentCategories: categories,
            providerId: String(input.providerId ?? previous?.providerId ?? '').slice(0, 120),
            modelId: String(input.modelId ?? previous?.modelId ?? '').slice(0, 120),
            profileId: String(input.profileId ?? previous?.profileId ?? '').slice(0, 120),
            profileVersion: String(input.profileVersion ?? previous?.profileVersion ?? '1').slice(0, 40),
            createdAt: Number.isFinite(Number(previous?.createdAt)) ? Number(previous.createdAt) : Date.now(),
            errorCode: String(input.errorCode ?? previous?.errorCode ?? '').slice(0, 120),
            errorStatus: Math.max(0, Math.min(599, Number(input.errorStatus ?? previous?.errorStatus) || 0)),
            errorDiagnostic: this.providerDiagnostic(input.errorDiagnostic ?? previous?.errorDiagnostic)
        };
    },

    publish(app, ownerModuleId, input = {}) {
        try {
            const records = this.records(app);
            if (records.some(record => record.id === input.id)) throw new Error('Narration id already exists');
            const record = this.normalizeRecord(app, ownerModuleId, input);
            records.push(record);
            if (record.status === 'pending') this.logLifecycle(app, ownerModuleId, 'queued', record);
            this.changed(app, 'narration-publish');
            return this.copy(record);
        } catch (error) {
            this.logOperationalError(app, ownerModuleId, 'narration_publish_failed');
            throw error;
        }
    },

    update(app, ownerModuleId, id, patch = {}) {
        const records = this.records(app);
        const index = records.findIndex(record => record.id === String(id));
        if (index < 0) throw new Error('Narration record not found');
        const previous = records[index];
        if (previous.ownerModuleId !== ownerModuleId) throw new Error('Module cannot update another module narration');
        const transitions = {
            pending: new Set(['pending', 'ready', 'failed', 'cancelled']),
            ready: new Set(['ready']),
            failed: new Set(['failed', 'pending']),
            cancelled: new Set(['cancelled'])
        };
        const nextStatus = String(patch.status || previous.status);
        if (!transitions[previous.status]?.has(nextStatus)) throw new Error(`Invalid narration status transition ${previous.status} -> ${nextStatus}`);
        const next = this.normalizeRecord(app, ownerModuleId, { ...previous, ...patch, id: previous.id }, previous);
        records[index] = next;
        if (previous.status !== 'failed' && next.status === 'failed') this.logFailure(app, next);
        if (previous.status !== 'ready' && next.status === 'ready') this.logLifecycle(app, ownerModuleId, 'attached', next);
        this.changed(app, 'narration-update');
        return this.copy(next);
    },

    logLifecycle(app, ownerModuleId, stage, details = {}) {
        if (!app || !this.lifecycleStages.has(stage)) return null;
        const owner = String(ownerModuleId || '').slice(0, 160);
        const targetId = String(details.targetId || details.exchangeId || details.beatId || '').slice(0, 160);
        const target = targetId || (app._label ? app._label('scene.narration.lifecycle.currentExchange', 'current exchange') : 'current exchange');
        const messages = {
            queued: ['scene.narration.lifecycle.queued', 'Narration queued for {target}.'],
            request_sent: ['scene.narration.lifecycle.requestSent', 'Narration request sent for {target}.'],
            response_received: ['scene.narration.lifecycle.responseReceived', 'Narration response received for {target}.'],
            attached: ['scene.narration.lifecycle.attached', 'Narration attached to {target}.']
        };
        const [labelKey, fallback] = messages[stage];
        const text = app._label ? app._label(labelKey, fallback, { target }) : fallback.replace('{target}', target);
        const entry = {
            text,
            type: 'narration',
            narrationStage: stage,
            targetId,
            narrationId: String(details.id || details.narrationId || '').slice(0, 160),
            sourceModuleId: owner
        };
        if (typeof app._pushLog === 'function') app._pushLog(entry, 'narration');
        else if (Array.isArray(app.log)) app.log.push(entry);
        app.markAutoSaveDirty?.(['activityLog'], 'narration-lifecycle');
        app.renderLog?.();
        return entry;
    },

    logFailure(app, record) {
        const code = String(record?.errorCode || 'provider_error').trim().slice(0, 80) || 'provider_error';
        const diagnostic = this.providerDiagnosticSummary(record?.errorStatus, record?.errorDiagnostic);
        const failureCode = diagnostic ? `${code}; ${diagnostic}` : code;
        const baseText = app._label
            ? app._label('scene.narration.failed', 'Narration failed ({code}). Test the selected connection in AI Providers.', { code: failureCode })
            : `Narration failed (${failureCode}). Test the selected connection in AI Providers.`;
        const reasoningBudgetExhausted = code === 'invalid_response'
            && record?.errorDiagnostic?.finishReason === 'length'
            && record?.errorDiagnostic?.reasoningPresent === true;
        const advice = reasoningBudgetExhausted
            ? (app._label
                ? app._label('scene.narration.reasoningBudgetExhausted', 'The model exhausted its completion budget in reasoning. Increase the provider completion-token ceiling, reduce reasoning, or choose a non-reasoning model.')
                : 'The model exhausted its completion budget in reasoning. Increase the provider completion-token ceiling, reduce reasoning, or choose a non-reasoning model.')
            : '';
        const text = [baseText, advice].filter(Boolean).join(' ');
        const entry = {
            text,
            type: 'error',
            errorCode: code,
            httpStatus: Number(record?.errorStatus) || 0,
            providerDiagnostic: this.providerDiagnostic(record?.errorDiagnostic),
            narrationId: String(record?.id || '').slice(0, 160),
            sourceModuleId: String(record?.ownerModuleId || '').slice(0, 160)
        };
        if (typeof app._pushLog === 'function') app._pushLog(entry, 'error');
        else if (Array.isArray(app.log)) app.log.push(entry);
        app.markAutoSaveDirty?.(['activityLog'], 'narration-error');
        app.renderLog?.();
        return entry;
    },

    logOperationalError(app, ownerModuleId, code) {
        const owner = String(ownerModuleId || '').slice(0, 160);
        const errorCode = String(code || 'narration_unavailable').slice(0, 80);
        const dedupeKey = `${owner}:${errorCode}`;
        if (this.operationalErrors.has(dedupeKey)) return null;
        this.operationalErrors.add(dedupeKey);
        const messages = {
            provider_connection_not_selected: ['scene.narration.providerNotSelected', 'Narration is enabled, but no provider connection is selected. Open the narrator Settings.'],
            provider_connection_unavailable: ['scene.narration.providerUnavailable', 'The selected narration provider is unavailable. Reconnect it in AI Providers.'],
            narration_publish_failed: ['scene.narration.publishFailed', 'Narration could not attach a pending record to the scene exchange.']
        };
        const [labelKey, fallback] = messages[errorCode] || ['scene.narration.unavailable', 'Narration is unavailable ({code}). Check the narrator Settings and AI Providers.'];
        const text = app._label ? app._label(labelKey, fallback, { code: errorCode }) : fallback.replace('{code}', errorCode);
        const entry = { text, type: 'error', errorCode, sourceModuleId: owner };
        if (typeof app._pushLog === 'function') app._pushLog(entry, 'error');
        else if (Array.isArray(app.log)) app.log.push(entry);
        app.markAutoSaveDirty?.(['activityLog'], 'narration-error');
        app.renderLog?.();
        return entry;
    },

    clearOperationalErrors(ownerModuleId) {
        const prefix = `${String(ownerModuleId || '')}:`;
        for (const key of this.operationalErrors) {
            if (key.startsWith(prefix)) this.operationalErrors.delete(key);
        }
    },

    remove(app, ownerModuleId, id) {
        const records = this.records(app);
        const index = records.findIndex(record => record.id === String(id));
        if (index < 0) return false;
        if (records[index].ownerModuleId !== ownerModuleId) throw new Error('Module cannot remove another module narration');
        records.splice(index, 1);
        this.changed(app, 'narration-remove');
        return true;
    },

    removeOwner(app, ownerModuleId) {
        const records = this.records(app);
        const next = records.filter(record => record.ownerModuleId !== ownerModuleId);
        if (next.length === records.length) return false;
        app.sceneNarrations = next;
        this.changed(app, 'narration-owner-unload');
        return true;
    },

    clearOwner(app, ownerModuleId) {
        return this.removeOwner(app, ownerModuleId);
    },

    discardTarget(app, event = null) {
        if (!event) return false;
        const beatId = String(event.id || '');
        const exchangeId = String(event.exchangeId || event.metadata?.exchangeId || beatId);
        const records = this.records(app);
        const next = records.filter(record => !((record.scope === 'beat' && record.targetId === beatId)
            || (record.scope === 'exchange' && record.targetId === exchangeId)));
        if (next.length === records.length) return false;
        app.sceneNarrations = next;
        return true;
    },

    changed(app, reason) {
        app.markAutoSaveDirty?.(['sceneFeed'], reason);
        app.renderStoryEvents?.();
        if (typeof YAW_CENTER_CONTEXT !== 'undefined') YAW_CENTER_CONTEXT.refreshPassage?.(app);
    },

    persistedRecords(app) {
        return this.records(app)
            .filter(record => record.status === 'ready' || record.status === 'failed' || record.status === 'cancelled')
            .map(record => this.copy(record))
            .filter(Boolean);
    },

    restore(app, records = [], tileCache = []) {
        app.sceneNarrations = [];
        for (const input of Array.isArray(records) ? records : []) {
            if (input?.status === 'pending') continue;
            try {
                const record = this.normalizeRecord(app, input.ownerModuleId, input, input);
                app.sceneNarrations.push(record);
            } catch (e) {}
        }
        this.restoreTileCache(app, tileCache);
        return app.sceneNarrations;
    },

    visibleFor(app, scope, targetId) {
        const policy = this.policySnapshot();
        return this.records(app).filter(record => record.scope === scope
            && record.targetId === String(targetId)
            && this.outputAllowed(record, policy));
    },

    hasReadyNarration(app, scope, targetId) {
        return this.visibleFor(app, scope, targetId).some(record => record.status === 'ready');
    },

    currentTileNarration(app) {
        if (!app || app.inInterior || app.combatState?.active || typeof YAW_STORY_EVENTS === 'undefined') return null;
        const tile = app._currentExplorationTile?.() || app.getTile?.(app.location?.x || 0, app.location?.y || 0);
        if (!tile) return null;
        const beat = [...(app.storyEvents || [])].reverse().find(event => {
            const eventTile = event?.metadata?.tile;
            return event?.metadata?.tileNarrativeState?.fingerprint
                && Number(eventTile?.x) === Number(tile.x)
                && Number(eventTile?.y) === Number(tile.y);
        });
        if (!beat) return null;
        const descriptor = YAW_STORY_EVENTS.tileNarrativeDescriptor(app, tile, {
            wasExplored: Boolean(beat.metadata?.wasExplored)
        });
        if (!descriptor
            || descriptor.tileKey !== beat.metadata.tileNarrativeState.tileKey
            || descriptor.fingerprint !== beat.metadata.tileNarrativeState.fingerprint) return null;
        const exchangeId = String(beat.exchangeId || beat.metadata?.exchangeId || beat.id);
        const candidates = this.records(app).filter(record => record.status === 'ready'
            && this.outputAllowed(record)
            && ((record.scope === 'exchange' && record.targetId === exchangeId)
                || (record.scope === 'beat' && record.targetId === String(beat.id))));
        return candidates.length ? this.copy(candidates[candidates.length - 1]) : null;
    },

    narrationHtml(app, scope, targetId, { detailed = false } = {}) {
        return this.visibleFor(app, scope, targetId).map(record => {
            if (record.status === 'pending') {
                return `<aside class="scene-narration pending" data-narration-id="${app._escapeHtml(record.id)}" aria-label="${app._escapeHtml(app._label('scene.narration.pending', 'Narration pending'))}"><span>${app._escapeHtml(app._label('scene.narration.pending', 'Narration pending'))}</span></aside>`;
            }
            if (record.status !== 'ready') return '';
            const provider = [record.providerId, record.modelId].filter(Boolean).join(' / ');
            const attribution = provider || record.ownerModuleId;
            return `<aside class="scene-narration ready" data-narration-id="${app._escapeHtml(record.id)}" data-narration-rating="${app._escapeHtml(record.outputRating)}"><p>${app._escapeHtml(record.text)}</p><small>${app._escapeHtml(app._label('scene.narration.attribution', 'Narration by {provider}', { provider: attribution }))}</small>${detailed && record.profileId ? `<span>${app._escapeHtml(record.profileId)}</span>` : ''}</aside>`;
        }).join('');
    },

    registerContextExtension(ownerModuleId, extension = {}) {
        const owner = this.token(ownerModuleId, 'Context extension owner');
        const id = this.token(extension.id, 'Context extension id');
        if (typeof extension.build !== 'function') throw new Error('Narration context extension requires a build function');
        const category = extension.category ? this.token(extension.category, 'Context extension category') : '';
        const key = `${owner}:${id}`;
        this.contextExtensions.set(key, { ownerModuleId: owner, id, category, build: extension.build });
        return key;
    },

    removeContextExtensions(ownerModuleId) {
        for (const [key, extension] of this.contextExtensions.entries()) {
            if (extension.ownerModuleId === ownerModuleId) this.contextExtensions.delete(key);
        }
    },

    registerOrchestrator(ownerModuleId, input = {}) {
        const owner = this.token(ownerModuleId, 'Orchestrator owner');
        const id = this.token(input.id || owner, 'Orchestrator id');
        const requiredCategories = [...new Set((input.requiredCategories || []).map(category => this.token(category, 'Orchestrator category')))];
        if (input.isActive !== undefined && input.isActive !== null && typeof input.isActive !== 'function') {
            throw new Error('Orchestrator isActive must be a function');
        }
        if (input.claimsExchange !== undefined && input.claimsExchange !== null && typeof input.claimsExchange !== 'function') {
            throw new Error('Orchestrator claimsExchange must be a function');
        }
        const record = {
            ownerModuleId: owner,
            id,
            priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : 0,
            minPosture: input.minPosture === 'mature' ? 'mature' : 'sfw',
            requiredCategories,
            isActive: typeof input.isActive === 'function' ? input.isActive : null,
            claimsExchange: typeof input.claimsExchange === 'function' ? input.claimsExchange : null
        };
        this.orchestrators.set(`${owner}:${id}`, record);
        return this.copy({ ...record, isActive: undefined, claimsExchange: undefined });
    },

    removeOrchestrators(ownerModuleId) {
        for (const [key, orchestrator] of this.orchestrators.entries()) {
            if (orchestrator.ownerModuleId === ownerModuleId) this.orchestrators.delete(key);
        }
        this.clearOperationalErrors(ownerModuleId);
    },

    async orchestrationOwner(policy = this.policySnapshot()) {
        const candidates = [...this.orchestrators.values()]
            .filter(orchestrator => orchestrator.minPosture !== 'mature' || policy.posture === 'mature')
            .filter(orchestrator => orchestrator.requiredCategories.every(category => policy.enabledCategories.includes(category)))
            .sort((left, right) => (right.priority - left.priority)
                || left.ownerModuleId.localeCompare(right.ownerModuleId)
                || left.id.localeCompare(right.id));
        for (const orchestrator of candidates) {
            if (!orchestrator.isActive) return orchestrator;
            try {
                if (await orchestrator.isActive(this.copy(policy, {}))) return orchestrator;
            } catch (error) {
                console.error(`Narration orchestrator readiness failed (${orchestrator.id}):`, error);
            }
        }
        return null;
    },

    async ownsOrchestration(ownerModuleId, policy = this.policySnapshot()) {
        return (await this.orchestrationOwner(policy))?.ownerModuleId === String(ownerModuleId);
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.freeze(value);
        Object.values(value).forEach(child => this._deepFreeze(child));
        return value;
    },

    _boundedExchangeEnvelope(envelope = {}) {
        const source = envelope && typeof envelope === 'object' ? envelope : {};
        const beats = (Array.isArray(source.beats) ? source.beats : [])
            .slice(-this.MAX_CONTEXT_BEATS)
            .map(beat => this.copy(beat, null))
            .filter(Boolean);
        return this.copy({
            version: source.version ?? this.VERSION,
            eventId: String(source.eventId || ''),
            exchangeId: String(source.exchangeId || ''),
            beatIds: (Array.isArray(source.beatIds) ? source.beatIds : []).map(String).slice(-this.MAX_CONTEXT_BEATS),
            beats,
            reason: String(source.reason || ''),
            policy: this.copy(source.policy || this.policySnapshot(), this.policySnapshot())
        }, null);
    },

    async _claimsExchange(orchestrator, frozenEnvelope) {
        if (orchestrator.claimsExchange == null) return true;
        if (typeof orchestrator.claimsExchange !== 'function') {
            console.error(`Narration exchange claim skipped (${orchestrator.id}): claimsExchange must be a function`);
            return false;
        }
        try {
            return (await orchestrator.claimsExchange(frozenEnvelope)) === true;
        } catch (error) {
            console.error(`Narration exchange claim failed (${orchestrator.id}):`, error);
            return false;
        }
    },

    async _exchangeOwnerFromCandidates(orchestrators, envelope, policy) {
        const frozenEnvelope = this._deepFreeze(this._boundedExchangeEnvelope(envelope));
        const candidates = orchestrators
            .filter(orchestrator => orchestrator.minPosture !== 'mature' || policy.posture === 'mature')
            .filter(orchestrator => orchestrator.requiredCategories.every(category => policy.enabledCategories.includes(category)))
            .sort((left, right) => (right.priority - left.priority)
                || left.ownerModuleId.localeCompare(right.ownerModuleId)
                || left.id.localeCompare(right.id));
        for (const orchestrator of candidates) {
            if (orchestrator.isActive) {
                let active = false;
                try {
                    active = (await orchestrator.isActive(this.copy(policy, {}))) === true;
                } catch (error) {
                    console.error(`Narration orchestrator readiness failed (${orchestrator.id}):`, error);
                }
                if (!active) continue;
            }
            if (!(await this._claimsExchange(orchestrator, frozenEnvelope))) continue;
            return { ownerModuleId: orchestrator.ownerModuleId, orchestratorId: orchestrator.id };
        }
        return null;
    },

    _resolveClosedExchangeOwnership(exchangeId) {
        const id = String(exchangeId || '').trim();
        if (!id) return Promise.resolve(null);
        if (this.exchangeOwnership.has(id)) return this.exchangeOwnership.get(id);
        const canonical = this.exchangeEnvelopes.get(id) || null;
        if (!canonical) return Promise.resolve(null);
        const orchestrators = [...this.orchestrators.values()];
        const policySnapshot = this.copy(canonical.policy, this.policySnapshot());
        const promise = this._exchangeOwnerFromCandidates(orchestrators, canonical, policySnapshot)
            .catch(error => {
                console.error(`Narration exchange ownership failed (${id}):`, error);
                return null;
            });
        this.exchangeOwnership.set(id, promise);
        if (this.exchangeOwnership.size > 200) this.exchangeOwnership.delete(this.exchangeOwnership.keys().next().value);
        if (this.exchangeEnvelopes.size > 200) this.exchangeEnvelopes.delete(this.exchangeEnvelopes.keys().next().value);
        return promise;
    },

    async exchangeOwner(exchangeId) {
        const id = String(exchangeId || '').trim();
        if (!id || !this.exchangeOwnership.has(id)) return null;
        return this.exchangeOwnership.get(id);
    },

    async ownsExchange(ownerModuleId, envelope = {}) {
        const exchangeId = String(envelope?.exchangeId || '').trim();
        if (!exchangeId) return this.ownsOrchestration(ownerModuleId, envelope?.policy || this.policySnapshot());
        const owner = await this.exchangeOwner(exchangeId);
        return owner?.ownerModuleId === String(ownerModuleId);
    },

    targetContextSnapshot(targets = []) {
        const target = targets[targets.length - 1] || {};
        const recorded = target.metadata?.contextSnapshot || {};
        const location = recorded.location || {};
        const time = recorded.time || {};
        return {
            mode: String(recorded.mode || target.mode || 'adventure'),
            location: {
                x: Number.isFinite(Number(location.x)) ? Number(location.x) : null,
                y: Number.isFinite(Number(location.y)) ? Number(location.y) : null,
                biome: String(location.biome || ''),
                label: String(location.label || target.location || ''),
                time: String(time.label || target.time || ''),
                hour: Number.isFinite(Number(time.hour)) ? Number(time.hour) : null,
                day: Number.isFinite(Number(time.day)) ? Number(time.day) : null
            }
        };
    },

    unitIdentity(unit) {
        return String(unit?.id || unit?.name || '').trim().slice(0, 160);
    },

    viewpointContext(app, targets = [], publicUnit = () => null) {
        const recorded = targets[targets.length - 1]?.metadata?.contextSnapshot?.viewpoint || {};
        const recordedId = String(recorded.playerId || '').trim().slice(0, 160);
        const livePlayerId = this.unitIdentity(app?.player);
        const playerId = recordedId || livePlayerId;
        const participants = targets.flatMap(beat => [...(beat.actors || []), ...(beat.targets || [])]);
        const participant = participants.find(unit => this.unitIdentity(unit) === playerId);
        const livePlayer = livePlayerId === playerId ? app?.player : null;
        const playerSource = livePlayer || participant;
        let player = playerSource ? publicUnit(playerSource) : null;
        if (!player && playerId) {
            player = {
                id: playerId,
                name: String(recorded.playerName || '').trim().slice(0, 160)
            };
        }
        const beatRoles = targets.map(beat => {
            if (!playerId) return { beatId: String(beat.id || ''), participation: 'unknown' };
            const isActor = (beat.actors || []).some(unit => this.unitIdentity(unit) === playerId);
            const isTarget = (beat.targets || []).some(unit => this.unitIdentity(unit) === playerId);
            const participation = isActor && isTarget
                ? 'self'
                : (isActor ? 'actor' : (isTarget ? 'target' : 'observer'));
            return { beatId: String(beat.id || ''), participation };
        });
        const roles = [...new Set(beatRoles.map(beat => beat.participation))];
        return {
            mode: 'player',
            player: player || null,
            participation: roles.length === 1 ? roles[0] : (roles.length > 1 ? 'mixed' : 'unknown'),
            beatRoles
        };
    },

    context(app, options = {}) {
        const beatLimit = Math.max(1, Math.min(this.MAX_CONTEXT_BEATS, Number(options.recentBeatLimit) || 6));
        const activityLimit = Math.max(0, Math.min(this.MAX_ACTIVITY, Number(options.activityLimit) || 6));
        const beatId = String(options.beatId || '').trim();
        const exchangeId = String(options.exchangeId || '').trim();
        const allBeats = app.storyEvents || [];
        const targets = beatId
            ? allBeats.filter(beat => String(beat.id) === beatId)
            : exchangeId
                ? allBeats.filter(beat => String(beat.exchangeId || beat.metadata?.exchangeId || beat.id) === exchangeId)
                : [];
        if (!targets.length) throw new Error('Narration context target not found');
        const targetEndIndex = Math.max(...targets.map(target => allBeats.indexOf(target)));
        const targetSnapshot = this.targetContextSnapshot(targets);
        const publicUnit = unit => typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM?._publicNarrativeUnitSummary
            ? MODULE_SYSTEM._publicNarrativeUnitSummary(unit)
            : null;
        const viewpoint = this.viewpointContext(app, targets, publicUnit);
        const unitsById = new Map();
        targets.flatMap(beat => [...(beat.actors || []), ...(beat.targets || [])]).forEach(unit => {
            const summary = publicUnit(unit);
            if (summary?.id) unitsById.set(summary.id, summary);
        });
        const units = [...unitsById.values()];
        const base = {
            version: this.VERSION,
            target: { beatId: beatId || null, exchangeId: exchangeId || targets[0]?.exchangeId || null },
            policy: this.policySnapshot(),
            mode: targetSnapshot.mode,
            location: targetSnapshot.location,
            viewpoint,
            beats: targets.map(beat => this.publicBeat(beat)).filter(Boolean),
            recentBeats: allBeats.slice(0, targetEndIndex + 1).slice(-beatLimit).map(beat => this.publicBeat(beat)).filter(Boolean),
            characters: units,
            quests: (app.quests || []).slice(0, 6).map(quest => typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM._publicQuestSummary(quest) : null).filter(Boolean),
            activity: (app.log || [])
                .filter(entry => !['narration', 'error', 'mod'].includes(String(entry?.type || '')))
                .slice(-activityLimit)
                .map(entry => typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM._publicActivitySummary(entry) : null)
                .filter(Boolean),
            extensions: {}
        };
        for (const extension of this.contextExtensions.values()) {
            if (extension.category && !base.policy.enabledCategories.includes(extension.category)) continue;
            try {
                const value = extension.build(this.copy(base));
                const copy = this.copy(value, null);
                if (copy !== null) base.extensions[extension.id] = copy;
            } catch (e) {
                console.error(`Narration context extension failed (${extension.id}):`, e);
            }
        }
        return this.copy(base, {});
    }
};

const YAW_AI_PROVIDER_MANAGER = (() => {
    const credentialVault = new Map();
    const PROFILE_STORAGE_KEY = 'yaw.ai.providerProfiles.v1';
    const MAX_INSTRUCTIONS_LENGTH = 2000;
    const capabilityAliases = new Map([
        ['narration', 'text.generate'],
        ['text', 'text.generate']
    ]);

    const manager = {
        adapters: new Map(),
        profiles: new Map(),
        connections: new Map(),
        requestsByModule: new Map(),
        requestsByConnection: new Map(),
        connectionSeq: 0,
        profilesRestored: false,
        MAX_INSTRUCTIONS_LENGTH,

        token(value, label) {
            return YAW_NARRATION_SYSTEM.token(value, label);
        },

        normalizeCapability(value = 'text.generate') {
            const aliased = capabilityAliases.get(String(value || '').trim()) || String(value || '').trim();
            if (!/^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/.test(aliased)) throw new Error('Invalid AI capability');
            return aliased;
        },

        normalizeInstructions(value = '') {
            if (value === null || value === undefined) return '';
            if (typeof value !== 'string') throw new Error('AI instructions must be text');
            const normalized = value.replace(/\r\n?/g, '\n').trim();
            if (normalized.length > MAX_INSTRUCTIONS_LENGTH) {
                throw new Error(`AI instructions exceed ${MAX_INSTRUCTIONS_LENGTH} characters`);
            }
            if (this.credentialLikeValue(normalized)) throw new Error('AI instructions cannot contain credentials');
            return normalized;
        },

        credentialLikeName(value) {
            const compact = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return [
                'apikey', 'accesskey', 'accesstoken', 'refreshtoken', 'authtoken', 'authorization',
                'bearertoken', 'token', 'password', 'passwd', 'secret', 'clientsecret', 'privatekey', 'credential'
            ].some(token => compact === token || compact.endsWith(token));
        },

        credentialLikeValue(value, seen = new Set()) {
            if (typeof value === 'string') {
                const text = value.trim();
                return /^(?:bearer|basic)\s+\S+/i.test(text)
                    || /^sk-(?:or-v1-)?[a-z0-9_-]{8,}$/i.test(text)
                    || /^-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text);
            }
            if (!value || typeof value !== 'object' || seen.has(value)) return false;
            seen.add(value);
            if (Array.isArray(value)) return value.some(item => this.credentialLikeValue(item, seen));
            return Object.entries(value).some(([key, child]) => this.credentialLikeName(key) || this.credentialLikeValue(child, seen));
        },

        safeMetadata(value = {}) {
            const copied = YAW_NARRATION_SYSTEM.copy(value, null);
            if (!copied || typeof copied !== 'object' || Array.isArray(copied)) throw new Error('Provider metadata must be serializable data');
            if (this.credentialLikeValue(copied)) throw new Error('Provider connection metadata cannot contain credentials');
            return copied;
        },

        storage() {
            try { return window.localStorage || null; } catch (error) { return null; }
        },

        restoreProfiles() {
            if (this.profilesRestored) return this.profiles.size;
            this.profilesRestored = true;
            const storage = this.storage();
            if (!storage) return 0;
            try {
                const records = JSON.parse(storage.getItem(PROFILE_STORAGE_KEY) || '[]');
                for (const record of Array.isArray(records) ? records : []) {
                    const providerId = String(record?.providerId || '');
                    const id = String(record?.id || '');
                    if (!providerId || !id || record?.persisted !== true) continue;
                    const metadata = this.safeMetadata(record.metadata || {});
                    const capabilities = (record.capabilities || ['text.generate']).map(value => this.normalizeCapability(value));
                    this.profiles.set(id, {
                        id,
                        providerId,
                        ownerModuleId: String(record.ownerModuleId || 'core'),
                        name: String(record.name || providerId).slice(0, 120),
                        capabilities: [...new Set(capabilities)],
                        metadata,
                        persisted: true,
                        createdAt: Number(record.createdAt) || Date.now(),
                        updatedAt: Number(record.updatedAt) || Date.now()
                    });
                }
            } catch (error) {
                console.warn('Provider profiles could not be restored');
            }
            return this.profiles.size;
        },

        persistProfiles() {
            const storage = this.storage();
            if (!storage) return false;
            const records = [...this.profiles.values()]
                .filter(profile => profile.persisted)
                .map(profile => ({
                    id: profile.id,
                    providerId: profile.providerId,
                    ownerModuleId: profile.ownerModuleId,
                    name: profile.name,
                    capabilities: [...profile.capabilities],
                    metadata: YAW_NARRATION_SYSTEM.copy(profile.metadata, {}),
                    persisted: true,
                    createdAt: profile.createdAt,
                    updatedAt: profile.updatedAt
                }));
            try {
                storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(records));
                return true;
            } catch (error) {
                console.warn('Provider profiles could not be persisted');
                return false;
            }
        },

        registerAdapter(providerId, adapter, ownerModuleId = 'core') {
            this.restoreProfiles();
            const id = this.token(providerId, 'AI provider id');
            const invoke = adapter?.invoke || adapter?.generate;
            if (typeof invoke !== 'function') throw new Error('AI provider adapter requires invoke() or generate()');
            const existing = this.adapters.get(id);
            if (existing && existing.ownerModuleId !== ownerModuleId) throw new Error('AI provider id is already registered');
            const capabilities = [...new Set((adapter.capabilities || ['text.generate']).map(value => this.normalizeCapability(value)))];
            this.adapters.set(id, {
                id,
                ownerModuleId,
                name: String(adapter.name || id).slice(0, 120),
                description: String(adapter.description || '').slice(0, 300),
                capabilities,
                invoke,
                authorize: typeof adapter.authorize === 'function' ? adapter.authorize : null
            });
            return id;
        },

        listProviders() {
            this.restoreProfiles();
            return [...this.adapters.values()].map(adapter => ({
                id: adapter.id,
                name: adapter.name,
                description: adapter.description,
                capabilities: [...adapter.capabilities]
            }));
        },

        unregisterOwner(ownerModuleId) {
            for (const [id, adapter] of this.adapters.entries()) {
                if (adapter.ownerModuleId === ownerModuleId) this.adapters.delete(id);
            }
            for (const profile of [...this.profiles.values()]) {
                if (profile.ownerModuleId === ownerModuleId) this.removeProfile(profile.id);
            }
            this.abortModule(ownerModuleId);
        },

        profileId() {
            return `connection-${++this.connectionSeq}-${Date.now()}`;
        },

        upsertProfile(input = {}) {
            this.restoreProfiles();
            const provider = this.adapters.get(String(input.providerId || ''));
            if (!provider) throw new Error('AI provider is not registered');
            const id = input.id ? this.token(input.id, 'AI provider profile id') : this.profileId();
            const existing = this.profiles.get(id);
            if (existing && existing.providerId !== provider.id) throw new Error('Provider profile cannot change providers');
            const now = Date.now();
            const profile = {
                id,
                providerId: provider.id,
                ownerModuleId: provider.ownerModuleId,
                name: String(input.name || existing?.name || provider.name).trim().slice(0, 120) || provider.name,
                capabilities: [...provider.capabilities],
                metadata: this.safeMetadata(input.metadata ?? existing?.metadata ?? {}),
                persisted: input.persisted ?? existing?.persisted ?? true,
                createdAt: existing?.createdAt || now,
                updatedAt: now
            };
            this.profiles.set(id, profile);
            this.persistProfiles();
            if (this.connections.has(id)) {
                const connection = this.connections.get(id);
                connection.name = profile.name;
                connection.metadata = YAW_NARRATION_SYSTEM.copy(profile.metadata, {});
                connection.capabilities = [...profile.capabilities];
            }
            return id;
        },

        updateProfileMetadata(profileId, patch = {}) {
            const profile = this.profiles.get(String(profileId));
            if (!profile) throw new Error('AI provider profile is unavailable');
            return this.upsertProfile({
                ...profile,
                metadata: { ...profile.metadata, ...this.safeMetadata(patch) }
            });
        },

        connectProfile(profileId, credential = undefined) {
            const id = String(profileId);
            const profile = this.profiles.get(id);
            if (!profile || !this.adapters.has(profile.providerId)) throw new Error('AI provider profile is unavailable');
            if (credential !== undefined) credentialVault.set(id, credential);
            this.connections.set(id, {
                id,
                providerId: profile.providerId,
                ownerModuleId: profile.ownerModuleId,
                name: profile.name,
                capabilities: [...profile.capabilities],
                metadata: YAW_NARRATION_SYSTEM.copy(profile.metadata, {}),
                createdAt: Date.now()
            });
            return id;
        },

        createConnection(providerId, metadata = {}) {
            const id = this.upsertProfile({ providerId, metadata, persisted: false });
            return this.connectProfile(id);
        },

        abortConnection(connectionId, reason = 'provider-disconnect') {
            const id = String(connectionId);
            for (const controller of this.requestsByConnection.get(id) || []) controller.abort(reason);
            this.requestsByConnection.delete(id);
        },

        disconnectProfile(profileId, { clearCredential = true } = {}) {
            const id = String(profileId);
            this.abortConnection(id);
            if (clearCredential) credentialVault.delete(id);
            return this.connections.delete(id);
        },

        removeConnection(connectionId) {
            const id = String(connectionId);
            const profile = this.profiles.get(id);
            const removed = this.disconnectProfile(id);
            if (profile && !profile.persisted) this.profiles.delete(id);
            return removed;
        },

        removeProfile(profileId) {
            const id = String(profileId);
            this.disconnectProfile(id);
            const removed = this.profiles.delete(id);
            this.persistProfiles();
            return removed;
        },

        removeOwnedConnection(ownerModuleId, connectionId) {
            const connection = this.connections.get(String(connectionId));
            if (!connection || connection.ownerModuleId !== ownerModuleId) return false;
            return this.removeConnection(connection.id);
        },

        profileSnapshot(profile) {
            const adapter = this.adapters.get(profile.providerId);
            return {
                id: profile.id,
                providerId: profile.providerId,
                providerName: adapter?.name || profile.providerId,
                name: profile.name,
                capabilities: [...profile.capabilities],
                metadata: YAW_NARRATION_SYSTEM.copy(profile.metadata, {}),
                connected: this.connections.has(profile.id),
                credentialPresent: credentialVault.has(profile.id),
                persisted: profile.persisted
            };
        },

        listProfiles(providerId = '', requesterModuleId = '') {
            this.restoreProfiles();
            return [...this.profiles.values()]
                .filter(profile => !providerId || profile.providerId === providerId)
                .filter(profile => {
                    if (!requesterModuleId) return true;
                    const adapter = this.adapters.get(profile.providerId);
                    return !adapter?.authorize || adapter.authorize({
                        ownerModuleId: requesterModuleId,
                        capability: profile.capabilities[0] || 'text.generate',
                        connection: {
                            id: profile.id,
                            providerId: profile.providerId,
                            metadata: YAW_NARRATION_SYSTEM.copy(profile.metadata, {})
                        }
                    }) === true;
                })
                .map(profile => this.profileSnapshot(profile));
        },

        listConnections(capability = '', requesterModuleId = '') {
            const required = capability ? this.normalizeCapability(capability) : '';
            return [...this.connections.values()]
                .filter(connection => !required || connection.capabilities.includes(required))
                .filter(connection => {
                    if (!requesterModuleId) return true;
                    const adapter = this.adapters.get(connection.providerId);
                    return !adapter?.authorize || adapter.authorize({
                        ownerModuleId: requesterModuleId,
                        capability: required || connection.capabilities[0] || 'text.generate',
                        connection: {
                            id: connection.id,
                            providerId: connection.providerId,
                            metadata: YAW_NARRATION_SYSTEM.copy(connection.metadata, {})
                        }
                    }) === true;
                })
                .map(connection => ({
                    id: connection.id,
                    providerId: connection.providerId,
                    providerName: this.adapters.get(connection.providerId)?.name || connection.providerId,
                    name: connection.name,
                    capabilities: [...connection.capabilities]
                }));
        },

        async invoke(ownerModuleId, request = {}, lifecycle = {}) {
            const capability = this.normalizeCapability(request.capability || 'text.generate');
            const connection = this.connections.get(String(request.providerConnectionId || request.connectionId || ''));
            if (!connection) throw new Error('AI provider connection is unavailable');
            const adapter = this.adapters.get(connection.providerId);
            if (!adapter || !connection.capabilities.includes(capability)) throw new Error('AI provider capability is unavailable');
            if (adapter.authorize && adapter.authorize({
                ownerModuleId,
                capability,
                connection: {
                    id: connection.id,
                    providerId: connection.providerId,
                    metadata: YAW_NARRATION_SYSTEM.copy(connection.metadata, {})
                }
            }) !== true) {
                throw new Error('AI provider connection is not authorized for this module');
            }
            const input = YAW_NARRATION_SYSTEM.copy(request.input, null);
            if (!input) throw new Error('AI request input must be serializable');
            const instructions = this.normalizeInstructions(request.instructions);
            const maxCharacters = Math.max(80, Math.min(YAW_NARRATION_SYSTEM.MAX_TEXT_LENGTH, Number(request.maxCharacters) || YAW_NARRATION_SYSTEM.MAX_TEXT_LENGTH));
            const controller = new AbortController();
            const externalSignal = request.signal;
            const abortExternal = () => controller.abort(externalSignal?.reason || 'cancelled');
            if (externalSignal?.aborted) abortExternal();
            else externalSignal?.addEventListener?.('abort', abortExternal, { once: true });
            const profileTimeout = Number(connection.metadata?.timeoutMs) || 12000;
            const timeoutMs = Math.max(1000, Math.min(30000, Number(request.timeoutMs) || profileTimeout || 12000));
            const timeout = window.setTimeout(() => controller.abort('timeout'), timeoutMs);
            if (!this.requestsByModule.has(ownerModuleId)) this.requestsByModule.set(ownerModuleId, new Set());
            this.requestsByModule.get(ownerModuleId).add(controller);
            if (!this.requestsByConnection.has(connection.id)) this.requestsByConnection.set(connection.id, new Set());
            this.requestsByConnection.get(connection.id).add(controller);
            const narrationTarget = String(request.input?.context?.target?.exchangeId
                || request.input?.context?.target?.beatId
                || request.input?.exchangeId
                || '').slice(0, 160);
            try {
                if (lifecycle.narration) YAW_NARRATION_SYSTEM.logLifecycle(window.App, ownerModuleId, 'request_sent', { targetId: narrationTarget });
                const result = await adapter.invoke({
                    ownerModuleId,
                    capability,
                    profileId: String(request.profileId || ''),
                    instructions,
                    input,
                    maxCharacters,
                    credential: credentialVault.get(connection.id),
                    connection: { id: connection.id, metadata: YAW_NARRATION_SYSTEM.copy(connection.metadata, {}) },
                    signal: controller.signal
                });
                if (capability !== 'text.generate') return YAW_NARRATION_SYSTEM.copy(result, {});
                let text = String(result?.text || '').replace(/\s+/g, ' ').trim();
                if (!text) throw new Error('AI provider returned empty text');
                if (text.length > maxCharacters) {
                    const candidate = text.slice(0, maxCharacters + 1);
                    const sentenceEnd = Math.max(candidate.lastIndexOf('. '), candidate.lastIndexOf('! '), candidate.lastIndexOf('? '));
                    const wordEnd = candidate.lastIndexOf(' ');
                    const cut = sentenceEnd >= Math.floor(maxCharacters * 0.6) ? sentenceEnd + 1 : wordEnd;
                    text = candidate.slice(0, cut > 0 ? cut : maxCharacters).trim();
                }
                const output = {
                    text,
                    providerId: connection.providerId,
                    modelId: String(result?.modelId || '').slice(0, 120),
                    protocol: String(result?.protocol || '').slice(0, 40),
                    endpoint: String(result?.endpoint || '').slice(0, 500),
                    endpointReached: result?.endpointReached === true,
                    authenticationAccepted: result?.authenticationAccepted === true,
                    modelAccepted: result?.modelAccepted === true,
                    usage: YAW_NARRATION_SYSTEM.copy(result?.usage || null, null)
                };
                if (lifecycle.narration) YAW_NARRATION_SYSTEM.logLifecycle(window.App, ownerModuleId, 'response_received', { targetId: narrationTarget });
                return output;
            } catch (error) {
                if (controller.signal.aborted) {
                    const code = controller.signal.reason === 'timeout' ? 'timeout' : 'cancelled';
                    const sanitized = new Error(code === 'timeout' ? 'AI provider request timed out' : 'AI provider request cancelled');
                    sanitized.code = code;
                    throw sanitized;
                }
                const sanitized = new Error('AI provider request failed');
                sanitized.code = String(error?.code || 'provider_error').slice(0, 80);
                sanitized.status = Number(error?.status) || 0;
                sanitized.diagnostic = YAW_NARRATION_SYSTEM.providerDiagnostic(error?.diagnostic);
                throw sanitized;
            } finally {
                window.clearTimeout(timeout);
                externalSignal?.removeEventListener?.('abort', abortExternal);
                this.requestsByModule.get(ownerModuleId)?.delete(controller);
                if (this.requestsByModule.get(ownerModuleId)?.size === 0) this.requestsByModule.delete(ownerModuleId);
                this.requestsByConnection.get(connection.id)?.delete(controller);
                if (this.requestsByConnection.get(connection.id)?.size === 0) this.requestsByConnection.delete(connection.id);
            }
        },

        generate(ownerModuleId, request = {}) {
            return this.invoke(ownerModuleId, {
                ...request,
                capability: request.capability === 'narration' ? 'text.generate' : request.capability
            }, { narration: request.capability === 'narration' });
        },

        abortModule(ownerModuleId) {
            for (const controller of this.requestsByModule.get(ownerModuleId) || []) controller.abort('module-unload');
            this.requestsByModule.delete(ownerModuleId);
        },

        resetRuntime(reason = 'run-switch') {
            const controllers = new Set();
            for (const requests of this.requestsByModule.values()) {
                for (const controller of requests) controllers.add(controller);
            }
            for (const requests of this.requestsByConnection.values()) {
                for (const controller of requests) controllers.add(controller);
            }
            for (const controller of controllers) controller.abort(reason);
            this.requestsByModule.clear();
            this.requestsByConnection.clear();
            return controllers.size;
        }
    };

    return manager;
})();

if (typeof window !== 'undefined') {
    window.YAW_NARRATION_SYSTEM = YAW_NARRATION_SYSTEM;
    window.YAW_AI_PROVIDER_MANAGER = YAW_AI_PROVIDER_MANAGER;
}
