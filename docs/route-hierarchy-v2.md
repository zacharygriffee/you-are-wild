# Route Hierarchy V2

Route Hierarchy V2 is the connected road-graph contract introduced by
Generator V5. Generator V6 keeps that macro graph and replaces only its visual
tile raster for new worlds, without rewriting recorded Generator V5 worlds.

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

## Generator V6 raster

- Each route segment follows a deterministic one-tile-wide orthogonal path
  with one bend instead of selecting every tile near a diagonal line.
- A region exposes at most two road-served POI anchors. Other landmarks and
  structures remain discoverable without requiring a road spur.
- A single segment cannot form a T-junction. Three- and four-way tiles are
  reserved for locations where independently identified segments actually
  meet.
- The maintained garble fixture drops from 93 to at most 40 road tiles in a
  17×17 window and from 36 false single-segment junctions to zero.

## Preservation boundaries

Generators V5 and V6 inherit the Generator V4 protected-start and
encounter-admission contract. Roads remain overlays over their base biome,
keep their encounter and traversal modifiers, and become bridges only when the
full bounded water span is valid. The starter east-west route remains
explicit.

Generator V5 and earlier use their original raster, edge selection, and road
identity rules. Saves continue to reconstruct base terrain from the generator
version recorded in `worldMeta`; there is no in-place migration of an existing
road network.

## Acceptance

The deterministic acceptance fixture proves:

- a 17×17 macro-region sample has exactly `nodes - 1` primary edges;
- those primary edges are connected and acyclic;
- retained optional loops have a cycle length of at least eight;
- every route-capable POI in a representative multi-anchor region lies on a
  local route branch;
- a recorded Generator V4 sample retains its prior segment identity and
  directional connections;
- a recorded Generator V5 density/topology sample remains unchanged while
  Generator V6 removes false single-segment junctions; and
- start safety/recovery-anchor acceptance passes Generator V6 alongside the
  maintained older versions.
