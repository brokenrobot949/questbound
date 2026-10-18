// Monsters (SRD 5.2.1). Only the ones the current phase needs; more arrive with each chapter.
//
//   size, type      as in the stat block
//   ac, hp          Armor Class; Hit Points as { average, dice } (monsters use the average)
//   speed           walking speed in feet
//   fly             flying speed in feet, if it has one (a Stirge's 40). It moves at whichever
//                   is faster; on the grid it still goes round obstacles, as walkers do
//   abilities       the six scores
//   saves           saving throw bonuses (from the stat block's SAVE column)
//   initiative      Initiative bonus
//   cr, xp          Challenge Rating and the XP it's worth
//   attacks         each attack: { id, name, kind: 'melee' | 'ranged' | 'melee-or-ranged',
//                   bonus, reach (feet), range ([normal, long] feet), damage: { dice, bonus, type },
//                   advantageExtra: extra damage dice when the attack had Advantage,
//                   onHit: a condition a hit gives, e.g. { condition: 'prone', maxSize: 'medium' }
//                   for "if the target is Medium or smaller, it has the Prone condition"; with
//                   save: { ability, dc } the target saves against it first; until:
//                   'end-of-next-turn' for a condition that lasts until the end of the target's
//                   next turn; notTypes (creature types) and notSpecies (heroes' species) can't
//                   get it, e.g. a Ghoul's Claw: notTypes ['undead'], notSpecies ['elf'],
//                   alone: true for an attack that isn't part of its Multiattack: an action of its
//                   own (see behaviour below),
//                   attach: { dice, type } for an attack that clings on when it hits (a Stirge's
//                   Proboscis): while attached, the monster makes no more of these attacks, and
//                   at the start of each of its turns the one it clings to takes that damage. It
//                   goes along when they move. It lets go if they drop to 0 Hit Points, or it
//                   can't act; they, or anyone of their side beside them, can pull it off with
//                   an action (combat/battle.js, "Clinging on"),
//                   drainsMax: true for an attack whose damage also lowers the target's Hit
//                   Point maximum by as much, until they finish a Long Rest (a Specter's Life
//                   Drain; combat/battle.js, "Life Drain") }
//   traits          rules the game plays, e.g. 'pack-tactics' (Advantage on attacks against a
//                   creature with one of its allies, not Incapacitated, within 5 feet of it),
//                   'incorporeal-movement' (it moves through creatures, walls and obstacles as
//                   if they were Difficult Terrain, though it never ends its move inside one)
//   multiattack     how many attacks it makes with its action (1 if not given)
//   reactions       e.g. 'redirect-attack' (when attacked, swap places with a Small or Medium
//                   ally within 5 feet, who becomes the target instead), 'parry' (when a melee
//                   attack roll would hit it, +2 AC against that attack; the game uses it only
//                   when that turns the hit into a miss)
//   immunities      damage types it takes no damage from; vulnerabilities: double damage;
//   resistances     half damage
//   conditionImmunities  conditions it can't have, e.g. 'poisoned'. Immunity to 'exhaustion'
//                   also means it never sleeps, so the Sleep spell can't touch it.
//   An attack's damage can carry plus: { amount, type }: a flat extra of another type, as in
//                   "3 (1d4 + 1) Slashing damage plus 1 Necrotic damage", or { dice, type } for
//                   extra dice, as in "plus 3 (1d6) Necrotic damage" (doubled on a Critical Hit)
//   variant         what the game changed from the SRD's stat block, and why (the rest is as
//                   printed)
//   'undead-fortitude' (trait): when damage drops it to 0 Hit Points, a Constitution save
//                   (DC 5 + the damage) leaves it at 1 instead, unless the damage is Radiant or
//                   from a Critical Hit
//   bonusActions    e.g. 'nimble-escape' (Disengage or Hide as a Bonus Action), 'rampage' (a
//                   gnoll's: once a day, after hurting someone already Bloodied, it moves half
//                   its Speed and makes one more melee attack)
//   spellcasting    the spells it casts (a Cultist Fanatic's): { ability, saveDc, attackBonus,
//                   atWill: spell ids it can always cast (none of them used in a fight yet),
//                   spells: [{ id, perDay, bonusAction, words, look }] }. id is a spell in
//                   data/srd/spells.js; perDay how many times a day it can cast it; bonusAction
//                   for one cast as a Bonus Action (Spiritual Weapon); words, the words of
//                   Command it uses ('grovel', 'halt'); look, what its Spiritual Weapon looks
//                   like, for the fight log. How it chooses is in combat/battle.js ("A foe's
//                   spells").
//   behaviour       how it fights (original): 'brute' charges the nearest foe; 'skirmisher'
//                   prefers its ranged attack when it can't reach you; 'coward' fights like a
//                   brute but flees once Bloodied, if the fight has a way out. Whatever the
//                   behaviour, an attack marked alone with an onHit condition (a Ghoul's Claw)
//                   is used in place of the Multiattack while the target can still get that
//                   condition and doesn't have it yet
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
  // Dame Aveline, the first queen's champion, sung up out of her tomb in the Chantry of Ash
  // (Chapter 3).
  {
    id: 'wight',
    name: 'Wight',
    size: 'medium',
    type: 'Undead',
    ac: 14, // Studded Leather Armor
    hp: { average: 82, dice: '11d8 + 33' },
    speed: 30,
    abilities: { strength: 15, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 13, charisma: 15 },
    saves: { strength: 2, dexterity: 2, constitution: 3, intelligence: 0, wisdom: 1, charisma: 2 },
    initiative: 4,
    skills: { perception: 3, stealth: 4 },
    resistances: ['necrotic'],
    immunities: ['poison'],
    conditionImmunities: ['exhaustion', 'poisoned'],
    darkvision: 60,
    passivePerception: 13,
    cr: '3',
    xp: 700,
    multiattack: 2,
    attacks: [
      { id: 'necrotic-sword', name: 'Necrotic Sword', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d8', bonus: 2, type: 'slashing', plus: { dice: '1d8', type: 'necrotic' } } },
      { id: 'necrotic-bow', name: 'Necrotic Bow', kind: 'ranged', bonus: 4, range: [150, 600], damage: { dice: '1d8', bonus: 2, type: 'piercing', plus: { dice: '1d8', type: 'necrotic' } } },
    ],
    behaviour: 'brute',
    sprite: 'wight',
    variant: 'Life Drain (in place of one attack: a DC 13 Constitution save or 1d8 + 2 Necrotic damage, and the Hit Point maximum drops by as much) isn’t played yet: the game can lower a Hit Point maximum now (the Specter’s Life Drain, combat/battle.js), but it’s left out here so the chantry’s tested balance doesn’t move (Rob, Oct 18, 2026). Sunlight Sensitivity doesn’t come up under the barrow.',
    text: 'Multiattack. The wight makes two attacks, using Necrotic Sword or Necrotic Bow in any combination. Necrotic Sword. Melee Attack Roll: +4, reach 5 ft. Hit: 6 (1d8 + 2) Slashing damage plus 4 (1d8) Necrotic damage. Necrotic Bow. Ranged Attack Roll: +4, range 150/600 ft. Hit: 6 (1d8 + 2) Piercing damage plus 4 (1d8) Necrotic damage.',
    source: 'SRD 5.2.1',
  },
  // The flooded vault under the Kings' Barrow (Chapter 3): it wades in the black water.
  {
    id: 'ogre-zombie',
    name: 'Ogre Zombie',
    size: 'large',
    type: 'Undead',
    ac: 8,
    hp: { average: 85, dice: '9d10 + 36' },
    speed: 30,
    abilities: { strength: 19, dexterity: 6, constitution: 18, intelligence: 3, wisdom: 6, charisma: 5 },
    saves: { strength: 4, dexterity: -2, constitution: 4, intelligence: -4, wisdom: 0, charisma: -3 },
    initiative: -2,
    immunities: ['poison'],
    conditionImmunities: ['exhaustion', 'poisoned'],
    darkvision: 60,
    passivePerception: 8,
    cr: '2',
    xp: 450,
    traits: ['undead-fortitude'],
    attacks: [{ id: 'slam', name: 'Slam', kind: 'melee', bonus: 6, reach: 5, damage: { dice: '2d8', bonus: 4, type: 'bludgeoning' } }],
    behaviour: 'brute',
    sprite: 'ogre-zombie',
    variant: 'It’s Large, but on the grid it takes one square, as every creature does for now (Rob, Oct 16, 2026). Large creatures come when Act II’s big monsters need them.',
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
  // Sister Rhosyn at Cairnfield (Chapter 2) leads the Choir's acolytes, and sings the dead up.
  // Cantor Vesk in the Chantry of Ash (Chapter 3) is one too.
  {
    id: 'cultist-fanatic',
    name: 'Cultist Fanatic',
    size: 'medium',
    type: 'Humanoid',
    ac: 13, // Leather Armor
    hp: { average: 44, dice: '8d8 + 8' },
    speed: 30,
    abilities: { strength: 11, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 14, charisma: 13 },
    saves: { strength: 0, dexterity: 2, constitution: 1, intelligence: 0, wisdom: 4, charisma: 1 },
    initiative: 2,
    skills: { deception: 3, persuasion: 3, religion: 2 },
    passivePerception: 12,
    cr: '2',
    xp: 450,
    attacks: [
      { id: 'pact-blade', name: 'Pact Blade', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d8', bonus: 2, type: 'slashing', plus: { dice: '2d6', type: 'necrotic' } } },
    ],
    // Spell save DC 12, +4 to hit with spell attacks (Wisdom 14). Its Spiritual Weapon strikes
    // for 1d8 + 2 Force damage (1d8 plus its Wisdom modifier).
    spellcasting: {
      ability: 'wisdom',
      saveDc: 12,
      attackBonus: 4,
      atWill: ['light', 'thaumaturgy'],
      spells: [
        { id: 'hold-person', perDay: 1 },
        { id: 'command', perDay: 2, words: ['grovel', 'halt'] },
        { id: 'spiritual-weapon', perDay: 2, bonusAction: true, look: 'a spectral blade of grey ash' },
      ],
    },
    behaviour: 'brute',
    sprite: 'cultist-fanatic',
    variant: 'Its Command uses only two of the spell’s words, Grovel and Halt (Rob, Oct 17, 2026): Approach and Flee would move you for it, and Drop needs weapons that can be dropped and picked up again. Light and Thaumaturgy, its at-will spells, have no use in a fight yet.',
    text: 'Pact Blade. Melee Attack Roll: +4, reach 5 ft. Hit: 6 (1d8 + 2) Slashing damage plus 7 (2d6) Necrotic damage. Spellcasting. The cultist casts one of the following spells, using Wisdom as the spellcasting ability (spell save DC 12, +4 to hit with spell attacks): At Will: Light, Thaumaturgy. 2/Day: Command. 1/Day: Hold Person. Spiritual Weapon (2/Day; Bonus Action). The cultist casts the Spiritual Weapon spell, using the same spellcasting ability as Spellcasting.',
    source: 'SRD 5.2.1',
  },
  // ---- Chapter 2 ----
  {
    id: 'ghoul',
    name: 'Ghoul',
    size: 'medium',
    type: 'Undead',
    ac: 12,
    hp: { average: 22, dice: '5d8' },
    speed: 30,
    abilities: { strength: 13, dexterity: 15, constitution: 10, intelligence: 7, wisdom: 10, charisma: 6 },
    saves: { strength: 1, dexterity: 2, constitution: 0, intelligence: -2, wisdom: 0, charisma: -2 },
    initiative: 2,
    immunities: ['poison'],
    conditionImmunities: ['charmed', 'exhaustion', 'poisoned'],
    darkvision: 60,
    passivePerception: 10,
    cr: '1',
    xp: 200,
    multiattack: 2, // two Bite attacks
    attacks: [
      { id: 'bite', name: 'Bite', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d6', bonus: 2, type: 'piercing', plus: { dice: '1d6', type: 'necrotic' } } },
      {
        id: 'claw',
        name: 'Claw',
        kind: 'melee',
        bonus: 4,
        reach: 5,
        damage: { dice: '1d4', bonus: 2, type: 'slashing' },
        alone: true,
        onHit: { condition: 'paralyzed', save: { ability: 'constitution', dc: 10 }, until: 'end-of-next-turn', notTypes: ['undead'], notSpecies: ['elf'] },
      },
    ],
    behaviour: 'brute',
    sprite: 'ghoul',
    text: 'Multiattack. The ghoul makes two Bite attacks. Claw. Melee Attack Roll: +4, reach 5 ft. Hit: 4 (1d4 + 2) Slashing damage. If the target is a creature that isn’t an Undead or elf, it is subjected to the following effect. Constitution Saving Throw: DC 10. Failure: The target has the Paralyzed condition until the end of its next turn.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'bandit',
    name: 'Bandit',
    size: 'medium',
    type: 'Humanoid',
    ac: 12, // Leather Armor
    hp: { average: 11, dice: '2d8 + 2' },
    speed: 30,
    abilities: { strength: 11, dexterity: 12, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 },
    saves: { strength: 0, dexterity: 1, constitution: 1, intelligence: 0, wisdom: 0, charisma: 0 },
    initiative: 1,
    passivePerception: 10,
    cr: '1/8',
    xp: 25,
    attacks: [
      { id: 'scimitar', name: 'Scimitar', kind: 'melee', bonus: 3, reach: 5, damage: { dice: '1d6', bonus: 1, type: 'slashing' } },
      { id: 'light-crossbow', name: 'Light Crossbow', kind: 'ranged', bonus: 3, range: [80, 320], damage: { dice: '1d8', bonus: 1, type: 'piercing' } },
    ],
    behaviour: 'skirmisher',
    sprite: 'bandit',
    source: 'SRD 5.2.1',
  },
  {
    id: 'bandit-captain',
    name: 'Bandit Captain',
    size: 'medium',
    type: 'Humanoid',
    ac: 15, // Studded Leather Armor
    hp: { average: 52, dice: '8d8 + 16' },
    speed: 30,
    abilities: { strength: 15, dexterity: 16, constitution: 14, intelligence: 14, wisdom: 11, charisma: 14 },
    saves: { strength: 4, dexterity: 5, constitution: 2, intelligence: 2, wisdom: 2, charisma: 2 },
    initiative: 3,
    skills: { athletics: 4, deception: 4 },
    passivePerception: 10,
    cr: '2',
    xp: 450,
    multiattack: 2,
    attacks: [
      { id: 'scimitar', name: 'Scimitar', kind: 'melee', bonus: 5, reach: 5, damage: { dice: '1d6', bonus: 3, type: 'slashing' } },
      { id: 'light-crossbow', name: 'Light Crossbow', kind: 'ranged', bonus: 5, range: [80, 320], damage: { dice: '1d8', bonus: 3, type: 'piercing' } },
    ],
    reactions: ['parry'],
    behaviour: 'brute',
    sprite: 'bandit-captain',
    variant: 'A Light Crossbow (+5, range 80/320 ft, 1d8 + 3 Piercing) in place of the Pistol: Caldmere has no firearms (Rob, Oct 10, 2026).',
    text: 'Multiattack. The bandit makes two attacks, using Scimitar and Light Crossbow in any combination. Parry (Reaction). Trigger: The bandit is hit by a melee attack roll while holding a weapon. Response: The bandit adds 2 to its AC against that attack, possibly causing it to miss.',
    source: 'SRD 5.2.1',
  },
  // The Old Ford's soldiers fight on your side as Guards (an ally in encounters.js).
  {
    id: 'guard',
    name: 'Guard',
    size: 'medium',
    type: 'Humanoid',
    ac: 16, // Chain Shirt and Shield
    hp: { average: 11, dice: '2d8 + 2' },
    speed: 30,
    abilities: { strength: 13, dexterity: 12, constitution: 12, intelligence: 10, wisdom: 11, charisma: 10 },
    saves: { strength: 1, dexterity: 1, constitution: 1, intelligence: 0, wisdom: 0, charisma: 0 },
    initiative: 1,
    skills: { perception: 2 },
    passivePerception: 12,
    cr: '1/8',
    xp: 25,
    attacks: [{ id: 'spear', name: 'Spear', kind: 'melee-or-ranged', bonus: 3, reach: 5, range: [20, 60], damage: { dice: '1d6', bonus: 1, type: 'piercing' } }],
    behaviour: 'brute',
    sprite: 'guard',
    source: 'SRD 5.2.1',
  },
  // ---- Chapter 3 ----
  // The two guardians of the Kings' Barrow's great gate.
  {
    id: 'animated-armor',
    name: 'Animated Armor',
    size: 'medium',
    type: 'Construct',
    ac: 18,
    hp: { average: 33, dice: '6d8 + 6' },
    speed: 25,
    abilities: { strength: 14, dexterity: 11, constitution: 13, intelligence: 1, wisdom: 3, charisma: 1 },
    saves: { strength: 2, dexterity: 0, constitution: 1, intelligence: -5, wisdom: -4, charisma: -5 },
    initiative: 2,
    immunities: ['poison', 'psychic'],
    conditionImmunities: ['charmed', 'deafened', 'exhaustion', 'frightened', 'paralyzed', 'petrified', 'poisoned'],
    blindsight: 60,
    passivePerception: 6,
    cr: '1',
    xp: 200,
    multiattack: 2, // two Slam attacks
    attacks: [{ id: 'slam', name: 'Slam', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d6', bonus: 2, type: 'bludgeoning' } }],
    behaviour: 'brute',
    sprite: 'animated-armor',
    variant: 'Its Blindsight (60 feet) isn’t played yet: in a fight it sees like anyone else, so a hidden hero stays hidden from it.',
    text: 'Multiattack. The armor makes two Slam attacks. Slam. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Bludgeoning damage.',
    source: 'SRD 5.2.1',
  },
  // ---- Act I side quests ----
  // The nest in the Tallow and Thistle's loft (Chapter 1, Too Many Cats).
  {
    id: 'stirge',
    name: 'Stirge',
    size: 'tiny',
    type: 'Monstrosity',
    ac: 13,
    hp: { average: 5, dice: '2d4' },
    speed: 10,
    fly: 40,
    abilities: { strength: 4, dexterity: 16, constitution: 11, intelligence: 2, wisdom: 8, charisma: 6 },
    saves: { strength: -3, dexterity: 3, constitution: 0, intelligence: -4, wisdom: -1, charisma: -2 },
    initiative: 3,
    darkvision: 60,
    passivePerception: 9,
    cr: '1/8',
    xp: 25,
    attacks: [
      { id: 'proboscis', name: 'Proboscis', kind: 'melee', bonus: 5, reach: 5, damage: { dice: '1d6', bonus: 3, type: 'piercing' }, attach: { dice: '2d4', type: 'necrotic' } },
    ],
    behaviour: 'brute',
    sprite: 'stirge',
    text: 'Proboscis. Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Piercing damage, and the stirge attaches to the target. While attached, the stirge can’t make Proboscis attacks, and the target takes 5 (2d4) Necrotic damage at the start of each of the stirge’s turns. The stirge can detach itself by spending 5 feet of its movement. The target or a creature within 5 feet of it can detach the stirge as an action.',
    source: 'SRD 5.2.1',
  },
  // The gnoll pack on the barrow road (Chapter 2, Hob's ore): hungry fiends who follow the
  // walking dead the way crows follow a plough, with a giant hyena running among them.
  // 'rampage' (Bonus Action, once a day): straight after it deals damage to someone who was
  // already Bloodied, it moves up to half its Speed and makes one more melee attack (its Rend
  // or Bite). See combat/battle.js, "Rampage".
  {
    id: 'gnoll-warrior',
    name: 'Gnoll Warrior',
    size: 'medium',
    type: 'Fiend',
    ac: 15,
    hp: { average: 27, dice: '6d8' },
    speed: 30,
    abilities: { strength: 14, dexterity: 12, constitution: 11, intelligence: 6, wisdom: 10, charisma: 7 },
    saves: { strength: 2, dexterity: 1, constitution: 0, intelligence: -2, wisdom: 0, charisma: -2 },
    initiative: 1,
    darkvision: 60,
    passivePerception: 10,
    cr: '1/2',
    xp: 100,
    attacks: [
      { id: 'rend', name: 'Rend', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d6', bonus: 2, type: 'piercing' } },
      { id: 'bone-bow', name: 'Bone Bow', kind: 'ranged', bonus: 3, range: [150, 600], damage: { dice: '1d10', bonus: 1, type: 'piercing' } },
    ],
    bonusActions: ['rampage'],
    behaviour: 'brute',
    sprite: 'gnoll',
    text: 'Rend. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage. Bone Bow. Ranged Attack Roll: +3, range 150/600 ft. Hit: 6 (1d10 + 1) Piercing damage. Rampage (1/Day; Bonus Action). Immediately after dealing damage to a creature that is already Bloodied, the gnoll moves up to half its Speed, and it makes one Rend attack.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'giant-hyena',
    name: 'Giant Hyena',
    size: 'large',
    type: 'Beast',
    ac: 12,
    hp: { average: 45, dice: '6d10 + 12' },
    speed: 50,
    abilities: { strength: 16, dexterity: 14, constitution: 14, intelligence: 2, wisdom: 12, charisma: 7 },
    saves: { strength: 3, dexterity: 2, constitution: 2, intelligence: -4, wisdom: 1, charisma: -2 },
    initiative: 2,
    skills: { perception: 3 },
    darkvision: 60,
    passivePerception: 13,
    cr: '1',
    xp: 200,
    attacks: [{ id: 'bite', name: 'Bite', kind: 'melee', bonus: 5, reach: 5, damage: { dice: '2d6', bonus: 3, type: 'piercing' } }],
    bonusActions: ['rampage'],
    behaviour: 'brute',
    sprite: 'giant-hyena',
    variant: 'It’s Large, but on the grid it takes one square, as the Ogre Zombie does: Large creatures come when Act II’s big monsters need them.',
    text: 'Bite. Melee Attack Roll: +5, reach 5 ft. Hit: 10 (2d6 + 3) Piercing damage. Rampage (1/Day; Bonus Action). Immediately after dealing damage to a creature that was already Bloodied, the hyena can move up to half its Speed, and it makes one Bite attack.',
    source: 'SRD 5.2.1',
  },
  // Dabbin, Hob's cousin, fights from his cart on the barrow road as a Scout (an ally in
  // encounters.js).
  {
    id: 'scout',
    name: 'Scout',
    size: 'medium', // Medium or Small (Dabbin is a gnome)
    type: 'Humanoid',
    ac: 13, // Leather Armor
    hp: { average: 16, dice: '3d8 + 3' },
    speed: 30,
    abilities: { strength: 11, dexterity: 14, constitution: 12, intelligence: 11, wisdom: 13, charisma: 11 },
    saves: { strength: 0, dexterity: 2, constitution: 1, intelligence: 0, wisdom: 1, charisma: 0 },
    initiative: 2,
    skills: { nature: 4, perception: 5, stealth: 6, survival: 5 },
    passivePerception: 15,
    cr: '1/2',
    xp: 100,
    multiattack: 2,
    attacks: [
      { id: 'shortsword', name: 'Shortsword', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d6', bonus: 2, type: 'piercing' } },
      { id: 'longbow', name: 'Longbow', kind: 'ranged', bonus: 4, range: [150, 600], damage: { dice: '1d8', bonus: 2, type: 'piercing' } },
    ],
    behaviour: 'skirmisher',
    sprite: 'scout',
    text: 'Multiattack. The scout makes two attacks, using Shortsword and Longbow in any combination. Shortsword. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage. Longbow. Ranged Attack Roll: +4, range 150/600 ft. Hit: 6 (1d8 + 2) Piercing damage.',
    source: 'SRD 5.2.1',
  },
  // The Barrow-Wives (Chapter 3's side quest): three of the first queen's sworn, risen in their
  // opened barrows on the Three Wives, a knoll above the barrow road.
  // Life Drain (drainsMax): the Hit Point maximum drops by the damage taken, until a Long Rest
  // (combat/battle.js, "Life Drain"). 'incorporeal-movement': it moves through creatures and
  // walls as if they were Difficult Terrain (combat/grid.js).
  {
    id: 'specter',
    name: 'Specter',
    size: 'medium',
    type: 'Undead',
    ac: 12,
    hp: { average: 22, dice: '5d8' },
    speed: 30,
    fly: 50, // it hovers
    abilities: { strength: 1, dexterity: 14, constitution: 11, intelligence: 10, wisdom: 10, charisma: 11 },
    saves: { strength: -5, dexterity: 2, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
    initiative: 2,
    resistances: ['acid', 'bludgeoning', 'cold', 'fire', 'lightning', 'piercing', 'slashing', 'thunder'],
    immunities: ['necrotic', 'poison'],
    conditionImmunities: ['charmed', 'exhaustion', 'grappled', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'unconscious'],
    darkvision: 60,
    passivePerception: 10,
    cr: '1',
    xp: 200,
    traits: ['incorporeal-movement'],
    attacks: [{ id: 'life-drain', name: 'Life Drain', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '2d6', bonus: 0, type: 'necrotic' }, drainsMax: true }],
    behaviour: 'brute',
    sprite: 'specter',
    variant: 'It never chooses to end its move inside a wall or an obstacle, so the 1d10 Force damage for ending a turn inside one doesn’t come up. Sunlight Sensitivity doesn’t come up either: the Barrow-Wives are fought in the dark of their barrows.',
    text: 'Incorporeal Movement. The specter can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object. Sunlight Sensitivity. While in sunlight, the specter has Disadvantage on ability checks and attack rolls. Life Drain. Melee Attack Roll: +4, reach 5 ft. Hit: 7 (2d6) Necrotic damage. If the target is a creature, its Hit Point maximum decreases by an amount equal to the damage taken.',
    source: 'SRD 5.2.1',
  },
];
