// Feats (SRD 5.2.1) that the current phase needs: the Origin feats (from backgrounds and the
// Human's Versatile trait), the Fighting Style feats (from the Fighter's Fighting Style), and
// the Ability Score Improvement (a General feat, from level 4).
//
// At level 4 a hero takes the Ability Score Improvement or another feat they qualify for: any
// General feat whose level they've reached, any Origin feat, or (with the Fighting Style
// feature) a Fighting Style feat. A feat can be taken once, unless it's `repeatable`.
// (Grappler, the SRD's other level 4 General feat, waits until grappling is in fights.)
//
// Fields the character sheet uses:
//   summary                a line about what it does, for the level-up screen (original)
//   prerequisiteLevel      the character level a General feat needs
//   scoreIncrease          { points, perAbility }: ability score points to share out, at most
//                          perAbility to any one score, and never above 20 (the Ability Score
//                          Improvement: +2 to one score, or +1 to two)
//   initiativeProficiency  add the Proficiency Bonus to Initiative (Alert)
//   armoredAcBonus         bonus to AC while wearing Light, Medium or Heavy armour (Defense)
//   skillChoices           number of skills (or tools) the player picks (Skilled)

export const feats = [
  {
    id: 'alert',
    name: 'Alert',
    summary: 'Add your Proficiency Bonus to Initiative rolls.',
    category: 'origin',
    initiativeProficiency: true,
    text: 'Initiative Proficiency: when you roll Initiative, you can add your Proficiency Bonus to the roll. Initiative Swap: immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can’t make this swap if you or the ally has the Incapacitated condition.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'magic-initiate',
    name: 'Magic Initiate',
    summary: 'Two cantrips and a level 1 spell from a spell list you choose. The spell is free once per Long Rest.',
    category: 'origin',
    repeatable: true,
    spellLists: ['cleric', 'druid', 'wizard'],
    text: 'Two Cantrips: you learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat’s spells (choose when you select this feat). Level 1 Spell: choose a level 1 spell from the same list. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have. Spell Change: whenever you gain a new level, you can replace one of the spells you chose for this feat with a different spell of the same level from the chosen spell list.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'savage-attacker',
    name: 'Savage Attacker',
    summary: 'Once a turn, roll a weapon’s damage dice twice and use the better roll.',
    category: 'origin',
    text: 'You’ve trained to deal particularly damaging strikes. Once per turn when you hit a target with a weapon, you can roll the weapon’s damage dice twice and use either roll against the target.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'skilled',
    name: 'Skilled',
    summary: 'Proficiency in three skills of your choice.',
    category: 'origin',
    repeatable: true,
    skillChoices: 3,
    text: 'You gain proficiency in any combination of three skills or tools of your choice.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'ability-score-improvement',
    name: 'Ability Score Improvement',
    summary: '+2 to one ability score, or +1 to two. No score can go above 20.',
    category: 'general',
    prerequisiteLevel: 4,
    repeatable: true,
    scoreIncrease: { points: 2, perAbility: 2 },
    text: 'Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can’t increase an ability score above 20.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'archery',
    name: 'Archery',
    summary: '+2 to attack rolls with Ranged weapons.',
    category: 'fighting-style',
    text: 'You gain a +2 bonus to attack rolls you make with Ranged weapons.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'defense',
    name: 'Defense',
    summary: '+1 to Armor Class while you wear armour.',
    category: 'fighting-style',
    armoredAcBonus: 1,
    text: 'While you’re wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'great-weapon-fighting',
    name: 'Great Weapon Fighting',
    summary: 'With a two-handed melee weapon, treat a 1 or 2 on a damage die as a 3.',
    category: 'fighting-style',
    text: 'When you roll damage for an attack you make with a Melee weapon that you are holding with two hands, you can treat any 1 or 2 on a damage die as a 3. The weapon must have the Two-Handed or Versatile property to gain this benefit.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'two-weapon-fighting',
    name: 'Two-Weapon Fighting',
    summary: 'Add your ability modifier to the damage of a Light weapon’s extra attack.',
    category: 'fighting-style',
    text: 'When you make an extra attack as a result of using a weapon that has the Light property, you can add your ability modifier to the damage of that attack if you aren’t already adding it to the damage.',
    source: 'SRD 5.2.1',
  },
];
