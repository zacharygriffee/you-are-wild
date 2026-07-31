# Mod Contract Trial Evidence

This directory preserves completed authoring experiments as evidence about the
public mod contract. It does not make the submissions built-in modules or
recommend them for productization.

The pilot was originally run on the baseline recorded in `BASELINE.md` using
ignored, isolated author directories. The archived submissions and author
notes here are byte-for-byte copies of those blind outputs: every SHA-256 entry
under `pilot/*/submission.sha256` still verifies.

## Evidence labels

- **contract-authored** — a fresh author received only the saved brief and
  public repository evidence, then produced the preserved package and note.
- **static-checked** — JSON, package shape, direct API use, permissions,
  runtime declarations, credential boundaries, and lifecycle metadata passed
  non-browser review. The current check is:

  ```bash
  node docs/mod-author-kit/tools/validate-module.mjs \
    docs/mod-contract-trials/pilot/*/submission/*.yawmod.json
  ```

- **runtime-tested** — the preserved Playwright harness installed and enabled
  the package, exercised representative behavior, save/reload, disable,
  re-enable, replacement, and deletion on the recorded pilot baseline. See
  `pilot/runtime-report.md`.

These labels are cumulative only when their named evidence exists. Static
validation on a newer checkout does not retroactively prove browser behavior
on that checkout; rerun `pilot/runtime-check.js` after building the standalone
HTML when current-runtime evidence is required.

## Pilot archive

Each numbered directory contains:

- the exact blind brief;
- the original installable package;
- the original author note;
- SHA-256 integrity records;
- the evaluator's scored review.

`pilot/pilot-summary.md` and `pilot/runtime-report.md` are historical results
from the original run. Their recommendation to continue the experiment is not
an instruction to expose a new contract, ship a mod, or begin commerce work.

The trial protocol remains in `../mod-contract-trial-plan.md`.
