/**
 * YOU ARE WILD COMBAT LIFECYCLE
 * Combat turn advancement and encounter completion helpers.
 */

const YAW_COMBAT_LIFECYCLE = {
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
        app.mode = app.GAME_MODE.NORMAL;
        app.combatState.active = false;
        app.combatState.processing = false;
        app.combatState.turnQueue = [];
        app.combatState.currentTurn = 0;
        app.combatState.syncActions = [];
        app.activeActor = null;
        app._clearTransientInteractionState();
        app._clearCombatRefreshSnapshot(app.activeSlot);
        app.party.forEach(p => { p.fledCombat = false; });
        if (app.player?.knockedOut) {
            app.player.knockedOut = false;
            app.player.CPun = Math.max(1, app.player.CPun || 0);
            app.log.push({ text: app._label('combat.playerComesTo', '{name} comes to after the fight.', { name: app.player.name }), type: 'discovery' });
        }
        if (outcome === 'victory') {
            app.log.push({ text: app._label('combat.victory', 'Victory! Enemies defeated or subdued.'), type: 'discovery' });
            const texts = [
                'The battlefield falls silent.',
                'Your enemies lie defeated.',
                'Another victory, another feast.',
                'You emerge from the chaos unscathed.'
            ];
            const roll = app._combatStateRoll('combat-victory-scene', app.player, 'victory-text');
            const index = Math.min(texts.length - 1, Math.floor(roll * texts.length));
            app.updateScene('Victory', texts[index], false);
            app.gainXP(app.combatState.xpEarned || app.XP_REWARDS.defeatEnemy);
            for (const c of app.creatures) {
                if (c.disposition === app.DISPOSITION.FRIENDLY && c.CPun > 0) {
                    app.log.push({ text: `${c.name} looks at you with submissive eyes...`, type: 'discovery' });
                }
            }
            app._runPostCombatScavengers();
        } else if (outcome === 'flee') {
            app.log.push({ text: app._label('combat.escapedEncounter', 'You escaped the encounter.'), type: 'move' });
            app.updateScene('Escaped', 'You put distance between yourself and danger.', false);
        } else if (outcome === 'disengage') {
            app.log.push({ text: app._label('combat.disengaged', 'The encounter breaks off.'), type: 'move' });
            app.updateScene('Disengaged', app._label('combat.disengaged', 'The encounter breaks off.'), false);
        } else {
            app.log.push({ text: app._label('combat.defeat', 'Defeat...'), type: 'combat' });
            app.updateScene('Defeat', 'Darkness claims you...', false);
            setTimeout(() => { app._confirmDefeatReturnToMenu(); }, 1500);
        }
        app.renderLog();
        app.renderParty();
        app.renderCreatures();
        app.showExplorationActions();
        app.renderMobileCombatToolbelt();
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
