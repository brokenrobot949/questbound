// Startup: builds the game's pieces and opens the first screen.

import { createRng, randomSeed } from './engine/rules/rng.js';
import { loadStory } from './engine/story/ink-loader.js';
import { bindExternals } from './engine/story/externals.js';
import { startSceneScreen, showFatalError } from './engine/ui/scene-screen.js';
import { testHero } from '../data/campaign/test-hero.js';

async function start() {
  // Each page load gets a fresh dice seed; add ?seed=anything to the address to replay
  // the same dice. Saves (a later slice) will store the RNG state instead.
  const seed = new URLSearchParams(window.location.search).get('seed') || randomSeed();
  const rng = createRng(seed);

  const story = await loadStory(new URL('../story/', import.meta.url));

  const pendingRolls = [];
  const context = {
    rng,
    character: testHero,
    recordRoll: (result) => pendingRolls.push(result),
  };
  bindExternals(story, context);

  startSceneScreen({ story, context, pendingRolls, seed, root: document });
}

start().catch(showFatalError);
