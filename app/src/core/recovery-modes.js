/**
 * YOU ARE WILD RECOVERY MODE V1
 * Bounded, namespaced, declarative terminal-recovery profiles.
 */

const YAW_RECOVERY_MODES = {
    VERSION: 1,
    MAX_PROFILES: 64,
    DEFAULT_KEY: 'core:regenerate',
    ENTRY: new Set(['defeat-site', 'safe-anchor']),
    RESOLUTION: new Set(['immediate', 'shrine']),
    INVENTORY: new Set(['settings', 'death-bag', 'retain']),
    TRAVERSAL: new Set(['normal', 'ethereal']),
    RESTRICTIONS: new Set(['combat', 'inventory', 'hunger', 'interactions', 'recruitment', 'structures']),
    profiles: new Map(),

    _token(value, label = 'Recovery mode id') {
        const token = String(value || '').trim();
        if (!token || token.length > 96 || !/^[a-zA-Z0-9_.:-]+$/.test(token)) {
            throw new Error(`${label} must be a bounded token`);
        }
        return token;
    },

    key(owner, localId) {
        return `${this._token(owner, 'Recovery mode owner')}:${this._token(localId)}`;
    },

    _object(value, field, allowed) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`Recovery mode ${field} must be an object`);
        }
        for (const key of Object.keys(value)) {
            if (!allowed.includes(key)) throw new Error(`Recovery mode ${field} contains unsupported field ${key}`);
        }
        return value;
    },

    _string(value, fallback, limit, field) {
        const text = String(value === undefined ? fallback : value).trim();
        if (!text || text.length > limit) throw new Error(`Recovery mode ${field} must be 1 to ${limit} characters`);
        return text;
    },

    _enum(value, fallback, allowed, field) {
        const token = String(value === undefined ? fallback : value);
        if (!allowed.has(token)) throw new Error(`Recovery mode ${field} must be one of: ${[...allowed].join(', ')}`);
        return token;
    },

    _restrictions(value) {
        if (value === undefined) return [];
        if (!Array.isArray(value) || value.length > this.RESTRICTIONS.size) {
            throw new Error('Recovery mode restrictions must be a bounded array');
        }
        const restrictions = [...new Set(value.map(item => String(item || '').trim()))];
        for (const restriction of restrictions) {
            if (!this.RESTRICTIONS.has(restriction)) {
                throw new Error(`Recovery mode restriction must be one of: ${[...this.RESTRICTIONS].join(', ')}`);
            }
        }
        return restrictions;
    },

    _deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        for (const child of Object.values(value)) this._deepFreeze(child);
        return Object.freeze(value);
    },

    normalizeProfile(owner, localId, definition = {}) {
        const value = this._object(definition, 'definition', [
            'label', 'labelKey', 'description', 'descriptionKey', 'icon',
            'entry', 'resolution', 'inventory', 'traversal', 'restrictions', 'vitalityPercent'
        ]);
        const normalizedOwner = this._token(owner, 'Recovery mode owner');
        const id = this._token(localId);
        const labelKey = value.labelKey ? this._token(value.labelKey, 'Recovery mode label key') : '';
        const descriptionKey = value.descriptionKey ? this._token(value.descriptionKey, 'Recovery mode description key') : '';
        if (normalizedOwner !== 'core' && labelKey && !labelKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Recovery mode labelKey must use the owning module namespace');
        }
        if (normalizedOwner !== 'core' && descriptionKey && !descriptionKey.startsWith(`${normalizedOwner}.`)) {
            throw new Error('Recovery mode descriptionKey must use the owning module namespace');
        }
        const resolution = this._enum(value.resolution, 'immediate', this.RESOLUTION, 'resolution');
        const restrictions = this._restrictions(value.restrictions);
        if (resolution === 'shrine' && !restrictions.includes('combat')) {
            throw new Error('Shrine recovery must restrict combat while recovery is pending');
        }
        const vitalityPercent = value.vitalityPercent === undefined ? 1 : Number(value.vitalityPercent);
        if (!Number.isInteger(vitalityPercent) || vitalityPercent < 1 || vitalityPercent > 100) {
            throw new Error('Recovery mode vitalityPercent must be an integer from 1 to 100');
        }
        return this._deepFreeze({
            version: this.VERSION,
            id,
            key: this.key(normalizedOwner, id),
            owner: normalizedOwner,
            label: this._string(value.label, id, 80, 'label'),
            labelKey,
            description: value.description ? this._string(value.description, '', 320, 'description') : '',
            descriptionKey,
            icon: value.icon ? this._string(value.icon, '✨', 16, 'icon') : '✨',
            entry: this._enum(value.entry, resolution === 'shrine' ? 'defeat-site' : 'safe-anchor', this.ENTRY, 'entry'),
            resolution,
            inventory: this._enum(value.inventory, 'settings', this.INVENTORY, 'inventory'),
            traversal: this._enum(value.traversal, resolution === 'shrine' ? 'ethereal' : 'normal', this.TRAVERSAL, 'traversal'),
            restrictions,
            vitalityPercent
        });
    },

    register(owner, localId, definition = {}) {
        if (this.profiles.size >= this.MAX_PROFILES) throw new Error('Recovery mode profile limit reached');
        const profile = this.normalizeProfile(owner, localId, definition);
        if (this.profiles.has(profile.key)) throw new Error(`Recovery mode ${profile.key} is already registered`);
        this.profiles.set(profile.key, profile);
        return profile;
    },

    unregisterOwner(owner, app = null) {
        const normalizedOwner = this._token(owner, 'Recovery mode owner');
        const removed = new Set();
        for (const [key, profile] of [...this.profiles.entries()]) {
            if (profile.owner !== normalizedOwner) continue;
            this.profiles.delete(key);
            removed.add(key);
        }
        if (app?.settings && removed.has(app.settings.recoveryMode)) {
            app.settings.recoveryMode = this.DEFAULT_KEY;
            app.saveSettings?.();
        }
        if (app?.defeatState?.pending && removed.has(app.defeatState.recoveryModeKey)) {
            app.closeIntentMenu?.();
            app.feedSelection = null;
            app.combatPlanSelection = null;
            app.targetSelection = null;
            app.defeatState.recoveryModeKey = this.DEFAULT_KEY;
            app.defeatState.recoveryPhase = 'prompt';
            app.defeatState.status = 'dead';
            if (typeof YAW_DEFEAT_RECOVERY !== 'undefined') {
                YAW_DEFEAT_RECOVERY.fallbackFromUnavailableMode?.(app);
            }
        }
        return removed.size;
    },

    profile(key) {
        return this.profiles.get(String(key || '')) || null;
    },

    selectedKey(app) {
        const requested = String(app?.settings?.recoveryMode || this.DEFAULT_KEY);
        return this.profiles.has(requested) ? requested : this.DEFAULT_KEY;
    },

    selected(app) {
        return this.profile(this.selectedKey(app)) || this.profile(this.DEFAULT_KEY);
    },

    forState(app, state = app?.defeatState) {
        const key = String(state?.recoveryModeKey || this.selectedKey(app));
        return this.profile(key) || this.profile(this.DEFAULT_KEY);
    },

    available() {
        return [...this.profiles.values()];
    },

    label(app, profile) {
        if (!profile) return '';
        return profile.labelKey && app?._label ? app._label(profile.labelKey, profile.label) : profile.label;
    },

    description(app, profile) {
        if (!profile) return '';
        return profile.descriptionKey && app?._label
            ? app._label(profile.descriptionKey, profile.description || this.label(app, profile))
            : profile.description;
    },

    isJourney(app) {
        return Boolean(app?.defeatState?.pending
            && app.defeatState.status === 'recovering'
            && app.defeatState.recoveryPhase === 'journey'
            && this.forState(app, app.defeatState)?.resolution === 'shrine');
    },

    restricts(app, capability) {
        if (!this.isJourney(app)) return false;
        return this.forState(app, app.defeatState)?.restrictions?.includes(String(capability || '')) || false;
    },

    guard(app, capability, context = {}) {
        const blockedCapability = String(capability || '');
        if (!this.restricts(app, blockedCapability)) return true;
        const text = app?._label?.(
            'recovery.actionRestricted',
            'A ghost cannot use ordinary physical or social interactions before resurrection.'
        ) || 'A ghost cannot use ordinary physical or social interactions before resurrection.';
        app?._pushLog?.(text, 'discovery', {
            action: String(context.action || blockedCapability || 'recovery'),
            phase: 'recovery-restricted'
        });
        app?.showToast?.({
            text,
            type: 'blocked',
            importance: 'notable',
            dedupeKey: `recovery-restricted:${blockedCapability}`
        });
        app?._showRecoveryJourney?.();
        app?.renderLog?.();
        return false;
    }
};

YAW_RECOVERY_MODES.register('core', 'regenerate', {
    label: 'Regenerate',
    labelKey: 'recovery.mode.regenerate',
    description: 'Return alone to your safe place and apply the selected inventory policy.',
    descriptionKey: 'recovery.mode.regenerate.description',
    icon: '✨',
    entry: 'safe-anchor',
    resolution: 'immediate',
    inventory: 'settings',
    traversal: 'normal',
    restrictions: [],
    vitalityPercent: 1
});

YAW_RECOVERY_MODES.register('core', 'ghost', {
    label: 'Ghost pilgrimage',
    labelKey: 'recovery.mode.ghost',
    description: 'Rise at the defeat site as a harmless ghost and return to your safe place to resurrect.',
    descriptionKey: 'recovery.mode.ghost.description',
    icon: '👻',
    entry: 'defeat-site',
    resolution: 'shrine',
    inventory: 'settings',
    traversal: 'ethereal',
    restrictions: ['combat', 'inventory', 'hunger', 'interactions', 'recruitment', 'structures'],
    vitalityPercent: 1
});

if (typeof window !== 'undefined') {
    window.YAW_RECOVERY_MODES = YAW_RECOVERY_MODES;
}
