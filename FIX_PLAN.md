# FightFuckFeed.me UI Fix Plan

## Current Status
✅ File structure is correct (single </script></html>)
✅ All 12 modules are integrated and defined
✅ CSS improvements are in place
✅ Module loader initializes on DOMContentLoaded

## Problem
The modules are loaded but NOT connected to the existing game code. The original game still uses global functions that haven't been replaced.

## Root Cause
When you open the game, the old code still runs. The new modules are loaded but:
1. TUTORIAL.start() never gets called because the module loader checks if tutorial should show
2. SAVE_UI.open() isn't wired to any save buttons
3. KEYBOARD.init() runs but shortcuts reference functions that don't exist yet
4. UI.showToast() is defined but never used by original code

## Required Fixes

### 1. Wire Tutorial Trigger
Location: Find where the game first starts/loads
Action: Add TUTORIAL.start() call if shouldShow()

### 2. Wire Save UI
Location: Find existing save/load functions
Action: Replace with SAVE_UI.open() calls

### 3. Wire Keyboard Shortcuts
Location: Already initialized in module loader
Action: Test if they work (may need conflict fixes)

### 4. Replace UI Notifications
Location: Find alert() and status updates
Action: Replace with UI.showToast()

### 5. Test Module Functions
Verify in browser console:
- CONFIG.VERSION exists
- STATE.get/set work
- MAP.Walk works
- etc.

## Implementation Steps

1. Add console.log statements to module loader to confirm loading
2. Add window.FFF_MODULES = {...} export for debugging
3. Wire tutorial to a visible button or auto-trigger
4. Create test button for save UI
5. Test each module function in console
6. Gradually replace old functions with module calls

## Testing Checklist
- [ ] Open game in browser
- [ ] Check console for "Modules loaded:" message
- [ ] Verify CONFIG.VERSION is accessible
- [ ] Test TUTORIAL.shouldShow()
- [ ] Manually call TUTORIAL.start()
- [ ] Manually call SAVE_UI.open()
- [ ] Check keyboard shortcuts work
- [ ] Verify UI.showToast() displays
