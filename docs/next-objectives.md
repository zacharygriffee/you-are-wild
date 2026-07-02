# You Are Wild — Next Objectives

> Handoff document for the next agent. This is a **porn game that can be turned into SFW, not the other way around**. Default settings are adult. All content is tiered (safe/mature/adult) with adult as the default.

---

## Current State

- **Build:** 190/190 tests pass, 10/10 lint modules clean, dist fresh
- **Architecture:** Single-file HTML distributable (`dist/you-are-wild.html`), modular JS source in `app/src/`, template shell in `app/template.html`
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
- Exploration now has stat-gated multi-target APIs (`outsideActionOnTargets`, party target indexes, creature target ids) so one capable actor can resolve one action across multiple party/creature targets while low-stat actors are blocked from overextending
- Quest system has a first-pass foundation: quest-giver creatures can carry `quest` objects, authored quest templates can spawn quest givers from structure encounters, quest cards expose accept/view actions, accepted quests render in a quest log with status filtering, turn-in filtering, title/status sorting, optional deferred reward turn-in, defeat/find/consume/seduce/escort-style objective progress uses a shared matcher, rewards can grant XP/gold/items/recruits, and accepted quest state plus player gold persist in save version 10
- Merchant/trade system has a first-pass foundation: merchant creatures can carry stock, creature cards expose trade actions, the trade screen supports buying and selling items with player gold, expensive/rare purchases require confirmation, merchant stock can refresh after three in-game days, authored stock tables can place merchants in safe/commercial structures, inventory/trade surfaces support item category filtering and value/name/type sorting, corpse loot can grant generated or authored gold rewards, and save version 10 persists quest state, player gold, day count, equipment metadata, perk state, and party leader
- Equipment system has a first-pass foundation: `ITEMS` entries can declare equipment slots, numeric `equipBonus` fields, and non-numeric accessory `equipEffect` hooks, player equipment supports head/body/hands/feet/accessory slots, inventory exposes equip/unequip actions, bonuses/effects apply and remove from player stats/state, authored equipment tables feed merchant stock plus corpse/structure loot placement, equipped items render in inventory and character stats, and save version 10 persists equipped slot metadata
- Skill/perk tree has a first-pass foundation: level-up now queues player perk choices instead of random grants, the player can choose from predator/seducer/survivor archetype trees plus matching species-specific trees, the perk selection modal filters by tree, perks can require prior tree/perk investment, selected perks apply numeric stat bonuses and non-numeric `perkEffect` hooks, pending choices render from character stats, character stats expose respec/debug perk controls for balancing, and save version 10 persists selected perks plus pending choices
- Party management UI has a first-pass foundation: party cards expose reorder, leader, detailed stats, and dismiss controls, the selected leader is visible on party cards, dismissed allies are removed from selection state, enemy target priority can bias toward an explicitly selected leader after prey/tasty rules, and save version 10 persists the selected party leader
- Combat log filtering has a first-pass foundation: log panel exposes All/Combat/Discovery/Loot/Heal filters, search input, relative timestamps, explicit round/turn/actor metadata for high-traffic combat entries, screen-reader status roles, category color/icon badges, and an export action that emits the currently filtered log as text
- Combat log view preferences now persist independently: selected filter and search text are saved to `yaw-log-view`, reloaded on app init, and invalid stored values fall back safely; legacy `fff-log-view` is still read for migration
- Repository organization/rebrand first pass is complete: active source lives under `app/`, root scripts point at that layout, generated output is `dist/you-are-wild.html`, visible active UI branding says **You Are Wild**, package/build metadata uses the new slug, and `npm run audit:branding` verifies only approved legacy migration references remain
- Sparse map generation has a first-pass foundation: biome role metadata separates region/route/feature/interior concepts, super-patch generation selects only region biomes, seeded deterministic helpers drive region selection, world seed/version metadata persists through saves, and non-region entries such as bridge/road/indoors/entrance no longer become large super-patch biomes
- Sparse map delta boundary exists: `getBaseTile()`, `getTileDelta()`, `applyTileDelta()`, and `persistTileDelta()` keep deterministic generated baseline data separate from explored/changed tile state while `worldMap` remains a compatibility cache for existing gameplay systems
- Sparse map store foundation exists: `YAW_Worlds` creates `worlds`, `tileDeltas`, `chunkDeltas`, and `entityIndex` object stores; save/load opportunistically persists and reloads world metadata plus tile deltas while version-10 save-slot world payloads remain the compatibility fallback
- Mobile gesture improvements have a first-pass foundation: creature chips support long-press context menus for Fight/Flirt/Feed/Inspect/Recruit, the mobile minimap supports pinch zoom with preserved scale after map refresh, swipe panel navigation keeps haptic feedback, and long-press/context actions use vibration when supported
- Accessibility has a first-pass foundation: settings now persist high-contrast mode, reduced motion, and 12px-20px base font scaling; the log region announces updates politely; log entries use status roles; high-traffic party/creature action buttons expose `title`/`aria-label`; and newer interaction settings persist through the same settings save path
- Multi-target exploration has a first-pass UI foundation: party and creature cards can mark targets, selected targets surface stat-gated context actions with escaped actor/target summaries, one actor can resolve actions across marked party/creature targets, group actors still resolve against a single marked target, selecting an ally first replaces the default player selection instead of silently creating an unintended player+ally group, self-included group fight resolves as shared sparring, self-included group feed tends the target instead of consuming helpers, self-included group feast rejects with clear selection guidance instead of routing self-consumption, self-included social actions share pleasure with selected participants, multi-target feed no longer consumes the acting party member, many-actor/many-target selections now reject with a clear log instead of silently dropping helpers, and actor/target selections are normalized after dismissal, containment, corpse conversion, and load/reset
- Localization has a first-pass foundation: `CONTENT.locales` exposes English/Spanish keys, `CONTENT.t()` supports variable interpolation, `CONTENT.setLanguage()` persists language preferences, settings exposes an interface language selector, and high-traffic action/target labels now route through locale keys

---

## Open Objectives (Priority Order)

### 🟡 Tier 2: High Impact

#### 1. Remaining Multi-Creature Interaction Model
- Expand the first-pass target-selection UI with richer mobile affordances if playtesting shows the `Target` buttons are too subtle; the context action area now shows escaped actor/target summaries before resolving actions
- Further harden party-to-party feeding when mixed self-target/helper/prey groups are selected; selected helpers now reject or route more clearly in the covered one-to-many/many-to-one cases, self-included `fight` spars across participants, self-included `feed` tends the target instead of consuming helpers, self-included social actions share pleasure with participants, and self-included `feast` rejects with selection guidance, but richer non-asymmetric groups still need explicit semantics
- Continue testing multi-select stability through more edge cases: current coverage includes target cleanup for dismissal, creature defeat, containment, and load/reset; still test save/load persistence expectations, target removal from tile transitions, and more self-included group combinations
- Expand asymmetric one-to-many and many-to-one exploration action resolution:
  - `c2 + c3 -> c1`: both selected actors act together on one target; fight is two-against-one, feast uses a primary consumer unless chewing/splitting is available
  - `c1 -> c2 + c3`: one actor acts across multiple selected targets only when stats/skills allow it, such as high dexterity for fighting multiple targets or sufficient social/pleasure ability for flirting multiple targets
  - `c1 + c2 + c3 -> c1`: support self-included groups where the target may act on themself while other selected actors also act on the same target, or where the whole group acts non-asymmetrically on each other
- Keep party-vs-party fight interactions as play-fighting by default, but keep the resolver moddable so projects/settings can opt into harsher outcomes
- Expand play-fight outcome hooks into UI/mod configuration if the project needs visible controls beyond the current resolver and setting
- Add more feast variants beyond the current swallow and chewing-split branches
- Keep primary-consumer feast semantics explicit: if multiple helpers feed one prey and chewing is unavailable, helpers assist the primary consumer instead of all independently swallowing the same prey
- Keep non-party persuasion deferred: exploration group actions remain player-controlled for party members only
- Keep combat group actions separate from exploration group actions; combat already uses turn-order consequences and slowest-participant resolution

#### 2. Brand Transformation
- Check final commercial availability before release naming is locked; the quick search looked cleaner than `Wildbound`, but this is not a legal clearance substitute
- Keep **You Are Wild** as the canonical project title unless availability clearance finds a blocker; acceptable shorthand/acronym options are **YAW** or **YW**, with "You're wild" reserved for tagline/UI copy rather than as a separate brand
- Continue migration-safe cleanup of old storage names only where compatibility allows; active writes now use `yaw-*`, `YAW_Saves`, and `YAW_Modules`, while approved legacy aliases remain for existing saves/settings/modules
- Decide whether to remove or further quarantine `legacy/` and `archive/` before release packaging
- Keep `npm run audit:branding` passing whenever source, docs, or generated dist change

#### 3. Repository Organization
- Keep active source under the cleaner `app/` layout; update root package scripts and docs whenever layout changes
- Review `archive/` and `legacy/` retention policy so old reference material is quarantined without confusing active branding audits
- Ensure repository metadata stays aligned with GitHub defaults: local branch `main`, remote `origin`, and README/build instructions aligned with the final layout

### 🔵 Tier 4: Lower Priority

#### 7. Sparse Map Generation Foundation
- Complete save-slot migration so slots primarily reference `worldId` while `YAW_Worlds` owns durable map state; current version-10 save payloads still carry `worldMap` as a compatibility fallback
- Add large-map low-LOD discovery view backed by generated base data plus `YAW_Worlds` discovery/tile deltas

#### 8. Advanced Quest Scripting
- Add explicit escort routing/checkpoints instead of only API-level objective matching

#### 16. Advanced Equipment
- Decide whether non-player creatures should use equipment slots or creature inventory only
- Rework save/load stat baselines if equipment needs full recalculation instead of persisted equipped metadata

### 🟣 Tier 5: UI/UX & Polish

#### 18. Advanced Party Management UI
- Replace button-based reorder with drag-and-drop once the party panel has pointer/drag affordances
- Add richer party role configuration beyond leader and existing AI order
- Add dismissal consequences/dialogue if party relationship systems become meaningful
- Decide whether mobile chips need the same full management surface or a long-press menu

#### 20. Advanced Mobile Gestures
- Tune long-press duration and context-menu placement after device testing
- Add richer haptic patterns per action outcome if the UX benefits from it
- Consider radial/joystick map controls once core traversal semantics settle
- Add dedicated gesture affordance hints if playtesting shows discoverability issues

#### 21. Advanced Accessibility
- Audit every remaining custom control for keyboard focus order, visible focus, and complete `aria-label` coverage
- Add focus trapping/restoration for overlays and mobile context menus
- Add screen-reader labels for dynamic combat targeting state beyond the current log/status support
- Device-test high-contrast, reduced-motion, and font-size scaling against the mobile layout

#### 22. Localization Framework
- Expand locale coverage to remaining hardcoded user-facing strings beyond the current action/target/settings-language foundation
- Decide whether to keep the in-code locale registry or move it to `locales/en.json` / `locales/es.json` once the build pipeline supports external locale assets cleanly
- Content templates still use hardcoded safe/mature/adult strings; migrate them to locale keys when narrative text coverage becomes a priority
- Add community-facing translation workflow once English/Spanish coverage is broad enough to maintain

---

## Architecture Notes for the Next Agent

### File Layout
```
app/
  src/core/
    app.js           — Main game state, combat loop, encounter system, AI (~6173 lines)
    content-system.js — Template engine, content tiers, localization registry (~463 lines)
    serialization.js  — Binary save/load codec (~276 lines)
    module-system.js  — Mod loader and hook system (~275 lines)
    marketplace.js    — Built-in content pack metadata (~140 lines)
  src/ui/
    global-nav.js     — Navigation helpers (~20 lines)
    settings-nav.js   — Settings overlay logic (~16 lines)
    mod-ui.js         — Mod manager UI (~204 lines)
    market-screen.js  — Marketplace UI (~287 lines)
    market-nav.js     — Marketplace nav (~17 lines)
  template.html      — HTML shell, CSS, inline screens (~2000 lines)
  test/test.js       — 186 tests, syntax/structure/combat behavior
  build.js           — Concatenates all modules into single HTML file
  dev.js             — Development server with watcher
```

### Key Patterns
- **No frameworks.** Vanilla JS. All state is in the `App` object.
- **Single-file output.** `build.js` concatenates all `src/` JS into `template.html` → `dist/you-are-wild.html`
- **Build order:** `serialization.js` → `app.js` → `module-system.js` → `content-system.js` → `marketplace.js` → UI modules. Globals are initialized in that order.
- **Content system:** All text is generated via `CONTENT.getContent(path, context)` which picks the appropriate tier based on `maxTier` preference. Adult tier is default.
- **Tests:** Run `cd app && node test/test.js`. All tests must pass. Add new tests for new features.
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
