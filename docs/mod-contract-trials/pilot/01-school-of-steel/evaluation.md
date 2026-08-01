# Evaluation: School of Steel

## Submission integrity

- Artifact SHA-256: `952f9a0aa429911307644a5d8fcf79ce8d22bf981fea812b8bf9f3a7ec4f8957`
- Author-note SHA-256: `a30b9bdb175136f3d55ea72e4f71d26c5ca3e8d405f602a1d336374fdacaa01a`
- Tracked worktree after authoring: clean

## Cheap evaluation

Result: **PASS**

- The real module package normalizer accepted the canonical envelope and its
  `0.17.0` compatibility floor.
- JSON parsing and module-code syntax passed.
- Declared permissions exactly match the calls used:
  `content:add_locale` for `registerLocaleEntries` and
  `mechanics:add_combat_technique` for `registerCombatTechnique`.
- No use of `App`, DOM, storage, network, or other unsupported globals was
  found.
- The real Combat Technique V1 normalizer accepted and namespaced all three
  profiles.
- The three target shapes are reachable through the documented Fight
  sub-interaction: one-target damage, split damage capped at three, and one
  supported `stun` profile.
- English and Spanish locale keys use the owning module namespace.

Evidence:

- `docs/modding.md:50-116` — package envelope and manifest rules.
- `docs/modding.md:144-179` — public API and permission boundary.
- `docs/combat-technique-v1.md:10-55` — registration and ownership.
- `docs/combat-technique-v1.md:57-113` — eligibility, area, damage, and status
  vocabulary.
- `docs/combat-technique-v1.md:115-144` — UI discovery, saves, and unload.

## Non-failing observations

- The `0.17.0` minimum is conservative rather than the earliest possible
  compatibility floor.
- Universal Measured Strike at 1.4x damage has no authored drawback and may
  dominate Basic Attack for a single target. This is a balance/productization
  concern, not a contract violation.

## Provisional rubric

| Category | Score |
| --- | ---: |
| Envelope and ownership | 2 |
| Permission discipline | 2 |
| Contract fidelity | 2 |
| Player usefulness | 2 |
| Lifecycle integrity | 2 |
| Evidence quality | 2 |
| **Total** | **12/12** |

Lifecycle is proven by the batched runtime stage.

## Runtime evidence

The batched browser run confirmed install, enable, Fight-profile discovery,
damage/status normalization, queued-technique cleanup on disable, re-enable,
browser-reload restoration, compatible replacement, and deletion. Every
registration remained single-copy and the page reported no runtime errors.

## Classification

No failure classification at the cheap-evaluation stage.
