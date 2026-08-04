# You Are Wild Mod Author Kit

Portable contract snapshot for authoring modules without access to the game
source repository.

## Snapshot

- Game version: `0.18.1` select-group alpha patch candidate
- Module API: `1`
- Executable package type: `yaw-module`
- Executable package version: `1`
- Trust boundary: `trusted-local`
- Asset package type: `yaw-asset-bundle`
- Asset package version: `1`

This directory is self-contained. An authoring agent should not need the game
source, internal globals, generated HTML, or private tests to produce a
contract-conforming module. If a requested feature is absent from this kit, it
is not a current mod capability.

To hand the kit to another agent, start that agent with
`AGENT-INSTRUCTIONS.md` plus the player-facing brief. The instruction file
defines the deliverables and prevents static contract authoring from being
misreported as runtime testing.

## Authority

Within this portable kit, use this order:

1. `contract-index.json` for whether a capability exists and which permission
   it requires.
2. The focused contract file named by that entry.
3. `01-package-runtime-and-lifecycle.md` for package, ownership, settings,
   hooks, and lifecycle rules shared by every module.
4. Templates and examples.

Do not infer a capability from a field retained in an old package, from a
planned feature name, or from general JavaScript/browser access. All executable
modules are reviewed same-page code, but only `MODS` is a stable authoring API.

## Reading route

1. Read `01-package-runtime-and-lifecycle.md`.
2. Find the desired capability in `contract-index.json`.
3. Read only the relevant focused file:
   - `02-content-contracts.md`
   - `03-mechanics-contracts.md`
   - `04-ui-scene-narration-ai.md`
   - `05-media-and-presentation.md`
4. Consult `06-inventories.md` for exact tokens.
5. Choose a release layout from `07-recipes-and-file-structure.md`.
6. Start with a file under `templates/`.
7. Finish with `08-author-checklist.md`.

## Four questions every module must answer

1. What stable player-facing contribution does it add?
2. Which documented permission and API make that contribution reachable?
3. What deterministic or bounded state owns the result?
4. What happens on disable, reload, dependency loss, replacement, and delete?

A module that cannot answer all four is not complete.

## Current boundaries

- Executable modules are trusted-local, not sandboxed.
- Modules cannot mutate arbitrary save data or core application state.
- Narration and generated media are presentation-only.
- AI and media providers are optional infrastructure, never deterministic
  gameplay requirements.
- Asset URLs and provider connection IDs are session handles and must not be
  treated as durable paths.
- Biome Recipe V1 is the only general geography-placement seam; other
  registered definitions are not placement promises.
- There is no public arbitrary structure, landmark, route, interior, crafting,
  video, 3D, shader, CSS, or filesystem contract. Audio Pack V1 is restricted
  to code-free semantic cues backed by owned bundle resources.
- Unknown permissions, hooks, schema fields, enum values, and ownership
  collisions reject installation or enablement.

## Deliverables expected from an authoring agent

- One canonical installable `.yawmod.json`.
- Readable JavaScript source when the module contains non-trivial code.
- For media: one separate `bundle.json` and its exact referenced assets.
- A README with installation, dependencies, fallback, and removal behavior.
- A license and asset provenance.
- An author note naming the contracts used, assumptions made, and unsupported
  portions refused.

The installable package embeds executable code as a string. Keep readable
source as the reviewable authoring form and generate or copy it exactly into
`module.code`.

## Validate a package

The kit includes a dependency-free static validator that works when this
directory is copied away from the game repository:

```bash
node tools/validate-module.mjs my-module.yawmod.json
node tools/validate-module.mjs --json my-module.yawmod.json
node tools/validate-module.mjs --strict my-module.yawmod.json
```

It checks package shape, manifest tokens, permission declarations against
direct `MODS` calls, lifecycle metadata, serializability, credential-shaped
data, and unsupported runtime reach-through. It never evaluates module code.

This is `static-checked` evidence only. A passing report does not prove that
the module has been installed, activated, exercised in a browser, or tested
across save/load and disable/delete lifecycle transitions.
