
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
            SAFE_REST_STRUCTURES: ['cabin', 'hut', 'camp', 'shrine', 'spring'],
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
                    sacrifice: { label: 'Sacrifice', sfwLabel: 'Offer', icon: '🐄', validate: (a, t) => (a.livestock || a.willingPrey) && t.size >= a.size - 2, execute: 'sacrificeTo', setting: null },
                    forceFeed: { label: 'Force Feed', sfwLabel: 'Force Feed', icon: '🔗', validate: (a, t, h) => App.settings.forcedFeeding && h && h.length > 0, execute: 'forceFeed', setting: 'forcedFeeding' },
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
                    icon: def.icon, available: def.validate(actor, target, holder),
                    setting: def.setting
                }));
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
                return { actorName: isPlayer ? 'You' : actor?.name || 'Someone', actorVerb: isPlayer ? '' : 's' };
            },
            _iconActionButton(key, icon, onclick, extraClass = '') {
                const label = this._uiLabel(key);
                const className = `action-btn${extraClass ? ' ' + extraClass : ''}`;
                return `<button class="${className}" title="${label}" aria-label="${label}" onclick="${onclick}"><span class="action-icon" aria-hidden="true">${icon}</span><span class="action-caption">${label}</span></button>`;
            },
            _actionLegend(keys) {
                if (keys.length <= 1) return '';
                return `<div class="action-legend" aria-label="Action legend">${keys.map(key => `<span><span aria-hidden="true">${this._actionIcon(key)}</span> ${this._uiLabel(key)}</span>`).join('')}</div>`;
            },
            _actionIcon(key) {
                return { fight: '⚔️', flirt: '😘', feast: '🍽️', fuck: '🔥', feed: '🍲', flee: '🏃', search: '🔍', rest: '🏕️', inventory: '🎒', quests: '📜', interact: '💋', enter: '🚪', exit: '↩️', map: '🗺️', party: '👥', enemies: '⚔️' }[key] || '';
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
            _mapVisibilityRadius() {
                if (!this._isNight() || this._partyHasDarkvision()) return this.DAY_VISIBILITY_RADIUS;
                return Math.max(1, this.DAY_VISIBILITY_RADIUS - this.NIGHT_VISIBILITY_PENALTY);
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
                const panelKeys = includePanels ? ['map', 'party', 'enemies'] : [];
                const allKeys = [...keys, ...panelKeys];
                const targetActions = this._renderExplorationTargetActions();
                return targetActions + allKeys.map(key => this._contextActionButton(key)).join('') + (includePanels ? '' : this._actionLegend(allKeys));
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
                'Lucky Charm': { type: 'equipment', icon: '📿', slot: 'accessory1', equipBonus: { Flee: 2, wis: 1 }, value: 35, desc: 'Accessory. Flee +2, WIS +1' },
                'Focus Ring': { type: 'equipment', icon: '💍', slot: 'accessory2', equipBonus: { Flir: 2, cha: 1 }, value: 55, desc: 'Ring. Flir +2, CHA +1' }
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
            EQUIPMENT_SLOTS: { head: 'Head', body: 'Body', hands: 'Hands', feet: 'Feet', accessory1: 'Accessory 1', accessory2: 'Accessory 2' },
            PERK_TREES: {
                predator: {
                    label: 'Predator',
                    perks: [
                        { id: 'predator_instinct', name: 'Predator Instinct', stat: 'Figh', val: 2, desc: 'Figh +2.' },
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
                        { id: 'iron_will', name: 'Iron Will', stat: 'wis', val: 2, desc: 'WIS +2.' },
                        { id: 'swift_strides', name: 'Swift Strides', stat: 'spd', val: 2, desc: 'SPD +2.', requires: { tree: 'survivor', count: 1 } },
                        { id: 'iron_gut', name: 'Iron Gut', stat: 'con', val: 3, desc: 'CON +3.', requires: { tree: 'survivor', count: 2 } }
                    ]
                }
            },
            XP_REWARDS: { defeatEnemy: 50, consumeEnemy: 75, seduceEnemy: 60, flirtEnemy: 35, feedAlly: 20, feedEnemy: 25, discoverLandmark: 25, consumeAlly: 40 },

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
            location: { x: 0, y: 0 },
            timeHour: 8,
            dayCount: 0,
            log: [],
            logFilter: 'all',
            logSearch: '',
            inventoryFilter: 'all',
            inventorySort: 'name',
            tradeFilter: 'all',
            tradeSort: 'name',
            mobileMapZoom: 1,
            worldMap: new Map(),
            exploredTiles: new Set(),
            superPatchMap: new Map(),
            PATCH_SIZE: 10,
            SUPER_PATCH_SIZE: 3, // 3x3 patches = 30x30 tiles per biome region
            currentBiome: 'forest',
            activeSlot: 'slot1',
            settings: {
                powerDynamics: false, endoMode: false, slowDigestion: false,
                fatalVore: true, chewing: false, allTheWayThrough: false,
                hardcore: false, scat: false, watersports: false,
                boneCrushing: false, unwillingWarnings: false,
                statAbsorption: true, refractoryPeriod: false,
                sameSpeciesBonus: true, fluidEnabled: true,
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
                { id: 'wolf', name: 'Wolf', icon: '🐺', desc: 'Fierce predator' },
                { id: 'fox', name: 'Fox', icon: '🦊', desc: 'Cunning trickster' },
                { id: 'cat', name: 'Cat', icon: '🐱', desc: 'Agile hunter' },
                { id: 'dragon', name: 'Dragon', icon: '🐲', desc: 'Powerful beast' },
                { id: 'naga', name: 'Naga', icon: '🐍', desc: 'Serpent folk' },
                { id: 'bear', name: 'Bear', icon: '🐻', desc: 'Strong brawler' },
                { id: 'tiger', name: 'Tiger', icon: '🐅', desc: 'Deadly stalker' },
                { id: 'bunny', name: 'Bunny', icon: '🐰', desc: 'Swift prey' },
                { id: 'slime', name: 'Slime', icon: '🟢', desc: 'Amorphous' },
                { id: 'harpy', name: 'Harpy', icon: '🦅', desc: 'Sky hunter' },
                { id: 'bat', name: 'Bat', icon: '🦇', desc: 'Night stalker' },
                { id: 'deer', name: 'Deer', icon: '🦌', desc: 'Graceful prey' },
                { id: 'frog', name: 'Frog', icon: '🐸', desc: 'Swamp dweller' },
                { id: 'plant', name: 'Plant', icon: '🌿', desc: 'Carnivorous flora' },
                { id: 'shroom', name: 'Shroom', icon: '🍄', desc: 'Spore bearer' },
                { id: 'bee', name: 'Bee', icon: '🐝', desc: 'Hive warrior' },
                { id: 'goblin', name: 'Goblin', icon: '👺', desc: 'Mischief maker' },
                { id: 'mouse', name: 'Mouse', icon: '🐭', desc: 'Tiny survivor' },
                { id: 'rat', name: 'Rat', icon: '🐀', desc: 'Sewer dweller' },
                { id: 'pig', name: 'Pig', icon: '🐷', desc: 'Mud roller' },
                { id: 'cow', name: 'Cow', icon: '🐮', desc: 'Milk maid' },
                { id: 'sheep', name: 'Sheep', icon: '🐑', desc: 'Woolly prey' },
                { id: 'horse', name: 'Horse', icon: '🐴', desc: 'Gallant steed' },
                { id: 'lizard', name: 'Lizard', icon: '🦎', desc: 'Sun basker' },
                { id: 'spider', name: 'Spider', icon: '🕷️', desc: 'Web weaver' },
                { id: 'centaur', name: 'Centaur', icon: '🐎', desc: 'Half-beast warrior' },
                { id: 'drow', name: 'Drow', icon: '🧝', desc: 'Dark elf' },
                { id: 'hyena', name: 'Hyena', icon: '🐆', desc: 'Laughing hunter' },
                { id: 'raccoon', name: 'Raccoon', icon: '🦝', desc: 'Trash bandit' },
                { id: 'otter', name: 'Otter', icon: '🦦', desc: 'River playmate' },
                { id: 'fish', name: 'Fish', icon: '🐟', desc: 'Water dweller' },
                { id: 'crab', name: 'Crab', icon: '🦀', desc: 'Beach scuttler' },
                { id: 'siren', name: 'Siren', icon: '🧜', desc: 'Enchanting songstress' },
                { id: 'troll', name: 'Troll', icon: '👹', desc: 'Bridge guardian' },
                { id: 'bandit', name: 'Bandit', icon: '🥷', desc: 'Road robber' },
                { id: 'skeleton', name: 'Skeleton', icon: '💀', desc: 'Ancient bones' },
                { id: 'goat', name: 'Goat', icon: '🐐', desc: 'Cliff climber' },
                { id: 'eagle', name: 'Eagle', icon: '🦅', desc: 'Sky predator' }
            ],
            biomes: {
                grove: { name: 'Grove', icon: '🌳', color: '#3a6b2a', bgColor: '#2a4a1a', danger: 1, encounterChance: 0.08, friendlyChance: 0.12, structureChance: 0.05,
                    encounterTable: [
                        { id: 'bunny', weight: 50 }, { id: 'mouse', weight: 20 }, { id: 'sheep', weight: 15 },
                        { id: 'deer', weight: 10 }, { id: 'human', weight: 5 }
                    ], friendlyTable: [
                        { id: 'bunny', weight: 40 }, { id: 'deer', weight: 30 }, { id: 'sheep', weight: 20 },
                        { id: 'human', weight: 10 }
                    ], structureTable: ['tree', 'spring', 'shrine', 'pond'],
                    descriptions: ['A peaceful grove of young trees.','Wildflowers carpet the ground.','A gentle stream bubbles nearby.','Birdsong fills the air.','Sunlight dapples through leaves.'] },
                forest: { name: 'Forest', icon: '🌲', color: '#2d5016', bgColor: '#1a3310', danger: 3, encounterChance: 0.15, friendlyChance: 0.06, structureChance: 0.08,
                    encounterTable: [
                        { id: 'bunny', weight: 25 }, { id: 'deer', weight: 20 }, { id: 'wolf', weight: 15 },
                        { id: 'slime', weight: 15 }, { id: 'harpy', weight: 15 }, { id: 'bear', weight: 10 }
                    ], friendlyTable: [
                        { id: 'bunny', weight: 30 }, { id: 'deer', weight: 25 }, { id: 'human', weight: 15 },
                        { id: 'fox', weight: 15 }, { id: 'cat', weight: 10 }, { id: 'horse', weight: 5 }
                    ], structureTable: ['cabin', 'hut', 'camp', 'tree', 'burrow', 'nest'],
                    descriptions: ['Ancient trees tower overhead.','The forest is dense and humid.','Sunlight filters through leaves.','A clearing opens before you.','Fallen logs and twisted roots make travel slow.'] },
                swamp: { name: 'Swamp', icon: '🐊', color: '#3d4a1e', bgColor: '#2a3310', danger: 4, encounterChance: 0.20, friendlyChance: 0.03, structureChance: 0.06,
                    encounterTable: [
                        { id: 'frog', weight: 25 }, { id: 'shroom', weight: 20 }, { id: 'slime', weight: 20 },
                        { id: 'naga', weight: 15 }, { id: 'plant', weight: 20 }
                    ], friendlyTable: [
                        { id: 'frog', weight: 40 }, { id: 'otter', weight: 20 }, { id: 'human', weight: 10 }
                    ], structureTable: ['hut', 'ruins', 'pond', 'burrow', 'spring'],
                    descriptions: ['Murky waters stretch through twisted cypress trees.','The ground squelches beneath your feet.','Fireflies drift through the fog.','A sunken log bridges a channel.','Gnarled roots form natural archways.'] },
                plains: { name: 'Plains', icon: '🌾', color: '#6b5b1e', bgColor: '#4a4010', danger: 2, encounterChance: 0.12, friendlyChance: 0.08, structureChance: 0.06,
                    encounterTable: [
                        { id: 'bunny', weight: 25 }, { id: 'deer', weight: 20 }, { id: 'human', weight: 15 },
                        { id: 'horse', weight: 15 }, { id: 'wolf', weight: 15 }, { id: 'tiger', weight: 10 }
                    ], friendlyTable: [
                        { id: 'bunny', weight: 30 }, { id: 'deer', weight: 25 }, { id: 'horse', weight: 20 },
                        { id: 'human', weight: 15 }, { id: 'cow', weight: 10 }
                    ], structureTable: ['cabin', 'camp', 'ruins', 'tree', 'pond'],
                    descriptions: ['Tall grasses sway in the warm breeze.','Open grasslands stretch to the horizon.','The plains are peaceful.','A stream cuts through the prairie.','Wind rustles the grass in waves.'] },
                cave: { name: 'Cave', icon: '🦇', color: '#2a2a3a', bgColor: '#1a1a2e', danger: 5, encounterChance: 0.25, friendlyChance: 0.02, structureChance: 0.10,
                    encounterTable: [
                        { id: 'bat', weight: 25 }, { id: 'goblin', weight: 20 }, { id: 'rat', weight: 20 },
                        { id: 'slime', weight: 20 }, { id: 'naga', weight: 10 }, { id: 'dragon', weight: 5 }
                    ], friendlyTable: [
                        { id: 'bat', weight: 30 }, { id: 'goblin', weight: 15 }
                    ], structureTable: ['cave', 'ruins', 'burrow', 'web', 'hut'],
                    descriptions: ['Stalactites hang like teeth from the ceiling.','The cave opens into a vast chamber.','A narrow passage forces you to squeeze through.','An underground river rushes through.','Crystal formations glitter in the darkness.'] },
                jungle: { name: 'Jungle', icon: '🌿', color: '#1a5c1a', bgColor: '#0f3d0f', danger: 4, encounterChance: 0.20, friendlyChance: 0.04, structureChance: 0.08,
                    encounterTable: [
                        { id: 'frog', weight: 20 }, { id: 'plant', weight: 20 }, { id: 'harpy', weight: 20 },
                        { id: 'tiger', weight: 20 }, { id: 'naga', weight: 15 }, { id: 'slime', weight: 5 }
                    ], friendlyTable: [
                        { id: 'frog', weight: 30 }, { id: 'human', weight: 10 }, { id: 'horse', weight: 10 }
                    ], structureTable: ['ruins', 'hut', 'spring', 'nest', 'pond', 'tree'],
                    descriptions: ['Vines hang like curtains.','The jungle is alive with sound.','Humidity presses down like a weight.','A waterfall crashes into a hidden pool.','Thick vegetation forces you to hack forward.'] },
                dungeon: { name: 'Dungeon', icon: '⛓️', color: '#3a2a3a', bgColor: '#1e0a1e', danger: 5, encounterChance: 0.30, friendlyChance: 0.01, structureChance: 0.12,
                    encounterTable: [
                        { id: 'rat', weight: 25 }, { id: 'goblin', weight: 25 }, { id: 'skeleton', weight: 20 },
                        { id: 'spider', weight: 20 }, { id: 'drow', weight: 10 }
                    ], friendlyTable: [
                        { id: 'goblin', weight: 20 }, { id: 'human', weight: 5 }
                    ], structureTable: ['cave', 'ruins', 'camp', 'web', 'burrow', 'hut'],
                    descriptions: ['Stone corridors stretch endlessly.','Iron-barred cells line the walls.','The air is stale and cold.','A brazier smolders with dying coals.','Chains rattle in the darkness.'] },
                manor: { name: 'Manor', icon: '🏰', color: '#4a3a2a', bgColor: '#2e2010', danger: 3, encounterChance: 0.15, friendlyChance: 0.05, structureChance: 0.15,
                    encounterTable: [
                        { id: 'human', weight: 30 }, { id: 'cat', weight: 25 }, { id: 'rat', weight: 20 },
                        { id: 'mouse', weight: 15 }, { id: 'spider', weight: 10 }
                    ], friendlyTable: [
                        { id: 'human', weight: 40 }, { id: 'cat', weight: 30 }, { id: 'mouse', weight: 20 }
                    ], structureTable: ['cabin', 'hut', 'ruins', 'web', 'shrine', 'spring'],
                    descriptions: ['Grand hallways echo with emptiness.','Antique furniture gathers dust.','A portrait gallery watches your passage.','The ballroom is frozen in decay.','Servants quarters hide secrets.'] },
                beach: { name: 'Beach', icon: '🏖️', color: '#1a4a5a', bgColor: '#0f2a3a', danger: 2, encounterChance: 0.12, friendlyChance: 0.08, structureChance: 0.06,
                    encounterTable: [
                        { id: 'crab', weight: 30 }, { id: 'fish', weight: 25 }, { id: 'frog', weight: 20 },
                        { id: 'otter', weight: 15 }, { id: 'siren', weight: 10 }
                    ], friendlyTable: [
                        { id: 'crab', weight: 30 }, { id: 'fish', weight: 25 }, { id: 'otter', weight: 25 },
                        { id: 'frog', weight: 20 }
                    ], structureTable: ['cabin', 'camp', 'spring', 'pond', 'ruins'],
                    descriptions: ['Waves lap against white sand.','Palm trees sway overhead.','Seashells scatter the shore.','A tide pool teems with life.','A distant ship lies wrecked on the reef.'] },
                road: { name: 'Road', icon: '🛤️', color: '#5a5a2a', bgColor: '#3a3a10', danger: 2, encounterChance: 0.10, friendlyChance: 0.06, structureChance: 0.04,
                    encounterTable: [
                        { id: 'human', weight: 25 }, { id: 'mouse', weight: 20 }, { id: 'rat', weight: 20 },
                        { id: 'goblin', weight: 20 }, { id: 'wolf', weight: 10 }, { id: 'bandit', weight: 5 }
                    ], friendlyTable: [
                        { id: 'human', weight: 30 }, { id: 'horse', weight: 20 }, { id: 'mouse', weight: 20 },
                        { id: 'cow', weight: 15 }, { id: 'pig', weight: 15 }
                    ], structureTable: ['cabin', 'camp', 'hut', 'shrine', 'ruins'],
                    descriptions: ['A dirt path stretches between biomes.','Wagon ruts mark the earth.','A weathered signpost points onward.','A campfire ring marks a resting spot.','The road is well-traveled.'] },
                cliff: { name: 'Cliff', icon: '🏔️', color: '#5a5a5a', bgColor: '#3a3a3a', danger: 3, encounterChance: 0.15, friendlyChance: 0.04, structureChance: 0.06,
                    encounterTable: [
                        { id: 'goat', weight: 25 }, { id: 'bat', weight: 20 }, { id: 'eagle', weight: 20 },
                        { id: 'wolf', weight: 20 }, { id: 'harpy', weight: 15 }
                    ], friendlyTable: [
                        { id: 'goat', weight: 40 }, { id: 'eagle', weight: 20 }, { id: 'horse', weight: 15 }
                    ], structureTable: ['cave', 'ruins', 'nest', 'hut', 'camp'],
                    descriptions: ['Rocky outcrops offer treacherous footing.','The wind howls at your back.','A narrow ledge skirts a drop.','A goat path winds upward.','The view from the edge is dizzying.'] },
                water: { name: 'Water', icon: '💧', color: '#1a3a5a', bgColor: '#0f1e3a', danger: 3, encounterChance: 0.20, friendlyChance: 0.05, structureChance: 0.05,
                    encounterTable: [
                        { id: 'fish', weight: 25 }, { id: 'frog', weight: 25 }, { id: 'otter', weight: 20 },
                        { id: 'slime', weight: 20 }, { id: 'naga', weight: 10 }
                    ], friendlyTable: [
                        { id: 'fish', weight: 30 }, { id: 'otter', weight: 25 }, { id: 'frog', weight: 20 },
                        { id: 'crab', weight: 15 }
                    ], structureTable: ['pond', 'spring', 'ruins', 'cave', 'hut'],
                    descriptions: ['The river rushes past.','A lake reflects the sky like glass.','Water cascades over smooth rocks.','The current pulls at your feet.','A hidden spring bubbles from the earth.'] },
                bridge: { name: 'Bridge', icon: '🌉', color: '#5a4a2a', bgColor: '#3a2e10', danger: 4, encounterChance: 0.15, friendlyChance: 0.03, structureChance: 0.08,
                    encounterTable: [
                        { id: 'frog', weight: 25 }, { id: 'human', weight: 25 }, { id: 'goblin', weight: 20 },
                        { id: 'bandit', weight: 20 }, { id: 'troll', weight: 10 }
                    ], friendlyTable: [
                        { id: 'human', weight: 30 }, { id: 'frog', weight: 20 }, { id: 'horse', weight: 10 }
                    ], structureTable: ['cabin', 'hut', 'camp', 'ruins', 'shrine'],
                    descriptions: ['A wooden span creaks beneath you.','Rope bridges sway in the wind.','Stone arches rise from the water.','A toll booth stands abandoned.','The bridge offers a commanding view.'] },
                farm: { name: 'Farm', icon: '🚜', color: '#5a5a2a', bgColor: '#3a3a10', danger: 1, encounterChance: 0.12, friendlyChance: 0.15, structureChance: 0.08,
                    encounterTable: [
                        { id: 'cow', weight: 30 }, { id: 'sheep', weight: 25 }, { id: 'pig', weight: 20 },
                        { id: 'horse', weight: 15 }, { id: 'human', weight: 10 }
                    ], friendlyTable: [
                        { id: 'cow', weight: 30 }, { id: 'sheep', weight: 25 }, { id: 'pig', weight: 20 },
                        { id: 'horse', weight: 15 }, { id: 'human', weight: 10 }
                    ], structureTable: ['cabin', 'hut', 'camp', 'shrine', 'spring', 'pond'],
                    descriptions: ['Barns loom in the golden fields.','A windmill turns lazily.','Plowed earth stretches to the horizon.','Chicken coops clatter with activity.','A silo casts a long shadow.'] },
                indoors: { name: 'Indoors', icon: '🏠', color: '#4a3a2a', bgColor: '#2e2010', danger: 2, encounterChance: 0.10, friendlyChance: 0.08, structureChance: 0.10,
                    encounterTable: [
                        { id: 'human', weight: 25 }, { id: 'cat', weight: 25 }, { id: 'mouse', weight: 25 },
                        { id: 'rat', weight: 15 }, { id: 'spider', weight: 10 }
                    ], friendlyTable: [
                        { id: 'human', weight: 30 }, { id: 'cat', weight: 25 }, { id: 'mouse', weight: 25 },
                        { id: 'rat', weight: 10 }, { id: 'spider', weight: 10 }
                    ], structureTable: ['cabin', 'hut', 'shrine', 'ruins', 'web', 'spring'],
                    descriptions: ['Walls enclose the space.','A hearth glows with dying embers.','Furniture is arranged cozily.','The ceiling is low and beamed.','A door leads to other rooms.'] },
                entrance: { name: 'Entrance', icon: '🚪', color: '#3a3a3a', bgColor: '#1e1e1e', danger: 4, encounterChance: 0.15, encounterTable: [
                    { id: 'human', weight: 25 }, { id: 'goblin', weight: 25 }, { id: 'bat', weight: 20 },
                    { id: 'wolf', weight: 20 }, { id: 'skeleton', weight: 10 }
                ], descriptions: ['A cave mouth yawns in darkness.','A dungeon door stands reinforced.','A portal shimmers with energy.','A gatehouse guards the passage.','An ancient archway frames the way.'] }
            },

            // ===== STRUCTURES (tile features) =====
            STRUCTURES: {
                cabin: { name: 'Cabin', icon: '🏠', encounterChance: 0.25, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.25, stockTable: 'general', species: ['human', 'cat'] },
                    descriptions: ['A small wooden cabin stands before you.','A lone cabin, smoke curling from its chimney.','A weathered cabin with a welcoming glow.'] },
                hut: { name: 'Hut', icon: '🛖', encounterChance: 0.20, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.20, stockTable: 'herbalist', species: ['human', 'shroom'] },
                    descriptions: ['A rustic hut built from sticks and mud.','A simple hut with a thatched roof.','A travelers hut, abandoned or inhabited.'] },
                cave: { name: 'Cave Mouth', icon: '🕳️', encounterChance: 0.35, disposition: 'enemy', threat: 3,
                    descriptions: ['A dark cave mouth yawns before you.','A shallow cave, something stirs within.','A narrow cave, the air is cold and damp.'] },
                ruins: { name: 'Ruins', icon: '🏛️', encounterChance: 0.30, disposition: 'enemy', threat: 3,
                    descriptions: ['Ancient ruins crumble around you.','A collapsed structure, something lurks.','A forgotten ruin, treasures and dangers.'] },
                camp: { name: 'Camp', icon: '⛺', encounterChance: 0.15, disposition: 'neutral', threat: 1,
                    merchant: { chance: 0.45, stockTable: 'traveler', species: ['human', 'horse', 'fox'] },
                    descriptions: ['A small campsite, recently used.','A bandit camp, abandoned or occupied.','A makeshift camp, signs of recent travelers.'] },
                shrine: { name: 'Shrine', icon: '⛩️', encounterChance: 0.10, disposition: 'neutral', threat: 0,
                    merchant: { chance: 0.25, stockTable: 'relic', species: ['human', 'drow'] },
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
            selectedGender: 'female',
            selectedParts: ['clit'], // 'cock', 'clit', 'tits', 'pecs', 'none'
            selectedEncounterPreference: 'any',
            selectedBodyParts: [],
            playerName: 'You',

            init() {
                console.log('App.init() - Mechanics Overhaul');
                this.checkLastPlayed().then(hasSave => {
                    if (hasSave) {
                        document.getElementById('menu-continue').style.display = 'block';
                    }
                }).catch(() => {});
                const hasPlayed = localStorage.getItem('tactical-has-played');
                if (!hasPlayed) {
                    this.showTutorial();
                    localStorage.setItem('tactical-has-played', 'true');
                }
                // Load saved settings
                try {
                    const savedSettings = JSON.parse(localStorage.getItem('fff-settings') || '{}');
                    for (const k of Object.keys(savedSettings)) { this.settings[k] = savedSettings[k]; }
                    const savedPrefs = JSON.parse(localStorage.getItem('fff-content-prefs') || '{}');
                    for (const k of Object.keys(savedPrefs)) { CONTENT.preferences[k] = savedPrefs[k]; }
                } catch(e) { console.warn('Settings load failed', e); }
                this.loadLogViewPreferences();
                this.applyAccessibilitySettings();
                const grid = document.getElementById('species-grid');
                if (grid) grid.innerHTML = this.species.map(s => `<div class="option-card ${s.id === 'human' ? 'selected' : ''}" data-species="${s.id}" onclick="App.selectSpecies('${s.id}')"><div style="font-size:48px">${s.icon}</div><div style="font-weight:600;color:var(--text-primary)">${s.name}</div><div style="font-size:12px;color:var(--text-muted)">${s.desc}</div></div>`).join('');
                this.selectedSpecies = 'human';
                this.initBodyPartsGrid();
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

            selectGender(g) { this.selectedGender = g; },
            selectPart(p) {
                if (this.selectedParts.includes(p)) this.selectedParts = this.selectedParts.filter(x => x !== p);
                else this.selectedParts.push(p);
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
                this._applySpeciesAbilities(this.player);
                this.party = [this.player];
                this.partyLeaderId = this._unitSelectionId(this.player);
                this.creatures = [];
                this.location = { x: 0, y: 0 };
                this.timeHour = 8;
                this.dayCount = 0;
                this.log = [{ text: 'Welcome to the world, ' + name + '.', type: 'discovery' }];
                this.worldMap = new Map();
                this.exploredTiles = new Set();
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
                const label = container === 'womb' ? 'womb' : container === 'balls' ? 'balls' : 'stomach';
                const prefix = actor === this.player ? 'Your' : `${actor.name}'s`;
                return `${prefix} ${label} is too full for ${target.name}!`;
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
                return tile.interior;
            },
            _canRestHere() {
                if (this.inInterior && this.activeInterior) {
                    return this.SAFE_REST_STRUCTURES.includes(this.activeInterior.structure);
                }
                const tile = this.worldMap.get(`${this.location.x},${this.location.y}`);
                if (!tile) return false;
                if (tile.structure && this.SAFE_REST_STRUCTURES.includes(tile.structure)) return true;
                const struct = tile.structure ? this.STRUCTURES[tile.structure] : null;
                return Boolean(struct && struct.threat === 0 && struct.disposition !== 'enemy');
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
                this.creatures = this.creatures.filter(c => c !== unit);
                this._syncCurrentTileCreatures();
                return { fled: true, text: `${unit.name} panics and flees from ${threat?.name || 'the threat'}!` };
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
                if (tile) tile.creatures = this._tileCreatures(this.creatures);
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
            _attemptTimidCreatureFlee(unit, threat = this.player) {
                if (!this._isTimid(unit) || unit.disposition === this.DISPOSITION.ENEMY || this._isCorpse(unit)) return null;
                const chance = Math.min(1, Math.max(0, (unit.Flee || 10) / 20));
                if (Math.random() < chance) {
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
                    if (Math.random() < chance) return this._makeCreatureFlee(unit, threat);
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
                if (Math.random() < chance) {
                    ally.fledCombat = true;
                    this.combatState.turnQueue = this.combatState.turnQueue.filter(entry => entry.unit !== ally);
                    this.combatState.currentTurn = Math.max(-1, this.combatState.currentTurn - 1);
                    this.log.push({ text: `${ally.name} loses their nerve and flees from the fight!`, type: 'combat' });
                    this.renderLog();
                    this.renderParty();
                    this.nextTurn();
                    return true;
                }
                this.log.push({ text: `${ally.name} tries to flee but cannot get away!`, type: 'combat' });
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
                this._applySpeciesAbilities(unit);
                return unit;
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
            // Biomes are large contiguous regions (super-patches of 30x30 tiles)
            // Deterministic assignment based on super-patch coordinates
            _patchNoise(spx, spy) {
                const n1 = Math.abs(spx * 374761393 + spy * 668265263);
                const n2 = Math.abs((spx + 1000) * 668265263 + (spy + 1000) * 374761393);
                const v1 = ((n1 * 9301 + 49297) % 233280) / 233280;
                const v2 = ((n2 * 49297 + 9301) % 233280) / 233280;
                return (v1 + v2 * 0.5) / 1.5;
            },
            _getSuperPatchBiome(spx, spy) {
                const key = `${spx},${spy}`;
                if (this.superPatchMap.has(key)) return this.superPatchMap.get(key);
                // Starting super-patch (0,0) and immediate neighbors are Grove
                if (Math.abs(spx) <= 1 && Math.abs(spy) <= 1) {
                    this.superPatchMap.set(key, 'grove');
                    return 'grove';
                }
                const noise = this._patchNoise(spx, spy);
                const biomeKeys = Object.keys(this.biomes);
                const biomeIndex = Math.floor(noise * biomeKeys.length) % biomeKeys.length;
                const biomeId = biomeKeys[biomeIndex];
                this.superPatchMap.set(key, biomeId);
                return biomeId;
            },
            _rebuildSuperPatchMap() {
                this.superPatchMap = new Map();
                for (const [key, tile] of this.worldMap) {
                    const spx = Math.floor(Math.floor(tile.x / this.PATCH_SIZE) / this.SUPER_PATCH_SIZE);
                    const spy = Math.floor(Math.floor(tile.y / this.PATCH_SIZE) / this.SUPER_PATCH_SIZE);
                    const skey = `${spx},${spy}`;
                    if (!this.superPatchMap.has(skey)) {
                        this.superPatchMap.set(skey, tile.biome);
                    }
                }
            },
            getTile(x, y) {
                const key = `${x},${y}`;
                if (this.worldMap.has(key)) return this.worldMap.get(key);
                const spx = Math.floor(Math.floor(x / this.PATCH_SIZE) / this.SUPER_PATCH_SIZE);
                const spy = Math.floor(Math.floor(y / this.PATCH_SIZE) / this.SUPER_PATCH_SIZE);
                const biomeId = this._getSuperPatchBiome(spx, spy);
                const biome = this.biomes[biomeId];
                const tile = { x, y, biome: biomeId, explored: false, description: '', hasLandmark: false, landmarkName: '', hostile: false, creatures: [], structure: null, structureSpawned: false };
                this.worldMap.set(key, tile);
                return tile;
            },
            isExplored(x, y) { return this.exploredTiles.has(`${x},${y}`); },
            exploreTile(x, y) {
                const key = `${x},${y}`;
                const tile = this.getTile(x, y);
                if (!tile.explored) {
                    tile.explored = true;
                    this.exploredTiles.add(key);
                    const biome = this.biomes[tile.biome];
                    tile.description = biome.descriptions[Math.abs(x * 31 + y * 17) % biome.descriptions.length];
                    if (Math.random() < 0.1) {
                        const landmarks = { grove: ['Sacred Spring','Old Bench','Butterfly Garden'], forest: ['Ancient Tree','Fairy Ring','Hunter\'s Camp'], swamp: ['Sunken Shrine','Witch\'s Hut','Bone Pile'], plains: ['Lone Tree','Abandoned Wagon','Stone Circle'], cave: ['Crystal Chamber','Underground Lake','Collapsed Tunnel'], jungle: ['Waterfall','Hidden Pool','Rope Bridge'] };
                        const list = landmarks[tile.biome] || ['Mysterious Structure'];
                        tile.hasLandmark = true;
                        tile.landmarkName = list[Math.abs(x + y) % list.length];
                    }
                    if (!tile.structure && Math.random() < (biome.structureChance || 0)) {
                        const table = biome.structureTable || [];
                        tile.structure = table[Math.abs(x * 13 + y * 19) % Math.max(1, table.length)] || null;
                    }
                    this.currentBiome = tile.biome;
                }
                return tile;
            },

            enterStructure() {
                if (this.inInterior) return;
                const tile = this._currentOverworldTile();
                if (!tile || !tile.structure) {
                    this.log.push({ text: 'There is no structure to enter here.', type: 'discovery' });
                    this.renderLog();
                    return;
                }
                tile.creatures = this._tileCreatures(this.creatures);
                tile.items = this.inventory.slice();
                this.activeInterior = this._ensureStructureInterior(tile);
                this.inInterior = true;
                this.interiorLocation = { x: 0, y: 0 };
                const room = this._currentInteriorTile();
                room.explored = true;
                this.creatures = this._tileCreatures(room.creatures || []);
                this.currentBiome = room.biome;
                this.log.push({ text: `Entered ${this.activeInterior.structureName}.`, type: 'discovery' });
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
                this.location = { x: origin.x, y: origin.y };
                this.inInterior = false;
                this.activeInterior = null;
                this.interiorLocation = { x: 0, y: 0 };
                this.creatures = this._tileCreatures(tile.creatures || []);
                this.currentBiome = tile.biome;
                document.getElementById('coords').textContent = `${this.location.x}, ${this.location.y}`;
                this.log.push({ text: `Exited ${this.STRUCTURES[tile.structure]?.name || 'the structure'}.`, type: 'move' });
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
                    this.log.push({ text: 'A wall blocks the way.', type: 'move' });
                    this.renderLog();
                    return;
                }
                const oldRoom = this._currentInteriorTile();
                if (oldRoom) oldRoom.creatures = this._tileCreatures(this.creatures);
                this.interiorLocation = { x: nx, y: ny };
                this._advanceTime(1);
                const room = this._currentInteriorTile();
                const wasExplored = room.explored;
                room.explored = true;
                this.creatures = this._tileCreatures(room.creatures || []);
                this.currentBiome = room.biome;
                const biome = this.biomes[room.biome] || this.biomes.indoors;
                this.log.push({ text: `Moved inside ${this.activeInterior.structureName} to ${nx}, ${ny}.`, type: 'move' });
                if (!wasExplored && Math.random() < (biome.encounterChance || 0)) {
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
                    this.log.push({ text: 'You are in combat! Use Flee to escape.', type: 'combat' });
                    this.renderLog();
                    return;
                }
                // Save current tile state before moving
                const oldKey = `${this.location.x},${this.location.y}`;
                const oldTile = this.worldMap.get(oldKey);
                if (oldTile) {
                    oldTile.creatures = this._tileCreatures(this.creatures);
                    oldTile.items = this.inventory.slice();
                }
                this.location.x += dx; this.location.y += dy;
                this._advanceTime(1);
                document.getElementById('coords').textContent = `${this.location.x}, ${this.location.y}`;

                // Check if destination was explored BEFORE we call exploreTile (which marks it)
                const wasExplored = this.isExplored(this.location.x, this.location.y);
                const tile = this.exploreTile(this.location.x, this.location.y);
                const biome = this.biomes[tile.biome];
                this.log.push({ text: `Moved to ${this.location.x}, ${this.location.y} (${biome.name})`, type: 'move' });
                if (tile.hasLandmark) {
                    this.log.push({ text: `Discovered ${tile.landmarkName}!`, type: 'discovery' });
                }

                if (wasExplored) {
                    // Revisiting: only restore saved creatures, never spawn new ones
                    this.creatures = this._tileCreatures(tile.creatures || []);
                    const enemies = this._livingEnemies(this.creatures);
                    if (enemies.length > 0) {
                        this.log.push({ text: `You encounter ${enemies.map(e => e.name).join(', ')}!`, type: 'combat' });
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
                    } else if (Math.random() < biome.encounterChance) {
                        // Roll for friendly vs hostile encounter
                        this.spawnWildEncounter(tile, false, !wasExplored);
                    }
                }
                tile.creatures = this._tileCreatures(this.creatures);
                if (!this.combatState.active) {
                    const restoredEnemies = this._livingEnemies(this.creatures);
                    if (restoredEnemies.length > 0) {
                        this.log.push({ text: `You encounter ${restoredEnemies.map(e => e.name).join(', ')}!`, type: 'combat' });
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
            spawnWildEncounter(tile, isBoss = false, firstEntry = false) {
                const biome = this.biomes[tile.biome];
                const count = isBoss ? 1 : Math.max(1, Math.floor(Math.random() * Math.min(3, Math.max(1, this.player.level - 1))) + 1);
                const creatures = [];
                for (let i = 0; i < count; i++) {
                    const pool = this._timeAdjustedEncounterTable(biome.encounterTable);
                    let sid = this._weightedPick(pool);
                    const danger = biome.danger || 3;
                    const playerMaxDiff = this.player.level <= 3 ? 2 : (this.player.level <= 6 ? 3 : 4);
                    const maxDiff = isBoss ? 5 : Math.min(danger, playerMaxDiff);
                    let attempts = 10;
                    while (attempts > 0) {
                        const diff = this.SPECIES_DIFFICULTY[sid] || 2;
                        if (diff <= maxDiff) break;
                        sid = this._weightedPick(pool);
                        attempts--;
                    }
                    const sp = this.species.find(s => s.id === sid);
                    const lvl = isBoss ? Math.max(1, this.player.level) : Math.max(1, this.player.level - 1 + Math.floor(Math.random() * 2));
                    const base = this._getSpeciesBaseStats(sid);
                    const statMult = isBoss ? 1.0 : (0.6 + Math.random() * 0.3);
                    const hpMult = isBoss ? 1.2 : (0.5 + Math.random() * 0.3);
                    const creature = {
                        id: 'enc_' + Date.now() + '_' + i, name: sp.name + (count > 1 ? ' ' + (i + 1) : ''),
                        species: sid, icon: sp.icon, gender: Math.random() < 0.5 ? 'female' : 'male',
                        identity: Math.random() < 0.5 ? 'female' : 'male', parts: Math.random() < 0.3 ? 'cock' : 'clit', chest: Math.random() < 0.5 ? 'tits' : 'pecs',
                        bodyParts: this.SPECIES_DEFAULT_PARTS[sid] || [], size: this.SPECIES_SIZE[sid] || 4, appetite: Math.floor(Math.random() * 4) + 2,
                        level: lvl, MPun: Math.floor(base.MPun * hpMult * (0.7 + lvl * 0.1)), CPun: Math.floor(base.MPun * hpMult * (0.7 + lvl * 0.1)),
                        MPle: base.MPle, CPle: Math.floor(base.MPle * 0.3),
                        Figh: Math.floor(base.Figh * statMult), Feas: Math.floor(base.Feas * statMult),
                        Flir: Math.floor(base.Flir * statMult), Fuck: Math.floor(base.Fuck * statMult),
                        Flee: Math.floor(base.Flee * statMult), Feed: Math.floor(base.Feed * statMult),
                        hunger: Math.floor((base.hunger || 40) * 0.7), str: Math.floor(base.str * statMult), con: Math.floor(base.con * statMult), spd: Math.floor(base.spd * statMult),
                        int: Math.floor(base.int * statMult), wis: Math.floor(base.wis * statMult), cha: Math.floor(base.cha * statMult),
                        tags: [sp.name], stomach: [], womb: [], balls: [], cum: 0, status: {},
                        expanded: false, hero: false, ally: false, mc: false, obedient: false, willing: Math.random() < 0.3,
                        ...this.SPECIES_ABILITIES[sid] || {}
                    };
                    creature.ambushReady = firstEntry && Boolean(this._getSpeciesTemperament(sid).ambush);
                    this._applyTimeOfDayToCreature(creature);
                    // Calculate disposition based on temperament
                    creature.disposition = this._calculateEncounterDisposition(creature, this.player);
                    creatures.push(creature);
                }
                this.creatures = this._tileCreatures([...(this.creatures || []), ...creatures]);
                tile.creatures = this._tileCreatures(this.creatures);
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
                // Structure always has an encounter inside
                if (Math.random() < struct.encounterChance) {
                    // Pick from structure-appropriate pool or biome pool
                    const pool = this._timeAdjustedEncounterTable(biome.encounterTable);
                    const sid = this._weightedPick(pool);
                    const sp = this.species.find(s => s.id === sid);
                    if (!sp) return;
                    const lvl = Math.max(1, this.player.level - 1 + Math.floor(Math.random() * 2));
                    const base = this._getSpeciesBaseStats(sid);
                    const statMult = 0.6 + Math.random() * 0.3;
                    const hpMult = 0.5 + Math.random() * 0.3;
                    const disp = struct.disposition === 'friendly' ? this.DISPOSITION.FRIENDLY :
                                 struct.disposition === 'neutral' ? this.DISPOSITION.NEUTRAL : this.DISPOSITION.ENEMY;
                    const count = struct.threat >= 2 ? Math.max(1, Math.floor(Math.random() * 2) + 1) : 1;
                    const enemies = [];
                    for (let i = 0; i < count; i++) {
                        const creature = {
                            id: 'struct_' + Date.now() + '_' + i, name: sp.name + (count > 1 ? ' ' + (i + 1) : ''),
                            species: sid, icon: sp.icon, gender: Math.random() < 0.5 ? 'female' : 'male',
                            identity: Math.random() < 0.5 ? 'female' : 'male', parts: Math.random() < 0.3 ? 'cock' : 'clit', chest: Math.random() < 0.5 ? 'tits' : 'pecs',
                            bodyParts: this.SPECIES_DEFAULT_PARTS[sid] || [], size: this.SPECIES_SIZE[sid] || 4, appetite: Math.floor(Math.random() * 4) + 2,
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
                } else if (merchant) {
                    const descIdx = Math.abs(tile.x + tile.y) % struct.descriptions.length;
                    const structDesc = struct.descriptions[descIdx];
                    const encounterText = `You found a ${struct.name}. ${structDesc} ${merchant.name} is trading here.`;
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
                    .map(c => ({ unit: c, initiative: this._calcInitiative(c) + (c.ambushReady ? 100 : 0) }))
                    .sort((a, b) => b.initiative - a.initiative);
                this.combatState.currentTurn = 0;
                const ambushers = enemies.filter(e => e.ambushReady);
                if (ambushers.length > 0) this.log.push({ text: `${ambushers.map(e => e.name).join(', ')} ambush from hiding!`, type: 'combat' });
                this.log.push({ text: `Combat! Order: ${this.combatState.turnQueue.map(e => e.unit.name).join(', ')}`, type: 'combat' });
                this.updateScene(`Round 1`, `Combat started!`, true);
                this.renderParty();
                this.renderCreatures();
                this.processTurn();
            },

            _calcInitiative(c) {
                let base = this._effectiveSpeed(c) + Math.random() * 10;
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
                return { sync_fight: 'Fight', sync_flirt: 'Flirt', sync_fuck: 'Fuck', sync_feed: 'Feed' }[type] || 'Group';
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
                return `<span class="turn-order-badge" title="Turn order" aria-label="Turn order ${base}${sync}" style="font-size:10px;font-weight:800;background:${bg};color:${color};border:1px solid var(--border-default);border-radius:6px;padding:2px 5px;margin-left:4px;white-space:nowrap;">${base}${acted}${sync}</span>`;
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
                if (this._currentBiomeId() === 'cave' && !actor?.darkvision && Math.random() < 0.5) {
                    this.log.push({ text: `${actor.name} loses the target in the cave darkness!`, type: 'combat' });
                    return true;
                }
                return false;
            },

            _applyTerrainRoundEffects(living) {
                if (this._currentBiomeId() !== 'swamp') return;
                for (const unit of living) {
                    if (!unit || unit.CPun <= 0 || unit.flying || unit.status?.stuck) continue;
                    if (Math.random() < 0.2) {
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
                    return `${unit.name} is stunned and loses their turn!`;
                }
                if (status.freeze?.skip) {
                    status.freeze.skip = false;
                    status.freeze.slowTurns = Math.max(status.freeze.slowTurns || 0, 2);
                    return `${unit.name} is frozen in place and loses their turn!`;
                }
                if (status.sleep?.turns > 0) {
                    return `${unit.name} is asleep and cannot act!`;
                }
                if (status.fear?.turns > 0) {
                    const lowHp = unit.CPun < unit.MPun * 0.3;
                    if (lowHp) {
                        unit.fledCombat = true;
                        return `${unit.name} panics and flees from fear!`;
                    }
                    if (Math.random() < 0.5) return `${unit.name} freezes in fear and loses their turn!`;
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
                if (this.party.includes(unit)) return this.party.filter(p => p !== unit && p.CPun > 0 && !p.knockedOut);
                return this.creatures.filter(c => c !== unit && c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
            },

            moveCombatRow() {
                const actor = this.activeActor || this.player;
                if (!this.combatState.active || !actor || actor.CPun <= 0) return;
                actor.combatRow = actor.combatRow === 'back' ? 'front' : 'back';
                this.log.push({ text: `${actor.name} moves to the ${actor.combatRow} row.`, type: 'combat' });
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
                    this.log.push({ text: `${currentUnit.name} is recovering from orgasm and skips their turn.`, type: 'combat' });
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
                    this.log.push({ text: statusSkip, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                // Check if restrained (skip turn)
                if (currentUnit.status?.restrained && currentUnit.status.restrained.turns > 0) {
                    this.log.push({ text: `${currentUnit.name} is restrained and cannot act!`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                if (currentUnit.status?.stuck && currentUnit.status.stuck.turns > 0) {
                    currentUnit.status.stuck.turns--;
                    if (currentUnit.status.stuck.turns <= 0) delete currentUnit.status.stuck;
                    this.log.push({ text: `${currentUnit.name} is stuck in the terrain and loses their turn!`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                // Check if enveloped (skip turn, take damage)
                if (currentUnit.status?.enveloped && currentUnit.status.enveloped.turns > 0) {
                    currentUnit.CPun -= 4;
                    this.log.push({ text: `${currentUnit.name} is enveloped by ${currentUnit.status.enveloped.by}!`, type: 'combat' });
                    if (currentUnit.CPun <= 0) { this.log.push({ text: `${currentUnit.name} succumbs to the envelopment!`, type: 'combat' }); }
                    this.renderLog(); this.nextTurn(); return;
                }
                document.getElementById('scene-title').textContent = `Round ${this.combatState.round} - ${currentUnit.name}'s turn`;
                this.renderParty();
                this.renderCreatures();
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
                this.log.push({ text: `--- Round ${this.combatState.round} ---`, type: 'combat' });
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
                        if (spreadTarget && Math.random() < 0.25) {
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
                this.targetSelection = null;
                this.activeActor = actor || this.player;
                const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                const friendlies = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY && c.CPun > 0);
                const allies = this.party.filter(p => p.CPun > 0 && p.name !== this.activeActor?.name);
                let html = '';
                if (this.cheats.overpowered && this.activeActor?.name === this.player?.name) {
                    html += `<button class="action-btn" style="background:var(--accent-warning);color:var(--bg-primary);" onclick="App.instantWin()">⚡ Instant Win</button>`;
                }
                // 6 Primary Actionables: Fight, Flirt, Feast, Fuck, Feed, Flee
                if (enemies.length > 0) {
                    html += `<button class="action-btn primary" onclick="App.selectTarget('fight')">⚔️ Fight</button>`;
                    html += `<button class="action-btn" onclick="App.selectTarget('flirt')">😘 Flirt</button>`;
                    html += `<button class="action-btn" onclick="App.selectTarget('feast')">🍽️ Feast</button>`;
                    html += `<button class="action-btn" onclick="App.selectTarget('fuck')">🔥 Fuck</button>`;
                }
                if (allies.length > 0) {
                    html += `<button class="action-btn" onclick="App.executeFeedAction()">🍲 Feed</button>`;
                }
                if (enemies.length > 0) {
                    html += `<button class="action-btn" onclick="App.showSyncMenu()">👥 Sync</button>`;
                    html += `<button class="action-btn" onclick="App.moveCombatRow()">↕️ Move</button>`;
                }
                if (allies.length > 0 || friendlies.length > 0) {
                    html += `<button class="action-btn" onclick="App.showInteractMenu()">💋 Interact</button>`;
                }
                if (this.activeActor?.name === this.player?.name) {
                    html += `<button class="action-btn" onclick="App.attemptFlee()">🏃 Flee</button>`;
                } else {
                    html += `<button class="action-btn" onclick="App.nextTurn()">Skip</button>`;
                }
                document.getElementById('scene-actions').innerHTML = html;
            },

            // ===== ACTION TARGETING =====
            selectTarget(action) {
                const actor = this.activeActor || this.player;
                this.targetSelection = { action, source: 'combat', actorId: actor?.id || actor?.name || 'player' };
                const label = action === 'fight' ? 'Fight' : action === 'flirt' ? 'Flirt' : action === 'fuck' ? 'Fuck' : 'Feast';
                document.getElementById('scene-description').innerHTML = `<p>Select a target from the creature panel.</p><button class="nav-btn" style="margin-top:12px" onclick="App.cancelTargetSelection()">Cancel ${label}</button>`;
                this.renderCreatures();
            },

            cancelTargetSelection() {
                this.targetSelection = null;
                this.renderCreatures();
                if (this.combatState.active) this.showPlayerActions();
                else this.showExplorationActions();
            },

            canSelectCreatureTarget(unit) {
                if (!unit || unit.CPun <= 0 || !this.targetSelection) return false;
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
                const targetIndex = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0).indexOf(target);
                if (targetIndex === -1) {
                    this.cancelTargetSelection();
                    return;
                }
                const actor = this.activeActor || this.player;
                if (!this._canReachCombatTarget(actor, target, action)) {
                    this.log.push({ text: `${actor.name} cannot reach ${target.name} from here.`, type: 'combat' });
                    this.targetSelection = null;
                    this.renderLog();
                    this.renderCreatures();
                    this.showActorActions(actor);
                    return;
                }
                this.targetSelection = null;
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
                        const ar = this._AR(actor.Figh);
                        const def = this._effectiveCon(target);
                        const baseDmg = Math.max(1, ar - def * 0.3 + Math.random() * 6);
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
                                        if (confirm(`${target.name} is submissive. Recruit them to your party?`)) {
                                            this.recruitCreature(target);
                                        }
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
	                this.log.push({ text: result, type: 'combat' });
                this._emitCombatAction(action, actor, target, result);
                this.renderLog();
                this.renderCreatures();
                this.renderParty();
                this.combatState.processing = false;
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
                        const prey = this._createStomachPrey(target);
                        if (!actor.stomach) actor.stomach = [];
                        actor.stomach.push(prey);
                        target.CPun = 0; target.CPle = 0;
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
                        const prey = this._createStomachPrey(target, { inCock: true });
                        if (!actor.balls) actor.balls = [];
                        actor.balls.push(prey);
                        target.CPun = 0; target.CPle = 0;
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
                        const prey = this._createStomachPrey(target, { inWomb: true });
                        if (!actor.womb) actor.womb = [];
                        actor.womb.push(prey);
                        target.CPun = 0; target.CPle = 0;
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
                        const prey = this._createStomachPrey(target, { willingSacrifice: true });
                        if (!actor.stomach) actor.stomach = [];
                        actor.stomach.push(prey);
                        target.CPun = 0; target.CPle = 0;
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
                        const prey = this._createStomachPrey(target, { forcedFed: true, by: actor.name });
                        if (!actor.stomach) actor.stomach = [];
                        actor.stomach.push(prey);
                        target.CPun = 0; target.CPle = 0;
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
                return { ...target, alive: true, inStomach: !extra.inWomb && !extra.inCock, inWomb: extra.inWomb || false, inCock: extra.inCock || false, digestionProgress: 0, digestionState: 'contained', statDrain: { str: 0, con: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 }, willingSacrifice: extra.willingSacrifice || false, forcedFed: extra.forcedFed || false, by: extra.by || null };
            },
            _processStomachState(unit) {
                if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
                    MODULE_SYSTEM.executeHook('onDigestionTick', { unit, app: this }).catch(() => {});
                }
                for (const prey of (unit.stomach || [])) {
                    if (!prey.alive || prey.inStomach === false) continue;
                    prey.digestionProgress = prey.digestionProgress || 0;
                    prey.digestionState = prey.digestionState || 'contained';
                    prey.statDrain = prey.statDrain || { str: 0, con: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 };
                    if (prey.digestionState === 'contained') prey.digestionState = 'digesting';
                    const rate = this.settings.slowDigestion ? 2 : 5;
                    prey.digestionProgress = Math.min(100, prey.digestionProgress + rate);
                    const drain = Math.max(1, Math.floor(rate * 0.3));
                    prey.statDrain.str += drain; prey.str = Math.max(1, (prey.str || 10) - drain);
                    prey.statDrain.con += drain; prey.con = Math.max(1, (prey.con || 10) - drain);
                    prey.statDrain.Figh += drain; prey.Figh = Math.max(1, (prey.Figh || 10) - drain);
                    prey.CPun = Math.max(1, Math.floor(prey.MPun * (1 - prey.digestionProgress / 100)));
                    if (this.settings.statAbsorption) {
                        this._absorbStats(unit, rate, ['str', 'con', 'Figh']);
                    }
                    if (prey.digestionProgress >= 100) {
                        if (this.settings.fatalVore && !this.settings.endoMode) {
                            prey.alive = false;
                            this.log.push({ text: `${prey.name} is fully digested inside ${unit.name}.`, type: 'combat' });
                        } else {
                            prey.digestionState = 'digested';
                            this.log.push({ text: `${prey.name} is fully softened inside ${unit.name}, ready to be released or kept as endo.`, type: 'combat' });
                        }
                    }
                }
                for (const prey of (unit.womb || [])) {
                    if (!prey.alive || prey.inWomb === false) continue;
                    prey.digestionProgress = prey.digestionProgress || 0;
                    prey.digestionState = prey.digestionState || 'contained';
                    prey.statDrain = prey.statDrain || { str: 0, con: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 };
                    const rate = this.settings.slowDigestion ? 1 : 3;
                    prey.digestionProgress = Math.min(100, prey.digestionProgress + rate);
                    const drain = Math.max(1, Math.floor(rate * 0.3));
                    prey.statDrain.cha += drain; prey.cha = Math.max(1, (prey.cha || 10) - drain);
                    prey.statDrain.Flir += drain; prey.Flir = Math.max(1, (prey.Flir || 10) - drain);
                    prey.statDrain.Fuck += drain; prey.Fuck = Math.max(1, (prey.Fuck || 10) - drain);
                    prey.CPun = Math.max(1, Math.floor(prey.MPun * (1 - prey.digestionProgress / 100)));
                    if (this.settings.statAbsorption) {
                        this._absorbStats(unit, rate, ['cha', 'Flir', 'Fuck']);
                    }
                    if (prey.digestionProgress >= 100) {
                        if (this.settings.fatalVore && !this.settings.endoMode) {
                            prey.alive = false;
                            this.log.push({ text: `${prey.name} perishes in ${unit.name}'s womb.`, type: 'combat' });
                        } else {
                            prey.digestionState = 'digested';
                            this.log.push({ text: `${prey.name} is fully softened in ${unit.name}'s womb.`, type: 'combat' });
                        }
                    }
                }
                for (const prey of (unit.balls || [])) {
                    if (!prey.alive || prey.inCock === false) continue;
                    prey.digestionProgress = prey.digestionProgress || 0;
                    prey.digestionState = prey.digestionState || 'contained';
                    prey.statDrain = prey.statDrain || { str: 0, con: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 };
                    const rate = this.settings.slowDigestion ? 1 : 3;
                    prey.digestionProgress = Math.min(100, prey.digestionProgress + rate);
                    const drain = Math.max(1, Math.floor(rate * 0.3));
                    prey.statDrain.Feas += drain; prey.Feas = Math.max(1, (prey.Feas || 10) - drain);
                    prey.statDrain.Fuck += drain; prey.Fuck = Math.max(1, (prey.Fuck || 10) - drain);
                    prey.CPun = Math.max(1, Math.floor(prey.MPun * (1 - prey.digestionProgress / 100)));
                    if (this.settings.statAbsorption) {
                        this._absorbStats(unit, rate, ['Feas', 'Fuck']);
                    }
                    if (prey.digestionProgress >= 100) {
                        if (this.settings.fatalVore && !this.settings.endoMode) {
                            prey.alive = false;
                            this.log.push({ text: `${prey.name} dissolves in ${unit.name}'s balls.`, type: 'combat' });
                        } else {
                            prey.digestionState = 'digested';
                            this.log.push({ text: `${prey.name} is fully softened in ${unit.name}'s balls.`, type: 'combat' });
                        }
                    }
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
                const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                if (allies.length === 0) {
                    document.getElementById('scene-description').innerHTML = `<p>No allies available for sync.</p><button class="nav-btn" onclick="App.processTurn()">Cancel</button>`;
                    return;
                }
                let html = `<h3>Choose Sync Action</h3><div style="display:flex;flex-direction:column;gap:12px;">`;
                html += `<button class="action-btn" onclick="App.selectSyncParticipants('sync_fuck')">🔥 Gang Fuck (seduce target as group)</button>`;
                html += `<button class="action-btn" onclick="App.selectSyncParticipants('sync_flirt')">😘 Charm Attack (group flirt to soften target)</button>`;
                html += `<button class="action-btn" onclick="App.selectSyncParticipants('sync_fight')">⚔️ Gang Fight (overwhelm target together)</button>`;
                html += `<button class="action-btn" onclick="App.selectSyncParticipants('sync_feed')">🍽️ Group Feed (force prey to target)</button>`;
                html += `<button class="nav-btn" style="margin-top:8px" onclick="App.processTurn()">Cancel</button>`;
                html += `</div>`;
                document.getElementById('scene-description').innerHTML = html;
            },

            selectSyncParticipants(syncType) {
                const allies = this.party.filter(p => p.CPun > 0);
                let html = `<h3>Select participants for sync</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">`;
                allies.forEach((a, i) => {
                    html += `<button class="option-card" id="sync-part-${i}" onclick="App.toggleSyncParticipant(${i})">`;
                    html += `<div style="font-size:28px">${a.icon}</div><div>${a.name}</div><div style="font-size:11px;color:var(--text-muted)">${a.CPun}/${a.MPun}</div>`;
                    html += `</button>`;
                });
                html += `</div><div style="margin-top:12px"><button class="action-btn primary" onclick="App.confirmSyncParticipants('${syncType}')">Confirm Participants</button></div>`;
                html += `<button class="nav-btn" onclick="App.showSyncMenu()">Back</button>`;
                document.getElementById('scene-description').innerHTML = html;
                this._syncSelected = [];
            },

            toggleSyncParticipant(idx) {
                if (this._syncSelected.includes(idx)) {
                    this._syncSelected = this._syncSelected.filter(i => i !== idx);
                    document.getElementById('sync-part-' + idx).style.borderColor = 'var(--border-default)';
                } else {
                    this._syncSelected.push(idx);
                    document.getElementById('sync-part-' + idx).style.borderColor = 'var(--accent-primary)';
                }
            },

            confirmSyncParticipants(syncType) {
                const participants = this._syncSelected.map(i => this.party[i]).filter(Boolean);
                if (participants.length < 2) {
                    document.getElementById('scene-description').innerHTML = `<p>Need at least 2 participants for a sync action.</p><button class="nav-btn" onclick="App.selectSyncParticipants('${syncType}')">Back</button>`;
                    return;
                }
                // Select target
                const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                let html = `<h3>Select sync target</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">`;
                enemies.forEach((e, i) => {
                    html += `<button class="option-card" onclick="App.queueSyncAction('${syncType}', ${i})">`;
                    html += `<div style="font-size:32px">${e.icon}</div><div style="color:var(--text-primary);font-weight:600">${e.name}</div><div style="color:var(--text-muted);font-size:12px">HP: ${e.CPun}/${e.MPun}</div>`;
                    html += `</button>`;
                });
                html += `</div><button class="nav-btn" onclick="App.showSyncMenu()">Cancel</button>`;
                document.getElementById('scene-description').innerHTML = html;
                this._syncParticipants = participants;
                this._syncType = syncType;
            },

            queueSyncAction(syncType, targetIndex) {
                const target = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0)[targetIndex];
                if (!target) return;
                const participants = this._syncParticipants;
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
	                    this.log.push({ text: 'Sync failed! Participants are no longer in the turn queue.', type: 'combat' });
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
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                this.nextTurn();
            },

            _resolveSyncAction(sync) {
                if (sync.resolved) return;
                sync.resolved = true;
                // Check if any participant incapacitated
                const incapacitated = sync.participants.filter(p => p.CPun <= 0);
                if (incapacitated.length > 0) {
                    this.log.push({ text: `Sync failed! ${incapacitated.map(p => p.name).join(', ')} cannot participate.`, type: 'combat' });
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
                                if (confirm(`${sync.target.name} is submissive. Recruit them to your party?`)) {
                                    this.recruitCreature(sync.target);
                                }
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
                        const dmg = Math.max(1, Math.floor(totalStr - def * 0.5 + Math.random() * 10));
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
	                            if (!eater.stomach) eater.stomach = [];
	                            eater.stomach.push(this._createStomachPrey(sync.target));
	                            sync.target.CPun = 0;
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
            setPartyAIOrder(index, order) {
                const unit = this.party[index];
                if (!unit || unit === this.player || !this.PARTY_AI_ORDERS[order]) return;
                unit.aiOrder = order;
                this.log.push({ text: `${unit.name} will act ${this.PARTY_AI_ORDERS[order].toLowerCase()}.`, type: 'discovery' });
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
                    this.log.push({ text: `${ally.name} scavenges ${corpse.name}'s remains after the fight.`, type: 'discovery' });
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
                    this.log.push({ text: `${ally.name} holds position.`, type: 'combat' });
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                if (order === 'healer' && this._allyHealWounded(ally)) return;
                // DUMB AI STATE MACHINE
                if (ally.dumbAI) {
                    // High pleasure (>90% MPle): may disobey and auto-fuck
                    if (ally.CPle >= ally.MPle * 0.9) {
                        if (ally.obedient && Math.random() < 0.7) {
                            this.log.push({ text: `${ally.name} is too aroused to obey!`, type: 'combat' });
                            ally.obedient = false;
                        }
                    }
                    // High hunger (>90): auto-feast on weakest enemy
                    if (ally.hunger > 90) {
                        if (ally.obedient && Math.random() < 0.3) {
                            this.log.push({ text: `${ally.name} pleads to eat...`, type: 'combat' });
                        } else {
                            const weakest = enemies.reduce((w, e) => (e.CPun / e.MPun < w.CPun / w.MPun) ? e : w, enemies[0]);
                            const canEat = weakest.CPun <= weakest.MPun * 0.3 || (ally.Feas > weakest.Flee && ally.size >= weakest.size - 2);
                            if (canEat && this._canFitPrey(ally, weakest, 'stomach')) {
                                if (!ally.stomach) ally.stomach = [];
                                ally.stomach.push(this._createStomachPrey(weakest));
                                weakest.CPun = 0;
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
                        const target = enemies[Math.floor(Math.random() * enemies.length)];
                        let charm = ally.Fuck + ally.Flir + Math.random() * 10;
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
                        if (!pred.stomach) pred.stomach = [];
                        pred.stomach.push(this._createStomachPrey(ally, { willingSacrifice: true }));
                        ally.CPun = 0; ally.CPle = 0;
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
                    this.log.push({ text: `${ally.name} cannot reach any target.`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                const target = this._selectAllyAttackTarget(ally, reachableEnemies);
                if (this._terrainCausesMiss(ally, target, 'fight')) {
                    this.renderLog(); this.nextTurn(); return;
                }
                // Flying dodge check
                const allyIsRanged = ally.ranged || ally.antiflying;
                const targetDodge = target.flying && !allyIsRanged && !ally.ranged ? 0.5 : (target.swimming && !ally.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
                if (Math.random() < targetDodge) {
                    this.log.push({ text: `${target.name} dodges ${ally.name}'s attack!`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                const ar = this._AR(ally.Figh) * (ally.rage && ally.CPun < ally.MPun * 0.5 ? 1.5 : 1);
                const def = this._effectiveCon(target);
                const baseDmg = Math.max(1, ar - def * 0.3 + Math.random() * 6);
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
                if (enemyCount < partyCount && enemy.CPun < enemy.MPun * 0.5) return Math.random() < 0.5;
                return enemy.CPun > 0 && enemy.CPun < enemy.MPun * 0.3 && Math.random() < 0.3;
            },
            _enemyCallReinforcement(enemy) {
                const temp = this._getSpeciesTemperament(enemy.species);
                if (!temp.pack || enemy.CPun >= enemy.MPun * 0.5 || enemy.calledReinforcement || Math.random() >= 0.3) return false;
                const sp = this.species.find(s => s.id === enemy.species) || { name: enemy.species || 'Creature', icon: enemy.icon || '❓' };
                const base = this._getSpeciesBaseStats(enemy.species);
                const reinforcement = this._normalizeUnit({
                    id: 'reinforce_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
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
                this.log.push({ text: `${enemy.name} calls for help! ${reinforcement.name} joins the fight.`, type: 'combat' });
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
                if (tastyTargets.length > 0) return tastyTargets[Math.floor(Math.random() * tastyTargets.length)];
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
                if (enemy.menacing && target.CPun / target.MPun < 0.4 && Math.random() < 0.3) {
                    this.log.push({ text: `${enemy.name} is terrifying! ${target.name} cowers in fear.`, type: 'combat' });
                    target.status.frightened = true;
                    this.renderLog();
                }
                // Rage at low HP
                if (enemy.rage && enemy.CPun < enemy.MPun * 0.5) {
                    this.log.push({ text: `${enemy.name} enters a rage!`, type: 'combat' });
                }
                this._enemyCallReinforcement(enemy);
                if (this._enemyShouldFlee(enemy, targets)) {
	                    this.log.push({ text: `${enemy.name} flees in terror!`, type: 'combat' });
	                    enemy.disposition = this.DISPOSITION.NEUTRAL;
	                    enemy.CPun = 0;
	                    this._emitCombatAction('enemy_flee', enemy, null, 'fled');
	                    this.renderCreatures();
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                if (!this._canReachCombatTarget(enemy, target, 'fight')) {
                    this.log.push({ text: `${enemy.name} cannot reach ${target.name}.`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                if (this._terrainCausesMiss(enemy, target, 'fight')) {
                    this.renderLog(); this.nextTurn(); return;
                }
                // Flying/swimming/floopy dodge check
                const isRanged = enemy.ranged || enemy.antiflying;
                const targetDodge = target.flying && !isRanged && !enemy.ranged ? 0.5 : (target.swimming && !enemy.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
                if (Math.random() < targetDodge) {
                    this.log.push({ text: `${target.name} dodges ${enemy.name}'s attack! (${target.flying ? 'flying' : target.swimming ? 'swimming' : 'floopy'})`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                const ar = this._AR(enemy.Figh) * (enemy.rage && enemy.CPun < enemy.MPun * 0.5 ? 1.5 : 1);
                const def = this._effectiveCon(target);
                const baseDmg = Math.max(1, ar - def * 0.3 + Math.random() * 6);
                let dmg = Math.max(1, Math.floor(baseDmg * this._physicalDamageMultiplier(enemy, target)));
                // Bloodsucker heals on hit
                if (enemy.bloodsuck) { enemy.CPun = Math.min(enemy.MPun, enemy.CPun + Math.floor(dmg * 0.3)); }
                target.CPun -= dmg;
                this._wakeOnDamage(target);
                this._applyAttackStatus(enemy, target, dmg);
                // Poisonous/venom applies DOT
                if (enemy.poisonous || enemy.venom) {
                    target.status.poisoned = { dmg: 3, turns: 3 };
                    this.log.push({ text: `${target.name} is poisoned!`, type: 'combat' });
                }
                // Constrictor restrains small targets
                if (enemy.constrictor && target.size <= 4 && !target.status.restrained) {
                    target.status.restrained = { turns: 2, by: enemy.name };
                    this.log.push({ text: `${enemy.name} constricts ${target.name}! They are restrained.`, type: 'combat' });
                }
                // Enveloped by slime/plant
                if (enemy.enveloped && target.size <= enemy.size + 2) {
                    target.status.enveloped = { turns: 2, by: enemy.name };
                    this.log.push({ text: `${enemy.name} envelops ${target.name}!`, type: 'combat' });
                }
                let result = `${enemy.name} hits ${target.name} for ${dmg} punishment!`;
                if (enemy.bloodsuck) result += ` ${enemy.name} heals!`;
                if (target.CPun <= 0) {
                    result += ` ${target.name} falls!`;
                    if (target.name === this.player.name) {
                        if (this.cheats.godMode) {
                            target.CPun = Math.max(1, target.CPun);
                            this.log.push({ text: 'God Mode saved you from death!', type: 'combat' });
                            this.renderLog(); this.nextTurn(); return;
                        }
                        this.log.push({ text: 'You have fallen! Game Over!', type: 'combat' });
                        this.renderLog();
                        if (this.settings.hardcore) {
                            this.log.push({ text: 'HARDCORE MODE: Your save has been deleted.', type: 'combat' });
                            this.renderLog();
                            localStorage.removeItem('fff-last-slot');
                            localStorage.removeItem('fff-last-save-time');
                            for (let i = 1; i <= 5; i++) {
                                localStorage.removeItem('fff-save-time-slot' + i);
                            }
                            this._dbDelete('saves', this.activeSlot).catch(() => {});
                            setTimeout(() => { App.showScreen('menu'); }, 2000);
                        } else {
                            // Softcore: player is knocked out for this combat, party can continue.
                            target.CPun = 0;
                            target.CPle = 0;
                            target.knockedOut = true;
                            this.log.push({ text: 'You have been knocked out! Your party must finish the fight...', type: 'combat' });
                            this.renderLog(); this.renderParty();
                            // If no other living party members, defeat
                            const livingAllies = this.party.filter(p => p.CPun > 0 && !p.knockedOut && p.name !== this.player.name);
                            if (livingAllies.length === 0) {
                                this.log.push({ text: 'Your party has been wiped out!', type: 'combat' });
                                this.renderLog();
                                setTimeout(() => { App.showScreen('menu'); }, 2000);
                                this.endCombat('defeat');
                                return;
                            }
                            // Otherwise continue combat with player as KO'd
                            this.log.push({ text: 'Your allies continue the fight...', type: 'combat' });
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
                this.party.forEach(p => { p.fledCombat = false; });
                if (this.player?.knockedOut) {
                    this.player.knockedOut = false;
                    this.player.CPun = Math.max(1, this.player.CPun || 0);
                    this.log.push({ text: `${this.player.name} comes to after the fight.`, type: 'discovery' });
                }
                if (outcome === 'victory') {
                    this.log.push({ text: 'Victory! Enemies defeated or subdued.', type: 'discovery' });
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
                    this.log.push({ text: 'You escaped the encounter.', type: 'move' });
                    this.updateScene('Escaped', 'You put distance between yourself and danger.', false);
                } else {
                    this.log.push({ text: 'Defeat...', type: 'combat' });
                    this.updateScene('Defeat', 'Darkness claims you...', false);
                    setTimeout(() => { if (confirm('Defeat! Return to menu?')) { App.showScreen('menu'); } }, 1500);
                }
                this.renderLog();
                this.showExplorationActions();
                this.autoSave();
            },

            // ===== OUTSIDE COMBAT INTERACTION =====
            _unitSelectionId(unit) {
                return String(unit?.id || unit?.name || '');
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

            _getPartyLeader() {
                const leader = this.party.find(p => this._unitSelectionId(p) === String(this.partyLeaderId || ''));
                return leader || this.player || this.party[0] || null;
            },

            setPartyLeader(index) {
                const unit = this.party[index];
                if (!unit) return;
                this.partyLeaderId = this._unitSelectionId(unit);
                this.log.push({ text: `${unit.name} is now party leader.`, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.autoSave();
            },

            movePartyMember(index, direction) {
                const targetIndex = index + direction;
                if (index <= 0 || targetIndex <= 0 || targetIndex >= this.party.length) return;
                const [unit] = this.party.splice(index, 1);
                this.party.splice(targetIndex, 0, unit);
                this.log.push({ text: `${unit.name} changes party position.`, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.autoSave();
            },

            dismissPartyMember(index) {
                const unit = this.party[index];
                if (!unit || unit === this.player || unit.mc) return;
                if (typeof confirm === 'function' && !confirm(`Dismiss ${unit.name} from the party?`)) return;
                this.party.splice(index, 1);
                this._normalizeExplorationSelections();
                if (this.partyLeaderId === this._unitSelectionId(unit)) this.partyLeaderId = this._unitSelectionId(this.player);
                this.log.push({ text: `${unit.name} leaves the party.`, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.autoSave();
            },

            showPartyMemberStats(index) {
                const unit = this.party[index];
                if (!unit) return;
                const leaderText = this._getPartyLeader() === unit ? 'Leader' : (unit === this.player ? 'You' : 'Ally');
                const html = `<div style="max-width:600px;margin:0 auto;padding:24px;"><h3>${unit.icon} ${unit.name}</h3>
                    <p style="color:var(--text-muted)">${leaderText} | Level ${unit.level} ${unit.species}</p>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:12px;">
                        <div class="option-card" style="text-align:left;cursor:default;"><strong>Punishment</strong><br>${unit.CPun}/${unit.MPun}</div>
                        <div class="option-card" style="text-align:left;cursor:default;"><strong>Pleasure</strong><br>${unit.CPle}/${unit.MPle}</div>
                        <div class="option-card" style="text-align:left;cursor:default;"><strong>Combat</strong><br>Figh ${unit.Figh} | Feas ${unit.Feas}<br>Flir ${unit.Flir} | Fuck ${unit.Fuck}<br>Flee ${unit.Flee} | Feed ${unit.Feed}</div>
                        <div class="option-card" style="text-align:left;cursor:default;"><strong>Attributes</strong><br>STR ${unit.str} | CON ${unit.con} | SPD ${unit.spd}<br>INT ${unit.int} | WIS ${unit.wis} | CHA ${unit.cha}</div>
                        <div class="option-card" style="text-align:left;cursor:default;"><strong>Capacity</strong><br>${this._containerSummary(unit, 'stomach')} stomach<br>${this._containerSummary(unit, 'womb')} womb<br>${this._containerSummary(unit, 'balls')} balls</div>
                        <div class="option-card" style="text-align:left;cursor:default;"><strong>Perks</strong><br>${(unit.perks || []).map(perk => perk.name).join(', ') || 'None'}</div>
                    </div>
                    <button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button></div>`;
                document.getElementById('scene-description').innerHTML = html;
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

            _renderExplorationTargetActions() {
                const targets = this._getExplorationTargets();
                if (targets.length === 0 || this.combatState.active) return '';
                const actors = this._getExplorationActors();
                const label = this._t(targets.length === 1 ? 'target.count' : 'target.count_plural', { count: targets.length });
                const actorNames = actors.map(actor => actor.name).join(', ') || 'You';
                const targetNames = targets.map(target => target.name).join(', ');
                const keys = ['fight', 'flirt', 'fuck', 'feast', 'feed'];
                const buttons = keys.map(key => {
                    const title = `${this._uiLabel(key)} ${label}`;
                    return `<button class="action-btn" title="${title}" aria-label="${title}" onclick="App.resolveExplorationTargetAction('${key}')"><span class="action-icon" aria-hidden="true">${this._actionIcon(key)}</span><span class="action-caption">${this._uiLabel(key)}</span></button>`;
                }).join('');
                const clearLabel = this._t('target.clear');
                const clearTitle = this._t('target.clearSelected');
                return `<div class="action-legend selected-target-summary" aria-label="Selected exploration targets"><span>${this._t('target.actors')}: ${this._escapeHtml(actorNames)}</span><span>${this._t('target.targets')}: ${this._escapeHtml(targetNames)}</span></div>${buttons}<button class="action-btn" title="${clearTitle}" aria-label="${clearTitle}" onclick="App.clearExplorationTargets()">${clearLabel}</button>`;
            },

            resolveExplorationTargetAction(action) {
                const targets = this._getExplorationTargets();
                if (targets.length === 0) return;
                const actors = this._getExplorationActors();
                if (targets.length === 1 && actors.length > 1) {
                    this.outsideGroupActionOnTarget(action, targets[0], actors);
                } else if (targets.length > 1 && actors.length > 1) {
                    this.log.push({ text: `Choose one actor for multi-target ${this._uiLabel(action).toLowerCase()} actions, or one target for group actions.`, type: 'discovery' });
                    this.renderLog();
                } else {
                    this.outsideActionOnTargets(action, targets, actors[0] || this.player);
                }
                this.clearExplorationTargets();
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
                return this._getRecruitScore(actor, target) >= 85;
            },

            showInteractMenu() {
                const friendlies = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY && c.CPun > 0);
                const allies = this.party.filter(p => p.CPun > 0 && p.name !== this.player.name);
                let html = `<h3>Interact with creatures</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">`;
                [...allies, ...friendlies].forEach((c, i) => {
                    const type = this.party.includes(c) ? 'party' : 'creature';
                    html += `<button class="option-card" onclick="App.showCreatureInteract('${type}', ${i})">`;
                    html += `<div style="font-size:32px">${c.icon}</div><div style="color:var(--text-primary);font-weight:600">${c.name}</div>`;
                    html += `<div style="color:var(--text-muted);font-size:12px">${type === 'party' ? 'Ally' : 'Friendly'} | HP: ${c.CPun}/${c.MPun}</div>`;
                    html += `</button>`;
                });
                html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Cancel</button>`;
                document.getElementById('scene-description').innerHTML = html;
            },

            showCreatureInteract(type, index) {
                const target = type === 'party' ? this.party.filter(p => p.name !== this.player.name)[index] : this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY)[index];
                if (!target) return;
                let html = `<h3>${target.name}</h3><div style="display:flex;flex-direction:column;gap:12px;">`;
                html += `<button class="action-btn" onclick="App.outsideAction('fight', '${type}', ${index})">⚔️ Fight</button>`;
                html += `<button class="action-btn" onclick="App.outsideAction('flirt', '${type}', ${index})">😘 Flirt</button>`;
                html += `<button class="action-btn" onclick="App.outsideAction('fuck', '${type}', ${index})">🔥 Fuck</button>`;
                html += `<button class="action-btn" onclick="App.outsideAction('feast', '${type}', ${index})">🍽️ Feast</button>`;
                html += `<button class="action-btn" onclick="App.outsideAction('feed', '${type}', ${index})">🍲 Feed</button>`;
                if (type === 'creature' && target.disposition === this.DISPOSITION.FRIENDLY) {
                    html += `<button class="action-btn primary" onclick="App.recruitCreatureFromIndex(${index})">💕 Recruit</button>`;
                }
                if (type === 'party') {
                    html += `<button class="action-btn" onclick="App.outsideAction('inspect', '${type}', ${index})">👁️ Inspect</button>`;
                }
                html += `<button class="nav-btn" style="margin-top:8px" onclick="App.showInteractMenu()">Back</button>`;
                html += `</div>`;
                document.getElementById('scene-description').innerHTML = html;
            },

            outsideAction(action, type, index) {
                const target = type === 'party' ? this.party.filter(p => p.name !== this.player.name)[index] : this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY)[index];
                if (!target) return;
                this.outsideGroupActionOnTarget(action, target, this._getExplorationActors());
            },

            outsideActionForParty(action, targetIndex, actorId = null) {
                const target = this.party[targetIndex];
                if (!target) return;
                this.outsideGroupActionOnTarget(action, target, this._getExplorationActors(actorId));
            },

            outsideActionForCreature(action, targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target) return;
                this.outsideGroupActionOnTarget(action, target, this._getExplorationActors());
            },

            outsideActionForCreatureAs(actorId, action, targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target) return;
                this.outsideGroupActionOnTarget(action, target, this._getExplorationActors(actorId));
            },

            _removeContainedPartyMember(unit) {
                if (!unit || unit === this.player || unit.mc) return;
                this.party = this.party.filter(p => p !== unit);
                this._normalizeExplorationSelections();
            },

            _feedPartyMemberToConsumer(prey, consumer) {
                if (!prey || !consumer || prey === consumer) return `${prey?.name || 'Someone'} cannot feed into themself yet.`;
                if (prey === this.player || prey.mc) return `${prey.name} cannot be handed off as prey right now.`;
                if (!this._canFitPrey(consumer, prey, 'stomach')) return this._capacityFailureMessage(consumer, prey, 'stomach');
                if (!consumer.stomach) consumer.stomach = [];
                consumer.stomach.push(this._createStomachPrey(prey, { willingSacrifice: true }));
                prey.CPun = 0;
                prey.CPle = 0;
                consumer.hunger = Math.max(0, (consumer.hunger || 0) - 40);
                this._removeContainedPartyMember(prey);
                return `${prey.name} is fed to ${consumer.name} and settles in their stomach.`;
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
                        return `${target.name} collapses from the rough play.`;
                    }
                    target.CPun = 1;
                    return 'They are pinned but not seriously hurt.';
                }
                return '';
            },

            _groupChewFeast(actors, target) {
                const portions = actors.filter(actor => actor && actor !== target);
                if (portions.length === 0) return `${target.name} cannot be split without helpers.`;
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
                else this._makeCorpse(target, 'feast');
                this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                return `${portions.map(actor => actor.name).join(', ')} split ${target.name} into chewable portions.`;
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

            outsideActionOnTargets(action, targets, actor = this._getExplorationActor()) {
                const targetList = (targets || []).filter(target => target && this._isLivingCreature(target));
                if (targetList.length === 0) return;
                actor = actor || this.player;
                if (!this._canHandleMultipleTargets(actor, action, targetList)) {
                    this.log.push({ text: `${actor.name} cannot handle ${targetList.length} targets with ${this._uiLabel(action).toLowerCase()} yet.`, type: 'discovery' });
                    this.renderLog();
                    this.renderParty();
                    this.renderCreatures();
                    return;
                }
                for (const target of targetList) {
                    this.outsideActionOnTarget(action, target, actor, { allowPartySacrifice: false });
                }
                this.log.push({ text: `${actor.name} finishes a multi-target ${this._uiLabel(action).toLowerCase()} action on ${targetList.map(t => t.name).join(', ')}.`, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
            },

            outsideActionForPartyTargets(action, targetIndexes, actorId = null) {
                const targets = (targetIndexes || []).map(index => this.party[index]).filter(Boolean);
                this.outsideActionOnTargets(action, targets, this._getExplorationActor(actorId));
            },

            outsideActionForCreatureTargets(action, targetIds, actorId = null) {
                const ids = new Set((targetIds || []).map(id => String(id)));
                const targets = this.creatures.filter(c => ids.has(String(c.id || c.name)));
                this.outsideActionOnTargets(action, targets, this._getExplorationActor(actorId));
            },

            outsideGroupActionOnTarget(action, target, actors = this._getExplorationActors()) {
                const livingActors = (actors || []).filter(actor => actor && this._isLivingCreature(actor));
                if (livingActors.length <= 1) {
                    this.outsideActionOnTarget(action, target, livingActors[0] || this.player);
                    return;
                }
                const names = livingActors.map(actor => actor.name).join(', ');
                let result = '';
                let startCombatAfter = false;
                let combatTargets = [];
                switch (action) {
                    case 'fight': {
                        if (target.disposition !== this.DISPOSITION.ENEMY && !this.party.includes(target)) {
                            const hostiles = [];
                            const texts = [];
                            for (const actor of livingActors) {
                                const reaction = this._reactToNonHostileAttack(target, actor);
                                if (reaction?.text) texts.push(reaction.text);
                                hostiles.push(...(reaction?.hostiles || []));
                            }
                            result = texts.join(' ');
                            combatTargets = [...new Set(hostiles)];
                            startCombatAfter = combatTargets.length > 0;
                            break;
                        }
                        const totalFigh = livingActors.reduce((sum, actor) => sum + (actor.Figh || 10), 0);
                        const dmg = Math.max(1, Math.floor(this._AR(totalFigh) - (target.con || 10) * 0.3 + Math.random() * 6));
                        if (this.party.includes(target) && livingActors.includes(target)) {
                            const sparDamage = Math.max(1, Math.floor(dmg / livingActors.length));
                            const outcomes = [];
                            for (const participant of livingActors) {
                                const outcome = this._resolvePartyPlayFight(livingActors, participant, sparDamage);
                                if (outcome) outcomes.push(`${participant.name}: ${outcome}`);
                            }
                            result = `${names} spar together, each taking ${sparDamage} punishment.`;
                            if (outcomes.length > 0) result += ` ${outcomes.join(' ')}`;
                            break;
                        }
                        result = `${names} play-fight ${target.name} for ${dmg} punishment.`;
                        if (this.party.includes(target)) {
                            const outcome = this._resolvePartyPlayFight(livingActors, target, dmg);
                            if (outcome) result += ` ${outcome}`;
                        } else {
                            target.CPun -= dmg;
                        }
                        if (!this.party.includes(target) && target.CPun <= 0) {
                            this._makeCorpse(target, 'fight');
                            result += ` ${target.name} collapses.`;
                        }
                        break;
                    }
                    case 'feed': {
                        if (this.party.includes(target)) {
                            const prey = livingActors.filter(actor => actor !== target);
                            if (livingActors.includes(target) || prey.length === 0) {
                                const totalFeed = livingActors.reduce((sum, actor) => sum + (actor.Feed || 10), 0);
                                const healAmount = Math.floor(totalFeed * 2);
                                target.CPun = Math.min(target.MPun, target.CPun + healAmount);
                                result = `${names} tend ${target.name}${livingActors.includes(target) ? ' together' : ''}, restoring ${healAmount} punishment.`;
                            } else {
                                const texts = prey.map(actor => this._feedPartyMemberToConsumer(actor, target));
                                result = texts.join(' ');
                            }
                        } else {
                            const totalFeed = livingActors.reduce((sum, actor) => sum + (actor.Feed || 10), 0);
                            target.CPun = Math.min(target.MPun, target.CPun + Math.floor(totalFeed * 2));
                            result = `${names} feed ${target.name}, restoring ${Math.floor(totalFeed * 2)} punishment.`;
                        }
                        break;
                    }
                    case 'feast': {
                        const primary = livingActors[0];
                        if (this.party.includes(target) && livingActors.includes(target)) {
                            result = `${target.name} cannot feast on themself. Select other party members as actors to consume this target, or select ${target.name} alone to feast on another target.`;
                            break;
                        }
                        if (this.settings.chewing && livingActors.length > 1) {
                            result = this._groupChewFeast(livingActors, target);
                            break;
                        }
                        const helperBonus = livingActors.slice(1).reduce((sum, actor) => sum + Math.floor((actor.Feas || 10) * 0.5), 0);
                        const canEatOutside = this.cheats.canEatAnything || (primary.size >= target.size - 2 && primary.Feas + helperBonus + 5 > target.Flee);
                        if (!canEatOutside) {
                            result = `${target.name} is too large or strong for ${names} to consume.`;
                            break;
                        }
                        if (!this._canFitPrey(primary, target, 'stomach')) {
                            result = this._capacityFailureMessage(primary, target, 'stomach');
                            break;
                        }
                        if (!primary.stomach) primary.stomach = [];
                        primary.stomach.push(this._createStomachPrey(target));
                        target.CPun = 0;
                        if (this.party.includes(target) && target !== primary) this._removeContainedPartyMember(target);
                        this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                        result = `${livingActors.slice(1).map(actor => actor.name).join(', ') || primary.name} help${livingActors.length > 2 ? '' : 's'} ${primary.name} swallow ${target.name}.`;
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
                                result = `${names} share ${this._uiLabel(action).toLowerCase()} with ${target.name}. Pleasure spreads through the group; ${target.name} rises to ${target.CPle}/${target.MPle}.`;
                            } else {
                                result = `${names} focus on ${target.name}. Pleasure rises to ${target.CPle}/${target.MPle}.`;
                            }
                            if (target.CPle >= target.MPle * 0.8) {
                                target.willing = true;
                                target.orgasmed = true;
                                if (!this.party.includes(target)) target.disposition = this.DISPOSITION.FRIENDLY;
                                this._updateQuestProgress('seduce', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                            }
                        } else {
                            result = `${target.name} resists the group's attention.`;
                        }
                        break;
                    }
                    default:
                        this.outsideActionOnTarget(action, target, livingActors[0] || this.player);
                        return;
                }
                this.log.push({ text: result, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.renderCreatures();
                if (startCombatAfter) {
                    this.startCombat(combatTargets);
                    return;
                }
                if (!this.combatState.active) this.renderExplorationActions();
            },

            outsideActionOnTarget(action, target, actor = this.player, options = {}) {
                actor = actor || this.player;
                const { actorName, actorVerb } = this._actorNameAndVerb(actor);
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
                        const ar = this._AR(actor.Figh);
                        const def = target.con || 10;
                        const dmg = Math.max(1, Math.floor(ar - def * 0.3 + Math.random() * 6));
                        target.CPun -= dmg;
                        result = `${actorName} hit${actorVerb} ${target.name} for ${dmg} punishment.`;
                        if (target.CPun <= 0) { target.CPun = 1; result += ' They are subdued.'; }
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
                            result = `${actorName} pleasure${actorVerb} ${target.name}. Their arousal rises to ${target.CPle}/${target.MPle}.`;
                            if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                                target.willing = true;
                                target.orgasmed = true;
                                result += ' They orgasm and are completely devoted.';
                                this._updateQuestProgress('seduce', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                                if (this.settings.refractoryPeriod) {
                                    target.refractory = true;
                                    result += ' They need a moment to recover...';
                                }
                            }
                            if (!this.party.includes(target) && this._canRecruit(actor, target)) {
                                result += ` ${target.name} may be willing to join the party.`;
                            }
                        } else {
                            result = `${target.name} is not in the mood.`;
                        }
                        break;
                    }
                    case 'feast': {
                        const canEatOutside = this.cheats.canEatAnything || (actor.size >= target.size - 2 && actor.Feas + 5 > target.Flee);
                        if (canEatOutside) {
                            if (!this._canFitPrey(actor, target, 'stomach')) {
                                result = this._capacityFailureMessage(actor, target, 'stomach');
                                break;
                            }
                            if (!actor.stomach) actor.stomach = [];
                            actor.stomach.push(this._createStomachPrey(target));
                            target.CPun = 0;
                            if (this.party.includes(target) && target !== actor) {
                                this.party = this.party.filter(p => p !== target);
                            }
                            this._updateQuestProgress('consume', { target, targetId: target.id || target.name, species: target.species, name: target.name });
                            result = `${actorName} swallow${actorVerb} ${target.name} whole. They settle in ${actor.name === this.player?.name ? 'your' : actor.name + "'s"} stomach.`;
                        } else {
                            result = `${target.name} is too large or strong to eat.`;
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
                            result = `${actorName} flirt${actorVerb} with ${target.name}. Their guard lowers. Pleasure rises to ${target.CPle}/${target.MPle}.`;
                            if (target.charmed >= 3) {
                                result += ` ${target.name} is utterly charmed and becomes friendly!`;
                                target.disposition = this.DISPOSITION.FRIENDLY;
                                target.willing = true;
                            }
                            if (!this.party.includes(target) && this._canRecruit(actor, target)) {
                                result += ` ${target.name} may be willing to join the party.`;
                            }
                        } else {
                            result = `${target.name} rebuffs your flirtation!`;
                        }
                        break;
                    }
                    case 'feed': {
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
                        result = `${actorName} feed${actorVerb} ${target.name}, restoring ${healAmount} punishment and sating their hunger.`;
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
                    return;
                }
                if (!this.combatState.active) this.renderExplorationActions();
            },

            _findCorpseById(targetId) {
                return this.creatures.find(c => this._isCorpse(c) && String(c.id || c.name) === String(targetId));
            },

            lootCorpse(targetId) {
                const corpse = this._findCorpseById(targetId);
                if (!corpse) return;
                let item = null;
                let gold = 0;
                if (!corpse.looted) {
                    if (this.inventory.length < this.MAX_INVENTORY && Math.random() < 0.5) {
                        const items = Object.keys(this.ITEMS);
                        const name = items[Math.floor(Math.random() * items.length)];
                        item = { id: 'loot_' + Date.now(), name };
                        this.inventory.push(item);
                    }
                    const authoredGold = Number(corpse.goldLoot);
                    gold = Number.isFinite(authoredGold) ? Math.max(0, Math.floor(authoredGold)) : Math.max(1, Math.floor((corpse.level || 1) * 2 + Math.random() * 6));
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
            },

            scavengeCorpse(targetId) {
                const corpse = this._findCorpseById(targetId);
                if (!corpse) return;
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
            },

            recruitCreatureFromIndex(index) {
                const target = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY)[index];
                if (!target) return;
                this.recruitCreature(target, this._getExplorationActor());
            },

            recruitCreatureById(targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target || target.disposition !== this.DISPOSITION.FRIENDLY) return;
                this.recruitCreature(target, this._getExplorationActor());
            },

            recruitCreature(target, actor = this.player, options = {}) {
                if (this.party.length >= this.MAX_PARTY_SIZE) {
                    this.log.push({ text: 'Party is full! Cannot recruit ' + target.name, type: 'combat' });
                    this.renderLog();
                    return;
                }
                if (!options.force && !this._canRecruit(actor, target)) {
                    this.log.push({ text: `${target.name} is not ready to join the party.`, type: 'discovery' });
                    this.renderLog();
                    this.renderCreatures();
                    return;
                }
	                target.disposition = this.DISPOSITION.PARTY;
	                target.ally = true;
	                target.obedient = true;
	                target.CPun = Math.max(1, target.CPun);
	                this._normalizeUnit(target, { disposition: this.DISPOSITION.PARTY, ally: true, obedient: true });
	                this.party.push(target);
                this.creatures = this.creatures.filter(c => c !== target);
                this.log.push({ text: target.name + ' joins your party!', type: 'discovery' });
                this.gainXP(30);
                this.renderParty();
                this.renderCreatures();
                this.renderLog();
                this.showExplorationActions();
                this.autoSave();
            },

            // ===== FLEE =====
            attemptFlee() {
                const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                const enemy = enemies[0];
                if (!enemy) {
                    this.log.push({ text: 'No enemies to flee from!', type: 'combat' });
                    this.renderLog(); return;
                }
                const fleeChance = 0.6 + (this.player.Flee - enemy.spd) * 0.02;
	                if (Math.random() < Math.max(0.1, Math.min(0.95, fleeChance))) {
	                    this.log.push({ text: 'You flee successfully!', type: 'combat' });
	                    this.creatures = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY);
	                    this._emitCombatAction('flee', this.player, enemy, 'success');
	                    this.endCombat('flee');
	                } else {
	                    this.log.push({ text: 'Flee failed! ' + enemy.name + ' intercepts you!', type: 'combat' });
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
                if (validSubs.length === 0) {
                    this.log.push({ text: 'No feed options available right now.', type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                if (validSubs.length === 1) {
                    this._executeFeedSubAction(validSubs[0].id, actor);
                    return;
                }
                // Show sub-action picker for feed
                let html = '<h3>Feed Options</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">';
                for (const sub of validSubs) {
                    html += `<button class="action-btn" onclick="App._executeFeedSubAction('${sub.id}', App.activeActor || App.player)">${sub.icon} ${sub.label}</button>`;
                }
                html += '</div><button class="nav-btn" style="margin-top:12px" onclick="App.cancelTargetSelection()">Cancel</button>';
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
                        this.log.push({ text: 'No wounded allies to feed.', type: 'combat' });
                        this.renderLog(); this.combatState.processing = false; this.nextTurn(); return;
                    }
                    target = allies.reduce((w, a) => (a.CPun / a.MPun < w.CPun / w.MPun) ? a : w, allies[0]);
                } else if (subId === 'sacrifice') {
                    const prey = this.party.filter(p => p.CPun > 0 && p.name !== actor.name && (p.livestock || p.willingPrey));
                    if (prey.length === 0) {
                        this.log.push({ text: 'No willing livestock to sacrifice.', type: 'combat' });
                        this.renderLog(); this.combatState.processing = false; this.nextTurn(); return;
                    }
                    target = prey[0];
                } else if (subId === 'forceFeed') {
                    // Need to select target enemy and holder - simplified: pick random enemy and first available holder
                    const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                    if (enemies.length === 0) {
                        this.log.push({ text: 'No enemies to force-feed.', type: 'combat' });
                        this.renderLog(); this.combatState.processing = false; this.nextTurn(); return;
                    }
                    target = enemies[0]; // actor is the predator, target is the prey to be forced into actor
                    // Actually for forceFeed, actor is the predator, target is the prey
                    // But we need a holder too. Let's just use the first available holder.
                }
                if (!target) {
                    this.log.push({ text: 'No valid target for this feed action.', type: 'combat' });
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
                this.player.xp += amount;
                while (this.player.xp >= this.player.xpToNext) {
                    this.player.xp -= this.player.xpToNext;
                    this.player.level++;
                    this.player.xpToNext = Math.floor(this.player.xpToNext * 1.5);
                    this.player.MPun += 10; this.player.CPun = this.player.MPun;
                    this.player.MPle += 5;
                    this.player.Figh += 1; this.player.Feas += 1; this.player.Flir += 1; this.player.Fuck += 1; this.player.Flee += 1; this.player.Feed += 1;
                    this.player.str += 1; this.player.con += 1; this.player.spd += 1; this.player.int += 1; this.player.wis += 1; this.player.cha += 1;
                    this.log.push({ text: 'Level up! You are now level ' + this.player.level + '. All stats increased!', type: 'discovery' });
                    this._queuePerkChoice();
                }
                this.renderParty();
                if ((this.player.pendingPerkChoices || 0) > 0) this.showPerkSelection();
            },

            _queuePerkChoice() {
                if (!this.player) return;
                this.player.pendingPerkChoices = (this.player.pendingPerkChoices || 0) + 1;
                this.log.push({ text: 'Choose a new perk from the perk tree.', type: 'discovery' });
            },

            _perkTreeCount(treeId, unit = this.player) {
                return (unit?.perks || []).filter(perk => perk.tree === treeId).length;
            },

            _hasPerk(perkId, unit = this.player) {
                return (unit?.perks || []).some(perk => perk.id === perkId);
            },

            _canChoosePerk(perk, treeId, unit = this.player) {
                if (!perk || !unit || this._hasPerk(perk.id, unit)) return false;
                if (!perk.requires) return true;
                if (perk.requires.perk && !this._hasPerk(perk.requires.perk, unit)) return false;
                if (perk.requires.tree && this._perkTreeCount(perk.requires.tree, unit) < (perk.requires.count || 1)) return false;
                return true;
            },

            _availablePerkChoices(unit = this.player) {
                const choices = [];
                for (const [treeId, tree] of Object.entries(this.PERK_TREES)) {
                    for (const perk of tree.perks) {
                        choices.push({ ...perk, tree: treeId, treeLabel: tree.label, available: this._canChoosePerk(perk, treeId, unit) });
                    }
                }
                return choices;
            },

            choosePerk(perkId) {
                if (!this.player || (this.player.pendingPerkChoices || 0) <= 0) return;
                const choice = this._availablePerkChoices().find(perk => perk.id === perkId);
                if (!choice || !choice.available) {
                    this.log.push({ text: 'That perk is not available yet.', type: 'discovery' });
                    this.renderLog();
                    this.showPerkSelection();
                    return;
                }
                this.player.perks = this.player.perks || [];
                this.player.perks.push({
                    id: choice.id,
                    tree: choice.tree,
                    name: choice.name,
                    stat: choice.stat,
                    val: choice.val,
                    desc: choice.desc
                });
                if (choice.stat) this.player[choice.stat] = (this.player[choice.stat] || 0) + (choice.val || 0);
                this.player.pendingPerkChoices = Math.max(0, (this.player.pendingPerkChoices || 0) - 1);
                this.log.push({ text: 'Perk chosen: ' + choice.name + '. ' + choice.desc, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                if (this.player.pendingPerkChoices > 0) this.showPerkSelection();
                else this.showCharacterStats();
                this.autoSave();
            },

            showPerkSelection() {
                if (!this.player) return;
                const pending = this.player.pendingPerkChoices || 0;
                const choices = this._availablePerkChoices();
                let html = `<h3>Choose Perk</h3><p style="color:var(--text-muted);margin:4px 0 12px;">Pending choices: ${pending}</p><div style="display:grid;gap:12px;">`;
                for (const [treeId, tree] of Object.entries(this.PERK_TREES)) {
                    html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="font-weight:700;color:var(--text-primary)">${tree.label}</div><div style="display:grid;gap:8px;margin-top:8px;">`;
                    choices.filter(perk => perk.tree === treeId).forEach(perk => {
                        const disabled = pending <= 0 || !perk.available ? ' disabled' : '';
                        const req = perk.requires ? ` Requires ${perk.requires.count || 1} ${this.PERK_TREES[perk.requires.tree]?.label || perk.requires.tree} perk${(perk.requires.count || 1) === 1 ? '' : 's'}.` : '';
                        html += `<button class="nav-btn" style="text-align:left;white-space:normal;padding:8px;" ${disabled} onclick="App.choosePerk('${perk.id}')"><strong>${perk.name}</strong> <span style="color:var(--text-muted);font-size:11px">[${perk.treeLabel}]</span><br><span style="font-size:11px;color:var(--text-muted)">${perk.desc}${req}</span></button>`;
                    });
                    html += `</div></div>`;
                }
                html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.showCharacterStats()">Back</button>`;
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

            _createStructureMerchant(structureId, biomeId = this.currentBiome || 'forest') {
                const struct = this.STRUCTURES[structureId];
                if (!struct?.merchant) return null;
                const merchantConfig = struct.merchant;
                const speciesPool = merchantConfig.species || ['human'];
                const sid = speciesPool[Math.floor(Math.random() * speciesPool.length)] || 'human';
                const sp = this.species.find(s => s.id === sid) || this.species.find(s => s.id === 'human');
                const stockTable = merchantConfig.stockTable || 'general';
                return this._normalizeUnit({
                    id: `merchant_${structureId}_${Date.now()}`,
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
                if (Math.random() >= (config.chance ?? 0)) return null;
                const merchant = this._createStructureMerchant(tile.structure, tile.biome);
                if (!merchant) return null;
                this.creatures = this._tileCreatures([...(this.creatures || []), merchant]);
                tile.creatures = this._tileCreatures(this.creatures);
                return merchant;
            },

            _itemCategory(item) {
                return this._getItemDef(item).type || 'misc';
            },

            _itemValue(item) {
                return this._getItemDef(item).value || item?.price || 0;
            },

            _itemListOptions(prefix, targetId = null) {
                const targetArg = targetId ? `,'${String(targetId).replace(/'/g, "\\'")}'` : '';
                return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px;">
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">Category
                        <select class="nav-btn" style="padding:4px 8px;font-size:11px;" onchange="App.set${prefix}Filter(this.value${targetArg})">
                            ${['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].map(type => `<option value="${type}" ${this[`${prefix.toLowerCase()}Filter`] === type ? 'selected' : ''}>${type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}</option>`).join('')}
                        </select>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">Sort
                        <select class="nav-btn" style="padding:4px 8px;font-size:11px;" onchange="App.set${prefix}Sort(this.value${targetArg})">
                            ${[
                                ['name', 'Name'],
                                ['type', 'Type'],
                                ['value-desc', 'Value ↓'],
                                ['value-asc', 'Value ↑']
                            ].map(([value, label]) => `<option value="${value}" ${this[`${prefix.toLowerCase()}Sort`] === value ? 'selected' : ''}>${label}</option>`).join('')}
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

            _defaultMerchantStock() {
                return ['Healing Herb', 'Old Coin', 'Monster Fang'].map((name, index) => {
                    const def = this.ITEMS[name] || {};
                    return { id: `default_stock_${index}`, name, price: def.value || 10, qty: 1 + Math.floor(Math.random() * 2) };
                });
            },

            _refreshMerchantStock(merchant, force = false) {
                if (!merchant || merchant.disposition !== this.DISPOSITION.MERCHANT) return merchant;
                const currentDay = this.dayCount || 0;
                const needsStock = !merchant.stock || merchant.stock.length === 0;
                const stale = currentDay - (merchant.stockLastRefreshDay ?? currentDay) >= 3;
                if (force || needsStock || stale) {
                    merchant.stock = merchant.stockTable ? this._merchantStockFromTable(merchant.stockTable) : this._defaultMerchantStock();
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
                if (!merchant) return;
                const gold = this.player.gold || 0;
                let html = `<h3>${merchant.name} Trade</h3><p style="color:var(--text-muted);margin:4px 0 12px;">Gold: ${gold}</p>`;
                html += this._itemListOptions('Trade', this._unitKey(merchant));
                html += `<h4 style="color:var(--text-primary);margin:12px 0 8px;">Buy</h4><div style="display:grid;gap:8px;">`;
                const stockEntries = this._filterAndSortItemEntries((merchant.stock || []).map((item, index) => ({ item, index })), this.tradeFilter, this.tradeSort);
                if (stockEntries.length === 0) {
                    html += `<p style="color:var(--text-muted)">No stock matches the current filter.</p>`;
                }
                stockEntries.forEach(({ item, index }) => {
                    const def = this.ITEMS[item.name] || { icon: '?', desc: 'Unknown' };
                    const disabled = gold < item.price || item.qty <= 0 || this.inventory.length >= this.MAX_INVENTORY ? ' disabled' : '';
                    html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="display:flex;justify-content:space-between;gap:8px;"><div><div style="font-weight:700;color:var(--text-primary)">${def.icon || '?'} ${item.name}</div><div style="font-size:11px;color:var(--text-muted)">${def.type || 'misc'} · ${def.desc || ''}</div></div><div style="font-size:12px;color:var(--text-muted)">Qty ${item.qty} | ${item.price}g</div></div><button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" ${disabled} onclick="App.buyFromMerchant('${this._unitKey(merchant)}',${index})">Buy</button></div>`;
                });
                html += `</div><h4 style="color:var(--text-primary);margin:12px 0 8px;">Sell</h4><div style="display:grid;gap:8px;">`;
                const sellEntries = this._filterAndSortItemEntries((this.inventory || []).map((item, index) => ({ item, index })), this.tradeFilter, this.tradeSort);
                if (this.inventory.length === 0) {
                    html += `<p style="color:var(--text-muted)">No items to sell.</p>`;
                } else if (sellEntries.length === 0) {
                    html += `<p style="color:var(--text-muted)">No inventory items match the current filter.</p>`;
                } else {
                    sellEntries.forEach(({ item }) => {
                        const def = this.ITEMS[item.name] || { icon: '?', value: 1, desc: 'Unknown' };
                        const price = Math.max(1, Math.floor((def.value || 1) * 0.5));
                        html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="display:flex;justify-content:space-between;gap:8px;"><div><div style="font-weight:700;color:var(--text-primary)">${def.icon || '?'} ${item.name}</div><div style="font-size:11px;color:var(--text-muted)">${def.type || 'misc'} · ${def.desc || ''}</div></div><div style="font-size:12px;color:var(--text-muted)">${price}g</div></div><button class="nav-btn" style="margin-top:8px;padding:4px 8px;font-size:11px" onclick="App.sellToMerchant('${this._unitKey(merchant)}','${String(item.id).replace(/'/g, "\\'")}')">Sell</button></div>`;
                    });
                }
                html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
                document.getElementById('scene-description').innerHTML = html;
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

            buyFromMerchant(targetId, stockIndex) {
                const merchant = this._findMerchantById(targetId);
                const item = merchant?.stock?.[stockIndex];
                if (!merchant || !item || item.qty <= 0) return;
                if ((this.player.gold || 0) < item.price) {
                    this.log.push({ text: `You need ${item.price} gold to buy ${item.name}.`, type: 'discovery' });
                    this.renderLog();
                    this.showTrade(targetId);
                    return;
                }
                if (this.inventory.length >= this.MAX_INVENTORY) {
                    this.log.push({ text: 'Inventory is full.', type: 'discovery' });
                    this.renderLog();
                    this.showTrade(targetId);
                    return;
                }
                if (this._requiresPurchaseConfirmation(item) && !confirm(`Buy ${item.name} for ${item.price} gold?`)) {
                    this.log.push({ text: `Purchase cancelled: ${item.name}.`, type: 'discovery' });
                    this.renderLog();
                    this.showTrade(targetId);
                    return;
                }
                this.player.gold -= item.price;
                item.qty -= 1;
                this.inventory.push({ id: `buy_${Date.now()}_${this.inventory.length}`, name: item.name });
                this.log.push({ text: `Bought ${item.name} for ${item.price} gold.`, type: 'loot' });
                this.renderLog();
                this.renderParty();
                this.showTrade(targetId);
                this.autoSave();
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
                else merchant.stock.push({ id: `sold_${Date.now()}_${merchant.stock.length}`, name: item.name, price: def.value || price, qty: 1 });
                this.log.push({ text: `Sold ${item.name} for ${price} gold.`, type: 'loot' });
                this.renderLog();
                this.renderParty();
                this.showTrade(targetId);
                this.autoSave();
            },

            // ===== QUESTS =====
            _normalizeQuest(quest, giver = null) {
                const source = quest || {};
                const id = source.id || `quest_${giver?.id || giver?.name || Date.now()}`;
                return {
                    id,
                    title: source.title || 'Untitled Quest',
                    description: source.description || '',
                    giverId: source.giverId || giver?.id || giver?.name || null,
                    giverName: source.giverName || giver?.name || null,
                    status: source.status || 'available',
                    objectives: (source.objectives || []).map((objective, index) => ({
                        id: objective.id || `${id}_objective_${index}`,
                        type: objective.type || 'find',
                        label: objective.label || objective.description || this._questObjectiveLabel(objective),
                        targetId: objective.targetId || null,
                        species: objective.species || null,
                        item: objective.item || null,
                        required: objective.required || objective.count || 1,
                        progress: objective.progress || 0,
                        complete: Boolean(objective.complete)
                    })),
                    reward: source.reward || source.rewards || {}
                };
            },

            _questObjectiveLabel(objective) {
                const target = objective.item || objective.species || objective.targetId || 'target';
                return `${objective.type || 'find'} ${target}`;
            },

            _getQuestById(questId) {
                return (this.quests || []).find(q => q.id === questId);
            },

            _getQuestGiverByKey(targetId) {
                return this.creatures.find(c => String(c.id || c.name) === String(targetId) && c.quest);
            },

            acceptQuestFromUnit(targetId) {
                const giver = this._getQuestGiverByKey(targetId);
                if (!giver) return;
                this.acceptQuest(giver.quest, giver);
            },

            acceptQuest(quest, giver = null) {
                const normalized = this._normalizeQuest(quest, giver);
                this.quests = this.quests || [];
                const existing = this._getQuestById(normalized.id);
                if (existing) {
                    this.log.push({ text: `${existing.title} is already in your quest log.`, type: 'discovery' });
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
                this.log.push({ text: `Quest accepted: ${normalized.title}.`, type: 'discovery' });
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
                return true;
            },

            _updateQuestProgress(type, payload = {}) {
                let changed = false;
                for (const quest of this.quests || []) {
                    if (quest.status !== 'active') continue;
                    for (const objective of quest.objectives || []) {
                        if (!this._questObjectiveMatches(type, payload, objective)) continue;
                        objective.progress = Math.min(objective.required, (objective.progress || 0) + (payload.count || 1));
                        objective.complete = objective.progress >= objective.required;
                        changed = true;
                    }
                    if ((quest.objectives || []).length > 0 && quest.objectives.every(o => o.complete) && quest.status !== 'completed') {
                        quest.status = 'completed';
                        this._grantQuestReward(quest);
                        this.log.push({ text: `Quest completed: ${quest.title}.`, type: 'discovery' });
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
                const reward = quest.reward || {};
                if (reward.xp) this.gainXP(reward.xp);
                if (reward.gold) this.player.gold = (this.player.gold || 0) + reward.gold;
                for (const itemName of reward.items || []) {
                    if (this.inventory.length < this.MAX_INVENTORY) {
                        this.inventory.push({ id: `quest_item_${Date.now()}_${this.inventory.length}`, name: itemName });
                    }
                }
                if (reward.recruit && this.party.length < this.MAX_PARTY_SIZE) {
                    const recruit = this._normalizeUnit({ ...reward.recruit }, { disposition: this.DISPOSITION.PARTY, ally: true, obedient: true, willing: true });
                    this.party.push(recruit);
                }
            },

            _questProgressText(quest) {
                return (quest.objectives || []).map(objective => {
                    const done = objective.complete ? '✓' : '•';
                    return `${done} ${objective.label || this._questObjectiveLabel(objective)} (${objective.progress || 0}/${objective.required || 1})`;
                }).join('<br>');
            },

            _filteredQuestEntries() {
                const filter = ['all', 'active', 'completed'].includes(this.questFilter) ? this.questFilter : 'all';
                const sort = ['status', 'title'].includes(this.questSort) ? this.questSort : 'status';
                const quests = (this.quests || []).filter(quest => filter === 'all' || quest.status === filter);
                return quests.sort((a, b) => {
                    if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
                    const weight = status => status === 'active' ? 0 : status === 'completed' ? 1 : 2;
                    return weight(a.status) - weight(b.status) || (a.title || '').localeCompare(b.title || '');
                });
            },

            _questLogControls() {
                return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px;">
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">Status
                        <select class="nav-btn" style="padding:4px 8px;font-size:11px;" onchange="App.setQuestFilter(this.value)">
                            ${[['all', 'All'], ['active', 'Active'], ['completed', 'Completed']].map(([value, label]) => `<option value="${value}" ${this.questFilter === value ? 'selected' : ''}>${label}</option>`).join('')}
                        </select>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;color:var(--text-muted);font-size:11px;">Sort
                        <select class="nav-btn" style="padding:4px 8px;font-size:11px;" onchange="App.setQuestSort(this.value)">
                            ${[['status', 'Status'], ['title', 'Title']].map(([value, label]) => `<option value="${value}" ${this.questSort === value ? 'selected' : ''}>${label}</option>`).join('')}
                        </select>
                    </label>
                </div>`;
            },

            setQuestFilter(filter) {
                this.questFilter = ['all', 'active', 'completed'].includes(filter) ? filter : 'all';
                this.showQuestLog();
            },

            setQuestSort(sort) {
                this.questSort = ['status', 'title'].includes(sort) ? sort : 'status';
                this.showQuestLog();
            },

            showQuestLog() {
                const quests = this.quests || [];
                if (quests.length === 0) {
                    document.getElementById('scene-description').innerHTML = `<h3>Quests</h3><p style="color:var(--text-muted)">No active quests.</p><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
                    return;
                }
                const visibleQuests = this._filteredQuestEntries();
                let html = `<h3>Quests</h3>${this._questLogControls()}`;
                if (visibleQuests.length === 0) {
                    html += `<p style="color:var(--text-muted);margin-top:12px;">No quests match the current filter.</p><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
                    document.getElementById('scene-description').innerHTML = html;
                    return;
                }
                html += `<div style="display:grid;gap:12px;margin-top:12px;">`;
                visibleQuests.forEach(quest => {
                    const status = quest.status === 'completed' ? 'Completed' : 'Active';
                    html += `<div class="option-card" style="text-align:left;cursor:default;"><div style="font-weight:700;color:var(--text-primary)">${quest.title} <span style="font-size:11px;color:var(--text-muted)">[${status}]</span></div>`;
                    if (quest.description) html += `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${quest.description}</div>`;
                    html += `<div style="font-size:12px;color:var(--text-primary);margin-top:8px;line-height:1.6">${this._questProgressText(quest)}</div></div>`;
                });
                html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
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

            equipItem(itemId) {
                if (!this.player) return;
                const item = this.inventory.find(i => String(i.id) === String(itemId));
                if (!item || !this._isEquippable(item)) return;
                const def = this._getItemDef(item);
                const slot = def.slot;
                this.player.equipment = this.player.equipment || {};
                const current = this.player.equipment[slot];
                if (current) {
                    this._applyEquipmentBonus(this.player, current, -1);
                    this.inventory.push(current);
                }
                this.inventory = this.inventory.filter(i => String(i.id) !== String(itemId));
                this.player.equipment[slot] = item;
                this._applyEquipmentBonus(this.player, item, 1);
                this.log.push({ text: `Equipped ${item.name}.`, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.showInventory();
                this.autoSave();
            },

            unequipItem(slot) {
                if (!this.player?.equipment || !this.player.equipment[slot]) return;
                if (this.inventory.length >= this.MAX_INVENTORY) {
                    this.log.push({ text: 'Inventory is full.', type: 'discovery' });
                    this.renderLog();
                    return;
                }
                const item = this.player.equipment[slot];
                this._applyEquipmentBonus(this.player, item, -1);
                this.player.equipment[slot] = null;
                this.inventory.push(item);
                this.log.push({ text: `Unequipped ${item.name}.`, type: 'discovery' });
                this.renderLog();
                this.renderParty();
                this.showInventory();
                this.autoSave();
            },

            _equipmentSummary(unit = this.player) {
                const equipment = unit?.equipment || {};
                return Object.entries(this.EQUIPMENT_SLOTS).map(([slot, label]) => {
                    const item = equipment[slot];
                    return `${label}: ${item ? item.name : 'Empty'}`;
                }).join('<br>');
            },

            _equipmentBonusText(item) {
                const bonus = this._getItemDef(item).equipBonus || {};
                const entries = Object.entries(bonus).map(([stat, amount]) => `${stat.toUpperCase()} ${amount >= 0 ? '+' : ''}${amount}`);
                return entries.length ? entries.join(', ') : 'No bonus';
            },

            // ===== INVENTORY =====
            showInventory() {
                let html = `<h3>Inventory (${this.inventory.length}/${this.MAX_INVENTORY})</h3>`;
                html += `<div class="option-card" style="text-align:left;cursor:default;margin-top:12px;"><div style="font-weight:700;color:var(--text-primary)">Equipped</div><div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:6px">${this._equipmentSummary()}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">`;
                Object.entries(this.EQUIPMENT_SLOTS).forEach(([slot, label]) => {
                    const equipped = this.player?.equipment?.[slot];
                    if (equipped) html += `<button class="nav-btn" style="padding:4px 8px;font-size:11px" onclick="App.unequipItem('${slot}')">Unequip ${label}</button>`;
                });
                html += `</div></div>`;
                if (this.inventory.length === 0) {
                    html += `<p style="color:var(--text-muted);margin-top:12px;">Empty.</p><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
                    document.getElementById('scene-description').innerHTML = html;
                    return;
                }
                html += this._itemListOptions('Inventory');
                const entries = this._filterAndSortItemEntries(this.inventory.map((item, index) => ({ item, index })), this.inventoryFilter, this.inventorySort);
                if (entries.length === 0) {
                    html += `<p style="color:var(--text-muted);margin-top:12px;">No items match the current filter.</p><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
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
                    if (canUse) html += `<button class="nav-btn" style="flex:1;padding:4px 8px;font-size:11px" onclick="App.useItem('${itemKey}')">Use</button>`;
                    if (canEquip) html += `<button class="nav-btn" style="flex:1;padding:4px 8px;font-size:11px" onclick="App.equipItem('${String(item.id).replace(/'/g, "\\'")}')">Equip</button>`;
                    html += `<button class="nav-btn" style="padding:4px 8px;font-size:11px;color:var(--accent-danger)" onclick="App.dropItem('${itemKey}')">Drop</button></div></div>`;
                });
                html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
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
                const container = document.getElementById('party-content');
                if (container) container.innerHTML = this.party.map((unit, i) => this.renderUnitCard(unit, i, 'party')).join('');
                this.renderMobilePartyStrip();
            },
            renderCreatures() {
                const container = document.getElementById('enemies-content');
                const title = document.getElementById('enemies-title');
                const mobileTitle = document.getElementById('mobile-creature-title');
                let titleText = 'Area';
                const living = this.creatures.filter(c => !this._isCorpse(c));
                const corpses = this.creatures.filter(c => this._isCorpse(c));
                if (title) {
                    const enemies = living.filter(c => c.disposition === this.DISPOSITION.ENEMY);
                    const friendlies = living.filter(c => c.disposition !== this.DISPOSITION.ENEMY);
                    if (enemies.length > 0) titleText = 'Enemies';
                    else if (friendlies.length > 0) titleText = 'Creatures';
                    else if (corpses.length > 0) titleText = 'Remains';
                    title.textContent = titleText;
                }
                if (mobileTitle) mobileTitle.textContent = titleText;
                if (container) {
                    let html = living.map((unit, i) => this.renderUnitCard(unit, this.creatures.indexOf(unit), 'creature')).join('');
                    if (corpses.length > 0) {
                        html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);"><div style="color:var(--text-muted);font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Remains</div>`;
                        html += corpses.map(unit => this.renderUnitCard(unit, this.creatures.indexOf(unit), 'creature')).join('');
                        html += '</div>';
                    }
                    container.innerHTML = html || '<p style="color: var(--text-muted); text-align: center;">No creatures present</p>';
                }
                this.renderMobileCreatureStrip();
            },
            renderMobilePartyStrip() {
                const strip = document.getElementById('mobile-party-strip');
                if (!strip) return;
                strip.innerHTML = this.party.map((unit, i) => this.renderMobileUnitChip(unit, i, 'party')).join('');
            },
            renderMobileCreatureStrip() {
                const strip = document.getElementById('mobile-creature-strip');
                const card = document.getElementById('mobile-creature-card');
                if (!strip) return;
                const living = this.creatures.filter(c => c.CPun > 0 && !this._isCorpse(c));
                if (card) card.style.display = living.length > 0 || this.combatState.active ? 'block' : 'none';
                strip.innerHTML = living.length > 0
                    ? living.map(unit => this.renderMobileUnitChip(unit, this.creatures.indexOf(unit), 'creature')).join('')
                    : '<div style="color:var(--text-muted);font-size:12px;padding:6px;">No creatures here</div>';
            },
            renderMobileUnitChip(unit, index, type) {
                if (!unit) return '';
                const hpPercent = Math.max(0, Math.min(100, Math.round((unit.CPun / unit.MPun) * 100)));
                const isParty = type === 'party';
                const targetKey = String(unit.id || unit.name).replace(/'/g, "\\'");
                const rawTargetId = this._unitSelectionId(unit);
                const targetSelected = this._isExplorationTarget(type, rawTargetId);
                const isTargetable = !isParty && this.targetSelection && this.canSelectCreatureTarget(unit);
                let actionButtons = '';
                if (isParty && !this.combatState.active) {
                    const selectedActors = this._getExplorationActors();
                    const selectedClass = selectedActors.includes(unit) ? ' primary' : '';
                    const targetClass = targetSelected ? ' primary' : '';
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;"><button class="action-btn${selectedClass}" onclick="event.stopPropagation();App.selectExplorationActor(${index})">Act</button><button class="action-btn${targetClass}" onclick="event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')">Target</button></div>`;
                }
                if (!isParty && unit.CPun > 0) {
                    if (this.targetSelection) {
                        const disabled = isTargetable ? '' : ' disabled';
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;"><button class="action-btn primary" ${disabled} onclick="event.stopPropagation();App.executeActionOnTarget('${this.targetSelection.action}','${targetKey}')">Target</button></div>`;
                    } else if (!this.combatState.active) {
                        const targetClass = targetSelected ? ' primary' : '';
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;"><button class="action-btn${targetClass}" onclick="event.stopPropagation();App.toggleExplorationTarget('creature','${targetKey}')">Target</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('fight','${targetKey}')">⚔️</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('flirt','${targetKey}')">😘</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('fuck','${targetKey}')">🔥</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('feast','${targetKey}')">🍽️</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('feed','${targetKey}')">🍲</button>`;
                        if (this._canRecruit(this._getExplorationActor(), unit)) {
                            actionButtons += `<button class="action-btn primary" onclick="event.stopPropagation();App.recruitCreatureById('${targetKey}')">💕</button>`;
                        }
                        if (unit.quest) {
                            actionButtons += `<button class="action-btn primary" onclick="event.stopPropagation();App.acceptQuestFromUnit('${targetKey}')">📜</button>`;
                        }
                        if (unit.disposition === this.DISPOSITION.MERCHANT) {
                            actionButtons += `<button class="action-btn primary" onclick="event.stopPropagation();App.showTrade('${targetKey}')">🪙</button>`;
                        }
                        actionButtons += '</div>';
                    }
                }
                const click = isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`;
                const status = isParty ? (unit.name === this.player?.name ? 'You' : 'Ally') : (unit.disposition === this.DISPOSITION.MERCHANT ? 'Merchant' : unit.disposition === this.DISPOSITION.QUEST_GIVER ? 'Quest' : unit.disposition === this.DISPOSITION.ENEMY ? 'Hostile' : unit.disposition === this.DISPOSITION.FRIENDLY ? 'Friendly' : 'Neutral');
                const rowText = this.combatState.active && unit.combatRow ? ` | ${unit.combatRow === 'back' ? 'Back' : 'Front'}` : '';
                const turnBadge = this._turnOrderBadge(unit);
                const pressHandlers = !isParty ? ` ontouchstart="App.startMobileCreaturePress(event,'${targetKey}')" ontouchmove="App.cancelMobileCreaturePress()" ontouchend="App.cancelMobileCreaturePress()" ontouchcancel="App.cancelMobileCreaturePress()"` : '';
                return `<div class="mobile-unit-chip ${isTargetable ? 'targetable' : ''}" onclick="${click}"${pressHandlers}>
                    <div class="mobile-chip-name"><span>${unit.icon}</span><span>${unit.name}</span>${turnBadge}</div>
                    <div class="mobile-chip-meta">${status} | ${unit.CPun}/${unit.MPun}${rowText}</div>
                    <div class="mobile-chip-bar"><div class="mobile-chip-fill" style="width:${hpPercent}%"></div></div>
                    ${actionButtons}
                </div>`;
            },
            renderUnitCard(unit, index, type) {
                const hpPercent = Math.max(0, Math.min(100, Math.round((unit.CPun / unit.MPun) * 100)));
                const plePercent = Math.max(0, Math.min(100, Math.round((unit.CPle / unit.MPle) * 100)));
                const isExpanded = unit.expanded || false;
                const isParty = type === 'party';
                const isPlayer = isParty && unit.name === this.player?.name;
                const isAlly = isParty && !isPlayer;
                const isCorpse = this._isCorpse(unit);
                const isLeader = isParty && this._getPartyLeader() === unit;
                let actionButtons = '';
                if (isParty && !this.combatState.active) {
                    const selectedActors = this._getExplorationActors();
                    const selectedClass = selectedActors.includes(unit) ? ' primary' : '';
                    const unitLabel = this._escapeHtml(unit.name || 'party member');
                    const targetClass = this._isExplorationTarget('party', this._unitSelectionId(unit)) ? ' primary' : '';
                    const targetKey = this._unitKey(unit);
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${selectedClass}" title="Select ${unitLabel} to act" aria-label="Select ${unitLabel} to act" onclick="event.stopPropagation();App.selectExplorationActor(${index})">Act</button><button class="action-btn${targetClass}" title="Mark ${unitLabel} as target" aria-label="Mark ${unitLabel} as target" onclick="event.stopPropagation();App.toggleExplorationTarget('party','${targetKey}')">Target</button>`;
                    if (selectedActors.length > 0 && !(selectedActors.length === 1 && selectedActors.includes(unit))) {
                        actionButtons += `<button class="action-btn" title="Fight ${unitLabel}" aria-label="Fight ${unitLabel}" onclick="event.stopPropagation();App.outsideActionForParty('fight',${index})">⚔️</button><button class="action-btn" title="Flirt with ${unitLabel}" aria-label="Flirt with ${unitLabel}" onclick="event.stopPropagation();App.outsideActionForParty('flirt',${index})">😘</button><button class="action-btn" title="Pleasure ${unitLabel}" aria-label="Pleasure ${unitLabel}" onclick="event.stopPropagation();App.outsideActionForParty('fuck',${index})">🔥</button><button class="action-btn" title="Feast on ${unitLabel}" aria-label="Feast on ${unitLabel}" onclick="event.stopPropagation();App.outsideActionForParty('feast',${index})">🍽️</button><button class="action-btn" title="Feed ${unitLabel}" aria-label="Feed ${unitLabel}" onclick="event.stopPropagation();App.outsideActionForParty('feed',${index})">🍲</button>`;
                    }
                    actionButtons += `<button class="action-btn" title="Inspect ${unitLabel}" aria-label="Inspect ${unitLabel}" onclick="event.stopPropagation();App.outsideActionForParty('inspect',${index})">👁️</button>`;
                    actionButtons += `<button class="action-btn" title="Show stats for ${unitLabel}" aria-label="Show stats for ${unitLabel}" onclick="event.stopPropagation();App.showPartyMemberStats(${index})">Stats</button>`;
                    if (!isLeader) actionButtons += `<button class="action-btn" title="Make ${unitLabel} party leader" aria-label="Make ${unitLabel} party leader" onclick="event.stopPropagation();App.setPartyLeader(${index})">Lead</button>`;
                    if (index > 1) actionButtons += `<button class="action-btn" title="Move up" aria-label="Move ${unit.name} up" onclick="event.stopPropagation();App.movePartyMember(${index},-1)">↑</button>`;
                    if (!isPlayer && index < this.party.length - 1) actionButtons += `<button class="action-btn" title="Move down" aria-label="Move ${unit.name} down" onclick="event.stopPropagation();App.movePartyMember(${index},1)">↓</button>`;
                    if (isAlly) {
                        const order = this._getPartyAIOrder(unit);
                        const options = Object.entries(this.PARTY_AI_ORDERS).map(([key, label]) => `<option value="${key}" ${order === key ? 'selected' : ''}>${label}</option>`).join('');
                        actionButtons += `<select class="nav-btn" style="padding:4px 8px;font-size:11px;" title="AI order" aria-label="AI order for ${unit.name}" onclick="event.stopPropagation()" onchange="event.stopPropagation();App.setPartyAIOrder(${index},this.value)">${options}</select>`;
                        actionButtons += `<button class="action-btn" style="color:var(--accent-danger)" title="Dismiss ${unitLabel}" aria-label="Dismiss ${unitLabel}" onclick="event.stopPropagation();App.dismissPartyMember(${index})">Dismiss</button>`;
                    }
                    actionButtons += `</div>`;
                }
                if (!isParty && isCorpse) {
                    const targetKey = this._unitKey(unit);
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn" onclick="event.stopPropagation();App.lootCorpse('${targetKey}')">Loot</button><button class="action-btn" onclick="event.stopPropagation();App.scavengeCorpse('${targetKey}')">Scavenge</button></div>`;
                }
                if (!isParty && unit.CPun > 0 && !isCorpse) {
                    const targetKey = this._unitKey(unit);
                    if (this.targetSelection) {
                        const disabled = this.canSelectCreatureTarget(unit) ? '' : ' disabled';
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn primary" ${disabled} onclick="event.stopPropagation();App.executeActionOnTarget('${this.targetSelection.action}','${targetKey}')">Target</button></div>`;
                    } else if (!this.combatState.active) {
                        const targetLabel = this._escapeHtml(unit.name || 'creature');
                        const targetClass = this._isExplorationTarget('creature', String(unit.id || unit.name)) ? ' primary' : '';
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn${targetClass}" title="Mark ${targetLabel} as target" aria-label="Mark ${targetLabel} as target" onclick="event.stopPropagation();App.toggleExplorationTarget('creature','${targetKey}')">Target</button><button class="action-btn" title="Fight ${targetLabel}" aria-label="Fight ${targetLabel}" onclick="event.stopPropagation();App.outsideActionForCreature('fight','${targetKey}')">⚔️</button><button class="action-btn" title="Flirt with ${targetLabel}" aria-label="Flirt with ${targetLabel}" onclick="event.stopPropagation();App.outsideActionForCreature('flirt','${targetKey}')">😘</button><button class="action-btn" title="Pleasure ${targetLabel}" aria-label="Pleasure ${targetLabel}" onclick="event.stopPropagation();App.outsideActionForCreature('fuck','${targetKey}')">🔥</button><button class="action-btn" title="Feast on ${targetLabel}" aria-label="Feast on ${targetLabel}" onclick="event.stopPropagation();App.outsideActionForCreature('feast','${targetKey}')">🍽️</button><button class="action-btn" title="Feed ${targetLabel}" aria-label="Feed ${targetLabel}" onclick="event.stopPropagation();App.outsideActionForCreature('feed','${targetKey}')">🍲</button>`;
                        if (this._canRecruit(this._getExplorationActor(), unit)) {
                            actionButtons += `<button class="action-btn primary" title="Recruit ${targetLabel}" aria-label="Recruit ${targetLabel}" onclick="event.stopPropagation();App.recruitCreatureById('${targetKey}')">💕</button>`;
                        }
                        if (unit.quest) {
                            actionButtons += `<button class="action-btn primary" title="${unit.questAccepted ? 'View quest from' : 'Accept quest from'} ${targetLabel}" aria-label="${unit.questAccepted ? 'View quest from' : 'Accept quest from'} ${targetLabel}" onclick="event.stopPropagation();App.acceptQuestFromUnit('${targetKey}')">📜 ${unit.questAccepted ? 'View Quest' : 'Accept Quest'}</button>`;
                        }
                        if (unit.disposition === this.DISPOSITION.MERCHANT) {
                            actionButtons += `<button class="action-btn primary" title="Trade with ${targetLabel}" aria-label="Trade with ${targetLabel}" onclick="event.stopPropagation();App.showTrade('${targetKey}')">🪙 Trade</button>`;
                        }
                        actionButtons += `</div>`;
                    }
                }
                let dispLabel = '';
                if (!isParty) {
                    if (isCorpse) dispLabel = 'Remains';
                    else if (unit.disposition === this.DISPOSITION.ENEMY) dispLabel = 'Hostile';
                    else if (unit.disposition === this.DISPOSITION.FRIENDLY) dispLabel = 'Friendly';
                    else if (unit.disposition === this.DISPOSITION.QUEST_GIVER) dispLabel = 'Quest';
                    else if (unit.disposition === this.DISPOSITION.MERCHANT) dispLabel = 'Merchant';
                    else if (unit.disposition === this.DISPOSITION.NEUTRAL) dispLabel = 'Neutral';
                }
                const stomachUsed = this._containerUsed(unit, 'stomach');
                const wombUsed = this._containerUsed(unit, 'womb');
                const ballsUsed = this._containerUsed(unit, 'balls');
                const hasContained = stomachUsed > 0 || wombUsed > 0 || ballsUsed > 0;
                const capacitySummary = [
                    `Stomach: ${this._containerSummary(unit, 'stomach')}`,
                    `Womb: ${this._containerSummary(unit, 'womb')}`,
                    `Balls: ${this._containerSummary(unit, 'balls')}`
                ].join(' | ');
                const rowLabel = this.combatState.active && unit.combatRow ? ` Row:${unit.combatRow === 'back' ? 'Back' : 'Front'}` : '';
                const turnBadge = this._turnOrderBadge(unit);
                return `<div class="unit-card ${isExpanded ? 'expanded' : ''}" style="${isCorpse ? 'opacity:0.58;' : ''}" onclick="App.toggleUnit(${index},'${type}')">
	                    <div class="unit-header">
	                        <span class="unit-icon">${isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon}</span>
                        <div class="unit-info">
                            <div class="unit-name">${unit.name} ${isLeader ? '<span style="font-size:10px;color:var(--accent-primary)">[Leader]</span>' : ''} ${dispLabel ? '<span style="font-size:10px;color:var(--text-muted)">[' + dispLabel + ']</span>' : ''}${turnBadge}</div>
                            <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:${hpPercent}%;background:${hpPercent > 50 ? 'var(--accent-success)' : hpPercent > 25 ? 'var(--accent-warning)' : 'var(--accent-danger)'}"></div></div>
                            <div class="unit-stats">Pun:${unit.CPun}/${unit.MPun} Ple:${unit.CPle}/${unit.MPle} Lv:${unit.level}${rowLabel}</div>
	                        </div>
	                    </div>
	                    ${actionButtons}
	                    ${isExpanded ? `<div class="unit-details">
	                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
	                            <div><span style="color:var(--text-muted)">Figh:</span> ${unit.Figh}</div><div><span style="color:var(--text-muted)">Feas:</span> ${unit.Feas}</div>
                            <div><span style="color:var(--text-muted)">Flir:</span> ${unit.Flir}</div><div><span style="color:var(--text-muted)">Fuck:</span> ${unit.Fuck}</div>
                            <div><span style="color:var(--text-muted)">Flee:</span> ${unit.Flee}</div><div><span style="color:var(--text-muted)">Feed:</span> ${unit.Feed}</div>
                            <div><span style="color:var(--text-muted)">Size:</span> ${unit.size}</div><div><span style="color:var(--text-muted)">App:</span> ${unit.appetite}</div>
	                            <div><span style="color:var(--text-muted)">Parts:</span> ${unit.parts || 'none'}</div><div><span style="color:var(--text-muted)">Chest:</span> ${unit.chest || 'none'}</div>
		                            <div style="grid-column:1/-1;color:${hasContained ? 'var(--accent-warning)' : 'var(--text-muted)'}">${capacitySummary}</div>
	                        </div>
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
                            const struct = room?.structure ? this.STRUCTURES[room.structure] : null;
                            const content = room?.exit ? '🚪' : (struct?.icon || (room?.explored ? '□' : '·'));
                            let classes = 'map-tile';
                            if (isCenter) classes += ' center';
                            else if (room?.explored) classes += ' explored';
                            else if (isAdjacent) classes += ' moveable';
                            else classes += ' far';
                            const onclick = isCenter ? '' : (isAdjacent ? `onclick="App.move(${tx - cx},${ty - cy})"` : '');
                            const title = room?.exit ? `Exit (${tx}, ${ty})` : `${struct?.name || 'Room'} (${tx}, ${ty})`;
                            html += `<div class="${classes}" title="${title}" aria-label="${title}" ${onclick}>${content}</div>`;
                        }
                        html += '</div>';
                    }
                    const containers = [document.getElementById('mini-map'), document.getElementById('mobile-mini-map')].filter(Boolean);
                    containers.forEach(container => { container.innerHTML = html; });
                    const coords = document.getElementById('coords');
                    if (coords) coords.textContent = `Inside ${this.activeInterior.structureName}`;
                    const mobileCoords = document.getElementById('mobile-coords');
                    if (mobileCoords) mobileCoords.textContent = `Inside ${cx}, ${cy}`;
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
                        const biome = tile ? this.biomes[tile.biome] : null;
                        const hasCreatures = tile && tile.creatures && tile.creatures.length > 0;
                        let content = tile ? (biome ? biome.icon : '?') : '·';
                        let classes = 'map-tile';
                        if (isCenter) classes += ' center';
                        else if (!isVisible) classes += ' far';
                        else if (isExplored) classes += ' explored';
                        else if (isAdjacent) classes += ' moveable';
                        else classes += ' far';
                        if (hasCreatures) classes += ' has-enemy';
                        const onclick = isCenter ? '' : (isAdjacent ? `onclick="App.move(${dx},${dy})"` : '');
                        const title = biome ? `${biome.name} (${tx}, ${ty})` : `${tx}, ${ty}`;
                        html += `<div class="${classes}" title="${title}" aria-label="${title}" ${onclick}>${content}</div>`;
	                    }
	                    html += '</div>';
	                }
	                const containers = [document.getElementById('mini-map'), document.getElementById('mobile-mini-map')].filter(Boolean);
	                containers.forEach(container => { container.innerHTML = html; });
	                const mobileCoords = document.getElementById('mobile-coords');
	                if (mobileCoords) mobileCoords.textContent = `${cx}, ${cy}`;
                    this.applyMobileMapZoom();
	                this._renderTime();
	            },

            // ===== SCENE / LOG =====
            updateScene(title, description, inCombat) {
	                const titleEl = document.getElementById('scene-title');
	                const descEl = document.getElementById('scene-description');
	                if (titleEl) titleEl.textContent = title || '';
	                if (descEl) descEl.textContent = description || '';
	                const mobileTitle = document.getElementById('mobile-scene-title');
	                const mobileDesc = document.getElementById('mobile-scene-description');
	                if (mobileTitle) mobileTitle.textContent = title || '';
	                if (mobileDesc) mobileDesc.textContent = description || '';
	                const actions = document.getElementById('scene-actions');
                const mobileActions = document.getElementById('mobile-actions');
	                const mobileCombat = document.getElementById('mobile-combat-actions');
	                const mobileExplore = document.getElementById('mobile-explore-actions');
	                if (inCombat) {
	                    if (actions) {
	                        const keys = ['fight', 'flirt', 'feast', 'fuck', 'feed', 'flee'];
	                        actions.innerHTML = keys.map(key => this._iconActionButton(key, this._actionIcon(key), `combatAction('${key}')`, key === 'fight' ? 'primary' : '')).join('') + this._actionLegend(keys);
	                    }
                    if (mobileActions) mobileActions.style.display = 'block';
                    if (mobileCombat) mobileCombat.style.display = 'flex';
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
            _escapeHtml(value) {
                return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
            },
            _logTimestamp(entry, indexFromEnd = 0) {
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
                    const prefs = JSON.parse(localStorage.getItem('fff-log-view') || '{}');
                    const allowed = ['all', 'combat', 'discovery', 'loot', 'heal'];
                    this.logFilter = allowed.includes(prefs.filter) ? prefs.filter : 'all';
                    this.logSearch = typeof prefs.search === 'string' ? prefs.search : '';
                } catch(e) {
                    this.logFilter = 'all';
                    this.logSearch = '';
                }
            },
            saveLogViewPreferences() {
                localStorage.setItem('fff-log-view', JSON.stringify({
                    filter: this.logFilter || 'all',
                    search: this.logSearch || ''
                }));
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
	                if (container) container.innerHTML = entries || '<div class="log-entry text-muted">No log entries match the current filter.</div>';
                    document.querySelectorAll?.('.log-filter-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.logFilter === (this.logFilter || 'all'));
                    });
                    const search = document.getElementById('log-search');
                    if (search && search.value !== (this.logSearch || '')) search.value = this.logSearch || '';
	                const mobileLog = document.getElementById('mobile-log-summary');
	                if (mobileLog) {
	                    const latest = this.log[this.log.length - 1];
	                    mobileLog.textContent = latest ? latest.text : 'Welcome to FightFuckFeed.me Tactical Edition';
	                }
	            },
            clearLog() { this.log = []; this.renderLog(); },
            search() {
                this._advanceTime(1);
                const tile = this._currentExplorationTile();
                const roll = Math.random();
                let result = '';
                if (roll < 0.3) {
                    const items = Object.keys(this.ITEMS);
                    const iname = items[Math.floor(Math.random() * items.length)];
                    const iid = 'item_' + Date.now();
                    this.inventory.push({ id: iid, name: iname });
                    this._updateQuestProgress('find', { item: iname, name: iname });
                    result = 'You found a ' + iname + '!';
                } else if (roll < 0.6) {
                    result = 'You explore the area. ' + tile.description;
                } else {
                    result = 'Nothing of interest here.';
                }
                this.log.push({ text: result, type: 'discovery' });
                this.renderLog();
                this.autoSave();
            },
            rest() {
                if (!this._canRestHere()) {
                    this.log.push({ text: 'There is no safe place to rest here.', type: 'discovery' });
                    this.renderLog();
                    this.renderExplorationActions();
                    return;
                }
                const healed = new Set([this.player, ...this.party]);
                healed.forEach(p => { p.CPun = Math.min(p.MPun, p.CPun + 30); });
                this.log.push({ text: 'Rested and recovered.', type: 'heal' });
                this.renderLog(); this.renderParty();
            },

            // ===== SCREEN MANAGEMENT =====
            showScreen(name) {
                this.screen = name;
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
            },
            showCharacterStats() {
                if (!this.player) return;
                const p = this.player;
                const perkButton = (p.pendingPerkChoices || 0) > 0 ? `<button class="nav-btn" style="margin-top:12px" onclick="App.showPerkSelection()">Choose Perk (${p.pendingPerkChoices})</button>` : '';
                let html = `<div style="max-width:600px;margin:0 auto;padding:32px;"><h1 style="color:var(--accent-primary)">📊 ${p.name}</h1>
                    <p>Level ${p.level} ${p.species} | XP: ${p.xp}/${p.xpToNext}</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Punishment</h3><p>${p.CPun}/${p.MPun}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Pleasure</h3><p>${p.CPle}/${p.MPle}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Combat Stats</h3><p>Figh: ${p.Figh} | Feas: ${p.Feas} | Flir: ${p.Flir}<br>Fuck: ${p.Fuck} | Flee: ${p.Flee} | Feed: ${p.Feed}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Attributes</h3><p>STR: ${p.str} | CON: ${p.con} | SPD: ${p.spd}<br>INT: ${p.int} | WIS: ${p.wis} | CHA: ${p.cha}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Body</h3><p>Size: ${p.size} | Appetite: ${p.appetite}<br>Parts: ${p.parts || 'none'} | Chest: ${p.chest || 'none'}<br>Body: ${(p.bodyParts || []).map(b => this.BODY_PARTS[b]?.label || b).join(', ') || 'None'}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Equipment</h3><p>${this._equipmentSummary(p)}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Perks</h3><p>${(p.perks || []).map(pk => pk.name).join(', ') || 'None'}</p></div>
                    </div>
                    ${perkButton}<button class="nav-btn" style="margin-top:24px" onclick="returnToGame()">Close</button></div>`;
                document.getElementById('scene-description').innerHTML = html;
            },
            cheats: { godMode: false, neverHungry: false, canEatAnything: false, overpowered: false },
            toggleCheat(cheat) {
                this.cheats[cheat] = !this.cheats[cheat];
                const isOn = this.cheats[cheat];
                this.log.push({ text: `Cheat ${cheat}: ${isOn ? 'ON' : 'OFF'}`, type: 'discovery' });
                if (cheat === 'overpowered' && isOn && this.player) {
                    this.player.Figh = 99; this.player.Feas = 99; this.player.Flir = 99;
                    this.player.Fuck = 99; this.player.Flee = 99; this.player.Feed = 99;
                    this.player.str = 99; this.player.con = 99; this.player.spd = 99;
                    this.player.int = 99; this.player.wis = 99; this.player.cha = 99;
                    this.player.MPun = 999; this.player.CPun = 999;
                    this.player.MPle = 999; this.player.CPle = 999;
                    this.log.push({ text: 'Overpowered! All stats maxed.', type: 'discovery' });
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
                    this.log.push({ text: 'Not in combat! Instant Win only works during combat.', type: 'combat' });
                    this.renderLog();
                    return;
                }
                if (!this.cheats.overpowered) {
                    this.log.push({ text: 'Instant Win requires Overpowered mode.', type: 'combat' });
                    this.renderLog();
                    return;
                }
                this.log.push({ text: '⚡ INSTANT WIN! All enemies are defeated.', type: 'combat' });
                this.renderLog();
                this.creatures.forEach(c => { if (c.disposition === this.DISPOSITION.ENEMY && this._isLivingCreature(c)) this._makeCorpse(c, 'fight'); });
                this._emitCombatAction('instant_win', this.player, null, 'success');
                this.endCombat(true);
            },
            clearAllData() {
                if (!confirm('WARNING: This will delete ALL saves, modules, and game data. This cannot be undone. Are you sure?')) return;
                // Delete all saves from IndexedDB
                for (let i = 1; i <= 5; i++) {
                    this._dbDelete('saves', 'slot' + i).catch(() => {});
                    localStorage.removeItem('fff-save-time-slot' + i);
                }
                localStorage.removeItem('fff-last-slot');
                localStorage.removeItem('fff-last-save-time');
                localStorage.removeItem('tactical-has-played');
                localStorage.removeItem('tactical-tutorial-complete');
                localStorage.removeItem('fff-content-prefs');
                // Delete module DB
                const req = indexedDB.deleteDatabase('FFFme_Modules');
                req.onsuccess = () => console.log('Module DB deleted');
                req.onerror = () => console.error('Failed to delete module DB');
                // Delete saves DB
                const req2 = indexedDB.deleteDatabase('FFF_Saves');
                req2.onsuccess = () => console.log('Saves DB deleted');
                req2.onerror = () => console.error('Failed to delete saves DB');
                alert('All data cleared. Refresh the page to start fresh.');
                location.reload();
            },
            async deleteAllSaves() {
                if (!confirm('Delete ALL save data? This cannot be undone!')) return;
                try {
                    for (let i = 1; i <= 5; i++) {
                        await this._dbDelete('saves', 'slot' + i);
                        localStorage.removeItem('fff-save-time-slot' + i);
                    }
                    localStorage.removeItem('fff-last-slot');
                    localStorage.removeItem('fff-last-save-time');
                    localStorage.removeItem('tactical-has-played');
                    this.activeSlot = 'slot1';
                    alert('All saves deleted.');
	                    if (document.getElementById('save-manager')?.classList.contains('active')) {
	                        this.renderSaveManager();
	                    }
	                    location.reload();
	                } catch (e) {
	                    alert('Delete saves failed: ' + e.message);
	                }
            },
            selectEncounterPreference(val) { this.selectedEncounterPreference = val; },
            updateTierButtons() {
                const btns = { safe: 'tier-safe', mature: 'tier-mature', adult: 'tier-adult' };
                for (const [tier, id] of Object.entries(btns)) {
                    const el = document.getElementById(id);
                    if (el) {
                        el.style.background = (tier === 'safe' && CONTENT.preferences.maxTier === 1) ||
                                            (tier === 'mature' && CONTENT.preferences.maxTier === 2) ||
                                            (tier === 'adult' && CONTENT.preferences.maxTier === 3)
                                            ? 'var(--accent-primary)' : 'var(--bg-tertiary)';
                        el.style.color = (tier === 'safe' && CONTENT.preferences.maxTier === 1) ||
                                         (tier === 'mature' && CONTENT.preferences.maxTier === 2) ||
                                         (tier === 'adult' && CONTENT.preferences.maxTier === 3)
                                         ? 'var(--bg-primary)' : 'var(--text-secondary)';
                    }
                }
            },
            saveSettings() {
                localStorage.setItem('fff-settings', JSON.stringify({
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
                    localStorage.setItem('fff-content-prefs', JSON.stringify(CONTENT.preferences));
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
            showSaveManager() { this.showScreen('save-manager'); this.renderSaveManager(); },
            renderSaveManager() {
                const saves = {};
                const lastSlot = localStorage.getItem('fff-last-slot') || 'slot1';
                let html = '<div style="max-width:600px;margin:0 auto;padding:32px;"><h1 style="color:var(--accent-primary);margin-bottom:8px;">Save Slots</h1><p style="color:var(--text-muted);margin-bottom:24px;">Auto-save is always on.</p>';
                for (let i = 1; i <= 5; i++) {
                    const slotName = 'slot' + i;
                    const isActive = slotName === lastSlot;
                    const saveTime = localStorage.getItem('fff-save-time-' + slotName) || '0';
                    const hasData = parseInt(saveTime) > 0;
                    const timeStr = hasData ? new Date(parseInt(saveTime)).toLocaleString() : 'Empty';
                    html += '<div style="background:' + (isActive ? 'var(--bg-elevated)' : 'var(--bg-secondary)') + ';border:1px solid ' + (isActive ? 'var(--accent-primary)' : 'var(--border-default)') + ';border-radius:var(--radius-md);padding:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">';
                    html += '<div><div style="font-weight:600;color:var(--text-primary);">' + (isActive ? '▶ ' : '') + 'Slot ' + i + '</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">' + timeStr + '</div></div>';
                    html += '<div style="display:flex;gap:8px;">';
                    if (hasData) html += '<button class="nav-btn" onclick="App.loadFromSlot(\'' + slotName + '\').then(() => { App.showScreen(\'game\'); })">📂 Load</button>';
                    html += '<button class="nav-btn" onclick="App.saveToSlot(\'' + slotName + '\')">💾 Save</button>';
                    if (hasData) html += '<button class="nav-btn" style="color:var(--accent-danger);" onclick="App.deleteSlot(\'' + slotName + '\')">🗑️</button>';
                    html += '</div></div>';
                }
                html += '<div style="display:flex;gap:12px;justify-content:center;margin-top:24px;"><button class="nav-btn" onclick="returnToGame()">Close</button></div></div>';
                document.getElementById('save-manager').innerHTML = html;
                document.getElementById('save-manager').style.display = 'block';
            },
            showModScreen() { ModUI.showModScreen(); },
            showMarketScreen() { MODULE_MARKETPLACE.ui.showMarketplace(); },
            showTutorial() {
                this.tutorialStep = 0;
                document.getElementById('tutorial-overlay').style.display = 'flex';
                this.nextTutorial();
            },
            nextTutorial() {
                const steps = [
                    { title: 'Welcome', content: 'You are a predator in a world of monstergirls. Hunt, consume, and grow stronger. But choose your prey wisely...' },
                    { title: 'Combat', content: 'In combat, you take turns with enemies and allies. Use Fight, Fuck, or Feast. Sync actions let multiple allies act together!' },
                    { title: 'Vore', content: 'Feast on weakened enemies to consume them. They will be stored in your stomach and slowly digested. Enable Endo mode for safe vore.' },
                    { title: 'Party', content: 'Recruit submissive enemies by seducing them or defeating them. Manage your party size and keep allies satisfied.' },
                    { title: 'Ready', content: 'Press Begin Adventure to start your journey. Good luck!' }
                ];
                if (this.tutorialStep >= steps.length) {
                    document.getElementById('tutorial-overlay').style.display = 'none';
                    return;
                }
                const step = steps[this.tutorialStep];
                document.getElementById('tutorial-title').textContent = step.title;
                document.getElementById('tutorial-content').textContent = step.content;
                this.tutorialStep++;
            },
            skipTutorial() { document.getElementById('tutorial-overlay').style.display = 'none'; },
            continueLastGame() { this.loadLastPlayed(); },
            combatAction(action) {
                if (!this.combatState.active) { this.log.push({ text: 'Not in combat!', type: 'combat' }); this.renderLog(); return; }
                if (this.combatState.processing) { this.log.push({ text: 'Wait for your turn!', type: 'combat' }); this.renderLog(); return; }
                const currentEntry = this.combatState.turnQueue[this.combatState.currentTurn];
                const current = currentEntry ? (currentEntry.unit || currentEntry) : null;
                if (!current || current.name !== this.player.name) { this.log.push({ text: 'Not your turn!', type: 'combat' }); this.renderLog(); return; }
                if (action === 'fight') this.selectTarget('fight');
                else if (action === 'flirt') this.selectTarget('flirt');
                else if (action === 'fuck') this.selectTarget('fuck');
                else if (action === 'feed' || action === 'feast') this.selectTarget('feast');
                else if (action === 'flee') this.attemptFlee();
            },
            togglePanel(p) {
                const panel = document.getElementById('panel-' + p);
                if (!panel) return;
                const isMobile = window.innerWidth <= 1024;
                if (!isMobile) return;
                const wasActive = panel.classList.contains('active');
                document.querySelectorAll('.panel-map, .panel-party, .panel-enemies').forEach(p => p.classList.remove('active'));
                if (!wasActive) panel.classList.add('active');
                this.syncPanelBackdrop();
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
            closeMobileContextMenu() {
                const menu = document.getElementById('mobile-context-menu');
                if (menu) menu.remove();
            },
            showMobileCreatureContext(targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target || this._isCorpse(target)) return;
                this.closeMobileContextMenu();
                const canRecruit = this._canRecruit(this._getExplorationActor(), target);
                let html = `<div class="mobile-context-menu" id="mobile-context-menu" role="menu"><div class="mobile-context-menu-title">${target.icon || ''} ${target.name}</div><div class="mobile-context-menu-actions">`;
                html += `<button class="action-btn" onclick="App.mobileCreatureContextAction('fight','${targetId}')">⚔️ Fight</button>`;
                html += `<button class="action-btn" onclick="App.mobileCreatureContextAction('flirt','${targetId}')">😘 Flirt</button>`;
                html += `<button class="action-btn" onclick="App.mobileCreatureContextAction('feed','${targetId}')">🍲 Feed</button>`;
                html += `<button class="action-btn" onclick="App.mobileCreatureContextAction('inspect','${targetId}')">👁️ Inspect</button>`;
                if (canRecruit) html += `<button class="action-btn primary" onclick="App.mobileCreatureContextAction('recruit','${targetId}')">💕 Recruit</button>`;
                html += `<button class="action-btn" onclick="App.closeMobileContextMenu()">Close</button></div></div>`;
                document.body.insertAdjacentHTML('beforeend', html);
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
            async checkLastPlayed() {
                const lastSlot = localStorage.getItem('fff-last-slot');
                if (!lastSlot) return false;
                const saveData = await this._dbGet('saves', lastSlot);
                return !!saveData;
            },
            async autoSave() {
                if (!this.player || this.screen !== 'game') return;
                try {
                    const saveData = Binary.saveGame(this);
                    await this._dbPut('saves', this.activeSlot, saveData);
                    localStorage.setItem('fff-last-slot', this.activeSlot);
                    localStorage.setItem('fff-last-save-time', Date.now().toString());
                    console.log('Auto-saved to', this.activeSlot);
                } catch (e) { console.error('Auto-save failed:', e); }
            },
            async saveToSlot(slotName) {
                if (!this.player) { alert('No game to save!'); return; }
                try {
                    const saveData = Binary.saveGame(this);
                    await this._dbPut('saves', slotName, saveData);
                    this.activeSlot = slotName;
                    localStorage.setItem('fff-last-slot', slotName);
                    localStorage.setItem('fff-last-save-time', Date.now().toString());
                    localStorage.setItem('fff-save-time-' + slotName, Date.now().toString());
                    alert('Game saved to ' + slotName + '!');
                } catch (e) { alert('Save failed: ' + e.message); }
            },
            async loadFromSlot(slotName) {
                try {
                    const saveData = await this._dbGet('saves', slotName);
                    if (!saveData) { alert('No save in ' + slotName); return false; }
                    let loaded;
                    try {
                        loaded = Binary.loadGame(saveData);
                    } catch (e) {
                        console.error('Incompatible save:', e);
                        const choice = prompt(`Save data is incompatible or corrupted. Options:

1 = Delete save
2 = Download backup (as base64)
3 = Cancel

Enter 1, 2, or 3:`);
                        if (choice === '1') {
                            await this._dbDelete('saves', slotName);
                            localStorage.removeItem('fff-save-time-' + slotName);
                            alert('Save deleted.');
                        } else if (choice === '2') {
                            const base64 = btoa(String.fromCharCode(...new Uint8Array(saveData)));
                            const blob = new Blob([base64], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = 'fff_save_' + slotName + '_backup.txt'; a.click();
                            URL.revokeObjectURL(url);
                            alert('Backup downloaded. Save remains intact.');
                        }
                        return false;
                    }
                    this.encounterPreference = loaded.encounterPreference || 'any';
	                    this.player = {
	                        name: loaded.playerName, species: loaded.playerSpecies, icon: this.species.find(s => s.id === loaded.playerSpecies)?.icon || '👤',
	                        gender: loaded.playerGender || 'female', level: loaded.playerLevel, CPun: loaded.playerHp, MPun: loaded.playerMaxHp, CPle: Math.floor(loaded.playerMaxHp * 0.5), MPle: loaded.playerMaxHp,
	                        stats: loaded.playerStats, tags: [this.species.find(s => s.id === loaded.playerSpecies)?.name || 'Human']
	                    };
	                    this._normalizeUnit(this.player, { disposition: this.DISPOSITION.PARTY, hero: true, ally: false, mc: true, obedient: true, willing: true });
	                    this.location = { x: loaded.locationX, y: loaded.locationY };
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
                    this.currentBiome = loaded.currentBiome || 'forest';
                    this.timeHour = typeof loaded.timeHour === 'number' ? loaded.timeHour : 8;
                    this.dayCount = loaded.questState?.dayCount || 0;
                    this.log = (loaded.log || []).map(t => ({ text: t, type: 'discovery' }));
                    this.creatures = [];
                    this.inventory = loaded.inventory || [];
                    this.quests = loaded.questState?.quests || [];
                    this.player.gold = loaded.questState?.playerGold || this.player.gold || 0;
                    this.player.equipment = loaded.questState?.playerEquipment || this.player.equipment || {};
                    this.player.perks = loaded.questState?.playerPerks || this.player.perks || [];
                    this.player.pendingPerkChoices = loaded.questState?.pendingPerkChoices || this.player.pendingPerkChoices || 0;
                    this.partyLeaderId = loaded.questState?.partyLeaderId || this._unitSelectionId(this.player);
                    this.inInterior = false;
                    this.activeInterior = null;
                    this.interiorLocation = { x: 0, y: 0 };
                    this.activeSlot = slotName;
                    this._restoreWorldState(loaded);
                    this._normalizeExplorationSelections({ resetTargets: true });
                    this.showScreen('game');
                    this.renderMap(); this.renderParty(); this.renderCreatures(); this.renderLog();
                    this.updateScene('Loaded', 'Welcome back, ' + this.player.name + '!', false);
                    localStorage.setItem('fff-last-slot', slotName);
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
                        this.log.push({ text: 'You were revived from the brink of death! Welcome back, ' + this.player.name + '.', type: 'discovery' });
                        this.renderLog();
                    }
                    return true;
                } catch (e) { console.error('Load failed:', e); alert('Load failed: ' + e.message); return false; }
            },
            _restoreWorldState(loaded) {
                this.worldMap = new Map();
                this.exploredTiles = new Set(loaded.exploredTiles || []);
                this.superPatchMap = new Map();
                if (loaded.worldMap) {
                    for (const [key, tile] of Object.entries(loaded.worldMap)) {
                        if (Array.isArray(tile.creatures)) {
                            tile.creatures = tile.creatures.map(unit => this._normalizeUnit(unit, {}));
                        }
                        this.worldMap.set(key, tile);
                        if (tile.explored) this.exploredTiles.add(key);
                    }
                }
                this._rebuildSuperPatchMap();
                const currentTile = this.getTile(this.location.x, this.location.y);
                this.currentBiome = currentTile.biome;
                this.creatures = this._tileCreatures(currentTile.creatures || []);
            },
            async loadLastPlayed() {
                const lastSlot = localStorage.getItem('fff-last-slot');
                if (!lastSlot) return false;
                return await this.loadFromSlot(lastSlot);
            },
            async deleteSlot(slotName) {
                if (!confirm('Delete save slot ' + slotName + '?')) return;
                try {
                    await this._dbDelete('saves', slotName);
                    localStorage.removeItem('fff-save-time-' + slotName);
                    if (this.activeSlot === slotName) this.activeSlot = 'slot1';
                    this.showSaveManager();
                } catch (e) { alert('Delete failed: ' + e.message); }
            },
            async _dbPut(store, key, value) {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open('FFF_Saves', 1);
                    req.onupgradeneeded = e => { e.target.result.createObjectStore('saves'); };
                    req.onsuccess = e => {
                        const db = e.target.result;
                        const tx = db.transaction('saves', 'readwrite');
                        tx.objectStore('saves').put(value, key);
                        tx.oncomplete = () => { db.close(); resolve(); };
                        tx.onerror = () => { db.close(); reject(tx.error); };
                    };
                    req.onerror = () => reject(req.error);
                });
            },
            async _dbGet(store, key) {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open('FFF_Saves', 1);
                    req.onupgradeneeded = e => { e.target.result.createObjectStore('saves'); };
                    req.onsuccess = e => {
                        const db = e.target.result;
                        const tx = db.transaction('saves', 'readonly');
                        const getReq = tx.objectStore('saves').get(key);
                        getReq.onsuccess = () => { db.close(); resolve(getReq.result); };
                        getReq.onerror = () => { db.close(); reject(getReq.error); };
                    };
                    req.onerror = () => reject(req.error);
                });
            },
            async _dbDelete(store, key) {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open('FFF_Saves', 1);
                    req.onupgradeneeded = e => { e.target.result.createObjectStore('saves'); };
                    req.onsuccess = e => {
                        const db = e.target.result;
                        const tx = db.transaction('saves', 'readwrite');
                        tx.objectStore('saves').delete(key);
                        tx.oncomplete = () => { db.close(); resolve(); };
                        tx.onerror = () => { db.close(); reject(tx.error); };
                    };
                    req.onerror = () => reject(req.error);
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
        window.returnToGame = () => {
            document.getElementById('screen-settings').style.display = 'none';
            document.getElementById('screen-mods').style.display = 'none';
            document.getElementById('screen-market').style.display = 'none';
            document.getElementById('save-manager').style.display = 'none';
            // screen-save-manager doesn't exist; save-manager is the actual id
            if (App.player && App.player.CPun > 0) {
                document.getElementById('screen-menu').style.display = 'none';
                document.getElementById('app').style.display = 'grid';
                document.getElementById('screen-game').style.display = 'flex';
            } else {
                document.getElementById('app').style.display = 'none';
                document.getElementById('screen-menu').style.display = 'flex';
            }
        };
        document.addEventListener('DOMContentLoaded', () => App.init());
