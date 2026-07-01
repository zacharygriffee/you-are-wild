# FightFuckFeed.me - Tactical HUD System

## Overview
A complete UI overhaul that transforms the game into a tactical command interface, optimized for both desktop (no scrolling) and mobile (touch gestures).

## How to Activate

### Method 1: Help Button
Click the ❓ Help button in top-right → Select "4. Toggle Tactical HUD"

### Method 2: Keyboard Shortcut
Press **F2** to toggle between Classic and Tactical modes

### Method 3: Console
```javascript
TACTICAL.enable()   // Switch to Tactical HUD
TACTICAL.disable()  // Return to Classic
```

## Desktop Layout (No Scrolling)

```
┌──────────────────────────────────────────────────────────────┐
│ Header: [Title]              [Map][Party][Enemies][Save][Help] │
├────────┬───────────────────────┬─────────────┬───────────────┤
│        │                       │             │               │
│  MAP   │      MAIN STAGE       │    PARTY    │   ENEMIES     │
│ [3x3]  │   (Scene/Combat/      │  Accordion  │   Accordion   │
│ Grid   │    World View)        │   Cards     │    Cards      │
│        │                       │             │               │
├────────┴───────────────────────┴─────────────┴───────────────┤
│ LOG STREAM (Auto-filtered, last 5-10 entries)                  │
└────────────────────────────────────────────────────────────────┘
```

### Party/Enemy Accordion Cards

**Collapsed:**
```
┌─────────────────────┐
│ 🦊 Foxgirl "Alice" ❤️│
│ STR:12 SPD:15 HP:85%│
└─────────────────────┘
```

**Expanded:**
```
┌─────────────────────┐
│ 🦊 Foxgirl "Alice"   │
│ ❤️ 85/100 🍽️ Full    │
│ STR:12 CON:8  SPD:15│
│ INT:10 WIS:8  CHA:14│
│ Tags: Pred, Female   │
│ [Select for Action →]│
└─────────────────────┘
```

## Mobile Layout (Touch Gestures)

```
┌─────────────────────────────┐
│ 🎮 FFF.me  [Map][Party][⚔️] │  ← Tab buttons
├─────────────────────────────┤
│                             │
│      MAIN STAGE             │
│   (Swipe ←→ to switch)      │
│                             │
├─────────────────────────────┤
│  LOG (Last 3 entries)       │
├─────────────────────────────┤
│ [⚔️] [💕] [🍽️] [🏃]        │  ← Action bar
└─────────────────────────────┘
```

### Touch Gestures
- **Swipe Left/Right**: Switch between Map/Main/Party/Enemies panels
- **Swipe Up**: Show action bar
- **Swipe Down**: Hide action bar
- **Tap**: Expand/collapse unit cards
- **Long Press**: Context menu

## Features

### Smart Log System
- **Priority filtering**: Important events (combat, death) always shown
- **Auto-categorization**: Entries colored by type
- **Responsive**: Shows more entries on desktop, fewer on mobile
- **Categories:**
  - 🔴 Red: Combat, Death (Priority 5)
  - 🟠 Orange: Discovery, Level Up (Priority 4)
  - 🟢 Green: Loot (Priority 3)
  - 🔵 Blue: Talk (Priority 2)
  - ⚪ Gray: Movement (Priority 1, filtered on mobile)

### Grid Selection
When you need to select units:
- Grid of emoji icons appears
- Click/tap to select
- Auto-selects if only one option

### Keyboard Shortcuts (Tactical Mode)
- **F1**: Show help
- **F2**: Toggle Tactical HUD
- **F5**: Quick save
- **F9**: Quick load
- **Arrows/WASD**: Move
- **1-4**: Quick action select

## Technical Details

### Modules Added
```
TACTICAL      - Main layout controller
UNIT_CARDS    - Accordion card system
GRID_SELECT   - Grid selection interface
TOUCH_GESTURES - Mobile swipe/touch handling
SMART_LOG     - Priority-based log filtering
```

### CSS Grid Areas
```css
grid-template-areas:
    "header header header header"
    "map    main   party  enemies"
    "log    log    log    log";
```

### Responsive Breakpoints
- **Desktop**: 4 columns, full layout
- **Tablet (1024px)**: 3 columns, compact
- **Mobile (768px)**: Single column, swipe panels

## Troubleshooting

### Tutorial Not Showing
```javascript
resetTutorial()  // Reset and reload
showTutorial()   // Manually start
```

### Layout Issues
```javascript
TACTICAL.disable()
TACTICAL.enable()  // Restart layout
```

### Debug Info
```javascript
FFF_MODULES       // See all loaded modules
TACTICAL.isActive() // Check current mode
```

## File Changes
- `FightFuckFeed.me.html` - Main file with all changes
- Added ~1,500 lines of CSS
- Added ~800 lines of JavaScript
- Original functionality preserved

## Credits
Tactical HUD designed for FightFuckFeed.me v0.10.13.17
