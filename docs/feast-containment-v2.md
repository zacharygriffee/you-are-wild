# Feast / Containment V2 Doctrine

V2 hardens Feast around containment lifecycle, vital damage, and corpse/remains scavenging. Core Feast should not model chewed creature pieces as inventory items. Itemized fragments, butchering, crafting materials, and creature-meat stacks are future or modded extensions, not the default model for the first public release.

## Locked V2 Decisions

These decisions are settled for V2 implementation unless a later explicit mechanics pass reopens them:

- Living containment uses Vital Pool / Vital Integrity.
- Corpses and remains use Remains Pool / edible mass.
- Core does not create inventory "pieces of creature".
- Butchering and itemized portions are future or modded, not first public release behavior.
- Regular damage and vital damage are separate tracks.
- Fight damage is regular damage by default.
- Digestion, chew, slurp, and fragment can apply vital damage.
- Vital damage usually also reduces current punishment/condition.
- Ordinary current-punishment damage does not automatically reduce vital integrity.
- `vitalMax` is the target's current `CPun` at capture or first containment normalization time.
- `swallow` / `ingest` creates intact containment.
- `swallow` does little or no immediate vital damage by default.
- Digestion ticks reduce `vitalRemaining` over time.
- `chew` is a progressive attack that applies equal immediate Vitality and
  current-condition damage.
- `slurp` / `fragment` use vital-damage semantics for explicit slurpable, breakable, or divisible targets.
- Release is possible while `vitalRemaining > 0`.
- Release is not a full undo; the target returns weakened or reduced.
- `vitalRemaining <= 0` blocks ordinary release.
- Permanent stat absorption is not default.
- Hunger relief, healing, and temporary effects are allowed; permanent stat gain belongs to perks, traits, mods, or future authored mechanics.
- Stomach is the default core container.
- Other containers remain existing compatibility/content-tier gated surfaces, not expanded core V2 behavior.
- Nested containment is compatibility and persistence only for now; do not deeply simulate it in V2.
- Pass-through / all-the-way-through is not default safe/core behavior.
- Scene Feed should emit meaningful containment milestones, not every digestion tick.
- Corpse scavenge consumes Remains Pool, not Vital Pool.
- Corpse/remains are not releasable living targets.
- Scavenge does not create itemized creature pieces.

## Damage Tracks

Feast uses two related but distinct living-creature damage tracks:

- Regular damage: current condition / punishment damage. Normal `Fight` changes this track unless a mechanic explicitly says otherwise.
- Vital damage: reduction of a creature's recoverable vitality. Containment and digestion-style mechanics use this track.

Vital damage can also reduce current condition, but regular damage does not automatically reduce vital integrity. A creature can be injured without losing recoverable vitality. A contained or reduced creature can lose vitality without mutating every visible stat on every tick.

Corpses and remains are separate from living Vital Pool records. They use Remains Pool, not Vital Pool, because normal release/recovery no longer applies.

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

For V2, `vitalMax` defaults to the target's current `CPun` when containment or first vital-damage normalization happens, and `vitalRemaining` starts from that captured value. Do not derive V2 default vitality from full `MPun`, total stat sum, size, or a new species vitality value yet.

`originalStats` is the vital profile at capture or first vital-damage normalization. `statDrain` is a ledger for derived weakness or future mod rules; visible stats should not be directly mutated on every digestion tick by default.

## Remains State

Corpse/remains records should normalize these neutral fields while preserving current compatibility fields such as `remainingPortions`:

```js
{
  kind: "remains",
  corpseOf,
  species,
  displayName,
  size,
  edibleMax,
  edibleRemaining,
  portionsRemaining,
  decayTurns,
  source: "fight" | "digestion" | "chew" | "scavenge",
  depleted
}
```

`remainingPortions` remains a compatibility/UI alias for finite edible mass. Scavenge consumes Remains Pool. It does not create itemized creature pieces in core.

## Verb Doctrine

- `swallow` / `ingest`: places an intact target into a container. It should do little or no immediate vital damage by default. Digestion ticks later reduce `vitalRemaining`. Release is possible while `vitalRemaining > 0`.
- `chew`: applies one Feas-based attack's damage equally to Vitality and
  current condition. It does not automatically spend the full Vital Pool,
  heal the attacker, relieve hunger, or grant consumption credit. If either
  track reaches zero, the target becomes recoverable remains. A non-party
  exploration survivor flees to an adjacent valid tile or becomes hostile and
  enters combat. Core does not create creature-piece inventory items.
- `slurp` / `fragment`: applies vital damage to divisible or soft targets. The target can remain active, weakened, or depleted. Core should not create itemized fragments.
- `release`: returns a contained creature when `vitalRemaining > 0`, at reduced condition and possibly with Vital Weakness. Release is not a full undo.
- `terminal digestion` / `depletion`: occurs when `vitalRemaining <= 0` or containment progress reaches terminal threshold. Ordinary release is no longer available unless a future mechanic or mod says otherwise.
- `scavenge`: consumes finite Remains Pool from corpse/remains objects. It can relieve hunger or heal through existing rules, but it should not grant permanent stat gain or generate inventory portions.

## Presentation And Content Tiers

Mechanical state stays neutral and content-tier independent. Scene Feed and content templates own wording. Safe/default presentation should use abstract terms such as vitality, contained, weakened, released, reduced, and depleted.

## Mod Seams

Future mods may provide itemized portions through hooks such as `onVitalPortionCreated(prey, amount, context)`, but the core model remains state-based:

- containment records
- vital damage
- remains pool
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
