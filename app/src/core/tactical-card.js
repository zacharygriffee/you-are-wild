/**
 * YOU ARE WILD TACTICAL CARD
 * Shared compact actor/target card rendering for normal play rails.
 */

const YAW_TACTICAL_CARD = {
    render(app, unit, index, type, options = {}) {
        if (!unit) return '';
        const presentation = options.presentation || 'mobile';
        const density = options.density || 'medium';
        if (density === 'detailed' && typeof YAW_UNIT_CARD !== 'undefined') {
            return YAW_UNIT_CARD.render(app, unit, index, type);
        }
        if (density === 'micro') return this.micro(app, unit, index, type, options);
        if (presentation === 'mobile') return this.mobile(app, unit, index, type);
        if (presentation === 'desktop') return this.desktop(app, unit, index, type);
        return this.mobile(app, unit, index, type);
    },

    shortName(app, unit, fallback) {
        const text = String(unit?.name || fallback || app._label('unit.generic', 'unit'));
        return text.length > 18 ? `${text.slice(0, 15).trim()}...` : text;
    },

    fallbackName(app, isParty = false) {
        return isParty
            ? app._label('unit.partyMember', 'party member')
            : app._label('unit.creature', 'creature');
    },

    cssContentValue(app, value) {
        const text = String(value || '•').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return app._escapeHtml(`'${text}'`);
    },

    agencyIconStyle(app, unit, fallback = '👤') {
        const icon = unit?.icon || fallback;
        const content = this.cssContentValue(app, icon);
        return `style="--compact-card-icon-content:${content};--mobile-card-icon-content:${content};"`;
    },

    presentationBadge(app, unit) {
        const icon = app._escapeHtml(unit?.icon || '•');
        const art = app._unitArtHtml(unit, unit?.icon || '•', { className: 'corner-badge-sprite' });
        return `<span class="presentation-corner-badge" data-corner-slot="agency" aria-hidden="true" ${this.agencyIconStyle(app, unit, '•')}>${art || icon}</span>`;
    },

    controlButton(app, classes, label, title, onclick, attrs = '') {
        const cornerSlot = classes.includes('agency-corner-toggle')
            ? ' data-corner-slot="agency"'
            : (classes.includes('target-corner-toggle') ? ' data-corner-slot="target"' : '');
        const content = classes.includes('micro-card-toggle') ? '' : app._escapeHtml(label);
        return `<button class="${classes}"${cornerSlot} title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${attrs ? ' ' + attrs : ''} onclick="${onclick}">${content}</button>`;
    },

    micro(app, unit, index, type, options = {}) {
        const presentation = options.presentation || 'mobile';
        const isParty = type === 'party';
        const isCompanion = isParty && unit !== app.player && !unit.mc;
        const isCorpse = !isParty && app._isCorpse(unit);
        const targetKey = app._unitKey(unit);
        const explorationTargetKey = isParty ? targetKey : app._escapeJsString(app._explorationTargetUnitId('creature', unit));
        const rawTargetId = app._unitSelectionId(unit);
        const targetSelected = isParty ? app._isExplorationTarget(type, rawTargetId) : app._isExplorationTargetUnit('creature', unit);
        const combatMarked = !isParty && app._isCombatMarkedTarget?.(unit);
        const isTargetable = !isParty && app.targetSelection && app.canSelectCreatureTarget(unit);
        const unitName = unit.name || this.fallbackName(app, isParty);
        const unitLabel = app._escapeHtml(unitName);
        const icon = isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon;
        const rootBase = presentation === 'desktop' ? 'unit-card' : 'mobile-unit-chip';
        const surfaceRoleAttrs = options.surfaceRoleAttrs || (isParty
            ? 'data-surface-role="actor-presence-chip" data-drawer-role="actors"'
            : 'data-surface-role="target-presence-chip" data-drawer-role="targets"');
        const quickIntent = !isParty && app.combatState?.active && app.targetSelection?.source === 'combat' && app.targetSelection.action !== 'scavenge' && isTargetable
            ? app.targetSelection.action
            : null;
        const passive = options.passive === true || (options.stage === 'combat' && !quickIntent);
        const click = passive
            ? ''
            : (quickIntent
                ? `App.executeQuickCombatIntentOnTarget('${app._escapeJsString(quickIntent)}','${targetKey}')`
                : (isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`));
        const interactionAttrs = passive
            ? ''
            : ` onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${click}}" onclick="${click}"`;
        const pressTargetKey = !isParty && !isCorpse ? explorationTargetKey : targetKey;
        const pressHandlers = presentation === 'mobile'
            ? (isParty
                ? ` ontouchstart="App.startMobilePartyPress(event,${index})" ontouchmove="App.cancelMobilePartyPress()" ontouchend="App.cancelMobilePartyPress()" ontouchcancel="App.cancelMobilePartyPress()"`
                : ` ontouchstart="App.startMobileCreaturePress(event,'${pressTargetKey}')" ontouchmove="App.cancelMobileCreaturePress()" ontouchend="App.cancelMobileCreaturePress()" ontouchcancel="App.cancelMobileCreaturePress()"`)
            : '';
        const stageAttrs = options.stage === 'combat'
            ? `data-stage-surface="combatant" data-stage-layer="${app._escapeHtml(isParty ? 'party' : 'enemy')}"`
            : '';
        const suppressTargetControl = options.suppressTargetControl === true;
        const suppressAgencyControl = options.suppressAgencyControl === true;
        const rowAttr = app.combatState?.active && unit.combatRow
            ? `data-combat-row="${app._escapeHtml(unit.combatRow)}"`
            : '';
        const syncRole = app.combatState?.active ? app._turnOrderInfo(unit)?.syncRole : null;
        const syncRoleAttr = syncRole ? `data-sync-role="${app._escapeHtml(syncRole)}"` : '';
        let agencyControl = '';
        if (!suppressAgencyControl && isParty && app.combatState.active && !app.feedSelection?.active && (!app.syncSelection?.active || app.syncSelection.phase === 'participants')) {
            agencyControl = app._syncParticipantButton(unit, true);
        } else if (!suppressAgencyControl && isParty && !app.combatState.active) {
            const explicitlySelectedActor = app._isExplicitExplorationActor?.(unit);
            const selectedClass = explicitlySelectedActor ? ' primary' : '';
            const actorAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-actor" ${app._selectionControlAttrs('actor', explicitlySelectedActor)} ${this.agencyIconStyle(app, unit)}`;
            agencyControl = this.controlButton(app, 'action-btn actor-toggle micro-card-toggle agency-corner-toggle' + selectedClass, app._label('target.act', 'Actor'), app._actorToggleLabel(unit, explicitlySelectedActor), `event.stopPropagation();App.selectExplorationActor(${index})`, actorAttrs);
        }
        let targetControl = '';
        if (!suppressTargetControl && isParty && !app.combatState.active) {
            const selectedClass = targetSelected ? ' primary' : '';
            const targetAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
            targetControl = this.controlButton(app, 'action-btn target-toggle micro-card-toggle target-corner-toggle' + selectedClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetAttrs);
        } else if (!suppressTargetControl && isParty && app.combatState.active) {
            const selectedClass = targetSelected ? ' primary' : '';
            const targetAttrs = `data-command-surface="party-target-routing" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
            targetControl = this.controlButton(app, 'action-btn target-toggle micro-card-toggle target-corner-toggle' + selectedClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetAttrs);
        } else if (!suppressTargetControl && isCorpse) {
            if (app.combatState.active && app.targetSelection?.source === 'combat' && app.targetSelection.action === 'scavenge') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabledAttr = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, 'scavenge', canTarget);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-target', canTarget)}`;
                targetControl = this.controlButton(app, 'action-btn primary target-toggle micro-card-toggle target-corner-toggle' + disabledClass, app._combatTargetPickLabel(unit, 'scavenge', canTarget), targetHint, `event.stopPropagation();App.executeActionOnTarget('scavenge','${targetKey}')`, pickAttrs);
            } else if (!app.combatState.active) {
                const selectedClass = targetSelected ? ' primary' : '';
                const targetAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                targetControl = this.controlButton(app, 'action-btn target-toggle micro-card-toggle target-corner-toggle' + selectedClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetAttrs);
            }
        } else if (!suppressTargetControl && !isParty && unit.CPun > 0) {
            if (app.targetSelection) {
                const disabledClass = isTargetable ? '' : ' disabled';
                const disabledAttr = isTargetable ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.targetSelection.action || 'action', isTargetable);
                const targetLabel = isTargetable ? app._combatTargetMarkLabel() : app._combatTargetPickLabel(unit, app.targetSelection.action || 'action', isTargetable);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-mark-target', isTargetable ? combatMarked : 'blocked')}`;
                targetControl = this.controlButton(app, 'action-btn target-toggle micro-card-toggle target-corner-toggle' + (combatMarked ? ' primary' : '') + disabledClass, targetLabel, targetHint, `event.stopPropagation();App.toggleCombatTarget('${targetKey}')`, pickAttrs);
            } else if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabled = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.syncSelection.type || 'sync_fight', canTarget);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabled.trim()}${disabled.trim() ? ' ' : ''}${app._selectionControlAttrs('combat-target', canTarget)}`;
                targetControl = this.controlButton(app, 'action-btn primary target-toggle micro-card-toggle target-corner-toggle' + disabledClass, app._combatTargetPickLabel(unit, app.syncSelection.type || 'sync_fight', canTarget), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.syncSelection.type || 'sync_fight'}','${targetKey}')`, pickAttrs);
            } else if (app.combatState.active && unit.disposition === app.DISPOSITION.ENEMY && !app.feedSelection?.active) {
                const selectedClass = combatMarked ? ' primary' : '';
                const targetAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${app._selectionControlAttrs('combat-mark-target', combatMarked)}`;
                targetControl = this.controlButton(app, 'action-btn target-toggle micro-card-toggle target-corner-toggle' + selectedClass, app._combatTargetMarkLabel(), app._combatTargetToggleLabel(unit, combatMarked), `event.stopPropagation();App.toggleCombatTarget('${targetKey}')`, targetAttrs);
            } else if (!app.combatState.active || unit.disposition !== app.DISPOSITION.ENEMY) {
                const selectedClass = targetSelected ? ' primary' : '';
                const targetAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                targetControl = this.controlButton(app, 'action-btn target-toggle micro-card-toggle target-corner-toggle' + selectedClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetAttrs);
            }
        }
        const hasAgencyControl = Boolean(agencyControl);
        const hasTargetControl = Boolean(targetControl);
        const autonomyControl = isCompanion ? app._companionAutonomyControl(unit, index, { micro: true }) : '';
        const autonomyStatus = isCompanion ? app._companionAutonomyStatus(unit) : '';
        const autonomyStatusAttr = autonomyStatus ? ` data-autonomy-status="${app._escapeHtml(autonomyStatus)}"` : '';
        const currentClass = app._isCurrentCombatActor?.(unit) ? ' current-actor' : '';
        const extraClass = options.extraClass ? ` ${options.extraClass}` : '';
        const cardClass = `${rootBase} compact-tactical-card ${presentation}-tactical-card micro-tactical-card density-micro${extraClass}${hasAgencyControl || hasTargetControl || autonomyControl ? ' has-corner-controls' : ''}${autonomyControl ? ' has-autonomy-control' : ''}${isTargetable ? ' targetable' : ''}${currentClass}${app._unitSelectionClass(unit, type)}`;
        const actionRowScope = isParty
            ? (app.syncSelection?.active ? 'sync-participants' : (app.combatState?.active ? 'combat-plan-actors' : 'party-selection'))
            : (app.combatState.active ? 'combat-target-mark' : 'creature-selection');
        const focusAttrs = passive
            ? ''
            : (quickIntent
                ? `role="button" tabindex="0" data-card-purpose="quick-intent" aria-label="${app._escapeHtml(app._combatTargetPickHint(unit, quickIntent, true))}"`
                : app._unitCardFocusAttrs(unit, false, unitName));
        return `<div class="${cardClass}"${autonomyStatusAttr} data-card-role="compact-tactical" data-card-density="micro" data-unit-name="${unitLabel}" ${surfaceRoleAttrs} ${stageAttrs} ${rowAttr} ${syncRoleAttr} ${app._unitSelectionStateAttrs(unit, type)} ${focusAttrs}${interactionAttrs}${passive ? '' : pressHandlers} style="${isCorpse ? 'opacity:0.58;' : ''}">
                    ${app._srOnly(unitName)}
                    ${app._srOnly(app._combatStatusText(unit), 'role="status" aria-live="polite"')}
                    <span class="unit-actions micro-control-slot micro-agency-slot ${hasAgencyControl ? 'has-control' : 'avatar-only'}" ${hasAgencyControl ? app._unitActionRowAttrs(actionRowScope, unit) : ''}>${agencyControl || `<span class="micro-avatar" aria-hidden="true">${app._unitArtHtml(unit, icon, { className: 'micro-card-sprite' })}</span>`}</span>
                    ${autonomyControl ? `<span class="unit-actions micro-control-slot micro-autonomy-slot has-control" ${app._unitActionRowAttrs('companion-autonomy', unit)}>${autonomyControl}</span>` : ''}
                    <span class="micro-stat-slot">${app._unitTacticalRings(unit)}</span>
                    <span class="unit-actions micro-control-slot micro-target-slot ${hasTargetControl ? 'has-control' : 'empty'}" ${hasTargetControl ? app._unitActionRowAttrs(actionRowScope, unit) : ''}>${targetControl}</span>
                </div>`;
    },

    desktop(app, unit, index, type) {
        const isParty = type === 'party';
        const isCompanion = isParty && unit !== app.player && !unit.mc;
        const isCorpse = !isParty && app._isCorpse(unit);
        const isLeader = isParty && app._getPartyLeader() === unit;
        const targetKey = app._unitKey(unit);
        const explorationTargetKey = isParty ? targetKey : app._escapeJsString(app._explorationTargetUnitId('creature', unit));
        const rawTargetId = app._unitSelectionId(unit);
        const targetSelected = isParty ? app._isExplorationTarget(type, rawTargetId) : app._isExplorationTargetUnit('creature', unit);
        const combatMarked = !isParty && app._isCombatMarkedTarget?.(unit);
        const isTargetable = !isParty && app.targetSelection && app.canSelectCreatureTarget(unit);
        const unitName = unit.name || this.fallbackName(app, isParty);
        const unitLabel = app._escapeHtml(this.shortName(app, unit, unitName));
        const button = (classes, label, title, onclick, attrs = '') => {
            const cornerSlot = classes.includes('agency-corner-toggle')
                ? ' data-corner-slot="agency"'
                : (classes.includes('target-corner-toggle') ? ' data-corner-slot="target"' : '');
            return `<button class="${classes}"${cornerSlot} title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${attrs ? ' ' + attrs : ''} onclick="${onclick}">${app._escapeHtml(label)}</button>`;
        };
        let actionButtons = '';
        if (isParty && !app.combatState.active) {
            const explicitlySelectedActor = app._isExplicitExplorationActor?.(unit);
            const selectedClass = explicitlySelectedActor ? ' primary' : '';
            const targetClass = targetSelected ? ' primary' : '';
            const actorAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-actor" ${app._selectionControlAttrs('actor', explicitlySelectedActor)} ${this.agencyIconStyle(app, unit)}`;
            const targetAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
            const autonomyControl = isCompanion ? app._companionAutonomyControl(unit, index, { corner: true }) : '';
            actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls" ${app._unitActionRowAttrs('party-selection', unit)}>${button('action-btn actor-toggle corner-card-toggle agency-corner-toggle' + selectedClass, app._label('target.act', 'Actor'), app._actorToggleLabel(unit, explicitlySelectedActor), `event.stopPropagation();App.selectExplorationActor(${index})`, actorAttrs)}${autonomyControl}${button('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetAttrs)}</div>`;
        } else if (isParty && app.combatState.active) {
            const participantControl = !app.feedSelection?.active && (!app.syncSelection?.active || app.syncSelection.phase === 'participants')
                ? app._syncParticipantButton(unit, true)
                : '';
            const actionScope = app.syncSelection?.active && app.syncSelection.phase === 'participants'
                ? 'sync-participants'
                : 'combat-plan-actors';
            const targetClass = targetSelected ? ' primary' : '';
            const targetAttrs = `data-command-surface="party-target-routing" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
            const autonomyControl = isCompanion ? app._companionAutonomyControl(unit, index, { corner: true }) : '';
            actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls" ${app._unitActionRowAttrs(actionScope, unit)}>${participantControl}${autonomyControl}${button('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetAttrs)}</div>`;
        }
        if (!isParty && isCorpse) {
            if (app.combatState.active && app.targetSelection?.source === 'combat' && app.targetSelection.action === 'scavenge') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabledAttr = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, 'scavenge', canTarget);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-target', canTarget)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('combat-target', unit)}>${this.presentationBadge(app, unit)}${button('action-btn primary target-toggle corner-card-toggle target-corner-toggle' + disabledClass, app._combatTargetPickLabel(unit, 'scavenge', canTarget), targetHint, `event.stopPropagation();App.executeActionOnTarget('scavenge','${targetKey}')`, pickAttrs)}</div>`;
            } else if (!app.combatState.active) {
                const targetClass = targetSelected ? ' primary' : '';
                const targetAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('creature-selection', unit)}>${this.presentationBadge(app, unit)}${button('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetAttrs)}</div>`;
            }
        }
        if (!isParty && unit.CPun > 0) {
            if (app.targetSelection) {
                const disabledClass = isTargetable ? '' : ' disabled';
                const disabledAttr = isTargetable ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.targetSelection.action || 'action', isTargetable);
                const targetLabel = isTargetable ? app._combatTargetMarkLabel() : app._combatTargetPickLabel(unit, app.targetSelection.action || 'action', isTargetable);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-mark-target', isTargetable ? combatMarked : 'blocked')}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('combat-target-mark', unit)}>${this.presentationBadge(app, unit)}${button('action-btn target-toggle corner-card-toggle target-corner-toggle' + (combatMarked ? ' primary' : '') + disabledClass, targetLabel, targetHint, `event.stopPropagation();App.toggleCombatTarget('${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabled = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.syncSelection.type || 'sync_fight', canTarget);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabled.trim()}${disabled.trim() ? ' ' : ''}${app._selectionControlAttrs('combat-target', canTarget)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('combat-target', unit)}>${this.presentationBadge(app, unit)}${button('action-btn primary target-toggle corner-card-toggle target-corner-toggle' + disabledClass, app._combatTargetPickLabel(unit, app.syncSelection.type || 'sync_fight', canTarget), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.syncSelection.type || 'sync_fight'}','${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.combatState.active && unit.disposition === app.DISPOSITION.ENEMY && !app.feedSelection?.active) {
                const targetClass = combatMarked ? ' primary' : '';
                const targetAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${app._selectionControlAttrs('combat-mark-target', combatMarked)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('combat-target-mark', unit)}>${this.presentationBadge(app, unit)}${button('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._combatTargetMarkLabel(), app._combatTargetToggleLabel(unit, combatMarked), `event.stopPropagation();App.toggleCombatTarget('${targetKey}')`, targetAttrs)}</div>`;
            } else if (!app.combatState.active || unit.disposition !== app.DISPOSITION.ENEMY) {
                const targetClass = targetSelected ? ' primary' : '';
                const targetAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('creature-selection', unit)}>${this.presentationBadge(app, unit)}${button('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetAttrs)}</div>`;
            }
        }
        const dispLabel = isParty ? '' : app._unitDispositionLabel(unit);
        const roleLabel = isParty && unit.name !== app.player?.name ? app._partyRoleLabel(app._getPartyRole(unit)) : '';
        const canDragPartyMember = isParty && unit !== app.player && !app.combatState.active;
        const dragAttrs = canDragPartyMember ? ` draggable="true" data-party-index="${index}" ondragstart="event.stopPropagation();App.startPartyDrag(${index})" ondragover="App.dragPartyOver(event)" ondrop="event.stopPropagation();App.dropPartyMember(${index})" ondragend="App.clearPartyDrag()"` : '';
        const rowLabel = app.combatState.active && unit.combatRow ? ` ${app._label('combat.row', 'Row')}:${app._combatRowLabel(unit.combatRow)}` : '';
        const autonomyStatus = isCompanion ? app._companionAutonomyStatus(unit) : '';
        const autonomyStatusLabel = isCompanion ? app._companionAutonomyStatusLabel(unit) : '';
        const autonomyStatusAttr = autonomyStatus ? ` data-autonomy-status="${app._escapeHtml(autonomyStatus)}"` : '';
        const status = app._escapeHtml(`${isParty ? (unit === app.player ? app._label('party.you', 'You') : app._label('party.ally', 'Ally')) : dispLabel || app._unitDispositionLabel(unit)}${autonomyStatusLabel ? ' | ' + autonomyStatusLabel : ''}${rowLabel ? ' | ' + rowLabel.trim() : ''}`);
        const unitMeta = [
            isLeader ? `<span class="unit-meta-badge leader">${app._escapeHtml(app._label('party.leader', 'Leader'))}</span>` : '',
            roleLabel ? `<span class="unit-meta-badge">${app._escapeHtml(roleLabel)}</span>` : '',
            dispLabel ? `<span class="unit-meta-badge">${app._escapeHtml(dispLabel)}</span>` : '',
            app._turnOrderBadge(unit)
        ].filter(Boolean).join('');
        const hasCornerControls = actionButtons.includes('corner-card-controls');
        const cardClass = `unit-card compact-tactical-card desktop-tactical-card density-medium${hasCornerControls ? ' has-corner-controls' : ''}${canDragPartyMember ? ' party-draggable' : ''}${isTargetable ? ' targetable' : ''}${app._unitSelectionClass(unit, type)}`;
        const surfaceRoleAttrs = isParty
            ? 'data-surface-role="actor-card" data-drawer-role="actors"'
            : 'data-surface-role="target-card" data-drawer-role="targets"';
        const quickIntent = !isParty && app.combatState?.active && app.targetSelection?.source === 'combat' && app.targetSelection.action !== 'scavenge' && isTargetable
            ? app.targetSelection.action
            : null;
        const click = quickIntent
            ? `App.executeQuickCombatIntentOnTarget('${app._escapeJsString(quickIntent)}','${targetKey}')`
            : (isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`);
        return `<div class="${cardClass}"${autonomyStatusAttr} data-card-role="compact-tactical" ${surfaceRoleAttrs} ${app._unitSelectionStateAttrs(unit, type)} ${app._unitCardFocusAttrs(unit, false, unitName)} onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${click}}" onclick="${click}" style="${isCorpse ? 'opacity:0.58;' : ''}"${dragAttrs}>
                    ${actionButtons}
                    <div class="unit-header">
                        <span class="unit-icon">${app._unitArtHtml(unit, isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon, { className: 'tactical-card-sprite' })}</span>
                        <div class="unit-info">
                            <div class="unit-name">${unitLabel}</div>
                            ${unitMeta ? `<div class="unit-meta">${unitMeta}</div>` : ''}
                            ${app._srOnly(app._combatStatusText(unit), 'role="status" aria-live="polite"')}
                            <div class="unit-card-status">${status}</div>
                            ${app._unitTacticalRings(unit)}
                            ${app._unitTraitChips(unit, type, 2)}
                            ${app._unitSelectionChips(unit, type)}
                        </div>
                    </div>
                </div>`;
    },

    mobile(app, unit, index, type) {
        const isExpanded = unit.expanded || false;
        const isParty = type === 'party';
        const isCompanion = isParty && unit !== app.player && !unit.mc;
        const isCorpse = !isParty && app._isCorpse(unit);
        const targetKey = app._unitKey(unit);
        const explorationTargetKey = isParty ? targetKey : app._escapeJsString(app._explorationTargetUnitId('creature', unit));
        const rawTargetId = app._unitSelectionId(unit);
        const targetSelected = isParty ? app._isExplorationTarget(type, rawTargetId) : app._isExplorationTargetUnit('creature', unit);
        const combatMarked = !isParty && app._isCombatMarkedTarget?.(unit);
        const isTargetable = !isParty && app.targetSelection && app.canSelectCreatureTarget(unit);
        const unitName = unit.name || this.fallbackName(app, isParty);
        const unitLabel = app._escapeHtml(this.shortName(app, unit, unitName));
        const chipButton = (classes, label, title, onclick, attrs = '') => {
            const cornerSlot = classes.includes('agency-corner-toggle')
                ? ' data-corner-slot="agency"'
                : (classes.includes('target-corner-toggle') ? ' data-corner-slot="target"' : '');
            return `<button class="${classes}"${cornerSlot} title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${attrs ? ' ' + attrs : ''} onclick="${onclick}">${app._escapeHtml(label)}</button>`;
        };
        let actionButtons = '';
        let detailButtons = '';
        if (isParty && !app.combatState.active) {
            const explicitlySelectedActor = app._isExplicitExplorationActor?.(unit);
            const selectedClass = explicitlySelectedActor ? ' primary' : '';
            const targetClass = targetSelected ? ' primary' : '';
            const actorPressed = explicitlySelectedActor;
            const targetPressed = targetSelected;
            const actorCommandAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-actor" ${app._selectionControlAttrs('actor', actorPressed)} ${this.agencyIconStyle(app, unit)}`;
            const targetCommandAttrs = `data-command-surface="actor-target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetPressed)}`;
            const autonomyControl = isCompanion ? app._companionAutonomyControl(unit, index, { corner: !isExpanded }) : '';
            actionButtons = isExpanded
                ? `<div class="unit-actions tactical-card-selection-controls inline-card-controls" ${app._unitActionRowAttrs('party-selection', unit)}>${chipButton('action-btn actor-toggle' + selectedClass, app._label('target.act', 'Actor'), app._actorToggleLabel(unit, actorPressed), `event.stopPropagation();App.selectExplorationActor(${index})`, actorCommandAttrs)}${autonomyControl}${chipButton('action-btn target-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetPressed), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetCommandAttrs)}</div>`
                : `<div class="unit-actions tactical-card-selection-controls corner-card-controls" ${app._unitActionRowAttrs('party-selection', unit)}>${chipButton('action-btn actor-toggle corner-card-toggle agency-corner-toggle' + selectedClass, app._label('target.act', 'Actor'), app._actorToggleLabel(unit, actorPressed), `event.stopPropagation();App.selectExplorationActor(${index})`, actorCommandAttrs)}${autonomyControl}${chipButton('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetPressed), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetCommandAttrs)}</div>`;
            if (isExpanded) {
                const behaviorButton = !unit.mc && unit !== app.player
                    ? chipButton('action-btn', app._label('party.manageBehavior', 'Behavior'), app._label('party.manageBehaviorFor', 'Behavior: {name}', { name: unitName }), `event.stopPropagation();App.showCompanionBehavior(${index})`, 'data-command-surface="detail-management" data-command-mode="exploration" data-command-control="open-companion-behavior"')
                    : '';
                detailButtons = `<div class="unit-actions unit-detail-actions" ${app._unitActionRowAttrs('party-details', unit)} style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn', app._label('ui.holdings', 'Holdings'), app._label('party.statsFor', 'Show stats for {name}', { name: unitName }), `event.stopPropagation();App.showPartyMemberStats(${index})`, 'data-command-surface="detail-management" data-command-mode="exploration" data-command-control="open-party-stats"')}${behaviorButton}</div>`;
            }
        } else if (isParty && app.combatState.active) {
            const participantControl = !app.feedSelection?.active && (!app.syncSelection?.active || app.syncSelection.phase === 'participants')
                ? app._syncParticipantButton(unit, true)
                : '';
            const actionScope = app.syncSelection?.active && app.syncSelection.phase === 'participants'
                ? 'sync-participants'
                : 'combat-plan-actors';
            const targetClass = targetSelected ? ' primary' : '';
            const targetCommandAttrs = `data-command-surface="party-target-routing" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
            const autonomyControl = isCompanion ? app._companionAutonomyControl(unit, index, { corner: true }) : '';
            actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls" ${app._unitActionRowAttrs(actionScope, unit)}>${participantControl}${autonomyControl}${chipButton('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`, targetCommandAttrs)}</div>`;
        }
        if (isCorpse) {
            if (app.combatState.active && app.targetSelection?.source === 'combat' && app.targetSelection.action === 'scavenge') {
                const canTarget = app.canSelectCreatureTarget(unit);
                const disabledClass = canTarget ? '' : ' disabled';
                const disabledAttr = canTarget ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, 'scavenge', canTarget);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-target', canTarget)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('combat-target', unit)}>${this.presentationBadge(app, unit)}${chipButton('action-btn primary target-toggle corner-card-toggle target-corner-toggle' + disabledClass, app._combatTargetPickLabel(unit, 'scavenge', canTarget), targetHint, `event.stopPropagation();App.executeActionOnTarget('scavenge','${targetKey}')`, pickAttrs)}</div>`;
            } else if (!app.combatState.active) {
                const targetClass = targetSelected ? ' primary' : '';
                const targetCommandAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('creature-selection', unit)}>${this.presentationBadge(app, unit)}${chipButton('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetCommandAttrs)}</div>`;
            }
        }
        if (!isParty && unit.CPun > 0) {
            if (app.targetSelection) {
                const disabledClass = isTargetable ? '' : ' disabled';
                const disabledAttr = isTargetable ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.targetSelection.action || 'action', isTargetable);
                const targetLabel = isTargetable ? app._combatTargetMarkLabel() : app._combatTargetPickLabel(unit, app.targetSelection.action || 'action', isTargetable);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${disabledAttr}${disabledAttr ? ' ' : ''}${app._selectionControlAttrs('combat-mark-target', isTargetable ? combatMarked : 'blocked')}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('combat-target-mark', unit)}>${this.presentationBadge(app, unit)}${chipButton('action-btn target-toggle corner-card-toggle target-corner-toggle' + (combatMarked ? ' primary' : '') + disabledClass, targetLabel, targetHint, `event.stopPropagation();App.toggleCombatTarget('${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.syncSelection?.active && app.syncSelection.phase === 'target') {
                const isSyncTargetable = app.canSelectCreatureTarget(unit);
                const disabledClass = isSyncTargetable ? '' : ' disabled';
                const disabled = isSyncTargetable ? '' : 'disabled aria-disabled="true"';
                const targetHint = app._combatTargetPickHint(unit, app.syncSelection.type || 'sync_fight', isSyncTargetable);
                const pickAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="pick-target" ${disabled.trim()}${disabled.trim() ? ' ' : ''}${app._selectionControlAttrs('combat-target', isSyncTargetable)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('combat-target', unit)}>${this.presentationBadge(app, unit)}${chipButton('action-btn primary target-toggle corner-card-toggle target-corner-toggle' + disabledClass, app._combatTargetPickLabel(unit, app.syncSelection.type || 'sync_fight', isSyncTargetable), targetHint, `event.stopPropagation();App.executeActionOnTarget('${app.syncSelection.type || 'sync_fight'}','${targetKey}')`, pickAttrs)}</div>`;
            } else if (app.combatState.active && unit.disposition === app.DISPOSITION.ENEMY && !app.feedSelection?.active) {
                const targetClass = combatMarked ? ' primary' : '';
                const targetCommandAttrs = `data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="mark-combat-target" ${app._selectionControlAttrs('combat-mark-target', combatMarked)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('combat-target-mark', unit)}>${this.presentationBadge(app, unit)}${chipButton('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._combatTargetMarkLabel(), app._combatTargetToggleLabel(unit, combatMarked), `event.stopPropagation();App.toggleCombatTarget('${targetKey}')`, targetCommandAttrs)}</div>`;
            } else if (!app.combatState.active || unit.disposition !== app.DISPOSITION.ENEMY) {
                const targetClass = targetSelected ? ' primary' : '';
                const targetCommandAttrs = `data-command-surface="target-routing" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-control="focus-target" ${app._selectionControlAttrs('target', targetSelected)}`;
                actionButtons = `<div class="unit-actions tactical-card-selection-controls corner-card-controls has-presentation-badge" ${app._unitActionRowAttrs('creature-selection', unit)}>${this.presentationBadge(app, unit)}${chipButton('action-btn target-toggle corner-card-toggle target-corner-toggle' + targetClass, app._targetMarkLabel(), app._targetToggleLabel(unit, targetSelected), `event.stopPropagation();App.toggleExplorationTarget('creature','${explorationTargetKey}')`, targetCommandAttrs)}</div>`;
            }
        }
        const click = isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`;
        const partyRole = isParty && unit.name !== app.player?.name ? app._partyRoleLabel(app._getPartyRole(unit)) : '';
        const autonomyStatus = isCompanion ? app._companionAutonomyStatus(unit) : '';
        const autonomyStatusLabel = isCompanion ? app._companionAutonomyStatusLabel(unit) : '';
        const autonomyStatusAttr = autonomyStatus ? ` data-autonomy-status="${app._escapeHtml(autonomyStatus)}"` : '';
        const partyStatus = unit === app.player ? app._label('party.you', 'You') : `${app._label('party.ally', 'Ally')}${partyRole ? ' - ' + partyRole : ''}${autonomyStatusLabel ? ' | ' + autonomyStatusLabel : ''}`;
        const status = isParty ? partyStatus : app._unitDispositionLabel(unit);
        const rowText = app.combatState.active && unit.combatRow ? ` | ${app._combatRowLabel(unit.combatRow)}` : '';
        const bodyMass = unit.bodyMass || null;
        const bodyProfile = bodyMass && typeof YAW_BODY_MASS !== 'undefined'
            ? YAW_BODY_MASS.profileFor(app, unit)
            : null;
        const bodyMassSummary = isExpanded && bodyMass && bodyProfile
            ? app._label('unit.bodyMassSummary', 'Body Mass: {current}/{maximum} · Chew nourishment: {available}', {
                current: bodyMass.current,
                maximum: bodyMass.maximum,
                available: Math.max(0, Number(bodyMass.current || 0) - Math.ceil(Number(bodyMass.maximum || 0) * bodyProfile.minimumViablePercent / 100))
            })
            : '';
        const turnBadge = app._turnOrderBadge(unit);
        const combatStatus = app._srOnly(app._combatStatusText(unit), 'role="status" aria-live="polite"');
        const pressTargetKey = !isParty && !isCorpse ? explorationTargetKey : targetKey;
        const pressHandlers = isParty
            ? ` ontouchstart="App.startMobilePartyPress(event,${index})" ontouchmove="App.cancelMobilePartyPress()" ontouchend="App.cancelMobilePartyPress()" ontouchcancel="App.cancelMobilePartyPress()"`
            : ` ontouchstart="App.startMobileCreaturePress(event,'${pressTargetKey}')" ontouchmove="App.cancelMobileCreaturePress()" ontouchend="App.cancelMobileCreaturePress()" ontouchcancel="App.cancelMobileCreaturePress()"`;
        const hasCornerControls = actionButtons.includes('corner-card-controls');
        const chipClass = `mobile-unit-chip${hasCornerControls ? ' has-corner-controls' : ''}${app._unitSelectionClass(unit, type)}${isTargetable ? ' targetable' : ''} compact-tactical-card density-medium`;
        const surfaceRoleAttrs = isParty
            ? 'data-surface-role="actor-presence-chip" data-drawer-role="actors"'
            : 'data-surface-role="target-presence-chip" data-drawer-role="targets"';
        const quickIntent = !isParty && app.combatState?.active && app.targetSelection?.source === 'combat' && app.targetSelection.action !== 'scavenge' && isTargetable
            ? app.targetSelection.action
            : null;
        const chipClick = quickIntent
            ? `App.executeQuickCombatIntentOnTarget('${app._escapeJsString(quickIntent)}','${targetKey}')`
            : click;
        const keyActivate = `if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${chipClick}}`;
        const cornerActions = hasCornerControls ? actionButtons : '';
        const inlineActions = hasCornerControls ? '' : actionButtons;
        return `<div class="${chipClass}"${autonomyStatusAttr} data-card-role="compact-tactical" ${surfaceRoleAttrs} ${app._unitSelectionStateAttrs(unit, type)} ${app._unitCardFocusAttrs(unit, isExpanded, unitName)} onkeydown="${keyActivate}" onclick="${chipClick}"${pressHandlers}>
                    ${cornerActions}
                    <div class="mobile-chip-name"><span>${app._unitArtHtml(unit, isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon, { className: 'mobile-chip-sprite' })}</span><span>${unitLabel}</span>${turnBadge}</div>
                    ${combatStatus}
                    <div class="mobile-chip-meta">${app._escapeHtml(status)}${rowText}</div>
                    ${bodyMassSummary ? `<div class="mobile-chip-meta unit-body-mass">${app._escapeHtml(bodyMassSummary)}</div>` : ''}
                    ${app._unitTacticalRings(unit)}
                    ${app._unitTraitChips(unit, type)}
                    ${app._unitSelectionChips(unit, type)}
                    ${inlineActions}
                    ${detailButtons}
                </div>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TACTICAL_CARD = YAW_TACTICAL_CARD;
}
