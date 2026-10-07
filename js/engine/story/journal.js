// The journal writes itself: quests and deeds, each stamped with the in-game day
// ("Day 2: took the reeve's bounty"). Scenes add to it through the externals in externals.js.
//
// game.journal: {
//   quests: [{ id, status: 'active' | 'done', day, notes: [{ day, text }] }],
//   deeds:  [{ day, text }],
//   unread: true when something new has been written since the player last looked
// }

import { quests } from '../../../data/campaign/quests.js';

export const findQuest = (id) => quests.find((q) => q.id === id) || null;

export function newJournal() {
  return { quests: [], deeds: [], unread: false };
}

// A notable act, in the DM's words. The recaps and the epilogue read from these.
export function addDeed(game, text) {
  game.journal.deeds.push({ day: game.day, text: cleanText(text) });
  game.journal.unread = true;
}

// Starts a quest from data/campaign/quests.js. Returns false if it had already started.
export function startQuest(game, id) {
  if (!findQuest(id)) throw new Error(`Unknown quest: ${id}`);
  if (game.journal.quests.some((q) => q.id === id)) return false;
  game.journal.quests.push({ id, status: 'active', day: game.day, notes: [] });
  game.journal.unread = true;
  return true;
}

// Adds a line to a quest's notes, starting the quest if it hasn't started yet.
export function questNote(game, id, text) {
  startQuest(game, id);
  const quest = game.journal.quests.find((q) => q.id === id);
  quest.notes.push({ day: game.day, text: cleanText(text) });
  game.journal.unread = true;
}

export function finishQuest(game, id) {
  startQuest(game, id);
  game.journal.quests.find((q) => q.id === id).status = 'done';
  game.journal.unread = true;
}

// "Day 2: took the reeve's bounty."
export function dayStamped({ day, text }) {
  return `Day ${day}: ${text}`;
}

// Checks a saved journal's shape, for loading saves.
export function journalOk(journal) {
  const entry = (e) => e && Number.isInteger(e.day) && typeof e.text === 'string';
  return Boolean(
    journal &&
      Array.isArray(journal.deeds) &&
      journal.deeds.every(entry) &&
      Array.isArray(journal.quests) &&
      journal.quests.every((q) => findQuest(q.id) && ['active', 'done'].includes(q.status) && Array.isArray(q.notes) && q.notes.every(entry)) &&
      typeof journal.unread === 'boolean',
  );
}

function cleanText(text) {
  if (typeof text !== 'string' || text.trim() === '') throw new Error('A journal entry needs some text');
  return text.trim();
}
