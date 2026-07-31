# Instructions for an Authoring Agent

You have everything needed to author against the current public mod contract.
Do not request or inspect the game source. Do not guess how internal runtime
objects work.

## Assignment protocol

Given a player-facing mod brief:

1. Read `README.md` and `01-package-runtime-and-lifecycle.md`.
2. Find each needed capability in `contract-index.json`.
3. Read the focused file named by each capability.
4. Resolve every external identifier through `runtime-inventory.json` or
   `06-inventories.md`.
5. If a requested behavior has no indexed capability, say that portion is not
   currently supported. Do not simulate it with globals, DOM, storage, prose,
   or an invented permission.
6. Choose the smallest permissions and the simplest delivery structure.
7. Author readable source first, then embed exactly that source in the
   canonical package.
8. Apply every item in `08-author-checklist.md`.

## Required output

Return:

```text
submission/
├── <mod-id>.yawmod.json
├── README.md
├── LICENSE
├── AUTHOR-EVIDENCE.md
└── src/
    └── module.js             when executable code is non-trivial
```

Add a separate asset manifest and exact media files only when the mod uses
Asset Bundle V1.

## Evidence language

Use these labels accurately:

- `contract-authored`: derived only from this kit;
- `static-checked`: JSON and JavaScript parsed and contract bounds were
  reviewed;
- `runtime-tested`: installed and exercised in the matching game build;
- `unsupported`: no current indexed capability;
- `unverified`: expected but not actually checked.

Do not call a package runtime-tested merely because it follows the contract.
Do not invent test results.

## Decision rules

- The contract files decide what is allowed; you do not judge hidden runtime
  implementation.
- A copied/read-only context is evidence for presentation, never write
  authority.
- A callback's undocumented second argument is not an API.
- A hook without a focused payload contract is a notification only.
- AI output, media, Scene text, UI text, and logs are never mechanical state.
- Registering content does not imply arbitrary world placement.
- Disabling a module must restore a deterministic playable fallback.
- Fewer permissions and fewer moving parts are better when they fully satisfy
  the brief.

## Final response

State:

1. what the player gets;
2. files delivered;
3. contracts and permissions used;
4. lifecycle/fallback behavior;
5. static checks actually performed;
6. unsupported or unverified portions.
