/**
 * YOU ARE WILD SCENE SHELL
 * Shared desktop/mobile scene container updates for center context and combat summaries.
 */

const YAW_SCENE_SHELL = {
    clearCenterActionsForCombat(app) {
        const actions = document.getElementById('scene-actions');
        if (actions) {
            actions.innerHTML = '';
            actions.classList?.remove('center-tile-actions');
            actions.style.display = 'none';
        }
        const desktopBelt = document.getElementById('desktop-context-belt');
        if (desktopBelt) desktopBelt.innerHTML = '';
    },

    setRichContent(app, title, html) {
        const titleEl = document.getElementById('scene-title');
        const descEl = document.getElementById('scene-description');
        const actions = document.getElementById('scene-actions');
        if (titleEl) titleEl.textContent = title || '';
        if (descEl) descEl.innerHTML = html || '';
        if (actions) {
            actions.dataset.richHidden = 'true';
            actions.style.display = 'none';
        }
        const desktopBelt = document.getElementById('desktop-context-belt');
        if (desktopBelt) desktopBelt.innerHTML = '';
        const mobileTitle = document.getElementById('mobile-scene-title');
        const mobileDesc = document.getElementById('mobile-scene-description');
        const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
        if (mobileTitle) mobileTitle.textContent = title || '';
        if (mobileDesc) mobileDesc.innerHTML = html || '';
        if (mobileSheet) mobileSheet.classList.add('rich-content');
        YAW_CENTER_CONTEXT.clearPresence();
        app.renderTileEvents();
        app.renderSelectionSentence?.();
    },

    update(app, title, description, inCombat) {
        const titleEl = document.getElementById('scene-title');
        const descEl = document.getElementById('scene-description');
        if (titleEl) titleEl.textContent = title || '';
        if (descEl) {
            descEl.innerHTML = '';
            descEl.textContent = description || '';
        }
        const mobileTitle = document.getElementById('mobile-scene-title');
        const mobileDesc = document.getElementById('mobile-scene-description');
        const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
        if (mobileTitle) mobileTitle.textContent = title || '';
        if (mobileDesc) {
            mobileDesc.innerHTML = '';
            mobileDesc.textContent = description || '';
        }
        if (mobileSheet) mobileSheet.classList.remove('rich-content');
        app.renderTileEvents();

        const actions = document.getElementById('scene-actions');
        if (actions?.dataset?.richHidden) {
            delete actions.dataset.richHidden;
            actions.style.display = '';
        }
        const mobileActions = document.getElementById('mobile-actions');
        const mobileCombat = document.getElementById('mobile-combat-actions');
        const mobileExplore = document.getElementById('mobile-explore-actions');
        document.documentElement?.classList?.toggle('mobile-combat-active', Boolean(inCombat));
        if (inCombat) {
            YAW_CENTER_CONTEXT.clearPresence();
            app.renderCombatSceneForTurn(app.activeActor || app._currentCombatActor());
            this.clearCenterActionsForCombat(app);
            if (mobileCombat) {
                mobileCombat.innerHTML = '';
                mobileCombat.style.display = 'none';
            }
            if (mobileActions) mobileActions.style.display = 'none';
            if (mobileExplore) mobileExplore.style.display = 'none';
        } else {
            YAW_CENTER_CONTEXT.renderPresence(app);
            app.renderCenterTileActions();
            if (mobileActions) mobileActions.style.display = 'none';
            if (mobileCombat) mobileCombat.style.display = 'none';
            if (mobileExplore) mobileExplore.style.display = 'flex';
        }
        app.renderSelectionSentence?.();
    },

    closeDetails(app) {
        try {
            if (app.combatState?.active) {
                const entry = app.combatState.turnQueue?.[app.combatState.currentTurn];
                const unit = entry?.unit;
                if (unit) {
                    const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
                    const actions = document.getElementById('scene-actions');
                    if (mobileSheet) mobileSheet.classList.remove('rich-content');
                    app.renderCombatSceneForTurn(unit);
                    if (actions?.dataset?.richHidden) {
                        delete actions.dataset.richHidden;
                        actions.style.display = '';
                    }
                    if (unit === app.player || app.party.includes(unit)) {
                        app.showActorActions(unit);
                    } else if (actions) {
                        actions.innerHTML = '';
                    }
                    return;
                }
            }
            app.showExplorationActions();
        } catch (err) {
            app.updateScene(app._label('ui.exploration', 'Exploration'), app._label('ui.chooseAction', 'Choose your next action.'), false);
            app.renderExplorationActions();
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_SCENE_SHELL = YAW_SCENE_SHELL;
}
