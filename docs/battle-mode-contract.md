# Battle Mode Contract

Battle mode is not a separate action model. It is the normal actor, target, and intent flow with tactical constraints layered on top.

## Control Surface

- Party cards/chips own actor intent.
- Creature and enemy cards/chips own target selection.
- The center play surface presents current events, prompts, and tile-scoped combat context.
- Center combat buttons are compatibility-only if they exist at all; new combat controls should be panel-first.

## What Combat Adds

- Initiative queue decides whose actor card is active.
- Current actor gates which panel controls are enabled.
- Row and reach rules constrain valid targets.
- Terrain can modify speed, reach, cover, or status outcomes.
- Group actions resolve through the same intent model, but timing is delayed to the slowest participant.
- Flee is actor-specific. A party member can opt out; when all remaining party members have fled or fallen, combat resolves.

## Command Shape

Combat intent should normalize toward:

```js
{
  actorId,
  action,
  subAction,
  targetId,
  targetType,
  source: 'panel' | 'toolbelt' | 'keyboard' | 'compat'
}
```

The current implementation still has legacy wrappers, but they should route through the shared combat intent dispatcher rather than creating a parallel center-only action path.

## Non-Goals

- Do not duplicate every combat action in the center context area.
- Do not fork exploration actions and combat actions unless the mechanic truly differs.
- Do not make mobile and desktop separate combat models; desktop can show more information, but should use the same conceptual flow.
