/**
 * YOU ARE WILD COMPANION BEHAVIOR V2
 * Separates what a companion contributes (Duty), how they weigh choices
 * (Stance), and who chooses their action (Control).
 */

const YAW_COMPANION_BEHAVIOR = {
    VERSION: 2,
    BOND_VERSION: 1,
    BOND_EVENT_LIMIT: 48,

    BOND_EVENTS: {
        'recruitment.legacy': { weight: 16 },
        'recruitment.submitted': { weight: 4 },
        'recruitment.invited': { weight: 12 },
        'recruitment.befriended': { weight: 18 },
        'recruitment.bonded': { weight: 26 },
        'care.feed': { weight: 3 },
        'care.talk': { weight: 2 },
        'care.play': { weight: 3 },
        'agency.request.complied': { weight: 0 },
        'agency.request.refused': { weight: -1 }
    },

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

    bondEventTypeForRecruitment(continuity = null) {
        const kind = String(continuity?.kind || 'legacy').toLowerCase();
        return this.BOND_EVENTS[`recruitment.${kind}`] ? `recruitment.${kind}` : 'recruitment.legacy';
    },

    normalizeBond(app, unit, options = {}) {
        if (!unit) return null;
        if (unit === app?.player || unit.mc) {
            if (Object.prototype.hasOwnProperty.call(unit, 'companionBond')) delete unit.companionBond;
            return null;
        }
        const raw = unit.companionBond && typeof unit.companionBond === 'object'
            ? unit.companionBond
            : {};
        const normalizedEvents = (Array.isArray(raw.events) ? raw.events : [])
            .map((event, index) => {
                const type = String(event?.type || '');
                const definition = this.BOND_EVENTS[type];
                if (!definition) return null;
                return {
                    seq: Math.max(1, Math.floor(Number(event.seq) || index + 1)),
                    type,
                    weight: definition.weight,
                    day: Math.max(0, Math.floor(Number(event.day) || 0)),
                    hour: Math.max(0, Math.min(23, Math.floor(Number(event.hour) || 0))),
                    source: String(event.source || type).slice(0, 80),
                    by: event.by == null ? null : String(event.by).slice(0, 120),
                    requestKey: event.requestKey == null ? null : String(event.requestKey).slice(0, 180),
                    dedupeKey: event.dedupeKey == null ? null : String(event.dedupeKey).slice(0, 180)
                };
            })
            .filter(Boolean)
            .sort((left, right) => left.seq - right.seq);
        const events = normalizedEvents.slice(-this.BOND_EVENT_LIMIT);
        const continuity = options.recruitmentContinuity
            || unit.companionBehavior?.recruitmentContinuity
            || unit.recruitmentContinuity
            || null;
        if (events.length === 0 && Math.max(0, Number(raw.prunedCount) || 0) === 0) {
            const type = this.bondEventTypeForRecruitment(continuity);
            const definition = this.BOND_EVENTS[type];
            events.push({
                seq: 1,
                type,
                weight: definition.weight,
                day: Math.max(0, Math.floor(Number(continuity?.day ?? app?.dayCount ?? 0) || 0)),
                hour: Math.max(0, Math.min(23, Math.floor(Number(continuity?.hour ?? app?.timeHour ?? 0) || 0))),
                source: String(continuity?.source || 'legacy-migration').slice(0, 80),
                by: continuity?.by == null
                    ? (app?.player ? String(app._unitSelectionId?.(app.player) || app.player.id || app.player.name || 'player').slice(0, 120) : null)
                    : String(continuity.by).slice(0, 120),
                requestKey: null,
                dedupeKey: `recruitment:${type}`
            });
        }
        const maxSeq = events.reduce((highest, event) => Math.max(highest, event.seq), 0);
        unit.companionBond = {
            version: this.BOND_VERSION,
            nextSeq: Math.max(maxSeq + 1, Math.floor(Number(raw.nextSeq) || 1)),
            carriedWeight: Math.max(-100, Math.min(100, Math.floor(Number(raw.carriedWeight) || 0))),
            prunedCount: Math.max(0, Math.floor(Number(raw.prunedCount) || 0)),
            events
        };
        return unit.companionBond;
    },

    bondProjection(app, unit) {
        const bond = this.normalizeBond(app, unit);
        if (!bond) return null;
        const eventWeight = bond.events.reduce((total, event) => total + Number(event.weight || 0), 0);
        const score = Math.max(-100, Math.min(100, Number(bond.carriedWeight || 0) + eventWeight));
        const tier = score >= 24 ? 'trusted' : (score >= 14 ? 'steady' : (score >= 6 ? 'tentative' : 'strained'));
        return { version: this.BOND_VERSION, score, tier, eventCount: bond.prunedCount + bond.events.length };
    },

    recordBondEvent(app, unit, type, options = {}) {
        const definition = this.BOND_EVENTS[type];
        const bond = this.normalizeBond(app, unit);
        if (!definition || !bond) return null;
        const dedupeKey = options.dedupeKey == null ? null : String(options.dedupeKey).slice(0, 180);
        if (dedupeKey && bond.events.some(event => event.dedupeKey === dedupeKey)) return null;
        const event = {
            seq: bond.nextSeq++,
            type,
            weight: definition.weight,
            day: Math.max(0, Math.floor(Number(options.day ?? app?.dayCount ?? 0) || 0)),
            hour: Math.max(0, Math.min(23, Math.floor(Number(options.hour ?? app?.timeHour ?? 0) || 0))),
            source: String(options.source || type).slice(0, 80),
            by: options.by == null
                ? (app?.player ? String(app._unitSelectionId?.(app.player) || app.player.id || app.player.name || 'player').slice(0, 120) : null)
                : String(options.by).slice(0, 120),
            requestKey: options.requestKey == null ? null : String(options.requestKey).slice(0, 180),
            dedupeKey
        };
        bond.events.push(event);
        while (bond.events.length > this.BOND_EVENT_LIMIT) {
            const removed = bond.events.shift();
            bond.carriedWeight = Math.max(-100, Math.min(100, bond.carriedWeight + Number(removed?.weight || 0)));
            bond.prunedCount++;
        }
        app?.markAutoSaveDirty?.(['party', 'quests'], `companion-bond:${type}`);
        return event;
    },

    recordCareFromInteraction(app, { actor, target, action, before = {}, source = 'interaction' } = {}) {
        if (!app || !actor || !target || actor !== app.player || target === app.player || !app.party?.includes(target)) return null;
        const conditionGain = Math.max(0, Number(target.CPun || 0) - Number(before.CPun ?? target.CPun ?? 0));
        const spiritGain = Math.max(0, Number(target.CPle || 0) - Number(before.CPle ?? target.CPle ?? 0));
        const type = action === 'feed' && conditionGain > 0
            ? 'care.feed'
            : (action === 'flirt' && spiritGain > 0
                ? 'care.talk'
                : (action === 'fuck' && spiritGain > 0 ? 'care.play' : null));
        if (!type) return null;
        const targetId = app._unitSelectionId?.(target) || target.id || target.name || 'companion';
        const day = Math.max(0, Math.floor(Number(app.dayCount) || 0));
        return this.recordBondEvent(app, target, type, {
            source,
            dedupeKey: `${day}:${type}:${targetId}`
        });
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
        this.normalizeBond(app, unit, { recruitmentContinuity: continuity });
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
        target.companionBond = null;
        this.normalizeBond(app, target, { recruitmentContinuity: continuity });
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
            if (crisis) return { choice: crisis, behavior, fallbackReason: 'combat-crisis', rankedChoices: ranked };
            if (provider.choice) return { choice: provider.choice, behavior, fallbackReason: null, rankedChoices: ranked };
            return { choice: selected, behavior, fallbackReason: provider.reason, rankedChoices: ranked };
        }
        const selected = ranked[0];
        const crisis = this.crisisChoice(app, ally, ranked, selected);
        return { choice: crisis || selected, behavior, fallbackReason: crisis ? 'combat-crisis' : null, rankedChoices: ranked };
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

    choiceKey(app, choice) {
        const targetId = choice?.target
            ? String(app._unitSelectionId?.(choice.target) || choice.target.id || choice.target.name || '')
            : '';
        return `${choice?.action || 'hold'}:${choice?.subAction || ''}:${targetId}`;
    },

    beginIntentTransaction(app, ally, result = {}) {
        if (!app?.combatState?.active || !ally) return null;
        const turnKey = `${Number(app.combatState.round || 0)}:${Number(app.combatState.currentTurn || 0)}:${app._unitSelectionId?.(ally) || ally.id || ally.name || 'companion'}`;
        const existing = app.combatState.companionIntentTransaction;
        if (existing?.status === 'pending' && existing.turnKey === turnKey) return existing;
        const primary = result.choice || { action: 'hold', target: null, command: null };
        const primaryKey = this.choiceKey(app, primary);
        const alternatives = (Array.isArray(result.rankedChoices) ? result.rankedChoices : [])
            .filter(choice => this.choiceKey(app, choice) !== primaryKey)
            .slice(0, 3);
        const transaction = {
            version: 1,
            turnKey,
            actor: ally,
            behavior: result.behavior || this.get(app, ally),
            primary,
            alternatives,
            fallbackReason: result.fallbackReason || null,
            interventionUsed: false,
            fallbackEvaluated: false,
            status: 'pending'
        };
        app.combatState.companionIntentTransaction = transaction;
        const reservation = app.combatState.playerTurnReservation;
        if (reservation?.status === 'reserved' && reservation.sourceTurnKey === turnKey) {
            transaction.interventionUsed = true;
            transaction.requestKey = String(reservation.requestKey || '');
            transaction.requestOutcome = reservation.complied === true ? 'complied' : 'refused';
            if (reservation.complied === true) {
                transaction.requestedChoice = alternatives.find(choice => this.choiceKey(app, choice) === transaction.requestKey) || null;
                transaction.requestedChoiceMissing = !transaction.requestedChoice;
            }
        }
        return transaction;
    },

    intentPreview(app, ally, result = {}) {
        if (!app?.combatState?.active || !ally) return null;
        const transaction = result.primary ? result : this.beginIntentTransaction(app, ally, result);
        if (!transaction) return null;
        const choice = transaction.requestedChoice || transaction.primary;
        const behavior = transaction.behavior;
        const summary = this.preferenceSummary(app, choice);
        const duty = app._companionDutyLabel?.(behavior.duty) || this.DUTIES[behavior.duty]?.label || behavior.duty;
        const stance = app._companionStanceLabel?.(behavior.stance) || this.STANCES[behavior.stance]?.label || behavior.stance;
        const text = app._label('party.agency.intentPreview', '{name} intends to {action}{target}.', {
            name: ally.name,
            action: summary.action,
            target: summary.target
        });
        const reason = transaction.requestedChoice
            ? app._label('party.agency.intentRedirectedReason', 'Accepted request · Bond: {tier}', {
                tier: this.bondTierLabel(app, this.bondProjection(app, ally)?.tier)
            })
            : (transaction.requestedChoiceMissing
                ? app._label('party.agency.intentStaleReason', 'Accepted request is no longer legal · original plan restored')
                : app._label('party.agency.intentReason', '{duty} duty · {stance} stance', { duty, stance }));
        const preview = {
            version: 1,
            turnKey: transaction.turnKey,
            actorId: String(app._unitSelectionId?.(ally) || ally.id || ally.name || 'companion'),
            actorName: String(ally.name || app._label('ui.ally', 'Ally')),
            action: String(choice.action || 'hold'),
            targetId: choice.target ? String(app._unitSelectionId?.(choice.target) || choice.target.id || choice.target.name || '') : '',
            targetName: String(choice.target?.name || ''),
            text,
            reason,
            bond: this.bondProjection(app, ally)
        };
        app.combatState.companionIntentPreview = preview;
        app.renderCombatSceneForTurn?.(ally);
        app.renderDesktopCombatComposer?.(ally);
        app.renderMobileCombatToolbelt?.();
        return preview;
    },

    interventionDifficulty(transaction, choice, index = 0) {
        const preferenceGap = Math.max(0, Number(transaction?.primary?.score || 0) - Number(choice?.score || 0));
        return Math.max(6, Math.min(30, 6 + Math.max(0, Number(index) || 0) * 4 + Math.min(12, Math.floor(preferenceGap / 8))));
    },

    interventionState(app) {
        const transaction = app?.combatState?.companionIntentTransaction;
        const actor = transaction?.actor || null;
        const reservation = app?.combatState?.playerTurnReservation || null;
        const playerAvailable = Boolean(app?.player
            && Number(app.player.CPun || 0) > 0
            && !app.player.knockedOut
            && !app.player.fledCombat);
        let reason = '';
        if (!transaction || transaction.status !== 'pending' || !actor || actor === app?.player || !app?.party?.includes(actor)) reason = 'no-intent';
        else if (!this.isHeld(app)) reason = 'pause-first';
        else if (transaction.interventionUsed) reason = 'already-requested';
        else if (reservation?.status === 'reserved') reason = 'turn-reserved';
        else if (!playerAvailable) reason = 'player-unavailable';
        else if (!transaction.alternatives.length) reason = 'no-alternatives';
        return {
            available: !reason,
            reason,
            transaction,
            actor,
            reservation,
            bond: actor ? this.bondProjection(app, actor) : null
        };
    },

    isHeld(app) {
        return typeof YAW_COMBAT_PACING !== 'undefined'
            ? YAW_COMBAT_PACING.isHeld(app)
            : Boolean(app?.combatState?.presentationHeld);
    },

    bondTierLabel(app, tier = 'tentative') {
        const fallbacks = { strained: 'Strained', tentative: 'Tentative', steady: 'Steady', trusted: 'Trusted' };
        return app._label(`party.bond.tier.${tier}`, fallbacks[tier] || fallbacks.tentative);
    },

    interventionControls(app, { compact = false } = {}) {
        const state = this.interventionState(app);
        if (!state.transaction || !state.actor || state.reason === 'no-intent') return '';
        const bondLabel = this.bondTierLabel(app, state.bond?.tier);
        const heading = app._label('party.agency.suggestHeading', 'Suggest another action');
        const explanation = state.reason === 'pause-first'
            ? app._label('party.agency.suggestPauseFirst', 'Pause auto to make one suggestion before this intent commits.')
            : state.reason === 'turn-reserved'
                ? app._label('party.agency.suggestReserved', 'Your next ordinary turn is already reserved by an earlier request.')
                : state.reason === 'already-requested'
                    ? app._label('party.agency.suggestUsed', 'You have already made your one request for this intent.')
                    : state.reason === 'player-unavailable'
                        ? app._label('party.agency.suggestUnavailable', 'You cannot make a combat request while unable to act.')
                        : state.reason === 'no-alternatives'
                            ? app._label('party.agency.suggestNoAlternatives', 'No other legal action is available to suggest.')
                            : app._label('party.agency.suggestCost', 'One request reserves and consumes your next ordinary turn, even if the companion refuses.');
        const bond = app._label('party.agency.bondSummary', 'Bond: {tier}', { tier: bondLabel });
        const buttons = state.available
            ? state.transaction.alternatives.map((choice, index) => {
                const summary = this.preferenceSummary(app, choice);
                const label = app._label('party.agency.askAction', 'Ask: {action}{target}', {
                    action: summary.action,
                    target: summary.target
                });
                const title = app._label('party.agency.askActionTitle', 'Ask {name} to {action}{target}; this reserves your next ordinary turn.', {
                    name: state.actor.name,
                    action: summary.action,
                    target: summary.target
                });
                return `<button type="button" class="action-btn compact-secondary" data-command-surface="companion-intervention" data-command-mode="combat" data-command-control="request-companion-intervention" data-intervention-index="${index}" title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}" onclick="event.stopPropagation();App.requestCompanionIntervention(${index})">${app._escapeHtml(label)}</button>`;
            }).join('')
            : '';
        return `<div class="companion-intervention-controls${compact ? ' compact' : ''}" data-intervention-state="${app._escapeHtml(state.reason || 'available')}" role="group" aria-label="${app._escapeHtml(heading)}"><strong>${app._escapeHtml(heading)}</strong><span>${app._escapeHtml(bond)}</span><small>${app._escapeHtml(explanation)}</small>${buttons ? `<div class="companion-intervention-actions">${buttons}</div>` : ''}</div>`;
    },

    requestIntervention(app, alternativeIndex) {
        const state = this.interventionState(app);
        const index = Math.max(0, Math.floor(Number(alternativeIndex) || 0));
        const choice = state.transaction?.alternatives?.[index] || null;
        if (!state.available || !choice) return false;
        const transaction = state.transaction;
        const requestKey = this.choiceKey(app, choice);
        const difficulty = this.interventionDifficulty(transaction, choice, index);
        const bond = state.bond || { score: 0, tier: 'strained' };
        const complies = bond.score >= difficulty;
        transaction.interventionUsed = true;
        transaction.requestKey = requestKey;
        transaction.requestOutcome = complies ? 'complied' : 'refused';
        transaction.requestDifficulty = difficulty;
        transaction.requestedChoice = complies ? choice : null;
        const playerId = String(app._unitSelectionId?.(app.player) || app.player.id || app.player.name || 'player');
        const actorId = String(app._unitSelectionId?.(state.actor) || state.actor.id || state.actor.name || 'companion');
        app.combatState.playerTurnReservation = {
            version: 1,
            status: 'reserved',
            playerId,
            companionId: actorId,
            companionName: String(state.actor.name || ''),
            sourceTurnKey: transaction.turnKey,
            requestKey,
            requestedAction: String(choice.action || 'hold'),
            requestedTargetId: choice.target ? String(app._unitSelectionId?.(choice.target) || choice.target.id || choice.target.name || '') : '',
            requestedTargetName: String(choice.target?.name || ''),
            complied: complies,
            createdRound: Math.max(1, Number(app.combatState.round) || 1),
            createdTurn: Math.max(0, Number(app.combatState.currentTurn) || 0)
        };
        this.recordBondEvent(app, state.actor, complies ? 'agency.request.complied' : 'agency.request.refused', {
            source: 'combat-agency-v1',
            requestKey,
            dedupeKey: `agency:${transaction.turnKey}`
        });
        const summary = this.preferenceSummary(app, choice);
        const requestText = app._label('party.agency.requestCost', 'You ask {name} to {action}{target}, committing your next ordinary turn to the request.', {
            name: state.actor.name,
            action: summary.action,
            target: summary.target
        });
        const outcomeText = complies
            ? app._label('party.agency.complied', '{name} trusts your direction and changes course.', { name: state.actor.name })
            : app._label('party.agency.refused', '{name} hears you but keeps their own plan. Your next turn remains committed.', { name: state.actor.name });
        const text = `${requestText} ${outcomeText}`;
        app._pushLog?.(text, 'combat', {
            actor: state.actor,
            action: choice.action,
            phase: complies ? 'companion-compliance' : 'companion-refusal',
            requestKey,
            bondScore: bond.score,
            difficulty,
            playerTurnReserved: true
        });
        app.emitSceneBeat?.({
            mode: 'combat',
            actors: [app.player, state.actor].filter(Boolean),
            targets: [choice.target].filter(Boolean),
            action: 'request',
            tags: ['combat-agency', complies ? 'complied' : 'refused', 'player-turn-reserved'],
            source: 'combat-agency-v1'
        }, text, {
            mode: 'combat',
            resultKind: complies ? 'decision' : 'resistance',
            importance: 'notable',
            tags: ['combat-agency', complies ? 'complied' : 'refused', 'player-turn-reserved'],
            source: 'combat-agency-v1'
        });
        if (complies) {
            const updated = this.preferenceSummary(app, choice);
            app.combatState.companionIntentPreview = {
                ...app.combatState.companionIntentPreview,
                action: String(choice.action || 'hold'),
                targetId: choice.target ? String(app._unitSelectionId?.(choice.target) || choice.target.id || choice.target.name || '') : '',
                targetName: String(choice.target?.name || ''),
                text: app._label('party.agency.intentRedirected', '{name} now intends to {action}{target}.', {
                    name: state.actor.name,
                    action: updated.action,
                    target: updated.target
                }),
                reason: app._label('party.agency.intentRedirectedReason', 'Accepted request · Bond: {tier}', {
                    tier: this.bondTierLabel(app, bond.tier)
                })
            };
        } else if (app.combatState.companionIntentPreview) {
            app.combatState.companionIntentPreview.reason = app._label('party.agency.intentRefusedReason', 'Request refused · Bond: {tier}', {
                tier: this.bondTierLabel(app, bond.tier)
            });
        }
        app.markAutoSaveDirty?.(['combat', 'party', 'quests', 'sceneFeed', 'activityLog'], 'combat-agency-request');
        app.autoSave?.({ delayMs: 0, reason: 'combat-agency-request' });
        app.renderLog?.();
        app.renderCombatSceneForTurn?.(state.actor);
        app.renderDesktopCombatComposer?.(state.actor);
        app.renderMobileCombatToolbelt?.();
        return { complies, difficulty, bondScore: bond.score, requestKey };
    },

    consumePlayerTurnReservation(app, unit) {
        const reservation = app?.combatState?.playerTurnReservation;
        if (!reservation || reservation.status !== 'reserved' || !unit || unit !== app.player) return false;
        const playerId = String(app._unitSelectionId?.(unit) || unit.id || unit.name || 'player');
        if (reservation.playerId && String(reservation.playerId) !== playerId) return false;
        const text = app._label('party.agency.turnConsumed', 'Your promised direction to {name} consumes this ordinary turn.', {
            name: reservation.companionName || app._label('ui.ally', 'your companion')
        });
        app.combatState.playerTurnReservation = null;
        app._pushLog?.(text, 'combat', {
            actor: unit,
            action: 'request-cost',
            phase: 'player-turn-reservation-consumed',
            companionId: reservation.companionId,
            requestKey: reservation.requestKey
        });
        app.emitSceneBeat?.({
            mode: 'combat',
            actors: [unit],
            action: 'request-cost',
            tags: ['combat-agency', 'player-turn-consumed'],
            source: 'combat-agency-v1'
        }, text, {
            mode: 'combat',
            resultKind: 'cost',
            importance: 'notable',
            tags: ['combat-agency', 'player-turn-consumed'],
            source: 'combat-agency-v1'
        });
        app.markAutoSaveDirty?.(['combat', 'sceneFeed', 'activityLog'], 'combat-agency-turn-consumed');
        app.autoSave?.({ delayMs: 0, reason: 'combat-agency-turn-consumed' });
        app.renderLog?.();
        app.nextTurn?.();
        return true;
    },

    choiceStillValid(app, choice) {
        if (!choice || ['hold', 'advance', 'digest'].includes(choice.action)) return true;
        if (!choice.command) return false;
        return app._validateInteractionCommand?.(choice.command)?.ok === true;
    },

    commitIntentTransaction(app, transaction) {
        const current = app?.combatState?.companionIntentTransaction;
        if (!transaction || current !== transaction || transaction.status !== 'pending') return false;
        transaction.status = 'committing';
        const acceptedRequestMissing = transaction.requestedChoiceMissing === true;
        if (acceptedRequestMissing) {
            transaction.fallbackEvaluated = true;
            const text = app._label('party.agency.requestStale', '{name} accepted your direction, but that action is no longer legal and they return to their original plan.', {
                name: transaction.actor.name
            });
            app._pushLog?.(text, 'combat', {
                actor: transaction.actor,
                action: transaction.primary?.action || 'hold',
                phase: 'companion-fallback'
            });
            app.renderLog?.();
        }
        let selected = transaction.requestedChoice || transaction.primary;
        if (!this.choiceStillValid(app, selected)) {
            transaction.fallbackEvaluated = true;
            const fallback = acceptedRequestMissing
                ? { action: 'hold', target: null, command: null }
                : (transaction.requestedChoice
                    ? transaction.primary
                    : (transaction.alternatives[0] || { action: 'hold', target: null, command: null }));
            const text = app._label(transaction.requestedChoice ? 'party.agency.requestStale' : 'party.agency.intentChanged', transaction.requestedChoice
                ? '{name} can no longer follow the accepted request and returns to their original intent.'
                : '{name} can no longer complete that intent and tries one fallback.', {
                name: transaction.actor.name
            });
            app._pushLog?.(text, 'combat', {
                actor: transaction.actor,
                action: selected?.action || 'hold',
                phase: 'companion-fallback'
            });
            app.renderLog?.();
            selected = this.choiceStillValid(app, fallback)
                ? fallback
                : { action: 'hold', target: null, command: null };
        }
        transaction.status = 'committed';
        app.combatState.lastCompanionIntentTransaction = {
            version: 1,
            turnKey: transaction.turnKey,
            actorId: String(app._unitSelectionId?.(transaction.actor) || transaction.actor.id || transaction.actor.name || 'companion'),
            primaryAction: String(transaction.primary?.action || 'hold'),
            committedAction: String(selected?.action || 'hold'),
            interventionUsed: transaction.interventionUsed === true,
            requestKey: transaction.requestKey || null,
            requestOutcome: transaction.requestOutcome || null,
            fallbackEvaluated: transaction.fallbackEvaluated === true
        };
        this.clearIntentPreview(app, transaction.turnKey);
        app.combatState.companionIntentTransaction = null;
        return this.executeChoice(app, transaction.actor, {
            choice: selected,
            behavior: transaction.behavior,
            fallbackReason: transaction.fallbackReason
        });
    },

    clearIntentPreview(app, turnKey = '') {
        const preview = app?.combatState?.companionIntentPreview;
        if (!preview || (turnKey && preview.turnKey !== turnKey)) return false;
        app.combatState.companionIntentPreview = null;
        app.renderCombatSceneForTurn?.(this.currentTurnUnit(app));
        app.renderDesktopCombatComposer?.(this.currentTurnUnit(app));
        app.renderMobileCombatToolbelt?.();
        return true;
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
        const currentPreview = app.combatState?.companionIntentPreview;
        const currentTurnKey = `${Number(app.combatState?.round || 0)}:${Number(app.combatState?.currentTurn || 0)}:${app._unitSelectionId?.(ally) || ally.id || ally.name || 'companion'}`;
        if (currentPreview?.turnKey === currentTurnKey && app.combatState?.presentationPending) {
            app.renderCombatSceneForTurn?.(ally);
            app.renderDesktopCombatComposer?.(ally);
            app.renderMobileCombatToolbelt?.();
            return true;
        }
        const result = this.choose(app, ally);
        const transaction = this.beginIntentTransaction(app, ally, result);
        const preview = this.intentPreview(app, ally, transaction);
        if (preview && typeof YAW_COMBAT_PACING !== 'undefined') {
            return YAW_COMBAT_PACING.schedule(app, () => {
                return this.commitIntentTransaction(app, transaction);
            }, preview.text);
        }
        if (preview) return this.commitIntentTransaction(app, transaction);
        return this.executeChoice(app, ally, result);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMPANION_BEHAVIOR = YAW_COMPANION_BEHAVIOR;
}
