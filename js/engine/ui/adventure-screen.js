// The Adventure screen, Phase 0 version: narration, choice cards, the d20 and the roll log.
//
// The engine rolls a check the moment Ink calls check(); the seeded RNG has already decided
// the result, and the game is saved with it straight away. Tapping the d20 only reveals it,
// so neither the tap nor quitting and reloading can change the outcome.

import { parseTags } from '../story/tags.js';
import { makeChoice, restartStory, revealRoll } from '../story/story-runner.js';
import { abilityModifier, abilityScore, findAbility, findSkill, proficiencyBonus } from '../character/sheet.js';
import { abilities } from '../../../data/srd/abilities.js';
import { dmVoice } from '../../../data/campaign/dm-voice.js';
import { gameToSave } from '../save/save-format.js';
import { getSetting } from '../save/settings.js';
import { difficultyName, outcomeText, rollLine, signedNumber } from './roll-format.js';
import { actionButton, backupPanel } from './backup-panels.js';
import { el, showFatalError } from './dom.js';

const TUMBLE_FACES = [7, 13, 2, 18, 9, 15, 4, 11, 19, 6];
const TUMBLE_STEP_MS = 60;

// game: the active game (see save/save-format.js). onSave(game) is called after every change.
// backupReminder: true to open with the "time to back up" notice.
export function startAdventureScreen({ game, root, onSave, backupReminder = false }) {
  const narration = root.getElementById('narration');
  const choices = root.getElementById('choices');
  const notices = root.getElementById('notices');

  root.getElementById('hero-strip').textContent = heroSummary(game.character);
  root.getElementById('slot-note').textContent = `Slot ${game.slot} · Session ${game.sessionCount}`;
  narration.replaceChildren();
  choices.replaceChildren();
  notices.replaceChildren();

  // While the backup reminder is up, the view stays at the top so the player sees it.
  // It follows the story again once they answer it or play on.
  let holdView = backupReminder;
  const follow = (node) => {
    if (!holdView) scrollIntoView(node);
  };
  if (backupReminder) notices.append(backupReminderBox(game, onSave, () => (holdView = false)));
  renderRollLog(root, game);
  if (game.notice) narration.append(el('p', 'dm-note', game.notice));
  showPage();

  // Shows the current page beat by beat, waiting for the player to tap any unrevealed d20.
  async function showPage() {
    for (const beat of game.page.beats) {
      if (beat.type === 'chosen') narration.append(el('p', 'chosen-text', beat.text));
      else if (beat.type === 'text') narration.append(el('p', 'narration-text', beat.text));
      else if (beat.type === 'roll' && beat.revealed) narration.append(revealedRollPanel(beat));
      else if (beat.type === 'roll') await rollPanelAwaitingTap(beat);
    }
    showChoices();
  }

  function showChoices() {
    choices.replaceChildren();
    if (game.story.currentChoices.length === 0) {
      showEnd();
      return;
    }
    for (const choice of game.story.currentChoices) {
      const tags = parseTags(choice.tags);
      const card = el('button', 'choice-card');
      card.type = 'button';
      if (tags.check) card.append(el('span', 'choice-tag', checkLabel(tags.check)));
      card.append(el('span', 'choice-text', choice.text));
      card.addEventListener('click', () => choose(choice));
      choices.append(card);
    }
    follow(choices);
  }

  function choose(choice) {
    holdView = false;
    choices.replaceChildren();
    for (const node of narration.children) node.classList.add('is-past');
    try {
      game.page = makeChoice(game, choice);
    } catch (error) {
      showFatalError(error);
      return;
    }
    onSave(game);
    showPage();
  }

  function showEnd() {
    const card = el('div', 'end-card');
    card.append(el('p', 'end-text', 'End of the test scene.'));
    const again = el('button', 'choice-card', 'Play the scene again');
    again.type = 'button';
    again.addEventListener('click', () => {
      holdView = false;
      choices.replaceChildren();
      try {
        game.page = restartStory(game);
      } catch (error) {
        showFatalError(error);
        return;
      }
      onSave(game);
      narration.replaceChildren();
      showPage();
    });
    card.append(again);
    choices.append(card);
    follow(choices);
  }

  // Shows the d20 and waits for the player's tap (or rolls straight away with auto-roll on),
  // then reveals the roll in full and saves.
  function rollPanelAwaitingTap(beat) {
    return new Promise((resolve) => {
      const { panel, die } = rollPanel(beat.result);
      const autoRoll = getSetting('autoRoll');
      const hint = el('p', 'roll-hint', 'Tap the d20 to roll');
      if (!autoRoll) panel.append(hint);
      narration.append(panel);
      follow(panel);

      const reveal = async () => {
        die.button.disabled = true;
        hint.remove();
        await tumble(die.face, beat.result.natural);
        beat.aside = pickAside(game, beat.result);
        revealRoll(game, beat);
        markNatural(die.button, beat.result);
        panel.append(resultBlock(beat));
        renderRollLog(root, game);
        onSave(game);
        follow(panel);
        resolve();
      };

      if (autoRoll) {
        reveal();
      } else {
        die.button.addEventListener(
          'click',
          () => {
            holdView = false;
            reveal();
          },
          { once: true },
        );
      }
    });
  }
}

// "Time to back up": shown at the start of every 10th session since the last backup.
// onAnswered() runs when the player backs up or dismisses it.
function backupReminderBox(game, onSave, onAnswered) {
  const box = el('div', 'reminder');
  const since = game.sessionCount - game.lastBackupSession;
  const lead =
    game.lastBackupSession === 0
      ? `Session ${game.sessionCount}, and this save has never been backed up.`
      : `It's been ${since} sessions since this save was last backed up.`;
  box.append(
    el('p', 'reminder-text', `${lead} Browsers sometimes clear their storage, so keep a copy somewhere safe.`),
  );
  const buttons = el('div', 'slot-actions');
  buttons.append(
    actionButton('Back up now', () => {
      const panel = backupPanel({
        save: gameToSave(game),
        onBackedUp: () => {
          game.lastBackupSession = game.sessionCount;
          onSave(game);
        },
      });
      box.replaceChildren(panel, actionButton('Done', () => box.remove()));
      onAnswered();
    }),
    actionButton('Not now', () => {
      box.remove();
      onAnswered();
    }),
  );
  box.append(buttons);
  return box;
}

// A roll the player already saw, e.g. after a reload: shown at once, no tap needed.
function revealedRollPanel(beat) {
  const { panel, die } = rollPanel(beat.result);
  die.button.disabled = true;
  die.face.textContent = String(beat.result.natural);
  markNatural(die.button, beat.result);
  panel.append(resultBlock(beat));
  return panel;
}

function rollPanel(result) {
  const panel = el('div', 'roll-panel');
  const heading = el('p', 'roll-heading', result.label);
  if (result.target && result.target.type === 'DC') {
    heading.textContent += ` · ${difficultyName(result.target.value)}`;
  }
  const die = d20Button();
  panel.append(heading, die.button);
  return { panel, die };
}

function resultBlock(beat) {
  const { result } = beat;
  const block = el('div', 'roll-result');
  if (result.success !== null) block.classList.add(result.success ? 'is-good' : 'is-bad');
  block.append(el('p', 'roll-outcome', outcomeText(result)));
  block.append(el('p', 'roll-line', rollLine(result)));

  const sources = el('ul', 'roll-sources');
  for (const m of result.modifiers) {
    sources.append(el('li', null, `${m.label} ${signedNumber(m.value)}: ${m.source}`));
  }
  for (const reason of result.advantage) sources.append(el('li', null, `Advantage: ${reason}`));
  for (const reason of result.disadvantage) sources.append(el('li', null, `Disadvantage: ${reason}`));
  block.append(sources);

  if (beat.aside) block.append(el('p', 'dm-aside', beat.aside));
  return block;
}

// The DM's line for a natural 20 or 1, taking turns through the lines in data/campaign/dm-voice.js.
function pickAside(game, result) {
  if (result.natural !== 20 && result.natural !== 1) return null;
  const lines = result.natural === 20 ? dmVoice.natural20 : dmVoice.natural1;
  const earlier = game.rollLog.filter((entry) => entry.result.natural === result.natural).length;
  return lines[earlier % lines.length];
}

function markNatural(button, result) {
  if (result.natural === 20 || result.natural === 1) button.classList.add(`is-natural-${result.natural}`);
}

function renderRollLog(root, game) {
  const list = root.getElementById('roll-log');
  list.replaceChildren();
  for (const entry of [...game.rollLog].reverse()) {
    const item = el('li');
    item.append(el('span', 'log-label', `Session ${entry.session} · ${entry.result.label}: `));
    item.append(rollLine(entry.result));
    list.append(item);
  }
  root.getElementById('roll-count').textContent = String(game.rollLog.length);
}

// "Persuasion · Medium"
function checkLabel(check) {
  const named = findSkill(check.testId) || findAbility(check.testId);
  const name = named ? named.name : check.testId;
  return `${name} · ${difficultyName(check.dc)}`;
}

// "Wren Ashdown · Level 1 · Str +0 Dex +2 … · Proficiency +2"
function heroSummary(character) {
  const mods = abilities.map(
    (a) => `${a.abbreviation} ${signedNumber(abilityModifier(abilityScore(character, a.id).value))}`,
  );
  return [
    character.name,
    `Level ${character.level}`,
    mods.join(' '),
    `Proficiency +${proficiencyBonus(character.level)}`,
  ].join(' · ');
}

function d20Button() {
  const button = el('button', 'd20');
  button.type = 'button';
  button.setAttribute('aria-label', 'Roll the d20');
  button.innerHTML = `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <polygon class="d20-body" points="32,2 59,17 59,47 32,62 5,47 5,17" />
      <polygon class="d20-edge" points="32,15 50,45 14,45" />
      <path class="d20-edge" d="M32 2 32 15 M5 17 32 15 59 17 M59 17 50 45 59 47 M50 45 32 62 14 45 M5 17 14 45 5 47" />
    </svg>`;
  const face = el('span', 'd20-face', '20');
  button.append(face);
  return { button, face };
}

// Flickers the die face before landing on the result. Purely visual; uses no randomness.
function tumble(face, natural) {
  return new Promise((resolve) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      face.textContent = String(natural);
      resolve();
      return;
    }
    const button = face.parentElement;
    button.classList.add('is-tumbling');
    let step = 0;
    const timer = setInterval(() => {
      if (step < TUMBLE_FACES.length) {
        face.textContent = String(TUMBLE_FACES[step]);
        step += 1;
        return;
      }
      clearInterval(timer);
      face.textContent = String(natural);
      button.classList.remove('is-tumbling');
      resolve();
    }, TUMBLE_STEP_MS);
  });
}

function scrollIntoView(node) {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  node.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
}
