# World topology v3

Generator v3 separates surface terrain from enterable sites and gives every movement surface one cardinal-edge contract.

## Surface taxonomy

- Region biomes remain surface terrain (`grove`, `forest`, `swamp`, `plains`, `jungle`, `beach`, `cliff`, and `water`).
- `manor`, `dungeon`, and `cave` are interior themes or enterable structures in v3. Generator v1/v2 saves retain their legacy region catalog.
- Roads, bridges, points of interest, natural barriers, and structures are overlays. They do not replace the underlying biome.

## Traversal contract

Movement is cardinal only. `YAW_TRAVERSAL.resolve(app, dx, dy)` is authoritative for keyboard, pointer, mobile, overworld, and interior movement. A decision reports:

```js
{
  allowed,
  direction,             // north | east | south | west
  from,
  to,
  cost,
  requiredCapability,
  reasonCode
}
```

Generated roads and bridges expose reciprocal `connections` arrays. Bridges may only be entered or left along their declared axis. Natural elevation barriers expose blocked cardinal edges in `tile.overlays.barriers`. Water remains blocked unless a bridge or a party traversal capability makes it passable.

## Interiors

Enterable buildings generate a deterministic, sparse, connected room graph. Small buildings currently use six rooms; manors, ruins, dungeons, burrows, and webs use larger bounded profiles. Missing coordinates are walls, and room `connections` are reciprocal.

Generator v3 creates two deterministic cave mouths inside each cellular macro region. Both mouths reference the same `networkId`, share one bounded underground graph, and have distinct `surfaceExit` rooms. This establishes the layer/portal contract without eagerly generating an unbounded underground world.

## Rendering and future tilesets

Tilesets should read topology rather than infer it from adjacent icons:

- `tile.overlays.road.connections`
- `tile.overlays.bridge.connections`
- `tile.overlays.barriers`
- `room.connections`
- `room.exit` and `room.surfaceExit`

These fields are sufficient to select straight, corner, junction, end-cap, bridge-axis, wall, door, and exit sprites. Heavier mod packs can replace the visual assets without changing traversal rules.
