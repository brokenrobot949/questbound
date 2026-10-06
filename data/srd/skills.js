// The 18 skills and the ability each one uses (SRD 5.2.1, "Skills" table).
// The id is what scenes use, e.g. check("persuasion", 15).

export const skills = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dexterity', source: 'SRD 5.2.1' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'wisdom', source: 'SRD 5.2.1' },
  { id: 'arcana', name: 'Arcana', ability: 'intelligence', source: 'SRD 5.2.1' },
  { id: 'athletics', name: 'Athletics', ability: 'strength', source: 'SRD 5.2.1' },
  { id: 'deception', name: 'Deception', ability: 'charisma', source: 'SRD 5.2.1' },
  { id: 'history', name: 'History', ability: 'intelligence', source: 'SRD 5.2.1' },
  { id: 'insight', name: 'Insight', ability: 'wisdom', source: 'SRD 5.2.1' },
  { id: 'intimidation', name: 'Intimidation', ability: 'charisma', source: 'SRD 5.2.1' },
  { id: 'investigation', name: 'Investigation', ability: 'intelligence', source: 'SRD 5.2.1' },
  { id: 'medicine', name: 'Medicine', ability: 'wisdom', source: 'SRD 5.2.1' },
  { id: 'nature', name: 'Nature', ability: 'intelligence', source: 'SRD 5.2.1' },
  { id: 'perception', name: 'Perception', ability: 'wisdom', source: 'SRD 5.2.1' },
  { id: 'performance', name: 'Performance', ability: 'charisma', source: 'SRD 5.2.1' },
  { id: 'persuasion', name: 'Persuasion', ability: 'charisma', source: 'SRD 5.2.1' },
  { id: 'religion', name: 'Religion', ability: 'intelligence', source: 'SRD 5.2.1' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'dexterity', source: 'SRD 5.2.1' },
  { id: 'stealth', name: 'Stealth', ability: 'dexterity', source: 'SRD 5.2.1' },
  { id: 'survival', name: 'Survival', ability: 'wisdom', source: 'SRD 5.2.1' },
];
