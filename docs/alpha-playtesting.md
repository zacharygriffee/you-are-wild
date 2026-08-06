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
9. deterministic terrain composition and adjacency review.

Every mission has a stable URL:

```text
dist/you-are-wild?alphaScenario=<mission-id>
```

This URL is the canonical launch contract for browser agents and reproducible human bug reports.

The terrain mission is available at:

```text
dist/you-are-wild?alphaScenario=terrain-composition
```

It prepares an explored 9x9 visual survey with no encounters. Read the rows
from north to south as biome identity, explicit cover families, continuous
road and bridge geometry, structures, POIs, evidence and presence,
directional elevation, and two mixed-adjacency junction rows. The columns
cover grove, forest, plains, swamp, jungle, beach, water, cliff, and cave.
This fixture is for repeatable visual inspection; its overlays do not grant
terrain mechanics or alter ordinary adventure saves.

## Automated agent matrix

Run from the repository root:

```sh
npm run build
npm run test:alpha
```

The Playwright matrix opens the public Alpha Lab at a phone viewport, launches every deterministic fixture directly at desktop size, and repeats both the responsive and terrain-composition fixtures at phone size. It asserts:

- scenario identity and expected fixture counts;
- isolated save and world databases;
- expected exploration or combat mode;
- visible report and exit controls;
- no horizontal page overflow;
- no uncaught page or console errors.

Interaction-only missions use the Lightweight renderer so the matrix can focus
on fixture and control behavior without repeatedly decoding the embedded atlas
set. The terrain-composition mission deliberately uses the Textured renderer at
both sizes; the separate composition browser gate also covers hosted and file
origins at every maintained viewport.

The terrain fixture additionally checks its exact biome, road, bridge,
structure, POI, evidence, directional-relief, jungle-strata, and water-fact
coverage, including junction narration after biome rebasing.

The command prints a JSON result summary suitable for CI logs. It is also part of `npm run full-build`.

Agents provide broad, repeatable state and layout coverage. Human testers remain important for narration quality, whether an action tree feels natural, touch comfort, and surprising combinations that deterministic fixtures do not yet encode. A human report should become a new fixture whenever the reproduction can be made stable.
