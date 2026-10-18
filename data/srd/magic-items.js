// Magic items (SRD 5.2.1). Only the ones the current phase needs; more arrive with each chapter.
//
//   kind        'weapon' (a magic weapon, below) or 'wondrous' (a Wondrous Item, in the pack by
//               its own id)
//   rarity      'uncommon' and so on; by bonus, for an item that comes in several strengths
//   attunement  true if it needs Attunement. The rules want a Short Rest to attune, which the
//               game doesn't have yet, so the hero is attuned to it as soon as they have it
//               (Rob, Oct 18, 2026). Nobody has more than one such item yet, so the limit of
//               three doesn't come up.
//   worn        what it gives while worn: { ac, saves }, bonuses to Armor Class and to every
//               saving throw. The hero wears whatever worn items they carry (character/
//               inventory.js, wornItems), and the Sheet shows each bonus in the maths.
//   weight      pounds;  cost: null (not sold)
//   text        as in the SRD
//
// A magic weapon in the pack is its plain weapon's id with "-plus-" and its bonus on the end:
// "longsword-plus-1" is a Longsword +1 (character/inventory.js, findItem). It's the same weapon
// in every other way (damage, properties, Weapon Mastery), with the bonus added to its attack
// rolls and damage rolls. Hob reworks a hero's weapon into one with his star-iron (Chapter 2,
// Hob's ore).

export const magicItems = [
  // The last of the Barrow-Wives to lie down holds it out to the hero (Chapter 3's side quest).
  {
    id: 'cloak-of-protection',
    name: 'Cloak of Protection',
    kind: 'wondrous',
    rarity: 'uncommon',
    attunement: true,
    worn: { ac: 1, saves: 1 },
    weight: 1,
    cost: null,
    text: 'You gain a +1 bonus to Armor Class and saving throws while you wear this cloak.',
    source: 'SRD 5.2.1',
  },
  {
    id: 'weapon-plus',
    name: 'Weapon, +1, +2, or +3',
    kind: 'weapon', // any Simple or Martial weapon
    rarity: { 1: 'uncommon', 2: 'rare', 3: 'very rare' },
    text: 'You have a bonus to attack rolls and damage rolls made with this magic weapon. The bonus is determined by the weapon’s rarity.',
    source: 'SRD 5.2.1',
  },
];
