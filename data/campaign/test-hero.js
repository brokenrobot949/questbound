// A stand-in hero for testing, until character creation exists (the next Phase 1 slices).
// Only choices are stored; the sheet works out every number from them and the rules data.
// Safe to edit, as long as the choices stay legal (tests/rules.html checks this hero).

export const testHero = {
  name: 'Wren Ashdown',
  level: 1,
  classId: 'fighter',
  subclassId: null, // chosen at level 3: 'champion'
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

  hitPointRolls: [], // levels after 1; null means "took the fixed value"
  armorId: 'chain-mail',
  shield: false,

  source: 'original',
};
