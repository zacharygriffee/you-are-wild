/**
 * YOU ARE WILD ITEM EFFECTS V1
 * Bounded declarative item mechanics. Core owns validation and mutation.
 */

const YAW_ITEM_EFFECTS = {
    VERSION: 1,
    EFFECTS: new Set(['heal']),

    validateDefinition(definition, options = {}) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new Error('Item effect definition must be an object');
        }
        const effect = String(definition.effect || '').trim();
        const inert = ['', 'sell', 'craft'].includes(effect);
        if (inert) return { effect: effect || null, actionable: false };
        if (!this.EFFECTS.has(effect)) {
            throw new Error(`Unsupported item effect: ${effect}`);
        }
        if (effect === 'heal') {
            const amount = Number(definition.healAmount);
            if (!Number.isFinite(amount) || amount < 1 || amount > 100) {
                throw new Error('Healing item healAmount must be between 1 and 100');
            }
            if (options.module && definition.type !== 'consumable') {
                throw new Error('Module healing items must use type consumable');
            }
            return { effect, actionable: true, amount: Math.floor(amount) };
        }
        throw new Error(`Unsupported item effect: ${effect}`);
    },

    canResolve(definition) {
        try {
            return this.validateDefinition(definition).actionable === true;
        } catch (_error) {
            return false;
        }
    },

    resolve(app, item, context = {}) {
        const definition = app._getItemDef(item);
        const contract = this.validateDefinition(definition);
        if (!contract.actionable) return { ok: false, code: 'not-actionable', effect: contract.effect };
        if (contract.effect === 'heal') {
            const target = context.target;
            if (!target || Number(target.CPun) <= 0) return { ok: false, code: 'invalid-target', effect: contract.effect };
            const current = Math.max(0, Number(target.CPun) || 0);
            const maximum = Math.max(1, Number(target.MPun) || current || 1);
            if (current >= maximum) return { ok: false, code: 'full-condition', effect: contract.effect };
            const amount = Math.min(contract.amount, maximum - current);
            target.CPun = current + amount;
            return {
                ok: true,
                code: 'resolved',
                effect: contract.effect,
                amount,
                before: current,
                after: target.CPun,
                maximum,
                target
            };
        }
        return { ok: false, code: 'not-actionable', effect: contract.effect };
    }
};

if (typeof window !== 'undefined') {
    window.YAW_ITEM_EFFECTS = YAW_ITEM_EFFECTS;
}
