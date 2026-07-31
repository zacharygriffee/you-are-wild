# Blind Mod Contract Pilot Summary

> Historical record: this decision closed the original pilot on its recorded
> baseline. It does not by itself authorize another trial wave or productize
> any submitted module.

## Decision

**PROCEED to Wave 2**, beginning with **Mosskin Origins** and then **Sap
Circle**, under the same sequential, resource-conscious protocol.

The pilot exit criteria were satisfied:

- Three independent authors received only their saved blind briefs plus access
  to repository doctrine and contract evidence.
- No author received live coaching, another submission, or evaluator findings.
- All authors stayed inside their assigned ignored trial directory; the tracked
  worktree remained clean.
- All three artifacts passed the cheap contract review and the batched browser
  lifecycle run.
- Every original artifact and author note still matches its recorded SHA-256
  digest.
- The recovered baseline passed the exact final `npm run full-build`, including
  viewport and combat-interaction checks.
- Branding, whitespace, tracked-diff, and working-tree audits passed.

## Results

| Trial | Contract surfaces exercised | Score | Runtime |
| --- | --- | ---: | --- |
| School of Steel | locale entries, combat techniques | 12/12 | PASS |
| Field Journal | public UI context, UI contributions | 12/12 | PASS |
| Courier's Trail | items, quests, world directives | 12/12 | PASS |

Together, the three trials covered the pilot's main contract families:
package envelope and ownership, exact permission mapping, registration
namespacing, core-owned UI, content definitions, quest graphs, deterministic
world placement, persistence, disable/re-enable, reload, compatible
replacement, and deletion.

## Workstation finding

This workstation can support the trial program when it runs one author at a
time and one browser process for the batched runtime stage. The completed
three-author pilot did not require concurrent agents or per-author full builds.
At the end of the run, approximately 1.8 GiB of memory remained available and
swap retained approximately 7.5 GiB free.

One first combined final-regression attempt reached the viewport test before
the module database was ready and failed there. The viewport lane passed when
rerun alone, and a subsequent exact full build passed every lane. This is
recorded as a low-resource startup-readiness race in the existing test, not as
a mod submission failure.

## Wave 2 operating limits

- Keep author trials strictly sequential.
- Continue snapshotting each submission and author note before evaluation.
- Run cheap evaluation after each author.
- Do not run a full build per author.
- Batch browser runtime validation after two accepted submissions.
- Keep browser and build workloads separate from author runs.
- Stop the wave if tracked files change, isolation cannot be preserved, or
  repeated resource failures prevent trustworthy runtime evidence.

## Productization cautions

No pilot artifact is promoted or productized by this decision. If any are
considered later:

- Review School of Steel's Measured Strike balance before shipping.
- Decide whether Field Journal needs localized player-facing text.
- Preserve Courier's Trail's honest boundary: it uses supported quest effects,
  existing routes, and guaranteed placement rather than claiming custom world
  structures or route generation.
