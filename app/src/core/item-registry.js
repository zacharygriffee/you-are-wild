/**
 * YOU ARE WILD ITEM REGISTRY V2
 * Stable item-definition identity with legacy display-name compatibility.
 */

const YAW_ITEM_REGISTRY = {
    VERSION: 2,
    CORE_OWNER: 'core',

    _state(app) {
        if (app._itemRegistryV2) return app._itemRegistryV2;
        const state = {
            version: this.VERSION,
            coreLoaded: false,
            definitions: new Map(),
            aliases: new Map(),
            ownerIds: new Map()
        };
        Object.defineProperty(app, '_itemRegistryV2', {
            value: state,
            configurable: true,
            writable: true,
            enumerable: false
        });
        return state;
    },

    _clone(value) {
        if (Array.isArray(value)) return value.map(entry => this._clone(entry));
        if (!value || typeof value !== 'object') return value;
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, this._clone(entry)]));
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.values(value).forEach(entry => this._deepFreeze(entry));
        return Object.freeze(value);
    },

    _normalizeId(value) {
        const id = String(value || '').trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$/.test(id)) {
            throw new Error(`Item definition id must be namespaced: ${String(value || '')}`);
        }
        return id;
    },

    _register(app, owner, definition, legacyNames = []) {
        const state = this._state(app);
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('Item definition must be an object');
        }
        const id = this._normalizeId(definition.id);
        const normalizedOwner = String(owner || '').trim() || this.CORE_OWNER;
        const name = String(definition.name || legacyNames[0] || '').trim();
        if (!name) throw new Error(`Item definition ${id} requires a name`);
        if (state.definitions.has(id)) throw new Error(`Item definition already registered: ${id}`);

        const stackable = definition.stackable === true;
        const maxStack = stackable
            ? Math.max(2, Math.min(99, Math.floor(Number(definition.maxStack) || 20)))
            : 1;
        const stored = this._deepFreeze({
            ...this._clone(definition),
            id,
            name,
            owner: normalizedOwner,
            stackable,
            maxStack
        });
        state.definitions.set(id, stored);
        const ownerIds = state.ownerIds.get(normalizedOwner) || new Set();
        ownerIds.add(id);
        state.ownerIds.set(normalizedOwner, ownerIds);
        [name, ...legacyNames].map(String).map(alias => alias.trim()).filter(Boolean).forEach(alias => {
            const existing = state.aliases.get(alias);
            if (existing && existing !== id) throw new Error(`Item name alias already registered: ${alias}`);
            state.aliases.set(alias, id);
        });
        return stored;
    },

    register(app, owner, definition, options = {}) {
        this.ensure(app);
        const normalizedOwner = String(owner || '').trim();
        if (!normalizedOwner || normalizedOwner === this.CORE_OWNER) {
            throw new Error('Module item definitions require a non-core owner');
        }
        return this._register(app, normalizedOwner, definition, options.legacyNames || []);
    },

    unregisterOwner(app, owner) {
        const state = this.ensure(app);
        const normalizedOwner = String(owner || '').trim();
        if (!normalizedOwner || normalizedOwner === this.CORE_OWNER) return [];
        const ids = [...(state.ownerIds.get(normalizedOwner) || [])];
        const removed = [];
        for (const id of ids) {
            const definition = state.definitions.get(id);
            if (!definition || definition.owner !== normalizedOwner) continue;
            state.definitions.delete(id);
            removed.push(id);
            for (const [alias, aliasId] of [...state.aliases.entries()]) {
                if (aliasId === id) state.aliases.delete(alias);
            }
        }
        state.ownerIds.delete(normalizedOwner);
        return removed;
    },

    ensure(app) {
        const state = this._state(app);
        if (state.coreLoaded) return state;
        state.coreLoaded = true;
        try {
            for (const [legacyName, definition] of Object.entries(app.ITEMS || {})) {
                if (!definition?.id) continue;
                this._register(app, this.CORE_OWNER, {
                    ...definition,
                    name: definition?.name || legacyName
                }, [legacyName]);
            }
        } catch (error) {
            state.coreLoaded = false;
            throw error;
        }
        return state;
    },

    definition(app, itemOrId) {
        const state = this.ensure(app);
        const directId = typeof itemOrId === 'string'
            ? (String(itemOrId).includes(':') ? itemOrId : null)
            : itemOrId?.definitionId || itemOrId?.itemDefId || itemOrId?.definition?.id;
        if (directId) {
            const normalized = String(directId).trim().toLowerCase();
            const direct = state.definitions.get(normalized);
            if (direct) return direct;
            // A saved stable identity must never be reinterpreted through a
            // coincidentally matching legacy display name while its provider
            // is unavailable.
            return {};
        }
        const legacyName = typeof itemOrId === 'string' ? itemOrId : itemOrId?.name;
        const aliasId = legacyName ? state.aliases.get(String(legacyName).trim()) : null;
        if (aliasId) return state.definitions.get(aliasId) || {};
        return legacyName ? app.ITEMS?.[String(legacyName).trim()] || {} : {};
    },

    definitionId(app, itemOrId) {
        return this.definition(app, itemOrId).id || null;
    },

    isAvailable(app, itemOrId) {
        return Boolean(this.definition(app, itemOrId).id);
    },

    normalizeInstance(app, item) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
        const definition = this.definition(app, item);
        if (!definition.id) return { ...item };
        const quantity = definition.stackable
            ? Math.max(1, Math.min(definition.maxStack, Math.floor(Number(item.quantity) || 1)))
            : 1;
        const normalized = {
            ...item,
            definitionId: definition.id,
            name: item.name || definition.name
        };
        if (definition.stackable) normalized.quantity = quantity;
        else delete normalized.quantity;
        return normalized;
    },

    createInstance(app, itemOrId, instance = {}) {
        const source = instance && typeof instance === 'object' && !Array.isArray(instance)
            ? { ...instance }
            : {};
        const definition = this.definition(app, itemOrId);
        const fallbackName = typeof itemOrId === 'string' ? itemOrId : itemOrId?.name;
        if (!definition.id) {
            return {
                ...source,
                ...(fallbackName && !source.name ? { name: String(fallbackName) } : {})
            };
        }
        const created = {
            ...source,
            definitionId: definition.id,
            name: source.name || definition.name
        };
        if (definition.stackable) {
            created.quantity = Math.max(1, Math.floor(Number(source.quantity) || 1));
        } else {
            delete created.quantity;
        }
        return created;
    },

    normalizeCollection(app, items) {
        const normalized = [];
        for (const item of Array.isArray(items) ? items : []) {
            const current = this.normalizeInstance(app, item);
            const definition = this.definition(app, current);
            if (!definition.stackable) {
                normalized.push(current);
                continue;
            }
            let remaining = Math.max(1, Math.floor(Number(current.quantity) || 1));
            for (const stack of normalized) {
                if (remaining <= 0) break;
                if (stack.definitionId !== definition.id) continue;
                const available = definition.maxStack - Math.max(1, Number(stack.quantity) || 1);
                if (available <= 0) continue;
                const moved = Math.min(available, remaining);
                stack.quantity = Math.max(1, Number(stack.quantity) || 1) + moved;
                remaining -= moved;
            }
            let suffix = 0;
            while (remaining > 0) {
                const quantity = Math.min(definition.maxStack, remaining);
                normalized.push({
                    ...current,
                    id: suffix === 0 ? current.id : `${current.id || definition.id.replace(':', '_')}_${suffix}`,
                    quantity
                });
                remaining -= quantity;
                suffix += 1;
            }
        }
        return normalized;
    },

    normalizeEquipment(app, equipment) {
        if (!equipment || typeof equipment !== 'object' || Array.isArray(equipment)) return {};
        return Object.fromEntries(Object.entries(equipment).map(([slot, item]) => [
            slot,
            item ? this.normalizeInstance(app, item) : null
        ]));
    },

    quantity(item) {
        return Math.max(1, Math.floor(Number(item?.quantity) || 1));
    },

    capacityUsed(items) {
        return Array.isArray(items) ? items.length : 0;
    },

    canAccept(app, items, itemOrId, quantity = 1, capacity = Infinity) {
        const definition = this.definition(app, itemOrId);
        const requested = Math.max(1, Math.floor(Number(quantity) || 1));
        const collection = Array.isArray(items) ? items : [];
        const freeSlots = Math.max(0, Number(capacity) - collection.length);
        if (!definition.stackable) return freeSlots >= requested;
        const openStackSpace = collection.reduce((total, item) => {
            if (item?.definitionId !== definition.id) return total;
            return total + Math.max(0, definition.maxStack - this.quantity(item));
        }, 0);
        return openStackSpace + freeSlots * definition.maxStack >= requested;
    },

    addToCollection(app, items, itemOrId, instance = {}, capacity = Infinity) {
        if (!Array.isArray(items)) throw new Error('Item collection must be an array');
        const created = this.createInstance(app, itemOrId, instance);
        const definition = this.definition(app, created);
        let remaining = this.quantity(created);
        let added = 0;
        if (definition.stackable) {
            for (const stack of items) {
                if (remaining <= 0) break;
                if (stack?.definitionId !== definition.id) continue;
                const available = definition.maxStack - this.quantity(stack);
                if (available <= 0) continue;
                const moved = Math.min(available, remaining);
                stack.quantity = this.quantity(stack) + moved;
                remaining -= moved;
                added += moved;
            }
        }
        let suffix = 0;
        while (remaining > 0 && items.length < capacity) {
            const moved = definition.stackable ? Math.min(definition.maxStack, remaining) : 1;
            items.push({
                ...created,
                id: suffix === 0 ? created.id : `${created.id || definition.id?.replace(':', '_') || 'item'}_${suffix}`,
                ...(definition.stackable ? { quantity: moved } : {})
            });
            remaining -= moved;
            added += moved;
            suffix += 1;
        }
        return { added, remaining, item: items.find(item => item.id === created.id) || null };
    },

    removeFromCollection(app, items, itemId, quantity = 1) {
        if (!Array.isArray(items)) return null;
        const index = items.findIndex(item => String(item?.id) === String(itemId));
        if (index < 0) return null;
        const item = items[index];
        const definition = this.definition(app, item);
        const requested = Math.max(1, Math.floor(Number(quantity) || 1));
        const available = definition.stackable ? this.quantity(item) : 1;
        const removed = Math.min(requested, available);
        if (definition.stackable && available > removed) item.quantity = available - removed;
        else items.splice(index, 1);
        return { item: { ...item, ...(definition.stackable ? { quantity: removed } : {}) }, removed };
    },

    list(app) {
        return [...this.ensure(app).definitions.values()];
    }
};

if (typeof window !== 'undefined') {
    window.YAW_ITEM_REGISTRY = YAW_ITEM_REGISTRY;
}
