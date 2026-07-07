/**
 * YOU ARE WILD SETTINGS FLOW
 * Safe content tier, localization, accessibility, and settings persistence helpers.
 */

const YAW_SETTINGS_FLOW = {
    updateTierButtons(app) {
        const btns = { safe: 'tier-safe', mature: 'tier-mature', adult: 'tier-adult' };
        const tiers = { safe: 0, mature: 1, adult: 2 };
        for (const [tier, id] of Object.entries(btns)) {
            const el = document.getElementById(id);
            if (el) {
                const selected = CONTENT.preferences.maxTier === tiers[tier];
                el.style.background = selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)';
                el.style.color = selected ? 'var(--bg-primary)' : 'var(--text-secondary)';
            }
        }
        app.syncCreateContentLevel();
        app.syncSettingVisibility();
    },

    tierValue(tier) {
        if (typeof tier === 'number') return Math.max(0, Math.min(2, tier));
        return ({ safe: 0, mature: 1, adult: 2 })[tier] ?? 0;
    },

    tierName(app, value = CONTENT.preferences.maxTier) {
        const tier = app._tierValue(value);
        if (tier >= 2) return 'adult';
        if (tier >= 1) return 'mature';
        return 'safe';
    },

    defaultSettings() {
        return {
            powerDynamics: false, endoMode: false, slowDigestion: false,
            fatalVore: false, chewing: false, allTheWayThrough: false,
            hardcore: false, scat: false, watersports: false,
            boneCrushing: false, unwillingWarnings: false,
            statAbsorption: true, refractoryPeriod: false,
            sameSpeciesBonus: false, fluidEnabled: false,
            cockVoreEnabled: false, unbirthEnabled: false, forcedFeeding: false,
            partyPlayFightMode: 'nonlethal',
            highContrast: false, reducedMotion: false, fontSize: 14
        };
    },

    booleanKeys() {
        return [
            'powerDynamics', 'endoMode', 'slowDigestion', 'fatalVore', 'chewing',
            'allTheWayThrough', 'hardcore', 'scat', 'watersports', 'boneCrushing',
            'unwillingWarnings', 'statAbsorption', 'refractoryPeriod', 'sameSpeciesBonus',
            'fluidEnabled', 'cockVoreEnabled', 'unbirthEnabled', 'forcedFeeding',
            'highContrast', 'reducedMotion'
        ];
    },

    normalize(app, input = {}, base = app.settings) {
        const defaults = this.defaultSettings();
        const source = {
            ...defaults,
            ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}),
            ...(input && typeof input === 'object' && !Array.isArray(input) ? input : {})
        };
        const normalized = {};
        for (const key of this.booleanKeys()) {
            normalized[key] = source[key] === true;
        }
        normalized.partyPlayFightMode = ['nonlethal', 'lethal'].includes(source.partyPlayFightMode)
            ? source.partyPlayFightMode
            : defaults.partyPlayFightMode;
        const parsedFontSize = Number(source.fontSize);
        normalized.fontSize = Math.max(12, Math.min(20, Number.isFinite(parsedFontSize) ? Math.round(parsedFontSize) : defaults.fontSize));
        return normalized;
    },

    forStorage(app) {
        app.settings = this.normalize(app, app.settings, this.defaultSettings());
        return { ...app.settings };
    },

    setContentTier(app, tier) {
        const nextTier = app._tierValue(tier);
        CONTENT.setMaxTier(nextTier);
        app.enforceContentTierSettings();
        app.enforceModuleContentPolicy();
        app.syncSettingVisibility();
        app.syncCreateContentLevel();
        app.saveSettings();
    },

    enforceContentTierSettings(app) {
        const tier = app._tierValue(CONTENT?.preferences?.maxTier);
        const matureSettings = ['endoMode', 'fatalVore', 'slowDigestion', 'statAbsorption', 'chewing', 'allTheWayThrough', 'powerDynamics', 'refractoryPeriod', 'sameSpeciesBonus'];
        const adultSettings = ['fluidEnabled', 'scat', 'watersports', 'cockVoreEnabled', 'unbirthEnabled', 'forcedFeeding', 'boneCrushing', 'unwillingWarnings'];
        if (tier < 2) {
            CONTENT.setPreference('explicitDescriptions', false);
            adultSettings.forEach(key => { app.settings[key] = false; });
        }
        if (tier < 1) {
            CONTENT.setPreference('voreEnabled', false);
            matureSettings.forEach(key => { app.settings[key] = false; });
        }
    },

    enforceModuleContentPolicy(app) {
        if (typeof MODULE_SYSTEM === 'undefined' || typeof MODULE_SYSTEM.enforceContentPolicy !== 'function') return;
        MODULE_SYSTEM.enforceContentPolicy().then(disabled => {
            if (!disabled || disabled.length === 0) return;
            const names = disabled.map(mod => mod?.manifest?.name || mod?.id).filter(Boolean).join(', ');
            app.log.push({ text: app._label('mod.disabledByContentPolicy', 'Disabled {count} module(s) blocked by current content settings: {names}', { count: disabled.length, names }), type: 'mod' });
            app.renderLog();
            if (typeof ModUI !== 'undefined' && typeof ModUI.refreshModList === 'function') {
                ModUI.refreshModList();
            }
        }).catch(e => {
            console.error('Failed to enforce module content policy:', e);
        });
    },

    syncSettingVisibility(app) {
        const current = app._tierValue(CONTENT?.preferences?.maxTier);
        document.querySelectorAll('[data-setting-tier]').forEach(el => {
            const required = app._tierValue(el.dataset.settingTier);
            const visible = required <= current;
            el.style.display = visible ? '' : 'none';
            if (!visible) {
                el.querySelectorAll('input, select, button, textarea').forEach(control => {
                    control.disabled = true;
                });
            } else {
                el.querySelectorAll('input, select, button, textarea').forEach(control => {
                    control.disabled = false;
                });
            }
        });
    },

    syncCreateContentLevel(app) {
        if (typeof YAW_CREATE_FLOW !== 'undefined' && YAW_CREATE_FLOW?.syncTierGates) {
            YAW_CREATE_FLOW.syncTierGates(app);
        }
        const label = document.getElementById('create-content-level-label');
        if (!label) return;
        const tierName = app._tierName();
        const labelKey = `settings.${tierName}`;
        const fallback = tierName.charAt(0).toUpperCase() + tierName.slice(1);
        label.textContent = app._label(labelKey, fallback);
    },

    openContentSettingsFromCreate(app) {
        app.settingsReturnScreen = 'create';
        app.showScreen('settings');
        app.showSettings();
        const target = document.getElementById('settings-content-level');
        if (!target) return;
        target.classList.add('settings-focus');
        try {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
            target.scrollIntoView();
        }
        clearTimeout(app._settingsFocusTimer);
        app._settingsFocusTimer = setTimeout(() => target.classList.remove('settings-focus'), 1600);
    },

    openSettingsFromMenu(app) {
        app.settingsReturnScreen = 'menu';
        app.showScreen('settings');
        app.showSettings();
    },

    openSettingsFromGame(app) {
        app.settingsReturnScreen = 'game';
        app.closeAppMenu?.();
        app.showScreen('settings');
        app.showSettings();
    },

    save(app) {
        app._setStoredValue('settings', JSON.stringify(app._settingsForStorage()));
        if (CONTENT?.preferences) {
            app._setStoredValue('contentPrefs', JSON.stringify(CONTENT.preferences));
        }
        app.updateTierButtons();
    },

    updateLanguage(app, language) {
        if (CONTENT?.setLanguage) {
            CONTENT.setLanguage(language);
        } else if (CONTENT?.preferences) {
            CONTENT.preferences.language = language;
        }
        app.saveSettings();
        app.syncLanguageControl();
        app.applyStaticLocalization();
        app.renderExplorationActions();
        app.renderParty();
        app.renderCreatures();
    },

    syncLanguageControl() {
        const language = document.getElementById('setting-language');
        if (language) language.value = CONTENT?.preferences?.language || 'en';
    },

    updateAccessibilitySetting(app, key, value) {
        if (key === 'fontSize') {
            const parsed = Number(value);
            app.settings.fontSize = Math.max(12, Math.min(20, Number.isFinite(parsed) ? parsed : 14));
        } else if (key === 'highContrast' || key === 'reducedMotion') {
            app.settings[key] = Boolean(value);
        } else {
            return;
        }
        app.applyAccessibilitySettings();
        app.syncAccessibilityControls();
        app.saveSettings();
    },

    applyAccessibilitySettings(app) {
        const body = document.body;
        if (!body) return;
        const fontSize = Math.max(12, Math.min(20, Number(app.settings.fontSize) || 14));
        body.classList.toggle('high-contrast', Boolean(app.settings.highContrast));
        body.classList.toggle('reduced-motion', Boolean(app.settings.reducedMotion));
        if (body.style?.setProperty) {
            body.style.setProperty('--base-font-size', `${fontSize}px`);
        } else {
            body.style['--base-font-size'] = `${fontSize}px`;
            body.style.fontSize = `${fontSize}px`;
        }
    },

    syncAccessibilityControls(app) {
        const highContrast = document.getElementById('setting-high-contrast');
        const reducedMotion = document.getElementById('setting-reduced-motion');
        const fontSize = document.getElementById('setting-font-size');
        const fontSizeValue = document.getElementById('setting-font-size-value');
        const size = Math.max(12, Math.min(20, Number(app.settings.fontSize) || 14));
        if (highContrast) highContrast.checked = Boolean(app.settings.highContrast);
        if (reducedMotion) reducedMotion.checked = Boolean(app.settings.reducedMotion);
        if (fontSize) fontSize.value = String(size);
        if (fontSizeValue) fontSizeValue.textContent = `${size}px`;
    },

    show(app) {
        document.getElementById('screen-settings').style.display = 'block';
        document.getElementById('toggle-vore').checked = CONTENT.preferences.voreEnabled;
        document.getElementById('toggle-explicit').checked = CONTENT.preferences.explicitDescriptions;
        document.getElementById('toggle-endo').checked = app.settings.endoMode;
        document.getElementById('toggle-fatal').checked = app.settings.fatalVore;
        document.getElementById('toggle-slow').checked = app.settings.slowDigestion;
        document.getElementById('toggle-absorb').checked = app.settings.statAbsorption;
        document.getElementById('toggle-chew').checked = app.settings.chewing;
        document.getElementById('toggle-attw').checked = app.settings.allTheWayThrough;
        document.getElementById('toggle-power').checked = app.settings.powerDynamics;
        document.getElementById('toggle-refractory').checked = app.settings.refractoryPeriod;
        document.getElementById('toggle-same').checked = app.settings.sameSpeciesBonus;
        document.getElementById('toggle-fluids').checked = app.settings.fluidEnabled;
        document.getElementById('toggle-scat').checked = app.settings.scat;
        document.getElementById('toggle-ws').checked = app.settings.watersports;
        document.getElementById('toggle-cockVore').checked = app.settings.cockVoreEnabled;
        document.getElementById('toggle-unbirth').checked = app.settings.unbirthEnabled;
        document.getElementById('toggle-forcedFeed').checked = app.settings.forcedFeeding;
        document.getElementById('toggle-bones').checked = app.settings.boneCrushing;
        document.getElementById('toggle-warn').checked = app.settings.unwillingWarnings;
        document.getElementById('toggle-hardcore').checked = app.settings.hardcore;
        app.updateTierButtons();
        app.updateCheatButtons();
        app.applyAccessibilitySettings();
        app.syncAccessibilityControls();
        app.syncLanguageControl();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SETTINGS_FLOW = YAW_SETTINGS_FLOW;
}
