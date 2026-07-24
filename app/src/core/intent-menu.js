/**
 * YOU ARE WILD INTENT MENU HELPERS
 * Shared action menu and sub-action sheet rendering.
 */

const YAW_INTENT_MENU = {
    setUnderlyingInert(enabled) {
        const appShell = typeof document !== 'undefined' ? document.getElementById('app') : null;
        if (!appShell) return;
        if (enabled) {
            if (!appShell.hasAttribute('data-intent-prior-inert')) {
                appShell.setAttribute('data-intent-prior-inert', appShell.hasAttribute('inert') ? 'true' : 'false');
                appShell.setAttribute('data-intent-prior-aria-hidden', appShell.getAttribute('aria-hidden') ?? '');
            }
            appShell.setAttribute('inert', '');
            appShell.setAttribute('aria-hidden', 'true');
            return;
        }
        const priorInert = appShell.getAttribute('data-intent-prior-inert');
        const priorAriaHidden = appShell.getAttribute('data-intent-prior-aria-hidden');
        if (priorInert === 'false') appShell.removeAttribute('inert');
        else if (priorInert === 'true') appShell.setAttribute('inert', '');
        if (priorAriaHidden === '') appShell.removeAttribute('aria-hidden');
        else if (priorAriaHidden != null) appShell.setAttribute('aria-hidden', priorAriaHidden);
        appShell.removeAttribute('data-intent-prior-inert');
        appShell.removeAttribute('data-intent-prior-aria-hidden');
    },

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

    variantOptionsHtml(app, resolution, context = {}) {
        const action = resolution.action;
        const defaultId = context.defaultId || (action === 'fight' ? 'basic' : app._getDefaultSubAction(action));
        const ordered = [...resolution.variants].sort((left, right) => (left.id === defaultId ? -1 : (right.id === defaultId ? 1 : 0)));
        return ordered.map((variant, index) => {
            const label = app._escapeHtml(variant.label);
            const reasonId = `variant-reason-${app._escapeHtml(context.reasonPrefix || resolution.scope || 'target')}-${app._escapeHtml(action)}-${app._escapeHtml(variant.id)}-${index}`;
            const reason = variant.reason || (variant.status === 'partial'
                ? app._label('variant.partial', 'Available for {valid} of {total} actor-target pairs.', { valid: variant.validPairCount, total: variant.pairCount })
                : '');
            const details = [
                reason,
                !reason && variant.hint ? variant.hint : '',
                variant.pairCount <= 1 && variant.cost?.label ? app._label('variant.cost', 'Cost: {cost}.', { cost: variant.cost.label }) : '',
                ...(!reason && (variant.requirements || []).length
                    ? [app._label('variant.requirements', 'Requirements: {requirements}.', { requirements: variant.requirements.join(', ') })]
                    : [])
            ].filter(Boolean).join(' ');
            const showPairPreview = variant.pairCount > 1 && Array.isArray(variant.pairPreviews) && variant.pairPreviews.length > 0;
            const pairPreviewId = `${reasonId}-pairs`;
            const pairPreviewItems = showPairPreview
                ? variant.pairPreviews.map(pair => `<li data-variant-pair-status="${pair.available ? 'available' : 'unavailable'}"${pair.outlook ? ` data-attempt-outlook="${app._escapeHtml(pair.outlook)}"` : ''}>${app._escapeHtml(pair.label)}</li>`).join('')
                : '';
            const pairOverflow = showPairPreview && variant.pairPreviewOverflow > 0
                ? `<li class="action-variant-pair-overflow">${app._escapeHtml(app._label('variant.pair.overflow', '{count} more pairs not shown.', { count: variant.pairPreviewOverflow }))}</li>`
                : '';
            const actorCostItems = showPairPreview
                ? (variant.actorCosts || [])
                    .filter(item => item.cost)
                    .map(item => app._label('variant.actorCost', '{actor}: {cost}', { actor: item.actorName, cost: item.cost }))
                : [];
            const actorCostSummary = actorCostItems.length
                ? `<div class="action-variant-actor-costs">${app._escapeHtml(app._label('variant.actorCosts', 'Actor costs: {costs}.', { costs: actorCostItems.join('; ') }))}</div>`
                : '';
            const pairPreviewHtml = showPairPreview
                ? `<div class="action-variant-pair-preview" id="${pairPreviewId}" data-variant-pair-count="${variant.pairCount}"><div class="action-variant-pair-heading">${app._escapeHtml(app._label('variant.pair.heading', 'Pair preview'))}</div><ul>${pairPreviewItems}${pairOverflow}</ul>${actorCostSummary}</div>`
                : '';
            const safeId = app._escapeJsString(variant.id);
            const selectCall = String(context.selectCall || '').replace(/\{id\}/g, safeId);
            const disabled = variant.available ? '' : ' disabled aria-disabled="true"';
            const describedByIds = [details ? reasonId : '', showPairPreview ? pairPreviewId : ''].filter(Boolean);
            const describedBy = describedByIds.length ? ` aria-describedby="${describedByIds.join(' ')}"` : '';
            const primary = variant.id === defaultId ? ' primary' : '';
            return `<div class="action-variant-option${variant.available ? '' : ' unavailable'}" data-variant-status="${app._escapeHtml(variant.status)}"${variant.outlook ? ` data-attempt-outlook="${app._escapeHtml(variant.outlook)}"` : ''}><button class="action-btn${primary}" role="menuitem" data-command-surface="action-variant-options" data-command-mode="${app._escapeHtml(context.mode || 'exploration')}" data-command-intent="${app._escapeHtml(`${action}:${variant.id}`)}" data-command-grammar="actor-target-intent" data-command-slot="intent" title="${app._escapeHtml(details ? `${variant.label}. ${details}` : variant.label)}" aria-label="${app._escapeHtml(details ? `${variant.label}. ${variant.hint || ''}`.trim() : variant.label)}"${describedBy}${disabled}${variant.available ? ` onclick="${selectCall}"` : ''}>${app._escapeHtml(variant.icon || '')} ${label}</button>${details ? `<span class="action-variant-reason" id="${reasonId}">${app._escapeHtml(details)}</span>` : ''}${pairPreviewHtml}</div>`;
        }).join('');
    },

    openVariantSheet(app, context = {}) {
        const action = context.action;
        const actors = (context.actors || []).filter(Boolean);
        const targets = (context.targets || []).filter(Boolean);
        const groupContexts = Array.isArray(context.groups) && context.groups.length > 0
            ? context.groups
            : [{ scope: context.scope || 'target', selectCall: context.selectCall || '' }];
        const resolveVariants = action === 'fight' && typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
            ? (scope => YAW_COMBAT_TECHNIQUES.resolve(app, {
                actors,
                targets,
                scope,
                mode: context.mode || 'exploration',
                preferred: context.preferred
            }))
            : (scope => YAW_SUB_ACTIONS.resolve(app, action, {
                actors,
                targets,
                scope,
                mode: context.mode || 'exploration',
                preferred: context.preferred
            }));
        const groups = groupContexts.map(group => ({
            ...group,
            resolution: resolveVariants(group.scope || 'target')
        })).filter(group => group.resolution.variants.length > 0);
        app.closeIntentMenu();
        const source = String(context.source || 'sheet');
        const surface = this.surface(source, context.presentation);
        const title = context.title || `${app._uiLabel(action)} ${targets[0]?.name || ''}`.trim();
        const options = groups.map(group => {
            const groupLabel = groups.length > 1 && group.label
                ? `<div class="action-variant-group-title" role="presentation">${app._escapeHtml(group.label)}</div>`
                : '';
            return `<div class="action-variant-group" data-command-scope="${app._escapeHtml(group.scope || 'target')}">${groupLabel}${this.variantOptionsHtml(app, group.resolution, {
                mode: context.mode || 'exploration',
                selectCall: group.selectCall || context.selectCall || '',
                reasonPrefix: group.scope || 'target'
            })}</div>`;
        }).join('');
        const backLabel = app._escapeHtml(app._label('ui.back', 'Back'));
        const descriptionId = `${surface.titleId}-description`;
        const description = app._escapeHtml(app._label('variant.dialogDescription', 'Choose a {action} option. Availability clues describe likely limits before the attempt.', {
            action: app._uiLabel(action)
        }));
        const cancelCall = context.cancelCall || 'App.closeIntentMenu()';
        const html = `<div class="${surface.rootClass}" id="${surface.id}" role="dialog" aria-modal="true" aria-labelledby="${surface.titleId}" aria-describedby="${descriptionId}" data-intent-presentation="${surface.presentation}" data-intent-source="${app._escapeHtml(source)}" data-command-surface="action-variant-options" data-command-mode="${app._escapeHtml(context.mode || 'exploration')}" data-command-grammar="actor-target-intent" data-command-intent="${app._escapeHtml(action)}"><div class="${surface.titleClass}" id="${surface.titleId}">${app._actionIcon(action)} ${app._escapeHtml(title)}</div><p class="action-variant-dialog-description" id="${descriptionId}">${description}</p><div class="${surface.actionsClass}" role="menu" data-command-surface="action-variant-options" data-command-mode="${app._escapeHtml(context.mode || 'exploration')}" data-command-grammar="actor-target-intent">${options}<button class="action-btn" role="menuitem" data-command-control="back-variant" data-command-slot="exit" title="${backLabel}" aria-label="${backLabel}" onclick="${cancelCall}">${backLabel}</button></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const menu = document.getElementById(surface.id);
        this.positionDesktopMenu(menu, context.anchorEvent, surface.presentation === 'desktop');
        const dismiss = typeof context.onDismiss === 'function'
            ? context.onDismiss
            : () => app.closeIntentMenu();
        this.setUnderlyingInert(true);
        app._activateFocusTrap(menu, { close: dismiss });
        if (context.dismissOnOutside !== false) app._activateOutsideContextDismiss(menu);
        return groups.length === 1 ? groups[0].resolution : { action, actors, targets, groups };
    },

    openSubActionSheet(app, type, targetRef, action, source = 'sheet', anchorEvent = null) {
        const target = app._intentTarget(type, targetRef);
        if (!target || app._isCorpse(target) || !app.SUB_ACTIONS[action]) {
            return app.selectIntent(type, targetRef, action, source);
        }
        const isParty = type === 'party';
        const targetArg = isParty ? Number(targetRef) : `'${String(targetRef).replace(/'/g, "\\'")}'`;
        const commandSource = String(source || 'sheet').replace(/'/g, "\\'");
        const sourcePresentation = String(source || 'sheet') === 'radial' ? 'radial' : undefined;
        return this.openVariantSheet(app, {
            action,
            actors: app._getExplorationActors(),
            targets: [target],
            source,
            presentation: sourcePresentation,
            anchorEvent,
            title: `${app._uiLabel(action)} ${target.name || ''}`.trim(),
            selectCall: `App.selectIntent('${type}',${targetArg},'${action}','${commandSource}','{id}')`
        });
    },

    close(app) {
        const menu = document.getElementById('mobile-context-menu');
        if (menu) menu.remove();
        const desktopMenu = document.getElementById('desktop-intent-menu');
        if (desktopMenu) desktopMenu.remove();
        this.setUnderlyingInert(false);
        app._restoreFocusTrap();
    }
};

window.YAW_INTENT_MENU = YAW_INTENT_MENU;
