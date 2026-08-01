/**
 * YOU ARE WILD AUTONOMOUS ACTOR V1
 * Coarse deterministic simulation for dismissed named recruits.
 */

const YAW_AUTONOMOUS_ACTORS = {
    VERSION: 1,
    STEP_HOURS: 6,
    MAX_STEPS_PER_TICK: 8,
    MAX_LEDGER: 24,

    absoluteHour(app) {
        return Math.max(0, Math.floor(Number(app?.dayCount) || 0) * 24
            + Math.max(0, Math.floor(Number(app?.timeHour) || 0)));
    },

    location(app, tile = null) {
        return {
            x: Number(tile?.x ?? app?.location?.x) || 0,
            y: Number(tile?.y ?? app?.location?.y) || 0
        };
    },

    ensure(app, unit, tile = null) {
        if (!unit) return null;
        const now = this.absoluteHour(app);
        const location = this.location(app, tile);
        const source = unit.autonomousActor && typeof unit.autonomousActor === 'object'
            ? unit.autonomousActor
            : {};
        const knowledge = source.knowledge && typeof source.knowledge === 'object'
            ? source.knowledge
            : {};
        unit.autonomousActor = {
            version: this.VERSION,
            active: source.active !== false,
            home: source.home && Number.isFinite(Number(source.home.x)) && Number.isFinite(Number(source.home.y))
                ? { x: Number(source.home.x), y: Number(source.home.y) }
                : { ...location },
            location: { ...location },
            nextStepAt: Number.isFinite(Number(source.nextStepAt)) && Number(source.nextStepAt) > 0
                ? Math.floor(Number(source.nextStepAt))
                : now + this.STEP_HOURS,
            intent: ['stay', 'roam', 'seek-player', 'return-home'].includes(source.intent) ? source.intent : 'stay',
            knowledge: {
                ...(knowledge.player && Number.isFinite(Number(knowledge.player.x)) && Number.isFinite(Number(knowledge.player.y))
                    ? {
                        player: {
                            x: Number(knowledge.player.x),
                            y: Number(knowledge.player.y),
                            seenAt: Math.max(0, Math.floor(Number(knowledge.player.seenAt) || 0))
                        }
                    }
                    : {})
            },
            ledger: Array.isArray(source.ledger)
                ? source.ledger.slice(-this.MAX_LEDGER).map(entry => ({ ...entry }))
                : []
        };
        return unit.autonomousActor;
    },

    perception(app, observer, target, context = {}) {
        if (!observer || !target) return Object.freeze({ observed: false, score: 0, difficulty: 999 });
        const distance = Math.max(0, Math.floor(Number(context.distance) || 0));
        const nightPenalty = app?._isNight?.() && !observer.darkvision ? 4 : 0;
        const sensory = (observer.scout ? 2 : 0)
            + (observer.darkvision ? 2 : 0)
            + (observer.keenSenses ? 2 : 0);
        const targetSize = Math.max(1, Math.min(12, Math.floor(Number(target.size) || 3)));
        const concealment = Math.max(0, Math.min(20, Math.floor(Number(target.concealment) || 0)));
        const movement = context.moving === false ? 0 : 2;
        const roll = app?._worldRoll
            ? Math.floor(app._worldRoll(
                'autonomous-perception-v1',
                String(observer.id || observer.name || 'observer'),
                String(target.id || target.name || 'target'),
                Number(context.x) || 0,
                Number(context.y) || 0,
                this.absoluteHour(app)
            ) * 10)
            : 0;
        const score = Math.max(0, Math.floor(Number(observer.wis) || 0) + sensory + movement + roll - nightPenalty);
        const difficulty = Math.max(1, 8 + distance * 3 + concealment - targetSize);
        return Object.freeze({
            observed: score >= difficulty,
            score,
            difficulty,
            distance,
            light: nightPenalty ? 'dark' : 'lit'
        });
    },

    canObserve(app, observer, target, context = {}) {
        return this.perception(app, observer, target, context).observed;
    },

    _record(app, unit, state, event) {
        const entry = Object.freeze({
            version: this.VERSION,
            sequence: Math.max(1, Math.floor(Number(state.ledger.at(-1)?.sequence) || 0) + 1),
            at: this.absoluteHour(app),
            actorId: String(app?._unitSelectionId?.(unit) || unit?.id || unit?.name || 'actor'),
            type: String(event.type || 'wait').slice(0, 48),
            from: Object.freeze({ x: Number(event.from?.x) || 0, y: Number(event.from?.y) || 0 }),
            to: Object.freeze({ x: Number(event.to?.x) || 0, y: Number(event.to?.y) || 0 }),
            intent: String(event.intent || 'stay').slice(0, 48)
        });
        state.ledger = [...state.ledger, entry].slice(-this.MAX_LEDGER);
        app?._emitPublicModuleHook?.('onAutonomousEvent', entry);
        return entry;
    },

    _actorEntries(app) {
        const seen = new Set();
        const entries = [];
        for (const tile of app?.worldMap?.values?.() || []) {
            for (const unit of tile?.creatures || []) {
                const id = String(app?._unitSelectionId?.(unit) || unit?.id || unit?.name || '');
                if (!id || seen.has(id) || !unit?.formerPartyMember || unit?.droppedOffCompanion) continue;
                seen.add(id);
                entries.push({ unit, tile });
            }
        }
        return entries.sort((left, right) => String(left.unit.id || left.unit.name).localeCompare(String(right.unit.id || right.unit.name)));
    },

    _chooseIntent(app, unit, state, now) {
        const memory = state.knowledge.player;
        const age = memory ? now - memory.seenAt : Infinity;
        const distance = memory
            ? Math.abs(state.location.x - memory.x) + Math.abs(state.location.y - memory.y)
            : Infinity;
        const roll = app?._worldRoll?.(
            'autonomous-intent-v1',
            String(unit.id || unit.name || 'actor'),
            now,
            state.location.x,
            state.location.y
        ) ?? 0;
        if (memory && age <= 72 && distance <= 12 && roll < 0.3) return 'seek-player';
        const homeDistance = Math.abs(state.location.x - state.home.x) + Math.abs(state.location.y - state.home.y);
        if (homeDistance > 6 && roll < 0.6) return 'return-home';
        if (roll < 0.75) return 'roam';
        return 'stay';
    },

    _stepToward(from, destination) {
        const dx = Math.sign(Number(destination.x) - Number(from.x));
        const dy = Math.sign(Number(destination.y) - Number(from.y));
        if (Math.abs(Number(destination.x) - Number(from.x)) >= Math.abs(Number(destination.y) - Number(from.y))) {
            return { x: from.x + dx, y: from.y };
        }
        return { x: from.x, y: from.y + dy };
    },

    _destination(app, unit, state, intent, now) {
        if (intent === 'seek-player' && state.knowledge.player) return this._stepToward(state.location, state.knowledge.player);
        if (intent === 'return-home') return this._stepToward(state.location, state.home);
        if (intent !== 'roam') return { ...state.location };
        const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const roll = app?._worldRoll?.(
            'autonomous-roam-v1',
            String(unit.id || unit.name || 'actor'),
            now,
            state.location.x,
            state.location.y
        ) ?? 0;
        const [dx, dy] = directions[Math.min(directions.length - 1, Math.floor(roll * directions.length))];
        return { x: state.location.x + dx, y: state.location.y + dy };
    },

    _move(app, unit, origin, destination, state, intent) {
        const from = { x: Number(origin.x) || 0, y: Number(origin.y) || 0 };
        const moved = from.x !== destination.x || from.y !== destination.y;
        if (moved) {
            const id = String(app._unitSelectionId?.(unit) || unit.id || unit.name);
            origin.creatures = (origin.creatures || []).filter(candidate => String(app._unitSelectionId?.(candidate) || candidate?.id || candidate?.name) !== id);
            const targetTile = app.getTile(destination.x, destination.y);
            targetTile.creatures = app._tileCreatures([...(targetTile.creatures || []).filter(candidate => String(app._unitSelectionId?.(candidate) || candidate?.id || candidate?.name) !== id), unit]);
            app.persistTileDelta(origin.x, origin.y, origin, { reason: 'autonomous-actor-move' });
            app.persistTileDelta(targetTile.x, targetTile.y, targetTile, { reason: 'autonomous-actor-move' });
            state.location = { x: targetTile.x, y: targetTile.y };
            const playerHere = !app.inInterior
                && Number(app.location?.x) === targetTile.x
                && Number(app.location?.y) === targetTile.y;
            if (playerHere) app.creatures = app._tileCreatures(targetTile.creatures);
            if (!app.inInterior && Number(app.location?.x) === from.x && Number(app.location?.y) === from.y) {
                app.creatures = app._tileCreatures(origin.creatures);
            }
        }
        this._record(app, unit, state, {
            type: moved ? 'travel' : 'wait',
            from,
            to: state.location,
            intent
        });
        return moved;
    },

    tick(app) {
        if (!app || app.inInterior) return [];
        const now = this.absoluteHour(app);
        const changes = [];
        for (const entry of this._actorEntries(app)) {
            const { unit } = entry;
            let tile = entry.tile;
            const state = this.ensure(app, unit, tile);
            const sameTile = Number(tile.x) === Number(app.location?.x) && Number(tile.y) === Number(app.location?.y);
            if (sameTile && this.canObserve(app, unit, app.player, { x: tile.x, y: tile.y, distance: 0 })) {
                state.knowledge.player = { x: Number(app.location.x), y: Number(app.location.y), seenAt: now };
            }
            let steps = 0;
            while (state.active && state.nextStepAt <= now && steps < this.MAX_STEPS_PER_TICK) {
                const stepAt = state.nextStepAt;
                const intent = this._chooseIntent(app, unit, state, stepAt);
                const destination = this._destination(app, unit, state, intent, stepAt);
                const moved = this._move(app, unit, tile, destination, state, intent);
                tile = app.getTile(state.location.x, state.location.y);
                state.intent = intent;
                state.nextStepAt += this.STEP_HOURS;
                changes.push({ actorId: String(unit.id || unit.name), moved, intent, location: { ...state.location } });
                steps++;
            }
            if (steps >= this.MAX_STEPS_PER_TICK && state.nextStepAt <= now) state.nextStepAt = now + this.STEP_HOURS;
        }
        if (changes.length) app.markAutoSaveDirty?.(['worldTiles', 'currentTile', 'sceneFeed'], 'autonomous-actor-tick');
        return changes;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_AUTONOMOUS_ACTORS = YAW_AUTONOMOUS_ACTORS;
}
