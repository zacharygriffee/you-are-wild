# Blind Mod Contract Trial Plan

## Purpose

Test whether an unfamiliar authoring agent can create useful modules from the
repository's public doctrine and contract evidence without implementation
coaching. The trials evaluate the discoverability and sufficiency of the mod
contracts; they are not an invitation to change core code when an authored mod
does not work.

The first ten trials cover the player-facing content, mechanics, UI, narrative
consumer, localization, and presentation contracts. Two provider trials are
held back as infrastructure stretch work.

## Experimental Boundary

Each author receives:

- one player-facing brief from this plan;
- read-only access to the repository at the same baseline revision;
- permission to inspect public doctrine, examples, tests, and maintained source;
- an isolated output directory for its module and author note.

Each author does not receive:

- the evaluator contract map or expected permission list;
- advice copied from another trial;
- another author's output or evaluation;
- fixes suggested during authoring;
- permission to edit core source or tests.

Start each author with fresh conversation context. Preserve the exact initial
prompt and do not answer authoring questions during a run. An author may report
that the brief exceeds the public contract; a well-evidenced refusal is a valid
and potentially valuable result.

## Workstation Operating Envelope

The default is one active author at a time. A second author may run only when
neither author is building, testing, or driving a browser and the machine has
comfortable memory headroom. Parallel local validation is never allowed.

- Reuse the main repository and its existing dependencies as read-only evidence.
  Do not make a full repository or `node_modules` copy per trial.
- Give every author a separate artifact directory outside maintained source.
- Do not run watchers, development servers, Playwright, or `npm run full-build`
  during authoring.
- Permit cheap file searches and syntax checks during authoring.
- Run at most one Node test process, build, or browser process at a time.
- Close the browser between validation batches if memory pressure persists.
- Treat rising swap use, sustained input lag, or less than roughly 1.5 GiB of
  available memory as a signal to return to fully sequential work.

The coordinator should remain lightweight while an author runs. It records the
prompt and result, but does not simultaneously run another local evaluation.

## Baseline And Trial Storage

Before the first trial:

1. Review and checkpoint the recovered baseline changes separately from all
   trial artifacts.
2. Confirm the checkpoint passes the normal full build once.
3. Record its revision, game version, Node version, and doctrine revision.
4. Create ignored trial storage with one directory per trial:
   `brief.txt`, `submission/`, `author-note.md`, and `evaluation.md`.
5. Confirm authors cannot write to maintained source paths.

Trial artifacts remain outside the product tree while authoring and evaluation
are active. After a wave closes, the coordinator may deliberately preserve an
exact, hashed evidence archive under `docs/mod-contract-trials/`; archival does
not productize the mod. A failed trial must not leave partial source, test,
generated distribution, or installed-module changes in the baseline.

## Trial Waves

### Pilot: three independent contract shapes

Run these first and stop for a pilot review:

1. **School of Steel**
2. **Field Journal**
3. **Courier's Trail**

They sample declarative mechanics, bounded UI, and integrated item/quest
content. Continue only if the protocol itself is working and failures can be
classified without coaching the authors.

### Wave 2: identity and linked mechanics

4. **Mosskin Origins**
5. **Sap Circle**

Sap Circle is evaluated against an enabled Mosskin Origins submission, but its
author may inspect only the declared dependency surface, not the first author's
notes or evaluation.

### Wave 3: lifecycle and boundary pressure

6. **Ghost Road**
7. **Ashen Fen Ecology**
8. **Northern Tongues**

This wave emphasizes save continuity, unload behavior, dependency handling, and
the difference between a public contribution seam and unsupported world
control.

### Wave 4: presentation and optional narration

9. **Wildlife Portrait Pack**
10. **Campfire Storyteller**

Run these after the gameplay trials because asset and optional-provider
validation require more setup and browser attention.

### Stretch: trusted infrastructure

11. **Local Narrator Bridge**
12. **Local Asset Shelf**

Do not begin these until the ten core trials have been reviewed. Provider
adapters have a larger trust and lifecycle surface and are not needed to answer
whether ordinary mod authors can use the gameplay contracts.

## Blind Author Briefs

Only the relevant paragraph below is copied into an author's prompt.

### 1. School of Steel

Create a module that adds three useful Fight techniques: a precise
single-target move, a limited multi-target move, and a move that applies an
existing status. Make each technique discoverable to eligible characters and
safe across save, reload, disable, and re-enable.

### 2. Field Journal

Create a module that adds a roster badge, a creature-details section, and a
system utility summarizing public information about the current party and
location. It must remain useful on desktop and mobile and disappear cleanly
when disabled.

### 3. Courier's Trail

Create a module that adds courier supplies, a recoverable courier satchel, and
a quest that reliably makes the satchel obtainable near its destination.
Include an appropriate reward and player-visible event narration. The quest
must remain coherent across save, reload, disable, and re-enable.

### 4. Mosskin Origins

Create a module that adds a playable and encounter-capable Mosskin species, a
Mosskin origin choice, and a small species-appropriate perk path. All
player-visible contributions should be localizable and lifecycle-safe.

### 5. Sap Circle

Create a module for Mosskin Origins that gives eligible Mosskin a renewable sap
reserve and a contextual way to share sap with another creature. The reserve
must survive saving, regenerate through an appropriate existing game trigger,
and never be spent before an attempted action commits.

### 6. Ghost Road

Create a module that adds an alternative defeat-recovery journey in which the
player returns through an ethereal pilgrimage. Explain the active mode clearly
in the UI, provide appropriate narrative beats, and preserve a coherent state
through save, reload, disable, and re-enable.

### 7. Ashen Fen Ecology

Create a module that contributes an Ashen Fen biome definition, compatible
encounter life, and useful observation text. Be precise about what the module
can and cannot guarantee concerning where the biome appears in an existing
world.

### 8. Northern Tongues

Create a selectable language pack translating the player-visible
contributions from Courier's Trail, Mosskin Origins, and Sap Circle. It must
handle missing, disabled, obsolete, or re-enabled target modules without
breaking the active language.

### 9. Wildlife Portrait Pack

Create a code-free presentation pack that replaces emoji presentation for a
small, coherent set of existing creatures. Missing art, unsupported states,
disable, and re-enable must fall back safely without changing gameplay.

### 10. Campfire Storyteller

Create a module that publishes optional prose for completed scene exchanges.
It must retain a deterministic non-AI presentation path and may optionally use
a user-selected existing text-provider connection. Generated prose must never
become authoritative game state, and outstanding work must stop safely on
unload or game-state replacement.

### 11. Local Narrator Bridge

Create a trusted-local module that registers a selectable text-generation
provider for narration modules. Credentials and provider internals must not
enter manifests, saves, logs, public context, or ordinary module settings.

### 12. Local Asset Shelf

Create a trusted-local module that exposes reviewed local asset bundles through
an owned media source/store. Consumers must receive bounded leases rather than
persistent internal paths, and every owned role and lease must clean up on
disable.

## Evaluator Contract Map

Do not expose this section to authors during their run.

| Trial | Expected primary contracts |
| --- | --- |
| School of Steel | Combat Technique V1; locale entries; eligibility, targeting, damage, multi-target, status, save, and unload rules |
| Field Journal | `ui.read`; UI Contribution V1; bounded public context; settings and contribution cleanup |
| Courier's Trail | Item Definition V2; Quest Contract V2; Quest World Directives V1; locale entries; Scene Feed templates |
| Mosskin Origins | Species Profile V1; creation-option persistence; Perk Profile V1; locale entries |
| Sap Circle | Resource Ledger V1; Feed or Play Action Variant; locale entries; Scene Feed; save and commit ordering |
| Ghost Road | Recovery Mode V1; UI Contribution V1; locale entries; Scene Feed; documented defeat/recovery hooks |
| Ashen Fen Ecology | `world:add_biome`; Species Profile V1 encounter entries; supported legacy content-template key; placement boundary |
| Northern Tongues | Locale Pack V1; declared/versioned targets; namespace, fallback, dependency, and unload behavior |
| Wildlife Portrait Pack | Asset Bundle V1; Sprite Pack V1; `media:read`; resource validation, leases, fallbacks, and unload |
| Campfire Storyteller | `scene:read_narrative`; `scene:narrate`; optional `ai:request`; provider-connection setting; narration orchestration and cancellation |
| Local Narrator Bridge | `ai:provide`; provider adapter, connection, credential, ownership, and unload boundaries |
| Local Asset Shelf | `media:provide`; Media Source/Store adapter, lease, ownership, and unload boundaries |

Across the suite, also evaluate the canonical package envelope, minimum-version
claim, content posture, minimal permissions, deterministic behavior, hook
ownership, settings ownership, origin declarations, and install/replacement/
delete lifecycle.

## Per-Trial Procedure

### Authoring stage

1. Create the isolated trial directory and save the exact blind prompt.
2. Start one fresh author with repository read access and write access only to
   that trial's `submission/` and `author-note.md`.
3. Ask for a complete installable artifact plus a short note naming evidence
   used, assumptions made, and anything the public contracts prevented.
4. Do not provide corrections. End the authoring stage when the author submits
   or explicitly refuses the unsupported portion.
5. Snapshot the submission before evaluation.

### Cheap evaluation stage

Run these serially without a browser:

1. Parse every JSON artifact and verify the canonical package envelope.
2. Compare declared permissions with APIs actually used.
3. Check namespace ownership, dependency and minimum-version claims, content
   rating, origins, and runtime declarations.
4. Search for unsupported globals, DOM access, direct save mutation, arbitrary
   callbacks, credentials, remote hard dependencies, and undocumented fields.
5. Verify every advertised player option has a plausible documented execution
   route.
6. Record doctrine and test evidence supporting each judgment.

Do not repair the submission. If a small mechanical correction would make it
work, record that fact as an evaluation result.

### Batched runtime stage

After two or three cheap evaluations:

1. Build the unchanged baseline once if the last verified build is no longer
   current.
2. Open one browser session and install only the reviewed batch.
3. Exercise install, enable, representative use, save/reload, disable,
   re-enable, compatible replacement, deletion, and dependency loss where
   applicable.
4. Check affected desktop and mobile surfaces in the same session.
5. Return the browser and installed-module state to baseline before the next
   batch.

Use mocked or local deterministic provider behavior. Never add real provider
credentials to a trial.

### Final regression stage

After all accepted runtime checks, run the repository's full build once,
followed by the branding audit and diff checks. Trial artifacts must not alter
the generated application unless an operator has separately approved
productization.

## Evaluation Rubric

Score each category from 0 to 2:

1. **Envelope and ownership** — valid package, stable namespaces, honest
   versions and dependencies.
2. **Permission discipline** — every used capability declared, no unused or
   invented permission.
3. **Contract fidelity** — documented schemas and boundaries followed without
   reliance on internal state.
4. **Player usefulness** — the brief produces a reachable, understandable
   contribution rather than inert labels.
5. **Lifecycle integrity** — install, save/reload, unload, replacement, and
   dependency behavior remain coherent.
6. **Evidence quality** — author can identify the doctrine or contract evidence
   behind important choices and limitations.

A score of 10–12 is a clean pass, 7–9 is a useful near-pass, and 0–6 is a
failure. Regardless of score, any core-code edit, credential exposure,
authoritative AI mutation, or deliberate bypass of a permission boundary is a
hard failure.

## Failure Classification

Every failure should receive exactly one primary classification:

- **Doctrine gap** — the public rule is absent, contradictory, or misleading.
- **Evidence discovery gap** — the rule exists but is unreasonably difficult to
  locate from the brief.
- **Contract/runtime defect** — documented behavior does not match the runtime.
- **Unsupported brief** — the correct result was to narrow or refuse part of
  the requested behavior.
- **Author reasoning error** — sufficient accessible evidence existed and the
  submission contradicted it.
- **Protocol contamination** — prior answers, evaluator guidance, shared files,
  or baseline drift influenced the result.

Do not change doctrine after one failure. Complete the current wave against the
same baseline, then distinguish a repeatable documentation problem from a
single author error.

## Pilot Exit Decision

Review the pilot before scheduling the remaining trials. Continue when:

- all three authors stayed inside their isolated output directories;
- at least two submissions reach runtime evaluation without core changes;
- failures can be classified from preserved evidence;
- the workstation completed authoring and one batched browser session without
  disruptive memory pressure;
- the protocol did not require live coaching.

If the workstation struggles, retain the same experiment and reduce activity:
one author per session, cheap evaluation immediately afterward, and one browser
batch after every three completed submissions. Do not reduce evidentiary
quality or skip lifecycle cases merely to create more parallelism.

## Completion Record

The suite is complete when every scheduled trial has:

- its exact blind prompt and baseline revision;
- the original submission and author note;
- a scored evaluation with cited repository evidence;
- a runtime result or a recorded reason runtime evaluation was unsafe or
  unnecessary;
- one primary failure classification where applicable;
- no unexplained change to maintained application source.

Only after the suite is closed should successful submissions be discussed as
candidate game additions. Productization is a separate reviewed change, not
part of the blind trial.
