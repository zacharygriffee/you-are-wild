
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
            SUB_ACTIONS: {
                feast: {
                    swallow: { label: 'Swallow', sfwLabel: 'Consume', icon: '🍽️', validate: (a, t) => App._canFitPrey(a, t, 'stomach') && (t.CPun <= t.MPun * 0.3 || (a.Feas > t.Flee && a.size >= t.size - 2)), execute: 'swallowWhole', setting: null },
                    chew: { label: 'Chew', sfwLabel: 'Mangle', icon: '🦷', validate: (a, t) => App.settings.chewing, execute: 'chewPrey', setting: 'chewing' },
                    cockVore: { label: 'Cock Vore', sfwLabel: 'Capture', icon: '🍆', validate: (a, t) => App.settings.cockVoreEnabled && a.parts === 'cock' && App._canFitPrey(a, t, 'balls'), execute: 'cockVore', setting: 'cockVoreEnabled' },
                    unbirth: { label: 'Unbirth', sfwLabel: 'Engulf', icon: '🔮', validate: (a, t) => App.settings.unbirthEnabled && a.parts === 'clit' && App._canFitPrey(a, t, 'womb'), execute: 'unbirth', setting: 'unbirthEnabled' },
                    digest: { label: 'Digest', sfwLabel: 'Break Down', icon: '💀', validate: (a, t) => a.stomach && a.stomach.some(p => p.alive && p.inStomach), execute: 'digestPrey', setting: null },
                    release: { label: 'Release', sfwLabel: 'Free', icon: '⬆️', validate: (a, t) => a.stomach && a.stomach.some(p => p.alive && p.inStomach), execute: 'releasePrey', setting: null }
                },
                feed: {
                    heal: { label: 'Heal', sfwLabel: 'Tend', icon: '💚', validate: (a, t) => t.CPun < t.MPun, execute: 'healAlly', setting: null },
                    breastfeed: { label: 'Breastfeed', sfwLabel: 'Nurse', icon: '🥛', validate: (a, t) => a.lactating && !a.lactationCooldown, execute: 'breastfeed', setting: null },
                    sacrifice: { label: 'Sacrifice', sfwLabel: 'Offer', icon: '🐄', validate: (a, t) => (t.livestock || t.willingPrey) && a.size >= t.size - 2 && App._canFitPrey(a, t, 'stomach'), execute: 'sacrificeTo', setting: null },
                    forceFeed: { label: 'Force Feed', sfwLabel: 'Force Feed', icon: '🔗', validate: (a, t, h) => App.settings.forcedFeeding && h && h.length > 0 && a.size >= t.size - 2 && App._canFitPrey(a, t, 'stomach'), execute: 'forceFeed', setting: 'forcedFeeding' },
                    slurp: { label: 'Slurp', sfwLabel: 'Draw', icon: '💧', validate: (a, t) => t.slurpable, execute: 'slurpPortion', setting: null },
                    fragment: { label: 'Break Off', sfwLabel: 'Chip', icon: '🍫', validate: (a, t) => t.breakable, execute: 'fragmentPortion', setting: null }
                },
                fight: {
                    attack: { label: 'Attack', sfwLabel: 'Attack', icon: '⚔️', validate: () => true, execute: 'attack', setting: null },
                    disarm: { label: 'Disarm', sfwLabel: 'Disarm', icon: '🗡️', validate: (a, t) => a.Figh > t.Figh, execute: 'disarm', setting: null },
                    grapple: { label: 'Grapple', sfwLabel: 'Grapple', icon: '🤼', validate: (a, t) => a.str > t.spd, execute: 'grapple', setting: null }
                },
                fuck: {
                    seduce: { label: 'Seduce', sfwLabel: 'Charm', icon: '💕', validate: () => true, execute: 'seduce', setting: null },
                    dominate: { label: 'Dominate', sfwLabel: 'Overpower', icon: '⛓️', validate: (a, t) => App.settings.powerDynamics && a.Fuck > t.Fuck, execute: 'dominate', setting: 'powerDynamics' },
                    submit: { label: 'Submit', sfwLabel: 'Yield', icon: '🙇', validate: (a, t) => App.settings.powerDynamics && a.Fuck < t.Fuck, execute: 'submit', setting: 'powerDynamics' }
                },
                flirt: {
                    tease: { label: 'Tease', sfwLabel: 'Tease', icon: '😘', validate: () => true, execute: 'tease', setting: null },
                    gift: { label: 'Gift', sfwLabel: 'Gift', icon: '🎁', validate: (a) => a.inventory && a.inventory.length > 0, execute: 'gift', setting: null },
                    dance: { label: 'Dance', sfwLabel: 'Dance', icon: '💃', validate: () => true, execute: 'dance', setting: null }
                },
                flee: {
                    run: { label: 'Run', sfwLabel: 'Flee', icon: '🏃', validate: () => true, execute: 'run', setting: null },
                    retreat: { label: 'Retreat', sfwLabel: 'Retreat', icon: '🛡️', validate: (a, t) => a.party && a.party.length > 1, execute: 'retreatCover', setting: null },
                    surrender: { label: 'Surrender', sfwLabel: 'Surrender', icon: '🏳️', validate: () => true, execute: 'surrender', setting: null }
                }
            },
            defaultSubActions: { feast: 'swallow', feed: 'heal', fight: 'attack', fuck: 'seduce', flirt: 'tease', flee: 'run' },
            _getDefaultSubAction(action) {
                return this.defaultSubActions[action] || action;
            },
            _getAvailableSubActions(action, actor, target) {
                const subDefs = this.SUB_ACTIONS[action];
                if (!subDefs) return [];
                const holder = this.party.filter(p => p !== actor && p !== target && p.CPun > 0);
                return Object.entries(subDefs).map(([id, def]) => ({
                    id, label: this._getActionLabel(action, id),
                    icon: def.icon, available: this._isSubActionAvailable(def, actor, target, holder),
                    setting: def.setting
                }));
            },
            _isSubActionAvailable(def, actor, target, holder = []) {
                if (!def || typeof def.validate !== 'function') return false;
                try {
                    return !!def.validate(actor, target, holder);
                } catch (error) {
                    return false;
                }
            },
            _getActionLabel(action, subAction) {
                const isSFW = CONTENT.preferences.maxTier < 2;
                const subDefs = this.SUB_ACTIONS[action];
                if (!subDefs || !subDefs[subAction]) return subAction;
                return isSFW ? (subDefs[subAction].sfwLabel || subDefs[subAction].label) : subDefs[subAction].label;
            },
            _getPrimaryLabel(action) {
                const isSFW = CONTENT.preferences.maxTier < 2;
                if (isSFW) {
                    const safeKey = `action.${action}.sfw`;
                    const safeLabel = this._t(safeKey);
                    if (safeLabel !== safeKey) return safeLabel;
                }
                const labelKey = `action.${action}`;
                const label = this._t(labelKey);
                return label === labelKey ? action : label;
            },
            _t(key, vars = {}) {
                return CONTENT?.t ? CONTENT.t(key, vars) : key;
            },
            _label(key, fallback, vars = {}) {
                const label = this._t(key, vars);
                return label === key ? String(fallback ?? '').replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '') : label;
            },
            _uiLabel(key) {
                const isSFW = CONTENT.preferences.maxTier < 2;
                if (isSFW) {
                    const safeKey = `action.${key}.sfw`;
                    const safeLabel = this._t(safeKey);
                    if (safeLabel !== safeKey) return safeLabel;
                }
                const labelKey = `action.${key}`;
                const label = this._t(labelKey);
                return label === labelKey ? (this.UI_LABELS[key] || key) : label;
            },
            _unitKey(unit) {
                return String(unit?.id || unit?.name || '').replace(/'/g, "\\'");
            },
            _actorNameAndVerb(actor) {
                const isPlayer = actor && actor.name === this.player?.name;
                return { actorName: isPlayer ? this._label('party.you', 'You') : actor?.name || 'Someone', actorVerb: isPlayer ? '' : 's' };
            },
            _iconActionButton(key, icon, onclick, extraClass = '') {
                const label = this._uiLabel(key);
                const className = `action-btn${extraClass ? ' ' + extraClass : ''}`;
                return `<button class="${className}" title="${label}" aria-label="${label}" onclick="${onclick}"><span class="action-icon" aria-hidden="true">${icon}</span><span class="action-caption">${label}</span></button>`;
            },
            _combatIntentButton(key, actor, extraClass = '') {
                const actorId = actor ? this._unitSelectionId(actor) : '';
                const isSelected = this.targetSelection?.source === 'combat'
                    && this.targetSelection.action === key
                    && (!this.targetSelection.actorId || this.targetSelection.actorId === actorId || this.targetSelection.actorId === actor?.id || this.targetSelection.actorId === actor?.name);
                const classes = [extraClass, isSelected ? 'selected' : ''].filter(Boolean).join(' ');
                return this._iconActionButton(key, this._actionIcon(key), `event.stopPropagation();App.executeCombatIntent('${key}')`, classes);
            },
            _actionLegend(keys) {
                if (keys.length <= 1) return '';
                return `<div class="action-legend" aria-label="${this._escapeHtml(this._label('ui.actionLegend', 'Action legend'))}">${keys.map(key => `<span><span aria-hidden="true">${this._actionIcon(key)}</span> ${this._uiLabel(key)}</span>`).join('')}</div>`;
            },
            applyStaticLocalization(root = document) {
                if (!root || !root.querySelectorAll) return;
                root.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (!key) return;
                    el.textContent = this._label(key, el.textContent || '');
                });
                root.querySelectorAll('[data-i18n-title]').forEach(el => {
                    const key = el.getAttribute('data-i18n-title');
                    if (!key) return;
                    el.setAttribute('title', this._label(key, el.getAttribute('title') || ''));
                });
                root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
                    const key = el.getAttribute('data-i18n-aria-label');
                    if (!key) return;
                    el.setAttribute('aria-label', this._label(key, el.getAttribute('aria-label') || ''));
                });
                root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                    const key = el.getAttribute('data-i18n-placeholder');
                    if (!key) return;
                    el.setAttribute('placeholder', this._label(key, el.getAttribute('placeholder') || ''));
                });
            },
            _actionIcon(key) {
                return { fight: '⚔️', flirt: '😘', feast: '🍽️', fuck: '🔥', feed: '🍲', flee: '🏃', search: '🔍', rest: '🏕️', inventory: '🎒', stats: '📊', quests: '📜', interact: '💋', inspect: '👁️', recruit: '💕', close: '', enter: '🚪', exit: '↩️', map: '🗺️', party: '👥', enemies: '⚔️' }[key] || '';
            },
            _isNight(hour = this.timeHour) {
                const normalized = ((hour % 24) + 24) % 24;
                return normalized >= 20 || normalized < 6;
            },
            _timeLabel() {
                const hour = ((this.timeHour % 24) + 24) % 24;
                return `${this._isNight(hour) ? '🌙' : '☀️'} ${String(hour).padStart(2, '0')}:00`;
            },
            _renderTime() {
                const label = this._timeLabel();
                ['time-display', 'mobile-time-display'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = label;
                });
            },
            _advanceTime(hours = 1) {
                const current = ((this.timeHour || 0) % 24 + 24) % 24;
                const nextTotal = current + hours;
                this.timeHour = ((nextTotal % 24) + 24) % 24;
                if (hours > 0) this.dayCount = (this.dayCount || 0) + Math.floor(nextTotal / 24);
                this._renderTime();
            },
            _partyHasDarkvision() {
                return this.party.some(unit => unit && unit.CPun > 0 && unit.darkvision);
            },
            _partyRoleCount(role) {
                return (this.party || []).filter(unit => unit && unit !== this.player && unit.CPun > 0 && this._getPartyRole(unit) === role).length;
            },
            _partyRoleEffect(role, amount = 1, cap = Infinity) {
                return Math.min(cap, this._partyRoleCount(role) * amount);
            },
            _mapVisibilityRadius() {
                if (!this._isNight() || this._partyHasDarkvision()) return this.DAY_VISIBILITY_RADIUS;
                const scoutBonus = this._partyRoleEffect('scout', this.NIGHT_VISIBILITY_PENALTY, this.NIGHT_VISIBILITY_PENALTY);
                return Math.max(1, this.DAY_VISIBILITY_RADIUS - this.NIGHT_VISIBILITY_PENALTY + scoutBonus);
            },
            _isNocturnalSpecies(sid) {
                return this.NOCTURNAL_SPECIES.includes(sid) || Boolean(this.SPECIES_TEMPERAMENT[sid]?.nocturnal);
            },
            _isDiurnalSpecies(sid) {
                return this.DIURNAL_SPECIES.includes(sid);
            },
            _timeAdjustedEncounterTable(table) {
                if (!this._isNight() || !Array.isArray(table)) return table;
                return table.map(entry => {
                    if (typeof entry === 'string') {
                        if (this._isNocturnalSpecies(entry)) return { id: entry, weight: 15 };
                        if (this._isDiurnalSpecies(entry)) return { id: entry, weight: 2 };
                        return { id: entry, weight: 10 };
                    }
                    let weight = entry.weight || 10;
                    if (this._isNocturnalSpecies(entry.id)) weight *= 1.5;
                    if (this._isDiurnalSpecies(entry.id)) weight *= 0.2;
                    return { ...entry, weight: Math.max(1, Math.round(weight)) };
                });
            },
            _applyTimeOfDayToCreature(creature) {
                if (!creature || !this._isNight() || !this._isDiurnalSpecies(creature.species)) return creature;
                creature.status = creature.status || {};
                creature.status.sleep = creature.status.sleep || { turns: 2 };
                creature.asleep = true;
                return creature;
            },
            _contextActionKeys() {
                const keys = ['inventory'];
                if ((this.quests || []).length > 0) keys.push('quests');
                if (this.inInterior) keys.unshift('exit');
                else if (this._currentExplorationTile()?.structure) keys.unshift('enter');
                if (this._canRestHere()) keys.unshift('rest');
                return keys;
            },
            _contextActionButton(key) {
                const handlers = {
                    rest: 'App.rest()',
                    inventory: 'App.showInventory()',
                    quests: 'App.showQuestLog()',
                    stats: 'App.showCharacterStats()',
                    enter: 'App.enterStructure()',
                    exit: 'App.exitStructure()',
                    map: "togglePanel('map')",
                    party: "togglePanel('party')",
                    enemies: "togglePanel('enemies')"
                };
                return this._iconActionButton(key, this._actionIcon(key), handlers[key] || '');
            },
            _renderContextActions(includePanels = false) {
                const keys = this._contextActionKeys();
                const panelKeys = includePanels ? ['stats', 'map', 'party', 'enemies'] : [];
                const allKeys = [...keys, ...panelKeys];
                return allKeys.map(key => this._contextActionButton(key)).join('');
            },
            _buildInteractionCommand(context = {}) {
                const mode = context.mode || (this.combatState?.active ? 'combat' : 'adventure');
                const actors = context.actors || (mode === 'combat'
                    ? [context.actor || this.activeActor || this._currentCombatActor()].filter(Boolean)
                    : this._getExplorationActors());
                const targets = context.targets || (mode === 'combat'
                    ? [context.target].filter(Boolean)
                    : this._getExplorationTargets());
                const targetTypes = new Set(targets.map(target => this.party.includes(target) ? 'party' : (target.disposition === this.DISPOSITION.ENEMY ? 'enemy' : 'creature')));
                return {
                    mode,
                    actorIds: actors.map(actor => actor?.id || actor?.name).filter(Boolean),
                    targetIds: targets.map(target => target?.id || target?.name).filter(Boolean),
                    targetType: targetTypes.size > 1 ? 'mixed' : ([...targetTypes][0] || context.targetType || null),
                    action: context.action || null,
                    subAction: context.subAction || null,
                    source: context.source || 'panel-card',
                    timing: context.timing || 'immediate',
                    resolveAt: context.resolveAt || null,
                    constraints: context.constraints || {},
                    actors,
                    targets
                };
            },
            _validateInteractionCommand(command) {
                if (!command || !command.action) return { ok: false, reason: 'missing-action' };
                if (!command.actors?.length) return { ok: false, reason: 'missing-actor' };
                if (['fight', 'flirt', 'fuck', 'feast', 'feed', 'inspect'].includes(command.action) && !command.targets?.length && command.mode !== 'combat') {
                    return { ok: false, reason: 'missing-target' };
                }
                if (command.mode === 'combat') {
                    const current = this._currentCombatActor() || this.activeActor || command.actors[0];
                    const actor = command.actors[0];
                    if (!current || !actor || this._unitSelectionId(current) !== this._unitSelectionId(actor)) return { ok: false, reason: 'not-current-actor' };
                    if (command.targets?.length && ['fight', 'flirt', 'fuck', 'feast'].includes(command.action)) {
                        const target = command.targets[0];
                        if (!target || target.CPun <= 0 || target.disposition !== this.DISPOSITION.ENEMY) return { ok: false, reason: 'invalid-combat-target' };
                        if (!this._canReachCombatTarget(actor, target, command.action)) return { ok: false, reason: 'cannot-reach' };
                    }
                }
                return { ok: true };
            },
            _dispatchInteractionCommand(command) {
                const valid = this._validateInteractionCommand(command);
                if (!valid.ok) return false;
                this.lastIntentCommand = {
                    actorIds: command.actorIds,
                    action: command.action,
                    subAction: command.subAction,
                    targetIds: command.targetIds,
                    targetType: command.targetType,
                    source: command.source,
                    mode: command.mode,
                    timing: command.timing
                };
                if (command.mode === 'combat') {
                    if (command.timing === 'queued') return this.queueSyncAction(command.action, command.targets?.[0]);
                    if (command.targets?.length) return this.executeActionAgainstTarget(command.action, command.actors[0], command.targets[0]);
                    return this.executeCombatIntent(command.action, command.actors[0]);
                }
                return this.resolveExplorationTargetAction(command.action, command.subAction, command.source);
            },
            _clearTransientInteractionState() {
                this.targetSelection = null;
                this.syncSelection = null;
                this._syncSelected = [];
                this._syncParticipants = null;
                this._syncType = null;
            },
            _panelInteractionTrayTitle(mode) {
                return mode === 'combat'
                    ? this._label('combat.panelActions', 'Combat actions')
                    : this._label('target.selectedSummary', 'Selected exploration targets');
            },
            _renderPanelInteractionTray(mode = this.combatState?.active ? 'combat' : 'adventure') {
                if (mode === 'combat') return this._renderCombatPanelTray();
                return this._renderExplorationTargetActions('panel-tray');
            },
            _renderCombatPanelTray() {
                if (!this.combatState?.active) return '';
                const actor = this.activeActor || this._currentCombatActor();
                const label = this._escapeHtml(this._panelInteractionTrayTitle('combat'));
                if (this.syncSelection?.active) {
                    const clearLabel = this._escapeHtml(this._label('ui.cancel', 'Cancel'));
                    if (this.syncSelection.phase === 'choose') {
                        const title = this._escapeHtml(this._label('combat.sync.chooseAction', 'Choose Sync Action'));
                        const syncButton = (type, icon, key, fallback) => {
                            const buttonLabel = this._escapeHtml(this._label(key, fallback));
                            return `<button class="action-btn" title="${buttonLabel}" aria-label="${buttonLabel}" onclick="App.selectSyncParticipants('${type}')">${icon} ${buttonLabel}</button>`;
                        };
                        return `<div class="panel-interaction-tray combat-sync-tray" role="region" aria-label="${label}"><div class="selected-target-summary"><span>${title}</span><span>${this._escapeHtml(actor?.name || '')}</span></div><div class="target-action-row">${syncButton('sync_fight', '⚔️', 'combat.sync.action.fight', 'Group Fight')}${syncButton('sync_flirt', '😘', 'combat.sync.action.flirt', 'Group Flirt')}${syncButton('sync_fuck', '🔥', 'combat.sync.action.fuck', 'Group Seduce')}${syncButton('sync_feed', '🍽️', 'combat.sync.action.feed', 'Group Feed')}<button class="action-btn" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button></div></div>`;
                    }
                    const participants = this._syncSelectedParticipants();
                    const names = participants.map(unit => unit.name).join(', ') || (actor?.name || '');
                    const needMore = participants.length < 2;
                    const message = needMore
                        ? this._label('combat.sync.needParticipants', 'Need at least 2 participants for a sync action.')
                        : this._label('combat.sync.selectTarget', 'Select sync target');
                    return `<div class="panel-interaction-tray combat-sync-tray" role="status" aria-label="${label}"><div class="selected-target-summary"><span>${this._escapeHtml(this._label('target.actors', 'Actors'))}: ${this._escapeHtml(names)}</span><span>${this._escapeHtml(message)}</span></div><button class="action-btn" title="${clearLabel}" aria-label="${clearLabel}" onclick="App.cancelTargetSelection()">${clearLabel}</button></div>`;
                }
                return '';
            },
            _syncSelectedParticipants() {
                if (!this.syncSelection?.active) return [];
                const ids = this.syncSelection.participantIds || [];
                return ids.map(id => this.party.find(unit => this._unitSelectionId(unit) === id || unit.id === id || unit.name === id)).filter(Boolean);
            },
            _isSyncParticipant(unit) {
                if (!unit || !this.syncSelection?.active) return false;
                const id = this._unitSelectionId(unit);
                return (this.syncSelection.participantIds || []).includes(id);
            },
            _toggleSyncParticipantById(id) {
                if (!this.syncSelection?.active || this.syncSelection.phase !== 'participants') return false;
                const participantIds = this.syncSelection.participantIds || [];
                const actorId = this.syncSelection.actorId;
                if (id === actorId) return false;
                this.syncSelection.participantIds = participantIds.includes(id)
                    ? participantIds.filter(existing => existing !== id)
                    : [...participantIds, id];
                this._syncSelected = this.syncSelection.participantIds
                    .map(pid => this.party.find(unit => this._unitSelectionId(unit) === pid))
                    .map(unit => this.party.indexOf(unit))
                    .filter(index => index >= 0);
                this.renderParty();
                this.renderCreatures();
                this.renderMobileCombatToolbelt();
                return true;
            },
            _syncParticipantButton(unit, compact = false) {
                if (!this.syncSelection?.active || this.syncSelection.phase !== 'participants' || !unit || unit.CPun <= 0) return '';
                const id = this._unitSelectionId(unit);
                const selected = this._isSyncParticipant(unit);
                const actorLocked = id === this.syncSelection.actorId;
                const label = actorLocked
                    ? this._label('target.actorRole', 'Actor')
                    : (selected ? this._label('target.targetRole', 'Target') : this._label('combat.sync.selectParticipants', 'Select participants for sync'));
                const title = this._escapeHtml(this._label('combat.sync.selectParticipantFor', 'Select {name} for sync', { name: unit.name || 'ally' }));
                const disabled = actorLocked ? ' disabled' : '';
                return `<button class="action-btn${selected ? ' primary' : ''}" title="${title}" aria-label="${title}"${disabled} onclick="event.stopPropagation();App._toggleSyncParticipantById('${String(id).replace(/'/g, "\\'")}')">${this._escapeHtml(compact ? (selected ? '✓' : '+') : label)}</button>`;
            },
            _isCurrentCombatActor(unit) {
                if (!unit || !this.combatState?.active) return false;
                const actor = this.activeActor || this._currentCombatActor();
                if (!actor) return false;
                return actor === unit || this._unitSelectionId(actor) === this._unitSelectionId(unit);
            },
            _renderCombatPanelPrompt(actor = this.activeActor || this._currentCombatActor()) {
                return '';
            },
            _combatActionButtons(actor, options = {}) {
                if (!this.combatState?.active || !actor || !(actor === this.player || this.party.includes(actor))) return '';
                if (!this._isCurrentCombatActor(actor)) return '';
                const compact = Boolean(options.compact);
                const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                const allies = this.party.filter(p => p.CPun > 0 && p.name !== actor.name);
                const buttons = [];
                if (this.cheats.overpowered && actor?.name === this.player?.name) {
                    const instantWinLabel = this._escapeHtml(this._label('combat.instantWin', 'Instant Win'));
                    const instantWinTitle = this._escapeHtml(this._label('combat.instantWinTitle', 'Instantly defeat all enemies'));
                    buttons.push(`<button class="action-btn" style="background:var(--accent-warning);color:var(--bg-primary);" title="${instantWinTitle}" aria-label="${instantWinTitle}" onclick="event.stopPropagation();App.instantWin()">⚡ ${instantWinLabel}</button>`);
                }
                if (enemies.length > 0) {
                    buttons.push(this._combatIntentButton('fight', actor, 'primary'));
                    buttons.push(this._combatIntentButton('flirt', actor));
                    buttons.push(this._combatIntentButton('feast', actor));
                    buttons.push(this._combatIntentButton('fuck', actor));
                }
                if (allies.length > 0) {
                    buttons.push(this._iconActionButton('feed', this._actionIcon('feed'), "event.stopPropagation();App.executeCombatIntent('feed')"));
                }
                if (enemies.length > 0) {
                    buttons.push(this._iconActionButton('sync', '👥', "event.stopPropagation();App.executeCombatIntent('sync')"));
                    const moveRowLabel = this._escapeHtml(this._label('action.moveRow', 'Move Row'));
                    buttons.push(`<button class="action-btn" title="${moveRowLabel}" aria-label="${moveRowLabel}" onclick="event.stopPropagation();App.executeCombatIntent('moveRow')">↕️ ${moveRowLabel}</button>`);
                }
                if (actor?.name === this.player?.name) {
                    buttons.push(this._iconActionButton('flee', this._actionIcon('flee'), "event.stopPropagation();App.executeCombatIntent('flee')"));
                } else {
                    buttons.push(this._iconActionButton('skip', '', "event.stopPropagation();App.executeCombatIntent('skip')"));
                }
                if (buttons.length === 0) return '';
                const label = this._escapeHtml(this._label('combat.panelActions', 'Combat actions'));
                const compactClass = compact ? ' compact' : '';
                return `<div class="unit-actions unit-combat-actions${compactClass}" aria-label="${label}">${buttons.join('')}</div>`;
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
                const override = this.SPECIES_CANON[sid] || {};
                return {
                    ...this.DEFAULT_SPECIES_CANON,
                    ...override,
                    interactionEligibility: {
                        ...(this.DEFAULT_SPECIES_CANON.interactionEligibility || {}),
                        ...(override.interactionEligibility || {})
                    },
                    traits: [...new Set([...(this.DEFAULT_SPECIES_CANON.traits || []), ...(override.traits || [])])]
                };
            },
            _applySpeciesCanon(unit) {
                if (!unit) return unit;
                const canon = this._speciesCanon(unit.species || 'human');
                unit.sapience = unit.sapience || canon.sapience;
                unit.bodyPlan = unit.bodyPlan || canon.bodyPlan;
                unit.baselineInteraction = unit.baselineInteraction || canon.baselineInteraction;
                unit.interactionEligibility = {
                    ...(canon.interactionEligibility || {}),
                    ...(unit.interactionEligibility || {})
                };
                unit.modOnlyAnimal = unit.modOnlyAnimal ?? canon.modOnlyAnimal;
                unit.speciesTraits = [...new Set([...(unit.speciesTraits || []), ...(canon.traits || [])])];
                return unit;
            },
            _hasBaselineInteractionEligibility(unit, interaction = 'social') {
                if (!unit || this._isCorpse(unit)) return false;
                const canon = this._speciesCanon(unit.species || 'human');
                const eligibility = {
                    ...(canon.interactionEligibility || {}),
                    ...(unit.interactionEligibility || {})
                };
                const sapience = unit.sapience || canon.sapience;
                const bodyPlan = unit.bodyPlan || canon.bodyPlan;
                const baselineInteraction = unit.baselineInteraction || canon.baselineInteraction;
                const speciesTraits = [...new Set([...(canon.traits || []), ...(unit.speciesTraits || [])])];
                if (eligibility[interaction] === false) return false;
                if (unit.modOnlyAnimal || sapience === 'animal' || bodyPlan === 'animal') return false;
                return baselineInteraction === 'sapient' || sapience === 'person' || sapience === 'spirit' || speciesTraits.includes('person');
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
            _saveTimeKey(slotName) { return this.storageKeys.saveTimePrefix + slotName; },
            _legacySaveTimeKey(slotName) { return this.legacyStorageKeys.saveTimePrefix + slotName; },
            _getStoredValue(keyName) {
                return localStorage.getItem(this.storageKeys[keyName]) ?? localStorage.getItem(this.legacyStorageKeys[keyName]);
            },
            _setStoredValue(keyName, value) {
                localStorage.setItem(this.storageKeys[keyName], value);
            },
            _removeStoredValue(keyName) {
                localStorage.removeItem(this.storageKeys[keyName]);
                localStorage.removeItem(this.legacyStorageKeys[keyName]);
            },
            _getSaveTime(slotName) {
                return localStorage.getItem(this._saveTimeKey(slotName)) || localStorage.getItem(this._legacySaveTimeKey(slotName)) || '0';
            },
            _setSaveTime(slotName, value) {
                localStorage.setItem(this._saveTimeKey(slotName), value);
            },
            _removeSaveTime(slotName) {
                localStorage.removeItem(this._saveTimeKey(slotName));
                localStorage.removeItem(this._legacySaveTimeKey(slotName));
            },
            _reloadPage() {
                if (typeof location !== 'undefined' && location.reload) location.reload();
            },

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
                    for (const k of Object.keys(savedSettings)) { this.settings[k] = savedSettings[k]; }
                    const savedPrefs = JSON.parse(this._getStoredValue('contentPrefs') || '{}');
                    for (const k of Object.keys(savedPrefs)) { CONTENT.preferences[k] = savedPrefs[k]; }
                    CONTENT.preferences.maxTier = this._tierValue(CONTENT.preferences.maxTier);
                    this.enforceContentTierSettings();
                } catch(e) { console.warn('Settings load failed', e); }
                this.loadLogViewPreferences();
                this.applyAccessibilitySettings();
                this.applyStaticLocalization();
                this.updateTierButtons();
                const grid = document.getElementById('species-grid');
                if (grid) grid.innerHTML = this.species.map(s => `<div class="option-card ${s.id === 'human' ? 'selected' : ''}" data-species="${s.id}" onclick="App.selectSpecies('${s.id}')"><div style="font-size:48px">${s.icon}</div><div style="font-weight:600;color:var(--text-primary)">${s.name}</div><div style="font-size:12px;color:var(--text-muted)">${s.desc}</div></div>`).join('');
                this.selectedSpecies = 'human';
                this.initBodyPartsGrid();
                this._syncEncounterPreferenceUI();
                this.showScreen('menu');
            },

            selectSpecies(id) {
                this.selectedSpecies = id;
                document.querySelectorAll('#species-grid .option-card').forEach(c => c.classList.toggle('selected', c.dataset.species === id));
                const species = this.species.find(s => s.id === id);
                const defaults = this.SPECIES_DEFAULT_PARTS[id] || [];
                this.selectedBodyParts = [...defaults];
                const info = document.getElementById('species-info');
                if (info) info.innerHTML = `<div style="font-size:48px;margin-bottom:8px">${species.icon}</div><h3>${species.name}</h3><p>${species.desc}</p><p style="color:var(--text-muted);font-size:12px;margin-top:8px">Default parts: ${defaults.length ? defaults.map(p => this.BODY_PARTS[p]?.label || p).join(', ') : 'None'}</p>`;
                // Update body parts grid to reflect defaults
                document.querySelectorAll('#body-parts-grid .option-card').forEach(c => {
                    c.classList.toggle('selected', this.selectedBodyParts.includes(c.dataset.part));
                });
            },

            _setCreateValidation(message = '') {
                const el = document.getElementById('create-validation');
                if (!el) return;
                el.textContent = message;
                el.style.display = message ? 'block' : 'none';
            },
            _setCreateOptionSelection(selector, value, datasetKey = 'value') {
                document.querySelectorAll(selector).forEach(c => {
                    c.classList.toggle('selected', c.dataset[datasetKey] === value);
                });
            },
            selectGender(g) {
                this.selectedGender = g;
                this._setCreateValidation('');
            },
            selectPart(p) {
                if (this.selectedParts.includes(p)) this.selectedParts = this.selectedParts.filter(x => x !== p);
                else this.selectedParts.push(p);
                this._setCreateValidation('');
            },
            toggleBodyPart(id) {
                if (this.selectedBodyParts.includes(id)) this.selectedBodyParts = this.selectedBodyParts.filter(x => x !== id);
                else this.selectedBodyParts.push(id);
            },
            updateAnatomyUI() {
                document.querySelectorAll('#anatomy-grid .option-card').forEach(c => {
                    const part = c.dataset.part;
                    c.classList.toggle('selected', this.selectedParts.includes(part));
                });
            },
            validateCharacterCreation() {
                const hasGender = Boolean(this.selectedGender);
                const hasPrimaryAnatomy = this.selectedParts.includes('clit') || this.selectedParts.includes('cock');
                const hasChestAnatomy = this.selectedParts.includes('tits') || this.selectedParts.includes('pecs');
                if (hasGender && hasPrimaryAnatomy && hasChestAnatomy) {
                    this._setCreateValidation('');
                    return true;
                }
                const missing = [];
                if (!hasGender) missing.push(this._label('create.validation.gender', 'choose a gender'));
                if (!hasPrimaryAnatomy) missing.push(this._label('create.validation.primaryAnatomy', 'choose a primary anatomy option'));
                if (!hasChestAnatomy) missing.push(this._label('create.validation.chestAnatomy', 'choose a chest anatomy option'));
                const message = this._label('create.validation.required', 'Before beginning, please {items}.', { items: missing.join(', ') });
                this._setCreateValidation(message);
                this.toggleAccordion(!hasGender ? 'gender' : 'anatomy');
                return false;
            },
            randomizeCharacter() {
                const genders = ['female', 'male', 'nonbinary'];
                const anatomyPresets = [
                    ['clit', 'tits'],
                    ['cock', 'pecs'],
                    ['cock', 'tits'],
                    ['clit', 'pecs'],
                    ['cock', 'clit', 'pecs'],
                    ['cock', 'clit', 'tits']
                ];
                const species = this.species[Math.floor(Math.random() * this.species.length)]?.id || 'human';
                const gender = genders[Math.floor(Math.random() * genders.length)];
                const parts = anatomyPresets[Math.floor(Math.random() * anatomyPresets.length)];
                this.selectSpecies(species);
                this.selectedGender = gender;
                this.selectedParts = [...parts];
                this._setCreateOptionSelection('#gender-grid .option-card', gender);
                this.updateAnatomyUI();
                this._setCreateValidation('');
                this.toggleAccordion('species');
            },
            toggleAccordion(id) {
                document.querySelectorAll('.accordion-section').forEach(section => {
                    const sectionId = section.dataset.accordion;
                    const body = document.getElementById('body-' + sectionId);
                    const arrow = document.getElementById('arrow-' + sectionId);
                    if (!body || !arrow) return;
                    const isSelected = sectionId === id;
                    body.style.display = isSelected ? 'block' : 'none';
                    arrow.textContent = isSelected ? '▼' : '▶';
                });
            },
            initBodyPartsGrid() {
                const grid = document.getElementById('body-parts-grid');
                if (!grid) return;
                grid.innerHTML = Object.entries(this.BODY_PARTS).map(([id, part]) =>
                    `<div class="option-card" data-part="${id}" onclick="App.toggleBodyPart('${id}');this.classList.toggle('selected');">
                        <div style="font-weight:600;color:var(--text-primary)">${part.label}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${part.desc}</div>
                    </div>`
                ).join('');
            },

            createCharacter() {
                if (!this.validateCharacterCreation()) return;
                const name = document.getElementById('char-name')?.value?.trim() || 'You';
                this.playerName = name;
                const species = this.species.find(s => s.id === this.selectedSpecies);
                const baseStats = this._getSpeciesBaseStats(this.selectedSpecies);
                const parts = [...this.selectedParts];
                const bodyParts = [...this.selectedBodyParts];
                const hasCock = parts.includes('cock');
                const hasClit = parts.includes('clit');
                const hasTits = parts.includes('tits');
                const maxPun = baseStats.MPun;
                const maxPle = baseStats.MPle;
                this.encounterPreference = this.selectedEncounterPreference || 'any';
                this.encounterWeights = this._normalizeEncounterWeights(this.selectedEncounterWeights);
                this.player = {
                    id: 'player_' + Date.now(), name: name, species: this.selectedSpecies,
                    icon: species.icon, gender: this.selectedGender,
                    identity: this.selectedGender, parts: hasCock ? 'cock' : (hasClit ? 'clit' : null),
                    chest: hasTits ? 'tits' : 'pecs', bothParts: hasCock && hasClit,
                    bodyParts: bodyParts, size: 4, appetite: 4,
                    level: 1, xp: 0, xpToNext: 100, gold: 0,
                    MPun: maxPun, CPun: maxPun, MPle: maxPle, CPle: Math.floor(maxPle * 0.5),
                    Figh: baseStats.Figh, Feas: baseStats.Feas, Flir: baseStats.Flir, Fuck: baseStats.Fuck, Flee: baseStats.Flee, Feed: baseStats.Feed,
                    str: baseStats.str, con: baseStats.con, spd: baseStats.spd, int: baseStats.int, wis: baseStats.wis, cha: baseStats.cha,
                    tags: [species.name], perks: [], stomach: [], womb: [], balls: [], cum: 0, status: {},
                    expanded: true, hero: true, ally: false, mc: true, obedient: true, willing: true
                };
                this._applySpeciesCanon(this.player);
                this._applySpeciesAbilities(this.player);
                this.party = [this.player];
                this.partyLeaderId = this._unitSelectionId(this.player);
                this.creatures = [];
                this.location = { x: 0, y: 0 };
                this.largeMapOffset = { x: 0, y: 0 };
                this.largeMapRadius = 8;
                this.timeHour = 8;
                this.dayCount = 0;
                this.log = [{ text: 'Welcome to the world, ' + name + '.', type: 'discovery' }];
                this.tileEvents = [];
                this.worldMap = new Map();
                this.exploredTiles = new Set();
                this.worldMeta = {
                    worldId: `world_${Date.now()}`,
                    seed: `${name || 'You'}:${this.selectedSpecies}:default`,
                    generatorVersion: 2,
                    mapModsHash: 'core',
                    createdAt: Date.now()
                };
                this.superPatchMap = new Map();
                this.currentBiome = 'forest';
                this.inventory = [];
                this.quests = [];
                this.mode = this.GAME_MODE.NORMAL;
                this.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
                this.targetSelection = null;
                this.activeActor = null;
                this.explorationActorIds = [this._unitSelectionId(this.player)];
                this.explorationActorId = this.explorationActorIds[0];
                this.inInterior = false;
                this.activeInterior = null;
                this.interiorLocation = { x: 0, y: 0 };
                this.exploreTile(0, 0);
                this.showScreen('game');
                this._renderTime();
                this.renderMap();
                this.renderParty();
                this.renderCreatures();
                this.renderLog();
                this.updateScene('The Beginning', 'You awaken in an unfamiliar place. The air smells of ' + this.biomes.forest.name + '.', false);
                this._addTileEvent(this._label('ui.tileEvent.arrival', 'You arrive here.'), 'move');
                this.autoSave();
            },

            _getSpeciesBaseStats(sid) {
                const defaults = {
                    human: { MPun: 100, MPle: 100, Figh: 10, Feas: 10, Flir: 10, Fuck: 10, Flee: 10, Feed: 10, hunger: 30, str: 10, con: 10, spd: 10, int: 10, wis: 10, cha: 10 },
                    wolf: { MPun: 90, MPle: 90, Figh: 14, Feas: 12, Flir: 8, Fuck: 10, Flee: 12, Feed: 12, hunger: 60, str: 14, con: 10, spd: 12, int: 8, wis: 10, cha: 8 },
                    fox: { MPun: 85, MPle: 100, Figh: 10, Feas: 10, Flir: 14, Fuck: 12, Flee: 14, Feed: 10, hunger: 40, str: 10, con: 8, spd: 14, int: 12, wis: 10, cha: 14 },
                    cat: { MPun: 80, MPle: 90, Figh: 12, Feas: 10, Flir: 12, Fuck: 10, Flee: 16, Feed: 10, hunger: 45, str: 12, con: 8, spd: 16, int: 10, wis: 10, cha: 12 },
                    dragon: { MPun: 150, MPle: 120, Figh: 18, Feas: 18, Flir: 8, Fuck: 14, Flee: 6, Feed: 18, hunger: 80, str: 18, con: 16, spd: 10, int: 12, wis: 14, cha: 8 },
                    naga: { MPun: 110, MPle: 100, Figh: 12, Feas: 16, Flir: 10, Fuck: 12, Flee: 10, Feed: 16, hunger: 50, str: 12, con: 14, spd: 10, int: 10, wis: 12, cha: 10 },
                    slime: { MPun: 80, MPle: 120, Figh: 8, Feas: 16, Flir: 10, Fuck: 18, Flee: 8, Feed: 14, hunger: 70, str: 8, con: 18, spd: 8, int: 10, wis: 10, cha: 10 },
                    harpy: { MPun: 85, MPle: 90, Figh: 10, Feas: 10, Flir: 12, Fuck: 10, Flee: 18, Feed: 10, str: 10, con: 8, spd: 18, int: 10, wis: 10, cha: 12 },
                    bunny: { MPun: 70, MPle: 100, Figh: 6, Feas: 8, Flir: 14, Fuck: 14, Flee: 20, Feed: 8, hunger: 20, str: 6, con: 6, spd: 20, int: 8, wis: 10, cha: 14 },
                    default: { MPun: 100, MPle: 100, Figh: 10, Feas: 10, Flir: 10, Fuck: 10, Flee: 10, Feed: 10, hunger: 40, str: 10, con: 10, spd: 10, int: 10, wis: 10, cha: 10 }
                };
                return defaults[sid] || defaults.default;
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
                return unit?.disposition === this.DISPOSITION.CORPSE;
            },
            _isLivingCreature(unit) {
                return Boolean(unit && !this._isCorpse(unit) && unit.CPun > 0);
            },
            _livingEnemies(list = this.creatures) {
                return list.filter(c => c.disposition === this.DISPOSITION.ENEMY && this._isLivingCreature(c));
            },
            _tileCreatures(list = []) {
                return (list || []).filter(c => this._isCorpse(c) || c.CPun > 0);
            },
            _unitSaveRef(unit) {
                return unit ? String(unit.id || unit.name || '') : '';
            },
            _findUnitBySaveRef(ref) {
                const key = String(ref || '');
                if (!key) return null;
                return [...(this.party || []), ...(this.creatures || [])].find(unit => this._unitSaveRef(unit) === key || String(unit.name || '') === key) || null;
            },
            _containerCapacity(unit, container = 'stomach') {
                const base = Math.max(1, (unit?.size || 4) + (unit?.appetite || 0));
                return container === 'stomach' ? base : Math.max(1, Math.floor(base / 2));
            },
            _containerContents(unit, container = 'stomach') {
                if (container === 'womb') return unit?.womb || [];
                if (container === 'balls') return unit?.balls || [];
                return unit?.stomach || [];
            },
            _containerUsed(unit, container = 'stomach') {
                return this._containerContents(unit, container).reduce((sum, prey) => sum + (prey.size || 1), 0);
            },
            _canFitPrey(predator, prey, container = 'stomach') {
                if (!predator || !prey) return false;
                return this._containerUsed(predator, container) + (prey.size || 1) <= this._containerCapacity(predator, container);
            },
            _capacityFailureMessage(actor, target, container = 'stomach') {
                const containerKey = container === 'womb' ? 'capacity.womb' : container === 'balls' ? 'capacity.balls' : 'capacity.stomach';
                const fallbackContainer = container === 'womb' ? 'womb' : container === 'balls' ? 'balls' : 'stomach';
                const owner = actor === this.player
                    ? this._label('capacity.owner.your', 'Your')
                    : this._label('capacity.owner.named', "{name}'s", { name: actor?.name || 'Someone' });
                return this._label('capacity.tooFull', '{owner} {container} is too full for {target}!', {
                    owner,
                    container: this._label(containerKey, fallbackContainer),
                    target: target?.name || 'target'
                });
            },
            _containerSummary(unit, container = 'stomach') {
                return `${this._containerUsed(unit, container)}/${this._containerCapacity(unit, container)}`;
            },
            _interiorKey(x = this.interiorLocation.x, y = this.interiorLocation.y) {
                return `${x},${y}`;
            },
            _currentOverworldTile() {
                return this.getTile(this.location.x, this.location.y);
            },
            _currentInteriorTile() {
                if (!this.activeInterior) return null;
                return this.activeInterior.tiles[this._interiorKey()];
            },
            _currentExplorationTile() {
                return this.inInterior ? this._currentInteriorTile() : this._currentOverworldTile();
            },
            _interiorBiomeForStructure(structureId) {
                return structureId === 'cave' || structureId === 'burrow' || structureId === 'web' || structureId === 'ruins' ? 'cave' : 'indoors';
            },
            _ensureStructureInterior(tile) {
                if (!tile || !tile.structure) return null;
                if (tile.interior && tile.interior.tiles) return tile.interior;
                const struct = this.STRUCTURES[tile.structure] || { name: tile.structure, icon: '🚪' };
                const biomeId = this._interiorBiomeForStructure(tile.structure);
                const originBiome = this.biomes[tile.biome] || this.biomes.forest;
                const featureTable = originBiome.structureTable || [];
                const tiles = {};
                for (let y = -2; y <= 2; y++) {
                    for (let x = -2; x <= 2; x++) {
                        const key = `${x},${y}`;
                        const feature = x === 0 && y === 0 ? 'exit' : featureTable[Math.abs((tile.x + x) * 17 + (tile.y + y) * 31) % Math.max(1, featureTable.length)];
                        tiles[key] = {
                            x, y, biome: biomeId, explored: x === 0 && y === 0,
                            description: `${struct.name} interior chamber.`,
                            hasLandmark: false, landmarkName: '',
                            structure: feature === 'exit' ? null : feature,
                            structureSpawned: false,
                            creatures: [], items: [], exit: x === 0 && y === 0
                        };
                    }
                }
                tile.interior = {
                    id: `interior_${tile.x}_${tile.y}_${tile.structure}`,
                    structure: tile.structure,
                    structureName: struct.name,
                    origin: { x: tile.x, y: tile.y },
                    width: 5,
                    height: 5,
                    tiles
                };
                this.persistTileDelta(tile.x, tile.y, tile);
                return tile.interior;
            },
            _canRestHere() {
                if (this.inInterior && this.activeInterior) {
                    return this.SAFE_REST_STRUCTURES.includes(this.activeInterior.structure);
                }
                const tile = this._currentOverworldTile();
                if (!tile) return false;
                return this._isRestCapableStructure(tile.structure, tile);
            },
            _isRestCapableStructure(structureId, tile = null) {
                if (!structureId) return false;
                if (this.SAFE_REST_STRUCTURES.includes(structureId)) return true;
                return structureId === 'camp' && tile?.overlays?.poi?.category === 'restSite';
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
                const source = unit || {};
                const nested = source.stats || {};
                const value = (key, fallback = 10) => source[key] ?? nested[key] ?? fallback;
                return {
                    str: value('str'),
                    con: value('con'),
                    spd: value('spd'),
                    int: value('int'),
                    wis: value('wis'),
                    cha: value('cha')
                };
            },

            _unitDisplayStats(unit) {
                const source = unit || {};
                const base = this._getSpeciesBaseStats(source.species || 'human');
                const core = this._unitCoreStats(source);
                const value = (key, fallback = 0) => source[key] ?? base[key] ?? fallback;
                return {
                    CPun: source.CPun ?? source.hp ?? source.MPun ?? source.maxHp ?? base.MPun ?? 100,
                    MPun: source.MPun ?? source.maxHp ?? base.MPun ?? 100,
                    CPle: source.CPle ?? 0,
                    MPle: source.MPle ?? base.MPle ?? 100,
                    level: source.level || 1,
                    Figh: value('Figh', core.str),
                    Feas: value('Feas', 10),
                    Flir: value('Flir', core.cha),
                    Fuck: value('Fuck', 10),
                    Flee: value('Flee', core.spd),
                    Feed: value('Feed', 10),
                    ...core
                };
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

            _emitCombatAction(action, actor, target, result) {
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
                    MODULE_SYSTEM.executeHook('onCombatAction', { action, actor, target, result, app: this }).catch(() => {});
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
                return String(this.worldMeta?.seed || 'default');
            },
            _seededNoise(...parts) {
                if (typeof WorldGen !== 'undefined') {
                    return WorldGen.hash01(this._mapSeed(), this.worldMeta?.generatorVersion || 1, parts.shift() || 'seeded', ...parts);
                }
                return 0;
            },
            _patchNoise(spx, spy) {
                return this._seededNoise('legacy-biome-region', spx, spy);
            },
            _tileKey(x, y) {
                return `${x},${y}`;
            },
            _tileDeltaStoreKey(worldId, x, y) {
                return `${worldId || this.worldMeta?.worldId || 'world_default'}:${x}:${y}`;
            },
            _cloneTileValue(value) {
                if (value == null) return value;
                if (Array.isArray(value) || typeof value === 'object') {
                    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
                }
                return value;
            },
            _regionBiomeKeys() {
                return Object.entries(this.biomes)
                    .filter(([, biome]) => (biome.role || 'region') === 'region')
                    .map(([id]) => id);
            },
            _getSuperPatchBiome(spx, spy) {
                const key = `${spx},${spy}`;
                if (this.superPatchMap.has(key)) return this.superPatchMap.get(key);
                const biomeKeys = this._regionBiomeKeys();
                const biomeId = typeof WorldGen !== 'undefined'
                    ? (WorldGen.pickWeighted(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'legacy-super-patch-biome', spx, spy, biomeKeys.map(id => ({ id, weight: id === 'grove' ? 2 : 1 }))) || 'plains')
                    : biomeKeys[Math.floor(this._patchNoise(spx, spy) * biomeKeys.length) % biomeKeys.length];
                this.superPatchMap.set(key, biomeId);
                return biomeId;
            },
            _rebuildSuperPatchMap() {
                this.superPatchMap = new Map();
                for (const [key, tile] of this.worldMap) {
                    if (tile.baseBiome || tile.biomeDelta) continue;
                    const spx = Math.floor(Math.floor(tile.x / this.PATCH_SIZE) / this.SUPER_PATCH_SIZE);
                    const spy = Math.floor(Math.floor(tile.y / this.PATCH_SIZE) / this.SUPER_PATCH_SIZE);
                    const skey = `${spx},${spy}`;
                    if (!this.superPatchMap.has(skey)) {
                        this.superPatchMap.set(skey, tile.biome);
                    }
                }
            },
            getBaseTile(x, y) {
                const generated = typeof WorldGen !== 'undefined'
                    ? WorldGen.generateBaseTile(this.worldMeta, x, y, this._regionBiomeKeys())
                    : { biome: 'plains', baseBiome: 'plains', macroBiome: 'plains', elevation: 0.5, moisture: 0.5, heat: 0.5, fertility: 0.5, dangerPressure: 0.3, regionCell: null, terrainTags: [] };
                return { x, y, ...generated, explored: false, description: '', hasLandmark: false, landmarkName: '', hostile: false, creatures: [], items: [], structure: null, structureSpawned: false };
            },
            getTileDelta(x, y) {
                return this.tileDeltas?.get(this._tileKey(x, y)) || null;
            },
            applyTileDelta(base, delta = null) {
                const tile = { ...base };
                if (delta) {
                    for (const [field, value] of Object.entries(delta)) {
                        if (field === 'x' || field === 'y') continue;
                        tile[field] = this._cloneTileValue(value);
                    }
                }
                tile.x = base.x;
                tile.y = base.y;
                tile.baseBiome = base.baseBiome || base.biome;
                if (!Array.isArray(tile.creatures)) tile.creatures = [];
                if (!Array.isArray(tile.items)) tile.items = [];
                return tile;
            },
            _tileDeltaFromEffectiveTile(tile) {
                if (!tile) return null;
                const base = this.getBaseTile(tile.x, tile.y);
                const delta = {};
                const fields = ['biome', 'explored', 'description', 'hasLandmark', 'landmarkName', 'hostile', 'creatures', 'items', 'structure', 'structureSpawned', 'structureLooted', 'interior'];
                for (const field of fields) {
                    const value = tile[field];
                    const baseValue = base[field];
                    const changed = JSON.stringify(value ?? null) !== JSON.stringify(baseValue ?? null);
                    if (changed) delta[field] = this._cloneTileValue(value);
                }
                return Object.keys(delta).length ? delta : null;
            },
            persistTileDelta(x, y, tile = null) {
                const key = this._tileKey(x, y);
                const effective = tile || this.worldMap.get(key);
                const delta = this._tileDeltaFromEffectiveTile(effective);
                if (delta) this.tileDeltas.set(key, delta);
                else this.tileDeltas.delete(key);
                return delta;
            },
            persistAllTileDeltas() {
                if (!this.tileDeltas) this.tileDeltas = new Map();
                this._syncCurrentTileCreatures();
                for (const tile of this.worldMap.values()) {
                    this.persistTileDelta(tile.x, tile.y, tile);
                }
                return this.tileDeltas;
            },
            _prepareSaveSnapshot() {
                this._syncPlayerPartyReference();
                this._normalizeExplorationSelections();
                this._syncCurrentTileCreatures();
                this.persistAllTileDeltas();
            },
            _tileDeltaRecordFromEntry(key, delta) {
                const [x, y] = key.split(',').map(Number);
                const worldId = this.worldMeta?.worldId || 'world_default';
                return {
                    key: this._tileDeltaStoreKey(worldId, x, y),
                    worldId,
                    x,
                    y,
                    delta: this._cloneTileValue(delta),
                    updatedAt: Date.now()
                };
            },
            _applyTileDeltaRecords(records = []) {
                if (!this.tileDeltas) this.tileDeltas = new Map();
                for (const record of records) {
                    if (!record || record.worldId !== this.worldMeta?.worldId) continue;
                    const key = this._tileKey(record.x, record.y);
                    this.tileDeltas.set(key, this._cloneTileValue(record.delta || {}));
                    const effective = this.applyTileDelta(this.getBaseTile(record.x, record.y), record.delta || {});
                    this.worldMap.set(key, effective);
                    if (effective.explored) this.exploredTiles.add(key);
                }
            },
            getTile(x, y) {
                const key = this._tileKey(x, y);
                if (this.worldMap.has(key)) return this.worldMap.get(key);
                const tile = this.applyTileDelta(this.getBaseTile(x, y), this.getTileDelta(x, y));
                this.worldMap.set(key, tile);
                return tile;
            },
            isExplored(x, y) { return this.exploredTiles.has(this._tileKey(x, y)); },
            exploreTile(x, y) {
                const key = this._tileKey(x, y);
                const tile = this.getTile(x, y);
                if (!tile.explored) {
                    tile.explored = true;
                    this.exploredTiles.add(key);
                    const biome = this.biomes[tile.biome];
                    const descriptions = biome.descriptions || [''];
                    const descIndex = typeof WorldGen !== 'undefined'
                        ? Math.floor(WorldGen.hash01(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'tile-description', x, y) * descriptions.length) % descriptions.length
                        : Math.abs(x * 31 + y * 17) % descriptions.length;
                    tile.description = descriptions[descIndex];
                    if (typeof WorldGen !== 'undefined' && WorldGen.chance(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'tile-landmark', x, y, 0.1)) {
                        const landmarks = { grove: ['Sacred Spring','Old Bench','Butterfly Garden'], forest: ['Ancient Tree','Fairy Ring','Hunter\'s Camp'], swamp: ['Sunken Shrine','Witch\'s Hut','Bone Pile'], plains: ['Lone Tree','Abandoned Wagon','Stone Circle'], cave: ['Crystal Chamber','Underground Lake','Collapsed Tunnel'], jungle: ['Waterfall','Hidden Pool','Rope Bridge'], beach: ['Tide Pool','Shell Ring','Wreck Marker'], cliff: ['High Overlook','Goat Trail','Wind Carved Arch'], water: ['Quiet Inlet','River Bend','Blue Spring'], dungeon: ['Sealed Door','Old Watchpost','Broken Obelisk'], manor: ['Garden Gate','Fountain Court','Old Conservatory'] };
                        const list = landmarks[tile.biome] || ['Mysterious Structure'];
                        tile.hasLandmark = true;
                        tile.landmarkName = WorldGen.pickWeighted(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'tile-landmark-name', x, y, list) || list[0];
                    }
                    if (!tile.structure && tile.overlays?.poi?.category === 'restSite') {
                        tile.structure = 'camp';
                    }
                    if (!tile.structure && typeof WorldGen !== 'undefined' && WorldGen.chance(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'tile-structure', x, y, biome.structureChance || 0)) {
                        const table = biome.structureTable || [];
                        tile.structure = WorldGen.pickWeighted(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'tile-structure-kind', x, y, table) || null;
                    }
                    this.currentBiome = tile.biome;
                    this.persistTileDelta(x, y, tile);
                }
                return tile;
            },

            enterStructure() {
                if (this.inInterior) return;
                const tile = this._currentOverworldTile();
                if (!tile || !tile.structure) {
                    this.log.push({ text: this._label('structure.noStructure', 'There is no structure to enter here.'), type: 'discovery' });
                    this.renderLog();
                    return;
                }
                tile.creatures = this._tileCreatures(this.creatures);
                tile.items = this.inventory.slice();
                this.activeInterior = this._ensureStructureInterior(tile);
                this.persistTileDelta(tile.x, tile.y, tile);
                this.clearTileBoundExplorationTargets();
                this.inInterior = true;
                this.interiorLocation = { x: 0, y: 0 };
                const room = this._currentInteriorTile();
                room.explored = true;
                this.creatures = this._tileCreatures(room.creatures || []);
                this.currentBiome = room.biome;
                this._clearTileEvents();
                const enteredText = this._label('structure.entered', 'Entered {name}.', { name: this.activeInterior.structureName });
                this.log.push({ text: enteredText, type: 'discovery' });
                this._addTileEvent(enteredText, 'discovery');
                this.updateScene(this.activeInterior.structureName, room.description, false);
                this.renderMap();
                this.renderCreatures();
                this.renderLog();
                this.renderExplorationActions();
                this.autoSave();
            },

            exitStructure() {
                if (!this.inInterior || !this.activeInterior) return;
                const room = this._currentInteriorTile();
                if (room) room.creatures = this._tileCreatures(this.creatures);
                const origin = this.activeInterior.origin;
                const tile = this.getTile(origin.x, origin.y);
                this.clearTileBoundExplorationTargets();
                this.location = { x: origin.x, y: origin.y };
                this.inInterior = false;
                this.activeInterior = null;
                this.interiorLocation = { x: 0, y: 0 };
                this.creatures = this._tileCreatures(tile.creatures || []);
                this.currentBiome = tile.biome;
                this.persistTileDelta(tile.x, tile.y, tile);
                document.getElementById('coords').textContent = `${this.location.x}, ${this.location.y}`;
                this._clearTileEvents();
                const exitedText = this._label('structure.exited', 'Exited {name}.', { name: this.STRUCTURES[tile.structure]?.name || this._label('structure.fallbackName', 'the structure') });
                this.log.push({ text: exitedText, type: 'move' });
                this._addTileEvent(exitedText, 'move');
                this.showExplorationActions();
                this.renderMap();
                this.renderCreatures();
                this.renderLog();
                this.autoSave();
            },

            moveInterior(dx, dy) {
                if (!this.activeInterior) return;
                const nx = this.interiorLocation.x + dx;
                const ny = this.interiorLocation.y + dy;
                if (Math.abs(nx) > 2 || Math.abs(ny) > 2) {
                    this.log.push({ text: this._label('structure.wallBlocked', 'A wall blocks the way.'), type: 'move' });
                    this.renderLog();
                    return;
                }
                const oldRoom = this._currentInteriorTile();
                if (oldRoom) oldRoom.creatures = this._tileCreatures(this.creatures);
                this.clearTileBoundExplorationTargets();
                this.interiorLocation = { x: nx, y: ny };
                this._advanceTime(1);
                const room = this._currentInteriorTile();
                const wasExplored = room.explored;
                room.explored = true;
                this.creatures = this._tileCreatures(room.creatures || []);
                this.currentBiome = room.biome;
                const biome = this.biomes[room.biome] || this.biomes.indoors;
                this._clearTileEvents();
                const movedInsideText = this._label('structure.movedInside', 'Moved inside {name} to {x}, {y}.', {
                    name: this.activeInterior.structureName,
                    x: nx,
                    y: ny
                });
                this.log.push({ text: movedInsideText, type: 'move' });
                this._addTileEvent(movedInsideText, 'move');
                if (!wasExplored && this._worldChance('interior-encounter', this.activeInterior.origin.x, this.activeInterior.origin.y, biome.encounterChance || 0, nx, ny)) {
                    this.spawnWildEncounter(room, false, true);
                }
                room.creatures = this._tileCreatures(this.creatures);
                this.updateScene(`${this.activeInterior.structureName} Interior`, room.description, this.combatState.active);
                this.renderMap();
                this.renderCreatures();
                this.renderLog();
                this.renderExplorationActions();
                this.autoSave();
            },

            // ===== MOVEMENT =====
            move(dx, dy) {
                if (!this.player) return;
                if (this.inInterior) {
                    this.moveInterior(dx, dy);
                    return;
                }
                if (this.mode === this.GAME_MODE.COMBAT) {
                    this.log.push({ text: this._label('log.inCombatCannotMove', 'You are in combat! Use Flee to escape.'), type: 'combat' });
                    this.renderLog();
                    return;
                }
                // Save current tile state before moving
                const oldKey = `${this.location.x},${this.location.y}`;
                const oldTile = this.worldMap.get(oldKey);
                if (oldTile) {
                    oldTile.creatures = this._tileCreatures(this.creatures);
                    oldTile.items = this.inventory.slice();
                    this.persistTileDelta(oldTile.x, oldTile.y, oldTile);
                }
                this.clearTileBoundExplorationTargets();
                this.location.x += dx; this.location.y += dy;
                this._advanceTime(1);
                this._clearTileEvents();
                document.getElementById('coords').textContent = `${this.location.x}, ${this.location.y}`;

                // Check if destination was explored BEFORE we call exploreTile (which marks it)
                const wasExplored = this.isExplored(this.location.x, this.location.y);
                const tile = this.exploreTile(this.location.x, this.location.y);
                const biome = this.biomes[tile.biome];
                const movedText = this._label('log.movedTo', 'Moved to {x}, {y} ({biome})', {
                    x: this.location.x,
                    y: this.location.y,
                    biome: biome.name
                });
                this.log.push({ text: movedText, type: 'move' });
                this._addTileEvent(movedText, 'move');
                if (tile.hasLandmark) {
                    const landmarkText = this._label('log.discoveredLandmark', 'Discovered {name}!', { name: tile.landmarkName });
                    this.log.push({ text: landmarkText, type: 'discovery' });
                    this._addTileEvent(landmarkText, 'discovery');
                }

                if (wasExplored) {
                    // Revisiting: only restore saved creatures, never spawn new ones
                    this.creatures = this._tileCreatures(tile.creatures || []);
                    const enemies = this._livingEnemies(this.creatures);
                    if (enemies.length > 0) {
                        const encounterText = `You encounter ${enemies.map(e => e.name).join(', ')}!`;
                        this.log.push({ text: encounterText, type: 'combat' });
                        this._addTileEvent(encounterText, 'combat');
                        this.startCombat(enemies);
                    } else if (this.creatures.length > 0) {
                        this.updateScene(`${biome.name} - ${tile.hasLandmark ? tile.landmarkName : 'Wilderness'}`, `You return to the ${biome.name}. ${tile.description}`, false);
                        this.renderExplorationActions();
                    }
                } else {
                    // First visit: preserve any existing tile creatures and append possible spawns
                    this.creatures = this._tileCreatures(tile.creatures || []);
                    // Try structure encounter first (guaranteed if structure present and not yet spawned)
                    if (tile.structure && !tile.structureSpawned) {
                        this.spawnStructureEncounter(tile, !wasExplored);
                    } else if (this._worldChance('tile-wild-encounter', tile.x, tile.y, biome.encounterChance || 0)) {
                        // Roll for friendly vs hostile encounter
                        this.spawnWildEncounter(tile, false, !wasExplored);
                    }
                }
                tile.creatures = this._tileCreatures(this.creatures);
                this.persistTileDelta(tile.x, tile.y, tile);
                this._updateQuestProgress('escort', { x: this.location.x, y: this.location.y });
                this._updateQuestProgress('travel', { x: this.location.x, y: this.location.y });
                if (!this.combatState.active) {
                    const restoredEnemies = this._livingEnemies(this.creatures);
                    if (restoredEnemies.length > 0) {
                        const encounterText = `You encounter ${restoredEnemies.map(e => e.name).join(', ')}!`;
                        this.log.push({ text: encounterText, type: 'combat' });
                        this._addTileEvent(encounterText, 'combat');
                        this.startCombat(restoredEnemies);
                    }
                }
                this.renderMap();
                this.renderCreatures();
                this.renderLog();
                this.autoSave();
            },

            // ===== ENCOUNTER / SPAWN =====
            _weightedPick(table) {
                if (!table || table.length === 0) return 'bunny';
                // Support both old format (array of strings) and new format (array of {id, weight})
                if (typeof table[0] === 'string') return table[Math.floor(Math.random() * table.length)];
                const total = table.reduce((sum, e) => sum + (e.weight || 10), 0);
                let roll = Math.random() * total;
                for (const entry of table) {
                    roll -= (entry.weight || 10);
                    if (roll <= 0) return entry.id;
                }
                return table[0].id;
            },
            _worldRoll(namespace, x = 0, y = 0, ...parts) {
                if (typeof WorldGen === 'undefined') return Math.random();
                return WorldGen.hash01(this._mapSeed(), this.worldMeta?.generatorVersion || 1, namespace, x, y, ...parts);
            },
            _worldChance(namespace, x, y, probability, ...parts) {
                return this._worldRoll(namespace, x, y, ...parts) < Math.max(0, Math.min(1, probability || 0));
            },
            _weightedPickWorld(table, namespace, x, y, ...parts) {
                if (!table || table.length === 0) return 'bunny';
                if (typeof WorldGen === 'undefined') return this._weightedPick(table);
                const entries = table.map(entry => typeof entry === 'string'
                    ? { id: entry, weight: 1 }
                    : { id: entry.id, weight: entry.weight || 10 });
                return WorldGen.pickWeighted(this._mapSeed(), this.worldMeta?.generatorVersion || 1, namespace, x, y, entries) || entries[0]?.id || 'bunny';
            },
            _pickWorldList(items, namespace, x = 0, y = 0, ...parts) {
                if (!Array.isArray(items) || items.length === 0) return null;
                const index = Math.floor(this._worldRoll(namespace, x, y, ...parts) * items.length) % items.length;
                return items[index];
            },
            _stableIdPart(value, fallback = 'item') {
                const raw = String(value ?? fallback).toLowerCase();
                return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
            },
            _normalizeEncounterWeights(weights = null) {
                const source = weights && typeof weights === 'object' ? weights : {};
                const normalized = {
                    female: Math.max(0, Math.min(100, Math.round(Number(source.female) || 0))),
                    male: Math.max(0, Math.min(100, Math.round(Number(source.male) || 0))),
                    nonbinary: Math.max(0, Math.min(100, Math.round(Number(source.nonbinary) || 0)))
                };
                const total = normalized.female + normalized.male + normalized.nonbinary;
                if (total <= 0) return { female: 34, male: 33, nonbinary: 33 };
                if (total === 100) return normalized;
                const scaled = {
                    female: Math.round((normalized.female / total) * 100),
                    male: Math.round((normalized.male / total) * 100),
                    nonbinary: Math.round((normalized.nonbinary / total) * 100)
                };
                const delta = 100 - (scaled.female + scaled.male + scaled.nonbinary);
                const topKey = Object.entries(scaled).sort((a, b) => b[1] - a[1])[0][0];
                scaled[topKey] += delta;
                return scaled;
            },
            _encounterPresetWeights(value) {
                if (value === 'female') return { female: 75, male: 13, nonbinary: 12 };
                if (value === 'male') return { female: 13, male: 75, nonbinary: 12 };
                if (value === 'nonbinary') return { female: 13, male: 12, nonbinary: 75 };
                return { female: 34, male: 33, nonbinary: 33 };
            },
            _encounterPreferenceFromWeights(weights = this.selectedEncounterWeights) {
                const w = this._normalizeEncounterWeights(weights);
                const values = Object.entries(w);
                const [topKey, topValue] = values.sort((a, b) => b[1] - a[1])[0];
                return topValue >= 70 ? topKey : 'any';
            },
            _setEncounterWeights(weights, preset = null) {
                this.selectedEncounterWeights = this._normalizeEncounterWeights(weights);
                this.selectedEncounterPreference = preset || this._encounterPreferenceFromWeights(this.selectedEncounterWeights);
                this._syncEncounterPreferenceUI();
            },
            _syncEncounterPreferenceUI() {
                const weights = this._normalizeEncounterWeights(this.selectedEncounterWeights);
                for (const key of ['female', 'male', 'nonbinary']) {
                    const input = document.getElementById(`encounter-weight-${key}`);
                    const output = document.getElementById(`encounter-weight-${key}-value`);
                    if (input) input.value = String(weights[key]);
                    if (output) output.textContent = `${weights[key]}%`;
                }
                document.querySelectorAll('#preference-grid .option-card').forEach(c => {
                    c.classList.toggle('selected', c.dataset.value === this.selectedEncounterPreference);
                });
            },
            setEncounterPreferencePreset(value) {
                this._setEncounterWeights(this._encounterPresetWeights(value), value);
            },
            updateEncounterWeight(key, value) {
                const weights = this._normalizeEncounterWeights(this.selectedEncounterWeights);
                const nextValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
                const others = ['female', 'male', 'nonbinary'].filter(k => k !== key);
                const remaining = 100 - nextValue;
                const otherTotal = others.reduce((sum, k) => sum + weights[k], 0);
                weights[key] = nextValue;
                if (otherTotal <= 0) {
                    weights[others[0]] = Math.ceil(remaining / 2);
                    weights[others[1]] = Math.floor(remaining / 2);
                } else {
                    weights[others[0]] = Math.round((weights[others[0]] / otherTotal) * remaining);
                    weights[others[1]] = remaining - weights[others[0]];
                }
                this._setEncounterWeights(weights);
            },
            _legacyEncounterWeights(preference = 'any') {
                return this._encounterPresetWeights(preference);
            },
            _pickEncounterIdentity(rollValue, weights = this.encounterWeights || this.selectedEncounterWeights) {
                const w = this._normalizeEncounterWeights(weights);
                const total = w.female + w.male + w.nonbinary;
                const pick = Math.max(0, Math.min(0.999999, rollValue)) * total;
                if (pick < w.female) return 'female';
                if (pick < w.female + w.male) return 'male';
                return 'nonbinary';
            },
            _anatomyForIdentity(identity, rollValue) {
                if (identity === 'male') return { parts: 'cock', chest: 'pecs' };
                if (identity === 'female') return { parts: 'clit', chest: 'tits' };
                return rollValue < 0.5 ? { parts: 'cock', chest: 'pecs' } : { parts: 'clit', chest: 'tits' };
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
                }
            },


            // ===== COMBAT SYSTEM =====
            startCombat(enemies) {
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
                if (!text) return '';
                return `<span ${attrs} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${this._escapeHtml(text)}</span>`;
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
                const tile = this.worldMap?.get(`${this.location.x},${this.location.y}`);
                return tile?.biome || this.currentBiome || null;
            },

            _isDenseForestBiome(biomeId = this._currentBiomeId()) {
                return biomeId === 'forest' || biomeId === 'jungle' || biomeId === 'grove';
            },

            _terrainSpeedModifier(unit, biomeId = this._currentBiomeId()) {
                let mod = 0;
                if (biomeId === 'water') mod += unit?.swimming ? 2 : -2;
                if (this._isDenseForestBiome(biomeId)) mod -= 2;
                return mod;
            },

            _terrainConModifier(unit, biomeId = this._currentBiomeId()) {
                return this._isDenseForestBiome(biomeId) ? 2 : 0;
            },

            _effectiveSpeed(unit) {
                const frozenSlow = unit?.status?.freeze?.slowTurns > 0 ? -2 : 0;
                return Math.max(1, (unit?.spd || 10) + this._terrainSpeedModifier(unit) + frozenSlow);
            },

            _effectiveCon(unit) {
                return Math.max(1, (unit?.con || 10) + this._terrainConModifier(unit));
            },

            _defaultCombatRow(unit) {
                return unit?.flying || unit?.ranged ? 'back' : 'front';
            },

            _assignCombatRows(units) {
                for (const unit of units) {
                    if (!unit || unit.CPun <= 0) continue;
                    if (unit.combatRow !== 'front' && unit.combatRow !== 'back') {
                        unit.combatRow = this._defaultCombatRow(unit);
                    }
                }
            },

            _isPhysicalCombatAction(action) {
                return action === 'fight' || action === 'feast';
            },

            _canReachCombatTarget(actor, target, action = 'fight') {
                if (!actor || !target || target.CPun <= 0) return false;
                if (!this._isPhysicalCombatAction(action)) return true;
                if (target.flying && !actor.flying && !actor.ranged && !actor.antiflying) return false;
                if (target.combatRow !== 'back') return true;
                return Boolean(actor.flying || actor.ranged || actor.antiflying);
            },

            _terrainCausesMiss(actor, target, action = 'fight') {
                if (!this._isPhysicalCombatAction(action)) return false;
                if (this._currentBiomeId() === 'cave'
                    && !actor?.darkvision
                    && this._combatStateRoll('combat-terrain-miss', actor, `${this._unitSelectionId(target)}:${action}`) < 0.5) {
                    this.log.push({ text: `${actor.name} loses the target in the cave darkness!`, type: 'combat' });
                    return true;
                }
                return false;
            },

            _applyTerrainRoundEffects(living) {
                if (this._currentBiomeId() !== 'swamp') return;
                for (const unit of living) {
                    if (!unit || unit.CPun <= 0 || unit.flying || unit.status?.stuck) continue;
                    if (this._combatStateRoll('combat-terrain-stuck', unit, 'round-effect') < 0.2) {
                        unit.status = unit.status || {};
                        unit.status.stuck = { turns: 1 };
                    }
                }
            },

            _physicalDamageMultiplier(actor, target) {
                let mult = 1;
                if (actor?.flying && target?.combatRow === 'back') mult += 0.2;
                if (actor?.combatRow === 'back' && target?.combatRow === 'front' && (actor.ranged || actor.antiflying)) mult -= 0.1;
                return Math.max(0.5, mult);
            },
            _actionRatingFromRoll(entry, roll) {
                if (entry > 55) return Math.round(entry + (roll * 21 - 10));
                if (entry > 45) return Math.round(entry + (roll * 17 - 8));
                if (entry > 35) return Math.round(entry + (roll * 13 - 6));
                if (entry > 25) return Math.round(entry + (roll * 9 - 4));
                return Math.max(1, Math.round(entry + (roll * 5 - 2)));
            },
            _combatActionRating(entry, actor, target = null, purpose = 'rating') {
                return this._actionRatingFromRoll(entry, this._combatStateRoll('combat-action-rating', actor, `${this._unitSelectionId(target || {})}:${purpose}`));
            },
            _combatDamageVariance(actor, target, purpose = 'fight', scale = 6) {
                return this._combatStateRoll('combat-damage-variance', actor, `${this._unitSelectionId(target || {})}:${purpose}`) * scale;
            },
            _explorationActionRoll(namespace, actor, target = null, purpose = 'roll') {
                const x = Number(this.location?.x ?? 0);
                const y = Number(this.location?.y ?? 0);
                return this._worldRoll(namespace, x, y, this._unitSelectionId(actor || {}), this._unitSelectionId(target || {}), this.dayCount || 0, this.timeHour || 0, purpose);
            },
            _explorationActionRating(entry, actor, target = null, purpose = 'rating') {
                return this._actionRatingFromRoll(entry, this._explorationActionRoll('exploration-action-rating', actor, target, purpose));
            },
            _explorationDamageVariance(actor, target = null, purpose = 'fight', scale = 6) {
                return this._explorationActionRoll('exploration-damage-variance', actor, target, purpose) * scale;
            },
            _targetDodgeRoll(actor, target, action = 'fight') {
                return this._combatStateRoll('combat-target-dodge', actor, `${this._unitSelectionId(target)}:${action}`);
            },

            _wakeOnDamage(unit) {
                if (unit?.status?.sleep) {
                    delete unit.status.sleep;
                    this.log.push({ text: `${unit.name} wakes from the hit!`, type: 'combat' });
                }
            },

            _skipTurnFromStatus(unit) {
                const status = unit?.status || {};
                if (status.stun?.turns > 0) {
                    status.stun.turns--;
                    if (status.stun.turns <= 0) delete status.stun;
                    return this._label('combat.status.stunned', '{name} is stunned and loses their turn!', { name: unit.name });
                }
                if (status.freeze?.skip) {
                    status.freeze.skip = false;
                    status.freeze.slowTurns = Math.max(status.freeze.slowTurns || 0, 2);
                    return this._label('combat.status.frozen', '{name} is frozen in place and loses their turn!', { name: unit.name });
                }
                if (status.sleep?.turns > 0) {
                    return this._label('combat.status.asleep', '{name} is asleep and cannot act!', { name: unit.name });
                }
	                if (status.fear?.turns > 0) {
                    if (this._hasPerkEffect('fearResist', unit)) {
                        delete status.fear;
                        return null;
                    }
	                    const lowHp = unit.CPun < unit.MPun * 0.3;
                    if (lowHp) {
                        unit.fledCombat = true;
                        return this._label('combat.status.fearFlee', '{name} panics and flees from fear!', { name: unit.name });
                    }
                    if (this._combatStateRoll('combat-fear-freeze', unit, 'skip') < 0.5) {
                        return this._label('combat.status.fearFrozen', '{name} freezes in fear and loses their turn!', { name: unit.name });
                    }
                }
                return null;
            },

            _applyAttackStatus(actor, target, dmg) {
                if (!target || target.CPun <= 0) return;
                target.status = target.status || {};
                if (actor?.bleedAttack) {
                    const bleed = target.status.bleed || { dmg: 2, turns: 3, stacks: 0 };
                    bleed.dmg = bleed.dmg || 2;
                    bleed.turns = Math.max(bleed.turns || 0, 3);
                    bleed.stacks = Math.min(5, (bleed.stacks || 0) + 1);
                    target.status.bleed = bleed;
                }
                if (actor?.burnAttack) target.status.burn = { dmg: 3, turns: 2 };
                if (actor?.freezeAttack) target.status.freeze = { skip: true, slowTurns: 2 };
                if (actor?.stunAttack) target.status.stun = { turns: 1 };
                if (actor?.sleepAttack) target.status.sleep = { turns: 3 };
                if (actor?.charmAttack) target.status.charm = { turns: 2, by: actor.name };
                if (actor?.fearAttack || actor?.menacing) target.status.fear = { turns: 2, by: actor.name };
            },

            _charmedTargetsFor(unit) {
                if (!unit?.status?.charm) return null;
                if (this._hasEquipmentEffect(unit, 'focusGuard')) {
                    delete unit.status.charm;
                    return null;
                }
                if (this.party.includes(unit)) return this.party.filter(p => p !== unit && p.CPun > 0 && !p.knockedOut);
                return this.creatures.filter(c => c !== unit && c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
            },

            moveCombatRow() {
                const actor = this.activeActor || this.player;
                if (!this.combatState.active || !actor || actor.CPun <= 0) return;
                actor.combatRow = actor.combatRow === 'back' ? 'front' : 'back';
                this._pushLog(this._label('combat.moveRowLog', '{name} moves to the {row} row.', {
                    name: actor.name,
                    row: this._combatRowLabel(actor.combatRow)
                }), 'combat', { actor, phase: 'position' });
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.nextTurn();
            },

            processTurn() {
                if (!this.combatState.active) return;
                const queue = this.combatState.turnQueue;
                if (this.combatState.currentTurn >= queue.length) {
                    this._newRound(); return;
                }
                const entry = queue[this.combatState.currentTurn];
                if (!entry) { this.nextTurn(); return; }
                const currentUnit = entry.unit || entry.unit;
                if (!currentUnit || currentUnit.CPun <= 0 || currentUnit.knockedOut || currentUnit.fledCombat) { this.nextTurn(); return; }
                // Refractory period: skip turn if recovering from orgasm
                if (currentUnit.refractory) {
                    currentUnit.refractory = false;
                    this._pushLog(this._label('combat.status.recovering', '{name} is recovering and skips their turn.', { name: currentUnit.name }), 'combat', { actor: currentUnit, phase: 'skip' });
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                // Check sync actions - if this unit is part of a sync action that resolves now, handle it
                const activeSync = this.combatState.syncActions.find(s =>
                    !s.resolved &&
                    s.round === this.combatState.round &&
                    s.resolveAtIndex === this.combatState.currentTurn &&
                    s.participants.includes(currentUnit)
                );
                if (activeSync) {
                    this._resolveSyncAction(activeSync);
                    return;
                }
                // Check victory/defeat
                const livingEnemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                const livingParty = this.party.filter(p => p.CPun > 0 && !p.knockedOut);
                if (livingEnemies.length === 0) { this.endCombat(true); return; }
                if (livingParty.length === 0) { this.endCombat(false); return; }
                // Check if unit already acted in a sync this round
                if (entry.actedThisRound) { this.nextTurn(); return; }
                const statusSkip = this._skipTurnFromStatus(currentUnit);
                if (statusSkip) {
                    this._pushLog(statusSkip, 'combat', { actor: currentUnit, phase: 'status' });
                    this.renderLog(); this.nextTurn(); return;
                }
                // Check if restrained (skip turn)
                if (currentUnit.status?.restrained && currentUnit.status.restrained.turns > 0) {
                    this._pushLog(this._label('combat.status.restrainedSkip', '{name} is restrained and cannot act!', { name: currentUnit.name }), 'combat', { actor: currentUnit, phase: 'status' });
                    this.renderLog(); this.nextTurn(); return;
                }
                if (currentUnit.status?.stuck && currentUnit.status.stuck.turns > 0) {
                    currentUnit.status.stuck.turns--;
                    if (currentUnit.status.stuck.turns <= 0) delete currentUnit.status.stuck;
                    this._pushLog(this._label('combat.status.stuck', '{name} is stuck in the terrain and loses their turn!', { name: currentUnit.name }), 'combat', { actor: currentUnit, phase: 'terrain' });
                    this.renderLog(); this.nextTurn(); return;
                }
                // Check if enveloped (skip turn, take damage)
                if (currentUnit.status?.enveloped && currentUnit.status.enveloped.turns > 0) {
                    currentUnit.CPun -= 4;
                    this._pushLog(`${currentUnit.name} is enveloped by ${currentUnit.status.enveloped.by}!`, 'combat', { actor: currentUnit, phase: 'status' });
                    if (currentUnit.CPun <= 0) { this._pushLog(`${currentUnit.name} succumbs to the envelopment!`, 'combat', { actor: currentUnit, phase: 'status' }); }
                    this.renderLog(); this.nextTurn(); return;
                }
                document.getElementById('scene-title').textContent = `Round ${this.combatState.round} - ${currentUnit.name}'s turn`;
                this.renderParty();
                this.renderCreatures();
                this.renderMobileCombatToolbelt();
                const isParty = this.party.includes(currentUnit);
                if (isParty && (currentUnit.name === this.player.name || currentUnit.obedient !== false)) {
                    this.showActorActions(currentUnit);
                } else if (isParty) {
                    this.allyTurn(currentUnit);
                } else {
                    this.enemyTurn(currentUnit);
                }
            },

            _newRound() {
                const living = [...this.party.filter(p => p.CPun > 0 && !p.knockedOut && !p.fledCombat), ...this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0)];
                this._assignCombatRows(living);
                this.combatState.turnQueue = living.map(c => ({ unit: c, initiative: this._calcInitiative(c), actedThisRound: false })).sort((a, b) => b.initiative - a.initiative);
                this.combatState.currentTurn = 0;
                this.combatState.round++;
                this._pushLog(`--- Round ${this.combatState.round} ---`, 'combat', { phase: 'round' });
                this.renderMobileCombatToolbelt();
                // Increase hunger for all combatants each round (unless Never Hungry cheat)
                for (const c of living) {
                    if (!this.cheats.neverHungry) {
                        c.hunger = Math.min(100, (c.hunger || 0) + 3);
                    }
                }
                // Process status effects first
                this._processStatusEffects();
                this._applyTerrainRoundEffects(living);
                // Per-turn digestion
                this._processDigestion();
                this._processCorpseDecay();
                this.processTurn();
            },

            _processStatusEffects() {
                const all = [...this.party, ...this.creatures];
                for (const unit of all) {
                    unit.status = unit.status || {};
                    if (unit.status.poisoned) {
                        unit.CPun -= unit.status.poisoned.dmg;
                        unit.status.poisoned.turns--;
                        if (unit.status.poisoned.turns <= 0) delete unit.status.poisoned;
                    }
                    if (unit.status.bleed) {
                        const stacks = Math.max(1, unit.status.bleed.stacks || 1);
                        unit.CPun -= (unit.status.bleed.dmg || 2) * stacks;
                        unit.status.bleed.turns--;
                        if (unit.status.bleed.turns <= 0) delete unit.status.bleed;
                    }
                    if (unit.status.burn) {
                        if (unit.status.burn.fresh) {
                            delete unit.status.burn.fresh;
                            continue;
                        }
                        unit.CPun -= unit.status.burn.dmg || 3;
                        const spreadTarget = all.find(other => other !== unit && other.CPun > 0 && !this._isCorpse(other) && !other.status?.burn && (!unit.combatRow || other.combatRow === unit.combatRow));
                        if (spreadTarget && this._combatStateRoll('combat-burn-spread', unit, this._unitSelectionId(spreadTarget)) < 0.25) {
                            spreadTarget.status = spreadTarget.status || {};
                            spreadTarget.status.burn = { dmg: 3, turns: 2, fresh: true };
                            this.log.push({ text: `${unit.name}'s burn spreads to ${spreadTarget.name}!`, type: 'combat' });
                        }
                        unit.status.burn.turns--;
                        if (unit.status.burn.turns <= 0) delete unit.status.burn;
                    }
                    if (unit.status.restrained) {
                        unit.status.restrained.turns--;
                        if (unit.status.restrained.turns <= 0) {
                            this.log.push({ text: `${unit.name} breaks free from ${unit.status.restrained.by}!`, type: 'combat' });
                            delete unit.status.restrained;
                        }
                    }
                    if (unit.status.enveloped) {
                        unit.CPun -= 4;
                        unit.status.enveloped.turns--;
                        if (unit.status.enveloped.turns <= 0) {
                            this.log.push({ text: `${unit.name} escapes the envelopment!`, type: 'combat' });
                            delete unit.status.enveloped;
                        }
                    }
                    if (unit.status.freeze?.slowTurns) {
                        unit.status.freeze.slowTurns--;
                        if (unit.status.freeze.slowTurns <= 0 && !unit.status.freeze.skip) delete unit.status.freeze;
                    }
                    if (unit.status.sleep) {
                        unit.status.sleep.turns--;
                        if (unit.status.sleep.turns <= 0) delete unit.status.sleep;
                    }
                    if (unit.status.charm) {
                        unit.status.charm.turns--;
                        if (unit.status.charm.turns <= 0) delete unit.status.charm;
                    }
                    if (unit.status.fear) {
                        unit.status.fear.turns--;
                        if (unit.status.fear.turns <= 0) delete unit.status.fear;
                    }
	                    if (unit.status.frightened) delete unit.status.frightened;
	                    if (unit !== this.player && this.party.includes(unit) && unit.CPun <= 0) {
	                        this.log.push({ text: `${unit.name} succumbs to their wounds.`, type: 'combat' });
	                        this._dropPartyCorpse(unit, 'status');
	                    }
	                }
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
                this._clearTransientInteractionState();
                this.activeActor = actor || this.player;
                const actions = document.getElementById('scene-actions');
                if (actions) actions.innerHTML = this._renderCombatPanelPrompt(this.activeActor);
                this.renderParty();
                this.renderCreatures();
                this.renderMobileCombatToolbelt();
            },

            // ===== ACTION TARGETING =====
            selectTarget(action) {
                const actor = this.activeActor || this.player;
                this.targetSelection = { action, source: 'combat', actorId: actor?.id || actor?.name || 'player' };
                const actions = document.getElementById('scene-actions');
                if (actions) actions.innerHTML = this._renderCombatPanelPrompt(actor);
                this.renderCreatures();
                this.renderParty();
                this.renderMobileCombatToolbelt();
            },

            cancelTargetSelection() {
                this._clearTransientInteractionState();
                this.renderCreatures();
                this.renderParty();
                this.renderMobileCombatToolbelt();
                if (this.combatState.active) this.showActorActions(this._currentCombatActor() || this.activeActor || this.player);
                else this.showExplorationActions();
            },

            canSelectCreatureTarget(unit) {
                if (!unit || unit.CPun <= 0) return false;
                if (this.syncSelection?.active && this.syncSelection.phase === 'target') {
                    return unit.disposition === this.DISPOSITION.ENEMY && this._syncSelectedParticipants().length >= 2;
                }
                if (!this.targetSelection) return false;
                if (this.targetSelection.source === 'combat') {
                    const actor = this.activeActor || this.player;
                    return unit.disposition === this.DISPOSITION.ENEMY && this._canReachCombatTarget(actor, unit, this.targetSelection.action);
                }
                return unit.disposition !== this.DISPOSITION.PARTY;
            },

            executeActionOnTarget(action, targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target) {
                    this.cancelTargetSelection();
                    return;
                }
                if (this.syncSelection?.active && this.syncSelection.phase === 'target') {
                    return this.queueSyncAction(this.syncSelection.type, target);
                }
                const targetIndex = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0).indexOf(target);
                if (targetIndex === -1) {
                    this.cancelTargetSelection();
                    return;
                }
                const actor = this.activeActor || this.player;
                const command = this._buildInteractionCommand({
                    mode: 'combat',
                    actors: [actor],
                    targets: [target],
                    action,
                    source: 'panel-card',
                    constraints: { requireCurrentTurn: true, hostileOnly: true, checkReach: true, checkRows: true }
                });
                const valid = this._validateInteractionCommand(command);
                if (!valid.ok) {
                    this._pushLog(this._label('combat.cannotReachTarget', '{actor} cannot reach {target} from here.', {
                        actor: actor.name,
                        target: target.name
                    }), 'combat', { actor, targetId: target.id || target.name, targetName: target.name, action, phase: valid.reason });
                    this.renderLog();
                    this.renderCreatures();
                    this.renderParty();
                    this.renderMobileCombatToolbelt();
                    return false;
                }
                this.targetSelection = null;
                this.renderMobileCombatToolbelt();
                this.executeAction(action, targetIndex);
            },

            executeAction(action, creatureIndex) {
                const target = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0)[creatureIndex];
                const actor = this.activeActor || this.player;
                this.executeActionAgainstTarget(action, actor, target);
            },

            executeActionAgainstTarget(action, actor, target) {
                this.combatState.processing = true;
                if (!target || target.CPun <= 0 || !actor) { this.combatState.processing = false; this.nextTurn(); return; }
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
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
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
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
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
                this.renderLog();
                this.renderCreatures();
                this.renderParty();
                this.combatState.processing = false;
                this._syncCurrentTileCreatures();
                this.autoSave();
                this.nextTurn();
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
                return { ...target, alive: true, inStomach: !extra.inWomb && !extra.inCock, inWomb: extra.inWomb || false, inCock: extra.inCock || false, digestionProgress: 0, digestionState: 'contained', statDrain: this._emptyStatDrain(), willingSacrifice: extra.willingSacrifice || false, forcedFed: extra.forcedFed || false, by: extra.by || null };
            },
            _emptyStatDrain() {
                return { str: 0, con: 0, spd: 0, int: 0, wis: 0, cha: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 };
            },
            _ensureStatDrain(prey) {
                prey.statDrain = { ...this._emptyStatDrain(), ...(prey.statDrain || {}) };
                return prey.statDrain;
            },
            _digestionContainerConfigs() {
                return [
                    {
                        key: 'stomach',
                        flag: 'inStomach',
                        fastRate: 5,
                        slowRate: 2,
                        stats: ['str', 'con', 'Figh'],
                        advanceContained: true,
                        fatalLog: (prey, unit) => `${prey.name} is fully digested inside ${unit.name}.`,
                        softLog: (prey, unit) => `${prey.name} is fully softened inside ${unit.name}, ready to be released or kept as endo.`
                    },
                    {
                        key: 'womb',
                        flag: 'inWomb',
                        fastRate: 3,
                        slowRate: 1,
                        stats: ['cha', 'Flir', 'Fuck'],
                        fatalLog: (prey, unit) => `${prey.name} perishes in ${unit.name}'s womb.`,
                        softLog: (prey, unit) => `${prey.name} is fully softened in ${unit.name}'s womb.`
                    },
                    {
                        key: 'balls',
                        flag: 'inCock',
                        fastRate: 3,
                        slowRate: 1,
                        stats: ['Feas', 'Fuck'],
                        fatalLog: (prey, unit) => `${prey.name} dissolves in ${unit.name}'s balls.`,
                        softLog: (prey, unit) => `${prey.name} is fully softened in ${unit.name}'s balls.`
                    }
                ];
            },
            _processDigestionContainer(unit, config) {
                for (const prey of (unit[config.key] || [])) {
                    if (!prey.alive || prey[config.flag] === false) continue;
                    prey.digestionProgress = prey.digestionProgress || 0;
                    prey.digestionState = prey.digestionState || 'contained';
                    this._ensureStatDrain(prey);
                    if (config.advanceContained && prey.digestionState === 'contained') prey.digestionState = 'digesting';
                    const rate = this.settings.slowDigestion ? config.slowRate : config.fastRate;
                    prey.digestionProgress = Math.min(100, prey.digestionProgress + rate);
                    const drain = Math.max(1, Math.floor(rate * 0.3));
                    for (const stat of config.stats) {
                        prey.statDrain[stat] += drain;
                        prey[stat] = Math.max(1, (prey[stat] || 10) - drain);
                    }
                    prey.CPun = Math.max(1, Math.floor(prey.MPun * (1 - prey.digestionProgress / 100)));
                    if (this.settings.statAbsorption) {
                        this._absorbStats(unit, rate, config.stats);
                    }
                    if (prey.digestionProgress >= 100) {
                        if (this.settings.fatalVore && !this.settings.endoMode) {
                            prey.alive = false;
                            this.log.push({ text: config.fatalLog(prey, unit), type: 'combat' });
                        } else {
                            prey.digestionState = 'digested';
                            this.log.push({ text: config.softLog(prey, unit), type: 'combat' });
                        }
                    }
                }
            },
            _processStomachState(unit) {
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
                    MODULE_SYSTEM.executeHook('onDigestionTick', { unit, app: this }).catch(() => {});
                }
                for (const config of this._digestionContainerConfigs()) {
                    this._processDigestionContainer(unit, config);
                }
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

            // ===== SYNCHRONIZED ACTIONS =====
            showSyncMenu() {
                const allies = this.party.filter(p => p.CPun > 0 && p.name !== this.player.name);
                if (allies.length === 0) {
                    this.log.push({ text: this._label('combat.sync.noAllies', 'No allies available for sync.'), type: 'combat' });
                    this.renderLog();
                    return false;
                }
                const actor = this.activeActor || this._currentCombatActor() || this.player;
                const actorId = this._unitSelectionId(actor);
                this.targetSelection = null;
                this.syncSelection = { active: true, phase: 'choose', actorId, participantIds: [actorId], type: null };
                this.renderParty();
                this.renderCreatures();
                this.renderMobileCombatToolbelt();
                return true;
            },

            selectSyncParticipants(syncType) {
                const actor = this.activeActor || this._currentCombatActor() || this.player;
                const actorId = this._unitSelectionId(actor);
                this.syncSelection = { active: true, phase: 'participants', actorId, participantIds: [actorId], type: syncType };
                this._syncSelected = [this.party.indexOf(actor)].filter(index => index >= 0);
                this.renderParty();
                this.renderCreatures();
                this.renderMobileCombatToolbelt();
            },

            toggleSyncParticipant(idx) {
                const unit = this.party[idx];
                if (!unit) return false;
                return this._toggleSyncParticipantById(this._unitSelectionId(unit));
            },

            confirmSyncParticipants(syncType) {
                if (syncType && (!this.syncSelection?.active || this.syncSelection.type !== syncType)) this.selectSyncParticipants(syncType);
                const participants = this._syncSelectedParticipants();
                if (participants.length < 2) {
                    this.log.push({ text: this._label('combat.sync.needParticipants', 'Need at least 2 participants for a sync action.'), type: 'combat' });
                    this.renderLog();
                    this.renderParty();
                    return false;
                }
                this._syncParticipants = participants;
                this._syncType = syncType || this.syncSelection?.type;
                this.syncSelection = { ...this.syncSelection, phase: 'target', type: this._syncType };
                this.renderParty();
                this.renderCreatures();
                this.renderMobileCombatToolbelt();
                return true;
            },

            queueSyncAction(syncType, targetIndex) {
                const target = typeof targetIndex === 'object'
                    ? targetIndex
                    : this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0)[targetIndex];
                if (!target) return;
                const participants = this._syncParticipants || this._syncSelectedParticipants();
                if (!participants || participants.length < 2) {
                    this.log.push({ text: this._label('combat.sync.needParticipants', 'Need at least 2 participants for a sync action.'), type: 'combat' });
                    this.renderLog();
                    return false;
                }
                // Find the slowest participant's turn position
                let slowestIdx = -1, slowestInit = Infinity;
	                for (const p of participants) {
	                    const qIdx = this.combatState.turnQueue.findIndex(q => q.unit === p);
	                    if (qIdx !== -1 && this.combatState.turnQueue[qIdx].initiative < slowestInit) {
	                        slowestInit = this.combatState.turnQueue[qIdx].initiative;
	                        slowestIdx = qIdx;
	                    }
	                }
	                this._syncCurrentTileCreatures();
	                if (slowestIdx === -1) {
	                    this.log.push({ text: this._label('combat.sync.failedNoQueue', 'Sync failed! Participants are no longer in the turn queue.'), type: 'combat' });
	                    this.renderLog();
	                    this.nextTurn();
	                    return;
	                }
                this.combatState.syncActions.push({
                    type: syncType, participants: participants, target: target,
                    resolveAtIndex: slowestIdx, resolved: false, round: this.combatState.round
                });
                this.log.push({ text: `${participants.map(p => p.name).join(', ')} prepare a ${syncType.replace('sync_', '')} on ${target.name}! Resolves when the slowest participant acts.`, type: 'combat' });
                // Mark participants as having acted (they skip their individual turns)
                for (const p of participants) {
                    const qEntry = this.combatState.turnQueue.find(q => q.unit === p);
                    if (qEntry) qEntry.actedThisRound = true;
                }
                this._clearTransientInteractionState();
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.nextTurn();
                return true;
            },

            _resolveSyncAction(sync) {
                if (sync.resolved) return;
                sync.resolved = true;
                // Check if any participant incapacitated
                const incapacitated = sync.participants.filter(p => p.CPun <= 0);
                if (incapacitated.length > 0) {
                    this.log.push({ text: this._label('combat.sync.failedIncapacitated', 'Sync failed! {names} cannot participate.', { names: incapacitated.map(p => p.name).join(', ') }), type: 'combat' });
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
                        const resist = (sync.target.wis || 10) + (sync.target.CPle / sync.target.MPle * 10);
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
                        const resist = (sync.target.wis || 10) + (sync.target.CPle / sync.target.MPle * 10);
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
                const order = unit?.aiOrder || 'aggressive';
                return this.PARTY_AI_ORDERS[order] ? order : 'aggressive';
            },
            _getPartyRole(unit) {
                const role = unit?.partyRole || 'companion';
                return this.PARTY_ROLES[role] ? role : 'companion';
            },
            _partyAIOrderLabel(order) {
                const key = this.PARTY_AI_ORDERS[order] ? order : 'aggressive';
                return this._label(`party.aiOrder.${key}`, this.PARTY_AI_ORDERS[key]);
            },
            _partyRoleLabel(role) {
                const key = this.PARTY_ROLES[role] ? role : 'companion';
                return this._label(`party.role.${key}`, this.PARTY_ROLES[key]);
            },
            _partyAIOrderDescription(order) {
                const key = this.PARTY_AI_ORDERS[order] ? order : 'aggressive';
                const fallback = {
                    aggressive: 'Prioritizes attacking reachable threats.',
                    defensive: 'Favors safer positioning and protecting allies.',
                    healer: 'Feeds the most wounded ally first.',
                    scavenger: 'Looks for corpse-feast opportunities after victory.',
                    passive: 'Avoids acting unless wounded or pressured.'
                }[key];
                return this._label(`party.aiOrderDescription.${key}`, fallback);
            },
            _partyRoleDescription(role) {
                const key = this.PARTY_ROLES[role] ? role : 'companion';
                const fallback = {
                    companion: 'No special exploration role.',
                    scout: 'Improves night visibility and route awareness.',
                    guard: 'Reduces ambush advantage and helps protect camp.',
                    support: 'Improves recovery when resting somewhere safe.',
                    gatherer: 'Improves search and foraging results.'
                }[key];
                return this._label(`party.roleDescription.${key}`, fallback);
            },
            setPartyAIOrder(index, order) {
                const unit = this.party[index];
                if (!unit || unit === this.player || !this.PARTY_AI_ORDERS[order]) return;
                unit.aiOrder = order;
                this.log.push({ text: this._label('party.aiOrderSet', '{name} will act {order}.', {
                    name: unit.name,
                    order: this._partyAIOrderLabel(order).toLowerCase()
                }), type: 'discovery' });
                this.renderParty();
                this.renderLog();
                this.autoSave();
            },
            setPartyRole(index, role) {
                const unit = this.party[index];
                if (!unit || unit === this.player || !this.PARTY_ROLES[role]) return;
                unit.partyRole = role;
                this.log.push({ text: this._label('party.roleSet', '{name} is assigned as {role}.', {
                    name: unit.name,
                    role: this._partyRoleLabel(role).toLowerCase()
                }), type: 'discovery' });
                this.renderParty();
                this.renderLog();
                this.autoSave();
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
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
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
                if (actorId) {
                    const actor = this.party.find(p => this._unitSelectionId(p) === String(actorId) && this._isLivingCreature(p));
                    return actor ? [actor] : [this.player].filter(Boolean);
                }
                const ids = this.explorationActorIds && this.explorationActorIds.length > 0
                    ? this.explorationActorIds
                    : (this.explorationActorId ? [this.explorationActorId] : []);
                const actors = ids
                    .map(id => this.party.find(p => this._unitSelectionId(p) === String(id) && this._isLivingCreature(p)))
                    .filter(Boolean);
                return actors.length > 0 ? actors : [this.player].filter(Boolean);
            },
            _getExplorationActor(actorId = null) {
                return this._getExplorationActors(actorId)[0] || this.player;
            },

            _normalizeExplorationSelections({ resetTargets = false } = {}) {
                const livingPartyIds = new Set((this.party || []).filter(unit => this._isLivingCreature(unit)).map(unit => this._unitSelectionId(unit)));
                this.explorationActorIds = (this.explorationActorIds || []).filter(id => livingPartyIds.has(String(id)));
                if (this.explorationActorIds.length === 0 && this.player) this.explorationActorIds = [this._unitSelectionId(this.player)];
                this.explorationActorId = this.explorationActorIds[0] || this._unitSelectionId(this.player);
                if (resetTargets) {
                    this.explorationTargetIds = [];
                    return;
                }
                this.explorationTargetIds = (this.explorationTargetIds || []).filter(key => this._explorationTargetFromKey(key));
            },

            clearTileBoundExplorationTargets() {
                this.explorationTargetIds = (this.explorationTargetIds || []).filter(key => String(key).startsWith('party:'));
            },

            _getPartyLeader() {
                const leader = this.party.find(p => this._unitSelectionId(p) === String(this.partyLeaderId || ''));
                return leader || this.player || this.party[0] || null;
            },

            setPartyLeader(index) {
                const unit = this.party[index];
                if (!unit) return;
                this.partyLeaderId = this._unitSelectionId(unit);
                this.log.push({ text: this._label('party.leaderSet', '{name} is now party leader.', { name: unit.name }), type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.autoSave();
            },

            movePartyMember(index, direction) {
                const targetIndex = index + direction;
                return this.reorderPartyMember(index, targetIndex);
            },

            reorderPartyMember(index, targetIndex) {
                if (index <= 0 || targetIndex <= 0 || targetIndex >= this.party.length || index === targetIndex) return false;
                const [unit] = this.party.splice(index, 1);
                this.party.splice(targetIndex, 0, unit);
                this.log.push({ text: this._label('party.positionChanged', '{name} changes party position.', { name: unit.name }), type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.autoSave();
                return true;
            },

            startPartyDrag(index) {
                if (index <= 0 || !this.party[index] || this.combatState.active) return false;
                this.draggedPartyIndex = index;
                return true;
            },

            dragPartyOver(event) {
                if (event && typeof event.preventDefault === 'function') event.preventDefault();
            },

            clearPartyDrag() {
                this.draggedPartyIndex = null;
            },

            dropPartyMember(targetIndex) {
                const draggedIndex = Number(this.draggedPartyIndex);
                this.clearPartyDrag();
                if (!Number.isInteger(draggedIndex)) return false;
                return this.reorderPartyMember(draggedIndex, targetIndex);
            },

            _dropDismissedPartyMember(unit) {
                const tile = this._currentExplorationTile();
                if (!unit || !tile) return null;
                const dismissed = this._normalizeUnit({
                    ...unit,
                    disposition: this.DISPOSITION.NEUTRAL,
                    ally: false,
                    mc: false,
                    obedient: false,
                    formerPartyMember: true,
                    formerPartyRole: this._getPartyRole(unit),
                    partyRole: 'companion'
                }, {});
                const sameUnit = candidate => this._unitSelectionId(candidate) === this._unitSelectionId(dismissed);
                this.creatures = this._tileCreatures([...(this.creatures || []).filter(candidate => !sameUnit(candidate)), dismissed]);
                tile.creatures = this._tileCreatures([...(tile.creatures || []).filter(candidate => !sameUnit(candidate)), dismissed]);
                if (this.inInterior && this.activeInterior?.origin) {
                    const origin = this.getTile(this.activeInterior.origin.x, this.activeInterior.origin.y);
                    origin.interior = this.activeInterior;
                    this.persistTileDelta(origin.x, origin.y, origin);
                } else if (Number.isFinite(Number(tile.x)) && Number.isFinite(Number(tile.y))) {
                    this.persistTileDelta(tile.x, tile.y, tile);
                }
                return dismissed;
            },

            dismissPartyMember(index) {
                const unit = this.party[index];
                if (!unit || unit === this.player || unit.mc) return;
                const confirmMessage = this._label('party.confirmDismiss', 'Dismiss {name} from the party?', { name: unit.name });
                return this.showConfirmDialog({
                    title: this._label('party.dismiss', 'Dismiss'),
                    message: confirmMessage,
                    confirmLabel: this._label('party.dismiss', 'Dismiss'),
                    cancelLabel: this._label('ui.cancel', 'Cancel'),
                    danger: true,
                    onConfirm: () => this._dismissPartyMemberConfirmed(index)
                });
            },

            _dismissPartyMemberConfirmed(index) {
                const unit = this.party[index];
                if (!unit || unit === this.player || unit.mc) return false;
                this.party.splice(index, 1);
                const dropped = this._dropDismissedPartyMember(unit);
                this._normalizeExplorationSelections();
                if (this.partyLeaderId === this._unitSelectionId(unit)) this.partyLeaderId = this._unitSelectionId(this.player);
                this.log.push({
                    text: this._label(
                        dropped ? 'party.dismissedNearby' : 'party.dismissed',
                        dropped ? '{name} leaves the party and remains nearby.' : '{name} leaves the party.',
                        { name: unit.name }
                    ),
                    type: 'discovery'
                });
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.autoSave();
                return true;
            },

            showPartyMemberStats(index) {
                const unit = this.party[index];
                if (!unit) return;
                const stats = this._unitDisplayStats(unit);
                const statusKey = this._getPartyLeader() === unit ? 'party.leader' : (unit === this.player ? 'party.you' : 'party.ally');
                const statusText = this._escapeHtml(this._label(statusKey, statusKey === 'party.leader' ? 'Leader' : statusKey === 'party.you' ? 'You' : 'Ally'));
                const levelText = this._escapeHtml(this._label('party.levelSpecies', 'Level {level} {species}', { level: stats.level, species: unit.species }));
                const closeLabel = this._escapeHtml(this._label('ui.close', 'Close'));
                const backLabel = this._escapeHtml(this._label('inventory.back', 'Back'));
                const statCard = (labelKey, fallback, body) => `<div class="option-card"><strong>${this._escapeHtml(this._label(labelKey, fallback))}</strong><br>${body}</div>`;
                const perks = (unit.perks || []).map(perk => this._escapeHtml(perk.name)).join(', ') || this._escapeHtml(this._label('party.none', 'None'));
                const html = `<div class="party-stats-view" role="region" aria-label="${this._escapeHtml(this._label('party.statsFor', 'Show stats for {name}', { name: unit.name }))}">
                    <div class="party-stats-header">
                        <div><h3>${unit.icon || ''} ${this._escapeHtml(unit.name)}</h3><p style="color:var(--text-muted);margin-top:4px">${statusText} | ${levelText}</p></div>
                        <button class="nav-btn" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeSceneDetails()">${closeLabel}</button>
                    </div>
                    <div class="party-stats-grid">
                        ${statCard('party.punishment', 'Punishment', `${stats.CPun}/${stats.MPun}`)}
                        ${statCard('party.pleasure', 'Pleasure', `${stats.CPle}/${stats.MPle}`)}
                        ${statCard('party.combat', 'Combat', `Figh ${stats.Figh} | Feas ${stats.Feas}<br>Flir ${stats.Flir} | ${this._escapeHtml(this._uiLabel('fuck'))} ${stats.Fuck}<br>Flee ${stats.Flee} | Feed ${stats.Feed}`)}
                        ${statCard('party.attributes', 'Attributes', `STR ${stats.str} | CON ${stats.con} | SPD ${stats.spd}<br>INT ${stats.int} | WIS ${stats.wis} | CHA ${stats.cha}`)}
                        ${statCard('party.capacity', 'Capacity', `${this._containerSummary(unit, 'stomach')} stomach<br>${this._containerSummary(unit, 'womb')} womb<br>${this._containerSummary(unit, 'balls')} balls`)}
                        ${statCard('party.equipment', 'Equipment', this._equipmentCompactSummary(unit))}
                        ${statCard('party.perks', 'Perks', perks)}
                    </div>
                    <div class="party-stats-footer"><button class="nav-btn" title="${backLabel}" aria-label="${backLabel}" onclick="App.closeSceneDetails()">${backLabel}</button></div></div>`;
                this._setRichSceneContent(`${unit.icon || ''} ${unit.name}`, html);
            },

            selectExplorationActor(index) {
                const actor = this.party[index];
                if (!actor || !this._isLivingCreature(actor)) return;
                const id = this._unitSelectionId(actor);
                this.explorationActorIds = this.explorationActorIds || [];
                const defaultPlayerOnly = this.explorationActorIds.length === 1 && this.explorationActorIds[0] === this._unitSelectionId(this.player);
                if (defaultPlayerOnly && actor !== this.player) {
                    this.explorationActorIds = [id];
                    this.explorationActorId = id;
                    this.renderParty();
                    this.renderCreatures();
                    this.renderExplorationActions();
                    return;
                }
                if (this.explorationActorIds.includes(id)) {
                    this.explorationActorIds = this.explorationActorIds.filter(existing => existing !== id);
                } else {
                    this.explorationActorIds.push(id);
                }
                if (this.explorationActorIds.length === 0) this.explorationActorIds = [this._unitSelectionId(this.player)];
                this.explorationActorId = this.explorationActorIds[0];
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
            },

            _explorationTargetKey(type, id) {
                return `${type}:${String(id || '')}`;
            },

            _isExplorationTarget(type, id) {
                return (this.explorationTargetIds || []).includes(this._explorationTargetKey(type, id));
            },

            _explorationTargetFromKey(key) {
                const [type, ...rest] = String(key).split(':');
                const id = rest.join(':');
                let target = null;
                if (type === 'party') target = this.party.find(unit => this._unitSelectionId(unit) === id);
                if (type === 'creature') target = this.creatures.find(unit => String(unit.id || unit.name) === id);
                return target && this._isLivingCreature(target) ? target : null;
            },

            _getExplorationTargets() {
                const ids = this.explorationTargetIds || [];
                return ids.map(key => this._explorationTargetFromKey(key)).filter(Boolean);
            },

            toggleExplorationTarget(type, id) {
                const key = this._explorationTargetKey(type, id);
                this.explorationTargetIds = this.explorationTargetIds || [];
                if (this.explorationTargetIds.includes(key)) {
                    this.explorationTargetIds = this.explorationTargetIds.filter(existing => existing !== key);
                } else {
                    this.explorationTargetIds.push(key);
                }
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
            },

            clearExplorationTargets() {
                this.explorationTargetIds = [];
                this.renderParty();
                this.renderCreatures();
                this.renderExplorationActions();
            },

            _renderExplorationTargetActions(source = 'sheet') {
                const targets = this._getExplorationTargets();
                if (targets.length === 0 || this.combatState.active) return '';
                const actors = this._getExplorationActors();
                const label = this._escapeHtml(this._t(targets.length === 1 ? 'target.count' : 'target.count_plural', { count: targets.length }));
                const actorNames = actors.map(actor => actor.name).join(', ') || 'You';
                const targetNames = targets.map(target => target.name).join(', ');
                const summary = { primaryActor: actors[0] || this.player, helperNames: actors.slice(1).map(actor => actor.name) };
                const keys = ['fight', 'flirt', 'fuck', 'feast', 'feed'];
                const buttons = keys.map(key => {
                    const title = this._escapeHtml(`${this._uiLabel(key)} ${this._t(targets.length === 1 ? 'target.count' : 'target.count_plural', { count: targets.length })}`);
                    const actionSource = source === 'desktop' ? 'desktop-target' : (source === 'panel-tray' ? 'panel-tray' : 'target-bar');
                    const defaultSubAction = this.SUB_ACTIONS[key] ? this._getDefaultSubAction(key) : null;
                    const safeSubAction = defaultSubAction ? String(defaultSubAction).replace(/'/g, "\\'") : '';
                    const handler = defaultSubAction
                        ? `App.resolveExplorationTargetAction('${key}','${safeSubAction}','${actionSource}')`
                        : `App.resolveExplorationTargetAction('${key}',null,'${actionSource}')`;
                    return `<button class="action-btn" title="${title}" aria-label="${title}" onclick="${handler}"><span class="action-icon" aria-hidden="true">${this._actionIcon(key)}</span><span class="action-caption">${this._uiLabel(key)}</span></button>`;
                }).join('');
                const clearLabel = this._escapeHtml(this._t('target.clear'));
                const clearTitle = this._escapeHtml(this._t('target.clearSelected'));
                const primaryLine = summary.primaryActor ? `<span class="selected-target-primary">${this._escapeHtml(this._label('target.primaryActor', 'Primary'))}: ${this._escapeHtml(summary.primaryActor.name || 'You')}</span>` : '';
                const helperLine = summary.helperNames?.length ? `<span class="selected-target-helpers">${this._escapeHtml(this._label('target.helpers', 'Helpers'))}: ${this._escapeHtml(summary.helperNames.join(', '))}</span>` : '';
                const content = `<div class="action-legend selected-target-summary" aria-label="${this._escapeHtml(this._label('target.selectedSummary', 'Selected exploration targets'))}"><span>${this._t('target.actors')}: ${this._escapeHtml(actorNames)}</span>${primaryLine}${helperLine}<span>${this._t('target.targets')}: ${this._escapeHtml(targetNames)}</span></div><div class="target-action-row">${buttons}<button class="action-btn" title="${clearTitle}" aria-label="${clearTitle}" onclick="App.clearExplorationTargets()">${clearLabel}</button></div>`;
                return source === 'panel-tray'
                    ? `<div class="panel-interaction-tray adventure-interaction-tray">${content}</div>`
                    : content;
            },

            openExplorationTargetSubActionSheet(action, source = 'target-bar') {
                const targets = this._getExplorationTargets();
                if (targets.length === 0 || !this.SUB_ACTIONS[action]) return this.resolveExplorationTargetAction(action, null, source);
                this.closeMobileContextMenu();
                const actor = this._getExplorationActor();
                const subActions = this._getAvailableSubActions(action, actor, targets[0]);
                const commandSource = String(source || 'target-bar').replace(/'/g, "\\'");
                const title = `${this._uiLabel(action)} ${this._t(targets.length === 1 ? 'target.count' : 'target.count_plural', { count: targets.length })}`.trim();
                const defaultSub = this._getDefaultSubAction(action);
                const defaultLabel = this._getActionLabel(action, defaultSub);
                const surface = this._intentMenuSurface(source);
                let html = `<div class="${surface.rootClass}" id="${surface.id}" role="dialog" aria-modal="true" aria-label="${this._escapeHtml(title)}" aria-labelledby="${surface.titleId}"><div class="${surface.titleClass}" id="${surface.titleId}">${this._actionIcon(action)} ${this._escapeHtml(title)}</div><div class="${surface.actionsClass}" role="menu">`;
                html += `<button class="action-btn primary" role="menuitem" title="${this._escapeHtml(defaultLabel)}" aria-label="${this._escapeHtml(defaultLabel)}" onclick="App.resolveExplorationTargetAction('${action}','${String(defaultSub).replace(/'/g, "\\'")}','${commandSource}')">${this._escapeHtml(defaultLabel)}</button>`;
                subActions.filter(sub => sub.id !== defaultSub).forEach(sub => {
                    const label = this._escapeHtml(sub.label);
                    const disabled = sub.available ? '' : ' disabled';
                    const settingHint = sub.available || !sub.setting ? '' : ` (${sub.setting})`;
                    html += `<button class="action-btn" role="menuitem" title="${label}${this._escapeHtml(settingHint)}" aria-label="${label}${this._escapeHtml(settingHint)}"${disabled} onclick="App.resolveExplorationTargetAction('${action}','${String(sub.id).replace(/'/g, "\\'")}','${commandSource}')">${sub.icon || ''} ${label}</button>`;
                });
                const closeLabel = this._escapeHtml(this._label('ui.close', 'Close'));
                html += `<button class="action-btn" role="menuitem" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeMobileContextMenu()">${closeLabel}</button>`;
                html += '</div></div>';
                document.body.insertAdjacentHTML('beforeend', html);
                const menu = document.getElementById(surface.id);
                this._activateFocusTrap(menu, { close: () => this.closeMobileContextMenu() });
                this._activateOutsideContextDismiss(menu);
            },

            resolveExplorationTargetAction(action, subAction = null, source = 'target-bar') {
                const targets = this._getExplorationTargets();
                if (targets.length === 0) return false;
                const actors = this._getExplorationActors();
                if (subAction && this.SUB_ACTIONS[action]?.[subAction]) this.defaultSubActions[action] = subAction;
                this.lastIntentCommand = {
                    actorIds: actors.map(actor => actor.id || actor.name),
                    action,
                    subAction,
                    targetIds: targets.map(target => target.id || target.name),
                    targetType: 'marked',
                    source
                };
                this.closeMobileContextMenu();
                let resolved = true;
                const options = { subAction };
                if (targets.length === 1 && actors.length > 1) {
                    resolved = this.outsideGroupActionOnTarget(action, targets[0], actors, options);
                } else if (targets.length > 1 && actors.length > 1) {
                    if (this._sameUnitSet(actors, targets)) {
                        resolved = this.outsideMutualGroupAction(action, actors, options);
                    } else if (this._isUnitSubset(targets, actors)) {
                        resolved = this.outsideMutualGroupAction(action, actors, options);
                    } else if (this._isUnitSubset(actors, targets)) {
                        resolved = this.outsideMutualGroupAction(action, [...actors, ...targets], options);
                    } else if (actors.length === targets.length) {
                        resolved = this.outsidePairedActionsOnTargets(action, actors, targets, options);
                    } else {
                        this.log.push({ text: this._label('target.chooseOneActor', 'Choose one actor for multi-target {action} actions, or one target for group {action} actions.', {
                            action: this._uiLabel(action).toLowerCase(),
                            actorCount: actors.length,
                            targetCount: targets.length
                        }), type: 'discovery' });
                        this.renderLog();
                        this.renderParty();
                        this.renderCreatures();
                        this.renderExplorationActions();
                        return false;
                    }
                } else {
                    resolved = this.outsideActionOnTargets(action, targets, actors[0] || this.player, options);
                }
                if (resolved !== false) this.clearExplorationTargets();
                return resolved !== false;
            },

            _getRecruitScore(actor, target) {
                if (!actor || !target || this._isCorpse(target)) return 0;
                const pleasureRatio = (target.CPle || 0) / Math.max(1, target.MPle || 100);
                let score = Math.floor(pleasureRatio * 100);
                if (target.willing) score += 20;
                if (target.orgasmed) score += 15;
                if (target.disposition === this.DISPOSITION.FRIENDLY) score += 20;
                if (target.disposition === this.DISPOSITION.NEUTRAL) score += 5;
                if (this.settings.sameSpeciesBonus && target.species === actor.species) score += 8;
                score += Math.floor(((actor.cha || 10) + (actor.Flir || 10) + (actor.Fuck || 10) - (target.wis || 10)) / 6);
                if (target.disposition === this.DISPOSITION.ENEMY) score -= 40;
                return score;
            },

            _canRecruit(actor, target) {
                if (!target || target.disposition !== this.DISPOSITION.FRIENDLY || this.party.includes(target)) return false;
                if (!this._hasBaselineInteractionEligibility(target, 'recruit')) return false;
                return this._getRecruitScore(actor, target) >= 85;
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
                if (!target) return;
                this.outsideGroupActionOnTarget(action, target, this._getExplorationActors());
            },

            outsideActionForParty(action, targetIndex, actorId = null, options = {}) {
                const target = this.party[targetIndex];
                if (!target) return false;
                return this.outsideGroupActionOnTarget(action, target, this._getExplorationActors(actorId), options);
            },

            outsideActionForCreature(action, targetId, options = {}) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target) return false;
                return this.outsideGroupActionOnTarget(action, target, this._getExplorationActors(), options);
            },

            outsideActionForCreatureAs(actorId, action, targetId, options = {}) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target) return false;
                const actors = this._getExplorationActors(actorId);
                if (actorId && !actors.some(actor => this._unitSelectionId(actor) === String(actorId))) return false;
                return this.outsideGroupActionOnTarget(action, target, actors, options);
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
                    if (resolved === false) skippedSet.add(target);
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
                const actors = this._getExplorationActors(actorId);
                if (actorId && !actors.some(actor => this._unitSelectionId(actor) === String(actorId))) return false;
                return this.outsideActionOnTargets(action, targets, actors[0] || this.player, options);
            },

            outsideActionForCreatureTargets(action, targetIds, actorId = null, options = {}) {
                const ids = new Set((targetIds || []).map(id => String(id)));
                const targets = this.creatures.filter(c => ids.has(String(c.id || c.name)));
                const actors = this._getExplorationActors(actorId);
                if (actorId && !actors.some(actor => this._unitSelectionId(actor) === String(actorId))) return false;
                return this.outsideActionOnTargets(action, targets, actors[0] || this.player, options);
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
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
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
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
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
                        }
                        break;
                    }
                    case 'flirt': {
                        let charm = this._AR(actor.Flir + (actor.cha || 10) * 0.5);
                        if (this.settings.sameSpeciesBonus && target.species === actor.species) {
                            charm += 3;
                        }
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
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
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                if (startCombatAfter) {
                    this.startCombat(combatTargets);
                    return true;
                }
                if (!this.combatState.active) this.renderExplorationActions();
                return !(action === 'feast' && actor === target);
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
                const target = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY)[index];
                if (!target) return false;
                return this.recruitCreature(target, this._getExplorationActor());
            },

            recruitCreatureById(targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target || target.disposition !== this.DISPOSITION.FRIENDLY) return false;
                return this.recruitCreature(target, this._getExplorationActor());
            },

            _confirmRecruitCreature(target) {
                if (!target) return false;
                return this.showConfirmDialog({
                    title: this._label('action.recruit', 'Recruit'),
                    message: this._label('recruit.confirmSubmissive', '{name} is submissive. Recruit them to your party?', { name: target.name }),
                    confirmLabel: this._label('action.recruit', 'Recruit'),
                    cancelLabel: this._label('ui.cancel', 'Cancel'),
                    onConfirm: () => this.recruitCreature(target)
                });
            },

            recruitCreature(target, actor = this.player, options = {}) {
                if (this.party.length >= this.MAX_PARTY_SIZE) {
                    this.log.push({ text: this._label('recruit.partyFull', 'Party is full! Cannot recruit {name}', { name: target.name }), type: 'combat' });
                    this.renderLog();
                    return false;
                }
                if (!options.force && !this._canRecruit(actor, target)) {
                    this.log.push({ text: this._label('recruit.notReady', '{name} is not ready to join the party.', { name: target.name }), type: 'discovery' });
                    this.renderLog();
                    this.renderCreatures();
                    return false;
                }
	                target.disposition = this.DISPOSITION.PARTY;
	                target.ally = true;
	                target.obedient = true;
	                target.CPun = Math.max(1, target.CPun);
	                this._normalizeUnit(target, { disposition: this.DISPOSITION.PARTY, ally: true, obedient: true });
	                this.party.push(target);
                this.creatures = this.creatures.filter(c => c !== target);
                this.log.push({ text: this._label('recruit.joined', '{name} joins your party!', { name: target.name }), type: 'discovery' });
                this.gainXP(this.BALANCE.recruitXP);
                this.renderParty();
                this.renderCreatures();
                this.renderLog();
                this.showExplorationActions();
                this.autoSave();
                return true;
            },

            // ===== FLEE =====
            attemptFlee() {
                const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                const enemy = enemies[0];
                if (!enemy) {
                    this.log.push({ text: this._label('combat.flee.noEnemies', 'No enemies to flee from!'), type: 'combat' });
                    this.renderLog(); return;
                }
                const fleeChance = 0.6 + (this.player.Flee - enemy.spd) * 0.02;
                const fleeRoll = this._combatStateRoll('combat-player-flee', this.player, this._unitSelectionId(enemy));
	                if (fleeRoll < Math.max(0.1, Math.min(0.95, fleeChance))) {
	                    this.log.push({ text: this._label('combat.flee.success', 'You flee successfully!'), type: 'combat' });
	                    this.creatures = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY);
	                    this._emitCombatAction('flee', this.player, enemy, 'success');
	                    this.endCombat('flee');
	                } else {
	                    this.log.push({ text: this._label('combat.flee.failed', 'Flee failed! {name} intercepts you!', { name: enemy.name }), type: 'combat' });
	                    this._emitCombatAction('flee', this.player, enemy, 'failed');
	                    this.renderLog();
                    this.nextTurn();
                }
            },

            // ===== FEED ACTION =====
            executeFeedAction() {
                // Feed targets allies, not enemies - use sub-action picker for ally target
                const actor = this.activeActor || this.player;
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
                    return;
                }
                // Show sub-action picker for feed
                let html = `<h3>${this._escapeHtml(this._label('feed.optionsTitle', 'Feed Options'))}</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">`;
                for (const sub of validSubs) {
                    const subLabel = this._escapeHtml(sub.label);
                    html += `<button class="action-btn" title="${subLabel}" aria-label="${subLabel}" onclick="App._executeFeedSubAction('${sub.id}', App.activeActor || App.player)">${sub.icon} ${subLabel}</button>`;
                }
                const cancelLabel = this._escapeHtml(this._label('ui.cancel', 'Cancel'));
                html += `</div><button class="nav-btn" style="margin-top:12px" title="${cancelLabel}" aria-label="${cancelLabel}" onclick="App.cancelTargetSelection()">${cancelLabel}</button>`;
                document.getElementById('scene-description').innerHTML = html;
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
                this.renderLog();
                this.renderParty();
                this.combatState.processing = false;
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
                return (unit?.perks || []).filter(perk => perk.tree === treeId).length;
            },

            _hasPerk(perkId, unit = this.player) {
                return (unit?.perks || []).some(perk => perk.id === perkId);
            },

            _hasPerkEffect(effect, unit = this.player) {
                return (unit?.perks || []).some(perk => perk.perkEffect === effect);
            },

            _canChoosePerk(perk, treeId, unit = this.player) {
                if (!perk || !unit || this._hasPerk(perk.id, unit)) return false;
                if (!perk.requires) return true;
                if (perk.requires.perk && !this._hasPerk(perk.requires.perk, unit)) return false;
                if (perk.requires.tree && this._perkTreeCount(perk.requires.tree, unit) < (perk.requires.count || 1)) return false;
                return true;
            },

            _perkTreesForUnit(unit = this.player) {
                const trees = { ...this.PERK_TREES };
                const speciesTree = this.SPECIES_PERK_TREES[unit?.species];
                if (speciesTree) trees[`species:${unit.species}`] = speciesTree;
                return trees;
            },

            _availablePerkChoices(unit = this.player) {
                const choices = [];
                for (const [treeId, tree] of Object.entries(this._perkTreesForUnit(unit))) {
                    for (const perk of tree.perks) {
                        choices.push({ ...perk, tree: treeId, treeLabel: tree.label, available: this._canChoosePerk(perk, treeId, unit) });
                    }
                }
                return choices;
            },

            _availablePerkTreeFilters(unit = this.player) {
                return [['all', this._label('perk.filter.all', 'All')], ...Object.entries(this._perkTreesForUnit(unit)).map(([treeId, tree]) => [treeId, tree.label])];
            },

            setPerkTreeFilter(filter) {
                const valid = this._availablePerkTreeFilters().map(([value]) => value);
                this.perkTreeFilter = valid.includes(filter) ? filter : 'all';
                this.showPerkSelection();
            },

            choosePerk(perkId) {
                if (!this.player || (this.player.pendingPerkChoices || 0) <= 0) return;
                const choice = this._availablePerkChoices().find(perk => perk.id === perkId);
                if (!choice || !choice.available) {
                    this.log.push({ text: this._label('perk.notAvailable', 'That perk is not available yet.'), type: 'discovery' });
                    this.renderLog();
                    this.showPerkSelection();
                    return;
                }
                this.player.perks = this.player.perks || [];
                this.player.perks.push({
                    id: choice.id,
                    tree: choice.tree,
                    species: choice.tree.startsWith('species:') ? this.player.species : null,
                    name: choice.name,
                    stat: choice.stat,
                    val: choice.val,
                    perkEffect: choice.perkEffect || null,
                    desc: choice.desc
                });
                if (choice.stat) this.player[choice.stat] = (this.player[choice.stat] || 0) + (choice.val || 0);
                this.player.pendingPerkChoices = Math.max(0, (this.player.pendingPerkChoices || 0) - 1);
                this.log.push({ text: this._label('perk.chosen', 'Perk chosen: {name}. {description}', { name: choice.name, description: choice.desc }), type: 'discovery' });
                this.renderLog();
                this.renderParty();
                if (this.player.pendingPerkChoices > 0) this.showPerkSelection();
                else this.showCharacterStats();
                this.autoSave();
            },

            _completePerkRespec() {
                if (!this.player) return;
                const selected = this.player.perks || [];
                if (!selected.length) {
                    this.log.push({ text: this._label('perk.noneToRespec', 'No perks selected to respec.'), type: 'discovery' });
                    this.renderLog();
                    return;
                }
                selected.forEach(perk => {
                    if (perk.stat && typeof perk.val === 'number') {
                        this.player[perk.stat] = Math.max(0, (this.player[perk.stat] || 0) - perk.val);
                    }
                });
                this.player.pendingPerkChoices = (this.player.pendingPerkChoices || 0) + selected.length;
                this.player.perks = [];
                this.perkTreeFilter = 'all';
                this.log.push({ text: this._label(selected.length === 1 ? 'perk.respecDoneOne' : 'perk.respecDoneMany', selected.length === 1 ? 'Perks reset. Refunded {count} choice.' : 'Perks reset. Refunded {count} choices.', { count: selected.length }), type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.showCharacterStats();
                this.autoSave();
            },

            respecPerks(skipConfirm = false) {
                if (!this.player) return;
                const selected = this.player.perks || [];
                if (!selected.length) {
                    this.log.push({ text: this._label('perk.noneToRespec', 'No perks selected to respec.'), type: 'discovery' });
                    this.renderLog();
                    return;
                }
                if (skipConfirm) return this._completePerkRespec();
                return this.showConfirmDialog({
                    title: this._label('perk.respec', 'Respec Perks'),
                    message: this._label('perk.confirmRespec', 'Reset selected perks and refund their choices?'),
                    confirmLabel: this._label('perk.respec', 'Respec Perks'),
                    cancelLabel: this._label('ui.cancel', 'Cancel'),
                    onConfirm: () => this._completePerkRespec()
                });
            },

            debugGrantPerkChoice(count = 1) {
                if (!this.player) return;
                const grant = Math.max(1, Math.floor(Number(count) || 1));
                this.player.pendingPerkChoices = (this.player.pendingPerkChoices || 0) + grant;
                this.log.push({ text: `Debug: granted ${grant} perk choice${grant === 1 ? '' : 's'}.`, type: 'discovery' });
                this.renderLog();
                this.showCharacterStats();
                this.autoSave();
            },

            showPerkSelection() {
                if (!this.player) return;
                const pending = this.player.pendingPerkChoices || 0;
                const choices = this._availablePerkChoices();
                const filters = this._availablePerkTreeFilters(this.player);
                if (!filters.some(([value]) => value === this.perkTreeFilter)) this.perkTreeFilter = 'all';
                const visibleTrees = Object.entries(this._perkTreesForUnit(this.player)).filter(([treeId]) => this.perkTreeFilter === 'all' || this.perkTreeFilter === treeId);
                const titleLabel = this._escapeHtml(this._label('perk.choose', 'Choose Perk'));
                const pendingLabel = this._escapeHtml(this._label('perk.pending', 'Pending choices: {count}', { count: pending }));
                const treesLabel = this._escapeHtml(this._label('perk.trees', 'Perk trees'));
                const backLabel = this._escapeHtml(this._label('perk.back', 'Back'));
                let html = `<h3>${titleLabel}</h3><p style="color:var(--text-muted);margin:4px 0 12px;">${pendingLabel}</p><div class="action-legend" role="tablist" aria-label="${treesLabel}" style="margin-bottom:12px;">`;
                filters.forEach(([value, label]) => {
                    const active = this.perkTreeFilter === value ? ' selected' : '';
                    const escapedValue = this._escapeHtml(value);
                    const filterLabel = this._escapeHtml(label);
                    html += `<button class="action-chip${active}" role="tab" aria-selected="${this.perkTreeFilter === value ? 'true' : 'false'}" data-perk-filter="${escapedValue}" title="${filterLabel}" aria-label="${filterLabel}" onclick="App.setPerkTreeFilter('${escapedValue}')">${filterLabel}</button>`;
                });
                html += `</div><div style="display:grid;gap:12px;">`;
                for (const [treeId, tree] of visibleTrees) {
                    html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="font-weight:700;color:var(--text-primary)">${tree.label}</div><div style="display:grid;gap:8px;margin-top:8px;">`;
                    choices.filter(perk => perk.tree === treeId).forEach(perk => {
                        const disabled = pending <= 0 || !perk.available ? ' disabled' : '';
                        const reqTree = perk.requires?.tree ? this._perkTreesForUnit(this.player)[perk.requires.tree]?.label || perk.requires.tree : null;
                        const req = perk.requires ? (perk.requires.perk ? ` Requires ${perk.requires.perk}.` : ` Requires ${perk.requires.count || 1} ${reqTree} perk${(perk.requires.count || 1) === 1 ? '' : 's'}.`) : '';
                        const chooseTitle = this._escapeHtml(this._label('perk.chooseNamed', 'Choose {name}', { name: perk.name }));
                        html += `<button class="nav-btn" style="text-align:left;white-space:normal;padding:8px;" title="${chooseTitle}" aria-label="${chooseTitle}" ${disabled} onclick="App.choosePerk('${perk.id}')"><strong>${perk.name}</strong> <span style="color:var(--text-muted);font-size:11px">[${perk.treeLabel}]</span><br><span style="font-size:11px;color:var(--text-muted)">${perk.desc}${req}</span></button>`;
                    });
                    html += `</div></div>`;
                }
                html += `</div><button class="nav-btn" style="margin-top:12px" title="${backLabel}" aria-label="${backLabel}" onclick="App.showCharacterStats()">${backLabel}</button>`;
                document.getElementById('scene-description').innerHTML = html;
            },

            // ===== MERCHANTS / TRADE =====
            _normalizeMerchantStock(stock = []) {
                return stock.map((entry, index) => {
                    const itemName = typeof entry === 'string' ? entry : entry.name;
                    const def = this.ITEMS[itemName] || {};
                    return {
                        id: entry.id || `stock_${itemName || 'item'}_${index}`,
                        name: itemName || 'Unknown Item',
                        price: entry.price || def.value || 10,
                        qty: entry.qty ?? 1
                    };
                });
            },

            _merchantStockFromTable(tableId = 'general') {
                const table = this.MERCHANT_STOCK_TABLES[tableId] || this.MERCHANT_STOCK_TABLES.general || [];
                return this._normalizeMerchantStock(table).map((entry, index) => ({
                    ...entry,
                    id: `${tableId}_stock_${index}_${entry.name.replace(/\s+/g, '_').toLowerCase()}`
                }));
            },

            _createStructureMerchant(structureId, biomeId = this.currentBiome || 'forest', tile = null) {
                const struct = this.STRUCTURES[structureId];
                if (!struct?.merchant) return null;
                const merchantConfig = struct.merchant;
                const speciesPool = merchantConfig.species || ['human'];
                const x = tile?.x ?? 0;
                const y = tile?.y ?? 0;
                const sid = typeof WorldGen !== 'undefined'
                    ? (WorldGen.pickWeighted(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'structure-merchant-species', x, y, speciesPool) || 'human')
                    : speciesPool[0] || 'human';
                const sp = this.species.find(s => s.id === sid) || this.species.find(s => s.id === 'human');
                const stockTable = merchantConfig.stockTable || 'general';
                return this._normalizeUnit({
                    id: `merchant_${structureId}_${x}_${y}`,
                    name: `${sp?.name || 'Traveling'} Merchant`,
                    species: sid,
                    icon: sp?.icon || '👤',
                    disposition: this.DISPOSITION.MERCHANT,
                    level: Math.max(1, this.player?.level || 1),
                    bodyParts: this.SPECIES_DEFAULT_PARTS[sid] || [],
                    stockTable,
                    stock: this._merchantStockFromTable(stockTable),
                    stockLastRefreshDay: this.dayCount || 0,
                    tags: [sp?.name || sid, 'Merchant', this.biomes[biomeId]?.name || biomeId],
                    expanded: false,
                    hero: false,
                    ally: false,
                    mc: false,
                    obedient: false,
                    willing: true
                });
            },

            _maybeSpawnStructureMerchant(tile) {
                if (!tile?.structure || !this.STRUCTURES[tile.structure]?.merchant) return null;
                const config = this.STRUCTURES[tile.structure].merchant;
                if (typeof WorldGen !== 'undefined' && !WorldGen.chance(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'structure-merchant', tile.x, tile.y, config.chance ?? 0)) return null;
                if (typeof WorldGen === 'undefined' && (config.chance ?? 0) <= 0) return null;
                const merchant = this._createStructureMerchant(tile.structure, tile.biome, tile);
                if (!merchant) return null;
                this.creatures = this._tileCreatures([...(this.creatures || []), merchant]);
                tile.creatures = this._tileCreatures(this.creatures);
                return merchant;
            },

            _questTemplateForStructure(structureId, tile = null) {
                const config = this.STRUCTURES[structureId]?.quest;
                const templates = config?.templates || [];
                if (!templates.length) return null;
                const x = tile?.x ?? 0;
                const y = tile?.y ?? 0;
                const templateId = typeof WorldGen !== 'undefined'
                    ? (WorldGen.pickWeighted(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'structure-quest-template', x, y, templates) || templates[0])
                    : templates[0];
                const source = this.QUEST_TEMPLATES[templateId];
                if (!source) return null;
                const quest = JSON.parse(JSON.stringify(source));
                const tileId = tile ? `${tile.x}_${tile.y}` : 'local';
                quest.id = quest.id || `${templateId}_${tileId}`;
                quest.templateId = templateId;
                if (tile) quest.giverLocation = { x: Number(tile.x), y: Number(tile.y), label: this.STRUCTURES[structureId]?.name || 'Quest giver' };
                return quest;
            },

            _createStructureQuestGiver(structureId, tile) {
                const struct = this.STRUCTURES[structureId];
                const questConfig = struct?.quest;
                if (!questConfig) return null;
                const quest = this._questTemplateForStructure(structureId, tile);
                if (!quest) return null;
                const speciesPool = questConfig.species || ['human'];
                const x = tile?.x ?? 0;
                const y = tile?.y ?? 0;
                const sid = typeof WorldGen !== 'undefined'
                    ? (WorldGen.pickWeighted(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'structure-quest-species', x, y, speciesPool) || 'human')
                    : speciesPool[0] || 'human';
                const sp = this.species.find(s => s.id === sid) || this.species.find(s => s.id === 'human');
                return this._normalizeUnit({
                    id: `questgiver_${structureId}_${x}_${y}`,
                    name: `${sp?.name || 'Local'} Guide`,
                    species: sid,
                    icon: sp?.icon || '👤',
                    disposition: this.DISPOSITION.QUEST_GIVER,
                    level: Math.max(1, this.player?.level || 1),
                    bodyParts: this.SPECIES_DEFAULT_PARTS[sid] || [],
                    quest,
                    tags: [sp?.name || sid, 'Quest', struct.name],
                    expanded: false,
                    hero: false,
                    ally: false,
                    mc: false,
                    obedient: false,
                    willing: true
                });
            },

            _maybeSpawnStructureQuestGiver(tile) {
                if (!tile?.structure || !this.STRUCTURES[tile.structure]?.quest) return null;
                const config = this.STRUCTURES[tile.structure].quest;
                if (typeof WorldGen !== 'undefined' && !WorldGen.chance(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'structure-quest-giver', tile.x, tile.y, config.chance ?? 0)) return null;
                if (typeof WorldGen === 'undefined' && (config.chance ?? 0) <= 0) return null;
                const questGiver = this._createStructureQuestGiver(tile.structure, tile);
                if (!questGiver) return null;
                this.creatures = this._tileCreatures([...(this.creatures || []), questGiver]);
                tile.creatures = this._tileCreatures(this.creatures);
                return questGiver;
            },

            _itemCategory(item) {
                return this._getItemDef(item).type || 'misc';
            },

            _itemValue(item) {
                return this._getItemDef(item).value || item?.price || 0;
            },

            _itemListOptions(prefix, targetId = null) {
                const targetArg = targetId ? `,'${String(targetId).replace(/'/g, "\\'")}'` : '';
                const categoryLabel = this._escapeHtml(this._label('item.category', 'Category'));
                const sortLabel = this._escapeHtml(this._label('item.sort', 'Sort'));
                const filterOptions = ['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].map(type => {
                    const label = this._escapeHtml(this._label(`item.category.${type}`, type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)));
                    return `<option value="${type}" ${this[`${prefix.toLowerCase()}Filter`] === type ? 'selected' : ''}>${label}</option>`;
                }).join('');
                const sortOptions = [
                    ['name', this._label('item.sort.name', 'Name')],
                    ['type', this._label('item.sort.type', 'Type')],
                    ['value-desc', this._label('item.sort.valueDesc', 'Value ↓')],
                    ['value-asc', this._label('item.sort.valueAsc', 'Value ↑')]
                ].map(([value, label]) => `<option value="${value}" ${this[`${prefix.toLowerCase()}Sort`] === value ? 'selected' : ''}>${this._escapeHtml(label)}</option>`).join('');
                return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px;">
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">${categoryLabel}
                        <select class="nav-btn" style="padding:4px 8px;font-size:11px;" onchange="App.set${prefix}Filter(this.value${targetArg})">
                            ${filterOptions}
                        </select>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">${sortLabel}
                        <select class="nav-btn" style="padding:4px 8px;font-size:11px;" onchange="App.set${prefix}Sort(this.value${targetArg})">
                            ${sortOptions}
                        </select>
                    </label>
                </div>`;
            },

            _filterAndSortItemEntries(entries, filter = 'all', sort = 'name') {
                const filtered = entries.filter(entry => filter === 'all' || this._itemCategory(entry.item) === filter);
                return filtered.sort((a, b) => {
                    const aDef = this._getItemDef(a.item);
                    const bDef = this._getItemDef(b.item);
                    if (sort === 'value-desc') return this._itemValue(b.item) - this._itemValue(a.item) || a.item.name.localeCompare(b.item.name);
                    if (sort === 'value-asc') return this._itemValue(a.item) - this._itemValue(b.item) || a.item.name.localeCompare(b.item.name);
                    if (sort === 'type') return (aDef.type || 'misc').localeCompare(bDef.type || 'misc') || a.item.name.localeCompare(b.item.name);
                    return a.item.name.localeCompare(b.item.name);
                });
            },

            _merchantStockQuantity(merchant, itemName, index, day) {
                const merchantId = String(merchant?.id || merchant?.name || merchant?.stockTable || 'default');
                const stockDay = Number.isFinite(Number(day)) ? Number(day) : 0;
                if (typeof WorldGen !== 'undefined') {
                    const roll = WorldGen.hash01(this._mapSeed(), this.worldMeta?.generatorVersion || 1, 'merchant-default-stock-qty', merchantId, itemName, index, stockDay);
                    return 1 + Math.floor(roll * 2);
                }
                const key = `${this.worldMeta?.seed || 'yaw'}|${this.worldMeta?.generatorVersion || 1}|${merchantId}|${itemName}|${index}|${stockDay}`;
                let hash = 2166136261;
                for (let i = 0; i < key.length; i++) {
                    hash ^= key.charCodeAt(i);
                    hash = Math.imul(hash, 16777619);
                }
                return 1 + ((hash >>> 0) % 2);
            },

            _defaultMerchantStock(merchant = null, day = this.dayCount || 0) {
                return ['Healing Herb', 'Old Coin', 'Monster Fang'].map((name, index) => {
                    const def = this.ITEMS[name] || {};
                    return { id: `default_stock_${index}`, name, price: def.value || 10, qty: this._merchantStockQuantity(merchant, name, index, day) };
                });
            },

            _refreshMerchantStock(merchant, force = false) {
                if (!merchant || merchant.disposition !== this.DISPOSITION.MERCHANT) return merchant;
                const currentDay = this.dayCount || 0;
                const needsStock = !merchant.stock || merchant.stock.length === 0;
                const stale = currentDay - (merchant.stockLastRefreshDay ?? currentDay) >= 3;
                if (force || needsStock || stale) {
                    merchant.stock = merchant.stockTable ? this._merchantStockFromTable(merchant.stockTable) : this._defaultMerchantStock(merchant, currentDay);
                    merchant.stockLastRefreshDay = currentDay;
                } else {
                    merchant.stock = this._normalizeMerchantStock(merchant.stock);
                }
                return merchant;
            },

            _findMerchantById(targetId) {
                const merchant = this.creatures.find(c => c.disposition === this.DISPOSITION.MERCHANT && String(c.id || c.name) === String(targetId));
                return this._refreshMerchantStock(merchant);
            },

            showTrade(targetId) {
                const merchant = this._findMerchantById(targetId);
                if (!merchant) return false;
                const gold = this.player.gold || 0;
                const buyLabel = this._escapeHtml(this._label('trade.buy', 'Buy'));
                const sellLabel = this._escapeHtml(this._label('trade.sell', 'Sell'));
                const backLabel = this._escapeHtml(this._label('inventory.back', 'Back'));
                const title = this._escapeHtml(this._label('trade.title', '{name} Trade', { name: merchant.name }));
                const goldText = this._escapeHtml(this._label('trade.gold', 'Gold: {gold}', { gold }));
                let html = `<h3>${title}</h3><p style="color:var(--text-muted);margin:4px 0 12px;">${goldText}</p>`;
                html += this._itemListOptions('Trade', this._unitKey(merchant));
                html += `<h4 style="color:var(--text-primary);margin:12px 0 8px;">${buyLabel}</h4><div style="display:grid;gap:8px;">`;
                const stockEntries = this._filterAndSortItemEntries((merchant.stock || []).map((item, index) => ({ item, index })), this.tradeFilter, this.tradeSort);
                if (stockEntries.length === 0) {
                    html += `<p style="color:var(--text-muted)">${this._escapeHtml(this._label('trade.noStockMatches', 'No stock matches the current filter.'))}</p>`;
                }
                stockEntries.forEach(({ item, index }) => {
                    const def = this.ITEMS[item.name] || { icon: '?', desc: 'Unknown' };
                    const disabled = gold < item.price || item.qty <= 0 || this.inventory.length >= this.MAX_INVENTORY ? ' disabled' : '';
                    const buyTitle = this._escapeHtml(this._label('trade.buyItem', 'Buy {name}', { name: item.name }));
                    html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="display:flex;justify-content:space-between;gap:8px;"><div><div style="font-weight:700;color:var(--text-primary)">${def.icon || '?'} ${item.name}</div><div style="font-size:11px;color:var(--text-muted)">${def.type || 'misc'} · ${def.desc || ''}</div></div><div style="font-size:12px;color:var(--text-muted)">Qty ${item.qty} | ${item.price}g</div></div><button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${buyTitle}" aria-label="${buyTitle}" ${disabled} onclick="App.buyFromMerchant('${this._unitKey(merchant)}',${index})">${buyLabel}</button></div>`;
                });
                html += `</div><h4 style="color:var(--text-primary);margin:12px 0 8px;">${sellLabel}</h4><div style="display:grid;gap:8px;">`;
                const sellEntries = this._filterAndSortItemEntries((this.inventory || []).map((item, index) => ({ item, index })), this.tradeFilter, this.tradeSort);
                if (this.inventory.length === 0) {
                    html += `<p style="color:var(--text-muted)">${this._escapeHtml(this._label('trade.noItemsToSell', 'No items to sell.'))}</p>`;
                } else if (sellEntries.length === 0) {
                    html += `<p style="color:var(--text-muted)">${this._escapeHtml(this._label('trade.noInventoryMatches', 'No inventory items match the current filter.'))}</p>`;
                } else {
                    sellEntries.forEach(({ item }) => {
                        const def = this.ITEMS[item.name] || { icon: '?', value: 1, desc: 'Unknown' };
                        const price = Math.max(1, Math.floor((def.value || 1) * 0.5));
                        const sellTitle = this._escapeHtml(this._label('trade.sellItem', 'Sell {name}', { name: item.name }));
                        html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="display:flex;justify-content:space-between;gap:8px;"><div><div style="font-weight:700;color:var(--text-primary)">${def.icon || '?'} ${item.name}</div><div style="font-size:11px;color:var(--text-muted)">${def.type || 'misc'} · ${def.desc || ''}</div></div><div style="font-size:12px;color:var(--text-muted)">${price}g</div></div><button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${sellTitle}" aria-label="${sellTitle}" onclick="App.sellToMerchant('${this._unitKey(merchant)}','${String(item.id).replace(/'/g, "\\'")}')">${sellLabel}</button></div>`;
                    });
                }
                html += `</div><button class="nav-btn" style="margin-top:12px" title="${backLabel}" aria-label="${backLabel}" onclick="App.showExplorationActions()">${backLabel}</button>`;
                document.getElementById('scene-description').innerHTML = html;
                return true;
            },

            setTradeFilter(filter, targetId) {
                this.tradeFilter = ['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].includes(filter) ? filter : 'all';
                if (targetId) this.showTrade(targetId);
            },

            setTradeSort(sort, targetId) {
                this.tradeSort = ['name', 'type', 'value-desc', 'value-asc'].includes(sort) ? sort : 'name';
                if (targetId) this.showTrade(targetId);
            },

            _requiresPurchaseConfirmation(item) {
                const def = this.ITEMS[item?.name] || {};
                return Boolean(def.rare || item?.rare || (item?.price || 0) >= 50);
            },

            _cancelMerchantPurchase(targetId, itemName) {
                this.log.push({ text: this._label('trade.purchaseCancelled', 'Purchase cancelled: {name}.', { name: itemName }), type: 'discovery' });
                this.renderLog();
                this.showTrade(targetId);
                return false;
            },

            _completeMerchantPurchase(targetId, stockIndex) {
                const merchant = this._findMerchantById(targetId);
                const item = merchant?.stock?.[stockIndex];
                if (!merchant || !item || item.qty <= 0) return;
                if ((this.player.gold || 0) < item.price) {
                    this.log.push({ text: this._label('trade.needGold', 'You need {price} gold to buy {name}.', { price: item.price, name: item.name }), type: 'discovery' });
                    this.renderLog();
                    this.showTrade(targetId);
                    return;
                }
                if (this.inventory.length >= this.MAX_INVENTORY) {
                    this.log.push({ text: this._label('inventory.full', 'Inventory is full.'), type: 'discovery' });
                    this.renderLog();
                    this.showTrade(targetId);
                    return;
                }
                this.player.gold -= item.price;
                item.qty -= 1;
                this.inventory.push({ id: `buy_${this._stableIdPart(targetId, 'merchant')}_${this._stableIdPart(item.name)}_${this.inventory.length}`, name: item.name });
                this.log.push({ text: this._label('trade.bought', 'Bought {name} for {price} gold.', { name: item.name, price: item.price }), type: 'loot' });
                this.renderLog();
                this.renderParty();
                this.showTrade(targetId);
                this.autoSave();
            },

            buyFromMerchant(targetId, stockIndex) {
                const merchant = this._findMerchantById(targetId);
                const item = merchant?.stock?.[stockIndex];
                if (!merchant || !item || item.qty <= 0) return;
                if (this._requiresPurchaseConfirmation(item)) {
                    const itemName = item.name;
                    return this.showConfirmDialog({
                        title: this._label('trade.buy', 'Buy'),
                        message: this._label('trade.confirmBuy', 'Buy {name} for {price} gold?', { name: item.name, price: item.price }),
                        confirmLabel: this._label('trade.buy', 'Buy'),
                        cancelLabel: this._label('ui.cancel', 'Cancel'),
                        onCancel: () => this._cancelMerchantPurchase(targetId, itemName),
                        onConfirm: () => this._completeMerchantPurchase(targetId, stockIndex)
                    });
                }
                return this._completeMerchantPurchase(targetId, stockIndex);
            },

            sellToMerchant(targetId, itemId) {
                const merchant = this._findMerchantById(targetId);
                if (!merchant) return;
                const item = this.inventory.find(i => String(i.id) === String(itemId));
                if (!item) return;
                const def = this.ITEMS[item.name] || { value: 1 };
                const price = Math.max(1, Math.floor((def.value || 1) * 0.5));
                this.inventory = this.inventory.filter(i => String(i.id) !== String(itemId));
                this.player.gold = (this.player.gold || 0) + price;
                const existing = merchant.stock.find(s => s.name === item.name);
                if (existing) existing.qty += 1;
                else merchant.stock.push({ id: `sold_${this._stableIdPart(targetId, 'merchant')}_${this._stableIdPart(item.name)}_${merchant.stock.length}`, name: item.name, price: def.value || price, qty: 1 });
                this.log.push({ text: this._label('trade.sold', 'Sold {name} for {price} gold.', { name: item.name, price }), type: 'loot' });
                this.renderLog();
                this.renderParty();
                this.showTrade(targetId);
                this.autoSave();
            },

            // ===== QUESTS =====
            _normalizeQuest(quest, giver = null) {
                const source = quest || {};
                const id = source.id || `quest_${this._stableIdPart(giver?.id || giver?.name, 'giver')}`;
                return {
                    id,
                    title: source.title || 'Untitled Quest',
                    description: source.description || '',
                    giverId: source.giverId || giver?.id || giver?.name || null,
                    giverName: source.giverName || giver?.name || null,
                    giverLocation: source.giverLocation || giver?.giverLocation || (giver ? { x: Number(this.location?.x || 0), y: Number(this.location?.y || 0), label: giver.name || 'Quest giver' } : null),
                    status: source.status || 'available',
                    turnInRequired: Boolean(source.turnInRequired || source.rewardOnTurnIn),
                    rewardClaimed: Boolean(source.rewardClaimed),
                    objectives: (source.objectives || []).map((objective, index) => this._normalizeQuestObjective(objective, id, index)),
                    reward: source.reward || source.rewards || {}
                };
            },

            _normalizeQuestObjective(objective = {}, questId = 'quest', index = 0) {
                const checkpoints = (objective.checkpoints || objective.route || []).map((checkpoint, checkpointIndex) => ({
                    id: checkpoint.id || `${questId}_objective_${index}_checkpoint_${checkpointIndex}`,
                    label: checkpoint.label || checkpoint.name || `Checkpoint ${checkpointIndex + 1}`,
                    x: Number(checkpoint.x ?? checkpoint.location?.x ?? checkpoint[0] ?? 0),
                    y: Number(checkpoint.y ?? checkpoint.location?.y ?? checkpoint[1] ?? 0),
                    complete: Boolean(checkpoint.complete)
                }));
                const location = objective.location || (Number.isFinite(objective.x) && Number.isFinite(objective.y) ? { x: objective.x, y: objective.y } : null);
                const required = objective.required || objective.count || Math.max(1, checkpoints.length || 1);
                const normalized = {
                    id: objective.id || `${questId}_objective_${index}`,
                    type: objective.type || 'find',
                    label: objective.label || objective.description || this._questObjectiveLabel(objective),
                    targetId: objective.targetId || null,
                    species: objective.species || null,
                    item: objective.item || null,
                    location: location ? { x: Number(location.x), y: Number(location.y) } : null,
                    checkpoints,
                    required,
                    progress: objective.progress || 0,
                    complete: Boolean(objective.complete)
                };
                if (normalized.type === 'escort' && normalized.checkpoints.length) {
                    normalized.progress = Math.min(normalized.progress, normalized.checkpoints.length);
                    normalized.required = normalized.checkpoints.length;
                    normalized.checkpoints.forEach((checkpoint, i) => { checkpoint.complete = checkpoint.complete || i < normalized.progress; });
                    normalized.complete = normalized.complete || normalized.progress >= normalized.required;
                }
                return normalized;
            },

            _questObjectiveLabel(objective) {
                const target = objective.item || objective.species || objective.targetId || objective.location?.label || 'target';
                return `${objective.type || 'find'} ${target}`;
            },

            _questRewardPreviewText(reward = {}) {
                const parts = [];
                if (reward.xp) parts.push(this._label('quest.reward.xp', '{count} XP', { count: reward.xp }));
                if (reward.gold) parts.push(this._label('quest.reward.gold', '{count} gold', { count: reward.gold }));
                for (const itemName of reward.items || []) {
                    parts.push(this._label('quest.reward.item', '{name}', { name: itemName }));
                }
                if (reward.recruit) {
                    parts.push(this._label('quest.reward.recruit', 'Recruit: {name}', { name: reward.recruit.name || this._label('party.ally', 'Ally') }));
                }
                if (parts.length === 0) parts.push(this._label('quest.reward.none', 'No listed reward'));
                return parts.map(part => this._escapeHtml(part)).join('<br>');
            },

            _getQuestById(questId) {
                return (this.quests || []).find(q => q.id === questId);
            },

            _getQuestGiverByKey(targetId) {
                return this.creatures.find(c => String(c.id || c.name) === String(targetId) && c.quest);
            },

            acceptQuestFromUnit(targetId) {
                const giver = this._getQuestGiverByKey(targetId);
                if (!giver) return false;
                return this.acceptQuest(giver.quest, giver);
            },

            previewQuestFromUnit(targetId) {
                const giver = this._getQuestGiverByKey(targetId);
                if (!giver) return false;
                if (giver.questAccepted || this._getQuestById(giver.quest?.id)) {
                    this.showQuestLog();
                    return true;
                }
                return this.showQuestPreview(giver.quest, giver);
            },

            showQuestPreview(quest, giver = null) {
                const normalized = this._normalizeQuest(quest, giver);
                const targetKey = giver ? String(giver.id || giver.name || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'") : '';
                const title = this._escapeHtml(this._label('quest.previewTitle', 'Quest Preview'));
                const acceptLabel = this._escapeHtml(this._label('action.acceptQuest', 'Accept Quest'));
                const acceptTitle = this._escapeHtml(this._label('action.acceptQuestFrom', 'Accept quest from {name}', { name: giver?.name || normalized.giverName || normalized.title }));
                const closeLabel = this._escapeHtml(this._label('ui.close', 'Close'));
                let html = `<div class="quest-preview" style="max-width:720px;margin:0 auto;text-align:left;display:grid;gap:12px;">`;
                html += `<h3 style="color:var(--accent-primary);margin:0;">${title}: ${this._escapeHtml(normalized.title)}</h3>`;
                if (normalized.description) html += `<p style="color:var(--text-secondary);margin:0;">${this._escapeHtml(normalized.description)}</p>`;
                html += `<div class="option-card" style="cursor:default;text-align:left;"><div style="font-weight:700;color:var(--text-primary);margin-bottom:6px;">${this._escapeHtml(this._label('quest.objectives', 'Objectives'))}</div><div style="font-size:12px;line-height:1.6;color:var(--text-primary);">${this._questProgressText(normalized)}</div>`;
                for (const objective of normalized.objectives || []) {
                    const routePreview = this._questRoutePreviewText(objective);
                    const marker = this._nextQuestObjectiveMarker(objective);
                    if (routePreview || marker) {
                        html += `<div class="quest-route-preview" style="display:grid;gap:4px;font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5">${routePreview || this._escapeHtml(this._questMarkerPreview(marker, objective))}</div>`;
                    }
                }
                html += `</div>`;
                html += `<div class="option-card" style="cursor:default;text-align:left;"><div style="font-weight:700;color:var(--text-primary);margin-bottom:6px;">${this._escapeHtml(this._label('quest.rewards', 'Rewards'))}</div><div style="font-size:12px;line-height:1.6;color:var(--text-primary);">${this._questRewardPreviewText(normalized.reward)}</div></div>`;
                html += `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;"><button class="nav-btn primary" title="${acceptTitle}" aria-label="${acceptTitle}" onclick="App.acceptQuestFromUnit('${targetKey}')">📜 ${acceptLabel}</button><button class="nav-btn" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.renderCreatures();App.renderExplorationActions();">${closeLabel}</button></div>`;
                html += `</div>`;
                document.getElementById('scene-title').textContent = normalized.title;
                document.getElementById('scene-description').innerHTML = html;
                document.getElementById('scene-actions').innerHTML = '';
                return true;
            },

            acceptQuest(quest, giver = null) {
                const normalized = this._normalizeQuest(quest, giver);
                this.quests = this.quests || [];
                const existing = this._getQuestById(normalized.id);
                if (existing) {
                    this.log.push({ text: this._label('quest.alreadyInLog', '{title} is already in your quest log.', { title: existing.title }), type: 'discovery' });
                    this.showQuestLog();
                    this.renderLog();
                    return existing;
                }
                normalized.status = 'active';
                this.quests.push(normalized);
                if (giver) {
                    giver.questAccepted = true;
                    if (giver.quest) giver.quest.status = 'active';
                }
                this.log.push({ text: this._label('quest.accepted', 'Quest accepted: {title}.', { title: normalized.title }), type: 'discovery' });
                this.showQuestLog();
                this.renderLog();
                this.renderCreatures();
                this.autoSave();
                return normalized;
            },

            _questObjectiveMatches(type, payload, objective) {
                if (!objective || objective.complete || objective.type !== type) return false;
                if (objective.species && objective.species !== payload.species && objective.species !== payload.target?.species) return false;
                if (objective.targetId && String(objective.targetId) !== String(payload.targetId || payload.target?.id || payload.target?.name)) return false;
                if (objective.item && objective.item !== payload.item && objective.item !== payload.name) return false;
                if ((objective.type === 'escort' || objective.type === 'travel') && objective.location) {
                    if (Number(objective.location.x) !== Number(payload.x) || Number(objective.location.y) !== Number(payload.y)) return false;
                }
                return true;
            },

            _nextQuestCheckpoint(objective) {
                if (!objective || objective.complete || !Array.isArray(objective.checkpoints) || objective.checkpoints.length === 0) return null;
                return objective.checkpoints.find(checkpoint => !checkpoint.complete) || null;
            },

            _nextQuestObjectiveMarker(objective) {
                if (!objective || objective.complete) return null;
                return this._nextQuestCheckpoint(objective) || objective.location || null;
            },

            _updateQuestProgress(type, payload = {}) {
                let changed = false;
                for (const quest of this.quests || []) {
                    if (quest.status !== 'active') continue;
                    quest.rewardClaimed = Boolean(quest.rewardClaimed);
                    for (const objective of quest.objectives || []) {
                        if (!this._questObjectiveMatches(type, payload, objective)) continue;
                        if (objective.type === 'escort' && objective.checkpoints?.length) {
                            const checkpoint = this._nextQuestCheckpoint(objective);
                            if (!checkpoint || Number(checkpoint.x) !== Number(payload.x) || Number(checkpoint.y) !== Number(payload.y)) continue;
                            checkpoint.complete = true;
                        }
                        objective.progress = Math.min(objective.required, (objective.progress || 0) + (payload.count || 1));
                        objective.complete = objective.progress >= objective.required;
                        changed = true;
                    }
                    if ((quest.objectives || []).length > 0 && quest.objectives.every(o => o.complete) && quest.status !== 'completed') {
                        quest.status = 'completed';
                        if (quest.turnInRequired) {
                            this.log.push({ text: this._label('quest.completedTurnIn', 'Quest completed: {title}. Return to {giver} for your reward.', { title: quest.title, giver: quest.giverName || this._label('quest.defaultGiver', 'the quest giver') }), type: 'discovery' });
                        } else {
                            this._grantQuestReward(quest);
                            this.log.push({ text: this._label('quest.completed', 'Quest completed: {title}.', { title: quest.title }), type: 'discovery' });
                        }
                    }
                }
                if (changed) {
                    this.renderLog();
                    this.renderParty();
                    this.autoSave();
                }
                return changed;
            },

            _grantQuestReward(quest) {
                if (!quest || quest.rewardClaimed) return false;
                const reward = quest.reward || {};
                if (reward.xp) this.gainXP(reward.xp);
                if (reward.gold) this.player.gold = (this.player.gold || 0) + reward.gold;
                for (const itemName of reward.items || []) {
                    if (this.inventory.length < this.MAX_INVENTORY) {
                        this.inventory.push({ id: `quest_item_${this._stableIdPart(quest.id, 'quest')}_${this._stableIdPart(itemName)}_${this.inventory.length}`, name: itemName });
                    }
                }
                if (reward.recruit && this.party.length < this.MAX_PARTY_SIZE) {
                    const recruit = this._normalizeUnit({ ...reward.recruit }, { disposition: this.DISPOSITION.PARTY, ally: true, obedient: true, willing: true });
                    this.party.push(recruit);
                }
                quest.rewardClaimed = true;
                return true;
            },

            turnInQuest(questId) {
                const quest = this._getQuestById(questId);
                if (!quest || quest.status !== 'completed') {
                    this.log.push({ text: this._label('quest.notReadyTurnIn', 'That quest is not ready to turn in.'), type: 'discovery' });
                    this.renderLog();
                    return false;
                }
                if (quest.rewardClaimed) {
                    this.log.push({ text: this._label('quest.alreadyTurnedIn', '{title} has already been turned in.', { title: quest.title }), type: 'discovery' });
                    this.renderLog();
                    this.showQuestLog();
                    return false;
                }
                const granted = this._grantQuestReward(quest);
                if (granted) this.log.push({ text: this._label('quest.turnedIn', 'Quest turned in: {title}.', { title: quest.title }), type: 'loot' });
                this.renderLog();
                this.renderParty();
                this.showQuestLog();
                this.autoSave();
                return granted;
            },

            _questProgressText(quest) {
                return (quest.objectives || []).map(objective => {
                    const done = objective.complete ? '✓' : '•';
                    const checkpoint = this._nextQuestCheckpoint(objective);
                    const next = checkpoint ? ` → ${checkpoint.label} (${checkpoint.x}, ${checkpoint.y})` : '';
                    return `${done} ${this._escapeHtml(objective.label || this._questObjectiveLabel(objective))} (${objective.progress || 0}/${objective.required || 1})${this._escapeHtml(next)}`;
                }).join('<br>');
            },

            _questRoutePreviewText(objective) {
                if (!Array.isArray(objective?.checkpoints) || objective.checkpoints.length === 0) return '';
                const next = this._nextQuestCheckpoint(objective);
                return objective.checkpoints.map((checkpoint, index) => {
                    const state = checkpoint.complete ? 'complete' : (next === checkpoint ? 'current' : 'pending');
                    const marker = state === 'complete' ? '✓' : (state === 'current' ? '→' : '•');
                    const label = checkpoint.label || this._label('quest.checkpoint', 'Checkpoint');
                    const stateLabel = this._questCheckpointStateLabel(state);
                    const bg = state === 'current' ? 'var(--bg-elevated)' : 'transparent';
                    const border = state === 'current' ? 'var(--accent-primary)' : (state === 'complete' ? 'var(--accent-success)' : 'var(--border-subtle)');
                    const color = state === 'complete' ? 'var(--accent-success)' : (state === 'current' ? 'var(--text-primary)' : 'var(--text-muted)');
                    const guidance = state === 'current' ? this._questCheckpointGuidance(checkpoint) : '';
                    const guidanceHtml = guidance ? `<span style="color:var(--accent-primary);font-size:10px;">${this._escapeHtml(guidance)}</span>` : '';
                    const ariaGuidance = guidance ? `, ${guidance}` : '';
                    const ariaLabel = this._label('quest.checkpointAria', '{state} checkpoint {index}: {label} at {x}, {y}{guidance}', {
                        state: stateLabel,
                        index: index + 1,
                        label,
                        x: checkpoint.x,
                        y: checkpoint.y,
                        guidance: ariaGuidance
                    });
                    return `<div class="quest-route-step ${state}" aria-label="${this._escapeHtml(ariaLabel)}" style="display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid ${border};border-radius:var(--radius-sm);background:${bg};color:${color};"><span aria-hidden="true">${marker}</span><span>${this._escapeHtml(label)}</span>${guidanceHtml}<span style="margin-left:auto;color:var(--text-muted);">(${checkpoint.x}, ${checkpoint.y})</span></div>`;
                }).join('');
            },

            _questCheckpointStateLabel(state) {
                if (state === 'complete') return this._label('quest.checkpoint.complete', 'Complete');
                if (state === 'current') return this._label('quest.checkpoint.current', 'Current');
                return this._label('quest.checkpoint.pending', 'Pending');
            },

            _questCheckpointGuidance(checkpoint) {
                const dx = Number(checkpoint?.x ?? 0) - Number(this.location?.x ?? 0);
                const dy = Number(checkpoint?.y ?? 0) - Number(this.location?.y ?? 0);
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance === 0) return this._label('quest.youAreHere', 'You are here');
                const directions = [];
                if (dy < 0) directions.push(this._label('quest.direction.north', '{count} north', { count: Math.abs(dy) }));
                if (dy > 0) directions.push(this._label('quest.direction.south', '{count} south', { count: Math.abs(dy) }));
                if (dx > 0) directions.push(this._label('quest.direction.east', '{count} east', { count: Math.abs(dx) }));
                if (dx < 0) directions.push(this._label('quest.direction.west', '{count} west', { count: Math.abs(dx) }));
                const terrain = this._questRouteTerrainHint(checkpoint);
                const stepLabel = this._label(distance === 1 ? 'quest.step.singular' : 'quest.step.plural', distance === 1 ? 'step' : 'steps');
                const guidance = this._label('quest.guidance', '{distance} {stepLabel} {directions}', {
                    distance,
                    stepLabel,
                    directions: directions.join(', ')
                });
                return `${guidance}${terrain ? `; ${terrain}` : ''}`;
            },

            _questRouteKnownTiles(checkpoint) {
                const targetX = Number(checkpoint?.x ?? 0);
                const targetY = Number(checkpoint?.y ?? 0);
                let x = Number(this.location?.x ?? 0);
                let y = Number(this.location?.y ?? 0);
                const tiles = [];
                const stepX = targetX === x ? 0 : (targetX > x ? 1 : -1);
                while (x !== targetX) {
                    x += stepX;
                    const tile = this.worldMap?.get(this._tileKey(x, y));
                    if (tile) tiles.push(tile);
                }
                const stepY = targetY === y ? 0 : (targetY > y ? 1 : -1);
                while (y !== targetY) {
                    y += stepY;
                    const tile = this.worldMap?.get(this._tileKey(x, y));
                    if (tile) tiles.push(tile);
                }
                return tiles;
            },

            _questRouteTerrainHint(checkpoint) {
                const knownTiles = this._questRouteKnownTiles(checkpoint);
                if (!knownTiles.length) return '';
                const counts = knownTiles.reduce((acc, tile) => {
                    const biomeId = tile?.biome;
                    const role = this.biomes[biomeId]?.role || 'region';
                    if (role === 'route' || biomeId === 'road') acc.road += 1;
                    if (biomeId === 'bridge') acc.bridge += 1;
                    if (['water', 'swamp', 'cave'].includes(biomeId)) acc.rough += 1;
                    return acc;
                }, { road: 0, bridge: 0, rough: 0 });
                const notes = [];
                if (counts.road || counts.bridge) {
                    const routeParts = [];
                    if (counts.road) routeParts.push(this._label('quest.terrainRoad', '{count} road', { count: counts.road }));
                    if (counts.bridge) routeParts.push(this._label('quest.terrainBridge', '{count} bridge', { count: counts.bridge }));
                    notes.push(this._label('quest.terrainKnownRoute', 'known route crosses {parts}', { parts: routeParts.join(', ') }));
                }
                if (counts.rough) notes.push(this._label('quest.terrainRough', '{count} rough terrain', { count: counts.rough }));
                return notes.join('; ');
            },

            focusQuestOnMap(questId, objectiveId) {
                const quest = (this.quests || []).find(entry => String(entry.id) === String(questId));
                const objective = (quest?.objectives || []).find(entry => String(entry.id) === String(objectiveId)) || (quest?.objectives || []).find(entry => !entry.complete);
                const marker = this._nextQuestObjectiveMarker(objective);
                if (!quest || !marker) {
                    this.log.push({ text: this._label('quest.noObjectiveMarker', 'No map marker is available for that quest objective.'), type: 'discovery' });
                    this.renderLog();
                    return false;
                }
                this.largeMapOffset = {
                    x: Number(marker.x) - Number(this.location.x || 0),
                    y: Number(marker.y) - Number(this.location.y || 0)
                };
                this.renderLargeMap();
                this.log.push({ text: this._label('quest.mapFocusedObjective', 'Map focused on {title}: {label}.', { title: quest.title, label: marker.label || objective.label || this._questObjectiveLabel(objective) }), type: 'discovery' });
                this.renderLog();
                return true;
            },

            _questTurnInMarker(quest) {
                const location = quest?.giverLocation;
                if (!location || !Number.isFinite(Number(location.x)) || !Number.isFinite(Number(location.y))) return null;
                return {
                    x: Number(location.x),
                    y: Number(location.y),
                    label: location.label || quest.giverName || 'Quest giver'
                };
            },

            focusQuestTurnInOnMap(questId) {
                const quest = (this.quests || []).find(entry => String(entry.id) === String(questId));
                const marker = this._questTurnInMarker(quest);
                if (!quest || !marker) {
                    this.log.push({ text: this._label('quest.noTurnInLocation', 'No turn-in location is available for that quest.'), type: 'discovery' });
                    this.renderLog();
                    return false;
                }
                this.largeMapOffset = {
                    x: Number(marker.x) - Number(this.location.x || 0),
                    y: Number(marker.y) - Number(this.location.y || 0)
                };
                this.renderLargeMap();
                this.log.push({ text: this._label('quest.mapFocusedTurnIn', 'Map focused on {title} turn-in: {label}.', { title: quest.title, label: marker.label }), type: 'discovery' });
                this.renderLog();
                return true;
            },

            _filteredQuestEntries() {
                const filter = ['all', 'active', 'completed', 'turn-in'].includes(this.questFilter) ? this.questFilter : 'all';
                const sort = ['status', 'title'].includes(this.questSort) ? this.questSort : 'status';
                const quests = (this.quests || []).filter(quest => {
                    if (filter === 'all') return true;
                    if (filter === 'turn-in') return quest.status === 'completed' && quest.turnInRequired && !quest.rewardClaimed;
                    return quest.status === filter;
                });
                return quests.sort((a, b) => {
                    if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
                    const weight = quest => quest.status === 'active' ? 0 : (quest.status === 'completed' && quest.turnInRequired && !quest.rewardClaimed) ? 1 : quest.status === 'completed' ? 2 : 3;
                    return weight(a) - weight(b) || (a.title || '').localeCompare(b.title || '');
                });
            },

            _questLogControls() {
                const statusLabel = this._escapeHtml(this._label('quest.status', 'Status'));
                const sortLabel = this._escapeHtml(this._label('quest.sort', 'Sort'));
                const filterOptions = [
                    ['all', this._label('quest.filter.all', 'All')],
                    ['active', this._label('quest.filter.active', 'Active')],
                    ['turn-in', this._label('quest.filter.turnIn', 'Turn In')],
                    ['completed', this._label('quest.filter.completed', 'Completed')]
                ];
                const sortOptions = [
                    ['status', this._label('quest.sort.status', 'Status')],
                    ['title', this._label('quest.sort.title', 'Title')]
                ];
                return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px;">
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">${statusLabel}
                        <select class="nav-btn" style="padding:4px 8px;font-size:11px;" title="${statusLabel}" aria-label="${statusLabel}" onchange="App.setQuestFilter(this.value)">
                            ${filterOptions.map(([value, label]) => `<option value="${value}" ${this.questFilter === value ? 'selected' : ''}>${this._escapeHtml(label)}</option>`).join('')}
                        </select>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">${sortLabel}
                        <select class="nav-btn" style="padding:4px 8px;font-size:11px;" title="${sortLabel}" aria-label="${sortLabel}" onchange="App.setQuestSort(this.value)">
                            ${sortOptions.map(([value, label]) => `<option value="${value}" ${this.questSort === value ? 'selected' : ''}>${this._escapeHtml(label)}</option>`).join('')}
                        </select>
                    </label>
                </div>`;
            },

            _questStatusLabel(quest) {
                const needsTurnIn = quest.status === 'completed' && quest.turnInRequired && !quest.rewardClaimed;
                if (needsTurnIn) return this._label('quest.status.turnIn', 'Turn In');
                if (quest.status === 'completed') return this._label('quest.status.completed', 'Completed');
                return this._label('quest.status.active', 'Active');
            },

            _questMarkerPreview(marker, objective) {
                const label = marker.label || objective.label || this._questObjectiveLabel(objective);
                return this._label('quest.markerPreview', 'Marker: {label} ({x}, {y})', { label, x: marker.x, y: marker.y });
            },

            _questTurnInPreview(marker) {
                return this._label('quest.turnInPreview', 'Turn in with {label} ({x}, {y})', { label: marker.label, x: marker.x, y: marker.y });
            },

            setQuestFilter(filter) {
                this.questFilter = ['all', 'active', 'turn-in', 'completed'].includes(filter) ? filter : 'all';
                this.showQuestLog();
            },

            setQuestSort(sort) {
                this.questSort = ['status', 'title'].includes(sort) ? sort : 'status';
                this.showQuestLog();
            },

            showQuestLog() {
                const quests = this.quests || [];
                const titleLabel = this._escapeHtml(this._label('quest.title', 'Quests'));
                const backLabel = this._escapeHtml(this._label('inventory.back', 'Back'));
                const backButton = `<button class="nav-btn" style="margin-top:12px" title="${backLabel}" aria-label="${backLabel}" onclick="App.showExplorationActions()">${backLabel}</button>`;
                if (quests.length === 0) {
                    document.getElementById('scene-description').innerHTML = `<h3>${titleLabel}</h3><p style="color:var(--text-muted)">${this._escapeHtml(this._label('quest.noneActive', 'No active quests.'))}</p>${backButton}`;
                    return;
                }
                const visibleQuests = this._filteredQuestEntries();
                let html = `<h3>${titleLabel}</h3>${this._questLogControls()}`;
                if (visibleQuests.length === 0) {
                    html += `<p style="color:var(--text-muted);margin-top:12px;">${this._escapeHtml(this._label('quest.noneMatchFilter', 'No quests match the current filter.'))}</p>${backButton}`;
                    document.getElementById('scene-description').innerHTML = html;
                    return;
                }
                html += `<div style="display:grid;gap:12px;margin-top:12px;">`;
                visibleQuests.forEach(quest => {
                    const needsTurnIn = quest.status === 'completed' && quest.turnInRequired && !quest.rewardClaimed;
                    const status = this._escapeHtml(this._questStatusLabel(quest));
                    html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="font-weight:700;color:var(--text-primary)">${this._escapeHtml(quest.title)} <span style="font-size:11px;color:var(--text-muted)">[${status}]</span></div>`;
                    if (quest.description) html += `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${this._escapeHtml(quest.description)}</div>`;
                    html += `<div style="font-size:12px;color:var(--text-primary);margin-top:8px;line-height:1.6">${this._questProgressText(quest)}</div>`;
                    for (const objective of quest.objectives || []) {
                        const routePreview = this._questRoutePreviewText(objective);
                        const marker = this._nextQuestObjectiveMarker(objective);
                        if (!routePreview && !marker) continue;
                        html += `<div class="quest-route-preview" style="display:grid;gap:4px;font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5">${routePreview || this._escapeHtml(this._questMarkerPreview(marker, objective))}</div>`;
                        if (marker && quest.status === 'active') {
                            const showMapLabel = this._escapeHtml(this._label('quest.showOnMap', 'Show On Map'));
                            const showMapTitle = this._escapeHtml(this._label('quest.showOnMapFor', 'Show {name} on map', { name: quest.title }));
                            html += `<button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${showMapTitle}" aria-label="${showMapTitle}" onclick="App.focusQuestOnMap('${String(quest.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}','${String(objective.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')">${showMapLabel}</button>`;
                        }
                    }
                    if (needsTurnIn) {
                        const turnInMarker = this._questTurnInMarker(quest);
                        if (turnInMarker) {
                            const guidance = this._questCheckpointGuidance(turnInMarker);
                            html += `<div class="quest-route-preview" style="display:grid;gap:4px;font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5">${this._escapeHtml(this._questTurnInPreview(turnInMarker))}${guidance ? ` · ${this._escapeHtml(guidance)}` : ''}</div>`;
                            const showTurnInLabel = this._escapeHtml(this._label('quest.showTurnIn', 'Show Turn-In'));
                            const showTurnInTitle = this._escapeHtml(this._label('quest.showTurnInFor', 'Show turn-in for {name}', { name: quest.title }));
                            html += `<button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${showTurnInTitle}" aria-label="${showTurnInTitle}" onclick="App.focusQuestTurnInOnMap('${String(quest.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')">${showTurnInLabel}</button>`;
                        }
                        const turnInLabel = this._escapeHtml(this._label('quest.turnIn', 'Turn In'));
                        const turnInTitle = this._escapeHtml(this._label('quest.turnInQuest', 'Turn in {name}', { name: quest.title }));
                        html += `<button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" title="${turnInTitle}" aria-label="${turnInTitle}" onclick="App.turnInQuest('${String(quest.id).replace(/'/g, "\\'")}')">${turnInLabel}</button>`;
                    }
                    html += `</div>`;
                });
                html += `</div>${backButton}`;
                document.getElementById('scene-description').innerHTML = html;
            },

            // ===== EQUIPMENT =====
            _getItemDef(item) {
                return this.ITEMS[item?.name] || {};
            },

            _isEquippable(item) {
                const def = this._getItemDef(item);
                return def.type === 'equipment' && Boolean(def.slot);
            },

            _applyEquipmentBonus(unit, item, direction = 1) {
                const bonus = this._getItemDef(item).equipBonus || {};
                for (const [stat, amount] of Object.entries(bonus)) {
                    unit[stat] = (unit[stat] || 0) + amount * direction;
                }
            },

            _equipmentBonusTotals(unit) {
                const totals = {};
                for (const item of Object.values(unit?.equipment || {})) {
                    if (!item) continue;
                    const bonus = this._getItemDef(item).equipBonus || {};
                    for (const [stat, amount] of Object.entries(bonus)) {
                        totals[stat] = (totals[stat] || 0) + amount;
                    }
                }
                return totals;
            },

            _captureEquipmentBaseStats(unit, { inferBase = false } = {}) {
                if (!unit) return {};
                const totals = inferBase ? this._equipmentBonusTotals(unit) : {};
                const base = {};
                for (const stat of this.EQUIPMENT_STAT_KEYS) {
                    const current = unit[stat];
                    if (typeof current === 'number') base[stat] = current - (totals[stat] || 0);
                }
                return base;
            },

            _applyEquipmentEffect(unit, item, direction = 1) {
                const effect = this._getItemDef(item).equipEffect;
                if (!effect) return;
                unit.equipmentEffects = unit.equipmentEffects || {};
                const next = (unit.equipmentEffects[effect] || 0) + direction;
                if (next > 0) unit.equipmentEffects[effect] = next;
                else delete unit.equipmentEffects[effect];
            },

            _hasEquipmentEffect(unit, effect) {
                return Boolean(unit?.equipmentEffects?.[effect]);
            },

            _rebuildEquipmentEffects(unit) {
                if (!unit) return;
                unit.equipmentEffects = {};
                for (const item of Object.values(unit.equipment || {})) {
                    if (item) this._applyEquipmentEffect(unit, item, 1);
                }
            },

            _recalculateEquipment(unit, { inferBase = false } = {}) {
                if (!unit) return;
                unit.equipment = unit.equipment || {};
                for (const slot of Object.keys(this.EQUIPMENT_SLOTS)) {
                    if (!(slot in unit.equipment)) unit.equipment[slot] = null;
                }
                if (!unit.equipmentBaseStats) {
                    unit.equipmentBaseStats = this._captureEquipmentBaseStats(unit, { inferBase });
                }
                for (const [stat, value] of Object.entries(unit.equipmentBaseStats || {})) {
                    if (typeof value === 'number') unit[stat] = value;
                }
                for (const item of Object.values(unit.equipment || {})) {
                    if (item) this._applyEquipmentBonus(unit, item, 1);
                }
                this._rebuildEquipmentEffects(unit);
            },

            equipItem(itemId) {
                if (!this.player) return;
                const item = this.inventory.find(i => String(i.id) === String(itemId));
                if (!item || !this._isEquippable(item)) return;
                const def = this._getItemDef(item);
                const slot = def.slot;
                this.player.equipment = this.player.equipment || {};
                if (!this.player.equipmentBaseStats) this.player.equipmentBaseStats = this._captureEquipmentBaseStats(this.player);
                const current = this.player.equipment[slot];
                if (current) {
                    this.inventory.push(current);
                }
                this.inventory = this.inventory.filter(i => String(i.id) !== String(itemId));
                this.player.equipment[slot] = item;
                this._recalculateEquipment(this.player);
                this.log.push({ text: this._label('inventory.equipped', 'Equipped {name}.', { name: item.name }), type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.showInventory();
                this.autoSave();
            },

            unequipItem(slot) {
                if (!this.player?.equipment || !this.player.equipment[slot]) return;
                if (this.inventory.length >= this.MAX_INVENTORY) {
                    this.log.push({ text: this._label('inventory.full', 'Inventory is full.'), type: 'discovery' });
                    this.renderLog();
                    return;
                }
                const item = this.player.equipment[slot];
                this.player.equipment[slot] = null;
                this._recalculateEquipment(this.player);
                this.inventory.push(item);
                this.log.push({ text: this._label('inventory.unequipped', 'Unequipped {name}.', { name: item.name }), type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.showInventory();
                this.autoSave();
            },

            _equipmentSummary(unit = this.player) {
                const equipment = unit?.equipment || {};
                return Object.entries(this.EQUIPMENT_SLOTS).map(([slot, label]) => {
                    const item = equipment[slot];
                    return `${this._escapeHtml(label)}: ${item ? this._escapeHtml(item.name) : this._escapeHtml(this._label('save.empty', 'Empty'))}`;
                }).join('<br>');
            },
            _equipmentCompactSummary(unit = this.player) {
                const equipment = unit?.equipment || {};
                const equipped = Object.entries(this.EQUIPMENT_SLOTS)
                    .map(([slot, label]) => {
                        const item = equipment[slot];
                        return item ? `${label}: ${item.name}` : '';
                    })
                    .filter(Boolean);
                return equipped.length ? equipped.map(entry => this._escapeHtml(entry)).join('<br>') : this._escapeHtml(this._label('inventory.noEquipment', 'No equipment'));
            },

            _equipmentBonusText(item) {
                const bonus = this._getItemDef(item).equipBonus || {};
                const entries = Object.entries(bonus).map(([stat, amount]) => `${stat.toUpperCase()} ${amount >= 0 ? '+' : ''}${amount}`);
                const effect = this._getItemDef(item).equipEffect;
                if (effect) entries.push(`${this._label('inventory.effect', 'Effect')}: ${effect}`);
                return entries.length ? entries.join(', ') : this._label('inventory.noBonus', 'No bonus');
            },

            // ===== INVENTORY =====
            showInventory() {
                const backLabel = this._escapeHtml(this._label('inventory.back', 'Back'));
                const backButton = `<button class="nav-btn" style="margin-top:12px" title="${backLabel}" aria-label="${backLabel}" onclick="App.showExplorationActions()">${backLabel}</button>`;
                const title = this._escapeHtml(this._label('inventory.titleWithCount', 'Inventory ({count}/{max})', { count: this.inventory.length, max: this.MAX_INVENTORY }));
                const equippedLabel = this._escapeHtml(this._label('inventory.equippedSection', 'Equipped'));
                let html = `<h3>${title}</h3>`;
                html += `<div class="option-card" style="text-align:left;cursor:default;margin-top:12px;"><div style="font-weight:700;color:var(--text-primary)">${equippedLabel}</div><div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:6px">${this._equipmentSummary()}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">`;
                Object.entries(this.EQUIPMENT_SLOTS).forEach(([slot, label]) => {
                    const equipped = this.player?.equipment?.[slot];
                    if (equipped) {
                        const unequipTitle = this._escapeHtml(this._label('inventory.unequipSlot', 'Unequip {slot}', { slot: label }));
                        const unequipLabel = this._escapeHtml(`${this._label('inventory.unequip', 'Unequip')} ${label}`);
                        html += `<button class="nav-btn" style="padding:4px 8px;font-size:11px" title="${unequipTitle}" aria-label="${unequipTitle}" onclick="App.unequipItem('${slot}')">${unequipLabel}</button>`;
                    }
                });
                html += `</div></div>`;
                if (this.inventory.length === 0) {
                    html += `<p style="color:var(--text-muted);margin-top:12px;">${this._escapeHtml(this._label('inventory.empty', 'Empty.'))}</p>${backButton}`;
                    document.getElementById('scene-description').innerHTML = html;
                    return;
                }
                html += this._itemListOptions('Inventory');
                const entries = this._filterAndSortItemEntries(this.inventory.map((item, index) => ({ item, index })), this.inventoryFilter, this.inventorySort);
                if (entries.length === 0) {
                    html += `<p style="color:var(--text-muted);margin-top:12px;">${this._escapeHtml(this._label('inventory.noItemsMatch', 'No items match the current filter.'))}</p>${backButton}`;
                    document.getElementById('scene-description').innerHTML = html;
                    return;
                }
                html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px;">`;
                entries.forEach(({ item }) => {
                    const def = this.ITEMS[item.name] || { icon: '?', desc: 'Unknown' };
                    const canUse = def.effect === 'heal' || def.effect === 'buff' || def.effect === 'damage';
                    const canEquip = this._isEquippable(item);
                    html += `<div class="option-card" style="text-align:left;cursor:default;">`;
                    html += `<div style="font-size:24px">${def.icon}</div><div style="font-weight:600;color:var(--text-primary)">${item.name}</div>`;
                    html += `<div style="font-size:11px;color:var(--text-muted);margin:4px 0">${def.type || 'misc'} · ${def.desc}${canEquip ? '<br>' + this._equipmentBonusText(item) : ''}</div><div style="display:flex;gap:8px;margin-top:8px">`;
                    const itemKey = String(item.id).replace(/'/g, "\\'");
                    const useLabel = this._escapeHtml(this._label('inventory.use', 'Use'));
                    const equipLabel = this._escapeHtml(this._label('inventory.equip', 'Equip'));
                    const dropLabel = this._escapeHtml(this._label('inventory.drop', 'Drop'));
                    const useTitle = this._escapeHtml(this._label('inventory.useItem', 'Use {name}', { name: item.name }));
                    const equipTitle = this._escapeHtml(this._label('inventory.equipItem', 'Equip {name}', { name: item.name }));
                    const dropTitle = this._escapeHtml(this._label('inventory.dropItem', 'Drop {name}', { name: item.name }));
                    if (canUse) html += `<button class="nav-btn" style="flex:1;padding:4px 8px;font-size:11px" title="${useTitle}" aria-label="${useTitle}" onclick="App.useItem('${itemKey}')">${useLabel}</button>`;
                    if (canEquip) html += `<button class="nav-btn" style="flex:1;padding:4px 8px;font-size:11px" title="${equipTitle}" aria-label="${equipTitle}" onclick="App.equipItem('${String(item.id).replace(/'/g, "\\'")}')">${equipLabel}</button>`;
                    html += `<button class="nav-btn" style="padding:4px 8px;font-size:11px;color:var(--accent-danger)" title="${dropTitle}" aria-label="${dropTitle}" onclick="App.dropItem('${itemKey}')">${dropLabel}</button></div></div>`;
                });
                html += `</div>${backButton}`;
                document.getElementById('scene-description').innerHTML = html;
            },
            setInventoryFilter(filter) {
                this.inventoryFilter = ['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].includes(filter) ? filter : 'all';
                this.showInventory();
            },
            setInventorySort(sort) {
                this.inventorySort = ['name', 'type', 'value-desc', 'value-asc'].includes(sort) ? sort : 'name';
                this.showInventory();
            },
            useItem(itemId) { /* simplified */ },
            dropItem(itemId) { this.inventory = this.inventory.filter(i => i.id !== itemId); this.showInventory(); this.autoSave(); },

            // ===== RENDERING =====
            renderParty() {
                this._syncPlayerPartyReference();
                const container = document.getElementById('party-content');
                if (container) {
                    const tray = this._renderPanelInteractionTray();
                    container.innerHTML = `${tray}${this.party.map((unit, i) => this.renderUnitCard(unit, i, 'party')).join('')}`;
                }
                this.renderMobilePartyStrip();
            },
            renderCreatures() {
                const container = document.getElementById('enemies-content');
                const title = document.getElementById('enemies-title');
                const mobileTitle = document.getElementById('mobile-creature-title');
                let titleText = this._label('ui.area', 'Area');
                const living = this.creatures.filter(c => !this._isCorpse(c));
                const corpses = this.creatures.filter(c => this._isCorpse(c));
                if (title) {
                    const enemies = living.filter(c => c.disposition === this.DISPOSITION.ENEMY);
                    const friendlies = living.filter(c => c.disposition !== this.DISPOSITION.ENEMY);
                    if (enemies.length > 0) titleText = this._label('ui.enemies', 'Enemies');
                    else if (friendlies.length > 0) titleText = this._label('ui.creatures', 'Creatures');
                    else if (corpses.length > 0) titleText = this._label('disposition.remains', 'Remains');
                    title.textContent = titleText;
                }
                if (mobileTitle) mobileTitle.textContent = titleText;
                if (container) {
                    let html = living.map((unit, i) => this.renderUnitCard(unit, this.creatures.indexOf(unit), 'creature')).join('');
                    if (corpses.length > 0) {
                        html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);"><div style="color:var(--text-muted);font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">${this._escapeHtml(this._label('disposition.remains', 'Remains'))}</div>`;
                        html += corpses.map(unit => this.renderUnitCard(unit, this.creatures.indexOf(unit), 'creature')).join('');
                        html += '</div>';
                    }
                    container.innerHTML = html || `<p style="color: var(--text-muted); text-align: center;">${this._escapeHtml(this._label('ui.noCreaturesPresent', 'No creatures present'))}</p>`;
                }
                this.renderMobileCreatureStrip();
            },
            renderMobilePartyStrip() {
                const strip = document.getElementById('mobile-party-strip');
                if (!strip) return;
                strip.innerHTML = `${this._renderPanelInteractionTray()}${this.party.map((unit, i) => this.renderMobileUnitChip(unit, i, 'party')).join('')}`;
            },
            renderMobileCreatureStrip() {
                const strip = document.getElementById('mobile-creature-strip');
                const card = document.getElementById('mobile-creature-card');
                if (!strip) return;
                const living = this.creatures.filter(c => c.CPun > 0 && !this._isCorpse(c));
                const corpses = this.creatures.filter(c => this._isCorpse(c));
                const visible = [...living, ...corpses];
                if (card) card.style.display = visible.length > 0 || this.combatState.active ? 'block' : 'none';
                strip.innerHTML = visible.length > 0
                    ? visible.map(unit => this.renderMobileUnitChip(unit, this.creatures.indexOf(unit), 'creature')).join('')
                    : `<div style="color:var(--text-muted);font-size:12px;padding:6px;">${this._escapeHtml(this._label('ui.noCreaturesHere', 'No creatures here'))}</div>`;
            },
            _currentCombatActor() {
                if (!this.combatState?.active) return null;
                return this.combatState.turnQueue?.[this.combatState.currentTurn]?.unit || null;
            },
            _mobileCombatPrompt(actor = this._currentCombatActor()) {
                if (!this.combatState?.active) return '';
                if (actor && (actor === this.player || this.party.includes(actor))) {
                    return this._label('mobile.combat.chooseAction', 'Choose an action, then tap a target.');
                }
                if (actor) {
                    return this._label('mobile.combat.enemyTurn', '{name} is acting.', { name: actor.name || this._label('ui.creatures', 'Creatures') });
                }
                return this._label('ui.chooseAction', 'Choose your next action.');
            },
            renderMobileCombatToolbelt() {
                const surface = document.getElementById('mobile-play-surface');
                const belt = document.getElementById('mobile-combat-toolbelt');
                const active = Boolean(this.combatState?.active);
                if (surface?.classList) surface.classList.toggle('combat-active', active);
                if (!belt) return '';
                if (!active) {
                    belt.className = 'mobile-combat-toolbelt';
                    belt.innerHTML = '';
                    return '';
                }
                const actor = this._currentCombatActor();
                const round = this.combatState.round || 1;
                const turn = (this.combatState.currentTurn ?? 0) + 1;
                const total = Math.max(1, this.combatState.turnQueue?.length || 1);
                const actorName = actor?.name || this._label('ui.creatures', 'Creatures');
                const status = this._label('mobile.combat.status', 'Round {round} · Turn {turn}/{total}', { round, turn, total });
                const title = this._label('mobile.combat.actor', '{name} to act', { name: actorName });
                const prompt = this._mobileCombatPrompt(actor);
                const html = `<div class="mobile-combat-status"><strong>${this._escapeHtml(title)}</strong><span>${this._escapeHtml(status)}</span></div><div class="mobile-combat-prompt">${this._escapeHtml(prompt)}</div>`;
                belt.className = 'mobile-combat-toolbelt active';
                belt.innerHTML = html;
                return html;
            },
            _unitBarPercent(current, max) {
                const safeMax = Number(max);
                if (!Number.isFinite(safeMax) || safeMax <= 0) return 0;
                const value = Number(current);
                if (!Number.isFinite(value)) return 0;
                return Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));
            },
            _unitTacticalBar(key, label, icon, current, max) {
                const percent = this._unitBarPercent(current, max);
                const title = this._escapeHtml(`${label}: ${percent}%`);
                return `<div class="unit-bar unit-bar-${key}" title="${title}" aria-label="${title}"><span class="unit-bar-icon" aria-hidden="true">${icon}</span><span class="unit-bar-track" aria-hidden="true"><span class="unit-bar-fill" style="width:${percent}%"></span></span>${this._srOnly(title)}</div>`;
            },
            _unitTacticalBars(unit, options = {}) {
                const stats = this._unitDisplayStats(unit || {});
                const compact = Boolean(options.compact);
                const healthLabel = this._label('party.punishment', 'Punishment');
                const pleasureLabel = this._label('party.pleasure', 'Pleasure');
                const hungerLabel = this._label('party.hunger', 'Hunger');
                const maxHunger = unit?.maxHunger || 100;
                const hunger = unit?.hunger ?? 0;
                const bars = [
                    this._unitTacticalBar('health', healthLabel, compact ? '❤' : '❤', stats.CPun, stats.MPun),
                    this._unitTacticalBar('pleasure', pleasureLabel, compact ? '✦' : '✦', stats.CPle, stats.MPle),
                    this._unitTacticalBar('hunger', hungerLabel, compact ? '🍖' : '🍖', hunger, maxHunger)
                ].join('');
                return `<div class="unit-bars${compact ? ' compact' : ''}" aria-label="${this._escapeHtml(this._label('ui.tacticalStatus', 'Tactical status'))}">${bars}</div>`;
            },
            _unitVisibleTraits(unit, type, limit = 3) {
                if (!unit) return [];
                const stats = this._unitDisplayStats(unit || {});
                const maxHunger = unit.maxHunger || 100;
                const hunger = unit.hunger ?? 0;
                const status = unit.status || {};
                const chips = [];
                const add = (key, label, tone = 'neutral') => {
                    if (!chips.some(chip => chip.key === key)) chips.push({ key, label, tone });
                };
                if (status.sleep || unit.asleep) add('asleep', this._label('unit.trait.asleep', 'Asleep'), 'status');
                if (status.poisoned) add('poisoned', this._label('unit.trait.poisoned', 'Poison'), 'danger');
                if (status.burn) add('burning', this._label('unit.trait.burning', 'Burning'), 'danger');
                if (status.bleed) add('bleeding', this._label('unit.trait.bleeding', 'Bleeding'), 'danger');
                if (status.stun) add('stunned', this._label('unit.trait.stunned', 'Stunned'), 'status');
                if (status.freeze) add('frozen', this._label('unit.trait.frozen', 'Frozen'), 'status');
                if (status.fear) add('fear', this._label('unit.trait.fear', 'Fear'), 'status');
                if (status.restrained || status.enveloped || status.stuck) add('restrained', this._label('unit.trait.restrained', 'Restrained'), 'status');
                if (stats.MPun > 0 && stats.CPun <= stats.MPun * 0.35) add('wounded', this._label('unit.trait.wounded', 'Wounded'), 'danger');
                if (maxHunger > 0 && hunger >= maxHunger * 0.7) add('hungry', this._label('unit.trait.hungry', 'Hungry'), 'need');
                if (type === 'party') {
                    const role = this._getPartyRole(unit);
                    if (role && role !== 'companion') add(`role-${role}`, this._partyRoleLabel(role), 'role');
                } else {
                    if (unit.disposition === this.DISPOSITION.MERCHANT) add('merchant', this._label('disposition.merchant', 'Merchant'), 'special');
                    else if (unit.quest) add('quest', this._label('disposition.quest', 'Quest'), 'special');
                    else if (unit.disposition === this.DISPOSITION.FRIENDLY) add('friendly', this._label('disposition.friendly', 'Friendly'), 'relation');
                    else if (unit.disposition === this.DISPOSITION.NEUTRAL) add('neutral', this._label('disposition.neutral', 'Neutral'), 'relation');
                    else if (unit.disposition === this.DISPOSITION.ENEMY) add('hostile', this._label('disposition.hostile', 'Hostile'), 'danger');
                }
                if (unit.flying) add('flying', this._label('unit.trait.flying', 'Flying'), 'ability');
                if (unit.darkvision) add('darkvision', this._label('unit.trait.darkvision', 'Darkvision'), 'ability');
                if (unit.sapience === 'person' || unit.speciesTraits?.includes('person')) add('person', this._label('unit.trait.person', 'Person'), 'special');
                return chips.slice(0, Math.max(0, limit));
            },
            _unitTraitChips(unit, type, limit = 3) {
                const chips = this._unitVisibleTraits(unit, type, limit);
                if (chips.length === 0) return '';
                const label = this._escapeHtml(this._label('ui.unitTraits', 'Unit traits'));
                const items = chips.map(chip => `<span class="unit-trait-chip ${this._escapeHtml(chip.tone)}" title="${this._escapeHtml(chip.label)}">${this._escapeHtml(chip.label)}</span>`).join('');
                return `<div class="unit-traits" aria-label="${label}">${items}</div>`;
            },
            _unitSelectionRoles(unit, type) {
                if (!unit) return [];
                const roles = [];
                if (this.combatState?.active) {
                    if (type === 'party' && this._isCurrentCombatActor(unit)) roles.push('actor');
                    if (type === 'party' && this._isSyncParticipant(unit) && !roles.includes('actor')) roles.push('actor');
                    if (type === 'creature' && this.targetSelection?.source === 'combat' && this.canSelectCreatureTarget(unit)) roles.push('target');
                    if (type === 'creature' && this.syncSelection?.active && this.syncSelection.phase === 'target' && this.canSelectCreatureTarget(unit)) roles.push('target');
                    return roles;
                }
                if (type === 'party' && this._getExplorationActors().includes(unit)) {
                    roles.push('actor');
                }
                const id = type === 'creature' ? String(unit.id || unit.name || '') : this._unitSelectionId(unit);
                if (this._isExplorationTarget(type, id)) {
                    roles.push('target');
                }
                return roles;
            },
            _unitSelectionClass(unit, type) {
                const roles = this._unitSelectionRoles(unit, type);
                return roles.length ? ` selected ${roles.map(role => `selected-${role}`).join(' ')}` : '';
            },
            _unitSelectionChips(unit, type) {
                const labels = {
                    actor: this._label('target.actorRole', 'Actor'),
                    target: this._label('target.targetRole', 'Target')
                };
                const chips = this._unitSelectionRoles(unit, type).map(role => {
                    const safeLabel = this._escapeHtml(labels[role] || role);
                    return `<span class="unit-trait-chip selection" data-selection-role="${this._escapeHtml(role)}" title="${safeLabel}">${safeLabel}</span>`;
                });
                if (chips.length === 0) return '';
                const label = this._escapeHtml(this._label('target.selectedSummary', 'Selected exploration targets'));
                return `<div class="unit-traits unit-selection-chips" aria-label="${label}">${chips.join('')}</div>`;
            },
            renderMobileUnitChip(unit, index, type) {
                if (!unit) return '';
                const isParty = type === 'party';
                const isCorpse = !isParty && this._isCorpse(unit);
                const targetKey = String(unit.id || unit.name).replace(/'/g, "\\'");
                const rawTargetId = this._unitSelectionId(unit);
                const targetSelected = this._isExplorationTarget(type, rawTargetId);
                const isTargetable = !isParty && this.targetSelection && this.canSelectCreatureTarget(unit);
                const unitName = unit.name || (isParty ? 'party member' : 'creature');
                const unitLabel = this._escapeHtml(unitName);
                const chipButton = (classes, label, title, onclick, attrs = '') => `<button class="${classes}" title="${this._escapeHtml(title)}" aria-label="${this._escapeHtml(title)}"${attrs ? ' ' + attrs : ''} onclick="${onclick}">${this._escapeHtml(label)}</button>`;
                let actionButtons = '';
                if (isParty && !this.combatState.active) {
                    const selectedActors = this._getExplorationActors();
                    const selectedClass = selectedActors.includes(unit) ? ' primary' : '';
                    const targetClass = targetSelected ? ' primary' : '';
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn' + selectedClass, this._label('target.act', 'Act'), this._label('target.selectActorFor', 'Select {name} to act', { name: unitName }), `event.stopPropagation();App.selectExplorationActor(${index})`)}${chipButton('action-btn' + targetClass, this._label('target.mark', 'Target'), this._label('target.markFor', 'Mark {name} as target', { name: unitName }), `event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')`)}${chipButton('action-btn', '⋯', `${this._label('ui.partyActions', 'Party actions')}: ${unitName}`, `event.stopPropagation();App.showIntentMenu('party',${index})`, 'aria-haspopup="dialog" aria-controls="mobile-context-menu"')}${chipButton('action-btn', this._label('party.stats', 'Stats'), this._label('party.statsFor', 'Show stats for {name}', { name: unitName }), `event.stopPropagation();App.showPartyMemberStats(${index})`)}</div>`;
                } else if (isParty && this.combatState.active) {
                    if (this.syncSelection?.active && this.syncSelection.phase === 'participants') {
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;">${this._syncParticipantButton(unit, true)}</div>`;
                    } else {
                        actionButtons = this._combatActionButtons(unit, { compact: true });
                    }
                }
                if (isCorpse) {
                    const menuLabel = this._label('ui.creatureActions', 'Creature actions');
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn', this._uiLabel('loot'), `${this._uiLabel('loot')} ${unitName}`, `event.stopPropagation();App.lootCorpse('${targetKey}')`)}${chipButton('action-btn', this._uiLabel('scavenge'), `${this._uiLabel('scavenge')} ${unitName}`, `event.stopPropagation();App.scavengeCorpse('${targetKey}')`)}${chipButton('action-btn', '⋯', `${menuLabel}: ${unitName}`, `event.stopPropagation();App.showIntentMenu('creature','${targetKey}')`, 'aria-haspopup="dialog" aria-controls="mobile-context-menu"')}</div>`;
                }
                if (!isParty && unit.CPun > 0) {
                    if (this.targetSelection) {
                        const disabled = isTargetable ? '' : ' disabled';
                        const actionLabel = this._uiLabel(this.targetSelection.action || 'action');
                        const targetHint = this._label(isTargetable ? 'target.selectAs' : 'target.cannotSelectAs', isTargetable ? 'Select {name} as {action} target' : 'Cannot select {name} as {action} target', { name: unitName, action: actionLabel });
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn primary', this._label('target.mark', 'Target'), targetHint, `event.stopPropagation();App.executeActionOnTarget('${this.targetSelection.action}','${targetKey}')`, disabled.trim())}</div>`;
                    } else if (this.syncSelection?.active && this.syncSelection.phase === 'target') {
                        const isTargetable = this.canSelectCreatureTarget(unit);
                        const disabled = isTargetable ? '' : ' disabled';
                        const targetHint = this._label(isTargetable ? 'target.selectAs' : 'target.cannotSelectAs', isTargetable ? 'Select {name} as {action} target' : 'Cannot select {name} as {action} target', { name: unitName, action: this._label('action.sync', 'Sync') });
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn primary', this._label('target.mark', 'Target'), targetHint, `event.stopPropagation();App.executeActionOnTarget('${this.syncSelection.type || 'sync_fight'}','${targetKey}')`, disabled.trim())}</div>`;
                    } else if (!this.combatState.active || unit.disposition !== this.DISPOSITION.ENEMY) {
                        const targetClass = targetSelected ? ' primary' : '';
                        const inspectLabel = this._uiLabel('inspect');
                        const menuLabel = this._label('ui.creatureActions', 'Creature actions');
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;">${chipButton('action-btn' + targetClass, this._label('target.mark', 'Target'), this._label('target.markFor', 'Mark {name} as target', { name: unitName }), `event.stopPropagation();App.toggleExplorationTarget('creature','${targetKey}')`)}${chipButton('action-btn', '👁️', `${inspectLabel} ${unitName}`, `event.stopPropagation();App.outsideActionForCreature('inspect','${targetKey}')`)}${chipButton('action-btn', '⋯', `${menuLabel}: ${unitName}`, `event.stopPropagation();App.showIntentMenu('creature','${targetKey}')`, 'aria-haspopup="dialog" aria-controls="mobile-context-menu"')}`;
                        if (this._canRecruit(this._getExplorationActor(), unit)) {
                            actionButtons += chipButton('action-btn primary', '💕', `${this._uiLabel('recruit')} ${unitName}`, `event.stopPropagation();App.recruitCreatureById('${targetKey}')`);
                        }
                        if (unit.quest) {
                            const questLabel = this._uiLabel(unit.questAccepted ? 'viewQuest' : 'acceptQuest');
                            actionButtons += chipButton('action-btn primary', '📜', `${questLabel} ${unitName}`, `event.stopPropagation();App.previewQuestFromUnit('${targetKey}')`);
                        }
                        if (unit.disposition === this.DISPOSITION.MERCHANT) {
                            actionButtons += chipButton('action-btn primary', '🪙', `${this._uiLabel('trade')} ${unitName}`, `event.stopPropagation();App.showTrade('${targetKey}')`);
                        }
                        actionButtons += '</div>';
                    }
                }
                const click = isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`;
                const canOpenIntentMenu = isParty
                    ? !this.combatState.active
                    : isCorpse || (unit.CPun > 0 && !this.targetSelection && (!this.combatState.active || unit.disposition !== this.DISPOSITION.ENEMY));
                const contextMenuAttr = canOpenIntentMenu
                    ? ` oncontextmenu="event.preventDefault();event.stopPropagation();App.showRadialIntentMenu('${type}',${isParty ? index : `'${targetKey}'`},'secondary-click')"`
                    : '';
                const partyRole = isParty && unit.name !== this.player?.name ? this._partyRoleLabel(this._getPartyRole(unit)) : '';
                const partyStatus = unit.name === this.player?.name ? this._label('party.you', 'You') : `${this._label('party.ally', 'Ally')}${partyRole ? ' - ' + partyRole : ''}`;
                const status = isParty ? partyStatus : this._unitDispositionLabel(unit);
                const rowText = this.combatState.active && unit.combatRow ? ` | ${this._combatRowLabel(unit.combatRow)}` : '';
                const turnBadge = this._turnOrderBadge(unit);
                const combatStatus = this._srOnly(this._combatStatusText(unit), 'role="status" aria-live="polite"');
                const pressHandlers = isParty
                    ? ` ontouchstart="App.startMobilePartyPress(event,${index})" ontouchmove="App.cancelMobilePartyPress()" ontouchend="App.cancelMobilePartyPress()" ontouchcancel="App.cancelMobilePartyPress()"`
                    : ` ontouchstart="App.startMobileCreaturePress(event,'${targetKey}')" ontouchmove="App.cancelMobileCreaturePress()" ontouchend="App.cancelMobileCreaturePress()" ontouchcancel="App.cancelMobileCreaturePress()"`;
                const chipClass = `mobile-unit-chip${isTargetable ? ' targetable' : ''}${this._unitSelectionClass(unit, type)}`;
                const keyActivate = `if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${click}}`;
                return `<div class="${chipClass}" role="button" tabindex="0" onkeydown="${keyActivate}" onclick="${click}"${contextMenuAttr}${pressHandlers}>
                    <div class="mobile-chip-name"><span>${isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon}</span><span>${unitLabel}</span>${turnBadge}</div>
                    ${combatStatus}
                    <div class="mobile-chip-meta">${this._escapeHtml(status)}${rowText}</div>
                    ${this._unitTacticalBars(unit, { compact: true })}
                    ${this._unitTraitChips(unit, type)}
                    ${this._unitSelectionChips(unit, type)}
                    ${actionButtons}
                </div>`;
            },
            renderUnitCard(unit, index, type) {
                const isExpanded = unit.expanded || false;
                const isParty = type === 'party';
                const isPlayer = isParty && unit.name === this.player?.name;
                const isAlly = isParty && !isPlayer;
                const isCorpse = this._isCorpse(unit);
                const isLeader = isParty && this._getPartyLeader() === unit;
                const unitName = unit.name || 'party member';
                const unitLabel = this._escapeHtml(unitName);
                const roleLabel = isAlly ? this._escapeHtml(this._partyRoleLabel(this._getPartyRole(unit))) : '';
                const canDragPartyMember = isAlly && !this.combatState.active;
                const dragAttrs = canDragPartyMember ? ` draggable="true" data-party-index="${index}" ondragstart="event.stopPropagation();App.startPartyDrag(${index})" ondragover="App.dragPartyOver(event)" ondrop="event.stopPropagation();App.dropPartyMember(${index})" ondragend="App.clearPartyDrag()"` : '';
                const cardClass = `unit-card${isExpanded ? ' expanded' : ''}${canDragPartyMember ? ' party-draggable' : ''}${this._unitSelectionClass(unit, type)}`;
                let actionButtons = '';
                let partyManagementControls = '';
                if (isParty && !this.combatState.active) {
                    const selectedActors = this._getExplorationActors();
                    const selectedClass = selectedActors.includes(unit) ? ' primary' : '';
                    const targetClass = this._isExplorationTarget('party', this._unitSelectionId(unit)) ? ' primary' : '';
                    const targetKey = this._unitKey(unit);
                    const actorLabel = this._escapeHtml(this._label('target.act', 'Act'));
                    const actorTitle = this._escapeHtml(this._label('target.selectActorFor', 'Select {name} to act', { name: unitName }));
                    const targetLabel = this._escapeHtml(this._label('target.mark', 'Target'));
                    const targetTitle = this._escapeHtml(this._label('target.markFor', 'Mark {name} as target', { name: unitName }));
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${selectedClass}" title="${actorTitle}" aria-label="${actorTitle}" onclick="event.stopPropagation();App.selectExplorationActor(${index})">${actorLabel}</button><button class="action-btn${targetClass}" title="${targetTitle}" aria-label="${targetTitle}" onclick="event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')">${targetLabel}</button>`;
                    actionButtons += `<button class="action-btn" title="${this._escapeHtml(this._label('ui.partyActions', 'Party actions'))}: ${this._escapeHtml(unitName)}" aria-label="${this._escapeHtml(this._label('ui.partyActions', 'Party actions'))}: ${this._escapeHtml(unitName)}" aria-haspopup="dialog" aria-controls="desktop-intent-menu" onclick="event.stopPropagation();App.showIntentMenu('party',${index},'desktop')">⋯</button>`;
                    const statsLabel = this._escapeHtml(this._label('party.stats', 'Stats'));
                    const statsTitle = this._escapeHtml(this._label('party.statsFor', 'Show stats for {name}', { name: unitName }));
                    actionButtons += `<button class="action-btn" title="${statsTitle}" aria-label="${statsTitle}" onclick="event.stopPropagation();App.showPartyMemberStats(${index})">${statsLabel}</button>`;
                    actionButtons += `</div>`;
                    if (!isLeader) {
                        const leadLabel = this._escapeHtml(this._label('party.makeLeader', 'Make Leader'));
                        const leadTitle = this._escapeHtml(this._label('party.makeLeaderFor', 'Make {name} party leader', { name: unitName }));
                        partyManagementControls += `<button class="action-btn" title="${leadTitle}" aria-label="${leadTitle}" onclick="event.stopPropagation();App.setPartyLeader(${index})">${leadLabel}</button>`;
                    }
                    if (canDragPartyMember) {
                        const dragTitle = this._escapeHtml(this._label('party.dragToReorder', 'Drag {name} to reorder', { name: unitName }));
                        partyManagementControls += `<button class="action-btn party-drag-handle" draggable="true" title="${dragTitle}" aria-label="${dragTitle}" onclick="event.stopPropagation()" ondragstart="event.stopPropagation();App.startPartyDrag(${index})">↕</button>`;
                    }
                    if (index > 1) {
                        const moveUpTitle = this._escapeHtml(this._label('party.moveUp', 'Move {name} up', { name: unitName }));
                        partyManagementControls += `<button class="action-btn" title="${moveUpTitle}" aria-label="${moveUpTitle}" onclick="event.stopPropagation();App.movePartyMember(${index},-1)">↑</button>`;
                    }
                    if (!isPlayer && index < this.party.length - 1) {
                        const moveDownTitle = this._escapeHtml(this._label('party.moveDown', 'Move {name} down', { name: unitName }));
                        partyManagementControls += `<button class="action-btn" title="${moveDownTitle}" aria-label="${moveDownTitle}" onclick="event.stopPropagation();App.movePartyMember(${index},1)">↓</button>`;
                    }
                    if (isAlly) {
                        const role = this._getPartyRole(unit);
                        const roleOptions = Object.keys(this.PARTY_ROLES).map(key => `<option value="${key}" ${role === key ? 'selected' : ''}>${this._escapeHtml(this._partyRoleLabel(key))}</option>`).join('');
                        const roleTitle = this._escapeHtml(`${this._label('party.role', 'Role')}: ${this._partyRoleDescription(role)}`);
                        const roleAria = this._escapeHtml(this._label('party.roleFor', 'Party role for {name}', { name: unitName }));
                        partyManagementControls += `<select class="nav-btn" style="padding:4px 8px;font-size:11px;" title="${roleTitle}" aria-label="${roleAria}" onclick="event.stopPropagation()" onchange="event.stopPropagation();App.setPartyRole(${index},this.value)">${roleOptions}</select>`;
                        const order = this._getPartyAIOrder(unit);
                        const options = Object.keys(this.PARTY_AI_ORDERS).map(key => `<option value="${key}" ${order === key ? 'selected' : ''}>${this._escapeHtml(this._partyAIOrderLabel(key))}</option>`).join('');
                        const orderTitle = this._escapeHtml(`${this._label('party.aiOrder', 'AI Order')}: ${this._partyAIOrderDescription(order)}`);
                        const orderAria = this._escapeHtml(this._label('party.aiOrderFor', 'AI order for {name}', { name: unitName }));
                        partyManagementControls += `<select class="nav-btn" style="padding:4px 8px;font-size:11px;" title="${orderTitle}" aria-label="${orderAria}" onclick="event.stopPropagation()" onchange="event.stopPropagation();App.setPartyAIOrder(${index},this.value)">${options}</select>`;
                        const dismissLabel = this._escapeHtml(this._label('party.dismiss', 'Dismiss'));
                        const dismissTitle = this._escapeHtml(this._label('party.dismissFor', 'Dismiss {name}', { name: unitName }));
                        partyManagementControls += `<button class="action-btn" style="color:var(--accent-danger)" title="${dismissTitle}" aria-label="${dismissTitle}" onclick="event.stopPropagation();App.dismissPartyMember(${index})">${dismissLabel}</button>`;
                    }
                    if (partyManagementControls) {
                        partyManagementControls = `<div class="unit-actions unit-management-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">${partyManagementControls}</div>`;
                    }
                } else if (isParty && this.combatState.active) {
                    if (this.syncSelection?.active && this.syncSelection.phase === 'participants') {
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">${this._syncParticipantButton(unit)}</div>`;
                    } else {
                        actionButtons = this._combatActionButtons(unit);
                    }
                }
                if (!isParty && isCorpse) {
                    const targetKey = this._unitKey(unit);
                    const corpseLabel = this._escapeHtml(unit.corpseName || unit.name || 'remains');
                    const lootLabel = this._escapeHtml(this._uiLabel('loot'));
                    const scavengeLabel = this._escapeHtml(this._uiLabel('scavenge'));
                    const menuTitle = this._escapeHtml(`${this._label('ui.creatureActions', 'Creature actions')}: ${unit.name || 'remains'}`);
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn" title="${lootLabel} ${corpseLabel}" aria-label="${lootLabel} ${corpseLabel}" onclick="event.stopPropagation();App.lootCorpse('${targetKey}')">${lootLabel}</button><button class="action-btn" title="${scavengeLabel} ${corpseLabel}" aria-label="${scavengeLabel} ${corpseLabel}" onclick="event.stopPropagation();App.scavengeCorpse('${targetKey}')">${scavengeLabel}</button><button class="action-btn" title="${menuTitle}" aria-label="${menuTitle}" aria-haspopup="dialog" aria-controls="desktop-intent-menu" onclick="event.stopPropagation();App.showIntentMenu('creature','${targetKey}','desktop')">⋯</button></div>`;
                }
                if (!isParty && unit.CPun > 0 && !isCorpse) {
                    const targetKey = this._unitKey(unit);
                    if (this.targetSelection) {
                        const canTarget = this.canSelectCreatureTarget(unit);
                        const disabled = canTarget ? '' : ' disabled';
                        const targetName = unit.name || 'creature';
                        const actionLabel = this._uiLabel(this.targetSelection.action || 'action');
                        const targetHint = this._escapeHtml(this._label(canTarget ? 'target.selectAs' : 'target.cannotSelectAs', canTarget ? 'Select {name} as {action} target' : 'Cannot select {name} as {action} target', { name: targetName, action: actionLabel }));
                        const targetLabel = this._escapeHtml(this._label('target.mark', 'Target'));
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn primary" title="${targetHint}" aria-label="${targetHint}" ${disabled} onclick="event.stopPropagation();App.executeActionOnTarget('${this.targetSelection.action}','${targetKey}')">${targetLabel}</button></div>`;
                    } else if (this.syncSelection?.active && this.syncSelection.phase === 'target') {
                        const canTarget = this.canSelectCreatureTarget(unit);
                        const disabled = canTarget ? '' : ' disabled';
                        const targetName = unit.name || 'creature';
                        const targetHint = this._escapeHtml(this._label(canTarget ? 'target.selectAs' : 'target.cannotSelectAs', canTarget ? 'Select {name} as {action} target' : 'Cannot select {name} as {action} target', { name: targetName, action: this._label('action.sync', 'Sync') }));
                        const targetLabel = this._escapeHtml(this._label('target.mark', 'Target'));
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn primary" title="${targetHint}" aria-label="${targetHint}" ${disabled} onclick="event.stopPropagation();App.executeActionOnTarget('${this.syncSelection.type || 'sync_fight'}','${targetKey}')">${targetLabel}</button></div>`;
                    } else if (!this.combatState.active || unit.disposition !== this.DISPOSITION.ENEMY) {
                        const targetName = unit.name || 'creature';
                        const targetLabel = this._escapeHtml(targetName);
                        const targetClass = this._isExplorationTarget('creature', String(unit.id || unit.name)) ? ' primary' : '';
                        const actionTitle = action => this._escapeHtml(`${this._uiLabel(action)} ${targetName}`);
                        const markLabel = this._escapeHtml(this._label('target.mark', 'Target'));
                        const markTitle = this._escapeHtml(this._label('target.markFor', 'Mark {name} as target', { name: targetName }));
                        const menuTitle = this._escapeHtml(`${this._label('ui.creatureActions', 'Creature actions')}: ${targetName}`);
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${targetClass}" title="${markTitle}" aria-label="${markTitle}" onclick="event.stopPropagation();App.toggleExplorationTarget('creature','${targetKey}')">${markLabel}</button><button class="action-btn" title="${actionTitle('inspect')}" aria-label="${actionTitle('inspect')}" onclick="event.stopPropagation();App.outsideActionForCreature('inspect','${targetKey}')">👁️</button><button class="action-btn" title="${menuTitle}" aria-label="${menuTitle}" aria-haspopup="dialog" aria-controls="desktop-intent-menu" onclick="event.stopPropagation();App.showIntentMenu('creature','${targetKey}','desktop')">⋯</button>`;
                        if (this._canRecruit(this._getExplorationActor(), unit)) {
                            const recruitTitle = this._escapeHtml(`${this._uiLabel('recruit')} ${targetName}`);
                            actionButtons += `<button class="action-btn primary" title="${recruitTitle}" aria-label="${recruitTitle}" onclick="event.stopPropagation();App.recruitCreatureById('${targetKey}')">💕</button>`;
                        }
                        if (unit.quest) {
                            const questLabel = this._escapeHtml(this._uiLabel(unit.questAccepted ? 'viewQuest' : 'acceptQuest'));
                            const questTitle = this._escapeHtml(this._label(unit.questAccepted ? 'action.viewQuestFrom' : 'action.acceptQuestFrom', unit.questAccepted ? 'View quest from {name}' : 'Accept quest from {name}', { name: targetName }));
                            actionButtons += `<button class="action-btn primary" title="${questTitle}" aria-label="${questTitle}" onclick="event.stopPropagation();App.previewQuestFromUnit('${targetKey}')">📜 ${questLabel}</button>`;
                        }
                        if (unit.disposition === this.DISPOSITION.MERCHANT) {
                            const tradeLabel = this._escapeHtml(this._uiLabel('trade'));
                            const tradeTitle = this._escapeHtml(this._label('action.tradeWith', 'Trade with {name}', { name: targetName }));
                            actionButtons += `<button class="action-btn primary" title="${tradeTitle}" aria-label="${tradeTitle}" onclick="event.stopPropagation();App.showTrade('${targetKey}')">🪙 ${tradeLabel}</button>`;
                        }
                        actionButtons += `</div>`;
                    }
                }
                let dispLabel = '';
                if (!isParty) {
                    dispLabel = this._unitDispositionLabel(unit);
                }
                const stomachUsed = this._containerUsed(unit, 'stomach');
                const wombUsed = this._containerUsed(unit, 'womb');
                const ballsUsed = this._containerUsed(unit, 'balls');
                const hasContained = stomachUsed > 0 || wombUsed > 0 || ballsUsed > 0;
                const capacitySummary = [
                    `${this._label('capacity.stomach', 'Stomach')}: ${this._containerSummary(unit, 'stomach')}`,
                    `${this._label('capacity.womb', 'Womb')}: ${this._containerSummary(unit, 'womb')}`,
                    `${this._label('capacity.balls', 'Balls')}: ${this._containerSummary(unit, 'balls')}`
                ].join(' | ');
                const equipmentSummary = this._equipmentCompactSummary(unit);
                const rowLabel = this.combatState.active && unit.combatRow ? ` ${this._label('combat.row', 'Row')}:${this._combatRowLabel(unit.combatRow)}` : '';
                const turnBadge = this._turnOrderBadge(unit);
                const combatStatus = this._srOnly(this._combatStatusText(unit), 'role="status" aria-live="polite"');
                const compactStatus = this._escapeHtml(`${isParty ? (isPlayer ? this._label('party.you', 'You') : this._label('party.ally', 'Ally')) : dispLabel || this._unitDispositionLabel(unit)}${rowLabel ? ' | ' + rowLabel.trim() : ''}`);
                const statLabels = {
                    equipment: this._escapeHtml(this._label('party.equipment', 'Equipment'))
                };
                const cardCanOpenIntentMenu = isParty
                    ? !this.combatState.active
                    : (isCorpse || (unit.CPun > 0 && !this.targetSelection && (!this.combatState.active || unit.disposition !== this.DISPOSITION.ENEMY)));
                const cardContextMenuAttr = cardCanOpenIntentMenu
                    ? ` oncontextmenu="event.preventDefault();event.stopPropagation();App.showRadialIntentMenu('${type}',${isParty ? index : `'${this._unitKey(unit)}'`},'secondary-click')"`
                    : '';
                return `<div class="${cardClass}" role="button" tabindex="0" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();App.toggleUnit(${index},'${type}')}" style="${isCorpse ? 'opacity:0.58;' : ''}"${dragAttrs}${cardContextMenuAttr} onclick="App.toggleUnit(${index},'${type}')">
	                    <div class="unit-header">
	                        <span class="unit-icon">${isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon}</span>
                        <div class="unit-info">
	                            <div class="unit-name">${unit.name} ${isLeader ? '<span style="font-size:10px;color:var(--accent-primary)">[Leader]</span>' : ''} ${roleLabel ? '<span style="font-size:10px;color:var(--text-muted)">[' + roleLabel + ']</span>' : ''} ${dispLabel ? '<span style="font-size:10px;color:var(--text-muted)">[' + dispLabel + ']</span>' : ''}${turnBadge}</div>
	                            ${combatStatus}
	                            <div class="unit-card-status">${compactStatus}</div>
	                            ${this._unitTacticalBars(unit)}
	                            ${this._unitTraitChips(unit, type)}
	                            ${this._unitSelectionChips(unit, type)}
		                        </div>
		                    </div>
	                    ${actionButtons}
	                    ${isExpanded ? `<div class="unit-details">
	                        <div style="display:grid;grid-template-columns:1fr;gap:8px;font-size:12px;">
		                            <div style="color:${hasContained ? 'var(--accent-warning)' : 'var(--text-muted)'}">${capacitySummary}</div>
                                    <div style="color:var(--text-muted)"><span style="color:var(--text-primary)">${statLabels.equipment}:</span><br>${equipmentSummary}</div>
	                        </div>
	                        ${partyManagementControls}
	                    </div>` : ''}
	                </div>`;
            },
            toggleUnit(index, type) {
                const list = type === 'party' ? this.party : this.creatures;
                if (list[index]) { list[index].expanded = !list[index].expanded; }
                if (type === 'party') this.renderParty(); else this.renderCreatures();
            },
            expandAll(type) {
                const list = type === 'party' ? this.party : this.creatures;
                const allExpanded = list.every(u => u.expanded);
                list.forEach(u => u.expanded = !allExpanded);
                if (type === 'party') this.renderParty(); else this.renderCreatures();
            },

            executeAllyAction(action, index) {
                const ally = this.party[index];
                if (!ally || ally.name === this.player?.name) return;
                let result = '';
                switch (action) {
                    case 'feed':
                        const feedAmount = Math.floor((this.player.Feed || 10) * 2);
                        ally.CPun = Math.min(ally.MPun, ally.CPun + feedAmount);
                        ally.hunger = Math.max(0, (ally.hunger || 0) - 25);
                        if (ally.CPle < ally.MPle * 0.5) {
                            ally.CPle = Math.min(ally.MPle, ally.CPle + Math.floor(feedAmount * 0.5));
                        }
                        ally.obedient = true;
                        result = `You feed ${ally.name}, restoring ${feedAmount} punishment and sating their hunger. Loyalty restored!`;
                        break;
                    case 'flirt':
                        ally.CPle = Math.min(ally.MPle, ally.CPle + 15);
                        this.player.CPle = Math.min(this.player.MPle, this.player.CPle + 10);
                        ally.willing = true;
                        result = `You flirt with ${ally.name}, raising both your pleasures. They blush warmly.`;
                        break;
	                    case 'consume':
	                        if (!this._canFitPrey(this.player, ally, 'stomach')) {
	                            result = this._capacityFailureMessage(this.player, ally, 'stomach');
	                            break;
	                        }
	                        this.party.splice(index, 1);
	                        if (!this.player.stomach) this.player.stomach = [];
	                        this.player.stomach.push(this._createStomachPrey(ally));
                        this.player.CPun = Math.min(this.player.MPun, this.player.CPun + 30);
                        this.player.Feas += 2;
                        result = `You consume ${ally.name}. Power grows!`;
                        break;
                    case 'seduce':
                        ally.willing = true; ally.obedient = true;
                        result = `${ally.name} is devoted to you.`;
                        break;
                    case 'fuck':
                        ally.CPle = Math.min(ally.MPle, ally.CPle + 20);
                        this.player.CPle = Math.min(this.player.MPle, this.player.CPle + 15);
                        ally.willing = true;
                        result = `You and ${ally.name} share an intimate moment.`;
                        break;
                    case 'inspect':
                        result = `${ally.name}: Pun ${ally.CPun}/${ally.MPun}, Ple ${ally.CPle}/${ally.MPle}, Size ${ally.size}, App ${ally.appetite}, Parts: ${ally.parts || 'none'}, Chest: ${ally.chest || 'none'}`;
                        break;
                }
                this.log.push({ text: result, type: 'discovery' });
                this.renderLog(); this.renderParty();
                if (this.combatState.active) this.nextTurn();
                else this.showExplorationActions();
                this.autoSave();
            },

            // ===== MAP RENDERING =====
            _isLargeMapKnown(x, y) {
                const key = this._tileKey(x, y);
                if (x === this.location.x && y === this.location.y) return true;
                if (this.exploredTiles?.has(key)) return true;
                const cached = this.worldMap?.get(key);
                if (cached && (cached.explored || cached.hasLandmark || cached.structure || (cached.creatures || []).length || (cached.items || []).length)) return true;
                const delta = this.getTileDelta(x, y);
                return Boolean(delta && (delta.explored || delta.hasLandmark || delta.structure || (delta.creatures || []).length || (delta.items || []).length));
            },

            _resolveLargeMapTile(x, y) {
                if (!this._isLargeMapKnown(x, y)) return null;
                const key = this._tileKey(x, y);
                const cached = this.worldMap?.get(key);
                if (cached) return cached;
                return this.applyTileDelta(this.getBaseTile(x, y), this.getTileDelta(x, y));
            },

            _largeMapPoiLabel(tile) {
                if (!tile) return '';
                if (tile.hasLandmark && tile.landmarkName) return tile.landmarkName;
                if (tile.structure) return this.STRUCTURES[tile.structure]?.name || tile.structure;
                const living = (tile.creatures || []).filter(creature => this._isLivingCreature(creature));
                if (living.length > 0) return `${living.length} creature${living.length === 1 ? '' : 's'}`;
                if ((tile.items || []).length > 0) return `${tile.items.length} item${tile.items.length === 1 ? '' : 's'}`;
                return '';
            },

            _largeMapQuestMarker(x, y) {
                for (const quest of this.quests || []) {
                    if (quest.status !== 'active') continue;
                    for (const objective of quest.objectives || []) {
                        const marker = this._nextQuestObjectiveMarker(objective);
                        if (!marker) continue;
                        if (Number(marker.x) === Number(x) && Number(marker.y) === Number(y)) {
                            return `${quest.title}: ${marker.label || objective.label || this._questObjectiveLabel(objective)}`;
                        }
                    }
                }
                return '';
            },
            _isRouteVisualTile(tile) {
                return Boolean(tile?.overlays?.road || tile?.overlays?.bridge);
            },
            _routeVisualShape(tile, resolver = null) {
                const fallback = tile?.overlays?.bridge?.direction || tile?.overlays?.road?.direction || 'east-west';
                if (!tile || typeof resolver !== 'function' || !Number.isFinite(Number(tile.x)) || !Number.isFinite(Number(tile.y))) return fallback;
                const x = Number(tile.x);
                const y = Number(tile.y);
                const north = this._isRouteVisualTile(resolver(x, y - 1));
                const east = this._isRouteVisualTile(resolver(x + 1, y));
                const south = this._isRouteVisualTile(resolver(x, y + 1));
                const west = this._isRouteVisualTile(resolver(x - 1, y));
                const count = [north, east, south, west].filter(Boolean).length;
                if (count >= 4) return 'intersection';
                if (count === 3) {
                    if (!north) return 't-s';
                    if (!east) return 't-w';
                    if (!south) return 't-n';
                    return 't-e';
                }
                if (count === 2) {
                    if (east && west) return 'east-west';
                    if (north && south) return 'north-south';
                    if (north && east) return 'corner-ne';
                    if (east && south) return 'corner-es';
                    if (south && west) return 'corner-sw';
                    if (west && north) return 'corner-wn';
                }
                if (count === 1) return 'end';
                return fallback;
            },
            _mapTileVisual(tile, options = {}) {
                const known = Boolean(tile);
                if (!known) {
                    const asset = this._tilesetAssetForKey('unknown');
                    return {
                        icon: '·',
                        tilesetKey: 'unknown',
                        baseTilesetKey: 'unknown',
                        kind: 'unknown',
                        classes: 'map-visual-unknown',
                        label: options.label || 'Unknown',
                        marker: null,
                        hasPaintedAsset: Boolean(asset?.src),
                        asset
                    };
                }
                const biomeId = tile.displayBiome || tile.derivedBiome || tile.biome || 'plains';
                const baseBiomeId = tile.derivedBiome || tile.baseBiome || tile.biome || biomeId;
                const biome = this.biomes[biomeId] || this.biomes[baseBiomeId] || {};
                const baseTilesetKey = this.MAP_TILESET_KEYS.biomes[baseBiomeId] || `terrain-${baseBiomeId}`;
                let icon = biome.icon || '□';
                let tilesetKey = baseTilesetKey;
                let kind = 'biome';
                let routeShape = null;
                const classes = ['map-visual', `map-visual-${baseBiomeId}`];
                if (tile.overlays?.bridge) {
                    const direction = tile.overlays.bridge.direction || tile.overlays.road?.direction || 'east-west';
                    tilesetKey = this.MAP_TILESET_KEYS.bridges[direction] || 'route-bridge-horizontal';
                    icon = '🌉';
                    kind = 'bridge';
                    routeShape = direction;
                    classes.push('map-visual-bridge');
                } else if (tile.overlays?.road) {
                    routeShape = this._routeVisualShape(tile, options.neighborResolver);
                    tilesetKey = this.MAP_TILESET_KEYS.roads[routeShape] || this.MAP_TILESET_KEYS.roads[tile.overlays.road.direction] || 'route-road-horizontal';
                    icon = '🛤️';
                    kind = 'road';
                    classes.push('map-visual-road', `map-visual-route-${routeShape}`);
                } else if (tile.overlays?.poi) {
                    const category = tile.overlays.poi.category || 'landmark';
                    tilesetKey = this.MAP_TILESET_KEYS.poi[category] || 'poi-landmark';
                    icon = '◆';
                    kind = 'poi';
                    classes.push('map-visual-poi');
                }
                if (tile.structure) {
                    tilesetKey = this.MAP_TILESET_KEYS.structures[tile.structure] || tilesetKey;
                    const structure = this.STRUCTURES[tile.structure];
                    icon = structure?.icon || icon;
                    kind = 'structure';
                    classes.push('map-visual-structure');
                } else if (tile.hasLandmark) {
                    tilesetKey = 'poi-landmark';
                    kind = 'landmark';
                    classes.push('map-visual-landmark');
                }
                if (options.questMarker) {
                    icon = '◆';
                    classes.push('map-visual-quest');
                }
                if (options.isCurrent) {
                    icon = '●';
                    classes.push('map-visual-current');
                }
                const asset = this._tilesetAssetForKey(tilesetKey);
                return {
                    icon,
                    tilesetKey,
                    baseTilesetKey,
                    kind,
                    routeShape,
                    classes: classes.join(' '),
                    label: biome.name || biomeId,
                    marker: options.questMarker || options.poi || null,
                    hasPaintedAsset: Boolean(asset?.src),
                    asset
                };
            },
            _tilesetAssetForKey(key) {
                if (typeof globalThis === 'undefined' || !globalThis.AssetManifest || !globalThis.AssetManifest.getTileAsset) return null;
                return globalThis.AssetManifest.getTileAsset(key);
            },
            _mapTileAttrs(visual) {
                const key = this._escapeHtml(visual?.tilesetKey || 'unknown');
                const base = this._escapeHtml(visual?.baseTilesetKey || key);
                const kind = this._escapeHtml(visual?.kind || 'unknown');
                const shape = visual?.routeShape ? ` data-route-shape="${this._escapeHtml(visual.routeShape)}"` : '';
                const asset = visual?.asset;
                const assetAttrs = asset
                    ? ` data-asset-id="${this._escapeHtml(asset.id)}" data-asset-fallback="${this._escapeHtml(asset.fallbackMode || 'emoji')}"${asset.src ? ` data-asset-src="${this._escapeHtml(asset.src)}"` : ''}`
                    : '';
                return `data-tileset-key="${key}" data-base-tileset-key="${base}" data-map-kind="${kind}"${shape}${assetAttrs}`;
            },
            _interiorTileVisual(room = null, options = {}) {
                if (!room) {
                    const asset = this._tilesetAssetForKey(this.MAP_TILESET_KEYS.interior.wall);
                    return {
                        icon: '■',
                        tilesetKey: this.MAP_TILESET_KEYS.interior.wall,
                        baseTilesetKey: this.MAP_TILESET_KEYS.interior.wall,
                        kind: 'interior-wall',
                        classes: 'map-visual map-visual-interior map-visual-interior-wall',
                        label: options.label || 'Wall',
                        marker: null,
                        hasPaintedAsset: Boolean(asset?.src),
                        asset
                    };
                }
                const biomeId = room.biome || 'indoors';
                const baseTilesetKey = this.MAP_TILESET_KEYS.biomes[biomeId] || (biomeId === 'cave' ? this.MAP_TILESET_KEYS.interior.cave : this.MAP_TILESET_KEYS.interior.room);
                let tilesetKey = biomeId === 'cave' ? this.MAP_TILESET_KEYS.interior.cave : this.MAP_TILESET_KEYS.interior.room;
                let icon = room.explored ? '□' : '·';
                let kind = 'interior-room';
                const classes = ['map-visual', 'map-visual-interior', `map-visual-${biomeId}`];
                if (room.exit) {
                    tilesetKey = this.MAP_TILESET_KEYS.interior.exit;
                    icon = '🚪';
                    kind = 'interior-exit';
                    classes.push('map-visual-interior-exit');
                } else if (room.structure) {
                    tilesetKey = this.MAP_TILESET_KEYS.structures[room.structure] || this.MAP_TILESET_KEYS.interior.door;
                    icon = this.STRUCTURES[room.structure]?.icon || '▣';
                    kind = 'interior-feature';
                    classes.push('map-visual-interior-feature');
                }
                const biome = this.biomes[biomeId] || this.biomes.indoors || {};
                const asset = this._tilesetAssetForKey(tilesetKey);
                return {
                    icon,
                    tilesetKey,
                    baseTilesetKey,
                    kind,
                    routeShape: null,
                    classes: classes.join(' '),
                    label: room.exit ? 'Exit' : (this.STRUCTURES[room.structure]?.name || biome.name || 'Room'),
                    marker: null,
                    hasPaintedAsset: Boolean(asset?.src),
                    asset
                };
            },

            setLargeMapZoom(delta) {
                const current = this.largeMapRadius || 8;
                this.largeMapRadius = Math.max(4, Math.min(12, current + delta));
                return this.renderLargeMap();
            },

            panLargeMap(dx, dy) {
                const offset = this.largeMapOffset || { x: 0, y: 0 };
                const step = Math.max(1, Math.floor((this.largeMapRadius || 8) / 2));
                this.largeMapOffset = {
                    x: offset.x + dx * step,
                    y: offset.y + dy * step
                };
                return this.renderLargeMap();
            },

            recenterLargeMap() {
                this.largeMapOffset = { x: 0, y: 0 };
                return this.renderLargeMap();
            },

            renderLargeMap() {
                const container = document.getElementById('large-map');
                const poiContainer = document.getElementById('large-map-pois');
                const viewLabel = document.getElementById('large-map-view');
                if (!container) return '';
                if (this.inInterior && this.activeInterior) {
                    const message = this._label('ui.largeMap.outsideOnly', 'Discovered region is available outside.');
                    container.innerHTML = `<div class="large-map-tile known" style="width:auto;min-width:180px;padding:8px;">${this._escapeHtml(message)}</div>`;
                    if (poiContainer) poiContainer.innerHTML = '';
                    if (viewLabel) viewLabel.textContent = this._label('ui.largeMap.interior', 'Interior');
                    return container.innerHTML;
                }
                const offset = this.largeMapOffset || { x: 0, y: 0 };
                const cx = this.location.x + (offset.x || 0);
                const cy = this.location.y + (offset.y || 0);
                const radius = this.largeMapRadius || 8;
                if (viewLabel) viewLabel.textContent = `${cx}, ${cy} · ${radius * 2 + 1}x${radius * 2 + 1}`;
                const points = [];
                let html = '';
                for (let dy = -radius; dy <= radius; dy++) {
                    html += '<div class="large-map-row">';
                    for (let dx = -radius; dx <= radius; dx++) {
                        const x = cx + dx;
                        const y = cy + dy;
                        const isCurrent = x === this.location.x && y === this.location.y;
                        const tile = this._resolveLargeMapTile(x, y);
                        const poi = this._largeMapPoiLabel(tile);
                        const questMarker = this._largeMapQuestMarker(x, y);
                        const visual = this._mapTileVisual(tile, {
                            isCurrent,
                            questMarker,
                            poi,
                            neighborResolver: (nx, ny) => this._resolveLargeMapTile(nx, ny)
                        });
                        let classes = 'large-map-tile';
                        if (tile) classes += ' known';
                        if (isCurrent) classes += ' current';
                        if (poi) classes += ' poi';
                        if (questMarker) classes += ' quest';
                        if (visual.classes) classes += ` ${visual.classes}`;
                        const label = tile ? `${visual.label} (${x}, ${y})` : `Unknown (${x}, ${y})`;
                        const markerLabel = questMarker || poi;
                        html += `<div class="${classes}" ${this._mapTileAttrs(visual)} title="${this._escapeHtml(markerLabel ? `${label}: ${markerLabel}` : label)}" aria-label="${this._escapeHtml(label)}">${this._escapeHtml(visual.icon)}</div>`;
                        if (poi) points.push({ x, y, biome: visual.label || 'Known area', poi });
                        if (questMarker) points.push({ x, y, biome: 'Quest', poi: questMarker });
                    }
                    html += '</div>';
                }
                container.innerHTML = html;
                if (poiContainer) {
                    poiContainer.innerHTML = points.length
                        ? points.slice(0, 6).map(point => `<div>${this._escapeHtml(point.poi)} <span style="color:var(--text-muted);">(${point.x}, ${point.y})</span></div>`).join('')
                        : '<div>No discovered points of interest nearby.</div>';
                }
                return html;
            },

            _dangerPressureLabel(value = 0) {
                if (value >= 0.66) return this._label('ui.tileInfo.pressureHigh', 'High');
                if (value >= 0.36) return this._label('ui.tileInfo.pressureElevated', 'Elevated');
                return this._label('ui.tileInfo.pressureLow', 'Low');
            },
            getTileMapSummary(tile = null) {
                const current = tile || this.getTile(this.location.x, this.location.y);
                if (typeof WorldGen === 'undefined') {
	                    return {
	                        biome: current.displayBiome || current.biome,
	                        coords: { x: current.x, y: current.y },
	                        terrain: { water: Boolean(current.water), tags: Array.isArray(current.terrainTags) ? current.terrainTags.slice() : [] },
	                        traversal: current.traversal || { passable: true, traversalCost: 1, requiredCapability: null, routeModifier: 0 },
	                        danger: 'low',
	                        markers: [],
	                        discovered: Boolean(current.explored),
	                        restAvailable: this._isRestCapableStructure(current.structure, current),
	                        questRelevant: false
	                    };
	                }
	                const biome = this.biomes[current.displayBiome || current.biome] || this.biomes[current.biome] || {};
	                return WorldGen.getTileMapSummary(current, {
	                    biomeDef: biome,
	                    biomeDanger: biome.danger || 0,
	                    isNight: this._isNight(),
	                    restAvailable: this._isRestCapableStructure(current.structure, current),
	                    questRelevant: Boolean(this._largeMapQuestMarker(current.x, current.y))
	                });
            },
            _tileInfoHtml(tile = null) {
                if (this.inInterior && this.activeInterior) {
                    const room = this._currentInteriorTile();
                    const biome = this.biomes[room?.biome] || this.biomes.indoors;
                    return `<div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">${this._escapeHtml(this._label('ui.tileInfo.title', 'Current Tile'))}</div>` +
                        `<div>${biome?.icon || '□'} ${this._escapeHtml(biome?.name || this._label('ui.largeMap.interior', 'Interior'))} · ${this._escapeHtml(this.activeInterior.structureName)} (${this.interiorLocation.x}, ${this.interiorLocation.y})</div>`;
                }
                const current = tile || this.getTile(this.location.x, this.location.y);
                const biome = this.biomes[current.displayBiome || current.biome] || this.biomes[current.biome] || {};
                const structure = current.structure ? (this.STRUCTURES[current.structure]?.name || current.structure) : this._label('ui.tileInfo.none', 'None');
                const landmark = current.hasLandmark && current.landmarkName ? current.landmarkName : this._label('ui.tileInfo.none', 'None');
                const summary = this.getTileMapSummary(current);
                const tagText = summary.terrain.tags.length || summary.markers.length ? [...new Set([...summary.terrain.tags, ...summary.markers.map(tag => String(tag).toLowerCase())])].join(', ') : this._label('ui.tileInfo.none', 'None');
                const phase = this._isNight() ? this._label('ui.tileInfo.night', 'Night') : this._label('ui.tileInfo.day', 'Day');
                const danger = this._dangerPressureLabel(summary.danger === 'high' ? 0.66 : (summary.danger === 'elevated' ? 0.36 : 0));
                return `<div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">${this._escapeHtml(this._label('ui.tileInfo.title', 'Current Tile'))}</div>` +
                    `<div><strong>${this._escapeHtml(this._label('ui.tileInfo.biome', 'Biome'))}:</strong> ${biome.icon || ''} ${this._escapeHtml(biome.name || current.biome)}</div>` +
                    `<div><strong>${this._escapeHtml(this._label('ui.tileInfo.coords', 'Coords'))}:</strong> ${current.x}, ${current.y} · <strong>${this._escapeHtml(this._label('ui.tileInfo.time', 'Time'))}:</strong> ${this._escapeHtml(this._timeLabel())} ${this._escapeHtml(phase)}</div>` +
                    `<div><strong>${this._escapeHtml(this._label('ui.tileInfo.danger', 'Danger'))}:</strong> ${this._escapeHtml(danger)} · <strong>${this._escapeHtml(this._label('ui.tileInfo.tags', 'Tags'))}:</strong> ${this._escapeHtml(tagText)}</div>` +
                    `<div><strong>${this._escapeHtml(this._label('ui.tileInfo.structure', 'Structure'))}:</strong> ${this._escapeHtml(structure)} · <strong>${this._escapeHtml(this._label('ui.tileInfo.landmark', 'Landmark'))}:</strong> ${this._escapeHtml(landmark)}</div>`;
            },
            renderTileInfo(tile = null) {
                const html = this._tileInfoHtml(tile);
                ['tile-info', 'mobile-tile-info'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.innerHTML = html;
                });
            },
            _desktopPlayCellHtml(visual, label) {
                const escapedLabel = this._escapeHtml(label);
                return `<span class="desktop-play-cell-icon" aria-hidden="true">${this._escapeHtml(visual.icon)}</span><span class="desktop-play-cell-label">${escapedLabel}</span>`;
            },
            _directionLabel(dx, dy) {
                const directions = {
                    '-1,-1': this._label('direction.northwest', 'Northwest'),
                    '0,-1': this._label('direction.north', 'North'),
                    '1,-1': this._label('direction.northeast', 'Northeast'),
                    '-1,0': this._label('direction.west', 'West'),
                    '1,0': this._label('direction.east', 'East'),
                    '-1,1': this._label('direction.southwest', 'Southwest'),
                    '0,1': this._label('direction.south', 'South'),
                    '1,1': this._label('direction.southeast', 'Southeast')
                };
                return directions[`${dx},${dy}`] || '';
            },
            _updateDesktopCenterTile(visual, label) {
                const el = document.getElementById('desktop-play-cell-center');
                if (!el) return;
                el.className = `desktop-play-cell center ${visual?.classes || ''}`;
                if (typeof el.setAttribute === 'function') {
                    el.setAttribute('title', this._escapeHtml(label));
                    el.setAttribute('aria-label', this._escapeHtml(label));
                    el.setAttribute('data-tileset-key', visual?.tilesetKey || 'unknown');
                    el.setAttribute('data-base-tileset-key', visual?.baseTilesetKey || visual?.tilesetKey || 'unknown');
                    el.setAttribute('data-map-kind', visual?.kind || 'current');
                    if (visual?.routeShape) el.setAttribute('data-route-shape', visual.routeShape);
                    else if (typeof el.removeAttribute === 'function') el.removeAttribute('data-route-shape');
                }
            },
            _updateDesktopPlayCell(el, visual, label, dx, dy, moveable = true) {
                if (!el) return;
                const classes = `desktop-play-cell${moveable ? ' moveable' : ''} ${visual.classes || ''}`;
                const escapedLabel = this._escapeHtml(label);
                el.className = classes;
                el.innerHTML = this._desktopPlayCellHtml(visual, label);
                if (typeof el.setAttribute === 'function') {
                    el.setAttribute('title', escapedLabel);
                    el.setAttribute('aria-label', escapedLabel);
                    el.setAttribute('role', 'button');
                    el.setAttribute('tabindex', moveable ? '0' : '-1');
                    el.setAttribute('data-tileset-key', visual?.tilesetKey || 'unknown');
                    el.setAttribute('data-base-tileset-key', visual?.baseTilesetKey || visual?.tilesetKey || 'unknown');
                    el.setAttribute('data-map-kind', visual?.kind || 'unknown');
                    if (visual?.routeShape) el.setAttribute('data-route-shape', visual.routeShape);
                    else if (typeof el.removeAttribute === 'function') el.removeAttribute('data-route-shape');
                    if (moveable) el.setAttribute('onclick', `App.move(${dx},${dy})`);
                    else if (typeof el.removeAttribute === 'function') el.removeAttribute('onclick');
                    if (moveable) el.setAttribute('onkeydown', `if(event.key==='Enter'||event.key===' '){event.preventDefault();App.move(${dx},${dy})}`);
                    else if (typeof el.removeAttribute === 'function') el.removeAttribute('onkeydown');
                }
                el.onclick = moveable ? () => this.move(dx, dy) : null;
            },
            renderDesktopPlaySurface() {
                const cells = [
                    { id: 'desktop-play-cell-nw', dx: -1, dy: -1 },
                    { id: 'desktop-play-cell-n', dx: 0, dy: -1 },
                    { id: 'desktop-play-cell-ne', dx: 1, dy: -1 },
                    { id: 'desktop-play-cell-w', dx: -1, dy: 0 },
                    { id: 'desktop-play-cell-e', dx: 1, dy: 0 },
                    { id: 'desktop-play-cell-sw', dx: -1, dy: 1 },
                    { id: 'desktop-play-cell-s', dx: 0, dy: 1 },
                    { id: 'desktop-play-cell-se', dx: 1, dy: 1 }
                ];
                if (this.inInterior && this.activeInterior) {
                    const cx = this.interiorLocation.x;
                    const cy = this.interiorLocation.y;
                    cells.forEach(cell => {
                        const el = document.getElementById(cell.id);
                        if (!el) return;
                        const tx = cx + cell.dx;
                        const ty = cy + cell.dy;
                        const room = this.activeInterior.tiles[`${tx},${ty}`];
                        const visual = this._interiorTileVisual(room);
                        const direction = this._directionLabel(cell.dx, cell.dy);
                        const label = `${direction}: ${visual.label} (${tx}, ${ty})`;
                        this._updateDesktopPlayCell(el, visual, label, cell.dx, cell.dy, Boolean(room));
                    });
                    const currentRoom = this.activeInterior.tiles[`${cx},${cy}`];
                    const currentVisual = this._interiorTileVisual(currentRoom);
                    this._updateDesktopCenterTile(currentVisual, `${currentVisual.label} (${cx}, ${cy})`);
                    return;
                }
                const cx = this.location.x;
                const cy = this.location.y;
                cells.forEach(cell => {
                    const el = document.getElementById(cell.id);
                    if (!el) return;
                    const tx = cx + cell.dx;
                    const ty = cy + cell.dy;
                    const tile = this.getTile(tx, ty);
                    const visual = this._mapTileVisual(tile, {
                        neighborResolver: (nx, ny) => this.getTile(nx, ny)
                    });
                    const direction = this._directionLabel(cell.dx, cell.dy);
                    const label = `${direction}: ${visual.label} (${tx}, ${ty})`;
                    this._updateDesktopPlayCell(el, visual, label, cell.dx, cell.dy, true);
                });
                const currentTile = this.getTile(cx, cy);
                const currentVisual = this._mapTileVisual(currentTile, {
                    neighborResolver: (nx, ny) => this.getTile(nx, ny)
                });
                this._updateDesktopCenterTile(currentVisual, `${currentVisual.label} (${cx}, ${cy})`);
            },

            renderMap() {
                if (this.inInterior && this.activeInterior) {
                    const cx = this.interiorLocation.x, cy = this.interiorLocation.y;
                    let html = '';
                    for (let dy = -2; dy <= 2; dy++) {
                        html += '<div style="display:flex;gap:4px;justify-content:center;">';
                        for (let dx = -2; dx <= 2; dx++) {
                            const tx = dx, ty = dy;
                            const room = this.activeInterior.tiles[`${tx},${ty}`];
                            const isCenter = tx === cx && ty === cy;
                            const isAdjacent = Math.abs(tx - cx) <= 1 && Math.abs(ty - cy) <= 1;
                            const visual = this._interiorTileVisual(room);
                            const content = visual.icon;
                            let classes = 'map-tile';
                            if (isCenter) classes += ' center';
                            else if (room?.explored) classes += ' explored';
                            else if (isAdjacent) classes += ' moveable';
                            else classes += ' far';
                            if (visual.classes) classes += ` ${visual.classes}`;
                            const onclick = isCenter ? '' : (isAdjacent ? `onclick="App.move(${tx - cx},${ty - cy})"` : '');
                            const title = `${visual.label} (${tx}, ${ty})`;
                            html += `<div class="${classes}" ${this._mapTileAttrs(visual)} title="${this._escapeHtml(title)}" aria-label="${this._escapeHtml(title)}" ${onclick}>${this._escapeHtml(content)}</div>`;
                        }
                        html += '</div>';
                    }
                    const containers = [document.getElementById('mini-map'), document.getElementById('mobile-mini-map')].filter(Boolean);
                    containers.forEach(container => { container.innerHTML = html; });
                    const coords = document.getElementById('coords');
                    if (coords) coords.textContent = `Inside ${this.activeInterior.structureName}`;
                    const mobileCoords = document.getElementById('mobile-coords');
                    if (mobileCoords) mobileCoords.textContent = `Inside ${cx}, ${cy}`;
                    this.renderTileInfo();
                    this.renderLargeMap();
                    this.renderDesktopPlaySurface();
                    this._renderTime();
                    return;
                }
                const cx = this.location.x, cy = this.location.y;
                const visibilityRadius = this._mapVisibilityRadius();
                let html = '';
                for (let dy = -2; dy <= 2; dy++) {
                    html += '<div style="display:flex;gap:4px;justify-content:center;">';
                    for (let dx = -2; dx <= 2; dx++) {
                        const tx = cx + dx, ty = cy + dy;
                        const isCenter = dx === 0 && dy === 0;
                        const isExplored = this.isExplored(tx, ty);
                        const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
                        const isVisible = Math.abs(dx) <= visibilityRadius && Math.abs(dy) <= visibilityRadius;
                        const tile = (isVisible && (isExplored || isAdjacent)) ? this.getTile(tx, ty) : null;
                        const visual = this._mapTileVisual(tile, {
                            isCurrent: false,
                            neighborResolver: (nx, ny) => {
                                const vx = nx - cx;
                                const vy = ny - cy;
                                const known = this.isExplored(nx, ny) || (Math.abs(vx) <= 1 && Math.abs(vy) <= 1);
                                const visible = Math.abs(vx) <= visibilityRadius && Math.abs(vy) <= visibilityRadius;
                                return visible && known ? this.getTile(nx, ny) : null;
                            }
                        });
                        const hasCreatures = tile && tile.creatures && tile.creatures.length > 0;
                        let classes = 'map-tile';
                        if (isCenter) classes += ' center';
                        else if (!isVisible) classes += ' far';
                        else if (isExplored) classes += ' explored';
                        else if (isAdjacent) classes += ' moveable';
                        else classes += ' far';
                        if (visual.classes) classes += ` ${visual.classes}`;
                        if (hasCreatures) classes += ' has-enemy';
                        const onclick = isCenter ? '' : (isAdjacent ? `onclick="App.move(${dx},${dy})"` : '');
                        const title = tile ? `${visual.label} (${tx}, ${ty})` : `${tx}, ${ty}`;
                        html += `<div class="${classes}" ${this._mapTileAttrs(visual)} title="${this._escapeHtml(title)}" aria-label="${this._escapeHtml(title)}" ${onclick}>${this._escapeHtml(visual.icon)}</div>`;
	                    }
	                    html += '</div>';
	                }
	                const containers = [document.getElementById('mini-map'), document.getElementById('mobile-mini-map')].filter(Boolean);
	                containers.forEach(container => { container.innerHTML = html; });
                    const mobileCoords = document.getElementById('mobile-coords');
                    if (mobileCoords) mobileCoords.textContent = `${cx}, ${cy}`;
                    this.renderTileInfo(this.getTile(cx, cy));
                    this.renderLargeMap();
                    this.renderDesktopPlaySurface();
                    this.applyMobileMapZoom();
	                this._renderTime();
	            },

            // ===== SCENE / LOG =====
            _setRichSceneContent(title, html) {
                const titleEl = document.getElementById('scene-title');
                const descEl = document.getElementById('scene-description');
                const actions = document.getElementById('scene-actions');
                if (titleEl) titleEl.textContent = title || '';
                if (descEl) descEl.innerHTML = html || '';
                if (actions) {
                    actions.dataset.richHidden = 'true';
                    actions.style.display = 'none';
                }
                const mobileTitle = document.getElementById('mobile-scene-title');
                const mobileDesc = document.getElementById('mobile-scene-description');
                const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
                if (mobileTitle) mobileTitle.textContent = title || '';
                if (mobileDesc) mobileDesc.innerHTML = html || '';
                if (mobileSheet) mobileSheet.classList.add('rich-content');
                this.renderTileEvents();
            },

            updateScene(title, description, inCombat) {
	                const titleEl = document.getElementById('scene-title');
	                const descEl = document.getElementById('scene-description');
	                if (titleEl) titleEl.textContent = title || '';
	                if (descEl) descEl.textContent = description || '';
	                const mobileTitle = document.getElementById('mobile-scene-title');
	                const mobileDesc = document.getElementById('mobile-scene-description');
	                const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
	                if (mobileTitle) mobileTitle.textContent = title || '';
	                if (mobileDesc) mobileDesc.textContent = description || '';
	                if (mobileSheet) mobileSheet.classList.remove('rich-content');
                    this.renderTileEvents();
	                const actions = document.getElementById('scene-actions');
                if (actions?.dataset?.richHidden) {
                    delete actions.dataset.richHidden;
                    actions.style.display = '';
                }
                const mobileActions = document.getElementById('mobile-actions');
	                const mobileCombat = document.getElementById('mobile-combat-actions');
	                const mobileExplore = document.getElementById('mobile-explore-actions');
	                if (inCombat) {
	                    if (actions) {
	                        actions.innerHTML = this._renderCombatPanelPrompt(this.activeActor || this._currentCombatActor());
	                    }
                    if (mobileCombat) {
                        mobileCombat.innerHTML = '';
                        mobileCombat.style.display = 'none';
                    }
                    if (mobileActions) mobileActions.style.display = 'block';
                    if (mobileExplore) mobileExplore.style.display = 'none';
		                } else {
		                    if (actions) {
		                        actions.innerHTML = this._renderContextActions(false);
		                    }
	                    if (mobileActions) mobileActions.style.display = 'block';
	                    if (mobileCombat) mobileCombat.style.display = 'none';
	                    if (mobileExplore) mobileExplore.innerHTML = this._renderContextActions(true);
	                    if (mobileExplore) mobileExplore.style.display = 'flex';
		                }
		            },
		            renderExplorationActions() {
		                const actions = document.getElementById('scene-actions');
		                if (!actions || this.combatState.active) return;
		                actions.innerHTML = this._renderContextActions(false);
	                const mobileExplore = document.getElementById('mobile-explore-actions');
	                if (mobileExplore) mobileExplore.innerHTML = this._renderContextActions(true);
		            },
            showExplorationActions() {
                const tile = this._currentExplorationTile();
                const biome = this.biomes[tile.biome];
                const title = this.inInterior && this.activeInterior ? `${this.activeInterior.structureName} Interior` : biome.name;
                this.updateScene(title, tile.explored ? 'You are in the ' + biome.name + '. ' + tile.description : 'You stand at the edge of the unknown...', false);
                this.renderExplorationActions();
            },
            closeSceneDetails() {
                try {
                    if (this.combatState?.active) {
                        const entry = this.combatState.turnQueue?.[this.combatState.currentTurn];
                        const unit = entry?.unit;
                        if (unit) {
                            document.getElementById('scene-title').textContent = `Round ${this.combatState.round} - ${unit.name}'s turn`;
                            const turnDescription = unit === this.player || this.party.includes(unit)
                                ? this._label('ui.chooseAction', 'Choose your next action.')
                                : this._label('ui.actorActing', '{name} is acting...', { name: unit.name });
                            document.getElementById('scene-description').innerHTML = `<p>${this._escapeHtml(turnDescription)}</p>`;
                            const mobileSheet = document.querySelector?.('.mobile-scene-sheet');
                            const mobileTitle = document.getElementById('mobile-scene-title');
                            const mobileDesc = document.getElementById('mobile-scene-description');
                            const actions = document.getElementById('scene-actions');
                            if (mobileSheet) mobileSheet.classList.remove('rich-content');
                            if (mobileTitle) mobileTitle.textContent = `Round ${this.combatState.round} - ${unit.name}'s turn`;
                            if (mobileDesc) mobileDesc.textContent = turnDescription;
                            if (actions?.dataset?.richHidden) {
                                delete actions.dataset.richHidden;
                                actions.style.display = '';
                            }
                            if (unit === this.player || this.party.includes(unit)) {
                                this.showActorActions(unit);
                            } else if (actions) {
                                actions.innerHTML = '';
                            }
                            return;
                        }
                    }
                    this.showExplorationActions();
                } catch (err) {
                    this.updateScene(this._label('ui.exploration', 'Exploration'), this._label('ui.chooseAction', 'Choose your next action.'), false);
                    this.renderExplorationActions();
                }
            },
            _escapeHtml(value) {
                return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
            },
            _currentCombatLogMeta(extra = {}) {
                if (!this.combatState?.active) return {};
                const entry = this.combatState.turnQueue?.[this.combatState.currentTurn] || null;
                const actor = extra.actor || entry?.unit || null;
                return {
                    round: this.combatState.round || 1,
                    turnIndex: (this.combatState.currentTurn ?? 0) + 1,
                    actorId: actor ? (actor.id || actor.name || null) : null,
                    actorName: actor?.name || null,
                    phase: extra.phase || (actor ? 'turn' : 'combat')
                };
            },
            _pushLog(entry, type = 'discovery', meta = {}) {
                const next = typeof entry === 'string' ? { text: entry, type } : { ...(entry || {}) };
                next.type = next.type || type;
                const needsCombatMeta = next.type === 'combat' && this.combatState?.active;
                const full = needsCombatMeta ? { ...this._currentCombatLogMeta(meta), ...next, ...meta } : { ...next, ...meta };
                this.log.push(full);
                return full;
            },
            _clearTileEvents() {
                this.tileEvents = [];
                this.renderTileEvents();
            },
            _tileEventTimestamp() {
                try {
                    return `${this._timeLabel()} ${this._isNight() ? this._label('ui.tileInfo.night', 'Night') : this._label('ui.tileInfo.day', 'Day')}`;
                } catch(e) {
                    return '';
                }
            },
            _normalizeTileEventMeta(type = 'discovery', meta = {}) {
                const logMeta = this._logCategoryMeta(type);
                const actorName = meta.actorName || meta.speakerName || meta.actor?.name || null;
                const semanticKind = meta.semanticKind || meta.kind || (actorName ? 'action' : type);
                return {
                    icon: meta.icon || logMeta.icon,
                    label: meta.label || logMeta.label,
                    actorName,
                    speakerName: meta.speakerName || null,
                    intent: meta.intent || null,
                    semanticKind,
                    summary: meta.summary || null
                };
            },
            _addTileEvent(text, type = 'discovery', meta = {}) {
                const message = String(text || '').trim();
                if (!message) return null;
                const presentation = this._normalizeTileEventMeta(type, meta);
                const event = {
                    text: message,
                    type: type || 'discovery',
                    x: this.inInterior ? this.interiorLocation?.x : this.location?.x,
                    y: this.inInterior ? this.interiorLocation?.y : this.location?.y,
                    time: this._tileEventTimestamp(),
                    ...meta,
                    ...presentation
                };
                if (!Array.isArray(this.tileEvents)) this.tileEvents = [];
                this.tileEvents.push(event);
                if (this.tileEvents.length > 12) this.tileEvents = this.tileEvents.slice(-12);
                this.renderTileEvents();
                return event;
            },
            _tileEventFeedHtml() {
                const events = Array.isArray(this.tileEvents) ? this.tileEvents.slice(-6) : [];
                if (!events.length) return '';
                const title = this._escapeHtml(this._label('ui.tileEvents.title', 'Here now'));
                const items = events.map(event => {
                    const type = event.type || 'discovery';
                    const meta = this._normalizeTileEventMeta(type, event);
                    const kind = this._escapeHtml(meta.semanticKind || type);
                    const actor = meta.actorName ? `<span class="tile-event-actor">${this._escapeHtml(meta.actorName)}</span>` : '';
                    const intent = meta.intent ? `<span class="tile-event-intent">${this._escapeHtml(meta.intent)}</span>` : '';
                    const time = event.time ? `<span class="tile-event-time">${this._escapeHtml(event.time)}</span>` : '';
                    return `<div class="tile-event-item ${this._escapeHtml(type)}" data-event-kind="${kind}" role="listitem">` +
                        `<span class="tile-event-icon" aria-label="${this._escapeHtml(meta.label)}">${this._escapeHtml(meta.icon)}</span>` +
                        `<span class="tile-event-body">${actor}${intent}<span class="tile-event-text">${this._escapeHtml(event.text)}</span></span>` +
                        time +
                    `</div>`;
                }).join('');
                return `<section class="tile-event-feed" aria-label="${title}"><div class="tile-event-title">${title}</div><div class="tile-event-list" role="list">${items}</div></section>`;
            },
            renderTileEvents() {
                const html = this._tileEventFeedHtml();
                ['tile-event-feed', 'mobile-tile-event-feed'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.innerHTML = html;
                });
                return html;
            },
            _logTimestamp(entry, indexFromEnd = 0) {
                if (entry?.round && entry?.turnIndex) {
                    const actor = entry.actorName ? ` · ${entry.actorName}` : '';
                    return `R${entry.round} T${entry.turnIndex}${actor}`;
                }
                if (entry?.round && this.combatState?.round) {
                    const diff = Math.max(0, this.combatState.round - entry.round);
                    if (diff === 0) return 'this round';
                    return diff === 1 ? '1 round ago' : `${diff} rounds ago`;
                }
                if (indexFromEnd <= 0) return 'just now';
                return indexFromEnd === 1 ? '1 turn ago' : `${indexFromEnd} turns ago`;
            },
            _logCategoryMeta(type = 'discovery') {
                return this.LOG_CATEGORIES[type] || { label: type || 'Discovery', icon: '•' };
            },
            _filteredLogEntries() {
                const filter = this.logFilter || 'all';
                const query = (this.logSearch || '').trim().toLowerCase();
                return (this.log || []).filter(entry => {
                    if (filter !== 'all' && (entry.type || 'discovery') !== filter) return false;
                    if (query && !String(entry.text || '').toLowerCase().includes(query)) return false;
                    return true;
                });
            },
            loadLogViewPreferences() {
                try {
                    const prefs = JSON.parse(this._getStoredValue('logView') || '{}');
                    const allowed = ['all', 'combat', 'discovery', 'loot', 'heal'];
                    this.logFilter = allowed.includes(prefs.filter) ? prefs.filter : 'all';
                    this.logSearch = typeof prefs.search === 'string' ? prefs.search : '';
                    this.logCollapsed = Boolean(prefs.collapsed);
                    this.logExpanded = Boolean(prefs.expanded) && !this.logCollapsed;
                } catch(e) {
                    this.logFilter = 'all';
                    this.logSearch = '';
                    this.logCollapsed = false;
                    this.logExpanded = false;
                }
            },
            saveLogViewPreferences() {
                this._setStoredValue('logView', JSON.stringify({
                    filter: this.logFilter || 'all',
                    search: this.logSearch || '',
                    collapsed: Boolean(this.logCollapsed),
                    expanded: Boolean(this.logExpanded)
                }));
            },
            _applyLogLayoutState() {
                const root = document.getElementById('app');
                if (root?.classList) {
                    root.classList.toggle('log-collapsed', Boolean(this.logCollapsed));
                    root.classList.toggle('log-expanded', Boolean(this.logExpanded));
                }
                const collapseBtn = document.getElementById('log-toggle-collapse');
                const expandBtn = document.getElementById('log-toggle-expand');
                if (collapseBtn) {
                    const label = this.logCollapsed ? this._label('ui.log.restore', 'Restore') : this._label('ui.log.minimize', 'Minimize');
                    collapseBtn.textContent = label;
                    collapseBtn.title = label;
                    collapseBtn.setAttribute('aria-label', label);
                    collapseBtn.classList?.toggle('active', Boolean(this.logCollapsed));
                    collapseBtn.setAttribute('aria-pressed', String(Boolean(this.logCollapsed)));
                }
                if (expandBtn) {
                    const label = this.logExpanded ? this._label('ui.log.restore', 'Restore') : this._label('ui.log.expand', 'Expand');
                    expandBtn.textContent = label;
                    expandBtn.title = label;
                    expandBtn.setAttribute('aria-label', label);
                    expandBtn.classList?.toggle('active', Boolean(this.logExpanded));
                    expandBtn.setAttribute('aria-pressed', String(Boolean(this.logExpanded)));
                }
            },
            toggleLogCollapsed() {
                this.logCollapsed = !this.logCollapsed;
                if (this.logCollapsed) this.logExpanded = false;
                this.saveLogViewPreferences();
                this.renderLog();
            },
            toggleLogExpanded() {
                this.logExpanded = !this.logExpanded;
                if (this.logExpanded) this.logCollapsed = false;
                this.saveLogViewPreferences();
                this.renderLog();
            },
            setLogFilter(filter = 'all') {
                const allowed = ['all', 'combat', 'discovery', 'loot', 'heal'];
                this.logFilter = allowed.includes(filter) ? filter : 'all';
                this.saveLogViewPreferences();
                this.renderLog();
            },
            setLogSearch(value = '') {
                this.logSearch = value;
                this.saveLogViewPreferences();
                this.renderLog();
            },
            exportLog() {
                const lines = this._filteredLogEntries().map((entry, index, arr) => {
                    const indexFromEnd = arr.length - 1 - index;
                    return `[${entry.type || 'discovery'} | ${this._logTimestamp(entry, indexFromEnd)}] ${entry.text}`;
                });
                const text = lines.join('\n');
                if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && document?.createElement) {
                    try {
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `combat-log-${Date.now()}.txt`;
                        if (typeof a.click === 'function') a.click();
                        URL.revokeObjectURL(url);
                    } catch(e) {}
                }
                return text;
            },
	            renderLog() {
	                const container = document.getElementById('log-content');
                    const filtered = this._filteredLogEntries();
	                const entries = filtered.slice(-20).reverse().map((e, visibleIndex) => {
                        const indexFromEnd = visibleIndex;
                        const type = e.type || 'discovery';
                        const meta = this._logCategoryMeta(type);
	                    let cn = 'log-entry';
	                    if (type) cn += ` ${type}`;
	                    return `<div class="${cn}" role="status"><span class="log-time">${this._escapeHtml(this._logTimestamp(e, indexFromEnd))}</span><span class="log-category" aria-label="${this._escapeHtml(meta.label)}"><span aria-hidden="true">${this._escapeHtml(meta.icon)}</span> ${this._escapeHtml(meta.label)}</span>${this._escapeHtml(e.text)}</div>`;
	                }).join('');
	                if (container) container.innerHTML = entries || `<div class="log-entry text-muted">${this._escapeHtml(this._label('log.noEntriesMatchFilter', 'No log entries match the current filter.'))}</div>`;
                    document.querySelectorAll?.('.log-filter-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.logFilter === (this.logFilter || 'all'));
                    });
                    const search = document.getElementById('log-search');
                    if (search && search.value !== (this.logSearch || '')) search.value = this.logSearch || '';
	                const mobileLog = document.getElementById('mobile-log-summary');
	                if (mobileLog) {
	                    const latest = this.log[this.log.length - 1];
	                    mobileLog.textContent = latest ? latest.text : this._label('ui.welcomeLog', 'Welcome to You Are Wild');
	                }
                    const collapsedSummary = document.getElementById('log-collapsed-summary');
                    if (collapsedSummary) {
                        const latest = this.log[this.log.length - 1];
                        collapsedSummary.textContent = latest ? latest.text : this._label('ui.welcomeLog', 'Welcome to You Are Wild');
                    }
                    this._applyLogLayoutState();
	            },
            clearLog() { this.log = []; this.renderLog(); },
            search() {
                this._advanceTime(1);
                const tile = this._currentExplorationTile();
                const tileX = Number(tile?.x ?? this.location?.x ?? 0);
                const tileY = Number(tile?.y ?? this.location?.y ?? 0);
                const searchDay = this.dayCount || 0;
                const searchHour = this.timeHour || 0;
                const roll = this._worldRoll('search-roll', tileX, tileY, searchDay, searchHour);
                const findChance = Math.min(0.85, 0.3 + (this._hasEquipmentEffect(this.player, 'luckyFind') ? 0.15 : 0) + (this._hasPerkEffect('predatorScent') ? 0.1 : 0) + this._partyRoleEffect('gatherer', 0.1, 0.25));
                let result = '';
                if (roll < findChance) {
                    const struct = tile?.structure ? this.STRUCTURES[tile.structure] : null;
                    const authoredLoot = struct?.lootTable && !tile.structureLooted ? this._lootItemNameFromTable(struct.lootTable, 'structure-search-loot', tileX, tileY, searchDay, searchHour) : null;
                    const items = Object.keys(this.ITEMS);
                    const iname = authoredLoot || this._pickWorldList(items, 'search-item-name', tileX, tileY, searchDay, searchHour);
                    if (authoredLoot) tile.structureLooted = true;
                    const iid = `item_${tileX}_${tileY}_${searchDay}_${searchHour}`;
                    this.inventory.push({ id: iid, name: iname });
                    this._updateQuestProgress('find', { item: iname, name: iname });
                    result = 'You found a ' + iname + '!';
                } else if (roll < 0.6) {
                    result = 'You explore the area. ' + tile.description;
                } else {
                    result = 'Nothing of interest here.';
                }
                this.log.push({ text: result, type: 'discovery' });
                this._addTileEvent(result, 'discovery');
                this.renderLog();
                this.autoSave();
            },
            rest() {
                if (!this._canRestHere()) {
                    const unavailableText = this._label('log.restUnavailable', 'There is no safe place to rest here.');
                    this.log.push({ text: unavailableText, type: 'discovery' });
                    this._addTileEvent(unavailableText, 'discovery');
                    this.renderLog();
                    this.renderExplorationActions();
                    return;
                }
                const healAmount = 30 + this._partyRoleEffect('support', 10, 20);
                const healed = new Set([this.player, ...this.party]);
                healed.forEach(p => { p.CPun = Math.min(p.MPun, p.CPun + healAmount); });
                const restedText = this._label('log.rested', 'Rested and recovered.');
                this.log.push({ text: restedText, type: 'heal' });
                this._addTileEvent(restedText, 'heal');
                this.renderLog(); this.renderParty();
            },

            // ===== SCREEN MANAGEMENT =====
            _focusableSelector() {
                return 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            },
            _focusableChildren(container) {
                if (!container || typeof container.querySelectorAll !== 'function') return [];
                return Array.from(container.querySelectorAll(this._focusableSelector())).filter(el => !el.disabled && el.style?.display !== 'none');
            },
            _focusFirstIn(container) {
                const focusables = this._focusableChildren(container);
                const target = focusables[0] || container;
                if (target && typeof target.focus === 'function') {
                    try { target.focus(); } catch(e) {}
                }
            },
            _activateFocusTrap(container, options = {}) {
                if (!container) return;
                this._restoreFocusTrap({ restoreFocus: false });
                const previous = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
                this._focusTrap = { container, previous, close: options.close || null };
                if (typeof container.hasAttribute === 'function' && typeof container.setAttribute === 'function' && !container.hasAttribute('tabindex')) {
                    container.setAttribute('tabindex', '-1');
                }
                this._focusTrapHandler = (event) => {
                    if (!this._focusTrap || this._focusTrap.container !== container) return;
                    if (event.key === 'Escape' && this._focusTrap.close) {
                        if (typeof event.preventDefault === 'function') event.preventDefault();
                        this._focusTrap.close();
                        return;
                    }
                    if (event.key !== 'Tab') return;
                    const focusables = this._focusableChildren(container);
                    if (focusables.length === 0) {
                        if (typeof event.preventDefault === 'function') event.preventDefault();
                        this._focusFirstIn(container);
                        return;
                    }
                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];
                    if (event.shiftKey && document.activeElement === first) {
                        if (typeof event.preventDefault === 'function') event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        if (typeof event.preventDefault === 'function') event.preventDefault();
                        first.focus();
                    }
                };
                if (typeof document.addEventListener === 'function') document.addEventListener('keydown', this._focusTrapHandler);
                setTimeout(() => this._focusFirstIn(container), 0);
            },
            _activateOutsideContextDismiss(container) {
                if (!container || typeof document.addEventListener !== 'function') return;
                this._mobileContextOutsideHandler = (event) => {
                    const target = event && event.target;
                    const inside = target && (target === container || (typeof container.contains === 'function' && container.contains(target)));
                    if (inside) return;
                    this.closeMobileContextMenu();
                };
                setTimeout(() => {
                    if (this._mobileContextOutsideHandler) {
                        document.addEventListener('pointerdown', this._mobileContextOutsideHandler);
                    }
                }, 0);
            },
            _restoreFocusTrap(options = {}) {
                const trap = this._focusTrap;
                if (this._focusTrapHandler && typeof document.removeEventListener === 'function') {
                    document.removeEventListener('keydown', this._focusTrapHandler);
                }
                if (this._mobileContextOutsideHandler && typeof document.removeEventListener === 'function') {
                    document.removeEventListener('pointerdown', this._mobileContextOutsideHandler);
                }
                this._mobileContextOutsideHandler = null;
                this._focusTrapHandler = null;
                this._focusTrap = null;
                if (options.restoreFocus !== false && trap?.previous && typeof trap.previous.focus === 'function') {
                    try { trap.previous.focus(); } catch(e) {}
                }
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
                } else {
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('screen-menu').style.display = 'flex';
                    this.refreshContinueButton();
                }
            },
            showCharacterStats() {
                if (!this.player) return;
                const p = this._syncPlayerPartyReference() || this.player;
                const stats = this._unitDisplayStats(p);
                const pendingCount = p.pendingPerkChoices || 0;
                const choosePerkLabel = this._escapeHtml(this._label('perk.chooseCount', 'Choose Perk ({count})', { count: pendingCount }));
                const respecLabel = this._escapeHtml(this._label('perk.respec', 'Respec Perks'));
                const debugGrantLabel = this._escapeHtml(this._label('perk.debugGrant', 'Debug +1 Perk Choice'));
                const closeLabel = this._escapeHtml(this._label('perk.closeStats', 'Close'));
                const perkButton = pendingCount > 0 ? `<button class="nav-btn" style="margin-top:12px" title="${choosePerkLabel}" aria-label="${choosePerkLabel}" onclick="App.showPerkSelection()">${choosePerkLabel}</button>` : '';
                const respecDisabled = (p.perks || []).length ? '' : ' disabled';
                const statCard = (labelKey, fallback, body) => `<div class="option-card"><strong>${this._escapeHtml(this._label(labelKey, fallback))}</strong><br>${body}</div>`;
                const levelText = this._escapeHtml(this._label('party.levelSpecies', 'Level {level} {species}', { level: stats.level, species: p.species }));
                const xpText = this._escapeHtml(this._label('character.xp', 'XP: {xp}/{xpToNext}', { xp: p.xp, xpToNext: p.xpToNext }));
                const noneText = this._escapeHtml(this._label('party.none', 'None'));
                const parts = this._escapeHtml(p.parts || this._label('party.none', 'None'));
                const chest = this._escapeHtml(p.chest || this._label('party.none', 'None'));
                const bodyParts = (p.bodyParts || []).map(b => this._escapeHtml(this.BODY_PARTS[b]?.label || b)).join(', ') || noneText;
                const perks = (p.perks || []).map(pk => this._escapeHtml(pk.name)).join(', ') || noneText;
                let html = `<div class="party-stats-view character-stats-view" role="region" aria-label="${closeLabel}">
                    <div class="party-stats-header">
                        <div><h1 style="color:var(--accent-primary)">📊 ${this._escapeHtml(p.name)}</h1><p style="color:var(--text-muted);margin-top:4px">${levelText} | ${xpText}</p></div>
                        <button class="nav-btn" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeSceneDetails()">${closeLabel}</button>
                    </div>
                    <div class="party-stats-grid">
                        ${statCard('party.punishment', 'Punishment', `${stats.CPun}/${stats.MPun}`)}
                        ${statCard('party.pleasure', 'Pleasure', `${stats.CPle}/${stats.MPle}`)}
                        ${statCard('character.combatStats', 'Combat Stats', `Figh: ${stats.Figh} | Feas: ${stats.Feas} | Flir: ${stats.Flir}<br>${this._escapeHtml(this._uiLabel('fuck'))}: ${stats.Fuck} | Flee: ${stats.Flee} | Feed: ${stats.Feed}`)}
                        ${statCard('party.attributes', 'Attributes', `STR: ${stats.str} | CON: ${stats.con} | SPD: ${stats.spd}<br>INT: ${stats.int} | WIS: ${stats.wis} | CHA: ${stats.cha}`)}
                        ${statCard('character.body', 'Body', `${this._escapeHtml(this._label('character.size', 'Size'))}: ${p.size} | ${this._escapeHtml(this._label('character.appetite', 'Appetite'))}: ${p.appetite}<br>${this._escapeHtml(this._label('character.parts', 'Parts'))}: ${parts} | ${this._escapeHtml(this._label('character.chest', 'Chest'))}: ${chest}<br>${this._escapeHtml(this._label('character.bodyParts', 'Body'))}: ${bodyParts}`)}
                        ${statCard('party.equipment', 'Equipment', this._equipmentSummary(p))}
                        ${statCard('party.perks', 'Perks', perks)}
                        ${statCard('character.perkTools', 'Perk Tools', `<span style="color:var(--text-muted);font-size:12px">${this._escapeHtml(this._label('character.perkToolsHelp', 'Balance/debug controls.'))}</span><br><button class="nav-btn" style="margin-top:8px" title="${respecLabel}" aria-label="${respecLabel}" onclick="App.respecPerks()"${respecDisabled}>${respecLabel}</button><button class="nav-btn" style="margin-top:8px" title="${debugGrantLabel}" aria-label="${debugGrantLabel}" onclick="App.debugGrantPerkChoice(1)">${debugGrantLabel}</button>`)}
                    </div>
                    <div class="party-stats-footer">${perkButton}<button class="nav-btn" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeSceneDetails()">${closeLabel}</button></div></div>`;
                this._setRichSceneContent(`${p.name} ${this._label('party.stats', 'Stats')}`, html);
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
                return this.showConfirmDialog({
                    title: this._label('settings.title', 'Settings'),
                    message: this._label('settings.confirmClearAllData', 'WARNING: This will delete ALL saves, modules, and game data. This cannot be undone. Are you sure?'),
                    confirmLabel: this._label('settings.clearAllSaves', 'Clear All Saves'),
                    cancelLabel: this._label('ui.cancel', 'Cancel'),
                    danger: true,
                    onConfirm: () => this._clearAllDataConfirmed()
                });
            },
            _clearAllDataConfirmed() {
                // Delete all saves from IndexedDB
                for (let i = 1; i <= 5; i++) {
                    this._dbDelete('saves', 'slot' + i).catch(() => {});
                    this._removeSaveTime('slot' + i);
                }
                this._removeStoredValue('lastSlot');
                this._removeStoredValue('lastSaveTime');
                this._removeStoredValue('hasPlayed');
                this._removeStoredValue('tutorialComplete');
                this._removeStoredValue('settings');
                this._removeStoredValue('contentPrefs');
                this._removeStoredValue('logView');
                // Delete module DB
                const req = indexedDB.deleteDatabase('YAW_Modules');
                req.onsuccess = () => console.log('Module DB deleted');
                req.onerror = () => console.error('Failed to delete module DB');
                const legacyReq = indexedDB.deleteDatabase('FFFme_Modules');
                legacyReq.onerror = () => console.error('Failed to delete legacy module DB');
                // Delete saves DB
                const req2 = indexedDB.deleteDatabase(this.SAVE_DB_NAME);
                req2.onsuccess = () => console.log('Saves DB deleted');
                req2.onerror = () => console.error('Failed to delete saves DB');
                const legacyReq2 = indexedDB.deleteDatabase(this.LEGACY_SAVE_DB_NAME);
                legacyReq2.onerror = () => console.error('Failed to delete legacy saves DB');
                const worldReq = indexedDB.deleteDatabase(this.WORLD_DB_NAME);
                worldReq.onsuccess = () => console.log('World DB deleted');
                worldReq.onerror = () => console.error('Failed to delete world DB');
                this.refreshContinueButton();
                alert(this._label('settings.clearAllDataDone', 'All data cleared. Refresh the page to start fresh.'));
                this._reloadPage();
            },
            async deleteAllSaves() {
                return this.showConfirmDialog({
                    title: this._label('settings.clearAllSaves', 'Clear All Saves'),
                    message: this._label('save.confirmDeleteAll', 'Delete ALL save data? This cannot be undone!'),
                    confirmLabel: this._label('settings.clearAllSaves', 'Clear All Saves'),
                    cancelLabel: this._label('ui.cancel', 'Cancel'),
                    danger: true,
                    onConfirm: () => this._deleteAllSavesConfirmed()
                });
            },
            async _deleteAllSavesConfirmed() {
                try {
                    for (let i = 1; i <= 5; i++) {
                        await this._dbDelete('saves', 'slot' + i);
                        this._removeSaveTime('slot' + i);
                    }
                    this._removeStoredValue('lastSlot');
                    this._removeStoredValue('lastSaveTime');
                    this._removeStoredValue('hasPlayed');
                    this.activeSlot = 'slot1';
                    await this.refreshContinueButton();
                    alert(this._label('save.success.deletedAll', 'All saves deleted.'));
                    if (document.getElementById('save-manager')?.classList.contains('active')) {
                        this.renderSaveManager();
                    }
                    this._reloadPage();
                } catch (e) {
                    alert(this._label('save.error.deleteAllFailed', 'Delete saves failed: {message}', { message: e.message }));
                }
            },
            selectEncounterPreference(val) { this.setEncounterPreferencePreset(val); },
            updateTierButtons() {
                const btns = { safe: 'tier-safe', mature: 'tier-mature', adult: 'tier-adult' };
                const tiers = { safe: 0, mature: 1, adult: 2 };
                for (const [tier, id] of Object.entries(btns)) {
                    const el = document.getElementById(id);
                    if (el) {
                        const selected = CONTENT.preferences.maxTier === tiers[tier];
                        el.style.background = selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)';
                        el.style.color = selected ? 'var(--bg-primary)' : 'var(--text-secondary)';
                    }
                }
                this.syncCreateContentLevel();
                this.syncSettingVisibility();
            },
            _tierValue(tier) {
                if (typeof tier === 'number') return Math.max(0, Math.min(2, tier));
                return ({ safe: 0, mature: 1, adult: 2 })[tier] ?? 0;
            },
            _tierName(value = CONTENT.preferences.maxTier) {
                const tier = this._tierValue(value);
                if (tier >= 2) return 'adult';
                if (tier >= 1) return 'mature';
                return 'safe';
            },
            setContentTier(tier) {
                const nextTier = this._tierValue(tier);
                CONTENT.setMaxTier(nextTier);
                this.enforceContentTierSettings();
                this.syncSettingVisibility();
                this.syncCreateContentLevel();
                this.saveSettings();
            },
            enforceContentTierSettings() {
                const tier = this._tierValue(CONTENT?.preferences?.maxTier);
                const matureSettings = ['endoMode', 'fatalVore', 'slowDigestion', 'statAbsorption', 'chewing', 'allTheWayThrough', 'powerDynamics', 'refractoryPeriod', 'sameSpeciesBonus'];
                const adultSettings = ['fluidEnabled', 'scat', 'watersports', 'cockVoreEnabled', 'unbirthEnabled', 'forcedFeeding', 'boneCrushing', 'unwillingWarnings'];
                if (tier < 2) {
                    CONTENT.setPreference('explicitDescriptions', false);
                    adultSettings.forEach(key => { this.settings[key] = false; });
                }
                if (tier < 1) {
                    CONTENT.setPreference('voreEnabled', false);
                    matureSettings.forEach(key => { this.settings[key] = false; });
                }
            },
            syncSettingVisibility() {
                const current = this._tierValue(CONTENT?.preferences?.maxTier);
                document.querySelectorAll('[data-setting-tier]').forEach(el => {
                    const required = this._tierValue(el.dataset.settingTier);
                    const visible = required <= current;
                    el.style.display = visible ? '' : 'none';
                    if (!visible) {
                        el.querySelectorAll('input, select, button, textarea').forEach(control => {
                            control.disabled = true;
                        });
                    } else {
                        el.querySelectorAll('input, select, button, textarea').forEach(control => {
                            control.disabled = false;
                        });
                    }
                });
            },
            syncCreateContentLevel() {
                const label = document.getElementById('create-content-level-label');
                if (!label) return;
                const tierName = this._tierName();
                const labelKey = `settings.${tierName}`;
                const fallback = tierName.charAt(0).toUpperCase() + tierName.slice(1);
                label.textContent = this._label(labelKey, fallback);
            },
            openContentSettingsFromCreate() {
                this.settingsReturnScreen = 'create';
                this.showScreen('settings');
                this.showSettings();
                const target = document.getElementById('settings-content-level');
                if (!target) return;
                target.classList.add('settings-focus');
                try {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch (e) {
                    target.scrollIntoView();
                }
                clearTimeout(this._settingsFocusTimer);
                this._settingsFocusTimer = setTimeout(() => target.classList.remove('settings-focus'), 1600);
            },
            saveSettings() {
                this._setStoredValue('settings', JSON.stringify({
                    endoMode: this.settings.endoMode,
                    fatalVore: this.settings.fatalVore,
                    slowDigestion: this.settings.slowDigestion,
                    statAbsorption: this.settings.statAbsorption,
                    chewing: this.settings.chewing,
                    allTheWayThrough: this.settings.allTheWayThrough,
                    powerDynamics: this.settings.powerDynamics,
                    refractoryPeriod: this.settings.refractoryPeriod,
                    sameSpeciesBonus: this.settings.sameSpeciesBonus,
                    fluidEnabled: this.settings.fluidEnabled,
                    scat: this.settings.scat,
                    watersports: this.settings.watersports,
                    cockVoreEnabled: this.settings.cockVoreEnabled,
                    unbirthEnabled: this.settings.unbirthEnabled,
                    forcedFeeding: this.settings.forcedFeeding,
                    boneCrushing: this.settings.boneCrushing,
                    unwillingWarnings: this.settings.unwillingWarnings,
                    hardcore: this.settings.hardcore,
                    partyPlayFightMode: this.settings.partyPlayFightMode,
                    highContrast: this.settings.highContrast,
                    reducedMotion: this.settings.reducedMotion,
                    fontSize: this.settings.fontSize,
                }));
                if (CONTENT?.preferences) {
                    this._setStoredValue('contentPrefs', JSON.stringify(CONTENT.preferences));
                }
                this.updateTierButtons();
            },
            updateLanguage(language) {
                if (CONTENT?.setLanguage) {
                    CONTENT.setLanguage(language);
                } else if (CONTENT?.preferences) {
                    CONTENT.preferences.language = language;
                }
                this.saveSettings();
                this.syncLanguageControl();
                this.applyStaticLocalization();
                this.renderExplorationActions();
                this.renderParty();
                this.renderCreatures();
            },
            syncLanguageControl() {
                const language = document.getElementById('setting-language');
                if (language) language.value = CONTENT?.preferences?.language || 'en';
            },
            updateAccessibilitySetting(key, value) {
                if (key === 'fontSize') {
                    const parsed = Number(value);
                    this.settings.fontSize = Math.max(12, Math.min(20, Number.isFinite(parsed) ? parsed : 14));
                } else if (key === 'highContrast' || key === 'reducedMotion') {
                    this.settings[key] = Boolean(value);
                } else {
                    return;
                }
                this.applyAccessibilitySettings();
                this.syncAccessibilityControls();
                this.saveSettings();
            },
            applyAccessibilitySettings() {
                const body = document.body;
                if (!body) return;
                const fontSize = Math.max(12, Math.min(20, Number(this.settings.fontSize) || 14));
                body.classList.toggle('high-contrast', Boolean(this.settings.highContrast));
                body.classList.toggle('reduced-motion', Boolean(this.settings.reducedMotion));
                if (body.style?.setProperty) {
                    body.style.setProperty('--base-font-size', `${fontSize}px`);
                } else {
                    body.style['--base-font-size'] = `${fontSize}px`;
                    body.style.fontSize = `${fontSize}px`;
                }
            },
            syncAccessibilityControls() {
                const highContrast = document.getElementById('setting-high-contrast');
                const reducedMotion = document.getElementById('setting-reduced-motion');
                const fontSize = document.getElementById('setting-font-size');
                const fontSizeValue = document.getElementById('setting-font-size-value');
                const size = Math.max(12, Math.min(20, Number(this.settings.fontSize) || 14));
                if (highContrast) highContrast.checked = Boolean(this.settings.highContrast);
                if (reducedMotion) reducedMotion.checked = Boolean(this.settings.reducedMotion);
                if (fontSize) fontSize.value = String(size);
                if (fontSizeValue) fontSizeValue.textContent = `${size}px`;
            },
            showSettings() {
                document.getElementById('screen-settings').style.display = 'block';
                document.getElementById('toggle-vore').checked = CONTENT.preferences.voreEnabled;
                document.getElementById('toggle-explicit').checked = CONTENT.preferences.explicitDescriptions;
                document.getElementById('toggle-endo').checked = App.settings.endoMode;
                document.getElementById('toggle-fatal').checked = App.settings.fatalVore;
                document.getElementById('toggle-slow').checked = App.settings.slowDigestion;
                document.getElementById('toggle-absorb').checked = App.settings.statAbsorption;
                document.getElementById('toggle-chew').checked = App.settings.chewing;
                document.getElementById('toggle-attw').checked = App.settings.allTheWayThrough;
                document.getElementById('toggle-power').checked = App.settings.powerDynamics;
                document.getElementById('toggle-refractory').checked = App.settings.refractoryPeriod;
                document.getElementById('toggle-same').checked = App.settings.sameSpeciesBonus;
                document.getElementById('toggle-fluids').checked = App.settings.fluidEnabled;
                document.getElementById('toggle-scat').checked = App.settings.scat;
                document.getElementById('toggle-ws').checked = App.settings.watersports;
                document.getElementById('toggle-cockVore').checked = App.settings.cockVoreEnabled;
                document.getElementById('toggle-unbirth').checked = App.settings.unbirthEnabled;
                document.getElementById('toggle-forcedFeed').checked = App.settings.forcedFeeding;
                document.getElementById('toggle-bones').checked = App.settings.boneCrushing;
                document.getElementById('toggle-warn').checked = App.settings.unwillingWarnings;
                document.getElementById('toggle-hardcore').checked = App.settings.hardcore;
                this.updateTierButtons();
                this.updateCheatButtons();
                this.applyAccessibilitySettings();
                this.syncAccessibilityControls();
                this.syncLanguageControl();
            },
            showNewGameManager() { this.showSaveManager('new'); },
            showSaveManager(mode = 'load') {
                const safeMode = ['load', 'save', 'new'].includes(mode) ? mode : 'load';
                this.saveManagerMode = safeMode;
                this.showScreen('save-manager');
                this.renderSaveManager(safeMode);
            },
            _slotDisplayLabel(slotName) {
                const match = String(slotName || '').match(/^slot(\d+)$/);
                return match ? this._label('save.slotLabel', 'Slot {number}', { number: match[1] }) : String(slotName || '');
            },
            beginNewGameInSlot(slotName) {
                const saveTime = this._getSaveTime(slotName);
                const hasData = parseInt(saveTime) > 0;
                const slotLabel = this._slotDisplayLabel(slotName);
                if (hasData) {
                    return this.showConfirmDialog({
                        title: this._label('save.newTitle', 'Choose New Game Slot'),
                        message: this._label('save.confirm.newGameOverwrite', 'Start a new game in {slot}? This will overwrite that save slot. This cannot be undone.', { slot: slotLabel }),
                        confirmLabel: this._label('save.overwriteSlot', 'Overwrite Slot'),
                        cancelLabel: this._label('ui.cancel', 'Cancel'),
                        danger: true,
                        onConfirm: () => this._startNewGameInSlot(slotName)
                    });
                }
                return this._startNewGameInSlot(slotName);
            },
            _startNewGameInSlot(slotName) {
                this.activeSlot = slotName;
                this._setStoredValue('lastSlot', slotName);
                this.showScreen('create');
                return true;
            },
            renderSaveManager(mode = this.saveManagerMode || 'load') {
                const lastSlot = this._getStoredValue('lastSlot') || 'slot1';
                const isNewMode = mode === 'new';
                const isSaveMode = mode === 'save';
                const titleKey = isNewMode ? 'save.newTitle' : (isSaveMode ? 'save.saveTitle' : 'save.loadTitle');
                const title = this._label(titleKey, isNewMode ? 'Choose New Game Slot' : (isSaveMode ? 'Save Game' : 'Load Game'));
                const saveManager = document.getElementById('save-manager');
                if (saveManager) saveManager.setAttribute('aria-label', title);
                const saveButton = (classes, label, title, onclick, style = '') => `<button class="${classes}" title="${this._escapeHtml(title)}" aria-label="${this._escapeHtml(title)}"${style ? ` style="${style}"` : ''} onclick="${onclick}">${this._escapeHtml(label)}</button>`;
                const descriptionKey = isNewMode ? 'save.newDescription' : (isSaveMode ? 'save.saveDescription' : 'save.loadDescription');
                const description = this._label(descriptionKey, isNewMode ? 'Pick an empty slot for the new run, or deliberately overwrite an occupied slot.' : (isSaveMode ? 'Choose where to save the current game. Occupied slots warn before overwrite.' : 'Choose a save to load, start a new run in a slot, or delete one slot.'));
                let html = '<div class="save-manager-shell"><h1 style="color:var(--accent-primary);margin-bottom:8px;">' + this._escapeHtml(title) + '</h1><p style="color:var(--text-muted);margin-bottom:16px;">' + this._escapeHtml(description) + '</p>';
                if (!isNewMode && !isSaveMode) html += '<div class="save-manager-toolbar">' + saveButton('nav-btn primary', '🆕 ' + this._label('save.toolbarNew', 'New Game'), this._label('save.action.newGame', 'Choose a slot for a new game'), 'App.showNewGameManager()') + '<span>' + this._escapeHtml(this._label('save.toolbarHint', 'Choose a slot next; occupied slots warn before overwrite.')) + '</span></div>';
                for (let i = 1; i <= 5; i++) {
                    const slotName = 'slot' + i;
                    const isActive = slotName === lastSlot;
                    const saveTime = this._getSaveTime(slotName);
                    const hasData = parseInt(saveTime) > 0;
                    const slotLabel = this._label('save.slotLabel', 'Slot {number}', { number: i });
                    const timeStr = hasData ? new Date(parseInt(saveTime)).toLocaleString() : this._label('save.empty', 'Empty');
                    const slotStatus = hasData ? this._label('save.savedGame', 'Saved game') : this._label('save.openSlot', 'Open slot');
                    const hintKey = isNewMode
                        ? (hasData ? 'save.slotHint.occupiedNew' : 'save.slotHint.emptyNew')
                        : (isSaveMode
                            ? (hasData ? 'save.slotHint.occupiedSave' : 'save.slotHint.emptySave')
                            : (hasData ? 'save.slotHint.occupiedLoad' : 'save.slotHint.emptyLoad'));
                    const slotHint = this._label(hintKey, hasData ? 'Saved slot.' : 'Empty slot.');
                    const actionSummaryKey = isNewMode
                        ? (hasData ? 'save.slotActions.occupiedNew' : 'save.slotActions.emptyNew')
                        : (isSaveMode
                            ? (hasData ? 'save.slotActions.occupiedSave' : 'save.slotActions.emptySave')
                            : (hasData ? 'save.slotActions.occupiedLoad' : 'save.slotActions.emptyLoad'));
                    const actionSummary = this._label(actionSummaryKey, 'Actions available for this slot.');
                    const actionSummaryLabel = this._label('save.slotActions.label', 'Available slot actions');
                    html += '<div class="save-slot-card ' + (hasData ? 'occupied' : 'empty') + (isActive ? ' active' : '') + '">';
                    html += '<div><div class="save-slot-title">' + (isActive ? '▶ ' : '') + this._escapeHtml(slotLabel) + '<span class="save-slot-badge">' + this._escapeHtml(slotStatus) + '</span></div><div class="save-slot-time">' + this._escapeHtml(timeStr) + '</div><div class="save-slot-hint">' + this._escapeHtml(slotHint) + '</div><div class="save-slot-summary" aria-label="' + this._escapeHtml(actionSummaryLabel) + '">' + this._escapeHtml(actionSummary) + '</div></div>';
                    html += '<div class="save-slot-actions">';
                    if (isNewMode) html += saveButton('nav-btn primary', '🆕 ' + this._label(hasData ? 'save.overwriteSlot' : 'save.useEmpty', hasData ? 'Overwrite Slot' : 'Use Empty Slot'), this._label(hasData ? 'save.action.overwrite' : 'save.action.useEmpty', hasData ? 'Overwrite {slot} with a new game' : 'Start new game in {slot}', { slot: slotLabel }), 'App.beginNewGameInSlot(\'' + slotName + '\')');
                    if (!isNewMode && !isSaveMode && !hasData) html += saveButton('nav-btn primary', '🆕 ' + this._label('save.toolbarNew', 'New Game'), this._label('save.action.useEmpty', 'Start new game in {slot}', { slot: slotLabel }), 'App.beginNewGameInSlot(\'' + slotName + '\')');
                    if (!isNewMode && !isSaveMode && hasData) html += saveButton('nav-btn', '🆕 ' + this._label('save.newRun', 'New Run'), this._label('save.action.newRun', 'Start a new run in {slot}', { slot: slotLabel }), 'App.beginNewGameInSlot(\'' + slotName + '\')');
                    if (!isNewMode && !isSaveMode && hasData) html += saveButton('nav-btn', '📂 ' + this._label('save.load', 'Load'), this._label('save.action.load', 'Load {slot}', { slot: slotLabel }), 'App.loadFromSlot(\'' + slotName + '\').then(ok => { if (ok) App.showScreen(\'game\'); })');
                    if (isSaveMode) html += saveButton('nav-btn primary', '💾 ' + this._label('save.save', 'Save'), this._label('save.action.save', 'Save current game to {slot}', { slot: slotLabel }), 'App.saveToSlot(\'' + slotName + '\')');
                    if (hasData) html += saveButton('nav-btn', '🗑️ ' + this._label('save.delete', 'Delete'), this._label('save.action.delete', 'Delete {slot}', { slot: slotLabel }), 'App.deleteSlot(\'' + slotName + '\')', 'color:var(--accent-danger);');
                    html += '</div></div>';
                }
                html += '<div style="display:flex;gap:12px;justify-content:center;margin-top:24px;">' + saveButton('nav-btn save-manager-close', this._label('save.close', 'Close'), this._label('save.close', 'Close'), 'returnToGame()') + '</div></div>';
                if (saveManager) {
                    saveManager.innerHTML = html;
                    saveManager.style.display = 'block';
                }
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
            continueLastGame() { this.loadLastPlayed(); },
            executeCombatIntent(action, actor = this.activeActor || this._currentCombatActor()) {
                if (!this.combatState.active) {
                    this.log.push({ text: this._label('combat.notInCombat', 'Not in combat!'), type: 'combat' });
                    this.renderLog();
                    return false;
                }
                if (this.combatState.processing) {
                    this.log.push({ text: this._label('combat.waitForTurn', 'Wait for your turn!'), type: 'combat' });
                    this.renderLog();
                    return false;
                }
                const currentEntry = this.combatState.turnQueue[this.combatState.currentTurn];
                const current = currentEntry ? (currentEntry.unit || currentEntry) : null;
                const isCurrentActor = current && actor && this._unitSelectionId(current) === this._unitSelectionId(actor);
                const isControllable = current && this.party.includes(current) && (current.name === this.player?.name || current.obedient !== false);
                if (!isCurrentActor || !isControllable) {
                    this.log.push({ text: this._label('combat.notYourTurn', 'Not your turn!'), type: 'combat' });
                    this.renderLog();
                    return false;
                }
                this.activeActor = current;
                if (action === 'fight' || action === 'flirt' || action === 'fuck' || action === 'feast') {
                    const currentActorId = this._unitSelectionId(current);
                    if (this.targetSelection?.source === 'combat'
                        && this.targetSelection.action === action
                        && (!this.targetSelection.actorId || this.targetSelection.actorId === currentActorId || this.targetSelection.actorId === current.id || this.targetSelection.actorId === current.name)) {
                        this.cancelTargetSelection();
                        return true;
                    }
                    this.selectTarget(action);
                    return true;
                }
                if (action === 'feed') {
                    this.executeFeedAction();
                    return true;
                }
                if (action === 'sync') {
                    this.showSyncMenu();
                    return true;
                }
                if (action === 'moveRow') {
                    this.moveCombatRow();
                    return true;
                }
                if (action === 'flee' && current.name === this.player?.name) {
                    this.attemptFlee();
                    return true;
                }
                if (action === 'skip') {
                    this.nextTurn();
                    return true;
                }
                return false;
            },
            combatAction(action) {
                return this.executeCombatIntent(action, this.activeActor || this.player);
            },
            togglePanel(p) {
                const panel = document.getElementById('panel-' + p);
                if (!panel) return;
                const isMobile = window.innerWidth <= 1024;
                if (!isMobile) {
                    this.focusDesktopPanel(p);
                    return;
                }
                const wasActive = panel.classList.contains('active');
                document.querySelectorAll('.panel-map, .panel-party, .panel-enemies').forEach(p => p.classList.remove('active'));
                if (!wasActive) panel.classList.add('active');
                this.syncPanelBackdrop();
            },
            focusDesktopPanel(p) {
                const panel = document.getElementById('panel-' + p);
                if (!panel) return;
                this.closeAllPanels();
                document.querySelectorAll('.panel-map, .panel-party, .panel-enemies').forEach(panel => panel.classList.remove('nav-focus'));
                panel.classList.add('nav-focus');
                if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
                const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                try {
                    panel.scrollIntoView({
                        behavior: prefersReducedMotion ? 'auto' : 'smooth',
                        block: 'nearest',
                        inline: 'nearest'
                    });
                } catch (e) {
                    panel.scrollIntoView();
                }
                try { panel.focus({ preventScroll: true }); } catch (e) { panel.focus(); }
                clearTimeout(this._panelFocusTimer);
                this._panelFocusTimer = setTimeout(() => {
                    panel.classList.remove('nav-focus');
                }, 1200);
            },
            closeAllPanels() {
                document.querySelectorAll('.panel-map, .panel-party, .panel-enemies').forEach(p => p.classList.remove('active'));
                this.syncPanelBackdrop();
            },
            syncPanelBackdrop() {
                const backdrop = document.getElementById('panel-backdrop');
                if (!backdrop) return;
                const hasActivePanel = Boolean(document.querySelector('.panel-map.active, .panel-party.active, .panel-enemies.active'));
                backdrop.classList.toggle('active', hasActivePanel);
            },
            _haptic(pattern = 12) {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(pattern); } catch(e) {}
                }
            },
            _touchDistance(touches) {
                if (!touches || touches.length < 2) return 0;
                const dx = touches[0].screenX - touches[1].screenX;
                const dy = touches[0].screenY - touches[1].screenY;
                return Math.sqrt(dx * dx + dy * dy);
            },
            handleMapTouchStart(e) {
                if (!e.touches || e.touches.length < 2) return;
                this._pinchStartDistance = this._touchDistance(e.touches);
                this._pinchStartZoom = this.mobileMapZoom || 1;
            },
            handleMapTouchMove(e) {
                if (!e.touches || e.touches.length < 2 || !this._pinchStartDistance) return;
                if (typeof e.preventDefault === 'function') e.preventDefault();
                const distance = this._touchDistance(e.touches);
                const nextZoom = Math.max(0.75, Math.min(1.8, this._pinchStartZoom * (distance / this._pinchStartDistance)));
                this.mobileMapZoom = Math.round(nextZoom * 100) / 100;
                this.applyMobileMapZoom();
            },
            handleMapTouchEnd() {
                this._pinchStartDistance = 0;
            },
            applyMobileMapZoom() {
                const map = document.getElementById('mobile-mini-map');
                if (map) map.style.transform = `scale(${this.mobileMapZoom || 1})`;
            },
            startMobileCreaturePress(e, targetId) {
                this.cancelMobileCreaturePress();
                this._mobilePressTargetId = targetId;
                this._mobilePressTimer = setTimeout(() => {
                    this._haptic([12, 20, 12]);
                    this.showMobileCreatureContext(targetId);
                }, 500);
            },
            cancelMobileCreaturePress() {
                if (this._mobilePressTimer) clearTimeout(this._mobilePressTimer);
                this._mobilePressTimer = null;
            },
            startMobilePartyPress(e, index) {
                this.cancelMobilePartyPress();
                this._mobilePartyPressIndex = index;
                this._mobilePartyPressTimer = setTimeout(() => {
                    this._haptic([12, 20, 12]);
                    this.showMobilePartyContext(index);
                }, 500);
            },
            cancelMobilePartyPress() {
                if (this._mobilePartyPressTimer) clearTimeout(this._mobilePartyPressTimer);
                this._mobilePartyPressTimer = null;
            },
            _intentCommand(type, targetRef, action, subAction = null, source = 'sheet') {
                const actorIds = this._getExplorationActors().map(actor => actor.id || actor.name);
                const target = this._intentTarget(type, targetRef);
                return {
                    actorIds,
                    action,
                    subAction,
                    targetId: target?.id || target?.name || String(targetRef),
                    targetType: type,
                    source
                };
            },
            _intentTarget(type, targetRef) {
                return type === 'party'
                    ? this.party[Number(targetRef)]
                    : this.creatures.find(c => String(c.id || c.name) === String(targetRef));
            },
            _intentMenuSurface(source = 'sheet', presentation = 'sheet') {
                const normalizedSource = String(source || 'sheet');
                const isDesktop = normalizedSource === 'desktop' || normalizedSource.startsWith('desktop-') || presentation === 'desktop';
                const presentationName = isDesktop ? 'desktop' : (presentation === 'radial' ? 'radial' : 'sheet');
                return {
                    id: isDesktop ? 'desktop-intent-menu' : 'mobile-context-menu',
                    rootClass: `${isDesktop ? 'desktop-intent-menu' : 'mobile-context-menu'} intent-menu intent-menu-${presentationName}`,
                    titleClass: isDesktop ? 'desktop-intent-menu-title' : 'mobile-context-menu-title',
                    actionsClass: isDesktop ? 'desktop-intent-menu-actions' : 'mobile-context-menu-actions',
                    titleId: isDesktop ? 'desktop-intent-menu-title' : 'mobile-context-menu-title',
                    presentation: presentationName
                };
            },
            showIntentMenu(type, targetRef, source = 'sheet', presentation = 'sheet') {
                const isParty = type === 'party';
                const target = this._intentTarget(type, targetRef);
                if (!target) return;
                const isCorpse = this._isCorpse(target);
                this.closeMobileContextMenu();
                const targetName = target.name || (isParty ? 'party member' : 'creature');
                const menuLabel = this._label(isParty ? 'ui.partyActions' : 'ui.creatureActions', isParty ? 'Party actions' : 'Creature actions');
                const targetLabel = this._escapeHtml(targetName);
                const targetArg = isParty ? Number(targetRef) : `'${String(targetRef).replace(/'/g, "\\'")}'`;
                const commandSource = String(source || 'sheet').replace(/'/g, "\\'");
                const surface = this._intentMenuSurface(source, presentation);
                const actionButton = (key, action = key, extraClass = '') => {
                    const label = key === 'close' ? this._label('ui.close', 'Close') : this._uiLabel(key);
                    const icon = this._actionIcon(key);
                    const title = key === 'close' ? label : `${label} ${targetName}`;
                    const handler = action === 'close'
                        ? 'App.closeMobileContextMenu()'
                        : this.SUB_ACTIONS[action]
                            ? `App.openIntentSubActionSheet('${type}',${targetArg},'${action}','${commandSource}')`
                        : `App.selectIntent('${type}',${targetArg},'${action}','${commandSource}')`;
                    return `<button class="action-btn intent-menu-item${extraClass}" role="menuitem" title="${this._escapeHtml(title)}" aria-label="${this._escapeHtml(title)}" onclick="${handler}">${icon ? icon + ' ' : ''}${this._escapeHtml(label)}</button>`;
                };
                let html = `<div class="${surface.rootClass}" id="${surface.id}" role="dialog" aria-modal="true" aria-label="${this._escapeHtml(menuLabel)}" aria-labelledby="${surface.titleId}" data-intent-presentation="${surface.presentation}"><div class="${surface.titleClass}" id="${surface.titleId}">${target.icon || ''} ${targetLabel}</div><div class="${surface.actionsClass}" role="menu">`;
                const selectedActors = this._getExplorationActors();
                const canUsePrimaryActions = !isCorpse && (!isParty || (selectedActors.length > 0 && !(selectedActors.length === 1 && selectedActors.includes(target))));
                const canUseBaselineSocial = isParty || this._hasBaselineInteractionEligibility(target, 'sensitiveSocial');
                if (canUsePrimaryActions) {
                    html += actionButton('fight');
                    if (canUseBaselineSocial) {
                        html += actionButton('flirt');
                        html += actionButton('fuck');
                    }
                    html += actionButton('feast');
                    html += actionButton('feed');
                }
                if (isCorpse) {
                    html += actionButton('loot');
                    html += actionButton('scavenge');
                }
                html += actionButton('inspect');
                if (!isParty && this._canRecruit(this._getExplorationActor(), target)) html += actionButton('recruit', 'recruit', ' primary');
                if (!isParty && target.quest) {
                    const key = target.questAccepted ? 'viewQuest' : 'acceptQuest';
                    const label = this._uiLabel(key);
                    const title = this._label(target.questAccepted ? 'action.viewQuestFrom' : 'action.acceptQuestFrom', target.questAccepted ? 'View quest from {name}' : 'Accept quest from {name}', { name: targetName });
                    html += `<button class="action-btn primary" role="menuitem" title="${this._escapeHtml(title)}" aria-label="${this._escapeHtml(title)}" onclick="App.selectIntent('${type}',${targetArg},'quest','${commandSource}')">📜 ${this._escapeHtml(label)}</button>`;
                }
                if (!isParty && target.disposition === this.DISPOSITION.MERCHANT) {
                    const label = this._uiLabel('trade');
                    const title = this._label('action.tradeWith', 'Trade with {name}', { name: targetName });
                    html += `<button class="action-btn primary" role="menuitem" title="${this._escapeHtml(title)}" aria-label="${this._escapeHtml(title)}" onclick="App.selectIntent('${type}',${targetArg},'trade','${commandSource}')">🪙 ${this._escapeHtml(label)}</button>`;
                }
                html += actionButton('close', 'close');
                html += '</div></div>';
                document.body.insertAdjacentHTML('beforeend', html);
                const menu = document.getElementById(surface.id);
                this._activateFocusTrap(menu, { close: () => this.closeMobileContextMenu() });
                this._activateOutsideContextDismiss(menu);
            },
            showRadialIntentMenu(type, targetRef, source = 'radial') {
                return this.showIntentMenu(type, targetRef, source, 'radial');
            },
            openIntentSubActionSheet(type, targetRef, action, source = 'sheet') {
                const target = this._intentTarget(type, targetRef);
                if (!target || this._isCorpse(target) || !this.SUB_ACTIONS[action]) {
                    return this.selectIntent(type, targetRef, action, source);
                }
                this.closeMobileContextMenu();
                const isParty = type === 'party';
                const actor = this._getExplorationActor();
                const subActions = this._getAvailableSubActions(action, actor, target);
                const targetArg = isParty ? Number(targetRef) : `'${String(targetRef).replace(/'/g, "\\'")}'`;
                const commandSource = String(source || 'sheet').replace(/'/g, "\\'");
                const surface = this._intentMenuSurface(source);
                const title = `${this._uiLabel(action)} ${target.name || ''}`.trim();
                const defaultSub = this._getDefaultSubAction(action);
                const defaultLabel = this._getActionLabel(action, defaultSub);
                let html = `<div class="${surface.rootClass}" id="${surface.id}" role="dialog" aria-modal="true" aria-label="${this._escapeHtml(title)}" aria-labelledby="${surface.titleId}"><div class="${surface.titleClass}" id="${surface.titleId}">${this._actionIcon(action)} ${this._escapeHtml(title)}</div><div class="${surface.actionsClass}" role="menu">`;
                html += `<button class="action-btn primary" role="menuitem" title="${this._escapeHtml(defaultLabel)}" aria-label="${this._escapeHtml(defaultLabel)}" onclick="App.selectIntent('${type}',${targetArg},'${action}','${commandSource}','${defaultSub.replace(/'/g, "\\'")}')">${this._escapeHtml(defaultLabel)}</button>`;
                subActions.filter(sub => sub.id !== defaultSub).forEach(sub => {
                    const label = this._escapeHtml(sub.label);
                    const disabled = sub.available ? '' : ' disabled';
                    const settingHint = sub.available || !sub.setting ? '' : ` (${sub.setting})`;
                    html += `<button class="action-btn" role="menuitem" title="${label}${this._escapeHtml(settingHint)}" aria-label="${label}${this._escapeHtml(settingHint)}"${disabled} onclick="App.selectIntent('${type}',${targetArg},'${action}','${commandSource}','${String(sub.id).replace(/'/g, "\\'")}')">${sub.icon || ''} ${label}</button>`;
                });
                const backLabel = this._escapeHtml(this._label('ui.back', 'Back'));
                const closeLabel = this._escapeHtml(this._label('ui.close', 'Close'));
                html += `<button class="action-btn" role="menuitem" title="${backLabel}" aria-label="${backLabel}" onclick="App.showIntentMenu('${type}',${targetArg},'${commandSource}')">${backLabel}</button>`;
                html += `<button class="action-btn" role="menuitem" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeMobileContextMenu()">${closeLabel}</button>`;
                html += '</div></div>';
                document.body.insertAdjacentHTML('beforeend', html);
                const menu = document.getElementById(surface.id);
                this._activateFocusTrap(menu, { close: () => this.closeMobileContextMenu() });
                this._activateOutsideContextDismiss(menu);
            },
            selectIntent(type, targetRef, action, source = 'sheet', subAction = null) {
                this._haptic(8);
                if (subAction && this.SUB_ACTIONS[action]?.[subAction]) this.defaultSubActions[action] = subAction;
                const command = this._intentCommand(type, targetRef, action, subAction, source);
                this.lastIntentCommand = command;
                this.closeMobileContextMenu();
                if (type === 'party') {
                    const index = Number(targetRef);
                    if (action === 'close') return false;
                    return this.outsideActionForParty(action, index, null, { subAction });
                }
                const targetId = String(targetRef);
                if (action === 'close') return false;
                if (action === 'loot') return Boolean(this.lootCorpse(targetId));
                if (action === 'scavenge') return Boolean(this.scavengeCorpse(targetId));
                if (action === 'recruit') return Boolean(this.recruitCreatureById(targetId));
                if (action === 'quest') return Boolean(this.previewQuestFromUnit(targetId));
                if (action === 'trade') return Boolean(this.showTrade(targetId));
                return this.outsideActionForCreature(action, targetId, { subAction });
            },
            closeMobileContextMenu() {
                const menu = document.getElementById('mobile-context-menu');
                if (menu) menu.remove();
                const desktopMenu = document.getElementById('desktop-intent-menu');
                if (desktopMenu) desktopMenu.remove();
                this._restoreFocusTrap();
            },
            showConfirmDialog(options = {}) {
                const message = String(options.message || '');
                if (!message) return false;
                if (typeof document === 'undefined' || !document.body) {
                    if (typeof confirm === 'function' && !confirm(message)) {
                        return typeof options.onCancel === 'function' ? options.onCancel() : false;
                    }
                    return typeof options.onConfirm === 'function' ? options.onConfirm() : true;
                }
                this.closeConfirmDialog({ restoreFocus: false });
                const id = `confirm-${Date.now ? Date.now() : 'dialog'}`;
                const title = options.title || this._label('ui.confirm', 'Confirm');
                const confirmLabel = options.confirmLabel || this._label('ui.confirm', 'Confirm');
                const cancelLabel = options.cancelLabel || this._label('ui.cancel', 'Cancel');
                this.pendingConfirm = {
                    id,
                    title,
                    message,
                    confirmLabel,
                    cancelLabel,
                    danger: Boolean(options.danger),
                    onConfirm: options.onConfirm || null,
                    onCancel: options.onCancel || null
                };
                const dangerClass = options.danger ? ' danger' : '';
                const html = `<div class="app-confirm-backdrop" id="app-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title" aria-describedby="app-confirm-message"><div class="app-confirm-card"><h3 id="app-confirm-title">${this._escapeHtml(title)}</h3><p id="app-confirm-message">${this._escapeHtml(message)}</p><div class="app-confirm-actions"><button class="nav-btn" onclick="App.resolveConfirmDialog(false)">${this._escapeHtml(cancelLabel)}</button><button class="nav-btn primary${dangerClass}" onclick="App.resolveConfirmDialog(true)">${this._escapeHtml(confirmLabel)}</button></div></div></div>`;
                document.body.insertAdjacentHTML('beforeend', html);
                const dialog = document.getElementById('app-confirm-dialog');
                this._activateFocusTrap(dialog, { close: () => this.resolveConfirmDialog(false) });
                return false;
            },
            resolveConfirmDialog(confirmed) {
                const pending = this.pendingConfirm;
                this.closeConfirmDialog();
                if (!pending) return false;
                if (!confirmed) return typeof pending.onCancel === 'function' ? pending.onCancel() : false;
                return typeof pending.onConfirm === 'function' ? pending.onConfirm() : true;
            },
            closeConfirmDialog(options = {}) {
                const dialog = document.getElementById('app-confirm-dialog');
                if (dialog) dialog.remove();
                this.pendingConfirm = null;
                this._restoreFocusTrap(options);
            },
            showSaveRecoveryDialog(slotName, saveData) {
                const message = this._label('save.recovery.prompt', 'Save data is incompatible or corrupted. Options:\n\n1 = Delete save\n2 = Download backup (as base64)\n3 = Cancel\n\nEnter 1, 2, or 3:');
                if (typeof document === 'undefined' || !document.body) {
                    const choice = typeof prompt === 'function' ? prompt(message) : null;
                    if (choice === '1') return this.resolveSaveRecoveryDialog('delete', slotName, saveData);
                    if (choice === '2') return this.resolveSaveRecoveryDialog('backup', slotName, saveData);
                    return false;
                }
                this.closeConfirmDialog({ restoreFocus: false });
                this.closeSaveRecoveryDialog({ restoreFocus: false });
                const title = this._label('save.recovery.title', 'Recover Save');
                const deleteLabel = this._label('save.recovery.delete', 'Delete Save');
                const backupLabel = this._label('save.recovery.backup', 'Download Backup');
                const cancelLabel = this._label('ui.cancel', 'Cancel');
                this.pendingSaveRecovery = { slotName, saveData, message };
                const html = `<div class="app-confirm-backdrop" id="save-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="save-recovery-title" aria-describedby="save-recovery-message"><div class="app-confirm-card"><h3 id="save-recovery-title">${this._escapeHtml(title)}</h3><p id="save-recovery-message">${this._escapeHtml(message)}</p><div class="app-confirm-actions"><button class="nav-btn" onclick="App.resolveSaveRecoveryDialog('cancel')">${this._escapeHtml(cancelLabel)}</button><button class="nav-btn" onclick="App.resolveSaveRecoveryDialog('backup')">${this._escapeHtml(backupLabel)}</button><button class="nav-btn primary danger" onclick="App.resolveSaveRecoveryDialog('delete')">${this._escapeHtml(deleteLabel)}</button></div></div></div>`;
                document.body.insertAdjacentHTML('beforeend', html);
                const dialog = document.getElementById('save-recovery-dialog');
                this._activateFocusTrap(dialog, { close: () => this.resolveSaveRecoveryDialog('cancel') });
                return false;
            },
            async resolveSaveRecoveryDialog(action, fallbackSlotName = null, fallbackSaveData = null) {
                const pending = this.pendingSaveRecovery || {};
                const slotName = fallbackSlotName || pending.slotName;
                const saveData = fallbackSaveData || pending.saveData;
                this.closeSaveRecoveryDialog();
                if (action === 'delete' && slotName) {
                    await this._dbDelete('saves', slotName);
                    this._removeSaveTime(slotName);
                    alert(this._label('save.recovery.deleted', 'Save deleted.'));
                    return false;
                }
                if (action === 'backup' && slotName && saveData) {
                    this._downloadSaveBackup(slotName, saveData);
                    alert(this._label('save.recovery.backupDownloaded', 'Backup downloaded. Save remains intact.'));
                    return false;
                }
                return false;
            },
            closeSaveRecoveryDialog(options = {}) {
                const dialog = typeof document !== 'undefined' ? document.getElementById('save-recovery-dialog') : null;
                if (dialog) dialog.remove();
                this.pendingSaveRecovery = null;
                this._restoreFocusTrap(options);
            },
            _downloadSaveBackup(slotName, saveData) {
                const bytes = new Uint8Array(saveData);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                const base64 = btoa(binary);
                const blob = new Blob([base64], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'yaw_save_' + slotName + '_backup.txt';
                a.click();
                URL.revokeObjectURL(url);
            },
            showMobilePartyContext(index) {
                const unit = this.party[index];
                if (!unit) return;
                this.closeMobileContextMenu();
                const unitLabel = this._escapeHtml(unit.name || 'party member');
                const role = this._getPartyRole(unit);
                const order = this._getPartyAIOrder(unit);
                const actionButton = (label, action, extraClass = '') => `<button class="action-btn${extraClass}" role="menuitem" title="${this._escapeHtml(label)}" aria-label="${this._escapeHtml(label)}" onclick="App.mobilePartyContextAction('${action}',${index})">${this._escapeHtml(label)}</button>`;
                const roleOptions = Object.keys(this.PARTY_ROLES).map(key => `<option value="${key}" ${role === key ? 'selected' : ''}>${this._escapeHtml(this._partyRoleLabel(key))}</option>`).join('');
                const orderOptions = Object.keys(this.PARTY_AI_ORDERS).map(key => `<option value="${key}" ${order === key ? 'selected' : ''}>${this._escapeHtml(this._partyAIOrderLabel(key))}</option>`).join('');
                const menuLabel = this._label('ui.partyActions', 'Party actions');
                const roleLabel = this._label('party.role', 'Role');
                const orderLabel = this._label('party.aiOrder', 'AI Order');
                const roleAria = this._label('party.roleFor', 'Party role for {name}', { name: unit.name || 'party member' });
                const orderAria = this._label('party.aiOrderFor', 'AI order for {name}', { name: unit.name || 'party member' });
                const roleDescription = this._partyRoleDescription(role);
                const orderDescription = this._partyAIOrderDescription(order);
                let html = `<div class="mobile-context-menu" id="mobile-context-menu" role="dialog" aria-modal="true" aria-label="${this._escapeHtml(menuLabel)}" aria-labelledby="mobile-context-menu-title"><div class="mobile-context-menu-title" id="mobile-context-menu-title">${unit.icon || ''} ${unitLabel}</div><div class="mobile-context-menu-actions" role="menu">`;
                html += actionButton(this._label('party.stats', 'Stats'), 'stats');
                html += actionButton(menuLabel, 'actions', ' primary');
                if (unit !== this.player && !unit.mc) {
                    if (this._getPartyLeader() !== unit) html += actionButton(this._label('party.makeLeader', 'Make Leader'), 'lead');
                    html += `<label class="mobile-context-field" onclick="event.stopPropagation()"><span>${this._escapeHtml(roleLabel)}</span><select class="nav-btn" aria-label="${this._escapeHtml(roleAria)}" title="${this._escapeHtml(roleDescription)}" onchange="event.stopPropagation();App.mobilePartyContextSetRole(${index},this.value)">${roleOptions}</select><small>${this._escapeHtml(roleDescription)}</small></label>`;
                    html += `<label class="mobile-context-field" onclick="event.stopPropagation()"><span>${this._escapeHtml(orderLabel)}</span><select class="nav-btn" aria-label="${this._escapeHtml(orderAria)}" title="${this._escapeHtml(orderDescription)}" onchange="event.stopPropagation();App.mobilePartyContextSetAIOrder(${index},this.value)">${orderOptions}</select><small>${this._escapeHtml(orderDescription)}</small></label>`;
                    html += actionButton(this._label('party.dismiss', 'Dismiss'), 'dismiss', ' danger');
                }
                html += actionButton(this._label('ui.close', 'Close'), 'close');
                html += '</div></div>';
                document.body.insertAdjacentHTML('beforeend', html);
                const menu = document.getElementById('mobile-context-menu');
                this._activateFocusTrap(menu, { close: () => this.closeMobileContextMenu() });
                this._activateOutsideContextDismiss(menu);
            },
            mobilePartyContextAction(action, index) {
                this._haptic(8);
                if (action === 'close') {
                    this.closeMobileContextMenu();
                    return;
                }
                this.closeMobileContextMenu();
                if (action === 'stats') return this.showPartyMemberStats(index);
                if (action === 'actions') return this.showIntentMenu('party', index);
                if (action === 'lead') return this.setPartyLeader(index);
                if (action === 'dismiss') return this.dismissPartyMember(index);
            },
            mobilePartyContextSetRole(index, role) {
                this._haptic(8);
                this.setPartyRole(index, role);
                if (this.party[index] && document.getElementById('mobile-context-menu')) {
                    this.showMobilePartyContext(index);
                }
            },
            mobilePartyContextSetAIOrder(index, order) {
                this._haptic(8);
                this.setPartyAIOrder(index, order);
                if (this.party[index] && document.getElementById('mobile-context-menu')) {
                    this.showMobilePartyContext(index);
                }
            },
            showMobileCreatureContext(targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target) return;
                return this.showRadialIntentMenu('creature', targetId, 'longpress');
            },
            mobileCreatureContextAction(action, targetId) {
                this._haptic(8);
                this.closeMobileContextMenu();
                if (action === 'recruit') return this.recruitCreatureById(targetId);
                if (action === 'inspect') {
                    const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                    if (target) return this.outsideActionOnTarget('inspect', target, this._getExplorationActor());
                    return;
                }
                this.outsideActionForCreature(action, targetId);
            },
            handleTouchStart(e) {
                this._touchStartX = e.changedTouches[0].screenX;
                this._touchStartY = e.changedTouches[0].screenY;
            },
            handleTouchEnd(e) {
                const endX = e.changedTouches[0].screenX;
                const endY = e.changedTouches[0].screenY;
                const dx = endX - this._touchStartX;
                const dy = endY - this._touchStartY;
                if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
                if (window.innerWidth > 1024) return;
                const mapP = document.getElementById('panel-map');
                const partyP = document.getElementById('panel-party');
                const enemiesP = document.getElementById('panel-enemies');
                this._haptic(6);
                if (dx > 0) {
                    if (partyP && partyP.classList.contains('active')) partyP.classList.remove('active');
                    else if (enemiesP && enemiesP.classList.contains('active')) enemiesP.classList.remove('active');
                    else if (mapP && !mapP.classList.contains('active')) mapP.classList.add('active');
	                } else {
	                    if (mapP && mapP.classList.contains('active')) mapP.classList.remove('active');
	                    else if (partyP && !partyP.classList.contains('active')) partyP.classList.add('active');
	                    else if (partyP && partyP.classList.contains('active') && enemiesP) { partyP.classList.remove('active'); enemiesP.classList.add('active'); }
	                    else if (enemiesP && enemiesP.classList.contains('active')) enemiesP.classList.remove('active');
	                }
	                this.syncPanelBackdrop();
	            },

            // ===== SAVE / LOAD =====
            _saveSlotNames() {
                return Array.from({ length: 5 }, (_, index) => 'slot' + (index + 1));
            },
            async _findLatestExistingSaveSlot() {
                const slots = [];
                for (const slotName of this._saveSlotNames()) {
                    const saveData = await this._dbGet('saves', slotName);
                    if (saveData) {
                        const time = parseInt(this._getSaveTime(slotName), 10) || 0;
                        slots.push({ slotName, time });
                    }
                }
                slots.sort((a, b) => b.time - a.time || a.slotName.localeCompare(b.slotName));
                return slots[0]?.slotName || null;
            },
            async _syncLastSaveSlot() {
                const lastSlot = this._getStoredValue('lastSlot');
                if (lastSlot) {
                    const saveData = await this._dbGet('saves', lastSlot);
                    if (saveData) return lastSlot;
                }
                const fallbackSlot = await this._findLatestExistingSaveSlot();
                if (fallbackSlot) {
                    this._setStoredValue('lastSlot', fallbackSlot);
                    const saveTime = this._getSaveTime(fallbackSlot);
                    if (parseInt(saveTime, 10) > 0) this._setStoredValue('lastSaveTime', saveTime);
                    return fallbackSlot;
                }
                this._removeStoredValue('lastSlot');
                this._removeStoredValue('lastSaveTime');
                return null;
            },
            async refreshContinueButton() {
                const button = document.getElementById('menu-continue');
                if (!button) return false;
                button.style.display = 'none';
                const hasSave = await this.checkLastPlayed().catch(() => false);
                button.style.display = hasSave ? 'block' : 'none';
                return hasSave;
            },
            async checkLastPlayed() {
                return !!(await this._syncLastSaveSlot());
            },
            async autoSave() {
                if (!this.player || this.screen !== 'game') return;
                try {
                    this._prepareSaveSnapshot();
                    let worldStoreSaved = false;
                    try {
                        await this.persistWorldStateToMapStore();
                        worldStoreSaved = true;
                    } catch (e) {
                        console.warn('World map persistence failed', e);
                    }
                    const saveData = Binary.saveGame(this, { omitWorldMap: worldStoreSaved });
                    await this._dbPut('saves', this.activeSlot, saveData);
                    this._setStoredValue('lastSlot', this.activeSlot);
                    this._setStoredValue('lastSaveTime', Date.now().toString());
                    this._setSaveTime(this.activeSlot, Date.now().toString());
                    console.log('Auto-saved to', this.activeSlot);
                } catch (e) { console.error('Auto-save failed:', e); }
            },
            async saveToSlot(slotName) {
                if (!this.player) { alert(this._label('save.error.noGame', 'No game to save!')); return; }
                const saveTime = this._getSaveTime(slotName);
                const slotLabel = this._slotDisplayLabel(slotName);
                if (parseInt(saveTime) > 0 && slotName !== this.activeSlot) {
                    return this.showConfirmDialog({
                        title: this._label('save.saveTitle', 'Save Game'),
                        message: this._label('save.confirm.manualOverwrite', 'Overwrite {slot} with the current game? This cannot be undone.', { slot: slotLabel }),
                        confirmLabel: this._label('save.save', 'Save'),
                        cancelLabel: this._label('ui.cancel', 'Cancel'),
                        danger: true,
                        onConfirm: () => this._saveToSlotConfirmed(slotName)
                    });
                }
                return this._saveToSlotConfirmed(slotName);
            },
            async _saveToSlotConfirmed(slotName) {
                const slotLabel = this._slotDisplayLabel(slotName);
                try {
                    this._prepareSaveSnapshot();
                    let worldStoreSaved = false;
                    try {
                        await this.persistWorldStateToMapStore();
                        worldStoreSaved = true;
                    } catch (e) {
                        console.warn('World map persistence failed', e);
                    }
                    const saveData = Binary.saveGame(this, { omitWorldMap: worldStoreSaved });
                    await this._dbPut('saves', slotName, saveData);
                    this.activeSlot = slotName;
                    this._setStoredValue('lastSlot', slotName);
                    this._setStoredValue('lastSaveTime', Date.now().toString());
                    this._setSaveTime(slotName, Date.now().toString());
                    alert(this._label('save.success.saved', 'Game saved to {slot}!', { slot: slotLabel }));
                    return true;
                } catch (e) { alert(this._label('save.error.saveFailed', 'Save failed: {message}', { message: e.message })); }
                return false;
            },
            async loadFromSlot(slotName) {
                try {
                    const slotLabel = this._slotDisplayLabel(slotName);
                    const saveData = await this._dbGet('saves', slotName);
                    if (!saveData) { alert(this._label('save.error.noSave', 'No save in {slot}', { slot: slotLabel })); return false; }
                    let loaded;
                    try {
                        loaded = Binary.loadGame(saveData);
                    } catch (e) {
                        console.error('Incompatible save:', e);
                        this.showSaveRecoveryDialog(slotName, saveData);
                        return false;
                    }
                    this.encounterPreference = loaded.encounterPreference || 'any';
                    this.encounterWeights = this._normalizeEncounterWeights(loaded.questState?.encounterWeights || this._legacyEncounterWeights(this.encounterPreference));
                    this.selectedEncounterWeights = { ...this.encounterWeights };
                    this.selectedEncounterPreference = this._encounterPreferenceFromWeights(this.encounterWeights);
	                    this.player = {
	                        name: loaded.playerName, species: loaded.playerSpecies, icon: this.species.find(s => s.id === loaded.playerSpecies)?.icon || '👤',
	                        gender: loaded.playerGender || 'female', level: loaded.playerLevel, CPun: loaded.playerHp, MPun: loaded.playerMaxHp, CPle: Math.floor(loaded.playerMaxHp * 0.5), MPle: loaded.playerMaxHp,
	                        stats: loaded.playerStats, tags: [this.species.find(s => s.id === loaded.playerSpecies)?.name || 'Human']
	                    };
	                    this._normalizeUnit(this.player, { disposition: this.DISPOSITION.PARTY, hero: true, ally: false, mc: true, obedient: true, willing: true });
	                    this.location = { x: loaded.locationX, y: loaded.locationY };
	                    this.largeMapOffset = { x: 0, y: 0 };
	                    this.largeMapRadius = this.largeMapRadius || 8;
	                    const loadedParty = loaded.party && loaded.party.length ? loaded.party : [this.player];
	                    this.party = loadedParty.map((unit, index) => this._normalizeUnit(unit, {
	                        disposition: this.DISPOSITION.PARTY,
	                        hero: index === 0,
	                        ally: index !== 0,
	                        mc: index === 0,
	                        obedient: true
	                    }));
	                    const playerIndex = this.party.findIndex(p => p.name === this.player.name && p.species === this.player.species);
	                    if (playerIndex >= 0) {
	                        this.player = this.party[playerIndex];
	                        this.player.hero = true;
	                        this.player.ally = false;
	                        this.player.mc = true;
	                    } else {
	                        this.party.unshift(this.player);
                    }
                    const savedRoles = loaded.questState?.partyRoles || {};
                    const savedAIOrders = loaded.questState?.partyAIOrders || {};
                    for (const unit of this.party) {
                        const keys = [unit.id, unit.name].filter(Boolean).map(String);
                        const role = keys.map(key => savedRoles[key]).find(value => this.PARTY_ROLES[value]);
                        const order = keys.map(key => savedAIOrders[key]).find(value => this.PARTY_AI_ORDERS[value]);
                        if (role) unit.partyRole = role;
                        if (order) unit.aiOrder = order;
                    }
                    this.explorationActorIds = Array.isArray(loaded.questState?.explorationActorIds) ? loaded.questState.explorationActorIds.map(String) : [];
                    this.explorationTargetIds = Array.isArray(loaded.questState?.explorationPartyTargetIds) ? loaded.questState.explorationPartyTargetIds.map(String) : [];
                    this.currentBiome = loaded.currentBiome || 'forest';
                    this.timeHour = typeof loaded.timeHour === 'number' ? loaded.timeHour : 8;
                    this.dayCount = loaded.questState?.dayCount || 0;
                    this.log = (loaded.log || []).map(t => ({ text: t, type: 'discovery' }));
                    this.creatures = [];
                    this.inventory = loaded.inventory || [];
                    this.quests = loaded.questState?.quests || [];
                    this.player.gold = loaded.questState?.playerGold || this.player.gold || 0;
                    this.player.equipment = loaded.questState?.playerEquipment || this.player.equipment || {};
                    this.player.equipmentBaseStats = loaded.questState?.playerEquipmentBaseStats || null;
                    this._recalculateEquipment(this.player, { inferBase: !loaded.questState?.playerEquipmentBaseStats });
                    this.player.perks = loaded.questState?.playerPerks || this.player.perks || [];
                    this.player.pendingPerkChoices = loaded.questState?.pendingPerkChoices || this.player.pendingPerkChoices || 0;
                    this.partyLeaderId = loaded.questState?.partyLeaderId || this._unitSelectionId(this.player);
                    this.worldMeta = loaded.worldMeta || {
                        worldId: 'world_legacy',
                        seed: loaded.currentBiome || 'default',
                        generatorVersion: 1,
                        mapModsHash: 'legacy'
                    };
                    this.inInterior = false;
                    this.activeInterior = null;
                    this.interiorLocation = { x: 0, y: 0 };
                    this.activeSlot = slotName;
                    this._restoreWorldState(loaded);
                    await this.loadWorldStateFromMapStore().catch(e => console.warn('World map load failed', e));
                    this._restoreCombatState(loaded.questState?.combatState);
                    this._normalizeExplorationSelections();
                    this._setStoredValue('lastSlot', slotName);
                    // Revive any dead party members on load (softcore)
                    let revived = false;
                    if (this.player && this.player.CPun <= 0) {
                        this.player.CPun = 1;
                        this.player.knockedOut = false;
                        revived = true;
                    }
                    for (const p of this.party) {
                        if (p.CPun <= 0) { p.CPun = 1; revived = true; }
                        p.knockedOut = false;
                    }
                    if (revived) {
                        this.log.push({ text: this._label('save.recoveredOnLoad', 'You were revived from the brink of defeat. Welcome back, {name}.', { name: this.player.name }), type: 'discovery' });
                    }
                    this.showScreen('game');
                    this.renderMap(); this.renderParty(); this.renderCreatures(); this.renderLog();
                    if (!this._resumeLoadedCombat()) {
                        this.updateScene('Loaded', 'Welcome back, ' + this.player.name + '!', false);
                    }
                    return true;
                } catch (e) { console.error('Load failed:', e); alert(this._label('save.error.loadFailed', 'Load failed: {message}', { message: e.message })); return false; }
            },
            _restoreWorldState(loaded) {
                this.worldMap = new Map();
                this.tileDeltas = new Map();
                this.exploredTiles = new Set(loaded.exploredTiles || []);
                this.worldMeta = loaded.worldMeta || this.worldMeta || { worldId: 'world_legacy', seed: 'default', generatorVersion: 1, mapModsHash: 'legacy' };
                this.superPatchMap = new Map();
                if (loaded.worldMap) {
                    for (const [key, tile] of Object.entries(loaded.worldMap)) {
                        const [kx, ky] = key.split(',').map(Number);
                        if (typeof tile.x !== 'number') tile.x = Number.isFinite(kx) ? kx : 0;
                        if (typeof tile.y !== 'number') tile.y = Number.isFinite(ky) ? ky : 0;
                        if (Array.isArray(tile.creatures)) {
                            tile.creatures = tile.creatures.map(unit => this._normalizeUnit(unit, {}));
                        }
                        const effective = this.applyTileDelta(this.getBaseTile(tile.x, tile.y), tile);
                        const effectiveKey = this._tileKey(effective.x, effective.y);
                        this.worldMap.set(effectiveKey, effective);
                        this.persistTileDelta(effective.x, effective.y, effective);
                        if (effective.explored) this.exploredTiles.add(effectiveKey);
                    }
                }
                this._rebuildSuperPatchMap();
                const currentTile = this.getTile(this.location.x, this.location.y);
                this.currentBiome = currentTile.biome;
                this.creatures = this._tileCreatures(currentTile.creatures || []);
            },
            _restoreCombatState(savedCombat) {
                const livingEnemies = this._livingEnemies(this.creatures);
                if (!savedCombat?.active || livingEnemies.length === 0) {
                    this.mode = this.GAME_MODE.NORMAL;
                    this.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
                    this.activeActor = null;
                    this.targetSelection = null;
                    return false;
                }
                const resolve = ref => this._findUnitBySaveRef(ref);
                let turnQueue = (savedCombat.turnQueue || [])
                    .map(entry => {
                        const unit = resolve(entry.unitId);
                        if (!unit || unit.CPun <= 0 || unit.knockedOut) return null;
                        return {
                            unit,
                            initiative: entry.initiative || this._calcInitiative(unit),
                            actedThisRound: Boolean(entry.actedThisRound)
                        };
                    })
                    .filter(Boolean);
                if (turnQueue.length === 0) {
                    turnQueue = [...this.party, ...livingEnemies]
                        .filter(unit => unit.CPun > 0 && !unit.knockedOut)
                        .map(unit => ({ unit, initiative: this._calcInitiative(unit), actedThisRound: false }))
                        .sort((a, b) => b.initiative - a.initiative);
                }
                const maxTurn = Math.max(0, turnQueue.length - 1);
                this.mode = this.GAME_MODE.COMBAT;
                this.combatState = {
                    active: true,
                    round: Math.max(1, savedCombat.round || 1),
                    currentTurn: Math.min(Math.max(0, savedCombat.currentTurn || 0), maxTurn),
                    turnQueue,
                    syncActions: (savedCombat.syncActions || []).map(sync => ({
                        type: sync.type,
                        participants: (sync.participantIds || []).map(resolve).filter(Boolean),
                        target: resolve(sync.targetId),
                        resolveAtIndex: sync.resolveAtIndex || 0,
                        round: sync.round || savedCombat.round || 1,
                        resolved: Boolean(sync.resolved)
                    })).filter(sync => sync.target || sync.participants.length),
                    processing: false,
                    xpEarned: savedCombat.xpEarned || 0
                };
                this.activeActor = resolve(savedCombat.activeActorId) || this.combatState.turnQueue[this.combatState.currentTurn]?.unit || this.player;
                this.targetSelection = null;
                return true;
            },
            _resumeLoadedCombat() {
                if (!this.combatState?.active) return false;
                this._clearTransientInteractionState();
                const entry = this.combatState.turnQueue?.[this.combatState.currentTurn];
                const unit = entry?.unit;
                if (!unit || unit.CPun <= 0 || unit.knockedOut || unit.fledCombat) {
                    this.processTurn();
                    return true;
                }
                this.activeActor = unit;
                const isPartyTurn = unit === this.player || this.party.includes(unit);
                const turnTitle = `Round ${this.combatState.round || 1} - ${unit.name}'s turn`;
                const turnDescription = isPartyTurn
                    ? this._label('ui.chooseAction', 'Choose your next action.')
                    : this._label('ui.actorActing', '{name} is acting...', { name: unit.name });
                this.updateScene(turnTitle, turnDescription, true);
                this.renderParty();
                this.renderCreatures();
                this.renderMobileCombatToolbelt();
                if (isPartyTurn) {
                    this.showActorActions(unit);
                } else {
                    this.processTurn();
                    this.autoSave();
                }
                return true;
            },
            async loadLastPlayed() {
                const lastSlot = this._getStoredValue('lastSlot');
                if (!lastSlot) return false;
                return await this.loadFromSlot(lastSlot);
            },
            async deleteSlot(slotName) {
                const slotLabel = this._slotDisplayLabel(slotName);
                return this.showConfirmDialog({
                    title: this._label('save.delete', 'Delete'),
                    message: this._label('save.confirm.deleteSlot', 'Delete save slot {slot}? This permanently removes only this slot and cannot be undone.', { slot: slotLabel }),
                    confirmLabel: this._label('save.delete', 'Delete'),
                    cancelLabel: this._label('ui.cancel', 'Cancel'),
                    danger: true,
                    onConfirm: () => this._deleteSlotConfirmed(slotName)
                });
            },
            async _deleteSlotConfirmed(slotName) {
                try {
                    await this._dbDelete('saves', slotName);
                    this._removeSaveTime(slotName);
                    if (this.activeSlot === slotName) this.activeSlot = 'slot1';
                    await this.refreshContinueButton();
                    this.showSaveManager(this.saveManagerMode || 'load');
                    return true;
                } catch (e) { alert(this._label('save.error.deleteFailed', 'Delete failed: {message}', { message: e.message })); }
                return false;
            },
            async _dbOpen(dbName = this.SAVE_DB_NAME) {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open(dbName, 1);
                    req.onupgradeneeded = e => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
                    };
                    req.onsuccess = e => resolve(e.target.result);
                    req.onerror = () => reject(req.error);
                });
            },
            async _dbPut(store, key, value) {
                return new Promise((resolve, reject) => {
                    this._dbOpen(this.SAVE_DB_NAME).then(db => {
                        const tx = db.transaction('saves', 'readwrite');
                        tx.objectStore('saves').put(value, key);
                        tx.oncomplete = () => { db.close(); resolve(); };
                        tx.onerror = () => { db.close(); reject(tx.error); };
                    }).catch(reject);
                });
            },
            async _dbGet(store, key) {
                const readFrom = dbName => new Promise((resolve, reject) => {
                    this._dbOpen(dbName).then(db => {
                        const tx = db.transaction('saves', 'readonly');
                        const getReq = tx.objectStore('saves').get(key);
                        getReq.onsuccess = () => { db.close(); resolve(getReq.result); };
                        getReq.onerror = () => { db.close(); reject(getReq.error); };
                    }).catch(reject);
                });
                const current = await readFrom(this.SAVE_DB_NAME);
                if (current !== undefined) return current;
                return await readFrom(this.LEGACY_SAVE_DB_NAME).catch(() => undefined);
            },
            async _dbDelete(store, key) {
                const deleteFrom = dbName => new Promise((resolve, reject) => {
                    this._dbOpen(dbName).then(db => {
                        const tx = db.transaction('saves', 'readwrite');
                        tx.objectStore('saves').delete(key);
                        tx.oncomplete = () => { db.close(); resolve(); };
                        tx.onerror = () => { db.close(); reject(tx.error); };
                    }).catch(reject);
                });
                await deleteFrom(this.SAVE_DB_NAME);
                await deleteFrom(this.LEGACY_SAVE_DB_NAME).catch(() => {});
            },
            async _worldDbOpen() {
                return new Promise((resolve, reject) => {
                    if (!indexedDB || typeof indexedDB.open !== 'function') {
                        reject(new Error('IndexedDB unavailable'));
                        return;
                    }
                    const req = indexedDB.open(this.WORLD_DB_NAME, this.WORLD_DB_VERSION);
                    req.onupgradeneeded = e => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds', { keyPath: 'worldId' });
                        if (!db.objectStoreNames.contains('tileDeltas')) db.createObjectStore('tileDeltas', { keyPath: 'key' });
                        if (!db.objectStoreNames.contains('chunkDeltas')) db.createObjectStore('chunkDeltas', { keyPath: 'key' });
                        if (!db.objectStoreNames.contains('entityIndex')) db.createObjectStore('entityIndex', { keyPath: 'key' });
                    };
                    req.onsuccess = e => resolve(e.target.result);
                    req.onerror = () => reject(req.error);
                });
            },
            async persistWorldStateToMapStore() {
                this.persistAllTileDeltas();
                const worldId = this.worldMeta?.worldId || 'world_default';
                const db = await this._worldDbOpen();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(['worlds', 'tileDeltas'], 'readwrite');
                    const worlds = tx.objectStore('worlds');
                    const tileDeltas = tx.objectStore('tileDeltas');
                    const records = Array.from(this.tileDeltas.entries()).map(([key, delta]) => this._tileDeltaRecordFromEntry(key, delta));
                    worlds.put({ ...(this.worldMeta || {}), worldId, updatedAt: Date.now() });
                    const cursorReq = tileDeltas.openCursor();
                    cursorReq.onsuccess = e => {
                        const cursor = e.target.result;
                        if (!cursor) {
                            for (const record of records) tileDeltas.put(record);
                            return;
                        }
                        if (cursor.value?.worldId === worldId) cursor.delete();
                        cursor.continue();
                    };
                    cursorReq.onerror = () => reject(cursorReq.error);
                    tx.oncomplete = () => { db.close(); resolve(records.length); };
                    tx.onerror = () => { db.close(); reject(tx.error); };
                });
            },
            async loadWorldStateFromMapStore() {
                const worldId = this.worldMeta?.worldId;
                if (!worldId) return 0;
                const db = await this._worldDbOpen();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(['worlds', 'tileDeltas'], 'readonly');
                    const worlds = tx.objectStore('worlds');
                    const tileDeltas = tx.objectStore('tileDeltas');
                    const records = [];
                    const worldReq = worlds.get(worldId);
                    worldReq.onsuccess = () => {
                        if (worldReq.result) {
                            this.worldMeta = { ...this.worldMeta, ...worldReq.result };
                        }
                    };
                    const cursorReq = tileDeltas.openCursor();
                    cursorReq.onsuccess = e => {
                        const cursor = e.target.result;
                        if (!cursor) return;
                        if (cursor.value?.worldId === worldId) records.push(cursor.value);
                        cursor.continue();
                    };
                    cursorReq.onerror = () => reject(cursorReq.error);
                    tx.oncomplete = () => {
                        db.close();
                        this._applyTileDeltaRecords(records);
                        const currentTile = this.getTile(this.location.x, this.location.y);
                        this.currentBiome = currentTile.biome;
                        this.creatures = this._tileCreatures(currentTile.creatures || []);
                        resolve(records.length);
                    };
                    tx.onerror = () => { db.close(); reject(tx.error); };
                });
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
