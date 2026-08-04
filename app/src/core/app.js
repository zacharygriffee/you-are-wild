
        // =============================================
        // CORE ACTION MECHANICS
        // =============================================

        const App = {
            // === CONSTANTS ===
            GAME_MODE: { NORMAL: 'normal', COMBAT: 'combat' },
            DISPOSITION: { ENEMY: 'enemy', NEUTRAL: 'neutral', FRIENDLY: 'friendly', PARTY: 'party', CORPSE: 'corpse', QUEST_GIVER: 'quest_giver', MERCHANT: 'merchant' },
            ACTION: { FIGHT: 'fight', FLIRT: 'flirt', FEAST: 'feast', FUCK: 'fuck', FEED: 'feed', FLEE: 'flee', SYNC_FIGHT: 'sync_fight', SYNC_FUCK: 'sync_fuck', SYNC_FEED: 'sync_feed', PROTECT: 'protect', RETREAT_COVER: 'retreat_cover' },
            UI_LABELS: {
                fight: 'Fight',
                flirt: 'Talk',
                feast: 'Eat',
                fuck: 'Play',
                feed: 'Feed',
                flee: 'Flee',
                search: 'Search',
                rest: 'Rest',
                setSafePlace: 'Set Home',
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
                narration: { label: 'Narration', icon: '📖' },
                error: { label: 'Error', icon: '⚠️' },
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
                    sand: 'terrain-sand',
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
                    't-n': 'route-road-t-north',
                    't-e': 'route-road-t-east',
                    't-s': 'route-road-t-south',
                    't-w': 'route-road-t-west',
                    end: 'route-road-end'
                },
                bridges: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.bridges : {}),
                    'east-west': 'route-bridge-horizontal',
                    'north-south': 'route-bridge-vertical'
                },
                shorelines: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.shorelines : {}),
                    north: 'shoreline-water-north',
                    east: 'shoreline-water-east',
                    south: 'shoreline-water-south',
                    west: 'shoreline-water-west'
                },
                effects: {
                    ...(typeof globalThis !== 'undefined' && globalThis.AssetManifest ? globalThis.AssetManifest.tileKeys.effects : {}),
                    dangerInfluence: 'state-danger-influence'
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
                    cave: 'structure-cave',
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
            PARTY_DUTIES: YAW_COMPANION_BEHAVIOR.DUTIES,
            PARTY_STANCES: YAW_COMPANION_BEHAVIOR.STANCES,
            PARTY_CONTROLS: YAW_COMPANION_BEHAVIOR.CONTROLS,
            PARTY_PREFERRED_ROWS: YAW_COMPANION_BEHAVIOR.PREFERRED_ROWS,
            MULTI_TARGET_TECHNIQUES: {
                sweep: { id: 'sweep', actions: ['fight'], recovery: 0.25, maxTargets: 3 },
                multiStrike: { id: 'multiStrike', actions: ['fight'], recovery: 0.4, maxTargets: 4 },
                areaAttack: { id: 'areaAttack', actions: ['fight'], area: true }
            },
            SUB_ACTIONS: YAW_SUB_ACTIONS.definitions,
            defaultSubActions: YAW_SUB_ACTIONS.defaultActions(),
            _getDefaultSubAction(action) {
                return YAW_SUB_ACTIONS.getDefault(this, action);
            },
            _getAvailableSubActions(action, actor, target) {
                return YAW_SUB_ACTIONS.available(this, action, actor, target);
            },
            _resolveActionVariants(action, context = {}) {
                return YAW_SUB_ACTIONS.resolve(this, action, context);
            },
            _assessFeastAttempt(actor, target, options = {}) {
                return YAW_SUB_ACTIONS.feastAttemptAssessment(this, actor, target, options);
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
            _mlabel(key, fallback, vars = {}) {
                return YAW_UI_TEXT.mlabel(this, key, fallback, vars);
            },
            _uiLabel(key) {
                return YAW_UI_TEXT.uiLabel(this, key);
            },
            _combatActionLabel(action) {
                return action === 'feast'
                    ? this._label('action.feast.menu', 'Feast')
                    : this._uiLabel(action);
            },
            _escapeJsString(value) {
                return String(value ?? '').replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            },
            _unitKey(unit) {
                return this._escapeJsString(unit?.id || unit?.name || '');
            },
            _actorNameAndVerb(actor) {
                const isPlayer = actor && actor.name === this.player?.name;
                return { actorName: isPlayer ? this._label('party.you', 'You') : actor?.name || 'Someone', actorVerb: isPlayer ? '' : 's' };
            },
            _iconActionButton(key, icon, onclick, extraClass = '', attrs = '') {
                return YAW_ACTION_UI.iconButton(this, key, icon, onclick, extraClass, attrs);
            },
            _combatIntentButton(key, actor, extraClass = '') {
                return YAW_ACTION_UI.combatIntentButton(this, key, actor, extraClass);
            },
            _actionLegend(keys) {
                return YAW_ACTION_UI.legend(this, keys);
            },
            _sortActionEntries(entries) {
                return YAW_ACTION_UI.sortActionEntries(entries);
            },
            applyStaticLocalization(root = document) {
                return YAW_UI_TEXT.applyStaticLocalization(this, root);
            },
            _actionIcon(key) {
                return YAW_ACTION_UI.icon(key);
            },
            _multiInteractionProfile(action) {
                return YAW_MULTI_INTERACTION.profile(action);
            },
            _multiInteractionEffect(actor, action, targetCount = 1, options = {}) {
                return YAW_MULTI_INTERACTION.effect(this, actor, action, targetCount, options);
            },
            _multiInteractionScaleValue(value, effect, options = {}) {
                return YAW_MULTI_INTERACTION.scaleValue(value, effect, options);
            },
            _multiInteractionPreview(action, actors = [], targets = []) {
                return YAW_MULTI_INTERACTION.preview(this, action, actors, targets);
            },
            _multiInteractionCurrentPreview(action) {
                return YAW_MULTI_INTERACTION.currentPreview(this, action);
            },
            _awardMultiInteractionPractice(actors, action, targets = [], options = {}) {
                return YAW_MULTI_INTERACTION.awardPractice(this, actors, action, targets, options);
            },
            _multiInteractionOutcomeText(action, actors = [], targets = []) {
                return YAW_MULTI_INTERACTION.outcomeText(this, action, actors, targets);
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
            _sleepSystemEnabled() {
                return YAW_TIME_SYSTEM.sleepEnabled();
            },
            _contextActionKeys() {
                return YAW_CENTER_CONTEXT.actionKeys(this);
            },
            _contextActionButton(key) {
                return YAW_CENTER_CONTEXT.actionButton(this, key);
            },
            _renderContextActions() {
                return YAW_CENTER_CONTEXT.renderActions(this);
            },
            _buildInteractionCommand(context = {}) {
                return YAW_INTERACTION_DISPATCH.buildCommand(this, context);
            },
            _buildInteractionPlan(context = {}) {
                return YAW_INTERACTION_PLAN.build(this, context);
            },
            _currentInteractionPlan() {
                return YAW_INTERACTION_STATE.currentPlan(this);
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
            renderSelectionSentence() {
                return YAW_INTERACTION_STATE.renderSelectionSentence(this);
            },
            handleComposerSlotClick(slot) {
                return YAW_INTERACTION_STATE.handleSlotClick(this, slot);
            },
            clearComposerSlot(slot) {
                return YAW_INTERACTION_STATE.clearSlot(this, slot);
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
            _isCombatPlanActive() {
                return YAW_COMBAT_PLANNING.isActive(this);
            },
            _combatPlanActors() {
                return YAW_COMBAT_PLANNING.actors(this);
            },
            _isCombatPlanActor(unit) {
                return YAW_COMBAT_PLANNING.isActorSelected(this, unit);
            },
            toggleCombatPlanActor(id) {
                return YAW_COMBAT_PLANNING.toggleActor(this, id);
            },
            setCombatPlanIntent(action) {
                return YAW_COMBAT_PLANNING.setIntent(this, action);
            },
            clearCombatPlanIntent() {
                return YAW_COMBAT_PLANNING.clearIntent(this);
            },
            confirmCombatPlan(forceChoose = false) {
                return YAW_COMBAT_PLANNING.confirm(this, { forceChoose });
            },
            clearCombatPlan(reason = 'cancel') {
                return YAW_COMBAT_PLANNING.clear(this, reason);
            },
            _combatPlanControls(options = {}) {
                return YAW_COMBAT_PLANNING.controls(this, options);
            },
            _combatPendingIntent() {
                return YAW_COMBAT_PLANNING.pendingIntent(this);
            },
            executeQuickCombatIntentOnTarget(action, targetId) {
                return YAW_COMBAT_PLANNING.quickTargetClick(this, action, targetId);
            },
            _isCombatGroupCompose() {
                return YAW_COMBAT_SYNC.isSlotCompose(this);
            },
            clearCombatGroupCompose(reason = 'cancel') {
                return YAW_COMBAT_SYNC.clearSlotCompose(this, reason);
            },
            normalizeCombatGroupCompose() {
                return YAW_COMBAT_SYNC.normalizeSlotCompose(this);
            },
            combatGroupComposeStatus() {
                return YAW_COMBAT_SYNC.status(this);
            },
            _combatGroupComposeControls() {
                return YAW_COMBAT_SYNC.composeControls(this);
            },
            toggleCombatGroupParticipant(id) {
                return YAW_COMBAT_SYNC.toggleSlotParticipant(this, id);
            },
            queueCombatGroupIntent(action, options = {}) {
                return YAW_COMBAT_SYNC.queueSlotIntent(this, action, options);
            },
            _isCurrentCombatActor(unit) {
                return YAW_COMBAT_ACTOR_STATE.isCurrent(this, unit);
            },
            _combatProgressState() {
                return YAW_COMBAT_ACTOR_STATE.progressState(this);
            },
            _recoverCombatProgress(reason = 'unknown') {
                return YAW_COMBAT_ACTOR_STATE.recoverProgress(this, reason);
            },
            _clearCenterActionsForCombat() {
                return YAW_SCENE_SHELL.clearCenterActionsForCombat(this);
            },
            _combatActionButtons(actor, options = {}) {
                return YAW_COMBAT_ACTIONS.actionButtons(this, actor, options);
            },
            renderDesktopCombatComposer(actor) {
                return YAW_COMBAT_ACTIONS.renderDesktopComposer(this, actor);
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
            SPECIES_BASE_STATS: {},
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
                adultEligibility: 'unknown',
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
                'Healing Herb': { id: 'core:healing_herb', type: 'consumable', purpose: 'use', stackable: true, maxStack: 20, acquisition: { searchWeight: 8 }, icon: '🌿', effect: 'heal', healAmount: 30, value: 30, desc: 'Restores 30 condition' },
                'Shiny Gem': { id: 'core:shiny_gem', type: 'valuable', purpose: 'trade', stackable: true, maxStack: 20, acquisition: { searchWeight: 1 }, icon: '💎', effect: 'sell', value: 50, desc: 'Trade good worth 50 gold' },
                'Strange Mushroom': { id: 'core:strange_mushroom', type: 'consumable', purpose: 'use', stackable: true, maxStack: 20, acquisition: { searchWeight: 3 }, icon: '🍄', effect: 'heal', healAmount: 50, value: 50, desc: 'Restores 50 condition' },
                'Old Coin': { id: 'core:old_coin', type: 'valuable', purpose: 'trade', stackable: true, maxStack: 20, acquisition: { searchWeight: 8 }, icon: '🪙', effect: 'sell', value: 10, desc: 'Trade good worth 10 gold' },
                'Monster Fang': { id: 'core:monster_fang', type: 'material', purpose: 'trade', stackable: true, maxStack: 20, acquisition: { searchWeight: 5 }, icon: '🦷', effect: 'craft', value: 25, desc: 'Trade good worth 25 gold' },
                'Crystal Shard': { id: 'core:crystal_shard', type: 'material', purpose: 'trade', stackable: true, maxStack: 20, acquisition: { searchWeight: 2 }, icon: '💠', effect: 'craft', value: 40, desc: 'Trade good worth 40 gold' },
                'Vial of Venom': { id: 'core:vial_of_venom', type: 'valuable', purpose: 'trade', stackable: true, maxStack: 20, acquisition: { searchWeight: 2 }, icon: '🧪', effect: 'sell', futureEffect: 'damage', value: 40, desc: 'Sealed trade good worth 40 gold' },
                'Enchanted Berry': { id: 'core:enchanted_berry', type: 'valuable', purpose: 'trade', stackable: true, maxStack: 20, acquisition: { searchWeight: 5 }, icon: '🫐', effect: 'sell', futureEffect: 'buff', value: 5, desc: 'Unstable trade good worth 5 gold' },
                'Sealed Parcel': { id: 'core:sealed_parcel', type: 'quest', purpose: 'quest', stackable: false, icon: '📦', questItem: true, acquisition: { questArchetypes: ['deliver'] }, value: 0, desc: 'A protected delivery for an active quest' },
                'Waystone Sigil': { id: 'core:waystone_sigil', type: 'key', purpose: 'key', stackable: false, icon: '🔑', keyItem: true, acquisition: { questArchetypes: ['recover'] }, value: 0, desc: 'A protected objective recovered for an active quest' },
                'Leather Cap': { id: 'core:leather_cap', type: 'equipment', purpose: 'equip', stackable: false, icon: '🎩', slot: 'head', equipBonus: { con: 1 }, value: 20, desc: 'Headwear. CON +1' },
                'Hide Armor': { id: 'core:hide_armor', type: 'equipment', purpose: 'equip', stackable: false, icon: '🦺', slot: 'body', equipBonus: { con: 3 }, value: 60, desc: 'Body armor. CON +3' },
                'Clawed Gloves': { id: 'core:clawed_gloves', type: 'equipment', purpose: 'equip', stackable: false, icon: '🧤', slot: 'hands', equipBonus: { Figh: 2, str: 1 }, value: 45, desc: 'Handwear. Figh +2, STR +1' },
                'Trail Boots': { id: 'core:trail_boots', type: 'equipment', purpose: 'equip', stackable: false, icon: '🥾', slot: 'feet', equipBonus: { Flee: 1, spd: 1 }, value: 30, desc: 'Footwear. Flee +1, SPD +1' },
                'Lucky Charm': { id: 'core:lucky_charm', type: 'equipment', purpose: 'equip', stackable: false, icon: '📿', slot: 'accessory1', equipBonus: { Flee: 2, wis: 1 }, equipEffect: 'luckyFind', value: 35, desc: 'Accessory. Flee +2, WIS +1. Improves search finds.' },
                'Focus Ring': { id: 'core:focus_ring', type: 'equipment', purpose: 'equip', stackable: false, icon: '💍', slot: 'accessory2', equipBonus: { Flir: 2, cha: 1 }, equipEffect: 'focusGuard', value: 55, desc: 'Ring. Flir +2, CHA +1. Resists charm confusion.' }
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
                    { name: 'Trail Boots', qty: 1 },
                    { name: 'Lucky Charm', qty: 1 }
                ],
                herbalist: [
                    { name: 'Healing Herb', qty: 3 },
                    { name: 'Strange Mushroom', qty: 1 },
                    { name: 'Enchanted Berry', qty: 2 },
                    { name: 'Vial of Venom', qty: 1 }
                ],
                relic: [
                    { name: 'Old Coin', qty: 3 },
                    { name: 'Shiny Gem', qty: 1 },
                    { name: 'Crystal Shard', qty: 1 },
                    { name: 'Focus Ring', qty: 1 }
                ],
                outfitter: [
                    { name: 'Leather Cap', qty: 1 },
                    { name: 'Hide Armor', qty: 1 },
                    { name: 'Clawed Gloves', qty: 1 },
                    { name: 'Trail Boots', qty: 1 }
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
                    objectives: [{ id: 'camp_safety_wolf', type: 'defeat', species: 'wolf', required: 1, label: 'Defeat a Wolfkin' }],
                    turnInPolicy: { type: 'original_giver' },
                    worldDirectives: [{
                        id: 'nearby_wolf',
                        type: 'place',
                        content: { kind: 'creature', id: 'wolf' },
                        count: 1,
                        distance: { min: 2, max: 5 },
                        biomes: ['forest'],
                        objectiveId: 'camp_safety_wolf',
                        disposition: 'enemy',
                        locationLabel: 'Wolfkin signs'
                    }],
                    reward: { xp: 20, gold: 12 }
                },
                ruins_cleanup: {
                    title: 'Ruins Cleanup',
                    description: 'A nervous explorer wants proof that the old bones have been cleared.',
                    objectives: [{ type: 'defeat', species: 'skeleton', required: 1, label: 'Defeat an Awakened Skeleton' }],
                    reward: { xp: 25, gold: 14, items: ['Crystal Shard'] }
                }
            },
            EQUIPMENT_LOOT_TABLES: {
                basicGear: [
                    { id: 'Leather Cap', weight: 4 },
                    { id: 'Trail Boots', weight: 3 },
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
                        { id: 'devoted_attention', name: 'Devoted Attention', stat: 'Fuck', val: 3, desc: 'Play +3.', requires: { tree: 'seducer', count: 2 } }
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
                        {
                            id: 'human_adaptable',
                            name: 'Adaptable',
                            desc: 'Flee +1 and Feed +1.',
                            effectProfile: {
                                version: 2,
                                effects: [
                                    { kind: 'stat', key: 'Flee', amount: 1 },
                                    { kind: 'stat', key: 'Feed', amount: 1 }
                                ]
                            }
                        },
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
            XP_REWARDS: { defeatEnemy: 50, consumeEnemy: 75, seduceEnemy: 50, flirtEnemy: 50, feedAlly: 20, feedEnemy: 25, discoverLandmark: 25, consumeAlly: 40 },
            BALANCE: {
                xpCurveMultiplier: 1.5,
                levelPunishmentGain: 10,
                levelPleasureGain: 5,
                levelStatGain: 1,
                recruitXP: 30
            },
            BALANCE_V1: {
                hungerMax: 100,
                hungerWarning: 60,
                hungerHungry: 70,
                hungerStarving: 85,
                spiritThresholdRatio: 0.85,
                spiritPostResolveRatio: 0.2,
                costs: {
                    move: 1,
                    search: 1,
                    fight: 3,
                    flirt: 1,
                    fuck: 4,
                    feast: 2,
                    feed: 1,
                    flee: 3,
                    moveRow: 1
                },
                relief: {
                    rest: 0,
                    restHungerPressure: 8,
                    restDigestionTicks: 8,
                    containmentFullnessPerSize: 3,
                    containmentNutritionPerSize: 15
                },
                digestion: {
                    satiatedThreshold: 25,
                    satiatedMultiplier: 0.8,
                    hungryMultiplier: 1.2,
                    starvingMultiplier: 1.4,
                    minimumMultiplier: 0.8,
                    maximumMultiplier: 1.4
                },
                combatPressure: {
                    hungryActionMultiplier: 0.9,
                    starvingActionMultiplier: 0.75,
                    hungryInitiativeMultiplier: 0.9,
                    starvingInitiativeMultiplier: 0.8,
                    hungryFleePenalty: 0.05,
                    starvingFleePenalty: 0.15
                }
            },

            // === STATE ===
            mode: 'normal',
            screen: 'create',
            overlayReturnStack: [],
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
            storyEvents: [],
            sceneNarrations: [],
            tileNarrationCache: [],
            sceneEvents: [],
            latestStoryEvent: null,
            latestSceneBeat: null,
            storyEventSeq: 0,
            sceneTemplates: [],
            feastVerbProfiles: {},
            containerProfiles: {},
            tileEvents: [],
            logFilter: 'all',
            logSearch: '',
            logCollapsed: false,
            logExpanded: false,
            toasts: [],
            toastSeq: 0,
            inventoryFilter: 'all',
            inventorySort: 'name',
            tradeFilter: 'all',
            tradeSort: 'name',
            mobileMapZoom: 1,
            largeMapRadius: 8,
            largeMapOffset: { x: 0, y: 0 },
            largeMapSelected: null,
            largeMapDocked: false,
            largeMapFilters: {
                objective: true, turnIn: true, giver: true, structure: true,
                danger: true, party: true, recovery: true, poi: true
            },
            trackedQuestId: null,
            worldMap: new Map(),
            tileDeltas: new Map(),
            exploredTiles: new Set(),
            superPatchMap: new Map(),
            worldMeta: { worldId: 'world_default', seed: 'default', generatorVersion: 7, mapModsHash: 'core' },
            PATCH_SIZE: 10,
            SUPER_PATCH_SIZE: 3, // 3x3 patches = 30x30 tiles per biome region
            currentBiome: 'forest',
            activeSlot: 'slot1',
            safeAnchor: null,
            defeatState: null,
            strandedCompanions: [],
            _autoSaveSuppressed: false,
            settings: {
                powerDynamics: false, endoMode: false, slowDigestion: false,
                fatalVore: false, chewing: false, allTheWayThrough: false,
                hardcore: false,
                boneCrushing: false, unwillingWarnings: false,
                statAbsorption: false, refractoryPeriod: false,
                sameSpeciesBonus: false, fluidEnabled: false,
                cockVoreEnabled: false, unbirthEnabled: false, forcedFeeding: false,
                partyPlayFightMode: 'nonlethal',
                inventoryRecovery: 'death-bag',
                recoveryMode: 'core:ghost',
                combatPacing: 'readable',
                combatReadSpeed: 32,
                highContrast: false, reducedMotion: false, fontSize: 14
            },

            combatState: {
                active: false, turnQueue: [], currentTurn: 0, round: 1,
                syncActions: [], processing: false, xpEarned: 0
            },
            targetSelection: null,
            combatTargetId: null,
            combatTargetIds: [],
            combatPlanSelection: null,
            combatCorrectionMessage: null,
            activeActor: null,
            explorationActorIds: [],
            explorationActorSelectionExplicit: false,
            explorationTargetIds: [],
            focusedStageObject: null,
            mobileMovePadOpen: false,
            mobileActorBeltOpen: false,
            mobileTargetPickerOpen: false,
            mobileCreatureRailOpen: false,
            mobileRosterOpen: false,
            mobileRosterTab: 'party',
            mobileRosterDetail: null,
            transactionWindow: null,
            holdingsWindow: null,
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
                    ], structureTable: ['cabin', 'hut', 'camp', 'tree', 'burrow', 'nest', 'manor'],
                    descriptions: ['Ancient trees tower overhead.','The forest is dense and humid.','Sunlight filters through leaves.','A clearing opens before you.','Fallen logs and twisted roots make travel slow.'] },
                swamp: { name: 'Swamp', role: 'region', icon: '🐊', color: '#3d4a1e', bgColor: '#2a3310', danger: 4, encounterChance: 0.20, friendlyChance: 0.03, structureChance: 0.06,
                    encounterTable: [
                        { id: 'frog', weight: 25 }, { id: 'shroom', weight: 20 }, { id: 'slime', weight: 20 },
                        { id: 'naga', weight: 15 }, { id: 'plant', weight: 20 }
                    ], friendlyTable: [
                        { id: 'frog', weight: 40 }, { id: 'otter', weight: 20 }, { id: 'human', weight: 10 }
                    ], structureTable: ['hut', 'ruins', 'pond', 'burrow', 'spring', 'dungeon'],
                    descriptions: ['Murky waters stretch through twisted cypress trees.','The ground squelches beneath your feet.','Fireflies drift through the fog.','A sunken log bridges a channel.','Gnarled roots form natural archways.'] },
                plains: { name: 'Plains', role: 'region', icon: '🌾', color: '#6b5b1e', bgColor: '#4a4010', danger: 2, encounterChance: 0.12, friendlyChance: 0.08, structureChance: 0.06,
                    encounterTable: [
                        { id: 'bunny', weight: 25 }, { id: 'deer', weight: 20 }, { id: 'human', weight: 15 },
                        { id: 'horse', weight: 15 }, { id: 'wolf', weight: 15 }, { id: 'tiger', weight: 10 }
                    ], friendlyTable: [
                        { id: 'bunny', weight: 30 }, { id: 'deer', weight: 25 }, { id: 'horse', weight: 20 },
                        { id: 'human', weight: 15 }, { id: 'cow', weight: 10 }
                    ], structureTable: ['cabin', 'camp', 'ruins', 'tree', 'pond', 'manor', 'dungeon'],
                    descriptions: ['Tall grasses sway in the warm breeze.','Open grasslands stretch to the horizon.','The plains are peaceful.','A stream cuts through the prairie.','Wind rustles the grass in waves.'] },
                cave: { name: 'Cave', role: 'interior-theme', icon: '🦇', color: '#2a2a3a', bgColor: '#1a1a2e', danger: 5, encounterChance: 0.25, friendlyChance: 0.02, structureChance: 0.10,
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
                    ], structureTable: ['ruins', 'hut', 'spring', 'nest', 'pond', 'tree', 'dungeon'],
                    descriptions: ['Vines hang like curtains.','The jungle is alive with sound.','Humidity presses down like a weight.','A waterfall crashes into a hidden pool.','Thick vegetation forces you to hack forward.'] },
                dungeon: { name: 'Dungeon', role: 'interior-theme', icon: '⛓️', color: '#3a2a3a', bgColor: '#1e0a1e', danger: 5, encounterChance: 0.30, friendlyChance: 0.01, structureChance: 0.12,
                    encounterTable: [
                        { id: 'rat', weight: 25 }, { id: 'goblin', weight: 25 }, { id: 'skeleton', weight: 20 },
                        { id: 'spider', weight: 20 }, { id: 'drow', weight: 10 }
                    ], friendlyTable: [
                        { id: 'goblin', weight: 20 }, { id: 'human', weight: 5 }
                    ], structureTable: ['cave', 'ruins', 'camp', 'web', 'burrow', 'hut'],
                    descriptions: ['Stone corridors stretch endlessly.','Iron-barred cells line the walls.','The air is stale and cold.','A brazier smolders with dying coals.','Chains rattle in the darkness.'] },
                manor: { name: 'Manor', role: 'interior-theme', icon: '🏰', color: '#4a3a2a', bgColor: '#2e2010', danger: 3, encounterChance: 0.15, friendlyChance: 0.05, structureChance: 0.15,
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
                    ], structureTable: ['cave', 'ruins', 'nest', 'hut', 'camp', 'dungeon'],
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
                cabin: { name: 'Cabin', icon: '🏠', enterable: true, interior: { enabled: true, profile: 'small-building' }, encounterChance: 0.25, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.25, stockTable: 'general', species: ['human', 'cat'] }, quest: { chance: 0.35, templates: ['cabin_supplies'], archetypes: ['gather', 'deliver'], species: ['human', 'cat'] }, lootTable: 'basicGear',
                    descriptions: ['A small wooden cabin stands before you.','A lone cabin, smoke curling from its chimney.','A weathered cabin with a welcoming glow.'] },
                hut: { name: 'Hut', icon: '🛖', enterable: true, interior: { enabled: true, profile: 'small-building' }, encounterChance: 0.20, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.20, stockTable: 'herbalist', species: ['human', 'shroom'] }, quest: { chance: 0.25, templates: ['cabin_supplies'], archetypes: ['gather', 'recover'], species: ['human', 'shroom'] },
                    descriptions: ['A rustic hut built from sticks and mud.','A simple hut with a thatched roof.','A travelers hut, abandoned or inhabited.'] },
                cave: { name: 'Cave Mouth', icon: '🕳️', enterable: true, interior: { enabled: true, profile: 'cave-network' }, encounterChance: 0.35, disposition: 'enemy', threat: 3,
                    descriptions: ['A dark cave mouth yawns before you.','A shallow cave, something stirs within.','A narrow cave, the air is cold and damp.'] },
                ruins: { name: 'Ruins', icon: '🏛️', enterable: true, interior: { enabled: true, profile: 'large-building' }, encounterChance: 0.30, disposition: 'enemy', threat: 3,
                    quest: { chance: 0.20, templates: ['ruins_cleanup', 'shrine_relic'], archetypes: ['survey', 'recover'], species: ['human', 'drow'] }, lootTable: 'relicGear',
                    descriptions: ['Ancient ruins crumble around you.','A collapsed structure, something lurks.','A forgotten ruin, treasures and dangers.'] },
                camp: { name: 'Camp', icon: '⛺', encounterChance: 0.15, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.45, stockTable: 'traveler', species: ['human', 'horse', 'fox'] }, quest: { chance: 0.30, templates: ['camp_safety'], archetypes: ['hunt', 'escort', 'survey'], species: ['human', 'horse', 'fox'] }, lootTable: 'armory',
                    descriptions: ['A small campsite, recently used.','A bandit camp, abandoned or occupied.','A makeshift camp, signs of recent travelers.'] },
                shrine: { name: 'Shrine', icon: '⛩️', enterable: true, interior: { enabled: true, profile: 'small-building' }, encounterChance: 0.10, disposition: 'neutral', threat: 0,
                    merchant: { chance: 0.25, stockTable: 'relic', species: ['human', 'drow'] }, quest: { chance: 0.45, templates: ['shrine_relic'], archetypes: ['recover', 'deliver'], species: ['human', 'drow'] }, lootTable: 'relicGear',
                    descriptions: ['A tiny shrine to a forgotten deity.','A weathered shrine, offerings still fresh.','A serene shrine, peaceful energy radiates.'] },
                pond: { name: 'Pond', icon: '🏞️', encounterChance: 0.15, disposition: 'neutral', threat: 1,
                    descriptions: ['A crystal-clear pond reflects the sky.','A murky pond, something swims beneath.','A still pond, dragonflies dance overhead.'] },
                tree: { name: 'Great Tree', icon: '🌳', encounterChance: 0.10, disposition: 'neutral', threat: 0,
                    descriptions: ['An ancient tree, its trunk wider than a house.','A great tree, its branches form a canopy.','A magical tree, faint light pulses within.'] },
                spring: { name: 'Hot Spring', icon: '♨️', encounterChance: 0.20, disposition: 'friendly', threat: 0,
                    merchant: { chance: 0.30, stockTable: 'herbalist', species: ['human', 'otter', 'frog'] },
                    descriptions: ['A natural hot spring, steam rises lazily.','A warm spring, perfect for a soak.','A hidden spring, the water is inviting.'] },
                burrow: { name: 'Burrow', icon: '🕳️', enterable: true, interior: { enabled: true, profile: 'burrow' }, encounterChance: 0.25, disposition: 'enemy', threat: 2,
                    descriptions: ['A small burrow in the earth.','A network of burrows, something lives here.','A freshly dug burrow, tracks lead inside.'] },
                nest: { name: 'Nest', icon: '🪹', encounterChance: 0.20, disposition: 'enemy', threat: 2,
                    descriptions: ['A large nest built high in the trees.','A ground nest, something broods within.','An abandoned nest, or is it?'] },
                web: { name: 'Web', icon: '🕸️', enterable: true, interior: { enabled: true, profile: 'burrow' }, encounterChance: 0.30, disposition: 'enemy', threat: 3,
                    descriptions: ['Thick webs cover everything.','A massive web spans the clearing.','Gossamer threads, something waits.'] },
                manor: { name: 'Manor', icon: '🏰', enterable: true, interior: { enabled: true, profile: 'manor' }, encounterChance: 0.25, disposition: 'neutral', threat: 3,
                    descriptions: ['An old manor rises above the surrounding land.','A walled estate waits beyond an iron gate.'] },
                dungeon: { name: 'Dungeon Entrance', icon: '⛓️', enterable: true, interior: { enabled: true, profile: 'dungeon' }, encounterChance: 0.35, disposition: 'enemy', threat: 5,
                    descriptions: ['Stone steps descend behind a reinforced door.','A sealed dungeon entrance opens into darkness.'] }
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
                tutorialState: 'yaw-tutorial-v2',
                settings: 'yaw-settings',
                contentPrefs: 'yaw-content-prefs',
                contentAccess: 'yaw-content-access',
                logView: 'yaw-log-view',
                releaseSeen: 'yaw-release-seen',
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
                contentAccess: null,
                logView: 'fff-log-view',
                lastSlot: 'fff-last-slot',
                lastSaveTime: 'fff-last-save-time',
                saveTimePrefix: 'fff-save-time-'
            },
            SAVE_DB_NAME: 'YAW_Saves',
            SAVE_DB_VERSION: 2,
            LEGACY_SAVE_DB_NAME: 'FFF_Saves',
            WORLD_DB_NAME: 'YAW_Worlds',
            WORLD_DB_VERSION: 1,
            SPARSE_SAVE_ENABLED: true,
            SAVE_SLOW_LOG_MS: 120,
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

            startupReadinessState(name) {
                return typeof YAW_STARTUP_READINESS !== 'undefined' ? YAW_STARTUP_READINESS.state(name) : null;
            },
            startupDomainsReady(names) {
                if (typeof YAW_STARTUP_READINESS === 'undefined') return true;
                return (Array.isArray(names) ? names : [names]).every(name => YAW_STARTUP_READINESS.isReady(name));
            },
            startupActionReady(action) {
                if (action === 'mods') return this.startupDomainsReady(['installedMedia', 'modules']);
                if (action === 'play') return this.startupDomainsReady(['saves', 'installedMedia', 'modules']);
                return true;
            },
            _startupDomainLabel(state) {
                if (!state) return '';
                return state.labelKey ? this._label(state.labelKey, state.label || state.name) : String(state.label || state.name || '');
            },
            _setStartupControl(id, ready, options = {}) {
                const control = document.getElementById(id);
                if (!control) return;
                control.disabled = !ready;
                control.setAttribute('aria-disabled', ready ? 'false' : 'true');
                control.setAttribute('aria-busy', ready ? 'false' : 'true');
                const title = String(ready ? options.readyTitle || '' : options.pendingTitle || this._label('startup.preparingControl', 'Preparing…'));
                if (title) {
                    control.title = title;
                    control.setAttribute('aria-label', title);
                }
            },
            syncStartupReadinessUI() {
                if (typeof YAW_STARTUP_READINESS === 'undefined') return;
                const saves = YAW_STARTUP_READINESS.state('saves');
                const media = YAW_STARTUP_READINESS.state('installedMedia');
                const modules = YAW_STARTUP_READINESS.state('modules');
                const bundled = YAW_STARTUP_READINESS.state('bundledAssets');
                const savesReady = saves?.status === 'ready';
                const contentReady = media?.status === 'ready' && modules?.status === 'ready';
                const playReady = savesReady && contentReady;
                const continueButton = document.getElementById('menu-continue');
                const continueLabel = document.getElementById('menu-continue-label');
                if (continueButton) {
                    const hasSave = savesReady && Boolean(saves.result);
                    continueButton.style.display = savesReady && !hasSave ? 'none' : 'flex';
                    if (continueLabel) continueLabel.textContent = savesReady ? this._label('ui.menu.continue', 'Continue Last Game') : this._label('startup.checkingSaves', 'Checking saved games…');
                    this._setStartupControl('menu-continue', playReady && hasSave, {
                        readyTitle: this._label('ui.menu.continueTitle', 'Continue last game'),
                        pendingTitle: saves?.status === 'error'
                            ? this._label('startup.savesFailed', 'Saved games could not be checked')
                            : this._label('startup.checkingSaves', 'Checking saved games…')
                    });
                }
                this._setStartupControl('menu-new-game', playReady, {
                    readyTitle: this._label('ui.menu.newGameTitle', 'Start a new game'),
                    pendingTitle: this._label('startup.preparingContent', 'Preparing game content…')
                });
                this._setStartupControl('menu-load-game', playReady, {
                    readyTitle: this._label('ui.menu.loadGameTitle', 'Load game'),
                    pendingTitle: saves?.status === 'error'
                        ? this._label('startup.savesFailed', 'Saved games could not be checked')
                        : this._label('startup.checkingSaves', 'Checking saved games…')
                });
                this._setStartupControl('menu-mods', contentReady, {
                    readyTitle: this._label('ui.menu.modsTitle', 'Open mods'),
                    pendingTitle: this._label('startup.loadingMods', 'Loading installed mods…')
                });

                const states = [saves, media, modules, bundled].filter(Boolean);
                const blockingErrors = states.filter(state => state.status === 'error' && state.blocking !== false);
                const degradedErrors = states.filter(state => state.status === 'error' && state.blocking === false);
                const pending = states.filter(state => state.status === 'pending');
                const status = document.getElementById('menu-startup-status');
                const statusText = document.getElementById('menu-startup-status-text');
                const retry = document.getElementById('menu-startup-retry');
                if (!status || !statusText || !retry) return;
                retry.hidden = blockingErrors.length === 0 && degradedErrors.length === 0;
                if (blockingErrors.length) {
                    status.dataset.state = 'error';
                    statusText.textContent = this._label('startup.blocked', 'Some saved or installed content could not be prepared.');
                } else if (pending.length) {
                    status.dataset.state = 'pending';
                    const labels = pending.map(state => this._startupDomainLabel(state)).join(', ');
                    statusText.textContent = this._label('startup.preparing', 'Preparing {items}…', { items: labels });
                } else if (degradedErrors.length) {
                    status.dataset.state = 'error';
                    statusText.textContent = this._label('startup.visualFallback', 'Visual assets are unavailable; fallback graphics remain active.');
                } else {
                    status.dataset.state = 'ready';
                    statusText.textContent = this._label('startup.ready', 'Ready');
                }
            },
            _recordStartupReadiness(state) {
                this.syncStartupReadinessUI();
                if (!state || state.status !== 'error') return;
                const key = `${state.name}:${state.attempts}`;
                if (!this._startupReadinessErrors) this._startupReadinessErrors = new Set();
                if (this._startupReadinessErrors.has(key)) return;
                this._startupReadinessErrors.add(key);
                const domain = this._startupDomainLabel(state);
                const message = state.error?.code === 'startup_timeout'
                    ? this._label('startup.timeout', '{domain} did not become ready within {timeout} ms.', { domain, timeout: state.error.timeoutMs || state.timeoutMs || 0 })
                    : state.error?.message || String(state.error || this._label('startup.unknownFailure', 'Unknown startup failure'));
                this._pushLog({
                    text: this._label('startup.domainFailed', 'Startup {domain} failed: {message}', { domain, message }),
                    type: 'error',
                    errorCode: `startup_${state.name}_failed`
                }, 'error');
                this.renderLog();
            },
            initializeStartupReadiness() {
                if (typeof YAW_STARTUP_READINESS === 'undefined') return Promise.resolve([]);
                if (!this._startupReadinessUnsubscribe) {
                    this._startupReadinessUnsubscribe = YAW_STARTUP_READINESS.subscribe(state => this._recordStartupReadiness(state));
                }
                let bundledAttempt = 0;
                const saves = YAW_STARTUP_READINESS.start('saves', () => this._syncLastSaveSlot(), { label: 'saved games', labelKey: 'startup.domain.saves', timeoutMs: 10000 });
                const installedMedia = YAW_STARTUP_READINESS.start('installedMedia', async () => {
                    if (typeof MODULE_SYSTEM === 'undefined') return null;
                    const attempt = YAW_STARTUP_READINESS.state('installedMedia')?.attempts || 1;
                    if (attempt === 1 && MODULE_SYSTEM.mediaReady) return MODULE_SYSTEM.mediaReady;
                    if (typeof MODULE_SYSTEM.prepareInstalledMedia === 'function') return MODULE_SYSTEM.prepareInstalledMedia();
                    return MODULE_SYSTEM.ready;
                }, { label: 'installed media', labelKey: 'startup.domain.installedMedia', timeoutMs: 20000 });
                const modules = YAW_STARTUP_READINESS.start('modules', async () => {
                    await YAW_STARTUP_READINESS.when('installedMedia');
                    if (typeof MODULE_SYSTEM === 'undefined') return [];
                    if (typeof MODULE_SYSTEM.initializeHostCatalog === 'function') {
                        try {
                            await MODULE_SYSTEM.initializeHostCatalog();
                        } catch (error) {
                            console.error('Host catalog initialization failed:', error);
                            this._pushLog({
                                text: this._label('mod.hostCatalogInitFailed', 'Host Catalog could not be loaded. Local modules remain available.'),
                                type: 'error',
                                errorCode: 'host_catalog_init_failed'
                            }, 'error');
                            this.renderLog();
                        }
                    }
                    this.syncHostCatalogControls();
                    return MODULE_SYSTEM.loadEnabledModules();
                }, { label: 'mods', labelKey: 'startup.domain.modules', timeoutMs: 30000 });
                const bundledAssets = YAW_STARTUP_READINESS.start('bundledAssets', async () => {
                    bundledAttempt++;
                    const promise = bundledAttempt === 1
                        ? window.YAW_BUNDLED_TILESET_READY
                        : window.YAW_PREPARE_BUNDLED_TILESET?.();
                    const result = promise?.then ? await promise : null;
                    if (!result) throw new Error('Bundled tileset atlases could not be prepared');
                    if (!result.disabled && typeof YAW_TILESET_RUNTIME !== 'undefined' && typeof AssetManifest !== 'undefined') {
                        YAW_TILESET_RUNTIME.registerBuiltin(AssetManifest.bundledTilesetPack());
                        YAW_TILESET_RUNTIME._refreshMaps?.();
                    }
                    return result;
                }, { label: 'visual assets', labelKey: 'startup.domain.bundledAssets', blocking: false, timeoutMs: 20000 });
                this.syncStartupReadinessUI();
                return Promise.all([saves, installedMedia, modules, bundledAssets]);
            },
            async retryStartupReadiness() {
                if (typeof YAW_STARTUP_READINESS === 'undefined') return [];
                const retried = [];
                const saves = YAW_STARTUP_READINESS.state('saves');
                if (saves?.status === 'error') retried.push(await YAW_STARTUP_READINESS.retry('saves'));
                const media = YAW_STARTUP_READINESS.state('installedMedia');
                if (media?.status === 'error') retried.push(await YAW_STARTUP_READINESS.retry('installedMedia'));
                const modules = YAW_STARTUP_READINESS.state('modules');
                if (modules?.status === 'error') retried.push(await YAW_STARTUP_READINESS.retry('modules'));
                const bundled = YAW_STARTUP_READINESS.state('bundledAssets');
                if (bundled?.status === 'error') retried.push(await YAW_STARTUP_READINESS.retry('bundledAssets'));
                this.syncStartupReadinessUI();
                return retried;
            },

            init() {
                console.log('App.init() - Mechanics Overhaul');
                const hasPlayed = this._getStoredValue('hasPlayed');
                const showFirstRunTutorial = !hasPlayed;
                if (showFirstRunTutorial) this._setStoredValue('hasPlayed', 'true');
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
                    YAW_CONTENT_ACCESS.reconcilePreferences(this);
                    this.enforceContentTierSettings();
                } catch(e) { console.warn('Content preferences load failed', e); }
                this.loadLogViewPreferences();
                this.applyAccessibilitySettings();
                this.applyStaticLocalization();
                this.applyRuntimeOriginGates();
                if (typeof YAW_MANAGED_SERVICE !== 'undefined') {
                    Promise.resolve(YAW_MANAGED_SERVICE.init()).catch(() => {});
                }
                this.initializeStartupReadiness();
                this.initAppMenu();
                this.initMobileUnitStripGestures();
                this.updateTierButtons();
                this.initSpeciesGrid();
                this.selectedSpecies = 'human';
                this.initBodyPartsGrid();
                this._syncEncounterPreferenceUI();
                this.showScreen('menu');
                this.syncReleaseUI();
                if (showFirstRunTutorial) this.showTutorial();
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
                return YAW_CREATE_FLOW.toggleAccordion(this, id);
            },
            initBodyPartsGrid() {
                return YAW_CREATE_FLOW.initBodyPartsGrid(this);
            },

            createCharacter() {
                return YAW_CREATE_FLOW.createCharacter(this);
            },

            _getSpeciesBaseStats(sid) {
                return this.SPECIES_BASE_STATS[sid] || YAW_SPECIES_SYSTEM.baseStats(sid);
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
                return YAW_COMBAT_ACTOR_STATE.sanitize(this, options);
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
            _normalizeContainmentRecord(holder, prey, container = 'stomach') {
                return YAW_UNIT_CONTAINMENT.normalizeRecord(this, holder, prey, container);
            },
            _normalizeContainmentRecords(holder, container = 'stomach') {
                return YAW_UNIT_CONTAINMENT.normalizeContainer(this, holder, container);
            },
            _isServiceAvailable(unit) {
                return YAW_UNIT_CONTAINMENT.serviceAvailable(this, unit);
            },
            _captureVitalProfile(unit) {
                return YAW_UNIT_CONTAINMENT.captureVitalProfile(unit);
            },
            _applyVitalDamage(recordOrUnit, amount = 0, context = {}) {
                return YAW_UNIT_CONTAINMENT.applyVitalDamage(recordOrUnit, amount, context);
            },
            _chewDamageContribution(actor, target, options = {}) {
                if (!actor || !target) return 0;
                const mode = options.mode === 'combat' ? 'combat' : 'adventure';
                const contribution = Math.max(1, Number(actor.Feas) || 10);
                const purpose = `chew:${this._unitSelectionId(actor)}`;
                const rating = mode === 'combat'
                    ? this._combatActionRating(contribution, actor, target, purpose)
                    : this._explorationActionRating(contribution, actor, target, purpose);
                const variance = mode === 'combat'
                    ? this._combatDamageVariance(actor, target, purpose)
                    : this._explorationDamageVariance(actor, target, purpose);
                const defense = Number(this._effectiveCon?.(target) ?? target.con ?? 10);
                const sizeGap = (Number(actor.size) || 0) - (Number(target.size) || 0);
                const sizeModifier = Math.max(-6, Math.min(6, sizeGap * 1.5));
                return Math.max(1, Math.floor(
                    (rating - defense * 0.3 + variance + sizeModifier)
                    * (Number(this._physicalDamageMultiplier?.(actor, target)) || 1)
                ));
            },
            _chewDamageBreakdown(actor, target, options = {}) {
                if (!actor || !target) return { damage: 0, baseDamage: 0, contributions: [] };
                const actors = [...new Set((options.actors || [actor]).filter(unit => unit && this._isLivingCreature(unit)))];
                const contributions = actors.map(unit => ({
                    actor: unit,
                    damage: this._chewDamageContribution(unit, target, options)
                }));
                const baseDamage = contributions.reduce((sum, entry) => sum + entry.damage, 0);
                const damage = options.multiEffect
                    ? this._multiInteractionScaleValue(baseDamage, options.multiEffect)
                    : baseDamage;
                return { damage, baseDamage, contributions };
            },
            _chewDamageValue(actor, target, options = {}) {
                const breakdown = this._chewDamageBreakdown(actor, target, options);
                return breakdown.damage;
            },
            _resolveChewAttack(actor, target, options = {}) {
                if (!actor || !target || actor === target || !this._isLivingCreature(target)) {
                    return { damage: 0, depleted: false, target };
                }
                const targetWasParty = this.party.includes(target);
                const targetWasHostile = target.disposition === this.DISPOSITION.ENEMY;
                const actors = [...new Set((options.actors || [actor]).filter(unit => unit && this._isLivingCreature(unit)))];
                const breakdown = this._chewDamageBreakdown(actor, target, { ...options, actors });
                const damage = breakdown.damage;
                this._applyVitalDamage(target, damage, {
                    source: actors.length > 1 ? 'group-chew' : 'chew',
                    terminal: false
                });
                this._wakeOnDamage?.(target);
                const depleted = Number(target.CPun) <= 0 || Number(target.vitalRemaining) <= 0;
                if (depleted) {
                    this._resolveVitalDepletion(target, actors.length > 1 ? 'group-chew' : 'chew', actors[0] || actor);
                    if (!targetWasParty && targetWasHostile && options.awardXP !== false) {
                        this._awardCombatXP(this.XP_REWARDS.defeatEnemy);
                    }
                }
                return {
                    damage,
                    depleted,
                    target,
                    actors,
                    contributions: breakdown.contributions,
                    vitalRemaining: Math.max(0, Number(target.vitalRemaining) || 0),
                    conditionRemaining: Math.max(0, Number(target.CPun) || 0)
                };
            },
            _vitalRatio(record) {
                return YAW_UNIT_CONTAINMENT.vitalRatio(record);
            },
            _canReleaseFromVitalState(record) {
                return YAW_UNIT_CONTAINMENT.canReleaseFromVitalState(record);
            },
            _releaseFromVitalState(record) {
                return YAW_UNIT_CONTAINMENT.releaseFromVitalState(record);
            },
            _isTerminalVitalState(record) {
                return YAW_UNIT_CONTAINMENT.isTerminalVitalState(record);
            },
            _containmentSummary(record) {
                return YAW_UNIT_CONTAINMENT.summary(this, record);
            },
            _normalizeRemainsRecord(record, defaults = {}) {
                return YAW_UNIT_CONTAINMENT.normalizeRemainsRecord(record, defaults);
            },
            _applyRemainsScavenge(record, actor, amount = 1, context = {}) {
                return YAW_UNIT_CONTAINMENT.applyRemainsScavenge(record, actor, amount, context);
            },
            _isDepletedRemains(record) {
                return YAW_UNIT_CONTAINMENT.isDepletedRemains(record);
            },
            _activeContainedPrey(unit, container = 'stomach') {
                return (this._normalizeContainmentRecords(unit, container) || []).filter(prey => YAW_UNIT_CONTAINMENT.isActiveContained(prey, container));
            },
            _containmentDetailSummary(unit) {
                const active = ['stomach', 'womb', 'balls'].flatMap(container => this._activeContainedPrey(unit, container).map(prey => ({ container, prey })));
                if (!active.length) return '';
                return active.map(({ container, prey }) => {
                    const containerLabel = this._label(container === 'stomach' ? 'capacity.stomach' : container === 'womb' ? 'capacity.womb' : 'capacity.balls', container);
                    const progress = Math.round(prey.progress ?? prey.digestionProgress ?? 0);
                    const vital = Math.round(this._vitalRatio(prey) * 100);
                    const release = prey.releaseEligible
                        ? this._label('containment.summary.releasable', 'Releasable')
                        : this._label('containment.summary.notReleasable', 'Not releasable');
                    return this._label('containment.detailSummary', '{target} in {container}: {progress}% · {vitality} {ratio}% · {release}', {
                        target: prey.name || this._label('containment.unknownPrey', 'Contained creature'),
                        container: containerLabel,
                        progress,
                        vitality: this._label('containment.vitality', 'Vitality'),
                        ratio: vital,
                        release
                    });
                }).join(' | ');
            },
            _renderContainerInventory(unit, holderType = 'party', holderIndex = 0) {
                return YAW_UNIT_CONTAINMENT.renderContainerInventory(this, unit, holderType, holderIndex);
            },
            releaseContained(holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
                return YAW_UNIT_CONTAINMENT.releaseContained(this, holderType, Number(holderIndex), container, Number(containedIndex));
            },
            digestContained(holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
                return YAW_UNIT_CONTAINMENT.digestContained(this, holderType, Number(holderIndex), container, Number(containedIndex));
            },
            inspectContained(holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
                return YAW_UNIT_CONTAINMENT.inspectContained(this, holderType, Number(holderIndex), container, Number(containedIndex));
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
            _isStructureEnterable(structureId, tile = null) {
                return YAW_STRUCTURE_NAVIGATION.isStructureEnterable(this, structureId, tile);
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
                const relocated = this._relocateFleeingCreature(unit, { threat, source: 'threat-reaction' });
                const unitName = unit?.name || this._label('ui.unknown', 'Unknown');
                const threatName = threat?.name || this._label('combat.flee.threatFallback', 'the threat');
                if (!relocated) {
                    const cornered = this._turnCreatureHostile(unit);
                    cornered.text = this._label('combat.flee.cannotEscape', '{name} cannot escape {threat} and turns hostile!', { name: unitName, threat: threatName });
                    return cornered;
                }
                return { fled: true, text: this._label('combat.flee.panicsFrom', '{name} panics and flees from {threat}!', { name: unitName, threat: threatName }) };
            },
            _relocateFleeingCreature(unit, options = {}) {
                return YAW_WORLD_STATE.relocateFleeingCreature(this, unit, options);
            },
            _fleeDestination(unit, options = {}) {
                return YAW_WORLD_STATE.fleeDestination(this, unit, options);
            },
            _relocateFleeingPartyMember(unit, options = {}) {
                return YAW_WORLD_STATE.relocateFleeingPartyMember(this, unit, options);
            },
            _retreatPartyFromCombat(actor = this.player, options = {}) {
                return YAW_WORLD_STATE.retreatPartyFromCombat(this, actor, options);
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
                this.combatState.syncActions = (this.combatState.syncActions || []).map(sync => {
                    const targets = (sync.targets?.length ? sync.targets : [sync.target]).filter(unit => unit && unit !== target);
                    return { ...sync, targets, target: targets[0] || null };
                }).filter(sync => sync.target && !(sync.participants || []).includes(target));
                if (this.activeActor === target) this.activeActor = null;
                if (this.targetSelection?.target === target || this.targetSelection?.targetId === this._unitSaveRef(target)) this.targetSelection = null;
                this._syncCurrentTileCreatures();
            },
            _containTargetIn(predator, target, container = 'stomach', extra = {}) {
                if (!predator || !target) return null;
                const wasHostile = target.disposition === this.DISPOSITION.ENEMY;
                const prey = this._createStomachPrey(target, {
                    ...extra,
                    holder: predator,
                    holderId: predator.id || predator.name,
                    containedId: target.id || target.name,
                    containerId: container,
                    entryVerb: extra.entryVerb || (container === 'stomach' ? 'swallow' : container),
                    inWomb: container === 'womb' || extra.inWomb,
                    inCock: container === 'balls' || extra.inCock
                });
                if (!Array.isArray(predator[container])) predator[container] = [];
                predator[container].push(prey);
                YAW_UNIT_CONTAINMENT.applyInitialSatiety(this, predator, prey, container);
                YAW_UNIT_CONTAINMENT.emitContainmentBeat(this, 'contained', predator, prey);
                target.CPun = 0;
                target.CPle = 0;
                this._removeContainedTarget(target);
                this._recordQuestDefeat(target, predator, 'contained', {
                    wasHostile,
                    source: extra.source || `containment-${container}`
                });
                this.markAutoSaveDirty?.(['manifest', 'party', 'holdings', 'currentTile', 'worldTiles', 'combat', 'sceneFeed', 'activityLog'], 'containment-contained');
                return prey;
            },
            _turnCreatureHostile(unit) {
                unit.disposition = this.DISPOSITION.ENEMY;
                unit.willing = false;
                this._syncCurrentTileCreatures();
                return { fled: false, hostile: unit, text: this._label('combat.flee.turnsHostile', '{name} turns hostile!', {
                    name: unit?.name || this._label('ui.unknown', 'Unknown')
                }) };
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
                this.log.push({ text: this._label('corpse.partyRemainsDropped', "{name}'s remains fall to the ground.", {
                    name: unit.name || this._label('ui.unknown', 'Unknown')
                }), type: 'combat' });
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
                    this.log.push({ text: this._label(removed === 1 ? 'corpse.decayedOne' : 'corpse.decayedMany', removed === 1
                        ? 'A corpse decays into nothing.'
                        : '{count} corpses decay into nothing.', { count: removed }), type: 'discovery' });
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
                hostile.text = this._label('combat.flee.corneredHostile', '{name} is cornered and turns hostile!', {
                    name: unit?.name || this._label('ui.unknown', 'Unknown')
                });
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
                    const destination = this._fleeDestination?.(ally, { source: 'combat-ally-flee', safeOnly: true }) || null;
                    if (!destination) {
                        this.log.push({ text: this._label('combat.allyFleeFailed', '{name} tries to flee but cannot get away!', { name: ally.name }), type: 'combat' });
                        this.renderLog();
                        return false;
                    }
                    this._relocateFleeingPartyMember?.(ally, { source: 'combat-ally-flee', destination });
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
            _makeCorpse(target, cause = 'fight', options = {}) {
                if (!target) return target;
                const wasLiving = this._isLivingCreature(target);
                const wasHostile = target.disposition === this.DISPOSITION.ENEMY;
                if (Array.isArray(this.explorationTargetIds) && this.explorationTargetIds.length) {
                    this.explorationTargetIds = this.explorationTargetIds.filter(key => {
                        if (!String(key).startsWith('creature:')) return true;
                        return this._explorationTargetFromKey(key) !== target;
                    });
                }
                target.CPun = 0;
                target.CPle = 0;
                target.alive = false;
                target.disposition = this.DISPOSITION.CORPSE;
                target.corpseCause = cause;
                target.corpseName = target.corpseName || target.name;
                target.corpseIcon = target.corpseIcon || target.icon;
                target.decayTurns = target.decayTurns ?? 12;
                if (typeof YAW_BODY_MASS !== 'undefined') YAW_BODY_MASS.toCorpse(this, target);
                this._normalizeRemainsRecord(target, {
                    corpseOf: target.id || target.name,
                    displayName: target.corpseName || target.name,
                    species: target.species,
                    size: target.size,
                    source: cause
                });
                target.status = {};
                target.willing = false;
                target.knockedOut = false;
                this._normalizeExplorationSelections();
                this._syncCurrentTileCreatures();
                if (wasLiving) {
                    this._recordQuestDefeat(target, options.actor, 'slain', {
                        wasHostile,
                        source: options.source || cause
                    });
                }
                return target;
            },

            _resolveVitalDepletion(target, cause = 'chew', actor = null) {
                if (!target) return target;
                target.CPun = 0;
                target.CPle = 0;
                target.alive = false;
                target.state = 'depleted';
                target.digestionState = 'depleted';
                const targetWasParty = this.party.includes(target);
                if (targetWasParty && (target === this.player || target.mc)) {
                    this._handlePlayerFall?.({ cause: `${cause}-vital-depletion`, source: `feast-${cause}` });
                } else if (targetWasParty) {
                    this._dropPartyCorpse(target, cause);
                } else {
                    this._makeCorpse(target, cause, { actor, source: cause });
                    if (this.combatState?.turnQueue) {
                        this.combatState.turnQueue = this.combatState.turnQueue.filter(entry => entry.unit !== target);
                    }
                }
                return target;
            },

            _resolveChewSurvivorReaction(target, threat = this.player) {
                if (!target || !this._isLivingCreature(target) || this.party.includes(target)) {
                    return { fled: false, hostiles: [], text: '' };
                }
                if (target.disposition !== this.DISPOSITION.ENEMY) {
                    const reaction = this._reactToNonHostileAttack(target, threat);
                    return {
                        fled: !this.creatures.includes(target),
                        hostiles: [...new Set(reaction?.hostiles || [])],
                        text: reaction?.text || ''
                    };
                }
                const conditionRatio = this._safeRatio(target.CPun, target.MPun, 1);
                const vitalRatio = this._vitalRatio(target);
                const mayFlee = this._shouldFleeThreat(target) || conditionRatio <= 0.3 || vitalRatio <= 0.3;
                if (mayFlee) {
                    const chance = Math.min(0.75, Math.max(0.15, (Number(target.Flee) || 10) / 30));
                    if (this._threatReactionRoll(target, threat, 'chew-survivor') < chance) {
                        const reaction = this._makeCreatureFlee(target, threat);
                        return {
                            fled: reaction?.fled === true,
                            hostiles: reaction?.hostile ? [reaction.hostile] : [],
                            text: reaction?.text || ''
                        };
                    }
                }
                this._turnCreatureHostile(target);
                return {
                    fled: false,
                    hostiles: [target],
                    text: this._label('feast.chewSurvivorFights', '{target} survives the attack and fights back!', {
                        target: target.name || this._label('ui.unknown', 'Unknown')
                    })
                };
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
                unit.size = unit.size || this.SPECIES_SIZE[unit.species] || 4;
                unit.appetite = unit.appetite || 4;
                unit.bodyParts = unit.bodyParts || this.SPECIES_DEFAULT_PARTS[unit.species] || [];
                if (typeof YAW_BODY_MASS !== 'undefined') YAW_BODY_MASS.ensure(this, unit);
                unit.creationOptions = unit.creationOptions && typeof unit.creationOptions === 'object' && !Array.isArray(unit.creationOptions)
                    ? JSON.parse(JSON.stringify(unit.creationOptions))
                    : {};
                unit.tags = unit.tags || [species?.name || unit.species || 'Unknown'];
                this._applySpeciesCanon(unit);
                unit.perks = unit.perks || [];
                YAW_PERK_EFFECTS.normalizeUnit(unit);
                unit.pendingPerkChoices = unit.pendingPerkChoices || 0;
                unit.stomach = unit.stomach || [];
                unit.womb = unit.womb || [];
                unit.balls = unit.balls || [];
                unit.inventory = YAW_ITEM_REGISTRY.normalizeCollection(this, unit.inventory);
                unit.equipment = YAW_ITEM_REGISTRY.normalizeEquipment(this, unit.equipment);
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
                if (typeof YAW_COMBAT_STATUS !== 'undefined') YAW_COMBAT_STATUS.normalizeFearStatus(unit);
                unit.lactating = unit.lactating || false;
                unit.lactationCooldown = unit.lactationCooldown || 0;
                YAW_RESOURCE_LEDGER.normalizeUnit(unit);
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
                YAW_COMPANION_BEHAVIOR.normalize(this, unit);
                YAW_MULTI_INTERACTION.normalizeUnit(unit);
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

            _canObserveUnit(observer, target, context = {}) {
                return typeof YAW_AUTONOMOUS_ACTORS === 'undefined'
                    ? true
                    : YAW_AUTONOMOUS_ACTORS.canObserve(this, observer, target, context);
            },

            _emitModuleHook(event, payload = {}) {
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
                    MODULE_SYSTEM.executeHook(event, { ...payload, app: this }).catch(() => {});
                }
            },

            _emitPublicModuleHook(event, envelope = {}) {
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executePublicHook) {
                    MODULE_SYSTEM.executePublicHook(event, envelope).catch(() => {});
                }
            },

            _emitCombatAction(action, actor, target, result) {
                if (typeof YAW_AUDIO_RUNTIME !== 'undefined') {
                    YAW_AUDIO_RUNTIME.play('combat.action', {
                        actorId: this._unitSelectionId?.(Array.isArray(actor) ? actor[0] : actor),
                        targetId: this._unitSelectionId?.(Array.isArray(target) ? target[0] : target)
                    });
                }
                this.emitStoryResult({
                    mode: 'combat',
                    actors: Array.isArray(actor) ? actor : [actor].filter(Boolean),
                    targets: Array.isArray(target) ? target : [target].filter(Boolean),
                    action
                }, result, { mode: 'combat' });
                if (typeof YAW_ACTION_OUTCOMES !== 'undefined') {
                    YAW_ACTION_OUTCOMES.publish(this, {
                        action: String(action || 'unknown').includes(':') ? String(action) : `core:${String(action || 'unknown')}`,
                        mode: 'combat',
                        result: 'committed',
                        actors: Array.isArray(actor) ? actor : [actor].filter(Boolean),
                        targets: Array.isArray(target) ? target : [target].filter(Boolean),
                        summary: typeof result === 'string' ? result : (result?.summary || ''),
                        detail: { compatibilitySource: 'legacy-combat-emitter' }
                    }).catch(() => {});
                }
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

            _resolveTendEffect(actor, target, options = {}) {
                if (!target) return { requestedCondition: 0, restoredCondition: 0, xpAwarded: 0 };
                const maximum = Math.max(1, Number(target.MPun) || 1);
                const before = Math.max(0, Math.min(maximum, Number(target.CPun) || 0));
                const requestedCondition = Math.max(0, Math.floor(Number(
                    options.condition ?? ((actor?.Feed || 10) * 2)
                ) || 0));
                target.CPun = Math.min(maximum, before + requestedCondition);
                const restoredCondition = Math.max(0, target.CPun - before);
                let xpAwarded = 0;
                if (options.awardXP !== false
                    && this.combatState?.active
                    && actor
                    && actor !== target
                    && restoredCondition > 0) {
                    const rewardKey = this.party.includes(target) ? 'feedAlly' : 'feedEnemy';
                    const rewardCap = Math.max(0, Math.floor(Number(this.XP_REWARDS?.[rewardKey]) || 0));
                    const beforeBand = Math.floor(rewardCap * before / maximum);
                    const afterBand = Math.floor(rewardCap * target.CPun / maximum);
                    xpAwarded = Math.max(0, afterBand - beforeBand);
                    if (xpAwarded > 0) this._awardCombatXP(xpAwarded);
                }
                return { requestedCondition, restoredCondition, xpAwarded };
            },

            _balanceConfig() {
                return YAW_BALANCE_SYSTEM.ensure(this);
            },
            _balanceScenarioBaseline() {
                return YAW_BALANCE_SYSTEM.scenarioBaseline(this);
            },
            _interactionBalanceMatrix() {
                return YAW_BALANCE_SYSTEM.interactionMatrix(this);
            },
            _digestionRateState(unit, baseRate = 5) {
                return YAW_BALANCE_SYSTEM.digestionRateState(this, unit, baseRate);
            },
            _hungerCombatPressure(unit) {
                return YAW_BALANCE_SYSTEM.combatPressureState(this, unit);
            },
            _applyHungerCombatPressure(value, unit, kind = 'action') {
                return YAW_BALANCE_SYSTEM.applyCombatPressure(this, value, unit, kind);
            },
            _applyHungerPressure(unit, amount, context = {}) {
                return YAW_BALANCE_SYSTEM.applyHungerPressure(this, unit, amount, context);
            },
            _applyHungerRelief(unit, amount, context = {}) {
                return YAW_BALANCE_SYSTEM.applyHungerRelief(this, unit, amount, context);
            },
            _applyTravelCost(units = this.party, context = {}) {
                return YAW_BALANCE_SYSTEM.applyTravelCost(this, units, context);
            },
            _previewActionCost(action, actor = null, target = null, context = {}) {
                return YAW_BALANCE_SYSTEM.previewActionCost(this, action, actor, target, context);
            },
            _actionCostTitle(action, baseTitle = this._uiLabel(action), actor = null, target = null, context = {}) {
                return YAW_BALANCE_SYSTEM.costTitle(this, action, baseTitle, actor, target, context);
            },
            _canAffordActionPressure(action, actor = null, context = {}) {
                return YAW_BALANCE_SYSTEM.canAffordActionPressure(this, action, actor, context);
            },
            _applyActionCost(action, actor = null, target = null, outcome = {}, context = {}) {
                return YAW_BALANCE_SYSTEM.applyActionCost(this, action, actor, target, outcome, context);
            },
            _spiritThresholdState(unit) {
                return YAW_BALANCE_SYSTEM.spiritThresholdState(this, unit);
            },
            _resolveSpiritThreshold(actor, target, action = 'flirt', context = {}) {
                return YAW_BALANCE_SYSTEM.resolveSpiritThreshold(this, actor, target, action, context);
            },
            _subdueCreature(target, actor = this.player, options = {}) {
                return YAW_RECRUITMENT_FLOW.subdue(this, target, actor, options);
            },
            _costSceneBeat(action, actor, target, costResult = {}) {
                return YAW_BALANCE_SYSTEM.emitCostSceneBeat(this, action, actor, target, costResult);
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
            _encounterPressureForTile(tile, biomeDef = null) {
                return YAW_WORLD_STATE.encounterPressureForTile(this, tile, biomeDef);
            },
            _encounterChanceForTile(tile, biomeDef = null) {
                return YAW_WORLD_STATE.encounterChanceForTile(this, tile, biomeDef);
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
            persistTileDelta(x, y, tile = null, options = {}) {
                return YAW_WORLD_STATE.persistTileDelta(this, x, y, tile, options);
            },
            markWorldTileDirty(x, y, reason = '') {
                return YAW_WORLD_STATE.markWorldTileDirty(this, x, y, reason);
            },
            markCurrentWorldTileDirty(reason = '') {
                return YAW_WORLD_STATE.markCurrentWorldTileDirty(this, reason);
            },
            dirtyWorldTileKeys() {
                return YAW_WORLD_STATE.dirtyWorldTileKeys(this);
            },
            clearDirtyWorldTileKeys(keys = null) {
                return YAW_WORLD_STATE.clearDirtyWorldTileKeys(this, keys);
            },
            persistAllTileDeltas() {
                return YAW_WORLD_STATE.persistAllTileDeltas(this);
            },
            _prepareSaveSnapshot() {
                const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
                const start = now();
                const debug = {
                    worldMapSize: this.worldMap?.size || 0,
                    tileDeltaCountBefore: this.tileDeltas?.size || 0
                };
                let phaseStart = now();
                this._syncPlayerPartyReference();
                debug.syncPlayerPartyMs = Math.round(now() - phaseStart);
                phaseStart = now();
                this._normalizeExplorationSelections();
                debug.normalizeSelectionsMs = Math.round(now() - phaseStart);
                phaseStart = now();
                this._syncCurrentTileCreatures();
                debug.syncCurrentTileCreaturesMs = Math.round(now() - phaseStart);
                phaseStart = now();
                const deltas = this.persistAllTileDeltas();
                debug.persistAllTileDeltasMs = Math.round(now() - phaseStart);
                debug.tileDeltaCountAfter = deltas?.size || this.tileDeltas?.size || 0;
                debug.totalMs = Math.round(now() - start);
                this._lastSaveSnapshotDebug = debug;
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
            revealVisibleTiles(x = this.location.x, y = this.location.y, radius = this._mapVisibilityRadius()) {
                return YAW_WORLD_STATE.revealVisibleTiles(this, x, y, radius);
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

            _traversalDecision(dx, dy) {
                return YAW_TRAVERSAL.resolve(this, dx, dy);
            },

            _traversalMessage(decision) {
                return YAW_TRAVERSAL.message(this, decision);
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
            _estimateOpeningEnemyHit(enemy, target) {
                const entry = Number(enemy?.Figh || 1);
                const maxRating = entry > 55 ? entry + 11
                    : entry > 45 ? entry + 9
                        : entry > 35 ? entry + 7
                            : entry > 25 ? entry + 5
                                : entry + 3;
                const defense = Number(this._effectiveCon?.(target) ?? target?.con ?? 0);
                const multiplier = Number(this._physicalDamageMultiplier?.(enemy, target) || 1);
                return Math.max(1, Math.floor(Math.max(1, maxRating - defense * 0.3 + 6) * multiplier));
            },
            _openingEncounterAdmitted(enemies = [], tile = null) {
                if (tile?.encounterPolicy?.band !== 'opening') return true;
                const party = (this.party || []).filter(unit => unit && unit.CPun > 0 && !unit.knockedOut);
                if (party.length === 0) return false;
                const weakest = party.reduce((current, unit) => {
                    if (!current) return unit;
                    return Number(unit.MPun || unit.CPun || 1) < Number(current.MPun || current.CPun || 1) ? unit : current;
                }, null);
                const fullHealth = Math.max(1, Number(weakest?.MPun || weakest?.CPun || 1));
                const estimates = enemies.map(enemy => this._estimateOpeningEnemyHit(enemy, weakest));
                const worstHit = estimates.length ? Math.max(...estimates) : 0;
                const openingRound = estimates.reduce((sum, value) => sum + value, 0);
                return worstHit < fullHealth * 0.65 && openingRound < fullHealth * 0.8;
            },
            spawnWildEncounter(tile, isBoss = false, firstEntry = false) {
                const biome = this.biomes[tile.biome];
                const tileX = Number.isFinite(tile?.x) ? tile.x : 0;
                const tileY = Number.isFinite(tile?.y) ? tile.y : 0;
                const tileKey = Number.isFinite(tile?.x) && Number.isFinite(tile?.y) ? `${tile.x}_${tile.y}` : 'unknown';
                const encounterPolicy = tile?.encounterPolicy || (typeof WorldGen !== 'undefined'
                    ? WorldGen.getStartSafetyPolicy(this.worldMeta, tileX, tileY)
                    : null);
                if (!isBoss && encounterPolicy?.hostileAllowed === false) return false;
                const roll = (purpose, index = 0, salt = '') => this._worldRoll(`wild-${purpose}`, tileX, tileY, index, salt);
                const pick = (table, purpose, index = 0, salt = '') => this._weightedPickWorld(table, `wild-${purpose}`, tileX, tileY, index, salt);
                const rolledCount = isBoss ? 1 : Math.max(1, Math.floor(roll('count') * Math.min(3, Math.max(1, this.player.level - 1))) + 1);
                const count = encounterPolicy?.maxHostiles != null && Number.isFinite(Number(encounterPolicy.maxHostiles))
                    ? Math.min(rolledCount, Math.max(1, Number(encounterPolicy.maxHostiles)))
                    : rolledCount;
                const creatures = [];
                for (let i = 0; i < count; i++) {
                    const pool = YAW_QUEST_CONTRACT.boostWeightedTable(
                        this,
                        this._timeAdjustedEncounterTable(biome.encounterTable),
                        YAW_QUEST_CONTRACT.WORLD_CONTENT_KINDS.CREATURE,
                        tile
                    );
                    const worldScale = typeof YAW_WORLD_SCALING !== 'undefined'
                        ? YAW_WORLD_SCALING.profile(this, tile, biome.danger || 3)
                        : { difficulty: biome.danger || 3 };
                    const danger = worldScale.difficulty;
                    const playerMaxDiff = this.player.level <= 3 ? 2 : (this.player.level <= 6 ? 3 : 4);
                    const policyMax = encounterPolicy?.maxDifficulty != null && Number.isFinite(Number(encounterPolicy.maxDifficulty))
                        ? Number(encounterPolicy.maxDifficulty)
                        : Infinity;
                    const maxDiff = isBoss ? 5 : Math.min(danger, playerMaxDiff, policyMax);
                    const eligiblePool = pool.filter(entry => {
                        const speciesId = typeof entry === 'string' ? entry : entry?.id;
                        return (this.SPECIES_DIFFICULTY[speciesId] || 2) <= maxDiff;
                    });
                    const globalEligible = this.species
                        .filter(entry => (this.SPECIES_DIFFICULTY[entry.id] || 2) <= maxDiff)
                        .map(entry => ({ id: entry.id, weight: 1 }));
                    const sid = pick(eligiblePool.length ? eligiblePool : (globalEligible.length ? globalEligible : pool), 'species', i);
                    const sp = this.species.find(s => s.id === sid);
                    if (!sp) continue;
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
                    creature.ambushReady = encounterPolicy?.allowAmbush !== false && firstEntry && Boolean(this._getSpeciesTemperament(sid).ambush);
                    creature.reinforcementBlocked = encounterPolicy?.allowReinforcement === false;
                    this._applyTimeOfDayToCreature(creature);
                    // Calculate disposition based on temperament
                    creature.disposition = this._calculateEncounterDisposition(creature, this.player);
                    creatures.push(creature);
                }
                const openingHostiles = this._livingEnemies(creatures);
                if (!this._openingEncounterAdmitted(openingHostiles, tile)) {
                    for (const creature of openingHostiles) {
                        creature.disposition = this.DISPOSITION.NEUTRAL;
                        creature.encounterSafetyDeferred = true;
                    }
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
                    encounterText = this._label('encounter.hostile', 'You encounter {names}! They are aggressive!', { names: enemies.map(e => e.name).join(', ') });
                    if (neutrals.length > 0) encounterText += ` ${this._label('encounter.neutralNearby', 'Nearby, {names} watch cautiously.', { names: neutrals.map(n => n.name).join(', ') })}`;
                    if (friendlies.length > 0) encounterText += ` ${this._label('encounter.friendlyUnconcerned', '{names} seem unconcerned.', { names: friendlies.map(f => f.name).join(', ') })}`;
                } else if (neutrals.length > 0) {
                    encounterText = this._label('encounter.neutral', 'You spot {names}. They watch you cautiously.', { names: neutrals.map(n => n.name).join(', ') });
                    if (friendlies.length > 0) encounterText += ` ${this._label('encounter.friendlyNearby', '{names} seem friendly.', { names: friendlies.map(f => f.name).join(', ') })}`;
                } else {
                    encounterText = this._label('encounter.friendly', 'You spot {names}. They seem friendly.', { names: friendlies.map(f => f.name).join(', ') });
                }
                this.updateScene(`${biome.name} - ${tile.hasLandmark ? tile.landmarkName : this._label('ui.scene.wildernessTitle', 'The Wilderness')}`, biomeText + '\n\n' + encounterText, enemies.length > 0);
                this.log.push({ text: encounterText, type: enemies.length > 0 ? 'combat' : 'discovery' });
                if (enemies.length > 0) this.showToast({ text: encounterText, type: 'danger', importance: 'major', dedupeKey: `encounter:${tile.x},${tile.y}` });
                if (enemies.length > 0) {
                    if (isBoss) this.log.push({ text: this._label('encounter.guardian', 'A powerful guardian guards {landmark}!', { landmark: tile.landmarkName }), type: 'combat' });
                    this.startCombat(enemies);
                } else {
                    this.renderCreatures();
                    this.renderExplorationActions();
                }
                return creatures;
            },
            spawnStructureEncounter(tile, firstEntry = false) {
                const biome = this.biomes[tile.biome];
                if (!tile.structure || !this.STRUCTURES[tile.structure]) return;
                const struct = this.STRUCTURES[tile.structure];
                if (tile.encounterPolicy?.allowHostileStructures === false
                    && (struct.disposition === 'enemy' || Number(struct.threat || 0) >= 2)) return false;
                tile.structureSpawned = true;
                const merchant = this._maybeSpawnStructureMerchant(tile);
                const questGiver = this._maybeSpawnStructureQuestGiver(tile);
                this.persistTileDelta(tile.x, tile.y, tile);
                // Structure always has an encounter inside
                if (this._worldChance('structure-encounter', tile.x, tile.y, struct.encounterChance || 0)) {
                    // Pick from structure-appropriate pool or biome pool
                    const pool = YAW_QUEST_CONTRACT.boostWeightedTable(
                        this,
                        this._timeAdjustedEncounterTable(biome.encounterTable),
                        YAW_QUEST_CONTRACT.WORLD_CONTENT_KINDS.CREATURE,
                        tile
                    );
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
                        creature.ambushReady = tile.encounterPolicy?.allowAmbush !== false && firstEntry && Boolean(this._getSpeciesTemperament(sid).ambush);
                        creature.reinforcementBlocked = tile.encounterPolicy?.allowReinforcement === false;
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
                    const dispositionKey = disp === this.DISPOSITION.ENEMY ? 'disposition.hostile' : (disp === this.DISPOSITION.FRIENDLY ? 'disposition.friendly' : 'disposition.neutral');
                    const encounterText = this._label('structure.encounter.occupants', 'You found {structure}! {description} Occupants ({disposition}, {count}): {names}.', {
                        structure: struct.name,
                        description: structDesc,
                        disposition: this._label(dispositionKey, disp),
                        count: enemies.length,
                        names: enemies.map(enemy => enemy.name).join(', ')
                    });
                    this.updateScene(`${struct.name} - ${biome.name}`, biomeText + '\n\n' + encounterText, disp === this.DISPOSITION.ENEMY);
                    this.log.push({ text: this._label('structure.encounter.discovered', 'Discovered {name}! {details}', { name: struct.name, details: encounterText }), type: 'discovery' });
                    if (livingEnemies.length > 0) this.showToast({ text: encounterText, type: 'danger', importance: 'major', dedupeKey: `structure-encounter:${tile.x},${tile.y}` });
                    if (livingEnemies.length > 0) {
                        this.log.push({ text: this._label('combat.startedWith', 'Combat started with {names}!', { names: livingEnemies.map(e => e.name).join(', ') }), type: 'combat' });
                        this.startCombat(livingEnemies);
                    } else {
                        this.renderCreatures();
                        this.renderExplorationActions();
                    }
                } else if (merchant || questGiver) {
                    const descIdx = Math.abs(tile.x + tile.y) % struct.descriptions.length;
                    const structDesc = struct.descriptions[descIdx];
                    const visitors = [];
                    if (merchant) visitors.push(this._label('structure.encounter.merchantHere', '{name} is trading here', { name: merchant.name }));
                    if (questGiver) visitors.push(this._label('structure.encounter.questGiverHere', '{name} has work for you', { name: questGiver.name }));
                    const encounterText = this._label('structure.encounter.services', 'You found {structure}. {description} {visitors}.', {
                        structure: struct.name,
                        description: structDesc,
                        visitors: visitors.join(', ')
                    });
                    this.updateScene(`${struct.name} - ${biome.name}`, encounterText, false);
                    this.log.push({ text: encounterText, type: 'discovery' });
                    this.renderCreatures();
                    this.renderExplorationActions();
                } else {
                    // Empty structure
                    const descIdx = Math.abs(tile.x + tile.y) % struct.descriptions.length;
                    const structDesc = struct.descriptions[descIdx];
                    this.log.push({ text: this._label('structure.encounter.empty', 'You found {structure}. {description} It seems empty.', {
                        structure: struct.name,
                        description: structDesc
                    }), type: 'discovery' });
                    this.showExplorationActions();
                }
            },


            // ===== COMBAT SYSTEM =====
            startCombat(enemies, options = {}) {
                return YAW_COMBAT_LIFECYCLE.start(this, enemies, options);
            },

            _ensureCurrentHostileEncounter(options = {}) {
                return YAW_COMBAT_LIFECYCLE.ensureCurrentEncounter(this, options);
            },

            _ambushInitiativeBonus() {
                return YAW_COMBAT_ACTOR_STATE.ambushInitiativeBonus(this);
            },

            _resolveAmbushAwareness(enemies = []) {
                return YAW_COMBAT_ACTOR_STATE.resolveAmbushAwareness(this, enemies);
            },

            _calcInitiative(c) {
                return YAW_COMBAT_ACTOR_STATE.initiative(this, c);
            },

            _syncActionLabel(type) {
                return YAW_COMBAT_ACTOR_STATE.syncActionLabel(this, type);
            },

            _pendingSyncForUnit(unit) {
                return YAW_COMBAT_ACTOR_STATE.pendingSyncForUnit(this, unit);
            },

            _turnOrderInfo(unit) {
                return YAW_COMBAT_ACTOR_STATE.turnOrderInfo(this, unit);
            },

            _turnOrderBadge(unit) {
                return YAW_COMBAT_ACTOR_STATE.turnOrderBadge(this, unit);
            },

            _srOnly(text, attrs = '') {
                return YAW_UI_TEXT.srOnly(this, text, attrs);
            },

            _combatStatusText(unit) {
                return YAW_COMBAT_ACTOR_STATE.statusText(this, unit);
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

            _prepareCombatRows(units) {
                return YAW_COMBAT_RULES.prepareCombatRows(this, units);
            },

            _isPhysicalCombatAction(action) {
                return YAW_COMBAT_RULES.isPhysicalCombatAction(action);
            },

            _isReachSensitiveCombatAction(action) {
                return YAW_COMBAT_RULES.isReachSensitiveCombatAction(action);
            },

            _combatReachProfile(actor, action = 'fight', options = {}) {
                return YAW_COMBAT_RULES.intentReachProfile(this, actor, action, options);
            },

            _combatReachResult(actor, target, action = 'fight', options = {}) {
                return YAW_COMBAT_RULES.reachResult(this, actor, target, action, options);
            },

            _canAttemptCombatTarget(actor, target, action = 'fight', options = {}) {
                return YAW_COMBAT_RULES.canAttemptCombatTarget(this, actor, target, action, options);
            },

            _canReachCombatTarget(actor, target, action = 'fight', options = {}) {
                return YAW_COMBAT_RULES.canReachCombatTarget(this, actor, target, action, options);
            },

            _combatReachFailureText(actors = [], target = null, action = 'fight', reach = null) {
                return YAW_COMBAT_RULES.reachFailureText(this, actors, target, action, reach);
            },

            _combatMoveRowIntentLabel(actor = null) {
                return YAW_COMBAT_RULES.moveRowIntentLabel(this, actor);
            },

            _combatFleeRowModifier(actor = null, enemies = []) {
                return YAW_COMBAT_RULES.fleeRowModifier(this, actor, enemies);
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
            _fearState(unit) {
                return YAW_COMBAT_STATUS.fearState(this, unit);
            },
            _resolveFearTurn(unit) {
                return YAW_COMBAT_STATUS.resolveFearTurn(this, unit);
            },
            _applyFearStatus(unit, options = {}) {
                return YAW_COMBAT_STATUS.applyFearStatus(this, unit, options);
            },

            _applyAttackStatus(actor, target, dmg) {
                return YAW_COMBAT_STATUS.applyAttackStatus(this, actor, target, dmg);
            },

            _applyTechniqueStatus(actor, target, profile, dmg) {
                return YAW_COMBAT_STATUS.applyTechniqueStatus(this, actor, target, profile, dmg);
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

            _processDigestion(options = {}) {
                const all = [...this.party, ...this.creatures];
                for (const unit of all) {
                    this._processStomachState(unit, options);
                    const resourceChanges = YAW_RESOURCE_LEDGER.tick(unit, 'digestion', Math.max(1, Math.floor(Number(options.ticks) || 1)));
                    if (resourceChanges.length > 0 && this.party.includes(unit)) {
                        this._markSaveDirty?.('party', 'resource-regeneration');
                        this._markSaveDirty?.('holdings', 'resource-regeneration');
                    }
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

            _combatTargetPickHint(unit, action, canTarget) {
                return YAW_COMBAT_TARGETING.targetPickHint(this, unit, action, canTarget);
            },
            _combatTargetPickLabel(unit = null, action = 'action', canTarget = true) {
                if (unit) return YAW_COMBAT_TARGETING.targetPickLabel(this, unit, action, canTarget);
                return YAW_UNIT_SELECTION.combatTargetPickLabel(this);
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

            toggleCombatTarget(targetId) {
                return YAW_COMBAT_TARGETING.toggleMarkedTarget(this, targetId);
            },

            _clearCombatMarkedTargets() {
                return YAW_COMBAT_TARGETING.clearMarkedTargets(this);
            },

            confirmCombatTargets(forceChoose = false, actor = this.activeActor || this._currentCombatActor()) {
                // Keep the historical actor-first API for scripts and tests;
                // UI callers pass the explicit boolean to request the chooser.
                if (forceChoose && typeof forceChoose === 'object') {
                    actor = forceChoose;
                    forceChoose = false;
                }
                return YAW_COMBAT_TARGETING.confirmMarkedTargetSelection(this, actor, { forceChoose });
            },

            _combatMarkedTarget() {
                return YAW_COMBAT_TARGETING.markedTarget(this);
            },

            _combatMarkedTargets() {
                return YAW_COMBAT_TARGETING.markedTargets(this);
            },

            _isCombatMarkedTarget(unit) {
                return YAW_COMBAT_TARGETING.isMarkedTarget(this, unit);
            },

            _executeCombatIntentOnMarkedTarget(action, actor = this.activeActor || this._currentCombatActor(), options = {}) {
                return YAW_COMBAT_TARGETING.executeIntentOnMarkedTarget(this, action, actor, options);
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

            queueSyncAction(syncType, targetIndex, command = null) {
                return YAW_COMBAT_SYNC.queueAction(this, syncType, targetIndex, command);
            },

            _resolveCombatAction(command) {
                return YAW_COMBAT_RESOLUTION.resolveCommand(this, command);
            },

            executeActionAgainstTarget(action, actor, target) {
                if (arguments.length > 3) return YAW_COMBAT_RESOLUTION.executeActionAgainstTarget(this, action, actor, target, arguments[3]);
                return YAW_COMBAT_RESOLUTION.executeActionAgainstTarget(this, action, actor, target);
            },

            // ===== SUB-ACTION ENGINE =====
            _doSubAction(action, subId, actor, target, actorName, actorVerb, options = {}) {
                const subDef = this.SUB_ACTIONS[action] && this.SUB_ACTIONS[action][subId];
                if (!subDef) return `[Unknown sub-action ${action}.${subId}]`;
                const actorIsPlayer = actor === this.player || actor?.name === this.player?.name;
                const displayActorName = actorIsPlayer
                    ? this._label('party.you', 'You')
                    : (actorName || actor?.name || this._label('target.actorRole', 'Actor'));
                let result = '';
                switch (action + '.' + subId) {
                    case 'feast.swallow': {
                        if (actor === target) {
                            result = this._label('group.feast.selfBlocked', '{target} cannot eat themself. Select another party member as the target.', { target: target.name });
                            break;
                        }
                        if (!this._canFitPrey(actor, target, 'stomach')) { result = this._capacityFailureMessage(actor, target, 'stomach'); break; }
                        const targetWasParty = this.party.includes(target);
                        const attempt = this._assessFeastAttempt(actor, target);
                        if (!attempt.succeeds) {
                            result = this._label('feast.attempt.resisted', '{actor} tries to eat {target}, but {target} resists.', { actor: actorName, target: target.name });
                            break;
                        }
                        this._containTargetIn(actor, target, 'stomach');
                        actor.CPun = Math.min(actor.MPun, actor.CPun + 20);
                        actor.Feas += 1;
                        if (!targetWasParty) {
                            this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                            this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                        }
                        const playerActor = actor.name === this.player?.name;
                        result = this._mlabel(playerActor ? 'feast.swallowResult.player' : 'feast.swallowResult.named', playerActor
                            ? '{actor} eats {target}! They are held in your belly.'
                            : "{actor} eats {target}! They are held in {owner}'s belly.", {
                            actor: actorName,
                            target: target.name,
                            owner: actor.name
                        });
                        break;
                    }
                    case 'feast.chew': {
                        const outcome = this._resolveChewAttack(actor, target, {
                            mode: options.mode,
                            multiEffect: options.multiEffect,
                            awardXP: options.awardXP
                        });
                        result = outcome.depleted
                            ? this._mlabel(actorIsPlayer ? 'feast.chewResult.player' : 'feast.chewResult', actorIsPlayer
                                ? '{actor} chew into {target} for {amount} vitality and punishment damage. {target} is depleted and leaves recoverable remains.'
                                : '{actor} chews into {target} for {amount} vitality and punishment damage. {target} is depleted and leaves recoverable remains.', {
                                actor: actorName,
                                target: target.name,
                                amount: outcome.damage
                            })
                            : this._label(actorIsPlayer ? 'feast.chewDamageResult.player' : 'feast.chewDamageResult', actorIsPlayer
                                ? '{actor} chew into {target} for {amount} vitality and punishment damage.'
                                : '{actor} chews into {target} for {amount} vitality and punishment damage.', {
                                actor: actorName,
                                target: target.name,
                                amount: outcome.damage
                            });
                        break;
                    }
                    case 'feast.cockVore': {
                        if (!actor.parts || actor.parts !== 'cock') {
                            result = this._label(actorIsPlayer ? 'variant.unavailable.actorCapability.player' : 'variant.unavailable.actorCapability.named', actorIsPlayer
                                ? '{name} do not have the required capability.'
                                : '{name} does not have the required capability.', { name: displayActorName });
                            break;
                        }
                        if (!this._canFitPrey(actor, target, 'balls')) { result = this._capacityFailureMessage(actor, target, 'balls'); break; }
                        const attempt = this._assessFeastAttempt(actor, target, { container: 'balls' });
                        if (!attempt.succeeds) {
                            result = this._label('feast.attempt.captureResisted', '{actor} tries to capture {target}, but {target} breaks free.', { actor: actorName, target: target.name });
                            break;
                        }
                        this._containTargetIn(actor, target, 'balls', { inCock: true });
                        actor.CPun = Math.min(actor.MPun, actor.CPun + 15);
                        actor.cum = (actor.cum || 0) + 1;
                        this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                        result = CONTENT.actionResult('cockVore', { actor: actorName, target: target.name });
                        break;
                    }
                    case 'feast.unbirth': {
                        if (!actor.parts || actor.parts !== 'clit') {
                            result = this._label(actorIsPlayer ? 'variant.unavailable.actorCapability.player' : 'variant.unavailable.actorCapability.named', actorIsPlayer
                                ? '{name} do not have the required capability.'
                                : '{name} does not have the required capability.', { name: displayActorName });
                            break;
                        }
                        if (!this._canFitPrey(actor, target, 'womb')) { result = this._capacityFailureMessage(actor, target, 'womb'); break; }
                        const attempt = this._assessFeastAttempt(actor, target, { container: 'womb' });
                        if (!attempt.succeeds) {
                            result = this._label('feast.attempt.engulfResisted', '{actor} tries to engulf {target}, but {target} breaks free.', { actor: actorName, target: target.name });
                            break;
                        }
                        this._containTargetIn(actor, target, 'womb', { inWomb: true });
                        actor.CPun = Math.min(actor.MPun, actor.CPun + 15);
                        this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
                        result = CONTENT.actionResult('unbirth', { actor: actorName, target: target.name });
                        break;
                    }
                    case 'feast.digest': {
                        const livingStomach = this._activeContainedPrey(actor, 'stomach');
                        if (livingStomach.length === 0) {
                            const playerActor = actor.name === this.player?.name;
                            result = this._label(playerActor ? 'feast.digestUnavailable.player' : 'feast.digestUnavailable.named', playerActor
                                ? '{actor} have no one held in your belly.'
                                : '{actor} has no one held in their belly.', { actor: actorName });
                            break;
                        }
                        const prey = livingStomach[0];
                        prey.progress = 100;
                        prey.digestionProgress = 100;
                        YAW_UNIT_CONTAINMENT.terminalize(this, actor, prey, { key: 'stomach' });
                        const playerActor = actor.name === this.player?.name;
                        result = this._mlabel(playerActor ? 'feast.digestResult.player' : 'feast.digestResult.named', playerActor
                            ? '{actor} actively digest {target}, fully breaking them down.'
                            : '{actor} actively digests {target}, fully breaking them down.', {
                            actor: actorName,
                            target: prey.name
                        });
                        break;
                    }
                    case 'feast.release': {
                        const livingStomach = this._activeContainedPrey(actor, 'stomach').filter(p => p.releaseEligible);
                        if (livingStomach.length === 0) {
                            const playerActor = actor.name === this.player?.name;
                            result = this._label(playerActor ? 'feast.releaseUnavailable.player' : 'feast.releaseUnavailable.named', playerActor
                                ? '{actor} have no living prey to release.'
                                : '{actor} has no living prey to release.', { actor: actorName });
                            break;
                        }
                        const prey = livingStomach[0];
                        const idx = actor.stomach.indexOf(prey);
                        if (idx >= 0) actor.stomach.splice(idx, 1);
                        this._releaseFromVitalState(prey);
                        YAW_UNIT_CONTAINMENT.refreshReleasedService(this, prey);
                        if (this.creatures.indexOf(prey) === -1) this.creatures.push(prey);
                        this._syncCurrentTileCreatures();
                        YAW_UNIT_CONTAINMENT.emitContainmentBeat(this, 'released', actor, prey, {
                            deltas: [{ kind: 'state', state: 'released', unit: prey.name }]
                        });
                        this.log.push({ text: this._label('feast.releaseLog', "{target} is released from {holder}'s stomach at reduced condition.", {
                            target: prey.name,
                            holder: actor.name
                        }), type: 'combat' });
                        const playerActor = actor.name === this.player?.name;
                        result = this._label(playerActor ? 'feast.releaseResult.player' : 'feast.releaseResult.named', playerActor
                            ? '{actor} release {target} from your belly, weak and dazed but alive.'
                            : '{actor} releases {target} from their belly, weak and dazed but alive.', {
                            actor: actorName,
                            target: prey.name
                        });
                        break;
                    }
                    case 'feed.tend':
                    case 'feed.heal': {
                        const tend = this._resolveTendEffect(actor, target);
                        const playerActor = actor.name === this.player?.name;
                        result = this._label(playerActor ? 'feed.tendResult.player' : 'feed.tendResult.named', playerActor
                            ? '{actor} tend {target}, restoring {amount} punishment.'
                            : '{actor} tends {target}, restoring {amount} punishment.', {
                            actor: actorName,
                            target: target.name,
                            amount: tend.restoredCondition
                        });
                        break;
                    }
                    case 'feed.nurse':
                    case 'feed.breastfeed': {
                        const playerActor = actor.name === this.player?.name;
                        if (!actor.lactating) {
                            result = this._label(playerActor ? 'feed.nurseUnavailable.player' : 'feed.nurseUnavailable.named', '{actor} cannot nurse right now.', { actor: actorName });
                            break;
                        }
                        if (actor.lactationCooldown > 0) {
                            result = this._label(playerActor ? 'feed.nurseCooldown.player' : 'feed.nurseCooldown.named', '{actor} cannot nurse again yet.', { actor: actorName });
                            break;
                        }
                        const spentReserve = YAW_RESOURCE_LEDGER.spend(actor, 'core:nurse', 1);
                        if (spentReserve < 1) {
                            result = this._label('feed.nurseReserveUnavailable', '{actor} does not have enough {resource}.', {
                                actor: actorName,
                                resource: YAW_RESOURCE_LEDGER.label(this, 'core:nurse')
                            });
                            break;
                        }
                        if (this.party.includes(actor)) {
                            this._markSaveDirty?.('party', 'nurse-resource-spend');
                            this._markSaveDirty?.('holdings', 'nurse-resource-spend');
                        }
                        const milkAmount = Math.floor((actor.Feed || 10) * 3) * spentReserve;
                        target.CPun = Math.min(target.MPun, target.CPun + milkAmount);
                        target.CPle = Math.min(target.MPle, target.CPle + Math.floor(milkAmount * 0.3));
                        target.hunger = Math.max(0, (target.hunger || 0) - (40 * spentReserve));
                        actor.lactationCooldown = 3;
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = this._mlabel(playerActor ? 'feed.nurseResult.player' : 'feed.nurseResult.named', playerActor
                            ? '{actor} nurse {target}, restoring vitality and easing their hunger.'
                            : '{actor} nurses {target}, restoring vitality and easing their hunger.', {
                            actor: actorName,
                            target: target.name
                        });
                        break;
                    }
                    case 'feed.offerWhole': {
                        if (actor === target) {
                            result = this._label('feed.offerWholeSelfBlocked', '{name} cannot offer themself to themself.', { name: actor.name });
                            break;
                        }
                        if (actor === this.player || actor.mc) {
                            result = this._label('feed.offerWholePlayerDeferred', 'Whole-self offering for the player is not available until living capture has a safe playable recovery loop.');
                            break;
                        }
                        if (!actor.livestock && !actor.willingPrey) {
                            result = this._label('feed.offerWholeUnwilling', '{name} is not willing to offer themself whole.', { name: actor.name });
                            break;
                        }
                        if (!this._canFitPrey(target, actor, 'stomach')) {
                            result = this._capacityFailureMessage(target, actor, 'stomach');
                            break;
                        }
                        this._containTargetIn(target, actor, 'stomach', { willingSacrifice: true, feedContract: 'offer-whole' });
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = this._mlabel('feed.offerWholeResult', '{actor} willingly offers themself to {target} and settles in their belly.', {
                            actor: actor.name,
                            target: target.name
                        });
                        break;
                    }
                    case 'feed.offerPiece': {
                        const renewable = actor.renewableBody || actor.slurpable || actor.breakable || /slime/i.test(String(actor.species || ''));
                        const pieceCost = Math.max(2, Math.floor((actor.MPun || 1) * 0.15));
                        if (!renewable) {
                            result = this._label('feed.offerPieceUnavailable', '{name} cannot safely offer a renewable piece.', { name: actor.name });
                            break;
                        }
                        if (actor === target || actor.CPun <= pieceCost) {
                            result = this._label('feed.offerPieceTooWeak', '{name} is too weak to offer a piece right now.', { name: actor.name });
                            break;
                        }
                        const nourishment = Math.max(4, Math.floor((actor.Feed || 10) * 1.5));
                        actor.CPun = Math.max(1, actor.CPun - pieceCost);
                        target.CPun = Math.min(target.MPun, target.CPun + nourishment);
                        target.hunger = Math.max(0, (target.hunger || 0) - Math.max(10, pieceCost));
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = this._label('feed.offerPieceResult', 'A renewable piece from {actor} restores {amount} punishment to {target}, at a cost of {cost} punishment to {actor}.', {
                            actor: actorName,
                            target: target.name,
                            cost: pieceCost,
                            amount: nourishment
                        });
                        break;
                    }
                    case 'feed.sacrifice': {
                        const isWilling = target.livestock || target.willingPrey;
                        if (!isWilling && !this.cheats.canEatAnything) {
                            result = this._label('feed.legacy.sacrificeRefused', '{target} refuses to be offered to {actor}.', { target: target.name, actor: displayActorName });
                            break;
                        }
                        if (actor.size < target.size - 2) {
                            result = this._label(actorIsPlayer ? 'feed.legacy.tooSmall.player' : 'feed.legacy.tooSmall.named', actorIsPlayer
                                ? '{actor} are too small to hold {target}.'
                                : '{actor} is too small to hold {target}.', { actor: displayActorName, target: target.name });
                            break;
                        }
                        if (!this._canFitPrey(actor, target, 'stomach')) { result = this._capacityFailureMessage(actor, target, 'stomach'); break; }
                        this._containTargetIn(actor, target, 'stomach', { willingSacrifice: true });
                        this._awardCombatXP(this.XP_REWARDS.feedEnemy);
                        result = this._mlabel('feed.legacy.sacrificeResult', '{target} willingly offers themself to {actor} and settles in their belly.', { target: target.name, actor: displayActorName });
                        break;
                    }
                    case 'feed.forceFeed': {
                        const holders = this.party.filter(p => p !== actor && p !== target && p.CPun > 0);
                        if (holders.length === 0 && this.creatures.filter(c => c.CPun > 0 && c !== target && c !== actor).length === 0) {
                            result = this._label('feed.legacy.noHolder', 'No one is available to restrain {target}.', { target: target.name });
                            break;
                        }
                        const holder = holders[0] || this.creatures.filter(c => c.CPun > 0 && c !== target && c !== actor)[0];
                        if (actor.size < target.size - 2) {
                            result = this._label(actorIsPlayer ? 'feed.legacy.tooSmall.player' : 'feed.legacy.tooSmall.named', actorIsPlayer
                                ? '{actor} are too small to hold {target}.'
                                : '{actor} is too small to hold {target}.', { actor: displayActorName, target: target.name });
                            break;
                        }
                        if (!this._canFitPrey(actor, target, 'stomach')) { result = this._capacityFailureMessage(actor, target, 'stomach'); break; }
                        this._containTargetIn(actor, target, 'stomach', { forcedFed: true, by: actor.name });
                        target.forcedFed = true;
                        actor.forcedFed = true;
                        this._awardCombatXP(this.XP_REWARDS.feedEnemy);
                        result = this._mlabel(actorIsPlayer ? 'feed.legacy.forceResult.player' : 'feed.legacy.forceResult.named', actorIsPlayer
                            ? '{holder} restrains {target} while {actor} force the handoff, placing them in your belly against their will.'
                            : "{holder} restrains {target} while {actor} forces the handoff, placing them in {actor}'s belly against their will.", {
                            holder: holder.name,
                            target: target.name,
                            actor: displayActorName
                        });
                        break;
                    }
                    case 'feed.slurp': {
                        if (!target.slurpable) {
                            result = this._label('feed.legacy.drawUnavailable', '{target} cannot provide renewable nourishment.', { target: target.name });
                            break;
                        }
                        const slurpAmount = Math.floor((actor.Feed || 10) * 1.5);
                        this._applyVitalDamage(target, slurpAmount, { source: 'slurp', terminal: false, minimumCondition: 1 });
                        if (target.vitalRemaining <= 0) target.state = 'depleted';
                        target.CPle = Math.min(target.MPle, target.CPle + Math.floor(slurpAmount * 0.2));
                        actor.CPun = Math.min(actor.MPun, actor.CPun + slurpAmount);
                        actor.hunger = Math.max(0, (actor.hunger || 0) - 20);
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = this._mlabel(actorIsPlayer ? 'feed.legacy.drawResult.player' : 'feed.legacy.drawResult.named', actorIsPlayer
                            ? '{actor} draw vitality from {target}, leaving them weakened but whole.'
                            : '{actor} draws vitality from {target}, leaving them weakened but whole.', { actor: displayActorName, target: target.name });
                        break;
                    }
                    case 'feed.fragment': {
                        if (!target.breakable) {
                            result = this._label('feed.legacy.fragmentUnavailable', '{target} cannot provide a renewable fragment.', { target: target.name });
                            break;
                        }
                        const fragAmount = Math.floor((actor.Feed || 10) * 1.5);
                        this._applyVitalDamage(target, fragAmount, { source: 'fragment', terminal: false, minimumCondition: 1 });
                        if (target.vitalRemaining <= 0) target.state = 'depleted';
                        actor.CPun = Math.min(actor.MPun, actor.CPun + fragAmount);
                        actor.hunger = Math.max(0, (actor.hunger || 0) - 20);
                        this._awardCombatXP(this.XP_REWARDS.feedAlly);
                        result = this._label(actorIsPlayer ? 'feed.legacy.fragmentResult.player' : 'feed.legacy.fragmentResult.named', actorIsPlayer
                            ? '{actor} reduce vitality from {target} as nourishment. {target} is diminished but remains whole.'
                            : '{actor} reduces vitality from {target} as nourishment. {target} is diminished but remains whole.', { actor: displayActorName, target: target.name });
                        break;
                    }
                    default: {
                        if (typeof subDef.execute === 'function') {
                            try {
                                const customResult = subDef.execute(actor, target, {
                                    app: this, action, subAction: subId, actorName, actorVerb
                                });
                                result = typeof customResult === 'string'
                                    ? customResult
                                    : (customResult?.summary || this._label('variant.executed', '{variant} completed.', { variant: this._getActionLabel(action, subId) }));
                            } catch (error) {
                                console.error(`Action variant failed (${action}.${subId}):`, error);
                                result = this._label('variant.executionFailed', '{variant} could not be completed.', { variant: this._getActionLabel(action, subId) });
                            }
                        } else {
                            result = this._label('variant.notImplemented', '{action} variant {variant} is not implemented.', {
                                action: this._uiLabel(action),
                                variant: this._getActionLabel(action, subId)
                            });
                        }
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
            _processDigestionContainer(unit, config, options = {}) {
                return YAW_UNIT_CONTAINMENT.processContainer(this, unit, config, options);
            },
            _processStomachState(unit, options = {}) {
                return YAW_UNIT_CONTAINMENT.process(this, unit, options);
            },

            // ===== MODDING API =====
            registerFeastVerbProfile(profile) {
                return YAW_UNIT_CONTAINMENT.registerFeastVerbProfile(this, profile);
            },
            registerContainerProfile(profile) {
                return YAW_UNIT_CONTAINMENT.registerContainerProfile(this, profile);
            },
            registerSubAction(action, subId, config) {
                return YAW_SUB_ACTIONS.register(this, action, subId, config, { owner: 'legacy-runtime', trustedLegacy: true });
            },
            _emitSubAction(action, subId, actor, target, result) {
                if (!this.combatState?.active && typeof YAW_ACTION_OUTCOMES !== 'undefined') {
                    YAW_ACTION_OUTCOMES.publish(this, {
                        action: String(action || 'unknown').includes(':') ? String(action) : `core:${String(action || 'unknown')}`,
                        variant: String(subId || ''),
                        mode: 'adventure',
                        result: 'committed',
                        actors: [actor].filter(Boolean),
                        targets: [target].filter(Boolean),
                        summary: typeof result === 'string' ? result : (result?.summary || ''),
                        detail: { compatibilitySource: 'legacy-sub-action-emitter' }
                    }).catch(() => {});
                }
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
                    MODULE_SYSTEM.executeHook('onSubActionExecute', { action, subId, actor, target, result, app: this }).catch(() => {});
                }
            },

            _resolveSyncAction(sync) {
                return YAW_COMBAT_SYNC.resolveAction(this, sync);
            },

            // ===== ALLY TURN AI =====
            _getPartyAIOrder(unit) {
                return YAW_PARTY_MANAGEMENT.getAIOrder(this, unit);
            },
            _getPartyRole(unit) {
                return YAW_PARTY_MANAGEMENT.getRole(this, unit);
            },
            _getCompanionBehavior(unit) {
                return YAW_COMPANION_BEHAVIOR.get(this, unit);
            },
            _getCompanionDuty(unit) {
                return YAW_PARTY_MANAGEMENT.getDuty(this, unit);
            },
            _getCompanionStance(unit) {
                return YAW_PARTY_MANAGEMENT.getStance(this, unit);
            },
            _getCompanionControl(unit) {
                return YAW_PARTY_MANAGEMENT.getControl(this, unit);
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
            _companionDutyLabel(duty) {
                return YAW_PARTY_MANAGEMENT.dutyLabel(this, duty);
            },
            _companionDutyDescription(duty) {
                return YAW_PARTY_MANAGEMENT.dutyDescription(this, duty);
            },
            _companionDutyTradeoff(duty) {
                return YAW_PARTY_MANAGEMENT.dutyTradeoff(this, duty);
            },
            _companionStanceLabel(stance) {
                return YAW_PARTY_MANAGEMENT.stanceLabel(this, stance);
            },
            _companionStanceDescription(stance) {
                return YAW_PARTY_MANAGEMENT.stanceDescription(this, stance);
            },
            _companionControlLabel(control) {
                return YAW_PARTY_MANAGEMENT.controlLabel(this, control);
            },
            _companionControlDescription(control) {
                return YAW_PARTY_MANAGEMENT.controlDescription(this, control);
            },
            _companionPreferredRowLabel(preferredRow) {
                return YAW_PARTY_MANAGEMENT.preferredRowLabel(this, preferredRow);
            },
            _companionPreferredRowDescription(preferredRow) {
                return YAW_PARTY_MANAGEMENT.preferredRowDescription(this, preferredRow);
            },
            setPartyAIOrder(index, order) {
                return YAW_PARTY_MANAGEMENT.setAIOrder(this, index, order);
            },
            setPartyRole(index, role) {
                return YAW_PARTY_MANAGEMENT.setRole(this, index, role);
            },
            setCompanionDuty(index, duty) {
                return YAW_PARTY_MANAGEMENT.setDuty(this, index, duty);
            },
            setCompanionStance(index, stance) {
                return YAW_PARTY_MANAGEMENT.setStance(this, index, stance);
            },
            setCompanionControl(index, control) {
                return YAW_PARTY_MANAGEMENT.setControl(this, index, control);
            },
            setCompanionPreferredRow(index, preferredRow) {
                return YAW_PARTY_MANAGEMENT.setPreferredRow(this, index, preferredRow);
            },
            showCompanionBehavior(index) {
                return YAW_PARTY_MANAGEMENT.showBehavior(this, index);
            },
            _allyHealWounded(ally) {
                return YAW_COMBAT_ALLIES.healWounded(this, ally);
            },
            _selectAllyAttackTarget(ally, enemies) {
                return YAW_COMBAT_ALLIES.selectAttackTarget(this, ally, enemies);
            },
            _runPostCombatScavengers() {
                return YAW_COMBAT_ALLIES.runPostCombatScavengers(this);
            },
            _combatScavengeRemains(actor, source = 'combat') {
                if (!actor || !this._isLivingCreature(actor)) return false;
                const corpse = (this.creatures || []).find(c => this._canScavengeCorpse(c) && this._canFitPrey(actor, c, 'stomach'));
                if (!corpse) return false;
                const consumed = this._consumeCorpsePortions(corpse, [actor]);
                if (consumed.length === 0) return false;
                const portions = consumed[0].consumed;
                const text = this._label('combat.scavengeRemains', '{actor} uses {count} portion(s) from {target}.', {
                    actor: actor.name || this._label('ui.creatures', 'Creature'),
                    target: corpse.corpseName || corpse.name,
                    count: portions
                });
                this.log.push({ text, type: source === 'postCombat' ? 'discovery' : 'combat' });
                this._emitCombatAction('scavenge', actor, corpse, text);
                this._syncCurrentTileCreatures();
                this.renderLog();
                this.renderCreatures();
                this.renderParty();
                return true;
            },
            allyTurn(ally) {
                return YAW_COMBAT_ALLIES.takeTurn(this, ally);
            },

            // ===== ENEMY TURN AI =====
            _enemyShouldFlee(enemy, targets) {
                return YAW_COMBAT_ENEMIES.shouldFlee(this, enemy, targets);
            },
            _combatStateRoll(namespace, unit = null, purpose = 'roll') {
                return YAW_COMBAT_STATE_ROLL.roll(this, namespace, unit, purpose);
            },
            _enemyCallReinforcement(enemy) {
                return YAW_COMBAT_ENEMIES.callReinforcement(this, enemy);
            },
            _selectEnemyTarget(enemy, targets) {
                return YAW_COMBAT_ENEMIES.selectTarget(this, enemy, targets);
            },
            enemyTurn(enemy) {
                return YAW_COMBAT_ENEMIES.takeTurn(this, enemy);
            },

            nextTurn() {
                if (this.combatState.presentationAutomatic && typeof YAW_COMBAT_PACING !== 'undefined') {
                    this.combatState.presentationAutomatic = false;
                    return YAW_COMBAT_PACING.advance(this, () => YAW_COMBAT_LIFECYCLE.nextTurn(this));
                }
                return YAW_COMBAT_LIFECYCLE.nextTurn(this);
            },


            endCombat(result) {
                return YAW_COMBAT_LIFECYCLE.endCombat(this, result);
            },

            _confirmDefeatReturnToMenu() {
                return YAW_COMBAT_LIFECYCLE.confirmDefeatReturnToMenu(this);
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
                    this.explorationActorSelectionExplicit = false;
                }
                return partyPlayer;
            },
            _getExplorationActors(actorId = null) {
                return YAW_EXPLORATION_SELECTION.getActors(this, actorId);
            },
            _getExplorationActor(actorId = null) {
                return YAW_EXPLORATION_SELECTION.getActor(this, actorId);
            },
            _isExplicitExplorationActor(unit) {
                return YAW_EXPLORATION_SELECTION.isExplicitActorSelected(this, unit);
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

            dropOffPartyMember(index) {
                return YAW_PARTY_MANAGEMENT.dropOff(this, index);
            },

            _dropOffPartyMemberConfirmed(index) {
                return YAW_PARTY_MANAGEMENT.confirmDropOff(this, index);
            },

            showPartyMemberStats(index) {
                const unit = this.party?.[index];
                if (!unit) return false;
                return YAW_HOLDINGS.show(this, unit, { tab: 'stats' });
            },

            selectExplorationActor(index) {
                return YAW_EXPLORATION_SELECTION.selectActor(this, index);
            },

            _explorationTargetKey(type, id) {
                return YAW_EXPLORATION_SELECTION.targetKey(type, id);
            },

            _explorationTargetUnitId(type, unit) {
                return YAW_EXPLORATION_SELECTION.targetIdForUnit(this, type, unit);
            },

            _isExplorationTarget(type, id) {
                return YAW_EXPLORATION_SELECTION.isTarget(this, type, id);
            },

            _isExplorationTargetUnit(type, unit) {
                return YAW_EXPLORATION_SELECTION.isTargetUnit(this, type, unit);
            },

            _resolveCreatureRef(ref) {
                return YAW_EXPLORATION_SELECTION.resolveCreatureRef(this, ref);
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

            clearExplorationActors() {
                return YAW_EXPLORATION_SELECTION.clearActors(this);
            },

            clearFocusedStageObject() {
                return YAW_CENTER_CONTEXT.clearFocusedStageObject(this);
            },

            _reportInvalidExplorationActorSelection(action) {
                return YAW_EXPLORATION_SELECTION.reportInvalidActor(this, action);
            },

            _renderExplorationTargetActions(source = 'sheet') {
                return YAW_MARKED_TARGET_ACTIONS.render(this, source);
            },

            _renderExplorationSelfActions(source = 'actor-belt') {
                return YAW_CENTER_CONTEXT.renderSelfActions(this, source);
            },

            openExplorationTargetSubActionSheet(action, source = 'target-bar', presentation = '') {
                return YAW_MARKED_TARGET_ACTIONS.openSubActionSheet(this, action, source, presentation);
            },

            openExplorationSubActionSheet(action, source = 'target-bar', presentation = '') {
                return YAW_MARKED_TARGET_ACTIONS.openSubActionSheet(this, action, source, presentation);
            },

            resolveExplorationTargetAction(action, subAction = null, source = 'target-bar') {
                return YAW_EXPLORATION_SELECTION.resolveTargetAction(this, action, subAction, source);
            },

            resolveExplorationSelfSubAction(action, subAction, source = 'actor-belt') {
                return YAW_EXPLORATION_SELECTION.resolveSelfSubAction(this, action, subAction, source);
            },

            _getRecruitScore(actor, target) {
                return YAW_RECRUITMENT_FLOW.score(this, actor, target);
            },

            _canRecruit(actor, target) {
                return YAW_RECRUITMENT_FLOW.canRecruit(this, actor, target);
            },

            showInteractMenu() {
                return YAW_PANEL_COMMANDS.showInteractMenu(this);
            },

            showCreatureInteract(type, index) {
                return YAW_PANEL_COMMANDS.showCreatureInteract(this, type, index);
            },

            outsideAction(action, type, index) {
                return YAW_PANEL_COMMANDS.outsideAction(this, action, type, index);
            },

            outsideActionForParty(action, targetIndex, actorId = null, options = {}) {
                return YAW_PANEL_COMMANDS.outsideActionForParty(this, action, targetIndex, actorId, options);
            },

            outsideActionForCreature(action, targetId, options = {}) {
                return YAW_PANEL_COMMANDS.outsideActionForCreature(this, action, targetId, options);
            },

            outsideActionForCreatureAs(actorId, action, targetId, options = {}) {
                return YAW_PANEL_COMMANDS.outsideActionForCreatureAs(this, actorId, action, targetId, options);
            },

            _removeContainedPartyMember(unit) {
                if (!unit || unit === this.player || unit.mc) return;
                this.party = this.party.filter(p => p !== unit);
                this._normalizeExplorationSelections();
            },

            _feedPartyMemberToConsumer(prey, consumer) {
                if (!prey || !consumer || prey === consumer) return this._label('group.feed.selfBlocked', '{name} cannot feed into themself yet.', { name: prey?.name || 'Someone' });
                if (prey === this.player || prey.mc) return this._label('group.feed.playerBlocked', '{name} cannot be handed off as prey right now.', { name: prey.name });
                if (!prey.livestock && !prey.willingPrey) return this._label('feed.offerWholeUnwilling', '{name} is not willing to offer themself whole.', { name: prey.name });
                if (!this._canFitPrey(consumer, prey, 'stomach')) return this._capacityFailureMessage(consumer, prey, 'stomach');
                this._containTargetIn(consumer, prey, 'stomach', { willingSacrifice: true });
                return this._label('group.feed.partyToConsumer', '{prey} is fed to {consumer} and settles in their belly.', { prey: prey.name, consumer: consumer.name });
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
                        this._makeCorpse(target, 'fight', { actor: actors[0], source: 'party-play-fight' });
                        return this._label('group.fight.roughCollapse', '{name} collapses from the rough play.', { name: target.name });
                    }
                    target.CPun = 1;
                    return this._label('group.fight.pinned', 'They are pinned but not seriously hurt.');
                }
                return '';
            },

            _groupChewFeast(actors, target, options = {}) {
                const participants = actors.filter(actor => actor && actor !== target);
                if (participants.length === 0) return this._label('group.feast.noHelpers', '{target} cannot be reduced without helpers.', { target: target.name });
                const outcome = this._resolveChewAttack(participants[0], target, {
                    ...options,
                    actors: participants
                });
                return this._label(outcome.depleted ? 'group.feast.chewDepleted' : 'group.feast.split', outcome.depleted
                    ? '{actors} chew into {target} for {amount} vitality and punishment damage. {target} is depleted and leaves recoverable remains.'
                    : '{actors} chew into {target} for {amount} vitality and punishment damage.', {
                    actors: participants.map(actor => actor.name).join(', '),
                    target: target.name,
                    amount: outcome.damage
                });
            },
            _selectGroupFeastPrimary(actors, target) {
                const candidates = (actors || []).filter(actor => actor && actor !== target);
                // A group can help a swallow succeed, but it cannot quietly change
                // who is doing the swallowing. Selection order is the player-facing
                // contract: the first selected actor is the sole container owner.
                const selectedPrimary = candidates[0] || null;
                const helpers = candidates.slice(1);
                const helperBonus = helpers.reduce((sum, helper) => sum + Math.floor((helper.Feas || 10) * 0.5), 0);
                const assessment = selectedPrimary
                    ? this._assessFeastAttempt(selectedPrimary, target, { helperBonus })
                    : null;
                const primary = assessment?.canAttempt && assessment?.canFit ? selectedPrimary : null;
                return {
                    primary,
                    canOverpower: Boolean(primary && assessment?.succeeds),
                    assessment,
                    capacityActor: selectedPrimary
                };
            },

            _shouldSkipFullFeedTarget(options = {}) {
                return !options.subAction || ['tend', 'heal', 'breastfeed'].includes(options.subAction);
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
                // Fight techniques are owned by YAW_COMBAT_TECHNIQUES rather
                // than the legacy sub-action table.  Keep the selected
                // approach intact so exploration and combat resolve the same
                // named technique.
                const selectedSubAction = options.subAction && (action === 'fight'
                    ? typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                    : this.SUB_ACTIONS[action]?.[options.subAction]) ? options.subAction : null;
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
                    if (selectedSubAction && !['tend', 'heal'].includes(selectedSubAction)) {
                        const def = this.SUB_ACTIONS.feed?.[selectedSubAction];
                        const eligible = livingActors.filter(actor => actor !== target && this._isSubActionAvailable(def, actor, target, livingActors.filter(helper => helper !== actor && helper !== target)));
                        primaryActor = eligible[0] || this._selectGroupFeedSubActionActor(selectedSubAction, target, livingActors) || primaryActor;
                        helpers = livingActors.filter(actor => actor && actor !== primaryActor && !eligible.includes(actor));
                        recipient = target;
                        if (selectedSubAction === 'offerWhole') {
                            consumer = target;
                            prey = eligible;
                        }
                    } else if (this.party.includes(target)) {
                        recipient = target;
                        helpers = livingActors.filter(actor => actor !== target);
                        primaryActor = livingActors[0] || target;
                    } else {
                        recipient = target;
                    }
                } else {
                    recipient = target || null;
                }
                const names = units => (units || []).filter(Boolean).map(unit => unit.name || this._label('ui.unknown', 'Unknown'));
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
                if (summary.primaryActor) parts.push(`${this._label('target.primaryActor', 'Primary')}: ${summary.primaryActor.name || this._label('ui.unknown', 'Unknown')}`);
                if (summary.consumer) parts.push(`${this._label('target.consumer', 'Consumer')}: ${summary.consumer.name || this._label('ui.unknown', 'Unknown')}`);
                if (summary.recipient && summary.recipient !== summary.consumer) parts.push(`${this._label('target.recipient', 'Recipient')}: ${summary.recipient.name || this._label('ui.unknown', 'Unknown')}`);
                if (summary.preyNames?.length) parts.push(`${this._label('target.prey', 'Prey')}: ${summary.preyNames.join(', ')}`);
                if (summary.helperNames?.length) parts.push(`${this._label('target.helpers', 'Helpers')}: ${summary.helperNames.join(', ')}`);
                return parts.join(' | ');
            },

            outsideActionOnTargets(action, targets, actor = this._getExplorationActor(), options = {}) {
                const targetList = (targets || []).filter(target => target && this._isLivingCreature(target));
                if (targetList.length === 0) return false;
                actor = actor || this.player;
                const skipped = [];
                const skippedSet = new Set();
                const usesChewSpread = action === 'feast' && options.subAction === 'chew';
                const spreadAction = action === 'fight' ? 'fight' : (usesChewSpread ? 'chew' : null);
                const multiEffect = spreadAction
                    ? this._multiInteractionEffect(actor, spreadAction, targetList.length)
                    : null;
                const spreadText = spreadAction
                    ? this._multiInteractionOutcomeText(spreadAction, [actor], targetList)
                    : '';
                const combatTargets = new Set();
                for (const target of targetList) {
                    if (action === 'feed' && this._shouldSkipFullFeedTarget(options) && this.party.includes(target) && target.CPun >= target.MPun) {
                        skipped.push(target.name);
                        skippedSet.add(target);
                        continue;
                    }
                    const resolved = this.outsideActionOnTarget(action, target, actor, {
                        ...options,
                        allowPartySacrifice: false,
                        suppressStory: true,
                        applyCost: false,
                        deferCombat: true,
                        multiEffect
                    });
                    for (const combatTarget of this.lastActionResolution?.combatTargets || []) combatTargets.add(combatTarget);
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
                if (spreadText && affected.length > 0) summary += ` ${spreadText}`;
                this.log.push({ text: summary, type: 'discovery' });
                if (affected.length > 0) {
                    this._applyActionCost?.(action, actor, targetList[0], { affected: true }, {
                        mode: 'adventure',
                        source: 'exploration-multi-target-resolution',
                        emitScene: true
                    });
                }
                if (spreadAction) {
                    this._awardMultiInteractionPractice([actor], spreadAction, targetList, { success: affected.length > 0 });
                }
                this.emitStoryResult({ mode: 'adventure', actors: [actor], targets: targetList, action, shape: 'one-to-many' }, summary);
                this._normalizeExplorationSelections();
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                if (combatTargets.size > 0) this.startCombat([...combatTargets]);
                else this.renderExplorationActions();
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
                const selectedSubAction = options.subAction && (action === 'fight'
                    ? typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                    : this.SUB_ACTIONS[action]?.[options.subAction]) ? options.subAction : null;
                const names = living.map(unit => unit.name).join(', ');
                if (action === 'feed' && selectedSubAction && !['tend', 'heal'].includes(selectedSubAction)) {
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
                            this._resolveTendEffect(null, unit, { condition: healAmount, awardXP: false });
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
                        result = this._label('group.mutual.social', '{actors} share {action} as a mutual group. Spirit rises for everyone involved.', {
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
                if (action !== 'feast' && options.applyCost !== false) {
                    living.forEach(actor => {
                        this._applyActionCost?.(action, actor, actor, { affected: true }, {
                            mode: 'adventure',
                            source: 'exploration-mutual-resolution',
                            emitScene: true
                        });
                    });
                }
                this.log.push({ text: result, type: 'discovery' });
                this.emitStoryResult({ mode: 'adventure', actors: living, targets: living, action, shape: 'mutual' }, result);
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
                    const resolved = this.outsideActionOnTarget(action, target, actor, { ...options, allowPartySacrifice: false, suppressStory: true });
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
                this.emitStoryResult({ mode: 'adventure', actors: livingActors, targets: targetList, action, shape: 'paired' }, summary + skippedText);
                this._normalizeExplorationSelections();
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
                return true;
            },

            outsideManyToManyActionOnTargets(action, actors, targets, options = {}) {
                const livingActors = [...new Set((actors || []).filter(actor => actor && this._isLivingCreature(actor)))];
                const targetList = [...new Set((targets || []).filter(target => target && this._isLivingCreature(target)))];
                if (livingActors.length < 2 || targetList.length < 2) return false;
                const resolutions = [];
                const combatTargets = new Set();
                const spreadAction = action === 'fight'
                    ? 'fight'
                    : (action === 'feast' && options.subAction === 'chew' ? 'chew' : null);
                const spreadText = spreadAction
                    ? this._multiInteractionOutcomeText(spreadAction, livingActors, targetList)
                    : '';
                for (const target of targetList) {
                    const resolved = this.outsideGroupActionOnTarget(action, target, livingActors, {
                        ...options,
                        applyCost: false,
                        suppressLog: true,
                        suppressStory: true,
                        suppressRender: true,
                        deferCombat: true,
                        multiTargetCount: targetList.length
                    });
                    const outcome = this.lastActionResolution;
                    if (resolved === false || !outcome?.message) continue;
                    resolutions.push(outcome.message);
                    for (const combatTarget of outcome.combatTargets || []) combatTargets.add(combatTarget);
                }
                if (resolutions.length === 0) return false;
                const actorNames = livingActors.map(actor => actor.name).join(', ');
                const targetNames = targetList.map(target => target.name).join(', ');
                const summary = this._label('target.manyToManyActionDone', '{actors} act together with {targets}: {results}', {
                    actors: actorNames,
                    targets: targetNames,
                    results: `${resolutions.join(' ')}${spreadText ? ` ${spreadText}` : ''}`
                });
                livingActors.forEach(actor => {
                    this._applyActionCost?.(action, actor, targetList[0], { affected: true }, {
                        mode: 'adventure',
                        source: 'exploration-many-to-many-resolution',
                        emitScene: true
                    });
                });
                if (spreadAction) {
                    this._awardMultiInteractionPractice(livingActors, spreadAction, targetList, { success: resolutions.length > 0 });
                }
                this.log.push({ text: summary, type: 'discovery' });
                this.emitStoryResult({
                    mode: 'adventure',
                    actors: livingActors,
                    targets: targetList,
                    action,
                    shape: 'many-to-many',
                    distribution: 'all'
                }, summary);
                this.lastActionResolution = {
                    action,
                    actors: livingActors,
                    targets: targetList,
                    ok: true,
                    affected: true,
                    message: summary,
                    combatTargets: [...combatTargets]
                };
                this._normalizeExplorationSelections();
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                if (combatTargets.size > 0) this.startCombat([...combatTargets]);
                else if (!this.combatState.active) this.renderExplorationActions();
                return true;
            },

            outsideActionForPartyTargets(action, targetIndexes, actorId = null, options = {}) {
                return YAW_PANEL_COMMANDS.outsideActionForPartyTargets(this, action, targetIndexes, actorId, options);
            },

            outsideActionForCreatureTargets(action, targetIds, actorId = null, options = {}) {
                return YAW_PANEL_COMMANDS.outsideActionForCreatureTargets(this, action, targetIds, actorId, options);
            },

            outsideGroupActionOnTarget(action, target, actors = this._getExplorationActors(), options = {}) {
                const livingActors = (actors || []).filter(actor => actor && this._isLivingCreature(actor));
                if (livingActors.length <= 1) {
                    const resolved = this.outsideActionOnTarget(action, target, livingActors[0] || this.player, options);
                    return resolved !== false;
                }
                // Fight approaches are owned by Combat Technique V1 rather
                // than the legacy SUB_ACTIONS table. Preserve authored
                // namespaced techniques, while accepting `attack` as the
                // compatibility alias for the canonical Basic approach.
                const selectedSubAction = action === 'fight'
                    ? (options.subAction === 'attack' ? 'basic' : (options.subAction || null))
                    : (options.subAction && this.SUB_ACTIONS[action]?.[options.subAction] ? options.subAction : null);
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
                        const targetCount = Math.max(1, Number(options.multiTargetCount) || 1);
                        const technique = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                            ? YAW_COMBAT_TECHNIQUES.selected(this, livingActors, selectedSubAction || 'basic', targetCount)
                            : null;
                        if (technique === false) {
                            result = this._label('combat.technique.groupUnavailable', 'The group can no longer perform the prepared combat technique.');
                            break;
                        }
                        const totalFigh = livingActors.reduce((sum, actor) => {
                            const rawContribution = actor.Figh || 10;
                            const contribution = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                                ? YAW_COMBAT_TECHNIQUES.damageValue(rawContribution, technique)
                                : rawContribution;
                            const effect = targetCount > 1 ? this._multiInteractionEffect(actor, 'fight', targetCount) : null;
                            return sum + contribution * (effect?.scale ?? 1);
                        }, 0);
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
                        const techniqueStatus = !this.party.includes(target) && technique
                            ? this._applyTechniqueStatus?.(livingActors[0], target, technique, dmg)
                            : false;
                        result = technique
                            ? this._label('combat.sync.techniqueHit', '{participants} combine {technique} against {target}, dealing {amount} punishment!', {
                                participants: names,
                                technique: YAW_COMBAT_TECHNIQUES.label(this, technique),
                                target: target.name,
                                amount: dmg
                            })
                            : this._label('group.fight.playFight', '{actors} play-fight {target} for {amount} punishment.', {
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
                        if (techniqueStatus) {
                            result += ` ${this._label('combat.action.techniqueStatus', '{target} is affected by {status}.', {
                                target: target.name,
                                status: YAW_COMBAT_TECHNIQUES.statusLabel(this, technique.status.effect)
                            })}`;
                        }
                        if (!this.party.includes(target) && target.CPun <= 0) {
                            this._makeCorpse(target, 'fight', { actor: livingActors[0], source: 'group-fight' });
                            result += ` ${this._label('group.fight.collapses', '{target} collapses.', { target: target.name })}`;
                        }
                        break;
                    }
                    case 'feed': {
                        if (selectedSubAction && !['tend', 'heal'].includes(selectedSubAction)) {
                            const def = this.SUB_ACTIONS.feed?.[selectedSubAction];
                            const eligible = livingActors.filter(actor => actor !== target && this._isSubActionAvailable(
                                def,
                                actor,
                                target,
                                livingActors.filter(helper => helper !== actor && helper !== target)
                            ));
                            if (eligible.length === 0) {
                                result = this._label('feed.noValidTarget', 'No valid target for this feed action.');
                                break;
                            }
                            const targetConsumingAliases = new Set(['sacrifice', 'forceFeed', 'slurp', 'fragment']);
                            const participants = targetConsumingAliases.has(selectedSubAction) ? [eligible[0]] : eligible;
                            result = participants.map(primary => {
                                const { actorName: primaryName, actorVerb: primaryVerb } = this._actorNameAndVerb(primary);
                                const text = this._doSubAction('feed', selectedSubAction, primary, target, primaryName, primaryVerb);
                                this._cleanupOutsideSubActionTarget('feed', selectedSubAction, primary, target);
                                return text;
                            }).join(' ');
                            break;
                        }
                        const totalFeed = livingActors.reduce((sum, actor) => sum + (actor.Feed || 10), 0);
                        const healAmount = Math.floor(totalFeed * 2);
                        const tend = this._resolveTendEffect(null, target, { condition: healAmount, awardXP: false });
                        result = this.party.includes(target) && livingActors.includes(target)
                            ? this._label('group.feed.tendTogether', '{actors} tend {target} together, restoring {amount} punishment.', { actors: names, target: target.name, amount: tend.restoredCondition })
                            : this._label(this.party.includes(target) ? 'group.feed.tend' : 'group.feed.creature', '{actors} tend {target}, restoring {amount} punishment.', {
                                actors: names,
                                target: target.name,
                                amount: tend.restoredCondition
                            });
                        break;
                    }
                    case 'feast': {
                        if (this.party.includes(target) && livingActors.includes(target)) {
                            result = this._label('group.feast.selfBlocked', '{target} cannot eat themself. Select other party members as actors for this target, or select {target} alone to eat another target.', { target: target.name });
                            break;
                        }
                        const shouldChew = selectedSubAction === 'chew' || (!selectedSubAction && this.settings.chewing);
                        if (shouldChew && livingActors.length > 1) {
                            const targetCount = Math.max(1, Number(options.multiTargetCount) || 1);
                            const multiEffect = targetCount > 1
                                ? this._multiInteractionEffect(livingActors[0], 'chew', targetCount)
                                : null;
                            result = this._groupChewFeast(livingActors, target, {
                                mode: 'adventure',
                                multiEffect
                            });
                            if (this._isLivingCreature(target) && !this.party.includes(target)) {
                                const reaction = this._resolveChewSurvivorReaction(target, livingActors[0]);
                                if (reaction.text) result += ` ${reaction.text}`;
                                combatTargets = [...new Set(reaction.hostiles || [])];
                                startCombatAfter = combatTargets.length > 0;
                            }
                            break;
                        }
                        const selection = this._selectGroupFeastPrimary(livingActors, target);
                        const primary = selection.primary;
                        const capacityActor = selection.capacityActor || livingActors[0];
                        if (!primary) {
                            result = this._capacityFailureMessage(capacityActor, target, 'stomach');
                            break;
                        }
                        if (!selection.canOverpower) {
                            result = this._label('group.feast.resisted', '{actors} try to eat {target}, but {target} resists the group.', { target: target.name, actors: names });
                            break;
                        }
                        const helpers = livingActors.filter(actor => actor !== primary);
                        this._containTargetIn(primary, target, 'stomach');
                        this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                        result = this._label('group.feast.swallow', '{helpers} help {primary} eat {target}.', {
                            helpers: helpers.map(actor => actor.name).join(', ') || primary.name,
                            primary: primary.name,
                            target: target.name
                        });
                        break;
                    }
                    case 'flirt':
                    case 'fuck': {
                        const selfIncludedPartyTarget = this.party.includes(target) && livingActors.includes(target);
                        const isSeduce = action === 'flirt' && selectedSubAction === 'seduce';
                        const isDance = action === 'flirt' && selectedSubAction === 'dance';
                        const totalCharm = livingActors.reduce((sum, actor) => sum
                            + (actor[action === 'fuck' ? 'Fuck' : 'Flir'] || 10)
                            + (actor.cha || 10) * 0.5
                            + (isSeduce ? (actor.Fuck || 0) : 0), 0);
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        if (totalCharm > resist) {
                            const gain = Math.floor(totalCharm * (action === 'fuck' ? 0.45 : 0.3));
                            target.CPle = Math.min(target.MPle, target.CPle + gain);
                            if (selfIncludedPartyTarget) {
                                const sharedGain = Math.max(1, Math.floor(gain * 0.5));
                                livingActors.filter(actor => actor !== target).forEach(actor => {
                                    actor.CPle = Math.min(actor.MPle, (actor.CPle || 0) + sharedGain);
                                });
                                result = this._label('group.social.share', '{actors} share {action} with {target}. Spirit spreads through the group; {target} rises to {current}/{max}.', {
                                    actors: names,
                                    action: this._uiLabel(action).toLowerCase(),
                                    target: target.name,
                                    current: target.CPle,
                                    max: target.MPle
                                });
                            } else {
                                result = this._label(isSeduce ? 'combat.sync.seduceSoftened' : (isDance ? 'combat.sync.danceSoftened' : 'group.social.focus'), isSeduce
                                    ? '{actors} draw {target} closer, softening their guard. Spirit rises to {current}/{max}.'
                                    : (isDance ? '{actors} dance with {target}, softening their guard. Spirit rises to {current}/{max}.' : '{actors} focus on {target}. Spirit rises to {current}/{max}.'), {
                                    actors: names,
                                    participants: names,
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
                            const breakthrough = this._resolveSpiritThreshold?.(livingActors[0], target, action, { emitScene: false });
                            if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                        } else {
                            result = this._label(isSeduce ? 'combat.sync.seduceResisted' : (isDance ? 'combat.sync.danceResisted' : 'group.social.resists'), isSeduce
                                ? '{target} pulls away from the group’s overture.'
                                : (isDance ? '{target} declines the group’s invitation to dance.' : "{target} resists the group's attention."), { target: target.name });
                        }
                        break;
                    }
                    default:
                        this.outsideActionOnTarget(action, target, livingActors[0] || this.player);
                        return true;
                }
                this.lastActionResolution = {
                    action,
                    actors: livingActors,
                    target,
                    ok: true,
                    affected: true,
                    message: result,
                    combatTargets
                };
                if (!options.suppressLog) this.log.push({ text: result, type: 'discovery' });
                if (options.applyCost !== false) {
                    livingActors.forEach(actor => {
                        this._applyActionCost?.(action, actor, target, { affected: true }, {
                            mode: 'adventure',
                            source: 'exploration-group-resolution',
                            emitScene: true
                        });
                    });
                }
                if (!options.suppressStory) {
                    this.emitStoryResult({ mode: 'adventure', actors: livingActors, targets: [target], action, shape: 'many-to-one' }, result);
                }
                if (!options.suppressRender) {
                    this.renderLog();
                    this.renderParty();
                    this.renderCreatures();
                }
                if (startCombatAfter && !options.deferCombat) {
                    this.startCombat(combatTargets);
                    return true;
                }
                if (!options.suppressRender && !this.combatState.active) this.renderExplorationActions();
                return true;
            },

            outsideActionOnTarget(action, target, actor = this.player, options = {}) {
                actor = actor || this.player;
                const { actorName } = this._actorNameAndVerb(actor);
                // Fight approaches are owned by Combat Technique V1 rather
                // than the legacy SUB_ACTIONS table. Preserve authored
                // namespaced techniques, while accepting `attack` as the
                // compatibility alias for the canonical Basic approach.
                const selectedSubAction = action === 'fight'
                    ? (options.subAction === 'attack' ? 'basic' : (options.subAction || null))
                    : (options.subAction && this.SUB_ACTIONS[action]?.[options.subAction] ? options.subAction : null);
                let result = '';
                let affected = true;
                let startCombatAfter = false;
                let combatTargets = [];
                const pressure = this._canAffordActionPressure?.(action, actor, { mode: 'adventure' }) || { ok: true };
                if (!pressure.ok) {
                    const text = pressure.text || this._label('cost.block.tooHungryPlay', '{actor} is too hungry for that kind of effort.', { actor: actorName });
                    this.log.push({ text, type: 'discovery' });
                    this.emitStoryResult?.({
                        mode: 'adventure',
                        actors: [actor],
                        targets: [target].filter(Boolean),
                        action,
                        tags: ['hunger', 'blocked'],
                        source: 'balance-system'
                    }, text, {
                        resultKind: 'failure',
                        importance: 'hint',
                        tags: ['hunger', 'blocked'],
                        source: 'balance-system'
                    });
                    this.lastActionResolution = { action, actor, target, ok: false, affected: false, message: text };
                    this.renderLog();
                    this.renderParty();
                    this.renderCreatures();
                    if (!this.combatState.active) this.renderExplorationActions();
                    return false;
                }
                switch (action) {
                    case 'fight': {
                        if (target.disposition !== this.DISPOSITION.ENEMY && !this.party.includes(target)) {
                            const reaction = this._reactToNonHostileAttack(target, actor);
                            result = reaction.text;
                            combatTargets = reaction.hostiles;
                            startCombatAfter = combatTargets.length > 0;
                            break;
                        }
                        const technique = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                            ? YAW_COMBAT_TECHNIQUES.selected(this, [actor], selectedSubAction || 'basic', 1)
                            : null;
                        if (technique === false) {
                            result = this._label('combat.technique.unavailableAtResolution', '{actor} can no longer use that combat technique.', { actor: actorName });
                            affected = false;
                            break;
                        }
                        const ar = this._explorationActionRating(actor.Figh, actor, target, 'single-fight');
                        const def = target.con || 10;
                        const unscaledDmg = Math.max(1, Math.floor(ar - def * 0.3 + this._explorationDamageVariance(actor, target, 'single-fight')));
                        const techniqueDamage = typeof YAW_COMBAT_TECHNIQUES !== 'undefined'
                            ? YAW_COMBAT_TECHNIQUES.damageValue(unscaledDmg, technique)
                            : unscaledDmg;
                        const dmg = options.multiEffect
                            ? this._multiInteractionScaleValue(techniqueDamage, options.multiEffect)
                            : techniqueDamage;
                        target.CPun -= dmg;
                        const techniqueStatus = technique ? this._applyTechniqueStatus?.(actor, target, technique, dmg) : false;
                        result = technique
                            ? this._label('combat.action.techniqueHit', '{actor} uses {technique} on {target} for {amount} punishment!', {
                                actor: actorName,
                                technique: YAW_COMBAT_TECHNIQUES.label(this, technique),
                                target: target.name,
                                amount: dmg
                            })
                            : this._label('explore.fight.hit', '{actor} hits {target} for {amount} punishment.', { actor: actorName, target: target.name, amount: dmg });
                        if (techniqueStatus) {
                            result += ` ${this._label('combat.action.techniqueStatus', '{target} is affected by {status}.', {
                                target: target.name,
                                status: YAW_COMBAT_TECHNIQUES.statusLabel(this, technique.status.effect)
                            })}`;
                        }
                        if (target.CPun <= 0) {
                            target.CPun = 1;
                            result += ` ${this._label('explore.fight.subdued', '{target} is subdued.', { target: target.name })}`;
                        }
                        break;
                    }
                    case 'fuck': {
                        let charm = this._explorationActionRating(actor.Fuck + actor.Flir, actor, target, 'single-seduce');
                        if (this.settings.sameSpeciesBonus && target.species === actor.species) {
                            charm += 5;
                        }
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        const oldPle = target.CPle;
                        if (charm > resist) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                            const playerActor = actor === this.player || actor.name === this.player?.name;
                            result = this._mlabel(playerActor ? 'explore.fuck.successPlayer' : 'explore.fuck.success', playerActor
                                ? '{actor} play with {target}. Spirit rises to {current}/{max}.'
                                : '{actor} plays with {target}. Spirit rises to {current}/{max}.', {
                                actor: actorName,
                                target: target.name,
                                current: target.CPle,
                                max: target.MPle
                            });
                            if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                                target.willing = true;
                                target.orgasmed = true;
                                target.disposition = this.DISPOSITION.FRIENDLY;
                                result += ` ${this._mlabel('explore.fuck.devoted', '{target} relaxes and becomes completely friendly.', { target: target.name })}`;
                                this._updateQuestProgress('seduce', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                                if (this.settings.refractoryPeriod) {
                                    target.refractory = true;
                                    result += ` ${this._label('explore.fuck.recover', '{target} needs a moment to catch their breath...', { target: target.name })}`;
                                }
                            }
                            const breakthrough = this._resolveSpiritThreshold?.(actor, target, action, { emitScene: false });
                            if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                            if (!this.party.includes(target) && this._canRecruit(actor, target)) {
                                result += ` ${this._label('explore.recruit.possible', '{target} may be willing to join the party.', { target: target.name })}`;
                            }
                        } else {
                            result = this._mlabel('explore.fuck.resists', '{target} does not want to play.', { target: target.name });
                            affected = false;
                        }
                        break;
                    }
                    case 'feast': {
                        if (selectedSubAction) {
                            result = this._doSubAction('feast', selectedSubAction, actor, target, actorName, actor.name === this.player?.name ? '' : 's', {
                                mode: 'adventure',
                                multiEffect: options.multiEffect
                            });
                            this._cleanupOutsideSubActionTarget(action, selectedSubAction, actor, target);
                            if (selectedSubAction === 'chew' && this._isLivingCreature(target) && !this.party.includes(target)) {
                                const reaction = this._resolveChewSurvivorReaction(target, actor);
                                if (reaction.text) result += ` ${reaction.text}`;
                                combatTargets = [...new Set(reaction.hostiles || [])];
                                startCombatAfter = combatTargets.length > 0;
                            }
                            break;
                        }
                        if (actor === target) {
                            result = this._label('group.feast.selfBlocked', '{target} cannot eat themself. Select other party members as actors for this target, or select {target} alone to eat another target.', { target: target.name });
                            affected = false;
                            break;
                        }
                        if (!this._canFitPrey(actor, target, 'stomach')) {
                            result = this._capacityFailureMessage(actor, target, 'stomach');
                            break;
                        }
                        const attempt = this._assessFeastAttempt(actor, target);
                        if (attempt.succeeds) {
                            this._containTargetIn(actor, target, 'stomach');
                            this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                            const owner = actor === this.player || actor.name === this.player?.name ? this._label('party.you', 'You') : actor.name;
                            result = this._label('explore.feast.swallow', '{actor} eats {target}. They are held in {owner} belly.', {
                                actor: actorName,
                                target: target.name,
                                owner
                            });
                        } else {
                            result = this._label('feast.attempt.resisted', '{actor} tries to eat {target}, but {target} resists.', { actor: actorName, target: target.name });
                        }
                        break;
                    }
                    case 'flirt': {
                        const dancing = selectedSubAction === 'dance';
                        let charm = this._explorationActionRating(actor.Flir + (actor.cha || 10) * 0.5, actor, target, 'single-flirt');
                        if (this.settings.sameSpeciesBonus && target.species === actor.species) {
                            charm += 3;
                        }
                        const resist = (target.wis || 10) + (this._safeRatio(target.CPle, target.MPle) * 10);
                        if (charm > resist) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.3));
                            target.charmed = (target.charmed || 0) + 1;
                            target.Figh = Math.max(1, (target.Figh || 10) - 1);
                            const playerActor = actor === this.player || actor.name === this.player?.name;
                            result = dancing
                                ? this._label(playerActor ? 'explore.dance.successPlayer' : 'explore.dance.success', playerActor
                                    ? '{actor} dance with {target}. Their guard lowers. Spirit rises to {current}/{max}.'
                                    : '{actor} dances with {target}. Their guard lowers. Spirit rises to {current}/{max}.', {
                                    actor: actorName,
                                    target: target.name,
                                    current: target.CPle,
                                    max: target.MPle
                                })
                                : this._mlabel(playerActor ? 'explore.flirt.successPlayer' : 'explore.flirt.success', playerActor
                                    ? '{actor} talk with {target}. Their guard lowers. Spirit rises to {current}/{max}.'
                                    : '{actor} talks with {target}. Their guard lowers. Spirit rises to {current}/{max}.', {
                                actor: actorName,
                                target: target.name,
                                current: target.CPle,
                                max: target.MPle
                            });
                            if (target.charmed >= 3) {
                                result += ` ${this._mlabel('explore.flirt.charmed', '{target} is utterly charmed and becomes friendly!', { target: target.name })}`;
                                target.disposition = this.DISPOSITION.FRIENDLY;
                                target.willing = true;
                            }
                            const breakthrough = this._resolveSpiritThreshold?.(actor, target, action, { emitScene: false });
                            if (breakthrough?.summary) result += ` ${breakthrough.summary}`;
                            if (!this.party.includes(target) && this._canRecruit(actor, target)) {
                                result += ` ${this._label('explore.recruit.possible', '{target} may be willing to join the party.', { target: target.name })}`;
                            }
                        } else {
                            result = this._label(dancing ? 'explore.dance.rebuff' : 'explore.flirt.rebuff', dancing
                                ? '{target} declines to dance.'
                                : '{target} rejects the conversation!', { target: target.name });
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
                        result = this._doSubAction('feed', 'tend', actor, target, actorName, actor.name === this.player?.name ? '' : 's');
                        break;
                    }
                    case 'inspect': {
                        const legacyExplicit = this._tierValue(CONTENT?.preferences?.maxTier ?? 0) >= 2
                            && CONTENT?.preferences?.explicitDescriptions === true;
                        const safeTier = CONTENT?.isCategoryEnabled?.('explicit.sexual') !== true && !legacyExplicit;
                        const labelBodyType = (value) => (typeof YAW_STATS_PANEL !== 'undefined' && YAW_STATS_PANEL?.bodyTypeLabel) ? YAW_STATS_PANEL.bodyTypeLabel(value, this) : value;
                        result = safeTier
                            ? this._label('inspect.summary.safe', '{name} [{species}]: Punishment {punishment}, Spirit {spirit}, Size {size}, Appetite {appetite}', {
                                name: target.name,
                                species: target.species,
                                punishment: `${target.CPun}/${target.MPun}`,
                                spirit: `${target.CPle}/${target.MPle}`,
                                size: target.size,
                                appetite: target.appetite
                            })
                            : this._label('inspect.summary.adult', '{name} [{species}]: Punishment {punishment}, Spirit {spirit}, Size {size}, Appetite {appetite}, Lower Anatomy: {parts}, Chest Shape: {chest}', {
                                name: target.name,
                                species: target.species,
                                punishment: `${target.CPun}/${target.MPun}`,
                                spirit: `${target.CPle}/${target.MPle}`,
                                size: target.size,
                                appetite: target.appetite,
                                parts: labelBodyType(target.parts) || this._label('party.none', 'None'),
                                chest: labelBodyType(target.chest) || this._label('party.none', 'None')
                            });
                        break;
                    }
                }
                if (action !== 'inspect') {
                    this._applyActionCost?.(action, actor, target, { affected }, {
                        mode: 'adventure',
                        source: 'exploration-resolution',
                        emitScene: true,
                        applyCost: options.applyCost
                    });
                }
                this.log.push({ text: result, type: 'discovery' });
                if (!options.suppressStory) {
                    this.emitStoryResult({ mode: 'adventure', actors: [actor], targets: [target], action, shape: 'one-to-one', subAction: selectedSubAction }, result);
                }
                this.lastActionResolution = { action, actor, target, ok: affected, affected, message: result };
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                if (startCombatAfter && !options.deferCombat) {
                    this.startCombat(combatTargets);
                    return true;
                }
                if (!this.combatState.active) this.renderExplorationActions();
                return affected;
            },

            _cleanupOutsideSubActionTarget(action, subAction, actor, target) {
                const containedTarget = target && target !== actor && (target.CPun <= 0 || target.alive === false);
                if (!containedTarget) return;
                if (this._isCorpse(target)) return;
                const removesTarget = action === 'feast' || (action === 'feed' && ['sacrifice', 'forceFeed'].includes(subAction));
                if (!removesTarget) return;
                if (this.party.includes(target)) this._removeContainedPartyMember(target);
                else if (this.creatures.includes(target)) this._removeCreatureFromArea(target);
            },

            _findCorpseById(targetId) {
                return this.creatures.find(c => this._isCorpse(c) && String(c.id || c.name) === String(targetId));
            },

            _initializeCorpsePortions(corpse) {
                if (!corpse || !this._isCorpse(corpse)) return 0;
                this._normalizeRemainsRecord(corpse);
                return Math.max(0, Math.floor(Number(corpse.remainingPortions) || 0));
            },

            _corpseRemainingPortions(corpse) {
                return this._initializeCorpsePortions(corpse);
            },

            _canScavengeCorpse(corpse) {
                return Boolean(corpse && this._isCorpse(corpse) && this._corpseRemainingPortions(corpse) > 0);
            },

            _corpseScavengeLabel(corpse) {
                return this._canScavengeCorpse(corpse)
                    ? this._uiLabel('scavenge')
                    : this._label('action.scavenged', 'Scavenged');
            },

            _corpseScavengeStatus(corpse) {
                const remaining = this._corpseRemainingPortions(corpse);
                return remaining > 0
                    ? this._label('corpse.portionsRemaining', '{count} portions left', { count: remaining })
                    : this._label('corpse.depleted', 'Scavenged');
            },

            _corpsePortionDemand(actor) {
                return Math.max(1, Math.ceil(Number(actor?.size || 4) / 4));
            },

            _consumeCorpsePortion(corpse, actor) {
                if (!corpse || !actor || !this._isLivingCreature(actor)) return null;
                const remaining = this._corpseRemainingPortions(corpse);
                if (remaining <= 0) return null;
                const consumed = Math.min(remaining, this._corpsePortionDemand(actor));
                return this._applyRemainsScavenge(corpse, actor, consumed);
            },

            _consumeCorpsePortions(corpse, actors = []) {
                const results = [];
                for (const actor of actors || []) {
                    const result = this._consumeCorpsePortion(corpse, actor);
                    if (!result) break;
                    results.push(result);
                }
                return results;
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
                    if (authoredLoot && this._canAddInventoryItem(authoredLoot, 1)) {
                        item = this._createItemInstance(authoredLoot, { id: `loot_${corpseKey}` });
                        this._addInventoryItem(authoredLoot, item);
                    } else if (this._worldChance('corpse-loot-item', 0, 0, 0.5, corpseKey)) {
                        const items = Object.keys(this.ITEMS);
                        const name = this._pickWorldList(items, 'corpse-loot-item-name', 0, 0, corpseKey);
                        if (this._canAddInventoryItem(name, 1)) {
                            item = this._createItemInstance(name, { id: `loot_${corpseKey}` });
                            this._addInventoryItem(name, item);
                        }
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
                if (item || gold > 0) this.showToast({ text, type: 'loot', importance: 'notable', dedupeKey: `corpse-loot:${targetId}` });
                this.emitStoryResult({ mode: 'adventure', actors: [this._getExplorationActor?.() || this.player].filter(Boolean), targets: [corpse], action: 'loot' }, text);
                this.renderLog();
                this.renderCreatures();
                this.renderExplorationActions();
                this.markAutoSaveDirty?.(['manifest', 'player', 'party', 'inventory', 'currentTile', 'worldTiles', 'quests', 'sceneFeed', 'activityLog'], 'corpse-loot');
                this.autoSave();
                return true;
            },

            scavengeCorpse(targetId, actors = null) {
                const corpse = this._findCorpseById(targetId);
                if (!corpse) return false;
                if (!this._canScavengeCorpse(corpse)) {
                    this.renderCreatures();
                    this.renderExplorationActions();
                    return true;
                }
                const actorPool = Array.isArray(actors) && actors.length > 0 ? actors : this._getExplorationActors();
                const seenActorIds = new Set();
                const scavengers = (actorPool || []).filter(actor => {
                    if (!actor || !this.party.includes(actor) || !this._isLivingCreature(actor)) return false;
                    const actorId = this._unitSelectionId(actor);
                    if (seenActorIds.has(actorId)) return false;
                    seenActorIds.add(actorId);
                    return true;
                });
                if (scavengers.length === 0) return false;
                const consumed = this._consumeCorpsePortions(corpse, scavengers);
                if (consumed.length === 0) return true;
                const consumedActors = consumed.map(entry => entry.actor);
                const totalPortions = consumed.reduce((sum, entry) => sum + entry.consumed, 0);
                const depletedNow = Boolean(corpse.depleted && !corpse.remainsDepletionSceneBeatEmitted);
                if (depletedNow) corpse.remainsDepletionSceneBeatEmitted = true;
                const actorText = YAW_INTERACTION_STATE.unitNames(this, consumedActors, this.player?.name || this._label('party.you', 'You'));
                const singularNamedActor = consumedActors.length === 1 && consumedActors[0] !== this.player;
                const text = CONTENT.actionResult('corpseScavenge', {
                    target: corpse.corpseName || corpse.name,
                    actor: actorText,
                    actors: consumedActors.map(actor => actor.name || actor.species || this._label('ui.unknown', 'Unknown')).filter(Boolean),
                    portions: totalPortions,
                    scavengeVerb: singularNamedActor ? 'scavenges' : 'scavenge',
                    carveVerb: singularNamedActor ? 'carves' : 'carve',
                    feastVerb: singularNamedActor ? 'feasts' : 'feast',
                    explicit: true,
                    voreEnabled: this.settings.vore
                });
                const sceneText = depletedNow
                    ? `${text} ${this._label('scene.remainsDepleted', "{target}'s remains are depleted.", { target: corpse.corpseName || corpse.name })}`
                    : text;
                this.log.push({ text, type: 'discovery' });
                this.showToast({ text, type: 'loot', importance: 'notable', dedupeKey: `corpse-scavenge:${targetId}:${corpse.edibleRemaining || 0}` });
                this.emitStoryResult({
                    mode: 'adventure',
                    actors: consumedActors,
                    targets: [corpse],
                    action: 'scavenge',
                    tags: depletedNow ? ['remains', 'depleted'] : ['remains']
                }, sceneText, {
                    resultKind: depletedNow ? 'depleted' : 'state',
                    tags: depletedNow ? ['remains', 'scavenge', 'depleted'] : ['remains', 'scavenge'],
                    subEvents: depletedNow ? [{
                        type: 'remains-depleted',
                        targetId: corpse.id || corpse.name,
                        targetName: corpse.corpseName || corpse.name,
                        summary: this._label('scene.remainsDepleted', "{target}'s remains are depleted.", { target: corpse.corpseName || corpse.name })
                    }] : []
                });
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
                this.markAutoSaveDirty?.(['manifest', 'party', 'holdings', 'currentTile', 'worldTiles', 'sceneFeed', 'activityLog'], 'corpse-scavenge');
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
            attemptFlee(actor = this.activeActor || this._currentCombatActor() || this.player) {
                return YAW_COMBAT_MOBILITY.attemptFlee(this, actor);
            },

            // ===== FEED ACTION =====
            executeFeedAction(actor = this.activeActor || this._currentCombatActor() || this.player, target = null) {
                return YAW_COMBAT_FEED.executeAction(this, actor, target);
            },
            executeActionVariant(action, actor = this.activeActor || this._currentCombatActor() || this.player, target = null) {
                return YAW_COMBAT_FEED.executeVariantAction(this, action, actor, target);
            },
            openCombatActionVariantSheet(presentation = '') {
                return YAW_COMBAT_FEED.openVariantSheet(this, presentation);
            },
            _executeFeedSubAction(subId, actor, target = null) {
                return YAW_COMBAT_FEED.executeSubAction(this, subId, actor, target || this.feedSelection?.target || null, this.feedSelection?.action || 'feed');
            },
            _executeActionVariant(subId, actor, target = null) {
                return YAW_COMBAT_FEED.executeSubAction(this, subId, actor, target || this.feedSelection?.target || null, this.feedSelection?.action || 'feed');
            },
            cancelActionVariantSelection() {
                return YAW_COMBAT_FEED.cancelVariantSelection(this);
            },
            _resolveCombatFeedCommand(command) {
                return YAW_COMBAT_FEED.resolveCommand(this, command);
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

            _perkDisplayName(perk, unit = this.player) {
                return YAW_PERK_FLOW.selectedName(this, perk, unit);
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
                return YAW_HOLDINGS.showPerkSelection(this);
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

            generateProceduralQuest(archetype, context = {}) {
                return YAW_QUEST_FLOW.generateProcedural(this, archetype, context);
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

            openTransactionWindow(kind, targetId) {
                return YAW_TRANSACTION_WINDOW.open(this, kind, targetId);
            },

            closeTransactionWindow() {
                return YAW_TRANSACTION_WINDOW.close(this);
            },

            refreshTransactionWindow() {
                return YAW_TRANSACTION_WINDOW.refresh(this);
            },

            closeTransactionWindowIfTargetMissing() {
                return YAW_TRANSACTION_WINDOW.closeIfTargetMissing(this);
            },

            showTrade(targetId) {
                return this.openTransactionWindow('trade', targetId);
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

            _questObjectiveDisplayLabel(objective) {
                return YAW_QUEST_FLOW.objectiveDisplayLabel(this, objective);
            },

            _questCheckpointLabel(checkpoint, index = 0) {
                return YAW_QUEST_FLOW.checkpointLabel(this, checkpoint, index);
            },

            _questTitleLabel(quest) {
                return YAW_QUEST_FLOW.titleLabel(this, quest);
            },

            _questDescriptionLabel(quest) {
                return YAW_QUEST_FLOW.descriptionLabel(this, quest);
            },

            questSpeciesLabel(speciesId) {
                return YAW_QUEST_FLOW.speciesLabel(this, speciesId);
            },

            _questRewardPreviewText(reward = {}) {
                return YAW_QUEST_FLOW.rewardPreviewText(this, reward);
            },

            _isQuestProtectedItem(item) {
                return YAW_QUEST_FLOW.protectsItem(this, item);
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
                return this.openTransactionWindow('quest', targetId);
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

            _recordQuestDefeat(target, actor, resolution, options = {}) {
                return YAW_QUEST_FLOW.recordDefeat(this, target, actor, resolution, options);
            },

            _grantQuestReward(quest) {
                return YAW_QUEST_FLOW.grantReward(this, quest);
            },

            _questTurnInEligibility(quest, context = {}) {
                return YAW_QUEST_FLOW.turnInEligibility(this, quest, context);
            },

            _questSearchItemForLocation(tile = this._currentExplorationTile()) {
                return YAW_QUEST_FLOW.recoverableSearchItem(this, tile);
            },

            turnInQuest(questId, context = {}) {
                return YAW_QUEST_FLOW.turnIn(this, questId, context);
            },

            failQuest(questId, reason = '') {
                return YAW_QUEST_FLOW.fail(this, questId, reason);
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

            _itemDefinitionId(item) {
                return YAW_ITEM_REGISTRY.definitionId(this, item);
            },

            _isItemDefinitionAvailable(item) {
                return YAW_ITEM_REGISTRY.isAvailable(this, item);
            },

            _normalizeItemInstance(item) {
                return YAW_ITEM_REGISTRY.normalizeInstance(this, item);
            },

            _createItemInstance(itemOrId, instance = {}) {
                return YAW_ITEM_REGISTRY.createInstance(this, itemOrId, instance);
            },

            _packCapacityUsed() {
                return YAW_ITEM_REGISTRY.capacityUsed(this.inventory);
            },

            _canAddInventoryItem(itemOrId, quantity = 1) {
                return YAW_ITEM_REGISTRY.canAccept(this, this.inventory, itemOrId, quantity, this.MAX_INVENTORY);
            },

            _addInventoryItem(itemOrId, instance = {}) {
                return YAW_ITEM_REGISTRY.addToCollection(this, this.inventory, itemOrId, instance, this.MAX_INVENTORY);
            },

            _removeInventoryItem(itemId, quantity = 1) {
                return YAW_ITEM_REGISTRY.removeFromCollection(this, this.inventory, itemId, quantity);
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

            equipItem(itemId, ownerId = null) {
                return YAW_INVENTORY_PANEL.equip(this, itemId, ownerId);
            },

            unequipItem(slot, ownerId = null) {
                return YAW_INVENTORY_PANEL.unequip(this, slot, ownerId);
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
            _holdingSections(owner = this.player) {
                return YAW_HOLDINGS.sections(this, owner);
            },
            _holdingsOwner() {
                return YAW_HOLDINGS.selectedOwner(this);
            },
            _holdingsOwnerId(unit = this.player) {
                return YAW_HOLDINGS.ownerId(this, unit);
            },
            _setHoldingsOwner(ownerId) {
                return YAW_HOLDINGS.setOwner(this, ownerId);
            },
            setHoldingsOwner(ownerId) {
                return YAW_HOLDINGS.setOwner(this, ownerId);
            },
            _partyHoldingOwners() {
                return YAW_HOLDINGS.partyOwners(this);
            },
            _showHoldingsForUnit(unit, options = {}) {
                return YAW_HOLDINGS.showForUnit(this, unit, options);
            },
            _holdingOwnerLabel(unit = this.player) {
                return YAW_HOLDINGS.ownerLabel(this, unit);
            },
            _listPackItems(owner = this.player) {
                return YAW_HOLDINGS.listPackItems(this, owner);
            },
            _listEquipmentSlots(owner = this.player) {
                return YAW_HOLDINGS.listEquipmentSlots(this, owner);
            },
            _listContainerEntries(owner = this.player, containerId = 'stomach') {
                return YAW_HOLDINGS.listContainerEntries(this, owner, containerId);
            },
            _listAllContainerEntries(owner = this.player) {
                return YAW_HOLDINGS.listAllContainerEntries(this, owner);
            },
            _containerProfile(containerId = 'stomach') {
                return YAW_HOLDINGS.containerProfile(this, containerId);
            },
            _containerLabel(containerId = 'stomach') {
                return YAW_HOLDINGS.containerLabel(this, containerId);
            },
            _containerEntryStatus(entry) {
                return YAW_HOLDINGS.containerEntryStatus(this, entry);
            },
            _containerEntryActions(owner, containerId, entry) {
                return YAW_HOLDINGS.containerEntryActions(this, owner, containerId, entry);
            },
            _canReleaseContainerEntry(owner, containerId, entry) {
                return YAW_HOLDINGS.canReleaseContainerEntry(this, owner, containerId, entry);
            },
            _canDigestContainer(owner, containerId, entry = null) {
                return YAW_HOLDINGS.canDigestContainer(this, owner, containerId, entry);
            },
            _groundHoldings(tile = this._currentExplorationTile?.()) {
                return YAW_HOLDINGS.groundHoldings(this, tile);
            },
            _holdingEntryKind(entry) {
                return YAW_HOLDINGS.holdingEntryKind(entry);
            },
            showInventory() {
                return YAW_INVENTORY_PANEL.show(this);
            },
            closeHoldingsWindow() {
                return YAW_HOLDINGS.close(this);
            },
            refreshHoldingsWindow() {
                return YAW_HOLDINGS.refresh(this);
            },
            setHoldingsTab(tab) {
                return YAW_HOLDINGS.setTab(this, tab);
            },
            showContainedHoldingDetail(holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
                return YAW_HOLDINGS.showContainedDetail(this, holderType, holderIndex, container, containedIndex);
            },
            setInventoryFilter(filter) {
                return YAW_INVENTORY_PANEL.setFilter(this, filter);
            },
            setInventorySort(sort) {
                return YAW_INVENTORY_PANEL.setSort(this, sort);
            },
            requestUseItem(itemId) {
                return YAW_INVENTORY_PANEL.requestUse(this, itemId);
            },
            cancelUseItem() {
                return YAW_INVENTORY_PANEL.cancelUse(this);
            },
            useItem(itemId, targetId = null) {
                return YAW_INVENTORY_PANEL.use(this, itemId, targetId);
            },
            dropItem(itemId) {
                return YAW_INVENTORY_PANEL.drop(this, itemId);
            },

            // ===== RENDERING =====
            renderParty() {
                YAW_TUTORIAL_SYSTEM.sync(this, { notify: true });
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
            renderMobileExplorationControls() {
                return YAW_MOBILE_UNIT_STRIPS.explorationControls(this);
            },
            focusMobileActorRail() {
                return YAW_MOBILE_UNIT_STRIPS.focusActorRail(this);
            },
            focusMobileTargetPicker() {
                return YAW_MOBILE_UNIT_STRIPS.focusTargetPicker(this);
            },
            focusMobileCreaturePresence() {
                return YAW_MOBILE_UNIT_STRIPS.focusCreaturePresence(this);
            },
            focusMobileCreatureRail() {
                return YAW_MOBILE_UNIT_STRIPS.focusCreatureRail(this);
            },
            toggleMobileMovePad() {
                this.mobileMovePadOpen = !this.mobileMovePadOpen;
                this.renderMobileExplorationControls();
            },
            toggleMobileActorBelt() {
                this.mobileActorBeltOpen = !this.mobileActorBeltOpen;
                if (this.mobileActorBeltOpen) {
                    this.mobileTargetPickerOpen = false;
                    this.mobileMovePadOpen = false;
                }
                this.renderMobileExplorationControls();
            },
            toggleMobileTargetPicker() {
                return YAW_MOBILE_UNIT_STRIPS.toggleTargetPicker(this);
            },
            toggleMobilePartyRail() {
                if (this.combatState?.active) return this.openPanel('party');
                return this.toggleMobileActorBelt();
            },
            toggleMobileCreatureRail() {
                if (this.combatState?.active) return YAW_MOBILE_UNIT_STRIPS.toggleCreatureRail(this);
                return YAW_MOBILE_UNIT_STRIPS.toggleTargetPicker(this);
            },
            openMobileRoster(tab = '') {
                return YAW_PANEL_SHELL.openRoster(this, tab);
            },
            closeMobileRoster(options = {}) {
                return YAW_PANEL_SHELL.closeRoster(this, options);
            },
            toggleMobileRoster(tab = '') {
                return YAW_PANEL_SHELL.toggleRoster(this, tab);
            },
            setMobileRosterTab(tab, options = {}) {
                return YAW_PANEL_SHELL.setRosterTab(this, tab, options);
            },
            handleMobileRosterTabKeydown(event) {
                return YAW_PANEL_SHELL.rosterTabKeydown(this, event);
            },
            handleMobileRosterSelection(event) {
                return YAW_PANEL_SHELL.handleRosterSelection(this, event);
            },
            clearMobileRosterDetail() {
                return YAW_PANEL_SHELL.clearRosterDetail(this);
            },
            renderMobileCreatureStrip() {
                return YAW_MOBILE_UNIT_STRIPS.creatures(this);
            },
            _currentCombatActor() {
                return YAW_COMBAT_ACTOR_STATE.current(this);
            },
            _mobileCombatPrompt(actor = this._currentCombatActor()) {
                return YAW_COMBAT_ACTOR_STATE.mobilePrompt(this, actor);
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
            _unitTacticalRings(unit) {
                return YAW_UNIT_CARD_STATUS.tacticalRings(this, unit);
            },
            _unitTacticalSummary(unit) {
                return YAW_UNIT_CARD_STATUS.tacticalSummary(this, unit);
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
            _unitSelectionStateAttrs(unit, type) {
                return YAW_UNIT_SELECTION.stateAttrs(this, unit, type);
            },
            _targetMarkLabel() {
                return YAW_UNIT_SELECTION.targetMarkLabel(this);
            },
            _combatTargetMarkLabel() {
                return YAW_UNIT_SELECTION.combatTargetMarkLabel(this);
            },
            _targetToggleLabel(unit, selected = false) {
                return YAW_UNIT_SELECTION.targetToggleLabel(this, unit, selected);
            },
            _combatTargetToggleLabel(unit, selected = false) {
                return YAW_UNIT_SELECTION.combatTargetToggleLabel(this, unit, selected);
            },
            _actorToggleLabel(unit, selected = false) {
                return YAW_UNIT_SELECTION.actorToggleLabel(this, unit, selected);
            },
            _selectionControlAttrs(kind, active = false) {
                return YAW_UNIT_SELECTION.controlAttrs(this, kind, active);
            },
            _unitSelectionRoleLabel(role) {
                return YAW_UNIT_SELECTION.roleLabel(this, role);
            },
            _unitCardFocusAttrs(unit, expanded = false, fallbackName = null) {
                return YAW_UNIT_SELECTION.focusAttrs(this, unit, expanded, fallbackName);
            },
            _unitActionRowAttrs(scope, unit = null) {
                return YAW_UNIT_SELECTION.actionRowAttrs(this, scope, unit);
            },
            _unitSelectionChips(unit, type) {
                return YAW_UNIT_SELECTION.chips(this, unit, type);
            },
            renderTacticalCard(unit, index, type, options = {}) {
                return YAW_TACTICAL_CARD.render(this, unit, index, type, options);
            },
            _unitArtHtml(unit, fallback = '👤', options = {}) {
                if (typeof YAW_SPRITE_RUNTIME === 'undefined') return this._escapeHtml(fallback || unit?.icon || '👤');
                return YAW_SPRITE_RUNTIME.unitArtHtml(this, unit, fallback || unit?.icon || '👤', {
                    ...options,
                    isPlayer: options.isPlayer === true || unit === this.player
                });
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
            _mapTileArtHtml(visual) {
                return typeof YAW_TILESET_RUNTIME !== 'undefined' ? YAW_TILESET_RUNTIME.tileArtHtml(this, visual) : '';
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

            selectLargeMapTile(x, y) {
                return YAW_LARGE_MAP.selectTile(this, x, y);
            },

            toggleLargeMapFilter(kind) {
                return YAW_LARGE_MAP.toggleFilter(this, kind);
            },

            trackQuestOnMap(questId) {
                return YAW_LARGE_MAP.trackQuest(this, questId);
            },

            toggleLargeMapDock() {
                return YAW_LARGE_MAP.toggleDock(this);
            },

            renderLargeMap() {
                return YAW_LARGE_MAP.render(this);
            },

            _dangerPressureLabel(value = 0) {
                return YAW_MAP_VISUALS.dangerPressureLabel(this, value);
            },
            _tileDangerBand(tile = null) {
                return YAW_MAP_VISUALS.tileDangerBand(this, tile);
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
            openTileDetails() {
                return YAW_MAP_VISUALS.openTileDetails(this);
            },
            closeTileDetails() {
                return YAW_MAP_VISUALS.closeTileDetails(this);
            },
            _desktopPlayCellHtml(visual, label) {
                return YAW_DESKTOP_PLAY_SURFACE.cellHtml(this, visual, label);
            },
            _directionLabel(dx, dy) {
                return YAW_DESKTOP_PLAY_SURFACE.directionLabel(this, dx, dy);
            },
            _handleTraversalHotkey(event) {
                return YAW_DESKTOP_PLAY_SURFACE.handleTraversalKey(this, event);
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
            emitStoryEvent(input = {}) {
                return YAW_STORY_EVENTS.emit(this, input);
            },
            emitStoryResult(commandOrPlan = {}, result = '', options = {}) {
                return YAW_STORY_EVENTS.emitResult(this, commandOrPlan, result, options);
            },
            emitSceneBeat(commandOrPlan = {}, result = '', options = {}) {
                return YAW_STORY_EVENTS.emitSceneBeat(this, commandOrPlan, result, options);
            },
            emitTileObservation(tile = null, options = {}) {
                return YAW_STORY_EVENTS.emitTileObservation(this, tile, options);
            },
            emitRecruitmentSceneBeat(target, actor = this.player, kind = 'blocked', reason = '') {
                return YAW_STORY_EVENTS.emitRecruitmentBeat(this, target, actor, kind, reason);
            },
            emitTransactionSceneBeat(target, kind = 'trade', phase = 'opened', detail = {}) {
                return YAW_STORY_EVENTS.emitTransactionBeat(this, target, kind, phase, detail);
            },
            registerSceneTemplate(template = {}) {
                return YAW_STORY_EVENTS.registerSceneTemplate(this, template);
            },
            renderSceneBeat(plan = {}, outcome = {}) {
                return YAW_STORY_EVENTS.renderSceneBeat(this, plan, outcome);
            },
            renderSceneFeed() {
                return YAW_STORY_EVENTS.render(this);
            },
            renderStoryEvents() {
                return YAW_STORY_EVENTS.render(this);
            },
            openSceneFeed() {
                return YAW_STORY_EVENTS.open(this);
            },
            openStorySheet() {
                return YAW_STORY_EVENTS.open(this);
            },
            closeSceneFeed() {
                return YAW_STORY_EVENTS.close(this);
            },
            closeStorySheet() {
                return YAW_STORY_EVENTS.close(this);
            },
            renderCenterTileActions() {
                return YAW_CENTER_CONTEXT.renderCenterActions(this);
            },
            renderCenterPresence() {
                return YAW_CENTER_CONTEXT.renderPresence(this);
            },
            renderExplorationActions() {
                YAW_CENTER_CONTEXT.refreshPassage?.(this);
                this.renderCenterTileActions();
                this.renderSelectionSentence();
                YAW_STORY_EVENTS.ensureCurrentTileObservation?.(this);
            },
            showExplorationActions() {
                const result = YAW_CENTER_CONTEXT.showExplorationActions(this);
                this.renderCenterPresence();
                return result;
            },
            _ensureSafeAnchor() {
                return YAW_DEFEAT_RECOVERY.ensureSafeAnchor(this);
            },
            _canSetSafeAnchor() {
                return YAW_DEFEAT_RECOVERY.canSetSafeAnchor(this);
            },
            setSafeAnchorFromCurrentLocation() {
                return YAW_DEFEAT_RECOVERY.setSafeAnchorFromCurrentLocation(this);
            },
            _markDefeat(outcome = 'defeat') {
                return YAW_DEFEAT_RECOVERY.markDefeat(this, outcome);
            },
            _resolvePlayerState(input = {}) {
                return YAW_DEFEAT_RECOVERY.resolve(this, input);
            },
            _handlePlayerFall(input = {}) {
                return YAW_DEFEAT_RECOVERY.handlePlayerFall(this, input);
            },
            _settleDefeatedEncounter(outcome = 'defeat') {
                return YAW_DEFEAT_RECOVERY.settleEncounter(this, outcome);
            },
            canTriggerPlayerDeathCheat() {
                return YAW_DEFEAT_RECOVERY.canTriggerDebugDeath(this);
            },
            confirmPlayerDeathCheat() {
                return YAW_DEFEAT_RECOVERY.confirmDebugDeath(this);
            },
            triggerPlayerDeathCheat() {
                return YAW_DEFEAT_RECOVERY.triggerDebugDeath(this);
            },
            _sanitizeLoadedDefeatState(loaded = null) {
                return YAW_DEFEAT_RECOVERY.sanitizeLoadedDefeat(this, loaded);
            },
            showDefeatRecovery() {
                return YAW_DEFEAT_RECOVERY.showDefeatRecovery(this);
            },
            beginDefeatRecovery() {
                return YAW_DEFEAT_RECOVERY.beginSelectedRecovery(this);
            },
            regenerateFromDefeat() {
                return YAW_DEFEAT_RECOVERY.regenerate(this);
            },
            resurrectFromRecovery() {
                return YAW_DEFEAT_RECOVERY.resurrectFromJourney(this);
            },
            _showRecoveryJourney() {
                return YAW_DEFEAT_RECOVERY.showRecoveryJourney(this);
            },
            _isRecoveryJourney() {
                return YAW_RECOVERY_MODES.isJourney(this);
            },
            _recoveryRestricts(capability) {
                return YAW_RECOVERY_MODES.restricts(this, capability);
            },
            _guardRecoveryCapability(capability, context = {}) {
                return YAW_RECOVERY_MODES.guard(this, capability, context);
            },
            collectDeathBag(bagId) {
                return YAW_DEFEAT_RECOVERY.collectDeathBag(this, bagId);
            },
            endDefeatedRun() {
                return YAW_DEFEAT_RECOVERY.endDefeatedRun(this);
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
            showToast(input = {}) {
                return YAW_LOG_VIEW.showToast(this, input);
            },
            dismissToast(toastId) {
                return YAW_LOG_VIEW.dismissToast(this, toastId);
            },
            pauseToast(toastId) {
                return YAW_LOG_VIEW.pauseToast(this, toastId);
            },
            resumeToast(toastId) {
                return YAW_LOG_VIEW.resumeToast(this, toastId);
            },
            resetToastTimer(toastId) {
                return YAW_LOG_VIEW.resetToastTimer(this, toastId);
            },
            clearToasts(options = {}) {
                return YAW_LOG_VIEW.clearToasts(this, options);
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
            toggleActivityLog() {
                return YAW_LOG_VIEW.toggleActivityLog(this);
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
            initAppMenu() {
                if (this.appMenuInitialized) return;
                this.appMenuInitialized = true;
                document.addEventListener('click', event => {
                    const command = event?.target?.closest?.('[data-command-control]');
                    const control = command?.dataset?.commandControl;
                    if (control === 'open-tile-details') {
                        event.preventDefault();
                        this.openTileDetails();
                        return;
                    }
                    if (control === 'close-tile-details') {
                        event.preventDefault();
                        this.closeTileDetails();
                        return;
                    }
                    if (control === 'open-story-sheet') {
                        event.preventDefault();
                        this.openStorySheet();
                        return;
                    }
                    if (control === 'close-story-sheet') {
                        event.preventDefault();
                        this.closeStorySheet();
                        return;
                    }
                    const menu = document.getElementById('app-menu');
                    const toggle = document.getElementById('app-menu-toggle');
                    if (!menu?.classList?.contains('open')) return;
                    const target = event?.target;
                    if (menu.contains?.(target) || toggle?.contains?.(target)) return;
                    this.closeAppMenu();
                });
                document.addEventListener('keydown', event => {
                    if (this.handleAppMenuKey(event)) return;
                    this._handleTraversalHotkey(event);
                });
            },
            appMenuItems() {
                const menu = document.getElementById('app-menu');
                if (!menu) return [];
                return Array.from(menu.querySelectorAll('[role="menuitem"]')).filter(item => {
                    if (item.disabled || item.hidden || item.getAttribute('aria-hidden') === 'true') return false;
                    const style = typeof getComputedStyle === 'function' ? getComputedStyle(item) : null;
                    return !style || (style.display !== 'none' && style.visibility !== 'hidden');
                });
            },
            focusAppMenuItem(index = 0) {
                const items = this.appMenuItems();
                if (!items.length) return false;
                const target = items[((index % items.length) + items.length) % items.length];
                try { target.focus({ preventScroll: true }); } catch (_error) { target.focus(); }
                return true;
            },
            handleAppMenuKey(event) {
                const menu = document.getElementById('app-menu');
                if (!menu?.classList?.contains('open')) return false;
                if (event?.key === 'Escape') {
                    event.preventDefault?.();
                    event.stopPropagation?.();
                    this.closeAppMenu({ restoreFocus: true });
                    return true;
                }
                const items = this.appMenuItems();
                if (!items.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event?.key)) return false;
                event.preventDefault?.();
                event.stopPropagation?.();
                const current = items.indexOf(document.activeElement);
                let next = 0;
                if (event.key === 'ArrowDown') next = current < 0 ? 0 : current + 1;
                else if (event.key === 'ArrowUp') next = current < 0 ? items.length - 1 : current - 1;
                else if (event.key === 'End') next = items.length - 1;
                this.focusAppMenuItem(next);
                return true;
            },
            setAppMenuOpen(open) {
                const menu = document.getElementById('app-menu');
                const toggle = document.getElementById('app-menu-toggle');
                if (!menu || !toggle) return false;
                if (open && typeof MODULE_SYSTEM !== 'undefined') MODULE_SYSTEM.renderSystemUtilities?.();
                menu.classList.toggle('open', Boolean(open));
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                return Boolean(open);
            },
            toggleAppMenu(event = null) {
                event?.stopPropagation?.();
                const menu = document.getElementById('app-menu');
                const isOpen = menu?.classList?.contains('open');
                const open = this.setAppMenuOpen(!isOpen);
                if (open) setTimeout(() => this.focusAppMenuItem(0), 0);
                return open;
            },
            closeAppMenu(options = {}) {
                const closed = this.setAppMenuOpen(false);
                if (options.restoreFocus) {
                    const toggle = document.getElementById('app-menu-toggle');
                    try { toggle?.focus?.({ preventScroll: true }); } catch (_error) { toggle?.focus?.(); }
                }
                return closed;
            },
            isOverlayScreen(name) {
                return ['settings', 'providers', 'mods', 'market', 'release', 'activity'].includes(String(name || ''));
            },
            openOverlayScreen(name) {
                const target = String(name || '');
                const origin = String(this.screen || '');
                if (!this.isOverlayScreen(target)) return this.showScreen(target);
                if (!Array.isArray(this.overlayReturnStack)) this.overlayReturnStack = [];
                if (origin && origin !== target) {
                    const previous = this.overlayReturnStack[this.overlayReturnStack.length - 1];
                    if (previous !== origin) this.overlayReturnStack.push(origin);
                }
                return this.showScreen(target);
            },
            switchOverlayScreen(name) {
                const target = String(name || '');
                if (!Array.isArray(this.overlayReturnStack)) this.overlayReturnStack = [];
                if (this.overlayReturnStack[this.overlayReturnStack.length - 1] === target) {
                    this.overlayReturnStack.pop();
                }
                return this.showScreen(target);
            },
            restoreOverlayReturnFocus(previous, targetScreen) {
                setTimeout(() => {
                    const visible = previous && previous.isConnected !== false && previous.offsetParent !== null;
                    const fallback = targetScreen === 'game'
                        ? document.getElementById('app-menu-toggle')
                        : document.getElementById(`screen-${targetScreen}`);
                    const target = visible ? previous : fallback;
                    if (target && typeof target.focus === 'function') {
                        try { target.focus(); } catch (e) {}
                    }
                }, 0);
            },
            showScreen(name) {
                const originScreen = String(this.screen || '');
                const dialogTarget = this.isOverlayScreen(name) || name === 'save-manager';
                const dialogOrigin = this.isOverlayScreen(originScreen) || originScreen === 'save-manager';
                if (dialogTarget && !dialogOrigin && !this.overlayBaseReturnFocus) {
                    const active = document.activeElement && document.activeElement !== document.body
                        ? document.activeElement
                        : null;
                    this.overlayBaseReturnFocus = originScreen === 'game'
                        ? document.getElementById('app-menu-toggle') || active
                        : active;
                } else if (!dialogTarget) {
                    this.overlayBaseReturnFocus = null;
                }
                this.closeAppMenu();
                this.screen = name;
                if (!this.isOverlayScreen(name) && name !== 'save-manager') this.overlayReturnStack = [];
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
                    this.syncStartupReadinessUI();
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
                } else if (name === 'providers') {
                    document.getElementById('app').style.display = 'none';
                    if (typeof AIProviderUI !== 'undefined' && AIProviderUI.refresh) { try { AIProviderUI.refresh(); } catch(e) {} }
                } else if (name === 'release') {
                    document.getElementById('app').style.display = 'none';
                    this.renderReleaseNotes();
                } else if (name === 'activity') {
                    document.getElementById('app').style.display = 'none';
                    this.renderLog();
                } else if (name === 'market') {
                    document.getElementById('app').style.display = 'none';
                    if (typeof MODULE_MARKETPLACE !== 'undefined' && MODULE_MARKETPLACE.ui && MODULE_MARKETPLACE.ui.showMarketplace) { try { MODULE_MARKETPLACE.ui.showMarketplace(); } catch(e) {} }
                } else if (name === 'save-manager') {
                    document.getElementById('save-manager').style.display = 'block';
                    document.getElementById('save-manager').classList.add('active');
                    this.renderSaveManager();
                }
                const overlayId = name === 'save-manager' ? 'save-manager' : ['settings', 'providers', 'mods', 'market', 'release', 'activity'].includes(name) ? `screen-${name}` : '';
                if (overlayId) this._activateFocusTrap(document.getElementById(overlayId), { close: () => this.returnToGame() });
            },
            returnToGame() {
                if (this.isOverlayScreen(this.screen) && Array.isArray(this.overlayReturnStack) && this.overlayReturnStack.length) {
                    const returnFocus = this._focusTrap?.previous || null;
                    const targetScreen = this.overlayReturnStack.pop();
                    this._restoreFocusTrap({ restoreFocus: false });
                    this.showScreen(targetScreen);
                    this.restoreOverlayReturnFocus(returnFocus, targetScreen);
                    return;
                }
                const returnFocus = this.overlayBaseReturnFocus || this._focusTrap?.previous || null;
                this.overlayBaseReturnFocus = null;
                this._restoreFocusTrap({ restoreFocus: false });
                const returnScreen = this.settingsReturnScreen;
                this.settingsReturnScreen = null;
                ['screen-settings', 'screen-providers', 'screen-mods', 'screen-market', 'screen-release', 'screen-activity', 'save-manager'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { el.style.display = 'none'; el.classList.remove('active'); }
                });
                if (returnScreen === 'create') {
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('screen-menu').style.display = 'none';
                    document.getElementById('screen-create').style.display = 'flex';
                    document.getElementById('screen-create').classList.add('active');
                    this.screen = 'create';
                    this.syncCreateContentLevel();
                    this.restoreOverlayReturnFocus(returnFocus, 'create');
                    return;
                }
                if (returnScreen === 'menu') {
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('screen-game').style.display = 'none';
                    document.getElementById('screen-game').classList.remove('active');
                    document.getElementById('screen-menu').style.display = 'flex';
                    document.getElementById('screen-menu').classList.add('active');
                    this.screen = 'menu';
                    this.refreshContinueButton();
                    this.restoreOverlayReturnFocus(returnFocus, 'menu');
                    return;
                }
                if (returnScreen === 'game') {
                    if (this.player && this.player.CPun > 0) {
                        document.getElementById('screen-menu').style.display = 'none';
                        document.getElementById('app').style.display = 'grid';
                        document.getElementById('screen-game').style.display = 'flex';
                        document.getElementById('screen-game').classList.add('active');
                        this.screen = 'game';
                    } else {
                        document.getElementById('app').style.display = 'none';
                        document.getElementById('screen-game').style.display = 'none';
                        document.getElementById('screen-game').classList.remove('active');
                        document.getElementById('screen-menu').style.display = 'flex';
                        document.getElementById('screen-menu').classList.add('active');
                        this.screen = 'menu';
                        this.refreshContinueButton();
                    }
                    this.restoreOverlayReturnFocus(returnFocus, this.screen);
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
                this.restoreOverlayReturnFocus(returnFocus, this.screen);
            },
            showCharacterStats() {
                return YAW_HOLDINGS.show(this, this.player, { tab: 'stats' });
            },
            cheats: { godMode: false, neverHungry: false, canEatAnything: false, overpowered: false },
            toggleCheat(cheat) {
                this.cheats[cheat] = !this.cheats[cheat];
                const isOn = this.cheats[cheat];
                this.log.push({ text: this._label('cheat.toggled', 'Cheat {name}: {state}', {
                    name: this._label(`cheat.${cheat}`, cheat),
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
                    el.setAttribute('aria-pressed', on ? 'true' : 'false');
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
                this.log.push({ text: this._label('combat.instantWinDecorated', '⚡ {message}', {
                    message: this._label('combat.instantWinSuccess', 'Instant Win! All enemies are defeated.')
                }), type: 'combat' });
                this.renderLog();
                this.creatures.forEach(c => {
                    if (c.disposition === this.DISPOSITION.ENEMY && this._isLivingCreature(c)) {
                        this._makeCorpse(c, 'fight', { actor: this.player, source: 'instant-win' });
                    }
                });
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
            contentAccessSnapshot() {
                return YAW_CONTENT_ACCESS.snapshot(this);
            },
            requestContentAccess(requirements, options = {}) {
                return YAW_CONTENT_ACCESS.request(this, requirements, options);
            },
            setContentCategory(categoryId, enabled) {
                return YAW_SETTINGS_FLOW.setContentCategory(this, categoryId, enabled);
            },
            setGameplayVariant(variantId, enabled) {
                return YAW_SETTINGS_FLOW.setGameplayVariant(this, variantId, enabled);
            },
            renderContentPolicySettings() {
                return YAW_SETTINGS_FLOW.renderContentPolicySettings(this);
            },
            renderRecoveryModeOptions() {
                return YAW_SETTINGS_FLOW.renderRecoveryModeOptions(this);
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
            openSettingsFromMenu() {
                return YAW_SETTINGS_FLOW.openSettingsFromMenu(this);
            },
            openSettingsFromGame() {
                return YAW_SETTINGS_FLOW.openSettingsFromGame(this);
            },
            saveSettings() {
                return YAW_SETTINGS_FLOW.save(this);
            },
            updateLanguage(language) {
                return YAW_SETTINGS_FLOW.updateLanguage(this, language);
            },
            refreshLanguagePresentation() {
                return YAW_SETTINGS_FLOW.refreshLanguagePresentation(this);
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
            showNewGameManager() {
                if (!this.startupActionReady('play')) return false;
                return YAW_SAVE_SLOT_FLOW.showNewGameManager(this);
            },
            showSaveManager(mode = 'load') {
                if (!this.player && !this.startupActionReady('play')) return false;
                return YAW_SAVE_SLOT_FLOW.showManager(this, mode);
            },
            exportSaveSlot(slotName) {
                return YAW_HOST_SAVE_TRANSFER.exportSlot(this, slotName);
            },
            importSaveFile() {
                return YAW_HOST_SAVE_TRANSFER.importFile(this);
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
            showModScreen() {
                if (!this.startupActionReady('mods')) return false;
                return this.screen === 'market'
                    ? this.switchOverlayScreen('mods')
                    : this.openOverlayScreen('mods');
            },
            isFileOrigin() {
                const runtimeLocation = typeof window !== 'undefined' ? window.location : null;
                return runtimeLocation?.protocol === 'file:' || runtimeLocation?.origin === 'null';
            },
            applyRuntimeOriginGates() {
                const nativeHost = typeof YAW_HOST !== 'undefined' && YAW_HOST.capabilities().native === true;
                const fileOriginWarning = this.isFileOrigin() && !nativeHost;
                document.querySelectorAll?.('[data-ai-integration-entry]').forEach(element => {
                    element.hidden = false;
                    element.setAttribute?.('data-ai-origin-mode', fileOriginWarning ? 'file-warning' : 'full');
                });
                document.querySelectorAll?.('[data-ai-file-origin-notice]').forEach(element => {
                    element.hidden = !fileOriginWarning;
                });
                document.querySelectorAll?.('[data-native-host-entry]').forEach(element => {
                    element.hidden = !nativeHost;
                });
                return fileOriginWarning;
            },
            showHostSettings() {
                return YAW_HOST.app.openSettings();
            },
            showAIProviderScreen() {
                return this.openOverlayScreen('providers');
            },
            showActivityLogScreen() {
                return this.openOverlayScreen('activity');
            },
            releaseInfo() {
                return window.YAW_RELEASE || {
                    version: '0.0.0', status: 'draft', releasedAt: null, channel: 'development',
                    notes: {}, compatibility: {}
                };
            },
            releaseIdentity(release = this.releaseInfo()) {
                return `${release.version}:${release.channel || 'development'}:${release.status || 'draft'}`;
            },
            releaseDisplayLabel(release = this.releaseInfo()) {
                if (release.status === 'released') return `v${release.version}`;
                const status = this._label(
                    release.status === 'candidate' ? 'release.status.candidate' : 'release.status.draft',
                    release.status === 'candidate' ? 'Candidate' : 'Development draft'
                );
                return `v${release.version} · ${status}`;
            },
            syncReleaseUI() {
                const release = this.releaseInfo();
                document.querySelectorAll('[data-release-version]').forEach(element => {
                    element.textContent = this.releaseDisplayLabel(release);
                });
                const notice = document.getElementById('release-update-notice');
                if (notice) notice.hidden = this._getStoredValue('releaseSeen') === this.releaseIdentity(release);
                return release.version;
            },
            dismissReleaseNotice() {
                const release = this.releaseInfo();
                this._setStoredValue('releaseSeen', this.releaseIdentity(release));
                const notice = document.getElementById('release-update-notice');
                if (notice) notice.hidden = true;
                return release.version;
            },
            releaseNoteSection(titleKey, titleFallback, entries = []) {
                const items = Array.isArray(entries) ? entries : [];
                if (!items.length) return '';
                return `<section class="release-note-card"><h2>${this._escapeHtml(this._label(titleKey, titleFallback))}</h2><ul>${items.map(item => `<li>${this._escapeHtml(item)}</li>`).join('')}</ul></section>`;
            },
            renderReleaseNotes() {
                const release = this.releaseInfo();
                const language = CONTENT?.preferences?.language === 'es' ? 'es' : 'en';
                const notes = release.notes?.[language] || release.notes?.en || {};
                const compatibility = release.compatibility?.[language] || release.compatibility?.en || {};
                const version = document.getElementById('release-notes-version');
                if (version) {
                    const parts = [this.releaseDisplayLabel(release)];
                    if (release.releasedAt) parts.push(release.releasedAt);
                    if (release.channel) parts.push(release.channel);
                    version.textContent = parts.join(' · ');
                }
                const content = document.getElementById('release-notes-content');
                if (content) {
                    content.innerHTML = `<div class="release-notes-grid">${this.releaseNoteSection('release.added', 'Added', notes.added)}${this.releaseNoteSection('release.changed', 'Changed', notes.changed)}${this.releaseNoteSection('release.fixed', 'Fixed', notes.fixed)}${this.releaseNoteSection('release.knownIssues', 'Known Issues', notes.knownIssues)}</div><section class="release-compatibility"><h2>${this._escapeHtml(this._label('release.compatibility', 'Compatibility'))}</h2><p><strong>${this._escapeHtml(this._label('release.saves', 'Saves'))}:</strong> ${this._escapeHtml(compatibility.saves || '')}</p><p><strong>${this._escapeHtml(this._label('release.mods', 'Mods'))}:</strong> ${this._escapeHtml(compatibility.mods || '')}</p></section>`;
                }
                this.dismissReleaseNotice();
                return release;
            },
            showReleaseNotes() {
                return this.openOverlayScreen('release');
            },
            hasHostCatalog() {
                return typeof MODULE_SYSTEM !== 'undefined'
                    && typeof MODULE_SYSTEM.getHostCatalog === 'function'
                    && MODULE_SYSTEM.getHostCatalog().length > 0;
            },
            invokeModUiContribution(slot, key, unitType = '', index = null) {
                if (typeof MODULE_SYSTEM === 'undefined') return false;
                this.closeAppMenu();
                return MODULE_SYSTEM.invokeUiContribution(slot, key, unitType, index);
            },
            closeModUiContributionDialog() {
                return typeof MODULE_SYSTEM !== 'undefined'
                    ? MODULE_SYSTEM.closeUiContributionDialog()
                    : false;
            },
            syncHostCatalogControls() {
                const available = this.hasHostCatalog();
                document.querySelectorAll('[data-host-catalog-entry]').forEach(control => {
                    control.hidden = !available;
                });
                return available;
            },
            showMarketScreen() {
                if (!this.hasHostCatalog()) return this.showModScreen();
                return this.openOverlayScreen('market');
            },
            showTutorial() {
                return YAW_TUTORIAL_SYSTEM.open(this);
            },
            closeTutorial() {
                return YAW_TUTORIAL_SYSTEM.close(this);
            },
            nextTutorial() {
                return YAW_TUTORIAL_SYSTEM.move(this, 1);
            },
            previousTutorial() {
                return YAW_TUTORIAL_SYSTEM.move(this, -1);
            },
            selectTutorialLesson(lessonId) {
                return YAW_TUTORIAL_SYSTEM.select(this, lessonId);
            },
            resetTutorialLessons() {
                return YAW_TUTORIAL_SYSTEM.reset(this);
            },
            skipTutorial() { return this.closeTutorial(); },
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
            openPanel(p) {
                return YAW_PANEL_SHELL.open(this, p);
            },
            openPanelFromRail(p, rail = '') {
                return YAW_PANEL_SHELL.openFromRail(this, p, rail);
            },
            closeAllPanels() {
                return YAW_PANEL_SHELL.closeAll(this);
            },
            focusPresence(type, ref) {
                return YAW_CENTER_CONTEXT.focusPresence(this, type, ref);
            },
            focusPresenceOverflow(route = '') {
                return YAW_CENTER_CONTEXT.focusPresenceOverflow(this, route);
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
            initMobileUnitStripGestures() {
                return YAW_MOBILE_GESTURES.initUnitStripPan(this);
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
            showIntentMenu(type, targetRef, source = 'sheet', presentation = 'sheet', anchorEvent = null) {
                return YAW_INTENT_MENU.show(this, type, targetRef, source, presentation, anchorEvent);
            },
            showRadialIntentMenu(type, targetRef, source = 'radial') {
                return this.showIntentMenu(type, targetRef, source, 'radial');
            },
            openIntentSubActionSheet(type, targetRef, action, source = 'sheet', anchorEvent = null) {
                return YAW_INTENT_MENU.openSubActionSheet(this, type, targetRef, action, source, anchorEvent);
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
            mobilePartyContextSetBehavior(index, field, value) {
                return YAW_MOBILE_CONTEXT_MENU.setBehavior(this, index, field, value);
            },
            showMobileCreatureContext(targetId) {
                return YAW_MOBILE_CONTEXT_MENU.showCreature(this, targetId);
            },
            mobileCreatureContextAction(action, targetId) {
                return YAW_MOBILE_CONTEXT_MENU.creatureAction(this, action, targetId);
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
                if (typeof YAW_STARTUP_READINESS !== 'undefined' && YAW_STARTUP_READINESS.state('saves')) {
                    const state = await YAW_STARTUP_READINESS.start('saves', () => this._syncLastSaveSlot(), {
                        label: 'saved games',
                        labelKey: 'startup.domain.saves',
                        timeoutMs: 10000,
                        force: true
                    });
                    this.syncStartupReadinessUI();
                    return state?.status === 'ready' && Boolean(state.result);
                }
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
                const options = arguments[0] || {};
                return options && Object.keys(options).length
                    ? YAW_SAVE_PERSISTENCE.autoSave(this, options)
                    : YAW_SAVE_PERSISTENCE.autoSave(this);
            },
            markSaveDirty(domain, reason = '') {
                return YAW_SAVE_PERSISTENCE.markSaveDirty(this, domain, reason);
            },
            markSaveDirtyMany(domains = [], reason = '') {
                return YAW_SAVE_PERSISTENCE.markSaveDirtyMany(this, domains, reason);
            },
            markAutoSaveDirty(domains = [], reason = '') {
                return YAW_SAVE_PERSISTENCE.markAutoSaveDirty(this, domains, reason);
            },
            clearSaveDirty(domain) {
                return YAW_SAVE_PERSISTENCE.clearSaveDirty(this, domain);
            },
            clearSaveDirtyAll() {
                return YAW_SAVE_PERSISTENCE.clearSaveDirtyAll(this);
            },
            dirtySaveDomains() {
                return YAW_SAVE_PERSISTENCE.dirtySaveDomains(this);
            },
            hasDirtySaveDomains() {
                return YAW_SAVE_PERSISTENCE.hasDirtySaveDomains(this);
            },
            saveDebugState() {
                return YAW_SAVE_PERSISTENCE.saveDebugState(this);
            },
            async _loadSparseSlotData(slotName) {
                return YAW_SAVE_PERSISTENCE.loadSparseSlotData(this, slotName);
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
            async _deleteSlotData(slotName, options = {}) {
                return YAW_SAVE_SLOT_FLOW.deleteSlotData(this, slotName, options);
            },
            cancelAutoSave(options = {}) {
                return YAW_SAVE_PERSISTENCE.cancelAutoSave(this, options);
            },
            async _dbOpen(dbName = this.SAVE_DB_NAME) { return YAW_STORAGE.dbOpen(this, dbName); },
            async _readSaveSlotPresence(slotNames) { return YAW_STORAGE.readSaveSlotPresence(this, slotNames); },
            async _dbPut(store, key, value) { return YAW_STORAGE.dbPut(this, store, key, value); },
            async _dbGet(store, key) { return YAW_STORAGE.dbGet(this, store, key); },
            async _dbDelete(store, key) { return YAW_STORAGE.dbDelete(this, store, key); },
            async _worldDbOpen() {
                return YAW_WORLD_STORE.dbOpen(this);
            },
            async persistWorldStateToMapStore() {
                return YAW_WORLD_STORE.persist(this);
            },
            async persistDirtyWorldTilesToMapStore(keys = []) {
                return YAW_WORLD_STORE.persistDirty(this, keys);
            },
            async loadWorldStateFromMapStore() {
                return YAW_WORLD_STORE.load(this);
            },
            _forkWorldForSaveSlot(slotName) {
                return YAW_WORLD_STORE.forkCurrent(this, `save_${this._normalizeSaveSlotName(slotName)}`);
            },
            async _referencedWorldIds() {
                return YAW_WORLD_STORE.referencedWorldIds(this);
            },
            async _pruneUnreferencedWorldStore(referencedIds = null) {
                return YAW_WORLD_STORE.pruneUnreferenced(this, referencedIds);
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
        window.openTileDetails = () => App.openTileDetails();
        window.closeTileDetails = () => App.closeTileDetails();
        window.openStorySheet = () => App.openStorySheet();
        window.closeStorySheet = () => App.closeStorySheet();
        window.returnToGame = () => App.returnToGame();
        document.addEventListener('DOMContentLoaded', () => App.init());
