// The Journal tab: quests (active first) with their notes, the hero's deeds, each stamped
// with the in-game day, and a summary of each session played. The game writes it as you play.

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

  const sessionBox = el('section', 'sheet-block');
  sessionBox.append(el('h2', 'section-heading', 'Sessions'));
  const sessions = game.journal.sessions;
  if (sessions.length === 0) sessionBox.append(el('p', 'section-hint', 'Each session is summed up here when you end it, or when you next come back.'));
  else sessionBox.append(el('p', 'section-hint', 'Newest first.'));
  for (const summary of [...sessions].reverse()) sessionBox.append(sessionEntry(summary));
  panel.append(sessionBox);
  return panel;
}

// "Session 3 · Days 1–2", what happened, and what it came to.
function sessionEntry(summary) {
  const item = el('article', 'quest');
  const days = summary.fromDay === summary.toDay ? `Day ${summary.fromDay}` : `Days ${summary.fromDay}–${summary.toDay}`;
  item.append(el('h3', 'quest-title', `Session ${summary.session} · ${days}`));
  if (summary.deeds.length) {
    const list = el('ul', 'journal-list');
    for (const deed of summary.deeds) list.append(el('li', '', deed));
    item.append(list);
  }
  const gains = [];
  if (summary.xp) gains.push(`${summary.xp} XP`);
  if (summary.toLevel !== summary.fromLevel) gains.push(`reached level ${summary.toLevel}`);
  for (const id of summary.questsStarted) gains.push(`began ${findQuest(id).title}`);
  for (const id of summary.questsFinished) gains.push(`finished ${findQuest(id).title}`);
  if (gains.length) item.append(el('p', 'quest-summary', `${capitalise(gains.join(', '))}.`));
  return item;
}

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);
