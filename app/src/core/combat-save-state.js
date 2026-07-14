/**
 * YOU ARE WILD COMBAT SAVE STATE
 * Combat refresh snapshots and loaded-combat resume behavior.
 */

const YAW_COMBAT_SAVE_STATE = {
    checkpointDomains() {
        return ['manifest', 'party', 'currentTile', 'combat', 'sceneFeed', 'activityLog'];
    },

    writeRefreshSnapshot(app, slotName = app.activeSlot) {
        slotName = app._normalizeSaveSlotName(slotName);
        if (!app.combatState?.active || !app.player) return false;
        try {
            app.markAutoSaveDirty?.(this.checkpointDomains(), 'combat-turn-boundary');
            app.autoSave?.({ delayMs: 0, reason: 'combat-turn-boundary' });
            return true;
        } catch (e) {
            console.warn('Combat sparse checkpoint failed', e);
            return false;
        }
    },

    readRefreshSnapshot(app, slotName = app.activeSlot) {
        slotName = app._normalizeSaveSlotName(slotName);
        if (typeof Binary === 'undefined') return null;
        try {
            const snapshot = YAW_STORAGE.readCombatRefreshSnapshot(app, slotName);
            if (!snapshot) return null;
            const loaded = Binary.loadGame(snapshot.saveData);
            if (!loaded?.questState?.combatState?.active || YAW_DEFEAT_RECOVERY.isWipedCombatSave(app, loaded)) {
                app._clearCombatRefreshSnapshot(slotName);
                return null;
            }
            return snapshot;
        } catch (e) {
            console.warn('Combat refresh snapshot load failed', e);
            app._clearCombatRefreshSnapshot(slotName);
            return null;
        }
    },

    clearRefreshSnapshot(app, slotName = app.activeSlot) {
        slotName = app._normalizeSaveSlotName(slotName);
        try { YAW_STORAGE.clearCombatRefreshSnapshot(app, slotName); } catch (e) {}
    },

    restoreCombatState(app, savedCombat) {
        const livingEnemies = app._livingEnemies(app.creatures);
        if (!savedCombat?.active || livingEnemies.length === 0) {
            app.mode = app.GAME_MODE.NORMAL;
            app.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
            app.activeActor = null;
            app.targetSelection = null;
            return false;
        }
        const resolve = ref => app._findUnitBySaveRef(ref);
        let turnQueue = (savedCombat.turnQueue || [])
            .map(entry => {
                const unit = resolve(entry.unitId);
                if (!unit || unit.CPun <= 0 || unit.knockedOut) return null;
                return {
                    unit,
                    initiative: entry.initiative || app._calcInitiative(unit),
                    actedThisRound: Boolean(entry.actedThisRound)
                };
            })
            .filter(Boolean);
        if (turnQueue.length === 0) {
            turnQueue = [...app.party, ...livingEnemies]
                .filter(unit => unit.CPun > 0 && !unit.knockedOut)
                .map(unit => ({ unit, initiative: app._calcInitiative(unit), actedThisRound: false }))
                .sort((a, b) => b.initiative - a.initiative);
        }
        const maxTurn = Math.max(0, turnQueue.length - 1);
        app.mode = app.GAME_MODE.COMBAT;
        app.combatState = {
            active: true,
            round: Math.max(1, savedCombat.round || 1),
            currentTurn: Math.min(Math.max(0, savedCombat.currentTurn || 0), maxTurn),
            sceneExchangeId: savedCombat.sceneExchangeId || `combat-${(Number(app.storyEventSeq) || 0) + 1}`,
            turnQueue,
            syncActions: (savedCombat.syncActions || []).map(sync => {
                const participants = (sync.participantIds || []).map(resolve).filter(Boolean);
                const target = resolve(sync.targetId);
                const resolveAtIndex = sync.resolveAtIndex || 0;
                const round = sync.round || savedCombat.round || 1;
                return {
                    type: sync.type,
                    participants,
                    target,
                    resolveAtIndex,
                    round,
                    resolved: Boolean(sync.resolved),
                    plan: target && participants.length >= 2 ? app._buildInteractionPlan({
                        mode: 'combat',
                        actors: participants,
                        targets: [target],
                        action: sync.type,
                        source: 'sync-save',
                        targetType: 'enemy',
                        shape: 'many-to-one',
                        timing: 'slowest-participant',
                        resolveAt: resolveAtIndex,
                        distribution: 'single',
                        constraints: {
                            requireCurrentTurn: true,
                            hostileOnly: true,
                            checkReach: true,
                            checkRows: true,
                            minActors: 2,
                            minTargets: 1,
                            maxTargets: 1
                        },
                        metadata: { baseAction: app._syncBaseAction(sync.type), round }
                    }) : null
                };
            }).filter(sync => sync.target && sync.participants.length >= 2 && !sync.resolved),
            processing: false,
            xpEarned: savedCombat.xpEarned || 0
        };
        app.activeActor = resolve(savedCombat.activeActorId) || app.combatState.turnQueue[app.combatState.currentTurn]?.unit || app.player;
        app.targetSelection = null;
        app._normalizeExplorationSelections({ resetTargets: true });
        app._sanitizeCombatState({ preserveTurn: true });
        return true;
    },

    resumeLoadedCombat(app) {
        if (!app.combatState?.active) return false;
        app._clearTransientInteractionState();
        return app._recoverCombatProgress?.('loaded-combat') || false;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_SAVE_STATE = YAW_COMBAT_SAVE_STATE;
}
