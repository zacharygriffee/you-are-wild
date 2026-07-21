# Narration Mods

This is a focused current contract subordinate to `docs/modding.md`. Historical
narration implementation plans do not grant additional module capabilities.

Narration mods are optional presentation packages. They consume deterministic
Scene Beats and publish bounded prose records; they cannot alter combat,
inventory, statuses, quests, movement, saves, or any other mechanical state.
The Activity Log remains the durable technical record.

## Instruction Hierarchy

`MODS.ai.generate()` separates three layers:

1. The provider adapter supplies immutable engine constraints: preserve every
   deterministic fact, return plain text, obey the character limit, and never
   add mechanics, choices, Markdown, or HTML.
2. The narration mod supplies bounded `instructions` for voice, perspective,
   dialogue balance, and pacing.
3. Names, dialogue, Scene Beats, and other scene-authored values remain in the
   structured `input` payload. They are data, not system instructions.

The provider manager accepts at most 2,000 instruction characters and rejects
credential-shaped instruction values before invoking an adapter. Content
posture and category checks still apply when the resulting narration record is
published and rendered. A standard narrator prompt cannot enable an explicit
category or bypass adult-eligibility checks.

Simple Narrator currently defaults to player POV. Narration context identifies
the bounded public player summary and derives the player's participation for
each target beat as `actor`, `target`, `self`, `observer`, or `unknown`.
Multi-beat exchanges with changing roles use `mixed` and retain a `beatRoles`
entry for every beat. Actor and target roles address the player in second
person, self-interactions use reflexive language, and observer beats keep the
actual actors in third person without inserting the player into the action.
When player identity is unavailable, the narrator falls back to factual third
person rather than guessing.

## Simple Narrator Profiles

Simple Narrator 0.6 gives each profile an explicit contract layered beneath
the player-viewpoint and deterministic-fact rules:

- **Storyteller** leads with place, action, and consequence. Characters remain
  secondary unless their observable behavior changes the exchange.
- **Character reactions** leads with participating characters' observable
  actions, reactions, and dialogue already supplied by scene context. It may
  use stated disposition, status, relationship cues, and visible deltas, but
  never invents private thoughts, motives, memories, feelings, or quotations.
  Player self-interaction remains one character. Spectator beats focus on the
  actual actors as the player witnesses them. Character-free exchanges fall
  back to concise scene narration.
- **Hybrid** gives one brief scene or action frame and then the most relevant
  supported character reaction or supplied dialogue. Character-free
  exploration uses Storyteller framing.

Editable Narration instructions are applied as style guidance after the
selected profile. They can tune voice and pacing, but cannot override the
viewpoint, profile, fact, content-policy, plain-text, or length contracts.

The player remains separate from `context.characters` when merely observing,
so spectator narration does not change participant lists or eligibility
checks. The relevant shape is:

```js
context.viewpoint = {
  mode: 'player',
  player: { id: 'player-1', name: 'Zx' },
  participation: 'observer',
  beatRoles: [{ beatId: 'story-4', participation: 'observer' }]
};
```

```js
const instructions = await MODS.getSetting(
  'systemPrompt',
  'Write concise second-person narration grounded in the supplied events.'
);

const result = await MODS.ai.generate({
  capability: 'narration',
  providerConnectionId,
  profileId: 'storyteller',
  instructions,
  maxCharacters: 500,
  input: {
    format: 'plain-text',
    viewpointMode: 'player',
    posture: envelope.policy.posture,
    context: MODS.getNarrationContext({
      exchangeId: envelope.exchangeId,
      recentBeatLimit: 6,
      activityLimit: 6
    })
  }
});
```

Omitting `timeoutMs` is intentional for the reference narrator: the selected
provider profile owns the request timeout.

## Center Tile Narration And Cache

Simple Narrator 0.6 promotes ready `tile-entry` narration into the center
tile's description. The authored deterministic description remains visible
while narration is pending or failed. Core only promotes narration whose
target still matches the live world, coordinates, and narrative-state
fingerprint, so a response that finishes after the player moves cannot repaint
the new tile.

Tile narration is cached as presentation data for the 32 most recently used
states. The fingerprint covers the authored place description, landmark or
structure, visible creatures and remains, loose items, arrival versus return,
day/night, language, and content posture. It is independent of array ordering.
The narrator's profile, instructions, character ceiling, and profile version
form a separate variant key. Re-entering an unchanged tile with the same
variant attaches cached prose to the new exchange without an API request.

When visible state changes, the center immediately falls back to deterministic
text and core commits one fresh tile-observation beat. Picking up or dropping
an item therefore causes a new narration request; the old prose remains cached
only for its old fingerprint. Cache entries are bounded, policy-filtered,
persisted with the Scene Feed, and cleared when a different run starts.

## Declarative Prompt Setting

Use a multiline bounded string for editable mod instructions:

```json
{
  "key": "systemPrompt",
  "type": "string",
  "multiline": true,
  "rows": 6,
  "maxLength": 500,
  "label": "Narration instructions",
  "default": "Write concise narration grounded in deterministic events."
}
```

The Mod Manager renders this as a labelled textarea. Values are namespaced to
the module, normalized to LF line endings, and credential-screened. Provider
credentials belong only in AI Providers and never in mod settings.

Simple Narrator reserves instruction space for its viewpoint and selected
profile contracts, then appends at most 500 characters of editable style
guidance. Fixed contracts are never truncated to make room for custom prose.

## Exchange Lifecycle

Reference orchestrators collect `onSceneBeat` envelopes and make at most one
publication or provider request when `onSceneExchangeClosed` fires. Before
publishing, each package calls `await MODS.ownsNarrationExchange(envelope)`.
Priority and active policy select exactly one owner.

Pending, unavailable, failed, cancelled, or disabled narration leaves the
deterministic Scene Beat summaries directly visible. Ready narration becomes
the primary exchange passage, and the source beats remain accessible in an
**Events (n)** disclosure. Ready, failed, and cancelled records may persist;
pending records do not. New game, load, policy change, and module unload clear
private queues and cancel provider requests.

When a narration record transitions to `failed`, the engine also writes a
sanitized Error entry to the Activity Log with the bounded provider error code
and a prompt to test the selected connection. Raw provider responses,
credentials, endpoints, and request context are never included.

The Activity Log also exposes a sanitized Narration lifecycle for each
exchange: queued, request sent, response received, and attached. These
diagnostic entries are excluded from later narration context so operational
telemetry cannot feed back into the story prompt. Publication failures that
occur before a pending record exists are reported as Errors.

## Reference Packages

- `you-are-wild-narration.yawmod.json`: provider-backed Simple Narrator. It
  demonstrates booleans, select and numeric settings, a provider selector, a
  multiline system-prompt setting, asynchronous generation, tile-state cache
  reuse, center-tile presentation, and attribution.
- `you-are-wild-template-narration.yawmod.json`: deterministic offline narrator.
  It has no `ai:request` permission and demonstrates fallback ownership and
  publication independently of a network or paid provider.
- `you-are-wild-narration-diagnostics.yawmod.json`: disabled-by-default
  developer fixture. It reports bounded exchange mode, beat count, character
  count, and ownership decisions without exposing credentials or raw state.
- `you-are-wild-explicit-narration.yawmod.json`: separately distributed and
  category-gated narrator. It owns its own instructions and additionally
  requires provider-policy acknowledgement and authoritative adult eligibility.

The optional packages are not included in `dist/you-are-wild.html`; install
them through the local Mod Manager when testing the narration API.
