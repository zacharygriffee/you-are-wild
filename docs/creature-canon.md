# Creature Canon

This doctrine defines the default creature canon for baseline interactable species. It is a safety and mechanics contract: creatures that participate in social, party, quest, merchant, recruit, or mature-capable interaction systems are sapient/person-like by default, not ordinary animals.

## Default Baseline

The default baseline for interactable species is human-level sentience. A baseline species should read as a person-like fantasy being with self-awareness, communication, agency, and social participation comparable to a human character, even when its appearance is nonhuman.

Default/core species should be framed as one of these broad categories:

- humanoid
- beastfolk or anthro people
- monsterfolk
- plantfolk
- spiritfolk
- construct-person
- other clearly sapient fantasy/person-like beings

Species names and compact icons can remain shorthand, but descriptive text, creature cards, encounter summaries, and future generated copy should make personhood clear where ambiguity would otherwise make a species read as an ordinary animal.

## Metadata Direction

Default species data should gain explicit metadata instead of relying on names, icons, or inferred intent. The target shape is:

- `sapience`: whether the species is a person-like actor, ordinary animal, spirit, construct, or another explicit category.
- `bodyPlan`: whether the species is humanoid, anthro, beastfolk, monsterfolk, plantlike, animal, or another supported body plan.
- `interactionEligibility`: the interaction eligibility contract for social, party, quest, merchant, recruit, combat, feed, feast, and mature-capable systems.

Recommended starter values:

```js
{
  sapience: 'person',
  bodyPlan: 'beastfolk',
  interactionEligibility: {
    social: true,
    party: true,
    quest: true,
    merchant: true,
    recruit: true,
    mature: true
  }
}
```

The field names may be refined during implementation, but the model should preserve the same meaning: baseline interactable creatures are sapient/person-like, their body plan is explicit, and sensitive interaction eligibility is gated by metadata.

## Ordinary Animal Classifications

Ordinary animal classifications are not part of the default interactable canon. They are mod opt-in content with stronger gating and should be excluded from sensitive interaction types by default.

A mod that introduces `sapience: 'animal'` or `bodyPlan: 'animal'` should also provide explicit gating rules and should not inherit social, party, recruit, merchant, or mature-capable eligibility from the default baseline. Ordinary animal support should be treated as a separate classification path for ecology, ambience, mounts, livestock-like mechanics, or other local rules that do not imply person-like interaction eligibility.

## Implementation Notes

- Keep default/base species eligible for social and mature-capable systems only when their metadata marks them as sapient/person-like.
- Prefer labels such as `folk`, `kin`, `person`, `beastfolk`, `monsterfolk`, or `sapient fantasy creature` where a plain species name could be misread as an ordinary animal.
- Add audits before broad data migration so default adult-capable/interactable species cannot remain plain animals without sapient/person-like metadata.
- Keep this doctrine SFW. It describes classification, safety boundaries, and mechanics gating without expanding explicit content.
