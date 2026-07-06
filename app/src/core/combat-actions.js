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
        if (!app.syncSelection?.active || app.syncSelection.phase !== 'participants' || !unit || unit.CPun <= 0) return '';
        const id = app._unitSelectionId(unit);
        const selected = app._isSyncParticipant(unit);
        const actorLocked = id === app.syncSelection.actorId;
        const label = actorLocked
            ? app._label('target.actorRole', 'Actor')
            : (selected ? app._label('combat.sync.participantRole', 'Participant') : app._label('combat.sync.selectParticipants', 'Select participants for sync'));
        const title = app._escapeHtml(app._label('combat.sync.selectParticipantFor', 'Select {name} for sync', { name: unit.name || 'ally' }));
        const disabled = actorLocked ? ' disabled' : '';
        const state = actorLocked ? 'locked' : (selected ? 'selected' : 'available');
        const intent = app._escapeHtml(app.syncSelection?.type || 'sync');
        const attrs = `data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="toggle-sync-participant" data-command-slot="actor" data-command-intent="${intent}" data-selection-control="sync-participant" data-selection-mode="sync-participant" data-selection-state="${state}" aria-pressed="${selected ? 'true' : 'false'}"`;
        return `<button class="action-btn${selected ? ' primary' : ''}" ${attrs} title="${title}" aria-label="${title}"${disabled} onclick="event.stopPropagation();App._toggleSyncParticipantById('${String(id).replace(/'/g, "\\'")}')">${app._escapeHtml(compact ? (selected ? '✓' : '+') : label)}</button>`;
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
        if (enemies.length > 0) {
            buttons.push(app._combatIntentButton('fight', actor, 'primary'));
            buttons.push(app._combatIntentButton('flirt', actor));
            buttons.push(app._combatIntentButton('feast', actor));
            buttons.push(app._combatIntentButton('fuck', actor));
        }
        if (allies.length > 0) {
            buttons.push(app._iconActionButton('feed', app._actionIcon('feed'), "event.stopPropagation();App.executeCombatIntent('feed')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="feed" data-command-grammar="actor-target-intent"'));
        }
        if (corpses.length > 0) {
            buttons.push(app._iconActionButton('scavenge', '🍖', "event.stopPropagation();App.executeCombatIntent('scavenge')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="scavenge" data-command-grammar="actor-target-intent"'));
        }
        if (enemies.length > 0) {
            buttons.push(app._iconActionButton('sync', '👥', "event.stopPropagation();App.executeCombatIntent('sync')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="sync" data-command-grammar="actor-target-intent"'));
            const moveRowLabel = app._escapeHtml(app._label('action.moveRow', 'Move Row'));
            buttons.push(`<button class="action-btn" data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="moveRow" data-command-grammar="actor-target-intent" title="${moveRowLabel}" aria-label="${moveRowLabel}" onclick="event.stopPropagation();App.executeCombatIntent('moveRow')">↕️ ${moveRowLabel}</button>`);
        }
        if (actor?.name === app.player?.name) {
            buttons.push(app._iconActionButton('flee', app._actionIcon('flee'), "event.stopPropagation();App.executeCombatIntent('flee')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="flee" data-command-grammar="actor-target-intent"'));
        } else {
            buttons.push(app._iconActionButton('skip', '', "event.stopPropagation();App.executeCombatIntent('skip')", '', 'data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="skip" data-command-grammar="actor-target-intent"'));
        }
        if (buttons.length === 0) return '';
        const rowAttrs = app._unitActionRowAttrs('combat-actions', actor);
        const compactClass = compact ? ' compact' : '';
        return `<div class="unit-actions unit-combat-actions${compactClass}" data-command-surface="combat-intents" ${rowAttrs}>${buttons.join('')}</div>`;
    },

    desktopComposer(app, actor = app._currentCombatActor?.() || app.activeActor) {
        if (!app.combatState?.active) return '';
        if (app.syncSelection?.active || app.feedSelection?.active) {
            return app._renderCombatPanelTray?.() || '';
        }
        if (app.targetSelection?.source === 'combat') {
            const actionText = app._uiLabel(app.targetSelection.action || 'action');
            const cancelLabel = app._escapeHtml(app._label('target.cancelAction', 'Cancel {action}', { action: actionText }));
            const label = app._escapeHtml(app._label('target.controls', 'Target controls'));
            return `<div class="panel-interaction-tray combat-target-tray" role="region" aria-label="${label}"><div class="target-action-row" data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" aria-label="${label}"><button class="action-btn" data-command-surface="combat-targeting" data-command-mode="combat" data-command-control="cancel-targeting" title="${cancelLabel}" aria-label="${cancelLabel}" onclick="App.cancelTargetSelection()">${cancelLabel}</button></div></div>`;
        }
        const actions = this.actionButtons(app, actor, { source: 'desktop-composer' });
        if (!actions) return '';
        const label = app._escapeHtml(app._label('combat.intentControls', 'Combat intent controls'));
        return `<div class="desktop-combat-composer" role="group" aria-label="${label}">${actions}</div>`;
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
        } else {
            belt.removeAttribute('data-command-surface');
            belt.removeAttribute('data-command-mode');
            belt.removeAttribute('data-command-grammar');
        }
        return html;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_ACTIONS = YAW_COMBAT_ACTIONS;
}
