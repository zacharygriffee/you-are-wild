/**
 * YOU ARE WILD MOBILE COMBAT TOOLBELT
 * Renders the compact combat status surface while panels keep action controls.
 */

const YAW_MOBILE_COMBAT_TOOLBELT = {
    prompt(app, actor = app._currentCombatActor()) {
        if (!app.combatState?.active) return '';
        if (app.syncSelection?.active) {
            if (app.syncSelection.phase === 'choose') {
                return app._label('combat.sync.chooseAction', 'Choose Sync Action');
            }
            if (app.syncSelection.phase === 'participants') {
                return app._label('combat.sync.selectParticipants', 'Select participants for sync');
            }
            return app._label('combat.sync.selectTarget', 'Select sync target');
        }
        if (app.feedSelection?.active) {
            return app._label('feed.optionsTitle', 'Feed Options');
        }
        if (app.targetSelection?.source === 'combat') {
            const action = app._uiLabel(app.targetSelection.action || 'action');
            return app._label('mobile.combat.pickTarget', 'Pick a target in the enemy strip for {action}.', { action });
        }
        if (actor && (actor === app.player || app.party.includes(actor))) {
            return app._label('mobile.combat.chooseAction', 'Choose an action, then tap a target.');
        }
        if (actor) {
            return app._label('mobile.combat.enemyTurn', '{name} is acting.', { name: actor.name || app._label('ui.creatures', 'Creatures') });
        }
        return app._label('ui.chooseAction', 'Choose your next action.');
    },

    intentButtons(app, actor = app._currentCombatActor()) {
        if (!app.combatState?.active || !actor || !(actor === app.player || app.party.includes(actor))) return '';
        if (app.syncSelection?.active || app.feedSelection?.active) return '';
        const buttons = app._combatActionButtons(actor, { compact: false });
        if (!buttons) return '';
        const label = app._escapeHtml(app._label('mobile.combat.intents', 'Combat intents'));
        return `<div class="mobile-combat-intents" data-command-surface="combat-intents" data-command-mode="combat" data-command-grammar="actor-target-intent" role="group" aria-label="${label}">${buttons}</div>`;
    },

    phaseControls(app, actor = app._currentCombatActor()) {
        if (!app.combatState?.active || !actor || !(actor === app.player || app.party.includes(actor))) return '';
        const button = (label, onclick, classes = 'action-btn', title = label, attrs = '') => `<button class="${classes}"${attrs ? ` ${attrs}` : ''} title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}" onclick="${onclick}">${app._escapeHtml(label)}</button>`;
        const row = (label, surface, buttons) => `<div class="mobile-combat-intents mobile-combat-phase-controls" data-command-surface="${app._escapeHtml(surface)}" data-command-mode="combat" data-command-grammar="actor-target-intent" role="group" aria-label="${app._escapeHtml(label)}"><div class="unit-actions unit-combat-actions compact" data-command-surface="${app._escapeHtml(surface)}" data-command-mode="combat" data-command-grammar="actor-target-intent">${buttons}</div></div>`;
        const cancelLabel = app._label('ui.cancel', 'Cancel');
        if (app.syncSelection?.active) {
            const cancelSync = app._label('combat.sync.cancel', 'Cancel Sync');
            if (app.syncSelection.phase === 'choose') {
                const syncButton = (type, icon, key, fallback) => {
                    const label = app._label(key, fallback);
                    return button(`${icon} ${label}`, `event.stopPropagation();App.selectSyncParticipants('${type}')`, 'action-btn', label, `data-command-mode="combat" data-command-intent="${app._escapeHtml(type)}"`);
                };
                const buttons = [
                    syncButton('sync_fight', '⚔️', 'combat.sync.action.fight', 'Group Fight'),
                    syncButton('sync_flirt', '😘', 'combat.sync.action.flirt', 'Group Talk'),
                    syncButton('sync_fuck', '🔥', 'combat.sync.action.fuck', 'Group Play'),
                    syncButton('sync_feed', '🍽️', 'combat.sync.action.feed', 'Group Feed'),
                    button(cancelSync, 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn', cancelSync, 'data-command-mode="combat" data-command-control="cancel-sync"')
                ].join('');
                return row(app._label('combat.sync.chooseAction', 'Choose Sync Action'), 'sync-intents', buttons);
            }
            if (app.syncSelection.phase === 'participants') {
                const participants = app._syncSelectedParticipants();
                const confirmLabel = app._label('combat.sync.confirmParticipants', 'Confirm Participants');
                const confirmDisabled = participants.length < 2 ? ' disabled aria-disabled="true"' : '';
                const confirm = `<button class="action-btn primary${participants.length < 2 ? ' disabled' : ''}" data-command-control="confirm-sync-participants" title="${app._escapeHtml(confirmLabel)}" aria-label="${app._escapeHtml(confirmLabel)}"${confirmDisabled} onclick="event.stopPropagation();App.confirmSyncParticipants('${app._escapeJsString(app.syncSelection.type || 'sync_fight')}')">${app._escapeHtml(confirmLabel)}</button>`;
                return row(app._label('combat.sync.selectParticipants', 'Select participants for sync'), 'sync-participants', confirm + button(cancelSync, 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn', cancelSync, 'data-command-mode="combat" data-command-control="cancel-sync"'));
            }
            return row(app._label('combat.sync.selectTarget', 'Select sync target'), 'sync-targeting', button(cancelSync, 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn', cancelSync, 'data-command-mode="combat" data-command-control="cancel-sync"'));
        }
        if (app.feedSelection?.active) {
            const feedLabel = app._label('feed.optionsTitle', 'Feed Options');
            const buttons = (app.feedSelection.subIds || []).map(subId => {
                const subDef = app.SUB_ACTIONS.feed?.[subId] || {};
                const subLabel = app._getActionLabel('feed', subId);
                return button(`${subDef.icon || ''} ${subLabel}`.trim(), `event.stopPropagation();App._executeFeedSubAction('${app._escapeJsString(subId)}', App.activeActor || App._currentCombatActor() || App.player)`, 'action-btn', subLabel, `data-command-mode="combat" data-command-intent="feed:${app._escapeHtml(subId)}"`);
            });
            buttons.push(button(app._label('feed.cancel', 'Cancel Feed'), 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn', app._label('feed.cancel', 'Cancel Feed'), 'data-command-mode="combat" data-command-control="cancel-feed"'));
            return row(feedLabel, 'feed-options', buttons.join(''));
        }
        if (app.targetSelection?.source === 'combat') {
            const actionLabel = app._uiLabel(app.targetSelection.action || 'action');
            const cancelAction = app._label('target.cancelAction', 'Cancel {action}', { action: actionLabel }) || cancelLabel;
            return row(app._label('target.controls', 'Target controls'), 'combat-targeting', button(cancelAction, 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn', cancelAction, 'data-command-mode="combat" data-command-control="cancel-targeting"'));
        }
        return '';
    },

    selectionSentence(app) {
        if (!app.combatState?.active || typeof YAW_INTERACTION_STATE === 'undefined') return '';
        const parts = YAW_INTERACTION_STATE.combatSentence(app);
        const html = YAW_INTERACTION_STATE.sentenceHtml(app, parts);
        const meta = YAW_INTERACTION_STATE.sentenceMeta(parts);
        const attrs = html
            ? `data-command-surface="command-sentence" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-actor-count="${app._escapeHtml(String(meta.actorCount ?? 0))}" data-command-target-count="${app._escapeHtml(String(meta.targetCount ?? 0))}" data-command-intent="${app._escapeHtml(meta.intent || 'choose')}"`
            : '';
        return html ? `<div class="selection-sentence mobile-combat-selection-sentence" ${attrs} aria-live="polite">${html}</div>` : '';
    },

    render(app) {
        const surface = document.getElementById('mobile-play-surface');
        const belt = document.getElementById('mobile-combat-toolbelt');
        const active = Boolean(app.combatState?.active);
        if (surface?.classList) surface.classList.toggle('combat-active', active);
        document.documentElement?.classList?.toggle('mobile-combat-active', active);
        app.renderMobileExplorationControls?.();
        if (!belt) return '';
        if (!active) {
            belt.className = 'mobile-combat-toolbelt';
            belt.innerHTML = '';
            belt.removeAttribute('data-surface-role');
            belt.removeAttribute('data-command-surface');
            belt.removeAttribute('data-command-mode');
            belt.removeAttribute('data-command-grammar');
            return '';
        }
        const actor = app._currentCombatActor();
        const round = app.combatState.round || 1;
        const turn = (app.combatState.currentTurn ?? 0) + 1;
        const total = Math.max(1, app.combatState.turnQueue?.length || 1);
        const actorName = actor?.name || app._label('ui.creatures', 'Creatures');
        const status = app._label('mobile.combat.status', 'Round {round} · Turn {turn}/{total}', { round, turn, total });
        const title = app._label('mobile.combat.actor', '{name} to act', { name: actorName });
        const prompt = this.prompt(app, actor);
        const sentence = this.selectionSentence(app);
        const phaseControls = this.phaseControls(app, actor);
        const intents = this.intentButtons(app, actor);
        const html = `<div class="mobile-combat-status"><strong>${app._escapeHtml(title)}</strong><span>${app._escapeHtml(status)}</span></div>${sentence}${phaseControls}<div class="mobile-combat-prompt">${app._escapeHtml(prompt)}</div>${intents}`;
        belt.className = 'mobile-combat-toolbelt active';
        belt.setAttribute('data-surface-role', 'command-composer');
        belt.setAttribute('data-command-surface', 'combat-composer');
        belt.setAttribute('data-command-mode', 'combat');
        belt.setAttribute('data-command-grammar', 'actor-target-intent');
        belt.innerHTML = html;
        return html;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MOBILE_COMBAT_TOOLBELT = YAW_MOBILE_COMBAT_TOOLBELT;
}
