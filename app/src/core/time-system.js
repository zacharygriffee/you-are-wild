/**
 * YOU ARE WILD TIME SYSTEM
 * Clock, day/night, visibility, and time-of-day encounter helpers.
 */

const YAW_TIME_SYSTEM = {
    // Paused until sleep has a complete wake, risk, and reward loop. Legacy
    // state may remain in saves, but it must not drive live gameplay or UI.
    SLEEP_ENABLED: false,

    sleepEnabled() {
        return this.SLEEP_ENABLED === true;
    },

    normalizeHour(hour = 0) {
        return ((hour % 24) + 24) % 24;
    },

    isNight(app, hour = app.timeHour) {
        const normalized = this.normalizeHour(hour);
        return normalized >= 20 || normalized < 6;
    },

    label(app) {
        const hour = this.normalizeHour(app.timeHour);
        return `${this.isNight(app, hour) ? '🌙' : '☀️'} ${String(hour).padStart(2, '0')}:00`;
    },

    render(app) {
        const label = this.label(app);
        ['time-display', 'mobile-time-display'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = label;
        });
    },

    advance(app, hours = 1) {
        const current = this.normalizeHour(app.timeHour || 0);
        const previousDay = app.dayCount || 0;
        const nextTotal = current + hours;
        app.timeHour = this.normalizeHour(nextTotal);
        if (hours > 0) app.dayCount = (app.dayCount || 0) + Math.floor(nextTotal / 24);
        this.render(app);
        if (hours > 0) {
            let partyResourceChanged = false;
            for (const unit of [...new Set([...(app.party || []), ...(app.creatures || [])])]) {
                const changes = YAW_RESOURCE_LEDGER.tick(unit, 'hour', hours);
                partyResourceChanged = partyResourceChanged || (changes.length > 0 && (app.party || []).includes(unit));
            }
            if (partyResourceChanged) {
                app._markSaveDirty?.('party', 'resource-regeneration');
                app._markSaveDirty?.('holdings', 'resource-regeneration');
            }
            app._emitModuleHook('onTick', {
                hours,
                previousHour: current,
                currentHour: app.timeHour,
                previousDay,
                currentDay: app.dayCount || 0
            });
            if (typeof YAW_AUTONOMOUS_ACTORS !== 'undefined') YAW_AUTONOMOUS_ACTORS.tick(app);
        }
    },

    partyHasDarkvision(app) {
        return (app.party || []).some(unit => unit && unit.CPun > 0 && unit.darkvision);
    },

    mapVisibilityRadius(app) {
        if (!this.isNight(app) || this.partyHasDarkvision(app)) return app.DAY_VISIBILITY_RADIUS;
        const scoutBonus = app._partyRoleEffect('scout', app.NIGHT_VISIBILITY_PENALTY, app.NIGHT_VISIBILITY_PENALTY);
        return Math.max(1, app.DAY_VISIBILITY_RADIUS - app.NIGHT_VISIBILITY_PENALTY + scoutBonus);
    },

    isNocturnalSpecies(app, sid) {
        return app.NOCTURNAL_SPECIES.includes(sid) || Boolean(app.SPECIES_TEMPERAMENT[sid]?.nocturnal);
    },

    isDiurnalSpecies(app, sid) {
        return app.DIURNAL_SPECIES.includes(sid);
    },

    adjustedEncounterTable(app, table) {
        if (!this.isNight(app) || !Array.isArray(table)) return table;
        return table.map(entry => {
            if (typeof entry === 'string') {
                if (this.isNocturnalSpecies(app, entry)) return { id: entry, weight: 15 };
                if (this.isDiurnalSpecies(app, entry)) return { id: entry, weight: 2 };
                return { id: entry, weight: 10 };
            }
            let weight = entry.weight || 10;
            if (this.isNocturnalSpecies(app, entry.id)) weight *= 1.5;
            if (this.isDiurnalSpecies(app, entry.id)) weight *= 0.2;
            return { ...entry, weight: Math.max(1, Math.round(weight)) };
        });
    },

    applyTimeOfDayToCreature(app, creature) {
        if (!this.sleepEnabled() || !creature || !this.isNight(app) || !this.isDiurnalSpecies(app, creature.species)) return creature;
        creature.status = creature.status || {};
        creature.status.sleep = creature.status.sleep || { turns: 2 };
        creature.asleep = true;
        return creature;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TIME_SYSTEM = YAW_TIME_SYSTEM;
}
