# Body Mass, Pieces, Regrowth, and Corpses V1 Decision

Status: mass, pieces, regrowth, corpse conversion, and consumption ledgers
implemented; permanent stat/maximum-Condition penalties remain behind the
balance gate

## Separate quantities

- **Condition / Punishment** measures ability to continue acting.
- **Vitality / body integrity** measures lasting physical integrity.
- **Strength and Constitution** measure capability.
- **Mass** measures conserved body quantity available for loss, regrowth,
  corpse yield, and consumption.

Strength is not mass. A strong small creature and a weak large creature must not
produce reversed corpse yields merely because of combat statistics.

## Body profile

A species or bounded body profile may define:

- maximum mass and minimum viable mass;
- renewable or nonrenewable piece behavior;
- allowed piece sizes as bounded percentages;
- stat and maximum-Punishment thresholds by remaining mass;
- regrowth trigger, time, and nutrition/resource cost;
- corpse conversion and decay;
- compatible medical restoration.

Mass uses integer units. Transfers, loss, regrowth, corpse creation, and
consumption are ledger transactions with a source, destination, reason, and
commit ID.

## Pieces

A piece records source identity, mass, body profile, and safe presentation. It
is not automatically a generic stackable item.

Removing a piece:

1. validates that the source can lose the requested mass;
2. commits vitality/condition damage separately;
3. reduces current mass;
4. recomputes bounded stat and maximum-Punishment penalties;
5. creates one piece or direct-consumption transfer;
6. emits one immutable outcome.

Renewable creatures may regrow toward maximum mass. Nonrenewable creatures need
medical restoration, an authored bounded effect, or a new body source; ordinary
rest does not restore mass.

## Corpses

Death converts remaining living mass into a corpse ledger. Corpse yield is not
derived from current HP. Loot remains a separate inventory/equipment system.

Scavenge and consumption spend corpse mass. Decay may reduce remaining mass or
convert it to a declared material profile. Depleted remains retain their
historical corpse identity until the existing cleanup policy removes them.

Containment and digestion use the same mass transactions but keep their
authoritative lifecycle records. They do not synthesize duplicate pieces.

## Compatibility

Older saves without mass receive deterministic profile defaults from stable
species and size facts. Migration must not immediately reduce existing stats or
Punishment. The initial normalized mass becomes the saved baseline, after which
V1 transactions apply.

The current `renewableBody`, `slurpable`, and `breakable` flags remain
compatibility inputs until equivalent body profiles exist.

## Balance gate

Before enabling permanent penalties in ordinary play, scenario tests must cover:

- small, ordinary, large, and unusual-body creatures;
- one piece, repeated pieces, regrowth, death, and corpse consumption;
- save/load at every transition;
- no mass duplication through release, reload, module removal, or corpse loot;
- scarce healing and medical restoration without unrecoverable early-game
  traps.
