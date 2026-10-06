// Startup and screen routing: compiles the story, opens the save slots, then moves between
// the Title screen and the Adventure screen. Adding ?debug to the address turns on debug mode.

import { randomSeed } from './engine/rules/rng.js';
import { loadStory } from './engine/story/ink-loader.js';
import { bindExternals } from './engine/story/externals.js';
import { jumpTo, restartStory } from './engine/story/story-runner.js';
import { openSaveStore } from './engine/save/save-store.js';
import { gameToSave, loadGame, newGame } from './engine/save/save-format.js';
import { isBackupDue } from './engine/save/backup.js';
import { PlaytestTracker } from './engine/save/playtest-log.js';
import { renderTitleScreen } from './engine/ui/title-screen.js';
import { startAdventureScreen } from './engine/ui/adventure-screen.js';
import { setupDebugPanel } from './engine/ui/debug-panel.js';
import { showFatalError, showScreen } from './engine/ui/dom.js';
import { testHero } from '../data/campaign/test-hero.js';

const params = new URLSearchParams(window.location.search);
const DEBUG = params.has('debug');

async function start() {
  const story = await loadStory(new URL('../story/', import.meta.url));
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  const store = await openSaveStore();
  const tracker = new PlaytestTracker();
  let debugPanel = null;

  // The playtest clock stops while the game is off screen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) tracker.pause();
    else tracker.resume();
  });

  // A session is one visit: opening a slot counts once per page load, so going back to the
  // title screen and continuing again in the same visit doesn't add another.
  const openedThisVisit = new Set();

  const saveStatus = document.getElementById('save-status');
  async function autosave(game) {
    const record = gameToSave(game);
    if (runtime.game === game) tracker.update(game);
    saveStatus.textContent = 'Saving…';
    try {
      await store.write(record);
      if (runtime.game === game) saveStatus.textContent = 'Saved';
    } catch (error) {
      saveStatus.textContent = 'Not saved!';
      showFatalError(new Error(`The game couldn't be saved: ${error.message}`));
    }
  }

  function showAdventure(game, backupReminder = false) {
    startAdventureScreen({ game, root: document, onSave: autosave, backupReminder });
    if (debugPanel) debugPanel.refresh();
  }

  function play(game, { backupReminder = false } = {}) {
    showScreen('adventure-screen');
    tracker.startSession(game);
    autosave(game);
    showAdventure(game, backupReminder);
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
        // In debug mode, &seed=anything starts new games with the same dice.
        const seed = (DEBUG && params.get('seed')) || randomSeed();
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
    tracker.endSession();
    runtime.game = null;
    showScreen('title-screen');
    renderTitleScreen({ root: document, saves: await store.readAll(), message, actions: titleActions });
    if (debugPanel) debugPanel.refresh();
  }

  if (DEBUG) {
    document.getElementById('debug-footer').hidden = false;
    // Each debug action changes the active game, saves it and redraws the Adventure screen.
    const change = (apply) => {
      const game = runtime.game;
      apply(game);
      autosave(game);
      showAdventure(game);
    };
    debugPanel = setupDebugPanel({
      root: document,
      getGame: () => runtime.game,
      tracker,
      actions: {
        jumpTo: (path) => change((game) => (game.page = jumpTo(game, path))),
        restartStory: () => change((game) => (game.page = restartStory(game))),
        setFlags: (flags) => change((game) => (game.flags = flags)),
        setInkVariable: (name, value) => change((game) => (game.story.variablesState[name] = value)),
        setLevel: (level) =>
          change((game) => {
            if (!Number.isInteger(level) || level < 1 || level > 20) throw new Error('Level must be 1 to 20.');
            game.character.level = level;
          }),
        resetSave: async () => {
          const slot = runtime.game.slot;
          await store.remove(slot);
          openedThisVisit.delete(slot);
          await showTitle({ text: `Slot ${slot}'s save was deleted.`, tone: 'info' });
        },
      },
    });
  }

  document.getElementById('to-title').addEventListener('click', () => showTitle());
  await showTitle();
}

start().catch(showFatalError);
