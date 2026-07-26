/**
 * YOU ARE WILD PROGRESSIVE TUTORIAL V2
 * Replayable, state-derived lessons with persisted unlock and completion state.
 */

const YAW_TUTORIAL_SYSTEM = {
    VERSION: 2,
    LESSONS: Object.freeze([
        Object.freeze({ id: 'welcome', unlock: 'always' }),
        Object.freeze({ id: 'cards', unlock: 'player' }),
        Object.freeze({ id: 'actions', unlock: 'player' }),
        Object.freeze({ id: 'map', unlock: 'player' }),
        Object.freeze({ id: 'combat', unlock: 'combat' }),
        Object.freeze({ id: 'rows-reach', unlock: 'combat' }),
        Object.freeze({ id: 'group-actions', unlock: 'group' }),
        Object.freeze({ id: 'items', unlock: 'items' }),
        Object.freeze({ id: 'equipment', unlock: 'equipment' }),
        Object.freeze({ id: 'quests', unlock: 'quests' }),
        Object.freeze({ id: 'companion-behavior', unlock: 'companions' }),
        Object.freeze({ id: 'perks', unlock: 'perks' }),
        Object.freeze({ id: 'containment', unlock: 'containment' }),
        Object.freeze({ id: 'recovery', unlock: 'recovery' })
    ]),

    _ids() {
        return new Set(this.LESSONS.map(lesson => lesson.id));
    },

    _read(app) {
        let parsed = {};
        try {
            parsed = JSON.parse(app._getStoredValue('tutorialState') || '{}');
        } catch (error) {
            parsed = {};
        }
        const ids = this._ids();
        const bounded = values => [...new Set(Array.isArray(values) ? values : [])]
            .map(String)
            .filter(id => ids.has(id));
        return {
            version: this.VERSION,
            unlocked: bounded(parsed.unlocked),
            completed: bounded(parsed.completed)
        };
    },

    _write(app, state) {
        const normalized = {
            version: this.VERSION,
            unlocked: [...new Set(state.unlocked || [])],
            completed: [...new Set(state.completed || [])]
        };
        app.tutorialState = normalized;
        app._setStoredValue('tutorialState', JSON.stringify(normalized));
        return normalized;
    },

    _hasContainment(unit) {
        return ['stomach', 'womb', 'balls'].some(key => Array.isArray(unit?.[key]) && unit[key].length > 0);
    },

    _equipped(unit) {
        return Object.values(unit?.equipment || {}).some(Boolean);
    },

    _fact(app, key) {
        const party = Array.isArray(app.party) ? app.party : [];
        const creatures = Array.isArray(app.creatures) ? app.creatures : [];
        switch (key) {
            case 'always': return true;
            case 'player': return Boolean(app.player);
            case 'combat':
                return Boolean(app.combatState?.active
                    || app.combatState?.round > 1
                    || app.log?.some?.(entry => ['combat', 'enemy_fight'].includes(entry?.type)));
            case 'group': return party.filter(unit => unit?.CPun > 0 && !unit?.knockedOut).length > 1;
            case 'items':
                return Boolean(app.inventory?.length
                    || party.some(unit => Array.isArray(unit?.inventory) && unit.inventory.length));
            case 'equipment':
                return Boolean(party.some(unit => this._equipped(unit))
                    || app.inventory?.some?.(item => app._isEquippable?.(item)));
            case 'quests':
                return Boolean(app.quests?.length
                    || creatures.some(unit => unit?.quest || unit?.disposition === app.DISPOSITION?.QUEST_GIVER));
            case 'companions': return party.length > 1;
            case 'perks':
                return Boolean((app.player?.pendingPerkChoices || 0) > 0
                    || app.player?.perks?.length
                    || Number(app.player?.level || 1) > 1);
            case 'containment':
                return [...party, ...creatures].some(unit => this._hasContainment(unit))
                    || Boolean(app.consumedCreatures?.length);
            case 'recovery':
                return Boolean(app.defeatState
                    || app.recoveryJourney
                    || app.player?.knockedOut
                    || app._isCorpse?.(app.player));
            default: return false;
        }
    },

    sync(app, options = {}) {
        const hadRuntimeState = Boolean(app.tutorialState);
        const state = app.tutorialState || this._read(app);
        const unlocked = new Set(state.unlocked);
        const newlyUnlocked = [];
        for (const lesson of this.LESSONS) {
            if (unlocked.has(lesson.id) || !this._fact(app, lesson.unlock)) continue;
            unlocked.add(lesson.id);
            newlyUnlocked.push(lesson.id);
        }
        const next = newlyUnlocked.length || !hadRuntimeState
            ? this._write(app, { ...state, unlocked: [...unlocked] })
            : state;
        if (options.notify === true && newlyUnlocked.length && app.player) {
            const count = newlyUnlocked.length;
            app.showToast?.({
                text: app._label(
                    count === 1 ? 'ui.tutorial.unlockedOne' : 'ui.tutorial.unlockedMany',
                    count === 1 ? 'A new help lesson is available.' : '{count} new help lessons are available.',
                    { count }
                ),
                type: 'system',
                importance: 'hint',
                dedupeKey: `tutorial-unlock:${newlyUnlocked.join(',')}`
            });
        }
        return next;
    },

    available(app) {
        const state = this.sync(app);
        const unlocked = new Set(state.unlocked);
        return this.LESSONS.filter(lesson => unlocked.has(lesson.id));
    },

    lesson(app, id) {
        const definition = this.LESSONS.find(entry => entry.id === id) || null;
        if (!definition) return null;
        const fallbackTitles = {
            welcome: 'Welcome',
            cards: 'Reading Creature Cards',
            actions: 'Actors, Targets, and Attempts',
            map: 'Travel and the Review Map',
            combat: 'Combat Turns',
            'rows-reach': 'Rows and Reach',
            'group-actions': 'Group Actions',
            items: 'Items and Holdings',
            equipment: 'Equipment',
            quests: 'Quests and Turn-In',
            'companion-behavior': 'Companion Behavior',
            perks: 'Perk Frontier',
            containment: 'Containment',
            recovery: 'Defeat and Recovery'
        };
        const fallbackContent = {
            welcome: 'Explore, learn your limits, and grow stronger. The Help menu reveals short lessons as their mechanics become relevant.',
            cards: 'A card shows condition, spirit, hunger, row, disposition, and traits. Actor selects who acts; Mark selects who or what they act upon. Expand details when you need exact equipment or capacity.',
            actions: 'Choose living actors, mark legal targets, then choose an intent. Requirements and costs are previews, not guaranteed success. A committed attempt may fail in the Scene Feed and still spend its turn and cost.',
            map: 'The 3 by 3 play surface moves the party. The Review Map plans through known territory: track quests, inspect known tiles, filter markers, zoom, pan, and recenter. Unknown tiles remain unknown.',
            combat: 'Combat follows the visible turn order. Manual companions wait for your choice; autonomous companions choose through the same legal action rules. Skip and Flee remain available when no target works.',
            'rows-reach': 'Rows protect back-line creatures from close physical contact. Ranged, flying, social, and special techniques use different reach. A protected physical attempt can be committed and fail narratively instead of becoming a system error.',
            'group-actions': 'Select multiple actors or targets before choosing an intent. Group and multi-target actions charge each participating actor once. Multi-target Fight begins weak per target and improves through practice or an authored area technique.',
            items: 'Holdings separates equipment, pack, living containers, and ground objects. Consumables show implemented effects and legal targets. Quest items required by an active quest cannot be casually sold or dropped.',
            equipment: 'Equipment changes statistics and can enable combat techniques. Slot and body compatibility are checked before equipping. Removing an item removes its reversible bonus and any technique eligibility it supplied.',
            quests: 'Objectives move from active to ready for turn-in. Track a quest or its turn-in on the Review Map; physical rewards are claimed only at the declared giver or destination unless the quest explicitly completes automatically.',
            'companion-behavior': 'Duty is a companion contribution, Stance is risk posture, and Control decides who chooses. Deterministic autonomy works offline; provider-assisted control falls back safely. Recruitment history seeds the initial behavior but does not lock it.',
            perks: 'The Perk Frontier shows only choices available now. Hidden future or incompatible perks are not previews. Each level adds one choice; selected effects are reversible through the confirmed free alpha respec.',
            containment: 'Eating can place a creature in a living container when reach, size, willingness, and capacity permit. Containment tracks progress, vitality, and release eligibility. Digest and Release act on a specific contained creature.',
            recovery: 'Recovery mode determines what follows terminal defeat. Regeneration returns you home; Ghost Pilgrimage limits interaction until a shrine restores you; Hardcore ends the run. Fleeing is not death.'
        };
        const fallbackTips = {
            welcome: 'Tip: Help never pauses progress permanently; close it and replay any unlocked lesson later.',
            cards: 'Tip: compact cards are for scanning. Details are for decisions.',
            actions: 'Tip: clear actors or targets separately when a many-to-many plan is not what you intended.',
            map: 'Tip: danger and quest layers are planning clues, not remote action buttons.',
            combat: 'Tip: acting earlier is not always safer—rows, condition, and enemy reach matter.',
            'rows-reach': 'Tip: use social reach, ranged equipment, movement, or allies when the front row blocks contact.',
            'group-actions': 'Tip: spreading one novice attack over many targets reduces its effect on each target.',
            items: 'Tip: healing items can target living companions in and out of combat.',
            equipment: 'Tip: compare the preview and technique tags, not only the item price.',
            quests: 'Tip: the tracked marker changes from the objective to the turn-in destination when appropriate.',
            'companion-behavior': 'Tip: Guard, Scout, Support, and Gatherer have visible exploration benefits even without AI.',
            perks: 'Tip: choose for the actions you actually use; unavailable branches stay hidden until relevant.',
            containment: 'Tip: Release preserves a living creature only while its current state remains releasable.',
            recovery: 'Tip: companions finish an active fight before the player recovery outcome settles.'
        };
        const key = id.replace(/-/g, '.');
        return {
            ...definition,
            title: app._label(`ui.tutorial.lesson.${key}.title`, fallbackTitles[id] || id),
            content: app._label(`ui.tutorial.lesson.${key}.content`, fallbackContent[id] || ''),
            tip: app._label(`ui.tutorial.lesson.${key}.tip`, fallbackTips[id] || '')
        };
    },

    open(app, requestedId = '') {
        const overlay = document.getElementById('tutorial-overlay');
        if (!overlay) return false;
        if (Array.isArray(app.tutorialBackgroundState)) {
            YAW_DIALOG_FLOW.restoreUnderlying(app.tutorialBackgroundState);
        }
        const lessons = this.available(app);
        const requestedIndex = lessons.findIndex(lesson => lesson.id === requestedId);
        app.tutorialStep = requestedIndex >= 0 ? requestedIndex : 0;
        overlay.setAttribute('aria-hidden', 'false');
        overlay.style.display = 'flex';
        app.tutorialBackgroundState = YAW_DIALOG_FLOW.isolateUnderlying(overlay);
        app._activateFocusTrap(overlay, { close: () => app.closeTutorial() });
        this.render(app);
        return true;
    },

    close(app) {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
        }
        YAW_DIALOG_FLOW.restoreUnderlying(app.tutorialBackgroundState || []);
        app.tutorialBackgroundState = null;
        app._restoreFocusTrap();
        return true;
    },

    select(app, lessonId) {
        const lessons = this.available(app);
        const index = lessons.findIndex(lesson => lesson.id === lessonId);
        if (index < 0) return false;
        if (Number(app.tutorialStep || 0) !== index) this.completeCurrent(app);
        app.tutorialStep = index;
        this.render(app);
        return true;
    },

    completeCurrent(app) {
        const lessons = this.available(app);
        const lesson = lessons[app.tutorialStep || 0];
        if (!lesson) return false;
        const state = app.tutorialState || this._read(app);
        this._write(app, { ...state, completed: [...state.completed, lesson.id] });
        return true;
    },

    move(app, delta) {
        const lessons = this.available(app);
        if (!lessons.length) return this.close(app);
        this.completeCurrent(app);
        const index = Math.max(0, Math.min(lessons.length - 1, Number(app.tutorialStep || 0) + delta));
        if (delta > 0 && index === app.tutorialStep && index === lessons.length - 1) return this.close(app);
        app.tutorialStep = index;
        this.render(app);
        return true;
    },

    reset(app) {
        app._removeStoredValue('tutorialState');
        app._removeStoredValue('tutorialComplete');
        app.tutorialState = null;
        app.tutorialStep = 0;
        this.sync(app);
        this.render(app);
        return true;
    },

    render(app) {
        const lessons = this.available(app);
        if (!lessons.length) return false;
        app.tutorialStep = Math.max(0, Math.min(lessons.length - 1, Number(app.tutorialStep || 0)));
        const selected = this.lesson(app, lessons[app.tutorialStep].id);
        const state = app.tutorialState || this._read(app);
        const completed = new Set(state.completed);
        const title = document.getElementById('tutorial-title');
        const content = document.getElementById('tutorial-content');
        const tip = document.getElementById('tutorial-tip');
        const list = document.getElementById('tutorial-lesson-list');
        const progress = document.getElementById('tutorial-progress');
        const previous = document.getElementById('tutorial-previous');
        const next = document.getElementById('tutorial-next');
        if (title) title.textContent = selected.title;
        if (content) content.textContent = selected.content;
        if (tip) tip.textContent = selected.tip;
        if (progress) progress.textContent = app._label('ui.tutorial.progress', 'Lesson {current} of {total}', {
            current: app.tutorialStep + 1,
            total: lessons.length
        });
        if (list) {
            list.innerHTML = lessons.map(lesson => {
                const rendered = this.lesson(app, lesson.id);
                const active = lesson.id === selected.id;
                const status = completed.has(lesson.id)
                    ? app._label('ui.tutorial.read', 'Read')
                    : app._label('ui.tutorial.new', 'New');
                return `<button type="button" class="nav-btn tutorial-lesson-button${active ? ' active' : ''}" data-tutorial-lesson="${app._escapeHtml(lesson.id)}" aria-current="${active ? 'true' : 'false'}" onclick="App.selectTutorialLesson('${app._escapeJsString(lesson.id)}')"><span>${app._escapeHtml(rendered.title)}</span><small>${app._escapeHtml(status)}</small></button>`;
            }).join('');
        }
        if (previous) previous.disabled = app.tutorialStep <= 0;
        if (next) next.textContent = app._label(
            app.tutorialStep >= lessons.length - 1 ? 'ui.tutorial.done' : 'ui.tutorial.next',
            app.tutorialStep >= lessons.length - 1 ? 'Done' : 'Next ->'
        );
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_TUTORIAL_SYSTEM = YAW_TUTORIAL_SYSTEM;
}
