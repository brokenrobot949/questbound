// The Journal tab: quests (active first) with their notes, and the hero's deeds, each
// stamped with the in-game day. The game writes it as you play.

import { dayStamped, findQuest } from '../story/journal.js';
import { el } from './dom.js';

export function journalPanel(game) {
  const panel = el('div', 'journal-panel');
  const { quests, deeds } = game.journal;

  const questBox = el('section', 'sheet-block');
  questBox.append(el('h2', 'section-heading', 'Quests'));
  if (quests.length === 0) questBox.append(el('p', 'section-hint', 'No quests yet.'));
  const ordered = [...quests].sort((a, b) => (a.status === b.status ? 0 : a.status === 'active' ? -1 : 1));
  for (const entry of ordered) {
    const quest = findQuest(entry.id);
    const item = el('article', `quest${entry.status === 'done' ? ' is-done' : ''}`);
    item.append(el('h3', 'quest-title', entry.status === 'done' ? `${quest.title} (done)` : quest.title));
    item.append(el('p', 'quest-summary', quest.summary));
    if (entry.notes.length) {
      const notes = el('ul', 'journal-list');
      for (const note of entry.notes) notes.append(el('li', '', dayStamped(note)));
      item.append(notes);
    }
    questBox.append(item);
  }
  panel.append(questBox);

  const deedBox = el('section', 'sheet-block');
  deedBox.append(el('h2', 'section-heading', 'Deeds'));
  if (deeds.length === 0) deedBox.append(el('p', 'section-hint', 'Nothing worth a song yet. Give it time.'));
  else deedBox.append(el('p', 'section-hint', 'Newest first.'));
  const list = el('ul', 'journal-list');
  for (const deed of [...deeds].reverse()) list.append(el('li', '', dayStamped(deed)));
  if (deeds.length) deedBox.append(list);
  panel.append(deedBox);
  return panel;
}
