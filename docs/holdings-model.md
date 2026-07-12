# Holdings / Inventory / Containers Doctrine

Holdings is the broad player-facing view for things a player may inspect or manage. Inventory is only the item pack. The Holdings UI must not flatten equipment, body containers, tile items, and remains into the backpack model.

## Player-Facing Hierarchy

```text
Holdings / Inventory Window
├─ Equipped
├─ Pack / Inventory
├─ Containers
│  ├─ Belly / Stomach
│  ├─ Inner / Womb when compatibility/content settings expose it
│  ├─ Reserve / Balls when compatibility/content settings expose it
│  └─ Modded containers
└─ Here / Ground
   ├─ tile items
   └─ corpses/remains
```

## Data Boundaries

- Pack / Inventory maps to `app.inventory`.
- Equipment maps to `unit.equipment`, primarily `player.equipment` for management.
- Containers map to unit-owned containment arrays such as `unit.stomach`, `unit.womb`, and `unit.balls`.
- Here / Ground maps to current tile items and local corpse/remains records.
- Remains use Remains Pool and Scavenge behavior, not pack-item behavior.
- Living containment uses Vital Pool and container management, not pack-item behavior.

The current implementation uses adapter helpers over existing fields. It does not aggressively migrate saves or replace the storage model.

## UI Rules

- Inventory/Pack item controls remain Use, Equip, Drop, Buy, Sell, Loot, and related item actions.
- Equipped items remain slot-based and are not loose pack items until unequipped.
- Contained creatures are containment entries. They can expose Inspect, Release, and Digest/Continue controls when their state allows it.
- Terminal or depleted containment entries remain inspectable but ordinary release is unavailable.
- Corpses/remains are Here/Ground entries. Loot may create normal inventory items, but Scavenge consumes Remains Pool and must not create itemized creature pieces in core.
- Tile items are Here/Ground entries until picked up.

## Compatibility And Modding

The default active container is `stomach` / Belly. `womb` / Inner and `balls` / Reserve remain compatibility/content-tier-gated surfaces. Mods may register additional container profiles through the existing container profile seam.

Adapter-style helpers should be preferred for UI work:

- `_holdingSections(owner)`
- `_listPackItems(owner)`
- `_listEquipmentSlots(owner)`
- `_listContainerEntries(owner, containerId)`
- `_listAllContainerEntries(owner)`
- `_containerProfile(containerId)`
- `_containerEntryStatus(entry)`
- `_containerEntryActions(owner, containerId, entry)`
- `_groundHoldings(tile)`
- `_holdingEntryKind(entry)`

These helpers describe current holdings without moving data into a new schema.
