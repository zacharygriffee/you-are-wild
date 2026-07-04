/**
 * YOU ARE WILD PANEL INTERACTION TRAYS
 * Renders panel-first actor/target/intent trays for adventure and combat.
 */

const YAW_PANEL_INTERACTIONS = {
    title(app, mode) {
        return mode === 'combat'
            ? app._label('combat.panelActions', 'Combat actions')
            : app._label('target.selectedSummary', 'Selected exploration targets');
    },

    render(app, mode = app.combatState?.active ? 'combat' : 'adventure') {
        if (mode === 'combat') return this.combat(app);
        return app._renderExplorationTargetActions('panel-tray');
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
        const clearLabel = app._escapeHtml(app._label('ui.cancel', 'Cancel'));
        const title = app._escapeHtml(app._label('feed.optionsTitle', 'Feed Options'));
        const buttons = (app.feedSelection.subIds || []).map(subId => {
            const subDef = app.SUB_ACTIONS.feed?.[subId] || {};
            const subLabel = app._escapeHtml(app._getActionLabel('feed', subId));
            const icon = subDef.icon || '';
            return `<button class="action-btn" title="${subLabel}" aria-label="${subLabel}" onclick="App._executeFeedSubAction('${subId}', App.activeActor || App._currentCombatActor() || App.player)">${icon} ${subLabel}</button>`;
        }).join('');
        return `<div class="panel-interaction-tray combat-feed-tray" role="region" aria-label="${label}"><div class="selected-target-summary"><span>${title}</span><span>${app._escapeHtml(actor?.name || '')}</span></div><div class="target-action-row">${buttons}<button class="action-btn" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button></div></div>`;
    },

    sync(app, actor, label) {
        const clearLabel = app._escapeHtml(app._label('ui.cancel', 'Cancel'));
        if (app.syncSelection.phase === 'choose') {
            const title = app._escapeHtml(app._label('combat.sync.chooseAction', 'Choose Sync Action'));
            const syncButton = (type, icon, key, fallback) => {
                const buttonLabel = app._escapeHtml(app._label(key, fallback));
                return `<button class="action-btn" title="${buttonLabel}" aria-label="${buttonLabel}" onclick="App.selectSyncParticipants('${type}')">${icon} ${buttonLabel}</button>`;
            };
            return `<div class="panel-interaction-tray combat-sync-tray" role="region" aria-label="${label}"><div class="selected-target-summary"><span>${title}</span><span>${app._escapeHtml(actor?.name || '')}</span></div><div class="target-action-row">${syncButton('sync_fight', '⚔️', 'combat.sync.action.fight', 'Group Fight')}${syncButton('sync_flirt', '😘', 'combat.sync.action.flirt', 'Group Talk')}${syncButton('sync_fuck', '🔥', 'combat.sync.action.fuck', 'Group Play')}${syncButton('sync_feed', '🍽️', 'combat.sync.action.feed', 'Group Feed')}<button class="action-btn" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button></div></div>`;
        }
        const participants = app._syncSelectedParticipants();
        const names = participants.map(unit => unit.name).join(', ') || (actor?.name || '');
        const needMore = participants.length < 2;
        const message = needMore
            ? app._label('combat.sync.needParticipants', 'Need at least 2 participants for a sync action.')
            : app._label('combat.sync.selectTarget', 'Select sync target');
        return `<div class="panel-interaction-tray combat-sync-tray" role="status" aria-label="${label}"><div class="selected-target-summary"><span>${app._escapeHtml(app._label('target.actors', 'Actors'))}: ${app._escapeHtml(names)}</span><span>${app._escapeHtml(message)}</span></div><button class="action-btn" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button></div>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_PANEL_INTERACTIONS = YAW_PANEL_INTERACTIONS;
}
