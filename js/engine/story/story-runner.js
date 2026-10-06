// Moves the story along for the active game and collects each "page" to show:
// the text and rolls since the last choice, in the order they happened.
// A page is saved with the game, so a reload shows exactly what the player was looking at.
//
// Page beats:
//   { type: 'chosen', text }               the choice the player just made
//   { type: 'text', text }                 a paragraph of narration
//   { type: 'roll', result, revealed }     a d20 test; revealed once the player has tapped the die
//   { type: 'location', value }            the hero moved (from a #location tag); not shown as text

import { parseTags } from './tags.js';

// How many rolls the roll log keeps in the save. Older ones drop off.
export const ROLL_LOG_LIMIT = 200;

// Runs Ink until it stops for a choice or ends. A roll made while Ink worked out a line
// belongs before that line.
export function runStory(game) {
  const { story } = game;
  const beats = [];
  while (story.canContinue) {
    const text = story.Continue().trim();
    for (const result of game.pendingRolls.splice(0)) {
      beats.push({ type: 'roll', result, revealed: false });
    }
    const tags = parseTags(story.currentTags);
    if (tags.location) beats.push({ type: 'location', value: tags.location });
    if (text) beats.push({ type: 'text', text });
  }
  return beats;
}

// Where the hero is, as far as the player has seen: location changes count only up to the
// first roll they haven't revealed, so the save slot can't give a result away early.
export function currentLocation(game) {
  let location = game.location;
  for (const beat of game.page ? game.page.beats : []) {
    if (beat.type === 'roll' && !beat.revealed) break;
    if (beat.type === 'location') location = beat.value;
  }
  return location;
}

// Takes one of story.currentChoices and runs on. Returns the new page.
export function makeChoice(game, choice) {
  const expected = parseTags(choice.tags).check;
  game.location = currentLocation(game);
  game.story.ChooseChoiceIndex(choice.index);
  const beats = [{ type: 'chosen', text: choice.text }, ...runStory(game)];
  warnIfTagMismatch(expected, beats.find((b) => b.type === 'roll'));
  return { beats };
}

// Starts the story over from the top, keeping the hero and the dice.
export function restartStory(game) {
  game.location = currentLocation(game);
  game.story.ResetState();
  return { beats: runStory(game) };
}

// Called once the player has seen a roll: marks it revealed and adds it to the roll log.
export function revealRoll(game, beat) {
  beat.revealed = true;
  game.rollLog.push({ session: game.sessionCount, result: beat.result });
  if (game.rollLog.length > ROLL_LOG_LIMIT) game.rollLog.splice(0, game.rollLog.length - ROLL_LOG_LIMIT);
}

// Dev check: a choice's #check tag should match the check() the scene actually rolls.
function warnIfTagMismatch(expected, rollBeat) {
  if (!expected) return;
  const result = rollBeat ? rollBeat.result : null;
  if (!result || expected.testId !== result.testId || expected.dc !== result.target.value) {
    const rolled = result ? `${result.testId} against DC ${result.target.value}` : 'nothing';
    console.warn(`Choice tag says check:${expected.testId}:${expected.dc}, but the scene rolled ${rolled}.`);
  }
}
