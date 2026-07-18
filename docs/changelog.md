# Development Changelog

This is a compact history of completed foundations. Git remains the authoritative implementation history.

## Current Foundations

- Modular source builds a generated single-file playable artifact; CI validates and uploads it while `dist/` remains ignored.
- The 3x3 play surface, compact desktop cards, mobile actor/target rails, composer-owned intents, Scene Feed, Activity Log, and restrained toast layer are implemented.
- Accessibility foundations include keyboard-operable cards/chips, focus traps, localized accessible names, high contrast, reduced motion, and font scaling.
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
- Traversal Surface Geometry V1 separates the desktop 3x3 neighborhood from the current-location story panel and gives desktop and mobile traversal maps equal square tracks. The center location retains semantic tileset metadata, compact presence, keyboard/cardinal movement, and emoji fallback while combat keeps its full-stage layout.
- Core now exposes SFW and Mature postures, while provider-declared categories, gameplay variants, localized labels, creation options, and explicit narrative stay in optional modules outside the generated HTML.
- Provider-neutral narration now uses immutable post-commit hooks, an owned presentation-only store, focused context, declarative mod settings, session-only provider connections, and separately packaged SFW/Mature and explicit orchestrators.
- Narration prerequisites now include credential-safe module settings, new/load runtime cancellation, exclusive orchestrator ownership, authoritative adult eligibility, target-exchange context snapshots, packaged integration coverage, and a keyless Puter Connect/Test/Disconnect path.
- A dedicated capability-based AI Providers panel now manages stable profiles separately from mods. The built-in OpenAI-Compatible text adapter supports browser-direct Responses and Chat Completions with fixed-origin requests, blocked redirects, conservative fallback, session-only credentials, and mocked Direct OpenAI/OpenRouter/generic/local coverage.
- Narration mods now have bounded provider-neutral instructions layered beneath immutable engine constraints. Simple Narrator exposes multiline instructions, ready narration becomes the primary Scene Feed passage with source events retained in a disclosure, and offline Template Narrator plus Diagnostics packages exercise the API without provider access.
- Startup navigation now keeps Continue/New/Load primary and Settings/Mods/Tutorial compact. AI Providers lives under Settings, a real server-supplied Host Catalog appears conditionally under Mods, nested screens return through their origin, and short or enlarged-text layouts retain a scroll fallback.

## Recent Fixes

- Combat micro-cards again expose actor selection, and collective group plans can queue multiple marked targets as one slowest-participant effort. Participants pay once, contribute to every target, and the full target list survives save/load. Deterministically impossible reach returns to planning without spending the turn.
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
