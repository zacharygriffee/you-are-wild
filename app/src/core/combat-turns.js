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

    emitFearOutcome(app, unit, outcome) {
        if (!outcome?.summary) return;
        app.emitSceneBeat?.({
            mode: 'combat',
            actors: [unit].filter(Boolean),
            action: outcome.kind === 'flee' ? 'flee' : 'fear',
            tags: ['fear', outcome.kind, ...(outcome.consumesTurn ? ['turn-consumed'] : [])],
            source: 'combat-fear'
        }, outcome.summary, {
            mode: 'combat',
            resultKind: 'status',
            importance: outcome.kind === 'flee' ? 'major' : 'notable',
            tags: ['fear', outcome.kind, ...(outcome.consumesTurn ? ['turn-consumed'] : [])],
            source: 'combat-fear'
        });
    },

    processTurn(app) {
        if (!app.combatState.active) return;
        if (app.cheats?.godMode && app.player?.CPun <= 0) {
            app._handlePlayerFall?.({ cause: 'combat-party-collapse', source: 'combat-turns' });
        }
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
        const statusSkip = app._skipTurnFromStatus(currentUnit);
        if (statusSkip) {
            app._pushLog(statusSkip, 'combat', { actor: currentUnit, phase: 'status' });
            this.emitSkippedTurn(app, currentUnit, statusSkip);
            app.renderLog(); app.nextTurn(); return;
        }
        const fearOutcome = app._resolveFearTurn?.(currentUnit) || { kind: 'steady', consumesTurn: false, summary: '' };
        if (fearOutcome.summary) {
            app._pushLog(fearOutcome.summary, 'combat', { actor: currentUnit, action: 'fear', phase: fearOutcome.kind });
            this.emitFearOutcome(app, currentUnit, fearOutcome);
            app.renderLog();
        }
        if (fearOutcome.consumesTurn) {
            const pendingFlee = app.combatState?.pendingFleeOutcome;
            if (pendingFlee?.actor === currentUnit) {
                app._retreatPartyFromCombat?.(currentUnit, {
                    source: pendingFlee.source || 'combat-terror',
                    destination: pendingFlee.destination
                });
                app.combatState.pendingFleeOutcome = null;
                app.endCombat('flee');
                return;
            }
            app.renderParty();
            app.renderCreatures();
            const livingEnemiesAfterFear = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
            if (livingEnemiesAfterFear.length === 0) {
                app.endCombat('disengage');
                return;
            }
            app.nextTurn();
            return;
        }
        const activeSync = app.combatState.syncActions.find(s =>
            !s.resolved &&
            s.round === app.combatState.round &&
            s.resolveAtIndex === app.combatState.currentTurn &&
            (typeof YAW_COMBAT_SYNC !== 'undefined'
                ? YAW_COMBAT_SYNC.isParticipant(app, s, currentUnit)
                : s.participants.includes(currentUnit))
        );
        if (activeSync) {
            app._resolveSyncAction(activeSync);
            return;
        }
        const livingEnemies = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
        const livingParty = app.party.filter(p => p.CPun > 0 && !p.knockedOut && !p.fledCombat);
        if (livingEnemies.length === 0) { app.endCombat(true); return; }
        if (livingParty.length === 0) { app.endCombat(false); return; }
        const companionControl = app.party.includes(currentUnit) && currentUnit !== app.player
            ? app._getCompanionControl?.(currentUnit)
            : 'manual';
        const committedGroup = companionControl !== 'manual' && typeof YAW_COMBAT_SYNC !== 'undefined'
            ? YAW_COMBAT_SYNC.pendingParticipantAction(app, currentUnit)
            : null;
        if (committedGroup && app.combatState.currentTurn < committedGroup.resolveAtIndex) {
            // A committed group participant waits for the collective resolution.
            // This remains authoritative even if a restored queue lost actedThisRound.
            entry.actedThisRound = true;
            app.nextTurn();
            return;
        }
        if (entry.actedThisRound) { app.nextTurn(); return; }
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
        if (isParty && (currentUnit.name === app.player.name || companionControl === 'manual')) {
            app.combatState.presentationAutomatic = false;
            app.showActorActions(currentUnit);
        } else if (isParty) {
            app.combatState.presentationAutomatic = true;
            app.allyTurn(currentUnit);
        } else {
            app.combatState.presentationAutomatic = true;
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
        // A group reserved from the previous round owns every participant's
        // individual turn until its scheduled collective resolution point.
        // This prevents autonomous behavior from breaking the commitment.
        app.combatState.syncActions = (app.combatState.syncActions || []).filter(sync =>
            !sync.resolved && Number(sync.round || 0) >= app.combatState.round
        );
        for (const sync of app.combatState.syncActions) {
            if (sync.round !== app.combatState.round) continue;
            for (const entry of app.combatState.turnQueue) {
                const participant = typeof YAW_COMBAT_SYNC !== 'undefined'
                    ? YAW_COMBAT_SYNC.isParticipant(app, sync, entry.unit)
                    : sync.participants.includes(entry.unit);
                if (participant) entry.actedThisRound = true;
            }
        }
        app._pushLog(app._label('combat.roundDivider', '--- Round {round} ---', { round: app.combatState.round }), 'combat', { phase: 'round' });
        app.renderMobileCombatToolbelt();
        for (const c of living) app._applyHungerPressure?.(c, 3, {
            action: 'combat-round',
            source: 'combat-round'
        });
        if (typeof YAW_RESTRAINTS !== 'undefined') YAW_RESTRAINTS.tick(app);
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
