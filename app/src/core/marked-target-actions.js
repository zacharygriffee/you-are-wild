/**
 * YOU ARE WILD MARKED TARGET ACTIONS
 * Shared rendering for composer-owned marked-target intent controls.
 */

const YAW_MARKED_TARGET_ACTIONS = {
    render(app, source = 'sheet') {
        if (YAW_RECOVERY_MODES?.isJourney?.(app)) return '';
        const targets = app._getExplorationTargets();
        if (targets.length === 0 || app.combatState.active) return '';
        const actorState = app._selectedExplorationActorState();
        const actors = actorState.valid ? actorState.actors : [];
        const label = app._escapeHtml(app._t(targets.length === 1 ? 'target.count' : 'target.count_plural', { count: targets.length }));
        const primaryActor = actorState.valid ? (actors[0] || app.player) : null;
        const singleTarget = targets.length === 1 ? targets[0] : null;
        const singleCorpseTarget = singleTarget && !app.party.includes(singleTarget) && app._isCorpse(singleTarget)
            ? singleTarget
            : null;
        const singleCreatureTarget = singleTarget && !app.party.includes(singleTarget) && !app._isCorpse(singleTarget)
            ? singleTarget
            : null;
        const singlePanelTarget = singleCreatureTarget || singleCorpseTarget;
        const targetRef = singlePanelTarget ? app._explorationTargetUnitId('creature', singlePanelTarget) : '';
        const panelIntent = action => `App.selectIntent('creature','${app._escapeJsString(targetRef)}','${action}','composer-tray')`;
        const keys = ['fight', 'flirt', 'fuck', 'feast', 'feed'];
        const buttonEntries = singleCorpseTarget ? [] : keys.map(key => {
            const effectPreview = app._multiInteractionPreview?.(key, actors, targets) || null;
            const title = app._escapeHtml(`${app._uiLabel(key)} ${label}${effectPreview ? ` · ${effectPreview.text}` : ''}`);
            const intent = app._escapeHtml(key);
            const actionSource = ['desktop', 'desktop-target', 'composer-tray', 'panel-tray', 'mobile-target'].includes(source)
                ? 'composer-tray'
                : 'target-bar';
            const defaultSubAction = app.SUB_ACTIONS[key] ? app._getDefaultSubAction(key) : null;
            const safeSubAction = defaultSubAction ? String(defaultSubAction).replace(/'/g, "\\'") : '';
            const variantPresentation = String(source || '').startsWith('desktop') ? 'desktop' : '';
            const handler = ['feed', 'feast', 'fuck'].includes(key)
                ? `App.openExplorationSubActionSheet('${key}','${actionSource}','${variantPresentation}')`
                : defaultSubAction
                ? `App.resolveExplorationTargetAction('${key}','${safeSubAction}','${actionSource}')`
                : `App.resolveExplorationTargetAction('${key}',null,'${actionSource}')`;
            return {
                action: key,
                html: `<button class="action-btn" data-command-surface="target-intents" data-command-mode="exploration" data-command-intent="${intent}" data-command-grammar="actor-target-intent" data-command-slot="intent"${effectPreview ? ` data-multi-effect-percent="${effectPreview.minPercent === effectPreview.maxPercent ? effectPreview.minPercent : `${effectPreview.minPercent}-${effectPreview.maxPercent}`}" data-multi-target-count="${effectPreview.targetCount}"` : ''} title="${title}" aria-label="${title}" onclick="${handler}"><span class="action-icon" aria-hidden="true">${app._actionIcon(key)}</span><span class="action-caption">${app._uiLabel(key)}</span></button>`
            };
        });
        if (singleCorpseTarget) {
            const targetName = singleCorpseTarget.corpseName || singleCorpseTarget.name || app._label('disposition.remains', 'Remains');
            const corpseButton = (labelAction, dispatchAction = labelAction, icon = '', enabled = true, titleText = '') => {
                const title = app._escapeHtml(titleText || `${app._uiLabel(labelAction)} ${targetName}`);
                const caption = app._escapeHtml(app._uiLabel(labelAction));
                const intent = app._escapeHtml(dispatchAction);
                const iconHtml = icon ? `<span class="action-icon" aria-hidden="true">${icon}</span>` : `<span class="action-icon" aria-hidden="true">${app._actionIcon(labelAction)}</span>`;
                const disabled = enabled ? '' : ' disabled aria-disabled="true"';
                const handler = enabled ? ` onclick="${panelIntent(dispatchAction)}"` : '';
                return `<button class="action-btn contextual-utility${enabled ? '' : ' disabled'}" data-command-surface="target-intents" data-command-mode="exploration" data-command-intent="${intent}" data-command-grammar="actor-target-intent" data-command-slot="intent" title="${title}" aria-label="${title}"${disabled}${handler}>${iconHtml}<span class="action-caption">${caption}</span></button>`;
            };
            buttonEntries.push({ action: 'loot', html: corpseButton('loot', 'loot', '🎒') });
            const canScavenge = app._canScavengeCorpse(singleCorpseTarget);
            const scavengeStatus = app._corpseScavengeStatus(singleCorpseTarget);
            const scavengeTitle = canScavenge
                ? `${app._uiLabel('scavenge')} ${targetName} (${scavengeStatus})`
                : `${scavengeStatus} ${targetName}`;
            buttonEntries.push({ action: 'scavenge', html: corpseButton('scavenge', 'scavenge', '🍖', canScavenge, scavengeTitle) });
        }
        if (singleCreatureTarget) {
            const targetName = singleCreatureTarget.name || app._label('ui.creatures', 'Creatures');
            const utilityButton = (labelAction, dispatchAction = labelAction, icon = '') => {
                const title = app._escapeHtml(`${app._uiLabel(labelAction)} ${targetName}`);
                const caption = app._escapeHtml(app._uiLabel(labelAction));
                const intent = app._escapeHtml(dispatchAction);
                const iconHtml = icon ? `<span class="action-icon" aria-hidden="true">${icon}</span>` : `<span class="action-icon" aria-hidden="true">${app._actionIcon(labelAction)}</span>`;
                return `<button class="action-btn contextual-utility" data-command-surface="target-intents" data-command-mode="exploration" data-command-intent="${intent}" data-command-grammar="actor-target-intent" data-command-slot="intent" title="${title}" aria-label="${title}" onclick="${panelIntent(dispatchAction)}">${iconHtml}<span class="action-caption">${caption}</span></button>`;
            };
            buttonEntries.push({ action: 'inspect', html: utilityButton('inspect', 'inspect', '👁️') });
            const actor = primaryActor || app._getExplorationActor();
            if (app._canRecruit(actor, singleCreatureTarget)) {
                const action = singleCreatureTarget.droppedOffCompanion ? 'rejoin' : 'recruit';
                buttonEntries.push({ action, html: utilityButton(action, action, action === 'rejoin' ? '👥' : '💕') });
            }
            if (singleCreatureTarget.quest && app._isServiceAvailable(singleCreatureTarget)) {
                const questAction = singleCreatureTarget.questAccepted ? 'viewQuest' : 'acceptQuest';
                buttonEntries.push({ action: questAction, html: utilityButton(questAction, 'quest', '📜') });
            }
            if (singleCreatureTarget.disposition === app.DISPOSITION.MERCHANT && app._isServiceAvailable(singleCreatureTarget)) buttonEntries.push({ action: 'trade', html: utilityButton('trade', 'trade', '🪙') });
        }
        const buttonHtml = app._sortActionEntries(buttonEntries).map(entry => entry.html).join('');
        const clearLabel = app._escapeHtml(app._t('target.clear'));
        const clearTitle = app._escapeHtml(app._t('target.clearSelected'));
        const controlsLabel = app._escapeHtml(app._label('target.intentControls', 'Target intent controls'));
        const actorCount = app._escapeHtml(String(actors.length));
        const targetCount = app._escapeHtml(String(targets.length));
        const multiPreview = app._multiInteractionPreview?.('fight', actors, targets) || null;
        const previewHtml = multiPreview
            ? `<div class="multi-effect-preview" role="status" data-command-preview="multi-effect" data-multi-effect-percent="${multiPreview.minPercent === multiPreview.maxPercent ? multiPreview.minPercent : `${multiPreview.minPercent}-${multiPreview.maxPercent}`}">${app._escapeHtml(multiPreview.text)}</div>`
            : '';
        const clearButton = `<button class="action-btn" data-command-surface="target-intents" data-command-mode="exploration" data-command-control="clear-targets" data-command-slot="exit" title="${clearTitle}" aria-label="${clearTitle}" onclick="App.clearExplorationTargets()">${clearLabel}</button>`;
        const actionRow = `<div class="target-action-row" data-command-surface="target-intents" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-actor-count="${actorCount}" data-command-target-count="${targetCount}" aria-label="${controlsLabel}">${clearButton}${buttonHtml}</div>`;
        return source === 'composer-tray' || source === 'panel-tray'
            ? `<div class="panel-interaction-tray adventure-interaction-tray" data-command-surface="target-intents" data-command-mode="exploration" data-command-grammar="actor-target-intent" data-command-actor-count="${actorCount}" data-command-target-count="${targetCount}">${previewHtml}${actionRow}</div>`
            : `${previewHtml}${actionRow}`;
    },

    openSubActionSheet(app, action, source = 'target-bar', presentation = '') {
        const targets = app._getExplorationTargets();
        if (!app.SUB_ACTIONS[action]) return targets.length > 0 ? app.resolveExplorationTargetAction(action, null, source) : false;
        const actors = app._getExplorationActors();
        const groups = [];
        const selfResolution = YAW_SUB_ACTIONS.resolve(app, action, { actors, scope: 'self', mode: 'adventure' });
        if (selfResolution.variants.length > 0) {
            groups.push({
                scope: 'self',
                label: app._label('variant.scope.self', 'Self'),
                selectCall: `App.resolveExplorationSelfSubAction('${app._escapeJsString(action)}','{id}','${app._escapeJsString(source || 'actor-belt')}')`
            });
        }
        if (targets.length > 0) {
            groups.push({
                scope: 'target',
                label: app._label('variant.scope.targets', 'Targets'),
                selectCall: `App.resolveExplorationTargetAction('${app._escapeJsString(action)}','{id}','${app._escapeJsString(source || 'target-bar')}')`
            });
        }
        if (groups.length === 0) return false;
        const commandSource = String(source || 'target-bar').replace(/'/g, "\\'");
        const targetLabel = targets.length > 0
            ? app._t(targets.length === 1 ? 'target.count' : 'target.count_plural', { count: targets.length })
            : '';
        const title = `${app._uiLabel(action)} ${targetLabel}`.trim();
        return YAW_INTENT_MENU.openVariantSheet(app, {
            action,
            actors,
            targets,
            groups,
            source,
            presentation: presentation || undefined,
            title,
            selectCall: `App.resolveExplorationTargetAction('${action}','{id}','${commandSource}')`
        });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MARKED_TARGET_ACTIONS = YAW_MARKED_TARGET_ACTIONS;
}
