/**
 * YOU ARE WILD ACTION UI
 * Shared button, icon, and legend helpers for panel and center action surfaces.
 */

const YAW_ACTION_UI = {
    iconButton(app, key, icon, onclick, extraClass = '', attrs = '') {
        const label = app._uiLabel(key);
        const preview = app._multiInteractionCurrentPreview?.(key) || null;
        const baseTitle = app._actionCostTitle ? app._actionCostTitle(key, label) : label;
        const titleLabel = preview ? `${baseTitle} · ${preview.text}` : baseTitle;
        const className = `action-btn${extraClass ? ' ' + extraClass : ''}`;
        const previewAttrs = preview
            ? `data-multi-effect-percent="${preview.minPercent === preview.maxPercent ? preview.minPercent : `${preview.minPercent}-${preview.maxPercent}`}" data-multi-target-count="${preview.targetCount}"`
            : '';
        const combinedAttrs = [attrs, previewAttrs].filter(Boolean).join(' ');
        const attrText = combinedAttrs ? ` ${combinedAttrs}` : '';
        return `<button class="${className}"${attrText} title="${app._escapeHtml(titleLabel)}" aria-label="${app._escapeHtml(titleLabel)}" onclick="${onclick}"><span class="action-icon" aria-hidden="true">${icon}</span><span class="action-caption">${label}</span></button>`;
    },

    combatIntentButton(app, key, actor, extraClass = '') {
        const actorId = actor ? app._unitSelectionId(actor) : '';
        const isSelected = app.targetSelection?.source === 'combat'
            && app.targetSelection.action === key
            && (!app.targetSelection.actorId || app.targetSelection.actorId === actorId || app.targetSelection.actorId === actor?.id || app.targetSelection.actorId === actor?.name);
        const isPlanned = app._combatPendingIntent?.() === key;
        const classes = [extraClass, (isSelected || isPlanned) ? 'selected' : ''].filter(Boolean).join(' ');
        const intent = app._escapeHtml(key);
        return app._iconActionButton(key, app._actionIcon(key), `event.stopPropagation();App.executeCombatIntent('${key}')`, classes, `data-command-surface="combat-intents" data-command-mode="combat" data-command-intent="${intent}" data-command-grammar="actor-target-intent" data-command-slot="intent"`);
    },

    legend(app, keys) {
        if (keys.length <= 1) return '';
        return `<div class="action-legend" aria-label="${app._escapeHtml(app._label('ui.actionLegend', 'Action legend'))}">${keys.map(key => `<span><span aria-hidden="true">${app._actionIcon(key)}</span> ${app._uiLabel(key)}</span>`).join('')}</div>`;
    },

    priority(key) {
        const order = {
            rejoin: 5,
            recruit: 10,
            quest: 20,
            acceptQuest: 20,
            viewQuest: 20,
            turnInQuest: 20,
            trade: 30,
            loot: 40,
            scavenge: 50,
            inspect: 60,
            fight: 100,
            flirt: 110,
            fuck: 120,
            feast: 130,
            feed: 140
        };
        return order[key] ?? 1000;
    },

    sortActionEntries(entries) {
        return (entries || [])
            .map((entry, index) => ({ ...entry, index }))
            .sort((a, b) => (this.priority(a.action) - this.priority(b.action)) || (a.index - b.index))
            .map(({ index, ...entry }) => entry);
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
            rejoin: '👥',
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
