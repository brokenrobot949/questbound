// Species (SRD 5.2.1). Every species is Humanoid.
//
// Fields the character sheet uses:
//   sizes        the sizes a player can pick (most species have one)
//   speed        walking speed in feet
//   darkvision   range in feet (0 = none)
//   hitPointsPerLevel   extra Hit Points per character level (Dwarven Toughness)
//   resistances  damage types resisted
//   skillChoice  { count, from } skills the player picks one of (null = any skill)
//   originFeat   true if the species gives an Origin feat of the player's choice
//   choice       a named option the player picks (ancestry, lineage or legacy), with its own
//                effects: speed, darkvision, resistances, cantrips and spells at levels 3 and 5
// Spell ids refer to spells that arrive with the spells data.

export const species = [
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    sizes: ['medium'],
    speed: 30,
    darkvision: 60,
    choice: {
      id: 'ancestry',
      name: 'Draconic Ancestry',
      options: [
        { id: 'black', name: 'Black', damageType: 'acid' },
        { id: 'blue', name: 'Blue', damageType: 'lightning' },
        { id: 'brass', name: 'Brass', damageType: 'fire' },
        { id: 'bronze', name: 'Bronze', damageType: 'lightning' },
        { id: 'copper', name: 'Copper', damageType: 'acid' },
        { id: 'gold', name: 'Gold', damageType: 'fire' },
        { id: 'green', name: 'Green', damageType: 'poison' },
        { id: 'red', name: 'Red', damageType: 'fire' },
        { id: 'silver', name: 'Silver', damageType: 'cold' },
        { id: 'white', name: 'White', damageType: 'cold' },
      ],
    },
    traits: [
      { name: 'Draconic Ancestry', text: 'Your lineage stems from a dragon progenitor. Your choice of dragon affects your Breath Weapon and Damage Resistance traits as well as your appearance.' },
      { name: 'Breath Weapon', text: 'When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a Dexterity saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus). On a failed save, a creature takes 1d10 damage of the type determined by your Draconic Ancestry trait. On a successful save, a creature takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10). You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.' },
      { name: 'Damage Resistance', text: 'You have Resistance to the damage type determined by your Draconic Ancestry trait.' },
      { name: 'Darkvision', text: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Draconic Flight', level: 5, text: 'When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you retract the wings (no action required) or have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Once you use this trait, you can’t use it again until you finish a Long Rest.' },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'dwarf',
    name: 'Dwarf',
    sizes: ['medium'],
    speed: 30,
    darkvision: 120,
    hitPointsPerLevel: 1,
    resistances: ['poison'],
    traits: [
      { name: 'Darkvision', text: 'You have Darkvision with a range of 120 feet.' },
      { name: 'Dwarven Resilience', text: 'You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition.' },
      { name: 'Dwarven Toughness', text: 'Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.' },
      { name: 'Stonecunning', text: 'As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this Tremorsense. The stone can be natural or worked. You can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.' },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'elf',
    name: 'Elf',
    sizes: ['medium'],
    speed: 30,
    darkvision: 60,
    skillChoice: { count: 1, from: ['insight', 'perception', 'survival'] },
    spellcastingAbilityChoice: true, // Intelligence, Wisdom or Charisma for lineage spells
    choice: {
      id: 'lineage',
      name: 'Elven Lineage',
      options: [
        { id: 'drow', name: 'Drow', darkvision: 120, cantrip: 'dancing-lights', level3Spell: 'faerie-fire', level5Spell: 'darkness' },
        { id: 'high-elf', name: 'High Elf', cantrip: 'prestidigitation', level3Spell: 'detect-magic', level5Spell: 'misty-step' },
        { id: 'wood-elf', name: 'Wood Elf', speed: 35, cantrip: 'druidcraft', level3Spell: 'longstrider', level5Spell: 'pass-without-trace' },
      ],
    },
    traits: [
      { name: 'Darkvision', text: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Elven Lineage', text: 'You are part of a lineage that grants you supernatural abilities. Drow: your Darkvision increases to 120 feet and you know Dancing Lights. High Elf: you know Prestidigitation, and can swap it for another Wizard cantrip after a Long Rest. Wood Elf: your Speed increases to 35 feet and you know Druidcraft. At character levels 3 and 5 you learn a higher-level spell from your lineage; you always have it prepared and can cast it once per Long Rest without a spell slot.' },
      { name: 'Fey Ancestry', text: 'You have Advantage on saving throws you make to avoid or end the Charmed condition.' },
      { name: 'Keen Senses', text: 'You have proficiency in the Insight, Perception, or Survival skill.' },
      { name: 'Trance', text: 'You don’t need to sleep, and magic can’t put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.' },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'gnome',
    name: 'Gnome',
    sizes: ['small'],
    speed: 30,
    darkvision: 60,
    spellcastingAbilityChoice: true,
    choice: {
      id: 'lineage',
      name: 'Gnomish Lineage',
      options: [
        { id: 'forest-gnome', name: 'Forest Gnome', cantrip: 'minor-illusion', alwaysPrepared: 'speak-with-animals' },
        { id: 'rock-gnome', name: 'Rock Gnome', cantrips: ['mending', 'prestidigitation'] },
      ],
    },
    traits: [
      { name: 'Darkvision', text: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Gnomish Cunning', text: 'You have Advantage on Intelligence, Wisdom, and Charisma saving throws.' },
      { name: 'Gnomish Lineage', text: 'Forest Gnome: you know Minor Illusion and always have Speak with Animals prepared, castable without a slot a number of times equal to your Proficiency Bonus per Long Rest. Rock Gnome: you know Mending and Prestidigitation, and can spend 10 minutes casting Prestidigitation to build a Tiny clockwork device (up to three at a time, each lasting 8 hours).' },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'goliath',
    name: 'Goliath',
    sizes: ['medium'],
    speed: 35,
    darkvision: 0,
    choice: {
      id: 'ancestry',
      name: 'Giant Ancestry',
      options: [
        { id: 'cloud', name: 'Cloud’s Jaunt (Cloud Giant)', text: 'As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.' },
        { id: 'fire', name: 'Fire’s Burn (Fire Giant)', text: 'When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target.' },
        { id: 'frost', name: 'Frost’s Chill (Frost Giant)', text: 'When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn.' },
        { id: 'hill', name: 'Hill’s Tumble (Hill Giant)', text: 'When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition.' },
        { id: 'stone', name: 'Stone’s Endurance (Stone Giant)', text: 'When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.' },
        { id: 'storm', name: 'Storm’s Thunder (Storm Giant)', text: 'When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.' },
      ],
    },
    traits: [
      { name: 'Giant Ancestry', text: 'You are descended from Giants. You can use your chosen benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.' },
      { name: 'Large Form', level: 5, text: 'Starting at character level 5, you can change your size to Large as a Bonus Action if you’re in a big enough space. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can’t use it again until you finish a Long Rest.' },
      { name: 'Powerful Build', text: 'You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity.' },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'halfling',
    name: 'Halfling',
    sizes: ['small'],
    speed: 30,
    darkvision: 0,
    traits: [
      { name: 'Brave', text: 'You have Advantage on saving throws you make to avoid or end the Frightened condition.' },
      { name: 'Halfling Nimbleness', text: 'You can move through the space of any creature that is a size larger than you, but you can’t stop in the same space.' },
      { name: 'Luck', text: 'When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.' },
      { name: 'Naturally Stealthy', text: 'You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.' },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'human',
    name: 'Human',
    sizes: ['medium', 'small'],
    speed: 30,
    darkvision: 0,
    skillChoice: { count: 1, from: null }, // any skill
    originFeat: true,
    traits: [
      { name: 'Resourceful', text: 'You gain Heroic Inspiration whenever you finish a Long Rest.' },
      { name: 'Skillful', text: 'You gain proficiency in one skill of your choice.' },
      { name: 'Versatile', text: 'You gain an Origin feat of your choice. Skilled is recommended.' },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'orc',
    name: 'Orc',
    sizes: ['medium'],
    speed: 30,
    darkvision: 120,
    traits: [
      { name: 'Adrenaline Rush', text: 'You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus. You can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest.' },
      { name: 'Darkvision', text: 'You have Darkvision with a range of 120 feet.' },
      { name: 'Relentless Endurance', text: 'When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can’t do so again until you finish a Long Rest.' },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'tiefling',
    name: 'Tiefling',
    sizes: ['medium', 'small'],
    speed: 30,
    darkvision: 60,
    spellcastingAbilityChoice: true,
    cantrip: 'thaumaturgy', // Otherworldly Presence
    choice: {
      id: 'legacy',
      name: 'Fiendish Legacy',
      options: [
        { id: 'abyssal', name: 'Abyssal', resistance: 'poison', cantrip: 'poison-spray', level3Spell: 'ray-of-sickness', level5Spell: 'hold-person' },
        { id: 'chthonic', name: 'Chthonic', resistance: 'necrotic', cantrip: 'chill-touch', level3Spell: 'false-life', level5Spell: 'ray-of-enfeeblement' },
        { id: 'infernal', name: 'Infernal', resistance: 'fire', cantrip: 'fire-bolt', level3Spell: 'hellish-rebuke', level5Spell: 'darkness' },
      ],
    },
    traits: [
      { name: 'Darkvision', text: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Fiendish Legacy', text: 'Abyssal: Resistance to Poison damage and the Poison Spray cantrip. Chthonic: Resistance to Necrotic damage and the Chill Touch cantrip. Infernal: Resistance to Fire damage and the Fire Bolt cantrip. At character levels 3 and 5 you learn a higher-level spell from your legacy; you always have it prepared and can cast it once per Long Rest without a spell slot.' },
      { name: 'Otherworldly Presence', text: 'You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy trait.' },
    ],
    source: 'SRD 5.2.1',
  },
];
