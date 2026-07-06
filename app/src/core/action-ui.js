/**
 * YOU ARE WILD ACTION UI
 * Shared button, icon, and legend helpers for panel and center action surfaces.
 */

const YAW_ACTION_UI = {
    iconButton(app, key, icon, onclick, extraClass = '', attrs = '') {
        const label = app._uiLabel(key);
        const className = `action-btn${extraClass ? ' ' + extraClass : ''}`;
        const attrText = attrs ? ` ${attrs}` : '';
        return `<button class="${className}"${attrText} title="${label}" aria-label="${label}" onclick="${onclick}"><span class="action-icon" aria-hidden="true">${icon}</span><span class="action-caption">${label}</span></button>`;
    },

    combatIntentButton(app, key, actor, extraClass = '') {
        const actorId = actor ? app._unitSelectionId(actor) : '';
        const isSelected = app.targetSelection?.source === 'combat'
            && app.targetSelection.action === key
            && (!app.targetSelection.actorId || app.targetSelection.actorId === actorId || app.targetSelection.actorId === actor?.id || app.targetSelection.actorId === actor?.name);
        const classes = [extraClass, isSelected ? 'selected' : ''].filter(Boolean).join(' ');
        const intent = app._escapeHtml(key);
        return app._iconActionButton(key, app._actionIcon(key), `event.stopPropagation();App.executeCombatIntent('${key}')`, classes, `data-command-mode="combat" data-command-intent="${intent}"`);
    },

    legend(app, keys) {
        if (keys.length <= 1) return '';
        return `<div class="action-legend" aria-label="${app._escapeHtml(app._label('ui.actionLegend', 'Action legend'))}">${keys.map(key => `<span><span aria-hidden="true">${app._actionIcon(key)}</span> ${app._uiLabel(key)}</span>`).join('')}</div>`;
    },

    icon(key) {
        return {
            fight: '⚔️',
            flirt: '😘',
            feast: '🍽️',
            fuck: '🔥',
            feed: '🍲',
            flee: '🏃',
            search: '🔍',
            rest: '🏕️',
            setSafePlace: '🏠',
            inventory: '🎒',
            takeItems: '🎒',
            stats: '📊',
            quests: '📜',
            interact: '💋',
            inspect: '👁️',
            recruit: '💕',
            close: '',
            enter: '🚪',
            exit: '↩️',
            map: '🗺️',
            party: '👥',
            enemies: '⚔️'
        }[key] || '';
    }
};

if (typeof window !== 'undefined') {
    window.YAW_ACTION_UI = YAW_ACTION_UI;
}
