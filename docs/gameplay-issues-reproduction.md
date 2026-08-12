# Gameplay Issues Reproduction — Chew, Combat Agency, and Flight

Status: test-first working note on `codex/gameplay-issues-reproduction`, based on
`origin/main` at `c365856`. This note records observed contracts and decision
boundaries; it is not a release declaration.

## 1. Chew nourishment

### Reproduced prior behavior

A legal Chew paid the ordinary Feast hunger cost and applied equal Vitality and
Punishment damage. It granted no hunger relief and did not debit the existing
Body Mass Ledger. There is no separate resisted roll after a Chew command is
legal: reach, target, setting, and action-cost validation can reject the command,
but a resolving Chew applies at least one damage. Swallow resistance is a
different Feast variant and must not be used as evidence for Chew.

### Accepted policy and fixture contract

The player selected mass-bearing nourishment: actual Vitality removed by Chew
removes a proportional amount of conserved target body mass, and that mass
immediately nourishes the actual chewer. Group Chew divides the finite transfer
between participating chewers by their deterministic damage contribution.

The implementation reuses Body Mass Ledger V1 rather than adding a parallel
food counter:

- default maximum mass is `size * massPerSize` (`25` for `core:standard`);
- a species can bind a module-owned body profile, so `massPerSize`, viable
  residue, regrowth, and corpse yield remain procedural and moddable;
- removed mass is a saved `yaw-body-mass-transaction-v1` record with reason
  `chew-nourishment`;
- one mass unit is one immediate nourishment unit in this first integration;
- living Chew preserves the profile's `minimumViablePercent`; the residue can
  become recoverable corpse mass on terminal Vitality depletion;
- being already sated can cap actual hunger relief, but it does not recreate
  mass that was physically consumed;
- old saves with no `bodyMass` continue to initialize deterministically from
  species size and body profile.

Mass does not yet scale Chew damage, maximum Punishment, or maximum Vitality.
Doing that would rebalance every species and invalidate current combat baselines;
the current fixture explicitly proves that a denser moddable profile changes
nourishment without silently changing damage.

## 2. Combat Agency / Interruption V1

### Current-state fixture

The current mechanics provide three separate pieces that must not be conflated:

1. `readable`, `fast`, and `instant` are presentation delays only. A scheduled
   callback is pending game work, not a player-owned mechanical pause.
2. Companion Play/Pause changes only that companion's autonomous controller,
   only on the player's turn. It preserves Duty, Stance, Control, and recruitment
   history.
3. When a paused companion's turn arrives, the game shows its deterministic
   preferred action. “Follow preference” executes the same legal autonomous
   choice; “Choose another action” opens ordinary direct control. It is not a
   suggestion, persuasion check, refusal, emergency reaction, or out-of-turn
   interrupt.

### Implemented contract

Combat now exposes one shared desktop/mobile **Pause auto / Resume auto**
presentation control throughout an active encounter. It is deliberately not a
mechanical interrupt:

- Pause retains at most one scheduled automatic continuation at the next safe
  presentation boundary; it never rewinds an action that already committed.
- A cleared timer is invalidated, so a late callback cannot duplicate an action.
- Resume runs the retained continuation once, using the same pacing mode.
- An already-active hold is respected even in `instant` pacing.
- Hold state, callbacks, and companion previews are transient and are cleared at
  combat teardown. They are not serialized; reloading reconstructs the current
  unspent turn through the existing deterministic queue.

Before an autonomous companion commits its already-ranked choice, the combat
summary and mobile toolbelt show the companion, action, target, Duty, and Stance
as an explicitly uncommitted intent preview. The preview does not rerank, spend,
roll, emit a committed decision beat, or create a second action path. With the
presentation held, reprocessing the turn reuses the same pending transaction;
Resume clears the preview and passes that stored result to the existing
`executeChoice` resolver exactly once. The existing per-companion Play/Pause
preference dialog remains separate and unchanged.

The intent preview owns a finite transaction: one legal
candidate build, one primary proposal, at most three stored alternatives, no
reranking on repeated held-turn processing, and at most one stored fallback if
the primary becomes stale. While held, the player may make one suggestion from
those alternatives. The request reserves the player's next ordinary actionable
turn whether the companion complies or refuses. Compliance is deterministic
from the saved Companion Bond ledger and the request's departure from the
companion's own ranking; it never uses RNG, preview timing, or a provider.

The saved reservation survives reload and is charged only when the player next
reaches an ordinary actionable turn. Forced status skips resolve first and do
not erase or double-charge it. The ledger is per companion, bounded, seeded from
recruitment continuity, and gains deduplicated authored care events from
successful player-to-companion Feed, Talk, and Play. Exact weights, migration,
and invariants are recorded in
[Combat Agency / Interruption V1 Decision](combat-agency-v1-decision.md).

True reaction priority, emergency player Flee, loyalty decay, neglect, witnessed
conduct, desertion, and hostility remain explicitly deferred rather than being
inferred from current Hunger or Spirit.

## 3. Companion flight

### Deterministic transition audit

An autonomous companion does not currently rank Flee as an ordinary behavior
candidate. Companion removal from combat has two automatic causes:

- `combat-ally-flee`: only a species whose temperament is timid can attempt to
  leave when living enemies badly outnumber living party members. The seeded
  roll, success, failed route, and resisted outcome each narrate immediately.
- `combat-terror`: explicit Terror, or ordinary Fear below 30% condition,
  consumes the affected unit's turn and attempts a safe relocation. The
  turn-start resolver narrates the result before advancing the queue.

Harpy is not timid. Full health, flying mobility, grounded enemies, and being
outnumbered therefore do not by themselves cause Harpy to flee. A full-health
Harpy can leave only if some explicit source has already authored Terror, the
player directly commands Flee while controlling that companion, or external
saved/mod state supplies an equivalent authored cause.

The full-health Harpy fixture proves both halves: no timid flight occurs before
a cause; after explicit Terror, immediate Activity Log and Scene Feed narration,
party removal, queue removal, selection cleanup, safe adjacent world placement,
`lastFledAt.source`, and binary save placement all agree. A separate existing
fixture clears stale `fledCombat` at the start of every new encounter.

Player Terror now has one reach-aware boundary that is deliberately separate
from companion morale. A flying player does not automatically leave combat when
every living hostile is ground-only and the shared Fight reach resolver says
none can attack them. Terror still consumes that bounded status turn and the
Scene Feed explains that the player holds altitude. Any flying, ranged,
anti-flying, or otherwise authored reachable attacker preserves the existing
forced-flight result. Companion Terror remains unchanged.

If an automatic encounter cannot make material progress, the existing bounded
liveness guard resolves it as an explicit stalemate/disengage; it does not set
the player or a companion's `fledCombat` flag. No broader morale scoring was
added. Condition, stance, route choice, loyalty, and player-directed retreat
remain separate authored rules.
