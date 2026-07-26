# Progression V2

Status: **implemented; integrated acceptance complete**

Progression V2 keeps advancement deterministic and separates permanent power,
action practice, equipment, and authored techniques. An AI provider may choose
among legal actions, but it cannot grant XP, practice, levels, perks, items, or
techniques.

## Power curve

### Character XP and levels

- New characters begin at level 1 with `0/100` XP.
- Each threshold is the previous threshold multiplied by `1.5`, rounded down.
- A level grants `+10` maximum punishment, `+5` maximum spirit, `+1` to the
  existing action and attribute statistics, and one pending perk choice.
- XP is granted only by deterministic resolved mechanics: combat resolution,
  claimed quest rewards, and first-time recruitment.
- Rejoining a dropped-off or stranded companion does not grant recruitment XP.
- Quest rewards are guarded by `rewardClaimed`.
- Combat XP accumulates in the encounter ledger and is paid once when a living
  player receives a victory result. Flee, disengage, defeat, and a victory
  completed after the player's terminal defeat do not pay it.
- Tend/Feed XP uses restored-condition bands. Repeating it against a full target
  pays nothing, and self-targeting pays nothing.

### Practice

Multi-target Fight and Chew practice are separate saved progression tracks.
Each improves effect distribution only for its practiced action; neither
awards character XP nor silently improves unrelated actions. Practice is
charged once per committed actor command and uses bounded per-encounter
diminishing returns.

### Equipment and techniques

Equipment applies reversible definition-owned stat effects. Combat techniques
are bounded declarative profiles whose eligibility may depend on species,
abilities, flags, equipment slots, or equipment tags. They modify a legal
Fight resolution; they do not mutate XP or perk state. Removing the supplying
equipment or module removes future eligibility without rewriting prior
progress.

## Perk Frontier

The perk picker is a flat **current frontier**:

- it renders only choices that are selectable now;
- selected, incompatible, and locked future perks are absent;
- it recomputes after selection, level, practice, equipment, milestone, load,
  locale, and module changes;
- it explains why each visible choice is available without previewing the
  hidden catalog.

Built-in tree, perk, and description copy is resolved from the current locale.
Stable IDs and saved effect profiles remain language-neutral. A selected perk
therefore changes language with the interface instead of preserving English
copy as presentation truth.

## Perk Effects V2

Every selectable perk resolves to a versioned, serializable effect profile.
The current bounded vocabulary contains:

- numeric deltas to approved action, resource, and attribute keys;
- approved flags whose consumers are implemented in core.

Selection applies the profile once. Respec rolls back the saved profile rather
than looking up mutable current content. Legacy selected perks gain a profile
during normalization without applying their already-reflected bonus again.

Free respec remains an explicit confirmed alpha policy. Debug choice grants are
available only from the Cheats surface.

The former Human `Adaptable` INT-only increment was replaced for new
selections by `Flee +1` and `Feed +1`. INT currently lacks a distinct resolved
action consumer, so selling an INT-only perk would be a filler choice. Legacy
copies retain their saved INT effect and remain exactly reversible.

## Perk Profile V1 modules

Modules with `content:add_perk_profile` may register a namespaced, data-only
profile. Profiles:

- contain one to six namespaced perks;
- use only the core effect and eligibility vocabulary;
- may provide namespaced localization keys;
- cannot execute callbacks or award XP;
- are deep-frozen after validation.

Disabling a module removes its future frontier offers. Already-selected perks
keep their saved bounded effect profile and can still be rolled back. Missing
providers never delete or reinterpret selected progression.

## Deferred balance questions

- Attribute usefulness will be re-audited during the integrated starter-to-
  early-midgame balance run. INT remains a compatibility attribute, but no new
  perk currently asks the player to spend a choice on it.
- Respec cost remains free through alpha. A trainer, loyalty, or resource cost
  needs an economy that cannot trap experimental builds.
- Additional eligibility facts and effect kinds require a versioned core
  resolver and canonical scenarios before modules may use them.
