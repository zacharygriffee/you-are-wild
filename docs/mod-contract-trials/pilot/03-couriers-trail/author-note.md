# Author note: Courier's Trail

## Repository evidence used

- `docs/modding.md` was treated as the canonical authoring contract. I used its version-one package envelope, declared only `content:add_item` and `content:add_quest`, authored Item Definition V2 data, and used a Quest Contract V2 template with existing structure acquisition routes.
- `docs/quest-world-directives-v1.md` establishes that a required objective should use `place`, not a probability `boost`; that core selects a stable reachable coordinate; that repeated activation and save/load are idempotent; and that the resolved location becomes objective guidance.
- `app/src/core/module-system.js` confirms owner-local item and quest IDs are namespaced, item and quest registrations are removed on disable, exact structure placements are restored once on re-enable, and already-issued quest records are retained.
- `app/src/core/quest-contract.js` supplied the implemented bounds and vocabulary for `place`, `recover`, stage events, and the `log` stage effect.
- `app/src/core/quest-flow.js` confirms that accepting a quest materializes its directives, recover objectives match a found item at their resolved location, quest items can be consumed on turn-in, rewards are guarded against duplicate claims, and stage `log` effects enter the player-visible Activity Log.
- `app/src/core/app.js` confirms `cabin` and `camp` are quest-capable structure routes and `general` and `traveler` are existing merchant tables.
- `app/release.json` identifies the current package game version as `0.17.0` and says modules using Item Definition V2 should require `0.16.0` or newer.

## Important assumptions and design choices

- “Courier supplies” is represented by two mechanically honest items: a bounded healing consumable and a mundane trade material. Both use existing merchant and search acquisition seams.
- “Near its destination” is interpreted as the core-resolved objective destination: the satchel is guaranteed on one reachable tile three to six cardinal steps from the quest giver, and that resolved tile becomes the objective's map guidance.
- The satchel is a non-stackable quest-purpose item and is consumed only when returned to the original giver. The reward is 24 XP and 18 gold so it remains available even if no extra inventory slot is open.
- Player-visible event narration uses bounded stage-graph `log` effects at acceptance, recovery, turn-in, and failure. Core-owned quest toasts and transaction scene beats continue to narrate the standard lifecycle.
- The module stores no private runtime state and registers no hooks. Save/load coherence, stable placement IDs, objective progress, reward deduplication, provider disable behavior, and one-copy re-registration are delegated to the maintained core contracts.
- If the module is disabled after issuance, the saved quest and any already-materialized satchel remain bounded saved data, while the live template and item definitions become unavailable. Re-enabling restores those definitions and one acquisition placement. Per the public contract, missing provider content is not regenerated while its provider is disabled.

## Public-contract limits

- The public API does not permit a module to create a courier office, road, landmark, route, interior, or custom world-generation callback, so the quest is offered through existing cabins and camps and uses core pathfinding for its trail marker.
- Item Definition V2 does not support equipment, arbitrary utility effects, feeding/rations, buffs, repairs, crafting behavior, or a custom “open satchel” action. The field dressing uses the one supported healing effect, the cord is explicitly trade-only, and the satchel is quest data.
- The quest contract does not expose arbitrary scripts or custom save fields. All effects are declarative, and narration is limited to supported Activity Log text plus the core quest scene beats.
