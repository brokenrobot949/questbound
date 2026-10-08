// Story checks: the Ink bridge (externals, flags, scenes, jumping). Open tests/story.html
// through the local server to run them.

import { test, assertEqual, assertTrue, run } from './harness.js';
import { Compiler, CompilerOptions, JsonFileHandler } from '../vendor/ink-full.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { jumpTo, listScenes, makeChoice, revealRoll } from '../js/engine/story/story-runner.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { createRng } from '../js/engine/rules/rng.js';
import { gameToSave, loadGame, newGame } from '../js/engine/save/save-format.js';
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

run(document.getElementById('summary'), document.getElementById('results'));
