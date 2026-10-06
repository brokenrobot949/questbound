// The Title screen: the three save slots. Each shows who is in it, where they are,
// the session count and when it was last played, with Continue, New game, Back up and
// Restore. Back up, Restore and the "replace this save?" question open below the buttons.

import { migrateSave } from '../save/save-format.js';
import { actionButton, backupPanel, restorePanel } from './backup-panels.js';
import { el } from './dom.js';

// saves: Map from slot number to save record (or null for an empty slot).
// message: { text, tone: 'info' or 'problem' } to show above the slots, or null.
// actions: { onContinue(slot), onNewGame(slot), onBackedUp(save), onRestore(slot, save) }
export function renderTitleScreen({ root, saves, message, actions }) {
  const messageEl = root.getElementById('title-message');
  messageEl.textContent = message ? message.text : '';
  messageEl.className = `title-message is-${message ? message.tone : 'info'}`;
  messageEl.hidden = !message;

  const list = root.getElementById('slot-list');
  list.replaceChildren();
  for (const [slot, record] of saves) list.append(slotCard(slot, record, actions));
}

function slotCard(slot, record, actions) {
  const card = el('section', 'slot-card');
  card.append(el('h2', 'slot-name', `Slot ${slot}`));
  const buttons = el('div', 'slot-actions');
  const panelArea = el('div', 'slot-panel');

  // Opens a panel below the buttons; pressing the same button again closes it.
  let openPanel = null;
  const toggle = (name, makePanel) => {
    if (openPanel === name) {
      panelArea.replaceChildren();
      openPanel = null;
      return;
    }
    panelArea.replaceChildren(makePanel());
    openPanel = name;
  };
  const restoreButton = (replacing) =>
    actionButton('Restore', () =>
      toggle('restore', () => restorePanel({ slot, replacing, onRestore: (save) => actions.onRestore(slot, save) })),
    );

  if (!record) {
    card.classList.add('is-empty');
    card.append(el('p', 'slot-detail', 'Empty'));
    buttons.append(actionButton('New game', () => actions.onNewGame(slot)), restoreButton(null));
    card.append(buttons, panelArea);
    return card;
  }

  let save;
  try {
    save = migrateSave(record);
  } catch (error) {
    card.append(el('p', 'slot-detail is-problem', `This save can't be loaded. ${error.message}`));
    buttons.append(newGameButton('this save'), restoreButton('this save'));
    card.append(buttons, panelArea);
    return card;
  }

  const { character, location } = save.game;
  card.append(el('p', 'slot-hero', `${character.name} · Level ${character.level}`));
  if (location) card.append(el('p', 'slot-detail', location));
  card.append(el('p', 'slot-detail', `Session ${save.sessionCount} · Last played ${formatWhen(save.savedAt)}`));
  buttons.append(
    actionButton('Continue', () => actions.onContinue(slot), 'is-primary'),
    newGameButton(`${character.name}'s save`),
    actionButton('Back up', () => toggle('backup', () => backupPanel({ save, onBackedUp: () => actions.onBackedUp(save) }))),
    restoreButton(`${character.name}'s save`),
  );
  card.append(buttons, panelArea);
  return card;

  // "New game" over an existing save asks first.
  function newGameButton(what) {
    return actionButton('New game', () =>
      toggle('new-game', () => {
        const confirm = el('div', 'slot-confirm');
        confirm.append(
          el('p', 'slot-warning', `Replace ${what} with a new game? This can't be undone.`),
          actionButton('Replace', () => actions.onNewGame(slot), 'is-danger'),
          actionButton('Keep it', () => toggle('new-game')),
        );
        return confirm;
      }),
    );
  }
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
