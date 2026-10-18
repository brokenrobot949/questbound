// Items (original): things the story gives that aren't in the rules: clues, keepsakes and
// trinkets. They go in the pack like any other item, and the Sheet tab shows their text.
//
//   category   'quest' (needed by the story: can't be sold or dropped), 'trinket', or 'gem' (a
//              precious stone a spell can use up: Revivify's diamond)
//   weight     pounds;  cost: null (not sold), or its worth

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
    id: 'shard-of-names',
    name: 'The Shard of Names',
    category: 'quest',
    weight: 0,
    cost: null,
    text: 'A sliver of old gold no longer than your finger, warm as skin, with an edge that never quite cuts. It flew to your hand from Dame Aveline’s breast as Cantor Vesk died. It knows names: held over the dead, it lets them speak, and turned on the living, it tells you what they’re called. Sometimes, when it’s quiet, it says yours.',
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
  // Revivify uses one up. Nobody sells them yet: they arrive with shops (debug mode can give one).
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'gem',
    weight: 0,
    cost: { gp: 300 },
    text: 'A clear, cold diamond the size of a thumbnail, worth 300 gold pieces. A priest who knows Revivify can spend it to call back someone who died within the last minute.',
    source: 'original',
  },
];
