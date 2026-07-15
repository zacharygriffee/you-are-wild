/**
 * YOU ARE WILD SETTINGS FLOW
 * Safe content tier, localization, accessibility, and settings persistence helpers.
 */

const YAW_SETTINGS_FLOW = {
    updateTierButtons(app) {
        const btns = { sfw: 'tier-safe', mature: 'tier-mature' };
        const posture = CONTENT?.preferences?.posture || (CONTENT?.preferences?.maxTier >= 1 ? 'mature' : 'sfw');
        for (const [tier, id] of Object.entries(btns)) {
            const el = document.getElementById(id);
            if (el) {
                const selected = posture === tier;
                el.style.background = selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)';
                el.style.color = selected ? 'var(--bg-primary)' : 'var(--text-secondary)';
                el.setAttribute('aria-pressed', selected ? 'true' : 'false');
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
            statAbsorption: false, refractoryPeriod: false,
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
        const normalized = String(tier || '').toLowerCase();
        if ((normalized === 'safe' || normalized === 'sfw' || normalized === 'mature') && CONTENT?.setPosture) {
            CONTENT.setPosture(normalized === 'mature' ? 'mature' : 'sfw');
        } else {
            CONTENT.setMaxTier(app._tierValue(tier));
        }
        app.enforceContentTierSettings();
        app.enforceModuleContentPolicy();
        app.syncSettingVisibility();
        app.syncCreateContentLevel();
        app.saveSettings();
        if (typeof YAW_NARRATION_SYSTEM !== 'undefined') YAW_NARRATION_SYSTEM.notifyPolicyChanged(app, 'posture');
        return app.renderContentPolicySettings();
    },

    enforceContentTierSettings(app) {
        const posture = CONTENT?.preferences?.posture || (app._tierValue(CONTENT?.preferences?.maxTier) >= 1 ? 'mature' : 'sfw');
        const matureSettings = ['fatalVore', 'statAbsorption', 'chewing', 'allTheWayThrough', 'powerDynamics', 'forcedFeeding', 'boneCrushing', 'unwillingWarnings'];
        const explicitSettings = ['fluidEnabled', 'scat', 'watersports', 'cockVoreEnabled', 'unbirthEnabled', 'refractoryPeriod'];
        const explicitAllowed = CONTENT?.isCategoryEnabled?.('explicit.sexual') === true;
        if (!explicitAllowed) {
            CONTENT.setPreference('explicitDescriptions', false);
            explicitSettings.forEach(key => { app.settings[key] = false; });
        }
        if (posture !== 'mature') {
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
        const posture = CONTENT?.preferences?.posture || (app._tierValue(CONTENT?.preferences?.maxTier) >= 1 ? 'mature' : 'sfw');
        document.querySelectorAll('[data-setting-tier]').forEach(el => {
            const required = String(el.dataset.settingTier || 'safe').toLowerCase();
            const visible = required === 'safe' || required === 'sfw' || posture === 'mature';
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
        const tierName = CONTENT?.preferences?.posture || (app._tierValue(CONTENT?.preferences?.maxTier) >= 1 ? 'mature' : 'sfw');
        const labelKey = tierName === 'sfw' ? 'settings.safe' : 'settings.mature';
        const fallback = tierName === 'sfw' ? 'SFW' : 'Mature';
        label.textContent = app._label(labelKey, fallback);
    },

    async renderContentPolicySettings(app) {
        if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM?.syncContentPolicyProviders) {
            await MODULE_SYSTEM.syncContentPolicyProviders();
        }
        const catalog = CONTENT?.policyCatalog?.() || { categories: [], variants: [] };
        const categorySection = document.getElementById('settings-content-categories');
        const categoryList = document.getElementById('settings-content-category-list');
        const variantSection = document.getElementById('settings-gameplay-variants');
        const variantList = document.getElementById('settings-gameplay-variant-list');
        const escape = value => app._escapeHtml(String(value ?? ''));
        const posture = CONTENT?.preferences?.posture || 'sfw';

        if (categorySection && categoryList) {
            categorySection.hidden = catalog.categories.length === 0;
            categoryList.innerHTML = catalog.categories.map(category => {
                const providers = category.providers.map(provider => provider.name).join(', ');
                const label = category.labelKey ? app._label(category.labelKey, category.label) : category.label;
                const description = category.descriptionKey ? app._label(category.descriptionKey, category.description) : category.description;
                const providerText = app._label('settings.categoryProviders', 'Required by {providers}', { providers });
                return `<label class="settings-policy-row">
                    <span class="settings-policy-copy"><strong>${escape(label)}</strong>${description ? `<span>${escape(description)}</span>` : ''}<small>${escape(providerText)}</small></span>
                    <input type="checkbox" data-command-surface="settings-detail" data-command-mode="system" data-command-control="toggle-content-category" data-content-category="${escape(category.id)}" ${CONTENT.isCategoryEnabled(category.id) ? 'checked' : ''} onchange="App.setContentCategory('${escape(category.id)}',this.checked)">
                </label>`;
            }).join('');
        }

        if (variantSection && variantList) {
            const visibleVariants = catalog.variants.filter(variant => (
                variant.minPosture !== 'mature' || posture === 'mature'
            ) && variant.providers.some(provider => provider.core || provider.enabled));
            variantSection.hidden = visibleVariants.length === 0;
            variantList.innerHTML = visibleVariants.map(variant => {
                const providers = variant.providers.map(provider => provider.name).join(', ');
                const label = variant.labelKey ? app._label(variant.labelKey, variant.label) : variant.label;
                const description = variant.descriptionKey ? app._label(variant.descriptionKey, variant.description) : variant.description;
                const providerText = app._label('settings.variantProviders', 'Provided by {providers}', { providers });
                const checked = variant.settingKey
                    ? app.settings[variant.settingKey] === true
                    : CONTENT.preferences.gameplayVariants[variant.id] === true;
                return `<label class="settings-policy-row">
                    <span class="settings-policy-copy"><strong>${escape(label)}</strong>${description ? `<span>${escape(description)}</span>` : ''}<small>${escape(providerText)}</small></span>
                    <input type="checkbox" data-command-surface="settings-detail" data-command-mode="system" data-command-control="toggle-gameplay-variant" data-gameplay-variant="${escape(variant.id)}" ${checked ? 'checked' : ''} onchange="App.setGameplayVariant('${escape(variant.id)}',this.checked)">
                </label>`;
            }).join('');
        }
    },

    setContentCategory(app, categoryId, enabled) {
        CONTENT.setCategoryEnabled(categoryId, enabled);
        app.enforceContentTierSettings();
        app.enforceModuleContentPolicy();
        app.saveSettings();
        if (typeof YAW_NARRATION_SYSTEM !== 'undefined') YAW_NARRATION_SYSTEM.notifyPolicyChanged(app, 'content-category');
        return this.renderContentPolicySettings(app);
    },

    setGameplayVariant(app, variantId, enabled) {
        const variant = CONTENT.policyCatalog().variants.find(entry => entry.id === variantId);
        if (!variant) return false;
        CONTENT.setGameplayVariant(variantId, enabled);
        if (variant.settingKey && Object.prototype.hasOwnProperty.call(app.settings, variant.settingKey)) {
            app.settings[variant.settingKey] = enabled === true;
        }
        app.saveSettings();
        if (typeof YAW_NARRATION_SYSTEM !== 'undefined') YAW_NARRATION_SYSTEM.notifyPolicyChanged(app, 'gameplay-variant');
        return true;
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
        app.renderLog();
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
        const hardcore = document.getElementById('toggle-hardcore');
        if (hardcore) hardcore.checked = app.settings.hardcore;
        app.updateTierButtons();
        void this.renderContentPolicySettings(app);
        app.updateCheatButtons();
        app.applyAccessibilitySettings();
        app.syncAccessibilityControls();
        app.syncLanguageControl();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SETTINGS_FLOW = YAW_SETTINGS_FLOW;
}
