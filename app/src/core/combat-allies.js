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
        const scavengers = app.party.filter(p => p.CPun > 0 && app._getPartyAIOrder(p) === 'scavenger');
        if (scavengers.length === 0) return;
        for (const ally of scavengers) {
            app._combatScavengeRemains(ally, 'postCombat');
        }
        app._syncCurrentTileCreatures();
        app.renderParty();
        app.renderCreatures();
    },

    takeTurn(app, ally) {
        const charmedTargets = app._charmedTargetsFor(ally);
        const enemies = charmedTargets || app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
        if (enemies.length === 0) { app.nextTurn(); return; }
        if (app._attemptTimidAllyFlee(ally)) return;
        const order = app._getPartyAIOrder(ally);
        if (order === 'passive' && ally.CPun >= ally.MPun) {
            app.log.push({ text: app._label('combat.allyHolds', '{name} holds position.', { name: ally.name }), type: 'combat' });
            app.renderLog();
            app.nextTurn();
            return;
        }
        if (order === 'healer' && app._allyHealWounded(ally)) return;
        if (((ally.hunger || 0) > 60 || ally.CPun < ally.MPun * 0.7) && app._combatScavengeRemains(ally, 'combat')) {
            app.nextTurn();
            return;
        }
        if (ally.dumbAI) {
            if (ally.CPle >= ally.MPle * 0.9) {
                if (ally.obedient && app._combatStateRoll('combat-ally-dumb-ai', ally, 'pleasure-disobey') < 0.7) {
                    app.log.push({ text: app._label('combat.allyTooAroused', '{name} is too aroused to obey!', { name: ally.name }), type: 'combat' });
                    ally.obedient = false;
                }
            }
            if (ally.hunger > 90) {
                if (ally.obedient && app._combatStateRoll('combat-ally-dumb-ai', ally, 'hunger-plead') < 0.3) {
                    app.log.push({ text: app._label('combat.allyPleadsEat', '{name} pleads to eat...', { name: ally.name }), type: 'combat' });
                } else {
                    const weakest = enemies.reduce((w, e) => (e.CPun / e.MPun < w.CPun / w.MPun) ? e : w, enemies[0]);
                    const canEat = weakest.CPun <= weakest.MPun * 0.3 || (ally.Feas > weakest.Flee && ally.size >= weakest.size - 2);
                    if (canEat && app._canFitPrey(ally, weakest, 'stomach')) {
                        app._containTargetIn(ally, weakest, 'stomach');
                        ally.obedient = true;
                        app._awardCombatXP(app.XP_REWARDS.consumeEnemy);
                        app.log.push({ text: app._label('combat.allyStarvingEats', '{ally} is starving and eats {target}! Loyalty restored.', {
                            ally: ally.name,
                            target: weakest.name
                        }), type: 'combat' });
                        app._emitCombatAction('ally_feast', ally, weakest, 'consumed');
                        app.renderLog(); app.renderCreatures(); app.renderParty(); app.nextTurn(); return;
                    }
                }
            }
            if (ally.CPle >= ally.MPle * 0.8) {
                const target = enemies[Math.floor(app._combatStateRoll('combat-ally-dumb-ai', ally, 'spirit-target') * enemies.length) % enemies.length];
                let charm = ally.Fuck + ally.Flir + app._combatStateRoll('combat-ally-dumb-ai', ally, 'spirit-charm') * 10;
                const resist = (target.wis || 10) + (app._safeRatio(target.CPle, target.MPle) * 10);
                if (charm > resist) {
                    target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                    app.log.push({ text: app._label('combat.allyRestlessPlay', '{ally} gets restless and plays with {target}! Spirit rises to {current}/{max}.', {
                        ally: ally.name,
                        target: target.name,
                        current: target.CPle,
                        max: target.MPle
                    }), type: 'combat' });
                    if (target.CPle >= target.MPle * 0.8) {
                        target.disposition = app.DISPOSITION.FRIENDLY;
                        target.willing = true;
                        app._awardCombatXP(app.XP_REWARDS.seduceEnemy);
                        app.log.push({ text: app._label('combat.allyTargetRelaxes', '{target} relaxes around {ally}!', { target: target.name, ally: ally.name }), type: 'combat' });
                        app._emitCombatAction('ally_fuck', ally, target, 'submitted');
                    }
                    app.renderLog(); app.renderCreatures(); app.nextTurn(); return;
                }
            }
        }
        if (ally.livestock && ally.obedient) {
            const predators = app.party.filter(p => p !== ally && p.CPun > 0 && p.hunger > 50 && p.Feas > ally.Flee && p.size >= ally.size - 2 && app._canFitPrey(p, ally, 'stomach'));
            if (predators.length > 0) {
                const pred = predators.reduce((best, p) => p.hunger > best.hunger ? p : best, predators[0]);
                app._containTargetIn(pred, ally, 'stomach', { willingSacrifice: true });
                pred.obedient = true;
                app._awardCombatXP(app.XP_REWARDS.consumeEnemy);
                app.log.push({ text: app._label('combat.allyOffersSelf', "{ally} willingly offers themself to {predator}'s hunger, sliding into their belly.", {
                    ally: ally.name,
                    predator: pred.name
                }), type: 'combat' });
                app._emitCombatAction('ally_feed', ally, pred, 'sacrificed');
                app.renderLog(); app.renderCreatures(); app.renderParty(); app.nextTurn(); return;
            }
        }
        const reachableEnemies = enemies.filter(e => app._canReachCombatTarget(ally, e, 'fight'));
        if (reachableEnemies.length === 0) {
            app.log.push({ text: app._label('combat.allyCannotReach', '{name} cannot reach any target.', { name: ally.name }), type: 'combat' });
            app.renderLog(); app.nextTurn(); return;
        }
        const target = app._selectAllyAttackTarget(ally, reachableEnemies);
        if (app._terrainCausesMiss(ally, target, 'fight')) {
            app.renderLog(); app.nextTurn(); return;
        }
        const allyIsRanged = ally.ranged || ally.antiflying;
        const targetDodge = target.flying && !allyIsRanged && !ally.ranged ? 0.5 : (target.swimming && !ally.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
        if (app._targetDodgeRoll(ally, target, 'fight') < targetDodge) {
            app.log.push({ text: app._label('combat.allyAttackDodged', "{target} dodges {ally}'s attack!", { target: target.name, ally: ally.name }), type: 'combat' });
            app.renderLog(); app.nextTurn(); return;
        }
        const ar = app._combatActionRating(ally.Figh, ally, target, 'ally-fight') * (ally.rage && ally.CPun < ally.MPun * 0.5 ? 1.5 : 1);
        const def = app._effectiveCon(target);
        const baseDmg = Math.max(1, ar - def * 0.3 + app._combatDamageVariance(ally, target, 'ally-fight'));
        let dmg = Math.max(1, Math.floor(baseDmg * app._physicalDamageMultiplier(ally, target)));
        if (ally.bloodsuck) { ally.CPun = Math.min(ally.MPun, ally.CPun + Math.floor(dmg * 0.3)); }
        target.CPun -= dmg;
        app._wakeOnDamage(target);
        app._applyAttackStatus(ally, target, dmg);
        if (ally.constrictor && target.size <= 4 && !target.status.restrained) {
            target.status.restrained = { turns: 2, by: ally.name, source: 'combat' };
        }
        if (ally.poisonous || ally.venom) {
            target.status.poisoned = { dmg: 3, turns: 3, source: 'combat' };
        }
        if (ally.enveloped && target.size <= ally.size + 2) {
            target.status.enveloped = { turns: 2, by: ally.name, source: 'combat' };
        }
        let result = app._label('combat.allyAttacks', '{ally} attacks {target} for {amount} punishment!', { ally: ally.name, target: target.name, amount: dmg });
        if (ally.bloodsuck) result += ` ${app._label('combat.combatantHeals', '{name} heals!', { name: ally.name })}`;
        if (target.CPun <= 0) {
            result += ` ${app._label('combat.targetCollapses', '{name} collapses!', { name: target.name })}`;
            app._awardCombatXP(app.XP_REWARDS.defeatEnemy);
            if (app.settings.powerDynamics) {
                app._subdueCreature(target, ally, { source: 'ally-fight' });
                result += ` ${app._label('combat.subduedRecruitable', '{name} yields and may be recruited.', { name: target.name })}`;
            } else app._makeCorpse(target, 'fight');
        }
        app.log.push({ text: result, type: 'combat' });
        app._emitCombatAction('ally_fight', ally, target, result);
        app.renderLog();
        app.renderCreatures();
        app.nextTurn();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_ALLIES = YAW_COMBAT_ALLIES;
}
