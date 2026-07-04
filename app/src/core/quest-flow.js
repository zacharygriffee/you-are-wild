/**
 * YOU ARE WILD QUEST FLOW
 * Quest normalization, acceptance, progress, rewards, turn-in, and map focus.
 */

const YAW_QUEST_FLOW = {
    normalize(app, quest, giver = null) {
        const source = quest || {};
        const id = source.id || `quest_${app._stableIdPart(giver?.id || giver?.name, 'giver')}`;
        return {
            id,
            title: source.title || 'Untitled Quest',
            description: source.description || '',
            giverId: source.giverId || giver?.id || giver?.name || null,
            giverName: source.giverName || giver?.name || null,
            giverLocation: source.giverLocation || giver?.giverLocation || (giver ? { x: Number(app.location?.x || 0), y: Number(app.location?.y || 0), label: giver.name || 'Quest giver' } : null),
            status: source.status || 'available',
            turnInRequired: Boolean(source.turnInRequired || source.rewardOnTurnIn),
            rewardClaimed: Boolean(source.rewardClaimed),
            objectives: (source.objectives || []).map((objective, index) => this.normalizeObjective(app, objective, id, index)),
            reward: source.reward || source.rewards || {}
        };
    },

    normalizeObjective(app, objective = {}, questId = 'quest', index = 0) {
        const checkpoints = (objective.checkpoints || objective.route || []).map((checkpoint, checkpointIndex) => ({
            id: checkpoint.id || `${questId}_objective_${index}_checkpoint_${checkpointIndex}`,
            label: checkpoint.label || checkpoint.name || `Checkpoint ${checkpointIndex + 1}`,
            x: Number(checkpoint.x ?? checkpoint.location?.x ?? checkpoint[0] ?? 0),
            y: Number(checkpoint.y ?? checkpoint.location?.y ?? checkpoint[1] ?? 0),
            complete: Boolean(checkpoint.complete)
        }));
        const location = objective.location || (Number.isFinite(objective.x) && Number.isFinite(objective.y) ? { x: objective.x, y: objective.y } : null);
        const required = objective.required || objective.count || Math.max(1, checkpoints.length || 1);
        const normalized = {
            id: objective.id || `${questId}_objective_${index}`,
            type: objective.type || 'find',
            label: objective.label || objective.description || this.objectiveLabel(app, objective),
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
        const target = objective.item || objective.species || objective.targetId || objective.location?.label || 'target';
        return `${objective.type || 'find'} ${target}`;
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
        return app.creatures.find(c => String(c.id || c.name) === String(targetId) && c.quest);
    },

    acceptFromUnit(app, targetId) {
        const giver = this.giverByKey(app, targetId);
        if (!giver) return false;
        return app.acceptQuest(giver.quest, giver);
    },

    previewFromUnit(app, targetId) {
        const giver = this.giverByKey(app, targetId);
        if (!giver) return false;
        if (giver.questAccepted || this.byId(app, giver.quest?.id)) {
            app.showQuestLog();
            return true;
        }
        return app.showQuestPreview(giver.quest, giver);
    },

    showPreview(app, quest, giver = null) {
        const normalized = this.normalize(app, quest, giver);
        const targetKey = giver ? String(giver.id || giver.name || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'") : '';
        const title = app._escapeHtml(app._label('quest.previewTitle', 'Quest Preview'));
        const acceptLabel = app._escapeHtml(app._label('action.acceptQuest', 'Accept Quest'));
        const acceptTitle = app._escapeHtml(app._label('action.acceptQuestFrom', 'Accept quest from {name}', { name: giver?.name || normalized.giverName || normalized.title }));
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        let html = `<div class="quest-preview" style="max-width:720px;margin:0 auto;text-align:left;display:grid;gap:12px;">`;
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
        html += `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;"><button class="nav-btn primary" title="${acceptTitle}" aria-label="${acceptTitle}" onclick="App.acceptQuestFromUnit('${targetKey}')">📜 ${acceptLabel}</button><button class="nav-btn" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.renderCreatures();App.renderExplorationActions();">${closeLabel}</button></div>`;
        html += `</div>`;
        app.showCreaturePanelDetail(normalized.title, html);
        return true;
    },

    accept(app, quest, giver = null) {
        const normalized = this.normalize(app, quest, giver);
        app.quests = app.quests || [];
        const existing = this.byId(app, normalized.id);
        if (existing) {
            app.log.push({ text: app._label('quest.alreadyInLog', '{title} is already in your quest log.', { title: existing.title }), type: 'discovery' });
            app.showQuestLog();
            app.renderLog();
            return existing;
        }
        normalized.status = 'active';
        app.quests.push(normalized);
        if (giver) {
            giver.questAccepted = true;
            if (giver.quest) giver.quest.status = 'active';
        }
        app.log.push({ text: app._label('quest.accepted', 'Quest accepted: {title}.', { title: normalized.title }), type: 'discovery' });
        app.renderLog();
        app.renderCreatures();
        if (giver) {
            const title = app._escapeHtml(normalized.title);
            const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
            const questLogLabel = app._escapeHtml(app._label('quest.title', 'Quests'));
            const accepted = app._escapeHtml(app._label('quest.accepted', 'Quest accepted: {title}.', { title: normalized.title }));
            app.showCreaturePanelDetail(title, `<h3>${title}</h3><p style="color:var(--text-muted);margin-top:8px;">${accepted}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;"><button class="nav-btn primary" title="${questLogLabel}" aria-label="${questLogLabel}" onclick="App.showQuestLog()">${questLogLabel}</button><button class="nav-btn" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closePanelDetails('creature')">${closeLabel}</button></div>`);
        } else {
            app.showQuestLog();
        }
        app.autoSave();
        return normalized;
    },

    objectiveMatches(app, type, payload, objective) {
        if (!objective || objective.complete || objective.type !== type) return false;
        if (objective.species && objective.species !== payload.species && objective.species !== payload.target?.species) return false;
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
                if (quest.turnInRequired) {
                    app.log.push({ text: app._label('quest.completedTurnIn', 'Quest completed: {title}. Return to {giver} for your reward.', { title: quest.title, giver: quest.giverName || app._label('quest.defaultGiver', 'the quest giver') }), type: 'discovery' });
                } else {
                    this.grantReward(app, quest);
                    app.log.push({ text: app._label('quest.completed', 'Quest completed: {title}.', { title: quest.title }), type: 'discovery' });
                }
            }
        }
        if (changed) {
            app.renderLog();
            app.renderParty();
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
            app.renderLog();
            return false;
        }
        if (quest.rewardClaimed) {
            app.log.push({ text: app._label('quest.alreadyTurnedIn', '{title} has already been turned in.', { title: quest.title }), type: 'discovery' });
            app.renderLog();
            app.showQuestLog();
            return false;
        }
        const granted = this.grantReward(app, quest);
        if (granted) app.log.push({ text: app._label('quest.turnedIn', 'Quest turned in: {title}.', { title: quest.title }), type: 'loot' });
        app.renderLog();
        app.renderParty();
        app.showQuestLog();
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
        app.log.push({ text: app._label('quest.mapFocusedObjective', 'Map focused on {title}: {label}.', { title: quest.title, label: marker.label || objective.label || this.objectiveLabel(app, objective) }), type: 'discovery' });
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
        app.log.push({ text: app._label('quest.mapFocusedTurnIn', 'Map focused on {title} turn-in: {label}.', { title: quest.title, label: marker.label }), type: 'discovery' });
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
