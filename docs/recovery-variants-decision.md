# Later Recovery Variants Decision

Recovery Mode V1 is sufficient for alternate **profiles** that combine the
existing safe anchor, inventory policies, ethereal journey, restrictions, and
resurrection vitality. The optional
[Waystone Recovery](../optional-mods/you-are-wild-waystone-recovery.yawmod.json)
fixture proves that a locally retained module can add such a mode without
forking defeat code. It leaves a death bag, starts at the defeat site, permits
only ethereal travel back to the established safe place, and revives at 25%
vitality. It remains disabled until the player installs and enables it.

## What V1 can express

- immediate return to the established safe anchor;
- a defeat-site pilgrimage to that same anchor;
- settings-driven, retained, or death-bag inventory consequences;
- normal or ethereal traversal;
- bounded living-action restrictions; and
- resurrection vitality from 1% through 100%.

These are profile differences. Core still owns fatal-state detection, companion
battle settlement, bag creation, movement, save state, Hardcore deletion, and
resurrection.

## What V1 intentionally cannot express

The following ideas remain later Recovery V2 candidates because they need
mechanics that the current declarative profile does not own:

- surviving companions extract the player after battle;
- a healer or faction charges coin, creates debt, or assigns an obligation;
- resurrection occurs at a named authored shrine other than the established
  safe anchor;
- a prior body or death bag becomes a durable map landmark; and
- spectral abilities or interactions become available during a journey.

Do not approximate these with module hooks, narration, arbitrary callbacks, or
post-defeat state mutation. Companion extraction needs an explicit
post-settlement resolver. Costs and obligations need bounded declarative
consequence fields. Authored destinations depend on the accepted content
placement recipe. Spectral abilities need a separately authorized capability
contract.

## V2 gate

Only extend Recovery Mode when one of those variants is selected for
implementation. The extension must remain declarative, migrate full and sparse
saves, define missing-owner fallback, preserve Hardcore, settle companions
before recovery, and work from `file://`. Until then, V1 plus optional profiles
is the complete supported boundary.
