# Control Model

This document defines the UI-safe control model for traversal, actor selection, target selection, intent selection, and inspection surfaces. It is doctrine for later UI work only; it does not implement the controls.

## Goals

- Keep routine play on one shared interaction model across mobile and desktop.
- Separate movement, selection, intent, and inspection so one surface does not hide or overload another.
- Preserve existing party, creature, combat, quest, trade, recruit, loot, scavenge, and modded action routing.
- Keep all controls reversible until a normal gameplay command is explicitly dispatched.

## System Navigation

The startup screen prioritizes entering or resuming play. Continue, New Game, and Load Game are the primary vertical actions. Settings, Mods, and Tutorial form a compact utility group. AI Providers is an integration destination inside Settings. A Host Catalog is a conditional modding destination inside Mods only when the current server supplies a real catalog; development fixtures and example generators are not player-facing destinations. These advanced destinations should not grow the startup screen into a system-management dashboard.

Nested system screens preserve their origin. Closing AI Providers opened from Settings returns to Settings; closing Host Catalog opened from Mods returns to Mods; closing that parent then returns to the startup screen or live game that opened it. Switching from Host Catalog to My Modules preserves the underlying origin rather than adding a duplicate navigation layer. Focus returns to the invoking control when practical, with the destination screen or live-game app-menu toggle as fallback.

The live-game app menu keeps direct shortcuts to frequently needed system destinations, including Mods, AI Providers, and a server-supplied Host Catalog when available. This is deliberate: the startup hierarchy optimizes for starting play, while the in-game menu optimizes for quick interruption and return.

The normal startup layout should fit supported desktop and mobile viewports without scrolling. The startup screen remains vertically scrollable as an accessibility fallback for short displays, browser zoom, large text, safe-area insets, or translated labels. Utility controls may wrap or grow, but must remain at least 44px tall, preserve reading order, and never introduce horizontal page overflow.

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

Exploration selections with multiple actors and multiple targets default to `shape: many-to-many` and `distribution: all`: every selected actor contributes to every selected target. Targets may mix party members and local creatures of any disposition, and an actor may also be an explicit target. Only an exactly identical actor and target set infers `mutual`; partial overlap stays many-to-many. Ordered pairing requires an explicitly requested `paired` distribution and is never inferred from equal counts alone.

Invalid or ambiguous plans must preserve actor/target selection state and return correction guidance. They must not silently choose a different actor, target, distribution, or intent.

During migration, legacy transient UI state such as combat target-pick, marked combat targets, feed sub-action choice, and Sync participant choice must be readable as the current `InteractionPlan`. Those states may remain as compatibility storage while older renderers are being migrated, but UI sentences, tests, Scene Beat / log metadata, and future resolvers should treat the plan snapshot as the shared semantic shape.

Combat Feed is a current-turn plan even when it opens a sub-action picker. The picker may remain a transient intent surface, but choosing a feed sub-action should dispatch a `feed` plan with the resolved actor, target, and `subAction` instead of resolving outside the command path.

## Scene Feed and Scene Beat Doctrine

The player-facing semantic surface is the Scene Feed, not "Story." It represents the player's readable point-of-view account of what just happened. A Scene Beat is one resolved or failed gameplay beat produced from structured gameplay data.

Scene Beat is the semantic source of truth for presentation. It should be built from `InteractionPlan + ActionOutcome` or equivalent structured command/result data, not by parsing Activity Log strings. Activity Log and Scene Feed may both render related information, but they serve different audiences:

- Scene Feed: immediate readable player feedback, a newest-first exchange stream, detailed recent-beat sheet, and later POV narration.
- Activity Log: durable technical/history feed, filters, search, export, debugging, and continuity context.
- LLM/mod narrative layers: optional consumers that can use Scene Beats, Activity history, raw systemic JSON, or generated template output, but core play must remain functional without any LLM.

Scene Beat shape should preserve:

- `mode`, `action`, optional `subAction`, and `shape`
- resolved `actors` and `targets`
- `resultKind`, `summary`, optional `passage`, `deltas`, `tags`, `importance`, `source`, and `contentTier`
- optional `subEvents` for multiple effects from one command

Multiple mechanical effects from one command should coalesce into one Scene Beat with sub-events rather than spamming the feed. Failed actions should also be Scene Beats when the failure matters to play. For example, a physical attack that cannot reach a back-row or flying target should produce readable POV feedback explaining why the attempt fails and what kind of counterplay exists.

Scene templates are deterministic dumb-code templates first. They may match on action, mode, shape, tags, result kind, and content tier; mod templates may override by priority, but a core fallback must always remain available. Content-tier safety belongs in template matching before text is rendered.

See [Scene Feed DSL](scene-feed-dsl.md) for the concrete `SceneBeat` shape, `ActionOutcome` input, template registry contract, content-tier rules, and presentation invariants.

See [Feast / Containment Doctrine](feast-containment-doctrine.md) for the V1 containment lifecycle, compatibility adapter over current stomach/prey fields, swallow/release/terminal rules, and feast/container mod seams. See [Feast / Containment V2 Doctrine](feast-containment-v2.md) for the vital-damage model and the rule that core Feast does not create itemized creature-piece inventory.

See [Holdings / Inventory / Containers Doctrine](holdings-model.md) for the player-facing distinction between shared pack inventory, selected-owner equipment slots, selected-owner body containers, tile items, and corpse/remains pools.

See [Balance / Cost Doctrine V1](balance-cost-doctrine.md) for hunger sign semantics, conservative action/travel costs, Spirit breakthrough behavior, action cost previews, and the boundary between V1 economy pressure and deferred broader balance work.

## Accepted Mechanics Decisions

These decisions are settled doctrine until a later explicit mechanics pass reopens them:

- Known-impossible physical actions remain selectable when the actor and target are otherwise valid. The target control previews the reach warning; committing pays the action cost, spends the turn, and resolves as an in-world Scene Feed failure rather than a correction error.
- Nonviolent victory should grant equivalent baseline XP to combat victory. Reward flavor, tags, relationship changes, quest hooks, or follow-up opportunities can differ, but social routes should not be mechanically inferior by default.
- Perks are a feature layer, not a prerequisite for core mechanics. The default game should expose a minimal, approachable perk surface: early perks can be stat bumps and small passives, milestone perks can unlock mechanics, and deeper procedural or moddable perk trees are deferred until the core game shape is stable.
- Party size uses a hard default cap for performance and UI readability. Mods may raise or replace that cap for players who opt into larger parties on capable devices.
- Recruited NPCs lose shop or quest-giver duties by default. Keeping those functions requires a special authored companion role or future explicit role-retention mechanic.
- Pre-beta containment save changes may break old saves if a clean versioned schema becomes necessary. Prefer compatibility adapters when practical, but do not compromise central containment mechanics merely to preserve unreleased legacy saves.
- Feast/containment uses regular damage and vital damage as separate living-creature tracks, with corpse/remains scavenging handled through a separate Remains Pool. Normal fight damage does not reduce vital integrity by default. Chew is the explicit exception: it is a progressive Feas-based attack that reduces Vitality and current condition by the same amount, debits proportional conserved Body Mass above the authored viable residue, and grants that finite mass as immediate nourishment to the actual chewer. Surviving exploration targets flee or enter combat. Digestion, slurp, and fragment can also apply vital damage, scavenge consumes finite remains mass, and core should represent these as state/ledger data rather than creature-piece inventory items. Feast V2 is stomach-first by default: non-stomach containers, pass-through, nested simulation, itemized butchering, and permanent stat gain remain compatibility, modded, or future mechanics rather than default core behavior.
- Desktop and mobile feedback use the same persistent newest-first Scene Feed contract. New exchange groups appear above older groups, beats within an exchange stay chronological, and the stream grows through the layout's primary scroll container without covering the composer, action controls, actor/target pickers, or dock. Transient highlighting may draw attention to a new beat, but transient-only feedback is not sufficient; the expanded Scene Feed sheet remains available for detailed review.

### Quest Species Matching Doctrine

Quest species objectives use exact internal species IDs, not fuzzy animal categories or family-style suffix matching. An objective with `species: "wolf"` matches units whose internal species ID is exactly `"wolf"`. It does not automatically match `wolfkin`, `wolfgirl`, `wolfboy`, canine-like species, beastfolk-adjacent species, or display labels.

Player-facing quest text should render species display names from the species registry. The internal ID `wolf` can therefore appear to the player as `Wolfkin`, and generated quest objective labels should prefer that display name when no explicit authored label is provided. Existing authored labels remain authoritative, but default content should avoid exposing raw internal IDs when a display name exists.

Generated quest objectives and structure quest-giver species pools should use registered species IDs from the currently enabled species registry. Mod species become valid quest targets when a quest asks for that exact registered species ID. Family/tag/taxonomy selectors such as `questFamilies`, `speciesFamily`, or broad canid-like grouping are deferred until a later authored-taxonomy pass.

Required quest content must not depend on ambient generation luck. Quest World
Directives may reserve a sparse registered creature/item at a deterministic
reachable location, while optional gathering and encounter flavor may use a
bounded active-quest weight boost. Both core and module quests use the same
data-only contract; core retains coordinate choice, persistence, map guidance,
caps, and cleanup.

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
- Combat can temporarily reduce traversal affordances. A successful player flee immediately retreats the traveling party to one deterministic, traversable adjacent tile or connected room that has no known active hostiles. If no safe route exists, combat remains active instead of chaining directly into another encounter.

### Battle mode

Battle mode should be carved out only after the actor, target, and intent model is weighted onto the party/creature/enemy panels. Combat should not become a second action UI that duplicates exploration controls in the center tile.

Battle mode owns turn order, combat constraints, and event focus. It is related to Traversal mode because battles happen on the play surface, but it is distinct from Traversal mode because routine movement is no longer the primary loop.

Active combat also obeys the [Combat Progress Invariant](combat-progress-invariant.md): every state must resolve combat, advance automatically, or expose a usable turn command or restoring phase exit. Save/load, status loss, AI, responsive layouts, and modded combat phases share that contract.

- Battle mode should reduce, hide, or demote routine movement affordances while combat is active. Directional movement returns only for explicit escape flow, forced repositioning, or future battle mechanics that deliberately spend a combat command.
- The party, creature, and enemy panels/chips are the primary actor and target surfaces in both combat and exploration. Combat adds current-turn and initiative constraints over the same selection model rather than replacing it.
- The center stage remains the primary combat event focus, not the primary duplicated action grid. It should show the current exchange, recent battle event summary, selected actor and target context, important status changes, and terrain or row context that matters to the next decision.
- The durable combat/debug log can remain available as history, but battle play should not require reading the lower log for the current exchange when the center stage can carry that information.
- On mobile, party access belongs in a lower reach-area party strip. The enemy strip sits above the party strip so the player can move from actor selection to target selection without opening unrelated panels.
- The intent popup, toolbelt, hotbar, or action sheet should appear between or near party/enemy selections when practical, anchored to the selected actor/target context. It may become a compact desktop popover on wide screens, but it should dispatch through the same intent model used outside combat.
- Desktop battle layout should mirror the same conceptual flow as mobile: party, intent, enemy, and center-stage combat focus remain aligned even when wider panels expose more detail.
- Flee is party-member dependent. A non-player companion who flees leaves active combat and the traveling party, then remains friendly and recoverable on a safe adjacent tile or connected room. A player flee moves the traveling party together, exits Battle mode as an escape rather than a defeat, and never opens death recovery while the player is still alive.
- Fear has two canonical severities resolved at the start of a combatant's turn, before controls, AI, or a queued group action. **Afraid** preserves agency and never blocks a voluntary Flee command. **Terrified** consumes the turn with an involuntary escape to a safe route; a player retreats the traveling party, a companion leaves the party but remains recoverable, and an enemy disengages alone. If no route exists, the combatant cowers for the turn and the Scene Feed narrates why. Fear resistance clears either severity without consuming the turn. Legacy `frightened` state migrates to Terrified instead of remaining a behaviorless marker.
- Group selection must not insert a second cancel row that moves the primary interaction belt. The command sentence's Actor `×` is the canonical group exit on desktop and mobile; the Intent `×` returns to action choice, and the commit phase replaces the primary intent grid instead of stacking above it.

#### Row And Reach Doctrine

Rows are for formation context, reach explanation, and future target protection. They are not initiative, and they do not define every interaction by themselves. Each intent owns its own reach profile.

Current implementation:

- Flying or ranged units default to the back row; other units default to the front row when combat starts.
- `Fight` uses an intent-owned reach profile: melee, ranged, or hybrid depending on actor traits and future action metadata.
- `Feast` uses a close/contact profile by default and requires front-row contact across opposing formations unless an explicit contact-reach profile says otherwise. Same-side companions are mutually reachable across their own rows.
- Talk, Feed, support, and other non-contact social/support intents ignore row reach unless a specific mechanic says otherwise.
- Play/Seduce is contact-social by default and requires front-row contact across opposing formations until an authored variant says otherwise. Same-side companions are mutually reachable across their own rows.
- Flying can bypass rows for Fight/aerial profiles. Flying does not automatically bypass front-row requirements for Feast or Play/Seduce, and flying targets still need flying, anti-flying, or explicit contact reach for contact-style actions.
- Ranged Fight can reach front-row grounded targets, protected back-row targets, and flying targets from either row. Back-row ranged attackers keep distance and may take small balance modifiers, but ranged is reach access rather than a restriction to back-row targets.
- Anti-flying actors answer flying targets for relevant physical profiles, but anti-flying does not bypass front-row blockers by itself.
- Front-row blockers protect back-row units from actors on the opposing side. They do not block Fight, Talk, Seduce, Feed, or Eat interactions among companions within the same formation.
- If a side has no living front-row blockers, back-row targets are exposed. Ordinary melee and close/contact actions may reach exposed back-row targets unless a specific action profile says otherwise.
- Back-row ordinary melee and close/contact actors cannot freely hit front-row targets without a future special reach profile. A valid actor may still commit a tactically impossible attempt: the creature visibly fails in the Scene Feed, pays the action cost, and spends the turn instead of receiving a UI error or correction.
- If a committed or delayed group plan becomes impossible before resolution, it can fizzle and consume the committed plan through existing group timing, with Scene Feed explaining the failure.
- Current reach is intentionally narrow: the current implementation does not yet model equipment reach, snare/grab, pull, advanced row AI, or area distribution.
- `Move Row` toggles the active actor between front and back row and consumes that actor's turn. UI copy labels this as Advance or Retreat while preserving the internal `moveRow` id, and should not imply that moving rows always solves back-row targeting.
- Flying still occupies a row for UI purposes. Flying can bypass row blockers, and flying targets still require flying, ranged, or anti-flying reach. Do not add a third air lane until a later formal pass needs it.
- Group physical and contact-social plans require every committed participant to have a valid contribution path by default. Talk/support group actions can ignore rows unless a mechanic says otherwise.

Future row mechanics can add equipment reach, snare/grab/pull, size, terrain, and ability-specific profile predicates without changing the basic doctrine that intents own reach.

#### Combat Group Planning Doctrine

Combat group planning still uses the shared `InteractionPlan` model:

`Actor(s) -> Target(s) -> Intent -> Timing -> Resolution`

The combat UI grammar is:

`Lead Actor + Participants -> Target(s) -> Intent -> Commit`

- Player-facing combat group planning is `Actor(s) -> Target(s) -> Intent -> Commit`. The older Sync button is compatibility/internal terminology and should not be the primary visible route for ordinary players.
- The current turn actor is the required Lead Actor for this phase of the system. Do not allow group plans that exclude the current actor yet.
- Non-current party members may participate. Once a group plan is committed, those participants are locked into the queued group action and count as having spent their turn.
- Group combat can mark one or more targets. A multi-target group command is one collective queued effort: every committed participant contributes to every marked target, each participant pays the action cost once, and the plan resolves once at the slowest participant's turn. Profiled Fight scales every participant's contribution independently using target count, that unit's multi-Fight practice, and explicit technique declarations before combining the result per target. The plan records `shape: many-to-many`, `distribution: all`, and an `effectPreview` when an action opts into the shared profile; split, paired, area, chain, or other ability-specific distributions must use explicit plan metadata rather than silently changing this baseline.
- Combat party targets are valid targets for the normal interaction set. A party member can mark another party member, or themself where the action resolver supports it, for Feast, Talk, Play, Fight, Feed, and future intents. Guardrails should live in action resolution, content/safety policy, and Scene Feed feedback rather than a blanket party-target block.
- Combat Feed is target-first. The current actor must explicitly choose one living target—self, companion, or opposing creature—before the valid Feed variants are evaluated. Feed must never silently substitute the player, the most wounded ally, or a random enemy for that choice.
- If every target or a required participant becomes invalid before resolution, the plan fizzles cleanly and emits Activity Log / Scene Feed feedback. An individually unavailable target may drop from the queued target list while remaining valid marks resolve; the plan never retargets automatically and should not interrupt combat with a correction prompt.
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

### Companion placement and player defeat

- Drop Off is reversible party placement, not dismissal. Outside combat and away from active hostiles, an ally may leave the traveling party while remaining a persistent friendly resident of that exact overworld tile or interior room. Returning offers Rejoin, preserves role and AI order, and does not grant recruitment XP again.
- Dismiss remains a separate relationship transition. It may clear party ownership and must not be silently treated as reversible roster storage.
- Player death removes the player from the active queue but does not cancel an encounter while a living, non-fled companion can act. Existing companion controls remain available; later work may add an explicit Auto-resolve command without changing settlement semantics.
- Recovery controls appear only after the remaining encounter resolves to victory, defeat, flee, or disengagement. The settlement records every companion from the death-time roster, persists surviving companions at the defeat location through the Drop Off/Rejoin contract, retains dead outcomes, and then allows the player to regenerate alone at home.
- A save made between player death and encounter settlement must resume the companion battle. It must not skip directly to recovery while an eligible companion remains.

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
- Primary commands may expose contextual variants through `InteractionPlan.subAction`. When actor and target context leaves one valid variant, the command may dispatch it directly; when several remain, desktop should use a bounded accessible popover and mobile an equivalent bottom sheet. Back or Cancel must preserve the composer selection, disabled variants must explain their unmet rule, and mods may contribute only through a validated registry rather than arbitrary command-surface markup.
- When a contextual variant evaluates multiple actor-target pairs, its menu exposes a bounded pair preview rather than one ambiguous aggregate reason. The preview names each shown pair, reports availability or attempt clues, discloses omitted rows, and reports the ordinary action cost once per actor. It is explanatory state only: deterministic ordering, committed failure, and one-cost-per-actor accounting remain authoritative in resolution.
- `Feed` follows the [Feed Contract V1](feed-contract-v1.md): the selected actor is the source of care or nourishment and the selected target is the recipient or consumer. Tend, Nurse, Offer Self, and Offer Piece are the canonical context-filtered variants. Legacy inverse-direction identifiers remain hidden compatibility aliases, while player capture and coercive variants remain deferred behind explicit recovery and content-policy contracts.
