# Harm Intent, Consent, and Witnessed Hostility V1

Status: **preserved design proposal; implementation decisions remain open**

Recovered from the uncommitted 0.19.0 release-candidate backlog notes. This
proposal extends the existing threat reactions and Companion Bond V1; it does
not declare a shared threat-event contract implemented or authorize new module
permissions, saved schemas, or gameplay transitions during patch maintenance.

The current companion baseline is documented in `companion-behavior-v2.md` and
`combat-agency-v1-decision.md`. The design questions below must be resolved
against named scenarios before any implementation or contract expansion.

Create a shared, moddable threat-event contract instead of teaching individual
action handlers that one named action is hostile. A committed action profile
should declare whether it carries harm intent, its threatened consequence, and
whether the threat occurred on attempt, contact, or actual harm. Core remains
the authority for legal reactions and disposition changes; narration and an
optional AI controller may explain or select only among those bounded results.

The current partial baseline already lets a directly attacked non-hostile and
socially connected same-species, pack, herd, or swarm creatures flee or turn
hostile, and applies that reaction to a living Chew survivor. Extend the
contract consistently to resisted swallowing and every other action with
declared harm intent. An unsuccessful attack can still be a credible threat;
zero damage must not automatically erase the target's or witnesses' knowledge
of the attempt.

Do not make every predatory or damaging contact unconditionally hostile.
Define explicit, inspectable exceptions rather than inferring consent from an
animation or favorable outcome:

- a creature may explicitly welcome, request, or knowingly accept the action;
- a Slurpable or regenerating body profile may make a bite nonfatal, but that
  capability alone does not necessarily grant consent;
- sufficiently high Spirit may support willingness to be eaten, but decide
  whether Spirit is itself consent, only one input, or must be paired with a
  current authored willingness state;
- mutual sparring, care, rescue, possession effects, coercion, prior hostility,
  or authored species/relationship rules may need their own visible meanings;
- party members need bounded Bond, refusal, departure, defense, and possible
  hostility outcomes rather than silently sharing ordinary encounter logic.

Witness reactions must use saved world facts. Eligible observers are present
on the same tile or in the same room, can perceive the event, and have an
authored relationship, party, faction, herd, pack, kin, or other taxonomy link
to the threatened creature. For example, attacking one member of a deerfolk
herd or wolfkin pack should normally make the connected local group recognize
the attacker as a threat. Witnesses may defend, become hostile, flee, warn
others, or decline involvement according to their temperament, relationship,
condition, interests, and witnessed history; shared species by itself should
not silently imply universal allegiance once richer affiliations exist.

Optional AI may choose a reaction from the canonical legal candidates using
only facts the creature knows or observed. It may not invent witnesses,
consent, relationships, action outcomes, or disposition mutations. Provider
failure must use a deterministic fallback derived from the same saved inputs.

Persist a bounded provenance record sufficient to reproduce and explain the
transition: instigator, target, action and harm-intent profile, attempted and
actual consequences, consent/willingness state, eligible witnesses, location,
time, chosen reaction, and reason. Save/reload must not duplicate, forget, or
re-roll the event, and group hostility must keep combat queues, tile occupants,
party membership, selection, narration, and world persistence synchronized.

Before implementation, decide with named scenarios:

- which attempts count as harm intent and at what resolution phase;
- whether the default direct response is hostility, flight, or a temperament-
  weighted choice;
- the exact Spirit and explicit-consent boundary for Chew, Slurp, swallowing,
  and other potentially harmful interactions;
- how affiliation strength and perception bound witness propagation;
- how party-member refusal, defense of another, departure, and hostility use
  Companion Bond without collapsing Bond into disposition;
- whether hostility is encounter-only aggression or a persistent relationship
  change, and how apology, restitution, time, or later events may repair it.
