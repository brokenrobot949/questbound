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
  const runtime = { story, game: { story, flags: [], pendingRolls: [], rng: createRng('inline'), character: testHero } };
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

test('Flags: the test scene sets a flag for each outcome, and the save keeps it', async () => {
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
  for (const name of ['gate_test', 'gate_test.gate_opens', 'gate_test.gate_stays_shut', 'gate_test.night_at_the_gate']) {
    assertTrue(scenes.includes(name), `${name} should be listed`);
  }
  assertTrue(!scenes.some((s) => /\s/.test(s)), "Ink's own entries (like 'global decl') should be left out");
});

test('Scenes: each page knows which knot it happens in', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'scene', character: testHero });
  assertEqual(game.page.scene, 'gate_test');
  const { story, game: inline } = inlineStory(`${EXTERNALS}-> first\n=== first ===\nOne.\n* [Go] -> second\n=== second ===\nTwo.\n* [Stop] -> END\n`);
  inline.page = { beats: [], scene: null };
  assertEqual(jumpTo(inline, 'first').scene, 'first');
  inline.page = makeChoice(inline, story.currentChoices[0]);
  assertEqual(inline.page.scene, 'second');
});

test('Debug jump: moves straight to a stitch and runs on from there', async () => {
  const runtime = await freshRuntime();
  const game = newGame(runtime, { slot: 1, seed: 'jump', character: testHero });
  game.page = jumpTo(game, 'gate_test.night_at_the_gate');
  const text = game.page.beats.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
  assertTrue(text.includes('dry patch under the eaves'), 'the stitch text should show');
  assertEqual([game.page.scene, game.flags, game.story.currentChoices.length], ['gate_test', ['saw_barrow_light'], 0]);
});

run(document.getElementById('summary'), document.getElementById('results'));
