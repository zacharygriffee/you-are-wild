/**
 * YOU ARE WILD MARKED TARGET ACTIONS
 * Shared rendering for composer-owned marked-target intent controls.
 */

const YAW_MARKED_TARGET_ACTIONS = {
    render(app, source = 'sheet') {
        const targets = app._getExplorationTargets();
        if (targets.length === 0 || app.combatState.active) return '';
        const actorState = app._selectedExplorationActorState();
        const actors = actorState.valid ? actorState.actors : [];
        const label = app._escapeHtml(app._t(targets.length === 1 ? 'target.count' : 'target.count_plural', { count: targets.length }));
        const primaryActor = actorState.valid ? (actors[0] || app.player) : null;
        const singleTarget = targets.length === 1 ? targets[0] : null;
        const singleCreatureTarget = singleTarget && !app.party.includes(singleTarget) && !app._isCorpse(singleTarget)
            ? singleTarget
            : null;
        const targetRef = singleCreatureTarget ? app._explorationTargetUnitId('creature', singleCreatureTarget) : '';
        const panelIntent = action => `App.selectIntent('creature','${app._escapeJsString(targetRef)}','${action}','panel-tray')`;
        const keys = ['fight', 'flirt', 'fuck', 'feast', 'feed'];
        const buttons = keys.map(key => {
            const title = app._escapeHtml(`${app._uiLabel(key)} ${label}`);
            const intent = app._escapeHtml(key);
            const actionSource = source === 'desktop' ? 'desktop-target' : (source === 'panel-tray' || source === 'mobile-target' ? 'panel-tray' : 'target-bar');
            const defaultSubAction = app.SUB_ACTIONS[key] ? app._getDefaultSubAction(key) : null;
            const safeSubAction = defaultSubAction ? String(defaultSubAction).replace(/'/g, "\\'") : '';
            const handler = defaultSubAction
                ? `App.resolveExplorationTargetAction('${key}','${safeSubAction}','${actionSource}')`
                : `App.resolveExplorationTargetAction('${key}',null,'${actionSource}')`;
            return `<button class="action-btn" data-command-surface="target-intents" data-command-mode="exploration" data-command-intent="${intent}" data-command-grammar="actor-target-intent" title="${title}" aria-label="${title}" onclick="${handler}"><span class="action-icon" aria-hidden="true">${app._actionIcon(key)}</span><span class="action-caption">${app._uiLabel(key)}</span></button>`;
        });
        if (singleCreatureTarget) {
            const targetName = singleCreatureTarget.name || app._label('ui.creatures', 'Creatures');
            const utilityButton = (labelAction, dispatchAction = labelAction, icon = '') => {
                const title = app._escapeHtml(`${app._uiLabel(labelAction)} ${targetName}`);
                const caption = app._escapeHtml(app._uiLabel(labelAction));
                const intent = app._escapeHtml(dispatchAction);
                const iconHtml = icon ? `<span class="action-icon" aria-hidden="true">${icon}</span>` : `<span class="action-icon" aria-hidden="true">${app._actionIcon(labelAction)}</span>`;
                return `<button class="action-btn contextual-utility" data-command-surface="target-intents" data-command-mode="exploration" data-command-intent="${intent}" data-command-grammar="actor-target-intent" title="${title}" aria-label="${title}" onclick="${panelIntent(dispatchAction)}">${iconHtml}<span class="action-caption">${caption}</span></button>`;
            };
            buttons.push(utilityButton('inspect', 'inspect', '👁️'));
            const actor = primaryActor || app._getExplorationActor();
            if (app._canRecruit(actor, singleCreatureTarget)) buttons.push(utilityButton('recruit', 'recruit', '💕'));
            if (singleCreatureTarget.quest) buttons.push(utilityButton(singleCreatureTarget.questAccepted ? 'viewQuest' : 'acceptQuest', 'quest', '📜'));
            if (singleCreatureTarget.disposition === app.DISPOSITION.MERCHANT) buttons.push(utilityButton('trade', 'trade', '🪙'));
        }
        const buttonHtml = buttons.join('');
        const clearLabel = app._escapeHtml(app._t('target.clear'));
        const clearTitle = app._escapeHtml(app._t('target.clearSelected'));
        const controlsLabel = app._escapeHtml(app._label('target.intentControls', 'Target intent controls'));
        const actionRow = `<div class="target-action-row" data-command-surface="target-intents" data-command-mode="exploration" data-command-grammar="actor-target-intent" aria-label="${controlsLabel}">${buttonHtml}<button class="action-btn" data-command-surface="target-intents" data-command-mode="exploration" data-command-control="clear-targets" title="${clearTitle}" aria-label="${clearTitle}" onclick="App.clearExplorationTargets()">${clearLabel}</button></div>`;
        return source === 'panel-tray'
            ? `<div class="panel-interaction-tray adventure-interaction-tray">${actionRow}</div>`
            : actionRow;
    },

    openSubActionSheet(app, action, source = 'target-bar') {
        const targets = app._getExplorationTargets();
        if (targets.length === 0 || !app.SUB_ACTIONS[action]) return app.resolveExplorationTargetAction(action, null, source);
        app.closeIntentMenu();
        const actor = app._getExplorationActor();
        const subActions = app._getAvailableSubActions(action, actor, targets[0]);
        const commandSource = String(source || 'target-bar').replace(/'/g, "\\'");
        const title = `${app._uiLabel(action)} ${app._t(targets.length === 1 ? 'target.count' : 'target.count_plural', { count: targets.length })}`.trim();
        const defaultSub = app._getDefaultSubAction(action);
        const defaultLabel = app._getActionLabel(action, defaultSub);
        const surface = app._intentMenuSurface(source);
        let html = `<div class="${surface.rootClass}" id="${surface.id}" role="dialog" aria-modal="true" aria-label="${app._escapeHtml(title)}" aria-labelledby="${surface.titleId}" data-intent-presentation="${surface.presentation}" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-intent="${app._escapeHtml(action)}"><div class="${surface.titleClass}" id="${surface.titleId}">${app._actionIcon(action)} ${app._escapeHtml(title)}</div><div class="${surface.actionsClass}" role="menu" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-grammar="actor-target-intent">`;
        html += `<button class="action-btn primary" role="menuitem" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-intent="${app._escapeHtml(`${action}:${defaultSub}`)}" data-command-grammar="actor-target-intent" title="${app._escapeHtml(defaultLabel)}" aria-label="${app._escapeHtml(defaultLabel)}" onclick="App.resolveExplorationTargetAction('${action}','${String(defaultSub).replace(/'/g, "\\'")}','${commandSource}')">${app._escapeHtml(defaultLabel)}</button>`;
        subActions.filter(sub => sub.id !== defaultSub).forEach(sub => {
            const label = app._escapeHtml(sub.label);
            const disabled = sub.available ? '' : ' disabled';
            const settingHint = sub.available || !sub.setting ? '' : ` (${sub.setting})`;
            html += `<button class="action-btn" role="menuitem" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-intent="${app._escapeHtml(`${action}:${sub.id}`)}" data-command-grammar="actor-target-intent" title="${label}${app._escapeHtml(settingHint)}" aria-label="${label}${app._escapeHtml(settingHint)}"${disabled} onclick="App.resolveExplorationTargetAction('${action}','${String(sub.id).replace(/'/g, "\\'")}','${commandSource}')">${sub.icon || ''} ${label}</button>`;
        });
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        html += `<button class="action-btn" role="menuitem" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-control="cancel-sub-action" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeIntentMenu()">${closeLabel}</button>`;
        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
        const menu = document.getElementById(surface.id);
        app._activateFocusTrap(menu, { close: () => app.closeIntentMenu() });
        app._activateOutsideContextDismiss(menu);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MARKED_TARGET_ACTIONS = YAW_MARKED_TARGET_ACTIONS;
}
