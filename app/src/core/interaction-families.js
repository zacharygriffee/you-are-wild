/**
 * YOU ARE WILD INTERACTION FAMILIES
 * Canonical primary-action and approach vocabulary shared by every surface.
 *
 * A family is the player-facing primary action. An approach is either a
 * mechanically distinct resolution or a narration-only expression of that
 * family. UI surfaces may decide actors, targets, and combat timing, but they
 * must not invent a different family or approach meaning.
 */

const YAW_INTERACTION_FAMILIES = {
    PRIMARY: new Set(['fight', 'flirt', 'fuck', 'feast', 'feed']),

    normalizeFamily(action = '') {
        const normalized = String(action || '').replace(/^sync_/, '');
        if (normalized === 'talk') return 'flirt';
        if (normalized === 'play') return 'fuck';
        if (normalized === 'eat') return 'feast';
        return normalized;
    },

    family(action = '') {
        const id = this.normalizeFamily(action);
        return this.PRIMARY.has(id) ? id : null;
    },

    approachKind(family, approach, app) {
        if (family === 'fight') {
            return typeof YAW_ACTION_PROFILES !== 'undefined'
                && YAW_ACTION_PROFILES.profile(approach)?.category === 'control'
                ? 'control'
                : 'technique';
        }
        const definition = app?.SUB_ACTIONS?.[family]?.[approach];
        return definition?.semantics || 'mechanical';
    },

    normalize(app, context = {}) {
        const action = String(context.action || '');
        const family = this.family(action);
        const requested = context.approach ?? context.subAction ?? null;
        const rawApproach = requested === undefined || requested === '' ? null : String(requested);
        const approach = typeof YAW_SUB_ACTIONS !== 'undefined'
            ? YAW_SUB_ACTIONS.normalizeSubAction(family || action, rawApproach)
            : rawApproach;
        return {
            family,
            approach,
            approachKind: family && approach ? this.approachKind(family, approach, app) : null,
            // Sync is scheduling, never a different player-facing action.
            synchronized: action.startsWith('sync_') || context.timing === 'slowest-participant'
        };
    },

    isApproachAvailable(app, family, approach, actors = [], targets = [], mode = 'adventure') {
        if (!family || !approach) return false;
        if (family === 'fight') {
            const resolved = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                ? YAW_COMBAT_TECHNIQUES.resolve(app, { actors, targets, mode })
                : null;
            return Boolean(resolved?.variants.some(variant => variant.id === approach && variant.available));
        }
        const definition = app?.SUB_ACTIONS?.[family]?.[approach];
        if (!definition || definition.deferred === true) return false;
        const resolved = YAW_SUB_ACTIONS.resolve(app, family, {
            actors,
            targets,
            mode: mode === 'combat' ? 'combat' : 'adventure',
            preferred: approach
        });
        return resolved.variants.some(variant => variant.id === approach && variant.available);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_INTERACTION_FAMILIES = YAW_INTERACTION_FAMILIES;
}
