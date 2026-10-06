// Startup and screen routing: compiles the story, opens the save slots, then moves between
// the Title screen and the Adventure screen.

import { randomSeed } from './engine/rules/rng.js';
import { loadStory } from './engine/story/ink-loader.js';
import { bindExternals } from './engine/story/externals.js';
import { openSaveStore } from './engine/save/save-store.js';
import { gameToSave, loadGame, newGame } from './engine/save/save-format.js';
import { renderTitleScreen } from './engine/ui/title-screen.js';
import { startAdventureScreen } from './engine/ui/adventure-screen.js';
import { showFatalError, showScreen } from './engine/ui/dom.js';
import { testHero } from '../data/campaign/test-hero.js';

async function start() {
  const story = await loadStory(new URL('../story/', import.meta.url));
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  const store = await openSaveStore();

  // A session is one visit: opening a slot counts once per page load, so going back to the
  // title screen and continuing again in the same visit doesn't add another.
  const openedThisVisit = new Set();

  const saveStatus = document.getElementById('save-status');
  async function autosave(game) {
    const record = gameToSave(game);
    saveStatus.textContent = 'Saving…';
    try {
      await store.write(record);
      if (runtime.game === game) saveStatus.textContent = 'Saved';
    } catch (error) {
      saveStatus.textContent = 'Not saved!';
      showFatalError(new Error(`The game couldn't be saved: ${error.message}`));
    }
  }

  function play(game) {
    showScreen('adventure-screen');
    autosave(game);
    startAdventureScreen({ game, root: document, onSave: autosave });
  }

  async function showTitle(message) {
    runtime.game = null;
    document.getElementById('seed-note').textContent = '';
    showScreen('title-screen');
    renderTitleScreen({
      root: document,
      saves: await store.readAll(),
      message,
      onContinue: async (slot) => {
        try {
          const game = loadGame(runtime, await store.read(slot));
          if (!openedThisVisit.has(slot)) game.sessionCount += 1;
          openedThisVisit.add(slot);
          play(game);
        } catch (error) {
          console.error(error);
          showTitle(error.message);
        }
      },
      onNewGame: (slot) => {
        // Add ?seed=anything to the address to start new games with the same dice.
        const seed = new URLSearchParams(window.location.search).get('seed') || randomSeed();
        try {
          const game = newGame(runtime, { slot, seed, character: testHero });
          openedThisVisit.add(slot);
          play(game);
        } catch (error) {
          showFatalError(error);
        }
      },
    });
  }

  document.getElementById('to-title').addEventListener('click', () => showTitle());
  await showTitle();
}

start().catch(showFatalError);
