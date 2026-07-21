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
| Niche explicit themes and fetish-specific mechanics | Dedicated optional mod | Do not add core toggles or advertise them through the generic first-party provider. The mod owns its namespaced settings; installation, enablement, category opt-in, and any mod-authored toggle remain explicit player choices. |
| Accessibility, localization, difficulty, party rules | Core system | Never gate behind content posture. |

Ambiguous mechanics are classified by what their rules reward and require, not
only by prose. A neutral rule can stay in core while an explicit provider adds a
different presentation or a specialized variant.

## Policy Contract

The current versioned policy is:

```js
{
  policyVersion: 2,
  posture: 'sfw',
  enabledCategories: [],
  gameplayVariants: {}
}
```

Legacy `maxTier`, `voreEnabled`, `explicitDescriptions`, anatomy fields, and
selected runtime setting keys remain readable for existing saves. They are
compatibility inputs, not an authoring API. New modules declare categories,
variants, settings, creation options, and action variants through their owned
manifest/API contracts. Compatibility adapters must never silently enable a
newly installed provider.

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

An optional declaration (`"required": false`) exposes a player-controlled
category but does not block the provider itself from enabling. Provider authors
must not describe all of a module as category-gated when only an optional
adult-tier template depends on that category. The module's `contentRating`
still sets its whole-package SFW/Mature enablement floor.

Installing a rated module does not make its specialized mechanics part of the
core settings schema. A module that needs finer consent controls declares its
own bounded settings in its manifest. Those values remain owned and persisted
under the module id and are removed with the module rather than migrating into
global game settings.

## Stability Rules

1. Do not rebalance a mechanic while moving its content ownership.
2. Do not delete or rename a serialized field in the policy migration.
3. Add new policy fields before changing UI consumers.
4. Keep old `adult` manifests loadable as a deprecated explicit-provider alias,
   but author new modules as `safe` or `mature` plus explicit categories.
5. Mod contributions must be owned and removable on disable, reload, or delete.
6. Core default templates must always produce readable SFW output without a
   mod; this does not make an otherwise unreachable module-only template path a
   supported integration seam.
7. Generated artifact audits distinguish allowed classification metadata and
   compatibility identifiers from bundled explicit presentation.

## Current Boundary

The provider migration is complete: Settings owns SFW/Mature posture, installed
modules supply dynamic categories/variants, explicit providers are separate
packages, and the default generated HTML contains no optional explicit package.
The remaining legacy adapters exist only for save and old-package compatibility.
They may be retired only with a documented deprecation window, migration tests,
and a release note. Historical migration phases are not current doctrine.
