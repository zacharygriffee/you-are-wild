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
            + `<p>${app._escapeHtml(description)}</p>`
            + `<div class="combat-recent-exchange"><div class="combat-exchange-title">${app._escapeHtml(app._label('combat.exchange.recent', 'Recent exchange'))}</div><ol>${recentHtml}</ol></div>`
            + `</section>`;
    },

    renderForTurn(app, unit = null) {
        if (!app.combatState?.active) return false;
        const title = this.turnTitle(app, unit);
        const html = this.sceneHtml(app, unit);
        const textDescription = this.turnDescription(app, unit);
        const titleEl = document.getElementById('scene-title');
        const descEl = document.getElementById('scene-description');
        const mobileTitle = document.getElementById('mobile-scene-title');
        const mobileDesc = document.getElementById('mobile-scene-description');
        const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.innerHTML = html;
        if (mobileTitle) mobileTitle.textContent = title;
        if (mobileDesc) mobileDesc.innerHTML = html;
        if (mobileSheet) mobileSheet.classList.remove('rich-content');
        app.renderTileEvents();
        return textDescription;
    }
};

window.YAW_COMBAT_SCENE = YAW_COMBAT_SCENE;
