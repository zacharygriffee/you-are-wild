/**
 * YOU ARE WILD COMBAT STATUS
 * Shared status application, skip, and round-processing helpers.
 */

const YAW_COMBAT_STATUS = {
    combatOnlyStatusKeys: [
        'restrained', 'enveloped', 'stuck', 'stun', 'freeze', 'charm', 'fear', 'terror', 'frightened',
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
        if (typeof YAW_STATUS_EFFECTS !== 'undefined') changed += YAW_STATUS_EFFECTS.clearCombat(units);
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
        if (!app?._sleepSystemEnabled?.()) return;
        if (unit?.status?.sleep) {
            delete unit.status.sleep;
            app.log.push({ text: app._label('combat.status.wakesOnHit', '{name} wakes from the hit!', { name: unit.name }), type: 'combat' });
        }
    },

    normalizeFearStatus(unit) {
        if (!unit) return null;
        unit.status = unit.status && typeof unit.status === 'object' && !Array.isArray(unit.status)
            ? unit.status
            : {};
        const status = unit.status;
        if (status.fear === true) status.fear = { turns: 1, source: 'legacy-fear' };
        if (status.terror === true) status.terror = { turns: 1, source: 'legacy-terror' };
        if (status.frightened) {
            const legacy = status.frightened === true ? {} : status.frightened;
            if (!status.terror) {
                status.terror = {
                    turns: Math.max(1, Number(legacy?.turns || 1)),
                    by: legacy?.by || '',
                    source: legacy?.source || 'legacy-frightened'
                };
            }
            delete status.frightened;
        }
        return status;
    },

    fearState(app, unit) {
        const status = this.normalizeFearStatus(unit) || {};
        if (app?._hasPerkEffect?.('fearResist', unit) && (status.fear || status.terror)) return 'resisted';
        if (status.terror?.turns > 0) return 'terrified';
        if (status.fear?.turns > 0 && Number(unit?.MPun || 0) > 0 && Number(unit?.CPun || 0) < Number(unit.MPun) * 0.3) {
            return 'terrified';
        }
        if (status.fear?.turns > 0) return 'afraid';
        return 'steady';
    },

    applyFearStatus(app, target, options = {}) {
        if (!target || target.CPun <= 0) return 'ignored';
        const status = this.normalizeFearStatus(target);
        const turns = Math.max(1, Number(options.turns || 2));
        const by = options.by || '';
        const source = options.source || 'combat-fear';
        if (app?._hasPerkEffect?.('fearResist', target)) {
            delete status.fear;
            delete status.terror;
            const summary = app._label('combat.status.fearResisted', '{name} holds steady and resists the fear.', { name: target.name });
            app._pushLog?.(summary, 'combat', { actor: target, action: 'fear', phase: 'resisted' });
            app.emitSceneBeat?.({
                mode: 'combat', actors: [target], action: 'fear', tags: ['fear', 'resisted'], source
            }, summary, {
                mode: 'combat', resultKind: 'status', importance: 'notable', tags: ['fear', 'resisted'], source
            });
            return 'resisted';
        }
        if (options.terror) {
            status.terror = { turns, by, source };
            return 'terrified';
        }
        status.fear = { turns, by, source };
        return 'afraid';
    },

    resolveFearTurn(app, unit) {
        const status = this.normalizeFearStatus(unit) || {};
        const state = this.fearState(app, unit);
        if (state === 'steady' || state === 'afraid') {
            return { kind: state, consumesTurn: false, summary: '' };
        }
        if (state === 'resisted') {
            delete status.fear;
            delete status.terror;
            return {
                kind: 'resisted',
                consumesTurn: false,
                summary: app._label('combat.status.fearResisted', '{name} holds steady and resists the fear.', { name: unit.name })
            };
        }
        if (!status.terror) {
            status.terror = {
                turns: Math.max(1, Number(status.fear?.turns || 1)),
                by: status.fear?.by || '',
                source: status.fear?.source || 'fear-escalation'
            };
        }
        const isParty = (app.party || []).includes(unit);
        const destination = app._fleeDestination?.(unit, {
            source: 'combat-terror',
            safeOnly: isParty
        }) || null;
        if (!destination) {
            status.terror.turns = Math.max(0, Number(status.terror.turns || 1) - 1);
            if (status.terror.turns <= 0) delete status.terror;
            return {
                kind: 'cornered',
                consumesTurn: true,
                escaped: false,
                summary: app._label('combat.status.terrorCornered', '{name} panics with nowhere safe to run and cowers through the turn.', { name: unit.name })
            };
        }
        if (isParty) {
            if (unit === app.player) {
                unit.fledCombat = true;
                app.combatState.pendingFleeOutcome = { actor: unit, destination, source: 'combat-terror' };
            } else {
                unit.fledCombat = true;
                app._relocateFleeingPartyMember?.(unit, { source: 'combat-terror', destination });
            }
        } else {
            unit.fledCombat = true;
            app._relocateFleeingCreature?.(unit, { source: 'combat-terror', destination });
        }
        return {
            kind: 'flee',
            consumesTurn: true,
            escaped: true,
            summary: app._label('combat.status.terrorFlee', '{name} breaks in terror and flees!', { name: unit.name })
        };
    },

    skipTurnFromStatus(app, unit) {
        const status = unit?.status || {};
        const moduleStatusReason = typeof YAW_STATUS_EFFECTS !== 'undefined'
            ? YAW_STATUS_EFFECTS.skipTurn(app, unit)
            : null;
        if (moduleStatusReason) return moduleStatusReason;
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
        if (app._sleepSystemEnabled?.() && status.sleep?.turns > 0) {
            return app._label('combat.status.asleep', '{name} is asleep and cannot act!', { name: unit.name });
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
        if (_app?._sleepSystemEnabled?.() && actor?.sleepAttack) target.status.sleep = { turns: 3, source: 'combat' };
        if (actor?.charmAttack) target.status.charm = { turns: 2, by: actor.name, source: 'combat' };
        if (actor?.fearAttack) this.applyFearStatus(_app, target, { turns: 2, by: actor.name, source: 'combat-attack' });
    },

    applyTechniqueStatus(app, actor, target, profile, dmg = 0) {
        const status = profile?.status;
        if (!status || !target || target.CPun <= 0 || Number(dmg) <= 0) return false;
        if (status.effect === 'sleep' && !app?._sleepSystemEnabled?.()) return false;
        const roll = app?._combatStateRoll?.('combat-technique-status', actor, `${profile.key}:${app?._unitSelectionId?.(target) || target.id || target.name}`) ?? 1;
        if (roll >= status.chance) return false;
        target.status = target.status || {};
        const source = `technique:${profile.key}`;
        if (status.effect === 'bleed') {
            const existing = target.status.bleed || { dmg: status.power, turns: status.turns, stacks: 0 };
            existing.dmg = Math.max(existing.dmg || 0, status.power);
            existing.turns = Math.max(existing.turns || 0, status.turns);
            existing.stacks = Math.min(5, (existing.stacks || 0) + 1);
            existing.source = source;
            target.status.bleed = existing;
        } else if (status.effect === 'burn') {
            target.status.burn = { dmg: status.power, turns: status.turns, source };
        } else if (status.effect === 'freeze') {
            target.status.freeze = { skip: true, slowTurns: status.turns, source };
        } else if (status.effect === 'stun') {
            target.status.stun = { turns: status.turns, source };
        } else if (status.effect === 'sleep') {
            target.status.sleep = { turns: status.turns, source };
        } else if (status.effect === 'charm') {
            target.status.charm = { turns: status.turns, by: actor?.name || '', source };
        } else if (status.effect === 'fear') {
            if (this.applyFearStatus(app, target, { turns: status.turns, by: actor?.name || '', source }) === 'resisted') {
                return false;
            }
        } else {
            return false;
        }
        return true;
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
                    app.log.push({ text: app._label('combat.status.burnSpreads', "{source}'s burn spreads to {target}!", {
                        source: unit.name,
                        target: spreadTarget.name
                    }), type: 'combat' });
                }
                unit.status.burn.turns--;
                if (unit.status.burn.turns <= 0) delete unit.status.burn;
            }
            if (unit.status.restrained) {
                unit.status.restrained.turns--;
                if (unit.status.restrained.turns <= 0) {
                    app.log.push({ text: app._label('combat.status.breaksRestraint', '{name} breaks free from {source}!', {
                        name: unit.name,
                        source: unit.status.restrained.by
                    }), type: 'combat' });
                    delete unit.status.restrained;
                }
            }
            if (unit.status.enveloped) {
                unit.CPun -= 4;
                unit.status.enveloped.turns--;
                if (unit.status.enveloped.turns <= 0) {
                    app.log.push({ text: app._label('combat.status.escapesEnvelopment', '{name} escapes the envelopment!', { name: unit.name }), type: 'combat' });
                    delete unit.status.enveloped;
                }
            }
            if (unit.status.freeze?.slowTurns) {
                unit.status.freeze.slowTurns--;
                if (unit.status.freeze.slowTurns <= 0 && !unit.status.freeze.skip) delete unit.status.freeze;
            }
            if (app._sleepSystemEnabled?.() && unit.status.sleep) {
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
            if (typeof YAW_STATUS_EFFECTS !== 'undefined') {
                YAW_STATUS_EFFECTS.processRound(unit);
            }
            if (unit !== app.player && app.party.includes(unit) && unit.CPun <= 0) {
                app.log.push({ text: app._label('combat.status.succumbsWounds', '{name} succumbs to their wounds.', { name: unit.name }), type: 'combat' });
                app._dropPartyCorpse(unit, 'status');
            }
        }
        if (app.player?.CPun <= 0 && !app.defeatState?.terminal) {
            app._handlePlayerFall?.({ cause: 'combat-status', source: 'combat-status' });
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_STATUS = YAW_COMBAT_STATUS;
}
