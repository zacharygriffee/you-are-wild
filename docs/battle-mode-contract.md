# Battle Mode Contract

Battle mode is not a separate action model. It is the normal actor, target, and intent flow with tactical constraints layered on top.

## Control Surface

- The command composer/toolbelt owns intent buttons and phase controls.
- Party cards/chips route actor selection, participant selection, and party detail access.
- Creature and enemy cards/chips own target selection.
- The center play surface presents current events, prompts, and tile-scoped combat context.
- Center combat buttons are compatibility-only if they exist at all; new combat controls should route through the shared composer grammar.

## What Combat Adds

- Initiative queue decides whose actor card is active.
- Current actor gates which panel controls are enabled.
- Intent-owned row and reach rules constrain valid targets. Fight, Feast/contact, Play/Seduce/contact-social, Talk, support, ranged, flying, and anti-flying profiles are evaluated by the shared reach helpers rather than one global row rule.
- Terrain can modify speed, reach, cover, or status outcomes.
- Group actions resolve through the same intent model, but timing is delayed to the slowest participant.
- Physical and contact-social group actions require every committed participant to have a valid contribution path at queue time; if the battlefield changes before resolution, the queued plan can fizzle through the compatibility group-action plumbing.
- The internal `moveRow` command remains stable, but player-facing combat labels it as Advance from the back row and Retreat from the front row.
- Sync remains compatibility/internal terminology and plumbing. Player-facing combat should use Lead Actor + Helpers -> Target(s) -> Intent -> Commit.
- Flee is actor-specific. A party member can opt out; when all remaining party members have fled or fallen, combat resolves.

See [Combat Row And Reach Audit](combat-row-reach-audit.md) for the current first-pass row behavior and open formation-system questions.

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
