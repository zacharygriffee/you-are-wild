/**
 * YOU ARE WILD TRANSACTION WINDOW
 * Focused quest and trade pseudo-windows for NPC interactions.
 */

const YAW_TRANSACTION_WINDOW = {
    root() {
        return document.getElementById('transaction-window-root');
    },

    npc(app, targetId) {
        return app._resolveCreatureRef(targetId) || app.creatures.find(unit => String(unit?.id || unit?.name) === String(targetId)) || null;
    },

    locationText(app) {
        const tile = app._currentExplorationTile?.();
        const biome = app.biomes?.[tile?.biome || app.currentBiome]?.name
            || app.currentBiome
            || app._label('ui.scene.wildernessTitle', 'The Wilderness');
        const coords = app.inInterior
            ? `${app.location.x}, ${app.location.y} / ${app.interiorLocation.x}, ${app.interiorLocation.y}`
            : `${app.location.x}, ${app.location.y}`;
        return `${biome} · ${coords}`;
    },

    inventoryCapacity(app) {
        return `${(app.inventory || []).length}/${app.MAX_INVENTORY}`;
    },

    captureReturnFocus(app) {
        if (typeof document === 'undefined') return null;
        const active = document.activeElement;
        const inTargetRail = Boolean(active?.closest?.('#mobile-target-picker-belt, #mobile-target-action-tray'));
        const inActorRail = Boolean(active?.closest?.('#mobile-actor-belt'));
        return {
            control: active?.getAttribute?.('data-command-control') || '',
            intent: active?.getAttribute?.('data-command-intent') || '',
            slot: active?.getAttribute?.('data-command-slot') || '',
            rail: inTargetRail || app.mobileTargetPickerOpen || app._mobilePanelReturnRail === 'target'
                ? 'target'
                : (inActorRail || app.mobileActorBeltOpen || app._mobilePanelReturnRail === 'actor' ? 'actor' : '')
        };
    },

    restoreReturnFocus(app, token = null) {
        if (!token || typeof document === 'undefined' || app.combatState?.active || app.screen !== 'game') return false;
        const roots = token.rail === 'target'
            ? ['#mobile-target-picker-belt', '#mobile-target-action-tray']
            : (token.rail === 'actor'
                ? ['#mobile-actor-belt']
                : ['#desktop-context-belt', '#mobile-explore-actions', '#mobile-target-action-tray']);
        const candidates = roots.flatMap(selector => Array.from(document.querySelectorAll(`${selector} button, ${selector} [tabindex="0"]`)));
        const visible = candidates.filter(element => {
            if (!element?.isConnected || element.disabled) return false;
            const style = typeof getComputedStyle === 'function' ? getComputedStyle(element) : null;
            const rect = element.getBoundingClientRect?.();
            return (!style || (style.display !== 'none' && style.visibility !== 'hidden'))
                && (!rect || rect.width > 0 || rect.height > 0);
        });
        const matches = element => (!token.control || element.getAttribute('data-command-control') === token.control)
            && (!token.intent || element.getAttribute('data-command-intent') === token.intent)
            && (!token.slot || element.getAttribute('data-command-slot') === token.slot);
        const fallbackControl = token.rail === 'target' ? 'focus-target' : (token.rail === 'actor' ? 'focus-actor' : '');
        const target = visible.find(matches)
            || (fallbackControl ? visible.find(element => element.getAttribute('data-command-control') === fallbackControl) : null)
            || visible[0];
        if (!target?.focus) return false;
        try { target.focus({ preventScroll: true }); } catch (_error) { target.focus(); }
        return true;
    },

    itemTypeLabel(app, type = 'misc') {
        const token = String(type || 'misc').trim().toLowerCase();
        return app._label(`item.category.${token}`, token || app._label('item.category.misc', 'Misc'));
    },

    open(app, kind, targetId) {
        if (!['quest', 'trade'].includes(kind)) return false;
        const npc = this.npc(app, targetId);
        if (!npc || !app._isLivingCreature(npc)) return false;
        if (kind === 'trade' && (npc.disposition !== app.DISPOSITION.MERCHANT || !app._isServiceAvailable(npc))) return false;
        if (kind === 'quest' && ((!npc.quest && !(app.quests || []).length) || !app._isServiceAvailable(npc))) return false;
        const nextTargetId = app._explorationTargetUnitId?.('creature', npc) || npc.id || npc.name;
        const previous = app.transactionWindow;
        const sameWindow = previous
            && previous.kind === kind
            && String(previous.targetId) === String(nextTargetId);
        const returnFocus = sameWindow ? previous.returnFocus : this.captureReturnFocus(app);
        app.transactionWindow = {
            kind,
            targetId: nextTargetId,
            exchangeId: sameWindow ? previous.exchangeId : `transaction-${kind}-${app.storyEventSeq + 1}`,
            openedAt: { x: app.location.x, y: app.location.y, interior: Boolean(app.inInterior) },
            returnFocus
        };
        if (!sameWindow) app.emitTransactionSceneBeat?.(npc, kind, 'opened');
        app.closeIntentMenu?.();
        app.closeAllPanels?.();
        this.render(app);
        return true;
    },

    close(app) {
        const root = this.root();
        const exchangeId = app.transactionWindow?.exchangeId;
        const returnFocus = app.transactionWindow?.returnFocus || null;
        app.transactionWindow = null;
        if (exchangeId && typeof YAW_NARRATION_SYSTEM !== 'undefined') YAW_NARRATION_SYSTEM.closeExchange(app, exchangeId, { reason: 'transaction-closed' });
        app._restoreFocusTrap?.({ restoreFocus: false });
        if (root) {
            root.hidden = true;
            root.innerHTML = '';
        }
        this.setUnderlyingInert(false);
        document.getElementById('app')?.classList?.remove('transaction-window-open');
        app.renderExplorationActions?.();
        app._renderInteractionState?.({ exploration: true, toolbelt: false });
        this.restoreReturnFocus(app, returnFocus);
        return false;
    },

    closeIfTargetMissing(app) {
        const state = app.transactionWindow;
        if (!state) return false;
        const npc = this.npc(app, state.targetId);
        if (!npc || !app._isLivingCreature(npc) || app.combatState?.active) {
            this.close(app);
            return true;
        }
        return false;
    },

    refresh(app) {
        if (app.transactionWindow) return this.render(app);
        return false;
    },

    setUnderlyingInert(enabled) {
        const selectors = ['#app > .app-header', '#app > .stage', '#app > .panel-log', '#mobile-actions', '#panel-backdrop'];
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) return;
            if (enabled) {
                element.setAttribute('inert', '');
                element.setAttribute('aria-hidden', 'true');
            } else {
                element.removeAttribute('inert');
                element.removeAttribute('aria-hidden');
            }
        });
    },

    render(app) {
        const state = app.transactionWindow;
        const root = this.root();
        if (!state || !root) return false;
        const npc = this.npc(app, state.targetId);
        if (!npc || !app._isLivingCreature(npc) || app.combatState?.active) return this.close(app);
        const kind = state.kind === 'trade' ? 'trade' : 'quest';
        const title = kind === 'trade'
            ? app._label('trade.title', '{name} Trade', { name: npc.name })
            : app._label('quest.windowTitle', '{name} Quests', { name: npc.name });
        const description = kind === 'trade'
            ? app._label('transaction.tradeDescription', 'Review wares, prices, and inventory with {name}.', { name: npc.name })
            : app._label('transaction.questDescription', 'Review available and active quests from {name}.', { name: npc.name });
        const closeLabel = app._escapeHtml(app._label('inventory.back', 'Back'));
        root.hidden = false;
        root.innerHTML = `
            <div class="transaction-backdrop" data-command-surface="transaction-window" data-command-mode="exploration" data-command-control="close-transaction" onclick="App.closeTransactionWindow()"></div>
            <section class="transaction-window ${kind}" role="dialog" aria-modal="true" aria-labelledby="transaction-window-title" aria-describedby="transaction-window-description" data-surface-role="transaction-window" data-command-surface="transaction-window" data-command-mode="exploration" data-command-intent="${app._escapeHtml(kind)}">
                <header class="transaction-header">
                    <div>
                        <div class="transaction-eyebrow">${app._escapeHtml(app._unitDispositionLabel(npc) || (kind === 'trade' ? app._label('disposition.merchant', 'Merchant') : app._label('disposition.quest', 'Quest')))}</div>
                        <h2 id="transaction-window-title">${app._escapeHtml(title)}</h2>
                        <p id="transaction-window-description" class="holding-entry-meta">${app._escapeHtml(description)}</p>
                    </div>
                    <button class="nav-btn transaction-close" data-command-surface="transaction-window" data-command-mode="exploration" data-command-control="close-transaction" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeTransactionWindow()">${closeLabel}</button>
                </header>
                ${this.summary(app, npc)}
                <div class="transaction-body">
                    ${kind === 'trade' ? this.tradeBody(app, npc) : this.questBody(app, npc)}
                </div>
            </section>`;
        document.getElementById('app')?.classList?.add('transaction-window-open');
        this.setUnderlyingInert(true);
        const dialog = root.querySelector('.transaction-window');
        app._activateFocusTrap?.(dialog, { close: () => app.closeTransactionWindow() });
        try { root.querySelector('.transaction-close')?.focus({ preventScroll: true }); } catch (e) { root.querySelector('.transaction-close')?.focus(); }
        return true;
    },

    summary(app, npc) {
        const name = app._escapeHtml(npc.name || app._label('ui.creatures', 'Creature'));
        const type = app._escapeHtml(app._unitDispositionLabel(npc) || app._label('disposition.neutral', 'Neutral'));
        const location = app._escapeHtml(this.locationText(app));
        const gold = app._escapeHtml(String(app.player?.gold || 0));
        const capacity = app._escapeHtml(this.inventoryCapacity(app));
        const npcLabel = app._escapeHtml(app._label('transaction.summary.npc', 'NPC'));
        const locationLabel = app._escapeHtml(app._label('transaction.summary.location', 'Location'));
        const goldLabel = app._escapeHtml(app._label('transaction.summary.gold', 'Gold'));
        const inventoryLabel = app._escapeHtml(app._label('transaction.summary.inventory', 'Inventory'));
        return `<div class="transaction-summary" data-command-surface="transaction-window" data-command-mode="exploration">
            <div><span>${npcLabel}</span><strong>${name}</strong><small>${type}</small></div>
            <div><span>${locationLabel}</span><strong>${location}</strong></div>
            <div><span>${goldLabel}</span><strong>${gold}</strong></div>
            <div><span>${inventoryLabel}</span><strong>${capacity}</strong></div>
        </div>`;
    },

    tradeBody(app, merchant) {
        const targetId = app._unitKey(merchant);
        const buyLabel = app._escapeHtml(app._label('trade.buy', 'Buy'));
        const sellLabel = app._escapeHtml(app._label('trade.sell', 'Sell'));
        let html = `<div class="transaction-filters">${app._itemListOptions('Trade', targetId)}</div>`;
        html += `<div class="transaction-columns"><section class="transaction-section"><h3>${buyLabel}</h3><div class="transaction-list">`;
        const stockEntries = app._filterAndSortItemEntries((merchant.stock || []).map((item, index) => ({ item, index })), app.tradeFilter, app.tradeSort);
        if (stockEntries.length === 0) {
            html += this.empty(app, app._label('trade.noStockMatches', 'No stock matches the current filter.'));
        } else {
            stockEntries.forEach(({ item, index }) => {
                const unknown = app._label('item.unknown', 'Unknown');
                const def = app.ITEMS[item.name] || { icon: '?', desc: unknown, type: 'misc' };
                const disabled = (app.player.gold || 0) < item.price || item.qty <= 0 || app.inventory.length >= app.MAX_INVENTORY ? ' disabled aria-disabled="true"' : '';
                const buyTitle = app._escapeHtml(app._label('trade.buyItem', 'Buy {name}', { name: item.name }));
                const typeLabel = app._escapeHtml(this.itemTypeLabel(app, def.type));
                const quantity = app._escapeHtml(app._label('trade.quantity', 'Qty {count}', { count: item.qty }));
                const price = app._escapeHtml(app._label('trade.goldCompact', '{amount}g', { amount: item.price }));
                html += `<article class="transaction-item">
                    <div><strong>${app._escapeHtml(def.icon || '?')} ${app._escapeHtml(item.name)}</strong><small>${typeLabel} · ${app._escapeHtml(def.desc || '')}</small></div>
                    <div class="transaction-item-meta"><span>${quantity}</span><span>${price}</span></div>
                    <button class="nav-btn" data-command-surface="transaction-window" data-command-mode="exploration" data-command-control="buy-item" data-command-intent="trade" title="${buyTitle}" aria-label="${buyTitle}"${disabled} onclick="App.buyFromMerchant('${targetId}',${index})">${buyLabel}</button>
                </article>`;
            });
        }
        html += `</div></section><section class="transaction-section"><h3>${sellLabel}</h3><div class="transaction-list">`;
        const sellEntries = app._filterAndSortItemEntries((app.inventory || []).map((item, index) => ({ item, index })), app.tradeFilter, app.tradeSort);
        if (app.inventory.length === 0) {
            html += this.empty(app, app._label('trade.noItemsToSell', 'No items to sell.'));
        } else if (sellEntries.length === 0) {
            html += this.empty(app, app._label('trade.noInventoryMatches', 'No inventory items match the current filter.'));
        } else {
            sellEntries.forEach(({ item }) => {
                const unknown = app._label('item.unknown', 'Unknown');
                const def = app.ITEMS[item.name] || { icon: '?', value: 1, desc: unknown, type: 'misc' };
                const price = Math.max(1, Math.floor((def.value || 1) * 0.5));
                const sellTitle = app._escapeHtml(app._label('trade.sellItem', 'Sell {name}', { name: item.name }));
                const typeLabel = app._escapeHtml(this.itemTypeLabel(app, def.type));
                const priceLabel = app._escapeHtml(app._label('trade.goldCompact', '{amount}g', { amount: price }));
                html += `<article class="transaction-item">
                    <div><strong>${app._escapeHtml(def.icon || '?')} ${app._escapeHtml(item.name)}</strong><small>${typeLabel} · ${app._escapeHtml(def.desc || '')}</small></div>
                    <div class="transaction-item-meta"><span>${priceLabel}</span></div>
                    <button class="nav-btn" data-command-surface="transaction-window" data-command-mode="exploration" data-command-control="sell-item" data-command-intent="trade" title="${sellTitle}" aria-label="${sellTitle}" onclick="App.sellToMerchant('${targetId}','${String(item.id).replace(/'/g, "\\'")}')">${sellLabel}</button>
                </article>`;
            });
        }
        html += `</div></section></div>`;
        return html;
    },

    questBody(app, giver) {
        const available = [];
        if (giver.quest && !giver.questAccepted && !app._getQuestById(giver.quest.id)) available.push(app._normalizeQuest(giver.quest, giver));
        const related = (app.quests || []).filter(quest => !giver?.id || String(quest.giverId || '') === String(giver.id || giver.name || '') || String(quest.giverName || '') === String(giver.name || ''));
        const active = related.filter(quest => quest.status === 'active');
        const completed = related.filter(quest => quest.status === 'completed');
        return `<div class="transaction-columns quest-columns">
            ${this.questList(app, app._label('quest.window.available', 'Available'), available, giver, 'available')}
            ${this.questList(app, app._label('quest.window.accepted', 'Accepted'), active, giver, 'accepted')}
            ${this.questList(app, app._label('quest.window.completed', 'Completed'), completed, giver, 'completed')}
        </div>`;
    },

    questList(app, title, quests, giver, section) {
        let html = `<section class="transaction-section" data-quest-section="${app._escapeHtml(section)}"><h3>${app._escapeHtml(title)}</h3><div class="transaction-list">`;
        if (!quests.length) return `${html}${this.empty(app, app._label('quest.window.none', 'None'))}</div></section>`;
        quests.forEach(quest => {
            const normalized = app._normalizeQuest(quest, giver);
            const targetId = app._unitKey(giver);
            const reward = app._questRewardPreviewText(normalized.reward);
            html += `<article class="transaction-quest">
                <strong>${app._escapeHtml(normalized.title)}</strong>
                ${normalized.description ? `<p>${app._escapeHtml(normalized.description)}</p>` : ''}
                <div class="transaction-quest-progress">${app._questProgressText(normalized)}</div>
                <small>${reward}</small>`;
            if (section === 'available') {
                const acceptLabel = app._escapeHtml(app._label('action.acceptQuest', 'Accept Quest'));
                html += `<button class="nav-btn primary" data-command-surface="transaction-window" data-command-mode="exploration" data-command-control="confirm-quest" data-command-intent="acceptQuest" onclick="App.acceptQuestFromUnit('${targetId}')">${acceptLabel}</button>`;
            } else if (section === 'completed' && normalized.turnInRequired && !normalized.rewardClaimed) {
                const turnInLabel = app._escapeHtml(app._label('quest.turnIn', 'Turn In'));
                html += `<button class="nav-btn primary" data-command-surface="transaction-window" data-command-mode="exploration" data-command-control="turn-in-quest" data-command-intent="turnInQuest" onclick="App.turnInQuest('${String(normalized.id).replace(/'/g, "\\'")}')">${turnInLabel}</button>`;
            }
            html += `</article>`;
        });
        return `${html}</div></section>`;
    },

    empty(app, text) {
        return `<p class="transaction-empty">${app._escapeHtml(text)}</p>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TRANSACTION_WINDOW = YAW_TRANSACTION_WINDOW;
}
