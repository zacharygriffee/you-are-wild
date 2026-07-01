# FightFuckFeed.tactical — Next Objectives

> Handoff document for the next agent. This is a **porn game that can be turned into SFW, not the other way around**. Default settings are adult. All content is tiered (safe/mature/adult) with adult as the default.

---

## Current State

- **Build:** 121/121 tests pass, 10/10 lint modules clean, dist fresh
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
- Corpse cards expose `Loot` and `Scavenge`
- Corpse loot/scavenge has safe/mature/adult content templates
- Corpse actions do not start combat and preserve the corpse on the tile

### Capacity, Flee, Persistence, and Map UX
- Stomach capacity is `predator.size + predator.appetite`
- Womb/balls capacity use half capacity via `Math.floor(capacity / 2)` with a minimum of 1
- Swallow, cock vore, unbirth, sacrifice, force-feed, sync-feed, ally consume, and auto-feast paths enforce capacity
- Expanded unit cards show `Stomach`, `Womb`, and `Balls` used/capacity values
- Timid non-hostiles flee when threatened by `Fight`; failed flee turns them hostile and starts combat
- Timid allies can flee instead of attacking when badly outnumbered
- Binary saves preserve world tiles, tile creatures/corpses/items, landmarks, structures, and explored state
- Older saves without world data load with empty world state instead of failing
- Loading a save restores current-tile creatures into the active scene
- Minimap resolves immediate adjacent tile biome icons/names without marking those tiles explored
- Icon-only runtime action controls now use localizable labels, `title`/`aria-label`, captions, and a compact action legend
- Default main-context actions are simplified: creature interactions live on party/creature panels, Search is hidden until stronger mechanics exist, Inventory remains available
- Rest appears and heals only at safe rest structures (`cabin`, `hut`, `camp`, `shrine`, `spring`) and refuses direct use elsewhere
- Normalized creatures now carry an `inventory` array for future/modded creature inventory support
- Non-player party members killed by combat/status damage are removed from party and dropped onto the current tile as corpses
- Corpses have a simple `decayTurns` timer and decay out of the current tile creature list when expired
- Single-button context areas suppress redundant visible legends; labels/tooltips remain
- Attacking non-hostile creatures can trigger same-species/social tile reactions: flee-prone creatures may scatter, while others can turn hostile and enter combat together
- Exploration interactions are actor-based: the selected party member, including the player, can resolve baseline actions against creatures and party targets through the shared outside-combat resolver
- Recruitment is gated by a moddable score helper based on pleasure, willingness, disposition, actor stats, and same-species affinity instead of being a free friendly-only button
- Combat positioning has a first-pass row system: front/back rows auto-assign from abilities, active actors can spend a turn to move rows, physical target selection respects back-row reach, and row state is visible on unit cards/chips
- Terrain effects now modify combat: water changes speed for swimmers/non-swimmers, dense forest grants cover and slows units, cave darkness can cause non-darkvision physical misses, swamp can stick grounded combatants, and flying creatures cannot be hit by ground melee
- Combat cards and mobile chips show live attack-order badges, including the current focused actor/target (`Now #n`) and queued group-action badges (`Group/Target Action #n`) that resolve at the slowest participant's turn while intervening turns remain available
- Status expansion supports bleed, burn spread, freeze, stun, sleep, charm, and fear, with combat hooks for damage ticks, skip turns, wake-on-damage, reversed target selection, and fear flee
- Day-night cycle tracks an in-game hour, advances on movement/search, persists in saves, displays in desktop/mobile map UI, boosts nocturnal encounter weights at night, suppresses diurnal encounter weights, puts diurnal spawns to sleep, and narrows night minimap visibility unless the party has darkvision
- Party AI orders provide per-ally tactics (`aggressive`, `defensive`, `healer`, `scavenger`, `passive`) through party-card selectors; healer allies prioritize wounded party members, passive allies hold unless injured, defensive allies prioritize threats when the player is hurt, and scavengers consume fitting corpses after victory
- Enemy AI now has morale flee when outnumbered and wounded, wounded pack creatures can call same-species reinforcements, predators prioritize livestock/prey targets, and first-entry ambushers get first-strike initiative
- Exploration party interaction has a first-pass multi-actor model: party cards can toggle multiple active actors, selected actors can act together against one party/creature target, party play-fighting is nonlethal by default, group feast uses a primary consumer with helpers, and group/single feed can place selected party members into another party member's stomach with capacity checks
- Landmark interiors have a first-pass persistent 5x5 room map stored on the overworld structure tile; entering switches movement/map rendering to the interior, interior movement persists room creatures, room features derive from the origin biome `structureTable`, cave-like structures use cave interiors while others use indoors, and exiting restores the overworld tile context
- Party play-fighting now has a moddable resolver plus `settings.partyPlayFightMode`, keeping nonlethal as the default while allowing harsher outcomes; chewing-enabled group feast now splits a target into portions across selected actors instead of always routing through one primary swallow

---

## Open Objectives (Priority Order)

### 🟡 Tier 2: High Impact

#### 1. Remaining Multi-Creature Interaction Model
- Add true multi-target exploration resolution for `c1 -> c2 + c3`, including stat/skill gates for one actor handling multiple targets
- Expand mixed self/other resolution for `c1 + c2 + c3 -> c1` beyond the current first-pass behavior where selected helpers can act on the selected target
- Expand play-fight outcome hooks into UI/mod configuration if the project needs visible controls beyond the current resolver and setting
- Add more feast variants beyond the current swallow and chewing-split branches
- Keep non-party persuasion deferred: exploration group actions remain player-controlled for party members only
- Keep combat group actions separate from exploration group actions; combat already uses turn-order consequences and slowest-participant resolution

### 🔵 Tier 4: Lower Priority

#### 8. Quest System
- Quest giver NPCs (`disposition: QUEST_GIVER`) with `quest` object: `{ id, title, objectives, reward, status }`
- Objective types: `defeat`, `find`, `escort`, `consume`, `seduce`
- Reward: XP, items, gold, or unique creature recruitment
- Quest log in UI (overlay screen)

#### 9. Merchant/Trade System
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
