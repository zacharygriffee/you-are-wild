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
        if (targets.length === 0) return;
        const target = app._selectEnemyTarget(enemy, targets);
        if (enemy.menacing && target.CPun / target.MPun < 0.4
            && app._combatStateRoll('combat-menacing-fear', enemy, app._unitSelectionId(target)) < 0.3) {
            app.log.push({ text: `${enemy.name} is terrifying! ${target.name} cowers in fear.`, type: 'combat' });
            target.status.frightened = true;
            app.renderLog();
        }
        if (enemy.rage && enemy.CPun < enemy.MPun * 0.5) {
            app.log.push({ text: app._label('combat.enemyRage', '{name} enters a rage!', { name: enemy.name }), type: 'combat' });
        }
        app._enemyCallReinforcement(enemy);
        if (app._enemyShouldFlee(enemy, targets)) {
            app.log.push({ text: app._label('combat.enemyFlees', '{name} flees in terror!', { name: enemy.name }), type: 'combat' });
            enemy.fledCombat = true;
            app._emitCombatAction('enemy_flee', enemy, null, 'fled');
            app._removeCreatureFromArea(enemy);
            app.renderCreatures();
            app.renderLog();
            if (app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0).length === 0) {
                app.endCombat('disengage');
            } else {
                app.nextTurn();
            }
            return;
        }
        if (!app._canReachCombatTarget(enemy, target, 'fight')) {
            app.log.push({ text: app._label('combat.enemyCannotReach', '{enemy} cannot reach {target}.', { enemy: enemy.name, target: target.name }), type: 'combat' });
            app.renderLog(); app.nextTurn(); return;
        }
        if (app._terrainCausesMiss(enemy, target, 'fight')) {
            app.renderLog(); app.nextTurn(); return;
        }
        const isRanged = enemy.ranged || enemy.antiflying;
        const targetDodge = target.flying && !isRanged && !enemy.ranged ? 0.5 : (target.swimming && !enemy.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
        if (app._targetDodgeRoll(enemy, target, 'fight') < targetDodge) {
            app.log.push({ text: `${target.name} dodges ${enemy.name}'s attack! (${target.flying ? 'flying' : target.swimming ? 'swimming' : 'floopy'})`, type: 'combat' });
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
            target.status.poisoned = { dmg: 3, turns: 3 };
            app.log.push({ text: app._label('combat.status.poisoned', '{name} is poisoned!', { name: target.name }), type: 'combat' });
        }
        if (enemy.constrictor && target.size <= 4 && !target.status.restrained) {
            target.status.restrained = { turns: 2, by: enemy.name };
            app.log.push({ text: app._label('combat.status.constricted', '{actor} constricts {target}! They are restrained.', {
                actor: enemy.name,
                target: target.name
            }), type: 'combat' });
        }
        if (enemy.enveloped && target.size <= enemy.size + 2) {
            target.status.enveloped = { turns: 2, by: enemy.name };
            app.log.push({ text: app._label('combat.status.enveloped', '{actor} envelops {target}!', {
                actor: enemy.name,
                target: target.name
            }), type: 'combat' });
        }
        let result = `${enemy.name} hits ${target.name} for ${dmg} punishment!`;
        if (enemy.bloodsuck) result += ` ${enemy.name} heals!`;
        if (target.CPun <= 0) {
            result += ` ${target.name} falls!`;
            if (target.name === app.player.name) {
                if (app.cheats.godMode) {
                    target.CPun = Math.max(1, target.CPun);
                    app.log.push({ text: app._label('combat.godModeSaved', 'God Mode saved you from death!'), type: 'combat' });
                    app.renderLog(); app.nextTurn(); return;
                }
                app.log.push({ text: app._label('combat.playerFallen', 'You have fallen! Game Over!'), type: 'combat' });
                app.renderLog();
                if (app.settings.hardcore) {
                    app.log.push({ text: app._label('combat.hardcoreSaveDeleted', 'HARDCORE MODE: Your save has been deleted.'), type: 'combat' });
                    app.renderLog();
                    app._removeStoredValue('lastSlot');
                    app._removeStoredValue('lastSaveTime');
                    for (let i = 1; i <= 5; i++) {
                        app._removeSaveTime('slot' + i);
                    }
                    app._dbDelete('saves', app.activeSlot).catch(() => {});
                    setTimeout(() => { App.showScreen('menu'); }, 2000);
                } else {
                    target.CPun = 0;
                    target.CPle = 0;
                    target.knockedOut = true;
                    app.log.push({ text: app._label('combat.playerKnockedOut', 'You have been knocked out! Your party must finish the fight...'), type: 'combat' });
                    app.renderLog(); app.renderParty();
                    const livingAllies = app.party.filter(p => p.CPun > 0 && !p.knockedOut && p.name !== app.player.name);
                    if (livingAllies.length === 0) {
                        app.log.push({ text: app._label('combat.partyWipedOut', 'Your party has been wiped out!'), type: 'combat' });
                        app.renderLog();
                        setTimeout(() => { App.showScreen('menu'); }, 2000);
                        app.endCombat('defeat');
                        return;
                    }
                    app.log.push({ text: app._label('combat.alliesContinue', 'Your allies continue the fight...'), type: 'combat' });
                    app.renderLog();
                    app.nextTurn(); return;
                }
                app.combatState.active = false;
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
