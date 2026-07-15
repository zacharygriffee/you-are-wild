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
- endpoint, model, protocol, timeout, and optional organization/project IDs;
- additional header names, never their values;
- last successful protocol and exact request URL for connection diagnostics.

A connection is the active session state for a profile. Disconnecting clears
its in-memory credential and cancels its requests but retains safe profile
metadata. Reloading restores persisted profiles as disconnected.
Editing ordinary profile metadata keeps the current session credential intact.
Replacing credentials is an explicit mode that requires all secret header
values to be entered again, preventing stale or partially removed headers.

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

### OpenAI-Compatible API

The OpenAI-Compatible adapter supports browser-direct Responses and Chat
Completions requests. It can connect to Direct OpenAI, OpenRouter-compatible,
other compatible HTTPS endpoints, and intentional no-auth localhost endpoints.

The configured value is a base URL. Remote endpoints must use HTTPS; plaintext
HTTP is accepted only for loopback hosts. The adapter appends exactly
`/responses` or `/chat/completions`, keeps the derived URL on the approved
origin, rejects URL credentials/query/fragment data, blocks redirects,
suppresses referrers, and prevents additional headers from overriding
authorization or transport headers. The remote endpoint must allow the browser
origin through CORS.

`auto` protocol mode tries Responses first, or the last successful protocol.
It falls back once only when the endpoint reports an unsupported route or
request shape. Authentication, quota, rate-limit, policy, model, and general
request failures never trigger automatic protocol or provider switching.

Connection tests send a neutral bounded text request. They report whether the
endpoint, authentication, model, and selected protocol were accepted without
returning response bodies or credentials in errors.

## Adapter Rules

Provider adapters must:

- declare stable provider and capability IDs;
- accept structured copied input and an `AbortSignal`;
- honor the manager's timeout and disconnect cancellation;
- return bounded plain text or capability-specific serializable data;
- return only non-secret provider, model, protocol, endpoint, and usage metadata;
- map remote failures to concise error codes without exposing response bodies;
- avoid automatic provider/model switching after policy or authentication errors.

MCP, OAuth relays, server-side vaults, and localhost sidecars are future adapter
options. MCP remains deferred until the browser provider lifecycle is proven.
