# FightFuckFeed.me Module Structure

## Module Organization (IIFE Pattern)

### 1. CONFIG Module
- VERSION, eatValue, fuckValue
- SPECIES arrays (SPECIES, SPECIES_DESC, SPECIES_HINT, etc.)
- Biome configurations
- Game balance constants

### 2. STATE Module
- party (player state)
- map (world state)
- settings (game settings)
- E (encounter/state)
- All SAVENEEDED variables

### 3. UTILS Module
- NewID()
- LeavingFunction()
- Compactinator()
- Random utilities
- String/formatting helpers

### 4. MAP Module
- GetMap(), GetMapCrossroad(), GetMapTag()
- GetMapTile(), GetMapTileColor()
- IsMapTileNearName(), CountMapTileNearName()
- MakeMapTile()
- RenderPlayerOnMap(), Draw()

### 5. MOVEMENT Module
- Walk()
- fastTravel logic
- TravelDialogCountdown handling

### 6. COMBAT Module
- Combat functions
- Damage calculation
- Action selection (SelectAction, SelectAction2)
- LethalCheck()

### 7. ENCOUNTER Module
- Hostile/peaceful encounter rendering
- DrawHostileMap(), DrawPeaceMap()
- Status(), Main()
- setCustomEncounterCharacterDeets()

### 8. CHARACTER Module
- SetLimbs(), SetBody()
- SetGender(), CopyGender()
- SetExtras()
- CanNommed(), CanCocked()

### 9. UI Module
- HeaderSettings()
- Button rendering functions
- Wiki functions
- Save/Load UI

### 10. SAVE Module
- Save file management
- Compression/decompression
- Import/export

### 11. GAME Module
- Main game loop
- Initialization
- Event handling
