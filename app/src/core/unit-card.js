/**
 * YOU ARE WILD UNIT CARD
 * Desktop unit card rendering for party, creature, combat, corpse, and management controls.
 */

const YAW_UNIT_CARD = {
    render(app, unit, index, type) {
        const isExpanded = unit.expanded || false;
        const isParty = type === 'party';
        const isPlayer = isParty && unit.name === app.player?.name;
        const isAlly = isParty && !isPlayer;
        const isCorpse = app._isCorpse(unit);
        const isLeader = isParty && app._getPartyLeader() === unit;
        const unitName = unit.name || 'party member';
        const escapedUnitName = app._escapeHtml(unitName);
        const roleLabel = isAlly ? app._escapeHtml(app._partyRoleLabel(app._getPartyRole(unit))) : '';
        const canDragPartyMember = isAlly && !app.combatState.active;
        const dragAttrs = canDragPartyMember ? ` draggable="true" data-party-index="${index}" ondragstart="event.stopPropagation();App.startPartyDrag(${index})" ondragover="App.dragPartyOver(event)" ondrop="event.stopPropagation();App.dropPartyMember(${index})" ondragend="App.clearPartyDrag()"` : '';
        const cardClass = `unit-card${isExpanded ? ' expanded' : ''}${canDragPartyMember ? ' party-draggable' : ''}${app._unitSelectionClass(unit, type)}`;
        const surfaceRoleAttrs = isParty
            ? 'data-surface-role="actor-card" data-drawer-role="actors"'
            : 'data-surface-role="target-card" data-drawer-role="targets"';
        let actionButtons = '';
        let detailButtons = '';
        let partyManagementControls = '';
        if (isParty && !app.combatState.active) {
            const explicitlySelectedActor = app._isExplicitExplorationActor?.(unit);
            const selectedClass = explicitlySelectedActor ? ' primary' : '';
            const targetClass = app._isExplorationTarget('party', app._unitSelectionId(unit)) ? ' primary' : '';
            const targetKey = app._unitKey(unit);
            const actorLabel = app._escapeHtml(app._label('target.act', 'Actor'));
            const targetLabel = app._escapeHtml(app._targetMarkLabel());
            const actorPressed = explicitlySelectedActor;
            const targetPressed = app._isExplorationTarget('party', app._unitSelectionId(unit));
            const actorTitle = app._escapeHtml(app._actorToggleLabel(unit, actorPressed));
            const targetTitle = app._escapeHtml(app._targetToggleLabel(unit, targetPressed));
            const actorCommandAttrs = 'data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-actor"';
            const targetCommandAttrs = 'data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target"';
            actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('party-selection', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${selectedClass}" ${actorCommandAttrs} ${app._selectionControlAttrs('actor', actorPressed)} title="${actorTitle}" aria-label="${actorTitle}" onclick="event.stopPropagation();App.selectExplorationActor(${index})">${actorLabel}</button><button class="action-btn${targetClass}" ${targetCommandAttrs} ${app._selectionControlAttrs('target', targetPressed)} title="${targetTitle}" aria-label="${targetTitle}" onclick="event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')">${targetLabel}</button>`;
            actionButtons += `</div>`;
            const detailControls = [];
            const statsLabel = app._escapeHtml(app._label('party.stats', 'Stats'));
            const statsTitle = app._escapeHtml(app._label('party.statsFor', 'Show stats for {name}', { name: unitName }));
            detailControls.push(`<button class="action-btn" data-command-surface="detail-management" data-command-mode="exploration" data-command-control="open-party-stats" title="${statsTitle}" aria-label="${statsTitle}" onclick="event.stopPropagation();App.showPartyMemberStats(${index})">${statsLabel}</button>`);
            if (isPlayer) {
                const inventoryLabel = app._escapeHtml(app._uiLabel('inventory'));
                const inventoryTitle = app._escapeHtml(app._label('action.inventory', 'Items'));
                detailControls.push(`<button class="action-btn" data-command-surface="detail-management" data-command-mode="exploration" data-command-control="open-inventory" title="${inventoryTitle}" aria-label="${inventoryTitle}" onclick="event.stopPropagation();App.showInventory()">${inventoryLabel}</button>`);
            }
            if (isExpanded) {
                detailButtons = `<div class="unit-actions unit-detail-actions" ${app._unitActionRowAttrs('party-details', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">${detailControls.join('')}</div>`;
            }
            const managementAttrs = 'data-command-surface="detail-management" data-command-mode="exploration"';
            if (!isLeader) {
                const leadLabel = app._escapeHtml(app._label('party.makeLeader', 'Make Leader'));
                const leadTitle = app._escapeHtml(app._label('party.makeLeaderFor', 'Make {name} party leader', { name: unitName }));
                partyManagementControls += `<button class="action-btn" ${managementAttrs} data-command-control="make-leader" title="${leadTitle}" aria-label="${leadTitle}" onclick="event.stopPropagation();App.setPartyLeader(${index})">${leadLabel}</button>`;
            }
            if (canDragPartyMember) {
                const dragTitle = app._escapeHtml(app._label('party.dragToReorder', 'Drag {name} to reorder', { name: unitName }));
                partyManagementControls += `<button class="action-btn party-drag-handle" ${managementAttrs} data-command-control="reorder-party-member" draggable="true" title="${dragTitle}" aria-label="${dragTitle}" onclick="event.stopPropagation()" ondragstart="event.stopPropagation();App.startPartyDrag(${index})">↕</button>`;
            }
            if (index > 1) {
                const moveUpTitle = app._escapeHtml(app._label('party.moveUp', 'Move {name} up', { name: unitName }));
                partyManagementControls += `<button class="action-btn" ${managementAttrs} data-command-control="move-party-member-up" title="${moveUpTitle}" aria-label="${moveUpTitle}" onclick="event.stopPropagation();App.movePartyMember(${index},-1)">↑</button>`;
            }
            if (!isPlayer && index < app.party.length - 1) {
                const moveDownTitle = app._escapeHtml(app._label('party.moveDown', 'Move {name} down', { name: unitName }));
                partyManagementControls += `<button class="action-btn" ${managementAttrs} data-command-control="move-party-member-down" title="${moveDownTitle}" aria-label="${moveDownTitle}" onclick="event.stopPropagation();App.movePartyMember(${index},1)">↓</button>`;
            }
            if (isAlly) {
                const role = app._getPartyRole(unit);
                const roleOptions = Object.keys(app.PARTY_ROLES).map(key => `<option value="${key}" ${role === key ? 'selected' : ''}>${app._escapeHtml(app._partyRoleLabel(key))}</option>`).join('');
                const roleTitle = app._escapeHtml(`${app._label('party.role', 'Role')}: ${app._partyRoleDescription(role)}`);
                const roleAria = app._escapeHtml(app._label('party.roleFor', 'Party role for {name}', { name: unitName }));
                partyManagementControls += `<select class="nav-btn" ${managementAttrs} data-command-control="set-party-role" style="padding:4px 8px;font-size:11px;" title="${roleTitle}" aria-label="${roleAria}" onclick="event.stopPropagation()" onchange="event.stopPropagation();App.setPartyRole(${index},this.value)">${roleOptions}</select>`;
                const order = app._getPartyAIOrder(unit);
                const options = Object.keys(app.PARTY_AI_ORDERS).map(key => `<option value="${key}" ${order === key ? 'selected' : ''}>${app._escapeHtml(app._partyAIOrderLabel(key))}</option>`).join('');
                const orderTitle = app._escapeHtml(`${app._label('party.aiOrder', 'AI Order')}: ${app._partyAIOrderDescription(order)}`);
                const orderAria = app._escapeHtml(app._label('party.aiOrderFor', 'AI order for {name}', { name: unitName }));
                partyManagementControls += `<select class="nav-btn" ${managementAttrs} data-command-control="set-party-ai-order" style="padding:4px 8px;font-size:11px;" title="${orderTitle}" aria-label="${orderAria}" onclick="event.stopPropagation()" onchange="event.stopPropagation();App.setPartyAIOrder(${index},this.value)">${options}</select>`;
                const dismissLabel = app._escapeHtml(app._label('party.dismiss', 'Dismiss'));
                const dismissTitle = app._escapeHtml(app._label('party.dismissFor', 'Dismiss {name}', { name: unitName }));
                partyManagementControls += `<button class="action-btn" ${managementAttrs} data-command-control="dismiss-party-member" style="color:var(--accent-danger)" title="${dismissTitle}" aria-label="${dismissTitle}" onclick="event.stopPropagation();App.dismissPartyMember(${index})">${dismissLabel}</button>`;
            }
            if (partyManagementControls) {
                partyManagementControls = `<div class="unit-actions unit-management-actions" ${app._unitActionRowAttrs('party-management', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">${partyManagementControls}</div>`;
            }
        } else if (isParty && app.combatState.active) {
            if (app.syncSelection?.active && app.syncSelection.phase === 'participants') {
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('sync-participants', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">${app._syncParticipantButton(unit)}</div>`;
            } else if (!app.targetSelection && !(app.syncSelection?.active && app.syncSelection.phase === 'target')) {
                const targetPressed = app._isExplorationTarget('party', app._unitSelectionId(unit));
                const targetClass = targetPressed ? ' primary' : '';
                const targetKey = app._unitKey(unit);
                const targetLabel = app._escapeHtml(app._targetMarkLabel());
                const targetTitle = app._escapeHtml(app._targetToggleLabel(unit, targetPressed));
                const targetCommandAttrs = 'data-command-surface="party-target-routing" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="focus-target"';
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('party-selection', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">${app._syncParticipantButton(unit)}<button class="action-btn${targetClass}" ${targetCommandAttrs} ${app._selectionControlAttrs('target', targetPressed)} title="${targetTitle}" aria-label="${targetTitle}" onclick="event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')">${targetLabel}</button></div>`;
            }
        }
        if (!isParty && isCorpse) {
            const targetKey = app._unitKey(unit);
            if (app.combatState.active) {
                if (app.targetSelection?.source === 'combat' && app.targetSelection.action === 'scavenge') {
                    const canTarget = app.canSelectCreatureTarget(unit);
                    const disabledClass = canTarget ? '' : ' disabled';
                    const disabledAttr = canTarget ? '' : 'disabled aria-disabled="true"';
                    const targetHint = app._escapeHtml(app._combatTargetPickHint(unit, 'scavenge', canTarget));
                    const targetLabel = app._escapeHtml(app._combatTargetPickLabel(unit, 'scavenge', canTarget));
                    actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('combat-target', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn primary${disabledClass}" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${app._selectionControlAttrs('combat-target', canTarget)} title="${targetHint}" aria-label="${targetHint}" ${disabledAttr} onclick="event.stopPropagation();App.executeActionOnTarget('scavenge','${targetKey}')">${targetLabel}</button></div>`;
                }
            } else {
                const targetClass = app._isExplorationTargetUnit('creature', unit) ? ' primary' : '';
                const markLabel = app._escapeHtml(app._targetMarkLabel());
                const targetPressed = app._isExplorationTargetUnit('creature', unit);
                const markTitle = app._escapeHtml(app._targetToggleLabel(unit, targetPressed));
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('creature-selection', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${targetClass}" data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetPressed)} title="${markTitle}" aria-label="${markTitle}" onclick="event.stopPropagation();App.toggleExplorationTarget('creature','${targetKey}')">${markLabel}</button></div>`;
            }
        }
        if (!isParty && unit.CPun > 0 && !isCorpse) {
            const targetKey = app._unitKey(unit);
            const explorationTargetKey = app._escapeJsString(app._explorationTargetUnitId('creature', unit));
            if (app.targetSelection) {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabledAttr = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._escapeHtml(app._combatTargetPickHint(unit, app.targetSelection.action || 'action', canTarget));
                const targetPressed = app._isCombatMarkedTarget?.(unit);
                const targetLabel = app._escapeHtml(canTarget ? app._combatTargetMarkLabel() : app._combatTargetPickLabel(unit, app.targetSelection.action || 'action', canTarget));
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('combat-target-mark', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${targetPressed ? ' primary' : ''}${disabledClass}" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${app._selectionControlAttrs('combat-mark-target', canTarget ? targetPressed : 'blocked')} title="${targetHint}" aria-label="${targetHint}" ${disabledAttr} onclick="event.stopPropagation();App.toggleCombatTarget('${targetKey}')">${targetLabel}</button></div>`;
            } else if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabled = canTarget ? '' : ' disabled aria-disabled="true"';
                const targetHint = app._escapeHtml(app._combatTargetPickHint(unit, app.syncSelection.type || 'sync_fight', canTarget));
                const targetLabel = app._escapeHtml(app._combatTargetPickLabel(unit, app.syncSelection.type || 'sync_fight', canTarget));
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('combat-target', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn primary${disabledClass}" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${app._selectionControlAttrs('combat-target', canTarget)} title="${targetHint}" aria-label="${targetHint}" ${disabled} onclick="event.stopPropagation();App.executeActionOnTarget('${app.syncSelection.type || 'sync_fight'}','${targetKey}')">${targetLabel}</button></div>`;
            } else if (app.combatState.active && unit.disposition === app.DISPOSITION.ENEMY && !app.feedSelection?.active) {
                const targetPressed = app._isCombatMarkedTarget?.(unit);
                const targetClass = targetPressed ? ' primary' : '';
                const markLabel = app._escapeHtml(app._combatTargetMarkLabel());
                const markTitle = app._escapeHtml(app._combatTargetToggleLabel(unit, targetPressed));
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('combat-target-mark', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${targetClass}" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${app._selectionControlAttrs('combat-mark-target', targetPressed)} title="${markTitle}" aria-label="${markTitle}" onclick="event.stopPropagation();App.toggleCombatTarget('${targetKey}')">${markLabel}</button></div>`;
            } else if (!app.combatState.active || unit.disposition !== app.DISPOSITION.ENEMY) {
                const targetClass = app._isExplorationTargetUnit('creature', unit) ? ' primary' : '';
                const markLabel = app._escapeHtml(app._targetMarkLabel());
                const targetPressed = app._isExplorationTargetUnit('creature', unit);
                const markTitle = app._escapeHtml(app._targetToggleLabel(unit, targetPressed));
                actionButtons = `<div class="unit-actions" ${app._unitActionRowAttrs('creature-selection', unit)} style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${targetClass}" data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetPressed)} title="${markTitle}" aria-label="${markTitle}" onclick="event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')">${markLabel}</button></div>`;
            }
        }
        let dispLabel = '';
        if (!isParty) {
            dispLabel = app._unitDispositionLabel(unit);
        }
        const stomachUsed = app._containerUsed(unit, 'stomach');
        const wombUsed = app._containerUsed(unit, 'womb');
        const ballsUsed = app._containerUsed(unit, 'balls');
        const hasContained = stomachUsed > 0 || wombUsed > 0 || ballsUsed > 0;
        const capacitySummary = [
            `${app._label('capacity.stomach', 'Belly')}: ${app._containerSummary(unit, 'stomach')}`,
            `${app._label('capacity.womb', 'Inner')}: ${app._containerSummary(unit, 'womb')}`,
            `${app._label('capacity.balls', 'Reserve')}: ${app._containerSummary(unit, 'balls')}`
        ].join(' | ');
        const equipmentSummary = app._equipmentCompactSummary(unit);
        const rowLabel = app.combatState.active && unit.combatRow ? ` ${app._label('combat.row', 'Row')}:${app._combatRowLabel(unit.combatRow)}` : '';
        const turnBadge = app._turnOrderBadge(unit);
        const combatStatus = app._srOnly(app._combatStatusText(unit), 'role="status" aria-live="polite"');
        const compactStatus = app._escapeHtml(`${isParty ? (isPlayer ? app._label('party.you', 'You') : app._label('party.ally', 'Ally')) : dispLabel || app._unitDispositionLabel(unit)}${rowLabel ? ' | ' + rowLabel.trim() : ''}`);
        const unitMeta = [
            isLeader ? `<span class="unit-meta-badge leader">${app._escapeHtml(app._label('party.leader', 'Leader'))}</span>` : '',
            roleLabel ? `<span class="unit-meta-badge">${roleLabel}</span>` : '',
            dispLabel ? `<span class="unit-meta-badge">${app._escapeHtml(dispLabel)}</span>` : '',
            turnBadge
        ].filter(Boolean).join('');
        const statLabels = {
            equipment: app._escapeHtml(app._label('party.equipment', 'Equipment'))
        };
        const cardContextMenuAttr = '';
        return `<div class="${cardClass}" ${surfaceRoleAttrs} ${app._unitSelectionStateAttrs(unit, type)} ${app._unitCardFocusAttrs(unit, isExpanded)} onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();App.toggleUnit(${index},'${type}')}" style="${isCorpse ? 'opacity:0.58;' : ''}"${dragAttrs}${cardContextMenuAttr} onclick="App.toggleUnit(${index},'${type}')">
                    <div class="unit-header">
                        <span class="unit-icon">${isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon}</span>
                        <div class="unit-info">
                            <div class="unit-name">${escapedUnitName}</div>
                            ${unitMeta ? `<div class="unit-meta">${unitMeta}</div>` : ''}
                            ${combatStatus}
                            <div class="unit-card-status">${compactStatus}</div>
                            ${app._unitTacticalBars(unit)}
                            ${app._unitTraitChips(unit, type)}
                            ${app._unitSelectionChips(unit, type)}
                        </div>
                    </div>
                    ${actionButtons}
                    ${detailButtons}
                    ${isExpanded ? `<div class="unit-details">
                        <div style="display:grid;grid-template-columns:1fr;gap:8px;font-size:12px;">
                            <div style="color:${hasContained ? 'var(--accent-warning)' : 'var(--text-muted)'}">${capacitySummary}</div>
                            <div style="color:var(--text-muted)"><span style="color:var(--text-primary)">${statLabels.equipment}:</span><br>${equipmentSummary}</div>
                        </div>
                        ${partyManagementControls}
                    </div>` : ''}
                </div>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UNIT_CARD = YAW_UNIT_CARD;
}
