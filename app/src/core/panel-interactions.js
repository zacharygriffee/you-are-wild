/**
 * YOU ARE WILD PANEL INTERACTION TRAYS
 * Renders transient combat trays; exploration intents live in the command composer.
 */

const YAW_PANEL_INTERACTIONS = {
    title(app, mode) {
        return mode === 'combat'
            ? app._label('combat.panelActions', 'Combat actions')
            : app._label('target.selectedSummary', 'Selected exploration targets');
    },

    render(app, mode = app.combatState?.active ? 'combat' : 'adventure') {
        if (mode === 'combat') return '';
        return '';
    },

    combat(app) {
        if (!app.combatState?.active) return '';
        const actor = app.activeActor || app._currentCombatActor();
        const label = app._escapeHtml(this.title(app, 'combat'));
        if (app.feedSelection?.active) {
            return this.feed(app, actor, label);
        }
        if (app.syncSelection?.active && !app._isCombatGroupCompose?.()) {
            return this.sync(app, actor, label);
        }
        return '';
    },

    feed(app, actor, label) {
        const action = app.feedSelection.action || 'feed';
        const backLabel = app._escapeHtml(app._label('ui.back', 'Back'));
        const title = app._escapeHtml(app._label('variant.optionsTitle', '{action} Options', { action: app._uiLabel(action) }));
        const resolution = { action, variants: app.feedSelection.variants || YAW_SUB_ACTIONS.resolve(app, action, { actors: [actor], targets: [app.feedSelection.target] }).variants };
        const buttons = YAW_INTENT_MENU.variantOptionsHtml(app, resolution, {
            mode: 'combat',
            selectCall: `App._executeActionVariant('{id}', App.activeActor || App._currentCombatActor() || App.player)`
        });
        return `<div class="panel-interaction-tray combat-feed-tray" data-command-surface="action-variant-options" data-command-mode="combat" data-command-grammar="actor-target-intent" role="region" aria-label="${title || label}"><div class="target-action-row" data-command-surface="action-variant-options" data-command-mode="combat" data-command-grammar="actor-target-intent" aria-label="${title || label}">${buttons}<button class="action-btn" data-command-surface="action-variant-options" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="back-variant" data-command-slot="exit" title="${backLabel}" aria-label="${backLabel}" onclick="App.cancelActionVariantSelection()">${backLabel}</button></div></div>`;
    },

    sync(app, actor, label) {
        const clearLabel = app._escapeHtml(app._label('combat.sync.cancel', 'Cancel Sync'));
        if (app.syncSelection.phase === 'choose') {
            const title = app._escapeHtml(app._label('combat.sync.chooseAction', 'Choose Sync Action'));
            const syncButton = (type, icon, key, fallback) => {
                const buttonLabel = app._escapeHtml(app._label(key, fallback));
                const intent = app._escapeHtml(type);
                return `<button class="action-btn" data-command-surface="sync-intents" data-command-mode="combat" data-command-intent="${intent}" data-command-grammar="actor-target-intent" data-command-slot="intent" title="${buttonLabel}" aria-label="${buttonLabel}" onclick="App.selectSyncParticipants('${type}')">${icon} ${buttonLabel}</button>`;
            };
            return `<div class="panel-interaction-tray combat-sync-tray" data-command-surface="sync-intents" data-command-mode="combat" data-command-grammar="actor-target-intent" role="region" aria-label="${title || label}"><div class="target-action-row" data-command-surface="sync-intents" data-command-mode="combat" data-command-grammar="actor-target-intent" aria-label="${title || label}">${syncButton('sync_fight', '⚔️', 'combat.sync.action.fight', 'Group Fight')}${syncButton('sync_flirt', '😘', 'combat.sync.action.flirt', 'Group Talk')}${syncButton('sync_fuck', '🔥', 'combat.sync.action.fuck', 'Group Play')}${syncButton('sync_feed', '🍽️', 'combat.sync.action.feed', 'Group Feed')}<button class="action-btn" data-command-surface="sync-intents" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="cancel-sync" data-command-slot="exit" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button></div></div>`;
        }
        const participants = app._syncSelectedParticipants();
        const needMore = participants.length < 2;
        const message = app.syncSelection.phase === 'participants'
            ? app._label('combat.sync.selectParticipants', 'Select participants for sync')
            : app._label('combat.sync.selectTarget', 'Select sync target');
        const trayLabel = app._escapeHtml(message || label);
        const surface = app.syncSelection.phase === 'participants' ? 'sync-participants' : 'sync-targeting';
        let controls = `<button class="action-btn" data-command-surface="${surface}" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="cancel-sync" data-command-slot="exit" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button>`;
        if (app.syncSelection.phase === 'participants') {
            const confirmLabel = app._escapeHtml(app._label('combat.sync.confirmParticipants', 'Confirm Participants'));
            const disabled = needMore ? ' disabled aria-disabled="true"' : '';
            const disabledClass = needMore ? ' disabled' : '';
            const syncType = app._escapeJsString(app.syncSelection.type || 'sync_fight');
            controls = `<button class="action-btn primary${disabledClass}" data-command-surface="${surface}" data-command-mode="combat" data-command-grammar="actor-target-intent" data-command-control="confirm-sync-participants" data-command-slot="actor" title="${confirmLabel}" aria-label="${confirmLabel}"${disabled} onclick="App.confirmSyncParticipants('${syncType}')">${confirmLabel}</button>${controls}`;
        }
        return `<div class="panel-interaction-tray combat-sync-tray" data-command-surface="${surface}" data-command-mode="combat" data-command-grammar="actor-target-intent" role="status" aria-label="${trayLabel}"><div class="target-action-row" data-command-surface="${surface}" data-command-mode="combat" data-command-grammar="actor-target-intent" aria-label="${trayLabel}">${controls}</div></div>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_INTERACTIONS = YAW_PANEL_INTERACTIONS;
}
