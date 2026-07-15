# Optional First-Party Mods

Files in this directory are not included in `dist/you-are-wild.html`.

`you-are-wild-narration.yawmod.json` adds provider-neutral SFW/Mature narration
orchestration. It requires a session provider connection and never replaces
deterministic Scene Beats.

`you-are-wild-explicit-narration.yawmod.json` is a separate category-gated
orchestrator. It remains disabled by default, requires explicit provider-policy
acknowledgement for the selected connection/profile, and blocks generation
unless all involved characters carry trusted adult-eligibility metadata.

`you-are-wild-explicit.yawmod.json` is the first-party provider for explicit
creation options, settings, and narrative. Install it through the local Mod
Manager, opt into its declared category under Settings, and then enable it.

The package is intentionally separate from the default artifact. Core mechanics
must remain playable without it.
