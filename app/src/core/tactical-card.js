/**
 * YOU ARE WILD TACTICAL CARD
 * Shared compact actor/target card rendering for normal play rails.
 */

const YAW_TACTICAL_CARD = {
    render(app, unit, index, type, options = {}) {
        if (!unit) return '';
        const presentation = options.presentation || 'mobile';
        if (presentation === 'mobile') return this.mobile(app, unit, index, type);
        if (presentation === 'desktop') return this.desktop(app, unit, index, type);
        return this.mobile(app, unit, index, type);
    },

    desktop(app, unit, index, type) {
        const isParty = type === 'party';
        const isCorpse = !isParty && app._isCorpse(unit);
        const isLeader = isParty && app._getPartyLeader() === unit;
        const targetKey = app._unitKey(unit);
        const explorationTargetKey = isParty ? targetKey : app._escapeJsString(app._explorationTargetUnitId('creature', unit));
        const rawTargetId = app._unitSelectionId(unit);
        const targetSelected = isParty ? app._isExplorationTarget(type, rawTargetId) : app._isExplorationTargetUnit('creature', unit);
        const combatMarked = !isParty && app._isCombatMarkedTarget?.(unit);
        const isTargetable = !isParty && app.targetSelection && app.canSelectCreatureTarget(unit);
        const unitName = unit.name || (isParty ? 'party member' : 'creature');
        const unitLabel = app._escapeHtml(unitName);
        const button = (classes, label, title, onclick, attrs = '') => `<button class="${classes}" title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${attrs ? ' ' + attrs : ''} onclick="${onclick}">${app._escapeHtml(label)}</button>`;
        let actionButtons = '';
        if (isParty && !app.combatState.active) {
            const explicitlySelectedActor = app._isExplicitExplorationActor?.(unit);
            const selectedClass = explicitlySelectedActor ? ' primary' : '';
            const targetClass = targetSelected ? ' primary' : '';
            const actorAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-actor" ${app._selectionControlAttrs('actor', explicitlySelectedActor)}`;
            const targetAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
            actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('party-selection', unit)}>${button('action-btn actor-toggle' + selectedClass, app._label('target.act', 'Actor'), app._actorToggleLabel(unit, explicitlySelectedActor), `event.stopPropagation();App.selectExplorationActor(${index})`, actorAttrs)}${button('action-btn target-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetAttrs)}</div>`;
        } else if (isParty && app.combatState.active && app.syncSelection?.active && app.syncSelection.phase === 'participants') {
            actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('sync-participants', unit)}>${app._syncParticipantButton(unit)}</div>`;
        }
        if (!isParty && isCorpse) {
            if (app.combatState.active && app.targetSelection?.source === 'combat' && app.targetSelection.action === 'scavenge') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabledAttr = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, 'scavenge', canTarget);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-target', canTarget)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('combat-target', unit)}>${button('action-btn primary target-toggle' + disabledClass, app._combatTargetPickLabel(unit, 'scavenge', canTarget), targetHint, `event.stopPropagation();App.executeActionOnTarget('scavenge','${targetKey}')`, pickAttrs)}</div>`;
            } else if (!app.combatState.active) {
                const targetClass = targetSelected ? ' primary' : '';
                const targetAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('creature-selection', unit)}>${button('action-btn target-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetAttrs)}</div>`;
            }
        }
        if (!isParty && unit.CPun > 0) {
            if (app.targetSelection) {
                const disabledClass = isTargetable ? '' : ' disabled';
                const disabledAttr = isTargetable ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.targetSelection.action || 'action', isTargetable);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-target', isTargetable)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('combat-target', unit)}>${button('action-btn primary target-toggle' + disabledClass, app._combatTargetPickLabel(unit, app.targetSelection.action || 'action', isTargetable), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.targetSelection.action}','${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabled = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.syncSelection.type || 'sync_fight', canTarget);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabled.trim()}${disabled.trim() ? ' ' : ''}${app._selectionControlAttrs('combat-target', canTarget)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('combat-target', unit)}>${button('action-btn primary target-toggle', app._combatTargetPickLabel(unit, app.syncSelection.type || 'sync_fight', canTarget), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.syncSelection.type || 'sync_fight'}','${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.combatState.active && unit.disposition === app.DISPOSITION.ENEMY && !app.feedSelection?.active) {
                const targetClass = combatMarked ? ' primary' : '';
                const targetAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${app._selectionControlAttrs('combat-mark-target', combatMarked)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('combat-target-mark', unit)}>${button('action-btn target-toggle' + targetClass, app._combatTargetMarkLabel(), app._combatTargetToggleLabel(unit, combatMarked), `event.stopPropagation();App.toggleCombatTarget('${targetKey}')`, targetAttrs)}</div>`;
            } else if (!app.combatState.active || unit.disposition !== app.DISPOSITION.ENEMY) {
                const targetClass = targetSelected ? ' primary' : '';
                const targetAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('creature-selection', unit)}>${button('action-btn target-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetAttrs)}</div>`;
            }
        }
        const dispLabel = isParty ? '' : app._unitDispositionLabel(unit);
        const roleLabel = isParty && unit.name !== app.player?.name ? app._partyRoleLabel(app._getPartyRole(unit)) : '';
        const rowLabel = app.combatState.active && unit.combatRow ? ` ${app._label('combat.row', 'Row')}:${app._combatRowLabel(unit.combatRow)}` : '';
        const status = app._escapeHtml(`${isParty ? (unit === app.player ? app._label('party.you', 'You') : app._label('party.ally', 'Ally')) : dispLabel || app._unitDispositionLabel(unit)}${rowLabel ? ' | ' + rowLabel.trim() : ''}`);
        const unitMeta = [
            isLeader ? `<span class="unit-meta-badge leader">${app._escapeHtml(app._label('party.leader', 'Leader'))}</span>` : '',
            roleLabel ? `<span class="unit-meta-badge">${app._escapeHtml(roleLabel)}</span>` : '',
            dispLabel ? `<span class="unit-meta-badge">${app._escapeHtml(dispLabel)}</span>` : '',
            app._turnOrderBadge(unit)
        ].filter(Boolean).join('');
        const cardClass = `unit-card compact-tactical-card desktop-tactical-card${isTargetable ? ' targetable' : ''}${app._unitSelectionClass(unit, type)}`;
        const surfaceRoleAttrs = isParty
            ? 'data-surface-role="actor-card" data-drawer-role="actors"'
            : 'data-surface-role="target-card" data-drawer-role="targets"';
        const click = isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`;
        return `<div class="${cardClass}" data-card-role="compact-tactical" ${surfaceRoleAttrs} ${app._unitSelectionStateAttrs(unit, type)} ${app._unitCardFocusAttrs(unit, false)} onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${click}}" onclick="${click}" style="${isCorpse ? 'opacity:0.58;' : ''}">
                    ${actionButtons}
                    <div class="unit-header">
                        <span class="unit-icon">${isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon}</span>
                        <div class="unit-info">
                            <div class="unit-name">${unitLabel}</div>
                            ${unitMeta ? `<div class="unit-meta">${unitMeta}</div>` : ''}
                            ${app._srOnly(app._combatStatusText(unit), 'role="status" aria-live="polite"')}
                            <div class="unit-card-status">${status}</div>
                            ${app._unitTacticalBars(unit, { compact: true })}
                            ${app._unitTraitChips(unit, type, 2)}
                            ${app._unitSelectionChips(unit, type)}
                        </div>
                    </div>
                </div>`;
    },

    mobile(app, unit, index, type) {
        const isExpanded = unit.expanded || false;
        const isParty = type === 'party';
        const isCorpse = !isParty && app._isCorpse(unit);
        const targetKey = app._unitKey(unit);
        const explorationTargetKey = isParty ? targetKey : app._escapeJsString(app._explorationTargetUnitId('creature', unit));
        const rawTargetId = app._unitSelectionId(unit);
        const targetSelected = isParty ? app._isExplorationTarget(type, rawTargetId) : app._isExplorationTargetUnit('creature', unit);
        const combatMarked = !isParty && app._isCombatMarkedTarget?.(unit);
        const isTargetable = !isParty && app.targetSelection && app.canSelectCreatureTarget(unit);
        const unitName = unit.name || (isParty ? 'party member' : 'creature');
        const unitLabel = app._escapeHtml(unitName);
        const chipButton = (classes, label, title, onclick, attrs = '') => `<button class="${classes}" title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${attrs ? ' ' + attrs : ''} onclick="${onclick}">${app._escapeHtml(label)}</button>`;
        let actionButtons = '';
        let detailButtons = '';
        if (isParty && !app.combatState.active) {
            const explicitlySelectedActor = app._isExplicitExplorationActor?.(unit);
            const selectedClass = explicitlySelectedActor ? ' primary' : '';
            const targetClass = targetSelected ? ' primary' : '';
            const actorPressed = explicitlySelectedActor;
            const targetPressed = targetSelected;
            const actorCommandAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-actor" ${app._selectionControlAttrs('actor', actorPressed)}`;
            const targetCommandAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetPressed)}`;
            actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('party-selection', unit)}>${chipButton('action-btn actor-toggle' + selectedClass, app._label('target.act', 'Actor'), app._actorToggleLabel(unit, actorPressed), `event.stopPropagation();App.selectExplorationActor(${index})`, actorCommandAttrs)}${chipButton('action-btn target-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetPressed), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetCommandAttrs)}</div>`;
            if (isExpanded) {
                detailButtons = `<div class="unit-actions unit-detail-actions" ${app._unitActionRowAttrs('party-details', unit)} style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn', app._label('party.stats', 'Stats'), app._label('party.statsFor', 'Show stats for {name}', { name: unitName }), `event.stopPropagation();App.showPartyMemberStats(${index})`, 'data-command-surface="detail-management" data-command-mode="exploration" data-command-control="open-party-stats"')}</div>`;
            }
        } else if (isParty && app.combatState.active) {
            if (app.syncSelection?.active && app.syncSelection.phase === 'participants') {
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('sync-participants', unit)}>${app._syncParticipantButton(unit, true)}</div>`;
            }
        }
        if (isCorpse) {
            if (app.combatState.active && app.targetSelection?.source === 'combat' && app.targetSelection.action === 'scavenge') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabledAttr = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, 'scavenge', canTarget);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-target', canTarget)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('combat-target', unit)}>${chipButton('action-btn primary target-toggle' + disabledClass, app._combatTargetPickLabel(unit, 'scavenge', canTarget), targetHint, `event.stopPropagation();App.executeActionOnTarget('scavenge','${targetKey}')`, pickAttrs)}</div>`;
            } else if (!app.combatState.active) {
                const targetClass = targetSelected ? ' primary' : '';
                const targetCommandAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('creature-selection', unit)}>${chipButton('action-btn target-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetCommandAttrs)}</div>`;
            }
        }
        if (!isParty && unit.CPun > 0) {
            if (app.targetSelection) {
                const disabledClass = isTargetable ? '' : ' disabled';
                const disabledAttr = isTargetable ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.targetSelection.action || 'action', isTargetable);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-target', isTargetable)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('combat-target', unit)}>${chipButton('action-btn primary target-toggle' + disabledClass, app._combatTargetPickLabel(unit, app.targetSelection.action || 'action', isTargetable), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.targetSelection.action}','${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
                const isSyncTargetable = app.canSelectCreatureTarget(unit);
                const disabled = isSyncTargetable ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.syncSelection.type || 'sync_fight', isSyncTargetable);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabled.trim()}${disabled.trim() ? ' ' : ''}${app._selectionControlAttrs('combat-target', isSyncTargetable)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('combat-target', unit)}>${chipButton('action-btn primary target-toggle', app._combatTargetPickLabel(unit, app.syncSelection.type || 'sync_fight', isSyncTargetable), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.syncSelection.type || 'sync_fight'}','${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.combatState.active && unit.disposition === app.DISPOSITION.ENEMY && !app.feedSelection?.active) {
                const targetClass = combatMarked ? ' primary' : '';
                const targetCommandAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${app._selectionControlAttrs('combat-mark-target', combatMarked)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('combat-target-mark', unit)}>${chipButton('action-btn target-toggle' + targetClass, app._combatTargetMarkLabel(), app._combatTargetToggleLabel(unit, combatMarked), `event.stopPropagation();App.toggleCombatTarget('${targetKey}')`, targetCommandAttrs)}</div>`;
            } else if (!app.combatState.active || unit.disposition !== app.DISPOSITION.ENEMY) {
                const targetClass = targetSelected ? ' primary' : '';
                const targetCommandAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls" ${app._unitActionRowAttrs('creature-selection', unit)}>${chipButton('action-btn target-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetCommandAttrs)}</div>`;
            }
        }
        const click = isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`;
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
        const chipClass = `mobile-unit-chip${isTargetable ? ' targetable' : ''}${app._unitSelectionClass(unit, type)} compact-tactical-card`;
        const surfaceRoleAttrs = isParty
            ? 'data-surface-role="actor-presence-chip" data-drawer-role="actors"'
            : 'data-surface-role="target-presence-chip" data-drawer-role="targets"';
        const keyActivate = `if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${click}}`;
        return `<div class="${chipClass}" data-card-role="compact-tactical" ${surfaceRoleAttrs} ${app._unitSelectionStateAttrs(unit, type)} ${app._unitCardFocusAttrs(unit, isExpanded)} onkeydown="${keyActivate}" onclick="${click}"${pressHandlers}>
                    ${actionButtons}
                    <div class="mobile-chip-name"><span>${isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon}</span><span>${unitLabel}</span>${turnBadge}</div>
                    ${combatStatus}
                    <div class="mobile-chip-meta">${app._escapeHtml(status)}${rowText}</div>
                    ${app._unitTacticalBars(unit, { compact: true })}
                    ${app._unitTraitChips(unit, type)}
                    ${app._unitSelectionChips(unit, type)}
                    ${detailButtons}
                </div>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TACTICAL_CARD = YAW_TACTICAL_CARD;
}
