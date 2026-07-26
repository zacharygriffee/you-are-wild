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
            },
            digestion: {
                satiatedThreshold: 25,
                satiatedMultiplier: 0.8,
                hungryMultiplier: 1.2,
                starvingMultiplier: 1.4,
                minimumMultiplier: 0.8,
                maximumMultiplier: 1.4
            },
            combatPressure: {
                hungryActionMultiplier: 0.9,
                starvingActionMultiplier: 0.75,
                hungryInitiativeMultiplier: 0.9,
                starvingInitiativeMultiplier: 0.8,
                hungryFleePenalty: 0.05,
                starvingFleePenalty: 0.15
            }
        };
    },

    ensure(app) {
        app.BALANCE_V1 = {
            ...this.defaults(),
            ...(app.BALANCE_V1 || {}),
            costs: { ...this.defaults().costs, ...(app.BALANCE_V1?.costs || {}) },
            relief: { ...this.defaults().relief, ...(app.BALANCE_V1?.relief || {}) },
            digestion: { ...this.defaults().digestion, ...(app.BALANCE_V1?.digestion || {}) },
            combatPressure: { ...this.defaults().combatPressure, ...(app.BALANCE_V1?.combatPressure || {}) }
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

    combatPressureState(app, unit) {
        const cfg = this.ensure(app);
        const pressure = cfg.combatPressure || this.defaults().combatPressure;
        const hunger = this.hunger(unit);
        let band = 'ordinary';
        let actionMultiplier = 1;
        let initiativeMultiplier = 1;
        let fleePenalty = 0;
        if (hunger >= cfg.hungerStarving) {
            band = 'starving';
            actionMultiplier = Number(pressure.starvingActionMultiplier ?? 0.75);
            initiativeMultiplier = Number(pressure.starvingInitiativeMultiplier ?? 0.8);
            fleePenalty = Number(pressure.starvingFleePenalty ?? 0.15);
        } else if (hunger >= cfg.hungerHungry) {
            band = 'hungry';
            actionMultiplier = Number(pressure.hungryActionMultiplier ?? 0.9);
            initiativeMultiplier = Number(pressure.hungryInitiativeMultiplier ?? 0.9);
            fleePenalty = Number(pressure.hungryFleePenalty ?? 0.05);
        }
        actionMultiplier = Math.max(0.5, Math.min(1, actionMultiplier));
        initiativeMultiplier = Math.max(0.5, Math.min(1, initiativeMultiplier));
        fleePenalty = Math.max(0, Math.min(0.5, fleePenalty));
        return {
            hunger,
            band,
            actionMultiplier,
            initiativeMultiplier,
            fleePenalty,
            actionPenaltyPercent: Math.round((1 - actionMultiplier) * 100),
            initiativePenaltyPercent: Math.round((1 - initiativeMultiplier) * 100)
        };
    },

    applyCombatPressure(app, value, unit, kind = 'action') {
        const state = this.combatPressureState(app, unit);
        const multiplier = kind === 'initiative' ? state.initiativeMultiplier : state.actionMultiplier;
        const adjusted = Math.max(1, Number(value || 0) * multiplier);
        return kind === 'initiative' ? adjusted : Math.round(adjusted);
    },

    digestionRateState(app, unit, baseRate = 5) {
        const cfg = this.ensure(app);
        const digestion = cfg.digestion || this.defaults().digestion;
        const hunger = this.hunger(unit);
        let multiplier = 1;
        let pace = 'steady';
        if (hunger >= cfg.hungerStarving) {
            multiplier = Number(digestion.starvingMultiplier || 1.4);
            pace = 'urgent';
        } else if (hunger >= cfg.hungerHungry) {
            multiplier = Number(digestion.hungryMultiplier || 1.2);
            pace = 'quick';
        } else if (hunger <= Number(digestion.satiatedThreshold ?? 25)) {
            multiplier = Number(digestion.satiatedMultiplier || 0.8);
            pace = 'slower';
        }
        const minimum = Number(digestion.minimumMultiplier || 0.8);
        const maximum = Number(digestion.maximumMultiplier || 1.4);
        multiplier = Math.max(minimum, Math.min(maximum, multiplier));
        const rate = Number((Math.max(0, Number(baseRate) || 0) * multiplier).toFixed(2));
        const fallbacks = { slower: 'Slower', steady: 'Steady', quick: 'Quick', urgent: 'Urgent' };
        const label = app?._label
            ? app._label(`containment.digestionPace.${pace}`, fallbacks[pace])
            : fallbacks[pace];
        return { hunger, baseRate: Number(baseRate) || 0, multiplier, rate, pace, label };
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
        const referencePool = 100;
        const referenceFightDamage = 40;
        const referenceCharm = 40;
        const referenceFeed = 20;
        const commandsToResolve = effect => effect > 0 ? Math.ceil(referencePool / effect) : null;
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
        const reward = (key, fallback) => Number(app?.XP_REWARDS?.[key] ?? fallback);
        const referenceAction = (id, details = {}) => ({
            id,
            targetPool: referencePool,
            committedCommands: 1,
            timeHoursPerCommand: 0,
            xpPerResolvedEncounter: 0,
            ...details
        });
        const multiFight = (targetCount, xp, tier, area = false) => {
            const count = Math.max(1, Math.floor(Number(targetCount) || 1));
            const mastery = Math.max(0, Math.min(1, (Number(xp) || 0) / 200));
            const share = 1 / count;
            const scale = count <= 1 ? 1 : (area ? 1 : share + mastery * (1 - share));
            const effectPerTarget = Math.max(1, Math.floor(referenceFightDamage * scale));
            return {
                tier,
                practiceXp: xp,
                targetCount: count,
                areaTechnique: area,
                scale: Number(scale.toFixed(3)),
                percent: Math.round(scale * 100),
                effectPerTarget,
                totalEffect: effectPerTarget * count,
                commandsToResolveEachTarget: commandsToResolve(effectPerTarget)
            };
        };
        const masteryTiers = [
            ['novice', 0],
            ['practiced', 20],
            ['skilled', 60],
            ['expert', 120],
            ['master', 200]
        ];
        return {
            schemaVersion: 2,
            thresholds: {
                warning: cfg.hungerWarning,
                hungry: cfg.hungerHungry,
                starving: cfg.hungerStarving
            },
            commandsToHungryFromSated: Object.fromEntries(Object.entries(cfg.costs).map(([action, cost]) => [action, turnsTo(cfg.hungerHungry, cost)])),
            commandsToStarvingFromSated: Object.fromEntries(Object.entries(cfg.costs).map(([action, cost]) => [action, turnsTo(cfg.hungerStarving, cost)])),
            emptyRest: {
                hungerPerRest: cfg.relief.restHungerPressure,
                restsToHungry: turnsTo(cfg.hungerHungry, cfg.relief.restHungerPressure),
                hoursToHungry: turnsTo(cfg.hungerHungry, cfg.relief.restHungerPressure) * 8
            },
            combatPressure: {
                hungry: {
                    actionMultiplier: cfg.combatPressure.hungryActionMultiplier,
                    initiativeMultiplier: cfg.combatPressure.hungryInitiativeMultiplier,
                    fleePenalty: cfg.combatPressure.hungryFleePenalty
                },
                starving: {
                    actionMultiplier: cfg.combatPressure.starvingActionMultiplier,
                    initiativeMultiplier: cfg.combatPressure.starvingInitiativeMultiplier,
                    fleePenalty: cfg.combatPressure.starvingFleePenalty
                },
                changesMaximumCondition: false
            },
            standardAdventure: {
                protectedRadius: 1,
                openingRadius: 5,
                openingMaxHostiles: 1,
                openingMaxDifficulty: 1,
                openingAllowsAmbush: false,
                openingAllowsReinforcement: false,
                roadPressureModifier: -0.12,
                dangerBands: ['safe', 'low', 'guarded', 'dangerous', 'severe'],
                hiddenDamageScaling: false
            },
            digestion: [1, 3, 6].flatMap(size => [digestion(size, 5), digestion(size, 2)]),
            referenceScenario: {
                assumptions: {
                    targetCondition: referencePool,
                    targetSpirit: referencePool,
                    fightDamageBeforeSpread: referenceFightDamage,
                    successfulTalkCharm: referenceCharm,
                    successfulPlayCharm: referenceCharm,
                    feedStat: referenceFeed,
                    deterministicVariance: 0,
                    eligibleAttempt: true
                },
                actions: [
                    referenceAction('fight', {
                        effectLedger: 'condition',
                        effectPerCommand: referenceFightDamage,
                        committedCommands: commandsToResolve(referenceFightDamage),
                        xpPerResolvedEncounter: reward('defeatEnemy', 50),
                        rewardMode: 'once-on-enemy-defeat'
                    }),
                    referenceAction('flirt', {
                        publicAction: 'talk',
                        effectLedger: 'spirit',
                        resolutionThreshold: Math.ceil(referencePool * cfg.spiritThresholdRatio),
                        effectPerCommand: Math.floor(referenceCharm * 0.3),
                        committedCommands: Math.ceil((referencePool * cfg.spiritThresholdRatio) / Math.floor(referenceCharm * 0.3)),
                        xpPerResolvedEncounter: reward('flirtEnemy', 50),
                        rewardMode: 'once-on-enemy-social-resolution'
                    }),
                    referenceAction('fuck', {
                        publicAction: 'play',
                        effectLedger: 'spirit',
                        resolutionThreshold: Math.ceil(referencePool * cfg.spiritThresholdRatio),
                        effectPerCommand: Math.floor(referenceCharm * 0.5),
                        committedCommands: Math.ceil((referencePool * cfg.spiritThresholdRatio) / Math.floor(referenceCharm * 0.5)),
                        xpPerResolvedEncounter: reward('seduceEnemy', 50),
                        rewardMode: 'once-on-enemy-social-resolution'
                    }),
                    referenceAction('feed', {
                        effectLedger: 'condition',
                        effectPerCommand: Math.floor(referenceFeed * 2),
                        committedCommands: commandsToResolve(Math.floor(referenceFeed * 2)),
                        xpPerCommand: 'condition-band delta',
                        xpPerResolvedEncounter: reward('feedAlly', 20),
                        rewardMode: 'proportional-to-net-condition-restored; capped-per-full-target-pool; no-self-reward'
                    }),
                    referenceAction('feast', {
                        effectLedger: 'containment-state',
                        effectPerCommand: 'variant-defined terminal or contained state',
                        committedCommands: 1,
                        xpPerResolvedEncounter: reward('consumeEnemy', 75),
                        rewardMode: 'once-on-enemy-consumption'
                    }),
                    referenceAction('flee', {
                        targetPool: null,
                        effectLedger: 'position',
                        effectPerCommand: 'safe-adjacent relocation',
                        committedCommands: 1,
                        xpPerResolvedEncounter: 0,
                        rewardMode: 'none'
                    })
                ],
                multiTargetFight: masteryTiers.flatMap(([tier, xp]) => [
                    multiFight(1, xp, tier),
                    multiFight(2, xp, tier),
                    multiFight(4, xp, tier)
                ]).concat([multiFight(4, 0, 'novice', true)])
            },
            spirit: {
                breakthroughRatio: cfg.spiritThresholdRatio,
                postResolveRatio: cfg.spiritPostResolveRatio
            }
        };
    },

    interactionMatrix(app) {
        const cfg = this.ensure(app);
        const techniqueRegistry = app?.combatTechniqueRegistry
            || (typeof YAW_COMBAT_TECHNIQUES !== 'undefined' ? YAW_COMBAT_TECHNIQUES : null);
        const techniqueProfiles = techniqueRegistry?.profiles?.values
            ? [...techniqueRegistry.profiles.values()]
            : [];
        const rewards = {
            defeatEnemy: Number(app?.XP_REWARDS?.defeatEnemy ?? 50),
            consumeEnemy: Number(app?.XP_REWARDS?.consumeEnemy ?? 75),
            seduceEnemy: Number(app?.XP_REWARDS?.seduceEnemy ?? 50),
            flirtEnemy: Number(app?.XP_REWARDS?.flirtEnemy ?? 50),
            feedAlly: Number(app?.XP_REWARDS?.feedAlly ?? 20),
            feedEnemy: Number(app?.XP_REWARDS?.feedEnemy ?? 25)
        };
        const command = (id, details = {}) => ({
            id,
            source: {
                hunger: Number(cfg.costs[id] ?? 0),
                charge: 'once-per-committed-actor-command'
            },
            timeHours: 0,
            turn: 'committed-attempt',
            shapes: ['one-to-one'],
            outcomes: {
                blocked: { charge: false, consumesTurn: false },
                success: { charge: true, consumesTurn: true },
                committedFailure: { charge: true, consumesTurn: true }
            },
            ...details
        });
        const variant = (action, id, details = {}) => ({
            id: `${action}.${id}`,
            action,
            variant: id,
            source: {
                hunger: Number(cfg.costs[action] ?? 0),
                charge: 'once-per-committed-actor-command'
            },
            timeHours: 0,
            turn: 'committed-attempt',
            outcomes: {
                blocked: { charge: false, consumesTurn: false },
                success: { charge: true, consumesTurn: true },
                committedFailure: { charge: true, consumesTurn: true }
            },
            ...details
        });
        const fightVariants = [{
            id: 'fight.basic',
            action: 'fight',
            variant: 'basic',
            owner: 'core',
            source: {
                hunger: Number(cfg.costs.fight ?? 0),
                variantHungerSurcharge: 0,
                charge: 'once-per-committed-actor-command'
            },
            reach: 'actor-default',
            equipment: null,
            target: {
                damage: 'ordinary deterministic Fight damage',
                area: { maxTargets: 8, distribution: 'split', recovery: 'multi-Fight practice' },
                status: null
            },
            timeHours: 0,
            turn: 'committed-attempt'
        }, ...techniqueProfiles.map(profile => ({
            id: `fight.${profile.key}`,
            action: 'fight',
            variant: profile.key,
            owner: profile.owner,
            source: {
                hunger: Number(cfg.costs.fight ?? 0),
                variantHungerSurcharge: 0,
                charge: 'once-per-committed-actor-command'
            },
            reach: profile.reach || 'actor-default',
            equipment: {
                required: Boolean(profile.equipment?.required),
                anyTags: [...(profile.equipment?.anyTags || [])],
                allTags: [...(profile.equipment?.allTags || [])],
                slots: [...(profile.equipment?.slots || [])]
            },
            target: {
                damage: {
                    multiplier: Number(profile.damage?.multiplier ?? 1),
                    flat: Number(profile.damage?.flat ?? 0)
                },
                area: {
                    maxTargets: Number(profile.area?.maxTargets ?? 1),
                    distribution: profile.area?.distribution || 'split',
                    recovery: Number(profile.area?.recovery ?? 0)
                },
                status: profile.status ? { ...profile.status } : null
            },
            timeHours: 0,
            turn: 'committed-attempt'
        }))];
        return {
            schemaVersion: 3,
            semantics: {
                hunger: 'higher-is-hungrier',
                condition: 'CPun/MPun',
                spirit: 'CPle/MPle',
                vitality: 'containment-vital-pool',
                blockedSelection: 'no-cost-no-turn',
                committedFailure: 'cost-and-turn',
                multiTargetCost: 'once-per-actor-command',
                groupCost: 'once-per-participant-command'
            },
            clockPolicy: {
                nonTravelInteractionHours: 0,
                actions: {
                    fight: 0,
                    flirt: 0,
                    fuck: 0,
                    feed: 0,
                    feast: 0,
                    flee: 0
                },
                travel: 'authored traversal cost',
                search: 1,
                rest: 8,
                invariant: 'turn commitment and world-clock advancement are separate ledgers'
            },
            commands: [
                command('fight', {
                    shapes: ['one-to-one', 'one-to-many', 'many-to-one', 'mutual'],
                    target: { condition: 'damage(action-rating, defense, terrain, multi-target-scale)' },
                    reward: { xpOnEnemyDefeat: rewards.defeatEnemy },
                    practice: 'multi-target-fight-only'
                }),
                command('flirt', {
                    publicAction: 'talk',
                    shapes: ['one-to-one', 'one-to-many', 'many-to-one', 'mutual'],
                    target: { spirit: 'floor(charm*0.3) on success', fight: '-1 on success' },
                    reward: { xpOnEnemyResolution: rewards.flirtEnemy }
                }),
                command('fuck', {
                    publicAction: 'play',
                    shapes: ['one-to-one', 'one-to-many', 'many-to-one', 'mutual'],
                    target: { spirit: 'floor(charm*0.5) on success' },
                    reward: { xpOnEnemyResolution: rewards.seduceEnemy }
                }),
                command('feed', {
                    shapes: ['one-to-one', 'one-to-many', 'many-to-one', 'mutual'],
                    target: { condition: 'floor(actor.Feed*2)' },
                    reward: {
                        xpOnResolution: 'condition-band delta',
                        capPerFullTargetPool: rewards.feedAlly,
                        selfTarget: 0
                    }
                }),
                command('feast', {
                    shapes: ['one-to-one', 'one-to-many', 'many-to-one'],
                    target: { state: 'variant-defined containment or vitality outcome' },
                    reward: { xpOnEnemyConsumption: rewards.consumeEnemy }
                }),
                command('flee', {
                    shapes: ['self'],
                    target: { position: 'safe-adjacent-tile-or-room on success' },
                    reward: { xpOnResolution: 0 }
                })
            ],
            combatPressure: {
                hungryAtOrAbove: Number(cfg.hungerHungry),
                starvingAtOrAbove: Number(cfg.hungerStarving),
                hungry: {
                    actionMultiplier: Number(cfg.combatPressure.hungryActionMultiplier),
                    initiativeMultiplier: Number(cfg.combatPressure.hungryInitiativeMultiplier),
                    fleePenalty: Number(cfg.combatPressure.hungryFleePenalty)
                },
                starving: {
                    actionMultiplier: Number(cfg.combatPressure.starvingActionMultiplier),
                    initiativeMultiplier: Number(cfg.combatPressure.starvingInitiativeMultiplier),
                    fleePenalty: Number(cfg.combatPressure.starvingFleePenalty)
                },
                appliesTo: 'all-living-combatants',
                invariant: 'does-not-lower-constitution-or-maximum-condition'
            },
            variants: [
                variant('feed', 'tend', {
                    target: { condition: 'floor(actor.Feed*2)', hunger: 0, spirit: 0 },
                    reward: {
                        xpOnResolution: 'condition-band delta',
                        capPerFullTargetPool: rewards.feedAlly,
                        selfTarget: 0
                    }
                }),
                variant('feed', 'nurse', {
                    source: {
                        hunger: Number(cfg.costs.feed ?? 0),
                        resource: { key: 'core:nurse', amount: 1, capacity: 3, regeneration: { trigger: 'digestion', every: 3, amount: 1 } },
                        cooldown: { lactation: 3 },
                        charge: 'once-per-committed-actor-command'
                    },
                    target: { condition: 'floor(actor.Feed*3)', hunger: -40, spirit: 'floor(heal*0.3)' },
                    reward: { xpOnResolution: rewards.feedAlly }
                }),
                variant('feed', 'offerWhole', {
                    source: { hunger: Number(cfg.costs.feed ?? 0), state: 'contained-by-target', charge: 'once-per-committed-actor-command' },
                    target: { hunger: 'containment-fullness-by-source-size', capacity: 'source-size' },
                    reward: { xpOnResolution: rewards.feedAlly }
                }),
                variant('feed', 'offerPiece', {
                    source: { hunger: Number(cfg.costs.feed ?? 0), condition: '-max(2,floor(MPun*0.15))', charge: 'once-per-committed-actor-command' },
                    target: { condition: 'floor(actor.Feed*1.5)', hunger: '-max(10,piece-cost)' },
                    reward: { xpOnResolution: rewards.feedAlly }
                }),
                variant('feast', 'swallow', {
                    source: { hunger: Number(cfg.costs.feast ?? 0), condition: '+20 on success', charge: 'once-per-committed-actor-command' },
                    target: { state: 'contained-stomach', hunger: 'holder fullness by target size' },
                    reward: { xpOnEnemyResolution: rewards.consumeEnemy }
                }),
                variant('feast', 'chew', {
                    source: { hunger: Number(cfg.costs.feast ?? 0), condition: 0, charge: 'once-per-committed-actor-command' },
                    target: { vitality: '-same-as-condition-damage', condition: '-same-as-vitality-damage', state: 'survives, flees, fights, or becomes depleted remains' },
                    reward: { xpOnEnemyResolution: rewards.defeatEnemy, rewardMode: 'defeat-only; no automatic consumption credit' }
                }),
                variant('feast', 'digest', {
                    scope: 'self',
                    target: { digestionProgress: 100, state: 'terminalized-by-containment-policy' },
                    reward: { xpOnResolution: 0 }
                }),
                variant('feast', 'release', {
                    scope: 'self',
                    target: { state: 'released-at-reduced-condition' },
                    reward: { xpOnResolution: 0 }
                }),
                variant('fuck', 'seduce', {
                    scope: 'both',
                    publicAction: 'play',
                    target: { spirit: 'floor(charm*0.5) on success' },
                    reward: { xpOnEnemyResolution: rewards.seduceEnemy }
                })
            ].concat(fightVariants),
            digestion: {
                passiveBaseRate: 5,
                passiveSlowRate: 2,
                hungerScaling: {
                    satiatedAtOrBelow: Number(cfg.digestion.satiatedThreshold),
                    hungryAtOrAbove: Number(cfg.hungerHungry),
                    starvingAtOrAbove: Number(cfg.hungerStarving),
                    multipliers: {
                        satiated: Number(cfg.digestion.satiatedMultiplier),
                        steady: 1,
                        hungry: Number(cfg.digestion.hungryMultiplier),
                        starving: Number(cfg.digestion.starvingMultiplier)
                    },
                    minimum: Number(cfg.digestion.minimumMultiplier),
                    maximum: Number(cfg.digestion.maximumMultiplier)
                },
                totalNutrition: `${cfg.relief.containmentNutritionPerSize}*prey-size`,
                invariant: 'rate-changes-delivery-time-not-total-nutrition'
            },
            unresolved: [
                'authored mass-ledger replacement for Offer Piece condition proxy'
            ]
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
