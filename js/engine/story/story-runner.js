// Moves the story along for the active game and collects each "page" to show:
// the text and rolls since the last choice, in the order they happened.
// A page is saved with the game, so a reload shows exactly what the player was looking at.
//
// A page: { beats, scene }. scene is the Ink knot the page happens in, for the playtest log.
//
// Page beats:
//   { type: 'chosen', text }               the choice the player just made
//   { type: 'text', text }                 a paragraph of narration
//   { type: 'roll', result, revealed }     a d20 test; revealed once the player has tapped the die
//   { type: 'note', text }                 a short DM note ("New quest: …"), from an external
//   { type: 'location', value }            the hero moved (from a #location tag); not shown as text
//   { type: 'time', value }                the time of day changed (from a #time tag); not shown as text
//   { type: 'room', value }                the hero entered a dungeon room (from a #room tag, e.g.
//                                          "brackenhollow/mouth", or "none"); the map shows it

import { parseTags } from './tags.js';
import { enterRoom, parseRoomTag } from '../world/dungeons.js';
import { finishBattle, startBattle } from '../combat/battle.js';
import { dmNotes } from '../../../data/campaign/dm-voice.js';

// How many rolls the roll log keeps in the save. Older ones drop off.
export const ROLL_LOG_LIMIT = 200;

// Runs Ink until it stops for a choice or ends, and returns the page. Rolls and notes made
// while Ink worked out a line belong before that line, in the order they happened.
// leadBeats go first (e.g. the choice just made).
export function runPage(game, leadBeats = []) {
  const { story } = game;
  const beats = [...leadBeats];
  let scene = null;
  while (story.canContinue) {
    const text = story.Continue().trim();
    scene = currentKnot(story) || scene;
    for (const item of game.pending.splice(0)) {
      if (item.type === 'roll') beats.push({ type: 'roll', result: item.result, revealed: false });
      else beats.push({ type: 'note', text: item.text });
    }
    const tags = parseTags(story.currentTags);
    if (tags.location) beats.push({ type: 'location', value: tags.location });
    if (tags.time) beats.push({ type: 'time', value: tags.time });
    if (tags.room) {
      parseRoomTag(tags.room); // a typo in a room tag is a story bug: fail here, not later
      beats.push({ type: 'room', value: tags.room });
    }
    if (text) beats.push({ type: 'text', text });
  }
  return { beats, scene: scene || currentKnot(story) };
}

// Every knot and stitch in the story, e.g. "ch1_arrival" and "ch1_arrival.gate_opens".
export function listScenes(story) {
  const scenes = [];
  for (const [name, knot] of story.mainContentContainer.namedContent) {
    if (/\s/.test(name)) continue; // Ink's own entries, such as "global decl"
    scenes.push(name);
    for (const stitch of knot.namedContent.keys()) scenes.push(`${name}.${stitch}`);
  }
  return scenes;
}

// Debug mode: moves the story straight to a knot or stitch and runs on. Returns the new page.
// A fight in progress is left behind.
export function jumpTo(game, path) {
  settleSeen(game);
  game.battle = null;
  game.pending.length = 0;
  game.story.ChoosePathString(path);
  return runPage(game);
}

// Where the hero is, as far as the player has seen: location changes count only up to the
// first roll they haven't revealed, so the save slot can't give a result away early.
export function currentLocation(game) {
  return lastSeen(game, 'location', game.location);
}

// The time of day, as far as the player has seen ("Dusk"), or null if no scene has said.
export function currentTime(game) {
  return lastSeen(game, 'time', game.time || null);
}

// Which dungeon room the hero is in, and the rooms they've explored, as far as the player
// has seen (see world/dungeons.js), or null.
export function currentDungeon(game) {
  let state = game.dungeon || null;
  for (const beat of game.page ? game.page.beats : []) {
    if (beat.type === 'roll' && !beat.revealed) break;
    if (beat.type === 'room') state = enterRoom(state, parseRoomTag(beat.value));
  }
  return state;
}

// Before the story moves on: what the player has seen of this page becomes the starting point.
function settleSeen(game) {
  game.location = currentLocation(game);
  game.time = currentTime(game);
  game.dungeon = currentDungeon(game);
}

function lastSeen(game, type, start) {
  let value = start;
  for (const beat of game.page ? game.page.beats : []) {
    if (beat.type === 'roll' && !beat.revealed) break;
    if (beat.type === type) value = beat.value;
  }
  return value;
}

// Takes one of story.currentChoices and runs on. Returns the new page.
export function makeChoice(game, choice) {
  const expected = parseTags(choice.tags).check;
  settleSeen(game);
  game.story.ChooseChoiceIndex(choice.index);
  const page = runPage(game, [{ type: 'chosen', text: choice.text }]);
  warnIfTagMismatch(expected, page.beats.find((b) => b.type === 'roll'));
  return page;
}

// A choice tagged #combat:encounter-id starts a fight instead of running on. The story waits
// at the same choice until the fight ends (see continueAfterBattle).
export function startFight(game, choice) {
  const encounterId = parseTags(choice.tags).combat;
  if (!encounterId) throw new Error('That choice does not start a fight');
  settleSeen(game);
  return startBattle(game, encounterId, choice.index);
}

// Once the player has seen how the fight ended: banks its XP, then takes the story choice
// that started it, so the scene carries on (combat_won() tells it who won). Returns the page.
export function continueAfterBattle(game) {
  const xp = game.battle.outcome === 'victory' ? game.battle.xp : 0;
  const { choiceIndex } = finishBattle(game);
  if (xp) game.pending.push({ type: 'note', text: dmNotes.fightWon.replace('{xp}', xp) });
  const choice = game.story.currentChoices[choiceIndex];
  if (!choice) throw new Error('The story moved on during the fight');
  return makeChoice(game, choice);
}

// Starts the story over from the top, keeping the hero and the dice.
export function restartStory(game) {
  settleSeen(game);
  game.story.ResetState();
  return runPage(game);
}

// Called once the player has seen a roll: marks it revealed and adds it to the roll log.
export function revealRoll(game, beat) {
  beat.revealed = true;
  game.rollLog.push({ session: game.sessionCount, result: beat.result });
  if (game.rollLog.length > ROLL_LOG_LIMIT) game.rollLog.splice(0, game.rollLog.length - ROLL_LOG_LIMIT);
}

// The knot Ink was last in, from its position in the story ("ch1_arrival.gate_opens.0").
function currentKnot(story) {
  const pointer = story.state.previousPointer;
  const path = pointer && pointer.path ? pointer.path.toString() : null;
  const choice = story.currentChoices[0];
  const fromChoice = choice && choice.sourcePath ? choice.sourcePath : null;
  const knot = (path || fromChoice || '').split('.')[0];
  return /^[A-Za-z_]/.test(knot) ? knot : null; // top-level story content has no knot
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
