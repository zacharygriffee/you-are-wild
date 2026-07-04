/**
 * YOU ARE WILD COMBAT MOBILITY
 * Row movement and flee mechanics for shared combat intents.
 */

const YAW_COMBAT_MOBILITY = {
    moveRow(app) {
        const actor = app.activeActor || app.player;
        if (!app.combatState.active || !actor || actor.CPun <= 0) return;
        app._clearTransientInteractionState();
        actor.combatRow = actor.combatRow === 'back' ? 'front' : 'back';
        app._pushLog(app._label('combat.moveRowLog', '{name} moves to the {row} row.', {
            name: actor.name,
            row: app._combatRowLabel(actor.combatRow)
        }), 'combat', { actor, phase: 'position' });
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        app.nextTurn();
    },

    attemptFlee(app) {
        const enemies = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
        const enemy = enemies[0];
        if (!enemy) {
            app.log.push({ text: app._label('combat.flee.noEnemies', 'No enemies to flee from!'), type: 'combat' });
            app.renderLog();
            return;
        }
        const fleeChance = 0.6 + (app.player.Flee - enemy.spd) * 0.02;
        const fleeRoll = app._combatStateRoll('combat-player-flee', app.player, app._unitSelectionId(enemy));
        if (fleeRoll < Math.max(0.1, Math.min(0.95, fleeChance))) {
            app.log.push({ text: app._label('combat.flee.success', 'You flee successfully!'), type: 'combat' });
            app.creatures = app.creatures.filter(c => c.disposition !== app.DISPOSITION.ENEMY);
            app._emitCombatAction('flee', app.player, enemy, 'success');
            app.endCombat('flee');
        } else {
            app.log.push({ text: app._label('combat.flee.failed', 'Flee failed! {name} intercepts you!', { name: enemy.name }), type: 'combat' });
            app._emitCombatAction('flee', app.player, enemy, 'failed');
            app._clearTransientInteractionState();
            app.renderLog();
            app.nextTurn();
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_MOBILITY = YAW_COMBAT_MOBILITY;
}
