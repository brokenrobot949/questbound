// Save checks. Open tests/saves.html through the local server to run them.
// They use a separate database ("questbound-test"), so real saves are never touched.

import { test, assertEqual, assertTrue, assertThrows, run } from './harness.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { currentLocation, makeChoice, revealRoll, ROLL_LOG_LIMIT } from '../js/engine/story/story-runner.js';
import { SAVE_VERSION, gameToSave, loadGame, migrateSave, newGame } from '../js/engine/save/save-format.js';
import { openSaveStore, deleteSaveDatabase } from '../js/engine/save/save-store.js';
import { testHero } from '../data/campaign/test-hero.js';

const STORY_URL = new URL('../story/', import.meta.url);
const TEST_DB = 'questbound-test';

// A freshly compiled story with the engine attached, as after a page load.
async function freshRuntime() {
  const story = await loadStory(STORY_URL);
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  return runtime;
}

// Sends a save through JSON, the strictest form a save takes (export files will use it).
function throughJson(record) {
  return JSON.parse(JSON.stringify(record));
}

function checkChoice(game) {
  return game.story.currentChoices.find((c) => (c.tags || []).some((t) => t.startsWith('check:')));
}

function rollBeats(page) {
  return page.beats.filter((b) => b.type === 'roll');
}

// ---- Migrations ----

test('Migration: a current save passes through unchanged', () => {
  const save = { version: SAVE_VERSION, slot: 1 };
  assertEqual(migrateSave(save), save);
});

test('Migration: an old save is upgraded one version at a time', () => {
  const steps = {
    1: (s) => ({ ...s, version: 2, gold: 10 }),
    2: (s) => ({ ...s, version: 3, gold: s.gold * 2 }),
  };
  const old = { version: 1, slot: 1 };
  assertEqual(migrateSave(old, steps, 3), { version: 3, slot: 1, gold: 20 });
  assertEqual(old, { version: 1, slot: 1 }, 'the original save should be left alone');
});

test('Migration: saves from a newer game, or with no version, are refused', () => {
  assertThrows(() => migrateSave({ version: SAVE_VERSION + 1 }));
  assertThrows(() => migrateSave({ slot: 1 }));
  assertThrows(() => migrateSave(null));
});

test('Migration: a missing or faulty upgrade step is refused', () => {
  assertThrows(() => migrateSave({ version: 1 }, {}, 2));
  assertThrows(() => migrateSave({ version: 1 }, { 1: (s) => s }, 2));
});

// ---- New games and save contents ----

test('New game: the test scene starts with the hero in session 1 at the north gate', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'new', character: testHero });
  assertEqual([game.sessionCount, currentLocation(game)], [1, 'Bramblegate, north gate']);
  assertEqual(game.page.beats.map((b) => b.type), ['location', 'text', 'text', 'text']);
  assertEqual(game.story.currentChoices.length, 2);
  assertTrue(game.character !== testHero, 'the hero should be a copy, not the data file itself');
  assertTrue(runtime.game === game, 'the new game should become the active game');
});

test('A save holds game state, Ink state, dice state, session count and last-played time', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 2, seed: 'contents', character: testHero, now: new Date('2026-10-01T09:00:00Z') });
  const record = gameToSave(game, new Date('2026-10-06T12:00:00Z'));
  assertEqual(Object.keys(record).sort(), ['createdAt', 'game', 'ink', 'rng', 'savedAt', 'seed', 'sessionCount', 'slot', 'version']);
  assertEqual(Object.keys(record.game).sort(), ['character', 'location', 'page', 'rollLog']);
  assertEqual([record.version, record.slot, record.sessionCount], [SAVE_VERSION, 2, 1]);
  assertEqual([record.createdAt, record.savedAt], ['2026-10-01T09:00:00.000Z', '2026-10-06T12:00:00.000Z']);
  assertTrue(record.rng.length === 4 && record.rng.every(Number.isInteger), 'dice state should be four whole numbers');
  assertTrue(typeof record.ink === 'string' && record.ink.length > 0, 'Ink state should be saved');
  assertEqual(throughJson(record), record, 'a save should survive being turned into text and back');
});

test('A save is a snapshot: playing on afterwards does not change it', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'snapshot', character: testHero });
  const record = gameToSave(game);
  const before = JSON.stringify(record);
  game.page = makeChoice(game, checkChoice(game));
  revealRoll(game, rollBeats(game.page)[0]);
  assertEqual(JSON.stringify(record), before);
});

// ---- Reloading ----

test('Phase 0 gate: the test scene rolls a check, saves and reloads correctly', async () => {
  const first = await freshRuntime();
  const game = newGame(first, { slot: 1, seed: 's2', character: testHero });
  game.page = makeChoice(game, checkChoice(game));
  const [roll] = rollBeats(game.page);
  assertTrue(roll !== undefined, 'the Persuasion choice should roll a check');
  revealRoll(game, roll);
  const record = throughJson(gameToSave(game));

  // A new page load: a freshly compiled story, then the save.
  const second = await freshRuntime();
  const reloaded = loadGame(second, record);
  assertEqual(reloaded.story.state.toJson(), game.story.state.toJson(), 'Ink should be at the same place');
  assertEqual(reloaded.page, throughJson(game.page), 'the same page should show');
  assertEqual(reloaded.rng.getState(), game.rng.getState(), 'the dice should carry on from the same point');
  assertEqual(reloaded.rollLog, throughJson(game.rollLog), 'the roll log should come back');
  assertEqual([currentLocation(reloaded), reloaded.notice], ['Bramblegate', null]);
  assertEqual(reloaded.story.currentChoices.length, game.story.currentChoices.length);
});

test("The save slot doesn't give a result away: a move after an unrevealed roll waits for the reveal", async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 's2', character: testHero });
  game.page = makeChoice(game, checkChoice(game));
  assertEqual(gameToSave(game).game.location, 'Bramblegate, north gate');
  revealRoll(game, rollBeats(game.page)[0]);
  assertEqual(gameToSave(game).game.location, 'Bramblegate');
});

test("Reloading can't re-roll: loading the same save always gives the same dice", async () => {
  const first = await freshRuntime();
  const game = newGame(first, { slot: 1, seed: 'no-rerolls', character: testHero });
  const beforeChoosing = throughJson(gameToSave(game));
  const original = rollBeats(makeChoice(game, checkChoice(game)))[0].result;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const runtime = await freshRuntime();
    const again = loadGame(runtime, beforeChoosing);
    const result = rollBeats(makeChoice(again, checkChoice(again)))[0].result;
    assertEqual(result, original, `reload ${attempt} rolled differently`);
  }
});

test('A roll the player had not revealed is still hidden after a reload, and logs once revealed', async () => {
  const first = await freshRuntime();
  const game = newGame(first, { slot: 3, seed: 'unrevealed', character: testHero });
  game.page = makeChoice(game, checkChoice(game));
  const record = throughJson(gameToSave(game));

  const reloaded = loadGame(await freshRuntime(), record);
  reloaded.sessionCount = 2;
  const [beat] = rollBeats(reloaded.page);
  assertEqual([beat.revealed, reloaded.rollLog.length], [false, 0]);
  revealRoll(reloaded, beat);
  assertEqual([beat.revealed, reloaded.rollLog.length, reloaded.rollLog[0].session], [true, 1, 2]);
});

test(`The roll log keeps the newest ${ROLL_LOG_LIMIT} rolls`, () => {
  const game = { sessionCount: 1, rollLog: [] };
  for (let i = 1; i <= ROLL_LOG_LIMIT + 5; i++) revealRoll(game, { result: { n: i } });
  assertEqual(game.rollLog.length, ROLL_LOG_LIMIT);
  assertEqual([game.rollLog[0].result.n, game.rollLog.at(-1).result.n], [6, ROLL_LOG_LIMIT + 5]);
});

test('If the story changed so much the save no longer fits, the scene starts over with a notice', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'changed', character: testHero });
  const record = throughJson(gameToSave(game));
  record.ink = '{"not": "an ink save"}';
  const reloaded = loadGame(await freshRuntime(), record);
  assertTrue(typeof reloaded.notice === 'string', 'there should be a notice');
  assertEqual(reloaded.story.currentChoices.length, 2);
  assertEqual(reloaded.character, game.character, 'the hero should be kept');
});

// ---- Save slots in IndexedDB ----

test('Save slots: write, read, list and remove', async () => {
  await deleteSaveDatabase(TEST_DB);
  const store = await openSaveStore(TEST_DB);
  try {
    const runtime = await freshRuntime();
    const record = gameToSave(newGame(runtime, { slot: 2, seed: 'store', character: testHero }));
    await store.write(record);
    assertEqual(await store.read(2), record);
    const all = await store.readAll();
    assertEqual([...all.keys()], [1, 2, 3]);
    assertEqual([all.get(1), all.get(3)], [null, null]);
    await store.remove(2);
    assertEqual(await store.read(2), null);
    assertThrows(() => store.write({ ...record, slot: 4 }));
  } finally {
    store.close();
    await deleteSaveDatabase(TEST_DB);
  }
});

test("Save slots: saving again replaces the slot's save, and slots stay separate", async () => {
  await deleteSaveDatabase(TEST_DB);
  const store = await openSaveStore(TEST_DB);
  try {
    const runtime = await freshRuntime();
    const game = newGame(runtime, { slot: 1, seed: 'replace', character: testHero });
    await store.write(gameToSave(game));
    game.sessionCount = 7;
    await store.write(gameToSave(game));
    await store.write({ ...gameToSave(game), slot: 3, sessionCount: 2 });
    assertEqual((await store.read(1)).sessionCount, 7);
    assertEqual((await store.read(3)).sessionCount, 2);
  } finally {
    store.close();
    await deleteSaveDatabase(TEST_DB);
  }
});

run(document.getElementById('summary'), document.getElementById('results'));
