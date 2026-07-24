# Immediate Backlog Execution Plan

This plan orders the immediate backlog so later balance and presentation work
does not build on ambiguous defeat, save, or world-state behavior. Each slice is
independently testable and must preserve file-origin play, hosted Textured and
Lightweight play, existing saves, optional content boundaries, and mod hooks.

## Immediate Next — Public Module Contract Hardening

Status: acceptance gate satisfied for Public Module Contract V1. The neutral
conformance and locale-pack fixtures cover the declared contribution boundary
through install, enable, use, persistence/reload, dependency loss, disable,
delete/reinstall, and owned cleanup. Reopen only for a demonstrated package or
doctrine contradiction.

The interaction composer cleanup is followed immediately by a public mod API
and doctrine pass. Use neutral maintained fixtures to prove that every declared
contribution is reachable and persistent. Unreviewed agent-generated packages
are excluded from doctrine and acceptance.

1. Publish an exact table of content request keys and their
   `category.type.variant` consumers. Reject or warn on registered keys that no
   current route can request; do not use load-order fallback to make an example
   appear functional.
2. Separate legacy content-template registration from semantic Scene Feed
   template registration. Add an owned, permission-checked module API for the
   latter instead of exposing raw `App` registration in public doctrine.
3. Give provider creation options a bounded owned persistence namespace, or
   reject option groups and values that character creation cannot save.
4. Keep action-variant registration documented as Feed/Feast-only until a
   deliberate Play variant contract exists. Then cover Self and Targets menu
   grouping, dispatch, save/load, unload cleanup, and content-policy gating.
5. Emit enable-time diagnostics for unreachable templates, non-persisting
   creation options, and declared variants without executable routes.
6. Correct misleading first-party examples, then require a neutral conformance
   package to pass install, review, enable, character creation, interaction,
   save/reload, disable, and ownership-cleanup tests.

Acceptance gate: an independent coding agent can author a working module from
the public documentation without relying on undocumented key names, raw App
methods, or silent fallbacks.

## Slice 1 — Death/Defeat Contract and Regression Matrix

Status: automated acceptance gate satisfied by Death/Defeat V3. Continue
longer operator saves for observational evidence, and add code only for a new
terminal cause, persistence boundary, or demonstrated contradiction.

1. Enumerate every route that can incapacitate or terminate the player:
   direct combat, group combat, persistent damage, starvation, containment and
   digestion, scripted/module outcomes, load recovery, and future environment
   damage.
2. Replace route-owned terminal behavior with one authoritative resolver. Input
   must include cause, source, location/interior context, party state, active
   slot, and whether the player is alive, incapacitated, captured/contained, or
   terminally dead.
3. Define explicit states and transitions:
   `active`, `incapacitated`, `captured`, `defeated`, `dead`, `recovering`, and
   `run-ended`. Being swallowed or otherwise contained while alive must not be
   treated as terminal death.
4. Preserve the existing `onDefeat` hook and introduce bounded cause/state
   metadata rather than exposing presentation-specific content to core.
5. Add deterministic tests for each cause, repeated resolution, reload during a
   pending outcome, and old saves with the current `defeatState` shape.

Acceptance gate: every terminal route resolves exactly once through the shared
contract; living post-defeat/contained play remains possible; no save is
deleted in regular mode.

## Slice 2 — Regular, Hardcore, and Inventory Consequences

Status: automated acceptance gate satisfied for regular recovery,
death-bag/retain policies, repeated bags, partial retrieval, stranded
companions, interior placement, sparse/full reload, and scoped Hardcore slot
deletion.

1. Restore regular recovery at the validated home/safe anchor with the player
   at minimal condition and no former companions automatically restored into
   the active party.
2. Record companion outcomes explicitly. V1 should remove them from the active
   party and persist surviving companions as missing/stranded recovery records
   tied to their last reachable location. Dead companions remain dead; no unit
   is silently revived or discarded.
3. Add an `inventoryRecovery` setting:
   - `death-bag` is the standard default;
   - `retain` is the lower-friction option.
4. In `death-bag` mode, drop carried pack contents and ordinary currency into
   one deterministic persistent world object. Retain equipped, bound, and quest
   items for V1. Specify replacement/merge behavior for another death before
   retrieval, safe placement for interiors/water/unreachable cells, ownership,
   save/load, collection, and anti-duplication rules.
5. Route Hardcore through the same resolver. Delete only the active full and
   sparse slot, combat refresh snapshot, save timestamp, and resume metadata;
   leave other slots intact and make Continue unavailable for the ended run.
6. Replace the current binary recovery choice with outcome-specific scene and
   command surfaces on desktop and mobile.

Acceptance gate: regular recovery, both inventory policies, companion removal,
bag retrieval, repeated death, and all-cause Hardcore deletion pass save/load
and desktop/mobile tests.

## Slice 3 — Survival and Action-Balance Instrumentation

Status: acceptance gate satisfied. Schema-v2 scenario output now reports
Starving thresholds, rest/digestion pacing, neutral action effect, commands and
XP across resolution, and every one-, two-, and four-target Fight mastery tier.
Runtime cross-checks prevent the multi-target table from drifting.

1. Build deterministic scenario fixtures before changing numbers: empty rest,
   small/large prey digestion, slow/fast digestion, repeated Fight, Play, Feed,
   Feast, and Flee, plus single- and multi-target Fight at every mastery tier.
2. Report time-to-hungry, nutrition per prey size, rest recovery versus hunger,
   damage/effect per action and target, XP per encounter, and expected turns to
   resolution.
3. Tune only values that fail declared scenario ranges. Do not alter content
   policy, target grammar, save schemas, or tileset behavior during this slice.
4. Add player-visible explanations where a value is intentionally surprising,
   especially digestion progress, rest hunger, and distributed multi-target
   effectiveness.

Acceptance gate: scenario tables and deterministic tests explain the selected
baseline, with no unexplained full-effect multiplication or nutrition loss.

## Slice 4 — Multi-Creature Interaction Hardening

Status: acceptance gate satisfied for the currently supported interaction
grammar. The matrix now directly covers early target defeat during ordered
many-to-many resolution and queued-target invalidation in addition to its prior
shape, overlap, cancellation, accounting, and save/load fixtures. Extend this
slice only for a newly demonstrated contradiction or persistence boundary.

1. Exercise one-to-one, one-to-many, many-to-one, many-to-many, mutual, and
   paired plans across combat and exploration.
2. Cover mixed party/local targets, self-targeting, actors also selected as
   targets, unreachable targets, partial failures, defeat during resolution,
   queued group actions, cancellation, and save/load mid-plan.
3. Require one cost per participating actor, one practice award per command,
   independent contribution scaling, deterministic target order, and in-world
   failure messages for valid but impossible attempts.
4. Change only contradictions to the actor-target-intent contract; lock all
   accepted behavior with regression tests.

Acceptance gate: the interaction matrix passes in desktop and mobile composers
without selection dead ends, duplicate costs, duplicate practice, or UI errors.

## Slice 5 — UI, Accessibility, and Localization Pass

Status: current automated acceptance gate satisfied. The viewport,
interaction, locale-parity, source-literal, high-contrast, reduced-motion,
touch-target, dialog, and focus lifecycle suites are clean. Reopen for a
demonstrated product defect or physical-device finding.

1. Device-test 320–430px mobile, tablet portrait, compact desktop, and standard
   desktop at 12–20px font sizes.
2. Cover death/recovery surfaces, inventory bag retrieval, save slots, Holdings,
   combat rails/toolbelt, long labels, startup readiness, Activity Log, and
   Textured/Lightweight entry.
3. Audit keyboard order, focus traps/restoration, accessible names and live
   status, horizontal belt gestures, high contrast, and reduced motion.
4. Move new and remaining hardcoded player text into English/Spanish registries
   and enforce locale parity.

Acceptance gate: viewport, keyboard, accessibility, and locale tests pass with
no blocked command or horizontal page overflow.

## Slice 6 — Map Playability and Tileset Acceptance

Status: automated acceptance gate satisfied; responsive route/POI live review
is recorded. Representative coast, cave, building, and authored-pack art
review continues when those states surface in operator play.

1. Add deterministic start-area and reachable-home invariants, including a
   valid recovery anchor and future shrine-placement seam.
2. Playtest roads, bridges, coasts, POI budgets, encounter pressure, buildings,
   caves, and interior exits for route correctness independent of artwork.
3. Verify the same semantic map under bundled textures, Lightweight emoji, and
   a partial replacement tileset pack.
4. Measure first-load texture cost, cache reuse, fallback behavior, crop
   legibility, marker contrast, and low-bandwidth failure recovery. Artifact
   size, hosted cache reuse, Lightweight non-acquisition, and degraded startup
   now have executable gates; crop legibility and marker contrast remain an
   explicit operator visual review rather than a synthetic pass claim.
5. Fix semantic or traversal defects before visual polish; retain mod-authored
   assets and transforms unless the pack violates its declared contract.

Acceptance gate: representative seeds remain traversable and recoverable, and
all three presentation paths communicate equivalent playable topology.

## Deferred From This Immediate Plan

- Mobile Interaction Flow V2 is accepted and implemented as a unified,
  state-aware Roster above the persistent composer. Keep its full responsive,
  localization, focus, unload, and file-origin acceptance matrix green before
  freezing any public module UI-slot names.
- Ghost/shrine recovery has a bounded V1 implementation, but its player-facing
  contract requires an explicit pre-publish review. Do not broaden its
  abilities, destinations, restrictions, or resurrection economy until
  [the Ghost recovery decision](ghost-recovery-prepublish-decision.md) is
  resolved.
- Healer debt, faction rescue, companion extraction quests, gravestones, and
  body landmarks beyond the V1 death bag.
- New row/reach mechanics, Sprite Pack, richer structure skins, generated
  media, animation, audio, and 3D.

## Verification and Delivery

Every slice ends with focused tests plus `npm run full-build`,
`npm run audit:branding`, and `git diff --check`. Layout slices also run the
full viewport matrix. No slice is published automatically; commits, pushes,
version changes, and Sites publication remain operator-mediated.

The current deterministic balance table is recorded in
`docs/balance-scenario-baseline.md` and is generated from the same defaults used
by gameplay tests.
