# Multi-Interaction Regression Matrix

This matrix records the accepted actor-target-intent contract. The executable
coverage lives in `app/test/test.js`; this file is the review checklist used to
avoid changing unrelated behavior while hardening group actions.

| Shape | Exploration | Combat | Accepted rule |
| --- | --- | --- | --- |
| One to one | Covered | Covered | Existing single-target effect and cost remain unchanged. |
| One to many | Covered | Covered | One command cost; profiled Fight distributes effect. |
| Many to one | Covered | Covered | Each participant pays once and contributes independently. |
| Many to many | Covered, equal and unequal groups | Covered, queued groups | Every valid actor contributes to every valid marked target in deterministic order. |
| Paired | Covered | Representable | Explicit ordered pairs are preserved and are never inferred merely from equal counts. |
| Mutual | Covered | Covered through party targets | Identical actor/target sets use mutual semantics rather than self-attacking pairs. |

Required edge coverage is locked for mixed party/local targets, partial
actor-target overlap, self-included Feed/Fight/Feast, stale selections,
unreachable targets, already-full Feed targets, queued group timing, cancel,
save/load of queued target lists, one cost per actor, and one diminishing
practice award per command. A many-to-many Fight continues in marked order when
an early target falls, and a target that becomes unavailable before queued
resolution is removed without canceling the remaining valid marks or charging
participants twice.

Valid but impossible attempts remain in-world outcomes or correctable selection
states. They do not become application errors, duplicate costs, or silent turn
loss. New action profiles must opt into distribution explicitly; adding a new
intent must not inherit Fight scaling by accident.
