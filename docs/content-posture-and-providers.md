# Content Posture And Optional Providers

## Decision

You Are Wild is an adult-audience creature RPG that supports a non-explicit
default posture. Creature consumption, containment, digestion, release, body
size, appetite, transformation, combat, social interaction, and recruitment are
part of the core game. Their presence does not by itself make the game explicit.

Core supports two presentation postures:

- `sfw`: non-explicit fantasy presentation and neutral mechanical wording.
- `mature`: stronger violence, horror, coercion warnings, and consequences,
  without explicit sexual material.

Explicit sexual presentation and sexually framed mechanics are supplied by
optional mods. They are not bundled into the default playable HTML.

Audience and content posture are separate. `sfw` is not a representation that
the game is intended for children.

## Ownership Matrix

| Surface | Owner | Migration rule |
| --- | --- | --- |
| Eat, swallow, stomach containment, digestion, release | Core SFW | Preserve action IDs and outcomes; use neutral default templates. |
| Fatal outcomes, chewing, bone damage, coercion warnings | Core Mature or optional rules | Preserve calculations; posture controls presentation and warnings. |
| Slow digestion, endo behavior, stat absorption, pass-through | Gameplay variants | Keep legacy setting keys as adapters until saves migrate. |
| Power dynamics and forced feeding | Mature category/variant | Keep nonsexual mechanics possible; explicit framing belongs to a provider. |
| Explicit descriptions and sexually framed narrative | Explicit provider | Keep provider text outside the default artifact and verify parity through the optional-package browser flow. |
| Sexual anatomy and anatomy-specific routes | Explicit provider | Preserve legacy save fields; provider owns new UI, labels, and options. |
| Sexual physiology, fluids, refractory behavior | Explicit provider | Provider setting may adapt a legacy mechanic key during compatibility. |
| Accessibility, localization, difficulty, party rules | Core system | Never gate behind content posture. |

Ambiguous mechanics are classified by what their rules reward and require, not
only by prose. A neutral rule can stay in core while an explicit provider adds a
different presentation or a specialized variant.

## Policy Contract

The versioned policy is additive during migration:

```js
{
  policyVersion: 2,
  posture: 'sfw',
  enabledCategories: [],
  gameplayVariants: {}
}
```

Legacy `maxTier`, `voreEnabled`, `explicitDescriptions`, anatomy fields, and
runtime setting keys remain readable. Compatibility adapters must not silently
enable a newly installed explicit provider.

## Provider Contract

Mods declare stable category and variant IDs in their manifest. Canonical IDs
deduplicate across providers. A provider can supply localized metadata, but it
cannot weaken the active posture or enable its own category.

```json
{
  "contentRating": "mature",
  "contentCategories": [
    {
      "id": "explicit.sexual",
      "label": "Explicit sexual content",
      "description": "Sexually explicit presentation and mechanics."
    }
  ],
  "gameplayVariants": [
    {
      "id": "expanded-body-simulation",
      "label": "Expanded body simulation",
      "default": false
    }
  ]
}
```

Provider categories default off. Installed providers may advertise categories
in Settings, but module enablement remains blocked until every required category
is enabled. Disabling a category unloads dependent modules through the normal
module lifecycle.

## Stability Rules

1. Do not rebalance a mechanic while moving its content ownership.
2. Do not delete or rename a serialized field in the policy migration.
3. Add new policy fields before changing UI consumers.
4. Keep old `adult` manifests loadable as a deprecated explicit-provider alias.
5. Mod contributions must be owned and removable on disable, reload, or delete.
6. Default templates must always produce readable SFW output without a mod.
7. Generated artifact audits distinguish allowed classification metadata and
   compatibility identifiers from bundled explicit presentation.

## Release Gates

Gates 1-5 are implemented for the initial provider migration. Compatibility
adapters remain intentionally active under gate 6.

1. Freeze behavior and legacy save fixtures.
2. Ship the additive policy and provider registry with legacy UI compatibility.
3. Switch Settings to SFW/Mature posture plus dynamic categories and variants.
4. Validate a separately distributed first-party explicit provider.
5. Remove bundled explicit providers from the default HTML.
6. Retire compatibility adapters only after a documented deprecation window.
