
        // =============================================
        // FIGHT FUCK FEED - MECHANICS OVERHAUL
        // =============================================

        const App = {
            // === CONSTANTS ===
            GAME_MODE: { NORMAL: 'normal', COMBAT: 'combat' },
            DISPOSITION: { ENEMY: 'enemy', NEUTRAL: 'neutral', FRIENDLY: 'friendly', PARTY: 'party', CORPSE: 'corpse', QUEST_GIVER: 'quest_giver', MERCHANT: 'merchant' },
            ACTION: { FIGHT: 'fight', FLIRT: 'flirt', FEAST: 'feast', FUCK: 'fuck', FEED: 'feed', FLEE: 'flee', SYNC_FIGHT: 'sync_fight', SYNC_FUCK: 'sync_fuck', SYNC_FEED: 'sync_feed', PROTECT: 'protect', RETREAT_COVER: 'retreat_cover' },
            SUB_ACTIONS: {
                feast: {
                    swallow: { label: 'Swallow', sfwLabel: 'Consume', icon: '🍽️', validate: (a, t) => t.CPun <= t.MPun * 0.3 || (a.Feas > t.Flee && a.size >= t.size - 2), execute: 'swallowWhole', setting: null },
                    chew: { label: 'Chew', sfwLabel: 'Mangle', icon: '🦷', validate: (a, t) => App.settings.chewing, execute: 'chewPrey', setting: 'chewing' },
                    cockVore: { label: 'Cock Vore', sfwLabel: 'Capture', icon: '🍆', validate: (a, t) => App.settings.cockVoreEnabled && a.parts === 'cock', execute: 'cockVore', setting: 'cockVoreEnabled' },
                    unbirth: { label: 'Unbirth', sfwLabel: 'Engulf', icon: '🔮', validate: (a, t) => App.settings.unbirthEnabled && a.parts === 'clit', execute: 'unbirth', setting: 'unbirthEnabled' },
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
                const labels = {
                    fight: 'Fight', flirt: isSFW ? 'Flirt' : 'Flirt', feast: isSFW ? 'Consume' : 'Feast',
                    fuck: isSFW ? 'Seduce' : 'Fuck', feed: isSFW ? 'Feed' : 'Feed', flee: 'Flee'
                };
                return labels[action] || action;
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
                'Enchanted Berry': { type: 'consumable', icon: '🫐', effect: 'buff', value: 5, desc: 'Temporarily boosts STR by 5' }
            },
            XP_REWARDS: { defeatEnemy: 50, consumeEnemy: 75, seduceEnemy: 60, flirtEnemy: 35, feedAlly: 20, feedEnemy: 25, discoverLandmark: 25, consumeAlly: 40 },

            // === STATE ===
            mode: 'normal',
            screen: 'create',
            tutorialStep: 0,
            player: null,
            party: [],
            creatures: [], // ALL creatures at location with disposition
            inventory: [],
            location: { x: 0, y: 0 },
            log: [],
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
                cockVoreEnabled: false, unbirthEnabled: false, forcedFeeding: false
            },

            combatState: {
                active: false, turnQueue: [], currentTurn: 0, round: 1,
                syncActions: [], processing: false, xpEarned: 0
            },
            targetSelection: null,
            activeActor: null,

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
                    descriptions: ['A small wooden cabin stands before you.','A lone cabin, smoke curling from its chimney.','A weathered cabin with a welcoming glow.'] },
                hut: { name: 'Hut', icon: '🛖', encounterChance: 0.20, disposition: 'neutral', threat: 1,
                    descriptions: ['A rustic hut built from sticks and mud.','A simple hut with a thatched roof.','A travelers hut, abandoned or inhabited.'] },
                cave: { name: 'Cave Mouth', icon: '🕳️', encounterChance: 0.35, disposition: 'enemy', threat: 3,
                    descriptions: ['A dark cave mouth yawns before you.','A shallow cave, something stirs within.','A narrow cave, the air is cold and damp.'] },
                ruins: { name: 'Ruins', icon: '🏛️', encounterChance: 0.30, disposition: 'enemy', threat: 3,
                    descriptions: ['Ancient ruins crumble around you.','A collapsed structure, something lurks.','A forgotten ruin, treasures and dangers.'] },
                camp: { name: 'Camp', icon: '⛺', encounterChance: 0.15, disposition: 'neutral', threat: 1,
                    descriptions: ['A small campsite, recently used.','A bandit camp, abandoned or occupied.','A makeshift camp, signs of recent travelers.'] },
                shrine: { name: 'Shrine', icon: '⛩️', encounterChance: 0.10, disposition: 'neutral', threat: 0,
                    descriptions: ['A tiny shrine to a forgotten deity.','A weathered shrine, offerings still fresh.','A serene shrine, peaceful energy radiates.'] },
                pond: { name: 'Pond', icon: '🏞️', encounterChance: 0.15, disposition: 'neutral', threat: 1,
                    descriptions: ['A crystal-clear pond reflects the sky.','A murky pond, something swims beneath.','A still pond, dragonflies dance overhead.'] },
                tree: { name: 'Great Tree', icon: '🌳', encounterChance: 0.10, disposition: 'neutral', threat: 0,
                    descriptions: ['An ancient tree, its trunk wider than a house.','A great tree, its branches form a canopy.','A magical tree, faint light pulses within.'] },
                spring: { name: 'Hot Spring', icon: '♨️', encounterChance: 0.20, disposition: 'friendly', threat: 0,
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
                    level: 1, xp: 0, xpToNext: 100,
                    MPun: maxPun, CPun: maxPun, MPle: maxPle, CPle: Math.floor(maxPle * 0.5),
                    Figh: baseStats.Figh, Feas: baseStats.Feas, Flir: baseStats.Flir, Fuck: baseStats.Fuck, Flee: baseStats.Flee, Feed: baseStats.Feed,
                    str: baseStats.str, con: baseStats.con, spd: baseStats.spd, int: baseStats.int, wis: baseStats.wis, cha: baseStats.cha,
                    tags: [species.name], perks: [], stomach: [], womb: [], balls: [], cum: 0, status: {},
                    expanded: true, hero: true, ally: false, mc: true, obedient: true, willing: true
                };
                this._applySpeciesAbilities(this.player);
                this.party = [this.player];
                this.creatures = [];
                this.location = { x: 0, y: 0 };
                this.log = [{ text: 'Welcome to the world, ' + name + '.', type: 'discovery' }];
                this.worldMap = new Map();
                this.exploredTiles = new Set();
                this.currentBiome = 'forest';
                this.inventory = [];
                this.mode = this.GAME_MODE.NORMAL;
                this.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false, xpEarned: 0 };
                this.targetSelection = null;
                this.activeActor = null;
                this.exploreTile(0, 0);
                this.showScreen('game');
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
            _makeCorpse(target, cause = 'fight') {
                if (!target) return target;
                target.CPun = 0;
                target.CPle = 0;
                target.alive = false;
                target.disposition = this.DISPOSITION.CORPSE;
                target.corpseCause = cause;
                target.corpseName = target.corpseName || target.name;
                target.corpseIcon = target.corpseIcon || target.icon;
                target.status = {};
                target.willing = false;
                target.knockedOut = false;
                const tile = this.worldMap.get(`${this.location.x},${this.location.y}`);
                if (tile) tile.creatures = this._tileCreatures(this.creatures);
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
                unit.stomach = unit.stomach || [];
                unit.womb = unit.womb || [];
                unit.balls = unit.balls || [];
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
                    this.currentBiome = tile.biome;
                }
                return tile;
            },

            // ===== MOVEMENT =====
            move(dx, dy) {
                if (!this.player) return;
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
                        this.spawnStructureEncounter(tile);
                    } else if (Math.random() < biome.encounterChance) {
                        // Roll for friendly vs hostile encounter
                        this.spawnWildEncounter(tile);
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
            spawnWildEncounter(tile, isBoss = false) {
                const biome = this.biomes[tile.biome];
                const count = isBoss ? 1 : Math.max(1, Math.floor(Math.random() * Math.min(3, Math.max(1, this.player.level - 1))) + 1);
                const creatures = [];
                for (let i = 0; i < count; i++) {
                    const pool = biome.encounterTable;
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
            spawnStructureEncounter(tile) {
                const biome = this.biomes[tile.biome];
                if (!tile.structure || !this.STRUCTURES[tile.structure]) return;
                const struct = this.STRUCTURES[tile.structure];
                tile.structureSpawned = true;
                // Structure always has an encounter inside
                if (Math.random() < struct.encounterChance) {
                    // Pick from structure-appropriate pool or biome pool
                    const pool = biome.encounterTable;
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
                this.combatState.turnQueue = allCombatants
                    .filter(c => c.CPun > 0 && !c.knockedOut)
                    .map(c => ({ unit: c, initiative: this._calcInitiative(c) }))
                    .sort((a, b) => b.initiative - a.initiative);
                this.combatState.currentTurn = 0;
                this.log.push({ text: `Combat! Order: ${this.combatState.turnQueue.map(e => e.unit.name).join(', ')}`, type: 'combat' });
                this.updateScene(`Round 1`, `Combat started!`, true);
                this.renderParty();
                this.renderCreatures();
                this.processTurn();
            },

            _calcInitiative(c) {
                let base = (c.spd || 10) + Math.random() * 10;
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

            processTurn() {
                if (!this.combatState.active) return;
                const queue = this.combatState.turnQueue;
                if (this.combatState.currentTurn >= queue.length) {
                    this._newRound(); return;
                }
                const entry = queue[this.combatState.currentTurn];
                if (!entry) { this.nextTurn(); return; }
                const currentUnit = entry.unit || entry.unit;
                if (!currentUnit || currentUnit.CPun <= 0 || currentUnit.knockedOut) { this.nextTurn(); return; }
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
                // Check if restrained (skip turn)
                if (currentUnit.status?.restrained && currentUnit.status.restrained.turns > 0) {
                    this.log.push({ text: `${currentUnit.name} is restrained and cannot act!`, type: 'combat' });
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
                const living = [...this.party.filter(p => p.CPun > 0 && !p.knockedOut), ...this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0)];
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
                // Per-turn digestion
                this._processDigestion();
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
                    if (unit.status.frightened) {
                        delete unit.status.frightened;
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
                    return unit.disposition === this.DISPOSITION.ENEMY;
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
                        const ar = this._AR(actor.Figh);
                        const def = target.con || 10;
                        const dmg = Math.max(1, Math.floor(ar - def * 0.3 + Math.random() * 6));
                        target.CPun -= dmg;
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
                        const prey = this._createStomachPrey(target);
                        if (!actor.stomach) actor.stomach = [];
                        actor.stomach.push(prey);
                        target.CPun = 0; target.CPle = 0;
                        actor.CPun = Math.min(actor.MPun, actor.CPun + 20);
                        actor.Feas += 1;
                        this._awardCombatXP(this.XP_REWARDS.consumeEnemy);
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
                        result = `${actorName} tear${actorVerb} into ${target.name} with savage teeth, chewing them apart!`;
                        break;
                    }
                    case 'feast.cockVore': {
                        if (!actor.parts || actor.parts !== 'cock') { result = `${actorName} lack${actorVerb} the anatomy for that.`; break; }
                        const canCV = this.cheats.canEatAnything || target.CPun <= target.MPun * 0.3 || (actor.Feas > target.Flee && actor.size >= target.size - 2);
                        if (!canCV) { result = `${target.name} is too strong or too big!`; break; }
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
	                tile.creatures = this._tileCreatures(this.creatures);
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
                        const def = sync.target.con || 10;
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
                            if (!eater.stomach) eater.stomach = [];
	                            eater.stomach.push({ ...sync.target, alive: true, inStomach: true });
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
            allyTurn(ally) {
                const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                if (enemies.length === 0) { this.nextTurn(); return; }
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
                            if (canEat) {
                                if (!ally.stomach) ally.stomach = [];
                                ally.stomach.push({ ...weakest, alive: true, inStomach: true });
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
                    const predators = this.party.filter(p => p !== ally && p.CPun > 0 && p.hunger > 50 && p.Feas > ally.Flee && p.size >= ally.size - 2);
                    if (predators.length > 0) {
                        const pred = predators.reduce((best, p) => p.hunger > best.hunger ? p : best, predators[0]);
                        if (!pred.stomach) pred.stomach = [];
                        pred.stomach.push({ ...ally, alive: true, inStomach: true, willingSacrifice: true });
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
                const target = enemies.reduce((w, e) => (e.CPun / e.MPun < w.CPun / w.MPun) ? e : w, enemies[0]);
                // Flying dodge check
                const allyIsRanged = ally.ranged || ally.antiflying;
                const targetDodge = target.flying && !allyIsRanged && !ally.ranged ? 0.5 : (target.swimming && !ally.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
                if (Math.random() < targetDodge) {
                    this.log.push({ text: `${target.name} dodges ${ally.name}'s attack!`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                const ar = this._AR(ally.Figh) * (ally.rage && ally.CPun < ally.MPun * 0.5 ? 1.5 : 1);
                const def = target.con || 10;
                let dmg = Math.max(1, Math.floor(ar - def * 0.3 + Math.random() * 6));
                if (ally.bloodsuck) { ally.CPun = Math.min(ally.MPun, ally.CPun + Math.floor(dmg * 0.3)); }
                target.CPun -= dmg;
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
            enemyTurn(enemy) {
                const targets = this.party.filter(p => p.CPun > 0);
                if (targets.length === 0) return;
                // Enemy targeting: prefer weakest, then tasty, then player
                let target = targets[0];
                let weakest = targets[0];
                for (const t of targets) {
                    if (t.CPun / t.MPun < weakest.CPun / weakest.MPun) weakest = t;
                }
                if (enemy.tasty && targets.some(t => t.tasty)) {
                    const tasty = targets.filter(t => t.tasty);
                    target = tasty[Math.floor(Math.random() * tasty.length)];
                } else {
                    target = weakest;
                }
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
                // May flee if low CPun
                const mayFlee = enemy.CPun > 0 && enemy.CPun < enemy.MPun * 0.3 && Math.random() < 0.3;
                if (mayFlee) {
	                    this.log.push({ text: `${enemy.name} flees in terror!`, type: 'combat' });
	                    enemy.disposition = this.DISPOSITION.NEUTRAL;
	                    enemy.CPun = 0;
	                    this._emitCombatAction('enemy_flee', enemy, null, 'fled');
	                    this.renderCreatures();
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                // Flying/swimming/floopy dodge check
                const isRanged = enemy.ranged || enemy.antiflying;
                const targetDodge = target.flying && !isRanged && !enemy.ranged ? 0.5 : (target.swimming && !enemy.antiswimming ? 0.3 : (target.floopy ? 0.3 : 0));
                if (Math.random() < targetDodge) {
                    this.log.push({ text: `${target.name} dodges ${enemy.name}'s attack! (${target.flying ? 'flying' : target.swimming ? 'swimming' : 'floopy'})`, type: 'combat' });
                    this.renderLog(); this.nextTurn(); return;
                }
                const ar = this._AR(enemy.Figh) * (enemy.rage && enemy.CPun < enemy.MPun * 0.5 ? 1.5 : 1);
                const def = target.con || 10;
                let dmg = Math.max(1, Math.floor(ar - def * 0.3 + Math.random() * 6));
                // Bloodsucker heals on hit
                if (enemy.bloodsuck) { enemy.CPun = Math.min(enemy.MPun, enemy.CPun + Math.floor(dmg * 0.3)); }
                target.CPun -= dmg;
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
                this.outsideActionOnTarget(action, target);
            },

            outsideActionForCreature(action, targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target) return;
                this.outsideActionOnTarget(action, target);
            },

            outsideActionOnTarget(action, target) {
                let result = '';
                switch (action) {
                    case 'fight': {
                        const ar = this._AR(this.player.Figh);
                        const def = target.con || 10;
                        const dmg = Math.max(1, Math.floor(ar - def * 0.3 + Math.random() * 6));
                        target.CPun -= dmg;
                        result = `You hit ${target.name} for ${dmg} punishment.`;
                        if (target.CPun <= 0) { target.CPun = 1; result += ' They are subdued.'; }
                        break;
                    }
                    case 'fuck': {
                        let charm = this._AR(this.player.Fuck + this.player.Flir);
                        if (this.settings.sameSpeciesBonus && target.species === this.player.species) {
                            charm += 5;
                        }
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
                        const oldPle = target.CPle;
                        if (charm > resist) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                            result = `You pleasure ${target.name}. Their arousal rises to ${target.CPle}/${target.MPle}.`;
                            if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                                target.willing = true;
                                target.orgasmed = true;
                                result += ' They orgasm and are completely devoted.';
                                if (this.settings.refractoryPeriod) {
                                    target.refractory = true;
                                    result += ' They need a moment to recover...';
                                }
                            }
                        } else {
                            result = `${target.name} is not in the mood.`;
                        }
                        break;
                    }
                    case 'feast': {
                        const canEatOutside = this.cheats.canEatAnything || (this.player.size >= target.size - 2 && this.player.Feas + 5 > target.Flee);
                        if (canEatOutside) {
                            if (!this.player.stomach) this.player.stomach = [];
                            this.player.stomach.push({ ...target, alive: true, inStomach: true });
                            target.CPun = 0;
                            result = `You swallow ${target.name} whole. They settle in your stomach.`;
                        } else {
                            result = `${target.name} is too large or strong to eat.`;
                        }
                        break;
                    }
                    case 'flirt': {
                        let charm = this._AR(this.player.Flir + (this.player.cha || 10) * 0.5);
                        if (this.settings.sameSpeciesBonus && target.species === this.player.species) {
                            charm += 3;
                        }
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
                        if (charm > resist) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.3));
                            target.charmed = (target.charmed || 0) + 1;
                            target.Figh = Math.max(1, (target.Figh || 10) - 1);
                            result = `You flirt with ${target.name}. Their guard lowers. Pleasure rises to ${target.CPle}/${target.MPle}.`;
                            if (target.charmed >= 3) {
                                result += ` ${target.name} is utterly charmed and becomes friendly!`;
                                target.disposition = this.DISPOSITION.FRIENDLY;
                                target.willing = true;
                            }
                        } else {
                            result = `${target.name} rebuffs your flirtation!`;
                        }
                        break;
                    }
                    case 'feed': {
                        const healAmount = Math.floor((this.player.Feed || 10) * 2);
                        target.CPun = Math.min(target.MPun, target.CPun + healAmount);
                        target.hunger = Math.max(0, (target.hunger || 0) - 25);
                        if (target.CPle < target.MPle * 0.5) {
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(healAmount * 0.5));
                        }
                        result = `You feed ${target.name}, restoring ${healAmount} punishment and sating their hunger.`;
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
                if (!this.combatState.active) this.renderExplorationActions();
            },

            recruitCreatureFromIndex(index) {
                const target = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY)[index];
                if (!target) return;
                this.recruitCreature(target);
            },

            recruitCreatureById(targetId) {
                const target = this.creatures.find(c => String(c.id || c.name) === String(targetId));
                if (!target || target.disposition !== this.DISPOSITION.FRIENDLY) return;
                this.recruitCreature(target);
            },

            recruitCreature(target) {
                if (this.party.length >= this.MAX_PARTY_SIZE) {
                    this.log.push({ text: 'Party is full! Cannot recruit ' + target.name, type: 'combat' });
                    this.renderLog();
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
                    if (this.player.level % 5 === 0) this._grantPerk();
                }
                this.renderParty();
            },
            _grantPerk() {
                const perks = [
                    { name: 'Iron Gut', stat: 'con', val: 2, desc: 'CON +2, stomach capacity +1' },
                    { name: 'Seductive Aura', stat: 'cha', val: 2, desc: 'CHA +2, seduce bonus' },
                    { name: 'Swift Strikes', stat: 'spd', val: 2, desc: 'SPD +2, priority bonus' },
                    { name: 'Voracious', stat: 'Feas', val: 3, desc: 'Feas +3, feast bonus' },
                    { name: 'Iron Will', stat: 'wis', val: 2, desc: 'WIS +2, resist seduction' },
                    { name: 'Predator', stat: 'str', val: 2, desc: 'STR +2, fight bonus' }
                ];
                const perk = perks[Math.floor(Math.random() * perks.length)];
                this.player.perks.push(perk);
                this.player[perk.stat] += perk.val;
                this.log.push({ text: 'Perk gained: ' + perk.name + '! ' + perk.desc, type: 'discovery' });
            },

            // ===== INVENTORY =====
            showInventory() {
                if (this.inventory.length === 0) {
                    document.getElementById('scene-description').innerHTML = `<h3>Inventory</h3><p style="color:var(--text-muted)">Empty.</p><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
                    return;
                }
                let html = `<h3>Inventory (${this.inventory.length}/${this.MAX_INVENTORY})</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px;">`;
                this.inventory.forEach(item => {
                    const def = this.ITEMS[item.name] || { icon: '?', desc: 'Unknown' };
                    const canUse = def.effect === 'heal' || def.effect === 'buff' || def.effect === 'damage';
                    html += `<div class="option-card" style="text-align:left;cursor:default;">`;
                    html += `<div style="font-size:24px">${def.icon}</div><div style="font-weight:600;color:var(--text-primary)">${item.name}</div>`;
                    html += `<div style="font-size:11px;color:var(--text-muted);margin:4px 0">${def.desc}</div><div style="display:flex;gap:8px;margin-top:8px">`;
                    if (canUse) html += `<button class="nav-btn" style="flex:1;padding:4px 8px;font-size:11px" onclick="App.useItem('\${item.id}')">Use</button>`;
                    html += `<button class="nav-btn" style="padding:4px 8px;font-size:11px;color:var(--accent-danger)" onclick="App.dropItem('\${item.id}')">Drop</button></div></div>`;
                });
                html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.showExplorationActions()">Back</button>`;
                document.getElementById('scene-description').innerHTML = html;
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
                const isTargetable = !isParty && this.targetSelection && this.canSelectCreatureTarget(unit);
                let actionButtons = '';
                if (!isParty && unit.CPun > 0) {
                    if (this.targetSelection) {
                        const disabled = isTargetable ? '' : ' disabled';
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;"><button class="action-btn primary" ${disabled} onclick="event.stopPropagation();App.executeActionOnTarget('${this.targetSelection.action}','${targetKey}')">Target</button></div>`;
                    } else if (!this.combatState.active) {
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;"><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('fight','${targetKey}')">⚔️</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('flirt','${targetKey}')">😘</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('fuck','${targetKey}')">🔥</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('feast','${targetKey}')">🍽️</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('feed','${targetKey}')">🍲</button>`;
                        if (unit.disposition === this.DISPOSITION.FRIENDLY) {
                            actionButtons += `<button class="action-btn primary" onclick="event.stopPropagation();App.recruitCreatureById('${targetKey}')">💕</button>`;
                        }
                        actionButtons += '</div>';
                    }
                }
                const click = isParty ? `App.toggleUnit(${index},'party')` : `App.toggleUnit(${index},'creature')`;
                const status = isParty ? (unit.name === this.player?.name ? 'You' : 'Ally') : (unit.disposition === this.DISPOSITION.ENEMY ? 'Hostile' : unit.disposition === this.DISPOSITION.FRIENDLY ? 'Friendly' : 'Neutral');
                return `<div class="mobile-unit-chip ${isTargetable ? 'targetable' : ''}" onclick="${click}">
                    <div class="mobile-chip-name"><span>${unit.icon}</span><span>${unit.name}</span></div>
                    <div class="mobile-chip-meta">${status} | ${unit.CPun}/${unit.MPun}</div>
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
                let actionButtons = '';
                if (isParty && !isPlayer) {
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('feed',${index})">🍲</button><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('flirt',${index})">😘</button><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('fuck',${index})">🔥</button><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('consume',${index})">🍽️</button><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('seduce',${index})">💕</button><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('inspect',${index})">👁️</button></div>`;
                }
                if (!isParty && unit.CPun > 0 && !isCorpse) {
                    const targetKey = String(unit.id || unit.name).replace(/'/g, "\\'");
                    if (this.targetSelection) {
                        const disabled = this.canSelectCreatureTarget(unit) ? '' : ' disabled';
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn primary" ${disabled} onclick="event.stopPropagation();App.executeActionOnTarget('${this.targetSelection.action}','${targetKey}')">Target</button></div>`;
                    } else if (!this.combatState.active) {
                        actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('fight','${targetKey}')">⚔️</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('flirt','${targetKey}')">😘</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('fuck','${targetKey}')">🔥</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('feast','${targetKey}')">🍽️</button><button class="action-btn" onclick="event.stopPropagation();App.outsideActionForCreature('feed','${targetKey}')">🍲</button>`;
                        if (unit.disposition === this.DISPOSITION.FRIENDLY) {
                            actionButtons += `<button class="action-btn primary" onclick="event.stopPropagation();App.recruitCreatureById('${targetKey}')">💕</button>`;
                        }
                        actionButtons += `</div>`;
                    }
                }
                let dispLabel = '';
                if (!isParty) {
                    if (isCorpse) dispLabel = 'Remains';
                    else if (unit.disposition === this.DISPOSITION.ENEMY) dispLabel = 'Hostile';
                    else if (unit.disposition === this.DISPOSITION.FRIENDLY) dispLabel = 'Friendly';
                    else if (unit.disposition === this.DISPOSITION.NEUTRAL) dispLabel = 'Neutral';
                }
	                const stomachCount = (unit.stomach?.length || 0) + (unit.womb?.length || 0) + (unit.balls?.length || 0);
	                return `<div class="unit-card ${isExpanded ? 'expanded' : ''}" style="${isCorpse ? 'opacity:0.58;' : ''}" onclick="App.toggleUnit(${index},'${type}')">
	                    <div class="unit-header">
	                        <span class="unit-icon">${isCorpse ? (unit.corpseIcon || unit.icon) : unit.icon}</span>
                        <div class="unit-info">
                            <div class="unit-name">${unit.name} ${dispLabel ? '<span style="font-size:10px;color:var(--text-muted)">[' + dispLabel + ']</span>' : ''}</div>
                            <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:${hpPercent}%;background:${hpPercent > 50 ? 'var(--accent-success)' : hpPercent > 25 ? 'var(--accent-warning)' : 'var(--accent-danger)'}"></div></div>
                            <div class="unit-stats">Pun:${unit.CPun}/${unit.MPun} Ple:${unit.CPle}/${unit.MPle} Lv:${unit.level}</div>
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
	                            ${stomachCount > 0 ? `<div style="grid-column:1/-1;color:var(--accent-warning)">Stomach: ${stomachCount} inside</div>` : ''}
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
                        this.party.splice(index, 1);
                        if (!this.player.stomach) this.player.stomach = [];
                        this.player.stomach.push({ ...ally, alive: true, inStomach: true });
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
                const cx = this.location.x, cy = this.location.y;
                let html = '';
                for (let dy = -2; dy <= 2; dy++) {
                    html += '<div style="display:flex;gap:4px;justify-content:center;">';
                    for (let dx = -2; dx <= 2; dx++) {
                        const tx = cx + dx, ty = cy + dy;
                        const isCenter = dx === 0 && dy === 0;
                        const isExplored = this.isExplored(tx, ty);
                        const tile = isExplored ? this.getTile(tx, ty) : null;
                        const biome = tile ? this.biomes[tile.biome] : null;
                        const hasCreatures = tile && tile.creatures && tile.creatures.length > 0;
                        const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
                        const isFar = Math.abs(dx) > 1 || Math.abs(dy) > 1;
                        let content = isExplored ? (biome ? biome.icon : '?') : (isAdjacent ? '□' : '·');
                        let classes = 'map-tile';
                        if (isCenter) classes += ' center';
                        else if (isExplored) classes += ' explored';
                        else if (isAdjacent) classes += ' moveable';
                        else classes += ' far';
                        if (hasCreatures) classes += ' has-enemy';
                        const onclick = isCenter ? '' : (isAdjacent ? `onclick="App.move(${dx},${dy})"` : '');
                        html += `<div class="${classes}" ${onclick}>${content}</div>`;
	                    }
	                    html += '</div>';
	                }
	                const containers = [document.getElementById('mini-map'), document.getElementById('mobile-mini-map')].filter(Boolean);
	                containers.forEach(container => { container.innerHTML = html; });
	                const mobileCoords = document.getElementById('mobile-coords');
	                if (mobileCoords) mobileCoords.textContent = `${cx}, ${cy}`;
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
                    if (actions) actions.innerHTML = `<button class="action-btn primary" onclick="combatAction('fight')">⚔️</button><button class="action-btn" onclick="combatAction('flirt')">😘</button><button class="action-btn" onclick="combatAction('feast')">🍽️</button><button class="action-btn" onclick="combatAction('fuck')">🔥</button><button class="action-btn" onclick="combatAction('feed')">🍲</button><button class="action-btn" onclick="combatAction('flee')">🏃</button>`;
                    if (mobileActions) mobileActions.style.display = 'block';
                    if (mobileCombat) mobileCombat.style.display = 'flex';
                    if (mobileExplore) mobileExplore.style.display = 'none';
                } else {
                    if (actions) actions.innerHTML = `<button class="action-btn" onclick="App.search()">🔍</button><button class="action-btn" onclick="App.rest()">🏕️</button><button class="action-btn" onclick="App.showInventory()">🎒</button>`;
                    if (mobileActions) mobileActions.style.display = 'block';
                    if (mobileCombat) mobileCombat.style.display = 'none';
                    if (mobileExplore) mobileExplore.style.display = 'flex';
	                }
	            },
	            renderExplorationActions() {
	                const actions = document.getElementById('scene-actions');
	                if (!actions || this.combatState.active) return;
	                const livingCreatures = this.creatures.filter(c => c.CPun > 0);
	                const allies = this.party.filter(p => p.CPun > 0 && p.name !== this.player?.name);
	                let html = `<button class="action-btn" onclick="App.search()">🔍</button><button class="action-btn" onclick="App.rest()">🏕️</button><button class="action-btn" onclick="App.showInventory()">🎒</button>`;
	                if (livingCreatures.length > 0 || allies.length > 0) {
	                    html += `<button class="action-btn" onclick="App.showInteractMenu()">💋 Interact</button>`;
	                }
	                actions.innerHTML = html;
	            },
	            showExplorationActions() {
	                const tile = this.getTile(this.location.x, this.location.y);
	                const biome = this.biomes[tile.biome];
	                this.updateScene(biome.name, tile.explored ? 'You are in the ' + biome.name + '. ' + tile.description : 'You stand at the edge of the unknown...', false);
	                this.renderExplorationActions();
	            },
	            renderLog() {
	                const container = document.getElementById('log-content');
	                const entries = this.log.slice(-20).reverse().map(e => {
	                    let cn = 'log-entry';
	                    if (e.type === 'combat') cn += ' combat';
	                    if (e.type === 'discovery') cn += ' discovery';
	                    return `<div class="${cn}">${e.text}</div>`;
	                }).join('');
	                if (container) container.innerHTML = entries;
	                const mobileLog = document.getElementById('mobile-log-summary');
	                if (mobileLog) {
	                    const latest = this.log[this.log.length - 1];
	                    mobileLog.textContent = latest ? latest.text : 'Welcome to FightFuckFeed.me Tactical Edition';
	                }
	            },
            clearLog() { this.log = []; this.renderLog(); },
            search() {
                const tile = this.getTile(this.location.x, this.location.y);
                const roll = Math.random();
                let result = '';
                if (roll < 0.3) {
                    const items = Object.keys(this.ITEMS);
                    const iname = items[Math.floor(Math.random() * items.length)];
                    const iid = 'item_' + Date.now();
                    this.inventory.push({ id: iid, name: iname });
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
                this.player.CPun = Math.min(this.player.MPun, this.player.CPun + 30);
                this.party.forEach(p => { p.CPun = Math.min(p.MPun, p.CPun + 30); });
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
                let html = `<div style="max-width:600px;margin:0 auto;padding:32px;"><h1 style="color:var(--accent-primary)">📊 ${p.name}</h1>
                    <p>Level ${p.level} ${p.species} | XP: ${p.xp}/${p.xpToNext}</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Punishment</h3><p>${p.CPun}/${p.MPun}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Pleasure</h3><p>${p.CPle}/${p.MPle}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Combat Stats</h3><p>Figh: ${p.Figh} | Feas: ${p.Feas} | Flir: ${p.Flir}<br>Fuck: ${p.Fuck} | Flee: ${p.Flee} | Feed: ${p.Feed}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Attributes</h3><p>STR: ${p.str} | CON: ${p.con} | SPD: ${p.int}<br>INT: ${p.int} | WIS: ${p.wis} | CHA: ${p.cha}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Body</h3><p>Size: ${p.size} | Appetite: ${p.appetite}<br>Parts: ${p.parts || 'none'} | Chest: ${p.chest || 'none'}<br>Body: ${p.bodyParts.map(b => this.BODY_PARTS[b]?.label || b).join(', ') || 'None'}</p></div>
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-md);"><h3>Perks</h3><p>${p.perks.map(pk => pk.name).join(', ') || 'None'}</p></div>
                    </div>
                    <button class="nav-btn" style="margin-top:24px" onclick="returnToGame()">Close</button></div>`;
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
                    boneCrushing: this.settings.boneCrushing,
                    unwillingWarnings: this.settings.unwillingWarnings,
                    hardcore: this.settings.hardcore,
                }));
                this.updateTierButtons();
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
                document.getElementById('toggle-bones').checked = App.settings.boneCrushing;
                document.getElementById('toggle-warn').checked = App.settings.unwillingWarnings;
                document.getElementById('toggle-hardcore').checked = App.settings.hardcore;
                this.updateTierButtons();
                this.updateCheatButtons();
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
                    this.log = (loaded.log || []).map(t => ({ text: t, type: 'discovery' }));
                    this.creatures = [];
                    this.inventory = loaded.inventory || [];
                    this.activeSlot = slotName;
                    this.worldMap = new Map();
                    this.exploredTiles = new Set();
                    this.superPatchMap = new Map();
                    if (loaded.worldMap) {
                        for (const [key, tile] of Object.entries(loaded.worldMap)) {
                            this.worldMap.set(key, tile);
                            if (tile.explored) this.exploredTiles.add(key);
                        }
                    }
                    this._rebuildSuperPatchMap();
                    // Set currentBiome from player's current location
                    const currentTile = this.getTile(this.location.x, this.location.y);
                    this.currentBiome = currentTile.biome;
                    this.showScreen('game');
                    this.renderMap(); this.renderParty(); this.renderLog();
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

