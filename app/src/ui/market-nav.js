
// Add marketplace to navigation
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-menu')) return;
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const marketBtn = document.createElement('button');
        marketBtn.className = 'nav-btn';
        const label = App._label('ui.menu.market', 'Market');
        const title = App._label('ui.menu.marketTitle', 'Open market');
        marketBtn.append('🏪 ');
        const labelNode = document.createElement('span');
        labelNode.setAttribute('data-i18n', 'ui.menu.market');
        labelNode.textContent = label;
        marketBtn.appendChild(labelNode);
        marketBtn.title = title;
        marketBtn.setAttribute('data-command-surface', 'app-system');
        marketBtn.setAttribute('data-command-mode', 'system');
        marketBtn.setAttribute('data-command-control', 'open-market');
        marketBtn.setAttribute('data-i18n-title', 'ui.menu.marketTitle');
        marketBtn.setAttribute('aria-label', title);
        marketBtn.setAttribute('data-i18n-aria-label', 'ui.menu.marketTitle');
        marketBtn.onclick = () => App.showMarketScreen();
        nav.insertBefore(marketBtn, nav.lastChild);
        App.applyStaticLocalization?.(nav);
    }
});
