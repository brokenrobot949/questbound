// Debug mode (add ?debug to the address): a "Debug" button that opens a panel of testing tools.
// Jump to any scene, view and edit story flags and Ink variables, set the hero's level, give
// XP, gold and items, force the next d20, toggle auto-roll, reset the current save, and read
// the playtest log.

import { listScenes } from '../story/story-runner.js';
import { describeCharacter, findClass } from '../character/sheet.js';
import { forceNextD20, peekForcedD20 } from '../rules/dice.js';
import { getSetting, setSetting } from '../save/settings.js';
import { formatDuration, summarizeLog } from '../save/playtest-log.js';
import { offlineReport } from '../save/offline.js';
import { nextLevelXp } from '../character/level-up.js';
import { equipment } from '../../../data/srd/equipment.js';
import { actionButton } from './backup-panels.js';
import { el } from './dom.js';

// getGame(): the game being played, or null on the title screen.
// offline: a promise of how offline play started ("on", "off-local", "off-debug", "unsupported").
// actions: { jumpTo(path), restartStory(), setLevel(n), setSubclass(id), giveXp(n),
//            giveGold(gp), giveItem(id, quantity), setFlags(list), setInkVariable(name, value),
//            resetSave() }
// Each action applies the change, saves and redraws; the panel then redraws itself.
export function setupDebugPanel({ root, getGame, tracker, offline, actions }) {
  const toggle = root.getElementById('debug-toggle');
  const panel = root.getElementById('debug-panel');
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) render();
  });

  // Runs an action, then redraws the panel. Errors show in the panel rather than breaking it.
  let problem = '';
  const run = async (action) => {
    problem = '';
    try {
      await action();
    } catch (error) {
      console.error(error);
      problem = error.message;
    }
    render();
  };

  function render() {
    const game = getGame();
    panel.replaceChildren(heading('Debug mode'));
    if (problem) panel.append(el('p', 'debug-problem', problem));
    if (game) {
      panel.append(sceneSection(game), flagSection(game), inkVariableSection(game), heroSection(game));
    } else {
      panel.append(el('p', 'debug-note', 'Open a save slot to use the scene, flag, hero and save tools.'));
    }
    panel.append(diceSection(game));
    if (game) panel.append(saveSection(game));
    panel.append(playtestSection(), offlineSection());
  }

  function sceneSection(game) {
    const section = el('section', 'debug-section');
    section.append(heading('Scene', 'h3'), el('p', 'debug-note', `Now in: ${game.page.scene || 'unknown'}`));
    const select = el('select', 'debug-input');
    select.setAttribute('aria-label', 'Scene to jump to');
    for (const path of listScenes(game.story)) {
      const option = el('option', null, path);
      option.value = path;
      if (path === game.page.scene) option.selected = true;
      select.append(option);
    }
    section.append(
      row(select, actionButton('Jump', () => run(() => actions.jumpTo(select.value)))),
      el(
        'p',
        'debug-note',
        "Jump keeps the story's memory, so one-time choices already taken stay hidden. Restart forgets it.",
      ),
      actionButton('Restart story from the top', () => run(() => actions.restartStory())),
    );
    return section;
  }

  function flagSection(game) {
    const section = el('section', 'debug-section');
    section.append(heading('Story flags', 'h3'));
    if (game.flags.length === 0) section.append(el('p', 'debug-note', 'No flags set.'));
    const list = el('ul', 'debug-chips');
    for (const flag of game.flags) {
      const chip = el('li', 'debug-chip', flag);
      const remove = el('button', 'debug-chip-remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove flag ${flag}`);
      remove.addEventListener('click', () => run(() => actions.setFlags(game.flags.filter((f) => f !== flag))));
      chip.append(remove);
      list.append(chip);
    }
    section.append(list);
    const input = el('input', 'debug-input');
    input.placeholder = 'new_flag_name';
    input.setAttribute('aria-label', 'Flag to add');
    const add = actionButton('Add flag', () =>
      run(() => {
        const flag = input.value.trim();
        if (!flag) throw new Error('Type a flag name first.');
        if (!game.flags.includes(flag)) actions.setFlags([...game.flags, flag]);
      }),
    );
    section.append(row(input, add));
    return section;
  }

  function inkVariableSection(game) {
    const section = el('section', 'debug-section');
    section.append(heading('Ink variables', 'h3'));
    const names = inkVariableNames(game.story);
    if (names.length === 0) {
      section.append(el('p', 'debug-note', 'The story has no VAR variables yet.'));
      return section;
    }
    for (const name of names) {
      const value = game.story.variablesState[name];
      const input = el('input', 'debug-input');
      input.value = String(value);
      input.setAttribute('aria-label', `Value of ${name}`);
      const editable = ['number', 'string', 'boolean'].includes(typeof value);
      input.disabled = !editable;
      const set = actionButton('Set', () => run(() => actions.setInkVariable(name, convert(input.value, value))));
      set.disabled = !editable;
      section.append(el('p', 'debug-label', name), row(input, set));
    }
    return section;
  }

  function heroSection(game) {
    const section = el('section', 'debug-section');
    const cls = findClass(game.character.classId);
    const maxLevel = cls.levels.length;
    section.append(heading('Hero', 'h3'), el('p', 'debug-note', `${game.character.name}: ${describeCharacter(game.character)}`));
    const level = el('input', 'debug-input is-short');
    level.type = 'number';
    level.min = '1';
    level.max = String(maxLevel);
    level.value = String(game.character.level);
    level.setAttribute('aria-label', 'Level');
    section.append(
      el('p', 'debug-label', `Level (1–${maxLevel} so far). Going up gives the XP, then the level-up screen walks through each level.`),
      row(level, actionButton('Set level', () => run(() => actions.setLevel(Number(level.value))))),
    );

    const next = nextLevelXp(game.character);
    const xp = numberInput('XP to give', next !== null ? Math.max(0, next - game.xp) : 100);
    section.append(
      el('p', 'debug-label', `XP: ${game.xp}${next !== null ? ` (next level at ${next})` : ''}`),
      row(xp, actionButton('Give XP', () => run(() => actions.giveXp(Number(xp.value))))),
    );
    const gold = numberInput('Gold to give', 50);
    section.append(el('p', 'debug-label', 'Gold pieces'), row(gold, actionButton('Give gold', () => run(() => actions.giveGold(Number(gold.value))))));
    const item = el('select', 'debug-input');
    item.setAttribute('aria-label', 'Item');
    for (const entry of equipment) {
      const o = el('option', null, entry.name);
      o.value = entry.id;
      item.append(o);
    }
    const count = numberInput('How many', 1);
    section.append(el('p', 'debug-label', 'Item'), row(item, count, actionButton('Give item', () => run(() => actions.giveItem(item.value, Number(count.value))))));

    // Subclasses are chosen at level 3.
    if (game.character.level >= 3) {
      const pick = el('select', 'debug-input');
      pick.setAttribute('aria-label', 'Subclass');
      for (const option of [{ id: '', name: 'None yet' }, ...cls.subclasses]) {
        const o = el('option', null, option.name);
        o.value = option.id;
        if ((game.character.subclassId || '') === option.id) o.selected = true;
        pick.append(o);
      }
      section.append(
        el('p', 'debug-label', `${cls.name} subclass`),
        row(pick, actionButton('Set subclass', () => run(() => actions.setSubclass(pick.value || null)))),
      );
    }
    return section;
  }

  function numberInput(label, value) {
    const input = el('input', 'debug-input is-short');
    input.type = 'number';
    input.min = '0';
    input.value = String(value);
    input.setAttribute('aria-label', label);
    return input;
  }

  function diceSection(game) {
    const section = el('section', 'debug-section');
    section.append(heading('Dice', 'h3'));
    const forced = peekForcedD20();
    section.append(
      el('p', 'debug-note', forced === null ? 'The next d20 rolls normally.' : `The next d20 test will show ${forced}.`),
    );
    const face = el('input', 'debug-input is-short');
    face.type = 'number';
    face.min = '1';
    face.max = '20';
    face.value = String(forced ?? 20);
    face.setAttribute('aria-label', 'd20 face to force');
    const buttons = [actionButton('Force next d20', () => run(() => forceNextD20(Number(face.value))))];
    if (forced !== null) buttons.push(actionButton('Clear', () => run(() => forceNextD20(null))));
    section.append(row(face, ...buttons));

    const autoLabel = el('label', 'debug-check');
    const auto = el('input');
    auto.type = 'checkbox';
    auto.checked = getSetting('autoRoll');
    auto.addEventListener('change', () => run(() => setSetting('autoRoll', auto.checked)));
    autoLabel.append(auto, ' Auto-roll (no tap needed)');
    section.append(autoLabel);

    if (game) section.append(el('p', 'debug-note', `Dice seed for this game: ${game.seed}`));
    section.append(el('p', 'debug-note', 'Add &seed=anything to the address to start new games with the same dice.'));
    return section;
  }

  function saveSection(game) {
    const section = el('section', 'debug-section');
    section.append(heading('Save', 'h3'));
    const area = el('div', 'slot-confirm');
    const reset = actionButton(`Reset save for slot ${game.slot}`, () => {
      area.replaceChildren(
        el('p', 'slot-warning', `Delete slot ${game.slot}'s save and go back to the title screen?`),
        actionButton('Delete it', () => run(() => actions.resetSave()), 'is-danger'),
        actionButton('Cancel', () => area.replaceChildren(reset)),
      );
    });
    area.append(reset);
    section.append(area);
    return section;
  }

  function playtestSection() {
    const section = el('section', 'debug-section');
    section.append(heading('Playtest log', 'h3'));
    const s = summarizeLog(tracker.log);
    if (s.sessionCount === 0) {
      section.append(el('p', 'debug-note', 'Nothing recorded yet. Play a session and come back.'));
      return section;
    }
    const facts = el('ul', 'debug-facts');
    for (const line of [
      `${plural(s.sessionCount, 'session')} · average ${formatDuration(s.averageSessionMs)} · longest ${formatDuration(s.longestSessionMs)}`,
      `${plural(s.sceneVisits, 'scene visit')} · average ${formatDuration(s.averageSceneMs)} each`,
      `Highest level reached: ${s.highestLevel}`,
      `Deaths: ${s.deaths} · ${s.deathsPerSession.toFixed(2)} per session`,
    ]) {
      facts.append(el('li', null, line));
    }
    section.append(facts);

    if (s.scenes.length > 0) {
      const table = el('table', 'debug-table');
      table.append(tableRow('th', ['Scene', 'Visits', 'Average']));
      for (const scene of s.scenes) {
        table.append(tableRow('td', [scene.scene, String(scene.visits), formatDuration(scene.averageMs)]));
      }
      section.append(table);
    }

    const games = el('ul', 'debug-facts');
    for (const g of s.games) {
      games.append(
        el('li', null, `${g.hero} (slot ${g.slot}): ${plural(g.sessions, 'session')}, reached level ${g.highestLevel}, ${plural(g.deaths, 'death')}`),
      );
    }
    section.append(el('p', 'debug-label', 'By game'), games);

    const area = el('div', 'slot-confirm');
    const clear = actionButton('Clear the log', () => {
      area.replaceChildren(
        el('p', 'slot-warning', 'Clear every playtest record on this device?'),
        actionButton('Clear', () => run(() => tracker.clear()), 'is-danger'),
        actionButton('Cancel', () => area.replaceChildren(clear)),
      );
    });
    area.append(clear);
    section.append(area);
    return section;
  }

  // Filled in once the browser answers, so the rest of the panel doesn't wait for it.
  function offlineSection() {
    const section = el('section', 'debug-section');
    const status = el('p', 'debug-note', 'Checking2026');
    section.append(heading('Offline play', 'h3'), status);
    Promise.all([offline, offlineReport()]).then(([mode, report]) => {
      const lines = {
        on: 'On: this page is using the offline copy.',
        'off-local': 'Off on localhost, so every reload shows your latest changes. Add ?sw to the address to test offline play here.',
        'off-debug': 'Off in debug mode: every file comes fresh from the server.',
        unsupported: "This browser can't play offline.",
        failed: "Offline play couldn't start; see the browser console.",
      };
      status.textContent = lines[mode] || mode;
      if (report.names.length > 0) {
        section.append(el('p', 'debug-note', `Offline copy on this device: ${report.names.join(', ')}, ${report.files} files.`));
        const missing = report.missing.length ? report.missing.join(', ') : 'none';
        section.append(el('p', report.missing.length ? 'debug-problem' : 'debug-note', `Files this page used that the copy lacks: ${missing}`));
      }
    });
    return section;
  }

  return { refresh: () => !panel.hidden && render() };
}

// The names of the story's VAR variables. inkjs has no public list, so this reads its own map.
function inkVariableNames(story) {
  const map = story.variablesState && story.variablesState._globalVariables;
  return map ? [...map.keys()] : [];
}

// Turns typed text into the same kind of value the Ink variable already holds.
function convert(text, current) {
  if (typeof current === 'number') {
    const n = Number(text);
    if (Number.isNaN(n)) throw new Error(`"${text}" isn't a number.`);
    return n;
  }
  if (typeof current === 'boolean') {
    if (text !== 'true' && text !== 'false') throw new Error('Type true or false.');
    return text === 'true';
  }
  return text;
}

// "1 session", "3 sessions"
function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function heading(text, tag = 'h2') {
  return el(tag, 'debug-heading', text);
}

function row(...children) {
  const r = el('div', 'debug-row');
  r.append(...children);
  return r;
}

function tableRow(cellTag, cells) {
  const tr = el('tr');
  for (const cell of cells) tr.append(el(cellTag, null, cell));
  return tr;
}
