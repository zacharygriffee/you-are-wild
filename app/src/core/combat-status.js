/**
 * YOU ARE WILD COMBAT STATUS
 * Shared status application, skip, and round-processing helpers.
 */

const YAW_COMBAT_STATUS = {
    combatOnlyStatusKeys: [
        'restrained', 'enveloped', 'stuck', 'stun', 'freeze', 'charm', 'fear', 'frightened',
        'restrainedSkip', 'snared', 'grabbed', 'stunned', 'frozen', 'asleep', 'recovering'
    ],
    persistentAilmentKeys: ['poisoned', 'bleed', 'burn'],

    clearCombatOnlyStatuses(units = []) {
        let changed = 0;
        for (const unit of new Set((units || []).filter(Boolean))) {
            unit.status = unit.status || {};
            for (const key of this.combatOnlyStatusKeys) {
                if (!unit.status[key]) continue;
                delete unit.status[key];
                changed++;
            }
            if (unit.status.sleep?.source === 'combat') {
                delete unit.status.sleep;
                changed++;
            }
            if (unit.refractory) {
                unit.refractory = false;
                changed++;
            }
        }
        return changed;
    },

    curePersistentAilments(units = []) {
        const curedUnits = [];
        for (const unit of new Set((units || []).filter(Boolean))) {
            unit.status = unit.status || {};
            let cured = false;
            for (const key of this.persistentAilmentKeys) {
                if (!unit.status[key]) continue;
                delete unit.status[key];
                cured = true;
            }
            if (cured) curedUnits.push(unit);
        }
        return curedUnits;
    },

    wakeOnDamage(app, unit) {
        if (unit?.status?.sleep) {
            delete unit.status.sleep;
            app.log.push({ text: `${unit.name} wakes from the hit!`, type: 'combat' });
        }
    },

    skipTurnFromStatus(app, unit) {
        const status = unit?.status || {};
        if (status.stun?.turns > 0) {
            status.stun.turns--;
            if (status.stun.turns <= 0) delete status.stun;
            return app._label('combat.status.stunned', '{name} is stunned and loses their turn!', { name: unit.name });
        }
        if (status.freeze?.skip) {
            status.freeze.skip = false;
            status.freeze.slowTurns = Math.max(status.freeze.slowTurns || 0, 2);
            return app._label('combat.status.frozen', '{name} is frozen in place and loses their turn!', { name: unit.name });
        }
        if (status.sleep?.turns > 0) {
            return app._label('combat.status.asleep', '{name} is asleep and cannot act!', { name: unit.name });
        }
        if (status.fear?.turns > 0) {
            if (app._hasPerkEffect('fearResist', unit)) {
                delete status.fear;
                return null;
            }
            const lowHp = unit.CPun < unit.MPun * 0.3;
            if (lowHp) {
                unit.fledCombat = true;
                if (!(app.party || []).includes(unit)) app._relocateFleeingCreature?.(unit, { source: 'combat-fear' });
                return app._label('combat.status.fearFlee', '{name} panics and flees from fear!', { name: unit.name });
            }
            if (app._combatStateRoll('combat-fear-freeze', unit, 'skip') < 0.5) {
                return app._label('combat.status.fearFrozen', '{name} freezes in fear and loses their turn!', { name: unit.name });
            }
        }
        return null;
    },

    applyAttackStatus(_app, actor, target, _dmg) {
        if (!target || target.CPun <= 0) return;
        target.status = target.status || {};
        if (actor?.bleedAttack) {
            const bleed = target.status.bleed || { dmg: 2, turns: 3, stacks: 0 };
            bleed.dmg = bleed.dmg || 2;
            bleed.turns = Math.max(bleed.turns || 0, 3);
            bleed.stacks = Math.min(5, (bleed.stacks || 0) + 1);
            target.status.bleed = bleed;
        }
        if (actor?.burnAttack) target.status.burn = { dmg: 3, turns: 2 };
        if (actor?.freezeAttack) target.status.freeze = { skip: true, slowTurns: 2, source: 'combat' };
        if (actor?.stunAttack) target.status.stun = { turns: 1, source: 'combat' };
        if (actor?.sleepAttack) target.status.sleep = { turns: 3, source: 'combat' };
        if (actor?.charmAttack) target.status.charm = { turns: 2, by: actor.name, source: 'combat' };
        if (actor?.fearAttack || actor?.menacing) target.status.fear = { turns: 2, by: actor.name, source: 'combat' };
    },

    charmedTargetsFor(app, unit) {
        if (!unit?.status?.charm) return null;
        if (app._hasEquipmentEffect(unit, 'focusGuard')) {
            delete unit.status.charm;
            return null;
        }
        if (app.party.includes(unit)) return app.party.filter(p => p !== unit && p.CPun > 0 && !p.knockedOut);
        return app.creatures.filter(c => c !== unit && c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
    },

    processStatusEffects(app) {
        const all = [...app.party, ...app.creatures];
        for (const unit of all) {
            unit.status = unit.status || {};
            if (unit.status.poisoned) {
                unit.CPun -= unit.status.poisoned.dmg;
                unit.status.poisoned.turns--;
                if (unit.status.poisoned.turns <= 0) delete unit.status.poisoned;
            }
            if (unit.status.bleed) {
                const stacks = Math.max(1, unit.status.bleed.stacks || 1);
                unit.CPun -= (unit.status.bleed.dmg || 2) * stacks;
                unit.status.bleed.turns--;
                if (unit.status.bleed.turns <= 0) delete unit.status.bleed;
            }
            if (unit.status.burn) {
                if (unit.status.burn.fresh) {
                    delete unit.status.burn.fresh;
                    continue;
                }
                unit.CPun -= unit.status.burn.dmg || 3;
                const spreadTarget = all.find(other => other !== unit && other.CPun > 0 && !app._isCorpse(other) && !other.status?.burn && (!unit.combatRow || other.combatRow === unit.combatRow));
                if (spreadTarget && app._combatStateRoll('combat-burn-spread', unit, app._unitSelectionId(spreadTarget)) < 0.25) {
                    spreadTarget.status = spreadTarget.status || {};
                    spreadTarget.status.burn = { dmg: 3, turns: 2, fresh: true };
                    app.log.push({ text: `${unit.name}'s burn spreads to ${spreadTarget.name}!`, type: 'combat' });
                }
                unit.status.burn.turns--;
                if (unit.status.burn.turns <= 0) delete unit.status.burn;
            }
            if (unit.status.restrained) {
                unit.status.restrained.turns--;
                if (unit.status.restrained.turns <= 0) {
                    app.log.push({ text: `${unit.name} breaks free from ${unit.status.restrained.by}!`, type: 'combat' });
                    delete unit.status.restrained;
                }
            }
            if (unit.status.enveloped) {
                unit.CPun -= 4;
                unit.status.enveloped.turns--;
                if (unit.status.enveloped.turns <= 0) {
                    app.log.push({ text: `${unit.name} escapes the envelopment!`, type: 'combat' });
                    delete unit.status.enveloped;
                }
            }
            if (unit.status.freeze?.slowTurns) {
                unit.status.freeze.slowTurns--;
                if (unit.status.freeze.slowTurns <= 0 && !unit.status.freeze.skip) delete unit.status.freeze;
            }
            if (unit.status.sleep) {
                unit.status.sleep.turns--;
                if (unit.status.sleep.turns <= 0) delete unit.status.sleep;
            }
            if (unit.status.charm) {
                unit.status.charm.turns--;
                if (unit.status.charm.turns <= 0) delete unit.status.charm;
            }
            if (unit.status.fear) {
                unit.status.fear.turns--;
                if (unit.status.fear.turns <= 0) delete unit.status.fear;
            }
            if (unit.status.frightened) delete unit.status.frightened;
            if (unit !== app.player && app.party.includes(unit) && unit.CPun <= 0) {
                app.log.push({ text: `${unit.name} succumbs to their wounds.`, type: 'combat' });
                app._dropPartyCorpse(unit, 'status');
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_STATUS = YAW_COMBAT_STATUS;
}
