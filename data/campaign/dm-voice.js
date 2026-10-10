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
  // How the DM opens the "Previously…" recap when you come back after a while. The game
  // takes turns through them, session by session.
  recapOpeners: [
    'Previously…',
    'When last we left our hero…',
    'Settle in. Here’s where we were…',
  ],
  source: 'original',
};

// The DM's short notes in the story, when something lands in the journal or the pack.
// {title}, {item}, {drive}, {xp}, {level}, {hp}, {damage}, {type}, {dice} and {rolls} are filled
// in by the game.
export const dmNotes = {
  inspirationFromDrive: 'That’s your Drive ({drive}) talking. You gain Heroic Inspiration.',
  inspirationFromRest: 'You wake ready for anything. Resourceful: you gain Heroic Inspiration.',
  alreadyInspired: 'That’s your Drive ({drive}) talking, though you already have Heroic Inspiration.',
  questStarted: 'New quest: {title}. It’s in your journal.',
  questUpdated: 'Journal: {title} updated.',
  questFinished: 'Quest complete: {title}.',
  stoppingPoint: 'A good place to stop, if you need to: your game is saved, and the story will be right here.',
  coinsGained: 'You receive {coins}.',
  itemGained: 'You now have: {item}.',
  itemBought: 'Bought: {item}, for {cost}.',
  itemGone: 'Gone from your pack: {item}.',
  xpGained: 'You gain {xp} XP.',
  coinsLost: 'Your purse is gone.',
  fightWon: 'Victory! You gain {xp} XP.',
  damageTaken: 'You take {damage} {type} damage ({dice}: {rolls}).',
  blackedOut: 'You drop to 0 Hit Points and black out. Nobody is here to help: you make death saving throws.',
  cameRound: 'You come round with 1 Hit Point.',
  fellDead: 'Darkness takes you.',
  levelUpNote: 'You are now level {level}. Your Hit Point maximum rises by {hp}.',
  levelUpDeed: 'Reached level {level}.',
  spellWoreOff: 'Time passes, and your {spell} wears off.',
  castWithSlot: 'You cast {spell}, using a {cost}.',
  castRitual: 'You cast {spell} as a Ritual: ten minutes longer, and no spell slot.',
  castFree: 'You cast {spell} without a spell slot (once per Long Rest).',
  source: 'original',
};

// The DM marks a new level with a line of narration, by class ({level} is filled in).
// "default" is for any class without its own line.
export const levelUpVoice = {
  fighter: 'Somewhere between the last fight and this quiet moment, your body learned something your mind is only now catching up with. Your stance is surer and your swing is quicker. You reach level {level}.',
  wizard: 'Your notes, scrawled by candlelight and spattered with mud, suddenly make a new kind of sense. The shape of the magic feels less like a riddle and more like a tool. You reach level {level}.',
  default: 'Everything you have survived has taught you something. You reach level {level}.',
  source: 'original',
};
