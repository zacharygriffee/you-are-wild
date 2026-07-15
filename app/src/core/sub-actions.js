/**
 * YOU ARE WILD SUB-ACTIONS
 * Shared registry helpers for primary action variants and safe labels.
 */

const YAW_SUB_ACTIONS = {
    definitions: {
        feast: {
            swallow: { label: 'Swallow', sfwLabel: 'Eat', icon: '🍽️', validate: (a, t) => App._canFitPrey(a, t, 'stomach') && (t.CPun <= t.MPun * 0.3 || (a.Feas > t.Flee && a.size >= t.size - 2)), execute: 'swallowWhole', setting: null },
            chew: { label: 'Chew', sfwLabel: 'Break Down', icon: '🦷', validate: () => App.settings.chewing, execute: 'chewPrey', setting: 'chewing' },
            cockVore: { label: 'Capture', sfwLabel: 'Capture', icon: '📦', validate: (a, t) => App.settings.cockVoreEnabled && a.parts === 'cock' && App._canFitPrey(a, t, 'balls'), execute: 'cockVore', setting: 'cockVoreEnabled' },
            unbirth: { label: 'Engulf', sfwLabel: 'Engulf', icon: '🔮', validate: (a, t) => App.settings.unbirthEnabled && a.parts === 'clit' && App._canFitPrey(a, t, 'womb'), execute: 'unbirth', setting: 'unbirthEnabled' },
            digest: { label: 'Digest', sfwLabel: 'Break Down', icon: '💀', validate: (a) => App._activeContainedPrey?.(a, 'stomach')?.length > 0, execute: 'digestPrey', setting: null },
            release: { label: 'Release', sfwLabel: 'Free', icon: '⬆️', validate: (a) => App._activeContainedPrey?.(a, 'stomach')?.some(p => p.releaseEligible), execute: 'releasePrey', setting: null }
        },
        feed: {
            heal: { label: 'Heal', sfwLabel: 'Tend', icon: '💚', validate: (a, t) => t.CPun < t.MPun, execute: 'healAlly', setting: null },
            breastfeed: { label: 'Nurse', sfwLabel: 'Nurse', icon: '🥛', validate: (a) => a.lactating && !a.lactationCooldown, execute: 'breastfeed', setting: null },
            sacrifice: { label: 'Sacrifice', sfwLabel: 'Offer', icon: '🐄', validate: (a, t) => (t.livestock || t.willingPrey) && a.size >= t.size - 2 && App._canFitPrey(a, t, 'stomach'), execute: 'sacrificeTo', setting: null },
            forceFeed: { label: 'Force Feed', sfwLabel: 'Force Feed', icon: '🔗', validate: (a, t, h) => App.settings.forcedFeeding && h && h.length > 0 && a.size >= t.size - 2 && App._canFitPrey(a, t, 'stomach'), execute: 'forceFeed', setting: 'forcedFeeding' },
            slurp: { label: 'Slurp', sfwLabel: 'Draw', icon: '💧', validate: (a, t) => t.slurpable, execute: 'slurpPortion', setting: null },
            fragment: { label: 'Break Off', sfwLabel: 'Chip', icon: '🍫', validate: (a, t) => t.breakable, execute: 'fragmentPortion', setting: null }
        },
        fight: {
            attack: { label: 'Attack', sfwLabel: 'Attack', icon: '⚔️', validate: () => true, execute: 'attack', setting: null },
            disarm: { label: 'Disarm', sfwLabel: 'Disarm', icon: '🗡️', validate: (a, t) => a.Figh > t.Figh, execute: 'disarm', setting: null },
            grapple: { label: 'Grapple', sfwLabel: 'Grapple', icon: '🤼', validate: (a, t) => a.str > t.spd, execute: 'grapple', setting: null }
        },
        fuck: {
            seduce: { label: 'Seduce', sfwLabel: 'Play', icon: '💕', validate: () => true, execute: 'seduce', setting: null },
            dominate: { label: 'Dominate', sfwLabel: 'Overpower', icon: '⛓️', validate: (a, t) => App.settings.powerDynamics && a.Fuck > t.Fuck, execute: 'dominate', setting: 'powerDynamics' },
            submit: { label: 'Submit', sfwLabel: 'Yield', icon: '🙇', validate: (a, t) => App.settings.powerDynamics && a.Fuck < t.Fuck, execute: 'submit', setting: 'powerDynamics' }
        },
        flirt: {
            tease: { label: 'Tease', sfwLabel: 'Talk', icon: '😘', validate: () => true, execute: 'tease', setting: null },
            gift: { label: 'Gift', sfwLabel: 'Gift', icon: '🎁', validate: (a) => a.inventory && a.inventory.length > 0, execute: 'gift', setting: null },
            dance: { label: 'Dance', sfwLabel: 'Dance', icon: '💃', validate: () => true, execute: 'dance', setting: null }
        },
        flee: {
            run: { label: 'Run', sfwLabel: 'Flee', icon: '🏃', validate: () => true, execute: 'run', setting: null },
            retreat: { label: 'Retreat', sfwLabel: 'Retreat', icon: '🛡️', validate: (a) => a.party && a.party.length > 1, execute: 'retreatCover', setting: null },
            surrender: { label: 'Surrender', sfwLabel: 'Surrender', icon: '🏳️', validate: () => true, execute: 'surrender', setting: null }
        }
    },

    defaults: { feast: 'swallow', feed: 'heal', fight: 'attack', fuck: 'seduce', flirt: 'tease', flee: 'run' },

    defaultActions() {
        return { ...this.defaults };
    },

    getDefault(app, action) {
        return app.defaultSubActions[action] || action;
    },

    available(app, action, actor, target) {
        const subDefs = app.SUB_ACTIONS[action];
        if (!subDefs) return [];
        const holder = app.party.filter(p => p !== actor && p !== target && p.CPun > 0);
        return Object.entries(subDefs).map(([id, def]) => ({
            id,
            label: app._getActionLabel(action, id),
            icon: def.icon,
            available: this.isAvailable(app, def, actor, target, holder),
            setting: def.setting
        }));
    },

    isAvailable(app, def, actor, target, holder = []) {
        if (!def || typeof def.validate !== 'function') return false;
        try {
            return !!def.validate(actor, target, holder);
        } catch (error) {
            return false;
        }
    },

    label(app, action, subAction) {
        const legacyExplicit = CONTENT.preferences.maxTier >= 2 && CONTENT.preferences.explicitDescriptions === true;
        const isSFW = CONTENT?.isCategoryEnabled?.('explicit.sexual') !== true && !legacyExplicit;
        const subDefs = app.SUB_ACTIONS[action];
        if (!subDefs || !subDefs[subAction]) return subAction;
        const fallback = isSFW ? (subDefs[subAction].sfwLabel || subDefs[subAction].label) : subDefs[subAction].label;
        return isSFW ? fallback : app._label(`subaction.${action}.${subAction}`, fallback);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SUB_ACTIONS = YAW_SUB_ACTIONS;
}
