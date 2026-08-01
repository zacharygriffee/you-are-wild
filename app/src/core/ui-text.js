/**
 * YOU ARE WILD UI TEXT
 * Shared localization fallback, escaping, and accessible helper text utilities.
 */

const YAW_UI_TEXT = {
    t(key, vars = {}) {
        return CONTENT?.t ? CONTENT.t(key, vars) : key;
    },

    label(app, key, fallback, vars = {}) {
        const label = app._t(key, vars);
        return label === key ? String(fallback ?? '').replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '') : label;
    },

    mlabel(app, key, fallback, vars = {}) {
        const isMature = (typeof CONTENT !== 'undefined')
            && (CONTENT?.preferences?.posture === 'mature' || Number(CONTENT?.preferences?.maxTier || 0) >= 1);
        if (isMature) {
            const matureKey = key + '.mature';
            const matureLabel = app._t(matureKey, vars);
            if (matureLabel !== matureKey) return matureLabel;
        }
        return this.label(app, key, fallback, vars);
    },

    primaryActionLabel(app, action) {
        const legacyExplicit = CONTENT.preferences.maxTier >= 2 && CONTENT.preferences.explicitDescriptions === true;
        const isSFW = CONTENT?.isCategoryEnabled?.('explicit.sexual') !== true && !legacyExplicit;
        if (isSFW) {
            const safeKey = `action.${action}.sfw`;
            const safeLabel = app._t(safeKey);
            if (safeLabel !== safeKey) return safeLabel;
        }
        const labelKey = `action.${action}`;
        const label = app._t(labelKey);
        return label === labelKey ? action : label;
    },

    uiLabel(app, key) {
        const legacyExplicit = CONTENT.preferences.maxTier >= 2 && CONTENT.preferences.explicitDescriptions === true;
        const isSFW = CONTENT?.isCategoryEnabled?.('explicit.sexual') !== true && !legacyExplicit;
        if (isSFW) {
            const safeKey = `action.${key}.sfw`;
            const safeLabel = app._t(safeKey);
            if (safeLabel !== safeKey) return safeLabel;
        }
        const labelKey = `action.${key}`;
        const label = app._t(labelKey);
        return label === labelKey ? (app.UI_LABELS[key] || key) : label;
    },

    applyStaticLocalization(app, root = document) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = app._label(key, el.textContent || '');
        });
        root.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (!key) return;
            el.setAttribute('title', app._label(key, el.getAttribute('title') || ''));
        });
        root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria-label');
            if (!key) return;
            el.setAttribute('aria-label', app._label(key, el.getAttribute('aria-label') || ''));
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key) return;
            el.setAttribute('placeholder', app._label(key, el.getAttribute('placeholder') || ''));
        });
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    },

    srOnly(app, text, attrs = '') {
        if (!text) return '';
        return `<span ${attrs} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${app._escapeHtml(text)}</span>`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UI_TEXT = YAW_UI_TEXT;
}
