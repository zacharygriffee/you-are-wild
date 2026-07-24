# Media Provider Adapter Contract

Media Provider Adapter V1 lets a trusted-local executable module add a
provider-neutral `MediaSource`, `MediaStore`, or combined adapter to the
existing Media Repository. It does not add another transport, grant filesystem
access, or change IndexedDB as the default offline store.

## Trust And Permission Boundary

A provider module must declare `media:provide` and register through:

```js
MODS.registerMediaProvider('example-source', {
  capabilities() {
    return { source: true, store: false, lease: false };
  },
  async health() {
    return { ok: true };
  },
  async acquire(input, options) {
    // Return the normalized descriptor and verified bytes/blob.
  }
});
```

This is a capability and lifecycle boundary, not a security sandbox. Executable
modules still run as reviewed `trusted-local` code in the game page. A module
cannot replace a provider ID owned by core or another module. Disabling,
replacing, or failing that module removes all of its provider roles and closes
the adapter after active leases have been released.

Provider adapters must not put API keys, authorization headers, cookies, or
other credentials in module settings, manifests, catalog metadata, saves, or
diagnostics. A host or sidecar may establish session-only authorization outside
the module package. The existing `YAWEndpointMediaStore` is the canonical
`yaw-media-endpoint-v1` HTTP/sidecar transport and should be reused rather than
reimplemented when that protocol fits.

## Roles

Every adapter implements synchronous `capabilities()` and asynchronous
`health()`. `capabilities()` must advertise at least one role:

- `source: true` requires `acquire(input, options)`.
- `store: true` requires `beginBatch`, `stage`, `commit`, `abort`, `has`,
  `stat`, `open`, `acquire`, `release`, and `remove`.

A combined adapter may advertise both roles. Optional `estimate`,
`cleanupStaging`, and `close` methods are forwarded by the repository. Provider
IDs and ownership are stable for the enabled module lifetime.

Source results and store operations remain subject to the ordinary Media
Contract: bounded byte counts, declared MIME and dimensions, signature checks,
SHA-256 identity, staged publication, explicit leases, and sanitized errors.
Provider selection never grants a module access to another module's catalog;
`media:read` remains the separate permission for its own installed resources.

## Offline And Failure Behavior

The built-in IndexedDB store and credentialless reviewed HTTP source remain
available on `file://`. A provider may declare stricter origin, network, or
secure-context requirements in its ordinary module manifest. Such requirements
are checked before module enablement.

Asset bundles still download, verify, and copy media into a selected durable
store. They do not become remote hotlinks merely because a Source adapter is
present. If an adapter is disabled or unavailable, records remain
provider-neutral and diagnostics report the missing provider; deterministic
emoji, text, or presentation fallbacks continue to work.

## Deferred Providers

The adapter seam makes later providers possible without committing to them:

- an AI-generated-media Source after a reviewed generation and policy flow;
- a narrow Electron, Pear, or other packaged-runtime bridge;
- an optional OPFS store.

Those implementations remain deferred. None may become a prerequisite for the
downloadable game or silently auto-install generated content.
