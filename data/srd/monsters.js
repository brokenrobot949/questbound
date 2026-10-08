// Monsters (SRD 5.2.1). Only the ones the current phase needs; more arrive with each chapter.
//
//   size, type      as in the stat block
//   ac, hp          Armor Class; Hit Points as { average, dice } (monsters use the average)
//   speed           walking speed in feet
//   abilities       the six scores
//   saves           saving throw bonuses (from the stat block's SAVE column)
//   initiative      Initiative bonus
//   cr, xp          Challenge Rating and the XP it's worth
//   attacks         each attack: { id, name, kind: 'melee' | 'ranged' | 'melee-or-ranged',
//                   bonus, reach (feet), range ([normal, long] feet), damage: { dice, bonus, type },
//                   advantageExtra: extra damage dice when the attack had Advantage,
//                   onHit: a condition a hit gives, e.g. { condition: 'prone', maxSize: 'medium' }
//                   for "if the target is Medium or smaller, it has the Prone condition" }
//   traits          rules the game plays, e.g. 'pack-tactics' (Advantage on attacks against a
//                   creature with one of its allies, not Incapacitated, within 5 feet of it)
//   bonusActions    e.g. 'nimble-escape' (Disengage or Hide as a Bonus Action)
//   behaviour       how it fights (original): 'brute' charges the nearest foe; 'skirmisher'
//                   prefers its ranged attack when it can't reach you
//   sprite          which DawnLike sprite draws it (see data/campaign/sprites.js)

export const monsters = [
  {
    id: 'goblin-minion',
    name: 'Goblin Minion',
    size: 'small',
    type: 'Fey (Goblinoid)',
    ac: 12,
    hp: { average: 7, dice: '2d6' },
    speed: 30,
    abilities: { strength: 8, dexterity: 15, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
    saves: { strength: -1, dexterity: 2, constitution: 0, intelligence: 0, wisdom: -1, charisma: -1 },
    initiative: 2,
    skills: { stealth: 6 },
    darkvision: 60,
    passivePerception: 9,
    cr: '1/8',
    xp: 25,
    attacks: [
      { id: 'dagger', name: 'Dagger', kind: 'melee-or-ranged', bonus: 4, reach: 5, range: [20, 60], damage: { dice: '1d4', bonus: 2, type: 'piercing' } },
    ],
    bonusActions: ['nimble-escape'],
    behaviour: 'brute',
    sprite: 'goblin-minion',
    text: 'Nimble Escape. The goblin takes the Disengage or Hide action as a Bonus Action.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'goblin-warrior',
    name: 'Goblin Warrior',
    size: 'small',
    type: 'Fey (Goblinoid)',
    ac: 15,
    hp: { average: 10, dice: '3d6' },
    speed: 30,
    abilities: { strength: 8, dexterity: 15, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
    saves: { strength: -1, dexterity: 2, constitution: 0, intelligence: 0, wisdom: -1, charisma: -1 },
    initiative: 2,
    skills: { stealth: 6 },
    darkvision: 60,
    passivePerception: 9,
    cr: '1/4',
    xp: 50,
    attacks: [
      { id: 'scimitar', name: 'Scimitar', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d6', bonus: 2, type: 'slashing' }, advantageExtra: '1d4' },
      { id: 'shortbow', name: 'Shortbow', kind: 'ranged', bonus: 4, range: [80, 320], damage: { dice: '1d6', bonus: 2, type: 'piercing' }, advantageExtra: '1d4' },
    ],
    bonusActions: ['nimble-escape'],
    behaviour: 'skirmisher',
    sprite: 'goblin-warrior',
    text: 'Nimble Escape. The goblin takes the Disengage or Hide action as a Bonus Action.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'wolf',
    name: 'Wolf',
    size: 'medium',
    type: 'Beast',
    ac: 12,
    hp: { average: 11, dice: '2d8 + 2' },
    speed: 40,
    abilities: { strength: 14, dexterity: 15, constitution: 12, intelligence: 3, wisdom: 12, charisma: 6 },
    saves: { strength: 2, dexterity: 2, constitution: 1, intelligence: -4, wisdom: 1, charisma: -2 },
    initiative: 2,
    skills: { perception: 5, stealth: 4 },
    darkvision: 60,
    passivePerception: 15,
    cr: '1/4',
    xp: 50,
    traits: ['pack-tactics'],
    attacks: [
      { id: 'bite', name: 'Bite', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d6', bonus: 2, type: 'piercing' }, onHit: { condition: 'prone', maxSize: 'medium' } },
    ],
    behaviour: 'brute',
    sprite: 'wolf',
    text: 'Pack Tactics. The wolf has Advantage on attack rolls against a creature if at least one of the wolf’s allies is within 5 feet of the creature and the ally doesn’t have the Incapacitated condition.',
    source: 'SRD 5.2.1',
  },
];
