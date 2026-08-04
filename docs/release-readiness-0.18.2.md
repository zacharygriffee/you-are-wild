# Release Readiness — 0.18.2

Status: **released public-access alpha**

This checklist records the 0.18.2 patch evidence. It preserves the 0.18.1 gameplay and Moddable Core boundaries while adding an isolated public playtest surface and deterministic agent fixtures.

## Documentation and identity

- [x] Application package, lockfile, first-party packages, Mod Author Kit, tests, and release metadata identify 0.18.2.
- [x] Save Schema remains 11 and Module API remains 1.
- [x] English and Spanish release metadata describe the exact patch scope.
- [x] `releases/0.18.2.md` records compatibility and exclusions.

## Exact-release evidence

- [x] Full build, source tests, hosted artifact check, viewport suite, interaction suite, branding audit, map acceptance, and whitespace checks pass.
- [x] The Alpha browser matrix launches all eight deterministic fixtures and verifies the public phone-width lab/report flow.
- [x] Alpha fixtures use isolated save/world databases and Alpha-only slot metadata.
- [x] Reports require explicit sharing and contain bounded diagnostic context plus exact build identity.
- [x] Existing representative older-save and module compatibility tests remain green.

## Publication record

- [x] Operator authorized commit, push, and public Sites publication as 0.18.2.
- [ ] GitHub CI passes for the exact merged release revision.
- [ ] The 0.18.2 site deployment reports success and its public URL is verified.

## Agent playtest patch gate — 2026-08-04

Status: **ready for review and commit; no open blocker in the tested matrix**

The public-access build received a second release gate after interaction and party-management regressions were reported. This pass combined deterministic browser automation, hands-on desktop and phone-width play, source audits, and the ordinary non-Alpha regression suites.

### Mission and free-play coverage

- [x] Single exploration: Fight, Talk, Play, Eat, and Feed open the canonical option sheet; Play retains its self and target choices.
- [x] Group exploration: explicit multi-actor and multi-target selection preserves the same five interaction families and shows the complete pair preview.
- [x] Self and containment: self Eat exposes Break Down and Free, and a successful Break Down resolves through the Scene Feed.
- [x] Combat groups: one or several actors use the same Fight option sheet and explicit commit flow; the command sentence owns the stable group cancel.
- [x] Mixed capability: an unreachable actor fails narratively while a capable ranged ally resolves the same group attempt.
- [x] Failed attempts: range, stale technique, missing target, unavailable variant, and interrupted group attempts route through Scene narration instead of warning or error UI.
- [x] Companion management: AI-assisted behavior is unavailable when no provider exists; rename, shared-Pack equipment, manual save, and load were replayed together.
- [x] Content posture: primary labels remain Talk and Play; SFW shows Talk/Play while Mature exposes Flirt, Seduce, and Fuck only as variants.
- [x] Responsive layout: the shared option sheet, group composer, target marks, and complete combat belt were exercised at 390 × 844 with no horizontal page overflow.
- [x] Ordinary regression coverage: the non-Alpha core, viewport, and interaction suites exercised representative exploration, combat, self, party, and save/load flows.

### Defects found and closed

1. A ranged unit's combat introduction used plural grammar for one actor. The Scene now says the named unit keeps their distance.
2. Feed variant failures, stale group techniques, mutual Feast conflicts, and legacy Sync participant failures emitted procedural messages. They now resolve as Scene narration in combat and exploration.
3. Mature group Fuck reused SFW Play completion text. Group narration now follows the selected content posture.
4. Seduce success and group copy could read as coercive. The maintained English wording now describes a willing invitation and mutual response.
5. The Alpha Lab browser check could click before startup finished. It now waits for the active menu and visible lab control.
6. A mixed-reach group Fight described one capable ally as “gang up.” Singular capable outcomes now use ordinary Fight narration while preserving each failed actor's reason.
7. A manual full save could leave an older sparse manifest that load preferred, losing a just-equipped companion item. Full-slot writes now retire that slot's stale manifest; the rename, item, and activity history survive a browser save/load replay.
8. Mobile group setup interpolated the generic placeholder into “Mark target(s) for Choose your next action..” The prompt now asks the player to choose a group action until a real intent exists.

### Verification evidence

- [x] `npm --prefix app test` — passed, including new narration, mixed-reach, mobile prompt, and full-save retirement regressions.
- [x] `npm run test:mod-tooling` — 12 tests passed; Mod Author Kit validation passed.
- [x] `npm run build` and `npm run check` — 141 source scripts included; `dist/you-are-wild.html` is current.
- [x] `npm run test:viewport` — passed.
- [x] `npm run test:interactions` — passed.
- [x] `npm run test:alpha` — 10/10 cases passed: public phone-width lab, all eight desktop missions, and the responsive mission at phone width.
- [x] Hands-on browser replay — desktop single/group/self/content/companion paths and phone-width exploration/combat paths passed without warning banners, horizontal overflow, or malformed option trees.

The remaining unchecked publication items above are operational checks, not gameplay defects. They must still be completed for the exact commit that is ultimately merged and deployed.
