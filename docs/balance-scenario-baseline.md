# Balance Scenario Baseline

This is the deterministic V1 acceptance table emitted by
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
