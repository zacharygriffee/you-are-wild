# Balance Scenario Baseline

This is the deterministic V1 acceptance table emitted by schema version 2 of
`YAW_BALANCE_SYSTEM.scenarioBaseline()`. It documents the current numbers rather
than silently retuning them. Higher hunger means more hungry; all examples begin
at `0` hunger unless stated otherwise.

## Survival pressure

| Repeated command | Hunger per command | Commands to Hungry (70) | Commands to Starving (85) |
| --- | ---: | ---: | ---: |
| Move | 1 | 70 | 85 |
| Search | 1 | 70 | 85 |
| Talk | 1 | 70 | 85 |
| Feed | 1 | 70 | 85 |
| Feast contact | 2 | 35 | 43 |
| Fight | 3 | 24 | 29 |
| Flee | 3 | 24 | 29 |
| Play | 4 | 18 | 22 |

An empty eight-hour rest adds 8 hunger. Nine consecutive empty rests (72
hours) cross Hungry. Rest is healing and elapsed time, not food.

## Containment nutrition

Stomach entry provides immediate fullness of `3 × prey size`, capped at 20.
Digestion provides total relief of `15 × prey size`, capped at 100. Fast and
slow digestion change delivery time, not total nutrition.

| Prey size | Immediate fullness | Total nutrition | Fast ticks (5%) | Slow ticks (2%) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | 15 | 20 | 50 |
| 3 | 9 | 45 | 20 | 50 |
| 6 | 18 | 90 | 20 | 50 |

One rest advances eight digestion ticks. A size-3 fast meal advances 40% and
delivers 18 hunger relief, producing a net rest change of -10 after the rest's
8 hunger pressure. The slow version advances 16% and delivers 7, producing a
net +1. Both still deliver 45 total when complete.

## Standard interaction reference

These measurements use a neutral 100-point target, zero variance, 40
pre-spread Fight damage, successful Talk/Play charm of 40, and Feed 20. The
attempt is assumed eligible and in reach; resistance, terrain, capacity, and
source-specific variant costs remain separate scenario dimensions. Ordinary
interactions currently consume no world-clock hours.

| Action | Ledger/effect per command | Commands to reference resolution | XP across reference resolution |
| --- | --- | ---: | ---: |
| Fight | 40 Condition damage | 3 | 50 once on defeat |
| Talk | 12 Spirit toward the 85 threshold | 8 | 50 once on social resolution |
| Play | 20 Spirit toward the 85 threshold | 5 | 50 once on social resolution |
| Feed/Tend | 40 Condition recovery; no Hunger or Spirit change | 3 | 20 maximum across one full allied target pool |
| Feast | Variant-defined containment or terminal state | 1 successful attempt | 75 once on consumption |
| Flee | Safe-adjacent relocation | 1 successful attempt | 0 |

Tend XP follows net Condition reward bands instead of paying a flat reward per
command. Partial restoration earns only the bands crossed; restoring one full
allied target pool is capped at 20 XP, while self-care and no-op Tend award
none. Nutrition remains exclusive to variants with an explicit source.

## Multi-target Fight reference

Per-target values below start from the same 40-damage single-target reference.
`Commands` means symmetric commands required to resolve each 100-Condition
target. Total command cost is still charged once to the actor.

| Practice tier (XP) | 2 targets: effect / commands | 4 targets: effect / commands |
| --- | ---: | ---: |
| Novice (0) | 20 / 5 | 10 / 10 |
| Practiced (20) | 22 / 5 | 13 / 8 |
| Skilled (60) | 26 / 4 | 19 / 6 |
| Expert (120) | 32 / 4 | 28 / 4 |
| Master (200) | 40 / 3 | 40 / 3 |
| Authored full-area technique | 40 / 3 | 40 / 3 |

The executable baseline cross-checks every ordinary tier against
`YAW_MULTI_INTERACTION.effect()` so the report cannot drift silently from
runtime scaling.

## Interaction and reward invariants

- One command charges each participating actor once, never once per target.
- Novice multi-target Fight starts at `1 / target count` contribution per
  target. Practice and authored area techniques recover contribution without
  multiplying ordinary single-target damage.
- Practice is awarded once per completed command and diminishes within the same
  encounter context.
- Talk, Play, and Fight enemy resolutions retain baseline XP parity; their
  consequences and follow-up opportunities differ.
- Spirit breakthrough occurs at 85% and resets current Spirit to 20% while
  making recruitment explicitly available rather than automatic.

The executable tests remain authoritative. If a future balance change alters
these values, update `scenarioBaseline()`, the scenario tests, this table, and
`docs/balance-cost-doctrine.md` in the same change.
