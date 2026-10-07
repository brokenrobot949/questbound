// What the DM says when a d20 lands on 20 or 1. Add, remove or rewrite lines freely.
// Under the 2024 rules a natural 20 or 1 only decides attack rolls, so these lines
// shouldn't promise success or failure: a check can still fail on a 20.

export const dmVoice = {
  natural20: [
    'A natural 20. The table goes quiet, then somebody whistles.',
    'Twenty! The die lands like it was always going to.',
    'A natural 20. You will be telling this one for years.',
  ],
  natural1: [
    'A natural 1. The die looks away, embarrassed.',
    'One. Somewhere a bard starts writing a song about this, and it is not flattering.',
    'The die shows a 1, then tries to roll off the table and escape the scene.',
  ],
  source: 'original',
};

// The DM's short notes in the story, when something lands in the journal or the pack.
// {title}, {item} and {drive} are filled in by the game.
export const dmNotes = {
  inspirationFromDrive: 'That’s your Drive ({drive}) talking. You gain Heroic Inspiration.',
  inspirationFromRest: 'You wake ready for anything. Resourceful: you gain Heroic Inspiration.',
  alreadyInspired: 'That’s your Drive ({drive}) talking, though you already have Heroic Inspiration.',
  questStarted: 'New quest: {title}. It’s in your journal.',
  questUpdated: 'Journal: {title} updated.',
  itemGained: 'You now have: {item}.',
  itemBought: 'Bought: {item}, for {cost}.',
  source: 'original',
};
