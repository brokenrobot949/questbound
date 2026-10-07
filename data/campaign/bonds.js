// Bonds (original): who the hero left behind. Chosen and named at character creation. The
// campaign has an authored slot where the Bond returns in every act (docs/STORY.md, "The Bond").
//
//   summary     shown on the creation screen
//   nameLabel   the label for the Bond person's name
//   sameFamily  true if a rolled name keeps the hero's family name

export const bonds = [
  {
    id: 'sibling',
    name: 'Sibling',
    summary: 'A brother or sister you left at home. They write when they can.',
    nameLabel: 'Your sibling’s name',
    sameFamily: true,
    source: 'original',
  },
  {
    id: 'mentor',
    name: 'Mentor',
    summary: 'The one who taught you everything you know, and warned you about the rest.',
    nameLabel: 'Your mentor’s name',
    sameFamily: false,
    source: 'original',
  },
  {
    id: 'rival',
    name: 'Rival',
    summary: 'Someone who’s always one step ahead of you, or just behind.',
    nameLabel: 'Your rival’s name',
    sameFamily: false,
    source: 'original',
  },
  {
    id: 'debt',
    name: 'Debt',
    summary: 'You owe someone a great deal of money, and they haven’t forgotten.',
    nameLabel: 'Who you owe',
    sameFamily: false,
    source: 'original',
  },
];
