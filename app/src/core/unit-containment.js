/**
 * YOU ARE WILD UNIT CONTAINMENT
 * Shared contained-unit snapshots, vital integrity, and containment tick processing.
 */

const YAW_UNIT_CONTAINMENT = {
    defaultContainerProfiles() {
        return {
            stomach: {
                id: 'stomach',
                label: 'Belly',
                safeLabel: 'Belly',
                contentTier: 0,
                ownerType: 'unit',
                accepts: ['contained-unit'],
                tags: ['stomach', 'containment', 'v1'],
                capacityRule: 'size-plus-appetite',
                tickRule: 'slow-condition-progress',
                releaseRule: 'command-before-terminal',
                absorptionRule: 'capped-restoration',
                terminalRule: 'progress-or-condition-zero',
                actions: ['inspect', 'digest', 'release'],
                digestionRate: 5,
                slowDigestionRate: 2,
                absorptionRate: 1
            },
            womb: {
                id: 'womb',
                label: 'Inner',
                safeLabel: 'Inner',
                contentTier: 1,
                ownerType: 'unit',
                accepts: ['contained-unit'],
                tags: ['inner', 'containment', 'compatibility'],
                capacityRule: 'compatibility-half-capacity',
                tickRule: 'compatibility',
                releaseRule: 'command-before-terminal',
                absorptionRule: 'compatibility',
                terminalRule: 'progress-or-condition-zero',
                actions: ['inspect', 'release']
            },
            balls: {
                id: 'balls',
                label: 'Reserve',
                safeLabel: 'Reserve',
                contentTier: 1,
                ownerType: 'unit',
                accepts: ['contained-unit'],
                tags: ['reserve', 'containment', 'compatibility'],
                capacityRule: 'compatibility-half-capacity',
                tickRule: 'compatibility',
                releaseRule: 'command-before-terminal',
                absorptionRule: 'compatibility',
                terminalRule: 'progress-or-condition-zero',
                actions: ['inspect', 'release']
            }
        };
    },

    defaultFeastVerbProfiles() {
        return {
            swallow: {
                id: 'swallow',
                label: 'Swallow',
                safeLabel: 'Eat',
                contentTier: 0,
                tags: ['swallow', 'intact', 'containment'],
                containerId: 'stomach',
                integrity: 'intact'
            }
        };
    },

    normalizeVitalMax(recordOrUnit) {
        const captured = Number(recordOrUnit?.capturedPun);
        if (Number.isFinite(captured) && captured > 0) return Math.max(1, Math.floor(captured));
        const current = Number(recordOrUnit?.CPun);
        if (Number.isFinite(current) && current > 0) return Math.max(1, Math.floor(current));
        const max = Number(recordOrUnit?.MPun || recordOrUnit?.maxHp || 1);
        return Math.max(1, Math.floor(Number.isFinite(max) ? max : 1));
    },

    ensureRegistries(app) {
        if (!app.feastVerbProfiles || typeof app.feastVerbProfiles !== 'object') {
            app.feastVerbProfiles = { ...this.defaultFeastVerbProfiles(), ...(app.feastVerbProfiles || {}) };
        }
        if (!app.containerProfiles || typeof app.containerProfiles !== 'object') {
            app.containerProfiles = { ...this.defaultContainerProfiles(), ...(app.containerProfiles || {}) };
        }
        return { feastVerbProfiles: app.feastVerbProfiles, containerProfiles: app.containerProfiles };
    },

    registerFeastVerbProfile(app, profile = {}) {
        if (!profile || !profile.id) return null;
        this.ensureRegistries(app);
        app.feastVerbProfiles[profile.id] = { ...(app.feastVerbProfiles[profile.id] || {}), ...profile };
        return app.feastVerbProfiles[profile.id];
    },

    registerContainerProfile(app, profile = {}) {
        if (!profile || !profile.id) return null;
        this.ensureRegistries(app);
        app.containerProfiles[profile.id] = { ...(app.containerProfiles[profile.id] || {}), ...profile };
        return app.containerProfiles[profile.id];
    },

    profile(app, containerId = 'stomach') {
        this.ensureRegistries(app);
        return app.containerProfiles[containerId] || this.defaultContainerProfiles().stomach;
    },

    serviceKind(app, unit) {
        if (!unit) return null;
        if (unit.disposition === app?.DISPOSITION?.MERCHANT) return 'merchant';
        if (unit.disposition === app?.DISPOSITION?.QUEST_GIVER || unit.quest) return 'quest';
        return null;
    },

    overworldServiceOrigin(tile = null, structureId = '') {
        if (!tile || !Number.isFinite(Number(tile.x)) || !Number.isFinite(Number(tile.y))) return null;
        return {
            version: 1,
            scope: 'overworld',
            x: Number(tile.x),
            y: Number(tile.y),
            structureId: String(structureId || tile.structure || '')
        };
    },

    currentServiceLocation(app) {
        if (!app) return null;
        if (app.inInterior && app.activeInterior) {
            const origin = app.activeInterior.origin || app.interiorEntrySurface || app.location || {};
            return {
                version: 1,
                scope: 'interior',
                x: Number(origin.x || 0),
                y: Number(origin.y || 0),
                structureId: String(app.activeInterior.structure || ''),
                interiorId: String(app.activeInterior.id || ''),
                roomX: Number(app.interiorLocation?.x || 0),
                roomY: Number(app.interiorLocation?.y || 0)
            };
        }
        const tile = app._currentOverworldTile?.() || app.getTile?.(app.location?.x || 0, app.location?.y || 0) || app.location;
        return this.overworldServiceOrigin(tile, tile?.structure || '');
    },

    serviceOriginMatches(app, origin = null) {
        if (!origin || typeof origin !== 'object') return false;
        const current = this.currentServiceLocation(app);
        if (!current || String(origin.scope || 'overworld') !== current.scope) return false;
        if (Number(origin.x) !== current.x || Number(origin.y) !== current.y) return false;
        if (String(origin.structureId || '') !== String(current.structureId || '')) return false;
        if (current.scope === 'interior') {
            if (String(origin.interiorId || '') !== String(current.interiorId || '')) return false;
            if (Number(origin.roomX) !== current.roomX || Number(origin.roomY) !== current.roomY) return false;
        }
        return true;
    },

    captureServiceOrigin(app, unit) {
        if (!this.serviceKind(app, unit)) return null;
        if (!unit.serviceOrigin || typeof unit.serviceOrigin !== 'object') {
            unit.serviceOrigin = this.currentServiceLocation(app);
        }
        return unit.serviceOrigin || null;
    },

    suspendService(app, unit) {
        if (!this.serviceKind(app, unit)) return false;
        this.captureServiceOrigin(app, unit);
        unit.serviceSuspended = true;
        return true;
    },

    refreshReleasedService(app, unit) {
        if (!this.serviceKind(app, unit)) return false;
        unit.serviceSuspended = !this.serviceOriginMatches(app, unit.serviceOrigin);
        return !unit.serviceSuspended;
    },

    serviceAvailable(app, unit) {
        if (!this.serviceKind(app, unit)) return false;
        if (unit.serviceSuspended !== true) return true;
        if (!this.serviceOriginMatches(app, unit.serviceOrigin)) return false;
        unit.serviceSuspended = false;
        app?.markAutoSaveDirty?.(['currentTile', 'worldTiles'], 'service-returned-home');
        return true;
    },

    createPrey(app, target, extra = {}) {
        this.suspendService(app, target);
        const containerId = extra.containerId || (extra.inWomb ? 'womb' : extra.inCock ? 'balls' : 'stomach');
        const entryVerb = extra.entryVerb || (containerId === 'stomach' ? 'swallow' : containerId);
        const capturedPun = Number.isFinite(target.CPun) ? Math.max(1, target.CPun) : Math.max(1, target.MPun || 1);
        const prey = {
            ...target,
            alive: true,
            inStomach: containerId === 'stomach' && !extra.inWomb && !extra.inCock,
            inWomb: extra.inWomb || false,
            inCock: extra.inCock || false,
            containerId,
            entryVerb,
            state: 'contained',
            progress: 0,
            digestionProgress: 0,
            digestionState: 'contained',
            releaseEligible: true,
            capturedPun,
            vitalMax: capturedPun,
            vitalRemaining: capturedPun,
            vitalDamageTaken: 0,
            originalStats: this.captureVitalProfile(target),
            statDrain: this.emptyStatDrain(),
            nutritionReliefMax: undefined,
            nutritionReliefApplied: 0,
            nutritionReliefRemainder: 0,
            initialSatietyApplied: false,
            temporaryStatEffects: [],
            willingSacrifice: extra.willingSacrifice || false,
            forcedFed: extra.forcedFed || false,
            by: extra.by || null
        };
        return this.normalizeRecord(app, extra.holder || null, prey, containerId, { ...extra, entryVerb });
    },

    captureVitalProfile(unit) {
        const stats = ['Figh', 'Feas', 'Flir', 'Fuck', 'Flee', 'Feed', 'str', 'con', 'spd', 'int', 'wis', 'cha'];
        return stats.reduce((profile, stat) => {
            profile[stat] = Number.isFinite(unit?.[stat]) ? unit[stat] : 0;
            return profile;
        }, {});
    },

    emptyStatDrain() {
        return { str: 0, con: 0, spd: 0, int: 0, wis: 0, cha: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 };
    },

    ensureStatDrain(prey) {
        prey.statDrain = { ...this.emptyStatDrain(), ...(prey.statDrain || {}) };
        return prey.statDrain;
    },

    normalizedState(prey) {
        if (prey?.state === 'softened' || prey?.digestionState === 'softened') return 'softened';
        if (prey?.state === 'terminal' || prey?.digestionState === 'terminal') return 'terminal';
        if (prey?.state === 'digested' || prey?.digestionState === 'digested') return 'digested';
        if (prey?.state === 'released' || prey?.digestionState === 'released') return 'released';
        if (prey?.state === 'passed' || prey?.digestionState === 'passed') return 'passed';
        if (prey?.state === 'depleted' || prey?.digestionState === 'depleted') return 'depleted';
        if (prey?.state === 'digesting' || prey?.digestionState === 'digesting' || (prey?.digestionProgress || 0) > 0) return 'digesting';
        return prey?.state || 'contained';
    },

    normalizeRecord(app, holder, prey, containerId = 'stomach', defaults = {}) {
        if (!prey || typeof prey !== 'object') return prey;
        const holderId = defaults.holderId || holder?.id || holder?.name || prey.holderId || null;
        const containedId = defaults.containedId || prey.containedId || prey.id || prey.name || null;
        const progress = Number.isFinite(prey.progress) ? prey.progress : Number(prey.digestionProgress || 0);
        const state = this.normalizedState(prey);
        const integrity = prey.integrity || defaults.integrity || (prey.alive === false ? 'damaged' : 'intact');
        const profile = this.profile(app, containerId);
        const clampedProgress = Math.max(0, Math.min(100, progress));
        prey.capturedPun = Number.isFinite(prey.capturedPun) ? Math.max(1, Math.floor(prey.capturedPun)) : this.normalizeVitalMax(prey);
        const vitalMax = Math.max(1, Number(prey.vitalMax || prey.capturedPun || 1));
        const inferredVital = Math.max(0, Math.round(vitalMax * (1 - clampedProgress / 100)));
        prey.holderId = holderId;
        prey.containedId = containedId;
        prey.containerId = prey.containerId || defaults.containerId || containerId;
        prey.entryVerb = prey.entryVerb || defaults.entryVerb || (prey.containerId === 'stomach' ? 'swallow' : prey.containerId);
        prey.state = state;
        prey.integrity = integrity;
        prey.progress = clampedProgress;
        prey.releaseEligible = typeof prey.releaseEligible === 'boolean'
            ? prey.releaseEligible
            : prey.integrity === 'intact' && !['terminal', 'digested', 'released', 'passed', 'depleted'].includes(state);
        prey.vitalMax = vitalMax;
        prey.vitalRemaining = Number.isFinite(prey.vitalRemaining) ? Math.max(0, Math.min(vitalMax, prey.vitalRemaining)) : inferredVital;
        prey.vitalDamageTaken = Number.isFinite(prey.vitalDamageTaken) ? Math.max(0, prey.vitalDamageTaken) : Math.max(0, vitalMax - prey.vitalRemaining);
        prey.originalStats = prey.originalStats && typeof prey.originalStats === 'object'
            ? { ...this.captureVitalProfile(prey), ...prey.originalStats }
            : this.captureVitalProfile(prey);
        prey.digestionRate = Number.isFinite(prey.digestionRate) ? prey.digestionRate : profile.digestionRate || 5;
        prey.absorptionRate = Number.isFinite(prey.absorptionRate) ? prey.absorptionRate : profile.absorptionRate || 1;
        const nutritionPerSize = Number(app?.BALANCE_V1?.relief?.containmentNutritionPerSize ?? 15);
        const nutritionMax = Math.max(1, Math.min(100, Math.round(Math.max(1, Number(prey.size || 1)) * nutritionPerSize)));
        prey.nutritionReliefMax = Number.isFinite(prey.nutritionReliefMax) ? Math.max(0, prey.nutritionReliefMax) : nutritionMax;
        prey.nutritionReliefApplied = Number.isFinite(prey.nutritionReliefApplied) ? Math.max(0, prey.nutritionReliefApplied) : 0;
        prey.nutritionReliefRemainder = Number.isFinite(prey.nutritionReliefRemainder) ? Math.max(0, prey.nutritionReliefRemainder) : 0;
        prey.initialSatietyApplied = Boolean(prey.initialSatietyApplied);
        prey.temporaryStatEffects = Array.isArray(prey.temporaryStatEffects) ? prey.temporaryStatEffects : [];
        prey.modifiers = prey.modifiers && typeof prey.modifiers === 'object' ? prey.modifiers : {};
        prey.tags = Array.isArray(prey.tags) ? Array.from(new Set([...prey.tags, 'containment', prey.entryVerb, prey.integrity])) : ['containment', prey.entryVerb, prey.integrity];
        if ((prey.vitalRemaining <= 0 || prey.progress >= 100) && !['released', 'passed', 'depleted', 'digested'].includes(prey.state)) {
            prey.state = 'terminal';
            prey.releaseEligible = false;
        }
        prey.digestionProgress = prey.progress;
        prey.digestionState = prey.state === 'terminal' ? 'terminal' : prey.state === 'digested' ? 'digested' : prey.state === 'released' ? 'released' : prey.state === 'depleted' ? 'depleted' : prey.state === 'digesting' ? 'digesting' : 'contained';
        this.ensureStatDrain(prey);
        return prey;
    },

    applyInitialSatiety(app, holder, prey, containerId = 'stomach') {
        if (!holder || !prey || prey.initialSatietyApplied) return 0;
        prey.initialSatietyApplied = true;
        if (containerId !== 'stomach') return 0;
        const perSize = Number(app?.BALANCE_V1?.relief?.containmentFullnessPerSize ?? 3);
        const relief = Math.max(1, Math.min(20, Math.round(Math.max(1, Number(prey.size || 1)) * perSize)));
        const before = Math.max(0, Number(holder.hunger || 0));
        holder.hunger = Math.max(0, before - relief);
        return before - holder.hunger;
    },

    applyDigestionNutrition(app, holder, prey, progressDelta = 0) {
        if (!holder || !prey || progressDelta <= 0) return 0;
        const maximum = Math.max(0, Number(prey.nutritionReliefMax || 0));
        const applied = Math.max(0, Number(prey.nutritionReliefApplied || 0));
        const remaining = Math.max(0, maximum - applied);
        if (remaining <= 0) return 0;
        const raw = maximum * (Math.max(0, Number(progressDelta)) / 100) + Math.max(0, Number(prey.nutritionReliefRemainder || 0));
        const requested = Math.min(remaining, Math.floor(raw));
        prey.nutritionReliefRemainder = Math.max(0, raw - Math.floor(raw));
        if (requested <= 0) return 0;
        const before = Math.max(0, Number(holder.hunger || 0));
        holder.hunger = Math.max(0, before - requested);
        const actual = before - holder.hunger;
        prey.nutritionReliefApplied = applied + requested;
        return actual;
    },

    digestionPaceState(app, holder, containerId = 'stomach') {
        const config = this.containerConfigs().find(entry => entry.key === containerId);
        if (!config) return null;
        const baseRate = app?.settings?.slowDigestion ? config.slowRate : config.fastRate;
        if (containerId !== 'stomach' || typeof app?._digestionRateState !== 'function') {
            return { hunger: Number(holder?.hunger || 0), baseRate, multiplier: 1, rate: baseRate, pace: 'steady', label: app?._label?.('containment.digestionPace.steady', 'Steady') || 'Steady' };
        }
        return app._digestionRateState(holder, baseRate);
    },

    digestionPaceText(app, holder, containerId = 'stomach') {
        if (containerId !== 'stomach') return '';
        const state = this.digestionPaceState(app, holder, containerId);
        if (!state) return '';
        const rate = Number.isInteger(state.rate) ? String(state.rate) : String(Number(state.rate.toFixed(2)));
        return app._label('containment.digestionPace', 'Digestion pace: {pace} ({rate}%/tick)', {
            pace: state.label,
            rate
        });
    },

    normalizeContainer(app, holder, containerId = 'stomach') {
        const list = holder?.[containerId] || [];
        for (const prey of list) this.normalizeRecord(app, holder, prey, containerId);
        return list;
    },

    isActiveContained(prey, containerId = 'stomach') {
        if (!prey) return false;
        const state = this.normalizedState(prey);
        if (['terminal', 'digested', 'released', 'passed', 'depleted'].includes(state)) return false;
        if (containerId === 'stomach' && prey.inStomach === false) return false;
        return prey.alive !== false && prey.CPun !== 0;
    },

    containedCondition(prey) {
        const max = Math.max(1, Number(prey?.MPun || prey?.maxHp || 1));
        const current = Number.isFinite(prey?.CPun) ? prey.CPun : max;
        return { current, max };
    },

    vitalRatio(record) {
        if (!record) return 0;
        const max = Math.max(1, Number(record.vitalMax || record.MPun || record.maxHp || 1));
        const current = Math.max(0, Math.min(max, Number.isFinite(record.vitalRemaining) ? record.vitalRemaining : max));
        return current / max;
    },

    canReleaseFromVitalState(record) {
        if (!record) return false;
        if (['terminal', 'digested', 'released', 'passed', 'depleted'].includes(this.normalizedState(record))) return false;
        return record.releaseEligible !== false && Number(record.vitalRemaining ?? record.CPun ?? 0) > 0;
    },

    isTerminalVitalState(record) {
        if (!record) return false;
        if (this.normalizedState(record) === 'softened') return false;
        return record.state === 'terminal'
            || record.digestionState === 'terminal'
            || (Number.isFinite(record.vitalRemaining) && record.vitalRemaining <= 0)
            || (Number.isFinite(record.progress) && record.progress >= 100);
    },

    applyVitalDamage(recordOrUnit, amount = 0, context = {}) {
        if (!recordOrUnit) return null;
        if (!Number.isFinite(recordOrUnit.capturedPun)) recordOrUnit.capturedPun = this.normalizeVitalMax(recordOrUnit);
        const max = Math.max(1, Number(recordOrUnit.vitalMax || recordOrUnit.capturedPun || 1));
        if (!Number.isFinite(recordOrUnit.vitalMax)) recordOrUnit.vitalMax = max;
        if (!Number.isFinite(recordOrUnit.vitalRemaining)) {
            const progress = Number(recordOrUnit.progress ?? recordOrUnit.digestionProgress ?? 0);
            recordOrUnit.vitalRemaining = Math.max(0, Math.round(max * (1 - Math.max(0, Math.min(100, progress)) / 100)));
        }
        if (!recordOrUnit.originalStats) recordOrUnit.originalStats = this.captureVitalProfile(recordOrUnit);
        const damage = Math.max(0, Math.floor(Number(amount) || 0));
        const before = recordOrUnit.vitalRemaining;
        recordOrUnit.vitalRemaining = Math.max(0, before - damage);
        recordOrUnit.vitalDamageTaken = Math.max(0, Number(recordOrUnit.vitalDamageTaken || 0) + (before - recordOrUnit.vitalRemaining));
        if (context.reduceCondition !== false && Number.isFinite(recordOrUnit.CPun)) {
            recordOrUnit.CPun = Math.max(context.minimumCondition || 0, recordOrUnit.CPun - damage);
        }
        if (recordOrUnit.vitalRemaining <= 0) {
            recordOrUnit.releaseEligible = false;
            if (context.terminal !== false) {
                recordOrUnit.state = recordOrUnit.state === 'released' ? 'released' : 'terminal';
                recordOrUnit.digestionState = recordOrUnit.state === 'released' ? 'released' : 'terminal';
            }
        }
        return recordOrUnit;
    },

    releaseFromVitalState(record) {
        if (!record) return null;
        const ratio = Math.max(0.05, this.vitalRatio(record));
        record.CPun = Math.max(1, Math.floor(Number(record.vitalRemaining || 0)));
        record.CPle = 0;
        record.status = record.status || {};
        if (ratio < 0.75) {
            record.status.vitalWeakness = {
                ratio,
                source: 'containment',
                label: 'Vital Weakness'
            };
        }
        record.inStomach = false;
        record.inWomb = false;
        record.inCock = false;
        record.state = 'released';
        record.digestionState = 'released';
        record.releaseEligible = false;
        return record;
    },

    normalizeRemainsRecord(record, defaults = {}) {
        if (!record || typeof record !== 'object') return record;
        record.kind = 'remains';
        record.corpseOf = record.corpseOf || record.sourceId || record.originalId || record.id || record.name || defaults.corpseOf || null;
        record.displayName = record.displayName || record.corpseName || record.name || defaults.displayName || 'Remains';
        record.species = record.species || defaults.species || 'unknown';
        record.size = Math.max(1, Number(record.size || defaults.size || 1));
        const legacyPortions = Number(record.remainingPortions);
        const initialMass = Math.max(0, Math.floor(Number.isFinite(legacyPortions) ? legacyPortions : Math.ceil(record.size)));
        record.edibleMax = Math.max(0, Math.floor(Number.isFinite(Number(record.edibleMax)) ? Number(record.edibleMax) : initialMass));
        record.edibleRemaining = Math.max(0, Math.floor(Number.isFinite(Number(record.edibleRemaining)) ? Number(record.edibleRemaining) : (record.scavenged ? 0 : initialMass)));
        record.portionsRemaining = Math.max(0, Math.floor(Number.isFinite(Number(record.portionsRemaining)) ? Number(record.portionsRemaining) : record.edibleRemaining));
        record.remainingPortions = record.portionsRemaining;
        record.source = record.source || record.corpseCause || defaults.source || 'fight';
        record.decayTurns = record.decayTurns ?? defaults.decayTurns ?? 12;
        record.depleted = Boolean(record.depleted || record.scavenged || record.edibleRemaining <= 0 || record.portionsRemaining <= 0);
        record.scavenged = record.depleted;
        return record;
    },

    applyRemainsScavenge(record, actor, amount = 1, context = {}) {
        if (!record || !actor) return null;
        this.normalizeRemainsRecord(record);
        const consumed = Math.min(record.edibleRemaining, Math.max(1, Math.floor(Number(amount) || 1)));
        if (consumed <= 0) {
            record.depleted = true;
            record.scavenged = true;
            return null;
        }
        record.edibleRemaining = Math.max(0, record.edibleRemaining - consumed);
        record.portionsRemaining = record.edibleRemaining;
        record.remainingPortions = record.edibleRemaining;
        if (record.edibleRemaining <= 0) {
            record.depleted = true;
            record.scavenged = true;
        }
        if (context.applyBenefits !== false) {
            const maxPun = Number.isFinite(Number(actor.MPun)) ? Number(actor.MPun) : (actor.CPun || 0);
            actor.hunger = Math.max(0, (actor.hunger || 0) - 10 * consumed);
            actor.CPun = Math.min(maxPun, (actor.CPun || 0) + 5 * consumed);
        }
        return { actor, consumed, remaining: record.edibleRemaining };
    },

    isDepletedRemains(record) {
        if (!record) return true;
        this.normalizeRemainsRecord(record);
        return record.depleted || record.edibleRemaining <= 0;
    },

    stateLabel(app, state = 'contained') {
        const normalized = String(state || 'contained');
        const fallbacks = {
            contained: 'Contained', digesting: 'Digesting', softened: 'Softened', terminal: 'Terminal',
            digested: 'Digested', released: 'Released', passed: 'Passed', depleted: 'Depleted'
        };
        return app?._label?.(`containment.state.${normalized}`, fallbacks[normalized] || normalized) || fallbacks[normalized] || normalized;
    },

    integrityLabel(app, integrity = 'intact') {
        const normalized = String(integrity || 'intact');
        const fallbacks = { intact: 'Intact', damaged: 'Damaged' };
        return app?._label?.(`containment.integrity.${normalized}`, fallbacks[normalized] || normalized) || fallbacks[normalized] || normalized;
    },

    summary(app, record) {
        if (!record) return '';
        const ratio = Math.round(this.vitalRatio(record) * 100);
        const state = this.normalizedState(record);
        const release = record.releaseEligible && ratio > 0
            ? app._label('containment.summary.releasable', 'Releasable')
            : app._label('containment.summary.notReleasable', 'Not releasable');
        return app._label('containment.summary', '{state} · {vitality} {ratio}% · {release}', {
            state: this.stateLabel(app, state),
            vitality: app._label('containment.vitality', 'Vitality'),
            ratio,
            release
        });
    },

    containerLabel(app, container = 'stomach') {
        if (container === 'womb') return app._label('capacity.womb', 'Inner');
        if (container === 'balls') return app._label('capacity.balls', 'Reserve');
        return app._label('capacity.stomach', 'Belly');
    },

    visibleContainedEntries(app, holder, container = 'stomach') {
        const list = this.normalizeContainer(app, holder, container) || [];
        return list
            .map((prey, index) => ({ prey, index, state: this.normalizedState(prey) }))
            .filter(entry => this.isActiveContained(entry.prey, container));
    },

    consumedContainedEntries(app, holder, container = 'stomach') {
        const list = this.normalizeContainer(app, holder, container) || [];
        return list
            .map((prey, index) => ({ prey, index, state: this.normalizedState(prey) }))
            .filter(entry => ['terminal', 'digested', 'depleted'].includes(entry.state));
    },

    canManageContainerEntry(app, holder) {
        if (!app?.combatState?.active) return true;
        return holder && holder === app._currentCombatActor?.();
    },

    renderContainerInventory(app, holder, holderType = 'party', holderIndex = 0, options = {}) {
        if (!app || !holder) return '';
        const containers = ['stomach', 'womb', 'balls'];
        const sections = [];
        const consumedSections = [];
        const canManage = this.canManageContainerEntry(app, holder);
        const combatBlockTitle = app._label('containment.combatManageCurrentOnly', 'Only the current combat actor can manage contained creatures.');
        const holderArg = app._escapeJsString(holderType);
        for (const container of containers) {
            const entries = this.visibleContainedEntries(app, holder, container);
            const consumedEntries = this.consumedContainedEntries(app, holder, container);
            const used = app._containerUsed?.(holder, container) ?? 0;
            const capacity = app._containerCapacity?.(holder, container) ?? 0;
            if (!entries.length && !consumedEntries.length && container !== 'stomach') continue;
            const label = this.containerLabel(app, container);
            const entryHtml = entries.length
                ? entries.map(({ prey, index, state }) => {
                    const name = prey.name || app._label('containment.unknownPrey', 'Contained creature');
                    const stateText = this.stateLabel(app, state);
                    const vital = Math.round(this.vitalRatio(prey) * 100);
                    const progress = Math.round(prey.progress ?? prey.digestionProgress ?? 0);
                    const canRelease = canManage && this.canReleaseFromVitalState(prey);
                    const canDigest = canManage && !['softened', 'terminal', 'digested', 'released', 'passed', 'depleted'].includes(state);
                    const disabledReason = canManage ? '' : combatBlockTitle;
                    const releaseTitle = canRelease
                        ? app._label('containment.releaseTitle', 'Release {name}', { name })
                        : (disabledReason || app._label('containment.releaseUnavailable', '{name} cannot be released now.', { name }));
                    const digestTitle = canDigest
                        ? app._label('containment.digestTitle', 'Digest {name}', { name })
                        : (disabledReason || app._label('containment.digestUnavailable', '{name} cannot be digested now.', { name }));
                    const releaseDisabled = canRelease ? '' : ' disabled aria-disabled="true"';
                    const digestDisabled = canDigest ? '' : ' disabled aria-disabled="true"';
                    const containerArg = app._escapeJsString(container);
                    const inspectTitle = app._escapeHtml(app._label('containment.inspectTitle', 'Inspect {name}', { name }));
                    const paceText = this.digestionPaceText(app, holder, container);
                    return `<div class="container-inventory-entry" data-contained-id="${app._escapeHtml(prey.containedId || prey.id || prey.name || String(index))}" data-contained-state="${app._escapeHtml(state)}">
                        <div class="container-entry-main">
                            <div class="container-entry-name">${app._escapeHtml(prey.icon || '')} ${app._escapeHtml(name)}</div>
                            <div class="container-entry-meta">${app._escapeHtml(stateText)} · ${app._escapeHtml(app._label('containment.vitality', 'Vitality'))} ${vital}% · ${app._escapeHtml(app._label('containment.progress', 'Progress'))} ${progress}%${paceText ? ` · ${app._escapeHtml(paceText)}` : ''}</div>
                        </div>
                        <div class="container-entry-actions" data-command-surface="container-inventory" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-grammar="container-management">
                            <button class="action-btn" data-command-control="inspect-contained" title="${inspectTitle}" aria-label="${inspectTitle}" onclick="event.stopPropagation();App.inspectContained('${holderArg}',${holderIndex},'${containerArg}',${index})">${app._escapeHtml(app._label('containment.inspect', 'Inspect'))}</button>
                            <button class="action-btn" data-command-control="release-contained" title="${app._escapeHtml(releaseTitle)}" aria-label="${app._escapeHtml(releaseTitle)}"${releaseDisabled} onclick="event.stopPropagation();App.releaseContained('${holderArg}',${holderIndex},'${containerArg}',${index})">${app._escapeHtml(app._label('containment.release', 'Release'))}</button>
                            <button class="action-btn" data-command-control="digest-contained" title="${app._escapeHtml(digestTitle)}" aria-label="${app._escapeHtml(digestTitle)}"${digestDisabled} onclick="event.stopPropagation();App.digestContained('${holderArg}',${holderIndex},'${containerArg}',${index})">${app._escapeHtml(app._label('containment.digest', 'Digest'))}</button>
                        </div>
                    </div>`;
                }).join('')
                : `<div class="container-inventory-empty">${app._escapeHtml(app._label('containment.noActiveContained', 'No active contained creatures.'))}</div>`;
            sections.push(`<section class="container-inventory-section" data-container-id="${app._escapeHtml(container)}">
                <div class="container-inventory-header">
                    <strong>${app._escapeHtml(label)}</strong>
                    <span>${app._escapeHtml(String(used))}/${app._escapeHtml(String(capacity))}</span>
                </div>
                ${entryHtml}
            </section>`);
            if (consumedEntries.length) {
                const containerArg = app._escapeJsString(container);
                const consumedHtml = consumedEntries.map(({ prey, index, state }) => {
                    const name = prey.name || app._label('containment.unknownPrey', 'Contained creature');
                    const stateText = this.stateLabel(app, state);
                    const vital = Math.round(this.vitalRatio(prey) * 100);
                    const progress = Math.round(prey.progress ?? prey.digestionProgress ?? 0);
                    const inspectTitle = app._escapeHtml(app._label('containment.inspectConsumedTitle', 'Inspect consumed {name}', { name }));
                    return `<div class="container-inventory-entry consumed-entry" data-contained-id="${app._escapeHtml(prey.containedId || prey.id || prey.name || String(index))}" data-contained-state="${app._escapeHtml(state)}" data-contained-list="consumed">
                        <div class="container-entry-main">
                            <div class="container-entry-name">${app._escapeHtml(prey.icon || '')} ${app._escapeHtml(name)}</div>
                            <div class="container-entry-meta">${app._escapeHtml(label)} · ${app._escapeHtml(stateText)} · ${app._escapeHtml(app._label('containment.vitality', 'Vitality'))} ${vital}% · ${app._escapeHtml(app._label('containment.progress', 'Progress'))} ${progress}%</div>
                        </div>
                        <div class="container-entry-actions" data-command-surface="container-inventory" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-grammar="container-management">
                            <button class="action-btn" data-command-control="inspect-contained" title="${inspectTitle}" aria-label="${inspectTitle}" onclick="event.stopPropagation();App.inspectContained('${holderArg}',${holderIndex},'${containerArg}',${index})">${app._escapeHtml(app._label('containment.inspect', 'Inspect'))}</button>
                        </div>
                    </div>`;
                }).join('');
                consumedSections.push(`<section class="container-inventory-section consumed-inventory-section" data-container-id="${app._escapeHtml(container)}" data-contained-list="consumed">
                    ${consumedHtml}
                </section>`);
            }
        }
        if (!sections.length && !consumedSections.length) return '';
        const title = app._escapeHtml(app._label('containment.inventoryTitle', 'Containers'));
        const titleHtml = options.showTitle === false ? '' : `<div class="container-inventory-title">${title}</div>`;
        const consumedTitle = consumedSections.length
            ? `<div class="container-inventory-title consumed-inventory-title">${app._escapeHtml(app._label('containment.consumedTitle', 'Consumed'))}</div>`
            : '';
        return `<div class="container-inventory" data-command-surface="container-inventory" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-grammar="container-management" aria-label="${title}">
            ${titleHtml}
            ${sections.join('')}
            ${consumedTitle}
            ${consumedSections.join('')}
        </div>`;
    },

    resolveHolder(app, holderType = 'party', holderIndex = 0) {
        const list = holderType === 'creature' ? app.creatures : app.party;
        return { list, holder: list?.[holderIndex] || null };
    },

    refreshAfterContainerCommand(app, holderType = 'party') {
        app.renderParty?.();
        app.renderCreatures?.();
        app.renderLog?.();
        app.renderStoryEvents?.();
        app.refreshHoldingsWindow?.();
        if (app.combatState?.active) {
            const actor = app._currentCombatActor?.() || app.activeActor;
            app.renderDesktopCombatComposer?.(actor);
            app.renderMobileCombatToolbelt?.();
            app.renderSelectionSentence?.();
        }
        if (holderType === 'creature') app.renderCreatures?.();
    },

    livingEnemyCreatures(app) {
        const enemies = Array.isArray(app?.creatures) ? app.creatures : [];
        return enemies.filter(unit => unit?.disposition === app.DISPOSITION?.ENEMY && (app._isLivingCreature?.(unit) ?? unit.CPun > 0));
    },

    resumeCombatAfterRelease(app, released) {
        if (!app || app.combatState?.active || !released) return false;
        if (released.disposition !== app.DISPOSITION?.ENEMY) return false;
        if (!(app._isLivingCreature?.(released) ?? released.CPun > 0)) return false;
        if (typeof app.startCombat !== 'function') return false;
        const tile = app._currentExplorationTile?.();
        const releasedRef = app._unitSelectionId?.(released) || released.id || released.name;
        const tileHasReleased = (tile?.creatures || []).some(unit => unit === released || (app._unitSelectionId?.(unit) || unit?.id || unit?.name) === releasedRef);
        if (tile && Array.isArray(tile.creatures) && !tileHasReleased) {
            tile.creatures = app._tileCreatures?.([...(tile.creatures || []), released]) || [...tile.creatures, released];
        }
        const enemies = this.livingEnemyCreatures(app);
        if (!enemies.length) return false;
        app.startCombat(enemies);
        return true;
    },

    containedDetailHtml(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        const { holder } = this.resolveHolder(app, holderType, holderIndex);
        if (!holder) return null;
        const list = holder[container] || [];
        const prey = list[containedIndex];
        if (!prey) return null;
        this.normalizeRecord(app, holder, prey, container);
        const title = `${prey.icon || ''} ${prey.name || app._label('containment.unknownPrey', 'Contained creature')}`;
        const state = this.normalizedState(prey);
        const stateText = this.stateLabel(app, state);
        const vital = Math.round(this.vitalRatio(prey) * 100);
        const progress = Math.round(prey.progress ?? prey.digestionProgress ?? 0);
        const paceText = this.digestionPaceText(app, holder, container);
        const containerLabel = this.containerLabel(app, container);
        const backText = app._label('inventory.back', 'Back');
        const releaseText = app._label('containment.release', 'Release');
        const digestText = app._label('containment.digest', 'Digest');
        const backLabel = app._escapeHtml(backText);
        const holderTypeArg = app._escapeJsString(holderType);
        const containerArg = app._escapeJsString(container);
        const releaseAvailable = this.canReleaseFromVitalState(prey);
        const terminal = ['softened', 'terminal', 'digested', 'released', 'passed', 'depleted'].includes(state);
        const releaseButton = releaseAvailable
            ? `<button class="nav-btn" data-command-surface="container-inspect" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-control="release-contained" title="${app._escapeHtml(app._label('containment.releaseTitle', 'Release {name}', { name: prey.name || app._label('containment.unknownPrey', 'Contained creature') }))}" aria-label="${app._escapeHtml(app._label('containment.releaseTitle', 'Release {name}', { name: prey.name || app._label('containment.unknownPrey', 'Contained creature') }))}" onclick="App.releaseContained('${holderTypeArg}',${holderIndex},'${containerArg}',${containedIndex})">${app._escapeHtml(releaseText)}</button>`
            : '';
        const digestButton = !terminal
            ? `<button class="nav-btn" data-command-surface="container-inspect" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-control="digest-contained" title="${app._escapeHtml(app._label('containment.digestTitle', 'Digest {name}', { name: prey.name || app._label('containment.unknownPrey', 'Contained creature') }))}" aria-label="${app._escapeHtml(app._label('containment.digestTitle', 'Digest {name}', { name: prey.name || app._label('containment.unknownPrey', 'Contained creature') }))}" onclick="App.digestContained('${holderTypeArg}',${holderIndex},'${containerArg}',${containedIndex})">${app._escapeHtml(digestText)}</button>`
            : '';
        const html = `<div class="inventory-panel-detail holdings-detail" data-command-surface="container-inspect" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}">
            <h3>${app._escapeHtml(title)}</h3>
            <div class="holdings-section">
                <div class="holdings-section-title">${app._escapeHtml(containerLabel)} · ${app._escapeHtml(holder.name || app._label('ui.unknown', 'Unknown'))}</div>
                <div class="holdings-entry">
                    <div class="holding-entry-main">
                        <strong>${app._escapeHtml(prey.name || app._label('containment.unknownPrey', 'Contained creature'))}</strong>
                        <div class="holding-entry-meta">${app._escapeHtml(stateText)} · ${app._escapeHtml(app._label('containment.vitality', 'Vitality'))} ${vital}% · ${app._escapeHtml(app._label('containment.progress', 'Progress'))} ${progress}%${paceText ? ` · ${app._escapeHtml(paceText)}` : ''}</div>
                        <div class="holding-entry-meta">${app._escapeHtml(app._label('containment.integrity', 'Integrity'))}: ${app._escapeHtml(this.integrityLabel(app, prey.integrity || 'intact'))} · ${app._escapeHtml(app._label('containment.releaseEligible', 'Release'))}: ${releaseAvailable ? app._escapeHtml(app._label('ui.yes', 'Yes')) : app._escapeHtml(app._label('ui.no', 'No'))}</div>
                    </div>
                </div>
                <div class="holding-entry-actions">${releaseButton}${digestButton}<button class="nav-btn" data-command-surface="container-inspect" data-command-control="back-holdings" data-command-slot="exit" title="${backLabel}" aria-label="${backLabel}" onclick="App.setHoldingsTab ? App.setHoldingsTab('containers') : App.showInventory()">${backLabel}</button></div>
            </div>
        </div>`;
        return { title, html };
    },

    inspectContained(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        if (app.showContainedHoldingDetail?.(holderType, holderIndex, container, containedIndex)) return true;
        const detail = this.containedDetailHtml(app, holderType, holderIndex, container, containedIndex);
        if (!detail) return false;
        app.showPartyPanelDetail(detail.title, detail.html);
        return true;
    },

    releaseContained(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        const { holder } = this.resolveHolder(app, holderType, holderIndex);
        if (!holder) return false;
        if (!this.canManageContainerEntry(app, holder)) {
            app.log?.push?.({ text: app._label('containment.releaseCurrentActorOnly', '{container}: only the current combat actor can release contained creatures.', {
                container: this.containerLabel(app, container)
            }), type: 'combat' });
            app.renderLog?.();
            return false;
        }
        const list = holder[container] || [];
        const prey = list[containedIndex];
        if (!prey) return false;
        this.normalizeRecord(app, holder, prey, container);
        if (!this.canReleaseFromVitalState(prey)) {
            app.log?.push?.({ text: app._label('containment.releaseUnavailable', '{name} cannot be released now.', {
                name: prey.name || app._label('containment.unknownPrey', 'Contained creature')
            }), type: app.combatState?.active ? 'combat' : 'discovery' });
            this.refreshAfterContainerCommand(app, holderType);
            return false;
        }
        list.splice(containedIndex, 1);
        this.releaseFromVitalState(prey);
        this.refreshReleasedService(app, prey);
        if (!Array.isArray(app.creatures)) app.creatures = [];
        if (!app.creatures.includes(prey)) app.creatures.push(prey);
        app._syncCurrentTileCreatures?.();
        this.emitContainmentBeat(app, 'released', holder, prey, {
            deltas: [{ kind: 'state', state: 'released', unit: prey.name }]
        });
        app.log?.push?.({ text: app._label('containment.releaseLog', "{target} is released from {holder}'s {container} at reduced condition.", {
            target: prey.name || app._label('containment.unknownPrey', 'Contained creature'),
            holder: holder.name || app._label('containment.holderFallback', 'holder'),
            container: this.containerLabel(app, container)
        }), type: app.combatState?.active ? 'combat' : 'discovery' });
        const resumedCombat = this.resumeCombatAfterRelease(app, prey);
        this.refreshAfterContainerCommand(app, holderType);
        app.markAutoSaveDirty?.(['manifest', 'party', 'holdings', 'currentTile', 'worldTiles', 'combat', 'sceneFeed', 'activityLog'], 'containment-release');
        app.autoSave?.();
        if (app.combatState?.active && !resumedCombat) app.nextTurn?.();
        return true;
    },

    digestContained(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        const { holder } = this.resolveHolder(app, holderType, holderIndex);
        if (!holder) return false;
        if (!this.canManageContainerEntry(app, holder)) {
            app.log?.push?.({ text: app._label('containment.digestCurrentActorOnly', '{container}: only the current combat actor can digest contained creatures.', {
                container: this.containerLabel(app, container)
            }), type: 'combat' });
            app.renderLog?.();
            return false;
        }
        const list = holder[container] || [];
        const prey = list[containedIndex];
        if (!prey) return false;
        this.normalizeRecord(app, holder, prey, container);
        if (['softened', 'terminal', 'digested', 'released', 'passed', 'depleted'].includes(this.normalizedState(prey))) {
            app.log?.push?.({ text: app._label('containment.digestFurtherUnavailable', '{target} cannot be digested further.', {
                target: prey.name || app._label('containment.unknownPrey', 'Contained creature')
            }), type: app.combatState?.active ? 'combat' : 'discovery' });
            this.refreshAfterContainerCommand(app, holderType);
            return false;
        }
        prey.progress = 100;
        prey.digestionProgress = 100;
        this.terminalize(app, holder, prey, { key: container });
        app.log?.push?.({ text: app._label('containment.digestLog', '{holder} digests {target} in {container}.', {
            holder: holder.name || app._label('containment.holderFallback', 'Holder'),
            target: prey.name || app._label('containment.targetFallback', 'contained creature'),
            container: this.containerLabel(app, container)
        }), type: app.combatState?.active ? 'combat' : 'discovery' });
        this.refreshAfterContainerCommand(app, holderType);
        app.markAutoSaveDirty?.(['manifest', 'party', 'holdings', 'currentTile', 'worldTiles', 'combat', 'sceneFeed', 'activityLog'], 'containment-digest');
        app.autoSave?.();
        if (app.combatState?.active) app.nextTurn?.();
        return true;
    },

    emitContainmentBeat(app, kind, holder, prey, options = {}) {
        if (!app || typeof app.emitSceneBeat !== 'function' || !prey || !holder) return null;
        const targetName = prey.name || app._label('containment.targetFallback', 'the contained creature');
        const holderName = holder.name || app._label('containment.holderFallback', 'their holder');
        const summaries = {
            contained: app._label('containment.beat.contained', "{target} is held in {holder}'s stomach.", { target: targetName, holder: holderName }),
            digesting: app._label('containment.beat.digesting', "{target} weakens while held in {holder}'s stomach.", { target: targetName, holder: holderName }),
            softened: app._label('containment.beat.softened', '{target} is fully softened inside {holder}, but remains alive and can be released.', { target: targetName, holder: holderName }),
            released: app._label('containment.beat.released', "{target} is released from {holder}'s stomach, weakened but alive.", { target: targetName, holder: holderName }),
            terminal: app._label('containment.beat.terminal', '{target} is fully digested inside {holder}. {holder} feels restored.', { target: targetName, holder: holderName })
        };
        return app.emitSceneBeat({
            mode: app.combatState?.active ? 'combat' : 'adventure',
            action: 'feast',
            subAction: kind === 'terminal' ? 'digest' : kind,
            actors: [holder],
            targets: [prey],
            shape: 'one-to-one',
            tags: ['containment', kind, prey.entryVerb || 'swallow'],
            source: 'containment'
        }, summaries[kind] || summaries.contained, {
            resultKind: kind === 'terminal' ? 'resolved' : kind === 'released' ? 'recovery' : 'state',
            tags: ['containment', kind, prey.entryVerb || 'swallow'],
            source: 'containment',
            deltas: options.deltas || []
        });
    },

    applyTerminalAbsorption(app, holder, prey, config) {
        if (!holder || !prey || prey.absorptionApplied) return [];
        const size = Math.max(1, Number(prey.size || 1));
        const healAmount = Math.max(1, Math.min(12, Math.floor(size * 2)));
        const beforeHp = Number(holder.CPun || 0);
        const beforeHunger = Number(holder.hunger || 0);
        holder.CPun = Math.min(holder.MPun || beforeHp || 1, beforeHp + healAmount);
        const remainingNutrition = Math.max(0, Number(prey.nutritionReliefMax || 0) - Number(prey.nutritionReliefApplied || 0));
        if (remainingNutrition > 0) {
            holder.hunger = Math.max(0, beforeHunger - remainingNutrition);
            prey.nutritionReliefApplied = Number(prey.nutritionReliefApplied || 0) + remainingNutrition;
            prey.nutritionReliefRemainder = 0;
        }
        const effect = {
            id: `containment-${prey.containedId || prey.name || 'prey'}`,
            source: 'containment',
            stat: 'Feas',
            amount: 1,
            remainingTurns: 6,
            tags: ['temporary', 'containment', config?.key || 'stomach']
        };
        if (!Array.isArray(holder.temporaryStatEffects)) holder.temporaryStatEffects = [];
        holder.temporaryStatEffects.push(effect);
        prey.temporaryStatEffects = [effect];
        prey.absorptionApplied = true;
        return [
            { kind: 'healing', amount: holder.CPun - beforeHp, unit: holder.name },
            { kind: 'hunger', amount: beforeHunger - holder.hunger, unit: holder.name },
            { kind: 'temporary-stat', stat: 'Feas', amount: 1, unit: holder.name }
        ];
    },

    terminalize(app, holder, prey, config) {
        this.normalizeRecord(app, holder, prey, config.key || prey.containerId || 'stomach');
        if (prey.state === 'terminal' && prey.absorptionApplied) return prey;
        const playerRef = app?._unitSelectionId?.(app.player) || app?.player?.id || app?.player?.name;
        const preyRef = app?._unitSelectionId?.(prey) || prey?.id || prey?.name;
        const isPlayer = Boolean(app?.player && (prey === app.player || (playerRef && String(playerRef) === String(preyRef))));
        const survivable = Boolean(app?.settings?.endoMode) && !app?.settings?.fatalVore;
        if (survivable) {
            prey.state = 'softened';
            prey.digestionState = 'softened';
            prey.progress = 100;
            prey.digestionProgress = 100;
            prey.vitalRemaining = 1;
            prey.vitalDamageTaken = Math.max(0, Number(prey.vitalMax || 1) - 1);
            prey.releaseEligible = true;
            prey.alive = true;
            prey.CPun = 1;
            const deltas = this.applyTerminalAbsorption(app, holder, prey, config);
            if (!prey.softenedSceneBeatEmitted) {
                prey.softenedSceneBeatEmitted = true;
                this.emitContainmentBeat(app, 'softened', holder, prey, { deltas });
                app?.log?.push?.({ text: app._label('containment.softenedLog', '{target} is fully softened inside {holder} and can be released alive.', {
                    target: prey.name || app._label('containment.targetFallback', 'the contained creature'),
                    holder: holder.name || app._label('containment.holderFallback', 'their holder')
                }), type: 'combat' });
            }
            if (isPlayer) app?._resolvePlayerState?.({ status: 'captured', terminal: false, cause: 'survivable-containment', source: 'unit-containment' });
            return prey;
        }
        prey.state = 'terminal';
        prey.digestionState = 'terminal';
        prey.progress = 100;
        prey.digestionProgress = 100;
        prey.vitalRemaining = 0;
        prey.vitalDamageTaken = Math.max(prey.vitalMax || 1, Number(prey.vitalDamageTaken || 0));
        prey.releaseEligible = false;
        prey.alive = false;
        prey.CPun = 0;
        prey.CPle = 0;
        const deltas = this.applyTerminalAbsorption(app, holder, prey, config);
        if (!prey.terminalSceneBeatEmitted) {
            prey.terminalSceneBeatEmitted = true;
            this.emitContainmentBeat(app, 'terminal', holder, prey, { deltas });
            app?.log?.push?.({ text: app._label('containment.terminalLog', '{target} reaches terminal digestion inside {holder}.', {
                target: prey.name || app._label('containment.targetFallback', 'the contained creature'),
                holder: holder.name || app._label('containment.holderFallback', 'their holder')
            }), type: 'combat' });
        }
        if (isPlayer) app?._handlePlayerFall?.({ fatal: true, cause: 'fatal-digestion', source: 'unit-containment' });
        return prey;
    },

    containerConfigs() {
        return [
            {
                key: 'stomach',
                flag: 'inStomach',
                fastRate: 5,
                slowRate: 2,
                stats: ['str', 'con', 'Figh'],
                advanceContained: true,
                fatalLog: (prey, unit) => `${prey.name} is fully digested inside ${unit.name}.`,
                softLog: (prey, unit) => `${prey.name} is fully softened inside ${unit.name}, ready to be released or kept as endo.`
            },
            {
                key: 'womb',
                flag: 'inWomb',
                fastRate: 3,
                slowRate: 1,
                stats: ['cha', 'Flir', 'Fuck'],
                fatalLog: (prey, unit) => `${prey.name} perishes in ${unit.name}'s inner reserve.`,
                softLog: (prey, unit) => `${prey.name} is fully softened in ${unit.name}'s inner reserve.`
            },
            {
                key: 'balls',
                flag: 'inCock',
                fastRate: 3,
                slowRate: 1,
                stats: ['Feas', 'Fuck'],
                fatalLog: (prey, unit) => `${prey.name} dissolves in ${unit.name}'s reserve.`,
                softLog: (prey, unit) => `${prey.name} is fully softened in ${unit.name}'s reserve.`
            }
        ];
    },

    processContainer(app, unit, config, options = {}) {
        const ticks = Math.max(1, Math.floor(Number(options.ticks) || 1));
        for (const prey of (unit[config.key] || [])) {
            this.normalizeRecord(app, unit, prey, config.key);
            if (this.normalizedState(prey) === 'softened') continue;
            if (this.isTerminalVitalState(prey) && !['released', 'passed', 'depleted'].includes(prey.state)) {
                this.terminalize(app, unit, prey, config);
                continue;
            }
            if (!this.isActiveContained(prey, config.key) || prey[config.flag] === false) continue;
            this.ensureStatDrain(prey);
            if (config.advanceContained && prey.digestionState === 'contained') prey.digestionState = 'digesting';
            const beforeProgress = Math.max(0, Number(prey.progress || prey.digestionProgress || 0));
            const baseRate = app.settings.slowDigestion ? config.slowRate : config.fastRate;
            if (config.key === 'stomach' && typeof app._digestionRateState === 'function') {
                prey.progress = beforeProgress;
                for (let tick = 0; tick < ticks && prey.progress < 100; tick++) {
                    const rateState = app._digestionRateState(unit, baseRate);
                    const step = Math.min(100 - prey.progress, rateState.rate);
                    prey.progress += step;
                    this.applyDigestionNutrition(app, unit, prey, step);
                }
            } else {
                prey.progress = Math.min(100, beforeProgress + baseRate * ticks);
            }
            prey.digestionProgress = prey.progress;
            prey.state = prey.progress > 0 ? 'digesting' : 'contained';
            prey.digestionState = prey.state;
            const progressDelta = prey.progress - beforeProgress;
            const drain = Math.max(1, Math.floor(progressDelta * 0.3));
            for (const stat of config.stats) {
                prey.statDrain[stat] += drain;
            }
            const conditionDrain = Math.max(1, Math.floor(progressDelta * 0.4));
            this.applyVitalDamage(prey, conditionDrain, { source: 'digestion-tick' });
            if (config.key !== 'stomach' || typeof app._digestionRateState !== 'function') {
                this.applyDigestionNutrition(app, unit, prey, progressDelta);
            }
            if (app.settings.statAbsorption) {
                app._absorbStats(unit, progressDelta, config.stats);
            }
            if (!prey.digestingSceneBeatEmitted && prey.progress >= 50) {
                prey.digestingSceneBeatEmitted = true;
                this.emitContainmentBeat(app, 'digesting', unit, prey, {
                    deltas: [{ kind: 'state', state: 'digesting', unit: prey.name }]
                });
            }
            if (prey.progress >= 100 || prey.CPun <= 0 || prey.vitalRemaining <= 0) {
                this.terminalize(app, unit, prey, config);
            }
        }
    },

    process(app, unit, options = {}) {
        if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
            MODULE_SYSTEM.executeHook('onDigestionTick', { unit, app }).catch(() => {});
        }
        for (const config of this.containerConfigs()) {
            this.processContainer(app, unit, config, options);
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UNIT_CONTAINMENT = YAW_UNIT_CONTAINMENT;
}
