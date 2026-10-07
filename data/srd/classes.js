// Classes (SRD 5.2.1). Only what the current phase needs: the Fighter and the Wizard at
// levels 1–3. More classes and levels are added as each phase needs them.
//
// Numbers per level are in `levels` (index 0 is level 1). Feature text is in `features`.
// Item ids in starting equipment match the equipment data (armour is in data/srd/armor.js;
// weapons and gear arrive with combat).

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
      spellbookAtLevel1: 6, // level 1 Wizard spells in the starting spellbook
      spellbookPerLevel: 2, // spells added each Wizard level after 1
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
];
