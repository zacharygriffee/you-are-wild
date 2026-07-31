# School of Steel — author note

## Repository evidence used

- `docs/modding.md`: canonical package envelope, trusted-local boundary, permission declarations, lifecycle cleanup, locale registration, and the public `MODS.registerCombatTechnique` seam.
- `docs/combat-technique-v1.md`: the complete declarative technique schema; universal eligibility; deterministic damage bounds; split-area target caps and recovery; supported status vocabulary; Fight-menu discovery; queued-save behavior; and unload cancellation.
- `docs/locale-pack-v1.md` and `docs/examples/neutral-conformance.yawmod.json`: owned entries in the maintained `en` and `es` locale tables.
- `optional-mods/you-are-wild-waystone-recovery.yawmod.json`: maintained version-one package structure, runtime requirements, localized fallback text, and hot-toggle-safe registration style.
- `app/src/core/combat-techniques.js`: current validation bounds, namespace rules, eligibility behavior, and the supported `stun` status.
- `app/src/core/module-system.js`: permission enforcement, contribution ownership, and combat-technique cleanup registration.
- `app/test/test.js`: public-contract evidence that owned techniques are namespaced, removed on unload, cancel their queued work, retain unrelated Basic Attacks, and preserve active namespaced keys through save and reload.
- `app/release.json`: current development game version `0.17.0`.

## Assumptions and design decisions

- “Eligible characters” means any living actor that can ordinarily use Fight. Each profile therefore uses empty eligibility and equipment constraints. This makes all three techniques discoverable after actor and target selection without assuming undocumented species abilities or equipment tags.
- Measured Strike represents precision through supported damage shaping and a strict one-target cap; the contract has no hit-chance or accuracy field.
- Sweeping Rhythm uses the established split multi-target model, caps selection at three targets, and recovers half of the normal split reduction. It does not claim full area damage.
- Staggering Blow uses the existing core-owned `stun` status, with reduced damage, a 60% deterministic status chance, and one turn of duration.
- No technique overrides reach, so every actor retains ordinary Fight reach and core remains authoritative for blockers, flying access, contact, terrain, and failure narration.
- The module declares `hotToggleSafe` because it owns only locale entries and declarative runtime profiles. Core removes those contributions and cancels their queued commands on disable; re-enable reruns registration without duplicating module save state.
- The module stores no custom state. Core persists only a queued command’s namespaced technique key, restores it when the profile is active and still eligible, and otherwise drops it safely according to Combat Technique V1.

## Public-contract limits

- Combat Technique V1 prevented custom accuracy/critical-hit behavior, arbitrary targeting logic, custom status keys or processors, combat callbacks, hidden costs, permanent reach changes, and replacement of Basic Attack.
- Item Definition V2 does not support module equipment, so this package does not invent a weapon or depend on an acquisition path it cannot provide.
- The module cannot keep an owned queued technique executable while disabled. Core intentionally cancels that work on unload rather than substituting another attack.
- Balance tuning beyond the bounded declarative values and core interaction rules is not exposed. The chosen numbers are conservative authoring assumptions, not a claim of exhaustive play-balance validation.
