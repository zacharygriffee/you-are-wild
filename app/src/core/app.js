
        // =============================================
        // FIGHT FUCK FEED - MECHANICS OVERHAUL
        // =============================================

        const App = {
            // === CONSTANTS ===
            GAME_MODE: { NORMAL: 'normal', COMBAT: 'combat' },
            DISPOSITION: { ENEMY: 'enemy', NEUTRAL: 'neutral', FRIENDLY: 'friendly', PARTY: 'party', CORPSE: 'corpse', QUEST_GIVER: 'quest_giver', MERCHANT: 'merchant' },
            ACTION: { FIGHT: 'fight', FLIRT: 'flirt', FEAST: 'feast', FUCK: 'fuck', FEED: 'feed', FLEE: 'flee', SYNC_FIGHT: 'sync_fight', SYNC_FUCK: 'sync_fuck', SYNC_FEED: 'sync_feed', PROTECT: 'protect', RETREAT_COVER: 'retreat_cover' },
            UI_LABELS: {
                fight: 'Fight',
                flirt: 'Flirt',
                feast: 'Feast',
                fuck: 'Fuck',
                feed: 'Feed',
                flee: 'Flee',
                search: 'Search',
                rest: 'Rest',
                inventory: 'Items',
                takeItems: 'Take Items',
                quests: 'Quests',
                interact: 'Interact',
                enter: 'Enter',
                exit: 'Exit',
                map: 'Map',
                party: 'Party',
                enemies: 'Enemies'
            },
            LOG_CATEGORIES: {
                combat: { label: 'Combat', icon: '⚔️' },
                discovery: { label: 'Discovery', icon: '🧭' },
                loot: { label: 'Loot', icon: '🎒' },
                heal: { label: 'Heal', icon: '💚' },
                mod: { label: 'Mod', icon: '🧩' }
            },
            MAP_TILESET_KEYS: {
                ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys : {}),
                biomes: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.biomes : {}),
                    grove: 'terrain-grove',
                    forest: 'terrain-forest',
                    plains: 'terrain-plains',
                    swamp: 'terrain-swamp',
                    jungle: 'terrain-jungle',
                    cliff: 'terrain-cliff',
                    water: 'terrain-water',
                    beach: 'terrain-beach',
                    cave: 'terrain-cave',
                    dungeon: 'terrain-dungeon',
                    manor: 'terrain-manor',
                    farm: 'terrain-farm',
                    indoors: 'terrain-indoors',
                    entrance: 'terrain-entrance'
                },
                roads: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.roads : {}),
                    'east-west': 'route-road-horizontal',
                    'north-south': 'route-road-vertical',
                    corner: 'route-road-corner',
                    'corner-ne': 'route-road-corner-ne',
                    'corner-es': 'route-road-corner-es',
                    'corner-sw': 'route-road-corner-sw',
                    'corner-wn': 'route-road-corner-wn',
                    intersection: 'route-road-intersection',
                    't-n': 'route-road-t-n',
                    't-e': 'route-road-t-e',
                    't-s': 'route-road-t-s',
                    't-w': 'route-road-t-w',
                    end: 'route-road-end'
                },
                bridges: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.bridges : {}),
                    'east-west': 'route-bridge-horizontal',
                    'north-south': 'route-bridge-vertical'
                },
                poi: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.poi : {}),
                    settlement: 'poi-settlement',
                    restSite: 'poi-rest-site',
                    resourceSite: 'poi-resource-site',
                    dangerSite: 'poi-danger-site',
                    landmark: 'poi-landmark',
                    structure: 'poi-structure'
                },
                structures: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.structures : {}),
                    camp: 'structure-camp',
                    spring: 'structure-spring',
                    cabin: 'structure-cabin',
                    hut: 'structure-hut',
                    farm: 'structure-farm',
                    cave: 'structure-cave-mouth',
                    ruins: 'structure-ruins',
                    shrine: 'structure-shrine',
                    pond: 'structure-pond',
                    tree: 'structure-great-tree',
                    burrow: 'structure-burrow',
                    nest: 'structure-nest',
                    web: 'structure-web'
                },
                interior: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.interior : {}),
                    room: 'interior-room',
                    cave: 'interior-cave-room',
                    exit: 'interior-exit',
                    wall: 'interior-wall',
                    door: 'interior-door',
                    entrance: 'interior-entrance'
                }
            },
            SAFE_REST_STRUCTURES: ['cabin', 'hut', 'shrine', 'spring'],
            NOCTURNAL_SPECIES: ['bat', 'rat'],
            DIURNAL_SPECIES: ['bunny', 'deer'],
            DAY_VISIBILITY_RADIUS: 2,
            NIGHT_VISIBILITY_PENALTY: 2,
            PARTY_AI_ORDERS: {
                aggressive: 'Aggressive',
                defensive: 'Defensive',
                healer: 'Healer',
                scavenger: 'Scavenger',
                passive: 'Passive'
            },
            PARTY_ROLES: {
                companion: 'Companion',
                scout: 'Scout',
                guard: 'Guard',
                support: 'Support',
                gatherer: 'Gatherer'
            },
            SUB_ACTIONS: YAW_SUB_ACTIONS.definitions,
            defaultSubActions: YAW_SUB_ACTIONS.defaultActions(),
            _getDefaultSubAction(action) {
                return YAW_SUB_ACTIONS.getDefault(this, action);
            },
            _getAvailableSubActions(action, actor, target) {
                return YAW_SUB_ACTIONS.available(this, action, actor, target);
            },
            _isSubActionAvailable(def, actor, target, holder = []) {
                return YAW_SUB_ACTIONS.isAvailable(this, def, actor, target, holder);
            },
            _getActionLabel(action, subAction) {
                return YAW_SUB_ACTIONS.label(this, action, subAction);
            },
            _getPrimaryLabel(action) {
                return YAW_UI_TEXT.primaryActionLabel(this, action);
            },
            _t(key, vars = {}) {
                return YAW_UI_TEXT.t(key, vars);
            },
            _label(key, fallback, vars = {}) {
                return YAW_UI_TEXT.label(this, key, fallback, vars);
            },
            _uiLabel(key) {
                return YAW_UI_TEXT.uiLabel(this, key);
            },
            _unitKey(unit) {
                return String(unit?.id || unit?.name || '').replace(/'/g, "\\'");
            },
            _actorNameAndVerb(actor) {
                const isPlayer = actor && actor.name === this.player?.name;
                return { actorName: isPlayer ? this._label('party.you', 'You') : actor?.name || 'Someone', actorVerb: isPlayer ? '' : 's' };
            },
            _iconActionButton(key, icon, onclick, extraClass = '') {
                return YAW_ACTION_UI.iconButton(this, key, icon, onclick, extraClass);
            },
            _combatIntentButton(key, actor, extraClass = '') {
                return YAW_ACTION_UI.combatIntentButton(this, key, actor, extraClass);
            },
            _actionLegend(keys) {
                return YAW_ACTION_UI.legend(this, keys);
            },
            applyStaticLocalization(root = document) {
                return YAW_UI_TEXT.applyStaticLocalization(this, root);
            },
            _actionIcon(key) {
                return YAW_ACTION_UI.icon(key);
            },
            _isNight(hour = this.timeHour) {
                return YAW_TIME_SYSTEM.isNight(this, hour);
            },
            _timeLabel() {
                return YAW_TIME_SYSTEM.label(this);
            },
            _renderTime() {
                return YAW_TIME_SYSTEM.render(this);
            },
            _advanceTime(hours = 1) {
                return YAW_TIME_SYSTEM.advance(this, hours);
            },
            _partyHasDarkvision() {
                return YAW_TIME_SYSTEM.partyHasDarkvision(this);
            },
            _partyRoleCount(role) {
                return YAW_PARTY_MANAGEMENT.roleCount(this, role);
            },
            _partyRoleEffect(role, amount = 1, cap = Infinity) {
                return YAW_PARTY_MANAGEMENT.roleEffect(this, role, amount, cap);
            },
            _mapVisibilityRadius() {
                return YAW_TIME_SYSTEM.mapVisibilityRadius(this);
            },
            _isNocturnalSpecies(sid) {
                return YAW_TIME_SYSTEM.isNocturnalSpecies(this, sid);
            },
            _isDiurnalSpecies(sid) {
                return YAW_TIME_SYSTEM.isDiurnalSpecies(this, sid);
            },
            _timeAdjustedEncounterTable(table) {
                return YAW_TIME_SYSTEM.adjustedEncounterTable(this, table);
            },
            _applyTimeOfDayToCreature(creature) {
                return YAW_TIME_SYSTEM.applyTimeOfDayToCreature(this, creature);
            },
            _contextActionKeys() {
                return YAW_CENTER_CONTEXT.actionKeys(this);
            },
            _contextActionButton(key) {
                return YAW_CENTER_CONTEXT.actionButton(this, key);
            },
            _renderContextActions(includePanels = false) {
                return YAW_CENTER_CONTEXT.renderActions(this, includePanels);
            },
            _buildInteractionCommand(context = {}) {
                return YAW_INTERACTION_DISPATCH.buildCommand(this, context);
            },
            _resolvePanelUnit(type, ref) {
                return YAW_INTERACTION_DISPATCH.resolvePanelUnit(this, type, ref);
            },
            _resolvePanelUnits(type, refs = []) {
                return YAW_INTERACTION_DISPATCH.resolvePanelUnits(this, type, refs);
            },
            _buildPanelInteractionCommand(context = {}) {
                return YAW_INTERACTION_DISPATCH.buildPanelCommand(this, context);
            },
            _dispatchPanelInteraction(context = {}) {
                return YAW_INTERACTION_DISPATCH.dispatchPanel(this, context);
            },
            _validateInteractionCommand(command) {
                return YAW_INTERACTION_DISPATCH.validate(this, command);
            },
            _dispatchInteractionCommand(command) {
                return YAW_INTERACTION_DISPATCH.dispatch(this, command);
            },
            _dispatchCombatInteractionCommand(command) {
                return YAW_INTERACTION_DISPATCH.dispatchCombat(this, command);
            },
            _reportInvalidCombatCommand(command, reason = 'invalid-combat-target') {
                return YAW_INTERACTION_DISPATCH.reportInvalidCombat(this, command, reason);
            },
            _dispatchAdventureInteractionCommand(command) {
                return YAW_INTERACTION_DISPATCH.dispatchAdventure(this, command);
            },
            _clearTransientInteractionState() {
                return YAW_INTERACTION_STATE.clearTransient(this);
            },
            _renderInteractionState(options = {}) {
                return YAW_INTERACTION_STATE.render(this, options);
            },
            _panelInteractionTrayTitle(mode) {
                return YAW_PANEL_INTERACTIONS.title(this, mode);
            },
            _renderPanelInteractionTray(mode = this.combatState?.active ? 'combat' : 'adventure') {
                return YAW_PANEL_INTERACTIONS.render(this, mode);
            },
            _renderCombatPanelTray() {
                return YAW_PANEL_INTERACTIONS.combat(this);
            },
            _syncSelectedParticipants() {
                return YAW_INTERACTION_STATE.syncSelectedParticipants(this);
            },
            _isSyncParticipant(unit) {
                return YAW_INTERACTION_STATE.isSyncParticipant(this, unit);
            },
            _toggleSyncParticipantById(id) {
                return YAW_INTERACTION_STATE.toggleSyncParticipantById(this, id);
            },
            _syncParticipantButton(unit, compact = false) {
                return YAW_COMBAT_ACTIONS.syncParticipantButton(this, unit, compact);
            },
            _isCurrentCombatActor(unit) {
                if (!unit || !this.combatState?.active) return false;
                const actor = this.activeActor || this._currentCombatActor();
                if (!actor) return false;
                return actor === unit || this._unitSelectionId(actor) === this._unitSelectionId(unit);
            },
            _clearCenterActionsForCombat() {
                return YAW_SCENE_SHELL.clearCenterActionsForCombat(this);
            },
            _combatActionButtons(actor, options = {}) {
                return YAW_COMBAT_ACTIONS.actionButtons(this, actor, options);
            },
            BODY_PARTS: {
                fangs: { id: 'fangs', label: 'Fangs', desc: 'Bloodsuck/poison. +2 SPD priority. Enables bite attacks.', priority: 2 },
                wings: { id: 'wings', label: 'Wings', desc: 'Flying. +3 SPD priority. 50% dodge vs non-reach. Enables flight.', priority: 3 },
                tail: { id: 'tail', label: 'Tail', desc: 'Balance. +1 SPD priority. Enables constrict (naga-like).', priority: 1 },
                claws: { id: 'claws', label: 'Claws', desc: 'Sharp strikes. +2 Figh. Enables slash attacks.', priority: 0 },
                horns: { id: 'horns', label: 'Horns', desc: 'Ram attacks. +1 Figh, +1 CON. Enables charge.', priority: 0 },
                webbing: { id: 'webbing', label: 'Webbing', desc: 'Ranged. +2 priority. Can bind from distance.', priority: 2 },
                scales: { id: 'scales', label: 'Scales', desc: 'Armor. +3 CON. Reduces damage taken.', priority: 0 },
                fins: { id: 'fins', label: 'Fins', desc: 'Aquatic. +2 SPD in water. Enables swim.', priority: 2 },
                stinger: { id: 'stinger', label: 'Stinger', desc: 'Venom. +1 SPD. Poisons on hit.', priority: 1 },
                tentacles: { id: 'tentacles', label: 'Tentacles', desc: 'Grapple. +2 Figh. Can restrain multiple targets.', priority: 1 },
                pincers: { id: 'pincers', label: 'Pincers', desc: 'Crush. +2 Figh. Enables squeeze attacks.', priority: 0 }
            },
            SPECIES_DEFAULT_PARTS: {
                human: [], wolf: ['fangs','claws'], fox: ['fangs','claws'], cat: ['fangs','claws','tail'],
                dragon: ['wings','claws','horns','scales','tail'], naga: ['fangs','scales','tail'],
                bear: ['claws'], bunny: [], tiger: ['fangs','claws','tail'], slime: ['tentacles'],
                harpy: ['wings','claws'], bat: ['wings','fangs'], deer: ['horns'], frog: ['fins'],
                plant: ['tentacles'], shroom: [], bee: ['wings','stinger'], goblin: [], mouse: [],
                rat: ['fangs'], pig: [], cow: ['horns'], sheep: [], horse: ['horns'], lizard: ['scales','tail'],
                spider: ['fangs','webbing'], centaur: ['horns','tail'], drow: [], hyena: ['fangs','claws'],
                raccoon: ['claws'], otter: ['fins','tail'],
                fish: ['fins'], crab: ['claws'], siren: [], troll: [], bandit: [], skeleton: [], goat: ['horns'], eagle: ['wings','claws']
            },
            SPECIES_ABILITIES: {
                wolf: { rage: true, menacing: true },
                fox: { menacing: true },
                bear: { rage: true, menacing: true },
                tiger: { rage: true },
                dragon: { flying: true, ranged: true, rage: true, menacing: true },
                naga: { constrictor: true, poisonous: true },
                harpy: { flying: true, ranged: true },
                bat: { flying: true, darkvision: true, bloodsuck: true },
                frog: { swimming: true, floopy: true },
                slime: { floopy: true, enveloped: true },
                plant: { poisonous: true, enveloped: true },
                bee: { flying: true, poisonous: true },
                spider: { poisonous: true, venom: true, ranged: true, antiflying: true },
                goblin: { darkvision: true, ranged: true },
                drow: { darkvision: true, ranged: true },
                bunny: { tasty: true, fastFlee: true },
                mouse: { small: true },
                deer: { fastFlee: true },
                cow: { livestock: true },
                pig: { livestock: true },
                sheep: { livestock: true },
                centaur: { ranged: true },
                hyena: { laughing: true },
                rat: { darkvision: true, bloodsuck: true },
                otter: { swimming: true },
                fish: { swimming: true },
                crab: { floopy: true },
                siren: { swimming: true, ranged: true },
                troll: { rage: true, menacing: true },
                bandit: { ranged: true },
                skeleton: { darkvision: true },
                goat: { fastFlee: true },
                eagle: { flying: true, ranged: true, antiflying: true }
            },
            SPECIES_DIFFICULTY: {
                bunny: 1, mouse: 1, sheep: 1, deer: 1, human: 1, frog: 1, cow: 1, pig: 1,
                fish: 1, crab: 1, otter: 1, goat: 1,
                wolf: 2, cat: 2, fox: 2, rat: 2, lizard: 2, harpy: 2, bat: 2, bee: 2,
                goblin: 2, horse: 2, raccoon: 2, bandit: 2, skeleton: 2, eagle: 2,
                bear: 3, tiger: 3, naga: 3, slime: 3, plant: 3, spider: 3, shroom: 3,
                hyena: 3, centaur: 3, drow: 3, troll: 3, siren: 3,
                dragon: 4
            },
            SPECIES_SIZE: {
                mouse: 1, bunny: 2, fish: 2, frog: 2, bee: 2,
                rat: 2, crab: 2, bat: 2, sheep: 3, deer: 3, goat: 3, pig: 3, fox: 3, cat: 3, wolf: 3,
                lizard: 3, horse: 3, raccoon: 3, harpy: 3, goblin: 3, bandit: 3, skeleton: 3, eagle: 3,
                human: 4, cow: 4, bear: 4, tiger: 4, naga: 4, spider: 4, shroom: 4, hyena: 4, drow: 4, siren: 4, otter: 3,
                slime: 5, plant: 5, centaur: 5, troll: 5, dragon: 6
            },
            SPECIES_TEMPERAMENT: {
                bunny: { timid: true, prey: true, fastFlee: true },
                mouse: { timid: true, prey: true, fastFlee: true },
                sheep: { timid: true, herd: true, prey: true },
                deer: { timid: true, herd: true, prey: true, fastFlee: true },
                goat: { timid: true, prey: true, fastFlee: true },
                pig: { timid: true, prey: true },
                cow: { timid: true, herd: true, prey: true, livestock: true },
                fish: { timid: true, prey: true, aquatic: true },
                frog: { timid: true, prey: true },
                bee: { territorial: true, aggressive: true, swarm: true },
                rat: { opportunistic: true, aggressive: true, pack: true },
                crab: { timid: true, prey: true },
                bat: { opportunistic: true, nocturnal: true },
                fox: { opportunistic: true, cunning: true },
                cat: { opportunistic: true, ambush: true },
                wolf: { aggressive: true, pack: true, apex: true },
                lizard: { opportunistic: true, territorial: true },
                horse: { timid: true, herd: true, fastFlee: true },
                raccoon: { opportunistic: true, cunning: true },
                harpy: { aggressive: true, aerial: true, opportunistic: true },
                goblin: { aggressive: true, opportunistic: true, pack: true },
                bandit: { aggressive: true, opportunistic: true, pack: true },
                skeleton: { aggressive: true, relentless: true },
                eagle: { aggressive: true, aerial: true, apex: true },
                human: { adaptable: true, opportunistic: true },
                bear: { aggressive: true, territorial: true, apex: true },
                tiger: { aggressive: true, ambush: true, apex: true },
                naga: { aggressive: true, territorial: true, apex: true },
                spider: { aggressive: true, ambush: true, territorial: true },
                shroom: { passive: true, opportunistic: true },
                hyena: { aggressive: true, opportunistic: true, pack: true },
                drow: { aggressive: true, cunning: true, opportunistic: true },
                siren: { aggressive: true, aquatic: true, cunning: true },
                otter: { opportunistic: true, aquatic: true, playful: true },
                slime: { aggressive: true, opportunistic: true, enveloping: true },
                plant: { aggressive: true, territorial: true, passive: true },
                centaur: { aggressive: true, territorial: true, herd: true },
                troll: { aggressive: true, territorial: true, apex: true },
                dragon: { aggressive: true, apex: true, territorial: true }
            },
            DEFAULT_SPECIES_CANON: {
                sapience: 'person',
                bodyPlan: 'beastfolk',
                baselineInteraction: 'sapient',
                interactionEligibility: {
                    social: true,
                    party: true,
                    quest: true,
                    merchant: true,
                    recruit: true,
                    sensitiveSocial: true,
                    combat: true,
                    feed: true,
                    feast: true
                },
                defaultGame: true,
                modOnlyAnimal: false
            },
            SPECIES_CANON: {
                human: { bodyPlan: 'humanoid', traits: ['person', 'civilized'] },
                wolf: { bodyPlan: 'beastfolk', traits: ['person', 'canine-folk', 'pack'] },
                fox: { bodyPlan: 'beastfolk', traits: ['person', 'canine-folk', 'cunning'] },
                cat: { bodyPlan: 'beastfolk', traits: ['person', 'feline-folk', 'agile'] },
                dragon: { bodyPlan: 'dragonfolk', traits: ['person', 'monsterfolk', 'scaled'] },
                naga: { bodyPlan: 'serpentfolk', traits: ['person', 'monsterfolk', 'serpentine'] },
                bear: { bodyPlan: 'beastfolk', traits: ['person', 'ursine-folk', 'strong'] },
                tiger: { bodyPlan: 'beastfolk', traits: ['person', 'feline-folk', 'stalker'] },
                bunny: { bodyPlan: 'beastfolk', traits: ['person', 'lagomorph-folk', 'swift'] },
                slime: { bodyPlan: 'oozefolk', traits: ['person', 'monsterfolk', 'amorphous'] },
                harpy: { bodyPlan: 'harpyfolk', traits: ['person', 'winged-folk', 'aerial'] },
                bat: { bodyPlan: 'beastfolk', traits: ['person', 'winged-folk', 'nocturnal'] },
                deer: { bodyPlan: 'beastfolk', traits: ['person', 'cervid-folk', 'graceful'] },
                frog: { bodyPlan: 'beastfolk', traits: ['person', 'amphibian-folk', 'aquatic'] },
                plant: { bodyPlan: 'plantfolk', traits: ['person', 'plantlike', 'rooted'] },
                shroom: { bodyPlan: 'plantfolk', traits: ['person', 'fungal-folk', 'spore'] },
                bee: { bodyPlan: 'insectfolk', traits: ['person', 'hive-folk', 'winged'] },
                goblin: { bodyPlan: 'humanoid', traits: ['person', 'goblinkin', 'cunning'] },
                mouse: { bodyPlan: 'beastfolk', traits: ['person', 'rodent-folk', 'small'] },
                rat: { bodyPlan: 'beastfolk', traits: ['person', 'rodent-folk', 'nocturnal'] },
                pig: { bodyPlan: 'beastfolk', traits: ['person', 'porcine-folk', 'sturdy'] },
                cow: { bodyPlan: 'beastfolk', traits: ['person', 'bovine-folk', 'herd'] },
                sheep: { bodyPlan: 'beastfolk', traits: ['person', 'ovine-folk', 'herd'] },
                horse: { bodyPlan: 'beastfolk', traits: ['person', 'equine-folk', 'swift'] },
                lizard: { bodyPlan: 'beastfolk', traits: ['person', 'reptile-folk', 'scaled'] },
                spider: { bodyPlan: 'arachnefolk', traits: ['person', 'arachnid-folk', 'web'] },
                centaur: { bodyPlan: 'centaurfolk', traits: ['person', 'hybrid-folk', 'herd'] },
                drow: { bodyPlan: 'humanoid', traits: ['person', 'elfkin', 'darkvision'] },
                hyena: { bodyPlan: 'beastfolk', traits: ['person', 'hyena-folk', 'pack'] },
                raccoon: { bodyPlan: 'beastfolk', traits: ['person', 'raccoon-folk', 'cunning'] },
                otter: { bodyPlan: 'beastfolk', traits: ['person', 'otter-folk', 'aquatic'] },
                fish: { bodyPlan: 'merfolk', traits: ['person', 'aquatic-folk', 'swimmer'] },
                crab: { bodyPlan: 'crustaceanfolk', traits: ['person', 'shore-folk', 'armored'] },
                siren: { bodyPlan: 'merfolk', traits: ['person', 'aquatic-folk', 'singer'] },
                troll: { bodyPlan: 'humanoid', traits: ['person', 'trollkin', 'large'] },
                bandit: { bodyPlan: 'humanoid', traits: ['person', 'outlaw', 'civilized'] },
                skeleton: { sapience: 'spirit', bodyPlan: 'humanoid', traits: ['person', 'undead', 'constructlike'] },
                goat: { bodyPlan: 'beastfolk', traits: ['person', 'caprine-folk', 'climber'] },
                eagle: { bodyPlan: 'avianfolk', traits: ['person', 'winged-folk', 'aerial'] }
            },
            _speciesCanon(sid) {
                return YAW_SPECIES_SYSTEM.canon(this, sid);
            },
            _applySpeciesCanon(unit) {
                return YAW_SPECIES_SYSTEM.applyCanon(this, unit);
            },
            _hasBaselineInteractionEligibility(unit, interaction = 'social') {
                return YAW_SPECIES_SYSTEM.hasBaselineInteractionEligibility(this, unit, interaction);
            },
            PREDATOR_PREY_RELATION: {
                wolf: { prey: ['bunny', 'deer', 'sheep', 'goat', 'pig', 'cow', 'mouse', 'rat'] },
                fox: { prey: ['bunny', 'mouse', 'rat', 'bird'] },
                cat: { prey: ['bunny', 'mouse', 'rat', 'bird', 'fish'] },
                bear: { prey: ['bunny', 'deer', 'sheep', 'fish', 'pig', 'cow'] },
                tiger: { prey: ['bunny', 'deer', 'sheep', 'pig', 'cow', 'goat'] },
                eagle: { prey: ['bunny', 'mouse', 'rat', 'fish', 'snake'] },
                harpy: { prey: ['bunny', 'mouse', 'rat', 'fish'] },
                naga: { prey: ['bunny', 'mouse', 'rat'] },
                spider: { prey: ['bunny', 'mouse', 'rat', 'bee', 'fly'] },
                hyena: { prey: ['bunny', 'deer', 'sheep', 'pig', 'cow'] },
                drow: { prey: ['bunny', 'deer', 'sheep', 'mouse', 'rat'] },
                slime: { prey: ['bunny', 'mouse', 'rat', 'bee', 'frog'] },
                plant: { prey: ['bunny', 'mouse', 'rat', 'bee', 'frog'] },
                dragon: { prey: ['all'] },
                troll: { prey: ['bunny', 'deer', 'sheep', 'pig', 'cow', 'goat', 'human'] }
            },
            MAX_PARTY_SIZE: 6,
            MAX_INVENTORY: 20,
            ITEMS: {
                'Healing Herb': { type: 'consumable', icon: '🌿', effect: 'heal', value: 30, desc: 'Restores 30 HP' },
                'Shiny Gem': { type: 'valuable', icon: '💎', effect: 'sell', value: 50, desc: 'Worth 50 gold' },
                'Strange Mushroom': { type: 'consumable', icon: '🍄', effect: 'heal', value: 50, desc: 'Restores 50 HP' },
                'Old Coin': { type: 'valuable', icon: '🪙', effect: 'sell', value: 10, desc: 'Worth 10 gold' },
                'Monster Fang': { type: 'material', icon: '🦷', effect: 'craft', value: 25, desc: 'Crafting material' },
                'Crystal Shard': { type: 'material', icon: '💠', effect: 'craft', value: 40, desc: 'Crafting material' },
                'Vial of Venom': { type: 'consumable', icon: '🧪', effect: 'damage', value: 40, desc: 'Deals 40 poison damage' },
                'Enchanted Berry': { type: 'consumable', icon: '🫐', effect: 'buff', value: 5, desc: 'Temporarily boosts STR by 5' },
                'Leather Cap': { type: 'equipment', icon: '🎩', slot: 'head', equipBonus: { con: 1 }, value: 20, desc: 'Headwear. CON +1' },
                'Hide Armor': { type: 'equipment', icon: '🦺', slot: 'body', equipBonus: { con: 3 }, value: 60, desc: 'Body armor. CON +3' },
                'Clawed Gloves': { type: 'equipment', icon: '🧤', slot: 'hands', equipBonus: { Figh: 2, str: 1 }, value: 45, desc: 'Handwear. Figh +2, STR +1' },
                'Lucky Charm': { type: 'equipment', icon: '📿', slot: 'accessory1', equipBonus: { Flee: 2, wis: 1 }, equipEffect: 'luckyFind', value: 35, desc: 'Accessory. Flee +2, WIS +1. Improves search finds.' },
                'Focus Ring': { type: 'equipment', icon: '💍', slot: 'accessory2', equipBonus: { Flir: 2, cha: 1 }, equipEffect: 'focusGuard', value: 55, desc: 'Ring. Flir +2, CHA +1. Resists charm confusion.' }
            },
            MERCHANT_STOCK_TABLES: {
                general: [
                    { name: 'Healing Herb', qty: 2 },
                    { name: 'Old Coin', qty: 2 },
                    { name: 'Monster Fang', qty: 1 }
                ],
                traveler: [
                    { name: 'Healing Herb', qty: 1 },
                    { name: 'Leather Cap', qty: 1 },
                    { name: 'Lucky Charm', qty: 1 }
                ],
                herbalist: [
                    { name: 'Healing Herb', qty: 3 },
                    { name: 'Strange Mushroom', qty: 1 },
                    { name: 'Enchanted Berry', qty: 2 }
                ],
                relic: [
                    { name: 'Old Coin', qty: 3 },
                    { name: 'Crystal Shard', qty: 1 },
                    { name: 'Focus Ring', qty: 1 }
                ],
                outfitter: [
                    { name: 'Leather Cap', qty: 1 },
                    { name: 'Hide Armor', qty: 1 },
                    { name: 'Clawed Gloves', qty: 1 }
                ]
            },
            QUEST_TEMPLATES: {
                cabin_supplies: {
                    title: 'Cabin Supplies',
                    description: 'A local caretaker needs a healing herb restocked.',
                    objectives: [{ type: 'find', item: 'Healing Herb', required: 1, label: 'Find a Healing Herb' }],
                    reward: { xp: 10, gold: 6 }
                },
                shrine_relic: {
                    title: 'Shrine Offering',
                    description: 'A shrine keeper asks for a crystal shard from nearby ruins.',
                    objectives: [{ type: 'find', item: 'Crystal Shard', required: 1, label: 'Find a Crystal Shard' }],
                    reward: { xp: 15, gold: 10, items: ['Old Coin'] },
                    turnInRequired: true
                },
                camp_safety: {
                    title: 'Camp Safety',
                    description: 'A traveler wants the local predators thinned out.',
                    objectives: [{ type: 'defeat', species: 'wolf', required: 1, label: 'Defeat a Wolf' }],
                    reward: { xp: 20, gold: 12 }
                },
                ruins_cleanup: {
                    title: 'Ruins Cleanup',
                    description: 'A nervous explorer wants proof that the old bones have been cleared.',
                    objectives: [{ type: 'defeat', species: 'skeleton', required: 1, label: 'Defeat a Skeleton' }],
                    reward: { xp: 25, gold: 14, items: ['Crystal Shard'] }
                }
            },
            EQUIPMENT_LOOT_TABLES: {
                basicGear: [
                    { id: 'Leather Cap', weight: 4 },
                    { id: 'Lucky Charm', weight: 2 }
                ],
                armory: [
                    { id: 'Hide Armor', weight: 3 },
                    { id: 'Clawed Gloves', weight: 3 },
                    { id: 'Leather Cap', weight: 2 }
                ],
                relicGear: [
                    { id: 'Focus Ring', weight: 3 },
                    { id: 'Lucky Charm', weight: 2 },
                    { id: 'Crystal Shard', weight: 2 }
                ]
            },
            EQUIPMENT_SLOTS: { head: 'Head', body: 'Body', hands: 'Hands', feet: 'Feet', accessory1: 'Accessory 1', accessory2: 'Accessory 2' },
            EQUIPMENT_STAT_KEYS: ['Figh', 'Feas', 'Flir', 'Fuck', 'Flee', 'Feed', 'str', 'con', 'spd', 'int', 'wis', 'cha'],
            PERK_TREES: {
                predator: {
                    label: 'Predator',
                    perks: [
                        { id: 'predator_instinct', name: 'Predator Instinct', stat: 'Figh', val: 2, perkEffect: 'predatorScent', desc: 'Figh +2. Improves search finds.' },
                        { id: 'voracious', name: 'Voracious', stat: 'Feas', val: 3, desc: 'Feas +3.', requires: { tree: 'predator', count: 1 } },
                        { id: 'apex_pressure', name: 'Apex Pressure', stat: 'str', val: 2, desc: 'STR +2.', requires: { tree: 'predator', count: 2 } }
                    ]
                },
                seducer: {
                    label: 'Seducer',
                    perks: [
                        { id: 'soft_approach', name: 'Soft Approach', stat: 'Flir', val: 2, desc: 'Flir +2.' },
                        { id: 'seductive_aura', name: 'Seductive Aura', stat: 'cha', val: 2, desc: 'CHA +2.', requires: { tree: 'seducer', count: 1 } },
                        { id: 'devoted_attention', name: 'Devoted Attention', stat: 'Fuck', val: 3, desc: 'Fuck +3.', requires: { tree: 'seducer', count: 2 } }
                    ]
                },
                survivor: {
                    label: 'Survivor',
                    perks: [
                        { id: 'iron_will', name: 'Iron Will', stat: 'wis', val: 2, perkEffect: 'fearResist', desc: 'WIS +2. Resists fear turn loss.' },
                        { id: 'swift_strides', name: 'Swift Strides', stat: 'spd', val: 2, desc: 'SPD +2.', requires: { tree: 'survivor', count: 1 } },
                        { id: 'iron_gut', name: 'Iron Gut', stat: 'con', val: 3, desc: 'CON +3.', requires: { tree: 'survivor', count: 2 } }
                    ]
                }
            },
            SPECIES_PERK_TREES: {
                human: {
                    label: 'Human',
                    perks: [
                        { id: 'human_adaptable', name: 'Adaptable', stat: 'int', val: 2, desc: 'INT +2.' },
                        { id: 'human_resolve', name: 'Steady Resolve', stat: 'wis', val: 2, desc: 'WIS +2.', requires: { perk: 'human_adaptable' } }
                    ]
                },
                wolf: {
                    label: 'Wolf',
                    perks: [
                        { id: 'wolf_pack_instinct', name: 'Pack Instinct', stat: 'Figh', val: 2, desc: 'Figh +2.' },
                        { id: 'wolf_relentless_hunger', name: 'Relentless Hunger', stat: 'Feas', val: 2, desc: 'Feas +2.', requires: { perk: 'wolf_pack_instinct' } }
                    ]
                },
                bunny: {
                    label: 'Bunny',
                    perks: [
                        { id: 'bunny_quickstep', name: 'Quickstep', stat: 'Flee', val: 3, desc: 'Flee +3.' },
                        { id: 'bunny_soft_charm', name: 'Soft Charm', stat: 'Flir', val: 2, desc: 'Flir +2.', requires: { perk: 'bunny_quickstep' } }
                    ]
                },
                dragon: {
                    label: 'Dragon',
                    perks: [
                        { id: 'dragon_ancient_bulk', name: 'Ancient Bulk', stat: 'con', val: 3, desc: 'CON +3.' },
                        { id: 'dragon_dominant_appetite', name: 'Dominant Appetite', stat: 'Feas', val: 3, desc: 'Feas +3.', requires: { perk: 'dragon_ancient_bulk' } }
                    ]
                }
            },
            XP_REWARDS: { defeatEnemy: 50, consumeEnemy: 75, seduceEnemy: 60, flirtEnemy: 35, feedAlly: 20, feedEnemy: 25, discoverLandmark: 25, consumeAlly: 40 },
            BALANCE: {
                xpCurveMultiplier: 1.5,
                levelPunishmentGain: 10,
                levelPleasureGain: 5,
                levelStatGain: 1,
                recruitXP: 30
            },

            // === STATE ===
            mode: 'normal',
            screen: 'create',
            tutorialStep: 0,
            player: null,
            party: [],
            partyLeaderId: null,
            creatures: [], // ALL creatures at location with disposition
            inventory: [],
            quests: [],
            questFilter: 'all',
            questSort: 'status',
            perkTreeFilter: 'all',
            location: { x: 0, y: 0 },
            timeHour: 8,
            dayCount: 0,
            log: [],
            tileEvents: [],
            logFilter: 'all',
            logSearch: '',
            logCollapsed: false,
            logExpanded: false,
            inventoryFilter: 'all',
            inventorySort: 'name',
            tradeFilter: 'all',
            tradeSort: 'name',
            mobileMapZoom: 1,
            largeMapRadius: 8,
            largeMapOffset: { x: 0, y: 0 },
            worldMap: new Map(),
            tileDeltas: new Map(),
            exploredTiles: new Set(),
            superPatchMap: new Map(),
            worldMeta: { worldId: 'world_default', seed: 'default', generatorVersion: 2, mapModsHash: 'core' },
            PATCH_SIZE: 10,
            SUPER_PATCH_SIZE: 3, // 3x3 patches = 30x30 tiles per biome region
            currentBiome: 'forest',
            activeSlot: 'slot1',
            settings: {
                powerDynamics: false, endoMode: false, slowDigestion: false,
                fatalVore: false, chewing: false, allTheWayThrough: false,
                hardcore: false, scat: false, watersports: false,
                boneCrushing: false, unwillingWarnings: false,
                statAbsorption: true, refractoryPeriod: false,
                sameSpeciesBonus: false, fluidEnabled: false,
                cockVoreEnabled: false, unbirthEnabled: false, forcedFeeding: false,
                partyPlayFightMode: 'nonlethal',
                highContrast: false, reducedMotion: false, fontSize: 14
            },

            combatState: {
                active: false, turnQueue: [], currentTurn: 0, round: 1,
                syncActions: [], processing: false, xpEarned: 0
            },
            targetSelection: null,
            activeActor: null,
            explorationActorIds: [],
            explorationTargetIds: [],
            inInterior: false,
            activeInterior: null,
            interiorLocation: { x: 0, y: 0 },

            // === SPECIES & BIOMES (unchanged) ===
            species: [
                { id: 'human', name: 'Human', icon: '👤', desc: 'Adaptable survivor' },
                { id: 'wolf', name: 'Wolfkin', icon: '🐺', desc: 'Sapient pack hunter' },
                { id: 'fox', name: 'Foxfolk', icon: '🦊', desc: 'Sapient cunning trickster' },
                { id: 'cat', name: 'Catfolk', icon: '🐱', desc: 'Sapient agile hunter' },
                { id: 'dragon', name: 'Dragonkin', icon: '🐲', desc: 'Sapient powerful drakefolk' },
                { id: 'naga', name: 'Naga', icon: '🐍', desc: 'Serpent folk' },
                { id: 'bear', name: 'Bearfolk', icon: '🐻', desc: 'Sapient strong brawler' },
                { id: 'tiger', name: 'Tigerfolk', icon: '🐅', desc: 'Sapient deadly stalker' },
                { id: 'bunny', name: 'Bunnyfolk', icon: '🐰', desc: 'Sapient swift wanderer' },
                { id: 'slime', name: 'Slimefolk', icon: '🟢', desc: 'Sapient amorphous person' },
                { id: 'harpy', name: 'Harpy', icon: '🦅', desc: 'Sky hunter' },
                { id: 'bat', name: 'Batfolk', icon: '🦇', desc: 'Sapient night stalker' },
                { id: 'deer', name: 'Deerfolk', icon: '🦌', desc: 'Sapient graceful wanderer' },
                { id: 'frog', name: 'Frogfolk', icon: '🐸', desc: 'Sapient swamp dweller' },
                { id: 'plant', name: 'Plantfolk', icon: '🌿', desc: 'Sapient living flora' },
                { id: 'shroom', name: 'Shroomfolk', icon: '🍄', desc: 'Sapient spore bearer' },
                { id: 'bee', name: 'Beefolk', icon: '🐝', desc: 'Sapient hive warrior' },
                { id: 'goblin', name: 'Goblin', icon: '👺', desc: 'Mischief maker' },
                { id: 'mouse', name: 'Mousefolk', icon: '🐭', desc: 'Sapient small survivor' },
                { id: 'rat', name: 'Ratfolk', icon: '🐀', desc: 'Sapient night dweller' },
                { id: 'pig', name: 'Pigfolk', icon: '🐷', desc: 'Sapient sturdy forager' },
                { id: 'cow', name: 'Cowfolk', icon: '🐮', desc: 'Sapient bovine villager' },
                { id: 'sheep', name: 'Sheepfolk', icon: '🐑', desc: 'Sapient woolly wanderer' },
                { id: 'horse', name: 'Horsefolk', icon: '🐴', desc: 'Sapient gallant runner' },
                { id: 'lizard', name: 'Lizardfolk', icon: '🦎', desc: 'Sapient sun basker' },
                { id: 'spider', name: 'Arachne', icon: '🕷️', desc: 'Sapient web weaver' },
                { id: 'centaur', name: 'Centaur', icon: '🐎', desc: 'Sapient hybrid warrior' },
                { id: 'drow', name: 'Drow', icon: '🧝', desc: 'Dark elf' },
                { id: 'hyena', name: 'Hyenafolk', icon: '🐆', desc: 'Sapient laughing hunter' },
                { id: 'raccoon', name: 'Raccoonfolk', icon: '🦝', desc: 'Sapient clever scavenger' },
                { id: 'otter', name: 'Otterfolk', icon: '🦦', desc: 'Sapient river rover' },
                { id: 'fish', name: 'Merfolk', icon: '🐟', desc: 'Sapient water dweller' },
                { id: 'crab', name: 'Crabfolk', icon: '🦀', desc: 'Sapient shore dweller' },
                { id: 'siren', name: 'Siren', icon: '🧜', desc: 'Sapient enchanting singer' },
                { id: 'troll', name: 'Troll', icon: '👹', desc: 'Bridge guardian' },
                { id: 'bandit', name: 'Bandit', icon: '🥷', desc: 'Road robber' },
                { id: 'skeleton', name: 'Awakened Skeleton', icon: '💀', desc: 'Sapient ancient bones' },
                { id: 'goat', name: 'Goatfolk', icon: '🐐', desc: 'Sapient cliff climber' },
                { id: 'eagle', name: 'Eaglefolk', icon: '🦅', desc: 'Sapient sky hunter' }
            ],
            biomes: {
                grove: { name: 'Grove', role: 'region', icon: '🌳', color: '#3a6b2a', bgColor: '#2a4a1a', danger: 1, encounterChance: 0.08, friendlyChance: 0.12, structureChance: 0.05,
                    encounterTable: [
                        { id: 'bunny', weight: 50 }, { id: 'mouse', weight: 20 }, { id: 'sheep', weight: 15 },
                        { id: 'deer', weight: 10 }, { id: 'human', weight: 5 }
                    ], friendlyTable: [
                        { id: 'bunny', weight: 40 }, { id: 'deer', weight: 30 }, { id: 'sheep', weight: 20 },
                        { id: 'human', weight: 10 }
                    ], structureTable: ['tree', 'spring', 'shrine', 'pond'],
                    descriptions: ['A peaceful grove of young trees.','Wildflowers carpet the ground.','A gentle stream bubbles nearby.','Birdsong fills the air.','Sunlight dapples through leaves.'] },
                forest: { name: 'Forest', role: 'region', icon: '🌲', color: '#2d5016', bgColor: '#1a3310', danger: 3, encounterChance: 0.15, friendlyChance: 0.06, structureChance: 0.08,
                    encounterTable: [
                        { id: 'bunny', weight: 25 }, { id: 'deer', weight: 20 }, { id: 'wolf', weight: 15 },
                        { id: 'slime', weight: 15 }, { id: 'harpy', weight: 15 }, { id: 'bear', weight: 10 }
                    ], friendlyTable: [
                        { id: 'bunny', weight: 30 }, { id: 'deer', weight: 25 }, { id: 'human', weight: 15 },
                        { id: 'fox', weight: 15 }, { id: 'cat', weight: 10 }, { id: 'horse', weight: 5 }
                    ], structureTable: ['cabin', 'hut', 'camp', 'tree', 'burrow', 'nest'],
                    descriptions: ['Ancient trees tower overhead.','The forest is dense and humid.','Sunlight filters through leaves.','A clearing opens before you.','Fallen logs and twisted roots make travel slow.'] },
                swamp: { name: 'Swamp', role: 'region', icon: '🐊', color: '#3d4a1e', bgColor: '#2a3310', danger: 4, encounterChance: 0.20, friendlyChance: 0.03, structureChance: 0.06,
                    encounterTable: [
                        { id: 'frog', weight: 25 }, { id: 'shroom', weight: 20 }, { id: 'slime', weight: 20 },
                        { id: 'naga', weight: 15 }, { id: 'plant', weight: 20 }
                    ], friendlyTable: [
                        { id: 'frog', weight: 40 }, { id: 'otter', weight: 20 }, { id: 'human', weight: 10 }
                    ], structureTable: ['hut', 'ruins', 'pond', 'burrow', 'spring'],
                    descriptions: ['Murky waters stretch through twisted cypress trees.','The ground squelches beneath your feet.','Fireflies drift through the fog.','A sunken log bridges a channel.','Gnarled roots form natural archways.'] },
                plains: { name: 'Plains', role: 'region', icon: '🌾', color: '#6b5b1e', bgColor: '#4a4010', danger: 2, encounterChance: 0.12, friendlyChance: 0.08, structureChance: 0.06,
                    encounterTable: [
                        { id: 'bunny', weight: 25 }, { id: 'deer', weight: 20 }, { id: 'human', weight: 15 },
                        { id: 'horse', weight: 15 }, { id: 'wolf', weight: 15 }, { id: 'tiger', weight: 10 }
                    ], friendlyTable: [
                        { id: 'bunny', weight: 30 }, { id: 'deer', weight: 25 }, { id: 'horse', weight: 20 },
                        { id: 'human', weight: 15 }, { id: 'cow', weight: 10 }
                    ], structureTable: ['cabin', 'camp', 'ruins', 'tree', 'pond'],
                    descriptions: ['Tall grasses sway in the warm breeze.','Open grasslands stretch to the horizon.','The plains are peaceful.','A stream cuts through the prairie.','Wind rustles the grass in waves.'] },
                cave: { name: 'Cave', role: 'region', icon: '🦇', color: '#2a2a3a', bgColor: '#1a1a2e', danger: 5, encounterChance: 0.25, friendlyChance: 0.02, structureChance: 0.10,
                    encounterTable: [
                        { id: 'bat', weight: 25 }, { id: 'goblin', weight: 20 }, { id: 'rat', weight: 20 },
                        { id: 'slime', weight: 20 }, { id: 'naga', weight: 10 }, { id: 'dragon', weight: 5 }
                    ], friendlyTable: [
                        { id: 'bat', weight: 30 }, { id: 'goblin', weight: 15 }
                    ], structureTable: ['cave', 'ruins', 'burrow', 'web', 'hut'],
                    descriptions: ['Stalactites hang like teeth from the ceiling.','The cave opens into a vast chamber.','A narrow passage forces you to squeeze through.','An underground river rushes through.','Crystal formations glitter in the darkness.'] },
                jungle: { name: 'Jungle', role: 'region', icon: '🌿', color: '#1a5c1a', bgColor: '#0f3d0f', danger: 4, encounterChance: 0.20, friendlyChance: 0.04, structureChance: 0.08,
                    encounterTable: [
                        { id: 'frog', weight: 20 }, { id: 'plant', weight: 20 }, { id: 'harpy', weight: 20 },
                        { id: 'tiger', weight: 20 }, { id: 'naga', weight: 15 }, { id: 'slime', weight: 5 }
                    ], friendlyTable: [
                        { id: 'frog', weight: 30 }, { id: 'human', weight: 10 }, { id: 'horse', weight: 10 }
                    ], structureTable: ['ruins', 'hut', 'spring', 'nest', 'pond', 'tree'],
                    descriptions: ['Vines hang like curtains.','The jungle is alive with sound.','Humidity presses down like a weight.','A waterfall crashes into a hidden pool.','Thick vegetation forces you to hack forward.'] },
                dungeon: { name: 'Dungeon', role: 'region', icon: '⛓️', color: '#3a2a3a', bgColor: '#1e0a1e', danger: 5, encounterChance: 0.30, friendlyChance: 0.01, structureChance: 0.12,
                    encounterTable: [
                        { id: 'rat', weight: 25 }, { id: 'goblin', weight: 25 }, { id: 'skeleton', weight: 20 },
                        { id: 'spider', weight: 20 }, { id: 'drow', weight: 10 }
                    ], friendlyTable: [
                        { id: 'goblin', weight: 20 }, { id: 'human', weight: 5 }
                    ], structureTable: ['cave', 'ruins', 'camp', 'web', 'burrow', 'hut'],
                    descriptions: ['Stone corridors stretch endlessly.','Iron-barred cells line the walls.','The air is stale and cold.','A brazier smolders with dying coals.','Chains rattle in the darkness.'] },
                manor: { name: 'Manor', role: 'region', icon: '🏰', color: '#4a3a2a', bgColor: '#2e2010', danger: 3, encounterChance: 0.15, friendlyChance: 0.05, structureChance: 0.15,
                    encounterTable: [
                        { id: 'human', weight: 30 }, { id: 'cat', weight: 25 }, { id: 'rat', weight: 20 },
                        { id: 'mouse', weight: 15 }, { id: 'spider', weight: 10 }
                    ], friendlyTable: [
                        { id: 'human', weight: 40 }, { id: 'cat', weight: 30 }, { id: 'mouse', weight: 20 }
                    ], structureTable: ['cabin', 'hut', 'ruins', 'web', 'shrine', 'spring'],
                    descriptions: ['Grand hallways echo with emptiness.','Antique furniture gathers dust.','A portrait gallery watches your passage.','The ballroom is frozen in decay.','Servants quarters hide secrets.'] },
                beach: { name: 'Beach', role: 'region', icon: '🏖️', color: '#1a4a5a', bgColor: '#0f2a3a', danger: 2, encounterChance: 0.12, friendlyChance: 0.08, structureChance: 0.06,
                    encounterTable: [
                        { id: 'crab', weight: 30 }, { id: 'fish', weight: 25 }, { id: 'frog', weight: 20 },
                        { id: 'otter', weight: 15 }, { id: 'siren', weight: 10 }
                    ], friendlyTable: [
                        { id: 'crab', weight: 30 }, { id: 'fish', weight: 25 }, { id: 'otter', weight: 25 },
                        { id: 'frog', weight: 20 }
                    ], structureTable: ['cabin', 'camp', 'spring', 'pond', 'ruins'],
                    descriptions: ['Waves lap against white sand.','Palm trees sway overhead.','Seashells scatter the shore.','A tide pool teems with life.','A distant ship lies wrecked on the reef.'] },
                road: { name: 'Road', role: 'route', icon: '🛤️', color: '#5a5a2a', bgColor: '#3a3a10', danger: 2, encounterChance: 0.10, friendlyChance: 0.06, structureChance: 0.04,
                    encounterTable: [
                        { id: 'human', weight: 25 }, { id: 'mouse', weight: 20 }, { id: 'rat', weight: 20 },
                        { id: 'goblin', weight: 20 }, { id: 'wolf', weight: 10 }, { id: 'bandit', weight: 5 }
                    ], friendlyTable: [
                        { id: 'human', weight: 30 }, { id: 'horse', weight: 20 }, { id: 'mouse', weight: 20 },
                        { id: 'cow', weight: 15 }, { id: 'pig', weight: 15 }
                    ], structureTable: ['cabin', 'camp', 'hut', 'shrine', 'ruins'],
                    descriptions: ['A dirt path stretches between biomes.','Wagon ruts mark the earth.','A weathered signpost points onward.','A campfire ring marks a resting spot.','The road is well-traveled.'] },
                cliff: { name: 'Cliff', role: 'region', icon: '🏔️', color: '#5a5a5a', bgColor: '#3a3a3a', danger: 3, encounterChance: 0.15, friendlyChance: 0.04, structureChance: 0.06,
                    encounterTable: [
                        { id: 'goat', weight: 25 }, { id: 'bat', weight: 20 }, { id: 'eagle', weight: 20 },
                        { id: 'wolf', weight: 20 }, { id: 'harpy', weight: 15 }
                    ], friendlyTable: [
                        { id: 'goat', weight: 40 }, { id: 'eagle', weight: 20 }, { id: 'horse', weight: 15 }
                    ], structureTable: ['cave', 'ruins', 'nest', 'hut', 'camp'],
                    descriptions: ['Rocky outcrops offer treacherous footing.','The wind howls at your back.','A narrow ledge skirts a drop.','A goat path winds upward.','The view from the edge is dizzying.'] },
                water: { name: 'Water', role: 'region', icon: '💧', color: '#1a3a5a', bgColor: '#0f1e3a', danger: 3, encounterChance: 0.20, friendlyChance: 0.05, structureChance: 0.05,
                    encounterTable: [
                        { id: 'fish', weight: 25 }, { id: 'frog', weight: 25 }, { id: 'otter', weight: 20 },
                        { id: 'slime', weight: 20 }, { id: 'naga', weight: 10 }
                    ], friendlyTable: [
                        { id: 'fish', weight: 30 }, { id: 'otter', weight: 25 }, { id: 'frog', weight: 20 },
                        { id: 'crab', weight: 15 }
                    ], structureTable: ['pond', 'spring', 'ruins', 'cave', 'hut'],
                    descriptions: ['The river rushes past.','A lake reflects the sky like glass.','Water cascades over smooth rocks.','The current pulls at your feet.','A hidden spring bubbles from the earth.'] },
                bridge: { name: 'Bridge', role: 'feature', icon: '🌉', color: '#5a4a2a', bgColor: '#3a2e10', danger: 4, encounterChance: 0.15, friendlyChance: 0.03, structureChance: 0.08,
                    encounterTable: [
                        { id: 'frog', weight: 25 }, { id: 'human', weight: 25 }, { id: 'goblin', weight: 20 },
                        { id: 'bandit', weight: 20 }, { id: 'troll', weight: 10 }
                    ], friendlyTable: [
                        { id: 'human', weight: 30 }, { id: 'frog', weight: 20 }, { id: 'horse', weight: 10 }
                    ], structureTable: ['cabin', 'hut', 'camp', 'ruins', 'shrine'],
                    descriptions: ['A wooden span creaks beneath you.','Rope bridges sway in the wind.','Stone arches rise from the water.','A toll booth stands abandoned.','The bridge offers a commanding view.'] },
                farm: { name: 'Farm', role: 'settlement', icon: '🚜', color: '#5a5a2a', bgColor: '#3a3a10', danger: 1, encounterChance: 0.12, friendlyChance: 0.15, structureChance: 0.08,
                    encounterTable: [
                        { id: 'cow', weight: 30 }, { id: 'sheep', weight: 25 }, { id: 'pig', weight: 20 },
                        { id: 'horse', weight: 15 }, { id: 'human', weight: 10 }
                    ], friendlyTable: [
                        { id: 'cow', weight: 30 }, { id: 'sheep', weight: 25 }, { id: 'pig', weight: 20 },
                        { id: 'horse', weight: 15 }, { id: 'human', weight: 10 }
                    ], structureTable: ['cabin', 'hut', 'camp', 'shrine', 'spring', 'pond'],
                    descriptions: ['Barns loom in the golden fields.','A windmill turns lazily.','Plowed earth stretches to the horizon.','Chicken coops clatter with activity.','A silo casts a long shadow.'] },
                indoors: { name: 'Indoors', role: 'interior', icon: '🏠', color: '#4a3a2a', bgColor: '#2e2010', danger: 2, encounterChance: 0.10, friendlyChance: 0.08, structureChance: 0.10,
                    encounterTable: [
                        { id: 'human', weight: 25 }, { id: 'cat', weight: 25 }, { id: 'mouse', weight: 25 },
                        { id: 'rat', weight: 15 }, { id: 'spider', weight: 10 }
                    ], friendlyTable: [
                        { id: 'human', weight: 30 }, { id: 'cat', weight: 25 }, { id: 'mouse', weight: 25 },
                        { id: 'rat', weight: 10 }, { id: 'spider', weight: 10 }
                    ], structureTable: ['cabin', 'hut', 'shrine', 'ruins', 'web', 'spring'],
                    descriptions: ['Walls enclose the space.','A hearth glows with dying embers.','Furniture is arranged cozily.','The ceiling is low and beamed.','A door leads to other rooms.'] },
                entrance: { name: 'Entrance', role: 'feature', icon: '🚪', color: '#3a3a3a', bgColor: '#1e1e1e', danger: 4, encounterChance: 0.15, encounterTable: [
                    { id: 'human', weight: 25 }, { id: 'goblin', weight: 25 }, { id: 'bat', weight: 20 },
                    { id: 'wolf', weight: 20 }, { id: 'skeleton', weight: 10 }
                ], descriptions: ['A cave mouth yawns in darkness.','A dungeon door stands reinforced.','A portal shimmers with energy.','A gatehouse guards the passage.','An ancient archway frames the way.'] }
            },

            // ===== STRUCTURES (tile features) =====
            STRUCTURES: {
                cabin: { name: 'Cabin', icon: '🏠', encounterChance: 0.25, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.25, stockTable: 'general', species: ['human', 'cat'] }, quest: { chance: 0.35, templates: ['cabin_supplies'], species: ['human', 'cat'] }, lootTable: 'basicGear',
                    descriptions: ['A small wooden cabin stands before you.','A lone cabin, smoke curling from its chimney.','A weathered cabin with a welcoming glow.'] },
                hut: { name: 'Hut', icon: '🛖', encounterChance: 0.20, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.20, stockTable: 'herbalist', species: ['human', 'shroom'] }, quest: { chance: 0.25, templates: ['cabin_supplies'], species: ['human', 'shroom'] },
                    descriptions: ['A rustic hut built from sticks and mud.','A simple hut with a thatched roof.','A travelers hut, abandoned or inhabited.'] },
                cave: { name: 'Cave Mouth', icon: '🕳️', encounterChance: 0.35, disposition: 'enemy', threat: 3,
                    descriptions: ['A dark cave mouth yawns before you.','A shallow cave, something stirs within.','A narrow cave, the air is cold and damp.'] },
                ruins: { name: 'Ruins', icon: '🏛️', encounterChance: 0.30, disposition: 'enemy', threat: 3,
                    quest: { chance: 0.20, templates: ['ruins_cleanup', 'shrine_relic'], species: ['human', 'drow'] }, lootTable: 'relicGear',
                    descriptions: ['Ancient ruins crumble around you.','A collapsed structure, something lurks.','A forgotten ruin, treasures and dangers.'] },
                camp: { name: 'Camp', icon: '⛺', encounterChance: 0.15, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.45, stockTable: 'traveler', species: ['human', 'horse', 'fox'] }, quest: { chance: 0.30, templates: ['camp_safety'], species: ['human', 'horse', 'fox'] }, lootTable: 'armory',
                    descriptions: ['A small campsite, recently used.','A bandit camp, abandoned or occupied.','A makeshift camp, signs of recent travelers.'] },
                shrine: { name: 'Shrine', icon: '⛩️', encounterChance: 0.10, disposition: 'neutral', threat: 0,
                    merchant: { chance: 0.25, stockTable: 'relic', species: ['human', 'drow'] }, quest: { chance: 0.45, templates: ['shrine_relic'], species: ['human', 'drow'] }, lootTable: 'relicGear',
                    descriptions: ['A tiny shrine to a forgotten deity.','A weathered shrine, offerings still fresh.','A serene shrine, peaceful energy radiates.'] },
                pond: { name: 'Pond', icon: '🏞️', encounterChance: 0.15, disposition: 'neutral', threat: 1,
                    descriptions: ['A crystal-clear pond reflects the sky.','A murky pond, something swims beneath.','A still pond, dragonflies dance overhead.'] },
                tree: { name: 'Great Tree', icon: '🌳', encounterChance: 0.10, disposition: 'neutral', threat: 0,
                    descriptions: ['An ancient tree, its trunk wider than a house.','A great tree, its branches form a canopy.','A magical tree, faint light pulses within.'] },
                spring: { name: 'Hot Spring', icon: '♨️', encounterChance: 0.20, disposition: 'friendly', threat: 0,
                    merchant: { chance: 0.30, stockTable: 'herbalist', species: ['human', 'otter', 'frog'] },
                    descriptions: ['A natural hot spring, steam rises lazily.','A warm spring, perfect for a soak.','A hidden spring, the water is inviting.'] },
                burrow: { name: 'Burrow', icon: '🕳️', encounterChance: 0.25, disposition: 'enemy', threat: 2,
                    descriptions: ['A small burrow in the earth.','A network of burrows, something lives here.','A freshly dug burrow, tracks lead inside.'] },
                nest: { name: 'Nest', icon: '🪹', encounterChance: 0.20, disposition: 'enemy', threat: 2,
                    descriptions: ['A large nest built high in the trees.','A ground nest, something broods within.','An abandoned nest, or is it?'] },
                web: { name: 'Web', icon: '🕸️', encounterChance: 0.30, disposition: 'enemy', threat: 3,
                    descriptions: ['Thick webs cover everything.','A massive web spans the clearing.','Gossamer threads, something waits.'] }
            },

            // ===== CHARACTER CREATION =====
            selectedSpecies: 'human',
            selectedGender: null,
            selectedParts: [], // 'cock', 'clit', 'tits', 'pecs', 'none'
            selectedEncounterPreference: 'any',
            selectedEncounterWeights: { female: 34, male: 33, nonbinary: 33 },
            selectedBodyParts: [],
            playerName: 'You',
            storageKeys: {
                hasPlayed: 'yaw-has-played',
                tutorialComplete: 'yaw-tutorial-complete',
                settings: 'yaw-settings',
                contentPrefs: 'yaw-content-prefs',
                logView: 'yaw-log-view',
                lastSlot: 'yaw-last-slot',
                lastSaveTime: 'yaw-last-save-time',
                combatRefreshPrefix: 'yaw-combat-refresh-',
                saveTimePrefix: 'yaw-save-time-'
            },
            legacyStorageKeys: {
                hasPlayed: 'tactical-has-played',
                tutorialComplete: 'tactical-tutorial-complete',
                settings: 'fff-settings',
                contentPrefs: 'fff-content-prefs',
                logView: 'fff-log-view',
                lastSlot: 'fff-last-slot',
                lastSaveTime: 'fff-last-save-time',
                saveTimePrefix: 'fff-save-time-'
            },
            SAVE_DB_NAME: 'YAW_Saves',
            LEGACY_SAVE_DB_NAME: 'FFF_Saves',
            WORLD_DB_NAME: 'YAW_Worlds',
            WORLD_DB_VERSION: 1,
            COMBAT_REFRESH_TTL_MS: 2 * 60 * 60 * 1000,
            _saveTimeKey(slotName) { return YAW_STORAGE.saveTimeKey(this, this._normalizeSaveSlotName(slotName)); },
            _legacySaveTimeKey(slotName) { return YAW_STORAGE.legacySaveTimeKey(this, this._normalizeSaveSlotName(slotName)); },
            _getStoredValue(keyName) { return YAW_STORAGE.getStoredValue(this, keyName); },
            _setStoredValue(keyName, value) { return YAW_STORAGE.setStoredValue(this, keyName, value); },
            _removeStoredValue(keyName) { return YAW_STORAGE.removeStoredValue(this, keyName); },
            _getSaveTime(slotName) { return this._normalizeSaveTimestamp(YAW_STORAGE.getSaveTime(this, this._normalizeSaveSlotName(slotName))); },
            _setSaveTime(slotName, value) { return YAW_STORAGE.setSaveTime(this, this._normalizeSaveSlotName(slotName), this._normalizeSaveTimestamp(value)); },
            _removeSaveTime(slotName) { return YAW_STORAGE.removeSaveTime(this, this._normalizeSaveSlotName(slotName)); },
            _combatRefreshKey(slotName = this.activeSlot) { return YAW_STORAGE.combatRefreshKey(this, this._normalizeSaveSlotName(slotName)); },
            _reloadPage() { return YAW_STORAGE.reloadPage(); },

            init() {
                console.log('App.init() - Mechanics Overhaul');
                this.refreshContinueButton();
                const hasPlayed = this._getStoredValue('hasPlayed');
                if (!hasPlayed) {
                    this.showTutorial();
                    this._setStoredValue('hasPlayed', 'true');
                }
                // Load saved settings
                try {
                    const savedSettings = JSON.parse(this._getStoredValue('settings') || '{}');
                    this.settings = this._normalizeSettings(savedSettings, this._defaultSettings());
                    this._setStoredValue('settings', JSON.stringify(this._settingsForStorage()));
                } catch(e) {
                    console.warn('Settings load failed', e);
                    this.settings = this._normalizeSettings({}, this._defaultSettings());
                    this._setStoredValue('settings', JSON.stringify(this._settingsForStorage()));
                }
                try {
                    const savedPrefs = JSON.parse(this._getStoredValue('contentPrefs') || '{}');
                    if (CONTENT?.applyPreferences) {
                        CONTENT.applyPreferences(savedPrefs, { persist: true });
                    } else {
                        for (const k of Object.keys(savedPrefs)) { CONTENT.preferences[k] = savedPrefs[k]; }
                        CONTENT.preferences.maxTier = this._tierValue(CONTENT.preferences.maxTier);
                    }
                    this.enforceContentTierSettings();
                } catch(e) { console.warn('Content preferences load failed', e); }
                this.loadLogViewPreferences();
                this.applyAccessibilitySettings();
                this.applyStaticLocalization();
                this.updateTierButtons();
                this.initSpeciesGrid();
                this.selectedSpecies = 'human';
                this.initBodyPartsGrid();
                this._syncEncounterPreferenceUI();
                this.showScreen('menu');
            },

            initSpeciesGrid() {
                return YAW_CREATE_FLOW.initSpeciesGrid(this);
            },
            selectSpecies(id) {
                return YAW_CREATE_FLOW.selectSpecies(this, id);
            },

            _setCreateValidation(message = '') {
                return YAW_CREATE_FLOW.setValidation(message);
            },
            _setCreateOptionSelection(selector, value, datasetKey = 'value') {
                return YAW_CREATE_FLOW.setOptionSelection(selector, value, datasetKey);
            },
            selectGender(g) {
                return YAW_CREATE_FLOW.selectGender(this, g);
            },
            selectPart(p) {
                return YAW_CREATE_FLOW.selectPart(this, p);
            },
            toggleBodyPart(id) {
                return YAW_CREATE_FLOW.toggleBodyPart(this, id);
            },
            updateAnatomyUI() {
                return YAW_CREATE_FLOW.updateAnatomyUI(this);
            },
            validateCharacterCreation() {
                return YAW_CREATE_FLOW.validate(this);
            },
            randomizeCharacter() {
                return YAW_CREATE_FLOW.randomize(this);
            },
            toggleAccordion(id) {
                return YAW_CREATE_FLOW.toggleAccordion(id);
            },
            initBodyPartsGrid() {
                return YAW_CREATE_FLOW.initBodyPartsGrid(this);
            },

            createCharacter() {
                return YAW_CREATE_FLOW.createCharacter(this);
            },

            _getSpeciesBaseStats(sid) {
                return YAW_SPECIES_SYSTEM.baseStats(sid);
            },
            _getSpeciesTemperament(sid) {
                return this.SPECIES_TEMPERAMENT[sid] || { opportunistic: true };
            },
            _isPredatorOf(predatorSpecies, preySpecies) {
                const rel = this.PREDATOR_PREY_RELATION[predatorSpecies];
                if (!rel) return false;
                if (rel.prey && rel.prey.includes('all')) return true;
                return rel.prey && rel.prey.includes(preySpecies);
            },
            _calculateEncounterDisposition(creature, player) {
                const temp = this._getSpeciesTemperament(creature.species);
                const playerTemp = this._getSpeciesTemperament(player.species);
                const isPredator = this._isPredatorOf(creature.species, player.species);
                const isPrey = this._isPredatorOf(player.species, creature.species);
                const sameSpecies = creature.species === player.species;
                const playerLevel = player.level || 1;
                const partySize = this.party.length;
                const creatureLevel = creature.level || 1;
                const levelDiff = playerLevel - creatureLevel;
                let aggression = 50;
                if (temp.timid) aggression -= 40;
                if (temp.prey) aggression -= 30;
                if (temp.fastFlee) aggression -= 20;
                if (temp.herd) aggression -= 10;
                if (temp.passive) aggression -= 50;
                if (temp.aggressive) aggression += 30;
                if (temp.territorial) aggression += 20;
                if (temp.apex) aggression += 40;
                if (temp.pack && partySize > 1) aggression += 20;
                if (temp.pack && partySize === 1) aggression -= 10;
                if (temp.ambush) aggression += 15;
                if (temp.cunning) aggression += 10;
                if (temp.swarm) aggression += 25;
                if (isPredator) aggression += 35;
                if (isPrey) aggression -= 25;
                if (sameSpecies) {
                    aggression -= 20;
                    if (temp.herd) aggression -= 20;
                }
                if (levelDiff >= 5) aggression -= 40;
                else if (levelDiff >= 3) aggression -= 25;
                else if (levelDiff >= 1) aggression -= 10;
                else if (levelDiff <= -3) aggression += 25;
                else if (levelDiff <= -1) aggression += 10;
                if (partySize >= 4) aggression -= 20;
                else if (partySize >= 2) aggression -= 10;
                if (partySize === 1 && temp.pack) aggression += 15;
                aggression = Math.max(0, Math.min(100, aggression));
                if (aggression <= 25) return this.DISPOSITION.FRIENDLY;
                if (aggression <= 55) return this.DISPOSITION.NEUTRAL;
                return this.DISPOSITION.ENEMY;
            },

            _isCorpse(unit) {
                return YAW_UNIT_LIFECYCLE.isCorpse(this, unit);
            },
            _isLivingCreature(unit) {
                return YAW_UNIT_LIFECYCLE.isLiving(this, unit);
            },
            _livingEnemies(list = this.creatures) {
                return YAW_UNIT_LIFECYCLE.livingEnemies(this, list);
            },
            _isCombatQueueUnitValid(unit) {
                return YAW_UNIT_LIFECYCLE.isCombatQueueUnitValid(this, unit);
            },
            _sanitizeCombatState(options = {}) {
                if (!this.combatState?.active) return false;
                const preserveTurn = options.preserveTurn !== false;
                const previousUnit = this.combatState.turnQueue?.[this.combatState.currentTurn]?.unit || null;
                const validQueue = (this.combatState.turnQueue || [])
                    .filter(entry => entry && this._isCombatQueueUnitValid(entry.unit));
                this.combatState.turnQueue = validQueue;
                this.combatState.syncActions = (this.combatState.syncActions || []).map(sync => {
                    const participants = (sync.participants || []).filter(unit => this._isCombatQueueUnitValid(unit) && (this.party || []).includes(unit));
                    const target = this._isCombatQueueUnitValid(sync.target) && sync.target?.disposition === this.DISPOSITION.ENEMY ? sync.target : null;
                    return { ...sync, participants, target };
                }).filter(sync => sync.target && sync.participants.length >= 2 && !sync.resolved);
                if (validQueue.length === 0) {
                    this.combatState.currentTurn = 0;
                    this.activeActor = null;
                } else if (preserveTurn && previousUnit) {
                    const nextIndex = validQueue.findIndex(entry => entry.unit === previousUnit);
                    this.combatState.currentTurn = nextIndex >= 0
                        ? nextIndex
                        : Math.min(Math.max(0, this.combatState.currentTurn || 0), validQueue.length - 1);
                } else {
                    this.combatState.currentTurn = Math.min(Math.max(0, this.combatState.currentTurn || 0), validQueue.length - 1);
                }
                this.mode = this.GAME_MODE.COMBAT;
                const current = validQueue[this.combatState.currentTurn]?.unit || null;
                if (current) this.activeActor = current;
                else if (!this._isCombatQueueUnitValid(this.activeActor)) this.activeActor = null;
                return true;
            },
            _tileCreatures(list = []) {
                return YAW_UNIT_LIFECYCLE.tileCreatures(this, list);
            },
            _unitSaveRef(unit) {
                return YAW_UNIT_LIFECYCLE.saveRef(unit);
            },
            _findUnitBySaveRef(ref) {
                return YAW_UNIT_LIFECYCLE.findBySaveRef(this, ref);
            },
            _containerCapacity(unit, container = 'stomach') {
                return YAW_UNIT_CONTAINERS.capacity(unit, container);
            },
            _containerContents(unit, container = 'stomach') {
                return YAW_UNIT_CONTAINERS.contents(unit, container);
            },
            _containerUsed(unit, container = 'stomach') {
                return YAW_UNIT_CONTAINERS.used(unit, container);
            },
            _canFitPrey(predator, prey, container = 'stomach') {
                return YAW_UNIT_CONTAINERS.canFit(predator, prey, container);
            },
            _capacityFailureMessage(actor, target, container = 'stomach') {
                return YAW_UNIT_CONTAINERS.failureMessage(this, actor, target, container);
            },
            _containerSummary(unit, container = 'stomach') {
                return YAW_UNIT_CONTAINERS.summary(this, unit, container);
            },
            _interiorKey(x = this.interiorLocation.x, y = this.interiorLocation.y) {
                return YAW_STRUCTURE_NAVIGATION.interiorKey(this, x, y);
            },
            _currentOverworldTile() {
                return YAW_STRUCTURE_NAVIGATION.currentOverworldTile(this);
            },
            _currentInteriorTile() {
                return YAW_STRUCTURE_NAVIGATION.currentInteriorTile(this);
            },
            _currentExplorationTile() {
                return YAW_STRUCTURE_NAVIGATION.currentExplorationTile(this);
            },
            _interiorBiomeForStructure(structureId) {
                return YAW_STRUCTURE_NAVIGATION.interiorBiomeForStructure(structureId);
            },
            _ensureStructureInterior(tile) {
                return YAW_STRUCTURE_NAVIGATION.ensureInterior(this, tile);
            },
            _canRestHere() {
                return YAW_STRUCTURE_NAVIGATION.canRestHere(this);
            },
            _isRestCapableStructure(structureId, tile = null) {
                return YAW_STRUCTURE_NAVIGATION.isRestCapableStructure(this, structureId, tile);
            },
            _isTimid(unit) {
                return Boolean(unit && (unit.timid || this._getSpeciesTemperament(unit.species).timid));
            },
            _isSocialWithThreatened(target, candidate) {
                if (!target || !candidate || target === candidate) return false;
                if (!this._isLivingCreature(candidate) || candidate.disposition === this.DISPOSITION.ENEMY) return false;
                const targetTemp = this._getSpeciesTemperament(target.species);
                const candidateTemp = this._getSpeciesTemperament(candidate.species);
                if (target.species && candidate.species === target.species) return true;
                if (targetTemp.pack && candidateTemp.pack) return true;
                if (targetTemp.herd && candidateTemp.herd) return true;
                if (targetTemp.swarm && candidateTemp.swarm) return true;
                return false;
            },
            _shouldFleeThreat(unit) {
                const temp = this._getSpeciesTemperament(unit.species);
                return this._isTimid(unit) || temp.fastFlee || temp.passive || (temp.prey && !temp.aggressive);
            },
            _makeCreatureFlee(unit, threat = this.player) {
                this._removeCreatureFromArea(unit);
                return { fled: true, text: `${unit.name} panics and flees from ${threat?.name || 'the threat'}!` };
            },
            _removeCreatureFromArea(unit) {
                if (!unit) return;
                this.creatures = this.creatures.filter(c => c !== unit);
                this.combatState.turnQueue = (this.combatState.turnQueue || []).filter(entry => entry.unit !== unit);
                this._normalizeExplorationSelections();
                this._syncCurrentTileCreatures();
            },
            _removeContainedTarget(target) {
                if (!target) return;
                if (this.party.includes(target)) this._removeContainedPartyMember(target);
                else this._removeCreatureFromArea(target);
                this.combatState.turnQueue = (this.combatState.turnQueue || []).filter(entry => entry.unit !== target);
                this.combatState.syncActions = (this.combatState.syncActions || []).filter(sync => sync.target !== target && !(sync.participants || []).includes(target));
                if (this.activeActor === target) this.activeActor = null;
                if (this.targetSelection?.target === target || this.targetSelection?.targetId === this._unitSaveRef(target)) this.targetSelection = null;
                this._syncCurrentTileCreatures();
            },
            _containTargetIn(predator, target, container = 'stomach', extra = {}) {
                if (!predator || !target) return null;
                const prey = this._createStomachPrey(target, {
                    ...extra,
                    inWomb: container === 'womb' || extra.inWomb,
                    inCock: container === 'balls' || extra.inCock
                });
                if (!Array.isArray(predator[container])) predator[container] = [];
                predator[container].push(prey);
                target.CPun = 0;
                target.CPle = 0;
                this._removeContainedTarget(target);
                return prey;
            },
            _turnCreatureHostile(unit) {
                unit.disposition = this.DISPOSITION.ENEMY;
                unit.willing = false;
                this._syncCurrentTileCreatures();
                return { fled: false, hostile: unit, text: `${unit.name} turns hostile!` };
            },
            _syncCurrentTileCreatures() {
                if (this.inInterior) {
                    const room = this._currentInteriorTile();
                    if (room) room.creatures = this._tileCreatures(this.creatures);
                    return;
                }
                const tile = this.worldMap.get(`${this.location.x},${this.location.y}`);
                if (tile) {
                    tile.creatures = this._tileCreatures(this.creatures);
                    this.persistTileDelta(tile.x, tile.y, tile);
                }
            },
            _persistCurrentExplorationTile(tile = this._currentExplorationTile()) {
                return YAW_STRUCTURE_NAVIGATION.persistCurrentExplorationTile(this, tile);
            },
            _dropPartyCorpse(unit, cause = 'fight') {
                if (!unit || unit === this.player || unit.name === this.player?.name) return false;
                const partyIndex = this.party.indexOf(unit);
                if (partyIndex === -1) return false;
                this.party.splice(partyIndex, 1);
                unit.ally = false;
                unit.obedient = false;
                unit.disposition = this.DISPOSITION.CORPSE;
                if (!this.creatures.includes(unit)) this.creatures.push(unit);
                this._makeCorpse(unit, cause);
                this.combatState.turnQueue = this.combatState.turnQueue.filter(entry => entry.unit !== unit);
                this.log.push({ text: `${unit.name}'s remains fall to the ground.`, type: 'combat' });
                this.renderParty();
                this.renderCreatures();
                return true;
            },
            _processCorpseDecay() {
                let removed = 0;
                for (const corpse of this.creatures.filter(c => this._isCorpse(c))) {
                    corpse.decayTurns = corpse.decayTurns ?? 12;
                    corpse.decayTurns -= 1;
                }
                this.creatures = this.creatures.filter(c => {
                    if (!this._isCorpse(c) || c.decayTurns > 0) return true;
                    removed++;
                    return false;
                });
                if (removed > 0) {
                    this.log.push({ text: `${removed === 1 ? 'A corpse decays' : removed + ' corpses decay'} into nothing.`, type: 'discovery' });
                    this._syncCurrentTileCreatures();
                    this.renderCreatures();
                    this.renderLog();
                }
            },
            _threatReactionRoll(unit, threat, purpose = 'react') {
                const unitId = this._unitSelectionId(unit);
                const threatId = this._unitSelectionId(threat || this.player);
                const x = Number(this.location?.x ?? 0);
                const y = Number(this.location?.y ?? 0);
                return this._worldRoll('threat-reaction', x, y, unitId, threatId, this.dayCount || 0, this.timeHour || 0, purpose);
            },
            _attemptTimidCreatureFlee(unit, threat = this.player) {
                if (!this._isTimid(unit) || unit.disposition === this.DISPOSITION.ENEMY || this._isCorpse(unit)) return null;
                const chance = Math.min(1, Math.max(0, (unit.Flee || 10) / 20));
                if (this._threatReactionRoll(unit, threat, 'timid') < chance) {
                    return this._makeCreatureFlee(unit, threat);
                }
                const hostile = this._turnCreatureHostile(unit);
                hostile.text = `${unit.name} is cornered and turns hostile!`;
                return hostile;
            },
            _reactCreatureToThreat(unit, threat = this.player) {
                if (!unit || unit.disposition === this.DISPOSITION.ENEMY || !this._isLivingCreature(unit)) return null;
                if (this._isTimid(unit)) return this._attemptTimidCreatureFlee(unit, threat);
                if (this._shouldFleeThreat(unit)) {
                    const chance = Math.min(0.75, Math.max(0.15, (unit.Flee || 10) / 30));
                    if (this._threatReactionRoll(unit, threat, 'threat') < chance) return this._makeCreatureFlee(unit, threat);
                }
                return this._turnCreatureHostile(unit);
            },
            _reactToNonHostileAttack(target, threat = this.player) {
                const reactants = [target, ...this.creatures.filter(c => this._isSocialWithThreatened(target, c))];
                const hostiles = [];
                const texts = [];
                for (const unit of reactants) {
                    const reaction = this._reactCreatureToThreat(unit, threat);
                    if (!reaction) continue;
                    texts.push(reaction.text);
                    if (reaction.hostile || (!reaction.fled && unit.disposition === this.DISPOSITION.ENEMY)) {
                        hostiles.push(reaction.hostile || unit);
                    }
                }
                return { hostiles, text: texts.join(' ') || `${target.name} recoils from the attack.` };
            },
            _attemptTimidAllyFlee(ally) {
                if (!this._isTimid(ally)) return false;
                const livingEnemies = this._livingEnemies(this.creatures);
                const livingParty = this.party.filter(p => p.CPun > 0 && !p.knockedOut && !p.fledCombat);
                const badlyOutnumbered = livingEnemies.length > livingParty.length;
                if (!badlyOutnumbered) return false;
                const chance = Math.min(1, Math.max(0, (ally.Flee || 10) / 20));
                if (this._combatStateRoll('combat-ally-flee', ally, 'badly-outnumbered') < chance) {
                    ally.fledCombat = true;
                    this.combatState.turnQueue = this.combatState.turnQueue.filter(entry => entry.unit !== ally);
                    this.combatState.currentTurn = Math.max(-1, this.combatState.currentTurn - 1);
                    this.log.push({ text: this._label('combat.allyFlees', '{name} loses their nerve and flees from the fight!', { name: ally.name }), type: 'combat' });
                    this.renderLog();
                    this.renderParty();
                    this.nextTurn();
                    return true;
                }
                this.log.push({ text: this._label('combat.allyFleeFailed', '{name} tries to flee but cannot get away!', { name: ally.name }), type: 'combat' });
                this.renderLog();
                return false;
            },
            _makeCorpse(target, cause = 'fight') {
                if (!target) return target;
                const wasLiving = this._isLivingCreature(target);
                target.CPun = 0;
                target.CPle = 0;
                target.alive = false;
                target.disposition = this.DISPOSITION.CORPSE;
                target.corpseCause = cause;
                target.corpseName = target.corpseName || target.name;
                target.corpseIcon = target.corpseIcon || target.icon;
                target.decayTurns = target.decayTurns ?? 12;
                target.status = {};
                target.willing = false;
                target.knockedOut = false;
                this._normalizeExplorationSelections();
                this._syncCurrentTileCreatures();
                if (wasLiving && cause === 'fight') {
                    this._updateQuestProgress('defeat', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                }
                return target;
            },

            _applySpeciesAbilities(unit) {
                if (!unit) return unit;
                const speciesAbilities = this.SPECIES_ABILITIES[unit.species] || {};
                Object.assign(unit, speciesAbilities);
                for (const partId of unit.bodyParts || []) {
                    switch (partId) {
                        case 'fangs':
                            unit.bloodsuck = true;
                            unit.poisonous = unit.poisonous || unit.species === 'naga' || unit.species === 'spider';
                            break;
                        case 'wings':
                            unit.flying = true;
                            break;
                        case 'tail':
                        case 'tentacles':
                        case 'pincers':
                            unit.constrictor = true;
                            break;
                        case 'webbing':
                            unit.ranged = true;
                            unit.antiflying = true;
                            break;
                        case 'fins':
                            unit.swimming = true;
                            break;
                        case 'stinger':
                            unit.venom = true;
                            break;
                    }
                }
                return unit;
            },

            _normalizeUnit(unit, defaults = {}) {
                if (!unit) return unit;
                const original = { ...unit };
                const species = this.species.find(s => s.id === unit.species);
                const base = this._getSpeciesBaseStats(unit.species || 'human');
                Object.assign(unit, defaults, original);
                unit.icon = unit.icon || species?.icon || '👤';
                unit.gender = unit.gender || 'female';
                unit.level = unit.level || 1;
                unit.MPun = unit.MPun || unit.maxHp || base.MPun || 100;
                unit.CPun = unit.CPun ?? unit.hp ?? unit.MPun;
                unit.MPle = unit.MPle || base.MPle || 100;
                unit.CPle = unit.CPle ?? 0;
                unit.Figh = unit.Figh ?? unit.stats?.str ?? base.Figh ?? 10;
                unit.Feas = unit.Feas ?? base.Feas ?? 10;
                unit.Flir = unit.Flir ?? unit.stats?.cha ?? base.Flir ?? 10;
                unit.Fuck = unit.Fuck ?? base.Fuck ?? 10;
                unit.Flee = unit.Flee ?? unit.stats?.spd ?? base.Flee ?? 10;
                unit.Feed = unit.Feed ?? base.Feed ?? 10;
                unit.str = unit.str ?? unit.stats?.str ?? base.str ?? 10;
                unit.con = unit.con ?? unit.stats?.con ?? base.con ?? 10;
                unit.spd = unit.spd ?? unit.stats?.spd ?? base.spd ?? 10;
                unit.int = unit.int ?? unit.stats?.int ?? base.int ?? 10;
                unit.wis = unit.wis ?? unit.stats?.wis ?? base.wis ?? 10;
                unit.cha = unit.cha ?? unit.stats?.cha ?? base.cha ?? 10;
                unit.size = unit.size || 4;
                unit.appetite = unit.appetite || 4;
                unit.bodyParts = unit.bodyParts || this.SPECIES_DEFAULT_PARTS[unit.species] || [];
                unit.tags = unit.tags || [species?.name || unit.species || 'Unknown'];
                this._applySpeciesCanon(unit);
                unit.perks = unit.perks || [];
                unit.pendingPerkChoices = unit.pendingPerkChoices || 0;
                unit.stomach = unit.stomach || [];
                unit.womb = unit.womb || [];
                unit.balls = unit.balls || [];
                unit.inventory = unit.inventory || [];
                unit.equipment = unit.equipment || {};
                for (const slot of Object.keys(this.EQUIPMENT_SLOTS)) {
                    if (!(slot in unit.equipment)) unit.equipment[slot] = null;
                }
                this._recalculateEquipment(unit, { inferBase: !unit.equipmentBaseStats });
                unit.stats = this._unitCoreStats(unit);
                unit.gold = unit.gold || 0;
                unit.quest = unit.quest || null;
                unit.questAccepted = Boolean(unit.questAccepted);
                unit.stock = this._normalizeMerchantStock(unit.stock || []);
                unit.stockLastRefreshDay = unit.stockLastRefreshDay ?? this.dayCount ?? 0;
                unit.cum = unit.cum || 0;
                unit.status = unit.status || {};
                unit.lactating = unit.lactating || false;
                unit.lactationCooldown = unit.lactationCooldown || 0;
                unit.slurpable = unit.slurpable || this.SPECIES_ABILITIES[unit.species]?.floopy || this.SPECIES_ABILITIES[unit.species]?.enveloped || false;
                unit.breakable = unit.breakable || false;
                unit.willingPrey = unit.willingPrey || false;
                unit.forcedFed = unit.forcedFed || false;
                unit.pregnant = unit.pregnant || false;
                unit.knockedOut = Boolean(unit.knockedOut);
                unit.obedient = unit.obedient ?? true;
                unit.willing = unit.willing ?? false;
                unit.aiOrder = unit.aiOrder || (unit.mc ? 'aggressive' : 'aggressive');
                unit.partyRole = this.PARTY_ROLES[unit.partyRole] ? unit.partyRole : 'companion';
                this._applySpeciesAbilities(unit);
                return unit;
            },

            _unitCoreStats(unit) {
                return YAW_UNIT_STATS.coreStats(unit);
            },

            _unitDisplayStats(unit) {
                return YAW_UNIT_STATS.displayStats(this, unit);
            },

            _unitDispositionLabel(unit) {
                if (!unit) return '';
                if (this._isCorpse(unit)) return this._label('disposition.remains', 'Remains');
                if (unit.disposition === this.DISPOSITION.ENEMY) return this._label('disposition.hostile', 'Hostile');
                if (unit.disposition === this.DISPOSITION.FRIENDLY) return this._label('disposition.friendly', 'Friendly');
                if (unit.disposition === this.DISPOSITION.QUEST_GIVER) return this._label('disposition.quest', 'Quest');
                if (unit.disposition === this.DISPOSITION.MERCHANT) return this._label('disposition.merchant', 'Merchant');
                if (unit.disposition === this.DISPOSITION.NEUTRAL) return this._label('disposition.neutral', 'Neutral');
                return '';
            },

            _combatRowLabel(row) {
                if (row === 'back') return this._label('combat.row.back', 'Back');
                if (row === 'front') return this._label('combat.row.front', 'Front');
                return '';
            },

            _emitModuleHook(event, payload = {}) {
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
                    MODULE_SYSTEM.executeHook(event, { ...payload, app: this }).catch(() => {});
                }
            },

            _emitCombatAction(action, actor, target, result) {
                this._emitModuleHook('onCombatAction', { action, actor, target, result });
            },

            _emitMapGenerate(tile, x, y) {
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
                    MODULE_SYSTEM.executeHook('onMapGenerate', tile, x, y, this).catch(() => {});
                }
            },

            _awardCombatXP(amount) {
                this.combatState.xpEarned = (this.combatState.xpEarned || 0) + amount;
            },

            // ===== MAP SYSTEM =====
            // ===== WORLD / REGION SYSTEM =====
            // Base terrain is reconstructed from worldMeta seed + generator version + coordinates.
            // Durable player/world changes live in tile deltas over this generated baseline.
            _mapSeed() {
                return YAW_WORLD_STATE.mapSeed(this);
            },
            _seededNoise(...parts) {
                return YAW_WORLD_STATE.seededNoise(this, ...parts);
            },
            _patchNoise(spx, spy) {
                return YAW_WORLD_STATE.patchNoise(this, spx, spy);
            },
            _tileKey(x, y) {
                return YAW_WORLD_STATE.tileKey(x, y);
            },
            _tileDeltaStoreKey(worldId, x, y) {
                return YAW_WORLD_STATE.tileDeltaStoreKey(this, worldId, x, y);
            },
            _defaultWorldMeta() {
                return YAW_WORLD_STATE.defaultWorldMeta();
            },
            _normalizeWorldMeta(meta, fallback = null) {
                return YAW_WORLD_STATE.normalizeWorldMeta(this, meta, fallback);
            },
            _cloneTileValue(value) {
                return YAW_WORLD_STATE.cloneTileValue(value);
            },
            _regionBiomeKeys() {
                return YAW_WORLD_STATE.regionBiomeKeys(this);
            },
            _getSuperPatchBiome(spx, spy) {
                return YAW_WORLD_STATE.getSuperPatchBiome(this, spx, spy);
            },
            _rebuildSuperPatchMap() {
                return YAW_WORLD_STATE.rebuildSuperPatchMap(this);
            },
            getBaseTile(x, y) {
                return YAW_WORLD_STATE.getBaseTile(this, x, y);
            },
            getTileDelta(x, y) {
                return YAW_WORLD_STATE.getTileDelta(this, x, y);
            },
            applyTileDelta(base, delta = null) {
                return YAW_WORLD_STATE.applyTileDelta(this, base, delta);
            },
            _tileDeltaFromEffectiveTile(tile) {
                return YAW_WORLD_STATE.tileDeltaFromEffectiveTile(this, tile);
            },
            persistTileDelta(x, y, tile = null) {
                return YAW_WORLD_STATE.persistTileDelta(this, x, y, tile);
            },
            persistAllTileDeltas() {
                return YAW_WORLD_STATE.persistAllTileDeltas(this);
            },
            _prepareSaveSnapshot() {
                this._syncPlayerPartyReference();
                this._normalizeExplorationSelections();
                this._syncCurrentTileCreatures();
                this.persistAllTileDeltas();
            },
            _tileDeltaRecordFromEntry(key, delta) {
                return YAW_WORLD_STATE.tileDeltaRecordFromEntry(this, key, delta);
            },
            _normalizeTileDeltaRecord(record) {
                return YAW_WORLD_STATE.normalizeTileDeltaRecord(this, record);
            },
            _applyTileDeltaRecords(records = []) {
                return YAW_WORLD_STATE.applyTileDeltaRecords(this, records);
            },
            getTile(x, y) {
                return YAW_WORLD_STATE.getTile(this, x, y);
            },
            isExplored(x, y) {
                return YAW_WORLD_STATE.isExplored(this, x, y);
            },
            exploreTile(x, y) {
                return YAW_WORLD_STATE.exploreTile(this, x, y);
            },

            enterStructure() {
                return YAW_STRUCTURE_NAVIGATION.enter(this);
            },

            exitStructure() {
                return YAW_STRUCTURE_NAVIGATION.exit(this);
            },

            moveInterior(dx, dy) {
                return YAW_STRUCTURE_NAVIGATION.moveInterior(this, dx, dy);
            },

            // ===== MOVEMENT =====
            move(dx, dy) {
                return YAW_MOVEMENT_FLOW.move(this, dx, dy);
            },

            // ===== ENCOUNTER / SPAWN =====
            _weightedPick(table) {
                return YAW_WORLD_RANDOM.weightedPick(table);
            },
            _worldRoll(namespace, x = 0, y = 0, ...parts) {
                return YAW_WORLD_RANDOM.roll(this, namespace, x, y, ...parts);
            },
            _worldChance(namespace, x, y, probability, ...parts) {
                return YAW_WORLD_RANDOM.chance(this, namespace, x, y, probability, ...parts);
            },
            _weightedPickWorld(table, namespace, x, y, ...parts) {
                return YAW_WORLD_RANDOM.weightedPickWorld(this, table, namespace, x, y, ...parts);
            },
            _pickWorldList(items, namespace, x = 0, y = 0, ...parts) {
                return YAW_WORLD_RANDOM.pickList(this, items, namespace, x, y, ...parts);
            },
            _stableIdPart(value, fallback = 'item') {
                return YAW_WORLD_RANDOM.stableIdPart(value, fallback);
            },
            _normalizeEncounterWeights(weights = null) {
                return YAW_ENCOUNTER_PREFERENCES.normalize(weights);
            },
            _encounterPresetWeights(value) {
                return YAW_ENCOUNTER_PREFERENCES.preset(value);
            },
            _encounterPreferenceFromWeights(weights = this.selectedEncounterWeights) {
                return YAW_ENCOUNTER_PREFERENCES.preferenceFromWeights(weights);
            },
            _setEncounterWeights(weights, preset = null) {
                return YAW_ENCOUNTER_PREFERENCES.setWeights(this, weights, preset);
            },
            _syncEncounterPreferenceUI() {
                return YAW_ENCOUNTER_PREFERENCES.syncUI(this);
            },
            setEncounterPreferencePreset(value) {
                return YAW_ENCOUNTER_PREFERENCES.setPreset(this, value);
            },
            updateEncounterWeight(key, value) {
                return YAW_ENCOUNTER_PREFERENCES.updateWeight(this, key, value);
            },
            _legacyEncounterWeights(preference = 'any') {
                return this._encounterPresetWeights(preference);
            },
            _pickEncounterIdentity(rollValue, weights = this.encounterWeights || this.selectedEncounterWeights) {
                return YAW_ENCOUNTER_PREFERENCES.pickIdentity(rollValue, weights);
            },
            _anatomyForIdentity(identity, rollValue) {
                return YAW_ENCOUNTER_PREFERENCES.anatomyForIdentity(identity, rollValue);
            },
            spawnWildEncounter(tile, isBoss = false, firstEntry = false) {
                const biome = this.biomes[tile.biome];
                const tileX = Number.isFinite(tile?.x) ? tile.x : 0;
                const tileY = Number.isFinite(tile?.y) ? tile.y : 0;
                const tileKey = Number.isFinite(tile?.x) && Number.isFinite(tile?.y) ? `${tile.x}_${tile.y}` : 'unknown';
                const roll = (purpose, index = 0, salt = '') => this._worldRoll(`wild-${purpose}`, tileX, tileY, index, salt);
                const pick = (table, purpose, index = 0, salt = '') => this._weightedPickWorld(table, `wild-${purpose}`, tileX, tileY, index, salt);
                const count = isBoss ? 1 : Math.max(1, Math.floor(roll('count') * Math.min(3, Math.max(1, this.player.level - 1))) + 1);
                const creatures = [];
                for (let i = 0; i < count; i++) {
                    const pool = this._timeAdjustedEncounterTable(biome.encounterTable);
                    let sid = pick(pool, 'species', i);
                    const danger = biome.danger || 3;
                    const playerMaxDiff = this.player.level <= 3 ? 2 : (this.player.level <= 6 ? 3 : 4);
                    const maxDiff = isBoss ? 5 : Math.min(danger, playerMaxDiff);
                    let attempts = 10;
                    while (attempts > 0) {
                        const diff = this.SPECIES_DIFFICULTY[sid] || 2;
                        if (diff <= maxDiff) break;
                        sid = pick(pool, 'species', i, attempts);
                        attempts--;
                    }
                    const sp = this.species.find(s => s.id === sid);
                    const lvl = isBoss ? Math.max(1, this.player.level) : Math.max(1, this.player.level - 1 + Math.floor(roll('level', i) * 2));
                    const base = this._getSpeciesBaseStats(sid);
                    const statMult = isBoss ? 1.0 : (0.6 + roll('stat', i) * 0.3);
                    const hpMult = isBoss ? 1.2 : (0.5 + roll('hp', i) * 0.3);
                    const identity = this._pickEncounterIdentity(roll('identity', i));
                    const anatomy = this._anatomyForIdentity(identity, roll('anatomy', i));
                    const creature = {
                        id: isBoss ? `enc_${tileKey}_boss_${i}` : `enc_${tileKey}_${i}`, name: sp.name + (count > 1 ? ' ' + (i + 1) : ''),
                        species: sid, icon: sp.icon, gender: identity,
                        identity, parts: anatomy.parts, chest: anatomy.chest,
                        bodyParts: this.SPECIES_DEFAULT_PARTS[sid] || [], size: this.SPECIES_SIZE[sid] || 4, appetite: Math.floor(roll('appetite', i) * 4) + 2,
                        level: lvl, MPun: Math.floor(base.MPun * hpMult * (0.7 + lvl * 0.1)), CPun: Math.floor(base.MPun * hpMult * (0.7 + lvl * 0.1)),
                        MPle: base.MPle, CPle: Math.floor(base.MPle * 0.3),
                        Figh: Math.floor(base.Figh * statMult), Feas: Math.floor(base.Feas * statMult),
                        Flir: Math.floor(base.Flir * statMult), Fuck: Math.floor(base.Fuck * statMult),
                        Flee: Math.floor(base.Flee * statMult), Feed: Math.floor(base.Feed * statMult),
                        hunger: Math.floor((base.hunger || 40) * 0.7), str: Math.floor(base.str * statMult), con: Math.floor(base.con * statMult), spd: Math.floor(base.spd * statMult),
                        int: Math.floor(base.int * statMult), wis: Math.floor(base.wis * statMult), cha: Math.floor(base.cha * statMult),
                        tags: [sp.name], stomach: [], womb: [], balls: [], cum: 0, status: {},
                        expanded: false, hero: false, ally: false, mc: false, obedient: false, willing: roll('willing', i) < 0.3,
                        ...this.SPECIES_ABILITIES[sid] || {}
                    };
                    this._applySpeciesCanon(creature);
                    creature.ambushReady = firstEntry && Boolean(this._getSpeciesTemperament(sid).ambush);
                    this._applyTimeOfDayToCreature(creature);
                    // Calculate disposition based on temperament
                    creature.disposition = this._calculateEncounterDisposition(creature, this.player);
                    creatures.push(creature);
                }
                this.creatures = this._tileCreatures([...(this.creatures || []), ...creatures]);
                tile.creatures = this._tileCreatures(this.creatures);
                this.persistTileDelta(tile.x, tile.y, tile);
                const enemies = this._livingEnemies(creatures);
                const friendlies = creatures.filter(c => c.disposition === this.DISPOSITION.FRIENDLY && this._isLivingCreature(c));
                const neutrals = creatures.filter(c => c.disposition === this.DISPOSITION.NEUTRAL && this._isLivingCreature(c));
                const ctx = { species: creatures[0].species, mood: enemies.length > 0 ? 'hostile' : 'curious', voreEnabled: true, explicit: true };
                const biomeText = CONTENT.biomeIntro(this.currentBiome || 'forest', ctx);
                let encounterText = '';
                if (enemies.length > 0) {
                    encounterText = `You encounter ${enemies.map(e => e.name).join(', ')}! They are aggressive!`;
                    if (neutrals.length > 0) encounterText += ` Nearby, ${neutrals.map(n => n.name).join(', ')} watch${neutrals.length === 1 ? 'es' : ''} cautiously.`;
                    if (friendlies.length > 0) encounterText += ` ${friendlies.map(f => f.name).join(', ')} seem${friendlies.length === 1 ? 's' : ''} unconcerned.`;
                } else if (neutrals.length > 0) {
                    encounterText = `You spot ${neutrals.map(n => n.name).join(', ')}. They watch you cautiously.`;
                    if (friendlies.length > 0) encounterText += ` ${friendlies.map(f => f.name).join(', ')} seem${friendlies.length === 1 ? 's' : ''} friendly.`;
                } else {
                    encounterText = `You spot ${friendlies.map(f => f.name).join(', ')}. They seem friendly.`;
                }
                this.updateScene(`${biome.name} - ${tile.hasLandmark ? tile.landmarkName : 'Wilderness'}`, biomeText + '\n\n' + encounterText, enemies.length > 0);
                this.log.push({ text: encounterText, type: enemies.length > 0 ? 'combat' : 'discovery' });
                if (enemies.length > 0) {
                    if (isBoss) { this.log.push({ text: `A powerful guardian guards the ${tile.landmarkName}!`, type: 'combat' }); }
                    this.startCombat(enemies);
                } else {
                    this.renderCreatures();
                    this.renderExplorationActions();
                }
            },
            spawnStructureEncounter(tile, firstEntry = false) {
                const biome = this.biomes[tile.biome];
                if (!tile.structure || !this.STRUCTURES[tile.structure]) return;
                const struct = this.STRUCTURES[tile.structure];
                tile.structureSpawned = true;
                const merchant = this._maybeSpawnStructureMerchant(tile);
                const questGiver = this._maybeSpawnStructureQuestGiver(tile);
                this.persistTileDelta(tile.x, tile.y, tile);
                // Structure always has an encounter inside
                if (this._worldChance('structure-encounter', tile.x, tile.y, struct.encounterChance || 0)) {
                    // Pick from structure-appropriate pool or biome pool
                    const pool = this._timeAdjustedEncounterTable(biome.encounterTable);
                    const sid = this._weightedPickWorld(pool, 'structure-encounter-species', tile.x, tile.y);
                    const sp = this.species.find(s => s.id === sid);
                    if (!sp) return;
                    const lvl = Math.max(1, this.player.level - 1 + Math.floor(this._worldRoll('structure-encounter-level', tile.x, tile.y) * 2));
                    const base = this._getSpeciesBaseStats(sid);
                    const statMult = 0.6 + this._worldRoll('structure-encounter-stat', tile.x, tile.y) * 0.3;
                    const hpMult = 0.5 + this._worldRoll('structure-encounter-hp', tile.x, tile.y) * 0.3;
                    const disp = struct.disposition === 'friendly' ? this.DISPOSITION.FRIENDLY :
                                 struct.disposition === 'neutral' ? this.DISPOSITION.NEUTRAL : this.DISPOSITION.ENEMY;
                    const count = struct.threat >= 2 ? Math.max(1, Math.floor(this._worldRoll('structure-encounter-count', tile.x, tile.y) * 2) + 1) : 1;
                    const enemies = [];
                    for (let i = 0; i < count; i++) {
                        const identity = this._pickEncounterIdentity(this._worldRoll('structure-encounter-identity', tile.x, tile.y, i));
                        const anatomy = this._anatomyForIdentity(identity, this._worldRoll('structure-encounter-anatomy', tile.x, tile.y, i));
                        const creature = {
                            id: `struct_${tile.x}_${tile.y}_${i}`, name: sp.name + (count > 1 ? ' ' + (i + 1) : ''),
                            species: sid, icon: sp.icon, gender: identity,
                            identity, parts: anatomy.parts, chest: anatomy.chest,
                            bodyParts: this.SPECIES_DEFAULT_PARTS[sid] || [], size: this.SPECIES_SIZE[sid] || 4, appetite: Math.floor(this._worldRoll('structure-encounter-appetite', tile.x, tile.y, i) * 4) + 2,
                            level: lvl, MPun: Math.floor(base.MPun * hpMult * (0.7 + lvl * 0.1)), CPun: Math.floor(base.MPun * hpMult * (0.7 + lvl * 0.1)),
                            MPle: base.MPle, CPle: Math.floor(base.MPle * 0.3),
                            Figh: Math.floor(base.Figh * statMult), Feas: Math.floor(base.Feas * statMult),
                            Flir: Math.floor(base.Flir * statMult), Fuck: Math.floor(base.Fuck * statMult),
                            Flee: Math.floor(base.Flee * statMult), Feed: Math.floor(base.Feed * statMult),
                            hunger: Math.floor((base.hunger || 40) * 0.7), str: Math.floor(base.str * statMult), con: Math.floor(base.con * statMult), spd: Math.floor(base.spd * statMult),
                            int: Math.floor(base.int * statMult), wis: Math.floor(base.wis * statMult), cha: Math.floor(base.cha * statMult),
                            tags: [sp.name], stomach: [], womb: [], balls: [], cum: 0, status: {}, disposition: disp,
                            expanded: false, hero: false, ally: false, mc: false, obedient: false, willing: disp === this.DISPOSITION.FRIENDLY,
                            ...this.SPECIES_ABILITIES[sid] || {}
                        };
                        this._applySpeciesCanon(creature);
                        creature.ambushReady = firstEntry && Boolean(this._getSpeciesTemperament(sid).ambush);
                        this._applyTimeOfDayToCreature(creature);
                        enemies.push(creature);
                    }
                    this.creatures = this._tileCreatures([...(this.creatures || []), ...enemies]);
                    tile.creatures = this._tileCreatures(this.creatures);
                    const livingEnemies = this._livingEnemies(enemies);
                    const descIdx = Math.abs(tile.x + tile.y) % struct.descriptions.length;
                    const structDesc = struct.descriptions[descIdx];
                    const ctx = { species: enemies[0].species, mood: struct.disposition, voreEnabled: true, explicit: true };
                    const biomeText = CONTENT.biomeIntro(this.currentBiome || 'forest', ctx);
                    const dispText = disp === this.DISPOSITION.ENEMY ? 'hostile' : (disp === this.DISPOSITION.FRIENDLY ? 'friendly' : 'wary');
                    const encounterText = `You found a ${struct.name}! ${structDesc} ${enemies.length} ${dispText} creature${enemies.length > 1 ? 's' : ''} ${disp === this.DISPOSITION.ENEMY ? 'blocks' : 'inhabits'} the area.`;
                    this.updateScene(`${struct.name} - ${biome.name}`, biomeText + '\n\n' + encounterText, disp === this.DISPOSITION.ENEMY);
                    this.log.push({ text: `Discovered ${struct.name}! ${encounterText}`, type: 'discovery' });
                    if (livingEnemies.length > 0) {
                        this.log.push({ text: `Combat started with ${livingEnemies.map(e => e.name).join(', ')}!`, type: 'combat' });
                        this.startCombat(livingEnemies);
                    } else {
                        this.renderCreatures();
                        this.renderExplorationActions();
                    }
                } else if (merchant || questGiver) {
                    const descIdx = Math.abs(tile.x + tile.y) % struct.descriptions.length;
                    const structDesc = struct.descriptions[descIdx];
                    const visitors = [];
                    if (merchant) visitors.push(`${merchant.name} is trading here`);
                    if (questGiver) visitors.push(`${questGiver.name} has work for you`);
                    const encounterText = `You found a ${struct.name}. ${structDesc} ${visitors.join(', and ')}.`;
                    this.updateScene(`${struct.name} - ${biome.name}`, encounterText, false);
                    this.log.push({ text: encounterText, type: 'discovery' });
                    this.renderCreatures();
                    this.renderExplorationActions();
                } else {
                    // Empty structure
                    const descIdx = Math.abs(tile.x + tile.y) % struct.descriptions.length;
                    const structDesc = struct.descriptions[descIdx];
                    this.log.push({ text: `You found a ${struct.name}. ${structDesc} It seems empty.`, type: 'discovery' });
                    this.showExplorationActions();
                }
            },


            // ===== COMBAT SYSTEM =====
            startCombat(enemies) {
                this._clearTransientInteractionState();
                this._normalizeExplorationSelections({ resetTargets: true });
                this.mode = this.GAME_MODE.COMBAT;
                this.combatState.active = true;
                this.combatState.round = 1;
                this.combatState.syncActions = [];
                this.combatState.xpEarned = 0;
                this.party.forEach(p => this._normalizeUnit(p, { disposition: this.DISPOSITION.PARTY }));
                enemies.forEach(e => this._normalizeUnit(e, { disposition: this.DISPOSITION.ENEMY }));
                const allCombatants = [...this.party, ...enemies];
                this._assignCombatRows(allCombatants);
                this.combatState.turnQueue = allCombatants
                    .filter(c => c.CPun > 0 && !c.knockedOut)
                    .map(c => ({ unit: c, initiative: this._calcInitiative(c) + (c.ambushReady ? this._ambushInitiativeBonus() : 0) }))
                    .sort((a, b) => b.initiative - a.initiative);
                this.combatState.currentTurn = 0;
                const ambushers = enemies.filter(e => e.ambushReady);
                if (ambushers.length > 0) this._pushLog(`${ambushers.map(e => e.name).join(', ')} ambush from hiding!`, 'combat', { phase: 'start' });
                this._pushLog(`Combat! Order: ${this.combatState.turnQueue.map(e => e.unit.name).join(', ')}`, 'combat', { phase: 'start' });
                this.updateScene(`Round 1`, `Combat started!`, true);
                this._emitModuleHook('onEncounterStart', {
                    enemies,
                    party: this.party,
                    round: this.combatState.round,
                    tile: this._currentExplorationTile()
                });
                this.renderParty();
                this.renderCreatures();
                this.renderMobileCombatToolbelt();
                this.processTurn();
            },

            _ambushInitiativeBonus() {
                return Math.max(25, 100 - this._partyRoleEffect('guard', 35, 75));
            },

            _calcInitiative(c) {
                let base = this._effectiveSpeed(c) + this._combatStateRoll('combat-initiative', c, 'jitter') * 10;
                if (c.bodyParts) {
                    for (const bp of c.bodyParts) {
                        const part = this.BODY_PARTS[bp];
                        if (part && part.priority) base += part.priority;
                    }
                }
                if (c.fastFlee) base += 2;
                if (c.cum >= 20) base -= 5;
                const stomachSize = (c.stomach?.length || 0) + (c.womb?.length || 0) + (c.balls?.length || 0);
                if (stomachSize >= 3) base -= 2;
                if (stomachSize >= 6) base -= 4;
                return Math.max(1, base);
            },

            _syncActionLabel(type) {
                const action = { sync_fight: 'fight', sync_flirt: 'flirt', sync_fuck: 'fuck', sync_feed: 'feed' }[type];
                return action ? this._uiLabel(action) : this._label('combat.group', 'Group');
            },

            _pendingSyncForUnit(unit) {
                if (!this.combatState.active || !unit) return null;
                return (this.combatState.syncActions || []).find(sync =>
                    !sync.resolved &&
                    sync.round === this.combatState.round &&
                    (sync.participants.includes(unit) || sync.target === unit)
                ) || null;
            },

            _turnOrderInfo(unit) {
                if (!this.combatState.active || !unit) return null;
                const queue = this.combatState.turnQueue || [];
                const queueIndex = queue.findIndex(entry => entry.unit === unit);
                const sync = this._pendingSyncForUnit(unit);
                return {
                    order: queueIndex >= 0 ? queueIndex + 1 : null,
                    current: queueIndex === this.combatState.currentTurn,
                    acted: queueIndex >= 0 && Boolean(queue[queueIndex].actedThisRound),
                    sync,
                    syncOrder: sync ? sync.resolveAtIndex + 1 : null,
                    syncRole: sync ? (sync.participants.includes(unit) ? 'Group' : 'Target') : null
                };
            },

            _turnOrderBadge(unit) {
                const info = this._turnOrderInfo(unit);
                if (!info || (!info.order && !info.syncOrder)) return '';
                const base = info.current ? `Now #${info.order}` : (info.order ? `#${info.order}` : '');
                const acted = info.acted && !info.current ? ' Done' : '';
                const sync = info.sync ? ` ${info.syncRole} ${this._syncActionLabel(info.sync.type)} #${info.syncOrder}` : '';
                const bg = info.current ? 'var(--accent-primary)' : (info.sync ? 'var(--accent-warning)' : 'var(--bg-tertiary)');
                const color = info.current || info.sync ? 'var(--bg-primary)' : 'var(--text-secondary)';
                const turnOrderLabel = this._escapeHtml(this._label('combat.turnOrder', 'Turn order'));
                return `<span class="turn-order-badge" title="${turnOrderLabel}" aria-label="${turnOrderLabel} ${this._escapeHtml(base + sync)}" style="font-size:10px;font-weight:800;background:${bg};color:${color};border:1px solid var(--border-default);border-radius:6px;padding:2px 5px;margin-left:4px;white-space:nowrap;">${base}${acted}${sync}</span>`;
            },

            _srOnly(text, attrs = '') {
                return YAW_UI_TEXT.srOnly(this, text, attrs);
            },

            _combatStatusText(unit) {
                if (!this.combatState.active || !unit) return '';
                const bits = [];
                const info = this._turnOrderInfo(unit);
                if (info?.current) {
                    bits.push(this._label('combat.status.current', '{name} is the current combat actor at turn {order}.', { name: unit.name, order: info.order }));
                } else if (info?.order) {
                    bits.push(this._label(
                        info.acted ? 'combat.status.queuedActed' : 'combat.status.queued',
                        info.acted ? '{name} is queued at turn {order} and has already acted this round.' : '{name} is queued at turn {order}.',
                        { name: unit.name, order: info.order }
                    ));
                }
                if (info?.sync) {
                    const key = info.syncRole === 'Target' ? 'combat.status.syncTarget' : 'combat.status.syncParticipant';
                    const fallback = info.syncRole === 'Target'
                        ? '{name} is target of queued group {action} resolving at turn {order}.'
                        : '{name} is participant in queued group {action} resolving at turn {order}.';
                    bits.push(this._label(key, fallback, { name: unit.name, action: this._syncActionLabel(info.sync.type), order: info.syncOrder }));
                }
                if (this.targetSelection && !this._isCorpse(unit)) {
                    const action = this.targetSelection.action || 'action';
                    if (!this.party.includes(unit)) {
                        bits.push(this.canSelectCreatureTarget(unit)
                            ? this._label('combat.status.canTarget', '{name} can be selected as the {action} target.', { name: unit.name, action })
                            : this._label('combat.status.cannotTarget', '{name} cannot be selected as the {action} target.', { name: unit.name, action }));
                    } else {
                        const actor = this.activeActor || this.player;
                        if (actor === unit) bits.push(this._label('combat.status.choosingTarget', '{name} is choosing a {action} target.', { name: unit.name, action }));
                    }
                }
                return bits.join(' ');
            },

            _currentBiomeId() {
                return YAW_COMBAT_RULES.currentBiomeId(this);
            },

            _isDenseForestBiome(biomeId = this._currentBiomeId()) {
                return YAW_COMBAT_RULES.isDenseForestBiome(biomeId);
            },

            _terrainSpeedModifier(unit, biomeId = this._currentBiomeId()) {
                return YAW_COMBAT_RULES.terrainSpeedModifier(this, unit, biomeId);
            },

            _terrainConModifier(unit, biomeId = this._currentBiomeId()) {
                return YAW_COMBAT_RULES.terrainConModifier(this, unit, biomeId);
            },

            _effectiveSpeed(unit) {
                return YAW_COMBAT_RULES.effectiveSpeed(this, unit);
            },

            _effectiveCon(unit) {
                return YAW_COMBAT_RULES.effectiveCon(this, unit);
            },

            _safeRatio(current, max, fallback = 0) {
                return YAW_COMBAT_RULES.safeRatio(current, max, fallback);
            },

            _defaultCombatRow(unit) {
                return YAW_COMBAT_RULES.defaultCombatRow(unit);
            },

            _assignCombatRows(units) {
                return YAW_COMBAT_RULES.assignCombatRows(this, units);
            },

            _isPhysicalCombatAction(action) {
                return YAW_COMBAT_RULES.isPhysicalCombatAction(action);
            },

            _canReachCombatTarget(actor, target, action = 'fight') {
                return YAW_COMBAT_RULES.canReachCombatTarget(this, actor, target, action);
            },

            _terrainCausesMiss(actor, target, action = 'fight') {
                return YAW_COMBAT_RULES.terrainCausesMiss(this, actor, target, action);
            },

            _applyTerrainRoundEffects(living) {
                return YAW_COMBAT_RULES.applyTerrainRoundEffects(this, living);
            },

            _physicalDamageMultiplier(actor, target) {
                return YAW_COMBAT_RULES.physicalDamageMultiplier(this, actor, target);
            },
            _actionRatingFromRoll(entry, roll) {
                return YAW_ACTION_RULES.actionRatingFromRoll(entry, roll);
            },
            _combatActionRating(entry, actor, target = null, purpose = 'rating') {
                return YAW_ACTION_RULES.combatActionRating(this, entry, actor, target, purpose);
            },
            _combatDamageVariance(actor, target, purpose = 'fight', scale = 6) {
                return YAW_ACTION_RULES.combatDamageVariance(this, actor, target, purpose, scale);
            },
            _explorationActionRoll(namespace, actor, target = null, purpose = 'roll') {
                return YAW_ACTION_RULES.explorationActionRoll(this, namespace, actor, target, purpose);
            },
            _explorationActionRating(entry, actor, target = null, purpose = 'rating') {
                return YAW_ACTION_RULES.explorationActionRating(this, entry, actor, target, purpose);
            },
            _explorationDamageVariance(actor, target = null, purpose = 'fight', scale = 6) {
                return YAW_ACTION_RULES.explorationDamageVariance(this, actor, target, purpose, scale);
            },
            _targetDodgeRoll(actor, target, action = 'fight') {
                return YAW_ACTION_RULES.targetDodgeRoll(this, actor, target, action);
            },

            _wakeOnDamage(unit) {
                return YAW_COMBAT_STATUS.wakeOnDamage(this, unit);
            },

            _skipTurnFromStatus(unit) {
                return YAW_COMBAT_STATUS.skipTurnFromStatus(this, unit);
            },

            _applyAttackStatus(actor, target, dmg) {
                return YAW_COMBAT_STATUS.applyAttackStatus(this, actor, target, dmg);
            },

            _charmedTargetsFor(unit) {
                return YAW_COMBAT_STATUS.charmedTargetsFor(this, unit);
            },

            moveCombatRow() {
                return YAW_COMBAT_MOBILITY.moveRow(this);
            },

            processTurn() {
                return YAW_COMBAT_TURNS.processTurn(this);
            },

            _newRound() {
                return YAW_COMBAT_TURNS.newRound(this);
            },

            _processStatusEffects() {
                return YAW_COMBAT_STATUS.processStatusEffects(this);
            },
            _absorbStats(unit, dmg, stats) {
                if (!this.settings.statAbsorption) return;
                unit._absorbRemainder = (unit._absorbRemainder || 0) + dmg * 0.1;
                const absorb = Math.floor(unit._absorbRemainder);
                if (absorb <= 0) return;
                unit._absorbRemainder -= absorb;
                for (const stat of stats) {
                    unit[stat] = (unit[stat] || 10) + absorb;
                }
            },

            _processDigestion() {
                const all = [...this.party, ...this.creatures];
                for (const unit of all) {
                    this._processStomachState(unit);
                    // Lactation cooldown decrement
                    if (unit.lactationCooldown > 0) {
                        unit.lactationCooldown--;
                    }
                }
            },

            showPlayerActions() {
                this.showActorActions(this.player);
            },

            showActorActions(actor) {
                return YAW_COMBAT_ACTIONS.showActorActions(this, actor);
            },

            _combatTurnTitle(unit = null) {
                return YAW_COMBAT_SCENE.turnTitle(this, unit);
            },
            _combatTurnDescription(unit = null) {
                return YAW_COMBAT_SCENE.turnDescription(this, unit);
            },
            _recentCombatExchangeEntries(limit = 3) {
                return YAW_COMBAT_SCENE.recentExchangeEntries(this, limit);
            },
            _combatSceneHtml(unit = null) {
                return YAW_COMBAT_SCENE.sceneHtml(this, unit);
            },
            renderCombatSceneForTurn(unit = null) {
                return YAW_COMBAT_SCENE.renderForTurn(this, unit);
            },

            // ===== ACTION TARGETING =====
            selectTarget(action) {
                return YAW_COMBAT_TARGETING.selectTarget(this, action);
            },

            cancelTargetSelection() {
                return YAW_COMBAT_TARGETING.cancelTargetSelection(this);
            },

            canSelectCreatureTarget(unit) {
                return YAW_COMBAT_TARGETING.canSelectCreatureTarget(this, unit);
            },

            _syncBaseAction(syncType) {
                return YAW_COMBAT_TARGETING.syncBaseAction(syncType);
            },

            _canSyncTarget(participants, target, syncType = 'sync_fight') {
                return YAW_COMBAT_TARGETING.canSyncTarget(this, participants, target, syncType);
            },

            executeActionOnTarget(action, targetId) {
                return YAW_COMBAT_TARGETING.executeActionOnTarget(this, action, targetId);
            },

            executeAction(action, creatureIndex) {
                return YAW_COMBAT_TARGETING.executeAction(this, action, creatureIndex);
            },

            // ===== SYNCHRONIZED ACTIONS =====
            showSyncMenu() {
                return YAW_COMBAT_SYNC.showMenu(this);
            },

            selectSyncParticipants(syncType) {
                return YAW_COMBAT_SYNC.selectParticipants(this, syncType);
            },

            toggleSyncParticipant(idx) {
                return YAW_COMBAT_SYNC.toggleParticipant(this, idx);
            },

            confirmSyncParticipants(syncType) {
                return YAW_COMBAT_SYNC.confirmParticipants(this, syncType);
            },

            queueSyncAction(syncType, targetIndex) {
                return YAW_COMBAT_SYNC.queueAction(this, syncType, targetIndex);
            },

            _resolveCombatAction(command) {
                const actor = command?.actors?.[0] || this.activeActor || this._currentCombatActor() || this.player;
                const target = command?.targets?.[0] || null;
                this.targetSelection = null;
                this.renderMobileCombatToolbelt();
                return this.executeActionAgainstTarget(command.action, actor, target);
            },

            executeActionAgainstTarget(action, actor, target) {
                this.combatState.processing = true;
                try {
                    if (!target || target.CPun <= 0 || !actor) { this.combatState.processing = false; this.nextTurn(); return false; }
                    const actorName = actor.name === this.player?.name ? 'You' : actor.name;
                    const actorVerb = actor.name === this.player?.name ? '' : 's';
                    let result = '';
                    switch (action) {
                    case 'fight': {
                        if (this._terrainCausesMiss(actor, target, action)) {
                            result = `${actorName} miss${actorVerb} ${target.name}.`;
                            break;
                        }
                        const ar = this._combatActionRating(actor.Figh, actor, target, 'player-fight');
                        const def = this._effectiveCon(target);
                        const baseDmg = Math.max(1, ar - def * 0.3 + this._combatDamageVariance(actor, target, 'player-fight'));
                        const dmg = Math.max(1, Math.floor(baseDmg * this._physicalDamageMultiplier(actor, target)));
                        target.CPun -= dmg;
                        this._wakeOnDamage(target);
                        this._applyAttackStatus(actor, target, dmg);
                        result = `${actorName} hit${actorVerb} ${target.name} for ${dmg} punishment!`;
                        if (target.CPun <= 0) {
                            result += ` ${target.name} collapses!`;
                            this._awardCombatXP(this.XP_REWARDS.defeatEnemy);
                            if (this.settings.endoMode) { target.CPun = 1; target.disposition = this.DISPOSITION.FRIENDLY; }
                            else this._makeCorpse(target, 'fight');
                        }
                        break;
                    }
                    case 'flirt': {
                        let charm = this._AR(actor.Flir + (actor.cha || 10) * 0.5);
                        if (this.settings.sameSpeciesBonus && target.species === actor.species) {
                            charm += 3;
                        }
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        if (charm > resist) {
                            const oldPle = target.CPle;
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.3));
                            target.charmed = (target.charmed || 0) + 1;
                            target.Figh = Math.max(1, (target.Figh || 10) - 1);
                            result = `${actorName} flirt${actorVerb} with ${target.name}! Their guard lowers. Pleasure rises to ${target.CPle}/${target.MPle}.`;
                            if (target.charmed >= 3) {
                                result += ` ${target.name} is utterly charmed and becomes friendly!`;
                                target.disposition = this.DISPOSITION.FRIENDLY;
                                target.willing = true;
                                this._awardCombatXP(this.XP_REWARDS.flirtEnemy);
                            } else if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                                result += ` ${target.name} is aroused and submits!`;
                                target.disposition = this.DISPOSITION.FRIENDLY;
                                target.willing = true;
                                target.orgasmed = true;
                                this._awardCombatXP(this.XP_REWARDS.flirtEnemy);
                            }
                        } else {
                            result = `${target.name} rebuffs ${actorName}'s flirtation!`;
                        }
                        break;
                    }
                    case 'fuck': {
                        let charm = this._AR(actor.Fuck + actor.Flir);
                        // Same-species attraction bonus
                        if (this.settings.sameSpeciesBonus && target.species === actor.species) {
                            charm += 5;
                        }
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        if (charm > resist) {
                            const oldPle = target.CPle;
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                            result = `${actorName} seduce${actorVerb} ${target.name}! Pleasure rises to ${target.CPle}/${target.MPle}.`;
                            // Orgasm threshold at 80%
                            if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                                result += ` ${target.name} orgasms, becoming dazed and submissive!`;
	                                target.disposition = this.DISPOSITION.FRIENDLY;
	                                target.willing = true;
	                                target.orgasmed = true;
	                                this._awardCombatXP(this.XP_REWARDS.seduceEnemy);
                                // Refractory period: skip next turn if enabled
                                if (this.settings.refractoryPeriod) {
                                    target.refractory = true;
                                    result += ` They need a moment to recover...`;
                                }
                                // Offer recruitment if not in auto-AI mode
                                if (actor.name === this.player?.name) {
                                    setTimeout(() => {
                                        this._confirmRecruitCreature(target);
                                    }, 100);
                                }
                            }
                        } else {
                            result = `${target.name} resists your advances!`;
                        }
                        break;
                    }
                    case 'feed': {
                        // Feed action: nourish a wounded ally (not an enemy in combat, so this shouldn't be reached via targetSelection)
                        // But if called, attempt to use items or heal self
                        const healAmount = Math.floor((actor.Feed || 10) * 2);
                        actor.CPun = Math.min(actor.MPun, actor.CPun + healAmount);
                        actor.hunger = Math.max(0, (actor.hunger || 0) - 25);
                        result = `${actorName} nourish${actorVerb} themself, restoring ${healAmount} punishment and sating hunger.`;
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        break;
                    }
                    case 'feast': {
                        const subId = this._getDefaultSubAction('feast');
                        result = this._doSubAction('feast', subId, actor, target, actorName, actorVerb);
                        this._emitSubAction('feast', subId, actor, target, result);
                        break;
	                    }
                    }
                    this._pushLog(result, 'combat', { actor, targetId: target.id || target.name, targetName: target.name, action, phase: 'action' });
                    this._emitCombatAction(action, actor, target, result);
                    this.renderCombatSceneForTurn(actor);
                    this.renderLog();
                    this.renderCreatures();
                    this.renderParty();
                    this._syncCurrentTileCreatures();
                    this._sanitizeCombatState({ preserveTurn: true });
                    this.autoSave();
                    this.nextTurn();
                    return true;
                } catch (e) {
                    console.error('Combat action failed:', e);
                    this._pushLog(this._label('combat.actionFailed', 'Combat action failed. Try another action.'), 'combat', { actor, targetId: target?.id || target?.name, targetName: target?.name, action, phase: 'error' });
                    this.renderLog();
                    this.renderCreatures();
                    this.renderParty();
                    return false;
                } finally {
                    if (this.combatState) this.combatState.processing = false;
                }
            },

            // ===== SUB-ACTION ENGINE =====
            _doSubAction(action, subId, actor, target, actorName, actorVerb) {
                const subDef = this.SUB_ACTIONS[action] && this.SUB_ACTIONS[action][subId];
                if (!subDef) return `[Unknown sub-action ${action}.${subId}]`;
                let result = '';
                switch (action + '.' + subId) {
                    case 'feast.swallow': {
                        const canEat = this.cheats.canEatAnything || target.CPun <= target.MPun * 0.3 || (actor.Feas > target.Flee && actor.size >= target.size - 2);
                        if (!canEat) { result = `${target.name} is too strong or too big to consume!`; break; }
                        if (!this._canFitPrey(actor, target, 'stomach')) { result = this._capacityFailureMessage(actor, target, 'stomach'); break; }
                        this._containTargetIn(actor, target, 'stomach');
                        actor.CPun = Math.min(actor.MPun, actor.CPun + 20);
                        actor.Feas += 1;
                        this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                        this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                        result = `${actorName} devour${actorVerb} ${target.name}! They settle in ${actor.name === this.player?.name ? 'your' : actor.name + "'s"} stomach.`;
                        break;
                    }
                    case 'feast.chew': {
                        const canChew = this.cheats.canEatAnything || target.CPun <= target.MPun * 0.3 || (actor.Feas > target.Flee && actor.size >= target.size - 2);
                        if (!canChew) { result = `${target.name} is too strong or too big to chew!`; break; }
                        target.alive = false; target.CPun = 0; target.CPle = 0;
                        actor.CPun = Math.min(actor.MPun, actor.CPun + 30);
                        actor.Feas += 2;
                        this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                        this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                        result = `${actorName} tear${actorVerb} into ${target.name} with savage teeth, chewing them apart!`;
                        break;
                    }
                    case 'feast.cockVore': {
                        if (!actor.parts || actor.parts !== 'cock') { result = `${actorName} lack${actorVerb} the anatomy for that.`; break; }
                        const canCV = this.cheats.canEatAnything || target.CPun <= target.MPun * 0.3 || (actor.Feas > target.Flee && actor.size >= target.size - 2);
                        if (!canCV) { result = `${target.name} is too strong or too big!`; break; }
                        if (!this._canFitPrey(actor, target, 'balls')) { result = this._capacityFailureMessage(actor, target, 'balls'); break; }
                        this._containTargetIn(actor, target, 'balls', { inCock: true });
                        actor.CPun = Math.min(actor.MPun, actor.CPun + 15);
                        actor.cum = (actor.cum || 0) + 1;
                        this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                        result = `${actorName} pull${actorVerb} ${target.name} into their cock, stuffing them into swollen balls.`;
                        break;
                    }
                    case 'feast.unbirth': {
                        if (!actor.parts || actor.parts !== 'clit') { result = `${actorName} lack${actorVerb} the anatomy for that.`; break; }
                        const canUB = this.cheats.canEatAnything || target.CPun <= target.MPun * 0.3 || (actor.Feas > target.Flee && actor.size >= target.size - 2);
                        if (!canUB) { result = `${target.name} is too strong or too big!`; break; }
                        if (!this._canFitPrey(actor, target, 'womb')) { result = this._capacityFailureMessage(actor, target, 'womb'); break; }
                        this._containTargetIn(actor, target, 'womb', { inWomb: true });
                        actor.CPun = Math.min(actor.MPun, actor.CPun + 15);
                        this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                        result = `${actorName} draw${actorVerb} ${target.name} into their womb, warm walls closing around them.`;
                        break;
                    }
                    case 'feast.digest': {
                        const livingStomach = (actor.stomach || []).filter(p => p.alive && p.inStomach);
                        if (livingStomach.length === 0) { result = `${actorName} have no living prey in their stomach.`; break; }
                        const prey = livingStomach[0];
                        prey.digestionProgress = 100; prey.alive = false;
                        this._absorbStats(actor, 10, ['str', 'con', 'Figh']);
                        result = `${actorName} actively digest ${prey.name}, absorbing their essence completely.`;
                        break;
                    }
                    case 'feast.release': {
                        const livingStomach = (actor.stomach || []).filter(p => p.alive && p.inStomach);
                        if (livingStomach.length === 0) { result = `${actorName} have no living prey to release.`; break; }
                        const prey = livingStomach[0];
                        const idx = actor.stomach.indexOf(prey);
                        if (idx >= 0) actor.stomach.splice(idx, 1);
                        prey.inStomach = false;
                        prey.CPun = Math.max(1, Math.floor(prey.MPun * (prey.digestionProgress / 100)));
                        prey.CPle = 0;
                        prey.status = prey.status || {};
                        if (this.creatures.indexOf(prey) === -1) this.creatures.push(prey);
                        result = `${actorName} release ${prey.name} from their stomach, weak and dazed but alive.`;
                        break;
                    }
                    case 'feed.heal': {
                        const healAmount = Math.floor((actor.Feed || 10) * 2);
                        target.CPun = Math.min(target.MPun, target.CPun + healAmount);
                        target.hunger = Math.max(0, (target.hunger || 0) - 25);
                        if (target.CPle < target.MPle * 0.5) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(healAmount * 0.5));
                        }
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = `${actorName} feed${actorVerb} ${target.name}, restoring ${healAmount} punishment and sating their hunger.`;
                        break;
                    }
                    case 'feed.breastfeed': {
                        if (!actor.lactating) { result = `${actorName} are not lactating.`; break; }
                        if (actor.lactationCooldown > 0) { result = `${actorName}'s milk is not ready yet.`; break; }
                        const milkAmount = Math.floor((actor.Feed || 10) * 3);
                        target.CPun = Math.min(target.MPun, target.CPun + milkAmount);
                        target.CPle = Math.min(target.MPle, target.CPle + Math.floor(milkAmount * 0.3));
                        target.hunger = Math.max(0, (target.hunger || 0) - 40);
                        actor.lactationCooldown = 3;
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = `${actorName} breastfeed${actorVerb} ${target.name}, warm milk flowing as pleasure and vitality return.`;
                        break;
                    }
                    case 'feed.sacrifice': {
                        const isWilling = target.livestock || target.willingPrey;
                        if (!isWilling && !this.cheats.canEatAnything) { result = `${target.name} refuses to be fed to ${actorName}.`; break; }
                        if (actor.size < target.size - 2) { result = `${actor.name} is too small to swallow ${target.name}.`; break; }
                        if (!this._canFitPrey(actor, target, 'stomach')) { result = this._capacityFailureMessage(actor, target, 'stomach'); break; }
                        this._containTargetIn(actor, target, 'stomach', { willingSacrifice: true });
                        this._awardCombatXP(this.XP_REWARDS.feedEnemy);
                        result = `${target.name} willingly feeds themself to ${actorName}, sliding down into warmth.`;
                        break;
                    }
                    case 'feed.forceFeed': {
                        const holders = this.party.filter(p => p !== actor && p !== target && p.CPun > 0);
                        if (holders.length === 0 && this.creatures.filter(c => c.CPun > 0 && c !== target && c !== actor).length === 0) {
                            result = `No one available to hold ${target.name} down.`; break;
                        }
                        const holder = holders[0] || this.creatures.filter(c => c.CPun > 0 && c !== target && c !== actor)[0];
                        if (actor.size < target.size - 2) { result = `${actor.name} is too small to swallow ${target.name}.`; break; }
                        if (!this._canFitPrey(actor, target, 'stomach')) { result = this._capacityFailureMessage(actor, target, 'stomach'); break; }
                        this._containTargetIn(actor, target, 'stomach', { forcedFed: true, by: actor.name });
                        target.forcedFed = true;
                        actor.forcedFed = true;
                        this._awardCombatXP(this.XP_REWARDS.feedEnemy);
                        result = `${holder.name} holds ${target.name} down while ${actorName} force-feeds them, stuffing them into their stomach against their will.`;
                        break;
                    }
                    case 'feed.slurp': {
                        if (!target.slurpable) { result = `${target.name} is not slurpable.`; break; }
                        const slurpAmount = Math.floor((actor.Feed || 10) * 1.5);
                        target.CPun = Math.max(1, target.CPun - slurpAmount);
                        target.CPle = Math.min(target.MPle, target.CPle + Math.floor(slurpAmount * 0.2));
                        actor.CPun = Math.min(actor.MPun, actor.CPun + slurpAmount);
                        actor.hunger = Math.max(0, (actor.hunger || 0) - 20);
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = `${actorName} slurp${actorVerb} a portion of ${target.name}, drawing their essence while leaving them alive.`;
                        break;
                    }
                    case 'feed.fragment': {
                        if (!target.breakable) { result = `${target.name} is not breakable.`; break; }
                        const fragAmount = Math.floor((actor.Feed || 10) * 1.5);
                        target.CPun = Math.max(1, target.CPun - fragAmount);
                        target.str = Math.max(1, (target.str || 10) - 1);
                        target.con = Math.max(1, (target.con || 10) - 1);
                        actor.CPun = Math.min(actor.MPun, actor.CPun + fragAmount);
                        actor.hunger = Math.max(0, (actor.hunger || 0) - 20);
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = `${actorName} break${actorVerb} off a piece of ${target.name}, consuming it as nourishment. ${target.name} is diminished but regenerates over time.`;
                        break;
                    }
                    default: {
                        result = `[Sub-action ${action}.${subId} not yet implemented]`;
                        break;
                    }
                }
                return result;
            },
            _createStomachPrey(target, extra = {}) {
                return YAW_UNIT_CONTAINMENT.createPrey(this, target, extra);
            },
            _emptyStatDrain() {
                return YAW_UNIT_CONTAINMENT.emptyStatDrain();
            },
            _ensureStatDrain(prey) {
                return YAW_UNIT_CONTAINMENT.ensureStatDrain(prey);
            },
            _digestionContainerConfigs() {
                return YAW_UNIT_CONTAINMENT.containerConfigs();
            },
            _processDigestionContainer(unit, config) {
                return YAW_UNIT_CONTAINMENT.processContainer(this, unit, config);
            },
            _processStomachState(unit) {
                return YAW_UNIT_CONTAINMENT.process(this, unit);
            },

            // ===== MODDING API =====
            registerSubAction(action, subId, config) {
                if (!this.SUB_ACTIONS[action]) this.SUB_ACTIONS[action] = {};
                this.SUB_ACTIONS[action][subId] = {
                    label: config.label || subId,
                    sfwLabel: config.sfwLabel || config.label || subId,
                    icon: config.icon || '❓',
                    validate: config.validate || (() => true),
                    execute: config.execute || (() => {}),
                    setting: config.setting || null
                };
                if (config.defaultForAction) {
                    this.defaultSubActions[action] = subId;
                }
            },
            _emitSubAction(action, subId, actor, target, result) {
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
                    MODULE_SYSTEM.executeHook('onSubActionExecute', { action, subId, actor, target, result, app: this }).catch(() => {});
                }
            },

            _resolveSyncAction(sync) {
                if (sync.resolved) return;
                sync.resolved = true;
                // Check if any participant incapacitated
                const incapacitated = (sync.participants || []).filter(p => !p || p.CPun <= 0 || p.knockedOut || p.fledCombat);
                if (incapacitated.length > 0) {
                    this.log.push({ text: this._label('combat.sync.failedIncapacitated', 'Sync failed! {names} cannot participate.', { names: incapacitated.map(p => p?.name || 'Unknown').join(', ') }), type: 'combat' });
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                sync.participants = (sync.participants || []).filter(unit => this._isCombatQueueUnitValid(unit) && this.party.includes(unit));
                if (!sync.target || !this._isCombatQueueUnitValid(sync.target) || sync.participants.length < 2) {
                    this.log.push({ text: this._label('combat.sync.failedInvalid', 'Sync failed! The target or participants are no longer available.'), type: 'combat' });
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                if (sync.target.CPun <= 0) {
                    this.log.push({ text: `Sync target ${sync.target.name} is already defeated!`, type: 'combat' });
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                let result = '';
                switch (sync.type) {
                    case 'sync_fuck': {
                        let totalCharm = sync.participants.reduce((sum, p) => sum + (p.Fuck || 0) + (p.Flir || 0), 0);
                        if (this.settings.sameSpeciesBonus) {
                            const speciesMatch = sync.participants.filter(p => p.species === sync.target.species).length;
                            totalCharm += speciesMatch * 5;
                        }
                        const resist = (sync.target.wis || 10) + (this._safeRatio(sync.target.CPle, sync.target.MPle) * 10);
                        const oldPle = sync.target.CPle;
                        if (totalCharm > resist * 1.5) {
	                            sync.target.CPle = sync.target.MPle;
	                            sync.target.disposition = this.DISPOSITION.FRIENDLY;
	                            sync.target.willing = true;
	                            sync.target.orgasmed = true;
	                            this._awardCombatXP(this.XP_REWARDS.seduceEnemy);
                            result = `${sync.participants.map(p => p.name).join(' and ')} overwhelm ${sync.target.name} with pleasure! They submit completely.`;
                            if (this.settings.refractoryPeriod) {
                                sync.target.refractory = true;
                                result += ` They are spent and need recovery...`;
                            }
                            // Offer recruitment
                            setTimeout(() => {
                                this._confirmRecruitCreature(sync.target);
                            }, 100);
                        } else if (totalCharm > resist) {
                            sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.3));
                            result = `${sync.participants.map(p => p.name).join(' and ')} pleasure ${sync.target.name}! They are dazed but not fully broken.`;
                            if (sync.target.CPle >= sync.target.MPle * 0.8 && oldPle < sync.target.MPle * 0.8) {
                                result += ` ${sync.target.name} orgasms!`;
                                sync.target.orgasmed = true;
                                if (this.settings.refractoryPeriod) sync.target.refractory = true;
                            }
                        } else {
                            result = `${sync.target.name} resists the combined advances!`;
                        }
                        break;
                    }
                    case 'sync_flirt': {
                        let totalCharm = sync.participants.reduce((sum, p) => sum + (p.Flir || 0) + (p.cha || 10) * 0.5, 0);
                        if (this.settings.sameSpeciesBonus) {
                            const speciesMatch = sync.participants.filter(p => p.species === sync.target.species).length;
                            totalCharm += speciesMatch * 3;
                        }
                        const resist = (sync.target.wis || 10) + (this._safeRatio(sync.target.CPle, sync.target.MPle) * 10);
                        if (totalCharm > resist * 1.2) {
                            sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.4));
                            sync.target.charmed = (sync.target.charmed || 0) + 2;
                            sync.target.Figh = Math.max(1, (sync.target.Figh || 10) - 2);
                            sync.target.disposition = this.DISPOSITION.FRIENDLY;
                            sync.target.willing = true;
                            this._awardCombatXP(this.XP_REWARDS.flirtEnemy);
                            result = `${sync.participants.map(p => p.name).join(' and ')} charm ${sync.target.name} into submission! They are utterly captivated.`;
                        } else if (totalCharm > resist) {
                            sync.target.CPle = Math.min(sync.target.MPle, sync.target.CPle + Math.floor(totalCharm * 0.3));
                            sync.target.charmed = (sync.target.charmed || 0) + 1;
                            sync.target.Figh = Math.max(1, (sync.target.Figh || 10) - 1);
                            result = `${sync.participants.map(p => p.name).join(' and ')} flirt with ${sync.target.name}, softening their guard. Pleasure rises to ${sync.target.CPle}/${sync.target.MPle}.`;
                        } else {
                            result = `${sync.target.name} resists the group's combined charm!`;
                        }
                        break;
                    }
                    case 'sync_fight': {
                        const totalStr = sync.participants.reduce((sum, p) => sum + (p.Figh || 0), 0);
                        const def = this._effectiveCon(sync.target);
                        const dmg = Math.max(1, Math.floor(totalStr - def * 0.5 + this._combatDamageVariance(sync.participants[0], sync.target, `sync-fight:${sync.participants.map(p => this._unitSelectionId(p)).join('|')}`, 10)));
                        sync.target.CPun -= dmg;
                        result = `${sync.participants.map(p => p.name).join(' and ')} gang up on ${sync.target.name}, dealing ${dmg} punishment!`;
                        if (sync.target.CPun <= 0) {
                            result += ` ${sync.target.name} is overwhelmed and collapses!`;
                            this._awardCombatXP(this.XP_REWARDS.defeatEnemy);
                            if (this.settings.endoMode) { sync.target.CPun = 1; sync.target.disposition = this.DISPOSITION.FRIENDLY; }
                            else this._makeCorpse(sync.target, 'fight');
                        }
                        break;
                    }
                    case 'sync_feed': {
                        const totalFeas = sync.participants.reduce((sum, p) => sum + (p.Feas || 0), 0);
                        const canEat = sync.target.CPun <= sync.target.MPun * 0.3 || totalFeas > sync.target.Flee + 5;
                        if (canEat) {
                            const eater = sync.participants[0];
                            if (!this._canFitPrey(eater, sync.target, 'stomach')) {
                                result = this._capacityFailureMessage(eater, sync.target, 'stomach');
                                break;
                            }
                            this._containTargetIn(eater, sync.target, 'stomach');
                            this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                            result = `${sync.participants.map(p => p.name).join(' and ')} force ${sync.target.name} into ${eater.name}'s stomach!`;
                        } else {
                            result = `${sync.target.name} is too strong to be force-fed!`;
                        }
                        break;
                    }
                }
                this.log.push({ text: result, type: 'combat' });
                this._emitCombatAction(sync.type, sync.participants, sync.target, result);
                this.renderLog();
                this.renderCreatures();
                this.renderParty();
                this.nextTurn();
            },

            // ===== ALLY TURN AI =====
            _getPartyAIOrder(unit) {
                return YAW_PARTY_MANAGEMENT.getAIOrder(this, unit);
            },
            _getPartyRole(unit) {
                return YAW_PARTY_MANAGEMENT.getRole(this, unit);
            },
            _partyAIOrderLabel(order) {
                return YAW_PARTY_MANAGEMENT.aiOrderLabel(this, order);
            },
            _partyRoleLabel(role) {
                return YAW_PARTY_MANAGEMENT.roleLabel(this, role);
            },
            _partyAIOrderDescription(order) {
                return YAW_PARTY_MANAGEMENT.aiOrderDescription(this, order);
            },
            _partyRoleDescription(role) {
                return YAW_PARTY_MANAGEMENT.roleDescription(this, role);
            },
            setPartyAIOrder(index, order) {
                return YAW_PARTY_MANAGEMENT.setAIOrder(this, index, order);
            },
            setPartyRole(index, role) {
                return YAW_PARTY_MANAGEMENT.setRole(this, index, role);
            },
            _allyHealWounded(ally) {
                const wounded = this.party
                    .filter(p => p.CPun > 0 && p.CPun < p.MPun && p !== ally)
                    .sort((a, b) => (a.CPun / a.MPun) - (b.CPun / b.MPun))[0];
                if (!wounded || wounded.CPun / wounded.MPun > 0.7) return false;
                const { actorName, actorVerb } = this._actorNameAndVerb(ally);
                const result = this._doSubAction('feed', 'heal', ally, wounded, actorName, actorVerb);
                this.log.push({ text: result, type: 'heal' });
                this._emitCombatAction('ally_feed', ally, wounded, result);
                this.renderLog();
                this.renderParty();
                this.nextTurn();
                return true;
            },
            _selectAllyAttackTarget(ally, enemies) {
                const order = this._getPartyAIOrder(ally);
                if (order === 'defensive' && this.player && this.player.CPun / this.player.MPun < 0.6) {
                    return enemies.reduce((best, enemy) => (enemy.Figh || 0) > (best.Figh || 0) ? enemy : best, enemies[0]);
                }
                return enemies.reduce((w, e) => (e.CPun / e.MPun < w.CPun / w.MPun) ? e : w, enemies[0]);
            },
            _runPostCombatScavengers() {
                const scavengers = this.party.filter(p => p.CPun > 0 && this._getPartyAIOrder(p) === 'scavenger');
                if (scavengers.length === 0) return;
                for (const ally of scavengers) {
                    const corpse = this.creatures.find(c => this._isCorpse(c) && this._canFitPrey(ally, c, 'stomach'));
                    if (!corpse) continue;
                    if (!ally.stomach) ally.stomach = [];
                    ally.stomach.push({
                        name: corpse.name, species: corpse.species, size: corpse.size || 1,
                        alive: false, inStomach: true, digestionState: 'digested', digestionProgress: 100
                    });
                    ally.hunger = Math.max(0, (ally.hunger || 0) - 30);
                    this.creatures = this.creatures.filter(c => c !== corpse);
                    this.log.push({ text: this._label('combat.allyScavenges', "{ally} scavenges {target}'s remains after the fight.", {
                        ally: ally.name,
                        target: corpse.name
                    }), type: 'discovery' });
                }
                this._syncCurrentTileCreatures();
                this.renderParty();
                this.renderCreatures();
            },
            allyTurn(ally) {
                const charmedTargets = this._charmedTargetsFor(ally);
                const enemies = charmedTargets || this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                if (enemies.length === 0) { this.nextTurn(); return; }
                if (this._attemptTimidAllyFlee(ally)) return;
                const order = this._getPartyAIOrder(ally);
                if (order === 'passive' && ally.CPun >= ally.MPun) {
                    this.log.push({ text: this._label('combat.allyHolds', '{name} holds position.', { name: ally.name }), type: 'combat' });
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                if (order === 'healer' && this._allyHealWounded(ally)) return;
                // DUMB AI STATE MACHINE
                if (ally.dumbAI) {
                    // High pleasure (>90% MPle): may disobey and auto-fuck
                    if (ally.CPle >= ally.MPle * 0.9) {
                        if (ally.obedient && this._combatStateRoll('combat-ally-dumb-ai', ally, 'pleasure-disobey') < 0.7) {
                            this.log.push({ text: this._label('combat.allyTooAroused', '{name} is too aroused to obey!', { name: ally.name }), type: 'combat' });
                            ally.obedient = false;
                        }
                    }
                    // High hunger (>90): auto-feast on weakest enemy
                    if (ally.hunger > 90) {
                        if (ally.obedient && this._combatStateRoll('combat-ally-dumb-ai', ally, 'hunger-plead') < 0.3) {
                            this.log.push({ text: `${ally.name} pleads to eat...`, type: 'combat' });
                        } else {
                            const weakest = enemies.reduce((w, e) => (e.CPun / e.MPun < w.CPun / w.MPun) ? e : w, enemies[0]);
                            const canEat = weakest.CPun <= weakest.MPun * 0.3 || (ally.Feas > weakest.Flee && ally.size >= weakest.size - 2);
                            if (canEat && this._canFitPrey(ally, weakest, 'stomach')) {
                                this._containTargetIn(ally, weakest, 'stomach');
                                ally.hunger = Math.max(0, ally.hunger - 50);
                                ally.obedient = true; // Feeding restores loyalty
                                this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                                this.log.push({ text: `${ally.name} is starving and devours ${weakest.name} whole! Loyalty restored.`, type: 'combat' });
                                this._emitCombatAction('ally_feast', ally, weakest, 'consumed');
                                this.renderLog(); this.renderCreatures(); this.renderParty(); this.nextTurn(); return;
                            }
                        }
                    }
                    // High arousal (>80% MPle): auto-fuck nearest enemy
                    if (ally.CPle >= ally.MPle * 0.8) {
                        const target = enemies[Math.floor(this._combatStateRoll('combat-ally-dumb-ai', ally, 'arousal-target') * enemies.length) % enemies.length];
                        let charm = ally.Fuck + ally.Flir + this._combatStateRoll('combat-ally-dumb-ai', ally, 'arousal-charm') * 10;
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        if (charm > resist) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                            this.log.push({ text: `${ally.name} is aroused and seduces ${target.name}! Pleasure rises to ${target.CPle}/${target.MPle}.`, type: 'combat' });
                            if (target.CPle >= target.MPle * 0.8) {
	                                target.disposition = this.DISPOSITION.FRIENDLY;
	                                target.willing = true;
	                                this._awardCombatXP(this.XP_REWARDS.seduceEnemy);
	                                this.log.push({ text: `${target.name} submits to ${ally.name}!`, type: 'combat' });
	                                this._emitCombatAction('ally_fuck', ally, target, 'submitted');
	                            }
                            this.renderLog(); this.renderCreatures(); this.nextTurn(); return;
                        }
                    }
                }
                // Livestock auto-offer: if ally is livestock and a predator is hungry, offer to be eaten
                if (ally.livestock && ally.obedient) {
                    const predators = this.party.filter(p => p !== ally && p.CPun > 0 && p.hunger > 50 && p.Feas > ally.Flee && p.size >= ally.size - 2 && this._canFitPrey(p, ally, 'stomach'));
                    if (predators.length > 0) {
                        const pred = predators.reduce((best, p) => p.hunger > best.hunger ? p : best, predators[0]);
                        this._containTargetIn(pred, ally, 'stomach', { willingSacrifice: true });
                        pred.hunger = Math.max(0, pred.hunger - 50);
                        pred.obedient = true;
                        this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                        this.log.push({ text: ally.name + ' willingly offers themself to ' + pred.name + "'s hunger, sliding into their belly.", type: 'combat' });
                        this._emitCombatAction('ally_feed', ally, pred, 'sacrificed');
                        this.renderLog(); this.renderCreatures(); this.renderParty(); this.nextTurn(); return;
                    }
                }
                // Default behavior: attack weakest
                const reachableEnemies = enemies.filter(e => this._canReachCombatTarget(ally, e, 'fight'));
                if (reachableEnemies.length === 0) {
                    this.log.push({ text: this._label('combat.allyCannotReach', '{name} cannot reach any target.', { name: ally.name }), type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                const target = this._selectAllyAttackTarget(ally, reachableEnemies);
                if (this._terrainCausesMiss(ally, target, 'fight')) {
                    this.renderLog(); this.nextTurn(); return;
                }
                // Flying dodge check
                const allyIsRanged = ally.ranged || ally.antiflying;
                const targetDodge = target.flying && !allyIsRanged && !ally.ranged ? 0.5 : (target.swimming && !ally.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
                if (this._targetDodgeRoll(ally, target, 'fight') < targetDodge) {
                    this.log.push({ text: `${target.name} dodges ${ally.name}'s attack!`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                const ar = this._combatActionRating(ally.Figh, ally, target, 'ally-fight') * (ally.rage && ally.CPun < ally.MPun * 0.5 ? 1.5 : 1);
                const def = this._effectiveCon(target);
                const baseDmg = Math.max(1, ar - def * 0.3 + this._combatDamageVariance(ally, target, 'ally-fight'));
                let dmg = Math.max(1, Math.floor(baseDmg * this._physicalDamageMultiplier(ally, target)));
                if (ally.bloodsuck) { ally.CPun = Math.min(ally.MPun, ally.CPun + Math.floor(dmg * 0.3)); }
                target.CPun -= dmg;
                this._wakeOnDamage(target);
                this._applyAttackStatus(ally, target, dmg);
                // Constrictor restrains
                if (ally.constrictor && target.size <= 4 && !target.status.restrained) {
                    target.status.restrained = { turns: 2, by: ally.name };
                }
                // Poisonous/venom
                if (ally.poisonous || ally.venom) {
                    target.status.poisoned = { dmg: 3, turns: 3 };
                }
                // Enveloped
                if (ally.enveloped && target.size <= ally.size + 2) {
                    target.status.enveloped = { turns: 2, by: ally.name };
                }
                let result = `${ally.name} attacks ${target.name} for ${dmg} punishment!`;
                if (ally.bloodsuck) result += ` ${ally.name} heals!`;
                if (target.CPun <= 0) {
                    result += ` ${target.name} collapses!`;
                    this._awardCombatXP(this.XP_REWARDS.defeatEnemy);
                    if (this.settings.endoMode) { target.CPun = 1; target.disposition = this.DISPOSITION.FRIENDLY; }
                    else this._makeCorpse(target, 'fight');
                }
                this.log.push({ text: result, type: 'combat' });
                this._emitCombatAction('ally_fight', ally, target, result);
                this.renderLog();
                this.renderCreatures();
                this.nextTurn();
            },

            // ===== ENEMY TURN AI =====
            _enemyShouldFlee(enemy, targets) {
                const enemyCount = this._livingEnemies(this.creatures).length;
                const partyCount = targets.filter(t => t.CPun > 0 && !t.knockedOut).length;
                if (enemyCount < partyCount && enemy.CPun < enemy.MPun * 0.5) {
                    return this._combatStateRoll('combat-enemy-flee', enemy, 'outnumbered') < 0.5;
                }
                return enemy.CPun > 0 && enemy.CPun < enemy.MPun * 0.3
                    && this._combatStateRoll('combat-enemy-flee', enemy, 'wounded') < 0.3;
            },
            _combatStateRoll(namespace, unit = null, purpose = 'roll') {
                const x = Number(this.location?.x ?? 0);
                const y = Number(this.location?.y ?? 0);
                const unitId = this._unitSelectionId(unit || {});
                return this._worldRoll(namespace, x, y, unitId, this.combatState.round || 0, this.combatState.currentTurn || 0, this.dayCount || 0, this.timeHour || 0, purpose);
            },
            _enemyCallReinforcement(enemy) {
                const temp = this._getSpeciesTemperament(enemy.species);
                if (!temp.pack || enemy.CPun >= enemy.MPun * 0.5 || enemy.calledReinforcement || this._combatStateRoll('combat-reinforcement', enemy, 'call') >= 0.3) return false;
                const sp = this.species.find(s => s.id === enemy.species) || { name: enemy.species || 'Creature', icon: enemy.icon || '❓' };
                const base = this._getSpeciesBaseStats(enemy.species);
                const enemyId = this._unitSelectionId(enemy);
                const reinforcement = this._normalizeUnit({
                    id: `reinforce_${enemyId}_${this.combatState.round || 0}_${this.combatState.currentTurn || 0}`,
                    name: sp.name + ' Reinforcement',
                    species: enemy.species,
                    icon: sp.icon,
                    level: enemy.level || 1,
                    MPun: Math.floor((base.MPun || 100) * 0.8),
                    CPun: Math.floor((base.MPun || 100) * 0.8),
                    MPle: base.MPle || 100,
                    CPle: 0,
                    disposition: this.DISPOSITION.ENEMY,
                    status: {}
                }, { disposition: this.DISPOSITION.ENEMY });
                enemy.calledReinforcement = true;
                this.creatures.push(reinforcement);
                this._assignCombatRows([reinforcement]);
                const insertAt = Math.min(this.combatState.turnQueue.length, this.combatState.currentTurn + 1);
                this.combatState.turnQueue.splice(insertAt, 0, { unit: reinforcement, initiative: this._calcInitiative(reinforcement) });
                this.log.push({ text: this._label('combat.enemyReinforces', '{enemy} calls for help! {reinforcement} joins the fight.', {
                    enemy: enemy.name,
                    reinforcement: reinforcement.name
                }), type: 'combat' });
                this._syncCurrentTileCreatures();
                this.renderCreatures();
                return true;
            },
            _selectEnemyTarget(enemy, targets) {
                const preyTargets = targets.filter(t => t.livestock || t.willingPrey || this._isPredatorOf(enemy.species, t.species));
                if (preyTargets.length > 0) {
                    return preyTargets.reduce((best, t) => (t.CPun / t.MPun < best.CPun / best.MPun) ? t : best, preyTargets[0]);
                }
                const tastyTargets = targets.filter(t => t.tasty);
                if (tastyTargets.length > 0) {
                    const index = Math.floor(this._combatStateRoll('combat-target-tasty', enemy, 'choice') * tastyTargets.length) % tastyTargets.length;
                    return tastyTargets[index];
                }
                const leader = this.partyLeaderId ? this.party.find(p => this._unitSelectionId(p) === String(this.partyLeaderId)) : null;
                if (leader && targets.includes(leader)) return leader;
                return targets.reduce((weakest, t) => (t.CPun / t.MPun < weakest.CPun / weakest.MPun) ? t : weakest, targets[0]);
            },
            enemyTurn(enemy) {
                const charmedTargets = this._charmedTargetsFor(enemy);
                const targets = charmedTargets || this.party.filter(p => p.CPun > 0);
                if (targets.length === 0) return;
                const target = this._selectEnemyTarget(enemy, targets);
                // Menacing enemies may scare weak targets
                if (enemy.menacing && target.CPun / target.MPun < 0.4
                    && this._combatStateRoll('combat-menacing-fear', enemy, this._unitSelectionId(target)) < 0.3) {
                    this.log.push({ text: `${enemy.name} is terrifying! ${target.name} cowers in fear.`, type: 'combat' });
                    target.status.frightened = true;
                    this.renderLog();
                }
                // Rage at low HP
                if (enemy.rage && enemy.CPun < enemy.MPun * 0.5) {
                    this.log.push({ text: this._label('combat.enemyRage', '{name} enters a rage!', { name: enemy.name }), type: 'combat' });
                }
                this._enemyCallReinforcement(enemy);
                if (this._enemyShouldFlee(enemy, targets)) {
                    this.log.push({ text: this._label('combat.enemyFlees', '{name} flees in terror!', { name: enemy.name }), type: 'combat' });
                    enemy.fledCombat = true;
                    this._emitCombatAction('enemy_flee', enemy, null, 'fled');
                    this._removeCreatureFromArea(enemy);
                    this.renderCreatures();
                    this.renderLog();
                    if (this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0).length === 0) {
                        this.endCombat('disengage');
                    } else {
                        this.nextTurn();
                    }
                    return;
                }
                if (!this._canReachCombatTarget(enemy, target, 'fight')) {
                    this.log.push({ text: this._label('combat.enemyCannotReach', '{enemy} cannot reach {target}.', { enemy: enemy.name, target: target.name }), type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                if (this._terrainCausesMiss(enemy, target, 'fight')) {
                    this.renderLog(); this.nextTurn(); return;
                }
                // Flying/swimming/floopy dodge check
                const isRanged = enemy.ranged || enemy.antiflying;
                const targetDodge = target.flying && !isRanged && !enemy.ranged ? 0.5 : (target.swimming && !enemy.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
                if (this._targetDodgeRoll(enemy, target, 'fight') < targetDodge) {
                    this.log.push({ text: `${target.name} dodges ${enemy.name}'s attack! (${target.flying ? 'flying' : target.swimming ? 'swimming' : 'floopy'})`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                const ar = this._combatActionRating(enemy.Figh, enemy, target, 'enemy-fight') * (enemy.rage && enemy.CPun < enemy.MPun * 0.5 ? 1.5 : 1);
                const def = this._effectiveCon(target);
                const baseDmg = Math.max(1, ar - def * 0.3 + this._combatDamageVariance(enemy, target, 'enemy-fight'));
                let dmg = Math.max(1, Math.floor(baseDmg * this._physicalDamageMultiplier(enemy, target)));
                // Bloodsucker heals on hit
                if (enemy.bloodsuck) { enemy.CPun = Math.min(enemy.MPun, enemy.CPun + Math.floor(dmg * 0.3)); }
                target.CPun -= dmg;
                this._wakeOnDamage(target);
                this._applyAttackStatus(enemy, target, dmg);
                // Poisonous/venom applies DOT
                if (enemy.poisonous || enemy.venom) {
                    target.status.poisoned = { dmg: 3, turns: 3 };
                    this.log.push({ text: this._label('combat.status.poisoned', '{name} is poisoned!', { name: target.name }), type: 'combat' });
                }
                // Constrictor restrains small targets
                if (enemy.constrictor && target.size <= 4 && !target.status.restrained) {
                    target.status.restrained = { turns: 2, by: enemy.name };
                    this.log.push({ text: this._label('combat.status.constricted', '{actor} constricts {target}! They are restrained.', {
                        actor: enemy.name,
                        target: target.name
                    }), type: 'combat' });
                }
                // Enveloped by slime/plant
                if (enemy.enveloped && target.size <= enemy.size + 2) {
                    target.status.enveloped = { turns: 2, by: enemy.name };
                    this.log.push({ text: this._label('combat.status.enveloped', '{actor} envelops {target}!', {
                        actor: enemy.name,
                        target: target.name
                    }), type: 'combat' });
                }
                let result = `${enemy.name} hits ${target.name} for ${dmg} punishment!`;
                if (enemy.bloodsuck) result += ` ${enemy.name} heals!`;
                if (target.CPun <= 0) {
                    result += ` ${target.name} falls!`;
                    if (target.name === this.player.name) {
                        if (this.cheats.godMode) {
                            target.CPun = Math.max(1, target.CPun);
                            this.log.push({ text: this._label('combat.godModeSaved', 'God Mode saved you from death!'), type: 'combat' });
                            this.renderLog(); this.nextTurn(); return;
                        }
                        this.log.push({ text: this._label('combat.playerFallen', 'You have fallen! Game Over!'), type: 'combat' });
                        this.renderLog();
                        if (this.settings.hardcore) {
                            this.log.push({ text: this._label('combat.hardcoreSaveDeleted', 'HARDCORE MODE: Your save has been deleted.'), type: 'combat' });
                            this.renderLog();
                            this._removeStoredValue('lastSlot');
                            this._removeStoredValue('lastSaveTime');
                            for (let i = 1; i <= 5; i++) {
                                this._removeSaveTime('slot' + i);
                            }
                            this._dbDelete('saves', this.activeSlot).catch(() => {});
                            setTimeout(() => { App.showScreen('menu'); }, 2000);
                        } else {
                            // Softcore: player is knocked out for this combat, party can continue.
                            target.CPun = 0;
                            target.CPle = 0;
                            target.knockedOut = true;
                            this.log.push({ text: this._label('combat.playerKnockedOut', 'You have been knocked out! Your party must finish the fight...'), type: 'combat' });
                            this.renderLog(); this.renderParty();
                            // If no other living party members, defeat
                            const livingAllies = this.party.filter(p => p.CPun > 0 && !p.knockedOut && p.name !== this.player.name);
                            if (livingAllies.length === 0) {
                                this.log.push({ text: this._label('combat.partyWipedOut', 'Your party has been wiped out!'), type: 'combat' });
                                this.renderLog();
                                setTimeout(() => { App.showScreen('menu'); }, 2000);
                                this.endCombat('defeat');
                                return;
                            }
                            // Otherwise continue combat with player as KO'd
                            this.log.push({ text: this._label('combat.alliesContinue', 'Your allies continue the fight...'), type: 'combat' });
                            this.renderLog();
                            this.nextTurn(); return;
                        }
	                        this.combatState.active = false;
	                        return;
	                    }
	                    if (this._dropPartyCorpse(target, 'fight')) {
	                        this.nextTurn();
	                        return;
	                    }
	                }
	                this.log.push({ text: result, type: 'combat' });
                this._emitCombatAction('enemy_fight', enemy, target, result);
                this.renderLog();
                this.renderParty();
                this.nextTurn();
            },

            nextTurn() {
                if (!this.combatState.active) return;
                this._sanitizeCombatState({ preserveTurn: false });
                this.combatState.currentTurn++;
                if (this.combatState.currentTurn >= this.combatState.turnQueue.length) {
                    this._newRound(); return;
                }
                this.processTurn();
            },


            endCombat(result) {
                const outcome = result === true ? 'victory' : result === false ? 'defeat' : (result || 'victory');
                this.mode = this.GAME_MODE.NORMAL;
                this.combatState.active = false;
                this.combatState.processing = false;
                this.combatState.turnQueue = [];
                this.combatState.currentTurn = 0;
                this.combatState.syncActions = [];
                this.activeActor = null;
                this._clearTransientInteractionState();
                this._clearCombatRefreshSnapshot(this.activeSlot);
                this.party.forEach(p => { p.fledCombat = false; });
                if (this.player?.knockedOut) {
                    this.player.knockedOut = false;
                    this.player.CPun = Math.max(1, this.player.CPun || 0);
                    this.log.push({ text: this._label('combat.playerComesTo', '{name} comes to after the fight.', { name: this.player.name }), type: 'discovery' });
                }
                if (outcome === 'victory') {
                    this.log.push({ text: this._label('combat.victory', 'Victory! Enemies defeated or subdued.'), type: 'discovery' });
                    const texts = ['The battlefield falls silent.','Your enemies lie defeated.','Another victory, another feast.','You emerge from the chaos unscathed.'];
                    this.updateScene('Victory', texts[Math.floor(Math.random() * texts.length)], false);
                    this.gainXP(this.combatState.xpEarned || this.XP_REWARDS.defeatEnemy);
                    // Convert friendly enemies to neutral/friendly for potential recruitment
                    for (const c of this.creatures) {
                        if (c.disposition === this.DISPOSITION.FRIENDLY && c.CPun > 0) {
                            this.log.push({ text: `${c.name} looks at you with submissive eyes...`, type: 'discovery' });
                        }
                    }
                    this._runPostCombatScavengers();
                } else if (outcome === 'flee') {
                    this.log.push({ text: this._label('combat.escapedEncounter', 'You escaped the encounter.'), type: 'move' });
                    this.updateScene('Escaped', 'You put distance between yourself and danger.', false);
                } else if (outcome === 'disengage') {
                    this.log.push({ text: this._label('combat.disengaged', 'The encounter breaks off.'), type: 'move' });
                    this.updateScene('Disengaged', this._label('combat.disengaged', 'The encounter breaks off.'), false);
                } else {
                    this.log.push({ text: this._label('combat.defeat', 'Defeat...'), type: 'combat' });
                    this.updateScene('Defeat', 'Darkness claims you...', false);
                    setTimeout(() => { this._confirmDefeatReturnToMenu(); }, 1500);
                }
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.showExplorationActions();
                this.renderMobileCombatToolbelt();
                this.autoSave();
            },

            _confirmDefeatReturnToMenu() {
                return this.showConfirmDialog({
                    title: this._label('combat.defeat', 'Defeat...'),
                    message: this._label('combat.confirmReturnToMenu', 'Defeat! Return to menu?'),
                    confirmLabel: this._label('ui.returnToMenu', 'Return to Menu'),
                    cancelLabel: this._label('ui.cancel', 'Cancel'),
                    danger: true,
                    onConfirm: () => this.showScreen('menu')
                });
            },

            // ===== OUTSIDE COMBAT INTERACTION =====
            _unitSelectionId(unit) {
                return String(unit?.id || unit?.name || '');
            },
            _syncPlayerPartyReference() {
                if (!this.player) return null;
                if (!Array.isArray(this.party)) this.party = [];
                const playerId = this._unitSelectionId(this.player);
                let partyPlayer = this.party.find(unit => unit === this.player);
                if (!partyPlayer && playerId) partyPlayer = this.party.find(unit => this._unitSelectionId(unit) === playerId);
                if (!partyPlayer) partyPlayer = this.party.find(unit => unit?.mc || unit?.hero);
                if (!partyPlayer) {
                    partyPlayer = this.player;
                    this.party.unshift(partyPlayer);
                }
                if (partyPlayer !== this.player) this.player = partyPlayer;
                const index = this.party.indexOf(partyPlayer);
                if (index > 0) {
                    this.party.splice(index, 1);
                    this.party.unshift(partyPlayer);
                }
                partyPlayer.hero = true;
                partyPlayer.mc = true;
                partyPlayer.ally = false;
                if (!this.partyLeaderId) this.partyLeaderId = this._unitSelectionId(partyPlayer);
                if (!this.explorationActorIds || this.explorationActorIds.length === 0) {
                    this.explorationActorIds = [this._unitSelectionId(partyPlayer)];
                    this.explorationActorId = this.explorationActorIds[0];
                }
                return partyPlayer;
            },
            _getExplorationActors(actorId = null) {
                return YAW_EXPLORATION_SELECTION.getActors(this, actorId);
            },
            _getExplorationActor(actorId = null) {
                return YAW_EXPLORATION_SELECTION.getActor(this, actorId);
            },
            _selectedExplorationActorState({ allowFallback = true } = {}) {
                return YAW_EXPLORATION_SELECTION.selectedActorState(this, { allowFallback });
            },
            _explorationActorsForOptionalId(actorId = null) {
                return YAW_EXPLORATION_SELECTION.actorsForOptionalId(this, actorId);
            },

            _normalizeExplorationSelections({ resetTargets = false } = {}) {
                return YAW_EXPLORATION_SELECTION.normalize(this, { resetTargets });
            },

            clearTileBoundExplorationTargets() {
                return YAW_EXPLORATION_SELECTION.clearTileBoundTargets(this);
            },

            _getPartyLeader() {
                return YAW_PARTY_MANAGEMENT.leader(this);
            },

            setPartyLeader(index) {
                return YAW_PARTY_MANAGEMENT.setLeader(this, index);
            },

            movePartyMember(index, direction) {
                return YAW_PARTY_MANAGEMENT.move(this, index, direction);
            },

            reorderPartyMember(index, targetIndex) {
                return YAW_PARTY_MANAGEMENT.reorder(this, index, targetIndex);
            },

            startPartyDrag(index) {
                return YAW_PARTY_MANAGEMENT.startDrag(this, index);
            },

            dragPartyOver(event) {
                return YAW_PARTY_MANAGEMENT.dragOver(event);
            },

            clearPartyDrag() {
                return YAW_PARTY_MANAGEMENT.clearDrag(this);
            },

            dropPartyMember(targetIndex) {
                return YAW_PARTY_MANAGEMENT.drop(this, targetIndex);
            },

            _dropDismissedPartyMember(unit) {
                return YAW_PARTY_MANAGEMENT.dropDismissed(this, unit);
            },

            dismissPartyMember(index) {
                return YAW_PARTY_MANAGEMENT.dismiss(this, index);
            },

            _dismissPartyMemberConfirmed(index) {
                return YAW_PARTY_MANAGEMENT.confirmDismiss(this, index);
            },

            showPartyMemberStats(index) {
                return YAW_STATS_PANEL.showPartyMember(this, index);
            },

            selectExplorationActor(index) {
                return YAW_EXPLORATION_SELECTION.selectActor(this, index);
            },

            _explorationTargetKey(type, id) {
                return YAW_EXPLORATION_SELECTION.targetKey(type, id);
            },

            _isExplorationTarget(type, id) {
                return YAW_EXPLORATION_SELECTION.isTarget(this, type, id);
            },

            _explorationTargetFromKey(key) {
                return YAW_EXPLORATION_SELECTION.targetFromKey(this, key);
            },

            _getExplorationTargets() {
                return YAW_EXPLORATION_SELECTION.getTargets(this);
            },

            toggleExplorationTarget(type, id) {
                return YAW_EXPLORATION_SELECTION.toggleTarget(this, type, id);
            },

            clearExplorationTargets() {
                return YAW_EXPLORATION_SELECTION.clearTargets(this);
            },

            _reportInvalidExplorationActorSelection(action) {
                return YAW_EXPLORATION_SELECTION.reportInvalidActor(this, action);
            },

            _renderExplorationTargetActions(source = 'sheet') {
                return YAW_MARKED_TARGET_ACTIONS.render(this, source);
            },

            openExplorationTargetSubActionSheet(action, source = 'target-bar') {
                return YAW_MARKED_TARGET_ACTIONS.openSubActionSheet(this, action, source);
            },

            resolveExplorationTargetAction(action, subAction = null, source = 'target-bar') {
                return YAW_EXPLORATION_SELECTION.resolveTargetAction(this, action, subAction, source);
            },

            _getRecruitScore(actor, target) {
                return YAW_RECRUITMENT_FLOW.score(this, actor, target);
            },

            _canRecruit(actor, target) {
                return YAW_RECRUITMENT_FLOW.canRecruit(this, actor, target);
            },

            showInteractMenu() {
                this.log.push({ text: this._label('target.chooseFromPanel', 'Select a target from the creature panel.'), type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
                return false;
            },

            showCreatureInteract(type, index) {
                const target = type === 'party' ? this.party.filter(p => p.name !== this.player.name)[index] : this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY)[index];
                if (!target) return;
                const id = type === 'party' ? this._unitSelectionId(target) : String(target.id || target.name);
                this.toggleExplorationTarget(type, id);
                return false;
            },

            outsideAction(action, type, index) {
                const target = type === 'party' ? this.party.filter(p => p.name !== this.player.name)[index] : this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY)[index];
                if (!target) return false;
                if (type === 'party') return this.outsideActionForParty(action, this.party.indexOf(target));
                return this.outsideActionForCreature(action, target.id || target.name);
            },

            outsideActionForParty(action, targetIndex, actorId = null, options = {}) {
                const target = this.party[targetIndex];
                if (!target) return false;
                const actors = this._explorationActorsForOptionalId(actorId);
                if (actorId && actors.length === 0) return false;
                return this._dispatchPanelInteraction({
                    mode: 'adventure',
                    actors,
                    targets: [target],
                    action,
                    subAction: options.subAction || null,
                    source: 'party-wrapper',
                    targetType: 'party'
                });
            },

            outsideActionForCreature(action, targetId, options = {}) {
                return this._dispatchPanelInteraction({
                    mode: 'adventure',
                    targetType: 'creature',
                    targetRef: targetId,
                    action,
                    subAction: options.subAction || null,
                    source: 'creature-wrapper'
                });
            },

            outsideActionForCreatureAs(actorId, action, targetId, options = {}) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target) return false;
                const actors = this._explorationActorsForOptionalId(actorId);
                if (actorId && actors.length === 0) return false;
                return this._dispatchPanelInteraction({
                    mode: 'adventure',
                    actors,
                    targets: [target],
                    action,
                    subAction: options.subAction || null,
                    source: 'creature-wrapper',
                    targetType: 'creature'
                });
            },

            _removeContainedPartyMember(unit) {
                if (!unit || unit === this.player || unit.mc) return;
                this.party = this.party.filter(p => p !== unit);
                this._normalizeExplorationSelections();
            },

            _feedPartyMemberToConsumer(prey, consumer) {
                if (!prey || !consumer || prey === consumer) return this._label('group.feed.selfBlocked', '{name} cannot feed into themself yet.', { name: prey?.name || 'Someone' });
                if (prey === this.player || prey.mc) return this._label('group.feed.playerBlocked', '{name} cannot be handed off as prey right now.', { name: prey.name });
                if (!this._canFitPrey(consumer, prey, 'stomach')) return this._capacityFailureMessage(consumer, prey, 'stomach');
                this._containTargetIn(consumer, prey, 'stomach', { willingSacrifice: true });
                consumer.hunger = Math.max(0, (consumer.hunger || 0) - 40);
                return this._label('group.feed.partyToConsumer', '{prey} is fed to {consumer} and settles in their stomach.', { prey: prey.name, consumer: consumer.name });
            },

            registerPlayFightResolver(resolver) {
                this.playFightResolver = typeof resolver === 'function' ? resolver : null;
            },

            _resolvePartyPlayFight(actors, target, dmg) {
                if (this.playFightResolver) {
                    return this.playFightResolver({ actors, target, dmg, app: this });
                }
                target.CPun -= dmg;
                if (target.CPun <= 0) {
                    if (this.settings.partyPlayFightMode === 'lethal') {
                        this._makeCorpse(target, 'fight');
                        return this._label('group.fight.roughCollapse', '{name} collapses from the rough play.', { name: target.name });
                    }
                    target.CPun = 1;
                    return this._label('group.fight.pinned', 'They are pinned but not seriously hurt.');
                }
                return '';
            },

            _groupChewFeast(actors, target) {
                const portions = actors.filter(actor => actor && actor !== target);
                if (portions.length === 0) return this._label('group.feast.noHelpers', '{target} cannot be split without helpers.', { target: target.name });
                const portionSize = Math.max(1, Math.ceil((target.size || 1) / portions.length));
                const blocked = portions.find(actor => this._containerUsed(actor, 'stomach') + portionSize > this._containerCapacity(actor, 'stomach'));
                if (blocked) return this._capacityFailureMessage(blocked, target, 'stomach');
                for (const actor of portions) {
                    if (!actor.stomach) actor.stomach = [];
                    actor.stomach.push({
                        name: `${target.name} portion`,
                        species: target.species,
                        size: portionSize,
                        alive: false,
                        inStomach: true,
                        digestionState: 'digested',
                        digestionProgress: 100,
                        sourceId: target.id || target.name
                    });
                    actor.hunger = Math.max(0, (actor.hunger || 0) - 25);
                }
                target.CPun = 0;
                if (this.party.includes(target)) this._removeContainedPartyMember(target);
                else this._removeCreatureFromArea(target);
                this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                return this._label('group.feast.split', '{actors} split {target} into chewable portions.', {
                    actors: portions.map(actor => actor.name).join(', '),
                    target: target.name
                });
            },
            _selectGroupFeastPrimary(actors, target) {
                const candidates = (actors || []).filter(actor => actor && actor !== target);
                const assessed = candidates.map(actor => {
                    const helperBonus = candidates
                        .filter(helper => helper !== actor)
                        .reduce((sum, helper) => sum + Math.floor((helper.Feas || 10) * 0.5), 0);
                    const canOverpower = this.cheats.canEatAnything || (actor.size >= target.size - 2 && (actor.Feas || 10) + helperBonus + 5 > target.Flee);
                    return {
                        actor,
                        canOverpower,
                        canFit: this._canFitPrey(actor, target, 'stomach')
                    };
                });
                return {
                    primary: assessed.find(entry => entry.canOverpower && entry.canFit)?.actor || null,
                    canOverpower: assessed.some(entry => entry.canOverpower),
                    capacityActor: assessed.find(entry => entry.canOverpower)?.actor || candidates[0] || null
                };
            },

            _multiTargetStat(actor, action) {
                if (action === 'fight') return actor.Figh || actor.str || 10;
                if (action === 'flirt') return (actor.Flir || 10) + Math.floor((actor.cha || 10) * 0.5);
                if (action === 'fuck') return (actor.Fuck || 10) + Math.floor((actor.cha || 10) * 0.5);
                if (action === 'feast') return actor.Feas || actor.str || 10;
                if (action === 'feed') return actor.Feed || actor.wis || 10;
                return actor.spd || 10;
            },

            _canHandleMultipleTargets(actor, action, targets) {
                const count = (targets || []).length;
                if (count <= 1) return true;
                const stat = this._multiTargetStat(actor, action);
                const difficulty = 12 + (count - 1) * 8;
                return stat >= difficulty;
            },

            _shouldSkipFullFeedTarget(options = {}) {
                return !options.subAction || ['heal', 'breastfeed'].includes(options.subAction);
            },

            _selectGroupFeedSubActionActor(subAction, target, actors = []) {
                const def = this.SUB_ACTIONS.feed && this.SUB_ACTIONS.feed[subAction];
                if (!def) return null;
                const livingActors = (actors || []).filter(actor => actor && actor !== target && this._isLivingCreature(actor));
                return livingActors.find(actor => {
                    const holders = livingActors.filter(helper => helper !== actor && helper !== target);
                    return this._isSubActionAvailable(def, actor, target, holders);
                }) || livingActors[0] || null;
            },

            _groupActionRoleSummary(action, target, actors = [], options = {}) {
                const livingActors = (actors || []).filter(actor => actor && this._isLivingCreature(actor));
                const selectedSubAction = options.subAction && this.SUB_ACTIONS[action]?.[options.subAction] ? options.subAction : null;
                let primaryActor = livingActors[0] || this.player || null;
                let helpers = livingActors.filter(actor => actor && actor !== primaryActor);
                let recipient = null;
                let consumer = null;
                let prey = [];
                if (action === 'feast' && target) {
                    const shouldChew = selectedSubAction === 'chew' || (!selectedSubAction && this.settings.chewing);
                    if (!shouldChew) {
                        const selection = this._selectGroupFeastPrimary(livingActors, target);
                        primaryActor = selection.primary || primaryActor;
                        helpers = livingActors.filter(actor => actor && actor !== primaryActor);
                        consumer = primaryActor;
                    }
                    prey = [target].filter(Boolean);
                } else if (action === 'feed' && target) {
                    if (selectedSubAction && !['heal', 'breastfeed'].includes(selectedSubAction)) {
                        primaryActor = this._selectGroupFeedSubActionActor(selectedSubAction, target, livingActors) || primaryActor;
                        helpers = livingActors.filter(actor => actor && actor !== primaryActor);
                        recipient = target;
                    } else if (this.party.includes(target)) {
                        recipient = target;
                        consumer = target;
                        const candidates = livingActors.filter(actor => actor !== target);
                        prey = candidates.filter(actor => actor !== this.player && !actor.mc);
                        helpers = candidates.filter(actor => !prey.includes(actor));
                        primaryActor = prey[0] || target;
                    } else {
                        recipient = target;
                    }
                } else {
                    recipient = target || null;
                }
                const names = units => (units || []).filter(Boolean).map(unit => unit.name || 'Unknown');
                return {
                    action,
                    subAction: selectedSubAction,
                    primaryActor,
                    helpers,
                    targets: [target].filter(Boolean),
                    recipient,
                    consumer,
                    prey,
                    actorNames: names(livingActors),
                    helperNames: names(helpers),
                    targetNames: names([target].filter(Boolean)),
                    preyNames: names(prey)
                };
            },

            _groupRoleLine(summary = {}) {
                const parts = [];
                if (summary.primaryActor) parts.push(`${this._label('target.primaryActor', 'Primary')}: ${summary.primaryActor.name || 'Unknown'}`);
                if (summary.consumer) parts.push(`${this._label('target.consumer', 'Consumer')}: ${summary.consumer.name || 'Unknown'}`);
                if (summary.recipient && summary.recipient !== summary.consumer) parts.push(`${this._label('target.recipient', 'Recipient')}: ${summary.recipient.name || 'Unknown'}`);
                if (summary.preyNames?.length) parts.push(`${this._label('target.prey', 'Prey')}: ${summary.preyNames.join(', ')}`);
                if (summary.helperNames?.length) parts.push(`${this._label('target.helpers', 'Helpers')}: ${summary.helperNames.join(', ')}`);
                return parts.join(' | ');
            },

            outsideActionOnTargets(action, targets, actor = this._getExplorationActor(), options = {}) {
                const targetList = (targets || []).filter(target => target && this._isLivingCreature(target));
                if (targetList.length === 0) return false;
                actor = actor || this.player;
                if (!this._canHandleMultipleTargets(actor, action, targetList)) {
                    this.log.push({ text: this._label('target.cannotHandleMultiple', '{name} cannot handle {count} targets with {action} yet.', {
                        name: actor.name,
                        count: targetList.length,
                        action: this._uiLabel(action).toLowerCase()
                    }), type: 'discovery' });
                    this.renderLog();
                    this.renderParty();
                    this.renderCreatures();
                    this.renderExplorationActions();
                    return false;
                }
                const skipped = [];
                const skippedSet = new Set();
                for (const target of targetList) {
                    if (action === 'feed' && this._shouldSkipFullFeedTarget(options) && this.party.includes(target) && target.CPun >= target.MPun) {
                        skipped.push(target.name);
                        skippedSet.add(target);
                        continue;
                    }
                    const resolved = this.outsideActionOnTarget(action, target, actor, { ...options, allowPartySacrifice: false });
                    if (resolved === false || this.lastActionResolution?.affected === false) skippedSet.add(target);
                }
                const affected = targetList.filter(target => !skippedSet.has(target)).map(t => t.name);
                let summary = affected.length > 0
                    ? this._label('target.multiActionDone', '{name} finishes a multi-target {action} action on {targets}.', {
                        name: actor.name,
                        action: this._uiLabel(action).toLowerCase(),
                        targets: affected.join(', ')
                    })
                    : this._label('target.multiActionNone', '{name} finds no valid targets for multi-target {action}.', {
                        name: actor.name,
                        action: this._uiLabel(action).toLowerCase()
                    });
                if (skipped.length > 0) summary += ` ${this._label('target.skippedFullTargets', 'Skipped full targets: {targets}.', { targets: skipped.join(', ') })}`;
                this.log.push({ text: summary, type: 'discovery' });
                this._normalizeExplorationSelections();
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
                return true;
            },

            _sameUnitSet(left = [], right = []) {
                const leftIds = [...new Set((left || []).filter(Boolean).map(unit => this._unitSelectionId(unit)))].sort();
                const rightIds = [...new Set((right || []).filter(Boolean).map(unit => this._unitSelectionId(unit)))].sort();
                return leftIds.length > 0 && leftIds.length === rightIds.length && leftIds.every((id, index) => id === rightIds[index]);
            },

            _isUnitSubset(subset = [], superset = []) {
                const subsetIds = [...new Set((subset || []).filter(Boolean).map(unit => this._unitSelectionId(unit)))];
                if (subsetIds.length === 0) return false;
                const supersetIds = new Set((superset || []).filter(Boolean).map(unit => this._unitSelectionId(unit)));
                return subsetIds.every(id => supersetIds.has(id));
            },

            outsideMutualGroupAction(action, participants = [], options = {}) {
                const living = [...new Set((participants || []).filter(unit => unit && this._isLivingCreature(unit)))];
                if (living.length <= 1) return false;
                const selectedSubAction = options.subAction && this.SUB_ACTIONS[action]?.[options.subAction] ? options.subAction : null;
                const names = living.map(unit => unit.name).join(', ');
                if (action === 'feed' && selectedSubAction && !['heal', 'breastfeed'].includes(selectedSubAction)) {
                    this.log.push({ text: this._label('feed.noValidTarget', 'No valid target for this feed action.'), type: 'discovery' });
                    this.renderLog();
                    this.renderParty();
                    this.renderCreatures();
                    this.renderExplorationActions();
                    return false;
                }
                let result = '';
                switch (action) {
                    case 'fight': {
                        const totalFigh = living.reduce((sum, actor) => sum + (actor.Figh || 10), 0);
                        const avgCon = living.reduce((sum, actor) => sum + (actor.con || 10), 0) / living.length;
                        const actorKey = living.map(actor => this._unitSelectionId(actor)).join('|');
                        const dmg = Math.max(1, Math.floor(
                            this._explorationActionRating(totalFigh + 4, living[0] || this.player, living[0] || null, `mutual-fight:${actorKey}`) / living.length
                            - avgCon * 0.2
                        ));
                        const outcomes = [];
                        living.forEach(unit => {
                            const outcome = this._resolvePartyPlayFight(living, unit, dmg);
                            if (outcome) outcomes.push(`${unit.name}: ${outcome}`);
                        });
                        result = this._label('group.mutual.fight', '{actors} spar as a mutual group, each taking {amount} punishment.', { actors: names, amount: dmg });
                        if (outcomes.length > 0) result += ` ${outcomes.join(' ')}`;
                        break;
                    }
                    case 'feed': {
                        const totalFeed = living.reduce((sum, actor) => sum + (actor.Feed || 10), 0);
                        const healAmount = Math.max(1, Math.floor(totalFeed / living.length));
                        living.forEach(unit => {
                            unit.CPun = Math.min(unit.MPun, (unit.CPun || 0) + healAmount);
                            unit.hunger = Math.max(0, (unit.hunger || 0) - 10);
                        });
                        result = this._label('group.mutual.feed', '{actors} tend each other, restoring {amount} punishment where needed.', { actors: names, amount: healAmount });
                        break;
                    }
                    case 'flirt':
                    case 'fuck': {
                        const stat = action === 'fuck' ? 'Fuck' : 'Flir';
                        const totalCharm = living.reduce((sum, actor) => sum + (actor[stat] || 10) + Math.floor((actor.cha || 10) * 0.5), 0);
                        const gain = Math.max(1, Math.floor(totalCharm / living.length * (action === 'fuck' ? 0.35 : 0.25)));
                        living.forEach(unit => {
                            unit.CPle = Math.min(unit.MPle, (unit.CPle || 0) + gain);
                        });
                        result = this._label('group.mutual.social', '{actors} share {action} as a mutual group. Pleasure rises for everyone involved.', {
                            actors: names,
                            action: this._uiLabel(action).toLowerCase()
                        });
                        break;
                    }
                    case 'feast':
                        result = this._label('group.mutual.feastBlocked', '{actors} cannot feast on themselves as a mutual group. Choose a primary target instead.', { actors: names });
                        break;
                    default:
                        return false;
                }
                this.log.push({ text: result, type: 'discovery' });
                this._normalizeExplorationSelections();
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
                return true;
            },

            outsidePairedActionsOnTargets(action, actors, targets, options = {}) {
                const livingActors = (actors || []).filter(actor => actor && this._isLivingCreature(actor));
                const targetList = (targets || []).filter(target => target && this._isLivingCreature(target));
                if (livingActors.length === 0 || livingActors.length !== targetList.length) return false;
                const resolvedPairs = [];
                const skipped = [];
                for (let i = 0; i < livingActors.length; i++) {
                    const actor = livingActors[i];
                    const target = targetList[i];
                    if (action === 'feed' && this._shouldSkipFullFeedTarget(options) && this.party.includes(target) && target.CPun >= target.MPun) {
                        skipped.push(target.name);
                        continue;
                    }
                    const resolved = this.outsideActionOnTarget(action, target, actor, { ...options, allowPartySacrifice: false });
                    if (resolved === false) {
                        skipped.push(target.name);
                        continue;
                    }
                    resolvedPairs.push(`${actor.name} -> ${target.name}`);
                }
                const summary = resolvedPairs.length > 0
                    ? this._label('target.pairedActionDone', 'Paired {action} actions resolved: {pairs}.', {
                        action: this._uiLabel(action).toLowerCase(),
                        pairs: resolvedPairs.join(', ')
                    })
                    : this._label('target.multiActionNone', '{name} finds no valid targets for multi-target {action}.', {
                        name: livingActors.map(actor => actor.name).join(', '),
                        action: this._uiLabel(action).toLowerCase()
                    });
                const skippedText = skipped.length > 0
                    ? ` ${this._label('target.skippedFullTargets', 'Skipped full targets: {targets}.', { targets: skipped.join(', ') })}`
                    : '';
                this.log.push({ text: summary + skippedText, type: 'discovery' });
                this._normalizeExplorationSelections();
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
                return true;
            },

            outsideActionForPartyTargets(action, targetIndexes, actorId = null, options = {}) {
                const targets = (targetIndexes || []).map(index => this.party[index]).filter(Boolean);
                const actors = this._explorationActorsForOptionalId(actorId);
                if (actorId && actors.length === 0) return false;
                return this._dispatchPanelInteraction({
                    mode: 'adventure',
                    actors,
                    targets,
                    action,
                    subAction: options.subAction || null,
                    source: 'party-target-wrapper',
                    targetType: 'party'
                });
            },

            outsideActionForCreatureTargets(action, targetIds, actorId = null, options = {}) {
                const ids = new Set((targetIds || []).map(id => String(id)));
                const targets = this.creatures.filter(c => ids.has(String(c.id || c.name)));
                const actors = this._explorationActorsForOptionalId(actorId);
                if (actorId && actors.length === 0) return false;
                return this._dispatchPanelInteraction({
                    mode: 'adventure',
                    actors,
                    targets,
                    action,
                    subAction: options.subAction || null,
                    source: 'creature-target-wrapper',
                    targetType: 'creature'
                });
            },

            outsideGroupActionOnTarget(action, target, actors = this._getExplorationActors(), options = {}) {
                const livingActors = (actors || []).filter(actor => actor && this._isLivingCreature(actor));
                if (livingActors.length <= 1) {
                    const resolved = this.outsideActionOnTarget(action, target, livingActors[0] || this.player, options);
                    return resolved !== false;
                }
                const selectedSubAction = options.subAction && this.SUB_ACTIONS[action]?.[options.subAction] ? options.subAction : null;
                const names = livingActors.map(actor => actor.name).join(', ');
                let result = '';
                let startCombatAfter = false;
                let combatTargets = [];
                switch (action) {
                    case 'fight': {
                        if (target.disposition !== this.DISPOSITION.ENEMY && !this.party.includes(target)) {
                            const reaction = this._reactToNonHostileAttack(target, livingActors[0] || this.player);
                            result = reaction?.text || `${target.name} recoils from the attack.`;
                            combatTargets = [...new Set(reaction?.hostiles || [])];
                            startCombatAfter = combatTargets.length > 0;
                            break;
                        }
                        const totalFigh = livingActors.reduce((sum, actor) => sum + (actor.Figh || 10), 0);
                        const actorKey = livingActors.map(actor => this._unitSelectionId(actor)).join('|');
                        const dmg = Math.max(1, Math.floor(
                            this._explorationActionRating(totalFigh, livingActors[0] || this.player, target, `group-fight:${actorKey}`)
                            - (target.con || 10) * 0.3
                            + this._explorationDamageVariance(livingActors[0] || this.player, target, `group-fight:${actorKey}`)
                        ));
                        if (this.party.includes(target) && livingActors.includes(target)) {
                            const sparDamage = Math.max(1, Math.floor(dmg / livingActors.length));
                            const outcomes = [];
                            for (const participant of livingActors) {
                                const outcome = this._resolvePartyPlayFight(livingActors, participant, sparDamage);
                                if (outcome) outcomes.push(`${participant.name}: ${outcome}`);
                            }
                            result = this._label('group.fight.sparTogether', '{actors} spar together, each taking {amount} punishment.', {
                                actors: names,
                                amount: sparDamage
                            });
                            if (outcomes.length > 0) result += ` ${outcomes.join(' ')}`;
                            break;
                        }
                        result = this._label('group.fight.playFight', '{actors} play-fight {target} for {amount} punishment.', {
                            actors: names,
                            target: target.name,
                            amount: dmg
                        });
                        if (this.party.includes(target)) {
                            const outcome = this._resolvePartyPlayFight(livingActors, target, dmg);
                            if (outcome) result += ` ${outcome}`;
                        } else {
                            target.CPun -= dmg;
                        }
                        if (!this.party.includes(target) && target.CPun <= 0) {
                            this._makeCorpse(target, 'fight');
                            result += ` ${this._label('group.fight.collapses', '{target} collapses.', { target: target.name })}`;
                        }
                        break;
                    }
                    case 'feed': {
                        if (selectedSubAction && !['heal', 'breastfeed'].includes(selectedSubAction)) {
                            const primary = this._selectGroupFeedSubActionActor(selectedSubAction, target, livingActors);
                            if (!primary) {
                                result = this._label('feed.noValidTarget', 'No valid target for this feed action.');
                                break;
                            }
                            const { actorName: primaryName, actorVerb: primaryVerb } = this._actorNameAndVerb(primary);
                            result = this._doSubAction('feed', selectedSubAction, primary, target, primaryName, primaryVerb);
                            this._cleanupOutsideSubActionTarget('feed', selectedSubAction, primary, target);
                            break;
                        }
                        if (this.party.includes(target)) {
                            const candidates = livingActors.filter(actor => actor !== target);
                            const prey = candidates.filter(actor => actor !== this.player && !actor.mc);
                            const helpers = candidates.filter(actor => !prey.includes(actor));
                            if (selectedSubAction === 'heal' || livingActors.includes(target) || candidates.length === 0 || prey.length === 0) {
                                const totalFeed = livingActors.reduce((sum, actor) => sum + (actor.Feed || 10), 0);
                                const healAmount = Math.floor(totalFeed * 2);
                                target.CPun = Math.min(target.MPun, target.CPun + healAmount);
                                result = livingActors.includes(target)
                                    ? this._label('group.feed.tendTogether', '{actors} tend {target} together, restoring {amount} punishment.', { actors: names, target: target.name, amount: healAmount })
                                    : this._label('group.feed.tend', '{actors} tend {target}, restoring {amount} punishment.', { actors: names, target: target.name, amount: healAmount });
                            } else {
                                const roleLine = this._groupRoleLine(this._groupActionRoleSummary('feed', target, livingActors, options));
                                const texts = prey.map(actor => this._feedPartyMemberToConsumer(actor, target));
                                if (helpers.length > 0) {
                                    const helperNames = helpers.map(actor => actor.name).join(', ');
                                    texts.push(this._label('group.feed.helpers', '{helpers} help feed {prey} to {target}.', {
                                        helpers: helperNames,
                                        prey: prey.map(actor => actor.name).join(', '),
                                        target: target.name
                                    }));
                                }
                                if (roleLine) texts.push(roleLine);
                                result = texts.join(' ');
                            }
                        } else {
                            const totalFeed = livingActors.reduce((sum, actor) => sum + (actor.Feed || 10), 0);
                            target.CPun = Math.min(target.MPun, target.CPun + Math.floor(totalFeed * 2));
                            result = this._label('group.feed.creature', '{actors} feed {target}, restoring {amount} punishment.', {
                                actors: names,
                                target: target.name,
                                amount: Math.floor(totalFeed * 2)
                            });
                        }
                        break;
                    }
                    case 'feast': {
                        if (this.party.includes(target) && livingActors.includes(target)) {
                            result = this._label('group.feast.selfBlocked', '{target} cannot feast on themself. Select other party members as actors to consume this target, or select {target} alone to feast on another target.', { target: target.name });
                            break;
                        }
                        const shouldChew = selectedSubAction === 'chew' || (!selectedSubAction && this.settings.chewing);
                        if (shouldChew && livingActors.length > 1) {
                            result = this._groupChewFeast(livingActors, target);
                            break;
                        }
                        const selection = this._selectGroupFeastPrimary(livingActors, target);
                        if (!selection.canOverpower) {
                            result = this._label('group.feast.tooStrong', '{target} is too large or strong for {actors} to consume.', { target: target.name, actors: names });
                            break;
                        }
                        const primary = selection.primary;
                        const helpers = livingActors.filter(actor => actor !== primary);
                        const capacityActor = selection.capacityActor || livingActors[0];
                        if (!this._canFitPrey(primary, target, 'stomach')) {
                            result = this._capacityFailureMessage(capacityActor, target, 'stomach');
                            break;
                        }
                        this._containTargetIn(primary, target, 'stomach');
                        this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                        result = this._label('group.feast.swallow', '{helpers} help {primary} swallow {target}.', {
                            helpers: helpers.map(actor => actor.name).join(', ') || primary.name,
                            primary: primary.name,
                            target: target.name
                        });
                        break;
                    }
                    case 'flirt':
                    case 'fuck': {
                        const selfIncludedPartyTarget = this.party.includes(target) && livingActors.includes(target);
                        const totalCharm = livingActors.reduce((sum, actor) => sum + (actor[action === 'fuck' ? 'Fuck' : 'Flir'] || 10) + (actor.cha || 10) * 0.5, 0);
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        if (totalCharm > resist) {
                            const gain = Math.floor(totalCharm * (action === 'fuck' ? 0.45 : 0.3));
                            target.CPle = Math.min(target.MPle, target.CPle + gain);
                            if (selfIncludedPartyTarget) {
                                const sharedGain = Math.max(1, Math.floor(gain * 0.5));
                                livingActors.filter(actor => actor !== target).forEach(actor => {
                                    actor.CPle = Math.min(actor.MPle, (actor.CPle || 0) + sharedGain);
                                });
                                result = this._label('group.social.share', '{actors} share {action} with {target}. Pleasure spreads through the group; {target} rises to {current}/{max}.', {
                                    actors: names,
                                    action: this._uiLabel(action).toLowerCase(),
                                    target: target.name,
                                    current: target.CPle,
                                    max: target.MPle
                                });
                            } else {
                                result = this._label('group.social.focus', '{actors} focus on {target}. Pleasure rises to {current}/{max}.', {
                                    actors: names,
                                    target: target.name,
                                    current: target.CPle,
                                    max: target.MPle
                                });
                            }
                            if (target.CPle >= target.MPle * 0.8) {
                                target.willing = true;
                                target.orgasmed = true;
                                if (!this.party.includes(target)) target.disposition = this.DISPOSITION.FRIENDLY;
                                this._updateQuestProgress('seduce', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                            }
                        } else {
                            result = this._label('group.social.resists', "{target} resists the group's attention.", { target: target.name });
                        }
                        break;
                    }
                    default:
                        this.outsideActionOnTarget(action, target, livingActors[0] || this.player);
                        return true;
                }
                this.log.push({ text: result, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                if (startCombatAfter) {
                    this.startCombat(combatTargets);
                    return true;
                }
                if (!this.combatState.active) this.renderExplorationActions();
                return true;
            },

            outsideActionOnTarget(action, target, actor = this.player, options = {}) {
                actor = actor || this.player;
                const { actorName } = this._actorNameAndVerb(actor);
                const selectedSubAction = options.subAction && this.SUB_ACTIONS[action]?.[options.subAction] ? options.subAction : null;
                let result = '';
                let affected = true;
                let startCombatAfter = false;
                let combatTargets = [];
                switch (action) {
                    case 'fight': {
                        if (target.disposition !== this.DISPOSITION.ENEMY && !this.party.includes(target)) {
                            const reaction = this._reactToNonHostileAttack(target, actor);
                            result = reaction.text;
                            combatTargets = reaction.hostiles;
                            startCombatAfter = combatTargets.length > 0;
                            break;
                        }
                        const ar = this._explorationActionRating(actor.Figh, actor, target, 'single-fight');
                        const def = target.con || 10;
                        const dmg = Math.max(1, Math.floor(ar - def * 0.3 + this._explorationDamageVariance(actor, target, 'single-fight')));
                        target.CPun -= dmg;
                        result = this._label('explore.fight.hit', '{actor} hits {target} for {amount} punishment.', { actor: actorName, target: target.name, amount: dmg });
                        if (target.CPun <= 0) {
                            target.CPun = 1;
                            result += ` ${this._label('explore.fight.subdued', '{target} is subdued.', { target: target.name })}`;
                        }
                        break;
                    }
                    case 'fuck': {
                        let charm = this._AR(actor.Fuck + actor.Flir);
                        if (this.settings.sameSpeciesBonus && target.species === actor.species) {
                            charm += 5;
                        }
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        const oldPle = target.CPle;
                        if (charm > resist) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                            result = this._label('explore.fuck.success', '{actor} pleasures {target}. Their arousal rises to {current}/{max}.', {
                                actor: actorName,
                                target: target.name,
                                current: target.CPle,
                                max: target.MPle
                            });
                            if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                                target.willing = true;
                                target.orgasmed = true;
                                result += ` ${this._label('explore.fuck.devoted', '{target} orgasms and is completely devoted.', { target: target.name })}`;
                                this._updateQuestProgress('seduce', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                                if (this.settings.refractoryPeriod) {
                                    target.refractory = true;
                                    result += ` ${this._label('explore.fuck.recover', '{target} needs a moment to recover...', { target: target.name })}`;
                                }
                            }
                            if (!this.party.includes(target) && this._canRecruit(actor, target)) {
                                result += ` ${this._label('explore.recruit.possible', '{target} may be willing to join the party.', { target: target.name })}`;
                            }
                        } else {
                            result = this._label('explore.fuck.resists', '{target} is not in the mood.', { target: target.name });
                            affected = false;
                        }
                        break;
                    }
                    case 'feast': {
                        if (selectedSubAction) {
                            result = this._doSubAction('feast', selectedSubAction, actor, target, actorName, actor.name === this.player?.name ? '' : 's');
                            this._cleanupOutsideSubActionTarget(action, selectedSubAction, actor, target);
                            break;
                        }
                        if (actor === target) {
                            result = this._label('group.feast.selfBlocked', '{target} cannot feast on themself. Select other party members as actors to consume this target, or select {target} alone to feast on another target.', { target: target.name });
                            affected = false;
                            break;
                        }
                        const canEatOutside = this.cheats.canEatAnything || (actor.size >= target.size - 2 && actor.Feas + 5 > target.Flee);
                        if (canEatOutside) {
                            if (!this._canFitPrey(actor, target, 'stomach')) {
                                result = this._capacityFailureMessage(actor, target, 'stomach');
                                break;
                            }
                            this._containTargetIn(actor, target, 'stomach');
                            this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                            const owner = actor === this.player || actor.name === this.player?.name ? this._label('party.you', 'You') : actor.name;
                            result = this._label('explore.feast.swallow', '{actor} swallows {target} whole. They settle in {owner} stomach.', {
                                actor: actorName,
                                target: target.name,
                                owner
                            });
                        } else {
                            result = this._label('explore.feast.tooStrong', '{target} is too large or strong to eat.', { target: target.name });
                            affected = false;
                        }
                        break;
                    }
                    case 'flirt': {
                        let charm = this._AR(actor.Flir + (actor.cha || 10) * 0.5);
                        if (this.settings.sameSpeciesBonus && target.species === actor.species) {
                            charm += 3;
                        }
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        if (charm > resist) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.3));
                            target.charmed = (target.charmed || 0) + 1;
                            target.Figh = Math.max(1, (target.Figh || 10) - 1);
                            result = this._label('explore.flirt.success', '{actor} flirts with {target}. Their guard lowers. Pleasure rises to {current}/{max}.', {
                                actor: actorName,
                                target: target.name,
                                current: target.CPle,
                                max: target.MPle
                            });
                            if (target.charmed >= 3) {
                                result += ` ${this._label('explore.flirt.charmed', '{target} is utterly charmed and becomes friendly!', { target: target.name })}`;
                                target.disposition = this.DISPOSITION.FRIENDLY;
                                target.willing = true;
                            }
                            if (!this.party.includes(target) && this._canRecruit(actor, target)) {
                                result += ` ${this._label('explore.recruit.possible', '{target} may be willing to join the party.', { target: target.name })}`;
                            }
                        } else {
                            result = this._label('explore.flirt.rebuff', '{target} rebuffs the flirtation!', { target: target.name });
                            affected = false;
                        }
                        break;
                    }
                    case 'feed': {
                        if (selectedSubAction) {
                            result = this._doSubAction('feed', selectedSubAction, actor, target, actorName, actor.name === this.player?.name ? '' : 's');
                            this._cleanupOutsideSubActionTarget(action, selectedSubAction, actor, target);
                            break;
                        }
                        if (options.allowPartySacrifice !== false && this.party.includes(actor) && this.party.includes(target) && actor !== target && target.CPun >= target.MPun) {
                            result = this._feedPartyMemberToConsumer(actor, target);
                            break;
                        }
                        const healAmount = Math.floor((actor.Feed || 10) * 2);
                        target.CPun = Math.min(target.MPun, target.CPun + healAmount);
                        target.hunger = Math.max(0, (target.hunger || 0) - 25);
                        if (target.CPle < target.MPle * 0.5) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(healAmount * 0.5));
                        }
                        result = this._label('explore.feed.success', '{actor} feeds {target}, restoring {amount} punishment and sating their hunger.', {
                            actor: actorName,
                            target: target.name,
                            amount: healAmount
                        });
                        break;
                    }
                    case 'inspect': {
                        result = `${target.name} [${target.species}]: Punishment ${target.CPun}/${target.MPun}, Pleasure ${target.CPle}/${target.MPle}, Size ${target.size}, Appetite ${target.appetite}, Parts: ${target.parts || 'none'}, Chest: ${target.chest || 'none'}`;
                        break;
                    }
                }
                this.log.push({ text: result, type: 'discovery' });
                this.lastActionResolution = { action, actor, target, ok: affected, affected, message: result };
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                if (startCombatAfter) {
                    this.startCombat(combatTargets);
                    return true;
                }
                if (!this.combatState.active) this.renderExplorationActions();
                return affected;
            },

            _cleanupOutsideSubActionTarget(action, subAction, actor, target) {
                const containedTarget = target && target !== actor && (target.CPun <= 0 || target.alive === false);
                if (!containedTarget) return;
                const removesTarget = action === 'feast' || (action === 'feed' && ['sacrifice', 'forceFeed'].includes(subAction));
                if (!removesTarget) return;
                if (this.party.includes(target)) this._removeContainedPartyMember(target);
                else if (this.creatures.includes(target)) this._removeCreatureFromArea(target);
            },

            _findCorpseById(targetId) {
                return this.creatures.find(c => this._isCorpse(c) && String(c.id || c.name) === String(targetId));
            },

            _lootItemNameFromTable(tableId, namespace = 'loot-table', x = 0, y = 0, ...parts) {
                const table = this.EQUIPMENT_LOOT_TABLES[tableId];
                if (!table || table.length === 0) return null;
                return this._weightedPickWorld(table, namespace, x, y, tableId, ...parts);
            },

            lootCorpse(targetId) {
                const corpse = this._findCorpseById(targetId);
                if (!corpse) return false;
                let item = null;
                let gold = 0;
                if (!corpse.looted) {
                    const corpseKey = String(corpse.id || corpse.name || targetId || 'corpse');
                    const authoredLoot = corpse.lootTable ? this._lootItemNameFromTable(corpse.lootTable, 'corpse-authored-loot', 0, 0, corpseKey) : null;
                    if (authoredLoot && this.inventory.length < this.MAX_INVENTORY) {
                        item = { id: `loot_${corpseKey}`, name: authoredLoot };
                        this.inventory.push(item);
                    } else if (this.inventory.length < this.MAX_INVENTORY && this._worldChance('corpse-loot-item', 0, 0, 0.5, corpseKey)) {
                        const items = Object.keys(this.ITEMS);
                        const name = this._pickWorldList(items, 'corpse-loot-item-name', 0, 0, corpseKey);
                        item = { id: `loot_${corpseKey}`, name };
                        this.inventory.push(item);
                    }
                    const authoredGold = Number(corpse.goldLoot);
                    gold = Number.isFinite(authoredGold)
                        ? Math.max(0, Math.floor(authoredGold))
                        : Math.max(1, Math.floor((corpse.level || 1) * 2 + this._worldRoll('corpse-loot-gold', 0, 0, corpseKey) * 6));
                    if (gold > 0 && this.player) this.player.gold = (this.player.gold || 0) + gold;
                }
                corpse.looted = true;
                const rewards = [item ? item.name : null, gold > 0 ? `${gold} gold` : null].filter(Boolean).join(' and ');
                const text = CONTENT.actionResult('corpseLoot', {
                    target: corpse.corpseName || corpse.name,
                    item: rewards || null,
                    gold,
                    explicit: true,
                    voreEnabled: this.settings.vore
                });
                this.log.push({ text, type: item || gold > 0 ? 'loot' : 'discovery' });
                this.renderLog();
                this.renderCreatures();
                this.renderExplorationActions();
                this.autoSave();
                return true;
            },

            scavengeCorpse(targetId) {
                const corpse = this._findCorpseById(targetId);
                if (!corpse) return false;
                corpse.scavenged = true;
                this.player.hunger = Math.max(0, (this.player.hunger || 0) - 20);
                this.player.CPun = Math.min(this.player.MPun, this.player.CPun + 5);
                const text = CONTENT.actionResult('corpseScavenge', {
                    target: corpse.corpseName || corpse.name,
                    actor: this.player.name,
                    explicit: true,
                    voreEnabled: this.settings.vore
                });
                this.log.push({ text, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
                this.autoSave();
                return true;
            },

            recruitCreatureFromIndex(index) {
                return YAW_RECRUITMENT_FLOW.fromIndex(this, index);
            },

            recruitCreatureById(targetId) {
                return YAW_RECRUITMENT_FLOW.byId(this, targetId);
            },

            _confirmRecruitCreature(target) {
                return YAW_RECRUITMENT_FLOW.confirm(this, target);
            },

            recruitCreature(target, actor = this.player, options = {}) {
                return YAW_RECRUITMENT_FLOW.recruit(this, target, actor, options);
            },

            // ===== FLEE =====
            attemptFlee() {
                return YAW_COMBAT_MOBILITY.attemptFlee(this);
            },

            // ===== FEED ACTION =====
            executeFeedAction(actor = this.activeActor || this.player) {
                // Feed targets allies, not enemies - use sub-action picker for ally target
                actor = actor || this.activeActor || this.player;
                const allies = this.party.filter(p => p.CPun > 0 && p.name !== actor.name);
                const available = this._getAvailableSubActions('feed', actor, null);
                const validSubs = available.filter(s => s.available);
                if (allies.some(ally => ally.CPun < ally.MPun) && !validSubs.some(sub => sub.id === 'heal')) {
                    const healDef = this.SUB_ACTIONS.feed && this.SUB_ACTIONS.feed.heal;
                    validSubs.unshift({
                        id: 'heal',
                        label: this._getActionLabel('feed', 'heal'),
                        icon: healDef?.icon || '',
                        available: true,
                        setting: healDef?.setting || null
                    });
                }
                if (validSubs.length === 0) {
                    this.log.push({ text: this._label('feed.noOptions', 'No feed options available right now.'), type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
	                if (validSubs.length === 1) {
	                    this._executeFeedSubAction(validSubs[0].id, actor);
	                    return true;
	                }
                this.feedSelection = {
                    active: true,
                    actorId: this._unitSelectionId(actor),
                    subIds: validSubs.map(sub => sub.id)
                };
                this.targetSelection = null;
                this.syncSelection = null;
                this._renderInteractionState({ exploration: false, toolbelt: true });
                return true;
            },
            _executeFeedSubAction(subId, actor) {
                const subDef = this.SUB_ACTIONS.feed && this.SUB_ACTIONS.feed[subId];
                if (!subDef) return;
                this.defaultSubActions.feed = subId;
                const actorName = actor.name === this.player?.name ? 'You' : actor.name;
                const actorVerb = actor.name === this.player?.name ? '' : 's';
                let target = null;
                if (subId === 'heal' || subId === 'breastfeed') {
                    const allies = this.party.filter(p => p.CPun > 0 && p.name !== actor.name && p.CPun < p.MPun);
                    if (allies.length === 0) {
                        this.log.push({ text: this._label('feed.noWoundedAllies', 'No wounded allies to feed.'), type: 'combat' });
                        this.renderLog(); this.combatState.processing = false; this.nextTurn(); return;
                    }
                    target = allies.reduce((w, a) => (a.CPun / a.MPun < w.CPun / w.MPun) ? a : w, allies[0]);
                } else if (subId === 'sacrifice') {
                    const prey = this.party.filter(p => p.CPun > 0 && p.name !== actor.name && (p.livestock || p.willingPrey));
                    if (prey.length === 0) {
                        this.log.push({ text: this._label('feed.noWillingLivestock', 'No willing livestock to sacrifice.'), type: 'combat' });
                        this.renderLog(); this.combatState.processing = false; this.nextTurn(); return;
                    }
                    target = prey[0];
                } else if (subId === 'forceFeed') {
                    // Need to select target enemy and holder - simplified: pick random enemy and first available holder
                    const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                    if (enemies.length === 0) {
                        this.log.push({ text: this._label('feed.noForceFeedEnemies', 'No enemies to force-feed.'), type: 'combat' });
                        this.renderLog(); this.combatState.processing = false; this.nextTurn(); return;
                    }
                    target = enemies[0]; // actor is the predator, target is the prey to be forced into actor
                    // Actually for forceFeed, actor is the predator, target is the prey
                    // But we need a holder too. Let's just use the first available holder.
                }
                if (!target) {
                    this.log.push({ text: this._label('feed.noValidTarget', 'No valid target for this feed action.'), type: 'combat' });
                    this.renderLog(); this.combatState.processing = false; this.nextTurn(); return;
                }
                const result = this._doSubAction('feed', subId, actor, target, actorName, actorVerb);
                this.log.push({ text: result, type: 'heal' });
                this._emitCombatAction('feed', actor, target, result);
                this.feedSelection = null;
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.combatState.processing = false;
                this._sanitizeCombatState({ preserveTurn: true });
                this.nextTurn();
            },

            // ===== RANDOMIZER (AR) =====
            _AR(entry) {
                if (entry > 55) return Math.round(entry + (Math.random() * 21 - 10));
                if (entry > 45) return Math.round(entry + (Math.random() * 17 - 8));
                if (entry > 35) return Math.round(entry + (Math.random() * 13 - 6));
                if (entry > 25) return Math.round(entry + (Math.random() * 9 - 4));
                return Math.max(1, Math.round(entry + (Math.random() * 5 - 2)));
            },

            // ===== XP/LEVELING =====
            gainXP(amount) {
                if (!this.player) return;
                this.player.xp = Number.isFinite(this.player.xp) ? this.player.xp : 0;
                this.player.xpToNext = Number.isFinite(this.player.xpToNext) && this.player.xpToNext > 0 ? this.player.xpToNext : 100;
                this.player.xp += amount;
                while (this.player.xp >= this.player.xpToNext) {
                    this.player.xp -= this.player.xpToNext;
                    this.player.level++;
                    this.player.xpToNext = Math.floor(this.player.xpToNext * this.BALANCE.xpCurveMultiplier);
                    this.player.MPun += this.BALANCE.levelPunishmentGain; this.player.CPun = this.player.MPun;
                    this.player.MPle += this.BALANCE.levelPleasureGain;
                    for (const stat of ['Figh', 'Feas', 'Flir', 'Fuck', 'Flee', 'Feed', 'str', 'con', 'spd', 'int', 'wis', 'cha']) {
                        this.player[stat] += this.BALANCE.levelStatGain;
                    }
                    this.log.push({ text: this._label('perk.levelUp', 'Level up! You are now level {level}. All stats increased!', { level: this.player.level }), type: 'discovery' });
                    this._queuePerkChoice();
                }
                this.renderParty();
                if ((this.player.pendingPerkChoices || 0) > 0) this.showPerkSelection();
            },

            _queuePerkChoice() {
                if (!this.player) return;
                this.player.pendingPerkChoices = (this.player.pendingPerkChoices || 0) + 1;
                this.log.push({ text: this._label('perk.chooseNew', 'Choose a new perk from the perk tree.'), type: 'discovery' });
            },

            _perkTreeCount(treeId, unit = this.player) {
                return YAW_PERK_FLOW.treeCount(this, treeId, unit);
            },

            _hasPerk(perkId, unit = this.player) {
                return YAW_PERK_FLOW.hasPerk(this, perkId, unit);
            },

            _hasPerkEffect(effect, unit = this.player) {
                return YAW_PERK_FLOW.hasEffect(this, effect, unit);
            },

            _canChoosePerk(perk, treeId, unit = this.player) {
                return YAW_PERK_FLOW.canChoose(this, perk, treeId, unit);
            },

            _perkTreesForUnit(unit = this.player) {
                return YAW_PERK_FLOW.treesForUnit(this, unit);
            },

            _availablePerkChoices(unit = this.player) {
                return YAW_PERK_FLOW.availableChoices(this, unit);
            },

            _availablePerkTreeFilters(unit = this.player) {
                return YAW_PERK_FLOW.availableFilters(this, unit);
            },

            setPerkTreeFilter(filter) {
                return YAW_PERK_FLOW.setFilter(this, filter);
            },

            choosePerk(perkId) {
                return YAW_PERK_FLOW.choose(this, perkId);
            },

            _completePerkRespec() {
                return YAW_PERK_FLOW.completeRespec(this);
            },

            respecPerks(skipConfirm = false) {
                return YAW_PERK_FLOW.respec(this, skipConfirm);
            },

            debugGrantPerkChoice(count = 1) {
                return YAW_PERK_FLOW.debugGrant(this, count);
            },

            showPerkSelection() {
                return YAW_STATS_PANEL.showPerkSelection(this);
            },

            // ===== MERCHANTS / TRADE =====
            _normalizeMerchantStock(stock = []) {
                return YAW_MERCHANT_SYSTEM.normalizeStock(this, stock);
            },

            _merchantStockFromTable(tableId = 'general') {
                return YAW_MERCHANT_SYSTEM.stockFromTable(this, tableId);
            },

            _createStructureMerchant(structureId, biomeId = this.currentBiome || 'forest', tile = null) {
                return YAW_MERCHANT_SYSTEM.createStructureMerchant(this, structureId, biomeId, tile);
            },

            _maybeSpawnStructureMerchant(tile) {
                return YAW_MERCHANT_SYSTEM.maybeSpawnStructureMerchant(this, tile);
            },

            _questTemplateForStructure(structureId, tile = null) {
                return YAW_QUEST_FLOW.templateForStructure(this, structureId, tile);
            },

            _createStructureQuestGiver(structureId, tile) {
                return YAW_QUEST_FLOW.createStructureGiver(this, structureId, tile);
            },

            _maybeSpawnStructureQuestGiver(tile) {
                return YAW_QUEST_FLOW.maybeSpawnStructureGiver(this, tile);
            },

            _itemCategory(item) {
                return YAW_MERCHANT_SYSTEM.itemCategory(this, item);
            },

            _itemValue(item) {
                return YAW_MERCHANT_SYSTEM.itemValue(this, item);
            },

            _itemListOptions(prefix, targetId = null) {
                return YAW_MERCHANT_SYSTEM.itemListOptions(this, prefix, targetId);
            },

            _filterAndSortItemEntries(entries, filter = 'all', sort = 'name') {
                return YAW_MERCHANT_SYSTEM.filterAndSortItemEntries(this, entries, filter, sort);
            },

            _merchantStockQuantity(merchant, itemName, index, day) {
                return YAW_MERCHANT_SYSTEM.stockQuantity(this, merchant, itemName, index, day);
            },

            _defaultMerchantStock(merchant = null, day = this.dayCount || 0) {
                return YAW_MERCHANT_SYSTEM.defaultStock(this, merchant, day);
            },

            _refreshMerchantStock(merchant, force = false) {
                return YAW_MERCHANT_SYSTEM.refreshStock(this, merchant, force);
            },

            _findMerchantById(targetId) {
                return YAW_MERCHANT_SYSTEM.findById(this, targetId);
            },

            showTrade(targetId) {
                return YAW_TRADE_FLOW.show(this, targetId);
            },

            setTradeFilter(filter, targetId) {
                return YAW_TRADE_FLOW.setFilter(this, filter, targetId);
            },

            setTradeSort(sort, targetId) {
                return YAW_TRADE_FLOW.setSort(this, sort, targetId);
            },

            _requiresPurchaseConfirmation(item) {
                return YAW_TRADE_FLOW.requiresPurchaseConfirmation(this, item);
            },

            _cancelMerchantPurchase(targetId, itemName) {
                return YAW_TRADE_FLOW.cancelPurchase(this, targetId, itemName);
            },

            _completeMerchantPurchase(targetId, stockIndex) {
                return YAW_TRADE_FLOW.completePurchase(this, targetId, stockIndex);
            },

            buyFromMerchant(targetId, stockIndex) {
                return YAW_TRADE_FLOW.buy(this, targetId, stockIndex);
            },

            sellToMerchant(targetId, itemId) {
                return YAW_TRADE_FLOW.sell(this, targetId, itemId);
            },

            // ===== QUESTS =====
            _normalizeQuest(quest, giver = null) {
                return YAW_QUEST_FLOW.normalize(this, quest, giver);
            },

            _normalizeQuestObjective(objective = {}, questId = 'quest', index = 0) {
                return YAW_QUEST_FLOW.normalizeObjective(this, objective, questId, index);
            },

            _questObjectiveLabel(objective) {
                return YAW_QUEST_FLOW.objectiveLabel(this, objective);
            },

            _questRewardPreviewText(reward = {}) {
                return YAW_QUEST_FLOW.rewardPreviewText(this, reward);
            },

            _getQuestById(questId) {
                return YAW_QUEST_FLOW.byId(this, questId);
            },

            _getQuestGiverByKey(targetId) {
                return YAW_QUEST_FLOW.giverByKey(this, targetId);
            },

            acceptQuestFromUnit(targetId) {
                return YAW_QUEST_FLOW.acceptFromUnit(this, targetId);
            },

            previewQuestFromUnit(targetId) {
                return YAW_QUEST_FLOW.previewFromUnit(this, targetId);
            },

            showQuestPreview(quest, giver = null) {
                return YAW_QUEST_FLOW.showPreview(this, quest, giver);
            },

            acceptQuest(quest, giver = null) {
                return YAW_QUEST_FLOW.accept(this, quest, giver);
            },

            _questObjectiveMatches(type, payload, objective) {
                return YAW_QUEST_FLOW.objectiveMatches(this, type, payload, objective);
            },

            _nextQuestCheckpoint(objective) {
                return YAW_QUEST_FLOW.nextCheckpoint(this, objective);
            },

            _nextQuestObjectiveMarker(objective) {
                return YAW_QUEST_FLOW.nextObjectiveMarker(this, objective);
            },

            _updateQuestProgress(type, payload = {}) {
                return YAW_QUEST_FLOW.updateProgress(this, type, payload);
            },

            _grantQuestReward(quest) {
                return YAW_QUEST_FLOW.grantReward(this, quest);
            },

            turnInQuest(questId) {
                return YAW_QUEST_FLOW.turnIn(this, questId);
            },

            _questProgressText(quest) {
                return YAW_QUEST_PANEL.progressText(this, quest);
            },

            _questRoutePreviewText(objective) {
                return YAW_QUEST_PANEL.routePreviewText(this, objective);
            },

            _questCheckpointStateLabel(state) {
                return YAW_QUEST_PANEL.checkpointStateLabel(this, state);
            },

            _questCheckpointGuidance(checkpoint) {
                return YAW_QUEST_PANEL.checkpointGuidance(this, checkpoint);
            },

            _questRouteKnownTiles(checkpoint) {
                return YAW_QUEST_PANEL.routeKnownTiles(this, checkpoint);
            },

            _questRouteTerrainHint(checkpoint) {
                return YAW_QUEST_PANEL.routeTerrainHint(this, checkpoint);
            },

            focusQuestOnMap(questId, objectiveId) {
                return YAW_QUEST_FLOW.focusObjectiveOnMap(this, questId, objectiveId);
            },

            _questTurnInMarker(quest) {
                return YAW_QUEST_FLOW.turnInMarker(this, quest);
            },

            focusQuestTurnInOnMap(questId) {
                return YAW_QUEST_FLOW.focusTurnInOnMap(this, questId);
            },

            _filteredQuestEntries() {
                return YAW_QUEST_FLOW.filteredEntries(this);
            },

            _questLogControls() {
                return YAW_QUEST_PANEL.logControls(this);
            },

            _questStatusLabel(quest) {
                return YAW_QUEST_PANEL.statusLabel(this, quest);
            },

            _questMarkerPreview(marker, objective) {
                return YAW_QUEST_PANEL.markerPreview(this, marker, objective);
            },

            _questTurnInPreview(marker) {
                return YAW_QUEST_PANEL.turnInPreview(this, marker);
            },

            setQuestFilter(filter) {
                return YAW_QUEST_FLOW.setFilter(this, filter);
            },

            setQuestSort(sort) {
                return YAW_QUEST_FLOW.setSort(this, sort);
            },

            showQuestLog() {
                return YAW_QUEST_PANEL.showLog(this);
            },

            // ===== EQUIPMENT =====
            _getItemDef(item) {
                return YAW_EQUIPMENT_SYSTEM.itemDef(this, item);
            },

            _isEquippable(item) {
                return YAW_EQUIPMENT_SYSTEM.isEquippable(this, item);
            },

            _applyEquipmentBonus(unit, item, direction = 1) {
                return YAW_EQUIPMENT_SYSTEM.applyBonus(this, unit, item, direction);
            },

            _equipmentBonusTotals(unit) {
                return YAW_EQUIPMENT_SYSTEM.bonusTotals(this, unit);
            },

            _captureEquipmentBaseStats(unit, { inferBase = false } = {}) {
                return YAW_EQUIPMENT_SYSTEM.captureBaseStats(this, unit, { inferBase });
            },

            _applyEquipmentEffect(unit, item, direction = 1) {
                return YAW_EQUIPMENT_SYSTEM.applyEffect(this, unit, item, direction);
            },

            _hasEquipmentEffect(unit, effect) {
                return YAW_EQUIPMENT_SYSTEM.hasEffect(unit, effect);
            },

            _rebuildEquipmentEffects(unit) {
                return YAW_EQUIPMENT_SYSTEM.rebuildEffects(this, unit);
            },

            _recalculateEquipment(unit, { inferBase = false } = {}) {
                return YAW_EQUIPMENT_SYSTEM.recalculate(this, unit, { inferBase });
            },

            equipItem(itemId) {
                return YAW_INVENTORY_PANEL.equip(this, itemId);
            },

            unequipItem(slot) {
                return YAW_INVENTORY_PANEL.unequip(this, slot);
            },

            _equipmentSummary(unit = this.player) {
                return YAW_EQUIPMENT_SYSTEM.summary(this, unit);
            },
            _equipmentCompactSummary(unit = this.player) {
                return YAW_EQUIPMENT_SYSTEM.compactSummary(this, unit);
            },

            _equipmentBonusText(item) {
                return YAW_EQUIPMENT_SYSTEM.bonusText(this, item);
            },

            // ===== INVENTORY =====
            showInventory() {
                return YAW_INVENTORY_PANEL.show(this);
            },
            setInventoryFilter(filter) {
                return YAW_INVENTORY_PANEL.setFilter(this, filter);
            },
            setInventorySort(sort) {
                return YAW_INVENTORY_PANEL.setSort(this, sort);
            },
            useItem(itemId) { /* simplified */ },
            dropItem(itemId) {
                return YAW_INVENTORY_PANEL.drop(this, itemId);
            },

            // ===== RENDERING =====
            renderParty() {
                return YAW_PANEL_RENDERING.party(this);
            },
            showPartyPanelDetail(title, html) {
                return YAW_PANEL_RENDERING.showPartyDetail(this, title, html);
            },
            _centerHasPanelDetailLeak() {
                return YAW_PANEL_RENDERING.centerHasPanelDetailLeak();
            },
            _restoreCenterContextIfPanelDetailLeaked() {
                return YAW_PANEL_RENDERING.restoreCenterContextIfPanelDetailLeaked(this);
            },
            closePanelDetails(panel = 'party') {
                return YAW_PANEL_RENDERING.closeDetails(this, panel);
            },
            renderCreatures() {
                return YAW_PANEL_RENDERING.creatures(this);
            },
            showCreaturePanelDetail(title, html) {
                return YAW_PANEL_RENDERING.showCreatureDetail(this, title, html);
            },
            renderMobilePartyStrip() {
                return YAW_MOBILE_UNIT_STRIPS.party(this);
            },
            renderMobileCreatureStrip() {
                return YAW_MOBILE_UNIT_STRIPS.creatures(this);
            },
            _currentCombatActor() {
                if (!this.combatState?.active) return null;
                return this.combatState.turnQueue?.[this.combatState.currentTurn]?.unit || null;
            },
            _mobileCombatPrompt(actor = this._currentCombatActor()) {
                return YAW_MOBILE_COMBAT_TOOLBELT.prompt(this, actor);
            },
            renderMobileCombatToolbelt() {
                return YAW_MOBILE_COMBAT_TOOLBELT.render(this);
            },
            _unitBarPercent(current, max) {
                return YAW_UNIT_CARD_STATUS.barPercent(current, max);
            },
            _unitTacticalBar(key, label, icon, current, max) {
                return YAW_UNIT_CARD_STATUS.tacticalBar(this, key, label, icon, current, max);
            },
            _unitTacticalBars(unit, options = {}) {
                return YAW_UNIT_CARD_STATUS.tacticalBars(this, unit, options);
            },
            _unitVisibleTraits(unit, type, limit = 3) {
                return YAW_UNIT_CARD_STATUS.visibleTraits(this, unit, type, limit);
            },
            _unitTraitChips(unit, type, limit = 3) {
                return YAW_UNIT_CARD_STATUS.traitChips(this, unit, type, limit);
            },
            _unitSelectionRoles(unit, type) {
                return YAW_UNIT_SELECTION.roles(this, unit, type);
            },
            _unitSelectionClass(unit, type) {
                return YAW_UNIT_SELECTION.className(this, unit, type);
            },
            _targetMarkLabel() {
                return YAW_UNIT_SELECTION.targetMarkLabel(this);
            },
            _combatTargetPickLabel() {
                return YAW_UNIT_SELECTION.combatTargetPickLabel(this);
            },
            _selectionControlAttrs(kind, active = false) {
                return YAW_UNIT_SELECTION.controlAttrs(this, kind, active);
            },
            _unitSelectionRoleLabel(role) {
                return YAW_UNIT_SELECTION.roleLabel(this, role);
            },
            _unitCardFocusAttrs(unit, expanded = false) {
                return YAW_UNIT_SELECTION.focusAttrs(this, unit, expanded);
            },
            _unitActionRowAttrs(scope, unit = null) {
                return YAW_UNIT_SELECTION.actionRowAttrs(this, scope, unit);
            },
            _unitSelectionChips(unit, type) {
                return YAW_UNIT_SELECTION.chips(this, unit, type);
            },
            renderMobileUnitChip(unit, index, type) {
                return YAW_MOBILE_UNIT_CHIP.render(this, unit, index, type);
            },
            renderUnitCard(unit, index, type) {
                return YAW_UNIT_CARD.render(this, unit, index, type);
            },
            toggleUnit(index, type) {
                return YAW_PANEL_RENDERING.toggleUnit(this, index, type);
            },
            expandAll(type) {
                return YAW_PANEL_RENDERING.expandAll(this, type);
            },

            // ===== MAP RENDERING =====
            _isLargeMapKnown(x, y) {
                return YAW_LARGE_MAP.isKnown(this, x, y);
            },

            _resolveLargeMapTile(x, y) {
                return YAW_LARGE_MAP.resolveTile(this, x, y);
            },

            _largeMapPoiLabel(tile) {
                return YAW_LARGE_MAP.poiLabel(this, tile);
            },

            _largeMapQuestMarker(x, y) {
                return YAW_LARGE_MAP.questMarker(this, x, y);
            },
            _isRouteVisualTile(tile) {
                return YAW_MAP_VISUALS.isRouteVisualTile(tile);
            },
            _routeVisualShape(tile, resolver = null) {
                return YAW_MAP_VISUALS.routeVisualShape(this, tile, resolver);
            },
            _mapTileVisual(tile, options = {}) {
                return YAW_MAP_VISUALS.mapTileVisual(this, tile, options);
            },
            _tilesetAssetForKey(key) {
                return YAW_MAP_VISUALS.tilesetAssetForKey(key);
            },
            _mapTileAttrs(visual) {
                return YAW_MAP_VISUALS.mapTileAttrs(this, visual);
            },
            _interiorTileVisual(room = null, options = {}) {
                return YAW_MAP_VISUALS.interiorTileVisual(this, room, options);
            },

            setLargeMapZoom(delta) {
                return YAW_LARGE_MAP.setZoom(this, delta);
            },

            panLargeMap(dx, dy) {
                return YAW_LARGE_MAP.pan(this, dx, dy);
            },

            recenterLargeMap() {
                return YAW_LARGE_MAP.recenter(this);
            },

            renderLargeMap() {
                return YAW_LARGE_MAP.render(this);
            },

            _dangerPressureLabel(value = 0) {
                return YAW_MAP_VISUALS.dangerPressureLabel(this, value);
            },
            getTileMapSummary(tile = null) {
                return YAW_MAP_VISUALS.tileMapSummary(this, tile);
            },
            _tileInfoHtml(tile = null) {
                return YAW_MAP_VISUALS.tileInfoHtml(this, tile);
            },
            _centerTileContext() {
                return YAW_CENTER_CONTEXT.context(this);
            },
            renderTileInfo(tile = null) {
                return YAW_MAP_VISUALS.renderTileInfo(this, tile);
            },
            _desktopPlayCellHtml(visual, label) {
                return YAW_DESKTOP_PLAY_SURFACE.cellHtml(this, visual, label);
            },
            _directionLabel(dx, dy) {
                return YAW_DESKTOP_PLAY_SURFACE.directionLabel(this, dx, dy);
            },
            _updateDesktopCenterTile(visual, label) {
                return YAW_DESKTOP_PLAY_SURFACE.updateCenter(this, visual, label);
            },
            _updateDesktopPlayCell(el, visual, label, dx, dy, moveable = true) {
                return YAW_DESKTOP_PLAY_SURFACE.updateCell(this, el, visual, label, dx, dy, moveable);
            },
            renderDesktopPlaySurface() {
                return YAW_DESKTOP_PLAY_SURFACE.render(this);
            },

            renderMap() {
                return YAW_LOCAL_MAP.render(this);
            },

            // ===== SCENE / LOG =====
            _setRichSceneContent(title, html) {
                return YAW_SCENE_SHELL.setRichContent(this, title, html);
            },

            updateScene(title, description, inCombat) {
                return YAW_SCENE_SHELL.update(this, title, description, inCombat);
            },
            renderCenterTileActions() {
                return YAW_CENTER_CONTEXT.renderCenterActions(this);
            },
			            renderExplorationActions() {
		                this.renderCenterTileActions();
			            },
            showExplorationActions() {
                return YAW_CENTER_CONTEXT.showExplorationActions(this);
            },
            closeSceneDetails() {
                return YAW_SCENE_SHELL.closeDetails(this);
            },
            _escapeHtml(value) {
                return YAW_UI_TEXT.escapeHtml(value);
            },
            _currentCombatLogMeta(extra = {}) {
                return YAW_LOG_VIEW.currentCombatMeta(this, extra);
            },
            _pushLog(entry, type = 'discovery', meta = {}) {
                return YAW_LOG_VIEW.push(this, entry, type, meta);
            },
            _clearTileEvents() {
                return YAW_TILE_EVENT_FEED.clear(this);
            },
            _tileEventTimestamp() {
                return YAW_TILE_EVENT_FEED.timestamp(this);
            },
            _normalizeTileEventMeta(type = 'discovery', meta = {}) {
                return YAW_TILE_EVENT_FEED.normalizeMeta(this, type, meta);
            },
            _addTileEvent(text, type = 'discovery', meta = {}) {
                return YAW_TILE_EVENT_FEED.add(this, text, type, meta);
            },
            _tileEventFeedHtml() {
                return YAW_TILE_EVENT_FEED.html(this);
            },
            renderTileEvents() {
                return YAW_TILE_EVENT_FEED.render(this);
            },
            _logTimestamp(entry, indexFromEnd = 0) {
                return YAW_LOG_VIEW.timestamp(this, entry, indexFromEnd);
            },
            _logCategoryMeta(type = 'discovery') {
                return YAW_LOG_VIEW.categoryMeta(this, type);
            },
            _filteredLogEntries() {
                return YAW_LOG_VIEW.filteredEntries(this);
            },
            _allowedLogFilters() {
                return YAW_LOG_VIEW.allowedFilters();
            },
            _normalizeLogViewPreferences(input = {}) {
                return YAW_LOG_VIEW.normalizePreferences(this, input);
            },
            _applyLogViewPreferences(preferences = {}) {
                return YAW_LOG_VIEW.applyPreferences(this, preferences);
            },
            _logViewPreferencesForStorage() {
                return YAW_LOG_VIEW.preferencesForStorage(this);
            },
            loadLogViewPreferences() {
                return YAW_LOG_VIEW.loadPreferences(this);
            },
            saveLogViewPreferences() {
                return YAW_LOG_VIEW.savePreferences(this);
            },
            _applyLogLayoutState() {
                return YAW_LOG_VIEW.applyLayoutState(this);
            },
            toggleLogCollapsed() {
                return YAW_LOG_VIEW.toggleCollapsed(this);
            },
            toggleLogExpanded() {
                return YAW_LOG_VIEW.toggleExpanded(this);
            },
            setLogFilter(filter = 'all') {
                return YAW_LOG_VIEW.setFilter(this, filter);
            },
            setLogSearch(value = '') {
                return YAW_LOG_VIEW.setSearch(this, value);
            },
            exportLog() {
                return YAW_LOG_VIEW.export(this);
            },
		            renderLog() {
		                return YAW_LOG_VIEW.render(this);
		            },
            clearLog() { return YAW_LOG_VIEW.clear(this); },
            search() {
                return YAW_TILE_RESOURCES.search(this);
            },
            _canSearchHere(tile = this._currentExplorationTile()) {
                return YAW_TILE_RESOURCES.canSearchHere(this, tile);
            },
            _canTakeTileItems(tile = this._currentExplorationTile()) {
                return YAW_TILE_RESOURCES.canTakeTileItems(tile);
            },
            _tileItemLabel(item) {
                return YAW_TILE_RESOURCES.tileItemLabel(this, item);
            },
            _tileItemSummary(tile = this._currentExplorationTile()) {
                return YAW_TILE_RESOURCES.tileItemSummary(this, tile);
            },
            takeTileItems() {
                return YAW_TILE_RESOURCES.takeTileItems(this);
            },
            rest() {
                return YAW_STRUCTURE_NAVIGATION.rest(this);
            },

            // ===== SCREEN MANAGEMENT =====
            _focusableSelector() {
                return YAW_FOCUS_TRAP.focusableSelector();
            },
            _focusableChildren(container) {
                return YAW_FOCUS_TRAP.focusableChildren(container);
            },
            _focusFirstIn(container) {
                return YAW_FOCUS_TRAP.focusFirstIn(container);
            },
            _activateFocusTrap(container, options = {}) {
                return YAW_FOCUS_TRAP.activate(this, container, options);
            },
            _activateOutsideContextDismiss(container) {
                return YAW_FOCUS_TRAP.activateOutsideDismiss(this, container);
            },
            _restoreFocusTrap(options = {}) {
                return YAW_FOCUS_TRAP.restore(this, options);
            },
            showScreen(name) {
                this.screen = name;
                this._restoreFocusTrap({ restoreFocus: false });
                document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
                const el = document.getElementById('screen-' + name);
                if (el) { el.style.display = 'flex'; el.classList.add('active'); }
                if (name === 'game') {
                    document.getElementById('app').style.display = 'grid';
                    document.getElementById('screen-menu').style.display = 'none';
                    this.renderMap(); this.renderParty(); this.renderCreatures(); this.renderLog();
                } else if (name === 'menu') {
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('screen-menu').style.display = 'flex';
                    this.refreshContinueButton();
                } else if (name === 'create') {
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('screen-create').style.display = 'flex';
                    this.selectSpecies('human');
                } else if (name === 'settings') {
                    document.getElementById('app').style.display = 'none';
                    this.showSettings();
                    this.updateTierButtons();
                } else if (name === 'mods') {
                    document.getElementById('app').style.display = 'none';
                    if (typeof ModUI !== 'undefined' && ModUI.refreshModList) { try { ModUI.refreshModList(); } catch(e) {} }
                } else if (name === 'market') {
                    document.getElementById('app').style.display = 'none';
                    if (typeof MODULE_MARKETPLACE !== 'undefined' && MODULE_MARKETPLACE.ui && MODULE_MARKETPLACE.ui.showMarketplace) { try { MODULE_MARKETPLACE.ui.showMarketplace(); } catch(e) {} }
                } else if (name === 'save-manager') {
                    document.getElementById('save-manager').style.display = 'block';
                    document.getElementById('save-manager').classList.add('active');
                    this.renderSaveManager();
                }
                const overlayId = name === 'save-manager' ? 'save-manager' : ['settings', 'mods', 'market'].includes(name) ? `screen-${name}` : '';
                if (overlayId) this._activateFocusTrap(document.getElementById(overlayId), { close: () => this.returnToGame() });
            },
            returnToGame() {
                this._restoreFocusTrap();
                const returnScreen = this.settingsReturnScreen;
                this.settingsReturnScreen = null;
                ['screen-settings', 'screen-mods', 'screen-market', 'save-manager'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { el.style.display = 'none'; el.classList.remove('active'); }
                });
                if (returnScreen === 'create' && !this.player) {
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('screen-menu').style.display = 'none';
                    document.getElementById('screen-create').style.display = 'flex';
                    document.getElementById('screen-create').classList.add('active');
                    this.screen = 'create';
                    this.syncCreateContentLevel();
                    return;
                }
                if (this.player && this.player.CPun > 0) {
                    document.getElementById('screen-menu').style.display = 'none';
                    document.getElementById('app').style.display = 'grid';
                    document.getElementById('screen-game').style.display = 'flex';
                    document.getElementById('screen-game').classList.add('active');
                    this.screen = 'game';
                } else {
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('screen-menu').style.display = 'flex';
                    document.getElementById('screen-menu').classList.add('active');
                    this.screen = 'menu';
                    this.refreshContinueButton();
                }
            },
            showCharacterStats() {
                return YAW_STATS_PANEL.showCharacter(this);
            },
            cheats: { godMode: false, neverHungry: false, canEatAnything: false, overpowered: false },
            toggleCheat(cheat) {
                this.cheats[cheat] = !this.cheats[cheat];
                const isOn = this.cheats[cheat];
                this.log.push({ text: this._label('cheat.toggled', 'Cheat {name}: {state}', {
                    name: cheat,
                    state: this._label(isOn ? 'cheat.state.on' : 'cheat.state.off', isOn ? 'ON' : 'OFF')
                }), type: 'discovery' });
                if (cheat === 'overpowered' && isOn && this.player) {
                    this.player.Figh = 99; this.player.Feas = 99; this.player.Flir = 99;
                    this.player.Fuck = 99; this.player.Flee = 99; this.player.Feed = 99;
                    this.player.str = 99; this.player.con = 99; this.player.spd = 99;
                    this.player.int = 99; this.player.wis = 99; this.player.cha = 99;
                    this.player.MPun = 999; this.player.CPun = 999;
                    this.player.MPle = 999; this.player.CPle = 999;
                    this.log.push({ text: this._label('cheat.overpoweredMaxed', 'Overpowered! All stats maxed.'), type: 'discovery' });
                    this.renderParty();
                }
                this.renderLog();
                this.updateCheatButtons();
            },
            updateCheatButtons() {
                const btnStyle = (id, on) => {
                    const el = document.getElementById('cheat-' + id);
                    if (!el) return;
                    if (on) {
                        el.style.background = 'var(--accent-primary)';
                        el.style.color = 'var(--bg-primary)';
                        el.style.borderColor = 'var(--accent-primary)';
                    } else {
                        el.style.background = 'var(--bg-tertiary)';
                        el.style.color = 'var(--text-secondary)';
                        el.style.borderColor = 'var(--border-default)';
                    }
                };
                for (const [k, v] of Object.entries(this.cheats)) {
                    btnStyle(k, v);
                }
            },
            instantWin() {
                if (!this.combatState.active) {
                    this.log.push({ text: this._label('combat.instantWinNotInCombat', 'Not in combat! Instant Win only works during combat.'), type: 'combat' });
                    this.renderLog();
                    return;
                }
                if (!this.cheats.overpowered) {
                    this.log.push({ text: this._label('combat.instantWinRequiresOverpowered', 'Instant Win requires Overpowered mode.'), type: 'combat' });
                    this.renderLog();
                    return;
                }
                this.log.push({ text: `⚡ ${this._label('combat.instantWinSuccess', 'Instant Win! All enemies are defeated.')}`, type: 'combat' });
                this.renderLog();
                this.creatures.forEach(c => { if (c.disposition === this.DISPOSITION.ENEMY && this._isLivingCreature(c)) this._makeCorpse(c, 'fight'); });
                this._emitCombatAction('instant_win', this.player, null, 'success');
                this.endCombat(true);
            },
            clearAllData() {
                return YAW_SETTINGS_DATA_FLOW.clearAllData(this);
            },
            _deleteDatabase(dbName) {
                return YAW_STORAGE.deleteDatabase(dbName);
            },
            _deleteLegacyDatabase(dbName) {
                return YAW_STORAGE.deleteDatabaseIfExists(dbName);
            },
            _moduleDbName() {
                return (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM?.DB_NAME) || 'YAW_Modules';
            },
            _legacyModuleDbName() {
                return (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM?.LEGACY_DB_NAME) || 'FFFme_Modules';
            },
            _closeModuleDatabase() {
                if (typeof MODULE_SYSTEM !== 'undefined' && typeof MODULE_SYSTEM.closeDatabase === 'function') {
                    MODULE_SYSTEM.closeDatabase();
                }
            },
            async _clearAllDataConfirmed() {
                return YAW_SETTINGS_DATA_FLOW.clearAllDataConfirmed(this);
            },
            async deleteAllSaves() {
                return YAW_SETTINGS_DATA_FLOW.deleteAllSaves(this);
            },
            async _deleteAllSavesConfirmed() {
                return YAW_SETTINGS_DATA_FLOW.deleteAllSavesConfirmed(this);
            },
            selectEncounterPreference(val) { this.setEncounterPreferencePreset(val); },
            updateTierButtons() {
                return YAW_SETTINGS_FLOW.updateTierButtons(this);
            },
            _tierValue(tier) {
                return YAW_SETTINGS_FLOW.tierValue(tier);
            },
            _tierName(value = CONTENT.preferences.maxTier) {
                return YAW_SETTINGS_FLOW.tierName(this, value);
            },
            _defaultSettings() {
                return YAW_SETTINGS_FLOW.defaultSettings();
            },
            _settingsBooleanKeys() {
                return YAW_SETTINGS_FLOW.booleanKeys();
            },
            _normalizeSettings(input = {}, base = this.settings) {
                return YAW_SETTINGS_FLOW.normalize(this, input, base);
            },
            _settingsForStorage() {
                return YAW_SETTINGS_FLOW.forStorage(this);
            },
            setContentTier(tier) {
                return YAW_SETTINGS_FLOW.setContentTier(this, tier);
            },
            enforceContentTierSettings() {
                return YAW_SETTINGS_FLOW.enforceContentTierSettings(this);
            },
            enforceModuleContentPolicy() {
                return YAW_SETTINGS_FLOW.enforceModuleContentPolicy(this);
            },
            syncSettingVisibility() {
                return YAW_SETTINGS_FLOW.syncSettingVisibility(this);
            },
            syncCreateContentLevel() {
                return YAW_SETTINGS_FLOW.syncCreateContentLevel(this);
            },
            openContentSettingsFromCreate() {
                return YAW_SETTINGS_FLOW.openContentSettingsFromCreate(this);
            },
            saveSettings() {
                return YAW_SETTINGS_FLOW.save(this);
            },
            updateLanguage(language) {
                return YAW_SETTINGS_FLOW.updateLanguage(this, language);
            },
            syncLanguageControl() {
                return YAW_SETTINGS_FLOW.syncLanguageControl(this);
            },
            updateAccessibilitySetting(key, value) {
                return YAW_SETTINGS_FLOW.updateAccessibilitySetting(this, key, value);
            },
            applyAccessibilitySettings() {
                return YAW_SETTINGS_FLOW.applyAccessibilitySettings(this);
            },
            syncAccessibilityControls() {
                return YAW_SETTINGS_FLOW.syncAccessibilityControls(this);
            },
            showSettings() {
                return YAW_SETTINGS_FLOW.show(this);
            },
            showNewGameManager() { return YAW_SAVE_SLOT_FLOW.showNewGameManager(this); },
            showSaveManager(mode = 'load') {
                return YAW_SAVE_SLOT_FLOW.showManager(this, mode);
            },
            _slotDisplayLabel(slotName) {
                return YAW_SAVE_SLOT_FLOW.slotDisplayLabel(this, slotName);
            },
            beginNewGameInSlot(slotName) {
                return YAW_SAVE_SLOT_FLOW.beginNewGameInSlot(this, slotName);
            },
            _startNewGameInSlot(slotName) {
                return YAW_SAVE_SLOT_FLOW.startNewGameInSlot(this, slotName);
            },
            renderSaveManager(mode = this.saveManagerMode || 'load') {
                return YAW_SAVE_MANAGER.render(this, mode);
            },
            showModScreen() { ModUI.showModScreen(); },
            showMarketScreen() { this.showScreen('market'); },
            showTutorial() {
                this.tutorialStep = 0;
                const overlay = document.getElementById('tutorial-overlay');
                overlay.style.display = 'flex';
                this._activateFocusTrap(overlay, { close: () => this.closeTutorial() });
                this.nextTutorial();
            },
            closeTutorial() {
                const overlay = document.getElementById('tutorial-overlay');
                if (overlay) overlay.style.display = 'none';
                this._restoreFocusTrap();
            },
            nextTutorial() {
                const steps = [
                    { titleKey: 'ui.tutorial.welcome.title', contentKey: 'ui.tutorial.welcome.content', title: 'Welcome', content: 'You are wild in a strange living world. Explore, learn your limits, and grow stronger. Choose your risks carefully.' },
                    { titleKey: 'ui.tutorial.combat.title', contentKey: 'ui.tutorial.combat.content', title: 'Combat', content: 'In combat, you take turns with enemies and allies. Use Fight, Flirt, Fuck, Feast, Feed, or Flee. Sync actions let multiple allies act together.' },
                    { titleKey: 'ui.tutorial.feast.title', contentKey: 'ui.tutorial.feast.content', title: 'Feast', content: 'Feast on weakened targets to contain them. Capacity matters, and some settings change whether outcomes are safe or harsher.' },
                    { titleKey: 'ui.tutorial.party.title', contentKey: 'ui.tutorial.party.content', title: 'Party', content: 'Recruit willing creatures, assign roles, choose AI orders, and manage who acts in exploration or combat.' },
                    { titleKey: 'ui.tutorial.ready.title', contentKey: 'ui.tutorial.ready.content', title: 'Ready', content: 'Start exploring when you are ready. Use the map, party, and creature panels to keep the flow manageable.' }
                ];
                if (this.tutorialStep >= steps.length) {
                    this.closeTutorial();
                    return;
                }
                const step = steps[this.tutorialStep];
                document.getElementById('tutorial-title').textContent = this._label(step.titleKey, step.title);
                document.getElementById('tutorial-content').textContent = this._label(step.contentKey, step.content);
                this.tutorialStep++;
            },
            skipTutorial() { this.closeTutorial(); },
            continueLastGame() { return this.loadLastPlayed(); },
            executeCombatIntent(action, actor = this.activeActor || this._currentCombatActor()) {
                return YAW_COMBAT_INTENTS.execute(this, action, actor);
            },
            combatAction(action) {
                return this.executeCombatIntent(action, this.activeActor || this.player);
            },
            togglePanel(p) {
                return YAW_PANEL_SHELL.toggle(this, p);
            },
            toggleDesktopMapPanel(panel) {
                return YAW_PANEL_SHELL.toggleDesktopMap(this, panel);
            },
            focusDesktopPanel(p) {
                return YAW_PANEL_SHELL.focusDesktopPanel(this, p);
            },
            closeAllPanels() {
                return YAW_PANEL_SHELL.closeAll(this);
            },
            syncPanelBackdrop() {
                return YAW_PANEL_SHELL.syncBackdrop(this);
            },
            _haptic(pattern = 12) {
                return YAW_MOBILE_GESTURES.haptic(pattern);
            },
            _touchDistance(touches) {
                return YAW_MOBILE_GESTURES.touchDistance(touches);
            },
            handleMapTouchStart(e) {
                return YAW_MOBILE_GESTURES.handleMapTouchStart(this, e);
            },
            handleMapTouchMove(e) {
                return YAW_MOBILE_GESTURES.handleMapTouchMove(this, e);
            },
            handleMapTouchEnd() {
                return YAW_MOBILE_GESTURES.handleMapTouchEnd(this);
            },
            applyMobileMapZoom() {
                return YAW_MOBILE_GESTURES.applyMobileMapZoom(this);
            },
            startMobileCreaturePress(e, targetId) {
                return YAW_MOBILE_GESTURES.startCreaturePress(this, targetId);
            },
            cancelMobileCreaturePress() {
                return YAW_MOBILE_GESTURES.cancelCreaturePress(this);
            },
            startMobilePartyPress(e, index) {
                return YAW_MOBILE_GESTURES.startPartyPress(this, index);
            },
            cancelMobilePartyPress() {
                return YAW_MOBILE_GESTURES.cancelPartyPress(this);
            },
            _intentCommand(type, targetRef, action, subAction = null, source = 'sheet') {
                return YAW_INTERACTION_DISPATCH.intentCommand(this, type, targetRef, action, subAction, source);
            },
            _intentTarget(type, targetRef) {
                return YAW_INTERACTION_DISPATCH.intentTarget(this, type, targetRef);
            },
            _intentMenuSurface(source = 'sheet', presentation = 'sheet') {
                return YAW_INTENT_MENU.surface(source, presentation);
            },
            showIntentMenu(type, targetRef, source = 'sheet', presentation = 'sheet') {
                return YAW_INTENT_MENU.show(this, type, targetRef, source, presentation);
            },
            showRadialIntentMenu(type, targetRef, source = 'radial') {
                return this.showIntentMenu(type, targetRef, source, 'radial');
            },
            openIntentSubActionSheet(type, targetRef, action, source = 'sheet') {
                return YAW_INTENT_MENU.openSubActionSheet(this, type, targetRef, action, source);
            },
            selectIntent(type, targetRef, action, source = 'sheet', subAction = null) {
                return YAW_INTERACTION_DISPATCH.selectIntent(this, type, targetRef, action, source, subAction);
            },
            closeIntentMenu() {
                return YAW_INTENT_MENU.close(this);
            },
            closeMobileContextMenu() {
                return this.closeIntentMenu();
            },
            showConfirmDialog(options = {}) {
                return YAW_DIALOG_FLOW.showConfirm(this, options);
            },
            resolveConfirmDialog(confirmed) {
                return YAW_DIALOG_FLOW.resolveConfirm(this, confirmed);
            },
            closeConfirmDialog(options = {}) {
                return YAW_DIALOG_FLOW.closeConfirm(this, options);
            },
            showSaveRecoveryDialog(slotName, saveData) {
                return YAW_DIALOG_FLOW.showSaveRecovery(this, slotName, saveData);
            },
            async resolveSaveRecoveryDialog(action, fallbackSlotName = null, fallbackSaveData = null) {
                return YAW_DIALOG_FLOW.resolveSaveRecovery(this, action, fallbackSlotName, fallbackSaveData);
            },
            closeSaveRecoveryDialog(options = {}) {
                return YAW_DIALOG_FLOW.closeSaveRecovery(this, options);
            },
            _downloadSaveBackup(slotName, saveData) {
                return YAW_DIALOG_FLOW.downloadSaveBackup(slotName, saveData);
            },
            showMobilePartyContext(index) {
                return YAW_MOBILE_CONTEXT_MENU.showParty(this, index);
            },
            mobilePartyContextAction(action, index) {
                return YAW_MOBILE_CONTEXT_MENU.partyAction(this, action, index);
            },
            mobilePartyContextSetRole(index, role) {
                return YAW_MOBILE_CONTEXT_MENU.setPartyRole(this, index, role);
            },
            mobilePartyContextSetAIOrder(index, order) {
                return YAW_MOBILE_CONTEXT_MENU.setPartyAIOrder(this, index, order);
            },
            showMobileCreatureContext(targetId) {
                return YAW_MOBILE_CONTEXT_MENU.showCreature(this, targetId);
            },
            mobileCreatureContextAction(action, targetId) {
                return YAW_MOBILE_CONTEXT_MENU.creatureAction(this, action, targetId);
            },
            handleTouchStart(e) {
                return YAW_MOBILE_GESTURES.handleTouchStart(this, e);
            },
            handleTouchEnd(e) {
                return YAW_MOBILE_GESTURES.handleTouchEnd(this, e);
            },

            // ===== SAVE / LOAD =====
            _saveSlotNames() {
                return YAW_SAVE_METADATA.slotNames();
            },
            _normalizeSaveSlotName(slotName, fallback = 'slot1') {
                return YAW_SAVE_METADATA.normalizeSlotName(slotName, fallback);
            },
            _normalizeSaveTimestamp(value) {
                return YAW_SAVE_METADATA.normalizeTimestamp(value);
            },
            async _findLatestExistingSaveSlot() {
                return YAW_SAVE_METADATA.findLatestExistingSlot(this);
            },
            async _syncLastSaveSlot() {
                return YAW_SAVE_METADATA.syncLastSlot(this);
            },
            async refreshContinueButton() {
                return YAW_SAVE_METADATA.refreshContinueButton(this);
            },
            async checkLastPlayed() {
                return YAW_SAVE_METADATA.checkLastPlayed(this);
            },
            _writeCombatRefreshSnapshot(slotName = this.activeSlot) {
                return YAW_COMBAT_SAVE_STATE.writeRefreshSnapshot(this, slotName);
            },
            _readCombatRefreshSnapshot(slotName = this.activeSlot) {
                return YAW_COMBAT_SAVE_STATE.readRefreshSnapshot(this, slotName);
            },
            _clearCombatRefreshSnapshot(slotName = this.activeSlot) {
                return YAW_COMBAT_SAVE_STATE.clearRefreshSnapshot(this, slotName);
            },
            async autoSave() {
                return YAW_SAVE_PERSISTENCE.autoSave(this);
            },
            async saveToSlot(slotName) {
                return YAW_SAVE_SLOT_FLOW.saveToSlot(this, slotName);
            },
            async _saveToSlotConfirmed(slotName) {
                return YAW_SAVE_SLOT_FLOW.saveToSlotConfirmed(this, slotName);
            },
            async loadFromSlot(slotName) {
                return YAW_SAVE_LOAD_FLOW.loadFromSlot(this, slotName);
            },
            _restoreWorldState(loaded) {
                return YAW_WORLD_STATE.restoreWorldState(this, loaded);
            },
            _restoreCombatState(savedCombat) {
                return YAW_COMBAT_SAVE_STATE.restoreCombatState(this, savedCombat);
            },
            _resumeLoadedCombat() {
                return YAW_COMBAT_SAVE_STATE.resumeLoadedCombat(this);
            },
            async loadLastPlayed() {
                return YAW_SAVE_LOAD_FLOW.loadLastPlayed(this);
            },
            async deleteSlot(slotName) {
                return YAW_SAVE_SLOT_FLOW.deleteSlot(this, slotName);
            },
            async _deleteSlotConfirmed(slotName) {
                return YAW_SAVE_SLOT_FLOW.deleteSlotConfirmed(this, slotName);
            },
            async _dbOpen(dbName = this.SAVE_DB_NAME) { return YAW_STORAGE.dbOpen(this, dbName); },
            async _dbPut(store, key, value) { return YAW_STORAGE.dbPut(this, store, key, value); },
            async _dbGet(store, key) { return YAW_STORAGE.dbGet(this, store, key); },
            async _dbDelete(store, key) { return YAW_STORAGE.dbDelete(this, store, key); },
            async _worldDbOpen() {
                return YAW_WORLD_STORE.dbOpen(this);
            },
            async persistWorldStateToMapStore() {
                return YAW_WORLD_STORE.persist(this);
            },
            async loadWorldStateFromMapStore() {
                return YAW_WORLD_STORE.load(this);
            },
        };

        // Window helpers
        window.App = App;
        window.explore = () => App.search();
        window.search = () => App.search();
        window.rest = () => App.rest();
        window.togglePanel = p => App.togglePanel(p);
        window.expandAll = t => App.expandAll(t);
        window.combatAction = a => App.combatAction(a);
        window.showTutorial = () => App.showTutorial();
        window.nextTutorial = () => App.nextTutorial();
        window.skipTutorial = () => App.skipTutorial();
        window.clearLog = () => App.clearLog();
        window.createCharacter = () => App.createCharacter();
        window.move = (dx, dy) => App.move(dx, dy);
        window.returnToGame = () => App.returnToGame();
        document.addEventListener('DOMContentLoaded', () => App.init());
