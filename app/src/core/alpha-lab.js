/**
 * YOU ARE WILD ALPHA LAB
 * Public guided playtest missions and deterministic isolated scenario fixtures.
 */

const YAW_ALPHA_LAB = {
    VERSION: 1,
    SAVE_DB_NAME: 'YAW_Alpha_Saves',
    WORLD_DB_NAME: 'YAW_Alpha_Worlds',
    REPORT_SCHEMA: 'yaw-alpha-report-v1',
    ISSUE_URL: 'https://github.com/zacharygriffee/you-are-wild/issues/new',

    missions: [
        {
            id: 'interaction-single',
            icon: '💬',
            category: 'interaction',
            titleKey: 'alpha.mission.interactionSingle.title',
            title: 'Single interaction consistency',
            descriptionKey: 'alpha.mission.interactionSingle.description',
            description: 'Compare Fight, Talk, Eat, Play, and Feed through one ordinary target flow.',
            checklist: [
                ['alpha.check.single.panel', 'Every primary action opens the same option-sheet pattern.'],
                ['alpha.check.single.labels', 'The action and sub-action labels match the selected content posture.'],
                ['alpha.check.single.failure', 'Unavailable attempts remain selectable and resolve through narration.']
            ]
        },
        {
            id: 'interaction-group',
            icon: '👥',
            category: 'interaction',
            titleKey: 'alpha.mission.interactionGroup.title',
            title: 'Group and mixed-capability actions',
            descriptionKey: 'alpha.mission.interactionGroup.description',
            description: 'Use two actors against multiple targets and confirm capable participants still contribute.',
            checklist: [
                ['alpha.check.group.actors', 'Both selected actors remain visible through planning and resolution.'],
                ['alpha.check.group.partial', 'A blocked participant receives narrative feedback without canceling capable participants.'],
                ['alpha.check.group.cancel', 'Canceling group selection does not displace or hide the primary action belt.']
            ]
        },
        {
            id: 'self-containment',
            icon: '🌀',
            category: 'interaction',
            titleKey: 'alpha.mission.selfContainment.title',
            title: 'Self and containment actions',
            descriptionKey: 'alpha.mission.selfContainment.description',
            description: 'Exercise Digest and Release from the same self-action tree used during ordinary play.',
            checklist: [
                ['alpha.check.self.options', 'Selecting only the actor exposes contextual self-actions.'],
                ['alpha.check.self.digest', 'Digest is available for the prepared contained creature.'],
                ['alpha.check.self.holdings', 'The same contained creature remains manageable through Holdings.']
            ]
        },
        {
            id: 'combat-group',
            icon: '⚔️',
            category: 'combat',
            titleKey: 'alpha.mission.combatGroup.title',
            title: 'Combat group planning',
            descriptionKey: 'alpha.mission.combatGroup.description',
            description: 'Compare the combat action tree with exploration using party and enemy targets.',
            checklist: [
                ['alpha.check.combat.options', 'Fight, Talk, Eat, Play, and Feed use option sheets rather than special inline variants.'],
                ['alpha.check.combat.group', 'Single-actor and group plans expose the same available sub-actions.'],
                ['alpha.check.combat.turns', 'Committed group participants stay reserved until the group action resolves.']
            ]
        },
        {
            id: 'failure-narration',
            icon: '📖',
            category: 'narration',
            titleKey: 'alpha.mission.failureNarration.title',
            title: 'Failed attempts as narration',
            descriptionKey: 'alpha.mission.failureNarration.description',
            description: 'Attempt close-contact actions against an airborne target and inspect the Scene Feed response.',
            checklist: [
                ['alpha.check.failure.commit', 'The action remains selectable even when success is unlikely.'],
                ['alpha.check.failure.scene', 'The Scene Feed explains why the committed attempt failed.'],
                ['alpha.check.failure.noError', 'No warning banner, invalid-move message, alert, or thrown error appears.']
            ]
        },
        {
            id: 'companion-management',
            icon: '🎒',
            category: 'party',
            titleKey: 'alpha.mission.companion.title',
            title: 'Companion identity and loadouts',
            descriptionKey: 'alpha.mission.companion.description',
            description: 'Rename two companions and equip them from one shared Pack.',
            checklist: [
                ['alpha.check.companion.rename', 'Unique names update every party surface without changing the companion identity.'],
                ['alpha.check.companion.equip', 'Pack owner selection clearly chooses the equipment recipient.'],
                ['alpha.check.companion.reload', 'Names and loadouts survive an Alpha save and reload.']
            ]
        },
        {
            id: 'content-posture',
            icon: '🎭',
            category: 'content',
            titleKey: 'alpha.mission.content.title',
            title: 'SFW and Mature vocabulary',
            descriptionKey: 'alpha.mission.content.description',
            description: 'Switch content posture and compare broad actions with their available approaches.',
            checklist: [
                ['alpha.check.content.sfw', 'SFW shows Talk, Play, and Eat without explicit approach labels.'],
                ['alpha.check.content.mature', 'Mature exposes Flirt, Seduce, and the Mature Play label where eligible.'],
                ['alpha.check.content.deferred', 'Dance, Dominate, and Submit never appear as selectable unfinished mechanics.']
            ]
        },
        {
            id: 'responsive-layout',
            icon: '📱',
            category: 'responsive',
            titleKey: 'alpha.mission.responsive.title',
            title: 'Desktop and mobile interaction layout',
            descriptionKey: 'alpha.mission.responsive.description',
            description: 'Repeat target, group, action-sheet, and Holdings flows at phone and desktop widths.',
            checklist: [
                ['alpha.check.responsive.reachable', 'Every action and exit control remains visible and reachable.'],
                ['alpha.check.responsive.noOverflow', 'The page and option sheets do not overflow horizontally.'],
                ['alpha.check.responsive.stable', 'Group cancel and option-sheet controls do not push the action belt out of reach.']
            ]
        },
        {
            id: 'terrain-composition',
            icon: '🗺️',
            category: 'presentation',
            titleKey: 'alpha.mission.terrainComposition.title',
            title: 'Terrain composition survey',
            descriptionKey: 'alpha.mission.terrainComposition.description',
            description: 'Traverse a deterministic 9x9 gallery of biomes, seams, elevation, routes, features, evidence, and state overlays.',
            checklist: [
                ['alpha.check.terrain.identity', 'Every biome remains recognizable beneath cover, routes, features, and state.'],
                ['alpha.check.terrain.seams', 'Soft blends, hard elevation edges, shorelines, roads, and bridges meet without square gaps or doubled seams.'],
                ['alpha.check.terrain.layers', 'Structures, POIs, evidence, presence, danger, and selection remain legible on desktop, mobile, and Review Map.']
            ]
        }
    ],

    byId(id) {
        return this.missions.find(mission => mission.id === String(id || '')) || null;
    },

    label(app, key, fallback, vars = {}) {
        return app?._label?.(key, fallback, vars) || fallback;
    },

    missionTitle(app, mission) {
        return this.label(app, mission.titleKey, mission.title);
    },

    missionDescription(app, mission) {
        return this.label(app, mission.descriptionKey, mission.description);
    },

    checklistText(app, mission) {
        return mission.checklist.map(([key, fallback]) => this.label(app, key, fallback));
    },

    escape(app, value) {
        return app?._escapeHtml?.(String(value ?? '')) || String(value ?? '');
    },

    unit(app, id, name, species = 'human', overrides = {}) {
        const speciesDef = app.species.find(entry => entry.id === species) || app.species[0] || { icon: '👤', name: species };
        const base = app._getSpeciesBaseStats(species);
        return app._normalizeUnit({
            id,
            name,
            species,
            icon: speciesDef.icon,
            level: 1,
            MPun: base.MPun || 100,
            CPun: base.MPun || 100,
            MPle: base.MPle || 100,
            CPle: Math.floor((base.MPle || 100) * 0.35),
            Figh: base.Figh || 10,
            Feas: base.Feas || 10,
            Flir: base.Flir || 10,
            Fuck: base.Fuck || 10,
            Flee: base.Flee || 10,
            Feed: base.Feed || 10,
            str: base.str || 10,
            con: base.con || 10,
            spd: base.spd || 10,
            int: base.int || 10,
            wis: base.wis || 10,
            cha: base.cha || 10,
            size: app.SPECIES_SIZE[species] || 4,
            appetite: 6,
            bodyParts: [...(app.SPECIES_DEFAULT_PARTS[species] || [])],
            stomach: [],
            womb: [],
            balls: [],
            status: {},
            disposition: app.DISPOSITION.NEUTRAL,
            ...overrides
        }, overrides);
    },

    hideTutorial(app) {
        const overlay = document.getElementById('tutorial-overlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        app._restoreFocusTrap?.({ restoreFocus: false });
    },

    applySandboxStorage(app) {
        app.SAVE_DB_NAME = this.SAVE_DB_NAME;
        app.WORLD_DB_NAME = this.WORLD_DB_NAME;
        app.LEGACY_SAVE_DB_NAME = '';
        app.activeSlot = 'slot1';
        app.storageKeys = {
            ...app.storageKeys,
            lastSlot: 'yaw-alpha-last-slot',
            lastSaveTime: 'yaw-alpha-last-save-time',
            combatRefreshPrefix: 'yaw-alpha-combat-refresh-',
            saveTimePrefix: 'yaw-alpha-save-time-'
        };
        app.legacyStorageKeys = {
            ...app.legacyStorageKeys,
            lastSlot: null,
            lastSaveTime: null,
            saveTimePrefix: 'yaw-alpha-legacy-save-time-disabled-'
        };
    },

    async clearSandboxStorage() {
        if (typeof YAW_STORAGE === 'undefined') return;
        await Promise.all([
            YAW_STORAGE.deleteDatabaseIfExists(this.SAVE_DB_NAME),
            YAW_STORAGE.deleteDatabaseIfExists(this.WORLD_DB_NAME)
        ]);
        if (typeof localStorage === 'undefined') return;
        const prefixes = ['yaw-alpha-last-', 'yaw-alpha-combat-refresh-', 'yaw-alpha-save-time-'];
        for (let index = localStorage.length - 1; index >= 0; index--) {
            const key = localStorage.key(index);
            if (prefixes.some(prefix => String(key || '').startsWith(prefix))) localStorage.removeItem(key);
        }
    },

    resetState(app, mission) {
        if (typeof YAW_NARRATION_SYSTEM !== 'undefined') {
            YAW_NARRATION_SYSTEM.resetRuntime(app, { clearRecords: true, reason: 'alpha-scenario' });
        }
        const player = this.unit(app, 'alpha-player', 'Tester', 'human', {
            hero: true,
            mc: true,
            ally: false,
            obedient: true,
            willing: true,
            disposition: app.DISPOSITION.PARTY,
            spd: 80,
            Figh: 45,
            Feas: 45,
            Flir: 45,
            Fuck: 45,
            Feed: 45,
            Flee: 45,
            size: 6,
            appetite: 8
        });
        app.player = player;
        app.party = [player];
        app.partyLeaderId = app._unitSelectionId(player);
        app.creatures = [];
        app.inventory = [];
        app.quests = [];
        app.storyEvents = [];
        app.sceneEvents = app.storyEvents;
        app.latestStoryEvent = null;
        app.latestSceneBeat = null;
        app.storyEventSeq = 0;
        app.log = [];
        app.tileEvents = [];
        app.location = { x: 0, y: 0 };
        app.currentBiome = 'grove';
        app.timeHour = 12;
        app.dayCount = 0;
        app.worldMeta = {
            worldId: `alpha-${mission.id}`,
            seed: `alpha:${mission.id}:v${this.VERSION}`,
            generatorVersion: 7,
            mapModsHash: 'core-alpha',
            createdAt: 0
        };
        app.worldMap = new Map();
        app.tileDeltas = new Map();
        app.exploredTiles = new Set(['0,0']);
        app.superPatchMap = new Map();
        app.largeMapOffset = { x: 0, y: 0 };
        app.largeMapSelected = null;
        app.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
        app.mode = app.GAME_MODE.NORMAL;
        app.activeActor = null;
        app.targetSelection = null;
        app.combatTargetId = null;
        app.combatTargetIds = [];
        app.combatPlanSelection = null;
        app.explorationActorIds = [app._unitSelectionId(player)];
        app.explorationActorId = app.explorationActorIds[0];
        app.explorationActorSelectionExplicit = false;
        app.explorationTargetIds = [];
        app.holdingsWindow = null;
        app.transactionWindow = null;
        app.defeatState = null;
        app.strandedCompanions = [];
        app.cheats = { godMode: false, neverHungry: false, canEatAnything: false, overpowered: false, noEnemies: false };
        app._overpoweredSnapshot = null;
        return player;
    },

    configureMission(app, mission, player) {
        const addCompanion = (id, name, species, overrides = {}) => {
            const unit = this.unit(app, id, name, species, {
                disposition: app.DISPOSITION.PARTY,
                ally: true,
                obedient: true,
                willing: true,
                ...overrides
            });
            app.party.push(unit);
            return unit;
        };
        const addCreature = (id, name, species, overrides = {}) => {
            const unit = this.unit(app, id, name, species, overrides);
            app.creatures.push(unit);
            return unit;
        };

        if (mission.id === 'interaction-single' || mission.id === 'content-posture') {
            addCreature('alpha-wolf', 'Rowan', 'wolf', {
                disposition: app.DISPOSITION.NEUTRAL,
                willing: false,
                CPle: 25,
                wis: 16
            });
        } else if (mission.id === 'interaction-group' || mission.id === 'responsive-layout') {
            addCompanion('alpha-eagle', 'Skye', 'eagle', { ranged: true, flying: true, combatRow: 'back' });
            addCreature('alpha-harpy', 'Gale', 'harpy', { disposition: app.DISPOSITION.NEUTRAL, flying: true, combatRow: 'back' });
            addCreature('alpha-wolf', 'Briar', 'wolf', { disposition: app.DISPOSITION.NEUTRAL, combatRow: 'front' });
        } else if (mission.id === 'self-containment') {
            const prey = this.unit(app, 'alpha-contained-mouse', 'Pip', 'mouse', {
                disposition: app.DISPOSITION.NEUTRAL,
                CPun: 42,
                MPun: 60,
                size: 2
            });
            player.stomach = [app._createStomachPrey(prey, {
                holder: player,
                holderId: player.id,
                containedId: prey.id,
                containerId: 'stomach',
                entryVerb: 'swallow'
            })];
        } else if (mission.id === 'companion-management') {
            addCompanion('alpha-bunny', 'Bunnyfolk', 'bunny');
            addCompanion('alpha-eagle', 'Eaglefolk', 'eagle', { ranged: true, flying: true, combatRow: 'back' });
            app.inventory = [
                app._createItemInstance('Leather Cap', { id: 'alpha-leather-cap' }),
                app._createItemInstance('Hide Armor', { id: 'alpha-hide-armor' }),
                app._createItemInstance('Focus Ring', { id: 'alpha-focus-ring' }),
                app._createItemInstance('Healing Herb', { id: 'alpha-healing-herb', quantity: 3 })
            ];
        } else if (mission.id === 'combat-group' || mission.id === 'failure-narration') {
            if (mission.id === 'combat-group') addCompanion('alpha-eagle', 'Skye', 'eagle', { ranged: true, flying: true, combatRow: 'back', spd: 35 });
            addCreature('alpha-harpy', 'Gale', 'harpy', {
                disposition: app.DISPOSITION.ENEMY,
                flying: true,
                ranged: true,
                combatRow: 'back',
                spd: 10,
                wis: 14
            });
            if (mission.id === 'combat-group') {
                addCreature('alpha-wolf', 'Briar', 'wolf', {
                    disposition: app.DISPOSITION.ENEMY,
                    combatRow: 'front',
                    spd: 8
                });
            }
        } else if (mission.id === 'terrain-composition') {
            app.cheats.noEnemies = true;
        }
    },

    terrainSurveyTile(app, x, y, biome, overrides = {}) {
        const base = app.getBaseTile(x, y);
        const overlays = {
            barriers: [],
            obstacles: [],
            cover: [],
            ...(overrides.overlays || {})
        };
        const terrainTopology = { elevation: 0.5, kind: 'level', band: 'mid', uphillEdges: [], downhillEdges: [], cliffEdges: [] };
        return {
            ...base,
            x,
            y,
            biome,
            baseBiome: biome,
            derivedBiome: biome,
            displayBiome: biome,
            macroBiome: biome,
            water: biome === 'water',
            elevation: 0.5,
            terrainTopology,
            terrain: {
                ...(base.terrain || {}),
                water: biome === 'water',
                elevation: 0.5,
                topology: terrainTopology
            },
            explored: true,
            seen: true,
            description: `Terrain survey ${biome} at ${x}, ${y}.`,
            hostile: false,
            danger: 0,
            dangerPressure: Number(overrides.dangerPressure || 0.08),
            creatures: [],
            items: [],
            deathBags: [],
            placedObjects: [],
            structure: null,
            hasLandmark: false,
            landmarkName: '',
            traversal: {
                ...(base.traversal || {}),
                passable: true,
                blocked: false,
                barrierEdges: []
            },
            overlays,
            ...overrides,
            overlays
        };
    },

    configureTerrainSurvey(app) {
        const biomes = ['grove', 'forest', 'plains', 'swamp', 'jungle', 'beach', 'water', 'cliff', 'cave'];
        const coverFamilies = ['broadleaf', 'conifer', 'grass', 'reeds', 'jungle', 'drift', '', 'rock', 'rock'];
        const structures = ['camp', 'hut', 'farm', 'spring', 'tree', 'cabin', 'pond', 'ruins', 'cave'];
        const poiCategories = ['restSite', 'structure', 'resourceSite', 'landmark', 'settlement', 'dangerSite', 'resourceSite', 'landmark', 'structure'];
        const elevationKinds = [
            { kind: 'level', band: 'low' },
            { kind: 'slope', band: 'low', primaryUphill: 'north', primaryDownhill: 'south', uphillEdges: ['north'], downhillEdges: ['south'] },
            { kind: 'slope', band: 'mid', primaryUphill: 'east', primaryDownhill: 'west', uphillEdges: ['east'], downhillEdges: ['west'] },
            { kind: 'slope', band: 'mid', primaryUphill: 'south', primaryDownhill: 'north', uphillEdges: ['south'], downhillEdges: ['north'] },
            { kind: 'slope', band: 'high', primaryUphill: 'west', primaryDownhill: 'east', uphillEdges: ['west'], downhillEdges: ['east'] },
            { kind: 'ledge', band: 'high', primaryDownhill: 'south', downhillEdges: ['south'] },
            { kind: 'cliff', band: 'high', primaryDownhill: 'east', downhillEdges: ['east'], cliffEdges: ['east'] },
            { kind: 'cliff', band: 'high', primaryDownhill: 'south', downhillEdges: ['south'], cliffEdges: ['south'] },
            { kind: 'cliff', band: 'high', primaryDownhill: 'west', downhillEdges: ['west'], cliffEdges: ['west'] }
        ];
        const tileAt = (x, y) => app.worldMap.get(`${x},${y}`);

        for (let y = -4; y <= 4; y++) {
            for (let x = -4; x <= 4; x++) {
                const column = x + 4;
                const biome = biomes[column];
                app.worldMap.set(`${x},${y}`, this.terrainSurveyTile(app, x, y, biome));
                app.exploredTiles.add(`${x},${y}`);
            }
        }

        // Row -3: explicit reusable cover families over their inherited ground.
        biomes.forEach((biome, index) => {
            const x = index - 4;
            const tile = tileAt(x, -3);
            const family = coverFamilies[index];
            tile.overlays.cover = family ? [
                { id: `survey-cover-${index}-a`, family, anchor: { x: 0.26, y: 0.3 }, scale: 0.66, role: 'decorative', mechanical: false, blocksMovement: false, blocksSight: false },
                { id: `survey-cover-${index}-b`, family, anchor: { x: 0.72, y: 0.7 }, scale: 0.52, role: 'decorative', mechanical: false, blocksMovement: false, blocksSight: false }
            ] : [];
        });

        // Row -2: one edge-to-edge road, with the water cell promoted to a bridge span.
        biomes.forEach((_biome, index) => {
            const x = index - 4;
            const tile = tileAt(x, -2);
            const connections = [
                ...(x > -4 ? ['west'] : []),
                ...(x < 4 ? ['east'] : [])
            ];
            if (tile.biome === 'water') {
                tile.overlays.bridge = {
                    id: 'survey-bridge', direction: 'east-west', connections,
                    spanIndex: 0, spanLength: 1, spanRole: 'single', shoreEdges: ['east', 'west']
                };
                tile.traversal.route = 'bridge';
            } else {
                tile.overlays.road = { id: `survey-road-${x}`, direction: 'east-west', connections };
                tile.traversal.route = 'road';
            }
        });

        // Row -1: transparent structures on nine different inherited materials.
        structures.forEach((structure, index) => {
            const tile = tileAt(index - 4, -1);
            tile.structure = structure;
            tile.featureFootprint = { width: 1, height: 1, part: 'single', anchor: { x: 0.5, y: 0.5 } };
        });

        // Row 0: POI grounding plus one shared multi-cell settlement footprint.
        poiCategories.forEach((category, index) => {
            const tile = tileAt(index - 4, 0);
            tile.overlays.poi = { id: `survey-poi-${index}`, category, footprint: { width: 1, height: 1, part: 'single' } };
            tile.hasLandmark = true;
            tile.landmarkName = `Survey ${category}`;
        });
        for (const x of [-1, 0]) {
            const tile = tileAt(x, 0);
            tile.overlays.poi = { id: 'survey-settlement-footprint', category: 'settlement', footprint: { width: 2, height: 1 } };
            tile.landmarkName = 'Shared survey settlement';
        }

        // Row 1: durable evidence and a non-hostile occupant without changing terrain identity.
        biomes.forEach((_biome, index) => {
            const x = index - 4;
            const tile = tileAt(x, 1);
            if (index % 4 === 0) tile.items = [{ id: `survey-item-${index}`, name: 'Survey item', quantity: index + 1 }];
            if (index % 4 === 1) tile.deathBags = [{ id: `survey-bag-${index}`, gold: index + 2, items: [] }];
            if (index % 4 === 2) tile.placedObjects = [{ id: `survey-object-${index}`, name: 'Trail marker', kind: 'trail-marker' }];
            if (index % 4 === 3) tile.resourceSearched = true;
        });
        tileAt(0, 1).creatures = [this.unit(app, 'survey-occupant', 'Surveyor', 'fox', {
            disposition: app.DISPOSITION.NEUTRAL,
            willing: true,
            obedient: false
        })];

        // Row 2: authored directional elevation and cliff facts for the presentation layer.
        elevationKinds.forEach((topology, index) => {
            const tile = tileAt(index - 4, 2);
            const elevation = 0.18 + index * 0.09;
            tile.elevation = Number(elevation.toFixed(3));
            tile.terrainTopology = { elevation: tile.elevation, ...topology };
            tile.terrain = { ...(tile.terrain || {}), elevation: tile.elevation, topology: tile.terrainTopology };
            tile.overlays.barriers = topology.cliffEdges || [];
            tile.traversal.barrierEdges = topology.cliffEdges || [];
        });

        // Rows 3-4 deliberately alternate materials to expose cardinal seams and four-tile junctions.
        const junctionBiomes = ['jungle', 'plains', 'cliff', 'beach', 'water', 'swamp', 'forest', 'sand', 'grove'];
        junctionBiomes.forEach((biome, index) => {
            const x = index - 4;
            for (const y of [3, 4]) {
                const tile = tileAt(x, y);
                const surveyBiome = y === 3 ? biome : junctionBiomes[(index + 1) % junctionBiomes.length];
                const displayBiome = surveyBiome === 'sand' ? 'beach' : surveyBiome;
                tile.biome = surveyBiome;
                tile.baseBiome = surveyBiome;
                tile.derivedBiome = surveyBiome;
                tile.displayBiome = displayBiome;
                tile.macroBiome = surveyBiome;
                tile.water = surveyBiome === 'water';
                tile.terrain = { ...(tile.terrain || {}), water: tile.water };
                tile.description = `Terrain survey ${displayBiome} at ${x}, ${y}.`;
            }
        });

        app.location = { x: 0, y: 0 };
        app.currentBiome = tileAt(0, 0).biome;
        app.creatures = tileAt(0, 0).creatures || [];
        app.largeMapOffset = { x: 0, y: 0 };
        app.largeMapSelected = { x: 0, y: 0 };
    },

    tileFor(app) {
        if (app.alphaSession?.scenarioId === 'terrain-composition') {
            this.configureTerrainSurvey(app);
            return app.worldMap.get('0,0');
        }
        const base = app.getBaseTile(0, 0);
        const tile = {
            ...base,
            x: 0,
            y: 0,
            explored: true,
            biome: 'grove',
            danger: 1,
            creatures: app.creatures,
            items: []
        };
        app.worldMap.set('0,0', tile);
        return tile;
    },

    renderGame(app, mission) {
        app.showScreen('game');
        app._renderTime?.();
        app.renderMap?.();
        app.renderParty?.();
        app.renderCreatures?.();
        app.renderLog?.();
        app.renderExplorationActions?.();
        app.updateScene?.(
            this.label(app, 'alpha.scene.title', 'Alpha mission: {title}', { title: this.missionTitle(app, mission) }),
            this.missionDescription(app, mission),
            false
        );
        app._addTileEvent?.(this.label(app, 'alpha.scene.ready', 'The prepared Alpha scenario is ready for testing.'), 'discovery');
        this.renderSessionBanner(app);
    },

    async launch(app, id, options = {}) {
        const mission = this.byId(id);
        if (!mission) return false;
        this.hideTutorial(app);
        app._autoSaveSuppressed = true;
        this.applySandboxStorage(app);
        if (options.preserveSandbox !== true) await this.clearSandboxStorage();
        const player = this.resetState(app, mission);
        this.configureMission(app, mission, player);
        app.alphaSession = {
            version: this.VERSION,
            scenarioId: mission.id,
            startedAt: new Date().toISOString(),
            outcome: 'unreviewed',
            checklist: this.checklistText(app, mission).map(text => ({ text, checked: false }))
        };
        this.tileFor(app);
        this.renderGame(app, mission);
        if (mission.id === 'combat-group' || mission.id === 'failure-narration') {
            app.startCombat([...app.creatures], { source: 'alpha-lab', announce: false });
            this.renderSessionBanner(app);
        }
        app._autoSaveSuppressed = false;
        if (mission.id !== 'terrain-composition') {
            app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'inventory', 'holdings', 'currentTile', 'worldTiles', 'combat', 'sceneFeed', 'activityLog'], 'alpha-scenario');
            app.autoSave?.({ immediate: true, reason: 'alpha-scenario' });
        }
        if (options.updateUrl !== false && typeof history !== 'undefined' && typeof location !== 'undefined') {
            const url = new URL(location.href);
            url.searchParams.set('alphaScenario', mission.id);
            history.replaceState(null, '', url.toString());
        }
        return true;
    },

    launchFromUrl(app) {
        const id = this.requestedScenario();
        if (!id || !this.byId(id)) return false;
        this.launch(app, id, { updateUrl: false }).catch(error => {
            console.error('Alpha scenario could not be prepared:', error);
            app.showAlphaLab?.();
        });
        return true;
    },

    requestedScenario() {
        if (typeof location === 'undefined') return '';
        return new URLSearchParams(location.search).get('alphaScenario') || '';
    },

    renderSessionBanner(app) {
        const banner = document.getElementById('alpha-session-banner');
        if (!banner) return;
        const mission = this.byId(app.alphaSession?.scenarioId);
        banner.hidden = !mission;
        if (!mission) return;
        const title = this.escape(app, this.missionTitle(app, mission));
        const prefix = this.escape(app, this.label(app, 'alpha.banner', 'Alpha mission'));
        const report = this.escape(app, this.label(app, 'alpha.report.open', 'Report outcome'));
        const exit = this.escape(app, this.label(app, 'alpha.exit', 'Exit Alpha'));
        banner.innerHTML = `<strong>${prefix}: ${title}</strong><span class="alpha-session-actions"><button class="nav-btn primary" type="button" data-command-surface="alpha-session" data-command-mode="system" data-command-control="open-alpha-report" onclick="App.showAlphaLab(true)">${report}</button><button class="nav-btn" type="button" data-command-surface="alpha-session" data-command-mode="system" data-command-control="exit-alpha" onclick="App.exitAlphaScenario()">${exit}</button></span>`;
    },

    render(app, reportMode = false) {
        const root = document.getElementById('alpha-lab-content');
        if (!root) return;
        const activeMission = this.byId(app.alphaSession?.scenarioId);
        const missionCards = this.missions.map(mission => {
            const title = this.escape(app, this.missionTitle(app, mission));
            const description = this.escape(app, this.missionDescription(app, mission));
            const checklist = this.checklistText(app, mission).map(text => `<li>${this.escape(app, text)}</li>`).join('');
            const launch = this.escape(app, this.label(app, 'alpha.launch', 'Launch mission'));
            const active = mission.id === activeMission?.id ? ' active' : '';
            return `<article class="alpha-mission-card${active}" data-alpha-mission="${this.escape(app, mission.id)}"><div class="alpha-mission-heading"><span class="alpha-mission-icon" aria-hidden="true">${mission.icon}</span><div><h2>${title}</h2><p>${description}</p></div></div><details><summary>${this.escape(app, this.label(app, 'alpha.expected', 'Expected behavior'))}</summary><ul>${checklist}</ul></details><button class="action-btn${active ? ' primary' : ''}" type="button" data-command-surface="alpha-lab" data-command-mode="system" data-command-control="launch-alpha-scenario" data-alpha-scenario="${this.escape(app, mission.id)}" onclick="App.launchAlphaScenario('${this.escape(app, mission.id)}')">${launch}</button></article>`;
        }).join('');
        const intro = this.escape(app, this.label(app, 'alpha.intro', 'Choose a prepared mission. Alpha saves use isolated storage and never replace an ordinary adventure.'));
        const reportPanel = activeMission ? this.reportPanelHtml(app, activeMission, reportMode) : '';
        root.innerHTML = `<p class="alpha-lab-intro">${intro}</p>${reportPanel}<div class="alpha-mission-grid">${missionCards}</div>`;
    },

    reportPanelHtml(app, mission, expanded = false) {
        const title = this.escape(app, this.label(app, 'alpha.report.title', 'Report this mission'));
        const help = this.escape(app, this.label(app, 'alpha.report.help', 'Mark the result, review the generated diagnostic bundle, and share it only when you are comfortable with its contents.'));
        const outcomes = [
            ['passed', 'alpha.outcome.passed', 'Passed'],
            ['confusing', 'alpha.outcome.confusing', 'Confusing'],
            ['broken', 'alpha.outcome.broken', 'Broken']
        ].map(([value, key, fallback]) => {
            const pressed = app.alphaSession?.outcome === value;
            return `<button class="nav-btn${pressed ? ' primary' : ''}" type="button" aria-pressed="${pressed ? 'true' : 'false'}" data-command-surface="alpha-report" data-command-mode="system" data-command-control="set-alpha-outcome" data-alpha-outcome="${value}" onclick="App.setAlphaOutcome('${value}')">${this.escape(app, this.label(app, key, fallback))}</button>`;
        }).join('');
        const checks = (app.alphaSession?.checklist || []).map((entry, index) => `<label class="alpha-check-row"><input type="checkbox" data-command-surface="alpha-report" data-command-mode="system" data-command-control="toggle-alpha-check" ${entry.checked ? 'checked' : ''} onchange="App.setAlphaChecklist(${index}, this.checked)"><span>${this.escape(app, entry.text)}</span></label>`).join('');
        const notes = this.escape(app, this.label(app, 'alpha.report.notes', 'What felt wrong or surprising?'));
        const prepare = this.escape(app, this.label(app, 'alpha.report.prepare', 'Prepare report'));
        const copy = this.escape(app, this.label(app, 'alpha.report.copy', 'Copy diagnostic bundle'));
        const issue = this.escape(app, this.label(app, 'alpha.report.issue', 'Open GitHub issue'));
        const preview = expanded ? this.escape(app, JSON.stringify(this.reportBundle(app), null, 2)) : '';
        return `<section class="alpha-report-panel" aria-labelledby="alpha-report-heading"><h2 id="alpha-report-heading">${title}: ${this.escape(app, this.missionTitle(app, mission))}</h2><p>${help}</p><div class="alpha-outcome-row" role="group" aria-label="${title}">${outcomes}</div><div class="alpha-checklist">${checks}</div><label class="alpha-notes-label" for="alpha-report-notes">${notes}</label><textarea id="alpha-report-notes" maxlength="2000" rows="5"></textarea><div class="alpha-report-actions"><button class="nav-btn primary" type="button" data-command-control="prepare-alpha-report" onclick="App.prepareAlphaReport()">${prepare}</button><button class="nav-btn" type="button" data-command-control="copy-alpha-report" onclick="App.copyAlphaReport()">${copy}</button><button class="nav-btn" type="button" data-command-control="open-alpha-issue" onclick="App.openAlphaIssue()">${issue}</button></div><pre id="alpha-report-preview" class="alpha-report-preview"${expanded ? '' : ' hidden'}>${preview}</pre><div id="alpha-report-status" class="holding-entry-meta" role="status" aria-live="polite"></div></section>`;
    },

    setOutcome(app, outcome) {
        if (!app.alphaSession || !['passed', 'confusing', 'broken'].includes(outcome)) return false;
        app.alphaSession.outcome = outcome;
        this.render(app, true);
        return true;
    },

    setChecklist(app, index, checked) {
        const entry = app.alphaSession?.checklist?.[Number(index)];
        if (!entry) return false;
        entry.checked = Boolean(checked);
        return true;
    },

    boundedText(value, limit = 500) {
        return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, limit);
    },

    reportBundle(app) {
        const mission = this.byId(app.alphaSession?.scenarioId);
        const checked = (app.alphaSession?.checklist || []).filter(entry => entry.checked).length;
        const recentScene = (app.storyEvents || []).slice(-12).map(event => ({
            action: this.boundedText(event?.action || event?.intent || '', 40),
            summary: this.boundedText(event?.summary || event?.text || '', 500),
            resultKind: this.boundedText(event?.resultKind || '', 40)
        }));
        const recentActivity = (app.log || []).slice(-12).map(entry => ({
            type: this.boundedText(entry?.type || '', 40),
            text: this.boundedText(entry?.text || '', 500)
        }));
        return {
            schema: this.REPORT_SCHEMA,
            release: {
                version: String(window.YAW_RELEASE?.version || 'unknown'),
                channel: String(window.YAW_RELEASE?.channel || 'unknown'),
                build: String(window.YAW_BUILD_ID || 'unknown')
            },
            scenario: {
                id: mission?.id || 'none',
                title: mission ? this.missionTitle(app, mission) : 'None',
                fixtureVersion: this.VERSION,
                outcome: app.alphaSession?.outcome || 'unreviewed',
                checklist: { checked, total: app.alphaSession?.checklist?.length || 0 }
            },
            environment: {
                language: String(app.settings?.language || 'en'),
                contentPosture: CONTENT?.isCategoryEnabled?.('explicit.sexual') ? 'mature-explicit-enabled' : (CONTENT?.preferences?.maxTier || 'sfw'),
                viewport: {
                    width: Math.max(0, Math.floor(Number(window.innerWidth) || 0)),
                    height: Math.max(0, Math.floor(Number(window.innerHeight) || 0))
                }
            },
            state: {
                mode: app.combatState?.active ? 'combat' : 'exploration',
                round: Math.max(0, Math.floor(Number(app.combatState?.round) || 0)),
                partyCount: (app.party || []).length,
                creatureCount: (app.creatures || []).length,
                selectedActorCount: (app.explorationActorIds || []).length,
                selectedTargetCount: (app.explorationTargetIds || []).length + (app.combatTargetIds || []).length
            },
            recentScene,
            recentActivity
        };
    },

    notes() {
        return this.boundedText(document.getElementById('alpha-report-notes')?.value || '', 2000);
    },

    reportText(app) {
        const notes = this.notes();
        return `${JSON.stringify(this.reportBundle(app), null, 2)}${notes ? `\n\nTester notes:\n${notes}` : ''}`;
    },

    prepareReport(app) {
        const preview = document.getElementById('alpha-report-preview');
        if (!preview) return false;
        preview.textContent = this.reportText(app);
        preview.hidden = false;
        return true;
    },

    async copyReport(app) {
        const text = this.reportText(app);
        const status = document.getElementById('alpha-report-status');
        try {
            await navigator.clipboard.writeText(text);
            if (status) status.textContent = this.label(app, 'alpha.report.copied', 'Diagnostic bundle copied. Review it before sharing.');
            return true;
        } catch (error) {
            if (status) status.textContent = this.label(app, 'alpha.report.copyFailed', 'Copy was unavailable. Select the prepared report text manually.');
            this.prepareReport(app);
            return false;
        }
    },

    openIssue(app) {
        const bundle = this.reportText(app).slice(0, 5500);
        const mission = this.byId(app.alphaSession?.scenarioId);
        const params = new URLSearchParams({
            title: `[Alpha] ${mission ? this.missionTitle(app, mission) : 'Playtest report'}`,
            body: `## Alpha playtest report\n\n\`\`\`json\n${bundle}\n\`\`\`\n\n## Additional context\n\nAdd screenshots or reproduction steps here.`
        });
        window.open(`${this.ISSUE_URL}?${params}`, '_blank', 'noopener,noreferrer');
        return true;
    },

    show(app, reportMode = false) {
        app.openOverlayScreen('alpha');
        this.render(app, reportMode);
        return true;
    },

    exit(app) {
        if (typeof location === 'undefined') return false;
        const url = new URL(location.href);
        url.searchParams.delete('alphaScenario');
        history.replaceState(null, '', url.toString());
        location.reload();
        return true;
    },

    diagnostics(app) {
        return {
            fixtureVersion: this.VERSION,
            missionIds: this.missions.map(mission => mission.id),
            activeScenario: app.alphaSession?.scenarioId || null,
            isolatedSaveDb: app.SAVE_DB_NAME === this.SAVE_DB_NAME,
            isolatedWorldDb: app.WORLD_DB_NAME === this.WORLD_DB_NAME,
            report: this.reportBundle(app)
        };
    }
};

if (typeof window !== 'undefined') window.YAW_ALPHA_LAB = YAW_ALPHA_LAB;
