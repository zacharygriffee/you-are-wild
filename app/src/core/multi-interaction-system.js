/**
 * YOU ARE WILD MULTI-INTERACTION SYSTEM
 * Opt-in action profiles for distributed multi-target effects and practice.
 */

const YAW_MULTI_INTERACTION = {
    PROFILES: {
        fight: {
            id: 'fight',
            practiceKey: 'fight',
            maxPracticeXp: 200,
            encounterPracticeCap: 12
        }
    },

    TIERS: [
        { id: 'novice', min: 0 },
        { id: 'practiced', min: 20 },
        { id: 'skilled', min: 60 },
        { id: 'expert', min: 120 },
        { id: 'master', min: 200 }
    ],

    clamp(value, min = 0, max = 1) {
        return Math.max(min, Math.min(max, Number(value) || 0));
    },

    profile(action) {
        return this.PROFILES[String(action || '').replace(/^sync_/, '')] || null;
    },

    normalizeUnit(unit) {
        if (!unit) return null;
        const root = unit.multiActionPractice && typeof unit.multiActionPractice === 'object'
            ? unit.multiActionPractice
            : {};
        const multi = root.multi && typeof root.multi === 'object' ? root.multi : {};
        for (const profile of Object.values(this.PROFILES)) {
            const raw = multi[profile.practiceKey];
            const entry = raw && typeof raw === 'object' ? raw : {};
            multi[profile.practiceKey] = {
                xp: Math.max(0, Number(entry.xp) || 0),
                commands: Math.max(0, Math.floor(Number(entry.commands) || 0)),
                contextKey: String(entry.contextKey || ''),
                contextGain: Math.max(0, Number(entry.contextGain) || 0)
            };
        }
        root.multi = multi;
        unit.multiActionPractice = root;
        return root;
    },

    entry(unit, action) {
        const profile = this.profile(action);
        if (!profile || !unit) return null;
        this.normalizeUnit(unit);
        return unit.multiActionPractice.multi[profile.practiceKey];
    },

    tierForXp(xp = 0) {
        let tier = this.TIERS[0];
        for (const candidate of this.TIERS) {
            if ((Number(xp) || 0) >= candidate.min) tier = candidate;
        }
        return tier;
    },

    tierLabel(app, tierId) {
        const fallbacks = {
            novice: 'Novice',
            practiced: 'Practiced',
            skilled: 'Skilled',
            expert: 'Expert',
            master: 'Master'
        };
        return app?._label?.(`multi.tier.${tierId}`, fallbacks[tierId] || tierId) || fallbacks[tierId] || tierId;
    },

    techniqueSpec(app, raw, action) {
        if (!raw) return null;
        if (typeof raw === 'string') return this.techniqueSpec(app, app?.MULTI_TARGET_TECHNIQUES?.[raw], action);
        if (typeof raw !== 'object') return null;
        const baseAction = String(action || '').replace(/^sync_/, '');
        if (raw[baseAction] && typeof raw[baseAction] === 'object') return { ...raw[baseAction] };
        if (Array.isArray(raw.actions) && !raw.actions.includes(baseAction)) return null;
        if (raw.action && raw.action !== baseAction) return null;
        return { ...raw };
    },

    techniqueSources(app, unit, action, targetCount) {
        if (!unit) return [];
        const rawSources = [];
        if (unit.multiTargetTechnique) rawSources.push(unit.multiTargetTechnique);
        if (Array.isArray(unit.multiTargetTechniques)) rawSources.push(...unit.multiTargetTechniques);
        if (unit.actionTechniques?.multiTarget) rawSources.push(unit.actionTechniques.multiTarget);
        for (const item of Object.values(unit.equipment || {})) {
            if (!item) continue;
            const def = app?._getItemDef?.(item) || app?.ITEMS?.[item.name] || {};
            if (item.multiTargetTechnique) rawSources.push(item.multiTargetTechnique);
            if (def.multiTargetTechnique) rawSources.push(def.multiTargetTechnique);
        }
        return rawSources.map(raw => this.techniqueSpec(app, raw, action)).filter(spec => {
            if (!spec) return false;
            const maxTargets = Number(spec.maxTargets);
            return !Number.isFinite(maxTargets) || targetCount <= maxTargets;
        });
    },

    effect(app, unit, action, targetCount = 1) {
        const profile = this.profile(action);
        const count = Math.max(1, Math.floor(Number(targetCount) || 1));
        if (!profile || count <= 1) {
            return { profiled: Boolean(profile), action: profile?.id || action, targetCount: count, scale: 1, percent: 100, mastery: 0, tier: 'novice', techniques: [] };
        }
        const entry = this.entry(unit, profile.id);
        const xp = Math.max(0, Number(entry?.xp) || 0);
        const mastery = this.clamp(xp / profile.maxPracticeXp);
        const techniques = this.techniqueSources(app, unit, profile.id, count);
        const area = techniques.some(spec => spec.area === true || spec.fullEffect === true);
        const recovery = techniques.reduce((sum, spec) => sum + Math.max(0, Number(spec.recovery) || 0), 0);
        const effectiveMastery = area ? 1 : this.clamp(mastery + recovery);
        const baseShare = 1 / count;
        const scale = this.clamp(baseShare + effectiveMastery * (1 - baseShare));
        return {
            profiled: true,
            action: profile.id,
            targetCount: count,
            scale,
            percent: Math.round(scale * 100),
            mastery,
            tier: this.tierForXp(xp).id,
            techniques: techniques.map(spec => spec.id || spec.label || (spec.area ? 'area' : 'technique'))
        };
    },

    scaleValue(value, effect, options = {}) {
        const raw = (Number(value) || 0) * (effect?.scale ?? 1);
        const rounded = options.round === 'round' ? Math.round(raw) : Math.floor(raw);
        return options.allowZero ? Math.max(0, rounded) : Math.max(1, rounded);
    },

    preview(app, action, actors = [], targets = []) {
        const profile = this.profile(action);
        const targetCount = (targets || []).filter(Boolean).length;
        const actorList = (actors || []).filter(Boolean);
        if (!profile || targetCount <= 1 || actorList.length === 0) return null;
        const effects = actorList.map(actor => this.effect(app, actor, profile.id, targetCount));
        const percents = effects.map(effect => effect.percent);
        const minPercent = Math.min(...percents);
        const maxPercent = Math.max(...percents);
        const tierIds = [...new Set(effects.map(effect => effect.tier))];
        const text = actorList.length === 1
            ? app._label('multi.preview.single', '{tier} spread: {percent}% effect per target', {
                tier: this.tierLabel(app, tierIds[0]),
                percent: effects[0].percent
            })
            : app._label('multi.preview.group', 'Group spread: {percent}% contribution per actor', {
                percent: minPercent === maxPercent ? String(minPercent) : `${minPercent}-${maxPercent}`
            });
        return { action: profile.id, actorCount: actorList.length, targetCount, effects, minPercent, maxPercent, text };
    },

    currentPreview(app, action) {
        if (!this.profile(action)) return null;
        if (app?.combatState?.active) {
            const targets = app._combatMarkedTargets?.() || [];
            const actors = app._isCombatGroupCompose?.()
                ? (app._syncSelectedParticipants?.() || [])
                : [app._currentCombatActor?.() || app.activeActor].filter(Boolean);
            return this.preview(app, action, actors, targets);
        }
        return this.preview(app, action, app._getExplorationActors?.() || [], app._getExplorationTargets?.() || []);
    },

    contextKey(app) {
        if (app?.combatState?.active) return `combat:${app.combatState.sceneExchangeId || 'active'}`;
        const location = app?.location || { x: 0, y: 0 };
        return `exploration:${Number(app?.dayCount) || 0}:${location.x || 0},${location.y || 0}`;
    },

    awardPractice(app, actors, action, targets = [], options = {}) {
        const profile = this.profile(action);
        const targetCount = (targets || []).filter(Boolean).length;
        if (!profile || targetCount <= 1) return [];
        const contextKey = options.contextKey || this.contextKey(app);
        const awards = [];
        for (const actor of [...new Set((actors || []).filter(Boolean))]) {
            const entry = this.entry(actor, profile.id);
            if (entry.contextKey !== contextKey) {
                entry.contextKey = contextKey;
                entry.contextGain = 0;
            }
            const baseGain = options.success === false ? 2 : 4 + Math.min(2, targetCount - 1);
            const diminishing = entry.contextGain >= 8 ? 0.25 : (entry.contextGain >= 4 ? 0.5 : 1);
            const requested = Math.max(1, Math.round(baseGain * diminishing));
            const remaining = Math.max(0, profile.encounterPracticeCap - entry.contextGain);
            const gained = Math.min(requested, remaining);
            entry.commands += 1;
            if (gained > 0) {
                entry.xp += gained;
                entry.contextGain += gained;
            }
            awards.push({ actor, gained, xp: entry.xp, tier: this.tierForXp(entry.xp).id });
        }
        if (awards.some(award => award.gained > 0)) app?.markAutoSaveDirty?.(['manifest', 'player', 'party'], 'multi-interaction-practice');
        return awards;
    },

    outcomeText(app, action, actors = [], targets = []) {
        const preview = this.preview(app, action, actors, targets);
        if (!preview) return '';
        return app._label('multi.outcome.spread', 'The effort is divided across {count} targets at about {percent}% effect each.', {
            count: preview.targetCount,
            percent: preview.minPercent === preview.maxPercent ? preview.minPercent : `${preview.minPercent}-${preview.maxPercent}`
        });
    }
};

if (typeof window !== 'undefined') window.YAW_MULTI_INTERACTION = YAW_MULTI_INTERACTION;
