/**
 * YOU ARE WILD MOBILE COMBAT TOOLBELT
 * Renders the compact mobile combat command composer, status, and phase controls.
 */

const YAW_MOBILE_COMBAT_TOOLBELT = {
    prompt(app, actor = app._currentCombatActor()) {
        if (!app.combatState?.active) return '';
        if (app.combatCorrectionMessage?.text) return app.combatCorrectionMessage.text;
        if (app.syncSelection?.active && !app._isCombatGroupCompose?.()) {
            if (app.syncSelection.phase === 'choose') {
                return app._label('combat.sync.chooseAction', 'Choose Sync Action');
            }
            if (app.syncSelection.phase === 'participants') {
                return app._label('combat.sync.selectParticipants', 'Select participants for sync');
            }
            return app._label('combat.sync.selectTarget', 'Select sync target');
        }
        if (app.feedSelection?.active) {
            return app._label('variant.optionsTitle', '{action} Options', { action: app._uiLabel(app.feedSelection.action || 'feed') });
        }
        if (app.combatPlanSelection?.active) {
            return app._label('mobile.combat.markTargets', 'Mark target(s) for {action}.', { action: app._combatPendingIntent?.() ? app._uiLabel(app._combatPendingIntent()) : app._label('ui.chooseAction', 'Choose') });
        }
        if (app.targetSelection?.source === 'combat') {
            const action = app._uiLabel(app.targetSelection.action || 'action');
            return app._label('mobile.combat.markTargets', 'Mark target(s) for {action}.', { action });
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
        if ((app.syncSelection?.active && !app._isCombatGroupCompose?.()) || app.feedSelection?.active) return '';
        if (app.targetSelection?.source === 'combat') return '';
        if (app.combatPlanSelection?.active && app.combatPlanSelection.pendingIntent) return '';
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
        if (app.combatPlanSelection?.active) {
            const controls = app._combatPlanControls?.({ includeReset: true }) || '';
            const intentLabel = app.combatPlanSelection.pendingIntent
                ? app._uiLabel(app.combatPlanSelection.pendingIntent)
                : app._label('ui.chooseAction', 'Choose');
            const phaseLabel = app.combatPlanSelection.pendingIntent
                ? app._label('combat.group.commitIntent', 'Commit Group {intent}', { intent: intentLabel })
                : app._label('combat.group.cancel', 'Cancel Group');
            const phaseClass = app.combatPlanSelection.pendingIntent ? '' : ' combat-plan-cancel-only';
            return controls ? `<div class="mobile-combat-intents mobile-combat-phase-controls${phaseClass}" data-command-surface="combat-planner" data-command-mode="combat" data-command-grammar="actor-target-intent" role="group" aria-label="${app._escapeHtml(phaseLabel)}">${controls}</div>` : '';
        }
        if (app._isCombatGroupCompose?.()) {
            const clearGroup = app._label('combat.group.clear', 'Clear Group');
            return row(clearGroup, 'combat-group-compose', button(clearGroup, 'event.stopPropagation();App.clearCombatGroupCompose()', 'action-btn', clearGroup, 'data-command-surface="combat-group-compose" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="clear-combat-group" data-command-slot="exit"'));
        }
        if (app.syncSelection?.active && !app._isCombatGroupCompose?.()) {
            const cancelSync = app._label('combat.sync.cancel', 'Cancel Sync');
            if (app.syncSelection.phase === 'choose') {
                const syncButton = (type, icon, key, fallback) => {
                    const label = app._label(key, fallback);
                    return button(`${icon} ${label}`, `event.stopPropagation();App.selectSyncParticipants('${type}')`, 'action-btn', label, `data-command-surface="sync-intents" data-command-mode="combat" data-command-intent="${app._escapeHtml(type)}" data-command-grammar="actor-target-intent" data-command-slot="intent"`);
                };
                const buttons = [
                    syncButton('sync_fight', '⚔️', 'combat.sync.action.fight', 'Group Fight'),
                    syncButton('sync_flirt', '😘', 'combat.sync.action.flirt', 'Group Talk'),
                    syncButton('sync_fuck', '🔥', 'combat.sync.action.fuck', 'Group Play'),
                    syncButton('sync_feed', '🍽️', 'combat.sync.action.feed', 'Group Feed'),
                    button(cancelSync, 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn', cancelSync, 'data-command-surface="sync-intents" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="cancel-sync" data-command-slot="exit"')
                ].join('');
                return row(app._label('combat.sync.chooseAction', 'Choose Sync Action'), 'sync-intents', buttons);
            }
            if (app.syncSelection.phase === 'participants') {
                const participants = app._syncSelectedParticipants();
                const confirmLabel = app._label('combat.sync.confirmParticipants', 'Confirm Participants');
                const confirmDisabled = participants.length < 2 ? ' disabled aria-disabled="true"' : '';
                const confirm = `<button class="action-btn primary${participants.length < 2 ? ' disabled' : ''}" data-command-surface="sync-participants" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="confirm-sync-participants" data-command-slot="actor" title="${app._escapeHtml(confirmLabel)}" aria-label="${app._escapeHtml(confirmLabel)}"${confirmDisabled} onclick="event.stopPropagation();App.confirmSyncParticipants('${app._escapeJsString(app.syncSelection.type || 'sync_fight')}')">${app._escapeHtml(confirmLabel)}</button>`;
                return row(app._label('combat.sync.selectParticipants', 'Select participants for sync'), 'sync-participants', confirm + button(cancelSync, 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn', cancelSync, 'data-command-surface="sync-participants" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="cancel-sync" data-command-slot="exit"'));
            }
            return row(app._label('combat.sync.selectTarget', 'Select sync target'), 'sync-targeting', button(cancelSync, 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn', cancelSync, 'data-command-surface="sync-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="cancel-sync" data-command-slot="exit"'));
        }
        if (app.feedSelection?.active) {
            const action = app.feedSelection.action || 'feed';
            const feedLabel = app._label('variant.optionsTitle', '{action} Options', { action: app._uiLabel(action) });
            const resolution = { action, variants: app.feedSelection.variants || YAW_SUB_ACTIONS.resolve(app, action, { actors: [actor], targets: [app.feedSelection.target] }).variants };
            const options = YAW_INTENT_MENU.variantOptionsHtml(app, resolution, {
                mode: 'combat',
                selectCall: `event.stopPropagation();App._executeActionVariant('{id}', App.activeActor || App._currentCombatActor() || App.player)`
            });
            const back = button(app._label('ui.back', 'Back'), 'event.stopPropagation();App.cancelActionVariantSelection()', 'action-btn', app._label('ui.back', 'Back'), 'data-command-surface="action-variant-options" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="back-variant" data-command-slot="exit"');
            return row(feedLabel, 'action-variant-options', options + back);
        }
        if (app.targetSelection?.source === 'combat') {
            const actionLabel = app._uiLabel(app.targetSelection.action || 'action');
            const cancelAction = app._label('target.cancelAction', 'Cancel {action}', { action: actionLabel }) || cancelLabel;
            const markedTargets = app._combatMarkedTargets?.() || [];
            const confirmAction = app._label('target.confirmAction', 'Use {action} on selected target', { action: actionLabel });
            const confirm = markedTargets.length
                ? button(confirmAction, 'event.stopPropagation();App.confirmCombatTargets()', 'action-btn primary', confirmAction, 'data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="confirm-targets" data-command-slot="intent"')
                : '';
            const cancel = button(cancelAction, 'event.stopPropagation();App.cancelTargetSelection()', 'action-btn compact-secondary', cancelAction, 'data-command-surface="combat-targeting" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="cancel-targeting" data-command-slot="exit"');
            return row(app._label('target.controls', 'Target controls'), 'combat-targeting', confirm + cancel);
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
        return html ? `<div class="selection-sentence mobile-combat-selection-sentence" ${attrs} role="status" aria-live="polite" aria-atomic="true">${html}</div>` : '';
    },

    render(app) {
        const surface = document.getElementById('mobile-play-surface');
        const belt = document.getElementById('mobile-combat-toolbelt');
        const active = Boolean(app.combatState?.active);
        if (surface?.classList) surface.classList.toggle('combat-active', active);
        document.documentElement?.classList?.toggle('mobile-combat-active', active);
        if (active && typeof window !== 'undefined' && window.innerWidth <= 1024) {
            const mainContent = document.querySelector('.panel-main .panel-content');
            if (mainContent) mainContent.scrollTop = 0;
            if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
        }
        app.renderMobileExplorationControls?.();
        if (!belt) return '';
        if (!active) {
            belt.className = 'mobile-combat-toolbelt';
            belt.innerHTML = '';
            belt.removeAttribute('data-surface-role');
            belt.removeAttribute('data-command-surface');
            belt.removeAttribute('data-command-mode');
            belt.removeAttribute('data-command-grammar');
            belt.removeAttribute('data-command-actor-count');
            belt.removeAttribute('data-command-target-count');
            belt.removeAttribute('data-command-intent');
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
        const promptClass = app.combatCorrectionMessage?.text
            ? 'mobile-combat-prompt combat-correction-message'
            : 'mobile-combat-prompt';
        const sentence = this.selectionSentence(app);
        const phaseControls = this.phaseControls(app, actor);
        const intents = this.intentButtons(app, actor);
        const html = `<div class="mobile-combat-status"><strong>${app._escapeHtml(title)}</strong><span>${app._escapeHtml(status)}</span></div>${sentence}${phaseControls}<div class="${promptClass}">${app._escapeHtml(prompt)}</div>${intents}`;
        belt.className = 'mobile-combat-toolbelt active';
        belt.setAttribute('data-surface-role', 'command-composer');
        belt.setAttribute('data-command-surface', 'combat-composer');
        belt.setAttribute('data-command-mode', 'combat');
        belt.setAttribute('data-command-grammar', 'actor-target-intent');
        const meta = typeof YAW_INTERACTION_STATE !== 'undefined' && YAW_INTERACTION_STATE.commandMeta
            ? YAW_INTERACTION_STATE.commandMeta(app)
            : { actorCount: actor ? 1 : 0, targetCount: 0, intent: 'choose' };
        belt.setAttribute('data-command-actor-count', String(meta.actorCount ?? 0));
        belt.setAttribute('data-command-target-count', String(meta.targetCount ?? 0));
        belt.setAttribute('data-command-intent', meta.intent || 'choose');
        belt.innerHTML = html;
        return html;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MOBILE_COMBAT_TOOLBELT = YAW_MOBILE_COMBAT_TOOLBELT;
}
