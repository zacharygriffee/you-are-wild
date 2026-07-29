# AI Providers

AI providers are built-in or trusted-local transport adapters. They are separate
from mods: mods request a capability through an opaque connection ID, while a
provider owns authentication, request mapping, transport, and sanitized errors.

The dedicated **AI Providers** panel is the only core surface for connecting,
testing, disconnecting, or removing provider profiles. The Mod Manager only
selects compatible profiles for a mod setting and links to provider management.

## Capability Contract

Adapters register one or more capability tokens. The first implemented
capability is `text.generate`; the registry can later support capabilities such
as `image.generate`, `video.generate`, `audio.speech`, and `audio.transcribe`
without adding empty controls before a real adapter exists.

Provider profiles have stable IDs and contain only non-secret metadata:

- provider, display name, and capabilities;
- endpoint, model, protocol, timeout, completion-token ceiling, and optional organization/project IDs;
- additional header names, never their values;
- last successful protocol and exact request URL for connection diagnostics.

A connection is the active session state for a profile. Disconnecting clears
its in-memory credential and cancels its requests but retains safe profile
metadata. Reloading restores persisted profiles as disconnected.
Editing ordinary profile metadata keeps the current session credential intact.
Replacing credentials is an explicit mode that requires all secret header
values to be entered again, preventing stale or partially removed headers.
The exception is an HTTPS-to-plaintext loopback edit: the active credential is
replaced with an empty no-auth credential before the edited connection can be
used.

## Credential Boundary

Credentials and additional header values live only in a private in-memory
vault. They must never enter module settings, provider profile metadata,
`localStorage`, IndexedDB, game saves, Activity Log entries, Scene Beats, public
context, exports, URLs, or surfaced error text. Provider manager snapshots expose
only a `credentialPresent` boolean.

This is a session-isolation boundary, not a sandbox. Installed trusted-local mod
code still runs in the page context and must be treated as trusted. Do not claim
that a browser-only provider connection protects a key from deliberately
malicious same-page code.

## Built-In Text Providers

### Puter

Puter owns its browser sign-in and user-pays session. The game stores no Puter
API key. Its optional model ID is non-secret profile metadata.

In the Pear/Electron host, API-key entry moves to a dedicated trusted window.
The normal game renderer requests credential configuration using only an
opaque profile ID. It never renders, receives, or forwards the key. The trusted
window loads no game or module code and submits the credential directly to
Electron main for session custody or `safeStorage` encryption.

### OpenAI-Compatible API

The OpenAI-Compatible adapter supports browser-direct Responses and Chat
Completions requests. It can connect to Direct OpenAI, OpenRouter-compatible,
other compatible HTTPS endpoints, and intentional no-auth localhost endpoints.

The configured value is a base URL. Remote endpoints must use HTTPS; plaintext
HTTP is accepted only for loopback hosts and is strictly no-auth. Plaintext
loopback requests cannot carry API keys, Authorization, or additional session
header values. Authenticated local sidecars must expose HTTPS. The adapter
checks this rule while saving or replacing credentials and again immediately
before `fetch`, so stale session credentials cannot cross a plaintext boundary.

The adapter appends exactly
`/responses` or `/chat/completions`, keeps the derived URL on the approved
origin, rejects URL credentials/query/fragment data, blocks redirects,
suppresses referrers, and prevents additional headers from overriding
authorization or transport headers. The remote endpoint must allow the browser
origin through CORS.

When the game runs from a `file://` origin, the provider panel switches to
local-only mode. It exposes only unauthenticated loopback OpenAI-compatible
profiles and defaults new connections to Ollama at
`http://localhost:11434/v1`. Remote endpoints, credentials, additional secret
headers, and Puter sign-in remain unavailable in this mode. Ollama includes
`file://*` among its default allowed origins; custom local runners must provide
equivalent CORS support. Serving the game through HTTPS or `http://localhost`
restores the full provider panel.

Character limits are enforced locally after generation. Each profile also has
a configurable completion-token ceiling that is sent as `max_output_tokens` for
Responses requests or preferably `max_completion_tokens` for Chat Completions.
Chat can retry once with `max_tokens` only when the provider clearly identifies
the preferred parameter as unsupported. The ceiling applies independently of
the visible character limit because many providers count hidden reasoning
inside the completion allowance. Reasoning-heavy models therefore need more
headroom before they can emit visible narration. New profiles default to 8,192
tokens; high-reasoning models may need 16,384 or more. The accepted configurable
range is 64–32,768 tokens, and the selected provider can still enforce a lower
model-specific maximum. Existing profiles retain their explicitly stored
ceiling when the game is upgraded.

New profiles default to a 30-second request timeout. The timeout remains
editable because local models and reasoning-heavy remote models can have very
different latency, but the higher default avoids aborting a healthy response
while it is still completing hidden reasoning.

`auto` protocol mode tries Responses first, or the last successful protocol.
It falls back once only when the endpoint reports an unsupported route or
request shape. Authentication, quota, rate-limit, policy, model, and general
request failures never trigger automatic protocol or provider switching.

Connection tests send a bounded player-POV narration request with structured
beats, characters, recent context, and activity. This catches reasoning models
that can answer a one-word health check but exhaust their completion budget on
real narration. Tests report whether the endpoint, authentication, model, and
selected protocol were accepted without returning response bodies or
credentials in errors, and use the same profile-configured completion ceiling
as gameplay requests.

## Adapter Rules

Provider adapters must:

- declare stable provider and capability IDs;
- accept structured copied input, bounded provider-neutral mod instructions, and an `AbortSignal`;
- keep immutable engine constraints ahead of mod instructions and keep scene-authored data in the structured input layer;
- honor the manager's timeout and disconnect cancellation;
- return bounded plain text or capability-specific serializable data;
- return only non-secret provider, model, protocol, endpoint, and usage metadata;
- map remote failures to concise error codes without exposing response bodies;
- avoid automatic provider/model switching after policy or authentication errors.

MCP, OAuth relays, server-side vaults, and localhost sidecars are future adapter
options. MCP remains deferred until the browser provider lifecycle is proven.

## Reasoning Effort

OpenAI-compatible profiles can omit reasoning configuration (`Provider
managed`) or request `none`, `minimal`, `low`, `medium`, or `high`. Responses
requests map the value into the `reasoning` request body; Chat Completions maps
it into `reasoning_effort`. It is not a session header. Endpoints may reject
unsupported values, in which case the Activity Log reports a sanitized
`unsupported_reasoning_effort` diagnostic. Higher levels may require a much
larger completion-token ceiling because hidden reasoning shares that budget.

## File-Origin Advanced Override

`file://` remains unauthenticated-loopback-only by default. A player may
explicitly enable remote endpoint attempts for the current page session. The
override and credentials are never persisted, HTTPS remains required for
authenticated endpoints, redirects remain blocked, and normal browser TLS and
CORS enforcement decides whether the request can succeed. This is not a global
origin-gate bypass.
