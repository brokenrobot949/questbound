// Quick Start heroes (original): ready-made characters for players who want to begin right
// away, one per class in this build (a Rogue joins when that class does).
// Only choices are stored; the sheet works out every number from them and the rules data.
// Safe to edit, as long as the choices stay legal: tests/rules.html checks every hero here.

export const quickStartHeroes = [
  {
    id: 'wren',
    summary: 'A soldier with a steady shield arm and a sharp tongue, home from a war nobody won.',
    character: {
      name: 'Wren Ashdown',
      level: 1,
      classId: 'fighter',
      subclassId: null, // chosen at level 3
      speciesId: 'human',
      size: 'medium',
      speciesChoice: null, // Humans have no ancestry or lineage to pick
      spellcastingAbility: null,
      backgroundId: 'soldier',

      // Standard Array (15, 14, 13, 12, 10, 8), then the Soldier's +2 Strength and +1 Constitution.
      abilityScoreMethod: 'standard-array',
      baseAbilityScores: { strength: 15, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 10, charisma: 13 },
      backgroundIncreases: { strength: 2, constitution: 1 },

      classSkills: ['persuasion', 'perception'], // two from the Fighter list
      speciesSkills: ['insight'], // the Human's Skillful trait
      featSkills: [], // only used by the Skilled feat
      originFeat: 'alert', // the Human's Versatile trait
      classChoices: { fightingStyle: 'defense' },

      drive: 'justice',
      bond: { type: 'sibling', name: 'Kit Ashdown' },
      startingEquipment: { class: 'A', background: 'A' }, // the kits, not the gold
      spells: null, // Fighters have no Spellcasting feature
      magicInitiate: [], // only for Magic Initiate feats
      look: { skin: 'peach', hairStyle: 'tousled', hairColor: 'auburn', beard: false, outfit: 'red', accent: 'brown', headgear: 'none' },

      hitPointRolls: [], // levels after 1; null means "took the fixed value"
      armorId: 'chain-mail',
      shield: false,
    },
    source: 'original',
  },
  {
    id: 'juniper',
    summary: 'A rock gnome scholar who reads ruins like other people read letters, and talks to her books.',
    character: {
      name: 'Juniper Tinderbell',
      level: 1,
      classId: 'wizard',
      subclassId: null,
      speciesId: 'gnome',
      size: 'small',
      speciesChoice: 'rock-gnome',
      spellcastingAbility: 'intelligence', // for the Rock Gnome's cantrips
      backgroundId: 'sage',

      // The Wizard's suggested Standard Array, then the Sage's +2 Intelligence and +1 Constitution.
      abilityScoreMethod: 'standard-array',
      baseAbilityScores: { strength: 8, dexterity: 12, constitution: 13, intelligence: 15, wisdom: 14, charisma: 10 },
      backgroundIncreases: { intelligence: 2, constitution: 1 },

      classSkills: ['insight', 'investigation'], // the Sage already gives Arcana and History
      speciesSkills: [],
      featSkills: [],
      originFeat: null,
      classChoices: {},

      drive: 'knowledge',
      bond: { type: 'mentor', name: 'Orrin Mossbottom' },
      startingEquipment: { class: 'A', background: 'A' },
      // Three cantrips and six level 1 spells in the spellbook, four of them prepared. Detect
      // Magic and Comprehend Languages are rituals, so she can cast them from the book.
      spells: {
        cantrips: ['fire-bolt', 'light', 'mage-hand'],
        spellbook: ['comprehend-languages', 'detect-magic', 'mage-armor', 'magic-missile', 'shield', 'sleep'],
        prepared: ['mage-armor', 'magic-missile', 'shield', 'sleep'],
      },
      // The Sage's Magic Initiate (Wizard). Her Rock Gnome cantrips are Mending and Prestidigitation.
      magicInitiate: [{ source: 'background', list: 'wizard', ability: 'intelligence', cantrips: ['minor-illusion', 'ray-of-frost'], spell: 'thunderwave' }],
      look: { skin: 'peach', hairStyle: 'long', hairColor: 'blonde', beard: false, outfit: 'sky', accent: 'red', headgear: 'none' },

      hitPointRolls: [],
      armorId: null,
      shield: false,
    },
    source: 'original',
  },
  {
    id: 'posy',
    summary: 'A halfling priest who patches up strangers on the road, and puts the fear of the gods into the dead.',
    character: {
      name: 'Posy Hearthstone',
      level: 1,
      classId: 'cleric',
      subclassId: null, // chosen at level 3
      speciesId: 'halfling',
      size: 'small',
      speciesChoice: null,
      spellcastingAbility: null,
      backgroundId: 'acolyte',

      // The Cleric's suggested Standard Array, then the Acolyte's +2 Wisdom and +1 Charisma.
      abilityScoreMethod: 'standard-array',
      baseAbilityScores: { strength: 14, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 15, charisma: 12 },
      backgroundIncreases: { wisdom: 2, charisma: 1 },

      classSkills: ['medicine', 'persuasion'], // the Acolyte already gives Insight and Religion
      speciesSkills: [],
      featSkills: [],
      originFeat: null,
      // Thaumaturge: one extra cantrip (Light), and her Wisdom added to Religion and Arcana.
      classChoices: { divineOrder: 'thaumaturge' },

      drive: 'faith',
      bond: { type: 'mentor', name: 'Mother Wenna Brightwater' },
      startingEquipment: { class: 'A', background: 'A' }, // chain shirt, Shield, mace, Holy Symbol
      // Four cantrips (three, plus Thaumaturge's), and four level 1 spells prepared from the
      // Cleric list. The Acolyte's Magic Initiate (Cleric) adds two more cantrips and Healing
      // Word, free once per Long Rest.
      spells: {
        cantrips: ['guidance', 'sacred-flame', 'thaumaturgy', 'light'],
        spellbook: [], // a Cleric has none
        prepared: ['bless', 'cure-wounds', 'guiding-bolt', 'sanctuary'],
      },
      magicInitiate: [{ source: 'background', list: 'cleric', ability: 'wisdom', cantrips: ['spare-the-dying', 'mending'], spell: 'healing-word' }],
      look: { skin: 'tan', hairStyle: 'tousled', hairColor: 'brown', beard: false, outfit: 'white', accent: 'yellow', headgear: 'none' },

      hitPointRolls: [],
      armorId: 'chain-shirt',
      shield: true,
    },
    source: 'original',
  },
];
