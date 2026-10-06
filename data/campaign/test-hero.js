// A stand-in hero for Phase 0 testing, until character creation exists.
// Safe to edit: change a score or a skill and reload to see the roll maths change.

export const testHero = {
  id: 'test-hero',
  name: 'Wren Ashdown',
  level: 1,

  // Ability scores as assigned at creation. Modifiers are worked out from these, never stored.
  baseAbilityScores: {
    strength: 10,
    dexterity: 14,
    constitution: 12,
    intelligence: 13,
    wisdom: 8,
    charisma: 16,
  },

  // Skill ids from data/srd/skills.js. Expertise doubles the proficiency bonus for that skill.
  skillProficiencies: ['persuasion', 'insight', 'perception'],
  expertise: [],

  source: 'original',
};
