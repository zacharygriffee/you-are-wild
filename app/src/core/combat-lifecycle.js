/**
 * YOU ARE WILD COMBAT LIFECYCLE
 * Combat turn advancement and encounter completion helpers.
 */

const YAW_COMBAT_LIFECYCLE = {
    publicOutcome(app, outcome) {
        const summarize = unit => Object.freeze({
            id: String(app._unitSelectionId?.(unit) || unit?.id || unit?.name || 'unit'),
            name: String(unit?.name || 'Unit').slice(0, 120),
            species: String(unit?.species || '').slice(0, 80),
            disposition: String(unit?.disposition || '').slice(0, 40),
            active: Boolean((Number(unit?.CPun) || 0) > 0 && !unit?.knockedOut && !app._isCorpse?.(unit))
        });
        const participants = [...new Set([...(app.party || []), ...(app.creatures || [])])]
            .slice(0, 64)
            .map(summarize);
        const tile = app._currentExplorationTile?.() || {};
        return Object.freeze({
            version: 1,
            encounterId: String(app.combatState?.sceneExchangeId || `encounter:${Number(tile.x) || 0},${Number(tile.y) || 0}`).slice(0, 160),
            result: String(outcome || 'victory').slice(0, 32),
            round: Math.max(0, Math.floor(Number(app.combatState?.round) || 0)),
            xpEarned: Math.max(0, Math.floor(Number(app.combatState?.xpEarned) || 0)),
            location: Object.freeze({
                x: Number(tile.x) || 0,
                y: Number(tile.y) || 0,
                biome: String(tile.biome || '').slice(0, 80),
                structure: String(tile.structure || '').slice(0, 80)
            }),
            participants: Object.freeze(participants)
        });
    },

    admission(app, enemies, options = {}) {
        const hostiles = app._livingEnemies(Array.isArray(enemies) ? enemies : app.creatures);
        if (app.combatState?.active) return { allowed: false, reason: 'already-active', enemies: hostiles };
        if (!hostiles.length) return { allowed: false, reason: 'no-hostiles', enemies: [] };
        if (app.cheats?.noEnemies) return { allowed: false, reason: 'cheat-no-enemies', enemies: hostiles };
        if (YAW_RECOVERY_MODES?.isJourney?.(app) || app._recoveryRestricts?.('combat')) {
            return { allowed: false, reason: 'recovery-journey', enemies: hostiles };
        }
        const defeatState = YAW_DEFEAT_RECOVERY?.migrateState?.(app, app.defeatState);
        if (defeatState?.pending || defeatState?.terminal) {
            app.defeatState = defeatState;
            return { allowed: false, reason: 'defeat-recovery', enemies: hostiles };
        }
        const playerReady = Boolean(app.player
            && app.player.CPun > 0
            && !app.player.knockedOut
            && !app._isCorpse(app.player));
        if (!playerReady) {
            const nonterminal = defeatState
                && !defeatState.terminal
                && ['captured', 'incapacitated'].includes(defeatState.status);
            if (nonterminal) {
                app.defeatState = defeatState;
                return { allowed: false, reason: `player-${defeatState.status}`, enemies: hostiles };
            }
            app._handlePlayerFall?.({
                fatal: true,
                cause: 'unresolved-player-defeat',
                source: String(options.source || 'encounter-admission')
            });
            return { allowed: false, reason: 'defeat-recovery', enemies: hostiles };
        }
        return { allowed: true, reason: 'ready', enemies: hostiles };
    },

    presentBlockedAdmission(app, admission, options = {}) {
        if (!admission || admission.allowed) return false;
        if (admission.reason === 'recovery-journey') {
            const names = admission.enemies.map(enemy => enemy.name || app._label('unit.generic', 'unit')).join(', ');
            const text = app._label('recovery.ghostEncounterSuppressed', 'As a ghost, you pass through {names}; no battle begins.', { names });
            if (options.announce !== false) {
                app.log.push({ text, type: 'discovery' });
                app._addTileEvent?.(text, 'discovery');
                app.showToast?.({ text, type: 'system', importance: 'notable', dedupeKey: `ghost-encounter:${app.location?.x},${app.location?.y}` });
            }
            app._showRecoveryJourney?.();
            app.renderLog?.();
            return true;
        }
        if (admission.reason === 'defeat-recovery') {
            app.showDefeatRecovery?.();
            return true;
        }
        if (admission.reason === 'player-captured' || admission.reason === 'player-incapacitated') {
            const text = app._label('recovery.encounterUnavailable', 'You cannot enter a new battle while {status}.', {
                status: admission.reason === 'player-captured'
                    ? app._label('recovery.state.captured', 'captured')
                    : app._label('recovery.state.incapacitated', 'incapacitated')
            });
            if (options.announce !== false) {
                app.log.push({ text, type: 'discovery' });
                app._addTileEvent?.(text, 'discovery');
            }
            app.updateScene?.(app._label('recovery.unavailableTitle', 'Unable to Fight'), text, false);
            app.renderLog?.();
            return true;
        }
        return false;
    },

    ensureCurrentEncounter(app, options = {}) {
        const admission = this.admission(app, app.creatures, options);
        if (!admission.allowed) {
            this.presentBlockedAdmission(app, admission, options);
            return admission;
        }
        if (options.announce !== false) {
            const names = admission.enemies.map(enemy => enemy.name || app._label('unit.generic', 'unit')).join(', ');
            const text = app._label('encounter.hostile', 'You encounter {names}! They are aggressive!', { names });
            app.log.push({ text, type: 'combat' });
            app._addTileEvent?.(text, 'combat');
            app.showToast?.({ text, type: 'danger', importance: 'major', dedupeKey: `encounter:${app.location?.x},${app.location?.y}` });
        }
        this.start(app, admission.enemies, { ...options, admission });
        return { ...admission, started: true };
    },

    start(app, enemies, options = {}) {
        const admission = options.admission || this.admission(app, enemies, options);
        if (!admission.allowed) {
            this.presentBlockedAdmission(app, admission, options);
            return false;
        }
        enemies = admission.enemies;
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
        app._prepareCombatRows(allCombatants);
        const ambushAwareness = app._resolveAmbushAwareness?.(enemies) || {
            detected: [],
            undetected: enemies.filter(enemy => enemy?.ambushReady)
        };
        app.combatState.turnQueue = allCombatants
            .filter(c => c.CPun > 0 && !c.knockedOut)
            .map(c => ({ unit: c, initiative: app._calcInitiative(c) + (c.ambushReady ? app._ambushInitiativeBonus() : 0) }))
            .sort((a, b) => b.initiative - a.initiative);
        app.combatState.currentTurn = 0;
        const detectedAmbushers = ambushAwareness.detected || [];
        const ambushers = ambushAwareness.undetected || enemies.filter(e => e.ambushReady);
        if (detectedAmbushers.length > 0) {
            app._pushLog(app._label(
                'combat.ambushDetected',
                'Your party spots {names} before they can strike; combat begins normally.',
                { names: detectedAmbushers.map(e => e.name).join(', ') }
            ), 'combat', { phase: 'start' });
        }
        if (ambushers.length > 0) app._pushLog(app._label('combat.ambushStart', '{names} ambush from hiding!', { names: ambushers.map(e => e.name).join(', ') }), 'combat', { phase: 'start' });
        for (const enemy of [...detectedAmbushers, ...ambushers]) {
            enemy.ambushReady = false;
            enemy.ambushResolved = true;
        }
        app._pushLog(app._label('combat.orderStart', 'Combat! Order: {names}', { names: app.combatState.turnQueue.map(e => e.unit.name).join(', ') }), 'combat', { phase: 'start' });
        app.updateScene(app._label('combat.roundTitle', 'Round {round}', { round: 1 }), app._label('combat.started', 'Combat started!'), true);
        const rangedBackRowEnemies = enemies.filter(unit => unit?.CPun > 0 && unit.ranged && unit.combatRow === 'back');
        if (rangedBackRowEnemies.length && typeof app.emitStoryResult === 'function') {
            const names = rangedBackRowEnemies.map(unit => unit.name || app._label('unit.generic', 'unit')).join(', ');
            const singular = rangedBackRowEnemies.length === 1;
            const summary = app._label(
                singular ? 'combat.intro.rangedBackRow.one' : 'combat.intro.rangedBackRow',
                singular ? '{names} keeps their distance, attacking from the back row.' : '{names} keep their distance, attacking from the back row.',
                { names }
            );
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
        if (typeof YAW_AUDIO_RUNTIME !== 'undefined') YAW_AUDIO_RUNTIME.play('encounter.start');
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
        const publicOutcome = this.publicOutcome(app, outcome);
        if (typeof YAW_COMBAT_PACING !== 'undefined') YAW_COMBAT_PACING.cancel(app);
        let pendingPlayerDeath = Boolean(app.defeatState?.pending && app.defeatState?.terminal);
        if (app.combatState?.sceneExchangeId && app.combatState?.round > 0 && typeof YAW_NARRATION_SYSTEM !== 'undefined') {
            YAW_NARRATION_SYSTEM.closeExchange(app, `${app.combatState.sceneExchangeId}-round-${app.combatState.round}`, { reason: 'combat-ended' });
        }
        YAW_COMBAT_STATUS.clearCombatOnlyStatuses([app.player, ...app.party, ...app.creatures]);
        if (typeof YAW_RESTRAINTS !== 'undefined') YAW_RESTRAINTS.clearCombat(app);
        app.mode = app.GAME_MODE.NORMAL;
        app.combatState.active = false;
        app.combatState.processing = false;
        app.combatState.turnQueue = [];
        app.combatState.currentTurn = 0;
        app.combatState.syncActions = [];
        app.combatState.pendingFleeOutcome = null;
        app.activeActor = null;
        app._clearTransientInteractionState();
        app._clearCombatRefreshSnapshot(app.activeSlot);
        app.updateCheatButtons?.();
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
                app._label('combat.victoryScene.silent', 'The battlefield falls silent.'),
                app._label('combat.victoryScene.defeated', 'Your enemies lie defeated.'),
                app._label('combat.victoryScene.meal', 'Another victory, another meal.'),
                app._label('combat.victoryScene.unscathed', 'You emerge from the chaos unscathed.')
            ];
            const roll = app._combatStateRoll('combat-victory-scene', app.player, 'victory-text');
            const index = Math.min(texts.length - 1, Math.floor(roll * texts.length));
            app.updateScene(app._label('combat.victoryTitle', 'Victory'), texts[index], false);
            if (!pendingPlayerDeath) app.gainXP(app.combatState.xpEarned || app.XP_REWARDS.defeatEnemy);
            for (const c of pendingPlayerDeath ? [] : app.creatures) {
                if (c.disposition === app.DISPOSITION.FRIENDLY && c.CPun > 0) {
                    app.log.push({ text: app._label('combat.friendlyReady', '{name} looks ready to follow you...', { name: c.name }), type: 'discovery' });
                }
            }
            if (!pendingPlayerDeath) app._runPostCombatScavengers();
        } else if (outcome === 'flee') {
            app.log.push({ text: app._label('combat.escapedEncounter', 'You escaped the encounter.'), type: 'move' });
            app.updateScene(app._label('combat.escapedTitle', 'Escaped'), app._label('combat.escapedScene', 'You put distance between yourself and danger.'), false);
        } else if (outcome === 'disengage') {
            app.log.push({ text: app._label('combat.disengaged', 'The encounter breaks off.'), type: 'move' });
            app.updateScene(app._label('combat.disengagedTitle', 'Disengaged'), app._label('combat.disengaged', 'The encounter breaks off.'), false);
        } else {
            app.log.push({ text: app._label('combat.defeat', 'Defeat...'), type: 'combat' });
            app.updateScene(app._label('combat.defeatTitle', 'Defeat'), app._label('combat.defeatScene', 'Darkness claims you...'), false);
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
        app._emitPublicModuleHook?.('onEncounterResolved', publicOutcome);
        if (typeof YAW_AUDIO_RUNTIME !== 'undefined') YAW_AUDIO_RUNTIME.play(`encounter.${outcome}`);
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
