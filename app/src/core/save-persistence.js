/**
 * YOU ARE WILD SAVE PERSISTENCE
 * Shared save snapshot, world-store, slot metadata, and save-hook writes.
 */

const YAW_SAVE_PERSISTENCE = {
    DIRTY_DOMAINS: ['manifest', 'player', 'party', 'inventory', 'holdings', 'currentTile', 'worldTiles', 'combat', 'quests', 'settings', 'sceneFeed', 'activityLog'],
    RECORD_DOMAINS: ['player', 'party', 'inventory', 'holdings', 'currentTile', 'combat', 'quests', 'settings', 'sceneFeed', 'activityLog'],

    autoSaveState(app) {
        if (!app._autoSaveState) {
            app._autoSaveState = {
                dirty: false,
                saving: false,
                timer: null,
                running: null,
                pendingImmediate: false
            };
        }
        return app._autoSaveState;
    },

    sparseSaveState(app) {
        if (!app._sparseSaveState) {
            app._sparseSaveState = {
                dirtyDomains: new Set(),
                lastTotalMs: 0,
                lastDirtyDomains: [],
                lastRecordCount: 0,
                queueState: 'idle',
                lastMode: 'none',
                revision: 0,
                lastSavedAt: 0,
                lastError: null,
                lastTimings: {},
                lastRecordDomains: [],
                lastRecordKeys: [],
                lastDefaultDirtyFallback: false,
                defaultDirtyFallbackCount: 0,
                lastDefaultDirtyReason: '',
                lastDefaultDirtyCallSite: '',
                lastDirtyReason: '',
                lastSnapshotDebug: null,
                lastWorldStoreDebug: null,
                lastPerformanceDiagnostic: null,
                lastSlowSaveDiagnostic: null
            };
        }
        if (!(app._sparseSaveState.dirtyDomains instanceof Set)) {
            app._sparseSaveState.dirtyDomains = new Set(app._sparseSaveState.dirtyDomains || []);
        }
        return app._sparseSaveState;
    },

    normalizeDomain(domain) {
        const value = String(domain || '').trim();
        return this.DIRTY_DOMAINS.includes(value) ? value : null;
    },

    markSaveDirty(app, domain, reason = '') {
        const normalized = this.normalizeDomain(domain);
        if (!normalized) return false;
        const state = this.sparseSaveState(app);
        state.dirtyDomains.add(normalized);
        if (reason) state.lastDirtyReason = String(reason);
        return true;
    },

    markSaveDirtyMany(app, domains = [], reason = '') {
        let changed = false;
        for (const domain of domains || []) changed = this.markSaveDirty(app, domain, reason) || changed;
        return changed;
    },

    clearSaveDirty(app, domain) {
        const normalized = this.normalizeDomain(domain);
        if (!normalized) return false;
        return this.sparseSaveState(app).dirtyDomains.delete(normalized);
    },

    clearSaveDirtyAll(app) {
        this.sparseSaveState(app).dirtyDomains.clear();
        return true;
    },

    cancelAutoSave(app, options = {}) {
        const state = this.autoSaveState(app);
        if (state.timer) clearTimeout(state.timer);
        state.timer = null;
        state.dirty = false;
        state.pendingImmediate = false;
        if (options.suppress === true) app._autoSaveSuppressed = true;
        this.clearSaveDirtyAll(app);
        this.sparseSaveState(app).queueState = 'idle';
        return true;
    },

    dirtySaveDomains(app) {
        return Array.from(this.sparseSaveState(app).dirtyDomains);
    },

    hasDirtySaveDomains(app) {
        return this.sparseSaveState(app).dirtyDomains.size > 0;
    },

    saveDebugState(app) {
        const sparse = this.sparseSaveState(app);
        const queue = this.autoSaveState(app);
        return {
            lastSaveTotalMs: sparse.lastTotalMs,
            dirtyDomains: this.dirtySaveDomains(app),
            lastDirtyDomains: sparse.lastDirtyDomains || [],
            recordCount: sparse.lastRecordCount || 0,
            recordDomains: sparse.lastRecordDomains || [],
            recordKeys: sparse.lastRecordKeys || [],
            defaultDirtyFallbackUsed: Boolean(sparse.lastDefaultDirtyFallback),
            defaultDirtyFallbackCount: sparse.defaultDirtyFallbackCount || 0,
            defaultDirtyFallbackReason: sparse.lastDefaultDirtyReason || '',
            defaultDirtyFallbackCallSite: sparse.lastDefaultDirtyCallSite || '',
            queueState: sparse.queueState || (queue.saving ? 'saving' : (queue.timer ? 'scheduled' : 'idle')),
            lastSaveMode: sparse.lastMode || 'none',
            lastTimings: sparse.lastTimings || {},
            prepareSnapshotMs: sparse.lastTimings?.prepareSnapshotMs || 0,
            worldStoreMs: sparse.lastTimings?.worldStoreMs || 0,
            worldTilesScanned: sparse.lastWorldStoreDebug?.worldTilesScanned || 0,
            worldTilesWritten: sparse.lastWorldStoreDebug?.worldTilesWritten || 0,
            recordBuildMs: sparse.lastTimings?.recordBuildMs || 0,
            recordWriteMs: sparse.lastTimings?.recordWriteMs || 0,
            manifestWriteMs: sparse.lastTimings?.manifestWriteMs || 0,
            totalMs: sparse.lastTimings?.totalMs || sparse.lastTotalMs || 0,
            snapshotDebug: sparse.lastSnapshotDebug || null,
            worldStoreDebug: sparse.lastWorldStoreDebug || null,
            performanceDiagnostic: sparse.lastPerformanceDiagnostic || null,
            slowSaveDiagnostic: sparse.lastSlowSaveDiagnostic || null,
            lastError: sparse.lastError || null,
            dirtyReason: sparse.lastDirtyReason || ''
        };
    },

    markDefaultAutoDirty(app, reason = 'autosave-default') {
        const domains = ['manifest', 'player', 'party', 'inventory', 'holdings', 'currentTile', 'worldTiles', 'combat', 'quests', 'settings', 'sceneFeed', 'activityLog'];
        const state = this.sparseSaveState(app);
        state.lastDefaultDirtyFallback = true;
        state.defaultDirtyFallbackCount = (state.defaultDirtyFallbackCount || 0) + 1;
        state.lastDefaultDirtyReason = String(reason || 'autosave-default');
        try {
            state.lastDefaultDirtyCallSite = (new Error()).stack?.split('\n').slice(2, 5).map(line => line.trim()).join(' | ') || '';
        } catch (e) {
            state.lastDefaultDirtyCallSite = '';
        }
        this.markSaveDirtyMany(app, domains, reason || 'autosave-default');
        return domains;
    },

    markAutoSaveDirty(app, domains = [], reason = '') {
        const list = Array.isArray(domains) ? domains : [domains];
        if (!list.length) return false;
        return this.markSaveDirtyMany(app, list, reason || 'autosave-targeted');
    },

    autoSaveDelay(app, options = {}) {
        if (Number.isFinite(options.delayMs)) return Math.max(0, options.delayMs);
        if (Number.isFinite(app.AUTO_SAVE_DEBOUNCE_MS)) return Math.max(0, app.AUTO_SAVE_DEBOUNCE_MS);
        return 900;
    },

    async writeSlot(app, slotName, options = {}) {
        if (options.auto === true && app.SPARSE_SAVE_ENABLED !== false) {
            return await this.writeSparseSlot(app, slotName, options);
        }
        return await this.writeFullSlot(app, slotName, options);
    },

    async writeFullSlot(app, slotName, options = {}) {
        slotName = app._normalizeSaveSlotName(slotName);
        const sparse = this.sparseSaveState(app);
        const timings = {};
        const totalStart = this.nowMs();
        this.measurePrepareSaveSnapshot(app, timings);
        let worldStoreSaved = false;
        const worldStart = this.nowMs();
        try {
            await app.persistWorldStateToMapStore();
            worldStoreSaved = true;
        } catch (e) {
            console.warn('World map persistence failed', e);
        }
        timings.worldStoreMs = Math.round(this.nowMs() - worldStart);
        const binaryStart = this.nowMs();
        const saveData = Binary.saveGame(app, { omitWorldMap: worldStoreSaved && options.auto === true });
        timings.binaryBuildMs = Math.round(this.nowMs() - binaryStart);
        const dbStart = this.nowMs();
        await app._dbPut('saves', slotName, saveData);
        // A manual/full save is the authoritative snapshot for this slot.  If an
        // older sparse manifest remains, the load path would otherwise prefer it
        // and silently ignore the just-written full save.
        await app._dbDelete('saveManifests', slotName).catch(error => {
            console.warn('Stale sparse manifest cleanup failed after full save', error);
        });
        timings.fullSaveWriteMs = Math.round(this.nowMs() - dbStart);
        app.activeSlot = slotName;
        const savedAt = Date.now().toString();
        app._setStoredValue('lastSlot', slotName);
        app._setStoredValue('lastSaveTime', savedAt);
        app._setSaveTime(slotName, savedAt);
        app._clearCombatRefreshSnapshot(slotName);
        app._emitModuleHook('onGameSave', {
            slotName,
            auto: Boolean(options.auto),
            worldStoreSaved,
            combatActive: Boolean(app.combatState?.active)
        });
        timings.totalMs = Math.round(this.nowMs() - totalStart);
        sparse.lastMode = 'full';
        sparse.lastSavedAt = Number(savedAt);
        sparse.lastRecordCount = 1;
        sparse.lastTotalMs = timings.totalMs;
        sparse.lastTimings = timings;
        sparse.lastSnapshotDebug = app._lastSaveSnapshotDebug || null;
        sparse.lastWorldStoreDebug = app._lastWorldStoreDebug || null;
        sparse.lastPerformanceDiagnostic = this.timingDiagnostic(app, timings, {
            mode: 'full',
            slotName,
            worldRecordCount: app._lastWorldStoreDebug?.recordCount || 0
        });
        sparse.lastSlowSaveDiagnostic = timings.totalMs > (app.SAVE_SLOW_LOG_MS || 120)
            ? sparse.lastPerformanceDiagnostic
            : null;
        return { slotName, saveData, savedAt, worldStoreSaved, mode: 'full' };
    },

    recordKey(slotName, domain) {
        return `${slotName}:${domain}`;
    },

    nowMs() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
        return Date.now();
    },

    measurePrepareSaveSnapshot(app, timings = {}) {
        const start = this.nowMs();
        app._prepareSaveSnapshot();
        timings.prepareSnapshotMs = Math.round(this.nowMs() - start);
        return app._lastSaveSnapshotDebug || { totalMs: timings.prepareSnapshotMs };
    },

    prepareSparseState(app, dirtyDomains = [], timings = {}) {
        const start = this.nowMs();
        const domains = new Set(dirtyDomains || []);
        const now = () => this.nowMs();
        const debug = {
            mode: 'sparse',
            dirtyDomains: Array.from(domains),
            worldMapSize: app.worldMap?.size || 0,
            tileDeltaCountBefore: app.tileDeltas?.size || 0,
            dirtyWorldTileKeys: typeof app.dirtyWorldTileKeys === 'function' ? app.dirtyWorldTileKeys() : []
        };
        let phaseStart = now();
        if (domains.has('player') || domains.has('party') || domains.has('holdings') || domains.has('combat') || domains.has('quests')) {
            app._syncPlayerPartyReference();
        }
        debug.syncPlayerPartyMs = Math.round(now() - phaseStart);
        phaseStart = now();
        if (domains.has('player') || domains.has('party') || domains.has('combat') || domains.has('currentTile') || domains.has('worldTiles')) {
            app._normalizeExplorationSelections();
        }
        debug.normalizeSelectionsMs = Math.round(now() - phaseStart);
        phaseStart = now();
        if (domains.has('party') || domains.has('combat') || domains.has('currentTile') || domains.has('worldTiles')) {
            app._syncCurrentTileCreatures();
        }
        debug.syncCurrentTileCreaturesMs = Math.round(now() - phaseStart);
        phaseStart = now();
        if (domains.has('currentTile') || domains.has('worldTiles')) {
            app.markCurrentWorldTileDirty?.('sparse-current-tile');
            const currentKey = app._tileKey?.(app.location?.x || 0, app.location?.y || 0);
            const currentTile = currentKey ? app.worldMap?.get(currentKey) : null;
            if (currentTile) app.persistTileDelta?.(currentTile.x, currentTile.y, currentTile, { markDirty: true, reason: 'sparse-current-tile' });
        }
        debug.persistDirtyCurrentTileMs = Math.round(now() - phaseStart);
        debug.tileDeltaCountAfter = app.tileDeltas?.size || 0;
        debug.dirtyWorldTileKeysAfter = typeof app.dirtyWorldTileKeys === 'function' ? app.dirtyWorldTileKeys() : [];
        debug.totalMs = Math.round(now() - start);
        timings.prepareSnapshotMs = debug.totalMs;
        app._lastSaveSnapshotDebug = debug;
        return debug;
    },

    timingDiagnostic(app, timings = {}, context = {}) {
        const phases = [];
        for (const [phase, value] of Object.entries(timings || {})) {
            if (!phase.endsWith('Ms') || phase === 'totalMs') continue;
            const ms = Number(value);
            if (Number.isFinite(ms)) phases.push({ phase, ms });
        }
        phases.sort((a, b) => b.ms - a.ms);
        const dominant = phases[0] || { phase: 'none', ms: 0 };
        return {
            mode: context.mode || 'unknown',
            slotName: context.slotName || '',
            totalMs: Number(timings.totalMs || 0),
            dominantPhase: dominant.phase,
            dominantMs: dominant.ms,
            dirtyDomains: Array.isArray(context.dirtyDomains) ? [...context.dirtyDomains] : [],
            recordDomains: Array.isArray(context.recordDomains) ? [...context.recordDomains] : [],
            worldRecordCount: Number(context.worldRecordCount || 0),
            snapshot: app._lastSaveSnapshotDebug || null,
            worldStore: app._lastWorldStoreDebug || null,
            phases
        };
    },

    flatSlowSaveSummary(app, slotName, totalMs, dirtyDomains = [], recordDomains = [], timings = {}) {
        const debug = this.saveDebugState(app);
        const world = debug.worldStoreDebug || {};
        const lines = [
            `Sparse save ${slotName} took ${totalMs}ms`,
            `reason: ${debug.dirtyReason || ''}`,
            `dirty: ${(dirtyDomains || []).join(', ')}`,
            `records: ${recordDomains.length}`,
            `recordDomains: ${(recordDomains || []).join(', ')}`,
            `fallbackUsed: ${debug.defaultDirtyFallbackUsed}`,
            `defaultFallbackReason: ${debug.defaultDirtyFallbackReason || ''}`,
            `prepareSnapshotMs: ${timings.prepareSnapshotMs || 0}`,
            `worldStoreMs: ${timings.worldStoreMs || 0}`,
            `worldPersistenceMode: ${world.worldPersistenceMode || 'skipped'}`,
            `worldTilesScanned: ${world.worldTilesScanned || 0}`,
            `worldTilesWritten: ${world.worldTilesWritten || 0}`,
            `worldDirtyKeys: ${(world.worldDirtyKeys || []).join(', ')}`,
            `recordBuildMs: ${timings.recordBuildMs || 0}`,
            `recordWriteMs: ${timings.recordWriteMs || 0}`,
            `manifestWriteMs: ${timings.manifestWriteMs || 0}`,
            `totalMs: ${timings.totalMs || totalMs}`
        ];
        return lines.join('\n');
    },

    serializableClone(value, fallback = null) {
        if (value == null) return value;
        try {
            if (typeof structuredClone === 'function') return structuredClone(value);
        } catch (e) {}
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return fallback;
        }
    },

    liveStats(unit = {}) {
        return {
            str: unit.str ?? unit.stats?.str ?? unit.Figh ?? 10,
            con: unit.con ?? unit.stats?.con ?? 10,
            spd: unit.spd ?? unit.stats?.spd ?? unit.Flee ?? 10,
            int: unit.int ?? unit.stats?.int ?? 10,
            wis: unit.wis ?? unit.stats?.wis ?? 10,
            cha: unit.cha ?? unit.stats?.cha ?? unit.Flir ?? 10
        };
    },

    unitRef(app, unit) {
        if (!unit) return null;
        try {
            if (typeof app._unitSelectionId === 'function') return app._unitSelectionId(unit);
        } catch (e) {}
        return unit.id || unit.name || null;
    },

    buildCombatDto(app) {
        if (!app.combatState?.active) return { active: false };
        const unitRef = unit => this.unitRef(app, unit);
        return {
            active: true,
            round: app.combatState.round || 1,
            currentTurn: app.combatState.currentTurn || 0,
            sceneExchangeId: app.combatState.sceneExchangeId || null,
            xpEarned: app.combatState.xpEarned || 0,
            activeActorId: unitRef(app.activeActor),
            playerTurnReservation: this.serializableClone(app.combatState.playerTurnReservation || null, null),
            turnQueue: (app.combatState.turnQueue || []).map(entry => ({
                unitId: unitRef(entry.unit),
                initiative: entry.initiative || 0,
                actedThisRound: Boolean(entry.actedThisRound)
            })).filter(entry => entry.unitId),
            syncActions: (app.combatState.syncActions || []).map(sync => ({
                type: sync.type,
                techniqueKey: sync.techniqueKey || sync.plan?.subAction || null,
                participantIds: (sync.participants || []).map(unitRef).filter(Boolean),
                targetId: unitRef(sync.target),
                targetIds: (sync.targets?.length ? sync.targets : [sync.target]).map(unitRef).filter(Boolean),
                resolveAtIndex: sync.resolveAtIndex || 0,
                round: sync.round || app.combatState.round || 1,
                resolved: Boolean(sync.resolved)
            })).filter(sync => sync.targetId && sync.participantIds.length >= 2 && !sync.resolved)
        };
    },

    buildQuestStateDto(app) {
        const partyUnitRefs = (app.party || []).map(unit => ({
            id: unit?.id || null,
            name: unit?.name || '',
            species: unit?.species || ''
        }));
        const unitCompatibility = unit => unit ? {
            identity: unit.identity || unit.gender || null,
            gender: unit.gender || unit.identity || null,
            parts: unit.parts || null,
            chest: unit.chest || null,
            bothParts: Boolean(unit.bothParts),
            creationOptions: this.serializableClone(unit.creationOptions || {}, {}),
            lifeStage: unit.lifeStage || unit.ageCategory || null,
            adultEligibility: this.serializableClone(unit.adultEligibility || null, null),
            adultEligible: typeof unit.adultEligible === 'boolean' ? unit.adultEligible : null,
            combatStatus: this.serializableClone(unit.status || {}, {})
        } : null;
        const partyRoles = {};
        const partyAIOrders = {};
        const partyDuties = {};
        const partyStances = {};
        const partyControls = {};
        const partyAutonomyPaused = {};
        const partyPreferredRows = {};
        const partyRecruitmentContinuity = {};
        const partyCompanionBonds = {};
        for (const unit of app.party || []) {
            const behavior = typeof YAW_COMPANION_BEHAVIOR !== 'undefined'
                ? YAW_COMPANION_BEHAVIOR.get(app, unit)
                : null;
            const keys = [unit?.id, unit?.name].filter(Boolean).map(String);
            for (const key of keys) {
                if (unit.partyRole) partyRoles[key] = unit.partyRole;
                if (unit.aiOrder) partyAIOrders[key] = unit.aiOrder;
                if (behavior?.duty) partyDuties[key] = behavior.duty;
                if (behavior?.stance) partyStances[key] = behavior.stance;
                if (behavior?.control) partyControls[key] = behavior.control;
                partyAutonomyPaused[key] = behavior?.autonomyPaused === true;
                if (behavior?.preferredRow) partyPreferredRows[key] = behavior.preferredRow;
                if (behavior?.recruitmentContinuity) {
                    partyRecruitmentContinuity[key] = this.serializableClone(behavior.recruitmentContinuity, null);
                }
                if (unit !== app.player && !unit?.mc && unit?.companionBond) {
                    partyCompanionBonds[key] = this.serializableClone(unit.companionBond, null);
                }
            }
        }
        return {
            quests: this.serializableClone(app.quests || [], []),
            trackedQuestId: app.trackedQuestId || null,
            playerGold: app.player?.gold || 0,
            dayCount: app.dayCount || 0,
            playerEquipment: this.serializableClone(app.player?.equipment || {}, {}),
            playerEquipmentBaseStats: this.serializableClone(app.player?.equipmentBaseStats || null, null),
            partyEquipment: (app.party || []).map(unit => this.serializableClone(unit?.equipment || {}, {})),
            partyEquipmentBaseStats: (app.party || []).map(unit => this.serializableClone(unit?.equipmentBaseStats || null, null)),
            playerPerks: this.serializableClone(app.player?.perks || [], []),
            pendingPerkChoices: app.player?.pendingPerkChoices || 0,
            partyLeaderId: app.partyLeaderId || app.player?.id || app.player?.name || null,
            partyUnitRefs,
            playerCompatibility: unitCompatibility(app.player),
            partyCompatibility: (app.party || []).map(unitCompatibility),
            partyMultiActionPractice: (app.party || []).map(unit => this.serializableClone(unit?.multiActionPractice || null, null)),
            partyResourceLedgers: (app.party || []).map(unit => this.serializableClone(unit?.resourceLedger || null, null)),
            partyRoles,
            partyAIOrders,
            partyDuties,
            partyStances,
            partyControls,
            partyAutonomyPaused,
            partyPreferredRows,
            partyRecruitmentContinuity,
            partyCompanionBonds,
            logEntries: this.serializableClone(app.log || [], []),
            explorationActorIds: this.serializableClone(app.explorationActorIds || [], []),
            explorationPartyTargetIds: this.serializableClone(app.explorationTargetIds || [], []),
            encounterWeights: this.serializableClone(app.encounterWeights || app.selectedEncounterWeights || null, null),
            contentProfile: this.serializableClone(typeof MODULE_SYSTEM !== 'undefined' && typeof MODULE_SYSTEM.contentProfileSnapshot === 'function' ? MODULE_SYSTEM.contentProfileSnapshot() : null, null),
            safeAnchor: this.serializableClone(app.safeAnchor || null, null),
            defeatState: this.serializableClone(app.defeatState || null, null),
            strandedCompanions: this.serializableClone(app.strandedCompanions || [], []),
            combatState: this.buildCombatDto(app),
            storyEvents: this.serializableClone(app.storyEvents || [], []),
            sceneNarrations: this.serializableClone(typeof YAW_NARRATION_SYSTEM !== 'undefined' ? YAW_NARRATION_SYSTEM.persistedRecords(app) : [], []),
            tileNarrationCache: this.serializableClone(typeof YAW_NARRATION_SYSTEM !== 'undefined' ? YAW_NARRATION_SYSTEM.persistedTileCache(app) : [], []),
            latestStoryEvent: this.serializableClone(app.latestStoryEvent || null, null),
            storyEventSeq: app.storyEventSeq || 0
        };
    },

    buildSparseRecord(app, domain) {
        if (domain === 'player') {
            return {
                playerName: app.player?.name || 'You',
                playerSpecies: app.player?.species || 'human',
                playerGender: app.player?.gender || app.player?.identity || 'female',
                playerHp: app.player?.CPun ?? 100,
                playerMaxHp: app.player?.MPun ?? 100,
                playerStats: this.liveStats(app.player),
                playerLevel: app.player?.level || 1
            };
        }
        if (domain === 'party') return { party: this.serializableClone(app.party || [], []) };
        if (domain === 'inventory') return { inventory: this.serializableClone(app.inventory || [], []) };
        if (domain === 'holdings') return { party: this.serializableClone(app.party || [], []) };
        if (domain === 'currentTile') {
            const tile = app.location ? app.getTile(app.location.x, app.location.y) : null;
            return {
                locationX: app.location?.x || 0,
                locationY: app.location?.y || 0,
                currentBiome: app.currentBiome || tile?.biome || 'forest',
                timeHour: app.timeHour || 0,
                dayCount: app.dayCount || 0,
                exploredTiles: Array.from(app.exploredTiles || []),
                currentTile: this.serializableClone(tile || null, null),
                worldMeta: this.serializableClone(app.worldMeta || null, null)
            };
        }
        if (domain === 'combat') return { combatState: this.buildCombatDto(app) };
        if (domain === 'quests') return { questState: this.buildQuestStateDto(app) };
        if (domain === 'settings') {
            return {
                encounterPreference: app.encounterPreference || 'any',
                encounterWeights: this.serializableClone(app.encounterWeights || app.selectedEncounterWeights || null, null),
                selectedEncounterPreference: app.selectedEncounterPreference || null,
                selectedEncounterWeights: this.serializableClone(app.selectedEncounterWeights || null, null)
            };
        }
        if (domain === 'sceneFeed') {
            return {
                storyEvents: this.serializableClone(app.storyEvents || [], []),
                sceneNarrations: this.serializableClone(typeof YAW_NARRATION_SYSTEM !== 'undefined' ? YAW_NARRATION_SYSTEM.persistedRecords(app) : [], []),
                tileNarrationCache: this.serializableClone(typeof YAW_NARRATION_SYSTEM !== 'undefined' ? YAW_NARRATION_SYSTEM.persistedTileCache(app) : [], []),
                latestStoryEvent: this.serializableClone(app.latestStoryEvent || null, null),
                latestSceneBeat: this.serializableClone(app.latestSceneBeat || null, null),
                storyEventSeq: app.storyEventSeq || 0
            };
        }
        if (domain === 'activityLog') {
            const logEntries = this.serializableClone(app.log || [], []);
            return { log: logEntries.map(entry => entry?.text || String(entry || '')), logEntries };
        }
        return {};
    },

    buildSparseLoadedData(records = {}, manifest = {}) {
        const player = records.player || {};
        const currentTile = records.currentTile || {};
        const quests = records.quests?.questState || {};
        const combat = records.combat?.combatState || quests.combatState || { active: false };
        const sceneFeed = records.sceneFeed || {};
        const activityLog = records.activityLog || {};
        const settings = records.settings || {};
        return {
            version: window.YAW_RELEASE?.saveSchema || 11,
            gameVersion: manifest.gameVersion || 'legacy',
            playerName: player.playerName || 'You',
            playerSpecies: player.playerSpecies || 'human',
            playerGender: player.playerGender || quests.playerCompatibility?.gender || quests.playerCompatibility?.identity || 'female',
            locationX: currentTile.locationX ?? manifest.location?.x ?? 0,
            locationY: currentTile.locationY ?? manifest.location?.y ?? 0,
            playerHp: player.playerHp ?? 100,
            playerMaxHp: player.playerMaxHp ?? 100,
            playerStats: player.playerStats || { str: 10, con: 10, spd: 10, int: 10, wis: 10, cha: 10 },
            playerLevel: player.playerLevel || 1,
            party: records.party?.party || records.holdings?.party || [],
            log: activityLog.log || [],
            currentBiome: currentTile.currentBiome || 'forest',
            worldMap: {},
            exploredTiles: currentTile.exploredTiles || [],
            inventory: records.inventory?.inventory || [],
            timeHour: currentTile.timeHour || 0,
            encounterPreference: settings.encounterPreference || 'any',
            questState: {
                ...quests,
                encounterWeights: settings.encounterWeights || quests.encounterWeights || null,
                combatState: combat,
                logEntries: activityLog.logEntries || quests.logEntries || [],
                storyEvents: sceneFeed.storyEvents || quests.storyEvents || [],
                sceneNarrations: sceneFeed.sceneNarrations || quests.sceneNarrations || [],
                tileNarrationCache: sceneFeed.tileNarrationCache || quests.tileNarrationCache || [],
                latestStoryEvent: sceneFeed.latestStoryEvent || quests.latestStoryEvent || null,
                storyEventSeq: sceneFeed.storyEventSeq || quests.storyEventSeq || 0
            },
            worldMeta: currentTile.worldMeta || manifest.worldMeta || null
        };
    },

    async writeSparseSlot(app, slotName, options = {}) {
        slotName = app._normalizeSaveSlotName(slotName);
        const sparse = this.sparseSaveState(app);
        const timings = {};
        const totalStart = this.nowMs();
        sparse.queueState = 'saving';
        sparse.lastError = null;
        sparse.lastDefaultDirtyFallback = false;
        const dirtyStart = this.nowMs();
        const previousManifest = await app._dbGet('saveManifests', slotName).catch(() => null);
        if (!previousManifest) this.markDefaultAutoDirty(app, 'initial-sparse-baseline');
        if (!this.hasDirtySaveDomains(app)) this.markDefaultAutoDirty(app, 'autosave-without-targeted-domains');
        this.markSaveDirty(app, 'manifest', 'sparse-write');
        const dirtyDomains = this.dirtySaveDomains(app);
        timings.dirtyCollectionMs = Math.round(this.nowMs() - dirtyStart);
        if (!previousManifest) this.measurePrepareSaveSnapshot(app, timings);
        else this.prepareSparseState(app, dirtyDomains, timings);
        const recordKeys = { ...(previousManifest?.recordKeys || {}) };
        let worldStoreSaved = false;
        let worldRecordCount = 0;
        app._lastWorldStoreDebug = {
            worldPersistenceMode: 'skipped',
            worldTilesScanned: 0,
            worldTilesWritten: 0,
            worldDirtyKeys: [],
            recordCount: 0,
            totalMs: 0
        };
        if (dirtyDomains.includes('worldTiles') || dirtyDomains.includes('currentTile') || !previousManifest) {
            const worldStart = this.nowMs();
            try {
                if (!previousManifest) {
                    worldRecordCount = await app.persistWorldStateToMapStore();
                } else {
                    worldRecordCount = await app.persistDirtyWorldTilesToMapStore(app.dirtyWorldTileKeys?.() || []);
                }
                worldStoreSaved = true;
            } catch (e) {
                console.warn('World map persistence failed during sparse save', e);
            }
            timings.worldStoreMs = Math.round(this.nowMs() - worldStart);
        }
        const written = [];
        const buildStart = this.nowMs();
        const recordsToWrite = [];
        for (const domain of this.RECORD_DOMAINS) {
            if (!dirtyDomains.includes(domain) && previousManifest) continue;
            const key = this.recordKey(slotName, domain);
            recordsToWrite.push({
                domain,
                key,
                record: {
                    schema: 'yaw-save-record-v1',
                    slotName,
                    domain,
                    savedAt: Date.now(),
                    data: this.buildSparseRecord(app, domain)
                }
            });
        }
        timings.recordBuildMs = Math.round(this.nowMs() - buildStart);
        const recordStart = this.nowMs();
        for (const { domain, key, record } of recordsToWrite) {
            await app._dbPut('saveRecords', key, record);
            recordKeys[domain] = key;
            written.push(domain);
        }
        timings.recordWriteMs = Math.round(this.nowMs() - recordStart);
        const savedAt = Date.now().toString();
        const revision = Math.max(Number(previousManifest?.revision || 0), sparse.revision || 0) + 1;
        const manifest = {
            schema: 'yaw-sparse-save-v1',
            gameVersion: window.YAW_RELEASE?.version || '0.0.0',
            saveSchema: window.YAW_RELEASE?.saveSchema || 11,
            moduleApi: window.YAW_RELEASE?.moduleApi || 1,
            slotName,
            revision,
            savedAt,
            saveFormat: 'sparse-v1',
            dirtyDomains,
            writtenDomains: written,
            recordKeys,
            recordCount: Object.keys(recordKeys).length,
            location: { x: app.location?.x || 0, y: app.location?.y || 0 },
            worldMeta: this.serializableClone(app.worldMeta || null, null),
            worldStoreSaved,
            worldRecordCount,
            combatActive: Boolean(app.combatState?.active)
        };
        const manifestStart = this.nowMs();
        await app._dbPut('saveManifests', slotName, manifest);
        timings.manifestWriteMs = Math.round(this.nowMs() - manifestStart);
        app.activeSlot = slotName;
        app._setStoredValue('lastSlot', slotName);
        app._setStoredValue('lastSaveTime', savedAt);
        app._setSaveTime(slotName, savedAt);
        app._clearCombatRefreshSnapshot(slotName);
        this.clearSaveDirtyAll(app);
        const totalMs = Math.round(this.nowMs() - totalStart);
        timings.totalMs = totalMs;
        sparse.lastTotalMs = totalMs;
        sparse.lastDirtyDomains = dirtyDomains;
        sparse.lastRecordCount = written.length;
        sparse.lastRecordDomains = [...written];
        sparse.lastRecordKeys = written.map(domain => recordKeys[domain]).filter(Boolean);
        sparse.lastMode = 'sparse';
        sparse.revision = revision;
        sparse.lastSavedAt = Number(savedAt);
        sparse.lastTimings = timings;
        sparse.lastSnapshotDebug = app._lastSaveSnapshotDebug || null;
        sparse.lastWorldStoreDebug = app._lastWorldStoreDebug || null;
        sparse.lastPerformanceDiagnostic = this.timingDiagnostic(app, timings, {
            mode: 'sparse',
            slotName,
            dirtyDomains,
            recordDomains: written,
            worldRecordCount
        });
        sparse.lastSlowSaveDiagnostic = totalMs > (app.SAVE_SLOW_LOG_MS || 120)
            ? sparse.lastPerformanceDiagnostic
            : null;
        sparse.queueState = 'idle';
        app._emitModuleHook('onGameSave', {
            slotName,
            auto: Boolean(options.auto),
            worldStoreSaved,
            combatActive: Boolean(app.combatState?.active),
            sparse: true,
            dirtyDomains,
            recordCount: written.length
        });
        if (totalMs > (app.SAVE_SLOW_LOG_MS || 120)) {
            console.warn(this.flatSlowSaveSummary(app, slotName, totalMs, dirtyDomains, written, timings));
        }
        return { slotName, savedAt, worldStoreSaved, mode: 'sparse', recordCount: written.length, dirtyDomains, manifest };
    },

    async loadSparseSlotData(app, slotName) {
        slotName = app._normalizeSaveSlotName(slotName);
        const manifest = await app._dbGet('saveManifests', slotName).catch(() => null);
        if (!manifest || manifest.schema !== 'yaw-sparse-save-v1' || !manifest.recordKeys) return null;
        const records = {};
        for (const [domain, key] of Object.entries(manifest.recordKeys)) {
            const record = await app._dbGet('saveRecords', key).catch(() => null);
            if (record?.schema === 'yaw-save-record-v1' && record.domain === domain) {
                records[domain] = record.data || {};
            } else {
                console.warn('Sparse save record missing or invalid; falling back to full save if available', { slotName, domain, key });
                return null;
            }
        }
        return this.buildSparseLoadedData(records, manifest);
    },

    async runAutoSave(app) {
        if (app._autoSaveSuppressed || !app.player || app.screen !== 'game') return false;
        const state = this.autoSaveState(app);
        if (state.saving) {
            state.dirty = true;
            this.sparseSaveState(app).queueState = 'saving-dirty';
            return state.running || false;
        }
        state.dirty = false;
        state.saving = true;
        this.sparseSaveState(app).queueState = 'saving';
        state.running = (async () => {
            try {
                const result = await this.writeSlot(app, app.activeSlot, { auto: true });
                console.log('Auto-saved to', result.slotName);
                return true;
            } catch (e) {
                console.error('Auto-save failed:', e);
                const sparse = this.sparseSaveState(app);
                sparse.lastError = e?.message || String(e);
                sparse.lastMode = 'fallback';
                return false;
            } finally {
                state.saving = false;
                state.running = null;
                this.sparseSaveState(app).queueState = state.dirty ? 'scheduled' : 'idle';
                if (state.dirty && app.player && app.screen === 'game') this.autoSave(app, { delayMs: 0 });
            }
        })();
        return state.running;
    },

    async flushAutoSave(app) {
        if (app._autoSaveSuppressed) return false;
        const state = this.autoSaveState(app);
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        state.dirty = true;
        this.sparseSaveState(app).queueState = 'scheduled';
        let saved = false;
        while (true) {
            const result = state.running
                ? await state.running
                : await this.runAutoSave(app);
            saved = Boolean(result) || saved;
            if (app._autoSaveSuppressed || !app.player || app.screen !== 'game') return saved;
            if (state.timer) {
                clearTimeout(state.timer);
                state.timer = null;
            }
            if (!state.dirty && !state.running) return saved;
        }
    },

    async autoSave(app) {
        const options = arguments[1] || {};
        if (app._autoSaveSuppressed) return false;
        if (options.immediate === true) return this.flushAutoSave(app);
        if (!app.player || app.screen !== 'game') return false;
        const state = this.autoSaveState(app);
        state.dirty = true;
        if (!this.hasDirtySaveDomains(app)) this.markDefaultAutoDirty(app, options.reason || 'autosave-call-without-targeted-domains');
        if (state.timer) clearTimeout(state.timer);
        const delay = this.autoSaveDelay(app, options);
        this.sparseSaveState(app).queueState = 'scheduled';
        state.timer = setTimeout(() => {
            state.timer = null;
            this.runAutoSave(app);
        }, delay);
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SAVE_PERSISTENCE = YAW_SAVE_PERSISTENCE;
}
