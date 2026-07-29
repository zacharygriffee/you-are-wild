# Server-Backed AI and Content Access

You Are Wild remains a host-neutral game that works from a hosted browser page,
the generated single-file HTML, and a local `file://` URL. A separate service
may add accounts, subscriptions, and managed AI, but the game must never require
that service for deterministic play, saves, locally installed modules, template
narration, Puter, or browser-session BYOK providers.

This document fixes the boundary for the first server-backed premium AI
milestone. It does not select a payment processor or grant executable modules a
new permission.

## Repository ownership

```text
you-are-wild
    deterministic game and saves
    content access UI and local acknowledgement
    provider-neutral AI and module contracts
    browser, hosted, and standalone builds

you-are-wild-service
    accounts and secure sessions
    account content-access assertions
    subscription entitlements
    usage ledger and hard allowances
    server-owned provider credentials
    bounded managed narration broker
    payment-provider adapters and webhooks

you-are-wild-site
    SFW public presentation
    account, checkout, and support entry points

you-are-wild-pear
    optional Linux desktop host
    not required by the service or payment architecture
```

## Content access

Content access and payment are separate decisions. Paying never opts a player
into Mature or explicit content, and opting into content never creates an
entitlement.

The core understands two evidence modes:

- `local-acknowledgement` is an adult self-attestation stored by the current
  browser origin. It is sufficient for local settings and offline play, but it
  is not identity or jurisdictional age verification.
- `account-confirmed` is a versioned assertion held by the service. It is
  required before an account can request managed Mature or explicit narration.
  A future age-assurance provider can strengthen this assertion without
  changing the game contract.

The local record is separate from settings and saves:

```json
{
  "schema": "yaw-content-access-v1",
  "policyVersion": 1,
  "minimumAge": 18,
  "grants": {
    "mature": {
      "confirmedAt": "2026-07-29T00:00:00.000Z"
    },
    "categories": {
      "explicit.sexual": {
        "confirmedAt": "2026-07-29T00:00:00.000Z"
      }
    }
  }
}
```

The record contains no birthday, legal name, identity document, billing
identifier, or account token. Exported saves never contain it. Moving a local
HTML file, clearing browser data, using a browser with unstable file-origin
storage, or increasing `policyVersion` can require acknowledgement again.

Core must request access before:

- changing the content posture from SFW to Mature;
- enabling `explicit.sexual` or another category declared adult-only;
- enabling a Mature module when the current origin has not acknowledged it;
- restoring a save whose required enabled modules need an unacknowledged
  rating or category.

SFW downgrade and category disable operations never require confirmation.
Downgrade continues to disable incompatible modules and variants immediately.

## Account snapshot

The browser may receive only a redacted account snapshot:

```json
{
  "authenticated": true,
  "account": {
    "displayName": "Player",
    "contentAccess": {
      "policyVersion": 1,
      "ratings": ["mature"],
      "categories": []
    }
  },
  "entitlement": {
    "tier": "premium",
    "status": "active",
    "validUntil": "2026-08-29T00:00:00.000Z"
  },
  "allowance": {
    "period": "2026-08",
    "limit": 1000,
    "used": 124,
    "remaining": 876
  }
}
```

The snapshot must not contain provider credentials, authorization headers,
payment card data, processor webhook data, chargeback evidence, internal risk
scores, or unrestricted model/provider identifiers.

## Managed AI connection

The hosted game can register a core-owned provider adapter from a redacted
service declaration:

```json
{
  "id": "managed:narration",
  "displayName": "You Are Wild Premium Narration",
  "capabilities": ["text.generate"],
  "models": [
    {
      "id": "story-balanced",
      "displayName": "Balanced Story"
    }
  ],
  "content": {
    "ratings": ["safe", "mature"],
    "categories": []
  }
}
```

Discovery is opt-in and same-origin. A hosted deployment may publish
`/yaw-service.json` using the shape in
[`docs/examples/yaw-service.example.json`](examples/yaw-service.example.json).
If that file is absent, malformed, or unreachable, YAW does not register the
managed adapter and starts normally. Deployments may publish the declaration
with `enabled: false` while the service is being prepared. `file://` builds
never attempt discovery.

The declaration also names the module IDs allowed to see the managed connection
in ordinary module settings. The provider manager carries the requesting module
ID through profile discovery, connection discovery, and generation, and rejects
unapproved calls before the adapter. This is useful product policy but is not
hostile-code attestation: executable same-page modules can still modify browser
state. Server-side schema, entitlement, content, rate, concurrency, and
allowance checks therefore remain authoritative.

Model IDs are curated aliases. The service owns their current upstream
provider, endpoint, protocol, model name, credentials, system instructions, and
cost configuration. Changing the upstream mapping does not change module
settings or exported saves.

Managed narration accepts a narrowly versioned request, not OpenAI request
bodies and not arbitrary chat messages:

```json
{
  "schema": "yaw-managed-narration-v1",
  "requestId": "client-generated-idempotency-key",
  "connectionId": "managed:narration",
  "modelAlias": "story-balanced",
  "profileId": "storyteller",
  "maxCharacters": 500,
  "content": {
    "posture": "mature",
    "categories": []
  },
  "scene": {
    "viewpoint": {},
    "beats": [],
    "characters": [],
    "recentContext": []
  }
}
```

Every collection, string, and numeric field has a server-side limit. The
service constructs the provider prompt, adds authentication, enforces TLS and
same-origin redirect policy, applies time and output limits, sanitizes provider
errors, records bounded usage, and returns plain narration plus safe model and
usage metadata.

The service never accepts authorization headers, provider endpoints, raw
system prompts, provider model names, or credential fields from this request.
The browser never receives the upstream request or response body.

## Module boundary

Executable modules remain `trusted-local` code in the game page. Core can hide
the managed connection from unapproved packages and a hosted manifest can
forbid unapproved packages, but this is product policy rather than hostile-code
attestation. A player or malicious same-page module can modify browser requests.

Server controls therefore remain authoritative:

- the endpoint is narration-specific rather than a general LLM proxy;
- account entitlement and content access are checked for every request;
- request size, rate, concurrency, and monthly allowance are hard limits;
- an idempotency key prevents duplicate charging during retries;
- curated aliases prevent client-selected upstream providers or models;
- reaching the allowance cannot spend beyond the account's configured limit;
- provider credentials never cross into the renderer.

The current `MODS.ai.generate()` API remains the module-facing shape. It gains
no credential, billing, account, or arbitrary HTTP methods.

The managed adapter intentionally does not forward a module's free-form
`instructions` as a server system prompt. It sends a bounded scene-data
projection and a core-owned profile ID; the service constructs the actual
prompt.

## Entitlements and usage

An entitlement is provider-neutral:

```json
{
  "accountId": "internal-account-id",
  "source": "test",
  "externalSubscriptionId": "opaque-source-id",
  "tier": "premium",
  "status": "active",
  "periodStart": "2026-07-29T00:00:00.000Z",
  "periodEnd": "2026-08-29T00:00:00.000Z",
  "updatedAt": "2026-07-29T00:00:00.000Z"
}
```

The allowance is non-transferable service capacity, not cash, a redeemable
asset, or a creator payment. Initial billing offers should bundle a monthly
allowance rather than sell token-by-token microtransactions.

Usage reservation is transactional:

1. authenticate account and validate CSRF/origin;
2. validate content access and active entitlement;
3. reject a duplicate completed idempotency key or return its prior result;
4. reserve bounded allowance before the upstream request;
5. finalize measured usage on success;
6. release or conservatively finalize the reservation on a classified failure;
7. never let concurrent requests exceed the hard account allowance.

## Billing adapter

The service consumes normalized events:

```text
subscription.started
subscription.renewed
subscription.changed
subscription.canceled
payment.failed
payment.refunded
payment.chargeback
```

Every adapter must verify the raw webhook before normalization, persist the
provider event ID, process it idempotently, retain the minimum audit record,
and reconcile active subscriptions periodically. Game code never imports a
processor SDK or interprets processor status values.

Development begins with a test adapter. A CCBill adapter is added only after
written approval for the disclosed game, generated narrative content, Canadian
merchant, and API/webhook entitlement flow.

## Normalized errors

Public failures use bounded codes:

```text
authentication_required
content_access_required
entitlement_required
allowance_exhausted
rate_limited
request_invalid
model_unavailable
provider_timeout
provider_rejected
service_unavailable
```

Diagnostics may include a request ID, retry guidance, redacted model alias, and
safe usage snapshot. They never include credentials, upstream headers, provider
response bodies, internal URLs, prompts, billing payloads, or stack traces.

## Initial HTTP surface

The intended service surface is semantic and versioned:

```text
POST /v1/auth/magic-link
POST /v1/auth/consume
POST /v1/account/logout
GET  /v1/account/session
POST /v1/account/content-access
GET  /v1/managed/connections
POST /v1/managed/narration
POST /v1/webhooks/test-billing
```

Hosted browser sessions use secure, HttpOnly, SameSite cookies. State-changing
browser routes also require an origin check and CSRF protection. Webhooks use
processor verification rather than browser session authentication.

Purchase, customer-portal, and production-processor webhook routes do not exist
yet. They remain deferred until a processor has provided written approval and a
processor-specific adapter has passed replay and lifecycle tests.

## Deferred

- Selecting a production payment processor before written approval
- Per-request purchases or transferable credits
- Creator payouts or a marketplace
- General chat/completions proxy access
- User-supplied server credentials
- Cloud saves or multiplayer
- Hostile-code-complete module sandboxing
- Pear distribution, seeding, or mesh services
