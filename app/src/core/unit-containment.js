/**
 * YOU ARE WILD UNIT CONTAINMENT
 * Shared contained-unit snapshots, stat drain, and containment tick processing.
 */

const YAW_UNIT_CONTAINMENT = {
    createPrey(app, target, extra = {}) {
        return { ...target, alive: true, inStomach: !extra.inWomb && !extra.inCock, inWomb: extra.inWomb || false, inCock: extra.inCock || false, digestionProgress: 0, digestionState: 'contained', statDrain: this.emptyStatDrain(), willingSacrifice: extra.willingSacrifice || false, forcedFed: extra.forcedFed || false, by: extra.by || null };
    },

    emptyStatDrain() {
        return { str: 0, con: 0, spd: 0, int: 0, wis: 0, cha: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 };
    },

    ensureStatDrain(prey) {
        prey.statDrain = { ...this.emptyStatDrain(), ...(prey.statDrain || {}) };
        return prey.statDrain;
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
            if (!prey.alive || prey[config.flag] === false) continue;
            prey.digestionProgress = prey.digestionProgress || 0;
            prey.digestionState = prey.digestionState || 'contained';
            this.ensureStatDrain(prey);
            if (config.advanceContained && prey.digestionState === 'contained') prey.digestionState = 'digesting';
            const rate = app.settings.slowDigestion ? config.slowRate : config.fastRate;
            prey.digestionProgress = Math.min(100, prey.digestionProgress + rate);
            const drain = Math.max(1, Math.floor(rate * 0.3));
            for (const stat of config.stats) {
                prey.statDrain[stat] += drain;
                prey[stat] = Math.max(1, (prey[stat] || 10) - drain);
            }
            prey.CPun = Math.max(1, Math.floor(prey.MPun * (1 - prey.digestionProgress / 100)));
            if (app.settings.statAbsorption) {
                app._absorbStats(unit, rate, config.stats);
            }
            if (prey.digestionProgress >= 100) {
                if (app.settings.fatalVore && !app.settings.endoMode) {
                    prey.alive = false;
                    app.log.push({ text: config.fatalLog(prey, unit), type: 'combat' });
                } else {
                    prey.digestionState = 'digested';
                    app.log.push({ text: config.softLog(prey, unit), type: 'combat' });
                }
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
