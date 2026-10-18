// The session ritual on screen (see story/sessions.js): the title card at the start of a
// session, with the "Previously…" recap after time away, the "What now?" box, and the card at
// the end of an act.

import { describeCharacter } from '../character/sheet.js';
import { xpText } from '../character/level-up.js';
import { formatDuration } from '../save/playtest-log.js';
import { heroSprite } from '../character/look.js';
import { whatNow } from '../story/sessions.js';
import { currentLocation, currentTime } from '../story/story-runner.js';
import { spriteCanvas } from './sprite-canvas.js';
import { actionButton } from './backup-panels.js';
import { el } from './dom.js';

// "Session 4": the hero, where they are, the recap if there is one, and Carry on.
// recap: from sessions.recap(), or null. onClose(): the player tapped Carry on.
export function sessionCard({ game, recap, onClose }) {
  const card = el('section', 'session-card');
  card.setAttribute('aria-label', `Session ${game.sessionCount}`);
  card.append(el('h2', 'session-title', `Session ${game.sessionCount}`));

  const who = el('div', 'session-hero');
  const where = [currentLocation(game), `Day ${game.day}`, currentTime(game)].filter(Boolean).join(' · ');
  const words = el('div', 'session-hero-text');
  words.append(el('p', 'session-name', `${game.character.name} · ${describeCharacter(game.character)}`), el('p', 'session-where', where));
  who.append(spriteCanvas(heroSprite(game.character), { scale: 3 }), words);
  card.append(who);

  if (recap) {
    const box = el('div', 'session-recap');
    box.append(el('p', 'session-recap-opener', recap.opener));
    if (recap.deeds.length) {
      const list = el('ul', 'session-recap-deeds');
      for (const deed of recap.deeds) list.append(el('li', '', deed));
      box.append(list);
    }
    if (recap.aim) box.append(el('p', 'session-recap-aim', `Your aim: ${recap.aim}`));
    card.append(box);
  }

  const go = actionButton('Carry on', onClose, 'is-primary');
  card.append(go);
  return card;
}

// "What now?": the hero's aim, the latest word on their newest quest, and a reminder that
// stopping is always safe. onClose(): the player is done with it.
export function whatNowBox(game, onClose) {
  const { aim, quest } = whatNow(game);
  const box = el('section', 'what-now');
  box.setAttribute('aria-label', 'What now?');
  box.append(el('h2', 'what-now-title', 'What now?'));
  box.append(el('p', 'what-now-line', aim ? `Your aim: ${aim}` : 'Look around, and see what the story offers you.'));
  if (quest) box.append(el('p', 'what-now-line', `${quest.title}: ${quest.note}`));
  box.append(el('p', 'what-now-hint', 'The game saves after every choice, so you can stop whenever you like. The Journal has everything you’ve learned.'));
  box.append(actionButton('Got it', onClose));
  return box;
}

// The card at the end of an act (story/act-summary.js): the hero now, how long the act took,
// the quests done, who came along and the shards they carry, then what comes next.
// summary: from actSummary(). playedMs: time played from the playtest log (0 leaves it out).
export function actEndCard(game, summary, playedMs = 0) {
  const card = el('section', 'act-end-card');
  card.setAttribute('aria-label', summary.title);
  card.append(el('h2', 'session-title', summary.title));

  const who = el('div', 'session-hero');
  const words = el('div', 'session-hero-text');
  words.append(el('p', 'session-name', `${game.character.name} · ${describeCharacter(game.character)}`), el('p', 'session-where', `${xpText(summary.xp)} XP`));
  who.append(spriteCanvas(heroSprite(game.character), { scale: 3 }), words);
  card.append(who);

  const facts = el('ul', 'act-end-facts');
  const played = playedMs > 0 ? ` and ${formatDuration(playedMs)} of play` : '';
  facts.append(el('li', null, `${plural(summary.days, 'day')} in the north, over ${plural(summary.sessions, 'session')}${played}.`));
  const quests = summary.questsDone.length ? summary.questsDone.join(', ') : 'none yet';
  facts.append(el('li', null, `Quests done (${summary.questsDone.length} of ${summary.questCount}): ${quests}.`));
  const company = summary.companions.map((c) => (c.fallen ? `${c.name} (fallen)` : c.name));
  facts.append(el('li', null, company.length ? `With you: ${andList(company)}.` : 'You travelled alone.'));
  if (summary.shards.length) facts.append(el('li', null, `You carry the ${andList(summary.shards)}.`));
  card.append(facts);

  card.append(el('p', 'act-end-closing', summary.closing));
  return card;
}

// "1 day", "12 days"
function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// "Odda Brasswick and Fen", "A, B and C"
function andList(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
