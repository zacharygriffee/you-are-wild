/**
 * YOU ARE WILD TRADE FLOW
 * Merchant panel rendering and buy/sell actions.
 */

const YAW_TRADE_FLOW = {
    show(app, targetId) {
        return app.openTransactionWindow('trade', targetId);
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
            app.emitTransactionSceneBeat?.(merchant, 'trade', 'blocked', {
                itemName: item.name,
                price: item.price,
                reason: 'need-gold'
            });
            app.renderLog();
            app.showTrade(targetId);
            return;
        }
        if (app.inventory.length >= app.MAX_INVENTORY) {
            app.log.push({ text: app._label('inventory.full', 'Inventory is full.'), type: 'discovery' });
            app.emitTransactionSceneBeat?.(merchant, 'trade', 'blocked', {
                itemName: item.name,
                price: item.price,
                reason: 'inventory-full'
            });
            app.renderLog();
            app.showTrade(targetId);
            return;
        }
        app.player.gold -= item.price;
        item.qty -= 1;
        app.inventory.push({ id: `buy_${app._stableIdPart(targetId, 'merchant')}_${app._stableIdPart(item.name)}_${app.inventory.length}`, name: item.name });
        app.log.push({ text: app._label('trade.bought', 'Bought {name} for {price} gold.', { name: item.name, price: item.price }), type: 'loot' });
        app.emitTransactionSceneBeat?.(merchant, 'trade', 'bought', {
            itemName: item.name,
            price: item.price,
            goldDelta: -item.price
        });
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
        app.emitTransactionSceneBeat?.(merchant, 'trade', 'sold', {
            itemName: item.name,
            price,
            goldDelta: price
        });
        app.renderLog();
        app.renderParty();
        app.showTrade(targetId);
        app.autoSave();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TRADE_FLOW = YAW_TRADE_FLOW;
}
