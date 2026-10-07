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
];
