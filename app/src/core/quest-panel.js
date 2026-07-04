/**
 * YOU ARE WILD QUEST PANEL
 * Quest log, route preview, and quest guidance rendering helpers.
 */

const YAW_QUEST_PANEL = {
    progressText(app, quest) {
        return (quest.objectives || []).map(objective => {
            const done = objective.complete ? '✓' : '•';
            const checkpoint = app._nextQuestCheckpoint(objective);
            const next = checkpoint ? ` → ${checkpoint.label} (${checkpoint.x}, ${checkpoint.y})` : '';
            return `${done} ${app._escapeHtml(objective.label || app._questObjectiveLabel(objective))} (${objective.progress || 0}/${objective.required || 1})${app._escapeHtml(next)}`;
        }).join('<br>');
    },

    routePreviewText(app, objective) {
        if (!Array.isArray(objective?.checkpoints) || objective.checkpoints.length === 0) return '';
        const next = app._nextQuestCheckpoint(objective);
        return objective.checkpoints.map((checkpoint, index) => {
            const state = checkpoint.complete ? 'complete' : (next === checkpoint ? 'current' : 'pending');
            const marker = state === 'complete' ? '✓' : (state === 'current' ? '→' : '•');
            const label = checkpoint.label || app._label('quest.checkpoint', 'Checkpoint');
            const stateLabel = app._questCheckpointStateLabel(state);
            const bg = state === 'current' ? 'var(--bg-elevated)' : 'transparent';
            const border = state === 'current' ? 'var(--accent-primary)' : (state === 'complete' ? 'var(--accent-success)' : 'var(--border-subtle)');
            const color = state === 'complete' ? 'var(--accent-success)' : (state === 'current' ? 'var(--text-primary)' : 'var(--text-muted)');
            const guidance = state === 'current' ? app._questCheckpointGuidance(checkpoint) : '';
            const guidanceHtml = guidance ? `<span style="color:var(--accent-primary);font-size:10px;">${app._escapeHtml(guidance)}</span>` : '';
            const ariaGuidance = guidance ? `, ${guidance}` : '';
            const ariaLabel = app._label('quest.checkpointAria', '{state} checkpoint {index}: {label} at {x}, {y}{guidance}', {
                state: stateLabel,
                index: index + 1,
                label,
                x: checkpoint.x,
                y: checkpoint.y,
                guidance: ariaGuidance
            });
            return `<div class="quest-route-step ${state}" aria-label="${app._escapeHtml(ariaLabel)}" style="display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid ${border};border-radius:var(--radius-sm);background:${bg};color:${color};"><span aria-hidden="true">${marker}</span><span>${app._escapeHtml(label)}</span>${guidanceHtml}<span style="margin-left:auto;color:var(--text-muted);">(${checkpoint.x}, ${checkpoint.y})</span></div>`;
        }).join('');
    },

    checkpointStateLabel(app, state) {
        if (state === 'complete') return app._label('quest.checkpoint.complete', 'Complete');
        if (state === 'current') return app._label('quest.checkpoint.current', 'Current');
        return app._label('quest.checkpoint.pending', 'Pending');
    },

    checkpointGuidance(app, checkpoint) {
        const dx = Number(checkpoint?.x ?? 0) - Number(app.location?.x ?? 0);
        const dy = Number(checkpoint?.y ?? 0) - Number(app.location?.y ?? 0);
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance === 0) return app._label('quest.youAreHere', 'You are here');
        const directions = [];
        if (dy < 0) directions.push(app._label('quest.direction.north', '{count} north', { count: Math.abs(dy) }));
        if (dy > 0) directions.push(app._label('quest.direction.south', '{count} south', { count: Math.abs(dy) }));
        if (dx > 0) directions.push(app._label('quest.direction.east', '{count} east', { count: Math.abs(dx) }));
        if (dx < 0) directions.push(app._label('quest.direction.west', '{count} west', { count: Math.abs(dx) }));
        const terrain = app._questRouteTerrainHint(checkpoint);
        const stepLabel = app._label(distance === 1 ? 'quest.step.singular' : 'quest.step.plural', distance === 1 ? 'step' : 'steps');
        const guidance = app._label('quest.guidance', '{distance} {stepLabel} {directions}', {
            distance,
            stepLabel,
            directions: directions.join(', ')
        });
        return `${guidance}${terrain ? `; ${terrain}` : ''}`;
    },

    routeKnownTiles(app, checkpoint) {
        const targetX = Number(checkpoint?.x ?? 0);
        const targetY = Number(checkpoint?.y ?? 0);
        let x = Number(app.location?.x ?? 0);
        let y = Number(app.location?.y ?? 0);
        const tiles = [];
        const stepX = targetX === x ? 0 : (targetX > x ? 1 : -1);
        while (x !== targetX) {
            x += stepX;
            const tile = app.worldMap?.get(app._tileKey(x, y));
            if (tile) tiles.push(tile);
        }
        const stepY = targetY === y ? 0 : (targetY > y ? 1 : -1);
        while (y !== targetY) {
            y += stepY;
            const tile = app.worldMap?.get(app._tileKey(x, y));
            if (tile) tiles.push(tile);
        }
        return tiles;
    },

    routeTerrainHint(app, checkpoint) {
        const knownTiles = app._questRouteKnownTiles(checkpoint);
        if (!knownTiles.length) return '';
        const counts = knownTiles.reduce((acc, tile) => {
            const biomeId = tile?.biome;
            const role = app.biomes[biomeId]?.role || 'region';
            if (role === 'route' || biomeId === 'road') acc.road += 1;
            if (biomeId === 'bridge') acc.bridge += 1;
            if (['water', 'swamp', 'cave'].includes(biomeId)) acc.rough += 1;
            return acc;
        }, { road: 0, bridge: 0, rough: 0 });
        const notes = [];
        if (counts.road || counts.bridge) {
            const routeParts = [];
            if (counts.road) routeParts.push(app._label('quest.terrainRoad', '{count} road', { count: counts.road }));
            if (counts.bridge) routeParts.push(app._label('quest.terrainBridge', '{count} bridge', { count: counts.bridge }));
            notes.push(app._label('quest.terrainKnownRoute', 'known route crosses {parts}', { parts: routeParts.join(', ') }));
        }
        if (counts.rough) notes.push(app._label('quest.terrainRough', '{count} rough terrain', { count: counts.rough }));
        return notes.join('; ');
    },

    logControls(app) {
        const statusLabel = app._escapeHtml(app._label('quest.status', 'Status'));
        const sortLabel = app._escapeHtml(app._label('quest.sort', 'Sort'));
        const filterOptions = [
            ['all', app._label('quest.filter.all', 'All')],
            ['active', app._label('quest.filter.active', 'Active')],
            ['turn-in', app._label('quest.filter.turnIn', 'Turn In')],
            ['completed', app._label('quest.filter.completed', 'Completed')]
        ];
        const sortOptions = [
            ['status', app._label('quest.sort.status', 'Status')],
            ['title', app._label('quest.sort.title', 'Title')]
        ];
        return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px;">
            <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">${statusLabel}
                <select class="nav-btn" style="padding:4px 8px;font-size:11px;" title="${statusLabel}" aria-label="${statusLabel}" onchange="App.setQuestFilter(this.value)">
                    ${filterOptions.map(([value, label]) => `<option value="${value}" ${app.questFilter === value ? 'selected' : ''}>${app._escapeHtml(label)}</option>`).join('')}
                </select>
            </label>
            <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">${sortLabel}
                <select class="nav-btn" style="padding:4px 8px;font-size:11px;" title="${sortLabel}" aria-label="${sortLabel}" onchange="App.setQuestSort(this.value)">
                    ${sortOptions.map(([value, label]) => `<option value="${value}" ${app.questSort === value ? 'selected' : ''}>${app._escapeHtml(label)}</option>`).join('')}
                </select>
            </label>
        </div>`;
    },

    statusLabel(app, quest) {
        const needsTurnIn = quest.status === 'completed' && quest.turnInRequired && !quest.rewardClaimed;
        if (needsTurnIn) return app._label('quest.status.turnIn', 'Turn In');
        if (quest.status === 'completed') return app._label('quest.status.completed', 'Completed');
        return app._label('quest.status.active', 'Active');
    },

    markerPreview(app, marker, objective) {
        const label = marker.label || objective.label || app._questObjectiveLabel(objective);
        return app._label('quest.markerPreview', 'Marker: {label} ({x}, {y})', { label, x: marker.x, y: marker.y });
    },

    turnInPreview(app, marker) {
        return app._label('quest.turnInPreview', 'Turn in with {label} ({x}, {y})', { label: marker.label, x: marker.x, y: marker.y });
    },

    showLog(app) {
        const quests = app.quests || [];
        const titleLabel = app._escapeHtml(app._label('quest.title', 'Quests'));
        const backLabel = app._escapeHtml(app._label('inventory.back', 'Back'));
        const backButton = `<button class="nav-btn" style="margin-top:12px" title="${backLabel}" aria-label="${backLabel}" onclick="App.showExplorationActions()">${backLabel}</button>`;
        const sceneDescription = document.getElementById('scene-description');
        if (!sceneDescription) return;
        if (quests.length === 0) {
            sceneDescription.innerHTML = `<h3>${titleLabel}</h3><p style="color:var(--text-muted)">${app._escapeHtml(app._label('quest.noneActive', 'No active quests.'))}</p>${backButton}`;
            return;
        }
        const visibleQuests = app._filteredQuestEntries();
        let html = `<h3>${titleLabel}</h3>${app._questLogControls()}`;
        if (visibleQuests.length === 0) {
            html += `<p style="color:var(--text-muted);margin-top:12px;">${app._escapeHtml(app._label('quest.noneMatchFilter', 'No quests match the current filter.'))}</p>${backButton}`;
            sceneDescription.innerHTML = html;
            return;
        }
        html += `<div style="display:grid;gap:12px;margin-top:12px;">`;
        visibleQuests.forEach(quest => {
            const needsTurnIn = quest.status === 'completed' && quest.turnInRequired && !quest.rewardClaimed;
            const status = app._escapeHtml(app._questStatusLabel(quest));
            html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="font-weight:700;color:var(--text-primary)">${app._escapeHtml(quest.title)} <span style="font-size:11px;color:var(--text-muted)">[${status}]</span></div>`;
            if (quest.description) html += `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${app._escapeHtml(quest.description)}</div>`;
            html += `<div style="font-size:12px;color:var(--text-primary);margin-top:8px;line-height:1.6">${app._questProgressText(quest)}</div>`;
            for (const objective of quest.objectives || []) {
                const routePreview = app._questRoutePreviewText(objective);
                const marker = app._nextQuestObjectiveMarker(objective);
                if (!routePreview && !marker) continue;
                html += `<div class="quest-route-preview" style="display:grid;gap:4px;font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5">${routePreview || app._escapeHtml(app._questMarkerPreview(marker, objective))}</div>`;
                if (marker && quest.status === 'active') {
                    const showMapLabel = app._escapeHtml(app._label('quest.showOnMap', 'Show On Map'));
                    const showMapTitle = app._escapeHtml(app._label('quest.showOnMapFor', 'Show {name} on map', { name: quest.title }));
                    html += `<button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${showMapTitle}" aria-label="${showMapTitle}" onclick="App.focusQuestOnMap('${String(quest.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}','${String(objective.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')">${showMapLabel}</button>`;
                }
            }
            if (needsTurnIn) {
                const turnInMarker = app._questTurnInMarker(quest);
                if (turnInMarker) {
                    const guidance = app._questCheckpointGuidance(turnInMarker);
                    html += `<div class="quest-route-preview" style="display:grid;gap:4px;font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5">${app._escapeHtml(app._questTurnInPreview(turnInMarker))}${guidance ? ` · ${app._escapeHtml(guidance)}` : ''}</div>`;
                    const showTurnInLabel = app._escapeHtml(app._label('quest.showTurnIn', 'Show Turn-In'));
                    const showTurnInTitle = app._escapeHtml(app._label('quest.showTurnInFor', 'Show turn-in for {name}', { name: quest.title }));
                    html += `<button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${showTurnInTitle}" aria-label="${showTurnInTitle}" onclick="App.focusQuestTurnInOnMap('${String(quest.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')">${showTurnInLabel}</button>`;
                }
                const turnInLabel = app._escapeHtml(app._label('quest.turnIn', 'Turn In'));
                const turnInTitle = app._escapeHtml(app._label('quest.turnInQuest', 'Turn in {name}', { name: quest.title }));
                html += `<button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${turnInTitle}" aria-label="${turnInTitle}" onclick="App.turnInQuest('${String(quest.id).replace(/'/g, "\\'")}')">${turnInLabel}</button>`;
            }
            html += `</div>`;
        });
        html += `</div>${backButton}`;
        sceneDescription.innerHTML = html;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_QUEST_PANEL = YAW_QUEST_PANEL;
}
