# Control Model

This document defines the UI-safe control model for traversal, actor selection, target selection, intent selection, and inspection surfaces. It is doctrine for later UI work only; it does not implement the controls.

## Goals

- Keep routine play on one shared interaction model across mobile and desktop.
- Separate movement, selection, intent, and inspection so one surface does not hide or overload another.
- Preserve existing party, creature, combat, quest, trade, recruit, loot, scavenge, and modded action routing.
- Keep all controls reversible until a normal gameplay command is explicitly dispatched.

## Control Modes

### Traversal mode

Traversal mode owns movement through the world and structure interiors.

- The primary traversal surface is the 3x3 play surface.
- The center tile is the current location and owns immediate semantic context: biome, terrain, structure, tile event feed, items, POIs, present creatures, party-relevant state, and available local affordances.
- The eight surrounding cells preview adjacent reachable directions and act as movement targets.
- The display map is a deliberate review and planning surface, not the routine movement control. It can show discovered territory, route hints, quest focus, roads, bridges, and POIs without becoming the default movement loop.
- Desktop and mobile use the same concept. Wider desktop layouts may show more state, but the command model stays aligned with touch-first traversal.
- Combat can temporarily reduce traversal affordances. If the whole party flees, combat returns to directional escape selection on the play surface.

### Selection mode

Selection mode owns who is acting and who or what is being acted on.

- Actor selection chooses one or more party members that will perform the next command.
- Target selection chooses one or more party members, area creatures, corpses, items, merchants, quest givers, structures, POIs, or tiles that the selected actors can address.
- Selection state must be visible as compact chips, selected card/chip state, or center-surface summaries before dispatch.
- `Act`, `Target`, and Inspect/Stats remain reachable while multi-character behavior depends on them.
- Multi-select must preserve existing direct, marked-target, party-vs-party, area-creature, combat-target, and modded action flows.
- Invalid or ambiguous selections should preserve selection state and return correction guidance instead of silently choosing a different command.

### Intent mode

Intent mode owns what the selected actors are trying to do.

- Primary intents are high-level commands such as fight, flirt, feast, feed, flee, trade, recruit, loot, scavenge, rest, inventory, quest, inspect, and modded actions.
- Sub-actions and confirmation prompts resolve through the existing action metadata, sub-action registry, content-tier label helpers, and command dispatchers.
- Action menus, bottom sheets, desktop popovers, and future radial controls are alternate presentations of the same intent model.
- The radial or gesture path must be an accelerator only; every intent needs a labeled, keyboard/focusable, accessible fallback.
- High-impact commands must not bypass normal confirmation, capacity, eligibility, content-tier, or target-validation gates.
- Combat intent selection should place party access in the lower reach area on mobile, enemies above the party strip, and the intent sheet between actor and target context where practical.

### Inspection mode

Inspection mode owns detail views and review surfaces.

- Inspect/Stats surfaces show exact numbers, equipment, perks, body/detail metadata, inventory detail, quest detail, merchant stock, tile metadata, and debug-level state that does not belong on compact cards.
- Inspection must not mutate gameplay state unless a clearly labeled command is chosen inside the inspection surface.
- Inspection can be opened from cards, chips, the center tile, the display map, quest routes, merchant screens, inventory, and combat state.
- Desktop inspection can use bounded popovers or side panels; mobile inspection can use sheets or full-height panels with predictable close behavior.
- Escape, outside tap where appropriate, Back, and explicit close controls should return to the prior mode without dropping valid actor/target selections.

## Surface Responsibilities

### Play surface

- Owns traversal and the current tile's immediate playable context.
- Shows the tile-scoped event feed for recent local events while the durable log remains available separately.
- Hosts movement affordances, local item/POI affordances, and immediate creature context.

### Cards and chips

- Show identity, disposition/role/status summary, tactical bars, capped trait chips, selection state, and required selectors.
- Avoid full stat blocks and repeated primary action lists by default.
- Keep contextual commands visible only when they are truly context-specific, such as quest, trade, recruit, loot, or scavenge.

### Intent menu and sheets

- Present valid primary intents and sub-actions for the current actor/target context.
- Use the same dispatcher for desktop popovers, mobile sheets, and later radial controls.
- Keep focus, viewport bounds, high-contrast, reduced-motion, and long-label behavior stable.

### Display map

- Supports planning, review, route hints, quest focus, discovered terrain, known POIs, and strategic inspection.
- Does not replace the 3x3 play surface for routine traversal.

## Safety and Accessibility Constraints

- Safe content tier remains the default presentation baseline.
- Controls must use labels, titles, aria labels, or equivalent accessible names.
- No hidden gesture may be the only path to a command.
- No color-only meaning.
- No destructive, irreversible, or high-impact action should dispatch from hover, long-press preview, or accidental focus.
- Selection and intent state should survive opening and closing inspection surfaces unless the underlying actor or target disappears.

## Deferred Implementation Notes

- This document is doctrine for later UI changes.
- Later implementation should add focused tests for mode switching, selection preservation, viewport bounds, action dispatch parity, and inspection close behavior.
- Desktop action menus should receive bounded popover behavior instead of reusing mobile-only positioning.
