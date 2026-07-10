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
- `summary`: short latest-beat text for compact Scene Feed surfaces.
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

## Content-Tier Safety

Content-tier filtering happens before template text is rendered. Store neutral mechanical state in Scene Beats, then let template selection decide how to describe it for the active tier. Do not place higher-tier wording in a low-tier template or in raw mechanical state that must be shown at all tiers.

## Presentation Rules

- Latest Scene Beat remains visible until replaced.
- Latest beat may highlight briefly, but it must not disappear on a timer.
- Expanded Scene Sheet opens intentionally.
- Compact latest beat must not cover composer or action controls.
- Desktop should prefer the in-context Scene Feed slot.
- Mobile may use a compact latest-beat handle or sheet, but notification/toast behavior is still a deferred design decision.

## Activity Log Separation

Scene Feed is not a filtered view of the Activity Log. Both surfaces may receive related information, but they are separate outputs:

- Scene Feed: readable point-of-view feedback, current beat, recent beat sheet, future narrative/media mods.
- Activity Log: durable technical/history output, search, filters, export, debug/continuity context.

Tile observations may emit Scene Beats without Activity Log entries. Combat failures should emit Scene Beats and may also log technical history.
