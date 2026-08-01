/**
 * YOU ARE WILD ACTION PROFILE / RESOLVER V1
 * Owned, namespaced, data-only actions resolved by the deterministic core.
 */

const YAW_ACTION_PROFILES = {
    VERSION: 1,
    MAX_PROFILES: 256,
    MAX_EFFECTS: 12,
    MODES: new Set(['exploration', 'combat']),
    SCOPES: new Set(['self', 'target']),
    RELATIONS: new Set(['self', 'party', 'friendly', 'neutral', 'hostile']),
    ACTOR_STATS: new Set(['Figh', 'Flir', 'Fuck', 'Feas', 'Feed', 'Flee', 'str', 'con', 'spd', 'wis', 'cha', 'spirit']),
    EFFECT_STATS: new Set(['condition', 'spirit', 'hunger']),
    RESTRAINT_REQUIREMENTS: new Set(['none', 'source', 'target']),
    EFFECT_TYPES: new Set(['stat', 'status', 'restraint', 'pull', 'release-restraint', 'recruit-ready', 'withdraw-combat']),
    profiles: new Map(),

    _token(value, label = 'Action profile id') {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a bounded token`);
        }
        return token;
    },

    _integer(value, fallback, minimum, maximum, field) {
        const number = value === undefined ? fallback : Number(value);
        if (!Number.isInteger(number) || number < minimum || number > maximum) {
            throw new Error(`Action profile ${field} must be an integer from ${minimum} to ${maximum}`);
        }
        return number;
    },

    _list(value, field, known, fallback = []) {
        const input = value === undefined ? fallback : value;
        if (!Array.isArray(input) || input.length > 16) {
            throw new Error(`Action profile ${field} must be a bounded array`);
        }
        const result = [...new Set(input.map(entry => String(entry || '').trim()))];
        for (const entry of result) {
            if (!known.has(entry)) throw new Error(`Action profile ${field} contains unsupported value ${entry}`);
        }
        return result;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    key(owner, localId) {
        return `${this._token(owner, 'Action profile owner')}:${this._token(localId)}`;
    },

    _normalizeCheck(value) {
        if (value === undefined || value === null) return null;
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Action profile check must be an object');
        }
        for (const field of Object.keys(value)) {
            if (!['actorStat', 'targetStat', 'modifier', 'difficulty', 'appetiteMultiplier'].includes(field)) {
                throw new Error(`Action profile check contains unsupported field ${field}`);
            }
        }
        const actorStat = String(value.actorStat || '');
        const targetStat = String(value.targetStat || '');
        if (!this.ACTOR_STATS.has(actorStat)) throw new Error(`Action profile check.actorStat is unsupported: ${actorStat}`);
        if (targetStat && !this.ACTOR_STATS.has(targetStat)) throw new Error(`Action profile check.targetStat is unsupported: ${targetStat}`);
        return {
            actorStat,
            targetStat,
            modifier: this._integer(value.modifier, 0, -100, 100, 'check.modifier'),
            difficulty: this._integer(value.difficulty, 10, 0, 200, 'check.difficulty'),
            appetiteMultiplier: this._integer(value.appetiteMultiplier, 0, 0, 10, 'check.appetiteMultiplier')
        };
    },

    _normalizeCost(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Action profile cost must be an object');
        }
        for (const field of Object.keys(value)) {
            if (!['resource', 'amount'].includes(field)) throw new Error(`Action profile cost contains unsupported field ${field}`);
        }
        return {
            resource: this._token(value.resource, 'Action profile cost.resource'),
            amount: this._integer(value.amount, 1, 1, 1000000, 'cost.amount')
        };
    },

    _normalizeEffect(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Action profile effect must be an object');
        }
        for (const field of Object.keys(value)) {
            if (!['type', 'target', 'stat', 'amount', 'profile', 'turns', 'power'].includes(field)) {
                throw new Error(`Action profile effect contains unsupported field ${field}`);
            }
        }
        const type = String(value.type || '');
        const target = String(value.target || 'target');
        if (!this.EFFECT_TYPES.has(type)) throw new Error(`Action profile effect.type is unsupported: ${type}`);
        if (!['actor', 'target'].includes(target)) throw new Error('Action profile effect.target must be actor or target');
        if (type === 'stat') {
            const stat = String(value.stat || '');
            if (!this.EFFECT_STATS.has(stat)) throw new Error(`Action profile effect.stat is unsupported: ${stat}`);
            return {
                type,
                target,
                stat,
                amount: this._integer(value.amount, 0, -100000, 100000, 'effect.amount')
            };
        }
        if (['pull', 'release-restraint', 'recruit-ready', 'withdraw-combat'].includes(type)) {
            return { type, target };
        }
        return {
            type,
            target,
            profile: this._token(value.profile, 'Action profile effect.profile'),
            turns: this._integer(value.turns, 1, 1, 999, 'effect.turns'),
            power: this._integer(value.power, 1, 1, 100, 'effect.power')
        };
    },

    normalizeProfile(owner, localId, definition = {}) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('Action profile definition must be an object');
        }
        const allowed = new Set([
            'label', 'labelKey', 'description', 'descriptionKey', 'icon', 'category',
            'modes', 'scope', 'relations', 'requirements', 'check', 'costs', 'effects', 'failureEffects'
        ]);
        for (const field of Object.keys(definition)) {
            if (!allowed.has(field)) throw new Error(`Action profile contains unsupported field ${field}`);
        }
        const normalizedOwner = this._token(owner, 'Action profile owner');
        const id = this._token(localId);
        const key = this.key(normalizedOwner, id);
        const labelKey = definition.labelKey ? this._token(definition.labelKey, 'Action profile labelKey') : '';
        const descriptionKey = definition.descriptionKey ? this._token(definition.descriptionKey, 'Action profile descriptionKey') : '';
        if (normalizedOwner !== 'core' && labelKey && !labelKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Action profile labelKey must use the owning module namespace');
        }
        if (normalizedOwner !== 'core' && descriptionKey && !descriptionKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Action profile descriptionKey must use the owning module namespace');
        }
        const costs = definition.costs === undefined ? [] : definition.costs;
        const effects = definition.effects === undefined ? [] : definition.effects;
        const failureEffects = definition.failureEffects === undefined ? [] : definition.failureEffects;
        if (!Array.isArray(costs) || costs.length > 8) throw new Error('Action profile costs must be a bounded array');
        if (!Array.isArray(effects) || effects.length > this.MAX_EFFECTS) throw new Error('Action profile effects must be a bounded array');
        if (!Array.isArray(failureEffects) || failureEffects.length > this.MAX_EFFECTS) throw new Error('Action profile failureEffects must be a bounded array');
        const scope = String(definition.scope || 'target');
        if (!this.SCOPES.has(scope)) throw new Error(`Action profile scope must be one of: ${[...this.SCOPES].join(', ')}`);
        const requirementsInput = definition.requirements === undefined ? {} : definition.requirements;
        if (!requirementsInput || typeof requirementsInput !== 'object' || Array.isArray(requirementsInput)) {
            throw new Error('Action profile requirements must be an object');
        }
        for (const field of Object.keys(requirementsInput)) {
            if (!['restraint', 'minAppetite', 'structures'].includes(field)) throw new Error(`Action profile requirements contains unsupported field ${field}`);
        }
        const restraintRequirement = String(requirementsInput.restraint || 'none');
        if (!this.RESTRAINT_REQUIREMENTS.has(restraintRequirement)) {
            throw new Error(`Action profile requirements.restraint must be one of: ${[...this.RESTRAINT_REQUIREMENTS].join(', ')}`);
        }
        const minAppetite = this._integer(requirementsInput.minAppetite, 0, 0, 100, 'requirements.minAppetite');
        const structuresInput = requirementsInput.structures === undefined ? [] : requirementsInput.structures;
        if (!Array.isArray(structuresInput) || structuresInput.length > 16) {
            throw new Error('Action profile requirements.structures must be a bounded array');
        }
        const structures = [...new Set(structuresInput.map(value => this._token(value, 'Action profile requirements.structures entry')))];
        const normalizedCosts = costs.map(value => this._normalizeCost(value));
        const normalizedEffects = effects.map(value => this._normalizeEffect(value));
        const normalizedFailureEffects = failureEffects.map(value => this._normalizeEffect(value));
        if (normalizedOwner !== 'core') {
            for (const cost of normalizedCosts) {
                if (!cost.resource.startsWith(`${normalizedOwner}:`)) {
                    throw new Error('Action profile costs may reference only resources owned by the module');
                }
            }
            for (const effect of [...normalizedEffects, ...normalizedFailureEffects]) {
                if (['status', 'restraint'].includes(effect.type)
                    && !effect.profile.startsWith(`${normalizedOwner}:`)
                    && !effect.profile.startsWith('core:')) {
                    throw new Error('Action profile effects may reference only core or module-owned profiles');
                }
            }
        }
        return this._deepFreeze({
            version: this.VERSION,
            id,
            key,
            owner: normalizedOwner,
            label: String(definition.label || id).trim().slice(0, 80) || id,
            labelKey,
            description: String(definition.description || '').trim().slice(0, 320),
            descriptionKey,
            icon: String(definition.icon || '✨').trim().slice(0, 16) || '✨',
            category: this._token(definition.category || 'utility', 'Action profile category'),
            modes: this._list(definition.modes, 'modes', this.MODES, ['exploration']),
            scope,
            relations: this._list(definition.relations, 'relations', this.RELATIONS, scope === 'self' ? ['self'] : ['hostile']),
            requirements: { restraint: restraintRequirement, minAppetite, structures },
            check: this._normalizeCheck(definition.check),
            costs: normalizedCosts,
            effects: normalizedEffects,
            failureEffects: normalizedFailureEffects
        });
    },

    register(owner, localId, definition = {}) {
        if (this.profiles.size >= this.MAX_PROFILES) throw new Error('Action profile limit reached');
        const profile = this.normalizeProfile(owner, localId, definition);
        if (this.profiles.has(profile.key)) throw new Error(`Action profile ${profile.key} is already registered`);
        this.profiles.set(profile.key, profile);
        return profile;
    },

    unregisterOwner(owner) {
        const normalizedOwner = this._token(owner, 'Action profile owner');
        let removed = 0;
        for (const [key, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== normalizedOwner) continue;
            this.profiles.delete(key);
            removed++;
        }
        return removed;
    },

    profile(key) {
        const requested = String(key || '');
        return this.profiles.get(requested) || this.profiles.get(requested.includes(':') ? requested : `core:${requested}`) || null;
    },

    label(app, profile) {
        const resolved = typeof profile === 'string' ? this.profile(profile) : profile;
        if (!resolved) return '';
        return resolved.labelKey && app?._label ? app._label(resolved.labelKey, resolved.label, {}) : resolved.label;
    },

    relation(app, actor, target) {
        if (!actor || !target) return '';
        if (actor === target || app?._unitSelectionId?.(actor) === app?._unitSelectionId?.(target)) return 'self';
        if (app?.party?.includes(target)) return 'party';
        if (target.disposition === app?.DISPOSITION?.ENEMY) return 'hostile';
        if (target.disposition === app?.DISPOSITION?.FRIENDLY || target.disposition === app?.DISPOSITION?.PARTY) return 'friendly';
        return 'neutral';
    },

    availability(app, profileOrKey, actor, target, mode = 'exploration') {
        const profile = typeof profileOrKey === 'string' ? this.profile(profileOrKey) : profileOrKey;
        const resolvedTarget = profile?.scope === 'self' ? actor : target;
        if (!profile) return { ok: false, reason: 'unknown-action' };
        if (!profile.modes.includes(mode)) return { ok: false, reason: 'unsupported-mode', profile };
        if (!actor || !resolvedTarget) return { ok: false, reason: 'missing-participant', profile };
        if ((Number(actor.CPun) || 0) <= 0 || (Number(resolvedTarget.CPun) || 0) <= 0) {
            return { ok: false, reason: 'participant-unavailable', profile };
        }
        const relation = this.relation(app, actor, resolvedTarget);
        if (!profile.relations.includes(relation)) return { ok: false, reason: 'relation', relation, profile };
        if ((Number(actor.appetite) || 0) < profile.requirements.minAppetite) {
            return { ok: false, reason: 'appetite', relation, profile };
        }
        if (profile.requirements.structures.length) {
            const structure = app?.inInterior
                ? app?.activeInterior?.structure
                : app?._currentExplorationTile?.()?.structure;
            if (!profile.requirements.structures.includes(String(structure || ''))) {
                return { ok: false, reason: 'structure', relation, profile };
            }
        }
        if (profile.requirements.restraint === 'source'
            && (typeof YAW_RESTRAINTS === 'undefined' || !YAW_RESTRAINTS.active(app, resolvedTarget, { source: actor }).length)) {
            return { ok: false, reason: 'restraint-source', relation, profile };
        }
        if (profile.requirements.restraint === 'target'
            && (typeof YAW_RESTRAINTS === 'undefined' || !YAW_RESTRAINTS.active(app, actor).length)) {
            return { ok: false, reason: 'restraint-target', relation, profile };
        }
        for (const cost of profile.costs) {
            const state = typeof YAW_RESOURCE_LEDGER !== 'undefined'
                ? YAW_RESOURCE_LEDGER.state(actor, cost.resource)
                : null;
            if (!state || state.current < cost.amount) return { ok: false, reason: 'resource', cost, profile };
        }
        return { ok: true, relation, actor, target: resolvedTarget, profile };
    },

    available(app, context = {}) {
        const mode = context.mode === 'combat' ? 'combat' : 'exploration';
        return [...this.profiles.values()]
            .filter(profile => profile.modes.includes(mode))
            .map(profile => ({
                profile,
                availability: this.availability(app, profile, context.actor, context.target, mode)
            }))
            .filter(entry => context.includeUnavailable === true || entry.availability.ok);
    },

    _roll(app, profile, actor, target, mode, purpose) {
        if (mode === 'combat' && app?._combatStateRoll) {
            return app._combatStateRoll(`action-profile:${profile.key}`, actor, `${app._unitSelectionId?.(target) || target?.id || ''}:${purpose}`);
        }
        if (app?._explorationActionRoll) {
            return app._explorationActionRoll(`action-profile:${profile.key}`, actor, target, purpose);
        }
        if (app?._worldRoll) {
            return app._worldRoll(`action-profile:${profile.key}`, Number(app.location?.x || 0), Number(app.location?.y || 0), purpose);
        }
        return 0;
    },

    _resolveCheck(app, profile, actor, target, mode) {
        if (!profile.check) return { success: true, actorScore: null, targetScore: null };
        const actorRoll = Math.floor(this._roll(app, profile, actor, target, mode, 'actor') * 10);
        const targetRoll = Math.floor(this._roll(app, profile, target, actor, mode, 'target') * 10);
        const statValue = (unit, stat) => stat === 'spirit'
            ? Math.floor(((Number(unit?.CPle) || 0) / Math.max(1, Number(unit?.MPle) || 1)) * 20)
            : (Number(unit?.[stat]) || 0);
        const actorScore = statValue(actor, profile.check.actorStat)
            + profile.check.modifier
            + (Number(actor.appetite) || 0) * profile.check.appetiteMultiplier
            + actorRoll;
        const targetScore = profile.check.targetStat
            ? statValue(target, profile.check.targetStat) + targetRoll
            : profile.check.difficulty;
        return { success: actorScore >= targetScore, actorScore, targetScore };
    },

    _applyEffect(unit, effect, profile) {
        if (!unit) return null;
        if (effect.type === 'restraint') {
            return null;
        }
        if (['pull', 'release-restraint', 'recruit-ready', 'withdraw-combat'].includes(effect.type)) {
            return null;
        }
        if (effect.type === 'status') {
            const status = typeof YAW_STATUS_EFFECTS !== 'undefined'
                ? YAW_STATUS_EFFECTS.apply(unit, effect.profile, {
                    turns: effect.turns,
                    power: effect.power,
                    source: profile.key
                })
                : null;
            return status ? { type: 'status', unit: unit.id || unit.name, profile: effect.profile, state: status } : null;
        }
        const field = { condition: 'CPun', spirit: 'CPle', hunger: 'hunger' }[effect.stat];
        const before = Number(unit[field]) || 0;
        const maximum = effect.stat === 'condition'
            ? Math.max(1, Number(unit.MPun) || 1)
            : (effect.stat === 'spirit' ? Math.max(1, Number(unit.MPle) || 1) : 100);
        const after = Math.max(0, Math.min(maximum, before + effect.amount));
        unit[field] = after;
        return { type: 'stat', unit: unit.id || unit.name, stat: effect.stat, before, after, amount: after - before };
    },

    resolve(app, profileOrKey, context = {}) {
        const profile = typeof profileOrKey === 'string' ? this.profile(profileOrKey) : profileOrKey;
        const mode = context.mode === 'combat' ? 'combat' : 'exploration';
        const actor = context.actor || context.actors?.[0] || null;
        const target = profile?.scope === 'self' ? actor : (context.target || context.targets?.[0] || null);
        const available = this.availability(app, profile, actor, target, mode);
        if (!available.ok) return { ok: false, committed: false, reason: available.reason, profile: profile?.key || null };
        const check = this._resolveCheck(app, profile, actor, target, mode);
        for (const cost of profile.costs) YAW_RESOURCE_LEDGER.spend(actor, cost.resource, cost.amount);
        const applied = (check.success ? profile.effects : profile.failureEffects)
            .map(effect => {
                const unit = effect.target === 'actor' ? actor : target;
                if (effect.type === 'restraint') {
                    const state = typeof YAW_RESTRAINTS !== 'undefined'
                        ? YAW_RESTRAINTS.apply(app, actor, unit, effect.profile, { turns: effect.turns, power: effect.power })
                        : null;
                    return state ? { type: 'restraint', unit: unit.id || unit.name, profile: effect.profile, state } : null;
                }
                if (effect.type === 'pull') {
                    const state = typeof YAW_RESTRAINTS !== 'undefined' ? YAW_RESTRAINTS.pull(app, actor, unit) : null;
                    return state ? { type: 'pull', unit: unit.id || unit.name, ...state } : null;
                }
                if (effect.type === 'release-restraint') {
                    const removed = typeof YAW_RESTRAINTS !== 'undefined' ? YAW_RESTRAINTS.release(app, unit) : 0;
                    return removed ? { type: 'release-restraint', unit: unit.id || unit.name, removed } : null;
                }
                if (effect.type === 'recruit-ready') {
                    const prepared = typeof YAW_RECRUITMENT_FLOW !== 'undefined'
                        ? YAW_RECRUITMENT_FLOW.persuade(app, unit, actor, { source: profile.key })
                        : null;
                    return prepared ? { type: 'recruit-ready', unit: unit.id || unit.name } : null;
                }
                if (effect.type === 'withdraw-combat') {
                    unit.fledCombat = true;
                    return { type: 'withdraw-combat', unit: unit.id || unit.name };
                }
                return this._applyEffect(unit, effect, profile);
            })
            .filter(Boolean);
        const actorName = actor?.name === app.player?.name
            ? app._label('party.you', 'You')
            : (actor?.name || app._label('ui.ally', 'Someone'));
        const targetName = target?.name || app._label('target.targetRole', 'the target');
        const narrationKey = `combat.profile.${profile.key.replace(':', '.')}.${check.success ? 'success' : 'failure'}`;
        const narrationFallback = check.success
            ? '{actor} commits to {action} against {target}.'
            : '{actor} tries {action} against {target}, but the attempt does not take hold.';
        const text = app._label(narrationKey, narrationFallback, {
            actor: actorName,
            target: targetName,
            action: this.label(app, profile)
        });
        const outcomeInput = {
            mode,
            action: profile.key,
            actor,
            target,
            result: check.success ? 'success' : 'failed',
            costs: profile.costs,
            effects: applied,
            summary: text,
            detail: {
                check,
                source: 'action-profile-v1'
            }
        };
        const outcome = typeof YAW_ACTION_OUTCOMES !== 'undefined'
            ? YAW_ACTION_OUTCOMES.create(app, outcomeInput)
            : this._deepFreeze({ schema: 'yaw-action-outcome-v1', ...outcomeInput });
        const publicHooks = typeof MODULE_SYSTEM !== 'undefined' ? MODULE_SYSTEM : null;
        if (publicHooks?.executePublicHook) {
            Promise.resolve(publicHooks.executePublicHook('onActionCommitted', outcome)).catch(() => {});
        }
        if (app) app.lastActionProfileResult = outcome;
        return { ok: true, committed: true, success: check.success, profile: profile.key, outcome };
    },

    dispatch(app, command = {}) {
        const profile = this.profile(command.action);
        if (!profile) return false;
        const mode = command.mode === 'combat' ? 'combat' : 'exploration';
        const result = this.resolve(app, profile, {
            mode,
            actors: command.actors,
            targets: command.targets
        });
        if (!result.ok) return false;
        const text = result.outcome?.summary || this.label(app, profile);
        app?._pushLog?.(text, mode === 'combat' ? 'combat' : 'discovery', {
            actor: command.actors?.[0],
            targetId: command.targets?.[0]?.id || command.targets?.[0]?.name,
            targetName: command.targets?.[0]?.name,
            action: profile.key,
            phase: result.success ? 'success' : 'failed'
        });
        app?.emitStoryResult?.({
            ...command,
            mode: mode === 'combat' ? 'combat' : 'adventure',
            action: profile.key,
            tags: ['action-profile', result.success ? 'success' : 'failed'],
            source: 'action-profile-v1'
        }, text, {
            mode: mode === 'combat' ? 'combat' : 'adventure',
            resultKind: result.success ? 'success' : 'failure',
            source: 'action-profile-v1'
        });
        app?.markAutoSaveDirty?.(['party', 'currentTile', 'combat', 'sceneFeed', 'activityLog'], 'action-profile');
        app?.autoSave?.();
        app?.renderLog?.();
        app?.renderParty?.();
        app?.renderCreatures?.();
        if (mode === 'combat') {
            app.combatTargetId = null;
            app.combatTargetIds = [];
            app.targetSelection = null;
            app.nextTurn?.();
        } else {
            app?.renderExplorationActions?.();
        }
        return true;
    }
};

YAW_ACTION_PROFILES.register('core', 'grab', {
    label: 'Grab',
    icon: '🤝',
    category: 'control',
    modes: ['combat'],
    scope: 'target',
    relations: ['hostile'],
    check: { actorStat: 'str', targetStat: 'str', modifier: 0 },
    effects: [{ type: 'restraint', target: 'target', profile: 'core:grab', turns: 2, power: 1 }]
});

YAW_ACTION_PROFILES.register('core', 'pull', {
    label: 'Pull',
    icon: '🪢',
    category: 'control',
    modes: ['combat'],
    scope: 'target',
    relations: ['hostile'],
    requirements: { restraint: 'source' },
    effects: [{ type: 'pull', target: 'target' }]
});

YAW_ACTION_PROFILES.register('core', 'escape', {
    label: 'Escape',
    icon: '🗝️',
    category: 'control',
    modes: ['combat'],
    scope: 'self',
    relations: ['self'],
    requirements: { restraint: 'target' },
    effects: [{ type: 'release-restraint', target: 'actor' }]
});

YAW_ACTION_PROFILES.register('core', 'seduce', {
    label: 'Seduce',
    icon: '💕',
    category: 'social-control',
    modes: ['exploration', 'combat'],
    scope: 'target',
    relations: ['hostile'],
    requirements: { minAppetite: 4 },
    check: { actorStat: 'spirit', targetStat: 'wis', modifier: 0, appetiteMultiplier: 2 },
    effects: [
        { type: 'recruit-ready', target: 'target' },
        { type: 'withdraw-combat', target: 'actor' },
        { type: 'withdraw-combat', target: 'target' }
    ]
});

if (typeof window !== 'undefined') {
    window.YAW_ACTION_PROFILES = YAW_ACTION_PROFILES;
}
