/**
 * YOU ARE WILD COMPANION BEHAVIOR V2
 * Separates what a companion contributes (Duty), how they weigh choices
 * (Stance), and who chooses their action (Control).
 */

const YAW_COMPANION_BEHAVIOR = {
    VERSION: 2,

    DUTIES: {
        guard: {
            label: 'Guard',
            description: 'Protects vulnerable allies and reduces ambush pressure.',
            tradeoff: 'Prioritizes immediate threats over exploration and resources.'
        },
        scout: {
            label: 'Scout',
            description: 'Improves visibility, route awareness, and ambush detection.',
            tradeoff: 'Avoids prolonged exchanges when a safer opening exists.'
        },
        support: {
            label: 'Support',
            description: 'Improves recovery and prioritizes tending wounded allies.',
            tradeoff: 'Gives up offensive tempo when the party needs care.'
        },
        gatherer: {
            label: 'Gatherer',
            description: 'Improves searching, foraging, and recovery of useful remains.',
            tradeoff: 'Prioritizes resources over pressing an advantage.'
        }
    },

    STANCES: {
        aggressive: {
            label: 'Aggressive',
            description: 'Presses reachable threats and accepts more risk.'
        },
        balanced: {
            label: 'Balanced',
            description: 'Balances pressure, safety, care, and opportunity.'
        },
        defensive: {
            label: 'Defensive',
            description: 'Protects the party and favors lower-risk actions.'
        },
        passive: {
            label: 'Passive',
            description: 'Avoids escalation unless an ally is endangered.'
        }
    },

    CONTROLS: {
        manual: {
            label: 'Manual',
            description: 'You choose this companion’s actions.'
        },
        deterministic: {
            label: 'Autonomous',
            description: 'The companion chooses legal actions from Duty, Stance, and current conditions.'
        },
        provider: {
            label: 'AI assisted',
            description: 'A configured character controller may choose; deterministic autonomy is the safe fallback.'
        }
    },

    hasProviderController(app) {
        return Boolean(app?.companionDecisionProvider
            && typeof app.companionDecisionProvider.chooseAction === 'function');
    },

    PREFERRED_ROWS: {
        auto: {
            label: 'Auto',
            description: 'Starts in the row that best fits the companion’s natural reach.'
        },
        front: {
            label: 'Front',
            description: 'Starts each new combat in the front row.'
        },
        back: {
            label: 'Back',
            description: 'Starts each new combat in the back row.'
        }
    },

    legacyDuty(role) {
        const key = String(role || '').toLowerCase();
        if (this.DUTIES[key]) return key;
        if (key === 'companion') return 'scout';
        if (key === 'healer') return 'support';
        if (key === 'scavenger') return 'gatherer';
        return 'scout';
    },

    legacyStance(order) {
        const key = String(order || '').toLowerCase();
        if (this.STANCES[key]) return key;
        if (key === 'healer' || key === 'scavenger') return 'balanced';
        return 'balanced';
    },

    normalize(app, unit, options = {}) {
        if (!unit || typeof unit !== 'object') return null;
        const existing = unit.companionBehavior && typeof unit.companionBehavior === 'object'
            ? unit.companionBehavior
            : {};
        const legacyRole = options.duty || unit.partyRole;
        const legacyOrder = options.stance || unit.aiOrder;
        const inferredLegacyDuty = (!legacyRole || legacyRole === 'companion')
            && ['healer', 'scavenger'].includes(legacyOrder)
            ? this.legacyDuty(legacyOrder)
            : this.legacyDuty(legacyRole);
        const duty = this.DUTIES[existing.duty] ? existing.duty : inferredLegacyDuty;
        const stance = this.STANCES[existing.stance]
            ? existing.stance
            : this.legacyStance(options.stance || unit.aiOrder);
        const preferredRow = this.PREFERRED_ROWS[existing.preferredRow]
            ? existing.preferredRow
            : (this.PREFERRED_ROWS[options.preferredRow]
                ? options.preferredRow
                : (this.PREFERRED_ROWS[unit.preferredCombatRow] ? unit.preferredCombatRow : 'auto'));
        let control = this.CONTROLS[existing.control] ? existing.control : options.control;
        if (!this.CONTROLS[control]) {
            control = unit === app?.player || unit.mc
                ? 'manual'
                : (unit.obedient === false || unit.dumbAI ? 'deterministic' : 'manual');
        }
        const continuity = existing.recruitmentContinuity
            || unit.recruitmentContinuity
            || options.recruitmentContinuity
            || null;
        unit.companionBehavior = {
            version: this.VERSION,
            duty,
            stance,
            control,
            autonomyPaused: existing.autonomyPaused === true,
            preferredRow,
            recruitmentContinuity: continuity ? { ...continuity } : null
        };
        unit.recruitmentContinuity = unit.companionBehavior.recruitmentContinuity;
        // Compatibility mirrors are intentionally retained for old saves and mods.
        unit.partyRole = duty;
        unit.aiOrder = stance;
        unit.preferredCombatRow = preferredRow;
        return unit.companionBehavior;
    },

    get(app, unit) {
        return this.normalize(app, unit) || {
            version: this.VERSION,
            duty: 'support',
            stance: 'balanced',
            control: 'manual',
            autonomyPaused: false,
            preferredRow: 'auto',
            recruitmentContinuity: null
        };
    },

    set(app, unit, field, value) {
        if (!unit || unit === app?.player || unit.mc) return false;
        const definitions = field === 'duty'
            ? this.DUTIES
            : (field === 'stance'
                ? this.STANCES
                : (field === 'control' ? this.CONTROLS : (field === 'preferredRow' ? this.PREFERRED_ROWS : null)));
        if (!definitions || !definitions[value]) return false;
        const behavior = this.get(app, unit);
        behavior[field] = value;
        behavior.version = this.VERSION;
        if (field === 'duty') unit.partyRole = value;
        if (field === 'stance') unit.aiOrder = value;
        if (field === 'preferredRow') unit.preferredCombatRow = value;
        return true;
    },

    currentTurnUnit(app) {
        return app?._currentCombatActor?.()
            || app?.combatState?.turnQueue?.[app?.combatState?.currentTurn]?.unit
            || app?.activeActor
            || null;
    },

    isPaused(app, unit) {
        if (!unit || unit === app?.player || unit.mc) return false;
        return this.get(app, unit).autonomyPaused === true;
    },

    autonomyStatus(app, unit) {
        if (!unit || unit === app?.player || unit.mc) return null;
        const behavior = this.get(app, unit);
        if (behavior.control === 'manual') return 'awaiting-direction';
        if (!behavior.autonomyPaused) return 'active';
        return this.currentTurnUnit(app) === unit ? 'awaiting-direction' : 'paused';
    },

    canToggleAutonomy(app, unit) {
        if (!app?.combatState?.active || !unit || unit === app.player || unit.mc) return false;
        if (this.get(app, unit).control === 'manual') return false;
        return this.currentTurnUnit(app) === app.player;
    },

    toggleAutonomy(app, unit) {
        if (!this.canToggleAutonomy(app, unit)) return null;
        const behavior = this.get(app, unit);
        behavior.autonomyPaused = !behavior.autonomyPaused;
        return behavior.autonomyPaused;
    },

    seedRecruitment(app, target, actor = app?.player, options = {}) {
        if (!target || options.rejoining || target.droppedOffCompanion) {
            return this.normalize(app, target);
        }
        const submission = target.submission || null;
        const spiritRatio = Number(target.CPle || 0) / Math.max(1, Number(target.MPle || 100));
        let kind = 'invited';
        let duty = 'scout';
        let stance = 'balanced';
        if (submission) {
            kind = 'submitted';
            duty = 'guard';
            stance = 'passive';
        } else if (target.orgasmed || target.recruitmentBreakthrough || spiritRatio >= 0.8) {
            kind = 'bonded';
            duty = 'support';
            stance = 'defensive';
        } else if (target.disposition === app?.DISPOSITION?.FRIENDLY) {
            kind = 'befriended';
        }
        const continuity = {
            kind,
            source: submission?.source || options.source || 'recruitment',
            by: submission?.by || app?._unitSelectionId?.(actor) || actor?.id || actor?.name || null,
            day: Number(submission?.day ?? app?.dayCount ?? 0),
            hour: Number(submission?.hour ?? app?.timeHour ?? 0)
        };
        target.companionBehavior = {
            version: this.VERSION,
            duty,
            stance,
            control: 'deterministic',
            autonomyPaused: false,
            preferredRow: 'auto',
            recruitmentContinuity: continuity
        };
        target.recruitmentContinuity = { ...continuity };
        return this.normalize(app, target);
    },

    definition(kind, key) {
        const table = kind === 'duty'
            ? this.DUTIES
            : (kind === 'stance' ? this.STANCES : (kind === 'preferredRow' ? this.PREFERRED_ROWS : this.CONTROLS));
        const fallback = kind === 'duty' ? 'support' : (kind === 'stance' ? 'balanced' : (kind === 'preferredRow' ? 'auto' : 'manual'));
        return table[key] || table[fallback];
    },

    stableTie(app, ally, candidate) {
        if (typeof app?._combatStateRoll === 'function') {
            return app._combatStateRoll(
                'companion-behavior-v2',
                ally,
                `${candidate.action}:${candidate.subAction || ''}:${candidate.target?.id || candidate.target?.name || 'none'}`
            );
        }
        const text = `${ally?.id || ally?.name || ''}:${candidate.action}:${candidate.target?.id || candidate.target?.name || ''}`;
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0) / 4294967296;
    },

    command(app, ally, action, target = null, subAction = null) {
        return app._buildPanelInteractionCommand({
            mode: 'combat',
            actors: [ally],
            targets: [target].filter(Boolean),
            action,
            subAction,
            source: 'companion-autonomy',
            targetType: target && app.party.includes(target) ? 'party' : 'enemy',
            timing: 'current-turn',
            constraints: {
                requireCurrentTurn: true,
                hostileOnly: false,
                checkReach: action !== 'scavenge',
                checkRows: action !== 'scavenge',
                minActors: 1,
                minTargets: target ? 1 : 0,
                maxTargets: target ? 1 : 0
            },
            metadata: {
                phase: 'autonomous-choice',
                companionBehaviorVersion: this.VERSION
            }
        });
    },

    candidates(app, ally) {
        const enemies = (app.creatures || []).filter(unit => unit
            && unit.disposition === app.DISPOSITION.ENEMY
            && unit.CPun > 0
            && !unit.knockedOut
            && !unit.fledCombat);
        // Feed/Tend is restorative support, never a hostile tactic.  The
        // party list can retain stale references while combat state repairs,
        // so disposition is authoritative in addition to party membership.
        const allies = (app.party || []).filter(unit => unit
            && unit.CPun > 0
            && !unit.knockedOut
            && unit.disposition !== app.DISPOSITION?.ENEMY);
        const corpses = (app.creatures || []).filter(unit => app._canScavengeCorpse?.(unit));
        const candidates = [{ action: 'hold', target: null, subAction: null, command: null }];
        const canSwallow = target => typeof app._canFitPrey === 'function'
            ? app._canFitPrey(ally, target, 'stomach')
            : true;
        const digestible = (typeof app._activeContainedPrey === 'function'
            ? app._activeContainedPrey(ally, 'stomach')
            : (ally.stomach || []).filter(prey => prey && prey.inStomach !== false && !['softened', 'terminal', 'digested', 'released', 'passed', 'depleted'].includes(prey.state || prey.digestionState || 'contained'))
        ).find(Boolean) || null;
        const reachForAutonomy = (action, target, subAction = null) => {
            // Players may commit a difficult attempt and receive its narrated
            // outcome. An autonomous companion should instead avoid spending a
            // turn on an action that the shared combat rules already know cannot
            // succeed from its current row/reach profile.
            if (!target || !['fight', 'feast', 'fuck'].includes(action)) return null;
            return typeof app._combatReachResult === 'function'
                ? app._combatReachResult(ally, target, action, { subAction })
                : (typeof YAW_COMBAT_RULES !== 'undefined'
                    ? YAW_COMBAT_RULES.reachResult(app, ally, target, action, { subAction })
                    : null);
        };
        const canAutonomouslyReach = (action, target, subAction = null) => {
            const reach = reachForAutonomy(action, target, subAction);
            return !reach || reach.canSucceed !== false;
        };
        const add = (action, target, subAction = null) => {
            if (action === 'feed' && !allies.includes(target)) return;
            const command = this.command(app, ally, action, target, subAction);
            const valid = app._validateInteractionCommand?.(command) || { ok: true };
            if (valid.ok && canAutonomouslyReach(action, target, subAction)) {
                candidates.push({ action, target, subAction, command });
            }
        };
        const blockedByOwnRow = (action, target, subAction = null) => {
            const reach = reachForAutonomy(action, target, subAction);
            return reach?.canAttempt && reach.canSucceed === false
                && ['contact-needs-front-row', 'melee-needs-front-row'].includes(reach.reason);
        };
        const shouldAdvance = ally.combatRow === 'back' && enemies.some(target => (
            blockedByOwnRow('fight', target)
            || ((ally.hunger || 0) >= 45 && canSwallow(target) && blockedByOwnRow('feast', target, 'swallow'))
        ));
        if (shouldAdvance) candidates.push({ action: 'advance', target: null, subAction: null, command: null });
        for (const target of enemies) {
            add('fight', target);
            // Autonomous companions choose a concrete contextual action. The
            // player-facing path may open a variant sheet, but AI turns must
            // resolve the selected safe default rather than leave an open UI.
            add('flirt', target, app._getDefaultSubAction?.('flirt') || 'flirt');
            add('fuck', target, app._getDefaultSubAction?.('fuck') || 'fuck');
            if ((ally.hunger || 0) >= 45 && canSwallow(target)) add('feast', target, 'swallow');
        }
        // Hunger and stomach capacity are deliberately separate. A hungry
        // companion with no room should work through an eligible stomach entry
        // instead of wasting every turn on a swallow that cannot fit.
        if ((ally.hunger || 0) >= 45 && digestible && enemies.length && !enemies.some(canSwallow)) {
            candidates.push({
                action: 'digest',
                target: digestible,
                subAction: 'digest',
                container: 'stomach',
                containedIndex: Math.max(0, (ally.stomach || []).indexOf(digestible)),
                command: null
            });
        }
        for (const target of allies) {
            if (target.CPun < target.MPun) add('feed', target, 'heal');
        }
        for (const target of corpses) add('scavenge', target);
        return candidates;
    },

    score(app, ally, candidate, behavior) {
        const { duty, stance } = behavior;
        const target = candidate.target;
        const healthRatio = Number(ally.CPun || 0) / Math.max(1, Number(ally.MPun || 1));
        const hunger = Number(ally.hunger || 0);
        let score = 0;
        const base = {
            fight: 36,
            flirt: 22,
            fuck: 20,
            feast: 18,
            digest: 64,
            feed: 28,
            scavenge: 15,
            advance: 48,
            hold: 8
        };
        score += base[candidate.action] || 0;

        if (stance === 'aggressive') {
            if (candidate.action === 'fight') score += 34;
            if (candidate.action === 'hold' || candidate.action === 'feed') score -= 14;
        } else if (stance === 'defensive') {
            if (candidate.action === 'feed') score += 30;
            if (candidate.action === 'fight') score += healthRatio > 0.55 ? 6 : -22;
            if (candidate.action === 'hold') score += healthRatio < 0.45 ? 18 : 4;
        } else if (stance === 'passive') {
            if (candidate.action === 'flirt' || candidate.action === 'fuck') score += 8;
            if (candidate.action === 'feed') score += 24;
            if (candidate.action === 'fight') score -= 35;
            if (candidate.action === 'hold') score += 42;
        } else if (candidate.action === 'fight' || candidate.action === 'feed') {
            score += 10;
        }

        if (duty === 'guard') {
            if (candidate.action === 'fight') {
                const threat = Number(target?.Figh || 0);
                score += 18 + Math.min(20, threat);
            }
            if (candidate.action === 'feed') score += 8;
            if (candidate.action === 'scavenge') score -= 15;
        } else if (duty === 'scout') {
            if (candidate.action === 'flirt') score += 15;
            if (candidate.action === 'fight' && target) {
                score += Math.max(0, 14 - Number(target.Figh || 0) * 0.25);
            }
            if (candidate.action === 'hold') score += healthRatio < 0.5 ? 12 : 0;
        } else if (duty === 'support') {
            if (candidate.action === 'feed' && target) {
                const missingRatio = 1 - Number(target.CPun || 0) / Math.max(1, Number(target.MPun || 1));
                score += 35 + missingRatio * 45;
            }
            if (candidate.action === 'fight') score -= 8;
        } else if (duty === 'gatherer') {
            if (candidate.action === 'scavenge') score += 45;
            if (candidate.action === 'feast') score += 14;
            if (candidate.action === 'fight') score -= 5;
        }

        if (candidate.action === 'feast') {
            score += hunger * 0.75;
            const preyRatio = Number(target?.CPun || 0) / Math.max(1, Number(target?.MPun || 1));
            score += (1 - preyRatio) * 24;
        }
        if (candidate.action === 'digest') {
            score += hunger * 0.75;
            if (Number(app._containerUsed?.(ally, 'stomach') || 0) >= Number(app._containerCapacity?.(ally, 'stomach') || Infinity)) score += 24;
        }
        if (candidate.action === 'scavenge') {
            score += hunger * 0.55;
            if (hunger > 60) score += (hunger - 60) * 2.5;
        }
        if (candidate.action === 'feed' && target === ally) score -= 4;
        if (candidate.action === 'fuck') {
            score += Math.max(0, Number(ally.CPle || 0) / Math.max(1, Number(ally.MPle || 1)) * 40 - 18);
            if (ally.dumbAI && Number(ally.CPle || 0) >= Number(ally.MPle || 1) * 0.8) score += 80;
        }
        if (candidate.action === 'hold' && healthRatio < 0.25) score += 28;
        score += this.stableTie(app, ally, candidate);
        return score;
    },

    ranked(app, ally) {
        const behavior = this.get(app, ally);
        return this.candidates(app, ally)
            .map(candidate => ({ ...candidate, score: this.score(app, ally, candidate, behavior) }))
            .sort((left, right) => right.score - left.score);
    },

    providerChoice(app, ally, ranked) {
        const controller = app.companionDecisionProvider;
        if (!controller || typeof controller.chooseAction !== 'function') {
            return { choice: null, reason: 'provider-unavailable' };
        }
        try {
            const requested = controller.chooseAction({
                actor: ally,
                behavior: { ...this.get(app, ally) },
                candidates: ranked.map(entry => ({
                    action: entry.action,
                    subAction: entry.subAction,
                    targetId: entry.target?.id || entry.target?.name || null,
                    score: entry.score
                }))
            });
            if (!requested || typeof requested.then === 'function') {
                return { choice: null, reason: requested ? 'provider-async-unsupported' : 'provider-empty' };
            }
            const targetId = String(requested.targetId || '');
            const choice = ranked.find(entry => entry.action === requested.action
                && String(entry.subAction || '') === String(requested.subAction || '')
                && String(entry.target?.id || entry.target?.name || '') === targetId);
            return choice ? { choice, reason: null } : { choice: null, reason: 'provider-illegal-choice' };
        } catch (error) {
            return { choice: null, reason: 'provider-error', error };
        }
    },

    crisisChoice(app, ally, ranked, choice) {
        if (!choice || choice.action !== 'hold') return null;
        const playerUnavailable = !app.player
            || app.player.CPun <= 0
            || app.player.knockedOut
            || app.player.fledCombat;
        if (!playerUnavailable) return null;
        const manualActors = typeof YAW_COMBAT_ACTOR_STATE !== 'undefined'
            ? YAW_COMBAT_ACTOR_STATE.manualActors(app)
            : (app.party || []).filter(unit => unit
                && unit.CPun > 0
                && !unit.knockedOut
                && !unit.fledCombat
                && (unit === app.player || app._getCompanionControl?.(unit) === 'manual'));
        if (manualActors.length > 0) return null;
        return ranked.find(entry => entry.action !== 'hold') || null;
    },

    choose(app, ally) {
        const behavior = this.get(app, ally);
        const ranked = this.ranked(app, ally);
        if (behavior.control === 'provider') {
            const provider = this.providerChoice(app, ally, ranked);
            const selected = provider.choice || ranked[0];
            const crisis = this.crisisChoice(app, ally, ranked, selected);
            if (crisis) return { choice: crisis, behavior, fallbackReason: 'combat-crisis' };
            if (provider.choice) return { choice: provider.choice, behavior, fallbackReason: null };
            return { choice: selected, behavior, fallbackReason: provider.reason };
        }
        const selected = ranked[0];
        const crisis = this.crisisChoice(app, ally, ranked, selected);
        return { choice: crisis || selected, behavior, fallbackReason: crisis ? 'combat-crisis' : null };
    },

    preferenceSummary(app, choice) {
        const action = choice?.action === 'hold'
            ? app._label('party.behavior.hold', 'hold position')
            : choice?.action === 'advance'
                ? app._label('action.advance', 'advance').toLowerCase()
                : choice?.action === 'digest'
                    ? app._label('containment.digest', 'digest').toLowerCase()
                    : app._uiLabel?.(choice?.action || 'action').toLowerCase();
        const target = choice?.target?.name
            ? app._label('party.behavior.targetSuffix', ' on {target}', { target: choice.target.name })
            : '';
        return { action, target };
    },

    offerPausedPreference(app, ally) {
        if (!this.isPaused(app, ally) || this.currentTurnUnit(app) !== ally || app.pendingConfirm) return false;
        const turnKey = `${Number(app.combatState?.round || 0)}:${Number(app.combatState?.currentTurn || 0)}:${app._unitSelectionId?.(ally) || ally.id || ally.name || 'companion'}`;
        const offered = app._pausedCompanionPreferenceTurn;
        if (offered?.combatState === app.combatState && offered.key === turnKey) return false;
        const result = this.choose(app, ally);
        const choice = result.choice || { action: 'hold', target: null, command: null };
        const summary = this.preferenceSummary(app, choice);
        app._pausedCompanionPreferenceTurn = { combatState: app.combatState, key: turnKey };
        return app.showConfirmDialog?.({
            title: app._label('party.autonomyPreferenceTitle', "{name}'s preference", { name: ally.name }),
            message: app._label('party.autonomyPreferencePrompt', '{name} would prefer to {action}{target}. Follow that preference or choose another action?', {
                name: ally.name,
                action: summary.action,
                target: summary.target
            }),
            confirmLabel: app._label('party.autonomyPreferenceFollow', 'Follow preference'),
            cancelLabel: app._label('party.autonomyPreferenceChoose', 'Choose another action'),
            onConfirm: () => {
                if (!this.isPaused(app, ally) || this.currentTurnUnit(app) !== ally) return false;
                return this.executeChoice(app, ally, { ...result, choice });
            },
            onCancel: () => false
        }) ?? false;
    },

    evidence(app, ally, choice, behavior, fallbackReason = null) {
        const duty = app._companionDutyLabel?.(behavior.duty) || this.DUTIES[behavior.duty]?.label || behavior.duty;
        const stance = app._companionStanceLabel?.(behavior.stance) || this.STANCES[behavior.stance]?.label || behavior.stance;
        const action = choice?.action === 'hold'
            ? app._label('party.behavior.hold', 'hold position')
            : choice?.action === 'advance'
                ? app._label('action.advance', 'advance')
            : choice?.action === 'digest'
                ? app._label('containment.digest', 'digest').toLowerCase()
                : app._uiLabel?.(choice?.action || 'action').toLowerCase();
        const target = choice?.target?.name
            ? app._label('party.behavior.targetSuffix', ' on {target}', { target: choice.target.name })
            : '';
        const fallback = fallbackReason === 'combat-crisis'
            ? ` ${app._label('party.behavior.crisisOverride', 'With no one else able to direct the fight, they abandon their usual restraint.')}`
            : (fallbackReason
                ? ` ${app._label('party.behavior.providerFallback', 'AI control was unavailable, so deterministic autonomy took over.')}`
                : '');
        const text = app._label('party.behavior.choice', '{name} weighs their {duty} duty with a {stance} stance and chooses to {action}{target}.', {
            name: ally.name,
            duty: duty.toLowerCase(),
            stance: stance.toLowerCase(),
            action,
            target
        }) + fallback;
        app._pushLog?.(text, 'combat', {
            actor: ally,
            targetId: choice?.target?.id || choice?.target?.name,
            targetName: choice?.target?.name,
            action: choice?.action,
            phase: 'companion-decision',
            duty: behavior.duty,
            stance: behavior.stance,
            control: behavior.control,
            fallbackReason
        });
        app.emitSceneBeat?.({
            mode: 'combat',
            actors: [ally],
            targets: [choice?.target].filter(Boolean),
            action: choice?.action || 'hold',
            tags: ['companion-behavior', behavior.duty, behavior.stance, behavior.control],
            source: 'companion-behavior'
        }, text, {
            mode: 'combat',
            resultKind: 'decision',
            importance: 'routine',
            tags: ['companion-behavior', behavior.duty, behavior.stance, behavior.control],
            source: 'companion-behavior'
        });
        return text;
    },

    executeChoice(app, ally, result = {}) {
        const choice = result.choice || { action: 'hold', target: null, command: null };
        const behavior = result.behavior || this.get(app, ally);
        this.evidence(app, ally, choice, behavior, result.fallbackReason || null);
        app.renderLog?.();
        if (choice.action === 'advance') {
            if (typeof app.moveCombatRow === 'function') {
                app.moveCombatRow();
                return true;
            }
            ally.combatRow = 'front';
            app.nextTurn?.();
            return true;
        }
        if (choice.action === 'hold' || !choice.command) {
            if (choice.action === 'digest') {
                const partyIndex = (app.party || []).indexOf(ally);
                const digested = partyIndex >= 0
                    && app.digestContained?.('party', partyIndex, choice.container || 'stomach', Number(choice.containedIndex || 0));
                if (digested) return true;
                const text = app._label('party.behavior.legalFallback', '{name} cannot complete that choice and holds position instead.', { name: ally.name });
                app._pushLog?.(text, 'combat', { actor: ally, action: 'digest', phase: 'companion-fallback' });
                app.renderLog?.();
                app.nextTurn?.();
                return true;
            }
            app._pushLog?.(
                app._label('combat.allyHolds', '{name} holds position.', { name: ally.name }),
                'combat',
                { actor: ally, action: 'hold', phase: 'companion-action' }
            );
            app.renderLog?.();
            app.nextTurn();
            return true;
        }
        const dispatched = app._dispatchInteractionCommand(choice.command);
        if (dispatched === false) {
            const text = app._label('party.behavior.legalFallback', '{name} cannot complete that choice and holds position instead.', { name: ally.name });
            app._pushLog?.(text, 'combat', { actor: ally, action: choice.action, phase: 'companion-fallback' });
            app.renderLog?.();
            app.nextTurn();
        }
        return true;
    },

    tileReactionKey(app, tile, duty, interior = false) {
        const origin = interior && app.activeInterior?.origin
            ? `${app.activeInterior.origin.x},${app.activeInterior.origin.y}:`
            : '';
        const x = Number(tile?.x ?? (interior ? app.interiorLocation?.x : app.location?.x) ?? 0);
        const y = Number(tile?.y ?? (interior ? app.interiorLocation?.y : app.location?.y) ?? 0);
        return `${Number(app.dayCount || 0)}:${interior ? 'interior' : 'world'}:${origin}${x},${y}:${duty}`;
    },

    tileReactionFor(app, unit, tile, context = {}) {
        const behavior = this.get(app, unit);
        if (behavior.control === 'manual' || behavior.autonomyPaused) return null;
        const hostile = (app.creatures || []).some(creature => creature
            && creature.disposition === app.DISPOSITION?.ENEMY
            && Number(creature.CPun || 0) > 0
            && !creature.fledCombat);
        const wounded = (app.party || []).some(ally => ally
            && Number(ally.CPun || 0) > 0
            && Number(ally.CPun || 0) < Number(ally.MPun || 0) * 0.7);
        const searchable = Boolean(app._canSearchHere?.(tile));
        const applicable = {
            guard: hostile,
            scout: context.wasExplored === false,
            support: wounded,
            gatherer: searchable
        };
        if (!applicable[behavior.duty]) return null;
        const key = this.tileReactionKey(app, tile, behavior.duty, context.interior === true);
        const history = Array.isArray(unit.companionReactionHistory)
            ? unit.companionReactionHistory
            : [];
        return history.includes(key) ? null : { unit, behavior, key };
    },

    reactToTile(app, tile, context = {}) {
        if (!app || !tile || app.combatState?.active
            || (typeof YAW_RECOVERY_MODES !== 'undefined' && YAW_RECOVERY_MODES?.isJourney?.(app))) return null;
        const reaction = (app.party || [])
            .filter(unit => unit && unit !== app.player && !unit.mc && Number(unit.CPun || 0) > 0)
            .map(unit => this.tileReactionFor(app, unit, tile, context))
            .find(Boolean);
        if (!reaction) return null;
        const { unit, behavior, key } = reaction;
        unit.companionReactionHistory = [
            ...(Array.isArray(unit.companionReactionHistory) ? unit.companionReactionHistory : []),
            key
        ].slice(-12);
        const text = app._label(`party.behavior.tile.${behavior.duty}`, {
            guard: '{name} watches the approaches for danger.',
            scout: '{name} studies the unfamiliar route ahead.',
            support: '{name} checks on the party’s wounded.',
            gatherer: '{name} notices signs that this place may be worth searching.'
        }[behavior.duty], { name: unit.name });
        app._pushLog?.(text, 'discovery', {
            actor: unit,
            action: 'observe',
            phase: 'companion-tile-reaction',
            duty: behavior.duty,
            stance: behavior.stance,
            control: behavior.control,
            interior: context.interior === true
        });
        app._addTileEvent?.(text, 'discovery');
        app.emitSceneBeat?.({
            mode: 'adventure',
            actors: [unit],
            targets: [],
            action: 'observe',
            tags: ['companion-behavior', 'tile-reaction', behavior.duty, behavior.stance],
            source: 'companion-behavior'
        }, text, {
            mode: 'adventure',
            resultKind: 'observation',
            importance: 'routine',
            tags: ['companion-behavior', 'tile-reaction', behavior.duty, behavior.stance],
            source: 'companion-behavior'
        });
        return reaction;
    },

    takeTurn(app, ally) {
        if (this.isPaused(app, ally)) return false;
        const committedGroup = typeof YAW_COMBAT_SYNC !== 'undefined'
            ? YAW_COMBAT_SYNC.pendingParticipantAction(app, ally)
            : null;
        if (committedGroup) {
            if (app.combatState?.currentTurn === committedGroup.resolveAtIndex) {
                app._resolveSyncAction?.(committedGroup);
            } else {
                // Do not let an autonomous controller spend a participant before
                // the group strategy reaches its planned resolution point.
                app.nextTurn?.();
            }
            return true;
        }
        const result = this.choose(app, ally);
        return this.executeChoice(app, ally, result);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMPANION_BEHAVIOR = YAW_COMPANION_BEHAVIOR;
}
