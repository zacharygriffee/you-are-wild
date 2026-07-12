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
        app._applyActionCost?.('moveRow', actor, null, {}, { mode: 'combat', source: 'move-row', emitScene: true });
        app._pushLog(app._label('combat.moveRowLog', '{name} moves to the {row} row.', {
            name: actor.name,
            row: app._combatRowLabel(actor.combatRow)
        }), 'combat', { actor, phase: 'position' });
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        app.nextTurn();
    },

    attemptFlee(app, actor = app.activeActor || app._currentCombatActor?.() || app.player) {
        if (!actor || !app.party.includes(actor) || actor.CPun <= 0 || actor.knockedOut || actor.fledCombat) return false;
        const enemies = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
        const enemy = enemies[0];
        if (!enemy) {
            app.log.push({ text: app._label('combat.flee.noEnemies', 'No enemies to flee from!'), type: 'combat' });
            app.renderLog();
            return false;
        }
        app._clearTransientInteractionState();
        app._applyActionCost?.('flee', actor, enemy, {}, { mode: 'combat', source: 'flee', emitScene: true });
        const fleeChance = 0.6 + ((actor.Flee || 10) - (enemy.spd || 10)) * 0.02;
        const isPlayer = actor.name === app.player?.name;
        const rollKey = isPlayer ? 'combat-player-flee' : 'combat-party-flee';
        const fleeRoll = app._combatStateRoll(rollKey, actor, app._unitSelectionId(enemy));
        if (fleeRoll < Math.max(0.1, Math.min(0.95, fleeChance))) {
            actor.fledCombat = true;
            app.log.push({
                text: isPlayer
                    ? app._label('combat.flee.success', 'You flee successfully!')
                    : app._label('combat.flee.actorSuccess', '{name} flees from the fight!', { name: actor.name }),
                type: 'combat'
            });
            app._emitCombatAction('flee', actor, enemy, 'success');
            const livingParty = app.party.filter(p => p.CPun > 0 && !p.knockedOut && !p.fledCombat);
            if (livingParty.length === 0) {
                app.creatures = app.creatures.filter(c => c.disposition !== app.DISPOSITION.ENEMY);
                app.endCombat('flee');
            } else {
                app.renderLog();
                app.renderParty();
                app.renderCreatures();
                app.nextTurn();
            }
        } else {
            app.log.push({
                text: isPlayer
                    ? app._label('combat.flee.failed', 'Flee failed! {name} intercepts you!', { name: enemy.name })
                    : app._label('combat.flee.actorFailed', '{actor} tries to flee, but {enemy} intercepts!', { actor: actor.name, enemy: enemy.name }),
                type: 'combat'
            });
            app._emitCombatAction('flee', actor, enemy, 'failed');
            app.renderLog();
            app.nextTurn();
        }
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_MOBILITY = YAW_COMBAT_MOBILITY;
}
