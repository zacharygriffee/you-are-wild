/**
 * YOU ARE WILD COMBAT SCENE HELPERS
 * Presentation helpers for the center combat summary.
 */

const YAW_COMBAT_SCENE = {
    actor(app, unit = null) {
        return unit || app._currentCombatActor() || app.activeActor || app.player;
    },

    turnTitle(app, unit = null) {
        const actor = this.actor(app, unit);
        return app._label('combat.turnTitle', "Round {round} - {actor}'s turn", {
            round: app.combatState?.round || 1,
            actor: actor?.name || app._label('ui.combat', 'Combat')
        });
    },

    turnDescription(app, unit = null) {
        const actor = this.actor(app, unit);
        const isPartyTurn = actor && (actor === app.player || app.party.includes(actor));
        return isPartyTurn
            ? app._label('ui.chooseAction', 'Choose your next action.')
            : app._label('ui.actorActing', '{name} is acting...', { name: actor?.name || app._label('ui.creatures', 'Creatures') });
    },

    recentExchangeEntries(app, limit = 3) {
        const entries = Array.isArray(app.log) ? app.log : [];
        return entries
            .filter(entry => entry && entry.type === 'combat' && entry.text && entry.phase !== 'start')
            .slice(-Math.max(1, limit));
    },

    pendingGroupEntries(app) {
        const syncActions = Array.isArray(app.combatState?.syncActions) ? app.combatState.syncActions : [];
        return syncActions
            .filter(sync => sync && !sync.resolved && sync.round === app.combatState?.round)
            .map(sync => {
                const participants = (sync.participants || []).map(unit => unit?.name).filter(Boolean).join(', ');
                const target = (sync.targets?.length ? sync.targets : [sync.target]).map(unit => unit?.name).filter(Boolean).join(', ') || app._label('ui.creatures', 'Creatures');
                const action = app._syncActionLabel ? app._syncActionLabel(sync.type) : app._uiLabel(String(sync.type || '').replace(/^sync_/, ''));
                const order = (sync.resolveAtIndex ?? 0) + 1;
                return {
                    action,
                    participants,
                    target,
                    order,
                    text: app._label('combat.exchange.pendingGroup', '{participants} prepare {action} against {target}. Resolves at turn {order}.', {
                        participants: participants || app._label('combat.group', 'Group'),
                        action,
                        target,
                        order
                    })
                };
            });
    },

    selectedIntentEntry(app, actor = null) {
        if (!app.targetSelection || app.targetSelection.source !== 'combat') return null;
        const currentActor = actor || this.actor(app);
        const actorId = currentActor ? app._unitSelectionId(currentActor) : '';
        const selectionActorId = app.targetSelection.actorId;
        if (selectionActorId && actorId && selectionActorId !== actorId && selectionActorId !== currentActor?.id && selectionActorId !== currentActor?.name) return null;
        const action = app.targetSelection.action || 'action';
        const actionLabel = app._combatActionLabel?.(action) || app._uiLabel(action);
        const actorName = currentActor?.name || app._label('ui.combat', 'Combat');
        return {
            action,
            actionLabel,
            actorName,
            text: app._label('combat.exchange.selectedIntent', '{actor} selected {action}.', {
                actor: actorName,
                action: actionLabel
            })
        };
    },

    turnOrderEntry(app, unit = null) {
        const actor = this.actor(app, unit);
        const queue = Array.isArray(app.combatState?.turnQueue) ? app.combatState.turnQueue : [];
        const currentIndex = Math.min(Math.max(0, app.combatState?.currentTurn ?? 0), Math.max(0, queue.length - 1));
        const isAvailable = candidate => candidate && candidate.CPun > 0 && !candidate.knockedOut && !candidate.fledCombat;
        let nextActor = null;
        for (let offset = 1; offset < queue.length; offset++) {
            const candidate = queue[(currentIndex + offset) % queue.length]?.unit || null;
            if (candidate && candidate !== actor && isAvailable(candidate)) {
                nextActor = candidate;
                break;
            }
        }
        return {
            current: actor,
            next: nextActor,
            currentName: actor?.name || app._label('ui.combat', 'Combat'),
            nextName: nextActor?.name || app._label('combat.exchange.noNextActor', 'None')
        };
    },

    latestStoryHtml(app, { mobile = false } = {}) {
        const latest = app.latestStoryEvent || (app.storyEvents || [])[app.storyEvents?.length - 1] || null;
        const storyHtml = typeof YAW_STORY_EVENTS !== 'undefined'
            ? YAW_STORY_EVENTS.compactHtml(app, latest)
            : `<span class="story-empty">${app._escapeHtml(app._label('scene.empty', 'Scene beats will appear here after interactions.'))}</span>`;
        const attrs = typeof YAW_STORY_EVENTS !== 'undefined'
            ? YAW_STORY_EVENTS.latestAttributes(app, latest)
            : {
                id: '',
                importance: latest?.importance || 'empty',
                result: latest?.resultKind || 'empty',
                hasBeat: latest ? 'true' : 'false',
                label: latest?.summary || app._label('scene.empty', 'Scene beats will appear here after interactions.')
            };
        const attrHtml = `data-scene-beat-id="${app._escapeHtml(attrs.id)}" data-scene-importance="${app._escapeHtml(attrs.importance)}" data-scene-result="${app._escapeHtml(attrs.result)}" data-has-scene-beat="${app._escapeHtml(attrs.hasBeat)}" aria-label="${app._escapeHtml(attrs.label)}"`;
        const latestClass = mobile ? 'mobile-combat-story-latest' : 'desktop-combat-story-latest';
        const expandClass = mobile ? 'mobile-story-expand-btn' : 'desktop-story-expand-btn';
        const sceneLabel = app._escapeHtml(app._label('scene.kicker', 'Scene'));
        const openFeedLabel = app._escapeHtml(app._label('scene.openFeed', 'Open scene feed'));
        const feedLabel = app._escapeHtml(app._label('scene.feedButton', 'Feed'));
        return `<div class="combat-story-strip ${mobile ? 'mobile-combat-story-strip' : 'desktop-combat-story-strip'}" data-surface-role="scene-feed" aria-live="polite">`
            + `<div class="desktop-story-copy"><span class="desktop-story-kicker">${sceneLabel}</span><div class="story-latest ${latestClass}${latest ? ' scene-beat-highlight' : ''}" data-surface-role="scene-feed-latest" ${attrHtml}>${storyHtml}</div></div>`
            + `<button class="nav-btn ${expandClass}" data-command-surface="story-controls" data-command-mode="story" data-command-control="open-story-sheet" data-story-count="${app._escapeHtml(String((app.storyEvents || []).length))}" title="${openFeedLabel}" aria-label="${openFeedLabel}">${feedLabel}</button>`
            + `</div>`;
    },

    sceneHtml(app, unit = null) {
        const actor = this.actor(app, unit);
        const turn = (app.combatState?.currentTurn ?? 0) + 1;
        const total = Math.max(1, app.combatState?.turnQueue?.length || 1);
        const status = app._label('mobile.combat.status', 'Round {round} - Turn {turn}/{total}', {
            round: app.combatState?.round || 1,
            turn,
            total
        });
        const description = this.turnDescription(app, actor);
        const pendingGroups = this.pendingGroupEntries(app);
        const selectedIntent = this.selectedIntentEntry(app, actor);
        const companionIntentPreview = app.combatState?.companionIntentPreview || null;
        const turnOrder = this.turnOrderEntry(app, actor);
        const turnOrderLabel = app._label('combat.exchange.turnOrder', 'Turn order');
        const selectedIntentHtml = selectedIntent
            ? `<div class="combat-selected-intent" aria-label="${app._escapeHtml(app._label('combat.exchange.selectedTitle', 'Selected intent'))}"><div class="combat-exchange-title">${app._escapeHtml(app._label('combat.exchange.selectedTitle', 'Selected intent'))}</div><span class="combat-exchange-actor">${app._escapeHtml(selectedIntent.actorName)}</span><span class="combat-exchange-intent">${app._escapeHtml(selectedIntent.actionLabel)}</span><span class="combat-exchange-text">${app._escapeHtml(selectedIntent.text)}</span></div>`
            : '';
        const pendingHtml = pendingGroups.length
            ? `<div class="combat-pending-groups" aria-label="${app._escapeHtml(app._label('combat.exchange.pendingTitle', 'Queued groups'))}"><div class="combat-exchange-title">${app._escapeHtml(app._label('combat.exchange.pendingTitle', 'Queued groups'))}</div>${pendingGroups.map(entry => `<div class="combat-pending-group"><span class="combat-exchange-intent">${app._escapeHtml(entry.action)}</span><span class="combat-exchange-text">${app._escapeHtml(entry.text)}</span></div>`).join('')}</div>`
            : '';
        const companionIntentHtml = companionIntentPreview
            ? `<div class="combat-intent-preview desktop-combat-intent-preview" data-command-preview="companion-intent"><div class="combat-intent-announcement" role="status" aria-live="polite"><div class="combat-exchange-title">${app._escapeHtml(app._label('combat.agency.intentTitle', 'Companion intent'))}</div><strong>${app._escapeHtml(companionIntentPreview.text)}</strong><span>${app._escapeHtml(companionIntentPreview.reason)}</span><small>${app._escapeHtml(app._label('combat.agency.intentUncommitted', 'Preview only — no action has committed yet.'))}</small></div>${YAW_COMPANION_BEHAVIOR.interventionControls(app)}</div>`
            : '';
        return `<section class="combat-scene-summary" aria-label="${app._escapeHtml(app._label('combat.exchange.summary', 'Combat summary'))}">`
            + `<div class="combat-current-turn"><span>${app._escapeHtml(status)}</span><strong>${app._escapeHtml(actor?.name || app._label('ui.combat', 'Combat'))}</strong></div>`
            + `<div class="combat-turn-order" aria-label="${app._escapeHtml(turnOrderLabel)}"><div class="combat-exchange-title">${app._escapeHtml(turnOrderLabel)}</div><div class="combat-turn-order-row"><span>${app._escapeHtml(app._label('combat.exchange.currentActor', 'Current'))}</span><strong>${app._escapeHtml(turnOrder.currentName)}</strong></div><div class="combat-turn-order-row"><span>${app._escapeHtml(app._label('combat.exchange.nextActor', 'Next'))}</span><strong>${app._escapeHtml(turnOrder.nextName)}</strong></div></div>`
            + `<p>${app._escapeHtml(description)}</p>`
            + companionIntentHtml
            + selectedIntentHtml
            + pendingHtml
            + `</section>`;
    },

    mobileContextHtml(app, unit = null) {
        const actor = this.actor(app, unit);
        const turn = (app.combatState?.currentTurn ?? 0) + 1;
        const total = Math.max(1, app.combatState?.turnQueue?.length || 1);
        const status = app._label('mobile.combat.status', 'Round {round} · Turn {turn}/{total}', {
            round: app.combatState?.round || 1,
            turn,
            total
        });
        const turnOrder = this.turnOrderEntry(app, actor);
        const text = this.turnDescription(app, actor);
        const next = app._label('combat.exchange.nextActor', 'Next') + ': ' + turnOrder.nextName;
        return `<div class="mobile-combat-context-strip" aria-label="${app._escapeHtml(app._label('combat.exchange.summary', 'Combat summary'))}">`
            + `<div class="mobile-combat-context-meta"><strong>${app._escapeHtml(actor?.name || app._label('ui.combat', 'Combat'))}</strong><span>${app._escapeHtml(status)}</span></div>`
            + `<div class="mobile-combat-context-text"><span>${app._escapeHtml(text)}</span><span>${app._escapeHtml(next)}</span></div>`
            + `</div>`;
    },

    renderForTurn(app, unit = null) {
        if (!app.combatState?.active) return false;
        YAW_CENTER_CONTEXT.clearPresence();
        const title = this.turnTitle(app, unit);
        const html = this.sceneHtml(app, unit);
        const mobileHtml = this.mobileContextHtml(app, unit);
        const textDescription = this.turnDescription(app, unit);
        const titleEl = document.getElementById('scene-title');
        const descEl = document.getElementById('scene-description');
        const mobileTitle = document.getElementById('mobile-scene-title');
        const mobileDesc = document.getElementById('mobile-scene-description');
        const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.innerHTML = html;
        if (mobileTitle) mobileTitle.textContent = app._label('ui.combat', 'Combat');
        if (mobileDesc) mobileDesc.innerHTML = mobileHtml;
        if (mobileSheet) mobileSheet.classList.remove('rich-content');
        app.renderTileEvents();
        app.renderStoryEvents?.();
        app.renderDesktopPlaySurface?.();
        return textDescription;
    }
};

window.YAW_COMBAT_SCENE = YAW_COMBAT_SCENE;
