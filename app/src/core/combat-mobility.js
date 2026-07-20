/**
 * YOU ARE WILD COMBAT MOBILITY
 * Row movement and flee mechanics for shared combat intents.
 */

const YAW_COMBAT_MOBILITY = {
    moveRow(app) {
        const actor = app.activeActor || app.player;
        if (!app.combatState.active || !actor || actor.CPun <= 0) return;
        app._clearTransientInteractionState();
        const wasBack = actor.combatRow === 'back';
        actor.combatRow = actor.combatRow === 'back' ? 'front' : 'back';
        app._applyActionCost?.('moveRow', actor, null, {}, { mode: 'combat', source: 'move-row', emitScene: true });
        const logKey = wasBack ? 'combat.advanceLog' : 'combat.retreatLog';
        const fallback = wasBack ? '{name} advances to the front row.' : '{name} retreats to the back row.';
        app._pushLog(app._label(logKey, fallback, {
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
        const destination = app._fleeDestination?.(actor, { source: 'combat-flee', safeOnly: true }) || null;
        if (!destination) {
            app.log.push({
                text: app._label('combat.flee.noSafeRoute', '{name} cannot find a safe route away from the fight.', {
                    name: actor.name
                }),
                type: 'combat'
            });
            app.renderLog();
            return false;
        }
        app._clearTransientInteractionState();
        app._applyActionCost?.('flee', actor, enemy, {}, { mode: 'combat', source: 'flee', emitScene: true });
        const fleeChance = 0.6
            + ((actor.Flee || 10) - (enemy.spd || 10)) * 0.02
            + (app._combatFleeRowModifier?.(actor, enemies) || 0);
        const isPlayer = actor.name === app.player?.name;
        const rollKey = isPlayer ? 'combat-player-flee' : 'combat-party-flee';
        const fleeRoll = app._combatStateRoll(rollKey, actor, app._unitSelectionId(enemy));
        if (fleeRoll < Math.max(0.1, Math.min(0.95, fleeChance))) {
            app.log.push({
                text: isPlayer
                    ? app._label('combat.flee.success', 'You flee successfully!')
                    : app._label('combat.flee.actorSuccess', '{name} flees from the fight!', { name: actor.name }),
                type: 'combat'
            });
            app._emitCombatAction('flee', actor, enemy, 'success');
            if (isPlayer) {
                app._retreatPartyFromCombat?.(actor, { source: 'combat-flee', destination });
                app.endCombat('flee');
            } else {
                app._relocateFleeingPartyMember?.(actor, { source: 'combat-flee', destination });
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
