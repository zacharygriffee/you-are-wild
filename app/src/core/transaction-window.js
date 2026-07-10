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
        const biome = app.biomes?.[tile?.biome || app.currentBiome]?.name || app.currentBiome || 'Wilderness';
        const coords = app.inInterior
            ? `${app.location.x}, ${app.location.y} / ${app.interiorLocation.x}, ${app.interiorLocation.y}`
            : `${app.location.x}, ${app.location.y}`;
        return `${biome} · ${coords}`;
    },

    inventoryCapacity(app) {
        return `${(app.inventory || []).length}/${app.MAX_INVENTORY}`;
    },

    open(app, kind, targetId) {
        if (!['quest', 'trade'].includes(kind)) return false;
        const npc = this.npc(app, targetId);
        if (!npc || !app._isLivingCreature(npc)) return false;
        if (kind === 'trade' && npc.disposition !== app.DISPOSITION.MERCHANT) return false;
        if (kind === 'quest' && !npc.quest && !(app.quests || []).length) return false;
        const nextTargetId = app._explorationTargetUnitId?.('creature', npc) || npc.id || npc.name;
        const previous = app.transactionWindow;
        const sameWindow = previous
            && previous.kind === kind
            && String(previous.targetId) === String(nextTargetId);
        app.transactionWindow = {
            kind,
            targetId: nextTargetId,
            openedAt: { x: app.location.x, y: app.location.y, interior: Boolean(app.inInterior) }
        };
        if (!sameWindow) app.emitTransactionSceneBeat?.(npc, kind, 'opened');
        app.closeIntentMenu?.();
        app.closeAllPanels?.();
        this.render(app);
        return true;
    },

    close(app) {
        const root = this.root();
        app.transactionWindow = null;
        app._restoreFocusTrap?.({ restoreFocus: false });
        if (root) {
            root.hidden = true;
            root.innerHTML = '';
        }
        this.setUnderlyingInert(false);
        document.getElementById('app')?.classList?.remove('transaction-window-open');
        app.renderExplorationActions?.();
        app._renderInteractionState?.({ exploration: true, toolbelt: false });
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
        const closeLabel = app._escapeHtml(app._label('inventory.back', 'Back'));
        root.hidden = false;
        root.innerHTML = `
            <div class="transaction-backdrop" data-command-surface="transaction-window" data-command-mode="exploration" data-command-control="close-transaction" onclick="App.closeTransactionWindow()"></div>
            <section class="transaction-window ${kind}" role="dialog" aria-modal="true" aria-labelledby="transaction-window-title" data-surface-role="transaction-window" data-command-surface="transaction-window" data-command-mode="exploration" data-command-intent="${app._escapeHtml(kind)}">
                <header class="transaction-header">
                    <div>
                        <div class="transaction-eyebrow">${app._escapeHtml(app._unitDispositionLabel(npc) || (kind === 'trade' ? app._label('disposition.merchant', 'Merchant') : app._label('disposition.quest', 'Quest')))}</div>
                        <h2 id="transaction-window-title">${app._escapeHtml(title)}</h2>
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
        return `<div class="transaction-summary" data-command-surface="transaction-window" data-command-mode="exploration">
            <div><span>NPC</span><strong>${name}</strong><small>${type}</small></div>
            <div><span>Location</span><strong>${location}</strong></div>
            <div><span>Gold</span><strong>${gold}</strong></div>
            <div><span>Inventory</span><strong>${capacity}</strong></div>
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
                const def = app.ITEMS[item.name] || { icon: '?', desc: 'Unknown' };
                const disabled = (app.player.gold || 0) < item.price || item.qty <= 0 || app.inventory.length >= app.MAX_INVENTORY ? ' disabled aria-disabled="true"' : '';
                const buyTitle = app._escapeHtml(app._label('trade.buyItem', 'Buy {name}', { name: item.name }));
                html += `<article class="transaction-item">
                    <div><strong>${app._escapeHtml(def.icon || '?')} ${app._escapeHtml(item.name)}</strong><small>${app._escapeHtml(def.type || 'misc')} · ${app._escapeHtml(def.desc || '')}</small></div>
                    <div class="transaction-item-meta"><span>Qty ${app._escapeHtml(String(item.qty))}</span><span>${app._escapeHtml(String(item.price))}g</span></div>
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
                const def = app.ITEMS[item.name] || { icon: '?', value: 1, desc: 'Unknown' };
                const price = Math.max(1, Math.floor((def.value || 1) * 0.5));
                const sellTitle = app._escapeHtml(app._label('trade.sellItem', 'Sell {name}', { name: item.name }));
                html += `<article class="transaction-item">
                    <div><strong>${app._escapeHtml(def.icon || '?')} ${app._escapeHtml(item.name)}</strong><small>${app._escapeHtml(def.type || 'misc')} · ${app._escapeHtml(def.desc || '')}</small></div>
                    <div class="transaction-item-meta"><span>${app._escapeHtml(String(price))}g</span></div>
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
            ${this.questList(app, 'Available', available, giver, 'available')}
            ${this.questList(app, 'Accepted', active, giver, 'accepted')}
            ${this.questList(app, 'Completed', completed, giver, 'completed')}
        </div>`;
    },

    questList(app, title, quests, giver, section) {
        let html = `<section class="transaction-section" data-quest-section="${app._escapeHtml(section)}"><h3>${app._escapeHtml(title)}</h3><div class="transaction-list">`;
        if (!quests.length) return `${html}${this.empty(app, 'None')}</div></section>`;
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
