
        // =============================================
        // FIGHT FUCK FEED - MECHANICS OVERHAUL
        // =============================================

        const App = {
            // === CONSTANTS ===
            GAME_MODE: { NORMAL: 'normal', COMBAT: 'combat' },
            DISPOSITION: { ENEMY: 'enemy', NEUTRAL: 'neutral', FRIENDLY: 'friendly', PARTY: 'party', QUEST_GIVER: 'quest_giver', MERCHANT: 'merchant' },
            ACTION: { FIGHT: 'fight', FUCK: 'fuck', FEAST: 'feast', FLEE: 'flee', SYNC_FIGHT: 'sync_fight', SYNC_FUCK: 'sync_fuck', SYNC_FEED: 'sync_feed', PROTECT: 'protect', RETREAT_COVER: 'retreat_cover' },
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
            XP_REWARDS: { defeatEnemy: 50, consumeEnemy: 75, seduceEnemy: 60, discoverLandmark: 25, consumeAlly: 40 },

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
            currentBiome: 'forest',
            activeSlot: 'slot1',
            settings: {
                powerDynamics: false, endoMode: false, slowDigestion: false,
                fatalVore: true, chewing: false, allTheWayThrough: false,
                hardcore: false, scat: false, watersports: false,
                boneCrushing: false, unwillingWarnings: false,
                statAbsorption: true, refractoryPeriod: false,
                sameSpeciesBonus: true, fluidEnabled: true
            },

            combatState: {
                active: false, turnQueue: [], currentTurn: 0, round: 1,
                syncActions: [], processing: false
            },

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
                grove: { name: 'Grove', icon: '🌳', color: '#3a6b2a', bgColor: '#2a4a1a', danger: 1, encounterChance: 0.08, encounterTable: [
                    { id: 'bunny', weight: 50 }, { id: 'mouse', weight: 20 }, { id: 'sheep', weight: 15 },
                    { id: 'deer', weight: 10 }, { id: 'human', weight: 5 }
                ], descriptions: ['A peaceful grove of young trees.','Wildflowers carpet the ground.','A gentle stream bubbles nearby.','Birdsong fills the air.','Sunlight dapples through leaves.'] },
                forest: { name: 'Forest', icon: '🌲', color: '#2d5016', bgColor: '#1a3310', danger: 3, encounterChance: 0.15, encounterTable: [
                    { id: 'bunny', weight: 25 }, { id: 'deer', weight: 20 }, { id: 'wolf', weight: 15 },
                    { id: 'slime', weight: 15 }, { id: 'harpy', weight: 15 }, { id: 'bear', weight: 10 }
                ], descriptions: ['Ancient trees tower overhead.','The forest is dense and humid.','Sunlight filters through leaves.','A clearing opens before you.','Fallen logs and twisted roots make travel slow.'] },
                swamp: { name: 'Swamp', icon: '🐊', color: '#3d4a1e', bgColor: '#2a3310', danger: 4, encounterChance: 0.20, encounterTable: [
                    { id: 'frog', weight: 25 }, { id: 'shroom', weight: 20 }, { id: 'slime', weight: 20 },
                    { id: 'naga', weight: 15 }, { id: 'plant', weight: 20 }
                ], descriptions: ['Murky waters stretch through twisted cypress trees.','The ground squelches beneath your feet.','Fireflies drift through the fog.','A sunken log bridges a channel.','Gnarled roots form natural archways.'] },
                plains: { name: 'Plains', icon: '🌾', color: '#6b5b1e', bgColor: '#4a4010', danger: 2, encounterChance: 0.12, encounterTable: [
                    { id: 'bunny', weight: 25 }, { id: 'deer', weight: 20 }, { id: 'human', weight: 15 },
                    { id: 'horse', weight: 15 }, { id: 'wolf', weight: 15 }, { id: 'tiger', weight: 10 }
                ], descriptions: ['Tall grasses sway in the warm breeze.','Open grasslands stretch to the horizon.','The plains are peaceful.','A stream cuts through the prairie.','Wind rustles the grass in waves.'] },
                cave: { name: 'Cave', icon: '🦇', color: '#2a2a3a', bgColor: '#1a1a2e', danger: 5, encounterChance: 0.25, encounterTable: [
                    { id: 'bat', weight: 25 }, { id: 'goblin', weight: 20 }, { id: 'rat', weight: 20 },
                    { id: 'slime', weight: 20 }, { id: 'naga', weight: 10 }, { id: 'dragon', weight: 5 }
                ], descriptions: ['Stalactites hang like teeth from the ceiling.','The cave opens into a vast chamber.','A narrow passage forces you to squeeze through.','An underground river rushes through.','Crystal formations glitter in the darkness.'] },
                jungle: { name: 'Jungle', icon: '🌿', color: '#1a5c1a', bgColor: '#0f3d0f', danger: 4, encounterChance: 0.20, encounterTable: [
                    { id: 'frog', weight: 20 }, { id: 'plant', weight: 20 }, { id: 'harpy', weight: 20 },
                    { id: 'tiger', weight: 20 }, { id: 'naga', weight: 15 }, { id: 'slime', weight: 5 }
                ], descriptions: ['Vines hang like curtains.','The jungle is alive with sound.','Humidity presses down like a weight.','A waterfall crashes into a hidden pool.','Thick vegetation forces you to hack forward.'] },
                dungeon: { name: 'Dungeon', icon: '⛓️', color: '#3a2a3a', bgColor: '#1e0a1e', danger: 5, encounterChance: 0.30, encounterTable: [
                    { id: 'rat', weight: 25 }, { id: 'goblin', weight: 25 }, { id: 'skeleton', weight: 20 },
                    { id: 'spider', weight: 20 }, { id: 'drow', weight: 10 }
                ], descriptions: ['Stone corridors stretch endlessly.','Iron-barred cells line the walls.','The air is stale and cold.','A brazier smolders with dying coals.','Chains rattle in the darkness.'] },
                manor: { name: 'Manor', icon: '🏰', color: '#4a3a2a', bgColor: '#2e2010', danger: 3, encounterChance: 0.15, encounterTable: [
                    { id: 'human', weight: 30 }, { id: 'cat', weight: 25 }, { id: 'rat', weight: 20 },
                    { id: 'mouse', weight: 15 }, { id: 'spider', weight: 10 }
                ], descriptions: ['Grand hallways echo with emptiness.','Antique furniture gathers dust.','A portrait gallery watches your passage.','The ballroom is frozen in decay.','Servants quarters hide secrets.'] },
                beach: { name: 'Beach', icon: '🏖️', color: '#1a4a5a', bgColor: '#0f2a3a', danger: 2, encounterChance: 0.12, encounterTable: [
                    { id: 'crab', weight: 30 }, { id: 'fish', weight: 25 }, { id: 'frog', weight: 20 },
                    { id: 'otter', weight: 15 }, { id: 'siren', weight: 10 }
                ], descriptions: ['Waves lap against white sand.','Palm trees sway overhead.','Seashells scatter the shore.','A tide pool teems with life.','A distant ship lies wrecked on the reef.'] },
                road: { name: 'Road', icon: '🛤️', color: '#5a5a2a', bgColor: '#3a3a10', danger: 2, encounterChance: 0.10, encounterTable: [
                    { id: 'human', weight: 25 }, { id: 'mouse', weight: 20 }, { id: 'rat', weight: 20 },
                    { id: 'goblin', weight: 20 }, { id: 'wolf', weight: 10 }, { id: 'bandit', weight: 5 }
                ], descriptions: ['A dirt path stretches between biomes.','Wagon ruts mark the earth.','A weathered signpost points onward.','A campfire ring marks a resting spot.','The road is well-traveled.'] },
                cliff: { name: 'Cliff', icon: '🏔️', color: '#5a5a5a', bgColor: '#3a3a3a', danger: 3, encounterChance: 0.15, encounterTable: [
                    { id: 'goat', weight: 25 }, { id: 'bat', weight: 20 }, { id: 'eagle', weight: 20 },
                    { id: 'wolf', weight: 20 }, { id: 'harpy', weight: 15 }
                ], descriptions: ['Rocky outcrops offer treacherous footing.','The wind howls at your back.','A narrow ledge skirts a drop.','A goat path winds upward.','The view from the edge is dizzying.'] },
                water: { name: 'Water', icon: '💧', color: '#1a3a5a', bgColor: '#0f1e3a', danger: 3, encounterChance: 0.20, encounterTable: [
                    { id: 'fish', weight: 25 }, { id: 'frog', weight: 25 }, { id: 'otter', weight: 20 },
                    { id: 'slime', weight: 20 }, { id: 'naga', weight: 10 }
                ], descriptions: ['The river rushes past.','A lake reflects the sky like glass.','Water cascades over smooth rocks.','The current pulls at your feet.','A hidden spring bubbles from the earth.'] },
                bridge: { name: 'Bridge', icon: '🌉', color: '#5a4a2a', bgColor: '#3a2e10', danger: 4, encounterChance: 0.15, encounterTable: [
                    { id: 'frog', weight: 25 }, { id: 'human', weight: 25 }, { id: 'goblin', weight: 20 },
                    { id: 'bandit', weight: 20 }, { id: 'troll', weight: 10 }
                ], descriptions: ['A wooden span creaks beneath you.','Rope bridges sway in the wind.','Stone arches rise from the water.','A toll booth stands abandoned.','The bridge offers a commanding view.'] },
                farm: { name: 'Farm', icon: '🚜', color: '#5a5a2a', bgColor: '#3a3a10', danger: 1, encounterChance: 0.12, encounterTable: [
                    { id: 'cow', weight: 30 }, { id: 'sheep', weight: 25 }, { id: 'pig', weight: 20 },
                    { id: 'horse', weight: 15 }, { id: 'human', weight: 10 }
                ], descriptions: ['Barns loom in the golden fields.','A windmill turns lazily.','Plowed earth stretches to the horizon.','Chicken coops clatter with activity.','A silo casts a long shadow.'] },
                indoors: { name: 'Indoors', icon: '🏠', color: '#4a3a2a', bgColor: '#2e2010', danger: 2, encounterChance: 0.10, encounterTable: [
                    { id: 'human', weight: 25 }, { id: 'cat', weight: 25 }, { id: 'mouse', weight: 25 },
                    { id: 'rat', weight: 15 }, { id: 'spider', weight: 10 }
                ], descriptions: ['Walls enclose the space.','A hearth glows with dying embers.','Furniture is arranged cozily.','The ceiling is low and beamed.','A door leads to other rooms.'] },
                entrance: { name: 'Entrance', icon: '🚪', color: '#3a3a3a', bgColor: '#1e1e1e', danger: 4, encounterChance: 0.15, encounterTable: [
                    { id: 'human', weight: 25 }, { id: 'goblin', weight: 25 }, { id: 'bat', weight: 20 },
                    { id: 'wolf', weight: 20 }, { id: 'skeleton', weight: 10 }
                ], descriptions: ['A cave mouth yawns in darkness.','A dungeon door stands reinforced.','A portal shimmers with energy.','A gatehouse guards the passage.','An ancient archway frames the way.'] }
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
                const body = document.getElementById('body-' + id);
                const arrow = document.getElementById('arrow-' + id);
                if (!body || !arrow) return;
                const isOpen = body.style.display !== 'none';
                body.style.display = isOpen ? 'none' : 'block';
                arrow.textContent = isOpen ? '▶' : '▼';
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
                this.party = [this.player];
                this.creatures = [];
                this.location = { x: 0, y: 0 };
                this.log = [{ text: 'Welcome to the world, ' + name + '.', type: 'discovery' }];
                this.worldMap = new Map();
                this.exploredTiles = new Set();
                this.currentBiome = 'forest';
                this.inventory = [];
                this.mode = this.GAME_MODE.NORMAL;
                this.combatState = { active: false, turnQueue: [], currentTurn: 0, round: 1, syncActions: [], processing: false };
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

            // ===== MAP SYSTEM =====
            getTile(x, y) {
                const key = `${x},${y}`;
                if (this.worldMap.has(key)) return this.worldMap.get(key);
                // Starting tile (0,0) is always the Grove (safe zone)
                let biomeId;
                if (x === 0 && y === 0) {
                    biomeId = 'grove';
                } else {
                    const seed = Math.abs(x * 374761393 + y * 668265263) % 100;
                    const biomeIds = Object.keys(this.biomes);
                    biomeId = biomeIds[seed % biomeIds.length];
                }
                const biome = this.biomes[biomeId];
                const tile = { x, y, biome: biomeId, explored: false, description: '', hasLandmark: false, landmarkName: '', hostile: false, creatures: [] };
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
                    oldTile.creatures = [...this.creatures];
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
                    this.creatures = tile.creatures || [];
                    const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                    if (enemies.length > 0) {
                        this.log.push({ text: `You encounter ${enemies.map(e => e.name).join(', ')}!`, type: 'combat' });
                        this.startCombat(enemies);
                    }
                } else {
                    // First visit: clear and possibly spawn
                    this.creatures = [];
                    if (Math.random() < biome.encounterChance) { this.spawnEncounter(tile); }
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
            spawnEncounter(tile, isBoss = false) {
                const biome = this.biomes[tile.biome];
                // Enemy count: 1 at low levels, up to 2 at higher levels, 3 rarely
                const count = isBoss ? 1 : Math.max(1, Math.floor(Math.random() * Math.min(3, Math.max(1, this.player.level - 1))) + 1);
                const enemies = [];
                for (let i = 0; i < count; i++) {
                    const pool = biome.encounterTable;
                    // Weighted species selection based on biome danger + player level
                    let sid = this._weightedPick(pool);
                    // Filter by difficulty relative to player level (danger 1-5 biome scale)
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
                    // Enemy level: at or below player level, never above
                    const lvl = isBoss ? Math.max(1, this.player.level) : Math.max(1, this.player.level - 1 + Math.floor(Math.random() * 2));
                    const base = this._getSpeciesBaseStats(sid);
                    // Enemy stats: weaker than player at same level (0.6x to 0.9x multiplier)
                    const statMult = isBoss ? 1.0 : (0.6 + Math.random() * 0.3);
                    // HP: weaker enemies
                    const hpMult = isBoss ? 1.2 : (0.5 + Math.random() * 0.3);
                    const enemy = {
                        id: 'enemy_' + Date.now() + '_' + i, name: sp.name + (count > 1 ? ' ' + (i + 1) : ''),
                        species: sid, icon: sp.icon, gender: Math.random() < 0.5 ? 'female' : 'male',
                        identity: Math.random() < 0.5 ? 'female' : 'male', parts: Math.random() < 0.3 ? 'cock' : 'clit', chest: Math.random() < 0.5 ? 'tits' : 'pecs',
                        bodyParts: this.SPECIES_DEFAULT_PARTS[sid] || [], size: Math.floor(Math.random() * 4) + 2, appetite: Math.floor(Math.random() * 4) + 2,
                        level: lvl, MPun: Math.floor(base.MPun * hpMult * (0.7 + lvl * 0.1)), CPun: Math.floor(base.MPun * hpMult * (0.7 + lvl * 0.1)),
                        MPle: base.MPle, CPle: Math.floor(base.MPle * 0.3),
                        Figh: Math.floor(base.Figh * statMult), Feas: Math.floor(base.Feas * statMult),
                        Flir: Math.floor(base.Flir * statMult), Fuck: Math.floor(base.Fuck * statMult),
                        Flee: Math.floor(base.Flee * statMult), Feed: Math.floor(base.Feed * statMult),
                        hunger: Math.floor((base.hunger || 40) * 0.7), str: Math.floor(base.str * statMult), con: Math.floor(base.con * statMult), spd: Math.floor(base.spd * statMult),
                        int: Math.floor(base.int * statMult), wis: Math.floor(base.wis * statMult), cha: Math.floor(base.cha * statMult),
                        tags: [sp.name], stomach: [], womb: [], balls: [], cum: 0, status: {}, disposition: this.DISPOSITION.ENEMY,
                        expanded: false, hero: false, ally: false, mc: false, obedient: false, willing: Math.random() < 0.3,
                        ...this.SPECIES_ABILITIES[sid] || {}
                    };
                    enemies.push(enemy);
                }
                this.creatures = enemies;
                const ctx = { species: enemies[0].species, mood: 'hostile', voreEnabled: true, explicit: true };
                const biomeText = CONTENT.biomeIntro(this.currentBiome || 'forest', ctx);
                const encounterText = this.creatures.length > 0 ? (CONTENT.encounter(enemies[0].species, ctx) || `Encountered ${enemies[0].name}!`) : '';
                this.updateScene(`${biome.name} - ${tile.hasLandmark ? tile.landmarkName : 'Wilderness'}`, biomeText + '\n\n' + encounterText, true);
                this.log.push({ text: encounterText, type: 'combat' });
                if (isBoss) { this.log.push({ text: `A powerful guardian guards the ${tile.landmarkName}!`, type: 'combat' }); }
                this.startCombat(enemies);
            },

            // ===== COMBAT SYSTEM =====
            startCombat(enemies) {
                this.mode = this.GAME_MODE.COMBAT;
                this.combatState.active = true;
                this.combatState.round = 1;
                this.combatState.syncActions = [];
                const allCombatants = [...this.party, ...enemies];
                this.combatState.turnQueue = allCombatants
                    .filter(c => c.CPun > 0)
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
                if (!currentUnit || currentUnit.CPun <= 0) { this.nextTurn(); return; }
                // Refractory period: skip turn if recovering from orgasm
                if (currentUnit.refractory) {
                    currentUnit.refractory = false;
                    this.log.push({ text: `${currentUnit.name} is recovering from orgasm and skips their turn.`, type: 'combat' });
                    this.renderLog();
                    this.nextTurn();
                    return;
                }
                // Check sync actions - if this unit is part of a sync action that resolves now, handle it
                const activeSync = this.combatState.syncActions.find(s => !s.resolved && s.participants.includes(currentUnit));
                if (activeSync) {
                    this._resolveSyncAction(activeSync);
                    return;
                }
                // Check victory/defeat
                const livingEnemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                const livingParty = this.party.filter(p => p.CPun > 0);
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
                if (isParty && currentUnit.name === this.player.name) {
                    this.showPlayerActions();
                } else if (isParty) {
                    this.allyTurn(currentUnit);
                } else {
                    this.enemyTurn(currentUnit);
                }
            },

            _newRound() {
                const living = [...this.party.filter(p => p.CPun > 0), ...this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0)];
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
            _processDigestion() {
                const all = [...this.party, ...this.creatures];
                for (const unit of all) {
                    for (const prey of (unit.stomach || [])) {
                        if (!prey.alive) continue;
                        const dmg = this.settings.slowDigestion ? 2 : 5;
                        prey.CPun -= dmg;
                        // Stat absorption: attacker gains from prey
                        if (this.settings.statAbsorption && prey.stats) {
                            const absorb = Math.floor(dmg * 0.1);
                            unit.str = (unit.str || 10) + absorb;
                            unit.con = (unit.con || 10) + absorb;
                            unit.Figh = (unit.Figh || 10) + absorb;
                        }
                        if (prey.CPun <= 0) {
                            if (this.settings.endoMode) {
                                prey.CPun = 1;
                                prey.alive = true;
                            } else {
                                prey.alive = false;
                                this.log.push({ text: `${prey.name} is digested inside ${unit.name}`, type: 'combat' });
                            }
                        }
                    }
                    for (const prey of (unit.womb || [])) {
                        if (!prey.alive) continue;
                        const dmg = this.settings.slowDigestion ? 1 : 3;
                        prey.CPun -= dmg;
                        if (this.settings.statAbsorption && prey.stats) {
                            const absorb = Math.floor(dmg * 0.1);
                            unit.cha = (unit.cha || 10) + absorb;
                            unit.Flir = (unit.Flir || 10) + absorb;
                            unit.Fuck = (unit.Fuck || 10) + absorb;
                        }
                        if (prey.CPun <= 0) {
                            if (this.settings.endoMode) { prey.CPun = 1; prey.alive = true; }
                            else { prey.alive = false; this.log.push({ text: `${prey.name} perishes in ${unit.name}'s womb`, type: 'combat' }); }
                        }
                    }
                    for (const prey of (unit.balls || [])) {
                        if (!prey.alive) continue;
                        const dmg = this.settings.slowDigestion ? 1 : 3;
                        prey.CPun -= dmg;
                        if (this.settings.statAbsorption && prey.stats) {
                            const absorb = Math.floor(dmg * 0.1);
                            unit.Feas = (unit.Feas || 10) + absorb;
                            unit.Fuck = (unit.Fuck || 10) + absorb;
                        }
                        if (prey.CPun <= 0) {
                            if (this.settings.endoMode) { prey.CPun = 1; prey.alive = true; }
                            else { prey.alive = false; this.log.push({ text: `${prey.name} dissolves in ${unit.name}'s balls`, type: 'combat' }); }
                        }
                    }
                }
            },

            showPlayerActions() {
                const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                const friendlies = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY && c.CPun > 0);
                const allies = this.party.filter(p => p.CPun > 0 && p.name !== this.player.name);
                let html = '';
                html += `<button class="action-btn" style="background:var(--accent-warning);color:var(--bg-primary);" onclick="App.instantWin()">⚡ Instant Win</button>`;
                if (enemies.length > 0) {
                    html += `<button class="action-btn primary" onclick="App.selectTarget('fight')">⚔️ Fight</button>`;
                    html += `<button class="action-btn" onclick="App.selectTarget('fuck')">🔥 Fuck</button>`;
                    html += `<button class="action-btn" onclick="App.selectTarget('feast')">🍽️ Feast</button>`;
                    html += `<button class="action-btn" onclick="App.showSyncMenu()">👥 Sync</button>`;
                }
                if (allies.length > 0 || friendlies.length > 0) {
                    html += `<button class="action-btn" onclick="App.showInteractMenu()">💋 Interact</button>`;
                }
                html += `<button class="action-btn" onclick="App.attemptFlee()">🏃 Flee</button>`;
                document.getElementById('scene-actions').innerHTML = html;
            },

            // ===== ACTION TARGETING =====
            selectTarget(action) {
                const targets = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0);
                let html = `<h3>Select target to ${action}</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">`;
                targets.forEach((e, i) => {
                    html += `<button class="option-card" onclick="App.executeAction('${action}', ${i})">`;
                    html += `<div style="font-size:32px">${e.icon}</div>`;
                    html += `<div style="color:var(--text-primary);font-weight:600">${e.name}</div>`;
                    html += `<div style="color:var(--text-muted);font-size:12px">HP: ${e.CPun}/${e.MPun}</div>`;
                    html += `</button>`;
                });
                html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.processTurn()">Cancel</button>`;
                document.getElementById('scene-description').innerHTML = html;
            },

            executeAction(action, creatureIndex) {
                this.combatState.processing = true;
                const target = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY && c.CPun > 0)[creatureIndex];
                if (!target || target.CPun <= 0) { this.combatState.processing = false; this.nextTurn(); return; }
                const player = this.player;
                let result = '';
                switch (action) {
                    case 'fight': {
                        const ar = this._AR(player.Figh);
                        const def = target.con || 10;
                        const dmg = Math.max(1, Math.floor(ar - def * 0.3 + Math.random() * 6));
                        target.CPun -= dmg;
                        result = `You hit ${target.name} for ${dmg} punishment!`;
                        if (target.CPun <= 0) {
                            result += ` ${target.name} collapses!`;
                            if (this.settings.endoMode) { target.CPun = 1; target.disposition = this.DISPOSITION.FRIENDLY; }
                        }
                        break;
                    }
                    case 'fuck': {
                        let charm = this._AR(player.Fuck + player.Flir);
                        // Same-species attraction bonus
                        if (this.settings.sameSpeciesBonus && target.species === player.species) {
                            charm += 5;
                        }
                        const resist = (target.wis || 10) + (target.CPle / target.MPle * 10);
                        if (charm > resist) {
                            const oldPle = target.CPle;
                            target.CPle = Math.min(target.MPle, target.CPle + Math.floor(charm * 0.5));
                            result = `You seduce ${target.name}! Pleasure rises to ${target.CPle}/${target.MPle}.`;
                            // Orgasm threshold at 80%
                            if (target.CPle >= target.MPle * 0.8 && oldPle < target.MPle * 0.8) {
                                result += ` ${target.name} orgasms, becoming dazed and submissive!`;
                                target.disposition = this.DISPOSITION.FRIENDLY;
                                target.willing = true;
                                target.orgasmed = true;
                                // Refractory period: skip next turn if enabled
                                if (this.settings.refractoryPeriod) {
                                    target.refractory = true;
                                    result += ` They need a moment to recover...`;
                                }
                            }
                        } else {
                            result = `${target.name} resists your advances!`;
                        }
                        break;
                    }
                    case 'feast': {
                        const canEat = this.cheats.canEatAnything || target.CPun <= target.MPun * 0.3 || (player.Feas > target.Flee && player.size >= target.size - 2);
                        if (canEat) {
                            const prey = { ...target, alive: true, inStomach: true };
                            if (!player.stomach) player.stomach = [];
                            player.stomach.push(prey);
                            target.CPun = 0;
                            target.CPle = 0;
                            player.CPun = Math.min(player.MPun, player.CPun + 20);
                            player.Feas += 1;
                            result = `You devour ${target.name}! They settle in your stomach.`;
                        } else {
                            result = `${target.name} is too strong or too big to consume!`;
                        }
                        break;
                    }
                }
                this.log.push({ text: result, type: 'combat' });
                this.renderLog();
                this.renderCreatures();
                this.renderParty();
                this.combatState.processing = false;
                this.nextTurn();
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
                    case 'sync_fight': {
                        const totalStr = sync.participants.reduce((sum, p) => sum + (p.Figh || 0), 0);
                        const def = sync.target.con || 10;
                        const dmg = Math.max(1, Math.floor(totalStr - def * 0.5 + Math.random() * 10));
                        sync.target.CPun -= dmg;
                        result = `${sync.participants.map(p => p.name).join(' and ')} gang up on ${sync.target.name}, dealing ${dmg} punishment!`;
                        if (sync.target.CPun <= 0) {
                            result += ` ${sync.target.name} is overwhelmed and collapses!`;
                            if (this.settings.endoMode) { sync.target.CPun = 1; sync.target.disposition = this.DISPOSITION.FRIENDLY; }
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
                            result = `${sync.participants.map(p => p.name).join(' and ')} force ${sync.target.name} into ${eater.name}'s stomach!`;
                        } else {
                            result = `${sync.target.name} is too strong to be force-fed!`;
                        }
                        break;
                    }
                }
                this.log.push({ text: result, type: 'combat' });
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
                                this.log.push({ text: `${ally.name} is starving and devours ${weakest.name} whole! Loyalty restored.`, type: 'combat' });
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
                                this.log.push({ text: `${target.name} submits to ${ally.name}!`, type: 'combat' });
                            }
                            this.renderLog(); this.renderCreatures(); this.nextTurn(); return;
                        }
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
                    if (this.settings.endoMode) { target.CPun = 1; target.disposition = this.DISPOSITION.FRIENDLY; }
                }
                this.log.push({ text: result, type: 'combat' });
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
                            // Softcore: player is knocked out for this combat, party can continue
                            // Player will revive at 1 HP when combat ends
                            target.CPun = 1;
                            target.CPle = 0;
                            this.log.push({ text: 'You have been knocked out! Your party must finish the fight...', type: 'combat' });
                            this.renderLog(); this.renderParty();
                            // If no other living party members, defeat
                            const livingAllies = this.party.filter(p => p.CPun > 0 && p.name !== this.player.name);
                            if (livingAllies.length === 0) {
                                this.log.push({ text: 'Your party has been wiped out!', type: 'combat' });
                                this.renderLog();
                                setTimeout(() => { App.showScreen('menu'); }, 2000);
                                this.combatState.active = false;
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


            endCombat(victory) {
                this.mode = this.GAME_MODE.NORMAL;
                this.combatState.active = false;
                this.combatState.processing = false;
                this.combatState.turnQueue = [];
                this.combatState.currentTurn = 0;
                this.combatState.syncActions = [];
                if (victory) {
                    this.log.push({ text: 'Victory! Enemies defeated or subdued.', type: 'discovery' });
                    const texts = ['The battlefield falls silent.','Your enemies lie defeated.','Another victory, another feast.','You emerge from the chaos unscathed.'];
                    this.updateScene('Victory', texts[Math.floor(Math.random() * texts.length)], false);
                    this.gainXP(50);
                    // Convert friendly enemies to neutral/friendly for potential recruitment
                    for (const c of this.creatures) {
                        if (c.disposition === this.DISPOSITION.FRIENDLY && c.CPun > 0) {
                            this.log.push({ text: `${c.name} looks at you with submissive eyes...`, type: 'discovery' });
                        }
                    }
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
                html += `<button class="action-btn" onclick="App.outsideAction('fuck', '${type}', ${index})">🔥 Fuck</button>`;
                html += `<button class="action-btn" onclick="App.outsideAction('feast', '${type}', ${index})">🍽️ Feast</button>`;
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
                        if (this.cheats.canEatAnything || (this.player.size >= target.size - 2 && this.player.Feas > target.Flee)) {
                            if (!this.player.stomach) this.player.stomach = [];
                            this.player.stomach.push({ ...target, alive: true, inStomach: true });
                            target.CPun = 0;
                            result = `You swallow ${target.name} whole. They settle in your stomach.`;
                        } else {
                            result = `${target.name} is too large or strong to eat.`;
                        }
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
                this.showCreatureInteract(type, index);
            },

            recruitCreatureFromIndex(index) {
                const target = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY)[index];
                if (!target) return;
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
                    this.endCombat(true);
                } else {
                    this.log.push({ text: 'Flee failed! ' + enemy.name + ' intercepts you!', type: 'combat' });
                    this.renderLog();
                    this.nextTurn();
                }
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
                if (!container) return;
                container.innerHTML = this.party.map((unit, i) => this.renderUnitCard(unit, i, 'party')).join('');
            },
            renderCreatures() {
                const container = document.getElementById('enemies-content');
                if (!container) return;
                const title = document.getElementById('enemies-title');
                if (title) {
                    const enemies = this.creatures.filter(c => c.disposition === this.DISPOSITION.ENEMY);
                    const friendlies = this.creatures.filter(c => c.disposition !== this.DISPOSITION.ENEMY);
                    if (enemies.length > 0) title.textContent = 'Enemies';
                    else if (friendlies.length > 0) title.textContent = 'Creatures';
                    else title.textContent = 'Area';
                }
                container.innerHTML = this.creatures.map((unit, i) => this.renderUnitCard(unit, i, 'creature')).join('');
            },
            renderUnitCard(unit, index, type) {
                const hpPercent = Math.round((unit.CPun / unit.MPun) * 100);
                const plePercent = Math.round((unit.CPle / unit.MPle) * 100);
                const isExpanded = unit.expanded || false;
                const isParty = type === 'party';
                const isPlayer = isParty && unit.name === this.player?.name;
                const isAlly = isParty && !isPlayer;
                let actionButtons = '';
                if (isParty && !isPlayer) {
                    actionButtons = `<div class="unit-actions" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;"><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('consume',${index})">🍽️</button><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('fuck',${index})">🔥</button><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('seduce',${index})">💕</button><button class="action-btn" onclick="event.stopPropagation();App.executeAllyAction('inspect',${index})">👁️</button></div>`;
                }
                let dispLabel = '';
                if (!isParty) {
                    if (unit.disposition === this.DISPOSITION.ENEMY) dispLabel = 'Hostile';
                    else if (unit.disposition === this.DISPOSITION.FRIENDLY) dispLabel = 'Friendly';
                    else if (unit.disposition === this.DISPOSITION.NEUTRAL) dispLabel = 'Neutral';
                }
                const stomachCount = (unit.stomach?.length || 0) + (unit.womb?.length || 0) + (unit.balls?.length || 0);
                return `<div class="unit-card ${isExpanded ? 'expanded' : ''}" onclick="App.toggleUnit(${index},'${type}')">
                    <div class="unit-header">
                        <span class="unit-icon">${unit.icon}</span>
                        <div class="unit-info">
                            <div class="unit-name">${unit.name} ${dispLabel ? '<span style="font-size:10px;color:var(--text-muted)">[' + dispLabel + ']</span>' : ''}</div>
                            <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:${hpPercent}%;background:${hpPercent > 50 ? 'var(--accent-success)' : hpPercent > 25 ? 'var(--accent-warning)' : 'var(--accent-danger)'}"></div></div>
                            <div class="unit-stats">Pun:${unit.CPun}/${unit.MPun} Ple:${unit.CPle}/${unit.MPle} Lv:${unit.level}</div>
                        </div>
                    </div>
                    ${isExpanded ? `<div class="unit-details">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
                            <div><span style="color:var(--text-muted)">Figh:</span> ${unit.Figh}</div><div><span style="color:var(--text-muted)">Feas:</span> ${unit.Feas}</div>
                            <div><span style="color:var(--text-muted)">Flir:</span> ${unit.Flir}</div><div><span style="color:var(--text-muted)">Fuck:</span> ${unit.Fuck}</div>
                            <div><span style="color:var(--text-muted)">Flee:</span> ${unit.Flee}</div><div><span style="color:var(--text-muted)">Feed:</span> ${unit.Feed}</div>
                            <div><span style="color:var(--text-muted)">Size:</span> ${unit.size}</div><div><span style="color:var(--text-muted)">App:</span> ${unit.appetite}</div>
                            <div><span style="color:var(--text-muted)">Parts:</span> ${unit.parts || 'none'}</div><div><span style="color:var(--text-muted)">Chest:</span> ${unit.chest || 'none'}</div>
                            ${stomachCount > 0 ? `<div style="grid-column:1/-1;color:var(--accent-warning)">Stomach: ${stomachCount} inside</div>` : ''}
                        </div>
                        ${actionButtons}
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
                const container = document.getElementById('mini-map');
                if (!container) return;
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
                container.innerHTML = html;
            },

            // ===== SCENE / LOG =====
            updateScene(title, description, inCombat) {
                const titleEl = document.getElementById('scene-title');
                const descEl = document.getElementById('scene-description');
                if (titleEl) titleEl.textContent = title || '';
                if (descEl) descEl.textContent = description || '';
                const actions = document.getElementById('scene-actions');
                const mobileActions = document.getElementById('mobile-actions');
                const mobileCombat = document.getElementById('mobile-combat-actions');
                const mobileExplore = document.getElementById('mobile-explore-actions');
                if (inCombat) {
                    if (actions) actions.innerHTML = `<button class="action-btn primary" onclick="combatAction('fight')">⚔️</button><button class="action-btn" onclick="combatAction('fuck')">🔥</button><button class="action-btn" onclick="combatAction('feed')">🍽️</button><button class="action-btn" onclick="combatAction('flee')">🏃</button>`;
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
            showExplorationActions() {
                const tile = this.getTile(this.location.x, this.location.y);
                const biome = this.biomes[tile.biome];
                this.updateScene(biome.name, tile.explored ? 'You are in the ' + biome.name + '. ' + tile.description : 'You stand at the edge of the unknown...', false);
            },
            renderLog() {
                const container = document.getElementById('log-content');
                if (!container) return;
                container.innerHTML = this.log.slice(-20).reverse().map(e => {
                    let cn = 'log-entry';
                    if (e.type === 'combat') cn += ' combat';
                    if (e.type === 'discovery') cn += ' discovery';
                    return `<div class="${cn}">${e.text}</div>`;
                }).join('');
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
                this.log.push({ text: '⚡ INSTANT WIN! All enemies are defeated.', type: 'combat' });
                this.renderLog();
                this.creatures.forEach(c => { if (c.disposition === this.DISPOSITION.ENEMY) c.CPun = 0; });
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
                    this.location = { x: loaded.locationX, y: loaded.locationY };
                    this.party = loaded.party || [this.player];
                    this.currentBiome = loaded.currentBiome || 'forest';
                    this.log = (loaded.log || []).map(t => ({ text: t, type: 'discovery' }));
                    this.creatures = [];
                    this.inventory = loaded.inventory || [];
                    this.activeSlot = slotName;
                    this.worldMap = new Map();
                    this.exploredTiles = new Set();
                    if (loaded.worldMap) {
                        for (const [key, tile] of Object.entries(loaded.worldMap)) {
                            this.worldMap.set(key, tile);
                            if (tile.explored) this.exploredTiles.add(key);
                        }
                    }
                    this.showScreen('game');
                    this.renderMap(); this.renderParty(); this.renderLog();
                    this.updateScene('Loaded', 'Welcome back, ' + this.player.name + '!', false);
                    localStorage.setItem('fff-last-slot', slotName);
                    // Revive any dead party members on load (softcore)
                    let revived = false;
                    if (this.player && this.player.CPun <= 0) {
                        this.player.CPun = 1;
                        revived = true;
                    }
                    for (const p of this.party) {
                        if (p.CPun <= 0) { p.CPun = 1; revived = true; }
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
    