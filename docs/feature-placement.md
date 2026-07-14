# Feature Placement Decision Inventory

This inventory records expansion proposals that still need operator placement. It deliberately does not decide whether a feature belongs in core, a first-party optional module/content pack, or a third-party mod seam.

| Proposal | Core dependencies | Save impact | Content policy | Existing seam | Decision needed |
| --- | --- | --- | --- | --- | --- |
| Advanced branching quests | Quest state, routing, rewards | Medium | Safe-capable | Quest templates and hooks | Baseline depth expected from core |
| Companion equipment management | Holdings, equipment, party UI | Medium | Safe | Read-only ally equipment foundation | Whether loadout management is baseline |
| Richer party roles and dismissal consequences | Party AI, quests, world deltas | Medium | Safe | Party role and AI-order APIs | Required core roles versus optional packs |
| Additional Feast/container variants | Combat actions, containment, saves | High | Tier-dependent | Sub-actions and containment hooks | Which variants are baseline and which are rated modules |
| Itemized remains and butchering | Inventory, remains, economy | High | Tier-dependent | Remains Pool and future hooks | Whether core should ever create creature-piece items |
| Generated narrative/LLM bridge | Scene Beats, Activity, public context | Low if presentation-only | Tier-dependent | `MODS.getContext()` and scene templates | First-party example versus third-party seam only |
| Tilesets and media packs | Asset loading and provenance | Low | Safe-capable | Asset manifest and fallbacks | Which first-party assets ship with core |
| Advanced interiors | World generation, traversal, saves | High | Safe-capable | `enterable` / `interior.enabled` opt-in | Authored modules versus generated core grammar |
| Procedural perk trees | Progression, balance, UI | Medium | Safe-capable | Perk registry foundation | Minimal core depth and mod ownership |

Placement decisions should consider baseline playability, accessibility/localization obligations, save compatibility, balance ownership, content-rating impact, and whether disabling the feature can leave a valid game.
