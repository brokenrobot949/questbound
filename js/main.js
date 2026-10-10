// Startup and screen routing: compiles the story, opens the save slots, then moves between
// the Title screen and the Adventure screen. Adding ?debug to the address turns on debug mode.

import { randomSeed } from './engine/rules/rng.js';
import { loadStory } from './engine/story/ink-loader.js';
import { bindExternals } from './engine/story/externals.js';
import { jumpTo, restartStory } from './engine/story/story-runner.js';
import { findClass } from './engine/character/sheet.js';
import { lowerLevel, xpForLevel } from './engine/character/level-up.js';
import { beginSession, endSession, recap } from './engine/story/sessions.js';
import { addItem, COPPER_PER } from './engine/character/inventory.js';
import { joinParty, leaveParty, memberMaxHp, memberOf } from './engine/character/party.js';
import { openSaveStore } from './engine/save/save-store.js';
import { gameToSave, loadGame, newGame } from './engine/save/save-format.js';
import { isBackupDue } from './engine/save/backup.js';
import { PlaytestTracker } from './engine/save/playtest-log.js';
import { setupOffline } from './engine/save/offline.js';
import { renderTitleScreen } from './engine/ui/title-screen.js';
import { startAdventureScreen } from './engine/ui/adventure-screen.js';
import { startCreationScreen } from './engine/ui/creation-screen.js';
import { setupDebugPanel } from './engine/ui/debug-panel.js';
import { applySettings, settingsPanel } from './engine/ui/settings-panel.js';
import { creditsPanel } from './engine/ui/credits-panel.js';
import { setupPlayTabs } from './engine/ui/play-tabs.js';
import { showFatalError, showScreen } from './engine/ui/dom.js';

const params = new URLSearchParams(window.location.search);
const DEBUG = params.has('debug');

applySettings();

// Set just before an update reloads the page, so play picks up where it was.
const UPDATE_KEY = 'questbound:update-reload';

async function start() {
  // Home-screen install and offline play. When a new version has downloaded, the banner offers it.
  const banner = document.getElementById('update-banner');
  const offline = setupOffline({
    debug: DEBUG,
    onUpdateReady: (apply) => {
      banner.hidden = false;
      banner.onclick = () => {
        banner.disabled = true;
        banner.textContent = 'Updating2026';
        rememberForUpdate();
        apply();
      };
    },
  }).catch((error) => {
    console.warn("Offline play couldn't start:", error);
    return 'failed';
  });

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

  // An update reload carries the visit on: same slot, same session.
  let resumeSlot = null;
  try {
    const carried = JSON.parse(sessionStorage.getItem(UPDATE_KEY));
    sessionStorage.removeItem(UPDATE_KEY);
    if (carried) {
      for (const slot of carried.opened) openedThisVisit.add(slot);
      resumeSlot = carried.resumeSlot;
    }
  } catch {
    // Nothing carried over.
  }
  function rememberForUpdate() {
    try {
      const resume = runtime.game ? runtime.game.slot : null;
      sessionStorage.setItem(UPDATE_KEY, JSON.stringify({ opened: [...openedThisVisit], resumeSlot: resume }));
    } catch {
      // Without it the update still works; play just reopens at the title screen.
    }
  }

  // The Adventure tab while a game is on: refresh() redraws its status line and hero strip.
  let adventure = null;

  // The bar along the bottom during play. The Menu tab holds Settings, Credits and the way
  // back to the save slots.
  const tabs = setupPlayTabs({
    root: document,
    getGame: () => runtime.game,
    onOpenMenu: () => {
      const area = document.getElementById('menu-settings');
      area.replaceChildren(settingsPanel({ onClose: () => tabs.show('adventure') }));
    },
    onJournalRead: (game) => autosave(game),
    onSpellCast: (game) => {
      autosave(game);
      if (adventure) adventure.refresh();
    },
  });

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

  // sessionStart: { recap } when a new session begins (its title card shows), else null.
  function showAdventure(game, backupReminder = false, sessionStart = null) {
    tabs.show('adventure', { fresh: true });
    adventure = startAdventureScreen({ game, root: document, onSave: autosave, backupReminder, sessionStart, onPageShown: () => tabs.refresh() });
    if (debugPanel) debugPanel.refresh();
  }

  function play(game, { backupReminder = false, sessionStart = null } = {}) {
    showScreen('adventure-screen');
    tracker.startSession(game);
    autosave(game);
    showAdventure(game, backupReminder, sessionStart);
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
        // A new session: the first time the slot is opened this visit, or after End session.
        const newSession = !openedThisVisit.has(slot) || game.session.ended;
        if (newSession) {
          game.sessionCount += 1;
          beginSession(game);
        }
        openedThisVisit.add(slot);
        play(game, {
          backupReminder: newSession && isBackupDue(game.sessionCount, game.lastBackupSession),
          sessionStart: newSession ? { recap: recap(game, game.lastPlayed) } : null,
        });
      }),

    // A new game starts with character creation. Any save already in the slot stays until
    // the new hero begins their adventure.
    onNewGame: (slot) =>
      attempt(() => {
        // In debug mode, &seed=anything starts new games with the same dice.
        const seed = (DEBUG && params.get('seed')) || randomSeed();
        showScreen('creation-screen');
        startCreationScreen({
          root: document,
          slot,
          seed,
          onCancel: () => showTitle(),
          onFinish: ({ character, rngState }) =>
            attempt(() => {
              const game = newGame(runtime, { slot, seed, character, rngState });
              openedThisVisit.add(slot);
              play(game, { sessionStart: { recap: null } });
            }),
        });
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
      offline,
      actions: {
        jumpTo: (path) => change((game) => (game.page = jumpTo(game, path))),
        restartStory: () => change((game) => (game.page = restartStory(game))),
        setFlags: (flags) => change((game) => (game.flags = flags)),
        setInkVariable: (name, value) => change((game) => (game.story.variablesState[name] = value)),
        setLevel: (level) =>
          change((game) => {
            const max = findClass(game.character.classId).levels.length;
            if (!Number.isInteger(level) || level < 1 || level > max) {
              throw new Error(`Level must be 1 to ${max}: the rules data covers levels 1–${max} so far.`);
            }
            // Going up gives the XP, and the level-up screen walks through each new level.
            if (level < game.character.level) lowerLevel(game, level);
            else if (level > game.character.level) game.xp = Math.max(game.xp, xpForLevel(level));
          }),
        giveXp: (xp) =>
          change((game) => {
            if (!Number.isInteger(xp) || xp < 1) throw new Error('Give a whole number of XP, 1 or more.');
            game.xp += xp;
          }),
        giveGold: (gp) =>
          change((game) => {
            if (!Number.isInteger(gp) || gp < 1) throw new Error('Give a whole number of gold pieces, 1 or more.');
            game.money += gp * COPPER_PER.gp;
          }),
        giveItem: (id, quantity) =>
          change((game) => {
            if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Give 1 or more.');
            addItem(game.inventory, id, quantity);
          }),
        // Companions join, leave, or are raised (a fallen one, back at full Hit Points).
        joinParty: (id) =>
          change((game) => {
            if (game.battle) throw new Error('Not in the middle of a fight.');
            joinParty(game, id);
          }),
        leaveParty: (id) =>
          change((game) => {
            if (game.battle) throw new Error('Not in the middle of a fight.');
            leaveParty(game, id);
          }),
        raiseCompanion: (id) =>
          change((game) => {
            const member = memberOf(game, id);
            member.fallen = false;
            member.hp = memberMaxHp(game, member);
          }),
        setSubclass: (id) =>
          change((game) => {
            if (id && !findClass(game.character.classId).subclasses.some((s) => s.id === id)) {
              throw new Error(`Unknown subclass: ${id}`);
            }
            game.character.subclassId = id;
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

  // Settings and Credits open in place: under the save slots, or above the story during play.
  async function togglePanel(button, container, makePanel) {
    const close = (panel) => {
      panel.remove();
      button.setAttribute('aria-expanded', 'false');
    };
    const open = container.querySelector('.settings-panel');
    if (open) {
      close(open);
      return;
    }
    const panel = await makePanel({ onClose: () => close(panel) });
    container.prepend(panel);
    button.setAttribute('aria-expanded', 'true');
  }
  const titleSettings = document.getElementById('title-settings');
  titleSettings.addEventListener('click', () =>
    togglePanel(titleSettings, document.getElementById('title-settings-panel'), settingsPanel),
  );
  const titleCredits = document.getElementById('title-credits');
  titleCredits.addEventListener('click', () =>
    togglePanel(titleCredits, document.getElementById('title-credits-panel'), creditsPanel),
  );
  const playCredits = document.getElementById('play-credits');
  playCredits.addEventListener('click', () => togglePanel(playCredits, document.getElementById('menu-credits'), creditsPanel));

  document.getElementById('to-title').addEventListener('click', () => showTitle());

  // End session: the DM writes this session's summary into the journal, then the save slots.
  document.getElementById('end-session').addEventListener('click', () =>
    attempt(async () => {
      const game = runtime.game;
      if (!game) return;
      const summary = endSession(game);
      await autosave(game);
      const text = summary ? `Session ${summary.session} is written into ${game.character.name}'s journal. See you next time.` : 'Session ended. See you next time.';
      await showTitle({ text, tone: 'info' });
    }),
  );
  if (resumeSlot !== null) await titleActions.onContinue(resumeSlot);
  else await showTitle();
}

start().catch(showFatalError);
