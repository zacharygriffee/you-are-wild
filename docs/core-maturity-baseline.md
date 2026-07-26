# Core Maturity Baseline and Migration Ownership

Status: **Work Pack 0 complete**

This document records the persisted and runtime shapes that the Core Game
Maturity program must migrate deliberately. It is evidence, not a promise that
the current shape is the final contract.

## Compatibility baseline

| Domain | Current authoritative shape | Compatibility risk | Migration owner |
| --- | --- | --- | --- |
| Items | Inventory and equipment instances use unique `id` plus English `name`; definitions historically live in the `ITEMS` name map | Renaming/localizing definitions or disabling a provider can orphan instances | Item Registry V2 |
| Item definitions | Core definitions use stable `core:*` IDs and legacy name aliases; all active producers now persist `definitionId` while name-only saves migrate additively | Inactive foreign storage remains provider-owned opaque data until its normal load route | Item Registry V2 |
| Module items | `content:add_item` registers immutable owned definitions plus bounded existing merchant, loot, and search routes | Only the healing effect is actionable; every other definition must remain honest trade/quest/key data | Item Registry V2 module ownership |
| Quests | Quest Contract V2 records six canonical lifecycle states, bounded turn-in policy, giver identity/location, authored origin, destination, branch, reward state, and provider-safe saved data | Review Map V2 still needs a complete layer/tracking presentation | Quest Contract V2 |
| Quest objectives | Core and module quests use stable item identities and bounded objectives; authored templates may use a validated declarative stage graph | Locale coverage and Review Map V2 presentation remain cross-pack work | Quest Contract V2 |
| Map quest guidance | Review Map V2 has filtered objective, turn-in, giver, structure, danger, party, recovery, and POI layers; persisted quest tracking; bounded known-route guidance; operable known cells; an inspector; and responsive overlay/dock presentation | Map presentation remains read-only and deliberately does not reveal or materialize unknown world state | Review Map V2 |
| Companion behavior | Versioned per-unit `companionBehavior` with separate Duty, Stance, Control, and recruitment continuity; legacy fields remain compatibility mirrors | Optional AI control requires a registered bounded character controller and otherwise falls back deterministically | Companion Behavior V2 |
| Current duties | `guard`, `scout`, `support`, `gatherer` | Legacy generic companion maps to Scout; Healer and Scavenger migrate to Support and Gatherer | Duty migration complete |
| Current stances | `aggressive`, `balanced`, `defensive`, `passive` | Legacy Healer/Scavenger orders map to Balanced rather than remaining peer stances | Stance migration complete |
| Perks | Progression V2 resolves stable perk IDs through a bounded versioned effect registry while legacy saved names/descriptions remain compatibility input | A missing module provider must remain inert and recover on re-enable without corrupting selected state | Progression V2 |
| Perk presentation | The localized Perk Frontier renders only currently selectable choices and recomputes from saved progression facts | New eligibility/effect vocabulary remains bounded and versioned rather than executable module logic | Perk Frontier V2 |
| Merchants | Stock entries use instance-like ID, English item name, price, and quantity | Stock identity and module unload behavior depend on names | Item Registry V2 |

## Item compatibility fixture

`app/test/fixtures/core-maturity-item-registry-v2.json` captures:

- legacy name-only inventory and equipment;
- stable `definitionId` inventory and equipment;
- a saved instance whose provider is unavailable.

The fixture is intentionally not a complete save file. Existing public-save
and sparse-save fixtures continue to prove outer save transport. This fixture
isolates item identity so name compatibility and missing-provider handling can
be tested without coupling it to unrelated world state.

## Initial Item Registry V2 foundation

The first migration slice is additive:

- every core definition has a stable namespaced ID;
- legacy names remain aliases;
- item lookup prefers `definitionId` and falls back to the legacy name;
- unique instance `id` is never interpreted as definition identity;
- unknown provider identities remain unresolved rather than being
  reinterpreted as similarly named core content;
- registry definitions are immutable runtime data;
- inventory, equipment, merchant filtering/valuation, trade, and transaction
  presentation route through the registry lookup.
- item producers for search, corpse loot, quest rewards, merchant purchases,
  merchant resale, ground pickup, and loaded inventory/equipment add or
  preserve stable `definitionId`;
- module item definitions use the owner namespace and are removed/restored
  through disable/re-enable/delete lifecycle without deleting saved instances.

This completed work pack migrates legacy instances additively when they enter runtime.
Fungible core goods now consolidate into bounded quantity stacks while
equipment and unavailable-provider objects remain individual. Pack capacity
counts occupied stacks, healing and merchant sale consume one unit, and
matching active-quest requirements block ordinary sale/drop. It does not yet
rewrite inactive provider storage, enable placeholder effects, or add
unbounded item mechanics. Item Effects V1 owns the current healing mutation.
Module items can opt into bounded existing merchant tables, loot tables, and
the search pool; their placements unload with their provider. Quest Contract
V2 now supplies explicit protected quest/key acquisition routes without
turning those objects into ordinary market goods.

## Work Pack 1 gate evidence

- Every shipped core definition has an audited use, trade, quest, or key
  purpose plus an acquisition route.
- Inventory, equipment, search, loot, quest rewards, death bags, merchants,
  trade, and loaded ground items preserve stable definition identity.
- Legacy name-only fixtures migrate without item loss.
- Module install, acquisition, use, save/reload, disable, missing-provider,
  re-enable, and delete scenarios retain saved instances without making an
  unavailable provider executable or tradable.
- Inventory and trade viewport checks cover the required mobile and desktop
  surfaces.

## Work Pack 3 gate evidence

- Objective, turn-in, giver, structure, danger, dropped-party, recovery-bag,
  and other discovered POI layers are independently filterable and share one
  localized legend.
- Active quest tracking persists with quest save state and reports direction,
  Manhattan distance, next objective/turn-in, and a bounded route through
  already known passable tiles.
- Known tiles and explicitly known quest markers are keyboard-operable buttons;
  selection updates a localized inspector without granting remote actions.
- Zoom, pan, recenter, filter, selection, and tracking tests prove that the
  review surface does not materialize unrelated unknown world tiles.
- Direct browser verification covered the centered desktop overlay, optional
  440px side dock, and bounded internally scrolling mobile sheet at 390x844.
- The complete build, regression, lint, artifact, viewport, and interaction
  checks pass in both graphics-compatible map semantics.

## Work Pack 4 gate evidence

- Duty, Stance, and Control are separate persisted values with legacy
  normalization and explicit desktop/mobile management.
- Guard, Scout, Support, and Gatherer retain concrete deterministic benefits,
  tradeoffs, previews, and bounded Activity Log / Scene Feed evidence.
- Every Duty/Stance combination produces a stable legal candidate ranking.
  Manual and autonomous combat commands use the shared validator and
  dispatcher.
- Missing, failing, asynchronous, empty, or illegal provider choices fall
  back to deterministic autonomy without losing the turn.
- Recruitment continuity seeds initial behavior once. Drop-off, rejoin,
  defeat stranding, containment, binary saves, and sparse saves preserve the
  unit-owned behavior record.
- Traversal reactions are observations only, limited to one relevant
  autonomous companion per tile resolution and once per companion/tile/day.
  They never perform an implicit search, heal, loot, move, or time cost.

## Work Pack 5 gate evidence

- Progression V2 and the visible-only Perk Frontier are documented in
  `progression-v2.md`.
- Canonical tests cover level thresholds, XP payment boundaries, practice
  isolation, frontier visibility, built-in localization, effect
  apply/rollback, legacy normalization, save persistence, free confirmed
  alpha respec, cheat-only grants, and module
  install/disable/missing-provider lifecycle.
- Integrated starter-to-early-midgame balance and exact-worktree lifecycle
  acceptance are recorded in `core-maturity-acceptance.md`.

## Work Pack 6 gate evidence

- Progressive Tutorial V2 is documented in `progressive-tutorial-v2.md`.
- Canonical tests cover state-derived unlocks, hidden future lessons,
  persistent Read/New state, reset re-derivation, locale presentation, modal
  naming, focus isolation, and the replayable lesson index.
- Required viewport, keyboard, touch, enlarged-text, high-contrast,
  reduced-motion, and long-copy checks passed integrated acceptance as
  recorded in `core-maturity-acceptance.md`.

## Work Pack 0 fixture set

`app/test/fixtures/core-maturity-migration-baseline-v1.json` now records:

- Quest lifecycle: available, active, objectives complete, turn-in pending,
  reward claimed, containment/service suspension, and save/reload fields.
- Companion behavior: every current role/order, ID and legacy-name keying,
  drop-off, interior placement, and defeat stranding.
- Perks: selected numeric and named-effect perks, pending choices, respec
  refund count, and a species branch.
- Review Map: a known objective, known turn-in, unknown destination, and fog
  of war expressed by the explored-tile set.
- Merchant/module: refreshed stock, a sold stable item instance, enabled
  provider identity, and missing-provider identity.

The public `release-0.14.0-save.json` fixture and sparse-save round-trip tests
remain the outer save/reload transport evidence. The focused migration fixture
owns the contract inputs that later V2 adapters must consume.

## Work Pack 0 gate evidence

- The pre-contract full build, generated-artifact check, and full test suite
  were green.
- The additive registry contract and focused module lifecycle scenarios pass
  the core test suite.
- Add compatibility adapters in each owning work pack before replacing legacy
  values; the fixture alone is not evidence that a future schema migrates.
- Treat recruitment, module enable/disable/re-enable/delete, perk respec, and
  save/reload as behavioral scenarios, not merely fixture fields.

Each later schema change still requires its owning compatibility adapter or a
documented pre-release break before that work pack can close.
