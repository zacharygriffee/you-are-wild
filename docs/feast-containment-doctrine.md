# Feast / Containment Doctrine

Feast is a structured containment lifecycle, not a one-off consume action. The V1 system keeps existing `stomach` and prey fields through a compatibility adapter while adding neutral containment metadata that later verbs, containers, mods, and Scene Feed templates can share.

## Core Model

Feast is three linked systems:

- Body/container state: where a contained creature is held, how much capacity is used, and which profile controls ticking, release, and terminal outcomes.
- Contained creature lifecycle: whether the contained creature is intact, digesting, releasable, terminal, released, or passed.
- Assimilation/stat transfer: conservative hunger relief, healing, or temporary effects from terminal digestion.

Containment data must stay neutral and content-tier safe. Core state should describe facts such as holder, contained creature, container, progress, vital integrity, release eligibility, and temporary effects. Scene Feed owns player-facing wording and chooses safe/default presentation from templates.

V1 does not perform a broad save/schema rewrite. It normalizes current `stomach`, `womb`, `balls`, `inStomach`, `digestionProgress`, `digestionState`, and `statDrain` fields into the V1 shape at runtime and preserves those fields for compatibility.

V2 builds on this adapter with a two-track damage model. Regular damage affects current punishment/condition. Vital damage affects recoverable vitality and release outcomes. Core does not create itemized creature-piece inventory for chew, slurp, or fragment; those are future/modded extensions. See [Feast / Containment V2 Doctrine](feast-containment-v2.md).

## V1 Containment Record

Existing prey snapshots should normalize to this shape:

```js
{
  holderId,
  containedId,
  containerId: "stomach",
  entryVerb: "swallow",
  state: "contained" | "digesting" | "terminal" | "released" | "passed",
  integrity: "intact" | "damaged" | "fragmented" | "portions",
  progress,
  capturedPun,
  vitalRemaining,
  vitalMax,
  vitalDamageTaken,
  originalStats,
  releaseEligible,
  digestionRate,
  absorptionRate,
  temporaryStatEffects,
  modifiers,
  tags
}
```

V1 defaults:

- `swallow` creates `integrity: "intact"`.
- Intact contained creatures remain releasable until terminal digestion.
- Terminal digestion occurs when `progress >= 100`, contained condition reaches zero, or `vitalRemaining <= 0`.
- Release is command-driven only; auto-escape is deferred.
- Terminal digestion creates no remains or loot by default.
- Temporary stat effects are supported by schema, but default V1 mostly grants hunger relief, healing, and conservative temporary boosts.
- Visible stats are not directly mutated by each digestion tick by default. `statDrain` is a compatibility/weakness ledger; released condition and Vital Weakness derive from remaining vital integrity.

## Active V1 Scope

`swallow` into the stomach is the only active default V1 containment verb/container pair.

The stomach profile owns:

- capacity
- used/fullness display
- over-capacity blocking
- digestion profile
- release rule
- absorption rule
- terminal rule

Swallow removes the contained creature from active combat, tile, and party surfaces while retaining a recoverable prey record until terminal digestion. Release restores the prey at its reduced condition and clears active containment. Terminal digestion transforms the active contained record into completed digestion, applies capped restorative effects, and emits one coalesced Scene Beat.

## Mod Seams

Core should expose these internal extension seams without requiring mods for V1:

```js
App.registerFeastVerbProfile(profile)
App.registerContainerProfile(profile)
```

Profile fields:

- `id`
- `label` and safe label metadata
- `contentTier`
- `tags`
- `capacityRule`
- `tickRule`
- `releaseRule`
- `absorptionRule`
- `terminalRule`

Built-ins:

- `feastVerbProfile: swallow`
- `containerProfile: stomach`

## UI And Scene Feed

Compact cards should show only small containment indicators. Medium and detail surfaces can show who contains whom, stomach fullness/capacity, digestion progress, release eligibility, and temporary effects.

Scene Feed renders lifecycle beats:

- swallowed/contained
- digestion threshold changes
- released at reduced condition
- terminal digestion/absorption

Activity Log remains the durable technical/history surface. Safe tier uses neutral wording only.

## Deferred

- Itemized chew portions/remains in core.
- Itemized fragment/slurp lifecycle in core.
- Alternate containers/routes beyond stomach.
- Pass-through/all-the-way-through.
- Nested containment mechanics and transfer math.
- Permanent stat growth.
- Full body-manifest expansion.
- Broad fullness penalties beyond capacity/fullness/over-capacity blocking.
- Detailed combat/economy balancing.
