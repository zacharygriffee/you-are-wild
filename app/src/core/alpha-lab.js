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
    TERRAIN_WORKBENCH_BIOMES: Object.freeze(['grove', 'forest', 'plains', 'swamp', 'jungle', 'beach', 'water', 'cliff', 'cave']),
    TERRAIN_WORKBENCH_DIRECTIONS: Object.freeze(['north', 'east', 'south', 'west']),
    TERRAIN_WORKBENCH_GEOMETRIES: Object.freeze(['straight', 'diagonal', 'convex', 'concave', 't-junction', 'four-way']),
    TERRAIN_WORKBENCH_RELIEFS: Object.freeze([
        'level', 'slope', 'terrace', 'drop', 'ridge', 'saddle', 'valley', 'peak', 'cliff-corner', 'rugged'
    ]),
    TERRAIN_WORKBENCH_OVERLAYS: Object.freeze(['none', 'road', 'bridge', 'structure', 'poi', 'evidence', 'presence', 'selection', 'all']),
    TERRAIN_WORKBENCH_PHASES: Object.freeze(['day', 'night']),
    TERRAIN_WORKBENCH_QUALITIES: Object.freeze(['performance', 'balanced', 'high']),
    TERRAIN_WORKBENCH_SEED_COUNT: 4,
    TERRAIN_WORKBENCH_REGRESSIONS: Object.freeze([
        Object.freeze({ id: 'plains-relief', source: 'plains', destination: 'plains', relief: 'rugged', geometry: 'straight', direction: 'north', overlay: 'none', phase: 'day', seed: 1 }),
        Object.freeze({ id: 'swamp-relief', source: 'swamp', destination: 'swamp', relief: 'terrace', geometry: 'diagonal', direction: 'east', overlay: 'none', phase: 'day', seed: 2 }),
        Object.freeze({ id: 'beach-corner', source: 'beach', destination: 'water', relief: 'cliff-corner', geometry: 'concave', direction: 'north', overlay: 'none', phase: 'night', seed: 3 }),
        Object.freeze({ id: 'forest-cover', source: 'forest', destination: 'forest', relief: 'level', geometry: 'four-way', direction: 'north', overlay: 'none', phase: 'day', seed: 1 }),
        Object.freeze({ id: 'jungle-variation', source: 'jungle', destination: 'jungle', relief: 'level', geometry: 'four-way', direction: 'north', overlay: 'none', phase: 'day', seed: 4 }),
        Object.freeze({ id: 'road-scale', source: 'forest', destination: 'forest', relief: 'level', geometry: 'straight', direction: 'east', overlay: 'road', phase: 'day', seed: 2 }),
        Object.freeze({ id: 'bridge-water-walls', source: 'beach', destination: 'water', relief: 'level', geometry: 'straight', direction: 'east', overlay: 'bridge', phase: 'day', seed: 1 }),
        Object.freeze({ id: 'oriented-drop', source: 'cliff', destination: 'plains', relief: 'drop', geometry: 'straight', direction: 'south', overlay: 'none', phase: 'day', seed: 2 }),
        Object.freeze({ id: 'ridge-road', source: 'cliff', destination: 'plains', relief: 'ridge', geometry: 'diagonal', direction: 'east', overlay: 'road', phase: 'day', seed: 1 }),
        Object.freeze({ id: 'saddle-structure', source: 'cliff', destination: 'cave', relief: 'saddle', geometry: 'four-way', direction: 'north', overlay: 'structure', phase: 'night', seed: 3 }),
        Object.freeze({ id: 'valley-presence', source: 'forest', destination: 'plains', relief: 'valley', geometry: 'concave', direction: 'west', overlay: 'presence', phase: 'day', seed: 2 }),
        Object.freeze({ id: 'peak-poi', source: 'cliff', destination: 'plains', relief: 'peak', geometry: 'convex', direction: 'north', overlay: 'poi', phase: 'day', seed: 1 })
    ]),

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
        },
        {
            id: 'terrain-workbench',
            icon: '🧪',
            category: 'presentation',
            titleKey: 'alpha.mission.terrainWorkbench.title',
            title: 'Tile Composition Workbench',
            descriptionKey: 'alpha.mission.terrainWorkbench.description',
            description: 'Generate isolated terrain pairings and junctions without neighboring test cases changing the result.',
            checklist: [
                ['alpha.check.terrainWorkbench.matrix', 'Every biome pairing, direction, geometry, overlay state, seed, and day phase is directly selectable.'],
                ['alpha.check.terrainWorkbench.isolation', 'Each generated 7x7 case is isolated, reproducible, and visible on local and Review Map surfaces.'],
                ['alpha.check.terrainWorkbench.jungle', 'Jungle reads as a continuous layered canopy without clipped trees or hidden gameplay markers.']
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
        } else if (mission.id === 'terrain-composition' || mission.id === 'terrain-workbench') {
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

    terrainSurveyHeightAt(x, y) {
        const elevation = 0.48
            + x * 0.055
            + Math.sin(y * 0.82) * 0.07
            + Math.cos((x - y) * 0.48) * 0.035;
        return Math.max(0.08, Math.min(0.92, elevation));
    },

    terrainSurveyTopologyAt(x, y) {
        const directions = [
            ['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]
        ];
        const elevation = this.terrainSurveyHeightAt(x, y);
        const cornerElevations = {
            nw: this.terrainSurveyHeightAt(x - 0.5, y - 0.5),
            ne: this.terrainSurveyHeightAt(x + 0.5, y - 0.5),
            se: this.terrainSurveyHeightAt(x + 0.5, y + 0.5),
            sw: this.terrainSurveyHeightAt(x - 0.5, y + 0.5)
        };
        Object.keys(cornerElevations).forEach(corner => {
            cornerElevations[corner] = Number(cornerElevations[corner].toFixed(4));
        });
        const terraceCount = 6;
        const levelFor = value => Math.max(0, Math.min(terraceCount - 1, Math.floor(value * terraceCount)));
        const terraceLevel = levelFor(elevation);
        const grades = Object.fromEntries(directions.map(([direction, dx, dy]) => [
            direction,
            Number((this.terrainSurveyHeightAt(x + dx, y + dy) - elevation).toFixed(4))
        ]));
        const terraceEdges = Object.fromEntries(directions.map(([direction, dx, dy]) => [
            direction,
            levelFor(this.terrainSurveyHeightAt(x + dx, y + dy)) - terraceLevel
        ]));
        const wallEdges = directions.map(([direction]) => direction).filter(direction => terraceEdges[direction] < 0);
        const riseEdges = directions.map(([direction]) => direction).filter(direction => terraceEdges[direction] > 0);
        const gradientX = ((cornerElevations.ne + cornerElevations.se) - (cornerElevations.nw + cornerElevations.sw)) / 2;
        const gradientY = ((cornerElevations.sw + cornerElevations.se) - (cornerElevations.nw + cornerElevations.ne)) / 2;
        const magnitude = Math.hypot(gradientX, gradientY);
        const aspect = Math.abs(gradientX) >= Math.abs(gradientY)
            ? (gradientX >= 0 ? 'east' : 'west')
            : (gradientY >= 0 ? 'south' : 'north');
        const byRise = Object.entries(grades).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
        const byDrop = Object.entries(grades).sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]));
        const maximumGrade = Math.max(...Object.values(grades).map(value => Math.abs(value)));
        const kind = maximumGrade >= 0.075 ? 'ledge' : (maximumGrade >= 0.035 ? 'slope' : 'level');
        return {
            elevation: Number(elevation.toFixed(4)),
            kind,
            band: elevation >= 0.72 ? 'high' : (elevation <= 0.28 ? 'low' : 'mid'),
            terraceLevel,
            terraceCount,
            cornerElevations,
            gradient: {
                x: Number(gradientX.toFixed(4)),
                y: Number(gradientY.toFixed(4)),
                magnitude: Number(magnitude.toFixed(4)),
                aspect: magnitude >= 0.0001 ? aspect : null
            },
            terraceEdges,
            wallEdges,
            riseEdges,
            contours: typeof WorldGen !== 'undefined' && typeof WorldGen.getElevationContours === 'function'
                ? WorldGen.getElevationContours(cornerElevations)
                : [],
            primaryUphill: byRise[0]?.[1] > 0 ? byRise[0][0] : null,
            primaryDownhill: byDrop[0]?.[1] < 0 ? byDrop[0][0] : null,
            uphillEdges: directions.map(([direction]) => direction).filter(direction => grades[direction] >= 0.025),
            downhillEdges: directions.map(([direction]) => direction).filter(direction => grades[direction] <= -0.025),
            cliffEdges: [],
            grades
        };
    },

    configureTerrainSurvey(app) {
        const biomes = ['grove', 'forest', 'plains', 'swamp', 'jungle', 'beach', 'water', 'cliff', 'cave'];
        const coverFamilies = ['broadleaf', 'conifer', 'grass', 'reeds', 'jungle', 'drift', '', 'rock', 'rock'];
        const structures = ['camp', 'hut', 'farm', 'spring', 'tree', 'cabin', 'pond', 'ruins', 'cave'];
        const poiCategories = ['restSite', 'structure', 'resourceSite', 'landmark', 'settlement', 'dangerSite', 'resourceSite', 'landmark', 'structure'];
        const tileAt = (x, y) => app.worldMap.get(`${x},${y}`);

        for (let y = -4; y <= 4; y++) {
            for (let x = -4; x <= 4; x++) {
                const column = x + 4;
                const biome = biomes[column];
                const terrainTopology = this.terrainSurveyTopologyAt(x, y);
                app.worldMap.set(`${x},${y}`, this.terrainSurveyTile(app, x, y, biome, {
                    elevation: terrainTopology.elevation,
                    terrainTopology,
                    terrain: {
                        water: biome === 'water',
                        elevation: terrainTopology.elevation,
                        topology: terrainTopology
                    }
                }));
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

        // Row 2: continuous computed elevation samples. Mechanical cliff facts
        // follow the same topology instead of overriding its grades or contours.
        biomes.forEach((_biome, index) => {
            const tile = tileAt(index - 4, 2);
            const cliffEdges = tile.biome === 'cliff' ? [...(tile.terrainTopology.wallEdges || [])] : [];
            tile.terrainTopology = { ...tile.terrainTopology, cliffEdges };
            tile.terrain = { ...(tile.terrain || {}), elevation: tile.elevation, topology: tile.terrainTopology };
            tile.overlays.barriers = cliffEdges;
            tile.traversal.barrierEdges = cliffEdges;
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

    terrainWorkbenchDefaults() {
        return {
            source: 'jungle',
            destination: 'plains',
            direction: 'north',
            geometry: 'straight',
            relief: 'terrace',
            overlay: 'none',
            phase: 'day',
            quality: 'balanced',
            seed: 0
        };
    },

    normalizeTerrainWorkbench(input = {}) {
        const defaults = this.terrainWorkbenchDefaults();
        const choose = (value, values, fallback) => values.includes(String(value || '')) ? String(value) : fallback;
        return {
            source: choose(input.source, this.TERRAIN_WORKBENCH_BIOMES, defaults.source),
            destination: choose(input.destination, this.TERRAIN_WORKBENCH_BIOMES, defaults.destination),
            direction: choose(input.direction, this.TERRAIN_WORKBENCH_DIRECTIONS, defaults.direction),
            geometry: choose(input.geometry, this.TERRAIN_WORKBENCH_GEOMETRIES, defaults.geometry),
            relief: choose(input.relief, this.TERRAIN_WORKBENCH_RELIEFS, defaults.relief),
            overlay: choose(input.overlay, this.TERRAIN_WORKBENCH_OVERLAYS, defaults.overlay),
            phase: choose(input.phase, this.TERRAIN_WORKBENCH_PHASES, defaults.phase),
            quality: choose(input.quality, this.TERRAIN_WORKBENCH_QUALITIES, defaults.quality),
            seed: Math.max(0, Math.min(999, Math.trunc(Number(input.seed) || 0)))
        };
    },

    terrainWorkbenchFromUrl() {
        if (typeof location === 'undefined') return this.terrainWorkbenchDefaults();
        const query = new URLSearchParams(location.search);
        return this.normalizeTerrainWorkbench({
            source: query.get('terrainSource'),
            destination: query.get('terrainDestination'),
            direction: query.get('terrainDirection'),
            geometry: query.get('terrainGeometry'),
            relief: query.get('terrainRelief'),
            overlay: query.get('terrainOverlay'),
            phase: query.get('terrainPhase'),
            quality: query.get('terrainQuality'),
            seed: query.get('terrainSeed')
        });
    },

    terrainWorkbenchCaseCount() {
        return this.TERRAIN_WORKBENCH_BIOMES.length ** 2
            * this.TERRAIN_WORKBENCH_DIRECTIONS.length
            * this.TERRAIN_WORKBENCH_GEOMETRIES.length
            * this.TERRAIN_WORKBENCH_RELIEFS.length
            * this.TERRAIN_WORKBENCH_OVERLAYS.length
            * this.TERRAIN_WORKBENCH_PHASES.length
            * this.TERRAIN_WORKBENCH_SEED_COUNT;
    },

    terrainWorkbenchCaseIndex(input = {}) {
        const state = this.normalizeTerrainWorkbench(input);
        const dimensions = [
            [state.source, this.TERRAIN_WORKBENCH_BIOMES],
            [state.destination, this.TERRAIN_WORKBENCH_BIOMES],
            [state.direction, this.TERRAIN_WORKBENCH_DIRECTIONS],
            [state.geometry, this.TERRAIN_WORKBENCH_GEOMETRIES],
            [state.relief, this.TERRAIN_WORKBENCH_RELIEFS],
            [state.overlay, this.TERRAIN_WORKBENCH_OVERLAYS],
            [state.phase, this.TERRAIN_WORKBENCH_PHASES],
            [state.seed % this.TERRAIN_WORKBENCH_SEED_COUNT, Array.from({ length: this.TERRAIN_WORKBENCH_SEED_COUNT }, (_, index) => index)]
        ];
        return dimensions.reduce((index, [value, values]) => index * values.length + values.indexOf(value), 0);
    },

    terrainWorkbenchCaseAt(index = 0) {
        const dimensions = [
            this.TERRAIN_WORKBENCH_BIOMES,
            this.TERRAIN_WORKBENCH_BIOMES,
            this.TERRAIN_WORKBENCH_DIRECTIONS,
            this.TERRAIN_WORKBENCH_GEOMETRIES,
            this.TERRAIN_WORKBENCH_RELIEFS,
            this.TERRAIN_WORKBENCH_OVERLAYS,
            this.TERRAIN_WORKBENCH_PHASES,
            Array.from({ length: this.TERRAIN_WORKBENCH_SEED_COUNT }, (_, value) => value)
        ];
        const values = Array(dimensions.length);
        let cursor = ((Math.trunc(Number(index) || 0) % this.terrainWorkbenchCaseCount()) + this.terrainWorkbenchCaseCount()) % this.terrainWorkbenchCaseCount();
        for (let position = dimensions.length - 1; position >= 0; position--) {
            const options = dimensions[position];
            values[position] = options[cursor % options.length];
            cursor = Math.floor(cursor / options.length);
        }
        return this.normalizeTerrainWorkbench({
            source: values[0], destination: values[1], direction: values[2], geometry: values[3], relief: values[4],
            overlay: values[5], phase: values[6], seed: values[7]
        });
    },

    terrainWorkbenchCoordinates(x, y, direction) {
        if (direction === 'east') return { across: y, forward: -x };
        if (direction === 'south') return { across: -x, forward: -y };
        if (direction === 'west') return { across: -y, forward: x };
        return { across: x, forward: y };
    },

    terrainWorkbenchBiomeAt(x, y, state) {
        const { across, forward } = this.terrainWorkbenchCoordinates(x, y, state.direction);
        const destination = {
            straight: forward < 0,
            diagonal: forward + across < 0,
            convex: forward < 0 && across > 0,
            concave: forward < 0 || across > 0,
            't-junction': forward < 0 || (Math.abs(across) <= 1 && forward > 0),
            'four-way': (across < 0 && forward < 0) || (across > 0 && forward > 0)
        }[state.geometry];
        return destination ? state.destination : state.source;
    },

    terrainWorkbenchHeightAt(x, y, state) {
        const { across, forward } = this.terrainWorkbenchCoordinates(x, y, state.direction);
        if (state.relief === 'slope') return Math.max(0.18, Math.min(0.82, 0.5 - forward * 0.045));
        if (state.relief === 'terrace') return forward < 0 ? 0.72 : 0.44;
        if (state.relief === 'drop') return forward <= 0 ? 0.82 : 0.24;
        if (state.relief === 'ridge') return Math.max(0.12, Math.min(0.88,
            0.18 + Math.exp(-(across * across) * 0.9) * 0.7 + Math.sin(forward * 0.55) * 0.02));
        if (state.relief === 'valley') return Math.max(0.12, Math.min(0.88,
            0.82 - Math.exp(-(across * across) * 0.9) * 0.66 + Math.sin(forward * 0.45) * 0.02));
        if (state.relief === 'peak') return Math.max(0.12, Math.min(0.9,
            0.18 + Math.exp(-(across * across + forward * forward) * 0.55) * 0.72));
        if (state.relief === 'saddle') return Math.max(0.12, Math.min(0.88,
            0.5 + Math.tanh(across * forward * 0.72) * 0.3));
        if (state.relief === 'cliff-corner') return forward < 0 || across > 0 ? 0.76 : 0.38;
        if (state.relief === 'rugged') {
            const seed = Number(state.seed || 0);
            return Math.max(0.16, Math.min(0.84,
                0.5
                + Math.sin((across + seed * 0.37) * 0.92) * 0.18
                + Math.cos((forward - seed * 0.29) * 0.74) * 0.14));
        }
        return 0.5;
    },

    terrainWorkbenchTopologyAt(x, y, state) {
        const directions = [
            ['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]
        ];
        const elevation = this.terrainWorkbenchHeightAt(x, y, state);
        const cornerElevations = {
            nw: this.terrainWorkbenchHeightAt(x - 0.5, y - 0.5, state),
            ne: this.terrainWorkbenchHeightAt(x + 0.5, y - 0.5, state),
            se: this.terrainWorkbenchHeightAt(x + 0.5, y + 0.5, state),
            sw: this.terrainWorkbenchHeightAt(x - 0.5, y + 0.5, state)
        };
        Object.keys(cornerElevations).forEach(corner => {
            cornerElevations[corner] = Number(cornerElevations[corner].toFixed(4));
        });
        const terraceCount = 6;
        const levelFor = value => Math.max(0, Math.min(terraceCount - 1, Math.floor(value * terraceCount)));
        const terraceLevel = levelFor(elevation);
        const grades = Object.fromEntries(directions.map(([direction, dx, dy]) => [
            direction,
            Number((this.terrainWorkbenchHeightAt(x + dx, y + dy, state) - elevation).toFixed(4))
        ]));
        const terraceEdges = Object.fromEntries(directions.map(([direction, dx, dy]) => [
            direction,
            levelFor(this.terrainWorkbenchHeightAt(x + dx, y + dy, state)) - terraceLevel
        ]));
        const wallEdges = directions.map(([direction]) => direction).filter(direction => terraceEdges[direction] < 0);
        const riseEdges = directions.map(([direction]) => direction).filter(direction => terraceEdges[direction] > 0);
        const gradientX = ((cornerElevations.ne + cornerElevations.se) - (cornerElevations.nw + cornerElevations.sw)) / 2;
        const gradientY = ((cornerElevations.sw + cornerElevations.se) - (cornerElevations.nw + cornerElevations.ne)) / 2;
        const magnitude = Math.hypot(gradientX, gradientY);
        const aspect = Math.abs(gradientX) >= Math.abs(gradientY)
            ? (gradientX >= 0 ? 'east' : 'west')
            : (gradientY >= 0 ? 'south' : 'north');
        const byRise = Object.entries(grades).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
        const byDrop = Object.entries(grades).sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]));
        const maximumGrade = Math.max(...Object.values(grades).map(value => Math.abs(value)));
        const kind = ['drop', 'cliff-corner'].includes(state.relief) ? 'cliff'
            : (state.relief === 'terrace' ? 'ledge'
                : (state.relief === 'rugged' ? (maximumGrade >= 0.075 ? 'cliff' : (maximumGrade >= 0.035 ? 'ledge' : 'slope'))
                    : (['ridge', 'saddle', 'valley', 'peak'].includes(state.relief)
                        ? (maximumGrade >= 0.12 ? 'ledge' : 'slope')
                        : state.relief)));
        const curvature = {
            x: Number((grades.east + grades.west).toFixed(4)),
            y: Number((grades.north + grades.south).toFixed(4)),
            cross: Number(((cornerElevations.ne + cornerElevations.sw
                - cornerElevations.nw - cornerElevations.se) / 2).toFixed(4))
        };
        curvature.laplacian = Number((curvature.x + curvature.y).toFixed(4));
        return {
            elevation: Number(elevation.toFixed(4)), kind, band: elevation >= 0.72 ? 'high' : (elevation <= 0.28 ? 'low' : 'mid'),
            landform: state.relief === 'cliff-corner' ? 'drop' : state.relief,
            terraceLevel, terraceCount, cornerElevations,
            gradient: { x: Number(gradientX.toFixed(4)), y: Number(gradientY.toFixed(4)), magnitude: Number(magnitude.toFixed(4)), aspect: magnitude ? aspect : null },
            curvature,
            terraceEdges, wallEdges, riseEdges,
            contours: typeof WorldGen !== 'undefined' && typeof WorldGen.getElevationContours === 'function'
                ? WorldGen.getElevationContours(cornerElevations)
                : [],
            primaryUphill: byRise[0]?.[1] > 0 ? byRise[0][0] : null,
            primaryDownhill: byDrop[0]?.[1] < 0 ? byDrop[0][0] : null,
            dropOrientation: ['drop', 'cliff-corner', 'terrace'].includes(state.relief) && byDrop[0]?.[1] < 0 ? byDrop[0][0] : null,
            uphillEdges: directions.map(([direction]) => direction).filter(direction => grades[direction] >= 0.025),
            downhillEdges: directions.map(([direction]) => direction).filter(direction => grades[direction] <= -0.025),
            cliffEdges: ['drop', 'cliff-corner', 'rugged'].includes(state.relief) && kind === 'cliff' ? wallEdges : [],
            grades
        };
    },

    applyTerrainWorkbenchOverlay(app, state) {
        const tileAt = (x, y) => app.worldMap.get(`${x},${y}`);
        const routeVertical = state.direction === 'north' || state.direction === 'south';
        const routeCoordinates = Array.from({ length: 7 }, (_, index) => routeVertical
            ? { x: 0, y: index - 3 }
            : { x: index - 3, y: 0 });
        const addRoad = () => routeCoordinates.forEach(({ x, y }, index) => {
            const tile = tileAt(x, y);
            const connections = routeVertical
                ? [...(index > 0 ? ['north'] : []), ...(index < routeCoordinates.length - 1 ? ['south'] : [])]
                : [...(index > 0 ? ['west'] : []), ...(index < routeCoordinates.length - 1 ? ['east'] : [])];
            tile.overlays.road = { id: `workbench-road-${x}-${y}`, direction: routeVertical ? 'north-south' : 'east-west', connections };
            tile.traversal.route = 'road';
        });
        if (state.overlay === 'road' || state.overlay === 'all') addRoad();
        if (state.overlay === 'bridge') {
            const center = tileAt(0, 0);
            center.overlays.bridge = {
                id: 'workbench-bridge', direction: routeVertical ? 'north-south' : 'east-west',
                connections: routeVertical ? ['north', 'south'] : ['east', 'west'],
                spanIndex: 0, spanLength: 1, spanRole: 'single',
                shoreEdges: routeVertical ? ['north', 'south'] : ['east', 'west']
            };
            center.traversal.route = 'bridge';
        }
        const center = tileAt(0, 0);
        if (state.overlay === 'structure' || state.overlay === 'all') {
            center.structure = 'camp';
            center.featureFootprint = { width: 1, height: 1, part: 'single', anchor: { x: 0.5, y: 0.5 } };
        }
        if (state.overlay === 'poi' || state.overlay === 'all') {
            center.overlays.poi = { id: 'workbench-poi', category: 'landmark', footprint: { width: 1, height: 1, part: 'single' } };
            center.hasLandmark = true;
            center.landmarkName = 'Composition marker';
        }
        if (state.overlay === 'evidence' || state.overlay === 'all') {
            center.items = [{ id: 'workbench-item', name: 'Survey item', quantity: 1 }];
            center.deathBags = [{ id: 'workbench-bag', gold: 2, items: [] }];
            center.placedObjects = [{ id: 'workbench-marker', name: 'Trail marker', kind: 'trail-marker' }];
        }
        if (state.overlay === 'presence' || state.overlay === 'all') {
            center.creatures = [this.unit(app, 'workbench-scout', 'Surveyor', 'fox', {
                disposition: app.DISPOSITION.NEUTRAL, willing: true
            })];
        }
        app.largeMapSelected = ['selection', 'all'].includes(state.overlay) ? { x: 0, y: 0 } : null;
    },

    configureTerrainWorkbench(app, input = app.alphaTerrainWorkbench) {
        const state = this.normalizeTerrainWorkbench(input);
        app.alphaTerrainWorkbench = state;
        app.worldMap.clear();
        app.exploredTiles.clear();
        for (let y = -3; y <= 3; y++) {
            for (let x = -3; x <= 3; x++) {
                const biome = this.terrainWorkbenchBiomeAt(x, y, state);
                const tile = this.terrainSurveyTile(app, x, y, biome, {
                    visualSeed: state.seed,
                    description: `${state.geometry} ${state.source} to ${state.destination} composition case at ${x}, ${y}.`
                });
                const topology = this.terrainWorkbenchTopologyAt(x, y, state);
                tile.elevation = topology.elevation;
                tile.terrainTopology = topology;
                tile.terrain = { ...(tile.terrain || {}), elevation: topology.elevation, topology };
                tile.overlays.barriers = topology.cliffEdges.slice();
                tile.traversal.barrierEdges = topology.cliffEdges.slice();
                app.worldMap.set(`${x},${y}`, tile);
                app.exploredTiles.add(`${x},${y}`);
            }
        }
        this.applyTerrainWorkbenchOverlay(app, state);
        app.location = { x: 0, y: 0 };
        app.currentBiome = app.worldMap.get('0,0').biome;
        app.creatures = app.worldMap.get('0,0').creatures || [];
        app.largeMapOffset = { x: 0, y: 0 };
        if (!['selection', 'all'].includes(state.overlay)) app.largeMapSelected = null;
        app.timeHour = state.phase === 'night' ? 22 : 12;
        app._renderTime?.();
        return state;
    },

    terrainWorkbenchSelect(app, key, values, current) {
        const labels = { 't-junction': 'T-junction', 'four-way': 'Four-way junction' };
        const options = values.map(value => `<option value="${this.escape(app, value)}"${value === current ? ' selected' : ''}>${this.escape(app, labels[value] || String(value).replace(/(^|-)([a-z])/g, (_match, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`))}</option>`).join('');
        return `<select id="terrain-workbench-${this.escape(app, key)}" data-terrain-workbench-control="${this.escape(app, key)}" onchange="App.setTerrainWorkbench('${this.escape(app, key)}', this.value)">${options}</select>`;
    },

    renderTerrainWorkbench(app) {
        const panel = document.getElementById('alpha-terrain-workbench');
        if (!panel) return;
        const active = app.alphaSession?.scenarioId === 'terrain-workbench';
        panel.hidden = !active || app.alphaTerrainWorkbenchOpen === false;
        if (!active) return;
        const state = this.normalizeTerrainWorkbench(app.alphaTerrainWorkbench);
        const index = this.terrainWorkbenchCaseIndex(state);
        const count = this.terrainWorkbenchCaseCount();
        panel.innerHTML = `<div class="terrain-workbench-heading"><div><strong>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.title', 'Tile Composition Workbench'))}</strong><small>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.case', 'Case {current} of {count}', { current: index + 1, count: count.toLocaleString() }))}</small></div><button type="button" class="nav-btn" aria-label="${this.escape(app, this.label(app, 'alpha.terrainWorkbench.close', 'Close workbench'))}" onclick="App.toggleTerrainWorkbench(false)">×</button></div><div class="terrain-workbench-grid"><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.source', 'Source biome'))}${this.terrainWorkbenchSelect(app, 'source', this.TERRAIN_WORKBENCH_BIOMES, state.source)}</label><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.destination', 'Destination biome'))}${this.terrainWorkbenchSelect(app, 'destination', this.TERRAIN_WORKBENCH_BIOMES, state.destination)}</label><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.direction', 'Direction'))}${this.terrainWorkbenchSelect(app, 'direction', this.TERRAIN_WORKBENCH_DIRECTIONS, state.direction)}</label><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.geometry', 'Boundary geometry'))}${this.terrainWorkbenchSelect(app, 'geometry', this.TERRAIN_WORKBENCH_GEOMETRIES, state.geometry)}</label><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.relief', 'Relief'))}${this.terrainWorkbenchSelect(app, 'relief', this.TERRAIN_WORKBENCH_RELIEFS, state.relief)}</label><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.overlay', 'Overlay'))}${this.terrainWorkbenchSelect(app, 'overlay', this.TERRAIN_WORKBENCH_OVERLAYS, state.overlay)}</label><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.phase', 'Lighting'))}${this.terrainWorkbenchSelect(app, 'phase', this.TERRAIN_WORKBENCH_PHASES, state.phase)}</label><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.quality', 'Rendering quality'))}${this.terrainWorkbenchSelect(app, 'quality', this.TERRAIN_WORKBENCH_QUALITIES, state.quality)}</label><label>${this.escape(app, this.label(app, 'alpha.terrainWorkbench.seed', 'Art seed'))}<input id="terrain-workbench-seed" data-terrain-workbench-control="seed" type="number" min="0" max="999" step="1" value="${state.seed}" onchange="App.setTerrainWorkbench('seed', this.value)"></label></div><div class="terrain-workbench-actions"><button type="button" class="nav-btn" onclick="App.stepTerrainWorkbench(-1)">← ${this.escape(app, this.label(app, 'alpha.terrainWorkbench.previous', 'Previous case'))}</button><button type="button" class="nav-btn primary" onclick="App.stepTerrainWorkbench(1)">${this.escape(app, this.label(app, 'alpha.terrainWorkbench.next', 'Next case'))} →</button></div><p class="terrain-workbench-summary">${this.escape(app, `${state.source} → ${state.destination} · ${state.geometry} ${state.direction} · ${state.relief} · ${state.overlay} · ${state.phase} · ${state.quality} · seed ${state.seed}`)}</p>`;
    },

    updateTerrainWorkbenchUrl(state) {
        if (typeof history === 'undefined' || typeof location === 'undefined') return;
        const url = new URL(location.href);
        const values = {
            terrainSource: state.source, terrainDestination: state.destination,
            terrainDirection: state.direction, terrainGeometry: state.geometry,
            terrainRelief: state.relief,
            terrainOverlay: state.overlay, terrainPhase: state.phase, terrainQuality: state.quality, terrainSeed: state.seed
        };
        Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, String(value)));
        history.replaceState(null, '', url.toString());
    },

    setTerrainWorkbench(app, key, value) {
        if (app.alphaSession?.scenarioId !== 'terrain-workbench') return false;
        const state = this.configureTerrainWorkbench(app, { ...(app.alphaTerrainWorkbench || {}), [key]: value });
        this.updateTerrainWorkbenchUrl(state);
        app.renderMap?.();
        app.renderParty?.();
        app.renderCreatures?.();
        app.renderExplorationActions?.();
        app.updateScene?.(
            this.label(app, 'alpha.terrainWorkbench.sceneTitle', 'Composition case: {source} to {destination}', {
                source: state.source,
                destination: state.destination
            }),
            `${state.geometry} ${state.direction} · ${state.overlay} · ${state.phase} · seed ${state.seed}`,
            false
        );
        this.renderSessionBanner(app);
        this.renderTerrainWorkbench(app);
        return true;
    },

    stepTerrainWorkbench(app, amount = 1) {
        const quality = this.normalizeTerrainWorkbench(app.alphaTerrainWorkbench).quality;
        const state = {
            ...this.terrainWorkbenchCaseAt(this.terrainWorkbenchCaseIndex(app.alphaTerrainWorkbench) + Math.trunc(Number(amount) || 0)),
            quality
        };
        if (app.alphaSession?.scenarioId !== 'terrain-workbench') return false;
        app.alphaTerrainWorkbench = state;
        return this.setTerrainWorkbench(app, 'seed', state.seed);
    },

    toggleTerrainWorkbench(app, force = null) {
        const next = force == null ? app.alphaTerrainWorkbenchOpen === false : Boolean(force);
        app.alphaTerrainWorkbenchOpen = next;
        this.renderTerrainWorkbench(app);
        return next;
    },

    tileFor(app) {
        if (app.alphaSession?.scenarioId === 'terrain-composition') {
            this.configureTerrainSurvey(app);
            return app.worldMap.get('0,0');
        }
        if (app.alphaSession?.scenarioId === 'terrain-workbench') {
            this.configureTerrainWorkbench(app);
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
        this.renderTerrainWorkbench(app);
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
        if (mission.id === 'terrain-workbench') {
            app.alphaTerrainWorkbench = this.terrainWorkbenchFromUrl();
            app.alphaTerrainWorkbenchOpen = true;
        }
        this.tileFor(app);
        this.renderGame(app, mission);
        if (mission.id === 'combat-group' || mission.id === 'failure-narration') {
            app.startCombat([...app.creatures], { source: 'alpha-lab', announce: false });
            this.renderSessionBanner(app);
        }
        app._autoSaveSuppressed = false;
        if (!['terrain-composition', 'terrain-workbench'].includes(mission.id)) {
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
        const workbench = mission.id === 'terrain-workbench'
            ? `<button class="nav-btn" type="button" data-command-surface="alpha-session" data-command-mode="system" data-command-control="toggle-terrain-workbench" onclick="App.toggleTerrainWorkbench()">${this.escape(app, this.label(app, 'alpha.terrainWorkbench.open', 'Workbench'))}</button>`
            : '';
        banner.innerHTML = `<strong>${prefix}: ${title}</strong><span class="alpha-session-actions">${workbench}<button class="nav-btn primary" type="button" data-command-surface="alpha-session" data-command-mode="system" data-command-control="open-alpha-report" onclick="App.showAlphaLab(true)">${report}</button><button class="nav-btn" type="button" data-command-surface="alpha-session" data-command-mode="system" data-command-control="exit-alpha" onclick="App.exitAlphaScenario()">${exit}</button></span>`;
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
                checklist: { checked, total: app.alphaSession?.checklist?.length || 0 },
                ...(mission?.id === 'terrain-workbench'
                    ? { compositionCase: this.normalizeTerrainWorkbench(app.alphaTerrainWorkbench) }
                    : {})
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
        ['terrainSource', 'terrainDestination', 'terrainDirection', 'terrainGeometry', 'terrainOverlay', 'terrainPhase', 'terrainSeed']
            .forEach(key => url.searchParams.delete(key));
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
