# Map and Tileset Acceptance

This is the pre-release acceptance record for deterministic topology and the
three supported presentation paths. Artwork may vary; passability, connections,
blocked edges, structures, and exits may not.

## Semantic gates

- Versioned start validation runs the maintained seed matrix against generator
  versions 2, 3, 4, 5, and 6. It checks passable start terrain, cardinal escape, safe
  early tiles, a resource site, route access, and a reachable rest/recovery
  candidate. The returned `recoveryAnchor` path is also the placement seam for
  a later optional shrine mode.
- Traversal tests cover reciprocal cardinal terrain, roads, bridges, water,
  blocked edges, building rooms, caves, corridor openings, and interior exits.
  Two-mouth caves must be walked through their reciprocal underground graph
  without test-only teleportation. Generated cabin, ruins, burrow, manor, and
  dungeon graphs must fill their bounded room budget, keep every room reachable
  from the entry, and expose exactly one surface exit.
- Terrain rendering tests cover straight and corner coasts, natural-water wall
  suppression, road/bridge topology, POI overlays, and danger influence.

## Presentation equivalence

| Path | Asset behavior | Gameplay contract |
| --- | --- | --- |
| Offline Textured | First-party atlases embedded as data and decoded asynchronously | Full semantic keys; emoji remains fallback if decoding fails. |
| Hosted Textured | Same atlases fetched as separate same-origin cacheable files | Same runtime, saves, topology, and mod layers. |
| Lightweight | `?graphics=emoji` skips bundled atlas registration | Same semantic map and controls through emoji/text. |
| Partial mod pack | Locally leased overrides compose above lower-priority packs | Missing base/route/state keys inherit; disabling restores the prior candidate. |

Measured development artifacts for the 0.18.3 development head on 2026-08-06
(`npm run audit:map-assets`):

- offline single-file build: 17.33 MiB (10.91 MiB gzip);
- hosted runtime HTML: 3.7 MiB (0.69 MiB gzip);
- external first-party atlases: 10.22 MiB combined (10.17 MiB gzip);
- estimated hosted Lightweight transfer: 0.69 MiB;
- estimated hosted Textured cold transfer: 10.91 MiB.

Hosted Lightweight avoids the atlas transfer. Hosted Textured pays it once and
can reuse normal browser cache; installed mod assets remain content-addressed in
the Media Repository. At a theoretical 1.5 Mbps before latency and decode, the
measured transfers take about 3.9 seconds and 61 seconds respectively. This is
an artifact comparison, not a promise about real network timing.

The audit rejects a hosted artifact that embeds atlas data, adds cache-busting
queries to the stable first-party asset paths, or stops referencing any
required external asset. Browser acceptance independently proves that a cold hosted
Textured load requests each atlas, while normal cache behavior can reuse it,
and a fresh Lightweight context requests none. Low-bandwidth or failed atlas
acquisition must leave the map actionable through semantic emoji fallback and
must write diagnostics to the Activity Log rather than block startup.

Executable map, viewport, interaction, Media Repository, Asset Bundle, and
Tileset Runtime tests remain authoritative over this summary.

The browser acceptance gate now loads `?graphics=emoji` directly and compares
its mobile, desktop, and large-map semantic metadata and traversal decisions to
the same Textured road fixture. It also verifies that Lightweight creates no
atlas layers while retaining emoji/text cues. A separate degraded-startup
fixture rejects atlas preparation and proves that play and module management
remain available, the fallback is explained visibly, and the failure is written
to the Activity Log.

The real loopback URI partial-pack fixture now captures the same mobile,
desktop, and large-map semantic metadata plus traversal decisions before
installation, after initial enablement, after reviewed replacement, after a
full IndexedDB-backed reload, and after disable. Every snapshot must remain
identical even while the active atlas owner and geometry change.

That maintained fixture now also owns real beach material, cardinal and corner
shoreline transitions, building and cave room surfaces, a topology-aware
interior corridor, and a doorway. Contract tests verify those semantic layers
resolve from the enabled module while gameplay topology remains unchanged.
See [Real Presentation Pack Acceptance](real-presentation-pack-acceptance.md).

## Operator visual review

Automation proves topology, fallback, transfer boundaries, cache reuse, and
that every semantic remains present. It does **not** declare subjective artwork
approved. Before a public release, an operator still reviews representative
phone and desktop captures for:

- crop legibility at the smallest rendered cell;
- marker contrast over light, dark, and visually busy terrain;
- road, bridge, coast, cave, building-door, and exit recognition;
- selected/current/danger overlays without obscuring the base terrain;
- authored partial-pack ergonomics and whether its declared transforms look
  intentional.

Those reviews may request first-party art changes. They must not mutate
traversal semantics or “correct” mod-authored artwork that satisfies the pack
contract.

### Live review evidence — 2026-07-23

An isolated fresh run was inspected through the real local browser build at
1280×720 desktop and 390×844 mobile. The review covered the equal-cell 3×3
start neighborhood, a continuous east-west road, the Camp/rest-site overlay,
the current-position marker, and the 17×17 review map.

- Every 3×3 cell remained fully visible at both viewports; labels and borders
  did not crop the navigation surface.
- Road centerlines met the exact shared edge midpoint on desktop, mobile, and
  the small review-map cells.
- Current-position, route, and rest-site cues remained distinguishable over
  the grove base, including the review map's smallest cells.
- The mobile center cell becomes intentionally dense when both the 44px place
  action and 44px presence-overflow action are present. Reducing either would
  violate the touch-target contract. A different information architecture
  belongs to Mobile Interaction Flow V2; it is not a reason to mutate tileset
  semantics or shrink accessible controls.

This sample closes the responsive route/POI legibility check. It does not
replace the existing representative coast, cave, and building-interior review
or authorize a new art direction.

### Terrain Art Quality Pass 2 review — 2026-08-06

The rebuilt `terrain-composition` Alpha mission was traversed in the in-app
browser and inspected at the normal desktop viewport and at 390x844 mobile.
The review covered the biome-identity row plus the centered structure, POI,
evidence, beach, swamp, and jungle neighborhood.

- Grove, forest, plains, swamp, jungle, beach, and cave retain visually
  distinct ground/cover identities; jungle remains intentionally denser than
  the restrained single-overlay biomes.
- Beach now carries sparse drift detail without restoring the removed
  repeating foam/scallop line. Water/land transitions remain a single-owned
  shoreline layer, and adjacent vegetation stays in its edge band.
- Structures and POIs remain transparent overlays on the destination biome;
  route and feature clearance preserve their readable negative space.
- The nine-cell grid, current marker, POI marker, presence overflow, and Alpha
  banner remain contained and usable at 390x844 without horizontal overflow.

The maintained Alpha matrix additionally proves all nine route cells retain a
route deck plus biome-aware underlay, all nine structure cells and all nine POI
cells retain destination ground plus grounding records, and the reviewed coast
does not receive duplicate generic water-transition paint.
