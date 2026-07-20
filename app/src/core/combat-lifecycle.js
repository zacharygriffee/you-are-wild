/**
 * YOU ARE WILD COMBAT LIFECYCLE
 * Combat turn advancement and encounter completion helpers.
 */

const YAW_COMBAT_LIFECYCLE = {
    start(app, enemies) {
        app.closeTransactionWindow?.();
        app.closeHoldingsWindow?.();
        app._clearTransientInteractionState();
        app._normalizeExplorationSelections({ resetTargets: true });
        app.mode = app.GAME_MODE.COMBAT;
        app.combatState.active = true;
        app.combatState.round = 1;
        app.combatState.sceneExchangeId = `combat-${(Number(app.storyEventSeq) || 0) + 1}`;
        app.combatState.syncActions = [];
        app.combatState.xpEarned = 0;
        app.party.forEach(p => app._normalizeUnit(p, { disposition: app.DISPOSITION.PARTY }));
        enemies.forEach(e => app._normalizeUnit(e, { disposition: app.DISPOSITION.ENEMY }));
        const allCombatants = [...app.party, ...enemies];
        app._assignCombatRows(allCombatants);
        app.combatState.turnQueue = allCombatants
            .filter(c => c.CPun > 0 && !c.knockedOut)
            .map(c => ({ unit: c, initiative: app._calcInitiative(c) + (c.ambushReady ? app._ambushInitiativeBonus() : 0) }))
            .sort((a, b) => b.initiative - a.initiative);
        app.combatState.currentTurn = 0;
        const ambushers = enemies.filter(e => e.ambushReady);
        if (ambushers.length > 0) app._pushLog(`${ambushers.map(e => e.name).join(', ')} ambush from hiding!`, 'combat', { phase: 'start' });
        app._pushLog(`Combat! Order: ${app.combatState.turnQueue.map(e => e.unit.name).join(', ')}`, 'combat', { phase: 'start' });
        app.updateScene(`Round 1`, `Combat started!`, true);
        const rangedBackRowEnemies = enemies.filter(unit => unit?.CPun > 0 && unit.ranged && unit.combatRow === 'back');
        if (rangedBackRowEnemies.length && typeof app.emitStoryResult === 'function') {
            const names = rangedBackRowEnemies.map(unit => unit.name || app._label('unit.generic', 'unit')).join(', ');
            const summary = app._label('combat.intro.rangedBackRow', '{names} keep their distance, attacking from the back row.', { names });
            app.emitStoryResult({
                mode: 'combat',
                action: 'position',
                shape: 'combat-intro',
                actors: rangedBackRowEnemies,
                targets: app.party,
                tags: ['row', 'ranged'],
                source: 'combat-start'
            }, summary, {
                resultKind: 'positioning',
                importance: 'hint',
                tags: ['row', 'ranged']
            });
        }
        app._emitModuleHook('onEncounterStart', {
            enemies,
            party: app.party,
            round: app.combatState.round,
            tile: app._currentExplorationTile()
        });
        app.renderParty();
        app.renderCreatures();
        app.renderMobileCombatToolbelt();
        app.processTurn();
    },

    nextTurn(app) {
        if (!app.combatState.active) return;
        app._sanitizeCombatState({ preserveTurn: false });
        app.combatState.currentTurn++;
        if (app.combatState.currentTurn >= app.combatState.turnQueue.length) {
            app._newRound();
            return;
        }
        app.processTurn();
    },

    endCombat(app, result) {
        const outcome = result === true ? 'victory' : result === false ? 'defeat' : (result || 'victory');
        let pendingPlayerDeath = Boolean(app.defeatState?.pending && app.defeatState?.terminal);
        if (app.combatState?.sceneExchangeId && app.combatState?.round > 0 && typeof YAW_NARRATION_SYSTEM !== 'undefined') {
            YAW_NARRATION_SYSTEM.closeExchange(app, `${app.combatState.sceneExchangeId}-round-${app.combatState.round}`, { reason: 'combat-ended' });
        }
        YAW_COMBAT_STATUS.clearCombatOnlyStatuses([app.player, ...app.party, ...app.creatures]);
        app.mode = app.GAME_MODE.NORMAL;
        app.combatState.active = false;
        app.combatState.processing = false;
        app.combatState.turnQueue = [];
        app.combatState.currentTurn = 0;
        app.combatState.syncActions = [];
        app.activeActor = null;
        app._clearTransientInteractionState();
        app._clearCombatRefreshSnapshot(app.activeSlot);
        if (outcome === 'defeat' && !pendingPlayerDeath) {
            app._markDefeat(outcome);
            pendingPlayerDeath = Boolean(app.defeatState?.pending && app.defeatState?.terminal);
        }
        if (pendingPlayerDeath) app._settleDefeatedEncounter?.(outcome);
        app.party.forEach(p => { p.fledCombat = false; });
        if (!pendingPlayerDeath && outcome !== 'defeat' && app.player?.knockedOut) {
            app.player.knockedOut = false;
            app.player.CPun = Math.max(1, app.player.CPun || 0);
            app._resolvePlayerState?.({ status: 'active', terminal: false, cause: 'rescued-after-combat', source: 'combat-lifecycle' });
            app.defeatState = null;
            app.log.push({ text: app._label('combat.playerComesTo', '{name} comes to after the fight.', { name: app.player.name }), type: 'discovery' });
        }
        if (outcome === 'victory') {
            app.log.push({ text: app._label(pendingPlayerDeath ? 'combat.companionsVictoryAfterDeath' : 'combat.victory', pendingPlayerDeath ? 'Your companions finish the battle, but you did not survive.' : 'Victory! Enemies defeated or subdued.'), type: pendingPlayerDeath ? 'combat' : 'discovery' });
            const texts = [
                'The battlefield falls silent.',
                'Your enemies lie defeated.',
                'Another victory, another meal.',
                'You emerge from the chaos unscathed.'
            ];
            const roll = app._combatStateRoll('combat-victory-scene', app.player, 'victory-text');
            const index = Math.min(texts.length - 1, Math.floor(roll * texts.length));
            app.updateScene('Victory', texts[index], false);
            if (!pendingPlayerDeath) app.gainXP(app.combatState.xpEarned || app.XP_REWARDS.defeatEnemy);
            for (const c of pendingPlayerDeath ? [] : app.creatures) {
                if (c.disposition === app.DISPOSITION.FRIENDLY && c.CPun > 0) {
                    app.log.push({ text: `${c.name} looks ready to follow you...`, type: 'discovery' });
                }
            }
            if (!pendingPlayerDeath) app._runPostCombatScavengers();
        } else if (outcome === 'flee') {
            app.log.push({ text: app._label('combat.escapedEncounter', 'You escaped the encounter.'), type: 'move' });
            app.updateScene('Escaped', 'You put distance between yourself and danger.', false);
        } else if (outcome === 'disengage') {
            app.log.push({ text: app._label('combat.disengaged', 'The encounter breaks off.'), type: 'move' });
            app.updateScene('Disengaged', app._label('combat.disengaged', 'The encounter breaks off.'), false);
        } else {
            app.log.push({ text: app._label('combat.defeat', 'Defeat...'), type: 'combat' });
            app.updateScene('Defeat', 'Darkness claims you...', false);
        }
        if (!pendingPlayerDeath && outcome !== 'defeat') app.renderMap();
        app.renderLog();
        if (pendingPlayerDeath) {
            app.renderParty();
            app.renderCreatures();
            app.showDefeatRecovery();
        } else {
            if ((app.player?.pendingPerkChoices || 0) > 0) app.showPerkSelection();
            else app.renderParty();
            app.renderCreatures();
            app.showExplorationActions();
            app.renderMobileCombatToolbelt();
        }
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'combat', 'quests', 'sceneFeed', 'activityLog'], `combat-end-${outcome}`);
        app.autoSave();
    },

    confirmDefeatReturnToMenu(app) {
        return app.showConfirmDialog({
            title: app._label('combat.defeat', 'Defeat...'),
            message: app._label('combat.confirmReturnToMenu', 'Defeat! Return to menu?'),
            confirmLabel: app._label('ui.returnToMenu', 'Return to Menu'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            danger: true,
            onConfirm: () => app.showScreen('menu')
        });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_LIFECYCLE = YAW_COMBAT_LIFECYCLE;
}
