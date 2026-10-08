// A list of spells to pick from, used by character creation and the level-up screen.
// Each row toggles the spell; "What it does" opens its full text.

import { findSpell } from '../character/spells.js';
import { spellDetails, spellMeta } from './spell-text.js';
import { el } from './dom.js';
import { expandable } from './widgets.js';

// keyPrefix: for each row's data-key. ids: the spells offered. chosen: the ones picked.
// full: true when no more can be picked. taken(id): why a spell can't be picked here
// ("already in your spellbook"), or null. onToggle(id): the player tapped a spell.
// details: false to leave out "What it does".
export function spellList({ keyPrefix, ids, chosen, full, taken = () => null, onToggle, details = true }) {
  const list = el('div', 'spell-list');
  for (const id of ids) {
    const spell = findSpell(id);
    const picked = chosen.includes(id);
    const takenText = taken(id);
    const row = el('div', 'spell-option');
    const button = el('button', 'spell-toggle');
    button.type = 'button';
    button.dataset.key = `${keyPrefix}-${id}`;
    button.setAttribute('aria-pressed', String(picked));
    button.disabled = !picked && (full || Boolean(takenText));
    button.append(el('span', 'spell-name', spell.name), el('span', 'spell-meta', takenText || spellMeta(spell)));
    button.addEventListener('click', () => onToggle(id));
    row.append(button);
    if (details) row.append(expandable('What it does', spellDetails(spell)));
    list.append(row);
  }
  return list;
}
