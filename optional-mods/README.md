# Optional First-Party Mods

Files in this directory are not included in `dist/you-are-wild.html`.

`you-are-wild-narration.yawmod.json` is the Simple Narrator reference package.
It adds provider-neutral SFW/Mature narration orchestration, exposes bounded
multiline mod instructions, and requires a session provider connection. Ready
narration becomes the primary Scene Feed passage, but deterministic Scene Beats
remain available under the Events disclosure. Version 0.6 gives Storyteller,
Character reactions, and Hybrid distinct prompt contracts, promotes ready tile
observations into the center passage, and reuses bounded state-fingerprinted
prose when an unchanged tile is revisited with the same narrator configuration.

`you-are-wild-template-narration.yawmod.json` is an offline deterministic
fallback/reference package. It exercises orchestration ownership and narration
publication without `ai:request` or a provider connection. Its lower priority
allows Simple Narrator to take ownership when a provider is ready.

`you-are-wild-narration-diagnostics.yawmod.json` is a disabled-by-default
developer fixture. It reports bounded public context and ownership lifecycle
without reading provider profiles, credentials, saves, or raw application
state.

`you-are-wild-explicit-narration.yawmod.json` is a separate category-gated
orchestrator. It remains disabled by default, requires explicit provider-policy
acknowledgement for the selected connection/profile, and blocks generation
unless all involved characters carry trusted adult-eligibility metadata.
When it is ready and allowed it exclusively owns the exchange; otherwise the
standard orchestrator remains available.

The default game exposes an optional Puter user-pays connection in AI Providers.
Puter handles browser sign-in and no API key enters module settings or save
data. Its opaque connection lasts for the current browser session and can be
selected by either provider-backed narration package.

`you-are-wild-explicit.yawmod.json` is the first-party provider for explicit
creation options, settings, and narrative. Install it through the local Mod
Manager, opt into its declared category under Settings, and then enable it.

The package is intentionally separate from the default artifact. Core mechanics
must remain playable without it.
