# Feast / Containment V2 Doctrine

V2 hardens Feast around containment lifecycle and vital damage. Core Feast should not model chewed creature pieces as inventory items. Itemized fragments, butchering, crafting materials, and creature-meat stacks are future or modded extensions, not the default model for the first public release.

## Damage Tracks

Feast uses two related but distinct damage tracks:

- Regular damage: current condition / punishment damage. Normal `Fight` changes this track unless a mechanic explicitly says otherwise.
- Vital damage: reduction of a creature's recoverable vitality. Containment and digestion-style mechanics use this track.

Vital damage can also reduce current condition, but regular damage does not automatically reduce vital integrity. A creature can be injured without losing recoverable vitality. A contained or reduced creature can lose vitality without mutating every visible stat on every tick.

## Vital State

Containment records and vital-damage targets should normalize these neutral fields:

```js
{
  unitRef,
  container,
  state: "contained" | "digesting" | "released" | "digested" | "depleted",
  sourceAction: "swallow" | "chew" | "slurp" | "fragment" | "digest",
  capturedPun,
  vitalRemaining,
  vitalMax,
  vitalDamageTaken,
  originalStats: {
    Figh, Feas, Flir, Fuck, Flee, Feed,
    str, con, spd, int, wis, cha
  },
  statDrain,
  contentTierMetadata,
  createdAtTurn,
  updatedAtTurn
}
```

`originalStats` is the vital profile at capture or first vital-damage normalization. `statDrain` is a ledger for derived weakness or future mod rules; visible stats should not be directly mutated on every digestion tick by default.

## Verb Doctrine

- `swallow` / `ingest`: places an intact target into a container. It should do little or no immediate vital damage by default. Digestion ticks later reduce `vitalRemaining`. Release is possible while `vitalRemaining > 0`.
- `chew`: applies immediate vital damage. It may defeat or deplete the target, but core should not create creature-piece inventory items.
- `slurp` / `fragment`: applies vital damage to divisible or soft targets. The target can remain active, weakened, or depleted. Core should not create itemized fragments.
- `release`: returns a contained creature when `vitalRemaining > 0`, at reduced condition and possibly with Vital Weakness. Release is not a full undo.
- `terminal digestion` / `depletion`: occurs when `vitalRemaining <= 0` or containment progress reaches terminal threshold. Ordinary release is no longer available unless a future mechanic or mod says otherwise.

## Presentation And Content Tiers

Mechanical state stays neutral and content-tier independent. Scene Feed and content templates own wording. Safe/default presentation should use abstract terms such as vitality, contained, weakened, released, reduced, and depleted.

## Mod Seams

Future mods may provide itemized portions through hooks such as `onVitalPortionCreated(prey, amount, context)`, but the core model remains state-based:

- containment records
- vital damage
- release state
- depleted / terminal state
- conservative hunger, healing, XP, or temporary effects

Permanent stat absorption is not default. It belongs in perks, rare traits, authored rewards, settings, or mods.

## Non-Goals

- No butchering system.
- No creature-piece inventory items in core.
- No creature-meat stack items in core.
- No crafting from creature pieces.
- No permanent stat absorption by default.
- No broad container redesign.
- No pass-through/all-the-way-through expansion.
- No combat row changes.
- No broad Feast economy rebalance.
