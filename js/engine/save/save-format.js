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
//   game           what changes in play:
//                  character, location, time (of day, from the story), day (in-game day,
//                  from 1), inspiration (Heroic Inspiration: true or false), flags (story
//                  flag ids set by set_flag in Ink, e.g. "saw_barrow_light"), journal (see
//                  story/journal.js), money (in copper) and inventory (see
//                  character/inventory.js), hp, slotsUsed, featureUses and xp (see
//                  character/resources.js), battle (a fight in progress, or null; see
//                  combat/battle.js), lastBattle ({ encounterId, outcome } of the last fight),
//                  levelUp (a level-up in progress, or null; see character/level-up.js),
//                  page, rollLog

import { createRng, Rng } from '../rules/rng.js';
import { currentLocation, currentTime, runPage } from '../story/story-runner.js';
import { journalOk, newJournal } from '../story/journal.js';
import { inventoryProblems, startingInventory } from '../character/inventory.js';
import { freshResources, resourceProblems } from '../character/resources.js';
import { battleOk } from '../combat/battle.js';
import { levelUpOk } from '../character/level-up.js';
import { migrations } from './migrations.js';
import { validateCharacter } from '../character/validate.js';

export const SAVE_VERSION = 10;

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
    time: null,
    day: 1,
    inspiration: false,
    flags: [],
    journal: newJournal(),
    ...startingInventory(character),
    ...freshResources(character),
    battle: null,
    lastBattle: null,
    levelUp: null,
    page: null,
    rollLog: [],
    pendingRolls: [],
    pendingNotes: [],
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
      time: currentTime(game),
      day: game.day,
      inspiration: game.inspiration,
      flags: game.flags,
      journal: game.journal,
      money: game.money,
      inventory: game.inventory,
      hp: game.hp,
      slotsUsed: game.slotsUsed,
      featureUses: game.featureUses,
      xp: game.xp,
      battle: game.battle,
      lastBattle: game.lastBattle,
      levelUp: game.levelUp,
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
    time: save.game.time,
    day: save.game.day,
    inspiration: save.game.inspiration,
    flags: save.game.flags,
    journal: save.game.journal,
    money: save.game.money,
    inventory: save.game.inventory,
    hp: save.game.hp,
    slotsUsed: save.game.slotsUsed,
    featureUses: save.game.featureUses,
    xp: save.game.xp,
    battle: save.game.battle,
    lastBattle: save.game.lastBattle,
    levelUp: save.game.levelUp,
    page: save.game.page,
    rollLog: save.game.rollLog,
    pendingRolls: [],
    pendingNotes: [],
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
    if (game.time !== null && !isText(game.time)) problems.push('time of day');
    if (!isWhole(game.day) || game.day < 1) problems.push('day');
    if (typeof game.inspiration !== 'boolean') problems.push('Heroic Inspiration');
    if (!Array.isArray(game.flags) || !game.flags.every(isText)) problems.push('story flags');
    if (!journalOk(game.journal)) problems.push('journal');
    problems.push(...inventoryProblems(game.money, game.inventory));
    problems.push(...resourceProblems(game));
    if (game.battle !== null && !battleOk(game.battle)) problems.push('fight in progress');
    if (game.lastBattle !== null && !(game.lastBattle && isText(game.lastBattle.outcome))) problems.push('last fight');
    if (game.levelUp !== null && !levelUpOk(game.levelUp)) problems.push('level-up in progress');
    const beatTypes = ['chosen', 'text', 'roll', 'note', 'location', 'time'];
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
