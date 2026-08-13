# Active Objectives

This file contains unfinished, approved, actionable work only. Completed work
belongs in `changelog.md`; requirement evidence belongs in
`backlog-completion-audit.md`; subsystem behavior belongs in focused doctrine.

## 0.19.0 release-candidate maintenance

Version 0.18.3 remains the active released public-access alpha. Version 0.19.0
is an unpublished development candidate containing the accepted companion
autonomy controls, Combat Agency V1, Companion Bond V1, finite-mass Chew
nourishment, and reach-aware player flight. Preparing or validating the
candidate does not publish, deploy, tag, or promote it.

During 0.19.0 release-candidate maintenance, do not add new module
permissions, public UI slots, resolver effect types, saved schemas, media
providers, biome-recipe modes, recovery profiles, population simulation,
elemental semantics, crafting, commerce, or arbitrary module callbacks.

Existing regressions may be fixed. Existing contracts may receive tests,
documentation corrections, localization and accessibility fixes, and narrow
hardening. Core gameplay remains deterministic, offline-capable, and
independent of LLM or remote-service availability.

## Post-release terrain direction

The Canvas Terrain Scene and fixed-chunk renderer now provide the accepted
3x3 and Survey baseline described by the
[Layered Map Art Roadmap](map-art-layering-roadmap.md). Continue to improve
directional cliffs, bridge-to-road approaches, larger-view presentation, and
authored biome assets through those semantic layers rather than inferring game
rules from pixels.

This presentation work should precede Terrain Tactics V1 and Crafting V1.
Those systems need stable terrain, obstacle, resource, and persistent tile
semantics so mechanics can consume world facts rather than infer rules from
bitmap appearance.

## Evidence-led release smoke

Exercise the exact released build rather than a nearby development build:

- load the representative published 0.14 save and create a fresh world;
- use ordinary movement, Talk, Fight, Feed or Feast, Flee, save, and reload;
- use Grab, Pull, Escape, and successful and failed Seduce outcomes;
- install and enable the Moddable Core fixture, spend its owned resource,
  observe its restraint, reload the enabled runtime, then disable and delete it;
- inspect the combat composer at 313x670, 390x844, 412x915, and 1365x768,
  including the opened contributed-action menu;
- open the generated single-file artifact through `file://` and run the hosted
  artifact with external atlas paths;
- verify the same seed and committed inputs preserve mechanical outcomes.

The maintained automated suites may provide this evidence where they exercise
the real artifact and state path. Subjective comfort and play quality remain
operator observations.

## Operator playtest needs

These are observational and do not authorize mechanic changes without a
demonstrated contradiction:

- physical-phone comfort for the compact combat composer and action menu;
- longer sessions covering dismissed-recruit sightings and rejoining;
- perceived readability of readable, fast, and instant combat pacing;
- authored biome-boundary, cave, structure, merchant, and audio-pack content;
- appetite, recruitment, restraint duration, danger, and reward balance;
- English and Spanish player-facing clarity and human translation quality.

## Later gameplay and mod work

The following remain valid backlog, but none blocks the 0.19.0 candidate:

- Companion Bond V2 observability and authored needs, neglect, and witnessed-
  conduct events; desertion and hostility require a later explicit threshold
  and transition contract rather than being inferred from Hunger or Spirit;
- true reaction priority and emergency out-of-turn player Flee beyond Combat
  Agency V1's saved reservation of the next ordinary actionable turn;
- regional population aggregation and offscreen service simulation;
- persistent merchant supply, unloading, and designed repopulation;
- immutable new-world recipe sets, meaningful `mapModsHash`, designed regions,
  placeable anomalies, and portal worlds;
- objective and return-burden quest scaling after scenario evidence;
- authored shrine networks, resurrection costs, medical NPCs, spectral
  abilities, companion extraction, and richer Recovery Mode V2 economies;
- permanent body-piece stat consequences only after balance and migration
  acceptance;
- Sleep or Rest V2 with explicit waking, risk, reward, and choice;
- terrain tactics, after the layered map-art semantic inventory is accepted;
- shared elemental damage and resistance semantics, if real modules prove a
  common contract is needed;
- crafting recipes, stations, costs, outputs, ownership, item sinks, and
  terrain resource placement, after persistent resource semantics are accepted;
- reviewed AI media generation, packaged-runtime media bridges, optional OPFS
  optimization, and AI or TTS audio;
- long-form balance, progression, reward, and difficulty-profile evaluation.

## Explicit non-release tracks

Commerce, paid mods, accounts, managed LLM entitlement, payment processors,
public marketplace services, Pear seeding, mesh sidecars, and public-launch
administration are separate tracks. They do not block this game candidate and
must not be folded into 0.19.0 release preparation.

## Delivery boundary

Agents may prepare patch candidates, run verification, commit and push when the
active goal explicitly authorizes it, and observe CI. Changing release status,
selecting rollback Sites versions, publishing Sites, creating public release
assets, changing access, advertising, and promoting the channel remain
operator-mediated.

## Authoritative references

- `moddable-core-v1.md`
- `action-outcome-status-v1-decision.md`
- `biome-boundary-world-recipe-v1-decision.md`
- `body-mass-pieces-v1-decision.md`
- `autonomous-population-v1-decision.md`
- `release-readiness-0.18.2.md`
- `release-readiness-0.18.3.md`
- `release-readiness-0.19.0.md`
- `releases/0.18.2.md`
- `releases/0.18.3.md`
- `releases/0.19.0.md`
- `map-art-layering-roadmap.md`
- `architecture.md`
- `backlog-completion-audit.md`
- `control-model.md`
- `modding.md`
- `testing.md`
