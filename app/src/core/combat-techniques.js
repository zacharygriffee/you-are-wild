/**
 * YOU ARE WILD COMBAT TECHNIQUE V1
 * Bounded, namespaced, declarative Fight variants owned by core or modules.
 */

const YAW_COMBAT_TECHNIQUES = {
    VERSION: 1,
    MAX_PROFILES: 128,
    MAX_TARGETS: 8,
    REACH: new Set(['melee', 'ranged', 'hybrid', 'special']),
    DISTRIBUTIONS: new Set(['split', 'full']),
    STATUS_EFFECTS: new Set(['bleed', 'burn', 'freeze', 'stun', 'sleep', 'charm', 'fear']),
    profiles: new Map(),

    _token(value, label = 'Combat technique id') {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a bounded token`);
        }
        return token;
    },

    key(owner, localId) {
        return `${this._token(owner, 'Combat technique owner')}:${this._token(localId)}`;
    },

    _string(value, fallback, limit, field) {
        const text = String(value === undefined ? fallback : value).trim();
        if (!text || text.length > limit) throw new Error(`Combat technique ${field} must be 1 to ${limit} characters`);
        return text;
    },

    _stringList(value, field, limit = 32) {
        if (value === undefined) return [];
        if (!Array.isArray(value)) throw new Error(`Combat technique ${field} must be an array`);
        if (value.length > limit) throw new Error(`Combat technique ${field} exceeds ${limit} entries`);
        return [...new Set(value.map(item => this._token(item, `Combat technique ${field}`)))];
    },

    _number(value, fallback, minimum, maximum, field) {
        const number = value === undefined ? fallback : Number(value);
        if (!Number.isFinite(number) || number < minimum || number > maximum) {
            throw new Error(`Combat technique ${field} must be from ${minimum} to ${maximum}`);
        }
        return number;
    },

    _integer(value, fallback, minimum, maximum, field) {
        const number = value === undefined ? fallback : Number(value);
        if (!Number.isInteger(number) || number < minimum || number > maximum) {
            throw new Error(`Combat technique ${field} must be an integer from ${minimum} to ${maximum}`);
        }
        return number;
    },

    _object(value, field, allowed) {
        if (value === undefined || value === null) return {};
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`Combat technique ${field} must be an object`);
        }
        for (const key of Object.keys(value)) {
            if (!allowed.includes(key)) throw new Error(`Combat technique ${field} contains unsupported field ${key}`);
        }
        return value;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    normalizeProfile(owner, localId, definition = {}) {
        const value = this._object(definition, 'definition', [
            'label', 'labelKey', 'description', 'descriptionKey', 'icon',
            'eligibility', 'equipment', 'reach', 'damage', 'area', 'status'
        ]);
        const id = this._token(localId);
        const key = this.key(owner, id);
        const normalizedOwner = this._token(owner, 'Combat technique owner');
        const eligibilityValue = this._object(value.eligibility, 'eligibility', ['species', 'abilities', 'flags']);
        const equipmentValue = this._object(value.equipment, 'equipment', ['required', 'anyTags', 'allTags', 'slots']);
        const damageValue = this._object(value.damage, 'damage', ['multiplier', 'flat']);
        const areaValue = this._object(value.area, 'area', ['maxTargets', 'distribution', 'recovery']);
        const statusValue = this._object(value.status, 'status', ['effect', 'chance', 'turns', 'power']);
        const reach = value.reach === undefined || value.reach === null || value.reach === ''
            ? null
            : String(value.reach);
        if (reach && !this.REACH.has(reach)) {
            throw new Error(`Combat technique reach must be one of: ${[...this.REACH].join(', ')}`);
        }
        const distribution = String(areaValue.distribution || 'split');
        if (!this.DISTRIBUTIONS.has(distribution)) {
            throw new Error(`Combat technique area.distribution must be one of: ${[...this.DISTRIBUTIONS].join(', ')}`);
        }
        let status = null;
        if (Object.keys(statusValue).length) {
            const effect = String(statusValue.effect || '');
            if (!this.STATUS_EFFECTS.has(effect)) {
                throw new Error(`Combat technique status.effect must be one of: ${[...this.STATUS_EFFECTS].join(', ')}`);
            }
            status = {
                effect,
                chance: this._number(statusValue.chance, 1, 0, 1, 'status.chance'),
                turns: this._integer(statusValue.turns, 1, 1, 5, 'status.turns'),
                power: this._integer(statusValue.power, effect === 'bleed' ? 2 : (effect === 'burn' ? 3 : 1), 1, 10, 'status.power')
            };
        }
        const labelKey = value.labelKey ? this._token(value.labelKey, 'Combat technique label key') : '';
        const descriptionKey = value.descriptionKey ? this._token(value.descriptionKey, 'Combat technique description key') : '';
        if (normalizedOwner !== 'core' && labelKey && !labelKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Combat technique labelKey must use the owning module namespace');
        }
        if (normalizedOwner !== 'core' && descriptionKey && !descriptionKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Combat technique descriptionKey must use the owning module namespace');
        }
        const profile = {
            version: this.VERSION,
            id,
            key,
            owner: normalizedOwner,
            label: this._string(value.label, id, 80, 'label'),
            labelKey,
            description: value.description ? this._string(value.description, '', 240, 'description') : '',
            descriptionKey,
            icon: value.icon ? this._string(value.icon, '⚔️', 16, 'icon') : '⚔️',
            eligibility: {
                species: this._stringList(eligibilityValue.species, 'eligibility.species'),
                abilities: this._stringList(eligibilityValue.abilities, 'eligibility.abilities'),
                flags: this._stringList(eligibilityValue.flags, 'eligibility.flags')
            },
            equipment: {
                required: equipmentValue.required === true,
                anyTags: this._stringList(equipmentValue.anyTags, 'equipment.anyTags'),
                allTags: this._stringList(equipmentValue.allTags, 'equipment.allTags'),
                slots: this._stringList(equipmentValue.slots, 'equipment.slots', 16)
            },
            reach,
            damage: {
                multiplier: this._number(damageValue.multiplier, 1, 0.25, 2, 'damage.multiplier'),
                flat: this._integer(damageValue.flat, 0, 0, 25, 'damage.flat')
            },
            area: {
                maxTargets: this._integer(areaValue.maxTargets, 1, 1, this.MAX_TARGETS, 'area.maxTargets'),
                distribution,
                recovery: this._number(areaValue.recovery, 0, 0, 1, 'area.recovery')
            },
            status
        };
        return this._deepFreeze(profile);
    },

    register(owner, localId, definition = {}) {
        if (this.profiles.size >= this.MAX_PROFILES) throw new Error('Combat technique profile limit reached');
        const profile = this.normalizeProfile(owner, localId, definition);
        if (profile.key === 'core:basic') throw new Error('Combat technique core:basic is reserved');
        if (this.profiles.has(profile.key)) throw new Error(`Combat technique ${profile.key} is already registered`);
        this.profiles.set(profile.key, profile);
        return profile;
    },

    unregisterOwner(owner, app = null) {
        const normalizedOwner = this._token(owner, 'Combat technique owner');
        const removed = new Set();
        for (const [key, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== normalizedOwner) continue;
            this.profiles.delete(key);
            removed.add(key);
        }
        if (app?.combatState?.syncActions?.length && removed.size) {
            app.combatState.syncActions = app.combatState.syncActions.filter(sync => !removed.has(sync.techniqueKey || sync.subAction));
        }
        if (app?.feedSelection?.action === 'fight'
            && (app.feedSelection.subIds || []).some(key => removed.has(key))) {
            app.closeIntentMenu?.();
            app.feedSelection = null;
            app._renderInteractionState?.({ exploration: false, toolbelt: true });
        }
        return removed.size;
    },

    profile(profileKey) {
        return this.profiles.get(String(profileKey || '')) || null;
    },

    _itemDefinition(app, item) {
        if (!item) return {};
        return app?._getItemDef?.(item) || app?.ITEMS?.[item.name] || {};
    },

    equipmentContext(app, unit) {
        const equipped = Object.entries(unit?.equipment || {})
            .filter(([, item]) => Boolean(item))
            .map(([slot, item]) => {
                const definition = this._itemDefinition(app, item);
                const tags = [
                    ...(Array.isArray(item?.techniqueTags) ? item.techniqueTags : []),
                    ...(Array.isArray(item?.combatTags) ? item.combatTags : []),
                    ...(Array.isArray(item?.tags) ? item.tags : []),
                    ...(Array.isArray(definition?.techniqueTags) ? definition.techniqueTags : []),
                    ...(Array.isArray(definition?.combatTags) ? definition.combatTags : []),
                    ...(Array.isArray(definition?.tags) ? definition.tags : []),
                    item?.name,
                    definition?.name,
                    definition?.type,
                    definition?.slot,
                    slot
                ].filter(Boolean).map(String);
                return { slot: String(slot), item, definition, tags };
            });
        return {
            equipped,
            tags: new Set(equipped.flatMap(entry => entry.tags)),
            slots: new Set(equipped.map(entry => entry.slot))
        };
    },

    eligible(app, unit, profile) {
        if (!unit || !profile) return false;
        const eligibility = profile.eligibility || {};
        if (eligibility.species?.length && !eligibility.species.includes(String(unit.species || ''))) return false;
        const abilities = unit.abilities && typeof unit.abilities === 'object' ? unit.abilities : {};
        if (eligibility.abilities?.some(ability => unit[ability] !== true && abilities[ability] !== true)) return false;
        if (eligibility.flags?.some(flag => unit[flag] !== true)) return false;
        const equipment = profile.equipment || {};
        const context = this.equipmentContext(app, unit);
        if (equipment.required && context.equipped.length === 0) return false;
        if (equipment.slots?.length && !equipment.slots.some(slot => context.slots.has(slot))) return false;
        if (equipment.anyTags?.length && !equipment.anyTags.some(tag => context.tags.has(tag))) return false;
        if (equipment.allTags?.some(tag => !context.tags.has(tag))) return false;
        return true;
    },

    label(app, profile) {
        if (!profile) return app?._label?.('combat.technique.basic', 'Basic Attack') || 'Basic Attack';
        return profile.labelKey && app?._label ? app._label(profile.labelKey, profile.label) : profile.label;
    },

    description(app, profile) {
        if (!profile) return app?._label?.('combat.technique.basicDescription', 'A standard single-target attack.') || 'A standard single-target attack.';
        return profile.descriptionKey && app?._label
            ? app._label(profile.descriptionKey, profile.description || this.label(app, profile))
            : profile.description;
    },

    statusLabel(app, effect) {
        const fallbacks = {
            bleed: 'Bleeding',
            burn: 'Burning',
            freeze: 'Frozen',
            stun: 'Stunned',
            sleep: 'Asleep',
            charm: 'Charmed',
            fear: 'Fear'
        };
        const id = String(effect || '');
        return app?._label?.(`combat.technique.status.${id}`, fallbacks[id] || id) || fallbacks[id] || id;
    },

    availableProfiles(app, actors = [], targetCount = 1) {
        const livingActors = [...new Set((actors || []).filter(Boolean))];
        const count = Math.max(1, Math.floor(Number(targetCount) || 1));
        if (!livingActors.length) return [];
        return [...this.profiles.values()].filter(profile => {
            if (count > profile.area.maxTargets) return false;
            return livingActors.every(actor => this.eligible(app, actor, profile));
        });
    },

    resolve(app, context = {}) {
        const actors = (context.actors || []).filter(Boolean);
        const targets = (context.targets || []).filter(Boolean);
        const targetCount = Math.max(1, targets.length);
        const basicAvailable = targetCount <= this.MAX_TARGETS;
        const variants = [{
            id: 'basic',
            label: this.label(app, null),
            icon: '⚔️',
            available: basicAvailable,
            status: basicAvailable ? 'available' : 'unavailable',
            reason: basicAvailable ? '' : app._label('combat.technique.tooManyTargets', 'Basic Attack supports at most {count} targets.', { technique: this.label(app, null), count: this.MAX_TARGETS }),
            hint: targetCount > 1
                ? app._label('combat.technique.basicSpread', 'A standard attack distributed across the selected targets.')
                : this.description(app, null),
            requirements: [],
            cost: null,
            owner: 'core',
            scope: 'target',
            validPairCount: basicAvailable ? 1 : 0,
            pairCount: 1,
            pairPreviews: [],
            pairPreviewOverflow: 0,
            actorCosts: []
        }];
        for (const profile of this.profiles.values()) {
            const eligibleActors = actors.filter(actor => this.eligible(app, actor, profile));
            const withinArea = targetCount <= profile.area.maxTargets;
            const available = actors.length > 0 && eligibleActors.length === actors.length && withinArea;
            const reason = !withinArea
                ? app._label('combat.technique.tooManyTargets', '{technique} supports at most {count} targets.', {
                    technique: this.label(app, profile),
                    count: profile.area.maxTargets
                })
                : (eligibleActors.length !== actors.length
                    ? app._label('combat.technique.requirementsNotMet', 'Not every selected actor meets this technique’s equipment or capability requirements.')
                    : '');
            variants.push({
                id: profile.key,
                label: this.label(app, profile),
                icon: profile.icon,
                available,
                status: available ? 'available' : 'unavailable',
                reason,
                hint: this.description(app, profile),
                requirements: [
                    profile.reach ? app._label('variant.requirement.reach', 'Reach') : '',
                    profile.equipment.required || profile.equipment.anyTags.length || profile.equipment.allTags.length || profile.equipment.slots.length
                        ? app._label('combat.technique.requirement.equipment', 'Equipment')
                        : '',
                    profile.status ? app._label('combat.technique.requirement.status', 'Status') : ''
                ].filter(Boolean),
                cost: null,
                owner: profile.owner,
                scope: 'target',
                validPairCount: available ? 1 : 0,
                pairCount: 1,
                pairPreviews: [],
                pairPreviewOverflow: 0,
                actorCosts: []
            });
        }
        // Core target-control profiles are Fight approaches, not a second
        // combat toolbar. They deliberately join the same resolver as Basic
        // Attack and authored techniques, while remaining unavailable for
        // multi-actor or multi-target commands they cannot legally resolve.
        if (context.mode === 'combat' && typeof YAW_ACTION_PROFILES !== 'undefined') {
            const controlProfiles = [...YAW_ACTION_PROFILES.profiles.values()]
                .filter(profile => profile.category === 'control'
                    && profile.scope === 'target'
                    && profile.modes.includes('combat'));
            for (const profile of controlProfiles) {
                const availability = actors.length === 1 && targets.length === 1
                    ? YAW_ACTION_PROFILES.availability(app, profile, actors[0], targets[0], 'combat')
                    : { ok: false, reason: app._label('combat.control.oneTarget', 'This control approach needs one actor and one target.') };
                variants.push({
                    id: profile.key,
                    label: YAW_ACTION_PROFILES.label(app, profile),
                    icon: profile.icon,
                    available: availability.ok,
                    status: availability.ok ? 'available' : 'unavailable',
                    reason: availability.ok ? '' : (availability.reason || app._label('variant.unavailable.generic', 'This approach is not available right now.')),
                    hint: app._label('combat.control.approachHint', 'A tactical control approach within Fight.'),
                    requirements: [app._label('combat.control.requirement', 'Control')],
                    cost: null,
                    owner: profile.owner,
                    scope: 'target',
                    approachKind: 'control',
                    validPairCount: availability.ok ? 1 : 0,
                    pairCount: 1,
                    pairPreviews: [],
                    pairPreviewOverflow: 0,
                    actorCosts: []
                });
            }
        }
        const selectable = variants.filter(variant => variant.available);
        const preferred = String(context.preferred || '');
        const selected = selectable.find(variant => variant.id === preferred) || selectable[0] || null;
        return {
            action: 'fight',
            scope: 'target',
            actors,
            targets,
            variants,
            selected,
            decision: selectable.length === 0 ? 'unavailable' : (selectable.length === 1 ? 'direct' : 'choose')
        };
    },

    selected(app, actors = [], profileKey = 'basic', targetCount = 1) {
        const key = String(profileKey || 'basic');
        if (key === 'basic') return targetCount <= this.MAX_TARGETS ? null : false;
        const profile = this.profile(key);
        if (!profile || targetCount > profile.area.maxTargets) return false;
        return (actors || []).every(actor => this.eligible(app, actor, profile)) ? profile : false;
    },

    reachProfile(app, actor, profileKey) {
        const profile = this.selected(app, [actor], profileKey, 1);
        return profile && profile.reach ? profile.reach : null;
    },

    multiTargetSpec(app, actor, profileKey, targetCount) {
        const profile = this.selected(app, [actor], profileKey, targetCount);
        if (!profile) return null;
        return {
            id: profile.key,
            action: 'fight',
            maxTargets: profile.area.maxTargets,
            area: profile.area.distribution === 'full',
            fullEffect: profile.area.distribution === 'full',
            recovery: profile.area.recovery
        };
    },

    damageValue(baseDamage, profile) {
        const base = Math.max(1, Number(baseDamage) || 1);
        if (!profile) return Math.max(1, Math.floor(base));
        return Math.max(1, Math.floor(base * profile.damage.multiplier + profile.damage.flat));
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_TECHNIQUES = YAW_COMBAT_TECHNIQUES;
}
