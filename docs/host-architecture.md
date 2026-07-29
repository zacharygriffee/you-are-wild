# Host architecture

You Are Wild is a host-neutral browser application. The canonical game, deterministic rules, save schema, provider-independent AI contract, and module runtime remain in this repository. Native shells implement bounded capabilities; they do not own gameplay.

## Runtime boundary

`app/src/core/host-capabilities.js` exposes the stable `YAW_HOST` object. It selects one of two implementations at startup:

- `browser` retains ordinary download/import behavior and the existing session provider transports;
- `pear-electron` mediates a narrowly scoped preload bridge supplied by the adjacent native host.

The game starts normally when no preload bridge exists. Electron, Pear, Bare, Corestore, Hypercore, Hyperswarm, Node, and operating-system libraries are not dependencies of this repository or its browser builds.

The current semantic capability identifiers are:

- `files.export_save`
- `files.import_save`
- `providers.session_transport`
- `providers.secure_transport`
- `providers.persistent_credentials`
- `distribution.read_status`

Missing capabilities produce a serializable `unsupported_capability` result. There is no generic invocation, IPC, shell, filesystem, or Electron method.

## Browser fallback

Browser and standalone builds use a `.yawsave` JSON envelope around the unchanged binary save data. Export uses a normal browser download. Import uses a browser file chooser, enforces the size and envelope limits, and passes the decoded data through `Binary.loadGame()` before it is stored.

The existing `dist/you-are-wild.html` single-file release remains first class. `npm run build:hosted` produces the external-asset browser shell used by hosted deployments and by deterministic native renderer synchronization.

## Native host

The native preload may expose only these bounded sections:

```text
window.yawHost
├── capabilities()
├── app.platform()
├── distribution.status()
├── files.exportSave()
├── files.importSave()
└── providers
    ├── listProfiles()
    ├── createProfile()
    ├── configureCredential()
    ├── forgetCredential()
    ├── test()
    └── generate()
```

The core rejects a bridge with additional methods. Native save dialogs return content, cancellation state, and a display-safe filename; they never return an operating-system path.

## Provider credential custody

The browser renderer may collect a session credential for the existing
browser-only provider flow. In the native host, credential entry occurs only
inside a dedicated trusted window that does not load the game or executable
modules. Electron main encrypts or retains it for the session immediately. The
game renderer never receives plaintext, encrypted blobs, authorization
headers, storage paths, or decryption handles.

Native profiles are mirrored into `YAW_AI_PROVIDER_MANAGER` as display-safe metadata and opaque connection IDs. The native host adapter sends bounded generation requests to Electron main. Existing modules continue to call:

```js
MODS.ai.generate(request)
MODS.ai.listConnections(capability)
MODS.ai.cancelPending()
```

Credential management is not present on `MODS`. For the native host,
`configureCredential(profileId)` opens a separate trusted window that does not
load the game or executable modules; the game renderer never receives or
forwards the key. Module settings continue rejecting credential-like keys and
values.

```text
YAW module
    -> MODS.ai.generate()
        -> YAW provider manager
            -> host-backed provider adapter
                -> bounded preload method
                    -> Electron main provider broker
                        -> safeStorage credential
                        -> external provider
```

## Native-required modules

`runtimeRequirements` may optionally declare semantic hosts and capabilities:

```json
{
  "runtimeRequirements": {
    "hosts": ["pear-electron"],
    "capabilities": [
      "providers.secure_transport"
    ]
  }
}
```

Existing manifests remain compatible. A declaration only blocks activation on an incompatible host; it does not grant a module any method or permission.

## Future hosts

A future native host should implement the same semantic contract and keep authority outside the renderer. New host operations should be narrowly named, serializable, core-owned where credentials or saves are involved, and accompanied by negative tests. Pear seeding, mesh bridges, sidecars such as Omega, payments, entitlements, and generalized native plugins are intentionally outside this phase.
