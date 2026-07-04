/**
 * YOU ARE WILD SAVE LOAD FLOW
 * Slot loading, incompatible-save recovery handoff, and last-slot resume.
 */

const YAW_SAVE_LOAD_FLOW = {
    async loadFromSlot(app, slotName) {
        slotName = app._normalizeSaveSlotName(slotName);
        try {
            const slotLabel = app._slotDisplayLabel(slotName);
            let saveData = await app._dbGet('saves', slotName);
            const combatSnapshot = app._readCombatRefreshSnapshot(slotName);
            if (combatSnapshot?.saveData) saveData = combatSnapshot.saveData;
            if (!saveData) {
                alert(app._label('save.error.noSave', 'No save in {slot}', { slot: slotLabel }));
                return false;
            }

            let loaded;
            try {
                loaded = Binary.loadGame(saveData);
            } catch (e) {
                console.error('Incompatible save:', e);
                app.showSaveRecoveryDialog(slotName, saveData);
                return false;
            }

            app.encounterPreference = loaded.encounterPreference || 'any';
            app.encounterWeights = app._normalizeEncounterWeights(loaded.questState?.encounterWeights || app._legacyEncounterWeights(app.encounterPreference));
            app.selectedEncounterWeights = { ...app.encounterWeights };
            app.selectedEncounterPreference = app._encounterPreferenceFromWeights(app.encounterWeights);
            app.player = {
                name: loaded.playerName,
                species: loaded.playerSpecies,
                icon: app.species.find(s => s.id === loaded.playerSpecies)?.icon || '👤',
                gender: loaded.playerGender || 'female',
                level: loaded.playerLevel,
                CPun: loaded.playerHp,
                MPun: loaded.playerMaxHp,
                CPle: Math.floor(loaded.playerMaxHp * 0.5),
                MPle: loaded.playerMaxHp,
                stats: loaded.playerStats,
                tags: [app.species.find(s => s.id === loaded.playerSpecies)?.name || 'Human']
            };
            app._normalizeUnit(app.player, { disposition: app.DISPOSITION.PARTY, hero: true, ally: false, mc: true, obedient: true, willing: true });
            app.location = { x: loaded.locationX, y: loaded.locationY };
            app.largeMapOffset = { x: 0, y: 0 };
            app.largeMapRadius = app.largeMapRadius || 8;
            const loadedParty = loaded.party && loaded.party.length ? loaded.party : [app.player];
            app.party = loadedParty.map((unit, index) => app._normalizeUnit(unit, {
                disposition: app.DISPOSITION.PARTY,
                hero: index === 0,
                ally: index !== 0,
                mc: index === 0,
                obedient: true
            }));
            const partyUnitRefs = Array.isArray(loaded.questState?.partyUnitRefs) ? loaded.questState.partyUnitRefs : [];
            for (let index = 0; index < app.party.length; index++) {
                const ref = partyUnitRefs[index];
                if (!ref?.id) continue;
                const unit = app.party[index];
                const refName = String(ref.name || '');
                const refSpecies = String(ref.species || '');
                const matchesName = !refName || String(unit.name || '') === refName;
                const matchesSpecies = !refSpecies || String(unit.species || '') === refSpecies;
                if (matchesName && matchesSpecies) unit.id = String(ref.id);
            }
            const playerIndex = app.party.findIndex(p => p.name === app.player.name && p.species === app.player.species);
            if (playerIndex >= 0) {
                app.player = app.party[playerIndex];
                app.player.hero = true;
                app.player.ally = false;
                app.player.mc = true;
            } else {
                app.party.unshift(app.player);
            }

            const savedRoles = loaded.questState?.partyRoles || {};
            const savedAIOrders = loaded.questState?.partyAIOrders || {};
            for (const unit of app.party) {
                const keys = [unit.id, unit.name].filter(Boolean).map(String);
                const role = keys.map(key => savedRoles[key]).find(value => app.PARTY_ROLES[value]);
                const order = keys.map(key => savedAIOrders[key]).find(value => app.PARTY_AI_ORDERS[value]);
                if (role) unit.partyRole = role;
                if (order) unit.aiOrder = order;
            }

            app.explorationActorIds = Array.isArray(loaded.questState?.explorationActorIds) ? loaded.questState.explorationActorIds.map(String) : [];
            app.explorationTargetIds = Array.isArray(loaded.questState?.explorationPartyTargetIds) ? loaded.questState.explorationPartyTargetIds.map(String) : [];
            app.currentBiome = loaded.currentBiome || 'forest';
            app.timeHour = typeof loaded.timeHour === 'number' ? loaded.timeHour : 8;
            app.dayCount = loaded.questState?.dayCount || 0;
            const structuredLog = Array.isArray(loaded.questState?.logEntries) ? loaded.questState.logEntries : null;
            app.log = structuredLog
                ? structuredLog.map(entry => ({
                    text: String(entry?.text || ''),
                    type: String(entry?.type || 'discovery'),
                    ...(Number.isFinite(entry?.round) ? { round: entry.round } : {}),
                    ...(Number.isFinite(entry?.turnIndex) ? { turnIndex: entry.turnIndex } : {}),
                    ...(entry?.actor ? { actor: String(entry.actor) } : {}),
                    ...(entry?.phase ? { phase: String(entry.phase) } : {})
                })).filter(entry => entry.text)
                : (loaded.log || []).map(t => ({ text: t, type: 'discovery' }));
            app.creatures = [];
            app.inventory = loaded.inventory || [];
            app.quests = loaded.questState?.quests || [];
            app.player.gold = loaded.questState?.playerGold || app.player.gold || 0;
            app.player.equipment = loaded.questState?.playerEquipment || app.player.equipment || {};
            app.player.equipmentBaseStats = loaded.questState?.playerEquipmentBaseStats || null;
            app._recalculateEquipment(app.player, { inferBase: !loaded.questState?.playerEquipmentBaseStats });
            app.player.perks = loaded.questState?.playerPerks || app.player.perks || [];
            app.player.pendingPerkChoices = loaded.questState?.pendingPerkChoices || app.player.pendingPerkChoices || 0;
            app.partyLeaderId = loaded.questState?.partyLeaderId || app._unitSelectionId(app.player);
            app.worldMeta = app._normalizeWorldMeta(loaded.worldMeta, {
                worldId: 'world_legacy',
                seed: loaded.currentBiome || 'default',
                generatorVersion: 1,
                mapModsHash: 'legacy'
            });
            app.inInterior = false;
            app.activeInterior = null;
            app.interiorLocation = { x: 0, y: 0 };
            app.activeSlot = slotName;
            app._restoreWorldState(loaded);
            await app.loadWorldStateFromMapStore().catch(e => console.warn('World map load failed', e));
            app._restoreCombatState(loaded.questState?.combatState);
            app._normalizeExplorationSelections();
            app._setStoredValue('lastSlot', slotName);
            const saveTime = app._getSaveTime(slotName);
            if (parseInt(saveTime, 10) > 0) app._setStoredValue('lastSaveTime', saveTime);

            let revived = false;
            if (app.player && app.player.CPun <= 0) {
                app.player.CPun = 1;
                app.player.knockedOut = false;
                revived = true;
            }
            for (const p of app.party) {
                if (p.CPun <= 0) {
                    p.CPun = 1;
                    revived = true;
                }
                p.knockedOut = false;
            }
            if (revived) {
                app.log.push({ text: app._label('save.recoveredOnLoad', 'You were revived from the brink of defeat. Welcome back, {name}.', { name: app.player.name }), type: 'discovery' });
            }

            app.showScreen('game');
            app.renderMap();
            app.renderParty();
            app.renderCreatures();
            app.renderLog();
            if (!app._resumeLoadedCombat()) app.showExplorationActions();
            app._emitModuleHook('onGameLoad', {
                slotName,
                combatActive: Boolean(app.combatState?.active),
                location: { ...app.location }
            });
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            alert(app._label('save.error.loadFailed', 'Load failed: {message}', { message: e.message }));
            return false;
        }
    },

    async loadLastPlayed(app) {
        const lastSlot = app._normalizeSaveSlotName(app._getStoredValue('lastSlot'), null);
        if (!lastSlot) {
            app._removeStoredValue('lastSlot');
            app._removeStoredValue('lastSaveTime');
            return false;
        }
        return await app.loadFromSlot(lastSlot);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SAVE_LOAD_FLOW = YAW_SAVE_LOAD_FLOW;
}
