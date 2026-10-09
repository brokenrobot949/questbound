// The Settings panel, opened from the title screen or during play. Settings belong to this
// device, not to a save slot. (The full Menu screen arrives later; this is its first piece.)

import { getSetting, setSetting } from '../save/settings.js';
import { actionButton } from './backup-panels.js';
import { el } from './dom.js';

const OPTIONS = [
  {
    name: 'plainNarration',
    label: 'Plain font for the story',
    hint: 'Shows narration and choices in an easy-reading font instead of the pixel font.',
  },
  {
    name: 'autoRoll',
    label: 'Roll the d20 automatically',
    hint: "Skips tapping the die. You still see every roll in full.",
  },
  {
    name: 'battleSpeed',
    label: 'Battle speed',
    hint: 'How quickly each turn of a fight plays out. Skip shows the rest of a turn at once.',
    choices: [
      ['slow', 'Slow'],
      ['normal', 'Normal'],
      ['fast', 'Fast'],
    ],
  },
];

// Puts the display settings into effect. Call at startup and after any change.
export function applySettings() {
  document.documentElement.dataset.narration = getSetting('plainNarration') ? 'plain' : 'pixel';
}

// onClose(): the player pressed Done.
export function settingsPanel({ onClose }) {
  const panel = el('section', 'settings-panel');
  panel.setAttribute('aria-label', 'Settings');
  panel.append(el('h2', 'panel-heading', 'Settings'));
  for (const option of OPTIONS) {
    if (option.choices) {
      panel.append(choiceSetting(option));
      continue;
    }
    const row = el('label', 'setting');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = getSetting(option.name);
    box.addEventListener('change', () => {
      setSetting(option.name, box.checked);
      applySettings();
    });
    const text = el('span', 'setting-text');
    text.append(el('span', 'setting-label', option.label), el('span', 'setting-hint', option.hint));
    row.append(box, text);
    panel.append(row);
  }
  panel.append(actionButton('Done', onClose));
  return panel;
}

// A setting with a few named values, shown as a row of buttons; the one in use is pressed.
function choiceSetting(option) {
  const group = el('div', 'setting is-choice');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', option.label);
  const text = el('span', 'setting-text');
  text.append(el('span', 'setting-label', option.label), el('span', 'setting-hint', option.hint));
  const buttons = el('div', 'setting-choices');
  for (const [value, label] of option.choices) {
    const button = el('button', 'slot-button setting-choice', label);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(getSetting(option.name) === value));
    button.addEventListener('click', () => {
      setSetting(option.name, value);
      for (const other of buttons.children) other.setAttribute('aria-pressed', String(other === button));
      applySettings();
    });
    buttons.append(button);
  }
  group.append(text, buttons);
  return group;
}
