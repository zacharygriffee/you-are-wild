# Interaction Balance Matrix V2

`YAW_BALANCE_SYSTEM.interactionMatrix(App)` is the machine-readable inventory of
current interaction costs and effects. This document explains how to use it; it
does not authorize retuning the values it reports.

## Accounting rules

- A command that is blocked during selection costs no resource and no turn.
- A physically meaningful attempt that reaches resolution commits the turn and
  pays its actor cost even when it fails.
- One-to-many commands charge the actor once, not once per target.
- Many-to-one and mutual commands charge every committed participant once.
- Higher hunger means hungrier. Condition (`CPun`), Spirit (`CPle`), containment
  vitality, cooldowns, XP, practice, elapsed time, and turn commitment are
  separate ledgers.

## Current primary commands

| Public action | Internal key | Actor hunger | Principal target effect | Conditional reward |
| --- | --- | ---: | --- | --- |
| Fight | `fight` | 3 | Condition damage; multi-target effect is practice-scaled | 50 XP on enemy defeat; multi-Fight practice |
| Talk | `flirt` | 1 | Spirit `floor(charm × 0.3)` and Fight -1 on success | 50 XP on enemy social resolution |
| Play | `fuck` | 4 | Spirit `floor(charm × 0.5)` on success | 50 XP on enemy social resolution |
| Feed | `feed` | 1 | Tend restores Condition `floor(Feed × 2)` only | Support XP follows net Condition bands; at most 20 across one full allied target pool; none for self-care |
| Feast | `feast` | 2 | Variant-defined containment or vitality result; core Chew spends all remaining Vitality and leaves recoverable remains | 75 XP on enemy consumption |
| Flee | `flee` | 3 | Safe adjacent relocation on success | None |

The runtime matrix contains the formulas, ownership, shape policy, and current
Feed/Feast variant rows. Tests must change with any contract change.

## Fight technique accounting

The schema-v3 matrix includes Basic Attack and every currently registered
Combat Technique V1 profile. A technique declares its command-specific reach,
equipment requirements, damage shaping, target cap, split/full distribution,
recovery, and optional status. Every technique currently pays the ordinary
Fight hunger cost once per committed actor command; Combat Technique V1 does
not add a hidden per-target cost or variant surcharge.

## World-clock policy

Turn commitment and elapsed world time are separate ledgers. Fight, Talk, Play,
Feed, Feast, and Flee currently advance the combat/adventure command flow but
add zero hours to the world clock. Travel uses its authored traversal cost,
Search advances one hour, and Rest advances eight hours. A future action may
declare a different elapsed-time cost, but it must do so explicitly rather than
inheriting turn commitment as time.

## Hunger combat pressure

Hunger affects combat performance without changing Constitution or maximum
condition. At hunger 70–84, action ratings and initiative use `0.9x` and Flee
loses five percentage points. At hunger 85–100, action ratings use `0.75x`,
initiative uses `0.8x`, and Flee loses fifteen percentage points. Tactical
cards expose the active band and exact action penalty. This is a universal
living-unit rule rather than a player-only handicap.

## Feed source ownership

The accepted Tend boundary and remaining nutritional variants are:

- Tend charges the actor's ordinary Feed hunger cost and restores target
  condition only. It does not reduce target hunger or raise Spirit.
- Tend support XP is derived from the target condition bands actually crossed.
  A complete allied target pool is worth at most the configured 20-XP support
  cap; partial restoration earns only its share, and self/no-op Tend earns zero.
- Nurse spends one `core:nurse` Resource Ledger V1 charge plus a three-step
  lactation cooldown. The preview exposes the current/maximum reserve.
- Offer Whole transfers the source into the recipient's containment and applies
  size-based fullness.
- Offer Piece spends `max(2, floor(MPun × 0.15))` source condition before the
  recipient receives recovery and hunger relief.

An unspecified Feed command is Tend in both single and group forms. Whole-self
transfer is never inferred from selecting companions: it requires the explicit
Offer Self variant and a source with authored `livestock` or `willingPrey`
state. Group Offer Self and Nurse evaluate sources in selected order, apply only
eligible actor-to-recipient pairs, and re-evaluate bounded capacity or cooldown
state as each pair resolves. Ineligible or over-capacity sources remain in play
and the resulting Scene outcome explains the resolved and failed pairs.

These are not yet a complete universal Feed economy. The condition-only Tend
choice and renewable Nurse reserve are active. New nutrition-bearing variants
must still declare what the source gives; they may not create free nourishment
by omitting ownership. The decision and implemented ledger boundary are
recorded in `docs/feed-source-economy-decision.md`.

## Digestion pacing

Passive stomach digestion uses a base 5% tick or the 2% slow-digestion tick.
The holder's hunger applies a bounded multiplier: `0.8x` at hunger 25 or below,
`1x` through ordinary hunger, `1.2x` at hunger 70–84, and a capped `1.4x` at
hunger 85 or above. Each tick re-evaluates the band after nutrition relief, so
the rate falls back naturally as the holder becomes sated. The current pace and
effective rate are visible in Containers. Both base modes preserve the same
size-scaled total nutrition, and urgent slow digestion remains below ordinary
fast digestion.

## Verification boundary

Executable scenarios cover matrix schema/resource ownership, Fight technique
cost/effect declarations, the explicit world-clock policy, selected-target
combat Feed, species-derived livestock willingness, ordinary-prey refusal,
renewable-piece condition cost, Nurse cooldown distribution, Offer Self
containment/removal, sequential group capacity, support reach across either
combat side, durable Scene outcomes, command-level multi-target costs,
participant-level mutual costs, rest/digestion pacing, bounded hunger-rate
bands, total-nutrition parity, and multi-Fight practice. Operator review is
still required before choosing new variant-specific Feed source costs.

The schema-v2 deterministic baseline also emits a neutral 100-point interaction
reference: effect per command, expected commands to resolution, current XP
across that resolution, and one-, two-, and four-target Fight values at every
practice tier plus an authored full-area technique. A complete allied Tend
restoration now totals at most 20 support XP regardless of the number of
commands required.
