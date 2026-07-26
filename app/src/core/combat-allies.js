/**
 * YOU ARE WILD COMBAT ALLIES
 * Ally combat AI, support turns, target choice, and post-combat scavenger cleanup.
 */

const YAW_COMBAT_ALLIES = {
    healWounded(app, ally) {
        const wounded = app.party
            .filter(p => p.CPun > 0 && p.CPun < p.MPun && p !== ally)
            .sort((a, b) => (a.CPun / a.MPun) - (b.CPun / b.MPun))[0];
        if (!wounded || wounded.CPun / wounded.MPun > 0.7) return false;
        const { actorName, actorVerb } = app._actorNameAndVerb(ally);
        const result = app._doSubAction('feed', 'heal', ally, wounded, actorName, actorVerb);
        app.log.push({ text: result, type: 'heal' });
        app._emitCombatAction('ally_feed', ally, wounded, result);
        app.renderLog();
        app.renderParty();
        app.nextTurn();
        return true;
    },

    selectAttackTarget(app, ally, enemies) {
        const order = app._getPartyAIOrder(ally);
        if (order === 'defensive' && app.player && app.player.CPun / app.player.MPun < 0.6) {
            return enemies.reduce((best, enemy) => (enemy.Figh || 0) > (best.Figh || 0) ? enemy : best, enemies[0]);
        }
        return enemies.reduce((w, e) => (e.CPun / e.MPun < w.CPun / w.MPun) ? e : w, enemies[0]);
    },

    runPostCombatScavengers(app) {
        const scavengers = app.party.filter(p => p.CPun > 0 && app._getCompanionDuty?.(p) === 'gatherer');
        if (scavengers.length === 0) return;
        for (const ally of scavengers) {
            app._combatScavengeRemains(ally, 'postCombat');
        }
        app._syncCurrentTileCreatures();
        app.renderParty();
        app.renderCreatures();
    },

    takeTurn(app, ally) {
        const enemies = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
        if (enemies.length === 0) { app.nextTurn(); return; }
        if (app._attemptTimidAllyFlee(ally)) return;
        return YAW_COMPANION_BEHAVIOR.takeTurn(app, ally);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_ALLIES = YAW_COMBAT_ALLIES;
}
