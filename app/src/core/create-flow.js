/**
 * YOU ARE WILD CREATE FLOW
 * Character creation, draft validation, and new-run initialization helpers.
 */

const YAW_CREATE_FLOW = {
    initSpeciesGrid(app) {
        const grid = document.getElementById('species-grid');
        if (grid) {
            grid.innerHTML = app.species.map(s => `<div class="option-card ${s.id === 'human' ? 'selected' : ''}" role="button" tabindex="0" data-command-surface="character-creation" data-command-mode="setup" data-command-control="select-species" data-create-option="${s.id}" data-species="${s.id}" onclick="App.selectSpecies('${s.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><div style="font-size:48px">${s.icon}</div><div style="font-weight:600;color:var(--text-primary)">${s.name}</div><div style="font-size:12px;color:var(--text-muted)">${s.desc}</div></div>`).join('');
        }
    },

    selectSpecies(app, id) {
        app.selectedSpecies = id;
        document.querySelectorAll('#species-grid .option-card').forEach(c => c.classList.toggle('selected', c.dataset.species === id));
        const species = app.species.find(s => s.id === id);
        const defaults = app.SPECIES_DEFAULT_PARTS[id] || [];
        app.selectedBodyParts = [...defaults];
        const info = document.getElementById('species-info');
        if (info) info.innerHTML = `<div style="font-size:48px;margin-bottom:8px">${species.icon}</div><h3>${species.name}</h3><p>${species.desc}</p><p style="color:var(--text-muted);font-size:12px;margin-top:8px">Default traits: ${defaults.length ? defaults.map(p => app.BODY_PARTS[p]?.label || p).join(', ') : 'None'}</p>`;
        document.querySelectorAll('#body-parts-grid .option-card').forEach(c => {
            c.classList.toggle('selected', app.selectedBodyParts.includes(c.dataset.part));
        });
    },

    setValidation(message = '') {
        const el = document.getElementById('create-validation');
        if (!el) return;
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    },

    setOptionSelection(selector, value, datasetKey = 'value') {
        document.querySelectorAll(selector).forEach(c => {
            c.classList.toggle('selected', c.dataset[datasetKey] === value);
        });
    },

    isSafeTier(app) {
        return CONTENT?.isCategoryEnabled?.('explicit.sexual') !== true;
    },

    compatibilityPartsForGender(gender) {
        if (gender === 'male') return ['cock', 'pecs'];
        if (gender === 'female') return ['clit', 'tits'];
        return ['clit', 'pecs'];
    },

    ensureSafeCompatibilityParts(app) {
        if (!this.isSafeTier(app) || !app.selectedGender) return;
        app._safeCompatibilityPartsApplied = false;
    },

    selectGender(app, gender) {
        app.selectedGender = gender;
        this.ensureSafeCompatibilityParts(app);
        app._setCreateValidation('');
    },

    selectPart(app, part) {
        if (app.selectedParts.includes(part)) app.selectedParts = app.selectedParts.filter(x => x !== part);
        else app.selectedParts.push(part);
        app._safeCompatibilityPartsApplied = false;
        app._setCreateValidation('');
    },

    toggleBodyPart(app, id) {
        if (app.selectedBodyParts.includes(id)) app.selectedBodyParts = app.selectedBodyParts.filter(x => x !== id);
        else app.selectedBodyParts.push(id);
    },

    updateAnatomyUI(app) {
        document.querySelectorAll('#anatomy-grid .option-card').forEach(c => {
            const part = c.dataset.part;
            c.classList.toggle('selected', app.selectedParts.includes(part));
        });
    },

    validate(app) {
        const name = document.getElementById('char-name')?.value?.trim() || '';
        const hasGender = Boolean(app.selectedGender);
        const hasName = Boolean(name);
        if (hasName && hasGender) {
            app._setCreateValidation('');
            return true;
        }
        const missing = [];
        if (!hasName) missing.push(app._label('create.validation.name', 'enter a name'));
        if (!hasGender) missing.push(app._label('create.validation.gender', 'choose a gender'));
        const message = app._label('create.validation.required', 'Before beginning, please {items}.', { items: missing.join(', ') });
        app._setCreateValidation(message);
        app.toggleAccordion('gender');
        return false;
    },

    randomize(app) {
        const genders = ['female', 'male', 'nonbinary'];
        const providerOptions = CONTENT?.getCreationOptions?.() || [];
        const species = app.species[Math.floor(Math.random() * app.species.length)]?.id || 'human';
        const gender = genders[Math.floor(Math.random() * genders.length)];
        const groupedOptions = [...new Set(providerOptions.map(option => option.group))].map(group => (
            providerOptions.filter(option => option.group === group)
        ));
        const parts = groupedOptions.map(options => options[Math.floor(Math.random() * options.length)]?.value).filter(Boolean);
        app.selectSpecies(species);
        app.selectedGender = gender;
        app.selectedParts = [...parts];
        app._safeCompatibilityPartsApplied = false;
        app._setCreateOptionSelection('#gender-grid .option-card', gender);
        app.updateAnatomyUI();
        app._setCreateValidation('');
        app.toggleAccordion('species');
    },

    syncTierGates(app) {
        const anatomySection = document.querySelector('[data-accordion="anatomy"]');
        const anatomyBody = document.getElementById('body-anatomy');
        const anatomyArrow = document.getElementById('arrow-anatomy');
        const options = CONTENT?.getCreationOptions?.() || [];
        const hasProviderOptions = options.length > 0;
        if (anatomySection) anatomySection.style.display = hasProviderOptions ? '' : 'none';
        if (anatomyBody && !hasProviderOptions) anatomyBody.style.display = 'none';
        if (anatomyArrow && !hasProviderOptions) anatomyArrow.textContent = '▶';
        this.renderProviderCreationOptions(app, options);
    },

    toggleAccordion(app, id) {
        const hasProviderOptions = (CONTENT?.getCreationOptions?.() || []).length > 0;
        const targetId = id === 'anatomy' && !hasProviderOptions ? 'gender' : id;
        document.querySelectorAll('.accordion-section').forEach(section => {
            const sectionId = section.dataset.accordion;
            const body = document.getElementById('body-' + sectionId);
            const arrow = document.getElementById('arrow-' + sectionId);
            const header = section.querySelector?.('.accordion-header');
            if (!body || !arrow) return;
            if (sectionId === 'anatomy' && !hasProviderOptions) {
                body.style.display = 'none';
                arrow.textContent = '▶';
                if (header) header.setAttribute('aria-expanded', 'false');
                return;
            }
            const isSelected = sectionId === targetId;
            body.style.display = isSelected ? 'block' : 'none';
            arrow.textContent = isSelected ? '▼' : '▶';
            if (header) header.setAttribute('aria-expanded', isSelected ? 'true' : 'false');
        });
    },

    initBodyPartsGrid(app) {
        const grid = document.getElementById('body-parts-grid');
        if (!grid) return;
        grid.innerHTML = Object.entries(app.BODY_PARTS).map(([id, part]) =>
            `<div class="option-card" role="button" tabindex="0" data-command-surface="character-creation" data-command-mode="setup" data-command-control="toggle-trait" data-create-option="${id}" data-part="${id}" onclick="App.toggleBodyPart('${id}');this.classList.toggle('selected');" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
                        <div style="font-weight:600;color:var(--text-primary)">${part.label}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${part.desc}</div>
                    </div>`
        ).join('');
    },

    renderProviderCreationOptions(app, options = CONTENT?.getCreationOptions?.() || []) {
        const grid = document.getElementById('anatomy-grid');
        if (!grid) return;
        grid.innerHTML = options.map(option => {
            const selected = app.selectedParts.includes(option.value) ? ' selected' : '';
            const icon = option.icon ? `<div class="create-option-icon" aria-hidden="true">${app._escapeHtml(option.icon)}</div>` : '';
            return `<div class="option-card${selected}" role="button" tabindex="0" data-command-surface="character-creation" data-command-mode="setup" data-command-control="select-provider-option" data-create-option="${app._escapeHtml(option.id)}" data-part="${app._escapeHtml(option.value)}" onclick="App.selectPart('${app._escapeJsString(option.value)}');App.updateAnatomyUI()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
                ${icon}<div style="font-weight:600;color:var(--text-primary)">${app._escapeHtml(option.label)}</div>
                ${option.description ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${app._escapeHtml(option.description)}</div>` : ''}
            </div>`;
        }).join('');
    },

    createCharacter(app) {
        if (!app.validateCharacterCreation()) return;
        if (typeof YAW_NARRATION_SYSTEM !== 'undefined') {
            YAW_NARRATION_SYSTEM.resetRuntime(app, { clearRecords: true, reason: 'new-game' });
        }
        app.storyEvents = [];
        app.sceneEvents = app.storyEvents;
        app.latestStoryEvent = null;
        app.latestSceneBeat = null;
        app.storyEventSeq = 0;
        this.ensureSafeCompatibilityParts(app);
        const name = document.getElementById('char-name')?.value?.trim();
        app.playerName = name;
        const species = app.species.find(s => s.id === app.selectedSpecies);
        const baseStats = app._getSpeciesBaseStats(app.selectedSpecies);
        const parts = [...app.selectedParts];
        const bodyParts = [...app.selectedBodyParts];
        const hasCock = parts.includes('cock');
        const hasClit = parts.includes('clit');
        const hasTits = parts.includes('tits');
        const hasPecs = parts.includes('pecs');
        const maxPun = baseStats.MPun;
        const maxPle = baseStats.MPle;
        app.encounterPreference = app.selectedEncounterPreference || 'any';
        app.encounterWeights = app._normalizeEncounterWeights(app.selectedEncounterWeights);
        app.player = {
            id: 'player_' + Date.now(), name: name, species: app.selectedSpecies,
            icon: species.icon, gender: app.selectedGender,
            identity: app.selectedGender, parts: hasCock ? 'cock' : (hasClit ? 'clit' : null),
            chest: hasTits ? 'tits' : (hasPecs ? 'pecs' : null), bothParts: hasCock && hasClit,
            bodyParts: bodyParts, size: 4, appetite: 4,
            level: 1, xp: 0, xpToNext: 100, gold: 0,
            MPun: maxPun, CPun: maxPun, MPle: maxPle, CPle: Math.floor(maxPle * 0.5),
            Figh: baseStats.Figh, Feas: baseStats.Feas, Flir: baseStats.Flir, Fuck: baseStats.Fuck, Flee: baseStats.Flee, Feed: baseStats.Feed,
            str: baseStats.str, con: baseStats.con, spd: baseStats.spd, int: baseStats.int, wis: baseStats.wis, cha: baseStats.cha,
            tags: [species.name], perks: [], stomach: [], womb: [], balls: [], cum: 0, status: {},
            expanded: true, hero: true, ally: false, mc: true, obedient: true, willing: true
        };
        app._applySpeciesCanon(app.player);
        app._applySpeciesAbilities(app.player);
        app.party = [app.player];
        app.partyLeaderId = app._unitSelectionId(app.player);
        app.creatures = [];
        app.location = { x: 0, y: 0 };
        app.largeMapOffset = { x: 0, y: 0 };
        app.largeMapRadius = 8;
        app.timeHour = 8;
        app.dayCount = 0;
        app.log = [{ text: 'Welcome to the world, ' + name + '.', type: 'discovery' }];
        app.tileEvents = [];
        app.worldMap = new Map();
        app.exploredTiles = new Set();
        app.worldMeta = {
            worldId: `world_${Date.now()}`,
            seed: `${name}:${app.selectedSpecies}:default`,
            generatorVersion: 3,
            mapModsHash: 'core',
            createdAt: Date.now()
        };
        app.superPatchMap = new Map();
        app.currentBiome = 'forest';
        app.inventory = [];
        app.quests = [];
        app.mode = app.GAME_MODE.NORMAL;
        app.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
        app.targetSelection = null;
        app.activeActor = null;
        app.explorationActorIds = [app._unitSelectionId(app.player)];
        app.explorationActorId = app.explorationActorIds[0];
        app.explorationActorSelectionExplicit = false;
        app.inInterior = false;
        app.activeInterior = null;
        app.interiorLocation = { x: 0, y: 0 };
        app.safeAnchor = app._ensureSafeAnchor();
        app.defeatState = null;
        app._emitModuleHook('onGameStart', {
            slotName: app.activeSlot,
            location: { ...app.location }
        });
        app.exploreTile(0, 0);
        app.revealVisibleTiles(0, 0, app._mapVisibilityRadius());
        app.showScreen('game');
        app._renderTime();
        app.renderMap();
        app.renderParty();
        app.renderCreatures();
        app.renderLog();
        app.updateScene('The Beginning', 'You awaken in an unfamiliar place. The air smells of ' + app.biomes.forest.name + '.', false);
        app._addTileEvent(app._label('ui.tileEvent.arrival', 'You arrive here.'), 'move');
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'inventory', 'holdings', 'currentTile', 'worldTiles', 'quests', 'sceneFeed', 'activityLog'], 'new-run');
        app.autoSave();
    }
};

if (typeof window !== 'undefined') {
    window.YAW_CREATE_FLOW = YAW_CREATE_FLOW;
}
