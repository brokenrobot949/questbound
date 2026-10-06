// Startup and screen routing: compiles the story, opens the save slots, then moves between
// the Title screen and the Adventure screen.

import { randomSeed } from './engine/rules/rng.js';
import { loadStory } from './engine/story/ink-loader.js';
import { bindExternals } from './engine/story/externals.js';
import { openSaveStore } from './engine/save/save-store.js';
import { gameToSave, loadGame, newGame } from './engine/save/save-format.js';
import { isBackupDue } from './engine/save/backup.js';
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

  function play(game, { backupReminder = false } = {}) {
    showScreen('adventure-screen');
    autosave(game);
    startAdventureScreen({ game, root: document, onSave: autosave, backupReminder });
  }

  // Runs a title-screen action; if it fails, shows the title again with the reason.
  async function attempt(action) {
    try {
      await action();
    } catch (error) {
      console.error(error);
      showTitle({ text: error.message, tone: 'problem' });
    }
  }

  const titleActions = {
    onContinue: (slot) =>
      attempt(async () => {
        const game = loadGame(runtime, await store.read(slot));
        const newSession = !openedThisVisit.has(slot);
        if (newSession) game.sessionCount += 1;
        openedThisVisit.add(slot);
        play(game, { backupReminder: newSession && isBackupDue(game.sessionCount, game.lastBackupSession) });
      }),

    onNewGame: (slot) =>
      attempt(() => {
        // Add ?seed=anything to the address to start new games with the same dice.
        const seed = new URLSearchParams(window.location.search).get('seed') || randomSeed();
        const game = newGame(runtime, { slot, seed, character: testHero });
        openedThisVisit.add(slot);
        play(game);
      }),

    // The save was downloaded or copied: note it so the reminder counts from now.
    onBackedUp: (save) =>
      attempt(() => store.write({ ...save, lastBackupSession: save.sessionCount })),

    // A checked backup goes into the slot. Restoring counts as backed up, and opening the
    // restored save starts a new session.
    onRestore: (slot, save) =>
      attempt(async () => {
        await store.write({ ...save, slot, lastBackupSession: save.sessionCount });
        openedThisVisit.delete(slot);
        await showTitle({ text: `Restored ${save.game.character.name} into slot ${slot}.`, tone: 'info' });
      }),
  };

  async function showTitle(message = null) {
    runtime.game = null;
    document.getElementById('seed-note').textContent = '';
    showScreen('title-screen');
    renderTitleScreen({ root: document, saves: await store.readAll(), message, actions: titleActions });
  }

  document.getElementById('to-title').addEventListener('click', () => showTitle());
  await showTitle();
}

start().catch(showFatalError);
