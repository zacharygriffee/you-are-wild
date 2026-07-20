# Feed Contract V1

Feed is a target-explicit interaction. The selected actor is always the source of care or nourishment, and the selected target is always the recipient or consumer. Resolution must not redirect either role to the player, the most wounded ally, or another convenient unit.

## Canonical variants

| Variant | Source requirement | Target effect |
| --- | --- | --- |
| Tend | A living actor, including self | Restores condition and eases hunger on a wounded target. |
| Nurse | Lactating actor whose cooldown is ready | Restores vitality and hunger to the chosen target, then starts cooldown. |
| Offer Self | Non-player livestock or authored willing prey that fits the target | Places the actor alive in the target's stomach and removes the actor from the active party/area through the normal containment contract. |
| Offer Piece | Renewable, slurpable, breakable, or slime-like actor with enough condition reserve | Costs the actor a bounded amount of condition and restores the chosen target without removing either unit. |

The picker enables these variants only when their source/target contract is currently valid. The default is Tend. A selected but now-invalid target fails in place; it is never replaced automatically.

## Compatibility boundary

The legacy `heal`, `breastfeed`, `sacrifice`, `forceFeed`, `slurp`, and `fragment` identifiers remain resolvable for old saves and trusted mods. They are hidden from the core picker because several use the inverse actor/target direction. New content should register or call the canonical variants.

Whole-player offering is deferred. Removing the player into living containment needs a playable capture/recovery loop that remains distinct from death, defeat, and regeneration. Coerced self-offering is also deferred to content-policy-aware modules and must not be inferred from ordinary Feed.

## Resolution invariants

- Actor, target, and variant are recorded on the same interaction command and Scene Beat.
- Combat Feed is target-first and spends the current actor's turn only after a variant resolves.
- Exploration and combat use the same variant definitions and containment helpers.
- Costs and nourishment apply once per resolved command and remain deterministic.
- Whole offering preserves the living unit record, role/AI metadata, and containment persistence.
- Offering a piece never reduces the source below one condition.
- Core labels and feedback are localized; mods may add variants through the existing sub-action registry without replacing this role contract.
