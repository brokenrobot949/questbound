// Drives (original): what pushes the hero. Chosen at character creation. Choices that fit
// the Drive earn Heroic Inspiration, and the DM's recaps lean on it (see docs/DESIGN.md).
// Scenes check a hero's Drive with has_drive("id") and mark Drive moments with drive_moment.
//
//   summary      shown on the creation screen
//   inspiration  the kind of choice that earns Heroic Inspiration, for the player

export const drives = [
  {
    id: 'glory',
    name: 'Glory',
    summary: 'You want your name sung in every tavern from here to Highcrown.',
    inspiration: 'Bold deeds done where people can see them.',
    source: 'original',
  },
  {
    id: 'faith',
    name: 'Faith',
    summary: 'Your god, or your conscience, sent you to stand against the dark.',
    inspiration: 'Keeping your vows when it would be easier not to.',
    source: 'original',
  },
  {
    id: 'wealth',
    name: 'Wealth',
    summary: 'Coin, land and a roof that doesn’t leak. You mean to earn all three.',
    inspiration: 'Driving a hard bargain, or taking the job that pays.',
    source: 'original',
  },
  {
    id: 'knowledge',
    name: 'Knowledge',
    summary: 'Every barrow and ruin hides an answer, and you want them all.',
    inspiration: 'Chasing a mystery, even when it’s dangerous.',
    source: 'original',
  },
  {
    id: 'justice',
    name: 'Justice',
    summary: 'Someone has to stand up for the people who can’t.',
    inspiration: 'Protecting the helpless, and making wrongdoers answer for it.',
    source: 'original',
  },
  {
    id: 'freedom',
    name: 'Freedom',
    summary: 'No master, no cage. Nobody tells you where to go.',
    inspiration: 'Breaking chains, yours or anyone else’s.',
    source: 'original',
  },
  {
    id: 'kinship',
    name: 'Kinship',
    summary: 'You fight for the people beside you, the family you choose.',
    inspiration: 'Putting yourself on the line for a friend or ally.',
    source: 'original',
  },
];
