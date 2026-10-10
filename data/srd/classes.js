// Classes (SRD 5.2.1). Only what the current phase needs: the Fighter, the Wizard, the Cleric
// and the Rogue at levels 1–3. More classes and levels are added as each phase needs them.
//
// Numbers per level are in `levels` (index 0 is level 1). Feature text is in `features`.
// Item ids in starting equipment match the equipment data (armour is in data/srd/armor.js;
// weapons and gear arrive with combat).
//
// weaponProficiencies   kinds of weapon: 'simple', 'martial'
// martialWeaponsWith    (the Rogue) Martial weapons with any of these properties also count
// toolProficiencies     tools from data/srd/equipment.js
//
// spellcasting: the class's Spellcasting feature.
//   ability       the spellcasting ability
//   spellbook     the Wizard: { atLevel1, perLevel } spells in the spellbook; prepared spells
//                 come from the book
//   preparesFrom  'list' for the Cleric: prepared spells come straight from the class's
//                 whole spell list (of levels it has slots for)
// Per level: cantrips, preparedSpells, slots (per spell level, starting with level 1), uses of
// limited features (secondWindUses, actionSurgeUses, channelDivinity), and weaponMasteries
// (how many kinds of weapon get Weapon Mastery; see data/srd/weapon-masteries.js).

export const classes = [
  {
    id: 'fighter',
    name: 'Fighter',
    primaryAbilities: ['strength', 'dexterity'],
    hitDie: 10,
    hitPointsAtLevel1: 10, // plus Constitution modifier
    hitPointsPerLevel: 6, // the fixed value you can take instead of rolling, plus Constitution modifier
    savingThrows: ['strength', 'constitution'],
    skillChoices: {
      count: 2,
      from: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'],
    },
    weaponProficiencies: ['simple', 'martial'],
    armorTraining: ['light', 'medium', 'heavy', 'shield'],
    startingEquipment: [
      {
        option: 'A',
        items: [
          { id: 'chain-mail', quantity: 1 },
          { id: 'greatsword', quantity: 1 },
          { id: 'flail', quantity: 1 },
          { id: 'javelin', quantity: 8 },
          { id: 'dungeoneers-pack', quantity: 1 },
        ],
        gold: 4,
      },
      {
        option: 'B',
        items: [
          { id: 'studded-leather-armor', quantity: 1 },
          { id: 'scimitar', quantity: 1 },
          { id: 'shortsword', quantity: 1 },
          { id: 'longbow', quantity: 1 },
          { id: 'arrow', quantity: 20 },
          { id: 'quiver', quantity: 1 },
          { id: 'dungeoneers-pack', quantity: 1 },
        ],
        gold: 11,
      },
      { option: 'C', items: [], gold: 155 },
    ],
    // The SRD's suggested Standard Array for this class.
    standardArray: { strength: 15, dexterity: 14, constitution: 13, intelligence: 8, wisdom: 10, charisma: 12 },
    levels: [
      { level: 1, features: ['fighting-style', 'second-wind', 'weapon-mastery'], secondWindUses: 2, weaponMasteries: 3 },
      { level: 2, features: ['action-surge', 'tactical-mind'], secondWindUses: 2, weaponMasteries: 3, actionSurgeUses: 1 },
      { level: 3, features: ['fighter-subclass'], secondWindUses: 2, weaponMasteries: 3, actionSurgeUses: 1 },
    ],
    features: {
      'fighting-style': {
        name: 'Fighting Style',
        text: 'You have honed your martial prowess and gain a Fighting Style feat of your choice. Defense is recommended. Whenever you gain a Fighter level, you can replace the feat you chose with a different Fighting Style feat.',
      },
      'second-wind': {
        name: 'Second Wind',
        text: 'You have a limited well of physical and mental stamina that you can draw on. As a Bonus Action, you can use it to regain Hit Points equal to 1d10 plus your Fighter level. You can use this feature twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.',
      },
      'weapon-mastery': {
        name: 'Weapon Mastery',
        text: 'Your training with weapons allows you to use the mastery properties of three kinds of Simple or Martial weapons of your choice. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices.',
      },
      'action-surge': {
        name: 'Action Surge',
        text: "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action. Once you use this feature, you can't do so again until you finish a Short or Long Rest.",
      },
      'tactical-mind': {
        name: 'Tactical Mind',
        text: "You have a mind for tactics on and off the battlefield. When you fail an ability check, you can expend a use of your Second Wind to push yourself toward success. Rather than regaining Hit Points, you roll 1d10 and add the number rolled to the ability check, potentially turning it into a success. If the check still fails, this use of Second Wind isn't expended.",
      },
      'fighter-subclass': {
        name: 'Fighter Subclass',
        text: "You gain a Fighter subclass of your choice. A subclass is a specialization that grants you features at certain Fighter levels. For the rest of your career, you gain each of your subclass's features that are of your Fighter level or lower.",
      },
    },
    subclasses: [
      {
        id: 'champion',
        name: 'Champion',
        summary: 'Pursue physical excellence in combat.',
        levels: [{ level: 3, features: ['improved-critical', 'remarkable-athlete'] }],
        features: {
          'improved-critical': {
            name: 'Improved Critical',
            text: 'Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.',
          },
          'remarkable-athlete': {
            name: 'Remarkable Athlete',
            text: 'Thanks to your athleticism, you have Advantage on Initiative rolls and Strength (Athletics) checks. In addition, immediately after you score a Critical Hit, you can move up to half your Speed without provoking Opportunity Attacks.',
          },
        },
        source: 'SRD 5.2.1',
      },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'wizard',
    name: 'Wizard',
    primaryAbilities: ['intelligence'],
    hitDie: 6,
    hitPointsAtLevel1: 6,
    hitPointsPerLevel: 4,
    savingThrows: ['intelligence', 'wisdom'],
    skillChoices: {
      count: 2,
      from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'],
    },
    weaponProficiencies: ['simple'],
    armorTraining: [],
    startingEquipment: [
      {
        option: 'A',
        items: [
          { id: 'dagger', quantity: 2 },
          { id: 'quarterstaff', quantity: 1 }, // used as an Arcane Focus
          { id: 'robe', quantity: 1 },
          { id: 'spellbook', quantity: 1 },
          { id: 'scholars-pack', quantity: 1 },
        ],
        gold: 5,
      },
      { option: 'B', items: [], gold: 55 },
    ],
    standardArray: { strength: 8, dexterity: 12, constitution: 13, intelligence: 15, wisdom: 14, charisma: 10 },
    spellcasting: {
      ability: 'intelligence',
      // atLevel1: level 1 Wizard spells in the starting spellbook; perLevel: spells added
      // each Wizard level after 1
      spellbook: { atLevel1: 6, perLevel: 2 },
    },
    // slots: spell slots per spell level, starting with level 1 spells.
    levels: [
      { level: 1, features: ['spellcasting', 'ritual-adept', 'arcane-recovery'], cantrips: 3, preparedSpells: 4, slots: [2] },
      { level: 2, features: ['scholar'], cantrips: 3, preparedSpells: 5, slots: [3] },
      { level: 3, features: ['wizard-subclass'], cantrips: 3, preparedSpells: 6, slots: [4, 2] },
    ],
    features: {
      spellcasting: {
        name: 'Spellcasting',
        text: 'Intelligence is your spellcasting ability. You know three Wizard cantrips, and your spellbook starts with six level 1 Wizard spells; you add two Wizard spells to it each time you gain a Wizard level. You prepare spells from your spellbook (four at level 1) and can change the list whenever you finish a Long Rest. You regain all expended spell slots when you finish a Long Rest. You can use an Arcane Focus or your spellbook as a Spellcasting Focus.',
      },
      'ritual-adept': {
        name: 'Ritual Adept',
        text: "You can cast any spell as a Ritual if that spell has the Ritual tag and the spell is in your spellbook. You needn't have the spell prepared, but you must read from the book to cast a spell in this way.",
      },
      'arcane-recovery': {
        name: 'Arcane Recovery',
        text: "You can regain some of your magical energy by studying your spellbook. When you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to no more than half your Wizard level (round up), and none of the slots can be level 6 or higher. Once you use this feature, you can't do so again until you finish a Long Rest.",
      },
      scholar: {
        name: 'Scholar',
        text: 'While studying magic, you also specialized in another field of study. Choose one of the following skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill.',
      },
      'wizard-subclass': {
        name: 'Wizard Subclass',
        text: "You gain a Wizard subclass of your choice. A subclass is a specialization that grants you features at certain Wizard levels. For the rest of your career, you gain each of your subclass's features that are of your Wizard level or lower.",
      },
    },
    // Skills the Scholar feature can give Expertise in.
    scholarSkills: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'],
    subclasses: [
      {
        id: 'evoker',
        name: 'Evoker',
        summary: 'Create explosive elemental effects.',
        levels: [{ level: 3, features: ['evocation-savant', 'potent-cantrip'] }],
        features: {
          'evocation-savant': {
            name: 'Evocation Savant',
            text: 'Choose two Wizard spells from the Evocation school, each of which must be no higher than level 2, and add them to your spellbook for free. In addition, whenever you gain access to a new level of spell slots in this class, you can add one Wizard spell from the Evocation school to your spellbook for free.',
          },
          'potent-cantrip': {
            name: 'Potent Cantrip',
            text: "Your damaging cantrips affect even creatures that avoid the brunt of the effect. When you cast a cantrip at a creature and you miss with the attack roll or the target succeeds on a saving throw against the cantrip, the target takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip.",
          },
        },
        source: 'SRD 5.2.1',
      },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'cleric',
    name: 'Cleric',
    primaryAbilities: ['wisdom'],
    hitDie: 8,
    hitPointsAtLevel1: 8,
    hitPointsPerLevel: 5,
    savingThrows: ['wisdom', 'charisma'],
    skillChoices: {
      count: 2,
      from: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    },
    weaponProficiencies: ['simple'],
    armorTraining: ['light', 'medium', 'shield'],
    startingEquipment: [
      {
        option: 'A',
        items: [
          { id: 'chain-shirt', quantity: 1 },
          { id: 'shield', quantity: 1 },
          { id: 'mace', quantity: 1 },
          { id: 'holy-symbol', quantity: 1 }, // the Cleric's Spellcasting Focus
          { id: 'priests-pack', quantity: 1 },
        ],
        gold: 7,
      },
      { option: 'B', items: [], gold: 110 },
    ],
    standardArray: { strength: 14, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 15, charisma: 12 },
    spellcasting: { ability: 'wisdom', preparesFrom: 'list' },
    // channelDivinity: uses of Channel Divinity (it arrives at level 2).
    levels: [
      { level: 1, features: ['spellcasting', 'divine-order'], cantrips: 3, preparedSpells: 4, slots: [2] },
      { level: 2, features: ['channel-divinity'], cantrips: 3, preparedSpells: 5, slots: [3], channelDivinity: 2 },
      { level: 3, features: ['cleric-subclass'], cantrips: 3, preparedSpells: 6, slots: [4, 2], channelDivinity: 2 },
    ],
    features: {
      spellcasting: {
        name: 'Spellcasting',
        text: 'Wisdom is your spellcasting ability. You know three Cleric cantrips; Guidance, Sacred Flame and Thaumaturgy are recommended. You prepare level 1+ spells straight from the Cleric spell list (four at level 1, one more at each of levels 2 and 3), choosing only spells of levels you have slots for, and can change the list whenever you finish a Long Rest. You regain all expended spell slots when you finish a Long Rest. You can use a Holy Symbol as a Spellcasting Focus.',
      },
      'divine-order': {
        name: 'Divine Order',
        text: 'You have dedicated yourself to one of the following sacred roles of your choice. Protector: trained for battle, you gain proficiency with Martial weapons and training with Heavy armor. Thaumaturge: you know one extra cantrip from the Cleric spell list, and your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks equal to your Wisdom modifier (minimum of +1).',
      },
      'channel-divinity': {
        name: 'Channel Divinity',
        text: 'You can channel divine energy directly from the Outer Planes to fuel magical effects, and you use this feature twice; you regain one use when you finish a Short Rest and all of them when you finish a Long Rest. If an effect requires a saving throw, the DC is your Cleric spell save DC. Divine Spark: as a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and roll 1d8 + your Wisdom modifier. You either restore that many Hit Points to the creature, or it makes a Constitution saving throw, taking Necrotic or Radiant damage (your choice) equal to the total on a failed save, or half as much on a success. Turn Undead: as a Magic action, you present your Holy Symbol and censure Undead creatures. Each Undead of your choice within 30 feet of you makes a Wisdom saving throw. On a failed save, it has the Frightened and Incapacitated conditions for 1 minute, and tries to move as far from you as it can on its turns. This ends early on a creature if it takes any damage, if you have the Incapacitated condition, or if you die.',
      },
      'cleric-subclass': {
        name: 'Cleric Subclass',
        text: 'You gain a Cleric subclass of your choice. A subclass is a specialization that grants you features at certain Cleric levels. For the rest of your career, you gain each of your subclass’s features that are of your Cleric level or lower.',
      },
    },
    // The roles the Divine Order feature offers at level 1 (classChoices.divineOrder).
    //   weaponProficiencies, armorTraining   added to the class's own
    //   extraCantrips                        added to the cantrips the class knows
    //   checkBonus                           { skills, ability, minimum }: added to those checks
    divineOrders: [
      {
        id: 'protector',
        name: 'Protector',
        summary: 'Trained for battle: Martial weapons and Heavy armor.',
        weaponProficiencies: ['martial'],
        armorTraining: ['heavy'],
      },
      {
        id: 'thaumaturge',
        name: 'Thaumaturge',
        summary: 'One extra cantrip, and your Wisdom modifier (at least +1) added to Arcana and Religion checks.',
        extraCantrips: 1,
        checkBonus: { skills: ['arcana', 'religion'], ability: 'wisdom', minimum: 1 },
      },
    ],
    subclasses: [
      {
        id: 'life',
        name: 'Life Domain',
        summary: 'Soothe the hurts of the world.',
        levels: [{ level: 3, features: ['disciple-of-life', 'life-domain-spells', 'preserve-life'] }],
        // Spells always prepared from this Cleric level on (they don't count against the
        // number of spells you prepare).
        domainSpells: [{ level: 3, spells: ['aid', 'bless', 'cure-wounds', 'lesser-restoration'] }],
        features: {
          'disciple-of-life': {
            name: 'Disciple of Life',
            text: 'When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot’s level.',
          },
          'life-domain-spells': {
            name: 'Life Domain Spells',
            text: 'Your connection to this divine domain ensures you always have certain spells ready. From Cleric level 3 you always have Aid, Bless, Cure Wounds and Lesser Restoration prepared.',
          },
          'preserve-life': {
            name: 'Preserve Life',
            text: 'As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself (which can include you), and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum.',
          },
        },
        source: 'SRD 5.2.1',
      },
    ],
    source: 'SRD 5.2.1',
  },

  {
    id: 'rogue',
    name: 'Rogue',
    primaryAbilities: ['dexterity'],
    hitDie: 8,
    hitPointsAtLevel1: 8,
    hitPointsPerLevel: 5,
    savingThrows: ['dexterity', 'intelligence'],
    skillChoices: {
      count: 4,
      from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight-of-hand', 'stealth'],
    },
    // Simple weapons, and Martial weapons that have one of these properties.
    weaponProficiencies: ['simple'],
    martialWeaponsWith: ['finesse', 'light'],
    toolProficiencies: ['thieves-tools'],
    armorTraining: ['light'],
    startingEquipment: [
      {
        option: 'A',
        items: [
          { id: 'leather-armor', quantity: 1 },
          { id: 'dagger', quantity: 2 },
          { id: 'shortsword', quantity: 1 },
          { id: 'shortbow', quantity: 1 },
          { id: 'arrow', quantity: 20 },
          { id: 'quiver', quantity: 1 },
          { id: 'thieves-tools', quantity: 1 },
          { id: 'burglars-pack', quantity: 1 },
        ],
        gold: 8,
      },
      { option: 'B', items: [], gold: 100 },
    ],
    standardArray: { strength: 12, dexterity: 15, constitution: 13, intelligence: 14, wisdom: 10, charisma: 8 },
    // sneakAttack: the Sneak Attack dice; expertise: how many skills have Expertise.
    levels: [
      { level: 1, features: ['expertise', 'sneak-attack', 'thieves-cant', 'weapon-mastery'], sneakAttack: '1d6', weaponMasteries: 2, expertise: 2 },
      { level: 2, features: ['cunning-action'], sneakAttack: '1d6', weaponMasteries: 2, expertise: 2 },
      { level: 3, features: ['rogue-subclass', 'steady-aim'], sneakAttack: '2d6', weaponMasteries: 2, expertise: 2 },
    ],
    features: {
      expertise: {
        name: 'Expertise',
        text: 'You gain Expertise in two of your skill proficiencies of your choice. Sleight of Hand and Stealth are recommended if you have proficiency in them. At Rogue level 6, you gain Expertise in two more of your skill proficiencies of your choice.',
      },
      'sneak-attack': {
        name: 'Sneak Attack',
        text: 'You know how to strike subtly and exploit a foe’s distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack roll if you have Advantage on the roll and the attack uses a Finesse or a Ranged weapon. The extra damage’s type is the same as the weapon’s type. You don’t need Advantage on the attack roll if at least one of your allies is within 5 feet of the target, the ally doesn’t have the Incapacitated condition, and you don’t have Disadvantage on the attack roll. The extra damage increases as you gain Rogue levels: 2d6 at level 3.',
      },
      'thieves-cant': {
        name: 'Thieves’ Cant',
        text: 'You picked up various languages in the communities where you plied your roguish talents. You know Thieves’ Cant and one other language of your choice, which you choose from the language tables in “Character Creation.”',
      },
      'weapon-mastery': {
        name: 'Weapon Mastery',
        text: 'Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Daggers and Shortbows. Whenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Scimitars and Shortswords.',
      },
      'cunning-action': {
        name: 'Cunning Action',
        text: 'Your quick thinking and agility allow you to move and act quickly. On your turn, you can take one of the following actions as a Bonus Action: Dash, Disengage, or Hide.',
      },
      'rogue-subclass': {
        name: 'Rogue Subclass',
        text: 'You gain a Rogue subclass of your choice. A subclass is a specialization that grants you features at certain Rogue levels. For the rest of your career, you gain each of your subclass’s features that are of your Rogue level or lower.',
      },
      'steady-aim': {
        name: 'Steady Aim',
        text: 'As a Bonus Action, you give yourself Advantage on your next attack roll on the current turn. You can use this feature only if you haven’t moved during this turn, and after you use it, your Speed is 0 until the end of the current turn.',
      },
    },
    subclasses: [
      {
        id: 'thief',
        name: 'Thief',
        summary: 'Hunt for treasure as a classic adventurer.',
        levels: [{ level: 3, features: ['fast-hands', 'second-story-work'] }],
        features: {
          'fast-hands': {
            name: 'Fast Hands',
            text: 'As a Bonus Action, you can do one of the following. Sleight of Hand: make a Dexterity (Sleight of Hand) check to pick a lock or disarm a trap with Thieves’ Tools or to pick a pocket. Use an Object: take the Utilize action, or take the Magic action to use a magic item that requires that action.',
          },
          'second-story-work': {
            name: 'Second-Story Work',
            text: 'You’ve trained to get into especially hard-to-reach places, granting you these benefits. Climber: you gain a Climb Speed equal to your Speed. Jumper: you can determine your jump distance using your Dexterity rather than your Strength.',
          },
        },
        source: 'SRD 5.2.1',
      },
    ],
    source: 'SRD 5.2.1',
  },
];
