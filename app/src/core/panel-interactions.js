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
        if (app.syncSelection?.active) {
            return this.sync(app, actor, label);
        }
        return '';
    },

    feed(app, actor, label) {
        const clearLabel = app._escapeHtml(app._label('feed.cancel', 'Cancel Feed'));
        const title = app._escapeHtml(app._label('feed.optionsTitle', 'Feed Options'));
        const buttons = (app.feedSelection.subIds || []).map(subId => {
            const subDef = app.SUB_ACTIONS.feed?.[subId] || {};
            const subLabel = app._escapeHtml(app._getActionLabel('feed', subId));
            const intent = app._escapeHtml(`feed:${subId}`);
            const safeSubId = app._escapeJsString(subId);
            const icon = subDef.icon || '';
            return `<button class="action-btn" data-command-mode="combat" data-command-intent="${intent}" title="${subLabel}" aria-label="${subLabel}" onclick="App._executeFeedSubAction('${safeSubId}', App.activeActor || App._currentCombatActor() || App.player)">${icon} ${subLabel}</button>`;
        }).join('');
        return `<div class="panel-interaction-tray combat-feed-tray" role="region" aria-label="${title || label}"><div class="target-action-row" data-command-surface="feed-options" data-command-mode="combat" aria-label="${title || label}">${buttons}<button class="action-btn" data-command-mode="combat" data-command-control="cancel-feed" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button></div></div>`;
    },

    sync(app, actor, label) {
        const clearLabel = app._escapeHtml(app._label('combat.sync.cancel', 'Cancel Sync'));
        if (app.syncSelection.phase === 'choose') {
            const title = app._escapeHtml(app._label('combat.sync.chooseAction', 'Choose Sync Action'));
            const syncButton = (type, icon, key, fallback) => {
                const buttonLabel = app._escapeHtml(app._label(key, fallback));
                const intent = app._escapeHtml(type);
                return `<button class="action-btn" data-command-mode="combat" data-command-intent="${intent}" title="${buttonLabel}" aria-label="${buttonLabel}" onclick="App.selectSyncParticipants('${type}')">${icon} ${buttonLabel}</button>`;
            };
            return `<div class="panel-interaction-tray combat-sync-tray" role="region" aria-label="${title || label}"><div class="target-action-row" data-command-surface="sync-intents" data-command-mode="combat" aria-label="${title || label}">${syncButton('sync_fight', '⚔️', 'combat.sync.action.fight', 'Group Fight')}${syncButton('sync_flirt', '😘', 'combat.sync.action.flirt', 'Group Talk')}${syncButton('sync_fuck', '🔥', 'combat.sync.action.fuck', 'Group Play')}${syncButton('sync_feed', '🍽️', 'combat.sync.action.feed', 'Group Feed')}<button class="action-btn" data-command-mode="combat" data-command-control="cancel-sync" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button></div></div>`;
        }
        const participants = app._syncSelectedParticipants();
        const needMore = participants.length < 2;
        const message = app.syncSelection.phase === 'participants'
            ? app._label('combat.sync.selectParticipants', 'Select participants for sync')
            : app._label('combat.sync.selectTarget', 'Select sync target');
        const trayLabel = app._escapeHtml(message || label);
        let controls = `<button class="action-btn" data-command-mode="combat" data-command-control="cancel-sync" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button>`;
        const surface = app.syncSelection.phase === 'participants' ? 'sync-participants' : 'sync-targeting';
        if (app.syncSelection.phase === 'participants') {
            const confirmLabel = app._escapeHtml(app._label('combat.sync.confirmParticipants', 'Confirm Participants'));
            const disabled = needMore ? ' disabled aria-disabled="true"' : '';
            const disabledClass = needMore ? ' disabled' : '';
            const syncType = app._escapeJsString(app.syncSelection.type || 'sync_fight');
            controls = `<button class="action-btn primary${disabledClass}" data-command-control="confirm-sync-participants" title="${confirmLabel}" aria-label="${confirmLabel}"${disabled} onclick="App.confirmSyncParticipants('${syncType}')">${confirmLabel}</button>${controls}`;
        }
        return `<div class="panel-interaction-tray combat-sync-tray" role="status" aria-label="${trayLabel}"><div class="target-action-row" data-command-surface="${surface}" data-command-mode="combat" aria-label="${trayLabel}">${controls}</div></div>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_INTERACTIONS = YAW_PANEL_INTERACTIONS;
}
