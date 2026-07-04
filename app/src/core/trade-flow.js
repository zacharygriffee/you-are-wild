/**
 * YOU ARE WILD TRADE FLOW
 * Merchant panel rendering and buy/sell actions.
 */

const YAW_TRADE_FLOW = {
    show(app, targetId) {
        const merchant = app._findMerchantById(targetId);
        if (!merchant) return false;
        const gold = app.player.gold || 0;
        const buyLabel = app._escapeHtml(app._label('trade.buy', 'Buy'));
        const sellLabel = app._escapeHtml(app._label('trade.sell', 'Sell'));
        const backLabel = app._escapeHtml(app._label('inventory.back', 'Back'));
        const title = app._escapeHtml(app._label('trade.title', '{name} Trade', { name: merchant.name }));
        const goldText = app._escapeHtml(app._label('trade.gold', 'Gold: {gold}', { gold }));
        let html = `<h3>${title}</h3><p style="color:var(--text-muted);margin:4px 0 12px;">${goldText}</p>`;
        html += app._itemListOptions('Trade', app._unitKey(merchant));
        html += `<h4 style="color:var(--text-primary);margin:12px 0 8px;">${buyLabel}</h4><div style="display:grid;gap:8px;">`;
        const stockEntries = app._filterAndSortItemEntries((merchant.stock || []).map((item, index) => ({ item, index })), app.tradeFilter, app.tradeSort);
        if (stockEntries.length === 0) {
            html += `<p style="color:var(--text-muted)">${app._escapeHtml(app._label('trade.noStockMatches', 'No stock matches the current filter.'))}</p>`;
        }
        stockEntries.forEach(({ item, index }) => {
            const def = app.ITEMS[item.name] || { icon: '?', desc: 'Unknown' };
            const disabled = gold < item.price || item.qty <= 0 || app.inventory.length >= app.MAX_INVENTORY ? ' disabled' : '';
            const buyTitle = app._escapeHtml(app._label('trade.buyItem', 'Buy {name}', { name: item.name }));
            html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="display:flex;justify-content:space-between;gap:8px;"><div><div style="font-weight:700;color:var(--text-primary)">${def.icon || '?'} ${item.name}</div><div style="font-size:11px;color:var(--text-muted)">${def.type || 'misc'} · ${def.desc || ''}</div></div><div style="font-size:12px;color:var(--text-muted)">Qty ${item.qty} | ${item.price}g</div></div><button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${buyTitle}" aria-label="${buyTitle}" ${disabled} onclick="App.buyFromMerchant('${app._unitKey(merchant)}',${index})">${buyLabel}</button></div>`;
        });
        html += `</div><h4 style="color:var(--text-primary);margin:12px 0 8px;">${sellLabel}</h4><div style="display:grid;gap:8px;">`;
        const sellEntries = app._filterAndSortItemEntries((app.inventory || []).map((item, index) => ({ item, index })), app.tradeFilter, app.tradeSort);
        if (app.inventory.length === 0) {
            html += `<p style="color:var(--text-muted)">${app._escapeHtml(app._label('trade.noItemsToSell', 'No items to sell.'))}</p>`;
        } else if (sellEntries.length === 0) {
            html += `<p style="color:var(--text-muted)">${app._escapeHtml(app._label('trade.noInventoryMatches', 'No inventory items match the current filter.'))}</p>`;
        } else {
            sellEntries.forEach(({ item }) => {
                const def = app.ITEMS[item.name] || { icon: '?', value: 1, desc: 'Unknown' };
                const price = Math.max(1, Math.floor((def.value || 1) * 0.5));
                const sellTitle = app._escapeHtml(app._label('trade.sellItem', 'Sell {name}', { name: item.name }));
                html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="display:flex;justify-content:space-between;gap:8px;"><div><div style="font-weight:700;color:var(--text-primary)">${def.icon || '?'} ${item.name}</div><div style="font-size:11px;color:var(--text-muted)">${def.type || 'misc'} · ${def.desc || ''}</div></div><div style="font-size:12px;color:var(--text-muted)">${price}g</div></div><button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${sellTitle}" aria-label="${sellTitle}" onclick="App.sellToMerchant('${app._unitKey(merchant)}','${String(item.id).replace(/'/g, "\\'")}')">${sellLabel}</button></div>`;
            });
        }
        html += `</div><button class="nav-btn" style="margin-top:12px" title="${backLabel}" aria-label="${backLabel}" onclick="App.closePanelDetails('creature')">${backLabel}</button>`;
        app.showCreaturePanelDetail(title, html);
        return true;
    },

    setFilter(app, filter, targetId) {
        app.tradeFilter = ['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].includes(filter) ? filter : 'all';
        if (targetId) app.showTrade(targetId);
    },

    setSort(app, sort, targetId) {
        app.tradeSort = ['name', 'type', 'value-desc', 'value-asc'].includes(sort) ? sort : 'name';
        if (targetId) app.showTrade(targetId);
    },

    requiresPurchaseConfirmation(app, item) {
        const def = app.ITEMS[item?.name] || {};
        return Boolean(def.rare || item?.rare || (item?.price || 0) >= 50);
    },

    cancelPurchase(app, targetId, itemName) {
        app.log.push({ text: app._label('trade.purchaseCancelled', 'Purchase cancelled: {name}.', { name: itemName }), type: 'discovery' });
        app.renderLog();
        app.showTrade(targetId);
        return false;
    },

    completePurchase(app, targetId, stockIndex) {
        const merchant = app._findMerchantById(targetId);
        const item = merchant?.stock?.[stockIndex];
        if (!merchant || !item || item.qty <= 0) return;
        if ((app.player.gold || 0) < item.price) {
            app.log.push({ text: app._label('trade.needGold', 'You need {price} gold to buy {name}.', { price: item.price, name: item.name }), type: 'discovery' });
            app.renderLog();
            app.showTrade(targetId);
            return;
        }
        if (app.inventory.length >= app.MAX_INVENTORY) {
            app.log.push({ text: app._label('inventory.full', 'Inventory is full.'), type: 'discovery' });
            app.renderLog();
            app.showTrade(targetId);
            return;
        }
        app.player.gold -= item.price;
        item.qty -= 1;
        app.inventory.push({ id: `buy_${app._stableIdPart(targetId, 'merchant')}_${app._stableIdPart(item.name)}_${app.inventory.length}`, name: item.name });
        app.log.push({ text: app._label('trade.bought', 'Bought {name} for {price} gold.', { name: item.name, price: item.price }), type: 'loot' });
        app.renderLog();
        app.renderParty();
        app.showTrade(targetId);
        app.autoSave();
    },

    buy(app, targetId, stockIndex) {
        const merchant = app._findMerchantById(targetId);
        const item = merchant?.stock?.[stockIndex];
        if (!merchant || !item || item.qty <= 0) return;
        if (this.requiresPurchaseConfirmation(app, item)) {
            const itemName = item.name;
            return app.showConfirmDialog({
                title: app._label('trade.buy', 'Buy'),
                message: app._label('trade.confirmBuy', 'Buy {name} for {price} gold?', { name: item.name, price: item.price }),
                confirmLabel: app._label('trade.buy', 'Buy'),
                cancelLabel: app._label('ui.cancel', 'Cancel'),
                onCancel: () => this.cancelPurchase(app, targetId, itemName),
                onConfirm: () => this.completePurchase(app, targetId, stockIndex)
            });
        }
        return this.completePurchase(app, targetId, stockIndex);
    },

    sell(app, targetId, itemId) {
        const merchant = app._findMerchantById(targetId);
        if (!merchant) return;
        const item = app.inventory.find(i => String(i.id) === String(itemId));
        if (!item) return;
        const def = app.ITEMS[item.name] || { value: 1 };
        const price = Math.max(1, Math.floor((def.value || 1) * 0.5));
        app.inventory = app.inventory.filter(i => String(i.id) !== String(itemId));
        app.player.gold = (app.player.gold || 0) + price;
        const existing = merchant.stock.find(s => s.name === item.name);
        if (existing) existing.qty += 1;
        else merchant.stock.push({ id: `sold_${app._stableIdPart(targetId, 'merchant')}_${app._stableIdPart(item.name)}_${merchant.stock.length}`, name: item.name, price: def.value || price, qty: 1 });
        app.log.push({ text: app._label('trade.sold', 'Sold {name} for {price} gold.', { name: item.name, price }), type: 'loot' });
        app.renderLog();
        app.renderParty();
        app.showTrade(targetId);
        app.autoSave();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TRADE_FLOW = YAW_TRADE_FLOW;
}
