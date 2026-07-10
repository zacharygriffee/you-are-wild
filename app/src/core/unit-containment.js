/**
 * YOU ARE WILD UNIT CONTAINMENT
 * Shared contained-unit snapshots, stat drain, and containment tick processing.
 */

const YAW_UNIT_CONTAINMENT = {
    defaultContainerProfiles() {
        return {
            stomach: {
                id: 'stomach',
                label: 'Belly',
                safeLabel: 'Belly',
                contentTier: 0,
                tags: ['stomach', 'containment', 'v1'],
                capacityRule: 'size-plus-appetite',
                tickRule: 'slow-condition-progress',
                releaseRule: 'command-before-terminal',
                absorptionRule: 'capped-restoration',
                terminalRule: 'progress-or-condition-zero',
                digestionRate: 5,
                slowDigestionRate: 2,
                absorptionRate: 1
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

    createPrey(app, target, extra = {}) {
        const containerId = extra.containerId || (extra.inWomb ? 'womb' : extra.inCock ? 'balls' : 'stomach');
        const entryVerb = extra.entryVerb || (containerId === 'stomach' ? 'swallow' : containerId);
        const prey = {
            ...target,
            alive: true,
            inStomach: containerId === 'stomach' && !extra.inWomb && !extra.inCock,
            inWomb: extra.inWomb || false,
            inCock: extra.inCock || false,
            digestionProgress: 0,
            digestionState: 'contained',
            statDrain: this.emptyStatDrain(),
            willingSacrifice: extra.willingSacrifice || false,
            forcedFed: extra.forcedFed || false,
            by: extra.by || null
        };
        return this.normalizeRecord(app, extra.holder || null, prey, containerId, { ...extra, entryVerb });
    },

    emptyStatDrain() {
        return { str: 0, con: 0, spd: 0, int: 0, wis: 0, cha: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 };
    },

    ensureStatDrain(prey) {
        prey.statDrain = { ...this.emptyStatDrain(), ...(prey.statDrain || {}) };
        return prey.statDrain;
    },

    normalizedState(prey) {
        if (prey?.state === 'terminal' || prey?.digestionState === 'terminal') return 'terminal';
        if (prey?.state === 'released' || prey?.digestionState === 'released') return 'released';
        if (prey?.state === 'passed' || prey?.digestionState === 'passed') return 'passed';
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
        prey.holderId = holderId;
        prey.containedId = containedId;
        prey.containerId = prey.containerId || defaults.containerId || containerId;
        prey.entryVerb = prey.entryVerb || defaults.entryVerb || (prey.containerId === 'stomach' ? 'swallow' : prey.containerId);
        prey.state = state;
        prey.integrity = integrity;
        prey.progress = Math.max(0, Math.min(100, progress));
        prey.releaseEligible = typeof prey.releaseEligible === 'boolean'
            ? prey.releaseEligible
            : prey.integrity === 'intact' && !['terminal', 'released', 'passed'].includes(state);
        prey.digestionRate = Number.isFinite(prey.digestionRate) ? prey.digestionRate : profile.digestionRate || 5;
        prey.absorptionRate = Number.isFinite(prey.absorptionRate) ? prey.absorptionRate : profile.absorptionRate || 1;
        prey.temporaryStatEffects = Array.isArray(prey.temporaryStatEffects) ? prey.temporaryStatEffects : [];
        prey.modifiers = prey.modifiers && typeof prey.modifiers === 'object' ? prey.modifiers : {};
        prey.tags = Array.isArray(prey.tags) ? Array.from(new Set([...prey.tags, 'containment', prey.entryVerb, prey.integrity])) : ['containment', prey.entryVerb, prey.integrity];
        prey.digestionProgress = prey.progress;
        prey.digestionState = state === 'terminal' ? 'terminal' : state === 'released' ? 'released' : state === 'digesting' ? 'digesting' : 'contained';
        this.ensureStatDrain(prey);
        return prey;
    },

    normalizeContainer(app, holder, containerId = 'stomach') {
        const list = holder?.[containerId] || [];
        for (const prey of list) this.normalizeRecord(app, holder, prey, containerId);
        return list;
    },

    isActiveContained(prey, containerId = 'stomach') {
        if (!prey) return false;
        const state = this.normalizedState(prey);
        if (['terminal', 'released', 'passed'].includes(state)) return false;
        if (containerId === 'stomach' && prey.inStomach === false) return false;
        return prey.alive !== false && prey.CPun !== 0;
    },

    containedCondition(prey) {
        const max = Math.max(1, Number(prey?.MPun || prey?.maxHp || 1));
        const current = Number.isFinite(prey?.CPun) ? prey.CPun : max;
        return { current, max };
    },

    emitContainmentBeat(app, kind, holder, prey, options = {}) {
        if (!app || typeof app.emitSceneBeat !== 'function' || !prey || !holder) return null;
        const targetName = prey.name || 'the contained creature';
        const holderName = holder.name || 'their holder';
        const summaries = {
            contained: `${targetName} is held in ${holderName}'s stomach.`,
            digesting: `${targetName} weakens while held in ${holderName}'s stomach.`,
            released: `${targetName} is released from ${holderName}'s stomach, weakened but alive.`,
            terminal: `${targetName} is fully digested inside ${holderName}. ${holderName} feels restored.`
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
        const hungerRelief = Math.max(4, Math.min(35, Math.floor(size * 8)));
        const beforeHp = Number(holder.CPun || 0);
        const beforeHunger = Number(holder.hunger || 0);
        holder.CPun = Math.min(holder.MPun || beforeHp || 1, beforeHp + healAmount);
        holder.hunger = Math.max(0, beforeHunger - hungerRelief);
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
        prey.state = 'terminal';
        prey.digestionState = 'terminal';
        prey.progress = 100;
        prey.digestionProgress = 100;
        prey.releaseEligible = false;
        prey.alive = false;
        prey.CPun = 0;
        prey.CPle = 0;
        const deltas = this.applyTerminalAbsorption(app, holder, prey, config);
        if (!prey.terminalSceneBeatEmitted) {
            prey.terminalSceneBeatEmitted = true;
            this.emitContainmentBeat(app, 'terminal', holder, prey, { deltas });
            app?.log?.push?.({ text: `${prey.name} reaches terminal digestion inside ${holder.name}.`, type: 'combat' });
        }
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

    processContainer(app, unit, config) {
        for (const prey of (unit[config.key] || [])) {
            this.normalizeRecord(app, unit, prey, config.key);
            if (!this.isActiveContained(prey, config.key) || prey[config.flag] === false) continue;
            this.ensureStatDrain(prey);
            if (config.advanceContained && prey.digestionState === 'contained') prey.digestionState = 'digesting';
            const rate = app.settings.slowDigestion ? config.slowRate : config.fastRate;
            prey.progress = Math.min(100, (prey.progress || prey.digestionProgress || 0) + rate);
            prey.digestionProgress = prey.progress;
            prey.state = prey.progress > 0 ? 'digesting' : 'contained';
            prey.digestionState = prey.state;
            const drain = Math.max(1, Math.floor(rate * 0.3));
            for (const stat of config.stats) {
                prey.statDrain[stat] += drain;
                prey[stat] = Math.max(1, (prey[stat] || 10) - drain);
            }
            const conditionDrain = Math.max(1, Math.floor(rate * 0.4));
            prey.CPun = Math.max(0, Math.min(prey.MPun || 1, (Number.isFinite(prey.CPun) ? prey.CPun : prey.MPun || 1) - conditionDrain));
            if (app.settings.statAbsorption) {
                app._absorbStats(unit, rate, config.stats);
            }
            if (!prey.digestingSceneBeatEmitted && prey.progress >= 50) {
                prey.digestingSceneBeatEmitted = true;
                this.emitContainmentBeat(app, 'digesting', unit, prey, {
                    deltas: [{ kind: 'state', state: 'digesting', unit: prey.name }]
                });
            }
            if (prey.progress >= 100 || prey.CPun <= 0) {
                this.terminalize(app, unit, prey, config);
            }
        }
    },

    process(app, unit) {
        if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
            MODULE_SYSTEM.executeHook('onDigestionTick', { unit, app }).catch(() => {});
        }
        for (const config of this.containerConfigs()) {
            this.processContainer(app, unit, config);
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UNIT_CONTAINMENT = YAW_UNIT_CONTAINMENT;
}
