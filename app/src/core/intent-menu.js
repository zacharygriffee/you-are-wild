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

    desktopAnchorEvent(anchorEvent) {
        const anchor = anchorEvent?.currentTarget || anchorEvent?.target || (typeof document !== 'undefined' ? document.activeElement : null);
        if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return null;
        const rect = anchor.getBoundingClientRect();
        if (!rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return null;
        return rect;
    },

    positionDesktopMenu(menu, anchorEvent, isDesktop = false) {
        if (!menu || !isDesktop) return;
        const rect = this.desktopAnchorEvent(anchorEvent);
        if (!rect) return;
        const viewportWidth = Math.max(320, window.innerWidth || document.documentElement?.clientWidth || 1024);
        const viewportHeight = Math.max(320, window.innerHeight || document.documentElement?.clientHeight || 720);
        const width = Math.min(320, Math.max(260, viewportWidth - 36));
        const left = Math.max(18, Math.min(rect.left, viewportWidth - width - 18));
        const top = Math.max(18, Math.min((rect.bottom || rect.top) + 6, viewportHeight - 112));
        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
        menu.style.right = 'auto';
        menu.style.width = `min(320px, calc(100vw - 36px))`;
        menu.setAttribute('data-intent-position', 'anchored');
        if (typeof menu.getBoundingClientRect === 'function') {
            const menuRect = menu.getBoundingClientRect();
            if (Number.isFinite(menuRect.bottom) && menuRect.bottom > viewportHeight - 18) {
                const clampedTop = Math.max(18, viewportHeight - (menuRect.height || 0) - 18);
                menu.style.top = `${Math.round(clampedTop)}px`;
            }
        }
    },

    show(app, type, targetRef, source = 'sheet', presentation = 'sheet', anchorEvent = null) {
        app.closeIntentMenu();
        return false;
    },

    openSubActionSheet(app, type, targetRef, action, source = 'sheet', anchorEvent = null) {
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
        let html = `<div class="${surface.rootClass}" id="${surface.id}" role="dialog" aria-modal="true" aria-label="${app._escapeHtml(title)}" aria-labelledby="${surface.titleId}" data-intent-presentation="${surface.presentation}" data-intent-source="${app._escapeHtml(commandSource)}" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-intent="${app._escapeHtml(action)}"><div class="${surface.titleClass}" id="${surface.titleId}">${app._actionIcon(action)} ${app._escapeHtml(title)}</div><div class="${surface.actionsClass}" role="menu" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-grammar="actor-target-intent">`;
        html += `<button class="action-btn primary" role="menuitem" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-intent="${app._escapeHtml(`${action}:${defaultSub}`)}" data-command-grammar="actor-target-intent" data-command-slot="intent" title="${app._escapeHtml(defaultLabel)}" aria-label="${app._escapeHtml(defaultLabel)}" onclick="App.selectIntent('${type}',${targetArg},'${action}','${commandSource}','${String(defaultSub).replace(/'/g, "\\'")}')">${app._escapeHtml(defaultLabel)}</button>`;
        subActions.filter(sub => sub.id !== defaultSub).forEach(sub => {
            const label = app._escapeHtml(sub.label);
            const disabled = sub.available ? '' : ' disabled';
            const settingHint = sub.available || !sub.setting ? '' : ` (${sub.setting})`;
            html += `<button class="action-btn" role="menuitem" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-intent="${app._escapeHtml(`${action}:${sub.id}`)}" data-command-grammar="actor-target-intent" data-command-slot="intent" title="${label}${app._escapeHtml(settingHint)}" aria-label="${label}${app._escapeHtml(settingHint)}"${disabled} onclick="App.selectIntent('${type}',${targetArg},'${action}','${commandSource}','${String(sub.id).replace(/'/g, "\\'")}')">${sub.icon || ''} ${label}</button>`;
        });
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        html += `<button class="action-btn" role="menuitem" data-command-surface="sub-action-options" data-command-mode="exploration" data-command-control="cancel-sub-action" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeIntentMenu()">${closeLabel}</button>`;
        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
        const menu = document.getElementById(surface.id);
        this.positionDesktopMenu(menu, anchorEvent, surface.presentation === 'desktop');
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
