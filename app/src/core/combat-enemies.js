/**
 * YOU ARE WILD COMBAT ENEMIES
 * Enemy combat AI, target choice, morale, reinforcement, and turn resolution.
 */

const YAW_COMBAT_ENEMIES = {
    shouldFlee(app, enemy, targets) {
        const enemyCount = app._livingEnemies(app.creatures).length;
        const partyCount = targets.filter(t => t.CPun > 0 && !t.knockedOut).length;
        if (enemyCount < partyCount && enemy.CPun < enemy.MPun * 0.5) {
            return app._combatStateRoll('combat-enemy-flee', enemy, 'outnumbered') < 0.5;
        }
        return enemy.CPun > 0 && enemy.CPun < enemy.MPun * 0.3
            && app._combatStateRoll('combat-enemy-flee', enemy, 'wounded') < 0.3;
    },

    callReinforcement(app, enemy) {
        const temp = app._getSpeciesTemperament(enemy.species);
        if (!temp.pack || enemy.CPun >= enemy.MPun * 0.5 || enemy.calledReinforcement || app._combatStateRoll('combat-reinforcement', enemy, 'call') >= 0.3) return false;
        const sp = app.species.find(s => s.id === enemy.species) || { name: enemy.species || 'Creature', icon: enemy.icon || '❓' };
        const base = app._getSpeciesBaseStats(enemy.species);
        const enemyId = app._unitSelectionId(enemy);
        const reinforcement = app._normalizeUnit({
            id: `reinforce_${enemyId}_${app.combatState.round || 0}_${app.combatState.currentTurn || 0}`,
            name: sp.name + ' Reinforcement',
            species: enemy.species,
            icon: sp.icon,
            level: enemy.level || 1,
            MPun: Math.floor((base.MPun || 100) * 0.8),
            CPun: Math.floor((base.MPun || 100) * 0.8),
            MPle: base.MPle || 100,
            CPle: 0,
            disposition: app.DISPOSITION.ENEMY,
            status: {}
        }, { disposition: app.DISPOSITION.ENEMY });
        enemy.calledReinforcement = true;
        app.creatures.push(reinforcement);
        app._assignCombatRows([reinforcement]);
        const insertAt = Math.min(app.combatState.turnQueue.length, app.combatState.currentTurn + 1);
        app.combatState.turnQueue.splice(insertAt, 0, { unit: reinforcement, initiative: app._calcInitiative(reinforcement) });
        app.log.push({ text: app._label('combat.enemyReinforces', '{enemy} calls for help! {reinforcement} joins the fight.', {
            enemy: enemy.name,
            reinforcement: reinforcement.name
        }), type: 'combat' });
        app._syncCurrentTileCreatures();
        app.renderCreatures();
        return true;
    },

    selectTarget(app, enemy, targets) {
        const preyTargets = targets.filter(t => t.livestock || t.willingPrey || app._isPredatorOf(enemy.species, t.species));
        if (preyTargets.length > 0) {
            return preyTargets.reduce((best, t) => (t.CPun / t.MPun < best.CPun / best.MPun) ? t : best, preyTargets[0]);
        }
        const tastyTargets = targets.filter(t => t.tasty);
        if (tastyTargets.length > 0) {
            const index = Math.floor(app._combatStateRoll('combat-target-tasty', enemy, 'choice') * tastyTargets.length) % tastyTargets.length;
            return tastyTargets[index];
        }
        const leader = app.partyLeaderId ? app.party.find(p => app._unitSelectionId(p) === String(app.partyLeaderId)) : null;
        if (leader && targets.includes(leader)) return leader;
        return targets.reduce((weakest, t) => (t.CPun / t.MPun < weakest.CPun / weakest.MPun) ? t : weakest, targets[0]);
    },

    takeTurn(app, enemy) {
        const charmedTargets = app._charmedTargetsFor(enemy);
        const targets = charmedTargets || app.party.filter(p => p.CPun > 0);
        if (targets.length === 0) {
            const summary = app._label('combat.enemyNoTarget', '{name} hesitates with no valid target and loses their turn.', { name: enemy.name });
            app._pushLog(summary, 'combat', { actor: enemy, phase: 'skip' });
            YAW_COMBAT_TURNS.emitSkippedTurn(app, enemy, summary, ['no-target']);
            app.renderLog();
            app.nextTurn();
            return;
        }
        const reachableTargets = targets.filter(target => app._canReachCombatTarget(enemy, target, 'fight'));
        const target = app._selectEnemyTarget(enemy, reachableTargets.length > 0 ? reachableTargets : targets);
        if (enemy.menacing && target.CPun / target.MPun < 0.4
            && app._combatStateRoll('combat-menacing-fear', enemy, app._unitSelectionId(target)) < 0.3) {
            app.log.push({ text: app._label('combat.enemyTerrifies', '{enemy} is terrifying! {target} cowers in fear.', {
                enemy: enemy.name,
                target: target.name
            }), type: 'combat' });
            target.status.frightened = true;
            app.renderLog();
        }
        if (enemy.rage && enemy.CPun < enemy.MPun * 0.5) {
            app.log.push({ text: app._label('combat.enemyRage', '{name} enters a rage!', { name: enemy.name }), type: 'combat' });
        }
        app._enemyCallReinforcement(enemy);
        if (((enemy.hunger || 0) > 60 || enemy.CPun < enemy.MPun * 0.7) && app._combatScavengeRemains(enemy, 'combat')) {
            app.nextTurn();
            return;
        }
        if (app._enemyShouldFlee(enemy, targets)) {
            const destination = app._fleeDestination?.(enemy, { source: 'combat-morale' }) || null;
            if (!destination) {
                app.log.push({ text: app._label('combat.enemyFleeCornered', '{name} tries to flee but has nowhere to go!', { name: enemy.name }), type: 'combat' });
                app.renderLog();
                app.nextTurn();
                return;
            }
            app.log.push({ text: app._label('combat.enemyFlees', '{name} flees in terror!', { name: enemy.name }), type: 'combat' });
            enemy.fledCombat = true;
            app._emitCombatAction('enemy_flee', enemy, null, 'fled');
            app._relocateFleeingCreature(enemy, { source: 'combat-morale', destination });
            app.renderCreatures();
            app.renderLog();
            if (app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0).length === 0) {
                app.endCombat('disengage');
            } else {
                app.nextTurn();
            }
            return;
        }
        if (reachableTargets.length === 0) {
            app.log.push({ text: app._label('combat.enemyCannotReach', '{enemy} cannot reach {target}.', { enemy: enemy.name, target: target.name }), type: 'combat' });
            app.renderLog(); app.nextTurn(); return;
        }
        if (app._terrainCausesMiss(enemy, target, 'fight')) {
            app.renderLog(); app.nextTurn(); return;
        }
        const isRanged = enemy.ranged || enemy.antiflying;
        const targetDodge = target.flying && !isRanged && !enemy.ranged ? 0.5 : (target.swimming && !enemy.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
        if (app._targetDodgeRoll(enemy, target, 'fight') < targetDodge) {
            const dodgeKind = target.flying
                ? app._label('combat.dodge.flying', 'flying')
                : target.swimming
                    ? app._label('combat.dodge.swimming', 'swimming')
                    : app._label('combat.dodge.flexible', 'flexible');
            app.log.push({ text: app._label('combat.enemyAttackDodged', "{target} dodges {enemy}'s attack! ({kind})", {
                target: target.name,
                enemy: enemy.name,
                kind: dodgeKind
            }), type: 'combat' });
            app.renderLog(); app.nextTurn(); return;
        }
        const ar = app._combatActionRating(enemy.Figh, enemy, target, 'enemy-fight') * (enemy.rage && enemy.CPun < enemy.MPun * 0.5 ? 1.5 : 1);
        const def = app._effectiveCon(target);
        const baseDmg = Math.max(1, ar - def * 0.3 + app._combatDamageVariance(enemy, target, 'enemy-fight'));
        let dmg = Math.max(1, Math.floor(baseDmg * app._physicalDamageMultiplier(enemy, target)));
        if (enemy.bloodsuck) { enemy.CPun = Math.min(enemy.MPun, enemy.CPun + Math.floor(dmg * 0.3)); }
        target.CPun -= dmg;
        app._wakeOnDamage(target);
        app._applyAttackStatus(enemy, target, dmg);
        if (enemy.poisonous || enemy.venom) {
            target.status.poisoned = { dmg: 3, turns: 3, source: 'combat' };
            app.log.push({ text: app._label('combat.status.poisoned', '{name} is poisoned!', { name: target.name }), type: 'combat' });
        }
        if (enemy.constrictor && target.size <= 4 && !target.status.restrained) {
            target.status.restrained = { turns: 2, by: enemy.name, source: 'combat' };
            app.log.push({ text: app._label('combat.status.constricted', '{actor} constricts {target}! They are restrained.', {
                actor: enemy.name,
                target: target.name
            }), type: 'combat' });
        }
        if (enemy.enveloped && target.size <= enemy.size + 2) {
            target.status.enveloped = { turns: 2, by: enemy.name, source: 'combat' };
            app.log.push({ text: app._label('combat.status.enveloped', '{actor} envelops {target}!', {
                actor: enemy.name,
                target: target.name
            }), type: 'combat' });
        }
        let result = app._label('combat.enemyHits', '{enemy} hits {target} for {amount} punishment!', { enemy: enemy.name, target: target.name, amount: dmg });
        if (enemy.bloodsuck) result += ` ${app._label('combat.combatantHeals', '{name} heals!', { name: enemy.name })}`;
        if (target.CPun <= 0) {
            result += ` ${app._label('combat.targetFalls', '{name} falls!', { name: target.name })}`;
            if (target.name === app.player.name) {
                if (app.cheats.godMode) {
                    target.CPun = Math.max(1, target.CPun);
                    app.log.push({ text: app._label('combat.godModeSaved', 'God Mode saved you from death!'), type: 'combat' });
                    app.renderLog(); app.nextTurn(); return;
                }
                app.log.push({ text: result, type: 'combat' });
                app._emitCombatAction('enemy_fight', enemy, target, result);
                const state = app._handlePlayerFall({ cause: 'combat-damage', source: 'enemy-fight' });
                if (state?.terminal && !state?.awaitingEncounterSettlement) {
                    // Defeat recovery is rendered synchronously by handlePlayerFall/endCombat.
                    // Do not run legacy post-defeat rendering over the recovery command surface.
                    return;
                }
                app.log.push({ text: app._label(state?.terminal ? 'combat.playerDiedBattleContinues' : 'combat.playerKnockedOut', state?.terminal ? 'You have died. Your companions must finish the battle.' : 'You have been knocked out! Your party must finish the fight...'), type: 'combat' });
                app.log.push({ text: app._label('combat.alliesContinue', 'Your allies continue the fight...'), type: 'combat' });
                app.renderLog();
                app.renderParty();
                app.nextTurn();
                return;
            }
            if (app._dropPartyCorpse(target, 'fight')) {
                app.nextTurn();
                return;
            }
        }
        app.log.push({ text: result, type: 'combat' });
        app._emitCombatAction('enemy_fight', enemy, target, result);
        app.renderLog();
        app.renderParty();
        app.nextTurn();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_ENEMIES = YAW_COMBAT_ENEMIES;
}
