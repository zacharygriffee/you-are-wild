# Map and Tileset Acceptance

This is the pre-release acceptance record for deterministic topology and the
three supported presentation paths. Artwork may vary; passability, connections,
blocked edges, structures, and exits may not.

## Semantic gates

- Versioned start validation checks passable start terrain, cardinal escape,
  safe early tiles, a resource site, route access, and a reachable rest/recovery
  candidate. The returned `recoveryAnchor` path is also the placement seam for
  a later optional shrine mode.
- Traversal tests cover reciprocal cardinal terrain, roads, bridges, water,
  blocked edges, building rooms, caves, corridor openings, and interior exits.
- Terrain rendering tests cover straight and corner coasts, natural-water wall
  suppression, road/bridge topology, POI overlays, and danger influence.

## Presentation equivalence

| Path | Asset behavior | Gameplay contract |
| --- | --- | --- |
| Offline Textured | Three atlases embedded as data and decoded asynchronously | Full semantic keys; emoji remains fallback if decoding fails. |
| Hosted Textured | Same atlases fetched as separate same-origin cacheable files | Same runtime, saves, topology, and mod layers. |
| Lightweight | `?graphics=emoji` skips bundled atlas registration | Same semantic map and controls through emoji/text. |
| Partial mod pack | Locally leased overrides compose above lower-priority packs | Missing base/route/state keys inherit; disabling restores the prior candidate. |

Measured development artifacts for the 0.12.2 development head on 2026-07-20:

- offline single-file build: 7.58 MiB (4.27 MiB gzip);
- hosted runtime HTML: 2.52 MiB (0.46 MiB gzip);
- external first-party atlases: 3.78 MiB combined.

Hosted Lightweight avoids the atlas transfer. Hosted Textured pays it once and
can reuse normal browser cache; installed mod assets remain content-addressed in
the Media Repository. Low-bandwidth or failed atlas acquisition must leave the
map actionable through semantic emoji fallback and must write diagnostics to the
Activity Log rather than block startup.

Executable map, viewport, interaction, Media Repository, Asset Bundle, and
Tileset Runtime tests remain authoritative over this summary.
