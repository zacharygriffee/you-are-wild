# Mobile Interaction Flow V2 Decision

Status: **accepted 2026-07-23 — core flow and bounded public module slots
implemented; final verification pending**

This decision must precede a public mod UI-slot contract. A slot is a long-lived
placement promise; exposing one against the current phone shell would preserve
the present Party/Creatures switching friction and could let optional controls
obscure place actions such as Enter or Search.

## Evidence From The Current Shell

The current phone surface already has sound lower-level contracts:

- traversal, Scene Feed, presence, and command composition are distinct
  surfaces;
- tile/place actions live in `mobile-explore-actions`, not inside the Scene
  presentation;
- actor and target selection use the shared actor-target-intent grammar;
- horizontal belts have touch scrolling and explicit Details routes;
- the fixed dock exposes Holdings, Map, Party, and Creatures;
- dialogs and sheets provide focus trapping, opener restoration, inert
  background state, localization, reduced motion, and safe-area handling.

The unresolved information-architecture problem is above those primitives:

- Party and Creatures are separate dock destinations even though both answer
  “who is here and selectable?”;
- Here changes meaning between neutral creatures, enemies, remains, and items;
- opening a full party or creature panel competes visually with the command
  composer;
- place actions are correctly owned by the composer but can be hidden from the
  player's attention while a roster surface is open;
- combat must preserve current-turn ownership and explicit target selection,
  so an exploration-only drawer cannot become a second combat grammar.

## Options Considered

### A. Keep Separate Party And Creatures Drawers

This is the smallest change, but it retains the reported switching cost and
creates two sets of future contribution placements. It also makes mixed
party/neutral/enemy targeting harder to understand.

**Decision: reject.**

### B. Put Party, Here, And Place Actions In One Large Sheet

This makes everything discoverable in one destination, but duplicates or moves
the command composer into a modal surface. Structure actions would disappear
with the sheet and combat could develop a competing action path.

**Decision: reject.**

### C. Unified Roster Sheet Plus Persistent Context Composer

Replace the separate Party and Creatures dock routes with one **Roster** route.
The roster sheet uses state-aware tabs:

- exploration: **Party**, **Here**, and **Items** only when tile items exist;
- combat: **Allies** and **Enemies**, while current-turn ownership remains in
  the combat composer;
- remains use **Here** with an explicit Remains state rather than becoming a
  separate navigation model.

Place actions remain in the persistent context composer below the stage. Enter,
Exit, Search, Rest, Take Items, and future place verbs never move into the
roster. Selecting an actor or target collapses the roster to a compact summary,
returns focus to the relevant composer sentence/control, and preserves the
selection. Reopening the roster restores its last valid tab and scroll position.

**Decision: accepted.**

## Required V2 Behavior

1. The fixed phone dock has one Roster destination rather than separate Party
   and Creatures destinations. A badge communicates count and danger without
   changing the accessible name unpredictably.
2. Roster tabs are ordinary accessible tabs with one tab stop, arrow-key
   navigation, selected state, localized names, and associated tab panels.
3. The roster is a bounded bottom sheet on phones and may become a side drawer
   at wider responsive widths. It is one semantic surface across both layouts.
4. Opening the roster does not clear actors, targets, focused items, queued
   combat work, or the last location-action focus.
5. Choosing a unit collapses the sheet and restores focus to the composer or
   the control that opened it. A Details route may keep the sheet open.
6. The context composer reserves a visible Place group whenever any place
   command exists. Roster state cannot cover, duplicate, or own those commands.
7. Combat reuses the same roster shell but does not move intent confirmation,
   turn advancement, Cancel, or sub-action menus into it.
8. Existing file-origin behavior, safe-area spacing, 44px controls, 20px text
   pressure, reduced motion, high contrast, English/Spanish parity, and screen
   reader relationships remain regression gates.

## Stable UI Contribution Slots After Acceptance

The first public UI contribution contract should be declarative and bounded;
modules do not receive arbitrary DOM insertion.

| Slot | Purpose | Allowed contribution |
| --- | --- | --- |
| `composer.place.after` | Optional tile/structure affordances after core place commands | localized command descriptor |
| `roster.party.badges` | Read-only party unit state | localized bounded badge descriptor |
| `roster.here.badges` | Read-only local/target unit state | localized bounded badge descriptor |
| `roster.details.sections` | Optional detail disclosure below core unit facts | localized definition-list descriptor |
| `system.utilities` | Low-frequency module utility entry | localized command opening an owned dialog |

V1 must not offer dock-button, traversal-grid, Scene Feed, combat-confirmation,
or arbitrary-HTML slots. Core owns ordering, focus, visibility, content-policy
filtering, keyboard semantics, and responsive placement. Every contribution is
permissioned, namespaced, localized, bounded in count/text, removed on unload,
and invokes only an owned callback with a frozen public context.

## Acceptance Evidence Needed

- phone widths 313–430px, tablet, and narrow desktop;
- exploration with no creatures, mixed party/neutral targets, enemies,
  remains, tile items, and an enterable/searchable structure;
- combat on player and companion turns with one and many targets;
- sheet open/close, tab switching, selection collapse, focus restoration, and
  preserved actor/target state;
- English and Spanish at 12–20px, high contrast, reduced motion, keyboard, and
  screen-reader relationships;
- module contribution collision, policy visibility, callback context,
  save-independence, disable/unload, and file-origin tests.

The core Roster/composer flow now passes the 313–1365px viewport matrix,
combat-interaction browser suite, unit suite, English/Spanish parity, high
contrast, reduced motion, touch-target, focus, and horizontal-overflow gates.
A rendered 390×844 browser pass also verifies the Party/Here tab relationship,
bounded sheet, desktop fallback, and temporary-save cleanup. UI Contribution
V1 now exposes only the five accepted declarative slots with permission,
namespace, collision, bounded-context, escaping, unload, content-policy, and
file-origin acceptance. See [UI Contribution V1](ui-contribution-v1.md).
