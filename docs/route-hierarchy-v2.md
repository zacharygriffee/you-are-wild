# Route Hierarchy V2

Route Hierarchy V2 is the Generator V5 road-graph contract. It replaces the
independent macro-edge coin flips used by older generators without rewriting
recorded worlds.

## Graph contract

- Every macro region has one primary route anchor.
- Each non-origin region has exactly one deterministic parent whose Manhattan
  distance to the origin is lower. Those edges form one connected acyclic
  primary network.
- Additional route-capable POIs inside a region connect through a
  deterministic nearest-connected branch tree. Branches do not create local
  road rings.
- A non-tree macro edge is considered only at a low deterministic rate. It is
  retained only when the existing primary-tree path produces a cycle of at
  least eight macro edges, making it an intentional alternate route rather
  than a small redundant circle.
- Rasterized junctions retain every incident segment ID. Neighboring road
  tiles connect only when they share a segment, so crossing or nearby roads do
  not invent an unauthored junction.

## Preservation boundaries

Generator V5 inherits the Generator V4 protected-start and encounter-admission
contract. Roads remain overlays over their base biome, keep their encounter
and traversal modifiers, and become bridges only when the full bounded water
span is valid. The starter east-west route remains explicit.

Generator V4 and earlier use their original edge selection and road identity
rules. Saves continue to reconstruct base terrain from the generator version
recorded in `worldMeta`; there is no in-place migration of an existing road
network.

## Acceptance

The deterministic acceptance fixture proves:

- a 17×17 macro-region sample has exactly `nodes - 1` primary edges;
- those primary edges are connected and acyclic;
- retained optional loops have a cycle length of at least eight;
- every route-capable POI in a representative multi-anchor region lies on a
  local route branch;
- a recorded Generator V4 sample retains its prior segment identity and
  directional connections; and
- start safety/recovery-anchor acceptance passes Generator V5 alongside the
  maintained older versions.
