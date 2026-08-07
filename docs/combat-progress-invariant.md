# Combat Progress Invariant

Active combat must always be in exactly one progress class:

1. **Terminal**: victory, defeat, flee, or disengage resolves combat.
2. **Automatic**: status loss, AI, queue repair, or delayed group resolution advances without player input.
3. **Manual**: the current controllable actor has a turn-consuming command, or a transient composer phase has an exit that restores one.

`App._combatProgressState()` exposes a serializable snapshot of this classification for tests and diagnostics. It does not resolve combat by itself.

Advancing the queue is necessary but is not sufficient progress. When no living
manual actor remains, automatic rounds must also converge toward a changed
material state or a terminal outcome. Repeating the same damage, spirit,
disposition, row, containment, and bounded-status state is a stalemate even if
the turn counter and narration continue changing.

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

When the player is incapacitated and no manual companion remains, a passive
autonomous companion treats the situation as a crisis. If a non-Hold legal
action exists, the companion narratively abandons its usual restraint and takes
that action. This is a preference override, not permission to bypass targeting,
reach, capability, or action-cost rules.

At each completed all-automatic round, core records a bounded fingerprint of
material combat state. A repeated state or short cycle increments the
no-progress count; material change resets it. Bounded statuses include their
remaining turns, so ordinary stun, freeze, sleep, restraint, terrain, fear, and
similar recovery cannot be mistaken for a permanent stalemate. A living manual
actor who is not currently blocked by an automatic status disables stalemate
resolution because Skip, Flee, positioning, and other player choices remain
available. Status-blocked manual actors rejoin that set as soon as control
returns.

Three repeated no-progress observations resolve as `disengage`. The Scene Feed
narrates that neither side can force the encounter forward; it must not report a
technical error or grant victory. A larger automatic-round ceiling is the final
safety net for unexpected or modded cycles, including Instant pacing where an
unbounded synchronous loop would otherwise overflow the JavaScript stack.

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
- Repeated `nextTurn()` calls without material state change do not satisfy the invariant.
- A custom modal/selection phase that hides normal intents must expose a restoring exit.
- Mods must not make `Skip` depend on target eligibility or resource pressure.
- Persistent combat state must resume through the shared turn processor.

Permanent or intentionally indefinite control-loss effects need a separate authored counterplay mechanic. They must not be represented as an endless automatic skip loop.

## Regression Matrix

Automated coverage combines:

- unit matrices for core incapacitating states and turn ownership;
- repeated-state, short-cycle, multi-actor, crisis-override, and Instant-pacing liveness cases;
- restored autonomous stalemates and manual-companion false-positive guards;
- stale queue, processing, save/load, exception, and no-target cases;
- DOM checks for every transient phase exit;
- Playwright checks at desktop, `1024px`, mobile, and short-mobile viewports;
- the normal full-build, viewport, and interaction suites.
