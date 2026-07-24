# Feed Contract V1

Feed is a target-explicit interaction. The selected actor is always the source of care or nourishment, and the selected target is always the recipient or consumer. Resolution must not redirect either role to the player, the most wounded ally, or another convenient unit.

## Canonical variants

| Variant | Source requirement | Target effect |
| --- | --- | --- |
| Tend | A living actor, including self | Restores condition only on a wounded target. It creates no nutrition or Spirit recovery. |
| Nurse | Lactating actor whose cooldown is ready and whose `core:nurse` nourishment reserve has a charge | Spends one charge, restores bounded vitality and hunger to the chosen target from the amount spent, then starts cooldown. |
| Offer Self | Non-player livestock or authored willing prey that fits the target | Places the actor alive in the target's stomach and removes the actor from the active party/area through the normal containment contract. |
| Offer Piece | Renewable, slurpable, breakable, or slime-like actor with enough condition reserve | Costs the actor a bounded amount of condition and restores the chosen target without removing either unit. |

The picker exposes variants whenever the actor has the structural capability to attempt them. Reach, capacity, willingness, and resistance are preview clues rather than pre-resolved outcomes; a physically meaningful committed command spends its action and reports success or failure in-world. The default is Tend. Tend is `both` scoped, so a wounded selected actor can tend themself without first being marked as a target. A selected but now-invalid target fails in place; it is never replaced automatically.

## Compatibility boundary

The legacy `heal`, `breastfeed`, `sacrifice`, `forceFeed`, `slurp`, and `fragment` identifiers remain resolvable for old saves and trusted mods. They are hidden from the core picker because several use the inverse actor/target direction. New content should register or call the canonical variants.

Whole-player offering is deferred. Removing the player into living containment needs a playable capture/recovery loop that remains distinct from death, defeat, and regeneration. Coerced self-offering is also deferred to content-policy-aware modules and must not be inferred from ordinary Feed.

## Resolution invariants

- Actor, target, and variant are recorded on the same interaction command and Scene Beat.
- Feed, Feast, and Play use the same `YAW_SUB_ACTIONS.resolve` contract. It evaluates the selected actor-target pairs and reports each variant as available, partial, or unavailable.
- Multi-pair menus show at most eight exact pair explanations, disclose any omitted pair count, and list the ordinary action cost once per actor. This presentation does not change deterministic resolution order or accounting.
- Variants declare `scope: 'target'`, `scope: 'self'`, or `scope: 'both'`. Target-scoped options resolve against marked units; self-scoped options resolve against each eligible selected actor and never consume or clear an unrelated marked target.
- Feed, Feast, and Play remain stable primary interaction buttons. Their variants never appear as peer `Self: ...` buttons in the main composer.
- Actor-owned containment controls such as Digest and Release remain available without requiring a marked target. Opening the primary interaction with actor-only selection shows a Self group; opening it with marked targets shows applicable Self and Targets groups in the same accessible submenu.
- Variant options expose cost, reach, capacity, willingness, and resistance clues. Structurally unavailable options remain visible with an accessible reason, while ordinary reach/capacity/resistance failures resolve only after commitment through the Scene Feed.
- A sole valid combat variant dispatches directly. Multiple valid variants open the same desktop/mobile surface, and Back restores the prior actor and target selection.
- Combat Feed is target-first and spends the current actor's turn only after a variant resolves.
- Exploration and combat use the same variant definitions and containment helpers.
- Costs and nourishment apply once per resolved command and remain deterministic.
- Nurse reserve state is owned by Resource Ledger V1. Missing and legacy entries
  start at zero, renew on the authored digestion interval, persist by namespace,
  and remain dormant rather than executable while a contributing profile is
  unloaded.
- Tend is care rather than nourishment. It charges the actor's ordinary Feed
  command cost, changes only target condition, and leaves hunger and Spirit
  untouched.
- Combat Tend support XP is the delta between deterministic condition-recovery
  bands. Restoring one full target condition pool can award at most the
  configured support reward, partial restoration awards only the bands crossed,
  and self-care or a no-op awards none.
- Whole offering preserves the living unit record, role/AI metadata, and containment persistence.
- Offering a piece never reduces the source below one condition.
- Core labels and feedback are localized. Trusted legacy integrations may keep using `App.registerSubAction`. Modules request `content:add_action_variant` and use `MODS.registerActionVariant`; V1 bounds module variants to Feed, Feast, and Play, rejects core-id replacement, owns registrations by module, and removes them on unload.
