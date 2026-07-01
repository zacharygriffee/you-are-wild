# FightFuckFeed.me - Modular DLC System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE GAME ENGINE                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   STATE      │  │   COMBAT     │  │    MAP       │      │
│  │  Manager     │  │   Engine     │  │  Generator   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                   MODULE MANAGER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  IndexedDB   │  │   Loader     │  │   Sandbox    │      │
│  │   Storage    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  BIOME MODS  │   │  SPECIES MODS│   │ FEATURE MODS │
│  - Forest    │   │  - Dragons   │   │  - Quests    │
│  - Desert    │   │  - Robots    │   │  - Crafting  │
│  - Space     │   │  - Aliens    │   │  - Building  │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Module Manifest Format

```javascript
{
  "id": "mod_forest_expansion",
  "name": "Mystic Forests",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Adds enchanted forest biomes with fae creatures",
  "type": "biome_pack",
  "dependencies": [],
  "conflicts": [],
  "minGameVersion": "0.10.13",
  
  "content": {
    "biomes": [...],
    "species": [...],
    "items": [...],
    "events": [...]
  }
}
```

## Storage Schema (IndexedDB)

```
Database: FFFme_Modules
├── Store: modules
│   └── { id, manifest, code, enabled, installedAt }
├── Store: assets
│   └── { id, moduleId, type, data, blob }
└── Store: settings
    └── { userPreferences, activeModules }
```

## Module Types

### 1. Biome Modules
- Adds new terrain types
- Unique tile generation rules
- Biome-specific encounters

### 2. Species Modules  
- New monster types
- Custom stats/abilities
- Unique artwork/icons

### 3. Feature Modules
- Gameplay systems (quests, crafting)
- UI modifications
- Utility features

### 4. Map Modules
- Pre-built regions
- Story campaigns
- Challenge modes

## Hook System

Modules register hooks to extend game:

```javascript
MODS.registerHook('onMapGenerate', (tile, x, y) => {
  // Modify tile generation
});

MODS.registerHook('onEncounterStart', (encounter) => {
  // Add custom enemies
});

MODS.registerHook('onCombatAction', (action, actor, target) => {
  // Custom combat effects
});
```
