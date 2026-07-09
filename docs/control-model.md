# Control Model

This document defines the UI-safe control model for traversal, actor selection, target selection, intent selection, and inspection surfaces. It is doctrine for later UI work only; it does not implement the controls.

## Goals

- Keep routine play on one shared interaction model across mobile and desktop.
- Separate movement, selection, intent, and inspection so one surface does not hide or overload another.
- Preserve existing party, creature, combat, quest, trade, recruit, loot, scavenge, and modded action routing.
- Keep all controls reversible until a normal gameplay command is explicitly dispatched.

## Control Modes

## Interaction Plan

Routine play should route through one command-plan concept:

`Actor(s) -> Target(s) -> Intent -> Timing -> Resolution`

The source object is an `InteractionPlan`. Existing compatibility command fields may remain while older code is being migrated, but new interaction routing should preserve these plan fields:

- `mode`: `exploration` or `combat`
- `actors` and `targets`: resolved unit objects
- `action` and optional `subAction`
- `shape`: `one-to-one`, `many-to-one`, `one-to-many`, `many-to-many`, `mutual`, or `paired`
- `timing`: `immediate`, `current-turn`, `slowest-participant`, or `queued`
- `resolveAt`: null, a combat turn index, or a future turn token
- `constraints`: current-turn, hostility, reach, row, actor/target count, and target-type rules
- `distribution`: `single`, `all`, `split`, `paired`, `mutual`, `aoe`, or `chain`

Exploration and combat should differ by timing and constraints, not by unrelated UI grammars. Exploration normally uses `timing: immediate`; combat normally uses `timing: current-turn`; group combat uses `timing: slowest-participant` and resolves on the slowest participant's turn. Future area, row, chain, or multi-target mechanics should extend plan constraints/distribution rather than creating a second action system.

Invalid or ambiguous plans must preserve actor/target selection state and return correction guidance. They must not silently choose a different actor, target, distribution, or intent.

During migration, legacy transient UI state such as combat target-pick, marked combat targets, feed sub-action choice, and Sync participant choice must be readable as the current `InteractionPlan`. Those states may remain as compatibility storage while older renderers are being migrated, but UI sentences, tests, Scene Beat / log metadata, and future resolvers should treat the plan snapshot as the shared semantic shape.

Combat Feed is a current-turn plan even when it opens a sub-action picker. The picker may remain a transient intent surface, but choosing a feed sub-action should dispatch a `feed` plan with the resolved actor, target, and `subAction` instead of resolving outside the command path.

## Scene Feed and Scene Beat Doctrine

The player-facing semantic surface is the Scene Feed, not "Story." It represents the player's readable point-of-view account of what just happened. A Scene Beat is one resolved or failed gameplay beat produced from structured gameplay data.

Scene Beat is the semantic source of truth for presentation. It should be built from `InteractionPlan + ActionOutcome` or equivalent structured command/result data, not by parsing Activity Log strings. Activity Log and Scene Feed may both render related information, but they serve different audiences:

- Scene Feed: immediate readable player feedback, latest beat, recent beat sheet, and later POV narration.
- Activity Log: durable technical/history feed, filters, search, export, debugging, and continuity context.
- LLM/mod narrative layers: optional consumers that can use Scene Beats, Activity history, raw systemic JSON, or generated template output, but core play must remain functional without any LLM.

Scene Beat shape should preserve:

- `mode`, `action`, optional `subAction`, and `shape`
- resolved `actors` and `targets`
- `resultKind`, `summary`, optional `passage`, `deltas`, `tags`, `importance`, `source`, and `contentTier`
- optional `subEvents` for multiple effects from one command

Multiple mechanical effects from one command should coalesce into one Scene Beat with sub-events rather than spamming the feed. Failed actions should also be Scene Beats when the failure matters to play. For example, a physical attack that cannot reach a back-row or flying target should produce readable POV feedback explaining why the attempt fails and what kind of counterplay exists.

Scene templates are deterministic dumb-code templates first. They may match on action, mode, shape, tags, result kind, and content tier; mod templates may override by priority, but a core fallback must always remain available. Content-tier safety belongs in template matching before text is rendered.

### Quest Species Matching Doctrine

Quest species objectives match exact internal species IDs. An objective with `species: "wolf"` matches units whose internal `species` is exactly `"wolf"`; it does not fuzzy-match wolfkin-like labels, canine families, beastfolk, tags, hostile-canid categories, or related species such as fox or hyena.

Player-facing quest text should render species display names from the species registry. The internal ID `wolf` can therefore appear to the player as `Wolfkin`, and generated quest objective labels should prefer that display name when no explicit authored label is provided. Existing authored labels remain authoritative, but default content should avoid exposing raw internal IDs when a display name exists.

Generated quest objectives and structure quest-giver species pools should use registered species IDs from the currently enabled species registry. Mod species become valid exact quest targets when the mod registers the species ID. Broader family, tag, taxonomy, or target-pool quest selectors are deferred until a later quest-design pass and should not be approximated through fuzzy string matching.

### Traversal mode

Traversal mode owns movement through the world and structure interiors.

- The primary traversal surface is the 3x3 Play surface.
- The Play surface is also the primary semantic context surface: the center tile is the current location and owns biome, terrain, structure, tile-scoped event feed, items, POIs, present creatures, party-relevant state, and available local affordances.
- The eight surrounding 3x3 cells preview adjacent reachable directions and act as normal movement affordances, including corners when diagonal traversal is valid for the current world/interior rules.
- The Display map is a deliberate review and planning surface, not the routine traversal control. It can show discovered territory, route hints, quest focus, roads, bridges, and POIs without becoming the default movement loop.
- Expanded map mode remains separate from routine traversal. It may open through an explicit expand control, long press, pinch zoom, or later hotkey, but returning to ordinary movement should bring the player back to the 3x3 Play surface.
- Desktop and mobile use the same concept. Wider desktop layouts may show more state, but the command model stays aligned with touch-first traversal.
- Desktop hotkeys are additive direction shortcuts: WASD, arrow keys, or numpad-style movement may trigger the same direction choices exposed by the surrounding 3x3 tiles, without creating a separate desktop-only traversal model.
- Extra mobile movement controls, such as a micro-pad or joystick, are optional accessibility/reachability aids only. They should stay hidden or setting-gated by default so they do not compete with the 3x3 Play surface and command composer.
- Combat can temporarily reduce traversal affordances. If the whole party flees, combat returns to directional escape selection on the play surface.

### Battle mode

Battle mode should be carved out only after the actor, target, and intent model is weighted onto the party/creature/enemy panels. Combat should not become a second action UI that duplicates exploration controls in the center tile.

Battle mode owns turn order, combat constraints, and event focus. It is related to Traversal mode because battles happen on the play surface, but it is distinct from Traversal mode because routine movement is no longer the primary loop.

- Battle mode should reduce, hide, or demote routine movement affordances while combat is active. Directional movement returns only for explicit escape flow, forced repositioning, or future battle mechanics that deliberately spend a combat command.
- The party, creature, and enemy panels/chips are the primary actor and target surfaces in both combat and exploration. Combat adds current-turn and initiative constraints over the same selection model rather than replacing it.
- The center stage remains the primary combat event focus, not the primary duplicated action grid. It should show the current exchange, recent battle event summary, selected actor and target context, important status changes, and terrain or row context that matters to the next decision.
- The durable combat/debug log can remain available as history, but battle play should not require reading the lower log for the current exchange when the center stage can carry that information.
- On mobile, party access belongs in a lower reach-area party strip. The enemy strip sits above the party strip so the player can move from actor selection to target selection without opening unrelated panels.
- The intent popup, toolbelt, hotbar, or action sheet should appear between or near party/enemy selections when practical, anchored to the selected actor/target context. It may become a compact desktop popover on wide screens, but it should dispatch through the same intent model used outside combat.
- Desktop battle layout should mirror the same conceptual flow as mobile: party, intent, enemy, and center-stage combat focus remain aligned even when wider panels expose more detail.
- Flee is party-member dependent. One or more party members may flee while others remain in battle; a full-party flee exits Battle mode and returns to directional escape selection on the play surface.

#### Row And Reach Doctrine

Rows are for formation context, reach explanation, and future target protection. They are not initiative, and they do not define every interaction by themselves. Each intent owns its own reach profile.

Current implementation:

- Flying or ranged units default to the back row; other units default to the front row when combat starts.
- `Fight` uses an intent-owned reach profile: melee, ranged, or hybrid depending on actor traits and future action metadata.
- `Feast` uses a close/contact profile by default.
- Talk, Play, Feed, support, and other social/support intents ignore row reach unless a specific mechanic says otherwise.
- Flying can engage across rows. Flying targets still need an appropriate physical answer for contact-style actions.
- Ranged actors can reach flying targets and can use ranged reach from the back row. A ranged actor in the front row may need to retreat before using a purely ranged profile against grounded targets.
- Anti-flying actors answer front-row flying targets for relevant physical profiles.
- Impossible or poor physical attempts should be allowed where the target is otherwise valid. The action can consume the turn and fail with a Scene Beat explaining why, rather than presenting a generic invalid-command error.
- Current reach is intentionally narrow: the current implementation does not yet model full front-row blockers, exposed back rows, equipment reach, snare/grab, or area distribution.
- `Move Row` toggles the active actor between front and back row and consumes that actor's turn. UI copy should not imply that moving rows always solves back-row targeting.

Future formal row rules should decide these points before deeper mechanics work:

- Front-row units protect back-row units on the same side. Ordinary physical melee should not target protected back-row units while living front-row blockers remain.
- Back-row melee actors are protected but limited. They should usually Advance before ordinary physical melee unless they have reach, ranged, flying, or special access.
- If a side has no living front-row blockers, ordinary melee may reach exposed back-row targets.
- Flying still occupies a row for UI purposes. Flying can bypass row blockers, and flying targets still require flying, ranged, or anti-flying reach. Do not add a third air lane until a later formal pass needs it.
- Size, reach traits, equipment, terrain, and abilities should eventually feed into explicit helper predicates for row access instead of ad hoc card or action checks.

#### Combat Group Planning Doctrine

Combat group planning still uses the shared `InteractionPlan` model:

`Actor(s) -> Target(s) -> Intent -> Timing -> Resolution`

The combat UI grammar is:

`Lead Actor + Participants -> Target(s) -> Intent -> Commit`

- Player-facing combat group planning is `Actor(s) -> Target(s) -> Intent -> Commit`. The older Sync button is compatibility/internal terminology and should not be the primary visible route for ordinary players.
- The current turn actor is the required Lead Actor for this phase of the system. Do not allow group plans that exclude the current actor yet.
- Non-current party members may participate. Once a group plan is committed, those participants are locked into the queued group action and count as having spent their turn.
- Group combat targets one enemy by default. Multi-target group combat plans require future explicit ability, distribution, and target-resolution rules.
- Current combat group planning allows party targets only for support intents such as Feed, Heal, Guard, Assist, and future buffs. This is a phase guardrail, not the final doctrine: future combat interaction rules should allow party members, enemies, and neutral creatures to be targets for the full interaction set when explicit consent, hostility, safety, and resolution rules exist.
- If the target or participants become invalid before resolution, the plan fizzles cleanly and emits Activity Log / Scene Feed feedback. It does not retarget automatically and should not interrupt combat with a correction prompt.
- There is no universal enemy interrupt mechanic yet. Future systems can add interrupt tags, guard behavior, or enemy traits without changing the base group-planning grammar.
- Internally, current group planning may continue to queue `sync_*` actions through `syncSelection`, `syncActions`, and `queueSyncAction`. Preserve those names and save/load compatibility until a separate mechanics migration deliberately replaces them.

### Selection mode

Selection mode owns who is acting and who or what is being acted on.

- Actor selection chooses one or more party members that will perform the next command.
- Target selection chooses one or more party members, area creatures, corpses, items, merchants, quest givers, structures, POIs, or tiles that the selected actors can address.
- Actor and target selection should live on cards/chips/panels first. Center-tile summaries may reflect those selections, but should not be the authoritative place where actor/target state is chosen.
- Selection state must be visible as compact chips, selected card/chip state, or center-surface summaries before dispatch.
- `Act`, `Target`, and Inspect/Stats remain reachable while multi-character behavior depends on them.
- Multi-select must preserve existing direct, marked-target, party-vs-party, area-creature, combat-target, and modded action flows.
- Invalid or ambiguous selections should preserve selection state and return correction guidance instead of silently choosing a different command.

### Intent mode

Intent mode owns what the selected actors are trying to do.

- Primary intents are high-level commands such as fight, flirt, feast, feed, flee, trade, recruit, loot, scavenge, rest, inventory, quest, inspect, and modded actions.
- Sub-actions and confirmation prompts resolve through the existing action metadata, sub-action registry, content-tier label helpers, and command dispatchers.
- Action menus, bottom sheets, desktop popovers, and future radial controls are alternate presentations of the same intent model.
- The radial or gesture path must be an accelerator only; every intent needs a labeled, keyboard/focusable, accessible fallback.
- High-impact commands must not bypass normal confirmation, capacity, eligibility, content-tier, or target-validation gates.
- Combat intent selection should reuse the same panel-selected actor/target model as exploration. Battle-specific buttons such as Move Row, Guard/Wait, or Flee are availability differences on the same command surface, not a separate center-grid action system. Group planning should be expressed through actor badges, target marks, intent selection, and Commit Group rather than a primary Sync button.

### Inspection mode

Inspection mode owns detail views and review surfaces.

- Inspect/Stats surfaces show exact numbers, equipment, perks, body/detail metadata, inventory detail, quest detail, merchant stock, tile metadata, and debug-level state that does not belong on compact cards.
- Inspection must not mutate gameplay state unless a clearly labeled command is chosen inside the inspection surface.
- Inspection can be opened from cards, chips, the center tile, the display map, quest routes, merchant screens, inventory, and combat state.
- Desktop inspection can use bounded popovers or side panels; mobile inspection can use sheets or full-height panels with predictable close behavior.
- Escape, outside tap where appropriate, Back, and explicit close controls should return to the prior mode without dropping valid actor/target selections.

## Surface Responsibilities

### Play surface

- Owns traversal and the current tile's immediate playable context.
- Shows the tile-scoped event feed for recent local events. The tile-scoped event feed should clear on movement to a different tile, while the existing combat/debug log remains durable history available separately.
- Hosts movement affordances, local item/POI affordances, and immediate creature context.
- Supports dumb-state-machine event generation as the default viable implementation path. LLM-assisted semantics, summaries, or narration are optional future presentation layers and must not be required for core gameplay.

### Cards and chips

- Show identity, disposition/role/status summary, tactical bars, capped trait chips, selection state, and required selectors.
- Avoid full stat blocks and repeated primary action lists by default.
- Keep contextual commands visible only when they are truly context-specific, such as quest, trade, recruit, loot, or scavenge.

### Intent menu and sheets

- Present valid primary intents and sub-actions for the current actor/target context.
- Use the same dispatcher for desktop popovers, mobile sheets, and later radial controls.
- Keep focus, viewport bounds, high-contrast, reduced-motion, and long-label behavior stable.

### Display map

- Supports planning, review, route hints, quest focus, discovered terrain, known POIs, and strategic inspection.
- Does not replace the 3x3 play surface for routine traversal.

## Safety and Accessibility Constraints

- Safe content tier remains the default presentation baseline.
- Controls must use labels, titles, aria labels, or equivalent accessible names.
- No hidden gesture may be the only path to a command.
- No color-only meaning.
- No destructive, irreversible, or high-impact action should dispatch from hover, long-press preview, or accidental focus.
- Selection and intent state should survive opening and closing inspection surfaces unless the underlying actor or target disappears.

## Deferred Implementation Notes

- This document is doctrine for later UI changes.
- Later implementation should add focused tests for mode switching, selection preservation, viewport bounds, action dispatch parity, and inspection close behavior.
- Desktop action menus should receive bounded popover behavior instead of reusing mobile-only positioning.
