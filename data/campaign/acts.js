// The campaign's acts (original; docs/STORY.md). Only the acts the story has reached are here.
// Safe to edit: titles and closing lines are shown to the player.
//
//   title         shown at the top of the card at the end of the act
//   chapters      the chapters in the act (a quest's "chapter" in quests.js says which act its
//                 quest belongs to)
//   completeFlag  the story flag set as the act ends (the card shows once it's set)
//   startsAt      the scene (Ink knot) each chapter begins in, for the playtest log's time per
//                 chapter; scenes before the first one count as the first chapter
//   closing       the card's last lines

export const acts = [
  {
    id: 'act-1',
    title: 'Act I · The Barrow Dead',
    chapters: [1, 2, 3],
    completeFlag: 'act_1_complete',
    startsAt: [
      { chapter: 'Chapter 1', scene: 'ch1_arrival' },
      { chapter: 'Chapter 2', scene: 'ch2_morning' },
      { chapter: 'Chapter 3', scene: 'ch3_dark_moon' },
      // The last morning in Bramblegate, with any side quests still to do.
      { chapter: 'The last morning', scene: 'act1_last_morning' },
    ],
    closing: 'Act II comes in a later update. Your hero is saved here, and the story will pick up from this page.',
    source: 'original',
  },
];
