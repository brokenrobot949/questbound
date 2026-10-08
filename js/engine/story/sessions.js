// The session ritual (docs/DESIGN.md, "Sessions and Short-Burst Play"): every time you open
// the game is a numbered session. It opens with a title card, and a "Previously…" recap if
// you've been away more than an hour; "What now?" restates your aim; and each session is
// summed up in the journal, when you end it or, if you just closed the game, when you next
// come back.
//
// Saved on the game:
//   game.session   what things were like when this session began, to sum it up later:
//                  { number, startedAt (ISO date), day, xp, level, deeds (how many there
//                  were), quests ({ id: status }), ended (summary written) }
//   game.objective the hero's current aim, in the DM's words, set by the story with
//                  set_objective(text); or null
// The summaries go in the journal: game.journal.sessions (see journal.js).

import { dmVoice } from '../../../data/campaign/dm-voice.js';
import { findQuest } from './journal.js';

// How long away before the recap.
export const RECAP_AFTER_MS = 60 * 60 * 1000;

// Where things stand right now, as a session's starting point.
export function sessionSnapshot(game, now = new Date()) {
  return {
    number: game.sessionCount,
    startedAt: now.toISOString(),
    day: game.day,
    xp: game.xp,
    level: game.character.level,
    deeds: game.journal.deeds.length,
    quests: Object.fromEntries(game.journal.quests.map((q) => [q.id, q.status])),
    ended: false,
  };
}

// What happened since the session began: { session, fromDay, toDay, deeds, xp, fromLevel,
// toLevel, questsStarted, questsFinished }, or null if nothing worth writing down did.
export function sessionSummary(game) {
  const start = game.session;
  const deeds = game.journal.deeds.slice(start.deeds).map((d) => d.text);
  const xp = game.xp - start.xp;
  const questsStarted = game.journal.quests.filter((q) => !(q.id in start.quests)).map((q) => q.id);
  const questsFinished = game.journal.quests.filter((q) => q.status === 'done' && start.quests[q.id] !== 'done').map((q) => q.id);
  const levelled = game.character.level !== start.level;
  if (!deeds.length && !xp && !questsStarted.length && !questsFinished.length && !levelled) return null;
  return {
    session: start.number,
    fromDay: start.day,
    toDay: game.day,
    deeds,
    xp,
    fromLevel: start.level,
    toLevel: game.character.level,
    questsStarted,
    questsFinished,
  };
}

// Ends the session: the DM writes its summary into the journal (if anything happened).
// Returns the summary, or null.
export function endSession(game) {
  if (!game.session || game.session.ended) return null;
  const summary = sessionSummary(game);
  if (summary) {
    game.journal.sessions.push(summary);
    game.journal.unread = true;
  }
  game.session.ended = true;
  return summary;
}

// A new session: the last one is summed up if the player just closed the game, and a fresh
// starting point is taken. Call after game.sessionCount has gone up.
export function beginSession(game, now = new Date()) {
  if (game.session) endSession(game);
  game.session = sessionSnapshot(game, now);
}

// The "Previously…" recap when a session opens after more than an hour away, or null:
// { opener, deeds: [the last three], where, aim }.
export function recap(game, lastPlayed, now = new Date()) {
  if (!lastPlayed || now - new Date(lastPlayed) < RECAP_AFTER_MS) return null;
  const deeds = game.journal.deeds.slice(-3).map((d) => d.text);
  if (!deeds.length && !game.objective) return null;
  return {
    opener: dmVoice.recapOpeners[game.sessionCount % dmVoice.recapOpeners.length],
    deeds,
    where: game.location,
    aim: game.objective,
  };
}

// "What now?": the hero's aim, and the latest word on their newest active quest.
// Returns { aim, quest: { title, note } or null }.
export function whatNow(game) {
  const active = game.journal.quests.filter((q) => q.status === 'active');
  const latest = active[active.length - 1];
  let quest = null;
  if (latest) {
    const note = latest.notes[latest.notes.length - 1];
    quest = { title: findQuest(latest.id).title, note: note ? note.text : findQuest(latest.id).summary };
  }
  return { aim: game.objective, quest };
}

// Checks a saved session starting point, for loading saves.
export function sessionOk(session) {
  return Boolean(
    session &&
      Number.isInteger(session.number) &&
      typeof session.startedAt === 'string' &&
      Number.isInteger(session.day) &&
      Number.isInteger(session.xp) &&
      Number.isInteger(session.level) &&
      Number.isInteger(session.deeds) &&
      session.quests &&
      typeof session.quests === 'object' &&
      typeof session.ended === 'boolean',
  );
}
