// Heroic Inspiration (SRD 5.2.1, Rules Glossary): spend it to reroll a die immediately after
// rolling it, and use the new roll. A hero has it or doesn't (game.inspiration).
//
// The game offers the reroll on the hero's own failed d20 tests, the moment they see them:
//   in a scene  a failed check or save: Reroll, or Keep the roll, under the result
//   in a fight  a missed attack roll on the hero's turn: Reroll above the actions, until they
//               do anything else
// Saves the hero makes during the foes' turns can't be rerolled yet: those turns are decided
// before they play out on screen.
//
// How it works: the game was kept as it was just before that choice or attack (an undo point,
// save/undo.js). A reroll puts the game back, spends the Inspiration, and plays the moment
// again with only that die changed: the same choice or attack, the same dice before it, and
// the new face. What follows can change, of course: that's the point. The new face comes from
// dice of its own, seeded from where the game's dice had got to, so reloading can't change it.

import { createRng } from './rng.js';
import { restoreUndoPoint } from '../save/undo.js';
import { makeChoice, revealRoll } from '../story/story-runner.js';
import { addLogLine, battleScene, heroAttack, isHeroTurn } from '../combat/battle.js';
import { dmNotes } from '../../../data/campaign/dm-voice.js';

function rerollFace(game) {
  return createRng(`heroic-inspiration:${game.seed}:${game.rng.getState().join(',')}`).nextInt(20) + 1;
}

// ---- In a scene ----

// True if this roll on the page can be rerolled now: the hero's own failed check or save,
// already seen, not kept, with Inspiration in hand and the moment before it kept.
export function canRerollRoll(game, beat) {
  const undo = game.undo;
  const result = beat.result;
  return Boolean(
    game.inspiration &&
      undo &&
      undo.kind === 'choice' &&
      game.page &&
      game.page.beats.includes(beat) &&
      beat.revealed &&
      !beat.kept &&
      result.success === false &&
      !result.opponent &&
      !result.rerolled &&
      Number.isInteger(result.sequence),
  );
}

// The player keeps the roll as it is.
export function keepRoll(beat) {
  beat.kept = true;
}

// Rerolls it. Returns the new page: the same choice played again, up to the rerolled roll
// (rolls before it already seen), then a note, then the roll waiting for its tap.
export function rerollRoll(game, beat) {
  if (!canRerollRoll(game, beat)) throw new Error('That roll can’t be rerolled now.');
  const target = beat.result.sequence;
  const reroll = { sequence: target, face: rerollFace(game), from: beat.result.natural };
  const undo = restoreUndoPoint(game);
  game.inspiration = false;
  const choice = game.story.currentChoices.find((c) => c.index === undo.choice.index);
  if (!choice) throw new Error('The story has moved on from that choice.');
  const page = makeChoice(game, choice, { reroll });
  const beats = [];
  for (const b of page.beats) {
    if (b.type === 'roll' && b.result.rerolled) beats.push({ type: 'note', text: dmNotes.inspirationReroll });
    else if (b.type === 'roll' && b.result.sequence < target) revealRoll(game, b);
    beats.push(b);
  }
  return { ...page, beats };
}

// ---- In a fight ----

// The fight log line with the hero's missed attack roll from the attack they just made, if it
// can still be rerolled; otherwise null. (Scorching Ray: its first ray that missed.)
export function attackToReroll(game) {
  const battle = game.battle;
  const undo = game.undo;
  if (!battle || !game.inspiration || !undo || undo.kind !== 'attack' || !isHeroTurn(game) || battle.log.length !== undo.after) return null;
  return battle.log.slice(undo.logLength).find((e) => e.roll && e.roll.kind === 'attack' && e.roll.yours && e.roll.success === false && Number.isInteger(e.roll.sequence)) || null;
}

// Rerolls it: the attack happens again with the new die. Returns { before, kept }: the scene
// before the attack, and how many lines of the fight log stand from before it (for the battle
// screen to play the new ones).
export function rerollAttack(game) {
  const entry = attackToReroll(game);
  if (!entry) throw new Error('There’s no missed attack to reroll now.');
  const reroll = { sequence: entry.roll.sequence, face: rerollFace(game), from: entry.roll.natural };
  const kept = game.undo.logLength;
  const lines = game.battle.log.slice(0, kept);
  const undo = restoreUndoPoint(game);
  game.battle.log = lines; // the same lines as before, so the battle screen still knows them
  game.inspiration = false;
  const before = battleScene(game);
  addLogLine(game, dmNotes.inspirationReroll);
  heroAttack(game, undo.attack.optionId, undo.attack.targetId, { reroll });
  return { before, kept };
}
