# Evaluation: Courier's Trail

## Submission integrity

- Artifact SHA-256: `af3b4a22f3f1d88d400e3019759894f236a4154245110872b9bd9f9eeb7ff206`
- Author-note SHA-256: `27f4eaa4a28d479798ae70a1d5b1360f3082b32a00fe570b372e08b0766e2ca8`
- Tracked worktree after authoring: clean

## Cheap evaluation

Result: **PASS**

- The real module package normalizer accepted the canonical envelope and its
  `0.16.0` compatibility floor.
- JSON parsing and module-code syntax passed.
- Declared permissions exactly match the calls used: `content:add_item` for
  three items and `content:add_quest` for the quest template.
- No use of `App`, DOM, storage, network, hooks, or other unsupported globals
  was found.
- The real Item Effects validator accepted the healing, trade, and inert quest
  item definitions.
- The real Quest Contract V2 normalizers accepted the five-stage graph, allowed
  events and log effects, owned quest-item identity, and one bounded `place`
  directive.
- The `general` and `traveler` merchant tables and `cabin` and `camp` quest
  routes exist in the current baseline.
- Required content uses guaranteed placement rather than a probability boost,
  and the module does not claim unsupported structure or route generation.

Evidence:

- `docs/modding.md:50-116` — package envelope and manifest rules.
- `docs/modding.md:144-179` — item and quest permissions.
- `docs/modding.md:181-348` — Item Definition V2 and Quest Contract V2.
- `docs/quest-world-directives-v1.md:1-48` — guaranteed placement.
- `docs/quest-world-directives-v1.md:70-96` — lifecycle and world-control
  boundary.
- `app/src/core/quest-contract.js:146-213` — stage graph vocabulary and bounds.
- `app/src/core/quest-contract.js:216-338` — content and directive validation.
- `app/src/core/app.js:656-666` — existing merchant tables.
- `app/src/core/app.js:1148-1159` — existing cabin and camp quest routes.

## Non-failing observations

- Event narration is supplied through supported quest-stage Activity Log
  effects and core quest Scene Beats, rather than custom Scene Feed templates.
- The module intentionally offers supplies through existing structures and
  tables; it does not create a courier office or world route.

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

The batched browser run confirmed install, enable, exact item and route
placement counts, quest acceptance, authored-stage advancement, reachable
satchel placement, save-DTO serialization, issued-quest retention across
provider disable, re-enable, browser-reload restoration, compatible
replacement, and deletion. Every owned contribution remained single-copy and
the page reported no runtime errors.

## Classification

No failure classification at the cheap-evaluation stage.
