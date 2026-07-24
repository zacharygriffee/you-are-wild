# Ghost Recovery — Pre-Publish Decision

Status: **accepted baseline for the next publication**

Recovery Mode V1 already contains a bounded `core:ghost` journey. A defeated
player rises at the defeat site, pays the configured inventory consequence
once, travels cardinally without ordinary encounters or hunger, cannot use
living-world combat, inventory, interaction, recruitment, or structure
commands, and resurrects at the validated home/safe anchor.

The conservative implementation is the accepted built-in product. Richer
spectral abilities, authored shrine networks, faction costs, and alternate
resurrection economies remain separate recovery profiles rather than implicit
expansion of core Ghost.

## Accepted Decisions

1. **Where resurrection happens**
   - The current validated home/safe anchor is the destination.
   - It does not need to be an authored shrine. The stable Recovery Mode V1
     schema token remains `shrine` for save and module compatibility, but
     player-facing copy says safe place.
2. **How Ghost mode is entered**
   - The player selects Ghost pilgrimage in Settings before defeat.
   - A defeat prompt does not silently add or switch recovery modes.
3. **What happens to companions**
   - Preserve terminal battle settlement.
   - Living companions remain at the defeat tile; defeated companions retain
     their actual outcome. Resurrection never teleports or revives them.
4. **Inventory consequence**
   - Defer to the ordinary `inventoryRecovery` setting.
   - The consequence is applied once when the journey begins and never again
     at resurrection or after save/load.
5. **Ghost agency**
   - Core Ghost is traversal-only gameplay. Existing read-only map, Scene, and
     Activity history remain visible.
   - Combat, containment, inventory use, trade, quests, recruitment, and
     structure commands remain blocked through direct command boundaries.
   - Spectral abilities require a separate authored recovery profile.
6. **Resurrection cost**
   - No additional item, currency, or faction cost.
   - The cost is the defeat consequence, the return journey, separated
     companions, and resurrection at 1% condition.
7. **Encounter communication — implemented baseline**
   - Ghost travel suppresses ordinary encounters and now records an explicit
     Scene/Activity explanation when a living Hostile is present. It no longer
     falls through to the ordinary exploration composer or resemble a failed
     combat trigger.
8. **Failure safety**
   - every chosen destination must be reachable under spectral traversal;
   - unavailable module-owned recovery must continue to fall back to ordinary
     recovery;
   - save/load must resume the journey without charging consequences twice.

## Preservation Invariants

- Ghost remains opt-in and cannot replace Hardcore semantics.
- Consequences occur once.
- Companions are resolved by the battle rather than teleported.
- The destination must remain reachable under ethereal traversal.
- Unavailable module-owned recovery continues to fall back to Regenerate.
- Save/load resumes the journey without repeating consequences.
- These decisions do not authorize a Sites publication.
