# Alpha Playtesting

The Alpha Lab is the shared entry point for public testers and automated browser agents. It prepares deterministic missions without replacing ordinary adventure saves.

## Public tester flow

Open **Alpha Lab** from the title screen or the in-game menu, choose a mission, and follow its three expected-behavior checks. While a mission is active, the Alpha banner provides **Report outcome** and **Exit Alpha** controls.

Each report contains only a bounded diagnostic snapshot:

- release, build, fixture, language, and content-posture identity;
- viewport size and small aggregate state counts;
- the latest twelve Scene and activity entries, truncated to fixed limits;
- the tester-selected outcome and checklist progress.

The report is shown for review before sharing. Nothing is submitted automatically. Copying uses the browser clipboard, and opening a GitHub issue requires an explicit tester click. Free-form notes are limited to 2,000 characters.

Alpha missions use `YAW_Alpha_Saves` and `YAW_Alpha_Worlds`. Their save-slot and refresh metadata also use Alpha-only keys. Launching a mission clears the previous Alpha sandbox; it does not delete or write the ordinary `YAW_Saves` or `YAW_Worlds` adventure databases.

## Prepared missions

The maintained fixture set covers:

1. single-target interaction consistency;
2. group and mixed-capability interaction resolution;
3. self and containment actions;
4. combat group planning;
5. narrated failed attempts;
6. companion naming and shared-Pack loadouts;
7. SFW and Mature vocabulary;
8. desktop and mobile interaction layout;
9. deterministic terrain composition and adjacency review;
10. an isolated Tile Composition Workbench for exhaustive biome-pair cases.

Every mission has a stable URL:

```text
dist/you-are-wild?alphaScenario=<mission-id>
```

This URL is the canonical launch contract for browser agents and reproducible human bug reports.

The terrain mission is available at:

```text
dist/you-are-wild?alphaScenario=terrain-composition
```

The engine-neutral Canvas lane is now the default for the same fixture. Its
explicit diagnostic URL is:

```text
dist/you-are-wild?alphaScenario=terrain-composition&terrainRenderer=canvas-v1
```

Use `terrainRenderer=legacy` to compare or roll back to the established
per-cell renderer without changing the fixture or save state.

It prepares an explored 9x9 visual survey with no encounters. Read the rows
from north to south as biome identity, explicit cover families, continuous
road and bridge geometry, structures, POIs, evidence and presence,
directional elevation, and two mixed-adjacency junction rows. The columns
cover grove, forest, plains, swamp, jungle, beach, water, cliff, and cave.
This fixture is for repeatable visual inspection; its overlays do not grant
terrain mechanics or alter ordinary adventure saves.

The isolated workbench is available at:

```text
dist/you-are-wild?alphaScenario=terrain-workbench
```

It renders one explored 7x7 case at a time and exposes source biome,
    destination biome, cardinal orientation, boundary geometry, relief fixture, overlay state,
day/night lighting, and deterministic art seed controls. The controls cover
all nine maintained biomes, six boundary geometries, five relief fixtures, nine
overlay states, two lighting phases, and four enumerated art seeds: 699,840
reproducible cases.
The current case is encoded in `terrainSource`, `terrainDestination`,
`terrainDirection`, `terrainGeometry`, `terrainRelief`, `terrainOverlay`, `terrainPhase`, and
`terrainSeed` URL parameters so a visual defect can be shared directly.
The floating controls become a bounded bottom sheet at phone widths and
temporarily step behind Review Map while that full-surface inspector is open;
closing Review Map restores the same URL-backed case without resetting it.

The maintained reported-case set pins seven URLs/states: plains relief, swamp
relief, beach corner geometry, forest cover, jungle variation, road scale, and
bridge-adjacent water walls. These are regression anchors, not a replacement
for reviewing the complete matrix.

## Automated agent matrix

Run from the repository root:

```sh
npm run build
npm run test:alpha
npm run test:terrain-workbench
npm run test:terrain-renderer
npm run test:terrain-canvas-browser
```

The Playwright matrix opens the public Alpha Lab at a phone viewport, launches every deterministic fixture directly at desktop size, and repeats the responsive, terrain-composition, and terrain-workbench fixtures at phone size. It asserts:

- scenario identity and expected fixture counts;
- isolated save and world databases;
- expected exploration or combat mode;
- visible report and exit controls;
- no horizontal page overflow;
- no uncaught page or console errors.

Interaction-only missions use the Lightweight renderer so the matrix can focus
on fixture and control behavior without repeatedly decoding the embedded atlas
set. The terrain missions deliberately use the Textured renderer at both
sizes; the separate composition browser gate also covers hosted and file
origins at every maintained viewport.

The terrain fixture additionally checks its exact biome, road, bridge,
structure, POI, evidence, directional-relief, water-fact, and layered identity
coverage. Grove, forest, plains, swamp, and cave each expose an independently
replaceable identity semantic, beach exposes a restrained drift identity, and
jungle retains separate canopy, undergrowth, and litter records. The matrix
also checks all nine route underlays/decks, destination-grounded structure and
POI rows, single-owned beach/water shoreline paint, and junction narration
after biome rebasing.

The workbench contract test walks the complete Cartesian matrix without
rendering every case at once. It proves stable case indexing, URL-safe input
normalization, distinct rotated geometry masks, and both-biome coverage for
every orientation. The browser matrix then exercises control changes,
previous/next stepping, overlay composition, Review Map projection, and mobile
containment on representative rendered cases.

The Canvas browser gate separately covers hosted and `file://` origins at
desktop and phone sizes. It proves exact-once local movement, narrative-only
blocked attempts, one active responsive surface, 3x3/Survey camera parity,
survey keyboard and pointer authority, mixed known/unknown privacy, resize and
orientation behavior, bounded accessibility state, explicit query opt-out, and
transactional failure fallback. Touch playthroughs add real pinch and drag
evidence and must record the artifact hash, viewport, DPR, origin, and any
console or page errors.

The command prints a JSON result summary suitable for CI logs. It is also part of `npm run full-build`.

Agents provide broad, repeatable state and layout coverage. Human testers remain important for narration quality, whether an action tree feels natural, touch comfort, and surprising combinations that deterministic fixtures do not yet encode. A human report should become a new fixture whenever the reproduction can be made stable.
