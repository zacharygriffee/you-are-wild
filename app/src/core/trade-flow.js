/**
 * YOU ARE WILD TRADE FLOW
 * Merchant panel rendering and buy/sell actions.
 */

const YAW_TRADE_FLOW = {
    show(app, targetId) {
        if (!app._guardRecoveryCapability?.('interactions', { action: 'trade' })) return false;
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
        const def = app._getItemDef(item);
        return Boolean(def.rare || item?.rare || (item?.price || 0) >= 50);
    },

    cancelPurchase(app, targetId, itemName) {
        app.log.push({ text: app._label('trade.purchaseCancelled', 'Purchase cancelled: {name}.', { name: itemName }), type: 'discovery' });
        app.renderLog();
        app.showTrade(targetId);
        return false;
    },

    completePurchase(app, targetId, stockIndex) {
        if (!app._guardRecoveryCapability?.('interactions', { action: 'trade-buy' })) return false;
        const merchant = app._findMerchantById(targetId);
        const item = merchant?.stock?.[stockIndex];
        if (!merchant || !item || item.qty <= 0) return;
        if (item.definitionId && !app._isItemDefinitionAvailable(item)) {
            app.log.push({
                text: app._label('item.providerUnavailableAction', '{name} is unavailable until its content provider is enabled.', { name: item.name }),
                type: 'discovery'
            });
            app.renderLog();
            app.showTrade(targetId);
            return false;
        }
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
        if (!app._canAddInventoryItem(item.definitionId || item.name, 1)) {
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
        app._addInventoryItem(item.definitionId || item.name, {
            id: `buy_${app._stableIdPart(targetId, 'merchant')}_${app._stableIdPart(item.name)}_${app.inventory.length}`,
            name: item.name
        });
        app.log.push({ text: app._label('trade.bought', 'Bought {name} for {price} gold.', { name: item.name, price: item.price }), type: 'loot' });
        app.emitTransactionSceneBeat?.(merchant, 'trade', 'bought', {
            itemName: item.name,
            price: item.price,
            goldDelta: -item.price
        });
        app.renderLog();
        app.renderParty();
        app.showTrade(targetId);
        app.markAutoSaveDirty?.(['manifest', 'player', 'inventory', 'sceneFeed', 'activityLog'], 'trade-buy');
        app.autoSave();
    },

    buy(app, targetId, stockIndex) {
        if (!app._guardRecoveryCapability?.('interactions', { action: 'trade-buy' })) return false;
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
        if (!app._guardRecoveryCapability?.('interactions', { action: 'trade-sell' })) return false;
        const merchant = app._findMerchantById(targetId);
        if (!merchant) return;
        const item = app.inventory.find(i => String(i.id) === String(itemId));
        if (!item) return;
        if (app._isQuestProtectedItem?.(item)) {
            app.log.push({ text: app._label('inventory.questProtected', '{name} is needed for an active quest.', { name: item.name }), type: 'discovery' });
            app.renderLog();
            app.showTrade(targetId);
            return false;
        }
        const def = app._getItemDef(item);
        if (item.definitionId && !def.id) {
            app.log.push({
                text: app._label('item.providerUnavailableAction', '{name} is unavailable until its content provider is enabled.', { name: item.name }),
                type: 'discovery'
            });
            app.renderLog();
            app.showTrade(targetId);
            return false;
        }
        const price = Math.max(1, Math.floor((def.value || 1) * 0.5));
        app._removeInventoryItem(itemId, 1);
        app.player.gold = (app.player.gold || 0) + price;
        const definitionId = def.id || item.definitionId || null;
        const existing = merchant.stock.find(stock => definitionId
            ? stock.definitionId === definitionId
            : !stock.definitionId && stock.name === item.name);
        if (existing) existing.qty += 1;
        else merchant.stock.push({
            id: `sold_${app._stableIdPart(targetId, 'merchant')}_${app._stableIdPart(item.name)}_${merchant.stock.length}`,
            ...(definitionId ? { definitionId } : {}),
            name: item.name,
            price: def.value || price,
            qty: 1
        });
        app.log.push({ text: app._label('trade.sold', 'Sold {name} for {price} gold.', { name: item.name, price }), type: 'loot' });
        app.emitTransactionSceneBeat?.(merchant, 'trade', 'sold', {
            itemName: item.name,
            price,
            goldDelta: price
        });
        app.renderLog();
        app.renderParty();
        app.showTrade(targetId);
        app.markAutoSaveDirty?.(['manifest', 'player', 'inventory', 'sceneFeed', 'activityLog'], 'trade-sell');
        app.autoSave();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TRADE_FLOW = YAW_TRADE_FLOW;
}
