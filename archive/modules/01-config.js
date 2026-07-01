/**
 * FightFuckFeed.me - CONFIG Module
 * Game constants, species data, and configuration
 */

const CONFIG = (() => {
    // Version and game balance
    const VERSION = "0.10.13.17";
    const eatValue = 3;
    const fuckValue = 2;
    
    // Species data
    const SPECIES = [
        "Bat", "Bear", "Bee", "Bunny", "Butterfly", "Carnage", "Cat", "Caterpillar",
        "Centaur", "Chicken", "Chocolate", "Cow", "Coyote", "Deer", "Dog", "Drow",
        "Elephant", "Faerie", "Fox", "Frog", "Gator", "Goat", "Goblin", "Gazelle",
        "Harpy", "Human", "Hyena", "Lizard", "Mosquito", "Mouse", "Naga", "Opossum",
        "Ork", "Otter", "Owl", "Pig", "Piranha", "Plant", "Raccoon", "Rat",
        "Salamander", "Sheep", "Shroom", "Slime", "Squirrel", "Tiger", "Toad",
        "Turkey", "Wolf"
    ];
    
    const SPECIES_DESC = [
        "A Bitey Bat", "A Brawny Bear", "A Buzzy Bee", "A Beloved Bunny",
        "A Beautiful Butterfly", "A Cleaving Carnage", "A Cute Cat",
        "A Carnivorous Caterpillar", "A Courageous Centaur", "A Concerned Chicken",
        "A Chunk Of Chocolate", "A Caring Cow", "A Cunning Coyote", "A Darling Deer",
        "A Domesticated Dog", "A Devious Drow", "An Enormous Elephant",
        "A Fickle Faerie", "A Feisty Fox", "A Friendly Frog", "A Grinning Gator",
        "A Gutsy Goat", "A Grubby Goblin", "A Graceful Gazelle", "A Hectic Harpy",
        "A Humble Human", "A Hilarious Hyena", "A Lanky Lizard", "A Malicious Mosquito",
        "A Modest Mouse", "A Noodley Naga", "An Outlined Opossum", "An Outraged Ork",
        "An Ornery Otter", "An Observant Owl", "A Pudgy Pig", "A Puny Piranha",
        "A Prickly Plant", "A Roguish Raccoon", "A Roughish Rat", "A Sneaky Salamander",
        "A Sleepy Sheep", "A Shy Shroom", "A Slimy Slime", "A Sneaky Squirrel",
        "A Tough Tiger", "A Tiresome Toad", "A Troublesome Turkey", "A Wily Wolf"
    ];
    
    // Biome configurations
    const BIOMES = {
        FOREST: { color: '#228B22', difficulty: 1 },
        JUNGLE: { color: '#006400', difficulty: 2 },
        CAVE: { color: '#696969', difficulty: 2 },
        CASTLE: { color: '#8B4513', difficulty: 3 },
        PLAINS: { color: '#90EE90', difficulty: 1 },
        SWAMP: { color: '#556B2F', difficulty: 2 },
        CANYON: { color: '#D2691E', difficulty: 3 }
    };
    
    // Save file templates
    const createSaveFile = (slot) => ({
        saves: 0,
        loads: 0,
        cheating: false,
        current_save: slot,
        version: VERSION
    });
    
    return {
        VERSION,
        eatValue,
        fuckValue,
        SPECIES,
        SPECIES_DESC,
        BIOMES,
        createSaveFile,
        MAX_SAVE_SLOTS: 3
    };
})();

// Make available globally for compatibility
window.CONFIG = CONFIG;
