# Pilot Batched Runtime Report

## Result

**PASS**

Command:

`node docs/mod-contract-trials/pilot/runtime-check.js`

Environment:

- Baseline revision: `639d3f77f1fd1d413f7cc5a8fcd82955e6c482ac`
- Game version: `0.17.0`
- Browser: bundled Playwright Chromium, one headless process
- Origin: `file://`
- Parallel local workloads: none

## Verified

### School of Steel

- Package installed and enabled.
- Three owned technique profiles registered exactly once.
- Measured Strike shaped base damage 10 to 14.
- Sweeping Rhythm was selectable for three targets.
- Staggering Blow exposed the normalized one-turn, 60% `stun` profile.
- Disable removed all profiles and canceled an owned queued technique.
- Re-enable and browser reload restored one copy.
- Compatible replacement unloaded the profile and stored the package disabled.
- Replacement re-enable restored one copy; deletion removed it.

### Field Journal

- Package installed and enabled.
- One badge, one detail section, and one system utility registered.
- A representative creature rendered a dynamic condition badge and bounded
  detail rows.
- The utility opened a core-owned dialog with current coordinates, terrain,
  danger, party, travelers, and mode.
- At 390 by 844 pixels, the badge and details remained present without page
  overflow.
- Disable, reload, replacement, and deletion removed or restored exactly the
  expected owned contributions.

### Courier's Trail

- Package installed and enabled.
- Three item definitions, four merchant placements, one quest template, and
  one route in each of cabin and camp registered exactly once.
- A representative quest was accepted and advanced to `following_trail`.
- Its directive selected a reachable coordinate, placed the required namespaced
  satchel there, and added the resolved objective guidance.
- The issued quest survived a JSON round trip through the maintained quest save
  DTO.
- Disabling removed live definitions and routes but retained the issued quest.
- Re-enable and browser reload restored one copy of each owned contribution.
- Compatible replacement stored the module disabled; re-enable restored it;
  deletion removed it.

### Shared lifecycle

- All three enabled modules restored after a browser reload.
- Compatible same-ID replacement left all three installed but disabled.
- Deletion removed all three records.
- No browser page errors occurred.

## Harness note

The first runtime attempt stopped in the evaluator harness after successful
install/enable because it incorrectly treated `_prepareSaveSnapshot()` as a
returned snapshot. That helper prepares state in place and returns nothing.
The harness was corrected to round-trip
`YAW_SAVE_PERSISTENCE.buildQuestStateDto(App)`, browser storage was cleared,
and the complete run passed. This was an evaluator defect, not a submission
failure.

## Current main-candidate replay

The archived harness was replayed on 2026-07-30 after a fresh
`npm run full-build`, using Node `v24.14.1` and the locally installed Playwright
Chromium. The only archival adjustment was changing the harness's repository
root calculation for its maintained `docs/mod-contract-trials/pilot/`
location.

Result: **PASS**

- All three modules installed and enabled.
- The representative technique, UI, quest, placement, save DTO, mobile, and
  disable-retention assertions passed.
- Replacement, reload, re-enable, and deletion assertions passed.
- The browser reported no page errors.

This replay is current-runtime `runtime-tested` evidence for the candidate
containing this report. The original hashes, author notes, scores, and
blind-authoring classification remain tied to the recorded pilot baseline.
