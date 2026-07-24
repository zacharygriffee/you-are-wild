/**
 * YOU ARE WILD QUEST FLOW
 * Quest normalization, acceptance, progress, rewards, turn-in, and map focus.
 */

const YAW_QUEST_FLOW = {
    normalize(app, quest, giver = null) {
        const source = quest || {};
        const id = source.id || `quest_${app._stableIdPart(giver?.id || giver?.name, 'giver')}`;
        const generatedTitle = Boolean(source.generatedTitle || !source.title);
        return {
            id,
            title: generatedTitle ? app._label('quest.untitled', 'Untitled Quest') : source.title,
            generatedTitle,
            description: source.description || '',
            giverId: source.giverId || giver?.id || giver?.name || null,
            giverName: source.giverName || giver?.name || null,
            giverLocation: source.giverLocation || giver?.giverLocation || (giver ? { x: Number(app.location?.x || 0), y: Number(app.location?.y || 0), label: giver.name || app._label('quest.giverFallback', 'Quest giver') } : null),
            status: source.status || 'available',
            turnInRequired: Boolean(source.turnInRequired || source.rewardOnTurnIn),
            rewardClaimed: Boolean(source.rewardClaimed),
            objectives: (source.objectives || []).map((objective, index) => this.normalizeObjective(app, objective, id, index)),
            reward: source.reward || source.rewards || {}
        };
    },

    normalizeObjective(app, objective = {}, questId = 'quest', index = 0) {
        const checkpoints = (objective.checkpoints || objective.route || []).map((checkpoint, checkpointIndex) => {
            const generatedLabel = Boolean(checkpoint.generatedLabel || (!checkpoint.label && !checkpoint.name));
            return {
                id: checkpoint.id || `${questId}_objective_${index}_checkpoint_${checkpointIndex}`,
                label: generatedLabel
                    ? app._label('quest.checkpointNumber', 'Checkpoint {index}', { index: checkpointIndex + 1 })
                    : checkpoint.label || checkpoint.name,
                generatedLabel,
                x: Number(checkpoint.x ?? checkpoint.location?.x ?? checkpoint[0] ?? 0),
                y: Number(checkpoint.y ?? checkpoint.location?.y ?? checkpoint[1] ?? 0),
                complete: Boolean(checkpoint.complete)
            };
        });
        const location = objective.location || (Number.isFinite(objective.x) && Number.isFinite(objective.y) ? { x: objective.x, y: objective.y } : null);
        const required = objective.required || objective.count || Math.max(1, checkpoints.length || 1);
        const generatedLabel = Boolean(objective.generatedLabel || (!objective.label && !objective.description));
        const normalized = {
            id: objective.id || `${questId}_objective_${index}`,
            type: objective.type || 'find',
            label: generatedLabel ? this.objectiveLabel(app, objective) : objective.label || objective.description,
            generatedLabel,
            targetId: objective.targetId || null,
            species: objective.species || null,
            item: objective.item || null,
            location: location ? { x: Number(location.x), y: Number(location.y) } : null,
            checkpoints,
            required,
            progress: objective.progress || 0,
            complete: Boolean(objective.complete)
        };
        if (normalized.type === 'escort' && normalized.checkpoints.length) {
            normalized.progress = Math.min(normalized.progress, normalized.checkpoints.length);
            normalized.required = normalized.checkpoints.length;
            normalized.checkpoints.forEach((checkpoint, i) => { checkpoint.complete = checkpoint.complete || i < normalized.progress; });
            normalized.complete = normalized.complete || normalized.progress >= normalized.required;
        }
        return normalized;
    },

    objectiveLabel(app, objective) {
        const type = objective.type || 'find';
        const action = app._label(`quest.objective.${type}`, type);
        const target = objective.item || this.speciesLabel(app, objective.species) || objective.targetId || objective.location?.label || app._label('quest.objective.target', 'target');
        return app._label('quest.objectiveLabel', '{action} {target}', { action, target });
    },

    objectiveDisplayLabel(app, objective) {
        return objective?.generatedLabel
            ? this.objectiveLabel(app, objective)
            : objective?.label || this.objectiveLabel(app, objective || {});
    },

    checkpointLabel(app, checkpoint, index = 0) {
        if (!checkpoint) return app._label('quest.checkpointNumber', 'Checkpoint {index}', { index: index + 1 });
        return checkpoint.generatedLabel
            ? app._label('quest.checkpointNumber', 'Checkpoint {index}', { index: index + 1 })
            : checkpoint.label || app._label('quest.checkpointNumber', 'Checkpoint {index}', { index: index + 1 });
    },

    titleLabel(app, quest) {
        return quest?.generatedTitle ? app._label('quest.untitled', 'Untitled Quest') : quest?.title || app._label('quest.untitled', 'Untitled Quest');
    },

    speciesLabel(app, speciesId) {
        if (!speciesId) return '';
        const species = (app.species || []).find(s => s.id === speciesId);
        return species?.name || species?.label || speciesId;
    },

    speciesObjectiveMatches(app, objectiveSpecies, payload = {}) {
        if (!objectiveSpecies) return true;
        const target = payload.target || {};
        const payloadSpecies = payload.species || target.species;
        return Boolean(payloadSpecies && String(payloadSpecies) === String(objectiveSpecies));
    },

    rewardPreviewText(app, reward = {}) {
        const parts = [];
        if (reward.xp) parts.push(app._label('quest.reward.xp', '{count} XP', { count: reward.xp }));
        if (reward.gold) parts.push(app._label('quest.reward.gold', '{count} gold', { count: reward.gold }));
        for (const itemName of reward.items || []) {
            parts.push(app._label('quest.reward.item', '{name}', { name: itemName }));
        }
        if (reward.recruit) {
            parts.push(app._label('quest.reward.recruit', 'Recruit: {name}', { name: reward.recruit.name || app._label('party.ally', 'Ally') }));
        }
        if (parts.length === 0) parts.push(app._label('quest.reward.none', 'No listed reward'));
        return parts.map(part => app._escapeHtml(part)).join('<br>');
    },

    byId(app, questId) {
        return (app.quests || []).find(q => q.id === questId);
    },

    giverByKey(app, targetId) {
        return app.creatures.find(c => String(c.id || c.name) === String(targetId)
            && c.quest
            && YAW_UNIT_CONTAINMENT.serviceAvailable(app, c));
    },

    templateForStructure(app, structureId, tile = null) {
        const config = app.STRUCTURES[structureId]?.quest;
        const templates = config?.templates || [];
        if (!templates.length) return null;
        const x = tile?.x ?? 0;
        const y = tile?.y ?? 0;
        const templateId = typeof WorldGen !== 'undefined'
            ? (WorldGen.pickWeighted(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'structure-quest-template', x, y, templates) || templates[0])
            : templates[0];
        const source = app.QUEST_TEMPLATES[templateId];
        if (!source) return null;
        const quest = JSON.parse(JSON.stringify(source));
        const tileId = tile ? `${tile.x}_${tile.y}` : 'local';
        quest.id = quest.id || `${templateId}_${tileId}`;
        quest.templateId = templateId;
        if (tile) quest.giverLocation = { x: Number(tile.x), y: Number(tile.y), label: app.STRUCTURES[structureId]?.name || app._label('quest.giverFallback', 'Quest giver') };
        return quest;
    },

    createStructureGiver(app, structureId, tile) {
        const struct = app.STRUCTURES[structureId];
        const questConfig = struct?.quest;
        if (!questConfig) return null;
        const quest = this.templateForStructure(app, structureId, tile);
        if (!quest) return null;
        const registeredSpecies = new Set((app.species || []).map(species => species.id));
        const speciesPool = (questConfig.species || ['human']).filter(sid => registeredSpecies.has(sid));
        const fallbackSpecies = registeredSpecies.has('human') ? 'human' : ((app.species || [])[0]?.id || 'human');
        const x = tile?.x ?? 0;
        const y = tile?.y ?? 0;
        const sid = typeof WorldGen !== 'undefined'
            ? (WorldGen.pickWeighted(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'structure-quest-species', x, y, speciesPool) || fallbackSpecies)
            : speciesPool[0] || fallbackSpecies;
        const sp = app.species.find(s => s.id === sid) || app.species.find(s => s.id === fallbackSpecies);
        const giverSpeciesId = sp?.id || fallbackSpecies;
        return app._normalizeUnit({
            id: `questgiver_${structureId}_${x}_${y}`,
            name: `${sp?.name || 'Local'} Guide`,
            species: giverSpeciesId,
            icon: sp?.icon || '👤',
            disposition: app.DISPOSITION.QUEST_GIVER,
            level: Math.max(1, app.player?.level || 1),
            bodyParts: app.SPECIES_DEFAULT_PARTS[giverSpeciesId] || [],
            quest,
            serviceOrigin: YAW_UNIT_CONTAINMENT.overworldServiceOrigin(tile, structureId),
            serviceSuspended: false,
            tags: [sp?.name || giverSpeciesId, 'Quest', struct.name],
            expanded: false,
            hero: false,
            ally: false,
            mc: false,
            obedient: false,
            willing: true
        });
    },

    maybeSpawnStructureGiver(app, tile) {
        if (!tile?.structure || !app.STRUCTURES[tile.structure]?.quest) return null;
        const config = app.STRUCTURES[tile.structure].quest;
        if (typeof WorldGen !== 'undefined' && !WorldGen.chance(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'structure-quest-giver', tile.x, tile.y, config.chance ?? 0)) return null;
        if (typeof WorldGen === 'undefined' && (config.chance ?? 0) <= 0) return null;
        const questGiver = this.createStructureGiver(app, tile.structure, tile);
        if (!questGiver) return null;
        app.creatures = app._tileCreatures([...(app.creatures || []), questGiver]);
        tile.creatures = app._tileCreatures(app.creatures);
        return questGiver;
    },

    acceptFromUnit(app, targetId) {
        if (!app._guardRecoveryCapability?.('interactions', { action: 'accept-quest' })) return false;
        const giver = this.giverByKey(app, targetId);
        if (!giver) return false;
        return app.acceptQuest(giver.quest, giver);
    },

    previewFromUnit(app, targetId) {
        if (!app._guardRecoveryCapability?.('interactions', { action: 'preview-quest' })) return false;
        const giver = this.giverByKey(app, targetId);
        if (!giver) return false;
        return app.openTransactionWindow('quest', targetId);
    },

    showPreview(app, quest, giver = null) {
        if (!app._guardRecoveryCapability?.('interactions', { action: 'preview-quest' })) return false;
        const normalized = this.normalize(app, quest, giver);
        const targetKey = giver ? String(giver.id || giver.name || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'") : '';
        const title = app._escapeHtml(app._label('quest.previewTitle', 'Quest Preview'));
        const acceptLabel = app._escapeHtml(app._label('action.acceptQuest', 'Accept Quest'));
        const acceptTitle = app._escapeHtml(app._label('action.acceptQuestFrom', 'Accept quest from {name}', { name: giver?.name || normalized.giverName || normalized.title }));
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        let html = `<div class="quest-preview" data-command-surface="quest-preview" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-intent="quest" style="max-width:720px;margin:0 auto;text-align:left;display:grid;gap:12px;">`;
        html += `<h3 style="color:var(--accent-primary);margin:0;">${title}: ${app._escapeHtml(normalized.title)}</h3>`;
        if (normalized.description) html += `<p style="color:var(--text-secondary);margin:0;">${app._escapeHtml(normalized.description)}</p>`;
        html += `<div class="option-card" style="cursor:default;text-align:left;"><div style="font-weight:700;color:var(--text-primary);margin-bottom:6px;">${app._escapeHtml(app._label('quest.objectives', 'Objectives'))}</div><div style="font-size:12px;line-height:1.6;color:var(--text-primary);">${app._questProgressText(normalized)}</div>`;
        for (const objective of normalized.objectives || []) {
            const routePreview = app._questRoutePreviewText(objective);
            const marker = app._nextQuestObjectiveMarker(objective);
            if (routePreview || marker) {
                html += `<div class="quest-route-preview" style="display:grid;gap:4px;font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5">${routePreview || app._escapeHtml(app._questMarkerPreview(marker, objective))}</div>`;
            }
        }
        html += `</div>`;
        html += `<div class="option-card" style="cursor:default;text-align:left;"><div style="font-weight:700;color:var(--text-primary);margin-bottom:6px;">${app._escapeHtml(app._label('quest.rewards', 'Rewards'))}</div><div style="font-size:12px;line-height:1.6;color:var(--text-primary);">${this.rewardPreviewText(app, normalized.reward)}</div></div>`;
        html += `<div class="quest-preview-actions" data-command-surface="quest-preview" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-intent="quest" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;"><button class="nav-btn primary" data-command-surface="quest-preview" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="confirm-quest" data-command-intent="acceptQuest" title="${acceptTitle}" aria-label="${acceptTitle}" onclick="App.acceptQuestFromUnit('${targetKey}')">📜 ${acceptLabel}</button><button class="nav-btn" data-command-surface="quest-preview" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="cancel-quest-preview" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.renderCreatures();App.renderExplorationActions();">${closeLabel}</button></div>`;
        html += `</div>`;
        app.showCreaturePanelDetail(normalized.title, html);
        return true;
    },

    accept(app, quest, giver = null) {
        if (!app._guardRecoveryCapability?.('interactions', { action: 'accept-quest' })) return false;
        const normalized = this.normalize(app, quest, giver);
        app.quests = app.quests || [];
        const existing = this.byId(app, normalized.id);
        if (existing) {
            const existingTitle = this.titleLabel(app, existing);
            app.log.push({ text: app._label('quest.alreadyInLog', '{title} is already in your quest log.', { title: existingTitle }), type: 'discovery' });
            app.emitTransactionSceneBeat?.(giver, 'quest', 'blocked', {
                title: existingTitle,
                questTitle: existingTitle,
                reason: 'already-in-log'
            });
            if (!app.refreshTransactionWindow?.()) app.showQuestLog();
            app.renderLog();
            return existing;
        }
        normalized.status = 'active';
        app.quests.push(normalized);
        if (giver) {
            giver.questAccepted = true;
            if (giver.quest) giver.quest.status = 'active';
        }
        const acceptedText = app._label('quest.accepted', 'Quest accepted: {title}.', { title: normalized.title });
        app.log.push({ text: acceptedText, type: 'discovery' });
        app.showToast?.({ text: acceptedText, type: 'quest', importance: 'notable', dedupeKey: `quest-accepted:${normalized.id}` });
        app.emitTransactionSceneBeat?.(giver, 'quest', 'accepted', {
            title: normalized.title,
            questTitle: normalized.title
        });
        app.renderLog();
        app.renderCreatures();
        if (app.refreshTransactionWindow?.()) {
            app.markAutoSaveDirty?.(['manifest', 'quests', 'sceneFeed', 'activityLog'], 'quest-accept');
            app.autoSave();
            return normalized;
        }
        if (giver) {
            const title = app._escapeHtml(normalized.title);
            const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
            const questLogLabel = app._escapeHtml(app._label('quest.title', 'Quests'));
            const accepted = app._escapeHtml(app._label('quest.accepted', 'Quest accepted: {title}.', { title: normalized.title }));
            app.showCreaturePanelDetail(title, `<h3>${title}</h3><p style="color:var(--text-muted);margin-top:8px;">${accepted}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;"><button class="nav-btn primary" data-command-surface="target-detail" data-command-mode="exploration" data-command-control="open-quest-log" title="${questLogLabel}" aria-label="${questLogLabel}" onclick="App.showQuestLog()">${questLogLabel}</button><button class="nav-btn" data-command-surface="target-detail" data-command-mode="exploration" data-command-control="close-target-detail" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closePanelDetails('creature')">${closeLabel}</button></div>`);
        } else {
            app.showQuestLog();
        }
        app.markAutoSaveDirty?.(['manifest', 'quests', 'sceneFeed', 'activityLog'], 'quest-accept');
        app.autoSave();
        return normalized;
    },

    objectiveMatches(app, type, payload, objective) {
        if (!objective || objective.complete || objective.type !== type) return false;
        if (objective.species && !this.speciesObjectiveMatches(app, objective.species, payload)) return false;
        if (objective.targetId && String(objective.targetId) !== String(payload.targetId || payload.target?.id || payload.target?.name)) return false;
        if (objective.item && objective.item !== payload.item && objective.item !== payload.name) return false;
        if ((objective.type === 'escort' || objective.type === 'travel') && objective.location) {
            if (Number(objective.location.x) !== Number(payload.x) || Number(objective.location.y) !== Number(payload.y)) return false;
        }
        return true;
    },

    nextCheckpoint(app, objective) {
        if (!objective || objective.complete || !Array.isArray(objective.checkpoints) || objective.checkpoints.length === 0) return null;
        return objective.checkpoints.find(checkpoint => !checkpoint.complete) || null;
    },

    nextObjectiveMarker(app, objective) {
        if (!objective || objective.complete) return null;
        return this.nextCheckpoint(app, objective) || objective.location || null;
    },

    updateProgress(app, type, payload = {}) {
        let changed = false;
        for (const quest of app.quests || []) {
            if (quest.status !== 'active') continue;
            quest.rewardClaimed = Boolean(quest.rewardClaimed);
            for (const objective of quest.objectives || []) {
                if (!this.objectiveMatches(app, type, payload, objective)) continue;
                if (objective.type === 'escort' && objective.checkpoints?.length) {
                    const checkpoint = this.nextCheckpoint(app, objective);
                    if (!checkpoint || Number(checkpoint.x) !== Number(payload.x) || Number(checkpoint.y) !== Number(payload.y)) continue;
                    checkpoint.complete = true;
                }
                objective.progress = Math.min(objective.required, (objective.progress || 0) + (payload.count || 1));
                objective.complete = objective.progress >= objective.required;
                changed = true;
            }
            if ((quest.objectives || []).length > 0 && quest.objectives.every(o => o.complete) && quest.status !== 'completed') {
                quest.status = 'completed';
                const questTitle = this.titleLabel(app, quest);
                if (quest.turnInRequired) {
                    const completedText = app._label('quest.completedTurnIn', 'Quest completed: {title}. Return to {giver} for your reward.', { title: questTitle, giver: quest.giverName || app._label('quest.defaultGiver', 'the quest giver') });
                    app.log.push({ text: completedText, type: 'discovery' });
                    app.showToast?.({ text: completedText, type: 'quest', importance: 'major', dedupeKey: `quest-completed:${quest.id}` });
                } else {
                    this.grantReward(app, quest);
                    const completedText = app._label('quest.completed', 'Quest completed: {title}.', { title: questTitle });
                    app.log.push({ text: completedText, type: 'discovery' });
                    app.showToast?.({ text: completedText, type: 'quest', importance: 'major', dedupeKey: `quest-completed:${quest.id}` });
                }
            }
        }
        if (changed) {
            app.renderLog();
            app.renderParty();
            app.markAutoSaveDirty?.(['manifest', 'quests', 'player', 'party', 'inventory', 'sceneFeed', 'activityLog'], 'quest-progress');
            app.autoSave();
        }
        return changed;
    },

    grantReward(app, quest) {
        if (!quest || quest.rewardClaimed) return false;
        const reward = quest.reward || {};
        if (reward.xp) app.gainXP(reward.xp);
        if (reward.gold) app.player.gold = (app.player.gold || 0) + reward.gold;
        for (const itemName of reward.items || []) {
            if (app.inventory.length < app.MAX_INVENTORY) {
                app.inventory.push({ id: `quest_item_${app._stableIdPart(quest.id, 'quest')}_${app._stableIdPart(itemName)}_${app.inventory.length}`, name: itemName });
            }
        }
        if (reward.recruit && app.party.length < app.MAX_PARTY_SIZE) {
            const recruit = app._normalizeUnit({ ...reward.recruit }, { disposition: app.DISPOSITION.PARTY, ally: true, obedient: true, willing: true });
            app.party.push(recruit);
        }
        quest.rewardClaimed = true;
        return true;
    },

    turnIn(app, questId) {
        const quest = this.byId(app, questId);
        if (!quest || quest.status !== 'completed') {
            app.log.push({ text: app._label('quest.notReadyTurnIn', 'That quest is not ready to turn in.'), type: 'discovery' });
            app.emitTransactionSceneBeat?.({ name: quest?.giverName || app._label('quest.defaultGiver', 'the quest giver') }, 'quest', 'blocked', {
                title: quest?.title || app._label('quest.title', 'Quests'),
                questTitle: quest?.title || '',
                reason: 'not-ready'
            });
            app.renderLog();
            return false;
        }
        if (quest.rewardClaimed) {
            const questTitle = this.titleLabel(app, quest);
            app.log.push({ text: app._label('quest.alreadyTurnedIn', '{title} has already been turned in.', { title: questTitle }), type: 'discovery' });
            app.emitTransactionSceneBeat?.({ name: quest.giverName || app._label('quest.defaultGiver', 'the quest giver') }, 'quest', 'blocked', {
                title: questTitle,
                questTitle,
                reason: 'already-turned-in'
            });
            app.renderLog();
            if (!app.refreshTransactionWindow?.()) app.showQuestLog();
            return false;
        }
        const granted = this.grantReward(app, quest);
        if (granted) {
            const questTitle = this.titleLabel(app, quest);
            const turnedInText = app._label('quest.turnedIn', 'Quest turned in: {title}.', { title: questTitle });
            app.log.push({ text: turnedInText, type: 'loot' });
            app.showToast?.({ text: turnedInText, type: 'quest', importance: 'notable', dedupeKey: `quest-turned-in:${quest.id}` });
        }
        if (granted) {
            const questTitle = this.titleLabel(app, quest);
            app.emitTransactionSceneBeat?.({ name: quest.giverName || app._label('quest.defaultGiver', 'the quest giver') }, 'quest', 'turned-in', {
                title: questTitle,
                questTitle
            });
        }
        app.renderLog();
        app.renderParty();
        if (!app.refreshTransactionWindow?.()) app.showQuestLog();
        app.markAutoSaveDirty?.(['manifest', 'quests', 'player', 'party', 'inventory', 'sceneFeed', 'activityLog'], 'quest-turn-in');
        app.autoSave();
        return granted;
    },

    focusObjectiveOnMap(app, questId, objectiveId) {
        const quest = (app.quests || []).find(entry => String(entry.id) === String(questId));
        const objective = (quest?.objectives || []).find(entry => String(entry.id) === String(objectiveId)) || (quest?.objectives || []).find(entry => !entry.complete);
        const marker = this.nextObjectiveMarker(app, objective);
        if (!quest || !marker) {
            app.log.push({ text: app._label('quest.noObjectiveMarker', 'No map marker is available for that quest objective.'), type: 'discovery' });
            app.renderLog();
            return false;
        }
        app.largeMapOffset = {
            x: Number(marker.x) - Number(app.location.x || 0),
            y: Number(marker.y) - Number(app.location.y || 0)
        };
        app.renderLargeMap();
        const checkpointIndex = Math.max(0, (objective?.checkpoints || []).indexOf(marker));
        const markerLabel = marker.generatedLabel
            ? this.checkpointLabel(app, marker, checkpointIndex)
            : marker.label || this.objectiveDisplayLabel(app, objective);
        app.log.push({ text: app._label('quest.mapFocusedObjective', 'Map focused on {title}: {label}.', { title: this.titleLabel(app, quest), label: markerLabel }), type: 'discovery' });
        app.renderLog();
        return true;
    },

    turnInMarker(app, quest) {
        const location = quest?.giverLocation;
        if (!location || !Number.isFinite(Number(location.x)) || !Number.isFinite(Number(location.y))) return null;
        return {
            x: Number(location.x),
            y: Number(location.y),
            label: location.label || quest.giverName || 'Quest giver'
        };
    },

    focusTurnInOnMap(app, questId) {
        const quest = (app.quests || []).find(entry => String(entry.id) === String(questId));
        const marker = this.turnInMarker(app, quest);
        if (!quest || !marker) {
            app.log.push({ text: app._label('quest.noTurnInLocation', 'No turn-in location is available for that quest.'), type: 'discovery' });
            app.renderLog();
            return false;
        }
        app.largeMapOffset = {
            x: Number(marker.x) - Number(app.location.x || 0),
            y: Number(marker.y) - Number(app.location.y || 0)
        };
        app.renderLargeMap();
        app.log.push({ text: app._label('quest.mapFocusedTurnIn', 'Map focused on {title} turn-in: {label}.', { title: this.titleLabel(app, quest), label: marker.label }), type: 'discovery' });
        app.renderLog();
        return true;
    },

    filteredEntries(app) {
        const filter = ['all', 'active', 'completed', 'turn-in'].includes(app.questFilter) ? app.questFilter : 'all';
        const sort = ['status', 'title'].includes(app.questSort) ? app.questSort : 'status';
        const quests = (app.quests || []).filter(quest => {
            if (filter === 'all') return true;
            if (filter === 'turn-in') return quest.status === 'completed' && quest.turnInRequired && !quest.rewardClaimed;
            return quest.status === filter;
        });
        return quests.sort((a, b) => {
            if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
            const weight = quest => quest.status === 'active' ? 0 : (quest.status === 'completed' && quest.turnInRequired && !quest.rewardClaimed) ? 1 : quest.status === 'completed' ? 2 : 3;
            return weight(a) - weight(b) || (a.title || '').localeCompare(b.title || '');
        });
    },

    setFilter(app, filter) {
        app.questFilter = ['all', 'active', 'turn-in', 'completed'].includes(filter) ? filter : 'all';
        app.showQuestLog();
    },

    setSort(app, sort) {
        app.questSort = ['status', 'title'].includes(sort) ? sort : 'status';
        app.showQuestLog();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_QUEST_FLOW = YAW_QUEST_FLOW;
}
