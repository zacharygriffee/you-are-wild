# Combat Agency / Interruption V1 Contract

Status: **implemented on the 0.19.0 release-candidate line**

This contract was merged through PR #18 at `44e0dad`. Release-candidate
preparation does not itself authorize publication, deployment, tagging, or
promotion.

## Player flow

1. Automatic combat reaches an autonomous companion's turn.
2. One legal candidate build produces a primary intent and at most three
   pre-ranked alternatives.
3. **Pause auto** retains the uncommitted continuation and shows the same intent
   on desktop and mobile.
4. The player may resume unchanged or make one suggestion from the stored legal
   alternatives.
5. A suggestion immediately reserves the player's next ordinary actionable
   queue turn. The cost applies whether the companion complies or refuses.
6. Compliance is derived without RNG from the companion's saved Bond projection
   and the request's departure from the companion's own stored ranking.
7. **Resume auto** commits either the accepted alternative or the companion's
   original choice through the existing resolver.
8. When the player next reaches an ordinary actionable turn, the reservation is
   narrated, consumed, cleared, and advances the queue exactly once. Forced
   restraint, terrain, Terror, or other status skips resolve first and do not
   double-charge the reservation.

The player character never receives a companion controller, intent transaction,
suggestion control, or Bond ledger.

## Companion Bond V1

Each recruited non-player party member owns a saved, versioned, bounded event
ledger. Events are authored records with stable sequence, type, weight, day,
hour, source, initiator, request identity, and optional deduplication identity.
Loaded weights are replaced by the core authored definition, so a save cannot
change the meaning of an event by editing its cached number.

The ledger retains at most 48 events. Pruned weights move into a bounded carried
projection and the total event count remains available. Bond score is clamped to
`[-100, 100]` and maps to four presentation tiers:

| Score | Tier |
| --- | --- |
| below 6 | Strained |
| 6–13 | Tentative |
| 14–23 | Steady |
| 24 or more | Trusted |

Core V1 event definitions are intentionally narrow:

| Event | Weight |
| --- | ---: |
| legacy recruitment | 16 |
| submitted recruitment | 4 |
| invited recruitment | 12 |
| befriended recruitment | 18 |
| bonded recruitment | 26 |
| successful player Feed/Tend care | 3 |
| successful player Talk care | 2 |
| successful player Play care | 3 |
| complied request | 0 |
| refused request | -1 |

Care events require an actual condition or Spirit gain, the player as actor,
and a non-player party member as target. The same care type for the same
companion is recorded at most once per game day. This makes the ledger useful
without creating an immediate care-farming loop. Neglect, coercion, witnessed
conduct, departure, and hostility events remain future authored extensions;
Combat Agency does not pretend those systems already exist.

Old saves without a ledger receive one stable recruitment seed derived from
saved recruitment continuity, or the neutral legacy seed when that history is
absent. Existing Duty, Stance, Control, Play/Pause, and identity history remain
unchanged.

## Deterministic compliance

Suggestion difficulty is:

```text
6
+ 4 per alternative position after the first
+ min(12, floor(max(0, primary score - requested score) / 8))
```

The final value is bounded to `6..30`. The companion complies when its derived
Bond score is at least the difficulty. There is no random roll, provider call,
wall clock, presentation delay, or reranking input. Identical saved ledger,
turn, and ranked choices therefore reproduce the same outcome.

## Transaction and save invariants

1. One candidate build supplies the primary and alternatives.
2. The player may make zero or one request per transaction.
3. A request can select only a stored legal alternative.
4. Only one player-turn reservation may exist at a time.
5. Refusal retains the original companion intent but never refunds the cost.
6. An accepted alternative that becomes stale checks the original primary once;
   otherwise the existing Hold fallback is used. No new candidate build occurs.
7. Only one mechanical action commits and only one turn transition occurs.
8. Preview objects, callbacks, and live transaction references remain transient.
9. The authored Bond ledger and plain-data turn reservation are saved. Reload
   reconstructs the current intent from the unspent queue turn and matches an
   accepted request through stable action/target identity.
10. Malformed reservations, missing players, missing companions, and companions
    no longer in the party are discarded during combat restore.
11. Presentation speed and Pause/Resume cannot change ranking, cost, compliance,
    queue priority, or outcome.
12. The existing companion Play/Pause controller and paused preference dialog
    remain a separate direct-control path.
13. The reservation is scoped to its encounter. If combat ends before another
    ordinary player turn exists, teardown discards the now-uncollectable queue
    reservation instead of leaking it into exploration or a later encounter.

## Deferred work

True instant/reaction priority, emergency player Flee, loyalty decay, needs,
witnessed conduct, disloyalty, desertion, and companion hostility require later
explicit contracts. V1 reserves an ordinary future turn; it does not introduce
a reaction queue or claim that the broader relationship simulation exists.
