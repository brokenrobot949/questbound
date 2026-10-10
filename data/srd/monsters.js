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
//   multiattack     how many attacks it makes with its action (1 if not given)
//   reactions       e.g. 'redirect-attack' (when attacked, swap places with a Small or Medium
//                   ally within 5 feet, who becomes the target instead)
//   immunities      damage types it takes no damage from; vulnerabilities: double damage;
//   resistances     half damage
//   conditionImmunities  conditions it can't have, e.g. 'poisoned'. Immunity to 'exhaustion'
//                   also means it never sleeps, so the Sleep spell can't touch it.
//   An attack's damage can carry plus: { amount, type }: a flat extra of another type, as in
//                   "3 (1d4 + 1) Slashing damage plus 1 Necrotic damage"
//   'undead-fortitude' (trait): when damage drops it to 0 Hit Points, a Constitution save
//                   (DC 5 + the damage) leaves it at 1 instead, unless the damage is Radiant or
//                   from a Critical Hit
//   bonusActions    e.g. 'nimble-escape' (Disengage or Hide as a Bonus Action)
//   behaviour       how it fights (original): 'brute' charges the nearest foe; 'skirmisher'
//                   prefers its ranged attack when it can't reach you; 'coward' fights like a
//                   brute but flees once Bloodied, if the fight has a way out
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
  {
    id: 'goblin-boss',
    name: 'Goblin Boss',
    size: 'small',
    type: 'Fey (Goblinoid)',
    ac: 17, // Chain Shirt and Shield
    hp: { average: 21, dice: '6d6' },
    speed: 30,
    abilities: { strength: 10, dexterity: 15, constitution: 10, intelligence: 10, wisdom: 8, charisma: 10 },
    saves: { strength: 0, dexterity: 2, constitution: 0, intelligence: 0, wisdom: -1, charisma: 0 },
    initiative: 2,
    skills: { stealth: 6 },
    darkvision: 60,
    passivePerception: 9,
    cr: '1',
    xp: 200,
    multiattack: 2,
    attacks: [
      { id: 'scimitar', name: 'Scimitar', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d6', bonus: 2, type: 'slashing' }, advantageExtra: '1d4' },
      { id: 'shortbow', name: 'Shortbow', kind: 'ranged', bonus: 4, range: [80, 320], damage: { dice: '1d6', bonus: 2, type: 'piercing' }, advantageExtra: '1d4' },
    ],
    bonusActions: ['nimble-escape'],
    reactions: ['redirect-attack'],
    behaviour: 'brute',
    sprite: 'goblin-boss',
    text: 'Multiattack. The goblin makes two attacks, using Scimitar or Shortbow in any combination. Nimble Escape. The goblin takes the Disengage or Hide action as a Bonus Action. Redirect Attack (Reaction). When a creature the goblin can see makes an attack roll against it, the goblin chooses a Small or Medium ally within 5 feet of itself. The goblin and that ally swap places, and the ally becomes the target of the attack instead.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'zombie',
    name: 'Zombie',
    size: 'medium',
    type: 'Undead',
    ac: 8,
    hp: { average: 15, dice: '2d8 + 6' },
    speed: 20,
    abilities: { strength: 13, dexterity: 6, constitution: 16, intelligence: 3, wisdom: 6, charisma: 5 },
    saves: { strength: 1, dexterity: -2, constitution: 3, intelligence: -4, wisdom: 0, charisma: -3 },
    initiative: -2,
    immunities: ['poison'],
    conditionImmunities: ['exhaustion', 'poisoned'],
    darkvision: 60,
    passivePerception: 8,
    cr: '1/4',
    xp: 50,
    traits: ['undead-fortitude'],
    attacks: [{ id: 'slam', name: 'Slam', kind: 'melee', bonus: 3, reach: 5, damage: { dice: '1d8', bonus: 1, type: 'bludgeoning' } }],
    behaviour: 'brute',
    sprite: 'zombie',
    text: 'Undead Fortitude. If damage reduces the zombie to 0 Hit Points, it makes a Constitution saving throw (DC 5 plus the damage taken) unless the damage is Radiant or from a Critical Hit. On a successful save, the zombie drops to 1 Hit Point instead.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    size: 'medium',
    type: 'Undead',
    ac: 14,
    hp: { average: 13, dice: '2d8 + 4' },
    speed: 30,
    abilities: { strength: 10, dexterity: 16, constitution: 15, intelligence: 6, wisdom: 8, charisma: 5 },
    saves: { strength: 0, dexterity: 3, constitution: 2, intelligence: -2, wisdom: -1, charisma: -3 },
    initiative: 3,
    vulnerabilities: ['bludgeoning'],
    immunities: ['poison'],
    conditionImmunities: ['exhaustion', 'poisoned'],
    darkvision: 60,
    passivePerception: 9,
    cr: '1/4',
    xp: 50,
    attacks: [
      { id: 'shortsword', name: 'Shortsword', kind: 'melee', bonus: 5, reach: 5, damage: { dice: '1d6', bonus: 3, type: 'piercing' } },
      { id: 'shortbow', name: 'Shortbow', kind: 'ranged', bonus: 5, range: [80, 320], damage: { dice: '1d6', bonus: 3, type: 'piercing' } },
    ],
    behaviour: 'brute',
    sprite: 'skeleton',
    source: 'SRD 5.2.1',
  },
  {
    id: 'cultist',
    name: 'Cultist',
    size: 'medium',
    type: 'Humanoid',
    ac: 12, // Leather Armor
    hp: { average: 9, dice: '2d8' },
    speed: 30,
    abilities: { strength: 11, dexterity: 12, constitution: 10, intelligence: 10, wisdom: 11, charisma: 10 },
    saves: { strength: 0, dexterity: 1, constitution: 0, intelligence: 0, wisdom: 2, charisma: 0 },
    initiative: 1,
    skills: { deception: 2, religion: 2 },
    passivePerception: 10,
    cr: '1/8',
    xp: 25,
    attacks: [
      { id: 'ritual-sickle', name: 'Ritual Sickle', kind: 'melee', bonus: 3, reach: 5, damage: { dice: '1d4', bonus: 1, type: 'slashing', plus: { amount: 1, type: 'necrotic' } } },
    ],
    behaviour: 'coward',
    sprite: 'cultist',
    source: 'SRD 5.2.1',
  },
];
