# Ghost Recovery — Pre-Publish Decision

Status: **product conversation required before the next Sites publication**

Recovery Mode V1 already contains a bounded `core:ghost` journey. A defeated
player rises at the defeat site, pays the configured inventory consequence
once, travels cardinally without ordinary encounters or hunger, cannot use
living-world combat, inventory, interaction, recruitment, or structure
commands, and resurrects at the validated safe anchor.

That implementation is deliberately conservative. It proves persistence,
unload fallback, reachable recovery, and non-repeating consequences, but it
does not settle the player-facing fantasy or economy.

## Decisions To Make

1. **Where resurrection happens**
   - keep the current home/safe-anchor destination;
   - use authored world shrines;
   - or allow either, with the nearest reachable valid destination chosen
     deterministically.
2. **How Ghost mode is entered**
   - selected in Game Mode before defeat;
   - chosen from the ordinary defeat prompt;
   - or offered only when a qualifying shrine, perk, or item exists.
3. **What happens to companions**
   - preserve the existing terminal battle settlement and leave surviving
     companions at the defeat tile;
   - allow a limited spectral view of their outcome;
   - never teleport or revive them merely because the player resurrects.
4. **Inventory consequence**
   - retain inventory;
   - create the existing death bag;
   - or defer to the regular-mode inventory setting.
5. **Ghost agency**
   - traversal only;
   - optional read-only inspection and Scene history;
   - or a small, explicitly authored spectral ability set.
   Ordinary combat, containment, trade, quests, recruitment, and structure
   use should remain blocked unless deliberately redesigned.
6. **Resurrection cost**
   - free but inconvenient travel;
   - time, condition, item, currency, or faction cost;
   - or a cost supplied by a bounded recovery profile.
7. **Encounter communication**
   - Ghost travel currently suppresses ordinary encounters. The UI and Scene
     Feed must make that state explicit so a nearby Hostile does not look like
     a failed combat trigger.
8. **Failure safety**
   - every chosen destination must be reachable under spectral traversal;
   - unavailable module-owned recovery must continue to fall back to ordinary
     recovery;
   - save/load must resume the journey without charging consequences twice.

## Recommended Conversation Baseline

Keep the current mechanics as the safe technical baseline while deciding the
fantasy: Ghost is opt-in, consequences occur once, companions are resolved by
the battle rather than teleported, and resurrection can never depend on an
unreachable destination. The open questions are destination identity, access
to the mode, player agency during the journey, and resurrection cost.

No answer in this document authorizes a version bump, commit, push, or Sites
publication.
