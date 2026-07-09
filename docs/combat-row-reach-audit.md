# Combat Row And Reach Audit

This note records the current front/back row behavior so future combat UI work does not overpromise mechanics that do not exist yet.

## Current Behavior

- Combat rows are assigned at combat start when a living unit does not already have a valid row.
- Flying or ranged units default to the back row.
- Other units default to the front row.
- `fight` and `feast` are the current physical combat actions.
- Physical actions against flying targets require an actor with `flying`, `ranged`, or `antiflying`.
- Physical actions against back-row targets require an actor with `flying`, `ranged`, or `antiflying`.
- Non-physical combat actions can target across rows under the existing target rules.
- `Move Row` toggles the active actor between front and back rows, clears transient targeting/sync/feed state, logs the row change, and consumes the actor's turn.

## UI Copy

- If a back-row or flying target is unreachable, UI copy should not imply that `Move Row` fixes it.
- Current correction copy should prefer: "Use a flying, ranged, or anti-flying actor."
- Row should remain visible in combat details and compact combat cards while rows affect targeting or damage feedback.
- `Move Row` may remain visible for now because it is an implemented turn-consuming intent, but future UI passes should consider hiding or demoting it unless the active actor has a clear tactical reason to change rows.

## Future Row System Questions

A formal row system should decide these before expanding mechanics:

- Can back-row melee actors hit front-row targets?
- Do front-row units block access to back-row units?
- Can moving to the back row create defensive value for non-ranged units?
- Should terrain, body size, reach traits, or weapon tags add row-dependent access?
- Should row movement ever help a ground melee actor reach a back-row or flying target, or is that always reserved for reach capabilities?

Until those questions are answered, treat rows as a first-pass reach constraint and presentation signal, not a complete formation system.
