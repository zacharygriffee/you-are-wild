# Maintained Optional First-Party Modules

Files described below are maintained reference packages and are not included in
`dist/you-are-wild.html`. Other local files in this directory are not endorsed
examples unless they are explicitly added to this list and covered by tests.
The canonical authoring contract is `docs/modding.md`; packages demonstrate only
the APIs they actually use.

`you-are-wild-narration.yawmod.json` is the Simple Narrator reference package.
It adds provider-neutral SFW/Mature narration orchestration, exposes bounded
multiline mod instructions, and requires a session provider connection. Ready
narration becomes the primary Scene Feed passage, but deterministic Scene Beats
remain available under the Events disclosure. Version 0.7 keeps player POV as
the default and adds first-person, third-person-limited, and cinematic observer
framing. Perspective changes affect grammar only: structured actor, target,
self, observer, and mixed roles plus deterministic facts remain authoritative.
Storyteller, Character reactions, and Hybrid remain separate style profiles,
and unchanged tiles reuse bounded state-and-configuration-fingerprinted prose.
The packaged runtime is generated from
`sources/you-are-wild-narration.js` with `npm run build:simple-narrator`.

`you-are-wild-template-narration.yawmod.json` is an offline deterministic
fallback/reference package. It exercises orchestration ownership and narration
publication without `ai:request` or a provider connection. Its lower priority
allows Simple Narrator to take ownership when a provider is ready.

`you-are-wild-narration-diagnostics.yawmod.json` is a disabled-by-default
developer fixture. It reports bounded public context and ownership lifecycle
without reading provider profiles, credentials, saves, or raw application
state.

`you-are-wild-waystone-recovery.yawmod.json` is a disabled-by-default Recovery
Mode V1 example. It combines the existing death-bag, defeat-site, ethereal
journey, safe-place resurrection, and vitality declarations without replacing
core defeat or companion settlement. It includes owned English and Spanish
labels and works without network access.

`you-are-wild-explicit-narration.yawmod.json` is a separate category-gated
orchestrator. It remains disabled by default, requires explicit provider-policy
acknowledgement for the selected connection/profile, and blocks generation
unless all involved characters carry trusted adult-eligibility metadata.
When it is ready and allowed it exclusively owns the exchange; otherwise the
standard orchestrator remains available.

OpenAI-Compatible profiles are the canonical browser-direct text provider for
reference narration packages. Puter remains an optional keyless adapter: it
owns browser sign-in, places no API key in module settings or saves, and exposes
only an opaque session connection to compatible narration modules. Simple
Narrator discovers every active `text.generate` connection through the
provider-neutral module API; it does not filter by provider implementation,
browser origin, or native host.

`you-are-wild-explicit.yawmod.json` is the first-party provider for explicit
creation options, settings, and narrative. Install it through the local Mod
Manager, opt into its declared category under Settings, and then enable it.

The package is intentionally separate from the default artifact. Core mechanics
must remain playable without it.

`example-tileset-pack/` is the maintained code-free Asset Bundle/Tileset Pack
V1 fixture. It demonstrates reviewed URI resources, local retention, fallback,
replacement, removal, terrain transitions, and topology-aware interiors.

`example-sprite-pack/` is the maintained code-free Asset Bundle/Sprite Pack V1
fixture. Its reproducible atlas demonstrates Human and Wolfkin idle strips,
wounded and Ghost states, pack-local fallback, IndexedDB retention, local
session leases, reload, and clean emoji restoration on disable.
