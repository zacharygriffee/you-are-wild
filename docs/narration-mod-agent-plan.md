# Narration Mod And AI Provider Plan

## Implementation Status

Phases 1-5 are implemented for the provider-neutral first release: immutable
narrative hooks, explicit exchange boundaries, the owned narration store,
focused context, declarative settings, session-only provider connections, fake
provider coverage, exclusive orchestration ownership, and the optional
SFW/Mature orchestrator. The separately packaged explicit orchestrator is also
present with category, authoritative adult-eligibility, and provider-policy
acknowledgement gates. New/load lifecycle reset, credential-setting rejection,
and target-exchange context snapshots are covered by integration tests.

A dedicated capability-based AI Providers panel now owns provider profiles and
connection lifecycle. Puter owns its browser authentication. The built-in
OpenAI-Compatible adapter supports browser-direct Responses and Chat
Completions for Direct OpenAI, OpenRouter-style, generic compatible, and no-auth
local endpoints. API keys and additional header values remain session-only;
persisted profiles contain non-secret metadata and reload disconnected. MCP
remains deferred. The core game remains deterministic and fully functional with
all narration packages absent, disabled, offline, or disconnected.

## Agent Brief

Build the engine seams and first-party optional mods needed for asynchronous AI
narration without making remote inference part of core gameplay. Preserve the
existing deterministic path:

```text
InteractionPlan + ActionOutcome -> SceneBeat -> deterministic Scene Feed
```

AI narration is a presentation overlay produced after a `SceneBeat` exists. It
must never determine whether an action succeeds, mutate mechanical state, or
become the only record of an outcome.

The default game supports `sfw` and `mature` presentation. Explicit sexual
presentation remains an optional, separately distributed mod category. Build
one SFW/Mature narration orchestration and one explicit narration orchestration
on a shared provider-neutral runtime. The explicit orchestration must require
the existing `explicit.sexual` category and must not be bundled into the default
playable HTML.

## Current Repo Facts

- `app/src/core/story-events.js` owns the canonical `SceneBeat` model and Scene
  Feed insertion.
- `app/src/core/module-system.js` owns trusted-local module lifecycle, hooks,
  permissions, namespaced settings, owned contributions, and
  `MODS.getContext()`.
- `MODS.getContext()` already provides bounded, JSON-serializable content
  policy, location, public units, quests, recent Scene Beats, and Activity Log
  entries behind `ui.read`.
- The hook system exposes copied `onSceneBeat`, `onSceneExchangeClosed`, and
  `onContentPolicyChanged` envelopes after deterministic state commits.
- Modules declare typed settings, including capability-filtered
  `provider_connection` selectors that store opaque profile IDs.
- Optional explicit presentation already lives in
  `optional-mods/you-are-wild-explicit.yawmod.json` and is gated by the
  `explicit.sexual` category.
- The current `trusted-local` runtime is not a security sandbox. Ordinary mod
  settings and IndexedDB are not an acceptable secret vault.

## Required Architecture

### 1. Add a read-only narrative event lane

Add these supported module events:

- `onSceneBeat(envelope)`: dispatched once after the normalized deterministic
  beat is committed to `App.storyEvents`.
- `onSceneExchangeClosed(envelope)`: dispatched when an interaction exchange,
  combat round, transaction sequence, or other explicit exchange boundary is
  complete.
- `onContentPolicyChanged(snapshot)`: dispatched after normalized posture,
  category, or gameplay-variant changes have been applied.

Each payload must be a copied, JSON-serializable, read-only public envelope. Do
not pass live `App`, unit, plan, outcome, DOM, or save references. Give the
envelope a version and stable identity:

```js
{
  version: 1,
  eventId: "story-42",
  exchangeId: "combat-7-round-3",
  beat: { /* public SceneBeat summary */ },
  policy: {
    posture: "sfw",
    enabledCategories: [],
    gameplayVariants: {}
  }
}
```

`story-events.emit()` is synchronous today. Commit and render the deterministic
beat first, then schedule hook delivery without blocking input or Scene Feed
rendering. Hook failure, timeout, or unload must not affect the committed beat.
Do not fire these hooks while hydrating saved beats.

Prefer explicit exchange close calls from the owning flow over timer heuristics.
Use a short debounce only as a fallback for flows that do not yet expose a
boundary. Combat should close by encounter/round; a standalone exploration
action may close immediately; grouped actions retain their existing
`exchangeId`.

### 2. Add a presentation-only narration store

Do not overwrite `SceneBeat.summary`, `SceneBeat.passage`, `resultKind`, deltas,
tags, or metadata with model output. Add a separate owned store, for example
`App.sceneNarrations`, keyed by a deterministic narration id:

```text
orchestratorId + profileVersion + scope + targetId
```

where `targetId` is a beat id or exchange id.

A narration record should contain only presentation and audit metadata:

```js
{
  id,
  ownerModuleId,
  scope: "beat" | "exchange",
  beatIds: [],
  exchangeId,
  status: "pending" | "ready" | "failed" | "cancelled",
  text,
  outputRating: "safe" | "mature" | "explicit",
  contentCategories: [],
  providerId,
  modelId,
  profileId,
  profileVersion,
  createdAt,
  errorCode
}
```

Expose a permission-gated module API such as:

```js
MODS.publishNarration(record)
MODS.updateNarration(id, patch)
MODS.removeNarration(id)
```

Recommended permission: `scene:narrate`. Core validates ownership, target beat
existence, serializability, status transitions, content policy, and maximum text
length. A module may modify only its own narration records. Disable, reload, or
delete must cancel its in-flight requests and remove its live owned
contributions without damaging deterministic beats.

Render ready narration as an attributed secondary presentation in the Scene
Feed/Scene Sheet. Keep the deterministic summary visible as the mechanical
truth. Pending and failed records may have subtle status UI, but a failure must
fall back silently to deterministic prose during normal play.

Decide explicitly whether ready narration persists in saves. The recommended
first release is to persist completed local presentation records but never
pending requests. On load, reapply current content-policy filtering before any
text is rendered.

### 3. Add a focused narration context API

Retain `MODS.getContext()` for general read-only modules, and add a more focused
API for narration:

```js
MODS.getNarrationContext({
  beatId,
  exchangeId,
  recentBeatLimit,
  activityLimit
})
```

Recommended permission: `scene:read_narrative`. Return only:

- the target beat or exchange beats;
- a small bounded recent-beat window;
- posture, enabled categories, and enabled variants;
- safe location/time/mode summaries;
- public actors and targets;
- bounded relevant quest/relationship facts;
- deterministic consequences and deltas needed for continuity.

Add public narrative character fields rather than exposing raw unit objects:

```js
{
  pronouns,
  voice,
  traits: [],
  goals: [],
  relationshipSummary,
  currentDisposition
}
```

These fields must be bounded strings/tokens and JSON-serializable. Unknown facts
remain unknown; the narrator should not invent permanent canon. Provider or
content mods may contribute category-gated context extensions through an owned
registry, but higher-tier fields must not enter a lower-tier context snapshot.

Do not expose credentials, raw saves, inventory internals, anatomy compatibility
fields, containers, executable values, DOM text, or unrestricted Activity Log
history.

### 4. Introduce a core AI provider manager

Mods request a capability; they do not receive API keys:

```js
const result = await MODS.ai.generate({
  capability: "text.generate",
  providerConnectionId,
  profileId,
  input: narrationContext,
  maxCharacters: 500,
  signal
});
```

Recommended permission: `ai:request`. The provider manager owns connection
status, request transport, timeouts, rate limits, usage metadata, and sanitized
errors. It returns text and non-secret provider/model/usage metadata only.

Provider adapters are replaceable behind one contract. Current implementations:

1. Puter user-pays browser authentication.
2. Session-only browser-direct OpenAI-Compatible Responses and Chat
   Completions, including Direct OpenAI, OpenRouter-style, generic, and no-auth
   localhost profiles.

Future candidates include OpenRouter OAuth/PKCE, a server-side encrypted vault
or local sidecar, and remote MCP over Streamable HTTP.

Never store a raw provider key in a manifest, ordinary module setting, game save,
Activity Log, public context, error, URL, or exported package. If the first
implementation cannot provide a real credential boundary, ship a session-only
experimental provider connection and document the trusted-local risk instead
of presenting browser storage as secure.

MCP is an adapter, not the billing solution. A remote MCP server may expose a
`narrate_scene` tool and use OAuth, its own billing, or a vaulted user key. A
future local sidecar may expose the same tool over protected localhost
Streamable HTTP. A normal webpage cannot spawn a stdio MCP process. Localhost
support requires explicit pairing, origin allowlisting, anti-CSRF tokens, DNS
rebinding protection, and a revocation UI.

### 5. Complete declarative mod settings

Extend manifests with a normalized, typed `settings` declaration. Support at
least:

- `boolean`
- `select`
- bounded `number`
- bounded `string`
- `provider_connection` (stores only an opaque connection id)
- `action` for Connect, Test, Disconnect, or Delete Data

Do not implement a general `secret` value that persists raw credentials in the
module settings store.

Each declaration needs a stable key, label, description, default, validation,
and optional visibility/content-policy conditions. Settings remain namespaced
under the module id and are removed with the module. Only declared settings
should render in the revamped Mod Settings UI.

Narration settings should cover:

- enabled;
- provider connection;
- model selection supplied by the provider adapter;
- orchestration profile;
- beat versus exchange scope;
- recent-context depth, with a small hard maximum;
- output length, clamped to 400-500 characters for the initial mods;
- minimum importance to narrate;
- storyteller, character-response, or hybrid mode;
- automatic retry off by default;
- connection test, disconnect, and delete generated narration actions.

### 6. Orchestrate requests predictably

Implement a reusable first-party orchestration helper used by both narration
mods:

1. Receive `onSceneBeat` and collect beats by `exchangeId`.
2. Ignore hydration, duplicate ids, narration-owned events, and events below the
   configured importance threshold.
3. Flush on `onSceneExchangeClosed`; use one bounded debounce fallback where no
   explicit close exists.
4. Build one focused context snapshot at flush time.
5. Create a pending presentation record.
6. Call the provider with an `AbortSignal` and strict timeout.
7. Validate plain-text output, normalize whitespace, and enforce the character
   limit without cutting through a sentence when possible.
8. Publish ready output or a sanitized failure state.
9. Deduplicate using orchestrator id, profile version, scope, and target id.
10. Abort on module unload, policy disable, provider disconnect, save switch,
    or superseding request.

Do not make a request for UI rerenders, opening the Scene Sheet, reloading saved
history, or Activity Log insertion. Do not automatically fall back to a
different paid provider or model without player approval.

Treat all names and mod-authored strings in context as untrusted data. Keep them
in structured input and request plain narration only—no tools, HTML, Markdown,
state patches, or executable instructions. Model output must be escaped by the
existing UI rendering path.

## First-Party Mod Packaging

### SFW/Mature narration mod

Suggested id: `yaw_narration_first_party`.

- `contentRating: "safe"`
- no explicit content category
- permissions: `scene:read_narrative`, `scene:narrate`, `ai:request`, and the
  eventual settings declaration permission if one is required
- switches between an SFW and mature prompt profile based on the normalized core
  posture
- may narrate stronger violence/horror under `mature`, but never requests or
  renders `explicit.sexual` context
- default orchestration scope: exchange
- default response target: at most 500 characters

The mod should support two profile modes:

- `storyteller`: concise third-person or second-person scene prose;
- `characters`: short reactions for materially involved non-player characters,
  grounded in public character profiles and deterministic outcomes.

`hybrid` may combine them only if the result still fits the configured length.

### Explicit narration orchestration mod

Suggested id: `yaw_narration_explicit_first_party`.

- separately distributed in `optional-mods/` and excluded from default `dist`
- `contentRating: "mature"`
- required category: `explicit.sexual`
- depends on `yaw_narration_first_party`
- also depends on `yaw_explicit_first_party` if it consumes that provider's
  explicit context extensions or action vocabulary
- contributes an explicit prompt/orchestration profile, not a second provider
  manager
- labels every generated record `outputRating: "explicit"` and
  `contentCategories: ["explicit.sexual"]`

Before enabling automatic explicit generation, require the player to confirm
that their chosen provider/account permits the selected narration category.
Store the acknowledgement with provider id and profile version, not a blanket
claim that the provider supports it. A neutral connection test must not send
explicit test material. An explicit capability test may run only from a clear
player action.

Explicit generation must remain limited to lawful adult content. All involved
characters must be unambiguously marked eligible adults by trusted game/content
metadata; unknown or ineligible age must block explicit generation and retain
the deterministic fallback. Do not attempt to transform, obscure, or retry
content rejected by a provider. Surface a concise compatibility error and let
the player choose another provider or return to deterministic narration.

When the category is disabled or posture lowered, unload the mod, abort pending
requests, and prevent stored explicit narration from rendering. Provide a
separate Delete Explicit Narration Data action. Do not silently relabel explicit
output as mature or safe.

## Suggested Work Order

### Phase 1: Contracts and tests

- Update `docs/modding.md` and `docs/scene-feed-dsl.md` with the new event,
  presentation, settings, and provider contracts.
- Add failing unit tests for event delivery, cloned payloads, dedupe, ownership,
  unload cleanup, content gating, and secret exclusion.
- Freeze schema/version names before implementing the optional mods.

### Phase 2: Core engine seams

- Add narrative hook events and public envelope normalization.
- Add exchange-close calls at authoritative flow boundaries.
- Add narration store, owned lifecycle, save behavior, and Scene Feed/Sheet
  presentation.
- Add focused narration context and category-gated extension registry.
- Keep all new code functional with no provider configured.

### Phase 3: Settings and provider manager

- Add declarative manifest settings and Mod Settings rendering.
- Add provider connection records containing opaque ids only.
- Implement a fake provider adapter for deterministic tests.
- Implement one real user-authorized provider only after the credential-storage
  boundary is settled.

### Phase 4: SFW/Mature narration mod

- Package the first-party mod outside core mechanics.
- Implement exchange orchestration, profile selection, request lifecycle, and
  presentation publishing.
- Verify offline, timeout, rate-limit, reload, and disabled-module behavior.

### Phase 5: Explicit orchestration mod

- Package separately under `optional-mods/`.
- Add dependencies, category gating, adult eligibility checks, provider-policy
  acknowledgement, output labels, downgrade hiding, and deletion controls.
- Add a release audit proving explicit prompt/profile text is absent from the
  default generated HTML.

### Phase 6: Optional MCP adapter

- Implement remote Streamable HTTP MCP as another provider adapter.
- Keep the tool contract minimal: `narrate_scene` with structured context and a
  bounded plain-text result.
- Defer localhost sidecar support until pairing and browser security have an
  explicit design and threat-model test.

## Acceptance Criteria

- The game remains fully playable and readable with every narration mod
  disabled, offline, timed out, or rejected by a provider.
- Exactly one deterministic Scene Beat is committed per existing gameplay
  resolution; narration never changes mechanical state.
- Each eligible beat/exchange produces at most one request per orchestrator and
  profile version.
- No request is caused by rendering, loading saved history, or opening UI.
- Disabling/uninstalling a mod aborts requests and removes its live owned
  presentation contributions.
- Posture/category downgrade prevents disallowed stored narration from
  rendering immediately.
- Raw credentials never appear in module settings, saves, logs, context,
  packages, URLs, errors, or tests.
- SFW/Mature context contains no explicit provider extensions.
- Explicit narration is separately packaged, category-gated, adult-only, and
  absent from the default build.
- Output is escaped, plain text, provider-attributed, and no longer than the
  configured 400-500-character ceiling.
- Unit tests use a fake provider and make no network calls.
- Build and existing gameplay/viewport suites pass without requiring a provider
  account.

## Non-Goals For The First Release

- Letting model output choose actions, rolls, rewards, relationship state, or
  save mutations.
- Giving each mod direct access to API keys.
- Treating `trusted-local` as a security sandbox.
- A remote community mod marketplace.
- A long-running Node process inside Sites.
- Local stdio MCP from the browser.
- Persistent AI character memory outside deterministic game state.
- Automatic provider/model switching after policy rejection.
