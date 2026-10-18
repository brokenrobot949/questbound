// Quests (original). Scenes start them with start_quest("id") and add to them with
// quest_note("id", "text"); the journal shows each quest's title, summary and notes.
// Safe to edit: titles and summaries are shown to the player.

export const quests = [
  {
    id: 'missing-miller',
    title: 'The Missing Miller',
    summary: 'Reeve Corbin pays 50 gold to whoever brings Garrick Dunn home and puts a stop to the goblin raids.',
    chapter: 1,
    source: 'original',
  },
  {
    id: 'goblin-bargain',
    title: 'Brackenhollow’s Bargain',
    summary: 'Mother Nettle’s goblins will stop raiding if you clear the dead out of their lower warren.',
    chapter: 1,
    source: 'original',
  },
  // Chapter 1's side quests (offered again on the last morning in Bramblegate, if missed).
  {
    id: 'too-many-cats',
    title: 'Too Many Cats',
    summary: 'The Tallow and Thistle’s cats keep vanishing, Biscuit the grey among them, and Morwen wants them back.',
    chapter: 1,
    source: 'original',
  },
  {
    id: 'wolf-den',
    title: 'Wolves on the North Road',
    summary: 'Warden Pike pays ten gold to whoever clears the wolf den in the Grey Teeth, an hour up the north road. The wolves have taken eleven sheep and a shepherd’s dog.',
    chapter: 1,
    source: 'original',
  },
  {
    id: 'millers-daughter',
    title: 'The Miller’s Daughter',
    summary: 'Lark Dunn has gone down the old tunnel under her father’s mill, alone, with a lantern and his hatchet.',
    chapter: 2,
    source: 'original',
  },
  // Chapter 2's side quests, offered on the morning before the barrow (and again on the last
  // morning in Bramblegate, if missed).
  {
    id: 'hanging-tree',
    title: 'The Hanging Tree',
    summary: 'Fen wants to look inside an old Ashen Choir letter-drop in the hanging tree at the crossroads outside Bramblegate.',
    chapter: 2,
    source: 'original',
  },
  {
    id: 'hobs-ore',
    title: 'Hob’s Ore',
    summary: 'Hob’s crate of star-iron has sat at the Old Ford post for a month. His cousin Dabbin will fetch it with his cart, if someone rides with him: there are gnolls on the barrow road.',
    chapter: 2,
    source: 'original',
  },
];
