/**
 * YOU ARE WILD MOBILE COMBAT TOOLBELT
 * Renders the compact combat status surface while panels keep action controls.
 */

const YAW_MOBILE_COMBAT_TOOLBELT = {
    prompt(app, actor = app._currentCombatActor()) {
        if (!app.combatState?.active) return '';
        if (actor && (actor === app.player || app.party.includes(actor))) {
            return app._label('mobile.combat.chooseAction', 'Choose an action, then tap a target.');
        }
        if (actor) {
            return app._label('mobile.combat.enemyTurn', '{name} is acting.', { name: actor.name || app._label('ui.creatures', 'Creatures') });
        }
        return app._label('ui.chooseAction', 'Choose your next action.');
    },

    render(app) {
        const surface = document.getElementById('mobile-play-surface');
        const belt = document.getElementById('mobile-combat-toolbelt');
        const active = Boolean(app.combatState?.active);
        if (surface?.classList) surface.classList.toggle('combat-active', active);
        document.documentElement?.classList?.toggle('mobile-combat-active', active);
        if (!belt) return '';
        if (!active) {
            belt.className = 'mobile-combat-toolbelt';
            belt.innerHTML = '';
            return '';
        }
        const actor = app._currentCombatActor();
        const round = app.combatState.round || 1;
        const turn = (app.combatState.currentTurn ?? 0) + 1;
        const total = Math.max(1, app.combatState.turnQueue?.length || 1);
        const actorName = actor?.name || app._label('ui.creatures', 'Creatures');
        const status = app._label('mobile.combat.status', 'Round {round} · Turn {turn}/{total}', { round, turn, total });
        const title = app._label('mobile.combat.actor', '{name} to act', { name: actorName });
        const prompt = this.prompt(app, actor);
        const html = `<div class="mobile-combat-status"><strong>${app._escapeHtml(title)}</strong><span>${app._escapeHtml(status)}</span></div><div class="mobile-combat-prompt">${app._escapeHtml(prompt)}</div>`;
        belt.className = 'mobile-combat-toolbelt active';
        belt.innerHTML = html;
        return html;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MOBILE_COMBAT_TOOLBELT = YAW_MOBILE_COMBAT_TOOLBELT;
}
