// Backgrounds (SRD 5.2.1). A background lists three abilities: increase one by 2 and a
// different one by 1, or all three by 1 (none above 20). It also gives an Origin feat, two
// skills, a tool, and a choice of equipment (A) or 50 GP (B).

export const backgrounds = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    abilities: ['intelligence', 'wisdom', 'charisma'],
    feat: { id: 'magic-initiate', spellList: 'cleric' },
    skills: ['insight', 'religion'],
    tool: 'calligraphers-supplies',
    equipment: [
      {
        option: 'A',
        items: [
          { id: 'calligraphers-supplies', quantity: 1 },
          { id: 'book-prayers', quantity: 1 },
          { id: 'holy-symbol', quantity: 1 },
          { id: 'parchment', quantity: 10 },
          { id: 'robe', quantity: 1 },
        ],
        gold: 8,
      },
      { option: 'B', items: [], gold: 50 },
    ],
    source: 'SRD 5.2.1',
  },
  {
    id: 'criminal',
    name: 'Criminal',
    abilities: ['dexterity', 'constitution', 'intelligence'],
    feat: { id: 'alert' },
    skills: ['sleight-of-hand', 'stealth'],
    tool: 'thieves-tools',
    equipment: [
      {
        option: 'A',
        items: [
          { id: 'dagger', quantity: 2 },
          { id: 'thieves-tools', quantity: 1 },
          { id: 'crowbar', quantity: 1 },
          { id: 'pouch', quantity: 2 },
          { id: 'travelers-clothes', quantity: 1 },
        ],
        gold: 16,
      },
      { option: 'B', items: [], gold: 50 },
    ],
    source: 'SRD 5.2.1',
  },
  {
    id: 'sage',
    name: 'Sage',
    abilities: ['constitution', 'intelligence', 'wisdom'],
    feat: { id: 'magic-initiate', spellList: 'wizard' },
    skills: ['arcana', 'history'],
    tool: 'calligraphers-supplies',
    equipment: [
      {
        option: 'A',
        items: [
          { id: 'quarterstaff', quantity: 1 },
          { id: 'calligraphers-supplies', quantity: 1 },
          { id: 'book-history', quantity: 1 },
          { id: 'parchment', quantity: 8 },
          { id: 'robe', quantity: 1 },
        ],
        gold: 8,
      },
      { option: 'B', items: [], gold: 50 },
    ],
    source: 'SRD 5.2.1',
  },
  {
    id: 'soldier',
    name: 'Soldier',
    abilities: ['strength', 'dexterity', 'constitution'],
    feat: { id: 'savage-attacker' },
    skills: ['athletics', 'intimidation'],
    tool: 'gaming-set', // the player chooses one kind of Gaming Set
    equipment: [
      {
        option: 'A',
        items: [
          { id: 'spear', quantity: 1 },
          { id: 'shortbow', quantity: 1 },
          { id: 'arrow', quantity: 20 },
          { id: 'gaming-set', quantity: 1 },
          { id: 'healers-kit', quantity: 1 },
          { id: 'quiver', quantity: 1 },
          { id: 'travelers-clothes', quantity: 1 },
        ],
        gold: 14,
      },
      { option: 'B', items: [], gold: 50 },
    ],
    source: 'SRD 5.2.1',
  },
];
