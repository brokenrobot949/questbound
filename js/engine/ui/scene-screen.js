// The Adventure screen, Phase 0 version: narration, choice cards, the d20 and the roll log.
//
// The engine rolls a check the moment Ink calls check(); the seeded RNG has already decided
// the result. Tapping the d20 only reveals it, so the tap can't change the outcome.

import { parseChoiceTags } from '../story/tags.js';
import { abilityModifier, abilityScore, findAbility, findSkill, proficiencyBonus } from '../character/sheet.js';
import { abilities } from '../../../data/srd/abilities.js';
import { dmVoice } from '../../../data/campaign/dm-voice.js';
import { difficultyName, outcomeText, rollLine, signedNumber } from './roll-format.js';

const TUMBLE_FACES = [7, 13, 2, 18, 9, 15, 4, 11, 19, 6];
const TUMBLE_STEP_MS = 60;

// story: a compiled inkjs Story with externals bound
// context: { rng, character, recordRoll }; pendingRolls: the array recordRoll pushes to
export function startSceneScreen({ story, context, pendingRolls, seed, root }) {
  const narration = root.getElementById('narration');
  const choices = root.getElementById('choices');
  const rollLog = root.getElementById('roll-log');
  const rollCount = root.getElementById('roll-count');
  const naturals = { 20: 0, 1: 0 };
  let expectedCheck = null;

  root.getElementById('hero-strip').textContent = heroSummary(context.character);
  root.getElementById('seed-note').textContent = `Dice seed: ${seed}`;
  narration.replaceChildren();
  play(() => {});

  // Runs Ink until it stops for a choice, keeping text and rolls in the order they happened.
  // A roll made while Ink worked out a line belongs before that line.
  function runStory() {
    const beats = [];
    while (story.canContinue) {
      const text = story.Continue().trim();
      while (pendingRolls.length > 0) {
        const result = pendingRolls.shift();
        warnIfTagMismatch(result);
        beats.push({ type: 'roll', result });
      }
      if (text) beats.push({ type: 'text', text });
    }
    return beats;
  }

  async function play(advanceStory) {
    let beats;
    try {
      advanceStory();
      beats = runStory();
    } catch (error) {
      showFatalError(error);
      return;
    }
    for (const beat of beats) {
      if (beat.type === 'text') narration.append(el('p', 'narration-text', beat.text));
      else await showRoll(beat.result);
    }
    showChoices();
  }

  function showChoices() {
    choices.replaceChildren();
    if (story.currentChoices.length === 0) {
      showEnd();
      return;
    }
    for (const choice of story.currentChoices) {
      const tags = parseChoiceTags(choice.tags);
      const card = el('button', 'choice-card');
      card.type = 'button';
      if (tags.check) card.append(el('span', 'choice-tag', checkLabel(tags.check)));
      card.append(el('span', 'choice-text', choice.text));
      card.addEventListener('click', () => choose(choice, tags));
      choices.append(card);
    }
    scrollIntoView(choices);
  }

  function choose(choice, tags) {
    choices.replaceChildren();
    for (const node of narration.children) node.classList.add('is-past');
    narration.append(el('p', 'chosen-text', choice.text));
    expectedCheck = tags.check;
    play(() => story.ChooseChoiceIndex(choice.index));
  }

  function showEnd() {
    const card = el('div', 'end-card');
    card.append(el('p', 'end-text', 'End of the test scene.'));
    const again = el('button', 'choice-card', 'Play the scene again');
    again.type = 'button';
    again.addEventListener('click', () => {
      choices.replaceChildren();
      narration.replaceChildren();
      play(() => story.ResetState());
    });
    card.append(again);
    choices.append(card);
    scrollIntoView(choices);
  }

  // Shows the d20, waits for the player's tap, then reveals the roll in full.
  function showRoll(result) {
    return new Promise((resolve) => {
      const panel = el('div', 'roll-panel');
      const heading = el('p', 'roll-heading', result.label);
      if (result.target && result.target.type === 'DC') {
        heading.textContent += ` · ${difficultyName(result.target.value)}`;
      }
      const die = d20Button();
      const hint = el('p', 'roll-hint', 'Tap the d20 to roll');
      panel.append(heading, die.button, hint);
      narration.append(panel);
      scrollIntoView(panel);

      die.button.addEventListener(
        'click',
        async () => {
          die.button.disabled = true;
          hint.remove();
          await tumble(die.face, result.natural);
          if (result.natural === 20 || result.natural === 1) {
            die.button.classList.add(`is-natural-${result.natural}`);
          }
          panel.append(resultBlock(result));
          addToLog(result);
          scrollIntoView(panel);
          resolve();
        },
        { once: true },
      );
    });
  }

  function resultBlock(result) {
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

    if (result.natural === 20 || result.natural === 1) {
      const lines = result.natural === 20 ? dmVoice.natural20 : dmVoice.natural1;
      block.append(el('p', 'dm-aside', lines[naturals[result.natural] % lines.length]));
      naturals[result.natural] += 1;
    }
    return block;
  }

  function addToLog(result) {
    const entry = el('li');
    entry.append(el('span', 'log-label', `${result.label}: `), rollLine(result));
    rollLog.prepend(entry);
    rollCount.textContent = String(rollLog.children.length);
  }

  // Dev check: the card's #check tag should match the check() the scene actually rolls.
  function warnIfTagMismatch(result) {
    if (!expectedCheck) return;
    if (expectedCheck.testId !== result.testId || expectedCheck.dc !== result.target.value) {
      console.warn(
        `Choice tag says check:${expectedCheck.testId}:${expectedCheck.dc}, ` +
          `but the scene rolled ${result.testId} against DC ${result.target.value}.`,
      );
    }
    expectedCheck = null;
  }
}

// Shows a startup or story error where the narration would be.
export function showFatalError(error) {
  console.error(error);
  const narration = document.getElementById('narration');
  const box = el('pre', 'error-box', `Something went wrong.\n\n${error.message}`);
  if (narration) narration.append(box);
  else document.body.append(box);
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

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
