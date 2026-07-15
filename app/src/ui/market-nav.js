
// Add marketplace to navigation
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-menu')) return;
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const marketBtn = document.createElement('button');
        marketBtn.className = 'nav-btn';
        marketBtn.innerHTML = '🏪 <span data-i18n="ui.menu.market">Market</span>';
        marketBtn.title = 'Open market';
        marketBtn.setAttribute('data-i18n-title', 'ui.menu.marketTitle');
        marketBtn.setAttribute('aria-label', 'Open market');
        marketBtn.setAttribute('data-i18n-aria-label', 'ui.menu.marketTitle');
        marketBtn.onclick = () => App.showMarketScreen();
        nav.insertBefore(marketBtn, nav.lastChild);
        App.applyStaticLocalization?.(nav);
    }
});
