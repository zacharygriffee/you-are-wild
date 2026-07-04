/**
 * YOU ARE WILD ACTION RULES
 * Shared deterministic action rating and variance helpers.
 */

const YAW_ACTION_RULES = {
    actionRatingFromRoll(entry, roll) {
        if (entry > 55) return Math.round(entry + (roll * 21 - 10));
        if (entry > 45) return Math.round(entry + (roll * 17 - 8));
        if (entry > 35) return Math.round(entry + (roll * 13 - 6));
        if (entry > 25) return Math.round(entry + (roll * 9 - 4));
        return Math.max(1, Math.round(entry + (roll * 5 - 2)));
    },

    combatActionRating(app, entry, actor, target = null, purpose = 'rating') {
        return this.actionRatingFromRoll(
            entry,
            app._combatStateRoll('combat-action-rating', actor, `${app._unitSelectionId(target || {})}:${purpose}`)
        );
    },

    combatDamageVariance(app, actor, target, purpose = 'fight', scale = 6) {
        return app._combatStateRoll('combat-damage-variance', actor, `${app._unitSelectionId(target || {})}:${purpose}`) * scale;
    },

    explorationActionRoll(app, namespace, actor, target = null, purpose = 'roll') {
        const x = Number(app.location?.x ?? 0);
        const y = Number(app.location?.y ?? 0);
        return app._worldRoll(namespace, x, y, app._unitSelectionId(actor || {}), app._unitSelectionId(target || {}), app.dayCount || 0, app.timeHour || 0, purpose);
    },

    explorationActionRating(app, entry, actor, target = null, purpose = 'rating') {
        return this.actionRatingFromRoll(entry, this.explorationActionRoll(app, 'exploration-action-rating', actor, target, purpose));
    },

    explorationDamageVariance(app, actor, target = null, purpose = 'fight', scale = 6) {
        return this.explorationActionRoll(app, 'exploration-damage-variance', actor, target, purpose) * scale;
    },

    targetDodgeRoll(app, actor, target, action = 'fight') {
        return app._combatStateRoll('combat-target-dodge', actor, `${app._unitSelectionId(target)}:${action}`);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_ACTION_RULES = YAW_ACTION_RULES;
}
