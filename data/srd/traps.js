// Traps (SRD 5.2.1, "Traps" in the Gameplay Toolbox). Only the ones the story uses so far.
// A scene springs one on the hero with spring_trap(id) (js/engine/character/hazards.js):
// a saving throw to avoid it, then the damage, as the rules give it.
//
//   name, rating    as in the SRD: "Deadly Trap (Levels 1–4)"
//   trigger         what sets it off
//   save            { ability, dc }: the saving throw that avoids it
//   hits            dice for how many strike on a failed save ("1d3" darts)
//   one, many       what strikes, for the DM's note: "Struck by 1 dart", "Struck by 2 darts"
//   damage          { dice, type }: the damage each one does, at levels 1–4
//   atHigherLevels  the damage each one does from a higher level on: [{ level, dice }]
//   detect          { skill, dc }: the Search that finds it. Scenes write the same skill and
//                   DC in their check and its #check tag.
//
// Safe to edit the numbers, but they're the SRD's: change them only on purpose.

export const traps = [
  {
    id: 'poisoned-darts',
    name: 'Poisoned Darts',
    rating: 'Deadly Trap (Levels 1–4)',
    trigger: 'A creature moves onto a pressure plate.',
    save: { ability: 'dexterity', dc: 13 },
    hits: '1d3',
    one: 'dart',
    many: 'darts',
    damage: { dice: '1d6', type: 'poison' },
    atHigherLevels: [
      { level: 5, dice: '2d6' },
      { level: 11, dice: '4d6' },
      { level: 17, dice: '7d6' },
    ],
    detect: { skill: 'perception', dc: 15 },
    source: 'SRD 5.2.1',
  },
];
