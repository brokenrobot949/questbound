// Items (original): things the story gives that aren't in the rules: clues, keepsakes and
// trinkets. They go in the pack like any other item, and the Sheet tab shows their text.
//
//   category   'quest' (needed by the story: can't be sold or dropped) or 'trinket'
//   weight     pounds;  cost: null (not sold)

export const items = [
  {
    id: 'choir-hymnal',
    name: 'The Choir’s hymnal',
    category: 'quest',
    weight: 1,
    cost: null,
    text: 'A cracked grey hymnal, taken at the breach under Brackenhollow. Old coronation hymns, written over and over in a careful hand; a rough map of the barrow road; and on the cover, burned into the leather, a staff wound with music notes.',
    source: 'original',
  },
  {
    id: 'goblin-tooth-charm',
    name: 'Goblin-tooth charm',
    category: 'trinket',
    weight: 0,
    cost: null,
    text: 'A string of small, sharp teeth, threaded on gut and knotted with a nettle leaf. The goblins of Brackenhollow give it to friends, or say they do.',
    source: 'original',
  },
];
