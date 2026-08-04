# Development Changelog

This is a compact history of completed foundations. Git remains the authoritative implementation history.

## Current Foundations

- Interaction vocabulary now has one canonical contract across exploration and
  combat: Talk exposes Flirt plus mechanically distinct Mature Seduce, legacy
  Dance choices migrate to Flirt, Play keeps deferred Dominate/Submit hidden,
  and the Feast family is labeled Eat on desktop and mobile while retaining its
  compatible internal ID.
- Party Holdings now supports bounded party-facing companion names and shared-
  Pack loadout management. Renames preserve stable identity, species, history,
  equipment, and save references; Pack owner selection chooses an equipment
  recipient without introducing per-companion backpacks. Rejected operations
  remain unchanged and produce narrative feedback.
- Mature posture now selects richer English and Spanish narration for bounded
  encounter, combat, social, feeding, and containment outcomes. SFW posture
  retains neutral copy, missing Mature variants fall back to the active locale,
  and no content posture changes deterministic resolution.
- Moddable Core V1 now gives the shipped game and trusted-local modules the
  same owned, data-only registries for actions, status effects, restraints,
  equipment, body mass, biome recipes, and audio packs. Core retains seeded
  resolution, costs, saves, rendering, ownership cleanup, and conflict
  arbitration. Modules receive immutable post-commit observations rather than
  veto, DOM, filesystem, credential, or arbitrary callback authority.
- Core Grab, Pull, and Escape use explicit source-target restraint
  relationships. Appetite-gated Seduce resolves Spirit against Wisdom, makes a
  successful target recruitment-ready, withdraws both participants, and never
  bypasses party capacity. A source-independent fixture composes these seams
  with owned resources, techniques, equipment, species, biome placement, body
  rules, and recovery, then unloads without residual definitions.
- Biome Recipe and World Scaling V1 provide bounded deterministic seams for
  unmaterialized tile classification and distance/biome/cave/structure danger
  and reward pressure. Materialized sparse geography remains pinned; complete
  new-world recipe sets, `mapModsHash`, designed regions, anomalies, portal
  worlds, and regional population remain explicit later work.
- Dismissed recruits now use persistent six-hour coarse autonomy with bounded
  event history and perception-limited sightings. Merchants explicitly choose
  finite or authored-restock lifecycles. Neither contract pretends to provide
  a regional economy or persistent supply simulation.
- Automatic combat presentation can be readable, fast, or instant without
  changing deterministic order or saved state. Audio Pack V1 maps semantic
  events to internally leased packaged media without AI, TTS, or executable
  playback callbacks. Compact mobile combat places contributed actions in a
  bounded upward-opening disclosure above the fixed dock.
- Native builds expose a Pear Desktop settings entry that opens a host-owned
  trusted window. Browser builds remain unchanged, and game modules receive no
  update or peer-availability mutation methods.
- Downloaded `file://` play no longer hides or blocks remote LLM profiles behind
  an opaque-origin override. The provider panel and narration settings expose
  every compatible text-generation profile, warn that REST endpoint CORS
  support varies, and keep browser credentials session-only.
- Camp Safety now follows the same physical quest-return contract as other
  original-giver work: accepting it reserves one nearby Wolfkin, its Defeat
  objective becomes ready to report without awarding gold or XP, and only the
  original camp guide can grant the reward once. An exact built-artifact
  Chromium smoke and an integrated regression cover the complete loop.
- Quest World Directives V1 lets core and module-authored quests declaratively
  reserve required creatures/items or boost matching encounter/search weights
  inside a bounded area. Core owns deterministic reachable placement, stable
  IDs, map guidance, save/load idempotence, lifecycle cleanup, validation, and
  caps; callbacks and general world-generation ownership remain unavailable.
  Camp Safety now reserves one nearby Wolfkin, and procedural Hunt/Gather
  quests use guaranteed placement or scoped probability according to whether
  the objective must exist.
- Chew now follows one progressive attack contract across exploration and
  combat. Feast-based damage reduces Vitality and current condition equally;
  depletion creates recoverable remains, while surviving non-party targets
  flee or enter combat. Single, group, and multi-target routes share the same
  resolver and distributed-effect practice without automatic healing,
  nourishment, or Consume credit.
- Generic Defeat quests now use one party-attributed resolution contract.
  Player and autonomous companion slaying, subdual, and containment each count
  once per hostile; fleeing, third-party outcomes, and release/re-containment
  cycles do not advance the objective. The bounded identity ledger survives
  save and resume.
- Core Game Maturity closes the everyday 0.16 loops: Item Registry V2,
  Quest Contract V2, Review Map V2, Companion Behavior V2, Progression V2,
  the visible-only Perk Frontier, and Progressive Tutorial V2. Each contract
  remains deterministic and offline-capable, migrates supported legacy state,
  and gives optional providers bounded advisory or data-only ownership.
- One-to-many social commands now follow the shared attempt-first interaction
  contract. A novice can address mixed companion and local-creature targets in
  one command, individual results still determine who is affected, and the
  command emits one consolidated Scene result instead of silently stopping at
  an obsolete aggregate-stat gate. Multi-target Fight and explicit Chew use
  separate practice-scaled distributed effects.
- Candidate compatibility now includes a binary save fixture produced by the
  published 0.14.0 serializer and loaded through the current slot migration
  path. The Sites chooser and development archive consume a synchronized
  release mirror, while root and Sites builds reject stale host-catalog
  versions, hosted package copies, or package `gameVersion` metadata.
- Travel now refreshes party presentation after applying Hunger cost. Desktop
  and mobile cards no longer retain a pre-move Hunger value until save/reload;
  the clean-origin candidate smoke and a focused regression test cover the
  live update.
- Player and enemy Flee beats now send their localized resolved text through
  the semantic Scene layer. Successful and failed retreats no longer expose
  raw `success`, `failed`, or `fled` tokens to players.
- Generic narrative failures now conjugate player and named actors separately,
  avoiding output such as “You tries” while preserving localized templates.
- Release identity now separates numeric compatibility, select-group alpha,
  and general-public distribution. Version 0.16.0 is a dated alpha for a select
  playtest group; `public-preview` remains reserved for a later explicit
  general-public decision. Authoritative documentation is consolidated into
  current architecture, active objectives, evidence audit, focused doctrine,
  and explicitly superseded history.
- Standard Adventure now exposes the same deterministic pressure used by
  encounter admission as five localized current/adjacent travel bands: Safe,
  Low, Guarded, Dangerous, and Severe. Protected opening tiles are always
  Safe, known living hostiles become Severe, voluntary danger sites remain
  visibly elevated, and roads retain their lower pressure without revealing
  hidden rolls.
- Generator V6 keeps the connected Route Hierarchy V2 macro graph but replaces
  diagonal distance-to-line rasterization with deterministic one-tile
  orthogonal routes. It limits each region to two road-served POIs, removes
  false single-segment T-junctions, and more than halves road coverage in the
  demonstrated garbled 17×17 window. Existing Generator V5 saves retain their
  recorded roads.
- Simple Narrator 0.7 adds selectable player POV, first-person,
  third-person-limited, and cinematic observer perspectives. Player POV
  remains the default; each mode has an isolated cache variant and changes
  grammatical framing without changing the structured viewpoint roles,
  deterministic scene context, or content-policy boundary. The exact 0.6
  default prompt migrates to perspective-neutral wording while customized
  instructions remain untouched.
- Content Placement V1 now has a firm pre-API decision. Species Profile V1
  encounter weights remain supported, while executable map callbacks and
  save-unstable geography claims are rejected until a canonical new-world
  recipe, meaningful `mapModsHash`, missing-owner policy, materialized deltas,
  and offline reconstruction acceptance exist.
- Waystone Recovery is a disabled-by-default, offline-compatible Recovery Mode
  V1 fixture with owned English and Spanish labels. It proves alternate
  death-bag, ethereal-journey, and vitality profiles stay inside the shared
  defeat resolver; companion extraction, resurrection economies, authored
  destinations, landmarks, and spectral abilities remain explicit V2 work.
- Long Asset Bundle installs are now cancellable through the Mod Manager. The
  live region exposes per-resource byte progress, reviewed URI/digest controls
  stay frozen during the operation, and one explicit Cancel aborts the staged
  Media Repository batch without replacing the installed bundle. The reviewed
  package remains available for Retry; the full flow is browser-verified from
  the downloadable `file://` build.
- Real presentation-pack acceptance now uses maintained installable fixtures
  rather than schema-only examples. French Preview proves a partial third
  language can visibly relabel the menu, report English-fallback diagnostics,
  survive reload, and unload cleanly. Example Sprite and Tileset bundles prove
  reviewed HTTP acquisition, IndexedDB retention, local `blob:` leases,
  no-hotlink reload, fallback restoration, animated/wounded/Ghost unit states,
  shoreline transitions, and topology-aware building/cave interiors. The
  fixture Sprite atlas is reproducible from source.
- Generator V5 is now the new-run default and adds Route Hierarchy V2 without
  changing recorded V4 worlds. Macro anchors form one deterministic connected
  tree, route-capable POIs receive bounded tree-shaped local branches, and
  rare extra links are retained only when they create an intentional loop of
  at least eight macro edges. Rasterized junctions preserve shared segment
  identity, while bridges, base biomes, starter routes, and the full V4
  safe-start/admission contract remain intact.
- Interaction Balance Matrix schema v3 now inventories Basic Attack and every
  registered Combat Technique V1 profile, including normal once-per-command
  Fight hunger cost, reach, equipment requirements, damage shaping, area
  distribution, and status. It also makes the existing world-clock boundary
  explicit: ordinary interactions commit turns without advancing hours, while
  traversal, Search, and Rest retain their authored elapsed-time costs.
- Generator V4 introduced the safe-start baseline inherited by V5, while
  recorded older worlds retain their versioned layout. The inner 3×3 is a
  deterministic passable Grove with no random encounter, hostile structure,
  danger-site influence, or cave portal. Radius 2–5 releases encounter chance
  predictably, admits at most one tier-1 creature, and disables opening
  ambushes and reinforcements. A conservative estimate based on the weakest
  living party member defers an over-budget hostile to a neutral meeting
  instead of applying hidden damage reduction. Live movement consumes this
  generated encounter policy, and the opening scene names the actual localized
  starting biome.
- The built-in Ghost pilgrimage now has an explicit product baseline:
  Settings opt-in, defeat-site entry, ordinary companion battle settlement,
  the selected inventory consequence, traversal-only agency with read-only
  history, and no added item or currency cost. Resurrection occurs at the
  validated home/safe place with 1% condition. Player-facing copy no longer
  implies that every valid home anchor is literally a shrine; the stable
  Recovery Mode V1 `shrine` token remains for save and module compatibility.
- Hunger now has explicit tactical consequences for every living combatant.
  Hungry units take a 10% action/initiative penalty and a five-point Flee
  penalty; starving units take a 25% action, 20% initiative, and fifteen-point
  Flee penalty. Cards disclose the active penalty, while Constitution and
  maximum condition remain unchanged. First-entry ambushes now resolve a
  deterministic Wisdom/Scout/Guard/visibility/terrain contest: detected
  ambushers lose first-strike initiative with visible feedback, while Guard
  continues to mitigate an ambush that remains hidden.
- Hostile encounter admission now has one authoritative lifecycle gate across
  fresh entry, revisits, direct starts, regeneration, and save/load. A living
  player facing a living hostile enters combat; an unresolved down player
  enters defeat recovery instead of an actorless composer; an active Ghost
  journey suppresses combat with an explicit Scene/Activity explanation.
  Existing companion-led combat still resumes and settles before recovery.
  Ghost journeys also enforce their declared restrictions at direct
  interaction, transaction, quest, inventory, recruitment, and structure
  entry points, so stale controls cannot bypass the recovery-only surface.
- UI Contribution V1 gives enabled trusted-local modules five stable,
  permissioned presentation slots: post-place commands, party and local roster
  badges, roster detail rows, and low-frequency app-menu utilities. Modules
  provide bounded text/data and callbacks with frozen public context; core owns
  escaping, focus, dialogs, responsive placement, collision limits, content
  policy, and unload cleanup. The contract works at file origin and does not
  expose dock, traversal, Scene Feed, or combat-confirmation replacement.
- Mobile Interaction Flow V2 replaces the separate phone Party and Creatures
  dock routes with one state-aware Roster. Exploration uses Party/Here and an
  Items tab only when needed; combat uses Allies/Enemies. The bounded sheet
  preserves actor and target state, keeps the context composer available,
  retains 44px controls and accessible tab semantics, and leaves desktop
  Party/Enemies navigation unchanged.
- Recovery Mode V1 now provides permissioned namespaced declarative terminal
  recovery profiles without exposing defeat callbacks. Core includes ordinary
  Regenerate and an opt-in Ghost pilgrimage: consequences settle once at the
  defeat site, ethereal travel suppresses hunger and encounters, ordinary
  actions remain restricted, and resurrection becomes available only at the
  validated home/safe place. Selection, active journeys, legacy migration, and
  owner-unload fallback persist through the authoritative defeat/save flow.
- Sprite Pack V1 now provides a code-free Asset Bundle presentation for
  species, ability, disposition, and fallback unit art. Bounded static or
  horizontal animation strips resolve committed idle, wounded, defeated,
  contained, Ghost, and facing states through local Media Repository leases.
  Shared cards and presence rails retain emoji and semantic-text fallbacks,
  reduced motion freezes animation, and owner unload releases presentation
  without touching gameplay or saves.
- Media Provider Adapter V1 now permits reviewed trusted-local infrastructure
  modules to register owned Source or Store roles behind `media:provide`.
  Provider IDs cannot replace core or another module's provider; module unload
  releases active leases, closes the adapter, and restores provider-neutral
  fallback behavior without persisting session credentials.
- Resource Ledger V1 now provides bounded namespaced per-unit renewable state.
  Module profiles are permissioned and owner-scoped, regenerate only through
  deterministic digestion/hour/rest triggers, persist through sparse and
  binary saves, and become dormant without refilling when their module unloads.
  Nurse is the first core consumer and spends one visible nourishment charge
  plus its cooldown; legacy units begin with no free reserve.
- Combat Technique V1 now provides permissioned namespaced declarative Fight
  profiles. Modules can author bounded capability/equipment eligibility,
  command-scoped reach, damage shaping, split or full-area behavior, and one
  deterministic core status. Basic Attack remains intact; solo/group
  selection, queued save restoration, localization, and unload cancellation
  share the core combat resolver.
- Contextual Feed, Feast, and Play menus now explain group plans pair by pair.
  A bounded preview names each evaluated actor and target, distinguishes ready
  and unavailable pairs, exposes attempt clues, and reports the shared action
  cost once per actor rather than implying a cost per target. Longer plans
  disclose omitted preview rows without changing deterministic resolution.
- Tend is now care rather than free food: every combat, exploration, group, and
  mutual route restores only actual missing Condition and leaves Hunger and
  Spirit unchanged. Combat support XP follows net Condition reward bands,
  caps one full allied target restoration at 20 XP regardless of command count,
  and awards nothing for self-care or no-op Tend.
- Release 0.14.0 adds Species Profile V1 for bounded species-authored stats, size, anatomy, existing abilities, temperament, canon, and encounter placement. The Sites host supplies the tested Elemental Species pack as optional and disabled by default; character creation refreshes immediately and safely on module enable or disable.

- Modular source builds a generated single-file playable artifact; CI validates and uploads it while `dist/` remains ignored.
- The 3x3 play surface, compact desktop cards, mobile actor/target rails, composer-owned intents, Scene Feed, Activity Log, and restrained toast layer are implemented.
- Accessibility foundations include keyboard-operable cards/chips, focus traps, localized accessible names, high contrast, reduced motion, and font scaling.
- Dynamic gameplay dialogs now describe their purpose as well as their title. Holdings, contained creature details, perk selection, Quest/Trade, mobile party management, and contextual action-variant pickers expose visible English/Spanish descriptions through stable accessibility relationships, with mobile and desktop viewport coverage guarding focus containment and overflow.
- Combat target-confirmation trays now preserve readable primary and Cancel controls instead of collapsing into narrow desktop columns. Player and companion turns, one and multiple marked targets, counted English/Spanish copy, cancellation state, 44px controls, and horizontal bounds run through the complete phone-to-desktop viewport matrix.
- Mobile contextual action variants now have rendered coverage across the complete phone/tablet viewport matrix at 20px Spanish, high contrast, and reduced motion, including bounded scrolling, 44px controls, no horizontal clipping, and Escape-to-opener focus restoration.
- English/Spanish localization infrastructure and content-tier-aware labels are established.
- Row-Blocking V2 uses intent-owned reach. Ranged Fight reaches grounded front rows, protected back rows, and flying targets; close-contact Feast and Play/Seduce require front-row access unless explicitly extended.
- Feast/containment uses living Vital Pool, separate consumed history, finite corpse Remains Pool, and command-driven release/digestion.
- Holdings separates Stats, Equipment, shared Pack, Containers, and Ground, with party-owner selection for owner-specific sections.
- Sparse saves, deterministic persistent world rolls, deterministic combat rolls, quests, merchants, equipment, perks, party roles, and generated-world foundations are implemented.
- Trusted-local modules support validated manifests, permissions, dependencies, content ratings, owned hooks/contributions, and versioned public narrative context.
- HTTP(S) hosts can publish a same-origin, integrity-aware module catalog with required, default, optional, and forbidden policy states. Module provenance and runtime-origin requirements are visible in Mods, host-owned packages cannot be deleted by players, and saves carry a versioned module content profile while downloaded `file://` builds remain fully playable without host discovery.
- Players can explicitly review and install single-JSON module packages from HTTPS or localhost URIs. Remote acquisition omits credentials, rejects redirects, bounds downloads, verifies or records SHA-256, shows permissions and content rating before confirmation, stores the package in IndexedDB as disabled, and never hotlinks or auto-updates it during play.
- Media Repository V1 provides provider-neutral Source/Store/Lease contracts, content-addressed catalog ownership and reference cleanup, staged IndexedDB payloads, reviewed HTTPS/loopback acquisition, a V1 endpoint/sidecar adapter, cached session object URLs, and permission-scoped module leases. Asset-bundle and tileset presentation formats remain downstream.
- Asset Bundle V1 provides a code-free, presentation-neutral URI manifest for one replaceable module resource catalog. Review validates target compatibility, ratings, licensing/provenance, roles, fallbacks, per-resource hashes/MIME/sizes, and bounded totals before fetching media; confirmed installs verify and retain every resource locally, expose repair state, and clean references on replacement, removal, or module deletion.
- Tileset Pack V1 is the first Asset Bundle presentation consumer. It validates bounded code-free atlas geometry, semantic layers, transforms, aliases, and coverage during review; leases installed media on module enable; supports partial newest-pack overrides with prior-pack and bundled fallback; restores candidates on disable; and renders one shared semantic stack across desktop, mobile, large maps, and interiors. The first-party 8x4 atlas is embedded into the single-file build for offline `file://` play.
- Tileset Pack V1 hardening separates opaque terrain from a transparent 4x4 route/interior/state atlas, adds cardinal road ends, topology-derived interior paths, outward exits, building doors, adjacent walls, and directional blocked edges, and exposes ordered semantic metadata across map surfaces. A real URI fixture verifies hash-retained IndexedDB installation, partial fallback, replacement, reload persistence, local blob leases, and disable restoration.
- Traversal Surface Geometry V1 separates the desktop 3x3 neighborhood from the current-location story panel and gives desktop and mobile traversal maps equal square tracks. The center location retains semantic tileset metadata, compact presence, keyboard/cardinal movement, and emoji fallback while combat keeps its full-stage layout.
- Core now exposes SFW and Mature postures, while provider-declared categories, gameplay variants, localized labels, creation options, and explicit narrative stay in optional modules outside the generated HTML.
- Provider-neutral narration now uses immutable post-commit hooks, an owned presentation-only store, focused context, declarative mod settings, session-only provider connections, and separately packaged SFW/Mature and explicit orchestrators.
- Narration prerequisites now include credential-safe module settings, new/load runtime cancellation, exclusive orchestrator ownership, authoritative adult eligibility, target-exchange context snapshots, packaged integration coverage, and a keyless Puter Connect/Test/Disconnect path.
- A dedicated capability-based AI Providers panel now manages stable profiles separately from mods. The built-in OpenAI-Compatible text adapter supports browser-direct Responses and Chat Completions with fixed-origin requests, blocked redirects, conservative fallback, session-only credentials, and mocked Direct OpenAI/OpenRouter/generic/local coverage.
- Narration mods now have bounded provider-neutral instructions layered beneath immutable engine constraints. Simple Narrator exposes multiline instructions, ready narration becomes the primary Scene Feed passage with source events retained in a disclosure, and offline Template Narrator plus Diagnostics packages exercise the API without provider access.
- Startup navigation now keeps Continue/New/Load primary and Settings/Mods/Tutorial compact. AI Providers lives under Settings, a real server-supplied Host Catalog appears conditionally under Mods, nested screens return through their origin, and short or enlarged-text layouts retain a scroll fallback.
- Startup readiness now tracks saved games, installed media, enabled modules, and bundled visual assets as independent timed domains. Affected menu actions expose accessible busy, failure, and retry states while Settings, Tutorial, Activity Log, and release information remain immediately available.

## Recent Fixes

- Public module conformance now proves that the maintained neutral package's owned Scene Feed template actually matches and renders an interaction outcome, then survives runtime restoration, disable, deletion, and a clean disabled reinstall before explicit re-enable. The canonical doctrine no longer contradicts the implemented Play action-variant seam by listing Play among deferred capabilities. Rated action variants are also locked to manifest-owned posture/category policy: blocked enables leave no partial variant, and policy downgrade unloads the owned route.
- The player-state contract now has direct containment-terminalizer coverage. Survivable player containment resolves once as nonterminal `captured`, stays releasable, and never emits defeat; fatal player digestion resolves once through ordinary death recovery with the authoritative `fatal-digestion` cause and one defeat hook.
- Deterministic map acceptance now runs start safety and recovery-anchor checks against both maintained generator versions. Two-mouth caves are traversed through their real reciprocal underground graph, and generated cabin, ruins, burrow, manor, and dungeon interiors are checked for bounded connected room graphs with exactly one surface exit.
- Locale Pack V1 now lets an optional module own a reviewed locale ID, display name, fallback, and bounded versioned targets. Active locales populate Settings dynamically, saved module locales survive asynchronous IndexedDB restoration through a temporary English fallback, cross-module translations require the translated module's stable namespace and dependency version, and disabling either owner or target removes the locale safely. Missing and obsolete keys produce bounded diagnostics, with paired neutral fixtures covering install, selection, reload, and unload.
- Feast and containment lifecycle presentation now stays inside the maintained English/Spanish locale contract. Player and named actors use correct locale-owned verb and possession grammar for Swallow, active Digest, Release, and empty-container outcomes; both the interaction submenu and Holdings commands localize their Scene Beats, terminal/softened state notices, and Activity Log entries instead of switching back to hardcoded English.
- Canonical Feed variants now keep actor perspective grammatical after a language change. Player and named Tend/Nurse results, unavailable Nurse and cooldown outcomes, and Offer Piece summaries resolve through paired English/Spanish keys; Offer Piece uses a neutral sentence form and the localized player label rather than leaking the underlying saved name.
- Containers no longer expose raw lifecycle and integrity tokens as visible copy. Active and consumed lists, contained-creature detail, compact expanded-card summaries, and the public containment summary localize state, vitality, releasability, and intact/damaged presentation while retaining canonical serialized values and `data-contained-state` metadata unchanged.
- The diagnostic suite is clean again after separating product defects from fixture drift. Mobile party management dialogs now expose a localized visible title naming both the task and selected companion; the combat creature rail assertion follows the state-aware Enemies/Creatures/Remains presenter; the test DOM preserves empty attributes like a browser; and generated quest plus Feed summary fixtures carry the maintained English/Spanish keys instead of silently exercising fallback text.
- The AI Providers connection editor now has a visible localized accessible heading and stable Add, Edit, and Cancel command identities. Opening Add or Edit moves focus into the first field; successful Save returns to Add, while Cancel returns to the exact profile's Edit control even though the provider list is rebuilt. Real downloadable `file://` coverage creates a local profile and locks both rerender lifecycles across the responsive viewport matrix.
- The Mod Manager's URI importer now behaves as a real disclosure: its trigger names the controlled region and synchronizes expanded state, the hidden region enters and leaves the accessibility tree with visibility, opening focuses the URI task input, and Cancel restores focus synchronously to the invoking control instead of dropping it onto the document. Localized `file://` browser coverage locks the complete open/close lifecycle.
- Settings, AI Providers, release notes, Activity Log, Mods, and Host Catalog now reference their visible descriptions as well as their visible titles. Host Catalog's live renderer preserves both referenced IDs when it replaces the fallback markup, fixing an unresolved dialog name after catalog load; the localized `file://` catalog and every menu-opened system overlay now verify that both relationships resolve to nonempty visible text.
- The first-run and Help tutorial now follows the same modal accessibility contract as other blocking surfaces: its changing title and instructions provide the dialog name and description, step changes announce politely, the underlying screen becomes inert and assistive-hidden while open, and Skip or Escape restores both the background state and logical opener focus. The real downloadable `file://` path verifies first-run semantics plus a later Help-opened step transition and Escape lifecycle.
- Host-controlled module restrictions now expose stable localization keys and bounded variables alongside their unchanged diagnostic messages. Mod Manager and Host Catalog localize runtime-origin requirements, host policy, provenance, module type, status, and install controls; a rendered Spanish `file://` fixture verifies the incompatible-host path without English UI leakage or overflow.
- Shared modal focus containment now excludes hidden inputs, negative-tab controls, CSS-hidden descendants, and controls under hidden, inert, or assistive-hidden ancestors. Unit and real Save Manager browser fixtures prevent collapsed or background commands from leaking into dialog tab order.
- The live-game app menu now follows its declared menu keyboard contract: opening moves focus to the first available command, Arrow keys and Home/End navigate visible commands without moving the party, and Escape closes the menu and restores focus to its trigger. Core and responsive mobile coverage lock the lifecycle.
- Shared confirmation and save-recovery dialogs now isolate every underlying body surface from pointer and assistive navigation while open, preserve each surface's exact prior inert and visibility state, and restore the parent modal focus trap on close. Responsive browser coverage locks the nested Save Manager confirmation and recovery lifecycles.
- Tile Details, contextual action sheets, and mobile party context menus now honor their declared modal semantics: each traps focus, hides the underlying play surface from interaction and assistive technology, and restores it on close. Tile Details preserves a semantic opener token across its header rerender, and Save Manager now derives its accessible name and description from its visible localized heading and instructions.
- Holdings now preserves its original invoking control across tab, owner, perk, and contained-creature detail rerenders. Contained inspection reactivates the current dialog focus trap after replacing its markup, and closing Holdings restores logical focus only after the play surface is interactive again; responsive browser coverage locks the behavior on mobile and desktop.
- Feed Contract V1 no longer treats an unspecified group Feed as permission to consume selected companions. Default single and group Feed consistently resolve as Tend; whole-self transfer requires the explicit Offer Self variant plus authored livestock or willing-prey state. Explicit group Offer Self and Nurse distribute every eligible source in selected order, re-evaluate capacity/cooldowns as they resolve, preserve ineligible sources, and leave one durable group Scene outcome with narrated capacity failures.
- Persistent game scaffolding now follows the selected interface language: app-menu Holdings, tile-details headings and exits, Scene Feed triggers/streams/sheet controls, desktop traversal groups, and the command composer expose matching visible and accessible English/Spanish labels. Browser coverage verifies the longer Spanish presentation without horizontal overflow.
- Map acceptance now executes the Lightweight `?graphics=emoji` build as a real browser presentation path. It matches Textured road, base-terrain, blocked-edge, and traversal semantics across mobile, desktop, and large maps while loading no atlas layers; simulated atlas acquisition failure remains non-blocking, explains fallback graphics, and records an Activity Log error.
- Character-creation species, identity, trait, provider-choice, and encounter-preference cards now expose `aria-pressed` selection state and keep it synchronized after pointer or keyboard changes. Module-authored species names, descriptions, and icons are escaped before rendering; authored locale keys remain supported. Default-trait, empty-trait, and interior-location scaffolding now use the maintained English/Spanish registry.
- Mature `Chew` now shares the recoverable-remains lifecycle with other defeat paths without remaining an automatic terminal shortcut. Its progressive damage reduces Vitality and current condition equally, and combat removes a depleted target from the living turn queue instead of leaving a zero-condition hostile card. Responsive target rails and dock controls retitle a remains-only result as localized `Remains`, retain a discoverable count, and clear enemy danger styling even before combat teardown finishes.
- Holdings Pack entries now resolve maintained item-category types through the active locale instead of exposing internal `consumable` or `equipment` tokens. Trade and Holdings therefore share the same English/Spanish category vocabulary while authored item names and descriptions remain authored content.
- Capacity-failure feedback now resolves nameless actor, owner, and target fallbacks through the maintained locale registry, so malformed or compatibility-era unit data cannot leak English placeholders into Spanish Feast outcomes.
- Core/UI label coverage is now registry-complete: combat correction and synchronization copy, Holdings ground/remains summaries, responsive target controls, deterministic observation/recruitment Scene Beats, tile/presence helpers, tactical row accessible names, and contextual variant scopes no longer rely on English-only fallback strings. A source-scanning regression reports any future literal `_label` key that is absent from the maintained English/Spanish tables, including its owning file.
- Direct core-generated combat, encounter, structure, death/remains, synchronization, and perk Activity Log or Scene fallback prose now resolves through the maintained English/Spanish registry. A separate source guard rejects new literal English dialog, DOM text, and Activity Log entry points while leaving authored and module-owned content outside this bounded core contract.
- Direct Fight, Talk, and Play resolution now uses player-versus-named locale grammar, and synchronized group Fight, Talk, Play, and Feed outcomes resolve through the active locale instead of constructing English after an otherwise localized command. Action costs, target state, turn timing, and deterministic calculations are unchanged.
- Combat turn headings, large-map creature/item counts, Scene Feed punishment/healing/Spirit deltas, and unknown-biome fallback sentences now resolve through maintained English/Spanish keys. Canonical delta values, authored names, map state, and module-provided biome identifiers remain unchanged.
- Hidden compatibility interaction routes now resolve their capability, willingness, capacity, restraint, renewable-draw, fragment, and unimplemented-route outcomes through maintained locale keys without entering the canonical Feed/Feast picker or weakening explicit content gates. Search discovery, ordinary exploration, and empty-result prose is likewise localized, and loot-toast detection no longer depends on an English sentence prefix.
- New-character creation now writes its first Activity Log welcome through the active locale. The source guard also covers whole-log initialization so future startup prose cannot bypass the maintained registry through array assignment.
- The expanded Scene Feed now has a concise localized dialog description instead of treating the full event history as assistive description text. Browser coverage opens it through the real visible control, verifies focus containment and background isolation, closes it through the rendered Close control, and proves focus returns to that opener across responsive layouts.
- The main-menu Mods control now localizes its initial disabled loading tooltip and accessible name before readiness synchronization runs, using the same startup-domain key as its later live state.
- Map/Tileset acceptance now proves that a real HTTP-installed partial pack cannot mutate gameplay topology through install, enable, reviewed replacement, IndexedDB-backed reload, or disable. Mobile, desktop, and large-map semantic metadata plus traversal decisions remain identical while presentation ownership changes, and the development artifact measurements are refreshed for the 0.14.0 head.
- Map/Tileset artifact acceptance is now repeatable instead of prose-only. It reports current offline, hosted, atlas, Lightweight, and Textured-cold transfer sizes; rejects embedded or cache-busted hosted atlases; and browser-tests one cold atlas request, immutable-cache reuse on reload, and zero atlas requests in a fresh Lightweight context. Crop legibility and marker contrast remain honestly operator-reviewed rather than receiving a synthetic automated approval.
- A live Tileset Pack review now records desktop and phone evidence for an equal-cell road neighborhood, Camp/rest overlay, current marker, and the 17×17 review map. Routes and markers remain legible without clipping; the deliberately accessible 44px place and overflow actions can make the phone center cell dense, so broader restructuring stays with Mobile Interaction Flow V2 instead of shrinking touch targets or changing map semantics.
- Core-generated quest fallbacks now use the maintained locale registry for untitled quests, generated objective actions and targets, numbered checkpoints, and missing giver labels. Generated-label provenance lets the quest log re-resolve those fallbacks after a language change, while authored quest and module text remains untouched; Spanish browser coverage verifies the rendered fallback path without English leakage or overflow.
- Startup readiness domains now retain stable diagnostic labels and separate locale keys through snapshot and retry. Pending summaries, disabled-control accessible names, and coded timeout entries re-resolve in the active language without rewriting diagnostic state; legacy injected Settings, Market, and Mods controls also resolve their initial visible and accessible names before static localization runs and expose consistent system-command metadata.
- Nameless party and creature cards now use localized type-specific fallbacks in visible labels, detail controls, mobile context actions, and accessible names. Unknown map and inventory fallbacks likewise resolve through the maintained English/Spanish registry, with narrow-screen Spanish browser coverage.
- Quest givers and merchants now retain an authored service origin. Containment suspends their Quest and Trade services, remote release cannot turn them into portable service NPCs, and access returns only when that same NPC is restored to its recorded location. Quest completion/reward state and merchant stock/pricing survive repeated containment plus save/load without resetting.
- Release 0.13.0 adds exchange-specific narration ownership. Core resolves one owner from each canonically closed exchange, deeply freezes the bounded predicate input, rejects malformed predicates, and lets declining or failed claims fall through without allowing caller-supplied envelopes to create or replace ownership.
- Release 0.12.3 gives combat Feed and Feast the same focused, accessible subinteraction sheet used during exploration, preserving actor and target context while Back or Escape cancels cleanly. Module authoring now has one canonical doctrine covering the supported package envelope, permissions, asynchronous settings, content posture, host policy, and executable runtime seams; obsolete narration-agent guidance has been removed.
- Release 0.12.2 curates the in-game What's New summary around contextual Feed direction, unified Feed/Feast/Play submenus, committed narrative failures, living retreat outcomes, mobile command-surface clearance, focus/localization hardening, and combat-plan reload coverage. Niche explicit categories have moved out of core settings and remain available to opt-in rated modules. The broader phone flow for party/enemy switching and structure actions is explicitly deferred to Mobile Interaction Flow V2 rather than patched piecemeal.
- The separate Sites wrapper now has a newest-first development changelog and numbered release archive, linked from the Textured/Lightweight chooser. The in-game What's New panel remains the offline current-release summary, and publishing is still an explicit operator action.
- Feed Contract V1 makes the selected actor the source and the selected target the recipient/consumer. The contextual picker now exposes Tend, Nurse, Offer Self, and Offer Piece; old inverse-direction identifiers remain hidden compatibility aliases, and whole-player capture stays deferred until it has a safe playable recovery loop.
- Map and Tileset Pack V1 acceptance was rerun against deterministic starts, traversal, interiors, presentation fallbacks, and current artifact sizes; the offline, hosted, and atlas transfer measurements are refreshed for the 0.12.1 development head.
- Save/load now has regression coverage ensuring half-composed combat group plans reset cleanly while the authoritative round and queue resume.
- Save-slot timestamps now follow the selected interface language, and core-owned Mod Manager metadata localizes provenance, settings, and host-control labels.
- Switching interface language now rerenders provider-declared gameplay variants instead of leaving stale English metadata. Core-provider attribution, Game Mode, Hardcore, cheat controls, cheat pressed state and feedback, Activity Log category badges, and relative timestamps now participate in the English/Spanish registry.
- Mobile play controls now preserve 44px touch targets for the app menu, tile details, center-tile presence, creature cue, Scene Feed, and bottom dock. Standard phone layouts give the 3x3 traversal grid enough room to contain both compact presence actions, while very short screens retain a reduced map frame so the latest Scene Beat stays above the command belt.
- Explicit combat targets now have a reachable localized Confirm action on desktop and mobile. This closes the party-target Feed path without restoring the old automatic wounded-player redirect, while preserving Cancel and multi-step Feed options.
- Closing Settings and the related system overlays now returns keyboard focus to the visible control that opened the flow. This remains reliable through nested provider/mod screens and across the main menu, character creation, and the live-game app menu.
- Combat Feed now requires the acting party member to choose one living target before resolution. Self, companion, and opposing-creature targets are supported; the old most-wounded-ally shortcut can no longer silently redirect a companion's Feed to the player, and unavailable variants return to target selection without spending the turn.
- Flee and death now use separate outcomes. A living player retreat moves the traveling party to a safe adjacent tile and ends as escape without Regenerate; a fleeing companion leaves the party and remains friendly/recoverable on a safe adjacent tile. Known hostile destinations are excluded, source-tile enemies persist, healthy fled saves are not classified as wipes, and no-safe-route attempts remain in combat.
- Release 0.12.1 documents the defeat-recovery, companion interaction, healing-item, responsive-layout, and interior recovery-bag fixes now included in the public Sites build.
- Companion Drop Off now leaves an existing ally as a persistent friendly resident of the current safe tile or room; returning exposes a distinct Rejoin action that preserves role and AI order without awarding recruitment XP twice. Ordinary Dismiss remains a separate relationship-breaking action.
- Player death during combat now removes the player from the turn queue without cancelling an encounter that living companions can still resolve. Recovery remains unavailable until victory, defeat, escape, or disengagement settles; the outcome and companion roster persist through saves, surviving companions remain physically at the defeat location, and regeneration returns the player alone to home.
- Healing Herb and Strange Mushroom now apply their bounded condition recovery, consume exactly one matching inventory object, and offer an explicit responsive target chooser when companions are present. Healing can target any living party member, caps at that target's maximum, emits localized target-aware feedback, and persists the change. Full-health or defeated targets do not waste the item; combat use is limited to the player's turn and spends that turn. Consumables without an implemented use contract no longer expose a misleading no-op Use button.
- Combat intent targeting now treats living party marks and enemy marks as one target set. Eat, Fight, Talk, and Seduce can resolve against companions or mixed party/enemy selections through the normal intent-first UI; companions can also target the player on their controlled turns. Social interactions preserve existing party membership instead of converting companions into recruitable friendly creatures.
- Combat rows now govern reach across opposing formations rather than blocking interactions within one formation. Party members can Fight, Talk, Seduce, Feed, or Eat one another across their own front/back rows, while cross-side melee/contact attacks retain front-line protection and row requirements. Flying, capacity, willingness, containment, and other action-specific rules remain independent constraints.
- Settings cheats now include a confirmed Test Player Death command for active games. It routes through the authoritative Death/Defeat V2 resolver, deliberately bypasses God Mode for the requested test, warns that Hardcore will delete the active slot, and exercises the selected regular recovery policy without adding a parallel death path. Combat teardown now leaves the recovery scene and desktop/mobile Regenerate controls intact instead of overwriting them with exploration commands.
- Death/Defeat V2 replaces route-owned death handling with one versioned resolver for active, incapacitated, captured, terminal, recovery, and ended-run outcomes. Regular recovery returns the player alone and persists former companion outcomes; the default recovery-bag policy drops ordinary pack contents and gold into a durable collectable world object while equipped, bound, and quest items remain protected. A retain-inventory option is available, and Hardcore now suppresses autosave and deletes only the active full/sparse slot plus its resume metadata.
- Balance acceptance now exposes a deterministic scenario report for hunger thresholds, repeated command pressure, empty rest, size-scaled fast/slow digestion, and Spirit thresholds. The many-to-many interaction contract and Textured/Lightweight/partial-pack map equivalence have matching review matrices.
- The balance scenario report gained a schema-v2 neutral interaction reference with Starving thresholds, effect per command, commands and XP across resolution, and one-, two-, and four-target Fight measurements at every practice tier plus authored full-area behavior. Runtime cross-checks prevent the report from drifting from multi-interaction scaling. Its original 60-XP Tend measurement established the evidence for the later condition-band cap.
- Feed source economics gained an explicit operator decision brief rather than an implicit code choice. It measured the former free nutrition and repeated-XP behavior and proposed separating condition-only Tend care from resource-bearing Nurse, Offer Piece, and Offer Self transfers; the Tend portion is now accepted and active.
- The active backlog now has a requirement-to-evidence audit that distinguishes completed automated foundations, continuing observational playtests, and true operator-gated designs. It explicitly prevents dormant Fight/Talk/Flee sub-action labels from becoming accidental capabilities without resolution, reach/status/equipment, accounting, Scene, AI, save, and responsive contracts.
- Many-to-many combat coverage now proves that marked targets resolve in order even when an early collective hit defeats its target, and that a target becoming unavailable while queued is dropped without canceling remaining valid marks, duplicating participant costs, or advancing more than once.
- Release 0.12.0 keeps one canonical game runtime while separating presentation packaging: the offline download embeds the first-party atlases, Sites serves them as cacheable files, and its entry screen offers Textured or Lightweight emoji play. Both modes retain identical saves, mechanics, and moddable Tileset Pack V1 support.
- Multi-target Fight now distributes each actor's contribution across selected targets instead of cloning full attack output. Per-character practice gradually recovers effectiveness with encounter-level diminishing returns, authored equipment/instinct/area technique hooks can modify coverage, current and legacy/export saves retain progress, and desktop/mobile composers preview the effect. Single-target and non-Fight interactions remain unchanged.
- Hunger and containment now use size-scaled nutrition: stomach entry gives modest immediate fullness, digestion distributes the larger nutrition budget by actual progress, and slow digestion preserves the same total while taking more ticks. Rest no longer feeds the party; eight resting hours add hunger while accelerating digestion eight ticks, so empty holders wake hungrier and meaningful meals can offset the cost.
- Fleeing non-party creatures now relocate deterministically to a valid adjacent overworld tile or connected interior room instead of disappearing. `Survivable containment` now leaves terminally softened prey alive and releasable instead of changing Fight defeat; optional `Power dynamics` owns explicit submission and leaves a friendly, recruit-ready survivor.
- Non-room cells in bundled cave networks and burrows now render as near-black negative space instead of repeating literal wall sprites. Traversal remains blocked, wall semantics remain in the DOM, and replacement packs may still author visible cave boundaries.
- Cave-network and burrow corridors now use the same exact 50% edge contract as surface roads, with a dark stone treatment for isolated chambers, ends, straights, corners, T-junctions, and intersections. Building-room skins and replacement-pack art remain independent.
- Generated roads over deep water now survive only when the full crossing resolves as a traversable bridge. Invalid spans render as ordinary water, and resolved non-route neighbors remove stale visual road seams.
- The bundled road skin now uses exact 50% centerlines and one shared edge width for straights, ends, corners, T-junctions, and intersections. Rotated exits meet adjacent tiles consistently, while replacement packs retain their authored route art.
- Cardinally touching roads now compose into continuous corners, T-junctions, and intersections even when procedural generation assigned separate segment ids; bridges still reject perpendicular seams and retain their authored axis.
- Resource sites now render one transparent gold marker over their underlying terrain and route layers instead of replacing the tile or carpeting a 3x3 footprint. Entering the anchor exposes Search on desktop and mobile, current-tile presence advertises availability, and consumed sites remain labeled as already searched. Landmark anchors likewise use a restrained transparent tower badge instead of replacing their biome with the bundled atlas background.
- Beaches now render from a neutral `terrain-sand` base and compose cardinal shoreline edges only where water is immediately adjacent; near-water inland sand remains neutral and the separate beach identity leaves room for future desert reuse. Danger-site generation now paints one anchor marker, preserves a bounded lower-pressure influence ring, and reserves immediate-danger presentation for live threats. Legacy inline saves regenerate these derived overlays instead of restoring stale skull footprints.
- Terrain Transition V1 replaces the atlas's baked west-facing beach crop with a dedicated seamless sand material. The bundled skin masks its existing water texture into cardinal shores, outer joins, and diagonal inner corners with softened foam boundaries; all map surfaces expose the eight-neighbor transition mask, and authored mod packs can replace any edge or corner without inheriting bundled clipping.
- Natural water still exposes blocked-edge semantics and remains impassable, but the bundled skin no longer renders those edges as constructed cliff walls. Authored barriers, bridges, interiors, and replacement tileset packs keep their own presentation.
- Interior topology now reads as one continuous plan: mobile and desktop remove overworld gutters while inside, and built structures use a generated masonry floor with perimeter walls, reciprocal doorway gaps, and a restrained exit threshold instead of miniature corridor/house atlas cells. Replacement packs retain every path, door, exit, wall, marker, and presence semantic; cave networks keep their organic treatment. Deterministic room graphs and saves are unchanged.
- Save discovery now checks all five full/sparse slots through one IndexedDB connection and readonly transaction instead of repeatedly opening the database. Module/media restoration and embedded atlas preparation report their own readiness, degraded visuals keep emoji fallback, and startup failures are written to the Activity Log.
- Mobile party and creature rails now accept horizontal pointer drags as well as touch panning, suppress the accidental card activation that can follow a swipe, and retain normal taps after the gesture ends.
- First-run startup now establishes the main menu before opening the tutorial, so the tutorial retains its focus trap and dismisses cleanly before menu actions. File-origin viewport coverage now clicks every startup menu destination without pre-closing first-run help.
- T-junction route visuals now emit canonical north/east/south/west semantic IDs, so every topology variant resolves the intended transformed road layer instead of exposing only its base terrain.
- The embedded tileset atlas now prepares a short session blob URL asynchronously. This avoids oversized CSS data-URL rejection and keeps bitmap decoding off the file-origin menu bootstrap path while preserving a fully offline single-file build.
- Combat micro-cards again expose actor selection, and collective group plans can queue multiple marked targets as one slowest-participant effort. Participants pay once, contribute to every target, and the full target list survives save/load.
- Group combat composition now retains an explicit Cancel Group exit. Valid but tactically impossible actions stay selectable as warned attempts; committing pays once, spends the turn, and produces an in-world Scene Feed failure plus combat-history entry instead of a UI error.
- Exploration group interactions now resolve true many-to-many selections: every selected actor contributes to every selected target, including mixed party and local-creature targets and explicitly self-targeted actors. Partial overlap remains many-to-many; only identical actor/target sets become mutual, and pairing is explicit rather than inferred from matching counts.
- Structure interior generator v2 keeps deterministic room graphs while removing surface-biome POIs such as huts, hot springs, camps, and ruins from dungeon and cave cells. Version-one contaminated interiors regenerate on next entry.
- Desktop and mobile neighborhood cells no longer change aspect ratio by position. Responsive checks now enforce square map footprints, equal current/cardinal cell geometry, contained compact presence, and stable short-phone behavior as the foundation for a future layered tileset renderer.
- Release `0.11.1` raises the new-profile completion-token ceiling to 8,192 so reasoning-capable models have room to produce visible narration after hidden reasoning. Existing saved profiles retain their selected ceiling.
- Release `0.11.0` now has one authoritative bundled record for the runtime, save metadata, module compatibility, generated artifact, hosted package, visible version, localized release notes, and save/mod guidance. Builds reject stale package or first-party mod version mirrors.
- A player-facing What's New surface is available before and during a run, with an offline once-per-version notice and English/Spanish Added, Changed, Fixed, Known Issues, and compatibility sections.
- The Activity Log is now run-independent and reachable from startup, Settings, AI Providers, Mods, and Host Catalog. Provider, narration, and catalog failures can be inspected, filtered, searched, exported, or cleared without starting a game.
- OpenAI-compatible profiles now support provider-managed, none, minimal, low, medium, and high reasoning effort. Unsupported values receive a specific diagnostic, and `file://` remote-provider attempts require an explicit session-only warning/override while browser TLS and CORS remain authoritative.
- The Mod Manager no longer exposes the development-only Create Example or Module Samples controls. Local builds retain trusted file import, while servers with a real catalog expose a conditional Host Catalog entry.
- Simple Narrator 0.6 now gives Storyteller, Character reactions, and Hybrid distinct prompt contracts. Character-focused prose is limited to observable behavior, supplied dialogue, stated relationship or status cues, and visible deltas; self-interactions, spectator events, mixed exchanges, and character-free exploration retain explicit safe fallbacks.
- Simple Narrator 0.5 now renders ready tile-observation prose in the center tile, caches the 32 most recent state-and-style variants, reuses unchanged locations without another API call, and immediately rejects stale responses after movement or visible tile changes. Plain described exploration tiles now emit narratable observations even without landmarks, creatures, structures, or items.
- Simple Narrator now receives an explicit player-viewpoint contract with per-beat actor, target, self, observer, and mixed participation. Spectator events remain third-person actions observed from the player perspective, missing identity falls back safely, and narrator requests inherit the selected provider profile timeout.
- OpenAI-compatible provider profiles now expose a configurable reasoning-inclusive completion-token ceiling (default 1,536; range 64–32,768), use a reasoning-friendly 30-second default timeout, and retain the independent 500-character narration limit. Provider tests use a narration-shaped player-POV request, and reasoning-budget exhaustion receives actionable guidance.
- File-origin builds now detect their opaque origin and offer only credential-free loopback AI connections, with an Ollama-compatible default and clear Settings guidance; remote providers remain available from HTTPS or localhost origins.
- Narration now exposes queued, request-sent, response-received, and attached lifecycle stages in a dedicated Activity Log category; early publication failures are no longer silent.
- Failed narration requests now create sanitized Activity Log errors with a dedicated filter and provider error code.
- Persisted enabled modules now restore their runtime hooks after refresh, after saved content preferences have been applied.
- Combat-only control effects such as restraint, envelopment, terrain entrapment, stun, freeze, charm, fear, combat sleep, and refractory recovery now clear when an encounter ends. Old noncombat saves are sanitized on load; poison, bleeding, and burns persist until safe rest or defeat regeneration cures them.
- Toasts self-expire, pause on pointer hover, reset expiration on tap, and retain an explicit close control.
- Releasing the last swallowed enemy reinstates combat when that hostile returns to the battlefield.
- Contained and consumed creatures render in separate Holdings collections.
- Enemy AI filters preferred attack targets through current reach before committing its turn.
- Content-posture changes immediately rebuild the dynamic provider category and gameplay-variant settings.
- System overlay navigation now preserves parent and live-game origins across Settings, AI Providers, Mods, and Host Catalog.

See the focused doctrine documents in `docs/` for current contracts and deferred design boundaries.
