# Scene Feed DSL

The Scene Feed is the player-facing account of what just happened. It is not the Activity Log. The Activity Log remains durable technical history; the Scene Feed is immediate point-of-view feedback for resolved or failed gameplay beats.

The current implementation keeps the compatibility namespace `YAW_STORY_EVENTS`, but the canonical model is:

```text
InteractionPlan + ActionOutcome -> SceneBeat -> Scene Feed
```

LLM or media mods may consume Scene Beats later, but core gameplay must remain readable through deterministic templates with no network or model dependency.

## SceneBeat Shape

A Scene Beat is structured data with rendered text. It should preserve:

- `mode`: `adventure`, `combat`, or another explicit mode.
- `action`: stable internal action id such as `fight`, `flirt`, `feed`, `sync_fight`, or `observe`.
- `subAction`: optional verb detail such as a selected sub-action.
- `shape`: interaction shape such as `one-to-one`, `many-to-one`, `one-to-many`, `many-to-many`, or `tile-entry`.
- `actors`: resolved actor unit references.
- `targets`: resolved target unit references.
- `resultKind`: `resolved`, `damage`, `recovery`, `social`, `failure`, `observation`, `decisive`, or a more specific future kind.
- `summary`: short beat text for compact Scene Feed streams.
- `passage`: optional expanded prose for the Scene Sheet.
- `deltas`: mechanical changes such as damage, healing, spirit, state, or resource changes.
- `tags`: deterministic routing tags such as `cannot-reach`, `tile-entry`, `observation`, `creatures`, or `recruit-available`.
- `importance`: `normal`, `hint`, `notable`, `major`, or a future comparable priority.
- `source`: origin such as `interaction-result`, `tile-entry`, `recruitment`, or a mod id.
- `contentTier`: active content tier used when selecting templates.
- `subEvents`: optional per-target or per-effect metadata for one command with multiple results.

Multiple effects from one command should coalesce into one Scene Beat with `subEvents`; do not spam separate beats for each target unless the player issued separate commands.

## ActionOutcome Input

The renderer accepts either existing result strings or structured outcomes. Prefer structured outcomes for new code.

Useful outcome fields:

- `summary` and `passage`
- `resultKind`
- `deltas`
- `tags`
- `importance`
- `contentTier`
- `subEvents`
- `metadata`

Fallback rule: if no template matches, the existing result string must still render as the Scene Beat summary. The game must stay playable without any template mod or LLM.

## Template Registry

Use `App.registerSceneTemplate(template)` for deterministic template mods. Templates may match on:

- `mode`
- `action`
- `shape`
- `tags`
- `contentTier`, `minTier`, `maxTier`
- custom `match(ctx, app)`

Templates may render through:

- `summary`: string with placeholders or function
- `passage`: string with placeholders or function
- `render(app, ctx)`: returns `{ summary, passage }`

Supported string placeholders are:

- `{actors}`
- `{targets}`
- `{action}`
- `{summary}`
- `{passage}`

Higher `priority` wins. Built-in templates are fallback/default behavior; mod templates should use explicit ids and priorities.

### Template Examples

Plain deterministic prose:

```js
App.registerSceneTemplate({
  id: 'mod.safe-fight-summary',
  mode: 'combat',
  action: 'fight',
  maxTier: 0,
  priority: 80,
  summary: '{actors} presses the attack against {targets}.',
  passage: '{summary}'
});
```

Terse tactical prose:

```js
App.registerSceneTemplate({
  id: 'mod.row-failure-tactical',
  mode: 'combat',
  tags: ['cannot-reach'],
  priority: 90,
  render(app, ctx) {
    return {
      summary: `${ctx.actorNames.join(', ')} cannot reach ${ctx.targetNames.join(', ')} with ${YAW_STORY_EVENTS.intentLabel(app, ctx.action)}.`,
      passage: ctx.outcome.passage || ctx.outcome.summary
    };
  }
});
```

Systemic JSON-like output for an optional LLM or continuity mod should use the permission-gated public context API rather than raw `App` state:

```js
const context = MODS.getContext({ limit: 12 });
const payload = JSON.stringify({
  mode: context.mode,
  location: context.location.tile,
  recentBeats: context.sceneBeats
});
```

The module manifest must declare `ui.read`. Model output remains optional presentation data and must not mutate deterministic outcomes indirectly.

## Content-Tier Safety

Content-tier filtering happens before template text is rendered. Store neutral mechanical state in Scene Beats, then let template selection decide how to describe it for the active tier. Do not place higher-tier wording in a low-tier template or in raw mechanical state that must be shown at all tiers.

## Presentation Rules

- The in-context Scene Feed is a readable newest-first exchange stream, not a latest-only notification.
- New exchange groups render above older groups. Beats within an exchange remain chronological so dialogue and causal action sequences read in order.
- Combat beats group by encounter and round by default. Mods may provide an explicit `metadata.exchangeId` and optional `metadata.exchangeLabel` for another deterministic grouping boundary.
- The stream grows through the layout's existing primary scroll container. It must not create a nested feed scrollbar or cover composer and action controls.
- When a player is reading older beats, rendering preserves the visible beat and exposes a Jump to newest control instead of moving the reader.
- The latest beat may highlight briefly, but it must not disappear on a timer.
- Desktop and mobile use the same ordering, grouping, and retention contract; responsive styling may only change density.
- The expanded Scene Sheet opens intentionally and presents the same exchange order with summary first, optional passage, actor/target/intent, time/location, result metadata, tags, deltas, and sub-events.
- The core retains up to 60 recent Scene Beats in saves and presentation. Longer durable technical history belongs to the Activity Log.

## Activity Log Separation

Scene Feed is not a filtered view of the Activity Log. Both surfaces may receive related information, but they are separate outputs:

- Scene Feed: readable point-of-view feedback, current beat, recent beat sheet, future narrative/media mods.
- Activity Log: durable technical/history output, search, filters, export, debug/continuity context.

Tile observations may emit Scene Beats without Activity Log entries. Combat failures should emit Scene Beats and may also log technical history.
