// Save checks. Open tests/saves.html through the local server to run them.
// They use a separate database ("questbound-test"), so real saves are never touched.

import { test, assertEqual, assertTrue, assertThrows, assertRejects, run } from './harness.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { currentLocation, makeChoice, revealRoll, ROLL_LOG_LIMIT } from '../js/engine/story/story-runner.js';
import { SAVE_VERSION, gameToSave, loadGame, migrateSave, newGame, validateSave } from '../js/engine/save/save-format.js';
import { backupCode, backupFileName, backupFileText, isBackupDue, readBackup } from '../js/engine/save/backup.js';
import { migrations } from '../js/engine/save/migrations.js';
import { validateCharacter } from '../js/engine/character/validate.js';
import { PlaytestTracker, IDLE_LIMIT_MS, formatDuration, summarizeLog } from '../js/engine/save/playtest-log.js';
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
  assertEqual(Object.keys(record).sort(), ['createdAt', 'game', 'ink', 'lastBackupSession', 'rng', 'savedAt', 'seed', 'sessionCount', 'slot', 'version']);
  assertEqual(Object.keys(record.game).sort(), ['character', 'flags', 'location', 'page', 'rollLog']);
  assertEqual([record.version, record.slot, record.sessionCount, record.lastBackupSession], [SAVE_VERSION, 2, 1, 0]);
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

// ---- Backups: save files and save codes ----

// A finished test-scene save with one revealed roll, as a player would back it up.
async function playedSave(seed = 'backup') {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed, character: testHero });
  game.page = makeChoice(game, checkChoice(game));
  revealRoll(game, rollBeats(game.page)[0]);
  game.sessionCount = 4;
  return throughJson(gameToSave(game));
}

test('Migration: a version 1 save gains a backup record and becomes version 2', () => {
  const upgraded = migrateSave({ version: 1, slot: 2, sessionCount: 5 }, migrations, 2);
  assertEqual(upgraded, { version: 2, slot: 2, sessionCount: 5, lastBackupSession: 0 });
});

test('Backup file: a readable file that restores to the identical save', async () => {
  const save = await playedSave();
  const text = backupFileText(save);
  assertTrue(text.includes('"format": "questbound-save"'), 'the file should say what it is');
  assertEqual(await readBackup(text), save);
});

test('Backup file name: lowercase with hyphens, naming the hero and session', async () => {
  const save = await playedSave();
  assertEqual(backupFileName(save), 'questbound-wren-ashdown-session-4.json');
  save.game.character.name = "  Sir Grümbold O'Hare  ";
  assertEqual(backupFileName(save), 'questbound-sir-gr-mbold-o-hare-session-4.json');
});

test('Save code: one line of plain letters that restores to the identical save', async () => {
  const save = await playedSave();
  const code = await backupCode(save);
  assertTrue(code.startsWith('QB1.'), 'codes start with QB1.');
  assertTrue(/^QB1\.[A-Za-z0-9_-]+$/.test(code), 'only letters, digits, - and _');
  assertEqual(await readBackup(code), save);
});

test('Save code: still works after a messaging app wraps it onto several lines', async () => {
  const save = await playedSave();
  const code = await backupCode(save);
  const wrapped = `  ${code.match(/.{1,60}/g).join('\n')}  \n`;
  assertEqual(await readBackup(wrapped), save);
});

test('Save code: a cut-short or altered code is refused', async () => {
  const code = await backupCode(await playedSave());
  await assertRejects(() => readBackup(code.slice(0, code.length - 20)), 'a cut-short code should fail');
  const middle = Math.floor(code.length / 2);
  const altered = code.slice(0, middle) + (code[middle] === 'A' ? 'B' : 'A') + code.slice(middle + 1);
  await assertRejects(() => readBackup(altered), 'an altered code should fail');
});

test("Restore: things that aren't Questbound saves are refused with a reason", async () => {
  for (const text of ['', 'hello', '{"format": "something-else", "save": {}}', '{ broken json']) {
    let message = null;
    try {
      await readBackup(text);
    } catch (error) {
      message = error.message;
    }
    assertTrue(typeof message === 'string' && message.length > 0, `should refuse ${JSON.stringify(text)}`);
  }
});

test('Restore: a backup from a newer version of the game is refused', async () => {
  const save = await playedSave();
  save.version = SAVE_VERSION + 1;
  await assertRejects(() => readBackup(backupFileText(save)));
});

test('Restore: an older (version 1) backup file is upgraded', async () => {
  const save = await playedSave();
  delete save.lastBackupSession;
  save.version = 1;
  const restored = await readBackup(backupFileText(save));
  assertEqual([restored.version, restored.lastBackupSession], [SAVE_VERSION, 0]);
});

test('Restore: a damaged save is refused, naming what is wrong', async () => {
  const good = await playedSave();
  validateSave(good);
  const broken = structuredClone(good);
  broken.rng = [1, 2];
  delete broken.ink;
  broken.game.character.baseAbilityScores.charisma = 'lots';
  let message = '';
  try {
    validateSave(broken);
  } catch (error) {
    message = error.message;
  }
  for (const part of ['dice state', 'story position', 'hero']) {
    assertTrue(message.includes(part), `the reason should mention the ${part}: "${message}"`);
  }
});

test('Restore: a restored backup plays on from exactly where it was', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 2, seed: 'restore-play', character: testHero });
  const code = await backupCode(throughJson(gameToSave(game)));
  const original = rollBeats(makeChoice(game, checkChoice(game)))[0].result;

  const restored = loadGame(await freshRuntime(), await readBackup(code));
  const again = rollBeats(makeChoice(restored, checkChoice(restored)))[0].result;
  assertEqual(again, original, 'the restored save should roll the same dice');
});

test('Backup reminder: every 10 sessions since the last backup', () => {
  const due = (session, lastBackup) => isBackupDue(session, lastBackup);
  assertEqual([due(10, 0), due(20, 0), due(15, 5), due(25, 5)], [true, true, true, true]);
  assertEqual([due(1, 0), due(9, 0), due(11, 0), due(10, 10), due(14, 5)], [false, false, false, false, false]);
});

test('Migration: a version 2 save gains story flags and a scene name, and becomes version 3', () => {
  const v2 = { version: 2, slot: 1, game: { character: {}, page: { beats: [] } } };
  const upgraded = migrateSave(v2, migrations, 3);
  assertEqual(upgraded.version, 3);
  assertEqual(upgraded.game.flags, []);
  assertEqual(upgraded.game.page, { scene: null, beats: [] });
});

test("Migration: a version 3 save's stand-in hero becomes a legal Human Fighter, keeping name and level", () => {
  const oldHero = {
    id: 'test-hero',
    name: 'Bryn',
    level: 5,
    baseAbilityScores: { strength: 10, dexterity: 14, constitution: 12, intelligence: 13, wisdom: 8, charisma: 16 },
    skillProficiencies: ['persuasion'],
    expertise: [],
    source: 'original',
  };
  const v3 = { version: 3, slot: 1, game: { character: oldHero, flags: [], page: { scene: null, beats: [] } } };
  const upgraded = migrateSave(v3, migrations, 4);
  const hero = upgraded.game.character;
  assertEqual([upgraded.version, hero.name, hero.level, hero.classId, hero.speciesId, hero.backgroundId], [4, 'Bryn', 3, 'fighter', 'human', 'soldier']);
  assertEqual(validateCharacter(hero), [], 'the upgraded hero must be legal');
});

// ---- Playtest log ----

// A pretend clock and storage, so the checks control time.
function fakeTracker(storage = memoryStorage()) {
  const clock = { t: 0 };
  const tracker = new PlaytestTracker({ storage, now: () => clock.t });
  return { tracker, clock, storage };
}

function memoryStorage() {
  const data = {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => (data[k] = String(v)) };
}

function fakeGame(scene, { slot = 1, session = 1, level = 1, createdAt = '2026-10-06T10:00:00Z' } = {}) {
  return { slot, createdAt, sessionCount: session, character: { name: 'Wren', level }, page: { scene } };
}

const SECOND = 1000;

test('Playtest log: times each session and each scene', () => {
  const { tracker, clock } = fakeTracker();
  tracker.startSession(fakeGame('gate'));
  tracker.update(fakeGame('gate'));
  clock.t = 30 * SECOND;
  tracker.update(fakeGame('gate'));
  clock.t = 60 * SECOND;
  tracker.update(fakeGame('inn'));
  clock.t = 90 * SECOND;
  tracker.endSession();
  const s = summarizeLog(tracker.log);
  assertEqual([s.sessionCount, s.averageSessionMs, s.sceneVisits, s.averageSceneMs], [1, 90 * SECOND, 2, 45 * SECOND]);
  assertEqual(s.scenes.map((x) => [x.scene, x.averageMs]).sort(), [['gate', 60 * SECOND], ['inn', 30 * SECOND]]);
});

test('Playtest log: a long gap between actions counts as at most five minutes', () => {
  const { tracker, clock } = fakeTracker();
  tracker.startSession(fakeGame('gate'));
  clock.t = 60 * 60 * SECOND;
  tracker.update(fakeGame('gate'));
  assertEqual(tracker.current.activeMs, IDLE_LIMIT_MS);
});

test("Playtest log: time with the game off screen doesn't count", () => {
  const { tracker, clock } = fakeTracker();
  tracker.startSession(fakeGame('gate'));
  clock.t = 10 * SECOND;
  tracker.pause();
  clock.t = 10 * 60 * SECOND;
  tracker.resume();
  clock.t = 10 * 60 * SECOND + 20 * SECOND;
  tracker.update(fakeGame('gate'));
  assertEqual(tracker.current.activeMs, 30 * SECOND);
});

test('Playtest log: back to the title and straight back in is still one session', () => {
  const { tracker, clock } = fakeTracker();
  tracker.startSession(fakeGame('gate'));
  clock.t = 10 * SECOND;
  tracker.endSession();
  clock.t = 5 * 60 * SECOND;
  tracker.startSession(fakeGame('gate'));
  clock.t = 5 * 60 * SECOND + 10 * SECOND;
  tracker.update(fakeGame('gate'));
  assertEqual([tracker.log.sessions.length, tracker.current.activeMs], [1, 20 * SECOND]);
});

test('Playtest log: levels reached and deaths, per game', () => {
  const { tracker } = fakeTracker();
  tracker.startSession(fakeGame('gate', { session: 1, level: 1 }));
  tracker.update(fakeGame('gate', { session: 1, level: 3 }));
  tracker.recordDeath();
  tracker.startSession(fakeGame('gate', { session: 2, level: 3 }));
  tracker.startSession(fakeGame('gate', { slot: 2, createdAt: '2026-10-07T10:00:00Z', level: 1 }));
  const s = summarizeLog(tracker.log);
  assertEqual([s.sessionCount, s.highestLevel, s.deaths, s.deathsPerSession], [3, 3, 1, 1 / 3]);
  assertEqual(s.games.map((g) => [g.slot, g.sessions, g.highestLevel, g.deaths]), [[1, 2, 3, 1], [2, 1, 1, 0]]);
});

test('Playtest log: kept on the device, and a scene left open by a closed page is still counted', () => {
  const storage = memoryStorage();
  const first = fakeTracker(storage);
  first.tracker.startSession(fakeGame('gate'));
  first.tracker.update(fakeGame('gate'));
  first.clock.t = 40 * SECOND;
  first.tracker.pause(); // the phone locks, then the page is closed
  const second = fakeTracker(storage);
  assertEqual(second.tracker.log.scenes.map((v) => [v.scene, v.ms]), [['gate', 40 * SECOND]]);
});

test('Playtest log: reloading for an update carries on the same session entry', () => {
  const storage = memoryStorage();
  const before = fakeTracker(storage);
  before.tracker.startSession(fakeGame('gate', { session: 5 }));
  const after = fakeTracker(storage);
  after.tracker.startSession(fakeGame('gate', { session: 5 }));
  after.tracker.startSession(fakeGame('gate', { session: 6 }));
  assertEqual(after.tracker.log.sessions.map((s) => s.session), [5, 6]);
});

test('Playtest log: durations read naturally', () => {
  assertEqual([formatDuration(38 * SECOND), formatDuration(245 * SECOND), formatDuration(3720 * SECOND)], ['38s', '4m 05s', '1h 02m']);
});

run(document.getElementById('summary'), document.getElementById('results'));
