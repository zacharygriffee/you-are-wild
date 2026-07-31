# UI, Scene, Narration, and AI Contracts

These APIs expose bounded presentation and copied context. They do not grant
authority over deterministic game outcomes.

## Bounded Public Context

Permission: `ui.read`

```js
const context = MODS.getContext({ limit: 12 });
```

`limit` is normalized to 1–50, default 20. The result is fresh serializable
data:

```text
{
  version,
  mode,
  content: {
    posture, maxTier, language,
    enabledCategories,
    gameplayVariants
  },
  location: { x, y, tile },
  party: UnitSummary[],
  nearbyUnits: UnitSummary[],
  quests: QuestSummary[],
  sceneBeats: SceneBeatSummary[],
  activity: ActivitySummary[]
}
```

`UnitSummary` contains `id`, `name`, `species`, `disposition`, `role`, `level`,
`punishment: {current,max}`, `spirit: {current,max}`, `hunger`, `size`,
`combatRow`, selected capability tokens, and status keys.

`QuestSummary` contains `id`, `title`, `status`, `type`, `progress`, `required`,
`giverId`, `completed`, and copied `objective`.

`SceneBeatSummary` contains `id`, `exchangeId`, `mode`, `action`, `subAction`,
`shape`, `resultKind`, `summary`, `passage`, bounded actor/target summaries,
`deltas`, `tags`, `importance`, `source`, `contentTier`, and `subEvents`.

`ActivitySummary` contains `text`, `type`, `round`, `turn`, `actorId`, and
`timestamp`.

Absent fields and empty arrays are normal. Do not treat prose as state, infer
private game objects, retain references expecting them to update, or write to
the copy.

## UI Contribution V1

Permission: `ui:contribute`

```js
MODS.registerUiContribution(slot, contributionId, definition);
```

Stable slots:

| Slot | Kind |
| --- | --- |
| `composer.place.after` | command after core place commands |
| `roster.party.badges` | party/allies badge |
| `roster.here.badges` | local/enemy badge |
| `roster.details.sections` | roster detail rows |
| `system.utilities` | application-menu command |

There are no arbitrary HTML, DOM, dock, traversal-grid, Scene Feed,
combat-confirmation, or turn-advance slots.

Common fields:

| Field | Contract |
| --- | --- |
| `label` | Required, at most 48 characters. |
| `description` | At most 160 characters. |
| `icon` | Text, at most 8 characters. |
| `tone` | `neutral`, `info`, `success`, `warning`, or `danger`. |
| `priority` | Integer -10 through 10. |
| `labelKey`, `descriptionKey` | Optional; must start with `<module-id>.`. |
| `when(context)` | Optional visibility predicate. |

A module may register at most 4 contributions per slot; a slot holds at most
24 total. Callbacks receive fresh deeply frozen serializable context. They must
be quick and must not mutate runtime or DOM.

Badge `read(context)` may return a string, number, or
`{label, labelKey, tone}`. Dynamic labels are at most 64 characters.

Roster detail sections require static `rows` or a `read` callback returning
rows or `{rows}`. There are at most 6 rows; each row has fallback `label` at
most 48 and `value` at most 160, with optional owner-namespaced `labelKey` and
`valueKey`.

Command slots require `onInvoke(context)`. The callback may return:

- nothing, `null`, `false`, or an empty string;
- a text string;
- `{title, description, rows}` plus optional `titleKey` and
  `descriptionKey`.

Dialog title is at most 80 characters, description at most 600, and rows use
the six-row bound. Core owns escaping, modal layout, focus, Close behavior,
ordering, and responsive placement.

```js
MODS.registerUiContribution('system.utilities', 'about', {
  label: 'Moss Hare guide',
  description: 'Review this mod.',
  icon: '🌿',
  tone: 'info',
  onInvoke(context) {
    return {
      title: 'Moss Hare guide',
      description: `Current mode: ${context.mode}`,
      rows: [{ label: 'Provider', value: MODS.id }]
    };
  }
});
```

## Scene Feed Templates

Permission: `scene:add_template`

```js
MODS.registerSceneTemplate({
  id: 'friendly_greeting',
  action: 'shareGreeting',
  maxTier: 0,
  priority: 80,
  summary: '{actors} shares a friendly greeting with {targets}.',
  passage: '{summary}'
});
```

The local `id` is required in the public API, at most 96 characters, and
contains letters, numbers, `_`, `.`, `:`, or `-`. Core prefixes the module ID.

Selectors are:

- `mode`;
- `action`, matching exact action or normalized base action;
- `shape`;
- `tags`, all of which must be present;
- exact numeric `contentTier`;
- numeric `minTier` and `maxTier`;
- optional `match(ctx, runtime)`.

Higher numeric `priority` wins. A source-independent template must use
declarative selectors or `match(ctx)` only; the second argument is an internal
runtime object and is not a stable API.

Renderers are:

- `summary`: string or `function(ctx)`;
- `passage`: string or `function(ctx)`;
- `render(runtime, ctx)` returning `{summary, passage}`.

For source-independent code, prefer strings or `summary(ctx)` /
`passage(ctx)`. Do not use the `runtime` argument.

String placeholders are `{actors}`, `{targets}`, `{action}`, `{summary}`, and
`{passage}`.

Useful context fields include `mode`, `action`, `actionBase`, `subAction`,
`shape`, `actors`, `targets`, `actorNames`, `targetNames`, `defaultSummary`,
`resultKind`, `contentTier`, `tags`, `outcome`, and `plan`. Treat the context
as read-only. A template changes presentation only; it must not claim a state
change absent from `outcome`, `deltas`, or the deterministic summary.

Content tiers are numeric 0 safe, 1 mature, and legacy 2 explicit. Prefer
`maxTier: 0` for safe wording and keep higher-tier wording out of raw mechanical
facts.

## Narration Context

Permission: `scene:read_narrative`

```js
const context = MODS.getNarrationContext({
  exchangeId: envelope.exchangeId,
  recentBeatLimit: 6,
  activityLimit: 6
});
```

Exactly one of an existing `beatId` or `exchangeId` must resolve. Recent beat
limit is 1–12; activity limit is 0–12. The copied result includes:

```text
{
  version,
  target: { beatId, exchangeId },
  policy,
  mode,
  location,
  viewpoint,
  beats,
  recentBeats,
  characters,
  quests,
  activity,
  extensions
}
```

Narrative character summaries add pronouns, voice, bounded traits/goals,
relationship summary, current disposition, and authoritative adult
eligibility to the normal unit summary. The player viewpoint records actor,
target, self, observer, mixed, or unknown participation. Do not infer private
thoughts, consent, eligibility, facts, or dialogue missing from the context.

Context extensions use:

```js
MODS.registerNarrationContextExtension({
  id: 'weather_note',
  category: 'example.category',
  build(context) {
    return { note: 'A module-owned, serializable observation.' };
  }
});
```

`id` and optional `category` are tokens at most 160 characters. `build` must
return serializable data. A category-gated extension is omitted unless enabled.
It cannot mutate the copied base context or game state.

## Narration Orchestration

Permission: `scene:narrate`

Register interest:

```js
MODS.registerNarrationOrchestrator({
  id: 'offline_narrator',
  priority: 10,
  minPosture: 'sfw',
  requiredCategories: [],
  isActive(policy) {
    return true;
  },
  claimsExchange(envelope) {
    return envelope.beats.length > 0;
  }
});
```

`id` and category values are tokens at most 160 characters. `minPosture` is
`sfw` or `mature`; other values normalize to `sfw`. Priority is any finite
number or zero. `isActive(policy)` answers whether the module is generally
ready. `claimsExchange(envelope)` answers whether it wants one frozen closed
exchange. Both may be async. Omitted predicates mean no extra gate; non-function
values reject registration.

Core selects exactly one claiming owner by priority and stable tie-breaks.
Every orchestrator must still call:

```js
if (!(await MODS.ownsNarrationExchange(envelope))) return;
```

If the manifest declares an `enabled` boolean setting, ownership also requires
that setting to be true. If it declares a `provider_connection` setting,
ownership requires a selected live compatible connection.

Handle `onSceneBeat` only to collect bounded facts. Publish once from
`onSceneExchangeClosed` after ownership succeeds. Clear private queues on
`onGameStart`, `onGameLoad`, and `onContentPolicyChanged`. Provider calls are
cancelled automatically on unload; explicit cancellation is also available.

## Narration Records

Publish deterministic or pending prose:

```js
const record = MODS.publishNarration({
  id: `offline:${envelope.exchangeId}`,
  scope: 'exchange',
  targetId: envelope.exchangeId,
  status: 'ready',
  text: 'A concise presentation grounded in the source events.',
  outputRating: 'safe',
  contentCategories: [],
  providerId: 'offline-template',
  profileId: 'brief',
  profileVersion: '1'
});
```

IDs, target IDs, and categories are token strings at most 160 characters. The
target beat/exchange must exist. `scope` is `beat` or `exchange`. Status is
`pending`, `ready`, `failed`, or `cancelled`; ready requires non-empty plain
text. Text is at most 500 characters. Output rating is `safe`, `mature`, or
`explicit`; explicit output automatically requires `explicit.sexual`.

Optional attribution/error fields are bounded `providerId`, `modelId`,
`profileId`, `profileVersion`, `errorCode`, `errorStatus`, and sanitized
`errorDiagnostic`.

Updates:

```js
MODS.updateNarration(record.id, {
  status: 'ready',
  text: generated.text,
  providerId: generated.providerId,
  modelId: generated.modelId
});
```

Allowed status transitions are:

- pending → pending, ready, failed, or cancelled;
- failed → failed or pending;
- ready → ready;
- cancelled → cancelled.

`removeNarration(id)` removes one owned record and `clearNarrations()` removes
all owned records. Pending records do not persist. Ready, failed, and cancelled
records may persist. Deterministic Scene Beats remain visible when narration is
pending, failed, cancelled, hidden by policy, or absent.

Tile narration cache helpers exist for ready narration attached to current
tile-entry targets:

```js
const hit = MODS.getCachedTileNarration({
  scope: 'exchange',
  targetId: envelope.exchangeId,
  variant: 'brief-v1'
});

MODS.cacheTileNarration(record.id, { variant: 'brief-v1' });
```

Variants are required tokens. Core owns fingerprints and retains at most 32
tile-presentation cache entries. Never use this cache for mechanics.

## Requesting AI

Permission: `ai:request`

```js
const connections = MODS.ai.listConnections('text.generate');

const result = await MODS.ai.generate({
  capability: 'narration',
  providerConnectionId,
  profileId: 'brief',
  instructions: 'Write concise plain text grounded in supplied facts.',
  maxCharacters: 500,
  input: {
    format: 'plain-text',
    context
  }
});
```

`narration` aliases `text.generate`. The connection ID is opaque and should
come from a `provider_connection` setting or `listConnections`. `input` must be
serializable. Instructions are text at most 2,000 characters and reject
credential-shaped values. `maxCharacters` is clamped to 80–500. Optional
`timeoutMs` is clamped to 1,000–30,000; omit it to use the provider profile.
Optional `signal` may cancel the request.

Text results contain bounded `text`, `providerId`, `modelId`, `protocol`,
`endpoint`, acceptance booleans, and serializable usage. Treat everything
except `text` as diagnostics/attribution. Provider errors are sanitized.
`MODS.ai.cancelPending()` cancels this module's live requests.

Model output is untrusted presentation. Escape it through core narration/UI
surfaces, never parse it as commands, and never use it to decide damage,
inventory, quests, movement, eligibility, consent, or saves.

Credentials never belong in module code, settings, input, instructions,
metadata, logs, URLs, saves, or narration.

## Providing AI

Permission: `ai:provide`

This is an infrastructure contract for trusted-local adapters, not a normal
gameplay mod.

```js
const providerId = MODS.registerAIProvider('local-text', {
  name: 'Local Text',
  description: 'Session-local text adapter.',
  capabilities: ['text.generate'],
  async invoke(request) {
    return {
      text: 'Provider result',
      modelId: 'local-model'
    };
  }
});

const connectionId = MODS.createAIProviderConnection(providerId, {
  name: 'Local session'
});
```

The adapter ID is a token at most 160 characters. It supplies `invoke` or
`generate`, plus optional name (120), description (300), and capability list.
The request contains `capability`, `profileId`, copied `instructions`, copied
`input`, `maxCharacters`, session credential, copied connection metadata, and
`signal`.

An adapter must honor cancellation, keep engine constraints ahead of mod
style instructions, return bounded plain text for `text.generate`, expose no
credential or raw remote body, and map failures to concise codes. Connection
metadata is serializable and rejects credential-like content. Module-created
connections are ephemeral and removed with their owner.

`MODS.removeAIProviderConnection(connectionId)` removes only a connection owned
by this module. Normal users create and authenticate persistent profiles in the
game's provider manager, not in executable mod code.
