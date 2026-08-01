/**
 * YOU ARE WILD SUB-ACTIONS
 * Shared registry helpers for primary action variants and safe labels.
 */

const YAW_SUB_ACTIONS = {
    CONTEXTUAL_ACTIONS: new Set(['feed', 'feast', 'flirt', 'fuck']),
    MAX_VARIANTS_PER_ACTION: 24,
    MAX_ID_LENGTH: 64,
    MAX_PAIR_PREVIEWS: 8,
    definitions: {
        feast: {
            swallow: { label: 'Swallow', sfwLabel: 'Eat', icon: '🍽️', validate: (a, t) => Boolean(a && t) && a !== t, execute: 'swallowWhole', setting: null, requirements: ['reach', 'capacity', 'willingness'] },
            chew: { label: 'Chew', sfwLabel: 'Break Down', icon: '🦷', validate: (a, t) => a !== t && App.settings.chewing, execute: 'chewPrey', setting: 'chewing', settingLabelKey: 'settings.variant.chewing', hintKey: 'feast.chewHint', hint: 'Vitality attack: damage also reduces punishment. A survivor may flee or fight.', minPosture: 'mature', requirements: ['reach', 'cost'] },
            cockVore: { label: 'Capture', sfwLabel: 'Capture', icon: '📦', validate: (a, t) => Boolean(a && t) && a !== t && App.settings.cockVoreEnabled && a.parts === 'cock', execute: 'cockVore', setting: 'cockVoreEnabled', settingLabelKey: 'variant.setting.capture', contentCategory: 'explicit.sexual', requirements: ['reach', 'capacity'] },
            unbirth: { label: 'Engulf', sfwLabel: 'Engulf', icon: '🔮', validate: (a, t) => Boolean(a && t) && a !== t && App.settings.unbirthEnabled && a.parts === 'clit', execute: 'unbirth', setting: 'unbirthEnabled', settingLabelKey: 'variant.setting.engulf', contentCategory: 'explicit.sexual', requirements: ['reach', 'capacity'] },
            digest: { label: 'Digest', sfwLabel: 'Break Down', icon: '💀', validate: (a) => App._activeContainedPrey?.(a, 'stomach')?.length > 0, execute: 'digestPrey', setting: null, scope: 'self', requirements: ['capacity'] },
            release: { label: 'Release', sfwLabel: 'Free', icon: '⬆️', validate: (a) => App._activeContainedPrey?.(a, 'stomach')?.some(p => p.releaseEligible), execute: 'releasePrey', setting: null, scope: 'self', requirements: ['willingness'] }
        },
        feed: {
            tend: { label: 'Tend', sfwLabel: 'Tend', icon: '💚', validate: (a, t) => Boolean(a && t) && t.CPun < t.MPun, execute: 'tend', setting: null, scope: 'both', requirements: ['reach'] },
            nurse: {
                label: 'Nurse',
                sfwLabel: 'Nurse',
                icon: '🥛',
                validate: (a, t) => a !== t
                    && a.lactating
                    && !a.lactationCooldown
                    && (YAW_RESOURCE_LEDGER.state(a, 'core:nurse')?.current || 0) >= 1,
                execute: 'nurse',
                setting: null,
                requirements: ['reach', 'cost'],
                cost: (app, actor) => YAW_RESOURCE_LEDGER.cost(app, actor, 'core:nurse', 1)
            },
            offerWhole: {
                label: 'Offer Self', sfwLabel: 'Offer Self', icon: '🐄', execute: 'offerWhole', setting: null,
                requirements: ['reach', 'capacity', 'willingness'], validate: (a, t) => a !== t
                    && a !== App.player
                    && !a.mc
                    && (a.livestock || a.willingPrey)
            },
            offerPiece: {
                label: 'Offer Piece', sfwLabel: 'Offer Piece', icon: '🍫', execute: 'offerPiece', setting: null,
                requirements: ['reach', 'cost'], validate: (a, t) => {
                    const renewable = a?.renewableBody || a?.slurpable || a?.breakable || /slime/i.test(String(a?.species || ''));
                    const reserve = Math.max(2, Math.floor((a?.MPun || 1) * 0.15));
                    return a !== t && renewable && a.CPun > reserve && (t.CPun < t.MPun || (t.hunger || 0) > 0);
                }
            },
            heal: { label: 'Heal', sfwLabel: 'Tend', icon: '💚', validate: (a, t) => t.CPun < t.MPun, execute: 'healAlly', setting: null, legacy: true },
            breastfeed: { label: 'Nurse', sfwLabel: 'Nurse', icon: '🥛', validate: (a) => a.lactating && !a.lactationCooldown, execute: 'breastfeed', setting: null, legacy: true },
            sacrifice: { label: 'Sacrifice', sfwLabel: 'Offer', icon: '🐄', validate: (a, t) => (t.livestock || t.willingPrey) && a.size >= t.size - 2 && App._canFitPrey(a, t, 'stomach'), execute: 'sacrificeTo', setting: null, legacy: true },
            forceFeed: { label: 'Force Feed', sfwLabel: 'Force Feed', icon: '🔗', validate: (a, t, h) => App.settings.forcedFeeding && h && h.length > 0 && a.size >= t.size - 2 && App._canFitPrey(a, t, 'stomach'), execute: 'forceFeed', setting: 'forcedFeeding', legacy: true },
            slurp: { label: 'Slurp', sfwLabel: 'Draw', icon: '💧', validate: (a, t) => t.slurpable, execute: 'slurpPortion', setting: null, legacy: true },
            fragment: { label: 'Break Off', sfwLabel: 'Chip', icon: '🍫', validate: (a, t) => t.breakable, execute: 'fragmentPortion', setting: null, legacy: true }
        },
        fight: {
            attack: { label: 'Attack', sfwLabel: 'Attack', icon: '⚔️', validate: () => true, execute: 'attack', setting: null },
            disarm: { label: 'Disarm', sfwLabel: 'Disarm', icon: '🗡️', validate: (a, t) => a.Figh > t.Figh, execute: 'disarm', setting: null },
            grapple: { label: 'Grapple', sfwLabel: 'Grapple', icon: '🤼', validate: (a, t) => a.str > t.spd, execute: 'grapple', setting: null }
        },
        fuck: {
            fuck: { label: 'Fuck', sfwLabel: 'Play', matureLabel: 'Fuck', icon: '🔥', validate: () => true, execute: 'fuck', setting: null, scope: 'both' },
            dominate: { label: 'Dominate', sfwLabel: 'Overpower', icon: '⛓️', validate: (a, t) => App.settings.powerDynamics && a.Fuck > t.Fuck, execute: 'dominate', setting: 'powerDynamics' },
            submit: { label: 'Submit', sfwLabel: 'Yield', icon: '🙇', validate: (a, t) => App.settings.powerDynamics && a.Fuck < t.Fuck, execute: 'submit', setting: 'powerDynamics' }
        },
        flirt: {
            flirt: { label: 'Flirt', sfwLabel: 'Talk', matureLabel: 'Flirt', icon: '😘', validate: () => true, execute: 'flirt', setting: null },
            seduce: { label: 'Seduce', sfwLabel: 'Talk', matureLabel: 'Seduce', icon: '💕', validate: () => true, execute: 'seduce', setting: null, actionProfile: 'core:seduce', minPosture: 'mature' },
            gift: { label: 'Gift', sfwLabel: 'Gift', icon: '🎁', validate: (a) => a.inventory && a.inventory.length > 0, execute: 'gift', setting: null },
            dance: { label: 'Dance', sfwLabel: 'Dance', icon: '💃', validate: () => true, execute: 'dance', setting: null }
        },
        flee: {
            run: { label: 'Run', sfwLabel: 'Flee', icon: '🏃', validate: () => true, execute: 'run', setting: null },
            retreat: { label: 'Retreat', sfwLabel: 'Retreat', icon: '🛡️', validate: (a) => a.party && a.party.length > 1, execute: 'retreatCover', setting: null },
            surrender: { label: 'Surrender', sfwLabel: 'Surrender', icon: '🏳️', validate: () => true, execute: 'surrender', setting: null }
        }
    },

    defaults: { feast: 'swallow', feed: 'tend', fight: 'attack', fuck: 'fuck', flirt: 'flirt', flee: 'run' },

    defaultActions() {
        return { ...this.defaults };
    },

    getDefault(app, action) {
        const selected = app.defaultSubActions[action] || this.defaults[action] || action;
        const definition = app.SUB_ACTIONS[action]?.[selected];
        return !definition || definition.legacy === true
            ? (this.defaults[action] || action)
            : selected;
    },

    contextPairs(actors = [], targets = []) {
        const pairs = [];
        for (const actor of actors.filter(Boolean)) {
            for (const target of targets.filter(Boolean)) pairs.push({ actor, target });
        }
        return pairs;
    },

    requirementSummary(app, action, id, def, actor, target) {
        const requirements = Array.isArray(def.requirements) ? def.requirements : [];
        const labels = {
            cost: app._label('variant.requirement.cost', 'Cost'),
            reach: app._label('variant.requirement.reach', 'Reach'),
            capacity: app._label('variant.requirement.capacity', 'Capacity'),
            willingness: app._label('variant.requirement.willingness', 'Willingness')
        };
        return requirements.map(key => labels[key] || String(key));
    },

    variantCost(app, action, def, actor, target, mode = 'adventure') {
        if (typeof def?.cost === 'function') {
            try {
                return def.cost(app, actor, target) || null;
            } catch (error) {
                return null;
            }
        }
        return def?.cost || app._previewActionCost?.(action, actor, target, { mode }) || null;
    },

    isVisibleForContent(def) {
        const content = typeof CONTENT !== 'undefined' ? CONTENT : null;
        const preferences = content?.preferences || {};
        if (def.minPosture === 'mature' && Number(preferences.maxTier || 0) < 1 && preferences.posture !== 'mature') return false;
        if (def.contentCategory && content?.isCategoryEnabled?.(def.contentCategory) !== true) return false;
        return true;
    },

    settingLabel(app, def) {
        const fallback = def.sfwLabel || def.label || app._label('variant.setting.generic', 'this option');
        return def.settingLabelKey ? app._label(def.settingLabelKey, fallback) : fallback;
    },

    variantScope(def) {
        return ['self', 'target', 'both'].includes(def?.scope) ? def.scope : 'target';
    },

    supportsScope(def, scope = 'target') {
        const variantScope = this.variantScope(def);
        return scope === 'self'
            ? variantScope === 'self' || variantScope === 'both'
            : variantScope === 'target' || variantScope === 'both';
    },

    feastAttemptAssessment(app, actor, target, options = {}) {
        const container = options.container || 'stomach';
        const requireCapacity = options.requireCapacity !== false;
        const canFit = !requireCapacity || Boolean(app?._canFitPrey?.(actor, target, container));
        if (!actor || !target || actor === target) {
            return {
                canAttempt: false,
                succeeds: false,
                outlook: 'blocked',
                hint: ''
            };
        }

        const targetStatus = target.status || {};
        const asleep = Boolean(app?._sleepSystemEnabled?.() && (target.asleep || targetStatus.asleep || targetStatus.sleep?.turns > 0));
        const restrained = Boolean(target.restrained || target.isRestrained || targetStatus.restrained?.turns > 0 || targetStatus.snared || targetStatus.grabbed || targetStatus.stuck);
        const willing = Boolean(target.willingPrey || target.livestock || target.willing === true);
        const submissive = Boolean(target.recruitReady || target.submission || target.subdued);
        const maxCondition = Math.max(1, Number(target.MPun) || 1);
        const weakened = Number(target.CPun) <= maxCondition * 0.3;
        const actorSize = Number(actor.size) || 0;
        const targetSize = Number(target.size) || 0;
        const sizeGap = actorSize - targetSize;
        const sizeModifier = Math.max(-20, Math.min(20, sizeGap * 4));
        const helperBonus = Math.max(0, Number(options.helperBonus) || 0);
        const actorScore = (Number(actor.Feas) || 10)
            + 5
            + helperBonus
            + sizeModifier
            + (asleep ? 12 : 0)
            + (restrained ? 10 : 0)
            + (submissive ? 10 : 0);
        const resistance = Number(target.Flee) || 10;
        const succeeds = Boolean(app?.cheats?.canEatAnything || willing || weakened || actorScore > resistance);
        const margin = actorScore - resistance;
        const favorableOpening = (asleep || restrained || submissive) && succeeds;
        const outlook = !canFit
            ? 'difficult'
            : willing || weakened || favorableOpening || margin >= 6
            ? 'favorable'
            : (margin >= -5 ? 'uncertain' : 'difficult');
        let hintKey = `variant.attempt.${outlook}`;
        let fallback = outlook === 'favorable'
            ? 'Favorable attempt.'
            : (outlook === 'uncertain' ? 'Uncertain attempt.' : 'Difficult attempt.');
        if (!canFit) {
            hintKey = 'variant.attempt.difficultCapacity';
            fallback = 'Difficult attempt: the target may not fit.';
        } else if (willing) {
            hintKey = 'variant.attempt.favorableWilling';
            fallback = 'Favorable attempt: the target appears willing.';
        } else if (weakened) {
            hintKey = 'variant.attempt.favorableWeakened';
            fallback = 'Favorable attempt: the target is weakened.';
        } else if (asleep) {
            hintKey = 'variant.attempt.favorableAsleep';
            fallback = 'Favorable opening: the target is asleep.';
        } else if (restrained) {
            hintKey = 'variant.attempt.favorableRestrained';
            fallback = 'Favorable opening: the target is restrained.';
        } else if (submissive) {
            hintKey = 'variant.attempt.favorableSubmissive';
            fallback = 'Favorable opening: the target appears submissive.';
        } else if (outlook === 'difficult' && sizeGap < 0) {
            hintKey = 'variant.attempt.difficultLarger';
            fallback = 'Difficult attempt: the target is larger and resisting.';
        } else if (outlook === 'difficult') {
            hintKey = 'variant.attempt.difficultResisting';
            fallback = 'Difficult attempt: the target is healthy and resisting.';
        }
        return {
            canAttempt: true,
            succeeds,
            outlook,
            hint: app._label(hintKey, fallback),
            asleep,
            restrained,
            willing,
            submissive,
            weakened,
            actorScore,
            resistance,
            sizeGap,
            canFit
        };
    },

    unavailableReason(app, action, id, def, actor, target, holder = []) {
        if (typeof def.unavailableReason === 'function') {
            try {
                const reason = def.unavailableReason(actor, target, holder, app);
                if (reason) return String(reason);
            } catch (error) {}
        }
        if (def.setting && app.settings?.[def.setting] !== true) {
            return app._label('variant.unavailable.setting', 'Enable {setting} in Settings.', { setting: this.settingLabel(app, def) });
        }
        if (!actor || !target) return app._label('variant.unavailable.selection', 'Choose a valid actor and target.');
        if (action === 'feed') {
            if (id === 'tend' && target.CPun >= target.MPun) return app._label('variant.unavailable.noInjury', '{name} does not need tending.', { name: target.name });
            if (id === 'nurse') {
                if (actor === target) return app._label('variant.unavailable.self', 'This variant needs a different target.');
                if (!actor.lactating) return app._label('variant.unavailable.capability', '{name} does not have the required capability.', { name: actor.name });
                if (actor.lactationCooldown) return app._label('variant.unavailable.cooldown', '{name} is not ready yet.', { name: actor.name });
                const reserve = YAW_RESOURCE_LEDGER.state(actor, 'core:nurse');
                if (!reserve || reserve.current < 1) {
                    return app._label('variant.unavailable.resource', '{name} does not have enough {resource}.', {
                        name: actor.name,
                        resource: YAW_RESOURCE_LEDGER.label(app, 'core:nurse')
                    });
                }
            }
            if (id === 'offerWhole') {
                if (actor === target) return app._label('variant.unavailable.self', 'This variant needs a different target.');
                if (actor === app.player || actor.mc) return app._label('feed.offerWholePlayerDeferred', 'Whole-self offering for the player is not available yet.');
                if (!actor.livestock && !actor.willingPrey) return app._label('feed.offerWholeUnwilling', '{name} is not willing to offer themself whole.', { name: actor.name });
                return app._label('variant.unavailable.capacity', '{name} does not have enough capacity.', { name: target.name });
            }
            if (id === 'offerPiece') {
                const renewable = actor.renewableBody || actor.slurpable || actor.breakable || /slime/i.test(String(actor.species || ''));
                if (!renewable) return app._label('feed.offerPieceUnavailable', '{name} cannot safely offer a renewable piece.', { name: actor.name });
                return app._label('feed.offerPieceTooWeak', '{name} is too weak to offer a piece right now.', { name: actor.name });
            }
        }
        if (action === 'feast') {
            if (id === 'digest') return app._label('variant.unavailable.contained', '{name} has no living prey to digest.', { name: actor.name });
            if (id === 'release') return app._label('variant.unavailable.release', '{name} has no eligible prey to release.', { name: actor.name });
            if (actor === target) return app._label('variant.unavailable.self', 'This variant needs a different target.');
        }
        const requirements = this.requirementSummary(app, action, id, def, actor, target);
        return requirements.length
            ? app._label('variant.unavailable.requirements', 'Requirements not met: {requirements}.', { requirements: requirements.join(', ') })
            : app._label('variant.unavailable.generic', 'This variant is not available for the current actor and target.');
    },

    resolve(app, action, context = {}) {
        const actors = (context.actors || [context.actor]).filter(Boolean);
        const targets = (context.targets || [context.target]).filter(Boolean);
        const scope = context.scope === 'self' ? 'self' : 'target';
        const pairs = scope === 'self'
            ? actors.map(actor => ({ actor, target: actor }))
            : this.contextPairs(actors, targets);
        const subDefs = app.SUB_ACTIONS[action] || {};
        const holder = app.party.filter(unit => !actors.includes(unit) && !targets.includes(unit) && unit.CPun > 0);
        const variants = Object.entries(subDefs)
            .filter(([, def]) => context.includeLegacy === true || def.legacy !== true)
            .filter(([, def]) => this.isVisibleForContent(def))
            // A disabled setting is not an actionable option. Keep genuine
            // actor/target limits visible as clues, but do not advertise
            // optional mechanics that the player has turned off.
            .filter(([, def]) => !def.setting || app.settings?.[def.setting] === true)
            .filter(([, def]) => this.supportsScope(def, scope))
            .map(([id, def]) => {
                const helperBonus = actors
                    .filter(Boolean)
                    .reduce((sum, helper) => sum + Math.floor((Number(helper.Feas) || 10) * 0.5), 0);
                const evaluations = pairs.map(pair => {
                    const reach = context.mode === 'combat' && app._isReachSensitiveCombatAction?.(action)
                        ? app._combatReachResult?.(pair.actor, pair.target, action)
                        : null;
                    const pressure = app._canAffordActionPressure?.(action, pair.actor, { mode: context.mode || 'adventure' }) || { ok: true };
                    const available = this.isAvailable(app, def, pair.actor, pair.target, holder, context.mode || 'adventure')
                        && pressure.ok !== false;
                    const attempt = available && action === 'feast' && ['swallow', 'cockVore', 'unbirth'].includes(id)
                        ? this.feastAttemptAssessment(app, pair.actor, pair.target, {
                            container: id === 'cockVore' ? 'balls' : (id === 'unbirth' ? 'womb' : 'stomach'),
                            requireCapacity: id !== 'chew',
                            helperBonus: Math.max(0, helperBonus - Math.floor((Number(pair.actor?.Feas) || 10) * 0.5))
                        })
                        : null;
                    const cost = this.variantCost(app, action, def, pair.actor, pair.target, context.mode || 'adventure');
                    return {
                        ...pair,
                        reach,
                        pressure,
                        available,
                        attempt,
                        cost
                    };
                });
                const validPairs = evaluations.filter(entry => entry.available);
                const invalidPairs = evaluations.filter(entry => !entry.available);
                // A coordinated Seduce needs every selected participant to be
                // ready; advertising it when one helper lacks the appetite
                // requirement only creates a later refusal.
                const requireEveryActor = action === 'flirt' && id === 'seduce' && actors.length > 1;
                const available = requireEveryActor
                    ? evaluations.length > 0 && invalidPairs.length === 0
                    : validPairs.length > 0;
                const status = available && invalidPairs.length ? 'partial' : (available ? 'available' : 'unavailable');
                const failed = invalidPairs[0] || pairs[0] || { actor: actors[0], target: targets[0] };
                const reason = status === 'available' ? '' : (
                    failed.pressure?.ok === false
                        ? String(failed.pressure.text || app._label('variant.unavailable.cost', 'The actor cannot afford this action right now.'))
                        : this.unavailableReason(app, action, id, def, failed.actor, failed.target, holder)
                );
                const attemptAssessments = evaluations.map(entry => entry.attempt).filter(Boolean);
                const attemptAssessment = attemptAssessments.find(entry => entry.outlook === 'difficult')
                    || attemptAssessments.find(entry => entry.outlook === 'uncertain')
                    || attemptAssessments[0]
                    || null;
                const pairPreviews = evaluations.slice(0, this.MAX_PAIR_PREVIEWS).map(entry => {
                    const actorName = entry.actor?.name || app._label('ui.unknown', 'Unknown');
                    const targetName = entry.target?.name || app._label('ui.unknown', 'Unknown');
                    const pairReason = entry.available
                        ? (entry.attempt?.hint || app._label('variant.pair.ready', 'Ready'))
                        : (
                            entry.pressure?.ok === false
                                ? String(entry.pressure.text || app._label('variant.unavailable.cost', 'The actor cannot afford this action right now.'))
                                : this.unavailableReason(app, action, id, def, entry.actor, entry.target, holder)
                        );
                    return {
                        actorId: app._unitSelectionId?.(entry.actor) || entry.actor?.id || actorName,
                        actorName,
                        targetId: app._unitSelectionId?.(entry.target) || entry.target?.id || targetName,
                        targetName,
                        available: entry.available,
                        outlook: entry.attempt?.outlook || '',
                        reason: pairReason,
                        label: app._label(
                            entry.available ? 'variant.pair.available' : 'variant.pair.unavailable',
                            entry.available ? '{actor} to {target}: {reason}.' : '{actor} to {target}: Unavailable — {reason}',
                            { actor: actorName, target: targetName, reason: pairReason }
                        ),
                        cost: entry.cost?.label || ''
                    };
                });
                const actorCosts = [];
                const costedActors = new Set();
                for (const entry of evaluations) {
                    if (!entry.actor || costedActors.has(entry.actor)) continue;
                    costedActors.add(entry.actor);
                    actorCosts.push({
                        actorId: app._unitSelectionId?.(entry.actor) || entry.actor?.id || entry.actor?.name || '',
                        actorName: entry.actor?.name || app._label('ui.unknown', 'Unknown'),
                        cost: entry.cost?.label || ''
                    });
                }
                return {
                    id,
                    label: app._getActionLabel(action, id),
                    icon: def.icon || '',
                    available,
                    status,
                    reason,
                    hint: [
                        attemptAssessment?.hint || '',
                        def.hintKey ? app._label(def.hintKey, def.hint || '') : (def.hint || '')
                    ].filter(Boolean).join(' '),
                    outlook: attemptAssessment?.outlook || '',
                    requirements: this.requirementSummary(app, action, id, def, failed.actor, failed.target),
                    cost: this.variantCost(app, action, def, failed.actor, failed.target, context.mode || 'adventure'),
                    setting: def.setting || null,
                    owner: def.owner || 'core',
                    scope: this.variantScope(def),
                    validPairCount: validPairs.length,
                    pairCount: evaluations.length,
                    pairPreviews,
                    pairPreviewOverflow: Math.max(0, evaluations.length - pairPreviews.length),
                    actorCosts
                };
            });
        const selectable = variants.filter(variant => variant.available);
        const preferred = context.preferred || this.getDefault(app, action);
        const selected = selectable.find(variant => variant.id === preferred) || selectable[0] || null;
        return {
            action,
            scope,
            actors,
            targets,
            variants,
            selected,
            decision: selectable.length === 0 ? 'unavailable' : (selectable.length === 1 ? 'direct' : 'choose')
        };
    },

    available(app, action, actor, target) {
        return this.resolve(app, action, { actors: [actor], targets: [target] }).variants;
    },

    isAvailable(app, def, actor, target, holder = [], mode = 'adventure') {
        if (!def || typeof def.validate !== 'function') return false;
        try {
            if (def.actionProfile && typeof YAW_ACTION_PROFILES !== 'undefined') {
                return YAW_ACTION_PROFILES.availability(app, def.actionProfile, actor, target, mode === 'combat' ? 'combat' : 'exploration').ok;
            }
            return !!def.validate(actor, target, holder);
        } catch (error) {
            return false;
        }
    },

    actionProfile(action, subAction) {
        const key = this.definitions[action]?.[subAction]?.actionProfile;
        return key && typeof YAW_ACTION_PROFILES !== 'undefined'
            ? YAW_ACTION_PROFILES.profile(key)
            : null;
    },

    routesActionProfile(profileKey) {
        return Object.values(this.definitions).some(group => Object.values(group)
            .some(def => def.actionProfile === profileKey));
    },

    label(app, action, subAction) {
        const legacyExplicit = CONTENT.preferences.maxTier >= 2 && CONTENT.preferences.explicitDescriptions === true;
        const subDefs = app.SUB_ACTIONS[action];
        if (!subDefs || !subDefs[subAction]) return subAction;
        const maturePosture = Number(CONTENT.preferences.maxTier || 0) >= 1 || CONTENT.preferences.posture === 'mature';
        const matureCoreLabel = Boolean(subDefs[subAction].matureLabel)
            && maturePosture;
        const isSFW = !maturePosture
            && CONTENT?.isCategoryEnabled?.('explicit.sexual') !== true
            && !legacyExplicit;
        const fallback = matureCoreLabel
            ? subDefs[subAction].matureLabel
            : (isSFW ? (subDefs[subAction].sfwLabel || subDefs[subAction].label) : subDefs[subAction].label);
        const suffix = matureCoreLabel ? '.mature' : (isSFW ? '.sfw' : '');
        return app._label(`subaction.${action}.${subAction}${suffix}`, fallback);
    },

    register(app, action, subId, config = {}, options = {}) {
        const requestedAction = String(action || '').trim();
        const normalizedAction = requestedAction === 'play'
            ? 'fuck'
            : (requestedAction === 'talk' ? 'flirt' : requestedAction);
        const normalizedId = String(subId || '').trim();
        const trustedLegacy = options.trustedLegacy === true;
        if (!this.CONTEXTUAL_ACTIONS.has(normalizedAction) && !(trustedLegacy && app.SUB_ACTIONS[normalizedAction])) throw new Error('Action variants may only extend Feed, Feast, Talk, or Play in V1');
        if (!/^[a-z][a-zA-Z0-9_-]*$/.test(normalizedId) || normalizedId.length > this.MAX_ID_LENGTH) throw new Error('Action variant id is invalid');
        if (!config || typeof config !== 'object') throw new Error('Action variant definition must be an object');
        if (typeof config.validate !== 'function' || typeof config.execute !== 'function') throw new Error('Action variants require validate and execute functions');
        app.SUB_ACTIONS[normalizedAction] = app.SUB_ACTIONS[normalizedAction] || {};
        if (Object.keys(app.SUB_ACTIONS[normalizedAction]).length >= this.MAX_VARIANTS_PER_ACTION) throw new Error('Action variant limit reached');
        if (app.SUB_ACTIONS[normalizedAction][normalizedId] && !trustedLegacy) throw new Error(`Action variant ${normalizedAction}.${normalizedId} is already registered`);
        const boundedString = (value, fallback, limit) => String(value || fallback).trim().slice(0, limit);
        const requirements = Array.isArray(config.requirements)
            ? config.requirements.map(String).filter(key => ['cost', 'reach', 'capacity', 'willingness'].includes(key)).slice(0, 4)
            : [];
        app.SUB_ACTIONS[normalizedAction][normalizedId] = {
            label: boundedString(config.label, normalizedId, 80),
            sfwLabel: boundedString(config.sfwLabel, config.label || normalizedId, 80),
            icon: boundedString(config.icon, '❓', 16),
            validate: config.validate,
            execute: config.execute,
            unavailableReason: typeof config.unavailableReason === 'function' ? config.unavailableReason : null,
            setting: null,
            scope: ['self', 'target', 'both'].includes(config.scope) ? config.scope : 'target',
            requirements,
            cost: config.cost && typeof config.cost === 'object' ? { ...config.cost } : null,
            owner: String(options.owner || 'legacy-runtime').slice(0, 160)
        };
        if (config.defaultForAction) app.defaultSubActions[normalizedAction] = normalizedId;
        return app.SUB_ACTIONS[normalizedAction][normalizedId];
    },

    unregisterOwner(app, owner) {
        const normalizedOwner = String(owner || '');
        for (const action of this.CONTEXTUAL_ACTIONS) {
            for (const [id, def] of Object.entries(app.SUB_ACTIONS[action] || {})) {
                if (def.owner === normalizedOwner) delete app.SUB_ACTIONS[action][id];
            }
            if (!app.SUB_ACTIONS[action]?.[app.defaultSubActions[action]]) app.defaultSubActions[action] = this.defaults[action];
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SUB_ACTIONS = YAW_SUB_ACTIONS;
}
