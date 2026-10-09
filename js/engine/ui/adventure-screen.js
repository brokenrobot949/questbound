// The Adventure tab: the status line, narration and the DM's notes, choice cards, the d20
// and the roll log.
//
// The engine rolls a check the moment Ink calls check(); the seeded RNG has already decided
// the result, and the game is saved with it straight away. Tapping the d20 only reveals it,
// so neither the tap nor quitting and reloading can change the outcome.

import { parseTags } from '../story/tags.js';
import { continueAfterBattle, currentDungeon, currentTime, makeChoice, revealRoll, startFight } from '../story/story-runner.js';
import { findRoom } from '../world/dungeons.js';
import { findEncounter } from '../combat/battle.js';
import { showDungeonMap } from './dungeon-map.js';
import { maxHp } from '../character/resources.js';
import { levelUpReady } from '../character/level-up.js';
import { showBattle } from './battle-screen.js';
import { showLevelUp } from './level-up-screen.js';
import { sessionCard, whatNowBox } from './session-panels.js';
import { moneyText, priceOf } from '../character/inventory.js';
import { findDrive } from '../character/creation.js';
import {
  abilityModifierOf,
  armorClass,
  describeCharacter,
  findAbility,
  findSkill,
  maxHitPoints,
  proficiencyBonus,
} from '../character/sheet.js';
import { findSpell } from '../character/spells.js';
import { heroSprite } from '../character/look.js';
import { spriteCanvas } from './sprite-canvas.js';
import { abilities } from '../../../data/srd/abilities.js';
import { dmNotes, dmVoice } from '../../../data/campaign/dm-voice.js';
import { gameToSave } from '../save/save-format.js';
import { getSetting } from '../save/settings.js';
import { difficultyName, outcomeText, rollLine, signedNumber } from './roll-format.js';
import { actionButton, backupPanel } from './backup-panels.js';
import { el, showFatalError } from './dom.js';

const TUMBLE_FACES = [7, 13, 2, 18, 9, 15, 4, 11, 19, 6];
const TUMBLE_STEP_MS = 60;

// game: the active game (see save/save-format.js). onSave(game) is called after every change.
// backupReminder: true to open with the "time to back up" notice.
// sessionStart: { recap } when a new session begins, to open with its title card (recap is
// from story/sessions.js, or null); null otherwise.
// onPageShown(): called whenever new story has been shown (the Journal tab may have news).
export function startAdventureScreen({ game, root, onSave, backupReminder = false, sessionStart = null, onPageShown = () => {} }) {
  const narration = root.getElementById('narration');
  const choices = root.getElementById('choices');
  const notices = root.getElementById('notices');
  const status = root.getElementById('play-status');

  // Fights and level-ups show here, between the story and the choices.
  const battleArea = root.getElementById('battle-area');
  // The dungeon map, while the hero is in a dungeon. mapRequest counts maps asked for, so a
  // map still loading its pictures can tell it has been replaced.
  const mapArea = root.getElementById('map-area');
  let mapRequest = 0;

  // "Day 2 · Morning · HP 12/12 · 18 GP · ★ Inspiration": as far as the player has seen.
  const updateStatus = () => {
    const time = currentTime(game);
    const hp = `HP ${game.hp}/${maxHp(game.character)}`;
    const parts = [`Day ${game.day}`, time, hp, moneyText(game.money), game.inspiration ? '★ Inspiration' : null];
    status.textContent = parts.filter(Boolean).join(' · ');
  };

  const renderHeroStrip = () =>
    root
      .getElementById('hero-strip')
      .replaceChildren(spriteCanvas(heroSprite(game.character), { scale: 2 }), el('span', 'hero-strip-text', heroSummary(game.character)));
  renderHeroStrip();
  root.getElementById('slot-note').textContent = `Slot ${game.slot} · Session ${game.sessionCount}`;
  narration.replaceChildren();
  choices.replaceChildren();
  notices.replaceChildren();
  battleArea.replaceChildren();
  mapArea.replaceChildren();

  // While the session card or the backup reminder is up, the view stays at the top so the
  // player sees it. It follows the story again once they answer it or play on.
  let holdView = backupReminder || Boolean(sessionStart);
  const follow = (node) => {
    if (!holdView) scrollIntoView(node);
  };
  if (sessionStart) {
    const card = sessionCard({
      game,
      recap: sessionStart.recap,
      onClose: () => {
        card.remove();
        if (!notices.querySelector('.reminder')) holdView = false;
        scrollIntoView(choices);
      },
    });
    notices.append(card);
  }
  if (backupReminder) notices.append(backupReminderBox(game, onSave, () => (holdView = false)));

  // "What now?": the hero's aim and the latest clue, on one tap; tap again to close.
  const whatNowButton = root.getElementById('what-now');
  whatNowButton.setAttribute('aria-expanded', 'false');
  whatNowButton.onclick = () => {
    const open = notices.querySelector('.what-now');
    const close = (box) => {
      box.remove();
      whatNowButton.setAttribute('aria-expanded', 'false');
    };
    if (open) return close(open);
    const box = whatNowBox(game, () => close(box));
    notices.prepend(box);
    whatNowButton.setAttribute('aria-expanded', 'true');
    scrollIntoView(box);
  };
  renderRollLog(root, game);
  if (game.notice) narration.append(el('p', 'dm-note', game.notice));
  showPage();

  // Shows the current page beat by beat, waiting for the player to tap any unrevealed d20.
  async function showPage() {
    updateStatus();
    showMap();
    for (const beat of game.page.beats) {
      if (beat.type === 'chosen') narration.append(el('p', 'chosen-text', beat.text));
      else if (beat.type === 'text') narration.append(el('p', 'narration-text', beat.text));
      else if (beat.type === 'note') narration.append(el('p', 'dm-note', beat.text));
      else if (beat.type === 'roll' && beat.revealed) narration.append(revealedRollPanel(beat));
      else if (beat.type === 'roll') {
        await rollPanelAwaitingTap(beat);
        updateStatus();
      }
    }
    if (game.battle) showFight();
    else if (levelUpReady(game)) showLevel();
    else showChoices();
    onPageShown();
  }

  // A new level takes the place of the choices until the player has made its choices.
  function showLevel() {
    choices.replaceChildren();
    showLevelUp({
      container: battleArea,
      game,
      onSave,
      onDone: ({ level, hpGained }) => {
        battleArea.replaceChildren();
        const text = dmNotes.levelUpNote.replace('{level}', level).replace('{hp}', hpGained);
        game.page.beats.push({ type: 'note', text });
        narration.append(el('p', 'dm-note', text));
        renderHeroStrip();
        updateStatus();
        onSave(game);
        onPageShown();
        if (levelUpReady(game)) showLevel();
        else showChoices();
      },
    });
    follow(battleArea);
  }

  // The dungeon map, as far as the player has read. doors: [{ room, choice }] for the choices
  // tagged #go, whose doorways light up to tap. Hidden during a fight: the fight is the room.
  // Each call replaces the one before, even if that one is still loading its pictures.
  function showMap(doors = []) {
    const request = ++mapRequest;
    const state = currentDungeon(game);
    if (!state || !state.room || game.battle) {
      mapArea.replaceChildren();
      return;
    }
    const stillWanted = () => request === mapRequest;
    showDungeonMap({ container: mapArea, state, flags: game.flags, hero: heroSprite(game.character), doors, onGo: choose, stillWanted }).catch(showFatalError);
  }

  function hideMap() {
    mapRequest += 1;
    mapArea.replaceChildren();
  }

  // A fight takes the place of the choices until it's over; then the story carries on.
  function showFight() {
    choices.replaceChildren();
    hideMap();
    showBattle({
      container: battleArea,
      game,
      onSave,
      // The status line's Hit Points follow the fight as it plays out, not ahead of it.
      onShown: updateStatus,
      onDone: () => {
        battleArea.replaceChildren();
        for (const node of narration.children) node.classList.add('is-past');
        try {
          game.page = continueAfterBattle(game);
        } catch (error) {
          showFatalError(error);
          return;
        }
        onSave(game);
        showPage();
      },
    }).catch(showFatalError);
    follow(battleArea);
  }

  function showChoices() {
    choices.replaceChildren();
    if (game.story.currentChoices.length === 0) {
      showMap();
      showEnd();
      return;
    }
    const doors = [];
    const dungeon = currentDungeon(game);
    for (const choice of game.story.currentChoices) {
      const tags = parseTags(choice.tags);
      const card = el('button', 'choice-card');
      card.type = 'button';
      if (tags.go && dungeon) {
        const room = findRoom(dungeon.id, tags.go);
        card.append(el('span', 'choice-tag is-go', `Go · ${room ? room.name : tags.go}`));
        doors.push({ room: tags.go, choice });
      }
      if (tags.check) card.append(el('span', 'choice-tag', checkLabel(tags.check)));
      if (tags.spell) card.append(el('span', 'choice-tag', `Spell · ${spellName(tags.spell)}`));
      if (tags.buy) card.append(el('span', 'choice-tag', `Buy · ${moneyText(priceOf(tags.buy))}`));
      if (tags.combat) card.append(el('span', 'choice-tag is-fight', `${fightLabel(tags.combat)}${tags.surprise ? ' · Surprise attack' : ''}`));
      // Only the hero's own Drive is pointed out: that's the choice that earns Inspiration.
      if (tags.drive && tags.drive === game.character.drive) {
        card.append(el('span', 'choice-tag is-drive', `★ Your Drive · ${findDrive(tags.drive).name}`));
      }
      card.append(el('span', 'choice-text', choice.text));
      card.addEventListener('click', () => choose(choice));
      choices.append(card);
    }
    showMap(doors);
    follow(choices);
  }

  function choose(choice) {
    holdView = false;
    choices.replaceChildren();
    hideMap();
    for (const node of narration.children) node.classList.add('is-past');
    // A fight: the story waits at this choice until the fight is over.
    if (parseTags(choice.tags).combat) {
      try {
        startFight(game, choice);
      } catch (error) {
        showFatalError(error);
        return;
      }
      narration.append(el('p', 'chosen-text', choice.text));
      onSave(game);
      showFight();
      return;
    }
    try {
      game.page = makeChoice(game, choice);
    } catch (error) {
      showFatalError(error);
      return;
    }
    onSave(game);
    showPage();
  }

  // The story so far stops here. Your hero is saved at this point and carries on from it
  // when the next part of the story arrives. (Debug mode can restart the story.)
  function showEnd() {
    const card = el('div', 'end-card');
    card.append(el('p', 'end-text', 'That’s as far as the story goes for now. Your hero is saved here, and the tale picks up from this point in a later update.'));
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

// "Fight · Low", "Fight · Deadly": the first word of the encounter's difficulty
// (data/campaign/encounters.js), so the player knows what they're walking into.
function fightLabel(encounterId) {
  const encounter = findEncounter(encounterId);
  const rating = encounter ? encounter.difficulty.split(/[\s:(,]/)[0] : '';
  return rating ? `Fight · ${rating}` : 'Fight';
}

function spellName(id) {
  const spell = findSpell(id);
  return spell ? spell.name : id;
}

// "Wren Ashdown · Human Fighter 1 · HP 12 · AC 17 · Str +3 Dex +1 … · Proficiency +2"
// (HP here is the maximum; the status line shows what's left.)
function heroSummary(character) {
  const mods = abilities.map((a) => `${a.abbreviation} ${signedNumber(abilityModifierOf(character, a.id))}`);
  return [
    character.name,
    describeCharacter(character),
    `HP ${maxHitPoints(character).value}`,
    `AC ${armorClass(character).value}`,
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
