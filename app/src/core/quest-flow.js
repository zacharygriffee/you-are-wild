/**
 * YOU ARE WILD QUEST FLOW
 * Quest normalization, acceptance, progress, rewards, turn-in, and map focus.
 */

const YAW_QUEST_FLOW = {
    normalize(app, quest, giver = null) {
        const source = quest || {};
        const id = source.id || `quest_${app._stableIdPart(giver?.id || giver?.name, 'giver')}`;
        const generatedTitle = Boolean(source.generatedTitle || !source.title);
        const metadata = YAW_QUEST_CONTRACT.normalizeMetadata(source, giver);
        const normalized = {
            id,
            title: generatedTitle ? app._label('quest.untitled', 'Untitled Quest') : source.title,
            generatedTitle,
            description: source.description || '',
            titleKey: source.titleKey || null,
            titleParams: source.titleParams && typeof source.titleParams === 'object' ? { ...source.titleParams } : {},
            descriptionKey: source.descriptionKey || null,
            descriptionParams: source.descriptionParams && typeof source.descriptionParams === 'object' ? { ...source.descriptionParams } : {},
            giverId: source.giverId || giver?.id || giver?.name || null,
            giverName: source.giverName || giver?.name || null,
            giverLocation: source.giverLocation || giver?.giverLocation || (giver ? { x: Number(app.location?.x || 0), y: Number(app.location?.y || 0), label: giver.name || app._label('quest.giverFallback', 'Quest giver') } : null),
            status: source.status || 'available',
            turnInRequired: metadata.turnInPolicy.type !== YAW_QUEST_CONTRACT.POLICIES.AUTOMATIC,
            rewardClaimed: Boolean(source.rewardClaimed),
            objectives: (source.objectives || []).map((objective, index) => this.normalizeObjective(app, objective, id, index)),
            reward: source.reward || source.rewards || {},
            procedural: Boolean(source.procedural),
            archetype: source.archetype || null,
            difficulty: Math.max(0, Math.floor(Number(source.difficulty) || 0)),
            templateId: source.templateId || null,
            grantOnAccept: Array.isArray(source.grantOnAccept) ? source.grantOnAccept.map(item => ({ ...item })) : [],
            consumeOnTurnIn: Array.isArray(source.consumeOnTurnIn) ? [...source.consumeOnTurnIn] : [],
            stageGraph: YAW_QUEST_CONTRACT.normalizeStageGraph(source.stageGraph),
            worldDirectives: YAW_QUEST_CONTRACT.normalizeWorldDirectives(app, source.worldDirectives, id, {
                allowUnavailable: source.authoredOrigin?.kind === 'module'
                    && source.lifecycleState != null
                    && source.lifecycleState !== YAW_QUEST_CONTRACT.STATES.AVAILABLE
            }),
            ...metadata
        };
        return YAW_QUEST_CONTRACT.sync(normalized, metadata.lifecycleState);
    },

    ensure(app, quest, giver = null) {
        if (!quest) return null;
        const normalized = this.normalize(app, quest, giver);
        Object.assign(quest, normalized);
        return quest;
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
            location: location ? {
                x: Number(location.x),
                y: Number(location.y),
                ...(location.label ? { label: String(location.label) } : {})
            } : null,
            checkpoints,
            required,
            progress: objective.progress || 0,
            complete: Boolean(objective.complete)
        };
        if (normalized.type === 'defeat') {
            normalized.resolvedTargetIds = [...new Set((Array.isArray(objective.resolvedTargetIds) ? objective.resolvedTargetIds : [])
                .map(value => String(value || '').trim())
                .filter(Boolean))].slice(-256);
        }
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
        const itemDefinition = objective.item ? app._getItemDef(objective.item) : {};
        const itemLabel = objective.item && typeof objective.item === 'object'
            ? objective.item.name || itemDefinition.name || objective.item.definitionId || objective.item.id
            : objective.item;
        const target = itemLabel || this.speciesLabel(app, objective.species) || objective.targetId || objective.location?.label || app._label('quest.objective.target', 'target');
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
        if (quest?.titleKey) return app._label(quest.titleKey, quest.title || app._label('quest.untitled', 'Untitled Quest'), quest.titleParams || {});
        return quest?.generatedTitle ? app._label('quest.untitled', 'Untitled Quest') : quest?.title || app._label('quest.untitled', 'Untitled Quest');
    },

    descriptionLabel(app, quest) {
        if (quest?.descriptionKey) return app._label(quest.descriptionKey, quest.description || '', quest.descriptionParams || {});
        return quest?.description || '';
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
        for (const item of reward.items || []) {
            const definition = app._getItemDef(item);
            const name = item && typeof item === 'object' ? item.name || definition.name || item.definitionId || item.id : item;
            parts.push(app._label('quest.reward.item', '{name}', { name }));
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

    protectsItem(app, item) {
        if (!item || typeof item !== 'object') return false;
        const definition = app._getItemDef(item);
        if (item.bound || item.quest || item.questItem || definition.bound || definition.questItem || definition.keyItem) return true;
        const definitionId = definition.id || item.definitionId || null;
        const name = String(item.name || definition.name || '');
        return (app.quests || []).some(quest => {
            if (!quest || quest.rewardClaimed || !['active', 'completed'].includes(quest.status)) return false;
            return (quest.objectives || []).some(objective => {
                if (!['find', 'deliver', 'recover'].includes(objective?.type) || !objective.item) return false;
                const required = objective.item;
                const requiredDef = app._getItemDef(required);
                const requiredId = requiredDef.id
                    || (required && typeof required === 'object' ? required.definitionId || required.id : null);
                const requiredName = String(required && typeof required === 'object' ? required.name || requiredDef.name || '' : required);
                return Boolean(definitionId && requiredId && definitionId === requiredId)
                    || Boolean(name && requiredName && name === requiredName);
            });
        });
    },

    giverByKey(app, targetId) {
        return app.creatures.find(c => String(c.id || c.name) === String(targetId)
            && c.quest
            && YAW_UNIT_CONTAINMENT.serviceAvailable(app, c));
    },

    templateForStructure(app, structureId, tile = null) {
        const config = app.STRUCTURES[structureId]?.quest;
        const templates = config?.templates || [];
        const procedural = (config?.archetypes || []).map(archetype => `procedural:${archetype}`);
        const candidates = [...templates, ...procedural];
        if (!candidates.length) return null;
        const x = tile?.x ?? 0;
        const y = tile?.y ?? 0;
        const templateId = typeof WorldGen !== 'undefined'
            ? (WorldGen.pickWeighted(app._mapSeed(), app.worldMeta?.generatorVersion || 1, 'structure-quest-template', x, y, candidates) || candidates[0])
            : candidates[0];
        if (String(templateId).startsWith('procedural:')) {
            return YAW_QUEST_CONTRACT.generate(app, String(templateId).slice('procedural:'.length), {
                origin: { x, y },
                giverName: app.STRUCTURES[structureId]?.name || app._label('quest.giverFallback', 'Quest giver'),
                sequence: 0
            });
        }
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
        const questSource = this.templateForStructure(app, structureId, tile);
        if (!questSource) return null;
        const quest = this.normalize(app, questSource);
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
        const giver = app._normalizeUnit({
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
        if (giver.quest) {
            giver.quest.giverId = giver.id;
            giver.quest.giverName = giver.name;
            giver.quest.giverLocation = { x: Number(x), y: Number(y), label: giver.name };
            if (giver.quest.turnInPolicy?.type === YAW_QUEST_CONTRACT.POLICIES.ORIGINAL_GIVER) {
                giver.quest.turnInPolicy.giverId = giver.id;
            }
        }
        return giver;
    },

    generateProcedural(app, archetype, context = {}) {
        return this.normalize(app, YAW_QUEST_CONTRACT.generate(app, archetype, context), context.giver || null);
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
        const questTitle = this.titleLabel(app, normalized);
        const questDescription = this.descriptionLabel(app, normalized);
        const targetKey = giver ? String(giver.id || giver.name || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'") : '';
        const title = app._escapeHtml(app._label('quest.previewTitle', 'Quest Preview'));
        const acceptLabel = app._escapeHtml(app._label('action.acceptQuest', 'Accept Quest'));
        const acceptTitle = app._escapeHtml(app._label('action.acceptQuestFrom', 'Accept quest from {name}', { name: giver?.name || normalized.giverName || questTitle }));
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        let html = `<div class="quest-preview" data-command-surface="quest-preview" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-intent="quest" style="max-width:720px;margin:0 auto;text-align:left;display:grid;gap:12px;">`;
        html += `<h3 style="color:var(--accent-primary);margin:0;">${title}: ${app._escapeHtml(questTitle)}</h3>`;
        if (questDescription) html += `<p style="color:var(--text-secondary);margin:0;">${app._escapeHtml(questDescription)}</p>`;
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
        app.showCreaturePanelDetail(questTitle, html);
        return true;
    },

    accept(app, quest, giver = null) {
        if (!app._guardRecoveryCapability?.('interactions', { action: 'accept-quest' })) return false;
        const normalized = this.normalize(app, quest, giver);
        const questTitle = this.titleLabel(app, normalized);
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
        const acceptanceItems = Array.isArray(normalized.grantOnAccept) ? normalized.grantOnAccept : [];
        for (const item of acceptanceItems) {
            const itemRef = item?.definitionId || item?.id || item?.name;
            if (!app._canAddInventoryItem(itemRef, item?.quantity || 1)) {
                const text = app._label('quest.acceptInventoryFull', 'Make room in your pack before accepting {title}.', { title: questTitle });
                app.log.push({ text, type: 'discovery' });
                app.renderLog();
                return false;
            }
        }
        YAW_QUEST_CONTRACT.sync(normalized, YAW_QUEST_CONTRACT.STATES.ACTIVE);
        app.quests.push(normalized);
        YAW_QUEST_CONTRACT.activateWorldDirectives(app, normalized);
        acceptanceItems.forEach((item, index) => {
            const itemRef = item?.definitionId || item?.id || item?.name;
            app._addInventoryItem(itemRef, {
                ...item,
                id: `quest_start_${app._stableIdPart(normalized.id, 'quest')}_${index}`
            });
        });
        this.applyStageEvent(app, normalized, 'accept', { giverId: normalized.giverId });
        if (giver) {
            giver.questAccepted = true;
            if (giver.quest) giver.quest.status = 'active';
        }
        const acceptedText = app._label('quest.accepted', 'Quest accepted: {title}.', { title: questTitle });
        app.log.push({ text: acceptedText, type: 'discovery' });
        app.showToast?.({ text: acceptedText, type: 'quest', importance: 'notable', dedupeKey: `quest-accepted:${normalized.id}` });
        app.emitTransactionSceneBeat?.(giver, 'quest', 'accepted', {
            title: questTitle,
            questTitle
        });
        app.renderLog();
        app.renderCreatures();
        if (app.refreshTransactionWindow?.()) {
            app.markAutoSaveDirty?.(['manifest', 'quests', 'sceneFeed', 'activityLog'], 'quest-accept');
            app.autoSave();
            return normalized;
        }
        if (giver) {
            const title = app._escapeHtml(questTitle);
            const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
            const questLogLabel = app._escapeHtml(app._label('quest.title', 'Quests'));
            const accepted = app._escapeHtml(app._label('quest.accepted', 'Quest accepted: {title}.', { title: questTitle }));
            app.showCreaturePanelDetail(title, `<h3>${title}</h3><p style="color:var(--text-muted);margin-top:8px;">${accepted}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;"><button class="nav-btn primary" data-command-surface="target-detail" data-command-mode="exploration" data-command-control="open-quest-log" title="${questLogLabel}" aria-label="${questLogLabel}" onclick="App.showQuestLog()">${questLogLabel}</button><button class="nav-btn" data-command-surface="target-detail" data-command-mode="exploration" data-command-control="close-target-detail" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closePanelDetails('creature')">${closeLabel}</button></div>`);
        } else {
            app.showQuestLog();
        }
        app.markAutoSaveDirty?.(['manifest', 'quests', 'sceneFeed', 'activityLog'], 'quest-accept');
        app.autoSave();
        return normalized;
    },

    objectiveMatches(app, type, payload, objective) {
        if (!objective || objective.complete) return false;
        const compatibleType = objective.type === type
            || (objective.type === 'deliver' && type === 'travel')
            || (objective.type === 'recover' && type === 'find');
        if (!compatibleType) return false;
        if (objective.species && !this.speciesObjectiveMatches(app, objective.species, payload)) return false;
        if (objective.targetId && String(objective.targetId) !== String(payload.targetId || payload.target?.id || payload.target?.name)) return false;
        if (objective.item && objective.type !== 'deliver') {
            const requiredDefinition = app._getItemDef(objective.item);
            const payloadDefinition = app._getItemDef(payload.definitionId || payload.item || payload.name);
            const requiredId = requiredDefinition.id
                || (typeof objective.item === 'object' ? objective.item.definitionId || objective.item.id : null);
            const payloadId = payloadDefinition.id || payload.definitionId || null;
            const requiredName = String(typeof objective.item === 'object'
                ? objective.item.name || requiredDefinition.name || ''
                : objective.item);
            const payloadName = String(payload.item || payload.name || payloadDefinition.name || '');
            const idMatch = requiredId && payloadId && String(requiredId) === String(payloadId);
            const nameMatch = requiredName && payloadName && requiredName === payloadName;
            if (!idMatch && !nameMatch) return false;
        }
        if ((objective.type === 'escort' || objective.type === 'travel') && objective.location) {
            if (Number(objective.location.x) !== Number(payload.x) || Number(objective.location.y) !== Number(payload.y)) return false;
        }
        if (objective.type === 'deliver') {
            if (!objective.location
                || Number(objective.location.x) !== Number(payload.x)
                || Number(objective.location.y) !== Number(payload.y)) return false;
            if (this.itemQuantity(app, objective.item) < Math.max(1, Number(objective.required) || 1)) return false;
        }
        if (objective.type === 'recover' && objective.location) {
            if (Number(objective.location.x) !== Number(app.location?.x)
                || Number(objective.location.y) !== Number(app.location?.y)) return false;
        }
        return true;
    },

    itemIdentity(app, item) {
        const definition = app._getItemDef(item);
        return definition.id
            || (item && typeof item === 'object' ? item.definitionId || item.id : null)
            || String(item || '');
    },

    itemQuantity(app, itemRef) {
        const identity = this.itemIdentity(app, itemRef);
        return (app.inventory || []).reduce((total, item) => (
            this.itemIdentity(app, item) === identity
                ? total + Math.max(1, Math.floor(Number(item.quantity) || 1))
                : total
        ), 0);
    },

    requiredTurnInItems(app, quest) {
        const requested = Array.isArray(quest?.consumeOnTurnIn) ? quest.consumeOnTurnIn : [];
        return requested.map(itemRef => {
            const objective = (quest.objectives || []).find(entry => this.itemIdentity(app, entry.item) === this.itemIdentity(app, itemRef));
            return { itemRef, quantity: Math.max(1, Math.floor(Number(objective?.required) || 1)) };
        });
    },

    hasRequiredTurnInItems(app, quest) {
        return this.requiredTurnInItems(app, quest).every(entry => this.itemQuantity(app, entry.itemRef) >= entry.quantity);
    },

    consumeRequiredTurnInItems(app, quest) {
        if (!this.hasRequiredTurnInItems(app, quest)) return false;
        for (const requirement of this.requiredTurnInItems(app, quest)) {
            let remaining = requirement.quantity;
            for (const item of [...(app.inventory || [])]) {
                if (remaining <= 0 || this.itemIdentity(app, item) !== this.itemIdentity(app, requirement.itemRef)) continue;
                const removed = app._removeInventoryItem(item.id, remaining);
                remaining -= removed?.removed || 0;
            }
        }
        return true;
    },

    recoverableSearchItem(app, tile = app._currentExplorationTile?.()) {
        const x = Number(tile?.x ?? app.location?.x);
        const y = Number(tile?.y ?? app.location?.y);
        for (const rawQuest of app.quests || []) {
            const quest = this.ensure(app, rawQuest);
            if (quest.lifecycleState !== YAW_QUEST_CONTRACT.STATES.ACTIVE) continue;
            const objective = (quest.objectives || []).find(entry => (
                entry.type === 'recover'
                && !entry.complete
                && Number(entry.location?.x) === x
                && Number(entry.location?.y) === y
                && this.itemQuantity(app, entry.item) < Math.max(1, Number(entry.required) || 1)
            ));
            if (objective) return this.itemIdentity(app, objective.item);
        }
        return null;
    },

    applyStageEffect(app, quest, effect, transitionId, effectIndex) {
        if (effect.type === 'set_destination') {
            quest.destination = YAW_QUEST_CONTRACT.normalizeLocation(effect.location);
            return true;
        }
        if (effect.type === 'set_branch') {
            quest.branch = String(effect.branch || '');
            return true;
        }
        if (effect.type === 'log') {
            const text = String(effect.text || '').trim();
            if (text) app.log.push({ text, type: 'discovery' });
            return true;
        }
        if (effect.type === 'add_objective') {
            const objective = this.normalizeObjective(app, effect.objective, quest.id, quest.objectives.length);
            quest.objectives.push(objective);
            if (!quest.rewardClaimed && quest.lifecycleState !== YAW_QUEST_CONTRACT.STATES.FAILED) {
                YAW_QUEST_CONTRACT.sync(quest, YAW_QUEST_CONTRACT.STATES.ACTIVE);
            }
            return true;
        }
        if (effect.type === 'grant_item') {
            const item = effect.item;
            const itemRef = item.definitionId || item.id || item.name;
            const quantity = Math.max(1, Math.min(20, Math.floor(Number(item.quantity) || 1)));
            if (!app._canAddInventoryItem(itemRef, quantity)) return false;
            app._addInventoryItem(itemRef, {
                ...item,
                id: `quest_stage_${app._stableIdPart(quest.id, 'quest')}_${app._stableIdPart(transitionId, 'transition')}_${effectIndex}`,
                quantity
            });
            return true;
        }
        return false;
    },

    applyStageEvent(app, quest, event, payload = {}) {
        const normalized = this.ensure(app, quest);
        const transition = YAW_QUEST_CONTRACT.nextStageTransition(app, normalized, event, payload);
        if (!transition) return false;
        for (const effect of transition.effects.filter(entry => entry.type === 'grant_item')) {
            const itemRef = effect.item.definitionId || effect.item.id || effect.item.name;
            const quantity = Math.max(1, Math.min(20, Math.floor(Number(effect.item.quantity) || 1)));
            if (!app._canAddInventoryItem(itemRef, quantity)) return false;
        }
        transition.effects.forEach((effect, index) => this.applyStageEffect(app, normalized, effect, transition.id, index));
        if (transition.to) normalized.stageGraph.currentStage = transition.to;
        normalized.stageGraph.history.push(`${transition.id}:${event}`);
        normalized.stageGraph.history = normalized.stageGraph.history.slice(-32);
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

    partyActor(app, actor) {
        if (!actor) return null;
        const actorRef = app._unitSelectionId?.(actor) || actor.id || actor.name || null;
        return (app.party || []).find(unit => {
            if (unit === actor) return true;
            const unitRef = app._unitSelectionId?.(unit) || unit?.id || unit?.name || null;
            return actorRef && unitRef && String(actorRef) === String(unitRef);
        }) || null;
    },

    resolutionTargetId(app, target) {
        if (!target) return '';
        return String(
            target.questResolutionId
            || target.containedId
            || target.id
            || app._unitSelectionId?.(target)
            || target.name
            || ''
        ).trim();
    },

    recordDefeat(app, target, actor, resolution, options = {}) {
        const allowed = new Set(['slain', 'subdued', 'contained']);
        if (!target || !allowed.has(String(resolution || ''))) return false;
        if (!this.partyActor(app, actor)) return false;
        const wasHostile = typeof options.wasHostile === 'boolean'
            ? options.wasHostile
            : target.disposition === app.DISPOSITION.ENEMY;
        if (!wasHostile) return false;
        const resolutionId = this.resolutionTargetId(app, target);
        if (!resolutionId) return false;
        return this.updateProgress(app, 'defeat', {
            target,
            targetId: target.id || target.containedId || target.name,
            species: target.species,
            name: target.name,
            resolution: String(resolution),
            resolutionId,
            actorId: app._unitSelectionId?.(actor) || actor.id || actor.name,
            partyCaused: true,
            source: options.source || null
        });
    },

    updateProgress(app, type, payload = {}) {
        let changed = false;
        for (const rawQuest of app.quests || []) {
            const quest = this.ensure(app, rawQuest);
            if (quest.lifecycleState !== YAW_QUEST_CONTRACT.STATES.ACTIVE) continue;
            quest.rewardClaimed = Boolean(quest.rewardClaimed);
            for (const objective of quest.objectives || []) {
                if (!this.objectiveMatches(app, type, payload, objective)) continue;
                const resolutionId = type === 'defeat' ? String(payload.resolutionId || '').trim() : '';
                if (resolutionId && (objective.resolvedTargetIds || []).includes(resolutionId)) continue;
                if (objective.type === 'escort' && objective.checkpoints?.length) {
                    const checkpoint = this.nextCheckpoint(app, objective);
                    if (!checkpoint || Number(checkpoint.x) !== Number(payload.x) || Number(checkpoint.y) !== Number(payload.y)) continue;
                    checkpoint.complete = true;
                }
                objective.progress = Math.min(objective.required, (objective.progress || 0) + (payload.count || 1));
                objective.complete = objective.progress >= objective.required;
                if (resolutionId) {
                    objective.resolvedTargetIds = [...new Set([
                        ...(objective.resolvedTargetIds || []),
                        resolutionId
                    ])].slice(-256);
                }
                this.applyStageEvent(app, quest, type, { ...payload, objectiveId: objective.id });
                changed = true;
            }
            if (YAW_QUEST_CONTRACT.objectivesComplete(quest) && quest.lifecycleState === YAW_QUEST_CONTRACT.STATES.ACTIVE) {
                YAW_QUEST_CONTRACT.advanceAfterObjectives(quest);
                this.applyStageEvent(app, quest, 'objective_complete', {});
                const questTitle = this.titleLabel(app, quest);
                if (quest.lifecycleState === YAW_QUEST_CONTRACT.STATES.READY_FOR_TURN_IN) {
                    const completedText = app._label('quest.completedTurnIn', 'Quest completed: {title}. Return to {giver} for your reward.', { title: questTitle, giver: quest.giverName || app._label('quest.defaultGiver', 'the quest giver') });
                    app.log.push({ text: completedText, type: 'discovery' });
                    app.showToast?.({ text: completedText, type: 'quest', importance: 'major', dedupeKey: `quest-completed:${quest.id}` });
                } else if (quest.lifecycleState === YAW_QUEST_CONTRACT.STATES.OBJECTIVES_COMPLETE) {
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
            const itemRef = itemName && typeof itemName === 'object'
                ? itemName.definitionId || itemName.id || itemName.name
                : itemName;
            if (app._canAddInventoryItem(itemRef, itemName?.quantity || 1)) {
                app._addInventoryItem(itemRef, {
                    id: `quest_item_${app._stableIdPart(quest.id, 'quest')}_${app._stableIdPart(itemName?.name || itemName)}_${app.inventory.length}`,
                    ...(itemName && typeof itemName === 'object' ? itemName : {})
                });
            }
        }
        if (reward.recruit && app.party.length < app.MAX_PARTY_SIZE) {
            const recruit = app._normalizeUnit({ ...reward.recruit }, { disposition: app.DISPOSITION.PARTY, ally: true, obedient: true, willing: true });
            app.party.push(recruit);
        }
        quest.rewardClaimed = true;
        YAW_QUEST_CONTRACT.deactivateWorldDirectives(app, quest);
        YAW_QUEST_CONTRACT.sync(quest, YAW_QUEST_CONTRACT.STATES.TURNED_IN);
        return true;
    },

    fail(app, questId, reason = '') {
        const quest = this.ensure(app, this.byId(app, questId));
        if (!quest || [YAW_QUEST_CONTRACT.STATES.TURNED_IN, YAW_QUEST_CONTRACT.STATES.FAILED].includes(quest.lifecycleState)) return false;
        YAW_QUEST_CONTRACT.sync(quest, YAW_QUEST_CONTRACT.STATES.FAILED);
        YAW_QUEST_CONTRACT.deactivateWorldDirectives(app, quest);
        quest.failureReason = String(reason || '');
        this.applyStageEvent(app, quest, 'fail', { reason: quest.failureReason });
        const text = app._label('quest.failed', 'Quest failed: {title}.', { title: this.titleLabel(app, quest) });
        app.log.push({ text, type: 'discovery' });
        app.showToast?.({ text, type: 'quest', importance: 'major', dedupeKey: `quest-failed:${quest.id}` });
        app.renderLog();
        app.markAutoSaveDirty?.(['manifest', 'quests', 'sceneFeed', 'activityLog'], 'quest-failed');
        app.autoSave();
        return true;
    },

    turnInEligibility(app, quest, context = {}) {
        const normalized = this.ensure(app, quest);
        const eligibility = YAW_QUEST_CONTRACT.turnInEligibility(app, normalized, context);
        if (eligibility.ok && !this.hasRequiredTurnInItems(app, normalized)) {
            return { ok: false, reason: 'missing-required-item', policy: eligibility.policy };
        }
        return eligibility;
    },

    turnIn(app, questId, context = {}) {
        const quest = this.ensure(app, this.byId(app, questId));
        const eligibility = this.turnInEligibility(app, quest, context);
        if (!quest) {
            app.log.push({ text: app._label('quest.notReadyTurnIn', 'That quest is not ready to turn in.'), type: 'discovery' });
            app.emitTransactionSceneBeat?.({ name: quest?.giverName || app._label('quest.defaultGiver', 'the quest giver') }, 'quest', 'blocked', {
                title: quest?.title || app._label('quest.title', 'Quests'),
                questTitle: quest?.title || '',
                reason: 'not-ready'
            });
            app.renderLog();
            return false;
        }
        if (quest.rewardClaimed || quest.lifecycleState === YAW_QUEST_CONTRACT.STATES.TURNED_IN) {
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
        if (quest.lifecycleState !== YAW_QUEST_CONTRACT.STATES.READY_FOR_TURN_IN) {
            app.log.push({ text: app._label('quest.notReadyTurnIn', 'That quest is not ready to turn in.'), type: 'discovery' });
            app.emitTransactionSceneBeat?.({ name: quest.giverName || app._label('quest.defaultGiver', 'the quest giver') }, 'quest', 'blocked', {
                title: quest.title || app._label('quest.title', 'Quests'),
                questTitle: quest.title || '',
                reason: 'not-ready'
            });
            app.renderLog();
            return false;
        }
        if (!eligibility.ok) {
            const text = app._label('quest.turnInUnavailable', 'Return to an authorized turn-in point for {title}.', {
                title: this.titleLabel(app, quest)
            });
            app.log.push({ text, type: 'discovery' });
            app.showToast?.({ text, type: 'quest', importance: 'notable', dedupeKey: `quest-turn-in-unavailable:${quest.id}` });
            app.renderLog();
            if (!app.refreshTransactionWindow?.()) app.showQuestLog();
            return false;
        }
        if (!this.consumeRequiredTurnInItems(app, quest)) return false;
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
            this.applyStageEvent(app, quest, 'turn_in', {});
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
        const policy = quest?.turnInPolicy || {};
        const location = policy.type === YAW_QUEST_CONTRACT.POLICIES.NAMED_LOCATION
            ? policy.location
            : (policy.type === YAW_QUEST_CONTRACT.POLICIES.ORIGINAL_GIVER
                ? quest?.giverLocation
                : (quest?.destination || quest?.giverLocation));
        if (!location || !Number.isFinite(Number(location.x)) || !Number.isFinite(Number(location.y))) return null;
        return {
            x: Number(location.x),
            y: Number(location.y),
            label: location.label
                || (policy.type === YAW_QUEST_CONTRACT.POLICIES.AUTHORIZED_FACTION ? policy.faction : '')
                || quest.giverName
                || 'Quest turn-in'
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
        const filter = ['all', 'active', 'completed', 'turn-in', 'failed'].includes(app.questFilter) ? app.questFilter : 'all';
        const sort = ['status', 'title'].includes(app.questSort) ? app.questSort : 'status';
        const quests = (app.quests || []).map(quest => this.ensure(app, quest)).filter(quest => {
            if (filter === 'all') return true;
            if (filter === 'turn-in') return quest.lifecycleState === YAW_QUEST_CONTRACT.STATES.READY_FOR_TURN_IN;
            if (filter === 'completed') return [YAW_QUEST_CONTRACT.STATES.OBJECTIVES_COMPLETE, YAW_QUEST_CONTRACT.STATES.TURNED_IN].includes(quest.lifecycleState);
            return quest.lifecycleState === filter;
        });
        return quests.sort((a, b) => {
            if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
            const weight = quest => ({
                active: 0,
                objectives_complete: 1,
                ready_for_turn_in: 2,
                available: 3,
                turned_in: 4,
                failed: 5
            }[quest.lifecycleState] ?? 6);
            return weight(a) - weight(b) || (a.title || '').localeCompare(b.title || '');
        });
    },

    setFilter(app, filter) {
        app.questFilter = ['all', 'active', 'turn-in', 'completed', 'failed'].includes(filter) ? filter : 'all';
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
