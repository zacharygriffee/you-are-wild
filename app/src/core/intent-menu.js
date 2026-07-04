/**
 * YOU ARE WILD INTENT MENU HELPERS
 * Shared action menu and sub-action sheet rendering.
 */

const YAW_INTENT_MENU = {
    surface(source = 'sheet', presentation = 'sheet') {
        const normalizedSource = String(source || 'sheet');
        const isDesktop = normalizedSource === 'desktop' || normalizedSource.startsWith('desktop-') || presentation === 'desktop';
        const presentationName = isDesktop ? 'desktop' : (presentation === 'radial' ? 'radial' : 'sheet');
        return {
            id: isDesktop ? 'desktop-intent-menu' : 'mobile-context-menu',
            rootClass: `${isDesktop ? 'desktop-intent-menu' : 'mobile-context-menu'} intent-menu intent-menu-${presentationName}`,
            titleClass: isDesktop ? 'desktop-intent-menu-title' : 'mobile-context-menu-title',
            actionsClass: isDesktop ? 'desktop-intent-menu-actions' : 'mobile-context-menu-actions',
            titleId: isDesktop ? 'desktop-intent-menu-title' : 'mobile-context-menu-title',
            presentation: presentationName
        };
    },

    show(app, type, targetRef, source = 'sheet', presentation = 'sheet') {
        const isParty = type === 'party';
        const target = app._intentTarget(type, targetRef);
        if (!target) return;
        const isCorpse = app._isCorpse(target);
        app.closeIntentMenu();
        if (!isCorpse) return false;
        const targetName = target.name || (isParty ? 'party member' : 'creature');
        const menuLabel = app._label(isParty ? 'ui.partyActions' : 'ui.creatureActions', isParty ? 'Party actions' : 'Creature actions');
        const targetLabel = app._escapeHtml(targetName);
        const targetArg = isParty ? Number(targetRef) : `'${String(targetRef).replace(/'/g, "\\'")}'`;
        const commandSource = String(source || 'sheet').replace(/'/g, "\\'");
        const surface = this.surface(source, presentation);
        const actionButton = (key, action = key, extraClass = '') => {
            const label = key === 'close' ? app._label('ui.close', 'Close') : app._uiLabel(key);
            const icon = app._actionIcon(key);
            const title = key === 'close' ? label : `${label} ${targetName}`;
            const handler = action === 'close'
                ? 'App.closeIntentMenu()'
                : `App.selectIntent('${type}',${targetArg},'${action}','${commandSource}')`;
            return `<button class="action-btn intent-menu-item${extraClass}" role="menuitem" title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}" onclick="${handler}">${icon ? icon + ' ' : ''}${app._escapeHtml(label)}</button>`;
        };
        let html = `<div class="${surface.rootClass}" id="${surface.id}" role="dialog" aria-modal="true" aria-label="${app._escapeHtml(menuLabel)}" aria-labelledby="${surface.titleId}" data-intent-presentation="${surface.presentation}"><div class="${surface.titleClass}" id="${surface.titleId}">${target.icon || ''} ${targetLabel}</div><div class="${surface.actionsClass}" role="menu">`;
        html += actionButton('loot');
        html += actionButton('scavenge');
        html += actionButton('inspect');
        html += actionButton('close', 'close');
        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
        const menu = document.getElementById(surface.id);
        app._activateFocusTrap(menu, { close: () => app.closeIntentMenu() });
        app._activateOutsideContextDismiss(menu);
    },

    openSubActionSheet(app, type, targetRef, action, source = 'sheet') {
        const target = app._intentTarget(type, targetRef);
        if (!target || app._isCorpse(target) || !app.SUB_ACTIONS[action]) {
            return app.selectIntent(type, targetRef, action, source);
        }
        app.closeIntentMenu();
        const isParty = type === 'party';
        const actor = app._getExplorationActor();
        const subActions = app._getAvailableSubActions(action, actor, target);
        const targetArg = isParty ? Number(targetRef) : `'${String(targetRef).replace(/'/g, "\\'")}'`;
        const commandSource = String(source || 'sheet').replace(/'/g, "\\'");
        const sourcePresentation = String(source || 'sheet') === 'radial' ? 'radial' : undefined;
        const surface = this.surface(source, sourcePresentation);
        const title = `${app._uiLabel(action)} ${target.name || ''}`.trim();
        const defaultSub = app._getDefaultSubAction(action);
        const defaultLabel = app._getActionLabel(action, defaultSub);
        let html = `<div class="${surface.rootClass}" id="${surface.id}" role="dialog" aria-modal="true" aria-label="${app._escapeHtml(title)}" aria-labelledby="${surface.titleId}" data-intent-presentation="${surface.presentation}"><div class="${surface.titleClass}" id="${surface.titleId}">${app._actionIcon(action)} ${app._escapeHtml(title)}</div><div class="${surface.actionsClass}" role="menu">`;
        html += `<button class="action-btn primary" role="menuitem" title="${app._escapeHtml(defaultLabel)}" aria-label="${app._escapeHtml(defaultLabel)}" onclick="App.selectIntent('${type}',${targetArg},'${action}','${commandSource}','${defaultSub.replace(/'/g, "\\'")}')">${app._escapeHtml(defaultLabel)}</button>`;
        subActions.filter(sub => sub.id !== defaultSub).forEach(sub => {
            const label = app._escapeHtml(sub.label);
            const disabled = sub.available ? '' : ' disabled';
            const settingHint = sub.available || !sub.setting ? '' : ` (${sub.setting})`;
            html += `<button class="action-btn" role="menuitem" title="${label}${app._escapeHtml(settingHint)}" aria-label="${label}${app._escapeHtml(settingHint)}"${disabled} onclick="App.selectIntent('${type}',${targetArg},'${action}','${commandSource}','${String(sub.id).replace(/'/g, "\\'")}')">${sub.icon || ''} ${label}</button>`;
        });
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        html += `<button class="action-btn" role="menuitem" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeIntentMenu()">${closeLabel}</button>`;
        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
        const menu = document.getElementById(surface.id);
        app._activateFocusTrap(menu, { close: () => app.closeIntentMenu() });
        app._activateOutsideContextDismiss(menu);
    },

    close(app) {
        const menu = document.getElementById('mobile-context-menu');
        if (menu) menu.remove();
        const desktopMenu = document.getElementById('desktop-intent-menu');
        if (desktopMenu) desktopMenu.remove();
        app._restoreFocusTrap();
    }
};

window.YAW_INTENT_MENU = YAW_INTENT_MENU;
