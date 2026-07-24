/**
 * YOU ARE WILD CREATE FLOW
 * Character creation, draft validation, and new-run initialization helpers.
 */

const YAW_CREATE_FLOW = {
    speciesText(app, species, field = 'name') {
        const fallback = String(field === 'description' ? (species?.description ?? species?.desc ?? '') : (species?.[field] || ''));
        const authoredKey = String(species?.[`${field}Key`] || '').trim();
        return authoredKey ? app._label(authoredKey, fallback) : fallback;
    },

    syncPressedState(selector, selectedValue, datasetKey) {
        document.querySelectorAll(selector).forEach(card => {
            const selected = card.dataset[datasetKey] === selectedValue;
            card.classList.toggle('selected', selected);
            card.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
    },

    initSpeciesGrid(app) {
        const grid = document.getElementById('species-grid');
        const selectedSpecies = app.species.some(species => species.id === app.selectedSpecies)
            ? app.selectedSpecies
            : 'human';
        app.selectedSpecies = selectedSpecies;
        if (grid) {
            grid.innerHTML = app.species.map(species => {
                const selected = species.id === selectedSpecies;
                const id = app._escapeHtml(species.id);
                const jsId = app._escapeJsString(species.id);
                const icon = app._escapeHtml(species.icon || '👤');
                const name = app._escapeHtml(this.speciesText(app, species, 'name'));
                const description = app._escapeHtml(this.speciesText(app, species, 'description') || species.desc || '');
                return `<div class="option-card${selected ? ' selected' : ''}" role="button" tabindex="0" aria-pressed="${selected ? 'true' : 'false'}" data-command-surface="character-creation" data-command-mode="setup" data-command-control="select-species" data-create-option="${id}" data-species="${id}" onclick="App.selectSpecies('${jsId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><div style="font-size:48px" aria-hidden="true">${icon}</div><div style="font-weight:600;color:var(--text-primary)">${name}</div><div style="font-size:12px;color:var(--text-muted)">${description}</div></div>`;
            }).join('');
            if (document.getElementById('species-info')) this.selectSpecies(app, selectedSpecies);
        }
    },

    selectSpecies(app, id) {
        app.selectedSpecies = id;
        this.syncPressedState('#species-grid .option-card', id, 'species');
        const species = app.species.find(s => s.id === id);
        if (!species) return;
        const defaults = app.SPECIES_DEFAULT_PARTS[id] || [];
        app.selectedBodyParts = [...defaults];
        const info = document.getElementById('species-info');
        if (info) {
            const name = app._escapeHtml(this.speciesText(app, species, 'name'));
            const description = app._escapeHtml(this.speciesText(app, species, 'description') || species.desc || '');
            const traitNames = defaults.map(part => app._escapeHtml(app.BODY_PARTS[part]?.label || part));
            const traits = traitNames.length ? traitNames.join(', ') : app._escapeHtml(app._label('create.none', 'None'));
            info.innerHTML = `<div style="font-size:48px;margin-bottom:8px" aria-hidden="true">${app._escapeHtml(species.icon || '👤')}</div><h3>${name}</h3><p>${description}</p><p style="color:var(--text-muted);font-size:12px;margin-top:8px">${app._escapeHtml(app._label('create.defaultTraits', 'Default traits'))}: ${traits}</p>`;
        }
        document.querySelectorAll('#body-parts-grid .option-card').forEach(c => {
            const selected = app.selectedBodyParts.includes(c.dataset.part);
            c.classList.toggle('selected', selected);
            c.setAttribute('aria-pressed', selected ? 'true' : 'false');
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
        this.syncPressedState('#gender-grid .option-card', gender, 'value');
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
        document.querySelectorAll('#body-parts-grid .option-card').forEach(card => {
            const selected = app.selectedBodyParts.includes(card.dataset.part);
            card.classList.toggle('selected', selected);
            card.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
    },

    updateAnatomyUI(app) {
        document.querySelectorAll('#anatomy-grid .option-card').forEach(c => {
            const part = c.dataset.part;
            const selected = app.selectedParts.includes(part);
            c.classList.toggle('selected', selected);
            c.setAttribute('aria-pressed', selected ? 'true' : 'false');
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
        grid.innerHTML = Object.entries(app.BODY_PARTS).map(([id, part]) => {
            const selected = app.selectedBodyParts.includes(id);
            const escapedId = app._escapeHtml(id);
            const jsId = app._escapeJsString(id);
            return `<div class="option-card${selected ? ' selected' : ''}" role="button" tabindex="0" aria-pressed="${selected ? 'true' : 'false'}" data-command-surface="character-creation" data-command-mode="setup" data-command-control="toggle-trait" data-create-option="${escapedId}" data-part="${escapedId}" onclick="App.toggleBodyPart('${jsId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
                        <div style="font-weight:600;color:var(--text-primary)">${app._escapeHtml(part.label)}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${app._escapeHtml(part.desc)}</div>
                    </div>`;
        }).join('');
    },

    renderProviderCreationOptions(app, options = CONTENT?.getCreationOptions?.() || []) {
        const grid = document.getElementById('anatomy-grid');
        if (!grid) return;
        grid.innerHTML = options.map(option => {
            const selected = app.selectedParts.includes(option.value) ? ' selected' : '';
            const icon = option.icon ? `<div class="create-option-icon" aria-hidden="true">${app._escapeHtml(option.icon)}</div>` : '';
            return `<div class="option-card${selected}" role="button" tabindex="0" aria-pressed="${selected ? 'true' : 'false'}" data-command-surface="character-creation" data-command-mode="setup" data-command-control="select-provider-option" data-create-option="${app._escapeHtml(option.id)}" data-part="${app._escapeHtml(option.value)}" onclick="App.selectPart('${app._escapeJsString(option.value)}');App.updateAnatomyUI()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
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
        const creationOptions = {};
        for (const option of CONTENT?.getCreationOptions?.() || []) {
            if (!parts.includes(option.value)) continue;
            if (!creationOptions[option.provider]) creationOptions[option.provider] = {};
            creationOptions[option.provider][option.id] = option.value;
        }
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
            creationOptions,
            bodyParts: bodyParts, size: app.SPECIES_SIZE[app.selectedSpecies] || 4, appetite: 4,
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
        app.log = [{ text: app._label('log.welcomeWorld', 'Welcome to the world, {name}.', { name }), type: 'discovery' }];
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
        app.strandedCompanions = [];
        app._autoSaveSuppressed = false;
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
