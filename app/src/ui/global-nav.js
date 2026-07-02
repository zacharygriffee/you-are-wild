
// Global navigation helpers
window.returnToGame = function() {
    ['screen-settings', 'screen-mods', 'screen-market', 'save-manager'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'none';
        el.classList?.remove('active');
    });
    if (App.player && App.player.CPun > 0) {
        document.getElementById('screen-menu').style.display = 'none';
        document.getElementById('screen-menu').classList.remove('active');
        document.getElementById('app').style.display = 'grid';
        document.getElementById('screen-game').style.display = 'flex';
        document.getElementById('screen-game').classList.add('active');
    } else {
        document.getElementById('app').style.display = 'none';
        document.getElementById('screen-menu').style.display = 'flex';
        document.getElementById('screen-menu').classList.add('active');
    }
};
