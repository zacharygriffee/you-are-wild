# You Are Wild — Next Objectives

> Handoff document for the next agent. This is a **porn game that can be turned into SFW, not the other way around**. Default settings are adult. All content is tiered (safe/mature/adult) with adult as the default.

---

## Current State

- **Build:** 334/334 tests pass, 11/11 lint modules clean, viewport smoke checks pass, dist fresh
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
- Default main-context actions are simplified: creature interactions live on party/creature panels in exploration and combat, Search is hidden until stronger mechanics exist, Inventory remains available
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
- Exploration party interaction has a first-pass multi-actor model: party cards can toggle multiple active actors, selected actors can act together against one party/creature target, party play-fighting is nonlethal by default, group feast uses a selected primary consumer with helpers, and group/single feed can place selected party members into another party member's stomach with capacity checks
- Landmark interiors have a first-pass persistent 5x5 room map stored on the overworld structure tile; entering switches movement/map rendering to the interior, interior movement persists room creatures, room features derive from the origin biome `structureTable`, cave-like structures use cave interiors while others use indoors, and exiting restores the overworld tile context
- Party play-fighting now has a moddable resolver plus `settings.partyPlayFightMode`, keeping nonlethal as the default while allowing harsher outcomes; chewing-enabled group feast now splits a target into portions across selected actors instead of always routing through one primary swallow, non-chewing group feast chooses a selected actor that can fit the target as primary instead of forcing the first selected helper to consume, and swallowed area creatures are removed from the active tile/persisted tile creature list instead of lingering as hidden non-corpse entries
- Exploration now has stat-gated multi-target APIs (`outsideActionOnTargets`, party target indexes, creature target ids) so one capable actor can resolve one action across multiple party/creature targets while low-stat actors are blocked from overextending
- Quest system has a first-pass foundation: quest-giver creatures can carry `quest` objects, authored quest templates can spawn quest givers from structure encounters, quest cards expose accept/view actions, accepted quests render in a quest log with status filtering, turn-in filtering, title/status sorting, styled route/checkpoint previews with complete/current/pending states plus current-checkpoint distance/direction guidance, known-terrain route hints for roads/bridges/rough terrain without materializing unknown tiles, map-focus actions for next objective markers, optional deferred reward turn-in, quest-giver turn-in routing with map focus when giver location is known, defeat/find/consume/seduce/travel objective progress uses a shared matcher, escort objectives support explicit ordered route/checkpoints, rewards can grant XP/gold/items/recruits, and accepted quest state plus player gold persist in save version 10
- Merchant/trade system has a first-pass foundation: merchant creatures can carry stock, creature cards expose trade actions, the trade screen supports buying and selling items with player gold, expensive/rare purchases require confirmation, merchant stock can refresh after three in-game days, authored stock tables can place merchants in safe/commercial structures, inventory/trade surfaces support item category filtering and value/name/type sorting, corpse loot can grant generated or authored gold rewards, and save version 10 persists quest state, player gold, day count, equipment metadata, perk state, and party leader
- Equipment system has a first-pass foundation: `ITEMS` entries can declare equipment slots, numeric `equipBonus` fields, and non-numeric accessory `equipEffect` hooks, player equipment supports head/body/hands/feet/accessory slots, normalized creatures carry equipment slots plus inventory for future/modded use, inventory exposes player equip/unequip actions, non-player equipment renders as read-only card/stat metadata instead of player-like management UI, equipment stat baselines recalculate deterministically on equip/unequip/load, authored equipment tables feed merchant stock plus corpse/structure loot placement, equipped items render in inventory and character stats, and save version 10 persists equipped slot metadata plus baseline stats
- Player stat surfaces share the same party-player reference: party rendering, character stats, autosave, and manual save converge `App.player` onto the canonical party member if a stale duplicate reference appears, preventing the desktop Stats view and party card from showing conflicting vitals/combat stats
- Skill/perk tree has a first-pass foundation: level-up now queues player perk choices instead of random grants, the player can choose from predator/seducer/survivor archetype trees plus matching species-specific trees, the perk selection modal filters by tree, perks can require prior tree/perk investment, selected perks apply numeric stat bonuses and non-numeric `perkEffect` hooks, pending choices render from character stats, character stats expose respec/debug perk controls for balancing, and save version 10 persists selected perks plus pending choices
- Party management UI has a first-pass foundation: party cards expose drag/drop reorder with arrow-button fallback, leader, role, AI order, detailed stats, and dismiss controls, the selected leader and assigned non-combat role are visible on party cards and mobile chips, desktop role/order selectors expose localized descriptive tooltips, mobile party chips expose reachable Act/Target controls plus a long-press management menu for stats/leader/role/order/dismiss actions, mobile role/order selector changes haptically refresh the open management menu with localized selected labels and helper descriptions, dismissed allies are removed from selection state and dropped into the current tile as neutral former party members, enemy target priority can bias toward an explicitly selected leader after prey/tasty rules, Scout/Gatherer/Guard/Support roles have small exploration mechanics for night visibility, search finds, ambush mitigation, and safe rest recovery, and save version 10 metadata persists the selected party leader plus party roles/AI orders
- Creature and party card readability has a first pass: default desktop cards and mobile chips render compact tactical bars for health/punishment, pleasure/pressure, and hunger/need with localized accessible labels/tooltips and safe clamping, plus up to three capped localized status/trait chips for high-priority states such as sleep, poison, wounds, hunger pressure, quest context, roles, and abilities; exact numeric vitals/combat details remain available through Stats/detail surfaces and existing card actions are preserved
- Card action density has a first-pass intent-menu seam: default party/creature cards keep required selectors (`Act`, `Target`, Stats/Inspect) visible, repeated primary interaction buttons move behind a localized action menu, selected actor/target state now renders as compact localized chips and selected container classes on desktop cards and mobile chips, contextual quest/trade/recruit actions stay visible only when relevant, desktop party management controls now live in expanded card details instead of the compact default action row, expanded card details no longer render dense combat/body stat blocks and keep exact numbers in Stats/detail surfaces, registered primary actions can open a sub-action sheet that records `lastIntentCommand.subAction`, mobile creature long-press and marked-target primary actions now use the same sheet path, long-press creature menus use a radial presentation scaffold over the shared intent dispatcher, corpse cards and mobile corpse chips keep direct Loot/Scavenge controls while also exposing those contextual actions through the shared intent menu, corpse-only mobile creature panels remain visible so remains are reachable on mobile, single-actor outside-combat feast/feed sub-actions including forceFeed can route through the shared sub-action engine with target cleanup, group feed can choose an eligible selected primary for explicit non-heal sub-actions, group feast respects explicit swallow-vs-chew sub-action intent, explicit group feed heal intent tends instead of consuming selected party members, menu selection records a normalized `lastIntentCommand` shape, intent dispatch returns explicit success/failure/cancel outcomes for primary party/creature actions plus contextual recruit/quest/trade/loot/scavenge actions, and dispatch still routes through existing outside-combat action functions so multi-character selection behavior is preserved
- Combat log filtering has a first-pass foundation: log panel exposes All/Combat/Discovery/Loot/Heal filters, search input, relative timestamps, explicit round/turn/actor metadata for high-traffic combat entries, screen-reader status roles, category color/icon badges, and an export action that emits the currently filtered log as text
- Combat log view preferences now persist independently: selected filter and search text are saved to `yaw-log-view`, reloaded on app init, and invalid stored values fall back safely; legacy `fff-log-view` is still read for migration
- Save-slot/new-game UX has explicit mode separation: in-game Save opens a save-focused slot surface, Load opens a load/new-run/delete-focused surface, New Game keeps its deliberate slot takeover flow, each slot summarizes the currently available mode-specific actions, occupied-slot destructive actions keep localized irreversible warnings, and delete remains scoped to the selected slot
- Repository organization/rebrand first pass is complete: active source lives under `app/`, root scripts point at that layout, generated output is `dist/you-are-wild.html`, visible active UI branding says **You Are Wild**, package/build metadata uses the new slug, and `npm run audit:branding` verifies only approved legacy migration references remain
- Sparse map generation has a first-pass foundation: biome role metadata separates region/route/feature/interior concepts, super-patch generation selects only region biomes, seeded deterministic helpers drive region selection, world seed/version metadata persists through saves, and non-region entries such as bridge/road/indoors/entrance no longer become large super-patch biomes
- Sparse map delta boundary exists: `getBaseTile()`, `getTileDelta()`, `applyTileDelta()`, and `persistTileDelta()` keep deterministic generated baseline data separate from explored/changed tile state while `worldMap` remains a compatibility cache for existing gameplay systems
- Sparse map store foundation exists: `YAW_Worlds` creates `worlds`, `tileDeltas`, `chunkDeltas`, and `entityIndex` object stores; save/load persists and reloads world metadata plus tile deltas while new successful slot saves primarily reference `worldId` and keep full `worldMap` payloads only as a failure/legacy compatibility fallback
- Mobile gesture improvements have a first-pass foundation: creature chips support long-press context menus for Fight/Flirt/Fuck/Feast/Feed/Inspect/Recruit, party context menus are viewport-bounded above the mobile action toolbar with contained scrolling, the mobile minimap supports pinch zoom with preserved scale after map refresh, swipe panel navigation keeps haptic feedback, and long-press/context actions use vibration when supported
- Accessibility has a first-pass foundation: settings now persist high-contrast mode, reduced motion, and 12px-20px base font scaling; shared visible focus styling covers native controls plus custom card/map/chip controls with stronger high-contrast outlines; desktop unit cards and mobile unit chips expose keyboard-focusable button semantics with Enter/Space activation; the log region announces updates politely; log entries use status roles; high-traffic party/creature action buttons plus persistent navigation/log controls expose `title`/`aria-label`, including dynamically injected Settings/Market/Mods nav buttons; party/creature card action-menu buttons and selected-target sub-action buttons advertise and target their dialog popup relationship; party-member and character stats render in bounded rich-content views with immediate localized close/back controls; overlays and mobile context menus trap focus, close with Escape where applicable, mobile context/action dialogs label their visible titles with `aria-labelledby`, mobile context menus also dismiss on outside pointer/tap without swallowing inside menu interaction, and opener focus is restored; combat cards/chips expose screen-reader status text for current turn, queued group action, and target selection state; and newer interaction settings persist through the same settings save path
- Party/member stats detail views now keep close/back controls in a sticky footer, suppress stale main-pane context actions while rich details are open, and closing stats during combat restores the active party turn instead of falling back into exploration
- Multi-target exploration has a first-pass UI foundation: party and creature cards can mark targets, selected targets surface stat-gated context actions with escaped actor/target summaries, one actor can resolve actions across marked party/creature targets, group actors still resolve against a single marked target, equal-count actor/target selections resolve as ordered paired actions unless the actor and target sets are identical, identical actor/target sets route to mutual-group semantics for fight/feed/social and reject mutual feast, target-subset and actor-subset self-included selections now route to mutual-group semantics instead of the generic unequal many-to-many rejection, selecting an ally first replaces the default player selection instead of silently creating an unintended player+ally group, self-included group fight resolves as shared sparring, self-included group feed tends the target instead of consuming helpers, explicit non-heal mutual feed sub-actions reject without silently tending, self-included group feast rejects with clear selection guidance instead of routing self-consumption, single-actor and mixed multi-target feast reject or skip direct self-targeting while still resolving valid non-self prey, self-included social actions share pleasure with selected participants, three-participant self-included feed/flirt/fuck/fight cases are covered, player-included group feed treats the player as a helper while eligible selected party prey are fed to the consumer, marked-target self-included feed/flirt route through the same group semantics, multi-target feed no longer consumes the acting party member, skips full party targets only for heal/default tending instead of blocking explicit non-heal feed sub-actions, direct party/creature multi-target helper APIs now preserve explicit sub-action options and return the shared resolver success/failure result, marked-target and single-target wrapper APIs also return resolver success/failure results, single-actor group-wrapper paths propagate rejected underlying action results through direct wrappers and intent dispatch, low-stat marked multi-target actions preserve selections for correction, unequal many-actor/many-target selections still reject with a localized count-aware correction log while preserving selections for correction instead of silently dropping helpers, party actor/target selections persist through save metadata, tile-bound creature targets are excluded from save metadata, creature targets clear on tile/interior transitions, and actor/target selections are normalized after dismissal, containment, corpse conversion, and load/reset
- Group exploration outcome summaries now route through locale keys for feed transfers, tending, play-fighting/sparring, chew-splitting, feast guardrails, feast assists, and shared social actions instead of leaking hardcoded English during non-English play
- Group attacks against non-hostile social/timid creature groups now resolve one shared tile reaction instead of repeating flee/hostility reactions once per selected actor
- Selected-target context actions now localize and escape target counts plus clear labels, preventing raw locale keys from appearing in the action bar
- Persistent shell localization now has a reusable `data-i18n` pass for static text, titles, accessible labels, and placeholders; the main menu, top navigation, dynamically injected Settings/Market/Mods nav buttons, log controls, action legends, create-name placeholder, panel expand controls, swipe hint titles, core settings shell, mod-manager shell/status/action/loading copy, and marketplace shell controls opt into English/Spanish relabeling when the language changes
- Localization has a first-pass foundation: `CONTENT.locales` exposes English/Spanish keys, `CONTENT.t()` supports variable interpolation, `CONTENT.setLanguage()` persists language preferences, settings exposes an interface language selector, high-traffic action/target labels route through locale keys, mobile unit-chip actor/target/action labels localize with accessible names, desktop party-card actor/target/action/management controls localize with accessible names, desktop creature-card actions and combat target-selection controls localize with accessible names, compact unit status/trait chips localize with accessible group labels, corpse loot/scavenge card actions localize with accessible names, inventory, trade, quest-log, tutorial steps/buttons, perk/stat progression, mod-manager shell/actions, marketplace, panel expand, and static create-shell action buttons/fields localize with accessible names, mobile party/creature context-menu labels plus accessible management field labels localize through the active language, save-slot/new-game labels, accessible action names, destructive confirmations, settings data-clear/save-delete confirmations and alerts, save load-recovery feedback, merchant purchase confirmations, transaction feedback, trade/inventory filter controls, trade/inventory empty states, inventory equipment headings/summaries/effect labels, combat-log filtered-empty states, equipment feedback logs, quest empty states, quest accept/duplicate/complete feedback, quest route/status/terrain guidance, party leader/reorder/role/order assignment feedback, marketplace install/download feedback, single and multi-target exploration action result summaries, incompatible-save recovery prompts, status alerts, flee feedback, capacity-blocker feedback, structure/interior movement feedback, Instant Win/cheat feedback, ally/enemy AI status feedback, combat outcome/turn-guard feedback, sync failure feedback, submissive recruit prompts, recruit feedback, feed-blocker feedback, inventory-full feedback, quest-routing feedback, and perk progression/respec feedback are localized
- Dormant fallback creature interaction menus now use localized visible/accessibility labels, escape rendered creature names/icons/status text, and keep party/creature indexes independent if a mod or old flow calls them directly
- New-game/save-slot UX has a first pass: main-menu New Game opens slot selection, the load-mode slot manager exposes an always-visible New Game action plus per-slot New Run takeover, empty and occupied slots show localized state hints for load/new-run modes, occupied slots require irreversible overwrite confirmation, cancelled occupied-slot takeover preserves the current slot, approved takeover opens character creation for the chosen slot, autosaves update per-slot timestamps, manual saves warn before overwriting another occupied slot, delete-slot warnings are scoped to the selected slot, destructive confirmations and status alerts use the same localized display slot labels as the slot cards, deleting a slot only clears that selected slot and refreshes the manager in the current load/new-run mode, failed load/recovery flows do not enter the game screen, new-run mode hides unrelated save-current-game actions, and the slot manager uses responsive slot cards/action grids plus a viewport-bounded scrollable modal surface with mode-specific localized dialog labels verified in browser at 393x852 mobile and 1365x768 desktop viewports
- Playwright viewport smoke checks now run through `npm run full-build` and can be run directly with `npm run test:viewport`; they verify mobile/desktop built-page load, horizontal overflow, high-contrast/reduced-motion/max-font accessibility rendering, save/new-game modal bounds, large-map localization hooks, mobile party-panel button reachability after the slide transition settles, and mobile party/creature long-press context-menu bounds above the action toolbar
- Large-map low-LOD discovery has a first pass: the map panel renders a discovered-region grid around the player, overlays landmarks/structures/entity/item points of interest plus next active quest checkpoint markers, supports zoom/pan/recenter controls with a visible viewed-region label, and avoids materializing unknown generated tiles into the compatibility `worldMap`
- Save-slot world migration has a first pass: autosave/manual save persist tile deltas to `YAW_Worlds` first, then write compact slot payloads with `worldMeta.worldId`, explored keys, and player/session state instead of duplicating durable tile payloads; if the world-store write fails, the slot payload keeps the old full `worldMap` fallback
- Deterministic organic biome generation has a first-pass foundation: `WorldGen` provides seed/version/purpose-based hash, value noise, fractal noise, cellular macro-region cells, deterministic chance, and weighted picking; `getBaseTile()` now derives biome, macro biome, elevation, moisture, heat, fertility, danger pressure, region-cell metadata, and terrain tags from seed + coordinates instead of square super-patch regions; beach is derived from land near water, POIs/roads/bridges are deterministic overlays, bridges require road-water crossings, first-discovery descriptions/landmarks/structures plus first-entry wild and structure occupants use seeded coordinate rolls; mutable tile state still persists as deltas over the generated baseline; and the map panel/mobile map card expose a safe current-tile readout for biome, coords/time, danger, known structure/landmark, and terrain tags
- Biome traversal mechanics have a first-pass deterministic contract: base tiles expose traversal metadata (`passable`, `traversalCost`, `requiredCapability`, `routeModifier`), water is blocked without a capability or bridge, bridges make crossings passable, roads reduce route cost without replacing base biome identity, biome trait lookup has backward-compatible defaults for current/modded biome rules, encounter-pressure summaries can factor roads/POIs/night/local modifiers, and effective map summaries are recomputed through `App.getTileMapSummary()` so discovered structures, merchant creatures, quest relevance, and deltas do not leave stale UI metadata
- Starting-area safety has a first-pass generator-versioned guarantee for new worlds: version 2 worlds add a deterministic short start road plus nearby rest-site POI, the rest-site resolves to a rest-capable camp when discovered, `WorldGen.validateStartArea()` checks safe passable radius, low-danger resource loop, route access, rest candidate, early POI, and hard-lockout risk, and new-game/default serialization metadata now uses generator version 2 while loaded legacy saves preserve their stored version
- POI and route-anchor generation has a first-pass deterministic budget/spacing seam: each macro region exposes stable category budgets and spaced candidates for settlement, rest-site, resource-site, danger-site, landmark, and structure POIs; route-capable POIs become route anchors for road segment intent with center fallback; and tile POI lookup resolves candidate anchors without materializing unknown tiles
- Map tile art has a first-pass metadata seam: minimap, interior minimap, and large-map cells now expose `data-tileset-key`, `data-base-tileset-key`, `data-map-kind`, and route shape metadata from a centralized `MAP_TILESET_KEYS` registry while preserving emoji fallback and base biome identity; route visuals infer straight, corner, T-junction, intersection, and dead-end keys from known/visible route neighbors; interior visuals expose room, cave-room, exit, wall, and structure-feature keys; the proposed painted tileset is evaluated in `docs/map-tileset-evaluation.md`, with licensing/source confirmation and missing transition/special-biome tiles deferred before asset import

---

## Open Objectives (Priority Order)

## Next Execution Goals

1. **Harden self-included multi-creature interactions.** Identical actor/target sets now have mutual-group handling; continue edge-case coverage for richer unequal non-asymmetric groups and only change behavior where the current resolver routes helpers, targets, or self-actions incorrectly.
2. **Keep the save-slot/new-game flow tight.** Explicit save/load/new mode separation is in place; continue device-testing that the load menu exposes a clear New Game path, slot cards can start a new run or take over an existing slot, occupied slot takeover requires an irreversible overwrite warning, empty slots read as new-run starts, and delete remains scoped to one slot with an irreversible warning.
3. **Device-test mobile save and party surfaces.** Automated viewport smoke now covers standard mobile modal, slot, panel, and long-press menu bounds; confirm the same surfaces with real mobile browser chrome and safe-area variants.
4. **Continue accessibility/localization pass on high-traffic controls.** Automated viewport smoke now covers high-contrast, reduced-motion, and max-font rendering; keep preferring labels/tooltips and focus behavior for controls players hit constantly before lower-traffic debug or admin surfaces.
5. **Evaluate the proposed terrain tileset for map rendering.** First-pass evaluation, metadata seam, neighbor-aware route shape keys, and interior room/exit/wall metadata are complete; do not import the image until licensing/source ownership is confirmed. Next work is extracting owned assets, mapping them to `MAP_TILESET_KEYS`, and adding visual coverage for missing transitions/special biomes.
6. **Strengthen biome/map mechanics and traversal.** Make deterministic worldgen mechanically playable, not just organic: formalize start-area safety, traversal metadata, beach derivation, roads/bridges as overlays, POI budgets, route seams, encounter pressure hooks, and safe map UI summaries while preserving sparse-grid architecture and save compatibility.
7. **Evolve card action density into intent navigation.** Preserve the current multi-character interaction flow while making cards more creature-focused: keep `Act`, `Target`, and Stats/Inspect reachable, keep contextual actions only when relevant, and use the existing action-menu seam as the accessible fallback for a future radial/intent picker plus bottom action sheet.
8. **Defer larger design decisions unless they block mechanics.** Sparse-map mobile ergonomics, advanced quest scripting, richer party dismissal dialogue, and creature equipment management should wait until the current mechanics/UI loop is stable.

### 🟡 Tier 2: High Impact

#### 1. Remaining Multi-Creature Interaction Model
- Expand the first-pass target-selection UI with richer mobile affordances if playtesting shows the `Target` buttons are too subtle; the context action area now shows escaped actor/target summaries before resolving actions
- Further harden party-to-party feeding when mixed self-target/helper/prey groups are selected; selected helpers now reject or route more clearly in the covered one-to-many/many-to-one cases, player-included group feed keeps the player as helper instead of prey, one-actor multi-target feed skips full party targets with explicit summary feedback only for heal/default tending while explicit non-heal feed sub-actions can still resolve through marked-target and direct helper paths, explicit group forceFeed chooses an eligible selected predator even when a helper was selected first, self-included `fight` spars across participants, self-included `feed` tends the target instead of consuming helpers while explicit non-heal mutual feed intents reject and preserve selections for correction, self-included social actions share pleasure with participants, three-participant self-included feed/flirt/fuck/fight cases are covered through direct and marked-target paths, identical actor/target sets plus target-subset and actor-subset actor/target selections route to mutual-group fight/feed/social handling, and self-included `feast` rejects with selection guidance, but richer unequal non-asymmetric groups still need explicit semantics
- Continue testing multi-select stability through more edge cases: current coverage includes target cleanup for dismissal, creature defeat, containment, load/reset, save metadata persistence for party selections, tile-transition cleanup for creature targets, direct helper success/failure return contracts, equal-count paired many-to-many resolution, unequal many-to-many rejection preserving selections with localized correction guidance, and the core three-participant self-included action patterns
- Expand asymmetric one-to-many and many-to-one exploration action resolution:
  - `c2 + c3 -> c1`: both selected actors act together on one target; fight is two-against-one, feast uses a primary consumer unless chewing/splitting is available
  - `c1 -> c2 + c3`: one actor acts across multiple selected targets only when stats/skills allow it, such as high dexterity for fighting multiple targets or sufficient social/pleasure ability for flirting multiple targets
  - `c1 + c2 + c3 -> c1`: support self-included groups where the target may act on themself while other selected actors also act on the same target, or where the whole group acts non-asymmetrically on each other
- Keep party-vs-party fight interactions as play-fighting by default, but keep the resolver moddable so projects/settings can opt into harsher outcomes
- Expand play-fight outcome hooks into UI/mod configuration if the project needs visible controls beyond the current resolver and setting
- Add more feast variants beyond the current swallow and chewing-split branches
- Keep primary-consumer feast semantics explicit: if multiple helpers feed one prey and chewing is unavailable, helpers assist a selected primary consumer who can fit the target instead of all independently swallowing the same prey or forcing the first selected helper to consume
- Keep non-party persuasion deferred: exploration group actions remain player-controlled for party members only
- Keep combat group actions separate from exploration group actions; combat already uses turn-order consequences and slowest-participant resolution

#### 2. Card Density and Intent Navigation
- Keep default party/creature cards focused on creature identity and tactical state: portrait/icon, name, disposition/role/status summary, three tactical bars, a capped set of status/trait chips, and only the selectors needed for the current interaction flow.
- Preserve visible `Act`, `Target`, and Stats/Inspect controls where they are needed; `Target` is part of the current multi-character selection workflow and should not be removed while target selection still depends on it.
- Continue moving repeated primary action buttons off every default card. The current action-menu seam should remain the accessible fallback path, with future radial/intent navigation treated as an accelerator rather than the only way to act.
- Preferred interaction direction: tap/click focuses a unit, Quick Action/Menu opens the accessible action sheet, long-press or right-click can open a radial/intent menu, radial selection chooses only primary intent, and sub-actions/confirmation/target prompts resolve through a bottom or compact action sheet.
- Do not create a parallel action system for the radial menu. Normalize intent into command metadata where useful, then dispatch through existing outside-combat/combat action functions, existing sub-action definitions, existing content-tier label helpers, and existing target/actor selection state.
- Preserve multi-character behavior while reducing density: party actor selection, target marking, party-vs-party actions, creature targeting, combat target selection, contextual quest/trade/recruit/loot/scavenge actions, and modded primary/sub-actions must keep working.
- Default card content should not show full numeric stat blocks, full combat attributes, equipment/body/perk detail, or every possible primary/sub-action. Exact numbers and deep data remain in Stats/detail surfaces.
- Keep radial/action-sheet UI accessible and reversible: semantic buttons, labels/titles, Escape/outside-tap closing, safe viewport positioning, reduced-motion/high-contrast compatibility, no color-only meaning, no hidden gesture as the sole path, and no accidental destructive/high-impact action bypasses.
- Test card density changes against desktop and mobile: essential selectors remain reachable, action menus preserve existing dispatch, tactical bars remain accessible and clamped, mobile chips do not overflow, and selected actor/target state survives action-sheet/radial flows.

#### 3. Brand Transformation
- Check final commercial availability before release naming is locked; the quick search looked cleaner than `Wildbound`, but this is not a legal clearance substitute
- Keep **You Are Wild** as the canonical project title unless availability clearance finds a blocker; acceptable shorthand/acronym options are **YAW** or **YW**, with "You're wild" reserved for tagline/UI copy rather than as a separate brand
- Continue migration-safe cleanup of old storage names only where compatibility allows; active writes now use `yaw-*`, `YAW_Saves`, and `YAW_Modules`, while approved legacy aliases remain for existing saves/settings/modules
- Decide whether to remove or further quarantine `legacy/` and `archive/` before release packaging
- Keep `npm run audit:branding` passing whenever source, docs, or generated dist change

#### 4. Repository Organization
- Keep active source under the cleaner `app/` layout; update root package scripts and docs whenever layout changes
- Review `archive/` and `legacy/` retention policy so old reference material is quarantined without confusing active branding audits
- Ensure repository metadata stays aligned with GitHub defaults: local branch `main`, remote `origin`, and README/build instructions aligned with the final layout

### 🔵 Tier 4: Lower Priority

#### 7. Sparse Map Generation Foundation
- Expand the large-map low-LOD view with mobile-specific ergonomics once traversal controls settle
- Proposed painted tileset evaluation has a first pass in `docs/map-tileset-evaluation.md`, and map cells now expose tileset metadata keys, interior room/exit/wall keys, plus neighbor-aware route shape keys while retaining emoji fallback. Before image implementation, confirm licensing/source ownership, extract individual tiles into generated/owned assets, map each tile to `MAP_TILESET_KEYS`, and fill coverage gaps for manor, road-water/coast transitions, river shapes, richer bridge span variants, and future snow/desert/special biomes.
- Strengthen the biome/map system under this doctrine: terrain says what exists, routes say how civilization/travel cuts through it, POIs say why the player cares, deltas say what happened, and UI says what the player can understand. Keep source changes in `app/src/` and `app/template.html`, regenerate `dist/you-are-wild.html` only through the build, preserve the single-file distributable, and keep the current sparse deterministic coordinate grid while adding accessor/query seams so a future chunk, quadtree, or spatial-index migration does not require gameplay rewrites.
- Maintain hard determinism for all base-world and persistent/shareable simulation outcomes: no raw `Math.random()` in base terrain, roads, water, beaches, bridges, POIs, landmarks, structures, encounters, or persistent interior generation. Seeded randomness must include `worldMeta.seed`, `worldMeta.generatorVersion`, a stable namespace, stable coordinates or feature IDs, and an explicit time scope only when deterministic time variation is intended. Base world truth must be reconstructible from seed/version/coordinates, while explored, looted, killed, recruited, depleted, corrupted, quest, and local-condition changes stay in deltas.
- Add map balance invariants and tests for the starting area: safe/grove-like radius, at least one rest-capable structure within a bounded distance, at least one low-danger food/resource loop, no hard water/cliff lockout, route/road access within a bounded distance, and a reasonable route to an early POI/landmark. The deliverable can start as a deterministic safety validation helper plus tests proving the default seed/start does not hard-lock the player.
- Formalize terrain traversal metadata without overbuilding the capability system: deep water is blocked unless swimming/flying/bridge/explicit capability applies, shallow water is passable with cost, beach/coast is passable, cliff is high cost or blocked unless capability/route applies, and road lowers traversal cost. Add or prepare `passable`, `traversalCost`, `requiredCapability`, and `routeModifier` metadata, with tests covering water, bridge, beach, road, and cliff passability/cost.
- Keep beach as a derived coastal state, never a random inland pick. A tile may display as beach only when it is land, adjacent to or near water, and elevation/roughness supports a coast instead of cliff or marsh unless an explicit POI/mod override says otherwise. Add or keep a deterministic beach/coast helper plus tests proving beach may appear next to water, cannot appear far inland, and high-roughness water edges can resolve to cliff/rocky shore/marsh rather than generic beach when supported.
- Keep roads as overlays that preserve ecology and base biome identity. Avoid setting `tile.biome = 'road'`; prefer `baseBiome`, `derivedBiome`, `displayBiome`, and `overlays.road`. Roads should influence rendering, movement cost, encounter pressure, POI connectivity, and quest routing without erasing forest/swamp/plains encounter context. Add tests showing a road over forest still preserves forest as the base biome.
- Keep bridges as constrained route-water features, not random biomes. A bridge may exist only when a road route crosses water, the crossing width is within allowed span, both sides anchor to non-water road-capable land, the direction is coherent east-west or north-south, and no better nearby crossing already satisfies the route. Represent bridges as overlay features with `id`, `direction`, `roadId`, `spanIndex`, and `spanLength`, and test that bridges require road anchors, require water crossing, do not appear without roads, and match anchor direction.
- Move POIs away from independent per-tile scatter and toward deterministic region budgets with spacing rules. Initial categories should include `settlement`, `restSite`, `dangerSite`, `resourceSite`, `landmark`, `structure`, and `routeAnchor`; budgets can start around 0-1 settlements, 1-2 rest sites, 1-3 resource sites, 1-2 danger sites, one major landmark, and 1-3 minor landmarks per region. Add deterministic POI candidate/budget helpers and tests for stable placement plus minimum spacing.
- Add route seams without a full pathfinding rewrite: derive route anchors from POIs/settlements/major landmarks/rest sites/region gates, deterministically build route edges, and convert them into road overlays. A first pass can use deterministic line or spline sampling with partial terrain-cost awareness; leave room for later least-cost/A* replacement. The guiding architecture is: spline gives route intent, terrain cost correction makes it plausible, bridge pass resolves water crossings.
- Add a conservative encounter-pressure seam while preserving biome encounter tables and combat behavior. `getEncounterPressure(tile, context)` or equivalent should eventually consider time of day, nearby POIs, danger pressure, road vs wilderness, party size/noise, recent combat, corpses/scavenger state, local depletion, biome danger, structure threat, and quest modifiers. First-pass tests should prove roads can lower wilderness pressure, danger POIs can increase it, and night can modify pressure where applicable.
- Respect generator versioning and save compatibility. `worldMeta.seed + worldMeta.generatorVersion` is canonical base world truth; if generation changes materially, bump or guard generator behavior rather than silently mutating old saves. Tests should show mutable deltas do not alter deterministic base generation.
- Expose safe map UI semantics through a helper such as `getTileMapSummary(tile)`: display biome, terrain summary, road/bridge/POI marker, danger/safety hint, coordinates, discovered/undiscovered state, rest availability, quest relevance, and merchant marker where known. First-pass helper and tests now cover these fields; keep summaries SFW/non-explicit when expanding the visible map UI.
- Keep mod compatibility by adding or using biome traits instead of hardcoding every rule to fixed biome IDs. Backward-compatible trait helpers should support fields like `wet`, `rough`, `lowland`, `organic`, traversal cost, supported structures, and forbidden derived states such as inland beach. Add tests for trait lookup fallback on existing and modded biome definitions.
- Verification for each implementation slice should include `npm run full-build` from the repo root when possible, and final reports should include architecture changes, files changed, determinism policy, raw `Math.random()` audit, tests added/updated, command exit codes, save compatibility notes, future chunk/quadtree migration safety, and deferred risks.

#### 8. Advanced Quest Scripting
- Expand quest scripting beyond the first-pass checkpoint/turn-in routing foundation, such as richer branching quest steps, multiple valid turn-in NPCs, and smarter route planning that can choose roads/terrain-aware paths instead of only summarizing known direct-path terrain

#### 16. Advanced Equipment
- Keep non-player equipment read-only for now; revisit full creature equipment management only if party/inventory systems need player-controlled ally loadouts

### 🟣 Tier 5: UI/UX & Polish

#### 18. Advanced Party Management UI
- Polish drag/drop party reordering after device testing; arrow-button fallback remains for constrained browsers and touch layouts
- Expand party role configuration beyond the first mechanical Scout/Gatherer/Guard/Support hooks if roles need deeper progression, visible tuning controls, or mod-authored role effects
- Expand dismissal consequences/dialogue if party relationship systems become meaningful beyond the current neutral former-ally tile drop
- Device-test the mobile party long-press management menu on real devices and decide whether it needs richer role/order descriptions or a dedicated full-screen management view; automated viewport smoke now verifies the current menu stays bounded above the action toolbar

#### 18a. Creature And Party Card Readability
- First pass is complete: default cards and mobile chips use shared tactical-bar helpers for health/punishment, pleasure/pressure, and hunger/need; bars clamp safely, default missing hunger to 0, expose localized accessible labels/tooltips, and keep exact numbers in Stats/detail views.
- Cards and mobile chips also render a capped, localized trait/status strip for the highest-priority visible state. This keeps creature identity readable without restoring dense stat blocks.
- Future polish should focus on real-device density and action grouping only if playtesting shows card actions still feel crowded. Do not remove existing card actions without replacing their workflow.

#### 18b. Card Action Density And Intent Navigation
- First pass is complete: primary action spam is no longer rendered directly on default party/creature cards. Cards preserve current `Act`, `Target`, and Stats/Inspect selectors, keep relevant special actions such as recruit/quest/trade visible, and use a shared bottom action menu for Fight/Flirt/Fuck/Feast/Feed/Inspect intent selection.
- The action menu is a scaffold for later radial/gesture navigation, not the final radial wheel. Creature long-press and desktop secondary-click now render a radial presentation scaffold through the same `selectIntent()` dispatch path, which records the command source for sheet, radial, long-press, secondary-click, and marked-target entry points; the visible menu button remains the accessible sheet fallback. Registered primary actions use a sub-action sheet seam for default/alternate action details on menu, secondary-click, creature long-press, radial entry points, and selected-target action-bar paths, single-actor outside-combat feast/feed selections can execute through the shared sub-action engine, group feast honors explicit swallow-vs-chew intent when chewing is enabled, explicit group feed heal intent tends instead of consuming selected party members, long-press creature menus preserve contextual quest and trade intents instead of only exposing baseline actions, and party long-press management menus include a localized bridge into the shared party intent sheet.
- Preserve the current multi-character interaction model when iterating: selected actors, marked targets, party-to-party actions, creature actions, combat target selection, and contextual special actions should continue to route through the existing shared action functions or compatibility wrappers.
- Treat this as a UI-density task, not a content task: do not expand or rewrite mature action content while refining cards, radial navigation, bottom sheets, or command plumbing. Preserve existing content-tier label helpers and existing sub-action definitions.
- Next implementation should keep creature cards close to compact trading-card density: icon/name, disposition or role, three tactical bars, up to three status/trait chips, required selectors, and an optional menu/quick-action control. Do not restore default full stat blocks, equipment/body/perk detail, or every primary/sub-action button on each card; those belong in Stats/detail or contextual sheets.
- Preserve selectors as first-class workflow controls. `Act`, `Target`, and Stats/Inspect stay visible anywhere they are needed for party actor selection, target marking, or detailed numeric inspection. The density reduction should focus on repeated primary action spam and sub-action clutter, not on removing target/actor affordances.
- The radial/intent menu should remain an accelerator rather than the only path. Mobile long-press now has a radial-ready presentation over semantic buttons; future work can add true press-hold/slide-and-release wedge selection. Desktop already has the menu button plus secondary-click fallback and can later gain pointer-drag radial acceleration. Mobile context menus now close on outside tap, Escape, cancel, or action selection; continue keeping them bounded near screen edges, avoiding unnecessary target-card coverage, respecting reduced motion/high contrast, and preserving accessible semantic button controls.
- Use bottom/action sheets for sub-actions, confirmations, target prompts, modded action overflow, keyboard/mouse accessibility, and any action whose consequences need more deliberate selection than a radial wedge. Radial should choose primary intent only; avoid deep nested radial menus.
- Keep primary intent and sub-action resolution separate. Radial entries should continue to map to existing action keys and existing sub-action definitions, then route through the shared dispatcher using the normalized command shape for actor ids, action, sub-action, target id/type, and source (`card`, `radial`, `sheet`, `keyboard`, or a similar stable source). The current sub-action sheet records selected sub-actions, updates defaults, threads single-actor feast/feed selections including forceFeed into the established outside-combat dispatch, distinguishes group feast swallow/chew intent, distinguishes group feed heal intent from containment handoff, and now supports marked-target commands with target id lists; future work can make the rest of the group-selected sub-actions mechanically distinct.
- Contextual special actions should stay compact and relevant: recruit, trade, quest, loot, scavenge, and similar buttons can remain visible when their context is present, but do not show every possible action or sub-action on every default card. Cap visible trait/status chips and keep exact stats, body/equipment/perks, and long-form details inside Stats/detail views.
- `Target` remains a visible card control because it is part of the current multi-character workflow. Do not remove or rename public/global methods or inline handler targets unless every reference and test is updated.

#### 19. New Game And Save Slot UX
- Further improve visual polish if playtesting shows the responsive slot cards/action grids are still too dense on small devices
- Keep the load-menu slot takeover flow explicit after device testing: the load menu supports New Game, per-slot new-run takeover, and per-slot delete without forcing users through settings; empty slots stay obvious new-game starting points, occupied slots must warn about irreversible overwrite, delete remains scoped to one selected slot, and localized accessible button labels should remain clear in compact layouts
- In-game Save and Load now open separate focused slot surfaces instead of one crowded mixed surface; preserve that split while polishing visuals or mobile density
- Device-test mobile save-slot management to confirm the responsive shell scrolls correctly across real browser chrome and safe-area variants; automated viewport smoke covers the standard mobile viewport

#### 20. Advanced Mobile Gestures
- Tune long-press duration and context-menu placement after device testing
- Add richer haptic patterns per action outcome if the UX benefits from it
- Consider radial/joystick map controls once core traversal semantics settle
- Add dedicated gesture affordance hints if playtesting shows discoverability issues

#### 21. Advanced Accessibility
- Continue auditing lower-traffic custom controls for keyboard focus order, visible focus, and complete `aria-label` coverage; high-traffic mobile unit-chip actions, desktop party/creature-card actor/target/action controls, inventory/trade/quest-log/perk progression actions, and corpse card actions now expose localized accessible names
- Expand focus-trap coverage if new overlays are added; current settings/mods/market/save/tutorial overlays and mobile context menus use the shared focus trap
- Expand dynamic combat screen-reader coverage if new combat states are added; current turn order, group action, and target-selection states are announced on cards/chips
- Device-test high-contrast, reduced-motion, and font-size scaling against the mobile layout on real devices; automated viewport smoke now verifies those settings at the standard mobile and desktop viewports

#### 22. Localization Framework
- Expand locale coverage to remaining hardcoded user-facing strings beyond the current action/target/settings/mobile context foundation
- Decide whether to keep the in-code locale registry or move it to `locales/en.json` / `locales/es.json` once the build pipeline supports external locale assets cleanly
- Content templates still use hardcoded safe/mature/adult strings; migrate them to locale keys when narrative text coverage becomes a priority
- Add community-facing translation workflow once English/Spanish coverage is broad enough to maintain

---

## Architecture Notes for the Next Agent

### File Layout
```
app/
  src/core/
    app.js           — Main game state, combat loop, encounter system, AI (~6650 lines)
    content-system.js — Template engine, content tiers, localization registry (~1313 lines)
    serialization.js  — Binary save/load codec (~276 lines)
    module-system.js  — Mod loader and hook system (~276 lines)
    marketplace.js    — Built-in content pack metadata (~140 lines)
  src/ui/
    global-nav.js     — Navigation helpers (~20 lines)
    settings-nav.js   — Settings overlay logic (~16 lines)
    mod-ui.js         — Mod manager UI (~248 lines)
    market-screen.js  — Marketplace UI (~343 lines)
    market-nav.js     — Marketplace nav (~17 lines)
  template.html      — HTML shell, CSS, inline screens (~2428 lines)
  test/test.js       — 284 tests, syntax/structure/combat behavior
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
