# Feed Source Economy Decision

The operator accepted the recommended Tend boundary on 2026-07-23. Tend is now
condition-only care with bounded net-effect support XP. Resource Ledger V1 now
provides the renewable Nurse reserve described below.

## Historical problem proven by the pre-decision matrix

Before this decision was implemented, the neutral reference target reached full
condition from zero in three Tend commands. Each command also removed 25 hunger
from the target and granted 20 support XP, while the actor paid only one hunger
point and one command. Across the restoration that was 75 hunger relief and 60
XP without consuming food, condition, vitality, a renewable reserve, or an
item. The current matrix no longer has that behavior.

Offer Self and Offer Piece already identify a source. Nurse now exposes and
spends a renewable reserve in addition to its cooldown. Tend was the ambiguous
route: its name and presentation described care, while its former effect
supplied both medical recovery and nutrition.

## Recommended V1 distinction

| Variant | What it means | Source cost | Target result | XP boundary |
| --- | --- | --- | --- | --- |
| Tend | Care, first aid, grooming, or self-care | One command plus ordinary actor hunger; optional authored item later | Condition recovery only; no hunger relief | Reward meaningful net condition restored; no self-target farming |
| Nurse | Transfer renewable nourishment | Species-authored reserve plus cooldown and one command | Bounded condition and hunger relief proportional to reserve spent | One bounded reward per meaningful transfer |
| Offer Piece | Transfer renewable or sacrificed body mass | Existing condition/vitality cost, never below the source's survivable floor unless explicitly terminal | Recovery and hunger relief derived from mass actually spent | Reward the transfer once, not each recipient stat changed |
| Offer Self | Transfer the whole source | Source leaves ordinary play and enters recipient containment | Existing size/capacity/fullness/digestion lifecycle | Reward only after the authored transfer resolves |

The recommendation deliberately avoids a universal “Feed costs HP” rule.
Medical care is not food; actual nourishment must name the mass, reserve, item,
or whole creature being transferred.

## Accepted Tend implementation

1. Hunger and Spirit relief were removed from Tend while selected actor,
   selected target, self-care, committed failure, turn, and multi/group
   accounting were preserved.
2. Tend support XP is capped by meaningful net effect and a deterministic
   actor-target-variant context, so repeated no-op or self-care commands cannot
   farm rewards.
3. Only canonical resource/cooldown state persists. Module-owned variants must
   declare their source ledger and unload without leaving executable orphan
   behavior.

## Implemented nutritional refinement

1. Resource Ledger V1 adds bounded namespaced renewable reserves only for
   eligible units. Legacy saves normalize to no reserve rather than gaining a
   free capability.
2. Nurse spends one `core:nurse` charge, derives its recovery from the amount
   actually spent, exposes the current/maximum reserve in previews, and retains
   its independent cooldown.
3. Offer Piece continues to derive output from condition actually spent. A
   future authored mass ledger may replace that condition proxy without
   changing the Feed role contract.

## Alternatives not recommended

- **Keep the former Tend:** simplest, but would preserve free nutrition and
  repeatable support XP.
- **Charge condition for every Feed route:** easy to calculate, but makes
  ordinary care semantically equivalent to sacrificing body mass and makes
  self-care either useless or exploitable.
- **Add one universal mana/stamina resource:** broadens the economy beyond the
  stated balance scope and burdens every save, unit, UI, and module.

## Operator decision

Decision: accepted the recommended care-versus-nutrition distinction for Tend.
