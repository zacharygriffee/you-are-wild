
// Add settings to nav
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-menu')) return;
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'nav-btn';
        settingsBtn.innerHTML = '⚙️ <span data-i18n="ui.menu.settings">Settings</span>';
        settingsBtn.title = 'Open settings';
        settingsBtn.setAttribute('data-command-surface', 'app-system');
        settingsBtn.setAttribute('data-command-mode', 'system');
        settingsBtn.setAttribute('data-command-control', 'open-settings');
        settingsBtn.setAttribute('data-i18n-title', 'ui.menu.settingsTitle');
        settingsBtn.setAttribute('aria-label', 'Open settings');
        settingsBtn.setAttribute('data-i18n-aria-label', 'ui.menu.settingsTitle');
        settingsBtn.onclick = () => {
            App.openSettingsFromGame();
        };
        nav.insertBefore(settingsBtn, nav.lastChild);
        App.applyStaticLocalization?.(nav);
    }
});
