# Quest World Directives V1

Quest World Directives let core and module-authored quests influence a small,
temporary part of the world without exposing executable generation callbacks.
They are optional serializable fields on Quest Contract V2 records and do not
change the save schema.

## Contract

A quest may contain at most eight `worldDirectives`. Content must already be
registered when a template is registered. Core validates and executes every
directive.

### Guaranteed placement

Use `place` when completing the quest requires the content to exist:

```js
worldDirectives: [{
  id: 'nearby-wolf',
  type: 'place',
  content: { kind: 'creature', id: 'wolf' },
  count: 1,
  distance: { min: 10, max: 15 },
  biomes: ['forest'],
  objectiveId: 'defeat-wolf',
  disposition: 'enemy',
  locationLabel: 'Wolfkin signs'
}]
```

Supported content kinds are `creature` and `item`. Placement count is one to
eight. Distance uses reachable cardinal traversal with `min >= 1`,
`max >= min`, and `max <= 32`. An explicit finite `location` may replace the
distance search. Biome preferences use existing biome IDs; if no preferred
biome is reachable within the bounds, core uses another reachable tile rather
than creating an impossible quest.

Core derives stable entity IDs from the quest, directive, and index. Repeated
activation and save/load cannot duplicate the reservation. The associated
objective receives the resolved location for map guidance.

### Scoped probability boost

Use `boost` for gathering, optional encounters, and repeatable flavor:

```js
worldDirectives: [{
  id: 'old-coin-search',
  type: 'boost',
  content: { kind: 'item', id: 'core:old_coin' },
  center: 'destination',
  radius: 4,
  biomes: ['forest', 'plains'],
  multiplier: 5,
  objectiveId: 'find-old-coin'
}]
```

The center is the quest `origin` or `destination`. Radius is one to thirty-two
tiles using Manhattan distance. Multiplier must be greater than one and at
most ten. Matching active boosts multiply the content's relative weight in
wild encounter or search selection; they do not guarantee that a search or
encounter triggers.

Required objectives should therefore use `place`. A `boost` stops once its
quest leaves Active, preventing completed objectives from becoming permanent
farming bonuses.

## Lifecycle and missing providers

- Acceptance resolves and materializes directives.
- Active-save loading reasserts missing materialization idempotently.
- Failure or reward collection disables boosts and removes untouched reserved
  tile content.
- Content already recruited, carried, or contained is no longer an untouched
  tile reservation and is not deleted.
- Disabling a module removes its template but retains already-issued quest
  history. Missing provider content is not regenerated.

## Security and ownership boundary

Directives are data, not hooks. Functions, callbacks, unknown fields,
unregistered content, unknown biomes, circular data, non-finite values, and
out-of-range bounds reject template registration. Core owns pathfinding,
coordinates, stable IDs, persistence, encounter arbitration, map markers, and
cleanup.

This contract cannot place structures, landmarks, routes, interiors, terrain,
or resource sites. Those remain subject to the separate deterministic world
recipe described in
[Content Placement V1 Decision](content-placement-v1-decision.md).
