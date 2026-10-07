// What a save holds, and how a game is built from one.
//
// A save record:
//   version        save format version (SAVE_VERSION when written)
//   slot           1, 2 or 3
//   createdAt      when this game began (ISO date text)
//   savedAt        last played (ISO date text)
//   sessionCount   how many sessions this game has had
//   lastBackupSession  the session it was last backed up in (0 = never); drives the reminder
//   seed           the dice seed the game began with (for reference)
//   rng            the dice generator's state, so a reload rolls the same dice
//   ink            Ink's story state (story.state.toJson())
//   game           { character, location, flags, page, rollLog }: what changes in play
//                  (flags: story flag ids set by set_flag in Ink, e.g. "saw_barrow_light")

import { createRng, Rng } from '../rules/rng.js';
import { currentLocation, runPage } from '../story/story-runner.js';
import { migrations } from './migrations.js';
import { validateCharacter } from '../character/validate.js';

export const SAVE_VERSION = 7;

// runtime: { story, game } — the compiled story, and whichever game is being played.

// A new game in a slot. Starts the story and runs to the first choice.
// rngState: where the dice generator had got to, if character creation already rolled dice
// with this seed (ability scores, names); otherwise the dice start fresh from the seed.
export function newGame(runtime, { slot, seed, character, rngState = null, now = new Date() }) {
  const game = {
    slot,
    createdAt: now.toISOString(),
    sessionCount: 1,
    lastBackupSession: 0,
    seed,
    rng: rngState ? new Rng(rngState) : createRng(seed),
    story: runtime.story,
    character: structuredClone(character),
    location: null,
    flags: [],
    page: null,
    rollLog: [],
    pendingRolls: [],
    notice: null,
  };
  runtime.game = game;
  runtime.story.ResetState();
  game.page = runPage(game);
  return game;
}

// A snapshot of the game, ready to store. Taken at once, so later play can't change it.
export function gameToSave(game, now = new Date()) {
  return {
    version: SAVE_VERSION,
    slot: game.slot,
    createdAt: game.createdAt,
    savedAt: now.toISOString(),
    sessionCount: game.sessionCount,
    lastBackupSession: game.lastBackupSession,
    seed: game.seed,
    rng: game.rng.getState(),
    ink: game.story.state.toJson(),
    game: structuredClone({
      character: game.character,
      location: currentLocation(game),
      flags: game.flags,
      page: game.page,
      rollLog: game.rollLog,
    }),
  };
}

// Rebuilds a game from a save (any version) and makes it the runtime's active game.
// If the story has changed so much that Ink can't find its place, the scene starts over
// and game.notice says so.
export function loadGame(runtime, record) {
  const save = migrateSave(record);
  const game = {
    slot: save.slot,
    createdAt: save.createdAt,
    sessionCount: save.sessionCount,
    lastBackupSession: save.lastBackupSession,
    seed: save.seed,
    rng: new Rng(save.rng),
    story: runtime.story,
    character: save.game.character,
    location: save.game.location,
    flags: save.game.flags,
    page: save.game.page,
    rollLog: save.game.rollLog,
    pendingRolls: [],
    notice: null,
  };
  runtime.game = game;
  try {
    runtime.story.state.LoadJson(save.ink);
  } catch (error) {
    console.warn("Couldn't restore the story position:", error);
    runtime.story.ResetState();
    game.page = runPage(game);
    game.notice = 'The story has changed since this save, so the scene starts again.';
  }
  return game;
}

// Checks that a save (already upgraded to the current version) has every part in the right
// shape, so a damaged or hand-edited backup is refused with a reason instead of breaking
// the game later. Returns the save.
export function validateSave(save) {
  const isText = (v) => typeof v === 'string';
  const isWhole = (v) => Number.isInteger(v);
  const isDate = (v) => isText(v) && !Number.isNaN(Date.parse(v));
  const problems = [];

  if (!isDate(save.createdAt) || !isDate(save.savedAt)) problems.push('dates');
  if (!isWhole(save.sessionCount) || save.sessionCount < 1) problems.push('session count');
  if (!isWhole(save.lastBackupSession) || save.lastBackupSession < 0) problems.push('backup record');
  if (!isText(save.seed)) problems.push('dice seed');
  if (!Array.isArray(save.rng) || save.rng.length !== 4 || !save.rng.every(isWhole)) problems.push('dice state');
  if (!isText(save.ink)) problems.push('story position');

  const game = save.game;
  if (!game || typeof game !== 'object') {
    problems.push('game');
  } else {
    // The hero must be a legal character under the creation rules.
    const hero = game.character;
    let heroOk = hero && typeof hero === 'object' && hero.baseAbilityScores && typeof hero.baseAbilityScores === 'object';
    if (heroOk) {
      try {
        heroOk = validateCharacter(hero).length === 0;
      } catch {
        heroOk = false;
      }
    }
    if (!heroOk) problems.push('hero');
    if (game.location !== null && !isText(game.location)) problems.push('location');
    if (!Array.isArray(game.flags) || !game.flags.every(isText)) problems.push('story flags');
    const beatTypes = ['chosen', 'text', 'roll', 'location'];
    const pageOk = game.page && Array.isArray(game.page.beats) && game.page.beats.every((b) => b && beatTypes.includes(b.type));
    if (!pageOk) problems.push('current page');
    if (!Array.isArray(game.rollLog)) problems.push('roll log');
  }

  if (problems.length > 0) {
    throw new Error(`This save is damaged. These parts are missing or wrong: ${problems.join(', ')}.`);
  }
  return save;
}

// Upgrades a save from an older version, one version at a time.
// steps and currentVersion are only passed in by the tests.
export function migrateSave(save, steps = migrations, currentVersion = SAVE_VERSION) {
  if (!save || !Number.isInteger(save.version)) {
    throw new Error("This save has no version number, so it can't be loaded.");
  }
  if (save.version > currentVersion) {
    throw new Error(
      `This save comes from a newer version of Questbound (save version ${save.version}). ` +
        'Reload to update the game, then try again.',
    );
  }
  let upgraded = save;
  while (upgraded.version < currentVersion) {
    const from = upgraded.version;
    const step = steps[from];
    if (!step) throw new Error(`There's no way to upgrade a version ${from} save.`);
    upgraded = step(structuredClone(upgraded));
    if (upgraded.version !== from + 1) {
      throw new Error(`The upgrade from save version ${from} didn't produce version ${from + 1}.`);
    }
  }
  return upgraded;
}
