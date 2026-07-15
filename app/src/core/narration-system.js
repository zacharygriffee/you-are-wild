/**
 * YOU ARE WILD NARRATION SYSTEM
 * Presentation-only narration records, public narrative context, and provider-neutral AI requests.
 */

const YAW_NARRATION_SYSTEM = {
    VERSION: 1,
    MAX_TEXT_LENGTH: 500,
    MAX_CONTEXT_BEATS: 12,
    MAX_ACTIVITY: 12,
    statuses: new Set(['pending', 'ready', 'failed', 'cancelled']),
    ratings: new Set(['safe', 'mature', 'explicit']),
    contextExtensions: new Map(),
    fallbackTimers: new Map(),
    closedExchanges: new Set(),

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
            source: event.source || ''
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
        window.setTimeout(() => {
            MODULE_SYSTEM.executePublicHook(eventName, envelope).catch(error => {
                console.error(`Narrative hook delivery failed (${eventName}):`, error);
            });
        }, 0);
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
        return snapshot;
    },

    records(app) {
        if (!Array.isArray(app.sceneNarrations)) app.sceneNarrations = [];
        return app.sceneNarrations;
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
            errorCode: String(input.errorCode ?? previous?.errorCode ?? '').slice(0, 120)
        };
    },

    publish(app, ownerModuleId, input = {}) {
        const records = this.records(app);
        if (records.some(record => record.id === input.id)) throw new Error('Narration id already exists');
        const record = this.normalizeRecord(app, ownerModuleId, input);
        records.push(record);
        this.changed(app, 'narration-publish');
        return this.copy(record);
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
        this.changed(app, 'narration-update');
        return this.copy(next);
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

    changed(app, reason) {
        app.markAutoSaveDirty?.(['sceneFeed'], reason);
        app.renderStoryEvents?.();
    },

    persistedRecords(app) {
        return this.records(app)
            .filter(record => record.status === 'ready' || record.status === 'failed' || record.status === 'cancelled')
            .map(record => this.copy(record))
            .filter(Boolean);
    },

    restore(app, records = []) {
        app.sceneNarrations = [];
        for (const input of Array.isArray(records) ? records : []) {
            if (input?.status === 'pending') continue;
            try {
                const record = this.normalizeRecord(app, input.ownerModuleId, input, input);
                app.sceneNarrations.push(record);
            } catch (e) {}
        }
        return app.sceneNarrations;
    },

    visibleFor(app, scope, targetId) {
        const policy = this.policySnapshot();
        return this.records(app).filter(record => record.scope === scope
            && record.targetId === String(targetId)
            && this.outputAllowed(record, policy));
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
        const publicUnit = unit => typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM?._publicNarrativeUnitSummary
            ? MODULE_SYSTEM._publicNarrativeUnitSummary(unit)
            : null;
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
            mode: app.combatState?.active ? 'combat' : 'adventure',
            location: {
                x: Number(app.location?.x || 0),
                y: Number(app.location?.y || 0),
                biome: String(app.currentBiome || ''),
                time: String(app._timeLabel?.() || '')
            },
            beats: targets.map(beat => this.publicBeat(beat)).filter(Boolean),
            recentBeats: allBeats.slice(-beatLimit).map(beat => this.publicBeat(beat)).filter(Boolean),
            characters: units,
            quests: (app.quests || []).slice(0, 6).map(quest => typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM._publicQuestSummary(quest) : null).filter(Boolean),
            activity: (app.log || []).slice(-activityLimit).map(entry => typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM._publicActivitySummary(entry) : null).filter(Boolean),
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

const YAW_AI_PROVIDER_MANAGER = {
    adapters: new Map(),
    connections: new Map(),
    requestsByModule: new Map(),
    requestsByConnection: new Map(),
    connectionSeq: 0,

    token(value, label) {
        return YAW_NARRATION_SYSTEM.token(value, label);
    },

    registerAdapter(providerId, adapter, ownerModuleId = 'core') {
        const id = this.token(providerId, 'AI provider id');
        if (!adapter || typeof adapter.generate !== 'function') throw new Error('AI provider adapter requires generate()');
        this.adapters.set(id, { id, ownerModuleId, name: String(adapter.name || id).slice(0, 120), generate: adapter.generate });
        return id;
    },

    unregisterOwner(ownerModuleId) {
        for (const [id, adapter] of this.adapters.entries()) {
            if (adapter.ownerModuleId === ownerModuleId) this.adapters.delete(id);
        }
        for (const [id, connection] of this.connections.entries()) {
            if (connection.ownerModuleId === ownerModuleId) this.removeConnection(id);
        }
        this.abortModule(ownerModuleId);
    },

    createConnection(providerId, metadata = {}) {
        const provider = this.adapters.get(String(providerId));
        if (!provider) throw new Error('AI provider is not registered');
        const copied = YAW_NARRATION_SYSTEM.copy(metadata, {});
        const serialized = JSON.stringify(copied).toLowerCase();
        if (/api[_-]?key|secret|authorization|bearer|password|token/.test(serialized)) {
            throw new Error('Provider connection metadata cannot contain credentials');
        }
        const id = `connection-${++this.connectionSeq}-${Date.now()}`;
        this.connections.set(id, { id, providerId: provider.id, ownerModuleId: provider.ownerModuleId, metadata: copied, createdAt: Date.now() });
        return id;
    },

    removeConnection(connectionId) {
        const id = String(connectionId);
        for (const controller of this.requestsByConnection.get(id) || []) controller.abort('provider-disconnect');
        this.requestsByConnection.delete(id);
        return this.connections.delete(id);
    },

    removeOwnedConnection(ownerModuleId, connectionId) {
        const connection = this.connections.get(String(connectionId));
        if (!connection || connection.ownerModuleId !== ownerModuleId) return false;
        return this.removeConnection(connection.id);
    },

    listConnections() {
        return [...this.connections.values()].map(connection => ({
            id: connection.id,
            providerId: connection.providerId,
            providerName: this.adapters.get(connection.providerId)?.name || connection.providerId
        }));
    },

    async generate(ownerModuleId, request = {}) {
        if (request.capability !== 'narration') throw new Error('Unsupported AI capability');
        const connection = this.connections.get(String(request.providerConnectionId || ''));
        if (!connection) throw new Error('AI provider connection is unavailable');
        const adapter = this.adapters.get(connection.providerId);
        if (!adapter) throw new Error('AI provider adapter is unavailable');
        const input = YAW_NARRATION_SYSTEM.copy(request.input, null);
        if (!input) throw new Error('AI request input must be serializable');
        const maxCharacters = Math.max(80, Math.min(YAW_NARRATION_SYSTEM.MAX_TEXT_LENGTH, Number(request.maxCharacters) || YAW_NARRATION_SYSTEM.MAX_TEXT_LENGTH));
        const controller = new AbortController();
        const externalSignal = request.signal;
        const abortExternal = () => controller.abort(externalSignal?.reason || 'cancelled');
        if (externalSignal?.aborted) abortExternal();
        else externalSignal?.addEventListener?.('abort', abortExternal, { once: true });
        const timeoutMs = Math.max(1000, Math.min(30000, Number(request.timeoutMs) || 12000));
        const timeout = window.setTimeout(() => controller.abort('timeout'), timeoutMs);
        if (!this.requestsByModule.has(ownerModuleId)) this.requestsByModule.set(ownerModuleId, new Set());
        this.requestsByModule.get(ownerModuleId).add(controller);
        if (!this.requestsByConnection.has(connection.id)) this.requestsByConnection.set(connection.id, new Set());
        this.requestsByConnection.get(connection.id).add(controller);
        try {
            const result = await adapter.generate({
                capability: 'narration',
                profileId: String(request.profileId || ''),
                input,
                maxCharacters,
                connection: { id: connection.id, metadata: YAW_NARRATION_SYSTEM.copy(connection.metadata, {}) },
                signal: controller.signal
            });
            let text = String(result?.text || '').replace(/\s+/g, ' ').trim();
            if (!text) throw new Error('AI provider returned empty narration');
            if (text.length > maxCharacters) {
                const candidate = text.slice(0, maxCharacters + 1);
                const sentenceEnd = Math.max(candidate.lastIndexOf('. '), candidate.lastIndexOf('! '), candidate.lastIndexOf('? '));
                const wordEnd = candidate.lastIndexOf(' ');
                const cut = sentenceEnd >= Math.floor(maxCharacters * 0.6) ? sentenceEnd + 1 : wordEnd;
                text = candidate.slice(0, cut > 0 ? cut : maxCharacters).trim();
            }
            return {
                text,
                providerId: connection.providerId,
                modelId: String(result?.modelId || '').slice(0, 120),
                usage: YAW_NARRATION_SYSTEM.copy(result?.usage || null, null)
            };
        } catch (error) {
            if (controller.signal.aborted) {
                const code = controller.signal.reason === 'timeout' ? 'timeout' : 'cancelled';
                const sanitized = new Error(code === 'timeout' ? 'Narration request timed out' : 'Narration request cancelled');
                sanitized.code = code;
                throw sanitized;
            }
            const sanitized = new Error('Narration provider request failed');
            sanitized.code = String(error?.code || 'provider_error').slice(0, 80);
            throw sanitized;
        } finally {
            window.clearTimeout(timeout);
            externalSignal?.removeEventListener?.('abort', abortExternal);
            this.requestsByModule.get(ownerModuleId)?.delete(controller);
            this.requestsByConnection.get(connection.id)?.delete(controller);
            if (this.requestsByConnection.get(connection.id)?.size === 0) this.requestsByConnection.delete(connection.id);
        }
    },

    abortModule(ownerModuleId) {
        for (const controller of this.requestsByModule.get(ownerModuleId) || []) controller.abort('module-unload');
        this.requestsByModule.delete(ownerModuleId);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_NARRATION_SYSTEM = YAW_NARRATION_SYSTEM;
    window.YAW_AI_PROVIDER_MANAGER = YAW_AI_PROVIDER_MANAGER;
}
