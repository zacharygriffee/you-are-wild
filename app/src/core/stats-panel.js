/**
 * YOU ARE WILD STATS PANEL
 * Party/member stats, player stats, and perk-selection panel rendering.
 */

const YAW_STATS_PANEL = {
    statCard(app, labelKey, fallback, body) {
        return `<div class="option-card"><strong>${app._escapeHtml(app._label(labelKey, fallback))}</strong><br>${body}</div>`;
    },

    bodyTypeLabel(value, app = null) {
        const labels = {
            clit: ['anatomy.adult.vulva', 'Lower Option A'],
            cock: ['anatomy.adult.penis', 'Lower Option B'],
            tits: ['anatomy.adult.breasts', 'Chest Option A'],
            pecs: ['anatomy.adult.pecs', 'Chest Option B']
        };
        const label = labels[value];
        return label ? (app?._label?.(label[0], label[1]) || label[1]) : value;
    },

    showPartyMember(app, index) {
        const unit = app.party[index];
        if (!unit) return;
        const stats = app._unitDisplayStats(unit);
        const statusKey = app._getPartyLeader() === unit ? 'party.leader' : (unit === app.player ? 'party.you' : 'party.ally');
        const statusText = app._escapeHtml(app._label(statusKey, statusKey === 'party.leader' ? 'Leader' : statusKey === 'party.you' ? 'You' : 'Ally'));
        const levelText = app._escapeHtml(app._label('party.levelSpecies', 'Level {level} {species}', { level: stats.level, species: unit.species }));
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        const backLabel = app._escapeHtml(app._label('inventory.back', 'Back'));
        const perks = (unit.perks || []).map(perk => app._escapeHtml(app._perkDisplayName(perk, unit))).join(', ') || app._escapeHtml(app._label('party.none', 'None'));
        const html = `<div class="party-stats-view" data-command-surface="stats-detail" data-command-mode="exploration" role="region" aria-label="${app._escapeHtml(app._label('party.statsFor', 'Show stats for {name}', { name: unit.name }))}">
            <div class="party-stats-header">
                <div><h3>${unit.icon || ''} ${app._escapeHtml(unit.name)}</h3><p style="color:var(--text-muted);margin-top:4px">${statusText} | ${levelText}</p></div>
                <button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="close-stats" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closePanelDetails('party')">${closeLabel}</button>
            </div>
            <div class="party-stats-grid">
                ${this.statCard(app, 'party.punishment', 'Punishment', `${stats.CPun}/${stats.MPun}`)}
                ${this.statCard(app, 'party.pleasure', 'Spirit', `${stats.CPle}/${stats.MPle}`)}
                ${this.statCard(app, 'party.combat', 'Combat', `Figh ${stats.Figh} | Feas ${stats.Feas}<br>Flir ${stats.Flir} | ${app._escapeHtml(app._uiLabel('fuck'))} ${stats.Fuck}<br>Flee ${stats.Flee} | Feed ${stats.Feed}`)}
                ${this.statCard(app, 'party.attributes', 'Attributes', `STR ${stats.str} | CON ${stats.con} | SPD ${stats.spd}<br>INT ${stats.int} | WIS ${stats.wis} | CHA ${stats.cha}`)}
                ${this.statCard(app, 'party.capacity', 'Capacity', `${app._containerSummary(unit, 'stomach')} ${app._escapeHtml(app._label('capacity.stomach', 'Belly'))}<br>${app._containerSummary(unit, 'womb')} ${app._escapeHtml(app._label('capacity.womb', 'Inner'))}<br>${app._containerSummary(unit, 'balls')} ${app._escapeHtml(app._label('capacity.balls', 'Reserve'))}`)}
                ${this.statCard(app, 'party.equipment', 'Equipment', app._equipmentCompactSummary(unit))}
                ${this.statCard(app, 'party.perks', 'Perks', perks)}
            </div>
            <div class="party-stats-footer"><button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="close-stats" data-command-slot="exit" title="${backLabel}" aria-label="${backLabel}" onclick="App.closePanelDetails('party')">${backLabel}</button></div></div>`;
        app.showPartyPanelDetail(`${unit.icon || ''} ${unit.name}`, html);
    },

    showCharacter(app) {
        if (!app.player) return;
        const p = app._syncPlayerPartyReference() || app.player;
        const stats = app._unitDisplayStats(p);
        const pendingCount = p.pendingPerkChoices || 0;
        const choosePerkLabel = app._escapeHtml(app._label('perk.chooseCount', 'Choose Perk ({count})', { count: pendingCount }));
        const respecLabel = app._escapeHtml(app._label('perk.respec', 'Respec Perks'));
        const closeLabel = app._escapeHtml(app._label('perk.closeStats', 'Close'));
        const perkButton = pendingCount > 0 ? `<button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="open-perk-selection" style="margin-top:12px" title="${choosePerkLabel}" aria-label="${choosePerkLabel}" onclick="App.showPerkSelection()">${choosePerkLabel}</button>` : '';
        const respecDisabled = (p.perks || []).length ? '' : ' disabled';
        const levelText = app._escapeHtml(app._label('party.levelSpecies', 'Level {level} {species}', { level: stats.level, species: p.species }));
        const xpText = app._escapeHtml(app._label('character.xp', 'XP: {xp}/{xpToNext}', { xp: p.xp, xpToNext: p.xpToNext }));
        const noneText = app._escapeHtml(app._label('party.none', 'None'));
        const parts = app._escapeHtml(this.bodyTypeLabel(p.parts, app) || app._label('party.none', 'None'));
        const chest = app._escapeHtml(this.bodyTypeLabel(p.chest, app) || app._label('party.none', 'None'));
        const bodyParts = (p.bodyParts || []).map(b => app._escapeHtml(app.BODY_PARTS[b]?.label || b)).join(', ') || noneText;
        const legacyExplicit = app._tierValue(CONTENT?.preferences?.maxTier ?? 0) >= 2
            && CONTENT?.preferences?.explicitDescriptions === true;
        const explicitContent = CONTENT?.isCategoryEnabled?.('explicit.sexual') === true || legacyExplicit;
        const safeTier = !explicitContent;
        const bodySummary = safeTier
            ? `${app._escapeHtml(app._label('character.size', 'Size'))}: ${p.size} | ${app._escapeHtml(app._label('character.appetite', 'Appetite'))}: ${p.appetite}<br>${app._escapeHtml(app._label('character.bodyParts', 'Body'))}: ${bodyParts}`
            : `${app._escapeHtml(app._label('character.size', 'Size'))}: ${p.size} | ${app._escapeHtml(app._label('character.appetite', 'Appetite'))}: ${p.appetite}<br>${app._escapeHtml(app._label('character.parts', 'Parts'))}: ${parts} | ${app._escapeHtml(app._label('character.chest', 'Chest'))}: ${chest}<br>${app._escapeHtml(app._label('character.bodyParts', 'Body'))}: ${bodyParts}`;
        const perks = (p.perks || []).map(pk => app._escapeHtml(app._perkDisplayName(pk, p))).join(', ') || noneText;
        const html = `<div class="party-stats-view character-stats-view" data-command-surface="stats-detail" data-command-mode="exploration" role="region" aria-label="${closeLabel}">
            <div class="party-stats-header">
                <div><h1 style="color:var(--accent-primary)">📊 ${app._escapeHtml(p.name)}</h1><p style="color:var(--text-muted);margin-top:4px">${levelText} | ${xpText}</p></div>
                <button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="close-stats" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closePanelDetails('party')">${closeLabel}</button>
            </div>
            <div class="party-stats-grid">
                ${this.statCard(app, 'party.punishment', 'Punishment', `${stats.CPun}/${stats.MPun}`)}
                ${this.statCard(app, 'party.pleasure', 'Spirit', `${stats.CPle}/${stats.MPle}`)}
                ${this.statCard(app, 'character.combatStats', 'Combat Stats', `Figh: ${stats.Figh} | Feas: ${stats.Feas} | Flir: ${stats.Flir}<br>${app._escapeHtml(app._uiLabel('fuck'))}: ${stats.Fuck} | Flee: ${stats.Flee} | Feed: ${stats.Feed}`)}
                ${this.statCard(app, 'party.attributes', 'Attributes', `STR: ${stats.str} | CON: ${stats.con} | SPD: ${stats.spd}<br>INT: ${stats.int} | WIS: ${stats.wis} | CHA: ${stats.cha}`)}
                ${this.statCard(app, 'character.body', 'Body', bodySummary)}
                ${this.statCard(app, 'party.equipment', 'Equipment', app._equipmentSummary(p))}
                ${this.statCard(app, 'party.perks', 'Perks', perks)}
                ${this.statCard(app, 'character.perkTools', 'Perk Tools', `<span style="color:var(--text-muted);font-size:12px">${app._escapeHtml(app._label('character.perkToolsHelp', 'Respec is free during alpha and requires confirmation.'))}</span><br><button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="respec-perks" style="margin-top:8px" title="${respecLabel}" aria-label="${respecLabel}" onclick="App.respecPerks()"${respecDisabled}>${respecLabel}</button>`)}
            </div>
            <div class="party-stats-footer">${perkButton}<button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="close-stats" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closePanelDetails('party')">${closeLabel}</button></div></div>`;
        app.showPartyPanelDetail(`${p.name} ${app._label('party.stats', 'Stats')}`, html);
    },

    showPerkSelection(app) {
        if (!app.player) return;
        const pending = app.player.pendingPerkChoices || 0;
        const choices = app._availablePerkChoices();
        const titleLabel = app._escapeHtml(app._label('perk.choose', 'Choose Perk'));
        const pendingLabel = app._escapeHtml(app._label('perk.pending', 'Pending choices: {count}', { count: pending }));
        const frontierHelp = app._escapeHtml(app._label('perk.frontierHelp', 'Only perks you can choose now are shown.'));
        const backLabel = app._escapeHtml(app._label('perk.back', 'Back'));
        let html = `<div class="perk-selection-detail" data-command-surface="perk-selection-detail" data-command-mode="exploration"><h3>${titleLabel}</h3><p style="color:var(--text-muted);margin:4px 0 4px;">${pendingLabel}</p><p style="color:var(--text-muted);margin:0 0 12px;">${frontierHelp}</p><div style="display:grid;gap:10px;" data-perk-frontier="current">`;
        choices.forEach(perk => {
            const disabled = pending <= 0 ? ' disabled' : '';
            const chooseTitle = app._escapeHtml(app._label('perk.chooseNamed', 'Choose {name}', { name: perk.name }));
            html += `<button class="nav-btn" data-perk-frontier-choice="${app._escapeHtml(perk.id)}" data-command-surface="perk-selection-detail" data-command-mode="exploration" data-command-control="choose-perk" data-command-intent="choosePerk" style="text-align:left;white-space:normal;padding:10px;" title="${chooseTitle}" aria-label="${chooseTitle}"${disabled} onclick="App.choosePerk('${app._escapeJsString(perk.id)}')"><strong>${app._escapeHtml(perk.name)}</strong> <span style="color:var(--text-muted);font-size:11px">[${app._escapeHtml(perk.treeLabel)}]</span><br><span style="font-size:11px;color:var(--text-muted)">${app._escapeHtml(perk.desc)}</span><br><span style="font-size:11px;color:var(--accent-primary)">${app._escapeHtml(perk.availabilityReason)}</span></button>`;
        });
        if (!choices.length) html += `<p class="holding-entry-meta">${app._escapeHtml(app._label('perk.frontierEmpty', 'No new perks are available from your current progress.'))}</p>`;
        html += `</div><button class="nav-btn" data-command-surface="perk-selection-detail" data-command-mode="exploration" data-command-control="back-to-stats" data-command-slot="exit" style="margin-top:12px" title="${backLabel}" aria-label="${backLabel}" onclick="App.showCharacterStats()">${backLabel}</button></div>`;
        app.showPartyPanelDetail(titleLabel, html);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_STATS_PANEL = YAW_STATS_PANEL;
}
