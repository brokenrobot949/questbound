// Quick Start heroes (original): ready-made characters for players who want to begin right
// away, one per class in this build (Rogue and Cleric heroes join when those classes do).
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

      hitPointRolls: [],
      armorId: null,
      shield: false,
    },
    source: 'original',
  },
];
