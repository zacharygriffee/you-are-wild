/**
 * YOU ARE WILD INTERACTION PLAN
 * Shared Actor(s) -> Target(s) -> Intent -> Timing -> Resolution metadata.
 */

const YAW_INTERACTION_PLAN = {
    normalizeMode(mode = 'exploration') {
        return mode === 'combat' ? 'combat' : 'exploration';
    },

    compatibilityMode(mode = 'exploration') {
        return mode === 'combat' ? 'combat' : 'adventure';
    },

    inferTargetType(app, targets = []) {
        const targetTypes = new Set((targets || []).map(target => {
            if ((app.party || []).includes(target)) return 'party';
            if (target?.disposition === app.DISPOSITION?.ENEMY) return 'enemy';
            return 'creature';
        }));
        return targetTypes.size > 1 ? 'mixed' : ([...targetTypes][0] || null);
    },

    sameUnitSet(app, actors = [], targets = []) {
        if (!app._sameUnitSet) return false;
        return app._sameUnitSet(actors, targets);
    },

    isUnitSubset(app, subset = [], set = []) {
        if (!app._isUnitSubset) return false;
        return app._isUnitSubset(subset, set);
    },

    inferShape(app, actors = [], targets = []) {
        const actorCount = actors.length;
        const targetCount = targets.length;
        if (actorCount > 0 && targetCount > 0) {
            if (this.sameUnitSet(app, actors, targets)) return 'mutual';
            if (this.isUnitSubset(app, targets, actors) || this.isUnitSubset(app, actors, targets)) return 'mutual';
        }
        if (actorCount === 1 && targetCount === 1) return 'one-to-one';
        if (actorCount > 1 && targetCount === 1) return 'many-to-one';
        if (actorCount === 1 && targetCount > 1) return 'one-to-many';
        if (actorCount > 1 && targetCount > 1 && actorCount === targetCount) return 'paired';
        if (actorCount > 1 && targetCount > 1) return 'many-to-many';
        return actorCount > 1 ? 'many-to-one' : 'one-to-one';
    },

    inferDistribution(shape, requested = null) {
        if (requested) return requested;
        if (shape === 'mutual') return 'mutual';
        if (shape === 'paired') return 'paired';
        if (shape === 'one-to-many') return 'all';
        if (shape === 'many-to-many') return 'split';
        return 'single';
    },

    inferTiming(mode, context = {}) {
        if (context.timing) return context.timing;
        if (mode === 'combat') return 'current-turn';
        return 'immediate';
    },

    unitIds(units = []) {
        return (units || []).map(unit => unit?.id || unit?.name).filter(Boolean);
    },

    defaultConstraints(mode, context = {}) {
        const provided = context.constraints || {};
        if (mode !== 'combat') return { ...provided };
        return {
            requireCurrentTurn: context.action !== 'sync' && context.timing !== 'slowest-participant',
            hostileOnly: !['feed', 'scavenge'].includes(context.action),
            checkReach: !['feed', 'scavenge'].includes(context.action),
            checkRows: !['feed', 'scavenge'].includes(context.action),
            ...provided
        };
    },

    slowestParticipantIndex(app, actors = []) {
        const queue = app.combatState?.turnQueue || [];
        let slowest = null;
        for (const actor of actors || []) {
            const index = queue.findIndex(entry => (entry?.unit || entry) === actor);
            if (index < 0) return null;
            const entry = queue[index];
            const initiative = entry?.initiative ?? 0;
            if (!slowest || initiative < slowest.initiative) slowest = { index, initiative };
        }
        return slowest ? slowest.index : null;
    },

    build(app, context = {}) {
        const planMode = this.normalizeMode(context.planMode || context.mode);
        const mode = this.compatibilityMode(planMode);
        const actors = (context.actors || []).filter(Boolean);
        const targets = (context.targets || []).filter(Boolean);
        const shape = context.shape || this.inferShape(app, actors, targets);
        const timing = this.inferTiming(planMode, context);
        const resolveAt = context.resolveAt !== undefined
            ? context.resolveAt
            : (timing === 'slowest-participant' ? this.slowestParticipantIndex(app, actors) : null);
        const targetType = context.targetType || this.inferTargetType(app, targets);
        const plan = {
            mode: planMode,
            actors,
            targets,
            actorIds: this.unitIds(actors),
            targetIds: this.unitIds(targets),
            action: context.action || null,
            subAction: context.subAction || null,
            source: context.source || 'command-composer',
            targetType,
            shape,
            timing,
            resolveAt,
            constraints: this.defaultConstraints(planMode, { ...context, timing }),
            distribution: this.inferDistribution(shape, context.distribution || null),
            clearTargets: Boolean(context.clearTargets),
            metadata: context.metadata || {}
        };
        return {
            ...plan,
            mode,
            planMode,
            plan
        };
    }
};

if (typeof window !== 'undefined') {
    window.YAW_INTERACTION_PLAN = YAW_INTERACTION_PLAN;
}
