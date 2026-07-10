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
- Known-impossible physical target selection is blocked before spending a turn and must explain the reach problem without generic invalid-command copy.
- Front-row blockers protect same-side back-row units from ordinary melee/contact actions.
- Exposed back-row units are reachable by ordinary melee/contact when their side has no living front-row blockers.
- Back-row ordinary melee actors cannot successfully hit front-row targets. The target should be blocked during selection unless the actor has ranged/flying/reach/special access.
- Back-row close/contact Feast attempts against front-row targets follow the same shape until the actor has front-row contact or a future special reach profile.
- Flying actors can engage across rows. Ranged actors can reach flying targets and use ranged reach from the back row. Anti-flying answers flying targets for relevant physical profiles.
- Committed/delayed group plans can still fizzle if their target or participant reach becomes invalid before resolution. That fizzle consumes the committed plan through existing group timing and emits Scene Feed feedback.
- Physical group plans require every committed physical participant to have a valid contribution path by default. Social group plans ignore rows unless another mechanic says otherwise.
- `Move Row` toggles the active actor between front and back rows, clears transient targeting/sync/feed state, logs the row change, and consumes the actor's turn.

## UI Copy

- If a back-row or flying target is hard to reach, UI copy should not imply that `Move Row` universally fixes it.
- Current correction copy should prefer intent-owned guidance: social actions can cross rows, close/contact may fail, and flying/ranged/anti-flying actors are better physical answers.
- Row should remain visible in combat details and compact combat cards while rows affect targeting or damage feedback.
- `Move Row` may remain visible for now because it is an implemented turn-consuming intent, but future UI passes should consider hiding or demoting it unless the active actor has a clear tactical reason to change rows.

## Deferred Row System Questions

The foundation is settled, but later mechanics still need explicit design before implementation:

- Which future reach traits or equipment allow back-row melee actors to hit front-row targets?
- Can moving to the back row create defensive value for non-ranged units beyond current protection?
- How do terrain, body size, weapon tags, snare/grab, pull, and ability-specific reach map into per-intent reach profiles?
- How should future area or multi-target distribution interact with blockers?

Until those mechanics are designed, treat rows as formation context and presentation signal. Intent reach profiles decide whether an action is selectable, whether a delayed plan still resolves, and what Scene Feed explanation appears when reach fails.
