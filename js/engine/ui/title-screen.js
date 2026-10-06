// The Title screen: the three save slots. Each shows who is in it, where they are,
// the session count and when it was last played, with Continue and New game buttons.

import { migrateSave } from '../save/save-format.js';
import { el } from './dom.js';

// saves: Map from slot number to save record (or null for an empty slot).
// onContinue(slot) and onNewGame(slot) are called when the player picks a slot.
export function renderTitleScreen({ root, saves, message, onContinue, onNewGame }) {
  const messageEl = root.getElementById('title-message');
  messageEl.textContent = message || '';
  messageEl.hidden = !message;

  const list = root.getElementById('slot-list');
  list.replaceChildren();
  for (const [slot, record] of saves) list.append(slotCard(slot, record, onContinue, onNewGame));
}

function slotCard(slot, record, onContinue, onNewGame) {
  const card = el('section', 'slot-card');
  card.append(el('h2', 'slot-name', `Slot ${slot}`));
  const actions = el('div', 'slot-actions');

  if (!record) {
    card.classList.add('is-empty');
    card.append(el('p', 'slot-detail', 'Empty'));
    actions.append(button('New game', () => onNewGame(slot)));
    card.append(actions);
    return card;
  }

  let save;
  try {
    save = migrateSave(record);
  } catch (error) {
    card.append(el('p', 'slot-detail is-problem', `This save can't be loaded. ${error.message}`));
    actions.append(confirmingButton(slot, 'this save', onNewGame));
    card.append(actions);
    return card;
  }

  const { character, location } = save.game;
  card.append(el('p', 'slot-hero', `${character.name} · Level ${character.level}`));
  if (location) card.append(el('p', 'slot-detail', location));
  card.append(el('p', 'slot-detail', `Session ${save.sessionCount} · Last played ${formatWhen(save.savedAt)}`));
  actions.append(button('Continue', () => onContinue(slot), 'is-primary'));
  actions.append(confirmingButton(slot, `${character.name}'s save`, onNewGame));
  card.append(actions);
  return card;
}

// "New game" over an existing save asks first, right on the card.
function confirmingButton(slot, what, onNewGame) {
  const wrap = el('div', 'slot-confirm');
  const start = button('New game', () => {
    wrap.replaceChildren(
      el('p', 'slot-warning', `Replace ${what}? This can't be undone.`),
      button('Replace', () => onNewGame(slot), 'is-danger'),
      button('Keep it', () => wrap.replaceChildren(start)),
    );
  });
  wrap.append(start);
  return wrap;
}

function button(label, onClick, extraClass) {
  const b = el('button', `slot-button${extraClass ? ` ${extraClass}` : ''}`, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
