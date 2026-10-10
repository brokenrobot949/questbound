// Weapon mastery properties (SRD 5.2.1, "Equipment": "Mastery Properties"). Each weapon has
// one (its `mastery` in equipment.js), and a hero uses it only with a feature such as the
// Fighter's or the Rogue's Weapon Mastery, for the kinds of weapon they chose.
//
//   name     the property's name
//   summary  what it does in a fight, in a few words, for the battle screen and the Sheet
//   text     the rule
//
// Push and Cleave aren't on any weapon the game has yet (a Greatclub, a Halberd), so the
// fight doesn't use them so far.

export const weaponMasteries = [
  {
    id: 'cleave',
    name: 'Cleave',
    summary: 'a hit lets you swing at a second foe beside the first',
    text: 'If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the first that is also within your reach. On a hit, the second creature takes the weapon’s damage, but don’t add your ability modifier to that damage unless that modifier is negative. You can make this extra attack only once per turn.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'graze',
    name: 'Graze',
    summary: 'a miss still deals your ability modifier in damage',
    text: 'If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll. This damage is the same type dealt by the weapon, and the damage can be increased only by increasing the ability modifier.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'nick',
    name: 'Nick',
    summary: 'your extra attack with a second Light weapon is part of the Attack action, not a Bonus Action',
    text: 'When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'push',
    name: 'Push',
    summary: 'a hit pushes the foe 10 feet away',
    text: 'If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself if it is Large or smaller.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'sap',
    name: 'Sap',
    summary: 'a hit gives the foe Disadvantage on its next attack',
    text: 'If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'slow',
    name: 'Slow',
    summary: 'a hit cuts the foe’s Speed by 10 feet',
    text: 'If you hit a creature with this weapon and deal damage to it, you can reduce its Speed by 10 feet until the start of your next turn. If the creature is hit more than once by weapons that have this property, the Speed reduction doesn’t exceed 10 feet.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'topple',
    name: 'Topple',
    summary: 'a hit makes the foe save or fall Prone',
    text: 'If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 plus the ability modifier used to make the attack roll and your Proficiency Bonus). On a failed save, the creature has the Prone condition.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'vex',
    name: 'Vex',
    summary: 'a hit gives you Advantage on your next attack against that foe',
    text: 'If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn.',
    source: 'SRD 5.2.1',
  },
];
