// An undo point: the game just before a story choice or one of the hero's attacks, kept while
// the hero holds Heroic Inspiration, so a failed d20 can be rerolled by putting the game back
// and playing that moment again with the new die (see rules/inspiration.js). It's saved with
// the game, so closing the game doesn't take the reroll away:
//
//   game.undo  null, or
//              { kind: 'choice', choice: { index, text }, ink, rng, state }
//              { kind: 'attack', attack: { optionId, targetId }, logLength, after, rng, state }
//   ink        Ink's story state then (for a choice; a fight doesn't move the story)
//   rng        the dice generator's state then
//   state      a copy of everything in PLAY_FIELDS
//   logLength  how many lines the fight log had before the attack; after: how many after it
//              (the reroll is only offered while nothing else has happened since)

// The parts of a game that change in play. A save keeps the same ones (save/save-format.js);
// add any new one to both lists.
export const PLAY_FIELDS = [
  'character',
  'location',
  'time',
  'day',
  'inspiration',
  'flags',
  'journal',
  'money',
  'inventory',
  'hp',
  'slotsUsed',
  'tempHp',
  'activeSpells',
  'featureUses',
  'xp',
  'battle',
  'lastBattle',
  'levelUp',
  'dungeon',
  'objective',
  'session',
  'page',
  'rollLog',
  'pending',
];

// Takes an undo point before a choice or an attack, if the hero has Heroic Inspiration to
// spend; otherwise just clears the old one.
export function takeUndoPoint(game, kind, details) {
  game.undo = null;
  if (!game.inspiration) return;
  const state = {};
  for (const field of PLAY_FIELDS) state[field] = game[field] === undefined ? null : game[field];
  game.undo = {
    kind,
    ...details,
    ink: kind === 'choice' && game.story ? game.story.state.toJson() : null,
    rng: game.rng.getState(),
    state: structuredClone(state),
  };
}

// Puts the game back as it was at its undo point. The undo point itself is used up.
export function restoreUndoPoint(game) {
  const undo = game.undo;
  if (!undo) throw new Error('There is nothing to go back to');
  if (undo.ink) game.story.state.LoadJson(undo.ink); // first: if the story can't go back, nothing has changed
  const state = structuredClone(undo.state);
  for (const field of PLAY_FIELDS) game[field] = state[field];
  if (!Array.isArray(game.pending)) game.pending = [];
  game.rng.setState(undo.rng);
  game.undo = null;
  return undo;
}

// Checks a saved undo point's shape, for loading saves.
export function undoOk(undo) {
  if (undo === null || undo === undefined) return true;
  return Boolean(
    typeof undo === 'object' &&
      ['choice', 'attack'].includes(undo.kind) &&
      Array.isArray(undo.rng) &&
      undo.rng.length === 4 &&
      undo.state &&
      typeof undo.state === 'object' &&
      (undo.kind === 'attack' || (typeof undo.ink === 'string' && undo.choice && Number.isInteger(undo.choice.index))),
  );
}
