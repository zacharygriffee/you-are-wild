# Holdings / Inventory / Containers Doctrine

Holdings is the broad player-facing view for things a player may inspect or manage. Inventory is only the item pack. The Holdings UI must not flatten equipment, body containers, tile items, and remains into the backpack model.

## Player-Facing Hierarchy

```text
Holdings / Inventory Window
├─ Owner selector (party member being inspected/managed)
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
- Pack is shared by the party in the current model. There are no per-companion backpacks in core.
- Equipment maps to the selected Holdings owner via `unit.equipment`.
- Containers map to unit-owned containment arrays such as `unit.stomach`, `unit.womb`, and `unit.balls`.
- Here / Ground maps to current tile items and local corpse/remains records.
- Remains use Remains Pool and Scavenge behavior, not pack-item behavior.
- Living containment uses Vital Pool and container management, not pack-item behavior.

The current implementation uses adapter helpers over existing fields. It does not aggressively migrate saves or replace the storage model.

## UI Rules

- Inventory/Pack item controls remain Use, Equip, Drop, Buy, Sell, Loot, and related item actions.
- Holdings exposes a party-owner selector. Stats, Equipped, and Containers render for the selected party owner. Switching owners preserves the active tab where possible and falls back to the player if the previous owner leaves.
- Pack remains shared. Equipping a Pack item equips it to the selected Holdings owner. Unequipping returns the item to the shared Pack.
- Pack should be labeled as shared when a companion owner is selected. Core does not expose per-companion backpacks.
- Equipped items remain owner slot-based and are not loose pack items until unequipped.
- Contained creatures are entries under the selected owner containers. They can expose Inspect, Release, and Digest/Continue controls when their state allows it.
- Terminal or depleted containment entries remain inspectable but ordinary release is unavailable.
- Corpses/remains are Here/Ground entries. Loot may create normal inventory items, but Scavenge consumes Remains Pool and must not create itemized creature pieces in core.
- Tile items are Here/Ground entries until picked up.
- Mobile actor/target picker rails reserve their first slot for Details/Menu access. Bulky Clear/Close chips do not belong in the rail; clearing should happen through composer slot controls, selected-chip toggles, dock toggles, or other non-bulky affordances.
- Side panels and mobile rails are tactical summary surfaces, not management surfaces. Expanded party/creature cards may show compact vitals, row/role, equipment summary, and container capacity/contents summary, but full Stats, Equipment, Pack, Containers, Release, Digest, and Inspect management belongs in Holdings.
- Party-card Stats/Details routes should open Holdings for the selected owner instead of rendering a full stats or inventory page inside the narrow rail.
- The Holdings Containers tab owns detailed container sections. It should not repeat a nested "Containers" heading inside the Containers tab; the visible section headers should be concrete containers such as Belly, Inner, Reserve, or modded container names.

## Compatibility And Modding

The default active container is `stomach` / Belly. `womb` / Inner and `balls` / Reserve remain compatibility/content-tier-gated surfaces. Mods may register additional container profiles through the existing container profile seam.

Adapter-style helpers should be preferred for UI work:

- `_holdingSections(owner)`
- `_holdingsOwner()`
- `_holdingsOwnerId(unit)`
- `_setHoldingsOwner(ownerId)`
- `_partyHoldingOwners()`
- `_showHoldingsForUnit(unit, options)`
- `_holdingOwnerLabel(unit)`
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
