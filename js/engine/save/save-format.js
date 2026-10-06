// What a save holds, and how a game is built from one.
//
// A save record:
//   version        save format version (SAVE_VERSION when written)
//   slot           1, 2 or 3
//   createdAt      when this game began (ISO date text)
//   savedAt        last played (ISO date text)
//   sessionCount   how many sessions this game has had
//   seed           the dice seed the game began with (for reference)
//   rng            the dice generator's state, so a reload rolls the same dice
//   ink            Ink's story state (story.state.toJson())
//   game           { character, location, page, rollLog }: what changes in play

import { createRng, Rng } from '../rules/rng.js';
import { currentLocation, runStory } from '../story/story-runner.js';
import { migrations } from './migrations.js';

export const SAVE_VERSION = 1;

// runtime: { story, game } — the compiled story, and whichever game is being played.

// A new game in a slot. Starts the story and runs to the first choice.
export function newGame(runtime, { slot, seed, character, now = new Date() }) {
  const game = {
    slot,
    createdAt: now.toISOString(),
    sessionCount: 1,
    seed,
    rng: createRng(seed),
    story: runtime.story,
    character: structuredClone(character),
    location: null,
    page: null,
    rollLog: [],
    pendingRolls: [],
    notice: null,
  };
  runtime.game = game;
  runtime.story.ResetState();
  game.page = { beats: runStory(game) };
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
    seed: game.seed,
    rng: game.rng.getState(),
    ink: game.story.state.toJson(),
    game: structuredClone({
      character: game.character,
      location: currentLocation(game),
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
    seed: save.seed,
    rng: new Rng(save.rng),
    story: runtime.story,
    character: save.game.character,
    location: save.game.location,
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
    game.page = { beats: runStory(game) };
    game.notice = 'The story has changed since this save, so the scene starts again.';
  }
  return game;
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
