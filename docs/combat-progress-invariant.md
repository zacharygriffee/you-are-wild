# Combat Progress Invariant

Active combat must always be in exactly one progress class:

1. **Terminal**: victory, defeat, flee, or disengage resolves combat.
2. **Automatic**: status loss, AI, queue repair, or delayed group resolution advances without player input.
3. **Manual**: the current controllable actor has a turn-consuming command, or a transient composer phase has an exit that restores one.

`App._combatProgressState()` exposes a serializable snapshot of this classification for tests and diagnostics. It does not resolve combat by itself.

## Automatic Progress

The shared `processTurn()` path owns current-actor sanitation and automatic turn loss. Core automatic states include:

- refractory recovery
- stun
- freeze skip
- sleep
- restraint
- terrain-stuck
- envelopment
- low-health fear flee
- autonomous ally and enemy AI
- invalid or empty queue repair
- delayed group action resolution

Save/load resume must re-enter `processTurn()`. It must not render party controls directly, because that would bypass automatic status handling and AI ownership rules.

An AI actor with no valid target still consumes its turn and emits readable feedback. This includes a lone charmed enemy with no other enemy to target.

## Manual Progress

A normal controllable turn always exposes `Skip`. Skip is the unconditional core progress command after current-turn ownership is validated:

- it has no target requirement;
- it is not blocked by action-pressure or future balance gates;
- it clears stale transient selection before advancing.

`Flee` is also normally available, but it is a mechanic with costs and success rules rather than the final invariant fallback.

Transient composer phases may hide normal intents only while they expose a restoring exit:

- target selection: Cancel action
- Feed options: Cancel Feed
- Sync choose/participants/target: Cancel Sync
- group plan confirmation: clear intent or clear plan
- group composition: clear group

These exits must remain visible, enabled, keyboard-accessible, and within the viewport on desktop, the responsive breakpoint, mobile, and short-height mobile layouts.

## Recovery And Diagnostics

`App._recoverCombatProgress(reason)` clears stale transient state, resets a stale processing flag, sanitizes the queue, records `App.combatProgressDiagnostic`, and re-enters `processTurn()`.

Core uses this path when:

- active combat resumes after loading;
- an action resolver throws before it can complete or return control.

The diagnostic snapshot contains only bounded state: reason, progress classification, round, turn, actor identity, phase, and advertised recovery commands.

## Mod Contract

Combat mods must preserve the same invariant:

- A status that prevents action must define a bounded automatic progression path.
- AI and custom resolution branches must call `nextTurn()`, resolve combat, or return control to a manual composer phase.
- A custom modal/selection phase that hides normal intents must expose a restoring exit.
- Mods must not make `Skip` depend on target eligibility or resource pressure.
- Persistent combat state must resume through the shared turn processor.

Permanent or intentionally indefinite control-loss effects need a separate authored counterplay mechanic. They must not be represented as an endless automatic skip loop.

## Regression Matrix

Automated coverage combines:

- unit matrices for core incapacitating states and turn ownership;
- stale queue, processing, save/load, exception, and no-target cases;
- DOM checks for every transient phase exit;
- Playwright checks at desktop, `1024px`, mobile, and short-mobile viewports;
- the normal full-build, viewport, and interaction suites.
