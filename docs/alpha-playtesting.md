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
8. desktop and mobile interaction layout.

Every mission has a stable URL:

```text
dist/you-are-wild?alphaScenario=<mission-id>
```

This URL is the canonical launch contract for browser agents and reproducible human bug reports.

## Automated agent matrix

Run from the repository root:

```sh
npm run build
npm run test:alpha
```

The Playwright matrix opens the public Alpha Lab at a phone viewport, launches every deterministic fixture directly at desktop size, repeats the responsive fixture at phone size, and asserts:

- scenario identity and expected fixture counts;
- isolated save and world databases;
- expected exploration or combat mode;
- visible report and exit controls;
- no horizontal page overflow;
- no uncaught page or console errors.

The command prints a JSON result summary suitable for CI logs. It is also part of `npm run full-build`.

Agents provide broad, repeatable state and layout coverage. Human testers remain important for narration quality, whether an action tree feels natural, touch comfort, and surprising combinations that deterministic fixtures do not yet encode. A human report should become a new fixture whenever the reproduction can be made stable.

