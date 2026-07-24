/**
 * YOU ARE WILD COMBAT TURNS
 * Shared combat turn-loop and round orchestration helpers.
 */

const YAW_COMBAT_TURNS = {
    emitSkippedTurn(app, unit, summary, tags = []) {
        app.emitSceneBeat?.({
            mode: 'combat',
            actors: [unit].filter(Boolean),
            action: 'skip',
            tags: ['status', 'turn-skipped', ...tags],
            source: 'combat-status'
        }, summary, {
            mode: 'combat',
            resultKind: 'status',
            importance: 'notable',
            tags: ['status', 'turn-skipped', ...tags],
            source: 'combat-status'
        });
    },

    processTurn(app) {
        if (!app.combatState.active) return;
        app._sanitizeCombatState({ preserveTurn: true });
        const livingEnemiesNow = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
        const livingPartyNow = app.party.filter(p => p.CPun > 0 && !p.knockedOut && !p.fledCombat);
        if (livingEnemiesNow.length === 0) { app.endCombat(true); return; }
        if (livingPartyNow.length === 0) {
            const healthyFledPlayer = app.player?.CPun > 0 && !app.player?.knockedOut && app.player?.fledCombat;
            if (healthyFledPlayer) {
                const pending = app.combatState?.pendingFleeOutcome || null;
                const destination = pending?.destination
                    || app._fleeDestination?.(app.player, { source: pending?.source || 'combat-flee-recovery', safeOnly: true })
                    || null;
                if (destination) app._retreatPartyFromCombat?.(app.player, { source: 'combat-flee-recovery', destination });
                app.combatState.pendingFleeOutcome = null;
                app.endCombat('flee');
            } else {
                app.endCombat(false);
            }
            return;
        }
        const queue = app.combatState.turnQueue;
        if (app.combatState.currentTurn >= queue.length) {
            app._newRound(); return;
        }
        const entry = queue[app.combatState.currentTurn];
        if (!entry) { app.nextTurn(); return; }
        const currentUnit = entry.unit || entry.unit;
        if (!currentUnit || currentUnit.CPun <= 0 || currentUnit.knockedOut || currentUnit.fledCombat) { app.nextTurn(); return; }
        if (currentUnit.refractory) {
            currentUnit.refractory = false;
            const summary = app._label('combat.status.recovering', '{name} is recovering and skips their turn.', { name: currentUnit.name });
            app._pushLog(summary, 'combat', { actor: currentUnit, phase: 'skip' });
            this.emitSkippedTurn(app, currentUnit, summary, ['recovering']);
            app.renderLog();
            app.nextTurn();
            return;
        }
        const activeSync = app.combatState.syncActions.find(s =>
            !s.resolved &&
            s.round === app.combatState.round &&
            s.resolveAtIndex === app.combatState.currentTurn &&
            s.participants.includes(currentUnit)
        );
        if (activeSync) {
            app._resolveSyncAction(activeSync);
            return;
        }
        const livingEnemies = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
        const livingParty = app.party.filter(p => p.CPun > 0 && !p.knockedOut && !p.fledCombat);
        if (livingEnemies.length === 0) { app.endCombat(true); return; }
        if (livingParty.length === 0) { app.endCombat(false); return; }
        if (entry.actedThisRound) { app.nextTurn(); return; }
        const statusSkip = app._skipTurnFromStatus(currentUnit);
        if (statusSkip) {
            app._pushLog(statusSkip, 'combat', { actor: currentUnit, phase: 'status' });
            this.emitSkippedTurn(app, currentUnit, statusSkip);
            const pendingFlee = app.combatState?.pendingFleeOutcome;
            if (pendingFlee?.actor === currentUnit) {
                app.renderLog();
                app._retreatPartyFromCombat?.(currentUnit, {
                    source: pendingFlee.source || 'combat-fear',
                    destination: pendingFlee.destination
                });
                app.combatState.pendingFleeOutcome = null;
                app.endCombat('flee');
                return;
            }
            app.renderLog(); app.nextTurn(); return;
        }
        if (currentUnit.status?.restrained && currentUnit.status.restrained.turns > 0) {
            const summary = app._label('combat.status.restrainedSkip', '{name} is restrained and cannot act!', { name: currentUnit.name });
            app._pushLog(summary, 'combat', { actor: currentUnit, phase: 'status' });
            this.emitSkippedTurn(app, currentUnit, summary, ['restrained']);
            app.renderLog(); app.nextTurn(); return;
        }
        if (currentUnit.status?.stuck && currentUnit.status.stuck.turns > 0) {
            currentUnit.status.stuck.turns--;
            if (currentUnit.status.stuck.turns <= 0) delete currentUnit.status.stuck;
            const summary = app._label('combat.status.stuck', '{name} is stuck in the terrain and loses their turn!', { name: currentUnit.name });
            app._pushLog(summary, 'combat', { actor: currentUnit, phase: 'terrain' });
            this.emitSkippedTurn(app, currentUnit, summary, ['stuck']);
            app.renderLog(); app.nextTurn(); return;
        }
        if (currentUnit.status?.enveloped && currentUnit.status.enveloped.turns > 0) {
            currentUnit.CPun -= 4;
            const summary = app._label('combat.status.envelopedBy', '{name} is enveloped by {source}!', {
                name: currentUnit.name,
                source: currentUnit.status.enveloped.by
            });
            app._pushLog(summary, 'combat', { actor: currentUnit, phase: 'status' });
            this.emitSkippedTurn(app, currentUnit, summary, ['enveloped']);
            if (currentUnit.CPun <= 0) app._pushLog(app._label('combat.status.succumbsEnvelopment', '{name} succumbs to the envelopment!', { name: currentUnit.name }), 'combat', { actor: currentUnit, phase: 'status' });
            app.renderLog(); app.nextTurn(); return;
        }
        app.renderCombatSceneForTurn(currentUnit);
        app.renderParty();
        app.renderCreatures();
        app.renderMobileCombatToolbelt();
        app._writeCombatRefreshSnapshot();
        const isParty = app.party.includes(currentUnit);
        if (isParty && (currentUnit.name === app.player.name || currentUnit.obedient !== false)) {
            app.showActorActions(currentUnit);
        } else if (isParty) {
            app.allyTurn(currentUnit);
        } else {
            app.enemyTurn(currentUnit);
        }
    },

    newRound(app) {
        if (app.combatState?.round > 0 && typeof YAW_NARRATION_SYSTEM !== 'undefined') {
            YAW_NARRATION_SYSTEM.closeExchange(app, `${app.combatState.sceneExchangeId}-round-${app.combatState.round}`, { reason: 'combat-round-closed' });
        }
        const living = [...app.party.filter(p => p.CPun > 0 && !p.knockedOut && !p.fledCombat), ...app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0)];
        app._assignCombatRows(living);
        app.combatState.turnQueue = living.map(c => ({ unit: c, initiative: app._calcInitiative(c), actedThisRound: false })).sort((a, b) => b.initiative - a.initiative);
        app.combatState.currentTurn = 0;
        app.combatState.round++;
        app._pushLog(app._label('combat.roundDivider', '--- Round {round} ---', { round: app.combatState.round }), 'combat', { phase: 'round' });
        app.renderMobileCombatToolbelt();
        for (const c of living) {
            if (!app.cheats.neverHungry) {
                c.hunger = Math.min(100, (c.hunger || 0) + 3);
            }
        }
        app._processStatusEffects();
        app._applyTerrainRoundEffects(living);
        app._processDigestion();
        app._processCorpseDecay();
        app._sanitizeCombatState({ preserveTurn: false });
        app.processTurn();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_TURNS = YAW_COMBAT_TURNS;
}
