
// Add settings to nav
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'nav-btn';
        settingsBtn.textContent = '⚙️ Settings';
        settingsBtn.title = 'Open settings';
        settingsBtn.setAttribute('aria-label', 'Open settings');
        settingsBtn.onclick = () => {
            App.showScreen('settings');
            App.showSettings();
        };
        nav.insertBefore(settingsBtn, nav.lastChild);
    }
});
