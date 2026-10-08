// The session ritual on screen (see story/sessions.js): the title card at the start of a
// session, with the "Previously…" recap after time away, and the "What now?" box.

import { describeCharacter } from '../character/sheet.js';
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
