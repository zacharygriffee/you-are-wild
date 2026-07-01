# FightFuckFeed.tactical — Next Objectives

> Handoff document for the next agent. This is a **porn game that can be turned into SFW, not the other way around**. Default settings are adult. All content is tiered (safe/mature/adult) with adult as the default.

---

## Current State

- **Build:** 61/61 tests pass, 10/10 lint modules clean, dist fresh
- **Architecture:** Single-file HTML distributable (`dist/FightFuckFeed.tactical.html`), modular JS source in `src/`, template shell in `template.html`
- **Content system:** Template-driven with safe/mature/adult tiers. `maxTier: 2` (adult) and `voreEnabled: true` are defaults.
- **Modding:** `registerSubAction()`, `registerBiome()`, `registerSpecies()` APIs with module hooks (`onCombatAction`, `onSubActionExecute`, `onDigestionTick`)

---

## Already Implemented (Do Not Repeat)

### 6 Primary Actionables
- `Fight`, `Flirt`, `Feast`, `Fuck`, `Feed`, `Flee` — all wired through combat routing, UI (desktop + mobile), target selection, and content templates

### Sub-Action Framework
- `App.SUB_ACTIONS` registry: 6 action categories, each with 2–6 sub-actions
- `defaultSubActions` — last-chosen sub-action persists per session
- SFW label masking via `getActionLabel()` / `getPrimaryLabel()` — Seduce/Consume/etc. when `maxTier < 2`
- Mod API: `App.registerSubAction(action, subId, config)` for runtime registration

### Feast Lifecycle (Stomach/Womb/Balls)
- Prey state machine: `digestionState` (contained → digesting → digested → released), `digestionProgress` (0–100), `statDrain` tracking
- Backward-compatible with old prey objects (initializes undefined properties)
- Per-turn digestion: `_processStomachState()` with rate control, stat absorption, fatal/endo gates
- Sub-actions: `swallow`, `chew`, `cockVore`, `unbirth`, `digest`, `release`

### Feed Sub-Actions
- `heal` — restore ally HP by Feed×2, reduce hunger, raise pleasure if below 50%
- `breastfeed` — requires `lactating && !lactationCooldown`, restores HP+pleasure, sets cooldown
- `sacrifice` — livestock/willingPrey feeds themselves to predator; predator decides endo vs fatal
- `forceFeed` (CNC) — three-party action: holder restrains predator + prey forced into predator; requires `settings.forcedFeeding`
- `slurp` — target `slurpable`, target loses HP/stat portion, stays alive
- `fragment` — target `breakable`, target loses stat chunk, can regenerate over time

### Creature Properties (Normalized)
- `lactating`, `lactationCooldown`, `slurpable`, `breakable`, `willingPrey`, `forcedFed`, `pregnant` (struct only)
- `SPECIES_SIZE` — deterministic sizes (bunny=2, human=4, wolf=3, dragon=6, etc.)
- `SPECIES_TEMPERAMENT` — 20 flags per species (timid, aggressive, apex, pack, etc.)
- `PREDATOR_PREY_RELATION` — predator→prey mapping (wolf preys on bunny, deer, sheep, etc.)

### AI
- Livestock auto-offer: obedient livestock allies feed themselves to hungry predators when `predator.hunger > 50`
- Temperament-based encounter disposition: `_calculateEncounterDisposition()` factors temperament, level diff, party size, predator-prey relationship, same-species
- Unified `spawnWildEncounter()` — generates mixed encounters (enemies + neutrals + friendlies), only starts combat if enemies present

### Content Templates
- 13 new sub-action templates with safe/mature/adult tiers
- New settings toggles: `cockVoreEnabled`, `unbirthEnabled`, `forcedFeeding`

### Bug Fixes
- Deterministic species sizes (was random, causing bunny size > wolf size)
- Fuck action now offers recruitment prompt after seduction (matches sync_fuck behavior)
- Encounter system now uses temperament instead of always spawning ENEMY

### Corpse and Tile Persistence Foundation
- `CORPSE` disposition exists for defeated fight targets
- Fight defeats convert living enemies into corpse entries instead of leaving dead enemy cards
- `renderCreatures()` separates living creatures from a lower "Remains" section
- Tile movement preserves friendlies, neutrals, and corpses
- Revisiting tiles starts combat only when restored creatures include living enemies
- First-visit spawns append to existing tile creatures instead of wiping them

---

## Open Objectives (Priority Order)

### 🔴 Tier 1: Critical Next (Start Here)

#### 1. Stomach/Womb/Balls Capacity
**Problem:** No limit on how many prey a predator can hold. A size-1 mouse could theoretically hold 10 dragons.

**Requirements:**
- `capacity = predator.size + predator.appetite`
- Each prey consumes `prey.size` capacity
- `validate` in `feast.swallow` sub-action: check `currentOccupied + target.size <= capacity`
- Same for `cockVore` and `unbirth` (separate orifice capacities could be `Math.floor(capacity / 2)` each)
- Failure: "Your stomach is too full for that!" (or appropriate orifice message)
- Capacity display on unit card (e.g., "Stomach: 3/6")

**Files to touch:** `src/core/app.js` (`SUB_ACTIONS.feast.swallow.validate`, `_createStomachPrey`, `_doSubAction`, `renderUnitCard`)

#### 2. Timid Creature Flee Behavior
**Problem:** Timid creatures (bunny, deer, mouse) that spawn as NEUTRAL or FRIENDLY just sit there. They should flee if threatened.

**Requirements:**
- When player selects `Fight` targeting a timid creature, or moves adjacent, the creature should attempt to flee
- Flee check: `Math.random() < (Flee / 20)` — bunnies with Flee=20 auto-flee, deer with Flee=12 might stay
- If flee succeeds: log message, creature removed from `this.creatures`, no XP reward
- If flee fails: creature becomes ENEMY (cornered animal fights back)
- Same for allies in `allyTurn()` — if ally is timid and outnumbered, attempt to flee instead of attacking

**Files to touch:** `src/core/app.js` (`executeActionAgainstTarget` for fight targeting, `allyTurn`, `move` for proximity triggers)

#### 3. Corpse Scavenging/Looting Content Templates
- Add `corpse` templates to `content-system.js`: `scavenge`, `loot` with safe/mature/adult tiers
- Default adult tier: "You pick over the remains of ${target.name}, finding..." (item list or nothing)
- SFW tier: "You search the remains of ${target.name}."

**Files to touch:** `src/core/content-system.js`

---

### 🟡 Tier 2: High Impact

#### 6. Combat Movement System
- Tactical positioning: front row (melee) and back row (ranged)
- Creatures auto-position based on abilities (flying = back, melee = front)
- Flanking bonuses: attacking from behind row gives +20% damage
- `move` action in combat: swap positions between rows (costs turn)
- Affects targeting: melee can't target back row unless flying or ranged; ranged can target any row with penalty to front row

#### 7. Terrain Effects in Combat
- Water tiles: swimming creatures get +2 SPD, non-swimmers get -2 SPD
- Flying creatures: immune to ground melee, can only be hit by ranged/flying
- Dense forest: +2 CON cover bonus, -2 SPD movement
- Plains: no modifiers, open visibility
- Cave: darkvision required for full accuracy; non-darkvision creatures have 50% miss chance
- Swamp: chance to get `stuck` status (skip turn, 20% per round)

#### 8. Status Effect Expansion
- `bleed` — DOT 2 HP/turn, 3 turns, stacks
- `burn` — DOT 3 HP/turn, 2 turns, can spread to adjacent creatures
- `freeze` — skip 1 turn, -2 SPD for 2 turns after
- `stun` — skip 1 turn
- `sleep` — skip until hit or 3 turns pass; wake on damage
- `charm` — creature fights for the charmer (reversed target selection)
- `fear` — 50% chance to skip turn, flee if HP < 30%

#### 9. World Persistence
- Save full world state: all tiles with their `creatures`, `corpses`, `items`, `explored`, `hasLandmark`, `landmarkName`, `structureSpawned`
- Currently only saves player, party, and inventory. World map regenerates on load.
- Binary codec needs new fields for `worldMap` serialization

#### 10. Day-Night Cycle
- Time tracking: each `move` or `search` advances time by 1 hour
- Night (20:00–06:00): nocturnal creatures active (bat, rat), diurnal creatures sleep (bunny, deer)
- Night encounter rates: +50% for nocturnal, -80% for diurnal
- Visibility: -2 tiles at night; darkvision creatures unaffected
- UI: display current time, sun/moon icon in header

---

### 🟢 Tier 3: Medium Impact

#### 11. Party AI Orders
- Per-ally tactic assignment: `aggressive` (always attack), `defensive` (protect player), `healer` (feed wounded), `scavenger` (feast on corpses), `passive` (do nothing unless attacked)
- UI: accordion in party panel, dropdown per ally
- AI overrides: healer ally prioritizes `feed.heal` on most wounded; scavenger ally auto-feasts on corpses after combat

#### 12. Enemy AI Improvements
- Flee when outnumbered: if `enemyCount < partyCount && enemy.CPun < enemy.MPun * 0.5`, 50% flee chance
- Call for reinforcements: pack animals (`pack: true`) on low HP have 30% chance to spawn 1 more same-species ally
- Prioritize livestock: predators (`isPredatorOf`) target livestock/prey creatures first, even if weaker than player
- Ambush behavior: `ambush: true` creatures get first strike if player hasn't explored tile yet

#### 13. Landmark Interiors (Sub-Maps)
- Cabins, shrines, caves have persistent interior maps (5×5 or 7×7 grid)
- Entering a structure switches to interior map, new biome-specific encounter table
- Exiting returns to overworld tile
- Interior encounters use `structureTable` from biome definition
- Interior state persists (explored, creatures, items)

---

### 🔵 Tier 4: Lower Priority

#### 14. Quest System
- Quest giver NPCs (`disposition: QUEST_GIVER`) with `quest` object: `{ id, title, objectives, reward, status }`
- Objective types: `defeat`, `find`, `escort`, `consume`, `seduce`
- Reward: XP, items, gold, or unique creature recruitment
- Quest log in UI (overlay screen)

#### 15. Merchant/Trade System
- Merchant NPCs (`disposition: MERCHANT`) with `stock` array of items
- Gold currency: `player.gold`, earned from selling items, quest rewards, looting corpses
- Buy/sell interface: item list with prices, player inventory, transaction confirmation
- Merchant stock refreshes every 3 in-game days

#### 16. Equipment System
- Wearable items: armor (CON bonus), accessories (stat bonuses), rings (special effects)
- Equipment slots: head, body, hands, feet, accessory1, accessory2
- Items in `ITEMS` registry get `slot` and `equipBonus` fields
- Equipped items show on character stats panel

#### 17. Skill/Perk Tree
- Replace random `_grantPerk()` with player choice on level-up
- 3 archetype trees per species: `predator` (combat), `seducer` (charm/pleasure), `survivor` (utility/defense)
- Perks have prerequisites (e.g., "Voracious" requires 2 predator perks)
- UI: perk selection modal on level-up

---

### 🟣 Tier 5: UI/UX & Polish

#### 18. Party Management UI
- Drag-and-drop reorder in party panel
- Set party leader (affects AI target priority)
- Detailed stats sheet: click ally name for full stat breakdown
- Dismiss/kick ally from party (with confirmation)

#### 19. Combat Log Filtering
- Filter buttons: All / Combat / Discovery / Loot / Heal
- Search box (text filter)
- Timestamps (relative: "2 turns ago", "just now")
- Export to text file (for bug reports/screenshots)

#### 20. Mobile Gesture Improvements
- Long-press on creature card: context menu (Fight/Flirt/Feed/Inspect/Recruit)
- Pinch-to-zoom on map panel
- Swipe between panels (map → party → enemies)
- Haptic feedback on action buttons (if supported)

#### 21. Accessibility
- Screen reader support: `aria-label` on all action buttons, `role="status"` on log entries
- High-contrast mode toggle in settings (CSS variable swap)
- Font size scaling (12px–20px base)
- Reduced motion: disable animations/transitions

#### 22. Localization Framework
- All user-facing strings in `locales/en.json` (or similar)
- Language switcher in settings
- Content templates use locale keys instead of hardcoded strings
- Initial target: English + Spanish (for community)

---

## Architecture Notes for the Next Agent

### File Layout
```
FightFuckFeed.tactical/
  src/core/
    app.js           — Main game state, combat loop, encounter system, AI (~3200 lines)
    content-system.js — Template engine, content tiers (~370 lines)
    serialization.js  — Binary save/load codec (~239 lines)
    module-system.js  — Mod loader and hook system (~275 lines)
    marketplace.js    — Built-in content pack metadata (~140 lines)
  src/ui/
    global-nav.js     — Navigation helpers (~20 lines)
    settings-nav.js   — Settings overlay logic (~16 lines)
    mod-ui.js         — Mod manager UI (~204 lines)
    market-screen.js  — Marketplace UI (~287 lines)
    market-nav.js     — Marketplace nav (~17 lines)
  template.html      — HTML shell, CSS, inline screens (~2000 lines)
  test/test.js       — 57 tests, syntax/structure/combat behavior
  build.js           — Concatenates all modules into single HTML file
  dev.js             — Development server with watcher
```

### Key Patterns
- **No frameworks.** Vanilla JS. All state is in the `App` object.
- **Single-file output.** `build.js` concatenates all `src/` JS into `template.html` → `dist/FightFuckFeed.tactical.html`
- **Build order:** `serialization.js` → `app.js` → `module-system.js` → `content-system.js` → `marketplace.js` → UI modules. Globals are initialized in that order.
- **Content system:** All text is generated via `CONTENT.getContent(path, context)` which picks the appropriate tier based on `maxTier` preference. Adult tier is default.
- **Tests:** Run `cd FightFuckFeed.tactical && node test/test.js`. All tests must pass. Add new tests for new features.
- **Lint:** `node build.js --lint-only` validates all JS syntax. Must pass before commit.
- **Full build:** `npm run full-build` from repo root = clean + build + test + lint + check.

### Common Gotchas
- The codebase uses **mixed tabs and spaces** for indentation. When searching/replacing code blocks, use exact string matching (tabs are `\t` in the file). Python-based patching is more reliable than sed for large replacements.
- Template literals with backticks in JS strings break bash `sed`. Use Python scripts for patching.
- The `encounter()` pipeline in `move()` is the main entry point for creature spawning. `spawnWildEncounter()` is the unified method. Don't add old `spawnFriendlyEncounter` or `spawnEncounter` back.
- `this.creatures` holds ALL creatures at the current location, not just enemies. Filter by `disposition` and `CPun > 0` for living combatants.
- Prey objects in `stomach`/`womb`/`balls` need `inStomach`/`inWomb`/`inCock` flags. The `_processStomachState()` loop checks for `prey.inStomach === false` to skip (not `!prey.inStomach`), for backward compatibility with old saves.
- `DISPOSITION` currently has: `ENEMY`, `NEUTRAL`, `FRIENDLY`, `PARTY`, `QUEST_GIVER`, `MERCHANT`. Add `CORPSE` for the corpse system.

### Testing Strategy
- Add `assertContains(appContent, 'NEW_FEATURE', 'message')` for structure tests
- Add combat behavior tests using `loadAppForCombat()` and `makeUnit()` for unit-level tests
- Always verify `npm run full-build` passes before finishing
- The `dist/` file must be regenerated by `build.js` — don't hand-edit it

---

*Generated 2026-07-01. If you have questions, check the source in `src/core/app.js` and `src/core/content-system.js` before asking. The README at `README.md` has the build commands.*
