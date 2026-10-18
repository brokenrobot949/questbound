// Story checks: the Ink bridge (externals, flags, scenes, jumping). Open tests/story.html
// through the local server to run them.

import { test, assertEqual, assertTrue, run } from './harness.js';
import { Compiler, CompilerOptions, JsonFileHandler } from '../vendor/ink-full.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { continueAfterBattle, jumpTo, listScenes, makeChoice, revealRoll, startFight } from '../js/engine/story/story-runner.js';
import * as fight from '../js/engine/combat/battle.js';
import { priceAt } from '../js/engine/character/inventory.js';
import { checkModifiers } from '../js/engine/character/sheet.js';
import { rollLine } from '../js/engine/ui/roll-format.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { createRng } from '../js/engine/rules/rng.js';
import { gameToSave, loadGame, newGame } from '../js/engine/save/save-format.js';
import { canRerollRoll, keepRoll, rerollRoll } from '../js/engine/rules/inspiration.js';
import { personSprite } from '../js/engine/ui/speakers.js';
import { findClothColor, findHairColor, findSkinTone } from '../js/engine/character/look.js';
import { people } from '../data/campaign/people.js';
import { sprites } from '../data/campaign/sprites.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';

// Wren Ashdown, the Quick Start Fighter.
const testHero = quickStartHeroes.find((h) => h.id === 'wren').character;

const STORY_URL = new URL('../story/', import.meta.url);

async function freshRuntime() {
  const story = await loadStory(STORY_URL);
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  return runtime;
}

// A tiny story written right here, with the engine's externals attached.
function inlineStory(source) {
  const files = { 'test.ink': source };
  const story = new Compiler(source, new CompilerOptions('test.ink', [], false, null, new JsonFileHandler(files))).Compile();
  const runtime = { story, game: { story, flags: [], pending: [], rng: createRng('inline'), character: testHero } };
  bindExternals(story, runtime);
  return runtime;
}

const EXTERNALS = 'EXTERNAL check(skill, dc)\nEXTERNAL set_flag(id)\nEXTERNAL has_flag(id)\n';

function checkChoice(game) {
  return game.story.currentChoices.find((c) => (c.tags || []).some((t) => t.startsWith('check:')));
}

test('Flags: set_flag remembers a flag and has_flag reads it', () => {
  const { story, game } = inlineStory(
    `${EXTERNALS}{has_flag("met_warden"): yes before|no before}\n~ set_flag("met_warden")\n~ set_flag("met_warden")\n{has_flag("met_warden"): yes after|no after}\n-> END\n`,
  );
  assertEqual(story.ContinueMaximally(), 'no before\nyes after\n');
  assertEqual(game.flags, ['met_warden'], 'setting a flag twice keeps one copy');
});

test('Flags: choices can be hidden until a flag is set', () => {
  const { story, game } = inlineStory(`${EXTERNALS}Hi.\n* {has_flag("knows_password")} [Say the password] -> END\n* [Leave] -> END\n`);
  story.ContinueMaximally();
  assertEqual(story.currentChoices.map((c) => c.text), ['Leave']);
  game.flags.push('knows_password');
  story.ResetState();
  story.ContinueMaximally();
  assertEqual(story.currentChoices.map((c) => c.text), ['Say the password', 'Leave']);
});

test('Flags: the north gate sets a flag for each outcome, and the save keeps it', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'flags', character: testHero });
  forceNextD20(20);
  game.page = makeChoice(game, checkChoice(game));
  revealRoll(game, game.page.beats.find((b) => b.type === 'roll'));
  assertEqual(game.flags, ['warden_opened_gate']);
  const reloaded = loadGame(await freshRuntime(), JSON.parse(JSON.stringify(gameToSave(game))));
  assertEqual(reloaded.flags, ['warden_opened_gate']);

  const failing = newGame(runtime, { slot: 1, seed: 'flags', character: testHero });
  forceNextD20(1);
  failing.page = makeChoice(failing, checkChoice(failing));
  assertEqual(failing.flags, ['saw_barrow_light']);
});

test('Scenes: every knot and stitch is listed for the jump menu', async () => {
  const { story } = await freshRuntime();
  const scenes = listScenes(story);
  for (const name of ['ch1_arrival', 'ch1_arrival.gate_opens', 'ch1_arrival.night_at_the_gate', 'bramblegate', 'market.stall']) {
    assertTrue(scenes.includes(name), `${name} should be listed`);
  }
  assertTrue(!scenes.some((s) => /\s/.test(s)), "Ink's own entries (like 'global decl') should be left out");
});

test('Scenes: each page knows which knot it happens in', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'scene', character: testHero });
  assertEqual(game.page.scene, 'ch1_arrival');
  const { story, game: inline } = inlineStory(`${EXTERNALS}-> first\n=== first ===\nOne.\n* [Go] -> second\n=== second ===\nTwo.\n* [Stop] -> END\n`);
  inline.page = { beats: [], scene: null };
  assertEqual(jumpTo(inline, 'first').scene, 'first');
  inline.page = makeChoice(inline, story.currentChoices[0]);
  assertEqual(inline.page.scene, 'second');
});

test('Debug jump: moves straight to a stitch and runs on from there', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'jump', character: testHero });
  game.page = jumpTo(game, 'ch1_arrival.night_at_the_gate');
  const text = game.page.beats.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
  assertTrue(text.includes('dry patch under the eaves'), 'the stitch text should show');
  assertEqual([game.page.scene, game.flags], ['bramblegate', ['saw_barrow_light']]);
  assertTrue(game.story.currentChoices.length > 0, 'it runs on to the town square');
});

test('Spells: the gate offers the Light trick only to heroes who can cast Light, tagged with the spell', async () => {
  const runtime = await freshRuntime();
  const lightChoice = (game) => game.story.currentChoices.find((c) => (c.tags || []).includes('spell:light'));
  const wren = newGame(runtime, { slot: 1, seed: 'light', character: testHero });
  assertEqual(lightChoice(wren), undefined, 'a Fighter without spells never sees it');
  const juniper = newGame(runtime, { slot: 1, seed: 'light', character: quickStartHeroes.find((h) => h.id === 'juniper').character });
  const choice = lightChoice(juniper);
  assertTrue(Boolean(choice), 'a Wizard who knows Light sees it');
  makeChoice(juniper, choice);
  assertEqual(juniper.flags, ['warden_opened_gate']);
});

// ---- Chapter 1 ----

const juniperHero = quickStartHeroes.find((h) => h.id === 'juniper').character;

// Takes the choice whose card text starts with these words.
function pick(game, start) {
  const choice = game.story.currentChoices.find((c) => c.text.startsWith(start));
  if (!choice) throw new Error(`No choice starting "${start}": ${game.story.currentChoices.map((c) => c.text).join(' / ')}`);
  game.page = makeChoice(game, choice);
  return game.page;
}
const notesOn = (page) => page.beats.filter((b) => b.type === 'note').map((b) => b.text);
const cards = (game) => game.story.currentChoices.map((c) => c.text);

test('Chapter 1: the opening line follows the Drive, and the hero decides which ways in they see', async () => {
  const runtime = await freshRuntime();
  const wren = newGame(runtime, { slot: 1, seed: 'gate', character: testHero });
  assertTrue(cards(wren).includes("Show her your old regiment's token"), 'a Soldier has a token');
  const juniper = newGame(runtime, { slot: 1, seed: 'gate', character: juniperHero });
  assertTrue(juniper.page.beats[0].text.startsWith('You came north for answers.'), 'Juniper’s Drive is Knowledge');
  assertTrue(!cards(juniper).some((t) => t.includes('token')), 'a Sage has no regiment');
  assertTrue(cards(juniper).includes('Make her lantern flame dance'), 'a Rock Gnome knows Prestidigitation');
});

test('Chapter 1: a night in Bramblegate is a long rest, and a Human wakes with Heroic Inspiration', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'night', character: testHero });
  const page = pick(game, "Show her your old regiment's token");
  assertEqual([game.day, game.inspiration], [2, true]);
  assertTrue(notesOn(page).some((n) => n.includes('Resourceful')), 'the player is told why');
  assertTrue(game.inventory.some((e) => e.id === 'potion-of-healing'), 'Morwen’s potion, on the house');
  assertTrue(game.journal.deeds.some((d) => d.day === 1 && d.text.includes('regiment')), 'the deed is stamped day 1');
  assertTrue(cards(game).includes("Go to the reeve's hall"), 'the town square opens up');
});

test('Chapter 1: the bounty starts the quest, Lark adds to it, and the hero’s own Drive earns Heroic Inspiration', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'bounty', character: juniperHero });
  pick(game, 'Wait out the night');
  assertEqual([game.day, game.inspiration], [2, false], 'a Gnome has no Resourceful trait');
  pick(game, "Go to the reeve's hall");
  const page = pick(game, 'Take the job. Fifty gold is fifty gold.');
  assertEqual(game.inspiration, false, 'Wealth isn’t Juniper’s Drive');
  assertTrue(notesOn(page).some((n) => n.startsWith('New quest: The Missing Miller')));
  assertEqual([game.journal.quests[0].id, game.journal.unread], ['missing-miller', true]);
  assertTrue(cards(game).some((t) => t.startsWith('Promise her')), 'Lark finds the hero');
  pick(game, 'Ask what makes her so sure');
  pick(game, "Call in at Hob's forge");
  const knowledge = game.story.currentChoices.find((c) => c.text.startsWith('Ask Hob'));
  assertTrue(knowledge.tags.includes('drive:knowledge'), 'the card is tagged with its Drive');
  const inspired = pick(game, 'Ask Hob');
  assertEqual(game.inspiration, true);
  assertTrue(notesOn(inspired).some((n) => n.includes('Heroic Inspiration')));
  const notes = game.journal.quests[0].notes.map((n) => n.text);
  assertTrue(notes.some((n) => n.includes('Lark')) && notes.some((n) => n.includes('Hob')), 'Lark’s and Hob’s clues are in the journal');
});

test('Chapter 1: the market takes coins, fills the pack, and only offers what the hero can afford', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'market', character: testHero });
  pick(game, "Show her your old regiment's token");
  pick(game, 'Browse the market');
  assertTrue(cards(game).includes('Buy a torch') && !cards(game).includes('Buy a Potion of Healing'), '18 GP won’t buy a 50 GP potion');
  const before = game.money;
  const page = pick(game, 'Buy a torch');
  assertEqual(game.money, before - 1, 'a torch costs 1 CP');
  assertEqual(game.inventory.find((e) => e.id === 'torch').quantity, 1);
  assertTrue(notesOn(page).includes('Bought: Torch, for 1 CP.'));
});

test('Chapter 1: townsfolk don’t repeat their greeting after each answer, and no page says anything twice', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'talk', character: testHero });
  const texts = (page) => page.beats.filter((b) => b.type === 'text').map((b) => b.text);
  const go = (start) => {
    const page = pick(game, start);
    const said = texts(page);
    assertEqual(said.filter((t, i) => said.indexOf(t) !== i), [], `"${start}" repeats itself`);
    return said;
  };
  go("Show her your old regiment's token");
  go("Call in at Hob's forge");
  assertEqual(go('Ask Hob').length, 2, 'Hob’s answer, and no greeting after it');
  assertEqual(cards(game), ["Take Hob's bet: arm-wrestle his apprentice", "Look over Hob's blades", 'Back to the square'], 'asked once, that’s it');
  go('Back to the square');
  assertEqual(go("Call in at Hob's forge").length, 1, 'coming back gets one short greeting');
  go('Back to the square');
  go('Look in at the temple');
  assertEqual(go('Pray for the missing miller').length, 1, 'the Prior doesn’t greet you again');
  assertTrue(cards(game).some((t) => t.startsWith('Ask the Prior')), 'the other question is still there');
  go('Back to the square');
  go('Read the notice board');
  assertTrue(!go('Tear down').some((t) => t.startsWith('CAPABLE FOLK')), 'the notices aren’t read out again');
  go('Back to the square');
  assertEqual(go('Read the notice board').length, 1, 'a second look is one line');
});

// ---- Who speaks ----

test('Speakers: every #speaker tag names someone in people.js, and everyone there can be drawn', async () => {
  const main = await (await fetch(new URL('main.ink', STORY_URL))).text();
  const files = [...main.matchAll(/^INCLUDE (.+)$/gm)].map((m) => m[1].trim());
  const source = (await Promise.all(files.map(async (f) => (await fetch(new URL(f, STORY_URL))).text()))).join('\n');
  const used = new Set([...source.matchAll(/#speaker:([a-z0-9-]+)/g)].map((m) => m[1]));
  assertEqual([...used].filter((id) => !people.some((p) => p.id === id)), [], 'unknown speakers');
  assertTrue(used.size >= 10, `${used.size} people speak in Chapter 1`);
  for (const person of people) {
    if (person.sprite) {
      assertTrue(Boolean(sprites[person.sprite]), `${person.id}: no sprite ${person.sprite}`);
      continue;
    }
    const { look } = person;
    assertTrue(Boolean(findSkinTone(look.skin) && findHairColor(look.hairColor) && findClothColor(look.outfit) && findClothColor(look.accent)), `${person.id}: a look colour isn't in hero-looks.js`);
    assertEqual(personSprite(person).frames.length, 2, person.id);
  }
});

test('Story text: an inline condition never starts its words with a space before punctuation ("Mill , the")', async () => {
  const main = await (await fetch(new URL('main.ink', STORY_URL))).text();
  const files = [...main.matchAll(/^INCLUDE (.+)$/gm)].map((m) => m[1].trim());
  for (const file of files) {
    const source = await (await fetch(new URL(file, STORY_URL))).text();
    // Ink keeps the space after the colon: { cond: , text} prints " , text".
    const bad = source.split('\n').filter((line) => !line.trim().startsWith('//') && /\{[^{}]*\): [,.;:!?]/.test(line));
    assertEqual(bad, [], file);
  }
  const { story } = inlineStory(`${EXTERNALS}Three{has_flag("x"):, four|, five}.\n-> END\n`);
  assertEqual(story.ContinueMaximally(), 'Three, five.\n', 'no space before the comma');
});

test('Speakers: a line someone speaks carries who it is on the page', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'speakers', character: testHero });
  const pike = game.page.beats.find((b) => b.type === 'text' && b.text.startsWith('"Gate shuts at sundown,"'));
  assertEqual(pike.speaker, 'pike');
  assertTrue(game.page.beats.filter((b) => b.type === 'text' && !b.speaker).length > 0, 'narration has no speaker');
});

// ---- Heroic Inspiration ----

// A new game at the north gate, Wren failing to talk Warden Pike round (a natural 1).
async function failedAtTheGate(inspired = true) {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'inspired', character: testHero });
  game.inspiration = inspired;
  forceNextD20(1);
  game.page = makeChoice(game, game.story.currentChoices.find((c) => c.text.startsWith('Talk her into opening the gate')));
  return { game, beat: game.page.beats.find((b) => b.type === 'roll') };
}
const talkedRound = (game) => game.journal.deeds.some((d) => d.text.startsWith('Talked Warden Pike'));

test('Heroic Inspiration: a failed check can be rerolled, and the scene plays out from the new roll', async () => {
  const { game, beat } = await failedAtTheGate();
  assertTrue(!canRerollRoll(game, beat), 'not before the player has seen the roll');
  revealRoll(game, beat);
  assertTrue(canRerollRoll(game, beat) && !talkedRound(game));
  const record = gameToSave(game);
  game.page = rerollRoll(game, beat);
  const again = game.page.beats.find((b) => b.type === 'roll');
  // (Wren is Human, so a night's rest at the inn can give her Inspiration back.)
  assertEqual([again.result.rerolled.from, again.result.natural, again.revealed, game.undo], [1, again.result.rerolled.to, false, null]);
  assertTrue(game.page.beats.some((b) => b.type === 'note' && b.text.startsWith('You spend your Heroic Inspiration')));
  assertEqual(talkedRound(game), again.result.success, 'the story follows the new roll');
  assertEqual(game.page.beats.filter((b) => b.type === 'chosen').length, 1, 'the choice once, not twice');

  // Closing the game in between changes nothing: the save rerolls the same way.
  const loaded = loadGame(await freshRuntime(), record);
  const same = rerollRoll(loaded, loaded.page.beats.find((b) => b.type === 'roll'));
  assertEqual(same.beats.find((b) => b.type === 'roll').result.natural, again.result.natural);
});

test('Heroic Inspiration: no reroll without it, for a kept roll, or for someone else’s roll', async () => {
  const plain = await failedAtTheGate(false);
  revealRoll(plain.game, plain.beat);
  assertTrue(!canRerollRoll(plain.game, plain.beat) && plain.game.undo === null, 'no Inspiration, nothing kept to go back to');

  const { game, beat } = await failedAtTheGate();
  revealRoll(game, beat);
  const theirs = { type: 'roll', revealed: true, result: { ...beat.result, opponent: 'Warden Pike' } };
  game.page.beats.push(theirs);
  assertTrue(!canRerollRoll(game, theirs), 'the warden’s die isn’t yours');
  keepRoll(beat);
  assertTrue(!canRerollRoll(game, beat) && game.inspiration, 'kept, and the Inspiration with it');
});

// ---- Act I's side quests: Chapter 1 ----

const soraelHero = quickStartHeroes.find((h) => h.id === 'sorael').character;

// Scripted d20 faces first, then the seeded dice: for rolls in an exact order.
function scriptedThen(faces, seed) {
  const queue = [...faces];
  const rest = createRng(seed);
  return { nextInt: (n) => (queue.length ? queue.shift() - 1 : rest.nextInt(n)), getState: () => rest.getState() };
}

// A new game in Bramblegate's square on the first morning (Morwen's breakfast eaten).
async function inTheSquare(seed, character = testHero) {
  const game = newGame(await freshRuntime(), { slot: 1, seed, character });
  game.page = jumpTo(game, 'ch1_morning');
  return game;
}

// Starts the fight on the card starting with these words, and settles it: won (every foe down)
// or lost (the hero down). setUp(game) looks at the fight first. (A fight settled this way
// banks no XP of its own.)
function settleFight(game, start, { won = true, setUp = () => {} } = {}) {
  const choice = game.story.currentChoices.find((c) => c.text.startsWith(start) && (c.tags || []).some((t) => t.startsWith('combat:')));
  if (!choice) throw new Error(`No fight "${start}": ${cards(game).join(' / ')}`);
  startFight(game, choice);
  setUp(game);
  if (won) for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  else game.hp = 0;
  game.battle.outcome = won ? 'victory' : 'defeat';
  game.page = continueAfterBattle(game);
}

const pageText = (page) => page.beats.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
const questStatus = (game, id) => (game.journal.quests.find((q) => q.id === id) || {}).status || null;
const has = (game, flag) => game.flags.includes(flag);
const athletics = (character) => checkModifiers(character, 'athletics').modifiers.reduce((sum, m) => sum + m.value, 0);

test('Too Many Cats: the notice sends you to Morwen; smoke keeps the nest asleep; the cats, the nest’s loot and free breakfasts', async () => {
  const game = await inTheSquare('cats');
  pick(game, 'Read the notice board');
  assertTrue(pageText(game.page).includes('WOLVES on the north road'), 'Pike’s notice is up too');
  pick(game, 'Take the notice about Biscuit');
  assertEqual(questStatus(game, 'too-many-cats'), 'active');
  assertEqual(cards(game), ['Have a look round the stable first', "Take Morwen's smudge pot up the ladder", 'Climb straight up the ladder']);
  forceNextD20(20);
  pick(game, 'Have a look round');
  assertTrue(has(game, 'saw_stirge_bites') && cards(game).includes("Work out what's been biting the cob"), 'the bites open the Nature check');
  forceNextD20(20);
  pick(game, 'Work out');
  assertTrue(has(game, 'knows_stirges') && pageText(game.page).includes('Stirges'));
  pick(game, "Take Morwen's smudge pot");
  assertTrue(has(game, 'smoked_the_nest'));
  assertEqual(cards(game), ['Fight them', 'Creep across the boards, and strike first']);
  settleFight(game, 'Fight them', {
    setUp: (g) => {
      assertEqual(fight.enemies(g.battle).map((c) => c.name), ['Stirge 1', 'Stirge 2']);
      assertEqual(g.battle.reinforcements, null, 'the nest sleeps in the smoke');
    },
  });
  assertTrue(pageText(game.page).includes('They were besieged.'));
  assertEqual(cards(game), ['Coax them down', "Leave the hatch open, and let them come down when they're ready"]);
  const [money, potions, xp] = [game.money, game.inventory.find((e) => e.id === 'potion-of-healing').quantity, game.xp];
  pick(game, 'Leave the hatch open');
  assertEqual([game.money - money, game.inventory.find((e) => e.id === 'potion-of-healing').quantity - potions, game.xp - xp], [800, 1, 50], '8 gold and a potion from the nest, and the quest’s 50 XP');
  assertTrue(has(game, 'cats_done') && has(game, 'morwen_free_breakfasts') && questStatus(game, 'too-many-cats') === 'done');
  assertTrue(cards(game).includes('Read the notice board'), 'back in the square');
  pick(game, 'Read the notice board');
  assertTrue(!cards(game).some((t) => t.includes('Biscuit')) && pageText(game.page).includes("Warden Pike's wolf bounty") && !pageText(game.page).includes('Biscuit'), 'the cat is off the board');
});

test('Too Many Cats: without the smoke a third Stirge wakes on round 3; creeping up strikes first; losing is Fate’s Mercy', async () => {
  const game = await inTheSquare('cats-unsmoked');
  pick(game, 'Read the notice board');
  pick(game, 'Take the notice about Biscuit');
  pick(game, 'Climb straight up');
  forceNextD20(20);
  pick(game, 'Creep across');
  assertEqual(cards(game), ['Strike']);
  assertTrue(game.story.currentChoices[0].tags.includes('surprise'));
  settleFight(game, 'Strike', {
    won: false,
    setUp: (g) => {
      assertTrue(g.battle.surprise, 'a surprise attack');
      assertEqual(g.battle.reinforcements.coming, true, 'the nest wakes on round 3');
      assertEqual(fight.objectiveText(g.battle), 'One Stirge is coming from the nest: it arrives at the start of round 3.');
    },
  });
  assertEqual(game.money, 0, 'Nan Burdock takes her fee');
  assertTrue(has(game, 'cats_fates_mercy') && has(game, 'cats_done') && questStatus(game, 'too-many-cats') === 'done', 'Morwen finishes the job, and the cats come down');
});

test('Wolves: Pike pays ten gold; the empty hills say why they’re starving; driving her off is worth the fight’s XP', async () => {
  const game = await inTheSquare('wolves');
  pick(game, 'Read the notice board');
  pick(game, 'Take Warden Pike up on the wolf bounty');
  assertEqual(questStatus(game, 'wolf-den'), 'active');
  assertEqual(cards(game), ['Read the ground as you go', 'Keep to the road, and go straight up to the den']);
  let xp = game.xp;
  forceNextD20(20);
  pick(game, 'Read the ground');
  assertTrue(has(game, 'wolves_starving') && game.xp - xp === 25, 'the deer are gone: 25 XP');
  assertEqual(questStatus(game, 'missing-miller'), null, 'no note in a quest not yet taken');
  pick(game, 'Walk straight up to it');
  assertTrue(pageText(game.page).includes('an answer comes'), 'she howls for her mate');
  assertTrue(cards(game).includes('Fight her') && !cards(game).some((t) => t.startsWith('Strike before')));
  const money = game.money;
  xp = game.xp;
  forceNextD20(20);
  pick(game, 'Make yourself big and loud');
  assertTrue(has(game, 'wolves_moved_on') && has(game, 'wolf_den_done') && questStatus(game, 'wolf-den') === 'done');
  assertEqual([game.money - money, game.xp - xp], [1000, 150], 'ten gold; both wolves’ 100 XP and the contract’s 50');
  assertTrue(pageText(game.page).includes('Gone’s as good as dead') || pageText(game.page).includes("Gone's as good as dead"));
  assertTrue(cards(game).includes('Read the notice board'), 'back in the square');
});

test('Wolves: coming at the den unseen keeps her mate away and strikes first; a won fight is paid too', async () => {
  const game = await inTheSquare('wolves-unseen');
  game.flags.push('took_bounty'); // so the hills' story goes in The Missing Miller
  pick(game, 'Read the notice board');
  pick(game, 'Take Warden Pike up on the wolf bounty');
  forceNextD20(20);
  pick(game, 'Read the ground');
  assertTrue(game.journal.quests.find((q) => q.id === 'missing-miller').notes.some((n) => n.text.startsWith('The deer have gone')), 'a note in The Missing Miller');
  forceNextD20(20); // Stealth, in Chain Mail: both dice
  pick(game, 'Circle round');
  assertTrue(has(game, 'den_unseen') && cards(game).includes("Strike before she knows you're there") && !cards(game).includes('Fight her'));
  const money = game.money;
  settleFight(game, 'Strike before', {
    setUp: (g) => {
      assertTrue(g.battle.surprise);
      assertEqual(g.battle.reinforcements, null, 'her mate never heard her');
    },
  });
  assertTrue(has(game, 'wolves_killed') && has(game, 'wolf_den_done'));
  assertEqual(game.money - money, 1000);
});

test('Hob’s bet: Greta rolls, then you; a tie goes again; a win takes 10% off Hob’s blades', async () => {
  const game = await inTheSquare('hob', soraelHero);
  pick(game, "Call in at Hob's forge");
  pick(game, "Take Hob's bet");
  const grip = game.story.currentChoices.find((c) => c.text.startsWith('Grip her hand'));
  assertTrue(grip.tags.includes('contest:athletics:Greta') && grip.tags.includes('drive:glory'));
  assertTrue(cards(game).some((t) => t.startsWith('Grease your palm')), 'a Rogue can cheat');
  const bonus = athletics(soraelHero);
  game.rng = scriptedThen([10, 15 - bonus], 'hob-tie'); // Greta 10 + 5; Sorael the same
  pick(game, 'Grip her hand');
  const rolls = game.page.beats.filter((b) => b.type === 'roll').map((b) => b.result);
  assertEqual(rolls.map((r) => [r.label, r.total, r.outcome, Boolean(r.opponent)]), [["Greta's Athletics check", 15, null, true], ['Athletics contest', 15, 'tie', false]]);
  assertEqual(rollLine(rolls[1]).endsWith('= 15 vs Greta’s 15 — tie'), true, rollLine(rolls[1]));
  assertEqual(cards(game), ['Go again']);
  const money = game.money;
  game.rng = scriptedThen([2, 20], 'hob-win');
  pick(game, 'Go again');
  assertTrue(has(game, 'hob_discount') && has(game, 'won_hobs_bet') && has(game, 'hobs_bet_done'));
  assertEqual(game.money - money, 100, 'Hob’s gold piece');
  assertEqual(cards(game), ['Ask Hob everything he knows about the barrows', "Look over Hob's blades", 'Back to the square'], 'the bet is won');
  pick(game, "Look over Hob's blades");
  const dagger = game.story.currentChoices.find((c) => c.text === 'Buy a dagger');
  assertTrue(dagger.tags.includes('buy:dagger') && dagger.tags.includes('shop:hobs-forge'));
  assertEqual([priceAt(game, 'dagger'), priceAt(game, 'dagger', 'hobs-forge'), priceAt(game, 'javelin', 'hobs-forge')], [200, 180, 45], '10% off, rounded down to the copper');
  const before = game.money;
  pick(game, 'Buy a dagger');
  assertEqual(game.money, before - 180);
  assertTrue(notesOn(game.page).includes('Bought: Dagger, for 1 GP, 8 SP.'));
});

test('Hob’s bet: losing buys the smithy a round; turning it down leaves the offer standing', async () => {
  const game = await inTheSquare('hob-lose', soraelHero);
  pick(game, "Call in at Hob's forge");
  pick(game, "Take Hob's bet");
  pick(game, 'Laugh it off');
  assertTrue(!has(game, 'hobs_bet_done') && cards(game).includes("Take Hob's bet: arm-wrestle his apprentice"), 'the bet stands');
  pick(game, "Take Hob's bet");
  const money = game.money;
  game.rng = scriptedThen([20, 1], 'hob-lose');
  pick(game, 'Grip her hand');
  assertTrue(has(game, 'lost_hobs_bet') && has(game, 'hobs_bet_done') && !has(game, 'hob_discount'));
  assertEqual(game.money - money, -100, 'a round for the smithy');
  pick(game, "Look over Hob's blades");
  assertEqual(game.story.currentChoices.find((c) => c.text === 'Buy a dagger').tags.includes('shop:hobs-forge'), true);
  assertEqual(priceAt(game, 'dagger', 'hobs-forge'), 200, 'no discount');
});

test('The last morning: Act I’s missed side quests wait in Bramblegate before the road south, then the End of Act I', async () => {
  const game = newGame(await freshRuntime(), { slot: 1, seed: 'last-morning', character: testHero });
  game.page = jumpTo(game, 'ch3_night.morning');
  assertEqual(cards(game), ['Go out into Bramblegate, one last time']);
  assertTrue(!has(game, 'act_1_complete'), 'not over yet');
  pick(game, 'Go out into Bramblegate');
  const all = ['Ask Morwen whether her cats ever came home', "Read Warden Pike's notice about the wolves on the north road", "Call in at Hob's forge", 'Ride south with the shard'];
  assertEqual(cards(game), all);
  pick(game, 'Ask Morwen');
  assertTrue(pageText(game.page).includes('A fortnight'), 'the cats have been gone a while now');
  pick(game, "Take Morwen's smudge pot");
  settleFight(game, 'Fight them');
  pick(game, 'Coax them down');
  assertEqual(cards(game), all.filter((t) => !t.startsWith('Ask Morwen')), 'back to the last morning, the cats done');
  pick(game, "Call in at Hob's forge");
  assertEqual(cards(game), ["Take Hob's bet: arm-wrestle his apprentice", "Look over Hob's blades", 'Back to the square']);
  pick(game, 'Back to the square');
  pick(game, 'Ride south');
  const heading = game.page.beats.find((b) => b.heading);
  assertEqual(heading && heading.text, 'End of Act I · The Barrow Dead');
  assertTrue(has(game, 'act_1_complete') && game.story.currentChoices.length === 0);
  assertEqual(game.objective, 'Follow the shard south. (Act II is still being written.)');
});

run(document.getElementById('summary'), document.getElementById('results'));
