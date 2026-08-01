/**
 * YOU ARE WILD COMBAT ACTIONS
 * Shared combat action controls for the current actor and sync participant picking.
 */

const YAW_COMBAT_ACTIONS = {
    showActorActions(app, actor) {
        if (!app.combatState?.active) {
            const selected = actor || app.player;
            if (selected && app.party.includes(selected) && app._isLivingCreature(selected)) {
                const id = app._unitSelectionId(selected);
                app.explorationActorIds = [id];
                app.explorationActorId = id;
                app.explorationActorSelectionExplicit = true;
            }
            app._clearTransientInteractionState();
            app._renderInteractionState({ exploration: true, toolbelt: false });
            app.showExplorationActions();
            return;
        }
        app._clearTransientInteractionState();
        app.activeActor = actor || app.player;
        app.renderCombatSceneForTurn(app.activeActor);
        app._clearCenterActionsForCombat();
        app._renderInteractionState({ exploration: false, toolbelt: true });
        app.renderDesktopCombatComposer?.(app.activeActor);
    },

    syncParticipantButton(app, unit, compact = false) {
        if (!unit || !app.party.includes(unit)) return '';
        const participantPhase = app.syncSelection?.active && app.syncSelection.phase === 'participants';
        const planActive = app._isCombatPlanActive?.() || false;
        const composeAvailable = app.combatState?.active && !app.syncSelection?.active && !app.feedSelection?.active;
        if (!participantPhase && !planActive && !composeAvailable) return '';
        const id = app._unitSelectionId(unit);
        const current = app._currentCombatActor?.() || app.activeActor || app.player;
        const actorId = app.syncSelection?.actorId || (current ? app._unitSelectionId(current) : '');
        const selected = participantPhase ? app._isSyncParticipant(unit) : Boolean(app._isCombatPlanActor?.(unit));
        const isLeadActor = id === actorId;
        const actorLocked = participantPhase && isLeadActor;
        const planLead = !participantPhase && isLeadActor;
        const name = unit.name || app._label('ui.ally', 'ally');
        const label = actorLocked || planLead
            ? (participantPhase ? app._label('target.actorRole', 'Actor') : app._label('combat.group.leadRole', 'Lead'))
            : (participantPhase
                ? (selected ? app._label('combat.sync.participantRole', 'Participant') : app._label('combat.sync.selectParticipants', 'Select participants for sync'))
                : (selected ? app._label('combat.group.participantRole', 'Participant') : app._label('combat.group.selectParticipants', 'Select participants for group plan')));
        const compactLabel = actorLocked || planLead
            ? (participantPhase ? app._label('combat.sync.leadRole', 'Lead') : app._label('combat.group.leadRole', 'Lead'))
            : (participantPhase
                ? (selected ? app._label('combat.sync.joinedRole', 'Joined') : app._label('combat.sync.joinRole', 'Join'))
                : (selected ? app._label('combat.group.joinedRole', 'Joined') : app._label('combat.group.joinRole', 'Join')));
        const title = app._escapeHtml(actorLocked || planLead
            ? (participantPhase
                ? app._label('combat.sync.actorLockedFor', 'Current sync actor: {name}', { name })
                : app._label('combat.group.leadActorFor', 'Current group lead: {name}', { name }))
            : (participantPhase
                ? app._label('combat.sync.selectParticipantFor', 'Select {name} for sync', { name })
                : app._label('combat.group.selectParticipantFor', 'Select {name} for group plan', { name })));
        const disabled = actorLocked ? ' disabled aria-disabled="true"' : '';
        const state = actorLocked ? 'locked' : (selected ? 'selected' : 'available');
        const intent = app._escapeHtml(app.syncSelection?.type || app._combatPendingIntent?.() || 'group-compose');
        const surface = participantPhase ? 'sync-participants' : 'combat-plan-actors';
        const selectionMode = participantPhase ? 'sync-participant' : 'combat-plan-actor';
        const selectionControl = participantPhase ? 'sync-participant' : 'combat-plan-actor';
        const commandControl = participantPhase ? 'toggle-sync-participant' : 'toggle-combat-plan-actor';
        const attrs = `data-command-surface="${surface}" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="${commandControl}" data-command-slot="actor" data-command-intent="${intent}" data-selection-control="${selectionControl}" data-selection-mode="${selectionMode}" data-selection-state="${state}" aria-pressed="${selected ? 'true' : 'false'}"`;
        const compactClass = compact ? ' corner-card-toggle agency-corner-toggle' : '';
        const compactSlot = compact ? ' data-corner-slot="agency"' : '';
        const iconText = String(unit.icon || '👤').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const iconStyle = compact ? ` style="--compact-card-icon-content:&#39;${app._escapeHtml(iconText)}&#39;;--mobile-card-icon-content:&#39;${app._escapeHtml(iconText)}&#39;;"` : '';
        const content = compact ? '' : app._escapeHtml(label);
        const onclick = participantPhase ? 'App._toggleSyncParticipantById' : 'App.toggleCombatPlanActor';
        return `<button class="action-btn${compactClass}${selected ? ' primary' : ''}"${compactSlot}${iconStyle} ${attrs} title="${title}" aria-label="${title}"${disabled} onclick="event.stopPropagation();${onclick}('${String(id).replace(/'/g, "\\'")}')">${content}</button>`;
    },

    actionButtons(app, actor, options = {}) {
        if (!app.combatState?.active || !actor || !(actor === app.player || app.party.includes(actor))) return '';
        if (!app._isCurrentCombatActor(actor)) return '';
        const compact = Boolean(options.compact);
        const enemies = app.creatures.filter(c => c.disposition === app.DISPOSITION.ENEMY && c.CPun > 0);
        const corpses = app.creatures.filter(c => app._canScavengeCorpse(c));
        const allies = app.party.filter(p => p.CPun > 0 && p.name !== actor.name);
        const buttons = [];
        if (app.cheats.overpowered && actor?.name === app.player?.name) {
            const instantWinLabel = app._escapeHtml(app._label('combat.instantWin', 'Instant Win'));
            const instantWinTitle = app._escapeHtml(app._label('combat.instantWinTitle', 'Instantly defeat all enemies'));
            buttons.push(`<button class="action-btn" data-command-surface="combat-intents" data-command-mode="combat" data-command-control="instant-win" style="background:var(--accent-warning);color:var(--bg-primary);" title="${instantWinTitle}" aria-label="${instantWinTitle}" onclick="event.stopPropagation();App.instantWin()">⚡ ${instantWinLabel}</button>`);
        }
        // V1 contributed actions resolve one actor at a time. Do not advertise them
        // while the group composer is selecting a shared built-in intent.
        let controlProfiles = [];
        let profiles = [];
        let profileButton = null;
        if (typeof YAW_ACTION_PROFILES !== 'undefined' && !app.combatPlanSelection?.active) {
            const availableProfiles = [...YAW_ACTION_PROFILES.profiles.values()]
                .filter(profile => profile.modes.includes('combat'))
                .filter(profile => !YAW_SUB_ACTIONS?.routesActionProfile?.(profile.key))
                .filter(profile => profile.scope === 'self'
                    ? YAW_ACTION_PROFILES.availability(app, profile, actor, actor, 'combat').ok
                    : enemies.some(enemy => YAW_ACTION_PROFILES.availability(app, profile, actor, enemy, 'combat').ok));
            controlProfiles = availableProfiles.filter(profile => profile.category === 'control');
            profiles = availableProfiles.filter(profile => profile.category !== 'control');
            profileButton = profile => {
                const label = YAW_ACTION_PROFILES.label(app, profile);
                const key = app._escapeJsString(profile.key);
                const attrs = `data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="${app._escapeHtml(profile.key)}" data-command-grammar="actor-target-intent" data-command-slot="intent"`;
                return YAW_ACTION_UI.iconButton(app, profile.key, profile.icon, `event.stopPropagation();App.executeCombatIntent('${key}')`, '', attrs, label);
            };
            if (!compact && profiles.length <= 3) {
                profiles.forEach(profile => buttons.push(profileButton(profile)));
            } else if (profiles.length > 0) {
                const moreLabel = app._escapeHtml(app._label('action.contributed.more', 'More actions'));
                const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
                const close = `<button type="button" class="action-btn compact-secondary" data-command-surface="combat-intents" data-command-mode="combat" data-command-control="close-contributed-actions" data-command-slot="exit" aria-label="${closeLabel}" onclick="event.stopPropagation();this.closest('details')?.removeAttribute('open')">${closeLabel}</button>`;
                buttons.push(`<details class="contributed-action-menu"><summary class="action-btn" aria-label="${moreLabel}">${moreLabel}</summary><div class="contributed-action-list">${profiles.map(profileButton).join('')}${close}</div></details>`);
            }
        }
        if (enemies.length > 0) {
            if (controlProfiles.length > 0) {
                const fightLabel = app._escapeHtml(app._combatActionLabel?.('fight') || app._uiLabel('fight'));
                const fightAttrs = 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="fight" data-command-grammar="actor-target-intent" data-command-slot="intent"';
                const attack = YAW_ACTION_UI.iconButton(app, 'fight', app._actionIcon('fight'), "event.stopPropagation();App.executeCombatIntent('fight')", '', fightAttrs, fightLabel);
                const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
                const close = `<button type="button" class="action-btn compact-secondary" data-command-surface="combat-intents" data-command-mode="combat" data-command-control="close-fight-controls" data-command-slot="exit" aria-label="${closeLabel}" onclick="event.stopPropagation();this.closest('details')?.removeAttribute('open')">${closeLabel}</button>`;
                buttons.push(`<details class="contributed-action-menu fight-control-menu"><summary class="action-btn" ${fightAttrs} aria-label="${fightLabel}">⚔️ ${fightLabel}</summary><div class="contributed-action-list">${attack}${controlProfiles.map(profileButton).join('')}${close}</div></details>`);
            } else {
                buttons.push(app._combatIntentButton('fight', actor));
            }
            buttons.push(app._combatIntentButton('flirt', actor));
            buttons.push(app._combatIntentButton('feast', actor));
            buttons.push(app._combatIntentButton('fuck', actor));
        }
        if (allies.length > 0) {
            const feedClass = app._combatPendingIntent?.() === 'feed' ? 'selected' : '';
            buttons.push(app._iconActionButton('feed', app._actionIcon('feed'), "event.stopPropagation();App.executeCombatIntent('feed')", feedClass, 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="feed" data-command-grammar="actor-target-intent" data-command-slot="intent"'));
        }
        if (corpses.length > 0) {
            buttons.push(app._iconActionButton('scavenge', '🍖', "event.stopPropagation();App.executeCombatIntent('scavenge')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="scavenge" data-command-grammar="actor-target-intent" data-command-slot="intent"'));
        }
        const showLegacySync = app.showLegacySyncButton === true || app.settings?.showLegacySyncButton === true;
        if (enemies.length > 0) {
            if (showLegacySync) {
                buttons.push(app._iconActionButton('sync', '👥', "event.stopPropagation();App.executeCombatIntent('sync')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="sync" data-command-grammar="actor-target-intent" data-command-slot="intent" data-command-legacy="sync"'));
            }
            const moveRowText = app._combatMoveRowIntentLabel?.(actor) || app._label('action.moveRow', 'Move Row');
            const moveRowLabel = app._escapeHtml(moveRowText);
            const moveRowTitle = app._escapeHtml(app._actionCostTitle?.('moveRow', moveRowText, actor, null, { mode: 'combat' }) || moveRowText);
            buttons.push(`<button class="action-btn" data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="moveRow" data-command-grammar="actor-target-intent" data-command-slot="intent" title="${moveRowTitle}" aria-label="${moveRowTitle}" onclick="event.stopPropagation();App.executeCombatIntent('moveRow')">↕️ ${moveRowLabel}</button>`);
        }
        buttons.push(app._iconActionButton('flee', app._actionIcon('flee'), "event.stopPropagation();App.executeCombatIntent('flee')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="flee" data-command-grammar="actor-target-intent" data-command-slot="intent"'));
        buttons.push(app._iconActionButton('skip', '', "event.stopPropagation();App.executeCombatIntent('skip')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="skip" data-command-grammar="actor-target-intent" data-command-slot="intent"'));
        if (buttons.length === 0) return '';
        const rowAttrs = app._unitActionRowAttrs('combat-actions', actor);
        const compactClass = compact ? ' compact' : '';
        const preview = app._multiInteractionCurrentPreview?.('fight') || null;
        const previewHtml = preview
            ? `<div class="multi-effect-preview" role="status" data-command-preview="multi-effect" data-multi-effect-percent="${preview.minPercent === preview.maxPercent ? preview.minPercent : `${preview.minPercent}-${preview.maxPercent}`}">${app._escapeHtml(preview.text)}</div>`
            : '';
        return `<div class="unit-actions unit-combat-actions${compactClass}" data-command-surface="combat-intents" ${rowAttrs}>${previewHtml}${buttons.join('')}</div>`;
    },

    desktopComposer(app, actor = app._currentCombatActor?.() || app.activeActor) {
        if (!app.combatState?.active) return '';
        if (app.feedSelection?.active) return '';
        if (app.syncSelection?.active && !app._isCombatGroupCompose?.()) {
            return app._renderCombatPanelTray?.() || '';
        }
        if (app.targetSelection?.source === 'combat') {
            const actionText = app._combatActionLabel?.(app.targetSelection.action || 'action') || app._uiLabel(app.targetSelection.action || 'action');
            const cancelLabel = app._escapeHtml(app._label('target.cancelAction', 'Cancel {action}', { action: actionText }));
            const label = app._escapeHtml(app._label('target.controls', 'Target controls'));
            const markedTargets = app._combatMarkedTargets?.() || [];
            const confirmLabel = app._escapeHtml(['feed', 'feast'].includes(app.targetSelection.action)
                ? app._label('variant.chooseForTarget', 'Choose {action} option for selected target', { action: actionText })
                : markedTargets.length > 1
                ? app._label('target.confirmAction.count', 'Use {action} on {count} selected targets', { action: actionText, count: markedTargets.length })
                : app._label('target.confirmAction', 'Use {action} on selected target', { action: actionText }));
            const confirm = markedTargets.length
                ? `<button class="action-btn primary" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="confirm-targets" data-command-slot="intent" title="${confirmLabel}" aria-label="${confirmLabel}" onclick="App.confirmCombatTargets()">${confirmLabel}</button>`
                : '';
            return `<div class="panel-interaction-tray combat-target-tray" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" role="region" aria-label="${label}"><div class="target-action-row" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" aria-label="${label}">${confirm}<button class="action-btn compact-secondary" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="cancel-targeting" data-command-slot="exit" title="${cancelLabel}" aria-label="${cancelLabel}" onclick="App.cancelTargetSelection()">${cancelLabel}</button></div></div>`;
        }
        const actions = this.actionButtons(app, actor, { source: 'desktop-composer' });
        if (!actions) return '';
        const label = app._escapeHtml(app._label('combat.intentControls', 'Combat intent controls'));
        const groupControls = app._combatPlanControls?.() || app._combatGroupComposeControls?.() || '';
        const correction = app.combatCorrectionMessage?.text
            ? `<div class="combat-correction-message" role="status" aria-live="polite">${app._escapeHtml(app.combatCorrectionMessage.text)}</div>`
            : '';
        const showActions = !(app.combatPlanSelection?.active && app.combatPlanSelection.pendingIntent);
        return `<div class="desktop-combat-composer" role="group" aria-label="${label}">${correction}${groupControls}${showActions ? actions : ''}</div>`;
    },

    renderDesktopComposer(app, actor = app._currentCombatActor?.() || app.activeActor) {
        const belt = document.getElementById('desktop-context-belt');
        if (!belt) return '';
        const html = this.desktopComposer(app, actor);
        belt.innerHTML = html;
        if (html) {
            belt.setAttribute('data-command-surface', 'combat-composer');
            belt.setAttribute('data-command-mode', 'combat');
            belt.setAttribute('data-command-grammar', 'actor-target-intent');
            const meta = typeof YAW_INTERACTION_STATE !== 'undefined' && YAW_INTERACTION_STATE.commandMeta
                ? YAW_INTERACTION_STATE.commandMeta(app)
                : { actorCount: actor ? 1 : 0, targetCount: 0, intent: 'choose' };
            belt.setAttribute('data-command-actor-count', String(meta.actorCount ?? 0));
            belt.setAttribute('data-command-target-count', String(meta.targetCount ?? 0));
            belt.setAttribute('data-command-intent', meta.intent || 'choose');
        } else {
            belt.removeAttribute('data-command-surface');
            belt.removeAttribute('data-command-mode');
            belt.removeAttribute('data-command-grammar');
            belt.removeAttribute('data-command-actor-count');
            belt.removeAttribute('data-command-target-count');
            belt.removeAttribute('data-command-intent');
        }
        if (typeof YAW_SCENE_SHELL !== 'undefined') YAW_SCENE_SHELL.syncDesktopCommandComposer?.();
        return html;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_ACTIONS = YAW_COMBAT_ACTIONS;
}
