// The card at the end of an act (acts in data/campaign/acts.js): the hero as they are now, how
// long the act took, the quests they finished, who came with them, and the shards they carry.
// Read from the game as it stands; nothing here is saved.

import { acts } from '../../../data/campaign/acts.js';
import { quests } from '../../../data/campaign/quests.js';
import { shards } from '../../../data/campaign/shards.js';
import { companionCharacter } from '../character/party.js';
import { hasShard } from '../character/inventory.js';

// The act the story has just finished: the last act whose completeFlag is set, or null.
export function finishedAct(game) {
  return [...acts].reverse().find((act) => game.flags.includes(act.completeFlag)) || null;
}

// { title, days, sessions, xp, questsDone: [titles], questCount, companions: [{ name, fallen }],
// shards: [names], closing }. days: the in-game day it ended on (Day 1 is the first).
export function actSummary(game, act) {
  const actQuests = quests.filter((q) => act.chapters.includes(q.chapter));
  const done = actQuests.filter((q) => game.journal.quests.some((j) => j.id === q.id && j.status === 'done'));
  return {
    title: act.title,
    days: game.day,
    sessions: game.sessionCount,
    xp: game.xp,
    questsDone: done.map((q) => q.title),
    questCount: actQuests.length,
    companions: (game.party || []).map((m) => ({ name: companionCharacter(m.id, game.character.level).name, fallen: Boolean(m.fallen) })),
    shards: shards.filter((s) => hasShard(game, s.id)).map((s) => s.name),
    closing: act.closing,
  };
}

// The scene (Ink knot) each part of an act begins in, from every act: [{ chapter, scene }],
// for the playtest log's time per chapter.
export const chapterStarts = acts.flatMap((act) => act.startsAt);
