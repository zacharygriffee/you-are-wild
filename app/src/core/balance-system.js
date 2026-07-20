/**
 * YOU ARE WILD BALANCE SYSTEM
 * Conservative V1 economy helpers for hunger pressure, action previews, and Spirit thresholds.
 */

const YAW_BALANCE_SYSTEM = {
    defaults() {
        return {
            hungerMax: 100,
            hungerWarning: 60,
            hungerHungry: 70,
            hungerStarving: 85,
            spiritThresholdRatio: 0.85,
            spiritPostResolveRatio: 0.2,
            costs: {
                move: 1,
                search: 1,
                fight: 3,
                flirt: 1,
                fuck: 4,
                feast: 2,
                feed: 1,
                flee: 3,
                moveRow: 1
            },
            relief: {
                rest: 0,
                restHungerPressure: 8,
                restDigestionTicks: 8,
                containmentFullnessPerSize: 3,
                containmentNutritionPerSize: 15
            }
        };
    },

    ensure(app) {
        app.BALANCE_V1 = {
            ...this.defaults(),
            ...(app.BALANCE_V1 || {}),
            costs: { ...this.defaults().costs, ...(app.BALANCE_V1?.costs || {}) },
            relief: { ...this.defaults().relief, ...(app.BALANCE_V1?.relief || {}) }
        };
        return app.BALANCE_V1;
    },

    clampHunger(app, value) {
        const cfg = this.ensure(app);
        const max = Number.isFinite(cfg.hungerMax) ? cfg.hungerMax : 100;
        return Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
    },

    hunger(unit) {
        return Math.max(0, Math.round(Number(unit?.hunger) || 0));
    },

    applyHungerPressure(app, unit, amount = 0, context = {}) {
        if (!unit || !Number.isFinite(Number(amount)) || Number(amount) === 0) return null;
        const cfg = this.ensure(app);
        const before = this.hunger(unit);
        const after = this.clampHunger(app, before + Number(amount));
        unit.hunger = after;
        const result = {
            unit,
            amount: after - before,
            before,
            after,
            action: context.action || '',
            source: context.source || 'balance',
            crossedWarning: before < cfg.hungerWarning && after >= cfg.hungerWarning,
            crossedHungry: before < cfg.hungerHungry && after >= cfg.hungerHungry,
            crossedStarving: before < cfg.hungerStarving && after >= cfg.hungerStarving
        };
        if (context.emitScene && (result.crossedWarning || result.crossedHungry || result.crossedStarving || Math.abs(result.amount) >= 10)) {
            this.emitCostSceneBeat(app, context.action || 'exertion', unit, context.target || null, result);
        }
        return result;
    },

    applyHungerRelief(app, unit, amount = 0, context = {}) {
        return this.applyHungerPressure(app, unit, -Math.abs(Number(amount) || 0), context);
    },

    costForAction(app, action = '', actor = null, target = null, context = {}) {
        const cfg = this.ensure(app);
        const key = String(action || '').replace(/^sync_/, '');
        let amount = Number(cfg.costs[key] ?? 0);
        if (context.mode === 'travel') amount = Number(cfg.costs.move || 1);
        if (key === 'scavenge' || key === 'loot' || key === 'recruit' || key === 'quest' || key === 'trade' || key === 'inspect') amount = 0;
        return Math.max(0, Math.floor(amount));
    },

    previewActionCost(app, action = '', actor = null, target = null, context = {}) {
        const key = String(action || '').replace(/^sync_/, '');
        const amount = this.costForAction(app, key, actor, target, context);
        if (key === 'move' || key === 'search' || context.mode === 'travel') return { amount, tone: 'tiny', label: app._label('cost.preview.move', 'Tiny hunger') };
        if (key === 'flirt') return { amount, tone: 'low', label: app._label('cost.preview.talk', 'Low effort') };
        if (key === 'fuck') return { amount, tone: 'moderate', label: app._label('cost.preview.play', 'Moderate hunger') };
        if (key === 'fight') return { amount, tone: 'risk', label: app._label('cost.preview.fight', 'Hunger + injury risk') };
        if (key === 'flee') return { amount, tone: 'risk', label: app._label('cost.preview.flee', 'Hunger + escape risk') };
        if (key === 'feast') return { amount, tone: 'shift', label: app._label('cost.preview.feast', 'Hunger relief, capacity risk') };
        if (key === 'scavenge') return { amount, tone: 'relief', label: app._label('cost.preview.scavenge', 'Hunger relief from remains') };
        if (key === 'feed') return { amount, tone: 'support', label: app._label('cost.preview.feed', 'Support cost') };
        if (key === 'rest') return { amount, tone: 'recover', label: app._label('cost.preview.rest', 'Recover, time passes') };
        if (amount > 0) return { amount, tone: 'cost', label: app._label('cost.preview.generic', 'Costs hunger') };
        return { amount: 0, tone: 'none', label: '' };
    },

    costTitle(app, action = '', baseTitle = '', actor = null, target = null, context = {}) {
        const preview = this.previewActionCost(app, action, actor, target, context);
        return preview?.label ? `${baseTitle} - ${preview.label}` : baseTitle;
    },

    canAffordActionPressure(app, action = '', actor = null, context = {}) {
        if (!actor) return { ok: true };
        const cfg = this.ensure(app);
        const key = String(action || '').replace(/^sync_/, '');
        const hunger = this.hunger(actor);
        if (key === 'fuck' && hunger >= cfg.hungerStarving) {
            return {
                ok: false,
                reason: 'too-hungry',
                text: app._label('cost.block.tooHungryPlay', '{actor} is too hungry for that kind of effort.', { actor: actor.name || app._label('target.actorRole', 'Actor') })
            };
        }
        return { ok: true };
    },

    applyActionCost(app, action = '', actor = null, target = null, outcome = {}, context = {}) {
        if (!actor || context.applyCost === false) return null;
        const amount = this.costForAction(app, action, actor, target, context);
        if (amount <= 0) return null;
        return this.applyHungerPressure(app, actor, amount, {
            action,
            target,
            source: context.source || 'action-cost',
            emitScene: Boolean(context.emitScene)
        });
    },

    applyTravelCost(app, units = [], context = {}) {
        const cfg = this.ensure(app);
        const amount = Number(cfg.costs.move || 1);
        return (units || [])
            .filter(unit => unit && unit.CPun > 0)
            .map(unit => this.applyHungerPressure(app, unit, amount, {
                action: 'move',
                source: 'travel',
                emitScene: false,
                ...context
            }))
            .filter(Boolean);
    },

    scenarioBaseline(app) {
        const cfg = this.ensure(app);
        const turnsTo = (threshold, cost) => cost > 0 ? Math.ceil(threshold / cost) : null;
        const digestion = (size, rate) => {
            const nutrition = Math.min(100, Math.max(1, size) * cfg.relief.containmentNutritionPerSize);
            const ticks = Math.ceil(100 / rate);
            const restProgress = Math.min(100, rate * cfg.relief.restDigestionTicks);
            const restNutrition = Math.floor(nutrition * restProgress / 100);
            return {
                size,
                rate,
                ticks,
                nutrition,
                immediateFullness: Math.min(20, Math.max(1, size) * cfg.relief.containmentFullnessPerSize),
                restProgress,
                restNutrition,
                netRestHunger: cfg.relief.restHungerPressure - restNutrition
            };
        };
        return {
            thresholds: {
                warning: cfg.hungerWarning,
                hungry: cfg.hungerHungry,
                starving: cfg.hungerStarving
            },
            commandsToHungryFromSated: Object.fromEntries(Object.entries(cfg.costs).map(([action, cost]) => [action, turnsTo(cfg.hungerHungry, cost)])),
            emptyRest: {
                hungerPerRest: cfg.relief.restHungerPressure,
                restsToHungry: turnsTo(cfg.hungerHungry, cfg.relief.restHungerPressure),
                hoursToHungry: turnsTo(cfg.hungerHungry, cfg.relief.restHungerPressure) * 8
            },
            digestion: [1, 3, 6].flatMap(size => [digestion(size, 5), digestion(size, 2)]),
            spirit: {
                breakthroughRatio: cfg.spiritThresholdRatio,
                postResolveRatio: cfg.spiritPostResolveRatio
            }
        };
    },

    spiritThresholdState(app, unit) {
        const cfg = this.ensure(app);
        if (!unit) return { reached: false, ratio: 0, threshold: cfg.spiritThresholdRatio };
        const max = Math.max(1, Number(unit.MPle || 100));
        const current = Math.max(0, Number(unit.CPle || 0));
        const ratio = current / max;
        return {
            reached: ratio >= cfg.spiritThresholdRatio,
            ratio,
            current,
            max,
            threshold: cfg.spiritThresholdRatio,
            alreadyResolved: Boolean(unit.spiritResolved || unit.recruitReady)
        };
    },

    resolveSpiritThreshold(app, actor, target, action = 'flirt', context = {}) {
        if (!target || !['flirt', 'fuck', 'sync_flirt', 'sync_fuck'].includes(String(action || ''))) return null;
        if ((app.party || []).includes(target)) return null;
        const state = this.spiritThresholdState(app, target);
        if (!state.reached || state.alreadyResolved) return null;
        const cfg = this.ensure(app);
        target.spiritResolved = true;
        target.recruitReady = true;
        target.willing = true;
        target.disposition = app.DISPOSITION.FRIENDLY;
        target.CPle = Math.max(0, Math.floor(state.max * cfg.spiritPostResolveRatio));
        const summary = app._label('scene.spirit.breakthrough', "{target}'s guard breaks. They calm down and may be ready to join if you ask.", { target: target.name || app._label('target.targetRole', 'Target') });
        if (context.emitScene !== false) {
            app.emitStoryResult?.({
                mode: app.combatState?.active ? 'combat' : 'adventure',
                actors: [actor].filter(Boolean),
                targets: [target],
                action,
                tags: ['spirit-threshold', 'recruit-available'],
                source: 'balance-system'
            }, summary, {
                resultKind: 'social',
                importance: 'notable',
                tags: ['spirit-threshold', 'recruit-available'],
                deltas: [{ kind: 'spirit', current: target.CPle, max: target.MPle || state.max }]
            });
        }
        return { target, summary, state };
    },

    emitCostSceneBeat(app, action = 'exertion', actor = null, target = null, cost = {}) {
        if (!app?.emitStoryResult || !actor) return null;
        const amount = Number(cost.amount || 0);
        let summary = '';
        if (amount > 0) {
            summary = cost.crossedStarving
                ? app._label('scene.cost.starving', '{actor} is dangerously hungry after the exertion.', { actor: actor.name })
                : cost.crossedHungry
                    ? app._label('scene.cost.hungry', '{actor} is getting hungry after repeated effort.', { actor: actor.name })
                    : app._label('scene.cost.exertion', 'The effort leaves {actor} hungrier.', { actor: actor.name });
        } else if (amount < 0) {
            summary = app._label('scene.cost.relief', '{actor} feels less hungry.', { actor: actor.name });
        }
        if (!summary) return null;
        return app.emitStoryResult({
            mode: app.combatState?.active ? 'combat' : 'adventure',
            actors: [actor],
            targets: [target].filter(Boolean),
            action,
            tags: ['hunger', amount > 0 ? 'pressure' : 'relief'],
            source: 'balance-system'
        }, summary, {
            resultKind: amount > 0 ? 'cost' : 'recovery',
            importance: Math.abs(amount) >= 10 || cost.crossedHungry ? 'hint' : 'normal',
            tags: ['hunger', amount > 0 ? 'pressure' : 'relief'],
            deltas: [{ kind: 'hunger', amount, current: cost.after, before: cost.before }]
        });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_BALANCE_SYSTEM = YAW_BALANCE_SYSTEM;
}
