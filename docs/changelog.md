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
- Core now exposes SFW and Mature postures, while provider-declared categories, gameplay variants, localized labels, creation options, and explicit narrative stay in optional modules outside the generated HTML.
- Provider-neutral narration now uses immutable post-commit hooks, an owned presentation-only store, focused context, declarative mod settings, session-only provider connections, and separately packaged SFW/Mature and explicit orchestrators.

## Recent Fixes

- Toasts self-expire, pause on pointer hover, reset expiration on tap, and retain an explicit close control.
- Releasing the last swallowed enemy reinstates combat when that hostile returns to the battlefield.
- Contained and consumed creatures render in separate Holdings collections.
- Enemy AI filters preferred attack targets through current reach before committing its turn.
- Content-posture changes immediately rebuild the dynamic provider category and gameplay-variant settings.

See the focused doctrine documents in `docs/` for current contracts and deferred design boundaries.
