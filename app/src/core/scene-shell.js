/**
 * YOU ARE WILD SCENE SHELL
 * Shared desktop/mobile scene container updates for center context and combat summaries.
 */

const YAW_SCENE_SHELL = {
    clearLegacyCenterActions() {
        const actions = document.getElementById('scene-actions');
        if (!actions) return;
        actions.innerHTML = '';
        actions.style.display = 'none';
        if (actions.dataset?.richHidden) delete actions.dataset.richHidden;
    },

    clearMobileExplorationControls(app) {
        const mobileExplore = document.getElementById('mobile-explore-actions');
        if (mobileExplore) {
            mobileExplore.innerHTML = '';
            mobileExplore.removeAttribute('data-command-surface');
            mobileExplore.removeAttribute('data-command-mode');
            mobileExplore.removeAttribute('data-command-grammar');
            mobileExplore.style.display = 'none';
        }
        const mobileTargetTray = document.getElementById('mobile-target-action-tray');
        if (mobileTargetTray) {
            mobileTargetTray.innerHTML = '';
            mobileTargetTray.removeAttribute('data-command-surface');
            mobileTargetTray.removeAttribute('data-command-mode');
            mobileTargetTray.removeAttribute('data-command-grammar');
        }
        const mobileActorBelt = document.getElementById('mobile-actor-belt');
        if (mobileActorBelt) {
            mobileActorBelt.innerHTML = '';
            mobileActorBelt.removeAttribute('data-command-surface');
            mobileActorBelt.removeAttribute('data-command-mode');
            mobileActorBelt.removeAttribute('data-command-grammar');
        }
        document.getElementById('mobile-control-row')?.classList?.remove('has-visible-controls');
        const mobileCreatureCue = document.getElementById('mobile-creature-presence-cue');
        if (mobileCreatureCue) mobileCreatureCue.innerHTML = '';
        const mobileMovePad = document.getElementById('mobile-move-pad');
        if (mobileMovePad) mobileMovePad.classList?.remove('expanded');
        const mobileMoveToggle = document.getElementById('mobile-move-toggle');
        if (mobileMoveToggle) mobileMoveToggle.setAttribute('aria-expanded', 'false');
        const mobileActorToggle = document.getElementById('mobile-actor-toggle');
        if (mobileActorToggle) {
            mobileActorToggle.hidden = true;
            mobileActorToggle.style.display = 'none';
            mobileActorToggle.setAttribute('aria-expanded', 'false');
            mobileActorToggle.classList?.remove('selected');
        }
        const mobileControlBelt = document.getElementById('mobile-control-belt');
        if (mobileControlBelt) {
            mobileControlBelt.classList?.remove('has-controls', 'target-controls-open', 'expanded-controls-open');
            mobileControlBelt.removeAttribute('data-command-surface');
            mobileControlBelt.removeAttribute('data-command-mode');
            mobileControlBelt.removeAttribute('data-command-grammar');
        }
        document.getElementById('mobile-play-surface')?.classList?.remove('has-control-belt', 'control-belt-expanded');
        app.mobileMovePadOpen = false;
        app.mobileActorBeltOpen = false;
    },

    clearCommandSentences() {
        const attrs = [
            'data-command-surface',
            'data-command-mode',
            'data-command-grammar',
            'data-command-actor-count',
            'data-command-target-count',
            'data-command-intent'
        ];
        ['selection-sentence', 'mobile-selection-sentence'].forEach(id => {
            const slot = document.getElementById(id);
            if (slot) {
                slot.innerHTML = '';
                attrs.forEach(attr => slot.removeAttribute(attr));
            }
        });
    },

    clearCenterActionsForCombat(app) {
        this.clearLegacyCenterActions();
        const desktopBelt = document.getElementById('desktop-context-belt');
        if (desktopBelt) {
            desktopBelt.innerHTML = '';
            desktopBelt.removeAttribute('data-command-surface');
            desktopBelt.removeAttribute('data-command-mode');
            desktopBelt.removeAttribute('data-command-grammar');
        }
        this.clearMobileExplorationControls(app);
    },

    setRichContent(app, title, html) {
        const titleEl = document.getElementById('scene-title');
        const descEl = document.getElementById('scene-description');
        const actions = document.getElementById('scene-actions');
        if (titleEl) titleEl.textContent = title || '';
        if (descEl) descEl.innerHTML = html || '';
        if (actions) {
            actions.innerHTML = '';
            actions.dataset.richHidden = 'true';
            actions.style.display = 'none';
        }
        const desktopBelt = document.getElementById('desktop-context-belt');
        if (desktopBelt) {
            desktopBelt.innerHTML = '';
            desktopBelt.removeAttribute('data-command-surface');
            desktopBelt.removeAttribute('data-command-mode');
            desktopBelt.removeAttribute('data-command-grammar');
        }
        this.clearMobileExplorationControls(app);
        const mobileTitle = document.getElementById('mobile-scene-title');
        const mobileDesc = document.getElementById('mobile-scene-description');
        const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
        if (mobileTitle) mobileTitle.textContent = title || '';
        if (mobileDesc) mobileDesc.innerHTML = html || '';
        if (mobileSheet) mobileSheet.classList.add('rich-content');
        YAW_CENTER_CONTEXT.clearPresence();
        app.renderTileEvents();
        this.clearCommandSentences();
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

        this.clearLegacyCenterActions();
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
                    this.clearLegacyCenterActions();
                    if (unit === app.player || app.party.includes(unit)) {
                        app.showActorActions(unit);
                    } else if (actions) {
                        this.clearLegacyCenterActions();
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
