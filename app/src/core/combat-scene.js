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
        return `Round ${app.combatState?.round || 1} - ${actor?.name || app._label('ui.combat', 'Combat')}'s turn`;
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
                const target = sync.target?.name || app._label('ui.creatures', 'Creatures');
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
        const actionLabel = app._uiLabel(action);
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
            : `<span class="story-empty">${app._escapeHtml(app._label('story.empty', 'Story beats will appear here after interactions.'))}</span>`;
        const latestClass = mobile ? 'mobile-combat-story-latest' : 'desktop-combat-story-latest';
        const expandClass = mobile ? 'mobile-story-expand-btn' : 'desktop-story-expand-btn';
        return `<div class="combat-story-strip ${mobile ? 'mobile-combat-story-strip' : 'desktop-combat-story-strip'}" data-surface-role="story" aria-live="polite">`
            + `<div class="desktop-story-copy"><span class="desktop-story-kicker">Story</span><div class="story-latest ${latestClass}" data-surface-role="story-latest">${storyHtml}</div></div>`
            + `<button class="nav-btn ${expandClass}" data-command-surface="story-controls" data-command-mode="story" data-command-control="open-story-sheet" data-story-count="${app._escapeHtml(String((app.storyEvents || []).length))}" title="Open story" aria-label="Open story">Expand</button>`
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
        const recent = this.recentExchangeEntries(app, 3);
        const pendingGroups = this.pendingGroupEntries(app);
        const selectedIntent = this.selectedIntentEntry(app, actor);
        const turnOrder = this.turnOrderEntry(app, actor);
        const turnOrderLabel = app._label('combat.exchange.turnOrder', 'Turn order');
        const selectedIntentHtml = selectedIntent
            ? `<div class="combat-selected-intent" aria-label="${app._escapeHtml(app._label('combat.exchange.selectedTitle', 'Selected intent'))}"><div class="combat-exchange-title">${app._escapeHtml(app._label('combat.exchange.selectedTitle', 'Selected intent'))}</div><span class="combat-exchange-actor">${app._escapeHtml(selectedIntent.actorName)}</span><span class="combat-exchange-intent">${app._escapeHtml(selectedIntent.actionLabel)}</span><span class="combat-exchange-text">${app._escapeHtml(selectedIntent.text)}</span></div>`
            : '';
        const pendingHtml = pendingGroups.length
            ? `<div class="combat-pending-groups" aria-label="${app._escapeHtml(app._label('combat.exchange.pendingTitle', 'Queued groups'))}"><div class="combat-exchange-title">${app._escapeHtml(app._label('combat.exchange.pendingTitle', 'Queued groups'))}</div>${pendingGroups.map(entry => `<div class="combat-pending-group"><span class="combat-exchange-intent">${app._escapeHtml(entry.action)}</span><span class="combat-exchange-text">${app._escapeHtml(entry.text)}</span></div>`).join('')}</div>`
            : '';
        const recentHtml = recent.length
            ? recent.map(entry => {
                const actorName = entry.actorName ? `<span class="combat-exchange-actor">${app._escapeHtml(entry.actorName)}</span>` : '';
                const action = entry.action ? `<span class="combat-exchange-intent">${app._escapeHtml(app._uiLabel(entry.action))}</span>` : '';
                const stamp = app._logTimestamp(entry);
                return `<li class="combat-exchange-item">${actorName}${action}<span class="combat-exchange-text">${app._escapeHtml(entry.text)}</span><span class="combat-exchange-time">${app._escapeHtml(stamp)}</span></li>`;
            }).join('')
            : `<li class="combat-exchange-item muted"><span class="combat-exchange-text">${app._escapeHtml(app._label('combat.exchange.none', 'No exchanges yet.'))}</span></li>`;
        return `<section class="combat-scene-summary" aria-label="${app._escapeHtml(app._label('combat.exchange.summary', 'Combat summary'))}">`
            + `<div class="combat-current-turn"><span>${app._escapeHtml(status)}</span><strong>${app._escapeHtml(actor?.name || app._label('ui.combat', 'Combat'))}</strong></div>`
            + `<div class="combat-turn-order" aria-label="${app._escapeHtml(turnOrderLabel)}"><div class="combat-exchange-title">${app._escapeHtml(turnOrderLabel)}</div><div class="combat-turn-order-row"><span>${app._escapeHtml(app._label('combat.exchange.currentActor', 'Current'))}</span><strong>${app._escapeHtml(turnOrder.currentName)}</strong></div><div class="combat-turn-order-row"><span>${app._escapeHtml(app._label('combat.exchange.nextActor', 'Next'))}</span><strong>${app._escapeHtml(turnOrder.nextName)}</strong></div></div>`
            + `<p>${app._escapeHtml(description)}</p>`
            + selectedIntentHtml
            + pendingHtml
            + `<div class="combat-recent-exchange"><div class="combat-exchange-title">${app._escapeHtml(app._label('combat.exchange.recent', 'Recent exchange'))}</div><ol>${recentHtml}</ol></div>`
            + this.latestStoryHtml(app)
            + `</section>`;
    },

    mobileLatestHtml(app, unit = null) {
        const actor = this.actor(app, unit);
        const turn = (app.combatState?.currentTurn ?? 0) + 1;
        const total = Math.max(1, app.combatState?.turnQueue?.length || 1);
        const status = app._label('mobile.combat.status', 'Round {round} · Turn {turn}/{total}', {
            round: app.combatState?.round || 1,
            turn,
            total
        });
        const recent = this.recentExchangeEntries(app, 1)[0] || null;
        const fallbackText = this.turnDescription(app, actor);
        const actorName = recent?.actorName || actor?.name || app._label('ui.combat', 'Combat');
        const action = recent?.action ? app._uiLabel(recent.action) : '';
        const text = recent?.text || fallbackText;
        const actionHtml = action ? `<span class="combat-exchange-intent">${app._escapeHtml(action)}</span>` : '';
        return `<div class="mobile-combat-latest-strip" aria-label="${app._escapeHtml(app._label('combat.exchange.recent', 'Recent exchange'))}">`
            + `<div class="mobile-combat-latest-meta"><strong>${app._escapeHtml(actorName)}</strong><span>${app._escapeHtml(status)}</span></div>`
            + `<div class="mobile-combat-latest-text">${actionHtml}<span>${app._escapeHtml(text)}</span></div>`
            + this.latestStoryHtml(app, { mobile: true })
            + `</div>`;
    },

    renderForTurn(app, unit = null) {
        if (!app.combatState?.active) return false;
        YAW_CENTER_CONTEXT.clearPresence();
        const title = this.turnTitle(app, unit);
        const html = this.sceneHtml(app, unit);
        const mobileHtml = this.mobileLatestHtml(app, unit);
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
