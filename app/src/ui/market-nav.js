
// Add marketplace to navigation
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.app-nav');
    if (nav) {
        const marketBtn = document.createElement('button');
        marketBtn.className = 'nav-btn';
        marketBtn.textContent = '🏪 Market';
        marketBtn.onclick = () => {
            document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
            document.getElementById('screen-market').style.display = 'block';
            MODULE_MARKETPLACE.ui.showMarketplace();
        };
        nav.insertBefore(marketBtn, nav.lastChild);
    }
});
