// Magic items (SRD 5.2.1). Only the ones the current phase needs; more arrive with each chapter.
//
//   rarity      by bonus, for an item that comes in several strengths
//   text        as in the SRD
//
// A magic weapon in the pack is its plain weapon's id with "-plus-" and its bonus on the end:
// "longsword-plus-1" is a Longsword +1 (character/inventory.js, findItem). It's the same weapon
// in every other way (damage, properties, Weapon Mastery), with the bonus added to its attack
// rolls and damage rolls. Hob reworks a hero's weapon into one with his star-iron (Chapter 2,
// Hob's ore).

export const magicItems = [
  {
    id: 'weapon-plus',
    name: 'Weapon, +1, +2, or +3',
    kind: 'weapon', // any Simple or Martial weapon
    rarity: { 1: 'uncommon', 2: 'rare', 3: 'very rare' },
    text: 'You have a bonus to attack rolls and damage rolls made with this magic weapon. The bonus is determined by the weapon’s rarity.',
    source: 'SRD 5.2.1',
  },
];
