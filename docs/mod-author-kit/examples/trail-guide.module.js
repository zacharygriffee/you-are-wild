MODS.addSpecies({
  id: 'moss_hare',
  name: 'Moss Hare',
  icon: '🐇',
  desc: 'A cautious hare camouflaged by living moss.',
  profile: {
    version: 1,
    baseStats: {
      MPun: 70,
      MPle: 90,
      Figh: 6,
      Feas: 7,
      Flir: 8,
      Fuck: 7,
      Flee: 16,
      Feed: 9,
      hunger: 35,
      str: 6,
      con: 9,
      spd: 16,
      int: 8,
      wis: 12,
      cha: 9
    },
    size: 2,
    difficulty: 1,
    bodyParts: ['fangs'],
    abilities: {
      small: true,
      fastFlee: true
    },
    temperament: {
      timid: true,
      prey: true
    },
    canon: {
      sapience: 'animal',
      bodyPlan: 'quadruped',
      baselineInteraction: 'animal',
      adultEligibility: 'ineligible',
      interactionEligibility: {
        social: true,
        combat: true,
        feed: true,
        feast: true,
        sensitiveSocial: false
      },
      traits: ['moss-camouflaged', 'crepuscular']
    },
    encounters: [
      {
        biome: 'forest',
        table: 'friendly',
        weight: 8
      },
      {
        biome: 'grove',
        table: 'friendly',
        weight: 5
      }
    ]
  }
});

MODS.addItem({
  id: 'trail_token',
  name: 'Mossbound Trail Token',
  type: 'quest',
  purpose: 'quest',
  stackable: false,
  icon: '🍃',
  desc: 'A protected token marking a safe moss-hare trail.',
  value: 0
});

MODS.addQuestTemplate({
  id: 'follow_the_moss',
  title: 'Follow the Moss',
  description: 'Recover a trail token placed near a quiet grove.',
  acquisition: {
    structures: ['cabin', 'camp']
  },
  turnInPolicy: {
    type: 'original_giver'
  },
  objectives: [{
    id: 'recover_token',
    type: 'recover',
    item: {
      definitionId: 'trail_guide:trail_token',
      quantity: 1
    },
    required: 1,
    label: 'Recover the Mossbound Trail Token'
  }],
  worldDirectives: [{
    id: 'place_token',
    type: 'place',
    content: {
      kind: 'item',
      id: 'trail_guide:trail_token'
    },
    count: 1,
    distance: {
      min: 2,
      max: 5
    },
    biomes: ['grove', 'forest'],
    objectiveId: 'recover_token',
    locationLabel: 'Moss-hare trail'
  }],
  reward: {
    xp: 12,
    gold: 8
  }
});

MODS.registerUiContribution('system.utilities', 'trail_guide_about', {
  label: 'Trail Guide',
  description: 'Review what the Trail Guide pack adds.',
  icon: '🍃',
  tone: 'info',
  onInvoke(context) {
    return {
      title: 'Trail Guide',
      description: 'Adds Moss Hares and a small trail-token quest.',
      rows: [
        {
          label: 'Current mode',
          value: context.mode
        },
        {
          label: 'Works offline',
          value: 'Yes'
        }
      ]
    };
  }
});

MODS.log('Trail Guide enabled.');
