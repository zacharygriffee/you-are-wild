# Combat Row And Reach Audit

This note records the current front/back row and intent-owned reach behavior so future combat UI work does not overpromise mechanics that do not exist yet.

## Current Behavior

- Combat rows are assigned at combat start when a living unit does not already have a valid row.
- Flying or ranged units default to the back row.
- Other units default to the front row.
- Rows do not define every interaction. Each intent owns its own reach profile.
- `fight` currently evaluates melee, ranged, or hybrid reach from actor traits and action metadata.
- `feast` currently evaluates close/contact reach.
- Social/support intents such as Talk, Play, and Feed can target across rows unless another explicit mechanic blocks them.
- Physical attempts against flying or back-row targets are allowed when the target is otherwise valid. They can consume the turn and fail with Scene Feed feedback that explains the reach problem.
- Flying actors can engage across rows. Ranged actors can reach flying targets and use ranged reach from the back row. Anti-flying answers flying targets for relevant physical profiles.
- `Move Row` toggles the active actor between front and back rows, clears transient targeting/sync/feed state, logs the row change, and consumes the actor's turn.

## UI Copy

- If a back-row or flying target is hard to reach, UI copy should not imply that `Move Row` universally fixes it.
- Current correction copy should prefer intent-owned guidance: social actions can cross rows, close/contact may fail, and flying/ranged/anti-flying actors are better physical answers.
- Row should remain visible in combat details and compact combat cards while rows affect targeting or damage feedback.
- `Move Row` may remain visible for now because it is an implemented turn-consuming intent, but future UI passes should consider hiding or demoting it unless the active actor has a clear tactical reason to change rows.

## Future Row System Questions

A formal row system should decide these before expanding mechanics:

- Can back-row melee actors hit front-row targets?
- Do front-row units block access to back-row units?
- Can moving to the back row create defensive value for non-ranged units?
- Should terrain, body size, reach traits, or weapon tags add row-dependent access?
- Should row movement ever help a ground melee actor reach a back-row or flying target, or is that always reserved for reach capabilities?
- How should future equipment, snare/grab, terrain, size, and special reach tags map into explicit per-intent reach profiles?

Until those questions are answered, treat rows as formation context and presentation signal. Intent reach profiles decide whether an action succeeds, and failed attempts should explain themselves through Scene Feed rather than generic invalid-command feedback.
