
// Add marketplace to navigation
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const marketBtn = document.createElement('button');
        marketBtn.className = 'nav-btn';
        marketBtn.innerHTML = '🏪 <span data-i18n="ui.menu.market">Market</span>';
        marketBtn.title = 'Open market';
        marketBtn.setAttribute('data-i18n-title', 'ui.menu.marketTitle');
        marketBtn.setAttribute('aria-label', 'Open market');
        marketBtn.setAttribute('data-i18n-aria-label', 'ui.menu.marketTitle');
        marketBtn.onclick = () => {
            document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
            document.getElementById('screen-market').style.display = 'block';
            MODULE_MARKETPLACE.ui.showMarketplace();
        };
        nav.insertBefore(marketBtn, nav.lastChild);
        App.applyStaticLocalization?.(nav);
    }
});
