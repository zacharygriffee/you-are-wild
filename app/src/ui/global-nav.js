
// Global navigation helpers
window.returnToGame = function() {
    document.getElementById('screen-settings').style.display = 'none';
    document.getElementById('screen-mods').style.display = 'none';
    document.getElementById('screen-market').style.display = 'none';
    document.getElementById('save-manager').style.display = 'none';
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
