/**
 * YOU ARE WILD MOBILE UNIT CHIP
 * Renders mobile party and creature chips while preserving panel-first interaction semantics.
 */

const YAW_MOBILE_UNIT_CHIP = {
    render(app, unit, index, type) {
        if (!unit) return '';
        const isExpanded = unit.expanded || false;
        const isParty = type === 'party';
        const isCorpse = !isParty && app._isCorpse(unit);
        const targetKey = app._unitKey(unit);
        const explorationTargetKey = isParty ? targetKey : app._escapeJsString(app._explorationTargetUnitId('creature', unit));
        const rawTargetId = app._unitSelectionId(unit);
        const targetSelected = isParty ? app._isExplorationTarget(type, rawTargetId) : app._isExplorationTargetUnit('creature', unit);
        const isTargetable = !isParty && app.targetSelection && app.canSelectCreatureTarget(unit);
        const unitName = unit.name || (isParty ? 'party member' : 'creature');
        const unitLabel = app._escapeHtml(unitName);
        const chipButton = (classes, label, title, onclick, attrs = '') => `<button class="${classes}" title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${attrs ? ' ' + attrs : ''} onclick="${onclick}">${app._escapeHtml(label)}</button>`;
        const mobileIntent = action => `event.stopPropagation();App.selectIntent('creature','${explorationTargetKey}','${action}','mobile-chip')`;
        let actionButtons = '';
        if (isParty && !app.combatState.active) {
            const selectedActors = app._getExplorationActors();
            const selectedClass = selectedActors.includes(unit) ? ' primary' : '';
            const targetClass = targetSelected ? ' primary' : '';
            const actorPressed = selectedActors.includes(unit);
            const targetPressed = targetSelected;
            actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('party-selection', unit)} style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn' + selectedClass, app._label('target.act', 'Actor'), app._label('target.selectActorFor', 'Set {name} as actor', { name: unitName }), `event.stopPropagation();App.selectExplorationActor(${index})`, app._selectionControlAttrs('actor', actorPressed))}${chipButton('action-btn' + targetClass, app._targetMarkLabel(), app._label('target.markFor', 'Mark {name} as target', { name: unitName }), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, app._selectionControlAttrs('target', targetPressed))}${chipButton('action-btn', app._label('party.stats', 'Stats'), app._label('party.statsFor', 'Show stats for {name}', { name: unitName }), `event.stopPropagation();App.showPartyMemberStats(${index})`)}</div>`;
        } else if (isParty && app.combatState.active) {
            if (app.syncSelection?.active && app.syncSelection.phase === 'participants') {
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('sync-participants', unit)} style="display:flex;gap:4px;flex-wrap:wrap;">${app._syncParticipantButton(unit, true)}</div>`;
            }
        }
        if (isCorpse) {
            actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('corpse-utility', unit)} style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn', app._uiLabel('loot'), `${app._uiLabel('loot')} ${unitName}`, mobileIntent('loot'))}${chipButton('action-btn', app._uiLabel('scavenge'), `${app._uiLabel('scavenge')} ${unitName}`, mobileIntent('scavenge'))}</div>`;
        }
        if (!isParty && unit.CPun > 0) {
            if (app.targetSelection) {
                const disabledClass = isTargetable ? '' : ' disabled';
                const disabledAttr = isTargetable ? '' : 'disabled aria-disabled="true"';
                const actionLabel = app._uiLabel(app.targetSelection.action || 'action');
                const targetHint = app._label(isTargetable ? 'target.selectAs' : 'target.cannotSelectAs', isTargetable ? 'Select {name} as {action} target' : 'Cannot select {name} as {action} target', { name: unitName, action: actionLabel });
                const pickAttrs = `${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-target', isTargetable)}`;
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('combat-target', unit)} style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn primary' + disabledClass, app._combatTargetPickLabel(), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.targetSelection.action}','${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
                const isSyncTargetable = app.canSelectCreatureTarget(unit);
                const disabled = isSyncTargetable ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._label(isSyncTargetable ? 'target.selectAs' : 'target.cannotSelectAs', isSyncTargetable ? 'Select {name} as {action} target' : 'Cannot select {name} as {action} target', { name: unitName, action: app._label('action.sync', 'Sync') });
                const pickAttrs = `${disabled.trim()}${disabled.trim() ? ' ' : ''}${app._selectionControlAttrs('combat-target', isSyncTargetable)}`;
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('combat-target', unit)} style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn primary', app._combatTargetPickLabel(), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.syncSelection.type || 'sync_fight'}','${targetKey}')`, pickAttrs)}</div>`;
            } else if (!app.combatState.active || unit.disposition !== app.DISPOSITION.ENEMY) {
                const targetClass = targetSelected ? ' primary' : '';
                const inspectLabel = app._uiLabel('inspect');
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('creature-selection-utility', unit)} style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn' + targetClass, app._targetMarkLabel(), app._label('target.markFor', 'Mark {name} as target', { name: unitName }), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, app._selectionControlAttrs('target', targetSelected))}${chipButton('action-btn', '👁️', `${inspectLabel} ${unitName}`, mobileIntent('inspect'))}`;
                if (app._canRecruit(app._getExplorationActor(), unit)) {
                    actionButtons += chipButton('action-btn primary', '💕', `${app._uiLabel('recruit')} ${unitName}`, mobileIntent('recruit'));
                }
                if (unit.quest) {
                    const questLabel = app._uiLabel(unit.questAccepted ? 'viewQuest' : 'acceptQuest');
                    actionButtons += chipButton('action-btn primary', '📜', `${questLabel} ${unitName}`, mobileIntent('quest'));
                }
                if (unit.disposition === app.DISPOSITION.MERCHANT) {
                    actionButtons += chipButton('action-btn primary', '🪙', `${app._uiLabel('trade')} ${unitName}`, mobileIntent('trade'));
                }
                actionButtons += '</div>';
            }
        }
        const click = isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`;
        const canOpenIntentMenu = !isParty && isCorpse;
        const contextMenuAttr = canOpenIntentMenu
            ? ` oncontextmenu="event.preventDefault();event.stopPropagation();App.showRadialIntentMenu('${type}',${isParty ? index : `'${targetKey}'`},'secondary-click')"`
            : '';
        const partyRole = isParty && unit.name !== app.player?.name ? app._partyRoleLabel(app._getPartyRole(unit)) : '';
        const partyStatus = unit.name === app.player?.name ? app._label('party.you', 'You') : `${app._label('party.ally', 'Ally')}${partyRole ? ' - ' + partyRole : ''}`;
        const status = isParty ? partyStatus : app._unitDispositionLabel(unit);
        const rowText = app.combatState.active && unit.combatRow ? ` | ${app._combatRowLabel(unit.combatRow)}` : '';
        const turnBadge = app._turnOrderBadge(unit);
        const combatStatus = app._srOnly(app._combatStatusText(unit), 'role="status" aria-live="polite"');
        const pressTargetKey = !isParty && !isCorpse ? explorationTargetKey : targetKey;
        const pressHandlers = isParty
            ? ` ontouchstart="App.startMobilePartyPress(event,${index})" ontouchmove="App.cancelMobilePartyPress()" ontouchend="App.cancelMobilePartyPress()" ontouchcancel="App.cancelMobilePartyPress()"`
            : ` ontouchstart="App.startMobileCreaturePress(event,'${pressTargetKey}')" ontouchmove="App.cancelMobileCreaturePress()" ontouchend="App.cancelMobileCreaturePress()" ontouchcancel="App.cancelMobileCreaturePress()"`;
        const chipClass = `mobile-unit-chip${isTargetable ? ' targetable' : ''}${app._unitSelectionClass(unit, type)}`;
        const keyActivate = `if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${click}}`;
        return `<div class="${chipClass}" ${app._unitCardFocusAttrs(unit, isExpanded)} onkeydown="${keyActivate}" onclick="${click}"${contextMenuAttr}${pressHandlers}>
                    <div class="mobile-chip-name"><span>${isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon}</span><span>${unitLabel}</span>${turnBadge}</div>
                    ${combatStatus}
                    <div class="mobile-chip-meta">${app._escapeHtml(status)}${rowText}</div>
                    ${app._unitTacticalBars(unit, { compact: true })}
                    ${app._unitTraitChips(unit, type)}
                    ${app._unitSelectionChips(unit, type)}
                    ${actionButtons}
                </div>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MOBILE_UNIT_CHIP = YAW_MOBILE_UNIT_CHIP;
}
