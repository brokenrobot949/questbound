// Save checks. Open tests/saves.html through the local server to run them.
// They use a separate database ("questbound-test"), so real saves are never touched.

import { test, assertEqual, assertTrue, assertThrows, assertRejects, run } from './harness.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { currentLocation, currentTime, makeChoice, revealRoll, ROLL_LOG_LIMIT } from '../js/engine/story/story-runner.js';
import { SAVE_VERSION, gameToSave, loadGame, migrateSave, newGame, validateSave } from '../js/engine/save/save-format.js';
import { backupCode, backupFileName, backupFileText, isBackupDue, readBackup } from '../js/engine/save/backup.js';
import { migrations } from '../js/engine/save/migrations.js';
import { validateCharacter } from '../js/engine/character/validate.js';
import { PlaytestTracker, IDLE_LIMIT_MS, formatDuration, summarizeLog } from '../js/engine/save/playtest-log.js';
import { openSaveStore, deleteSaveDatabase } from '../js/engine/save/save-store.js';
import { createRng } from '../js/engine/rules/rng.js';
import { beginLevelUp, chooseHitPoints } from '../js/engine/character/level-up.js';
import { beginSession, endSession, recap, whatNow } from '../js/engine/story/sessions.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';

// Wren Ashdown, the Quick Start Fighter.
const testHero = quickStartHeroes.find((h) => h.id === 'wren').character;

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

test('New game: the story starts with the hero in session 1 at the north gate, on day 1', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'new', character: testHero });
  assertEqual([game.sessionCount, currentLocation(game), currentTime(game), game.day], [1, 'Bramblegate, north gate', 'Dusk', 1]);
  assertEqual(game.page.beats[0].text, 'You came north to set things right. A town is being bled dry, and nobody important seems to care.', 'Wren’s Drive is Justice');
  assertEqual(game.story.currentChoices.length, 5, 'talk, bluster, lie, the Soldier’s token, or wait');
  assertTrue(game.character !== testHero, 'the hero should be a copy, not the data file itself');
  assertTrue(runtime.game === game, 'the new game should become the active game');
});

test('New game: the hero starts with the coins and pack from their kits, no Inspiration and an empty journal', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'kit', character: testHero });
  assertEqual(game.money, 1800, 'Fighter kit A 4 GP and Soldier kit A 14 GP, in copper');
  assertTrue(game.inventory.some((e) => e.id === 'chain-mail') && game.inventory.some((e) => e.id === 'arrow' && e.quantity === 20));
  assertEqual([game.inspiration, game.journal], [false, { quests: [], deeds: [], sessions: [], unread: false }]);
});

test('A save holds game state, Ink state, dice state, session count and last-played time', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 2, seed: 'contents', character: testHero, now: new Date('2026-10-01T09:00:00Z') });
  const record = gameToSave(game, new Date('2026-10-06T12:00:00Z'));
  assertEqual(Object.keys(record).sort(), ['createdAt', 'game', 'ink', 'lastBackupSession', 'rng', 'savedAt', 'seed', 'sessionCount', 'slot', 'version']);
  assertEqual(Object.keys(record.game).sort(), ['activeSpells', 'battle', 'canPrepare', 'character', 'day', 'dungeon', 'featureUses', 'flags', 'hp', 'inspiration', 'inventory', 'journal', 'lastBattle', 'levelUp', 'location', 'money', 'objective', 'page', 'rollLog', 'session', 'slotsUsed', 'tempHp', 'time', 'undo', 'xp']);
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

test('The north gate: a check is rolled, saved and reloaded correctly', async () => {
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
  assertEqual([currentLocation(reloaded), reloaded.notice], ['Bramblegate, the square', null]);
  assertEqual(reloaded.story.currentChoices.length, game.story.currentChoices.length);
});

test("The save slot doesn't give a result away: a move after an unrevealed roll waits for the reveal", async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 's2', character: testHero });
  game.page = makeChoice(game, checkChoice(game));
  assertEqual(gameToSave(game).game.location, 'Bramblegate, north gate');
  revealRoll(game, rollBeats(game.page)[0]);
  assertEqual(gameToSave(game).game.location, 'Bramblegate, the square');
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
  assertEqual(reloaded.story.currentChoices.length, 5);
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
  const current = migrateSave(v3, migrations, SAVE_VERSION).game.character;
  assertEqual(validateCharacter(current), [], 'the hero must be legal once fully upgraded');
});

test('Migration: a version 4 hero gains a Drive, a Bond and a starting kit, and becomes version 5', () => {
  const v4hero = { ...testHero };
  delete v4hero.drive;
  delete v4hero.bond;
  delete v4hero.startingEquipment;
  const v4 = { version: 4, slot: 2, game: { character: v4hero, flags: [], page: { scene: null, beats: [] } } };
  const upgraded = migrateSave(v4, migrations, 5);
  const hero = upgraded.game.character;
  assertEqual([upgraded.version, hero.drive, hero.bond.type, hero.startingEquipment], [5, 'justice', 'sibling', { class: 'A', background: 'A' }]);
  assertEqual(validateCharacter(hero), [], 'the upgraded hero must be legal');
});

test('Migration: a version 5 Wizard (Sage) gains a spellbook and Magic Initiate spells, and becomes version 6', () => {
  const juniper = structuredClone(quickStartHeroes.find((h) => h.id === 'juniper').character);
  delete juniper.spells;
  delete juniper.magicInitiate;
  const v5 = { version: 5, slot: 3, game: { character: juniper, flags: [], page: { scene: null, beats: [] } } };
  const hero = migrateSave(v5, migrations, 6).game.character;
  assertEqual([hero.spells.cantrips.length, hero.spells.spellbook.length, hero.spells.prepared.length], [3, 6, 4]);
  assertEqual(hero.magicInitiate.map((e) => [e.source, e.list]), [['background', 'wizard']]);
  assertEqual(validateCharacter(hero), [], 'the upgraded hero must be legal');
  const fighter = { ...testHero };
  delete fighter.spells;
  delete fighter.magicInitiate;
  const upgraded = migrateSave({ ...v5, game: { ...v5.game, character: fighter } }, migrations, 6).game.character;
  assertEqual([upgraded.spells, upgraded.magicInitiate], [null, []]);
});

test('Migration: a version 6 hero gains the starting look for their species and class, and becomes version 7', () => {
  const orc = { ...structuredClone(testHero), speciesId: 'orc', speciesSkills: [], originFeat: null };
  delete orc.look;
  const v6 = { version: 6, slot: 1, game: { character: orc, flags: [], page: { scene: null, beats: [] } } };
  const hero = migrateSave(v6, migrations, 7).game.character;
  assertEqual([hero.look.skin, hero.look.hairStyle, hero.look.outfit, hero.look.headgear], ['green', 'long', 'red', 'none']);
  assertEqual(validateCharacter(hero), [], 'the upgraded hero must be legal');
});

test('Migration: a version 8 game gains full Hit Points, unspent slots, no XP and no fight, and becomes version 9', () => {
  const v8 = { version: 8, slot: 1, game: { character: structuredClone(testHero), flags: [], page: { scene: null, beats: [] } } };
  const game = migrateSave(v8, migrations, 9).game;
  assertEqual([game.hp, game.slotsUsed, game.featureUses, game.xp, game.battle, game.lastBattle], [12, [], {}, 0, null, null]);
});

test('Migration: a version 10 game has never been in a dungeon, and becomes version 11', () => {
  const v10 = { version: 10, slot: 1, game: { character: structuredClone(testHero), levelUp: null } };
  const save = migrateSave(v10, migrations, 11);
  assertEqual([save.version, save.game.dungeon], [11, null]);
});

test('A save with a damaged dungeon state is refused', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'dungeon-check', character: testHero });
  const record = throughJson(gameToSave(game));
  record.game.dungeon = { id: 'brackenhollow', room: 'ballroom', explored: [] };
  assertThrows(() => validateSave(record), 'an unknown room');
  record.game.dungeon = { id: 'brackenhollow', room: 'larder', explored: ['larder'] };
  assertEqual(validateSave(record).version, SAVE_VERSION);
});

test('Migration: a version 9 game gains no level-up in progress, and becomes version 10', () => {
  const v9 = { version: 9, slot: 1, game: { character: structuredClone(testHero), xp: 40 } };
  const save = migrateSave(v9, migrations, 10);
  assertEqual([save.version, save.game.levelUp, save.game.xp], [10, null, 40]);
});

test('A level-up half done is saved, and a rolled Hit Die stays rolled after a reload', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'level-save', character: testHero });
  game.xp = 300;
  beginLevelUp(game);
  chooseHitPoints(game, 'roll');
  const rolled = game.levelUp.hitPoints;
  const reloaded = loadGame(await freshRuntime(), throughJson(gameToSave(game)));
  assertEqual(reloaded.levelUp, { level: 2, hitPoints: rolled, subclassId: null, scholarSkill: null, spellbook: [], savant: [], prepared: [] });
  assertThrows(() => chooseHitPoints(reloaded, 'fixed'), 'no swapping a bad roll for the fixed value');
  assertEqual(validateSave(throughJson(gameToSave(reloaded))).version, SAVE_VERSION);
  const broken = throughJson(gameToSave(reloaded));
  broken.game.levelUp.spellbook = 'lots';
  assertThrows(() => validateSave(broken), 'a damaged level-up is refused');
});

test('Migration: a version 7 game gains a day, a journal, and coins and a pack from its kits, and becomes version 8', () => {
  const v7 = { version: 7, slot: 1, game: { character: structuredClone(testHero), flags: [], page: { scene: null, beats: [] } } };
  const game = migrateSave(v7, migrations, 8).game;
  assertEqual([game.day, game.time, game.inspiration, game.money], [1, null, false, 1800]);
  assertEqual(game.journal, { quests: [], deeds: [], unread: false });
  assertTrue(game.inventory.some((e) => e.id === 'greatsword'), 'Fighter kit A');
});

test('Day, Inspiration, journal, coins and pack survive a save and reload', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'state', character: testHero });
  Object.assign(game, { day: 3, inspiration: true, money: 1234 });
  game.journal.deeds.push({ day: 2, text: 'Did a brave thing.' });
  game.inventory.push({ id: 'potion-of-healing', quantity: 2 });
  const reloaded = loadGame(await freshRuntime(), throughJson(gameToSave(game)));
  assertEqual([reloaded.day, reloaded.inspiration, reloaded.money], [3, true, 1234]);
  assertEqual(reloaded.journal.deeds, [{ day: 2, text: 'Did a brave thing.' }]);
  assertEqual(reloaded.inventory.at(-1), { id: 'potion-of-healing', quantity: 2 });
  assertEqual(validateSave(throughJson(gameToSave(reloaded))).version, SAVE_VERSION);
});

test('New game: dice rolled during character creation carry on into the game', async () => {
  const runtime = await freshRuntime();
  const creationDice = createRng('carry-on');
  creationDice.nextUint32(); // say, rolling a name
  const carried = newGame(runtime, { slot: 1, seed: 'carry-on', character: testHero, rngState: creationDice.getState() });
  assertEqual(carried.rng.getState(), creationDice.getState());
  const fresh = newGame(runtime, { slot: 1, seed: 'carry-on', character: testHero });
  assertTrue(JSON.stringify(fresh.rng.getState()) !== JSON.stringify(carried.rng.getState()), 'without a state, the dice start from the seed');
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

// ---- The session ritual ----

test('Migration: a version 11 game gains session summaries, an aim and a session start, and becomes version 12', () => {
  const v11 = {
    version: 11,
    slot: 1,
    sessionCount: 4,
    savedAt: '2026-10-01T10:00:00.000Z',
    game: { character: structuredClone(testHero), day: 2, xp: 75, journal: { quests: [{ id: 'missing-miller', status: 'active', day: 1, notes: [] }], deeds: [{ day: 1, text: 'Did a thing.' }], unread: false } },
  };
  const game = migrateSave(v11, migrations, 12).game;
  assertEqual([game.objective, game.journal.sessions], [null, []]);
  assertEqual(game.session, { number: 4, startedAt: '2026-10-01T10:00:00.000Z', day: 2, xp: 75, level: 1, deeds: 1, quests: { 'missing-miller': 'active' }, ended: false });
});

test('Migration: a version 12 game gains no Temporary Hit Points and no spells on the hero, and becomes version 13', () => {
  const v12 = { version: 12, slot: 1, game: { hp: 9, battle: { round: 2, effects: [] } } };
  const game = migrateSave(v12, migrations, 13).game;
  assertEqual([game.tempHp, game.activeSpells, game.battle.concentration], [0, [], null]);
  assertEqual(migrateSave({ version: 12, slot: 1, game: { battle: null } }, migrations, 13).game.battle, null, 'no fight, nothing to add');
});

test('Migration: a version 13 game has no undo point for Heroic Inspiration yet, and becomes version 14', () => {
  const save = migrateSave({ version: 13, slot: 1, game: { inspiration: true } }, migrations, 14);
  assertEqual([save.version, save.game.undo, save.game.inspiration], [14, null, true]);
});

test('Migration: a version 14 game hasn’t just finished a Long Rest, and becomes version 15', () => {
  const save = migrateSave({ version: 14, slot: 1, game: { undo: null } }, migrations, 15);
  assertEqual([save.version, save.game.canPrepare], [15, false]);
});

test('Sessions: a new session sums up the last one in the journal if the player just closed the game', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'session', character: testHero });
  game.journal.deeds.push({ day: 1, text: 'Did a brave thing.' });
  game.xp += 50;
  game.sessionCount += 1;
  beginSession(game);
  assertEqual(game.journal.sessions, [{ session: 1, fromDay: 1, toDay: 1, deeds: ['Did a brave thing.'], xp: 50, fromLevel: 1, toLevel: 1, questsStarted: [], questsFinished: [] }]);
  assertEqual([game.session.number, game.session.deeds, game.session.xp, game.session.ended], [2, 1, 50, false]);
  game.sessionCount += 1;
  beginSession(game);
  assertEqual(game.journal.sessions.length, 1, 'nothing happened in session 2, so nothing is written');
});

test('Sessions: End session writes the summary once', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'end', character: testHero });
  game.journal.deeds.push({ day: 1, text: 'Did a brave thing.' });
  assertEqual(endSession(game).session, 1);
  assertEqual(endSession(game), null, 'already ended');
  game.sessionCount += 1;
  beginSession(game);
  assertEqual(game.journal.sessions.length, 1, 'not written twice');
  assertEqual(validateSave(throughJson(gameToSave(game))).version, SAVE_VERSION);
});

test('Recap: only after more than an hour away, with the last three deeds and the aim', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'recap', character: testHero });
  for (const text of ['One.', 'Two.', 'Three.', 'Four.']) game.journal.deeds.push({ day: 1, text });
  game.objective = 'Find the miller.';
  const now = new Date('2026-10-07T12:00:00Z');
  assertEqual(recap(game, '2026-10-07T11:30:00Z', now), null, 'half an hour is no time at all');
  const r = recap(game, '2026-10-07T10:00:00Z', now);
  assertEqual([r.deeds, r.aim], [['Two.', 'Three.', 'Four.'], 'Find the miller.']);
  assertTrue(typeof r.opener === 'string' && r.opener.length > 0);
});

test('What now? and the aim: the story sets the aim, and the newest quest gives the latest word', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'aim', character: testHero });
  assertTrue(/north gate/.test(whatNow(game).aim), 'the gate scene sets an aim');
  game.page = makeChoice(game, game.story.currentChoices.find((c) => c.text.startsWith('Wait out the night')));
  game.journal.quests.push({ id: 'missing-miller', status: 'active', day: 1, notes: [{ day: 1, text: 'Boot prints at the mill.' }] });
  assertEqual(whatNow(game).quest, { title: 'The Missing Miller', note: 'Boot prints at the mill.' });
  const reloaded = loadGame(await freshRuntime(), throughJson(gameToSave(game)));
  assertEqual(reloaded.objective, game.objective, 'the aim is saved');
});

test('Stopping points: a page with a long rest ends by saying it’s a good place to stop', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'rest', character: testHero });
  game.page = makeChoice(game, game.story.currentChoices.find((c) => c.text.startsWith('Wait out the night')));
  const last = game.page.beats.at(-1);
  assertTrue(last.type === 'note' && last.text.startsWith('A good place to stop'), JSON.stringify(last));
  assertEqual(game.page.beats.filter((b) => b.text === last.text).length, 1, 'said once');
});

run(document.getElementById('summary'), document.getElementById('results'));
